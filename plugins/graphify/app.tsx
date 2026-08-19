import { useEffect, useMemo, useState } from "react";
import {
  definePluginApp,
  useBbContext,
  useRpc,
  type PluginSettingsSectionProps,
} from "@get-bb/plugin-sdk/app";
import { Badge } from "@bb/shared-ui/badge";
import { Button } from "@bb/shared-ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bb/shared-ui/select";
import { graphifyRpcContract } from "./server.js";

interface PanelProject {
  id: string;
  name: string;
  kind: "personal" | "standard";
  hasSource: boolean;
}

interface GraphStatusView {
  exists: boolean;
  nodeCount: number;
  edgeCount: number;
  directed: boolean;
  graphPath: string;
  topNodes: Array<{ id: string; label: string; degree: number }>;
}

function GraphifySettings(_props: PluginSettingsSectionProps) {
  const context = useBbContext();
  const rpc = useRpc<typeof graphifyRpcContract>();
  const [projects, setProjects] = useState<PanelProject[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<GraphStatusView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void rpc
      .call("listProjects", null)
      .then((result: { projects: PanelProject[] }) => {
        if (cancelled) return;
        setProjects(result.projects);
        const preferred =
          result.projects.find(
            (project: PanelProject) => project.id === context.projectId,
          ) ??
          result.projects.find((project: PanelProject) => project.hasSource) ??
          null;
        setProjectId(preferred?.id ?? null);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [context.projectId, rpc]);

  useEffect(() => {
    if (!projectId) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void rpc
      .call("status", { projectId })
      .then((result: GraphStatusView) => {
        if (cancelled) return;
        setStatus(result);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, rpc]);

  const projectOptions = useMemo(
    () => projects.filter((project) => project.hasSource),
    [projects],
  );

  return (
    <div className="space-y-4" data-testid="graphify-settings-panel">
      <div className="space-y-1">
        <h2 className="text-base font-medium text-foreground">Graphify</h2>
        <p className="text-sm text-muted-foreground">
          Codebase knowledge graph via the system Graphify CLI. Graphs live in{" "}
          <code className="text-xs">graphify-out/</code> under the project root —
          add that directory to <code className="text-xs">.gitignore</code>.
        </p>
      </div>

      {projectOptions.length > 0 ? (
        <Select
          value={projectId ?? undefined}
          onValueChange={(value) => setProjectId(value)}
        >
          <SelectTrigger data-testid="graphify-project-select">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projectOptions.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" data-testid="graphify-settings-error">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading graph status…</p>
      ) : null}

      {status ? (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {status.exists ? "Indexed" : "Not indexed"}
            </Badge>
            {status.exists ? (
              <span className="text-sm text-muted-foreground">
                {status.nodeCount} nodes · {status.edgeCount} edges
              </span>
            ) : null}
          </div>
          <p className="font-mono text-xs text-muted-foreground break-all">
            {status.graphPath}
          </p>
          {status.topNodes.length > 0 ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground">God nodes</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {status.topNodes.slice(0, 8).map((node) => (
                  <li key={node.id}>
                    {node.label}{" "}
                    <span className="text-xs">(degree {node.degree})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Agents: <code>bb graphify update</code>,{" "}
            <code>bb graphify query</code>, <code>bb graphify affected</code>.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="graphify-refresh-status"
            onClick={() => {
              if (!projectId) return;
              setLoading(true);
              void rpc
                .call("status", { projectId })
                .then(setStatus)
                .catch((loadError: unknown) =>
                  setError(
                    loadError instanceof Error
                      ? loadError.message
                      : String(loadError),
                  ),
                )
                .finally(() => setLoading(false));
            }}
          >
            Refresh status
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.settingsSection({
    id: "graphify",
    title: "Graphify",
    description:
      "Codebase knowledge graph status for the selected project (via Graphify).",
    component: GraphifySettings,
  });
});
