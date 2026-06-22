// Property detail page — fetches from tRPC
import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Building2, Users, Mail, AlertCircle, Info, GitBranch, Loader2, FileText, Download, Eye } from "lucide-react";
import QuickUploadButton from "@/components/QuickUploadButton";
import DocPreviewModal, { type PreviewDoc } from "@/components/DocPreviewModal";
import InlineRename from "@/components/InlineRename";
import Layout from "@/components/Layout";
import GroveParkOrgChart from "@/components/GroveParkOrgChart";
import { trpc } from "@/lib/trpc";
import { usePrint } from "@/contexts/PrintContext";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:      { label: "Active",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  deceased:    { label: "Deceased",    cls: "bg-slate-100 text-slate-500 border-slate-200" },
  transferred: { label: "Transferred", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  bought_out:  { label: "Bought Out",  cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [orgChartOpen, setOrgChartOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);

  const { data: property, isLoading } = trpc.properties.getById.useQuery(
    { id: id ?? "" },
    { enabled: !!id }
  );
  const utils = trpc.useUtils();
  const { data: propertyDocs } = trpc.documents.list.useQuery(
    { propertyId: id ?? "" },
    { enabled: !!id }
  );
  const renameDoc = trpc.documents.rename.useMutation({
    onSuccess: () => utils.documents.list.invalidate({ propertyId: id ?? "" }),
  });

  // Register print payload
  const { setPayload } = usePrint();
  useEffect(() => {
    if (!property) { setPayload(null); return; }
    setPayload({
      type: "property",
      data: {
        id: property.id,
        name: property.name,
        entityName: property.entityName,
        entityEin: property.entityEin,
        isGrovePark: property.isGrovePark,
        investors: property.investors.map((inv) => ({
          investorId: inv.investorId,
          investorName: inv.investorName,
          email: inv.investorEmail,
          status: inv.investorStatus,
          pctCapital: inv.pctCapital,
        })),
      },
    });
    return () => setPayload(null);
  }, [property, setPayload]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading property…
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Property not found</h2>
          <Link href="/" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            ← Back to directory
          </Link>
        </div>
      </Layout>
    );
  }

  const totalPct = property.investors.reduce(
    (s, i) => s + parseFloat(i.pctCapital ?? "0"),
    0
  );

  return (
    <Layout>
      <GroveParkOrgChart open={orgChartOpen} onClose={() => setOrgChartOpen(false)} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Directory
        </Link>

        {/* Header card */}
        <div
          className={`rounded-xl border p-5 mb-6 ${
            property.isGrovePark ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                property.isGrovePark ? "bg-amber-100" : "bg-blue-100"
              }`}
            >
              <Building2
                className={`w-5 h-5 ${property.isGrovePark ? "text-amber-600" : "text-blue-600"}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{property.name}</h1>
                {property.isGrovePark && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3 h-3" /> MT Structure
                  </span>
                )}
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
              <p className="text-sm text-slate-600 mt-1">{property.entityName}</p>
              <p className="font-mono font-bold text-blue-700 text-sm mt-1">
                EIN {property.entityEin || "—"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                <span className="font-semibold text-slate-800">{property.investors.length}</span>
                <span>investors</span>
              </div>
              <QuickUploadButton
                propertyId={id}
                onUploaded={() => utils.documents.list.invalidate({ propertyId: id ?? "" })}
              />
            </div>
          </div>

          {/* Grove Park special note */}
          {property.isGrovePark && (
            <div className="mt-4 flex gap-2 p-3 rounded-lg bg-amber-100/60 border border-amber-200">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> For Grove Park, investors are held under the MT (Grove Park MT
                Investment LLC), not the LP directly. The LP has two members: Grove Park Crossroads GP LLC
                (General Partner, non-profit) and Grove Park MT Investment LLC (Limited Partner). See the MT
                Detail entry for individual investor breakdown.
              </p>
            </div>
          )}
        </div>

        {/* Investors table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Investors / Owners</h2>
            {totalPct > 0 && (
              <span className="font-mono font-semibold text-sm" style={{ color: "#16a34a" }}>
                Total: {totalPct.toFixed(4)}%
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide w-36">
                    % Capital
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Entity (Owner)
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide w-28">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {property.investors.map((inv, idx) => {
                  const badge = STATUS_BADGE[inv.investorStatus] ?? STATUS_BADGE.active;
                  return (
                    <tr key={inv.investorId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-5 py-3 text-right">
                        {inv.pctCapital !== null ? (
                          <span
                            className="font-mono text-base font-semibold"
                            style={{ color: "#16a34a" }}
                          >
                            {parseFloat(inv.pctCapital ?? "0").toFixed(4)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/investor/${inv.investorId}`}
                          className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {inv.investorName}
                        </Link>
                        {inv.piNotes && (
                          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {inv.piNotes}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {inv.investorEmail ? (
                          <a
                            href={`mailto:${inv.investorEmail}`}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            {inv.investorEmail}
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {inv.investorStatus !== "active" ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">Active</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Documents section */}
      {propertyDocs && propertyDocs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-6">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              Documents
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {propertyDocs.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {propertyDocs.map((doc) => (
              <div key={doc.id} className="px-5 py-3 flex items-center gap-3 group">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <InlineRename
                    value={doc.filename}
                    onSave={(name) => renameDoc.mutateAsync({ id: doc.id, filename: name })}
                    className="text-sm font-medium text-slate-800 w-full"
                  />
                  <p className="text-xs text-slate-400">
                    {doc.year ? `${doc.year} · ` : ''}
                    {doc.category === 'k1' ? 'K-1' : doc.category === 'lp_agreement' ? 'LP Agreement' : doc.category === 'tax_form' ? 'Tax Form' : doc.category === 'correspondence' ? 'Correspondence' : 'Other'}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="p-1.5 rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <a
                  href={doc.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewDoc && (
        <DocPreviewModal
          doc={previewDoc}
          allDocs={propertyDocs ?? []}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </Layout>
  );
}
