export type Count = {
  label: string;
  count: number;
};

export type Term = {
  label: string;
  count: number;
  total: number;
  contribution: number;
};

export type Table = {
  columns: string[];
  rows: string[][];
  classIndex: number;
  idIndex: number;
  candidateAttributes: string[];
};

export type PathEdge = {
  attribute: string;
  value: string;
};

export type SubsetScore = {
  value: string;
  count: number;
  counts: Count[];
  info: number;
};

export type AttributeScore = {
  attribute: string;
  info: number;
  gain: number;
  subsets: SubsetScore[];
};

export type SplitReason = "pure" | "majority" | "split";

export type DTNode = {
  id: string;
  parentId: string | null;
  via: string | null;
  path: PathEdge[];
  attribute: string | null;
  leafLabel: string | null;
  reason: SplitReason;
  counts: Count[];
  total: number;
  info: number;
  scores: AttributeScore[];
  chosenGain: number | null;
  children: { value: string; node: DTNode }[];
  rowIndexes: number[];
};

export type TreeStatus = "active" | "context" | "idle";

export type TreeNodeView = {
  id: string;
  parentId: string | null;
  via: string | null;
  title: string;
  kind: "open" | "split" | "leaf";
  counts: Count[];
  total: number;
  status: TreeStatus;
  leafLabel: string | null;
};

export type MathView =
  | { kind: "intro"; counts: Count[]; total: number }
  | { kind: "create"; counts: Count[]; total: number }
  | { kind: "impure"; counts: Count[]; total: number }
  | { kind: "attributes"; attributes: string[] }
  | {
      kind: "info";
      counts: Count[];
      total: number;
      terms: Term[];
      info: number;
      firstTime: boolean;
    }
  | {
      kind: "score";
      infoD: number;
      total: number;
      score: AttributeScore;
      previousBest: { attribute: string; gain: number } | null;
      scoresSoFar: AttributeScore[];
    }
  | {
      kind: "choose";
      infoD: number;
      scores: AttributeScore[];
      best: string;
      removed: string;
    }
  | {
      kind: "partition";
      attribute: string;
      value: string;
      counts: Count[];
      total: number;
      parentTotal: number;
    }
  | {
      kind: "leaf";
      label: string;
      reason: SplitReason;
      counts: Count[];
      total: number;
      info: number;
    }
  | { kind: "return"; rules: string[] }
  | { kind: "done"; rules: string[]; correct: number; total: number };

export type Tone = "neutral" | "yes" | "no" | "pick" | "math";

export type Snapshot = {
  chapter: string;
  title: string;
  narration: string;
  tone: Tone;
  lines: string[];
  stack: string[];
  breadcrumb: string;
  rows: number[];
  dimRows: number[];
  highlightAttribute: string | null;
  emphasisValue: string | null;
  usedAttributes: string[];
  tree: TreeNodeView[];
  math: MathView;
};

export type ClassStep = {
  nodeId: string;
  attribute: string | null;
  value: string | null;
  leafLabel: string | null;
  text: string;
};

export type Classification = {
  label: string;
  steps: ClassStep[];
};
