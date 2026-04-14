/**
 * Reports Viewer — two-panel layout for browsing AI-generated evaluation reports.
 *
 * Left panel  (1/3): Scrollable list of report files with metadata
 * Right panel (2/3): Full markdown content of the selected report
 */
"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, ExternalLink } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportMeta {
  id: string;
  filename: string;
  company: string;
  role: string;
  score: number;
  date: string;
  filePath: string;
}

interface ReportContent {
  id: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Mock data — used as fallback when the API returns nothing
// ---------------------------------------------------------------------------

const MOCK_REPORTS: ReportMeta[] = [
  {
    id: "groq-ai-infra",
    filename: "groq-ai-infra.md",
    company: "Groq",
    role: "AI Infra Engineer",
    score: 4.6,
    date: "Mar 25",
    filePath: "",
  },
  {
    id: "anthropic-staff",
    filename: "anthropic-staff.md",
    company: "Anthropic",
    role: "Staff AI Engineer",
    score: 4.8,
    date: "Apr 1",
    filePath: "",
  },
  {
    id: "openai-research",
    filename: "openai-research.md",
    company: "OpenAI",
    role: "Research Engineer",
    score: 4.5,
    date: "Apr 3",
    filePath: "",
  },
  {
    id: "cohere-ml",
    filename: "cohere-ml.md",
    company: "Cohere",
    role: "ML Platform Engineer",
    score: 4.1,
    date: "Apr 5",
    filePath: "",
  },
  {
    id: "mistral-senior",
    filename: "mistral-senior.md",
    company: "Mistral AI",
    role: "Sr Software Engineer",
    score: 3.8,
    date: "Apr 6",
    filePath: "",
  },
];

const MOCK_CONTENT: Record<string, string> = {
  "groq-ai-infra": `## Summary\nStrong match for AI infrastructure role. Deep expertise in distributed systems aligns well with Groq's LPU architecture requirements.\n\n## Strengths\n- Extensive Kubernetes and GPU cluster experience\n- Strong C++/CUDA background\n- Open source contributions to MLOps tooling\n\n## Gaps\n- Limited experience with custom silicon toolchains\n- No prior startup experience at this scale\n\n## Recommendation\nHighly recommended to apply. Tailor cover letter to emphasize distributed training infrastructure work.`,
  "anthropic-staff": `## Summary\nTop-tier match. Background in safety-focused AI research directly aligns with Anthropic's core mission.\n\n## Strengths\n- Published research on alignment and interpretability\n- Strong Python and PyTorch foundation\n- Experience with RLHF pipelines\n\n## Gaps\n- Staff-level scope may require more leadership examples\n\n## Recommendation\nStrongly apply. Highlight safety research publications prominently.`,
  "openai-research": `## Summary\nExcellent fit for research engineering role. Strong combination of systems and research skills.\n\n## Strengths\n- Experience training large-scale transformer models\n- Strong publication record\n- Systems optimization background\n\n## Gaps\n- Less exposure to reinforcement learning from human feedback\n\n## Recommendation\nApply with emphasis on scaling infrastructure work.`,
  "cohere-ml": `## Summary\nGood match for ML platform work. Solid MLOps and infrastructure experience is a strong fit.\n\n## Strengths\n- End-to-end ML pipeline experience\n- Strong infrastructure and DevOps background\n- Experience with model serving at scale\n\n## Gaps\n- Less exposure to NLP-specific tooling\n- Cohere focuses heavily on enterprise; tailor messaging accordingly\n\n## Recommendation\nApply. Emphasize production ML platform work.`,
  "mistral-senior": `## Summary\nPartial match. Strong engineering skills but some gaps in distributed training experience expected for this level.\n\n## Strengths\n- Solid software engineering fundamentals\n- Some ML infrastructure exposure\n- Fast learner based on trajectory\n\n## Gaps\n- Limited experience with very large model training runs\n- European startup culture may differ from prior experience\n\n## Recommendation\nConsider applying but set expectations appropriately for the seniority level.`,
};

// ---------------------------------------------------------------------------
// Markdown renderer — simple line-by-line
// ---------------------------------------------------------------------------

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("## ")) {
          return (
            <p key={i} className="mt-4 mb-1 text-sm font-semibold text-slate-200 first:mt-0">
              {trimmed.slice(3)}
            </p>
          );
        }

        if (trimmed.startsWith("# ")) {
          return (
            <p key={i} className="mt-4 mb-1 text-base font-bold text-slate-100 first:mt-0">
              {trimmed.slice(2)}
            </p>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
              <span className="text-sm text-slate-300">{trimmed.slice(2)}</span>
            </div>
          );
        }

        if (trimmed === "") {
          return <div key={i} className="h-2" />;
        }

        // Strip basic bold markers for inline rendering
        const text = trimmed.replace(/\*\*(.+?)\*\*/g, "$1");
        return (
          <p key={i} className="text-sm text-slate-300 leading-relaxed">
            {text}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state (right panel)
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-600">
      <FileText className="h-10 w-10 opacity-40" />
      <p className="text-sm font-medium text-slate-500">Select a report</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left panel — report list item
// ---------------------------------------------------------------------------

interface ReportRowProps {
  report: ReportMeta;
  selected: boolean;
  onClick: () => void;
}

function ReportRow({ report, selected, onClick }: ReportRowProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left px-4 py-3 border-l-2 transition-colors",
        selected
          ? "border-l-indigo-500 bg-slate-700/60"
          : "border-l-transparent hover:bg-slate-700/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-200 leading-snug">
          {report.company}
        </span>
        {report.score > 0 && <ScoreBadge score={report.score} />}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-400">{report.role}</span>
        <span className="flex-shrink-0 text-xs text-slate-600">{report.date}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inner page (uses useSearchParams — needs Suspense boundary)
// ---------------------------------------------------------------------------

function ReportsInner() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [reportContent, setReportContent] = useState<ReportContent | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);

  // Fetch report list on mount
  useEffect(() => {
    fetch("/api/reports")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ReportMeta[]) => {
        const list = Array.isArray(data) && data.length > 0 ? data : MOCK_REPORTS;
        setReports(list);
      })
      .catch(() => setReports(MOCK_REPORTS))
      .finally(() => setLoadingList(false));
  }, []);

  // Fetch content whenever selectedId changes
  const fetchContent = useCallback((id: string) => {
    setLoadingContent(true);
    fetch(`/api/reports?id=${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ReportContent | null) => {
        if (data?.content) {
          setReportContent(data);
        } else if (MOCK_CONTENT[id]) {
          setReportContent({ id, content: MOCK_CONTENT[id] });
        } else {
          setReportContent({ id, content: "## No content available\n\nThis report file could not be loaded." });
        }
      })
      .catch(() => {
        const fallback = MOCK_CONTENT[id];
        setReportContent(fallback ? { id, content: fallback } : null);
      })
      .finally(() => setLoadingContent(false));
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchContent(selectedId);
    } else {
      setReportContent(null);
    }
  }, [selectedId, fetchContent]);

  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex h-full gap-0 overflow-hidden rounded-xl border border-slate-700">
      {/* ------------------------------------------------------------------ */}
      {/* Left panel — report list (1/3)                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex w-1/3 flex-shrink-0 flex-col border-r border-slate-700 bg-slate-800/60 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Reports
          </h2>
          {!loadingList && (
            <span className="rounded-full border border-slate-600 bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
              {reports.length}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-700/50">
          {loadingList ? (
            <div className="space-y-px animate-pulse p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded px-4 py-3 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-28 rounded bg-slate-700" />
                    <div className="h-4 w-10 rounded-full bg-slate-700" />
                  </div>
                  <div className="h-3 w-40 rounded bg-slate-700/60" />
                </div>
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FileText className="h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No reports found</p>
              <p className="mt-1 text-xs text-slate-600">
                Run the evaluator to generate reports
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                selected={selectedId === report.id}
                onClick={() => setSelectedId(report.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right panel — report content (2/3)                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 flex-col bg-slate-900 overflow-hidden">
        {!selectedId || !selectedReport ? (
          <EmptyState />
        ) : (
          <>
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-700 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-white leading-tight truncate">
                    {selectedReport.role}
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {selectedReport.company}
                    {selectedReport.date && (
                      <span className="ml-2 text-slate-600">· {selectedReport.date}</span>
                    )}
                  </p>
                </div>
                {selectedReport.score > 0 && (
                  <div className="flex-shrink-0 scale-125 origin-right">
                    <ScoreBadge score={selectedReport.score} />
                  </div>
                )}
              </div>
              <hr className="mt-4 border-slate-700" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loadingContent ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-24 rounded bg-slate-700" />
                  <div className="h-3 w-full rounded bg-slate-700/60" />
                  <div className="h-3 w-5/6 rounded bg-slate-700/60" />
                  <div className="h-3 w-4/6 rounded bg-slate-700/60" />
                  <div className="mt-4 h-4 w-20 rounded bg-slate-700" />
                  <div className="h-3 w-full rounded bg-slate-700/60" />
                  <div className="h-3 w-3/4 rounded bg-slate-700/60" />
                </div>
              ) : reportContent ? (
                <MarkdownRenderer content={reportContent.content} />
              ) : (
                <p className="text-sm text-slate-500">Could not load report content.</p>
              )}
            </div>

            {/* Footer */}
            {selectedReport.filePath && (
              <div className="flex-shrink-0 border-t border-slate-700 px-6 py-3">
                <a
                  href={`file://${selectedReport.filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-indigo-500 hover:text-indigo-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open full report
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper — Suspense required for useSearchParams in Next.js App Router
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden -m-6">
      {/* Page title bar */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700/60">
        <h1 className="text-2xl font-bold text-white">Evaluation Reports</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          AI-generated fit analysis for each applied role
        </p>
      </div>

      {/* Two-panel viewer */}
      <div className="flex-1 overflow-hidden p-6">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          }
        >
          <ReportsInner />
        </Suspense>
      </div>
    </div>
  );
}
