// 场景库与痛点库校验：字段、取值、标签闭环、覆盖度、行业齐全
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'data', 'sectors');
const industries = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '_shared', 'industries.json'), 'utf8'));
const SYS = ['erp', 'finance', 'crm', 'oa', 'mes', 'shop', 'hr'];
const MODS = ['AI获客', 'AI人力官', 'AI CFO', 'AI法务', 'AI流程提效', 'AI决策', 'AI ERP', 'AI软件开发'];
const COSTS = ['零', '轻', '中', '重'];
const GROUPS = ['sales', 'deliver', 'cost', 'org'];
let fail = 0, scenes = 0, pains = 0;
const bad = (f, m) => { fail++; console.log(`  ✘ ${f}: ${m}`); };
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const want = industries.sectors.map((s) => s.key);
const got = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const k = f.replace('.json', '');
  got.push(d.sector);
  if (d.sector !== k) bad(f, `sector 字段 ${d.sector} 与文件名不符`);
  const sec = industries.sectors.filter((s) => s.key === d.sector)[0];
  if (!sec) bad(f, 'sector 不在行业表中'); else if (sec.name !== d.sectorName) bad(f, `sectorName 应为 ${sec.name}`);
  if (d.pains.length !== 16) bad(f, `痛点 ${d.pains.length} 条，应为 16`);
  if (d.scenes.length !== 13) bad(f, `场景 ${d.scenes.length} 个，应为 13`);
  pains += d.pains.length; scenes += d.scenes.length;
  const tags = new Set();
  d.pains.forEach((p, i) => {
    if (p.id !== `${k}-p${String(i + 1).padStart(2, '0')}`) bad(f, `痛点 id ${p.id} 编号不连续`);
    if (GROUPS.indexOf(p.group) < 0) bad(f, `${p.id} group ${p.group} 非法`);
    if (!p.tag || p.tag.length > 6) bad(f, `${p.id} tag「${p.tag}」长度异常`);
    if (tags.has(p.tag)) bad(f, `${p.id} tag「${p.tag}」重复`);
    tags.add(p.tag);
    ['text', 'hint'].forEach((x) => { if (!p[x] || !p[x].length) bad(f, `${p.id}.${x} 缺失`); });
  });
  GROUPS.forEach((g) => { const n = d.pains.filter((p) => p.group === g).length; if (n !== 4) bad(f, `分组 ${g} 有 ${n} 条，应为 4`); });
  const used = new Set();
  d.scenes.forEach((s, i) => {
    if (s.id !== `${k}-s${String(i + 1).padStart(2, '0')}`) bad(f, `场景 id ${s.id} 编号不连续`);
    ['name', 'stage', 'user', 'replaces', 'metric', 'firstStep', 'precondition', 'roiBasis'].forEach((x) => { if (!s[x] || !String(s[x]).length) bad(f, `${s.id}.${x} 缺失`); });
    if (!Array.isArray(s.painTags) || !s.painTags.length || s.painTags.length > 2) bad(f, `${s.id}.painTags 需为 1–2 个`);
    (s.painTags || []).forEach((t) => { if (!tags.has(t)) bad(f, `${s.id} 引用了不存在的痛点标签「${t}」`); used.add(t); });
    if (!Array.isArray(s.dataDeps)) bad(f, `${s.id}.dataDeps 需为数组`);
    (s.dataDeps || []).forEach((x) => { if (SYS.indexOf(x) < 0) bad(f, `${s.id} dataDeps 含非法系统「${x}」`); });
    if (!Array.isArray(s.dataList) || s.dataList.length !== 3) bad(f, `${s.id}.dataList 需为 3 项`);
    [['value', 1, 5], ['cycle', 1, 5], ['barrier', 1, 5], ['weeks', 2, 20]].forEach(([x, lo, hi]) => {
      if (!(Number.isInteger(s[x]) && s[x] >= lo && s[x] <= hi)) bad(f, `${s.id}.${x} = ${s[x]}，应为 ${lo}–${hi} 的整数`);
    });
    if (COSTS.indexOf(s.cost) < 0) bad(f, `${s.id}.cost「${s.cost}」非法`);
    if (MODS.indexOf(s.module) < 0) bad(f, `${s.id}.module「${s.module}」非法`);
  });
  [...tags].forEach((t) => { if (!used.has(t)) bad(f, `痛点标签「${t}」未被任何场景引用`); });
  const mods = new Set(d.scenes.map((s) => s.module));
  if (mods.size < 5) bad(f, `只覆盖 ${mods.size} 个模块，应至少 5 个`);
  const costs = new Set(d.scenes.map((s) => s.cost));
  COSTS.forEach((c) => { if (!costs.has(c)) bad(f, `投入档「${c}」未出现`); });
  const zero = d.scenes.filter((s) => !s.dataDeps.length).length;
  if (zero < 3) bad(f, `零数据依赖场景 ${zero} 个，应至少 3 个`);
  const bs = d.scenes.map((s) => s.barrier);
  if (!bs.some((b) => b <= 2)) bad(f, '缺少门槛 1–2 的场景');
  if (!bs.some((b) => b >= 4)) bad(f, '缺少门槛 4–5 的场景');
}
want.forEach((k) => { if (got.indexOf(k) < 0) bad('（缺文件）', `行业大类 ${k} 没有场景库`); });
console.log(`场景库：${files.length} / ${want.length} 个大类 · ${scenes} 个场景 · ${pains} 条痛点 · 问题 ${fail} 处`);
process.exitCode = fail ? 1 : 0;
