import { Suspense, lazy } from "react";
import {
  definePluginApp,
  type PluginNavPanelProps,
} from "@get-bb/plugin-sdk/app";

const AgentRosterPanel = lazy(async () => {
  const module = await import("./src/panel/AgentRosterPanel.js");
  return { default: module.AgentRosterPanel };
});

function AgentRosterPanelHost(props: PluginNavPanelProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
          Loading Agent Roaster…
        </div>
      }
    >
      <AgentRosterPanel {...props} />
    </Suspense>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "office",
    title: "Agent Roaster",
    icon: "Users",
    path: "office",
    component: AgentRosterPanelHost,
  });
});
