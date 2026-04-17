"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot,
  Play,
  StopCircle,
  FileText,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { ALLOWED_MODES, MODE_LABELS, AllowedMode } from "@/lib/agentModes";

// ---------------------------------------------------------------------------
// SSE event shapes (mirrored from agentRunner.ts)
// ---------------------------------------------------------------------------

interface AgentEvent {
  type: "thinking" | "tool_call" | "tool_result" | "done" | "error";
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  output?: string;
  filesWritten?: string[];
}

// ---------------------------------------------------------------------------
// Mode descriptions shown in the selector dropdown
// ---------------------------------------------------------------------------

const MODE_HINTS: Record<AllowedMode, string> = {
  scan: "Discover new AI roles across 70+ portals",
  oferta: "Evaluate a single job offer (A-F scoring + report)",
  ofertas: "Compare and rank multiple offers side-by-side",
  pipeline: "Process pending URLs from your pipeline inbox",
  tracker: "Summarise application status and next actions",
  "auto-pipeline": "Full auto-pipeline: evaluate → report → PDF → tracker",
  deep: "Deep company research before an interview or offer",
  apply: "Live application assistant — fills forms, drafts answers",
  project: "Evaluate a portfolio project idea against your goals",
  patterns: "Analyse rejection patterns and sharpen targeting",
  contacto: "Find LinkedIn contacts and draft outreach messages",
  "interview-prep": "Build company-specific interview prep report",
  pdf: "Generate an ATS-optimised CV PDF for a role",
  batch: "Batch-evaluate multiple jobs with parallel workers",
  training: "Evaluate a course or certification against your goals",
};

// Default input placeholder per mode
const MODE_PLACEHOLDERS: Record<AllowedMode, string> = {
  scan: "Leave blank to scan all portals, or enter a comma-separated company list",
  oferta: "Paste the job description or URL here",
  ofertas: "Paste two or more job descriptions, separated by ---",
  pipeline: "Leave blank to process all pending URLs",
  tracker: "Leave blank for a full overview, or filter by company/status",
  "auto-pipeline": "Paste a job URL",
  deep: "Company name or URL to research",
  apply: "Paste the application form questions or job URL",
  project: "Describe the project idea you want to evaluate",
  patterns: "Leave blank to analyse all rejections, or specify a date range",
  contacto: "Company name or LinkedIn URL to find contacts at",
  "interview-prep": "Company name and role you are interviewing for",
  pdf: "Company name and role to tailor the CV PDF for",
  batch: "Paste a list of job URLs, one per line",
  training: "Course / certification name and provider",
};

// ---------------------------------------------------------------------------
// EventLine component — renders one streamed event
// ---------------------------------------------------------------------------

function EventLine({ event }: { event: AgentEvent }) {
  if (event.type === "thinking") {
    return (
      <div className="flex gap-3 py-2 border-b border-slate-700/40">
        <Bot className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400" />
        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
          {event.text}
        </p>
      </div>
    );
  }

  if (event.type === "tool_call") {
    const inputStr = event.input
      ? Object.entries(event.input)
          .map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 80)}`)
          .join(", ")
      : "";
    return (
      <div className="flex items-start gap-3 py-1.5 border-b border-slate-700/40">
        <Wrench className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
        <p className="font-mono text-xs text-amber-300">
          <span className="font-semibold">{event.name}</span>
          {inputStr && (
            <span className="text-amber-400/70 ml-1">({inputStr})</span>
          )}
        </p>
      </div>
    );
  }

  if (event.type === "tool_result") {
    return (
      <div className="flex items-start gap-3 py-1.5 border-b border-slate-700/40 pl-6">
        <span className="mt-0.5 text-slate-500 text-xs">↳</span>
        <p className="font-mono text-xs text-slate-500 truncate max-w-[640px]">
          {event.content}
        </p>
      </div>
    );
  }

  if (event.type === "error") {
    return (
      <div className="flex items-start gap-3 py-2 border-b border-red-700/40">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
        <p className="text-sm text-red-400">{event.text}</p>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function AgentPageInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AllowedMode>("oferta");
  const [input, setInput] = useState("");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{
    output: string;
    filesWritten: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Pre-fill from query params (e.g. from Pipeline page evaluate button)
  useEffect(() => {
    const qMode = searchParams.get("mode") as AllowedMode | null;
    const qInput = searchParams.get("input");
    if (qMode && (ALLOWED_MODES as readonly string[]).includes(qMode)) {
      setMode(qMode);
    }
    if (qInput) {
      setInput(qInput);
    }
  }, [searchParams]);
  const outputRef = useRef<HTMLDivElement>(null);

  function appendEvent(ev: AgentEvent) {
    setEvents((prev) => [...prev, ev]);
    // Auto-scroll
    requestAnimationFrame(() => {
      outputRef.current?.scrollTo({
        top: outputRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  async function handleRun() {
    if (running) return;

    setEvents([]);
    setDone(null);
    setError(null);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/agent/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(text || `Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const dataLine = chunk.trim();
          if (!dataLine.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(dataLine.slice(6)) as AgentEvent;
            if (ev.type === "done") {
              setDone({ output: ev.output ?? "", filesWritten: ev.filesWritten ?? [] });
            } else if (ev.type === "error") {
              setError(ev.text ?? "Unknown error");
              appendEvent(ev);
            } else {
              appendEvent(ev);
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  const thinkingCount = events.filter((e) => e.type === "thinking").length;
  const toolCallCount = events.filter((e) => e.type === "tool_call").length;

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-400" />
            Agent Runner
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Run any career-ops command with live Claude tool-use streaming
          </p>
        </div>
      </div>

      {/* ── Control panel ── */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 space-y-4">
        {/* Mode selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Command
          </label>
          <div className="relative">
            <button
              onClick={() => setShowModeMenu((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 hover:border-indigo-500/50 transition-colors"
            >
              <div className="text-left">
                <span className="font-medium">{MODE_LABELS[mode]}</span>
                <span className="ml-2 text-slate-500">
                  /career-ops {mode}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showModeMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showModeMenu && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  {(ALLOWED_MODES as readonly AllowedMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setShowModeMenu(false);
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-slate-800 ${
                        m === mode
                          ? "bg-indigo-600/20 border-l-2 border-indigo-500"
                          : "border-l-2 border-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-200">
                          {MODE_LABELS[m]}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {MODE_HINTS[m]}
                        </p>
                      </div>
                      <span className="flex-shrink-0 font-mono text-xs text-slate-600 mt-0.5">
                        {m}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">{MODE_HINTS[mode]}</p>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Input
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={MODE_PLACEHOLDERS[mode]}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {running ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 rounded-lg bg-red-600/80 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
            >
              <StopCircle className="h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <Play className="h-4 w-4" />
              Run Command
            </button>
          )}

          {running && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Running {MODE_LABELS[mode]}…
            </div>
          )}

          {done && !running && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </div>
          )}

          {error && !running && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4" />
              Failed
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      {(events.length > 0 || done) && (
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <span>{thinkingCount} thinking step{thinkingCount !== 1 ? "s" : ""}</span>
          <span>{toolCallCount} tool call{toolCallCount !== 1 ? "s" : ""}</span>
          {done && (
            <span>
              {done.filesWritten.length} file{done.filesWritten.length !== 1 ? "s" : ""} written
            </span>
          )}
        </div>
      )}

      {/* ── Streaming output ── */}
      {events.length > 0 && (
        <div
          ref={outputRef}
          className="flex-1 min-h-0 rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-y-auto divide-y divide-transparent"
          style={{ maxHeight: "42vh" }}
        >
          <div className="px-4 py-1">
            {events.map((ev, i) => (
              <EventLine key={i} event={ev} />
            ))}
          </div>
        </div>
      )}

      {/* ── Final output ── */}
      {done && (
        <div className="space-y-4">
          {done.output && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 space-y-2">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
                Final Output
              </p>
              <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-mono">
                {done.output}
              </pre>
            </div>
          )}

          {done.filesWritten.length > 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/30 px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Files Written
              </p>
              <ul className="space-y-1">
                {done.filesWritten.map((f) => (
                  <li key={f} className="font-mono text-xs text-slate-300">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {events.length === 0 && !running && !done && (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-slate-700/40 bg-slate-800/20 text-slate-500 min-h-[120px]">
          <div className="text-center space-y-2">
            <Bot className="h-8 w-8 mx-auto text-slate-600" />
            <p className="text-sm">
              Select a command, provide input, and click{" "}
              <span className="text-slate-400 font-medium">Run Command</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500">Loading…</div>}>
      <AgentPageInner />
    </Suspense>
  );
}
