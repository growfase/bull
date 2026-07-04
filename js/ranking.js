/* ============================================================
   BULLFUN — leaderboard + score registration modal
   ------------------------------------------------------------
   Registering costs PRICE_SOL (0.1 SOL). The modal shows a
   match summary, the deposit wallet and a Solana Pay QR code.
   Every attempt gets a unique *reference* key baked into the
   payment, so the server can find and verify the transaction
   on-chain whether the player pays with Phantom or by scanning
   the QR with any wallet.
   ============================================================ */

(() => {
  const API_CONFIG = '/api/config';
  const API_SCORES = '/api/scores';
  const LS_KEY = 'bullfun_local_scores';

  const rankBody = document.getElementById('rankBody');
  const modal = document.getElementById('regModal');
  const regStatus = document.getElementById('regStatus');
  const nameInput = document.getElementById('playerName');
  const payAddr = document.getElementById('payAddr');
  const btnPhantom = document.getElementById('btnPhantom');
  const btnVerify = document.getElementById('btnVerify');

  let cfg = null;         // {recipient, priceSol, rpc}
  let lastScore = null;   // score of the finished match
  let lastTime = null;    // duration of the finished match
  let reference = null;   // unique key for this payment attempt
  let registered = false; // this match's score is already in
  let busy = false;
  let qr = null;

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
    if (cfg) return cfg;
    try {
      const r = await fetch(API_CONFIG);
      if (r.ok) cfg = await r.json();
    } catch { cfg = null; }
    return cfg;
  }

  /* ---------------- modal ---------------- */
  async function openModal() {
    if (lastScore == null || lastScore <= 0) {
      // no finished match with points — nudge towards the game
      document.getElementById('jogo').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (registered) { modal.classList.remove('hidden'); return; }

    document.getElementById('sumScore').textContent = Number(lastScore).toLocaleString('en-US');
    document.getElementById('sumTime').textContent = lastTime != null ? lastTime.toFixed(1) + 's' : '—';

    modal.classList.remove('hidden');
    setStatus('');
    btnPhantom.disabled = false;
    btnVerify.disabled = false;

    await loadConfig();
    if (!cfg || !cfg.recipient) {
      payAddr.textContent = 'not configured yet';
      document.getElementById('qrCode').innerHTML = '';
      setStatus('Registration is not configured yet (treasury wallet missing).', 'err');
      btnPhantom.disabled = true;
      btnVerify.disabled = true;
      return;
    }

    document.getElementById('sumFee').textContent = cfg.priceSol + ' SOL';
    payAddr.textContent = short(cfg.recipient);
    payAddr.title = cfg.recipient;

    // fresh reference for this attempt (lets the server find the tx)
    if (!reference && typeof solanaWeb3 !== 'undefined') {
      reference = solanaWeb3.Keypair.generate().publicKey;
    }
    drawQR();
  }

  function payURI() {
    const label = encodeURIComponent('BULLFUN');
    const msg = encodeURIComponent('BULLFUN score registration');
    let uri = `solana:${cfg.recipient}?amount=${cfg.priceSol}&label=${label}&message=${msg}`;
    if (reference) uri += `&reference=${reference.toBase58()}`;
    return uri;
  }

  function drawQR() {
    const box = document.getElementById('qrCode');
    box.innerHTML = '';
    if (typeof QRCode === 'undefined') { box.textContent = 'QR unavailable'; return; }
    qr = new QRCode(box, {
      text: payURI(),
      width: 164, height: 164,
      colorDark: '#0a0d0a', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  function closeModal() { modal.classList.add('hidden'); }

  /* ---------------- registration paths ---------------- */
  function provider() {
    return window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
  }

  async function submitScore(payload) {
    const res = await fetch(API_SCORES, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: nameInput.value.trim(), score: lastScore, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'registration failed');
    return data;
  }

  function success(data, wallet) {
    registered = true;
    const local = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    local.push({ name: nameInput.value.trim(), wallet: wallet || '', score: lastScore, ts: Date.now() });
    local.sort((a, b) => b.score - a.score);
    localStorage.setItem(LS_KEY, JSON.stringify(local.slice(0, 20)));
    setStatus(data.rank ? `Registered! You're #${data.rank} 🏆` : 'Registered! 🏆', 'ok');
    btnPhantom.disabled = true;
    btnVerify.disabled = true;
    loadBoard();
  }

  // Path 1 — pay directly with Phantom (reference key included)
  async function payWithPhantom() {
    if (busy || registered) return;
    const ph = provider();
    if (!ph) {
      setStatus('Phantom wallet not found — install it at phantom.app, or scan the QR with any wallet.', 'err');
      window.open('https://phantom.app/', '_blank');
      return;
    }
    if (typeof solanaWeb3 === 'undefined') return setStatus('Solana library failed to load — refresh the page.', 'err');

    busy = true;
    btnPhantom.disabled = true;
    try {
      setStatus('Connecting wallet…');
      const { publicKey } = await ph.connect();

      setStatus(`Sending ${cfg.priceSol} SOL — approve in Phantom…`);
      const conn = new solanaWeb3.Connection(cfg.rpc, 'confirmed');
      const ix = solanaWeb3.SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new solanaWeb3.PublicKey(cfg.recipient),
        lamports: Math.round(cfg.priceSol * 1e9),
      });
      if (reference) ix.keys.push({ pubkey: reference, isSigner: false, isWritable: false });
      const tx = new solanaWeb3.Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;

      const { signature } = await ph.signAndSendTransaction(tx);

      setStatus('Confirming transaction…');
      await conn.confirmTransaction(signature, 'confirmed');

      setStatus('Registering score…');
      const data = await submitScore({ wallet: publicKey.toBase58(), signature });
      success(data, publicKey.toBase58());
    } catch (e) {
      const msg = /reject|denied|cancel/i.test(String(e?.message)) ? 'Transaction cancelled.' : (e?.message || 'Something went wrong.');
      setStatus(msg, 'err');
      btnPhantom.disabled = false;
    } finally {
      busy = false;
    }
  }

  // Path 2 — paid via QR with any wallet → verify by reference
  async function verifyPayment() {
    if (busy || registered) return;
    if (!reference) return setStatus('Refresh the page and try again.', 'err');
    busy = true;
    btnVerify.disabled = true;
    try {
      setStatus('Looking for your payment on-chain…');
      const data = await submitScore({ reference: reference.toBase58() });
      success(data, data.wallet);
    } catch (e) {
      setStatus((e?.message || 'Payment not found yet') + ' — wait a few seconds and try again.', 'err');
      btnVerify.disabled = false;
    } finally {
      busy = false;
    }
  }

  /* ---------------- wiring ---------------- */
  window.addEventListener('bullfun:end', (e) => {
    lastScore = e.detail.score;
    lastTime = e.detail.time;
    registered = false;
    reference = null; // new attempt → new reference
    const btn = document.getElementById('btnRegister');
    btn.disabled = false;
    btn.textContent = '🏆 Register score · ' + (cfg?.priceSol ?? 0.1) + ' SOL';
  });

  document.getElementById('btnRegister').addEventListener('click', openModal);
  document.getElementById('btnRegister2').addEventListener('click', openModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  document.getElementById('btnCopyAddr').addEventListener('click', async () => {
    if (!cfg?.recipient) return;
    try { await navigator.clipboard.writeText(cfg.recipient); setStatus('Address copied!', 'ok'); }
    catch { setStatus(cfg.recipient); }
  });

  btnPhantom.addEventListener('click', payWithPhantom);
  btnVerify.addEventListener('click', verifyPayment);

  loadConfig().then(() => {
    if (cfg?.priceSol) {
      document.getElementById('btnRegister').textContent = '🏆 Register score · ' + cfg.priceSol + ' SOL';
      document.getElementById('sumFee').textContent = cfg.priceSol + ' SOL';
    }
  });
  loadBoard();
})();
