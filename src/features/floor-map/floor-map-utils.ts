import type { MapZone } from './floor-map-types';

/**
 * Convert percentage coordinates (0-100) to canvas pixels.
 */
export function percentToPixels(
  coordPercent: number[],
  canvasWidth: number,
  canvasHeight: number
): [number, number] {
  const x = (coordPercent[0] / 100) * canvasWidth;
  const y = (coordPercent[1] / 100) * canvasHeight;
  return [x, y];
}

/**
 * Compute center point of a polygon (average of vertices).
 */
export function polygonCenter(coords: number[][]): [number, number] {
  if (coords.length === 0) return [0, 0];
  let sumX = 0;
  let sumY = 0;
  for (const p of coords) {
    sumX += p[0];
    sumY += p[1];
  }
  return [sumX / coords.length, sumY / coords.length];
}

/**
 * Default quadrant layout when zone has no coordinates.
 * Returns polygon as percentage coords (0-100) for the given quadrant index (0-based).
 * Padding from edges in percentage.
 */
export function defaultZonePolygonForQuadrant(
  quadrantIndex: number,
  paddingPercent = 5
): number[][] {
  const p = paddingPercent;
  const half = 50;
  switch (quadrantIndex % 4) {
    case 0:
      return [[p, p], [half - p / 2, p], [half - p / 2, half - p / 2], [p, half - p / 2]];
    case 1:
      return [[half + p / 2, p], [100 - p, p], [100 - p, half - p / 2], [half + p / 2, half - p / 2]];
    case 2:
      return [[p, half + p / 2], [half - p / 2, half + p / 2], [half - p / 2, 100 - p], [p, 100 - p]];
    case 3:
    default:
      return [
        [half + p / 2, half + p / 2],
        [100 - p, half + p / 2],
        [100 - p, 100 - p],
        [half + p / 2, 100 - p],
      ];
  }
}

/**
 * Ensure zone has valid coordinates; assign default quadrant polygon if missing.
 */
export function ensureZoneCoordinates(
  zone: MapZone,
  zoneIndex: number,
  canvasWidth: number,
  canvasHeight: number
): number[][] {
  if (zone.coordinates && zone.coordinates.length >= 3) {
    return zone.coordinates.map((p) => {
      if (p.length >= 2) return [(p[0] / 100) * canvasWidth, (p[1] / 100) * canvasHeight];
      return [0, 0];
    });
  }
  const defaultPoly = defaultZonePolygonForQuadrant(zoneIndex);
  return defaultPoly.map((p) => [(p[0] / 100) * canvasWidth, (p[1] / 100) * canvasHeight]);
}

/**
 * Validate local file path (no external URLs).
 */
export function isValidFloorPlanPath(path: string | null): boolean {
  if (!path || typeof path !== 'string') return false;
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
    return false;
  }
  return true;
}
