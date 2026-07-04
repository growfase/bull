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
  enemyHP: 55,
  pointsHit: 250,
  pointsBlock: 500,
  pointsHurt: -250,
  punchCooldown: 200,        // ms between punches

  // boss — base difficulty
  attackMinDelay: 1200,      // ms between enemy attacks
  attackMaxDelay: 2600,
  windupTime: 440,           // ms of warning before the attack
  attackTime: 440,           // ms the fist flies (block window)
  dodgeChance: 0.24,         // chance the boss dodges a punch
  counterChance: 0.4,        // chance he counter-attacks right after dodging
  dazedTime: 1100,           // ms he stays open after a blocked hit

  // boss — SUPER RAGE (below 30% HP): red glow, relentless
  enrageAt: 0.3,
  enrageMinDelay: 600,
  enrageMaxDelay: 1400,
  enrageWindup: 260,
  enrageDodge: 0.34,
  doubleAttackChance: 0.6,   // chance of an immediate follow-up attack
  enrageDazedTime: 750,

  // boss — SUPER POWER (at 20% HP): unblocked = instant death
  superAt: 0.2,
  superChargeTime: 850,      // ms of warning to get the block up
  superBonus: 1000,          // points for surviving it

  // player — combo stun: land N punches in a row to stun the boss
  comboStun: 10,             // consecutive hits to stun
  stunTime: 2200,            // ms he stays stunned (stars spinning)

  // player — GREEN CANDLE power (charge by landing hits, then unleash)
  powerMax: 12,              // hits to fully charge
  powerPerBlock: 2,          // extra charge for a blocked attack
  candleHits: 6,             // rapid candle punches in the combo
  candleHitDamage: 1,        // HP per candle punch
  candleHitPoints: 100,      // points per candle punch
  candleHitGap: 190,         // ms between combo punches
};

/* ============================================================
   SVG PLACEHOLDERS (used when an ASSETS slot is null)
   ============================================================ */
const SVGS = {
  /* Headless muscular bull body — the PNG head from HEADS sits on the
     neck/traps so face and body read as one figure. */
  opponentBody: `
  <svg viewBox="0 0 290 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="oGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#8fe08f" stop-opacity=".3"/>
        <stop offset="55%" stop-color="#8fe08f" stop-opacity=".12"/>
        <stop offset="100%" stop-color="#8fe08f" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="oSkin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#242724"/>
        <stop offset="55%" stop-color="#191c19"/>
        <stop offset="100%" stop-color="#0e100e"/>
      </linearGradient>
      <linearGradient id="oSkin2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e211e"/>
        <stop offset="100%" stop-color="#101310"/>
      </linearGradient>
    </defs>
    <ellipse cx="145" cy="150" rx="135" ry="140" fill="url(#oGlow)"/>

    <!-- legs + shoes -->
    <path d="M104 340 L134 340 L132 386 L102 386 Z" fill="#0d0f0d"/>
    <path d="M156 340 L186 340 L188 386 L158 386 Z" fill="#0a0c0a"/>
    <ellipse cx="115" cy="390" rx="30" ry="9" fill="#050605"/>
    <ellipse cx="176" cy="390" rx="30" ry="9" fill="#050605"/>

    <!-- shorts -->
    <path d="M96 316 L194 316 L200 356 L154 356 L145 336 L136 356 L90 356 Z" fill="#111511"/>
    <path d="M96 316 L194 316 L196 328 L94 328 Z" fill="#0c0f0c"/>

    <!-- neck / traps (the head sits here) -->
    <path d="M100 196 Q145 182 190 196 L198 226 Q145 206 92 226 Z" fill="url(#oSkin)"/>

    <!-- torso -->
    <path d="M78 224 Q145 200 212 224 Q234 262 224 300 Q214 330 186 322 L104 322 Q76 330 66 300 Q56 262 78 224 Z" fill="url(#oSkin)"/>
    <!-- pecs -->
    <path d="M92 240 Q118 232 142 244 Q144 268 120 274 Q96 270 92 240 Z" fill="#1d201d"/>
    <path d="M198 240 Q172 232 148 244 Q146 268 170 274 Q194 270 198 240 Z" fill="#181b18"/>
    <path d="M145 244 L145 288" stroke="#0b0d0b" stroke-width="5" stroke-linecap="round"/>
    <!-- abs -->
    <path d="M122 284 Q145 278 168 284 M122 300 Q145 294 168 300 M126 314 Q145 309 164 314" stroke="#0b0d0b" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M133 284 L133 316 M157 284 L157 316" stroke="#0b0d0b" stroke-width="3.5" stroke-linecap="round"/>

    <!-- left arm (deltoid, biceps, forearm, fist) -->
    <circle cx="72" cy="242" r="30" fill="url(#oSkin2)"/>
    <path d="M52 254 Q38 286 50 312 Q60 330 78 320 Q92 310 84 284 Q78 262 52 254 Z" fill="url(#oSkin2)"/>
    <path d="M50 306 Q40 336 56 352 Q70 362 82 348 Q92 334 80 316 Z" fill="#161916"/>
    <circle cx="66" cy="352" r="21" fill="#1b1e1b"/>
    <path d="M50 344 A21 21 0 0 0 64 372" stroke="#8fe08f" stroke-width="2.5" fill="none" opacity=".4"/>
    <!-- right arm -->
    <circle cx="218" cy="242" r="30" fill="url(#oSkin2)"/>
    <path d="M238 254 Q252 286 240 312 Q230 330 212 320 Q198 310 206 284 Q212 262 238 254 Z" fill="url(#oSkin2)"/>
    <path d="M240 306 Q250 336 234 352 Q220 362 208 348 Q198 334 210 316 Z" fill="#161916"/>
    <circle cx="224" cy="352" r="21" fill="#1b1e1b"/>
    <path d="M240 344 A21 21 0 0 1 226 372" stroke="#8fe08f" stroke-width="2.5" fill="none" opacity=".4"/>

    <!-- green rim light -->
    <path d="M78 228 Q60 262 68 298" stroke="#8fe08f" stroke-width="3" fill="none" stroke-linecap="round" opacity=".35"/>
    <path d="M102 200 Q88 208 84 222" stroke="#8fe08f" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".4"/>
    <path d="M212 228 Q230 262 222 298" stroke="#8fe08f" stroke-width="2" fill="none" stroke-linecap="round" opacity=".18"/>
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
      <radialGradient id="eFist" cx="38%" cy="32%" r="85%">
        <stop offset="0%" stop-color="#2b272b"/>
        <stop offset="60%" stop-color="#161316"/>
        <stop offset="100%" stop-color="#0a080a"/>
      </radialGradient>
      <filter id="eNeon" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="2.5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <!-- motion streaks -->
    <path d="M18 40 L58 62 M12 100 L46 100 M18 160 L58 138" stroke="#ff5964" stroke-width="5" stroke-linecap="round" opacity=".45"/>
    <!-- fist mass -->
    <path d="M46 78 Q44 44 74 40 Q86 22 106 30 Q118 18 136 28 Q152 22 160 40 Q186 48 184 84 L184 122 Q184 162 148 172 Q96 184 62 160 Q40 142 42 110 Z" fill="url(#eFist)" stroke="#ff5964" stroke-width="5" stroke-linejoin="round" filter="url(#eNeon)"/>
    <!-- knuckles -->
    <circle cx="80" cy="58" r="13" fill="#241f24" stroke="#ff5964" stroke-width="3" opacity=".95"/>
    <circle cx="112" cy="50" r="13" fill="#241f24" stroke="#ff5964" stroke-width="3" opacity=".95"/>
    <circle cx="144" cy="56" r="12" fill="#241f24" stroke="#ff5964" stroke-width="3" opacity=".95"/>
    <!-- finger creases -->
    <path d="M70 96 Q92 108 118 100 M74 124 Q98 136 126 126" stroke="#ff5964" stroke-width="4" fill="none" stroke-linecap="round" opacity=".5"/>
    <!-- thumb -->
    <path d="M52 118 Q34 128 40 148 Q48 164 68 156" stroke="#ff5964" stroke-width="4" fill="#1a161a" stroke-linecap="round" opacity=".9"/>
    <ellipse cx="86" cy="66" rx="14" ry="9" fill="#3a3f3a" opacity=".35"/>
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
const powerBtn = $('powerBtn');
const candleFist = $('candleFist');

const G = {
  running: false,
  playerHP: CFG.playerHP,
  enemyHP: CFG.enemyHP,
  score: 0,
  blocking: false,
  enraged: false,
  superDone: false,
  power: 0,
  candling: false,
  combo: 0,
  lastPunch: 0,
  nextFist: 'L',
  enemyState: 'idle',   // idle | windup | attack | dazed | ko
  timers: [],
  t0: 0,
  finalTime: 0,
};
let timerIv = null;

/* ---------------- Assets / placeholders ---------------- */
let oppHead = null;
let stunStars = null;

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
  // estrelas amarelas do atordoamento (giram sobre a cabeça)
  stunStars = document.createElement('div');
  stunStars.className = 'stun-stars hidden';
  stunStars.innerHTML = '<div class="stars-ring"><span>★</span><span>★</span><span>★</span></div>';
  opponent.appendChild(stunStars);

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
  if (!G.running || G.blocking || G.candling || now - G.lastPunch < CFG.punchCooldown) return;
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

  // dodge (better reflexes when enraged) — and he punishes whiffs
  const dodge = G.enraged ? CFG.enrageDodge : CFG.dodgeChance;
  if (G.enemyState !== 'dazed' && Math.random() < dodge) {
    popup('MISS!', 'info', 50, 34);
    resetCombo();
    if (G.enemyState === 'idle' && Math.random() < CFG.counterChance) {
      G.timers.push(setTimeout(enemyWindup, 200)); // instant counter
    }
    return;
  }

  setTimeout(() => {
    if (!G.running) return;
    G.enemyHP = Math.max(0, G.enemyHP - 1);
    addScore(CFG.pointsHit);
    Sound.hit();
    updateHP();
    updateAvatar();
    addPower(1);
    addCombo();
    maybeEnrage();
    maybeSuper();
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
  popup('SUPER RAGE!', 'bad', 50, 24);
  sparks(50, 30, '#ff5964', 12);
  Sound.enrage();
}

/* ---------------- Combo & stun ---------------- */
function updateComboUI() {
  const el = $('combo');
  el.textContent = 'COMBO x' + G.combo;
  el.classList.toggle('show', G.combo >= 3);
  el.classList.toggle('hot', G.combo >= 7);
}
function addCombo() {
  G.combo++;
  updateComboUI();
  if (G.combo >= CFG.comboStun) stunBoss();
}
function resetCombo() {
  G.combo = 0;
  updateComboUI();
}

/* 10 socos seguidos: boss atordoado com estrelas amarelas girando */
function stunBoss() {
  if (stage.classList.contains('super-charge') || G.enemyState === 'ko') return;
  resetCombo();

  // interrompe qualquer ataque em andamento
  G.timers.forEach(clearTimeout);
  G.timers = [];
  enemyFist.classList.add('hidden');
  enemyFist.classList.remove('flying', 'super');

  G.enemyState = 'dazed';
  setOppState('dazed');
  stunStars.classList.remove('hidden');
  popup('STUNNED!', 'warn', 50, 24);
  sparks(50, 26, '#ffd94a', 10);
  Sound.block();
  Sound.warn();

  G.timers.push(setTimeout(() => {
    stunStars.classList.add('hidden');
    if (G.running && G.enemyState === 'dazed') { G.enemyState = 'idle'; setOppState('idle'); }
    scheduleAttack();
  }, CFG.stunTime));
}

/* ---------------- GREEN CANDLE power ---------------- */
function addPower(n) {
  if (!G.running || G.power >= CFG.powerMax) return;
  const was = G.power;
  G.power = Math.min(CFG.powerMax, G.power + n);
  updatePowerUI();
  if (was < CFG.powerMax && G.power >= CFG.powerMax) {
    popup('🕯️ CANDLE READY! (E)', 'good', 50, 62);
    Sound.block();
  }
}
function updatePowerUI() {
  powerBtn.style.setProperty('--p', (G.power / CFG.powerMax * 100).toFixed(0));
  powerBtn.classList.toggle('ready', G.power >= CFG.powerMax);
}
function activateCandle() {
  if (!G.running || G.blocking || G.candling || G.power < CFG.powerMax || G.enemyState === 'ko') return;
  G.power = 0;
  G.candling = true;
  updatePowerUI();

  // candle fist takes over the screen; normal fists hide
  stage.classList.add('candling');
  candleFist.classList.remove('hidden');
  popup('GREEN CANDLE!', 'good', 50, 60);

  let hit = 0;
  const jab = () => {
    if (!G.running || G.enemyHP <= 0) return endCombo();
    hit++;
    candleFist.classList.remove('jabbing');
    void candleFist.offsetWidth;
    candleFist.classList.add('jabbing');
    Sound.punch();

    setTimeout(() => {
      if (!G.running) return;
      G.enemyHP = Math.max(0, G.enemyHP - CFG.candleHitDamage);
      addScore(CFG.candleHitPoints);
      Sound.hit();
      updateHP();
      updateAvatar();
      setOppState(hit % 2 ? 'hitL' : 'hitR');
      popup('+' + CFG.candleHitPoints, 'good', 42 + Math.random() * 16, 28 + Math.random() * 12);
      sparks(50, 38, '#7ef07e', 8);

      if (G.enemyHP <= 0) { endCombo(); return ko(true); }
      if (hit >= CFG.candleHits) {
        endCombo();
        maybeEnrage();
        maybeSuper();
        // the beating staggers him
        if (G.enemyState !== 'windup' && G.enemyState !== 'attack') {
          G.enemyState = 'dazed';
          setOppState('dazed');
          G.timers.push(setTimeout(() => {
            if (G.running && G.enemyState === 'dazed') { G.enemyState = 'idle'; setOppState('idle'); }
          }, 1200));
        }
      } else {
        G.timers.push(setTimeout(jab, CFG.candleHitGap - 90));
      }
    }, 90); // impact mid-jab
  };

  const endCombo = () => {
    G.candling = false;
    stage.classList.remove('candling');
    candleFist.classList.add('hidden');
    candleFist.classList.remove('jabbing');
  };

  jab();
}

/* SUPER POWER — fires once at 20% HP. Block it or die instantly. */
function maybeSuper() {
  if (G.superDone || !G.running || G.enemyHP <= 0 || G.enemyHP > CFG.enemyHP * CFG.superAt) return;
  if (G.enemyState === 'attack') { setTimeout(maybeSuper, 400); return; } // wait out the current swing
  G.superDone = true;

  // cancel everything else he was planning
  G.timers.forEach(clearTimeout);
  G.timers = [];

  G.enemyState = 'windup';
  setOppState('windup');
  stage.classList.add('super-charge');
  popup('⚡ SUPER ATTACK — BLOCK!', 'bad', 50, 30);
  Sound.enrage();
  Sound.warn();

  G.timers.push(setTimeout(() => {
    stage.classList.remove('super-charge');
    if (!G.running) return;
    G.enemyState = 'attack';
    setOppState('attack');
    enemyFist.style.left = '50%';
    enemyFist.classList.remove('hidden', 'flying');
    void enemyFist.offsetWidth;
    enemyFist.classList.add('flying', 'super');
    Sound.whoosh();
    shake();

    G.timers.push(setTimeout(() => {
      enemyFist.classList.add('hidden');
      enemyFist.classList.remove('flying', 'super');
      if (!G.running) return;

      if (G.blocking) {
        addScore(CFG.superBonus);
        Sound.block();
        popup('SURVIVED! +' + CFG.superBonus, 'info', 50, 55);
        sparks(50, 60, '#8fe08f', 14);
        G.enemyState = 'dazed';
        setOppState('dazed');
        G.timers.push(setTimeout(() => {
          if (G.running && G.enemyState === 'dazed') { G.enemyState = 'idle'; setOppState('idle'); }
        }, 2000));
        scheduleAttack();
      } else {
        G.playerHP = 0;
        updateHP();
        flash(700);
        shake();
        popup('FATAL!', 'bad', 50, 48);
        return ko(false);
      }
    }, CFG.attackTime));
  }, CFG.superChargeTime));
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
  if (!G.running || G.enemyState === 'ko' || G.enemyState === 'windup' || G.enemyState === 'attack') return;
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
  // vary the swing: left hook, right hook or straight
  enemyFist.style.left = (38 + Math.random() * 24).toFixed(1) + '%';
  enemyFist.classList.remove('hidden', 'flying', 'super');
  void enemyFist.offsetWidth;
  enemyFist.classList.add('flying');
  Sound.whoosh();

  G.timers.push(setTimeout(() => {
    enemyFist.classList.add('hidden');
    enemyFist.classList.remove('flying');
    if (!G.running) return;

    if (G.blocking) {
      addScore(CFG.pointsBlock);
      addPower(CFG.powerPerBlock);
      Sound.block();
      popup('BLOCKED! +' + CFG.pointsBlock, 'info', 50, 55);
      sparks(50, 62, '#8fe08f', 9);
      // open for punishment after a blocked hit (shorter window when enraged)
      G.enemyState = 'dazed';
      setOppState('dazed');
      G.timers.push(setTimeout(() => {
        if (G.running && G.enemyState === 'dazed') { G.enemyState = 'idle'; setOppState('idle'); }
      }, G.enraged ? CFG.enrageDazedTime : CFG.dazedTime));
      scheduleAttack();
    } else {
      G.playerHP = Math.max(0, G.playerHP - 1);
      addScore(CFG.pointsHurt);
      resetCombo();
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

/* ---------------- Match timer ---------------- */
function startTimer() {
  G.t0 = performance.now();
  clearInterval(timerIv);
  timerIv = setInterval(() => {
    $('timer').textContent = ((performance.now() - G.t0) / 1000).toFixed(1) + 's';
  }, 100);
}
function stopTimer() {
  clearInterval(timerIv);
  G.finalTime = G.t0 ? (performance.now() - G.t0) / 1000 : 0;
}

/* ---------------- Game over ---------------- */
function ko(playerWon) {
  G.running = false;
  G.timers.forEach(clearTimeout);
  G.timers = [];
  stopBlock();
  stopTimer();
  if (stunStars) stunStars.classList.add('hidden');

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
      ? 'Ansem is down! The damn airdrop is finally coming.'
      : 'Ansem keeps the airdrop. Get up and try again!';
    $('endScore').textContent = G.score;
    $('endTime').textContent = G.finalTime.toFixed(1) + 's';
    $('screenEnd').classList.remove('hidden');
    window.dispatchEvent(new CustomEvent('bullfun:end', { detail: { score: G.score, won: playerWon, time: G.finalTime } }));
  }, playerWon ? 1600 : 900);
}

/* ---------------- Game cycle ---------------- */
function resetGame() {
  G.playerHP = CFG.playerHP;
  G.enemyHP = CFG.enemyHP;
  G.score = 0;
  G.blocking = false;
  G.enraged = false;
  G.superDone = false;
  G.power = 0;
  G.candling = false;
  G.combo = 0;
  updatePowerUI();
  updateComboUI();
  if (stunStars) stunStars.classList.add('hidden');
  stage.classList.remove('candling');
  candleFist.classList.add('hidden');
  candleFist.classList.remove('jabbing');
  G.nextFist = 'L';
  G.enemyState = 'idle';
  G.timers.forEach(clearTimeout);
  G.timers = [];
  clearInterval(timerIv);
  $('timer').textContent = '0.0s';
  enemyFist.classList.add('hidden');
  enemyFist.classList.remove('flying', 'super');
  enemyFist.style.left = '50%';
  opponent.classList.remove('enraged');
  stage.classList.remove('super-charge');
  addScore(0);
  updateHP();
  updateAvatar();
  setOppState('idle');
}

function startGame() {
  resetGame();
  G.running = true;
  startTimer();
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
  if (e.code === 'KeyE') activateCandle();
});
powerBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  activateCandle();
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
