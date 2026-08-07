import type { BbPluginApi } from "@bb/plugin-sdk";
import type { SourceBundle, SynthesisPayload } from "./types.js";

const SYNTHESIS_PROMPT = `Analyze the attached git commit messages, resolved task items, logged ADRs, and agent thread transcripts. Produce a concise, high-signal summary. Avoid repeating raw commit messages verbatim; instead, group work into logical feature deliverables, architectural choices, and unresolved blockers.

Return ONLY valid JSON with this exact shape:
{
  "executive_summary": "2-3 sentence overview",
  "key_outcomes": ["bullet strings"],
  "architectural_changes": ["ADR ids and summaries"],
  "agent_activity_highlights": ["notable autonomous agent work"],
  "pending_blockers": ["unresolved high-priority backlog items"]
}`;

function normalizeJsonFence(output: string): string {
  const trimmed = output.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  return fenced?.[1]?.trim() ?? trimmed;
}

function fallbackSynthesis(bundle: SourceBundle): SynthesisPayload {
  const commitThemes =
    bundle.commits.length > 0
      ? `Shipped ${bundle.commits.length} commit(s) across the period.`
      : "No commits landed in this window.";
  const taskThemes =
    bundle.tasksCompleted.length > 0
      ? `Closed ${bundle.tasksCompleted.length} backlog task(s).`
      : "No backlog tasks were completed.";
  const decisionThemes =
    bundle.decisions.length > 0
      ? `Logged ${bundle.decisions.length} architectural decision(s).`
      : "No new ADRs were recorded.";
  const threadThemes =
    bundle.threads.length > 0
      ? `${bundle.threads.length} agent thread(s) were active.`
      : "Agent activity was quiet.";

  return {
    executive_summary: `${commitThemes} ${taskThemes} ${decisionThemes} ${threadThemes}`.trim(),
    key_outcomes: bundle.tasksCompleted.map(
      (task) => `${task.id}: ${task.title}`,
    ),
    architectural_changes: bundle.decisions.map(
      (decision) => `${decision.id}: ${decision.title} (${decision.status})`,
    ),
    agent_activity_highlights: bundle.threads
      .filter((thread) => thread.originKind === "plugin" || thread.originPluginId)
      .slice(0, 8)
      .map((thread) => `${thread.id}: ${thread.title ?? "Untitled thread"}`),
    pending_blockers: bundle.tasksDeferred.map(
      (task) => `${task.id} [${task.priority}]: ${task.title}`,
    ),
  };
}

function buildSourcePrompt(bundle: SourceBundle): string {
  const sections = [
    SYNTHESIS_PROMPT,
    "",
    `Window: ${bundle.windowStart} → ${bundle.windowEnd}`,
    "",
    "## Git commits",
    ...(bundle.commits.length > 0
      ? bundle.commits.map(
          (commit) =>
            `- ${commit.hash.slice(0, 8)} ${commit.subject} (${commit.author})`,
        )
      : ["- none"]),
    "",
    "## Completed tasks",
    ...(bundle.tasksCompleted.length > 0
      ? bundle.tasksCompleted.map(
          (task) => `- ${task.id}: ${task.title} — ${task.resolution_summary ?? ""}`,
        )
      : ["- none"]),
    "",
    "## Deferred / high-priority backlog",
    ...(bundle.tasksDeferred.length > 0
      ? bundle.tasksDeferred.map(
          (task) => `- ${task.id} [${task.priority}]: ${task.title}`,
        )
      : ["- none"]),
    "",
    "## Architectural decisions",
    ...(bundle.decisions.length > 0
      ? bundle.decisions.map(
          (decision) => `- ${decision.id}: ${decision.title} (${decision.status})`,
        )
      : ["- none"]),
    "",
    "## Agent threads",
    ...(bundle.threads.length > 0
      ? bundle.threads
          .slice(0, 40)
          .map(
            (thread) =>
              `- ${thread.id}: ${thread.title ?? "Untitled"} [${thread.originKind ?? "user"}]`,
          )
      : ["- none"]),
  ];
  return sections.join("\n");
}

function parseSynthesisOutput(raw: string): SynthesisPayload | null {
  try {
    const parsed = JSON.parse(normalizeJsonFence(raw)) as Partial<SynthesisPayload>;
    if (
      typeof parsed.executive_summary !== "string" ||
      !Array.isArray(parsed.key_outcomes) ||
      !Array.isArray(parsed.architectural_changes) ||
      !Array.isArray(parsed.agent_activity_highlights) ||
      !Array.isArray(parsed.pending_blockers)
    ) {
      return null;
    }
    return {
      executive_summary: parsed.executive_summary.trim(),
      key_outcomes: parsed.key_outcomes.map(String),
      architectural_changes: parsed.architectural_changes.map(String),
      agent_activity_highlights: parsed.agent_activity_highlights.map(String),
      pending_blockers: parsed.pending_blockers.map(String),
    };
  } catch {
    return null;
  }
}

export async function synthesizeSummary(
  bb: BbPluginApi,
  projectId: string,
  bundle: SourceBundle,
): Promise<SynthesisPayload> {
  const prompt = buildSourcePrompt(bundle);
  try {
    const thread = await bb.sdk.threads.spawn({
      projectId,
      environment: { type: "project-default" },
      title: "Summary Hub synthesis",
      prompt,
      visibility: "hidden",
    });
    const waitResult = await bb.sdk.threads.wait({
      threadId: thread.id,
      status: "idle",
      timeoutMs: 8 * 60_000,
      pollIntervalMs: 1_000,
    });
    if (!waitResult.matched) {
      return fallbackSynthesis(bundle);
    }
    const output = await bb.sdk.threads.output({ threadId: thread.id });
    const parsed =
      output.output === null ? null : parseSynthesisOutput(output.output);
    return parsed ?? fallbackSynthesis(bundle);
  } catch (error) {
    bb.log.warn(
      `summary synthesis fell back to deterministic output: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return fallbackSynthesis(bundle);
  }
}
