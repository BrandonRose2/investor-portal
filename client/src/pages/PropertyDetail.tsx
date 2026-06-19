// Property detail page — shows all investors for a given property
import { useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Building2, Users, Mail, AlertCircle, Info, GitBranch } from "lucide-react";
import Layout from "@/components/Layout";
import { PROPERTIES } from "@/lib/investorData";
import GroveParkOrgChart from "@/components/GroveParkOrgChart";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const property = PROPERTIES.find((p) => p.id === id);
  const [orgChartOpen, setOrgChartOpen] = useState(false);

  if (!property) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Property not found</h2>
          <Link href="/" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Back to directory</Link>
        </div>
      </Layout>
    );
  }

  const totalPct = property.investors.reduce((s, i) => s + (i.pct_capital ?? 0), 0);

  return (
    <Layout>
      <GroveParkOrgChart open={orgChartOpen} onClose={() => setOrgChartOpen(false)} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Directory
        </Link>

        {/* Header card */}
        <div className={`rounded-xl border p-5 mb-6 ${property.isGrovePark ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${property.isGrovePark ? "bg-amber-100" : "bg-blue-100"}`}>
              <Building2 className={`w-5 h-5 ${property.isGrovePark ? "text-amber-600" : "text-blue-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{property.name}</h1>
                {property.isGrovePark && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3" /> MT Structure
                  </span>
                )}
                {/* Org chart button — right of title, only for Grove Park */}
                {property.isGrovePark && (
                  <button
                    onClick={() => setOrgChartOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    View Ownership Structure
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">{property.entity_name}</p>
              <p className="text-xs font-mono text-slate-400 mt-1">EIN: {property.entity_ein}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                <span className="font-semibold text-slate-800">{property.investors.length}</span>
                <span>investors</span>
              </div>
            </div>
          </div>

          {/* Grove Park special note — below the title row */}
          {property.isGrovePark && (
            <div className="mt-4 flex gap-2 p-3 rounded-lg bg-amber-100/60 border border-amber-200">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> For Grove Park, investors are held under the MT (Grove Park MT Investment LLC),
                not the LP directly. The LP has two members: Grove Park Crossroads GP LLC (General Partner, non-profit)
                and Grove Park MT Investment LLC (Limited Partner). See the MT Detail entry for individual investor breakdown.
              </p>
            </div>
          )}
        </div>

        {/* Investors table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Investors / Owners</h2>
            {totalPct > 0 && (
              <span className="text-xs font-mono text-slate-400">
                Total shown: {totalPct.toFixed(3)}%
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">% Capital</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entity (Owner)</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {property.investors.map((inv, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3 text-right">
                      {inv.pct_capital !== null ? (
                        <span className="font-mono text-slate-700">{inv.pct_capital.toFixed(4)}%</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/investor/${encodeURIComponent(inv.name)}`} className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                        {inv.name}
                      </Link>
                      {inv.notes && (
                        <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {inv.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {inv.email ? (
                        <a
                          href={`mailto:${inv.email}`}
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {inv.email}
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
