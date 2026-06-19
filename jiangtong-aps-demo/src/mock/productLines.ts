// §7.3 50 条产线（漆包 18 + 拉丝 24 + 绞线 8）
import type { Resource } from '../types/schedule';

function gen(): Resource[] {
  const list: Resource[] = [];
  // 漆包车间 18 台
  for (let i = 1; i <= 18; i++) {
    list.push({ id: `R-EN-${String(i).padStart(2, '0')}`, name: `漆包机 #${i}`, workshop: 'enameling', workshopName: '漆包车间' });
  }
  // 拉丝车间 24 台：大拉/中拉/小拉
  for (let i = 1; i <= 24; i++) {
    let label = '拉丝机';
    if (i <= 4) label = '大拉机';
    else if (i <= 16) label = '中拉机';
    else label = '小拉机';
    list.push({ id: `R-DR-${String(i).padStart(2, '0')}`, name: `${label} #${i}`, workshop: 'drawing', workshopName: '拉丝车间' });
  }
  // 绞线车间 8 台
  for (let i = 1; i <= 8; i++) {
    list.push({ id: `R-ST-${String(i).padStart(2, '0')}`, name: `绞线机 #${i}`, workshop: 'stranding', workshopName: '绞线车间' });
  }
  return list;
}

export const RESOURCES: Resource[] = gen();

export function getResourcesByWorkshop(ws: 'enameling' | 'drawing' | 'stranding' | 'all') {
  return ws === 'all' ? RESOURCES : RESOURCES.filter((r) => r.workshop === ws);
}
