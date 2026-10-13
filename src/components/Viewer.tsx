import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, Measurement, Point, Tool } from '../types';
import { isMeasureTool } from '../types';
import type { PageScale } from '../lib/measure';
import AnnotationLayer from './AnnotationLayer';
import MeasureLayer from './MeasureLayer';

interface Props {
  doc: PDFDocumentProxy | null;
  pageNumber: number;
  scale: number;
  tool: Tool;
  color: string;
  strokeWidth: number;
  countLabel: string;
  pageScale: PageScale | null;
  annotations: Annotation[];
  measurements: Measurement[];
  selectedId: string | null;
  onAdd: (a: Annotation) => void;
  onSelect: (id: string | null) => void;
  onAddMeasurement: (m: Measurement) => void;
  onCalibrate: (points: [Point, Point]) => void;
}

export default function Viewer(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const renderTask = useRef<ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!p.doc) return;
    (async () => {
      try {
        setError(null);
        const page = await p.doc!.getPage(p.pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: p.scale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(viewport.width), h = Math.floor(viewport.height);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        setDims({ w, h });
        renderTask.current?.cancel();
        renderTask.current = page.render({
          canvasContext: ctx, viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await renderTask.current.promise;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('Rendering cancelled')) setError(msg);
      }
    })();
    return () => { cancelled = true; renderTask.current?.cancel(); };
  }, [p.doc, p.pageNumber, p.scale]);

  if (!p.doc) return <div className="viewer empty">Open a PDF to get started.</div>;

  const measuring = isMeasureTool(p.tool);

  return (
    <div className="viewer">
      {error && <div className="error">Could not render page: {error}</div>}
      <div className="page-stack" style={dims ? { width: dims.w, height: dims.h } : undefined}>
        <canvas ref={canvasRef} className="page-canvas" />
        {dims && (
          <>
            <AnnotationLayer
              active={!measuring}
              page={p.pageNumber} width={dims.w} height={dims.h} scale={p.scale}
              tool={p.tool} color={p.color} strokeWidth={p.strokeWidth}
              annotations={p.annotations.filter((a) => a.page === p.pageNumber)}
              selectedId={p.selectedId} onAdd={p.onAdd} onSelect={p.onSelect}
            />
            <MeasureLayer
              active={measuring}
              page={p.pageNumber} width={dims.w} height={dims.h} scale={p.scale}
              tool={p.tool} color={p.color} countLabel={p.countLabel} pageScale={p.pageScale}
              measurements={p.measurements.filter((m) => m.page === p.pageNumber)}
              onAdd={p.onAddMeasurement} onCalibrate={p.onCalibrate}
            />
          </>
        )}
      </div>
    </div>
  );
}
