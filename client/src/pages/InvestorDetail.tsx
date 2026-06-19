// Investor detail page — cross-reference: all properties this investor appears in
import { Link, useParams } from "wouter";
import { ArrowLeft, Building2, Users, Mail, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { buildInvestorIndex } from "@/lib/investorData";

const INVESTOR_INDEX = buildInvestorIndex();

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function InvestorDetail() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name ?? "");
  const investor = INVESTOR_INDEX.find(
    (inv) => inv.name.toLowerCase() === decodedName.toLowerCase()
  );

  if (!investor) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Investor not found</h2>
          <Link href="/"><a className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Back to directory</a></Link>
        </div>
      </Layout>
    );
  }

  const emails = Array.from(new Set(investor.properties.map((p) => p.email).filter(Boolean)));
  const totalProperties = investor.properties.length;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Link href="/">
          <a className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Directory
          </a>
        </Link>

        {/* Header card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-base font-bold shrink-0">
              {initials(investor.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900">{investor.name}</h1>
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {emails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {email}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Building2 className="w-4 h-4" />
                <span className="font-semibold text-slate-800">{totalProperties}</span>
                <span>{totalProperties === 1 ? "property" : "properties"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Properties table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Properties with Ownership Interest</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Property</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Entity</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">% Capital</th>
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {investor.properties.map((p, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} group`}>
                    <td className="px-5 py-3">
                      <Link href={`/property/${p.propertyId}`}>
                        <a className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
                          {p.propertyName}
                        </a>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs hidden sm:table-cell truncate max-w-xs">
                      {p.entityName}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {p.pct_capital !== null ? (
                        <div>
                          <span className="font-mono text-slate-700">{p.pct_capital.toFixed(4)}%</span>
                          <div className="flex justify-end mt-1">
                            <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-400 rounded-full"
                                style={{ width: `${Math.min(100, p.pct_capital)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/property/${p.propertyId}`}>
                        <a>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                        </a>
                      </Link>
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
