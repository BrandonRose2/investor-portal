// Documents page — upload and view PDF/CSV documents per investor or property
import { useState } from "react";
import { Link } from "wouter";
import {
  FileText, Upload, Trash2, Loader2, Search, Download,
  Building2, Users, Filter, Eye, X, ExternalLink, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FileDropZone from "@/components/FileDropZone";
import InlineRename from "@/components/InlineRename";

const CATEGORY_LABELS: Record<string, string> = {
  lp_agreement:     "LP Agreement",
  k1:               "K-1",
  tax_form:         "Tax Form",
  correspondence:   "Correspondence",
  other:            "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  lp_agreement:   "bg-blue-50 text-blue-700 border-blue-200",
  k1:             "bg-emerald-50 text-emerald-700 border-emerald-200",
  tax_form:       "bg-violet-50 text-violet-700 border-violet-200",
  correspondence: "bg-amber-50 text-amber-700 border-amber-200",
  other:          "bg-slate-100 text-slate-600 border-slate-200",
};

type Category = "lp_agreement" | "k1" | "tax_form" | "correspondence" | "other";

type DocItem = {
  id: number;
  filename: string;
  storageUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  category: string;
  year: number | null;
  createdAt: Date;
  propertyId: string | null;
  investorId: number | null;
  propertyName?: string | null;
  investorName?: string | null;
};

// ─── PDF Preview Modal ────────────────────────────────────────────────────────

function PreviewModal({
  doc,
  allDocs,
  onClose,
}: {
  doc: DocItem;
  allDocs: DocItem[];
  onClose: () => void;
}) {
  const isPdf = doc.mimeType === "application/pdf" || doc.filename.toLowerCase().endsWith(".pdf");
  const currentIdx = allDocs.findIndex((d) => d.id === doc.id);
  const [activeIdx, setActiveIdx] = useState(currentIdx);
  const activeDoc = allDocs[activeIdx] ?? doc;
  const activePdf =
    activeDoc.mimeType === "application/pdf" ||
    activeDoc.filename.toLowerCase().endsWith(".pdf");

  const hasPrev = activeIdx > 0;
  const hasNext = activeIdx < allDocs.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/95 border-b border-slate-700 shrink-0">
        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{activeDoc.filename}</p>
          <p className="text-xs text-slate-400">
            {CATEGORY_LABELS[activeDoc.category] ?? activeDoc.category}
            {activeDoc.year ? ` · ${activeDoc.year}` : ""}
            {activeDoc.propertyName ? ` · ${activeDoc.propertyName}` : ""}
            {activeDoc.investorName ? ` · ${activeDoc.investorName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Prev / Next navigation */}
          <button
            onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
            disabled={!hasPrev}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous document"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 tabular-nums">
            {activeIdx + 1} / {allDocs.length}
          </span>
          <button
            onClick={() => setActiveIdx((i) => Math.min(allDocs.length - 1, i + 1))}
            disabled={!hasNext}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next document"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-700 mx-1" />
          <a
            href={activeDoc.storageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={activeDoc.storageUrl}
            download={activeDoc.filename}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden relative">
        {activePdf ? (
          <iframe
            key={activeDoc.id}
            src={`${activeDoc.storageUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full border-0"
            title={activeDoc.filename}
          />
        ) : (
          /* Non-PDF fallback */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <FileText className="w-16 h-16 opacity-30" />
            <p className="text-sm">Preview not available for this file type.</p>
            <a
              href={activeDoc.storageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Documents() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    propertyId: "",
    investorId: "",
    category: "other" as Category,
    year: new Date().getFullYear().toString(),
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocItem | null>(null);

  const { data: documents, isLoading } = trpc.documents.list.useQuery({});
  const { data: properties } = trpc.properties.list.useQuery({});
  const { data: investors } = trpc.investors.list.useQuery({});

  const uploadDoc = trpc.documents.upload.useMutation({
    onError: () => toast.error("One or more uploads failed"),
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Document deleted"); },
    onError: () => toast.error("Delete failed"),
  });

  const renameDoc = trpc.documents.rename.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Document renamed"); },
    onError: () => toast.error("Rename failed"),
  });

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    setUploadProgress({ done: 0, total: selectedFiles.length });
    let succeeded = 0;
    for (let idx = 0; idx < selectedFiles.length; idx++) {
      const file = selectedFiles[idx];
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          try {
            await uploadDoc.mutateAsync({
              propertyId: uploadForm.propertyId || null,
              investorId: uploadForm.investorId ? parseInt(uploadForm.investorId) : null,
              filename: file.name,
              fileBase64: base64,
              mimeType: file.type || "application/octet-stream",
              sizeBytes: file.size,
              category: uploadForm.category,
              year: uploadForm.year ? parseInt(uploadForm.year) : null,
            });
            succeeded++;
          } catch {
            // individual error already toasted by onError
          }
          setUploadProgress({ done: idx + 1, total: selectedFiles.length });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    utils.documents.list.invalidate();
    setUploadProgress(null);
    setUploadOpen(false);
    setSelectedFiles([]);
    setUploadForm({ propertyId: "", investorId: "", category: "other", year: new Date().getFullYear().toString() });
    if (succeeded > 0) toast.success(`${succeeded} document${succeeded > 1 ? "s" : ""} uploaded`);
  }

  const filtered = (documents ?? []).filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.filename.toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || d.category === filterCategory;
    return matchSearch && matchCat;
  }) as DocItem[];

  function formatSize(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const isPdf = (doc: DocItem) =>
    doc.mimeType === "application/pdf" || doc.filename.toLowerCase().endsWith(".pdf");

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
            <p className="text-base text-slate-500 mt-1">
              LP agreements, K-1s, tax forms, and correspondence
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Documents list */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading documents…
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <FileText className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">
                {documents?.length === 0 ? "No documents uploaded yet." : "No documents match your search."}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">File</th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">Category</th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden md:table-cell">Linked To</th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">Year</th>
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden md:table-cell">Size</th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">Uploaded</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((doc, idx) => {
                  const catCls = CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.other;
                  const catLabel = CATEGORY_LABELS[doc.category] ?? doc.category;
                  const canPreview = isPdf(doc);
                  return (
                    <tr key={doc.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <InlineRename
                            value={doc.filename}
                            onSave={(name) => renameDoc.mutateAsync({ id: doc.id, filename: name })}
                            className="font-medium text-slate-900 text-sm max-w-xs"
                          />
                          {canPreview && (
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="shrink-0 p-0.5 rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${catCls}`}>
                          {catLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {doc.propertyId && (
                            <Link href={`/property/${doc.propertyId}`} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                              <Building2 className="w-3 h-3" />
                              {(doc as any).propertyName ?? doc.propertyId}
                            </Link>
                          )}
                          {doc.investorId && (
                            <Link href={`/investor/${doc.investorId}`} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                              <Users className="w-3 h-3" />
                              {(doc as any).investorName ?? `Investor #${doc.investorId}`}
                            </Link>
                          )}
                          {!doc.propertyId && !doc.investorId && (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell font-mono text-slate-600 text-xs">
                        {doc.year ?? "—"}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-right font-mono text-slate-500 text-xs">
                        {formatSize(doc.sizeBytes)}
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-xs text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Preview button — only for PDFs */}
                          {canPreview && (
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <a
                            href={doc.storageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          {isAdmin && (
                            <button
                              onClick={() => setConfirmDelete(doc.id)}
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── PDF Preview Modal ── */}
      {previewDoc && (
        <PreviewModal
          doc={previewDoc}
          allDocs={filtered}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(v) => { if (!v && uploadProgress === null) { setUploadOpen(false); setSelectedFiles([]); setUploadForm({ propertyId: "", investorId: "", category: "other", year: new Date().getFullYear().toString() }); } }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-slate-900">Upload Document</DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">Attach files to a property or investor record</p>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            <FileDropZone value={selectedFiles} onChange={setSelectedFiles} />

            {/* Category + Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  Category
                </label>
                <div className="relative">
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as Category })}
                    className="w-full appearance-none px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8 cursor-pointer"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Tax Year
                </label>
                <input
                  type="number"
                  value={uploadForm.year}
                  onChange={(e) => setUploadForm({ ...uploadForm, year: e.target.value })}
                  placeholder="e.g. 2023"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Link to property + investor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  Property
                </label>
                <div className="relative">
                  <select
                    value={uploadForm.propertyId}
                    onChange={(e) => setUploadForm({ ...uploadForm, propertyId: e.target.value })}
                    className="w-full appearance-none px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8 cursor-pointer"
                  >
                    <option value="">— None —</option>
                    {(properties ?? []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Investor
                </label>
                <div className="relative">
                  <select
                    value={uploadForm.investorId}
                    onChange={(e) => setUploadForm({ ...uploadForm, investorId: e.target.value })}
                    className="w-full appearance-none px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8 cursor-pointer"
                  >
                    <option value="">— None —</option>
                    {(investors ?? []).map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {selectedFiles.length === 0 ? "No files selected" : selectedFiles.length === 1 ? "1 file ready" : `${selectedFiles.length} files ready`}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setUploadOpen(false)} disabled={uploadProgress !== null}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploadProgress !== null}
                className="min-w-[100px]"
              >
                {uploadProgress !== null ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1" />{uploadProgress.done}/{uploadProgress.total}</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1" />Upload{selectedFiles.length > 1 ? ` ${selectedFiles.length}` : ""}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      {confirmDelete !== null && (
        <Dialog open={true} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Document?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 py-2">This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => { deleteDoc.mutate({ id: confirmDelete }); setConfirmDelete(null); }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
