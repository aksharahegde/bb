import { cn } from "@bb/shared-ui/lib/utils";
import type { CharacterPreset } from "../scene/characters/presets.js";
import { CharacterPresetSilhouette } from "./CharacterPresetSilhouette.js";

export function CharacterPresetThumbnail({
  preset,
  selected,
  onSelect,
}: {
  preset: CharacterPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-16 flex-col items-center gap-1 rounded-md border p-1.5",
        selected ? "border-primary bg-primary/10" : "border-border",
      )}
      onClick={onSelect}
      data-testid={`roster-create-avatar-${preset.id}`}
    >
      <div className="h-14 w-10 overflow-hidden rounded bg-muted/40">
        <CharacterPresetSilhouette preset={preset} />
      </div>
      <span className="w-full truncate text-center text-[9px] text-muted-foreground">
        {preset.label}
      </span>
    </button>
  );
}
