export const AGENT_STATUSES = [
  "idle",
  "working",
  "thinking",
  "error",
  "offline",
] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_ZONES = [
  "desks",
  "conference_room",
  "lounge",
  "testing_lab",
] as const;

export type AgentZone = (typeof AGENT_ZONES)[number];

export const ZONE_TYPES = ["execution", "collaboration", "idle_pool"] as const;

export type ZoneType = (typeof ZONE_TYPES)[number];

export interface SpatialState {
  zone: AgentZone;
  position_x: number;
  position_y: number;
  status: AgentStatus;
  current_task_id: string | null;
}

export interface RosterAgent {
  id: string;
  name: string;
  role: string;
  avatar: string;
  system_prompt: string;
  allowed_tools: string[];
  default_model: string;
  spatial_state: SpatialState;
  created_at: string;
  /** Active bb thread when status is working/thinking. */
  active_thread_id: string | null;
  /** Latest speech bubble text for the 3D canvas. */
  speech_bubble: string | null;
  /** When the agent entered working/thinking; enriched from plugin kv at read time. */
  active_since: string | null;
}

export interface CollaborationGroup {
  thread_id: string;
  agent_ids: string[];
}

export interface AgentsDocument {
  version: 1;
  agents: RosterAgent[];
}

export interface ZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OfficeZone {
  id: string;
  name: string;
  bounds: ZoneBounds;
  type: ZoneType;
}

export interface OfficeLayout {
  grid_dimensions: { width: number; height: number };
  zones: OfficeZone[];
}

export interface RosterEvent {
  id: string;
  at: string;
  message: string;
  agent_id: string | null;
}

export interface AgentFilters {
  status?: AgentStatus;
  role?: string;
}

export interface RegisterAgentInput {
  name: string;
  role: string;
  system_prompt: string;
  avatar: string;
  allowed_tools: string[];
  default_model?: string;
}

export interface UpdateAgentInput {
  name: string;
  role: string;
  system_prompt: string;
  avatar: string;
  allowed_tools: string[];
  default_model: string;
}

export const AVATAR_OPTIONS = [
  "🐛",
  "🔧",
  "📚",
  "🥷",
  "🔒",
  "⚡",
  "🧪",
  "🎯",
  "🤖",
  "🦊",
] as const;

export const TOOL_OPTIONS = [
  { id: "read_file", label: "File Read" },
  { id: "write_file", label: "File Write" },
  { id: "run_terminal", label: "Terminal Execution" },
  { id: "web_search", label: "Web Search" },
  { id: "list_roster_agents", label: "List Roster Agents" },
] as const;

export const MODEL_OPTIONS = [
  "claude-sonnet-5-thinking-high",
  "claude-opus-5-thinking-high",
  "gpt-5.6-terra-medium",
  "composer-2.5-fast",
] as const;
