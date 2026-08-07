import { useCallback, useEffect, useMemo, useState } from "react";
import {
  definePluginApp,
  Markdown,
  useBbContext,
  useBbNavigate,
  useRealtime,
  useRpc,
  type PluginNavPanelProps,
} from "@bb/plugin-sdk/app";
import { toast } from "sonner";
import { Badge } from "@bb/shared-ui/badge";
import { Button } from "@bb/shared-ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@bb/shared-ui/dialog";
import { Input } from "@bb/shared-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@bb/shared-ui/select";
import { Textarea } from "@bb/shared-ui/textarea";
import { cn } from "@bb/shared-ui/lib/utils";
import { REALTIME_CHANNEL, decisionsRpcContract } from "./server.js";
import { jsonRpcInput } from "./src/rpc-input.js";
import {
  DECISION_STATUSES,
  type DecisionStatus,
  type DecisionSummary,
} from "./src/types.js";

type FilterStatus = DecisionStatus | "all";

interface PanelProject {
  id: string;
  name: string;
  kind: "personal" | "standard";
  hasSource: boolean;
}

interface DecisionRecord extends DecisionSummary {
  body: string;
  raw: string;
}

function statusBadgeClass(status: DecisionStatus): string {
  switch (status) {
    case "accepted":
      return "border-primary/30 bg-primary/10 text-primary";
    case "proposed":
      return "border-warning/30 bg-warning/10 text-warning";
    case "superseded":
    case "deprecated":
      return "border-border bg-muted text-muted-foreground";
    case "rejected":
      return "border-destructive/30 bg-destructive/10 text-destructive";
  }
}

function pickDefaultProject(
  projects: PanelProject[],
  preferredProjectId: string | null,
): PanelProject | null {
  const withSource = projects.filter((project) => project.hasSource);
  if (withSource.length === 0) return null;
  if (preferredProjectId) {
    const preferred = withSource.find((project) => project.id === preferredProjectId);
    if (preferred) return preferred;
  }
  const personal = withSource.find((project) => project.kind === "personal");
  return personal ?? withSource[0] ?? null;
}

function DecisionListItem({
  decision,
  selected,
  onSelect,
}: {
  decision: DecisionSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`decision-row-${decision.id.toLowerCase()}`}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px]">
              {decision.id}
            </Badge>
            <Badge
              variant="outline"
              className={cn("capitalize", statusBadgeClass(decision.status))}
            >
              {decision.status}
            </Badge>
          </div>
          <div className="text-sm font-medium text-foreground">
            {decision.title}
          </div>
          {decision.snippet ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {decision.snippet}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {decision.date}
        </span>
      </div>
      {decision.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {decision.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              #{tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function CreateDecisionDialog({
  open,
  projectId,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (decision: DecisionRecord) => void;
}) {
  const rpc = useRpc<typeof decisionsRpcContract>();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [choice, setChoice] = useState("");
  const [tags, setTags] = useState("");
  const [tradeOffs, setTradeOffs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setContext("");
    setChoice("");
    setTags("");
    setTradeOffs("");
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { decision } = await rpc.call("createDecision", {
        projectId,
        title: title.trim(),
        context: context.trim(),
        choice: choice.trim(),
        trade_offs: tradeOffs
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      });
      onCreated(decision);
      reset();
      onOpenChange(false);
      toast.success(`Created ${decision.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New architectural decision</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Decision title"
            data-testid="decision-title-input"
          />
          <Textarea
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Context and problem statement"
            rows={4}
            data-testid="decision-context-input"
          />
          <Textarea
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
            placeholder="Chosen option"
            rows={3}
            data-testid="decision-choice-input"
          />
          <Textarea
            value={tradeOffs}
            onChange={(event) => setTradeOffs(event.target.value)}
            placeholder="Trade-offs (one per line)"
            rows={3}
            data-testid="decision-tradeoffs-input"
          />
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags (comma separated)"
            data-testid="decision-tags-input"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => void submit()}
            disabled={
              submitting ||
              title.trim().length === 0 ||
              context.trim().length === 0 ||
              choice.trim().length === 0
            }
            data-testid="decision-create-submit"
          >
            {submitting ? "Creating…" : "Create ADR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDetail({
  projectId,
  decision,
  onUpdated,
  onAskAgent,
}: {
  projectId: string;
  decision: DecisionRecord;
  onUpdated: (decision: DecisionRecord) => void;
  onAskAgent: () => void;
}) {
  const rpc = useRpc<typeof decisionsRpcContract>();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(decision.raw);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(decision.raw);
    setEditing(false);
  }, [decision.id, decision.raw]);

  const updateStatus = async (status: DecisionStatus) => {
    try {
      const { decision: updated } = await rpc.call("updateDecisionStatus", {
        projectId,
        id: decision.id,
        status,
        superseded_by: decision.superseded_by,
      });
      onUpdated(updated);
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const { decision: updated } = await rpc.call("saveDecision", {
        projectId,
        id: decision.id,
        raw: draft,
      });
      onUpdated(updated);
      setEditing(false);
      toast.success("ADR saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Button
          size="sm"
          variant={editing ? "secondary" : "outline"}
          onClick={() => setEditing((value) => !value)}
          data-testid="decision-edit-toggle"
        >
          {editing ? "Preview" : "Edit"}
        </Button>
        <Select
          value={decision.status}
          onValueChange={(value) => void updateStatus(value as DecisionStatus)}
        >
          <SelectTrigger className="w-[160px]" data-testid="decision-status-select">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {DECISION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={onAskAgent}
          data-testid="decision-ask-agent"
        >
          Ask agent about this ADR
        </Button>
        {editing ? (
          <Button
            size="sm"
            onClick={() => void saveDraft()}
            disabled={saving}
            data-testid="decision-save"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {editing ? (
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[480px] font-mono text-xs"
            data-testid="decision-raw-editor"
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={decision.raw} />
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionLogPanel(_props: PluginNavPanelProps) {
  const { projectId: routeProjectId } = useBbContext();
  const navigate = useBbNavigate();
  const rpc = useRpc<typeof decisionsRpcContract>();
  const [projects, setProjects] = useState<PanelProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<DecisionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<DecisionRecord | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const activeProject =
    projects.find((project) => project.id === selectedProjectId) ??
    pickDefaultProject(projects, routeProjectId);
  const projectId = activeProject?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { projects: next } = await rpc.call("listProjects", null);
        if (cancelled) return;
        setProjects(next);
        setSelectedProjectId((current) => {
          if (current && next.some((project) => project.id === current)) {
            return current;
          }
          return pickDefaultProject(next, routeProjectId)?.id ?? null;
        });
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeProjectId, rpc]);

  const loadDecisions = useCallback(async () => {
    if (!projectId) {
      setDecisions([]);
      setSelectedId(null);
      setSelectedDecision(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { decisions: next } = await rpc.call(
        "listDecisions",
        jsonRpcInput({
          projectId,
          query: query.trim().length > 0 ? query.trim() : undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
        }),
      );
      setDecisions(next);
      if (selectedId && !next.some((decision) => decision.id === selectedId)) {
        setSelectedId(null);
        setSelectedDecision(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [projectId, query, rpc, selectedId, statusFilter]);

  const loadSelected = useCallback(
    async (id: string) => {
      if (!projectId) return;
      try {
        const { decision } = await rpc.call("readDecision", {
          projectId,
          id,
        });
        setSelectedDecision(decision);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    },
    [projectId, rpc],
  );

  useEffect(() => {
    void loadDecisions();
  }, [loadDecisions]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDecision(null);
      return;
    }
    void loadSelected(selectedId);
  }, [loadSelected, selectedId]);

  useRealtime(REALTIME_CHANNEL, () => {
    void loadDecisions();
    if (selectedId) void loadSelected(selectedId);
  });

  const acceptedCount = useMemo(
    () => decisions.filter((decision) => decision.status === "accepted").length,
    [decisions],
  );

  const askAgent = async () => {
    if (!projectId || !selectedDecision) return;
    try {
      const { threadId } = await rpc.call("spawnAdrThread", {
        projectId,
        id: selectedDecision.id,
        parentThreadId: null,
      });
      navigate.toThread(threadId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  if (!projectId) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        {projects.length === 0
          ? "No project with a source path is available for decision logs."
          : "Select a project to view its decision log."}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Badge variant="outline">{acceptedCount} accepted</Badge>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          data-testid="decision-create-open"
        >
          New ADR
        </Button>
        {projects.length > 1 ? (
          <Select
            value={projectId}
            onValueChange={(value) => setSelectedProjectId(value)}
          >
            <SelectTrigger className="w-[220px]" data-testid="decision-project-select">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              {projects
                .filter((project) => project.hasSource)
                .map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">{activeProject?.name}</span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search decisions"
            className="w-[220px]"
            data-testid="decision-search-input"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as FilterStatus)}
          >
            <SelectTrigger className="w-[160px]" data-testid="decision-filter-select">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {DECISION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="min-h-0 overflow-auto border-b border-border p-3 lg:border-b-0 lg:border-r">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading decisions…</p>
          ) : decisions.length === 0 ? (
            <div
              className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground"
              data-testid="decision-empty-state"
            >
              No architectural decisions recorded yet. Click &quot;New ADR&quot; or ask
              bb to summarize recent architectural choices.
            </div>
          ) : (
            <div className="space-y-2">
              {decisions.map((decision) => (
                <DecisionListItem
                  key={decision.id}
                  decision={decision}
                  selected={decision.id === selectedId}
                  onSelect={() => setSelectedId(decision.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0">
          {selectedDecision ? (
            <DecisionDetail
              projectId={projectId}
              decision={selectedDecision}
              onUpdated={(decision) => {
                setSelectedDecision(decision);
                void loadDecisions();
              }}
              onAskAgent={() => void askAgent()}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
              Select a decision to view details.
            </div>
          )}
        </div>
      </div>

      <CreateDecisionDialog
        open={createOpen}
        projectId={projectId}
        onOpenChange={setCreateOpen}
        onCreated={(decision) => {
          setSelectedId(decision.id);
          setSelectedDecision(decision);
          void loadDecisions();
        }}
      />
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "decisions",
    title: "Decision Log",
    icon: "ScrollText",
    path: "decisions",
    sidebarPlacement: "primary",
    component: DecisionLogPanel,
  });
});
