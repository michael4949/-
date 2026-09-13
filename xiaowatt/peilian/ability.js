/* ===== 能力模型层：岗位胜任能力评价（作业授权认证表）→ 8 维能力 → 题库考试取证 =====
   来源：技能类岗位胜任能力评价作业授权认证表（变电运行高级作业员）20 个专业项目 + 两项实操考试内容。
   一个能力维度对应多个专业项目（一对多）。维度定义须经安全专家审定，确认记录见 CONFIRM_LOG。 */

const CERT_POST = '变电运行高级作业员';
const CERT_UNITS = [
  { u: '业务流程', items: [['0.1', '电网管理平台（资产域）模块应用', 1]] },
  { u: '1 操作', items: [['1.1', '操作票的填写、执行与归档检查', 1], ['1.2', '工作票的填写、执行与归档检查', 1], ['1.3', '倒闸操作行为规范执行', 1]] },
  { u: '2 验收', items: [['2.1', '变电设备审图、验收', 0], ['2.2', '变电土建工程审图、验收', 0], ['2.3', '变电设备缺陷发现、定级和验收', 1]] },
  { u: '3 巡视', items: [['3.1', '变电设备日常巡视、特殊巡视', 1]] },
  { u: '4 维护', items: [['4.1', '变电设备日常维护、特巡特维、专项运维', 1], ['4.2', '变电设备附属设施日常维护、特巡特维、专项运维', 1], ['4.3', '常用安全工器具的使用和维护', 1], ['4.4', '常用仪器仪表的使用和维护', 1], ['4.5', '维护检修计划制定', 1]] },
  { u: '5 事故处理', items: [['5.1', '变电设备事故异常处置', 1]] },
  { u: '6 风险管控', items: [['6.1', '变电设备日常监盘', 1], ['6.2', '作业风险管理', 1]] },
  { u: '7 设备异常、事故分析处理', items: [['7.1', '反措、设备重大风险整改', 1], ['7.2', '设备状态评价', 0], ['7.3', '重大缺陷事故处理应急方案编写', 0]] },
  { u: '8 智能化技术应用', items: [['8.1', '变电设备智能运维系统的应用', 1]] }
];
const CERT_ITEMS = CERT_UNITS.flatMap(u => u.items.map(([code, n, star]) => ({ code, n, star: !!star, unit: u.u })));
function certItem(code) { return CERT_ITEMS.find(c => c.code === code); }

/* 8 维能力：k 维度键 · n 名称 · d 可检查的动作定义 · items 对应专业项目（一对多） */
const ABILITY8 = [
  { k: 'A', n: '设备辨识与定位', d: '在相似设备中按编号牌选对对象、走对间隔', items: ['3.1', '4.2', '5.1', '6.1'] },
  { k: 'B', n: '状态核对与确认', d: '操作后核实实际状态，多处指示一致才判完成', items: ['1.3', '3.1', '6.1', '2.3'] },
  { k: 'C', n: '操作程序与票务规范', d: '按票序执行，票面填写、归档与汇报规范', items: ['1.1', '1.2', '1.3', '0.1'] },
  { k: 'D', n: '安全措施与风险控制', d: '验电接地、五防闭锁、安全工器具、作业风险', items: ['1.3', '4.3', '6.2'] },
  { k: 'E', n: '异常与应急处置', d: '主机故障、火情、事故异常下的正确处置', items: ['5.1', '7.1', '7.3'] },
  { k: 'F', n: '仪表读数与工器具使用', d: '压力表、电流电压、带电显示装置的读取与判断', items: ['4.4', '4.3', '6.1'] },
  { k: 'G', n: '缺陷发现与设备评价', d: '发现异常、定级、验收、状态评价', items: ['2.1', '2.2', '2.3', '4.1', '4.5', '7.2'] },
  { k: 'H', n: '后台系统与信息应用', d: '监控后台画面、电网管理平台、智能运维系统的使用', items: ['0.1', '8.1', '6.1'] }
];
const DIMS = ABILITY8.map(a => a.n);
const DIMK = ABILITY8.map(a => a.k);
function dimIdx(k) { return DIMK.indexOf(k); }
function abilityOf(k) { return ABILITY8.find(a => a.k === k); }
/* 专业项目 → 能力维度（反向索引） */
function dimsOfItem(code) { return ABILITY8.filter(a => a.items.includes(code)); }

/* 两项考试内容对各维度的覆盖（考试模块按题目 tags 计分，这里给总览） */
const EXAM_COVER = {
  rain: { n: '#3主变雨淋阀水喷雾系统机械手动启动', dims: ['A', 'B', 'D', 'E', 'F', 'G'] },
  e1163: { n: '110kV 培训三线 1163 开关检查与地刀检查', dims: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] }
};

/* 陪练舱六个内部计分维度 → 8 维折算（取均值） */
const ABILITY_FROM_ARENA = { A: ['dual', 'state'], B: ['state'], C: ['order', 'rule'], D: ['risk', 'rule'], E: ['risk'], F: ['state', 'dual'], G: ['state', 'risk'], H: ['term', 'state'] };
function arenaTo8(v6) {                        // v6: {rule,order,dual,state,risk,term} 各 0–100
  return ABILITY8.map(a => { const ks = ABILITY_FROM_ARENA[a.k]; return Math.round(ks.reduce((s, k) => s + (v6[k] == null ? 100 : v6[k]), 0) / ks.length); });
}

/* 专业规则确认记录：版本 · 审定人 · 日期（人物为虚拟）。待确认项由班组长提交审定后状态变更 */
const CONFIRM_LOG = [
  { id: 'dims', t: '能力维度定义（8 维）与能力—专业项目对应表', ver: 'v1.0', who: '高志明', role: '变电运行专业 安全专家', date: '2026-09-12', st: 'ok' },
  { id: 'ticket', t: '110kV 培训三线 1163 运行转检修操作票 29 项顺序、红线、权重与条款', ver: 'V8', who: '高志明', role: '变电运行专业 安全专家', date: '2026-09-12', st: 'ok' },
  { id: 'e1163', t: '1163 关卡评分表（10 分制）与三类错误反馈文案', ver: 'v1.0', who: '', role: '变电运行专业 安全专家', date: '', st: 'pending' },
  { id: 'rain', t: '#3主变雨淋阀实操评分表（10 分制）与七条关键错误', ver: 'v1.0', who: '', role: '消防专业 安全专家', date: '', st: 'pending' }
];
const LS_CONFIRM = 'xwt_confirm';
function confirmLog() { const o = lsGet(LS_CONFIRM, {}); return CONFIRM_LOG.map(c => Object.assign({}, c, o[c.id] || {})); }
function confirmSet(id, patch) { const o = lsGet(LS_CONFIRM, {}); o[id] = Object.assign(o[id] || {}, patch); lsSet(LS_CONFIRM, o); }

/* 训练/考试记录的版本字段（反馈单第四节第 2 条） */
function versionStamp(examId) {
  return { ticket: examId === 'e1163' ? '操作票 V8（1163 运行转检修）' : examId === 'rain' ? '实操培训方案 · 雨淋阀检查版' : '操作票 V8', rule: examId ? `评分表 v1.0（${confirmLog().find(c => c.id === examId).st === 'ok' ? '已审定' : '待审定'}）` : '扣分标准 v3', kb: '知识库 2026-09 · 细则 + 附录 F/G/J', time: stamp(), reviewer: '' };
}

/* 陪练类型地图（反馈单第四节第 4 条）：四类 + 成熟度 */
const COACH_TYPES = [
  { k: 'rule', n: '程序规则类', d: '按票、按规程、按步骤的情境练习，判定为规则驱动', lv: 3, lvn: '样板已跑通', ex: ['倒闸操作 · 1163 关卡', '雨淋阀机械手动启动', '完整操作票 29 项'] },
  { k: 'lang', n: '语言沟通类', d: '对话式练习，按知识库召回作答与追问，语音或文字', lv: 2, lvn: '口述汇报已接入', ex: ['接令复诵与汇报', '客户沟通', '党建谈话'] },
  { k: 'doc', n: '材料复盘类', d: '对操作票、记录、报告等材料逐项审核与复盘', lv: 2, lvn: '拟票练习已接入', ex: ['填写操作票', '两票审核'] },
  { k: 'vis', n: '视觉动作类', d: '对人的动作、姿态做图像或视频识别', lv: 0, lvn: '不在本轮范围', ex: ['现场动作识别'] }
];
