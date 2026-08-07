import { useEffect, useState } from "react";
import { Color } from "three";

export interface SceneTheme {
  floor: Color;
  floorZoneExecution: Color;
  floorZoneCollaboration: Color;
  floorZoneIdle: Color;
  desk: Color;
  monitorBezel: Color;
  monitorScreen: Color;
  chair: Color;
  success: Color;
  warning: Color;
  destructive: Color;
  primary: Color;
  muted: Color;
  ink: Color;
}

function readCssColor(variable: string, fallback: string): Color {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.color = `var(${variable}, ${fallback})`;
  document.documentElement.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  try {
    return new Color(computed);
  } catch {
    return new Color(fallback);
  }
}

function mixColors(a: Color, b: Color, ratio: number): Color {
  return a.clone().lerp(b, ratio);
}

function buildTheme(): SceneTheme {
  const canvas = readCssColor("--canvas", "#f5f5f4");
  const ink = readCssColor("--ink", "#1c1917");
  const success = readCssColor("--success", "#16a34a");
  const warning = readCssColor("--warning", "#ca8a04");
  const destructive = readCssColor("--destructive", "#dc2626");
  const primary = readCssColor("--primary", "#2563eb");
  const muted = readCssColor("--muted", "#a8a29e");

  return {
    floor: mixColors(canvas, ink, 0.06),
    floorZoneExecution: mixColors(canvas, primary, 0.1),
    floorZoneCollaboration: mixColors(canvas, warning, 0.1),
    floorZoneIdle: mixColors(canvas, muted, 0.14),
    desk: mixColors(canvas, ink, 0.22),
    monitorBezel: mixColors(canvas, ink, 0.55),
    monitorScreen: mixColors(canvas, ink, 0.75),
    chair: mixColors(canvas, ink, 0.35),
    success,
    warning,
    destructive,
    primary,
    muted,
    ink,
  };
}

export function useSceneTheme(): SceneTheme {
  const [theme, setTheme] = useState<SceneTheme>(() => buildTheme());

  useEffect(() => {
    const refresh = (): void => setTheme(buildTheme());
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}
