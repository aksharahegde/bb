# Agent Roaster

Create custom specialized agents (name, role, avatar, tool permissions, system prompt) and orchestrate them in a spatial virtual office.

## Storage

- `.bb/roster/agents.json` — roster agent registry
- `.bb/roster/office_layout.json` — zone grid (desks, conference room, lounge, testing lab)

## UI

Open **Agent Roaster** from the plugin nav panel for:

- Spatial view with draggable agent stations, collaboration beams, and speech bubbles
- List view with quick invoke
- Create Custom Agent modal
- Live event stream sidebar

## Agent tools

| Tool | Purpose |
|------|---------|
| `register_roster_agent` | Add agent profile and auto-place at desk |
| `update_roster_agent` | Update agent profile (tools locked while active) |
| `archive_roster_agent` | Archive agent (sets status to offline) |
| `invoke_roster_agent` | Spawn hidden thread with agent system prompt |
| `assign_agent_to_zone` | Reposition agent in a zone |
| `list_roster_agents` | List agents with spatial state |

Seed agents (Bug Hunter, Refactor Guru, Doc Specialist) are created on first open.
