import type { DecisionSummary } from "./types.js";

export function renderActiveCatalog(decisions: DecisionSummary[]): string | null {
  const active = decisions.filter((decision) => decision.status === "accepted");
  if (active.length === 0) return null;
  const compact = active
    .slice(0, 12)
    .map((decision) => `${decision.id} (${decision.title})`)
    .join(", ");
  return `[Active Project Decisions: ${compact}. Ensure generated code aligns with these choices.]`;
}
