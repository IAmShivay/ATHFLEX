export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Avatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  const bg = color ?? "bg-neutral-900";
  return (
    <span
      className={`inline-flex ${dims} shrink-0 items-center justify-center rounded-none font-semibold text-white ${bg}`}
    >
      {initials(name)}
    </span>
  );
}
