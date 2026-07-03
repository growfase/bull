/* ============================================================
   BULL BRAWL — motor do jogo
   ------------------------------------------------------------
   TROCA DE ASSETS: quando tiver as artes finais, basta apontar
   o caminho da imagem em ASSETS abaixo (png/webp com fundo
   transparente). Tudo que for `null` usa o placeholder SVG.
   ============================================================ */

const ASSETS = {
  background: null,   // cenário completo (cobre o palco inteiro)
  opponent:   null,   // oponente em pé (corpo inteiro, ~3:4)
  enemyFist:  null,   // punho do oponente vindo na câmera (quadrado)
  fistLeft:   null,   // punho esquerdo do jogador
  fistRight:  null,   // punho direito do jogador (pode ser o mesmo; é espelhado via CSS)
  blockArms:  null,   // braços levantados defendendo (cobre o palco inteiro)
  enemyAvatar:null,   // rostinho do oponente no HUD (quadrado)
};

/* ---------------- Configuração de jogo ---------------- */
const CFG = {
  playerHP: 10,
  enemyHP: 24,
  pointsHit: 250,
  pointsBlock: 500,
  pointsHurt: -250,
  punchCooldown: 200,      // ms entre socos
  attackMinDelay: 2600,    // ms — intervalo entre ataques do inimigo
  attackMaxDelay: 5200,
  windupTime: 750,         // ms de aviso antes do ataque
  attackTime: 550,         // ms do punho voando (janela de bloqueio)
  dodgeChance: 0.12,       // chance do inimigo esquivar de um soco
};

/* ============================================================
   PLACEHOLDERS SVG (touro de desenho animado)
   ============================================================ */
const SVGS = {
  /* Touro Bullfun: cabeça escura 3D, chifres pretos com fio de luz
     verde e aura esfumaçada — baseado na arte de referência. */
  opponent: (mood) => {
    // mood: 'ok' | 'hurt' | 'mad'
    const eyes = mood === 'mad'
      ? `<path d="M108 122 L138 132 M182 122 L152 132" stroke="#8fe08f" stroke-width="7" stroke-linecap="round" filter="url(#oNeon)"/>`
      : mood === 'hurt'
        ? `<path d="M108 118 L134 134 M134 118 L108 134 M156 118 L182 134 M182 118 L156 134" stroke="#8fe08f" stroke-width="5" stroke-linecap="round" opacity=".9" filter="url(#oNeon)"/>`
        : `<path d="M108 128 Q120 138 134 129 M156 129 Q170 138 182 128" stroke="#050505" stroke-width="6" fill="none" stroke-linecap="round"/>
           <path d="M108 131 Q120 141 134 132 M156 132 Q170 141 182 131" stroke="#8fe08f" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".55"/>`;
    const mouth = mood === 'hurt'
      ? `<ellipse cx="145" cy="182" rx="14" ry="18" fill="#020302"/><ellipse cx="145" cy="182" rx="14" ry="18" fill="none" stroke="#8fe08f" stroke-width="1.5" opacity=".4"/>`
      : mood === 'mad'
        ? `<path d="M118 176 Q145 164 172 176 L168 190 Q145 180 122 190 Z" fill="#020302"/>
           <path d="M128 173 L128 186 M142 170 L142 184 M156 173 L156 186" stroke="#3a463a" stroke-width="4"/>`
        : `<path d="M116 172 Q145 196 174 170" stroke="#020302" stroke-width="7" fill="none" stroke-linecap="round"/>
           <path d="M124 180 Q145 192 166 178" stroke="#2e352c" stroke-width="5" fill="none" stroke-linecap="round"/>
           <path d="M116 175 Q145 199 174 173" stroke="#8fe08f" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".4"/>`;
    return `
    <svg viewBox="0 0 290 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="oGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#8fe08f" stop-opacity=".34"/>
          <stop offset="55%" stop-color="#8fe08f" stop-opacity=".14"/>
          <stop offset="100%" stop-color="#8fe08f" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="oHead" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#242624"/>
          <stop offset="55%" stop-color="#181a18"/>
          <stop offset="100%" stop-color="#0d0f0d"/>
        </linearGradient>
        <linearGradient id="oHorn" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#1c1d1c"/>
          <stop offset="100%" stop-color="#0a0b0a"/>
        </linearGradient>
        <filter id="oNeon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- aura verde esfumaçada -->
      <ellipse cx="145" cy="140" rx="132" ry="128" fill="url(#oGlow)"/>

      <!-- pernas -->
      <rect x="100" y="304" width="36" height="82" rx="13" fill="#0c0e0c"/>
      <rect x="156" y="304" width="36" height="82" rx="13" fill="#090b09"/>
      <ellipse cx="117" cy="388" rx="29" ry="9" fill="#050605"/>
      <ellipse cx="175" cy="388" rx="29" ry="9" fill="#050605"/>

      <!-- corpo (moletom escuro) -->
      <path d="M72 244 Q62 330 98 324 L192 324 Q228 330 218 244 Q210 216 145 214 Q80 216 72 244 Z" fill="#111411"/>
      <path d="M80 240 Q92 222 122 217" stroke="#8fe08f" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".35"/>
      <path d="M210 240 Q198 222 168 217" stroke="#8fe08f" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".2"/>
      <path d="M126 218 L136 250 L145 226 L154 250 L164 218" stroke="#0a0c0a" stroke-width="5" fill="none"/>

      <!-- braços -->
      <path d="M76 246 Q42 274 54 314 Q60 330 78 322 Q92 314 86 290 Z" fill="#0e110e"/>
      <path d="M214 246 Q248 274 236 314 Q230 330 212 322 Q198 314 204 290 Z" fill="#0e110e"/>
      <circle cx="66" cy="320" r="19" fill="#131613"/>
      <circle cx="224" cy="320" r="19" fill="#131613"/>
      <path d="M52 312 A19 19 0 0 0 66 339" stroke="#8fe08f" stroke-width="2" fill="none" opacity=".3"/>
      <path d="M238 312 A19 19 0 0 1 224 339" stroke="#8fe08f" stroke-width="2" fill="none" opacity=".3"/>

      <!-- chifres -->
      <path d="M96 96 Q46 82 34 24 Q76 44 112 76 Z" fill="url(#oHorn)"/>
      <path d="M194 96 Q244 82 256 24 Q214 44 178 76 Z" fill="url(#oHorn)"/>
      <path d="M100 92 Q56 76 42 34" stroke="#8fe08f" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85" filter="url(#oNeon)"/>
      <path d="M190 92 Q234 76 248 34" stroke="#8fe08f" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85" filter="url(#oNeon)"/>

      <!-- cabeça -->
      <path d="M145 46 Q202 46 210 112 Q215 152 196 188 Q176 220 145 226 Q114 220 94 188 Q75 152 80 112 Q88 46 145 46 Z" fill="url(#oHead)"/>
      <!-- cabelo -->
      <path d="M145 42 Q198 42 206 96 Q180 76 145 74 Q110 76 84 96 Q92 42 145 42 Z" fill="#0b0d0b"/>
      <path d="M100 62 Q112 52 126 50 M136 46 Q150 44 162 48 M172 52 Q184 58 192 68" stroke="#161916" stroke-width="5" fill="none" stroke-linecap="round"/>
      <!-- luz de contorno verde -->
      <path d="M92 110 Q80 152 98 190" stroke="#8fe08f" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".35"/>
      <path d="M198 110 Q210 152 192 190" stroke="#8fe08f" stroke-width="2" fill="none" stroke-linecap="round" opacity=".2"/>
      <!-- sombras de rosto (3D sutil) -->
      <path d="M120 148 Q145 160 170 148 Q168 168 145 172 Q122 168 120 148 Z" fill="#0c0e0c" opacity=".7"/>
      <ellipse cx="132" cy="160" rx="4" ry="6" fill="#040504"/>
      <ellipse cx="158" cy="160" rx="4" ry="6" fill="#040504"/>
      ${eyes}
      ${mouth}
    </svg>`;
  },

  fist: `
  <svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pFist" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#232623"/>
        <stop offset="100%" stop-color="#101210"/>
      </linearGradient>
    </defs>
    <path d="M60 230 L60 130 Q60 100 84 96 L88 96 Q88 78 104 76 Q118 74 122 88 Q126 74 142 76 Q156 78 156 94 Q170 96 172 112 L172 150 Q174 200 150 230 Z" fill="url(#pFist)" stroke="#7fbf78" stroke-width="4" stroke-linejoin="round"/>
    <path d="M88 100 L88 122 M122 96 L122 122 M154 100 L154 124" stroke="#7fbf78" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>
    <path d="M62 148 Q84 142 92 156 Q96 170 80 176 Q64 178 62 164 Z" fill="#1a1d1a" stroke="#7fbf78" stroke-width="3.5"/>
    <path d="M60 230 L60 180 Q80 174 96 182 L150 182 Q160 204 150 230 Z" fill="#0d0f0d"/>
  </svg>`,

  enemyFist: `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="eFist" cx="40%" cy="35%" r="80%">
        <stop offset="0%" stop-color="#262326"/>
        <stop offset="100%" stop-color="#0d0b0d"/>
      </radialGradient>
    </defs>
    <ellipse cx="100" cy="105" rx="88" ry="80" fill="url(#eFist)" stroke="#ff5964" stroke-width="6"/>
    <path d="M30 82 Q54 60 82 66 M86 58 Q104 48 122 58 M128 62 Q152 58 168 76" stroke="#ff5964" stroke-width="6" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="M36 130 Q60 148 100 148 Q140 148 164 130" stroke="#ff5964" stroke-width="5" fill="none" stroke-linecap="round" opacity=".45"/>
    <ellipse cx="70" cy="90" rx="16" ry="11" fill="#3a2f33" opacity=".9"/>
  </svg>`,

  blockArms: `
  <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice">
    <defs>
      <linearGradient id="bArm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#232623"/>
        <stop offset="100%" stop-color="#0e100e"/>
      </linearGradient>
    </defs>
    <g stroke="#7fbf78" stroke-width="6" stroke-linejoin="round">
      <path d="M140 520 L170 300 Q176 236 232 232 Q260 230 268 260 L262 350 Q250 460 220 520 Z" fill="url(#bArm)"/>
      <path d="M232 232 Q224 180 252 168 Q280 158 292 184 Q300 156 328 162 Q352 168 348 196 L340 268 Q330 310 290 306 Q252 300 240 268 Z" fill="url(#bArm)"/>
      <path d="M660 520 L630 300 Q624 236 568 232 Q540 230 532 260 L538 350 Q550 460 580 520 Z" fill="url(#bArm)"/>
      <path d="M568 232 Q576 180 548 168 Q520 158 508 184 Q500 156 472 162 Q448 168 452 196 L460 268 Q470 310 510 306 Q548 300 560 268 Z" fill="url(#bArm)"/>
    </g>
    <path d="M0 500 L800 500 L800 470 Q400 420 0 470 Z" fill="rgba(143,224,143,.22)"/>
  </svg>`,

  avatar: (mood) => `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="aGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#8fe08f" stop-opacity=".4"/>
        <stop offset="100%" stop-color="#8fe08f" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="aHead" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#242624"/>
        <stop offset="100%" stop-color="#0e100e"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="52" r="48" fill="url(#aGlow)"/>
    <path d="M30 34 Q12 28 8 6 Q26 14 40 26 Z" fill="#131513"/>
    <path d="M70 34 Q88 28 92 6 Q74 14 60 26 Z" fill="#131513"/>
    <path d="M31 32 Q16 24 12 10" stroke="#8fe08f" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M69 32 Q84 24 88 10" stroke="#8fe08f" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M50 18 Q72 18 75 44 Q77 62 68 74 Q60 84 50 86 Q40 84 32 74 Q23 62 25 44 Q28 18 50 18 Z" fill="url(#aHead)"/>
    <path d="M50 16 Q70 16 74 36 Q62 28 50 27 Q38 28 26 36 Q30 16 50 16 Z" fill="#0b0d0b"/>
    ${mood === 'mad'
      ? '<path d="M34 48 L46 52 M66 48 L54 52" stroke="#8fe08f" stroke-width="4" stroke-linecap="round"/><path d="M40 68 Q50 63 60 68" stroke="#020302" stroke-width="4" fill="none" stroke-linecap="round"/>'
      : mood === 'hurt'
        ? '<path d="M35 46 L45 54 M45 46 L35 54 M55 46 L65 54 M65 46 L55 54" stroke="#8fe08f" stroke-width="3" stroke-linecap="round"/><ellipse cx="50" cy="70" rx="6" ry="8" fill="#020302"/>'
        : '<path d="M35 50 Q40 55 46 50 M54 50 Q60 55 65 50" stroke="#020302" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M38 66 Q50 76 62 65" stroke="#020302" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M38 68 Q50 78 62 67" stroke="#8fe08f" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".5"/>'}
  </svg>`,
};

/* ============================================================
   SOM (WebAudio — sem arquivos)
   ============================================================ */
const Sound = (() => {
  let ctx = null;
  const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

  function thump(freq, dur, vol, type = 'sine') {
    try {
      const a = ac(), o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, a.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * .3), a.currentTime + dur);
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, a.currentTime + dur);
      o.connect(g).connect(a.destination);
      o.start(); o.stop(a.currentTime + dur);
    } catch (e) { /* áudio bloqueado — segue o jogo */ }
  }
  function noise(dur, vol) {
    try {
      const a = ac(), len = a.sampleRate * dur, buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900;
      s.buffer = buf; g.gain.value = vol;
      s.connect(f).connect(g).connect(a.destination); s.start();
    } catch (e) { /* ignora */ }
  }
  return {
    punch()  { thump(160, .12, .5); noise(.08, .25); },
    hit()    { thump(90, .25, .7, 'square'); noise(.15, .35); },
    whoosh() { noise(.25, .2); },
    block()  { thump(320, .15, .4, 'triangle'); },
    warn()   { thump(520, .18, .25, 'sawtooth'); },
    ko()     { thump(70, .8, .8, 'square'); noise(.5, .4); },
    win()    { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => thump(f, .3, .3, 'triangle'), i * 130)); },
  };
})();

/* ============================================================
   ESTADO / ELEMENTOS
   ============================================================ */
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const opponent = $('opponent');
const oppSprite = opponent.querySelector('.opp-sprite');
const enemyFist = $('enemyFist');
const blockArms = $('blockArms');
const fistL = $('fistL'), fistR = $('fistR');
const hitFlash = $('hitFlash');
const fxLayer = $('fxLayer');
const scoreEl = $('score');
const enemyFace = $('enemyFace');

const G = {
  running: false,
  playerHP: CFG.playerHP,
  enemyHP: CFG.enemyHP,
  score: 0,
  blocking: false,
  lastPunch: 0,
  nextFist: 'L',
  enemyState: 'idle',   // idle | windup | attack | dazed | ko
  timers: [],
};

/* ---------------- Assets / placeholders ---------------- */
function applyAssets() {
  document.querySelectorAll('[data-asset]').forEach(el => {
    const key = el.dataset.asset;
    if (ASSETS[key]) {
      el.innerHTML = `<img src="${ASSETS[key]}" alt="">`;
      if (key === 'background') { el.querySelector('img').style.objectFit = 'cover'; el.childNodes.forEach(n => { if (n.tagName !== 'IMG') n.remove?.(); }); }
    }
  });
  if (!ASSETS.opponent)  setOpponentMood('ok');
  if (!ASSETS.enemyFist) enemyFist.querySelector('.sprite').innerHTML = SVGS.enemyFist;
  if (!ASSETS.blockArms) blockArms.querySelector('.sprite').innerHTML = SVGS.blockArms;
  if (!ASSETS.fistLeft)  fistL.querySelector('.sprite').innerHTML = SVGS.fist;
  if (!ASSETS.fistRight) fistR.querySelector('.sprite').innerHTML = SVGS.fist;
  if (!ASSETS.enemyAvatar) enemyFace.innerHTML = SVGS.avatar('ok');
}

function setOpponentMood(mood) {
  if (ASSETS.opponent) return; // asset final tem a própria arte
  oppSprite.innerHTML = SVGS.opponent(mood);
}
function updateAvatar() {
  if (ASSETS.enemyAvatar) return;
  const r = G.enemyHP / CFG.enemyHP;
  enemyFace.innerHTML = SVGS.avatar(r < .35 ? 'hurt' : r < .7 ? 'mad' : 'ok');
}

/* ---------------- HUD ---------------- */
function buildHPBar(el, segs) {
  el.innerHTML = '';
  for (let i = 0; i < segs; i++) {
    const s = document.createElement('div');
    s.className = 'hp-seg';
    el.appendChild(s);
  }
}
function updateHP() {
  const set = (el, hp) => [...el.children].forEach((s, i) => s.classList.toggle('off', i >= hp));
  set($('hpPlayer'), G.playerHP);
  set($('hpEnemy'), G.enemyHP);
}
function addScore(v) {
  G.score = Math.max(0, G.score + v);
  scoreEl.innerHTML = `${G.score} <small>PTS</small>`;
  scoreEl.classList.remove('bump');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('bump');
}

/* ---------------- FX ---------------- */
function popup(text, cls, x = 50, y = 40) {
  const p = document.createElement('div');
  p.className = `pop ${cls}`;
  p.textContent = text;
  p.style.left = x + '%';
  p.style.top = y + '%';
  fxLayer.appendChild(p);
  setTimeout(() => p.remove(), 850);
}
function sparks(x, y, color = '#a8f0b0', n = 7) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = x + '%';
    s.style.top = y + '%';
    s.style.background = color;
    const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    fxLayer.appendChild(s);
    setTimeout(() => s.remove(), 520);
  }
}
function flash(on = 120) {
  hitFlash.classList.add('on');
  setTimeout(() => hitFlash.classList.remove('on'), on);
}
function shake() {
  stage.classList.remove('shake');
  void stage.offsetWidth;
  stage.classList.add('shake');
}

/* ---------------- Estado do oponente ---------------- */
function setOppState(cls) {
  opponent.className = 'opponent state-' + cls;
}

/* ============================================================
   AÇÕES
   ============================================================ */
function punch(evX) {
  const now = performance.now();
  if (!G.running || G.blocking || now - G.lastPunch < CFG.punchCooldown) return;
  G.lastPunch = now;

  const side = G.nextFist;
  G.nextFist = side === 'L' ? 'R' : 'L';
  const fist = side === 'L' ? fistL : fistR;
  fist.classList.remove('punching');
  void fist.offsetWidth;
  fist.classList.add('punching');
  Sound.punch();

  // inimigo atacando = você não acerta (troca de golpes é dele)
  if (G.enemyState === 'attack' || G.enemyState === 'ko') return;

  // esquiva ocasional
  if (G.enemyState !== 'dazed' && Math.random() < CFG.dodgeChance) {
    popup('MISS!', 'info', 50, 34);
    return;
  }

  setTimeout(() => {
    if (!G.running) return;
    G.enemyHP = Math.max(0, G.enemyHP - 1);
    addScore(CFG.pointsHit);
    Sound.hit();
    updateHP();
    updateAvatar();
    setOpponentMood(G.enemyHP / CFG.enemyHP < .4 ? 'hurt' : 'mad');
    setOppState(side === 'L' ? 'hitR' : 'hitL');
    popup('+' + CFG.pointsHit, 'good', 44 + Math.random() * 12, 30 + Math.random() * 10);
    sparks(50, 38, '#a8f0b0');
    if (Math.random() < .3) sparks(50, 34, '#ff5964', 4);

    if (G.enemyHP <= 0) return ko(true);

    clearTimeout(G.recoilT);
    G.recoilT = setTimeout(() => {
      if (G.running && (G.enemyState === 'idle' || G.enemyState === 'dazed')) setOppState('idle');
      setOpponentMood(G.enemyHP / CFG.enemyHP < .4 ? 'mad' : 'ok');
    }, 220);
  }, 110); // impacto no meio da animação do soco
}

function startBlock() {
  if (!G.running || G.blocking) return;
  G.blocking = true;
  stage.classList.add('blocking');
  blockArms.classList.remove('hidden');
}
function stopBlock() {
  G.blocking = false;
  stage.classList.remove('blocking');
  blockArms.classList.add('hidden');
}

/* ---------------- IA do inimigo ---------------- */
function scheduleAttack() {
  if (!G.running) return;
  const delay = CFG.attackMinDelay + Math.random() * (CFG.attackMaxDelay - CFG.attackMinDelay);
  G.timers.push(setTimeout(enemyWindup, delay));
}

function enemyWindup() {
  if (!G.running || G.enemyState === 'ko') return;
  G.enemyState = 'windup';
  setOppState('windup');
  setOpponentMood('mad');
  Sound.warn();
  popup('!', 'bad', 50, 22);

  G.timers.push(setTimeout(enemyAttack, CFG.windupTime));
}

function enemyAttack() {
  if (!G.running) return;
  G.enemyState = 'attack';
  setOppState('attack');
  enemyFist.classList.remove('hidden', 'flying');
  void enemyFist.offsetWidth;
  enemyFist.classList.add('flying');
  Sound.whoosh();

  G.timers.push(setTimeout(() => {
    enemyFist.classList.add('hidden');
    enemyFist.classList.remove('flying');
    if (!G.running) return;

    if (G.blocking) {
      addScore(CFG.pointsBlock);
      Sound.block();
      popup('BLOCKED! +' + CFG.pointsBlock, 'info', 50, 55);
      sparks(50, 62, '#8fe08f', 9);
      // inimigo fica aberto após bloqueio
      G.enemyState = 'dazed';
      setOppState('dazed');
      G.timers.push(setTimeout(() => {
        if (G.running && G.enemyState === 'dazed') { G.enemyState = 'idle'; setOppState('idle'); }
      }, 1400));
    } else {
      G.playerHP = Math.max(0, G.playerHP - 1);
      addScore(CFG.pointsHurt);
      Sound.hit();
      flash();
      shake();
      popup(CFG.pointsHurt, 'bad', 50, 50);
      updateHP();
      if (G.playerHP <= 0) return ko(false);
      G.enemyState = 'idle';
      setOppState('taunt');
      G.timers.push(setTimeout(() => { if (G.running && G.enemyState === 'idle') setOppState('idle'); }, 900));
    }
    scheduleAttack();
  }, CFG.attackTime));
}

/* ---------------- Fim de jogo ---------------- */
function ko(playerWon) {
  G.running = false;
  G.timers.forEach(clearTimeout);
  G.timers = [];
  stopBlock();

  if (playerWon) {
    G.enemyState = 'ko';
    setOpponentMood('hurt');
    setOppState('ko');
    Sound.ko();
    popup('K.O.!', 'good', 50, 40);
    setTimeout(Sound.win, 500);
  } else {
    flash(600);
    shake();
    Sound.ko();
  }

  setTimeout(() => {
    const t = $('endTitle'), m = $('endMsg');
    t.textContent = playerWon ? 'KNOCKOUT!' : 'YOU GOT BEAT...';
    t.className = playerWon ? 'win' : 'lose';
    m.textContent = playerWon
      ? 'The alley is yours. The Bull will think twice.'
      : 'The Bull won this one. Get up and try again!';
    $('endScore').textContent = G.score;
    $('screenEnd').classList.remove('hidden');
  }, playerWon ? 1600 : 900);
}

/* ---------------- Ciclo de jogo ---------------- */
function resetGame() {
  G.playerHP = CFG.playerHP;
  G.enemyHP = CFG.enemyHP;
  G.score = 0;
  G.blocking = false;
  G.nextFist = 'L';
  G.enemyState = 'idle';
  G.timers.forEach(clearTimeout);
  G.timers = [];
  enemyFist.classList.add('hidden');
  enemyFist.classList.remove('flying');
  addScore(0);
  updateHP();
  updateAvatar();
  setOpponentMood('ok');
  setOppState('idle');
}

function startGame() {
  resetGame();
  G.running = true;
  scheduleAttack();
}

/* ============================================================
   INPUT
   ============================================================ */
const blockZone = $('blockZone');

stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.screen') || e.target.closest('.block-zone')) return;
  punch(e.clientX);
});

// bloqueio: segurar na zona OU barra de espaço
blockZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  startBlock();
  blockZone.setPointerCapture(e.pointerId);
});
['pointerup', 'pointercancel'].forEach(ev =>
  blockZone.addEventListener(ev, stopBlock));

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && G.running) {
    e.preventDefault();
    startBlock();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') stopBlock();
});
window.addEventListener('blur', stopBlock);

/* ---------------- Telas ---------------- */
$('btnStart').addEventListener('click', () => {
  $('screenIntro').classList.add('hidden');
  $('screenTutorial').classList.remove('hidden');
});
$('btnGo').addEventListener('click', () => {
  $('screenTutorial').classList.add('hidden');
  startGame();
});
$('btnRestart').addEventListener('click', () => {
  $('screenEnd').classList.add('hidden');
  startGame();
});

/* ---------------- Init ---------------- */
buildHPBar($('hpPlayer'), CFG.playerHP);
buildHPBar($('hpEnemy'), CFG.enemyHP);
applyAssets();
resetGame();
