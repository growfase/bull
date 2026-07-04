// /api/scores — leaderboard backed by Cloudflare KV.
// GET  → { scores: [{name, wallet, score, time, ts}] }
// POST → { name?, score, time, wallet, ts, signature }
// Registration is free: the player signs a message with their Solana
// wallet and the server verifies the Ed25519 signature. Only boss-kill
// runs enter the board; the FASTEST time ranks first (score breaks
// ties). One entry per wallet, best time wins.

const TOP_KEY = 'top';
const MAX_ENTRIES = 100;
const MAX_AGE_MS = 15 * 60 * 1000;  // signed message must be fresh
const MIN_TIME_MS = 5_000;          // faster than this is not a real run
const MAX_TIME_MS = 3_600_000;

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Decode(str) {
  let n = 0n;
  for (const c of str) {
    const i = B58.indexOf(c);
    if (i < 0) return null;
    n = n * 58n + BigInt(i);
  }
  const bytes = [];
  while (n > 0n) { bytes.unshift(Number(n & 255n)); n >>= 8n; }
  for (const c of str) { if (c === '1') bytes.unshift(0); else break; }
  return new Uint8Array(bytes);
}

const rankSort = (a, b) =>
  (a.time ?? Infinity) - (b.time ?? Infinity) || b.score - a.score || a.ts - b.ts;

export async function onRequestGet({ env }) {
  const scores = JSON.parse((await env.SCORES.get(TOP_KEY)) || '[]');
  return Response.json({ scores });
}

export async function onRequestPost({ request, env }) {
  const bad = (msg, status = 400) => Response.json({ error: msg }, { status });

  let body;
  try { body = await request.json(); } catch { return bad('invalid json'); }

  const { name, wallet, score, time, ts, signature } = body || {};
  if (typeof wallet !== 'string' || wallet.length < 32 || wallet.length > 50) return bad('invalid wallet');
  if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 10_000_000) return bad('invalid score');
  if (typeof time !== 'number' || !isFinite(time) || time < MIN_TIME_MS || time > MAX_TIME_MS) return bad('invalid time');
  if (typeof ts !== 'number' || Math.abs(Date.now() - ts) > MAX_AGE_MS) return bad('expired signature, try again');
  if (typeof signature !== 'string' || signature.length < 60 || signature.length > 120) return bad('invalid signature');

  // Verify the wallet really signed this exact run (score + time + ts)
  const pubBytes = base58Decode(wallet);
  if (!pubBytes || pubBytes.length !== 32) return bad('invalid wallet');
  let sigBytes;
  try { sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0)); } catch { return bad('invalid signature'); }
  if (sigBytes.length !== 64) return bad('invalid signature');

  const message = new TextEncoder().encode(
    `BULLFUN ranking registration\nscore:${Math.floor(score)}\ntime:${Math.round(time)}\nts:${ts}`
  );
  let ok = false;
  try {
    const key = await crypto.subtle.importKey('raw', pubBytes, { name: 'Ed25519' }, false, ['verify']);
    ok = await crypto.subtle.verify('Ed25519', key, sigBytes, message);
  } catch { return bad('signature verification unavailable', 500); }
  if (!ok) return bad('signature does not match wallet');

  // Upsert: one spot per wallet, best (lowest) time wins
  const entry = {
    name: String(name || '').trim().slice(0, 20) || wallet.slice(0, 4) + '…' + wallet.slice(-4),
    wallet,
    score: Math.floor(score),
    time: Math.round(time),
    ts: Date.now(),
  };
  const scores = JSON.parse((await env.SCORES.get(TOP_KEY)) || '[]');
  const existing = scores.findIndex(s => s.wallet === wallet);
  if (existing >= 0) {
    const old = scores[existing];
    const oldBetter = (old.time ?? Infinity) < entry.time ||
      ((old.time ?? Infinity) === entry.time && old.score >= entry.score);
    if (oldBetter) {
      scores.sort(rankSort);
      const rank = scores.findIndex(s => s.wallet === wallet) + 1;
      return Response.json({ ok: true, rank, kept: true });
    }
    scores[existing] = entry;
  } else {
    scores.push(entry);
  }
  scores.sort(rankSort);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  await env.SCORES.put(TOP_KEY, JSON.stringify(trimmed));

  const rank = trimmed.findIndex(s => s.wallet === wallet) + 1;
  return Response.json({ ok: true, rank: rank || null });
}
