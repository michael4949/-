import { useEffect, useState } from 'react'
import { RAW_MATERIALS, GEN_STEPS, COURSE_OUTLINE, SAMPLE_QUESTIONS, COURSE_LIB, BANK_ROWS } from '../data'
import { Panel, Progress } from '../ui'

export default function Factory({ tab }: { tab: string }) {
  if (tab === 'lib') return <LibView />
  if (tab === 'bank') return <BankView />
  return <GenView />
}

function GenView() {
  const [mats, setMats] = useState(RAW_MATERIALS.map(m => m.pick))
  const [post, setPost] = useState('变电值班员')
  const [hours, setHours] = useState('6')
  const [type, setType] = useState('技能提升课')
  const [phase, setPhase] = useState<'idle' | 'run' | 'done'>('idle')
  const [step, setStep] = useState(-1)
  const [view, setView] = useState<'outline' | 'slide' | 'quiz' | 'task'>('outline')

  useEffect(() => {
    if (phase !== 'run') return
    if (step >= GEN_STEPS.length - 1) { const t = setTimeout(() => setPhase('done'), 550); return () => clearTimeout(t) }
    const t = setTimeout(() => setStep(s => s + 1), 620)
    return () => clearTimeout(t)
  }, [phase, step])

  const run = () => { setPhase('run'); setStep(0) }
  const reset = () => { setPhase('idle'); setStep(-1) }

  return (
    <div className="h-full grid grid-cols-[330px_1fr] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="第一步　选择原料" bodyClass="overflow-auto scroll">
          <div className="p-2.5 space-y-1">
            {RAW_MATERIALS.map((m, i) => (
              <label key={m.id} className="flex items-start gap-2 p-2 hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={mats[i]} className="mt-[3px] accent-[var(--indigo)]"
                  onChange={() => setMats(a => a.map((x, j) => j === i ? !x : x))} />
                <span className="min-w-0">
                  <span className="block text-[12px] leading-snug">{m.name}</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">{m.n}</span>
                </span>
              </label>
            ))}
            <div className="text-[11.5px] text-slate-500 px-2 pt-1">
              已选 <b className="num">{mats.filter(Boolean).length}</b> 项原料，全部来自公司已发布文件与自有诀窍库
            </div>
          </div>
        </Panel>
        <Panel title="第二步　设定参数">
          <div className="p-3 space-y-2.5">
            <Row k="适用岗位"><select value={post} onChange={e => setPost(e.target.value)} className="hairline px-2 py-1 text-[12px] w-full outline-none">
              {['变电值班员', '配网运维员', '装表接电员', '线路运维员', '值班调度员'].map(x => <option key={x}>{x}</option>)}</select></Row>
            <Row k="课时"><select value={hours} onChange={e => setHours(e.target.value)} className="hairline px-2 py-1 text-[12px] w-full outline-none">
              {['3', '4', '6', '8'].map(x => <option key={x} value={x}>{x} 学时</option>)}</select></Row>
            <Row k="课程类型"><select value={type} onChange={e => setType(e.target.value)} className="hairline px-2 py-1 text-[12px] w-full outline-none">
              {['技能提升课', '新员工入职课', '转岗晋级课', '专项应急课', '安规复训课'].map(x => <option key={x}>{x}</option>)}</select></Row>
            <Row k="产出物"><div className="flex flex-wrap gap-1">
              {['讲义', '课件', '微课脚本', '实训任务书', '配套试题'].map(x => <span key={x} className="tag">{x}</span>)}</div></Row>
          </div>
        </Panel>
        <Panel title="第三步　生成" className="flex-1">
          <div className="p-3">
            {phase === 'idle' && <button className="btn btn-primary w-full" onClick={run}>开始生成</button>}
            {phase === 'run' && (
              <div className="space-y-2">
                {GEN_STEPS.map((s, i) => (
                  <div key={s.t} className="flex items-start gap-2">
                    <span className="w-4 h-4 shrink-0 mt-[1px] text-[10px] flex items-center justify-center text-white"
                      style={{ background: i < step ? 'var(--ok)' : i === step ? 'var(--indigo-2)' : '#cbd3de' }}>
                      {i < step ? '✓' : i + 1}</span>
                    <span className="min-w-0">
                      <span className={`block text-[12px] ${i <= step ? '' : 'text-slate-400'}`}>{s.t}{i === step && <span className="typing" />}</span>
                      {i <= step && <span className="block text-[11px] text-slate-400">{s.d}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {phase === 'done' && (
              <div className="fade-in">
                <div className="text-[12px] mb-2" style={{ color: 'var(--ok)' }}>✓ 生成完成　用时 2 分 14 秒</div>
                <div className="hairline p-2.5 mb-3" style={{ background: '#f6fbf8' }}>
                  <div className="text-[11.5px] text-slate-600 leading-relaxed">
                    对照：同类课程人工开发平均 <b className="num">16.8</b> 天，本次 <b className="num" style={{ color: 'var(--ok)' }}>2.1</b> 天完成初稿并待两级审核。
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm flex-1" onClick={reset}>重新生成</button>
                  <button className="btn btn-sm btn-gold flex-1">提交审核</button>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel title={phase === 'done' ? `产出预览　线路由运行转检修标准化操作（${hours} 学时）` : '产出预览'}
        extra={phase === 'done' && (
          <div className="flex gap-1">
            {([['outline', '课程大纲'], ['slide', '课件页'], ['task', '实训任务书'], ['quiz', '配套试题']] as const).map(([k, n]) => (
              <button key={k} onClick={() => setView(k)}
                className={`px-2.5 py-1 text-[11.5px] border ${view === k ? 'text-white' : 'bg-white'}`}
                style={view === k ? { background: 'var(--indigo)', borderColor: 'var(--indigo)' } : { borderColor: 'var(--line)' }}>{n}</button>
            ))}
          </div>
        )} bodyClass="overflow-auto scroll">
        {phase !== 'done' ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="#c8d1de" strokeWidth="1.4">
              <rect x="14" y="10" width="44" height="54" /><path d="M22 24h28M22 34h28M22 44h18" />
            </svg>
            <div className="text-[12px]">左侧选好原料与参数后开始生成</div>
          </div>
        ) : view === 'outline' ? <Outline /> : view === 'slide' ? <Slide /> : view === 'task' ? <TaskBook /> : <Quiz />}
      </Panel>
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div><div className="text-[11px] text-slate-500 mb-1">{k}</div>{children}</div>
}

function Outline() {
  return (
    <div className="p-4 fade-in">
      <div className="serif text-[19px] font-semibold mb-1">线路由运行转检修标准化操作</div>
      <div className="text-[12px] text-slate-500 mb-3">适用岗位：变电值班员（高级工及以上）　·　6 学时　·　含实训 2 学时</div>
      <div className="gold-rule mb-4" />
      {COURSE_OUTLINE.map(c => (
        <div key={c.c} className="mb-3.5">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="num text-[11.5px] px-1.5 py-0.5 text-white" style={{ background: 'var(--indigo)' }}>{c.c}</span>
            <span className="text-[13.5px] font-semibold">{c.t}</span>
            <span className="text-[11px] text-slate-400">{c.p}</span>
          </div>
          <ul className="pl-4 space-y-1">
            {c.pts.map(p => <li key={p} className="text-[12px] text-slate-600 leading-relaxed list-disc">{p}</li>)}
          </ul>
        </div>
      ))}
      <div className="hair-t pt-3 mt-4 text-[11.5px] text-slate-500 leading-relaxed">
        全部知识点已回链规程条款：细则第十三条(四)、第十四条、第十八条，附录 F 2.9 / 2.11.2 / 2.11.3 / 2.11.4 / 2.11.7，附录 G-2 / G-5 / G-13 / G-21.1 / G-23。待审核存疑项 3 处，已列入校审清单。
      </div>
    </div>
  )
}

function Slide() {
  return (
    <div className="p-5 fade-in flex flex-col items-center">
      <div className="w-full max-w-[680px] aspect-[16/9] bg-white hairline shadow-sm relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[46px] flex items-center px-5" style={{ background: 'var(--indigo)' }}>
          <span className="text-white text-[15px] font-semibold">第五章　验电与接地</span>
          <span className="ml-auto text-white/60 text-[11px]">南方电网广西电网有限责任公司</span>
        </div>
        <div className="absolute left-0 top-[46px] w-full h-[3px]" style={{ background: 'var(--gold)' }} />
        <div className="pt-[62px] px-6 pb-5 h-full">
          <div className="text-[13px] font-semibold mb-2.5" style={{ color: 'var(--indigo)' }}>不具备直接验电条件时的两种非同源指示</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[['第一种原理', '监控后台核对线路二次电压', '确认各相电压数据确无电压'],
              ['第二种原理', '现场高压带电显示装置', '逐相核对，与操作前的确有电压形成变化']].map(([a, b, c]) => (
              <div key={a} className="hairline p-2.5" style={{ background: '#fafcff' }}>
                <div className="text-[11px]" style={{ color: 'var(--gold)' }}>{a}</div>
                <div className="text-[12.5px] font-medium mt-0.5">{b}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{c}</div>
              </div>
            ))}
          </div>
          <div className="hairline p-2.5 flex items-start gap-2" style={{ background: '#fcf1ef', borderColor: '#eec9c3' }}>
            <span className="tag tag-bad shrink-0">红线</span>
            <span className="text-[11.5px] leading-relaxed">两种指示均发生应有变化后，方可合上接地刀闸。线路仍带电时合上地刀，将造成带电合地刀、相间或对地短路。</span>
          </div>
          <div className="absolute bottom-3 left-6 right-6 flex items-center text-[10px] text-slate-400">
            <span>依据：附录F 2.11.3 q）　附录G-23　细则第十三条(四)</span>
            <span className="ml-auto num">5 / 42</span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-[11.5px] text-slate-500">共生成 42 页课件，每页页脚自动标注规程出处</div>
    </div>
  )
}

function TaskBook() {
  const rows = [
    ['1', '接调度令并复诵、记录', '调度电话', '接令四要素齐全，票令核对一致', '10'],
    ['2', '核对相关设备运行方式', '监控后台', '开关与两侧刀闸位置、光字报文核对完整', '5'],
    ['3', '核对图实一致、标实一致与双重名称', '间隔现场', '三项核对到位，无走错间隔', '10'],
    ['4', '检查高压带电显示装置显示确有电压', '间隔现场', '逐相核对并记录初始状态', '10'],
    ['5–7', '断开 1163 开关、检查分闸与三相无电流、汇报', '后台 / 调度电话', '五拍闭环完整，执行与检查分列', '15'],
    ['8–11', '拉开两把刀闸并核对四项位置指示、1QK 切就地', '后台 / 现场 / 测控屏', '隔离顺序正确，四项指示逐一核到', '20'],
    ['12–14', '两种间接验电、下传五防钥匙', '后台 / 五防电脑 / 现场', '两种非同源指示均发生应有变化', '20'],
    ['15–17', 'ZK 切就地、合 116340 地刀并检查到位', '就地控制柜', '接地条件满足，位置多重核对', '5'],
    ['18–20', '断四路二次电源、挂三块标志牌、汇报完毕', '控制柜 / 保护屏 / 调度电话', '二次隔离完整，警示到位，结束时间记录', '5'],
  ]
  return (
    <div className="p-4 fade-in">
      <div className="serif text-[17px] font-semibold mb-1">实训任务书</div>
      <div className="text-[12px] text-slate-500 mb-3">任务：110kV 培训三线 1163 线路由运行转检修　·　考核时长 45 分钟　·　满分 100 分</div>
      <div className="gold-rule mb-3" />
      <table className="grid">
        <thead><tr><th>项次</th><th>操作项目</th><th>操作地点</th><th>评分要点</th><th>分值</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r[0]}><td className="num">{r[0]}</td><td className="font-medium">{r[1]}</td>
            <td className="text-slate-600">{r[2]}</td><td className="text-slate-600">{r[3]}</td><td className="num">{r[4]}</td></tr>
        ))}</tbody>
      </table>
      <div className="hairline p-2.5 mt-3 flex items-start gap-2" style={{ background: '#fcf1ef', borderColor: '#eec9c3' }}>
        <span className="tag tag-bad shrink-0">一票否决</span>
        <span className="text-[11.5px] leading-relaxed">未完成两种间接验电即合接地刀闸；未经审批私自解锁五防；跨调度令段落连续操作。</span>
      </div>
    </div>
  )
}

function Quiz() {
  const [show, setShow] = useState<number | null>(null)
  return (
    <div className="p-4 fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-semibold">配套试题　共 86 道</span>
        <span className="tag">单选 40</span><span className="tag">多选 20</span><span className="tag">判断 20</span><span className="tag">案例 6</span>
        <span className="ml-auto text-[11.5px] text-slate-500">下列为抽样展示</span>
      </div>
      <div className="gold-rule mb-3" />
      {SAMPLE_QUESTIONS.map((q, i) => (
        <div key={i} className="hairline p-3 mb-2.5">
          <div className="flex items-start gap-2 mb-2">
            <span className="tag shrink-0">{q.t}</span>
            <span className="text-[12.5px] font-medium leading-snug flex-1">{q.q}</span>
            <span className={`tag shrink-0 ${q.diff === '难' ? 'tag-bad' : q.diff === '中' ? 'tag-warn' : 'tag-ok'}`}>{q.diff}</span>
          </div>
          <div className="pl-1 space-y-1 mb-2">
            {q.o.map((o, j) => (
              <div key={j} className="text-[12px] flex items-start gap-2"
                style={show === i && (q.a === j || q.a === -1) ? { color: 'var(--ok)', fontWeight: 600 } : { color: '#4a5568' }}>
                <span className="num shrink-0">{'ABCD'[j]}.</span><span>{o}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 hair-t pt-2">
            <span className="text-[11px] text-slate-500">知识点</span><span className="tag">{q.kp}</span>
            <span className="text-[11px] text-slate-500 ml-2">出处</span><span className="tag tag-gold">{q.ref}</span>
            <button className="btn btn-sm ml-auto" onClick={() => setShow(show === i ? null : i)}>
              {show === i ? '隐藏答案' : '显示答案'}</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function LibView() {
  const [f, setF] = useState('全部')
  const rows = COURSE_LIB.filter(r => f === '全部' || r.st === f)
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`课程库　${rows.length} 门`} extra={
        <select value={f} onChange={e => setF(e.target.value)} className="hairline px-2 py-1 text-[12px] outline-none">
          {['全部', '已发布', '内训师审核中', '专业部门审核中'].map(x => <option key={x}>{x}</option>)}
        </select>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>课程编号</th><th>课程名称</th><th>专业</th><th>适用岗位</th><th>学时</th><th>开发周期</th><th>版本</th><th>学习人次</th><th>状态</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id}>
              <td className="num text-slate-500">{r.id}</td>
              <td className="font-medium">{r.name}</td>
              <td className="text-slate-600">{r.pro}</td>
              <td className="text-slate-600">{r.post}</td>
              <td className="num">{r.h}</td>
              <td className="num" style={{ color: 'var(--ok)' }}>{r.d}</td>
              <td className="num text-slate-500">{r.v}</td>
              <td className="num text-slate-600">{r.use || '—'}</td>
              <td><span className={`tag ${r.st === '已发布' ? 'tag-ok' : 'tag-warn'}`}>{r.st}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="开发效率对照">
          <div className="p-3">
            {[['2025 Q1', 16.8], ['2025 Q3', 14.2], ['2026 Q1', 6.1], ['2026 Q2', 3.4], ['2026 Q3', 2.4]].map(([k, v]) => (
              <div key={k as string} className="flex items-center gap-2 mb-2">
                <span className="text-[11.5px] text-slate-600 w-[54px]">{k}</span>
                <div className="flex-1 h-[14px] bg-slate-100">
                  <div className="h-full" style={{ width: `${(v as number / 18) * 100}%`, background: (v as number) < 5 ? 'var(--ok)' : 'var(--indigo-2)' }} />
                </div>
                <span className="num text-[11.5px] w-[42px] text-right">{v} 天</span>
              </div>
            ))}
            <div className="text-[11.5px] text-slate-500 leading-relaxed mt-2 hair-t pt-2">
              单门课平均开发周期。本年新增成套课程 342 门，去年同期 61 门。
            </div>
          </div>
        </Panel>
        <Panel title="审核流" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-3 space-y-2.5">
            {[{ n: 'DTZ-2026 型电能表现场安装作业', s: 1, w: '内训师 梁小燕' },
              { n: '低压台区反送电判断与处置', s: 2, w: '生产技术部 配电科' },
              { n: '分布式光伏并网受理实务', s: 1, w: '内训师 黄建华' }].map(x => (
              <div key={x.n} className="hairline p-2.5">
                <div className="text-[12.5px] font-medium mb-2">{x.n}</div>
                <div className="flex items-center gap-1 mb-1.5">
                  {['AI 初稿', '内训师审核', '专业部门审核', '发布'].map((s, i) => (
                    <div key={s} className="flex items-center gap-1 flex-1">
                      <span className="w-3.5 h-3.5 text-[9px] flex items-center justify-center text-white shrink-0"
                        style={{ background: i <= x.s ? 'var(--ok)' : i === x.s + 1 ? 'var(--indigo-2)' : '#cbd3de' }}>
                        {i <= x.s ? '✓' : i + 1}</span>
                      <span className="text-[10px] text-slate-500 truncate">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500">当前处理人：{x.w}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function BankView() {
  const [sel, setSel] = useState(BANK_ROWS[0])
  return (
    <div className="h-full grid grid-cols-[1fr_400px] gap-3 p-3 min-h-0">
      <Panel title="岗位题库　共 28,450 道" extra={<span className="text-[11.5px] text-slate-500">同场考试千人千卷</span>} bodyClass="overflow-auto scroll">
        <table className="grid">
          <thead><tr><th>适用岗位</th><th>等级</th><th>题量</th><th>覆盖知识点</th><th>最近更新</th><th>一次通过率</th></tr></thead>
          <tbody>{BANK_ROWS.map(r => (
            <tr key={r.post + r.g} onClick={() => setSel(r)} className="cursor-pointer"
              style={sel === r ? { background: 'var(--indigo-soft)' } : {}}>
              <td className="font-medium">{r.post}</td><td>{r.g}</td>
              <td className="num">{r.n}</td><td className="num text-slate-600">{r.kp}</td>
              <td className="num text-slate-500">{r.upd}</td>
              <td><span className={`tag ${parseFloat(r.pass) > 80 ? 'tag-ok' : parseFloat(r.pass) > 72 ? 'tag-warn' : 'tag-bad'}`}>{r.pass}</span></td>
            </tr>
          ))}</tbody>
        </table>
        <div className="p-3 hair-t text-[11.5px] text-slate-500 leading-relaxed">
          题目自动去重并标注知识点与难度系数，专家只做校审。规程修订后由知识资产中枢触发同步更新，无需重新组织出题。
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title={`${sel.post} · ${sel.g}　题目分布`}>
          <div className="p-3">
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[['单选', Math.round(sel.n * 0.45)], ['多选', Math.round(sel.n * 0.23)],
                ['判断', Math.round(sel.n * 0.24)], ['案例', Math.round(sel.n * 0.08)]].map(([k, v]) => (
                <div key={k as string} className="hairline py-2 text-center">
                  <div className="num text-[17px] font-semibold" style={{ color: 'var(--indigo)' }}>{v as number}</div>
                  <div className="text-[10.5px] text-slate-500">{k}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 mb-2">难度分布</div>
            {[['易', 32, 'var(--ok)'], ['中', 46, 'var(--indigo-2)'], ['难', 22, 'var(--gold)']].map(([k, v, c]) => (
              <div key={k as string} className="flex items-center gap-2 mb-1.5">
                <span className="text-[11.5px] w-[24px]">{k}</span>
                <div className="flex-1 h-[13px] bg-slate-100"><div className="h-full" style={{ width: `${v}%`, background: c as string }} /></div>
                <span className="num text-[11.5px] w-[34px] text-right">{v}%</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="错题知识点排行" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-3 space-y-2">
            {[['四项位置指示核对', 31], ['间接验电两种原理组合', 24], ['票令核对与三审', 18],
              ['标志牌悬挂位置', 12], ['五拍闭环执行', 9], ['设备编号按位报读', 6]].map(([k, v], i) => (
              <div key={k as string}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="num text-[11px] text-slate-400 w-[14px]">{i + 1}</span>
                  <span className="text-[12px] flex-1">{k}</span>
                  <span className="num text-[11.5px]" style={{ color: 'var(--bad)' }}>{v}%</span>
                </div>
                <Progress v={v as number * 2.6} color="var(--bad)" />
              </div>
            ))}
            <div className="text-[11.5px] text-slate-500 leading-relaxed pt-2 hair-t">
              错题知识点自动回流至课程工厂，触发对应章节权重调整与陪练分支补充。
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
