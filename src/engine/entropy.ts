import type { Count, Term } from "./types";

/**
 * Information of a class distribution, in bits.
 *
 * Same expression as DecisionTreeConstruction.infoGain in the Java program:
 *   − Σ  (count / n) · ln(count / n) / ln(2)
 * Classes with a zero count are omitted. The Java map never inserts them,
 * and the information-theory limit of 0·log(0) is 0 anyway.
 */
export function infoTerms(counts: Count[]): { total: number; terms: Term[]; info: number } {
  const total = counts.reduce((sum, count) => sum + count.count, 0);
  if (total === 0) {
    return { total: 0, terms: [], info: 0 };
  }
  const terms = counts
    .filter((count) => count.count > 0)
    .map((count) => {
      const p = count.count / total;
      const contribution = -p * (Math.log(p) / Math.log(2));
      return {
        label: count.label,
        count: count.count,
        total,
        contribution,
      };
    });
  const info = terms.reduce((sum, term) => sum + term.contribution, 0);
  return { total, terms, info };
}

export function entropy(counts: Count[]): number {
  return infoTerms(counts).info;
}

/** Yes before no when both are present, so the lesson matches the usual textbook order. */
export function classCounts(rows: string[][], classIndex: number): Count[] {
  const seen: string[] = [];
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = row[classIndex];
    if (!map.has(label)) seen.push(label);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  const preferred = ["yes", "no"];
  const labels = [...seen].sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia === -1 && ib === -1) return seen.indexOf(a) - seen.indexOf(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return labels.map((label) => ({ label, count: map.get(label)! }));
}

/**
 * Majority class. Ties keep the label that appears first in the partition.
 * The Java code uses HashMap iteration order, which is not a stable rule.
 */
export function majorityLabel(rows: string[][], classIndex: number): string {
  const seen: string[] = [];
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = row[classIndex];
    if (!map.has(label)) seen.push(label);
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  let best = seen[0] ?? "";
  let bestCount = -1;
  for (const label of seen) {
    const count = map.get(label)!;
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

export function bits(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 5e-4) return "0.000";
  return value.toFixed(3);
}

export function mixPhrase(counts: Count[]): string {
  if (counts.length === 0) return "nobody";
  if (counts.length === 1) {
    const only = counts[0];
    return only.count === 1 ? `1 ${only.label}` : `all ${only.count} ${only.label}`;
  }
  if (counts.length === 2) {
    return `${counts[0].count} ${counts[0].label} and ${counts[1].count} ${counts[1].label}`;
  }
  return counts.map((count) => `${count.count} ${count.label}`).join(", ");
}

export function people(count: number): string {
  return count === 1 ? "1 person" : `${count} people`;
}

export function pathPhrase(path: { attribute: string; value: string }[]): string {
  return path.map((edge) => `${edge.attribute} = ${edge.value}`).join(" and ");
}
