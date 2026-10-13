import { useRef, useState } from 'react';
import type { Annotation, Point, Tool } from '../types';
import { newId } from '../types';

interface Props {
  page: number;          // 1-based
  width: number;         // css px of the page canvas
  height: number;
  scale: number;         // pdf.js scale (px per pt)
  tool: Tool;
  color: string;
  strokeWidth: number;   // pt
  annotations: Annotation[]; // this page only
  selectedId: string | null;
  onAdd: (a: Annotation) => void;
  onSelect: (id: string | null) => void;
}

export default function AnnotationLayer(p: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const start = useRef<Point | null>(null);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [textAt, setTextAt] = useState<Point | null>(null);

  const norm = (e: React.PointerEvent): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const down = (e: React.PointerEvent) => {
    if (p.tool === 'select') return;
    if (p.tool === 'text') { setTextAt(norm(e)); return; }
    svgRef.current!.setPointerCapture(e.pointerId);
    const pt = norm(e);
    start.current = pt;
    if (p.tool === 'pen') {
      setDraft({ id: newId(), page: p.page, type: 'pen', color: p.color, width: p.strokeWidth, points: [pt] });
    } else {
      setDraft({ id: newId(), page: p.page, type: p.tool, color: p.color, width: p.strokeWidth, x: pt.x, y: pt.y, w: 0, h: 0 });
    }
  };

  const move = (e: React.PointerEvent) => {
    if (!draft || !start.current) return;
    const pt = norm(e);
    if (draft.type === 'pen') {
      setDraft({ ...draft, points: [...(draft.points ?? []), pt] });
    } else {
      const x = Math.min(start.current.x, pt.x), y = Math.min(start.current.y, pt.y);
      setDraft({ ...draft, x, y, w: Math.abs(pt.x - start.current.x), h: Math.abs(pt.y - start.current.y) });
    }
  };

  const up = () => {
    if (draft) {
      const big = draft.type === 'pen' ? (draft.points?.length ?? 0) > 1 : (draft.w ?? 0) > 0.005 && (draft.h ?? 0) > 0.005;
      if (big) p.onAdd(draft);
      setDraft(null);
    }
    start.current = null;
  };

  const commitText = (value: string) => {
    if (textAt && value.trim()) {
      p.onAdd({ id: newId(), page: p.page, type: 'text', color: p.color, x: textAt.x, y: textAt.y, text: value, fontSize: 14 });
    }
    setTextAt(null);
  };

  const render = (a: Annotation, selected: boolean) => {
    const sel = selected ? { strokeDasharray: '4 3', stroke: '#6c7cff', strokeWidth: 1.5 } : {};
    const click = p.tool === 'select' ? () => p.onSelect(a.id) : undefined;
    const pe = p.tool === 'select' ? 'auto' : 'none';
    const px = (v: number) => v * p.width, py = (v: number) => v * p.height;

    if (a.type === 'highlight') {
      return <rect key={a.id} x={px(a.x!)} y={py(a.y!)} width={px(a.w!)} height={py(a.h!)}
        fill={a.color} fillOpacity={0.35} onClick={click} style={{ pointerEvents: pe }} {...sel} />;
    }
    if (a.type === 'rect') {
      return <rect key={a.id} x={px(a.x!)} y={py(a.y!)} width={px(a.w!)} height={py(a.h!)}
        fill="none" stroke={selected ? '#6c7cff' : a.color} strokeWidth={(a.width ?? 2) * p.scale}
        strokeDasharray={selected ? '4 3' : undefined} onClick={click} style={{ pointerEvents: pe }} />;
    }
    if (a.type === 'pen') {
      return <polyline key={a.id} points={(a.points ?? []).map((q) => `${px(q.x)},${py(q.y)}`).join(' ')}
        fill="none" stroke={selected ? '#6c7cff' : a.color} strokeWidth={(a.width ?? 2) * p.scale}
        strokeLinejoin="round" strokeLinecap="round" onClick={click} style={{ pointerEvents: pe }} />;
    }
    // text
    const size = (a.fontSize ?? 14) * p.scale;
    return (
      <text key={a.id} x={px(a.x!)} y={py(a.y!) + size} fontSize={size} fill={a.color}
        fontFamily="Helvetica, Arial, sans-serif" onClick={click}
        style={{ pointerEvents: pe, textDecoration: selected ? 'underline' : undefined }}>
        {(a.text ?? '').split('\n').map((line, i) => (
          <tspan key={i} x={px(a.x!)} dy={i === 0 ? 0 : size * 1.2}>{line}</tspan>
        ))}
      </text>
    );
  };

  const cursor = p.tool === 'select' ? 'default' : p.tool === 'text' ? 'text' : 'crosshair';

  return (
    <>
      <svg ref={svgRef} className="anno-layer" width={p.width} height={p.height}
        style={{ cursor }} onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onClick={(e) => { if (p.tool === 'select' && e.target === svgRef.current) p.onSelect(null); }}>
        {p.annotations.map((a) => render(a, a.id === p.selectedId))}
        {draft && render(draft, false)}
      </svg>
      {textAt && (
        <textarea className="text-input" autoFocus
          style={{ left: textAt.x * p.width, top: textAt.y * p.height, color: p.color, fontSize: 14 * p.scale }}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
            if (e.key === 'Escape') { setTextAt(null); }
          }} />
      )}
    </>
  );
}
