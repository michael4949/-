/* 课程的 AI 加工浮层：改编到其他岗位 / 生成复训版 / 按规程新版更新，生成工作台与课程库共用 */
import { Typewriter } from './nav'
import type { Course } from './data'

export function AdaptDialog({ c, adapt, onClose, toast }: { c: Course; adapt: string | null; onClose: () => void; toast: (m: string) => void }) {
  if (!adapt) return null
  return (
      
        <div className="ai-mask" onClick={() => onClose()}>
          <div className="ai-dlg" onClick={e => e.stopPropagation()}>
            <div className="hd"><span className="w-[3px] h-[13px]" style={{ background: 'var(--gold)' }} /><span className="text-[13px] font-semibold">AI · {adapt}</span><span className="text-[11px] text-slate-500">基于 {c.id}</span><button className="ml-auto text-slate-400" onClick={() => onClose()}>✕</button></div>
            <div className="bd"><div className="ai-out"><Typewriter text={adapt === '改编到其他岗位' ? `【改编建议 · ${c.name}】\n\n目标岗位：${c.post === '变电值班员' ? '配网运维员' : '新入职员工'}\n保留：${c.chapters.slice(0, 2).map(x => x.title).join('、')}（口径通用）\n改写：${c.chapters[2]?.title ?? '标准作业流程'} → 按目标岗位的作业场景替换案例与术语\n新增：目标岗位常见错项 3 条（来自中枢同主题诀窍）\n试题：保留 60%，按岗位重新生成 40%\n\n预计生成时间 1.2 天，内训师校对 0.5 天。` : adapt === '生成复训版' ? `【复训版 · ${c.name}】\n\n课时：1 学时　形式：线上 + 班前会 10 分钟\n要点页：${c.chapters.map(x => x.kps[0] ?? x.title).join(' / ')}\n近一年变化：${c.src.map(x => x).slice(0, 2).join('、')} 相关条款已按新版更新\n复训题：10 道，全部来自本课错题率最高的知识点\n通过线：80 分` : `【规程新版更新 · ${c.name}】\n\n检测到引用条款变化 ${Math.max(1, c.src.length - 2)} 处：\n· 第十八条 接令后核实操作票 → 新版扩展到操作顺序与安全措施\n· 附录G-5 位置核对 → 由两项扩展为四项\n\n将自动：更新讲义与课件页 ${Math.round(c.outputs.课件 * .3)} 页、替换题目 ${Math.round(c.outputs.配套试题 * .25)} 道、更新微课口播 2 段，并生成审核任务单。`} speed={7} /></div></div>
            <div className="ft"><button className="btn" onClick={() => onClose()}>关闭</button><button className="btn btn-primary" onClick={() => { toast(`已创建任务：${adapt}`); onClose() }}>创建任务</button></div>
          </div>
        </div>
  )
}
