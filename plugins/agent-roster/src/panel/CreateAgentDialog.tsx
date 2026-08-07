import { useEffect, useState } from "react";
import { useRpc } from "@bb/plugin-sdk/app";
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

export function CreateAgentDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}) {
  const rpc = useRpc<typeof rosterRpcContract>();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Debugger");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [avatar, setAvatar] = useState("🤖");
  const [model, setModel] = useState("claude-sonnet-5-thinking-high");
  const [tools, setTools] = useState<string[]>(["read_file"]);
  const [options, setOptions] = useState<{
    avatars: string[];
    tools: { id: string; label: string }[];
    models: string[];
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void rpc.call("getFormOptions", null).then(setOptions);
  }, [open, rpc]);

  const toggleTool = (toolId: string): void => {
    setTools((current) =>
      current.includes(toolId)
        ? current.filter((entry) => entry !== toolId)
        : [...current, toolId],
    );
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    try {
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
      onOpenChange(false);
      setName("");
      setSystemPrompt("");
      onCreated();
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
          <DialogTitle>Create Custom Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              data-testid="roster-create-name-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              data-testid="roster-create-role-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">System prompt</label>
            <Textarea
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
            <label className="text-sm font-medium">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {(options?.avatars ?? ["🤖"]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className={cn(
                    "flex size-10 items-center justify-center rounded-md border text-xl",
                    avatar === entry
                      ? "border-primary bg-primary/10"
                      : "border-border",
                  )}
                  onClick={() => setAvatar(entry)}
                  data-testid={`roster-create-avatar-${entry}`}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tool access</label>
            <div className="grid grid-cols-2 gap-2">
              {(options?.tools ?? []).map((tool) => (
                <label
                  key={tool.id}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={tools.includes(tool.id)}
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
            data-testid="roster-create-submit"
          >
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
