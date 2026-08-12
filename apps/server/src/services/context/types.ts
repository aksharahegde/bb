export type ContextSourceKind =
  | "standard"
  | "tool"
  | "plugin_contribute"
  | "plugin_configure"
  | "data_dir_agents"
  | "workspace_agents";

export interface ContextChunk {
  /** Stable id for dedupe within a resolution (e.g. pluginId + kind). */
  id: string;
  source: ContextSourceKind;
  /** Human-readable provenance for instruction headers. */
  provenance: string;
  /** Lower sorts earlier. */
  priority: number;
  text: string;
  /** Optional per-chunk char budget override. */
  maxChars?: number;
}

/** Default priority: lower = earlier in the assembled prompt. */
export const CONTEXT_SOURCE_PRIORITY: Record<ContextSourceKind, number> = {
  standard: 10,
  tool: 20,
  plugin_contribute: 30,
  plugin_configure: 40,
  data_dir_agents: 50,
  workspace_agents: 60,
};

export const DEFAULT_PLUGIN_CONTRIBUTE_MAX_CHARS = 4096;
export const DEFAULT_TOTAL_CONTEXT_MAX_CHARS = 120_000;
