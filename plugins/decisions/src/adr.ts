import { parse } from "yaml";
import {
  DECISION_STATUSES,
  type DecisionFrontmatter,
  type DecisionRecord,
  type DecisionStatus,
  type DecisionSummary,
  extractSnippet,
  parseDecisionId,
} from "./types.js";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Decision frontmatter field "${field}" must be a non-empty string`);
  }
  return value.trim();
}

function readStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Decision frontmatter field "${field}" must be a string array`);
  }
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

function readStatus(value: unknown): DecisionStatus {
  if (typeof value !== "string" || !DECISION_STATUSES.includes(value as DecisionStatus)) {
    throw new Error(
      `Decision frontmatter field "status" must be one of: ${DECISION_STATUSES.join(", ")}`,
    );
  }
  return value as DecisionStatus;
}

function readNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error('Decision frontmatter field "superseded_by" must be a string or null');
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseDecisionFrontmatter(
  source: string,
  filename: string,
): DecisionFrontmatter {
  const match = FRONTMATTER_PATTERN.exec(source);
  if (!match) {
    throw new Error(`Decision file "${filename}" is missing YAML frontmatter`);
  }
  let metadata: unknown;
  try {
    metadata = parse(match[1] ?? "", { maxAliasCount: 20 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Decision file "${filename}" has invalid YAML frontmatter: ${message}`);
  }
  if (!isRecord(metadata)) {
    throw new Error(`Decision file "${filename}" frontmatter must be a YAML mapping`);
  }

  const id = readString(metadata.id, "id");
  const parsedId = parseDecisionId(filename);
  if (parsedId !== null && parsedId !== id) {
    throw new Error(
      `Decision file "${filename}" id "${id}" does not match filename id "${parsedId}"`,
    );
  }

  return {
    id,
    title: readString(metadata.title, "title"),
    status: readStatus(metadata.status),
    date: readString(metadata.date, "date"),
    authors: readStringArray(metadata.authors, "authors"),
    tags: readStringArray(metadata.tags, "tags"),
    superseded_by: readNullableString(metadata.superseded_by),
  };
}

export function parseDecisionDocument(
  source: string,
  filename: string,
  query?: string,
): DecisionRecord {
  const frontmatter = parseDecisionFrontmatter(source, filename);
  const body = source.replace(FRONTMATTER_PATTERN, "");
  return {
    ...frontmatter,
    filename,
    body,
    raw: source,
    snippet: extractSnippet(body, query),
  };
}

export function toDecisionSummary(
  record: DecisionRecord,
  query?: string,
): DecisionSummary {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    date: record.date,
    authors: record.authors,
    tags: record.tags,
    superseded_by: record.superseded_by,
    filename: record.filename,
    snippet: extractSnippet(record.body, query),
  };
}

export function updateFrontmatterStatus(
  source: string,
  status: DecisionStatus,
  supersededBy: string | null,
): string {
  const match = FRONTMATTER_PATTERN.exec(source);
  if (!match) {
    throw new Error("Decision file is missing YAML frontmatter");
  }
  let metadata: unknown;
  try {
    metadata = parse(match[1] ?? "", { maxAliasCount: 20 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid YAML frontmatter: ${message}`);
  }
  if (!isRecord(metadata)) {
    throw new Error("Decision frontmatter must be a YAML mapping");
  }

  metadata.status = status;
  metadata.superseded_by = supersededBy;

  const yamlLines = [
    "---",
    `id: ${JSON.stringify(String(metadata.id ?? ""))}`,
    `title: ${JSON.stringify(String(metadata.title ?? ""))}`,
    `status: ${JSON.stringify(status)}`,
    `date: ${JSON.stringify(String(metadata.date ?? ""))}`,
    `authors: ${JSON.stringify(Array.isArray(metadata.authors) ? metadata.authors : [])}`,
    `tags: ${JSON.stringify(Array.isArray(metadata.tags) ? metadata.tags : [])}`,
    `superseded_by: ${supersededBy === null ? "null" : JSON.stringify(supersededBy)}`,
    "---",
  ];

  return `${yamlLines.join("\n")}\n${source.replace(FRONTMATTER_PATTERN, "")}`;
}
