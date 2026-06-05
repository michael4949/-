import { cx } from "./complex";
import type { Material } from "./types";

/**
 * 吸波填料与基体的电磁参数库。
 *
 * ⚠️ 重要声明：以下数值为 X 波段（≈8–12 GHz）附近的「公开文献代表值」，
 * 取自雷达吸波材料（RAM）学术文献的典型数量级，用于教学与科研仿真。
 * 它们既非任何机密配方，也不是某一具体批次的实测值；真实工程中 ε/μ 随频率、
 * 工艺、温度显著色散。本库的目标是让仿真「物理上自洽、数量级真实」。
 *
 * 复参数约定 ε = ε' − jε''、μ = μ' − jμ''，按 {re, im}（im 为负）存储。
 */
export const MATERIALS: Record<string, Material> = {
  // ===== 磁损耗型填料：提供 μ''，利于薄层阻抗匹配（低 GHz~X 段） =====
  cip: {
    id: "cip", name: "羰基铁粉", nameEn: "Carbonyl Iron Powder",
    role: "magnetic", eps: cx(25, -3), mu: cx(3.5, -2.0),
    density: 7.86, maxVolFrac: 0.55, cost: 3,
    note: "RAM 主力填料：高磁损耗、宽带，缺点是密度大、面密度高。",
  },
  sendust: {
    id: "sendust", name: "铁硅铝扁平粉", nameEn: "FeSiAl (Sendust) flake",
    role: "magnetic", eps: cx(30, -4), mu: cx(5.0, -3.0),
    density: 6.9, maxVolFrac: 0.45, cost: 4,
    note: "片状形貌突破 Snoek 极限、提升 μ'，比羰基铁略轻。",
  },
  nizn: {
    id: "nizn", name: "镍锌铁氧体", nameEn: "Ni–Zn Ferrite",
    role: "magnetic", eps: cx(12, -0.5), mu: cx(2.5, -1.8),
    density: 5.3, maxVolFrac: 0.6, cost: 2,
    note: "经典磁损耗陶瓷，介电损耗低、耐温，适合中低频。",
  },
  bam: {
    id: "bam", name: "钡铁氧体", nameEn: "Barium Hexaferrite",
    role: "magnetic", eps: cx(15, -1), mu: cx(2.0, -1.4),
    density: 5.3, maxVolFrac: 0.5, cost: 3,
    note: "自然共振落在 X~Ku 段，可做窄带强吸收。",
  },

  // ===== 介电/导电损耗型填料：提供 ε''（X~Ku 段更高效） =====
  cb: {
    id: "cb", name: "炭黑", nameEn: "Carbon Black",
    role: "dielectric", eps: cx(18, -7), mu: cx(1, 0),
    density: 1.8, maxVolFrac: 0.3, cost: 1,
    note: "最廉价的介电吸收剂，轻；导电，需控制渗流。",
  },
  mwcnt: {
    id: "mwcnt", name: "多壁碳纳米管", nameEn: "MWCNT",
    role: "dielectric", eps: cx(35, -22), mu: cx(1, 0),
    density: 2.1, maxVolFrac: 0.12, cost: 8,
    note: "极强介电损耗，低添加量即见效（渗流敏感），轻量。",
  },
  rgo: {
    id: "rgo", name: "还原氧化石墨烯", nameEn: "Reduced Graphene Oxide",
    role: "dielectric", eps: cx(13, -9), mu: cx(1, 0),
    density: 2.2, maxVolFrac: 0.15, cost: 9,
    note: "二维高损耗、超轻，前沿宽带吸收材料。",
  },
  sic: {
    id: "sic", name: "碳化硅", nameEn: "Silicon Carbide",
    role: "dielectric", eps: cx(11, -3), mu: cx(1, 0),
    density: 3.2, maxVolFrac: 0.4, cost: 4,
    note: "耐高温介电吸收剂，适合发动机/尾喷等热区。",
  },
  pani: {
    id: "pani", name: "聚苯胺", nameEn: "Polyaniline (PANI)",
    role: "dielectric", eps: cx(11, -5), mu: cx(1, 0),
    density: 1.3, maxVolFrac: 0.35, cost: 5,
    note: "导电聚合物，电导率可调、轻、易与树脂共混。",
  },

  // ===== 基体（黏结剂） =====
  epoxy: {
    id: "epoxy", name: "环氧树脂", nameEn: "Epoxy",
    role: "matrix", eps: cx(3.6, -0.04), mu: cx(1, 0),
    density: 1.15, maxVolFrac: 1, cost: 1,
    note: "刚性结构基体，附着力好、低损耗。",
  },
  pu: {
    id: "pu", name: "聚氨酯", nameEn: "Polyurethane",
    role: "matrix", eps: cx(3.0, -0.08), mu: cx(1, 0),
    density: 1.10, maxVolFrac: 1, cost: 1,
    note: "柔性面漆基体，耐候、常用于最外伪装层。",
  },
  silicone: {
    id: "silicone", name: "硅橡胶", nameEn: "Silicone",
    role: "matrix", eps: cx(2.8, -0.02), mu: cx(1, 0),
    density: 1.05, maxVolFrac: 1, cost: 2,
    note: "耐高温柔性基体，低介电、低损耗。",
  },
};

/**
 * 天蓝伪装颜料库（用于最外层面漆配色）。
 * 颜色用 sRGB 近似；`radarSafe=false` 的导电颜料（如炭黑）会增大表层损耗/RCS，
 * 隐身面漆应避免——智能体会据此给出告警。tint = 相对着色力。
 */
export interface Pigment {
  id: string;
  name: string;
  nameEn: string;
  rgb: [number, number, number];
  tint: number;        // 相对着色力（白≈低、酞菁蓝≈高）
  radarSafe: boolean;  // 是否对雷达友好（非导电）
  density: number;
}

export const PIGMENTS: Pigment[] = [
  { id: "tio2", name: "钛白（金红石）", nameEn: "Titanium White (TiO₂)", rgb: [248, 248, 246], tint: 1.4, radarSafe: true, density: 4.0 },
  { id: "skyhue", name: "天蓝色相（锰蓝调）", nameEn: "Sky Blue Hue (Manganese)", rgb: [86, 180, 233], tint: 1.3, radarSafe: true, density: 3.3 },
  { id: "horizon", name: "地平线浅蓝（钴系）", nameEn: "Horizon Light Blue (Cobalt base)", rgb: [156, 178, 230], tint: 1.0, radarSafe: true, density: 3.4 },
  { id: "cerulean", name: "天蓝（铈蓝）", nameEn: "Cerulean Blue", rgb: [42, 122, 190], tint: 1.0, radarSafe: true, density: 3.5 },
  { id: "cobalt", name: "钴蓝", nameEn: "Cobalt Blue", rgb: [20, 70, 170], tint: 1.2, radarSafe: true, density: 3.8 },
  { id: "ultramarine", name: "群青", nameEn: "Ultramarine Blue", rgb: [18, 20, 130], tint: 1.5, radarSafe: true, density: 2.3 },
  { id: "phthalo", name: "酞菁蓝", nameEn: "Phthalo Blue", rgb: [0, 49, 83], tint: 3.0, radarSafe: true, density: 1.5 },
  { id: "grey", name: "中性灰（无碳）", nameEn: "Neutral Grey (carbon-free)", rgb: [128, 130, 132], tint: 1.1, radarSafe: true, density: 3.0 },
  // 对照项：导电炭黑虽是常见调色黑，但隐身面漆禁用——保留用于触发告警/对比
  { id: "carbonblack", name: "炭黑（导电·禁用）", nameEn: "Carbon Black (conductive)", rgb: [12, 12, 14], tint: 4.0, radarSafe: false, density: 1.8 },
];
