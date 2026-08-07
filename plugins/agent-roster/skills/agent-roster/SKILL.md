---
name: agent-roster
description: Create, configure, and orchestrate custom specialized agents in a spatial virtual office (.bb/roster/).
---

# Agent Roaster

Project roster agents and office layouts live under `.bb/roster/`:

- `agents.json` — agent profiles with spatial state
- `office_layout.json` — zone grid for the virtual office

## CLI

```bash
bb roster list [--status working] [--role Debugger] [--json]
bb roster create --name "Bug Hunter" --role Debugger --prompt "Find bugs"
bb roster update <agent-id> --prompt "Updated instructions"
bb roster archive <agent-id>
bb roster invoke <agent-id> "Review auth middleware"
bb roster move <agent-id> --zone meeting_room
bb roster layout get
bb roster layout save --column-split 10 --row-split 6
bb roster layout reset
```

Pass `--project <id>` when not running inside a bb thread.

## Agent tools

- `register_roster_agent` — add a custom agent at an available desk
- `update_roster_agent` — update profile (tool access locked while active)
- `archive_roster_agent` — archive agent (`offline` status)
- `update_office_layout` — resize zone splits or rename zones
- `invoke_roster_agent` — dispatch an agent to the Testing Lab on a background thread
- `assign_agent_to_zone` — move an agent to a named office zone
- `list_roster_agents` — list agents, optionally filtered by status or role

## UI

Open **Agent Roaster** in the sidebar for:

- Spatial 3D office with drag, collaboration beams, and speech bubbles
- Layout editor for zone splits and names
- Agent create/edit/archive flows
- List view and live event stream

## Orchestration tips

- Invoke specialists with a concrete task prompt; they spawn hidden threads with their system prompt.
- Agents collaborating on the same parent thread auto-move to the conference room.
- Use `bb roster list --status working` to see who is active before dispatching more work.
