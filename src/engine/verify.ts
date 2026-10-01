import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./parse";
import { bits, entropy, majorityLabel } from "./entropy";
import { buildTree, flatten } from "./buildTree";
import { classify } from "./classify";
import { buildTrace } from "./trace";
import type { DTNode } from "./types";

const csvPath = fileURLToPath(new URL("../data/input.csv", import.meta.url));
const table = parseCsv(readFileSync(csvPath, "utf8"));

assert.equal(table.rows.length, 14);
assert.deepEqual(table.columns, [
  "RID",
  "age",
  "income",
  "student",
  "credit_rating",
  "Class:buys_computer",
]);
assert.deepEqual(table.candidateAttributes, ["age", "income", "student", "credit_rating"]);

assert.equal(entropy([{ label: "yes", count: 4 }]), 0);
assert.equal(majorityLabel([["no"], ["yes"], ["no"], ["yes"]], 0), "no");
assert.equal(majorityLabel([["yes"], ["yes"], ["no"]], 0), "yes");

const tie = parseCsv(`RID,a,b,class
1,x,x,yes
2,x,x,yes
3,y,y,no
4,y,y,no
`);
assert.equal(buildTree(tie).attribute, "a");

const tree = buildTree(table);
assert.equal(tree.attribute, "age");
assert.equal(bits(tree.info), "0.940");
assert.deepEqual(
  tree.scores.map((score) => score.attribute),
  ["age", "income", "student", "credit_rating"],
);

const gainOf = (name: string) => tree.scores.find((score) => score.attribute === name)!.gain;
assert.equal(bits(gainOf("age")), "0.247");
assert.equal(bits(gainOf("income")), "0.029");
assert.equal(bits(gainOf("student")), "0.152");
assert.equal(bits(gainOf("credit_rating")), "0.048");

const byValue = Object.fromEntries(tree.children.map((child) => [child.value, child.node]));
assert.deepEqual(
  tree.children.map((child) => child.value),
  ["youth", "middle_aged", "senior"],
);
assert.equal(byValue.youth.attribute, "student");
assert.equal(byValue.middle_aged.attribute, null);
assert.equal(byValue.middle_aged.leafLabel, "yes");
assert.equal(byValue.senior.attribute, "credit_rating");

const youth = byValue.youth;
assert.ok(youth.scores.every((score) => score.attribute !== "age"));
assert.equal(youth.scores.find((score) => score.attribute === "student")!.info, 0);
assert.equal(youth.children.find((child) => child.value === "no")!.node.leafLabel, "no");
assert.equal(youth.children.find((child) => child.value === "yes")!.node.leafLabel, "yes");

const senior = byValue.senior;
assert.equal(senior.scores.find((score) => score.attribute === "credit_rating")!.info, 0);
assert.equal(senior.children.find((child) => child.value === "fair")!.node.leafLabel, "yes");
assert.equal(senior.children.find((child) => child.value === "excellent")!.node.leafLabel, "no");

assert.equal(flatten(tree).length, 8);

function assertNoIdentifier(node: DTNode): void {
  for (const score of node.scores) {
    assert.notEqual(score.attribute, "RID");
    assert.notEqual(score.attribute, "Class:buys_computer");
  }
  for (const child of node.children) assertNoIdentifier(child.node);
}
assertNoIdentifier(tree);

let correct = 0;
for (const row of table.rows) {
  const result = classify(table, tree, row);
  assert.equal(result.label, row[table.classIndex]);
  correct += 1;
}
assert.equal(correct, 14);

const trace = buildTrace(table, tree);
assert.ok(trace.length > 20);
assert.equal(trace[0].chapter, "The dataset");
assert.equal(trace[0].tree.length, 0);
assert.equal(trace[trace.length - 1].math.kind, "done");
assert.equal(trace[trace.length - 1].tree.length, 8);

const created = trace.find((snapshot) => snapshot.title === "Create the root");
const chosen = trace.find((snapshot) => snapshot.title === "Choose age");
assert.ok(created);
assert.ok(chosen);
assert.equal(created.tree[0].title, "N");
assert.equal(created.tree[0].kind, "open");
assert.equal(chosen.tree.find((node) => node.id === "root")!.title, "age?");
assert.equal(created.tree[0].title, "N");

for (const snapshot of trace) {
  assert.ok(snapshot.narration.length > 20, snapshot.title);
  const ids = snapshot.tree.map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
}

console.log(
  [
    "ok",
    `steps=${trace.length}`,
    `root=${tree.attribute}`,
    ...tree.scores.map((score) => `${score.attribute} gain=${bits(score.gain)} infoA=${bits(score.info)}`),
    `accuracy=${correct}/${table.rows.length}`,
  ].join("\n"),
);
