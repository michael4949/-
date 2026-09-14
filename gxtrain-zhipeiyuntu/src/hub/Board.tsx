/* 一级：总览驾驶舱 */
import { Panel, Donut, CountUp } from '../ui'
import { ASSET_KINDS, TOTAL_ASSETS, TREND, HOT_ASSETS, INSIGHTS, unitDist, BATCHES, DOCS, ASSETS, EXPERTS_ALL, SENS_LEVELS } from './data'
import { useNav, Kpi, KindTag, AreaChart } from './nav'
import type { Route } from './nav'

export default function Board() {
  const { push } = useNav()
  const dist = unitDist().slice(0, 12)
  const max = dist[0].n
  const pending = BATCHES.filter(b => b.st === '待审核' || b.st === '处理中').length
  const review = ASSETS.filter(a => a.status === '待复核' || a.status === '待审核').length
  const upcoming = DOCS.filter(d => d.status !== '现行').length
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0">
      <div className="grid grid-cols-6 gap-3 shrink-0">
        <Kpi k="知识资产条目" v={<CountUp to={TOTAL_ASSETS} />} d="规程 · 步骤 · 案例 · 诀窍 · 题目" onClick={() => push({ v: 'catalog' })} spark={TREND.map(t => t.in)} />
        <Kpi k="覆盖一级单位" v={<><CountUp to={28} /><span className="text-[12px] font-normal text-slate-500 ml-1">个</span></>} d="含人力资源部自身 · 176 个岗位" onClick={() => push({ v: 'catalog', dim: 'org' })} />
        <Kpi k="本月入库" v={<CountUp to={1203} />} d="自动通过 71.4% · 人工审核 28.6%" gold onClick={() => push({ v: 'ingest' })} spark={TREND.map(t => t.review)} />
        <Kpi k="本周被引用" v={<CountUp to={TREND[11].ref} />} d="课件 · 题目 · 陪练 · 助手" onClick={() => push({ v: 'graph' })} spark={TREND.map(t => t.ref)} />
        <Kpi k="资产健康度" v={<><CountUp to={91.6} dec={1} /><span className="text-[12px] font-normal text-slate-500 ml-1">分</span></>} d="超期未复核 1,284 · 冲突 96" onClick={() => push({ v: 'quality' })} />
        <Kpi k="在采专家" v={<><CountUp to={EXPERTS_ALL.length} /><span className="text-[12px] font-normal text-slate-500 ml-1">位</span></>} d="覆盖生产、职能与直属单位" gold onClick={() => push({ v: 'expert' })} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[300px_1fr_360px] gap-3">
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="资产构成" extra={<button className="btn btn-sm" onClick={() => push({ v: 'catalog', dim: 'kind' })}>按类型下钻</button>}>
            <div className="p-2 flex items-center gap-3">
              <Donut data={ASSET_KINDS} size={132} />
              <div className="flex-1 space-y-1">
                {ASSET_KINDS.map(k => (
                  <button key={k.k} onClick={() => push({ v: 'catalog', kind: k.k as never })} className="w-full flex items-center gap-2 text-[11.5px] hover:bg-slate-50 px-1 py-0.5">
                    <span className="w-2 h-2" style={{ background: k.c }} /><span className="text-slate-600">{k.k}</span>
                    <span className="ml-auto num text-slate-500">{k.n.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="敏感分级" extra={<button className="btn btn-sm" onClick={() => push({ v: 'quality' })}>权限矩阵</button>}>
            <div className="p-3 space-y-2">
              {SENS_LEVELS.map(s => (
                <div key={s.lvl}>
                  <div className="flex items-center text-[11.5px] mb-1"><span className="font-medium">{s.lvl}</span><span className="text-slate-400 ml-2 text-[10.5px]">{s.who}</span><span className="ml-auto num text-slate-500">{s.n.toLocaleString()}</span></div>
                  <div className="h-[6px] bg-slate-100"><div className="h-full bar-grow" style={{ width: `${s.n / 470}%`, background: s.c }} /></div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="待办" className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-2 space-y-1.5">
              {[
                { k: '入库批次待审核', n: pending, r: { v: 'ingest' } as Route },
                { k: '条目待复核 / 待审核', n: review, r: { v: 'quality' } as Route },
                { k: '规程待生效 / 修订中', n: upcoming, r: { v: 'version' } as Route },
                { k: '专家访谈待启动', n: EXPERTS_ALL.filter(e => e.status === '待启动').length, r: { v: 'expert' } as Route },
              ].map(t => (
                <button key={t.k} onClick={() => push(t.r)} className="w-full flex items-center gap-2 hairline px-2.5 py-2 text-[12px] hover:border-[var(--indigo-2)] hover:bg-slate-50">
                  <span className="w-1.5 h-1.5 pulse-dot" style={{ background: 'var(--gold)' }} /><span>{t.k}</span>
                  <span className="ml-auto num font-semibold" style={{ color: 'var(--indigo)' }}>{t.n}</span><span className="text-[var(--gold)]">›</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="入库、复核与引用趋势　近 12 周">
            <div className="px-3 pt-2 pb-1"><AreaChart data={[TREND.map(t => t.in), TREND.map(t => t.review), TREND.map(t => t.ref / 8)]} keys={['新入库', '复核更新', '被引用（÷8）']} colors={['#1e3a6e', '#a8823a', '#6a86b8']} labels={TREND.map(t => t.w)} h={170} /></div>
          </Panel>
          <Panel title="按一级单位分布　条目数" className="flex-1" bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => push({ v: 'catalog', dim: 'org' })}>全部 28 个单位</button>}>
            <div className="p-3 space-y-[6px]">
              {dist.map((d, i) => (
                <button key={d.u.id} onClick={() => push({ v: 'catalog', unit: d.u.name, dim: 'org' })} className="w-full flex items-center gap-2.5 group">
                  <span className="w-[150px] shrink-0 text-[11.5px] text-right truncate text-slate-600 group-hover:text-[var(--indigo)]">{d.u.name}</span>
                  <span className="flex-1 h-[14px] bg-slate-100 relative overflow-hidden"><span className="absolute inset-y-0 left-0 bar-grow" style={{ width: `${d.n / max * 100}%`, background: d.u.grp === '本部职能部门' ? 'var(--gold)' : d.u.grp === '直属机构' ? '#6a86b8' : 'var(--indigo-2)', animationDelay: `${i * .05}s` }} /></span>
                  <span className="w-[64px] num text-[11.5px] text-slate-600">{d.n.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 w-[70px] text-left">{d.u.grp}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
        <div className="flex flex-col gap-3 min-h-0">
          <Panel title="AI 洞察" extra={<span className="text-[10.5px] text-slate-500">每日 06:00 生成</span>}>
            <div className="p-2 space-y-1.5">
              {INSIGHTS.map(x => (
                <button key={x.k} onClick={() => push(x.go as Route)} className="a-card w-full text-left">
                  <div className="flex items-center gap-2"><span className={`tag tag-${x.tag}`}>{x.k}</span><span className="num text-[12.5px] font-semibold" style={{ color: 'var(--indigo)' }}>{x.v}</span></div>
                  <div className="text-[11px] text-slate-600 leading-snug mt-1">{x.d}</div><span className="go">›</span>
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="热点资产　本周引用" className="flex-1" bodyClass="overflow-auto scroll">
            <div className="p-2 space-y-1">
              {HOT_ASSETS.map((a, i) => (
                <button key={a.id} onClick={() => push({ v: 'asset', id: a.id })} className="w-full text-left flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 row-in" style={{ animationDelay: `${i * .05}s` }}>
                  <span className="num text-[11px] w-[14px]" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</span>
                  <KindTag k={a.kind} /><span className="text-[12px] truncate flex-1">{a.title}</span>
                  <span className="num text-[11px] text-slate-500">{a.use}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
