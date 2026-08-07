import { useEffect, useMemo, useState } from "react";
import { isAgentActive } from "../lifecycle.js";
import type { RosterAgent } from "../types.js";

function formatDuration(activeSince: string, now: number): string {
  const elapsedMs = now - new Date(activeSince).getTime();
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${remainder}s`;
  return `${minutes}m ${remainder}s`;
}

export function useActiveDurations(agents: RosterAgent[]): Map<string, string> {
  const activeSinceById = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      if (isAgentActive(agent) && agent.active_since) {
        map.set(agent.id, agent.active_since);
      }
    }
    return map;
  }, [agents]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (activeSinceById.size === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeSinceById.size]);

  return useMemo(() => {
    const durations = new Map<string, string>();
    for (const [agentId, activeSince] of activeSinceById) {
      durations.set(agentId, formatDuration(activeSince, now));
    }
    return durations;
  }, [activeSinceById, now]);
}
