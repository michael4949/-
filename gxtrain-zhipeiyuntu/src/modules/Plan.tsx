import { useEffect, useState } from 'react'
import { PLAN_INPUTS, PLAN_ROWS, IDP_ITEMS, PLAN_AGG, PERSON } from '../data'
import { Panel, Progress, Bars } from '../ui'
import { UNITS, UNIT_GROUPS } from '../units'

export default function Plan({ tab }: { tab: string }) {
  if (tab === 'idp') return <IdpView />
  if (tab === 'agg') return <AggView />
  return <EngineView />
}

/* 职能部门与直属机构的个人计划：按该单位科室岗位生成，等级采用专业职级序列 */
const NAME_POOL = ['韦明', '黄文杰', '周伟', '李明辉', '农小刚', '陈立', '蓝海', '覃丽', '梁雨', '陆峰', '莫晓', '潘颖']
const JOB_GRADES = ['助理级', '中级', '高级', '资深']
function unitRows(u: { depts: { name: string; posts: string[] }[]; id: string }) {
  const posts = u.depts.flatMap(d => d.posts)
  return NAME_POOL.slice(0, Math.min(8, Math.max(4, posts.length))).map((name, i) => {
    const g = JOB_GRADES[(i + u.id.length) % 3]
    const gaps = 2 + ((i * 7 + u.id.length) % 6)
    return { name, post: posts[i % posts.length], grade: g, gaps, items: gaps + 2 + (i % 3), h: 18 + gaps * 5 + (i % 4) * 3,
      target: `${JOB_GRADES[Math.min(3, JOB_GRADES.indexOf(g) + 1)]}（${2027 + (i % 2)}）`, rate: 48 + ((i * 13 + u.id.length * 3) % 45) }
  })
}

function EngineView() {
  const [scope, setScope] = useState('南宁供电局 · 变电管理一所')
  const unit = UNITS.find(u => scope.startsWith(u.name))
  const rows = unit ? unitRows(unit) : PLAN_ROWS
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle')
  const [step, setStep] = useState(-1)
  const steps = ['读取成长地图缺口', '匹配岗位与晋级要求', '叠加本单位年度重点任务', '结合个人 IDP 意向', '排布时间节点与班次', '输出一人一份计划']

  useEffect(() => {
    if (phase !== 'run') return
    if (step >= steps.length - 1) { const t = setTimeout(() => setPhase('done'), 500); return () => clearTimeout(t) }
    const t = setTimeout(() => setStep(s => s + 1), 520)
    return () => clearTimeout(t)
  }, [phase, step])

  return (
    <div className="h-full grid grid-cols-[320px_1fr] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="生成范围">
          <div className="p-3 space-y-2.5">
            <div>
              <div className="text-[11px] text-slate-500 mb-1">人群</div>
              <select value={scope} onChange={e => setScope(e.target.value)} className="hairline px-2 py-1.5 text-[12px] w-full outline-none">
                <optgroup label="班组与岗位">
                  {['南宁供电局 · 变电管理一所', '柳州供电局 · 变电管理二所', '全公司 · 变电值班员岗位', '全公司 · 2026 年新入职员工'].map(x => <option key={x}>{x}</option>)}
                </optgroup>
                {UNIT_GROUPS.map(g => (
                  <optgroup key={g} label={g}>
                    {UNITS.filter(u => u.grp === g).map(u => <option key={u.id} value={`${u.name} · 全员`}>{u.name} · 全员 · {u.people.toLocaleString()} 人</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1">计划周期</div>
              <select className="hairline px-2 py-1.5 text-[12px] w-full outline-none">
                {['2027 年度', '2026 年下半年', '未来 12 个月'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 mb-1">与 IDP 联动</div>
              <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" defaultChecked className="accent-[var(--indigo)]" />生成后同步写入个人发展计划表</label>
            </div>
          </div>
        </Panel>
        <Panel title="输入权重">
          <div className="p-3 space-y-2.5">
            {PLAN_INPUTS.map(x => (
              <div key={x.k}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium">{x.k}</span>
                  <span className="num text-[12px]" style={{ color: 'var(--gold)' }}>{x.w}%</span>
                </div>
                <Progress v={x.w * 2.2} color="var(--gold)" />
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{x.d}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="生成" className="flex-1">
          <div className="p-3">
            {phase === 'idle' && <button className="btn btn-primary w-full" onClick={() => { setPhase('run'); setStep(0) }}>生成计划</button>}
            {phase === 'run' && (
              <div className="space-y-1.5">
                {steps.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className="w-4 h-4 shrink-0 text-[10px] flex items-center justify-center text-white"
                      style={{ background: i < step ? 'var(--ok)' : i === step ? 'var(--indigo-2)' : '#cbd3de' }}>{i < step ? '✓' : i + 1}</span>
                    <span className={`text-[12px] ${i <= step ? '' : 'text-slate-400'}`}>{s}{i === step && <span className="typing" />}</span>
                  </div>
                ))}
              </div>
            )}
            {phase === 'done' && (
              <div className="fade-in">
                <div className="text-[12px] mb-2" style={{ color: 'var(--ok)' }}>✓ 已生成 {(UNITS.find(u => scope.startsWith(u.name))?.people ?? 42).toLocaleString()} 份个人计划</div>
                <div className="text-[11.5px] text-slate-600 leading-relaxed mb-3">
                  平均每人 {UNITS.find(u => scope.startsWith(u.name)) ? '5.8' : '7.4'} 个学习项、{UNITS.find(u => scope.startsWith(u.name)) ? '36' : '48'} 学时。{UNITS.find(u => scope.startsWith(u.name))?.grp === '本部职能部门' ? '职能部门的学习项以专题课、AI 工具应用与制度复训为主，' : ''}汇总后即为本单位年度培训需求与班次排布依据。
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm flex-1" onClick={() => { setPhase('idle'); setStep(-1) }}>重新生成</button>
                  <button className="btn btn-sm btn-gold flex-1">导出计划表</button>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title={phase === 'done' ? `个人计划清单　${scope}` : '个人计划清单'} bodyClass="overflow-auto scroll">
        {phase !== 'done' ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <svg width="76" height="76" viewBox="0 0 76 76" fill="none" stroke="#c8d1de" strokeWidth="1.4">
              <rect x="12" y="16" width="52" height="46" /><path d="M12 28h52M26 16v-6M50 16v-6M22 40h12M22 50h20" />
            </svg>
            <div className="text-[12px]">设定范围后生成一人一份的年度学习计划</div>
          </div>
        ) : (
          <div className="fade-in">
            <table className="grid">
              <thead><tr><th>姓名</th><th>岗位</th><th>等级</th><th>能力缺口</th><th>学习项</th><th>学时</th><th>晋级目标</th><th>当前完成度</th></tr></thead>
              <tbody>{rows.map(r => (
                <tr key={r.name}>
                  <td className="font-medium">{r.name}</td><td className="text-slate-600">{r.post}</td><td>{r.grade}</td>
                  <td><span className={`tag ${r.gaps >= 7 ? 'tag-bad' : r.gaps >= 4 ? 'tag-warn' : 'tag-ok'}`}>{r.gaps} 项</span></td>
                  <td className="num">{r.items}</td><td className="num">{r.h}</td>
                  <td className="text-slate-600">{r.target}</td>
                  <td className="w-[130px]"><div className="flex items-center gap-2"><div className="flex-1"><Progress v={r.rate} /></div>
                    <span className="num text-[11.5px] w-[28px] text-right">{r.rate}%</span></div></td>
                </tr>
              ))}</tbody>
            </table>
            <div className="p-3 hair-t text-[11.5px] text-slate-500 leading-relaxed">
              培训需求由各部门报表汇总，改为按个人能力缺口自动生成。计划生成后同步写入个人发展计划表，员工与班组长的填表负担同时下降。
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}

function IdpView() {
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title="个人发展计划（IDP）　韦明 · 变电值班员 · 2026 年度" bodyClass="overflow-auto scroll">
        <div className="p-4">
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[['本年计划学时', '46'], ['已完成', '31'], ['学习项', '7'], ['季度完成率', '71%']].map(([k, v]) => (
              <div key={k} className="hairline py-3 text-center">
                <div className="num text-[22px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div>
                <div className="text-[11px] text-slate-500 mt-1">{k}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {IDP_ITEMS.map(q => (
              <div key={q.q} className="hairline flex flex-col">
                <div className="px-3 py-2 text-[12px] font-semibold flex items-center" style={{ background: '#f2f5fa' }}>
                  {q.q}<span className="num ml-auto text-[11px] text-slate-500">{q.items.reduce((a, b) => a + b.h, 0)} 学时</span>
                </div>
                <div className="p-2.5 space-y-2 flex-1">
                  {q.items.map(it => (
                    <div key={it.n} className="hairline p-2">
                      <div className="flex items-start gap-1.5 mb-1">
                        <span className="tag shrink-0">{it.k}</span>
                        <span className="num text-[10.5px] text-slate-400 ml-auto">{it.h}h</span>
                      </div>
                      <div className="text-[11.5px] leading-snug mb-1">{it.n}</div>
                      <span className={`tag ${it.st === '已完成' ? 'tag-ok' : it.st.includes('未通过') ? 'tag-bad' : it.st === '进行中' ? 'tag-warn' : ''}`}>{it.st}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hairline p-3 mt-4" style={{ background: '#fafcff' }}>
            <div className="text-[12px] font-medium mb-1.5">计划与缺口的对应关系</div>
            <div className="text-[11.5px] text-slate-600 leading-relaxed">
              本年 7 个学习项全部由成长地图的能力缺口推导：异常处置差 13 分对应 Q2 主变异常与事故处理课程与 Q4 主变陪练；继电保护差 15 分对应 Q1 定值单课程；红外测温差 2 分对应 Q3 课程；受令规范差 1 分对应陪练科目。Q4 的技师等级认定为晋级目标节点。
            </div>
          </div>
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="与成长地图的联动">
          <div className="p-3 space-y-2">
            {PERSON.gaps.map(g => (
              <div key={g.k} className="hairline p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`tag ${g.p === '高' ? 'tag-bad' : g.p === '中' ? 'tag-warn' : ''}`}>{g.p}</span>
                  <span className="text-[11.5px] flex-1 leading-snug">{g.k}</span>
                </div>
                <div className="text-[10.5px] text-slate-500">→ {g.c}{g.s !== '—' && ` · ${g.s}`}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="季度进度" className="flex-1">
          <div className="p-3">
            <Bars data={[{ label: 'Q1', v: 100 }, { label: 'Q2', v: 100 }, { label: 'Q3', v: 62, note: '进行中' }, { label: 'Q4', v: 0 }]} unit="%" max={100} />
            <div className="text-[11.5px] text-slate-500 leading-relaxed mt-3 hair-t pt-2.5">
              系统按季度自动更新完成进度并回写 IDP。Q2 的母线倒闸操作陪练未通过，已自动追加一次重练任务到 Q3。
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function AggView() {
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title="年度培训需求汇总　由 45,694 份个人计划自动汇总" bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>课程 / 训练项</th><th>需求人数</th><th>建议班次</th><th>优先级</th><th>建议组织方式</th></tr></thead>
          <tbody>{PLAN_AGG.map(r => (
            <tr key={r.c}>
              <td className="font-medium">{r.c}</td>
              <td className="num">{r.n}</td>
              <td className="num">{r.cls}</td>
              <td><span className={`tag ${r.pri === '高' ? 'tag-bad' : 'tag-warn'}`}>{r.pri}</span></td>
              <td className="text-slate-600">{r.per}</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="p-3 hair-t">
          <Bars title="需求人数（人）" data={PLAN_AGG.map(r => ({ label: r.c.length > 10 ? r.c.slice(0, 10) + '…' : r.c, v: r.n }))} />
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="口径变化">
          <div className="p-3">
            <div className="hairline p-2.5 mb-2" style={{ background: '#f8f9fb' }}>
              <div className="text-[11px] text-slate-500 mb-1">以往</div>
              <div className="text-[12px] leading-relaxed">各部门报表汇总 → 颗粒粗、滞后、与真实能力缺口脱节</div>
            </div>
            <div className="text-center text-slate-400 text-[14px] py-1">↓</div>
            <div className="hairline p-2.5" style={{ background: '#f6fbf8', borderColor: '#bfe0cd' }}>
              <div className="text-[11px] mb-1" style={{ color: 'var(--ok)' }}>现在</div>
              <div className="text-[12px] leading-relaxed">个人缺口逐条汇总 → 需求可追溯到人、到能力项、到规程条款</div>
            </div>
          </div>
        </Panel>
        <Panel title="预算与班次测算" className="flex-1">
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[['建议班次', '120 期'], ['覆盖人次', '4,658'], ['线上占比', '54%'], ['线下集训', '46 期']].map(([k, v]) => (
                <div key={k} className="hairline py-2.5 text-center">
                  <div className="num text-[17px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">{k}</div>
                </div>
              ))}
            </div>
            <div className="text-[11.5px] text-slate-600 leading-relaxed">
              汇总结果可直接作为次年培训需求提报与预算编制的依据，并与生产检修窗口、迎峰度夏节点做冲突校验后排布班次。
            </div>
            <button className="btn btn-gold w-full mt-3">导出次年需求提报表</button>
          </div>
        </Panel>
      </div>
    </div>
  )
}
