import type { Tool } from '../../types';

// A reusable markup preset: a tool plus its color and stroke width.
export interface Preset {
  id: string;
  label: string;
  tool: Tool;
  color: string;
  width: number;
}

const STORAGE_KEY = 'pdforge.toolchest';

// Generate a stable id. Prefer crypto.randomUUID when available, else fall
// back to a timestamp + random string (sufficient for local-only ids).
function makeId(): string {
  const uuid = crypto.randomUUID?.();
  if (uuid) return uuid;
  return `p${Date.now()}${Math.random().toString(16).slice(2)}`;
}

export function makePreset(
  label: string,
  tool: Tool,
  color: string,
  width: number,
): Preset {
  return { id: makeId(), label, tool, color, width };
}

// Load persisted presets. Never throws: localStorage may be unavailable
// (privacy mode, blocked storage) or hold malformed data — any failure
// yields an empty list so the app can keep running.
export function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPreset);
  } catch {
    return [];
  }
}

// Persist presets. Swallows any storage error so a full/blocked quota can
// never crash the caller.
export function savePresets(p: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Ignore: storage unavailable or quota exceeded.
  }
}

const TOOLS: ReadonlyArray<Tool> = ['select', 'highlight', 'rect', 'pen', 'text'];

function isPreset(value: unknown): value is Preset {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.tool === 'string' &&
    (TOOLS as ReadonlyArray<string>).includes(v.tool) &&
    typeof v.color === 'string' &&
    typeof v.width === 'number'
  );
}
