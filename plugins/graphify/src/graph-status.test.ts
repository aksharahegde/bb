import { describe, expect, it } from "vitest";
import {
  CATALOG_MAX_CHARS,
  computeGraphStatus,
  parseGraphDocument,
  renderCatalog,
} from "./graph-status.js";

const SAMPLE = JSON.stringify({
  directed: true,
  nodes: [
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
    { id: "c", label: "Gamma" },
  ],
  links: [
    { source: "a", target: "b", relation: "imports" },
    { source: "a", target: "c", relation: "calls" },
    { source: "b", target: "c", relation: "imports" },
  ],
});

describe("graph-status", () => {
  it("parses node-link graph.json and ranks god nodes", () => {
    const doc = parseGraphDocument(SAMPLE);
    const status = computeGraphStatus(doc, "/tmp/graphify-out/graph.json");
    expect(status.exists).toBe(true);
    expect(status.nodeCount).toBe(3);
    expect(status.edgeCount).toBe(3);
    expect(status.topNodes[0]?.label).toBe("Alpha");
    expect(status.topNodes[0]?.degree).toBe(2);
  });

  it("renders a capped catalog for missing graphs", () => {
    const status = computeGraphStatus(null, "/repo/graphify-out/graph.json");
    const catalog = renderCatalog(status);
    expect(catalog).toContain("No graphify-out/graph.json");
    expect(catalog).toContain("bb graphify update");
    expect(catalog.length).toBeLessThanOrEqual(CATALOG_MAX_CHARS);
  });

  it("renders god nodes in the catalog when present", () => {
    const status = computeGraphStatus(
      parseGraphDocument(SAMPLE),
      "/repo/graphify-out/graph.json",
    );
    const catalog = renderCatalog(status);
    expect(catalog).toContain("3 nodes");
    expect(catalog).toContain("Alpha");
    expect(catalog).toContain("bb graphify affected");
  });
});
