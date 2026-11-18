const FINANCIAL: Record<string, string> = {
  paid: "bg-neutral-900 text-white ring-neutral-900",
  pending: "bg-white text-neutral-700 ring-neutral-300",
  refunded: "bg-neutral-100 text-neutral-700 ring-neutral-300",
};

const FULFILLMENT: Record<string, string> = {
  fulfilled: "bg-neutral-900 text-white ring-neutral-900",
  unfulfilled: "bg-neutral-100 text-neutral-600 ring-neutral-500/20",
};

const PRODUCT: Record<string, string> = {
  active: "bg-neutral-900 text-white ring-neutral-900",
  draft: "bg-neutral-100 text-neutral-600 ring-neutral-500/20",
  archived: "bg-neutral-100 text-neutral-600 ring-neutral-200",
};

export function FinancialBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-none px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        FINANCIAL[status] ?? "bg-neutral-100 text-neutral-600 ring-neutral-500/20"
      }`}
    >
      {status}
    </span>
  );
}

export function FulfillmentBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-none px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        FULFILLMENT[status] ?? "bg-neutral-100 text-neutral-600 ring-neutral-500/20"
      }`}
    >
      {status}
    </span>
  );
}

export function ProductStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-none px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        PRODUCT[status] ?? "bg-neutral-100 text-neutral-600 ring-neutral-500/20"
      }`}
    >
      {status}
    </span>
  );
}
