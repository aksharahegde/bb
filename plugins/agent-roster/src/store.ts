import type { BbPluginApi } from "@bb/plugin-sdk";
import {
  agentsFilePath,
  hostFileArgs,
  officeLayoutFilePath,
  resolveProjectSource,
  rosterDirectory,
  type ProjectSource,
} from "./project-source.js";
import { DEFAULT_OFFICE_LAYOUT, findAvailableDesk } from "./spatial.js";
import { SEED_AGENTS } from "./seed.js";
import type {
  AgentFilters,
  AgentStatus,
  AgentsDocument,
  CollaborationGroup,
  OfficeLayout,
  RegisterAgentInput,
  RosterAgent,
  RosterEvent,
  SpatialState,
} from "./types.js";

function isMissingFileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\bENOENT\b|does not exist|not found/i.test(message);
}

function emptyAgentsDocument(): AgentsDocument {
  return { version: 1, agents: [] };
}

function parseAgentsDocument(raw: string): AgentsDocument {
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("agents" in parsed) ||
    !Array.isArray(parsed.agents)
  ) {
    throw new Error("Invalid agents document shape in .bb/roster/agents.json");
  }
  return parsed as AgentsDocument;
}

function normalizeDocument(document: AgentsDocument): AgentsDocument {
  return {
    ...document,
    agents: document.agents.map((agent) =>
      "active_since" in agent
        ? storedAgentToRoster(
            agent as Omit<RosterAgent, "active_since">,
          )
        : parseStoredAgent(agent),
    ),
  };
}

function parseOfficeLayout(raw: string): OfficeLayout {
  const parsed = JSON.parse(raw) as unknown;
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("grid_dimensions" in parsed) ||
    !("zones" in parsed)
  ) {
    throw new Error(
      "Invalid office layout shape in .bb/roster/office_layout.json",
    );
  }
  return parsed as OfficeLayout;
}

function slugifyId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `agent-${base || "custom"}`;
}

function nextAgentId(agents: RosterAgent[], name: string): string {
  const base = slugifyId(name);
  const existing = new Set(agents.map((agent) => agent.id));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${String(index).padStart(2, "0")}`)) {
    index += 1;
  }
  return `${base}-${String(index).padStart(2, "0")}`;
}

function matchesFilters(agent: RosterAgent, filters: AgentFilters): boolean {
  if (
    filters.status !== undefined &&
    agent.spatial_state.status !== filters.status
  ) {
    return false;
  }
  if (filters.role !== undefined && agent.role !== filters.role) {
    return false;
  }
  return true;
}

const EVENTS_KV_PREFIX = "events:";
const ACTIVE_SINCE_KV_PREFIX = "active-since:";

function storedAgentToRoster(agent: Omit<RosterAgent, "active_since">): RosterAgent {
  return { ...agent, active_since: null };
}

function parseStoredAgent(raw: unknown): RosterAgent {
  const agent = raw as Omit<RosterAgent, "active_since">;
  return storedAgentToRoster(agent);
}

export class RosterStore {
  constructor(private readonly bb: BbPluginApi) {}

  private async readAgentsState(source: ProjectSource): Promise<{
    document: AgentsDocument;
    sha256: string | null;
  }> {
    try {
      const file = await this.bb.sdk.files.read({
        ...hostFileArgs(source),
        path: agentsFilePath(source),
      });
      if (file.contentEncoding !== "utf8") {
        throw new Error(".bb/roster/agents.json is not UTF-8 text");
      }
      return {
        document: normalizeDocument(parseAgentsDocument(file.content)),
        sha256: file.sha256,
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        return { document: emptyAgentsDocument(), sha256: null };
      }
      throw error;
    }
  }

  private async readLayoutState(source: ProjectSource): Promise<{
    layout: OfficeLayout;
    sha256: string | null;
  }> {
    try {
      const file = await this.bb.sdk.files.read({
        ...hostFileArgs(source),
        path: officeLayoutFilePath(source),
      });
      if (file.contentEncoding !== "utf8") {
        throw new Error(".bb/roster/office_layout.json is not UTF-8 text");
      }
      return {
        layout: parseOfficeLayout(file.content),
        sha256: file.sha256,
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        return { layout: DEFAULT_OFFICE_LAYOUT, sha256: null };
      }
      throw error;
    }
  }

  private async writeAgents(
    source: ProjectSource,
    document: AgentsDocument,
    expectedSha256: string | null,
  ): Promise<void> {
    await this.bb.sdk.files.mkdir({
      ...hostFileArgs(source),
      path: rosterDirectory(source),
      recursive: true,
    });
    const content = `${JSON.stringify(
      {
        ...document,
        agents: document.agents.map(({ active_since: _activeSince, ...agent }) => agent),
      },
      null,
      2,
    )}\n`;
    const result = await this.bb.sdk.files.write({
      ...hostFileArgs(source),
      path: agentsFilePath(source),
      content,
      contentEncoding: "utf8",
      createParents: true,
      ...(expectedSha256 === null
        ? { expectedSha256: null }
        : { expectedSha256 }),
    });
    if (result.outcome === "conflict") {
      throw new Error(
        "agents.json changed concurrently; reload and retry the update",
      );
    }
  }

  private async writeLayout(
    source: ProjectSource,
    layout: OfficeLayout,
    expectedSha256: string | null,
  ): Promise<void> {
    await this.bb.sdk.files.mkdir({
      ...hostFileArgs(source),
      path: rosterDirectory(source),
      recursive: true,
    });
    const content = `${JSON.stringify(layout, null, 2)}\n`;
    const result = await this.bb.sdk.files.write({
      ...hostFileArgs(source),
      path: officeLayoutFilePath(source),
      content,
      contentEncoding: "utf8",
      createParents: true,
      ...(expectedSha256 === null
        ? { expectedSha256: null }
        : { expectedSha256 }),
    });
    if (result.outcome === "conflict") {
      throw new Error(
        "office_layout.json changed concurrently; reload and retry the update",
      );
    }
  }

  private async mutateAgents(
    projectId: string,
    mutate: (document: AgentsDocument) => void,
  ): Promise<AgentsDocument> {
    const source = await resolveProjectSource(this.bb, projectId);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { document, sha256 } = await this.readAgentsState(source);
      mutate(document);
      try {
        await this.writeAgents(source, document, sha256);
        return document;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("changed concurrently") &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("Failed to update agents.json after retries");
  }

  async getOfficeLayout(projectId: string): Promise<OfficeLayout> {
    const source = await resolveProjectSource(this.bb, projectId);
    const { layout } = await this.readLayoutState(source);
    return layout;
  }

  async saveOfficeLayout(
    projectId: string,
    layout: OfficeLayout,
  ): Promise<OfficeLayout> {
    const source = await resolveProjectSource(this.bb, projectId);
    const { sha256 } = await this.readLayoutState(source);
    await this.writeLayout(source, layout, sha256);
    return layout;
  }

  async listAgents(
    projectId: string,
    filters: AgentFilters = {},
  ): Promise<RosterAgent[]> {
    await this.ensureSeed(projectId);
    const source = await resolveProjectSource(this.bb, projectId);
    const { document } = await this.readAgentsState(source);
    const activeSince = await this.getActiveSinceMap(projectId);
    return document.agents
      .filter((agent) => matchesFilters(agent, filters))
      .map((agent) => ({
        ...agent,
        active_since: activeSince[agent.id] ?? null,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async readAgent(projectId: string, id: string): Promise<RosterAgent> {
    const agents = await this.listAgents(projectId);
    const agent = agents.find((entry) => entry.id === id);
    if (!agent) {
      throw new Error(`Roster agent "${id}" was not found`);
    }
    return agent;
  }

  async ensureSeed(projectId: string): Promise<boolean> {
    const source = await resolveProjectSource(this.bb, projectId);
    const { document, sha256 } = await this.readAgentsState(source);
    const { layout, sha256: layoutSha } = await this.readLayoutState(source);
    let changed = false;

    if (document.agents.length === 0) {
      for (const seed of SEED_AGENTS) {
        const spatial = findAvailableDesk(layout, document.agents);
        document.agents.push({
          id: nextAgentId(document.agents, seed.name),
          name: seed.name,
          role: seed.role,
          avatar: seed.avatar,
          system_prompt: seed.system_prompt,
          allowed_tools: seed.allowed_tools,
          default_model: seed.default_model ?? "claude-sonnet-5-thinking-high",
          spatial_state: spatial,
          created_at: new Date().toISOString(),
          active_thread_id: null,
          speech_bubble: null,
          active_since: null,
        });
      }
      changed = true;
    }

    if (layoutSha === null) {
      await this.writeLayout(source, DEFAULT_OFFICE_LAYOUT, null);
    }

    if (changed) {
      await this.writeAgents(source, document, sha256);
      await this.appendEvent(projectId, {
        message: "Seeded default roster agents",
        agent_id: null,
      });
    }
    return changed;
  }

  async registerAgent(
    projectId: string,
    input: RegisterAgentInput,
  ): Promise<RosterAgent> {
    const layout = await this.getOfficeLayout(projectId);
    const existing = await this.listAgents(projectId);
    const spatial = findAvailableDesk(layout, existing);
    const agent: RosterAgent = {
      id: nextAgentId(existing, input.name),
      name: input.name.trim(),
      role: input.role.trim(),
      avatar: input.avatar,
      system_prompt: input.system_prompt.trim(),
      allowed_tools: input.allowed_tools,
      default_model:
        input.default_model?.trim() || "claude-sonnet-5-thinking-high",
      spatial_state: spatial,
      created_at: new Date().toISOString(),
      active_thread_id: null,
      speech_bubble: null,
      active_since: null,
    };
    await this.mutateAgents(projectId, (document) => {
      document.agents.push(agent);
    });
    await this.appendEvent(projectId, {
      message: `${agent.name} joined the office`,
      agent_id: agent.id,
    });
    return agent;
  }

  async updateAgentSpatial(
    projectId: string,
    id: string,
    spatial: Partial<SpatialState>,
    extras?: Partial<Pick<RosterAgent, "speech_bubble" | "active_thread_id">>,
  ): Promise<RosterAgent> {
    let updated: RosterAgent | null = null;
    await this.mutateAgents(projectId, (document) => {
      const index = document.agents.findIndex((agent) => agent.id === id);
      if (index < 0) {
        throw new Error(`Roster agent "${id}" was not found`);
      }
      const current = document.agents[index]!;
      updated = {
        ...current,
        ...extras,
        spatial_state: { ...current.spatial_state, ...spatial },
      };
      document.agents[index] = updated;
    });
    if (updated === null) {
      throw new Error(`Roster agent "${id}" was not found`);
    }
    await this.syncActiveSince(projectId, updated);
    return updated;
  }

  private activeSinceKey(projectId: string): string {
    return `${ACTIVE_SINCE_KV_PREFIX}${projectId}`;
  }

  private async getActiveSinceMap(
    projectId: string,
  ): Promise<Record<string, string>> {
    return (
      (await this.bb.storage.kv.get<Record<string, string>>(
        this.activeSinceKey(projectId),
      )) ?? {}
    );
  }

  private async syncActiveSince(
    projectId: string,
    agent: RosterAgent,
  ): Promise<void> {
    const map = await this.getActiveSinceMap(projectId);
    const isActive =
      agent.spatial_state.status === "working" ||
      agent.spatial_state.status === "thinking";
    if (isActive) {
      if (!map[agent.id]) {
        map[agent.id] = new Date().toISOString();
        await this.bb.storage.kv.set(this.activeSinceKey(projectId), map);
      }
      return;
    }
    if (map[agent.id]) {
      delete map[agent.id];
      await this.bb.storage.kv.set(this.activeSinceKey(projectId), map);
    }
  }

  async syncCollaborationToConference(
    projectId: string,
    groups: CollaborationGroup[],
  ): Promise<void> {
    for (const group of groups) {
      for (const agentId of group.agent_ids) {
        const agent = await this.readAgent(projectId, agentId);
        if (agent.spatial_state.zone !== "conference_room") {
          await this.assignAgentToZone(projectId, agentId, "meeting_room");
        }
      }
    }
  }

  async assignAgentToZone(
    projectId: string,
    agentId: string,
    zoneId: string,
  ): Promise<RosterAgent> {
    const layout = await this.getOfficeLayout(projectId);
    const agents = await this.listAgents(projectId);
    const zone = layout.zones.find((entry) => entry.id === zoneId);
    if (!zone) {
      throw new Error(`Office zone "${zoneId}" was not found`);
    }
    const agentsInZone = agents.filter((agent) => {
      const zoneMap: Record<string, string> = {
        fixed_desks: "desks",
        meeting_room: "conference_room",
        breakout_room: "lounge",
        testing_lab: "testing_lab",
      };
      return agent.spatial_state.zone === zoneMap[zoneId];
    });
    const col = agentsInZone.length % Math.max(1, Math.floor((zone.bounds.width - 2) / 2));
    const row = Math.floor(
      agentsInZone.length / Math.max(1, Math.floor((zone.bounds.width - 2) / 2)),
    );
    const position_x = zone.bounds.x + 1 + col * 2;
    const position_y = zone.bounds.y + 1 + row * 2;
    const zoneMap: Record<string, SpatialState["zone"]> = {
      fixed_desks: "desks",
      meeting_room: "conference_room",
      breakout_room: "lounge",
      testing_lab: "testing_lab",
    };
    const agent = await this.updateAgentSpatial(projectId, agentId, {
      zone: zoneMap[zoneId] ?? "desks",
      position_x,
      position_y,
    });
    await this.appendEvent(projectId, {
      message: `${agent.name} assigned to ${zone.name}`,
      agent_id: agent.id,
    });
    return agent;
  }

  async setAgentStatus(
    projectId: string,
    agentId: string,
    status: AgentStatus,
    speechBubble?: string | null,
  ): Promise<RosterAgent> {
    return this.updateAgentSpatial(
      projectId,
      agentId,
      { status },
      speechBubble !== undefined ? { speech_bubble: speechBubble } : undefined,
    );
  }

  async findAgentByThread(
    projectId: string,
    threadId: string,
  ): Promise<RosterAgent | null> {
    const agents = await this.listAgents(projectId);
    return agents.find((agent) => agent.active_thread_id === threadId) ?? null;
  }

  private eventsKey(projectId: string): string {
    return `${EVENTS_KV_PREFIX}${projectId}`;
  }

  async listEvents(projectId: string, limit = 50): Promise<RosterEvent[]> {
    const events =
      (await this.bb.storage.kv.get<RosterEvent[]>(
        this.eventsKey(projectId),
      )) ?? [];
    return events.slice(0, limit);
  }

  async appendEvent(
    projectId: string,
    input: { message: string; agent_id: string | null },
  ): Promise<RosterEvent> {
    const event: RosterEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      message: input.message,
      agent_id: input.agent_id,
    };
    const existing =
      (await this.bb.storage.kv.get<RosterEvent[]>(
        this.eventsKey(projectId),
      )) ?? [];
    const next = [event, ...existing].slice(0, 100);
    await this.bb.storage.kv.set(this.eventsKey(projectId), next);
    return event;
  }
}
