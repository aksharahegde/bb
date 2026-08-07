/** 0 = deep night, 1 = full daylight. Uses local clock hour. */
export function localDayNightFactor(date = new Date()): number {
  const hours = date.getHours() + date.getMinutes() / 60;
  const daylight = Math.sin(((hours - 6) / 12) * Math.PI);
  return 0.32 + 0.68 * Math.max(0, daylight);
}

export function dayNightSkyTint(factor: number): {
  ambientScale: number;
  directionalScale: number;
  warmth: number;
} {
  return {
    ambientScale: 0.55 + factor * 0.45,
    directionalScale: 0.4 + factor * 0.6,
    warmth: 1 - factor,
  };
}
