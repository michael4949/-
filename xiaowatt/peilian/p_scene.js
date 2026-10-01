/* ===== 四个陪练场景（安规知识 / 保命技能 / 案例分析 / 制度学习）与工作票陪练：场景定义与入口 =====
   本文件在第二批接入各场景的题目引擎；当前先提供场景定义与入口。 */

const SC_DEF = {
  rule: { title: '安规条文问答 · 答错即给条款原文', src: '安规（变电部分）· 电气操作导则', how: [['作答', '单选 · 判断 · 口述填空，答错当场给出条款原文'], ['出题', '从制度文件库与题库自动出题，按短板加权'], ['依据', '安规 ' + RULES.filter(r => r.doc === 'aq').length + ' 条 · 导则 ' + RULES.filter(r => r.doc === 'dz').length + ' 条可检索']], chips: [['verify', '验电接地'], ['switch', '倒闸操作'], ['measure', '保证安全的技术措施'], ['secondary', '二次工作']] },
  life: { title: '保命技能 · 步骤排序与禁止事项', src: '安规保证安全的技术措施 · 现场急救', how: [['作答', '把技能步骤排对顺序，指出情境中的禁止做法'], ['判定', '顺序、要点、禁止事项逐项比对'], ['依据', '安规 6.1 停电 · 验电 · 接地 · 遮栏与标示牌；应急处置卡急救要点']], chips: [['poweroff', '停电'], ['verify', '验电'], ['ground', '接地'], ['fence', '遮栏与标示牌'], ['cpr', '触电急救']] },
  case: { title: '事故案例分析 · 原因 · 违规 · 教训', src: '事故通报（脱敏案例）· 班组长推送', how: [['作答', '读案例，写直接原因、间接原因、违反条款、防范措施'], ['判定', '与标准分析逐项比对，意思对即得分'], ['来源', '预置脱敏案例 + 班组长导入的通报']], chips: [] },
  inst: { title: '制度文件 → 课件 → 测验', src: '两票管理细则 · 应急信息报送工作指引', how: [['学习', '制度文件自动生成课件，数字人讲课'], ['测验', '从课件自动出题，关键条款必考'], ['分析', '考完自动给出考试分析与复练建议']], chips: [['ticket', '两票管理细则'], ['report', '应急信息报送指引']] },
  wt: { task: '110kV考核站 #3 主变检修 · 第一种工作票 · 安全措施填写' }
};
const SC = { k: null, sub: '', mode: 'teach', timer: null };
function scStart(k, sub, mode) {
  SC.k = k; SC.sub = sub || ''; SC.mode = mode || 'teach';
  const S = SCENE_MAP[k] || { n: '工作票陪练' }, D = SC_DEF[k] || {};
  openDrill(`${S.n}`, D.title || D.task || '', `<div class="hrow">${(D.how || []).map(x => `<div>· <b>${h(x[0])}</b>　${h(x[1])}</div>`).join('') || '按第一种工作票逐项填写停电、验电、接地、遮栏与标示牌等安全措施，提交后逐项比对。'}</div><div class="tk3" style="margin-top:8px">成绩计入「${h((DIM4_MAP[(S.dim || 'op')] || {}).n || '安全作业能力')}」。</div>`,
    `<button class="btn pri" data-go="center">返回场景中心</button>`);
}
function scOpenRec(r) { goPage('review'); }
function pageScene() { return pageCenter(); }
function sceneAfter() { }
