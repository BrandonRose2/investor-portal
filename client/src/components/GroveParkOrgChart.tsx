// Interactive org chart modal for Grove Park MT structure
// Org chart data as of 10/1/2020
import { useState } from "react";
import { X, GitBranch, ChevronDown, ChevronRight, Info } from "lucide-react";

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
      description: "The limited partner that holds the economic interest in the LP. Owned by MM Shares and TM Shares.",
      children: [
        {
          id: "mm",
          label: "MM Shares",
          pct: "65%",
          type: "group",
          description: "Marc Menowitz's share group — holds 65% of Grove Park MT Investment LLC.",
          children: [
            { id: "marc", label: "Marc Menowitz", pct: "86.453%", type: "individual", description: "86.453% of MM Shares (65% block)" },
            { id: "elle", label: "Elle Menowitz", pct: "6.7873%", type: "individual", description: "6.7873% of MM Shares (65% block)" },
            { id: "nicole", label: "Nicole Chriqui", pct: "2.2624%", type: "individual", description: "2.2624% of MM Shares (65% block)" },
            { id: "kathy", label: "Kathy Chriqui", pct: "2.2624%", type: "individual", description: "2.2624% of MM Shares (65% block)" },
            { id: "bill", label: "Bill Greenberg", pct: "2.2624%", type: "individual", description: "2.2624% of MM Shares (65% block)" },
          ],
        },
        {
          id: "tm",
          label: "TM Shares",
          pct: "35%",
          type: "group",
          description: "Todd Menowitz's share group — holds 35% of Grove Park MT Investment LLC.",
          children: [
            { id: "todd", label: "Todd Menowitz", pct: "71.4286%", type: "individual", description: "71.4286% of TM Shares (35% block)" },
            { id: "fam", label: "FAM Descendants Trust", pct: "15.9664%", type: "individual", description: "15.9664% of TM Shares (35% block)" },
            { id: "myles", label: "Myles Menowitz", pct: "10.0840%", type: "individual", description: "10.0840% of TM Shares (35% block)" },
            { id: "john", label: "John McLelland", pct: "2.5210%", type: "individual", description: "2.5210% of TM Shares (35% block)" },
          ],
        },
      ],
    },
  ],
};

const TYPE_STYLES: Record<OrgNode["type"], string> = {
  top: "bg-blue-700 text-white border-blue-700",
  partner: "bg-blue-100 text-blue-900 border-blue-300",
  group: "bg-slate-100 text-slate-800 border-slate-300",
  individual: "bg-white text-slate-700 border-slate-200",
};

function OrgNodeCard({
  node,
  depth = 0,
}: {
  node: OrgNode;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [selected, setSelected] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={`flex flex-col items-center ${depth > 0 ? "mt-4" : ""}`}>
      {/* Card */}
      <div
        className={`
          relative rounded-lg border-2 px-4 py-2.5 text-center cursor-pointer
          transition-all duration-150 shadow-sm min-w-[160px] max-w-[200px]
          ${TYPE_STYLES[node.type]}
          ${selected ? "ring-2 ring-offset-2 ring-blue-500 shadow-md" : "hover:shadow-md hover:-translate-y-0.5"}
        `}
        onClick={() => setSelected(!selected)}
      >
        <div className="text-sm font-semibold leading-tight">{node.label}</div>
        {node.sublabel && (
          <div className={`text-xs mt-0.5 ${node.type === "top" ? "text-blue-200" : "text-slate-500"}`}>
            {node.sublabel}
          </div>
        )}
        {node.pct && (
          <div className={`text-xs font-bold mt-1 ${node.type === "group" ? "text-blue-700" : "text-slate-500"}`}>
            {node.pct}
          </div>
        )}

        {/* Expand/collapse toggle */}
        {hasChildren && (
          <button
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Tooltip */}
      {selected && node.description && (
        <div className="mt-2 mb-1 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg max-w-[220px] text-center z-20 relative">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45" />
          {node.description}
        </div>
      )}

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-6 flex gap-6 items-start relative">
          {/* Horizontal connector line */}
          {node.children!.length > 1 && (
            <div
              className="absolute top-0 left-0 right-0 h-px bg-slate-300"
              style={{ top: 0 }}
            />
          )}
          {node.children!.map((child) => (
            <OrgNodeCard key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
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
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
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
        <div className="flex items-center gap-4 px-6 py-2.5 bg-slate-50 border-b border-slate-100 shrink-0 flex-wrap">
          {[
            { label: "LP Entity", cls: "bg-blue-700" },
            { label: "Partners", cls: "bg-blue-100 border border-blue-300" },
            { label: "Share Groups", cls: "bg-slate-100 border border-slate-300" },
            { label: "Individuals", cls: "bg-white border border-slate-200" },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className={`w-3 h-3 rounded ${cls}`} />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
            <Info className="w-3 h-3" />
            Click nodes to expand details
          </div>
        </div>

        {/* Chart area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="flex justify-center min-w-max mx-auto">
            <OrgNodeCard node={ORG_DATA} />
          </div>
        </div>
      </div>
    </div>
  );
}
