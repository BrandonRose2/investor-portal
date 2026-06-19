// Admin context — PIN auth (3060) + localStorage-backed mutable data store
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { PROPERTIES as SEED_PROPERTIES } from "@/lib/investorData";
import type { Property } from "@/lib/investorData";

const ADMIN_PIN = "3060";
const STORAGE_KEY = "gp_investor_data_v1";
const AUTH_KEY = "gp_admin_authed";

interface AdminContextValue {
  isAuthed: boolean;
  authError: string;
  login: (pin: string) => boolean;
  logout: () => void;
  properties: Property[];
  addProperty: (p: Property) => void;
  updateProperty: (id: string, p: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  addInvestor: (propertyId: string, inv: Property["investors"][0]) => void;
  updateInvestor: (propertyId: string, idx: number, inv: Partial<Property["investors"][0]>) => void;
  deleteInvestor: (propertyId: string, idx: number) => void;
  resetToSeed: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

function loadData(): Property[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Property[];
  } catch {}
  return SEED_PROPERTIES;
}

function saveData(data: Property[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(() => {
    try { return sessionStorage.getItem(AUTH_KEY) === "1"; } catch { return false; }
  });
  const [authError, setAuthError] = useState("");
  const [properties, setProperties] = useState<Property[]>(loadData);

  // Persist whenever properties change
  useEffect(() => { saveData(properties); }, [properties]);

  const login = useCallback((pin: string) => {
    if (pin === ADMIN_PIN) {
      setIsAuthed(true);
      setAuthError("");
      try { sessionStorage.setItem(AUTH_KEY, "1"); } catch {}
      return true;
    }
    setAuthError("Incorrect PIN. Please try again.");
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthed(false);
    try { sessionStorage.removeItem(AUTH_KEY); } catch {}
  }, []);

  const addProperty = useCallback((p: Property) => {
    setProperties((prev) => [...prev, p]);
  }, []);

  const updateProperty = useCallback((id: string, updates: Partial<Property>) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const deleteProperty = useCallback((id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addInvestor = useCallback((propertyId: string, inv: Property["investors"][0]) => {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId ? { ...p, investors: [...p.investors, inv] } : p
      )
    );
  }, []);

  const updateInvestor = useCallback((propertyId: string, idx: number, updates: Partial<Property["investors"][0]>) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== propertyId) return p;
        const investors = p.investors.map((inv, i) =>
          i === idx ? { ...inv, ...updates } : inv
        );
        return { ...p, investors };
      })
    );
  }, []);

  const deleteInvestor = useCallback((propertyId: string, idx: number) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== propertyId) return p;
        return { ...p, investors: p.investors.filter((_, i) => i !== idx) };
      })
    );
  }, []);

  const resetToSeed = useCallback(() => {
    setProperties(SEED_PROPERTIES);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AdminContext.Provider value={{
      isAuthed, authError, login, logout,
      properties,
      addProperty, updateProperty, deleteProperty,
      addInvestor, updateInvestor, deleteInvestor,
      resetToSeed,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
