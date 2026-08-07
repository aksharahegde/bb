import type { BbPluginApi } from "@bb/plugin-sdk";
import {
  parseDecisionDocument,
  toDecisionSummary,
  updateFrontmatterStatus,
} from "./adr.js";
import {
  decisionsDirectory,
  hostFileArgs,
  resolveProjectSource,
  type ProjectSource,
} from "./project-source.js";
import { renderActiveCatalog } from "./catalog.js";
import {
  decisionFilename,
  formatDecisionMarkdown,
  nextDecisionId,
  parseDecisionId,
  type CreateDecisionInput,
  type DecisionRecord,
  type DecisionStatus,
  type DecisionSummary,
} from "./types.js";

const ADR_FILE_PATTERN = /^ADR-\d{3}-.+\.md$/i;

function isMissingDirectoryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\bENOENT\b|does not exist|not found/i.test(message);
}

function compareDecisions(left: DecisionSummary, right: DecisionSummary): number {
  const leftNumber = Number.parseInt(left.id.replace(/^ADR-/i, ""), 10);
  const rightNumber = Number.parseInt(right.id.replace(/^ADR-/i, ""), 10);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return rightNumber - leftNumber;
  }
  return right.id.localeCompare(left.id);
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").at(-1) ?? path;
}

function matchesFilters(
  decision: DecisionSummary,
  args: {
    query?: string;
    tag?: string;
    status?: DecisionStatus;
  },
): boolean {
  if (args.status !== undefined && decision.status !== args.status) return false;
  if (args.tag !== undefined) {
    const needle = args.tag.trim().toLowerCase();
    if (
      !decision.tags.some((tag) => tag.toLowerCase() === needle) &&
      !decision.tags.some((tag) => tag.toLowerCase().includes(needle))
    ) {
      return false;
    }
  }
  if (args.query !== undefined && args.query.trim().length > 0) {
    const needle = args.query.trim().toLowerCase();
    const haystack = [
      decision.id,
      decision.title,
      decision.snippet ?? "",
      decision.tags.join(" "),
      decision.authors.join(" "),
    ]
      .join("\n")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export class DecisionStore {
  constructor(private readonly bb: BbPluginApi) {}

  async listDecisionFilenames(source: ProjectSource): Promise<string[]> {
    const directory = decisionsDirectory(source);
    try {
      const listing = await this.bb.sdk.files.listPaths({
        ...hostFileArgs(source),
        path: directory,
        includeFiles: true,
        includeDirectories: false,
      });
      return listing.paths
        .filter((entry) => entry.kind === "file")
        .map((entry) => basename(entry.path))
        .filter((filename) => ADR_FILE_PATTERN.test(filename))
        .sort();
    } catch (error) {
      if (isMissingDirectoryError(error)) return [];
      throw error;
    }
  }

  async readDecisionFile(
    source: ProjectSource,
    filename: string,
    query?: string,
  ): Promise<DecisionRecord> {
    const file = await this.bb.sdk.files.read({
      ...hostFileArgs(source),
      path: `${decisionsDirectory(source)}/${filename}`,
    });
    if (file.contentEncoding !== "utf8") {
      throw new Error(`Decision file "${filename}" is not UTF-8 text`);
    }
    return parseDecisionDocument(file.content, filename, query);
  }

  async listDecisions(
    projectId: string,
    filters: {
      query?: string;
      tag?: string;
      status?: DecisionStatus;
    } = {},
  ): Promise<DecisionSummary[]> {
    const source = await resolveProjectSource(this.bb, projectId);
    const filenames = await this.listDecisionFilenames(source);
    const decisions: DecisionSummary[] = [];
    for (const filename of filenames) {
      const record = await this.readDecisionFile(source, filename, filters.query);
      const summary = toDecisionSummary(record, filters.query);
      if (matchesFilters(summary, filters)) {
        decisions.push(summary);
      }
    }
    return decisions.sort(compareDecisions);
  }

  async readDecision(projectId: string, id: string): Promise<DecisionRecord> {
    const source = await resolveProjectSource(this.bb, projectId);
    const filenames = await this.listDecisionFilenames(source);
    const normalized = id.trim().toUpperCase();
    const filename =
      filenames.find((candidate) => parseDecisionId(candidate)?.toUpperCase() === normalized) ??
      null;
    if (filename === null) {
      throw new Error(`Decision "${id}" was not found`);
    }
    return this.readDecisionFile(source, filename);
  }

  async createDecision(
    projectId: string,
    input: CreateDecisionInput,
    authors: string[],
  ): Promise<DecisionRecord> {
    const source = await resolveProjectSource(this.bb, projectId);
    const filenames = await this.listDecisionFilenames(source);
    const existingIds = filenames
      .map((filename) => parseDecisionId(filename))
      .filter((value): value is string => value !== null);
    const id = nextDecisionId(existingIds);
    const frontmatter = {
      id,
      title: input.title.trim(),
      status: input.status ?? "proposed",
      date: new Date().toISOString().slice(0, 10),
      authors,
      tags: input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0),
      superseded_by: null,
    };
    const content = formatDecisionMarkdown(frontmatter, {
      context: input.context,
      choice: input.choice,
      trade_offs: input.trade_offs,
    });
    const filename = decisionFilename(id, frontmatter.title);
    await this.bb.sdk.files.mkdir({
      ...hostFileArgs(source),
      path: decisionsDirectory(source),
      recursive: true,
    });
    await this.bb.sdk.files.write({
      ...hostFileArgs(source),
      path: `${decisionsDirectory(source)}/${filename}`,
      content,
      contentEncoding: "utf8",
      createParents: true,
    });
    return parseDecisionDocument(content, filename);
  }

  async updateDecisionStatus(
    projectId: string,
    id: string,
    status: DecisionStatus,
    supersededBy: string | null,
  ): Promise<DecisionRecord> {
    const source = await resolveProjectSource(this.bb, projectId);
    const record = await this.readDecision(projectId, id);
    const updated = updateFrontmatterStatus(record.raw, status, supersededBy);
    await this.bb.sdk.files.write({
      ...hostFileArgs(source),
      path: `${decisionsDirectory(source)}/${record.filename}`,
      content: updated,
      contentEncoding: "utf8",
    });
    return parseDecisionDocument(updated, record.filename);
  }

  async saveDecisionRaw(
    projectId: string,
    id: string,
    raw: string,
  ): Promise<DecisionRecord> {
    const source = await resolveProjectSource(this.bb, projectId);
    const record = await this.readDecision(projectId, id);
    parseDecisionDocument(raw, record.filename);
    await this.bb.sdk.files.write({
      ...hostFileArgs(source),
      path: `${decisionsDirectory(source)}/${record.filename}`,
      content: raw,
      contentEncoding: "utf8",
    });
    return parseDecisionDocument(raw, record.filename);
  }

  async renderActiveCatalog(projectId: string): Promise<string | null> {
    const decisions = await this.listDecisions(projectId);
    return renderActiveCatalog(decisions);
  }
}
