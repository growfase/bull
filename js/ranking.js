/* ============================================================
   BULLFUN — leaderboard + wallet registration
   ------------------------------------------------------------
   Registering is free: the player connects their Solana wallet
   (Phantom) and signs a short message to prove ownership. The
   server verifies the Ed25519 signature and keeps one spot per
   wallet (best score wins).
   ============================================================ */

(() => {
  const API_SCORES = '/api/scores';
  const LS_KEY = 'bullfun_local_scores';

  const rankBody = document.getElementById('rankBody');
  const modal = document.getElementById('regModal');
  const regStatus = document.getElementById('regStatus');
  const nameInput = document.getElementById('playerName');
  const btnConnect = document.getElementById('btnConnect');
  const regForm = document.getElementById('regForm');
  const regSuccess = document.getElementById('regSuccess');

  let lastScore = null;   // score of the finished match
  let lastTime = null;    // duration of the finished match
  let lastWon = false;    // only victories enter the ranking (time matters)
  let registered = false; // this match's score is already in
  let busy = false;
  let walletAddr = null;  // connected wallet (optional, only for ranking)

  /* ---------------- helpers ---------------- */
  const short = (w) => w ? w.slice(0, 4) + '…' + w.slice(-4) : '?';
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
      rankBody.innerHTML = `<tr><td colspan="5" class="rank-empty">${
        localOnly ? 'Ranking unavailable offline. Play online to compete!' : 'Nobody has dropped Ansem yet. Be the first!'
      }</td></tr>`;
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    rankBody.innerHTML = scores.slice(0, 10).map((s, i) => `
      <tr class="${i < 3 ? 'rank-top' : ''}">
        <td class="rank-pos">${medals[i] || i + 1}</td>
        <td>${esc(s.name || short(s.wallet))}</td>
        <td class="rank-wallet">${short(s.wallet)}</td>
        <td class="ta-r rank-time">${s.time != null ? (s.time / 1000).toFixed(1) + 's' : '?'}</td>
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

  /* ---------------- modal ---------------- */
  function openModal() {
    if (lastScore == null || lastScore <= 0 || !lastWon) {
      document.getElementById('jogo').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    // já registrado nesta partida → mostra direto a confirmação
    regForm.classList.toggle('hidden', registered);
    regSuccess.classList.toggle('hidden', !registered);
    if (!registered) {
      document.getElementById('sumScore').textContent = Number(lastScore).toLocaleString('en-US');
      document.getElementById('sumTime').textContent = lastTime != null ? lastTime.toFixed(1) + 's' : '0.0s';
      btnConnect.textContent = walletAddr ? 'Register score' : 'Connect wallet and register';
      btnConnect.disabled = false;
      setStatus('');
    }
    modal.classList.remove('hidden');
  }
  function closeModal() { modal.classList.add('hidden'); }

  function showSuccess(rank) {
    document.getElementById('successRank').textContent = rank ? '#' + rank : 'on the board';
    document.getElementById('successTime').textContent = lastTime != null ? lastTime.toFixed(1) + 's' : '?';
    document.getElementById('successScore').textContent = Number(lastScore).toLocaleString('en-US');
    document.getElementById('successName').textContent = nameInput.value.trim() || short(walletAddr);
    regForm.classList.add('hidden');
    regSuccess.classList.remove('hidden');
  }

  /* ---------------- wallet ---------------- */
  function provider() {
    return window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
  }

  const btnWallet = document.getElementById('btnWallet');
  function updateWalletUI() {
    btnWallet.textContent = walletAddr ? short(walletAddr) : 'Connect wallet';
    btnWallet.classList.toggle('connected', !!walletAddr);
    btnWallet.title = walletAddr || 'Connect your Solana wallet (only needed for the ranking)';
  }

  async function connectWallet(interactive = true) {
    if (walletAddr) return walletAddr;
    const ph = provider();
    if (!ph) {
      if (interactive) window.open('https://phantom.app/', '_blank');
      return null;
    }
    try {
      const resp = await ph.connect(interactive ? undefined : { onlyIfTrusted: true });
      walletAddr = resp.publicKey.toBase58 ? resp.publicKey.toBase58() : String(resp.publicKey);
      updateWalletUI();
      return walletAddr;
    } catch { return null; }
  }

  async function register() {
    if (busy || registered) return;
    const ph = provider();
    if (!ph) {
      setStatus('Phantom wallet not found. Install it at phantom.app and refresh.', 'err');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    busy = true;
    btnConnect.disabled = true;
    try {
      setStatus('Connecting wallet…');
      const wallet = await connectWallet(true);
      if (!wallet) throw new Error('Wallet connection cancelled.');

      setStatus('Sign the message in Phantom to confirm…');
      const ts = Date.now();
      const timeMs = Math.round((lastTime || 0) * 1000);
      const message = `BULLFUN ranking registration\nscore:${Math.floor(lastScore)}\ntime:${timeMs}\nts:${ts}`;
      const signed = await ph.signMessage(new TextEncoder().encode(message), 'utf8');
      const sigBytes = signed.signature || signed;
      const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

      setStatus('Registering score…');
      const res = await fetch(API_SCORES, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          score: Math.floor(lastScore),
          time: timeMs,
          wallet, ts, signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'registration failed');

      registered = true;
      const local = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      local.push({ name: nameInput.value.trim(), wallet, score: lastScore, time: timeMs, ts });
      local.sort((a, b) => b.score - a.score);
      localStorage.setItem(LS_KEY, JSON.stringify(local.slice(0, 20)));

      showSuccess(data.rank);
      loadBoard();
    } catch (e) {
      const msg = /reject|denied|cancel/i.test(String(e?.message)) ? 'Signature cancelled.' : (e?.message || 'Something went wrong.');
      setStatus(msg, 'err');
      btnConnect.disabled = false;
    } finally {
      busy = false;
    }
  }

  /* ---------------- wiring ---------------- */
  window.addEventListener('bullfun:end', (e) => {
    lastScore = e.detail.score;
    lastTime = e.detail.time;
    lastWon = !!e.detail.won;
    registered = false;
    const btn = document.getElementById('btnRegister');
    btn.disabled = !lastWon;
    btn.textContent = lastWon ? '🏆 Register score' : 'Beat Ansem to register';
  });

  document.getElementById('btnRegister').addEventListener('click', openModal);
  document.getElementById('btnRegister2').addEventListener('click', openModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  btnConnect.addEventListener('click', register);
  btnWallet.addEventListener('click', () => connectWallet(true));
  document.getElementById('btnCloseSuccess').addEventListener('click', closeModal);
  document.getElementById('btnViewRank').addEventListener('click', () => {
    closeModal();
    document.getElementById('ranking').scrollIntoView({ behavior: 'smooth' });
  });

  updateWalletUI();
  connectWallet(false); // restore a previously trusted session silently
  loadBoard();
})();
