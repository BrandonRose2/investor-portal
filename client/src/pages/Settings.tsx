// Settings page — PIN-protected admin panel (PIN: 3060)
// Allows editing, adding, and deleting properties and their investors
import { useState, useRef } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Lock,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  LogOut,
  RotateCcw,
  Users,
  Building2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { Property, Investor } from "@/lib/investorData";

// ── PIN Lock Screen ────────────────────────────────────────────────────────────
function PinLock() {
  const { login, authError } = useAdmin();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  function handleDigit(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 3) refs[idx + 1].current?.focus();
    if (val && idx === 3) {
      const pin = [...next.slice(0, 3), val].join("");
      if (!login(pin)) {
        setDigits(["", "", "", ""]);
        refs[0].current?.focus();
      }
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  }

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Admin Access</h2>
          <p className="text-sm text-slate-500 mb-7">Enter your 4-digit PIN to continue</p>

          <div className="flex justify-center gap-3 mb-6">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-slate-50"
                autoFocus={i === 0}
              />
            ))}
          </div>

          {authError && (
            <p className="text-sm text-red-500 font-medium">{authError}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ── Blank property template ────────────────────────────────────────────────────
function blankProperty(): Property {
  return {
    id: `prop-${Date.now()}`,
    name: "",
    entity_name: "",
    entity_ein: "",
    investors: [],
  };
}

function blankInvestor(): Investor {
  return { name: "", pct_capital: null, email: "" };
}

// ── Property Form Dialog ───────────────────────────────────────────────────────
interface PropertyFormProps {
  initial: Property;
  onSave: (p: Property) => void;
  onClose: () => void;
  title: string;
}

function PropertyForm({ initial, onSave, onClose, title }: PropertyFormProps) {
  const [form, setForm] = useState<Property>({ ...initial });

  function set(field: keyof Property, val: unknown) {
    setForm((f: Property) => ({ ...f, [field]: val }));
  }

  function save() {
    if (!form.name.trim()) { toast.error("Property name is required"); return; }
    if (!form.entity_name.trim()) { toast.error("Entity name is required"); return; }
    onSave(form);
    toast.success("Property saved");
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Property Name *</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Arbor Crest" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Entity Name *</label>
            <Input value={form.entity_name} onChange={(e) => set("entity_name", e.target.value)} placeholder="e.g. Arbor Crest Housing, LP" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">EIN</label>
            <Input value={form.entity_ein} onChange={(e) => set("entity_ein", e.target.value)} placeholder="e.g. 82-3335281" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_mt"
              checked={!!form.isGrovePark}
              onChange={(e) => set("isGrovePark", e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is_mt" className="text-sm text-slate-700">MT Structure (Grove Park)</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save Property</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Investor Form Dialog ───────────────────────────────────────────────────────
interface InvestorFormProps {
  initial: Investor;
  onSave: (inv: Investor) => void;
  onClose: () => void;
  title: string;
}

function InvestorForm({ initial, onSave, onClose, title }: InvestorFormProps) {
  const [form, setForm] = useState<Investor>({ ...initial });

  function set(field: keyof Investor, val: unknown) {
    setForm((f: Investor) => ({ ...f, [field]: val }));
  }

  function save() {
    if (!form.name.trim()) { toast.error("Investor name is required"); return; }
    onSave(form);
    toast.success("Investor saved");
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Entity / Investor Name *</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Marc Menowitz" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">% Capital</label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              max="100"
              value={form.pct_capital ?? ""}
              onChange={(e) => set("pct_capital", e.target.value === "" ? null : parseFloat(e.target.value))}
              placeholder="e.g. 25.0000"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="investor@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Note <span className="text-slate-400 font-normal">(shown next to name)</span></label>
            <Input value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Add a note..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save Investor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Property Row ───────────────────────────────────────────────────────────────
interface PropertyRowProps {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
  onAddInvestor: () => void;
  onEditInvestor: (idx: number) => void;
  onDeleteInvestor: (idx: number) => void;
}

function PropertyRow({ property, onEdit, onDelete, onAddInvestor, onEditInvestor, onDeleteInvestor }: PropertyRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleteInvIdx, setDeleteInvIdx] = useState<number | null>(null);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Property header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">{property.name}</span>
            {property.isGrovePark && <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">MT</Badge>}
          </div>
          <p className="text-xs text-slate-500 truncate">{property.entity_name} · EIN {property.entity_ein || "—"}</p>
        </div>
        <span className="text-xs text-slate-400 mr-2">
          <Users className="w-3.5 h-3.5 inline mr-1" />{property.investors.length}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-500 hover:text-blue-600" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-500 hover:text-red-500" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Investor list */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50">
          {property.investors.length === 0 ? (
            <p className="text-xs text-slate-400 px-10 py-3">No investors yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-10 py-2 font-medium text-slate-500">% Capital</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Entity (Owner)</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Note</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Email</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {property.investors.map((inv: Investor, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                    <td className="px-10 py-2 font-mono text-slate-600">
                      {inv.pct_capital !== null ? `${inv.pct_capital.toFixed(4)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-800 font-medium">{inv.name}</td>
                    <td className="px-3 py-2 text-slate-500 italic">{inv.notes || <span className="text-slate-300 not-italic">—</span>}</td>
                    <td className="px-3 py-2 text-slate-500">{inv.email || "—"}</td>
                    <td className="px-2 py-1">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-slate-400 hover:text-blue-600" onClick={() => onEditInvestor(idx)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-1.5 text-slate-400 hover:text-red-500" onClick={() => setDeleteInvIdx(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-10 py-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onAddInvestor}>
              <Plus className="w-3 h-3" /> Add Investor
            </Button>
          </div>
        </div>
      )}

      {/* Delete investor confirm */}
      {deleteInvIdx !== null && (
        <AlertDialog open onOpenChange={() => setDeleteInvIdx(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Investor?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <strong>{property.investors[deleteInvIdx]?.name}</strong> from {property.name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { onDeleteInvestor(deleteInvIdx); setDeleteInvIdx(null); }}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ── Main Settings Page ─────────────────────────────────────────────────────────
export default function Settings() {
  const {
    isAuthed, logout, properties,
    addProperty, updateProperty, deleteProperty,
    addInvestor, updateInvestor, deleteInvestor,
    resetToSeed,
  } = useAdmin();

  const [tab, setTab] = useState<"investors" | "properties">("investors");
  const [search, setSearch] = useState("");
  const [addPropOpen, setAddPropOpen] = useState(false);
  const [editProp, setEditProp] = useState<Property | null>(null);
  const [deletePropId, setDeletePropId] = useState<string | null>(null);
  const [addInvPropId, setAddInvPropId] = useState<string | null>(null);
  const [editInv, setEditInv] = useState<{ propId: string; idx: number; inv: Investor } | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [deleteInvGlobal, setDeleteInvGlobal] = useState<{ propId: string; idx: number; name: string } | null>(null);

  if (!isAuthed) return <PinLock />;

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.entity_name.toLowerCase().includes(q) ||
      p.entity_ein.includes(q) ||
      p.investors.some((i) => i.name.toLowerCase().includes(q))
    );
  });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin Settings</h1>
              <p className="text-xs text-slate-500">Edit properties and investor data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-slate-500 gap-1.5 text-xs"
              onClick={() => setResetConfirm(true)}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Original
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-slate-500 gap-1.5 text-xs"
              onClick={logout}
            >
              <LogOut className="w-3.5 h-3.5" /> Lock
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-blue-600 font-medium">Properties</p>
              <p className="text-xl font-bold text-blue-700">{properties.length}</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Investors</p>
              <p className="text-xl font-bold text-slate-700">
                {properties.reduce((s, p) => s + p.investors.length, 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 mb-5 border-b border-slate-200">
          {(["investors", "properties"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(""); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors duration-100
                ${tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
            >
              {t === "investors" ? <Users className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500 font-mono">
                {t === "investors" ? properties.reduce((s, p) => s + p.investors.length, 0) : properties.length}
              </span>
            </button>
          ))}
        </div>

        {/* Search + action toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 text-sm"
              placeholder={tab === "investors" ? "Search investors..." : "Search properties..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tab === "properties" && (
            <Button className="gap-1.5 text-sm" onClick={() => setAddPropOpen(true)}>
              <Plus className="w-4 h-4" /> Add Property
            </Button>
          )}
        </div>

        {/* Investors tab — flat list of all investors across all properties */}
        {tab === "investors" && (() => {
          const q = search.toLowerCase();
          const rows: { propId: string; propName: string; idx: number; inv: Investor }[] = [];
          properties.forEach((p) => p.investors.forEach((inv, idx) => rows.push({ propId: p.id, propName: p.name, idx, inv })));
          const filtered2 = rows.filter(r => !q || r.inv.name.toLowerCase().includes(q) || r.propName.toLowerCase().includes(q));
          return (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {filtered2.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No investors match your search.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Entity (Owner)</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Property</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600">% Capital</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Note</th>
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered2.map((r, i) => (
                      <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-blue-50/30 transition-colors`}>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{r.inv.name}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{r.propName}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{color:'#16a34a'}}>
                          {r.inv.pct_capital !== null ? `${r.inv.pct_capital.toFixed(4)}%` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 italic text-xs">{r.inv.notes || "—"}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-blue-600"
                              onClick={() => setEditInv({ propId: r.propId, idx: r.idx, inv: r.inv })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-slate-400 hover:text-red-500"
                              onClick={() => setDeleteInvGlobal({ propId: r.propId, idx: r.idx, name: r.inv.name })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}

        {/* Properties tab */}
        {tab === "properties" && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">No properties match your search.</p>
            )}
            {filtered.map((prop) => (
              <PropertyRow
                key={prop.id}
                property={prop}
                onEdit={() => setEditProp(prop)}
                onDelete={() => setDeletePropId(prop.id)}
                onAddInvestor={() => setAddInvPropId(prop.id)}
                onEditInvestor={(idx) => setEditInv({ propId: prop.id, idx, inv: prop.investors[idx] })}
                onDeleteInvestor={(idx) => deleteInvestor(prop.id, idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Property */}
      {addPropOpen && (
        <PropertyForm
          initial={blankProperty()}
          title="Add Property"
          onSave={(p) => addProperty(p)}
          onClose={() => setAddPropOpen(false)}
        />
      )}

      {/* Edit Property */}
      {editProp && (
        <PropertyForm
          initial={editProp}
          title="Edit Property"
          onSave={(p) => updateProperty(editProp.id, p)}
          onClose={() => setEditProp(null)}
        />
      )}

      {/* Delete Property confirm */}
      {deletePropId && (
        <AlertDialog open onOpenChange={() => setDeletePropId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Property?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{properties.find((p) => p.id === deletePropId)?.name}</strong> and all its investor records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { deleteProperty(deletePropId); setDeletePropId(null); toast.success("Property deleted"); }}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Add Investor */}
      {addInvPropId && (
        <InvestorForm
          initial={blankInvestor()}
          title={`Add Investor — ${properties.find((p) => p.id === addInvPropId)?.name}`}
          onSave={(inv) => addInvestor(addInvPropId, inv)}
          onClose={() => setAddInvPropId(null)}
        />
      )}

      {/* Edit Investor */}
      {editInv && (
        <InvestorForm
          initial={editInv.inv}
          title="Edit Investor"
          onSave={(inv) => updateInvestor(editInv.propId, editInv.idx, inv)}
          onClose={() => setEditInv(null)}
        />
      )}

      {/* Reset confirm */}
      {/* Delete Investor (from global investors tab) */}
      {deleteInvGlobal && (
        <AlertDialog open onOpenChange={() => setDeleteInvGlobal(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Investor?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove <strong>{deleteInvGlobal.name}</strong> from this property? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { deleteInvestor(deleteInvGlobal.propId, deleteInvGlobal.idx); setDeleteInvGlobal(null); toast.success("Investor removed"); }}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {resetConfirm && (
        <AlertDialog open onOpenChange={() => setResetConfirm(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to Original Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will discard all edits and restore the original investor data from the spreadsheet. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { resetToSeed(); setResetConfirm(false); toast.success("Data reset to original"); }}>
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Layout>
  );
}
