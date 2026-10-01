import type { Table } from "../engine/types";

const PALETTE = ["#1b3a4b", "#9a5412", "#1d7a46", "#6d28d9"];

export function DataTable({
  table,
  rows,
  dimRows,
  highlightAttribute,
  emphasisValue,
  usedAttributes,
  selectedRow,
  onSelectRow,
}: {
  table: Table;
  rows: number[];
  dimRows: number[];
  highlightAttribute: string | null;
  emphasisValue: string | null;
  usedAttributes: string[];
  selectedRow: number | null;
  onSelectRow: ((index: number) => void) | null;
}) {
  const dim = new Set(dimRows);
  const used = new Set(usedAttributes);
  const highlightIndex =
    highlightAttribute === null ? -1 : table.columns.indexOf(highlightAttribute);
  const values: string[] = [];
  if (highlightIndex >= 0) {
    for (const index of rows) {
      const value = table.rows[index][highlightIndex];
      if (!values.includes(value)) values.push(value);
    }
  }
  const colorOf = new Map(values.map((value, index) => [value, PALETTE[index % PALETTE.length]]));

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {table.columns.map((column) => {
              const role =
                column === table.columns[table.idIndex]
                  ? "id"
                  : column === table.columns[table.classIndex]
                    ? "class"
                    : column === highlightAttribute
                      ? "active"
                      : used.has(column)
                        ? "used"
                        : "candidate";
              return (
                <th key={column} className={`col-${role}`}>
                  <span>{column}</span>
                  {role === "id" && <small>identifier</small>}
                  {role === "class" && <small>label</small>}
                  {role === "used" && <small>already asked</small>}
                  {role === "active" && <small>scoring</small>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((index) => {
            const row = table.rows[index];
            const label = row[table.classIndex];
            const faded = dim.has(index);
            const selected = selectedRow === index;
            const group = highlightIndex >= 0 ? row[highlightIndex] : null;
            const focused = emphasisValue !== null && group === emphasisValue;
            return (
              <tr
                key={row[table.idIndex]}
                className={[
                  faded ? "is-dim" : "",
                  selected ? "is-selected" : "",
                  focused ? "is-focus" : "",
                  onSelectRow ? "is-clickable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={group && colorOf.has(group) ? { boxShadow: `inset 4px 0 0 ${colorOf.get(group)}` } : undefined}
                onClick={onSelectRow ? () => onSelectRow(index) : undefined}
                aria-selected={selected || undefined}
              >
                {row.map((cell, cellIndex) => {
                  const isClass = cellIndex === table.classIndex;
                  return (
                    <td key={`${row[0]}-${cellIndex}`}>
                      {isClass ? <span className={label === "no" ? "pill no" : "pill yes"}>{cell}</span> : cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
