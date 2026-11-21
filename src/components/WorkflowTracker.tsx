import Link from "next/link";
import { PHASE1_WORKFLOW, PP_REWORK_LABEL, PP_REWORK_STEP, type StepState, type WorkflowStepKey } from "@/lib/workflow";

const STATE_LABEL: Record<StepState, string> = {
  done: "Done",
  current: "Next",
  upcoming: "Not started",
  rework: "Rework needed",
  offline: "Done offline by the jobber",
};

const STATE_STYLE: Record<StepState, string> = {
  done: "border-neutral-950 bg-neutral-950 text-white",
  current: "border-neutral-950 bg-white text-neutral-950 ring-2 ring-neutral-950 ring-offset-2",
  upcoming: "border-neutral-300 bg-white text-neutral-500",
  rework: "border-dashed border-neutral-950 bg-neutral-200 text-neutral-950",
  offline: "border-dashed border-neutral-300 bg-neutral-50 text-neutral-500",
};

type Props = {
  states?: Partial<Record<WorkflowStepKey, StepState>>;
  summaries?: Partial<Record<WorkflowStepKey, string>>;
  showReworkLoop?: boolean;
  title?: string;
  description?: string;
};

export default function WorkflowTracker({ states, summaries, showReworkLoop = true, title = "Phase 1 workflow", description }: Props) {
  return (
    <section className="border border-neutral-300 bg-white p-5" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
        </div>
        {states && (
          <ul className="flex flex-wrap gap-3 text-[11px] text-neutral-500">
            {(["done", "current", "rework"] as const).map((state) => (
              <li key={state} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 border ${STATE_STYLE[state]}`} aria-hidden />
                {STATE_LABEL[state]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ol className="mt-5 flex items-stretch gap-0 overflow-x-auto pb-2 pt-6">
        {PHASE1_WORKFLOW.map((step, index) => {
          const state: StepState | undefined = states?.[step.key];
          const tone = state ? STATE_STYLE[state] : step.offline ? STATE_STYLE.offline : "border-neutral-300 bg-neutral-50 text-neutral-900";
          const body = (
            <>
              <span className="text-[11px] font-semibold uppercase tracking-wide">{index + 1}. {step.label}</span>
              {summaries?.[step.key] && <span className={`mt-1.5 block text-[11px] ${state === "done" ? "text-neutral-300" : "text-neutral-500"}`}>{summaries[step.key]}</span>}
              {state && <span className="sr-only"> — {STATE_LABEL[state]}</span>}
            </>
          );
          const box = `relative flex min-h-16 w-full flex-col justify-center border px-2.5 py-2.5 text-left ${tone}`;
          return (
            <li key={step.key} className="flex min-w-[5.75rem] flex-1 items-stretch">
              {step.href ? (
                <Link href={step.href} className={`${box} hover:opacity-90`} aria-current={state === "current" ? "step" : undefined}>
                  {showReworkLoop && step.key === PP_REWORK_STEP && <ReworkLoop active={state === "rework"} />}
                  {body}
                </Link>
              ) : (
                <div className={box}>{body}</div>
              )}
              {index < PHASE1_WORKFLOW.length - 1 && <span className="self-center px-1 text-neutral-400" aria-hidden>→</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ReworkLoop({ active }: { active: boolean }) {
  return (
    <span className="pointer-events-none absolute -top-6 left-1/2 flex -translate-x-1/2 flex-col items-center" aria-hidden>
      <span className={`whitespace-nowrap border border-dashed px-2 py-0.5 text-[10px] font-medium ${active ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-400 bg-white text-neutral-600"}`}>{PP_REWORK_LABEL}</span>
      <span className="h-2 border-l border-dashed border-neutral-400" />
    </span>
  );
}
