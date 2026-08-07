import { describe, expect, it } from "vitest";
import { Group, Vector3 } from "three";
import {
  createMovementTrail,
  syncMovementTrail,
} from "./movement-trail.js";

describe("movement trail helpers", () => {
  it("hides the trail when movement is disabled", () => {
    const line = createMovementTrail("#888888");
    const group = new Group();
    group.position.set(0, 0, 0);
    const destination = new Vector3(2, 0, 2);

    syncMovementTrail(line, group, destination, false, false);
    expect(line.visible).toBe(false);
  });

  it("shows the trail when the agent is far from the destination", () => {
    const line = createMovementTrail("#888888");
    const group = new Group();
    group.position.set(0, 0, 0);
    const destination = new Vector3(2, 0, 2);

    syncMovementTrail(line, group, destination, true, false);
    expect(line.visible).toBe(true);
  });
});
