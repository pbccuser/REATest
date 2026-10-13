// Presentational overlay for positioning one image on the current page.
//
// Mirrors the pointer->normalized math in AnnotationLayer.tsx: coordinates are
// derived from getBoundingClientRect and clamped to 0..1 with a top-left
// origin. The parent owns the chosen image and the "active" flag; this
// component only reports a finished rectangle through onPlace.
import { useRef, useState } from 'react';
import './stamp.css';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  active: boolean;
  width: number;  // css px of the page canvas
  height: number;
  imageDataUrl: string | null;
  onPlace: (rect: Rect) => void;
}

export default function ImagePlacer(p: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<Rect | null>(null);

  const norm = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const down = (e: React.PointerEvent) => {
    if (!p.active || !p.imageDataUrl) return;
    ref.current!.setPointerCapture(e.pointerId);
    const pt = norm(e);
    start.current = pt;
    setDraft({ x: pt.x, y: pt.y, w: 0, h: 0 });
  };

  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    const pt = norm(e);
    setDraft({
      x: Math.min(start.current.x, pt.x),
      y: Math.min(start.current.y, pt.y),
      w: Math.abs(pt.x - start.current.x),
      h: Math.abs(pt.y - start.current.y),
    });
  };

  const up = () => {
    if (draft && draft.w > 0.01 && draft.h > 0.01) p.onPlace(draft);
    setDraft(null);
    start.current = null;
  };

  const enabled = p.active && !!p.imageDataUrl;

  return (
    <div
      ref={ref}
      className="image-placer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: p.width,
        height: p.height,
        pointerEvents: enabled ? 'auto' : 'none',
        cursor: enabled ? 'crosshair' : 'default',
        touchAction: 'none',
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
    >
      {draft && p.imageDataUrl && (
        <div
          className="image-placer-rect"
          style={{
            left: draft.x * p.width,
            top: draft.y * p.height,
            width: draft.w * p.width,
            height: draft.h * p.height,
          }}
        >
          <img src={p.imageDataUrl} alt="" draggable={false} />
        </div>
      )}
    </div>
  );
}
