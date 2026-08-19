import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { hostFileArgs, resolveProjectSource } from "./project-source.js";
import {
  globalSummariesRoot,
  projectSummariesRoot,
  summaryDirectory,
  summaryFilePath,
} from "./paths.js";
import {
  summaryRecordSchema,
  type SummaryPeriod,
  type SummaryRecord,
  type SummaryScope,
} from "./types.js";

function isMissingFileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\bENOENT\b|does not exist|not found/i.test(message);
}

function parseSummary(raw: string): SummaryRecord {
  const parsed = JSON.parse(raw) as unknown;
  return summaryRecordSchema.parse(parsed);
}

function compareDateKeys(left: string, right: string): number {
  return right.localeCompare(left);
}

export class SummaryStore {
  constructor(private readonly bb: BbPluginApi) {}

  private async ensureGlobalDir(period: SummaryPeriod): Promise<void> {
    await mkdir(summaryDirectory("global", period), { recursive: true });
  }

  private async ensureProjectDir(
    projectId: string,
    period: SummaryPeriod,
  ): Promise<void> {
    const source = await resolveProjectSource(this.bb, projectId);
    await this.bb.sdk.files.mkdir({
      ...hostFileArgs(source),
      path: `${projectSummariesRoot(source.rootPath)}/${period}`,
      recursive: true,
    });
  }

  async saveProjectSummary(
    projectId: string,
    period: SummaryPeriod,
    summary: SummaryRecord,
  ): Promise<void> {
    const source = await resolveProjectSource(this.bb, projectId);
    const path = summaryFilePath("project", period, summary.date_key, source.rootPath);
    await this.bb.sdk.files.mkdir({
      ...hostFileArgs(source),
      path: dirname(path),
      recursive: true,
    });
    const content = `${JSON.stringify(summary, null, 2)}\n`;
    const result = await this.bb.sdk.files.write({
      ...hostFileArgs(source),
      path,
      content,
      contentEncoding: "utf8",
      createParents: true,
    });
    if (result.outcome === "conflict") {
      throw new Error("Summary file changed concurrently; retry generation");
    }
  }

  async saveGlobalSummary(
    period: SummaryPeriod,
    summary: SummaryRecord,
  ): Promise<void> {
    await this.ensureGlobalDir(period);
    const path = summaryFilePath("global", period, summary.date_key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }

  async getProjectSummary(
    projectId: string,
    period: SummaryPeriod,
    dateKey: string,
  ): Promise<SummaryRecord | null> {
    const source = await resolveProjectSource(this.bb, projectId);
    const path = summaryFilePath("project", period, dateKey, source.rootPath);
    try {
      const file = await this.bb.sdk.files.read({
        ...hostFileArgs(source),
        path,
      });
      if (file.contentEncoding !== "utf8") {
        throw new Error("Summary file is not UTF-8 text");
      }
      return parseSummary(file.content);
    } catch (error) {
      if (isMissingFileError(error)) return null;
      throw error;
    }
  }

  async getGlobalSummary(
    period: SummaryPeriod,
    dateKey: string,
  ): Promise<SummaryRecord | null> {
    const path = summaryFilePath("global", period, dateKey);
    try {
      const raw = await readFile(path, "utf8");
      return parseSummary(raw);
    } catch (error) {
      if (isMissingFileError(error)) return null;
      throw error;
    }
  }

  async getSummary(
    scope: SummaryScope,
    period: SummaryPeriod,
    dateKey: string,
    projectId?: string,
  ): Promise<SummaryRecord | null> {
    if (scope === "global") {
      return this.getGlobalSummary(period, dateKey);
    }
    if (projectId === undefined) {
      throw new Error("projectId is required for project scope");
    }
    return this.getProjectSummary(projectId, period, dateKey);
  }

  async listProjectSummaries(
    projectId: string,
    period: SummaryPeriod,
    limit = 30,
  ): Promise<SummaryRecord[]> {
    const source = await resolveProjectSource(this.bb, projectId);
    const directory = summaryDirectory("project", period, source.rootPath);
    try {
      const listing = await this.bb.sdk.files.listPaths({
        ...hostFileArgs(source),
        path: directory,
        includeFiles: true,
        includeDirectories: false,
      });
      const filenames = listing.paths
        .filter((entry) => entry.kind === "file" && entry.path.endsWith(".json"))
        .map((entry) => entry.path.split("/").at(-1) ?? entry.path)
        .sort((left, right) => compareDateKeys(left, right))
        .slice(0, limit);
      const summaries: SummaryRecord[] = [];
      for (const filename of filenames) {
        const dateKey = filename.replace(/\.json$/u, "");
        const summary = await this.getProjectSummary(projectId, period, dateKey);
        if (summary !== null) summaries.push(summary);
      }
      return summaries;
    } catch (error) {
      if (isMissingFileError(error)) return [];
      throw error;
    }
  }

  async listGlobalSummaries(
    period: SummaryPeriod,
    limit = 30,
  ): Promise<SummaryRecord[]> {
    const directory = summaryDirectory("global", period);
    try {
      const entries = await readdir(directory);
      const filenames = entries
        .filter((entry) => entry.endsWith(".json"))
        .sort((left, right) => compareDateKeys(left, right))
        .slice(0, limit);
      const summaries: SummaryRecord[] = [];
      for (const filename of filenames) {
        const dateKey = filename.replace(/\.json$/u, "");
        const summary = await this.getGlobalSummary(period, dateKey);
        if (summary !== null) summaries.push(summary);
      }
      return summaries;
    } catch (error) {
      if (isMissingFileError(error)) return [];
      throw error;
    }
  }

  async listSummaries(args: {
    scope?: SummaryScope;
    period?: SummaryPeriod;
    limit?: number;
    projectId?: string;
  }): Promise<SummaryRecord[]> {
    const limit = args.limit ?? 30;
    if (args.scope === "global") {
      if (args.period === undefined) {
        const daily = await this.listGlobalSummaries("daily", limit);
        const weekly = await this.listGlobalSummaries("weekly", limit);
        return [...daily, ...weekly]
          .sort((left, right) =>
            right.created_at.localeCompare(left.created_at),
          )
          .slice(0, limit);
      }
      return this.listGlobalSummaries(args.period, limit);
    }
    if (args.projectId === undefined) {
      throw new Error("projectId is required for project summaries");
    }
    if (args.period === undefined) {
      const daily = await this.listProjectSummaries(args.projectId, "daily", limit);
      const weekly = await this.listProjectSummaries(
        args.projectId,
        "weekly",
        limit,
      );
      return [...daily, ...weekly]
        .sort((left, right) =>
          right.created_at.localeCompare(left.created_at),
        )
        .slice(0, limit);
    }
    return this.listProjectSummaries(args.projectId, args.period, limit);
  }

  async initializeDirectories(projectId?: string): Promise<void> {
    await this.ensureGlobalDir("daily");
    await this.ensureGlobalDir("weekly");
    if (projectId !== undefined) {
      await this.ensureProjectDir(projectId, "daily");
      await this.ensureProjectDir(projectId, "weekly");
    }
  }
}

export async function ensureGlobalDirectories(): Promise<void> {
  await mkdir(globalSummariesRoot(), { recursive: true });
  await mkdir(summaryDirectory("global", "daily"), { recursive: true });
  await mkdir(summaryDirectory("global", "weekly"), { recursive: true });
}
