import { useState } from 'react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACTIONS, actionsOf } from '../../lib/actions';
import { DEPTS } from '../../components/DocActions';

/** 联动动作按钮组：有 to 的跳转到相应功能页，system 动作交给父级（推送 OA / 写回 CRM / 转呈弹窗）。 */
export type SystemHandler = (id: string, label: string) => void;
const LucideByName = Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>;

export function ActionBtns({ ids, onSystem, ghost, className }: { ids: string[]; onSystem?: SystemHandler; ghost?: boolean; className?: string }) {
  const nav = useNavigate();
  const acts = actionsOf(ids);
  if (!acts.length) return null;
  return (
    <div className={`fp-acts${className ? ` ${className}` : ''}`}>
      {acts.map((a) => {
        const C = LucideByName[a.icon] ?? Icons.ArrowRight;
        const tone = ghost ? 'ghost' : a.tone === 'red' ? '' : a.tone === 'gold' ? 'gold' : a.tone === 'green' ? 'green' : 'ghost';
        return (
          <button key={a.id} className={`btn sm ${tone}`} onClick={() => (a.to ? nav(a.to) : onSystem?.(a.id, a.label))} title={a.to ? `打开 ${a.label}` : a.label}>
            <C size={12} />{a.label}
          </button>
        );
      })}
    </div>
  );
}

/** 单个联动按钮（面板右上角「联动」） */
export function LinkBtn({ to, label }: { to: string; label: string }) {
  const nav = useNavigate();
  return (
    <button className="fp-link" onClick={() => nav(to)} title={`联动：${label}`}>
      <Icons.Workflow size={11} />联动<Icons.ChevronRight size={11} />
    </button>
  );
}

/** 转呈弹窗：与文书操作条的转呈保持同一部门清单与交互 */
export function ForwardModal({ title, onClose, onToast }: { title: string; onClose: () => void; onToast: (m: string) => void }) {
  const [dept, setDept] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [urgent, setUrgent] = useState('普通');
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal card fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="card-h"><div className="card-t"><span className="dot" />转呈 · {title}</div><button className="up-x" onClick={onClose}><Icons.X size={14} /></button></div>
        <div className="card-s" style={{ marginBottom: 8 }}>选择接收部门 / 岗位（可多选），系统将连同 AI 结论、依据文件与复核记录一并推送到行内 OA。</div>
        <div className="modal-depts">{DEPTS.map((d) => <button key={d} className={`chip${dept.includes(d) ? ' red' : ''}`} onClick={() => setDept((x) => x.includes(d) ? x.filter((y) => y !== d) : [...x, d])}><i />{d}</button>)}</div>
        <div className="modal-row"><span>紧急程度</span>{['普通', '加急', '特急'].map((u) => <button key={u} className={`chip${urgent === u ? ' orange' : ''}`} onClick={() => setUrgent(u)}><i />{u}</button>)}</div>
        <textarea className="modal-note" placeholder="附言（可选）：请关注结论中的第 2 条要点……" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="modal-foot">
          <span className="ai-tag">转呈内容含 AI 生成段落标识与复核人</span>
          <button className="btn" disabled={!dept.length} onClick={() => { onToast(`已转呈 ${dept.join('、')}（${urgent}），OA 待办已生成`); onClose(); }}><Icons.Send size={13} />确认转呈</button>
        </div>
      </div>
    </div>
  );
}

export const systemToast = (id: string, label: string): string =>
  id === 'oa' ? '已推送行内 OA 待办' : id === 'crm' ? '已写回 CRM' : `已执行：${label}`;

export const hasAction = (id: string) => Boolean(ACTIONS[id]);
