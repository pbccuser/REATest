import { useCallback, useEffect, useRef, useState } from 'react';
import { pdfjsLib } from './pdfjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import Viewer from './components/Viewer';
import Thumbnails from './components/Thumbnails';
import Toolbar from './components/Toolbar';
import * as engine from './lib/pdfEngine';

export default function App() {
  // Canonical document bytes (pdf-lib operates on these).
  const bytesRef = useRef<Uint8Array | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scale, setScale] = useState(1.1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('document.pdf');

  // (Re)load the pdf.js view from the canonical bytes. pdf.js detaches the
  // buffer it receives, so always hand it a fresh copy.
  const refresh = useCallback(async (keepPage: number) => {
    const bytes = bytesRef.current;
    if (!bytes) return;
    const copy = bytes.slice();
    const loaded = await pdfjsLib.getDocument({ data: copy }).promise;
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

  const onOpen = (files: FileList) => guard(async () => {
    const file = files[0];
    setName(file.name);
    await setBytes(await readFile(file), 1);
  });

  const onMerge = (files: FileList) => guard(async () => {
    if (!bytesRef.current) return;
    const additions = await Promise.all(Array.from(files).map(readFile));
    const merged = await engine.mergeInto(bytesRef.current, additions);
    await setBytes(merged, page);
  });

  const onRotate = (delta: number) => guard(async () => {
    if (!bytesRef.current) return;
    await setBytes(await engine.rotatePage(bytesRef.current, page - 1, delta), page);
  });

  const onDelete = () => guard(async () => {
    if (!bytesRef.current) return;
    await setBytes(await engine.deletePage(bytesRef.current, page - 1), page);
  });

  const onExtract = () => guard(async () => {
    if (!bytesRef.current) return;
    const out = await engine.extractRange(bytesRef.current, page - 1, page - 1);
    engine.downloadBytes(out, name.replace(/\.pdf$/i, '') + `-p${page}.pdf`);
  });

  const onDownload = () => {
    if (bytesRef.current) engine.downloadBytes(bytesRef.current, name);
  };

  // Keyboard navigation.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!doc) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') setPage((p) => Math.min(p + 1, total));
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') setPage((p) => Math.max(p - 1, 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doc, total]);

  return (
    <div className="app">
      <Toolbar
        hasDoc={!!doc}
        page={page}
        total={total}
        scale={scale}
        busy={busy}
        onOpen={onOpen}
        onMerge={onMerge}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(total, p + 1))}
        onZoom={(d) => setScale((s) => Math.min(4, Math.max(0.3, +(s + d).toFixed(2))))}
        onRotate={onRotate}
        onDelete={onDelete}
        onExtract={onExtract}
        onDownload={onDownload}
      />
      <div className="workspace">
        <Thumbnails doc={doc} current={page} onSelect={setPage} />
        <main className="stage">
          <Viewer doc={doc} pageNumber={page} scale={scale} />
        </main>
      </div>
    </div>
  );
}
