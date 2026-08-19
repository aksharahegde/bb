import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { hostFileArgs, resolveProjectSource } from "../project-source.js";
import type { CollectedDecision } from "../types.js";

const ADR_FILE_PATTERN = /^ADR-\d{3}-.+\.md$/i;

function isMissingDirectoryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\bENOENT\b|does not exist|not found/i.test(message);
}

function parseFrontmatterDate(raw: string): string | null {
  const match = /^---\n[\s\S]*?\ndate:\s*([^\n]+)\n[\s\S]*?---/m.exec(raw);
  return match?.[1]?.trim() ?? null;
}

function parseFrontmatterTitle(raw: string): string {
  const match = /^---\n[\s\S]*?\ntitle:\s*([^\n]+)\n[\s\S]*?---/m.exec(raw);
  return match?.[1]?.trim() ?? "Untitled decision";
}

function parseFrontmatterStatus(raw: string): string {
  const match = /^---\n[\s\S]*?\nstatus:\s*([^\n]+)\n[\s\S]*?---/m.exec(raw);
  return match?.[1]?.trim() ?? "proposed";
}

function parseDecisionId(filename: string): string | null {
  const match = /^ADR-(\d{3})-/i.exec(filename);
  if (match === null) return null;
  return `ADR-${match[1]}`;
}

function inWindow(
  isoTimestamp: string | null,
  start: Date,
  end: Date,
): boolean {
  if (isoTimestamp === null || isoTimestamp.trim().length === 0) return false;
  const value = Date.parse(isoTimestamp);
  if (!Number.isFinite(value)) return false;
  return value >= start.getTime() && value < end.getTime();
}

export async function collectDecisions(
  bb: BbPluginApi,
  projectId: string,
  start: Date,
  end: Date,
): Promise<CollectedDecision[]> {
  const source = await resolveProjectSource(bb, projectId);
  const directory = `${source.rootPath}/.bb/decisions`;
  try {
    const listing = await bb.sdk.files.listPaths({
      ...hostFileArgs(source),
      path: directory,
      includeFiles: true,
      includeDirectories: false,
    });
    const decisions: CollectedDecision[] = [];
    for (const entry of listing.paths) {
      if (entry.kind !== "file") continue;
      const filename = entry.path.split("/").at(-1) ?? entry.path;
      if (!ADR_FILE_PATTERN.test(filename)) continue;
      const file = await bb.sdk.files.read({
        ...hostFileArgs(source),
        path: `${directory}/${filename}`,
      });
      if (file.contentEncoding !== "utf8") continue;
      const date = parseFrontmatterDate(file.content);
      if (!inWindow(date, start, end)) continue;
      const id = parseDecisionId(filename);
      if (id === null) continue;
      decisions.push({
        id,
        title: parseFrontmatterTitle(file.content),
        status: parseFrontmatterStatus(file.content),
        date: date ?? new Date().toISOString(),
      });
    }
    return decisions.sort((left, right) => right.date.localeCompare(left.date));
  } catch (error) {
    if (isMissingDirectoryError(error)) return [];
    throw error;
  }
}
