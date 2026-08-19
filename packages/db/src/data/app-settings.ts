import { eq } from "drizzle-orm";
import {
  appKeybindingOverridesSchema,
  defaultAppSettings,
  defaultMcpRegistry,
  mcpRegistrySchema,
  type AppKeybindingOverrides,
  type AppSettings,
  type McpRegistry,
} from "@bb/domain";
import type { DbConnection } from "../connection.js";
import { appSettings } from "../schema.js";

const APP_SETTINGS_ROW_ID = "current";

export function getAppSettings(db: DbConnection): AppSettings {
  const row = db
    .select({
      showKeyboardHints: appSettings.showKeyboardHints,
      steerActiveThreadOnEnter: appSettings.steerActiveThreadOnEnter,
      showUnhandledProviderEvents: appSettings.showUnhandledProviderEvents,
      codexMemoryEnabled: appSettings.codexMemoryEnabled,
      claudeCodeMemoryEnabled: appSettings.claudeCodeMemoryEnabled,
      codexSubagentsDisabled: appSettings.codexSubagentsDisabled,
      claudeCodeSubagentsDisabled: appSettings.claudeCodeSubagentsDisabled,
      claudeCodeWorkflowsDisabled: appSettings.claudeCodeWorkflowsDisabled,
      onboardingCompletedAt: appSettings.onboardingCompletedAt,
    })
    .from(appSettings)
    .where(eq(appSettings.id, APP_SETTINGS_ROW_ID))
    .get();

  return row ?? defaultAppSettings;
}

export function setAppSettings(
  db: DbConnection,
  settings: AppSettings,
): void {
  const updatedAt = Date.now();
  db.insert(appSettings)
    .values({
      id: APP_SETTINGS_ROW_ID,
      showKeyboardHints: settings.showKeyboardHints,
      steerActiveThreadOnEnter: settings.steerActiveThreadOnEnter,
      showUnhandledProviderEvents: settings.showUnhandledProviderEvents,
      codexMemoryEnabled: settings.codexMemoryEnabled,
      claudeCodeMemoryEnabled: settings.claudeCodeMemoryEnabled,
      codexSubagentsDisabled: settings.codexSubagentsDisabled,
      claudeCodeSubagentsDisabled: settings.claudeCodeSubagentsDisabled,
      claudeCodeWorkflowsDisabled: settings.claudeCodeWorkflowsDisabled,
      onboardingCompletedAt: settings.onboardingCompletedAt,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        showKeyboardHints: settings.showKeyboardHints,
        steerActiveThreadOnEnter: settings.steerActiveThreadOnEnter,
        showUnhandledProviderEvents: settings.showUnhandledProviderEvents,
        codexMemoryEnabled: settings.codexMemoryEnabled,
        claudeCodeMemoryEnabled: settings.claudeCodeMemoryEnabled,
        codexSubagentsDisabled: settings.codexSubagentsDisabled,
        claudeCodeSubagentsDisabled: settings.claudeCodeSubagentsDisabled,
        claudeCodeWorkflowsDisabled: settings.claudeCodeWorkflowsDisabled,
        onboardingCompletedAt: settings.onboardingCompletedAt,
        updatedAt,
      },
    })
    .run();
}

export function getAppKeybindingOverrides(
  db: DbConnection,
): AppKeybindingOverrides {
  const row = db
    .select({ keybindingOverrides: appSettings.keybindingOverrides })
    .from(appSettings)
    .where(eq(appSettings.id, APP_SETTINGS_ROW_ID))
    .get();

  if (row === undefined) {
    return [];
  }
  return appKeybindingOverridesSchema.parse(
    JSON.parse(row.keybindingOverrides),
  );
}

export function setAppKeybindingOverrides(
  db: DbConnection,
  overrides: AppKeybindingOverrides,
): void {
  const updatedAt = Date.now();
  db.insert(appSettings)
    .values({
      id: APP_SETTINGS_ROW_ID,
      keybindingOverrides: JSON.stringify(overrides),
      updatedAt,
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        keybindingOverrides: JSON.stringify(overrides),
        updatedAt,
      },
    })
    .run();
}

export function getMcpRegistry(db: DbConnection): McpRegistry {
  const row = db
    .select({ mcpServers: appSettings.mcpServers })
    .from(appSettings)
    .where(eq(appSettings.id, APP_SETTINGS_ROW_ID))
    .get();

  if (row === undefined) {
    return defaultMcpRegistry;
  }
  return mcpRegistrySchema.parse(JSON.parse(row.mcpServers));
}

export function setMcpRegistry(db: DbConnection, registry: McpRegistry): void {
  const updatedAt = Date.now();
  const serialized = JSON.stringify(mcpRegistrySchema.parse(registry));
  db.insert(appSettings)
    .values({
      id: APP_SETTINGS_ROW_ID,
      mcpServers: serialized,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        mcpServers: serialized,
        updatedAt,
      },
    })
    .run();
}
