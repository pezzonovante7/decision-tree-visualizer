import { bits, infoTerms, mixPhrase } from "../engine/entropy";
import type { AttributeScore, MathView, Term } from "../engine/types";
import { CountLine, Fraction, MixBar } from "./Fraction";

function InfoFormula({ label, terms, info }: { label: string; terms: Term[]; info: number }) {
  return (
    <div className="equation">
      <div className="equation-line">
        <span>{label} = </span>
        {terms.map((term, index) => (
          <span key={term.label} className="term">
            {index === 0 ? "−" : " − "}
            <Fraction n={term.count} d={term.total} />
            <span> log₂(</span>
            <Fraction n={term.count} d={term.total} />
            <span>)</span>
          </span>
        ))}
      </div>
      <p className="equation-result">
        = <strong>{bits(info)} bits</strong>
      </p>
    </div>
  );
}

function GainBars({
  scores,
  infoD,
  leader,
}: {
  scores: AttributeScore[];
  infoD: number;
  leader: string;
}) {
  return (
    <ol className="gain-list">
      {scores.map((score) => {
        const width = infoD <= 0 ? 0 : Math.max(0, Math.min(100, (score.gain / infoD) * 100));
        const on = score.attribute === leader;
        return (
          <li key={score.attribute} className={on ? "is-leader" : ""}>
            <div className="gain-meta">
              <span>{score.attribute}</span>
              <span className="num">{bits(score.gain)}</span>
            </div>
            <div className="gain-track">
              <span style={{ width: `${width}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function SubsetBlock({
  attribute,
  subset,
  total,
}: {
  attribute: string;
  subset: AttributeScore["subsets"][number];
  total: number;
}) {
  const weight = subset.count / total;
  const contribution = weight * subset.info;
  const pure = subset.info < 5e-4;
  const terms = infoTerms(subset.counts).terms;
  return (
    <article className="subset">
      <header>
        <strong>
          {attribute} = {subset.value}
        </strong>
        <span className="num">
          {subset.count}/{total}
        </span>
      </header>
      <p>{mixPhrase(subset.counts)}</p>
      {pure ? (
        <p className="quiet">Every label matches, so Info = 0.</p>
      ) : (
        <InfoFormula label="Info" terms={terms} info={subset.info} />
      )}
      <p className="quiet">
        Weight {subset.count}/{total} · adds {bits(contribution)} to Info<sub>{attribute}</sub>
      </p>
    </article>
  );
}

export function MathPanel({ math }: { math: MathView }) {
  return (
    <aside className="side side-math">
      <div className="side-head">
        <p className="eyebrow">Working</p>
        <h2>{heading(math)}</h2>
      </div>
      <div className="math-body">{body(math)}</div>
      <p className="side-note">
        Figures are rounded to 3 decimals. The comparison that picks the split uses the full-precision gain, and it
        updates only when the new gain is strictly larger.
      </p>
    </aside>
  );
}

function heading(math: MathView): string {
  switch (math.kind) {
    case "intro":
      return "What is being learned";
    case "create":
      return "This group";
    case "impure":
      return "Class mix";
    case "attributes":
      return "Still allowed to ask";
    case "info":
      return "Info(D)";
    case "score":
      return `Gain(${math.score.attribute})`;
    case "choose":
      return `Winner: ${math.best}`;
    case "partition":
      return `${math.attribute} = ${math.value}`;
    case "leaf":
      return `Leaf ${math.label}`;
    case "return":
      return "Rules in this subtree";
    case "done":
      return "How to read it";
    default: {
      const never: never = math;
      return never;
    }
  }
}

function body(math: MathView) {
  switch (math.kind) {
    case "intro":
      return (
        <>
          <CountLine counts={math.counts} />
          <MixBar counts={math.counts} total={math.total} />
          <p>
            {countOf(math.counts, "yes")} of the {math.total} people buy a computer, and{" "}
            {countOf(math.counts, "no")} do not. A useful question pulls those two labels into purer groups.
          </p>
          <p className="quiet">
            Entropy is 0 bits for a pure group and 1 bit when two labels are evenly split. Gain is how many of those
            bits a question removes.
          </p>
        </>
      );
    case "create":
    case "impure":
      return (
        <>
          <CountLine counts={math.counts} />
          <MixBar counts={math.counts} total={math.total} />
          <p className="quiet">{math.total} {math.total === 1 ? "person" : "people"} in D.</p>
        </>
      );
    case "attributes":
      return (
        <ul className="attr-list">
          {math.attributes.map((attribute) => (
            <li key={attribute}>{attribute}</li>
          ))}
        </ul>
      );
    case "info":
      return (
        <>
          <CountLine counts={math.counts} />
          <InfoFormula label="Info(D)" terms={math.terms} info={math.info} />
          {math.firstTime && (
            <p className="quiet">
              The Java method <code>infoGain</code> computes each term as −p · ln(p) / ln(2). That is log base 2, so
              the unit is the bit.
            </p>
          )}
        </>
      );
    case "score": {
      const leader =
        !math.previousBest || math.score.gain > math.previousBest.gain
          ? math.score.attribute
          : math.previousBest.attribute;
      const infoA = math.score.info;
      return (
        <>
          {math.score.subsets.map((subset) => (
            <SubsetBlock key={subset.value} attribute={math.score.attribute} subset={subset} total={math.total} />
          ))}
          <div className="equation">
            <p className="equation-result">
              Info<sub>{math.score.attribute}</sub>(D) = <strong>{bits(infoA)} bits</strong>
            </p>
            <p className="equation-result">
              Gain({math.score.attribute}) = Info(D) − Info<sub>{math.score.attribute}</sub>(D) ={" "}
              <strong>{bits(math.score.gain)} bits</strong>
            </p>
          </div>
          <GainBars scores={math.scoresSoFar} infoD={math.infoD} leader={leader} />
          <p className="quiet">Bar length is the share of Info(D) that the question removes.</p>
        </>
      );
    }
    case "choose":
      return (
        <>
          <GainBars scores={math.scores} infoD={math.infoD} leader={math.best} />
          <p>
            {math.best} removes {math.infoD === 0 ? 0 : Math.round((gainOf(math) / math.infoD) * 100)}% of the
            uncertainty in this group. It is dropped from the attribute list for every child.
          </p>
          {math.best === "age" && math.scores.length === 4 && (
            <p className="quiet">
              Slides often print Gain(age) = 0.246 and Gain(student) = 0.151. Those figures come from rounding every
              entropy to 3 decimals before the subtraction. The bars here round only the final gain, which is what the
              Java program computes. Age still wins.
            </p>
          )}
        </>
      );
    case "partition":
      return (
        <>
          <CountLine counts={math.counts} />
          <MixBar counts={math.counts} total={math.total} />
          <p className="equation-result">
            |Dⱼ| / |D| = <Fraction n={math.total} d={math.parentTotal} />
          </p>
        </>
      );
    case "leaf":
      return (
        <>
          <CountLine counts={math.counts} />
          <MixBar counts={math.counts} total={math.total} />
          <p>
            {math.reason === "pure"
              ? `Info(D) = ${bits(math.info)} bits. A pure leaf needs no further question.`
              : `The majority label is ${math.label}.`}
          </p>
        </>
      );
    case "return":
      return (
        <ul className="rule-list">
          {math.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      );
    case "done":
      return (
        <>
          <p>
            Training rows predicted correctly: {math.correct} / {math.total}.
          </p>
          <ul className="rule-list">
            {math.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="quiet">
            Branches are drawn in the order each value first appears in input.csv. The Java program stores values in a
            HashSet, so the order it prints can differ. The questions and the leaf labels stay the same.
          </p>
        </>
      );
    default: {
      const never: never = math;
      return never;
    }
  }
}

function countOf(counts: { label: string; count: number }[], label: string): number {
  return counts.find((count) => count.label === label)?.count ?? 0;
}

function gainOf(math: Extract<MathView, { kind: "choose" }>): number {
  return math.scores.find((score) => score.attribute === math.best)?.gain ?? 0;
}
