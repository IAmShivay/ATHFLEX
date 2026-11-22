export type MaterialKind = "fabric" | "trim";

export const MATERIAL_KINDS: Record<MaterialKind, { label: string; plural: string; example: string; hint: string }> = {
  fabric: {
    label: "Fabric",
    plural: "Fabrics",
    example: "Cotton Jersey 180 GSM - Black",
    hint: "Name each finished fabric with its color, for example Cotton Jersey 180 GSM - Black.",
  },
  trim: {
    label: "Trim",
    plural: "Trims",
    example: "Drawcord - Black",
    hint: "Create each trim once and reuse it, for example Drawcord - Black or Woven label.",
  },
};

export function isMaterialKind(value: string): value is MaterialKind {
  return value === "fabric" || value === "trim";
}
