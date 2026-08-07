import { describe, expect, it } from "vitest";
import { jsonRpcInput } from "./rpc-input.js";

describe("jsonRpcInput", () => {
  it("removes undefined fields before RPC serialization", () => {
    expect(
      jsonRpcInput({
        projectId: "proj_1",
        query: undefined,
        status: "accepted",
      }),
    ).toEqual({
      projectId: "proj_1",
      status: "accepted",
    });
  });
});
