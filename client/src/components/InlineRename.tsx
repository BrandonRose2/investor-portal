// InlineRename — pencil icon that expands into an editable input on click.
// Saves on Enter or blur; cancels on Escape.
import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  value: string;
  onSave: (newName: string) => Promise<void> | void;
  className?: string;
}

export default function InlineRename({ value, onSave, className = "" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync if parent value changes (e.g. after invalidation)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
  };

  if (editing) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={saving}
          className="flex-1 min-w-0 px-1.5 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 disabled:opacity-60"
          style={{ minWidth: "12rem" }}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
          disabled={saving}
          className="p-0.5 rounded text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
          title="Save"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
          disabled={saving}
          className="p-0.5 rounded text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-40"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 group/rename ${className}`}>
      <span className="truncate">{value}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className="opacity-0 group-hover/rename:opacity-100 p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
        title="Rename"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </span>
  );
}
