import Link from "next/link";
import { ChevronIcon } from "./icons";

export default function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[#d4d4d4] px-4 py-3">
      <p className="text-xs text-[#616161]">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={makeHref(Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={`flex items-center gap-1 rounded-none border border-[#d4d4d4] bg-white px-3 py-1.5 text-xs font-medium ${
            page === 1 ? "pointer-events-none opacity-40" : "hover:bg-[#f7f7f7]"
          }`}
        >
          <ChevronIcon className="h-3.5 w-3.5 rotate-180" /> Previous
        </Link>
        <Link
          href={makeHref(Math.min(totalPages, page + 1))}
          aria-disabled={page === totalPages}
          className={`flex items-center gap-1 rounded-none border border-[#d4d4d4] bg-white px-3 py-1.5 text-xs font-medium ${
            page === totalPages ? "pointer-events-none opacity-40" : "hover:bg-[#f7f7f7]"
          }`}
        >
          Next <ChevronIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
