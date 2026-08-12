import { z } from "zod";

export const changeImpactSeverityValues = [
  "none",
  "low",
  "medium",
  "high",
] as const;
export const changeImpactSeveritySchema = z.enum(changeImpactSeverityValues);
export type ChangeImpactSeverity = z.infer<typeof changeImpactSeveritySchema>;

export const changeImpactReportSchema = z
  .object({
    severity: changeImpactSeveritySchema,
    changedFileCount: z.number().int().nonnegative(),
    changedFiles: z.array(z.string()),
    sensitivePaths: z.array(z.string()),
    suggestedTests: z.array(z.string()),
    affectedHubs: z.array(z.string()),
    validationHints: z.array(z.string()),
    summary: z.string(),
  })
  .strict();
export type ChangeImpactReport = z.infer<typeof changeImpactReportSchema>;

const SENSITIVE_PATH_PATTERNS: RegExp[] = [
  /(^|\/)package\.json$/i,
  /(^|\/)pnpm-lock\.yaml$/i,
  /(^|\/)package-lock\.json$/i,
  /(^|\/)Cargo\.toml$/i,
  /(^|\/)go\.mod$/i,
  /(^|\/)\.github\//i,
  /(^|\/)migrations?\//i,
  /(^|\/)schema\./i,
  /(^|\/)auth\//i,
  /(^|\/)security\//i,
  /(^|\/)Dockerfile/i,
  /(^|\/)docker-compose/i,
];

const TEST_HINT_PATTERNS: Array<{ match: RegExp; hint: string }> = [
  {
    match: /\.(tsx?|jsx?)$/i,
    hint: "Run focused unit tests for changed modules",
  },
  {
    match: /(^|\/)(api|routes|server)\//i,
    hint: "Exercise HTTP/API paths that touch changed handlers",
  },
  {
    match: /(^|\/)(db|drizzle|schema)\//i,
    hint: "Run migration/schema tests and verify query contracts",
  },
  {
    match: /(^|\/)components?\//i,
    hint: "Smoke the affected UI surfaces",
  },
];

export interface ComputeChangeImpactArgs {
  changedFiles: readonly string[];
  /** Labels/ids from Graphify affected or god-node overlap. */
  affectedHubs?: readonly string[];
  maxListedFiles?: number;
}

function isSensitive(path: string): boolean {
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function deriveSuggestedTests(changedFiles: readonly string[]): string[] {
  const suggestions = new Set<string>();
  for (const file of changedFiles) {
    if (/\.(test|spec)\./i.test(file) || /(^|\/)__tests__\//i.test(file)) {
      suggestions.add(file);
      continue;
    }
    const withoutExt = file.replace(/\.[^.]+$/u, "");
    const candidates = [
      `${withoutExt}.test.ts`,
      `${withoutExt}.test.tsx`,
      `${withoutExt}.spec.ts`,
    ];
    for (const candidate of candidates) {
      suggestions.add(candidate);
    }
  }
  return [...suggestions].slice(0, 12);
}

function deriveValidationHints(changedFiles: readonly string[]): string[] {
  const hints = new Set<string>();
  for (const file of changedFiles) {
    for (const entry of TEST_HINT_PATTERNS) {
      if (entry.match.test(file)) hints.add(entry.hint);
    }
  }
  if (changedFiles.some(isSensitive)) {
    hints.add("Review lockfiles, CI, auth, and schema changes carefully");
  }
  hints.add('Before risky edits: bb graphify affected "<symbol-or-file>"');
  return [...hints];
}

export function scoreChangeImpactSeverity(args: {
  changedFileCount: number;
  sensitiveCount: number;
  affectedHubCount: number;
}): ChangeImpactSeverity {
  if (args.changedFileCount === 0) return "none";
  let score = 0;
  score += Math.min(args.changedFileCount, 40);
  score += args.sensitiveCount * 8;
  score += args.affectedHubCount * 6;
  if (score >= 36) return "high";
  if (score >= 16) return "medium";
  return "low";
}

export function computeChangeImpact(
  args: ComputeChangeImpactArgs,
): ChangeImpactReport {
  const maxListed = args.maxListedFiles ?? 24;
  const changedFiles = [
    ...new Set(args.changedFiles.map((path) => path.trim()).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right));
  const sensitivePaths = changedFiles.filter(isSensitive);
  const affectedHubs = [
    ...new Set(
      (args.affectedHubs ?? []).map((hub) => hub.trim()).filter(Boolean),
    ),
  ].slice(0, 16);
  const severity = scoreChangeImpactSeverity({
    changedFileCount: changedFiles.length,
    sensitiveCount: sensitivePaths.length,
    affectedHubCount: affectedHubs.length,
  });
  const listed = changedFiles.slice(0, maxListed);
  const suggestedTests = deriveSuggestedTests(changedFiles);
  const validationHints = deriveValidationHints(changedFiles);
  const summaryParts = [
    `${changedFiles.length} changed file${changedFiles.length === 1 ? "" : "s"}`,
    `severity ${severity}`,
  ];
  if (sensitivePaths.length > 0) {
    summaryParts.push(`${sensitivePaths.length} sensitive path(s)`);
  }
  if (affectedHubs.length > 0) {
    summaryParts.push(`${affectedHubs.length} graph hub(s) in blast radius`);
  }
  return {
    severity,
    changedFileCount: changedFiles.length,
    changedFiles: listed,
    sensitivePaths: sensitivePaths.slice(0, 12),
    suggestedTests,
    affectedHubs,
    validationHints,
    summary: summaryParts.join(" · "),
  };
}

export const CHANGE_IMPACT_CONTEXT_MAX_CHARS = 2000;

export function renderChangeImpactContextChunk(
  report: ChangeImpactReport,
): string {
  if (report.severity === "none") {
    return "";
  }
  const lines = [
    "Change Impact",
    report.summary,
    "",
    "Changed files:",
    ...report.changedFiles.map((path) => `- ${path}`),
  ];
  if (report.changedFileCount > report.changedFiles.length) {
    lines.push(
      `- …and ${report.changedFileCount - report.changedFiles.length} more`,
    );
  }
  if (report.sensitivePaths.length > 0) {
    lines.push("", "Sensitive paths:", ...report.sensitivePaths.map((p) => `- ${p}`));
  }
  if (report.affectedHubs.length > 0) {
    lines.push(
      "",
      "Graph hubs in blast radius:",
      ...report.affectedHubs.map((hub) => `- ${hub}`),
    );
  }
  if (report.validationHints.length > 0) {
    lines.push("", "Validation:", ...report.validationHints.map((h) => `- ${h}`));
  }
  lines.push(
    "",
    "Use `bb impact` for a refresh and `bb graphify affected` before risky edits.",
  );
  let text = lines.join("\n");
  if (text.length > CHANGE_IMPACT_CONTEXT_MAX_CHARS) {
    text = `${text.slice(0, CHANGE_IMPACT_CONTEXT_MAX_CHARS - 1)}…`;
  }
  return text;
}
