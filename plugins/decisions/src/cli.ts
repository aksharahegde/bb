import type { BbPluginApi, PluginCliContext, PluginCliResult } from "@get-bb/plugin-sdk";
import { DecisionStore } from "./store.js";
import { DECISION_STATUSES, isDecisionStatus, type DecisionStatus } from "./types.js";

class CliError extends Error {}

const USAGE = `Usage: bb decisions <command> [options]

Commands:
  list [--status <status>] [--tag <tag>] [--search <query>] [--json]
  read <id> [--json]
  create --title <title> --context <text> --choice <text> [--trade-off <text>]... [--tag <tag>]... [--status <status>] [--json]
  update-status <id> --status <status> [--superseded-by <id>] [--json]`;

function jsonOutput(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readStatusFlag(value: string | undefined): DecisionStatus | undefined {
  if (value === undefined) return undefined;
  if (!isDecisionStatus(value)) {
    throw new CliError(
      `status must be one of: ${DECISION_STATUSES.join(", ")}`,
    );
  }
  return value;
}

function parseArgs(argv: string[]): {
  positionals: string[];
  options: Map<string, string[]>;
  flags: Set<string>;
} {
  const positionals: string[] = [];
  const options = new Map<string, string[]>();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags.add(key);
      continue;
    }
    const existing = options.get(key) ?? [];
    existing.push(next);
    options.set(key, existing);
    index += 1;
  }
  return { positionals, options, flags };
}

function option(
  options: Map<string, string[]>,
  key: string,
): string | undefined {
  return options.get(key)?.at(-1);
}

function repeatedOption(
  options: Map<string, string[]>,
  key: string,
): string[] {
  return options.get(key) ?? [];
}

export function registerDecisionsCli(
  bb: BbPluginApi,
  store: DecisionStore,
): void {
  bb.cli.register({
    name: "decisions",
    summary: "Manage project architectural decision records (ADRs)",
    commands: [
      {
        name: "list",
        summary: "List ADRs for the current project",
        usage: "bb decisions list [--status <status>] [--tag <tag>] [--search <query>] [--json]",
      },
      {
        name: "read",
        summary: "Read one ADR",
        usage: "bb decisions read <id> [--json]",
      },
      {
        name: "create",
        summary: "Create a new ADR",
        usage:
          "bb decisions create --title <title> --context <text> --choice <text> [--trade-off <text>]... [--tag <tag>]... [--status <status>] [--json]",
      },
      {
        name: "update-status",
        summary: "Update an ADR status",
        usage:
          "bb decisions update-status <id> --status <status> [--superseded-by <id>] [--json]",
      },
    ],
    async run(argv, ctx): Promise<PluginCliResult> {
      const [command, ...rest] = argv;
      if (command === undefined || command === "help" || command === "--help") {
        return { exitCode: 0, stdout: USAGE };
      }
      if (!ctx.projectId) {
        return {
          exitCode: 1,
          stderr: "bb decisions requires a project context. Run from a BB thread or pass --project.",
        };
      }
      try {
        const args = parseArgs(rest);
        const wantsJson = args.flags.has("json");
        if (command === "list") {
          const decisions = await store.listDecisions(ctx.projectId, {
            status: readStatusFlag(option(args.options, "status")),
            tag: option(args.options, "tag"),
            query: option(args.options, "search"),
          });
          return {
            exitCode: 0,
            stdout: wantsJson
              ? jsonOutput({ decisions })
              : decisions
                  .map(
                    (decision) =>
                      `${decision.id}\t${decision.status}\t${decision.title}`,
                  )
                  .join("\n") || "No decisions recorded.",
          };
        }
        if (command === "read") {
          const id = args.positionals[0];
          if (!id) throw new CliError("read requires an ADR id");
          const decision = await store.readDecision(ctx.projectId, id);
          return {
            exitCode: 0,
            stdout: wantsJson ? jsonOutput({ decision }) : decision.raw,
          };
        }
        if (command === "create") {
          const title = option(args.options, "title");
          const context = option(args.options, "context");
          const choice = option(args.options, "choice");
          if (!title || !context || !choice) {
            throw new CliError("create requires --title, --context, and --choice");
          }
          const decision = await store.createDecision(
            ctx.projectId,
            {
              title,
              context,
              choice,
              trade_offs: repeatedOption(args.options, "trade-off"),
              tags: repeatedOption(args.options, "tag"),
              status: readStatusFlag(option(args.options, "status")),
            },
            resolveAuthors(ctx),
          );
          return {
            exitCode: 0,
            stdout: wantsJson
              ? jsonOutput({ decision })
              : `Created ${decision.id}: ${decision.title}`,
          };
        }
        if (command === "update-status") {
          const id = args.positionals[0];
          const status = readStatusFlag(option(args.options, "status"));
          if (!id || !status) {
            throw new CliError("update-status requires <id> and --status");
          }
          const decision = await store.updateDecisionStatus(
            ctx.projectId,
            id,
            status,
            option(args.options, "superseded-by") ?? null,
          );
          return {
            exitCode: 0,
            stdout: wantsJson
              ? jsonOutput({ decision })
              : `Updated ${decision.id} to ${decision.status}`,
          };
        }
        return { exitCode: 1, stderr: `Unknown command: ${command}\n\n${USAGE}` };
      } catch (error) {
        const message =
          error instanceof CliError || error instanceof Error
            ? error.message
            : String(error);
        return { exitCode: 1, stderr: message };
      }
    },
  });
}

function resolveAuthors(ctx: PluginCliContext): string[] {
  return ctx.threadId ? ["user", "bb-agent"] : ["user"];
}
