import type { BbPluginApi, PluginCliContext, PluginCliResult } from "@get-bb/plugin-sdk";
import {
  GraphifyCliError,
  GRAPHIFY_HINT,
  resolveGraphifyPath,
  runGraphify,
} from "./graphify-cli.js";
import {
  computeGraphStatus,
  parseGraphDocument,
  type GraphStatus,
} from "./graph-status.js";
import {
  graphJsonPath,
  hostFileArgs,
  resolveProjectSource,
  type ProjectSource,
} from "./project-source.js";

class CliError extends Error {}

const USAGE = `Usage: bb graphify <command> [options]

Commands:
  status [--json]
  update [--json]
  query "<question>" [--dfs] [--budget N] [--json]
  path "<A>" "<B>" [--json]
  affected "<X>" [--depth N] [--json]
  god-nodes [--top N] [--json]`;

function jsonOutput(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
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

function option(options: Map<string, string[]>, key: string): string | undefined {
  return options.get(key)?.at(-1);
}

async function requireProject(
  bb: BbPluginApi,
  ctx: PluginCliContext,
): Promise<{ projectId: string; source: ProjectSource }> {
  if (!ctx.projectId) {
    throw new CliError(
      "bb graphify requires a project context. Run inside a bb project or pass project context via the CLI.",
    );
  }
  const source = await resolveProjectSource(bb, ctx.projectId);
  return { projectId: ctx.projectId, source };
}

export async function readGraphStatus(
  bb: BbPluginApi,
  source: ProjectSource,
): Promise<GraphStatus> {
  const path = graphJsonPath(source);
  try {
    const file = await bb.sdk.files.read({
      ...hostFileArgs(source),
      path: graphJsonPath(source),
    });
    if (file.contentEncoding !== "utf8") {
      throw new Error("graph.json is not UTF-8 text");
    }
    const doc = parseGraphDocument(file.content);
    return computeGraphStatus(doc, path);
  } catch {
    return computeGraphStatus(null, path);
  }
}

export function registerGraphifyCli(bb: BbPluginApi): void {
  bb.cli.register({
    name: "graphify",
    summary: "Query the Graphify codebase knowledge graph for this project",
    commands: [
      {
        name: "status",
        summary: "Show graphify-out/graph.json status and god nodes",
        usage: "bb graphify status [--json]",
      },
      {
        name: "update",
        summary: "Rebuild graph with AST-only graphify update (no LLM)",
        usage: "bb graphify update [--json]",
      },
      {
        name: "query",
        summary: "BFS/DFS question over graph.json",
        usage: 'bb graphify query "<question>" [--dfs] [--budget N] [--json]',
      },
      {
        name: "path",
        summary: "Shortest path between two nodes",
        usage: 'bb graphify path "<A>" "<B>" [--json]',
      },
      {
        name: "affected",
        summary: "Reverse traversal of nodes impacted by a change",
        usage: 'bb graphify affected "<X>" [--depth N] [--json]',
      },
      {
        name: "god-nodes",
        summary: "List highest-degree architectural hubs",
        usage: "bb graphify god-nodes [--top N] [--json]",
      },
    ],
    async run(argv, ctx): Promise<PluginCliResult> {
      try {
        if (argv.length === 0 || argv[0] === "help" || argv[0] === "--help") {
          return { exitCode: 0, stdout: `${USAGE}\n` };
        }
        const [command, ...rest] = argv;
        const { positionals, options, flags } = parseArgs(rest);
        const asJson = flags.has("json");
        const { source } = await requireProject(bb, ctx);

        if (command === "status") {
          const status = await readGraphStatus(bb, source);
          let graphifyPath: string | null = null;
          try {
            graphifyPath = await resolveGraphifyPath();
          } catch {
            graphifyPath = null;
          }
          const payload = { ...status, graphifyPath, hint: GRAPHIFY_HINT };
          if (asJson) {
            return { exitCode: 0, stdout: jsonOutput(payload) };
          }
          if (!status.exists) {
            return {
              exitCode: 0,
              stdout: `No graph at ${status.graphPath}\nRun: bb graphify update\n${graphifyPath ? `graphify: ${graphifyPath}\n` : `${GRAPHIFY_HINT}\n`}`,
            };
          }
          const lines = [
            `Graph: ${status.nodeCount} nodes, ${status.edgeCount} edges`,
            `Path: ${status.graphPath}`,
            `graphify: ${graphifyPath ?? "not found on PATH"}`,
            "God nodes:",
            ...status.topNodes.map(
              (node) => `  ${node.label} (degree ${node.degree})`,
            ),
            "",
          ];
          return { exitCode: 0, stdout: lines.join("\n") };
        }

        if (command === "update") {
          const result = await runGraphify(["update", source.rootPath], {
            cwd: source.rootPath,
            timeoutMs: 300_000,
          });
          const status = await readGraphStatus(bb, source);
          if (asJson) {
            return {
              exitCode: 0,
              stdout: jsonOutput({
                ok: true,
                stdout: result.stdout,
                stderr: result.stderr,
                status,
              }),
            };
          }
          return {
            exitCode: 0,
            stdout: `${result.stdout}${result.stderr ? `\n${result.stderr}` : ""}\nUpdated: ${status.nodeCount} nodes, ${status.edgeCount} edges\n`,
          };
        }

        if (command === "query") {
          const question = positionals[0];
          if (!question) {
            throw new CliError('Usage: bb graphify query "<question>"');
          }
          const args = ["query", question, "--graph", graphJsonPath(source)];
          if (flags.has("dfs")) args.push("--dfs");
          const budget = option(options, "budget");
          if (budget) args.push("--budget", budget);
          const result = await runGraphify(args, { cwd: source.rootPath });
          if (asJson) {
            return {
              exitCode: 0,
              stdout: jsonOutput({ stdout: result.stdout, stderr: result.stderr }),
            };
          }
          return { exitCode: 0, stdout: result.stdout || result.stderr };
        }

        if (command === "path") {
          const from = positionals[0];
          const to = positionals[1];
          if (!from || !to) {
            throw new CliError('Usage: bb graphify path "<A>" "<B>"');
          }
          const result = await runGraphify(
            ["path", from, to, "--graph", graphJsonPath(source)],
            { cwd: source.rootPath },
          );
          if (asJson) {
            return {
              exitCode: 0,
              stdout: jsonOutput({ stdout: result.stdout, stderr: result.stderr }),
            };
          }
          return { exitCode: 0, stdout: result.stdout || result.stderr };
        }

        if (command === "affected") {
          const target = positionals[0];
          if (!target) {
            throw new CliError('Usage: bb graphify affected "<X>"');
          }
          const args = ["affected", target, "--graph", graphJsonPath(source)];
          const depth = option(options, "depth");
          if (depth) args.push("--depth", depth);
          const result = await runGraphify(args, { cwd: source.rootPath });
          if (asJson) {
            return {
              exitCode: 0,
              stdout: jsonOutput({ stdout: result.stdout, stderr: result.stderr }),
            };
          }
          return { exitCode: 0, stdout: result.stdout || result.stderr };
        }

        if (command === "god-nodes") {
          const top = option(options, "top") ?? "10";
          const status = await readGraphStatus(bb, source);
          const topN = Number.parseInt(top, 10);
          const nodes = status.topNodes.slice(0, Number.isFinite(topN) ? topN : 10);
          if (asJson) {
            return { exitCode: 0, stdout: jsonOutput({ nodes, status }) };
          }
          if (!status.exists) {
            return {
              exitCode: 1,
              stderr: `No graph at ${status.graphPath}. Run bb graphify update first.\n`,
            };
          }
          return {
            exitCode: 0,
            stdout: `${nodes.map((node) => `${node.label}\tdegree=${node.degree}`).join("\n")}\n`,
          };
        }

        throw new CliError(`Unknown command: ${command}\n${USAGE}`);
      } catch (error) {
        if (error instanceof GraphifyCliError) {
          return {
            exitCode: error.exitCode || 1,
            stdout: error.stdout || undefined,
            stderr: error.stderr || error.message,
          };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { exitCode: 1, stderr: `${message}\n` };
      }
    },
  });
}
