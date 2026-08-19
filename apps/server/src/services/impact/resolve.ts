import type { ChangeImpactReport } from "@bb/domain";
import { computeChangeImpact } from "@bb/domain";
import type { LoggedWorkSessionDeps } from "../../types.js";
import { callHostRetryableOnlineRpc } from "../hosts/online-rpc.js";
import type { WorkspaceProvisionType } from "@bb/domain";

const IMPACT_DIFF_TIMEOUT_MS = 8_000;
const MAX_CHANGED_FILES = 80;

export interface ResolveChangeImpactArgs {
  hostId: string;
  environmentId: string;
  workspacePath: string;
  workspaceProvisionType: WorkspaceProvisionType;
  /** Optional Graphify hub labels overlapping changed paths. */
  affectedHubs?: readonly string[];
}

/**
 * Best-effort dirty-tree impact for an environment. Returns null when the
 * host RPC fails or the workspace cannot serve diffs.
 */
export async function resolveEnvironmentChangeImpact(
  deps: LoggedWorkSessionDeps,
  args: ResolveChangeImpactArgs,
): Promise<ChangeImpactReport | null> {
  try {
    const result = await callHostRetryableOnlineRpc(deps, {
      hostId: args.hostId,
      timeoutMs: IMPACT_DIFF_TIMEOUT_MS,
      command: {
        type: "workspace.diffFiles",
        environmentId: args.environmentId,
        workspaceContext: {
          workspacePath: args.workspacePath,
          workspaceProvisionType: args.workspaceProvisionType,
        },
        maxFiles: MAX_CHANGED_FILES,
        target: { type: "uncommitted" },
      },
    });
    if (result.outcome !== "available") {
      return null;
    }
    const changedFiles = result.files
      .map((file) => file.path)
      .filter((path) => path.length > 0)
      .slice(0, MAX_CHANGED_FILES);
    const hubs =
      args.affectedHubs ?? matchHubsByPathBasename(changedFiles);
    return computeChangeImpact({
      changedFiles,
      affectedHubs: hubs,
    });
  } catch (error) {
    deps.logger.debug(
      { err: error, environmentId: args.environmentId },
      "Change impact resolution skipped",
    );
    return null;
  }
}

/** Hub hints from path basenames when Graphify affected is not available. */
export function matchHubsByPathBasename(
  changedFiles: readonly string[],
): string[] {
  const hubs: string[] = [];
  for (const path of changedFiles.slice(0, 20)) {
    const base = path.split("/").pop() ?? path;
    const name = base.replace(/\.[^.]+$/u, "");
    if (
      name.length >= 3 &&
      !/^(index|mod|main|types|utils|helpers)$/i.test(name)
    ) {
      hubs.push(name);
    }
  }
  return [...new Set(hubs)].slice(0, 8);
}
