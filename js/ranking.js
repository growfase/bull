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

  let lastScore = null;   // score of the finished match
  let lastTime = null;    // duration of the finished match
  let registered = false; // this match's score is already in
  let busy = false;

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
      rankBody.innerHTML = `<tr><td colspan="4" class="rank-empty">${
        localOnly ? 'Ranking unavailable offline. Play online to compete!' : 'No scores yet. Be the first bull in the alley!'
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

  /* ---------------- modal ---------------- */
  function openModal() {
    if (lastScore == null || lastScore <= 0) {
      document.getElementById('jogo').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    document.getElementById('sumScore').textContent = Number(lastScore).toLocaleString('en-US');
    document.getElementById('sumTime').textContent = lastTime != null ? lastTime.toFixed(1) + 's' : '0.0s';
    btnConnect.disabled = registered;
    setStatus(registered ? 'This score is already registered. 🏆' : '', registered ? 'ok' : '');
    modal.classList.remove('hidden');
  }
  function closeModal() { modal.classList.add('hidden'); }

  /* ---------------- registration ---------------- */
  function provider() {
    return window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
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
      const resp = await ph.connect();
      const wallet = resp.publicKey.toBase58 ? resp.publicKey.toBase58() : String(resp.publicKey);

      setStatus('Sign the message in Phantom to confirm…');
      const ts = Date.now();
      const message = `BULLFUN ranking registration\nscore:${Math.floor(lastScore)}\nts:${ts}`;
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
          wallet, ts, signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'registration failed');

      registered = true;
      const local = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      local.push({ name: nameInput.value.trim(), wallet, score: lastScore, ts });
      local.sort((a, b) => b.score - a.score);
      localStorage.setItem(LS_KEY, JSON.stringify(local.slice(0, 20)));

      setStatus(data.rank ? `Registered! You're #${data.rank} 🏆` : 'Registered! 🏆', 'ok');
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
    registered = false;
    document.getElementById('btnRegister').disabled = false;
  });

  document.getElementById('btnRegister').addEventListener('click', openModal);
  document.getElementById('btnRegister2').addEventListener('click', openModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  btnConnect.addEventListener('click', register);

  loadBoard();
})();
