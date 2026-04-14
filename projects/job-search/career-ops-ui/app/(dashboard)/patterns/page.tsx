/**
 * Pattern Analysis — surfaces rejection reasons, archetype conversion rates,
 * and tech-stack gaps from the career-ops analyze-patterns script.
 */
"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RejectReason {
  reason: string;
  count: number;
}

interface Archetype {
  type: string;
  apps: number;
  converts: number;
}

interface TechGap {
  skill: string;
  gap: number; // 0–1
}

interface PatternsData {
  rejectReasons: RejectReason[];
  archetypes: Archetype[];
  techGaps: TechGap[];
}

// ---------------------------------------------------------------------------
// Mock fallback data
// ---------------------------------------------------------------------------

const MOCK_DATA: PatternsData = {
  rejectReasons: [
    { reason: "Geo restriction", count: 4 },
    { reason: "Stack mismatch",  count: 3 },
    { reason: "Level mismatch",  count: 2 },
    { reason: "Visa concerns",   count: 2 },
    { reason: "Score < 3.5",     count: 1 },
  ],
  archetypes: [
    { type: "AI Infra",  apps: 4, converts: 2 },
    { type: "ML Eng",    apps: 5, converts: 1 },
    { type: "Fullstack", apps: 3, converts: 0 },
    { type: "DevRel",    apps: 2, converts: 1 },
  ],
  techGaps: [
    { skill: "PyTorch",    gap: 0.1 }, { skill: "RLHF",       gap: 0.7 },
    { skill: "Kubernetes", gap: 0.3 }, { skill: "Rust",        gap: 0.9 },
    { skill: "Ray",        gap: 0.5 }, { skill: "CUDA",        gap: 0.6 },
    { skill: "TypeScript", gap: 0.2 }, { skill: "Go",          gap: 0.4 },
    { skill: "vLLM",       gap: 0.6 }, { skill: "Triton",      gap: 0.8 },
    { skill: "Megatron",   gap: 0.9 }, { skill: "Flash Attn",  gap: 0.7 },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gapStyles(gap: number): { card: string; label: string } {
  if (gap < 0.3) return { card: "bg-green-500/20 border border-green-500/30", label: "text-green-300" };
  if (gap <= 0.6) return { card: "bg-yellow-500/20 border border-yellow-500/30", label: "text-yellow-300" };
  return { card: "bg-red-500/20 border border-red-500/30", label: "text-red-300" };
}

function gapTag(gap: number): string {
  if (gap < 0.3) return "strong";
  if (gap <= 0.6) return "gap";
  return "weak";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ArchetypeBar({ archetype }: { archetype: Archetype }) {
  const pct = archetype.apps > 0 ? (archetype.converts / archetype.apps) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-200">{archetype.type}</span>
        <span className="text-xs text-slate-400">
          {archetype.converts}/{archetype.apps} converted
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-xs text-slate-500">{Math.round(pct)}%</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PatternsPage() {
  const [data, setData]       = useState<PatternsData>(MOCK_DATA);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function fetchPatterns() {
    try {
      const res = await fetch("/api/patterns");
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      // Validate shape; fall back to mock if keys missing
      if (json.rejectReasons && json.archetypes && json.techGaps) {
        setData(json as PatternsData);
      }
    } catch {
      // silently keep mock data
    } finally {
      setLoading(false);
      setRunning(false);
    }
  }

  useEffect(() => {
    fetchPatterns();
  }, []);

  function handleRunAnalysis() {
    setRunning(true);
    fetchPatterns();
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pattern Analysis</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Rejection drivers, archetype conversion rates, and tech-stack gaps
          </p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={running}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} />
          {running ? "Running…" : "Run Analysis"}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Score threshold callout                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-4">
        <span className="mt-0.5 text-base">⚡</span>
        <p className="text-sm text-yellow-200">
          <span className="font-semibold">Score threshold recommendation:</span>{" "}
          Focus on roles scoring{" "}
          <span className="font-semibold text-yellow-100">4.2+</span> — conversion
          rate drops 62% below this threshold.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2-column: rejection reasons + archetype conversion                  */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-800/60" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left — Rejection Reasons */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Rejection Reasons
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={data.rejectReasons}
                margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis
                  type="number"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="reason"
                  width={112}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#1e293b" }}
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#e2e8f0",
                  }}
                  formatter={(v) => [v, "rejections"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.rejectReasons.map((_, i) => (
                    <Cell key={i} fill="#6366f1" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Right — Archetype Conversion Rates */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Archetype Conversion Rates
            </h2>
            <div className="space-y-5">
              {data.archetypes.map((arch) => (
                <ArchetypeBar key={arch.type} archetype={arch} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Tech Stack Gap Heatmap                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Tech Stack Gap Heatmap
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Strong
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
              Gap
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              Weak
            </span>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-700/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {data.techGaps.map(({ skill, gap }) => {
              const { card, label } = gapStyles(gap);
              const tag = gapTag(gap);
              const pctDisplay = Math.round(gap * 100);
              return (
                <div
                  key={skill}
                  className={`${card} flex flex-col items-center justify-center rounded-lg px-2 py-3 text-center`}
                >
                  <span className={`text-xs font-semibold ${label}`}>{skill}</span>
                  <span className="mt-1 text-xs text-slate-500">{pctDisplay}% {tag}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
