import { describe, expect, it } from "vitest";
import { resolveCharacterPreset } from "./emoji-migration.js";

describe("resolveCharacterPreset", () => {
  it("maps legacy emoji avatars to preset ids", () => {
    expect(resolveCharacterPreset("🐛")).toBe("debugger-m");
    expect(resolveCharacterPreset("🔧")).toBe("engineer-m");
    expect(resolveCharacterPreset("📚")).toBe("docs-f");
    expect(resolveCharacterPreset("🤖")).toBe("default-m");
  });

  it("passes through valid preset ids", () => {
    expect(resolveCharacterPreset("lead-f")).toBe("lead-f");
  });

  it("falls back to default for unknown values", () => {
    expect(resolveCharacterPreset("unknown")).toBe("default-m");
  });
});
