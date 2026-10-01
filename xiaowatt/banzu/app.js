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
   实现（10/3 四轮，用户反馈页面频闪、内容出不来）：不再用十几个带 CSS 模糊滤镜的 3D 元素逐帧合成，而是一张画布 + 预渲染精灵——
   模糊只在初始化时算一次，逐帧只做平移 / 旋转 / 透明度，限 30fps，页面不可见时自动停，减少动态偏好下只画一帧静态。 */
const VTL = {
  SCALE: .5, PAD: 110, dpr: 1, main: null, heros: [], sprites: {}, last: 0, t0: 0, tick: 0, rm: false,
  CL_A: { ax: 'r', ox: -150, ay: 't', oy: -330, size: 800, ph: 0, rings: [
    { inset: 0, tx: 68, tz: -20, c: ['#22d3ee', '#3b82f6', '#8b5cf6'], d: 46, dir: 1 },
    { inset: .07, tx: 58, tz: 32, c: ['#8b5cf6', '#ec4899', '#f9a8d4'], d: 58, dir: -1 },
    { inset: .15, tx: 76, tz: -56, c: ['#fb923c', '#f472b6', '#a78bfa'], d: 72, dir: 1, thin: true }], rb: true },
  CL_B: { ax: 'l', ox: -190, ay: 'b', oy: -250, size: 600, ph: 8, rings: [
    { inset: 0, tx: 70, tz: 24, c: ['#3b82f6', '#22d3ee', '#67e8f9'], d: 52, dir: 1 },
    { inset: .07, tx: 60, tz: -34, c: ['#a78bfa', '#8b5cf6', '#3b82f6'], d: 64, dir: -1 }], rb: true },
  CL_C: { ax: 'l', ox: .36, ay: 'b', oy: -290, size: 460, ph: 4, rings: [
    { inset: 0, tx: 72, tz: -10, c: ['#ec4899', '#8b5cf6', '#22d3ee'], d: 50, dir: 1 },
    { inset: .15, tx: 64, tz: 48, c: ['#22d3ee', '#3b82f6', '#a78bfa'], d: 66, dir: -1, thin: true }], rb: false },
  CL_H: { ax: 'r', ox: -80, ay: 't', oy: -170, size: 500, ph: 2, hero: true, rings: [
    { inset: 0, tx: 66, tz: -18, c: ['#67e8f9', '#60a5fa', '#a78bfa'], d: 34, dir: 1 },
    { inset: .07, tx: 56, tz: 34, c: ['#a78bfa', '#f472b6', '#fbcfe8'], d: 44, dir: -1 },
    { inset: .15, tx: 78, tz: -58, c: ['#fb923c', '#f472b6', '#c4b5fd'], d: 56, dir: 1, thin: true }], rb: true },
  RAYS: [{ x: -.08, y: .36, a: -22, l: 1100, c: ['#60a5fa', '#c084fc'], d: 16, dl: 0 }, { x: .42, y: -.04, a: 38, l: 900, c: ['#22d3ee', '#3b82f6'], d: 21, dl: -9 }, { x: .52, y: .72, a: -16, l: 1000, c: ['#f472b6', '#a78bfa'], d: 19, dl: -5 }],
  rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; },
  mix(a, b, t) { return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)); },
  /* 环上某点的颜色与透明度：0–5% 透明，18% c1，42% c2，62% c3，84% 后透明（与 CSS conic 版一致） */
  at(cs, t) {
    const c = t <= .18 ? cs[0] : t <= .42 ? this.mix(cs[0], cs[1], (t - .18) / .24) : t <= .62 ? this.mix(cs[1], cs[2], (t - .42) / .2) : cs[2];
    const a = t < .05 ? 0 : t < .18 ? (t - .05) / .13 : t <= .62 ? 1 : t < .84 ? 1 - (t - .62) / .22 : 0;
    return [c, a];
  },
  hasFilter() { if (this._hf === undefined) this._hf = typeof CanvasRenderingContext2D !== 'undefined' && ('filter' in CanvasRenderingContext2D.prototype); return this._hf; },
  arcs(ctx, R, lw, cs, white, amul) {
    const N = 120; ctx.lineCap = 'butt'; ctx.lineWidth = lw;
    for (let i = 0; i < N; i++) {
      const t = (i + .5) / N; const [c, a] = this.at(cs, t); if (a <= .01) continue;
      const cc = white ? this.mix(c, [255, 255, 255], white) : c;
      ctx.strokeStyle = 'rgba(' + cc.join(',') + ',' + (a * amul).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(0, 0, R, i / N * Math.PI * 2 - .004, (i + 1) / N * Math.PI * 2 + .004); ctx.stroke();
    }
  },
  /* 光环精灵：饱满的宽光带（边缘微柔）+ 外圈淡光晕 + 细亮芯；半分辨率渲染，画的时候放大。
     带宽 / 透明度与 CSS 版一致（CSS 的 filter 先于 mask，所以当时的光带是整条饱和、只有边缘柔化） */
  ring(R, cs, thin, hero) {
    const key = 'r' + R + cs.join('') + (thin ? 't' : '') + (hero ? 'h' : ''); if (this.sprites[key]) return this.sprites[key];
    const S = this.SCALE, px = Math.ceil((R + this.PAD) * 2 * S), c = document.createElement('canvas'); c.width = c.height = px;
    const ctx = c.getContext('2d'); ctx.translate(px / 2, px / 2); ctx.scale(S, S);
    const gw = hero ? (thin ? 26 : 40) : (thin ? 22 : 34), bandA = hero ? .92 : (thin ? .62 : .74), haloA = hero ? .7 : (thin ? .4 : .5);
    if (this.hasFilter()) {
      const tmp = document.createElement('canvas'); tmp.width = tmp.height = px; const tc = tmp.getContext('2d'); tc.translate(px / 2, px / 2); tc.scale(S, S);
      this.arcs(tc, R, gw, cs, 0, 1);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = 'blur(' + Math.round(26 * S) + 'px)'; ctx.globalAlpha = haloA; ctx.drawImage(tmp, 0, 0);
      ctx.filter = 'blur(' + Math.max(2, Math.round(5 * S)) + 'px)'; ctx.globalAlpha = bandA; ctx.drawImage(tmp, 0, 0);
      ctx.restore(); ctx.globalAlpha = 1;
    } else {
      this.arcs(ctx, R, gw * 2.6, cs, 0, haloA * .12); this.arcs(ctx, R, gw * 1.9, cs, 0, haloA * .18); this.arcs(ctx, R, gw * 1.35, cs, 0, haloA * .3); this.arcs(ctx, R, gw, cs, 0, bandA * .8);
    }
    this.arcs(ctx, R, 3, cs, .3, .92);
    return this.sprites[key] = c;
  },
  /* 重模糊的斜光带（椭圆） */
  ribbon(w, h, hero) {
    const key = 'b' + w + 'x' + h + (hero ? 'h' : ''); if (this.sprites[key]) return this.sprites[key];
    const S = this.SCALE, c = document.createElement('canvas'); c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
    const ctx = c.getContext('2d'); ctx.scale(S, S); ctx.translate(w / 2, h / 2); ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    g.addColorStop(0, hero ? 'rgba(130,150,255,.6)' : 'rgba(99,112,245,.46)'); g.addColorStop(.55, hero ? 'rgba(150,130,250,.3)' : 'rgba(129,110,245,.22)'); g.addColorStop(1, 'rgba(129,110,245,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();
    return this.sprites[key] = c;
  },
  /* 柔和光线：细亮线 + 宽柔光 */
  ray(L, cs) {
    const key = 'y' + L + cs.join(''); if (this.sprites[key]) return this.sprites[key];
    const S = this.SCALE, H = 60, c = document.createElement('canvas'); c.width = Math.ceil(L * S); c.height = Math.ceil(H * S);
    const ctx = c.getContext('2d'); ctx.scale(S, S);
    const g = ctx.createLinearGradient(0, 0, L, 0); const [a, b] = cs.map(x => this.rgb(x));
    g.addColorStop(0, 'rgba(' + a.join(',') + ',0)'); g.addColorStop(.3, 'rgba(' + a.join(',') + ',1)'); g.addColorStop(.6, 'rgba(' + b.join(',') + ',1)'); g.addColorStop(1, 'rgba(' + b.join(',') + ',0)');
    const line = (lw, al) => { ctx.globalAlpha = al; ctx.strokeStyle = g; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(L, H / 2); ctx.stroke(); };
    if (this.hasFilter()) { ctx.filter = 'blur(' + Math.round(16 * S) + 'px)'; line(22, .6); ctx.filter = 'blur(' + Math.max(2, Math.round(4 * S)) + 'px)'; line(7, .6); ctx.filter = 'none'; } else { line(40, .07); line(24, .1); line(12, .2); line(6, .35); }
    line(1.6, .7); ctx.globalAlpha = 1;
    return this.sprites[key] = c;
  },
  mount(c, W, H) { c.width = Math.round(W * this.dpr); c.height = Math.round(H * this.dpr); c.__W = W; c.__H = H; return c; },
  start() {
    const c = document.querySelector('canvas.vtlight'); if (!c) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.main = c; this.resize(); this.t0 = performance.now();
    window.addEventListener('resize', () => { clearTimeout(this._rz); this._rz = setTimeout(() => { this.resize(); if (this.rm) this.frame(0); }, 150); });
    if (this.rm) { this.frame(0); return; }
    const loop = ts => { this.raf = requestAnimationFrame(loop); if (ts - this.last < 31) return; this.last = ts; this.frame((ts - this.t0) / 1000); };
    this.raf = requestAnimationFrame(loop);
  },
  resize() { this.mount(this.main, window.innerWidth, window.innerHeight); },
  /* 英雄面板里的画布：每次换页后由 render() 调一次，循环里也定期补扫（局部重渲染时） */
  scan() {
    this.heros = this.heros.filter(h => h.c.isConnected);
    document.querySelectorAll('canvas.vth').forEach(c => { if (c.__W) return; this.mount(c, 500, 500); this.heros.push({ c }); if (this.rm) this.frame(0); });
  },
  center(cl, W, H) {
    const half = cl.size / 2;
    const x = cl.ax === 'r' ? W + cl.ox - half : (cl.ox < 1 && cl.ox > -1 ? W * cl.ox : cl.ox) + half;
    const y = cl.ay === 'b' ? H + cl.oy - half : cl.oy + half;
    return [x, y];
  },
  cluster(ctx, cl, W, H, t, amul) {
    const [cx0, cy0] = this.center(cl, W, H); const dpr = this.dpr;
    const br = .5 - .5 * Math.cos((t + cl.ph) / 18 * Math.PI * 2); const s = 1 + .05 * br, cx = cx0 - 14 * br, cy = cy0 + 12 * br;
    if (cl.rb) {
      const w = cl.size * 1.08, h = cl.size * .4, sp = this.ribbon(Math.round(w), Math.round(h), cl.hero); const dr = Math.sin((t + cl.ph) / 15 * Math.PI * 2);
      ctx.setTransform(dpr, 0, 0, dpr, cx, cy); ctx.scale(s, s); ctx.rotate((-24 + 4 * (dr + 1) / 2) * Math.PI / 180); ctx.translate(w * .04 * dr, 0);
      ctx.globalAlpha = amul * (cl.hero ? .7 : .55 + .2 * (dr + 1) / 2); ctx.drawImage(sp, -w / 2, -h / 2, w, h);
    }
    cl.rings.forEach(r => {
      const R = Math.round(half(cl.size) * (1 - 2 * r.inset)), sp = this.ring(R, r.c.map(x => this.rgb(x)), r.thin, cl.hero), full = (R + this.PAD) * 2;
      ctx.setTransform(dpr, 0, 0, dpr, cx, cy); ctx.scale(s, s); ctx.rotate(r.tz * Math.PI / 180); ctx.scale(1, Math.cos(r.tx * Math.PI / 180)); ctx.rotate(t / r.d * Math.PI * 2 * r.dir);
      ctx.globalAlpha = amul * (cl.hero ? 1 : .92); ctx.drawImage(sp, -full / 2, -full / 2, full, full);
    });
    function half(n) { return n / 2; }
  },
  frame(t) {
    const m = this.main; if (m) {
      const ctx = m.getContext('2d'), W = m.__W, H = m.__H; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, m.width, m.height);
      const narrow = W <= 960, amul = narrow ? .7 : 1;
      this.cluster(ctx, this.CL_A, W, H, t, amul); this.cluster(ctx, this.CL_B, W, H, t, amul); if (!narrow) this.cluster(ctx, this.CL_C, W, H, t, amul);
      this.RAYS.forEach(r => {
        const p = (((t + r.dl) / r.d) % 1 + 1) % 1, a = p < .35 ? p / .35 : p < .6 ? 1 : (1 - p) / .4, sp = this.ray(r.l, r.c);
        ctx.setTransform(this.dpr, 0, 0, this.dpr, W * r.x, H * r.y); ctx.rotate(r.a * Math.PI / 180); ctx.translate(r.l * (-.22 + .44 * p), 0);
        ctx.globalAlpha = amul * .9 * a; ctx.drawImage(sp, 0, -30, r.l, 60);
      });
      ctx.globalAlpha = 1;
    }
    if (++this.tick % 20 === 0) this.scan();
    this.heros.forEach(h => { const ctx = h.c.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, h.c.width, h.c.height); this.cluster(ctx, this.CL_H, h.c.__W, h.c.__H, t, 1); ctx.globalAlpha = 1; });
  }
};
function vtLightHTML() { return '<canvas class="vtlight" aria-hidden="true"></canvas>'; }
/* 英雄面板右侧的光圈组（深色面板上更亮）：同一引擎在面板内的小画布上画 */
function vtHeroLight() { return '<canvas class="vth" aria-hidden="true"></canvas>'; }
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
function boot() { shell(); VTL.start(); route(); setInterval(() => { const c = $('#clock'); if (c) c.textContent = new Date().toTimeString().slice(0, 5); }, 1000); }
