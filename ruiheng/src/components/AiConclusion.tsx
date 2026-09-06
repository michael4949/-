import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { actionsOf } from '../lib/actions';

/** 放大醒目的 AI 结论块：结论正文 + 依据 + 置信 + 联动动作按钮。 */
export default function AiConclusion({ headline, points, evidence, confidence = 0.86, actions, onSystem, tone = 'gold' }: {
  headline: string; points?: string[]; evidence?: string[]; confidence?: number; actions: string[]; onSystem?: (id: string, label: string) => void; tone?: 'gold' | 'red' | 'green';
}) {
  const nav = useNavigate();
  const acts = actionsOf(actions);
  return (
    <div className={`aic ${tone}`}>
      <div className="aic-head">
        <span className="aic-badge"><Icons.Sparkles size={14} /> AI 结论</span>
        <span className="chip"><i />置信度 {Math.round(confidence * 100)}%</span>
        <span className="ai-tag">AI 生成 · 辅助建议 · 需人工复核</span>
      </div>
      <div className="aic-headline">{headline}</div>
      {points && points.length > 0 && <ul className="aic-points">{points.map((p, i) => <li key={i}><Icons.CircleCheckBig size={14} />{p}</li>)}</ul>}
      {evidence && evidence.length > 0 && <div className="aic-evi"><span className="lab">依据</span>{evidence.map((e, i) => <span key={i} className="chip"><i />{e}</span>)}</div>}
      <div className="aic-actions">
        <span className="lab"><Icons.Workflow size={13} /> 下一步</span>
        {acts.map((a) => {
          const C = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[a.icon] ?? Icons.ArrowRight;
          return <button key={a.id} className={`btn sm ${a.tone === 'red' ? '' : a.tone === 'gold' ? 'gold' : a.tone === 'green' ? 'green' : 'ghost'}`} onClick={() => (a.to ? nav(a.to) : onSystem?.(a.id, a.label))}><C size={13} />{a.label}</button>;
        })}
      </div>
    </div>
  );
}
