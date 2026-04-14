"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Search } from "lucide-react";

interface Company {
  name: string;
  tier: number;
  openRoles: number;
  lastScanned: string;
  slug: string;
}

const MOCK_COMPANIES: Company[] = [
  { name: "Anthropic",    tier: 1, openRoles: 3, lastScanned: "2h ago",  slug: "anthropic"   },
  { name: "OpenAI",       tier: 1, openRoles: 7, lastScanned: "4h ago",  slug: "openai"      },
  { name: "DeepMind",     tier: 1, openRoles: 2, lastScanned: "1d ago",  slug: "deepmind"    },
  { name: "Cohere",       tier: 2, openRoles: 4, lastScanned: "6h ago",  slug: "cohere"      },
  { name: "Mistral AI",   tier: 2, openRoles: 1, lastScanned: "2d ago",  slug: "mistral"     },
  { name: "Hugging Face", tier: 2, openRoles: 5, lastScanned: "12h ago", slug: "huggingface" },
  { name: "Groq",         tier: 2, openRoles: 2, lastScanned: "1d ago",  slug: "groq"        },
  { name: "Together AI",  tier: 3, openRoles: 3, lastScanned: "3d ago",  slug: "together"    },
  { name: "Perplexity",   tier: 3, openRoles: 1, lastScanned: "2d ago",  slug: "perplexity"  },
  { name: "Stability AI", tier: 3, openRoles: 2, lastScanned: "5d ago",  slug: "stability"   },
  { name: "Replicate",    tier: 4, openRoles: 1, lastScanned: "7d ago",  slug: "replicate"   },
  { name: "LangChain",    tier: 4, openRoles: 2, lastScanned: "6d ago",  slug: "langchain"   },
];

const TIER_BADGE: Record<number, string> = {
  1: "bg-violet-500/30 text-violet-300",
  2: "bg-blue-500/20 text-blue-300",
  3: "bg-slate-500/20 text-slate-400",
  4: "bg-slate-700/40 text-slate-500",
};

export default function ScannerPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanBanner, setScanBanner] = useState<{ type: "info" | "error"; msg: string } | null>(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState(0);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/scanner");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setCompanies(data);
    } catch {
      setCompanies(MOCK_COMPANIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleScanAll = async () => {
    setScanning(true);
    setScanBanner(null);
    try {
      const res = await fetch("/api/scanner", { method: "POST" });
      const data = (await res.json()) as { started?: boolean; error?: string };
      if (!res.ok || data.error) {
        setScanBanner({ type: "error", msg: data.error ?? `Server error ${res.status}` });
      } else {
        setScanBanner({ type: "info", msg: "Scan started in the background — refresh in a moment to see updated results." });
      }
    } catch (err) {
      setScanBanner({ type: "error", msg: err instanceof Error ? err.message : "Network error" });
    } finally {
      setScanning(false);
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
          <RefreshCw
            className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`}
          />
          Scan All
        </button>
      </div>

      {/* Scan banner */}
      {scanBanner && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            scanBanner.type === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
          }`}
        >
          <span>{scanBanner.msg}</span>
          <button
            onClick={() => setScanBanner(null)}
            className="ml-4 shrink-0 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
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

        {/* Tier pills */}
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
      ) : filtered.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/20 text-slate-500">
          No companies match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((company) => (
            <CompanyCard key={company.slug} company={company} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const badgeClass = TIER_BADGE[company.tier] ?? TIER_BADGE[4];

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 transition hover:border-indigo-500/50 hover:bg-slate-800/60">
      {/* Top row: avatar + tier badge */}
      <div className="flex items-center justify-between">
        {/* Letter avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-sm font-bold text-slate-300 transition group-hover:bg-indigo-500/20 group-hover:text-indigo-300">
          {company.name.charAt(0)}
        </div>

        {/* Tier badge */}
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          T{company.tier}
        </span>
      </div>

      {/* Company name */}
      <p className="font-semibold text-slate-200">{company.name}</p>

      {/* Bottom row: open roles + last scanned */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">
          <span className="font-medium">{company.openRoles}</span> open role
          {company.openRoles !== 1 ? "s" : ""}
        </span>
        <span className="text-slate-500">{company.lastScanned}</span>
      </div>
    </div>
  );
}
