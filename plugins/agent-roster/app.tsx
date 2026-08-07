import { definePluginApp } from "@bb/plugin-sdk/app";
import { AgentRosterPanel } from "./src/panel/AgentRosterPanel.js";

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "office",
    title: "Agent Roaster",
    icon: "Users",
    path: "office",
    component: AgentRosterPanel,
  });
});
