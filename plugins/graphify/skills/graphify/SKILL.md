---
name: graphify
description: Query and refresh the Graphify codebase knowledge graph (bb graphify). Use before risky edits and for architecture / dependency questions.
---

# Graphify

BB wraps the system-installed [Graphify](https://github.com/Graphify-Labs/graphify) CLI.
Graphs are stored at `<project>/graphify-out/` (do not commit; add to `.gitignore`).

## When to use

- "What depends on X?" / "What could break if I change X?" → `bb graphify affected "X"`
- Architecture / how modules connect → `bb graphify query "…"` or `bb graphify path "A" "B"`
- Hub files / hotspots → `bb graphify god-nodes`
- Missing or stale graph → `bb graphify update` (AST-only, no LLM)

## Commands

```bash
bb graphify status --json
bb graphify update
bb graphify query "How does thread runtime config assemble instructions?"
bb graphify path "thread-runtime-config" "plugin-sdk"
bb graphify affected "thread-runtime-config.ts" --depth 2
bb graphify god-nodes --top 10
```

Prefer `--json` when chaining results.

## MCP

If you need Graphify’s MCP tools directly: `graphify --mcp` (Graphify must be on PATH). Prefer `bb graphify …` inside bb so project workspace context is correct.

## Policy

1. Run `bb graphify status` once per session; update if missing.
2. Before large refactors, run `affected` on the primary symbols/files.
3. Do not invent graph edges — only report Graphify output.
