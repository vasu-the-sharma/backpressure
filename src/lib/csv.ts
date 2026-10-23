/**
 * CSV that opens safely in a spreadsheet. Cells are quoted when they need it,
 * and a cell a spreadsheet would run as a formula (starting with =, +, -, @,
 * a tab or a carriage return) gets a leading apostrophe, because some values
 * come from visitors.
 */
export function csvCell(value: unknown): string {
  let s = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return `${[header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
