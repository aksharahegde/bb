export function OfficeSceneSkeleton() {
  return (
    <div
      className="flex h-full min-h-[480px] animate-pulse flex-col gap-3 rounded-lg border border-border bg-card p-4"
      data-testid="roster-office-canvas-loading"
    >
      <div className="h-6 w-40 rounded bg-muted" />
      <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-3">
        <div className="rounded-md bg-muted/60" />
        <div className="rounded-md bg-muted/40" />
        <div className="rounded-md bg-muted/40" />
        <div className="rounded-md bg-muted/60" />
      </div>
    </div>
  );
}
