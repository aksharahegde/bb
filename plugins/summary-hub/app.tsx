import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Markdown,
  definePluginApp,
  useBbContext,
  useRealtime,
  useRpc,
  type PluginNavPanelProps,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { Badge } from "@bb/shared-ui/badge";
import { Button } from "@bb/shared-ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bb/shared-ui/select";
import { cn } from "@bb/shared-ui/lib/utils";
import { REALTIME_CHANNEL, summaryHubRpcContract } from "./contract.js";
import {
  formatDailyDateKey,
  formatWeeklyDateKey,
  resolveDateKey,
  shiftDateKey,
} from "./src/dates.js";
import type { SummaryPeriod, SummaryRecord, SummaryScope } from "./src/types.js";

interface PanelProject {
  id: string;
  name: string;
  kind: "personal" | "standard";
  hasSource: boolean;
}

function pickDefaultProject(
  projects: PanelProject[],
  preferredProjectId: string | null,
): PanelProject | null {
  const withSource = projects.filter((project) => project.hasSource);
  if (withSource.length === 0) return null;
  if (preferredProjectId) {
    const preferred = withSource.find(
      (project) => project.id === preferredProjectId,
    );
    if (preferred) return preferred;
  }
  const personal = withSource.find((project) => project.kind === "personal");
  return personal ?? withSource[0] ?? null;
}

function statusBadgeClass(status: "active" | "idle" | "blocked"): string {
  switch (status) {
    case "active":
      return "bg-success/15 text-success";
    case "blocked":
      return "bg-destructive/15 text-destructive";
    case "idle":
      return "bg-muted text-muted-foreground";
  }
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
      {label} <span className="ml-1 font-semibold tabular-nums">{value}</span>
    </Badge>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">None recorded.</p>
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
        {items.map((item) => (
          <li key={item}>
            <Markdown content={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SummaryHubPanel(_props: PluginNavPanelProps) {
  const rpc = useRpc<typeof summaryHubRpcContract>();
  const { projectId: routeProjectId } = useBbContext();
  const [projects, setProjects] = useState<PanelProject[]>([]);
  const [project, setProject] = useState<PanelProject | null>(null);
  const [scope, setScope] = useState<SummaryScope>("project");
  const [period, setPeriod] = useState<SummaryPeriod>("daily");
  const [dateKey, setDateKey] = useState(() => formatDailyDateKey(new Date()));
  const [summary, setSummary] = useState<SummaryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadProjects = useCallback(async () => {
    const { projects: nextProjects } = await rpc.call("listProjects", null);
    setProjects(nextProjects);
    setProject((current) =>
      current && nextProjects.some((entry) => entry.id === current.id)
        ? current
        : pickDefaultProject(nextProjects, routeProjectId),
    );
  }, [rpc, routeProjectId]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { summary: nextSummary } = await rpc.call("getSummary", {
        scope,
        period,
        dateKey,
        ...(scope === "project" && project ? { projectId: project.id } : {}),
      });
      setSummary(nextSummary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [rpc, scope, period, dateKey, project]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (scope === "project" && project) {
      void rpc
        .call("ensureTodaySummary", { projectId: project.id })
        .then(() => loadSummary())
        .catch(() => loadSummary());
      return;
    }
    void loadSummary();
  }, [scope, project, loadSummary, rpc]);

  useEffect(() => {
    setDateKey(resolveDateKey(period));
  }, [period]);

  useRealtime(REALTIME_CHANNEL, () => {
    void loadSummary();
  });

  const titleLabel = useMemo(() => {
    if (scope === "global") return "Global Workspace";
    return project ? `Current Project: ${project.name}` : "Current Project";
  }, [scope, project]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { summary: generated } = await rpc.call("generateSummary", {
        scope,
        period,
        targetDate: dateKey,
        ...(scope === "project" && project ? { projectId: project.id } : {}),
      });
      setSummary(generated);
      toast.success("Summary generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyBrief = async () => {
    if (!summary) {
      toast.error("No summary to copy");
      return;
    }
    try {
      const { content } = await rpc.call("exportSummary", {
        summaryId: summary.id,
        format: "slack",
        scope,
        period,
        dateKey,
        ...(scope === "project" && project ? { projectId: project.id } : {}),
      });
      await navigator.clipboard.writeText(content);
      toast.success("Standup brief copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-4 md:px-5">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border p-1">
              <Button
                type="button"
                size="sm"
                variant={scope === "global" ? "default" : "ghost"}
                data-testid="summary-scope-global"
                onClick={() => setScope("global")}
              >
                Global Workspace
              </Button>
              <Button
                type="button"
                size="sm"
                variant={scope === "project" ? "default" : "ghost"}
                data-testid="summary-scope-project"
                onClick={() => setScope("project")}
              >
                {titleLabel}
              </Button>
            </div>
            <div className="inline-flex rounded-lg border border-border p-1">
              <Button
                type="button"
                size="sm"
                variant={period === "daily" ? "default" : "ghost"}
                data-testid="summary-period-daily"
                onClick={() => setPeriod("daily")}
              >
                Daily View
              </Button>
              <Button
                type="button"
                size="sm"
                variant={period === "weekly" ? "default" : "ghost"}
                data-testid="summary-period-weekly"
                onClick={() => setPeriod("weekly")}
              >
                Weekly View
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="summary-date-prev"
              onClick={() => setDateKey((current) => shiftDateKey(period, current, -1))}
            >
              Prev
            </Button>
            <Select value={dateKey} onValueChange={setDateKey}>
              <SelectTrigger className="w-[180px]" data-testid="summary-date-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={dateKey}>{dateKey}</SelectItem>
                <SelectItem value={formatDailyDateKey(new Date())}>
                  Today ({formatDailyDateKey(new Date())})
                </SelectItem>
                <SelectItem value={formatWeeklyDateKey(new Date())}>
                  This week ({formatWeeklyDateKey(new Date())})
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="summary-date-next"
              onClick={() => setDateKey((current) => shiftDateKey(period, current, 1))}
            >
              Next
            </Button>
            {scope === "project" ? (
              <Select
                value={project?.id ?? ""}
                onValueChange={(value) => {
                  const next = projects.find((entry) => entry.id === value) ?? null;
                  setProject(next);
                }}
              >
                <SelectTrigger className="w-[220px]" data-testid="summary-project-select">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter((entry) => entry.hasSource)
                    .map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : null}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                data-testid="summary-generate"
                disabled={generating || (scope === "project" && !project)}
                onClick={() => void handleGenerate()}
              >
                {generating ? "Generating…" : "Generate / Refresh Summary"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="summary-copy-brief"
                disabled={!summary}
                onClick={() => void handleCopyBrief()}
              >
                Copy Standup Brief
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading summary…</div>
          ) : summary === null ? (
            <div
              className="rounded-xl border border-dashed border-border bg-card p-8 text-center"
              data-testid="summary-empty-state"
            >
              <p className="text-sm text-muted-foreground">
                No summary generated for {dateKey}. Click &apos;Generate Summary&apos;
                to compile git commits, agent threads, and tasks for this period.
              </p>
            </div>
          ) : (
            <>
              <section
                className="space-y-4 rounded-xl border border-border bg-card p-5"
                data-testid="summary-hero"
              >
                <div className="flex flex-wrap gap-2">
                  <MetricPill
                    label="Commits"
                    value={summary.metrics.commits_count}
                  />
                  <MetricPill
                    label="Threads"
                    value={summary.metrics.agent_threads_count}
                  />
                  <MetricPill
                    label="Tasks Completed"
                    value={summary.metrics.tasks_completed_count}
                  />
                  <MetricPill
                    label="ADRs Logged"
                    value={summary.metrics.decisions_logged_count}
                  />
                </div>
                <p className="text-lg font-medium leading-relaxed text-foreground">
                  {summary.executive_summary}
                </p>
              </section>

              <div className="grid gap-6 md:grid-cols-2">
                <Section
                  title="Key Accomplishments & Deliverables"
                  items={summary.key_outcomes}
                />
                <Section
                  title="Architectural & Structural Decisions"
                  items={summary.architectural_changes}
                />
                <Section
                  title="Agent Work Log"
                  items={summary.agent_activity_highlights}
                />
                <Section
                  title="Open Risks & Carry-Over Debt"
                  items={summary.pending_blockers}
                />
              </div>

              {scope === "global" && summary.project_breakdown ? (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Project Drill-Down
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {summary.project_breakdown.map((entry) => (
                      <div
                        key={entry.project_id}
                        data-testid={`summary-project-row-${entry.project_id}`}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-foreground">
                            {entry.project_name}
                          </div>
                          <Badge
                            className={cn(
                              "capitalize",
                              statusBadgeClass(entry.status),
                            )}
                          >
                            {entry.status}
                          </Badge>
                        </div>
                        {entry.summary_id ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {entry.summary_id}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "summary-hub",
    title: "Summary Hub",
    icon: "LayoutDashboard",
    path: "summary-hub",
    sidebarPlacement: "primary",
    component: SummaryHubPanel,
  });
});
