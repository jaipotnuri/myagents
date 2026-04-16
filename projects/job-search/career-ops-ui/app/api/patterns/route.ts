import { NextResponse } from "next/server";
import { runScript } from "@/lib/runScript";
import { appendLog } from "@/lib/logger";

export async function GET() {
  if (!process.env.CAREER_OPS_DIR) {
    console.error(
      "[api/patterns] CAREER_OPS_DIR is not set. Set it in .env.local to point to your career-ops directory."
    );
    return NextResponse.json(
      {
        error: "CAREER_OPS_DIR is not configured",
        hint: "Set CAREER_OPS_DIR in .env.local to point to your career-ops directory",
      },
      { status: 500 }
    );
  }

  const start = Date.now();
  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    ({ stdout, stderr, exitCode } = await runScript(
      "analyze-patterns",
      ["--summary"],
      { timeout: 60_000 }
    ));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Script execution failed";
    console.error("[api/patterns] analyze-patterns.mjs failed:", message);
    await appendLog({
      command: "analyze-patterns",
      args: ["--summary"],
      exitCode: -1,
      durationMs: Date.now() - start,
      stdout: "",
      stderr: message,
    });
    return NextResponse.json(
      { error: `analyze-patterns.mjs failed: ${message}` },
      { status: 500 }
    );
  }

  await appendLog({
    command: "analyze-patterns",
    args: ["--summary"],
    exitCode,
    durationMs: Date.now() - start,
    stdout,
    stderr,
  });

  if (exitCode !== 0) {
    const combinedOutput = (stdout + stderr).toLowerCase();
    const isEmptyData =
      combinedOutput.includes("no applications") ||
      stdout.trim() === "";

    if (isEmptyData) {
      return NextResponse.json({
        applications: [],
        patterns: {},
        summary:
          "No applications tracked yet. Add applications to the tracker to see patterns.",
        _empty: true,
      });
    }

    return NextResponse.json(
      {
        error: `analyze-patterns.mjs exited with code ${exitCode}`,
        stderr: stderr.slice(0, 1000),
        stdout: stdout.slice(0, 500),
      },
      { status: 500 }
    );
  }

  // Try to parse JSON from stdout
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    // Script ran successfully but output is not JSON (e.g. --summary mode outputs text)
    return NextResponse.json({ output: stdout, stderr });
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "rejectReasons" in parsed &&
    "archetypes" in parsed &&
    "techGaps" in parsed
  ) {
    return NextResponse.json(parsed);
  }

  // Unexpected JSON shape
  return NextResponse.json({ data: parsed, stdout });
}

export async function POST() {
  return NextResponse.json(
    { error: "Method Not Allowed", message: "POST is not supported on /api/patterns. Use GET." },
    { status: 405, headers: { Allow: "GET" } }
  );
}
