// Home page — Command Center dashboard
// Fetches from tRPC instead of static data
import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Search, Building2, Users, ChevronRight, AlertCircle, Loader2, Pencil, Check, X } from "lucide-react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { usePrint } from "@/contexts/PrintContext";

type Tab = "properties" | "investors";

const AVATAR_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-lime-100", text: "text-lime-700" },
  { bg: "bg-sky-100", text: "text-sky-700" },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:      { label: "Active",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  deceased:    { label: "Deceased",    cls: "bg-slate-100 text-slate-500 border-slate-200" },
  transferred: { label: "Transferred", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  bought_out:  { label: "Bought Out",  cls: "bg-red-50 text-red-700 border-red-200" },
};

// Inline note popover component
function InlineNoteEditor({
  investorId,
  currentNote,
  onSaved,
}: {
  investorId: number;
  currentNote: string | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentNote ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const updateInfo = trpc.investors.updateInfo.useMutation({
    onSuccess: () => {
      utils.investors.list.invalidate();
      onSaved();
      setOpen(false);
    },
  });

  // Open popover and focus textarea
  function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setValue(currentNote ?? "");
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    updateInfo.mutate({ id: investorId, adminNotes: value.trim() || null });
  }

  function handleCancel(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full" onClick={(e) => e.preventDefault()}>
      {/* Display row */}
      <div
        className="flex items-start gap-1 group/note cursor-pointer"
        onClick={handleOpen}
      >
        <span className="flex-1 min-w-0 text-xs">
          {currentNote ? (
            <span className="text-blue-700 truncate block" title={currentNote}>
              {currentNote.length > 55 ? currentNote.slice(0, 55) + "…" : currentNote}
            </span>
          ) : (
            <span className="text-slate-300">—</span>
          )}
        </span>
        <Pencil className="w-3 h-3 text-slate-300 group-hover/note:text-blue-500 shrink-0 mt-0.5 transition-colors" />
      </div>

      {/* Popover */}
      {open && (
        <div
          className="absolute z-50 right-0 top-6 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-slate-600 mb-1.5">Edit Note</p>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            placeholder="Add a note…"
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 placeholder-slate-400"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateInfo.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Check className="w-3 h-3" /> Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [noteRefreshKey, setNoteRefreshKey] = useState(0);
  const tab: Tab = new URLSearchParams(search).get("tab") === "investors" ? "investors" : "properties";

  const { data: propertiesData, isLoading: propLoading } = trpc.properties.list.useQuery({});
  const { data: investorsData, isLoading: invLoading } = trpc.investors.list.useQuery({});

  const filteredProperties = useMemo(() => {
    if (!propertiesData) return [];
    const q = query.toLowerCase();
    if (!q) return propertiesData;
    return propertiesData.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.entityName.toLowerCase().includes(q) ||
        (p.entityEin ?? "").toLowerCase().includes(q)
    );
  }, [propertiesData, query]);

  const filteredInvestors = useMemo(() => {
    if (!investorsData) return [];
    const q = query.toLowerCase();
    if (!q) return investorsData;
    return investorsData.filter(
      (inv) =>
        inv.name.toLowerCase().includes(q) ||
        (inv.email ?? "").toLowerCase().includes(q) ||
        (inv.adminNotes ?? "").toLowerCase().includes(q) ||
        ((inv as any).latestPiNote ?? "").toLowerCase().includes(q)
    );
  }, [investorsData, query, noteRefreshKey]);

  const isLoading = tab === "properties" ? propLoading : invLoading;

  // Register summary print payload
  const { setPayload } = usePrint();
  useEffect(() => {
    if (!propertiesData) return;
    setPayload({
      type: "summary",
      data: {
        properties: propertiesData.map((p) => ({
          id: p.id,
          name: p.name,
          entityName: p.entityName,
          entityEin: p.entityEin,
          investorCount: (p as any).investorCount ?? (p as any).investors?.length ?? 0,
        })),
        totalInvestors: investorsData?.length ?? 0,
      },
    });
    return () => setPayload(null);
  }, [propertiesData, investorsData, setPayload]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Investor Summary</h1>
          <p className="text-base text-slate-500 mt-1">
            Search across all properties and their investors. Click any row for full detail.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by property name, investor name, entity, or EIN…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-3 text-base border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-200">
          {(["properties", "investors"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => navigate(`/?tab=${t}`)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-base font-semibold border-b-2 -mb-px transition-colors duration-100
                ${tab === t
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }
              `}
            >
              {t === "properties" ? <Building2 className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500 font-mono">
                {t === "properties" ? filteredProperties.length : filteredInvestors.length}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {/* Properties tab */}
        {!isLoading && tab === "properties" && (
          <div className="space-y-2">
            {filteredProperties.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Building2 className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No properties match your search.</p>
              </div>
            )}
            {filteredProperties.map((prop) => (
              <Link key={prop.id} href={`/property/${prop.id}`}>
                <div
                  className="group grid items-center px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition-colors duration-100 cursor-pointer"
                  style={{ gridTemplateColumns: "0.25rem 1fr 10rem 3.5rem 1rem", gap: "0.75rem" }}
                >
                  {/* Left accent bar */}
                  <div className={`w-1 h-10 rounded-full justify-self-center ${prop.isGrovePark ? "bg-amber-400" : "bg-blue-500"}`} />

                  {/* Property info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 truncate">{prop.name}</span>
                      {prop.isGrovePark && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> MT Structure
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 truncate mt-0.5">{prop.entityName}</div>
                  </div>

                  {/* EIN — centered */}
                  <div className="hidden sm:flex items-center justify-center">
                    <span
                      className="font-mono font-bold text-blue-700 text-sm"
                      style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.03em" }}
                    >
                      EIN {prop.entityEin || "—"}
                    </span>
                  </div>

                  {/* Investor count */}
                  <div className="flex items-center justify-end gap-1 text-sm font-medium text-slate-600">
                    <Users className="w-4 h-4" />
                    {Number(prop.investorCount)}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors justify-self-end" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Investors tab */}
        {!isLoading && tab === "investors" && (
          <div>
            {filteredInvestors.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Users className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No investors match your search.</p>
              </div>
            )}

            {filteredInvestors.length > 0 && (
              <>
                {/* Column header row */}
                <div className="hidden md:flex items-center gap-3 px-4 pb-1.5 mb-1">
                  {/* avatar placeholder */}
                  <div className="w-8 shrink-0" />
                  {/* name / email */}
                  <div className="flex-1 min-w-0 text-xs font-bold text-slate-400 uppercase tracking-wide">Investor</div>
                  {/* notes header */}
                  <div className="w-64 shrink-0 text-xs font-bold text-slate-400 uppercase tracking-wide">Notes</div>
                  {/* props + chevron */}
                  <div className="shrink-0 w-16" />
                </div>

                <div className="space-y-2">
                  {filteredInvestors.map((inv) => {
                    const c = avatarColor(inv.name);
                    const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.active;
                    return (
                      <div key={inv.id} className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition-colors duration-100">
                        {/* Avatar — links to detail */}
                        <Link href={`/investor/${inv.id}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer ${c.bg} ${c.text}`}>
                            {initials(inv.name)}
                          </div>
                        </Link>

                        {/* Name + email — links to detail */}
                        <Link href={`/investor/${inv.id}`} className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-slate-900 truncate">{inv.name}</span>
                            {inv.status !== "active" && (
                              <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${badge.cls}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          {inv.email && (
                            <div className="text-sm text-slate-500 mt-0.5 truncate">{inv.email}</div>
                          )}
                        </Link>

                        {/* Notes column — inline editable, stops link propagation */}
                        <div className="hidden md:block w-64 shrink-0 relative">
                          <InlineNoteEditor
                            investorId={inv.id}
                            currentNote={inv.adminNotes ?? null}
                            onSaved={() => setNoteRefreshKey((k) => k + 1)}
                          />
                          {(inv as any).latestPiNote && (
                            <span className="text-xs text-amber-700 truncate block mt-0.5" title={(inv as any).latestPiNote}>
                              {(inv as any).latestPiNote.length > 55
                                ? (inv as any).latestPiNote.slice(0, 55) + "…"
                                : (inv as any).latestPiNote}
                            </span>
                          )}
                        </div>

                        {/* Property count + chevron — links to detail */}
                        <Link href={`/investor/${inv.id}`} className="shrink-0 flex items-center gap-1 text-sm font-medium text-slate-600">
                          <Building2 className="w-4 h-4" />
                          {Number(inv.propertyCount)}
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors ml-1" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
