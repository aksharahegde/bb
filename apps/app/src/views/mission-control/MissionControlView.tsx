import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import type { ThreadListEntry } from "@bb/domain";
import { Badge } from "@bb/shared-ui/badge";
import { Button } from "@bb/shared-ui/button";
import {
  getThreadListIndicatorLabel,
  isBusyThread,
  resolveThreadListIndicator,
} from "@/lib/thread-activity";
import {
  getThreadRoutePath,
  MISSION_CONTROL_ROUTE_PATH,
} from "@/lib/route-paths";
import { sdk } from "@/lib/sdk";

const graphifyStatusSchema = z
  .object({
    exists: z.boolean(),
    nodeCount: z.number(),
    edgeCount: z.number(),
  })
  .passthrough();

const checksSummarySchema = z
  .object({
    success: z.number(),
    failure: z.number(),
    pending: z.number(),
    neutral: z.number(),
    failingNames: z.array(z.string()),
  })
  .strict();

const githubPrItemSchema = z
  .object({
    repo: z.string(),
    number: z.number(),
    kind: z.literal("pr"),
    title: z.string(),
    state: z.string(),
    checksSummary: checksSummarySchema.nullable(),
  })
  .passthrough();

const githubListItemsSchema = z
  .object({
    items: z.array(githubPrItemSchema),
  })
  .strict();

const githubThreadLinkSchema = z
  .object({
    kind: z.enum(["issue", "pr"]),
    repo: z.string(),
    number: z.number(),
    threadId: z.string(),
  })
  .passthrough();

const githubListLinksSchema = z
  .object({
    links: z.record(z.string(), z.array(githubThreadLinkSchema)),
  })
  .strict();

function fleetBadges(thread: ThreadListEntry): string[] {
  const badges: string[] = [];
  if (thread.hasPendingInteraction) badges.push("pending input");
  if (thread.status === "error") badges.push("error");
  if (isBusyThread(thread)) badges.push("busy");
  if (thread.activity.activeWorkflowCount > 0) badges.push("workflow");
  if (thread.activity.activeBackgroundAgentCount > 0) {
    badges.push("bg agent");
  }
  if (thread.parentThreadId) badges.push("child");
  return badges;
}

function ciBadgeForSummary(
  summary: z.infer<typeof checksSummarySchema> | null | undefined,
): string | null {
  if (!summary) return null;
  if (summary.failure > 0) return `ci fail ${summary.failure}`;
  if (summary.pending > 0) return `ci pending ${summary.pending}`;
  if (summary.success > 0) return `ci ok ${summary.success}`;
  return null;
}

function itemKey(repo: string, number: number): string {
  return `${repo}#${number}`;
}

export function MissionControlView() {
  const fleetQuery = useQuery({
    queryKey: ["mission-control", "fleet"],
    queryFn: ({ signal }) =>
      sdk.threads.list({
        archived: false,
        includeHidden: true,
        limit: 300,
        signal,
      }),
    refetchInterval: 5_000,
  });

  const threads = fleetQuery.data ?? [];
  const projectIds = useMemo(() => {
    return [...new Set(threads.map((thread) => thread.projectId))];
  }, [threads]);

  const graphifyQuery = useQuery({
    queryKey: ["mission-control", "graphify", projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const results: Array<{
        projectId: string;
        exists: boolean;
        nodeCount: number;
      }> = [];
      for (const projectId of projectIds.slice(0, 8)) {
        try {
          const status = await sdk.plugins.callRpc({
            pluginId: "graphify",
            method: "status",
            input: { projectId },
            outputSchema: graphifyStatusSchema,
          });
          results.push({
            projectId,
            exists: status.exists,
            nodeCount: status.nodeCount,
          });
        } catch {
          // Plugin missing or project has no source — skip.
        }
      }
      return results;
    },
    refetchInterval: 30_000,
    retry: false,
  });

  const ciQuery = useQuery({
    queryKey: ["mission-control", "ci"],
    queryFn: async () => {
      const [itemsResult, linksResult] = await Promise.all([
        sdk.plugins.callRpc({
          pluginId: "github",
          method: "listItems",
          input: { kind: "pr", state: "open" },
          outputSchema: githubListItemsSchema,
        }),
        sdk.plugins.callRpc({
          pluginId: "github",
          method: "listLinks",
          input: null,
          outputSchema: githubListLinksSchema,
        }),
      ]);
      const byKey = new Map(
        itemsResult.items.map((item) => [
          itemKey(item.repo, item.number),
          item,
        ]),
      );
      const threadCi = new Map<string, z.infer<typeof checksSummarySchema>>();
      for (const links of Object.values(linksResult.links)) {
        for (const link of links) {
          if (link.kind !== "pr") continue;
          const item = byKey.get(itemKey(link.repo, link.number));
          if (item?.checksSummary) {
            threadCi.set(link.threadId, item.checksSummary);
          }
        }
      }
      let failure = 0;
      let pending = 0;
      let success = 0;
      for (const item of itemsResult.items) {
        const summary = item.checksSummary;
        if (!summary) continue;
        failure += summary.failure;
        pending += summary.pending;
        success += summary.success;
      }
      return {
        openPrs: itemsResult.items.length,
        failure,
        pending,
        success,
        threadCi,
      };
    },
    refetchInterval: 30_000,
    retry: false,
  });

  const summary = useMemo(() => {
    let pending = 0;
    let busy = 0;
    let failed = 0;
    for (const thread of threads) {
      if (thread.hasPendingInteraction) pending += 1;
      if (thread.status === "error") failed += 1;
      if (isBusyThread(thread)) busy += 1;
    }
    return { total: threads.length, pending, busy, failed };
  }, [threads]);

  const sorted = useMemo(() => {
    return [...threads].sort((a, b) => {
      const score = (thread: ThreadListEntry) => {
        let value = 0;
        if (thread.hasPendingInteraction) value += 100;
        if (thread.status === "error") value += 80;
        if (isBusyThread(thread)) value += 40;
        if (thread.parentThreadId === null) value += 10;
        return value;
      };
      return score(b) - score(a);
    });
  }, [threads]);

  const graphifyBadge = useMemo(() => {
    const statuses = graphifyQuery.data;
    if (!statuses || statuses.length === 0) return null;
    const missing = statuses.filter((status) => !status.exists).length;
    const indexed = statuses.filter((status) => status.exists).length;
    if (missing > 0) {
      return `graphify ${missing} missing`;
    }
    if (indexed > 0) {
      return `graphify ok (${indexed})`;
    }
    return null;
  }, [graphifyQuery.data]);

  const ciFleetBadge = useMemo(() => {
    const data = ciQuery.data;
    if (!data) return null;
    if (data.failure > 0) return `ci fail ${data.failure}`;
    if (data.pending > 0) return `ci pending ${data.pending}`;
    if (data.openPrs > 0) return `ci ok (${data.openPrs} PRs)`;
    return null;
  }, [ciQuery.data]);

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-foreground">
            Mission Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Fleet view of active agents and threads. CLI:{" "}
            <code className="text-xs">bb mission list</code> /{" "}
            <code className="text-xs">bb mission status</code>.
          </p>
        </div>
        <div data-testid="mission-fleet-refresh">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void fleetQuery.refetch();
              void graphifyQuery.refetch();
              void ciQuery.refetch();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="mission-fleet-summary">
        <Badge variant="outline">{summary.total} threads</Badge>
        <Badge variant="outline">{summary.busy} busy</Badge>
        <Badge variant="outline">{summary.pending} pending input</Badge>
        <Badge variant="outline">{summary.failed} failed</Badge>
        {graphifyBadge ? (
          <Badge variant="outline" data-testid="mission-graphify-badge">
            {graphifyBadge}
          </Badge>
        ) : null}
        {ciFleetBadge ? (
          <Badge variant="outline" data-testid="mission-ci-badge">
            {ciFleetBadge}
          </Badge>
        ) : null}
      </div>

      {fleetQuery.isError ? (
        <p className="text-sm text-destructive">
          {fleetQuery.error instanceof Error
            ? fleetQuery.error.message
            : "Failed to load fleet"}
        </p>
      ) : null}

      <div
        className="flex flex-1 flex-col gap-2 overflow-auto"
        data-testid="mission-fleet-list"
      >
        {sorted.length === 0 && !fleetQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">No active threads.</p>
        ) : null}
        {sorted.map((thread) => {
          const indicator = resolveThreadListIndicator({
            hasPendingInteraction: thread.hasPendingInteraction,
            hasUnsubmittedDraft: false,
            hasUnreadError: false,
            hasUnreadSuccess: false,
            isBackgroundAgentActive:
              thread.activity.activeBackgroundAgentCount > 0,
            isBackgroundCommandActive:
              thread.activity.activeBackgroundCommandCount > 0,
            isGoalActive: thread.activity.activeGoalCount > 0,
            isPlanModeActive: thread.activity.activePlanModeCount > 0,
            isRuntimeActive: isBusyThread(thread),
            isWorkflowActive: thread.activity.activeWorkflowCount > 0,
          });
          const indicatorLabel = getThreadListIndicatorLabel(indicator);
          const href = getThreadRoutePath({
            projectId: thread.projectId,
            threadId: thread.id,
          });
          const ciBadge = ciBadgeForSummary(ciQuery.data?.threadCi.get(thread.id));
          return (
            <Link
              key={thread.id}
              to={href}
              data-testid={`mission-row-${thread.id}`}
              className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    {thread.title ?? "(untitled)"}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {thread.id}
                    {thread.parentThreadId
                      ? ` · child of ${thread.parentThreadId}`
                      : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {indicatorLabel ? (
                    <Badge variant="outline">{indicatorLabel}</Badge>
                  ) : null}
                  {ciBadge ? <Badge variant="outline">{ciBadge}</Badge> : null}
                  {fleetBadges(thread).map((badge) => (
                    <Badge key={badge} variant="outline">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Route: <code>{MISSION_CONTROL_ROUTE_PATH}</code>. Use Graphify via{" "}
        <code>bb graphify status</code>; CI via <code>bb github checks</code>.
      </p>
    </div>
  );
}
