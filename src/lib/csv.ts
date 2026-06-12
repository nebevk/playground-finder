// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped "" quotes, and
// commas / newlines inside quotes. Good enough for admin spreadsheet imports.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-blank rows.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const TRUTHY = new Set(["1", "true", "yes", "y", "da", "x", "✓"]);
export function parseBool(value: string | undefined): boolean {
  return value != null && TRUTHY.has(value.trim().toLowerCase());
}
