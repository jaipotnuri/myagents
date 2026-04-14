import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Directory resolution
// ---------------------------------------------------------------------------

const CAREER_OPS_DIR =
  process.env.CAREER_OPS_DIR ?? path.join(process.cwd(), "..", "..");

// ---------------------------------------------------------------------------
// Mock fallback — returned when ANTHROPIC_API_KEY is not configured
// ---------------------------------------------------------------------------

const MOCK_EVALUATION = {
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

// ---------------------------------------------------------------------------
// Read a mode file from modes/ directory
// ---------------------------------------------------------------------------

function readModeFile(mode: string): string | null {
  const allowedModes = ["oferta", "deep", "training"];
  const safeName = allowedModes.includes(mode) ? mode : "oferta";
  const filePath = path.join(CAREER_OPS_DIR, "modes", `${safeName}.md`);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

// ---------------------------------------------------------------------------
// JSON output instruction appended to the system prompt
// ---------------------------------------------------------------------------

const JSON_INSTRUCTION = `

---

## IMPORTANT — Structured JSON Response Required

After your analysis, output ONLY a valid JSON object (no markdown fences, no prose) with this exact shape:

{
  "title": "<job title>",
  "company": "<company name>",
  "location": "<location / remote policy>",
  "compensation": "<salary range or 'Not disclosed'>",
  "globalScore": <number 1.0–5.0>,
  "dimensions": [
    { "label": "CV Match",             "weight": 30, "score": <1.0–5.0> },
    { "label": "North Star Alignment", "weight": 25, "score": <1.0–5.0> },
    { "label": "Compensation",         "weight": 15, "score": <1.0–5.0> },
    { "label": "Cultural Signals",     "weight": 15, "score": <1.0–5.0> },
    { "label": "Red Flags (inverted)", "weight": 15, "score": <1.0–5.0> }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "recommendation": "<one paragraph action plan>"
}

Rules:
- globalScore = weighted average of the five dimension scores.
- strengths: 2–4 concrete bullet-point strings about the candidate's fit.
- risks: 1–3 strings about gaps or concerns.
- recommendation: a single paragraph with actionable next steps.
- Output ONLY the JSON. No markdown, no explanation outside the JSON object.
`;

// ---------------------------------------------------------------------------
// POST /api/evaluate
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: { input?: string; mode?: string };

  try {
    body = (await request.json()) as { input?: string; mode?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { input, mode = "oferta" } = body;

  if (!input || typeof input !== "string" || !input.trim()) {
    return NextResponse.json(
      { error: "`input` is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  // ── No API key → return mock with a flag so the UI can show a note ──────
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[api/evaluate] ANTHROPIC_API_KEY not set — returning mock data");
    return NextResponse.json({ ...MOCK_EVALUATION, _mock: true });
  }

  // ── Load mode file ───────────────────────────────────────────────────────
  const modeContent = readModeFile(mode);
  const systemPrompt = modeContent
    ? modeContent + JSON_INSTRUCTION
    : `You are a senior career coach and technical recruiter. Evaluate the job description below against a strong AI/ML engineer profile.${JSON_INSTRUCTION}`;

  // ── Call Anthropic API ───────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Please evaluate this job description:\n\n${input.trim()}`,
        },
      ],
    });

    const firstBlock = message.content[0];
    if (firstBlock.type !== "text") {
      throw new Error("Unexpected non-text content block from API");
    }
    rawText = firstBlock.text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/evaluate] Anthropic API error:", msg);
    return NextResponse.json(
      { error: `Claude API call failed: ${msg}` },
      { status: 502 }
    );
  }

  // ── Parse JSON from response ─────────────────────────────────────────────
  // Claude should return raw JSON, but defensively strip any markdown fences
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let result: unknown;
  try {
    result = JSON.parse(cleaned);
  } catch {
    console.error("[api/evaluate] Failed to parse Claude response as JSON:", rawText.slice(0, 300));
    return NextResponse.json(
      { error: "Claude returned an unparseable response", raw: rawText.slice(0, 500) },
      { status: 502 }
    );
  }

  return NextResponse.json(result);
}
