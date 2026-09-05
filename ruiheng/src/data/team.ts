import { rng } from '../lib/rng';
export interface Member { id: string; name: string; branch: string; level: '初级' | '中级' | '资深'; customers: number; deposits: number; loans: number; alerts: number; aiUse: number; sparring: number; radar: number[] }
const NAMES = ['林小雨','王志远','周慧敏','陈志刚','黄丽华','刘沐阳','张思远','李欣然','赵可欣','孙铭','吴雨桐','郑浩','冯嘉怡','蔡子墨','杨若曦','高俊','梁思琪','许一凡','宋雨薇','唐皓'];
const r = rng(20260904);
export const TEAM: Member[] = NAMES.map((name, i) => {
  const level = i < 8 ? '初级' : i < 16 ? '中级' : '资深';
  const base = level === '初级' ? 45 : level === '中级' ? 62 : 78;
  return {
    id: `m${i + 1}`, name, branch: i % 2 === 0 ? '城东支行' : '高新支行', level,
    customers: Math.round(18 + r() * 50), deposits: Math.round(800 + r() * 6000), loans: Math.round(500 + r() * 9000),
    alerts: Math.round(r() * 5), aiUse: Math.round(40 + r() * 60), sparring: Math.round(r() * 12),
    radar: Array.from({ length: 10 }, () => Math.min(98, Math.round(base + (r() - 0.35) * 30))),
  };
});
export const RADAR_DIMS = ['财务分析', '风险识别', '方案设计', '沟通谈判', '合规意识', '客户经营', '行业洞察', '产品知识', '数字工具', '协作执行'];
