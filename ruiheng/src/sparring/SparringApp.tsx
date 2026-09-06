/**
 * 企金智脑 · AI 智能陪练底座 —— 子应用入口
 * 顶部子导航（工作台 / 教练中心 / 陪练舱 / 评分复盘 / 成长档案 / 团队看板 / 教练编辑器）+ 计时器 + 当前学员切换。
 * 内部以状态管理子导航，不依赖路由子路径。
 */
import { useEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { COACHES, coachById } from './coaches';
import type { Coach } from './coaches';
import { STUDENTS, fmtDur } from './data';
import type { Mode, SessionResult, StudentId } from './data';
import Workbench from './Workbench';
import CoachCenter from './CoachCenter';
import Cabin from './Cabin';
import Review from './Review';
import Growth from './Growth';
import TeamBoard from './TeamBoard';
import CoachEditor from './CoachEditor';
import './sparring-app.css';

export type Tab = 'work' | 'coach' | 'cabin' | 'review' | 'growth' | 'team' | 'editor';
export interface Launch { coachId: string; mode: Mode; retryItems?: string[]; assignmentId?: string; seq: number }
export interface Timer { running: boolean; elapsed: number; start: () => void; stop: () => number; reset: () => void }

const TABS: { id: Tab; name: string; icon: keyof typeof Icons; admin?: boolean }[] = [
  { id: 'work', name: '工作台', icon: 'LayoutDashboard' },
  { id: 'coach', name: '教练中心', icon: 'Users' },
  { id: 'cabin', name: '陪练舱', icon: 'MessagesSquare' },
  { id: 'review', name: '评分复盘', icon: 'ClipboardCheck' },
  { id: 'growth', name: '成长档案', icon: 'BookUser' },
  { id: 'team', name: '团队看板', icon: 'Network', admin: true },
  { id: 'editor', name: '教练编辑器', icon: 'PenTool', admin: true },
];

export default function SparringApp({ coachId }: { coachId?: string }) {
  const [tab, setTab] = useState<Tab>(coachId ? 'cabin' : 'work');
  const [student, setStudent] = useState<StudentId>('lin');
  const [coaches, setCoaches] = useState<Coach[]>(COACHES);
  const [launch, setLaunch] = useState<Launch>({ coachId: coachById(coachId).id, mode: 'teach', seq: 0 });
  const [result, setResult] = useState<SessionResult | null>(null);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [doneAssign, setDoneAssign] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  /* ---- 计时器 ---- */
  const startRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => { if (startRef.current !== null) setElapsed(Math.floor((Date.now() - startRef.current) / 1000)); }, 1000);
    return () => clearInterval(id);
  }, [running]);
  const timer: Timer = {
    running, elapsed,
    start: () => { startRef.current = Date.now(); setElapsed(0); setRunning(true); },
    stop: () => { const e = startRef.current !== null ? Math.floor((Date.now() - startRef.current) / 1000) : elapsed; startRef.current = null; setRunning(false); setElapsed(e); return e; },
    reset: () => { startRef.current = null; setRunning(false); setElapsed(0); },
  };

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2400); return () => clearTimeout(id); }, [toast]);

  const go = (l: Omit<Launch, 'seq'>) => { timer.reset(); setLaunch({ ...l, seq: launch.seq + 1 }); setTab('cabin'); };
  const finish = (r: SessionResult) => {
    setResult(r); setResults((rs) => [r, ...rs]);
    if (launch.assignmentId && r.passed) setDoneAssign((d) => Array.from(new Set([...d, launch.assignmentId!])));
    setTab('review');
    setToast(`本场成绩 ${r.score} 分已即时回写行内学习平台 · 工号 ${r.writeback.empNo}`);
  };
  const saveCoach = (c: Coach) => {
    setCoaches((cs) => (cs.some((x) => x.id === c.id) ? cs.map((x) => (x.id === c.id ? c : x)) : [...cs, c]));
    setToast(`教练「${c.name}」已保存，可在教练中心开始练习`);
  };
  const cur = coaches.find((c) => c.id === launch.coachId) ?? coaches[1];
  const me = STUDENTS[student];

  return (
    <div className="spa">
      <div className="spa-top">
        <div className="spa-brand"><div className="mk">练</div><div><b>AI 智能陪练底座</b><span>企金客户经理 · 数字人教练</span></div></div>
        <div className="spa-tabs">
          {TABS.map((t) => { const I = Icons[t.icon] as React.ComponentType<{ size?: number }>; return (
            <button key={t.id} className={`spa-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
              <I size={14} />{t.name}{t.admin && <span className="adm">管理</span>}
            </button>
          ); })}
        </div>
        <div className="sp" />
        <div className={`spa-timer${running ? ' run' : ''}`} title="本场陪练计时"><span className="d" /><Icons.Timer size={14} />{fmtDur(elapsed)}<small>{running ? '进行中' : '待开始'}</small></div>
        <div className="spa-student" title="当前学员">
          {(Object.keys(STUDENTS) as StudentId[]).map((id) => (
            <button key={id} className={student === id ? 'on' : ''} onClick={() => setStudent(id)}><span className="av">{STUDENTS[id].avatar}</span>{STUDENTS[id].name}</button>
          ))}
        </div>
      </div>

      {tab === 'work' && <Workbench student={me} coaches={coaches} doneAssign={doneAssign} results={results} onGo={go} onTab={setTab} />}
      {tab === 'coach' && <CoachCenter coaches={coaches} student={me} results={results} onStart={(id, mode) => go({ coachId: id, mode })} />}
      {tab === 'cabin' && (
        <Cabin key={`${launch.coachId}-${launch.mode}-${launch.seq}`} coach={cur} coaches={coaches} mode={launch.mode} student={me} retryItems={launch.retryItems} timer={timer}
          onFinish={finish} onRelaunch={(id, mode) => go({ coachId: id, mode })} />
      )}
      {tab === 'review' && (
        <Review result={result} coach={result ? coaches.find((c) => c.id === result.coachId) ?? cur : cur} student={me}
          onRetry={(ids) => go({ coachId: result!.coachId, mode: result!.mode === 'exam' ? 'drill' : result!.mode, retryItems: ids })}
          onAgain={() => go({ coachId: result!.coachId, mode: result!.mode })} onCoaches={() => setTab('coach')} onGrowth={() => setTab('growth')} />
      )}
      {tab === 'growth' && <Growth student={me} coaches={coaches} results={results} />}
      {tab === 'team' && <TeamBoard student={me} coaches={coaches} onToast={setToast} />}
      {tab === 'editor' && <CoachEditor coaches={coaches} onSave={saveCoach} onTry={(id) => go({ coachId: id, mode: 'teach' })} />}

      {toast && <div className="spa-toast fade-in"><Icons.CheckCircle2 size={15} />{toast}</div>}
    </div>
  );
}
