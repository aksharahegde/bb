import type {
  UsageHistoryEvent,
  UsageHistoryFileCursor,
} from "@bb/host-daemon-contract";

export const USAGE_HISTORY_SCAN_BUDGET_MS = 5_000;

export interface UsageHistoryScanBudget {
  deadline: number;
  limit: number;
  sinceMs: number | null;
  truncated: boolean;
}

export interface UsageHistoryScanAccumulator {
  events: UsageHistoryEvent[];
  fileCursors: UsageHistoryFileCursor[];
  seenEventIds: Set<string>;
}

export function createUsageHistoryScanBudget(args: {
  limit: number;
  sinceDays: number | null;
  now?: number;
  budgetMs?: number;
}): UsageHistoryScanBudget {
  const now = args.now ?? Date.now();
  return {
    deadline: now + (args.budgetMs ?? USAGE_HISTORY_SCAN_BUDGET_MS),
    limit: args.limit,
    sinceMs:
      args.sinceDays === null
        ? null
        : now - args.sinceDays * 86_400_000,
    truncated: false,
  };
}

export function createUsageHistoryScanAccumulator(
  fileCursors: UsageHistoryFileCursor[],
): UsageHistoryScanAccumulator {
  return {
    events: [],
    fileCursors: [...fileCursors],
    seenEventIds: new Set<string>(),
  };
}

export function isPastUsageHistoryDeadline(deadline: number): boolean {
  return Date.now() > deadline;
}

export function shouldStopUsageHistoryScan(
  budget: UsageHistoryScanBudget,
  accumulator: UsageHistoryScanAccumulator,
): boolean {
  if (accumulator.events.length >= budget.limit) {
    budget.truncated = true;
    return true;
  }
  if (isPastUsageHistoryDeadline(budget.deadline)) {
    budget.truncated = true;
    return true;
  }
  return false;
}

export function eventPassesSinceFilter(
  occurredAt: string,
  sinceMs: number | null,
): boolean {
  if (sinceMs === null) {
    return true;
  }
  const occurredMs = Date.parse(occurredAt);
  return Number.isFinite(occurredMs) && occurredMs >= sinceMs;
}

export function pushUsageHistoryEvent(
  accumulator: UsageHistoryScanAccumulator,
  budget: UsageHistoryScanBudget,
  event: UsageHistoryEvent,
): boolean {
  if (!eventPassesSinceFilter(event.occurredAt, budget.sinceMs)) {
    return false;
  }
  if (accumulator.seenEventIds.has(event.id)) {
    return false;
  }
  accumulator.seenEventIds.add(event.id);
  accumulator.events.push(event);
  return true;
}

export function upsertFileCursor(
  accumulator: UsageHistoryScanAccumulator,
  cursor: UsageHistoryFileCursor,
): void {
  const index = accumulator.fileCursors.findIndex(
    (entry) => entry.path === cursor.path,
  );
  if (index === -1) {
    accumulator.fileCursors.push(cursor);
    return;
  }
  accumulator.fileCursors[index] = cursor;
}

export function readFileCursor(
  accumulator: UsageHistoryScanAccumulator,
  path: string,
): UsageHistoryFileCursor | null {
  return accumulator.fileCursors.find((entry) => entry.path === path) ?? null;
}
