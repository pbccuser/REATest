// Annotation & measurement model. All geometry is stored in NORMALIZED
// coordinates (0..1 relative to the page, top-left origin) so it survives
// zoom and maps cleanly onto PDF points when baked.
export type AnnoTool = 'highlight' | 'rect' | 'pen' | 'text';
export type MeasureTool = 'calibrate' | 'length' | 'area' | 'count';
export type Tool = 'select' | AnnoTool | MeasureTool;

export const MEASURE_TOOLS: MeasureTool[] = ['calibrate', 'length', 'area', 'count'];
export const isMeasureTool = (t: Tool): t is MeasureTool =>
  (MEASURE_TOOLS as string[]).includes(t);

export interface Point { x: number; y: number }

export interface Annotation {
  id: string;
  page: number;      // 1-based
  type: AnnoTool;
  color: string;
  width?: number;    // stroke width, PDF points (pen / rect)
  x?: number; y?: number; w?: number; h?: number; // rect & highlight
  points?: Point[];  // pen
  text?: string; fontSize?: number; // text
}

export interface Measurement {
  id: string;
  page: number;        // 1-based
  type: 'length' | 'area' | 'count';
  color: string;
  points: Point[];     // length/area: vertices; count: one marker point
  label?: string;      // count group name, or optional note
}

export const newId = () =>
  (crypto.randomUUID?.() ?? `a${Date.now()}${Math.random().toString(16).slice(2)}`);
