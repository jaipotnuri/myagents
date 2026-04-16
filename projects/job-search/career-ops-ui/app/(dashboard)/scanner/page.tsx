"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search, AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Company {
  name: string;
  tier: number;
  openRoles: number;
  lastScanned: string;
  slug: string;
  url?: string;
  isLive?: boolean;
  lastStatus?: string;
}

interface ScanResult {
  url: string;
  live: boolean;
  status: "active" | "expired" | "uncertain";
}

interface ScanResponse {
  started?: boolean;
  results?: ScanResult[];
  error?: string;
  message?: string;
  urlsChecked?: number;
}

const TIER_BADGE: Record<number, string> = {
  1: "bg-violet-500/30 text-violet-300",
  2: "bg-blue-500/20 text-blue-300",
  3: "bg-slate-500/20 text-slate-400",
  4: "bg-slate-700/40 text-slate-500",
};

type BannerType = "info" | "error" | "warn" | "success";

interface Banner {
  type: BannerType;
  msg: string;
}

const BANNER_STYLES: Record<BannerType, string> = {
  info: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  success: "border-green-500/30 bg-green-500/10 text-green-300",
  warn: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
};

export default function ScannerPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanBanner, setScanBanner] = useState<Banner | null>(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState(0);
  const [scanningRows, setScanningRows] = useState<Set<string>>(new Set());
  const [rowResults, setRowResults] = useState<Map<string, ScanResult>>(new Map());

  const fetchCompanies = async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/scanner");
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? `Server error ${res.status}`);
        setCompanies([]);
      } else {
        setCompanies(data as Company[]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Network error");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleScanAll = async () => {
    setScanning(true);
    setScanBanner({ type: "info", msg: "Scanning portals… this may take up to 2 minutes" });

    try {
      const res = await fetch("/api/scanner", { method: "POST" });
      const data = (await res.json()) as ScanResponse;

      if (!res.ok || data.error) {
        setScanBanner({ type: "error", msg: data.error ?? `Server error ${res.status}` });
        return;
      }

      if (data.message) {
        setScanBanner({ type: "warn", msg: data.message });
        return;
      }

      const results = data.results ?? [];
      const live = results.filter((r) => r.live).length;
      const unreachable = results.filter((r) => !r.live).length;

      await fetchCompanies();

      setScanBanner({
        type: live > 0 ? "success" : "warn",
        msg: `Scan complete — ${live} live, ${unreachable} unreachable`,
      });
    } catch (err) {
      setScanBanner({ type: "error", msg: err instanceof Error ? err.message : "Network error" });
    } finally {
      setScanning(false);
    }
  };

  const handleScanRow = async (company: Company) => {
    if (!company.url) return;

    setScanningRows((prev) => new Set(Array.from(prev).concat(company.slug)));

    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: company.url }),
      });
      const data = (await res.json()) as ScanResponse;
      const result = data.results?.[0];
      if (result) {
        setRowResults((prev) => {
          const next = new Map(Array.from(prev.entries()));
          next.set(company.url!, result);
          return next;
        });
      }
    } catch {
      // per-row scan failure is silent — the row just stays unchanged
    } finally {
      setScanningRows((prev) => {
        const next = new Set(prev);
        next.delete(company.slug);
        return next;
      });
    }
  };

  const filtered = companies.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === 0 || c.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Company Scanner</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track open roles across target companies
          </p>
        </div>
        <button
          onClick={handleScanAll}
          disabled={scanning}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {scanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {scanning ? "Scanning…" : "Scan All"}
        </button>
      </div>

      {/* Load error */}
      {loadError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load companies</p>
            <p className="mt-0.5 font-mono text-xs">{loadError}</p>
            <p className="mt-1 text-xs text-red-300/70">
              Make sure CAREER_OPS_DIR is set in .env.local and portals.yml exists.
            </p>
          </div>
        </div>
      )}

      {/* Scan banner */}
      {scanBanner && (
        <div
          className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm ${BANNER_STYLES[scanBanner.type]}`}
        >
          <div className="flex items-center gap-2">
            {scanning && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{scanBanner.msg}</span>
          </div>
          {!scanning && (
            <button
              onClick={() => setScanBanner(null)}
              className="ml-4 shrink-0 text-xs opacity-60 hover:opacity-100"
            >
              &#x2715;
            </button>
          )}
        </div>
      )}

      {/* Full-portal scan note */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 px-4 py-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-400">Note:</span> &quot;Scan All&quot; checks
        liveness of URLs already in your pipeline. To discover new roles across all 70+ portals,
        run{" "}
        <code className="rounded bg-slate-700 px-1 py-0.5 font-mono">/career-ops scan</code> in
        the Claude Code CLI.
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none ring-0 transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                tierFilter === t
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              }`}
            >
              {t === 0 ? "All" : `T${t}`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-slate-700/60 bg-slate-800/40"
            />
          ))}
        </div>
      ) : !loadError && filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/20 text-slate-500">
          No companies match your filters.
        </div>
      ) : !loadError ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <CompanyCard
              key={company.slug}
              company={company}
              isScanning={scanningRows.has(company.slug)}
              rowResult={company.url ? rowResults.get(company.url) : undefined}
              onScan={handleScanRow}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface CompanyCardProps {
  company: Company;
  isScanning: boolean;
  rowResult?: ScanResult;
  onScan: (company: Company) => void;
}

function CompanyCard({ company, isScanning, rowResult, onScan }: CompanyCardProps) {
  const badgeClass = TIER_BADGE[company.tier] ?? TIER_BADGE[4];

  // Determine effective liveness: prefer fresh row-level result, fall back to history
  const effectiveLive = rowResult ? rowResult.live : company.isLive;
  const showLiveness = rowResult !== undefined || company.isLive !== undefined;

  // Format date string (ISO → short date if applicable)
  const displayDate = (() => {
    if (!company.lastScanned || company.lastScanned === "never") return "never";
    const d = new Date(company.lastScanned);
    if (!isNaN(d.getTime())) return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return company.lastScanned;
  })();

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 transition hover:border-indigo-500/50 hover:bg-slate-800/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-sm font-bold text-slate-300 transition group-hover:bg-indigo-500/20 group-hover:text-indigo-300">
            {company.name.charAt(0)}
          </div>
          {showLiveness && (
            <span className="flex items-center">
              {effectiveLive ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400/70" />
              )}
            </span>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
          T{company.tier}
        </span>
      </div>

      <p className="font-semibold text-slate-200">{company.name}</p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">
          <span className="font-medium">{company.openRoles}</span> open role
          {company.openRoles !== 1 ? "s" : ""}
        </span>
        <span className="text-slate-500">{displayDate}</span>
      </div>

      {/* Per-row scan button */}
      {company.url && (
        <button
          onClick={() => onScan(company)}
          disabled={isScanning}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-700/40 py-1.5 text-xs font-medium text-slate-400 transition hover:border-indigo-500/50 hover:bg-slate-700 hover:text-slate-200 disabled:opacity-50"
        >
          {isScanning ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Search className="h-3 w-3" />
              Scan
            </>
          )}
        </button>
      )}
    </div>
  );
}
