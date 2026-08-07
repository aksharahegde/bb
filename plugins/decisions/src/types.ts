export const DECISION_STATUSES = [
  "proposed",
  "accepted",
  "rejected",
  "superseded",
  "deprecated",
] as const;

export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export interface DecisionFrontmatter {
  id: string;
  title: string;
  status: DecisionStatus;
  date: string;
  authors: string[];
  tags: string[];
  superseded_by: string | null;
}

export interface DecisionSummary {
  id: string;
  title: string;
  status: DecisionStatus;
  date: string;
  authors: string[];
  tags: string[];
  superseded_by: string | null;
  filename: string;
  snippet: string | null;
}

export interface DecisionRecord extends DecisionSummary {
  body: string;
  raw: string;
}

export interface CreateDecisionInput {
  title: string;
  context: string;
  choice: string;
  trade_offs: string[];
  tags: string[];
  authors?: string[];
  status?: DecisionStatus;
}

export function isDecisionStatus(value: string): value is DecisionStatus {
  return DECISION_STATUSES.some((status) => status === value);
}

export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug.length > 0 ? slug : "decision";
}

export function decisionFilename(id: string, title: string): string {
  return `${id}-${slugifyTitle(title)}.md`;
}

export function parseDecisionId(filename: string): string | null {
  const match = /^ADR-(\d{3})-/i.exec(pathBasename(filename));
  if (!match) return null;
  return `ADR-${match[1]}`;
}

function pathBasename(filename: string): string {
  const normalized = filename.replace(/\\/g, "/");
  return normalized.split("/").at(-1) ?? normalized;
}

export function nextDecisionId(existingIds: string[]): string {
  const numbers = existingIds
    .map((id) => /^ADR-(\d+)$/i.exec(id)?.[1])
    .filter((value): value is string => value !== undefined)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));
  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `ADR-${String(next).padStart(3, "0")}`;
}

export function formatDecisionMarkdown(
  frontmatter: DecisionFrontmatter,
  sections: {
    context: string;
    choice: string;
    trade_offs: string[];
  },
): string {
  const tradeOffLines =
    sections.trade_offs.length > 0
      ? sections.trade_offs.map((item) => `- ${item}`).join("\n")
      : "- None recorded.";

  const yaml = [
    "---",
    `id: ${frontmatter.id}`,
    `title: ${JSON.stringify(frontmatter.title)}`,
    `status: ${JSON.stringify(frontmatter.status)}`,
    `date: ${JSON.stringify(frontmatter.date)}`,
    `authors: ${JSON.stringify(frontmatter.authors)}`,
    `tags: ${JSON.stringify(frontmatter.tags)}`,
    `superseded_by: ${frontmatter.superseded_by === null ? "null" : JSON.stringify(frontmatter.superseded_by)}`,
    "---",
  ].join("\n");

  return [
    yaml,
    "",
    "## Context & Problem Statement",
    "",
    sections.context.trim(),
    "",
    "## Decision Drivers",
    "",
    "- Recorded through the project decision log.",
    "",
    "## Considered Options",
    "",
    "1. Options were discussed during the decision session.",
    "",
    "## Decision Outcome",
    "",
    `Chosen Option: **${sections.choice.trim()}**`,
    "",
    "## Positive Consequences",
    "",
    "- Decision recorded for future alignment.",
    "",
    "## Negative Consequences / Trade-offs",
    "",
    tradeOffLines,
    "",
  ].join("\n");
}

export function extractSnippet(body: string, query?: string): string | null {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return null;
  if (!query || query.trim().length === 0) {
    return normalized.slice(0, 160);
  }
  const needle = query.trim().toLowerCase();
  const haystack = normalized.toLowerCase();
  const index = haystack.indexOf(needle);
  if (index < 0) return normalized.slice(0, 160);
  const start = Math.max(0, index - 40);
  const end = Math.min(normalized.length, index + needle.length + 80);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < normalized.length ? "…" : "";
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}
