/* 学习成长地图：八大功能，一级 → 二级 → 三级下钻 */
import { AtlasShell } from '../atlas/nav'
import type { Route } from '../atlas/nav'
import Board from '../atlas/Board'
import { PersonView, AbilityView, CompareView, PathSim, EvidenceView } from '../atlas/Person'
import { UnitView, UnitDetail, TeamDetail } from '../atlas/Unit'
import { MatrixView, PostModelView, AbilityDef } from '../atlas/Matrix'
import { GapsView, GapDetail, GapPeople } from '../atlas/Gaps'
import { TalentView, PoolView, SuccessionView } from '../atlas/Talent'
import { JourneyView, CohortView, CohortStage } from '../atlas/Journey'
import { InsightView, ScenarioView, ScenarioUnit } from '../atlas/Insight'

function render(r: Route) {
  switch (r.v) {
    case 'board': return <Board />
    case 'person': return <PersonView id={r.id} unit={r.unit} team={r.team} />
    case 'ability': return <AbilityView p={r.p} k={r.k} unit={r.unit} team={r.team} />
    case 'evidence': return <EvidenceView p={r.p} idx={r.idx} unit={r.unit} team={r.team} />
    case 'compare': return <CompareView p={r.p} unit={r.unit} team={r.team} />
    case 'pathSim': return <PathSim p={r.p} unit={r.unit} team={r.team} />
    case 'unit': return <UnitView />
    case 'unitDetail': return <UnitDetail name={r.name} />
    case 'teamDetail': return <TeamDetail unit={r.unit} team={r.team} />
    case 'matrix': return <MatrixView line={r.line} />
    case 'postModel': return <PostModelView id={r.id} />
    case 'abilityDef': return <AbilityDef id={r.id} k={r.k} />
    case 'gaps': return <GapsView />
    case 'gapDetail': return <GapDetail id={r.id} />
    case 'gapPeople': return <GapPeople id={r.id} />
    case 'talent': return <TalentView />
    case 'pool': return <PoolView box={r.box} />
    case 'succession': return <SuccessionView post={r.post} />
    case 'journey': return <JourneyView />
    case 'cohort': return <CohortView id={r.id} />
    case 'cohortStage': return <CohortStage id={r.id} m={r.m} />
    case 'insight': return <InsightView />
    case 'scenario': return <ScenarioView coach={r.coach} course={r.course} mentor={r.mentor} />
    case 'scenarioUnit': return <ScenarioUnit coach={r.coach} course={r.course} mentor={r.mentor} unit={r.unit} />
  }
}
export default function Atlas({ tab, init, nonce }: { tab: string; init?: Route; nonce?: number }) {
  return <AtlasShell tab={tab} init={init} nonce={nonce}>{r => render(r)}</AtlasShell>
}
