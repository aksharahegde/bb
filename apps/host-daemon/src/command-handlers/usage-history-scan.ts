import type { UsageHistoryScanResult } from "@bb/host-daemon-contract";
import { scanClaudeCodeHistory } from "./usage-history-claude.js";
import {
  scanCursorAgentHistory,
  scanCursorIdeHistory,
} from "./usage-history-cursor.js";
import {
  createUsageHistoryScanAccumulator,
  createUsageHistoryScanBudget,
} from "./usage-history-common.js";

export interface ScanUsageHistoryArgs {
  sinceDays: number | null;
  limit: number;
  fileCursors: Array<{
    path: string;
    byteOffset: number;
    mtimeMs: number;
  }>;
  now?: number;
  projectsRoot?: string;
  cursorDatabasePaths?: string[];
  cursorSessionRoots?: string[];
}

export async function scanUsageHistory(
  args: ScanUsageHistoryArgs,
): Promise<UsageHistoryScanResult> {
  const now = args.now ?? Date.now();
  const budget = createUsageHistoryScanBudget({
    limit: args.limit,
    sinceDays: args.sinceDays,
    now,
  });
  const accumulator = createUsageHistoryScanAccumulator(args.fileCursors);

  await scanClaudeCodeHistory({
    budget,
    accumulator,
    ...(args.projectsRoot !== undefined ? { projectsRoot: args.projectsRoot } : {}),
  });
  await scanCursorIdeHistory({
    budget,
    accumulator,
    ...(args.cursorDatabasePaths !== undefined
      ? { databasePaths: args.cursorDatabasePaths }
      : {}),
  });
  await scanCursorAgentHistory({
    budget,
    accumulator,
    ...(args.cursorSessionRoots !== undefined
      ? { sessionRoots: args.cursorSessionRoots }
      : {}),
  });

  return {
    events: accumulator.events,
    fileCursors: accumulator.fileCursors,
    truncated: budget.truncated,
    scannedAt: new Date(now).toISOString(),
  };
}
