/* 千人千面计划：八大功能，一级 → 二级 → 三级下钻 */
import { PlanShell } from '../plan/nav'
import type { Route } from '../plan/nav'
import Board from '../plan/Board'
import { EngineView, EngineRun, EngineItem } from '../plan/Engine'
import { IdpView, IdpItem, IdpEvidence } from '../plan/Idp'
import { AggView, AggCourse, AggClass } from '../plan/Agg'
import { ScheduleView, SchedClass, SchedConflict } from '../plan/Schedule'
import { BudgetView, BudgetUnit, BudgetLine } from '../plan/Budget'
import { TrackView, TrackUnit, TrackPerson } from '../plan/Track'
import { PInsightView, OptScenario, OptUnit } from '../plan/Insight'

function render(r: Route) {
  switch (r.v) {
    case 'board': return <Board />
    case 'engine': return <EngineView />
    case 'engineRun': return <EngineRun grp={r.grp} unit={r.unit} />
    case 'engineItem': return <EngineItem unit={r.unit} team={r.team} pid={r.pid} />
    case 'idp': return <IdpView id={r.id} unit={r.unit} team={r.team} />
    case 'idpItem': return <IdpItem pid={r.pid} id={r.id} unit={r.unit} team={r.team} />
    case 'idpEvidence': return <IdpEvidence pid={r.pid} id={r.id} unit={r.unit} team={r.team} />
    case 'agg': return <AggView />
    case 'aggCourse': return <AggCourse id={r.id} />
    case 'aggClass': return <AggClass id={r.id} no={r.no} />
    case 'schedule': return <ScheduleView />
    case 'schedClass': return <SchedClass id={r.id} />
    case 'schedConflict': return <SchedConflict id={r.id} />
    case 'budget': return <BudgetView />
    case 'budgetUnit': return <BudgetUnit name={r.name} />
    case 'budgetLine': return <BudgetLine name={r.name} cat={r.cat} />
    case 'track': return <TrackView />
    case 'trackUnit': return <TrackUnit name={r.name} />
    case 'trackPerson': return <TrackPerson name={r.name} team={r.team} pid={r.pid} />
    case 'insight': return <PInsightView />
    case 'optScenario': return <OptScenario cap={r.cap} online={r.online} coach={r.coach} />
    case 'optUnit': return <OptUnit cap={r.cap} online={r.online} coach={r.coach} unit={r.unit} />
  }
}
export default function Plan({ tab, init, nonce }: { tab: string; init?: Route; nonce?: number }) {
  return <PlanShell tab={tab} init={init} nonce={nonce}>{r => render(r)}</PlanShell>
}
