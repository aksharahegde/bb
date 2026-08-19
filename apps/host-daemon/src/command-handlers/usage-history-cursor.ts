import { opendir, readdir, readFile, stat } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import type { UsageHistoryEvent } from "@bb/host-daemon-contract";
import {
  isPastUsageHistoryDeadline,
  pushUsageHistoryEvent,
  shouldStopUsageHistoryScan,
  type UsageHistoryScanAccumulator,
  type UsageHistoryScanBudget,
} from "./usage-history-common.js";

const CENTS_TO_MICRO_USD = 10_000;

interface CursorUsageBucket {
  costInCents?: number;
  amount?: number;
}

interface CursorComposerData {
  composerId?: string;
  createdAt?: number;
  lastUpdatedAt?: number;
  usageData?: Record<string, CursorUsageBucket>;
  fullConversationHeadersOnly?: Array<{
    bubbleId?: string;
    type?: number;
  }>;
}

interface CursorBubbleData {
  bubbleId?: string;
  tokenCount?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  modelType?: string;
  createdAt?: number;
}

interface CursorAcpMeta {
  schemaVersion?: number;
  cwd?: string;
  title?: string;
  agentId?: string;
  createdAt?: number;
  lastUsedModel?: string;
}

export function cursorUserDataRoot(home = homedir()): string {
  if (platform() === "win32") {
    const appData =
      process.env.APPDATA ?? join(home, "AppData", "Roaming");
    return join(appData, "Cursor", "User");
  }
  if (platform() === "darwin") {
    return join(home, "Library", "Application Support", "Cursor", "User");
  }
  const configHome =
    process.env.XDG_CONFIG_HOME ?? join(home, ".config");
  return join(configHome, "Cursor", "User");
}

export function defaultCursorStateDatabasePaths(home = homedir()): string[] {
  const userRoot = cursorUserDataRoot(home);
  return [join(userRoot, "globalStorage", "state.vscdb")];
}

export async function listCursorStateDatabasePaths(
  home = homedir(),
): Promise<string[]> {
  const userRoot = cursorUserDataRoot(home);
  const paths = [...defaultCursorStateDatabasePaths(home)];
  const workspaceStorageRoot = join(userRoot, "workspaceStorage");
  try {
    const entries = await readdir(workspaceStorageRoot, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        paths.push(join(workspaceStorageRoot, entry.name, "state.vscdb"));
      }
    }
  } catch {
    // Workspace storage may not exist on hosts without Cursor IDE history.
  }
  return paths;
}

function parseJsonValue<T>(value: unknown): T | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  if (Buffer.isBuffer(value)) {
    try {
      return JSON.parse(value.toString("utf8")) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function occurredAtFromEpochMs(epochMs: number | undefined): string | null {
  if (epochMs === undefined || !Number.isFinite(epochMs)) {
    return null;
  }
  return new Date(epochMs).toISOString();
}

function eventsFromComposerData(
  composer: CursorComposerData,
): UsageHistoryEvent[] {
  const composerId = composer.composerId;
  if (!composerId) {
    return [];
  }
  const occurredAt =
    occurredAtFromEpochMs(composer.lastUpdatedAt) ??
    occurredAtFromEpochMs(composer.createdAt);
  if (!occurredAt) {
    return [];
  }

  const events: UsageHistoryEvent[] = [];
  const usageData = composer.usageData ?? {};
  for (const [modelKey, bucket] of Object.entries(usageData)) {
    const costInCents = bucket.costInCents ?? 0;
    if (costInCents <= 0) {
      continue;
    }
    const model = modelKey === "default" ? "default" : modelKey;
    events.push({
      id: `cursor-ide:${composerId}:${model}`,
      provider: "cursor",
      source: "cursor-ide-composer",
      model,
      occurredAt,
      inputTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0,
      costSource: "provider-reported",
      costUsdMicros: costInCents * CENTS_TO_MICRO_USD,
    });
  }
  return events;
}

function eventFromBubbleData(
  composerId: string,
  bubble: CursorBubbleData,
  fallbackOccurredAt: string,
): UsageHistoryEvent | null {
  const bubbleId = bubble.bubbleId;
  const inputTokens = bubble.tokenCount?.inputTokens ?? 0;
  const outputTokens = bubble.tokenCount?.outputTokens ?? 0;
  if (!bubbleId || (inputTokens <= 0 && outputTokens <= 0)) {
    return null;
  }
  const occurredAt =
    occurredAtFromEpochMs(bubble.createdAt) ?? fallbackOccurredAt;
  const model = bubble.modelType?.trim() || "unknown";
  return {
    id: `cursor-ide:${composerId}:${bubbleId}`,
    provider: "cursor",
    source: "cursor-ide-composer",
    model,
    occurredAt,
    inputTokens,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens,
    reasoningOutputTokens: 0,
    costSource: "unpriced",
    costUsdMicros: null,
  };
}

export function parseCursorComposerEvents(
  composer: CursorComposerData,
  bubblesById: ReadonlyMap<string, CursorBubbleData>,
): UsageHistoryEvent[] {
  const composerId = composer.composerId;
  if (!composerId) {
    return [];
  }
  const fallbackOccurredAt =
    occurredAtFromEpochMs(composer.lastUpdatedAt) ??
    occurredAtFromEpochMs(composer.createdAt);
  if (!fallbackOccurredAt) {
    return [];
  }

  const events = eventsFromComposerData(composer);
  for (const header of composer.fullConversationHeadersOnly ?? []) {
    const bubbleId = header.bubbleId;
    if (!bubbleId) {
      continue;
    }
    const bubble = bubblesById.get(bubbleId);
    if (!bubble) {
      continue;
    }
    const event = eventFromBubbleData(composerId, bubble, fallbackOccurredAt);
    if (event) {
      events.push(event);
    }
  }
  return events;
}

function readCursorComposerRows(databasePath: string): Array<{
  key: string;
  value: unknown;
}> {
  let database: Database.Database | null = null;
  try {
    database = new Database(databasePath, {
      fileMustExist: true,
      readonly: true,
    });
    const tableNames = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('cursorDiskKV', 'ItemTable')",
      )
      .all() as Array<{ name: string }>;
    const rows: Array<{ key: string; value: unknown }> = [];
    for (const table of tableNames) {
      if (table.name === "cursorDiskKV") {
        rows.push(
          ...(database
            .prepare(
              "SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%' OR key LIKE 'bubbleId:%'",
            )
            .all() as Array<{ key: string; value: unknown }>),
        );
      }
    }
    return rows;
  } catch {
    return [];
  } finally {
    database?.close();
  }
}

export function eventsFromCursorDatabaseRows(
  rows: Array<{ key: string; value: unknown }>,
): UsageHistoryEvent[] {
  const composers = new Map<string, CursorComposerData>();
  const bubblesByComposer = new Map<string, Map<string, CursorBubbleData>>();

  for (const row of rows) {
    if (row.key.startsWith("composerData:")) {
      const composer = parseJsonValue<CursorComposerData>(row.value);
      if (composer?.composerId) {
        composers.set(composer.composerId, composer);
      }
      continue;
    }
    if (!row.key.startsWith("bubbleId:")) {
      continue;
    }
    const parts = row.key.split(":");
    if (parts.length < 3) {
      continue;
    }
    const composerId = parts[1];
    const bubbleId = parts[2];
    const bubble = parseJsonValue<CursorBubbleData>(row.value);
    if (!bubble) {
      continue;
    }
    bubble.bubbleId = bubble.bubbleId ?? bubbleId;
    const composerBubbles =
      bubblesByComposer.get(composerId) ?? new Map<string, CursorBubbleData>();
    composerBubbles.set(bubble.bubbleId, bubble);
    bubblesByComposer.set(composerId, composerBubbles);
  }

  const events: UsageHistoryEvent[] = [];
  for (const composer of composers.values()) {
    const composerId = composer.composerId;
    if (!composerId) {
      continue;
    }
    events.push(
      ...parseCursorComposerEvents(
        composer,
        bubblesByComposer.get(composerId) ?? new Map(),
      ),
    );
  }
  return events;
}

export async function scanCursorIdeHistory(args: {
  budget: UsageHistoryScanBudget;
  accumulator: UsageHistoryScanAccumulator;
  databasePaths?: string[];
  home?: string;
}): Promise<void> {
  const databasePaths =
    args.databasePaths ?? (await listCursorStateDatabasePaths(args.home));

  for (const databasePath of databasePaths) {
    if (shouldStopUsageHistoryScan(args.budget, args.accumulator)) {
      return;
    }
    try {
      await stat(databasePath);
    } catch {
      continue;
    }
    const rows = readCursorComposerRows(databasePath);
    for (const event of eventsFromCursorDatabaseRows(rows)) {
      if (shouldStopUsageHistoryScan(args.budget, args.accumulator)) {
        return;
      }
      pushUsageHistoryEvent(args.accumulator, args.budget, event);
    }
  }
}

function defaultCursorAcpSessionRoots(home = homedir()): string[] {
  return [
    join(home, ".cursor", "acp-sessions"),
    join(home, ".cursor", "chats"),
  ];
}

async function collectMetaJsonFiles(
  root: string,
  deadline: number,
): Promise<{ files: string[]; truncated: boolean }> {
  const files: string[] = [];
  let truncated = false;

  const walk = async (dir: string): Promise<void> => {
    if (isPastUsageHistoryDeadline(deadline)) {
      truncated = true;
      return;
    }
    let directory;
    try {
      directory = await opendir(dir);
    } catch {
      return;
    }
    try {
      for await (const entry of directory) {
        if (isPastUsageHistoryDeadline(deadline)) {
          truncated = true;
          return;
        }
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
          continue;
        }
        if (entry.isFile() && entry.name === "meta.json") {
          files.push(fullPath);
        }
      }
    } catch {
      return;
    }
  };

  await walk(root);
  return { files, truncated };
}

function sessionIdFromMetaPath(metaPath: string): string {
  const parts = metaPath.split(/[/\\]/);
  const parent = parts.at(-2) ?? "unknown";
  return parent;
}

function eventFromAcpMeta(
  meta: CursorAcpMeta,
  sessionId: string,
): UsageHistoryEvent | null {
  const occurredAt = occurredAtFromEpochMs(meta.createdAt);
  if (!occurredAt) {
    return null;
  }
  const model = meta.lastUsedModel?.trim() || "unknown";
  return {
    id: `cursor-agent-acp:${sessionId}`,
    provider: "cursor",
    source: "cursor-agent-acp",
    model,
    occurredAt,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    costSource: "unpriced",
    costUsdMicros: null,
  };
}

export async function scanCursorAgentHistory(args: {
  budget: UsageHistoryScanBudget;
  accumulator: UsageHistoryScanAccumulator;
  sessionRoots?: string[];
}): Promise<void> {
  const sessionRoots = args.sessionRoots ?? defaultCursorAcpSessionRoots();
  for (const root of sessionRoots) {
    const { files, truncated } = await collectMetaJsonFiles(
      root,
      args.budget.deadline,
    );
    if (truncated) {
      args.budget.truncated = true;
    }
    for (const metaPath of files) {
      if (shouldStopUsageHistoryScan(args.budget, args.accumulator)) {
        return;
      }
      let raw: string;
      try {
        raw = await readFile(metaPath, "utf8");
      } catch {
        continue;
      }
      let meta: CursorAcpMeta;
      try {
        meta = JSON.parse(raw) as CursorAcpMeta;
      } catch {
        continue;
      }
      const event = eventFromAcpMeta(meta, sessionIdFromMetaPath(metaPath));
      if (event) {
        pushUsageHistoryEvent(args.accumulator, args.budget, event);
      }
    }
  }
}
