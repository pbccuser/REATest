import { useCallback, useEffect, useRef, useState } from 'react';
import { pdfjsLib } from './pdfjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, Tool } from './types';
import Viewer from './components/Viewer';
import Thumbnails from './components/Thumbnails';
import Toolbar from './components/Toolbar';
import * as engine from './lib/pdfEngine';
import { applyAnnotations } from './lib/annotate';

export default function App() {
  const bytesRef = useRef<Uint8Array | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scale, setScale] = useState(1.1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('document.pdf');

  // Markup state.
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState('#e5604d');
  const [strokeWidth, setStroke] = useState(2);
  const [anns, setAnns] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async (keepPage: number) => {
    const bytes = bytesRef.current;
    if (!bytes) return;
    const loaded = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    setDoc(loaded);
    setTotal(loaded.numPages);
    setPage(Math.min(Math.max(1, keepPage), loaded.numPages));
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

  // Bake any pending annotations into the bytes before a structural edit, so
  // they stay attached to the right pages. Returns the (possibly new) bytes.
  const flatten = async (): Promise<Uint8Array> => {
    const b = bytesRef.current!;
    if (anns.length === 0) return b;
    const baked = await applyAnnotations(b, anns);
    bytesRef.current = baked;
    setAnns([]);
    setSelectedId(null);
    return baked;
  };

  const onOpen = (files: FileList) => guard(async () => {
    const file = files[0];
    setName(file.name);
    setAnns([]); setSelectedId(null);
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
    const base = await flatten();
    await setBytes(await engine.rotatePage(base, page - 1, delta), page);
  });

  const onDelete = () => guard(async () => {
    if (!bytesRef.current) return;
    const base = await flatten();
    await setBytes(await engine.deletePage(base, page - 1), page);
  });

  const onExtract = () => guard(async () => {
    if (!bytesRef.current) return;
    const base = await flatten();
    const out = await engine.extractRange(base, page - 1, page - 1);
    engine.downloadBytes(out, name.replace(/\.pdf$/i, '') + `-p${page}.pdf`);
  });

  const onDownload = () => guard(async () => {
    if (!bytesRef.current) return;
    const baked = await applyAnnotations(bytesRef.current, anns);
    engine.downloadBytes(baked, name);
  });

  const addAnn = (a: Annotation) => setAnns((prev) => [...prev, a]);
  const undo = () => setAnns((prev) => prev.slice(0, -1));
  const clearPage = () => setAnns((prev) => prev.filter((a) => a.page !== page));
  const deleteSelected = () => {
    if (!selectedId) return;
    setAnns((prev) => prev.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === 'TEXTAREA' || (e.target as HTMLElement)?.tagName === 'INPUT';
      if (typing) return;
      if (!doc) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { e.preventDefault(); deleteSelected(); return; }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setPage((n) => Math.min(n + 1, total));
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setPage((n) => Math.max(n - 1, 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doc, total, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const annCount = anns.length;

  return (
    <div className="app">
      <Toolbar
        hasDoc={!!doc} page={page} total={total} scale={scale} busy={busy}
        tool={tool} color={color} strokeWidth={strokeWidth} canUndo={annCount > 0}
        onOpen={onOpen} onMerge={onMerge}
        onPrev={() => setPage((n) => Math.max(1, n - 1))}
        onNext={() => setPage((n) => Math.min(total, n + 1))}
        onZoom={(d) => setScale((s) => Math.min(4, Math.max(0.3, +(s + d).toFixed(2))))}
        onRotate={onRotate} onDelete={onDelete} onExtract={onExtract} onDownload={onDownload}
        onTool={(t) => { setTool(t); setSelectedId(null); }}
        onColor={setColor} onStroke={setStroke} onUndo={undo} onClearPage={clearPage}
      />
      <div className="workspace">
        <Thumbnails doc={doc} current={page} onSelect={setPage} />
        <main className="stage">
          <Viewer
            doc={doc} pageNumber={page} scale={scale}
            tool={tool} color={color} strokeWidth={strokeWidth}
            annotations={anns} selectedId={selectedId}
            onAdd={addAnn} onSelect={setSelectedId}
          />
        </main>
      </div>
    </div>
  );
}
