import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { collectDecisions } from "./collectors/decisions.js";
import { collectGitCommits } from "./collectors/git.js";
import { collectTasks } from "./collectors/tasks.js";
import { collectThreads } from "./collectors/threads.js";
import { buildSummaryId, resolveDateKey, windowForPeriod } from "./dates.js";
import { resolveProjectSource } from "./project-source.js";
import { SummaryStore } from "./store.js";
import { synthesizeSummary } from "./synthesis.js";
import type {
  SourceBundle,
  SummaryMetrics,
  SummaryPeriod,
  SummaryRecord,
  SummaryScope,
} from "./types.js";

function buildMetrics(bundle: SourceBundle): SummaryMetrics {
  return {
    agent_threads_count: bundle.threads.length,
    commits_count: bundle.commits.length,
    tasks_completed_count: bundle.tasksCompleted.length,
    decisions_logged_count: bundle.decisions.length,
    deferred_items_count: bundle.tasksDeferred.length,
  };
}

function buildRawRefs(bundle: SourceBundle): string[] {
  return [
    ...bundle.commits.map((commit) => `commit:${commit.hash}`),
    ...bundle.threads.map((thread) => `thread:${thread.id}`),
    ...bundle.tasksCompleted.map((task) => `task:${task.id}`),
    ...bundle.decisions.map((decision) => `adr:${decision.id}`),
  ];
}

async function collectBundle(
  bb: BbPluginApi,
  projectId: string,
  period: SummaryPeriod,
  dateKey: string,
): Promise<SourceBundle> {
  const { start, end } = windowForPeriod(period, dateKey);
  const source = await resolveProjectSource(bb, projectId);
  const [commits, taskData, decisions, threads] = await Promise.all([
    collectGitCommits(bb, source, start, end),
    collectTasks(bb, projectId, start, end),
    collectDecisions(bb, projectId, start, end),
    collectThreads(bb, projectId, start, end),
  ]);
  return {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    commits,
    tasksCompleted: taskData.completed,
    tasksDeferred: taskData.deferred,
    decisions,
    threads,
  };
}

function projectStatus(bundle: SourceBundle): "active" | "idle" | "blocked" {
  if (bundle.tasksDeferred.some((task) => task.priority === "critical")) {
    return "blocked";
  }
  if (
    bundle.commits.length > 0 ||
    bundle.threads.length > 0 ||
    bundle.tasksCompleted.length > 0
  ) {
    return "active";
  }
  return "idle";
}

export class SummaryGenerator {
  constructor(
    private readonly bb: BbPluginApi,
    private readonly store: SummaryStore,
  ) {}

  async generateProjectSummary(
    projectId: string,
    period: SummaryPeriod,
    targetDate?: string,
  ): Promise<SummaryRecord> {
    const dateKey = resolveDateKey(period, targetDate);
    const project = await this.bb.sdk.projects.get({ projectId });
    const bundle = await collectBundle(this.bb, projectId, period, dateKey);
    const synthesis = await synthesizeSummary(this.bb, projectId, bundle);
    const summary: SummaryRecord = {
      id: buildSummaryId(period, dateKey),
      scope: "project",
      project_name: project.name,
      period,
      date_key: dateKey,
      created_at: new Date().toISOString(),
      metrics: buildMetrics(bundle),
      executive_summary: synthesis.executive_summary,
      key_outcomes: synthesis.key_outcomes,
      architectural_changes: synthesis.architectural_changes,
      agent_activity_highlights: synthesis.agent_activity_highlights,
      pending_blockers: synthesis.pending_blockers,
      raw_source_refs: buildRawRefs(bundle),
    };
    await this.store.saveProjectSummary(projectId, period, summary);
    return summary;
  }

  async generateGlobalSummary(
    period: SummaryPeriod,
    targetDate?: string,
  ): Promise<SummaryRecord> {
    const dateKey = resolveDateKey(period, targetDate);
    const projects = await this.bb.sdk.projects.list({ includePersonal: true });
    const projectSummaries: SummaryRecord[] = [];
    const breakdown: NonNullable<SummaryRecord["project_breakdown"]> = [];

    for (const project of projects) {
      if (project.sources.length === 0) continue;
      let summary = await this.store.getProjectSummary(project.id, period, dateKey);
      if (summary === null) {
        try {
          summary = await this.generateProjectSummary(
            project.id,
            period,
            dateKey,
          );
        } catch (error) {
          this.bb.log.warn(
            `skipped project ${project.id} during global synthesis: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          breakdown.push({
            project_id: project.id,
            project_name: project.name,
            status: "idle",
            summary_id: null,
          });
          continue;
        }
      }
      projectSummaries.push(summary);
      const bundle = await collectBundle(this.bb, project.id, period, dateKey);
      breakdown.push({
        project_id: project.id,
        project_name: project.name,
        status: projectStatus(bundle),
        summary_id: summary.id,
      });
    }

    const mergedBundle: SourceBundle = {
      windowStart: windowForPeriod(period, dateKey).start.toISOString(),
      windowEnd: windowForPeriod(period, dateKey).end.toISOString(),
      commits: projectSummaries.flatMap((summary) =>
        summary.raw_source_refs
          .filter((ref) => ref.startsWith("commit:"))
          .map((ref) => ({
            hash: ref.replace("commit:", ""),
            subject: "",
            author: "",
            committedAt: "",
          })),
      ),
      tasksCompleted: [],
      tasksDeferred: [],
      decisions: [],
      threads: projectSummaries.flatMap((summary) =>
        summary.raw_source_refs
          .filter((ref) => ref.startsWith("thread:"))
          .map((ref) => ({
            id: ref.replace("thread:", ""),
            title: null,
            originKind: null,
            originPluginId: null,
            updatedAt: Date.now(),
          })),
      ),
    };

    const anchorProject =
      projects.find((project) => project.sources.length > 0)?.id ?? null;
    const synthesis =
      anchorProject === null
        ? {
            executive_summary:
              projectSummaries.length === 0
                ? "No project activity was recorded for this period."
                : `Workspace roll-up across ${projectSummaries.length} project(s).`,
            key_outcomes: projectSummaries.flatMap(
              (summary) => summary.key_outcomes,
            ),
            architectural_changes: projectSummaries.flatMap(
              (summary) => summary.architectural_changes,
            ),
            agent_activity_highlights: projectSummaries.flatMap(
              (summary) => summary.agent_activity_highlights,
            ),
            pending_blockers: projectSummaries.flatMap(
              (summary) => summary.pending_blockers,
            ),
          }
        : await synthesizeSummary(this.bb, anchorProject, {
            ...mergedBundle,
            tasksCompleted: projectSummaries.flatMap((summary) =>
              summary.key_outcomes.map((outcome) => ({
                id: outcome,
                title: outcome,
                status: "completed",
                priority: "medium",
                completed_at: null,
                resolution_summary: outcome,
              })),
            ),
            tasksDeferred: projectSummaries.flatMap((summary) =>
              summary.pending_blockers.map((blocker) => ({
                id: blocker,
                title: blocker,
                status: "backlog",
                priority: "high",
                completed_at: null,
                resolution_summary: null,
              })),
            ),
            decisions: projectSummaries.flatMap((summary) =>
              summary.architectural_changes.map((change) => ({
                id: change,
                title: change,
                status: "accepted",
                date: new Date().toISOString(),
              })),
            ),
          });

    const metrics = projectSummaries.reduce<SummaryMetrics>(
      (acc, summary) => ({
        agent_threads_count:
          acc.agent_threads_count + summary.metrics.agent_threads_count,
        commits_count: acc.commits_count + summary.metrics.commits_count,
        tasks_completed_count:
          acc.tasks_completed_count + summary.metrics.tasks_completed_count,
        decisions_logged_count:
          acc.decisions_logged_count + summary.metrics.decisions_logged_count,
        deferred_items_count:
          acc.deferred_items_count + summary.metrics.deferred_items_count,
      }),
      {
        agent_threads_count: 0,
        commits_count: 0,
        tasks_completed_count: 0,
        decisions_logged_count: 0,
        deferred_items_count: 0,
      },
    );

    const summary: SummaryRecord = {
      id: buildSummaryId(period, dateKey),
      scope: "global",
      project_name: null,
      period,
      date_key: dateKey,
      created_at: new Date().toISOString(),
      metrics,
      executive_summary: synthesis.executive_summary,
      key_outcomes: synthesis.key_outcomes,
      architectural_changes: synthesis.architectural_changes,
      agent_activity_highlights: synthesis.agent_activity_highlights,
      pending_blockers: synthesis.pending_blockers,
      raw_source_refs: projectSummaries.flatMap(
        (entry) => entry.raw_source_refs,
      ),
      project_breakdown: breakdown,
    };
    await this.store.saveGlobalSummary(period, summary);
    return summary;
  }

  async generate(
    scope: SummaryScope,
    period: SummaryPeriod,
    targetDate?: string,
    projectId?: string,
  ): Promise<SummaryRecord> {
    if (scope === "global") {
      return this.generateGlobalSummary(period, targetDate);
    }
    if (projectId === undefined) {
      throw new Error("projectId is required for project scope generation");
    }
    return this.generateProjectSummary(projectId, period, targetDate);
  }
}
