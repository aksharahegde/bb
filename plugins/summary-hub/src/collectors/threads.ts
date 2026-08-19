import type { BbPluginApi } from "@get-bb/plugin-sdk";
import type { CollectedThread } from "../types.js";

export async function collectThreads(
  bb: BbPluginApi,
  projectId: string,
  start: Date,
  end: Date,
): Promise<CollectedThread[]> {
  const threads: CollectedThread[] = [];
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const page = await bb.sdk.threads.list({
      projectId,
      includeHidden: true,
      limit: pageSize,
      offset,
    });
    for (const thread of page) {
      if (
        thread.updatedAt >= start.getTime() &&
        thread.updatedAt < end.getTime()
      ) {
        threads.push({
          id: thread.id,
          title: thread.title,
          originKind: thread.originKind,
          originPluginId: thread.originPluginId,
          updatedAt: thread.updatedAt,
        });
      }
    }
    if (page.length < pageSize) break;
    offset += pageSize;
    if (offset > 2_000) break;
  }
  return threads.sort((left, right) => right.updatedAt - left.updatedAt);
}
