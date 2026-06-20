// Documents page — upload and view PDF/CSV documents per investor or property
import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  FileText, Upload, Trash2, Loader2, Search, Download,
  Building2, Users, ChevronDown, ChevronRight, Filter
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: documents, isLoading } = trpc.documents.list.useQuery({});
  const { data: properties } = trpc.properties.list.useQuery({});
  const { data: investors } = trpc.investors.list.useQuery({});

  const uploadDoc = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      setUploadOpen(false);
      setSelectedFile(null);
      setUploadForm({ propertyId: "", investorId: "", category: "other", year: new Date().getFullYear().toString() });
      toast.success("Document uploaded");
    },
    onError: () => toast.error("Upload failed"),
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Document deleted"); },
    onError: () => toast.error("Delete failed"),
  });

  async function handleUpload() {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      uploadDoc.mutate({
        propertyId: uploadForm.propertyId || null,
        investorId: uploadForm.investorId ? parseInt(uploadForm.investorId) : null,
        filename: selectedFile.name,
        fileBase64: base64,
        mimeType: selectedFile.type || "application/octet-stream",
        sizeBytes: selectedFile.size,
        category: uploadForm.category,
        year: uploadForm.year ? parseInt(uploadForm.year) : null,
      });
    };
    reader.readAsDataURL(selectedFile);
  }

  const filtered = (documents ?? []).filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.filename.toLowerCase().includes(q);
    const matchCat = filterCategory === "all" || d.category === filterCategory;
    return matchSearch && matchCat;
  });

  function formatSize(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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
                  return (
                    <tr key={doc.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                          <a
                            href={doc.storageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-slate-900 hover:text-blue-600 transition-colors truncate max-w-xs"
                          >
                            {doc.filename}
                          </a>
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

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* File picker */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">File *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-slate-400">({formatSize(selectedFile.size)})</span>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <Upload className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-sm">Click to select a PDF or CSV file</p>
                    <p className="text-xs mt-0.5">Max 16 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xlsx,.xls,.doc,.docx"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Category *</label>
              <select
                value={uploadForm.category}
                onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as Category })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Year</label>
              <Input
                type="number"
                value={uploadForm.year}
                onChange={(e) => setUploadForm({ ...uploadForm, year: e.target.value })}
                placeholder="e.g. 2023"
              />
            </div>

            {/* Link to property */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Link to Property (optional)</label>
              <select
                value={uploadForm.propertyId}
                onChange={(e) => setUploadForm({ ...uploadForm, propertyId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {(properties ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Link to investor */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Link to Investor (optional)</label>
              <select
                value={uploadForm.investorId}
                onChange={(e) => setUploadForm({ ...uploadForm, investorId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {(investors ?? []).map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadDoc.isPending}
            >
              {uploadDoc.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload
            </Button>
          </DialogFooter>
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
