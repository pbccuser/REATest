import './markupsList.css';
import type { Annotation } from '../../types';
import { buildMarkupRows, markupsToCsv, downloadCsv } from './markups';

interface MarkupsListProps {
  open: boolean;
  annotations: Annotation[];
  onClose: () => void;
}

export function MarkupsList(p: MarkupsListProps) {
  if (!p.open) return null;

  const rows = buildMarkupRows(p.annotations);
  const empty = rows.length === 0;

  const onExport = () => {
    downloadCsv(markupsToCsv(rows), 'markups.csv');
  };

  return (
    <aside className="markups-panel">
      <header className="markups-head">
        <span className="markups-title">Markups</span>
        <button
          className="markups-close"
          onClick={p.onClose}
          aria-label="Close markups list"
          title="Close"
        >
          ×
        </button>
      </header>

      <div className="markups-body">
        {empty ? (
          <div className="markups-empty">No markups yet</div>
        ) : (
          <table className="markups-table">
            <thead>
              <tr>
                <th aria-label="color" />
                <th>Pg</th>
                <th>Type</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span
                      className="markups-swatch"
                      style={{ background: r.color }}
                    />
                  </td>
                  <td>{r.page}</td>
                  <td>{r.type}</td>
                  <td className="markups-detail">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <footer className="markups-foot">
        <span className="markups-count">
          {rows.length} markup{rows.length === 1 ? '' : 's'}
        </span>
        <button
          className="btn primary"
          onClick={onExport}
          disabled={empty}
        >
          Export CSV
        </button>
      </footer>
    </aside>
  );
}
