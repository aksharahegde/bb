import type { AgentStatus, RosterAgent } from "./types.js";

export function isAgentActive(agent: {
  spatial_state: { status: AgentStatus };
}): boolean {
  return (
    agent.spatial_state.status === "working" ||
    agent.spatial_state.status === "thinking"
  );
}

export function isAgentInvokable(agent: RosterAgent): boolean {
  return (
    agent.spatial_state.status !== "offline" && !isAgentActive(agent)
  );
}

export function assertAgentInvokable(agent: RosterAgent): void {
  if (agent.spatial_state.status === "offline") {
    throw new Error("Cannot invoke an offline agent");
  }
  if (isAgentActive(agent)) {
    throw new Error("Agent is already running a task");
  }
}

export function assertToolChangesAllowed(
  current: RosterAgent,
  nextTools: string[],
): void {
  if (!isAgentActive(current)) return;
  const currentTools = [...current.allowed_tools].sort().join(",");
  const updatedTools = [...nextTools].sort().join(",");
  if (currentTools !== updatedTools) {
    throw new Error("Cannot change tool access while the agent is active");
  }
}

export function assertAgentArchivable(agent: RosterAgent): void {
  if (isAgentActive(agent)) {
    throw new Error("Cannot archive an agent while it is active");
  }
}
