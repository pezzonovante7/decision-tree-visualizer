import { attributeIndex } from "./parse";
import { bits, infoTerms, mixPhrase, pathPhrase, people } from "./entropy";
import { classify } from "./classify";
import { leafRules } from "./buildTree";
import type { AttributeScore, DTNode, Snapshot, Table, TreeNodeView } from "./types";

function chapterFor(node: DTNode): string {
  if (node.path.length === 0) return "Root: the first question";
  const first = node.path[0];
  return `${first.attribute} = ${first.value}`;
}

function breadcrumbFor(node: DTNode): string {
  if (node.path.length === 0) return "D  ·  all training rows";
  return `D  →  ${node.path.map((edge) => `${edge.attribute} = ${edge.value}`).join("  →  ")}`;
}

function frameLabel(node: DTNode): string {
  if (node.path.length === 0) return `Generate(all ${node.total} rows)`;
  const edge = node.path[node.path.length - 1];
  return `Generate(${edge.attribute} = ${edge.value}, ${node.total} rows)`;
}

function scoreNarration(
  score: AttributeScore,
  previous: { attribute: string; gain: number } | null,
): string {
  const branches = score.subsets
    .map((subset) => `${subset.value} (${mixPhrase(subset.counts)})`)
    .join(", ");
  const gain = bits(score.gain);
  let comparison: string;
  if (!previous) {
    comparison = `Gain is ${gain} bits, so this is the best split so far.`;
  } else if (score.gain > previous.gain) {
    comparison = `Gain is ${gain} bits, ahead of ${previous.attribute} at ${bits(previous.gain)} bits.`;
  } else {
    comparison = `Gain is ${gain} bits, short of ${previous.attribute} at ${bits(previous.gain)} bits.`;
  }
  return `${score.attribute} would open ${score.subsets.length} branches: ${branches}. ${comparison}`;
}

function chooseNarration(node: DTNode): string {
  const best = node.scores.find((score) => score.attribute === node.attribute);
  if (!best || !node.attribute) return "Choose the split with the largest gain.";
  const others = node.scores
    .filter((score) => score.attribute !== node.attribute)
    .slice()
    .sort((a, b) => b.gain - a.gain)
    .map((score) => `${score.attribute} ${bits(score.gain)}`)
    .join(", ");
  const perfect = best.info < 5e-4;
  const core = perfect
    ? `${node.attribute} separates the labels completely. Its gain, ${bits(best.gain)} bits, is the whole entropy of this group.`
    : others.length > 0
      ? `${node.attribute} has the largest gain, ${bits(best.gain)} bits, ahead of ${others}.`
      : `${node.attribute} is the only question left. Its gain is ${bits(best.gain)} bits.`;
  return `${core} Label the node “${node.attribute}?”. The children will not be allowed to ask ${node.attribute} again.`;
}

export function buildTrace(table: Table, root: DTNode): Snapshot[] {
  const trace: Snapshot[] = [];
  const shown = new Map<string, TreeNodeView>();
  let mentionedEmpty = false;

  const rootCounts = root.counts.map((count) => ({ ...count }));

  function snapshotTree(activeId: string | null, ancestors: string[]): TreeNodeView[] {
    const ancestorSet = new Set(ancestors);
    return [...shown.values()].map((node) => ({
      ...node,
      counts: node.counts.map((count) => ({ ...count })),
      status: node.id === activeId ? "active" : ancestorSet.has(node.id) ? "context" : "idle",
    }));
  }

  function push(
    input: Omit<Snapshot, "tree">,
    activeId: string | null,
    ancestors: string[],
  ): void {
    trace.push({ ...input, tree: snapshotTree(activeId, ancestors) });
  }

  push(
    {
      chapter: "The dataset",
      title: "Start with the table",
      narration:
        "Each row is one person. The last column, buys_computer, is the label to predict from age, income, student, and credit_rating. RID is only an identifier, so it is never used as a question. The lesson uses information gain, the same measure as the Java program.",
      tone: "neutral",
      lines: [],
      stack: [],
      breadcrumb: "input.csv  ·  14 rows",
      rows: table.rows.map((_, index) => index),
      dimRows: [],
      highlightAttribute: null,
      emphasisValue: null,
      usedAttributes: [],
      math: { kind: "intro", counts: rootCounts, total: root.total },
    },
    null,
    [],
  );

  function walk(node: DTNode, stack: string[], ancestors: string[], used: string[]): void {
    const nextStack = [...stack, frameLabel(node)];
    const crumb = breadcrumbFor(node);
    const chapter = chapterFor(node);
    const rows = node.rowIndexes;

    shown.set(node.id, {
      id: node.id,
      parentId: node.parentId,
      via: node.via,
      title: "N",
      kind: "open",
      counts: node.counts.map((count) => ({ ...count })),
      total: node.total,
      status: "active",
      leafLabel: null,
    });

    const shared = {
      chapter,
      stack: nextStack,
      breadcrumb: crumb,
      rows,
      dimRows: [] as number[],
      highlightAttribute: null as string | null,
      emphasisValue: null as string | null,
      usedAttributes: used,
    };

    push(
      {
        ...shared,
        title: node.path.length === 0 ? "Create the root" : "Create a node",
        narration:
          node.path.length === 0
            ? `Create the root node N for all ${people(node.total)} in the training set (${mixPhrase(node.counts)}).`
            : `Create node N for the ${people(node.total)} with ${pathPhrase(node.path)} (${mixPhrase(node.counts)}).`,
        tone: "neutral",
        lines: ["g1"],
        math: { kind: "create", counts: node.counts, total: node.total },
      },
      node.id,
      ancestors,
    );

    if (!node.attribute) {
      const view = shown.get(node.id)!;
      view.title = node.leafLabel ?? "?";
      view.kind = "leaf";
      view.leafLabel = node.leafLabel;
      const pure = node.reason === "pure";
      push(
        {
          ...shared,
          title: pure ? `Leaf: ${node.leafLabel}` : `Majority leaf: ${node.leafLabel}`,
          narration: pure
            ? `Everyone in this group has the label “${node.leafLabel}”. The node becomes a leaf, and this branch stops.`
            : `No questions are left, and the labels are still mixed (${mixPhrase(node.counts)}). The leaf takes the majority label, ${node.leafLabel}.`,
          tone: node.leafLabel === "yes" ? "yes" : node.leafLabel === "no" ? "no" : "neutral",
          lines: pure ? ["g2", "g3"] : ["g4", "g5"],
          math: {
            kind: "leaf",
            label: node.leafLabel ?? "",
            reason: node.reason,
            counts: node.counts,
            total: node.total,
            info: node.info,
          },
        },
        node.id,
        ancestors,
      );
      return;
    }

    push(
      {
        ...shared,
        title: "Labels are mixed",
        narration: `These ${people(node.total)} do not all share one label (${mixPhrase(node.counts)}). The node stays open and the tree keeps growing.`,
        tone: "neutral",
        lines: ["g2"],
        math: { kind: "impure", counts: node.counts, total: node.total },
      },
      node.id,
      ancestors,
    );

    const names = node.scores.map((score) => score.attribute);
    push(
      {
        ...shared,
        title: "Questions remain",
        narration:
          names.length === 1
            ? `The attribute list still has one question: ${names[0]}. Information gain will score it.`
            : `The attribute list still has ${names.join(", ")}. Information gain will score each one.`,
        tone: "neutral",
        lines: ["g4"],
        math: { kind: "attributes", attributes: names },
      },
      node.id,
      ancestors,
    );

    const breakdown = infoTerms(node.counts);
    push(
      {
        ...shared,
        title: "Entropy of this group",
        narration:
          node.path.length === 0
            ? `Info(D) is ${bits(node.info)} bits. Zero would mean the group is already pure. One bit would mean yes and no are evenly split. ${bits(node.info)} is the uncertainty the first question has to reduce.`
            : `Info(D) for this branch is ${bits(node.info)} bits, from ${mixPhrase(node.counts)}. Each remaining question is scored by how much of that it removes.`,
        tone: "math",
        lines: ["a1", "g6"],
        math: {
          kind: "info",
          counts: node.counts,
          total: node.total,
          terms: breakdown.terms,
          info: node.info,
          firstTime: node.path.length === 0,
        },
      },
      node.id,
      ancestors,
    );

    let previous: { attribute: string; gain: number } | null = null;
    const soFar: AttributeScore[] = [];
    for (const score of node.scores) {
      soFar.push(score);
      push(
        {
          ...shared,
          title: `Score ${score.attribute}`,
          narration: scoreNarration(score, previous),
          tone: "math",
          lines: ["a2", "a3", "a4"],
          highlightAttribute: score.attribute,
          math: {
            kind: "score",
            infoD: node.info,
            total: node.total,
            score,
            previousBest: previous,
            scoresSoFar: soFar.map((item) => ({
              ...item,
              subsets: item.subsets.map((subset) => ({
                ...subset,
                counts: subset.counts.map((count) => ({ ...count })),
              })),
            })),
          },
        },
        node.id,
        ancestors,
      );
      if (!previous || score.gain > previous.gain) {
        previous = { attribute: score.attribute, gain: score.gain };
      }
    }

    const view = shown.get(node.id)!;
    view.title = `${node.attribute}?`;
    view.kind = "split";
    push(
      {
        ...shared,
        title: `Choose ${node.attribute}`,
        narration: chooseNarration(node),
        tone: "pick",
        lines: ["a5", "g7"],
        highlightAttribute: node.attribute,
        math: {
          kind: "choose",
          infoD: node.info,
          scores: node.scores,
          best: node.attribute,
          removed: node.attribute,
        },
      },
      node.id,
      ancestors,
    );

    const nextUsed = [...used, node.attribute];
    node.children.forEach((child, childIndex) => {
      const attrIndex = attributeIndex(table, node.attribute!);
      const dimRows = node.rowIndexes.filter((index) => table.rows[index][attrIndex] !== child.value);
      const hint = !mentionedEmpty && node.path.length === 0 && childIndex === 0;
      if (hint) mentionedEmpty = true;
      const partitionText = `Where ${node.attribute} = ${child.value}, the branch holds ${people(child.node.total)} (${mixPhrase(child.node.counts)}). ${
        hint
          ? "An empty branch would become a majority leaf. This one has rows, so the algorithm grows a subtree on them alone."
          : "The branch has rows, so the algorithm grows a subtree on them alone."
      }`;
      push(
        {
          ...shared,
          chapter: chapterFor(child.node),
          title: `${node.attribute} = ${child.value}`,
          narration: partitionText,
          tone: "neutral",
          lines: ["g8", "g9", "g10", "g12"],
          highlightAttribute: node.attribute,
          emphasisValue: child.value,
          dimRows,
          math: {
            kind: "partition",
            attribute: node.attribute!,
            value: child.value,
            counts: child.node.counts,
            total: child.node.total,
            parentTotal: node.total,
          },
        },
        node.id,
        ancestors,
      );
      walk(child.node, nextStack, [...ancestors, node.id], nextUsed);
    });

    if (node.path.length > 0) {
      push(
        {
          ...shared,
          title: "Return the subtree",
          narration: `The call for ${pathPhrase(node.path)} returns this subtree to its parent.`,
          tone: "neutral",
          lines: ["g13"],
          math: { kind: "return", rules: leafRules(node) },
        },
        node.id,
        ancestors,
      );
    }
  }

  walk(root, [], [], []);

  let correct = 0;
  for (const row of table.rows) {
    if (classify(table, root, row).label === row[table.classIndex]) correct += 1;
  }

  push(
    {
      chapter: "The finished tree",
      title: "The tree is built",
      narration: `The root returns the finished tree. It predicts ${correct} of ${table.rows.length} training rows correctly, because every leaf is pure. Read a rule by following the questions from the top until a leaf.`,
      tone: "neutral",
      lines: ["g13"],
      stack: [],
      breadcrumb: "finished tree",
      rows: table.rows.map((_, index) => index),
      dimRows: [],
      highlightAttribute: null,
      emphasisValue: null,
      usedAttributes: [],
      math: { kind: "done", rules: leafRules(root), correct, total: table.rows.length },
    },
    null,
    [],
  );

  return trace;
}
