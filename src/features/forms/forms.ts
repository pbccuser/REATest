// PDF Form Filling feature — reads AcroForm fields from a document and writes
// values back into it. Fully client-side via pdf-lib. Every operation takes
// source bytes and returns fresh bytes so the viewer can re-render afterward.
import {
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
} from 'pdf-lib';
import { loadDoc } from '../../lib/pdfEngine';

export type FieldKind = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'optionlist' | 'other';

export interface FieldInfo {
  name: string;
  kind: FieldKind;
  value: string;
  checked?: boolean;
  options?: string[];
}

/**
 * Inspect the AcroForm of a PDF and return a flat description of each field:
 * its name, kind, current value/selection, and (where applicable) options.
 * Returns an empty array if the document has no form or cannot be read.
 */
export async function getFormFields(bytes: Uint8Array): Promise<FieldInfo[]> {
  try {
    const doc = await loadDoc(bytes);
    const form = doc.getForm();
    const fields = form.getFields();
    const out: FieldInfo[] = [];

    for (const field of fields) {
      const name = field.getName();

      if (field instanceof PDFTextField) {
        out.push({ name, kind: 'text', value: field.getText() ?? '' });
      } else if (field instanceof PDFCheckBox) {
        out.push({ name, kind: 'checkbox', value: '', checked: field.isChecked() });
      } else if (field instanceof PDFDropdown) {
        const selected = field.getSelected();
        out.push({
          name,
          kind: 'dropdown',
          value: selected[0] ?? '',
          options: field.getOptions(),
        });
      } else if (field instanceof PDFRadioGroup) {
        out.push({
          name,
          kind: 'radio',
          value: field.getSelected() ?? '',
          options: field.getOptions(),
        });
      } else if (field instanceof PDFOptionList) {
        const selected = field.getSelected();
        out.push({
          name,
          kind: 'optionlist',
          value: selected[0] ?? '',
          options: field.getOptions(),
        });
      } else {
        out.push({ name, kind: 'other', value: '' });
      }
    }

    return out;
  } catch {
    return [];
  }
}

/**
 * Apply values and checkbox states to the form, then optionally flatten the
 * form (baking values in and making them non-editable), and return new bytes.
 * `values` is keyed by field name for text/dropdown/radio/optionlist fields;
 * `checks` is keyed by field name for checkbox fields. Each field is guarded
 * so a single bad field cannot abort the whole fill.
 */
export async function fillForm(
  bytes: Uint8Array,
  values: Record<string, string>,
  checks: Record<string, boolean>,
  flatten: boolean,
): Promise<Uint8Array> {
  const doc = await loadDoc(bytes);
  const form = doc.getForm();

  for (const field of form.getFields()) {
    const name = field.getName();
    try {
      if (field instanceof PDFTextField) {
        if (name in values) field.setText(values[name]);
      } else if (field instanceof PDFCheckBox) {
        if (name in checks) {
          if (checks[name]) field.check();
          else field.uncheck();
        }
      } else if (field instanceof PDFDropdown) {
        const v = values[name];
        if (v) field.select(v);
      } else if (field instanceof PDFRadioGroup) {
        const v = values[name];
        if (v) field.select(v);
      } else if (field instanceof PDFOptionList) {
        const v = values[name];
        if (v) field.select(v);
      }
    } catch {
      // Ignore this field and keep filling the rest.
    }
  }

  if (flatten) {
    try {
      form.flatten();
    } catch {
      // If flattening fails, still return the filled document.
    }
  }

  return doc.save();
}
