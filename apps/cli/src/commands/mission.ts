import { Command } from "commander";
import type { ThreadListEntry } from "@bb/domain";
import { action } from "../action.js";
import { createCliBbSdk } from "../client.js";
import { outputJson } from "./helpers.js";

interface MissionCommandOptions {
  json?: boolean;
  project?: string;
  includeHidden?: boolean;
}

type ResolveServerUrl = () => string;

function fleetLabel(thread: ThreadListEntry): string {
  const parts: string[] = [];
  if (thread.hasPendingInteraction) parts.push("pending-input");
  if (thread.runtime.displayStatus !== "idle") {
    parts.push(thread.runtime.displayStatus);
  }
  if (thread.activity.activeWorkflowCount > 0) parts.push("workflow");
  if (thread.activity.activeBackgroundAgentCount > 0) {
    parts.push("bg-agent");
  }
  if (thread.activity.activeBackgroundCommandCount > 0) {
    parts.push("bg-cmd");
  }
  return parts.length > 0 ? parts.join(",") : thread.status;
}

export function registerMissionCommand(
  program: Command,
  getUrl: ResolveServerUrl,
): void {
  const mission = program
    .command("mission")
    .description("Mission Control — fleet view of active agents and threads");

  mission
    .command("list")
    .description("List threads in the fleet (non-archived by default)")
    .option("--json", "Print machine-readable JSON output")
    .option("--project <id>", "Filter to a project id")
    .option("--include-hidden", "Include hidden worker threads")
    .action(
      action(async (opts: MissionCommandOptions) => {
        const sdk = createCliBbSdk(getUrl());
        const threads = await sdk.threads.list({
          archived: false,
          includeHidden: opts.includeHidden === true,
          projectId: opts.project,
          limit: 200,
        });
        const rows = threads.map((thread) => ({
          id: thread.id,
          projectId: thread.projectId,
          title: thread.title,
          status: thread.status,
          parentThreadId: thread.parentThreadId,
          hasPendingInteraction: thread.hasPendingInteraction,
          runtime: thread.runtime.displayStatus,
          activity: thread.activity,
          fleet: fleetLabel(thread),
        }));
        if (opts.json) {
          outputJson(opts, { threads: rows, total: rows.length });
          return;
        }
        if (rows.length === 0) {
          process.stdout.write("No active threads.\n");
          return;
        }
        for (const row of rows) {
          const title = row.title ?? "(untitled)";
          const parent = row.parentThreadId
            ? ` parent=${row.parentThreadId}`
            : "";
          process.stdout.write(
            `${row.id}\t[${row.fleet}]\t${title}${parent}\n`,
          );
        }
      }),
    );

  mission
    .command("status")
    .description("Summarize fleet attention (busy, pending, failed)")
    .option("--json", "Print machine-readable JSON output")
    .option("--project <id>", "Filter to a project id")
    .action(
      action(async (opts: MissionCommandOptions) => {
        const sdk = createCliBbSdk(getUrl());
        const threads = await sdk.threads.list({
          archived: false,
          includeHidden: true,
          projectId: opts.project,
          limit: 500,
        });
        let pending = 0;
        let busy = 0;
        let failed = 0;
        let idle = 0;
        for (const thread of threads) {
          if (thread.hasPendingInteraction) pending += 1;
          if (thread.status === "error") failed += 1;
          else if (
            thread.runtime.displayStatus !== "idle" ||
            thread.activity.activeWorkflowCount > 0 ||
            thread.activity.activeBackgroundAgentCount > 0 ||
            thread.activity.activeBackgroundCommandCount > 0
          ) {
            busy += 1;
          } else {
            idle += 1;
          }
        }
        const summary = {
          total: threads.length,
          pending,
          busy,
          failed,
          idle,
        };
        if (opts.json) {
          outputJson(opts, summary);
          return;
        }
        process.stdout.write(
          `Fleet: ${summary.total} threads · ${summary.busy} busy · ${summary.pending} pending input · ${summary.failed} failed · ${summary.idle} idle\n`,
        );
      }),
    );
}
