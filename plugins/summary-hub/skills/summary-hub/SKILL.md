---
name: summary-hub
description: Generate and inspect daily and weekly operational summaries that roll up git, agent, task, and ADR activity.
---

# Summary Hub

Use the Summary Hub tools and panel to compile operational roll-ups.

## When to use

- The user asks for a daily or weekly standup brief, project status roll-up, or workspace overview.
- You need to know what shipped recently across commits, completed backlog tasks, logged ADRs, and agent threads.

## Tools

- `generate_summary` — build and persist a summary for `project` or `global` scope and `daily` or `weekly` period.
- `get_summary` — read one saved summary by `date_key`.
- `list_summaries` — enumerate available summaries for navigation.
- `export_summary` — format a saved summary as Markdown or Slack standup text.

## Guidance

Group raw commits and thread activity into feature-level outcomes instead of repeating commit subjects verbatim. Surface unresolved high-priority backlog items under blockers.
