/* 知识资产中枢：八大功能，一级 → 二级 → 三级下钻 */
import '../hub/hub.css'
import { HubShell } from '../hub/nav'
import type { Route } from '../hub/nav'
import Board from '../hub/Board'
import { CatalogView, AssetDetail, RefsView, ClauseView, DiffView } from '../hub/Catalog'
import { IngestView, BatchView, ItemView } from '../hub/Ingest'
import { ExpertView, ExpertDetail } from '../hub/Expert'
import { GraphView } from '../hub/Graph'
import { VersionView, DocView, TaskView } from '../hub/Version'
import { QualityView, IssuesView } from '../hub/Quality'
import { SearchView } from '../hub/Search'

function render(r: Route) {
  switch (r.v) {
    case 'board': return <Board />
    case 'catalog': return <CatalogView r={r} />
    case 'asset': return <AssetDetail id={r.id} />
    case 'refs': return <RefsView id={r.id} kind={r.kind} />
    case 'clause': return <ClauseView id={r.id} />
    case 'diff': return <DiffView id={r.id} />
    case 'ingest': return <IngestView />
    case 'batch': return <BatchView id={r.id} />
    case 'item': return <ItemView batch={r.batch} id={r.id} />
    case 'expert': return <ExpertView />
    case 'expertDetail': return <ExpertDetail id={r.id} />
    case 'graph': return <GraphView id={r.id} />
    case 'version': return <VersionView />
    case 'doc': return <DocView id={r.id} />
    case 'task': return <TaskView doc={r.doc} id={r.id} />
    case 'quality': return <QualityView />
    case 'issues': return <IssuesView cat={r.cat} />
    case 'search': return <SearchView q0={r.q} />
  }
}

export default function Hub({ tab, init, nonce }: { tab: string; init?: Route; nonce?: number }) {
  return <HubShell tab={tab} init={init} nonce={nonce}>{r => render(r)}</HubShell>
}
