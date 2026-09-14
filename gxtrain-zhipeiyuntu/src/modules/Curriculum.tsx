import { useState } from 'react'
import { MAIN_PROGRAMS, TOPIC_COURSES, CLASS_CAL } from '../data'
import { Panel, Progress, Bars } from '../ui'

export default function Curriculum({ tab }: { tab: string }) {
  if (tab === 'topic') return <TopicView />
  if (tab === 'cal') return <CalView />
  return <MainView />
}

function MainView() {
  const [sel, setSel] = useState(MAIN_PROGRAMS[0])
  return (
    <div className="h-full grid grid-cols-[300px_1fr] gap-3 p-3 min-h-0">
      <Panel title="三个主干项目" bodyClass="overflow-auto scroll">
        <div className="p-2.5 space-y-2">
          {MAIN_PROGRAMS.map(p => (
            <button key={p.id} onClick={() => setSel(p)} className="w-full text-left hairline p-3 hover:border-[var(--indigo-2)]"
              style={sel.id === p.id ? { borderColor: 'var(--indigo)', background: 'var(--indigo-soft)' } : {}}>
              <span className="tag tag-gold mb-1.5 inline-block">{p.badge}</span>
              <div className="text-[13px] font-semibold leading-snug mb-1">{p.name}</div>
              <div className="text-[11px] text-slate-500 leading-snug">{p.days}</div>
            </button>
          ))}
          <div className="hairline p-3 mt-1" style={{ background: '#fafcff' }}>
            <div className="text-[11.5px] text-slate-600 leading-relaxed">
              主干项目讲通用能力，专题课讲本部门本岗位怎么用。两类课程分开立项、分开考核。
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={sel.name} extra={<span className="tag tag-gold">{sel.badge}</span>} bodyClass="overflow-auto scroll">
        <div className="p-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {sel.stat.map(s => (
              <div key={s.k} className="hairline py-3 text-center">
                <div className="num text-[24px] font-semibold" style={{ color: 'var(--indigo)' }}>{s.v}</div>
                <div className="text-[11px] text-slate-500 mt-1">{s.k}</div>
              </div>
            ))}
          </div>
          <div className="gold-rule mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Sec t="面向谁" />
              <div className="text-[12.5px] leading-relaxed mb-4">{sel.who}</div>
              <Sec t="课时与形式" />
              <div className="text-[12.5px] leading-relaxed mb-4">{sel.days}</div>
              <Sec t="结业产出" />
              <ul className="space-y-1.5">
                {sel.out.map(o => (
                  <li key={o} className="flex gap-2 text-[12.5px] leading-relaxed">
                    <span className="w-1.5 h-1.5 mt-[7px] shrink-0" style={{ background: 'var(--gold)' }} />{o}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Sec t="课程内容" />
              <div className="space-y-2">
                {sel.body.map((b, i) => (
                  <div key={b} className="flex gap-2.5 hairline p-2.5">
                    <span className="num w-5 h-5 shrink-0 text-[11px] flex items-center justify-center text-white" style={{ background: 'var(--indigo)' }}>{i + 1}</span>
                    <span className="text-[12.5px] leading-relaxed">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {sel.id === 'p2' && (
            <div className="mt-5 hair-t pt-4">
              <Sec t="分层覆盖进度" />
              <Bars data={[{ label: '班子与中层', v: 100 }, { label: '专业骨干', v: 78.4 }, { label: '一线员工', v: 56.2, note: '推进中' }]} unit="%" max={100} />
              <div className="text-[11.5px] text-slate-500 leading-relaxed mt-3">
                累计覆盖 28,410 人。按当前排期，年底可达 92% 以上。这是"人工智能+"专项行动落到培训条线最直接的一项交付。
              </div>
            </div>
          )}
          {sel.id === 'p3' && (
            <div className="mt-5 hair-t pt-4">
              <Sec t="历期交付场景" />
              <table className="grid">
                <thead><tr><th>期次</th><th>提出部门</th><th>场景</th><th>交付形态</th><th>状态</th></tr></thead>
                <tbody>{[
                  ['第 4 期', '市场营销部', '高损台区线损归因辅助', '智能体', '已上线'],
                  ['第 4 期', '生产技术部', '配网缺陷工单自动归类', '工作流', '已上线'],
                  ['第 3 期', '广西电力交易中心', '月度市场分析报告辅助编制', '智能体', '已上线'],
                  ['第 3 期', '安全监管部', '两票常见错项自动校核', '智能体', '试运行'],
                  ['第 2 期', '物资部', '技术规范书草稿生成', '智能体', '已上线'],
                  ['第 2 期', '人力资源部', '培训需求缺口测算', '工作流', '已上线'],
                ].map(r => (
                  <tr key={r[2]}><td className="num">{r[0]}</td><td>{r[1]}</td><td className="font-medium">{r[2]}</td>
                    <td>{r[3]}</td><td><span className={`tag ${r[4] === '已上线' ? 'tag-ok' : 'tag-warn'}`}>{r[4]}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {sel.id === 'p1' && (
            <div className="mt-5 hair-t pt-4">
              <Sec t="对课程生产能力的影响" />
              <div className="grid grid-cols-2 gap-3">
                <div className="hairline p-3">
                  <div className="text-[11px] text-slate-500 mb-2">内训师自有课程占比</div>
                  <div className="flex items-center gap-2 mb-1"><span className="text-[11.5px] w-[52px]">训战营前</span>
                    <div className="flex-1"><Progress v={34} color="#94a3b8" /></div><span className="num text-[12px] w-[34px] text-right">34%</span></div>
                  <div className="flex items-center gap-2"><span className="text-[11.5px] w-[52px]">现在</span>
                    <div className="flex-1"><Progress v={71} color="var(--ok)" /></div><span className="num text-[12px] w-[34px] text-right">71%</span></div>
                </div>
                <div className="hairline p-3">
                  <div className="text-[11px] text-slate-500 mb-2">六期训战营累计产出</div>
                  <div className="text-[12.5px] leading-relaxed">178 名内训师结业，交付 178 门可上讲台的成套课件，占本年新增课程的 52%。内容生产能力由外购转为内生。</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  )
}

function Sec({ t }: { t: string }) {
  return <div className="flex items-center gap-2 mb-2">
    <span className="w-[3px] h-[12px]" style={{ background: 'var(--gold)' }} />
    <span className="text-[12px] font-semibold tracking-wide">{t}</span>
  </div>
}

function TopicView() {
  const [sel, setSel] = useState(TOPIC_COURSES[0])
  return (
    <div className="h-full grid grid-cols-[1fr_380px] gap-3 p-3 min-h-0">
      <Panel title="分部门、分岗位业务 AI 专题课　12 门" extra={<span className="text-[11.5px] text-slate-500">全部用客户自己业务的例子讲</span>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>面向部门 / 岗位</th><th>课程名称</th><th>课时</th><th>本年参训</th><th>下期开班</th></tr></thead>
          <tbody>{TOPIC_COURSES.map(c => (
            <tr key={c.name} onClick={() => setSel(c)} className="cursor-pointer"
              style={sel.name === c.name ? { background: 'var(--indigo-soft)' } : {}}>
              <td className="font-medium">{c.dept}</td>
              <td>{c.name}</td>
              <td className="num whitespace-nowrap">{c.h}</td>
              <td className="num">{c.n}</td>
              <td className="num text-slate-500">{c.next}</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="p-3 hair-t">
          <Bars title="本年各专题课参训人数（人）"
            data={TOPIC_COURSES.map(c => ({ label: c.dept.length > 8 ? c.dept.slice(0, 8) + '…' : c.dept, v: c.n }))} />
        </div>
      </Panel>
      <Panel title="课程详情" bodyClass="overflow-auto scroll">
        <div className="p-4">
          <div className="tag tag-gold mb-2 inline-block">{sel.dept}</div>
          <div className="serif text-[17px] font-semibold leading-snug mb-1">{sel.name}</div>
          <div className="text-[12px] text-slate-500 mb-3">{sel.h}　·　本年已办 {Math.ceil(sel.n / 50)} 期　·　累计参训 {sel.n} 人</div>
          <div className="gold-rule mb-3.5" />
          <Sec t="核心内容" />
          <div className="text-[12.5px] leading-[1.9] mb-4">{sel.body}</div>
          <Sec t="结业产出" />
          <div className="hairline p-2.5 mb-4" style={{ background: 'var(--gold-soft)', borderColor: '#e3d2ac' }}>
            <div className="text-[12.5px] leading-relaxed">{sel.out}</div>
          </div>
          <Sec t="下期开班" />
          <div className="hairline p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="num text-[15px] font-semibold" style={{ color: 'var(--indigo)' }}>{sel.next}</span>
              <span className="tag tag-ok">报名中</span>
            </div>
            <button className="btn btn-primary btn-sm w-full">发起报名</button>
          </div>
          <div className="mt-4 text-[11.5px] text-slate-500 leading-relaxed hair-t pt-3">
            每门课都要求带走一件可用的东西。主干项目建的是通用能力，这里建的是本岗位当天就能用上的做法。
          </div>
        </div>
      </Panel>
    </div>
  )
}

function CalView() {
  return (
    <div className="h-full grid grid-cols-[1fr_340px] gap-3 p-3 min-h-0">
      <Panel title="开班日历与报名情况" bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>开班日期</th><th>班次名称</th><th>地点</th><th>容量</th><th>已报名</th><th>报名进度</th><th>状态</th></tr></thead>
          <tbody>{CLASS_CAL.map(c => (
            <tr key={c.d + c.n}>
              <td className="num whitespace-nowrap">{c.d}</td>
              <td className="font-medium">{c.n}</td>
              <td className="text-slate-600">{c.p}</td>
              <td className="num">{c.cap}</td>
              <td className="num">{c.sign}</td>
              <td className="w-[120px]"><Progress v={(c.sign / c.cap) * 100} /></td>
              <td><span className={`tag ${c.st === '已满员' ? 'tag-gold' : 'tag-ok'}`}>{c.st}</span></td>
            </tr>
          ))}</tbody>
        </table>
        <div className="p-3 hair-t text-[11.5px] text-slate-500 leading-relaxed">
          班次排期已与生产检修计划、迎峰度夏节点做冲突校验。报名名单来自千人千面培训计划的自动派发，员工与班组长无需重复填报。
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="本年课程体系运行情况">
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[['已办班次', '86 期'], ['结业人数', '2,840'], ['平均满意度', '4.7 / 5'], ['结业产出物', '1,204 件']].map(([k, v]) => (
                <div key={k} className="hairline py-2.5 text-center">
                  <div className="num text-[18px] font-semibold" style={{ color: 'var(--indigo)' }}>{v}</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">{k}</div>
                </div>
              ))}
            </div>
            <Bars title="各季度开班数（期）" data={[
              { label: '2026 Q1', v: 14 }, { label: '2026 Q2', v: 22 },
              { label: '2026 Q3', v: 31 }, { label: '2026 Q4（计划）', v: 19, note: '计划' }]} />
          </div>
        </Panel>
        <Panel title="结业产出物构成" className="flex-1">
          <div className="p-3">
            <Bars data={[
              { label: '成套课件', v: 178 }, { label: '可用智能体', v: 96 },
              { label: '岗位应用场景', v: 1204 - 178 - 96 - 142 }, { label: '班组训练安排', v: 142 }]} title="累计件数" />
            <div className="text-[11.5px] text-slate-600 leading-relaxed mt-3 hair-t pt-2.5">
              课程的产出从一张结业名单变成可以直接投入使用的东西。这也是本条线向公司交差时最实在的一组数字。
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
