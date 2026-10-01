import { attributeIndex } from "./parse";
import { classCounts, entropy, infoTerms, majorityLabel } from "./entropy";
import type { AttributeScore, DTNode, SubsetScore, Table, TreeNodeView } from "./types";

/**
 * Score one candidate the way maxGain does.
 * Attributes are tried later, left to right. This function only measures one.
 * Info_A(D) = Σ (|Dj| / |D|) · Info(Dj)
 * Gain(A) = Info(D) − Info_A(D)
 */
export function scoreAttribute(
  table: Table,
  rows: string[][],
  attribute: string,
  infoD: number,
): AttributeScore {
  const attrIndex = attributeIndex(table, attribute);
  const order: string[] = [];
  const groups = new Map<string, string[][]>();
  for (const row of rows) {
    const value = row[attrIndex];
    let bucket = groups.get(value);
    if (!bucket) {
      bucket = [];
      groups.set(value, bucket);
      order.push(value);
    }
    bucket.push(row);
  }
  const subsets: SubsetScore[] = order.map((value) => {
    const subset = groups.get(value)!;
    const counts = classCounts(subset, table.classIndex);
    return {
      value,
      count: subset.length,
      counts,
      info: entropy(counts),
    };
  });
  const total = rows.length;
  const infoA = subsets.reduce((sum, subset) => sum + (subset.count / total) * subset.info, 0);
  return {
    attribute,
    info: infoA,
    gain: infoD - infoA,
    subsets,
  };
}

function grow(
  table: Table,
  rowIndexes: number[],
  available: string[],
  parentId: string | null,
  via: string | null,
  path: DTNode["path"],
  depth: number,
): DTNode {
  if (depth > 12) {
    throw new Error("The tree grew deeper than this lesson allows.");
  }
  const rows = rowIndexes.map((index) => table.rows[index]);
  const counts = classCounts(rows, table.classIndex);
  const { info, total } = infoTerms(counts);
  const id = parentId === null ? "root" : `${parentId}/${via}`;
  const base = {
    id,
    parentId,
    via,
    path: path.map((edge) => ({ ...edge })),
    counts,
    total,
    info,
    scores: [] as AttributeScore[],
    chosenGain: null as number | null,
    children: [] as DTNode["children"],
    rowIndexes: [...rowIndexes],
  };

  if (counts.length <= 1) {
    return {
      ...base,
      attribute: null,
      leafLabel: counts[0]?.label ?? majorityLabel(rows, table.classIndex),
      reason: "pure",
    };
  }

  if (available.length === 0) {
    return {
      ...base,
      attribute: null,
      leafLabel: majorityLabel(rows, table.classIndex),
      reason: "majority",
    };
  }

  const scores = available.map((name) => scoreAttribute(table, rows, name, info));
  let best = scores[0];
  for (const score of scores) {
    // Strictly greater, matching `if (attr_gain > maxGain)` in maxGain.
    // An exact tie keeps the earlier column.
    if (score.gain > best.gain) best = score;
  }

  const attrIndex = attributeIndex(table, best.attribute);
  const nextAvailable = available.filter((name) => name !== best.attribute);
  const order: string[] = [];
  const groups = new Map<string, number[]>();
  for (const index of rowIndexes) {
    const value = table.rows[index][attrIndex];
    if (!groups.has(value)) {
      order.push(value);
      groups.set(value, []);
    }
    groups.get(value)!.push(index);
  }

  const children = order.map((value) => ({
    value,
    node: grow(
      table,
      groups.get(value)!,
      nextAvailable,
      id,
      value,
      [...path, { attribute: best.attribute, value }],
      depth + 1,
    ),
  }));

  return {
    ...base,
    attribute: best.attribute,
    leafLabel: null,
    reason: "split",
    scores,
    chosenGain: best.gain,
    children,
  };
}

/** Grow the ID3 tree. Column 0 (RID) and the class column are never candidates. */
export function buildTree(table: Table): DTNode {
  const rowIndexes = table.rows.map((_, index) => index);
  return grow(table, rowIndexes, table.candidateAttributes, null, null, [], 0);
}

export function flatten(node: DTNode): DTNode[] {
  return [node, ...node.children.flatMap((child) => flatten(child.node))];
}

export function leafRules(node: DTNode): string[] {
  if (!node.attribute) {
    const who =
      node.path.length === 0
        ? "Everyone"
        : node.path.map((edge) => `${edge.attribute} = ${edge.value}`).join(" and ");
    return [`${who} → ${node.leafLabel}`];
  }
  return node.children.flatMap((child) => leafRules(child.node));
}

export function toView(node: DTNode, status: TreeNodeView["status"]): TreeNodeView {
  return {
    id: node.id,
    parentId: node.parentId,
    via: node.via,
    title: node.attribute ? `${node.attribute}?` : (node.leafLabel ?? "?"),
    kind: node.attribute ? "split" : "leaf",
    counts: node.counts.map((count) => ({ ...count })),
    total: node.total,
    status,
    leafLabel: node.leafLabel,
  };
}
