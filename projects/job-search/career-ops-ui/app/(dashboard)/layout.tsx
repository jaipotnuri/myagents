import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

/**
 * Dashboard layout — fixed sidebar (224px) + scrollable main content area.
 * All routes inside (dashboard) share this shell.
 */
export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Fixed left sidebar */}
      <Sidebar />

      {/* Main scrollable content area */}
      <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
        {children}
      </main>
    </div>
  );
}
