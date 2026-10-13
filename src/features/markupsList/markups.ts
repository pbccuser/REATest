import type { Annotation } from '../../types';

export interface MarkupRow {
  page: number;
  type: string;
  color: string;
  detail: string;
}

// Human-readable detail string for a single annotation.
function describe(a: Annotation): string {
  switch (a.type) {
    case 'text':
      return (a.text ?? '').trim() || '(empty note)';
    case 'pen': {
      const n = a.points?.length ?? 0;
      return `freehand (${n} pt${n === 1 ? '' : 's'})`;
    }
    case 'highlight':
      return 'highlight';
    case 'rect':
      return 'box';
    default:
      return a.type;
  }
}

// One row per annotation, sorted by page then type.
export function buildMarkupRows(anns: Annotation[]): MarkupRow[] {
  return anns
    .map((a): MarkupRow => ({
      page: a.page,
      type: a.type,
      color: a.color,
      detail: describe(a),
    }))
    .sort((x, y) => x.page - y.page || x.type.localeCompare(y.type));
}

// Quote a CSV field when it contains a comma, quote, or newline.
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function markupsToCsv(rows: MarkupRow[]): string {
  const header = 'page,type,color,detail';
  const lines = rows.map((r) =>
    [String(r.page), r.type, r.color, r.detail].map(csvField).join(',')
  );
  return [header, ...lines].join('\r\n');
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
