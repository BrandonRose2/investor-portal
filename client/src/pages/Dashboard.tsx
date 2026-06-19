// Dashboard page — summary stats for the investor portal
import { useMemo } from "react";
import { Link } from "wouter";
import { Building2, Users, TrendingUp, ChevronRight, Star } from "lucide-react";
import Layout from "@/components/Layout";
import { useAdmin } from "@/contexts/AdminContext";

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { properties } = useAdmin();

  const stats = useMemo(() => {
    const totalInvestors = properties.reduce((s, p) => s + p.investors.length, 0);
    const uniqueNames = new Set(properties.flatMap((p) => p.investors.map((i) => i.name)));
    const totalPct = properties.reduce(
      (s, p) => s + p.investors.reduce((ps, i) => ps + (i.pct_capital ?? 0), 0),
      0
    );
    const avgInvestors = properties.length ? (totalInvestors / properties.length).toFixed(1) : "0";

    // Top investors by number of properties they appear in
    const countMap: Record<string, number> = {};
    for (const p of properties) {
      for (const inv of p.investors) {
        countMap[inv.name] = (countMap[inv.name] ?? 0) + 1;
      }
    }
    const topInvestors = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Properties with most investors
    const topProperties = [...properties]
      .sort((a, b) => b.investors.length - a.investors.length)
      .slice(0, 8);

    return { totalInvestors, uniqueNames: uniqueNames.size, avgInvestors, topInvestors, topProperties, totalPct };
  }, [properties]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Portfolio overview · Data as of 10/1/2020</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Properties"
            value={properties.length}
            sub="Active in portfolio"
            icon={Building2}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Unique Investors"
            value={stats.uniqueNames}
            sub="Distinct entities"
            icon={Users}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Total Investor Records"
            value={stats.totalInvestors}
            sub={`Avg ${stats.avgInvestors} per property`}
            icon={TrendingUp}
            color="bg-violet-50 text-violet-600"
          />
          <StatCard
            label="MT Structure"
            value={properties.filter((p) => p.isGrovePark).length}
            sub="Grove Park entities"
            icon={Star}
            color="bg-amber-50 text-amber-600"
          />
        </div>

        {/* Two-column breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top investors by property count */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Top Investors by Property Count</h2>
              <p className="text-xs text-slate-400 mt-0.5">Entities appearing in the most properties</p>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.topInvestors.map((inv, i) => (
                <Link
                  key={inv.name}
                  href={`/investor/${encodeURIComponent(inv.name)}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                >
                  <span className="w-5 text-xs font-mono text-slate-400 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{inv.name}</p>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
                    {inv.count} {inv.count === 1 ? "property" : "properties"}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Properties with most investors */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Properties by Investor Count</h2>
              <p className="text-xs text-slate-400 mt-0.5">Most complex ownership structures</p>
            </div>
            <div className="divide-y divide-slate-100">
              {stats.topProperties.map((prop, i) => (
                <Link
                  key={prop.id}
                  href={`/property/${prop.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                >
                  <span className="w-5 text-xs font-mono text-slate-400 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{prop.name}</p>
                    <p className="text-xs text-slate-400 truncate">{prop.entity_name}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    {prop.investors.length} investors
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
