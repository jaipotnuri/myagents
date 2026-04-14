"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Application } from "@/types/career-ops";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(["applied", "screening"]);
const RESPONSE_STATUSES = new Set(["interview", "offer", "rejected"]);

const SCORE_RANGES = [
  { label: "<3.5",    min: 0,   max: 3.5,  color: "#f87171" },
  { label: "3.5–3.9", min: 3.5, max: 4.0,  color: "#fb923c" },
  { label: "4.0–4.4", min: 4.0, max: 4.5,  color: "#60a5fa" },
  { label: "4.5+",    min: 4.5, max: Infinity, color: "#34d399" },
];

const STATUS_COLORS: Record<string, string> = {
  evaluated: "#818cf8",
  applied:   "#60a5fa",
  screening: "#a78bfa",
  interview: "#34d399",
  offer:     "#fbbf24",
  rejected:  "#f87171",
  other:     "#94a3b8",
};

const STATUS_ICONS: Record<string, string> = {
  evaluated: "📋",
  applied:   "📤",
  screening: "🔍",
  interview: "🎤",
  offer:     "🎉",
  rejected:  "✖️",
};

// ─── Helper components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tracker")
      .then((r) => r.json())
      .then((data: Application[]) => {
        setApps(Array.isArray(data) ? data : []);
      })
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────────

  const total = apps.length;

  const avgScore =
    total > 0
      ? (apps.reduce((sum, a) => sum + (a.score ?? 0), 0) / total).toFixed(2)
      : "—";

  const activePipeline = apps.filter((a) =>
    ACTIVE_STATUSES.has(a.status.toLowerCase())
  ).length;

  const responded = apps.filter((a) =>
    RESPONSE_STATUSES.has(a.status.toLowerCase())
  ).length;
  const responseRate =
    total > 0 ? Math.round((responded / total) * 100) + "%" : "—";

  // ── Score distribution ────────────────────────────────────────────────────────

  const scoreDistData = SCORE_RANGES.map(({ label, min, max, color }) => ({
    range: label,
    count: apps.filter((a) => a.score >= min && a.score < max).length,
    color,
  }));

  // ── Pipeline status donut ─────────────────────────────────────────────────────

  const statusCounts: Record<string, number> = {};
  for (const app of apps) {
    const key = app.status.toLowerCase() || "other";
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }
  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: STATUS_COLORS[status] ?? STATUS_COLORS.other,
  }));

  // ── Recent activity (last 5 by date desc) ────────────────────────────────────

  const recent = [...apps]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-400 animate-pulse">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your job-search command centre — track, evaluate, and optimise your pipeline.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={total} />
        <StatCard
          label="Avg Score"
          value={avgScore}
          sub="out of 5.0"
        />
        <StatCard
          label="Active Pipeline"
          value={activePipeline}
          sub="Applied + Screening"
        />
        <StatCard
          label="Response Rate"
          value={responseRate}
          sub="Interview / Offer / Rejected"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Score distribution bar chart */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">
            Score Distribution
          </h2>
          {total === 0 ? (
            <p className="text-sm text-slate-500">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={scoreDistData}
                margin={{ top: 4, right: 8, bottom: 4, left: -16 }}
              >
                <XAxis
                  dataKey="range"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    color: "#f1f5f9",
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreDistData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pipeline status donut chart */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">
            Pipeline Status
          </h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-500">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    color: "#f1f5f9",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">
          Recent Activity
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No applications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {recent.map((app) => {
              const statusKey = app.status.toLowerCase();
              const icon = STATUS_ICONS[statusKey] ?? "📎";
              const color = STATUS_COLORS[statusKey] ?? STATUS_COLORS.other;
              return (
                <li
                  key={app.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-lg">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {app.company}
                    </p>
                    <p className="truncate text-xs text-slate-500">{app.role}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: color + "22",
                        color,
                        border: `1px solid ${color}44`,
                      }}
                    >
                      {app.status}
                    </span>
                    <span className="text-xs text-slate-600">{app.date}</span>
                  </div>
                  <div className="w-10 text-right text-sm font-semibold text-slate-300">
                    {app.score > 0 ? app.score.toFixed(1) : "—"}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
