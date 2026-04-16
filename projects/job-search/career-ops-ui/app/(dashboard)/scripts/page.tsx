"use client";

import { useState } from "react";
import { Play, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

interface ScriptDef {
  name: string;
  script: string;
  args?: string[];
  description: string;
  danger?: boolean;
}

interface RunResult {
  output?: string;
  error?: string;
  stderr?: string;
  exitCode?: number;
}

const SCRIPTS: ScriptDef[] = [
  {
    name: "Doctor",
    script: "doctor",
    description: "Check all prerequisites — Node.js version, dependencies, required files.",
  },
  {
    name: "CV Sync Check",
    script: "cv-sync-check",
    description: "Validate cv.md and profile.yml are complete and consistent.",
  },
  {
    name: "Verify Pipeline",
    script: "verify-pipeline",
    description: "Health check: canonical statuses, no duplicates, all report links valid.",
  },
  {
    name: "Merge Tracker",
    script: "merge-tracker",
    args: ["--dry-run"],
    description: "Preview (dry-run) merging batch TSV additions into applications.md.",
  },
  {
    name: "Merge Tracker (write)",
    script: "merge-tracker",
    description: "Merge batch TSV additions into applications.md.",
    danger: true,
  },
  {
    name: "Dedup Tracker",
    script: "dedup-tracker",
    args: ["--dry-run"],
    description: "Preview (dry-run) removing duplicate entries from applications.md.",
  },
  {
    name: "Normalize Statuses",
    script: "normalize-statuses",
    args: ["--dry-run"],
    description: "Preview (dry-run) normalizing non-canonical status values.",
  },
];

function ScriptCard({ def }: { def: ScriptDef }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: def.script, args: def.args ?? [] }),
      });
      const data = await res.json() as RunResult & { error?: string };
      setResult(data);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setRunning(false);
    }
  }

  const hasError = result?.error || (result?.exitCode !== undefined && result.exitCode !== 0);

  return (
    <div className={`rounded-xl border bg-slate-800/60 p-5 space-y-3 ${
      def.danger ? "border-red-500/30" : "border-slate-700"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">{def.name}</h3>
            {def.danger && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                writes
              </span>
            )}
            {def.args?.includes("--dry-run") && (
              <span className="rounded-full bg-slate-600/60 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                dry-run
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{def.description}</p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50 ${
            def.danger
              ? "bg-red-600 hover:bg-red-500"
              : "bg-indigo-600 hover:bg-indigo-500"
          }`}
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {running ? "Running…" : "Run"}
        </button>
      </div>

      {result && (
        <div className={`rounded-lg border px-3 py-2.5 ${
          hasError
            ? "border-red-500/30 bg-red-500/10"
            : "border-green-500/30 bg-green-500/10"
        }`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            {hasError
              ? <AlertTriangle size={12} className="text-red-400" />
              : <CheckCircle size={12} className="text-green-400" />
            }
            <span className={`text-xs font-semibold ${hasError ? "text-red-400" : "text-green-400"}`}>
              {hasError ? "Failed" : "Success"}
            </span>
          </div>
          {result.error && (
            <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap">{result.error}</pre>
          )}
          {result.stderr && (
            <pre className="font-mono text-xs text-red-300 whitespace-pre-wrap">{result.stderr.slice(0, 800)}</pre>
          )}
          {result.output && (
            <pre className="max-h-48 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">{result.output.slice(0, 2000)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScriptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Pipeline Scripts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Run career-ops maintenance scripts directly from the UI
        </p>
      </div>

      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300">
        <span className="font-semibold">Note:</span> Scripts marked &quot;writes&quot; modify your applications.md.
        Always run the dry-run version first to preview changes.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SCRIPTS.map((def) => (
          <ScriptCard key={`${def.script}-${def.args?.join("-") ?? ""}`} def={def} />
        ))}
      </div>
    </div>
  );
}
