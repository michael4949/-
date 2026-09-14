/* 全面智能问数助手：八大功能，一级 → 二级 → 三级下钻 */
import '../ask/ask.css'
import { AskShell } from '../ask/nav'
import type { Route } from '../ask/nav'
import Board from '../ask/Board'
import { ChatView, DrillView, TraceView, RowView } from '../ask/Chat'
import { HotView, HotDetail, HotAction } from '../ask/Hot'
import { GapsView, GapView, GapDraft } from '../ask/Gaps'
import { MetricsView, MetricView, LineageView } from '../ask/Metrics'
import { SkillsView, SkillView, SkillLog } from '../ask/Skills'
import { QualityView, ReviewItem, RewriteView } from '../ask/Quality'
import { ChannelsView, ChannelView, ChannelUnit } from '../ask/Channels'

function render(r: Route) {
  switch (r.v) {
    case 'board': return <Board />
    case 'chat': return <ChatView r={r} />
    case 'drill': return <DrillView aid={r.a} />
    case 'trace': return <TraceView aid={r.a} />
    case 'row': return <RowView aid={r.a} name={r.name} />
    case 'hot': return <HotView />
    case 'hotDetail': return <HotDetail rank={r.rank} />
    case 'hotAction': return <HotAction rank={r.rank} idx={r.idx} />
    case 'gaps': return <GapsView />
    case 'gap': return <GapView id={r.id} />
    case 'gapDraft': return <GapDraft id={r.id} />
    case 'metrics': return <MetricsView />
    case 'metric': return <MetricView id={r.id} />
    case 'lineage': return <LineageView id={r.id} node={r.node} />
    case 'skills': return <SkillsView />
    case 'skill': return <SkillView id={r.id} />
    case 'skillLog': return <SkillLog id={r.id} />
    case 'quality': return <QualityView />
    case 'reviewItem': return <ReviewItem id={r.id} />
    case 'rewrite': return <RewriteView id={r.id} />
    case 'channels': return <ChannelsView />
    case 'channel': return <ChannelView id={r.id} />
    case 'channelUnit': return <ChannelUnit id={r.id} unit={r.unit} />
  }
}
export default function Ask({ tab, init, nonce }: { tab: string; init?: Route; nonce?: number }) {
  return <AskShell tab={tab} init={init} nonce={nonce}>{r => render(r)}</AskShell>
}
