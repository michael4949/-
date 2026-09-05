import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import planJson from '../data/plan.json';
import catalogJson from '../data/capabilities.json';
import type { Catalog, ProductFunction } from '../data/types';
import { productById } from '../data/products';
import { expandQuery } from '../data/aliases';
import { Icon } from '../components/Shell';
import './pages.css';

/** 级别 → 能力域（含课时） → 模块（含课时） → 课程 → 能力点[] */
type Plan = Record<string, Record<string, Record<string, Record<string, string[]>>>>;
const PLAN = planJson as unknown as Plan;
const CATALOG = catalogJson as unknown as Catalog;

const strip = (s: string) => s.split('（')[0];
const hours = (s: string) => s.match(/（(.*?)）/)?.[1] ?? '';
const LEVELS = Object.keys(PLAN);
const DOMAINS = Object.keys(PLAN[LEVELS[0]] ?? {}).map(strip);
const DEMO = new Set(['P01', 'P03', 'P06', 'P07', 'P08', 'P09', 'P14']);

interface PointRow { level: string; domain: string; module: string; course: string; point: string }
interface ModuleRow { level: string; domain: string; module: string; courses: string[] }
const ROWS: PointRow[] = [];
const MODULES: ModuleRow[] = [];
for (const [level, doms] of Object.entries(PLAN))
  for (const [domKey, mods] of Object.entries(doms))
    for (const [modKey, courses] of Object.entries(mods)) {
      MODULES.push({ level, domain: strip(domKey), module: modKey, courses: Object.keys(courses) });
      for (const [course, pts] of Object.entries(courses))
        for (const point of pts) ROWS.push({ level, domain: strip(domKey), module: modKey, course, point });
    }
const TOTAL = {
  levels: LEVELS.length, domains: DOMAINS.length, modules: MODULES.length,
  courses: MODULES.reduce((s, m) => s + m.courses.length, 0), points: ROWS.length,
};

/** 反查：level|course → 功能；level|course|point → 功能 */
const COURSE_MAP = new Map<string, ProductFunction[]>();
const POINT_MAP = new Map<string, ProductFunction[]>();
for (const fn of CATALOG.functions)
  for (const s of fn.sources ?? []) {
    const ck = `${s.level}|${s.course}`;
    if (!COURSE_MAP.get(ck)?.includes(fn)) COURSE_MAP.set(ck, [...(COURSE_MAP.get(ck) ?? []), fn]);
    for (const p of s.points ?? []) {
      const pk = `${ck}|${p}`;
      if (!POINT_MAP.get(pk)?.includes(fn)) POINT_MAP.set(pk, [...(POINT_MAP.get(pk) ?? []), fn]);
    }
  }
const HAS_CATALOG = CATALOG.functions.length > 0;

function domainKeyOf(level: string, domain: string) {
  return Object.keys(PLAN[level] ?? {}).find((k) => strip(k) === domain) ?? '';
}
function cellStats(level: string, domain: string) {
  const mods = PLAN[level]?.[domainKeyOf(level, domain)] ?? {};
  const modules = Object.keys(mods).length;
  let courses = 0, points = 0;
  for (const c of Object.values(mods)) { courses += Object.keys(c).length; for (const p of Object.values(c)) points += p.length; }
  return { modules, courses, points, hours: hours(domainKeyOf(level, domain)) };
}

/** 功能映射 chip：已演示 / 样例；目录为空时显示"映射生成中" */
function FnChips({ fns }: { fns: ProductFunction[] }) {
  if (!HAS_CATALOG) return <span className="chip pending"><Icon name="Loader" size={11} /> 映射生成中</span>;
  if (!fns.length) return <span className="chip pending">待映射</span>;
  return (
    <>
      {fns.map((f) => {
        const p = productById(f.product); const demo = DEMO.has(f.product);
        return (
          <Link key={f.id} to={`/p/${f.product}`} className={`chip ${demo ? 'demo' : 'sample'}`} title={f.summary}>
            {p?.name ?? f.product}｜{f.name} <small>{demo ? '已演示' : '样例'}</small>
          </Link>
        );
      })}
    </>
  );
}

function hl(text: string, terms: string[]): ReactNode {
  const t = [...terms].sort((a, b) => b.length - a.length).find((x) => x && text.includes(x));
  if (!t) return text;
  const i = text.indexOf(t);
  return <>{text.slice(0, i)}<mark className="hl">{t}</mark>{text.slice(i + t.length)}</>;
}

const bigrams = (s: string) => { const set = new Set<string>(); for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2)); return set; };

export default function CapabilityMap() {
  const [view, setView] = useState<string>('all');
  const [sel, setSel] = useState<{ level: string; domain: string } | null>(null);
  const [q, setQ] = useState('');

  const search = useMemo(() => {
    const ex = expandQuery(q.trim());
    if (!ex.raw.length) return null;
    const terms = ex.terms.filter(Boolean);
    const scored = ROWS.map((r) => {
      let s = 0;
      for (const t of terms) { if (r.point.includes(t)) s += 5; else if (r.course.includes(t)) s += 3; else if (strip(r.module).includes(t)) s += 2; }
      return { r, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    if (scored.length) return { ex, hits: scored.slice(0, 40), total: scored.length, fallback: [] as { m: ModuleRow; o: number }[] };
    // 无命中：按二元组 + 单字重合度找最接近的 3 个模块
    const qb = new Set(terms.flatMap((t) => [...bigrams(t)]));
    const qc = new Set(terms.join('').split(''));
    const fallback = MODULES.map((m) => {
      const text = strip(m.module) + m.courses.join('');
      const mb = bigrams(text); let o = 0;
      qb.forEach((b) => { if (mb.has(b)) o += 3; });
      qc.forEach((c) => { if (text.includes(c)) o += 1; });
      return { m, o };
    }).sort((a, b) => b.o - a.o).slice(0, 3);
    return { ex, hits: [], total: 0, fallback };
  }, [q]);

  const rowsToShow = view === 'all' ? LEVELS : LEVELS.filter((l) => l === view);
  const selMods = sel ? PLAN[sel.level]?.[domainKeyOf(sel.level, sel.domain)] ?? {} : null;
  const locate = (level: string, domain: string) => { setSel({ level, domain }); if (view !== 'all' && view !== level) setView(level); };

  return (
    <div>
      <div className="page-h">
        <div>
          <h1><span className="iris-text">能力地图</span></h1>
          <p>来自客户培养方案 xlsx：三级 × 五能力域 × 模块 × 课程 × 能力点，每个能力点均映射到产品功能</p>
        </div>
        <div className="seg">
          <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>全部</button>
          {LEVELS.map((l) => <button key={l} className={view === l ? 'on' : ''} onClick={() => setView(l)}>按级别 · {l}</button>)}
        </div>
      </div>

      <div className="tiles" style={{ marginBottom: 16 }}>
        <div className="tile"><b className="num red-text">{TOTAL.levels}</b><span>级别（初级 / 中级 / 资深）</span></div>
        <div className="tile"><b className="num gold-text">{TOTAL.domains}</b><span>能力域</span></div>
        <div className="tile"><b className="num">{TOTAL.modules}</b><span>模块</span></div>
        <div className="tile"><b className="num">{TOTAL.courses}</b><span>课程</span></div>
        <div className="tile"><b className="num green-text">{TOTAL.points}</b><span>能力点</span></div>
        <div className="tile"><b className="num iris-text">{HAS_CATALOG ? CATALOG.stats.functions : '…'}</b><span>{HAS_CATALOG ? `产品功能 · 覆盖 ${CATALOG.stats.points} 点` : '产品功能映射生成中'}</span></div>
      </div>

      <div className="card">
        <div className="searchbox">
          <Icon name="Search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='搜索能力点全文，支持业务口语别名：试试"票据""存款""开户""续贷""反洗钱"' />
          {q && <button className="btn ghost sm" onClick={() => setQ('')}><Icon name="X" size={12} /> 清除</button>}
        </div>
        {search && (
          <div style={{ marginTop: 12 }}>
            {search.ex.hits.length > 0 && (
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="muted">别名展开：</span>
                {search.ex.hits.map((h) => <span key={h.alias} className="chip orange"><i />{h.alias} → {h.targets.join(' / ')}</span>)}
              </div>
            )}
            {search.hits.length > 0 ? (
              <>
                <p className="muted" style={{ marginBottom: 8 }}>命中 {search.total} 个能力点{search.total > 40 ? '，显示前 40 个' : ''}</p>
                {search.hits.map(({ r }, i) => {
                  const fns = POINT_MAP.get(`${r.level}|${r.course}|${r.point}`) ?? COURSE_MAP.get(`${r.level}|${r.course}`) ?? [];
                  return (
                    <div className="hit fade-in" key={i}>
                      <div className="grow">
                        <div className="path">{r.level} › {r.domain} › {strip(r.module)} › {r.course}</div>
                        <div className="pt">{hl(r.point, search.ex.terms)}</div>
                        <div className="maps"><FnChips fns={fns} /></div>
                      </div>
                      <button className="btn ghost sm" onClick={() => locate(r.level, r.domain)}><Icon name="Crosshair" size={12} /> 定位</button>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="note red" style={{ marginBottom: 10 }}>
                  未直接命中能力点。以下是最接近的 3 个模块；若确属业务所需，<b>可在 POC 中新增功能</b>并纳入功能目录（不改变客户方案层级）。
                </div>
                {search.fallback.map(({ m }, i) => (
                  <div className="hit" key={i}>
                    <div className="grow">
                      <div className="path">{m.level} › {m.domain}</div>
                      <div className="pt">{strip(m.module)} <span className="chip" style={{ marginLeft: 6 }}>{hours(m.module)}</span></div>
                      <div className="muted">课程：{m.courses.join(' · ')}</div>
                    </div>
                    <button className="btn ghost sm" onClick={() => locate(m.level, m.domain)}><Icon name="Crosshair" size={12} /> 定位</button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="sec">
        <div className="sec-h"><h2><Icon name="Grid3x3" size={16} /> 三级 × 五能力域矩阵</h2><p>每格：模块数 / 课程数 / 能力点数 · 点击展开 模块 → 课程 → 能力点</p></div>
        <div className="matrix">
          <div className="mx-h">级别 \ 能力域</div>
          {DOMAINS.map((d) => <div className="mx-h" key={d}>{d}</div>)}
          {rowsToShow.map((level) => {
            const li = LEVELS.indexOf(level);
            return [
              <div className={`mx-l l${li}`} key={`${level}-h`}>{level}<small>{DOMAINS.reduce((s, d) => s + cellStats(level, d).points, 0)} 点</small></div>,
              ...DOMAINS.map((d, di) => {
                const c = cellStats(level, d); const on = sel?.level === level && sel?.domain === d;
                return (
                  <div key={`${level}-${d}`} className={`cell d${di}${on ? ' on' : ''}`} onClick={() => setSel(on ? null : { level, domain: d })}>
                    <div className="hrs">{level} · {d} · {c.hours}</div>
                    <div className="nums">
                      <div><b>{c.modules}</b><span>模块</span></div>
                      <div><b>{c.courses}</b><span>课程</span></div>
                      <div><b>{c.points}</b><span>能力点</span></div>
                    </div>
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>

      {sel && selMods && (
        <div className="sec fade-in">
          <div className="sec-h">
            <h2><Icon name="ListTree" size={16} /> {sel.level} · {sel.domain} <span className="chip">{cellStats(sel.level, sel.domain).hours}</span></h2>
            <div className="row">
              <span className="chip demo">已演示 = 有示范场景</span><span className="chip sample">样例 = 功能页运行示例</span>
              <button className="btn ghost sm" onClick={() => setSel(null)}><Icon name="X" size={12} /> 收起</button>
            </div>
          </div>
          <div className="tree">
            {Object.entries(selMods).map(([modKey, courses], mi) => (
              <div className={`card ${['red', 'gold', 'green', 'blue', 'purple'][mi % 5]}`} key={modKey}>
                <div className="card-h"><div className="card-t"><span className="dot" />{strip(modKey)}</div><span className="chip">{hours(modKey)}</span></div>
                {Object.entries(courses).map(([course, pts]) => (
                  <div className="course" key={course}>
                    <div className="ct"><span>{course}</span><span className="muted">{pts.length} 个能力点</span></div>
                    <ul>{pts.map((p) => <li key={p}>{p}</li>)}</ul>
                    <div className="maps"><FnChips fns={COURSE_MAP.get(`${sel.level}|${course}`) ?? []} /></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
