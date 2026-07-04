// /api/scores — leaderboard backed by Cloudflare KV.
// GET  → { scores: [{name, wallet, score, ts}] }
// POST → { name?, score, signature, wallet }  (paid via Phantom)
//      | { name?, score, reference }          (paid via Solana Pay QR)
// Either way the payment must be a confirmed on-chain transfer of
// PRICE_SOL to RECIPIENT_WALLET; each tx signature registers once.

const TOP_KEY = 'top';
const MAX_ENTRIES = 100;

export async function onRequestGet({ env }) {
  const scores = JSON.parse((await env.SCORES.get(TOP_KEY)) || '[]');
  return Response.json({ scores: scores.map(({ sig, ...s }) => s) });
}

async function rpcCall(rpc, method, params) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return (await res.json())?.result;
}

/* Finds a transfer of >= lamportsDue to `recipient` inside the tx.
   Returns the payer address, or null. */
function findPayment(tx, recipient, lamportsDue) {
  if (!tx || tx.meta?.err) return null;
  const instructions = [
    ...(tx.transaction?.message?.instructions || []),
    ...((tx.meta?.innerInstructions || []).flatMap(i => i.instructions)),
  ];
  const hit = instructions.find(ix =>
    ix?.parsed?.type === 'transfer' &&
    ix.parsed.info?.destination === recipient &&
    Number(ix.parsed.info?.lamports) >= lamportsDue
  );
  return hit ? hit.parsed.info.source : null;
}

export async function onRequestPost({ request, env }) {
  const bad = (msg, status = 400) => Response.json({ error: msg }, { status });

  if (!env.RECIPIENT_WALLET) return bad('registration not configured', 503);

  let body;
  try { body = await request.json(); } catch { return bad('invalid json'); }

  const { name, wallet, score, signature, reference } = body || {};
  if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 10_000_000) return bad('invalid score');

  const rpc = env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
  const lamportsDue = Math.floor(Number(env.PRICE_SOL || 0.1) * 1e9);

  let sig = null;
  let payer = null;

  if (typeof signature === 'string' && signature.length >= 64 && signature.length <= 120) {
    // Phantom path: signature supplied directly
    if (await env.SCORES.get('sig:' + signature)) return bad('signature already used', 409);
    const tx = await rpcCall(rpc, 'getTransaction',
      [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]);
    payer = findPayment(tx, env.RECIPIENT_WALLET, lamportsDue);
    if (!payer) return bad('payment not found in transaction');
    if (typeof wallet === 'string' && wallet && wallet !== payer) return bad('wallet does not match payer');
    sig = signature;
  } else if (typeof reference === 'string' && reference.length >= 32 && reference.length <= 50) {
    // Solana Pay path: locate the tx through the reference key
    const sigs = await rpcCall(rpc, 'getSignaturesForAddress', [reference, { limit: 10 }]) || [];
    for (const s of sigs) {
      if (s.err) continue;
      if (await env.SCORES.get('sig:' + s.signature)) continue;
      const tx = await rpcCall(rpc, 'getTransaction',
        [s.signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }]);
      const p = findPayment(tx, env.RECIPIENT_WALLET, lamportsDue);
      if (p) { sig = s.signature; payer = p; break; }
    }
    if (!sig) return bad('payment not found for this reference');
  } else {
    return bad('signature or reference required');
  }

  // Store
  const entry = {
    name: String(name || '').trim().slice(0, 20) || payer.slice(0, 4) + '…' + payer.slice(-4),
    wallet: payer,
    score: Math.floor(score),
    ts: Date.now(),
    sig,
  };
  const scores = JSON.parse((await env.SCORES.get(TOP_KEY)) || '[]');
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score || a.ts - b.ts);
  const trimmed = scores.slice(0, MAX_ENTRIES);
  await env.SCORES.put(TOP_KEY, JSON.stringify(trimmed));
  await env.SCORES.put('sig:' + sig, '1');

  const rank = trimmed.findIndex(s => s.sig === sig) + 1;
  return Response.json({ ok: true, rank: rank || null, wallet: payer });
}
