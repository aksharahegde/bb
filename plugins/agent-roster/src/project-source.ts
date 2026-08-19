import type { BbPluginApi } from "@get-bb/plugin-sdk";

export interface ProjectSource {
  hostId: string;
  rootPath: string;
}

export async function resolveProjectSource(
  bb: BbPluginApi,
  projectId: string,
): Promise<ProjectSource> {
  const project = await bb.sdk.projects.get({ projectId });
  const source =
    project.sources.find((entry) => entry.isDefault) ?? project.sources[0];
  if (!source) {
    throw new Error("Project has no registered source path");
  }
  return {
    hostId: source.hostId,
    rootPath: source.path.replace(/\/+$/, ""),
  };
}

export function rosterDirectory(source: ProjectSource): string {
  return `${source.rootPath}/.bb/roster`;
}

export function agentsFilePath(source: ProjectSource): string {
  return `${rosterDirectory(source)}/agents.json`;
}

export function officeLayoutFilePath(source: ProjectSource): string {
  return `${rosterDirectory(source)}/office_layout.json`;
}

export function hostFileArgs(source: ProjectSource): {
  hostId: string;
  rootPath: string;
} {
  return {
    hostId: source.hostId,
    rootPath: source.rootPath,
  };
}
