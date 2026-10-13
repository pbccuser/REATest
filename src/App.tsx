import { useCallback, useEffect, useRef, useState } from 'react';
import { pdfjsLib } from './pdfjs';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Annotation, Tool } from './types';
import Viewer from './components/Viewer';
import Thumbnails from './components/Thumbnails';
import Toolbar, { type RightPanel } from './components/Toolbar';
import * as engine from './lib/pdfEngine';
import { applyAnnotations } from './lib/annotate';
// Features
import { MarkupsList } from './features/markupsList/MarkupsList';
import { ToolChest } from './features/toolChest/ToolChest';
import FormPanel from './features/forms/FormPanel';
import { getFormFields, fillForm, type FieldInfo } from './features/forms/forms';
import { stampImage, readImageFile } from './features/stamp/stamp';

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

  // Feature panels / state
  const [rightPanel, setRightPanel] = useState<RightPanel>('none');
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [image, setImage] = useState<{ bytes: Uint8Array; isPng: boolean; dataUrl: string } | null>(null);

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

  const flatten = async (): Promise<Uint8Array> => {
    const b = bytesRef.current!;
    if (anns.length === 0) return b;
    const baked = await applyAnnotations(b, anns);
    bytesRef.current = baked;
    setAnns([]); setSelectedId(null);
    return baked;
  };

  const onOpen = (files: FileList) => guard(async () => {
    const file = files[0];
    setName(file.name);
    setAnns([]); setSelectedId(null); setFields([]); setImage(null);
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
    engine.downloadBytes(await applyAnnotations(bytesRef.current, anns), name);
  });

  // Annotations
  const addAnn = (a: Annotation) => setAnns((p) => [...p, a]);
  const undo = () => setAnns((p) => p.slice(0, -1));
  const clearPage = () => setAnns((p) => p.filter((a) => a.page !== page));

  // Forms
  const detectFields = () => guard(async () => {
    if (!bytesRef.current) return;
    setFields(await getFormFields(bytesRef.current));
  });
  const applyForm = (values: Record<string, string>, checks: Record<string, boolean>, flattenForm: boolean) =>
    guard(async () => {
      if (!bytesRef.current) return;
      const out = await fillForm(bytesRef.current, values, checks, flattenForm);
      await setBytes(out, page);
      setFields(flattenForm ? [] : await getFormFields(out));
    });

  // Image / signature
  const onPickImage = (files: FileList) => guard(async () => {
    const img = await readImageFile(files[0]);
    setImage(img);
    setTool('image');
  });
  const onPlaceImage = (rect: { x: number; y: number; w: number; h: number }) => guard(async () => {
    if (!bytesRef.current || !image) return;
    const base = await flatten();
    const out = await stampImage(base, image.bytes, image.isPng, [{ page, ...rect }]);
    await setBytes(out, page);
    setImage(null); setTool('select');
  });

  const onPanel = (panel: RightPanel) => {
    setRightPanel(panel);
    if (panel === 'forms' && bytesRef.current) detectFields();
  };

  const chooseTool = (t: Tool) => { setTool(t); setSelectedId(null); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.tagName === 'TEXTAREA' || el?.tagName === 'INPUT' || el?.tagName === 'SELECT') return;
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
        rightPanel={rightPanel}
        onOpen={onOpen} onMerge={onMerge}
        onPrev={() => setPage((n) => Math.max(1, n - 1))}
        onNext={() => setPage((n) => Math.min(total, n + 1))}
        onZoom={(d) => setScale((s) => Math.min(4, Math.max(0.3, +(s + d).toFixed(2))))}
        onRotate={onRotate} onDelete={onDelete} onExtract={onExtract} onDownload={onDownload}
        onTool={chooseTool} onColor={setColor} onStroke={setStroke} onUndo={undo} onClearPage={clearPage}
        onPanel={onPanel} onPickImage={onPickImage}
      />
      <div className="workspace">
        <Thumbnails doc={doc} current={page} onSelect={setPage} />
        <main className="stage">
          <Viewer
            doc={doc} pageNumber={page} scale={scale}
            tool={tool} color={color} strokeWidth={strokeWidth}
            annotations={anns} selectedId={selectedId} imageDataUrl={image?.dataUrl ?? null}
            onAdd={addAnn} onSelect={setSelectedId} onPlaceImage={onPlaceImage}
          />
        </main>

        <MarkupsList open={rightPanel === 'markups'} annotations={anns} onClose={() => setRightPanel('none')} />
        {rightPanel === 'tools' && (
          <aside className="side-panel">
            <div className="side-head"><strong>Tool Chest</strong>
              <button className="btn" onClick={() => setRightPanel('none')}>×</button></div>
            <ToolChest p={{
              current: { tool, color, width: strokeWidth },
              onApply: (preset) => { setTool(preset.tool); setColor(preset.color); setStroke(preset.width); },
            }} />
          </aside>
        )}
        <FormPanel
          open={rightPanel === 'forms'} fields={fields} busy={busy}
          onDetect={detectFields} onApply={applyForm} onClose={() => setRightPanel('none')}
        />
      </div>
    </div>
  );
}
