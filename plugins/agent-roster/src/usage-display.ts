export interface UsageDisplay {
  label: string;
  usedPercent: number | null;
  available: boolean;
}

interface UsageWindow {
  label: string;
  usedPercent: number;
}

interface UsageProviderSnapshot {
  status: string;
  windows?: UsageWindow[];
}

export interface UsageSnapshot {
  codex: UsageProviderSnapshot;
  claudeCode: UsageProviderSnapshot;
  cursor: UsageProviderSnapshot;
}

function bestWindow(
  usage: UsageProviderSnapshot,
): { label: string; usedPercent: number } | null {
  if (usage.status !== "ok" || !usage.windows || usage.windows.length === 0) {
    return null;
  }
  const window = usage.windows[0]!;
  return { label: window.label, usedPercent: window.usedPercent };
}

export function summarizeProviderUsage(usage: UsageSnapshot): UsageDisplay {
  const candidates = [
    bestWindow(usage.claudeCode),
    bestWindow(usage.codex),
    bestWindow(usage.cursor),
  ].filter((entry): entry is { label: string; usedPercent: number } => !!entry);

  if (candidates.length === 0) {
    return {
      label: "Usage unavailable",
      usedPercent: null,
      available: false,
    };
  }

  const peak = candidates.reduce((best, current) =>
    current.usedPercent > best.usedPercent ? current : best,
  );
  return {
    label: `${peak.label} ${Math.round(peak.usedPercent)}%`,
    usedPercent: peak.usedPercent,
    available: true,
  };
}
