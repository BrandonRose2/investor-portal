// Investor detail page — fetches from tRPC by numeric ID
// Includes: status badge, notes timeline, financial summary, properties table
import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, Building2, Users, Mail, ChevronRight, Loader2,
  FileText, Clock, Plus, Trash2, DollarSign, TrendingUp, Download, Eye
} from "lucide-react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import QuickUploadButton from "@/components/QuickUploadButton";
import DocPreviewModal, { type PreviewDoc } from "@/components/DocPreviewModal";
import InlineRename from "@/components/InlineRename";

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
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:      { label: "Active",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  deceased:    { label: "Deceased",    cls: "bg-slate-100 text-slate-500 border-slate-200" },
  transferred: { label: "Transferred", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  bought_out:  { label: "Bought Out",  cls: "bg-red-50 text-red-700 border-red-200" },
};

export default function InvestorDetail() {
  const { id } = useParams<{ id: string }>();
  const investorId = parseInt(id ?? "0", 10);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const utils = trpc.useUtils();
  const [noteContent, setNoteContent] = useState("");
  const [previewDoc, setPreviewDoc] = useState<PreviewDoc | null>(null);
  const renameDoc = trpc.documents.rename.useMutation({
    onSuccess: () => utils.documents.list.invalidate({ investorId }),
  });

  const { data: investor, isLoading } = trpc.investors.getById.useQuery(
    { id: investorId },
    { enabled: !!investorId }
  );
  const { data: notes } = trpc.notes.list.useQuery(
    { investorId },
    { enabled: !!investorId }
  );
  const { data: financials } = trpc.investors.financialSummary.useQuery(
    { id: investorId },
    { enabled: !!investorId }
  );
  const { data: distributions } = trpc.distributions.list.useQuery(
    { investorId },
    { enabled: !!investorId }
  );
  const { data: investorDocs } = trpc.documents.list.useQuery(
    { investorId },
    { enabled: !!investorId }
  );

  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate({ investorId });
      setNoteContent("");
    },
  });

  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => utils.notes.list.invalidate({ investorId }),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading investor…
        </div>
      </Layout>
    );
  }

  if (!investor) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-700">Investor not found</h2>
          <Link href="/?tab=investors" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            ← Back to directory
          </Link>
        </div>
      </Layout>
    );
  }

  const c = avatarColor(investor.name);
  const badge = STATUS_BADGE[investor.status] ?? STATUS_BADGE.active;
  const totalPct = investor.properties.reduce(
    (s, p) => s + parseFloat(p.pctCapital ?? "0"),
    0
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Link
          href="/?tab=investors"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Directory
        </Link>

        {/* Header card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${c.bg} ${c.text}`}>
              {initials(investor.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{investor.name}</h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              {investor.email && (
                <a
                  href={`mailto:${investor.email}`}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 mt-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {investor.email}
                </a>
              )}
              {investor.phone && (
                <p className="text-xs text-slate-500 mt-1">{investor.phone}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Building2 className="w-4 h-4" />
                <span className="font-semibold text-slate-800">{investor.properties.length}</span>
                <span>{investor.properties.length === 1 ? "property" : "properties"}</span>
              </div>
              <QuickUploadButton
                investorId={investorId}
                onUploaded={() => utils.documents.list.invalidate({ investorId })}
              />
            </div>
          </div>
        </div>

        {/* Financial summary */}
        {financials && financials.totalDistributions > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Distributions</span>
              </div>
              <p className="text-xl font-bold text-slate-900">
                ${financials.totalDistributions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total % Capital</span>
              </div>
              <p className="text-xl font-bold" style={{ color: "#16a34a" }}>
                {totalPct.toFixed(4)}%
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Properties</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{investor.properties.length}</p>
            </div>
          </div>
        )}

        {/* Properties table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Properties with Ownership Interest</h2>
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
                    Property
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">
                    Entity
                  </th>
                  <th className="w-8 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {investor.properties.map((p, idx) => (
                  <tr key={p.propertyId} className={`${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} group`}>
                    <td className="px-5 py-3 text-right">
                      {p.pctCapital !== null ? (
                        <span className="font-mono text-base font-semibold" style={{ color: "#16a34a" }}>
                          {parseFloat(p.pctCapital ?? "0").toFixed(4)}%
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/property/${p.propertyId}`}
                        className="text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                      >
                        {p.propertyName}
                      </Link>
                      {p.piNotes && (
                        <p className="text-xs text-amber-600 mt-0.5">{p.piNotes}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-sm hidden sm:table-cell truncate max-w-xs">
                      {p.entityName}
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/property/${p.propertyId}`}>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribution history */}
        {distributions && distributions.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Distribution History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Year</th>
                    <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Property</th>
                    <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Type</th>
                    <th className="text-right px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {distributions.map((d, idx) => (
                    <tr key={d.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-5 py-3 font-mono text-slate-700">{d.year}</td>
                      <td className="px-5 py-3 text-slate-700">{d.propertyName ?? d.propertyId}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200">
                          {d.type === "k1" ? "K-1" : d.type === "return_of_capital" ? "Return of Capital" : d.type.charAt(0).toUpperCase() + d.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900">
                        ${parseFloat(d.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes timeline */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700">Notes Timeline</h2>
          </div>

          {/* Add note — only for logged-in users */}
          {user && (
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex gap-3">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={() => {
                    if (!noteContent.trim()) return;
                    createNote.mutate({ investorId, content: noteContent.trim() });
                  }}
                  disabled={!noteContent.trim() || createNote.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start"
                >
                  {createNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Notes list */}
          <div className="divide-y divide-slate-50">
            {!notes || notes.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No notes yet.</p>
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="px-5 py-4 flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700">
                        {note.authorName ?? "Admin"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => deleteNote.mutate({ id: note.id })}
                      className="shrink-0 p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Documents section */}
      {investorDocs && investorDocs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mt-6">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              Documents
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                {investorDocs.length}
              </span>
            </h2>
          </div>
          <div className="divide-y divide-slate-50">
            {investorDocs.map((doc) => (
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
          allDocs={investorDocs ?? []}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </Layout>
  );
}
