import { NextResponse } from "next/server";
import { runScript } from "@/lib/runScript";

// ---------------------------------------------------------------------------
// Mock fallback — mirrors the data used by the patterns page
// ---------------------------------------------------------------------------

const MOCK_PATTERNS = {
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
// GET /api/patterns
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const { stdout, stderr, exitCode } = await runScript(
      "analyze-patterns",
      ["--json"],
      { timeout: 60_000 }
    );

    if (exitCode !== 0) {
      console.warn(
        "[api/patterns] analyze-patterns.mjs exited with code",
        exitCode,
        "stderr:",
        stderr.slice(0, 300)
      );
      return NextResponse.json(MOCK_PATTERNS);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      console.warn("[api/patterns] Failed to parse JSON from script output — using mock data");
      return NextResponse.json(MOCK_PATTERNS);
    }

    // Validate the expected shape before returning
    if (
      parsed &&
      typeof parsed === "object" &&
      "rejectReasons" in parsed &&
      "archetypes" in parsed &&
      "techGaps" in parsed
    ) {
      return NextResponse.json(parsed);
    }

    // Script returned JSON but not the expected shape — fall through to mock
    console.warn("[api/patterns] Unexpected JSON shape from script — using mock data");
  } catch (err) {
    // Script not found or failed — serve mock so the UI always works
    console.warn(
      "[api/patterns] analyze-patterns.mjs unavailable, serving mock data:",
      err instanceof Error ? err.message : err
    );
  }

  return NextResponse.json(MOCK_PATTERNS);
}
