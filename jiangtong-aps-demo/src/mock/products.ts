// §7.3 200 SKU，覆盖 P1-P5 工艺路径
import type { WorkOrder } from '../types/workOrder';

export interface Product {
  code: string;
  name: string;
  category: WorkOrder['productCategory'];
  routeId: WorkOrder['routeId'];
  /** 工艺规格签名，用于换型计算（同 sigKey 不换型） */
  sigKey: string;
  unitWeightKg: number;       // 标准批次（kg）
  colorCode: string;          // 视觉颜色
}

// 漆包线：4 漆种 × 多线径 × 颜色组合
const ENAMEL_TYPES = ['QA', 'QZ', 'QY', 'QXY'] as const; // 聚氨酯/聚酯/聚酰亚胺/聚酰胺
const ENAMEL_DIAMETERS = [
  0.05, 0.08, 0.1, 0.13, 0.18, 0.21, 0.26, 0.31,
  0.38, 0.45, 0.51, 0.59, 0.71, 0.81, 0.95, 1.06, 1.20, 1.40,
];
const COLORS = ['红色', '蓝色', '黄色', '绿色', '黑色', '白色', '橙色', '透明', '棕色'];
const COLOR_HEX: Record<string, string> = {
  红色: '#EF4444', 蓝色: '#3B82F6', 黄色: '#F59E0B', 绿色: '#10B981',
  黑色: '#1F2937', 白色: '#E5E7EB', 橙色: '#FF6B35', 透明: '#9CA3AF', 棕色: '#92400E',
};

const TIN_DIAMETERS = [0.20, 0.30, 0.40, 0.50, 0.71];
const STRAND_DIAMS = [0.20, 0.30, 0.40];
const STRAND_COUNTS = [7, 19, 37];

function build(): Product[] {
  const list: Product[] = [];
  // ★ v2.2.1：先放 P2-P5 产品（少数派），再放 P1 漆包，保证 slice 时不会切掉其它工艺
  // 镀锡线 P2
  for (const d of TIN_DIAMETERS) {
    for (const sub of ['标准镀锡', '加厚镀锡']) {
      list.push({
        code: `TIN-${d}-${sub === '加厚镀锡' ? 'T' : 'N'}`,
        name: `${d}mm-${sub}`,
        category: 'tinned',
        routeId: 'P2',
        sigKey: `TIN|${d}|${sub}`,
        unitWeightKg: 500,
        colorCode: '#0EA5E9',
      });
    }
  }
  // 铜绞线 P3
  for (const d of STRAND_DIAMS) {
    for (const n of STRAND_COUNTS) {
      list.push({
        code: `STR-${d}x${n}`,
        name: `${n} 股 ×Φ${d}mm 铜绞线`,
        category: 'stranded',
        routeId: 'P3',
        sigKey: `STR|${d}|${n}`,
        unitWeightKg: 800,
        colorCode: '#A16207',
      });
    }
  }
  // 拉丝半成品 P4
  for (const d of [1.0, 1.2, 1.4, 1.6, 2.0, 2.6]) {
    list.push({
      code: `DRW-${d}`,
      name: `拉丝半成品 Φ${d}mm`,
      category: 'wire',
      routeId: 'P4',
      sigKey: `DRW|${d}`,
      unitWeightKg: 1200,
      colorCode: '#7C3AED',
    });
  }
  // 裸铜杆 P5
  for (const d of [8.0, 12.5, 16]) {
    list.push({
      code: `BC-${d}`,
      name: `裸铜杆 Φ${d}mm`,
      category: 'bare',
      routeId: 'P5',
      sigKey: `BC|${d}`,
      unitWeightKg: 1500,
      colorCode: '#92400E',
    });
  }
  // 漆包 P1 放最后（数量最多）
  for (const t of ENAMEL_TYPES) {
    for (const d of ENAMEL_DIAMETERS) {
      for (const c of ['红色', '蓝色', '黄色', '透明']) {
        list.push({
          code: `${t}-${d.toFixed(2)}-${c}`,
          name: `${t}-${d}mm ${c}`,
          category: 'enameled',
          routeId: 'P1',
          sigKey: `${t}|${d}`,
          unitWeightKg: 300 + Math.round((d * 800)),
          colorCode: COLOR_HEX[c] ?? '#FF6B35',
        });
      }
    }
  }
  return list;  // 保留全部产品（P1 + P2-P5 共 ~316 种），不再 slice
}

export const PRODUCTS: Product[] = build();
