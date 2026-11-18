"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export default function ActionButton({
  children,
  pendingLabel,
  className,
  title,
}: {
  children: ReactNode;
  pendingLabel: string;
  className: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} title={title} className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
