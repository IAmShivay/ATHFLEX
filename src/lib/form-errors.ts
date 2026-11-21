export type FieldErrors = Record<string, string>;
export type FormErrorState = { error?: string; fieldErrors?: FieldErrors };

export const FIELD_MESSAGES = {
  required: (label: string) => `${label} is required.`,
  select: (label: string) => `Select ${label}.`,
  email: (label: string) => `${label} must be a valid email address, like name@company.com.`,
  url: (label: string) => `${label} must be a full link starting with https://.`,
  invalid: (label: string) => `${label} is not valid. Check it and try again.`,
  tooShort: (label: string, min: number) => `${label} must be at least ${min} characters.`,
  tooLong: (label: string, max: number) => `${label} must be at most ${max} characters.`,
  min: (label: string, min: string) => `${label} must be ${min} or more.`,
  max: (label: string, max: string) => `${label} must be ${max} or less.`,
  wholeNumber: (label: string) => `${label} must be a whole number.`,
  fallbackLabel: "This field",
} as const;

const UNIQUE_VIOLATION = "23505";

export class ValidationError extends Error {
  constructor(message: string, readonly fieldErrors: FieldErrors = {}) {
    super(message);
  }
}

export function fieldError(field: string, message: string): ValidationError {
  return new ValidationError(message, { [field]: message });
}

export function fieldErrorsFrom(errors: FieldErrors): ValidationError {
  return new ValidationError(Object.values(errors)[0] ?? FIELD_MESSAGES.invalid(FIELD_MESSAGES.fallbackLabel), errors);
}

export function failWithFields(errors: FieldErrors): FormErrorState | null {
  return Object.keys(errors).length ? { fieldErrors: errors } : null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

type FailureOptions = {
  fallback: string;
  logLabel: string;
  defaultField?: string;
  duplicate?: { message: string; field?: string };
  exposeMessage?: boolean;
};

export function formFailure(error: unknown, options: FailureOptions): FormErrorState {
  if (error instanceof ValidationError) {
    if (Object.keys(error.fieldErrors).length) return { fieldErrors: error.fieldErrors };
    if (options.defaultField) return { fieldErrors: { [options.defaultField]: error.message } };
    return { error: error.message };
  }
  if (options.duplicate && isUniqueViolation(error)) {
    const { message, field } = options.duplicate;
    return field ? { fieldErrors: { [field]: message } } : { error: message };
  }
  if (options.exposeMessage && error instanceof Error && !("code" in error)) return { error: error.message };
  console.error(options.logLabel, error);
  return { error: options.fallback };
}
