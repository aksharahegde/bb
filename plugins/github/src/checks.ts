export type CheckTrafficLight = "success" | "failure" | "pending" | "neutral";

export interface NormalizedCheck {
  name: string;
  status: CheckTrafficLight;
  url: string;
}

export interface ChecksSummary {
  success: number;
  failure: number;
  pending: number;
  neutral: number;
  failingNames: string[];
}

export interface StatusCheckRollupEntry {
  name?: unknown;
  context?: unknown;
  conclusion?: unknown;
  status?: unknown;
  state?: unknown;
  detailsUrl?: unknown;
  targetUrl?: unknown;
}

export function normalizeStatusCheckRollup(
  entries: StatusCheckRollupEntry[] | null | undefined,
): NormalizedCheck[] {
  return (entries ?? []).map((entry) => {
    const conclusion = String(entry.conclusion ?? entry.state ?? "").toUpperCase();
    const running =
      entry.conclusion === "" ||
      ["IN_PROGRESS", "QUEUED", "PENDING", "EXPECTED", "WAITING"].includes(
        String(entry.status ?? entry.state ?? "").toUpperCase(),
      );
    const status: CheckTrafficLight =
      conclusion === "SUCCESS"
        ? "success"
        : conclusion === "FAILURE" ||
            conclusion === "ERROR" ||
            conclusion === "TIMED_OUT"
          ? "failure"
          : running
            ? "pending"
            : "neutral";
    return {
      name: String(entry.name ?? entry.context ?? "check"),
      status,
      url: String(entry.detailsUrl ?? entry.targetUrl ?? ""),
    };
  });
}

export function summarizeChecks(checks: readonly NormalizedCheck[]): ChecksSummary {
  const summary: ChecksSummary = {
    success: 0,
    failure: 0,
    pending: 0,
    neutral: 0,
    failingNames: [],
  };
  for (const check of checks) {
    summary[check.status] += 1;
    if (check.status === "failure") {
      summary.failingNames.push(check.name);
    }
  }
  return summary;
}

export function emptyChecksSummary(): ChecksSummary {
  return {
    success: 0,
    failure: 0,
    pending: 0,
    neutral: 0,
    failingNames: [],
  };
}

export function formatChecksSummaryLine(summary: ChecksSummary): string {
  const parts = [
    `${summary.success} passed`,
    `${summary.failure} failed`,
    `${summary.pending} pending`,
  ];
  if (summary.neutral > 0) {
    parts.push(`${summary.neutral} neutral`);
  }
  let line = `CI: ${parts.join(", ")}`;
  if (summary.failingNames.length > 0) {
    line += ` · failing: ${summary.failingNames.slice(0, 8).join(", ")}`;
  }
  return line;
}
