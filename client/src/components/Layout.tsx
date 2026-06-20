// Command Center layout: fixed sidebar + top header + scrollable main
// Design: light mode, blue-700 accent, Inter font, slate palette
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Building2, Users, LayoutDashboard, Menu, X, Settings2 } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_TOP = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/directory", label: "Properties", icon: Building2 },
  { href: "/directory?tab=investors", label: "Investors", icon: Users },
];

const NAV_BOTTOM = [
  { href: "/settings", label: "Admin Settings", icon: Settings2 },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    const path = href.split("?")[0];
    if (href === "/") return location === "/";
    return location.startsWith(path);
  }

  function navLink(href: string, label: string, Icon: React.ElementType) {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={`
          flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium
          transition-colors duration-100
          ${active
            ? "bg-blue-50 text-blue-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }
        `}
        onClick={() => setMobileOpen(false)}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 bg-slate-50 border-r border-slate-200
          flex flex-col transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-200 shrink-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663449376037/Bsfxz8WvKfLUNyvCCpFGAT/invest-logo-JVNmDYGGounncZ8i8riyvn.webp"
            alt="Investor Portal"
            className="w-8 h-8 rounded-md object-cover"
          />
          <div className="text-sm font-bold text-slate-900 leading-tight">Investor Portal</div>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {NAV_TOP.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
        </nav>

        {/* Bottom Nav */}
        <div className="px-2 pb-3 border-t border-slate-200 pt-2 space-y-0.5">
          {NAV_BOTTOM.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
          <div className="px-3 pt-2">
            <p className="text-xs text-slate-400">37 Properties · 147+ Investors</p>
            <p className="text-xs text-slate-400 mt-0.5">Data as of 10/1/2020</p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col lg:pl-60">
        {/* Top header */}
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:block">Internal Use Only</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              Confidential
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
