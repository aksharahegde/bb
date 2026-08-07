import type { SceneTheme } from "./hooks/useSceneTheme.js";

const ROLE_PALETTE: Array<keyof Pick<
  SceneTheme,
  "primary" | "success" | "warning" | "destructive" | "muted"
>> = ["primary", "success", "warning", "destructive", "muted"];

function hashRole(role: string): number {
  let hash = 0;
  for (let index = 0; index < role.length; index += 1) {
    hash = (hash * 31 + role.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function roleColor(theme: SceneTheme, role: string): string {
  const key = ROLE_PALETTE[hashRole(role) % ROLE_PALETTE.length]!;
  return `#${theme[key].getHexString()}`;
}
