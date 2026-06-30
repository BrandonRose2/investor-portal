import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Building2, DollarSign, TrendingUp, ChevronRight, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// ─── Session storage key ──────────────────────────────────────────────────────
const SESSION_KEY = "marc_investments_access";

function getSessionEmail(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
function setSessionEmail(email: string) {
  try { sessionStorage.setItem(SESSION_KEY, email); } catch {}
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

// ─── PIN input component ──────────────────────────────────────────────────────
function PinInput({ onComplete }: { onComplete: (pin: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [show, setShow] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => { refs[0].current?.focus(); }, []);

  const handleChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < 3) refs[idx + 1].current?.focus();
    if (next.every(d => d !== "")) onComplete(next.join(""));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type={show ? "text" : "password"}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white transition-colors"
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {show ? "Hide" : "Show"} PIN
      </button>
    </div>
  );
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────
function PinGate({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [step, setStep] = useState<"email" | "create-pin" | "enter-pin">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkEmail = trpc.marc.checkEmail.useMutation();
  const setPin = trpc.marc.setPin.useMutation();
  const verifyPin = trpc.marc.verifyPin.useMutation();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await checkEmail.mutateAsync({ email: email.trim().toLowerCase() });
      if (result === null) {
        setError("This email is not authorized to access this section.");
      } else if (result === "no-pin") {
        setStep("create-pin");
      } else {
        setStep("enter-pin");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePin = async (pin: string) => {
    setError("");
    setLoading(true);
    try {
      const ok = await setPin.mutateAsync({ email: email.trim().toLowerCase(), pin });
      if (ok) {
        onSuccess(email.trim().toLowerCase());
      } else {
        setError("Failed to set PIN. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (pin: string) => {
    setError("");
    setLoading(true);
    try {
      const ok = await verifyPin.mutateAsync({ email: email.trim().toLowerCase(), pin });
      if (ok) {
        onSuccess(email.trim().toLowerCase());
      } else {
        setError("Incorrect PIN. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-sm shadow-lg border-slate-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">Marc's Investments</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            {step === "email" && "Enter your email to continue"}
            {step === "create-pin" && "Create your 4-digit PIN"}
            {step === "enter-pin" && "Enter your PIN"}
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="text-center"
              />
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? "Checking…" : "Continue"}
              </Button>
            </form>
          )}

          {step === "create-pin" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 text-center">
                Choose a 4-digit PIN you'll use to access this section.
              </p>
              <PinInput onComplete={handleCreatePin} />
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              {loading && <p className="text-xs text-slate-400 text-center">Saving PIN…</p>}
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); }}
                className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}

          {step === "enter-pin" && (
            <div className="space-y-4">
              <PinInput onComplete={handleVerifyPin} />
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
              {loading && <p className="text-xs text-slate-400 text-center">Verifying…</p>}
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); }}
                className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Use a different email
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Marc's Investments Dashboard ─────────────────────────────────────────────
function MarcDashboard({ onLock }: { onLock: () => void }) {
  // First find Marc Menowitz by name search, then fetch full detail
  const { data: allInvestors } = trpc.investors.list.useQuery({ search: "Marc Menowitz" });
  const marcId = allInvestors?.find(i => i.name.toLowerCase().includes("marc menowitz"))?.id ?? null;

  const { data: marcInvestor } = trpc.investors.getById.useQuery(
    { id: marcId ?? 0 },
    { enabled: !!marcId }
  );

  const { data: financials } = trpc.investors.financialSummary.useQuery(
    { id: marcId ?? 0 },
    { enabled: !!marcId }
  );
  const { data: distributions } = trpc.distributions.list.useQuery(
    { investorId: marcId ?? 0 },
    { enabled: !!marcId }
  );
  const { data: properties } = trpc.properties.list.useQuery();

  // Build property map
  type PropRow = { id: string; name: string; entityName: string; entityEin: string | null; isGrovePark: boolean; investorCount?: number; latestPiNote?: string | null };
  const propMap = new Map<string, PropRow>(
    (properties ?? []).map(p => [String(p.id), p as PropRow])
  );

  // Marc's property links (from getById which includes properties array)
  const marcProps = marcInvestor?.properties ?? [];

  const totalDistributions = financials?.totalDistributions ?? 0;
  const distributionsByYear = financials?.distributionsByYear ?? [];

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 border border-slate-200 rounded-md px-3 py-1.5 transition-colors hover:border-blue-200 hover:bg-blue-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Main Portal
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Marc's Investments</h1>
            <p className="text-sm text-slate-500 mt-0.5">Portfolio overview</p>
          </div>
        </div>
        <button
          onClick={onLock}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-md px-3 py-1.5 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          Lock
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Properties</p>
                  <p className="text-2xl font-bold text-slate-900">{marcProps.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Distributions</p>
                  <p className="text-2xl font-bold text-slate-900">{fmt(totalDistributions)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Years Active</p>
                  <p className="text-2xl font-bold text-slate-900">{distributionsByYear.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Properties</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Property</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entity</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">% Capital</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {marcProps.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">No properties found</td>
                    </tr>
                  )}
                  {marcProps.map((link: { propertyId: string; pctCapital: string | null; piNotes?: string | null }) => {
                    const prop = propMap.get(String(link.propertyId));
                    return (
                      <tr key={link.propertyId} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{prop?.name ?? link.propertyId}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{prop?.entityName ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">
                          {link.pctCapital ? `${parseFloat(link.pctCapital).toFixed(4)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/property/${link.propertyId}`}>
                            <ChevronRight className="w-4 h-4 text-slate-300 hover:text-blue-500 transition-colors" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Distributions by year */}
        {distributionsByYear.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Distributions by Year</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">K-1</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributionsByYear.map((row: any) => {
                      const k1 = row.k1 ?? 0;
                      const cash = row.cash ?? 0;
                      const total = Object.entries(row)
                        .filter(([k]) => k !== "year")
                        .reduce((s, [, v]) => s + (v as number), 0);
                      return (
                        <tr key={row.year} className="border-b border-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{row.year}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{k1 ? fmt(k1) : "—"}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{cash ? fmt(cash) : "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(total)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-3 text-slate-700">Total</td>
                      <td colSpan={2} />
                      <td className="px-4 py-3 text-right text-emerald-700">{fmt(totalDistributions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent distributions */}
        {(distributions ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Recent Distributions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Property</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Year</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(distributions ?? []).slice(0, 20).map((d: any) => {
                      const prop = propMap.get(d.propertyId);
                      return (
                        <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 text-slate-700">{prop?.name ?? d.propertyId}</td>
                          <td className="px-4 py-2.5 text-slate-500">{d.year}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant="outline" className="text-xs capitalize">{d.type.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-800">{fmt(parseFloat(d.amount))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function MarcInvestments() {
  const [accessEmail, setAccessEmail] = useState<string | null>(getSessionEmail);

  const handleSuccess = (email: string) => {
    setSessionEmail(email);
    setAccessEmail(email);
  };

  const handleLock = () => {
    clearSession();
    setAccessEmail(null);
  };

  if (!accessEmail) {
    return <PinGate onSuccess={handleSuccess} />;
  }

  return <MarcDashboard onLock={handleLock} />;
}
