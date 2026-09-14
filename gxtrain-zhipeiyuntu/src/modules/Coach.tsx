/* AI 智能陪练 · 模块入口：角色切换（学员 / 班组长 / 培训科）、九个功能页、下钻弹层、陪练舱 */
import { useCallback, useEffect, useState } from 'react'
import '../coach/coach.css'
import Arena from '../coach/Arena'
import { CoachCtx, HomePage, PlazaPage, ReviewPage, GrowthPage, ClassroomPage, TeamPage, EditorPage, CompanyPage, ROLE_USERS } from '../coach/pages'
import type { DrillDef } from '../coach/pages'
import type { RoleKey } from '../coach/data'
import { S, resetEngine, ensureEntry, closeDlg, bump } from '../coach/engine'

let roleMem: RoleKey = 'student'

export default function Coach({ tab, goTab }: { tab: string; goTab: (t: string) => void }) {
  const [role, setRoleState] = useState<RoleKey>(roleMem)
  const [drill, setDrill] = useState<DrillDef | null>(null)
  const [pre, setPre] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: number; t: string }[]>([])
  const setRole = (r: RoleKey) => { roleMem = r; setRoleState(r); if (r === 'dept' && !['company', 'plaza', 'cabin'].includes(tab)) goTab('company'); if (r === 'lead' && tab === 'home') goTab('team'); if (r === 'student' && ['team', 'editor', 'company'].includes(tab)) goTab('home') }
  const toast = (t: string) => { const id = Date.now() + Math.random(); setToasts(x => x.concat({ id, t })); setTimeout(() => setToasts(x => x.filter(y => y.id !== id)), 2200) }
  const go = useCallback((h: string) => { setDrill(null); goTab(h) }, [goTab])
  const train = useCallback((plan: string | null) => {
    setDrill(null)
    if (S.stage !== 'idle') resetEngine()
    setPre(plan); goTab('cabin')
    setTimeout(() => ensureEntry(plan), 30)
  }, [goTab])
  useEffect(() => { if (tab !== 'cabin' && S.dlg.some(d => d.kind === 'entry')) { closeDlg('entry'); bump() } }, [tab])
  const u = ROLE_USERS[role]
  const ctx = { go, train, drill: setDrill, role, setRole, toast }
  return (
    <CoachCtx.Provider value={ctx}>
      <div className="coach-root">
        {tab !== 'cabin' && (
          <div className="rolebar">
            <span className="who"><b>{u.name}</b>{u.team} · {u.post}</span>
            <span className="rb">{([['student', '学员视角'], ['lead', '班组长视角'], ['dept', '培训科视角']] as [RoleKey, string][]).map(([k, n]) => <button key={k} className={role === k ? 'on' : ''} onClick={() => setRole(k)}>{n}</button>)}</span>
            <span className="tk3">学员看自己的成长与任务，班组长看本班 12 人，培训科看全公司 28 个一级单位</span>
          </div>
        )}
        <div className="flex-1 min-h-0">
          {tab === 'home' && <HomePage />}
          {tab === 'plaza' && <PlazaPage />}
          {tab === 'cabin' && <Arena pre={pre} onHome={() => go('home')} onGo={go} />}
          {tab === 'review' && <ReviewPage />}
          {tab === 'growth' && <GrowthPage />}
          {tab === 'classroom' && <ClassroomPage />}
          {tab === 'team' && <TeamPage />}
          {tab === 'editor' && <EditorPage />}
          {tab === 'company' && <CompanyPage />}
        </div>
        {drill && (
          <div className="cmask lite" onClick={e => { if (e.target === e.currentTarget) setDrill(null) }}>
            <div className="cdlg" style={{ width: 'min(760px,95vw)' }}>
              <div className="cdh"><b>{drill.title}</b>{drill.sub && <span>{drill.sub}</span>}<i className="cls" onClick={() => setDrill(null)}>×</i></div>
              <div className="cdb scrolly" style={{ maxHeight: '64vh' }}>{drill.body}</div>
              {drill.foot && <div className="cdf">{drill.foot}</div>}
            </div>
          </div>
        )}
        {toasts.length > 0 && <div className="toasts">{toasts.map(t => <div key={t.id} className="toast">{t.t}</div>)}</div>}
      </div>
    </CoachCtx.Provider>
  )
}
