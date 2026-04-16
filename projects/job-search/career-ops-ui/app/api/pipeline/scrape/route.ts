import { NextRequest, NextResponse } from "next/server";
import { appendLog } from "@/lib/logger";

/**
 * POST /api/pipeline/scrape
 *
 * Body: { url: string }
 *
 * Uses Playwright (headless Chromium) to navigate to the job posting URL
 * and extract title, company, and description text.
 *
 * Note: This scraper works for statically-rendered and JS-rendered pages.
 * For portals that require login sessions (LinkedIn, internal ATSes), use
 * the Chrome MCP via the Claude Code CLI instead.
 */
export async function POST(req: NextRequest) {
  let body: { url?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url } = body;

  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return NextResponse.json(
      { error: "Invalid URL — must start with http" },
      { status: 400 }
    );
  }

  const start = Date.now();
  try {
    const { scrapeJobPosting } = await import("@/lib/playwright");
    const result = await scrapeJobPosting(url);
    const durationMs = Date.now() - start;

    await appendLog({
      command: "scrape",
      args: [url],
      exitCode: 0,
      durationMs,
      stdout: `title=${result.title} company=${result.company} descLen=${result.description.length}`,
      stderr: "",
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scrape failed";
    console.error("[api/pipeline/scrape] Error:", message);

    await appendLog({
      command: "scrape",
      args: [url],
      exitCode: 1,
      durationMs: Date.now() - start,
      stdout: "",
      stderr: message,
    });

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
