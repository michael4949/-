import { ArrowRight, AlertTriangle, Shuffle, MessageCircleQuestion } from 'lucide-react';
import type { Chain, Evidence } from './types';

/** 证据引用小标（E1 / U2）：点击滚动到证据卡；被排除的划线显示。 */
export function EvRefs({ ids, evidence, excluded }: { ids: string[]; evidence: Evidence[]; excluded: Set<string> }) {
  return (
    <>
      {ids.map((id) => {
        const e = evidence.find((x) => x.id === id);
        if (!e) return null;
        const off = excluded.has(id);
        return (
          <span key={id} className={`ai-evref${off ? ' off' : e.source === '上传材料' ? ' up' : ''}`} title={`${e.source} · ${e.title}（${e.time}）${off ? ' · 已排除' : ''}`}
            onClick={(ev) => { ev.stopPropagation(); document.getElementById(`ev-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>{id}</span>
        );
      })}
    </>
  );
}

/** 置信度按被排除证据比例下调 */
export function effectiveConfidence(chain: Chain, excluded: Set<string>) {
  const ex = chain.evidence.filter((id) => excluded.has(id)).length;
  const frac = chain.evidence.length ? ex / chain.evidence.length : 0;
  return { conf: Math.max(0.2, chain.confidence * (1 - 0.45 * frac)), ex };
}

/** 推理链：证据 → 判断 → 建议；置信度、反例 / 风险；换一种思路 / 追问。 */
export default function ReasoningChain({ chain, evidence, excluded, onAlt, onAsk, altIndex }: {
  chain: Chain; evidence: Evidence[]; excluded: Set<string>; onAlt?: () => void; onAsk?: () => void; altIndex?: number;
}) {
  const { conf, ex } = effectiveConfidence(chain, excluded);
  return (
    <div>
      <div className="ai-chain">
        <div className="st e"><b>证据</b><EvRefs ids={chain.evidence} evidence={evidence} excluded={excluded} />{chain.evidence.length === 0 && <span className="ai-muted">无直接证据，按行业规则推断</span>}</div>
        <div className="arr"><ArrowRight size={14} /></div>
        <div className="st j"><b>判断</b>{chain.judgement}</div>
        <div className="arr"><ArrowRight size={14} /></div>
        <div className="st s"><b>建议</b>{chain.suggestion}</div>
      </div>
      <div className="ai-conf">
        <span>置信度</span><div className="bar"><i style={{ width: `${Math.round(conf * 100)}%` }} /></div><b className="num">{Math.round(conf * 100)}%</b>
        {ex > 0 && <span className="chip red" style={{ padding: '1px 8px', fontSize: 11 }}><i />已排除 {ex} 条依据，置信度下调</span>}
        {altIndex !== undefined && altIndex > 0 && <span className="chip purple" style={{ padding: '1px 8px', fontSize: 11 }}><i />思路 {altIndex + 1}</span>}
      </div>
      <div className="ai-counter"><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} /><span><b>反例 / 风险：</b>{chain.counter}</span></div>
      {(onAlt || onAsk) && (
        <div className="ai-chain-acts">
          {onAlt && <button className="btn sm ghost" onClick={onAlt}><Shuffle size={12} />换一种思路</button>}
          {onAsk && <button className="btn sm ghost" onClick={onAsk}><MessageCircleQuestion size={12} />追问</button>}
        </div>
      )}
    </div>
  );
}
