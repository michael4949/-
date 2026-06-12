import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ListTree, PenLine, Play, Trash2 } from "lucide-react";
import { BidOptions, OutlineNode } from "../../bidTypes";
import { LAYOUTS, allocateBudgets, flattenLeaves, headingNo, overheadPages } from "../../services/bid/budget";

interface Props {
  outline: OutlineNode[];
  options: BidOptions;
  onConfirm: (outline: OutlineNode[]) => void;
  onBack: () => void;
}

/** 大纲审阅闸口：整本生成前人工确认章节结构与篇幅分配 */
const OutlineReview: React.FC<Props> = ({ outline: initial, options, onConfirm, onBack }) => {
  const [outline, setOutline] = useState<OutlineNode[]>(initial);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const layout = LAYOUTS[options.layout];

  const stats = useMemo(() => {
    const leaves = flattenLeaves(outline);
    const chars = leaves.reduce((s, l) => s + l.targetChars, 0);
    return { leaves: leaves.length, chars, pages: Math.round(chars / layout.charsPerPageEffective + overheadPages(outline, layout)) };
  }, [outline, layout]);

  const mutate = (fn: (draft: OutlineNode[]) => void) => {
    setOutline((o) => {
      const draft = structuredClone(o);
      fn(draft);
      allocateBudgets(draft, options.targetPages, layout); // 删改后重新分配预算
      return draft;
    });
  };

  const findIn = (nodes: OutlineNode[], id: string): { parent: OutlineNode[] | null; idx: number } => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { parent: nodes, idx: i };
      const r = findIn(nodes[i].children, id);
      if (r.parent) return r;
    }
    return { parent: null, idx: -1 };
  };

  const removeNode = (id: string) => mutate((d) => {
    const { parent, idx } = findIn(d, id);
    if (parent && parent.length > 1) parent.splice(idx, 1);
  });

  const editNode = (id: string, patch: Partial<OutlineNode>) =>
    setOutline((o) => {
      const draft = structuredClone(o);
      const { parent, idx } = findIn(draft, id);
      if (parent) Object.assign(parent[idx], patch);
      return draft;
    });

  const chapterChars = (c: OutlineNode) => flattenLeaves([c]).reduce((s, l) => s + l.targetChars, 0);

  const renderNode = (node: OutlineNode, index1: number): React.ReactNode => {
    const isLeaf = !node.children.length;
    return (
      <div key={node.id} className={node.level === 0 ? "" : "ml-4 border-l border-white/10 pl-3"}>
        <div className="group flex items-start gap-2 py-1">
          {!isLeaf ? (
            <button onClick={() => setOpen((s) => ({ ...s, [node.id]: !s[node.id] }))} className="mt-0.5 text-white/40 hover:text-white">
              {open[node.id] === false ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <div className="flex-1 min-w-0">
            {editing === node.id ? (
              <div className="space-y-1.5">
                <input autoFocus value={node.title} onChange={(e) => editNode(node.id, { title: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                  className="w-full bg-black/40 border border-sky-400/50 rounded-lg px-2 py-1 text-white text-sm focus:outline-none" />
                <textarea value={node.brief} onChange={(e) => editNode(node.id, { brief: e.target.value })}
                  placeholder="写作要点" className="w-full bg-black/40 border border-white/15 rounded-lg px-2 py-1 text-white/70 text-xs focus:outline-none min-h-[48px]" />
                <button onClick={() => setEditing(null)} className="text-xs text-sky-300 underline">完成</button>
              </div>
            ) : (
              <>
                <span className={node.level === 0 ? "text-white font-semibold" : "text-white/85 text-sm"}>
                  {headingNo(node.level, index1)}{node.title}
                </span>
                {isLeaf && <span className="ml-2 text-white/30 text-xs">{node.targetChars.toLocaleString()} 字</span>}
                {node.level === 0 && (
                  <span className="ml-2 text-sky-300/70 text-xs">
                    约 {Math.max(1, Math.round(chapterChars(node) / layout.charsPerPageEffective))} 页
                  </span>
                )}
                {node.brief && <div className="text-white/35 text-xs mt-0.5 line-clamp-2">{node.brief}</div>}
              </>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 shrink-0">
            <button onClick={() => setEditing(editing === node.id ? null : node.id)} title="编辑" className="text-white/40 hover:text-sky-300"><PenLine className="w-3.5 h-3.5" /></button>
            <button onClick={() => removeNode(node.id)} title="删除" className="text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {!isLeaf && open[node.id] !== false && node.children.map((c, i) => renderNode(c, i + 1))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2"><ListTree className="w-6 h-6 text-sky-400" /> 审阅投标文件大纲</h2>
        <p className="text-white/50 text-sm mt-2">确认后开始整本撰写。可修改标题与写作要点、删除多余小节；篇幅预算会自动重新分配。</p>
      </div>

      <div className="flex items-center justify-center gap-6 bg-white/5 border border-white/15 rounded-2xl px-4 py-3 mb-4 text-center">
        <div><div className="text-white font-bold text-lg">{outline.length}</div><div className="text-white/40 text-xs">章</div></div>
        <div><div className="text-white font-bold text-lg">{stats.leaves}</div><div className="text-white/40 text-xs">小节</div></div>
        <div><div className="text-white font-bold text-lg">{stats.chars.toLocaleString()}</div><div className="text-white/40 text-xs">预算字数</div></div>
        <div><div className="text-sky-300 font-bold text-lg">≈{stats.pages}</div><div className="text-white/40 text-xs">预计页数 / 目标 {options.targetPages}</div></div>
      </div>

      <div className="bg-white/5 border border-white/15 rounded-2xl p-4 max-h-[55vh] overflow-y-auto mb-4">
        {outline.map((c, i) => renderNode(c, i + 1))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="px-5 py-3.5 rounded-2xl border border-white/15 text-white/70 hover:bg-white/5 transition text-sm">返回修改输入</button>
        <button onClick={() => onConfirm(outline)}
          className="flex-1 rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-sky-400 to-blue-500 text-black hover:shadow-xl hover:shadow-sky-500/20 transition">
          <Play className="w-5 h-5" /> 确认大纲，开始整本撰写（约 {stats.leaves} 节）
        </button>
      </div>
    </div>
  );
};

export default OutlineReview;
