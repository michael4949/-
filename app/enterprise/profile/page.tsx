import { getDemoEnterprise } from "@/lib/data/personas";
import { INDUSTRIES, DISTRICTS, ENTERPRISE_SCALES } from "@/lib/constants";
import { formatNumber, formatToken, formatCurrency, formatDate } from "@/lib/utils";
import { Tag } from "@/components/ui/Tag";
import { BadgeCheck, ShieldCheck, Star, Phone, User, MapPin, Calendar, Upload, Edit3 } from "lucide-react";

export default function ProfilePage() {
  const me = getDemoEnterprise();
  const ind = INDUSTRIES.find((i) => i.code === me.industryCode);
  const dis = DISTRICTS.find((d) => d.code === me.districtCode);
  const scale = ENTERPRISE_SCALES.find((s) => s.code === me.scale);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">企业信息</h1>
          <p className="text-sm text-slate-500 mt-1">资质 · 联系人 · 评级 · 信用画像</p>
        </div>
        <button className="btn-primary"><Edit3 className="w-4 h-4" />修改信息</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">基本信息</h2></div>
          <div className="gov-card-body grid grid-cols-2 gap-4">
            <InfoRow label="企业名称">{me.name}</InfoRow>
            <InfoRow label="统一社会信用代码"><span className="font-mono text-xs">{me.uscc}</span></InfoRow>
            <InfoRow label="所属行业">
              <span style={{ color: ind?.color }}>● </span>
              {ind?.name}
            </InfoRow>
            <InfoRow label="企业规模">{scale?.name}企业 · {me.employees} 人</InfoRow>
            <InfoRow label="所在区县"><MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{dis?.name}</InfoRow>
            <InfoRow label="注册时间"><Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{formatDate(me.registeredAt)}</InfoRow>
            <InfoRow label="联系人"><User className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{me.contact}</InfoRow>
            <InfoRow label="联系电话"><Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{me.phone}</InfoRow>
          </div>
        </div>

        <div className="gov-card">
          <div className="gov-card-header"><h2 className="font-semibold text-slate-900">企业评级</h2></div>
          <div className="gov-card-body text-center py-6">
            <div className="text-5xl font-semibold text-slate-900 digital mb-2">{me.rating.toFixed(1)}</div>
            <div className="flex items-center justify-center gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-5 h-5 ${i < Math.floor(me.rating) ? "text-amber-500 fill-amber-500" : "text-slate-200 fill-slate-200"}`} />
              ))}
            </div>
            <div className="text-xs text-slate-500">综合评分基于诚信履约、用券效率、政策匹配度计算</div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Score label="诚信" value="95" />
              <Score label="活跃" value="88" />
              <Score label="增长" value="92" />
            </div>
          </div>
        </div>
      </div>

      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">资质证书</h2></div>
        <div className="gov-card-body grid grid-cols-1 md:grid-cols-3 gap-3">
          {me.certified && (
            <CertCard color="emerald" icon={<BadgeCheck className="w-5 h-5" />} title="企业实名认证" date={me.certifiedAt!}>已通过滨海市数据局认证，享受 1.0x 基础额度</CertCard>
          )}
          {me.isHighTech && (
            <CertCard color="purple" icon={<ShieldCheck className="w-5 h-5" />} title="高新技术企业" date="2024-08-15">享受 1.2x 加分额度 · 已绑定本企业账户</CertCard>
          )}
          {me.isSpecialized && (
            <CertCard color="amber" icon={<Star className="w-5 h-5" />} title="专精特新企业" date="2025-03-12">享受 1.5x 加分额度 · 优先审批通道</CertCard>
          )}
          <div className="border-2 border-dashed border-slate-300 rounded p-4 text-center text-sm text-slate-500 cursor-pointer hover:border-blue-400 hover:text-blue-600">
            <Upload className="w-5 h-5 mx-auto mb-1" />
            上传更多资质
          </div>
        </div>
      </div>

      {/* 信用画像（雷达图样式 - 简化） */}
      <div className="gov-card">
        <div className="gov-card-header"><h2 className="font-semibold text-slate-900">信用画像（最新更新于 {formatDate(new Date())}）</h2></div>
        <div className="gov-card-body grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="累计申请" value={formatNumber(8)} unit="次" />
          <Metric label="通过率" value="87%" />
          <Metric label="累计获得补贴" value={formatCurrency(me.totalGranted)} />
          <Metric label="使用率" value={`${((me.totalConsumed / me.totalGranted) * 100).toFixed(0)}%`} />
          <Metric label="本年 Token" value={formatToken(me.yearlyTokens)} />
          <Metric label="本年 支出" value={formatCurrency(me.yearlyCost)} />
          <Metric label="模型偏好" value="混合调度" />
          <Metric label="风险等级" value="低风险" tag="green" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900 digital mt-1">{value}</div>
    </div>
  );
}

function CertCard({ color, icon, title, date, children }: { color: string; icon: React.ReactNode; title: string; date: string; children: React.ReactNode }) {
  return (
    <div className="border rounded p-4" style={{ borderColor: color === "emerald" ? "#a7f3d0" : color === "purple" ? "#ddd6fe" : "#fde68a", background: color === "emerald" ? "#f0fdf4" : color === "purple" ? "#faf5ff" : "#fffbeb" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-9 h-9 rounded flex items-center justify-center text-${color}-700 bg-${color}-100`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 text-sm">{title}</div>
          <div className="text-[10px] text-slate-500">认证于 {formatDate(date)}</div>
        </div>
      </div>
      <div className="text-xs text-slate-600 leading-relaxed">{children}</div>
    </div>
  );
}

function Metric({ label, value, unit, tag }: { label: string; value: string; unit?: string; tag?: "green" | "amber" | "red" }) {
  return (
    <div className="p-3 rounded bg-slate-50">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-900 digital mt-1">
        {value}
        {unit && <span className="text-xs text-slate-500 ml-1">{unit}</span>}
        {tag && <Tag color={tag} className="ml-2">{value}</Tag>}
      </div>
    </div>
  );
}
