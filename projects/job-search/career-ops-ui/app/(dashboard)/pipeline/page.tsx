"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clock,
  CheckCircle,
  Plus,
  Play,
  Zap,
  SkipForward,
  Trash2,
  Globe,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "pending" | "evaluating" | "done";

interface QueueItem {
  id: number;
  url: string;
  status: Status;
}

interface ScrapeResult {
  title: string;
  company: string;
  description: string;
  url: string;
}

// ─── Mock data (fallback when API returns empty / errors) ─────────────────────

const MOCK_DATA: QueueItem[] = [
  {
    id: 1,
    url: "https://jobs.ashbyhq.com/scale-ai/engineer-ml",
    status: "pending",
  },
  {
    id: 2,
    url: "https://boards.greenhouse.io/deepmind/jobs/7123",
    status: "evaluating",
  },
  {
    id: 3,
    url: "https://careers.nvidia.com/ai-researcher-42",
    status: "pending",
  },
  {
    id: 4,
    url: "https://jobs.lever.co/stability-ai/sr-engineer",
    status: "done",
  },
];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_PILL: Record<Status, string> = {
  pending: "bg-slate-700 text-slate-400",
  evaluating: "bg-indigo-500/20 text-indigo-300",
  done: "bg-green-500/20 text-green-300",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") {
    return <CheckCircle size={16} className="text-green-400 flex-shrink-0" />;
  }
  if (status === "evaluating") {
    return (
      <div className="flex-shrink-0 h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
    );
  }
  return <Clock size={16} className="text-slate-400 flex-shrink-0" />;
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[status]}`}
    >
      {status}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState<number | null>(null);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const nextId = useRef(100);

  // ── Fetch on mount ──
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/pipeline");
        if (res.ok) {
          const data: QueueItem[] = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setQueue(data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // fall through to mock
      }
      setQueue(MOCK_DATA);
      setLoading(false);
    }
    load();
  }, []);

  // ── Add URL (optimistic) ──
  function addUrl(raw: string) {
    const url = raw.trim();
    if (!url || !url.startsWith("http")) return;

    // Optimistic update
    const item: QueueItem = {
      id: nextId.current++,
      url,
      status: "pending",
    };
    setQueue((prev) => [...prev, item]);
    setNewUrl("");

    // Persist in background (best-effort)
    fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  }

  // ── Remove (optimistic) ──
  function removeItem(id: number) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  // ── Evaluate (optimistic toggle to evaluating) ──
  function evaluateItem(id: number) {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "evaluating" } : item
      )
    );
  }

  // ── Skip (optimistic toggle to done) ──
  function skipItem(id: number) {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "done" } : item
      )
    );
  }

  // ── Scrape job posting ──
  async function scrapeItem(id: number, url: string) {
    setScraping(id);
    setScrapeResult(null);
    setScrapeError(null);
    try {
      const res = await fetch("/api/pipeline/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as ScrapeResult & { error?: string };
      if (!res.ok || data.error) {
        setScrapeError(data.error ?? `Server error ${res.status}`);
      } else {
        setScrapeResult(data);
      }
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : "Network error");
    } finally {
      setScraping(null);
    }
  }

  // ── Progress stats ──
  const total = queue.length;
  const done = queue.filter((i) => i.status === "done").length;
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex flex-col gap-6 min-h-0">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Pipeline Queue</h1>
        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors">
          <Play size={15} />
          Run Batch
        </button>
      </div>

      {/* ── Add URL bar ── */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addUrl(newUrl);
          }}
          placeholder="Paste a job URL to add… (must start with https://)"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
        />
        <button
          onClick={() => addUrl(newUrl)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* ── Scrape error ── */}
      {scrapeError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Scrape failed</p>
            <p className="mt-0.5 font-mono text-xs">{scrapeError}</p>
          </div>
          <button onClick={() => setScrapeError(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">&#x2715;</button>
        </div>
      )}

      {/* ── Scrape result ── */}
      {scrapeResult && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-indigo-300">Scraped: {scrapeResult.title}</p>
            <button onClick={() => setScrapeResult(null)} className="text-xs text-slate-400 hover:text-slate-200">&#x2715;</button>
          </div>
          <p className="text-xs text-slate-400">{scrapeResult.company}</p>
          <pre className="max-h-40 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-300 whitespace-pre-wrap">
            {scrapeResult.description.slice(0, 1500)}{scrapeResult.description.length > 1500 ? "\n…" : ""}
          </pre>
          <p className="text-xs text-slate-500">Copy the description above and paste it into the Evaluator to score this role.</p>
        </div>
      )}

      {/* ── Queue list ── */}
      <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
            Loading queue…
          </div>
        ) : queue.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-slate-400 text-sm font-medium">
              Queue is empty — add a URL above
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-700">
            {queue.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors"
              >
                {/* Status icon */}
                <StatusIcon status={item.status} />

                {/* URL */}
                <span className="flex-1 min-w-0 truncate font-mono text-sm text-slate-300">
                  {item.url}
                </span>

                {/* Status pill */}
                <StatusPill status={item.status} />

                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Scrape */}
                  <button
                    onClick={() => scrapeItem(item.id, item.url)}
                    disabled={scraping === item.id}
                    title="Scrape job posting"
                    className="rounded p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-40"
                  >
                    {scraping === item.id
                      ? <div className="h-[15px] w-[15px] rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      : <Globe size={15} />
                    }
                  </button>

                  {/* Evaluate */}
                  <button
                    onClick={() => evaluateItem(item.id)}
                    title="Evaluate"
                    className="rounded p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  >
                    <Zap size={15} />
                  </button>

                  {/* Skip */}
                  <button
                    onClick={() => skipItem(item.id)}
                    title="Skip"
                    className="rounded p-1.5 text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                  >
                    <SkipForward size={15} />
                  </button>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    title="Remove"
                    className="rounded p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Progress bar ── */}
      {total > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400 font-medium">
              {done} / {total} complete
            </span>
            <span className="text-xs text-slate-500">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
