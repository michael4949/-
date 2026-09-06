import { useEffect, useRef, useState } from 'react';
import { Search, Check, Ban, RotateCcw, Database, ShieldCheck } from 'lucide-react';
import type { Evidence, EvSource, Phase } from './types';
import { EV_SOURCES } from './types';
import { SOURCE_NOTE, SOURCE_TONE } from './evidence';

/** 证据检索面板：逐源检索、证据卡逐条出现；可展开、可标记"不采信"。 */
export default function EvidencePanel({ evidence, phase, token, excluded, onToggle, onDone, title = '证据检索' }: {
  evidence: Evidence[]; phase: Phase; token: number; excluded: Set<string>; onToggle: (id: string) => void; onDone: () => void; title?: string;
}) {
  const [srcN, setSrcN] = useState(0);
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const doneRef = useRef(onDone); doneRef.current = onDone;
  const total = evidence.length;

  useEffect(() => {
    if (phase !== 'retrieving') return;
    setSrcN(0); setShown(0); setOpen(null);
    const timers: number[] = [];
    EV_SOURCES.forEach((_, i) => timers.push(window.setTimeout(() => setSrcN(i + 1), 320 * (i + 1))));
    for (let i = 1; i <= total; i++) timers.push(window.setTimeout(() => setShown(i), 520 + 230 * i));
    timers.push(window.setTimeout(() => doneRef.current(), Math.max(320 * EV_SOURCES.length, 520 + 230 * total) + 420));
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [phase, token, total]);

  const visible = phase === 'retrieving' ? evidence.slice(0, shown) : phase === 'done' ? evidence : [];
  const countOf = (s: EvSource) => evidence.filter((e) => e.source === s).length;
  const exN = evidence.filter((e) => excluded.has(e.id)).length;

  return (
    <div className="ai-ev">
      <div className="card-h">
        <div className="card-t"><Database size={14} />{title}{phase === 'retrieving' && <span className="pulse" />}</div>
        <span className="card-s">{phase === 'idle' ? '生成时先检索证据' : phase === 'retrieving' ? `AI 正在检索 · ${visible.length}/${total}` : `检索完成 · ${total} 条证据${exN ? ` · 已排除 ${exN} 条` : ''}`}</span>
      </div>
      <div className="ai-src">
        {EV_SOURCES.map((s, i) => {
          const st = phase === 'idle' ? '' : phase === 'retrieving' && i === srcN ? 'run' : i < srcN || phase === 'done' ? 'ok' : '';
          const n = countOf(s);
          return (
            <div key={s} className={`s ${st}`}>
              <b>{st === 'run' ? <Search size={11} /> : st === 'ok' ? <Check size={11} /> : <span style={{ width: 11 }} />}{s}</b>
              <span>{st === 'run' ? '检索中…' : st === 'ok' ? (n ? `${n} 条命中` : '无新增') : '待检索'}</span>
            </div>
          );
        })}
      </div>
      {phase === 'idle' && <div className="ai-ev-empty"><div><div className="ring"><Search size={20} /></div>点击生成后，AI 先检索六类来源并逐条列出证据；<br />每条证据可展开核对，也可标记"不采信"，结果随之重算。</div></div>}
      {phase !== 'idle' && (
        <div className="ai-evl">
          {visible.map((e) => {
            const off = excluded.has(e.id);
            const isOpen = open === e.id;
            return (
              <div key={e.id} id={`ev-${e.id}`} className={`ai-evc fade-in${off ? ' off' : ''}`} onClick={() => setOpen(isOpen ? null : e.id)}>
                <div className="hd">
                  <span className="id">{e.id}</span>
                  <span className={`chip ${SOURCE_TONE[e.source]}`} style={{ padding: '1px 8px', fontSize: 11 }}><i />{e.source}</span>
                  <span className="t">{e.title}</span>
                  <span className="tm">{e.time}</span>
                </div>
                <div className="rel"><span>相关度</span><div className="bar"><i style={{ width: `${e.relevance}%` }} /></div><b className="num">{e.relevance}%</b></div>
                <div className="ex">{e.excerpt}</div>
                {isOpen && (
                  <div className="dt fade-in" onClick={(ev) => ev.stopPropagation()}>
                    {e.detail && <div style={{ marginBottom: 4 }}>{e.detail}</div>}
                    <div className="row"><span>来源说明</span><b><ShieldCheck size={10} style={{ verticalAlign: -1 }} /> {SOURCE_NOTE[e.source]}</b></div>
                    <div className="row"><span>命中标签</span><b>{e.tags.join(' · ')}</b></div>
                    {e.entity && <div className="row"><span>关联主体</span><b>{e.entity}</b></div>}
                    <div className="row"><span>采信状态</span><b className={off ? 'red-text' : 'green-text'}>{off ? '已标记不采信，本条不参与推理与计算' : '已采信，参与推理与计算'}</b></div>
                  </div>
                )}
                <div className="ft" onClick={(ev) => ev.stopPropagation()}>
                  <button className="lnk" onClick={() => setOpen(isOpen ? null : e.id)}>{isOpen ? '收起' : '展开核对'}</button>
                  <button className={`btn sm ${off ? 'green' : 'ghost'}`} onClick={() => onToggle(e.id)}>{off ? <><RotateCcw size={11} />恢复采信</> : <><Ban size={11} />不采信</>}</button>
                </div>
              </div>
            );
          })}
          {phase === 'retrieving' && visible.length < total && <div className="ai-muted" style={{ padding: '6px 4px' }}><span className="ai-typing"><i /><i /><i /></span> 正在读取与比对…</div>}
        </div>
      )}
    </div>
  );
}
