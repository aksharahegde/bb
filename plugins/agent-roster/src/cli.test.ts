import { describe, expect, it } from "vitest";
import { parseRosterArgv, requireProjectId } from "./cli.js";

describe("roster cli helpers", () => {
  it("parses flags and positional args", () => {
    const parsed = parseRosterArgv([
      "list",
      "--status",
      "working",
      "--json",
      "--project",
      "proj_1",
    ]);
    expect(parsed.positional).toEqual(["list"]);
    expect(parsed.flags.get("status")).toBe("working");
    expect(parsed.flags.get("json")).toBe(true);
    expect(parsed.flags.get("project")).toBe("proj_1");
  });

  it("requires a project id", () => {
    const parsed = parseRosterArgv(["list"]);
    expect(() => requireProjectId({}, parsed)).toThrow(/project/i);
    expect(requireProjectId({ projectId: "proj_ctx" }, parsed)).toBe(
      "proj_ctx",
    );
  });
});
