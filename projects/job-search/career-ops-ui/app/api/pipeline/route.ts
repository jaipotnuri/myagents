import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

/**
 * GET /api/pipeline
 *
 * Reads pipeline.md from the career-ops data directory and returns
 * an array of { id, url, status } objects. Lines starting with "http"
 * are treated as URLs; all others are ignored.
 *
 * Path resolution order:
 *   1. CAREER_OPS_DIR env var (absolute path to data dir)
 *   2. Relative fallback: ../../data from project root (CWD)
 *
 * Returns an empty array (not an error) if the file is not found.
 */
export async function GET() {
  const baseDir =
    process.env.CAREER_OPS_DIR ??
    path.resolve(process.cwd(), "..", "..");

  const filePath = path.join(baseDir, "data", "pipeline.md");

  try {
    const raw = await fs.readFile(filePath, "utf-8");

    const items = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("http"))
      .map((url, index) => ({
        id: index + 1,
        url,
        status: "pending" as const,
      }));

    return NextResponse.json(items);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      console.warn("[api/pipeline] pipeline.md not found at:", filePath);
      return NextResponse.json([]);
    }

    const message =
      err instanceof Error ? err.message : "Failed to read pipeline.md";
    console.error("[api/pipeline] Error:", message);
    return NextResponse.json(
      { error: message, path: filePath },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipeline
 *
 * Accepts { url: string } body and appends the URL as a new line
 * to pipeline.md. Creates the file (and data directory) if they
 * don't exist.
 */
export async function POST(request: Request) {
  const baseDir =
    process.env.CAREER_OPS_DIR ??
    path.resolve(process.cwd(), "..", "..");

  const dataDir = path.join(baseDir, "data");
  const filePath = path.join(dataDir, "pipeline.md");

  try {
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return NextResponse.json(
        { error: "Invalid URL — must start with http" },
        { status: 400 }
      );
    }

    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });

    // Append URL as a new line (create file if missing)
    await fs.appendFile(filePath, url + "\n", "utf-8");

    return NextResponse.json({ ok: true, url });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to write pipeline.md";
    console.error("[api/pipeline] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
