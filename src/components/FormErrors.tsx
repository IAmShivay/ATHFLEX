import type { FieldErrors } from "@/lib/form-errors";

export function FieldError({ errors, name, inputId, prefix = "", className = "" }: { errors: FieldErrors; name: string; inputId: string; prefix?: string; className?: string }) {
  const message = errors[name];
  if (!message) return null;
  return <span id={`${inputId}-error`} role="alert" className={`mt-1 block text-xs font-medium text-danger ${className}`}>{prefix}{message}</span>;
}

export function FormAlert({ message, className = "", compact = false }: { message?: string; className?: string; compact?: boolean }) {
  if (!message) return null;
  return <p role="alert" className={`${compact ? "text-xs" : "text-sm"} font-medium text-danger ${className}`}>{message}</p>;
}
