export default function PageLoading({ title = "Loading workspace…" }: { title?: string }) {
  return <div role="status" aria-live="polite" className="space-y-5">
    <p className="text-sm font-medium text-neutral-600">{title}</p>
    <div aria-hidden="true" className="animate-pulse space-y-4 border border-neutral-300 bg-white p-6 motion-reduce:animate-none">
      <div className="h-5 w-48 bg-neutral-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }, (_, i) => <div key={i} className="h-20 border border-neutral-200 bg-neutral-50" />)}</div>
    </div>
  </div>;
}
