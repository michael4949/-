import React from "react";
import {
  ReceiptText, FileUp, FileDown, ScanLine, AlertTriangle, CheckCircle2,
  Percent, ArrowRightLeft, ShieldX, Check,
} from "lucide-react";
import { invoiceStats as S, fmtCNY, fmtCNYWan, fmtPct } from "../../data/mockData";
import { Card, SectionTitle, IconBox, Badge, ProgressBar, cx } from "./ui";

const abnormalList = [
  { code: "044002100311", seller: "上海某某贸易（异常注销）", amount: 232400, tax: 30212 },
  { code: "044002100287", seller: "广州某某科技（走逃失联）", amount: 186000, tax: 24180 },
  { code: "044002100255", seller: "杭州某某材料（非正常户）", amount: 154800, tax: 20124 },
  { code: "044002100231", seller: "深圳某某电子（异常注销）", amount: 138600, tax: 18018 },
];

const InvoiceCenter: React.FC = () => {
  const certRate = (S.inputCertified / S.inputCount) * 100;
  return (
    <div className="space-y-5">
      {/* 顶部统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-ink-muted">销项发票（本期）</span><IconBox tone="brand" size={32}><FileUp className="w-4 h-4" /></IconBox></div>
          <div className="text-2xl font-extrabold text-ink tnum mt-2">{S.outputCount.toLocaleString()} <span className="text-sm text-ink-muted font-medium">份</span></div>
          <div className="text-xs text-ink-muted mt-1.5">价税合计 {fmtCNYWan(S.outputAmount)} · 销项税额 {fmtCNYWan(S.outputTax)}</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-ink-muted">进项发票（本期）</span><IconBox tone="teal" size={32}><FileDown className="w-4 h-4" /></IconBox></div>
          <div className="text-2xl font-extrabold text-ink tnum mt-2">{S.inputCount.toLocaleString()} <span className="text-sm text-ink-muted font-medium">份</span></div>
          <div className="text-xs text-ink-muted mt-1.5">可抵扣进项 {fmtCNYWan(S.inputTax)} · 待认证 {S.inputPending} 份</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-ink-muted">数电发票占比</span><IconBox tone="violet" size={32}><Percent className="w-4 h-4" /></IconBox></div>
          <div className="text-2xl font-extrabold text-ink tnum mt-2">{fmtPct(S.digitalRatio)}</div>
          <div className="mt-2"><ProgressBar value={S.digitalRatio} tone="#6D5EF6" /></div>
        </Card>
        <Card>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-ink-muted">进销项匹配率</span><IconBox tone="success" size={32}><ArrowRightLeft className="w-4 h-4" /></IconBox></div>
          <div className="text-2xl font-extrabold text-ink tnum mt-2">{fmtPct(S.matchRate)}</div>
          <div className="text-xs text-ink-muted mt-1.5">智能体自动匹配业务与凭证</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* 异常发票 */}
        <Card className="xl:col-span-2">
          <SectionTitle title="异常进项发票" sub="金税四期比对 · 建议进项转出" icon={<IconBox tone="danger" size={30}><ShieldX className="w-4 h-4" /></IconBox>}
            right={<Badge tone="danger" dot>{S.inputAbnormal} 份待处理</Badge>} />
          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-ink-muted bg-page">
                <th className="font-medium px-4 py-2.5">发票号码</th><th className="font-medium px-3 py-2.5">销售方</th>
                <th className="font-medium px-3 py-2.5 text-right">金额</th><th className="font-medium px-3 py-2.5 text-right">税额</th><th className="px-3 py-2.5"></th>
              </tr></thead>
              <tbody>
                {abnormalList.map((a) => (
                  <tr key={a.code} className="border-t border-line">
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{a.code}</td>
                    <td className="px-3 py-2.5"><span className="text-ink">{a.seller.split("（")[0]}</span><Badge tone="danger" className="ml-1.5 !px-1.5 !py-0.5 text-[10px]">{a.seller.match(/（(.+)）/)?.[1]}</Badge></td>
                    <td className="px-3 py-2.5 text-right tnum text-ink">{fmtCNY(a.amount)}</td>
                    <td className="px-3 py-2.5 text-right tnum text-danger font-semibold">{fmtCNY(a.tax)}</td>
                    <td className="px-3 py-2.5 text-right"><button className="text-xs font-semibold text-brand hover:text-brand-600">转出</button></td>
                  </tr>
                ))}
                <tr className="border-t border-line bg-danger-soft/40">
                  <td colSpan={3} className="px-4 py-2.5 text-xs text-ink-soft">其余 8 份合计 · 建议一并转出</td>
                  <td className="px-3 py-2.5 text-right tnum text-danger font-bold">{fmtCNY(120000 - abnormalList.reduce((s, a) => s + a.tax, 0))}</td>
                  <td className="px-3 py-2.5 text-right"><button className="text-xs font-semibold text-danger">全部转出</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
            <AlertTriangle className="w-4 h-4 text-warning" /> 智能体已在 集团总部 增值税申报表中预置进项转出 {fmtCNY(120000)}，可一键确认。
          </div>
        </Card>

        {/* 进项认证进度 */}
        <Card>
          <SectionTitle title="进项认证抵扣" sub="本期勾选认证进度" icon={<IconBox tone="teal" size={30}><ScanLine className="w-4 h-4" /></IconBox>} />
          <div className="flex items-center justify-center my-3">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#EEF0F5" strokeWidth="11" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#0FB5BA" strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - certRate / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-ink tnum">{fmtPct(certRate)}</span>
                <span className="text-[10px] text-ink-muted">已认证</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-ink-muted flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" />已认证抵扣</span><span className="font-semibold text-ink tnum">{S.inputCertified.toLocaleString()} 份</span></div>
            <div className="flex items-center justify-between"><span className="text-ink-muted flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-warning/20 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-warning" /></span>待认证</span><span className="font-semibold text-ink tnum">{S.inputPending} 份 · {fmtCNYWan(S.pendingAmount)}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink-muted flex items-center gap-1.5"><ShieldX className="w-4 h-4 text-danger" />异常待转出</span><span className="font-semibold text-danger tnum">{S.inputAbnormal} 份</span></div>
          </div>
          <button className="w-full mt-4 inline-flex items-center justify-center gap-1.5 bg-teal2 hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-xl transition-opacity">
            <Check className="w-4 h-4" /> 一键勾选认证待认证进项
          </button>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceCenter;
