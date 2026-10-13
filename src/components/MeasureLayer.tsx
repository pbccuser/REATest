import { useRef, useState } from 'react';
import type { Measurement, MeasureTool, Point, Tool } from '../types';
import { newId } from '../types';
import { pagePoints, realLength, realArea, centroid, fmtLength, fmtArea, type PageScale } from '../lib/measure';

interface Props {
  active: boolean;
  page: number;
  width: number;   // css px
  height: number;
  scale: number;   // px per pt
  tool: Tool;
  color: string;
  countLabel: string;
  pageScale: PageScale | null;
  measurements: Measurement[];   // this page only
  onAdd: (m: Measurement) => void;
  onCalibrate: (points: [Point, Point]) => void;
}

export default function MeasureLayer(p: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);

  const { Wp, Hp } = pagePoints(p.width, p.height, p.scale);
  const px = (v: number) => v * p.width, py = (v: number) => v * p.height;
  const mt = p.tool as MeasureTool;

  const norm = (e: React.MouseEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const finishVertexTool = (type: 'length' | 'area', pts: Point[]) => {
    // Drop consecutive near-duplicate vertices (a double-click fires click
    // events before dblclick, which would otherwise stack points).
    const clean = pts.filter((q, i) => i === 0 || Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) > 0.002);
    const min = type === 'area' ? 3 : 2;
    if (clean.length >= min) p.onAdd({ id: newId(), page: p.page, type, color: p.color, points: clean });
    setDraft([]); setCursor(null);
  };

  const click = (e: React.MouseEvent) => {
    if (!p.active) return;
    const pt = norm(e);
    if (mt === 'count') {
      p.onAdd({ id: newId(), page: p.page, type: 'count', color: p.color, points: [pt], label: p.countLabel || 'Count' });
      return;
    }
    if (mt === 'calibrate') {
      const next = [...draft, pt];
      if (next.length === 2) { p.onCalibrate([next[0], next[1]]); setDraft([]); setCursor(null); }
      else setDraft(next);
      return;
    }
    // length / area: accumulate vertices
    setDraft((d) => [...d, pt]);
  };

  const dbl = () => {
    if (mt === 'length') finishVertexTool('length', draft);
    if (mt === 'area') finishVertexTool('area', draft);
  };

  const keyFinish = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') dbl();
    if (e.key === 'Escape') { setDraft([]); setCursor(null); }
  };

  const liveLabel = (pts: Point[], type: 'length' | 'area'): string => {
    if (!p.pageScale) return 'calibrate first';
    return type === 'length'
      ? fmtLength(realLength(pts, Wp, Hp, p.pageScale), p.pageScale.unit)
      : fmtArea(realArea(pts, Wp, Hp, p.pageScale), p.pageScale.unit);
  };

  const renderMeasurement = (m: Measurement) => {
    if (m.type === 'count') {
      const c = m.points[0];
      return <g key={m.id}>
        <circle cx={px(c.x)} cy={py(c.y)} r={6} fill={m.color} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5} />
      </g>;
    }
    const pointsStr = m.points.map((q) => `${px(q.x)},${py(q.y)}`).join(' ');
    const lbl = liveLabel(m.points, m.type);
    const anchor = m.type === 'area' ? centroid(m.points) : m.points[Math.floor(m.points.length / 2)];
    return (
      <g key={m.id}>
        {m.type === 'area'
          ? <polygon points={pointsStr} fill={m.color} fillOpacity={0.18} stroke={m.color} strokeWidth={1.5} />
          : <polyline points={pointsStr} fill="none" stroke={m.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {m.points.map((q, i) => <circle key={i} cx={px(q.x)} cy={py(q.y)} r={2.5} fill={m.color} />)}
        <text x={px(anchor.x)} y={py(anchor.y)} className="measure-label" fill="#fff" stroke="#000" strokeWidth={0.5}
          fontSize={12} paintOrder="stroke" textAnchor="middle">{lbl}</text>
      </g>
    );
  };

  const draftPts = cursor ? [...draft, cursor] : draft;

  return (
    <svg ref={svgRef} className="measure-layer" width={p.width} height={p.height} tabIndex={0}
      style={{ pointerEvents: p.active ? 'auto' : 'none', cursor: p.active ? 'crosshair' : 'default' }}
      onClick={click} onDoubleClick={dbl} onKeyDown={keyFinish}
      onPointerMove={(e) => { if (p.active && (draft.length > 0 || mt === 'calibrate')) setCursor(norm(e)); }}>
      {p.measurements.map(renderMeasurement)}

      {/* in-progress draft */}
      {draftPts.length > 0 && (mt === 'length' || mt === 'calibrate') && (
        <polyline points={draftPts.map((q) => `${px(q.x)},${py(q.y)}`).join(' ')}
          fill="none" stroke={p.color} strokeWidth={2} strokeDasharray="5 3" />
      )}
      {draftPts.length > 0 && mt === 'area' && (
        <polygon points={draftPts.map((q) => `${px(q.x)},${py(q.y)}`).join(' ')}
          fill={p.color} fillOpacity={0.12} stroke={p.color} strokeWidth={1.5} strokeDasharray="5 3" />
      )}
      {draft.map((q, i) => <circle key={i} cx={px(q.x)} cy={py(q.y)} r={3} fill={p.color} />)}
      {draft.length > 0 && cursor && (mt === 'length' || mt === 'area') && (
        <text x={px(cursor.x) + 10} y={py(cursor.y) - 8} fill="#fff" stroke="#000" strokeWidth={0.5}
          fontSize={12} paintOrder="stroke">{liveLabel(draftPts, mt)}</text>
      )}
    </svg>
  );
}
