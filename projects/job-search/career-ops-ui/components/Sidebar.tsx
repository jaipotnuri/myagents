"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Zap,
  List,
  Building2,
  FileText,
  BarChart2,
  User,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/",          icon: <LayoutDashboard size={18} /> },
  { label: "Tracker",   href: "/tracker",   icon: <Briefcase       size={18} /> },
  { label: "Evaluator", href: "/evaluator", icon: <Zap             size={18} /> },
  { label: "Pipeline",  href: "/pipeline",  icon: <List            size={18} /> },
  { label: "Scanner",   href: "/scanner",   icon: <Building2       size={18} /> },
  { label: "Reports",   href: "/reports",   icon: <FileText        size={18} /> },
  { label: "Patterns",  href: "/patterns",  icon: <BarChart2       size={18} /> },
  { label: "Profile",   href: "/profile",   icon: <User            size={18} /> },
];

/**
 * Sidebar — fixed 224px navigation rail for the (dashboard) layout.
 * Uses usePathname() for active-route detection.
 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-[224px] flex-shrink-0 flex-col"
      style={{ backgroundColor: "#0f172a" }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-base font-bold tracking-tight text-indigo-400">
          career-ops
        </p>
        <p className="mt-0.5 text-xs text-slate-500">Job Search Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border border-indigo-500/30 bg-indigo-600/20 text-indigo-300"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                  ].join(" ")}
                >
                  <span className="flex-shrink-0">{icon}</span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — user identity */}
      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Avatar circle */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            JP
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">
              Jai Potnuri
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-xs text-slate-500">Active search</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
