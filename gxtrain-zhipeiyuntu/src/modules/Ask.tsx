import { useEffect, useRef, useState } from 'react'
import { ASK_ROLES, ASK_BANK, ASK_HOT } from '../data'
import type { AskQA } from '../data'
import { Panel, Bars } from '../ui'

export default function Ask({ tab }: { tab: string }) {
  if (tab === 'hot') return <HotView />
  return <ChatView />
}

type Turn = { q: string; a?: AskQA; typing?: boolean }

function ChatView() {
  const [role, setRole] = useState('dept')
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const feed = useRef<HTMLDivElement>(null)
  const bank = ASK_BANK[role]

  useEffect(() => { setTurns([]) }, [role])
  useEffect(() => { feed.current?.scrollTo({ top: 1e6, behavior: 'smooth' }) }, [turns])

  const ask = (qa: AskQA) => {
    setTurns(t => [...t, { q: qa.q, typing: true }])
    setTimeout(() => setTurns(t => t.map((x, i) => i === t.length - 1 ? { q: qa.q, a: qa } : x)), 900)
  }
  const askFree = () => {
    if (!input.trim()) return
    const hit = bank.find(b => b.q.includes(input.trim()) || input.trim().includes(b.q.slice(0, 4))) || bank[0]
    setInput(''); ask(hit)
  }

  const r = ASK_ROLES.find(x => x.id === role)!

  return (
    <div className="h-full grid grid-cols-[250px_1fr] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="当前身份" extra={<span className="text-[10.5px] text-slate-500">28 个一级单位全员可用</span>}>
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {ASK_ROLES.map(x => (
              <button key={x.id} onClick={() => setRole(x.id)} title={`${x.who} · 数据范围：${x.scope}`}
                className="text-left px-2 py-1.5 hairline hover:border-[var(--indigo-2)] min-w-0"
                style={role === x.id ? { borderColor: 'var(--indigo)', background: 'var(--indigo-soft)' } : {}}>
                <div className="text-[12px] font-semibold truncate">{x.name}</div>
                <div className="text-[10.5px] text-slate-500 truncate">{x.who.split(' · ').slice(-1)[0]}</div>
              </button>
            ))}
          </div>
          <div className="px-2.5 pb-2 text-[10.5px]" style={{ color: 'var(--gold)' }}>{r.who}　·　数据范围：{r.scope}</div>
        </Panel>
        <Panel title="常问的问题" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2.5 space-y-1.5">
            {bank.map(b => (
              <button key={b.q} onClick={() => ask(b)}
                className="w-full text-left text-[12px] leading-snug px-2.5 py-2 hairline hover:border-[var(--indigo-2)] hover:bg-slate-50">
                <span className={`tag ${b.kind === '知识' ? 'tag-gold' : ''} mr-1.5`}>{b.kind}</span>{b.q}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title={`问数助手　${r.name} 视图`} extra={<span className="text-[11px] text-slate-500">{r.who}</span>}>
        <div className="h-full flex flex-col min-h-0">
          <div ref={feed} className="flex-1 overflow-auto scroll p-4 space-y-4">
            {turns.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <svg width="86" height="86" viewBox="0 0 86 86" fill="none">
                  <circle cx="43" cy="43" r="34" stroke="#d8e0ec" strokeWidth="1.4" />
                  <path d="M30 38h26M30 46h18" stroke="#c2cddd" strokeWidth="2" />
                  <circle cx="43" cy="43" r="42" stroke="#eef2f7" strokeWidth="1" />
                </svg>
                <div className="text-[13px] text-slate-500">一个入口，两种问法</div>
                <div className="flex gap-3 text-[11.5px] text-slate-400">
                  <span><b className="text-[var(--gold)]">问知识</b>　规程条款、作业步骤、案例与诀窍，答案带出处</span>
                  <span><b style={{ color: 'var(--indigo-2)' }}>问数据</b>　学时、证照、通过率、完成率，答案带图表</span>
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className="space-y-2.5">
                <div className="flex justify-end">
                  <div className="max-w-[70%] text-[12.5px] px-3 py-2 leading-relaxed" style={{ background: 'var(--indigo)', color: '#fff' }}>{t.q}</div>
                </div>
                {t.typing ? (
                  <div className="text-[12px] text-slate-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 pulse-dot" style={{ background: 'var(--indigo-2)' }} />正在检索知识资产与数据口径…
                  </div>
                ) : t.a && (
                  <div className="fade-in max-w-[86%]">
                    <div className="hairline p-3.5" style={{ background: '#fdfefe' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`tag ${t.a.kind === '知识' ? 'tag-gold' : ''}`}>{t.a.kind}</span>
                        <span className="text-[10.5px] text-slate-400">来源：培训知识资产中枢 · 培训与人事数据（管理信息大区）</span>
                      </div>
                      <div className="text-[12.5px] leading-[1.85]">{t.a.a}</div>
                      {t.a.chart && (
                        <div className="mt-3.5 hair-t pt-3">
                          <Bars title={t.a.chartTitle} data={t.a.chart} />
                        </div>
                      )}
                      {t.a.refs && (
                        <div className="mt-3 hair-t pt-2.5">
                          <div className="text-[10.5px] text-slate-500 mb-1.5">出处</div>
                          <div className="flex flex-wrap gap-1.5">
                            {t.a.refs.map(rf => (
                              <span key={rf.t} className="hairline px-2 py-1 text-[11px]" style={{ background: 'var(--gold-soft)', borderColor: '#e3d2ac' }}>
                                <b style={{ color: 'var(--gold)' }}>{rf.t}</b>
                                <span className="text-slate-500 ml-1.5">{rf.s}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {t.a.follow && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {t.a.follow.map(f => {
                            const hit = bank.find(b => b.q === f)
                            return <button key={f} onClick={() => hit && ask(hit)}
                              className="text-[11.5px] px-2.5 py-1 hairline hover:border-[var(--indigo-2)]">{f}</button>
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="hair-t p-3 flex gap-2 shrink-0">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && askFree()}
              placeholder="问规程、问步骤、问案例，或问学时、证照、通过率、完成率…"
              className="flex-1 hairline px-3 py-2 text-[12.5px] outline-none focus:border-[var(--indigo-2)]" />
            <button className="btn btn-primary" onClick={askFree}>提问</button>
          </div>
        </div>
      </Panel>
    </div>
  )
}

function HotView() {
  return (
    <div className="h-full grid grid-cols-[1fr_360px] gap-3 p-3 min-h-0">
      <Panel title="提问热度榜　本月" extra={<span className="text-[11.5px] text-slate-500">员工反复问什么，下一轮就重点训什么</span>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>排名</th><th>提问</th><th>次数</th><th>趋势</th><th>已触发的动作</th></tr></thead>
          <tbody>{ASK_HOT.map((h, i) => (
            <tr key={h.q}>
              <td className="num" style={{ color: i < 3 ? 'var(--gold)' : undefined }}>{i + 1}</td>
              <td className="font-medium">{h.q}</td>
              <td className="num">{h.n}</td>
              <td><span className={`tag ${h.up ? 'tag-warn' : ''}`}>{h.up ? '↑ 上升' : '— 持平'}</span></td>
              <td className="text-slate-600">{h.act}</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="p-3 hair-t text-[11.5px] text-slate-500 leading-relaxed">
          提问热度是培训需求的客观来源。以往需求靠各部门报表汇总，颗粒粗、滞后；这里的每一条都来自一线真实作业场景，且可直接定位到岗位与班组。
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="使用情况">
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[['日均提问', '3,140'], ['知识命中率', '94.2%'], ['覆盖岗位', '62 个']].map(([k, v]) => (
                <div key={k} className="hairline py-2.5 text-center">
                  <div className="num text-[17px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">{k}</div>
                </div>
              ))}
            </div>
            <Bars title="提问发生的时段分布（%）" data={[
              { label: '07–09 班前', v: 28, note: '峰值' }, { label: '09–12 作业', v: 24 },
              { label: '12–14', v: 8 }, { label: '14–17 作业', v: 21 },
              { label: '17–20 班后', v: 12 }, { label: '其他', v: 7 }]} unit="%" />
            <div className="text-[11.5px] text-slate-500 leading-relaxed mt-3 hair-t pt-2.5">
              提问高峰在班前与作业时段，说明助手已进入真实作业流程，而非作为课后复习工具使用。
            </div>
          </div>
        </Panel>
        <Panel title="闭环示例" className="flex-1">
          <div className="p-3">
            <div className="text-[11.5px] text-slate-600 leading-relaxed mb-3">
              以"低压台区反送电怎么判断"为例，从提问到成课的完整链路：
            </div>
            {[['一线提问 688 次', '玉林、贵港两局台区经理集中提问'],
              ['识别为共性缺口', '现有课程与题库均未覆盖该知识点'],
              ['触发课程立项', 'C-2026-0339 低压台区反送电判断与处置'],
              ['萃取专家经验', '黄建华 · 技师 · 现场速查顺序 12 条'],
              ['课程工厂生成', '4 学时成套课件 + 68 道题，1.8 天完成'],
              ['回流助手与陪练', '助手答案更新，新增陪练分支 2 个']].map(([k, v], i) => (
              <div key={k} className="flex gap-2.5 pb-3 relative">
                <div className="shrink-0 relative">
                  <span className="w-5 h-5 flex items-center justify-center text-[10px] text-white num"
                    style={{ background: i === 5 ? 'var(--gold)' : 'var(--indigo)' }}>{i + 1}</span>
                  {i < 5 && <span className="absolute left-1/2 top-5 bottom-[-12px] w-[1px] -translate-x-1/2" style={{ background: 'var(--line)' }} />}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium">{k}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{v}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
