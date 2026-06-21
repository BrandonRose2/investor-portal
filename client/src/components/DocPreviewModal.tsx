// DocPreviewModal — shared full-screen PDF/document preview modal
// Used on the Documents page and on property/investor detail pages.
import { useState } from "react";
import {
  FileText, Download, ExternalLink, X, ChevronLeft, ChevronRight,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  lp_agreement:   "LP Agreement",
  k1:             "K-1",
  tax_form:       "Tax Form",
  correspondence: "Correspondence",
  other:          "Other",
};

export type PreviewDoc = {
  id: number;
  filename: string;
  storageUrl: string;
  mimeType: string | null;
  category: string;
  year: number | null;
  propertyName?: string | null;
  investorName?: string | null;
};

interface Props {
  doc: PreviewDoc;
  /** All docs in the current list — enables prev/next navigation */
  allDocs: PreviewDoc[];
  onClose: () => void;
}

export default function DocPreviewModal({ doc, allDocs, onClose }: Props) {
  const startIdx = allDocs.findIndex((d) => d.id === doc.id);
  const [activeIdx, setActiveIdx] = useState(startIdx >= 0 ? startIdx : 0);
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
          {allDocs.length > 1 && (
            <>
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
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-700 mx-1" />
            </>
          )}
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
