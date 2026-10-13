import type { Measurement } from '../types';
import { realLength, realArea, fmt, type PageScale } from '../lib/measure';

interface PagePt { Wp: number; Hp: number }

interface Props {
  open: boolean;
  page: number;
  pageScale: Record<number, PageScale>;
  pagePt: Record<number, PagePt>;
  measurements: Measurement[];
  countLabel: string;
  onCountLabel: (s: string) => void;
  onCalibrate: () => void;      // selects the calibrate tool
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function MeasurePanel(p: Props) {
  if (!p.open) return null;
  const cur = p.pageScale[p.page];

  const valueOf = (m: Measurement): { v: number | null; unit: string } => {
    const s = p.pageScale[m.page], pt = p.pagePt[m.page];
    if (m.type === 'count') return { v: 1, unit: '' };
    if (!s || !pt) return { v: null, unit: '' };
    const v = m.type === 'length'
      ? realLength(m.points, pt.Wp, pt.Hp, s)
      : realArea(m.points, pt.Wp, pt.Hp, s);
    return { v, unit: m.type === 'area' ? `${s.unit}²` : s.unit };
  };

  // Totals
  const lenTotals: Record<string, number> = {};
  const areaTotals: Record<string, number> = {};
  const countTotals: Record<string, number> = {};
  for (const m of p.measurements) {
    const { v, unit } = valueOf(m);
    if (m.type === 'length' && v != null) lenTotals[unit] = (lenTotals[unit] ?? 0) + v;
    else if (m.type === 'area' && v != null) areaTotals[unit] = (areaTotals[unit] ?? 0) + v;
    else if (m.type === 'count') { const k = m.label || 'Count'; countTotals[k] = (countTotals[k] ?? 0) + 1; }
  }

  const exportCsv = () => {
    const rows = [['page', 'type', 'label', 'value', 'unit']];
    for (const m of p.measurements) {
      const { v, unit } = valueOf(m);
      rows.push([String(m.page), m.type, m.label ?? '', v == null ? '' : String(Math.round(v * 100) / 100), unit]);
    }
    const csv = rows.map((r) => r.map((c) => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'takeoff.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <aside className="measure-panel">
      <div className="mp-head">
        <strong>Measurements</strong>
        <button className="btn" onClick={p.onClose} title="Hide panel">×</button>
      </div>

      <div className="mp-section">
        <div className="mp-row-between">
          <span>Page {p.page} scale</span>
          <button className="btn" onClick={p.onCalibrate}>{cur ? 'Recalibrate' : 'Calibrate'}</button>
        </div>
        <div className="mp-scale">{cur ? `1 pt = ${fmt(cur.unitsPerPoint)} ${cur.unit}` : 'Not calibrated — draw a known distance'}</div>
      </div>

      <div className="mp-section">
        <label className="mp-label">Count label
          <input value={p.countLabel} onChange={(e) => p.onCountLabel(e.target.value)} placeholder="e.g. Outlets" />
        </label>
      </div>

      <div className="mp-section mp-totals">
        <strong>Totals</strong>
        {Object.entries(lenTotals).map(([u, v]) => <div key={u}>Length: {fmt(v)} {u}</div>)}
        {Object.entries(areaTotals).map(([u, v]) => <div key={u}>Area: {fmt(v)} {u}</div>)}
        {Object.entries(countTotals).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
        {p.measurements.length === 0 && <div className="mp-empty">No measurements yet.</div>}
      </div>

      <div className="mp-list">
        {p.measurements.map((m) => {
          const { v, unit } = valueOf(m);
          return (
            <div key={m.id} className="mp-item">
              <span className="mp-swatch" style={{ background: m.color }} />
              <span className="mp-type">{m.type === 'count' ? (m.label || 'Count') : m.type}</span>
              <span className="mp-val">{m.type === 'count' ? '1' : v == null ? '—' : `${fmt(v)} ${unit}`}</span>
              <span className="mp-pg">p{m.page}</span>
              <button className="mp-del" onClick={() => p.onDelete(m.id)} title="Delete">🗑</button>
            </div>
          );
        })}
      </div>

      <div className="mp-section">
        <button className="btn primary full" disabled={p.measurements.length === 0} onClick={exportCsv}>Export CSV</button>
      </div>
    </aside>
  );
}
