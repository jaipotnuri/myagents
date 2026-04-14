import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { parseTracker } from "@/lib/parseTracker";

function resolveDataDir() {
  return process.env.CAREER_OPS_DIR ?? path.resolve(process.cwd(), "..", "..");
}

/**
 * GET /api/tracker
 *
 * Reads the applications.md file from the career-ops data directory
 * and returns a JSON array of structured application records.
 *
 * Path resolution order:
 *   1. CAREER_OPS_DIR env var (absolute path to data dir)
 *   2. Relative fallback: ../../data from project root (CWD)
 *
 * Returns an empty array (not an error) if the file is not found,
 * so the UI degrades gracefully on first run.
 */
export async function GET() {
  const baseDir = resolveDataDir();

  const filePath = path.join(baseDir, "data", "applications.md");

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const applications = parseTracker(raw);
    return NextResponse.json(applications);
  } catch (err: unknown) {
    // File not found — return empty array so dashboard loads cleanly
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      console.warn("[api/tracker] applications.md not found at:", filePath);
      return NextResponse.json([]);
    }

    const message =
      err instanceof Error ? err.message : "Failed to read applications.md";
    console.error("[api/tracker] Error:", message);
    return NextResponse.json(
      { error: message, path: filePath },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tracker
 *
 * Appends a new row to data/applications.md.
 * Body: { company: string, role: string, score: number, notes: string }
 */
export async function POST(request: Request) {
  const baseDir = resolveDataDir();
  const filePath = path.join(baseDir, "data", "applications.md");

  try {
    const body = (await request.json()) as {
      company?: string;
      role?: string;
      score?: number;
      notes?: string;
    };
    const { company = "Unknown", role = "Unknown", score = 0, notes = "" } = body;

    // Read existing file (or start fresh if missing)
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch {
      raw =
        "# Applications Tracker\n\n" +
        "| # | Date | Company | Role | Score | Status | PDF | Report | Notes |\n" +
        "|---|------|---------|------|-------|--------|-----|--------|-------|\n";
    }

    // Determine next row number
    const rowNums = [...raw.matchAll(/^\|\s*(\d+)\s*\|/gm)].map((m) =>
      parseInt(m[1], 10)
    );
    const nextNum = rowNums.length > 0 ? Math.max(...rowNums) + 1 : 1;

    const date = new Date().toISOString().slice(0, 10);
    const formattedScore =
      typeof score === "number" ? `${score.toFixed(1)}/5` : `${score}/5`;
    const newRow = `| ${nextNum} | ${date} | ${company} | ${role} | ${formattedScore} | Evaluated | ❌ | — | ${notes} |`;

    await fs.writeFile(filePath, raw.trimEnd() + "\n" + newRow + "\n", "utf-8");

    return NextResponse.json({ success: true, row: nextNum });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save";
    console.error("[api/tracker POST] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
