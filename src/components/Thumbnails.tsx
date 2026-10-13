import { useEffect, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

interface Props {
  doc: PDFDocumentProxy | null;
  current: number; // 1-based
  onSelect: (page: number) => void;
}

function Thumb({ doc, pageNumber, active, onSelect }: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onSelect: (p: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 0.28 });
      const canvas = ref.current!;
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [doc, pageNumber]);

  return (
    <button
      className={`thumb ${active ? 'active' : ''}`}
      onClick={() => onSelect(pageNumber)}
      title={`Page ${pageNumber}`}
    >
      <canvas ref={ref} />
      <span>{pageNumber}</span>
    </button>
  );
}

export default function Thumbnails({ doc, current, onSelect }: Props) {
  if (!doc) return <aside className="thumbs empty" />;
  const pages = Array.from({ length: doc.numPages }, (_, i) => i + 1);
  return (
    <aside className="thumbs">
      {pages.map((p) => (
        <Thumb key={p} doc={doc} pageNumber={p} active={p === current} onSelect={onSelect} />
      ))}
    </aside>
  );
}
