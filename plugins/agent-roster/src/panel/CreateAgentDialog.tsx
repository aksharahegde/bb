import { AgentFormDialog } from "./AgentFormDialog.js";

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
  return (
    <AgentFormDialog
      open={open}
      onOpenChange={onOpenChange}
      projectId={projectId}
      onSaved={onCreated}
    />
  );
}

export { AgentFormDialog } from "./AgentFormDialog.js";
