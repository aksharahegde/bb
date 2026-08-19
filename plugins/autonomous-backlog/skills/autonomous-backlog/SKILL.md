---
name: autonomous-backlog
description: Log and resolve agent-discovered tech debt via Tasks (shim; was .bb/tasks/tasks.json).
---

# Autonomous Backlog

Agents can passively log follow-up work discovered during routine tasks. Storage
is the **Tasks** plugin (not `.bb/tasks/tasks.json`). This shim remains for one
release so existing tools and the backlog panel keep working.

Install Tasks if needed: `bb plugin install tasks`.

Import any legacy JSON once:

```sh
bb tasks import-backlog [--bb-project <proj_id>] [--json]
```

Prefer `bb tasks create|list|update|comment` for new work. The `create_task`
tool still works and writes into Tasks.

## Tools

- `create_task` — append a backlog item with title, description, priority, type, target files, and a suggested execution prompt (writes Tasks).
- `list_tasks` — query tasks by optional `status`, `type`, or `priority`.
- `update_task_status` — move a task through `backlog`, `in_progress`, `completed`, or `dismissed`.
- `complete_task` — mark a task completed with a `resolution_summary`.

## Passive logging

While completing a primary objective, log obvious tech debt, missing tests, refactors, bugs, or security issues with `create_task` without interrupting the main work unless resolution is strictly necessary.

## Dispatch flow

From the Autonomous Backlog panel, **Dispatch Agent** spawns `[Task] …`, links the thread, and auto-completes the task when that thread goes idle.
