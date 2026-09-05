// Merge the five domain catalogs into src/data/capabilities.json and verify coverage
// against src/data/plan.json (the customer's xlsx hierarchy).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const srcDir = process.argv[2] ?? path.resolve(root, 'catalog-src');
const plan = JSON.parse(fs.readFileSync(path.join(root, 'src/data/plan.json'), 'utf8'));

const files = fs.readdirSync(srcDir).filter((f) => f.startsWith('catalog_') && f.endsWith('.json'));
const functions = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(srcDir, f), 'utf8'));
  for (const fn of d.functions) functions.push(fn);
}
// coverage check
const allPoints = new Map(); // key level|module|course|point -> seen
for (const [level, tree] of Object.entries(plan))
  for (const [, mods] of Object.entries(tree))
    for (const [module, courses] of Object.entries(mods))
      for (const [course, pts] of Object.entries(courses))
        for (const p of pts) allPoints.set(`${level}|${module.split('（')[0]}|${course}|${p}`, false);
let seen = 0;
for (const fn of functions)
  for (const s of fn.sources ?? [])
    for (const p of s.points ?? []) {
      const k = `${s.level}|${String(s.module).split('（')[0]}|${s.course}|${p}`;
      if (allPoints.has(k) && !allPoints.get(k)) { allPoints.set(k, true); seen++; }
    }
const missing = [...allPoints.entries()].filter(([, v]) => !v).map(([k]) => k);
const courses = new Set(); for (const fn of functions) for (const s of fn.sources ?? []) courses.add(`${s.level}|${s.course}`);
const out = { functions, stats: { products: new Set(functions.map((f) => f.product)).size, functions: functions.length, sourceCourses: courses.size, points: seen } };
fs.writeFileSync(path.join(root, 'src/data/capabilities.json'), JSON.stringify(out, null, 1));
console.log(`functions=${functions.length} products=${out.stats.products} courses=${courses.size} points=${seen}/${allPoints.size} missing=${missing.length}`);
if (missing.length) { console.log(missing.slice(0, 40).join('\n')); }
