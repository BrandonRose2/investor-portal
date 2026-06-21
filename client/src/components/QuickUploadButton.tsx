// QuickUploadButton — reusable inline document upload for detail pages
// Renders a compact "Attach Document" button that opens a polished upload dialog.
// Supports selecting and uploading multiple files simultaneously.
import { useState } from "react";
import { Upload, Loader2, Paperclip, Tag, Calendar } from "lucide-react";
import FileDropZone from "@/components/FileDropZone";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

  function handleClose() {
    if (progress !== null) return; // don't close mid-upload
    setOpen(false);
    setSelectedFiles([]);
    setCategory("other");
    setYear(new Date().getFullYear().toString());
  }

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

  const contextLabel =
    propertyId && investorId
      ? "this property & investor"
      : propertyId
      ? "this property"
      : investorId
      ? "this investor"
      : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
      >
        <Paperclip className="w-3.5 h-3.5" />
        Attach Document
      </button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-xl">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-slate-900">
                Attach Document
              </DialogTitle>
              {contextLabel && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Files will be linked to {contextLabel}
                </p>
              )}
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Drop zone */}
            <FileDropZone value={selectedFiles} onChange={setSelectedFiles} />

            {/* Metadata row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <Tag className="w-3.5 h-3.5" />
                  Category
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full appearance-none px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8 cursor-pointer"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Tax Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2023"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {selectedFiles.length === 0
                ? "No files selected"
                : selectedFiles.length === 1
                ? "1 file ready"
                : `${selectedFiles.length} files ready`}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={progress !== null}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || progress !== null}
                className="min-w-[100px]"
              >
                {progress !== null ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />{progress.done}/{progress.total}</>
                ) : (
                  <><Upload className="w-4 h-4 mr-1.5" />Upload{selectedFiles.length > 1 ? ` ${selectedFiles.length}` : ""}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
