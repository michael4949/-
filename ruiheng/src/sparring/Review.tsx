/** 评分复盘：本次评价 / 10 维雷达（本次 vs 团队）/ 流程票得分条 / 逐句点评 / 标签 / 复盘摘要 / 错题重练 / 本人确认 */
import { useState } from 'react';
import * as Icons from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import type { Coach } from './coaches';
import { modeById, fmtDur, BEATS } from './data';
import type { SessionResult, Student } from './data';

interface Props { result: SessionResult | null; coach: Coach; student: Student; onRetry: (ids: string[]) => void; onAgain: () => void; onCoaches: () => void; onGrowth: () => void }

export default function Review({ result: r, coach, student, onRetry, onAgain, onCoaches, onGrowth }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  if (!r) return (
    <div className="card fade-in" style={{ textAlign: 'center', padding: 40 }}>
      <Icons.ClipboardCheck size={36} color="#c9a24d" />
      <div style={{ fontSize: 16, fontWeight: 900, margin: '10px 0 4px' }}>暂无本场复盘</div>
      <div className="card-s">在陪练舱完成一场陪练后，这里会显示本次评价、十维雷达、流程票得分与逐句点评。</div>
      <button className="btn" style={{ marginTop: 14 }} onClick={onCoaches}><Icons.Users size={13} />去教练中心选择教练</button>
    </div>
  );
  const line = r.mode === 'exam' ? r.examLine : r.passLine;
  const tone = r.vetoed ? 'red-text' : r.score >= line ? 'green-text' : 'gold-text';
  const retryable = r.retryItems.length > 0;
  return (
    <div className="fade-in">
      <div className="spa-h">
        <div><h2>评分复盘 · {r.coachName}</h2><p>{r.date} · {modeById(r.mode).name} · 虚拟客户 {coach.role.name}（{coach.role.title}）· 学员 {student.name}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn gold" onClick={() => onRetry(r.retryItems)} disabled={!retryable}><Icons.RotateCcw size={13} />错题重练（{r.retryItems.length} 项）</button>
          <button className="btn ghost" onClick={onAgain}><Icons.Repeat size={13} />再练一场</button>
        </div>
      </div>

      <div className={`spa-score${r.vetoed ? ' veto' : ''}`}>
        <div><div className="card-s">本次得分</div><div className={`big ${tone}`}>{r.score}<small> / 100</small></div></div>
        <div className="facts">
          <div><b className={r.passed ? 'spa-tone-green' : 'spa-tone-red'}>{r.vetoed ? '不通过 · 一票否决' : r.passed ? '通过' : '未通过'}</b>{r.mode === 'exam' ? '考核线' : '及格线'} {line} 分</div>
          <div><b>{fmtDur(r.durationSec)}</b>用时</div>
          <div><b>{r.hintsUsed}</b>提示次数</div>
          <div><b className={r.deductTotal ? 'spa-tone-red' : 'spa-tone-green'}>-{r.deductTotal}</b>扣分合计</div>
          <div><b>{r.ticketScore}/{r.ticketMax}</b>流程票</div>
          <div><b>{r.items.filter((i) => i.covered).length}/{r.items.length}</b>覆盖流程项</div>
          <div><b className={r.redlines.length ? 'spa-tone-red' : 'spa-tone-green'}>{r.redlines.length ? r.redlines.join('、') : '无'}</b>红线触发</div>
          <div><b>{r.turns.filter((t) => t.role === 'me').length}</b>对话轮次</div>
        </div>
        <div style={{ marginLeft: 'auto' }}><span className="ai-tag"><Icons.Sparkles size={12} />评分引擎 · 本机 · 无外联</span></div>
      </div>

      <div className="spa-grid spa-c3" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />十维雷达</div><span className="card-s">本次 vs 团队均值</span></div>
          <div style={{ height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={r.dims} cx="50%" cy="50%" outerRadius="70%">
                <defs>
                  <linearGradient id="rvMe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5da2" stopOpacity={.7} /><stop offset=".5" stopColor="#9b5de5" stopOpacity={.55} /><stop offset="1" stopColor="#3a86ff" stopOpacity={.5} /></linearGradient>
                  <linearGradient id="rvTeam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f4b942" stopOpacity={.4} /><stop offset="1" stopColor="#2dc48d" stopOpacity={.3} /></linearGradient>
                </defs>
                <PolarGrid stroke="rgba(120,100,60,.22)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10.5, fill: '#5f5850' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="团队均值" dataKey="team" stroke="#2dc48d" strokeWidth={1.5} fill="url(#rvTeam)" />
                <Radar name="本次" dataKey="score" stroke="#9b5de5" strokeWidth={2} fill="url(#rvMe)" dot={{ r: 3, fill: '#ff5da2', strokeWidth: 0 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />流程票逐项得分</div><span className="card-s">{r.ticketScore}/{r.ticketMax}</span></div>
          <div className="spa-item-bars">
            {r.items.map((it) => { const p = it.max ? it.score / it.max : 0; return (
              <div className="spa-item-bar" key={it.id}>
                <span className="nm" title={`${it.stage} · ${it.name}`}>{it.redline && <span style={{ color: 'var(--red-3)', fontWeight: 800 }}>红 </span>}{it.name}<small>{it.skipped ? ' · 跳过' : !it.covered ? ' · 未覆盖' : ` · ${it.beats.filter(Boolean).length}/5 拍`}</small></span>
                <div className={`bar ${p >= 0.8 ? 'hi' : p >= 0.5 ? 'mid' : 'lo'}`}><i style={{ width: `${p * 100}%` }} /></div>
                <span className="v">{it.score}/{it.max}</span>
              </div>
            ); })}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />扣分项</div><span className="card-s">{r.deductions.length} 条</span></div>
          <div className="spa-ded" style={{ maxHeight: 190 }}>
            {r.deductions.length ? r.deductions.map((d, i) => <div key={i}><span>第 {d.turn} 轮 · {d.label}</span><b>-{d.points}</b></div>) : <div className="empty">本场无扣分</div>}
          </div>
          <div className="spa-cap" style={{ marginTop: 12 }}>标签</div>
          <div className="spa-tags">
            <div className="grp"><span className="cap">优势</span>{r.strengths.map((s) => <span key={s} className="chip green"><i />{s}</span>)}</div>
            <div className="grp"><span className="cap">待提升</span>{r.improves.map((s) => <span key={s} className="chip orange"><i />{s}</span>)}</div>
            <div className="grp"><span className="cap">合规</span>{r.compliance.map((c) => <span key={c.label} className={`chip ${c.tone}`}><i />{c.label}</span>)}</div>
          </div>
        </div>
      </div>

      <div className="spa-grid spa-c32" style={{ marginTop: 14 }}>
        <div className="card">
          <div className="card-h"><div className="card-t"><span className="dot" />逐句点评</div><span className="card-s">{r.reviews.length} 句 · 原话 / 点评 / 改进话术</span></div>
          {r.reviews.map((v, i) => (
            <div className={`spa-review ${v.flag}`} key={i}>
              <div className="q"><span className="idx">第 {i + 1} 句</span>"{v.original}"{v.item && <span className="chip" style={{ padding: '0 6px', fontSize: 10, fontStyle: 'normal' }}>{v.item}</span>}</div>
              <div className="c"><b>点评：</b>{v.comment}</div>
              {v.better && <div className="b"><b>改进话术：</b><span>{v.better}</span></div>}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card green">
            <div className="card-h"><div className="card-t"><span className="dot" />复盘摘要</div></div>
            <div className="spa-sum">{r.summary}</div>
            <div className="card-s" style={{ marginTop: 8 }}>五拍闭环：{BEATS.join(' → ')}</div>
          </div>
          <div className="card gold">
            <div className="card-h"><div className="card-t"><span className="dot" />回写与提交</div><span className="chip green"><i />已回写学习平台</span></div>
            <div className="spa-kv"><span>工号</span><b>{r.writeback.empNo}</b></div>
            <div className="spa-kv"><span>练习方式</span><b>{r.writeback.method}</b></div>
            <div className="spa-kv"><span>得分 / 任务完成</span><b>{r.writeback.score} / {r.writeback.taskDone ? '是' : '否'}</b></div>
            <div className="spa-kv"><span>回写时间</span><b>{r.writeback.at}</b></div>
            <div className={`spa-check${confirm ? ' on' : ''}`} style={{ marginTop: 10 }} onClick={() => setConfirm(!confirm)}><span className="bx">{confirm && <Icons.Check size={12} />}</span>提交带教师傅前由本人确认：我已阅读逐句点评与改进话术</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn" disabled={!confirm || submitted} onClick={() => setSubmitted(true)}><Icons.Send size={13} />{submitted ? '已提交带教师傅' : '提交带教师傅'}</button>
              <button className="btn ghost" onClick={onGrowth}><Icons.BookUser size={13} />查看成长档案</button>
              <button className="btn ghost" onClick={onCoaches}><Icons.Users size={13} />换个教练</button>
            </div>
            {submitted && <div className="card-s" style={{ marginTop: 8 }}>已提交至带教师傅 周慧敏 · 仅包含总分、维度、标签与复盘摘要，逐句对话不外发。</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
