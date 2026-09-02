/* ===== 底座各页数据层（全部脱敏模拟；人员评价类结论均标注"以人工审核为准"） ===== */

/* 角色：学员 / 班组长（管理端） */
const ROLE = { cur: 'student' };
const LEAD_USER = { name: '周建国', team: '变电运行一班', post: '班组长' };

/* 班组 12 人（虚拟人物），dims 与 DIMS6 同序 */
const TEAM = [
  { n: '任玲玲', post: '变电运行值班员', sess: 12, avg: 79, last: 1,  task: 'todo', red: 1, dims: [86, 90, 62, 74, 71, 83] },
  { n: '李文博', post: '变电运行值班员', sess: 9,  avg: 84, last: 2,  task: 'done', red: 0, dims: [88, 86, 80, 78, 82, 85] },
  { n: '王思远', post: '变电运行主值',   sess: 6,  avg: 91, last: 4,  task: 'done', red: 0, dims: [93, 92, 88, 86, 90, 91] },
  { n: '张雨桐', post: '变电运行值班员', sess: 11, avg: 76, last: 1,  task: 'done', red: 1, dims: [80, 82, 70, 66, 74, 79] },
  { n: '刘泽宇', post: '变电运行值班员', sess: 3,  avg: 68, last: 9,  task: 'todo', red: 1, dims: [72, 70, 58, 60, 64, 71] },
  { n: '陈晓萌', post: '变电运行值班员', sess: 8,  avg: 82, last: 3,  task: 'done', red: 0, dims: [85, 88, 74, 77, 80, 84] },
  { n: '赵子豪', post: '变电运行值班员', sess: 0,  avg: 0,  last: -1, task: 'todo', red: 0, dims: [0, 0, 0, 0, 0, 0] },
  { n: '黄嘉琪', post: '变电运行主值',   sess: 5,  avg: 88, last: 6,  task: 'done', red: 0, dims: [90, 89, 85, 84, 88, 90] },
  { n: '吴俊杰', post: '变电运行值班员', sess: 7,  avg: 73, last: 5,  task: 'todo', red: 2, dims: [76, 78, 64, 62, 70, 77] },
  { n: '周淑仪', post: '变电运行值班员', sess: 10, avg: 85, last: 2,  task: 'done', red: 0, dims: [87, 90, 78, 80, 84, 86] },
  { n: '郑浩然', post: '变电运行值班员', sess: 0,  avg: 0,  last: -1, task: 'todo', red: 0, dims: [0, 0, 0, 0, 0, 0] },
  { n: '林芷若', post: '变电运行值班员', sess: 4,  avg: 80, last: 7,  task: 'done', red: 0, dims: [83, 84, 72, 75, 78, 81] }
];
/* 本月红线触发统计（班组） */
const REDLINES = [['GIS 只看后台未核对就地', 4], ['未验电即合接地刀闸', 3], ['走错间隔', 2], ['票令不一致未识别', 2], ['发现异常未中止', 2], ['跳项操作', 1]];

/* 成长里程碑 */
const MILESTONES = [
  { d: '2024-08-30', t: '入职集中培训结业', k: 'done' },
  { d: '2025-02-28', t: '导师带教期通过', k: 'done' },
  { d: '2025-06-12', t: '首次独立完成倒闸操作', k: 'done' },
  { d: '2026-03-18', t: '安规年度考试 92 分', k: 'done' },
  { d: null, ago: 29, t: '首场完整操作票陪练', k: 'done' },
  { d: null, ago: 8,  t: '首场考核模式满 90 分', k: 'done' },
  { d: null, ago: -2, t: '完整操作票 · 考核模式（班组长下发）', k: 'next' },
  { d: null, ago: -30, t: '岗位胜任度认定（人工审核）', k: 'future' },
];
/* 晋升通道 */
const LADDER = [
  { post: '变电运行值班员', cur: true,  req: ['安规考试 ≥ 80', '实操场次 ≥ 15', '年度学时 ≥ 90', '资质证书齐全'], met: [true, false, false, true] },
  { post: '变电运行主值',   cur: false, req: ['胜任度认定通过', '独立值班 ≥ 12 个月', '异常处置专项 ≥ 85', '带教新员工 1 名'], met: [false, false, false, false] },
  { post: '值长',           cur: false, req: ['主值任职 ≥ 24 个月', '事故预案演练组织', '班组管理培训结业'], met: [false, false, false] }
];

/* 知识课堂接入指标（供给层） */
const CLASSROOM = {
  syncAt: '今日 07:30',
  supply: [
    { k: 'course', n: '课程库', v: '1,240 门', note: '按能力项匹配推荐', dir: 'in' },
    { k: 'quiz',   n: '题库',   v: '8,600 题', note: '错题联动出题', dir: 'in' },
    { k: 'hours',  n: '学时',   v: '68 / 90',  note: '陪练学时回写', dir: 'out' },
    { k: 'profile', n: '学员画像', v: '36 字段', note: '岗位/序列/证书/能力', dir: 'in' }
  ],
  learning: [
    { n: 'GIS 设备结构与四项位置指示核对', h: 4, done: 1, tag: '设备状态核对' },
    { n: '调度规范用语与接发令要点', h: 2, done: 0, tag: '调度术语' },
    { n: '变电站防误操作专题', h: 2, done: 2, tag: '规程记忆' },
    { n: '两票管理细则修编解读', h: 2, done: 2, tag: '规程记忆' }
  ],
  quizLink: [
    { vio: '四项位置指示核对顺序不完整', q: 'GIS 组合电器刀闸操作后应依次核对哪四项指示？', mastery: 60, tries: 3 },
    { vio: '复诵缺设备双重名称', q: '操作票中设备名称须填写哪两项要素？', mastery: 80, tries: 2 },
    { vio: '接令记录漏填发令时间', q: '接受调度指令时记录应包含哪些内容？', mastery: 100, tries: 1 },
    { vio: '验电顺序不完整', q: '不能直接验电的设备如何确认无电压？', mastery: 70, tries: 2 }
  ],
  profileSync: [['岗位与序列', '变电运行值班员 · 运行序列', '已同步'], ['资质证书', '2 项有效', '已同步'], ['年度学时', '68 学时', '已回写'], ['能力六维', '本月更新', '已同步'], ['陪练场次', '12 场 / 30 天', '已回写']]
};

/* 教练编辑器样例操作票（与内置剧本不同：培训二线 1162 检修转运行） */
const SAMPLE_TICKET = `1. 接调度令：将110kV仿真站110kV培训二线1162线路由检修转冷备用
2. 检查培训二线1162间隔工作票已全部终结，标示牌已收回
3. 拉开培训二线线路侧116240地刀
4. 检查培训二线线路侧116240地刀在分闸位置
5. 汇报调度：培训二线1162线路已由检修转冷备用
6. 接调度令：将110kV培训二线1162线路由冷备用转热备用
7. 合上培训二线2M侧11622刀闸
8. 检查培训二线2M侧11622刀闸在合闸位置
9. 合上培训二线线路侧11624刀闸
10. 检查培训二线线路侧11624刀闸在合闸位置
11. 汇报调度：培训二线1162线路已由冷备用转热备用
12. 接调度令：将110kV培训二线1162线路由热备用转运行
13. 合上培训二线1162开关
14. 检查培训二线1162开关在合闸位置，三相电流正常
15. 汇报调度：培训二线1162线路已由热备用转运行`;

/* 本机存储键 */
const LS_SESSIONS = 'xwt_sessions', LS_TASKS = 'xwt_tasks', LS_COACHES = 'xwt_custom_coaches';
function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
