import { useId, useState } from "react";
import {
  mcpRegistryServerSchema,
  type McpRegistry,
  type McpRegistryServer,
  type McpRegistryTransport,
} from "@bb/domain";
import { Button } from "@bb/shared-ui/button";
import { Input } from "@bb/shared-ui/input";
import { Switch } from "@bb/shared-ui/switch";
import {
  SettingsSection,
  SettingsWithControl,
} from "@/components/ui/settings-section.js";
import { useSystemConfig } from "@/hooks/queries/system-queries";
import { useUpdateMcpSettings } from "@/hooks/mutations/settings-mutations";

interface McpDraft {
  name: string;
  enabled: boolean;
  transport: McpRegistryTransport;
  command: string;
  argsText: string;
  url: string;
  envFromHostText: string;
}

function emptyDraft(): McpDraft {
  return {
    name: "",
    enabled: true,
    transport: "stdio",
    command: "",
    argsText: "",
    url: "",
    envFromHostText: "",
  };
}

function serverSummary(server: McpRegistryServer): string {
  if (server.transport === "stdio") {
    return [server.command, ...server.args].filter(Boolean).join(" ");
  }
  return server.url ?? "";
}

export function McpSettingsSection() {
  const systemConfigQuery = useSystemConfig();
  const updateMcpSettings = useUpdateMcpSettings();
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const commandId = useId();
  const urlId = useId();
  const argsId = useId();
  const envFromHostId = useId();

  const servers: McpRegistry = systemConfigQuery.data?.mcpServers ?? [];
  const busy =
    systemConfigQuery.data === undefined || updateMcpSettings.isPending;

  async function persist(next: McpRegistry) {
    setError(null);
    try {
      await updateMcpSettings.mutateAsync(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAdd() {
    setError(null);
    try {
      const server = mcpRegistryServerSchema.parse({
        id: crypto.randomUUID(),
        name: draft.name,
        enabled: draft.enabled,
        transport: draft.transport,
        command:
          draft.transport === "stdio" ? draft.command || undefined : undefined,
        args: draft.argsText.split(/\s+/u).filter(Boolean),
        url: draft.transport === "stdio" ? undefined : draft.url || undefined,
        env: {},
        envFromHost: draft.envFromHostText.split(/[,\s]+/u).filter(Boolean),
      });
      if (servers.some((entry) => entry.name === server.name)) {
        setError(`MCP server '${server.name}' already exists`);
        return;
      }
      await persist([...servers, server]);
      setDraft(emptyDraft());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6" data-testid="mcp-settings-panel">
      <SettingsSection
        title="MCP servers"
        description="Register external MCP servers for Claude Code and ACP sessions. Codex and Pi ignore this registry. Tools from these servers are untrusted — review permissions carefully. Prefer env-from-host for secrets."
      >
        {servers.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="mcp-settings-empty"
          >
            No MCP servers registered.
          </p>
        ) : (
          <ul className="space-y-3" data-testid="mcp-settings-list">
            {servers.map((server) => (
              <li
                key={server.id}
                className="flex flex-col gap-2 border-b border-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`mcp-row-${server.id}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{server.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {server.transport}: {serverSummary(server)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SettingsWithControl
                    label={server.enabled ? "Enabled" : "Disabled"}
                  >
                    <div data-testid="mcp-server-enabled-toggle">
                      <Switch
                        checked={server.enabled}
                        disabled={busy}
                        onCheckedChange={(enabled) => {
                          void persist(
                            servers.map((entry) =>
                              entry.id === server.id
                                ? { ...entry, enabled }
                                : entry,
                            ),
                          );
                        }}
                      />
                    </div>
                  </SettingsWithControl>
                  <div data-testid="mcp-remove-server">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        void persist(
                          servers.filter((entry) => entry.id !== server.id),
                        );
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection
        title="Add MCP server"
        description="Stdio command or remote URL."
      >
        <div className="space-y-3" data-testid="mcp-settings-add-form">
          <label className="block space-y-1 text-sm" htmlFor={nameId}>
            <span>Name</span>
            <div data-testid="mcp-server-name-input">
              <Input
                id={nameId}
                value={draft.name}
                disabled={busy}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Transport</span>
            <div data-testid="mcp-server-transport-select">
              <select
                className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm"
                value={draft.transport}
                disabled={busy}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    transport: event.target.value as McpRegistryTransport,
                  }))
                }
              >
                <option value="stdio">stdio</option>
                <option value="http">http</option>
                <option value="sse">sse</option>
              </select>
            </div>
          </label>
          {draft.transport === "stdio" ? (
            <>
              <label className="block space-y-1 text-sm" htmlFor={commandId}>
                <span>Command</span>
                <div data-testid="mcp-server-command-input">
                  <Input
                    id={commandId}
                    value={draft.command}
                    disabled={busy}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        command: event.target.value,
                      }))
                    }
                  />
                </div>
              </label>
              <label className="block space-y-1 text-sm" htmlFor={argsId}>
                <span>Args (space-separated)</span>
                <div data-testid="mcp-server-args-input">
                  <Input
                    id={argsId}
                    value={draft.argsText}
                    disabled={busy}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        argsText: event.target.value,
                      }))
                    }
                  />
                </div>
              </label>
              <label className="block space-y-1 text-sm" htmlFor={envFromHostId}>
                <span>Env from host (comma-separated keys)</span>
                <div data-testid="mcp-server-env-from-host-input">
                  <Input
                    id={envFromHostId}
                    value={draft.envFromHostText}
                    disabled={busy}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        envFromHostText: event.target.value,
                      }))
                    }
                  />
                </div>
              </label>
            </>
          ) : (
            <label className="block space-y-1 text-sm" htmlFor={urlId}>
              <span>URL</span>
              <div data-testid="mcp-server-url-input">
                <Input
                  id={urlId}
                  value={draft.url}
                  disabled={busy}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                />
              </div>
            </label>
          )}
          <div data-testid="mcp-add-server">
            <Button disabled={busy} onClick={() => void handleAdd()}>
              Add server
            </Button>
          </div>
          {error ? (
            <p
              className="text-sm text-destructive"
              data-testid="mcp-settings-error"
            >
              {error}
            </p>
          ) : null}
        </div>
      </SettingsSection>
    </div>
  );
}
