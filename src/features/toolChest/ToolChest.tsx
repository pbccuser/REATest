import { useState } from 'react';
import type { Tool } from '../../types';
import {
  type Preset,
  loadPresets,
  savePresets,
  makePreset,
} from './toolChest';
import './toolChest.css';

interface ToolChestProps {
  current: { tool: Tool; color: string; width: number };
  onApply: (preset: Preset) => void;
}

export function ToolChest({ p }: { p: ToolChestProps }) {
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
  const [draftLabel, setDraftLabel] = useState('');

  // Any mutation persists immediately so saved presets survive reloads.
  function commit(next: Preset[]) {
    setPresets(next);
    savePresets(next);
  }

  function saveCurrent() {
    const label = draftLabel.trim() || defaultLabel(p.current);
    const preset = makePreset(
      label,
      p.current.tool,
      p.current.color,
      p.current.width,
    );
    commit([...presets, preset]);
    setDraftLabel('');
  }

  function remove(id: string) {
    commit(presets.filter((preset) => preset.id !== id));
  }

  return (
    <div className="toolchest">
      <div className="toolchest-head">Tool Chest</div>

      <div className="toolchest-save">
        <input
          className="toolchest-input"
          type="text"
          placeholder="Preset name…"
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveCurrent();
          }}
        />
        <button
          className="toolchest-btn primary"
          type="button"
          onClick={saveCurrent}
          title="Save the current tool, color and width as a preset"
        >
          Save current
        </button>
      </div>

      {presets.length === 0 ? (
        <div className="toolchest-empty">
          No presets yet. Set a tool, color and width, then save it here.
        </div>
      ) : (
        <ul className="toolchest-list">
          {presets.map((preset) => (
            <li key={preset.id} className="toolchest-item">
              <button
                className="toolchest-apply"
                type="button"
                onClick={() => p.onApply(preset)}
                title={`Apply ${preset.label}`}
              >
                <span
                  className="toolchest-swatch"
                  style={{ background: preset.color }}
                />
                <span className="toolchest-meta">
                  <span className="toolchest-label">{preset.label}</span>
                  <span className="toolchest-sub">
                    {preset.tool} · {preset.width}px
                  </span>
                </span>
              </button>
              <button
                className="toolchest-del"
                type="button"
                onClick={() => remove(preset.id)}
                title={`Delete ${preset.label}`}
                aria-label={`Delete ${preset.label}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function defaultLabel(current: { tool: Tool; width: number }): string {
  return `${current.tool} ${current.width}px`;
}
