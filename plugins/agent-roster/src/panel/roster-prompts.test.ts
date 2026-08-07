import { describe, expect, it } from "vitest";
import { defaultInvokePrompt } from "./roster-prompts.js";

describe("roster prompts", () => {
  it("builds a role-based default invoke prompt", () => {
    expect(defaultInvokePrompt("Debugger")).toBe("Help with debugger work");
  });
});
