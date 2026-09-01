/* ================= 数字人引擎 =================
   全身 SVG 骨骼 + 拼音视位驱动口型 + 肢体动作状态机
   路线A：固定台词由 TTS 发声，逐字视位序列与语音时间轴对齐
   路线B：无语音合成能力时退回节拍驱动，口型与字序仍然一致
================================================= */

const VISEME = {
  X: { w: 26, h: 4.2, r: 0.10, t: 0.00, p: 0.0 },
  M: { w: 23, h: 1.2, r: 0.05, t: 0.00, p: 1.0 },
  F: { w: 24, h: 4.5, r: 0.05, t: 0.85, p: 0.4 },
  A: { w: 28, h: 20.0, r: 0.22, t: 0.55, p: 0.0 },
  E: { w: 27, h: 12.0, r: 0.16, t: 0.50, p: 0.0 },
  I: { w: 33, h: 6.5, r: 0.02, t: 0.80, p: 0.0 },
  O: { w: 19, h: 16.5, r: 0.80, t: 0.20, p: 0.0 },
  U: { w: 13, h: 11.0, r: 1.00, t: 0.05, p: 0.0 },
  V: { w: 15, h: 8.5, r: 0.90, t: 0.15, p: 0.0 },
  N: { w: 25, h: 4.0, r: 0.10, t: 0.10, p: 0.3 }
};

const CHARACTERS = {
  jianhu: {
    name: '陈志远', role: '监护人', sex: 'm',
    skin: '#e3b48f', skinS: '#c9906a', hair: '#241c19',
    suit: '#1d3f6b', suitD: '#152e4f', suitL: '#2a5388',
    helmet: '#f2f4f6', helmetS: '#c9d2da', armband: '#c8352b', armtext: '监护',
    glasses: false, badge: true
  },
  diaodu: {
    name: '林 岚', role: '值班调度员', sex: 'f',
    skin: '#eec5a6', skinS: '#d09d78', hair: '#1b1512',
    suit: '#20496f', suitD: '#173653', suitL: '#2d6396',
    helmet: null, armband: null, headset: true, glasses: false, badge: true
  },
  zhiban: {
    name: '周建国', role: '值班负责人', sex: 'm',
    skin: '#dfae87', skinS: '#c08a62', hair: '#2a2320',
    suit: '#243b52', suitD: '#1a2c3e', suitL: '#33526f',
    helmet: null, armband: '#d08a1e', armtext: '值班', glasses: true, badge: true
  }
};

class DigitalHuman {
  constructor(mountId, charKey) {
    this.el = document.getElementById(mountId);
    this.char = CHARACTERS[charKey] || CHARACTERS.jianhu;
    this.charKey = charKey || 'jianhu';
    this.t = 0;
    this.mouth = Object.assign({}, VISEME.X);
    this.mouthTarget = Object.assign({}, VISEME.X);
    this.blink = 0; this.nextBlink = 1.2 + Math.random() * 2.5;
    this.headYaw = 0; this.headYawT = 0;
    this.headPitch = 0; this.headPitchT = 0;
    this.browT = 0; this.brow = 0;
    this.gaze = 0; this.gazeT = 0;
    this.pose = 'idle'; this.poseT = 0;
    this.armR = { a: 0, b: 0, aT: 0, bT: 0, hand: 0, handT: 0 };
    this.armL = { a: 0, b: 0, aT: 0, bT: 0, hand: 0, handT: 0 };
    this.lean = 0; this.leanT = 0;
    this.seq = null; this.seqStart = 0; this.speaking = false;
    this.onSpeakEnd = null;
    this.render();
    this.setPose('idle');
    this._loop = this._loop.bind(this);
    this.last = performance.now();
    requestAnimationFrame(this._loop);
  }

  /* ---------- 结构 ---------- */
  render() {
    const c = this.char;
    const helmet = c.helmet ? `
      <g id="dh-helmet">
        <path d="M -44 -34 Q -44 -92 0 -92 Q 44 -92 44 -34 L 40 -30 Q 0 -40 -40 -30 Z" fill="${c.helmet}"/>
        <path d="M -44 -34 Q -44 -92 0 -92 Q 20 -92 32 -76 Q -10 -84 -34 -50 Z" fill="#ffffff" opacity=".55"/>
        <path d="M -52 -30 Q 0 -46 52 -30 Q 52 -20 40 -21 Q 0 -33 -40 -21 Q -52 -20 -52 -30 Z" fill="${c.helmetS}"/>
        <rect x="-3" y="-92" width="6" height="60" fill="${c.helmetS}" opacity=".7"/>
        <g transform="translate(0,-70) scale(.62)" opacity=".95">
          <path d="M -20 -6 Q -4 -13 14 -9" stroke="#0b4a97" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <path d="M -20 2 Q -4 -5 14 -1" stroke="#0b4a97" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <path d="M -20 10 Q -4 3 14 7" stroke="#0b4a97" stroke-width="4.5" fill="none" stroke-linecap="round"/>
          <rect x="10" y="-18" width="6" height="34" fill="#0b4a97"/>
        </g>
        <path d="M -44 -22 Q -47 8 -33 28 Q -19 40 -2 41" stroke="${c.helmetS}" stroke-width="2.2" fill="none" opacity=".7"/>
        <path d="M 44 -22 Q 47 8 33 28 Q 19 40 2 41" stroke="${c.helmetS}" stroke-width="2.2" fill="none" opacity=".7"/>
        <ellipse cx="0" cy="41" rx="3.4" ry="2.2" fill="${c.helmetS}" opacity=".8"/>
      </g>` : '';

    const hair = c.helmet ? `
      <path d="M -42 -36 Q -40 -74 0 -76 Q 40 -74 42 -36 Q 30 -52 0 -50 Q -30 -52 -42 -36 Z" fill="${c.hair}"/>` :
      (c.sex === 'f' ? `
      <path d="M -46 -20 Q -50 -86 0 -88 Q 50 -86 46 -20 Q 40 -34 34 -46 Q 16 -34 -6 -40 Q -26 -46 -34 -34 Q -42 -28 -46 -20 Z" fill="${c.hair}"/>
      <path d="M -46 -22 Q -54 22 -44 44 L -32 40 Q -40 14 -36 -14 Z" fill="${c.hair}"/>
      <path d="M 46 -22 Q 54 22 44 44 L 32 40 Q 40 14 36 -14 Z" fill="${c.hair}"/>` : `
      <path d="M -43 -26 Q -46 -80 0 -82 Q 46 -80 43 -26 Q 34 -50 0 -48 Q -34 -50 -43 -26 Z" fill="${c.hair}"/>`);

    const glasses = c.glasses ? `
      <g opacity=".92" fill="none" stroke="#2b3540" stroke-width="2.6">
        <rect x="-32" y="-16" width="26" height="20" rx="6"/>
        <rect x="6" y="-16" width="26" height="20" rx="6"/>
        <path d="M -6 -8 L 6 -8"/><path d="M -32 -10 L -42 -6"/><path d="M 32 -10 L 42 -6"/>
      </g>` : '';

    const headset = c.headset ? `
      <g>
        <path d="M -44 -30 Q 0 -62 44 -30" stroke="#2b3540" stroke-width="6" fill="none"/>
        <rect x="-54" y="-30" width="16" height="26" rx="7" fill="#2b3540"/>
        <rect x="38" y="-30" width="16" height="26" rx="7" fill="#2b3540"/>
        <path d="M -46 -4 Q -40 30 -16 34" stroke="#2b3540" stroke-width="3.4" fill="none"/>
        <circle cx="-14" cy="35" r="4.4" fill="#2b3540"/>
      </g>` : '';

    const armband = c.armband ? `
      <g id="dh-armband">
        <path d="M -14 -6 L 14 -8 L 15 12 L -13 14 Z" fill="${c.armband}"/>
        <text x="1" y="6" font-size="11" fill="#fff" text-anchor="middle" font-weight="700" font-family="'Microsoft YaHei',sans-serif">${c.armtext}</text>
      </g>` : '';

    this.el.innerHTML = `
<svg id="dh-svg" viewBox="88 122 244 400" preserveAspectRatio="xMidYMax meet">
  <defs>
    <linearGradient id="gSuit" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c.suitL}"/><stop offset="100%" stop-color="${c.suitD}"/>
    </linearGradient>
    <radialGradient id="gFace" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="${c.skin}"/><stop offset="100%" stop-color="${c.skinS}"/>
    </radialGradient>
    <radialGradient id="gSpot" cx="50%" cy="100%" r="60%">
      <stop offset="0%" stop-color="#8ecbff" stop-opacity=".30"/>
      <stop offset="100%" stop-color="#8ecbff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clipMouth"><rect x="-24" y="16" width="48" height="34"/></clipPath>
  </defs>

  <ellipse cx="210" cy="590" rx="118" ry="20" fill="url(#gSpot)"/>
  <ellipse cx="210" cy="592" rx="74" ry="11" fill="#000" opacity=".38"/>

  <g id="dh-root" transform="translate(210,600)">
    <g id="dh-lean">
      <!-- 腿 -->
      <path d="M -34 -170 L -40 -14 L -14 -14 L -10 -170 Z" fill="${c.suitD}"/>
      <path d="M 34 -170 L 40 -14 L 14 -14 L 10 -170 Z" fill="${c.suitD}"/>
      <path d="M -44 -16 Q -44 -4 -30 -3 L -8 -3 Q -6 -14 -12 -16 Z" fill="#151b22"/>
      <path d="M 44 -16 Q 44 -4 30 -3 L 8 -3 Q 6 -14 12 -16 Z" fill="#151b22"/>

      <!-- 躯干 -->
      <g id="dh-torso">
        <path d="M -57 -332 Q 0 -348 57 -332 L 66 -186 Q 0 -172 -66 -186 Z" fill="url(#gSuit)"/>
        <path d="M -57 -332 Q -28 -342 -8 -340 L -6 -186 L -66 -186 Z" fill="#ffffff" opacity=".05"/>
        <path d="M -66 -186 Q 0 -172 66 -186 L 66 -178 Q 0 -164 -66 -178 Z" fill="${c.suitD}"/>
        <!-- 反光条 -->
        <path d="M -63 -226 Q 0 -212 63 -226 L 63 -217 Q 0 -203 -63 -217 Z" fill="#d8e64a" opacity=".85"/>
        <path d="M -61 -240 Q 0 -226 61 -240 L 61 -234 Q 0 -220 -61 -234 Z" fill="#cfd9de" opacity=".55"/>
        <!-- 门襟 -->
        <path d="M 0 -340 L 0 -178" stroke="${c.suitD}" stroke-width="3"/>
        <!-- 领 -->
        <path d="M -24 -342 L 0 -314 L 24 -342 L 37 -333 L 0 -300 L -37 -333 Z" fill="${c.suitL}"/>
        <path d="M -24 -342 L 0 -314 L -6 -308 L -37 -333 Z" fill="${c.suitD}" opacity=".6"/>
        ${c.badge ? `<g transform="translate(-32,-288)">
          <rect x="-15" y="-10" width="30" height="20" rx="3" fill="#f3f6f9"/>
          <rect x="-15" y="-10" width="30" height="6" rx="3" fill="#0b4a97"/>
          <rect x="-11" y="0" width="22" height="2.2" fill="#8fa3b5"/>
          <rect x="-11" y="4.5" width="15" height="2.2" fill="#8fa3b5"/>
        </g>` : ''}
      </g>

      <!-- 左臂（画面右侧） -->
      <g id="dh-armL" transform="translate(58,-326)">
        <g id="dh-armL-a">
          <circle cx="0" cy="2" r="17" fill="url(#gSuit)"/>
          <path d="M -15 0 L 15 0 L 13.5 74 L -13.5 74 Z" fill="url(#gSuit)"/>
          <path d="M -15 0 L -3 0 L -4 74 L -13.5 74 Z" fill="#ffffff" opacity=".05"/>
          <g transform="translate(0,32)">${armband}</g>
          <g id="dh-armL-b" transform="translate(0,74)">
            <circle cx="0" cy="0" r="13.5" fill="url(#gSuit)"/>
            <path d="M -13 0 L 13 0 L 11 58 L -11 58 Z" fill="url(#gSuit)"/>
            <path d="M -11.4 52 L 11.4 52 L 11 60 L -11 60 Z" fill="${c.suitL}"/>
            <g id="dh-handL" transform="translate(0,66)">
              <path id="dh-handL-p" d="" fill="${c.skin}"/>
            </g>
          </g>
        </g>
      </g>

      <!-- 右臂（画面左侧） -->
      <g id="dh-armR" transform="translate(-58,-326)">
        <g id="dh-armR-a">
          <circle cx="0" cy="2" r="17" fill="url(#gSuit)"/>
          <path d="M -15 0 L 15 0 L 13.5 74 L -13.5 74 Z" fill="url(#gSuit)"/>
          <path d="M 3 0 L 15 0 L 13.5 74 L 4 74 Z" fill="#000" opacity=".07"/>
          <g id="dh-armR-b" transform="translate(0,74)">
            <circle cx="0" cy="0" r="13.5" fill="url(#gSuit)"/>
            <path d="M -13 0 L 13 0 L 11 58 L -11 58 Z" fill="url(#gSuit)"/>
            <path d="M -11.4 52 L 11.4 52 L 11 60 L -11 60 Z" fill="${c.suitL}"/>
            <g id="dh-handR" transform="translate(0,66)">
              <path id="dh-handR-p" d="" fill="${c.skin}"/>
            </g>
          </g>
        </g>
      </g>

      <!-- 颈 -->
      <path d="M -16 -364 L 16 -364 L 18 -324 Q 0 -314 -18 -324 Z" fill="${c.skinS}"/>
      <path d="M -16 -364 L 16 -364 L 17 -344 Q 0 -336 -17 -344 Z" fill="#000" opacity=".18"/>

      <!-- 头 -->
      <g id="dh-head" transform="translate(0,-386) scale(.86)">
        <g id="dh-headin">
          <ellipse cx="-45" cy="0" rx="7" ry="12" fill="${c.skinS}"/>
          <ellipse cx="45" cy="0" rx="7" ry="12" fill="${c.skinS}"/>
          <path d="M -42 -22 Q -43 22 -26 38 Q -13 47 0 47 Q 13 47 26 38 Q 43 22 42 -22 Q 42 -62 0 -62 Q -42 -62 -42 -22 Z" fill="url(#gFace)"/>
          <path d="M -42 -22 Q -43 22 -26 38 Q -13 47 0 47 L 0 -62 Q -42 -62 -42 -22 Z" fill="#fff" opacity=".05"/>
          <ellipse cx="0" cy="40" rx="13" ry="5" fill="${c.skinS}" opacity=".35"/>
          ${hair}
          ${helmet}
          <!-- 眉 -->
          <g id="dh-brows">
            <path id="dh-browL" d="M -35 -21 Q -24 -28.5 -11 -22" stroke="${c.hair}" stroke-width="4.2" fill="none" stroke-linecap="round"/>
            <path id="dh-browR" d="M 11 -22 Q 24 -28.5 35 -21" stroke="${c.hair}" stroke-width="4.2" fill="none" stroke-linecap="round"/>
          </g>
          <!-- 眼 -->
          <g id="dh-eyes">
            <ellipse cx="-23" cy="-4" rx="11.6" ry="7.4" fill="#fbfcfd"/>
            <ellipse cx="23" cy="-4" rx="11.6" ry="7.4" fill="#fbfcfd"/>
            <ellipse cx="-23" cy="-6.6" rx="11.6" ry="4" fill="#c89a78" opacity=".22"/>
            <ellipse cx="23" cy="-6.6" rx="11.6" ry="4" fill="#c89a78" opacity=".22"/>
            <g id="dh-pupils">
              <circle cx="-23" cy="-4" r="5.4" fill="#3a2b1f"/>
              <circle cx="23" cy="-4" r="5.4" fill="#3a2b1f"/>
              <circle cx="-23" cy="-4" r="2.4" fill="#150e08"/>
              <circle cx="23" cy="-4" r="2.4" fill="#150e08"/>
              <circle cx="-21.2" cy="-6.2" r="1.7" fill="#fff"/>
              <circle cx="24.8" cy="-6.2" r="1.7" fill="#fff"/>
            </g>
            <path id="dh-lidL" d="M -35 -4 L -11 -4 L -11 -19 L -35 -19 Z" fill="${c.skin}"/>
            <path id="dh-lidR" d="M 11 -4 L 35 -4 L 35 -19 L 11 -19 Z" fill="${c.skin}"/>
            <path d="M -34.6 -6 Q -23 -14.4 -11.4 -6" stroke="#4a3324" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M 11.4 -6 Q 23 -14.4 34.6 -6" stroke="#4a3324" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M -33 3.4 Q -23 7 -13 3.4" stroke="${c.skinS}" stroke-width="1.3" fill="none" opacity=".7"/>
            <path d="M 13 3.4 Q 23 7 33 3.4" stroke="${c.skinS}" stroke-width="1.3" fill="none" opacity=".7"/>
          </g>
          ${glasses}
          <!-- 鼻 -->
          <path d="M 1 -2 Q 6 10 0 14 Q -6 14 -7 11" stroke="${c.skinS}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          <ellipse cx="0" cy="9" rx="7.5" ry="4.4" fill="${c.skinS}" opacity=".28"/>
          <circle cx="-4.6" cy="12.4" r="1.3" fill="${c.skinS}" opacity=".55"/>
          <circle cx="4.6" cy="12.4" r="1.3" fill="${c.skinS}" opacity=".55"/>
          <!-- 嘴 -->
          <g id="dh-mouth" transform="translate(0,27)">
            <ellipse cx="0" cy="1" rx="19" ry="9" fill="${c.skinS}" opacity=".16"/>
            <path id="dh-lip" d="" fill="#9d4747"/>
            <path id="dh-inner" d="" fill="#4a1516"/>
            <path id="dh-teeth" d="" fill="#f6f2ea"/>
            <path id="dh-lipline" d="" stroke="#6f2828" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          </g>
          <path d="M -30 30 Q 0 40 30 30" stroke="${c.skinS}" stroke-width="0" fill="none"/>
          ${headset}
        </g>
      </g>
    </g>
  </g>
</svg>`;
    const g = id => this.el.querySelector('#' + id);
    this.n = {
      root: g('dh-root'), lean: g('dh-lean'), torso: g('dh-torso'), head: g('dh-head'),
      headin: g('dh-headin'), pupils: g('dh-pupils'), lidL: g('dh-lidL'), lidR: g('dh-lidR'),
      browL: g('dh-browL'), browR: g('dh-browR'),
      lip: g('dh-lip'), inner: g('dh-inner'), teeth: g('dh-teeth'), lipline: g('dh-lipline'),
      armLa: g('dh-armL-a'), armLb: g('dh-armL-b'), handL: g('dh-handL'), handLp: g('dh-handL-p'),
      armRa: g('dh-armR-a'), armRb: g('dh-armR-b'), handR: g('dh-handR'), handRp: g('dh-handR-p')
    };
  }

  /* ---------- 姿态 ---------- */
  setPose(p, dir) {
    this.pose = p; this.poseT = 0;
    const R = this.armR, L = this.armL;
    const set = (ra, rb, rh, la, lb, lh) => {
      R.aT = ra; R.bT = rb; R.handT = rh; L.aT = la; L.bT = lb; L.handT = lh;
    };
    switch (p) {
      case 'idle':                                  // 站姿待命，双手自然下垂
        set(7, 5, 0, -7, -5, 0);
        this.leanT = 0; this.headPitchT = 0; this.browT = 0; break;
      case 'call':                                  // 唱票：右手抬至胸前，食指指向票面
        set(-32, -54, 1, -9, -7, 0);
        this.leanT = 1.5; this.browT = -2; this.headPitchT = 0; break;
      case 'confirm':                               // 对，执行：掌心前推确认
        set(-24, -72, 2, -9, -7, 0);
        this.leanT = 2; this.browT = 0; this.headPitchT = 0; break;
      case 'point':                                 // 指向设备面板
        set(-56, -18, 1, -8, -6, 0);
        this.leanT = 3; this.headYawT = -7; this.browT = -1; break;
      case 'explain':                               // 讲解：双手外摊
        set(27, -44, 2, -27, 44, 2);
        this.leanT = 0; this.browT = -3; this.headPitchT = 0; break;
      case 'stop':                                  // 制止：左手掌抬起前推 + 前倾
        set(-14, -22, 0, 42, 74, 2);
        this.leanT = 5; this.browT = -6; this.headPitchT = -3; break;
      case 'correct':                               // 纠错：右手食指轻摆
        set(-42, -60, 1, -9, -7, 0);
        this.leanT = 1; this.browT = -4; this.headPitchT = 0; break;
      case 'listen':                                // 倾听
        set(9, 7, 0, -9, -7, 0);
        this.leanT = -1; this.headPitchT = 2; this.browT = 1; break;
      case 'nod': this.headPitchT = 7; break;
    }
    if (p !== 'nod' && p !== 'point') this.headYawT = 0;
  }

  nod(times) {
    this._nod = { n: times || 1, t: 0 };
  }
  shake() { this._shake = { t: 0 }; }

  /* ---------- 说话 ---------- */
  buildSeq(text) {
    const seq = [];
    for (const ch of text) {
      if (ch >= '\u4e00' && ch <= '\u9fff') {
        const v = (typeof CH2V !== 'undefined' && CH2V[ch]) || '-E';
        seq.push({ o: v[0], n: v[1], ch });
      } else if (/[0-9]/.test(ch)) {
        seq.push({ o: '-', n: 'E', ch });
      } else if (/[a-zA-Z]/.test(ch)) {
        seq.push({ o: '-', n: 'I', ch });
      } else if (/[，。、；：？！,.;:?!（）()"'"']/.test(ch)) {
        seq.push({ o: 'X', n: 'X', ch, pause: true });
      }
    }
    return seq;
  }

  speak(text, opt) {
    opt = opt || {};
    this.stopSpeak(true);
    this.seq = this.buildSeq(text);
    this.speaking = true;
    this.perChar = (opt.rate || 0.115) * (window.__DH_SPEED || 1);
    this.seqStart = performance.now() / 1000;
    this.onSpeakEnd = opt.onEnd || null;
    this.ttsProgress = -1;
    if (opt.pose) this.setPose(opt.pose);
    // 内置渲染不播语音：口型与节奏按逐字时钟推进，声音由 HeyGen 预渲染片段承担
    return this;
  }

  finishSpeak() {
    this.speaking = false; this.seq = null; this.curV = 'X'; this.curCh = '';
    this.mouthTarget = Object.assign({}, VISEME.X);
    const cb = this.onSpeakEnd; this.onSpeakEnd = null;
    if (cb) cb();
  }

  stopSpeak(silent) {
    this.speaking = false; this.seq = null;
    this.mouthTarget = Object.assign({}, VISEME.X);
    if (!silent) { this.onSpeakEnd = null; }
  }

  /* ---------- 主循环 ---------- */
  _loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now; this.t += dt;
    const T = this.t;

    // 口型
    if (this.speaking && this.seq) {
      const el = performance.now() / 1000 - this.seqStart;
      let idx;
      if (this.ttsProgress >= 0) idx = Math.min(this.seq.length - 1, this.ttsProgress);
      else idx = Math.floor(el / this.perChar);
      if (idx >= this.seq.length) { this.finishSpeak(); }
      else {
        const frac = (el / this.perChar) % 1;
        const s = this.seq[idx];
        const key = (s.o !== '-' && frac < 0.34) ? s.o : s.n;
        const v = VISEME[key] || VISEME.E;
        const amp = s.pause ? 0.1 : (0.82 + 0.18 * Math.sin(T * 21));
        this.mouthTarget = { w: v.w, h: v.h * amp, r: v.r, t: v.t, p: v.p };
        this.curV = key; this.curCh = s.ch;
      }
    }
    for (const k in this.mouth) {
      this.mouth[k] += (this.mouthTarget[k] - this.mouth[k]) * Math.min(1, dt * 26);
    }
    this.drawMouth();

    // 呼吸
    const br = Math.sin(T * 1.35) * 1.6;
    this.n.root.setAttribute('transform', `translate(210,${600 + br * 0.35})`);
    this.n.torso.setAttribute('transform', `translate(0,${br * 0.5}) scale(${1 + br * 0.0016},1)`);

    // 眨眼
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blink = 1; this.nextBlink = 1.6 + Math.random() * 3.4; }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - dt * 7.5);
    const bl = Math.sin(this.blink * Math.PI);
    const lidY = -7 + bl * 15.4;
    this.n.lidL.setAttribute('transform', `translate(0,${lidY})`);
    this.n.lidR.setAttribute('transform', `translate(0,${lidY})`);

    // 眼神游移
    if (Math.random() < dt * 0.35) this.gazeT = (Math.random() - 0.5) * 4;
    this.gaze += (this.gazeT - this.gaze) * dt * 5;
    this.n.pupils.setAttribute('transform', `translate(${this.gaze},${Math.sin(T * .7) * .6})`);

    // 眉
    this.brow += (this.browT - this.brow) * dt * 6;
    this.n.browL.setAttribute('transform', `translate(0,${this.brow})`);
    this.n.browR.setAttribute('transform', `translate(0,${this.brow})`);

    // 头
    if (this._nod) {
      this._nod.t += dt * 5.5;
      const k = this._nod.t;
      this.headPitch = Math.sin(k * Math.PI) * 9;
      if (k >= 1) { this._nod.n--; this._nod.t = 0; if (this._nod.n <= 0) { this._nod = null; this.headPitch = 0; } }
    } else if (this._shake) {
      this._shake.t += dt * 3.4;
      this.headYaw = Math.sin(this._shake.t * Math.PI * 3) * 11;
      if (this._shake.t >= 1) { this._shake = null; this.headYaw = 0; }
    } else {
      this.headYaw += (this.headYawT + Math.sin(T * 0.53) * 2.2 - this.headYaw) * dt * 4;
      this.headPitch += (this.headPitchT + Math.sin(T * 0.41) * 1.1 - this.headPitch) * dt * 4;
    }
    this.n.headin.setAttribute('transform',
      `rotate(${this.headYaw * .32}) skewX(${this.headYaw * .12}) translate(${this.headYaw * .55},${this.headPitch * .28}) scale(${1 - Math.abs(this.headYaw) * .0018},1)`);
    this.n.head.setAttribute('transform', `translate(0,${-386 + br * .5}) scale(.86) rotate(${this.headYaw * .16})`);

    // 身体前倾
    this.lean += (this.leanT - this.lean) * dt * 4;
    this.n.lean.setAttribute('transform', `rotate(${-this.lean * .18},0,-180) translate(${this.lean * .5},0)`);

    // 手臂
    this.poseT += dt;
    const sway = Math.sin(T * 1.1) * 1.2;
    const gest = this.speaking ? Math.sin(T * 4.6) * 4 : 0;
    for (const [arm, na, nb, nh, np, sgn] of [
      [this.armR, this.n.armRa, this.n.armRb, this.n.handR, this.n.handRp, 1],
      [this.armL, this.n.armLa, this.n.armLb, this.n.handL, this.n.handLp, -1]]) {
      arm.a += (arm.aT - arm.a) * dt * 5.2;
      arm.b += (arm.bT - arm.b) * dt * 5.2;
      arm.hand += (arm.handT - arm.hand) * dt * 7;
      const ga = (this.pose === 'call' || this.pose === 'explain' || this.pose === 'confirm') ? gest : 0;
      na.setAttribute('transform', `rotate(${arm.a + sway * sgn * .5 + ga * sgn})`);
      nb.setAttribute('transform', `translate(0,74) rotate(${arm.b + ga * .6 * sgn})`);
      np.setAttribute('d', this.handPath(arm.hand, sgn));
    }
    requestAnimationFrame(this._loop);
  }

  handPath(k, sgn) {
    // 腕关节在 (0,0)，手指沿 +y（前臂延长线）方向
    const s = sgn;
    if (k < 0.5) {
      // 自然握拳
      return `M -11 -7 Q -14 6 -7 16 Q 2 22 10 15 Q 14 3 11 -7 Z
              M ${-11 * s} -1 Q ${-17 * s} 5 ${-13 * s} 11 Q ${-9 * s} 13 ${-7 * s} 8 Z
              M -7 3 L 8 2 M -6 8 L 7 7`;
    }
    if (k < 1.5) {
      // 食指指点
      return `M -10 -7 Q -13 5 -7 14 Q 1 20 9 13 Q 13 2 10 -7 Z
              M ${-10 * s} -2 Q ${-16 * s} 4 ${-12 * s} 10 Q ${-8 * s} 12 ${-6 * s} 7 Z
              M -3.6 8 L -3.6 32 Q 0 36.5 3.6 32 L 3.6 8 Z`;
    }
    // 张开掌心
    return `M -13 -8 Q -16 8 -8 20 Q 2 26 12 18 Q 16 4 13 -8 Z
            M ${-13 * s} -3 Q ${-21 * s} 4 ${-16 * s} 12 Q ${-11 * s} 15 ${-8 * s} 9 Z
            M -9 16 Q -10.5 24 -7.5 27 Q -4.5 28 -4 24 L -3.5 17 Z
            M -1.5 18 Q -2.5 27 0.5 30 Q 3.5 30.5 4 26 L 4 18 Z
            M 6 16 Q 5.5 24 8 26.5 Q 10.5 27 11 23 L 11 15 Z`;
  }

  drawMouth() {
    const m = this.mouth, hw = m.w / 2, hh = m.h / 2;
    const cx = 0, cy = 0;
    const rx = hw * (1 - m.r * 0.42);
    const top = cy - hh, bot = cy + hh;
    const outer = `M ${-rx - 3} ${cy} Q ${cx} ${top - 3.2} ${rx + 3} ${cy} Q ${cx} ${bot + 3.6} ${-rx - 3} ${cy} Z`;
    const inner = `M ${-rx} ${cy} Q ${cx} ${top} ${rx} ${cy} Q ${cx} ${bot} ${-rx} ${cy} Z`;
    this.n.lip.setAttribute('d', outer);
    this.n.inner.setAttribute('d', m.h > 3 ? inner : '');
    if (m.t > 0.05 && m.h > 4) {
      const th = Math.min(4.2, m.h * 0.3) * m.t;
      this.n.teeth.setAttribute('d',
        `M ${-rx * .88} ${top + 1.2} Q ${cx} ${top - 0.4} ${rx * .88} ${top + 1.2} L ${rx * .8} ${top + 1.2 + th} Q ${cx} ${top + th + 2.4} ${-rx * .8} ${top + 1.2 + th} Z`);
    } else this.n.teeth.setAttribute('d', '');
    this.n.lipline.setAttribute('d', `M ${-rx - 3} ${cy} Q ${cx} ${cy - Math.max(1.2, hh * .5)} ${rx + 3} ${cy}`);
  }
}
