// FileDropZone — reusable drag-and-drop + click-to-browse file picker
// Handles dragenter / dragover / dragleave / drop events and shows visual feedback.
import { useRef, useState, useCallback, DragEvent } from "react";
import { Upload, FileText, X } from "lucide-react";

interface Props {
  accept?: string;          // e.g. ".pdf,.csv,.xlsx"
  maxBytes?: number;        // default 16 MB
  value: File | null;
  onChange: (file: File | null) => void;
}

const DEFAULT_MAX = 16 * 1024 * 1024; // 16 MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileDropZone({ accept = ".pdf,.csv,.xlsx,.xls,.doc,.docx", maxBytes = DEFAULT_MAX, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (file.size > maxBytes) return `File is too large (max ${formatSize(maxBytes)})`;
    // Check extension against accept list
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const allowed = accept.split(",").map((s) => s.trim().toLowerCase());
    if (!allowed.includes(ext)) return `File type not allowed. Accepted: ${accept}`;
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    onChange(file);
  }

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const onDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear when leaving the zone itself, not a child element
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  }, []);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so the same file can be re-selected after clearing
    e.target.value = "";
  }

  return (
    <div className="space-y-1.5">
      <div
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "relative border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-150 select-none",
          dragging
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : value
            ? "border-blue-300 bg-blue-50/40 hover:border-blue-400"
            : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30",
        ].join(" ")}
      >
        {value ? (
          /* File selected state */
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-slate-800 truncate">{value.name}</p>
                <p className="text-xs text-slate-400">{formatSize(value.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); setError(null); }}
              className="shrink-0 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : dragging ? (
          /* Drag-over state */
          <div className="flex flex-col items-center gap-1 py-1 pointer-events-none">
            <Upload className="w-7 h-7 text-blue-500 animate-bounce" />
            <p className="text-sm font-semibold text-blue-600">Drop to attach</p>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-1 py-1 text-slate-400">
            <Upload className="w-6 h-6" />
            <p className="text-sm">
              <span className="font-medium text-blue-600">Click to browse</span>
              {" "}or drag & drop a file here
            </p>
            <p className="text-xs text-slate-300">PDF, CSV, Excel, Word — max {formatSize(maxBytes)}</p>
          </div>
        )}

        {/* Invisible native input */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {/* Validation error */}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <X className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
