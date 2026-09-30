// 从 _shared/profile-fields.json + _shared/industries.json 生成 _shared/company-profile.schema.json
// 画像字段或行业表改动后重跑一次；validate-schema.js 会检查生成物与数据表是否一致。
const fs = require('fs');
const path = require('path');
const shared = path.join(__dirname, '..', '..', '_shared');
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pf = J(path.join(shared, 'profile-fields.json'));
const ind = J(path.join(shared, 'industries.json'));

const slugs = ind.sectors.flatMap((s) => s.industries.map((i) => i.slug));
const sectorLine = ind.sectors.map((s) => `${s.name}(${s.industries.length})`).join(' / ');
const DESC = {
  name: '企业名称，选填；为空时报告与回复一律用「本企业」',
  industry: `内部细分行业 slug（${ind.sectors.length} 大类 / ${slugs.length} 细分：${sectorLine}），见 industries.json；顶栏 6 行业按 display[].default 落到默认细分`,
  size: '人员规模', revenue: '上年营收', province: '所在地（省级行政区简称，如「浙江」「广东」；带「省」「市」后缀的先去掉）',
  years: '成立年限', ownership: '企业性质', customers: '主要客户类型',
  systems: '现有业务系统，可多选；「none」（无）只能单独出现', itStaff: '数字化专职人员',
  branches: '分支机构 / 门店，选填', overseas: '海外业务，选填', role: '填表人，选填'
};
const props = {};
const required = [];
for (const f of pf.fields) {
  const p = { description: DESC[f.key] || f.label };
  if (f.type === 'text') Object.assign(p, { type: 'string', maxLength: 60 });
  else if (f.type === 'industry') Object.assign(p, { type: 'string', enum: slugs });
  else if (f.type === 'select' && f.key === 'province') Object.assign(p, { type: 'string', minLength: 1, examples: pf.provinces });
  else if (f.type === 'chips') Object.assign(p, { type: 'string', enum: f.options.map((o) => o.v), 'x-labels': Object.fromEntries(f.options.map((o) => [o.v, o.t])) });
  else if (f.type === 'multi') {
    const ex = f.options.filter((o) => o.exclusive).map((o) => o.v);
    Object.assign(p, { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', enum: f.options.map((o) => o.v) }, 'x-labels': Object.fromEntries(f.options.map((o) => [o.v, o.t])) });
    if (ex.length) p.not = { allOf: [{ contains: { enum: ex } }, { minItems: 2 }] };
  }
  props[f.key] = p;
  if (f.required) required.push(f.key);
}
const schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'dgg/shared/company-profile',
  $comment: '由 skills/01-ai-maturity/scripts/gen-profile-schema.js 生成，请勿手改；改 _shared/profile-fields.json 或 _shared/industries.json 后重新生成',
  title: '企业画像',
  description: `11 个模块共用的第一个输入（${pf.fields.length} 项，其中 ${required.length} 项必填）。体验版三连之间、以及角色模块读取体验版结果时，传递的就是这个对象；字段顺序即追问顺序。`,
  type: 'object',
  properties: props,
  required,
  additionalProperties: false
};
const out = path.join(shared, 'company-profile.schema.json');
fs.writeFileSync(out, JSON.stringify(schema, null, 2) + '\n');
console.log(`已生成 ${path.relative(process.cwd(), out)}：${pf.fields.length} 字段（必填 ${required.length}）· 行业枚举 ${slugs.length} 项`);
