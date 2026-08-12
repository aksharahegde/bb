import { Command } from "commander";
import {
  computeChangeImpact,
  type ChangeImpactReport,
} from "@bb/domain";
import { action } from "../action.js";
import { createCliBbSdk } from "../client.js";
import { requireThreadIdOrSelf } from "../context-env.js";
import { outputJson } from "./helpers.js";

interface ImpactCommandOptions {
  json?: boolean;
  environment?: string;
  self?: boolean;
}

type ResolveServerUrl = () => string;

async function loadChangedPaths(args: {
  getUrl: ResolveServerUrl;
  environmentId: string;
}): Promise<string[]> {
  const sdk = createCliBbSdk(args.getUrl());
  const result = await sdk.environments.diffFiles({
    environmentId: args.environmentId,
    target: "uncommitted",
  });
  if (result.outcome !== "available") {
    return [];
  }
  return result.files.map((file) => file.path).filter(Boolean);
}

function printReport(report: ChangeImpactReport): void {
  process.stdout.write(`${report.summary}\n`);
  if (report.changedFiles.length > 0) {
    process.stdout.write("\nChanged files:\n");
    for (const path of report.changedFiles) {
      process.stdout.write(`  ${path}\n`);
    }
  }
  if (report.sensitivePaths.length > 0) {
    process.stdout.write("\nSensitive:\n");
    for (const path of report.sensitivePaths) {
      process.stdout.write(`  ${path}\n`);
    }
  }
  if (report.affectedHubs.length > 0) {
    process.stdout.write("\nHub hints:\n");
    for (const hub of report.affectedHubs) {
      process.stdout.write(`  ${hub}\n`);
    }
  }
  if (report.validationHints.length > 0) {
    process.stdout.write("\nValidation:\n");
    for (const hint of report.validationHints) {
      process.stdout.write(`  - ${hint}\n`);
    }
  }
}

export function registerImpactCommand(
  program: Command,
  getUrl: ResolveServerUrl,
): void {
  program
    .command("impact")
    .description(
      "Summarize change impact for a thread or environment (dirty tree + risk hints)",
    )
    .argument("[thread-id]", "Thread id (optional with --environment/--self)")
    .option("--json", "Print machine-readable JSON output")
    .option("--environment <id>", "Environment id")
    .option("--self", "Use BB_THREAD_ID")
    .action(
      action(async (threadIdArg: string | undefined, opts: ImpactCommandOptions) => {
        const sdk = createCliBbSdk(getUrl());
        let environmentId = opts.environment;
        if (!environmentId) {
          const threadId = requireThreadIdOrSelf(threadIdArg, {
            self: opts.self === true,
          });
          const thread = await sdk.threads.get({ threadId });
          if (!thread.environmentId) {
            throw new Error(`Thread ${threadId} has no environment`);
          }
          environmentId = thread.environmentId;
        }
        const changedFiles = await loadChangedPaths({
          getUrl,
          environmentId,
        });
        const report = computeChangeImpact({ changedFiles });
        if (opts.json) {
          outputJson(opts, report);
          return;
        }
        if (report.severity === "none") {
          process.stdout.write("No uncommitted changes.\n");
          return;
        }
        printReport(report);
      }),
    );
}
