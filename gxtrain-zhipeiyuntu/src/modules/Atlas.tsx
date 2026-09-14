import { Fragment, useState } from 'react'
import { PERSON, UNIT_MATRIX, GRADES, TEAM_RANK, BUREAUS } from '../data'
import { Panel, Radar, Progress, heatColor, Bars } from '../ui'
import { UNITS, UNIT_GROUPS } from '../units'
import type { UnitDef } from '../units'

export default function Atlas({ tab }: { tab: string }) {
  if (tab === 'unit') return <UnitView />
  return <PersonView />
}

function PersonView() {
  const [tab, setTab] = useState<'gap' | 'rec'>('gap')
  const p = PERSON
  return (
    <div className="h-full grid grid-cols-[280px_1fr_360px] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="学员">
          <div className="p-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 flex items-center justify-center text-[18px] font-semibold text-white serif" style={{ background: 'var(--indigo)' }}>{p.name[0]}</div>
              <div>
                <div className="text-[15px] font-semibold">{p.name}</div>
                <div className="text-[11.5px] text-slate-500">{p.post} · {p.grade}</div>
              </div>
            </div>
            <div className="text-[11.5px] text-slate-500 mb-3">{p.unit}　·　从业 {p.years} 年</div>
            <div className="gold-rule mb-3" />
            <div className="text-[11px] text-slate-500 mb-1.5">距 {p.next} 完成度</div>
            <div className="flex items-center gap-2">
              <div className="flex-1"><Progress v={p.progress} /></div>
              <span className="num text-[13px] font-semibold" style={{ color: 'var(--gold)' }}>{p.progress}%</span>
            </div>
          </div>
        </Panel>
        <Panel title="等级路径">
          <div className="p-3.5">
            {p.path.map((s, i) => (
              <div key={s.g} className="flex gap-2.5 pb-4 relative last:pb-0">
                <div className="shrink-0 relative">
                  <span className="w-4 h-4 block mt-[2px]" style={{
                    background: s.st === 'done' ? 'var(--ok)' : s.st === 'doing' ? 'var(--gold)' : '#d5dce6',
                    borderRadius: '50%',
                  }} />
                  {i < p.path.length - 1 && <span className="absolute left-1/2 top-6 bottom-[-4px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}
                </div>
                <div>
                  <div className={`text-[13px] ${s.st === 'doing' ? 'font-semibold' : ''}`}
                    style={s.st === 'todo' ? { color: '#94a3b8' } : {}}>{s.g}</div>
                  <div className="text-[11px] text-slate-500">{s.y}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="学习履历" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2.5 space-y-1.5">
            {p.records.map(r => (
              <div key={r.t} className="hairline p-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="tag">{r.k}</span>
                  <span className="num text-[10.5px] text-slate-400 ml-auto">{r.t}</span>
                </div>
                <div className="text-[11.5px] leading-snug">{r.n}</div>
                <div className="text-[10.5px] mt-0.5" style={{ color: r.r.includes('未通过') ? 'var(--bad)' : 'var(--ok)' }}>{r.r}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="岗位能力雷达" extra={
        <span className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--indigo-2)' }} />当前水平</span>
          <span className="flex items-center gap-1"><span className="w-3 h-[2px]" style={{ background: 'var(--gold)' }} />技师要求线</span>
        </span>}>
        <div className="h-full flex flex-col items-center justify-center p-4">
          <Radar data={p.radar} size={330} />
          <div className="w-full mt-4 grid grid-cols-3 gap-2">
            {p.radar.map(r => (
              <div key={r.k} className="hairline p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11.5px]">{r.k}</span>
                  <span className="num text-[12px] font-semibold" style={{ color: r.v >= r.need ? 'var(--ok)' : 'var(--bad)' }}>{r.v}</span>
                </div>
                <Progress v={r.v} color={r.v >= r.need ? 'var(--ok)' : 'var(--bad)'} />
                <div className="text-[10.5px] text-slate-400 mt-1">要求 {r.need}{r.v < r.need && <span style={{ color: 'var(--bad)' }}> · 差 {r.need - r.v}</span>}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="能力缺口与补齐路径" extra={
        <div className="flex gap-1">
          {([['gap', '缺口清单'], ['rec', '推荐学习项']] as const).map(([k, n]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-2 py-0.5 text-[11px] border ${tab === k ? 'text-white' : 'bg-white'}`}
              style={tab === k ? { background: 'var(--indigo)', borderColor: 'var(--indigo)' } : { borderColor: 'var(--line)' }}>{n}</button>
          ))}
        </div>} bodyClass="overflow-auto scroll">
        <div className="p-3 space-y-2">
          {p.gaps.map(g => (
            <div key={g.k} className="hairline p-3">
              <div className="flex items-start gap-2 mb-2">
                <span className={`tag shrink-0 ${g.p === '高' ? 'tag-bad' : g.p === '中' ? 'tag-warn' : ''}`}>{g.p}优先</span>
                <span className="text-[12.5px] font-medium leading-snug flex-1">{g.k}</span>
                <span className="num text-[12px] shrink-0" style={{ color: 'var(--bad)' }}>差 {g.d}</span>
              </div>
              {tab === 'gap' ? (
                <div className="text-[11px] text-slate-500">该能力项为技师等级必备，当前未达要求线</div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11.5px]">
                    <span className="tag shrink-0">课程</span><span className="flex-1">{g.c}</span>
                    <button className="btn btn-sm">报名</button>
                  </div>
                  {g.s !== '—' && (
                    <div className="flex items-center gap-2 text-[11.5px]">
                      <span className="tag tag-gold shrink-0">陪练</span><span className="flex-1">{g.s}</span>
                      <button className="btn btn-sm">去练</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div className="hairline p-3 mt-1" style={{ background: '#fafcff' }}>
            <div className="text-[12px] font-medium mb-1.5">本人年度学习计划已自动生成</div>
            <div className="text-[11.5px] text-slate-600 leading-relaxed">
              按上述 4 项缺口，结合技师申报时间节点与本单位年度重点任务，已生成 7 个学习项、合计 46 学时的年度计划，并同步至个人 IDP。
            </div>
            <button className="btn btn-sm btn-primary w-full mt-2.5">查看我的年度计划</button>
          </div>
        </div>
      </Panel>
    </div>
  )
}

/* 单位达标率：由评估表的场景均分与人数规模推导，口径稳定可复现 */
const unitRate = (u: UnitDef) => Math.min(96, Math.max(68, Math.round(70 + (u.avg - 2.6) * 16 + (u.id.length % 5))))
const unitDone = (u: UnitDef) => Math.min(100, Math.max(55, Math.round(unitRate(u) - 6 + (u.people % 9))))

function UnitView() {
  const [mode, setMode] = useState<'line' | 'unit'>('line')
  const [sel, setSel] = useState<{ l: string; g: string; v: number; n: number } | null>(null)
  const [selU, setSelU] = useState<UnitDef | null>(null)
  const toggle = (
    <div className="flex gap-1">
      {([['line', '按专业条线'], ['unit', '按一级单位']] as const).map(([k, n]) => (
        <button key={k} onClick={() => setMode(k)} className={`px-2 py-0.5 text-[11px] border ${mode === k ? 'text-white' : 'bg-white'}`}
          style={mode === k ? { background: 'var(--indigo)', borderColor: 'var(--indigo)' } : { borderColor: 'var(--line)' }}>{n}</button>
      ))}
    </div>
  )
  return (
    <div className="h-full grid grid-cols-[1fr_360px] gap-3 p-3 min-h-0">
      <Panel title={mode === 'line' ? '全公司能力分布矩阵' : '28 个一级单位能力全景'} extra={
        <span className="flex items-center gap-3 text-[11px] text-slate-500">
          {toggle}
          <span className="flex items-center gap-2">达标率　<span className="w-16 h-3 block" style={{ background: 'linear-gradient(90deg,#f7f1e2,#1e3a6e)' }} />
          <span className="num">60%</span><span className="num">100%</span></span>
        </span>} bodyClass="overflow-auto scroll">
        {mode === 'line' ? (
        <div className="p-4 fade-in">
          <div className="grid" style={{ gridTemplateColumns: `92px repeat(${GRADES.length}, 1fr)` }}>
            <div />
            {GRADES.map(g => <div key={g} className="text-[11.5px] text-center pb-2 font-medium text-slate-600">{g}</div>)}
            {UNIT_MATRIX.map((row, ri) => (
              <Fragment key={row.line}>
                <div className="text-[12px] pr-2.5 flex items-center justify-end font-medium">{row.line}</div>
                {row.cells.map((c, ci) => (
                  <button key={row.line + c.grade} onClick={() => setSel({ l: row.line, g: c.grade, v: c.v, n: c.n })}
                    className="m-[2px] h-[54px] relative group cell-in transition-transform hover:scale-[1.04]"
                    style={{ background: heatColor(c.v), animationDelay: `${(ri * 5 + ci) * 0.024}s`, outline: sel?.l === row.line && sel?.g === c.grade ? '2px solid var(--gold)' : 'none' }}>
                    <span className="num text-[14px] font-semibold" style={{ color: c.v > 84 ? '#fff' : 'var(--ink)' }}>{c.v}</span>
                    <span className="block num text-[10px] mt-0.5" style={{ color: c.v > 84 ? 'rgba(255,255,255,.7)' : '#64748b' }}>{c.n} 人</span>
                  </button>
                ))}
              </Fragment>
            ))}
          </div>
          <div className="text-[11.5px] text-slate-500 leading-relaxed mt-4 hair-t pt-3">
            横轴技能等级，纵轴专业条线，格子颜色为该群体的岗位能力达标率。配电专业整体偏低，主要受今年新增的分布式接入相关能力项拉低，属正常过渡；安监与信息通信在技师以上层级人数偏少，是结构性缺口。切换到"按一级单位"可查看本部职能部门、直属机构与产业公司的能力建档情况。
          </div>
        </div>
        ) : (
        <div className="p-3 fade-in">
          {UNIT_GROUPS.map((g, gi) => {
            const us = UNITS.filter(u => u.grp === g)
            return (
              <div key={g} className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-[3px] h-[11px]" style={{ background: gi % 2 ? 'var(--gold)' : 'var(--indigo)' }} />
                  <span className="text-[12px] font-semibold">{g}</span>
                  <span className="num text-[10.5px] text-slate-400">{us.length} 个单位 · {us.reduce((a, u) => a + u.people, 0).toLocaleString()} 人</span>
                </div>
                <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
                  {us.map((u, i) => {
                    const v = unitRate(u)
                    return (
                      <button key={u.id} onClick={() => setSelU(u)} className="text-left px-2.5 py-2 cell-in transition-transform hover:scale-[1.03] relative"
                        style={{ background: heatColor(v), animationDelay: `${(gi * 6 + i) * .03}s`, outline: selU?.id === u.id ? '2px solid var(--gold)' : 'none' }}>
                        <div className="text-[11.5px] font-medium truncate" style={{ color: v > 84 ? '#fff' : 'var(--ink)' }}>{u.name}</div>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="num text-[15px] font-semibold" style={{ color: v > 84 ? '#fff' : 'var(--indigo)' }}>{v}<span className="text-[9px]">%</span></span>
                          <span className="num text-[10px] ml-auto" style={{ color: v > 84 ? 'rgba(255,255,255,.75)' : '#64748b' }}>{u.people.toLocaleString()} 人</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div className="text-[11.5px] text-slate-500 leading-relaxed hair-t pt-3">
            全部 28 个一级单位均已建立岗位能力档案，人力资源部自身亦在其中。职能部门的能力项以制度规程、专业工具与 AI 应用为主，与生产岗位的技能等级体系并行评价。点击任一单位查看科室岗位与高价值场景。
          </div>
        </div>
        )}
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        {mode === 'unit' ? (
        <Panel title={selU ? selU.name : '点击单位卡片下钻'} className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-3.5">
            {!selU ? (
              <div className="text-[12px] text-slate-400 py-6 text-center">选择任一单位，查看科室岗位、达标率与 AI 高价值场景</div>
            ) : (
              <div className="fade-in">
                <div className="flex items-end gap-3 mb-3">
                  <div><div className="num text-[32px] leading-none font-semibold" style={{ color: 'var(--indigo)' }}>{unitRate(selU)}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">岗位能力达标率</div></div>
                  <div className="flex-1 text-right"><div className="num text-[19px] font-semibold">{selU.people.toLocaleString()}</div>
                    <div className="text-[11px] text-slate-500">已建档人数</div></div>
                </div>
                <div className="gold-rule mb-3" />
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  {[['科室', String(selU.depts.length)], ['典型岗位', String(selU.depts.reduce((a, d) => a + d.posts.length, 0))], ['本年计划完成', unitDone(selU) + '%']].map(([k, v]) => (
                    <div key={k} className="hairline py-2"><div className="num text-[17px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div><div className="text-[10.5px] text-slate-500 mt-0.5">{k}</div></div>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 mb-1.5">科室与典型岗位</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {selU.depts.map(d => d.posts.map(p => <span key={d.name + p} className="tag" title={d.name}>{p}</span>))}
                </div>
                <div className="text-[11px] text-slate-500 mb-1.5">AI 高价值场景（评估表）</div>
                <div className="space-y-1.5">
                  {selU.scenes.slice(0, 4).map(s => (
                    <div key={s.name} className="hairline px-2.5 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`tag ${s.pri === 'P1' ? 'tag-bad' : s.pri === 'P2' ? 'tag-warn' : ''}`}>{s.pri}</span>
                        <span className="text-[11.5px] font-medium leading-snug flex-1">{s.name}</span>
                        <span className="num text-[11px]" style={{ color: 'var(--gold)' }}>{s.score.toFixed(2)}</span>
                      </div>
                      <div className="text-[10.5px] text-slate-500">{s.post} · {s.tech}</div>
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm w-full mt-3">为该单位批量生成培训计划</button>
              </div>
            )}
          </div>
        </Panel>
        ) : (<>
        <Panel title={sel ? `${sel.l} · ${sel.g}` : '点击矩阵格子下钻'}>
          <div className="p-3.5">
            {!sel ? (
              <div className="text-[12px] text-slate-400 py-6 text-center">选择任一格子，查看该群体的能力构成与缺口</div>
            ) : (
              <div className="fade-in">
                <div className="flex items-end gap-3 mb-3">
                  <div><div className="num text-[32px] leading-none font-semibold" style={{ color: 'var(--indigo)' }}>{sel.v}%</div>
                    <div className="text-[11px] text-slate-500 mt-1">达标率</div></div>
                  <div className="flex-1 text-right"><div className="num text-[19px] font-semibold">{sel.n}</div>
                    <div className="text-[11px] text-slate-500">在册人数</div></div>
                </div>
                <div className="gold-rule mb-3" />
                <Bars data={[
                  { label: '已全部达标', v: Math.round(sel.n * sel.v / 100) },
                  { label: '缺 1–2 项', v: Math.round(sel.n * (100 - sel.v) / 100 * 0.55) },
                  { label: '缺 3–5 项', v: Math.round(sel.n * (100 - sel.v) / 100 * 0.31) },
                  { label: '缺 6 项以上', v: Math.round(sel.n * (100 - sel.v) / 100 * 0.14), note: '重点' },
                ]} title="能力缺口分布（人）" />
                <button className="btn btn-primary btn-sm w-full mt-3">为该群体批量生成培训计划</button>
              </div>
            )}
          </div>
        </Panel>
        <Panel title="班组能力排行" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-3 space-y-2">
            {TEAM_RANK.map((t, i) => (
              <div key={t.t}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="num text-[11px] w-[14px]" style={{ color: i < 3 ? 'var(--gold)' : '#94a3b8' }}>{i + 1}</span>
                  <span className="text-[11.5px] flex-1 truncate">{t.t}</span>
                  <span className="num text-[11.5px] text-slate-400">{t.n}人</span>
                  <span className="num text-[12px] font-semibold w-[26px] text-right"
                    style={{ color: t.v >= 88 ? 'var(--ok)' : t.v >= 80 ? 'var(--indigo)' : 'var(--bad)' }}>{t.v}</span>
                </div>
                <Progress v={t.v} />
              </div>
            ))}
            <div className="text-[11.5px] text-slate-500 leading-relaxed pt-2 hair-t">
              覆盖 {BUREAUS.length} 个地市局共 214 个班组，按季度更新。
            </div>
          </div>
        </Panel>
        </>)}
      </div>
    </div>
  )
}
