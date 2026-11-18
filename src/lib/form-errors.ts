export type FieldErrors = Record<string, string>;
export type FormErrorState = { error?: string; fieldErrors?: FieldErrors };

export const FIELD_MESSAGES = {
  required: "This field is required.",
  select: "Select an option.",
  email: "Enter a valid email address.",
  url: "Enter a valid link.",
  invalid: "Enter a valid value.",
  tooShort: (min: number) => `Use at least ${min} characters.`,
  tooLong: (max: number) => `Use at most ${max} characters.`,
  min: (min: string) => `Enter a value of ${min} or more.`,
  max: (max: string) => `Enter a value of ${max} or less.`,
  wholeNumber: "Enter a whole number.",
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
  return new ValidationError(Object.values(errors)[0] ?? FIELD_MESSAGES.invalid, errors);
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
