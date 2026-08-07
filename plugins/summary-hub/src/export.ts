import type { SummaryRecord } from "./types.js";

export type ExportFormat = "markdown" | "slack";

function formatMetrics(summary: SummaryRecord): string {
  const { metrics } = summary;
  return [
    `Commits: ${metrics.commits_count}`,
    `Threads: ${metrics.agent_threads_count}`,
    `Tasks completed: ${metrics.tasks_completed_count}`,
    `ADRs logged: ${metrics.decisions_logged_count}`,
    `Deferred items: ${metrics.deferred_items_count}`,
  ].join(" · ");
}

function bulletSection(title: string, items: string[]): string {
  if (items.length === 0) return `### ${title}\n- None`;
  return [`### ${title}`, ...items.map((item) => `- ${item}`)].join("\n");
}

export function exportSummary(
  summary: SummaryRecord,
  format: ExportFormat,
): string {
  const header =
    format === "slack"
      ? `*${summary.id}* (${summary.period}, ${summary.date_key})`
      : `# ${summary.id} (${summary.period}, ${summary.date_key})`;
  const scopeLine =
    summary.scope === "global"
      ? "Scope: Global workspace"
      : `Scope: Project ${summary.project_name ?? "unknown"}`;
  const sections = [
    header,
    scopeLine,
    formatMetrics(summary),
    "",
    summary.executive_summary,
    "",
    bulletSection("Key accomplishments", summary.key_outcomes),
    "",
    bulletSection("Architectural changes", summary.architectural_changes),
    "",
    bulletSection("Agent activity", summary.agent_activity_highlights),
    "",
    bulletSection("Open risks", summary.pending_blockers),
  ];
  if (summary.project_breakdown && summary.project_breakdown.length > 0) {
    sections.push(
      "",
      "### Project breakdown",
      ...summary.project_breakdown.map(
        (entry) =>
          `- ${entry.project_name} [${entry.status}]${
            entry.summary_id ? ` (${entry.summary_id})` : ""
          }`,
      ),
    );
  }
  return sections.join("\n");
}
