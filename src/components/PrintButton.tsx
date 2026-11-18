"use client";

export function PrintButton({ label = "Print QR sheet" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
      {label}
    </button>
  );
}
