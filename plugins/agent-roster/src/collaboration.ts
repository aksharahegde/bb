import type { BbPluginApi } from "@bb/plugin-sdk";
import type { CollaborationGroup, RosterAgent } from "./types.js";

export async function computeCollaborationGroups(
  bb: BbPluginApi,
  agents: RosterAgent[],
): Promise<CollaborationGroup[]> {
  const activeAgents = agents.filter(
    (agent) =>
      agent.active_thread_id !== null &&
      (agent.spatial_state.status === "working" ||
        agent.spatial_state.status === "thinking"),
  );
  if (activeAgents.length < 2) return [];

  const threadParents = new Map<string, string | null>();
  for (const agent of activeAgents) {
    const threadId = agent.active_thread_id;
    if (!threadId || threadParents.has(threadId)) continue;
    try {
      const thread = await bb.sdk.threads.get({ threadId });
      threadParents.set(threadId, thread.parentThreadId ?? null);
    } catch {
      threadParents.set(threadId, null);
    }
  }

  const groupsByKey = new Map<string, Set<string>>();

  for (const agent of activeAgents) {
    const threadId = agent.active_thread_id!;
    const parentId = threadParents.get(threadId) ?? null;
    const key =
      parentId !== null
        ? `parent:${parentId}`
        : `thread:${threadId}`;
    const bucket = groupsByKey.get(key) ?? new Set<string>();
    bucket.add(agent.id);
    groupsByKey.set(key, bucket);
  }

  const groups: CollaborationGroup[] = [];
  for (const [key, agentIds] of groupsByKey) {
    if (agentIds.size < 2) continue;
    const thread_id = key.startsWith("thread:")
      ? key.slice("thread:".length)
      : key.slice("parent:".length);
    groups.push({
      thread_id,
      agent_ids: [...agentIds],
    });
  }
  return groups;
}
