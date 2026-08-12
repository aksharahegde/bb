import type { ContextChunk } from "./types.js";
import { DEFAULT_TOTAL_CONTEXT_MAX_CHARS } from "./types.js";

export interface BudgetContextChunksArgs {
  chunks: readonly ContextChunk[];
  totalMaxChars?: number;
}

export interface BudgetedContextChunk extends ContextChunk {
  truncated: boolean;
}

/**
 * Apply per-chunk maxChars, then enforce a total budget by dropping lowest
 * priority (highest priority number) chunks last-in-first-out after cap.
 */
export function budgetContextChunks(
  args: BudgetContextChunksArgs,
): BudgetedContextChunk[] {
  const totalMax = args.totalMaxChars ?? DEFAULT_TOTAL_CONTEXT_MAX_CHARS;
  const capped: BudgetedContextChunk[] = args.chunks.map((chunk) => {
    const max = chunk.maxChars;
    if (max === undefined || chunk.text.length <= max) {
      return { ...chunk, truncated: false };
    }
    return {
      ...chunk,
      text: chunk.text.slice(0, max),
      truncated: true,
    };
  });

  let total = capped.reduce((sum, chunk) => sum + chunk.text.length, 0);
  if (total <= totalMax) {
    return capped;
  }

  // Drop from the end (lowest priority / later chunks) until under budget.
  const kept = [...capped];
  while (kept.length > 1 && total > totalMax) {
    const removed = kept.pop();
    if (!removed) break;
    total -= removed.text.length;
  }

  if (total > totalMax && kept.length === 1) {
    const only = kept[0]!;
    kept[0] = {
      ...only,
      text: only.text.slice(0, totalMax),
      truncated: true,
    };
  }

  return kept;
}
