import React, { useState } from "react";
import {
  Sparkles, TrendingUp, Check, ArrowUpRight, FileText, Beaker,
  Banknote, Percent, Gift, BrainCircuit, ChevronRight,
} from "lucide-react";
import { savings as SAVINGS, entityById, fmtCNY, fmtCNYWan } from "../../data/mockData";
import { SavingItem } from "../../types";
import { Card, SectionTitle, IconBox, Badge, ProgressBar, cx } from "./ui";

const CAT_ICON: Record<string, React.ElementType> = {
  加计扣除: Beaker, 留抵退税: Banknote, 税率优惠: Percent, 财政奖补: Gift, 税收筹划: BrainCircuit,
};

const OptimizationCenter: React.FC<{ scope: string }> = ({ scope }) => {
  const [items, setItems] = useState<SavingItem[]>(SAVINGS);
  const list = items.filter((s) => scope === "all" || s.entityId === scope).sort((a, b) => b.estSaving - a.estSaving);
  const total = list.reduce((s, v) => s + v.estSaving, 0);
  const adopted = list.filter((s) => s.status === "已采纳").reduce((s, v) => s + v.estSaving, 0);
  const applicable = list.filter((s) => s.status === "可申请");

  const adopt = (id: string) => setItems((s) => s.map((v) => (v.id === id ? { ...v, status: "已采纳" } : v)));

  return (
    <div className="space-y-5">
      {/* 概览横幅 */}
      <div className="rounded-xl2 bg-gradient-to-br from-success/12 via-teal2-soft to-brand-50 border border-success/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-success text-white rounded-full px-2.5 py-1 mb-3"><Sparkles className="w-3.5 h-3.5" /> 智能体已扫描全集团 · 匹配最新政策</div>
            <h2 className="text-2xl font-extrabold text-ink">本期共发现 <span className="text-success">{fmtCNYWan(total)}</span> 可优化空间</h2>
            <p className="text-sm text-ink-soft mt-1">覆盖研发加计扣除、增值税留抵退税、高新与小微优惠、自贸港奖补等 {list.length} 项，已量化收益与把握度。</p>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:w-[380px]">
            {[["可优化合计", fmtCNYWan(total)], ["可立即申请", fmtCNYWan(applicable.reduce((s, v) => s + v.estSaving, 0))], ["已采纳", fmtCNYWan(adopted)]].map(([k, v]) => (
              <div key={k} className="bg-white rounded-xl border border-line p-3">
                <div className="text-[11px] text-ink-muted">{k}</div>
                <div className="text-lg font-extrabold text-ink tnum mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 机会卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {list.map((s) => {
          const e = entityById(s.entityId);
          const Icon = CAT_ICON[s.category] || Sparkles;
          const done = s.status === "已采纳";
          return (
            <Card key={s.id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <IconBox tone="success" size={44}><Icon className="w-5 h-5" /></IconBox>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="success">{s.category}</Badge>
                    {done && <Badge tone="teal"><Check className="w-3 h-3" />已采纳</Badge>}
                  </div>
                  <h4 className="font-bold text-ink mt-1.5">{s.title}</h4>
                  <div className="text-[11px] text-ink-muted">{e.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-ink-muted">预计收益</div>
                  <div className="text-xl font-extrabold text-success tnum flex items-center gap-0.5"><ArrowUpRight className="w-4 h-4" />{fmtCNYWan(s.estSaving)}</div>
                </div>
              </div>
              <p className="text-sm text-ink-soft mt-3 leading-relaxed flex-1">{s.detail}</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-muted">
                <FileText className="w-3.5 h-3.5" /> 政策依据：{s.policy}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] text-ink-muted mb-1"><span>把握度</span><span className="font-semibold text-ink tnum">{s.confidence}%</span></div>
                  <ProgressBar value={s.confidence} tone="#0FA968" height={5} />
                </div>
                {done ? (
                  <button className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted px-3 py-2">查看测算 <ChevronRight className="w-3.5 h-3.5" /></button>
                ) : (
                  <button onClick={() => adopt(s.id)} className="inline-flex items-center gap-1.5 bg-success hover:opacity-90 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-opacity whitespace-nowrap">
                    <Check className="w-3.5 h-3.5" /> 采纳并申请
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OptimizationCenter;
