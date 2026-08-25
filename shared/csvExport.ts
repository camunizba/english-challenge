export type CsvExportRow = Record<string, string | number | null | undefined>;

function escapeValue(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return /[",\n]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

export function rowsToCsv(columns: Array<{ key: string; label: string }>, rows: CsvExportRow[]) {
  const header = columns.map(column => escapeValue(column.label)).join(",");
  const data = rows.map(row => columns.map(column => escapeValue(row[column.key])).join(","));
  return [header, ...data].join("\n");
}
