import type { RosterAgent } from "../types.js";

export function zoneLabel(
  zone: RosterAgent["spatial_state"]["zone"],
): string {
  switch (zone) {
    case "desks":
      return "Desks";
    case "conference_room":
      return "Conference";
    case "lounge":
      return "Lounge";
    case "testing_lab":
      return "Testing Lab";
  }
}
