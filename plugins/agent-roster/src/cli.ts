import type { BbPluginApi, PluginCliContext, PluginCliResult } from "@get-bb/plugin-sdk";
import { extractSplits, layoutFromSplits } from "./layout-editor.js";
import { RosterStore } from "./store.js";
import { DEFAULT_OFFICE_LAYOUT } from "./spatial.js";
import type { AgentStatus } from "./types.js";

function helpText(): string {
  return [
    "Manage roster agents and office layout in .bb/roster/.",
    "",
    "  bb roster list [--status <status>] [--role <role>] [--json] [--project <id>]",
    "  bb roster create --name <name> --role <role> --prompt <text> [--avatar <preset-id>] [--model <id>] [--tools a,b] [--project <id>]",
    "  bb roster update <agent-id> [--name] [--role] [--prompt] [--avatar <preset-id>] [--model] [--tools a,b] [--project <id>]",
    "  bb roster archive <agent-id> [--project <id>]",
    "  bb roster invoke <agent-id> <prompt...> [--project <id>]",
    "  bb roster move <agent-id> --zone <zone-id> [--project <id>]",
    "  bb roster move <agent-id> --x <n> --y <n> [--project <id>]",
    "  bb roster layout get [--json] [--project <id>]",
    "  bb roster layout save [--column-split <n>] [--row-split <n>] [--json] [--project <id>]",
    "  bb roster layout reset [--json] [--project <id>]",
    "",
    "Zone ids: fixed_desks, meeting_room, breakout_room, testing_lab",
  ].join("\n");
}

function asJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

interface ParsedFlags {
  positional: string[];
  flags: Map<string, string | true>;
}

export function parseRosterArgv(argv: string[]): ParsedFlags {
  const flags = new Map<string, string | true>();
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--json") {
      flags.set("json", true);
      continue;
    }
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [rawName, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    if (!rawName) throw new Error(`Invalid flag ${arg}`);
    if (inlineValue !== undefined) {
      flags.set(rawName, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags.set(rawName, next);
      index += 1;
    } else {
      flags.set(rawName, true);
    }
  }
  return { positional, flags };
}

function flagString(flags: ParsedFlags, name: string): string | undefined {
  const value = flags.flags.get(name);
  return value === undefined || value === true ? undefined : value;
}

function flagBool(flags: ParsedFlags, name: string): boolean {
  return flags.flags.get(name) === true;
}

export function requireProjectId(
  ctx: PluginCliContext,
  flags: ParsedFlags,
): string {
  const projectId = flagString(flags, "project") ?? ctx.projectId;
  if (!projectId) {
    throw new Error(
      "No project context. Pass --project <id> or run from a bb thread.",
    );
  }
  return projectId;
}

function parseTools(value: string | undefined): string[] {
  if (!value) return ["read_file"];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function registerRosterCli(
  bb: Pick<BbPluginApi, "cli">,
  store: RosterStore,
  invokeAgent: (args: {
    projectId: string;
    agentId: string;
    prompt: string;
  }) => Promise<{ threadId: string }>,
): void {
  bb.cli.register({
    name: "roster",
    summary: "Manage roster agents and the spatial office layout",
    commands: [
      { name: "list", summary: "List roster agents", usage: "bb roster list" },
      { name: "create", summary: "Create a roster agent", usage: "bb roster create" },
      { name: "update", summary: "Update a roster agent", usage: "bb roster update <id>" },
      { name: "archive", summary: "Archive a roster agent", usage: "bb roster archive <id>" },
      { name: "invoke", summary: "Invoke a roster agent", usage: "bb roster invoke <id> <prompt...>" },
      { name: "move", summary: "Move a roster agent", usage: "bb roster move <id>" },
      { name: "layout", summary: "Read or update office layout", usage: "bb roster layout get|save|reset" },
    ],
    async run(argv, ctx): Promise<PluginCliResult> {
      try {
        const parsed = parseRosterArgv(argv);
        const json = flagBool(parsed, "json");
        const [command, subcommand, ...rest] = parsed.positional;

        if (
          command === undefined ||
          command === "help" ||
          command === "--help"
        ) {
          return { exitCode: 0, stdout: `${helpText()}\n` };
        }

        if (command === "list") {
          const projectId = requireProjectId(ctx, parsed);
          const status = flagString(parsed, "status") as AgentStatus | undefined;
          const role = flagString(parsed, "role");
          const agents = await store.listAgents(projectId, {
            ...(status ? { status } : {}),
            ...(role ? { role } : {}),
          });
          return {
            exitCode: 0,
            stdout: json ? asJson({ agents }) : agents.map((agent) => `${agent.id}\t${agent.name}\t${agent.spatial_state.status}`).join("\n") + (agents.length ? "\n" : ""),
          };
        }

        if (command === "create") {
          const projectId = requireProjectId(ctx, parsed);
          const name = flagString(parsed, "name");
          const role = flagString(parsed, "role");
          const prompt = flagString(parsed, "prompt");
          if (!name || !role || !prompt) {
            throw new Error("--name, --role, and --prompt are required");
          }
          const agent = await store.registerAgent(projectId, {
            name,
            role,
            system_prompt: prompt,
            avatar: flagString(parsed, "avatar") ?? "default-m",
            allowed_tools: parseTools(flagString(parsed, "tools")),
            default_model: flagString(parsed, "model"),
          });
          return {
            exitCode: 0,
            stdout: json ? asJson({ agent }) : `Created ${agent.id} (${agent.name})\n`,
          };
        }

        if (command === "update") {
          const projectId = requireProjectId(ctx, parsed);
          const agentId = subcommand;
          if (!agentId) throw new Error("Agent id is required");
          const current = await store.readAgent(projectId, agentId);
          const agent = await store.updateAgent(projectId, agentId, {
            name: flagString(parsed, "name") ?? current.name,
            role: flagString(parsed, "role") ?? current.role,
            system_prompt: flagString(parsed, "prompt") ?? current.system_prompt,
            avatar: flagString(parsed, "avatar") ?? current.avatar,
            allowed_tools: flagString(parsed, "tools")
              ? parseTools(flagString(parsed, "tools"))
              : current.allowed_tools,
            default_model: flagString(parsed, "model") ?? current.default_model,
          });
          return {
            exitCode: 0,
            stdout: json ? asJson({ agent }) : `Updated ${agent.id}\n`,
          };
        }

        if (command === "archive") {
          const projectId = requireProjectId(ctx, parsed);
          const agentId = subcommand;
          if (!agentId) throw new Error("Agent id is required");
          const agent = await store.archiveAgent(projectId, agentId);
          return {
            exitCode: 0,
            stdout: json ? asJson({ agent }) : `Archived ${agent.id}\n`,
          };
        }

        if (command === "invoke") {
          const projectId = requireProjectId(ctx, parsed);
          const agentId = subcommand;
          const prompt = rest.join(" ").trim();
          if (!agentId || prompt.length === 0) {
            throw new Error("Usage: bb roster invoke <agent-id> <prompt...>");
          }
          const result = await invokeAgent({ projectId, agentId, prompt });
          return {
            exitCode: 0,
            stdout: json
              ? asJson(result)
              : `Spawned thread ${result.threadId}\n`,
          };
        }

        if (command === "move") {
          const projectId = requireProjectId(ctx, parsed);
          const agentId = subcommand;
          if (!agentId) throw new Error("Agent id is required");
          const zoneId = flagString(parsed, "zone");
          const xRaw = flagString(parsed, "x");
          const yRaw = flagString(parsed, "y");
          if (zoneId) {
            const agent = await store.assignAgentToZone(projectId, agentId, zoneId);
            return {
              exitCode: 0,
              stdout: json ? asJson({ agent }) : `Moved ${agent.id} to ${zoneId}\n`,
            };
          }
          if (xRaw !== undefined && yRaw !== undefined) {
            const layout = await store.getOfficeLayout(projectId);
            const position_x = Number.parseInt(xRaw, 10);
            const position_y = Number.parseInt(yRaw, 10);
            const zoneIdAtPosition =
              layout.zones.find(
                (zone) =>
                  position_x >= zone.bounds.x &&
                  position_x < zone.bounds.x + zone.bounds.width &&
                  position_y >= zone.bounds.y &&
                  position_y < zone.bounds.y + zone.bounds.height,
              )?.id ?? "fixed_desks";
            const zoneMap: Record<string, "desks" | "conference_room" | "lounge" | "testing_lab"> = {
              fixed_desks: "desks",
              meeting_room: "conference_room",
              breakout_room: "lounge",
              testing_lab: "testing_lab",
            };
            const agent = await store.updateAgentSpatial(projectId, agentId, {
              zone: zoneMap[zoneIdAtPosition] ?? "desks",
              position_x,
              position_y,
            });
            return {
              exitCode: 0,
              stdout: json ? asJson({ agent }) : `Moved ${agent.id} to ${position_x},${position_y}\n`,
            };
          }
          throw new Error("Pass --zone <zone-id> or --x and --y");
        }

        if (command === "layout") {
          const projectId = requireProjectId(ctx, parsed);
          if (subcommand === "get") {
            const layout = await store.getOfficeLayout(projectId);
            return {
              exitCode: 0,
              stdout: json ? asJson({ layout }) : `${JSON.stringify(layout, null, 2)}\n`,
            };
          }
          if (subcommand === "reset") {
            const result = await store.resetOfficeLayout(projectId);
            return {
              exitCode: 0,
              stdout: json
                ? asJson(result)
                : `Reset layout (repositioned ${result.agentsRepositioned} agent(s))\n`,
            };
          }
          if (subcommand === "save") {
            const current = await store.getOfficeLayout(projectId);
            const splits = extractSplits(current);
            const columnSplit = Number.parseInt(
              flagString(parsed, "column-split") ?? String(splits.columnSplit),
              10,
            );
            const rowSplit = Number.parseInt(
              flagString(parsed, "row-split") ?? String(splits.rowSplit),
              10,
            );
            const layout = layoutFromSplits(columnSplit, rowSplit, current.zones);
            const result = await store.applyOfficeLayout(projectId, layout);
            return {
              exitCode: 0,
              stdout: json
                ? asJson(result)
                : `Saved layout (repositioned ${result.agentsRepositioned} agent(s))\n`,
            };
          }
          throw new Error("Usage: bb roster layout get|save|reset");
        }

        return {
          exitCode: 1,
          stderr: `Unknown command "${command}".\n\n${helpText()}\n`,
        };
      } catch (error) {
        return {
          exitCode: 1,
          stderr: `${error instanceof Error ? error.message : String(error)}\n`,
        };
      }
    },
  });
}
