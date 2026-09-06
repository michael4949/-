/** 教练编辑器（管理）：新建 / 编辑教练 —— 角色设定、剧本步骤（流程票项）、评分规则、红线项开关、保存 */
import { useState } from 'react';
import * as Icons from 'lucide-react';
import { G } from './coaches';
import type { Coach } from './coaches';
import { DIMS, RED_RULES } from './data';
import type { TicketItem, TicketStage } from './data';

interface Step { id: string; stage: string; name: string; points: string; errors: string; score: number; redline: boolean; script: string; reply: string; keywords: string }
interface Draft { id: string; name: string; task: string; category: string; difficulty: number; role: Coach['role']; goal: string; opening: string; steps: Step[]; weights: number[]; passLine: number; examLine: number; redlines: string[]; grad: string; icon: string }

const toDraft = (c: Coach): Draft => ({
  id: c.id, name: c.name, task: c.task, category: c.category, difficulty: c.difficulty, role: { ...c.role }, goal: c.goal, opening: c.opening, grad: c.grad, icon: c.icon,
  steps: c.stages.flatMap((s) => s.items.map((it) => ({ id: it.id, stage: s.name, name: it.name, points: it.points.join('；'), errors: it.errors.join('；'), score: it.score, redline: !!it.redline, script: it.script, reply: it.reply, keywords: it.keywords.join('、') }))),
  weights: [...c.weights], passLine: c.passLine, examLine: c.examLine, redlines: [...c.redlines],
});
const blank = (): Draft => ({
  id: `custom-${Date.now().toString(36)}`, name: '新教练', task: '请填写对应的真实工作任务', category: '获客', difficulty: 3, grad: G.teal, icon: 'Sparkles',
  role: { name: '客户', title: '财务总监', company: '', traits: ['务实'], emotion: '观望', mood: 50, initial: '客', grad: G.teal }, goal: '', opening: '你好，你们银行今天来是要谈什么？',
  steps: [{ id: 'n1', stage: '第一段 · 开场', name: '自我介绍与来意', points: '报姓名与角色；说明来意与时间', errors: '开口即推产品', score: 10, redline: false, script: '', reply: '嗯，你说。', keywords: '我是、来意、今天' }],
  weights: DIMS.map(() => 1), passLine: 60, examLine: 75, redlines: RED_RULES.map((r) => r.id),
});
const split = (s: string) => s.split(/[；;、，,\n]/).map((x) => x.trim()).filter(Boolean);
const toCoach = (d: Draft): Coach => {
  const stages: TicketStage[] = [];
  d.steps.forEach((st) => {
    let stage = stages.find((s) => s.name === st.stage);
    if (!stage) { stage = { id: `s${stages.length + 1}`, name: st.stage || `第${stages.length + 1}段`, items: [] }; stages.push(stage); }
    const item: TicketItem = { id: st.id, name: st.name, points: split(st.points), errors: split(st.errors), score: st.score, redline: st.redline, keywords: split(st.keywords).length ? split(st.keywords) : [st.name], script: st.script || split(st.points).join('，'), reply: st.reply || '嗯，继续。' };
    stage.items.push(item);
  });
  return { id: d.id, fids: ['F-SY-007'], name: d.name, task: d.task, category: d.category, icon: d.icon, grad: d.grad, difficulty: Math.min(5, Math.max(1, d.difficulty)) as Coach['difficulty'], role: { ...d.role, initial: d.role.name[0] ?? '客', grad: d.grad }, goal: d.goal, opening: d.opening, stages, redlines: d.redlines, passLine: d.passLine, examLine: d.examLine, weights: d.weights };
};

export default function CoachEditor({ coaches, onSave, onTry }: { coaches: Coach[]; onSave: (c: Coach) => void; onTry: (id: string) => void }) {
  const [sel, setSel] = useState<string>(coaches[1]?.id ?? coaches[0].id);
  const [draft, setDraft] = useState<Draft>(() => toDraft(coaches[1] ?? coaches[0]));
  const [saved, setSaved] = useState(false);
  const pick = (c: Coach) => { setSel(c.id); setDraft(toDraft(c)); setSaved(false); };
  const create = () => { const d = blank(); setSel(d.id); setDraft(d); setSaved(false); };
  const up = (p: Partial<Draft>) => { setDraft({ ...draft, ...p }); setSaved(false); };
  const upStep = (i: number, p: Partial<Step>) => up({ steps: draft.steps.map((s, k) => (k === i ? { ...s, ...p } : s)) });
  const addStep = () => up({ steps: [...draft.steps, { id: `n${draft.steps.length + 1}-${Date.now().toString(36)}`, stage: draft.steps[draft.steps.length - 1]?.stage ?? '第一段', name: '新流程项', points: '', errors: '', score: 8, redline: false, script: '', reply: '', keywords: '' }] });
  const delStep = (i: number) => up({ steps: draft.steps.filter((_, k) => k !== i) });
  const total = draft.steps.reduce((a, s) => a + s.score, 0);
  const save = () => { onSave(toCoach(draft)); setSaved(true); };
  const stagesInDraft = Array.from(new Set(draft.steps.map((s) => s.stage)));
  return (
    <div className="fade-in">
      <div className="spa-h">
        <div><h2>教练编辑器 <span className="chip purple" style={{ verticalAlign: 'middle' }}>管理</span></h2><p>角色设定 → 剧本步骤（流程票项：名称 / 要点 / 常见错误 / 分值 / 红线项）→ 评分规则 → 保存后即可在教练中心使用</p></div>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn ghost sm" onClick={create}><Icons.Plus size={13} />新建教练</button><button className="btn sm gold" onClick={() => onTry(sel)} disabled={!coaches.some((c) => c.id === sel)}><Icons.Play size={13} />试练此教练</button><button className="btn sm" onClick={save}><Icons.Save size={13} />{saved ? '已保存' : '保存'}</button></div>
      </div>
      <div className="spa-editor">
        <div className="card spa-ed-list">
          <div className="card-h"><div className="card-t"><span className="dot" />教练列表</div><span className="card-s">{coaches.length} 位</span></div>
          {coaches.map((c) => <button key={c.id} className={sel === c.id ? 'on' : ''} onClick={() => pick(c)}><span className="av" style={{ background: c.grad }}>{c.role.initial}</span>{c.name}<span className="cnt">{c.stages.reduce((a, s) => a + s.items.length, 0)} 项</span></button>)}
          {!coaches.some((c) => c.id === sel) && <button className="on"><span className="av" style={{ background: draft.grad }}>{draft.role.name[0]}</span>{draft.name}<span className="cnt">未保存</span></button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="card-h"><div className="card-t"><span className="dot" />角色设定</div><span className="card-s">客户角色 / 性格 / 情绪 / 企业背景</span></div>
            <div className="spa-form">
              <div><label className="spa-lbl">教练名称</label><input className="spa-inp" value={draft.name} onChange={(e) => up({ name: e.target.value })} /></div>
              <div><label className="spa-lbl">对应工作任务</label><input className="spa-inp" value={draft.task} onChange={(e) => up({ task: e.target.value })} /></div>
              <div><label className="spa-lbl">客户角色（姓名 / 职务）</label><div style={{ display: 'flex', gap: 6 }}><input className="spa-inp" value={draft.role.name} onChange={(e) => up({ role: { ...draft.role, name: e.target.value } })} /><input className="spa-inp" value={draft.role.title} onChange={(e) => up({ role: { ...draft.role, title: e.target.value } })} /></div></div>
              <div><label className="spa-lbl">企业背景</label><input className="spa-inp" value={draft.role.company} onChange={(e) => up({ role: { ...draft.role, company: e.target.value } })} placeholder="例：宁桂精密机械 · 新能源车企定点供应商" /></div>
              <div><label className="spa-lbl">性格（顿号分隔）</label><input className="spa-inp" value={draft.role.traits.join('、')} onChange={(e) => up({ role: { ...draft.role, traits: split(e.target.value) } })} /></div>
              <div><label className="spa-lbl">情绪 / 初始情绪值</label><div style={{ display: 'flex', gap: 6 }}><input className="spa-inp" value={draft.role.emotion} onChange={(e) => up({ role: { ...draft.role, emotion: e.target.value } })} /><input className="spa-inp" type="number" style={{ width: 90 }} value={draft.role.mood} onChange={(e) => up({ role: { ...draft.role, mood: Number(e.target.value) } })} /></div></div>
              <div><label className="spa-lbl">类别 / 难度（1–5）</label><div style={{ display: 'flex', gap: 6 }}><input className="spa-inp" value={draft.category} onChange={(e) => up({ category: e.target.value })} /><input className="spa-inp" type="number" min={1} max={5} style={{ width: 90 }} value={draft.difficulty} onChange={(e) => up({ difficulty: Number(e.target.value) })} /></div></div>
              <div><label className="spa-lbl">头像配色</label><div style={{ display: 'flex', gap: 6 }}>{Object.entries(G).map(([k, g]) => <span key={k} onClick={() => up({ grad: g })} style={{ width: 26, height: 26, borderRadius: 8, background: g, cursor: 'pointer', boxShadow: draft.grad === g ? '0 0 0 2px #fff, 0 0 0 4px #c3272b' : 'none' }} />)}</div></div>
              <div className="full"><label className="spa-lbl">本场目标</label><input className="spa-inp" value={draft.goal} onChange={(e) => up({ goal: e.target.value })} /></div>
              <div className="full"><label className="spa-lbl">客户开场白</label><textarea className="spa-inp" value={draft.opening} onChange={(e) => up({ opening: e.target.value })} /></div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><div className="card-t"><span className="dot" />剧本步骤 · 流程票</div><span className="card-s">{stagesInDraft.length} 段 {draft.steps.length} 项 · 合计 {total} 分</span></div>
            <div className="spa-step-h"><span>#</span><span>段 / 名称</span><span>要点（；分隔）</span><span>常见错误</span><span>分值</span><span>红线项</span><span /></div>
            {draft.steps.map((s, i) => (
              <div key={s.id} className={`spa-step${s.redline ? ' red' : ''}`}>
                <span className="n">{i + 1}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><input className="spa-inp" value={s.stage} onChange={(e) => upStep(i, { stage: e.target.value })} placeholder="段名" /><input className="spa-inp" value={s.name} onChange={(e) => upStep(i, { name: e.target.value })} placeholder="流程项名称" /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><textarea className="spa-inp" style={{ minHeight: 30 }} value={s.points} onChange={(e) => upStep(i, { points: e.target.value })} placeholder="要点" /><input className="spa-inp" value={s.keywords} onChange={(e) => upStep(i, { keywords: e.target.value })} placeholder="识别关键词（顿号分隔）" /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><textarea className="spa-inp" style={{ minHeight: 30 }} value={s.errors} onChange={(e) => upStep(i, { errors: e.target.value })} placeholder="常见错误" /><input className="spa-inp" value={s.reply} onChange={(e) => upStep(i, { reply: e.target.value })} placeholder="客户回应" /></div>
                <input className="spa-inp" type="number" value={s.score} onChange={(e) => upStep(i, { score: Number(e.target.value) })} />
                <span className={`spa-tog${s.redline ? ' on' : ''}`} onClick={() => upStep(i, { redline: !s.redline })}><span className="sw" />{s.redline ? '红线' : '普通'}</span>
                <button className="spa-icon-btn" onClick={() => delStep(i)} title="删除"><Icons.Trash2 size={13} /></button>
              </div>
            ))}
            <button className="btn sm ghost" onClick={addStep}><Icons.Plus size={12} />添加流程项</button>
            <div className="card-s" style={{ marginTop: 8 }}>「设为红线项」的流程项：在考核模式下未完成即判定本场不通过；每项按五拍闭环（想清楚 → 复述确认 → 提问 / 陈述 → 核对回应 → 记录）计分。</div>
          </div>
          <div className="card gold">
            <div className="card-h"><div className="card-t"><span className="dot" />评分规则</div><span className="card-s">维度权重 / 及格线 / 考核线 / 红线</span></div>
            <div className="spa-weights">{DIMS.map((d, i) => <div key={d} className="spa-weight"><b>{d}<span>{draft.weights[i].toFixed(1)}</span></b><input type="range" min={0} max={2} step={0.1} value={draft.weights[i]} onChange={(e) => up({ weights: draft.weights.map((w, k) => (k === i ? Number(e.target.value) : w)) })} /></div>)}</div>
            <div className="spa-form" style={{ marginTop: 10 }}>
              <div><label className="spa-lbl">及格线</label><input className="spa-inp" type="number" value={draft.passLine} onChange={(e) => up({ passLine: Number(e.target.value) })} /></div>
              <div><label className="spa-lbl">考核线</label><input className="spa-inp" type="number" value={draft.examLine} onChange={(e) => up({ examLine: Number(e.target.value) })} /></div>
              <div className="full"><label className="spa-lbl">启用的红线（一票否决）</label>
                <div className="spa-chk-list">{RED_RULES.map((r) => <label key={r.id} className={draft.redlines.includes(r.id) ? 'on' : ''}><input type="checkbox" hidden checked={draft.redlines.includes(r.id)} onChange={() => up({ redlines: draft.redlines.includes(r.id) ? draft.redlines.filter((x) => x !== r.id) : [...draft.redlines, r.id] })} />{r.label}</label>)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <button className="btn" onClick={save}><Icons.Save size={13} />{saved ? '已保存' : '保存教练'}</button>
              {saved && <span className="chip green"><i />已保存 · 可在教练中心开始练习</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
