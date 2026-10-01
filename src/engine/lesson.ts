import { buildTree } from "./buildTree";
import { buildTrace } from "./trace";
import type { DTNode, Snapshot, Table } from "./types";

export function loadLesson(table: Table): { tree: DTNode; trace: Snapshot[] } {
  const tree = buildTree(table);
  const trace = buildTrace(table, tree);
  return { tree, trace };
}
