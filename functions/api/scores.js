// /api/scores — leaderboard backed by Cloudflare KV.
// GET  → { scores: [{name, wallet, score, ts}] }
// POST → { name?, wallet, score, signature } — the signature must be a
//        confirmed on-chain transfer of PRICE_SOL from `wallet` to
//        RECIPIENT_WALLET; each signature can only be used once.

const TOP_KEY = 'top';
const MAX_ENTRIES = 100;

export async function onRequestGet({ env }) {
  const scores = JSON.parse((await env.SCORES.get(TOP_KEY)) || '[]');
  return Response.json({ scores: scores.map(({ sig, ...s }) => s) });
}

export async function onRequestPost({ request, env }) {
  const bad = (msg, status = 400) => Response.json({ error: msg }, { status });

  if (!env.RECIPIENT_WALLET) return bad('registration not configured', 503);

  let body;
  try { body = await request.json(); } catch { return bad('invalid json'); }

  const { name, wallet, score, signature } = body || {};
  if (typeof wallet !== 'string' || wallet.length < 32 || wallet.length > 50) return bad('invalid wallet');
  if (typeof signature !== 'string' || signature.length < 64 || signature.length > 120) return bad('invalid signature');
  if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 10_000_000) return bad('invalid score');

  if (await env.SCORES.get('sig:' + signature)) return bad('signature already used', 409);

  // Verify the payment on-chain
  const rpc = env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
  const lamportsDue = Math.floor(Number(env.PRICE_SOL || 0.1) * 1e9);
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'getTransaction',
      params: [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }],
    }),
  });
  const tx = (await res.json())?.result;
  if (!tx || tx.meta?.err) return bad('transaction not found or failed');

  const instructions = [
    ...(tx.transaction?.message?.instructions || []),
    ...((tx.meta?.innerInstructions || []).flatMap(i => i.instructions)),
  ];
  const paid = instructions.some(ix =>
    ix?.parsed?.type === 'transfer' &&
    ix.parsed.info?.destination === env.RECIPIENT_WALLET &&
    ix.parsed.info?.source === wallet &&
    Number(ix.parsed.info?.lamports) >= lamportsDue
  );
  if (!paid) return bad('payment not found in transaction');

  // Store
  const entry = {
    name: String(name || '').trim().slice(0, 20) || wallet.slice(0, 4) + '…' + wallet.slice(-4),
    wallet,
    score: Math.floor(score),
    ts: Date.now(),
    sig: signature,
  };
  const scores = JSON.parse((await env.SCORES.get(TOP_KEY)) || '[]');
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score || a.ts - b.ts);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  await env.SCORES.put(TOP_KEY, JSON.stringify(trimmed));
  await env.SCORES.put('sig:' + signature, '1');

  const rank = trimmed.findIndex(s => s.sig === signature) + 1;
  return Response.json({ ok: true, rank: rank || null });
}
