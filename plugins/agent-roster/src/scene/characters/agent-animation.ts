import type { AgentStatus } from "../../types.js";

export type AgentPose = "idle" | "typing" | "thinking" | "walking";

export function statusToPose(
  status: AgentStatus,
  isMoving: boolean,
): AgentPose {
  if (isMoving) return "walking";
  switch (status) {
    case "working":
      return "typing";
    case "thinking":
      return "thinking";
    default:
      return "idle";
  }
}
