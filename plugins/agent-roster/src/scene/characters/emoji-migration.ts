import {
  CHARACTER_PRESET_IDS,
  DEFAULT_CHARACTER_PRESET,
  type CharacterPresetId,
} from "./presets.js";

const EMOJI_TO_PRESET: Record<string, CharacterPresetId> = {
  "🐛": "debugger-m",
  "🔧": "engineer-m",
  "📚": "docs-f",
  "🥷": "security-m",
  "🔒": "security-m",
  "⚡": "engineer-m",
  "🧪": "debugger-m",
  "🎯": "lead-f",
  "🤖": "default-m",
  "🦊": "engineer-m",
};

export function resolveCharacterPreset(avatar: string): CharacterPresetId {
  if (avatar in EMOJI_TO_PRESET) {
    return EMOJI_TO_PRESET[avatar]!;
  }
  if ((CHARACTER_PRESET_IDS as readonly string[]).includes(avatar)) {
    return avatar as CharacterPresetId;
  }
  return DEFAULT_CHARACTER_PRESET;
}
