import type { Tool } from '../types';

export type RightPanel = 'none' | 'markups' | 'tools' | 'forms';

interface Props {
  hasDoc: boolean;
  page: number;
  total: number;
  scale: number;
  busy: boolean;
  tool: Tool;
  color: string;
  strokeWidth: number;
  canUndo: boolean;
  rightPanel: RightPanel;
  onOpen: (files: FileList) => void;
  onMerge: (files: FileList) => void;
  onPrev: () => void;
  onNext: () => void;
  onZoom: (delta: number) => void;
  onRotate: (delta: number) => void;
  onDelete: () => void;
  onExtract: () => void;
  onDownload: () => void;
  onTool: (t: Tool) => void;
  onColor: (c: string) => void;
  onStroke: (w: number) => void;
  onUndo: () => void;
  onClearPage: () => void;
  onPanel: (panel: RightPanel) => void;
  onPickImage: (files: FileList) => void;
}

const TOOLS: { id: Tool; label: string; title: string }[] = [
  { id: 'select', label: '↖', title: 'Select / move (delete with Del key)' },
  { id: 'highlight', label: '✎', title: 'Highlight' },
  { id: 'pen', label: '✏', title: 'Freehand pen' },
  { id: 'rect', label: '▭', title: 'Rectangle' },
  { id: 'text', label: 'T', title: 'Text note' },
];
const SWATCHES = ['#e5604d', '#ffeb3b', '#38c172', '#6c7cff', '#111111'];

export default function Toolbar(p: Props) {
  const panelBtn = (id: 'markups' | 'tools' | 'forms', label: string, title: string) => (
    <button className={`btn ${p.rightPanel === id ? 'active' : ''}`} disabled={!p.hasDoc}
      onClick={() => p.onPanel(p.rightPanel === id ? 'none' : id)} title={title}>{label}</button>
  );

  return (
    <header className="toolbar">
      <div className="brand">PDForge</div>

      <label className="btn primary">Open
        <input type="file" accept="application/pdf" hidden
          onChange={(e) => e.target.files && p.onOpen(e.target.files)} />
      </label>
      <label className={`btn ${p.hasDoc ? '' : 'disabled'}`}>Merge…
        <input type="file" accept="application/pdf" multiple hidden disabled={!p.hasDoc}
          onChange={(e) => e.target.files && p.onMerge(e.target.files)} />
      </label>

      <span className="sep" />
      <button className="btn" disabled={!p.hasDoc} onClick={p.onPrev}>‹</button>
      <span className="pageinfo">{p.hasDoc ? `${p.page} / ${p.total}` : '—'}</span>
      <button className="btn" disabled={!p.hasDoc} onClick={p.onNext}>›</button>

      <span className="sep" />
      <button className="btn" disabled={!p.hasDoc} onClick={() => p.onZoom(-0.2)}>−</button>
      <span className="pageinfo">{Math.round(p.scale * 100)}%</span>
      <button className="btn" disabled={!p.hasDoc} onClick={() => p.onZoom(0.2)}>+</button>

      <span className="sep" />
      <button className="btn" disabled={!p.hasDoc} onClick={() => p.onRotate(-90)} title="Rotate left">⟲</button>
      <button className="btn" disabled={!p.hasDoc} onClick={() => p.onRotate(90)} title="Rotate right">⟳</button>
      <button className="btn danger" disabled={!p.hasDoc} onClick={p.onDelete} title="Delete page">🗑</button>
      <button className="btn" disabled={!p.hasDoc} onClick={p.onExtract} title="Save this page as its own PDF">Extract</button>

      <span className="sep" />
      <div className="tools" role="group" aria-label="Markup tools">
        {TOOLS.map((t) => (
          <button key={t.id} title={t.title}
            className={`btn tool ${p.tool === t.id ? 'active' : ''}`}
            disabled={!p.hasDoc} onClick={() => p.onTool(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="swatches">
        {SWATCHES.map((c) => (
          <button key={c} className={`swatch ${p.color === c ? 'active' : ''}`}
            style={{ background: c }} disabled={!p.hasDoc} onClick={() => p.onColor(c)} title={c} />
        ))}
        <input type="color" className="swatch custom" value={p.color} disabled={!p.hasDoc}
          onChange={(e) => p.onColor(e.target.value)} title="Custom color" />
      </div>
      <select className="btn" disabled={!p.hasDoc} value={p.strokeWidth}
        onChange={(e) => p.onStroke(Number(e.target.value))} title="Stroke width">
        <option value={1}>thin</option>
        <option value={2}>medium</option>
        <option value={4}>thick</option>
      </select>
      <button className="btn" disabled={!p.canUndo} onClick={p.onUndo} title="Undo last annotation">Undo</button>
      <button className="btn" disabled={!p.hasDoc} onClick={p.onClearPage} title="Clear this page's annotations">Clear</button>

      <span className="sep" />
      <label className={`btn tool ${p.tool === 'image' ? 'active' : ''} ${p.hasDoc ? '' : 'disabled'}`} title="Insert image / signature">🖼
        <input type="file" accept="image/png,image/jpeg" hidden disabled={!p.hasDoc}
          onChange={(e) => e.target.files && e.target.files.length && p.onPickImage(e.target.files)} />
      </label>
      {panelBtn('markups', 'Markups', 'Markups list')}
      {panelBtn('tools', 'Tool Chest', 'Saved markup presets')}
      {panelBtn('forms', 'Forms', 'Fill form fields')}

      <span className="spacer" />
      {p.busy && <span className="busy">working…</span>}
      <button className="btn primary" disabled={!p.hasDoc} onClick={p.onDownload}>Download</button>
    </header>
  );
}
