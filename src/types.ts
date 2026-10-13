// Annotation model. All geometry is stored in NORMALIZED coordinates
// (0..1 relative to the page, top-left origin) so it survives zoom and
// maps cleanly onto PDF points when baked.
export type Tool = 'select' | 'highlight' | 'rect' | 'pen' | 'text';

export interface Point { x: number; y: number }

export interface Annotation {
  id: string;
  page: number;      // 1-based
  type: Exclude<Tool, 'select'>;
  color: string;     // hex
  width?: number;    // stroke width, PDF points (pen / rect)
  // rect & highlight:
  x?: number; y?: number; w?: number; h?: number;
  // pen:
  points?: Point[];
  // text:
  text?: string; fontSize?: number;
}

export const newId = () =>
  (crypto.randomUUID?.() ?? `a${Date.now()}${Math.random().toString(16).slice(2)}`);
