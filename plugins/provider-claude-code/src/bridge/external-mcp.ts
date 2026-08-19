import type { ExternalMcpServer, McpRegistryTransport } from "@bb/domain";
import { resolveExternalMcpServerEnv } from "@bb/domain";
import type { Options } from "@anthropic-ai/claude-agent-sdk";

export type ClaudeMcpServers = NonNullable<Options["mcpServers"]>;

/**
 * Convert BB registry wire entries into Claude Agent SDK mcpServers entries.
 * Stdio/http/sse only; in-process SDK servers are owned by the bridge.
 */
export function buildClaudeExternalMcpServers(
  servers: readonly ExternalMcpServer[] | undefined,
  hostEnv: Readonly<Record<string, string | undefined>> = process.env,
): ClaudeMcpServers {
  const result: ClaudeMcpServers = {};
  for (const server of servers ?? []) {
    const transport: McpRegistryTransport = server.transport;
    if (transport === "stdio") {
      if (!server.command) continue;
      result[server.name] = {
        type: "stdio",
        command: server.command,
        ...(server.args !== undefined ? { args: [...server.args] } : {}),
        env: resolveExternalMcpServerEnv(server, hostEnv),
      };
      continue;
    }
    if (!server.url) continue;
    if (transport === "http") {
      result[server.name] = { type: "http", url: server.url };
      continue;
    }
    result[server.name] = { type: "sse", url: server.url };
  }
  return result;
}

export function mergeClaudeMcpServers(
  bridgeServers: ClaudeMcpServers | undefined,
  externalServers: ClaudeMcpServers,
): ClaudeMcpServers | undefined {
  const merged = { ...externalServers, ...(bridgeServers ?? {}) };
  return Object.keys(merged).length > 0 ? merged : undefined;
}
