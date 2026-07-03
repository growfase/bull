// GET /api/config — public config for the client (wallet, price, RPC)
export async function onRequestGet({ env }) {
  return Response.json({
    recipient: env.RECIPIENT_WALLET || '',
    priceSol: Number(env.PRICE_SOL || 0.1),
    rpc: env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  });
}
