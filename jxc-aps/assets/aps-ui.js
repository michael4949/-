/* =====================================================================
   APS + AI 生产系统 · 共享前端引擎（外壳 / Copilot / 排程跑批 / 通用组件）
   全局命名空间 APS。各应用页面提供自己的数据与屏幕，调用这里的能力。
===================================================================== */
(function(){
const APS = window.APS = {};
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
APS.$=$; APS.$$=$$;

/* ---------------- 外壳：侧栏 / 路由 / 用户 ---------------- */
APS.initShell = function(opts={}){
  const app = $('.app');
  // 侧栏折叠
  const tg = $('.tb-toggle');
  if(tg) tg.onclick = ()=> app.classList.toggle('sb-collapsed');
  // 导航路由
  $$('.nav-item[data-page]').forEach(it=>{
    it.onclick = ()=> APS.go(it.dataset.page);
  });
  // Copilot 唤起
  const fab=$('.cop-fab'), cop=$('.copilot');
  if(fab&&cop){
    fab.onclick=()=>{ cop.classList.add('open'); fab.style.display='none'; };
    const x=$('.cop-x'); if(x) x.onclick=()=>{ cop.classList.remove('open'); fab.style.display=''; };
  }
  // 默认页
  if(opts.start) APS.go(opts.start);
};
APS.go = function(pageId){
  $$('.page').forEach(p=>p.classList.toggle('active', p.id==='page-'+pageId));
  $$('.nav-item[data-page]').forEach(it=>it.classList.toggle('active', it.dataset.page===pageId));
  const it=$('.nav-item[data-page="'+pageId+'"]');
  const crumb=$('#crumbPage');
  if(crumb&&it){ crumb.textContent = it.dataset.crumb || it.textContent.trim(); }
  $('.main').scrollTop=0;
  if(APS._onPage) APS._onPage(pageId);
};
APS.onPage = fn => APS._onPage=fn;

/* ---------------- Toast ---------------- */
APS.toast = function(msg, type='ok'){
  let host=$('.toast-host'); if(!host){ host=document.createElement('div'); host.className='toast-host'; document.body.appendChild(host); }
  const icon = type==='ai'?'✦':type==='warn'?'!':'✓';
  const t=document.createElement('div'); t.className='toast '+type;
  t.innerHTML=`<span class="t-ic">${icon}</span><span>${msg}</span>`;
  host.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),320); }, 3200);
};

/* ---------------- 模态 / 抽屉 ---------------- */
function ensureOverlay(){ let o=$('.overlay'); if(!o){ o=document.createElement('div'); o.className='overlay'; document.body.appendChild(o); o.onclick=()=>APS.closeModal(); } return o; }
APS.openModal = function(id){ ensureOverlay().classList.add('show'); const m=$('#'+id); if(m) m.classList.add('show'); };
APS.closeModal = function(){ $$('.modal.show,.drawer.show').forEach(m=>m.classList.remove('show')); const o=$('.overlay'); if(o)o.classList.remove('show'); };
APS.openDrawer = function(id){ ensureOverlay().classList.add('show'); const d=$('#'+id); if(d) d.classList.add('show'); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') APS.closeModal(); });

/* ---------------- 数字滚动 ---------------- */
APS.count = function(el, from, to, {suffix='',prefix='',dur=900,sep=false}={}){
  if(typeof el==='string') el=$(el); if(!el) return;
  const t0=performance.now();
  (function f(t){
    const k=Math.min((t-t0)/dur,1);
    let v=Math.round(from+(to-from)*(1-Math.pow(1-k,3)));
    el.textContent=prefix+(sep?v.toLocaleString():v)+suffix;
    if(k<1) requestAnimationFrame(f);
  })(t0);
};

/* ---------------- AI Copilot 对话框架 ---------------- */
let copBusy=false;
APS.copilot = {
  scenarios:{}, routes:[],
  register(scn){ Object.assign(this.scenarios,scn); },
  route(rules){ this.routes=rules; },        // [[/正则/,'key'],...]
  send(text){
    if(copBusy) return;
    if(!text) return;
    APS._copAdd('u', text);
    let key=null;
    for(const [re,k] of this.routes){ if(re.test(text)){ key=k; break; } }
    if(key&&this.scenarios[key]) APS._copRun(this.scenarios[key]);
    else APS._copFallback();
  },
  run(key){ const s=this.scenarios[key]; if(s){ APS._copAdd('u', s.user||key); APS._copRun(s); } }
};
APS._copAdd = function(role, html, who){
  const body=$('.cop-body'); if(!body) return null;
  const m=document.createElement('div'); m.className='cmsg '+role;
  m.innerHTML=`<div class="who">${who||(role==='u'?'我':'APS Copilot')}</div><div class="bub">${html}</div>`;
  body.appendChild(m); body.scrollTop=body.scrollHeight; return m;
};
APS._copRun = function(s){
  copBusy=true;
  const body=$('.cop-body');
  const steps=s.steps||[];
  const wrap=APS._copAdd('a', `<div class="cop-think">${steps.map(st=>`<div class="cop-step"><span class="si"></span>${st[0]}　<code>${st[1]||''}</code></div>`).join('')}</div><div class="cop-ans"></div>`);
  const els=$$('.cop-step', wrap);
  els.forEach((el,i)=>{
    setTimeout(()=>{ el.classList.add('show'); body.scrollTop=body.scrollHeight; }, 220+i*560);
    setTimeout(()=>{ el.classList.add('done'); }, 220+i*560+480);
  });
  const wait=220+steps.length*560+460;
  setTimeout(()=>{
    const ans=$('.cop-ans', wrap);
    APS._type(ans, s.text||'', ()=>{
      if(s.rich){ const d=document.createElement('div'); d.style.marginTop='8px'; d.innerHTML=s.rich; ans.appendChild(d); body.scrollTop=body.scrollHeight; }
      copBusy=false;
    });
  }, wait);
};
APS._copFallback = function(){
  copBusy=true;
  const w=APS._copAdd('a','');
  APS._type($('.bub',w),'我已接入本系统的工单、排产、库存与成本数据。可以问我：急单能不能接、为什么这样排、某物料齐套情况、某工单成本明细等。也可点下方快捷问题。',()=>copBusy=false);
};
APS._type = function(el, text, done){
  const span=document.createElement('div'); span.style.cssText='font-size:12.5px;line-height:1.65'; el.appendChild(span);
  let i=0; (function tk(){ span.textContent=text.slice(0,++i); const b=$('.cop-body'); if(b)b.scrollTop=b.scrollHeight;
    if(i<text.length) setTimeout(tk, 12); else done&&done(); })();
};
APS.initCopilot = function(){
  const inp=$('.cop-input input'), btn=$('.cop-input button');
  const send=()=>{ const v=inp.value.trim(); inp.value=''; APS.copilot.send(v); };
  if(btn) btn.onclick=send;
  if(inp) inp.addEventListener('keydown',e=>{ if(e.key==='Enter') send(); });
  $$('.cop-sug').forEach(s=> s.onclick=()=>APS.copilot.send(s.textContent.trim()));
  if(APS._copWelcome) setTimeout(()=>APS._copAdd('a', APS._copWelcome), 400);
};

/* ---------------- AI 排程跑批（核心动画） ----------------
   APS.runScheduler({ logLines:[[delay,'<html>']...], plans:'<html>', onDone:fn, total:3000 })
   在 #schedRunModal 内播放：进度条 + 流式日志 + 已评估方案计数，结束展示方案对比。 */
APS.runScheduler = function(cfg={}){
  const modal=$('#schedRunModal'); if(!modal){ cfg.onDone&&cfg.onDone(); return; }
  APS.openModal('schedRunModal');
  const log=$('#runLog', modal), pct=$('#runPct', modal), bar=$('#runBar', modal),
        evalEl=$('#runEval', modal), foot=$('#runFoot', modal), plansBox=$('#runPlans', modal),
        title=$('#runState', modal);
  log.innerHTML=''; plansBox.innerHTML=''; plansBox.style.display='none';
  pct.textContent='0%'; bar.style.width='0%'; if(evalEl) evalEl.textContent='0';
  if(foot) foot.style.display='none';
  if(title) title.textContent='正在求解…';
  const lines = cfg.logLines || APS._defaultLog();
  let t=0;
  lines.forEach((ln,i)=>{
    t += ln[0];
    setTimeout(()=>{
      const div=document.createElement('div'); div.className='ln'; div.innerHTML=ln[1]; log.appendChild(div); log.scrollTop=log.scrollHeight;
    }, t);
  });
  const total=t+400, dur=total;
  const t0=performance.now();
  (function prog(now){
    const k=Math.min((now-t0)/dur,1);
    const p=Math.round(k*100); pct.textContent=p+'%'; bar.style.width=p+'%';
    if(evalEl) evalEl.textContent=Math.round((cfg.total||3182)*(1-Math.pow(1-k,2))).toLocaleString();
    if(k<1) requestAnimationFrame(prog);
    else{
      if(title) title.textContent='✓ 求解完成 · AI 已生成候选方案';
      if(cfg.plans){ plansBox.innerHTML=cfg.plans; plansBox.style.display='grid'; bindPlanPick(plansBox); }
      if(foot) foot.style.display='flex';
    }
  })(t0);
  APS._runDone = cfg.onDone;
};
function bindPlanPick(box){
  $$('.plan',box).forEach(p=> p.onclick=()=>{ $$('.plan',box).forEach(x=>x.classList.remove('pick')); p.classList.add('pick'); p.style.outline='2px solid var(--brand)'; });
}
APS.applySchedule = function(){
  APS.closeModal();
  if(APS._runDone) APS._runDone();
};
APS._defaultLog = ()=>[
  [200,'<span class="ts">10:24:01</span> 读取待排工序工单 <span class="em">126</span> 张，资源 <span class="em">14</span> 台'],
  [500,'<span class="ts">10:24:01</span> 装配约束：物料齐套 / 模具占用 / 生产日历 / <span class="hi">器件×设备绑定</span>'],
  [600,'<span class="ts">10:24:02</span> 目标函数：min(延期, 换型, 在制) · max(设备利用率)'],
  [700,'<span class="ts">10:24:02</span> <span class="hi">启发式 + 局部搜索</span> 求解中…'],
  [600,'<span class="ts">10:24:04</span> 已评估方案 1,860 · 当前最优延期 0 张'],
  [600,'<span class="ts">10:24:05</span> 收敛：换型 5→2 次，利用率 71%→<span class="ok">89%</span>'],
  [400,'<span class="ts">10:24:05</span> <span class="ok">✓ 生成 3 套候选方案，等待排程员审核</span>'],
];

/* ---------------- 通用：甘特拖拽（轻量） ---------------- */
APS.makeDraggable = function(bar, onDrop){
  let sx, sl;
  bar.addEventListener('pointerdown',e=>{
    if(bar.classList.contains('setup')) return;
    sx=e.clientX; sl=parseFloat(bar.style.left); bar.setPointerCapture(e.pointerId);
    bar.style.transition='none'; bar.style.zIndex=6;
  });
  bar.addEventListener('pointermove',e=>{
    if(sx==null) return;
    const lane=bar.parentElement.getBoundingClientRect();
    let nl=sl + (e.clientX-sx)/lane.width*100;
    nl=Math.max(0,Math.min(92,nl)); bar.style.left=nl+'%';
  });
  bar.addEventListener('pointerup',e=>{ if(sx==null)return; sx=null; bar.style.transition=''; bar.style.zIndex='';
    onDrop&&onDrop(bar); });
};

/* ---------------- 简易筛选/搜索（grid） ---------------- */
APS.filterTable = function(tblSel, q){
  q=(q||'').trim().toLowerCase();
  $$(tblSel+' tbody tr').forEach(tr=>{
    tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
};
})();
