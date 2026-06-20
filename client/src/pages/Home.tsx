// Home page — Command Center dashboard
// Tabs: Properties | Investors | Global search
import { useState, useMemo } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Search, Building2, Users, ChevronRight, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { PROPERTIES, buildInvestorIndex } from "@/lib/investorData";

const INVESTOR_INDEX = buildInvestorIndex();

type Tab = "properties" | "investors";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function pctBar(pct: number | null) {
  if (pct === null) return null;
  const w = Math.min(100, pct);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${w}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-500 w-12 text-right">{pct.toFixed(4)}%</span>
    </div>
  );
}

export default function Home() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const tab: Tab = new URLSearchParams(search).get("tab") === "investors" ? "investors" : "properties";

  const filteredProperties = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return PROPERTIES;
    return PROPERTIES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.entity_name.toLowerCase().includes(q) ||
        p.entity_ein.includes(q) ||
        p.investors.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [query]);

  const filteredInvestors = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return INVESTOR_INDEX;
    return INVESTOR_INDEX.filter(
      (inv) =>
        inv.name.toLowerCase().includes(q) ||
        inv.properties.some(
          (p) =>
            p.propertyName.toLowerCase().includes(q) ||
            p.entityName.toLowerCase().includes(q)
        )
    );
  }, [query]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Investor Directory</h1>
          <p className="text-base text-slate-500 mt-1">
            Search across all 37 properties and their investors. Click any row for full detail.
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

        {/* Properties tab */}
        {tab === "properties" && (
          <div className="space-y-2">
            {filteredProperties.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Building2 className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No properties match your search.</p>
              </div>
            )}
            {filteredProperties.map((prop) => (
              <Link key={prop.id} href={`/property/${prop.id}`}>
                <div className="block group flex items-center gap-4 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition-colors duration-100 cursor-pointer">
                    {/* Left accent bar */}
                    <div className={`w-1 h-10 rounded-full shrink-0 ${prop.isGrovePark ? "bg-amber-400" : "bg-blue-500"}`} />

                    {/* Property info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 truncate">{prop.name}</span>
                        {prop.isGrovePark && (
                          <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" /> MT Structure
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate mt-0.5">{prop.entity_name}</div>
                    </div>

                    {/* EIN */}
                    <div className="hidden sm:block text-sm font-mono text-slate-400 shrink-0">
                      EIN {prop.entity_ein}
                    </div>

                    {/* Investor count */}
                    <div className="shrink-0 flex items-center gap-1 text-sm font-medium text-slate-600">
                      <Users className="w-4 h-4" />
                      {prop.investors.length}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Investors tab */}
        {tab === "investors" && (
          <div className="space-y-2">
            {filteredInvestors.length === 0 && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <Users className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No investors match your search.</p>
              </div>
            )}
            {filteredInvestors.map((inv) => (
              <Link key={inv.name} href={`/investor/${encodeURIComponent(inv.name)}`}>
                <div className="block group flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition-colors duration-100 cursor-pointer">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(inv.name)}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-slate-900 truncate">{inv.name}</div>
                      <div className="text-sm text-slate-500 mt-0.5 truncate">
                        {inv.properties.slice(0, 3).map((p) => p.propertyName).join(" · ")}
                        {inv.properties.length > 3 && ` +${inv.properties.length - 3} more`}
                      </div>
                    </div>

                    {/* Property count */}
                    <div className="shrink-0 flex items-center gap-1 text-sm font-medium text-slate-600">
                      <Building2 className="w-4 h-4" />
                      {inv.properties.length}
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
