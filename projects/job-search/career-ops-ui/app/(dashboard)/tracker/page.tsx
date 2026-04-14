"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { Application } from "@/lib/parseTracker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = "company" | "role" | "score" | "status" | "date" | "remote";
type SortDir = "asc" | "desc";

type StatusFilter =
  | "All"
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Evaluated";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusStyle(status: string): string {
  switch (status.toLowerCase()) {
    case "applied":
      return "bg-indigo-500/20 text-indigo-400 border-indigo-500/40";
    case "screening":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    case "interview":
      return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    case "offer":
      return "bg-green-500/20 text-green-400 border-green-500/40";
    case "rejected":
      return "bg-red-500/20 text-red-400 border-red-500/40";
    case "evaluated":
      return "bg-violet-500/20 text-violet-400 border-violet-500/40";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/40";
  }
}

function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const aStr = String(a ?? "");
  const bStr = String(b ?? "");

  const aNum = Number(a);
  const bNum = Number(b);
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return dir === "asc" ? aNum - bNum : bNum - aNum;
  }

  const aDate = Date.parse(aStr);
  const bDate = Date.parse(bStr);
  if (!isNaN(aDate) && !isNaN(bDate)) {
    return dir === "asc" ? aDate - bDate : bDate - aDate;
  }

  return dir === "asc"
    ? aStr.localeCompare(bStr)
    : bStr.localeCompare(aStr);
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-56 rounded-lg bg-slate-700" />
        <div className="h-6 w-16 rounded-full bg-slate-700" />
      </div>
      <div className="flex gap-3">
        <div className="h-9 flex-1 rounded-lg bg-slate-700" />
        <div className="h-9 w-40 rounded-lg bg-slate-700" />
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
        <div className="divide-y divide-slate-700">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              <div className="h-4 w-32 rounded bg-slate-700" />
              <div className="h-4 w-48 rounded bg-slate-700" />
              <div className="h-4 w-12 rounded bg-slate-700" />
              <div className="h-4 w-20 rounded bg-slate-700" />
              <div className="h-4 w-24 rounded bg-slate-700" />
              <div className="h-4 w-10 rounded bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable column header
// ---------------------------------------------------------------------------

interface ThProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}

function Th({ label, sortKey, currentKey, dir, onSort }: ThProps) {
  const active = sortKey === currentKey;
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3 text-indigo-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-indigo-400" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: StatusFilter[] = [
  "All",
  "Applied",
  "Evaluated",
  "Screening",
  "Interview",
  "Offer",
  "Rejected",
];

export default function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/tracker")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Application[]) => setApps(data))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const displayed = useMemo(() => {
    let result = apps;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "All") {
      result = result.filter(
        (a) => a.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    result = [...result].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      switch (sortKey) {
        case "company":   aVal = a.company;  bVal = b.company;  break;
        case "role":      aVal = a.role;     bVal = b.role;     break;
        case "score":     aVal = a.score;    bVal = b.score;    break;
        case "status":    aVal = a.status;   bVal = b.status;   break;
        case "date":      aVal = a.date;     bVal = b.date;     break;
        case "remote":    aVal = a.remote ? "1" : "0"; bVal = b.remote ? "1" : "0"; break;
        default:          aVal = ""; bVal = "";
      }

      return compareValues(aVal, bVal, sortDir);
    });

    return result;
  }, [apps, search, statusFilter, sortKey, sortDir]);

  if (loading) return <Skeleton />;

  const columns: { label: string; sortKey: SortKey }[] = [
    { label: "Company",      sortKey: "company" },
    { label: "Role",         sortKey: "role" },
    { label: "Score",        sortKey: "score" },
    { label: "Status",       sortKey: "status" },
    { label: "Date",         sortKey: "date" },
    { label: "Remote",       sortKey: "remote" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Applications Tracker</h1>
        <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-700 px-3 py-1 text-sm font-medium text-slate-300">
          {apps.length} {apps.length === 1 ? "app" : "apps"}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search company or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All Statuses" : s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p className="text-base font-medium">No applications found</p>
            <p className="mt-1 text-sm">
              {search || statusFilter !== "All"
                ? "Try adjusting your search or filter."
                : "Add entries to your applications.md to get started."}
            </p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-slate-700 bg-slate-900/50">
              <tr>
                {columns.map((col) => (
                  <Th
                    key={col.sortKey}
                    label={col.label}
                    sortKey={col.sortKey}
                    currentKey={sortKey}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {displayed.map((app, idx) => (
                <tr
                  key={app.id}
                  className={`transition-colors hover:bg-slate-700/40 ${
                    idx % 2 === 0 ? "" : "bg-slate-800/60"
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    {app.company || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {app.role || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {app.score > 0 ? (
                      <ScoreBadge score={app.score} />
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        getStatusStyle(app.status),
                      ].join(" ")}
                    >
                      {app.status || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {app.date || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {app.remote ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {app.url ? (
                      <Link
                        href={`/reports?id=${app.id}`}
                        className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        View Report
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
