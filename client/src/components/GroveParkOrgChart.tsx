// Interactive org chart modal for Grove Park MT structure
// Uses a reliable table-cell approach for connector lines that works in all browsers
import { useState } from "react";
import { X, GitBranch, Info } from "lucide-react";

interface OrgNode {
  id: string;
  label: string;
  sublabel?: string;
  pct?: string;
  type: "top" | "partner" | "group" | "individual";
  children?: OrgNode[];
  description?: string;
}

const ORG_DATA: OrgNode = {
  id: "lp",
  label: "Grove Park Housing LP",
  type: "top",
  description: "The main limited partnership that owns the Grove Park property.",
  children: [
    {
      id: "gp",
      label: "Grove Park Crossroads GP LLC",
      sublabel: "General Partner (non-profit)",
      type: "partner",
      description: "The non-profit general partner. Manages the LP but holds no economic interest in profits.",
    },
    {
      id: "mt",
      label: "Grove Park MT Investment LLC",
      sublabel: "Limited Partner",
      type: "partner",
      description: "The limited partner holding the economic interest. Owned by MM Shares (65%) and TM Shares (35%).",
      children: [
        {
          id: "mm",
          label: "MM Shares",
          pct: "65%",
          type: "group",
          description: "Marc Menowitz's share group — holds 65% of Grove Park MT Investment LLC.",
          children: [
            { id: "marc",   label: "Marc Menowitz",        pct: "86.453%",  type: "individual", description: "86.453% of MM Shares (65% block)" },
            { id: "elle",   label: "Elle Menowitz",        pct: "6.7873%",  type: "individual", description: "6.7873% of MM Shares (65% block)" },
            { id: "nicole", label: "Nicole Chriqui",       pct: "2.2624%",  type: "individual", description: "2.2624% of MM Shares (65% block)" },
            { id: "kathy",  label: "Kathy Chriqui",        pct: "2.2624%",  type: "individual", description: "2.2624% of MM Shares (65% block)" },
            { id: "bill",   label: "Bill Greenberg",       pct: "2.2624%",  type: "individual", description: "2.2624% of MM Shares (65% block)" },
          ],
        },
        {
          id: "tm",
          label: "TM Shares",
          pct: "35%",
          type: "group",
          description: "Todd Menowitz's share group — holds 35% of Grove Park MT Investment LLC.",
          children: [
            { id: "todd",  label: "Todd Menowitz",         pct: "71.4286%", type: "individual", description: "71.4286% of TM Shares (35% block)" },
            { id: "fam",   label: "FAM Descendants Trust", pct: "15.9664%", type: "individual", description: "15.9664% of TM Shares (35% block)" },
            { id: "myles", label: "Myles Menowitz",        pct: "10.0840%", type: "individual", description: "10.0840% of TM Shares (35% block)" },
            { id: "john",  label: "John McLelland",        pct: "2.5210%",  type: "individual", description: "2.5210% of TM Shares (35% block)" },
          ],
        },
      ],
    },
  ],
};

const NODE_STYLE: Record<OrgNode["type"], { bg: string; text: string; border: string }> = {
  top:        { bg: "bg-blue-700",  text: "text-white",     border: "border-blue-800" },
  partner:    { bg: "bg-blue-100",  text: "text-blue-900",  border: "border-blue-300" },
  group:      { bg: "bg-slate-200", text: "text-slate-800", border: "border-slate-400" },
  individual: { bg: "bg-white",     text: "text-slate-700", border: "border-slate-300" },
};

function Node({ node }: { node: OrgNode }) {
  const [open, setOpen] = useState(false);
  const s = NODE_STYLE[node.type];
  return (
    <div className="relative inline-flex flex-col items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          rounded-lg border-2 px-3 py-2 text-center w-36 shadow-sm select-none
          transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-95
          ${s.bg} ${s.text} ${s.border}
        `}
      >
        <div className="text-[11px] font-semibold leading-tight">{node.label}</div>
        {node.sublabel && (
          <div className={`text-[9px] mt-0.5 leading-tight opacity-70`}>{node.sublabel}</div>
        )}
        {node.pct && (
          <div className={`text-[11px] font-bold mt-1 ${node.type === "group" ? "text-blue-700" : "opacity-60"}`}>
            {node.pct}
          </div>
        )}
      </button>
      {open && node.description && (
        <div className="absolute top-full mt-2 z-30 w-48 bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-2 shadow-xl text-center leading-snug pointer-events-none">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45 rounded-sm" />
          {node.description}
        </div>
      )}
    </div>
  );
}

// Renders a node and its subtree using a pure-CSS approach
function Tree({ node }: { node: OrgNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const children = node.children ?? [];
  const hasChildren = children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* The node card */}
      <Node node={node} />

      {hasChildren && (
        <>
          {/* Collapse toggle + vertical stem */}
          <div className="flex flex-col items-center">
            <div className="w-px h-3 bg-slate-300" />
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="w-4 h-4 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors text-[10px] font-bold leading-none"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? "+" : "−"}
            </button>
            {!collapsed && <div className="w-px h-3 bg-slate-300" />}
          </div>

          {!collapsed && (
            <div className="flex gap-0 items-start">
              {children.map((child, i) => {
                const isFirst = i === 0;
                const isLast = i === children.length - 1;
                const isOnly = children.length === 1;
                return (
                  <div key={child.id} className="flex flex-col items-center px-3">
                    {/* Top horizontal connector */}
                    <div className="flex w-full h-3 relative">
                      {/* Left half */}
                      <div className={`flex-1 border-t-2 border-slate-300 mt-0 ${isFirst || isOnly ? "border-transparent" : ""}`} />
                      {/* Vertical tick down */}
                      <div className="w-px h-3 bg-slate-300 absolute left-1/2 -translate-x-1/2 top-0" />
                      {/* Right half */}
                      <div className={`flex-1 border-t-2 border-slate-300 mt-0 ${isLast || isOnly ? "border-transparent" : ""}`} />
                    </div>
                    <Tree node={child} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface GroveParkOrgChartProps {
  open: boolean;
  onClose: () => void;
}

export default function GroveParkOrgChart({ open, onClose }: GroveParkOrgChartProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Grove Park Ownership Structure</h2>
              <p className="text-xs text-slate-400 mt-0.5">Click any node to see details · as of 10/1/2020</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 border-b border-slate-100 shrink-0 flex-wrap">
          {[
            { label: "LP Entity",    cls: "bg-blue-700" },
            { label: "Partners",     cls: "bg-blue-100 border border-blue-300" },
            { label: "Share Groups", cls: "bg-slate-200 border border-slate-400" },
            { label: "Individuals",  cls: "bg-white border border-slate-300" },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className={`w-3 h-3 rounded ${cls}`} />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
            <Info className="w-3 h-3" />
            Click nodes for details · use − to collapse branches
          </div>
        </div>

        {/* Chart — scrollable in both axes */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50/30">
          <div className="flex justify-center min-w-max">
            <Tree node={ORG_DATA} />
          </div>
        </div>
      </div>
    </div>
  );
}
