/* ============================================================
   BULLFUN — game engine
   ------------------------------------------------------------
   ASSET SWAP: point any slot in ASSETS to an image path and it
   replaces the built-in art. Anything left as `null` uses the
   SVG placeholder. The opponent is drawn as SVG body + PNG head
   (HEADS below); setting ASSETS.opponent to a full-body image
   overrides both.
   ============================================================ */

const ASSETS = {
  background: null,                    // full stage backdrop
  opponent:   null,                    // full-body opponent art (overrides body+head)
  enemyFist:  null,                    // opponent fist flying at the camera
  fistLeft:   'assets/fist-left.png',  // player left arm
  fistRight:  'assets/fist-left.png',  // mirrored via CSS into the right arm
  blockArms:  'assets/block.png',      // raised blocking arms
  enemyAvatar:'assets/head-angry.png', // HUD face
};

// Bull head states (swapped according to what's happening)
const HEADS = {
  angry: 'assets/head-angry.png',
  pain:  'assets/head-pain.png',
  dazed: 'assets/head-dazed.png',
};

/* ---------------- Game tuning ---------------- */
const CFG = {
  playerHP: 10,
  enemyHP: 30,
  pointsHit: 250,
  pointsBlock: 500,
  pointsHurt: -250,
  punchCooldown: 200,        // ms between punches

  // boss — base difficulty
  attackMinDelay: 1700,      // ms between enemy attacks
  attackMaxDelay: 3600,
  windupTime: 550,           // ms of warning before the attack
  attackTime: 480,           // ms the fist flies (block window)
  dodgeChance: 0.18,         // chance the boss dodges a punch

  // boss — enraged (below 40% HP)
  enrageAt: 0.4,
  enrageMinDelay: 1000,
  enrageMaxDelay: 2300,
  enrageWindup: 400,
  enrageDodge: 0.26,
  doubleAttackChance: 0.35,  // chance of an immediate follow-up attack
};

/* ============================================================
   SVG PLACEHOLDERS (used when an ASSETS slot is null)
   ============================================================ */
const SVGS = {
  /* Headless bull body — the PNG head from HEADS sits on top. */
  opponentBody: `
  <svg viewBox="0 0 290 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="oGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#8fe08f" stop-opacity=".3"/>
        <stop offset="55%" stop-color="#8fe08f" stop-opacity=".12"/>
        <stop offset="100%" stop-color="#8fe08f" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="145" cy="150" rx="135" ry="140" fill="url(#oGlow)"/>
    <!-- legs -->
    <rect x="100" y="304" width="36" height="82" rx="13" fill="#0c0e0c"/>
    <rect x="156" y="304" width="36" height="82" rx="13" fill="#090b09"/>
    <ellipse cx="117" cy="388" rx="29" ry="9" fill="#050605"/>
    <ellipse cx="175" cy="388" rx="29" ry="9" fill="#050605"/>
    <!-- torso (dark hoodie) -->
    <path d="M72 244 Q62 330 98 324 L192 324 Q228 330 218 244 Q210 216 145 214 Q80 216 72 244 Z" fill="#111411"/>
    <path d="M80 240 Q92 222 122 217" stroke="#8fe08f" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".35"/>
    <path d="M210 240 Q198 222 168 217" stroke="#8fe08f" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".2"/>
    <path d="M126 218 L136 250 L145 226 L154 250 L164 218" stroke="#0a0c0a" stroke-width="5" fill="none"/>
    <!-- arms -->
    <path d="M76 246 Q42 274 54 314 Q60 330 78 322 Q92 314 86 290 Z" fill="#0e110e"/>
    <path d="M214 246 Q248 274 236 314 Q230 330 212 322 Q198 314 204 290 Z" fill="#0e110e"/>
    <circle cx="66" cy="320" r="19" fill="#131613"/>
    <circle cx="224" cy="320" r="19" fill="#131613"/>
    <path d="M52 312 A19 19 0 0 0 66 339" stroke="#8fe08f" stroke-width="2" fill="none" opacity=".3"/>
    <path d="M238 312 A19 19 0 0 1 224 339" stroke="#8fe08f" stroke-width="2" fill="none" opacity=".3"/>
  </svg>`,

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
};

/* ============================================================
   SOUND (WebAudio — no files needed)
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
    } catch (e) { /* audio blocked — keep playing */ }
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
    } catch (e) { /* ignore */ }
  }
  return {
    punch()  { thump(160, .12, .5); noise(.08, .25); },
    hit()    { thump(90, .25, .7, 'square'); noise(.15, .35); },
    whoosh() { noise(.25, .2); },
    block()  { thump(320, .15, .4, 'triangle'); },
    warn()   { thump(520, .18, .25, 'sawtooth'); },
    enrage() { thump(120, .5, .6, 'sawtooth'); thump(80, .6, .5, 'square'); },
    ko()     { thump(70, .8, .8, 'square'); noise(.5, .4); },
    win()    { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => thump(f, .3, .3, 'triangle'), i * 130)); },
  };
})();

/* ============================================================
   STATE / ELEMENTS
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
  enraged: false,
  lastPunch: 0,
  nextFist: 'L',
  enemyState: 'idle',   // idle | windup | attack | dazed | ko
  timers: [],
};

/* ---------------- Assets / placeholders ---------------- */
let oppHead = null;

function applyAssets() {
  document.querySelectorAll('[data-asset]').forEach(el => {
    const key = el.dataset.asset;
    if (ASSETS[key]) {
      el.innerHTML = `<img src="${ASSETS[key]}" alt="">`;
      if (key === 'background') el.querySelector('img').style.objectFit = 'cover';
    }
  });
  if (!ASSETS.opponent) {
    oppSprite.innerHTML = SVGS.opponentBody;
    oppHead = document.createElement('img');
    oppHead.className = 'opp-head';
    oppHead.src = HEADS.angry;
    oppHead.alt = '';
    opponent.appendChild(oppHead);
  }
  if (!ASSETS.enemyFist) enemyFist.querySelector('.sprite').innerHTML = SVGS.enemyFist;
  if (!ASSETS.blockArms) blockArms.querySelector('.sprite').innerHTML = SVGS.blockArms;
  if (!ASSETS.fistLeft)  fistL.querySelector('.sprite').innerHTML = SVGS.fist;
  if (!ASSETS.fistRight) fistR.querySelector('.sprite').innerHTML = SVGS.fist;
  if (!ASSETS.enemyAvatar) enemyFace.innerHTML = `<img src="${HEADS.angry}" alt="">`;
}

const STATE_HEAD = {
  idle: 'angry', windup: 'angry', attack: 'angry', taunt: 'angry',
  hitL: 'pain', hitR: 'pain', dazed: 'dazed', ko: 'dazed',
};
function setHead(key) {
  if (oppHead && HEADS[key]) oppHead.src = HEADS[key];
}
function updateAvatar() {
  const img = enemyFace.querySelector('img');
  if (!img) return;
  const r = G.enemyHP / CFG.enemyHP;
  img.src = r < .35 ? HEADS.pain : HEADS.angry;
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

/* ---------------- Opponent state ---------------- */
function setOppState(cls) {
  opponent.className = 'opponent state-' + cls + (G.enraged ? ' enraged' : '');
  setHead(STATE_HEAD[cls] || 'angry');
}

/* ============================================================
   ACTIONS
   ============================================================ */
function punch() {
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

  // can't land while he's mid-attack
  if (G.enemyState === 'attack' || G.enemyState === 'ko') return;

  // dodge (better reflexes when enraged)
  const dodge = G.enraged ? CFG.enrageDodge : CFG.dodgeChance;
  if (G.enemyState !== 'dazed' && Math.random() < dodge) {
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
    maybeEnrage();
    setOppState(side === 'L' ? 'hitR' : 'hitL');
    popup('+' + CFG.pointsHit, 'good', 44 + Math.random() * 12, 30 + Math.random() * 10);
    sparks(50, 38, '#a8f0b0');
    if (Math.random() < .3) sparks(50, 34, '#ff5964', 4);

    if (G.enemyHP <= 0) return ko(true);

    clearTimeout(G.recoilT);
    G.recoilT = setTimeout(() => {
      if (G.running && (G.enemyState === 'idle' || G.enemyState === 'dazed')) setOppState(G.enemyState);
    }, 220);
  }, 110); // impact mid-swing
}

function maybeEnrage() {
  if (G.enraged || G.enemyHP > CFG.enemyHP * CFG.enrageAt) return;
  G.enraged = true;
  opponent.classList.add('enraged');
  popup('ENRAGED!', 'bad', 50, 24);
  sparks(50, 30, '#ff5964', 10);
  Sound.enrage();
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

/* ---------------- Boss AI ---------------- */
function scheduleAttack(quick = false) {
  if (!G.running) return;
  const mn = G.enraged ? CFG.enrageMinDelay : CFG.attackMinDelay;
  const mx = G.enraged ? CFG.enrageMaxDelay : CFG.attackMaxDelay;
  const delay = quick ? 350 : mn + Math.random() * (mx - mn);
  G.timers.push(setTimeout(enemyWindup, delay));
}

function enemyWindup() {
  if (!G.running || G.enemyState === 'ko') return;
  G.enemyState = 'windup';
  setOppState('windup');
  Sound.warn();
  popup('!', 'bad', 50, 22);

  const windup = G.enraged ? CFG.enrageWindup : CFG.windupTime;
  G.timers.push(setTimeout(enemyAttack, windup));
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
      // open for punishment after a blocked hit
      G.enemyState = 'dazed';
      setOppState('dazed');
      G.timers.push(setTimeout(() => {
        if (G.running && G.enemyState === 'dazed') { G.enemyState = 'idle'; setOppState('idle'); }
      }, 1400));
      scheduleAttack();
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
      // enraged bulls chain attacks
      const double = G.enraged && Math.random() < CFG.doubleAttackChance;
      scheduleAttack(double);
    }
  }, CFG.attackTime));
}

/* ---------------- Game over ---------------- */
function ko(playerWon) {
  G.running = false;
  G.timers.forEach(clearTimeout);
  G.timers = [];
  stopBlock();

  if (playerWon) {
    G.enemyState = 'ko';
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
    window.dispatchEvent(new CustomEvent('bullfun:end', { detail: { score: G.score, won: playerWon } }));
  }, playerWon ? 1600 : 900);
}

/* ---------------- Game cycle ---------------- */
function resetGame() {
  G.playerHP = CFG.playerHP;
  G.enemyHP = CFG.enemyHP;
  G.score = 0;
  G.blocking = false;
  G.enraged = false;
  G.nextFist = 'L';
  G.enemyState = 'idle';
  G.timers.forEach(clearTimeout);
  G.timers = [];
  enemyFist.classList.add('hidden');
  enemyFist.classList.remove('flying');
  opponent.classList.remove('enraged');
  addScore(0);
  updateHP();
  updateAvatar();
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
  punch();
});

// block: hold the zone OR the space bar
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

/* ---------------- Screens ---------------- */
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
