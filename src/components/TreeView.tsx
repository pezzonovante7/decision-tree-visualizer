import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TreeNodeView } from "../engine/types";
import { MixBar } from "./Fraction";

const NODE_W = 176;
const NODE_H = 104;
const GAP_X = 64;
const GAP_Y = 100;
const PAD = 40;

type Positioned = TreeNodeView & { x: number; y: number };

type Layout = {
  nodes: Positioned[];
  width: number;
  height: number;
};

function layoutTree(nodes: TreeNodeView[]): Layout {
  if (nodes.length === 0) {
    return { nodes: [], width: 320, height: 180 };
  }
  const byParent = new Map<string | null, TreeNodeView[]>();
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? [];
    list.push(node);
    byParent.set(node.parentId, list);
  }
  const widths = new Map<string, number>();
  function widthOf(id: string): number {
    const cached = widths.get(id);
    if (cached !== undefined) return cached;
    const kids = byParent.get(id) ?? [];
    const width =
      kids.length === 0
        ? NODE_W
        : kids.reduce((sum, kid) => sum + widthOf(kid.id), 0) + GAP_X * (kids.length - 1);
    widths.set(id, width);
    return width;
  }
  const pos = new Map<string, { x: number; y: number }>();
  function place(id: string, left: number, depth: number): void {
    const kids = byParent.get(id) ?? [];
    let x = left;
    for (const kid of kids) {
      place(kid.id, x, depth + 1);
      x += widthOf(kid.id) + GAP_X;
    }
    pos.set(id, {
      x: left + (widthOf(id) - NODE_W) / 2,
      y: depth * (NODE_H + GAP_Y),
    });
  }
  const root = nodes.find((node) => node.parentId === null);
  if (!root) return { nodes: [], width: 320, height: 180 };
  place(root.id, 0, 0);
  const contentWidth = widthOf(root.id);
  let maxY = 0;
  const positioned = nodes.map((node) => {
    const point = pos.get(node.id)!;
    maxY = Math.max(maxY, point.y);
    return { ...node, x: point.x + PAD, y: point.y + PAD };
  });
  return {
    nodes: positioned,
    width: contentWidth + PAD * 2,
    height: maxY + NODE_H + PAD * 2,
  };
}

export function TreeView({
  nodes,
  freshIds,
}: {
  nodes: TreeNodeView[];
  freshIds: ReadonlySet<string>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState(0);
  const layout = layoutTree(nodes);
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const activeId = nodes.find((node) => node.status === "active")?.id ?? "";
  const available = Math.max(0, paneWidth - 16);
  const scale = available > 0 && layout.width > 0 ? Math.min(1, available / layout.width) : 1;
  const offsetX = available > 0 ? Math.max(0, (available - layout.width * scale) / 2) : 0;

  useLayoutEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const measure = () => setPaneWidth(root.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = scroller.current;
    const el = root?.querySelector<HTMLElement>(".is-active");
    if (!root || !el) return;
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const deltaY = elRect.top + elRect.height / 2 - (rootRect.top + rootRect.height / 2);
    if (Math.abs(deltaY) > 28) root.scrollTop += deltaY;
  }, [activeId, nodes.length, scale]);

  return (
    <div className="tree-scroll" ref={scroller}>
      {nodes.length === 0 ? (
        <p className="tree-empty">The tree appears when the first node is created.</p>
      ) : (
        <div className="tree-fit" style={{ height: layout.height * scale }}>
          <div
            className="tree-canvas"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `translate(${offsetX}px, 0) scale(${scale})`,
            }}
          >
          <svg className="tree-svg" width={layout.width} height={layout.height}>
            {layout.nodes.map((node) => {
              if (!node.parentId) return null;
              const parent = byId.get(node.parentId);
              if (!parent || !node.via) return null;
              const x1 = parent.x + NODE_W / 2;
              const y1 = parent.y + NODE_H;
              const x2 = node.x + NODE_W / 2;
              const y2 = node.y;
              const midY = (y1 + y2) / 2;
              const hot = node.status !== "idle";
              return (
                <path
                  key={`${parent.id}-${node.id}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  className={hot ? "edge is-hot" : "edge"}
                />
              );
            })}
          </svg>
          {layout.nodes.map((node) => {
            if (!node.parentId || !node.via) return null;
            const parent = byId.get(node.parentId);
            if (!parent) return null;
            const x1 = parent.x + NODE_W / 2;
            const y1 = parent.y + NODE_H;
            const x2 = node.x + NODE_W / 2;
            const y2 = node.y;
            return (
              <span
                key={`label-${node.id}`}
                className="edge-label"
                style={{ left: (x1 + x2) / 2, top: (y1 + y2) / 2 }}
              >
                {node.via}
              </span>
            );
          })}
          {layout.nodes.map((node) => (
            <article
              key={node.id}
              className={[
                "node",
                `kind-${node.kind}`,
                node.leafLabel ? `leaf-${node.leafLabel}` : "",
                node.status === "active" ? "is-active" : "",
                node.status === "context" ? "is-context" : "",
                freshIds.has(node.id) ? "is-new" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
            >
              <span className="node-kicker">
                {node.kind === "leaf" ? "leaf" : node.kind === "split" ? "question" : "new node"}
              </span>
              <strong>{node.title}</strong>
              <span className="node-count">
                {node.counts.map((count) => `${count.count} ${count.label}`).join(" · ")}
              </span>
              <MixBar counts={node.counts} total={node.total} />
            </article>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
