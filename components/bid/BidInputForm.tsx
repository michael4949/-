import React, { useRef, useState } from "react";
import { Building2, Check, FileText, KeyRound, Loader2, Settings2, Sparkles, Upload } from "lucide-react";
import { BidOptions, CompanyProfile, LayoutId } from "../../bidTypes";
import { getStoredKey, setStoredKey, envKey } from "../../services/bid/llm";
import { LAYOUTS } from "../../services/bid/budget";
import { extractFileText } from "../../services/bid/docxText";

interface Props {
  onSubmit: (tenderText: string, company: CompanyProfile, options: BidOptions) => void;
  disabled?: boolean;
}

const LS_COMPANY = "bid_company_profile";

export const EMPTY_COMPANY: CompanyProfile = {
  name: "", creditCode: "", regCapital: "", founded: "", address: "", legalPerson: "",
  contact: "", qualifications: "", achievements: "", keyStaff: "", honors: "", financial: "", extra: "",
};

function loadCompany(): CompanyProfile {
  try { return { ...EMPTY_COMPANY, ...JSON.parse(localStorage.getItem(LS_COMPANY) || "{}") }; }
  catch { return { ...EMPTY_COMPANY }; }
}

const SAMPLE_TENDER = `XX市智慧水务管理平台建设项目 招标文件（示例节选）
项目编号：ZB-2026-0612。招标人：XX市水务局。招标代理机构：XX工程咨询有限公司。
项目概况：建设覆盖全市的智慧水务管理平台，含数据中台、管网 GIS 系统、漏损监测、二次供水监管、移动巡检 App 及配套物联感知设备采购与安装，预算金额 1860 万元，建设期 12 个月，质保期 3 年，项目地点：XX市。
实质性要求：★投标人须具有电子与智能化工程专业承包贰级及以上资质；★项目负责人须具有高级工程师职称；★工期不得超过 12 个月；★质保期不得低于 3 年；★投标有效期 90 天；★须按招标文件格式提交投标保证金 20 万元。
评分办法（综合评估法，满分 100 分）：技术方案 45 分（总体架构 10 分、实施方案 10 分、数据治理与安全 8 分、质量保证 5 分、进度计划 5 分、应急预案 3 分、售后服务 4 分）；商务 25 分（类似业绩 10 分、人员配置 8 分、企业资信 7 分）；价格 30 分。
投标文件组成及格式要求：投标文件包括投标函及附录、法定代表人身份证明及授权委托书、商务文件、技术文件、价格文件；正本一份副本四份，A4 纸装订成册，逐页加盖公章。`;

const inputCls =
  "w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-sky-400/60";

const BidInputForm: React.FC<Props> = ({ onSubmit, disabled }) => {
  const [apiKey, setApiKey] = useState(getStoredKey());
  const needKey = !envKey();
  const [tenderText, setTenderText] = useState("");
  const [fileNote, setFileNote] = useState("");
  const [company, setCompany] = useState<CompanyProfile>(loadCompany);
  const [showCompany, setShowCompany] = useState(true);
  const [showAdv, setShowAdv] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [opt, setOpt] = useState<BidOptions>({
    targetPages: 600, layout: "gbGov", smartModel: false, concurrency: 3, includeDeviationTables: true,
  });

  const setC = <K extends keyof CompanyProfile>(k: K, v: string) =>
    setCompany((c) => {
      const next = { ...c, [k]: v };
      try { localStorage.setItem(LS_COMPANY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  const setO = <K extends keyof BidOptions>(k: K, v: BidOptions[K]) => setOpt((o) => ({ ...o, [k]: v }));

  const onFile = async (f: File | null) => {
    if (!f) return;
    setFileNote(`正在读取 ${f.name} …`);
    try {
      const text = await extractFileText(f);
      setTenderText(text);
      setFileNote(`已读取《${f.name}》，共 ${text.length.toLocaleString()} 字`);
    } catch (e) {
      setFileNote(e instanceof Error ? e.message : "文件读取失败");
    }
  };

  const ready = tenderText.trim().length >= 100 && !!company.name.trim() && (!needKey || !!apiKey.trim());
  const estCalls = Math.round((opt.targetPages * LAYOUTS[opt.layout].charsPerPageEffective) / 2200) + 25;

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs mb-4 border border-white/10">
          <FileText className="w-3.5 h-3.5" /> 招标文件 → 500-1000 页国标板式投标文件
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
          标书<span className="text-sky-400">智能工厂</span>
        </h1>
        <p className="text-white/60 text-base">
          上传/粘贴招标文件，Claude Fable 5（Anthropic 最强模型）按工作流解析评分办法与实质性条款、
          编大纲、分章并发撰写、合规审查，一键导出按国标板式排好的 Word 投标文件。全程在你的浏览器本地完成。
        </p>
      </div>

      {needKey && (
        <div className="mb-4 bg-white/5 border border-white/15 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-sky-400" />
            <span className="text-white/80 text-sm font-medium">先填入你的 Anthropic API Key（驱动 Claude Fable 5）</span>
            {apiKey && <span className="ml-auto flex items-center gap-1 text-emerald-400 text-xs"><Check className="w-3.5 h-3.5" /> 已保存到本机</span>}
          </div>
          <input
            type="password" value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setStoredKey(e.target.value); }}
            placeholder="粘贴你的 Anthropic API Key（sk-ant-…，仅保存在你浏览器本地，不会上传）"
            className={`${inputCls} font-mono`}
          />
          <div className="text-white/40 text-xs mt-2">
            获取：<a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-sky-300 underline">console.anthropic.com</a>（需有余额）。
            本工具调用 <b>Claude Fable 5</b>（Anthropic 最强模型）；整本标书需数百次调用，600 页均衡档约合数十美元，请知悉计费。
          </div>
        </div>
      )}

      {/* ① 招标文件 */}
      <div className="bg-white/5 border border-white/15 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/80 text-sm font-medium">① 招标文件</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setTenderText(SAMPLE_TENDER); setFileNote("已填入示例招标文件（试跑建议把目标页数调到 300）"); }}
              className="text-xs text-white/40 underline decoration-dotted hover:text-white/70">填入示例</button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled}
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg px-3 py-1.5 text-white/80 transition">
              <Upload className="w-3.5 h-3.5" /> 上传 .docx / .txt
            </button>
            <input ref={fileRef} type="file" accept=".docx,.txt,.md" className="hidden"
              onChange={(e) => { void onFile(e.target.files?.[0] || null); e.target.value = ""; }} />
          </div>
        </div>
        <textarea
          value={tenderText} onChange={(e) => setTenderText(e.target.value)} disabled={disabled}
          placeholder="粘贴招标文件全文（含评分办法、实质性条款、格式要求，越全越好）；或点右上角上传 .docx / .txt。PDF 请先另存为 .docx。"
          className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-sky-400/60 resize-y min-h-[140px]"
        />
        <div className="text-white/40 text-xs mt-1.5">
          {fileNote || (tenderText ? `当前 ${tenderText.length.toLocaleString()} 字` : "支持整本招标文件（数十万字会自动分段解析）")}
        </div>
      </div>

      {/* ② 投标人资料 */}
      <div className="bg-white/5 border border-white/15 rounded-2xl p-4 mb-4">
        <button type="button" onClick={() => setShowCompany((s) => !s)} className="flex items-center gap-2 w-full text-left">
          <Building2 className="w-4 h-4 text-sky-400" />
          <span className="text-white/80 text-sm font-medium">② 投标人资料（事实表——全文表述与此保持一致，缺的不会编造）</span>
          <span className="ml-auto text-white/40 text-xs">{showCompany ? "收起" : "展开"}</span>
        </button>
        {showCompany && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={inputCls} placeholder="公司全称（必填）" value={company.name} onChange={(e) => setC("name", e.target.value)} />
              <input className={inputCls} placeholder="统一社会信用代码" value={company.creditCode} onChange={(e) => setC("creditCode", e.target.value)} />
              <input className={inputCls} placeholder="注册资本（如 5000 万元）" value={company.regCapital} onChange={(e) => setC("regCapital", e.target.value)} />
              <input className={inputCls} placeholder="成立时间（如 2008 年）" value={company.founded} onChange={(e) => setC("founded", e.target.value)} />
              <input className={inputCls} placeholder="注册地址" value={company.address} onChange={(e) => setC("address", e.target.value)} />
              <input className={inputCls} placeholder="法定代表人" value={company.legalPerson} onChange={(e) => setC("legalPerson", e.target.value)} />
            </div>
            <textarea className={`${inputCls} min-h-[60px]`} placeholder="资质证书（每行一条，如：电子与智能化工程专业承包贰级；ISO9001 质量管理体系认证）" value={company.qualifications} onChange={(e) => setC("qualifications", e.target.value)} />
            <textarea className={`${inputCls} min-h-[60px]`} placeholder="类似项目业绩（每行一条：项目名称、金额、年份、发包方）" value={company.achievements} onChange={(e) => setC("achievements", e.target.value)} />
            <textarea className={`${inputCls} min-h-[60px]`} placeholder="拟投入主要人员（每行一条：姓名可不填，写岗位、职称、证书、年限）" value={company.keyStaff} onChange={(e) => setC("keyStaff", e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <textarea className={`${inputCls} min-h-[48px]`} placeholder="获奖 / 信用情况（可空）" value={company.honors} onChange={(e) => setC("honors", e.target.value)} />
              <textarea className={`${inputCls} min-h-[48px]`} placeholder="财务概况（可空，如近三年营收）" value={company.financial} onChange={(e) => setC("financial", e.target.value)} />
            </div>
            <textarea className={`${inputCls} min-h-[48px]`} placeholder="其他想让 AI 知道的优势 / 补充说明（可空）" value={company.extra} onChange={(e) => setC("extra", e.target.value)} />
          </div>
        )}
      </div>

      {/* ③ 目标与板式 */}
      <div className="bg-white/5 border border-white/15 rounded-2xl p-4 mb-4 space-y-3">
        <span className="text-white/80 text-sm font-medium">③ 目标页数与板式</span>
        <div className="bg-black/20 rounded-xl px-4 py-3">
          <label className="text-white/50 text-xs">目标页数 · <b className="text-sky-300 text-sm">{opt.targetPages} 页</b>（预计约 {estCalls} 次模型调用）</label>
          <input type="range" min={300} max={1200} step={50} value={opt.targetPages} disabled={disabled}
            onChange={(e) => setO("targetPages", Number(e.target.value))} className="w-full mt-2 accent-sky-400" />
          <div className="flex justify-between text-white/30 text-[10px] mt-1"><span>300</span><span>常规标书 500-1000</span><span>1200</span></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(LAYOUTS) as LayoutId[]).map((id) => (
            <button key={id} type="button" disabled={disabled} onClick={() => setO("layout", id)}
              className={`text-left rounded-xl border px-4 py-3 transition ${opt.layout === id ? "border-sky-400 bg-sky-400/10" : "border-white/15 bg-white/5 hover:border-white/30"}`}>
              <div className="text-white text-sm font-medium">{LAYOUTS[id].label}</div>
              <div className="text-white/45 text-xs mt-1">{LAYOUTS[id].desc}</div>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowAdv((s) => !s)} className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition">
          <Settings2 className="w-4 h-4" /> {showAdv ? "收起" : "高级设置"}（模型 / 并发 / 偏差表）
        </button>
        {showAdv && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-black/20 rounded-xl p-3">
            <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
              <input type="checkbox" checked={opt.smartModel} onChange={(e) => setO("smartModel", e.target.checked)} className="accent-sky-400 w-4 h-4" />
              极致档：写作也用最高思考力度（更强、更贵更慢）
            </label>
            <label className="flex items-center gap-2 text-white/70 text-sm">
              并发
              <select value={opt.concurrency} onChange={(e) => setO("concurrency", Number(e.target.value))}
                className="bg-transparent border border-white/15 rounded-lg px-2 py-1 text-white text-sm [&>option]:text-black">
                {[2, 3, 4].map((n) => <option key={n} value={n}>{n} 路</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
              <input type="checkbox" checked={opt.includeDeviationTables} onChange={(e) => setO("includeDeviationTables", e.target.checked)} className="accent-sky-400 w-4 h-4" />
              编制商务/技术偏差表
            </label>
          </div>
        )}
      </div>

      <button
        type="button" disabled={disabled || !ready}
        onClick={() => onSubmit(tenderText.trim(), company, opt)}
        className={`w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 transition ${disabled || !ready ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-gradient-to-r from-sky-400 to-blue-500 text-black hover:shadow-xl hover:shadow-sky-500/20 hover:-translate-y-0.5"}`}
      >
        {disabled ? <><Loader2 className="w-5 h-5 animate-spin" /> 处理中…</> : <><Sparkles className="w-5 h-5" /> 解析招标文件并编制大纲</>}
      </button>
      <div className="mt-3 text-center text-white/35 text-xs">
        下一步会先给你<b>审阅/修改大纲</b>，确认后才开始整本撰写 · 撰写中可随时暂停，刷新页面也能断点续跑
      </div>
    </div>
  );
};

export default BidInputForm;
