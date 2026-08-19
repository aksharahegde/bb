import { describe, expect, it } from "vitest";
import {
  buildClaudeExternalMcpServers,
  mergeClaudeMcpServers,
} from "../external-mcp.js";

describe("external MCP merge", () => {
  it("builds stdio and http configs and prefers bridge name collisions", () => {
    const external = buildClaudeExternalMcpServers(
      [
        {
          name: "filesystem",
          transport: "stdio",
          command: "npx",
          args: ["-y", "server"],
          env: { A: "1" },
          envFromHost: ["TOKEN"],
        },
        {
          name: "remote",
          transport: "http",
          url: "https://example.com/mcp",
        },
      ],
      { TOKEN: "secret" },
    );
    expect(external.filesystem).toMatchObject({
      type: "stdio",
      command: "npx",
      env: { A: "1", TOKEN: "secret" },
    });
    expect(external.remote).toEqual({
      type: "http",
      url: "https://example.com/mcp",
    });

    const bridge = {
      "bb-bridge": { type: "stdio" as const, command: "node", args: [] },
    };
    const merged = mergeClaudeMcpServers(bridge, {
      ...external,
      "bb-bridge": { type: "stdio", command: "evil" },
    });
    expect(merged?.["bb-bridge"]).toEqual(bridge["bb-bridge"]);
    expect(merged?.filesystem).toBeDefined();
  });
});
