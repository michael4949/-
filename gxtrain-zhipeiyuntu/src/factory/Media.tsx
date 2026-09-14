/* 微课工作室（一级）→ 微课分镜（二级）→ 分镜编辑（三级） */
import { useState } from 'react'
import { Panel, Progress } from '../ui'
import { coachImg } from '../coach/images'
import { MICROS } from './data'
import type { Scene } from './data'
import { microById, findCourse } from './store'
import { useNav, StatusTag, KindTag, Typewriter } from './nav'

export function MediaView() {
  const { push, toast } = useNav()
  const [st, setSt] = useState('')
  const list = MICROS.filter(m => !st || m.status === st)
  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-3 p-3 min-h-0">
      <Panel title={`数字人微课　${list.length} 讲`} extra={<div className="seg"><button className={!st ? 'on' : ''} onClick={() => setSt('')}>全部</button>{['已发布', '渲染中', '脚本待审'].map(s => <button key={s} className={st === s ? 'on' : ''} onClick={() => setSt(s)}>{s}</button>)}</div>} bodyClass="overflow-auto scroll">
        <div className="p-3 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))' }}>
          {list.map((m, i) => (
            <button key={m.id} onClick={() => push({ v: 'micro', id: m.id })} className="a-card text-left row-in" style={{ animationDelay: `${i * .04}s` }}>
              <div className="flex gap-3">
                <img src={coachImg(m.presenter.img)} alt="" className="presenter" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><StatusTag s={m.status} /><span className="num text-[10.5px] text-slate-400 ml-auto">{m.minutes} 分钟</span></div>
                  <div className="text-[13px] font-semibold leading-snug mt-1">{m.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{m.presenter.name} · {m.presenter.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-500"><span>{m.unit.replace(/（.*）/, '')} · {m.post}</span><span className="ml-auto num">{m.views.toLocaleString()} 次观看</span></div>
              {m.status === '渲染中' && <div className="mt-2"><Progress v={62} /></div>}
              <span className="go">›</span>
            </button>
          ))}
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="工作室" extra={<span className="ai-badge">数字人讲师</span>}>
          <div className="p-3 grid grid-cols-2 gap-2">
            {[['本月生成', '38 讲'], ['平均时长', '3.1 分钟'], ['完播率', '81%'], ['渲染耗时', '6 分钟']].map(([k, v], i) => <div key={k} className="hairline py-2 text-center"><div className={`num text-[17px] font-semibold ${i % 2 ? 'gold-grad' : 'num-grad'}`}>{v}</div><div className="text-[10.5px] text-slate-500">{k}</div></div>)}
          </div>
          <div className="px-3 pb-3 text-[11.5px] text-slate-500 leading-relaxed">讲师形象来自陪练教练库，口播由课件讲解词生成，字幕与配音同步产出；脚本经内训师确认后进入渲染。</div>
        </Panel>
        <Panel title="讲师形象" className="flex-1" bodyClass="overflow-auto scroll">
          <div className="p-2 grid grid-cols-4 gap-1.5">
            {['daozha', 'term', 'angui', 'biz', 'cust', 'comp', 'order', 'meet'].map(k => <button key={k} className="rounded-xl overflow-hidden hover:ring-2 ring-[var(--ai)]" onClick={() => toast('已设为默认讲师形象')}><img src={coachImg(k)} alt="" className="w-full aspect-square object-cover" /></button>)}
          </div>
          <div className="px-3 pb-3"><button className="btn btn-primary w-full" onClick={() => push({ v: 'lib' })}>从课程生成微课</button></div>
        </Panel>
      </div>
    </div>
  )
}

export function MicroView({ id }: { id: string }) {
  const { push, toast } = useNav()
  const m = microById(id)
  const [cur, setCur] = useState(0)
  const [play, setPlay] = useState(false)
  if (!m) return null
  const c = findCourse(m.course)
  const s = m.scenes[cur]
  const total = m.scenes.reduce((a, x) => a + x.seconds, 0)
  return (
    <div className="h-full grid grid-cols-[420px_1fr] gap-3 p-3 min-h-0">
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="预览" extra={<StatusTag s={m.status} />}>
          <div className="p-3">
            <div className="rounded-2xl overflow-hidden relative" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg,#0f2a57,#1e3a6e 60%,#0b4f8f)' }}>
              <img src={coachImg(m.presenter.img, true)} alt="" className="absolute left-4 bottom-0 h-[92%] object-contain" style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,.4))' }} />
              <div className="absolute right-4 top-4 w-[52%] text-white">
                <div className="text-[10px] opacity-70 mb-1">镜头 {s.no} · {s.shot}</div>
                <div className="text-[13px] font-semibold leading-snug">{s.visual}</div>
              </div>
              <div className="absolute left-0 right-0 bottom-0 px-4 py-2 text-[11.5px] text-white leading-snug" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.55))' }}>{play ? <Typewriter text={s.narration} speed={40} /> : s.narration}</div>
              <div className="absolute left-3 top-3 flex items-center gap-1.5 text-[10px] text-white/80"><span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#4ade80' }} />{play ? '播放中' : '已暂停'}</div>
            </div>
            <div className="flex items-center gap-2 mt-2"><button className="btn btn-sm btn-primary" onClick={() => setPlay(p => !p)}>{play ? '暂停' : '播放'}</button><div className="flex-1 h-[6px] bg-slate-100 rounded overflow-hidden flex">{m.scenes.map((x, i) => <span key={x.no} className="h-full" style={{ width: `${x.seconds / total * 100}%`, background: i <= cur ? 'var(--ai)' : 'transparent', borderRight: '1px solid #fff' }} />)}</div><span className="num text-[11px] text-slate-500">{m.minutes} 分钟</span></div>
          </div>
        </Panel>
        <Panel title="讲师" className="flex-1">
          <div className="p-3 flex gap-3 items-start"><img src={coachImg(m.presenter.img)} alt="" className="presenter" /><div><div className="text-[13.5px] font-semibold">{m.presenter.name}</div><div className="text-[11.5px] text-slate-500">{m.presenter.role}</div><div className="text-[11.5px] text-slate-500 mt-1">来源课程：{c ? <button className="underline text-[var(--indigo)]" onClick={() => push({ v: 'course', id: c.id })}>{c.name}</button> : m.course}</div>{c && <div className="mt-1"><KindTag k={c.kind} /></div>}</div></div>
          <div className="px-3 pb-3 grid grid-cols-2 gap-2"><button className="btn btn-sm" onClick={() => toast('已更换讲师形象')}>更换形象</button><button className="btn btn-sm" onClick={() => toast('已切换为粤语配音')}>配音语种</button><button className="btn btn-sm" onClick={() => toast('字幕已导出 SRT')}>导出字幕</button><button className="btn btn-sm btn-gold" onClick={() => toast(m.status === '已发布' ? '已推送到学习平台与班组学习包' : '已进入渲染队列，预计 6 分钟')}>{m.status === '已发布' ? '推送' : '开始渲染'}</button></div>
        </Panel>
      </div>
      <Panel title={`分镜　${m.scenes.length} 个 · 合计 ${total} 秒`} bodyClass="overflow-auto scroll" extra={<button className="btn btn-sm" onClick={() => toast('已按课件讲解词重新生成口播')}>AI 重写口播</button>}>
        <div className="p-3 space-y-2">
          {m.scenes.map((x: Scene, i) => (
            <div key={x.no} className="scene-row row-in" style={{ animationDelay: `${i * .05}s`, outline: i === cur ? '2px solid var(--ai)' : 'none' }} onClick={() => setCur(i)} onDoubleClick={() => push({ v: 'scene', micro: m.id, no: i })}>
              <span className="num text-[13px] font-semibold num-grad">{x.no}</span>
              <span className="shot">{x.shot}</span>
              <div className="text-[12.5px] leading-relaxed">{x.narration}</div>
              <div className="text-[11px] text-slate-500 leading-snug">{x.visual}</div>
              <div className="text-right"><span className="num text-[11px] text-slate-500">{x.seconds}s</span><button className="block ml-auto btn btn-sm mt-1" onClick={e => { e.stopPropagation(); push({ v: 'scene', micro: m.id, no: i }) }}>编辑</button></div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export function SceneView({ micro, no }: { micro: string; no: number }) {
  const { toast, back } = useNav()
  const m = microById(micro)
  const s = m?.scenes[no]
  const [nar, setNar] = useState(s?.narration ?? '')
  const [vis, setVis] = useState(s?.visual ?? '')
  const [ai, setAi] = useState(false)
  if (!m || !s) return null
  return (
    <div className="h-full grid grid-cols-[1fr_360px] gap-3 p-3 min-h-0">
      <Panel title={`镜头 ${s.no} · ${s.shot} · ${s.seconds} 秒`}>
        <div className="p-4 space-y-3">
          <div className="rounded-2xl overflow-hidden relative max-w-[720px]" style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg,#0f2a57,#1e3a6e 60%,#0b4f8f)' }}>
            <img src={coachImg(m.presenter.img, true)} alt="" className="absolute left-4 bottom-0 h-[92%] object-contain" />
            <div className="absolute right-4 top-4 w-[52%] text-white text-[13px] font-semibold leading-snug">{vis}</div>
            <div className="absolute left-0 right-0 bottom-0 px-4 py-2 text-[11.5px] text-white" style={{ background: 'linear-gradient(180deg,transparent,rgba(0,0,0,.55))' }}>{nar}</div>
          </div>
          <div><div className="text-[11px] text-slate-500 mb-1">口播</div><textarea value={nar} onChange={e => setNar(e.target.value)} rows={3} className="hairline w-full px-3 py-2 text-[12.5px] outline-none" /></div>
          <div><div className="text-[11px] text-slate-500 mb-1">画面提示</div><input value={vis} onChange={e => setVis(e.target.value)} className="hairline w-full px-3 py-2 text-[12.5px] outline-none" /></div>
          <div className="flex gap-2"><button className="btn btn-primary" onClick={() => { toast('分镜已保存，重新渲染本镜头'); back() }}>保存并渲染</button><button className="btn" onClick={() => setAi(true)}>AI 改写口播</button><button className="btn" onClick={back}>取消</button></div>
        </div>
      </Panel>
      <div className="flex flex-col gap-3 min-h-0">
        <Panel title="镜头类型"><div className="p-3 flex flex-wrap gap-1.5">{['讲解', '示意图', '现场实拍', '字幕卡', '互动提问'].map(t => <button key={t} className={`chip ${t === s.shot ? 'on' : ''}`} style={t === s.shot ? { background: 'var(--indigo-soft)', borderColor: 'rgba(47,109,246,.5)', color: 'var(--indigo)' } : {}} onClick={() => toast(`已切换为${t}`)}>{t}</button>)}</div></Panel>
        <Panel title="AI 建议" className="flex-1">
          <div className="p-3">{ai ? <div className="ai-out"><Typewriter text={`【口播改写 · 更口语、更短】\n\n${nar.replace(/。$/, '')}。说白一点：先看这一处，再看那一处，缺一个都不能往下走。\n\n时长由 ${s.seconds} 秒压到 ${Math.max(8, s.seconds - 8)} 秒；建议画面在第 3 秒切到示意图。`} speed={8} onDone={() => undefined} /></div> : <div className="text-[12px] text-slate-400 py-4 text-center">点击"AI 改写口播"获取更口语化的版本</div>}
            {ai && <button className="btn btn-primary w-full mt-3" onClick={() => { setNar(n => n.replace(/。$/, '') + '。先看这一处，再看那一处，缺一个都不能往下走。'); setAi(false); toast('已应用改写') }}>应用改写</button>}
          </div>
        </Panel>
      </div>
    </div>
  )
}
