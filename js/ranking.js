/* ============================================================
   BULLFUN — leaderboard + Solana wallet registration
   ------------------------------------------------------------
   Registering a score costs PRICE_SOL (default 0.1 SOL), paid
   from the player's wallet (Phantom) to the treasury wallet
   configured in wrangler.toml (RECIPIENT_WALLET). The tx
   signature is verified on-chain by /api/scores before the
   score enters the ranking.
   ============================================================ */

(() => {
  const API_CONFIG = '/api/config';
  const API_SCORES = '/api/scores';
  const LS_KEY = 'bullfun_local_scores';

  const rankBody = document.getElementById('rankBody');
  const btnRegister = document.getElementById('btnRegister');
  const regStatus = document.getElementById('regStatus');
  const nameInput = document.getElementById('playerName');

  let cfg = null;          // {recipient, priceSol, rpc}
  let lastScore = null;    // score of the finished match
  let busy = false;

  /* ---------------- helpers ---------------- */
  const short = (w) => w ? w.slice(0, 4) + '…' + w.slice(-4) : '—';
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  function setStatus(msg, cls = '') {
    regStatus.textContent = msg;
    regStatus.className = 'reg-status ' + cls;
  }

  /* ---------------- leaderboard ---------------- */
  function render(scores, localOnly = false) {
    if (!scores.length) {
      rankBody.innerHTML = `<tr><td colspan="4" class="rank-empty">${
        localOnly ? 'Ranking unavailable offline — play online to compete!' : 'No scores yet. Be the first bull in the alley!'
      }</td></tr>`;
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    rankBody.innerHTML = scores.slice(0, 10).map((s, i) => `
      <tr class="${i < 3 ? 'rank-top' : ''}">
        <td class="rank-pos">${medals[i] || i + 1}</td>
        <td>${esc(s.name || short(s.wallet))}</td>
        <td class="rank-wallet">${short(s.wallet)}</td>
        <td class="ta-r rank-score">${Number(s.score).toLocaleString('en-US')}</td>
      </tr>`).join('');
  }

  async function loadBoard() {
    try {
      const r = await fetch(API_SCORES);
      if (!r.ok) throw new Error();
      render((await r.json()).scores || []);
    } catch {
      render(JSON.parse(localStorage.getItem(LS_KEY) || '[]'), true);
    }
  }

  async function loadConfig() {
    try {
      const r = await fetch(API_CONFIG);
      if (r.ok) cfg = await r.json();
    } catch { cfg = null; }
  }

  /* ---------------- wallet registration ---------------- */
  function provider() {
    return window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
  }

  async function register() {
    if (busy) return;
    if (lastScore == null || lastScore <= 0) return setStatus('Finish a fight with points first!', 'err');
    if (!cfg) await loadConfig();
    if (!cfg || !cfg.recipient) return setStatus('Registration is not configured yet (treasury wallet missing).', 'err');

    const ph = provider();
    if (!ph) {
      setStatus('Phantom wallet not found — install it at phantom.app', 'err');
      window.open('https://phantom.app/', '_blank');
      return;
    }
    if (typeof solanaWeb3 === 'undefined') return setStatus('Solana library failed to load — refresh the page.', 'err');

    busy = true;
    btnRegister.disabled = true;
    try {
      setStatus('Connecting wallet…');
      const { publicKey } = await ph.connect();

      setStatus(`Sending ${cfg.priceSol} SOL — approve in Phantom…`);
      const conn = new solanaWeb3.Connection(cfg.rpc, 'confirmed');
      const tx = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new solanaWeb3.PublicKey(cfg.recipient),
          lamports: Math.round(cfg.priceSol * 1e9),
        })
      );
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;

      const { signature } = await ph.signAndSendTransaction(tx);

      setStatus('Confirming transaction…');
      await conn.confirmTransaction(signature, 'confirmed');

      setStatus('Registering score…');
      const res = await fetch(API_SCORES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          wallet: publicKey.toBase58(),
          score: lastScore,
          signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'registration failed');

      // local backup + refresh board
      const local = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      local.push({ name: nameInput.value.trim(), wallet: publicKey.toBase58(), score: lastScore, ts: Date.now() });
      local.sort((a, b) => b.score - a.score);
      localStorage.setItem(LS_KEY, JSON.stringify(local.slice(0, 20)));

      setStatus(data.rank ? `Registered! You're #${data.rank} 🏆` : 'Registered! 🏆', 'ok');
      btnRegister.textContent = '✅ Score registered';
      await loadBoard();
    } catch (e) {
      const msg = /reject|denied|cancel/i.test(String(e?.message)) ? 'Transaction cancelled.' : (e?.message || 'Something went wrong.');
      setStatus(msg, 'err');
      btnRegister.disabled = false;
    } finally {
      busy = false;
    }
  }

  /* ---------------- wiring ---------------- */
  window.addEventListener('bullfun:end', (e) => {
    lastScore = e.detail.score;
    btnRegister.disabled = false;
    btnRegister.textContent = '🏆 Register score · ' + (cfg?.priceSol ?? 0.1) + ' SOL';
    setStatus(lastScore > 0 ? '' : 'Score some points to enter the ranking.');
  });

  btnRegister.addEventListener('click', register);

  loadConfig().then(() => {
    if (cfg?.priceSol) btnRegister.textContent = '🏆 Register score · ' + cfg.priceSol + ' SOL';
    const note = document.getElementById('depositNote');
    if (note && cfg?.recipient) note.textContent = 'Deposit goes to: ' + short(cfg.recipient);
  });
  loadBoard();
})();
