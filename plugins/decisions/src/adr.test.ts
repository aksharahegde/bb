import { describe, expect, it } from "vitest";
import {
  parseDecisionDocument,
  parseDecisionFrontmatter,
  updateFrontmatterStatus,
} from "./adr.js";
import { renderActiveCatalog } from "./catalog.js";
import {
  decisionFilename,
  formatDecisionMarkdown,
  nextDecisionId,
  slugifyTitle,
} from "./types.js";

const SAMPLE = `---
id: ADR-001
title: "Use WSGI over ASGI for primary backend server"
status: "accepted"
date: "2026-08-07"
authors: ["user", "bb-agent"]
tags: ["architecture", "backend"]
superseded_by: null
---
## Context & Problem Statement

We need a simpler deployment model.

## Decision Outcome

Chosen Option: **WSGI**
`;

describe("decision adr parsing", () => {
  it("parses frontmatter and body", () => {
    const record = parseDecisionDocument(SAMPLE, "ADR-001-use-wsgi.md");
    expect(record.id).toBe("ADR-001");
    expect(record.title).toContain("WSGI");
    expect(record.status).toBe("accepted");
    expect(record.body).toContain("simpler deployment");
  });

  it("rejects mismatched ids", () => {
    expect(() =>
      parseDecisionFrontmatter(SAMPLE, "ADR-002-use-wsgi.md"),
    ).toThrow(/does not match/);
  });

  it("updates status in frontmatter", () => {
    const updated = updateFrontmatterStatus(SAMPLE, "superseded", "ADR-004");
    const record = parseDecisionDocument(updated, "ADR-001-use-wsgi.md");
    expect(record.status).toBe("superseded");
    expect(record.superseded_by).toBe("ADR-004");
  });
});

describe("decision helpers", () => {
  it("increments ids", () => {
    expect(nextDecisionId(["ADR-001", "ADR-002"])).toBe("ADR-003");
    expect(nextDecisionId([])).toBe("ADR-001");
  });

  it("slugifies titles and builds filenames", () => {
    expect(slugifyTitle("Use Tailwind CSS v4")).toBe("use-tailwind-css-v4");
    expect(decisionFilename("ADR-001", "Use Tailwind CSS v4")).toBe(
      "ADR-001-use-tailwind-css-v4.md",
    );
  });

  it("formats markdown with required sections", () => {
    const markdown = formatDecisionMarkdown(
      {
        id: "ADR-001",
        title: "Tailwind CSS v4",
        status: "accepted",
        date: "2026-08-07",
        authors: ["user"],
        tags: ["ui"],
        superseded_by: null,
      },
      {
        context: "We need a consistent styling system.",
        choice: "Tailwind CSS v4",
        trade_offs: ["Migration cost"],
      },
    );
    expect(markdown).toContain("## Context & Problem Statement");
    expect(markdown).toContain("Migration cost");
  });

  it("renders active catalog text", () => {
    expect(
      renderActiveCatalog([
        {
          id: "ADR-001",
          title: "WSGI server",
          status: "accepted",
          date: "2026-08-07",
          authors: [],
          tags: [],
          superseded_by: null,
          filename: "ADR-001-wsgi.md",
          snippet: null,
        },
      ]),
    ).toContain("ADR-001 (WSGI server)");
  });
});
