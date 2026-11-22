import type { PpStatus } from "./production";

export type WorkflowStepKey = "techpack" | "fabric" | "trim" | "sku" | "pp" | "po" | "qr" | "stick" | "inward" | "reports";
export type StepState = "done" | "current" | "upcoming" | "rework" | "offline";

export type WorkflowStep = { key: WorkflowStepKey; label: string; href?: string; offline?: boolean };

export const PHASE1_WORKFLOW: WorkflowStep[] = [
  { key: "techpack", label: "Techpack", href: "/techpacks" },
  { key: "fabric", label: "Fabric master", href: "/materials/fabric" },
  { key: "trim", label: "Trim master", href: "/materials/trim" },
  { key: "sku", label: "SKU generation", href: "/products" },
  { key: "pp", label: "PP approval", href: "/pp-approvals" },
  { key: "po", label: "FOB PO", href: "/purchase-orders" },
  { key: "qr", label: "QR generation", href: "/purchase-orders" },
  { key: "stick", label: "Jobber prints & sticks QR", offline: true },
  { key: "inward", label: "Scan inward", href: "/inward" },
  { key: "reports", label: "Reports", href: "/reports" },
];

export const PHASE2_WORKFLOW: { key: string; label: string }[] = [
  { key: "ecommerce", label: "E-commerce data" },
  { key: "inventory", label: "Inventory" },
  { key: "forecasting", label: "Demand forecasting" },
  { key: "product-planning", label: "Product planning" },
  { key: "purchase-planning", label: "Purchase planning" },
  { key: "po-creation", label: "PO creation" },
];

export const PP_REWORK_STEP: WorkflowStepKey = "pp";
export const PP_REWORK_LABEL = "Rejected: Rework & Resubmit";

export type StyleProgress = {
  fabricAssigned: boolean;
  trimAssigned: boolean;
  skuCount: number;
  ppStatus: PpStatus;
  reworkRounds: number;
  poCount: number;
  issuedPoCount: number;
  openPoCount: number;
  piecesReceived: number;
};

export function styleWorkflowStates(progress: StyleProgress): Record<WorkflowStepKey, StepState> {
  const done = (value: boolean): StepState => (value ? "done" : "upcoming");
  const inwardStarted = progress.piecesReceived > 0;
  const inwardFinished = inwardStarted && progress.openPoCount === 0;
  const states: Record<WorkflowStepKey, StepState> = {
    techpack: "done",
    fabric: done(progress.fabricAssigned),
    trim: done(progress.trimAssigned),
    sku: done(progress.skuCount > 0),
    pp: progress.ppStatus === "approved" ? "done" : progress.ppStatus === "rejected" ? "rework" : "upcoming",
    po: done(progress.poCount > 0),
    qr: done(progress.issuedPoCount > 0),
    stick: inwardStarted ? "done" : "upcoming",
    inward: inwardFinished ? "done" : inwardStarted ? "current" : "upcoming",
    reports: done(inwardStarted),
  };
  return markCurrent(states);
}

export function markCurrent(states: Record<WorkflowStepKey, StepState>): Record<WorkflowStepKey, StepState> {
  const next = { ...states };
  const firstOpen = PHASE1_WORKFLOW.find((step) => next[step.key] === "upcoming" || next[step.key] === "rework");
  if (firstOpen && next[firstOpen.key] === "upcoming") next[firstOpen.key] = "current";
  for (const step of PHASE1_WORKFLOW) {
    if (step.offline && next[step.key] === "upcoming") next[step.key] = "offline";
  }
  return next;
}

export type WorkflowCounts = {
  styles: number;
  fabricStyles: number;
  trimStyles: number;
  styledWithSkus: number;
  skus: number;
  ppPending: number;
  ppRework: number;
  ppApproved: number;
  pos: number;
  issuedPos: number;
  piecesOrdered: number;
  piecesReceived: number;
};

const plural = (value: number, singular: string, many = `${singular}s`) => `${value} ${value === 1 ? singular : many}`;

export function portfolioSummaries(counts: WorkflowCounts): Record<WorkflowStepKey, string> {
  return {
    techpack: plural(counts.styles, "style"),
    fabric: `${counts.fabricStyles} of ${plural(counts.styles, "style")} tagged`,
    trim: `${counts.trimStyles} of ${plural(counts.styles, "style")} tagged`,
    sku: plural(counts.skus, "SKU"),
    pp: `${counts.ppApproved} approved · ${counts.ppPending} pending · ${counts.ppRework} rework`,
    po: plural(counts.pos, "PO"),
    qr: `${counts.issuedPos} issued`,
    stick: "Done by the jobber",
    inward: `${counts.piecesReceived} of ${plural(counts.piecesOrdered, "piece")}`,
    reports: "Live from scans",
  };
}
