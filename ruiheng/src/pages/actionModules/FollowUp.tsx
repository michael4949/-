import { Fragment, useEffect, useMemo, useState, type DragEvent } from 'react';
import * as Icons from 'lucide-react';
import { COMPANIES, type Company } from '../../data/companies';
import { PERSONAS } from '../../data/personas';
import { rng } from '../../lib/rng';
import { type ActionModule, type ModuleCtx, type Task, iso, addDays, dayDiff, mdShort, cnDate, mondayOf, hashStr, Sec, AiCard, Field, ChipPick, ChipMulti, Empty, dueLabel, WEEK } from './shared';

/* ====================================================================== 客户跟进提醒（F-KH-010） */
const ME = PERSONAS[1];
const CONTACT: Record<string, string> = { ninggui: '财务总监陈女士', shenghe: '集团财务总监沈总', caisheng: '负责人李先生', beiling: '财务经理徐先生', c05: '外贸经理黄先生', c06: '财务经理赵先生', c07: '会计刘女士', c08: '总经理孙先生', c09: '运营总监周女士', c10: '财务总监何女士', c11: '财务经理高先生', c12: '负责人田先生' };
const SLOTS = [{ k: 'am', t: '上午', s: '09:00', from: 0, to: 12 }, { k: 'pm', t: '下午', s: '14:00', from: 12, to: 17 }, { k: 'ev', t: '傍晚', s: '17:30', from: 17, to: 24 }];
const RESULTS = ['已联系 · 有明确需求', '已联系 · 暂无需求', '未接通 · 改期', '已上门 · 待方案', '已转化 · 进入方案'] as const;
const WAYS = ['短信', '企微', 'OA'];
const CHANNELS = ['电话', '企微', '上门', '短信', 'OA'];

const slotOf = (time: string) => { const h = Number(time.split(':')[0]); return SLOTS.findIndex((s) => h >= s.from && h < s.to); };
const evTone = (t: Task) => (t.channel === '上门' ? 'red' : t.channel === '企微' ? 'green' : t.channel === '电话' ? 'blue' : t.channel === '短信' ? 'purple' : 'orange');
const tierOf = (co: Company) => (co.risk === 'red' || co.risk === 'orange' ? '风险关注' : co.deposit >= 1500 || co.settlement >= 9000 ? '战略客户' : co.deposit >= 600 || co.settlement >= 4000 ? '核心客户' : co.deposit >= 200 ? '成长客户' : '基础客户');
const FREQ: Record<string, [string, number]> = { 风险关注: ['每周', 7], 战略客户: ['每 2 周', 14], 核心客户: ['每 3 周', 21], 成长客户: ['每月', 30], 基础客户: ['每季度', 90] };

function pointFor(t: Task): string {
  const s = t.title;
  if (/续贷|到期/.test(s)) return '确认续贷意向与材料清单（近两年审计报告、最新报表、主要购销合同、纳税申报表），约定提供时间与审批时效';
  if (/结算量|流失|运价/.test(s)) return '了解结算量变化原因（客户流失 / 结算分流 / 季节性），只了解不营销，记录经营变化';
  if (/交付|定点|拜访/.test(s)) return '确认交付排产与首批回款节奏，介绍供应链票据贴现与订单融资的衔接安排';
  if (/开户|子公司/.test(s)) return '说明子公司开户流程与资料清单，提出资金归集与集团现金管理方案的对接时间';
  if (/结汇|收汇/.test(s)) return '确认近期收汇币种、金额与账期，介绍远期结汇锁定区间与叙做流程';
  if (/代发|收单/.test(s)) return '确认员工人数与发薪日，介绍代发与收单联动优惠，约定方案演算时间';
  if (/质押|续作/.test(s)) return '确认知识产权评估有效期与续作材料，同步代发工资方案';
  if (/票据|整改/.test(s)) return '了解票据逾期整改进展与资金安排，明确本行监测要求';
  return '确认客户当前经营重点与近期资金安排，记录需要联动的产品与部门';
}
function genScript(t: Task): string {
  const co = t.co; const contact = CONTACT[co.id] ?? '财务负责人';
  const open = t.channel === '企微'
    ? `【企微消息】${contact}您好，我是远山银行城东支行${ME.name}。想和您约个方便的时间，就「${t.title.replace(co.name, '').trim()}」做个简短沟通，您看本周哪天合适？`
    : t.channel === '上门'
      ? `【上门拜访提纲】拜访对象：${contact}｜事由：${t.title.replace(co.name, '').trim()}｜时长：45 分钟`
      : `【电话话术】${contact}您好，我是远山银行城东支行${ME.name}，现在方便占用您两分钟吗？`;
  return [
    open, '',
    '要点：',
    `1. ${pointFor(t)}`,
    `2. 结合客户近况：${co.note}`,
    `3. 关注标签：${co.tags.join('、')}；本行关系：${co.relation}`,
    '',
    '结束语：感谢您的时间，我把今天提到的材料清单和时间点整理后发您确认；下次沟通建议安排在一周内。',
    '',
    '提示：不评价同业方案；不询问与业务无关的信息；遵守客户联系偏好，非工作时间不外呼。',
  ].join('\n');
}

function FollowUp({ ctx }: { ctx: ModuleCtx }) {
  const { step, tasks, today, cols, selected, select, addLog, moveTask, setTasks, addTask, toast } = ctx;
  const last = cols.length - 1;
  const todayIso = iso(today);
  const active = useMemo(() => tasks.filter((t) => t.col < last), [tasks, last]);
  const todays = useMemo(() => active.filter((t) => dayDiff(t.due, today) <= 0).sort((a, b) => dayDiff(a.due, today) - dayDiff(b.due, today) || a.time.localeCompare(b.time)), [active, today]);
  const overdue = useMemo(() => active.filter((t) => dayDiff(t.due, today) < 0).sort((a, b) => dayDiff(a.due, today) - dayDiff(b.due, today)), [active, today]);

  /* ---- 话术 ---- */
  const [script, setScript] = useState('');
  const [scriptFor, setScriptFor] = useState<string | null>(null);
  const [adopted, setAdopted] = useState(false);
  useEffect(() => { if (selected && selected.id !== scriptFor) { setScript(genScript(selected)); setScriptFor(selected.id); setAdopted(false); } }, [selected, scriptFor]);
  const adoptScript = () => { if (!selected) return; addLog(selected.id, `采用跟进话术与要点（${selected.channel}）：${script.split('\n')[0]}`, 'ai'); setAdopted(true); toast('话术与要点已写入事项时间线，可在详情面板查看'); };

  /* ---- 本周日历 ---- */
  const monday = useMemo(() => mondayOf(today), [today]);
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => { const d = addDays(monday, i); return { iso: iso(d), t: `周${WEEK[d.getDay()]}`, md: mdShort(iso(d)), isToday: iso(d) === todayIso, past: dayDiff(iso(d), today) < 0 }; }), [monday, today, todayIso]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dropTo = (dayIso: string, slot: number) => {
    if (!dragId) return; const t = tasks.find((x) => x.id === dragId);
    setTasks((ts) => ts.map((x) => x.id === dragId ? { ...x, due: dayIso, time: SLOTS[slot].s, synced: false, log: [...x.log, { at: `${mdShort(todayIso)} ${new Date().toTimeString().slice(0, 5)}`, who: ME.name, text: `改期至 ${cnDate(dayIso)} ${SLOTS[slot].t}`, kind: 'user' as const }] } : x));
    if (t) toast(`「${t.co.name} · ${t.title.replace(t.co.name, '').trim()}」已安排到 ${cnDate(dayIso)} ${SLOTS[slot].t}`);
    setDragId(null); setOver(null);
  };
  const onDragStart = (e: DragEvent, id: string) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };

  /* ---- 互动频率建议 ---- */
  const freq = useMemo(() => COMPANIES.map((co) => {
    const r = rng(hashStr(co.id) + 11); const tier = tierOf(co); const [label, gap] = FREQ[tier];
    const lastDays = 3 + Math.floor(r() * 48); const nextOff = gap - lastDays;
    return { co, tier, label, gap, lastDays, nextOff, due: nextOff <= 0 ? '建议本周' : `${nextOff} 天后`, overdue: nextOff < -7 };
  }).sort((a, b) => a.nextOff - b.nextOff), []);
  const addFreq = (f: (typeof freq)[number]) => {
    const dueDate = f.nextOff <= 0 ? days.find((d) => !d.past)?.iso ?? todayIso : iso(addDays(today, f.nextOff));
    const t = addTask({ title: `${f.co.name} 定期互动（${f.label}）`, coId: f.co.id, due: dueDate, time: '10:00', channel: f.tier === '风险关注' ? '电话' : '上门', priority: f.overdue ? 'P1' : 'P2', aiNext: `按 ${f.tier} 互动频率安排：${f.label}，上次互动已 ${f.lastDays} 天` });
    select(t.id); toast(`已加入本周计划：${t.title}`);
  };

  /* ---- 跟进记录 ---- */
  const [recId, setRecId] = useState<string>('');
  const recTask = tasks.find((t) => t.id === (recId || selected?.id)) ?? active[0];
  const [result, setResult] = useState<(typeof RESULTS)[number]>(RESULTS[0]);
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState(iso(addDays(today, 7)));
  const [nextTime, setNextTime] = useState('10:00');
  const [ways, setWays] = useState<string[]>(['企微', 'OA']);
  const [nextCh, setNextCh] = useState('电话');
  const colIdx = (re: RegExp, fb: number) => { const i = cols.findIndex((c) => re.test(c)); return i < 0 ? fb : i; };
  const saveRecord = () => {
    if (!recTask) return;
    const text = `跟进记录：${result}${notes.trim() ? `；${notes.trim()}` : ''}；下次 ${cnDate(nextDate)} ${nextTime}（${nextCh}）；提醒方式 ${ways.join(' / ') || '无'}`;
    addLog(recTask.id, text, 'user');
    const target = /已转化/.test(result) ? last : /已上门/.test(result) ? colIdx(/待回访/, Math.min(last, 2)) : /已联系/.test(result) ? colIdx(/已联系/, Math.min(last, 1)) : recTask.col;
    if (target !== recTask.col) moveTask(recTask.id, target, `跟进结果「${result}」，状态流转至「${cols[target]}」`);
    setTasks((ts) => ts.map((x) => x.id === recTask.id && target !== last ? { ...x, due: nextDate, time: nextTime, channel: nextCh, aiNext: `下次跟进 ${cnDate(nextDate)}：${pointFor(x).split('，')[0]}` } : x));
    setNotes(''); toast(`记录已保存，下次跟进 ${cnDate(nextDate)} ${nextTime}，提醒已设置（${ways.join(' / ') || '未选'}）`);
  };

  /* ---- 同步 CRM ---- */
  const pending = useMemo(() => tasks.filter((t) => !t.synced), [tasks]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncCrm = () => {
    const n = pending.length; const at = new Date().toTimeString().slice(0, 5);
    setTasks((ts) => ts.map((t) => t.synced ? t : { ...t, synced: true, log: [...t.log, { at: `${mdShort(todayIso)} ${at}`, who: '系统', text: '已同步 CRM：跟进记录、下次时间与提醒方式写入客户档案', kind: 'sys' as const }] }));
    setLastSync(`${cnDate(todayIso)} ${at}`); toast(`已同步 ${n} 条跟进记录到 CRM，回执校验通过`);
  };

  /* ================================================================== 渲染 */
  if (step === 0) return (
    <>
      <AiCard text={`今日 ${todays.filter((t) => dayDiff(t.due, today) === 0).length} 条跟进、${overdue.length} 条逾期。${todays[0] ? `建议先处理「${todays[0].co.name} · ${todays[0].title.replace(todays[0].co.name, '').trim()}」，` : ''}到期类事项优先电话确认材料，经营变化类事项以了解为主、不做主动营销。`} />
      <Sec extra="点击一条生成话术与要点">今日跟进</Sec>
      <div className="af-table-wrap">
        <table className="tbl af-today">
          <thead><tr><th>时间</th><th>客户</th><th>事由</th><th>渠道</th><th>负责人</th><th>状态</th></tr></thead>
          <tbody>
            {todays.length === 0 && <tr><td colSpan={6}><Empty icon="CalendarCheck" title="今日暂无到期跟进" sub="可在本周计划中把互动频率建议加入日历" /></td></tr>}
            {todays.map((t) => { const od = dayDiff(t.due, today) < 0; return (
              <tr key={t.id} className={`${od ? 'over' : ''}${selected?.id === t.id ? ' sel' : ''}`} onClick={() => select(t.id)}>
                <td className="tm">{od ? `${mdShort(t.due)} 逾期` : t.time}</td>
                <td><b>{t.co.name}</b></td>
                <td>{t.title.replace(t.co.name, '').trim()}</td>
                <td><span className={`chip ${evTone(t)}`}><i />{t.channel}</span></td>
                <td>{t.ownerName}</td>
                <td><span className={`chip ${od ? 'red' : 'orange'}`}><i />{od ? `逾期 ${-dayDiff(t.due, today)} 天` : cols[t.col]}</span></td>
              </tr>); })}
          </tbody>
        </table>
      </div>
      {selected ? (
        <>
          <Sec extra={`${selected.channel} · ${CONTACT[selected.co.id] ?? '财务负责人'}`}>跟进话术与要点 · {selected.co.name}</Sec>
          <AiCard tone="gold" adopted={adopted} onAdopt={adoptScript} adoptLabel="采用并写入时间线">
            <textarea className="af-inp af-script" style={{ minHeight: 210 }} value={script} onChange={(e) => { setScript(e.target.value); setAdopted(false); }} />
            <div className="af-row" style={{ marginTop: 6 }}>
              <button className="btn ghost sm" onClick={() => { setScript(genScript(selected)); setAdopted(false); }}><Icons.RotateCcw size={12} />重新生成</button>
              <button className="btn ghost sm" onClick={() => { navigator.clipboard?.writeText(script).catch(() => undefined); toast('话术已复制'); }}><Icons.Copy size={12} />复制</button>
              <button className="btn green sm" onClick={() => { const i = colIdx(/已联系/, 1); moveTask(selected.id, i, `已按话术完成${selected.channel}跟进`); toast(`已标记「已联系」，请在「跟进记录」填写结果`); }}><Icons.PhoneCall size={12} />标记已联系</button>
            </div>
          </AiCard>
        </>
      ) : <Empty icon="MessageSquareText" title="选择一条跟进生成话术" sub="AI 按渠道生成开场、要点与结束语，可编辑后一键采用" />}
    </>
  );

  if (step === 1) return (
    <>
      <AiCard text={`本周建议：上门 ${active.filter((t) => t.channel === '上门' && days.some((d) => d.iso === t.due)).length} 次、电话 / 企微 ${active.filter((t) => t.channel !== '上门' && days.some((d) => d.iso === t.due)).length} 次。上门优先安排周二、周三上午，月初结账日避免打扰财务；逾期事项可直接拖入空档。`} />
      <Sec extra="拖拽事项到时段即可改期">本周日历（周一 ~ 周五）</Sec>
      <div className="af-cal">
        <div className="rl"><small>时段</small></div>
        {days.map((d) => <div key={d.iso} className={`hd${d.isToday ? ' today' : ''}`}>{d.t}<small>{d.md}{d.isToday ? ' · 今天' : ''}</small></div>)}
        {SLOTS.map((s, si) => (
          <Fragment key={s.k}>
            <div className="rl">{s.t}<small>{s.s}</small></div>
            {days.map((d) => { const key = `${d.iso}-${si}`; const evs = active.filter((t) => t.due === d.iso && slotOf(t.time) === si); return (
              <div key={key} className={`af-slot${over === key ? ' over' : ''}${d.past ? ' past' : ''}`} onDragOver={(e) => { e.preventDefault(); if (over !== key) setOver(key); }} onDragLeave={() => setOver(null)} onDrop={(e) => { e.preventDefault(); dropTo(d.iso, si); }}>
                {evs.map((t) => <div key={t.id} className={`af-ev ${evTone(t)}${selected?.id === t.id ? ' sel' : ''}`} draggable onDragStart={(e) => onDragStart(e, t.id)} onDragEnd={() => { setDragId(null); setOver(null); }} onClick={() => select(t.id)} title={t.title}><Icons.GripVertical size={10} /><span className="nm">{t.co.name}</span><span>{t.time}</span></div>)}
              </div>); })}
          </Fragment>
        ))}
      </div>
      {overdue.length > 0 && <><Sec extra="拖入日历重新安排">待安排的逾期事项</Sec><div className="af-row">{overdue.map((t) => <div key={t.id} className={`af-ev red${selected?.id === t.id ? ' sel' : ''}`} draggable onDragStart={(e) => onDragStart(e, t.id)} onDragEnd={() => { setDragId(null); setOver(null); }} onClick={() => select(t.id)}><Icons.GripVertical size={10} /><span className="nm">{t.co.name} · {t.title.replace(t.co.name, '').trim()}</span><span>{mdShort(t.due)}</span></div>)}</div></>}
      <Sec extra="按客户层级与上次互动间隔计算">互动频率建议</Sec>
      <div className="af-table-wrap">
        <table className="tbl af-freq">
          <thead><tr><th>客户</th><th>层级</th><th>建议频率</th><th>上次互动</th><th>下次建议</th><th></th></tr></thead>
          <tbody>{freq.slice(0, 8).map((f) => (
            <tr key={f.co.id}>
              <td><b>{f.co.name}</b><div className="af-mini">{f.co.relation}</div></td>
              <td><span className={`chip ${f.tier === '风险关注' ? 'red' : f.tier === '战略客户' ? 'purple' : f.tier === '核心客户' ? '' : f.tier === '成长客户' ? 'green' : 'blue'}`}><i />{f.tier}</span></td>
              <td><b>{f.label}</b></td>
              <td>{f.lastDays} 天前</td>
              <td className={f.nextOff <= 0 ? 'red-text' : ''} style={{ fontWeight: 800 }}>{f.due}{f.overdue ? '（已超频次）' : ''}</td>
              <td><button className="btn ghost sm" onClick={() => addFreq(f)}><Icons.CalendarPlus size={12} />加入日历</button></td>
            </tr>))}</tbody>
        </table>
      </div>
    </>
  );

  if (step === 2) return (
    <>
      <AiCard tone="red" text={overdue.length ? `${overdue.length} 条逾期。${overdue[0].co.name} 逾期最久（${-dayDiff(overdue[0].due, today)} 天）${overdue[0].co.risk === 'red' || overdue[0].co.risk === 'orange' ? '且存在风险信号' : ''}，建议今日电话并记录经营变化；逾期超 30 天的客户升级至团队负责人。` : '当前没有逾期跟进，保持本周计划即可。'} />
      <Sec extra={`${overdue.length} 条`}>逾期提醒</Sec>
      {overdue.length === 0 && <Empty icon="ShieldCheck" title="没有逾期事项" />}
      {overdue.map((t) => (
        <div key={t.id} className={`af-rem over${selected?.id === t.id ? ' sel' : ''}`} onClick={() => select(t.id)} style={{ alignItems: 'flex-start' }}>
          <span className="tm">{mdShort(t.due)}</span>
          <div className="bd">
            <b>{t.co.name} · {t.title.replace(t.co.name, '').trim()}</b>
            <span>逾期 {-dayDiff(t.due, today)} 天 · {t.channel} · {t.ownerName} · {cols[t.col]}</span>
            <div className="af-row" style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
              <button className="btn sm" onClick={() => { select(t.id); ctx.setStep(0); toast('已切换到今日跟进，话术已生成'); }}><Icons.PhoneCall size={12} />立即联系</button>
              <button className="btn ghost sm" onClick={() => { const d = iso(addDays(today, 2)); setTasks((ts) => ts.map((x) => x.id === t.id ? { ...x, due: d, synced: false } : x)); addLog(t.id, `逾期改期至 ${cnDate(d)}`, 'user'); toast(`已改期至 ${cnDate(d)}`); }}><Icons.CalendarClock size={12} />改期 +2 天</button>
              <button className="btn ghost sm" onClick={() => { addLog(t.id, `逾期升级至团队负责人 ${PERSONAS[2].name}，请求陪同跟进`, 'user'); toast(`已升级至 ${PERSONAS[2].name}，OA 待办已生成`); }}><Icons.ArrowUpRight size={12} />升级至负责人</button>
            </div>
          </div>
          <span className={`chip ${t.co.risk === 'red' ? 'red' : t.co.risk === 'orange' ? 'orange' : ''}`}><i />{t.co.risk === 'red' ? '红色信号' : t.co.risk === 'orange' ? '橙色信号' : t.priority}</span>
        </div>
      ))}
    </>
  );

  if (step === 3) return (
    <>
      <AiCard text="记录建议按「结果 / 要点 / 下次时间」三段式填写；有明确需求的客户建议 3 个工作日内回访并联动产品经理，未接通的改期不超过 2 天。" />
      <Field label="跟进事项" req>
        <select className="af-inp" value={recTask?.id ?? ''} onChange={(e) => { setRecId(e.target.value); select(e.target.value); }}>
          {active.map((t) => <option key={t.id} value={t.id}>{t.co.name} · {t.title.replace(t.co.name, '').trim()} · {dueLabel(t, today, last)}</option>)}
        </select>
      </Field>
      <Field label="跟进结果" req><ChipPick options={RESULTS} value={result} onChange={setResult} tone="green" /></Field>
      <Field label="要点与客户反馈"><textarea className="af-inp" placeholder="客户反馈、材料承诺、需要联动的产品或部门……" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <div className="af-grid2">
        <Field label="下次跟进日期"><input className="af-inp" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></Field>
        <Field label="时间"><input className="af-inp" type="time" value={nextTime} onChange={(e) => setNextTime(e.target.value)} /></Field>
      </div>
      <Field label="下次渠道"><ChipPick options={CHANNELS} value={nextCh} onChange={setNextCh} tone="blue" /></Field>
      <Field label="提醒方式" hint="遵守客户联系偏好"><ChipMulti options={WAYS} value={ways} onChange={setWays} /></Field>
      <div className="af-row end"><button className="btn" onClick={saveRecord} disabled={!recTask}><Icons.Save size={13} />保存记录并设置提醒</button></div>
    </>
  );

  return (
    <>
      <AiCard tone="green" text={`${pending.length} 条记录待同步；字段映射已按行内 CRM 标准配置，与现有拜访记录无重复。${lastSync ? `上次同步：${lastSync}。` : ''}`} />
      <Sec extra={`${pending.length} 条待同步`}>待同步记录</Sec>
      <div className="af-table-wrap">
        <table className="tbl">
          <thead><tr><th>客户</th><th>事项</th><th>最新记录</th><th>状态</th></tr></thead>
          <tbody>
            {pending.length === 0 && <tr><td colSpan={4}><Empty icon="DatabaseZap" title="全部记录已同步 CRM" /></td></tr>}
            {pending.map((t) => { const l = t.log[t.log.length - 1]; return <tr key={t.id} onClick={() => select(t.id)} style={{ cursor: 'pointer' }}><td><b>{t.co.name}</b></td><td>{t.title.replace(t.co.name, '').trim()}</td><td className="af-mini">{l.text.slice(0, 40)}{l.text.length > 40 ? '…' : ''}<br />{l.at} · {l.who}</td><td><span className="chip"><i />{cols[t.col]}</span></td></tr>; })}
          </tbody>
        </table>
      </div>
      <Sec>字段映射</Sec>
      <div className="af-kv">
        {[['跟进结果', 'CRM.contact_result'], ['要点与反馈', 'CRM.remark'], ['下次跟进时间', 'CRM.next_contact_at'], ['渠道', 'CRM.channel'], ['提醒方式', 'CRM.remind_via'], ['AI 建议', 'CRM.ai_suggestion（标注 AI 生成）']].map(([k, v]) => <div key={k} className="row"><span>{k}</span><span>{v}</span></div>)}
      </div>
      <div className="af-row end" style={{ marginTop: 12 }}>
        <button className="btn ghost sm" onClick={() => toast('已生成同步预览（差异 0 条冲突）')}><Icons.Eye size={12} />预览差异</button>
        <button className="btn green" disabled={!pending.length} onClick={syncCrm}><Icons.DatabaseZap size={13} />同步 CRM（{pending.length}）</button>
      </div>
    </>
  );
}

export const FollowUpModule: ActionModule = { Component: FollowUp, wide: (s) => s === 0 || s === 1 || s === 4 };
