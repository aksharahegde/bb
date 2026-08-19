import { describe, expect, it } from "vitest";
import {
  BB_BRIDGE_MCP_SERVER_NAME,
  mcpRegistrySchema,
  mcpRegistryServerSchema,
  resolveExternalMcpServerEnv,
  toExternalMcpServers,
} from "./mcp-registry.js";

describe("mcp registry schema", () => {
  it("parses a stdio server and rejects the reserved bridge name", () => {
    const server = mcpRegistryServerSchema.parse({
      id: "srv_1",
      name: "filesystem",
      enabled: true,
      transport: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      env: {},
      envFromHost: ["API_TOKEN"],
    });
    expect(server.name).toBe("filesystem");
    expect(() =>
      mcpRegistryServerSchema.parse({
        ...server,
        name: BB_BRIDGE_MCP_SERVER_NAME,
      }),
    ).toThrow(/reserved/);
  });

  it("requires url for http servers", () => {
    expect(() =>
      mcpRegistryServerSchema.parse({
        id: "srv_2",
        name: "remote",
        enabled: true,
        transport: "http",
        args: [],
        env: {},
        envFromHost: [],
      }),
    ).toThrow(/url/);
  });

  it("maps enabled servers to wire payloads", () => {
    const registry = mcpRegistrySchema.parse([
      {
        id: "a",
        name: "on",
        enabled: true,
        transport: "stdio",
        command: "node",
        args: ["server.js"],
        env: { FOO: "1" },
        envFromHost: ["BAR"],
      },
      {
        id: "b",
        name: "off",
        enabled: false,
        transport: "stdio",
        command: "node",
        args: [],
        env: {},
        envFromHost: [],
      },
    ]);
    expect(toExternalMcpServers(registry)).toEqual([
      {
        name: "on",
        transport: "stdio",
        command: "node",
        args: ["server.js"],
        env: { FOO: "1" },
        envFromHost: ["BAR"],
      },
    ]);
  });

  it("resolves envFromHost from the host process env", () => {
    expect(
      resolveExternalMcpServerEnv(
        {
          name: "on",
          transport: "stdio",
          command: "node",
          env: { FOO: "1" },
          envFromHost: ["BAR", "MISSING"],
        },
        { BAR: "secret", OTHER: "x" },
      ),
    ).toEqual({ FOO: "1", BAR: "secret" });
  });
});
