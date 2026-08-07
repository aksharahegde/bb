---
name: agent-roster
description: Create, configure, and orchestrate custom specialized agents in a spatial virtual office (.bb/roster/).
---

# Agent Roaster

Project roster agents and office layouts live under `.bb/roster/`:

- `agents.json` — agent profiles with spatial state
- `office_layout.json` — zone grid for the virtual office

## Tools

- `register_roster_agent` — add a custom agent at an available desk
- `invoke_roster_agent` — dispatch an agent to the Testing Lab on a background thread
- `assign_agent_to_zone` — move an agent to a named office zone
- `list_roster_agents` — list agents, optionally filtered by status or role

Open **Agent Roaster** in the sidebar for the spatial canvas, list view, and create-agent flow.
