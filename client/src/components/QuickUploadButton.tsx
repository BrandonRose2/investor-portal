// QuickUploadButton — reusable inline document upload for detail pages
// Renders a compact "Attach Document" button that opens a mini upload dialog.
// Supports selecting and uploading multiple files simultaneously.
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

export default function QuickUploadButton({ propertyId, investorId, onUploaded }: Props) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<Category>("other");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const uploadDoc = trpc.documents.upload.useMutation({
    onError: () => toast.error("One or more uploads failed — please try again"),
  });

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    setProgress({ done: 0, total: selectedFiles.length });
    let succeeded = 0;
    for (let idx = 0; idx < selectedFiles.length; idx++) {
      const file = selectedFiles[idx];
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          try {
            await uploadDoc.mutateAsync({
              propertyId: propertyId ?? null,
              investorId: investorId ?? null,
              filename: file.name,
              fileBase64: base64,
              mimeType: file.type || "application/octet-stream",
              sizeBytes: file.size,
              category,
              year: year ? parseInt(year) : null,
            });
            succeeded++;
          } catch {
            // individual error toasted by onError
          }
          setProgress({ done: idx + 1, total: selectedFiles.length });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    utils.documents.list.invalidate();
    setProgress(null);
    setOpen(false);
    setSelectedFiles([]);
    setCategory("other");
    setYear(new Date().getFullYear().toString());
    if (succeeded > 0) {
      toast.success(`${succeeded} document${succeeded > 1 ? "s" : ""} attached`);
      onUploaded?.();
    }
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
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Files *</label>
              <FileDropZone value={selectedFiles} onChange={setSelectedFiles} />
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
                {selectedFiles.length > 1 ? "These documents" : "This document"} will be automatically linked to{" "}
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
            <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || progress !== null}>
              {progress !== null ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />{progress.done}/{progress.total}</>
              ) : (
                <><Upload className="w-4 h-4 mr-1.5" />Upload{selectedFiles.length > 1 ? ` ${selectedFiles.length} files` : ""}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
