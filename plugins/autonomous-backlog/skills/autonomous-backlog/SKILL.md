---
name: autonomous-backlog
description: Log and resolve agent-discovered tech debt via the Autonomous Backlog (.bb/tasks/tasks.json).
---

# Autonomous Backlog

Agents can passively log follow-up work discovered during routine tasks and humans can dispatch resolution threads from the Autonomous Backlog panel.

## Tools

- `create_task` — append a backlog item with title, description, priority, type, target files, and a suggested execution prompt.
- `list_tasks` — query tasks by optional `status`, `type`, or `priority`.
- `update_task_status` — move a task through `backlog`, `in_progress`, `completed`, or `dismissed`.
- `complete_task` — mark a task completed with a `resolution_summary`.

## Storage

Tasks persist in the active project's `.bb/tasks/tasks.json`. IDs are incremental (`TASK-001`, `TASK-002`, …).

## Passive logging

While completing a primary objective, log obvious tech debt, missing tests, refactors, bugs, or security issues with `create_task` without interrupting the main work unless resolution is strictly necessary.

## Dispatch flow

From the Autonomous Backlog panel, **Dispatch Agent** spawns `[Task] TASK-###: title`, links the thread, and auto-completes the task when that thread goes idle.
