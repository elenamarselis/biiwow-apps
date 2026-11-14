import { entryValue } from './day';
import { NUTRIENTS, type MetricKey } from './nutrients';
import type { Entry } from './types';

const esc = (v: unknown) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"` : s;
};

/** Diary as CSV: one row per entry, nutrient columns for the logged amount; blank = unknown. */
export function diaryCsv(entries: Entry[]): string {
  const keys: MetricKey[] = [...NUTRIENTS.map((n) => n.key), 'fluid_ml'];
  const head = ['date', 'meal', 'status', 'name', 'brand', 'kind', 'state', 'amount', 'unit', 'portion', 'planned_amount',
    'swapped_from', 'source', 'source_ref', 'note', ...keys.map((k) => k)];
  const rows = entries.map((e) => {
    const vals = keys.map((k) => {
      const v = entryValue(e, k);
      return v === null ? '' : Math.round(v * 100) / 100;
    });
    return [e.entry_date, e.meal, e.status, e.name, e.brand, e.kind, e.state, e.amount, e.unit,
      e.portion_label ? `${e.portion_count ?? 1} × ${e.portion_label}` : '', e.planned_amount, e.swapped_from,
      e.source, e.source_ref, e.note, ...vals].map(esc).join(',');
  });
  return [head.join(','), ...rows].join('\r\n') + '\r\n';
}
