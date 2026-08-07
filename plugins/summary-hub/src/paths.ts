import { homedir } from "node:os";
import { join } from "node:path";
import type { SummaryPeriod } from "./types.js";

export function globalSummariesRoot(): string {
  return join(homedir(), ".config", "bb", "summaries");
}

export function projectSummariesRoot(projectRootPath: string): string {
  return join(projectRootPath, ".bb", "summaries");
}

export function summaryDirectory(
  scope: "project" | "global",
  period: SummaryPeriod,
  projectRootPath?: string,
): string {
  const root =
    scope === "global"
      ? globalSummariesRoot()
      : projectSummariesRoot(projectRootPath ?? "");
  return join(root, period);
}

export function summaryFilePath(
  scope: "project" | "global",
  period: SummaryPeriod,
  dateKey: string,
  projectRootPath?: string,
): string {
  return join(summaryDirectory(scope, period, projectRootPath), `${dateKey}.json`);
}
