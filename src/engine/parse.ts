import type { Table } from "./types";

/** Parse the comma-separated training file. There are no quoted commas in this dataset. */
export function parseCsv(text: string): Table {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("The training file needs a header and at least one row.");
  }
  const columns = lines[0].split(",").map((cell) => cell.trim());
  const rows = lines.slice(1).map((line, index) => {
    const cells = line.split(",").map((cell) => cell.trim());
    if (cells.length !== columns.length) {
      throw new Error(`Row ${index + 1} has ${cells.length} cells, expected ${columns.length}.`);
    }
    return cells;
  });
  return {
    columns,
    rows,
    classIndex: columns.length - 1,
    idIndex: 0,
    candidateAttributes: columns.slice(1, -1),
  };
}

export function attributeIndex(table: Table, name: string): number {
  const index = table.columns.indexOf(name);
  if (index < 0) {
    throw new Error(`Unknown attribute ${name}.`);
  }
  return index;
}
