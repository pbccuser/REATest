// Measurement & quantity-takeoff core: scale calibration, geometry in PDF
// points, and unit formatting. Geometry is stored in normalized coords
// (like annotations); real-world values are derived using the page's
// calibrated scale, so a page must be calibrated before its measurements
// mean anything.
import type { Point } from '../types';

export interface PageScale {
  unitsPerPoint: number; // real-world units per PDF point
  unit: string;          // display unit, e.g. "ft"
}

// A page's width/height in PDF points, derived from the css render size.
export const pagePoints = (cssW: number, cssH: number, scale: number) => ({
  Wp: cssW / scale,
  Hp: cssH / scale,
});

const toPt = (p: Point, Wp: number, Hp: number) => ({ x: p.x * Wp, y: p.y * Hp });

export function distPts(a: Point, b: Point, Wp: number, Hp: number): number {
  const pa = toPt(a, Wp, Hp), pb = toPt(b, Wp, Hp);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

export function polylineLengthPts(pts: Point[], Wp: number, Hp: number): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += distPts(pts[i - 1], pts[i], Wp, Hp);
  return s;
}

// Shoelace area in square points.
export function polygonAreaPts(pts: Point[], Wp: number, Hp: number): number {
  if (pts.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = toPt(pts[i], Wp, Hp);
    const q = toPt(pts[(i + 1) % pts.length], Wp, Hp);
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

export const realLength = (pts: Point[], Wp: number, Hp: number, s: PageScale) =>
  polylineLengthPts(pts, Wp, Hp) * s.unitsPerPoint;

export const realArea = (pts: Point[], Wp: number, Hp: number, s: PageScale) =>
  polygonAreaPts(pts, Wp, Hp) * s.unitsPerPoint * s.unitsPerPoint;

export const centroid = (pts: Point[]): Point => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

const UNIT_ALIASES: Record<string, string> = {
  "'": 'ft', ft: 'ft', feet: 'ft', foot: 'ft',
  '"': 'in', in: 'in', inch: 'in', inches: 'in',
  m: 'm', meter: 'm', meters: 'm', metre: 'm',
  mm: 'mm', cm: 'cm', yd: 'yd', yard: 'yd', yards: 'yd',
};

/**
 * Parse a known-distance entry such as "20 ft", "20'", "6m", "240in",
 * or feet-inches like `20' 6"`. Returns the value in a single unit.
 */
export function parseLengthInput(raw: string): { value: number; unit: string } | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // feet-inches: 20' 6"  or  20'6
  const fi = s.match(/^(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)\s*"?$/);
  if (fi) return { value: parseFloat(fi[1]) + parseFloat(fi[2]) / 12, unit: 'ft' };

  const m = s.match(/^(\d+(?:\.\d+)?)\s*([a-z"']*)$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!isFinite(value) || value <= 0) return null;
  const unit = UNIT_ALIASES[m[2]] ?? (m[2] ? null : 'ft');
  if (!unit) return null;
  return { value, unit };
}

export const fmt = (v: number) =>
  (Math.round(v * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const fmtLength = (v: number, unit: string) => `${fmt(v)} ${unit}`;
export const fmtArea = (v: number, unit: string) => `${fmt(v)} ${unit}²`;
