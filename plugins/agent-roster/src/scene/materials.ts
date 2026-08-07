import type { AgentStatus } from "../types.js";
import type { SceneTheme } from "./hooks/useSceneTheme.js";

export function statusEmissiveColor(
  theme: SceneTheme,
  status: AgentStatus,
): string | null {
  switch (status) {
    case "working":
      return `#${theme.success.getHexString()}`;
    case "thinking":
      return `#${theme.warning.getHexString()}`;
    case "error":
      return `#${theme.destructive.getHexString()}`;
    default:
      return null;
  }
}

export function statusRingColor(
  theme: SceneTheme,
  status: AgentStatus,
): string | null {
  return statusEmissiveColor(theme, status);
}
