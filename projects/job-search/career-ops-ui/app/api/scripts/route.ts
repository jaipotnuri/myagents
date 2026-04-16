import { NextRequest, NextResponse } from "next/server";
import { runScript, type ScriptName } from "@/lib/runScript";
import { appendLog } from "@/lib/logger";

const ALLOWED_SCRIPTS: ScriptName[] = [
  "merge-tracker",
  "verify-pipeline",
  "dedup-tracker",
  "normalize-statuses",
  "cv-sync-check",
  "doctor",
];

/**
 * POST /api/scripts
 *
 * Body: { script: ScriptName; args?: string[] }
 *
 * Spawns a named .mjs script from the career-ops directory using
 * child_process and returns stdout/stderr as JSON.
 */
export async function POST(req: NextRequest) {
  let body: { script?: string; args?: string[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { script, args = [] } = body;

  if (!script || !ALLOWED_SCRIPTS.includes(script as ScriptName)) {
    return NextResponse.json(
      {
        error: `Unknown script "${script}". Allowed: ${ALLOWED_SCRIPTS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const start = Date.now();
  try {
    const { stdout, stderr, exitCode } = await runScript(script as ScriptName, args);
    const durationMs = Date.now() - start;

    await appendLog({
      command: script,
      args,
      exitCode,
      durationMs,
      stdout,
      stderr,
    });

    if (exitCode !== 0) {
      return NextResponse.json(
        { error: `Script exited with code ${exitCode}`, stderr, stdout },
        { status: 500 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout.trim());
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ output: stdout, stderr });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Script execution failed";
    console.error(`[api/scripts] Error running "${script}":`, message);
    await appendLog({
      command: script,
      args,
      exitCode: -1,
      durationMs: Date.now() - start,
      stdout: "",
      stderr: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
