import { z } from "zod";

/** Reserved MCP server name used by BB's dynamic-tool bridge. */
export const BB_BRIDGE_MCP_SERVER_NAME = "bb-bridge";

export const mcpRegistryTransportValues = ["stdio", "http", "sse"] as const;
export const mcpRegistryTransportSchema = z.enum(mcpRegistryTransportValues);
export type McpRegistryTransport = z.infer<typeof mcpRegistryTransportSchema>;

const mcpServerNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u,
    "MCP server name must be alphanumeric with _ or -",
  )
  .refine(
    (name) => name !== BB_BRIDGE_MCP_SERVER_NAME,
    `MCP server name '${BB_BRIDGE_MCP_SERVER_NAME}' is reserved`,
  );

/**
 * User-registered external MCP server. Injected into Claude Code / ACP
 * sessions when enabled. Codex and Pi ignore this registry in P1.
 */
export const mcpRegistryServerSchema = z
  .object({
    id: z.string().min(1),
    name: mcpServerNameSchema,
    enabled: z.boolean(),
    transport: mcpRegistryTransportSchema,
    /** Required when transport is stdio. */
    command: z.string().min(1).optional(),
    args: z.array(z.string()),
    /** Required when transport is http or sse. */
    url: z.string().url().optional(),
    /** Literal env values passed to stdio servers. Prefer envFromHost for secrets. */
    env: z.record(z.string(), z.string()),
    /**
     * Host-process env keys copied by the daemon into the stdio server env.
     * Use this for API tokens instead of storing secrets in settings.
     */
    envFromHost: z.array(z.string().min(1)),
  })
  .strict()
  .superRefine((server, ctx) => {
    if (server.transport === "stdio") {
      if (server.command === undefined || server.command.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "stdio MCP servers require command",
          path: ["command"],
        });
      }
      return;
    }
    if (server.url === undefined || server.url.trim().length === 0) {
      ctx.addIssue({
        code: "custom",
        message: `${server.transport} MCP servers require url`,
        path: ["url"],
      });
    }
  });
export type McpRegistryServer = z.infer<typeof mcpRegistryServerSchema>;

export const mcpRegistrySchema = z.array(mcpRegistryServerSchema);
export type McpRegistry = z.infer<typeof mcpRegistrySchema>;

export const defaultMcpRegistry: McpRegistry = [];

/**
 * Wire payload for enabled MCP servers sent to the host daemon. Env literals
 * are included; envFromHost is resolved on the daemon before launch.
 */
export const externalMcpServerSchema = z
  .object({
    name: mcpServerNameSchema,
    transport: mcpRegistryTransportSchema,
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    url: z.string().url().optional(),
    env: z.record(z.string(), z.string()).optional(),
    envFromHost: z.array(z.string().min(1)).optional(),
  })
  .strict();
export type ExternalMcpServer = z.infer<typeof externalMcpServerSchema>;

export function toExternalMcpServers(
  registry: readonly McpRegistryServer[],
): ExternalMcpServer[] {
  return registry
    .filter((server) => server.enabled)
    .map((server) => {
      const base = {
        name: server.name,
        transport: server.transport,
        ...(Object.keys(server.env).length > 0 ? { env: server.env } : {}),
        ...(server.envFromHost.length > 0
          ? { envFromHost: server.envFromHost }
          : {}),
      };
      if (server.transport === "stdio") {
        return {
          ...base,
          command: server.command,
          ...(server.args.length > 0 ? { args: server.args } : {}),
        };
      }
      return {
        ...base,
        url: server.url,
      };
    });
}

export function resolveExternalMcpServerEnv(
  server: ExternalMcpServer,
  hostEnv: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
  const resolved: Record<string, string> = { ...(server.env ?? {}) };
  for (const key of server.envFromHost ?? []) {
    const value = hostEnv[key];
    if (typeof value === "string" && value.length > 0) {
      resolved[key] = value;
    }
  }
  return resolved;
}
