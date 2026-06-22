/**
 * PrintContext — allows any page to register its print data so the
 * Layout's Print button can trigger the right formatted report.
 *
 * The report is rendered into a dedicated #print-portal div that sits
 * OUTSIDE #root in the HTML, so the @media print CSS can safely hide
 * #root entirely while showing only the portal.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import PrintReport from "@/components/PrintReport";
import type { InvestorReportData, PropertyReportData, SummaryReportData } from "@/components/PrintReport";

export type PrintPayload =
  | { type: "investor"; data: InvestorReportData }
  | { type: "property"; data: PropertyReportData }
  | { type: "summary"; data: SummaryReportData }
  | null;

interface PrintContextValue {
  payload: PrintPayload;
  setPayload: (p: PrintPayload) => void;
  triggerPrint: () => void;
}

const PrintContext = createContext<PrintContextValue>({
  payload: null,
  setPayload: () => {},
  triggerPrint: () => {},
});

function PrintPortal({ payload }: { payload: PrintPayload }) {
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById("print-portal");
    setPortalEl(el);
  }, []);

  if (!portalEl || !payload) return null;

  return createPortal(
    <div id="print-report-root">
      <PrintReport {...payload} />
    </div>,
    portalEl
  );
}

export function PrintProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<PrintPayload>(null);

  const triggerPrint = useCallback(() => {
    // Small delay so React can flush the updated payload to the DOM
    setTimeout(() => window.print(), 80);
  }, []);

  return (
    <PrintContext.Provider value={{ payload, setPayload, triggerPrint }}>
      {children}
      <PrintPortal payload={payload} />
    </PrintContext.Provider>
  );
}

export function usePrint() {
  return useContext(PrintContext);
}
