import { describe, expect, it } from "vitest";
import { statusToPose } from "./agent-animation.js";

describe("statusToPose", () => {
  it("prioritizes walking when the agent is moving", () => {
    expect(statusToPose("idle", true)).toBe("walking");
  });

  it("maps active statuses to work poses", () => {
    expect(statusToPose("working", false)).toBe("typing");
    expect(statusToPose("thinking", false)).toBe("thinking");
    expect(statusToPose("error", false)).toBe("idle");
  });
});
