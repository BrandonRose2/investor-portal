// FileDropZone — reusable drag-and-drop + click-to-browse file picker
// Supports selecting multiple files at once. Each file shows in a list with a remove button.
import { useRef, useState, useCallback, DragEvent } from "react";
import { Upload, FileText, X } from "lucide-react";

interface Props {
  accept?: string;       // e.g. ".pdf,.csv,.xlsx"
  maxBytes?: number;     // per-file limit, default 16 MB
  value: File[];
  onChange: (files: File[]) => void;
}

const DEFAULT_MAX = 16 * 1024 * 1024; // 16 MB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExt(name: string) {
  return "." + (name.split(".").pop()?.toLowerCase() ?? "");
}

export default function FileDropZone({
  accept = ".pdf,.csv,.xlsx,.xls,.doc,.docx",
  maxBytes = DEFAULT_MAX,
  value,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const allowed = accept.split(",").map((s) => s.trim().toLowerCase());

  function validateFile(file: File): string | null {
    if (file.size > maxBytes) return `"${file.name}" exceeds ${formatSize(maxBytes)}`;
    if (!allowed.includes(getExt(file.name))) return `"${file.name}" is not an allowed file type`;
    return null;
  }

  function mergeFiles(incoming: File[]) {
    const errs: string[] = [];
    const valid: File[] = [];
    for (const f of incoming) {
      const err = validateFile(f);
      if (err) errs.push(err);
      else valid.push(f);
    }
    setErrors(errs);
    if (valid.length === 0) return;
    // Deduplicate by name — keep the new version if re-added
    const existing = value.filter((v) => !valid.some((n) => n.name === v.name));
    onChange([...existing, ...valid]);
  }

  function removeFile(index: number) {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    if (next.length === 0) setErrors([]);
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
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) mergeFiles(files);
    },
    [value]
  );

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) mergeFiles(files);
    e.target.value = ""; // reset so same file can be re-added
  }

  const hasFiles = value.length > 0;

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "relative border-2 border-dashed rounded-lg px-5 py-4 text-center cursor-pointer transition-all duration-150 select-none",
          dragging
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : hasFiles
            ? "border-blue-300 bg-blue-50/30 hover:border-blue-400"
            : "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/30",
        ].join(" ")}
      >
        {dragging ? (
          <div className="flex flex-col items-center gap-1 py-1 pointer-events-none">
            <Upload className="w-7 h-7 text-blue-500 animate-bounce" />
            <p className="text-sm font-semibold text-blue-600">Drop files here</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-1 text-slate-400">
            <Upload className="w-6 h-6" />
            <p className="text-sm">
              <span className="font-medium text-blue-600">Click to browse</span>
              {" "}or drag & drop files here
            </p>
            <p className="text-xs text-slate-300">
              PDF, CSV, Excel, Word — max {formatSize(maxBytes)} each
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {/* Selected files list */}
      {hasFiles && (
        <ul className="space-y-1.5">
          {value.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
            >
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="shrink-0 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="space-y-0.5">
          {errors.map((err, i) => (
            <li key={i} className="text-xs text-red-600 flex items-start gap-1">
              <X className="w-3 h-3 mt-0.5 shrink-0" />
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
