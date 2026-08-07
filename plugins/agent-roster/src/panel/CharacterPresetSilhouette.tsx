import { cn } from "@bb/shared-ui/lib/utils";
import type { CharacterPreset } from "../scene/characters/presets.js";

function accentClass(accent: CharacterPreset["accent"]): string {
  switch (accent) {
    case "primary":
      return "text-primary";
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "destructive":
      return "text-destructive";
    case "muted":
    default:
      return "text-muted-foreground";
  }
}

export function CharacterPresetSilhouette({
  preset,
}: {
  preset: CharacterPreset;
}) {
  return (
    <svg
      viewBox="0 0 48 64"
      className={cn("h-full w-full", accentClass(preset.accent))}
      aria-hidden
    >
      <rect
        x="14"
        y="34"
        width="8"
        height="18"
        rx="2"
        className="fill-muted-foreground/70"
      />
      <rect
        x="26"
        y="34"
        width="8"
        height="18"
        rx="2"
        className="fill-muted-foreground/70"
      />
      <rect
        x="16"
        y="22"
        width="16"
        height="16"
        rx="4"
        className="fill-current"
      />
      <circle cx="24" cy="14" r="7" className="fill-warning/60" />
      {preset.hairStyle === "long" ? (
        <rect
          x="17"
          y="8"
          width="14"
          height="12"
          rx="3"
          className="fill-foreground/80"
        />
      ) : null}
      {preset.hairStyle === "bun" ? (
        <circle cx="24" cy="7" r="4" className="fill-foreground/80" />
      ) : null}
      {preset.hairStyle === "buzz" ? (
        <circle
          cx="24"
          cy="14"
          r="7.5"
          className="fill-foreground/35"
        />
      ) : null}
      {preset.hairStyle === "short" ? (
        <rect
          x="18"
          y="8"
          width="12"
          height="5"
          rx="2"
          className="fill-foreground/80"
        />
      ) : null}
      {preset.accessory === "glasses" ? (
        <>
          <circle
            cx="20"
            cy="14"
            r="2.2"
            fill="none"
            className="stroke-foreground"
            strokeWidth="0.8"
          />
          <circle
            cx="28"
            cy="14"
            r="2.2"
            fill="none"
            className="stroke-foreground"
            strokeWidth="0.8"
          />
        </>
      ) : null}
      {preset.accessory === "headphones" ? (
        <>
          <rect
            x="12"
            y="11"
            width="3"
            height="7"
            rx="1"
            className="fill-foreground"
          />
          <rect
            x="33"
            y="11"
            width="3"
            height="7"
            rx="1"
            className="fill-foreground"
          />
        </>
      ) : null}
      {preset.outfitStyle === "formal" ? (
        <rect x="23" y="24" width="2" height="10" className="fill-foreground" />
      ) : null}
    </svg>
  );
}
