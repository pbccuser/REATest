interface Props {
  hasDoc: boolean;
  page: number;
  total: number;
  scale: number;
  busy: boolean;
  onOpen: (files: FileList) => void;
  onMerge: (files: FileList) => void;
  onPrev: () => void;
  onNext: () => void;
  onZoom: (delta: number) => void;
  onRotate: (delta: number) => void;
  onDelete: () => void;
  onExtract: () => void;
  onDownload: () => void;
}

export default function Toolbar(p: Props) {
  return (
    <header className="toolbar">
      <div className="brand">PDForge</div>

      <label className="btn primary">
        Open
        <input type="file" accept="application/pdf" hidden
          onChange={(e) => e.target.files && p.onOpen(e.target.files)} />
      </label>

      <label className={`btn ${p.hasDoc ? '' : 'disabled'}`}>
        Merge…
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

      <span className="spacer" />
      {p.busy && <span className="busy">working…</span>}
      <button className="btn primary" disabled={!p.hasDoc} onClick={p.onDownload}>Download</button>
    </header>
  );
}
