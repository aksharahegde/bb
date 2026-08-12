import { budgetContextChunks } from "./budget.js";
import { rankAndDedupeContextChunks } from "./rank.js";
import type { ContextChunk } from "./types.js";
import { DEFAULT_TOTAL_CONTEXT_MAX_CHARS } from "./types.js";

export interface AssembleContextInstructionsArgs {
  chunks: readonly ContextChunk[];
  totalMaxChars?: number;
}

export interface AssembledContextInstructions {
  instructions: string;
  chunkCount: number;
}

/**
 * Rank, dedupe, budget, then join chunks with provenance headers where useful.
 * Standard and tool chunks are emitted as raw text; plugin/user sources keep
 * provenance wrappers matching prior thread-runtime-config behavior.
 */
export function assembleContextInstructions(
  args: AssembleContextInstructionsArgs,
): AssembledContextInstructions {
  const ranked = rankAndDedupeContextChunks(args.chunks);
  const budgeted = budgetContextChunks({
    chunks: ranked,
    totalMaxChars: args.totalMaxChars ?? DEFAULT_TOTAL_CONTEXT_MAX_CHARS,
  });

  const sections: string[] = [];
  for (const chunk of budgeted) {
    switch (chunk.source) {
      case "standard":
      case "tool":
        sections.push(chunk.text);
        break;
      case "plugin_contribute":
        sections.push(
          `The following instructions come from the BB plugin "${chunk.provenance}":`,
          chunk.text,
        );
        break;
      case "plugin_configure":
        sections.push(
          `The following dynamic instructions come from the BB plugin "${chunk.provenance}":`,
          chunk.text,
        );
        break;
      case "data_dir_agents":
      case "workspace_agents":
        sections.push(
          `The following ${chunk.source === "data_dir_agents" ? "user" : "workspace"} instructions come from ${chunk.provenance}:`,
          chunk.text,
        );
        break;
      default: {
        const _exhaustive: never = chunk.source;
        void _exhaustive;
        sections.push(chunk.text);
      }
    }
  }

  return {
    instructions: sections.join("\n\n"),
    chunkCount: budgeted.length,
  };
}
