import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportMeta {
  id: string;
  filename: string;
  company: string;
  role: string;
  score: number;
  date: string;
  filePath: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a score from strings like "4.6", "4.6/5", or "Score: 4.6"
 */
function parseScore(raw: string): number {
  const match = raw.match(/(\d+(\.\d+)?)/);
  if (!match) return 0;
  const n = parseFloat(match[1]);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse basic metadata from the first ~30 lines of a markdown report.
 *
 * Supports these header patterns:
 *   # Company — Role
 *   **Company:** Groq
 *   **Role:** AI Infra Engineer
 *   **Score:** 4.6
 *   **Score:** 4.6/5
 */
function parseMeta(content: string, filename: string): Omit<ReportMeta, "id" | "filePath"> {
  const lines = content.split("\n").slice(0, 30);
  let company = "";
  let role = "";
  let score = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Pattern: # Company — Role  OR  # Company - Role
    if (!company && !role && trimmed.startsWith("# ")) {
      const header = trimmed.slice(2).trim();
      const sep = header.includes("—") ? "—" : header.includes(" - ") ? " - " : null;
      if (sep) {
        const parts = header.split(sep);
        company = parts[0].trim();
        role = parts.slice(1).join(sep).trim();
      }
    }

    // Pattern: **Company:** Groq
    if (!company) {
      const m = trimmed.match(/^\*{0,2}Company:{0,1}\*{0,2}\s*[:]\s*(.+)/i);
      if (m) company = m[1].trim();
    }

    // Pattern: **Role:** AI Infra Engineer
    if (!role) {
      const m = trimmed.match(/^\*{0,2}Role:{0,1}\*{0,2}\s*[:]\s*(.+)/i);
      if (m) role = m[1].trim();
    }

    // Pattern: **Score:** 4.6
    if (score === 0) {
      const m = trimmed.match(/^\*{0,2}(?:Fit\s*)?Score:{0,1}\*{0,2}\s*[:]\s*(.+)/i);
      if (m) score = parseScore(m[1]);
    }
  }

  // Fallback: derive from filename (e.g. "groq-ai-infra" → company=Groq, role from rest)
  if (!company) {
    const base = filename.replace(/\.md$/, "");
    const parts = base.split("-");
    company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    role = parts.slice(1).join(" ");
  }

  // Try to get date from file stat — we'll fill this in later
  const date = "";

  return { company, role, score, date, filename };
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * GET /api/reports
 * Returns list of report metadata, sorted by date descending.
 *
 * GET /api/reports?id=<filename-without-extension>
 * Returns { content: string } with the full markdown of that report.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // Resolve the reports directory — mirrors how tracker resolves data/
  const baseDir =
    process.env.CAREER_OPS_DIR ??
    path.resolve(process.cwd(), "..", "..");

  const reportsDir = path.join(baseDir, "reports");

  // -------------------------------------------------------------------------
  // Single-report fetch: ?id=<slug>
  // -------------------------------------------------------------------------
  if (id) {
    // Sanitise: strip path separators so we can't escape the reports dir
    const safe = id.replace(/[/\\]/g, "");
    const filePath = path.join(reportsDir, `${safe}.md`);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      return NextResponse.json({ id: safe, content });
    } catch {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
  }

  // -------------------------------------------------------------------------
  // List all reports
  // -------------------------------------------------------------------------
  try {
    const entries = await fs.readdir(reportsDir);
    const mdFiles = entries.filter((f) => f.endsWith(".md"));

    if (mdFiles.length === 0) {
      return NextResponse.json([]);
    }

    const reports: ReportMeta[] = await Promise.all(
      mdFiles.map(async (filename) => {
        const filePath = path.join(reportsDir, filename);
        let content = "";
        let mtime = new Date(0);

        try {
          [content, { mtime }] = await Promise.all([
            fs.readFile(filePath, "utf-8"),
            fs.stat(filePath),
          ]);
        } catch {
          // Ignore unreadable files
        }

        const meta = parseMeta(content, filename);
        const id = filename.replace(/\.md$/, "");

        // Format date as "Apr 6" style
        const dateStr = mtime.getTime() > 0
          ? mtime.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "";

        return {
          id,
          filename,
          company: meta.company,
          role: meta.role,
          score: meta.score,
          date: dateStr,
          filePath,
        };
      })
    );

    // Sort by file mtime descending (newest first)
    reports.sort((a, b) => {
      // If dates are equal strings, preserve order; otherwise compare
      if (a.date === b.date) return a.company.localeCompare(b.company);
      return b.date.localeCompare(a.date);
    });

    return NextResponse.json(reports);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      console.warn("[api/reports] reports/ directory not found at:", reportsDir);
      return NextResponse.json([]);
    }

    const message = err instanceof Error ? err.message : "Failed to read reports directory";
    console.error("[api/reports] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
