export function Spark({ data, w = 90, h = 28, color = 'var(--brand)' }) {
  const max = Math.max(...data), min = Math.min(...data);
  const dx = w / (data.length - 1);
  const y = (v) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8);
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * dx} ${y(v)}`).join(' ');
  const fill = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} className="kpi-spark">
      <path d={fill} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}
