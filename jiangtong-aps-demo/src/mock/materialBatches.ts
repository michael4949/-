// Sprint 4 · 物料批次状态（铜杆 / 漆液 / 锡液 / 拉丝油）
export type MaterialKind = 'copper-rod' | 'paint' | 'tin' | 'lubricant';

export interface MaterialBatch {
  id: string;
  kind: MaterialKind;
  spec: string;        // 规格描述（如 "QA-红 / 8.0mm 铜杆"）
  quantity: number;    // 数量
  unit: 'kg' | 't' | 'L';
  status: 'available' | 'locked' | 'in-transit' | 'reserved';
  /** 锁定 / 关联工单（若 status=locked / reserved） */
  lockedBy?: string;
  /** 在途到货预计日期 */
  arrivalDate?: string;
  warehouse: string;
}

export const MATERIAL_BATCHES: MaterialBatch[] = [
  // ===== 铜杆 =====
  { id: 'LB-2026-07-A', kind: 'copper-rod', spec: 'Φ8.0mm 铜杆',     quantity: 2.3,  unit: 't', status: 'locked',     lockedBy: 'WO-2026-1234', warehouse: '主原料库 A' },
  { id: 'LB-2026-07-B', kind: 'copper-rod', spec: 'Φ8.0mm 铜杆',     quantity: 8.5,  unit: 't', status: 'available',  warehouse: '主原料库 A' },
  { id: 'LB-2026-08-A', kind: 'copper-rod', spec: 'Φ8.0mm 铜杆',     quantity: 12.0, unit: 't', status: 'in-transit', arrivalDate: '2026-07-19', warehouse: '主原料库 A' },
  { id: 'LB-2026-07-C', kind: 'copper-rod', spec: 'Φ12.5mm 铜杆',    quantity: 5.6,  unit: 't', status: 'available',  warehouse: '主原料库 B' },
  { id: 'LB-2026-08-B', kind: 'copper-rod', spec: 'Φ16mm 铜杆',      quantity: 3.2,  unit: 't', status: 'in-transit', arrivalDate: '2026-07-21', warehouse: '主原料库 B' },
  // ===== 漆液 =====
  { id: 'QA-RED-2607', kind: 'paint', spec: 'QA 聚氨酯 · 红色',   quantity: 320, unit: 'kg', status: 'available',  warehouse: '漆液库' },
  { id: 'QA-BLUE-2607',kind: 'paint', spec: 'QA 聚氨酯 · 蓝色',   quantity: 0,   unit: 'kg', status: 'reserved',   lockedBy: 'WO-2026-1242', warehouse: '漆液库' },
  { id: 'QZ-BLUE-2607',kind: 'paint', spec: 'QZ 聚酯 · 蓝色',     quantity: 580, unit: 'kg', status: 'available',  warehouse: '漆液库' },
  { id: 'QY-BLK-2607', kind: 'paint', spec: 'QY 聚酰亚胺 · 黑',    quantity: 240, unit: 'kg', status: 'available',  warehouse: '漆液库' },
  { id: 'QXY-PNK-001', kind: 'paint', spec: 'QXY 聚酰胺 · 粉色',   quantity: 80,  unit: 'kg', status: 'reserved',   lockedBy: 'WO-SAMPLE-2026-001', warehouse: '漆液库' },
  // ===== 锡液 =====
  { id: 'TIN-INGOT-26-07', kind: 'tin', spec: '锡锭 99.9%', quantity: 1.2, unit: 't', status: 'available', warehouse: '辅料库' },
  { id: 'TIN-INGOT-26-08', kind: 'tin', spec: '锡锭 99.9%', quantity: 0.4, unit: 't', status: 'reserved', lockedBy: 'WO-2026-1248', warehouse: '辅料库' },
  // ===== 拉丝油 =====
  { id: 'LUB-DR-2607', kind: 'lubricant', spec: '拉丝油 SL-7',  quantity: 800, unit: 'L', status: 'available', warehouse: '辅料库' },
];

export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
  'copper-rod': '铜杆',
  paint: '漆液',
  tin: '锡液',
  lubricant: '拉丝油',
};
export const MATERIAL_STATUS_LABEL: Record<MaterialBatch['status'], string> = {
  available: '可用',
  locked: '已锁定',
  'in-transit': '在途',
  reserved: '预留',
};

export function getBatch(id: string): MaterialBatch | undefined {
  return MATERIAL_BATCHES.find((b) => b.id === id);
}

export const MATERIAL_KPI = {
  total: MATERIAL_BATCHES.length,
  available: MATERIAL_BATCHES.filter((b) => b.status === 'available').length,
  locked: MATERIAL_BATCHES.filter((b) => b.status === 'locked').length,
  inTransit: MATERIAL_BATCHES.filter((b) => b.status === 'in-transit').length,
  reserved: MATERIAL_BATCHES.filter((b) => b.status === 'reserved').length,
};
