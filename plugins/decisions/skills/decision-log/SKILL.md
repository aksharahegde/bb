---
name: decision-log
description: Record and consult project architectural decisions (ADRs) stored in .bb/decisions/.
---

# Project Decision Log

This project keeps architectural decisions in `.bb/decisions/` as ADR markdown files.

## When to use ADRs

- A durable technology, architecture, or workflow choice was made
- Multiple options were considered and one was selected with trade-offs
- Future work should align with an earlier decision

## Agent workflow

1. Before proposing a conflicting approach, call `search_decisions` and `read_decision`.
2. When the user agrees to a meaningful tradeoff, ask whether to log it, then call `create_decision`.
3. When a decision is replaced, call `update_decision_status` and set `superseded_by` when appropriate.

Keep ADR titles concise and tags specific (for example `backend`, `database`, `ui`).
