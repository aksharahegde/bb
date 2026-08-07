import type { CharacterPreset } from "../scene/characters/presets.js";

export function CharacterPresetSilhouette({
  preset,
}: {
  preset: CharacterPreset;
}) {
  const shirt =
    preset.accent === "primary"
      ? "#3b82f6"
      : preset.accent === "success"
        ? "#16a34a"
        : preset.accent === "warning"
          ? "#ca8a04"
          : preset.accent === "destructive"
            ? "#dc2626"
            : "#78716c";

  return (
    <svg viewBox="0 0 48 64" className="h-full w-full" aria-hidden>
      <rect x="14" y="34" width="8" height="18" rx="2" fill="#44403c" />
      <rect x="26" y="34" width="8" height="18" rx="2" fill="#44403c" />
      <rect x="16" y="22" width="16" height="16" rx="4" fill={shirt} />
      <circle cx="24" cy="14" r="7" fill="#d6a574" />
      {preset.hairStyle === "long" ? (
        <rect x="17" y="8" width="14" height="12" rx="3" fill="#292524" />
      ) : null}
      {preset.hairStyle === "bun" ? (
        <circle cx="24" cy="7" r="4" fill="#292524" />
      ) : null}
      {preset.hairStyle === "buzz" ? (
        <circle cx="24" cy="14" r="7.5" fill="#292524" opacity="0.35" />
      ) : null}
      {preset.hairStyle === "short" ? (
        <rect x="18" y="8" width="12" height="5" rx="2" fill="#292524" />
      ) : null}
      {preset.accessory === "glasses" ? (
        <>
          <circle
            cx="20"
            cy="14"
            r="2.2"
            fill="none"
            stroke="#1c1917"
            strokeWidth="0.8"
          />
          <circle
            cx="28"
            cy="14"
            r="2.2"
            fill="none"
            stroke="#1c1917"
            strokeWidth="0.8"
          />
        </>
      ) : null}
      {preset.accessory === "headphones" ? (
        <>
          <rect x="12" y="11" width="3" height="7" rx="1" fill="#1c1917" />
          <rect x="33" y="11" width="3" height="7" rx="1" fill="#1c1917" />
        </>
      ) : null}
      {preset.outfitStyle === "formal" ? (
        <rect x="23" y="24" width="2" height="10" fill="#1c1917" />
      ) : null}
    </svg>
  );
}
