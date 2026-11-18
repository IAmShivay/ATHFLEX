import Link from "next/link";
import QRCode from "qrcode";
import { requirePermission } from "@/lib/dal";
import { query } from "@/lib/db";
import { getPurchaseOrder, styleSkuLabel } from "@/lib/production";
import { PrintButton } from "@/components/PrintButton";

type PieceRow = {
  id: number;
  code: string;
  piece_no: number;
  status: string;
  size: string;
  item_id: number;
  quantity: number;
  techpack_code: string;
  color_family: string;
  description: string | null;
  product_name: string;
};

export default async function QrSheetPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("production");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return <QrMessage title="QR sheet not found" message="The FOB PO id is invalid." />;
  const po = await getPurchaseOrder(id);
  if (!po) return <QrMessage title="QR sheet not found" message="This FOB PO no longer exists." />;
  if (!["issued", "partly_received", "closed"].includes(po.status)) {
    return <QrMessage title="Issue the PO first" message="The QR sheet becomes available after the FOB PO is issued." poId={po.id} />;
  }

  const { rows: pieces } = await query<PieceRow>(`
    SELECT fp.id, fp.code, fp.piece_no, fp.status, i.size, i.id AS item_id, i.quantity,
           t.code AS techpack_code, t.color_family, t.description, t.name AS product_name
    FROM fob_pieces fp
    JOIN fob_po_items i ON i.id = fp.item_id
    JOIN techpacks t ON t.id = i.techpack_id
    WHERE i.fob_po_id = $1
    ORDER BY t.code, i.size, fp.piece_no`, [id]);

  const svgByPiece = new Map<number, string>();
  for (const piece of pieces) {
    svgByPiece.set(piece.id, await QRCode.toString(piece.code, {
      type: "svg",
      margin: 0,
      width: 120,
      errorCorrectionLevel: "M",
      color: { dark: "#171717", light: "#ffffff" },
    }));
  }

  const groups = new Map<string, { label: string; size: string; quantity: number; pieces: PieceRow[] }>();
  for (const piece of pieces) {
    const label = styleSkuLabel({ code: piece.techpack_code, color_family: piece.color_family, description: piece.description, name: piece.product_name });
    const key = `${label}:${piece.size}`;
    const group = groups.get(key) ?? { label, size: piece.size, quantity: piece.quantity, pieces: [] };
    group.pieces.push(piece);
    groups.set(key, group);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-white p-6 text-neutral-900 print:max-w-none print:p-0">
      <style>{`@page { size: A4; margin: 9mm; } @media print { .qr-piece { break-inside: avoid; } }`}</style>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-900 pb-4 print:hidden">
        <div>
          <Link href={`/purchase-orders/${po.id}`} className="text-sm font-medium text-neutral-700 hover:underline">← {po.po_number}</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Piece QR sheet</h1>
          <p className="mt-1 text-sm text-neutral-500">{po.po_number} · {po.jobber} · {pieces.length} pieces · one code per piece</p>
        </div>
        <PrintButton />
      </header>
      <div className="hidden print:block">
        <p className="text-lg font-semibold">{po.po_number} · {po.jobber} · piece QR sheet</p>
        <p className="mt-1 text-[10px]">Stick one QR on each piece. Do not cover the printed code below it. {pieces.length} pieces.</p>
      </div>

      <div className="mt-6 space-y-6 print:mt-4 print:space-y-3">
        {[...groups.values()].map((group) => (
          <section key={`${group.label}:${group.size}`} className="break-inside-avoid">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-300 pb-1">
              <h2 className="text-sm font-semibold">{group.label} · Size {group.size}</h2>
              <p className="text-xs text-neutral-500">{group.pieces.length} of {group.quantity} pieces</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 print:grid-cols-6 print:gap-1.5">
              {group.pieces.map((piece) => (
                <div key={piece.id} className="qr-piece border border-neutral-300 p-2 text-center print:border-neutral-400 print:p-1">
                  <div className="mx-auto h-24 w-24 [&>svg]:h-full [&>svg]:w-full print:h-[23mm] print:w-[23mm]" dangerouslySetInnerHTML={{ __html: svgByPiece.get(piece.id) ?? "" }} />
                  <p className="mt-1 break-all font-mono text-[8px] leading-tight text-neutral-800">{piece.code}</p>
                  <p className="text-[8px] text-neutral-500">Piece {String(piece.piece_no).padStart(3, "0")}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        {!pieces.length && <p className="text-sm text-neutral-500">No piece QRs were generated for this PO.</p>}
      </div>
    </main>
  );
}

function QrMessage({ title, message, poId }: { title: string; message: string; poId?: number }) {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="border border-neutral-300 bg-white p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        <Link href={poId ? `/purchase-orders/${poId}` : "/purchase-orders"} className="mt-4 inline-block border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">Back to FOB PO</Link>
      </div>
    </main>
  );
}
