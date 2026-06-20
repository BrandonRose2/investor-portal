// Grove Park Ownership Structure — SVG-based org chart
// Positions are computed so the tree is always centered and fits the modal
import { useState } from "react";
import { X, GitBranch, Info } from "lucide-react";

// ── Data ────────────────────────────────────────────────────────────────────

type NodeType = "top" | "partner" | "group" | "individual";

interface OrgNode {
  id: string;
  label: string;
  sublabel?: string;
  pct?: string;
  type: NodeType;
  description?: string;
  children?: OrgNode[];
}

const DATA: OrgNode = {
  id: "lp", label: "Grove Park\nHousing LP", type: "top",
  description: "The main limited partnership that owns the Grove Park property.",
  children: [
    {
      id: "gp", label: "Grove Park\nCrossroads GP LLC", sublabel: "General Partner\n(non-profit)", type: "partner",
      description: "The non-profit general partner. Manages the LP but holds no economic interest in profits.",
    },
    {
      id: "mt", label: "Grove Park MT\nInvestment LLC", sublabel: "Limited Partner", type: "partner",
      description: "The limited partner holding the economic interest. Owned by MM Shares (65%) and TM Shares (35%).",
      children: [
        {
          id: "mm", label: "MM Shares", pct: "65%", type: "group",
          description: "Marc Menowitz's share group — holds 65% of Grove Park MT Investment LLC.",
          children: [
            { id: "marc",   label: "Marc Menowitz",        pct: "86.453%",  type: "individual", description: "86.453% of MM Shares (65% block)" },
            { id: "elle",   label: "Elle Menowitz",        pct: "6.787%",   type: "individual", description: "6.7873% of MM Shares (65% block)" },
            { id: "nicole", label: "Nicole Chriqui",       pct: "2.262%",   type: "individual", description: "2.2624% of MM Shares (65% block)" },
            { id: "kathy",  label: "Kathy Chriqui",        pct: "2.262%",   type: "individual", description: "2.2624% of MM Shares (65% block)" },
            { id: "bill",   label: "Bill Greenberg",       pct: "2.262%",   type: "individual", description: "2.2624% of MM Shares (65% block)" },
          ],
        },
        {
          id: "tm", label: "TM Shares", pct: "35%", type: "group",
          description: "Todd Menowitz's share group — holds 35% of Grove Park MT Investment LLC.",
          children: [
            { id: "todd",  label: "Todd Menowitz",         pct: "71.429%",  type: "individual", description: "71.4286% of TM Shares (35% block)" },
            { id: "fam",   label: "FAM Descendants\nTrust", pct: "15.966%", type: "individual", description: "15.9664% of TM Shares (35% block)" },
            { id: "myles", label: "Myles Menowitz",        pct: "10.084%",  type: "individual", description: "10.0840% of TM Shares (35% block)" },
            { id: "john",  label: "John McLelland",        pct: "2.521%",   type: "individual", description: "2.5210% of TM Shares (35% block)" },
          ],
        },
      ],
    },
  ],
};

// ── Layout engine ────────────────────────────────────────────────────────────

const NODE_W = 82;
const NODE_H = 54;
const H_GAP  = 6;    // horizontal gap between siblings
const V_GAP  = 44;   // vertical gap between levels

interface LayoutNode {
  node: OrgNode;
  x: number;   // center-x
  y: number;   // top-y
  children: LayoutNode[];
}

function subtreeWidth(node: OrgNode): number {
  if (!node.children?.length) return NODE_W;
  const childrenW = node.children.reduce((s, c) => s + subtreeWidth(c), 0)
    + H_GAP * (node.children.length - 1);
  return Math.max(NODE_W, childrenW);
}

function buildLayout(node: OrgNode, cx: number, y: number): LayoutNode {
  const children: LayoutNode[] = [];
  if (node.children?.length) {
    const totalW = node.children.reduce((s, c) => s + subtreeWidth(c), 0)
      + H_GAP * (node.children.length - 1);
    let curX = cx - totalW / 2;
    for (const child of node.children) {
      const sw = subtreeWidth(child);
      children.push(buildLayout(child, curX + sw / 2, y + NODE_H + V_GAP));
      curX += sw + H_GAP;
    }
  }
  return { node, x: cx, y, children };
}

function collectBounds(ln: LayoutNode, out = { minX: Infinity, maxX: -Infinity, maxY: -Infinity }) {
  out.minX = Math.min(out.minX, ln.x - NODE_W / 2);
  out.maxX = Math.max(out.maxX, ln.x + NODE_W / 2);
  out.maxY = Math.max(out.maxY, ln.y + NODE_H);
  for (const c of ln.children) collectBounds(c, out);
  return out;
}

// ── Colors ───────────────────────────────────────────────────────────────────

const FILL: Record<NodeType, string>        = { top: "#1d4ed8", partner: "#dbeafe", group: "#e2e8f0", individual: "#ffffff" };
const STROKE: Record<NodeType, string>      = { top: "#1e40af", partner: "#93c5fd", group: "#94a3b8", individual: "#cbd5e1" };
const TEXT_COLOR: Record<NodeType, string>  = { top: "#ffffff", partner: "#1e3a8a", group: "#1e293b", individual: "#334155" };
const SUB_COLOR: Record<NodeType, string>   = { top: "#bfdbfe", partner: "#3b82f6", group: "#64748b", individual: "#94a3b8" };

// ── SVG node renderer ────────────────────────────────────────────────────────

function SvgNode({ ln, onSelect, selected }: {
  ln: LayoutNode;
  onSelect: (id: string | null) => void;
  selected: string | null;
}) {
  const { node, x, y, children } = ln;
  const isSelected = selected === node.id;
  const lines = node.label.split("\n");
  const subLines = node.sublabel?.split("\n") ?? [];
  const hasChildren = children.length > 0;

  // Connector lines to children
  const connectors = children.map((child) => {
    const px = x;
    const py = y + NODE_H;
    const cy = child.y;
    const midY = py + V_GAP / 2;
    return (
      <g key={child.node.id}>
        {/* vertical from parent bottom to mid */}
        <line x1={px} y1={py} x2={px} y2={midY} stroke="#cbd5e1" strokeWidth="1.5" />
        {/* horizontal to child center */}
        <line x1={px} y1={midY} x2={child.x} y2={midY} stroke="#cbd5e1" strokeWidth="1.5" />
        {/* vertical from mid to child top */}
        <line x1={child.x} y1={midY} x2={child.x} y2={cy} stroke="#cbd5e1" strokeWidth="1.5" />
      </g>
    );
  });

  // Text layout
  const totalTextLines = lines.length + subLines.length + (node.pct ? 1 : 0);
  const lineH = 12;
  const totalH = totalTextLines * lineH;
  let textY = y + (NODE_H - totalH) / 2 + lineH * 0.8;

  return (
    <g>
      {connectors}
      {/* Node rect */}
      <rect
        x={x - NODE_W / 2} y={y}
        width={NODE_W} height={NODE_H}
        rx={7} ry={7}
        fill={FILL[node.type]}
        stroke={isSelected ? "#f59e0b" : STROKE[node.type]}
        strokeWidth={isSelected ? 2.5 : 1.5}
        style={{ cursor: "pointer", filter: isSelected ? "drop-shadow(0 0 4px rgba(245,158,11,0.5))" : undefined }}
        onClick={() => onSelect(isSelected ? null : node.id)}
      />
      {/* Label lines */}
      {lines.map((line, i) => (
        <text key={i} x={x} y={textY + i * lineH}
          textAnchor="middle" fontSize="10" fontWeight="600"
          fill={TEXT_COLOR[node.type]} style={{ pointerEvents: "none" }}>
          {line}
        </text>
      ))}
      {subLines.map((line, i) => (
        <text key={"s" + i} x={x} y={textY + lines.length * lineH + i * lineH}
          textAnchor="middle" fontSize="8.5"
          fill={SUB_COLOR[node.type]} style={{ pointerEvents: "none" }}>
          {line}
        </text>
      ))}
      {node.pct && (
        <text x={x} y={textY + (lines.length + subLines.length) * lineH}
          textAnchor="middle" fontSize="10" fontWeight="700"
          fill={node.type === "group" ? "#1d4ed8" : SUB_COLOR[node.type]}
          style={{ pointerEvents: "none" }}>
          {node.pct}
        </text>
      )}
      {/* Recurse children */}
      {children.map((child) => (
        <SvgNode key={child.node.id} ln={child} onSelect={onSelect} selected={selected} />
      ))}
    </g>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

interface Props { open: boolean; onClose: () => void; }

export default function GroveParkOrgChart({ open, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  if (!open) return null;

  const layout = buildLayout(DATA, 0, 0);
  const bounds = collectBounds(layout);
  const PAD = 20;
  const svgW = bounds.maxX - bounds.minX + PAD * 2;
  const svgH = bounds.maxY + PAD * 2;
  // Shift all nodes so minX maps to PAD
  const dx = PAD - bounds.minX;

  function shiftLayout(ln: LayoutNode): LayoutNode {
    return { ...ln, x: ln.x + dx, children: ln.children.map(shiftLayout) };
  }
  const shifted = shiftLayout(layout);

  // Find selected node description
  function findNode(ln: LayoutNode, id: string): OrgNode | null {
    if (ln.node.id === id) return ln.node;
    for (const c of ln.children) { const r = findNode(c, id); if (r) return r; }
    return null;
  }
  const selectedNode = selected ? findNode(shifted, selected) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Grove Park Ownership Structure</h2>
              <p className="text-xs text-slate-400">Click any node to see details · as of 10/1/2020</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 border-b border-slate-100 shrink-0 flex-wrap text-xs text-slate-600">
          {[
            { label: "LP Entity",    bg: "#1d4ed8", border: "#1e40af" },
            { label: "Partners",     bg: "#dbeafe", border: "#93c5fd" },
            { label: "Share Groups", bg: "#e2e8f0", border: "#94a3b8" },
            { label: "Individuals",  bg: "#ffffff", border: "#cbd5e1" },
          ].map(({ label, bg, border }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: bg, border: `1.5px solid ${border}` }} />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-1 text-slate-400 ml-auto">
            <Info className="w-3 h-3" /> Click nodes for details
          </div>
        </div>

        {/* Tooltip bar */}
        {selectedNode && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-800 shrink-0">
            <strong>{selectedNode.label.replace("\n", " ")}</strong>
            {selectedNode.pct && <span className="ml-1 font-mono">({selectedNode.pct})</span>}
            {" — "}{selectedNode.description}
          </div>
        )}

        {/* SVG chart — scrollable */}
        <div className="flex-1 overflow-auto p-2 bg-slate-50/40">
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ display: "block", margin: "0 auto", minWidth: svgW }}
          >
            <SvgNode ln={shifted} onSelect={setSelected} selected={selected} />
          </svg>
        </div>
      </div>
    </div>
  );
}
