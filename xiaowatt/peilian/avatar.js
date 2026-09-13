/* ================= 数字人引擎（形象版） =================
   以教练形象图为本体的数字人：呼吸 / 说话节奏 / 视线跟随 / 点头摇头 / 姿态前倾 / 光环与声波
   说话由逐字时钟驱动（口型幅度 VISEME → 面部微动与声波）；声音：HeyGen 预渲染片段优先，
   无片段时用浏览器合成语音朗读（9/13 用户口径：教练在侧就要能开口说话），口型跟随朗读进度（onboundary）
   对外接口保持不变：speak / setPose / nod / shake / stopSpeak / speaking / mouth / curV / curCh / pose
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

/* 三个角色对应的教练形象（assets/coaches/<img>.jpg，_hd 为 512px 版本） */
const CHARACTERS = {
  jianhu: { name: '陈志远', role: '监护人', sex: 'm', img: 'daozha', tint: '#0e8f5a' },
  diaodu: { name: '林 岚', role: '值班调度员', sex: 'f', img: 'term', tint: '#1f7fb3' },
  zhiban: { name: '周建国', role: '值班负责人', sex: 'm', img: 'angui', tint: '#a8821b' }
};
const POSE_LABEL = { idle: '待命', call: '唱票', confirm: '发令', point: '指向设备', explain: '讲解', stop: '制止', correct: '纠错', listen: '倾听', nod: '确认' };

function coachImg(key, hd) {
  const M = (typeof COACH_IMGS !== 'undefined' && COACH_IMGS) || {};
  return (hd && M[key + '_hd']) || M[key] || '';
}

/* ---------- 朗读语音：浏览器合成语音（讲师演示台可开关，本机记忆；静音 / 提速测试时不出声） ---------- */
const TTS = {
  on: (() => { try { return localStorage.getItem('xwt_voice') !== 'off'; } catch (e) { return true; } })(),
  voices: [],
  load() { try { this.voices = speechSynthesis.getVoices() || []; } catch (e) { this.voices = []; } return this.voices; },
  zh() { const vs = this.voices.length ? this.voices : this.load(); return vs.filter(v => /zh|cmn|Chinese|中文|普通话/i.test(v.lang + ' ' + v.name)); },
  ok() { return this.on && !window.__DH_MUTE && (window.__DH_SPEED || 1) >= 1 && ('speechSynthesis' in window) && this.zh().length > 0; },
  pick(sex) {
    const zh = this.zh(); if (!zh.length) return null;
    const cn = zh.filter(v => /zh[-_]CN|cmn[-_]Hans|zh$|中国|普通话/i.test(v.lang + ' ' + v.name));
    const pool = cn.length ? cn : zh;
    const pref = sex === 'f' ? /Female|女|Xiaoxiao|Huihui|Yaoyao|Xiaoyi|Tingting|Ting-Ting|Meijia/i : /Male|男|Yunxi|Kangkang|Yunyang|Yunjian|Yunxia/i;
    return pool.find(v => pref.test(v.name)) || pool.find(v => /Microsoft|Google|Apple|Ting|Mei/i.test(v.name)) || pool[0];
  },
  set(v) { this.on = !!v; try { localStorage.setItem('xwt_voice', v ? 'on' : 'off'); } catch (e) { } if (!v) this.cancel(); voiceLabel(); },
  cancel() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { } }
};
if ('speechSynthesis' in window) { TTS.load(); try { speechSynthesis.onvoiceschanged = () => TTS.load(); } catch (e) { } }
function voiceToggle() { TTS.set(!TTS.on); }
function voiceLabel() { document.querySelectorAll('[data-voicelbl]').forEach(n => n.textContent = TTS.on ? '开' : '关'); }

class DigitalHuman {
  constructor(mountId, charKey) {
    this.el = document.getElementById(mountId);
    this.char = (charKey && typeof charKey === 'object') ? charKey : (CHARACTERS[charKey] || CHARACTERS.jianhu);
    this.charKey = typeof charKey === 'string' ? charKey : 'custom';
    this.t = 0;
    this.mouth = Object.assign({}, VISEME.X);
    this.mouthTarget = Object.assign({}, VISEME.X);
    this.headYaw = 0; this.headYawT = 0;
    this.headPitch = 0; this.headPitchT = 0;
    this.gazeYaw = 0; this.gazePitch = 0;
    this.pose = 'idle'; this.poseT = 0;
    this.lean = 0; this.leanT = 0;
    this.energy = 0;                      // 说话能量（平滑后的口型幅度）
    this.seq = null; this.seqStart = 0; this.speaking = false; this.progress = 0;
    this.onSpeakEnd = null;
    this.render();
    this.setPose('idle');
    this._loop = this._loop.bind(this);
    this.last = performance.now();
    this._bindGaze();
    requestAnimationFrame(this._loop);
  }

  /* ---------- 结构：形象卡 + 光环 + 声波 + 状态签 ---------- */
  render() {
    const c = this.char;
    const src = coachImg(c.img, true);
    const fallback = `<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" fill="#e9efe6"/><text x="50" y="60" text-anchor="middle" font-size="34" fill="#0e8f5a" font-family="sans-serif">${c.name.slice(0, 1)}</text></svg>`;
    this.el.innerHTML = `
<div class="pav" id="pav" data-pose="idle" style="--tint:${c.tint}">
  <div class="pav-halo"></div>
  <div class="pav-glow"></div>
  <div class="pav-card" id="pav-card">
    ${src ? `<img class="pav-img" id="pav-img" src="${src}" alt="${c.name}" draggable="false">` : `<div class="pav-img">${fallback}</div>`}
    <div class="pav-shade"></div>
    <div class="pav-sheen"></div>
  </div>
  <div class="pav-wave" id="pav-wave">${'<i></i>'.repeat(9)}</div>
  <div class="pav-state" id="pav-state"><em></em><span>待命</span></div>
</div>`;
    const g = id => this.el.querySelector('#' + id);
    this.n = { pav: g('pav'), card: g('pav-card'), img: g('pav-img'), wave: g('pav-wave'), waves: Array.from(this.el.querySelectorAll('#pav-wave i')), state: g('pav-state') };
    this.n.pav.dataset.pose = this.pose;
    this._paintState();
  }

  _bindGaze() {
    if (DigitalHuman._gazeBound) return;
    DigitalHuman._gazeBound = true;
    document.addEventListener('pointermove', e => {
      const dh = window.DH; if (!dh || !dh.n || !dh.n.card) return;
      const r = dh.n.card.getBoundingClientRect(); if (!r.width) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(200, innerWidth * .5);
      const dy = (e.clientY - (r.top + r.height * .4)) / Math.max(200, innerHeight * .5);
      dh.gazeYaw = Math.max(-1, Math.min(1, dx)) * 6;
      dh.gazePitch = Math.max(-1, Math.min(1, dy)) * 3;
    }, { passive: true });
  }

  _paintState() {
    const s = this.n && this.n.state; if (!s) return;
    const label = this.speaking ? '正在说话' : (POSE_LABEL[this.pose] || this.pose);
    if (s.__t !== label) { s.__t = label; s.querySelector('span').textContent = label; }
    s.classList.toggle('talk', !!this.speaking);
  }

  /* ---------- 姿态：映射为整体身姿（前倾 / 转头 / 抬头 / 光环语义色） ---------- */
  setPose(p, dir) {
    this.pose = p; this.poseT = 0;
    switch (p) {
      case 'idle':    this.leanT = 0;  this.headYawT = 0;  this.headPitchT = 0; break;
      case 'call':    this.leanT = 1.5; this.headYawT = 0;  this.headPitchT = -1; break;   // 唱票：略前倾
      case 'confirm': this.leanT = 2;  this.headYawT = 0;  this.headPitchT = 1; break;    // 发令：微微点头
      case 'point':   this.leanT = 2.5; this.headYawT = -8; this.headPitchT = 0; break;    // 指向作业面板（右侧）
      case 'explain': this.leanT = 0.5; this.headYawT = 3;  this.headPitchT = -1; break;   // 讲解：轻缓摆动
      case 'stop':    this.leanT = 5;  this.headYawT = 0;  this.headPitchT = -3; break;   // 制止：前倾逼近
      case 'correct': this.leanT = 1;  this.headYawT = -3; this.headPitchT = 1; break;    // 纠错
      case 'listen':  this.leanT = -1; this.headYawT = 4;  this.headPitchT = 2; break;    // 倾听：侧头
      case 'nod':     this.headPitchT = 6; break;
    }
    if (this.n && this.n.pav) { this.n.pav.dataset.pose = p; this._paintState(); }
  }

  destroy() { this.dead = true; this.speaking = false; this.seq = null; if (this.tts) { this.tts = null; TTS.cancel(); } }
  nod(times) { this._nod = { n: times || 1, t: 0 }; }
  shake() { this._shake = { t: 0 }; }

  /* ---------- 说话：逐字序列（口型幅度驱动面部微动与声波） ---------- */
  buildSeq(text) {
    const seq = [];
    for (let ti = 0; ti < text.length; ti++) {
      const ch = text[ti];
      if (ch >= '\u4e00' && ch <= '\u9fff') {
        const v = (typeof CH2V !== 'undefined' && CH2V[ch]) || '-E';
        seq.push({ o: v[0], n: v[1], ch, ti });
      } else if (/[0-9]/.test(ch)) {
        seq.push({ o: '-', n: 'E', ch, ti });
      } else if (/[a-zA-Z]/.test(ch)) {
        seq.push({ o: '-', n: 'I', ch, ti });
      } else if (/[，。、；：？！,.;:?!（）()"'"']/.test(ch)) {
        seq.push({ o: 'X', n: 'X', ch, ti, pause: true });
      }
    }
    return seq;
  }

  speak(text, opt) {
    opt = opt || {};
    this.stopSpeak(true);
    this.seq = this.buildSeq(text);
    this.speaking = true; this.progress = 0;
    this.perChar = (opt.rate || 0.115) * (window.__DH_SPEED || 1);
    this.seqStart = performance.now() / 1000;
    this.onSpeakEnd = opt.onEnd || null;
    this.ttsProgress = -1;
    if (opt.pose) this.setPose(opt.pose);
    this._paintState();
    if (!this.seq.length) { this.finishSpeak(); return this; }
    this._tts(text);
    return this;
  }

  /* 朗读：合成语音开口，口型按朗读进度（onboundary）走；合成失败或无中文语音时退回逐字时钟，字幕与口型照常 */
  _tts(text) {
    this.tts = null;
    if (!TTS.ok()) return;
    try {
      TTS.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = TTS.pick(this.char.sex);
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'zh-CN';
      u.rate = 1.0; u.pitch = this.char.sex === 'f' ? 1.12 : 0.92; u.volume = 1;
      const seq = this.seq, me = this;
      u.onstart = () => { if (me.tts === u) { me.seqStart = performance.now() / 1000; } };
      u.onboundary = e => {
        if (me.tts !== u || !me.seq) return;
        let k = 0; for (let i = 0; i < seq.length; i++) { if (seq[i].ti <= e.charIndex) k = i; else break; }
        me.ttsProgress = k; me.ttsBoundary = true;
      };
      u.onend = () => { if (me.tts === u) { me.tts = null; me.finishSpeak(); } };
      u.onerror = () => { if (me.tts === u) { me.tts = null; me.ttsProgress = -1; me.ttsBoundary = false; me.seqStart = performance.now() / 1000; } };
      this.tts = u; this.ttsBoundary = false;
      speechSynthesis.speak(u);
    } catch (e) { this.tts = null; }
  }

  finishSpeak() {
    this.speaking = false; this.seq = null; this.curV = 'X'; this.curCh = ''; this.progress = 1;
    this.mouthTarget = Object.assign({}, VISEME.X);
    this._paintState();
    const cb = this.onSpeakEnd; this.onSpeakEnd = null;
    if (cb) cb();
  }

  stopSpeak(silent) {
    if (this.tts) { this.tts = null; TTS.cancel(); }
    this.speaking = false; this.seq = null;
    this.mouthTarget = Object.assign({}, VISEME.X);
    if (!silent) { this.onSpeakEnd = null; }
    this._paintState();
  }

  /* ---------- 主循环 ---------- */
  _loop(now) {
    if (this.dead) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now; this.t += dt;
    const T = this.t;
    // 口型序列（逐字时钟）
    if (this.speaking && this.seq) {
      const elapsed = performance.now() / 1000 - this.seqStart;
      let idx;
      if (this.tts) {
        /* 朗读中：有边界事件按朗读进度，没有则按时钟走到最后一个字停住等 onend；朗读卡死则超时收尾 */
        idx = this.ttsBoundary ? Math.min(this.seq.length - 1, this.ttsProgress) : Math.min(this.seq.length - 1, Math.floor(elapsed / this.perChar));
        if (elapsed > this.seq.length * this.perChar * 2.2 + 4) { this.tts = null; TTS.cancel(); idx = this.seq.length; }
      }
      else if (this.ttsProgress >= 0) idx = Math.min(this.seq.length - 1, this.ttsProgress);
      else idx = Math.floor(elapsed / this.perChar);
      if (idx >= this.seq.length) { this.finishSpeak(); }
      else {
        const frac = (elapsed / this.perChar) % 1;
        const s = this.seq[idx];
        const key = (s.o !== '-' && frac < 0.34) ? s.o : s.n;
        const v = VISEME[key] || VISEME.E;
        const amp = s.pause ? 0.1 : (0.82 + 0.18 * Math.sin(T * 21));
        this.mouthTarget = { w: v.w, h: v.h * amp, r: v.r, t: v.t, p: v.p };
        this.curV = key; this.curCh = s.ch; this.progress = idx / this.seq.length;
      }
    }
    for (const k in this.mouth) this.mouth[k] += (this.mouthTarget[k] - this.mouth[k]) * Math.min(1, dt * 26);
    if (!this.n || !this.n.card || !document.body.contains(this.n.card)) { requestAnimationFrame(this._loop); return; }
    const talk = Math.max(0, Math.min(1, this.mouth.h / 18));
    this.energy += (talk - this.energy) * Math.min(1, dt * 14);

    // 呼吸
    const br = Math.sin(T * 1.35);

    // 头部：点头 / 摇头 / 姿态 + 视线跟随 + 微摆
    if (this._nod) {
      this._nod.t += dt * 5.5;
      const k = this._nod.t;
      this.headPitch = Math.sin(k * Math.PI) * 7;
      if (k >= 1) { this._nod.n--; this._nod.t = 0; if (this._nod.n <= 0) { this._nod = null; } }
    } else if (this._shake) {
      this._shake.t += dt * 3.4;
      this.headYaw = Math.sin(this._shake.t * Math.PI * 3) * 9;
      if (this._shake.t >= 1) { this._shake = null; }
    } else {
      const yT = this.headYawT + this.gazeYaw * .7 + Math.sin(T * 0.53) * 1.4 + (this.speaking ? Math.sin(T * 2.3) * 1.6 : 0);
      const pT = this.headPitchT + this.gazePitch * .6 + Math.sin(T * 0.41) * .8;
      this.headYaw += (yT - this.headYaw) * dt * 4;
      this.headPitch += (pT - this.headPitch) * dt * 4;
    }
    this.lean += (this.leanT - this.lean) * dt * 4;
    this.poseT += dt;

    // 形象卡：透视转头 + 前倾放大 + 呼吸起伏 + 说话节奏
    const bob = br * 1.4 - this.energy * 2.2 + Math.sin(T * 9) * this.energy * .9;
    const sc = 1 + this.lean * .012 + br * .003 + this.energy * .012;
    this.n.card.style.transform = `translate3d(${(this.headYaw * .35).toFixed(2)}px,${bob.toFixed(2)}px,0) rotateY(${(this.headYaw * .9).toFixed(2)}deg) rotateX(${(-this.headPitch * .7).toFixed(2)}deg) rotate(${(this.headYaw * .12).toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    if (this.n.img) this.n.img.style.transform = `translate3d(${(-this.headYaw * .5).toFixed(2)}px,${(-this.headPitch * .5 + br * .5).toFixed(2)}px,0) scale(${(1.04 + this.lean * .006).toFixed(4)})`;

    // 光环与声波
    this.n.pav.style.setProperty('--e', this.energy.toFixed(3));
    this.n.pav.style.setProperty('--br', ((br + 1) / 2).toFixed(3));
    const ws = this.n.waves;
    for (let i = 0; i < ws.length; i++) {
      const ph = Math.sin(T * (7 + i * 1.3) + i * 1.1) * .5 + .5;
      const h = this.speaking ? 3 + (this.energy * 14 + 3) * ph : 2 + ph * 1.2;
      ws[i].style.height = h.toFixed(1) + 'px';
    }
    this.n.wave.classList.toggle('on', !!this.speaking);
    requestAnimationFrame(this._loop);
  }
}
