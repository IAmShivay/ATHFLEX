"use client";

const COLORS = ["#171717", "#525252", "#737373", "#a3a3a3", "#d4d4d4"];

export default function DonutChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 56;
  const C = 2 * Math.PI * R;

  const arcs = data.reduce<{ label: string; color: string; dash: number; offset: number }[]>(
    (acc, d, i) => {
      const dash = (d.value / total) * C;
      const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      acc.push({ label: d.label, color: COLORS[i % COLORS.length], dash, offset });
      return acc;
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Breakdown">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#f7f7f7" strokeWidth="16" />
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={a.color}
            strokeWidth="16"
            strokeDasharray={`${a.dash} ${C - a.dash}`}
            strokeDashoffset={-a.offset}
          >
            <title>{a.label}</title>
          </circle>
        ))}
      </svg>
      <ul className="w-full space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-none" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="flex-1 truncate text-[#4a4a4a]">{d.label}</span>
            <span className="font-medium text-[#1a1a1a]">{d.value}</span>
            <span className="w-10 text-right text-xs text-[#737373]">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
