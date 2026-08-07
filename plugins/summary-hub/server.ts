import {
  type BbPluginApi,
  type PluginAgentToolResult,
} from "@bb/plugin-sdk";
import { z } from "zod";
import { REALTIME_CHANNEL, summaryHubRpcContract } from "./contract.js";
import { formatDailyDateKey } from "./src/dates.js";
import { exportSummary } from "./src/export.js";
import { SummaryGenerator } from "./src/generator.js";
import { ensureGlobalDirectories, SummaryStore } from "./src/store.js";
import { SUMMARY_PERIODS, SUMMARY_SCOPES } from "./src/types.js";

export { REALTIME_CHANNEL, summaryHubRpcContract } from "./contract.js";

function toolError(message: string): PluginAgentToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function toolJson(value: unknown): PluginAgentToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

export default async function plugin(bb: BbPluginApi) {
  await ensureGlobalDirectories();
  const store = new SummaryStore(bb);
  const generator = new SummaryGenerator(bb, store);

  function publishChanged(scope: string, period: string, dateKey: string): void {
    bb.realtime.publish(REALTIME_CHANNEL, {
      scope,
      period,
      dateKey,
      at: Date.now(),
    });
  }

  bb.rpc.register(summaryHubRpcContract, {
    async listProjects() {
      const projects = await bb.sdk.projects.list({ includePersonal: true });
      return {
        projects: projects.map((project) => ({
          id: project.id,
          name: project.name,
          kind: project.kind,
          hasSource: project.sources.length > 0,
        })),
      };
    },
    async getSummary(input) {
      return {
        summary: await store.getSummary(
          input.scope,
          input.period,
          input.dateKey,
          input.projectId,
        ),
      };
    },
    async listSummaries(input) {
      return {
        summaries: await store.listSummaries(input),
      };
    },
    async generateSummary(input) {
      const summary = await generator.generate(
        input.scope,
        input.period,
        input.targetDate,
        input.projectId,
      );
      publishChanged(summary.scope, summary.period, summary.date_key);
      return { summary };
    },
    async exportSummary(input) {
      const summary = await store.getSummary(
        input.scope,
        input.period,
        input.dateKey,
        input.projectId,
      );
      if (summary === null || summary.id !== input.summaryId) {
        throw new Error(`Summary "${input.summaryId}" was not found`);
      }
      return { content: exportSummary(summary, input.format) };
    },
    async ensureTodaySummary(input) {
      const today = formatDailyDateKey(new Date());
      const existing = await store.getProjectSummary(
        input.projectId,
        "daily",
        today,
      );
      if (existing !== null) {
        return { generated: false, summary: existing };
      }
      const summary = await generator.generateProjectSummary(
        input.projectId,
        "daily",
        today,
      );
      publishChanged(summary.scope, summary.period, summary.date_key);
      return { generated: true, summary };
    },
  });

  bb.agents.registerTool({
    name: "generate_summary",
    description:
      "Aggregate git logs, tasks, ADRs, and agent threads into a daily or weekly summary and persist it.",
    parameters: z
      .object({
        scope: z.enum(SUMMARY_SCOPES),
        period: z.enum(SUMMARY_PERIODS),
        target_date: z.string().optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const summary = await generator.generate(
          input.scope,
          input.period,
          input.target_date,
          ctx.projectId,
        );
        publishChanged(summary.scope, summary.period, summary.date_key);
        return toolJson({ id: summary.id, date_key: summary.date_key });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "get_summary",
    description: "Fetch a persisted daily or weekly summary by scope and date key.",
    parameters: z
      .object({
        scope: z.enum(SUMMARY_SCOPES),
        period: z.enum(SUMMARY_PERIODS),
        date_key: z.string(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const summary = await store.getSummary(
          input.scope,
          input.period,
          input.date_key,
          input.scope === "project" ? ctx.projectId : undefined,
        );
        if (summary === null) {
          return toolError(
            `No ${input.period} summary exists for ${input.date_key}`,
          );
        }
        return toolJson(summary);
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "list_summaries",
    description:
      "List available daily and weekly summaries for navigation or reporting.",
    parameters: z
      .object({
        scope: z.enum(SUMMARY_SCOPES).optional(),
        period: z.enum(SUMMARY_PERIODS).optional(),
        limit: z.number().int().positive().max(100).optional(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const summaries = await store.listSummaries({
          scope: input.scope,
          period: input.period,
          limit: input.limit,
          projectId:
            input.scope === "project" || input.scope === undefined
              ? ctx.projectId
              : undefined,
        });
        return toolJson({ summaries });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.registerTool({
    name: "export_summary",
    description:
      "Format a summary as Markdown or Slack-compatible standup text.",
    parameters: z
      .object({
        summary_id: z.string(),
        format: z.enum(["markdown", "slack"]),
        scope: z.enum(SUMMARY_SCOPES),
        period: z.enum(SUMMARY_PERIODS),
        date_key: z.string(),
      })
      .strict(),
    async execute(input, ctx) {
      try {
        const summary = await store.getSummary(
          input.scope,
          input.period,
          input.date_key,
          input.scope === "project" ? ctx.projectId : undefined,
        );
        if (summary === null || summary.id !== input.summary_id) {
          return toolError(`Summary "${input.summary_id}" was not found`);
        }
        return toolJson({
          summary_id: summary.id,
          content: exportSummary(summary, input.format),
        });
      } catch (error) {
        return toolError(error instanceof Error ? error.message : String(error));
      }
    },
  });

  bb.agents.configure(() => ({
    tools: [
      "generate_summary",
      "get_summary",
      "list_summaries",
      "export_summary",
    ],
    skills: ["summary-hub"],
  }));

  bb.background.schedule("daily-project-summaries", "59 23 * * *", async () => {
    const projects = await bb.sdk.projects.list({ includePersonal: true });
    for (const project of projects) {
      if (project.sources.length === 0) continue;
      try {
        const summary = await generator.generateProjectSummary(
          project.id,
          "daily",
        );
        publishChanged(summary.scope, summary.period, summary.date_key);
      } catch (error) {
        bb.log.warn(
          `daily summary failed for ${project.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    try {
      const global = await generator.generateGlobalSummary("daily");
      publishChanged(global.scope, global.period, global.date_key);
    } catch (error) {
      bb.log.warn(
        `daily global summary failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  bb.background.schedule("weekly-project-summaries", "0 0 * * 1", async () => {
    const projects = await bb.sdk.projects.list({ includePersonal: true });
    for (const project of projects) {
      if (project.sources.length === 0) continue;
      try {
        const summary = await generator.generateProjectSummary(
          project.id,
          "weekly",
        );
        publishChanged(summary.scope, summary.period, summary.date_key);
      } catch (error) {
        bb.log.warn(
          `weekly summary failed for ${project.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    try {
      const global = await generator.generateGlobalSummary("weekly");
      publishChanged(global.scope, global.period, global.date_key);
    } catch (error) {
      bb.log.warn(
        `weekly global summary failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  });

  bb.cli.register({
    name: "summary",
    summary: "Generate and inspect operational summaries",
    commands: [
      {
        name: "generate",
        summary: "Generate a summary for a scope and period",
        usage: "bb summary generate <project|global> <daily|weekly> [date-key]",
      },
      {
        name: "get",
        summary: "Fetch one summary",
        usage: "bb summary get <project|global> <daily|weekly> <date-key>",
      },
      {
        name: "list",
        summary: "List summaries",
        usage: "bb summary list [project|global] [daily|weekly]",
      },
      {
        name: "export",
        summary: "Export a summary as markdown or slack text",
        usage:
          "bb summary export <summary-id> <markdown|slack> <project|global> <daily|weekly> <date-key>",
      },
    ],
    async run(argv, ctx) {
      const [sub, ...rest] = argv;
      if (sub === undefined || sub === "help" || sub === "--help") {
        return {
          exitCode: 0,
          stdout:
            "Usage:\n  bb summary generate <project|global> <daily|weekly> [date-key]\n  bb summary get <project|global> <daily|weekly> <date-key>\n  bb summary list [project|global] [daily|weekly]\n  bb summary export <summary-id> <markdown|slack> <project|global> <daily|weekly> <date-key>",
        };
      }
      try {
        if (sub === "generate") {
          const [scopeRaw, periodRaw, dateKey] = rest;
          if (
            (scopeRaw !== "project" && scopeRaw !== "global") ||
            (periodRaw !== "daily" && periodRaw !== "weekly")
          ) {
            return { exitCode: 1, stderr: "Invalid generate arguments." };
          }
          const summary = await generator.generate(
            scopeRaw,
            periodRaw,
            dateKey,
            scopeRaw === "project" ? ctx.projectId ?? undefined : undefined,
          );
          publishChanged(summary.scope, summary.period, summary.date_key);
          return { exitCode: 0, stdout: JSON.stringify(summary, null, 2) };
        }
        if (sub === "get") {
          const [scopeRaw, periodRaw, dateKey] = rest;
          if (
            (scopeRaw !== "project" && scopeRaw !== "global") ||
            (periodRaw !== "daily" && periodRaw !== "weekly") ||
            dateKey === undefined
          ) {
            return { exitCode: 1, stderr: "Invalid get arguments." };
          }
          const summary = await store.getSummary(
            scopeRaw,
            periodRaw,
            dateKey,
            scopeRaw === "project" ? ctx.projectId ?? undefined : undefined,
          );
          if (summary === null) {
            return { exitCode: 1, stderr: "Summary not found." };
          }
          return { exitCode: 0, stdout: JSON.stringify(summary, null, 2) };
        }
        if (sub === "list") {
          const [scopeRaw, periodRaw] = rest;
          const summaries = await store.listSummaries({
            scope:
              scopeRaw === "project" || scopeRaw === "global"
                ? scopeRaw
                : undefined,
            period:
              periodRaw === "daily" || periodRaw === "weekly"
                ? periodRaw
                : undefined,
            projectId: ctx.projectId ?? undefined,
          });
          return { exitCode: 0, stdout: JSON.stringify(summaries, null, 2) };
        }
        if (sub === "export") {
          const [summaryId, formatRaw, scopeRaw, periodRaw, dateKey] = rest;
          if (
            (formatRaw !== "markdown" && formatRaw !== "slack") ||
            (scopeRaw !== "project" && scopeRaw !== "global") ||
            (periodRaw !== "daily" && periodRaw !== "weekly") ||
            summaryId === undefined ||
            dateKey === undefined
          ) {
            return { exitCode: 1, stderr: "Invalid export arguments." };
          }
          const summary = await store.getSummary(
            scopeRaw,
            periodRaw,
            dateKey,
            scopeRaw === "project" ? ctx.projectId ?? undefined : undefined,
          );
          if (summary === null || summary.id !== summaryId) {
            return { exitCode: 1, stderr: "Summary not found." };
          }
          return {
            exitCode: 0,
            stdout: exportSummary(summary, formatRaw),
          };
        }
        return { exitCode: 1, stderr: `Unknown subcommand "${sub}".` };
      } catch (error) {
        return {
          exitCode: 1,
          stderr: error instanceof Error ? error.message : String(error),
        };
      }
    },
  });
}
