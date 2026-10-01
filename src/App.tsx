import { useEffect, useMemo, useRef, useState } from "react";
import { table } from "./data/load";
import { flatten, toView } from "./engine/buildTree";
import { classify } from "./engine/classify";
import { loadLesson } from "./engine/lesson";
import type { TreeNodeView } from "./engine/types";
import { CodePanel } from "./components/CodePanel";
import { ControlBar } from "./components/ControlBar";
import { DataTable } from "./components/DataTable";
import { MathPanel } from "./components/MathPanel";
import { TreeView } from "./components/TreeView";

const INTERVAL_AT_1X = 1150;

export function App() {
  const lesson = useMemo(() => loadLesson(table), []);
  const { tree, trace } = lesson;
  const [mode, setMode] = useState<"build" | "use">("build");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [person, setPerson] = useState<number | null>(null);
  const [walk, setWalk] = useState(0);
  const [walkPlaying, setWalkPlaying] = useState(false);
  const previousIndex = useRef(0);

  const snapshot = trace[index];
  const chapters = useMemo(() => {
    const list: { name: string; index: number }[] = [];
    trace.forEach((step, stepIndex) => {
      if (!list.some((item) => item.name === step.chapter)) {
        list.push({ name: step.chapter, index: stepIndex });
      }
    });
    return list;
  }, [trace]);

  const freshIds = useMemo(() => {
    if (index <= previousIndex.current) return new Set<string>();
    const before = new Set(trace[previousIndex.current].tree.map((node) => node.id));
    const born = trace[index].tree.filter((node) => !before.has(node.id)).map((node) => node.id);
    return born.length > 2 ? new Set<string>() : new Set(born);
  }, [index, trace]);

  useEffect(() => {
    previousIndex.current = index;
  }, [index]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current >= trace.length - 1 ? current : current + 1));
    }, INTERVAL_AT_1X / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, trace.length]);

  useEffect(() => {
    if (playing && index >= trace.length - 1) setPlaying(false);
  }, [playing, index, trace.length]);

  const result = useMemo(
    () => (person === null ? null : classify(table, tree, table.rows[person])),
    [person, tree],
  );

  useEffect(() => {
    if (!walkPlaying || !result) return;
    const timer = window.setInterval(() => {
      setWalk((current) => (current >= result.steps.length - 1 ? current : current + 1));
    }, 800);
    return () => window.clearInterval(timer);
  }, [walkPlaying, result]);

  useEffect(() => {
    if (walkPlaying && result && walk >= result.steps.length - 1) setWalkPlaying(false);
  }, [walkPlaying, result, walk]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "BUTTON")
      ) {
        return;
      }
      if (mode === "use") {
        if (!result) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setWalkPlaying(false);
          setWalk((current) => Math.min(result.steps.length - 1, current + 1));
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          setWalkPlaying(false);
          setWalk((current) => Math.max(0, current - 1));
        } else if (event.key === " ") {
          event.preventDefault();
          setWalkPlaying((current) => !current);
        }
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setPlaying(false);
        setIndex((current) => Math.min(trace.length - 1, current + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPlaying(false);
        setIndex((current) => Math.max(0, current - 1));
      } else if (event.key === " ") {
        event.preventDefault();
        setPlaying((current) => !current);
      } else if (event.key === "Home") {
        event.preventDefault();
        setPlaying(false);
        setIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setPlaying(false);
        setIndex(trace.length - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, trace.length, result]);

  function goTo(next: number) {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(trace.length - 1, next)));
  }

  function choosePerson(rowIndex: number) {
    setPerson(rowIndex);
    setWalk(0);
    setWalkPlaying(true);
  }

  const useTree: TreeNodeView[] = useMemo(() => {
    const nodes = flatten(tree);
    if (!result) return nodes.map((node) => toView(node, "idle"));
    const shown = result.steps.slice(0, walk + 1);
    const active = shown[shown.length - 1]?.nodeId;
    const context = new Set(shown.slice(0, -1).map((step) => step.nodeId));
    return nodes.map((node) =>
      toView(node, node.id === active ? "active" : context.has(node.id) ? "context" : "idle"),
    );
  }, [tree, result, walk]);

  const actual = person === null ? null : table.rows[person][table.classIndex];
  const walkStep = result?.steps[walk] ?? null;
  const finishedWalk = result !== null && walk >= result.steps.length - 1;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <Mark />
          <div>
            <p className="eyebrow">ID3 · information gain</p>
            <h1>How a decision tree is built</h1>
          </div>
        </div>
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "build"}
            className={mode === "build" ? "is-on" : ""}
            onClick={() => {
              setWalkPlaying(false);
              setMode("build");
            }}
          >
            Build the tree
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "use"}
            className={mode === "use" ? "is-on" : ""}
            onClick={() => {
              setPlaying(false);
              setMode("use");
            }}
          >
            Use the tree
          </button>
        </div>
      </header>

      <div className="formulas" aria-hidden="true">
        <p>
          Info(D) = − Σ p<sub>i</sub> log<sub>2</sub>(p<sub>i</sub>)
        </p>
        <p>
          Gain(A) = Info(D) − Σ (|D<sub>j</sub>| / |D|) · Info(D<sub>j</sub>)
        </p>
        <p className="source">buys_computer · 14 rows · log base 2</p>
      </div>

      {mode === "build" ? (
        <section className={`lecturer tone-${snapshot.tone}`} aria-live="polite">
          <div className="lecturer-kicker">
            <span>{snapshot.chapter}</span>
            <span>{snapshot.breadcrumb}</span>
          </div>
          <h2>{snapshot.title}</h2>
          <p>{snapshot.narration}</p>
        </section>
      ) : (
        <section className="lecturer tone-neutral" aria-live="polite">
          <div className="lecturer-kicker">
            <span>Use the finished tree</span>
            <span>{person === null ? "no person selected" : `RID ${table.rows[person][0]}`}</span>
          </div>
          <h2>{person === null ? "Pick someone from the table" : walkStep ? stepTitle(walkStep.attribute, walkStep.value, walkStep.leafLabel) : ""}</h2>
          <p>
            {person === null
              ? "Click a row. The tree asks its questions for that person, one branch at a time, and you can check the prediction against the real label."
              : finishedWalk && actual !== null && result
                ? `${walkStep?.text} The table’s label is ${actual}. ${actual === result.label ? "The tree agrees." : "The tree and the table disagree."}`
                : walkStep?.text}
          </p>
        </section>
      )}

      <main className="workspace">
        {mode === "build" ? (
          <CodePanel lines={snapshot.lines} stack={snapshot.stack} />
        ) : (
          <aside className="side side-code">
            <div className="side-head">
              <p className="eyebrow">This person</p>
              <h2>{person === null ? "Waiting" : `RID ${table.rows[person][0]}`}</h2>
            </div>
            {person === null ? (
              <p className="side-note">The fourteen training rows are the people you can send through the tree.</p>
            ) : (
              <ul className="person-facts">
                {table.candidateAttributes.map((attribute) => {
                  const column = table.columns.indexOf(attribute);
                  const hot = walkStep?.attribute === attribute;
                  return (
                    <li key={attribute} className={hot ? "is-hot" : ""}>
                      <span>{attribute}</span>
                      <strong>{table.rows[person][column]}</strong>
                    </li>
                  );
                })}
                <li className="actual">
                  <span>buys_computer</span>
                  <strong className={actual === "no" ? "no" : "yes"}>{actual}</strong>
                </li>
              </ul>
            )}
          </aside>
        )}

        <section className="stage">
          <TreeView nodes={mode === "build" ? snapshot.tree : useTree} freshIds={mode === "build" ? freshIds : new Set()} />
          {mode === "use" && <p className="table-note">Click a row to walk that person down the tree.</p>}
          <DataTable
            table={table}
            rows={mode === "build" ? snapshot.rows : table.rows.map((_, rowIndex) => rowIndex)}
            dimRows={mode === "build" ? snapshot.dimRows : []}
            highlightAttribute={
              mode === "build" ? snapshot.highlightAttribute : walkStep?.attribute ?? null
            }
            emphasisValue={mode === "build" ? snapshot.emphasisValue : walkStep?.value ?? null}
            usedAttributes={mode === "build" ? snapshot.usedAttributes : []}
            selectedRow={mode === "use" ? person : null}
            onSelectRow={mode === "use" ? choosePerson : null}
          />
        </section>

        {mode === "build" ? (
          <MathPanel math={snapshot.math} />
        ) : (
          <aside className="side side-math">
            <div className="side-head">
              <p className="eyebrow">Prediction</p>
              <h2>{finishedWalk && result ? result.label : "Walking"}</h2>
            </div>
            <div className="math-body">
              {result ? (
                <ol className="rule-list path-list">
                  {result.steps.slice(0, walk + 1).map((step, stepIndex) => (
                    <li key={`${step.nodeId}-${stepIndex}`} className={stepIndex === walk ? "is-current" : ""}>
                      {step.text}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>The finished tree is already grown. Age is the first question, then student or credit rating.</p>
              )}
            </div>
          </aside>
        )}
      </main>

      {mode === "build" ? (
        <ControlBar
          index={index}
          total={trace.length}
          playing={playing}
          speed={speed}
          chapters={chapters}
          chapter={snapshot.chapter}
          onIndex={goTo}
          onPlaying={setPlaying}
          onSpeed={setSpeed}
        />
      ) : (
        <ControlBar
          index={walk}
          total={result?.steps.length ?? 0}
          playing={walkPlaying}
          speed={1}
          chapters={null}
          chapter=""
          onIndex={(next) => {
            setWalkPlaying(false);
            setWalk(next);
          }}
          onPlaying={(next) => {
            if (result) setWalkPlaying(next);
          }}
          onSpeed={() => {}}
        />
      )}
    </div>
  );
}

function stepTitle(attribute: string | null, value: string | null, leaf: string | null): string {
  if (attribute && value) return `${attribute} = ${value}`;
  return `Predict ${leaf}`;
}

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="16" y="4" width="16" height="12" rx="2" />
      <path d="M24 16v6M24 22H10M24 22h14" />
      <rect x="2" y="22" width="16" height="10" rx="2" />
      <rect x="30" y="22" width="16" height="10" rx="2" />
      <path d="M10 32v4M38 32v4" />
      <rect x="2" y="36" width="16" height="8" rx="2" />
      <rect x="30" y="36" width="16" height="8" rx="2" />
    </svg>
  );
}
