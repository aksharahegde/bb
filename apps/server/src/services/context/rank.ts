import type { ContextChunk } from "./types.js";

/**
 * Sort by priority ascending, then id. Drop exact duplicate texts and
 * later chunks that share the same id.
 */
export function rankAndDedupeContextChunks(
  chunks: readonly ContextChunk[],
): ContextChunk[] {
  const sorted = [...chunks].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });
  const seenIds = new Set<string>();
  const seenTexts = new Set<string>();
  const result: ContextChunk[] = [];
  for (const chunk of sorted) {
    const trimmed = chunk.text.trim();
    if (trimmed.length === 0) continue;
    if (seenIds.has(chunk.id)) continue;
    if (seenTexts.has(trimmed)) continue;
    seenIds.add(chunk.id);
    seenTexts.add(trimmed);
    result.push({ ...chunk, text: trimmed });
  }
  return result;
}
