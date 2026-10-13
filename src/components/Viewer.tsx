import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface Props {
  doc: PDFDocumentProxy | null;
  pageNumber: number; // 1-based
  scale: number;
}

export default function Viewer({ doc, pageNumber, scale }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const renderTask = useRef<ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!doc) return;

    (async () => {
      try {
        setError(null);
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask.current?.cancel();
        renderTask.current = page.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        });
        await renderTask.current.promise;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes('Rendering cancelled')) setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      renderTask.current?.cancel();
    };
  }, [doc, pageNumber, scale]);

  if (!doc) {
    return <div className="viewer empty">Open a PDF to get started.</div>;
  }

  return (
    <div className="viewer">
      {error && <div className="error">Could not render page: {error}</div>}
      <canvas ref={canvasRef} className="page-canvas" />
    </div>
  );
}
