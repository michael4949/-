/* ================= 数字人播放层 =================
   三档，按可用性自动降级：
     clips   HeyGen 预渲染透明 WebM —— 离线主用，现场首选
     stream  HeyGen 实时会话     —— 需外网，自由问答用
     builtin 内置 SVG 骨骼       —— 兜底，任何环境都能出画面
   打包时把 manifest 内联进 HEYGEN_MANIFEST，视频用相对路径引用，
   这样 file:// 直接双击也能播（fetch 会被 CORS 拦，<video src> 不会）。
================================================= */

const HEYGEN_MANIFEST = {};          // 打包时由 clips/manifest.json 内联
const HEYGEN_CFG = {
  mode: 'builtin',                   // clips | stream | builtin
  clipBase: 'clips/',
  apiKey: '', token: '',
  avatar: { jianhu: '', diaodu: '', zhiban: '' },
  quality: 'high'
};

const Avatar = {
  cur: null, vid: null, sdk: null, session: null, ready: false,

  init() {
    this.vid = document.getElementById('dhvid');
    const saved = (() => { try { return JSON.parse(localStorage.getItem('xwt_heygen') || '{}'); } catch (e) { return {}; } })();
    Object.assign(HEYGEN_CFG, saved);
    if (HEYGEN_CFG.mode === 'clips' && !Object.keys(HEYGEN_MANIFEST).length) HEYGEN_CFG.mode = 'builtin';
    this.apply();
  },

  save() { try { localStorage.setItem('xwt_heygen', JSON.stringify(HEYGEN_CFG)); } catch (e) { } },

  apply() {
    const m = HEYGEN_CFG.mode;
    const svg = document.getElementById('dh');
    if (svg) svg.style.display = (m === 'builtin') ? '' : 'none';
    if (this.vid) this.vid.style.display = (m === 'builtin') ? 'none' : '';
    const badge = document.getElementById('dhmode');
    if (badge) badge.textContent = ({ clips: 'HEYGEN · 预渲染', stream: 'HEYGEN · 实时', builtin: '内置渲染' })[m];
  },

  /* ---- 台词→片段查找：按文本精确匹配，未命中则降级 ---- */
  clipOf(text) {
    const t = (text || '').trim();
    for (const id in HEYGEN_MANIFEST) {
      const c = HEYGEN_MANIFEST[id];
      if (c.status === 'ok' && c.text.trim() === t) return HEYGEN_CFG.clipBase + c.file;
    }
    return null;
  },

  /* ---- 统一入口：与内置引擎签名一致 ---- */
  speak(text, opt) {
    opt = opt || {};
    if (HEYGEN_CFG.mode === 'clips') {
      const url = this.clipOf(text);
      if (url) return this.playClip(url, opt);
    }
    if (HEYGEN_CFG.mode === 'stream' && this.session) {
      return this.streamSpeak(text, opt);
    }
    return new Promise(res => { DH.speak(text, Object.assign({}, opt, { onEnd: res })); });
  },

  playClip(url, opt) {
    return new Promise(res => {
      const v = this.vid;
      if (!v) return res();
      v.onended = null;
      v.src = url;
      v.currentTime = 0;
      const done = () => { v.onended = null; v.onerror = null; res(); };
      v.onended = done;
      v.onerror = () => { DH.speak(opt.showText || '', { onEnd: done }); };
      const pr = v.play();
      if (pr && pr.catch) pr.catch(() => { setTimeout(done, 400); });
    });
  },

  stop() {
    if (this.vid) { try { this.vid.pause(); } catch (e) { } }
    if (this.session && this.sdk) { try { this.session.interrupt(); } catch (e) { } }
    DH.stopSpeak(true);
  },

  /* ---- 实时会话 ---- */
  async startStream(role) {
    if (!HEYGEN_CFG.token && !HEYGEN_CFG.apiKey) throw new Error('缺少 API Key 或 session token');
    let token = HEYGEN_CFG.token;
    if (!token) {
      const r = await fetch('https://api.heygen.com/v1/streaming.create_token', {
        method: 'POST', headers: { 'x-api-key': HEYGEN_CFG.apiKey }
      });
      if (!r.ok) throw new Error('取 token 失败 ' + r.status + '（本地打开时通常是跨域，请用本地服务器或直接粘贴 token）');
      token = (await r.json()).data.token;
    }
    const mod = await import('https://esm.sh/@heygen/streaming-avatar@2');
    const StreamingAvatar = mod.default;
    this.sdk = mod;
    const av = new StreamingAvatar({ token });
    av.on(mod.StreamingEvents.STREAM_READY, e => {
      if (this.vid && e.detail) { this.vid.srcObject = e.detail; this.vid.play(); }
    });
    await av.createStartAvatar({
      quality: HEYGEN_CFG.quality,
      avatarName: HEYGEN_CFG.avatar[role || 'jianhu'],
      language: 'zh'
    });
    this.session = av;
    return av;
  },

  async streamSpeak(text, opt) {
    try {
      await this.session.speak({ text, task_type: this.sdk.TaskType.REPEAT, taskMode: this.sdk.TaskMode.SYNC });
    } catch (e) {
      return new Promise(res => DH.speak(text, Object.assign({}, opt, { onEnd: res })));
    }
  },

  async switchRole(role) {
    if (HEYGEN_CFG.mode !== 'stream' || !this.session) return;
    try { await this.session.stopAvatar(); } catch (e) { }
    this.session = null;
    try { await this.startStream(role); } catch (e) { }
  }
};

/* ---------------- 设置面板 ---------------- */
function openAvatarCfg() {
  const nClip = Object.values(HEYGEN_MANIFEST).filter(c => c.status === 'ok').length;
  const m = el('div', 'mask');
  m.innerHTML = `<div class="dlg" style="width:min(680px,96vw)">
    <div class="dh"><b>数字人设置</b><span class="cls">×</span></div>
    <div class="db">
      <div class="sec"><div class="st">渲染方式</div>
        <div class="cfgrow">
          ${[['clips', 'HeyGen 预渲染', '离线播放透明 WebM，现场零网络依赖'],
      ['stream', 'HeyGen 实时会话', '需要外网与 API Key，用于自由问答'],
      ['builtin', '内置渲染', '拼音驱动的 SVG 骨骼，任何环境可用']].map(([k, n, d]) =>
        `<label class="cfgopt ${HEYGEN_CFG.mode === k ? 'on' : ''}">
              <input type="radio" name="dhmode" value="${k}" ${HEYGEN_CFG.mode === k ? 'checked' : ''}
                ${k === 'clips' && !nClip ? 'disabled' : ''}>
              <div><b>${n}</b><span>${d}</span></div></label>`).join('')}
        </div>
      </div>
      <div class="sec"><div class="st">HeyGen 连接（实时会话用）</div>
        <div class="cfgin"><label>API Key</label><input id="cf_key" value="${HEYGEN_CFG.apiKey}" placeholder="从 HeyGen 后台 Settings → API 获取"></div>
        <div class="cfgin"><label>Session Token</label><input id="cf_tok" value="${HEYGEN_CFG.token}" placeholder="本地打开受跨域限制时，改为直接粘贴 token"></div>
        <div class="cfgin"><label>监护人形象</label><input id="cf_a1" value="${HEYGEN_CFG.avatar.jianhu}" placeholder="avatar_id"></div>
        <div class="cfgin"><label>调度员形象</label><input id="cf_a2" value="${HEYGEN_CFG.avatar.diaodu}" placeholder="avatar_id"></div>
        <div class="cfgin"><label>值班负责人</label><input id="cf_a3" value="${HEYGEN_CFG.avatar.zhiban}" placeholder="avatar_id"></div>
      </div>
      <div class="sec"><div class="st">说明</div>
        <div class="sc" style="font-size:11.5px;color:#5c6b5f;line-height:1.8">
          预渲染片段随系统打包，离线播放；三种方式自动降级。
        </div>
      </div>
    </div>
    <div class="df"><button class="btn" id="cf_test">测试连接</button>
      <button class="btn pri" id="cf_ok">保存</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('.cls').onclick = () => m.remove();
  m.querySelectorAll('input[name=dhmode]').forEach(r => r.onchange = () => {
    m.querySelectorAll('.cfgopt').forEach(o => o.classList.toggle('on', o.querySelector('input').checked));
  });
  m.querySelector('#cf_test').onclick = async () => {
    const btn = m.querySelector('#cf_test'); btn.textContent = '测试中…';
    HEYGEN_CFG.apiKey = m.querySelector('#cf_key').value.trim();
    try {
      const r = await fetch('https://api.heygen.com/v2/avatars', { headers: { 'x-api-key': HEYGEN_CFG.apiKey } });
      const j = await r.json();
      const n = ((j.data && (j.data.avatars || j.data)) || []).length;
      btn.textContent = r.ok ? `连接成功，${n} 个形象` : '失败 ' + r.status;
    } catch (e) { btn.textContent = '跨域受限，请用本地服务器打开'; }
  };
  m.querySelector('#cf_ok').onclick = () => {
    HEYGEN_CFG.mode = m.querySelector('input[name=dhmode]:checked').value;
    HEYGEN_CFG.apiKey = m.querySelector('#cf_key').value.trim();
    HEYGEN_CFG.token = m.querySelector('#cf_tok').value.trim();
    HEYGEN_CFG.avatar.jianhu = m.querySelector('#cf_a1').value.trim();
    HEYGEN_CFG.avatar.diaodu = m.querySelector('#cf_a2').value.trim();
    HEYGEN_CFG.avatar.zhiban = m.querySelector('#cf_a3').value.trim();
    Avatar.save(); Avatar.apply();
    if (HEYGEN_CFG.mode === 'stream') {
      Avatar.startStream('jianhu').then(() => toast('实时会话已建立', 'ok'))
        .catch(e => { toast('实时会话失败：' + e.message, 'bad'); HEYGEN_CFG.mode = 'builtin'; Avatar.apply(); });
    }
    m.remove();
  };
}
