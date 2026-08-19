import { useEffect, useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
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
import { rosterRpcContract } from "../../contract.js";
import { isAgentActive } from "../lifecycle.js";
import {
  CHARACTER_PRESETS,
  DEFAULT_CHARACTER_PRESET,
  type CharacterPresetId,
} from "../types.js";
import { CharacterPresetThumbnail } from "./CharacterPresetThumbnail.js";
import type { RosterAgent } from "../types.js";

export function AgentFormDialog({
  open,
  onOpenChange,
  projectId,
  agent,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  agent?: RosterAgent | null;
  onSaved: () => void;
}) {
  const rpc = useRpc<typeof rosterRpcContract>();
  const isEdit = agent !== null && agent !== undefined;
  const [name, setName] = useState("");
  const [role, setRole] = useState("Debugger");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [avatar, setAvatar] = useState<CharacterPresetId>(DEFAULT_CHARACTER_PRESET);
  const [model, setModel] = useState("claude-sonnet-5-thinking-high");
  const [tools, setTools] = useState<string[]>(["read_file"]);
  const [options, setOptions] = useState<{
    characterPresets: { id: string; label: string }[];
    tools: { id: string; label: string }[];
    models: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toolsLocked = isEdit && agent ? isAgentActive(agent) : false;
  const nameId = "roster-agent-name";
  const roleId = "roster-agent-role";
  const promptId = "roster-agent-prompt";

  useEffect(() => {
    if (!open) return;
    void rpc.call("getFormOptions", null).then(setOptions);
  }, [open, rpc]);

  useEffect(() => {
    if (!open) return;
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setSystemPrompt(agent.system_prompt);
      setAvatar(agent.avatar as CharacterPresetId);
      setModel(agent.default_model);
      setTools(agent.allowed_tools);
      return;
    }
    setName("");
    setRole("Debugger");
    setSystemPrompt("");
    setAvatar(DEFAULT_CHARACTER_PRESET);
    setModel("claude-sonnet-5-thinking-high");
    setTools(["read_file"]);
  }, [open, agent]);

  const toggleTool = (toolId: string): void => {
    if (toolsLocked) return;
    setTools((current) =>
      current.includes(toolId)
        ? current.filter((entry) => entry !== toolId)
        : [...current, toolId],
    );
  };

  const presetOptions = options?.characterPresets ?? CHARACTER_PRESETS;

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
      if (isEdit && agent) {
        await rpc.call("updateAgent", {
          projectId,
          agentId: agent.id,
          name,
          role,
          system_prompt: systemPrompt,
          avatar,
          allowed_tools: tools,
          default_model: model,
        });
        toast.success(`Updated ${name}`);
      } else {
        await rpc.call("registerAgent", {
          projectId,
          name,
          role,
          system_prompt: systemPrompt,
          avatar,
          allowed_tools: tools,
          default_model: model,
        });
        toast.success(`Created ${name}`);
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Agent" : "Create Custom Agent"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={nameId} className="text-sm font-medium">
              Name
            </label>
            <Input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              data-testid="roster-create-name-input"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={roleId} className="text-sm font-medium">
              Role
            </label>
            <Input
              id={roleId}
              value={role}
              onChange={(event) => setRole(event.target.value)}
              data-testid="roster-create-role-input"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor={promptId} className="text-sm font-medium">
              System prompt
            </label>
            <Textarea
              id={promptId}
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={4}
              data-testid="roster-create-prompt-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger data-testid="roster-create-model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(options?.models ?? [model]).map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {entry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Character</label>
            <div className="flex flex-wrap gap-2">
              {presetOptions.map((entry) => {
                const preset =
                  CHARACTER_PRESETS.find((item) => item.id === entry.id) ??
                  CHARACTER_PRESETS[0]!;
                return (
                  <CharacterPresetThumbnail
                    key={entry.id}
                    preset={preset}
                    selected={avatar === entry.id}
                    onSelect={() => setAvatar(entry.id as CharacterPresetId)}
                  />
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tool access</label>
            {toolsLocked ? (
              <p className="text-xs text-muted-foreground">
                Tool access is locked while this agent is active.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              {(options?.tools ?? []).map((tool) => (
                <label
                  key={tool.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm",
                    toolsLocked && "opacity-60",
                  )}
                  data-testid={`roster-create-tool-${tool.id}`}
                >
                  <input
                    type="checkbox"
                    checked={tools.includes(tool.id)}
                    disabled={toolsLocked}
                    onChange={() => toggleTool(tool.id)}
                  />
                  {tool.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              submitting ||
              name.trim().length === 0 ||
              systemPrompt.trim().length === 0
            }
            data-testid={isEdit ? "roster-edit-submit" : "roster-create-submit"}
          >
            {submitting
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save Changes"
                : "Create Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
