export const fmtDate = (d: Date) =>
  `${d.getMonth() + 1}/${d.getDate()}`;
export const fmtDateFull = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const fmtDateTime = (d: Date) => `${fmtDate(d)} ${fmtTime(d)}`;
export const fmtMoney = (n: number) => {
  if (n >= 1_000_000) return `¥${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `¥${(n / 10_000).toFixed(1)}万`;
  return `¥${n.toLocaleString()}`;
};
export const fmtKg = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}t` : `${n}kg`);
export const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
