/* AI 课程工厂：八大功能，一级 → 二级 → 三级下钻 */
import '../factory/factory.css'
import { FactoryShell } from '../factory/nav'
import type { Route } from '../factory/nav'
import Board from '../factory/Board'
import { GenView, DraftView, ChapterView, OutputView } from '../factory/Gen'
import { LibView, CourseView, LearnView } from '../factory/Lib'
import { BankView, QuestionView, AnswersView, PaperView } from '../factory/Bank'
import { ReviewView, ReviewDetail, NoteView } from '../factory/Review'
import { MediaView, MicroView, SceneView } from '../factory/Media'
import { TrainerView, TrainerDetail } from '../factory/Trainer'
import { AnalyticsView, CourseStats, RevisionView } from '../factory/Analytics'
import { SystemView, ProgramView, ProgramBatch, TopicView, ClassDetail } from '../factory/System'

function render(r: Route) {
  switch (r.v) {
    case 'board': return <Board />
    case 'gen': return <GenView />
    case 'draft': return <DraftView courseKey={r.key} />
    case 'chapter': return <ChapterView course={r.course} no={r.no} />
    case 'output': return <OutputView course={r.course} kind={r.kind} />
    case 'lib': return <LibView r={r} />
    case 'course': return <CourseView id={r.id} />
    case 'learn': return <LearnView id={r.id} />
    case 'bank': return <BankView r={r} />
    case 'question': return <QuestionView id={r.id} />
    case 'answers': return <AnswersView id={r.id} />
    case 'paper': return <PaperView id={r.id} />
    case 'review': return <ReviewView />
    case 'reviewDetail': return <ReviewDetail id={r.id} />
    case 'note': return <NoteView course={r.course} id={r.id} />
    case 'media': return <MediaView />
    case 'micro': return <MicroView id={r.id} />
    case 'scene': return <SceneView micro={r.micro} no={r.no} />
    case 'trainer': return <TrainerView />
    case 'trainerDetail': return <TrainerDetail id={r.id} />
    case 'analytics': return <AnalyticsView />
    case 'courseStats': return <CourseStats id={r.id} />
    case 'revision': return <RevisionView id={r.id} />
    case 'system': return <SystemView />
    case 'program': return <ProgramView id={r.id} />
    case 'programBatch': return <ProgramBatch id={r.id} no={r.no} />
    case 'topic': return <TopicView i={r.i} />
    case 'classDetail': return <ClassDetail i={r.i} />
  }
}
export default function Factory({ tab, init, nonce }: { tab: string; init?: Route; nonce?: number }) {
  return <FactoryShell tab={tab} init={init} nonce={nonce}>{r => render(r)}</FactoryShell>
}
