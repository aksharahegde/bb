export const CHARACTER_PRESET_IDS = [
  "debugger-m",
  "engineer-m",
  "docs-f",
  "security-m",
  "lead-f",
  "default-m",
] as const;

export type CharacterPresetId = (typeof CHARACTER_PRESET_IDS)[number];

export type HairStyle = "short" | "long" | "bun" | "buzz";
export type OutfitStyle = "casual" | "formal" | "lab";
export type CharacterAccessory = "glasses" | "headphones" | "badge" | "none";

export interface CharacterPreset {
  id: CharacterPresetId;
  label: string;
  hairStyle: HairStyle;
  outfitStyle: OutfitStyle;
  accessory: CharacterAccessory;
  /** 0–1 blend toward warmer skin tone in theme space */
  skinMix: number;
  /** Shirt/accent preview color token key */
  accent: "primary" | "success" | "warning" | "destructive" | "muted";
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: "debugger-m",
    label: "Debugger",
    hairStyle: "short",
    outfitStyle: "casual",
    accessory: "headphones",
    skinMix: 0.35,
    accent: "success",
  },
  {
    id: "engineer-m",
    label: "Engineer",
    hairStyle: "buzz",
    outfitStyle: "casual",
    accessory: "badge",
    skinMix: 0.42,
    accent: "warning",
  },
  {
    id: "docs-f",
    label: "Docs writer",
    hairStyle: "long",
    outfitStyle: "formal",
    accessory: "glasses",
    skinMix: 0.38,
    accent: "primary",
  },
  {
    id: "security-m",
    label: "Security",
    hairStyle: "buzz",
    outfitStyle: "formal",
    accessory: "badge",
    skinMix: 0.48,
    accent: "destructive",
  },
  {
    id: "lead-f",
    label: "Lead",
    hairStyle: "bun",
    outfitStyle: "formal",
    accessory: "none",
    skinMix: 0.4,
    accent: "primary",
  },
  {
    id: "default-m",
    label: "Default",
    hairStyle: "short",
    outfitStyle: "casual",
    accessory: "none",
    skinMix: 0.36,
    accent: "muted",
  },
];

const PRESET_BY_ID = new Map(
  CHARACTER_PRESETS.map((preset) => [preset.id, preset]),
);

export function getCharacterPreset(id: string): CharacterPreset {
  return PRESET_BY_ID.get(id as CharacterPresetId) ?? PRESET_BY_ID.get("default-m")!;
}

export const DEFAULT_CHARACTER_PRESET: CharacterPresetId = "default-m";
