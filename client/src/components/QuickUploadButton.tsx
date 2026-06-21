// QuickUploadButton — reusable inline document upload for detail pages
// Renders a compact "Attach Document" button that opens a mini upload dialog.
// Pass either propertyId or investorId (or both) to pre-fill the link.
import { useState } from "react";
import { Upload, Loader2, Paperclip } from "lucide-react";
import FileDropZone from "@/components/FileDropZone";
import { trpc } from "@/lib/trpc";
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
  lp_agreement:   "LP Agreement",
  k1:             "K-1",
  tax_form:       "Tax Form",
  correspondence: "Correspondence",
  other:          "Other",
};

type Category = "lp_agreement" | "k1" | "tax_form" | "correspondence" | "other";

interface Props {
  propertyId?: string;
  investorId?: number;
  /** Called after a successful upload so the parent can refresh its documents list */
  onUploaded?: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QuickUploadButton({ propertyId, investorId, onUploaded }: Props) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Category>("other");
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const uploadDoc = trpc.documents.upload.useMutation({
    onSuccess: () => {
      // Invalidate both the global list and any filtered queries
      utils.documents.list.invalidate();
      setOpen(false);
      setSelectedFile(null);
      setCategory("other");
      setYear(new Date().getFullYear().toString());
      toast.success("Document attached");
      onUploaded?.();
    },
    onError: () => toast.error("Upload failed — please try again"),
  });

  function handleUpload() {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      uploadDoc.mutate({
        propertyId: propertyId ?? null,
        investorId: investorId ?? null,
        filename: selectedFile.name,
        fileBase64: base64,
        mimeType: selectedFile.type || "application/octet-stream",
        sizeBytes: selectedFile.size,
        category,
        year: year ? parseInt(year) : null,
      });
    };
    reader.readAsDataURL(selectedFile);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
      >
        <Paperclip className="w-3.5 h-3.5" />
        Attach Document
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attach Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* File picker */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">File *</label>
              <FileDropZone value={selectedFile} onChange={setSelectedFile} />
            </div>

            {/* Category + Year side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Year</label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2023"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Context hint */}
            {(propertyId || investorId) && (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                This document will be automatically linked to{" "}
                {propertyId && investorId
                  ? "this property and investor"
                  : propertyId
                  ? "this property"
                  : "this investor"}
                .
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadDoc.isPending}>
              {uploadDoc.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Upload className="w-4 h-4 mr-1.5" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
