import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanClaudeCodeHistory } from "./usage-history-claude.js";
import { parseCursorComposerEvents } from "./usage-history-cursor.js";
import {
  createUsageHistoryScanAccumulator,
  createUsageHistoryScanBudget,
} from "./usage-history-common.js";
import { scanUsageHistory } from "./usage-history-scan.js";

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../test-fixtures/usage-history",
);

describe("usage history claude parser", () => {
  let projectsRoot: string;

  beforeEach(async () => {
    projectsRoot = await mkdtemp(join(dirname(fixturesRoot), "bb-usage-claude-"));
    const sessionDir = join(projectsRoot, "-tmp-example");
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, "sample-session.jsonl"),
      await readFile(
        join(fixturesRoot, "claude-code/sample-session.jsonl"),
        "utf8",
      ),
    );
  });

  afterEach(async () => {
    await rm(projectsRoot, { recursive: true, force: true });
  });

  it("dedupes assistant lines that share the same message id", async () => {
    const budget = createUsageHistoryScanBudget({
      limit: 100,
      sinceDays: null,
    });
    const accumulator = createUsageHistoryScanAccumulator([]);

    await scanClaudeCodeHistory({
      budget,
      accumulator,
      projectsRoot,
    });

    const assistantEvents = accumulator.events.filter((event) =>
      event.id.includes(":msg_0001"),
    );
    expect(assistantEvents).toHaveLength(1);
    expect(assistantEvents[0]).toMatchObject({
      provider: "claude-code",
      source: "claude-jsonl",
      model: "claude-sonnet-5",
      inputTokens: 1200,
      outputTokens: 80,
      costSource: "unpriced",
      costUsdMicros: null,
    });
    expect(accumulator.events.map((event) => event.id)).toEqual([
      "claude-code:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:msg_0001",
      "claude-code:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:msg_0002",
    ]);
    expect(accumulator.fileCursors).toHaveLength(1);
    expect(accumulator.fileCursors[0]?.byteOffset).toBeGreaterThan(0);
  });
});

describe("usage history cursor parser", () => {
  it("emits provider-reported composer costs and non-zero bubble tokens", async () => {
    const composer = JSON.parse(
      await readFile(
        join(fixturesRoot, "cursor/ide-composer-data.json"),
        "utf8",
      ),
    );
    const bubble = JSON.parse(
      await readFile(
        join(fixturesRoot, "cursor/ide-composer-bubble.json"),
        "utf8",
      ),
    );

    const events = parseCursorComposerEvents(
      composer,
      new Map([[bubble.bubbleId, bubble]]),
    );

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cursor-ide:c1f6a176-422c-4530-8549-8135370ecd75:default",
          provider: "cursor",
          source: "cursor-ide-composer",
          costSource: "provider-reported",
          costUsdMicros: 80_000,
        }),
        expect.objectContaining({
          id: "cursor-ide:c1f6a176-422c-4530-8549-8135370ecd75:claude-sonnet-5",
          costSource: "provider-reported",
          costUsdMicros: 120_000,
        }),
        expect.objectContaining({
          id: "cursor-ide:c1f6a176-422c-4530-8549-8135370ecd75:3499eacb-91ee-42c6-9e58-48d5ba4ac5ee",
          inputTokens: 15234,
          outputTokens: 412,
          costSource: "unpriced",
          costUsdMicros: null,
        }),
      ]),
    );
  });
});

describe("scanUsageHistory", () => {
  let projectsRoot: string;
  let sessionRoot: string;

  beforeEach(async () => {
    projectsRoot = await mkdtemp(join(dirname(fixturesRoot), "bb-usage-scan-"));
    const sessionDir = join(projectsRoot, "-tmp-example");
    await mkdir(sessionDir, { recursive: true });
    await writeFile(
      join(sessionDir, "sample-session.jsonl"),
      await readFile(
        join(fixturesRoot, "claude-code/sample-session.jsonl"),
        "utf8",
      ),
    );

    sessionRoot = await mkdtemp(join(dirname(fixturesRoot), "bb-usage-acp-"));
    const acpSessionDir = join(
      sessionRoot,
      "00190954-bfdd-4576-86f4-3cb12a7e8fe1",
    );
    await mkdir(acpSessionDir, { recursive: true });
    await writeFile(
      join(acpSessionDir, "meta.json"),
      await readFile(join(fixturesRoot, "cursor/acp-meta.json"), "utf8"),
    );
  });

  afterEach(async () => {
    await rm(projectsRoot, { recursive: true, force: true });
    await rm(sessionRoot, { recursive: true, force: true });
  });

  it("returns normalized claude and cursor-agent events with file cursors", async () => {
    const result = await scanUsageHistory({
      sinceDays: null,
      limit: 100,
      fileCursors: [],
      projectsRoot,
      cursorDatabasePaths: [],
      cursorSessionRoots: [sessionRoot],
    });

    expect(result.truncated).toBe(false);
    expect(result.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "claude-code",
          source: "claude-jsonl",
        }),
        expect.objectContaining({
          provider: "cursor",
          source: "cursor-agent-acp",
          id: "cursor-agent-acp:00190954-bfdd-4576-86f4-3cb12a7e8fe1",
          model: "default",
          costSource: "unpriced",
        }),
      ]),
    );
    expect(result.fileCursors).toHaveLength(1);
  });
});
