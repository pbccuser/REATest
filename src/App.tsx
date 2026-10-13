import { useCallback, useEffect, useRef, useState } from 'react';
import { pdfjsLib } from './pdfjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, Measurement, Point, Tool } from './types';
import { isMeasureTool } from './types';
import type { PageScale } from './lib/measure';
import { parseLengthInput } from './lib/measure';
import Viewer from './components/Viewer';
import Thumbnails from './components/Thumbnails';
import Toolbar from './components/Toolbar';
import MeasurePanel from './components/MeasurePanel';
import * as engine from './lib/pdfEngine';
import { applyAnnotations } from './lib/annotate';
import { applyMeasurements } from './lib/measureBake';

interface PagePt { Wp: number; Hp: number }

export default function App() {
  const bytesRef = useRef<Uint8Array | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scale, setScale] = useState(1.1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('document.pdf');

  // Markup
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState('#e5604d');
  const [strokeWidth, setStroke] = useState(2);
  const [anns, setAnns] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Measurement
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [pageScale, setPageScale] = useState<Record<number, PageScale>>({});
  const [pagePt, setPagePt] = useState<Record<number, PagePt>>({});
  const [countLabel, setCountLabel] = useState('Count');
  const [panelOpen, setPanelOpen] = useState(false);

  const refresh = useCallback(async (keepPage: number) => {
    const bytes = bytesRef.current;
    if (!bytes) return;
    const loaded = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    setDoc(loaded);
    setTotal(loaded.numPages);
    setPage(Math.min(Math.max(1, keepPage), loaded.numPages));
    // Record each page's size in PDF points (for measurement math).
    const sizes: Record<number, PagePt> = {};
    for (let i = 1; i <= loaded.numPages; i++) {
      const vp = (await loaded.getPage(i)).getViewport({ scale: 1 });
      sizes[i] = { Wp: vp.width, Hp: vp.height };
    }
    setPagePt(sizes);
  }, []);

  const setBytes = useCallback(async (bytes: Uint8Array, keepPage: number) => {
    bytesRef.current = bytes;
    await refresh(keepPage);
  }, [refresh]);

  const readFile = (file: File) =>
    new Promise<Uint8Array>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
      r.onerror = () => reject(r.error);
      r.readAsArrayBuffer(file);
    });

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); }
    catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  // Bake annotations + measurements into bytes (used on download and before
  // structural edits so markup stays attached to the right pages).
  const bakeAll = async (b: Uint8Array) => {
    let out = await applyAnnotations(b, anns);
    out = await applyMeasurements(out, measurements, pageScale);
    return out;
  };

  const flatten = async (): Promise<Uint8Array> => {
    const b = bytesRef.current!;
    if (anns.length === 0 && measurements.length === 0) return b;
    const baked = await bakeAll(b);
    bytesRef.current = baked;
    setAnns([]); setMeasurements([]); setSelectedId(null);
    return baked;
  };

  const onOpen = (files: FileList) => guard(async () => {
    const file = files[0];
    setName(file.name);
    setAnns([]); setMeasurements([]); setPageScale({}); setSelectedId(null);
    await setBytes(await readFile(file), 1);
  });

  const onMerge = (files: FileList) => guard(async () => {
    if (!bytesRef.current) return;
    const base = await flatten();
    const additions = await Promise.all(Array.from(files).map(readFile));
    await setBytes(await engine.mergeInto(base, additions), page);
  });
  const onRotate = (delta: number) => guard(async () => {
    if (!bytesRef.current) return;
    await setBytes(await engine.rotatePage(await flatten(), page - 1, delta), page);
  });
  const onDelete = () => guard(async () => {
    if (!bytesRef.current) return;
    await setBytes(await engine.deletePage(await flatten(), page - 1), page);
  });
  const onExtract = () => guard(async () => {
    if (!bytesRef.current) return;
    const out = await engine.extractRange(await flatten(), page - 1, page - 1);
    engine.downloadBytes(out, name.replace(/\.pdf$/i, '') + `-p${page}.pdf`);
  });
  const onDownload = () => guard(async () => {
    if (!bytesRef.current) return;
    engine.downloadBytes(await bakeAll(bytesRef.current), name);
  });

  // Annotations
  const addAnn = (a: Annotation) => setAnns((p) => [...p, a]);
  const undo = () => setAnns((p) => p.slice(0, -1));
  const clearPage = () => setAnns((p) => p.filter((a) => a.page !== page));

  // Measurements
  const addMeasurement = (m: Measurement) => setMeasurements((p) => [...p, m]);
  const deleteMeasurement = (id: string) => setMeasurements((p) => p.filter((m) => m.id !== id));

  const onCalibrate = (pts: [Point, Point]) => {
    const pt = pagePt[page];
    if (!pt) return;
    const dx = (pts[0].x - pts[1].x) * pt.Wp, dy = (pts[0].y - pts[1].y) * pt.Hp;
    const lenPt = Math.hypot(dx, dy);
    if (lenPt < 1) { alert('That line is too short to calibrate — draw a longer known distance.'); return; }
    const entry = window.prompt('Real length of that line? e.g. "20 ft", "20\' 6\\"", "6 m", "240 in"');
    if (!entry) return;
    const parsed = parseLengthInput(entry);
    if (!parsed) { alert('Could not read that length. Try e.g. "20 ft" or "6 m".'); return; }
    setPageScale((prev) => ({ ...prev, [page]: { unitsPerPoint: parsed.value / lenPt, unit: parsed.unit } }));
    setTool('length');
  };

  const chooseTool = (t: Tool) => {
    setTool(t); setSelectedId(null);
    if (isMeasureTool(t)) setPanelOpen(true);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.tagName === 'TEXTAREA' || el?.tagName === 'INPUT') return;
      if (!doc) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        setAnns((p) => p.filter((a) => a.id !== selectedId));
        setSelectedId(null);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setPage((n) => Math.min(n + 1, total));
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setPage((n) => Math.max(n - 1, 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doc, total, selectedId]);

  return (
    <div className="app">
      <Toolbar
        hasDoc={!!doc} page={page} total={total} scale={scale} busy={busy}
        tool={tool} color={color} strokeWidth={strokeWidth} canUndo={anns.length > 0}
        panelOpen={panelOpen}
        onOpen={onOpen} onMerge={onMerge}
        onPrev={() => setPage((n) => Math.max(1, n - 1))}
        onNext={() => setPage((n) => Math.min(total, n + 1))}
        onZoom={(d) => setScale((s) => Math.min(4, Math.max(0.3, +(s + d).toFixed(2))))}
        onRotate={onRotate} onDelete={onDelete} onExtract={onExtract} onDownload={onDownload}
        onTool={chooseTool} onColor={setColor} onStroke={setStroke} onUndo={undo} onClearPage={clearPage}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />
      <div className="workspace">
        <Thumbnails doc={doc} current={page} onSelect={setPage} />
        <main className="stage">
          <Viewer
            doc={doc} pageNumber={page} scale={scale}
            tool={tool} color={color} strokeWidth={strokeWidth} countLabel={countLabel}
            pageScale={pageScale[page] ?? null}
            annotations={anns} measurements={measurements} selectedId={selectedId}
            onAdd={addAnn} onSelect={setSelectedId}
            onAddMeasurement={addMeasurement} onCalibrate={onCalibrate}
          />
        </main>
        <MeasurePanel
          open={panelOpen} page={page} pageScale={pageScale} pagePt={pagePt}
          measurements={measurements} countLabel={countLabel} onCountLabel={setCountLabel}
          onCalibrate={() => chooseTool('calibrate')} onDelete={deleteMeasurement}
          onClose={() => setPanelOpen(false)}
        />
      </div>
    </div>
  );
}
