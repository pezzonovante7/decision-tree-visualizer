import { attributeIndex } from "./parse";
import type { Classification, DTNode, Table } from "./types";

export function classify(table: Table, tree: DTNode, row: string[]): Classification {
  const steps: Classification["steps"] = [];
  let node = tree;
  while (node.attribute) {
    const value = row[attributeIndex(table, node.attribute)];
    const child = node.children.find((candidate) => candidate.value === value);
    if (!child) {
      throw new Error(`The tree has no branch for ${node.attribute} = ${value}.`);
    }
    steps.push({
      nodeId: node.id,
      attribute: node.attribute,
      value,
      leafLabel: null,
      text: `${node.attribute} is ${value}, so this person follows the “${value}” branch.`,
    });
    node = child.node;
  }
  const buys = node.leafLabel === "yes";
  steps.push({
    nodeId: node.id,
    attribute: null,
    value: null,
    leafLabel: node.leafLabel,
    text: buys
      ? "The leaf says yes. The tree predicts that this person buys a computer."
      : `The leaf says ${node.leafLabel}. The tree predicts that this person does not buy a computer.`,
  });
  return { label: node.leafLabel ?? "", steps };
}
