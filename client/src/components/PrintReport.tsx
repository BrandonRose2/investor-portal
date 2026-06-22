/**
 * PrintReport — renders a hidden, print-only formatted report.
 * The Layout's Print button calls window.print(), and CSS @media print
 * hides the app UI while showing only this component.
 *
 * Usage: mount <PrintReport type="investor" data={...} /> inside the page,
 * then call window.print().
 */
import { forwardRef } from "react";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type InvestorReportData = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  adminNotes?: string | null;
  properties: Array<{
    propertyId: string;
    propertyName: string;
    entityName: string;
    pctCapital?: string | null;
    investedAmount?: string | null;
  }>;
  distributions: Array<{
    year: number;
    amount: string;
    type: string;
    notes?: string | null;
    propertyName?: string | null;
  }>;
  notes: Array<{
    id: number;
    content: string;
    createdAt: Date | string;
  }>;
  financials?: {
    totalInvested: number;
    totalDistributed: number;
    propertyCount: number;
    distributionCount: number;
  } | null;
};

export type PropertyReportData = {
  id: string;
  name: string;
  entityName: string;
  entityEin?: string | null;
  isGrovePark?: boolean;
  investors: Array<{
    investorId: number;
    investorName: string;
    email?: string | null;
    status: string;
    pctCapital?: string | null;
    investedAmount?: string | null;
  }>;
};

export type SummaryReportData = {
  properties: Array<{
    id: string;
    name: string;
    entityName: string;
    entityEin?: string | null;
    investorCount: number;
  }>;
  totalInvestors: number;
};

type PrintReportProps =
  | { type: "investor"; data: InvestorReportData }
  | { type: "property"; data: PropertyReportData }
  | { type: "summary"; data: SummaryReportData };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number | string) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  return isNaN(v) ? "—" : v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  deceased: "Deceased",
  transferred: "Transferred",
  bought_out: "Bought Out",
};

// ─── Sub-reports ──────────────────────────────────────────────────────────────

function InvestorReport({ data }: { data: InvestorReportData }) {
  const distByYear = [...data.distributions].sort((a, b) => b.year - a.year);
  const totalDist = data.distributions.reduce((s, d) => s + parseFloat(d.amount ?? "0"), 0);

  return (
    <div className="print-report">
      {/* Header */}
      <div className="print-header">
        <div>
          <h1 className="print-title">{data.name}</h1>
          <p className="print-subtitle">Investor Detail Report</p>
        </div>
        <div className="print-meta-right">
          <p>Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>Status: <strong>{STATUS_LABELS[data.status] ?? data.status}</strong></p>
        </div>
      </div>

      {/* Contact info */}
      <div className="print-section">
        <h2 className="print-section-title">Contact Information</h2>
        <table className="print-kv-table">
          <tbody>
            {data.email && <tr><td className="print-kv-label">Email</td><td>{data.email}</td></tr>}
            {data.phone && <tr><td className="print-kv-label">Phone</td><td>{data.phone}</td></tr>}
            {data.adminNotes && <tr><td className="print-kv-label">Notes</td><td>{data.adminNotes}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Financial summary */}
      {data.financials && (
        <div className="print-section">
          <h2 className="print-section-title">Financial Summary</h2>
          <div className="print-kpi-row">
            <div className="print-kpi">
              <span className="print-kpi-label">Total Invested</span>
              <span className="print-kpi-value">{fmt$(data.financials.totalInvested)}</span>
            </div>
            <div className="print-kpi">
              <span className="print-kpi-label">Total Distributed</span>
              <span className="print-kpi-value">{fmt$(data.financials.totalDistributed)}</span>
            </div>
            <div className="print-kpi">
              <span className="print-kpi-label">Properties</span>
              <span className="print-kpi-value">{data.financials.propertyCount}</span>
            </div>
            <div className="print-kpi">
              <span className="print-kpi-label">Distributions</span>
              <span className="print-kpi-value">{data.financials.distributionCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Properties */}
      {data.properties.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Properties ({data.properties.length})</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Entity</th>
                <th className="print-right">% Capital</th>
                <th className="print-right">Invested</th>
              </tr>
            </thead>
            <tbody>
              {data.properties.map((p) => (
                <tr key={p.propertyId}>
                  <td>{p.propertyName}</td>
                  <td className="print-muted">{p.entityName}</td>
                  <td className="print-right print-mono">{p.pctCapital ? `${parseFloat(p.pctCapital).toFixed(4)}%` : "—"}</td>
                  <td className="print-right print-mono">{p.investedAmount ? fmt$(p.investedAmount) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Distributions */}
      {distByYear.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Distributions — Total: {fmt$(totalDist)}</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Type</th>
                <th>Property</th>
                <th className="print-right">Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {distByYear.map((d, i) => (
                <tr key={i}>
                  <td className="print-mono">{d.year}</td>
                  <td className="print-upper">{d.type}</td>
                  <td className="print-muted">{d.propertyName ?? "—"}</td>
                  <td className="print-right print-mono">{fmt$(d.amount)}</td>
                  <td className="print-muted">{d.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {data.notes.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Activity Notes ({data.notes.length})</h2>
          <div className="print-notes">
            {[...data.notes].reverse().map((n) => (
              <div key={n.id} className="print-note">
                <span className="print-note-date">{fmtDate(n.createdAt)}</span>
                <span className="print-note-content">{n.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="print-footer">
        Grove Park Investor Portal · Confidential · Internal Use Only
      </div>
    </div>
  );
}

function PropertyReport({ data }: { data: PropertyReportData }) {
  const totalPct = data.investors.reduce((s, i) => s + parseFloat(i.pctCapital ?? "0"), 0);

  return (
    <div className="print-report">
      <div className="print-header">
        <div>
          <h1 className="print-title">{data.name}</h1>
          <p className="print-subtitle">Property Detail Report</p>
        </div>
        <div className="print-meta-right">
          <p>Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          {data.isGrovePark && <p><strong>Grove Park (MT Structure)</strong></p>}
        </div>
      </div>

      <div className="print-section">
        <h2 className="print-section-title">Entity Information</h2>
        <table className="print-kv-table">
          <tbody>
            <tr><td className="print-kv-label">Legal Entity</td><td>{data.entityName}</td></tr>
            {data.entityEin && <tr><td className="print-kv-label">EIN</td><td className="print-mono">{data.entityEin}</td></tr>}
            <tr><td className="print-kv-label">Total Investors</td><td>{data.investors.length}</td></tr>
            <tr><td className="print-kv-label">Total % Capital</td><td className="print-mono">{totalPct.toFixed(4)}%</td></tr>
          </tbody>
        </table>
      </div>

      {data.investors.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Investors ({data.investors.length})</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Investor</th>
                <th>Email</th>
                <th>Status</th>
                <th className="print-right">% Capital</th>
                <th className="print-right">Invested</th>
              </tr>
            </thead>
            <tbody>
              {data.investors.map((inv) => (
                <tr key={inv.investorId}>
                  <td>{inv.investorName}</td>
                  <td className="print-muted">{inv.email ?? "—"}</td>
                  <td>{STATUS_LABELS[inv.status] ?? inv.status}</td>
                  <td className="print-right print-mono">{inv.pctCapital ? `${parseFloat(inv.pctCapital).toFixed(4)}%` : "—"}</td>
                  <td className="print-right print-mono">{inv.investedAmount ? fmt$(inv.investedAmount) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td className="print-right print-mono"><strong>{totalPct.toFixed(4)}%</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="print-footer">
        Grove Park Investor Portal · Confidential · Internal Use Only
      </div>
    </div>
  );
}

function SummaryReport({ data }: { data: SummaryReportData }) {
  return (
    <div className="print-report">
      <div className="print-header">
        <div>
          <h1 className="print-title">Investor Summary</h1>
          <p className="print-subtitle">All Properties Directory</p>
        </div>
        <div className="print-meta-right">
          <p>Printed: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>{data.properties.length} Properties · {data.totalInvestors} Investors</p>
        </div>
      </div>

      <div className="print-section">
        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Property</th>
              <th>Legal Entity</th>
              <th>EIN</th>
              <th className="print-right">Investors</th>
            </tr>
          </thead>
          <tbody>
            {data.properties.map((p, i) => (
              <tr key={p.id}>
                <td className="print-muted print-mono">{i + 1}</td>
                <td><strong>{p.name}</strong></td>
                <td className="print-muted">{p.entityName}</td>
                <td className="print-mono">{p.entityEin ?? "—"}</td>
                <td className="print-right print-mono">{p.investorCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-footer">
        Grove Park Investor Portal · Confidential · Internal Use Only
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const PrintReport = forwardRef<HTMLDivElement, PrintReportProps>((props, ref) => {
  return (
    <div ref={ref} id="print-report-root">
      {props.type === "investor" && <InvestorReport data={props.data} />}
      {props.type === "property" && <PropertyReport data={props.data} />}
      {props.type === "summary" && <SummaryReport data={props.data} />}
    </div>
  );
});

PrintReport.displayName = "PrintReport";
export default PrintReport;
