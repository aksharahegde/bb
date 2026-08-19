import { open, opendir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { UsageHistoryEvent } from "@bb/host-daemon-contract";
import {
  isPastUsageHistoryDeadline,
  pushUsageHistoryEvent,
  readFileCursor,
  shouldStopUsageHistoryScan,
  upsertFileCursor,
  type UsageHistoryScanAccumulator,
  type UsageHistoryScanBudget,
} from "./usage-history-common.js";

interface ClaudeUsageRecord {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface ClaudeJsonlRow {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  session_id?: string;
  uuid?: string;
  message?: {
    id?: string;
    model?: string;
    usage?: ClaudeUsageRecord;
  };
  toolUseResult?: {
    agentId?: string;
    usage?: ClaudeUsageRecord;
  };
}

export function defaultClaudeProjectsRoot(home = homedir()): string {
  return join(home, ".claude", "projects");
}

function sessionIdFromRow(row: ClaudeJsonlRow): string | null {
  return row.sessionId ?? row.session_id ?? null;
}

function tokensFromUsage(usage: ClaudeUsageRecord | undefined): Pick<
  UsageHistoryEvent,
  | "inputTokens"
  | "cachedInputTokens"
  | "cacheWriteTokens"
  | "outputTokens"
  | "reasoningOutputTokens"
> {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    cachedInputTokens: usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage?.cache_creation_input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    reasoningOutputTokens: 0,
  };
}

function eventFromAssistantRow(
  row: ClaudeJsonlRow,
  sessionId: string,
): UsageHistoryEvent | null {
  const messageId = row.message?.id;
  const usage = row.message?.usage;
  if (!messageId || !usage) {
    return null;
  }
  const model = row.message?.model?.trim();
  if (!model) {
    return null;
  }
  const occurredAt = row.timestamp;
  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) {
    return null;
  }
  return {
    id: `claude-code:${sessionId}:${messageId}`,
    provider: "claude-code",
    source: "claude-jsonl",
    model,
    occurredAt,
    ...tokensFromUsage(usage),
    costSource: "unpriced",
    costUsdMicros: null,
  };
}

function eventFromSubagentRow(
  row: ClaudeJsonlRow,
  sessionId: string,
): UsageHistoryEvent | null {
  const usage = row.toolUseResult?.usage;
  const agentId = row.toolUseResult?.agentId;
  const turnUuid = row.uuid;
  if (!usage || !agentId || !turnUuid) {
    return null;
  }
  const occurredAt = row.timestamp;
  if (!occurredAt || Number.isNaN(Date.parse(occurredAt))) {
    return null;
  }
  return {
    id: `claude-code:${sessionId}:subagent:${agentId}:${turnUuid}`,
    provider: "claude-code",
    source: "claude-jsonl",
    model: "unknown",
    occurredAt,
    ...tokensFromUsage(usage),
    costSource: "unpriced",
    costUsdMicros: null,
  };
}

function eventFromRow(row: ClaudeJsonlRow): UsageHistoryEvent | null {
  const sessionId = sessionIdFromRow(row);
  if (!sessionId) {
    return null;
  }
  if (row.type === "assistant") {
    return eventFromAssistantRow(row, sessionId);
  }
  if (row.type === "user") {
    return eventFromSubagentRow(row, sessionId);
  }
  return null;
}

async function collectClaudeJsonlFiles(
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
        if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          files.push(fullPath);
        }
      }
    } catch {
      return;
    }
  };

  await walk(root);
  files.sort();
  return { files, truncated };
}

async function scanClaudeJsonlFile(args: {
  filePath: string;
  budget: UsageHistoryScanBudget;
  accumulator: UsageHistoryScanAccumulator;
}): Promise<void> {
  const { filePath, budget, accumulator } = args;
  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return;
  }

  const previousCursor = readFileCursor(accumulator, filePath);
  let startOffset = 0;
  if (
    previousCursor &&
    previousCursor.mtimeMs === fileStat.mtimeMs &&
    previousCursor.byteOffset <= fileStat.size
  ) {
    if (previousCursor.byteOffset >= fileStat.size) {
      return;
    }
    startOffset = previousCursor.byteOffset;
  }

  const bytesToRead = fileStat.size - startOffset;
  if (bytesToRead <= 0) {
    upsertFileCursor(accumulator, {
      path: filePath,
      byteOffset: fileStat.size,
      mtimeMs: fileStat.mtimeMs,
    });
    return;
  }

  const buffer = Buffer.alloc(bytesToRead);
  const handle = await open(filePath, "r");
  try {
    await handle.read(buffer, 0, bytesToRead, startOffset);
  } finally {
    await handle.close();
  }

  const chunk = buffer.toString("utf8");
  const lines = chunk.split("\n");
  const hasTrailingPartialLine = chunk.length > 0 && !chunk.endsWith("\n");
  const completeLines = hasTrailingPartialLine ? lines.slice(0, -1) : lines;

  for (const line of completeLines) {
    if (shouldStopUsageHistoryScan(budget, accumulator)) {
      budget.truncated = true;
      return;
    }
    if (line.trim().length === 0) {
      continue;
    }
    let row: ClaudeJsonlRow;
    try {
      row = JSON.parse(line) as ClaudeJsonlRow;
    } catch {
      continue;
    }
    const event = eventFromRow(row);
    if (event) {
      pushUsageHistoryEvent(accumulator, budget, event);
    }
  }

  let nextOffset = fileStat.size;
  if (hasTrailingPartialLine) {
    const partialLine = lines.at(-1) ?? "";
    nextOffset = fileStat.size - Buffer.byteLength(partialLine, "utf8");
  }

  upsertFileCursor(accumulator, {
    path: filePath,
    byteOffset: nextOffset,
    mtimeMs: fileStat.mtimeMs,
  });
}

export async function scanClaudeCodeHistory(args: {
  budget: UsageHistoryScanBudget;
  accumulator: UsageHistoryScanAccumulator;
  projectsRoot?: string;
}): Promise<void> {
  const projectsRoot = args.projectsRoot ?? defaultClaudeProjectsRoot();
  const { files, truncated } = await collectClaudeJsonlFiles(
    projectsRoot,
    args.budget.deadline,
  );
  if (truncated) {
    args.budget.truncated = true;
  }

  for (const filePath of files) {
    if (shouldStopUsageHistoryScan(args.budget, args.accumulator)) {
      return;
    }
    await scanClaudeJsonlFile({
      filePath,
      budget: args.budget,
      accumulator: args.accumulator,
    });
  }
}
