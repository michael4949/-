// 构建期跑一次：读模块 2 的场景库，给 182 个场景各归一组收益杠杆，写进 data/scene-levers.json
// 归的是「集合」不是「顺序」——哪条杠杆当主口径，运行期按各自算出的金额大小定，与 roiBasis 的行文顺序无关。
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '..', '02-scene-ranking', 'data', 'sectors');

// 关键词只用来判断「这条杠杆在不在」，不看出现位置
const KW = {
  margin:  ['低毛利', '毛利', '报价修正', '定价', '折扣', '溢价', '售价', '运价', '价格', '成本纠偏', '预算执行'],
  cash:    ['资金占用', '资金成本', '周转', '库存', '呆滞', '账期', '回款', '应收', '滞销', '缺货', '现金', '回收金额', '结算周期', '尾款', '提前天'],
  error:   ['返工', '不良', '差错', '货损', '损失', '客诉', '投诉', '罚', '索赔', '赔付', '退换', '退货', '报废', '事故', '纠纷', '逾期', '坏账', '扣款', '违约', '争议', '召回', '改单', '超支', '漏检', '错发', '错单', '缺陷', '风险规避', '加急', '补办', '合规风险', '延期', '拖期', '误期', '催单', '积压', '滞留', '断货', '窜货'],
  revenue: ['转化', '成单', '成交', '签单', '接单', '中标', '线索', '询盘', '复购', '留存', '流失', '客单', '获客', '续费', '续保', '续约', '报名', '到店', '进店', '开卡', '动销', '满意度', '复诊', '到院', '人次', '上门', '预约量', '回头客'],
  output:  ['产值', '产能', '利用率', '停机', '出成率', '开工', '坪效', '上座', '入住', '台效', '可售房', '人效', '人均管', '人均服务', '人均在招', '人均家数', '人均工单', '人均跟进', '人均在管', '空驶', '闲置', '设备产出', '购置推迟'],
  spend:   ['采购', '能耗', '原料成本', '用药', '电费', '运输成本', '物流成本', '外包', '耗材', '备件', '费用下降', '支出下降', '里程', '获取成本'],
  hours:   ['工时', '人工', '人力', '上手', '培训', '带教', '沟通', '效率提升', '工作量', '作业时间', '对数', '对账', '对票', '录入', '查找', '核对']
};
const ORDER = ['error', 'revenue', 'cash', 'margin', 'output', 'spend', 'hours'];

// 人工核定：自动归类给不出或给偏的，在这里写死
const OVERRIDES = {
  'fin-s02': ['output', 'hours'],  // 人均在手项目数 = 产出，报告提速 = 工时
  'med-s12': ['error', 'hours']    // 合规风险规避与补办加急费用 = 差错损失
};

const out = {};
let total = 0, auto = 0;
const counts = {};
fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().forEach((f) => {
  const sec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  sec.scenes.forEach((s) => {
    total++;
    const hay = (s.roiBasis || '') + ' ' + (s.metric || '');
    let hit = ORDER.filter((k) => KW[k].some((w) => hay.indexOf(w) >= 0));
    if (OVERRIDES[s.id]) hit = OVERRIDES[s.id];
    else if (hit.length) auto++;
    if (!hit.length) hit = ['hours'];          // 兜底：任何场景至少省沟通与查找的工时
    if (hit.length > 3) hit = hit.slice(0, 3); // 最多三条，再多只会互相稀释
    out[s.id] = hit;
    hit.forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
  });
});
fs.writeFileSync(path.join(__dirname, '..', 'data', 'scene-levers.json'),
  JSON.stringify({ note: '场景 → 收益杠杆集合。构建期由 scripts/gen-scene-levers.js 生成，人工复核后签入；运行期只查表，不跑正则。哪条当主口径由运行期算出的金额决定。', map: out }, null, 0) + '\n');
console.log(`场景 ${total} 个，自动命中 ${auto}，兜底 ${total - auto}`);
console.log('杠杆覆盖：', ORDER.map((k) => `${k} ${counts[k] || 0}`).join(' · '));
const sizes = {};
Object.values(out).forEach((v) => { sizes[v.length] = (sizes[v.length] || 0) + 1; });
console.log('每场景杠杆数：', Object.entries(sizes).map(([k, v]) => `${k} 条 × ${v}`).join(' · '));
