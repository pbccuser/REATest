import { useEffect, useState } from 'react';
import type { FieldInfo } from './forms';
import './forms.css';

interface FormPanelProps {
  open: boolean;
  fields: FieldInfo[];
  busy: boolean;
  onDetect: () => void;
  onApply: (
    values: Record<string, string>,
    checks: Record<string, boolean>,
    flatten: boolean,
  ) => void;
  onClose: () => void;
}

export default function FormPanel(p: FormPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [flatten, setFlatten] = useState(false);

  // Re-seed local input state whenever a fresh set of fields is detected.
  useEffect(() => {
    const v: Record<string, string> = {};
    const c: Record<string, boolean> = {};
    for (const f of p.fields) {
      if (f.kind === 'checkbox') c[f.name] = !!f.checked;
      else v[f.name] = f.value;
    }
    setValues(v);
    setChecks(c);
  }, [p.fields]);

  if (!p.open) return null;

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));
  const setCheck = (name: string, value: boolean) =>
    setChecks((prev) => ({ ...prev, [name]: value }));

  const renderInput = (f: FieldInfo) => {
    if (f.kind === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={!!checks[f.name]}
          onChange={(e) => setCheck(f.name, e.target.checked)}
        />
      );
    }
    if ((f.kind === 'dropdown' || f.kind === 'radio' || f.kind === 'optionlist') && f.options) {
      return (
        <select
          className="forms-input"
          value={values[f.name] ?? ''}
          onChange={(e) => setValue(f.name, e.target.value)}
        >
          <option value="">— none —</option>
          {f.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type="text"
        className="forms-input"
        value={values[f.name] ?? ''}
        onChange={(e) => setValue(f.name, e.target.value)}
      />
    );
  };

  return (
    <div className="forms-panel">
      <div className="forms-header">
        <span className="forms-title">Form Fields</span>
        <button className="forms-close" onClick={p.onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="forms-body">
        <button className="forms-btn" onClick={p.onDetect} disabled={p.busy}>
          Detect fields
        </button>

        {p.fields.length === 0 ? (
          <p className="forms-empty">No fields detected yet.</p>
        ) : (
          <>
            <div className="forms-fields">
              {p.fields.map((f) => (
                <label className="forms-field" key={f.name}>
                  <span className="forms-label" title={f.name}>
                    {f.name}
                  </span>
                  {renderInput(f)}
                </label>
              ))}
            </div>

            <label className="forms-flatten">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(e) => setFlatten(e.target.checked)}
              />
              <span>Flatten (make non-editable)</span>
            </label>

            <button
              className="forms-btn forms-btn-primary"
              onClick={() => p.onApply(values, checks, flatten)}
              disabled={p.busy}
            >
              Apply to PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}
