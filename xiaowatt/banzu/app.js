/* ===== 应用框架：两个角色（班组长 / 管理者）、路由、左栏、命令栏、事件委托、讲师演示台（扩展模块 / 功能实现状态清单 / 案例日期） ===== */
const S = { page: 'home', sub: '', pending: null, briefed: false };
const PAGES = {}, ACT = {};
const ROLES = {
  leader: { n: '班组长', who: '赵立群', scope: TEAM.name + ' · 本班 12 人', home: 'team' },
  manager: { n: '管理者', who: '陈国安', scope: TEAM.dept + ' · 管辖 3 个班组 31 人', home: 'goals' }
};
function role() { return DB.role(); }
const ICO = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  spark: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 9v4M12 16h.01"/>',
  pen: '<path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M13 7l3 3"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 18.5c.3-2.2 1.8-3.5 4-3.5 1.2 0 2.2.4 3 1"/>',
  check: '<path d="M4 12.5l5 5L20 7"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 18.5A2.5 2.5 0 016.5 16H20M8 7h8"/>',
  grid: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
  bldg: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
  flow: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 11l3-4M7 13l3 4M14 7l3 4M14 17l3-4"/>',
  warn: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  swap: '<path d="M4 8h12l-3-3M20 16H8l3 3"/>',
  star: '<path d="M12 3l2.7 5.6 6.2.9-4.5 4.3 1.1 6.1L12 17l-5.5 2.9 1.1-6.1L3.1 9.5l6.2-.9z"/>',
  gauge: '<path d="M4 16a8 8 0 0116 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.5"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  cmpr: '<rect x="4" y="10" width="4" height="10"/><rect x="10" y="5" width="4" height="15"/><rect x="16" y="13" width="4" height="7"/>',
  hex: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
  tree: '<circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v5M12 12l-6 5M12 12l6 5"/>'
};
/* 班组长：班组管理 6 项在前，日常业务 5 项在后；管理者：业务 2 项 + 管理 6 项 + 班组 2 项（9/21 客户口径：业务减、管理加） */
function NAV_OF() {
  if (role() === 'manager') return [
    { g: '业务' }, { k: 'goals', n: '考核指标', ic: 'target', badge: () => goalsAll().filter(g => g.light === 'bad').length }, { k: 'compare', n: '班组横向对比', ic: 'cmpr' },
    { g: '管理' }, { k: 'portrait', n: '团队画像总览', ic: 'star' }, { k: 'lperf', n: '班长绩效', ic: 'gauge', badge: () => LEADERS.filter(l => !LS.get('lperf_ok', {})[l.n]).length }, { k: 'staff', n: '人员总览', ic: 'people' }, { k: 'structure', n: '班组结构对比', ic: 'hex' }, { k: 'risks', n: '团队风险画像', ic: 'warn', badge: () => riskAgg().filter(r => r.lv === '高').length }, { k: 'mcare', n: '员工关怀', ic: 'heart' }, { k: 'madvise', n: '分析参谋', ic: 'doc' },
    { g: '班组' }, { k: 'ledger', n: '台账中心', ic: 'grid' }, { k: 'ask', n: '问小瓦特', ic: 'spark' }
  ];
  const nav = [
    { g: '班组整体' }, { k: 'team', n: '班组画像', ic: 'star' }, { g: '人员情况' }, { k: 'skills', n: '班员画像', ic: 'hex' }, { k: 'auth', n: '授权认证', ic: 'check' }, { k: 'grow', n: '培养与梯队', ic: 'tree' }, { k: 'perf', n: '绩效与激励', ic: 'gauge' }, { k: 'care', n: '关怀与文化', ic: 'heart', badge: () => careList().filter(c => !LS.get('care_done', {})[c.k + '|' + c.who + '|' + c.when]).length }, { k: 'advise', n: '分析参谋', ic: 'doc' },
    { g: '日常业务' }, { k: 'home', n: '今日工作台', ic: 'sun', badge: () => HOMEPG.pending() }, { k: 'sched', n: '用工安排', ic: 'cal', badge: () => DB.jobs().filter(j => j.st === '待派').length }, { k: 'know', n: '知识库', ic: 'book' }, { k: 'ledger', n: '台账中心', ic: 'grid' }, { k: 'ask', n: '问小瓦特', ic: 'spark' }
  ];
  if (DB.ext()) nav.push({ g: '扩展模块' }, { k: 'people', n: '人员档案', ic: 'people' }, { k: 'train', n: '培训考评', ic: 'check' }, { k: 'safety', n: '安全管理', ic: 'shield' }, { k: 'docs', n: '文稿中心', ic: 'pen' });
  return nav;
}
const ALLOW = { leader: ['team', 'skills', 'auth', 'grow', 'perf', 'care', 'advise', 'home', 'ask', 'people', 'sched', 'train', 'know', 'ledger', 'safety', 'docs', 'star'], manager: ['goals', 'compare', 'portrait', 'lperf', 'staff', 'structure', 'risks', 'mcare', 'madvise', 'ledger', 'ask', 'risk', 'star', 'team', 'skills', 'auth', 'people', 'sched', 'train', 'know', 'super', 'talent'] };
/* 功能实现状态清单（讲师演示台） */
const STATUS_LIST = [
  ['真实实现', ['9/29 二轮 左栏按故事线分三段：班组整体（班组画像：名片与集体荣誉、班长责任书核心 KPI、核心业务管控、星级评价与班组发展规划、维度表目录合并单元格、提升措施）→ 人员情况（班员画像为团体画像：人员情况指标总览、队伍结构含党员与政治面貌、技能等级、素质与能力、核心业务自主实施能力、证书复审，个人画像在成员明细里点开；授权认证、培养与梯队、绩效与激励、关怀与文化均为团体在前、个人在后）→ 日常业务（工作台只放工作：今日作业、已派工、待派工与逐单派工建议）', '9/29 绩效与激励：履职证据按钮打开五类证据（逐条带出处）与系数逐条推导，可在弹层内确认系数', '状态层流程：派工 → 审票 → 开工 → 回传 → 完工 → 验收，每步写入本机、刷新可回看', '两票 Word / Excel / 文本离线读取与逐项审核、补齐、退回', '派工四条规则校验（证书 / 作业授权 / 工时 / 冲突）与逐人推荐、排除理由', '关键节点周闭环记录、授权模块实操量完工回写', '全站颜色说明：每页底部按模块列出颜色含义；状态色（绿 = 达标、黄 = 需关注、红 = 未达 / 风险）与分类色（蓝 / 紫 / 青等）分开使用，三个班组固定颜色', '作业授权认证表：7 个技能单元 42 个模块逐人逐格确认授权 / 培训中 / 撤销，★按高 / 中 / 初级作业员标注，核心业务自主实施能力与★模块断层实时计算，签认与导出 .xls 落本机', '星级班组评价维度初步评分：台账驱动的维度（安全 / 培训 / 台账 / 绩效 / 帮扶 / 关怀 / 作业实施）随操作变化', '绩效系数由履职证据推导，确认、调整、分配表落本机', '班长绩效按员工年度业绩责任书（班长）：考核指标 50% / 重点任务 10% / 综合评价 40% / 加扣分 / 红线；配电自动化班的快速复电成功率取周报，违章、派工、待审票、新增授权取本机台账实时值，确认、下发、改进要求、考评表落本机', '考核指标分分管副总 / 主管 / 班长三个维度，基础值、满分值、挑战值与评分标准取 2026 年度业绩责任书原文，预计得分按责任书评分标准实时计算，督办写入班长通知', '关怀提醒、班组活动、文化活动、督办、轮岗建议、面谈提纲全部写通知或文稿', '跨班组调配：横向对比 → 影响测算 → 发起 → 班长确认 → 返岗评价']],
  ['规则模拟', ['月度系数的工作量规则：本月工分达到班组人均 +0.05、低于人均 70% −0.05，学员与休假人员不参与比较（70% 阈值待确认）', '员工画像：综合画像（通用素质模型 5 项，L1–L4）与专业画像（岗位说明书 9 项二级业务，对照本岗级要求判到位 / 未到位），等级依据违章、两票、负责人次数、学时、协同、抢修与缺陷台账', '班组特色标签（专家型 / 骨干型 / 基础型）按技能等级占比判定', '人才断层风险按★模块已授权人数与年龄判定', '培养对象排序按断层★模块、本人★模块授权完成度、成绩、学时、年龄、员工画像优势加权', '考核指标红黄绿：达到满分值为绿、达到基础值为黄、未达基础值为红；累计类指标按时间进度推算全年', '班长绩效单项得分（上限 120 分）按 ÷1.2 折为百分制后乘权重；综合评价三项（政治过硬 / 勇于创新 / 作风优良）按台账证据给初步分，由部门确认；分档线优秀 90 / 良好 80 / 合格 70', '近五年业务量与人力配置趋势外推', '值班表排班、添加任务推断、文稿逐段生成']],
  ['预设展示', ['工作量（工分）为按工分制考核台账口径预设的月度值；人员性别、学历、政治面貌为预设', '待客户确认：核心业务自主实施能力的定义与展示方式（现按作业授权认证表 已授权★模块 ÷ 本岗级应授权★模块）', '待客户确认：星级评价模型、综合评价模型是否接入（现为按分册维度的初步评分与员工画像综合画像）', '待客户确认：班组荣誉标签与核心指标口径（现取荣誉台账集体荣誉与班长年度业绩责任书四项）', '考核指标当前值：综合供电可靠率、中压线路故障跳闸次数、第三方客户满意度、安全生产责任制履职评价（局级）与三个班组的中压客户平均停电时间、跳闸次数、停电用户数降幅、安全生产过程管理（试验班、配电运维一班）为预设；配电自动化班与试验班班长责任书指标值暂按配电运行维护一班班长责任书模板；重点任务完成情况、创新成果与加扣分事项为预设', '团队风险画像的敏感岗位轮岗只针对三位班长，轮岗期 5 年为预设，待部门确认', '专业画像暂按运维班高级作业员岗位说明书的 9 项二级业务，配电自动化班岗位说明书待提供后替换；综合画像与专业画像的各人初始等级为预设', '作业授权认证表暂用运维班口径（7 单元 42 模块、★按岗级），配电自动化班专用认证表待提供后替换；各人初始授权状态为预设，原九类核心技能的授权与实操次数已迁移到对应模块', '星级评价中党建 / 标准化 / 定置 / 作业组织等非台账维度的初步得分', '试验班与配电运维一班人员明细、荣誉、稳定性', '敏感岗位任职、考勤异常、离职与借调等团队风险底数', '近 30 天出勤与近四季度成长轨迹', '照片隐患识别、语音转写']],
  ['待系统对接', ['工分制考核台账（月度工分）', 'OMS 缺陷与工单同步', 'OCS 终端在线状态', '电网管理平台两票与作业计划', '人资证书 / 学时 / 考勤 / 绩效台账', '党建管理系统与荣誉台账', '通知推送到个人', 'PDF 与照片文字读取']]
];
/* 背景光圈光带（每页常驻）：多道柔和的光弧 / 光环 / 光线交叠，缓慢绕行、呼吸、漂移（用户 10/3 三轮：要参考图红框里那种柔和光线与光圈，不是细线、不是颗粒 / 球体）。
   10/3 四轮（用户：频闪、内容出不来；五轮：不许换方案，要解决频闪本身）：DOM 结构、3D 倾斜、绕行 / 呼吸 / 光线游走的 CSS 动画全部与三轮版相同，
   只把"每帧都要重算的 CSS 模糊滤镜 + conic 渐变 + 蒙版"换成初始化时在画布上预渲染一次的贴图（按 CSS 语义逐像素复刻：整盘 conic → 模糊 → 环形蒙版 → 细亮芯），
   动画仍由合成器跑，贴图不再逐帧重算，弱显卡也稳。 */
const VTL = {
  SCALE: .5, PAD: 16, sprites: {},
  rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; },
  mix(a, b, t) { return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)); },
  /* conic 渐变上某处的颜色与透明度：0–5% 透明，18% c1，42% c2，62% c3，84% 后透明（与 CSS 一致） */
  at(cs, t) {
    const c = t <= .18 ? cs[0] : t <= .42 ? this.mix(cs[0], cs[1], (t - .18) / .24) : t <= .62 ? this.mix(cs[1], cs[2], (t - .42) / .2) : cs[2];
    const a = t < .05 ? 0 : t < .18 ? (t - .05) / .13 : t <= .62 ? 1 : t < .84 ? 1 - (t - .62) / .22 : 0;
    return [c, a];
  },
  hasFilter() { if (this._hf === undefined) this._hf = typeof CanvasRenderingContext2D !== 'undefined' && ('filter' in CanvasRenderingContext2D.prototype); return this._hf; },
  /* CSS conic 从正上方顺时针起算，画布角度从正右方起算：差 90° */
  disc(ctx, R, cs) { const N = 180, o = -Math.PI / 2; for (let i = 0; i < N; i++) { const [c, a] = this.at(cs, (i + .5) / N); if (a <= .01) continue; ctx.fillStyle = 'rgba(' + c.join(',') + ',' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, o + i / N * Math.PI * 2 - .004, o + (i + 1) / N * Math.PI * 2 + .004); ctx.closePath(); ctx.fill(); } },
  arcs(ctx, R, lw, cs, white, amul) { const N = 120, o = -Math.PI / 2; ctx.lineCap = 'butt'; ctx.lineWidth = lw; for (let i = 0; i < N; i++) { const [c, a] = this.at(cs, (i + .5) / N); if (a <= .01) continue; const cc = white ? this.mix(c, [255, 255, 255], white) : c; ctx.strokeStyle = 'rgba(' + cc.join(',') + ',' + (a * amul).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(0, 0, R, o + i / N * Math.PI * 2 - .004, o + (i + 1) / N * Math.PI * 2 + .004); ctx.stroke(); } },
  /* 光环贴图 = 三轮版 s.gl（整盘 conic → blur → 环形蒙版，opacity）+ s.co（3px 细亮芯）；半分辨率渲染 */
  ring(R, cs, thin, hero) {
    const key = 'r' + R + cs.join('') + (thin ? 't' : '') + (hero ? 'h' : ''); if (this.sprites[key]) return this.sprites[key];
    const S = this.SCALE, px = Math.ceil((R + this.PAD) * 2 * S), c = document.createElement('canvas'); c.width = c.height = px; const ctx = c.getContext('2d');
    const gw = hero ? (thin ? 26 : 40) : (thin ? 22 : 34), blur = hero ? 26 : (thin ? 18 : 24), glA = hero ? .95 : (thin ? .6 : .72);
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = px; const tc = tmp.getContext('2d'); tc.translate(px / 2, px / 2); tc.scale(S, S); this.disc(tc, R, cs);
    ctx.save(); if (this.hasFilter()) ctx.filter = 'blur(' + Math.round(blur * S) + 'px)'; ctx.globalAlpha = glA; ctx.drawImage(tmp, 0, 0); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'destination-in'; ctx.translate(px / 2, px / 2); ctx.scale(S, S); ctx.strokeStyle = '#000'; ctx.lineWidth = gw; ctx.beginPath(); ctx.arc(0, 0, R - gw / 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    ctx.translate(px / 2, px / 2); ctx.scale(S, S); if (hero) { ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 5; } this.arcs(ctx, R - 1.5, 3, cs, .3, hero ? 1 : .92);
    return this.sprites[key] = c;
  },
  /* 斜光带贴图 = 三轮版 .rb（横向渐变椭圆 → blur 36px），四周留 60px 给模糊 */
  ribbon(w, h, hero) {
    const key = 'b' + w + 'x' + h + (hero ? 'h' : ''); if (this.sprites[key]) return this.sprites[key];
    const S = this.SCALE, P = 60, c = document.createElement('canvas'); c.width = Math.ceil((w + 2 * P) * S); c.height = Math.ceil((h + 2 * P) * S); const ctx = c.getContext('2d');
    const tmp = document.createElement('canvas'); tmp.width = c.width; tmp.height = c.height; const tc = tmp.getContext('2d'); tc.scale(S, S); tc.translate(P + w / 2, P + h / 2);
    const g = tc.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, 'rgba(59,130,246,0)'); g.addColorStop(.35, hero ? 'rgba(96,165,250,.7)' : 'rgba(59,130,246,.5)'); g.addColorStop(.65, hero ? 'rgba(167,139,250,.75)' : 'rgba(139,92,246,.55)'); g.addColorStop(1, 'rgba(139,92,246,0)');
    tc.fillStyle = g; tc.beginPath(); tc.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); tc.fill();
    if (this.hasFilter()) ctx.filter = 'blur(' + Math.round(36 * S) + 'px)'; ctx.drawImage(tmp, 0, 0);
    return this.sprites[key] = c;
  },
  /* 柔和光线贴图 = 三轮版 .vtray（2px 细线 blur 1px）+ ::before（38px 光带 blur 20px，.75） */
  ray(L, cs) {
    const key = 'y' + L + cs.join(''); if (this.sprites[key]) return this.sprites[key];
    const S = this.SCALE, H = 60, c = document.createElement('canvas'); c.width = Math.ceil(L * S); c.height = Math.ceil(H * S); const ctx = c.getContext('2d'); ctx.scale(S, S);
    const g = ctx.createLinearGradient(0, 0, L, 0); const [a, b] = cs.map(x => this.rgb(x));
    g.addColorStop(0, 'rgba(' + a.join(',') + ',0)'); g.addColorStop(.3, 'rgba(' + a.join(',') + ',1)'); g.addColorStop(.6, 'rgba(' + b.join(',') + ',1)'); g.addColorStop(1, 'rgba(' + b.join(',') + ',0)');
    const line = (lw, al) => { ctx.globalAlpha = al; ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(L, H / 2); ctx.stroke(); };
    if (this.hasFilter()) { ctx.filter = 'blur(' + Math.round(20 * S) + 'px)'; line(38, .75); ctx.filter = 'blur(1px)'; line(2, 1); ctx.filter = 'none'; } else { line(38, .1); line(20, .14); line(8, .3); line(2, 1); }
    ctx.globalAlpha = 1; return this.sprites[key] = c;
  },
  /* 把贴图填进标记里的画布（只填一次）；换页后由 render() 调，英雄面板的画布也在这里补 */
  paint() {
    document.querySelectorAll('canvas.vts:not([data-ok])').forEach(c => {
      const d = c.dataset, size = +d.size, hero = d.hero === '1';
      if (d.sp === 'ring') {
        const R = Math.round(size / 2 * (1 - 2 * (+d.inset))), sp = this.ring(R, d.c.split(',').map(x => this.rgb(x)), d.thin === '1', hero), full = (R + this.PAD) * 2;
        c.width = sp.width; c.height = sp.height; c.getContext('2d').drawImage(sp, 0, 0); c.style.width = c.style.height = full + 'px'; c.style.marginLeft = c.style.marginTop = (-full / 2) + 'px';
      } else if (d.sp === 'rb') {
        const w = Math.round(size * 1.08), h = Math.round(size * .4), sp = this.ribbon(w, h, hero); c.width = sp.width; c.height = sp.height; c.getContext('2d').drawImage(sp, 0, 0);
      } else if (d.sp === 'ray') {
        const sp = this.ray(+d.l, d.c.split(',')); c.width = sp.width; c.height = sp.height; c.getContext('2d').drawImage(sp, 0, 0);
      }
      c.dataset.ok = '1';
    });
  },
  scan() { this.paint(); },
  /* 自适应保护：开页 1.5s 后实测 2.5s 帧率。纯软件渲染 / 远程桌面 / 显卡被禁用的机器上会很低——
     < 20fps 降一档（只留右上光圈组与英雄面板光圈，关侧栏模糊与透视），再测仍 < 14fps 降二档（固定层整体关闭，只留英雄面板）。
     正常显卡 55–60fps，什么都不动。讲师演示台可用 window.__VT_LITE 强制档位做检查。 */
  guard() {
    const forced = window.__VT_LITE; if (forced) { document.body.classList.add('vtlite'); if (forced > 1) document.body.classList.add('vtlite2'); return; }
    if (!window.requestAnimationFrame || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const measure = (ms, cb) => { let n = 0, t0 = 0; const f = ts => { if (!t0) t0 = ts; n++; if (ts - t0 < ms) requestAnimationFrame(f); else cb(n / ((ts - t0) / 1000)); }; requestAnimationFrame(f); };
    setTimeout(() => measure(2500, fps => {
      VTL.fps = Math.round(fps); if (fps >= 20 || document.hidden) return;
      document.body.classList.add('vtlite');
      setTimeout(() => measure(2500, fps2 => { VTL.fps2 = Math.round(fps2); if (fps2 < 14 && !document.hidden) document.body.classList.add('vtlite2'); }), 800);
    }), 1500);
  }
};
function vtRing(cls, vars, size, inset, colors, thin, hero) {
  return '<i class="r ' + cls + '" style="' + vars + '"><canvas class="vts" data-sp="ring" data-size="' + size + '" data-inset="' + inset + '" data-c="' + colors + '"' + (thin ? ' data-thin="1"' : '') + (hero ? ' data-hero="1"' : '') + ' aria-hidden="true"></canvas></i>';
}
function vtRibbon(size, hero) { return '<b class="rb"><canvas class="vts" data-sp="rb" data-size="' + size + '"' + (hero ? ' data-hero="1"' : '') + ' aria-hidden="true"></canvas></b>'; }
function vtLightHTML() {
  return '<div class="vtlight" aria-hidden="true">' +
    '<div class="vtl a">' + vtRing('r1', '--tx:68deg;--tz:-20deg;--d:46s', 800, 0, '#22d3ee,#3b82f6,#8b5cf6') + vtRing('r2', '--tx:58deg;--tz:32deg;--d:58s;--dir:reverse', 800, .07, '#8b5cf6,#ec4899,#f9a8d4') + vtRing('r3', '--tx:76deg;--tz:-56deg;--d:72s', 800, .15, '#fb923c,#f472b6,#a78bfa', true) + vtRibbon(800) + '</div>' +
    '<div class="vtl b">' + vtRing('r1', '--tx:70deg;--tz:24deg;--d:52s', 600, 0, '#3b82f6,#22d3ee,#67e8f9') + vtRing('r2', '--tx:60deg;--tz:-34deg;--d:64s;--dir:reverse', 600, .07, '#a78bfa,#8b5cf6,#3b82f6') + vtRibbon(600) + '</div>' +
    '<div class="vtl c">' + vtRing('r1', '--tx:72deg;--tz:-10deg;--d:50s', 460, 0, '#ec4899,#8b5cf6,#22d3ee') + vtRing('r3', '--tx:64deg;--tz:48deg;--d:66s;--dir:reverse', 460, .15, '#22d3ee,#3b82f6,#a78bfa', true) + '</div>' +
    '<u class="vtray" style="--x:-8%;--y:36%;--a:-22deg;--l:1100px;--d:16s"><canvas class="vts" data-sp="ray" data-l="1100" data-c="#60a5fa,#c084fc" aria-hidden="true"></canvas></u>' +
    '<u class="vtray" style="--x:42%;--y:-4%;--a:38deg;--l:900px;--d:21s;--dl:-9s"><canvas class="vts" data-sp="ray" data-l="900" data-c="#22d3ee,#3b82f6" aria-hidden="true"></canvas></u>' +
    '<u class="vtray" style="--x:52%;--y:72%;--a:-16deg;--l:1000px;--d:19s;--dl:-5s"><canvas class="vts" data-sp="ray" data-l="1000" data-c="#f472b6,#a78bfa" aria-hidden="true"></canvas></u>' +
    '</div>';
}
/* 英雄面板右侧的光圈组（深色面板上更亮） */
function vtHeroLight() {
  return '<div class="vtl h" aria-hidden="true">' + vtRing('r1', '--tx:66deg;--tz:-18deg;--d:34s', 500, 0, '#67e8f9,#60a5fa,#a78bfa', false, true) + vtRing('r2', '--tx:56deg;--tz:34deg;--d:44s;--dir:reverse', 500, .07, '#a78bfa,#f472b6,#fbcfe8', false, true) + vtRing('r3', '--tx:78deg;--tz:-58deg;--d:56s', 500, .15, '#fb923c,#f472b6,#c4b5fd', true, true) + vtRibbon(500, true) + '</div>';
}
function shell() {
  document.body.innerHTML = '<div id="app"><nav class="sb" id="sb"></nav><section id="main"></section><aside class="side" id="side"></aside></div>' + vtLightHTML() +
    '<button class="vzfab" data-act="side-toggle"><i></i>小瓦特</button><button class="stagebtn" data-act="stage">讲师演示台</button><div class="stage" id="stage"><div class="t">讲师演示台 <span class="note">案例日期 ' + TODAY + ' · 周报第 ' + WK29.no + ' 期</span></div><div class="row">语速 <button data-act="stage-speed" data-v="1" class="on">正常</button><button data-act="stage-speed" data-v=".5">快</button><button data-act="stage-speed" data-v=".2">极快</button></div><div class="row">角色 <button data-act="role-set" data-r="leader">班组长</button><button data-act="role-set" data-r="manager">管理者</button></div><div class="row"><button data-act="stage-brief">重播晨间简报</button><button data-act="stage-ext">扩展模块' + (DB.ext() ? '：开' : '：关') + '</button><button data-act="stage-status">功能实现状态清单</button><button data-act="stage-reset">清空本机记录</button></div><div class="row" id="stagenav"></div></div><div class="modal" id="modal" hidden></div>';
  $('#side').innerHTML = XW.sideHTML();
}
function renderNav() {
  const R = ROLES[role()]; const NAV = NAV_OF(); renderNav.__g = 0;
  $('#sb').innerHTML = '<div class="brand"><img src="__LOGO__" alt=""><div><b>高效班组管理助手</b><span>' + h(TAGLINE) + '</span></div></div>' +
    NAV.map(n => n.g ? (renderNav.__g = (renderNav.__g || 0) + 1, '<div class="grp" data-g="' + renderNav.__g + '">' + n.g + '</div>') : '<a class="' + (S.page === n.k ? 'on' : '') + '" data-g="' + (renderNav.__g || 1) + '" data-act="nav" data-to="' + n.k + '"><i class="' + (n.i || '') + '">' + '<svg viewBox="0 0 24 24">' + ICO[n.ic] + '</svg></i><span>' + n.n + '</span>' + (n.badge && n.badge() ? '<em>' + n.badge() + '</em>' : '') + '</a>').join('') +
    '<div class="me" data-act="role-menu"><i>' + h(R.who[0]) + '</i><div>' + h(R.who) + '<span>' + h(R.scope) + ' · ' + h(R.n) + '</span></div><div class="rsw">' + Object.keys(ROLES).map(k => '<button data-act="role-set" data-r="' + k + '" class="' + (k === role() ? 'on' : '') + '">' + ROLES[k].n + '</button>').join('') + '</div></div>';
  const sn = $('#stagenav'); if (sn) sn.innerHTML = NAV.filter(n => n.k).map(n => '<button data-act="nav" data-to="' + n.k + '">' + n.n + '</button>').join('');
  vzNavInd();
}
/* 左栏当前项的滑动高亮：记住上一次位置，从那里滑到新位置 */
let __vzInd = null;
function vzNavInd() {
  const sb = $('#sb'), on = sb && sb.querySelector('a.on'); if (!sb || !on) return;
  const ind = document.createElement('div'); ind.className = 'vzind';
  const to = { top: on.offsetTop, h: on.offsetHeight };
  const from = __vzInd || to;
  ind.style.top = from.top + 'px'; ind.style.height = from.h + 'px';
  sb.insertBefore(ind, sb.firstChild);
  if (__vzInd && (window.__XW_SPEED || 1) >= 1) requestAnimationFrame(() => requestAnimationFrame(() => { ind.style.top = to.top + 'px'; ind.style.height = to.h + 'px'; }));
  else { ind.style.top = to.top + 'px'; ind.style.height = to.h + 'px'; }
  __vzInd = to;
}
/* 大数字滚动计数（页面进入时；讲师演示台快进与减少动态偏好时不滚） */
function vzCountUp(root) {
  if ((window.__XW_SPEED || 1) < 1 || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  const sel = '.scorerow .big b,.mets>div b,.gauge3>div b,.card.kpi b,.flowbar>div b,.hero .nums b,.mxi b,.tstat b,.cstat b,.dstat b,.aubig b,.mini3 b,.six div b';
  root.querySelectorAll(sel).forEach(el => {
    if (el.children.length || el.dataset.vzcu) return;
    const txt = el.textContent; const m = txt.match(/-?\d[\d,]*(?:\.\d+)?/); if (!m) return;
    const num = parseFloat(m[0].replace(/,/g, '')); if (!isFinite(num) || num === 0) return;
    const dec = (m[0].split('.')[1] || '').length, pre = txt.slice(0, m.index), suf = txt.slice(m.index + m[0].length), comma = m[0].includes(',');
    el.dataset.vzcu = '1'; const t0 = performance.now(), dur = 700;
    const fmt = v => { let s = v.toFixed(dec); if (comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ','); return pre + s + suf; };
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(num * e); if (k < 1) requestAnimationFrame(step); else el.textContent = txt; };
    requestAnimationFrame(step);
  });
}
function cmdHTML(sugs) { return '<div class="cmd"><i class="ic"></i><input id="cmdin" placeholder="输入要办的事，回车"><div class="tools"><em id="mic1" data-act="mic1" title="按住说话">🎙</em><em data-act="up-photo" title="拍照或上传照片">📷</em><em data-act="up-file" title="拖入台账文件">📎</em></div><div class="sug">' + (sugs || []).map(s => '<b data-act="say" data-say="' + h(s) + '">' + h(s) + '</b>').join('') + '</div></div>'; }
/* 页头眉题：所属故事线段落的序号与名称（01 班组整体 / 02 人员情况 / 03 日常业务） */
function vzEyebrow() { const NAV = NAV_OF(); let g = null, n = 0; for (const it of NAV) { if (it.g) { g = it.g; n++; } else if (it.k === S.page) return '<i class="vzeb"><b>' + String(n).padStart(2, '0') + '</b>' + h(g || '') + '</i>'; } return ''; }
function pageHead(title, sub, right) { return '<div class="ph1">' + vzEyebrow() + '<h2>' + h(title) + '</h2><span>' + (sub || '') + '</span><div class="r">' + (right || '') + '</div></div>'; }
function tabsHTML(list, cur) { return '<div class="tabs">' + list.map(t => '<button class="' + (t.k === cur ? 'on' : '') + '" data-act="nav" data-to="' + S.page + '" data-sub="' + t.k + '">' + h(t.n) + '</button>').join('') + '</div>'; }
function route() { const hs = (location.hash || '#' + ROLES[role()].home).slice(1).split('/'); let pg = PAGES[hs[0]] ? hs[0] : ROLES[role()].home; if (!ALLOW[role()].includes(pg)) pg = ROLES[role()].home; if (!DB.ext() && (pg === 'safety' || pg === 'docs') && role() === 'leader') pg = 'home'; S.page = pg; let sub = hs[1] || ''; try { sub = decodeURIComponent(sub); } catch (e) {} S.sub = sub; render(); }
function render() {
  XW.cancel(); XW.unspot(); const pg = PAGES[S.page]; const m = $('#main');
  m.innerHTML = pg.render() + (typeof legendHTML === 'function' ? legendHTML(S.page) : '') + '<div class="cursor" id="cur"><svg viewBox="0 0 20 20"><path d="M3 2 L17 10 L10 11.5 L7 18 Z" fill="#5a5bf0" stroke="#fff" stroke-width="1.2"/></svg><span class="lbl">小瓦特</span></div>';
  const vzKey = S.page + '/' + S.sub, vzNew = vzKey !== render.__vzLast; render.__vzLast = vzKey;
  if (vzNew) { m.classList.remove('vzenter'); void m.offsetWidth; m.classList.add('vzenter'); } else m.classList.remove('vzenter');
  renderNav(); m.scrollTop = 0; pg.after && pg.after(); if (vzNew) vzCountUp(m); VTL.scan();
  if (S.pending) { const f = S.pending; S.pending = null; XW.at(300, f); }
}
function nav(page, sub) { const hsh = '#' + page + (sub ? '/' + sub : ''); if (location.hash === hsh) render(); else location.hash = hsh; }
function ensure(page, fn, sub) { if (S.page === page && (!sub || S.sub === sub)) fn(); else { S.pending = fn; nav(page, sub); } }
function badgeSync() { renderNav(); }
function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="mbox">' + html + '<div class="bt" style="justify-content:flex-end"><button class="g" data-act="modal-close">关闭</button></div></div>'; m.hidden = false; }
/* 通用动作 */
Object.assign(ACT, {
  nav(el) { nav(el.dataset.to, el.dataset.sub || ''); },
  say(el) { XW.ask(el.dataset.say, false); },
  send2() { const i = $('#chatin'); const v = i.value.trim(); i.value = ''; if (v) XW.ask(v, false); },
  mic1() { XW.mic('#mic1', '#cmdin', XW.micText(), XW.micYes); },
  mic2() { XW.mic('#mic2', '#chatin', XW.micText(), XW.micYes); },
  'mic-yes'() { if (XW._micYes) { const f = XW._micYes; XW._micYes = null; f(); } },
  'mic-no'() { XW.answer('那你直接打字告诉我，或者点页面上的按钮。', null, { confirm: false }); },
  unspot() { XW.unspot(); },
  hours(el) { DISPATCH.hours(el.dataset.who || '黄伟强'); },
  'up-photo'() { XW.answer('把照片拖进来或者从相册选，我先按文件名对台账，票面上的字要 Word 或 Excel 版才能逐条读。', null, { confirm: false }); },
  'up-file'() { XW.answer('台账表拖进来我自己对表头；两票在用工安排的审票里上传，Word、Excel、文本都能读。最近一次导入是今早 07:30 的周报第 29 期。', '台账表拖进来我自己对表头；两票在用工安排的审票里上传。<div class="bt"><button data-act="nav" data-to="sched" data-sub="ticket">去上传两票</button></div>', { confirm: false }); },
  stage() { $('#stage').classList.toggle('on'); },
  'side-toggle'() { document.body.classList.toggle('vzside'); },
  'stage-speed'(el) { XW.speed = +el.dataset.v; $$('#stage [data-act="stage-speed"]').forEach(b => b.classList.toggle('on', b === el)); },
  'stage-brief'() { S.briefed = false; XW.clearChat(); if (role() !== 'leader') { DB.setRole('leader'); } location.hash = '#home'; render(); },
  'stage-ext'(el) { LS.set('ext', !DB.ext()); el.textContent = '扩展模块' + (DB.ext() ? '：开' : '：关'); renderNav(); XW.answer(DB.ext() ? '扩展模块打开了：人员档案、培训考评、安全管理、文稿中心在左栏最下面。' : '扩展模块收起了，左栏只留班组管理与日常业务。', null, { confirm: false, speak: false }); },
  'stage-status'() { modal('<h3>功能实现状态清单</h3><div class="note" style="margin-bottom:8px">案例日期 ' + TODAY + '（周报第 ' + WK29.no + ' 期发布日）· 业务数据内置于单文件，状态保存在本机</div>' + STATUS_LIST.map(([k, list]) => '<div class="stl"><b class="tag ' + ({ 真实实现: 'ok', 规则模拟: 'v', 预设展示: 'w', 待系统对接: 'bad' }[k]) + '">' + k + '</b><ul>' + list.map(x => '<li>' + h(x) + '</li>').join('') + '</ul></div>').join('')); },
  'modal-close'() { $('#modal').hidden = true; },
  'stage-reset'() { DB.reset(); location.reload(); },
  'role-menu'() {},
  'role-set'(el) { const r = el.dataset.r; if (!ROLES[r] || r === role()) return; DB.setRole(r); S.briefed = false; XW.clearChat(); location.hash = '#' + ROLES[r].home; render(); XW.answer(r === 'manager' ? '切到管理者了：先看分管副总、主管、班长三个维度的考核指标，再看三个班组的画像、人员、结构、风险和关怀；督办、轮岗、调配都落到班长确认。' : '切到班组长了：先看' + TEAM.name + '的班组整体画像和星级提升目标，再看班员画像、授权认证、培养、绩效、关怀。', null, { confirm: false, speak: false }); }
});
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act; if (ACT[a]) { if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) e.preventDefault(); ACT[a](el, e); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.target.id === 'cmdin' || e.target.id === 'chatin')) { const v = e.target.value.trim(); e.target.value = ''; if (v) XW.ask(v, false); } });
window.addEventListener('hashchange', route);
function boot() { shell(); VTL.paint(); VTL.guard(); route(); setInterval(() => { const c = $('#clock'); if (c) c.textContent = new Date().toTimeString().slice(0, 5); }, 1000); }
