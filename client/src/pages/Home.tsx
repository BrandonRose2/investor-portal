// Home page — Properties & Investors directory
// Fetches from tRPC instead of static data
import { useState, useMemo, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Search, Building2, Users, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
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

export default function Home() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
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
        (inv.email ?? "").toLowerCase().includes(q)
    );
  }, [investorsData, query]);

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

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading…</span>
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
          <div className="space-y-2">
            {filteredInvestors.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Users className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No investors match your search.</p>
              </div>
            )}
            {filteredInvestors.map((inv) => {
              const c = avatarColor(inv.name);
              const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.active;
              return (
                <Link key={inv.id} href={`/investor/${inv.id}`}>
                  <div className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition-colors duration-100 cursor-pointer">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${c.bg} ${c.text}`}>
                      {initials(inv.name)}
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
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
                    </div>

                    {/* Property count */}
                    <div className="shrink-0 flex items-center gap-1 text-sm font-medium text-slate-600">
                      <Building2 className="w-4 h-4" />
                      {Number(inv.propertyCount)}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
