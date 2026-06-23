// Admin Settings page — PIN-gated, tRPC-backed
// Investors tab (default): grouped view, expandable rows, status management
// Properties tab: property list with investor counts
import { useState, useRef, useMemo } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users,
  Building2,
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  FileText,
  GitMerge,
  AlertTriangle,
  Crown,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const ADMIN_PIN = "3060";

const STATUS_OPTIONS = [
  { value: "active",      label: "Active",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "deceased",    label: "Deceased",    cls: "bg-slate-100 text-slate-500 border-slate-200" },
  { value: "transferred", label: "Transferred", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "bought_out",  label: "Bought Out",  cls: "bg-red-50 text-red-700 border-red-200" },
];

type SortDir = "asc" | "desc" | null;

// ── Reusable duplicate group card ─────────────────────────────────────────────
type DupeMemberCard = { id: number; name: string; email: string | null; status: string; propertyCount: number };
function DupeGroupCard({
  label, badge, badgeCls = "bg-amber-100 text-amber-700", members, onMerge, onDismiss,
}: {
  label: string;
  badge?: string;
  badgeCls?: string;
  members: DupeMemberCard[];
  onMerge: (members: DupeMemberCard[]) => void;
  onDismiss: (members: DupeMemberCard[]) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono font-bold text-slate-700 truncate">{label}</span>
          {badge && <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${badgeCls}`}>{badge}</span>}
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${badgeCls}`}>{members.length} records</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600" onClick={() => onDismiss(members)}>
            <EyeOff className="w-3.5 h-3.5 mr-1.5" />
            Dismiss
          </Button>
          <Button size="sm" variant="outline" onClick={() => onMerge(members)}>
            <GitMerge className="w-3.5 h-3.5 mr-1.5" />
            Merge…
          </Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
            <th className="text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
            <th className="text-right px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Properties</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, idx) => (
            <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 border border-blue-200 font-medium">
                      <Crown className="w-2.5 h-2.5" /> Primary
                    </span>
                  )}
                  <Link href={`/investor/${m.id}`} className="font-medium text-slate-800 hover:text-blue-600 hover:underline">
                    {m.name}
                  </Link>
                  <span className="text-xs text-slate-400 font-mono">#{m.id}</span>
                </div>
              </td>
              <td className="px-4 py-2.5 hidden sm:table-cell">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${
                  m.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  m.status === "deceased" ? "bg-slate-100 text-slate-500 border-slate-200" :
                  "bg-amber-50 text-amber-700 border-amber-200"
                }`}>{m.status}</span>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-slate-600">{Number(m.propertyCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── PIN Lock Screen ────────────────────────────────────────────────────────────
function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
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
      if (pin === ADMIN_PIN) {
        onUnlock();
      } else {
        setError(true);
        setDigits(["", "", "", ""]);
        setTimeout(() => setError(false), 1500);
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
          <h2 className="text-xl font-bold text-slate-900 mb-1">Admin Settings</h2>
          <p className="text-sm text-slate-500 mb-7">Enter your 4-digit PIN to continue</p>
          <div className="flex justify-center gap-3 mb-4">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                autoFocus={i === 0}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-colors
                  ${error ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-blue-500 bg-white"}`}
              />
            ))}
          </div>
          {error && <p className="text-sm text-red-500 mt-2">Incorrect PIN. Try again.</p>}
        </div>
      </div>
    </Layout>
  );
}

// ── Main Admin Panel ───────────────────────────────────────────────────────────
type AdminTab = "investors" | "properties" | "duplicates";

export default function Settings() {
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState<AdminTab>("investors");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [expandedInvestors, setExpandedInvestors] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const utils = trpc.useUtils();

  // Data
  const { data: investors, isLoading: invLoading } = trpc.investors.list.useQuery({});
  const { data: properties, isLoading: propLoading } = trpc.properties.list.useQuery({});
  const { data: duplicates, isLoading: dupLoading, refetch: refetchDupes } = trpc.investors.findDuplicates.useQuery(
    undefined,
    { enabled: tab === "duplicates" }
  );
  const { data: similarNames, isLoading: simLoading, refetch: refetchSim } = trpc.investors.findSimilarNames.useQuery(
    { threshold: 0.82 },
    { enabled: tab === "duplicates" }
  );
  const { data: dismissed, refetch: refetchDismissed } = trpc.investors.listDismissed.useQuery(
    undefined,
    { enabled: tab === "duplicates" }
  );

  // Mutations
  const updateStatus = trpc.investors.updateStatus.useMutation({
    onSuccess: () => { utils.investors.list.invalidate(); toast.success("Status updated"); },
    onError: () => toast.error("Failed to update status"),
  });
  const deleteInvestorMut = trpc.investors.delete.useMutation({
    onSuccess: () => { utils.investors.list.invalidate(); toast.success("Investor deleted"); },
    onError: () => toast.error("Failed to delete investor"),
  });
  const deletePropertyMut = trpc.properties.delete.useMutation({
    onSuccess: () => { utils.properties.list.invalidate(); toast.success("Property deleted"); },
    onError: () => toast.error("Failed to delete property"),
  });

  // Edit investor dialog
  const [editInv, setEditInv] = useState<{ id: number; name: string; email: string; phone: string; adminNotes: string } | null>(null);
  const updateInfo = trpc.investors.updateInfo.useMutation({
    onSuccess: () => { utils.investors.list.invalidate(); setEditInv(null); toast.success("Investor updated"); },
    onError: () => toast.error("Failed to update investor"),
  });

  // Add investor dialog
  const [addInvOpen, setAddInvOpen] = useState(false);
  const [newInv, setNewInv] = useState({ name: "", email: "", phone: "" });
  const createInvestor = trpc.investors.create.useMutation({
    onSuccess: () => { utils.investors.list.invalidate(); setAddInvOpen(false); setNewInv({ name: "", email: "", phone: "" }); toast.success("Investor added"); },
    onError: () => toast.error("Failed to add investor"),
  });

  // Edit property dialog
  const [editProp, setEditProp] = useState<{ id: string; name: string; entityName: string; entityEin: string } | null>(null);
  const updatePropertyMut = trpc.properties.update.useMutation({
    onSuccess: () => { utils.properties.list.invalidate(); setEditProp(null); toast.success("Property updated"); },
    onError: () => toast.error("Failed to update property"),
  });

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{ type: "investor" | "property"; id: number | string; name: string } | null>(null);

  // Merge dialog
  type DupeMember = { id: number; name: string; email: string | null; status: string; propertyCount: number };
  const [mergeDialog, setMergeDialog] = useState<{ label: string; members: DupeMember[]; targetId: number | null } | null>(null);
  const mergeMut = trpc.investors.merge.useMutation({
    onSuccess: () => {
      utils.investors.list.invalidate();
      refetchDupes();
      refetchSim();
      setMergeDialog(null);
      toast.success("Investors merged successfully");
    },
    onError: () => toast.error("Merge failed"),
  });

  // Dismiss / restore
  const dismissMut = trpc.investors.dismiss.useMutation({
    onSuccess: () => { refetchDupes(); refetchSim(); refetchDismissed(); toast.success("Group dismissed"); },
    onError: () => toast.error("Dismiss failed"),
  });
  const restoreMut = trpc.investors.restore.useMutation({
    onSuccess: () => { refetchDupes(); refetchSim(); refetchDismissed(); toast.success("Group restored"); },
    onError: () => toast.error("Restore failed"),
  });

  // CSV Import dialog
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const importCsv = trpc.distributions.importCsv.useMutation({
    onSuccess: (r) => { setCsvOpen(false); setCsvText(""); toast.success(`Imported ${r.imported} distributions`); },
    onError: () => toast.error("CSV import failed"),
  });

  // Sort + filter investors — must be above any early return (React hooks rules)
  const filteredInvestors = useMemo(() => {
    if (!investors) return [];
    let list = [...investors];
    const q = search.toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.email ?? "").toLowerCase().includes(q));
    if (sortDir === "asc") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortDir === "desc") list.sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [investors, search, sortDir]);

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    const q = search.toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) => p.name.toLowerCase().includes(q) || p.entityName.toLowerCase().includes(q) || (p.entityEin ?? "").includes(q)
    );
  }, [properties, search]);

  if (!unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />;

  function toggleSort() {
    setSortDir((d) => d === null ? "asc" : d === "asc" ? "desc" : null);
  }

  function toggleExpand(id: number) {
    setExpandedInvestors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleCsvImport() {
    const lines = csvText.trim().split("\n").slice(1); // skip header
    const rows: any[] = [];
    for (const line of lines) {
      const [propertyId, investorId, year, amount, type, notes] = line.split(",").map((s) => s.trim());
      if (!propertyId || !investorId || !year || !amount) continue;
      rows.push({
        propertyId,
        investorId: parseInt(investorId),
        year: parseInt(year),
        amount,
        type: (type || "k1") as any,
        notes: notes || null,
      });
    }
    if (rows.length === 0) { toast.error("No valid rows found in CSV"); return; }
    importCsv.mutate({ rows });
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Settings</h1>
              <p className="text-sm text-slate-500">Manage investors, properties, and distributions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === "investors" && (
              <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Import CSV
              </Button>
            )}
            {tab === "investors" && (
              <Button size="sm" onClick={() => setAddInvOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Investor
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setUnlocked(false)}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Lock
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-slate-200">
          <button
            onClick={() => { setTab("investors"); setSearch(""); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${tab === "investors" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
          >
            <Users className="w-3.5 h-3.5" />
            Investors
            <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500 font-mono">{investors?.length ?? 0}</span>
          </button>
          <button
            onClick={() => { setTab("properties"); setSearch(""); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${tab === "properties" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Properties
            <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500 font-mono">{properties?.length ?? 0}</span>
          </button>
          <button
            onClick={() => { setTab("duplicates"); setSearch(""); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors
              ${tab === "duplicates" ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            Duplicates
            {((duplicates?.length ?? 0) + (similarNames?.length ?? 0)) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-mono">
                {(duplicates?.length ?? 0) + (similarNames?.length ?? 0)}
              </span>
            )}
          </button>
        </div>

        {/* Search bar — hidden on duplicates tab */}
        {tab !== "duplicates" && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={tab === "investors" ? "Search investors…" : "Search properties…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* ── INVESTORS TAB ── */}
        {tab === "investors" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-8 px-3 py-2.5" />
                  <th className="text-left px-4 py-2.5">
                    <button
                      onClick={toggleSort}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide hover:text-blue-600 transition-colors"
                    >
                      Entity (Owner)
                      {sortDir === null && <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
                      {sortDir === "asc" && <ArrowUp className="w-3.5 h-3.5 text-blue-600" />}
                      {sortDir === "desc" && <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden lg:table-cell">Notes</th>
                  <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Props</th>
                  <th className="sticky right-0 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide text-right shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.07)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invLoading && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</td></tr>
                )}
                {!invLoading && filteredInvestors.map((inv) => {
                  const expanded = expandedInvestors.has(inv.id);
                  const badge = STATUS_OPTIONS.find((s) => s.value === inv.status) ?? STATUS_OPTIONS[0];
                  return (
                    <>
                      <tr key={inv.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-3">
                          <button onClick={() => toggleExpand(inv.id)} className="text-slate-400 hover:text-slate-600">
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/investor/${inv.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                            {inv.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell truncate max-w-xs">{inv.email ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell truncate max-w-xs">{inv.phone ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell max-w-[160px] truncate">
                          {inv.adminNotes ? (inv.adminNotes.length > 40 ? inv.adminNotes.slice(0, 40) + "…" : inv.adminNotes) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={inv.status}
                            onChange={(e) => updateStatus.mutate({ id: inv.id, status: e.target.value as any })}
                            className={`text-xs px-2 py-1 rounded border font-medium cursor-pointer ${badge.cls}`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{Number(inv.propertyCount)}</td>
                        <td className="sticky right-0 bg-white px-3 py-3 text-right shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.07)]">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditInv({ id: inv.id, name: inv.name, email: inv.email ?? "", phone: inv.phone ?? "", adminNotes: inv.adminNotes ?? "" })}
                              className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete({ type: "investor", id: inv.id, name: inv.name })}
                              className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${inv.id}-exp`} className="bg-blue-50/30">
                          <td colSpan={7} className="px-8 py-3">
                            <InvestorExpandedRow investorId={inv.id} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* ── PROPERTIES TAB ── */}
        {tab === "properties" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Property</th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">Entity</th>
                  <th className="text-center px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">EIN</th>
                  <th className="text-right px-5 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide">Investors</th>
                  <th className="px-3 py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {propLoading && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</td></tr>
                )}
                {!propLoading && filteredProperties.map((prop, idx) => (
                  <tr key={prop.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3">
                      <Link href={`/property/${prop.id}`} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                        {prop.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500 hidden sm:table-cell truncate max-w-xs">{prop.entityName}</td>
                    <td className="px-5 py-3 text-center hidden sm:table-cell">
                      <span className="font-mono font-bold text-blue-700 text-xs">EIN {prop.entityEin || "—"}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600">{Number(prop.investorCount)}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditProp({ id: prop.id, name: prop.name, entityName: prop.entityName ?? "", entityEin: prop.entityEin ?? "" })}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit property"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: "property", id: prop.id, name: prop.name })}
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── DUPLICATES TAB ── */}
        {tab === "duplicates" && (
          <div className="space-y-4">
            {/* Explainer banner */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <span className="font-semibold">Duplicate email scan</span> — these investors share the same email address.
                Many are intentional (separate legal entities for the same person). Review each group and merge only when the records truly represent the same investor.
                The <span className="font-semibold">Keep (primary)</span> record retains all property links from the merged records.
              </div>
            </div>

            {dupLoading && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Scanning for duplicates…
              </div>
            )}

            {!dupLoading && duplicates && duplicates.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Same Email Address
                  <span className="text-xs font-mono text-slate-400">({duplicates.length} group{duplicates.length !== 1 ? "s" : ""})</span>
                </h3>
                {duplicates.map((group) => (
                  <DupeGroupCard
                    key={group.email}
                    label={group.email}
                    members={group.members}
                    onMerge={(members) => setMergeDialog({ label: group.email, members, targetId: members[0]?.id ?? null })}
                    onDismiss={(members) => dismissMut.mutate({ memberIds: members.map((m) => m.id), label: group.email, scanType: "email" })}
                  />
                ))}
              </>
            )}

            {/* Similar Names section */}
            {(simLoading) && (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Scanning for similar names…
              </div>
            )}

            {!simLoading && similarNames && similarNames.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                  Similar Names
                  <span className="text-xs font-mono text-slate-400">({similarNames.length} group{similarNames.length !== 1 ? "s" : ""})</span>
                </h3>
                <div className="flex items-start gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-violet-800">
                    These investors have very similar names but different records. They may be the same person entered differently, or genuinely distinct entities. Review before merging.
                  </p>
                </div>
                {similarNames.map((group, i) => (
                  <DupeGroupCard
                    key={i}
                    label={group.reason}
                    badge={`${(group.score * 100).toFixed(0)}% match`}
                    badgeCls="bg-violet-100 text-violet-700"
                    members={group.members}
                    onMerge={(members) => setMergeDialog({ label: group.reason, members, targetId: members[0]?.id ?? null })}
                    onDismiss={(members) => dismissMut.mutate({ memberIds: members.map((m) => m.id), label: group.reason, scanType: "name" })}
                  />
                ))}
              </>
            )}

            {!dupLoading && !simLoading && (!duplicates || duplicates.length === 0) && (!similarNames || similarNames.length === 0) && (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <GitMerge className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">No duplicates found</p>
                <p className="text-xs mt-1">All investor records appear unique.</p>
              </div>
            )}

            {/* Dismissed groups */}
            {dismissed && dismissed.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-bold text-slate-500 flex items-center gap-2 mb-3">
                  <EyeOff className="w-3.5 h-3.5" />
                  Dismissed Groups
                  <span className="text-xs font-mono text-slate-400">({dismissed.length})</span>
                </h3>
                <div className="space-y-1.5">
                  {dismissed.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${
                          d.scanType === "email" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"
                        }`}>{d.scanType === "email" ? "Email" : "Name"}</span>
                        <span className="text-sm text-slate-600 truncate font-mono">{d.label}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-slate-700 shrink-0"
                        onClick={() => restoreMut.mutate({ id: d.id })}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Merge Investor Dialog */}
      <Dialog open={!!mergeDialog} onOpenChange={(o) => !o && setMergeDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-amber-600" />
              Merge Investors
            </DialogTitle>
          </DialogHeader>
          {mergeDialog && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-500 font-mono text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 truncate">{mergeDialog.label}</p>
              <p className="text-sm text-slate-600">
                Select the <span className="font-semibold">primary record</span> to keep. All property links, notes, distributions, and documents from the other records will be moved to it. The other records will be permanently deleted.
              </p>
              <div className="space-y-2">
                {mergeDialog.members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMergeDialog({ ...mergeDialog, targetId: m.id })}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      mergeDialog.targetId === m.id
                        ? "border-blue-400 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {mergeDialog.targetId === m.id && <Crown className="w-3.5 h-3.5 text-blue-600" />}
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-slate-400 font-mono">#{m.id}</span>
                    </div>
                    <span className="text-xs text-slate-500">{Number(m.propertyCount)} prop{Number(m.propertyCount) !== 1 ? "s" : ""}</span>
                  </button>
                ))}
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                <strong>This action is permanent.</strong> The non-primary records will be deleted after all their data is transferred.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!mergeDialog?.targetId || mergeMut.isPending}
              onClick={() => {
                if (!mergeDialog?.targetId) return;
                const sourceIds = mergeDialog.members.map((m) => m.id).filter((id) => id !== mergeDialog.targetId);
                mergeMut.mutate({ targetId: mergeDialog.targetId, sourceIds });
              }}
            >
              {mergeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <GitMerge className="w-4 h-4 mr-1" />}
              Merge & Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Investor Dialog */}
      <Dialog open={!!editInv} onOpenChange={(o) => !o && setEditInv(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Investor</DialogTitle>
          </DialogHeader>
          {editInv && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Name</label>
                <Input value={editInv.name} onChange={(e) => setEditInv({ ...editInv, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
                <Input value={editInv.email} onChange={(e) => setEditInv({ ...editInv, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Phone</label>
                <Input value={editInv.phone} onChange={(e) => setEditInv({ ...editInv, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Notes</label>
                <textarea
                  value={editInv.adminNotes}
                  onChange={(e) => setEditInv({ ...editInv, adminNotes: e.target.value })}
                  rows={3}
                  placeholder="Internal notes about this investor…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInv(null)}>Cancel</Button>
            <Button
              onClick={() => editInv && updateInfo.mutate({ id: editInv.id, name: editInv.name, email: editInv.email || null, phone: editInv.phone || null, adminNotes: editInv.adminNotes || null })}
              disabled={updateInfo.isPending}
            >
              {updateInfo.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={!!editProp} onOpenChange={(o) => !o && setEditProp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          {editProp && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Property Name</label>
                <Input value={editProp.name} onChange={(e) => setEditProp({ ...editProp, name: e.target.value })} placeholder="Property name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Entity Name</label>
                <Input value={editProp.entityName} onChange={(e) => setEditProp({ ...editProp, entityName: e.target.value })} placeholder="Entity LLC / LP name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">EIN</label>
                <Input value={editProp.entityEin} onChange={(e) => setEditProp({ ...editProp, entityEin: e.target.value })} placeholder="XX-XXXXXXX" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProp(null)}>Cancel</Button>
            <Button
              onClick={() => editProp && updatePropertyMut.mutate({ id: editProp.id, name: editProp.name, entityName: editProp.entityName, entityEin: editProp.entityEin || null })}
              disabled={!editProp?.name.trim() || updatePropertyMut.isPending}
            >
              {updatePropertyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Investor Dialog */}
      <Dialog open={addInvOpen} onOpenChange={setAddInvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Investor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Name *</label>
              <Input value={newInv.name} onChange={(e) => setNewInv({ ...newInv, name: e.target.value })} placeholder="Investor name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
              <Input value={newInv.email} onChange={(e) => setNewInv({ ...newInv, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Phone</label>
              <Input value={newInv.phone} onChange={(e) => setNewInv({ ...newInv, phone: e.target.value })} placeholder="(555) 000-0000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddInvOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createInvestor.mutate({ name: newInv.name, email: newInv.email || null, phone: newInv.phone || null })}
              disabled={!newInv.name.trim() || createInvestor.isPending}
            >
              {createInvestor.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Distributions (CSV)</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-slate-500 mb-2">
              Paste CSV with header row: <code className="bg-slate-100 px-1 rounded">property_id,investor_id,year,amount,type,notes</code>
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Types: <code className="bg-slate-100 px-1 rounded">k1</code>, <code className="bg-slate-100 px-1 rounded">cash</code>, <code className="bg-slate-100 px-1 rounded">return_of_capital</code>, <code className="bg-slate-100 px-1 rounded">other</code>
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              placeholder={"property_id,investor_id,year,amount,type,notes\ngrove-park,1,2023,5000.00,k1,Annual K-1"}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Cancel</Button>
            <Button onClick={handleCsvImport} disabled={!csvText.trim() || importCsv.isPending}>
              {importCsv.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.type === "investor" ? "Investor" : "Property"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{confirmDelete?.name}</strong> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (!confirmDelete) return;
                if (confirmDelete.type === "investor") {
                  deleteInvestorMut.mutate({ id: confirmDelete.id as number });
                } else {
                  deletePropertyMut.mutate({ id: confirmDelete.id as string });
                }
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

// ── Expanded investor row: shows all properties with % Capital ─────────────────
function InvestorExpandedRow({ investorId }: { investorId: number }) {
  const { data: investor } = trpc.investors.getById.useQuery({ id: investorId });

  if (!investor) return <div className="text-xs text-slate-400 py-2">Loading…</div>;

  const total = investor.properties.reduce((s, p) => s + parseFloat(p.pctCapital ?? "0"), 0);

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left px-4 py-2 font-bold text-slate-500 uppercase tracking-wide">Property</th>
            <th className="text-right px-4 py-2 font-bold text-slate-500 uppercase tracking-wide w-28">% Capital</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {investor.properties.map((p) => (
            <tr key={p.propertyId} className="bg-white">
              <td className="px-4 py-2 text-slate-700">{p.propertyName}</td>
              <td className="px-4 py-2 text-right font-mono font-semibold" style={{ color: "#16a34a" }}>
                {parseFloat(p.pctCapital ?? "0").toFixed(4)}%
              </td>
            </tr>
          ))}
          <tr className="bg-slate-50 border-t border-slate-200">
            <td className="px-4 py-2 font-bold text-slate-700">Total</td>
            <td className="px-4 py-2 text-right font-mono font-bold" style={{ color: "#16a34a" }}>
              {total.toFixed(4)}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
