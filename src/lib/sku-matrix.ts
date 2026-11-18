import { ValidationError, type FieldErrors } from "@/lib/form-errors";

export type SkuCombination = { sku: string; color: string; size: string };

const MAX_VALUES = 20;
const MAX_COMBINATIONS = 100;
const MAX_VALUE_LENGTH = 50;

function token(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function invalidValues(values: string[]): boolean {
  return values.some((value) => value.length > MAX_VALUE_LENGTH || !token(value));
}

function bothFields(message: string): ValidationError {
  return new ValidationError(message, { colors: message, sizes: message });
}

export function buildSkuMatrix(base: string, colorsInput: string, sizesInput: string): SkuCombination[] {
  const cleanBase = base.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{0,59}$/.test(cleanBase)) {
    throw new ValidationError("The base SKU must use letters, numbers, hyphens or underscores (up to 60 characters).");
  }
  const split = (input: string) => input.split(",").map((value) => value.trim()).filter(Boolean);
  const colors = split(colorsInput);
  const sizes = split(sizesInput);
  const missing: FieldErrors = {};
  if (!colors.length) missing.colors = "Enter at least one color.";
  if (!sizes.length) missing.sizes = "Enter at least one size.";
  if (Object.keys(missing).length) throw new ValidationError(Object.values(missing)[0], missing);
  if (colors.length > MAX_VALUES || sizes.length > MAX_VALUES || colors.length * sizes.length > MAX_COMBINATIONS) {
    throw bothFields(`Use at most ${MAX_VALUES} colors, ${MAX_VALUES} sizes and ${MAX_COMBINATIONS} combinations at a time.`);
  }
  const invalid: FieldErrors = {};
  if (invalidValues(colors)) invalid.colors = `Each color must contain letters or numbers and be at most ${MAX_VALUE_LENGTH} characters.`;
  if (invalidValues(sizes)) invalid.sizes = `Each size must contain letters or numbers and be at most ${MAX_VALUE_LENGTH} characters.`;
  if (Object.keys(invalid).length) throw new ValidationError(Object.values(invalid)[0], invalid);
  const result = colors.flatMap((color) => sizes.map((size) => ({
    sku: `${cleanBase}-${token(color)}-${token(size)}`,
    color,
    size,
  })));
  if (new Set(result.map((entry) => entry.sku)).size !== result.length) {
    throw bothFields("Some colors or sizes produce the same SKU. Use distinct values.");
  }
  return result;
}
