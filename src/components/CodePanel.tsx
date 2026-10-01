import { useEffect, useRef } from "react";
import { CODE } from "../pseudo";

export function CodePanel({ lines, stack }: { lines: string[]; stack: string[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const active = new Set(lines);
  const primary = lines[0] ?? "";

  useEffect(() => {
    const root = scroller.current;
    const el = root?.querySelector<HTMLElement>(".is-on");
    if (!root || !el) return;
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.top < rootRect.top) root.scrollTop -= rootRect.top - elRect.top + 12;
    else if (elRect.bottom > rootRect.bottom) root.scrollTop += elRect.bottom - rootRect.bottom + 12;
  }, [primary, lines.join("|")]);

  return (
    <aside className="side side-code">
      <div className="side-head">
        <p className="eyebrow">Pseudocode</p>
        <h2>The algorithm</h2>
      </div>
      {stack.length > 0 && (
        <ol className="stack">
          {stack.map((frame, index) => (
            <li key={`${frame}-${index}`} style={{ marginLeft: index * 12 }}>
              {frame}
            </li>
          ))}
        </ol>
      )}
      <div className="code-scroll" ref={scroller}>
        <pre>
          {CODE.map((line) =>
            line.role === "gap" ? (
              <div key={line.id} className="code-gap" />
            ) : (
              <div
                key={line.id}
                className={
                  line.role === "sig"
                    ? "code-sig"
                    : active.has(line.id)
                      ? "code-line is-on"
                      : "code-line"
                }
              >
                {line.text}
              </div>
            ),
          )}
        </pre>
      </div>
      <p className="side-note">
        The chosen attribute is removed before the recursive call, matching the Java <code>split</code> method.
        Inside one branch that attribute has a single value, so asking it again would separate nobody.
      </p>
    </aside>
  );
}
