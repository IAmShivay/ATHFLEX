"use client";

type Point = { label: string; value: number };

function fmt(v: number, unit: string) {
  if (unit === "$" && v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return unit === "$" ? `$${Math.round(v)}` : String(Math.round(v));
}

export default function BarChart({
  data,
  height = 220,
  unit = "$",
}: {
  data: Point[];
  height?: number;
  unit?: string;
}) {
  const W = 640;
  const H = height;
  const PAD = { top: 12, right: 8, bottom: 24, left: 48 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.1;
  const bw = Math.min(48, (iw / Math.max(1, data.length)) * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bar chart">
      {[0, 0.5, 1].map((t) => {
        const ty = PAD.top + ih - t * ih;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={ty} y2={ty} stroke="#ececec" />
            <text x={PAD.left - 8} y={ty + 3.5} textAnchor="end" fontSize="10" fill="#737373">
              {fmt(t * max, unit)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = PAD.left + (i + 0.5) * (iw / data.length);
        const h = (d.value / max) * ih;
        return (
          <g key={`${d.label}-${i}`}>
            <rect
              x={cx - bw / 2}
              y={PAD.top + ih - h}
              width={bw}
              height={Math.max(2, h)}
              rx="0"
              fill="#262626"
              opacity={i === data.length - 1 ? 1 : 0.75}
            >
              <title>{`${d.label}: ${unit === "$" ? "$" : ""}${d.value.toFixed(unit === "$" ? 2 : 0)}`}</title>
            </rect>
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" fill="#737373">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
