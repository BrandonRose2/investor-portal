/**
 * PrintContext — allows any page to register its print data so the
 * Layout's Print button can trigger the right formatted report.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
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

export function PrintProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<PrintPayload>(null);

  const triggerPrint = useCallback(() => {
    // Small delay so React can flush the updated payload to the DOM
    setTimeout(() => window.print(), 80);
  }, []);

  return (
    <PrintContext.Provider value={{ payload, setPayload, triggerPrint }}>
      {children}
    </PrintContext.Provider>
  );
}

export function usePrint() {
  return useContext(PrintContext);
}
