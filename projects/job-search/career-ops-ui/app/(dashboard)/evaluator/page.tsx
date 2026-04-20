"use client";

import { useRef, useState } from "react";
import { Zap, CheckCircle, Loader2, Send, Bot, User } from "lucide-react";

// Modes that use the structured /api/evaluate endpoint (scorecard output)
const EVAL_MODES = new Set(["oferta", "deep", "training"]);

// Chat message for interactive agent modes
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Mock evaluation result — same shape returned by POST /api/evaluate
// ---------------------------------------------------------------------------
const MOCK_RESULT = {
  title: "Staff AI Engineer",
  company: "Anthropic",
  location: "Remote",
  compensation: "$280K–$350K",
  globalScore: 4.5,
  dimensions: [
    { label: "CV Match",             weight: 30, score: 4.7 },
    { label: "North Star Alignment", weight: 25, score: 4.5 },
    { label: "Compensation",         weight: 15, score: 4.0 },
    { label: "Cultural Signals",     weight: 15, score: 4.8 },
    { label: "Red Flags (inverted)", weight: 15, score: 4.3 },
  ],
  strengths: [
    "Deep alignment with Anthropic's Constitutional AI research direction",
    "Strong production ML experience matching Staff-level expectations",
    "Prior RLHF / fine-tuning work directly relevant to team roadmap",
  ],
  risks: [
    "Compensation top-of-band may require negotiation leverage",
    "Remote collaboration culture requires proactive async communication",
  ],
  recommendation:
    "Your profile is an exceptionally strong fit. Lead with your RLHF contributions and Constitutional AI alignment in the cover letter. Request the upper band and stock refresh in negotiation.",
};

type EvalResult = typeof MOCK_RESULT & { _mock?: boolean };
type Mode = "oferta" | "deep" | "training" | "interview-prep" | "contacto" | "pdf" | "apply";

const MODE_LABELS: Record<Mode, string> = {
  oferta:           "Evaluate Offer",
  deep:             "Deep Research",
  training:         "Training/Course",
  "interview-prep": "Interview Prep",
  contacto:         "LinkedIn Outreach",
  pdf:              "Generate CV PDF",
  apply:            "Apply Assistant",
};

const MODE_HINTS: Record<Mode, string> = {
  oferta:           "Paste a job description or job posting URL",
  deep:             "Paste a company name, URL, or job link for deep research",
  training:         "Paste a course name, URL, or describe the certification",
  "interview-prep": "Paste a company name and role, or a job link",
  contacto:         "Paste a job link or company name to find LinkedIn contacts",
  pdf:              "Paste the job description or role title to tailor the CV for",
  apply:            "Paste the job application URL or job description",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function scoreStyle(score: number) {
  if (score >= 4.5)
    return { bar: "bg-green-500",    text: "text-green-400",  bg: "bg-green-500/20",   border: "border-green-500/40"  };
  if (score >= 4.0)
    return { bar: "bg-blue-500",     text: "text-blue-400",   bg: "bg-blue-500/20",    border: "border-blue-500/40"   };
  if (score >= 3.5)
    return { bar: "bg-yellow-500",   text: "text-yellow-400", bg: "bg-yellow-500/20",  border: "border-yellow-500/40" };
  return   { bar: "bg-red-500",      text: "text-red-400",    bg: "bg-red-500/20",     border: "border-red-500/40"    };
}

function recommendationBanner(score: number) {
  if (score >= 4.5)
    return { label: "✓ Strong match — Apply immediately",          cls: "bg-green-500/15 border-green-500/30 text-green-400"  };
  if (score >= 4.0)
    return { label: "↑ Apply with a strong cover letter",          cls: "bg-blue-500/15  border-blue-500/30  text-blue-400"   };
  return   { label: "~ Apply with reason — address gaps first",    cls: "bg-yellow-500/15 border-yellow-500/30 text-yellow-400" };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function GlobalScore({ score }: { score: number }) {
  const { text, bg, border } = scoreStyle(score);
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-xl border px-5 py-3 ${bg} ${border}`}>
      <span className={`text-3xl font-bold tabular-nums leading-none ${text}`}>
        {score.toFixed(1)}
      </span>
      <span className="mt-1 text-[10px] text-slate-500">/ 5.0</span>
    </div>
  );
}

function DimensionRow({ label, weight, score }: { label: string; weight: number; score: number }) {
  const { bar, text } = scoreStyle(score);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-48 shrink-0">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <span className="ml-1.5 text-[10px] text-slate-500">{weight}%</span>
      </div>
      <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${bar}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <span className={`w-8 text-right text-xs font-bold tabular-nums ${text}`}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function EvaluatorPage() {
  const [mode, setMode]           = useState<Mode>("oferta");
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<EvalResult | null>(null);
  const [saved, setSaved]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Agent chat state (for non-eval modes)
  const [chatHistory, setChatHistory]   = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState("");
  const [agentStreaming, setAgentStreaming] = useState(false);
  const [agentStreamText, setAgentStreamText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isAgentMode = !EVAL_MODES.has(mode);

  function resetChat() {
    setChatHistory([]);
    setChatInput("");
    setAgentStreamText("");
  }

  async function streamAgentMode(userMsg: string, history: ChatMessage[]) {
    setAgentStreaming(true);
    setAgentStreamText("");

    const allHistory: ChatMessage[] = [...history, { role: "user", content: userMsg }];
    setChatHistory(allHistory);

    let accumulated = "";
    try {
      const res = await fetch(`/api/agent/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: userMsg,
          conversationHistory: history,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err || res.statusText}` },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "thinking" && event.text) {
              accumulated += event.text;
              setAgentStreamText(accumulated);
            } else if (event.type === "done") {
              if (event.output) accumulated = event.output;
              setAgentStreamText(accumulated);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      accumulated = `Connection error: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: accumulated || "(No output)" },
      ]);
      setAgentStreamText("");
      setAgentStreaming(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function handleEvaluate() {
    if (!input.trim()) return;

    if (isAgentMode) {
      resetChat();
      await streamAgentMode(input.trim(), []);
      return;
    }

    setLoading(true);
    setResult(null);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), mode }),
      });
      const data = await res.json() as EvalResult & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? `Server error ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleChatReply() {
    if (!chatInput.trim() || agentStreaming) return;
    const msg = chatInput.trim();
    setChatInput("");
    await streamAgentMode(msg, chatHistory);
  }

  async function handleSave() {
    if (!result || saving || saved) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: result.company,
          role: result.title,
          score: result.globalScore,
          notes: result.recommendation.slice(0, 120),
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || data.error) {
        setSaveError(data.error ?? `Server error ${res.status}`);
      } else {
        setSaved(true);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  const banner = result ? recommendationBanner(result.globalScore) : null;

  return (
    /**
     * -m-6 cancels the parent <main>'s p-6 so the two-column grid
     * can bleed edge-to-edge and fill the full remaining viewport height.
     */
    <div className="-m-6 flex h-[calc(100vh)] flex-col overflow-hidden">
      <div className="grid flex-1 grid-cols-2 overflow-hidden">

        {/* ────────────────────────────────────────────────────────────────
            LEFT PANEL — Input
        ──────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 overflow-hidden border-r border-slate-700 bg-slate-900 p-6">

          {/* Title */}
          <div>
            <h1 className="text-xl font-bold text-white">Job Evaluator</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Evaluate a role against your profile
            </p>
          </div>

          {/* Mode pills */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  mode === m
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
                ].join(" ")}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Mode hint */}
          <p className="text-xs text-slate-500 -mt-2">{MODE_HINTS[mode]}</p>

          {/* Textarea — grows to fill remaining space */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={MODE_HINTS[mode]}
            className="
              flex-1 resize-none rounded-lg border border-slate-600 bg-slate-900 p-4
              font-mono text-sm text-slate-200 placeholder-slate-600
              focus:border-indigo-500 focus:outline-none
              min-h-0
            "
          />

          {/* Submit button */}
          <button
            onClick={handleEvaluate}
            disabled={(isAgentMode ? agentStreaming : loading) || !input.trim()}
            className="
              flex w-full items-center justify-center gap-2 rounded-lg
              bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white
              transition-colors hover:bg-indigo-500
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {(isAgentMode ? agentStreaming : loading) ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {isAgentMode ? "Running…" : "Evaluating…"}
              </>
            ) : (
              <>
                <Zap size={15} />
                {isAgentMode ? "Run" : "Evaluate"}
              </>
            )}
          </button>
        </div>

        {/* ────────────────────────────────────────────────────────────────
            RIGHT PANEL — Results or Chat
        ──────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden bg-slate-900">

          {/* ── AGENT CHAT MODE ── */}
          {isAgentMode && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Chat thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && !agentStreaming && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                    <Bot size={40} strokeWidth={1.2} />
                    <p className="text-sm">{MODE_HINTS[mode]}</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 mt-1 h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center">
                        <Bot size={12} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-slate-800 text-slate-200 rounded-tl-sm"
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 mt-1 h-6 w-6 rounded-full bg-slate-600 flex items-center justify-center">
                        <User size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {/* Streaming bubble */}
                {agentStreaming && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 mt-1 h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center">
                      <Bot size={12} className="text-white" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3 text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                      {agentStreamText || <span className="flex gap-1 items-center text-slate-500"><Loader2 size={12} className="animate-spin" /> Running…</span>}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              {/* Reply input */}
              {chatHistory.length > 0 && (
                <div className="flex-shrink-0 border-t border-slate-700 p-3 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatReply(); }}}
                    placeholder="Reply to Claude… (Enter to send)"
                    disabled={agentStreaming}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleChatReply}
                    disabled={agentStreaming || !chatInput.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <Send size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── EVAL SCORECARD MODE ── */}
          {!isAgentMode && (
            <div className="flex flex-col overflow-y-auto flex-1">

          {/* Empty state */}
          {!loading && !result && !error && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-600">
              <Zap size={42} strokeWidth={1.2} />
              <p className="text-sm">Paste a JD and hit Evaluate</p>
              <p className="text-[11px] text-slate-700">
                Requires <code className="font-mono">ANTHROPIC_API_KEY</code> in{" "}
                <code className="font-mono">.env.local</code>
              </p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8">
              <p className="text-sm font-semibold text-red-400">Evaluation failed</p>
              <p className="text-center text-xs text-slate-500">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Loader2 size={36} className="animate-spin text-indigo-500" />
              <p className="text-sm text-slate-500">Calling Claude…</p>
            </div>
          )}

          {/* Result state */}
          {!loading && result && (
            <div className="flex flex-col gap-5 p-6">

              {/* Header row: title + global score badge */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{result.title}</h2>
                    {result._mock && (
                      <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-400 border border-yellow-500/30">
                        mock — add ANTHROPIC_API_KEY
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-400">{result.company}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {result.location} · {result.compensation}
                  </p>
                </div>
                <GlobalScore score={result.globalScore} />
              </div>

              {/* Recommendation callout */}
              {banner && (
                <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${banner.cls}`}>
                  {banner.label}
                </div>
              )}

              {/* Dimension rows */}
              <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 divide-y divide-slate-700">
                {result.dimensions.map((d) => (
                  <DimensionRow
                    key={d.label}
                    label={d.label}
                    weight={d.weight}
                    score={d.score}
                  />
                ))}
              </div>

              <hr className="border-slate-700" />

              {/* Strengths */}
              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Strengths
                </h3>
                <ul className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-0.5 shrink-0 text-green-400">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Risks
                </h3>
                <ul className="space-y-2">
                  {result.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-0.5 shrink-0 text-yellow-400">⚠</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendation */}
              <div>
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Recommendation
                </h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  {result.recommendation}
                </p>
              </div>

              <hr className="border-slate-700" />

              {/* Save to Tracker */}
              {saveError && (
                <p className="text-center text-xs text-red-400">{saveError}</p>
              )}
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="
                  flex w-full items-center justify-center gap-2 rounded-lg
                  bg-green-600 px-4 py-2.5 text-sm font-semibold text-white
                  transition-colors hover:bg-green-500
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} />
                    {saved ? "Saved to Tracker" : "Save to Tracker"}
                  </>
                )}
              </button>
            </div>
          )}
            </div> {/* end eval scroll container */}
          )} {/* end !isAgentMode */}
        </div>

      </div>
    </div>
  );
}
