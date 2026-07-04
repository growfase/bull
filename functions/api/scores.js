// /api/scores — leaderboard backed by Cloudflare KV.
// GET  → { scores: [{name, wallet, score, ts}] }
// POST → { name?, score, wallet, ts, signature }
// Registration is free: the player signs a message with their Solana
// wallet and the server verifies the Ed25519 signature. One entry per
// wallet; the best score wins.

const TOP_KEY = 'top';
const MAX_ENTRIES = 100;
const MAX_AGE_MS = 15 * 60 * 1000; // signed message must be fresh

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

export async function onRequestGet({ env }) {
  const scores = JSON.parse((await env.SCORES.get(TOP_KEY)) || '[]');
  return Response.json({ scores: scores.map(({ sig, ...s }) => s) });
}

export async function onRequestPost({ request, env }) {
  const bad = (msg, status = 400) => Response.json({ error: msg }, { status });

  let body;
  try { body = await request.json(); } catch { return bad('invalid json'); }

  const { name, wallet, score, ts, signature } = body || {};
  if (typeof wallet !== 'string' || wallet.length < 32 || wallet.length > 50) return bad('invalid wallet');
  if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 10_000_000) return bad('invalid score');
  if (typeof ts !== 'number' || Math.abs(Date.now() - ts) > MAX_AGE_MS) return bad('expired signature, try again');
  if (typeof signature !== 'string' || signature.length < 60 || signature.length > 120) return bad('invalid signature');

  // Verify the wallet really signed this exact message
  const pubBytes = base58Decode(wallet);
  if (!pubBytes || pubBytes.length !== 32) return bad('invalid wallet');
  let sigBytes;
  try { sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0)); } catch { return bad('invalid signature'); }
  if (sigBytes.length !== 64) return bad('invalid signature');

  const message = new TextEncoder().encode(`BULLFUN ranking registration\nscore:${Math.floor(score)}\nts:${ts}`);
  let ok = false;
  try {
    const key = await crypto.subtle.importKey('raw', pubBytes, { name: 'Ed25519' }, false, ['verify']);
    ok = await crypto.subtle.verify('Ed25519', key, sigBytes, message);
  } catch { return bad('signature verification unavailable', 500); }
  if (!ok) return bad('signature does not match wallet');

  // Upsert: one spot per wallet, best score counts
  const entry = {
    name: String(name || '').trim().slice(0, 20) || wallet.slice(0, 4) + '…' + wallet.slice(-4),
    wallet,
    score: Math.floor(score),
    ts: Date.now(),
  };
  const scores = JSON.parse((await env.SCORES.get(TOP_KEY)) || '[]');
  const existing = scores.findIndex(s => s.wallet === wallet);
  if (existing >= 0) {
    if (scores[existing].score >= entry.score) {
      scores.sort((a, b) => b.score - a.score || a.ts - b.ts);
      const rank = scores.findIndex(s => s.wallet === wallet) + 1;
      return Response.json({ ok: true, rank, kept: true });
    }
    scores[existing] = entry;
  } else {
    scores.push(entry);
  }
  scores.sort((a, b) => b.score - a.score || a.ts - b.ts);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  await env.SCORES.put(TOP_KEY, JSON.stringify(trimmed));

  const rank = trimmed.findIndex(s => s.wallet === wallet) + 1;
  return Response.json({ ok: true, rank: rank || null });
}
