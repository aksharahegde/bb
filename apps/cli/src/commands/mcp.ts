import { Command } from "commander";
import {
  mcpRegistrySchema,
  mcpRegistryServerSchema,
  type McpRegistry,
  type McpRegistryServer,
} from "@bb/domain";
import { randomUUID } from "node:crypto";
import { action } from "../action.js";
import { createCliBbSdk } from "../client.js";
import { outputJson } from "./helpers.js";

interface JsonOptions {
  json?: boolean;
}

type ResolveServerUrl = () => string;

async function loadRegistry(getUrl: ResolveServerUrl): Promise<McpRegistry> {
  const sdk = createCliBbSdk(getUrl());
  const config = await sdk.system.config();
  return mcpRegistrySchema.parse(config.mcpServers ?? []);
}

async function saveRegistry(
  getUrl: ResolveServerUrl,
  registry: McpRegistry,
): Promise<McpRegistry> {
  const sdk = createCliBbSdk(getUrl());
  return sdk.system.updateMcpSettings(mcpRegistrySchema.parse(registry));
}

function printServers(servers: readonly McpRegistryServer[]): void {
  if (servers.length === 0) {
    process.stdout.write("No MCP servers registered.\n");
    return;
  }
  for (const server of servers) {
    const state = server.enabled ? "enabled" : "disabled";
    const target =
      server.transport === "stdio"
        ? `${server.command ?? ""} ${(server.args ?? []).join(" ")}`.trim()
        : server.url ?? "";
    process.stdout.write(
      `${server.name}\t${state}\t${server.transport}\t${target}\n`,
    );
  }
}

function findServer(
  registry: McpRegistry,
  name: string,
): McpRegistryServer | undefined {
  return registry.find((server) => server.name === name);
}

export function registerMcpCommands(
  program: Command,
  getUrl: ResolveServerUrl,
): void {
  const mcp = program
    .command("mcp")
    .description(
      "Manage external MCP servers for Claude Code / ACP sessions (Settings → MCP)",
    );

  mcp
    .command("list")
    .description("List registered MCP servers")
    .option("--json", "Emit JSON")
    .action(
      action(async (opts: JsonOptions) => {
        const registry = await loadRegistry(getUrl);
        if (opts.json) {
          outputJson(opts, registry);
          return;
        }
        printServers(registry);
      }),
    );

  mcp
    .command("add")
    .description("Register an MCP server")
    .argument("<name>", "Server name (alphanumeric, _ or -)")
    .option("--command <command>", "Stdio command")
    .option("--arg <arg>", "Stdio arg (repeatable)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [] as string[])
    .option("--url <url>", "HTTP or SSE URL")
    .option("--transport <transport>", "stdio | http | sse", "stdio")
    .option("--env <KEY=VALUE>", "Literal env (repeatable)", (value, previous: string[]) => {
      previous.push(value);
      return previous;
    }, [] as string[])
    .option(
      "--env-from-host <KEY>",
      "Copy env key from host process (repeatable)",
      (value, previous: string[]) => {
        previous.push(value);
        return previous;
      },
      [] as string[],
    )
    .option("--disabled", "Register but leave disabled")
    .option("--json", "Emit JSON")
    .action(
      action(async (name: string, opts: {
        command?: string;
        arg: string[];
        url?: string;
        transport: string;
        env: string[];
        envFromHost: string[];
        disabled?: boolean;
        json?: boolean;
      }) => {
        const env: Record<string, string> = {};
        for (const entry of opts.env) {
          const eq = entry.indexOf("=");
          if (eq <= 0) {
            throw new Error(`Invalid --env '${entry}' (expected KEY=VALUE)`);
          }
          env[entry.slice(0, eq)] = entry.slice(eq + 1);
        }
        const transport =
          opts.transport === "http" || opts.transport === "sse"
            ? opts.transport
            : "stdio";
        const server = mcpRegistryServerSchema.parse({
          id: randomUUID(),
          name,
          enabled: opts.disabled !== true,
          transport,
          ...(opts.command !== undefined ? { command: opts.command } : {}),
          args: opts.arg,
          ...(opts.url !== undefined ? { url: opts.url } : {}),
          env,
          envFromHost: opts.envFromHost,
        });
        const registry = await loadRegistry(getUrl);
        if (findServer(registry, name)) {
          throw new Error(`MCP server '${name}' already exists`);
        }
        const next = await saveRegistry(getUrl, [...registry, server]);
        if (opts.json) {
          outputJson(opts, next);
          return;
        }
        process.stdout.write(`Added MCP server '${name}'.\n`);
      }),
    );

  mcp
    .command("remove")
    .description("Remove a registered MCP server")
    .argument("<name>", "Server name")
    .option("--json", "Emit JSON")
    .action(
      action(async (name: string, opts: JsonOptions) => {
        const registry = await loadRegistry(getUrl);
        if (!findServer(registry, name)) {
          throw new Error(`MCP server '${name}' not found`);
        }
        const next = await saveRegistry(
          getUrl,
          registry.filter((server) => server.name !== name),
        );
        if (opts.json) {
          outputJson(opts, next);
          return;
        }
        process.stdout.write(`Removed MCP server '${name}'.\n`);
      }),
    );

  mcp
    .command("enable")
    .description("Enable a registered MCP server")
    .argument("<name>", "Server name")
    .option("--json", "Emit JSON")
    .action(
      action(async (name: string, opts: JsonOptions) => {
        const registry = await loadRegistry(getUrl);
        const existing = findServer(registry, name);
        if (!existing) {
          throw new Error(`MCP server '${name}' not found`);
        }
        const next = await saveRegistry(
          getUrl,
          registry.map((server) =>
            server.name === name ? { ...server, enabled: true } : server,
          ),
        );
        if (opts.json) {
          outputJson(opts, next);
          return;
        }
        process.stdout.write(`Enabled MCP server '${name}'.\n`);
      }),
    );

  mcp
    .command("disable")
    .description("Disable a registered MCP server")
    .argument("<name>", "Server name")
    .option("--json", "Emit JSON")
    .action(
      action(async (name: string, opts: JsonOptions) => {
        const registry = await loadRegistry(getUrl);
        const existing = findServer(registry, name);
        if (!existing) {
          throw new Error(`MCP server '${name}' not found`);
        }
        const next = await saveRegistry(
          getUrl,
          registry.map((server) =>
            server.name === name ? { ...server, enabled: false } : server,
          ),
        );
        if (opts.json) {
          outputJson(opts, next);
          return;
        }
        process.stdout.write(`Disabled MCP server '${name}'.\n`);
      }),
    );
}
