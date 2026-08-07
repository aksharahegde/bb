import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@bb/shared-ui/button";
import { Input } from "@bb/shared-ui/input";
import { cn } from "@bb/shared-ui/lib/utils";
import {
  extractSplits,
  layoutFromSplits,
  LAYOUT_ZONE_IDS,
  MIN_ZONE_SIZE,
  FIXED_GRID,
} from "../layout-editor.js";
import type { OfficeLayout } from "../types.js";

const ZONE_LABELS: Record<string, string> = {
  fixed_desks: "Desks",
  meeting_room: "Conference",
  breakout_room: "Lounge",
  testing_lab: "Testing Lab",
};

function zoneTone(id: string): string {
  switch (id) {
    case "fixed_desks":
    case "testing_lab":
      return "bg-primary/10 border-primary/30";
    case "meeting_room":
      return "bg-success/10 border-success/30";
    case "breakout_room":
      return "bg-muted/60 border-border";
    default:
      return "bg-card border-border";
  }
}

export function LayoutEditorPanel({
  layout,
  saving,
  onChange,
  onSave,
  onCancel,
  onReset,
}: {
  layout: OfficeLayout;
  saving: boolean;
  onChange: (layout: OfficeLayout) => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  const splits = extractSplits(layout);
  const [columnSplit, setColumnSplit] = useState(splits.columnSplit);
  const [rowSplit, setRowSplit] = useState(splits.rowSplit);
  const [zoneNames, setZoneNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(layout.zones.map((zone) => [zone.id, zone.name])),
  );
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"column" | "row" | null>(null);

  useEffect(() => {
    const nextSplits = extractSplits(layout);
    setColumnSplit(nextSplits.columnSplit);
    setRowSplit(nextSplits.rowSplit);
    setZoneNames(
      Object.fromEntries(layout.zones.map((zone) => [zone.id, zone.name])),
    );
  }, [layout]);

  const applyLayout = useCallback(
    (nextColumn: number, nextRow: number, names: Record<string, string>) => {
      const zones = layout.zones.map((zone) => ({
        ...zone,
        name: names[zone.id]?.trim() || zone.name,
      }));
      onChange(layoutFromSplits(nextColumn, nextRow, zones));
    },
    [layout.zones, onChange],
  );

  const updateColumnSplit = (value: number): void => {
    const next = Math.min(
      FIXED_GRID.width - MIN_ZONE_SIZE,
      Math.max(MIN_ZONE_SIZE, value),
    );
    setColumnSplit(next);
    applyLayout(next, rowSplit, zoneNames);
  };

  const updateRowSplit = (value: number): void => {
    const next = Math.min(
      FIXED_GRID.height - MIN_ZONE_SIZE,
      Math.max(MIN_ZONE_SIZE, value),
    );
    setRowSplit(next);
    applyLayout(columnSplit, next, zoneNames);
  };

  const updateZoneName = (zoneId: string, name: string): void => {
    const next = { ...zoneNames, [zoneId]: name };
    setZoneNames(next);
    applyLayout(columnSplit, rowSplit, next);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    const grid = gridRef.current;
    if (!grid || !dragRef.current) return;
    const rect = grid.getBoundingClientRect();
    if (dragRef.current === "column") {
      const ratio = (event.clientX - rect.left) / rect.width;
      updateColumnSplit(Math.round(ratio * FIXED_GRID.width));
      return;
    }
    const ratio = (event.clientY - rect.top) / rect.height;
    updateRowSplit(Math.round(ratio * FIXED_GRID.height));
  };

  const endDrag = (): void => {
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", endDrag);
  };

  const startDrag = (axis: "column" | "row"): void => {
    dragRef.current = axis;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", endDrag);
  };

  const columnPercent = (columnSplit / FIXED_GRID.width) * 100;
  const rowPercent = (rowSplit / FIXED_GRID.height) * 100;

  return (
    <div
      className="absolute right-4 top-4 z-40 w-80 rounded-lg border border-border bg-popover p-4 shadow-lg"
      data-testid="roster-layout-editor"
    >
      <div className="mb-3 text-sm font-semibold">Edit Office Layout</div>
      <div
        ref={gridRef}
        className="relative mb-4 aspect-[3/2] overflow-hidden rounded-md border border-border bg-card"
        data-testid="roster-layout-grid"
      >
        {LAYOUT_ZONE_IDS.map((zoneId) => {
          const zone = layout.zones.find((entry) => entry.id === zoneId);
          if (!zone) return null;
          const left = (zone.bounds.x / FIXED_GRID.width) * 100;
          const top = (zone.bounds.y / FIXED_GRID.height) * 100;
          const width = (zone.bounds.width / FIXED_GRID.width) * 100;
          const height = (zone.bounds.height / FIXED_GRID.height) * 100;
          return (
            <div
              key={zoneId}
              className={cn(
                "absolute border text-[10px] font-medium text-muted-foreground",
                zoneTone(zoneId),
              )}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            >
              <span className="absolute left-1 top-1 truncate pr-1">
                {ZONE_LABELS[zoneId]}
              </span>
            </div>
          );
        })}
        <button
          type="button"
          aria-label="Adjust column split"
          className="absolute bottom-0 top-0 z-10 w-2 -translate-x-1/2 cursor-col-resize bg-primary/40 hover:bg-primary/70"
          style={{ left: `${columnPercent}%` }}
          onPointerDown={(event) => {
            event.preventDefault();
            startDrag("column");
          }}
          data-testid="roster-layout-column-handle"
        />
        <button
          type="button"
          aria-label="Adjust row split"
          className="absolute left-0 right-0 z-10 h-2 -translate-y-1/2 cursor-row-resize bg-primary/40 hover:bg-primary/70"
          style={{ top: `${rowPercent}%` }}
          onPointerDown={(event) => {
            event.preventDefault();
            startDrag("row");
          }}
          data-testid="roster-layout-row-handle"
        />
      </div>
      <div className="space-y-3">
        {LAYOUT_ZONE_IDS.map((zoneId) => (
          <div key={zoneId} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {ZONE_LABELS[zoneId]} name
            </label>
            <Input
              value={zoneNames[zoneId] ?? ""}
              onChange={(event) => updateZoneName(zoneId, event.target.value)}
              data-testid={`roster-layout-name-${zoneId}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          data-testid="roster-layout-reset"
        >
          Reset
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          data-testid="roster-layout-cancel"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="ml-auto"
          disabled={saving}
          onClick={onSave}
          data-testid="roster-layout-save"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
