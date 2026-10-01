import type { Count } from "../engine/types";

export function Fraction({ n, d }: { n: number; d: number }) {
  return (
    <span className="frac" aria-label={`${n} over ${d}`}>
      <span>{n}</span>
      <span>{d}</span>
    </span>
  );
}

export function MixBar({ counts, total }: { counts: Count[]; total: number }) {
  if (total <= 0) return null;
  return (
    <div className="mix" aria-hidden="true">
      {counts.map((count) => (
        <span
          key={count.label}
          className={count.label === "no" ? "is-no" : count.label === "yes" ? "is-yes" : "is-other"}
          style={{ width: `${(count.count / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function CountLine({ counts }: { counts: Count[] }) {
  return (
    <p className="count-line">
      {counts.map((count) => (
        <span key={count.label} className={count.label === "no" ? "pill no" : "pill yes"}>
          {count.count} {count.label}
        </span>
      ))}
    </p>
  );
}
