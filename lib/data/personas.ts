import { getStore } from "./store";

// 选定 demo 角色对应的"当前登录身份"
export function getDemoEnterprise() {
  const s = getStore();
  // 选一个中型 + 制造业 + 已认证的代表性企业
  return s.enterprises.find(
    (e) => e.scale === "MED" && e.industryCode === "MFG" && e.certified && e.isHighTech,
  ) || s.enterprises[42];
}

export function getDemoProvider() {
  return { vendor: "深度求索", contact: "张志远", phone: "186-8888-0521", title: "商务合作负责人" };
}

export function getDemoOperator() {
  return { name: "周运营", role: "平台运营负责人", team: "滨海 AI 产业服务中心" };
}
