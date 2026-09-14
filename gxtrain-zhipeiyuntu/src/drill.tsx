/* 通用分级导航壳：路由栈、面包屑、层级指示、页面过渡、提示与跨模块跳转
   知识资产中枢与 AI 课程工厂共用；其余模块深化时按同一范式接入 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export type AnyRoute = { v: string; [k: string]: unknown }
export type DrillNav<R extends AnyRoute> = {
  stack: R[]; push: (r: R) => void; back: () => void; goIndex: (i: number) => void; replace: (r: R) => void
  toast: (m: string) => void; jump: (node: string, tab: string, route?: AnyRoute) => void
}
const Ctx = createContext<DrillNav<AnyRoute>>(null!)
export function useDrill<R extends AnyRoute>() { return useContext(Ctx) as unknown as DrillNav<R> }

export function jumpTo(node: string, tab: string, route?: AnyRoute) {
  window.dispatchEvent(new CustomEvent('app:go', { detail: { node, tab, route } }))
}

export function DrillShell<R extends AnyRoute>({ tab, init, nonce, roots, labelOf, home, children }:
  { tab: string; init?: R; nonce?: number; roots: Record<string, R>; labelOf: (r: R) => string; home: string; children: (r: R, level: number) => ReactNode }) {
  const rootOf = useCallback((t: string) => roots[t] ?? Object.values(roots)[0], [roots])
  const initial = useCallback((t: string, i?: R) => i ? (i.v === rootOf(t).v ? [i] : [rootOf(t), i]) : [rootOf(t)], [rootOf])
  const [stack, setStack] = useState<R[]>(() => initial(tab, init))
  const [dir, setDir] = useState<'in' | 'back'>('in')
  const [toasts, setToasts] = useState<{ id: number; m: string }[]>([])
  const seq = useRef(0)
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setDir('in'); setStack(initial(tab, init))
  }, [tab, init, nonce, initial])
  const push = useCallback((r: R) => { setDir('in'); setStack(s => [...s, r]) }, [])
  const back = useCallback(() => { setDir('back'); setStack(s => s.length > 1 ? s.slice(0, -1) : s) }, [])
  const goIndex = useCallback((i: number) => { setDir('back'); setStack(s => s.slice(0, i + 1)) }, [])
  const replace = useCallback((r: R) => { setDir('in'); setStack(s => [...s.slice(0, -1), r]) }, [])
  const toast = useCallback((m: string) => { const id = ++seq.current; setToasts(t => [...t, { id, m }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600) }, [])
  const jump = useCallback((node: string, t: string, route?: AnyRoute) => jumpTo(node, t, route), [])
  const nav = useMemo(() => ({ stack, push, back, goIndex, replace, toast, jump }), [stack, push, back, goIndex, replace, toast, jump])
  const cur = stack[stack.length - 1]
  const level = stack.length
  return (
    <Ctx.Provider value={nav as unknown as DrillNav<AnyRoute>}>
      <div className="hub-root">
        <div className="hub-crumb">
          {level > 1 && <button className="btn btn-sm mr-1" onClick={back}>‹ 返回</button>}
          <span className="text-slate-400">{home}</span>
          {stack.map((r, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="sep">›</span>
              <button className={`c ${i === stack.length - 1 ? 'cur' : ''}`} onClick={() => i < stack.length - 1 && goIndex(i)} title={labelOf(r)}>{labelOf(r)}</button>
            </span>
          ))}
          <span className="lvl">
            <span className="text-[10.5px] text-slate-400">{['一级', '二级', '三级', '四级'][Math.min(3, level - 1)]}页面</span>
            {[0, 1, 2].map(i => <i key={i} className={i < level ? (i === level - 1 ? 'on gold' : 'on') : ''} />)}
          </span>
        </div>
        <div className="hub-body">
          <div key={stack.map(labelOf).join('/')} className={`hub-page ${dir === 'back' ? 'back' : ''}`}>{children(cur, level)}</div>
          {toasts.length > 0 && <div className="hub-toast">{toasts.map(t => <div key={t.id}>{t.m}</div>)}</div>}
        </div>
      </div>
    </Ctx.Provider>
  )
}

/* 逐字输出：AI 生成内容的呈现；onDone 走引用，重渲染不会重新开始 */
export function Typewriter({ text, speed = 14, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(0)
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone }, [onDone])
  useEffect(() => { setN(0); let i = 0; const t = setInterval(() => { i += 2; setN(i); if (i >= text.length) { clearInterval(t); doneRef.current?.() } }, speed); return () => clearInterval(t) }, [text, speed])
  return <span>{text.slice(0, n)}{n < text.length && <span className="typing" />}</span>
}
/* 量取容器宽度：图表按真实像素绘制 */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(es => { for (const e of es) setW(Math.round(e.contentRect.width)) })
    ro.observe(el); setW(Math.round(el.getBoundingClientRect().width)); return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}
