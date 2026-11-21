export const PO_SOURCES = ["manual", "forecast"] as const;
export type PoSource = (typeof PO_SOURCES)[number];
export const DEFAULT_PO_SOURCE: PoSource = "manual";
export const PO_SOURCE_LABELS: Record<PoSource, string> = { manual: "Manual", forecast: "Forecast" };
