import { describe, expect, it } from "vitest";
import { assembleContextInstructions } from "./assemble.js";
import { budgetContextChunks } from "./budget.js";
import { rankAndDedupeContextChunks } from "./rank.js";
import {
  CONTEXT_SOURCE_PRIORITY,
  type ContextChunk,
} from "./types.js";

function chunk(
  partial: Partial<ContextChunk> & Pick<ContextChunk, "id" | "source" | "text">,
): ContextChunk {
  return {
    provenance: partial.provenance ?? partial.id,
    priority: partial.priority ?? CONTEXT_SOURCE_PRIORITY[partial.source],
    ...partial,
  };
}

describe("context engine", () => {
  it("ranks by priority and dedupes identical text", () => {
    const ranked = rankAndDedupeContextChunks([
      chunk({
        id: "ws",
        source: "workspace_agents",
        text: "workspace rules",
      }),
      chunk({
        id: "std",
        source: "standard",
        text: "standard rules",
      }),
      chunk({
        id: "dup",
        source: "plugin_contribute",
        text: "standard rules",
      }),
    ]);
    expect(ranked.map((entry) => entry.id)).toEqual(["std", "ws"]);
  });

  it("applies per-chunk and total budgets", () => {
    const budgeted = budgetContextChunks({
      chunks: [
        chunk({
          id: "a",
          source: "standard",
          text: "abcdefghij",
          maxChars: 4,
        }),
        chunk({
          id: "b",
          source: "plugin_contribute",
          text: "plugin text here",
        }),
      ],
      totalMaxChars: 10,
    });
    expect(budgeted[0]?.text).toBe("abcd");
    expect(budgeted[0]?.truncated).toBe(true);
    expect(budgeted.reduce((sum, entry) => sum + entry.text.length, 0)).toBeLessThanOrEqual(
      10,
    );
  });

  it("assembles provenance wrappers for plugins and agents files", () => {
    const assembled = assembleContextInstructions({
      chunks: [
        chunk({ id: "std", source: "standard", text: "base" }),
        chunk({
          id: "mem",
          source: "plugin_contribute",
          provenance: "memory",
          text: "memory catalog",
        }),
        chunk({
          id: "ws",
          source: "workspace_agents",
          provenance: ".bb/AGENTS.md",
          text: "workspace prefs",
        }),
      ],
    });
    expect(assembled.instructions).toContain("base");
    expect(assembled.instructions).toContain(
      'The following instructions come from the BB plugin "memory":',
    );
    expect(assembled.instructions).toContain("memory catalog");
    expect(assembled.instructions).toContain(
      "The following workspace instructions come from .bb/AGENTS.md:",
    );
    expect(assembled.chunkCount).toBe(3);
  });
});
