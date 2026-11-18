"use client";

type Point = { label: string; value: number };

export default function AreaChart({ data, height = 220 }: { data: Point[]; height?: number }) {
  const W = 640;
  const H = height;
  const PAD = { top: 12, right: 8, bottom: 24, left: 44 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.1;

  const x = (i: number) => PAD.left + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;

  const points = data.map((d, i) => [x(i), y(d.value)] as const);
  const line = points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${PAD.top + ih} L${PAD.left},${PAD.top + ih} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue over time">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#171717" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#171717" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => {
        const ty = PAD.top + ih - t * ih;
        return (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={ty} y2={ty} stroke="#ececec" strokeWidth="1" />
            <text x={PAD.left - 8} y={ty + 3.5} textAnchor="end" fontSize="10" fill="#737373">
              ${Math.round((t * max) / (max > 2000 ? 1000 : 1)) * (max > 2000 ? 1000 : 1) >= 1000
                ? `${(((t * max) / 1000) || 0).toFixed(0)}k`
                : Math.round(t * max)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="#171717" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r="7" fill="transparent">
            <title>{`${data[i].label}: $${data[i].value.toFixed(2)}`}</title>
          </circle>
          {i % labelEvery === 0 && (
            <text x={px} y={H - 6} textAnchor="middle" fontSize="10" fill="#737373">
              {data[i].label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
