import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productById } from '../data/products';
import catalogJson from '../data/capabilities.json';
import type { Catalog, ProductFunction } from '../data/types';
import { Icon } from '../components/Shell';
import './pages.css';

const CATALOG = catalogJson as unknown as Catalog;

/** 产品 → 示范场景路由；未列出的产品只有功能页样例 */
const SCENE_ROUTE: Record<string, string> = {
  P01: '/scene/visit', P02: '/scene/postloan', P03: '/scene/fin', P06: '/scene/credit',
  P07: '/scene/postloan', P08: '/scene/group', P09: '/scene/sparring', P14: '/scene/profile',
};

const stripHours = (s: string) => String(s ?? '').split('（')[0];

/** 把 demoSample 按句拆开，均匀分配到 n 个结果面板；句子不足时引用同一句 */
function splitSample(sample: string, n: number, fallback: string): string[] {
  const parts = (sample || fallback || '').split(/(?<=[。；;！!？?])|\n+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return Array.from({ length: n }, () => '（示例文本生成中）');
  if (parts.length >= n) {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = Math.floor((i * parts.length) / n), b = Math.floor(((i + 1) * parts.length) / n);
      out.push(parts.slice(a, b).join(''));
    }
    return out;
  }
  return Array.from({ length: n }, (_, i) => (i < parts.length ? parts[i] : `引用：「${parts[i % parts.length]}」`));
}

function thinkSteps(fn: ProductFunction) {
  return [
    { t: '解析输入', d: fn.input },
    { t: '读取数据源（只读旁路 · 脱敏视图）', d: fn.dataSources?.length ? fn.dataSources.join('、') : '本机样本数据' },
    { t: '处理与推理（本机模型）', d: fn.process },
    { t: '合规边界校验', d: fn.compliance },
    { t: '组装结果面板', d: fn.panels.join(' / ') },
  ];
}

type Phase = 'idle' | 'think' | 'done';

export default function ProductPage() {
  const { id = '' } = useParams();
  const product = productById(id);
  const fns = useMemo(() => CATALOG.functions.filter((f) => f.product === id), [id]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const [runId, setRunId] = useState(0);

  const open = fns.find((f) => f.id === openId) ?? null;

  // 切换产品或功能时复位运行态
  useEffect(() => { setOpenId(null); }, [id]);
  useEffect(() => { setPhase('idle'); setStep(0); setShown(0); }, [openId]);

  // 思考流 → 结果面板 的定时动画
  useEffect(() => {
    if (!runId || !open) return;
    const timers: number[] = [];
    const steps = thinkSteps(open);
    setPhase('think'); setStep(0); setShown(0);
    steps.forEach((_, i) => timers.push(window.setTimeout(() => setStep(i + 1), 520 * (i + 1))));
    const base = 520 * (steps.length + 1);
    timers.push(window.setTimeout(() => setPhase('done'), base));
    open.panels.forEach((_, i) => timers.push(window.setTimeout(() => setShown(i + 1), base + 450 * (i + 1))));
    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const stats = useMemo(() => {
    const courses = new Set<string>(); const points = new Set<string>();
    for (const f of fns) for (const s of f.sources ?? []) {
      courses.add(`${s.level}|${s.course}`);
      for (const p of s.points ?? []) points.add(`${s.level}|${s.course}|${p}`);
    }
    return { fns: fns.length, courses: courses.size, points: points.size };
  }, [fns]);

  if (!product) {
    return (
      <div className="card"><div className="card-t"><span className="dot" />未找到产品</div><p className="card-s">产品编号 {id} 不存在，请从左侧导航选择。</p></div>
    );
  }
  const scene = SCENE_ROUTE[product.id];
  const steps = open ? thinkSteps(open) : [];
  const samples = open ? splitSample(open.demoSample, open.panels.length, open.output) : [];
  const close = () => setOpenId(null);

  return (
    <div>
      <div className="hero">
        <div className="hero-grid">
          <div>
            <div className="row"><span className="chip iris">{product.id}</span><span className="en">{product.en}</span></div>
            <h1 style={{ marginTop: 6 }}><span className="serif iris-text">{product.name}</span></h1>
            <div className="tag">{product.tagline}</div>
            <div className="row" style={{ marginTop: 14 }}>
              {scene ? (
                <Link to={scene} className="btn"><Icon name="Play" size={14} /> 进入示范场景</Link>
              ) : (
                <span className="chip gold"><i />样例产品 · 在功能卡中运行示例</span>
              )}
              <Link to="/map" className="btn ghost"><Icon name="Grid3x3" size={14} /> 查看能力地图映射</Link>
              <span className="ai-tag">AI 输出 · 辅助建议 · 需人工复核</span>
            </div>
          </div>
          <div className="tiles">
            <div className="tile"><b className="num red-text">{stats.fns}</b><span>功能数</span></div>
            <div className="tile"><b className="num gold-text">{stats.courses}</b><span>来源课程数</span></div>
            <div className="tile"><b className="num green-text">{stats.points}</b><span>能力点数</span></div>
          </div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">
          <h2><Icon name={product.icon} size={16} /> 功能列表</h2>
          <p>点击功能卡查看 输入 → 处理 → 结果面板 → 输出，并运行示例</p>
        </div>
        {fns.length === 0 ? (
          <div className="card gold empty">
            <span className="ai-tag"><span className="pulse" /> 功能目录生成中</span>
            <div className="big">该产品的功能目录正在由脚本生成</div>
            <p className="muted">执行 <code>npm run data -- &lt;catalog-dir&gt;</code> 合并功能目录后，此处将展示：功能名称、摘要、来源课程与能力点、输入 / 处理 / 结果面板 / 输出、数据源、合规边界与可运行的示例。</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
              {['输入', '处理', '结果面板', '输出', '数据源', '合规边界'].map((s, i) => (
                <span key={s} className="chip iris">{i + 1}. {s}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="fn-grid">
            {fns.map((f, i) => {
              const src = Array.from(new Set((f.sources ?? []).map((s) => `${s.level} · ${stripHours(s.module)}`)));
              return (
                <div key={f.id} className={`card fn-card ${product.tone}${open?.id === f.id ? ' on' : ''}`} onClick={() => setOpenId(f.id)}>
                  <div className="idx">{f.id || `F${String(i + 1).padStart(2, '0')}`}</div>
                  <h3>{f.name}</h3>
                  <p>{f.summary}</p>
                  <div className="src">
                    {src.slice(0, 3).map((s) => <span key={s} className="chip"><i />{s}</span>)}
                    {src.length > 3 && <span className="chip purple">+{src.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && (
        <>
          <div className="overlay" onClick={close} />
          <aside className="drawer">
            <button className="btn ghost sm close" onClick={close}><Icon name="X" size={13} /> 关闭</button>
            <div className="row"><span className="chip iris">{open.id}</span><span className="chip"><i />{product.name}</span></div>
            <h2>{open.name}</h2>
            <p className="muted" style={{ marginTop: 4 }}>{open.summary}</p>

            <div className="blk"><b>输 入</b><p>{open.input}</p></div>
            <div className="blk gold"><b>处 理</b><p>{open.process}</p></div>
            <div className="blk">
              <b>结 果 面 板</b>
              <div className="row">{open.panels.map((p) => <span key={p} className="chip green"><i />{p}</span>)}</div>
            </div>
            <div className="blk green"><b>输 出</b><p>{open.output}</p></div>
            <div className="blk blue">
              <b>数 据 源</b>
              <div className="row">{(open.dataSources ?? []).map((d) => <span key={d} className="chip blue"><i />{d}</span>)}</div>
            </div>
            <div className="blk red"><b>合 规 边 界</b><p>{open.compliance}</p></div>
            <div className="blk purple">
              <b>来 源 能 力 点</b>
              {(open.sources ?? []).map((s, i) => (
                <div key={i} className="src-line">
                  <span className="chip purple" style={{ marginRight: 6 }}>{s.level}</span>{stripHours(s.module)} › <strong>{s.course}</strong>
                  <div className="pts">{(s.points ?? []).map((p) => <span key={p}>{p}</span>)}</div>
                </div>
              ))}
            </div>

            <div className="sec-h" style={{ marginTop: 18 }}>
              <h2><Icon name="Sparkles" size={15} /> 运行示例</h2>
              <button className="btn" onClick={() => setRunId((n) => n + 1)}>
                <Icon name={phase === 'idle' ? 'Play' : 'RotateCcw'} size={14} /> {phase === 'idle' ? '运行示例' : '重新运行'}
              </button>
            </div>
            {phase !== 'idle' && (
              <div className="think">
                {steps.slice(0, step).map((s, i) => (
                  <div className="step fade-in" key={i}><span className="n">{i + 1}</span><div><b>{s.t}</b><p>{s.d}</p></div></div>
                ))}
                {phase === 'think' && <div className="ai-tag"><span className="pulse" /> 本机模型推理中 · 无外联</div>}
              </div>
            )}
            {phase === 'done' && (
              <div style={{ marginTop: 10 }}>
                {open.panels.slice(0, shown).map((p, i) => (
                  <div className="panel-out fade-in" key={p}>
                    <div className="ph"><span><Icon name="PanelTop" size={13} /> {p}</span><span className="ai-tag">AI 生成 · 需复核</span></div>
                    <p>{samples[i]}</p>
                  </div>
                ))}
                {shown >= open.panels.length && (
                  <div className="note green fade-in" style={{ marginTop: 10 }}>示例基于虚构样本生成；正式环境中输出将进入双人复核后流转，并带"AI 生成"标识。</div>
                )}
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
