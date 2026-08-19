import { definePluginApp } from "@get-bb/plugin-sdk/app";

function UsageAnalyticsPanel() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
      Usage dashboard UI ships in a follow-up change.
    </div>
  );
}

export default definePluginApp((app) => {
  app.slots.navPanel({
    id: "usage-analytics",
    title: "Usage",
    icon: "ChartLine",
    path: "usage",
    sidebarPlacement: "primary",
    component: UsageAnalyticsPanel,
  });
});
