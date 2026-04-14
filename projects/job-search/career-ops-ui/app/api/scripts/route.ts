import { NextRequest, NextResponse } from "next/server";
import { runScript, type ScriptName } from "@/lib/runScript";

const ALLOWED_SCRIPTS: ScriptName[] = ["merge", "verify", "pdf", "evaluate"];

/**
 * POST /api/scripts
 *
 * Body: { script: ScriptName; payload?: Record<string, unknown> }
 *
 * Spawns a named .mjs script from the career-ops directory using
 * child_process and streams stdout back as JSON.
 *
 * Example:
 *   POST /api/scripts
 *   { "script": "pdf", "payload": { "jobDescription": "..." } }
 */
export async function POST(req: NextRequest) {
  let body: { script?: string; payload?: Record<string, unknown> };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { script, payload = {} } = body;

  if (!script || !ALLOWED_SCRIPTS.includes(script as ScriptName)) {
    return NextResponse.json(
      {
        error: `Unknown script "${script}". Allowed: ${ALLOWED_SCRIPTS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    const output = await runScript(script as ScriptName, payload);
    // Attempt to parse JSON output from the script; fall back to raw string
    try {
      return NextResponse.json(JSON.parse(output));
    } catch {
      return NextResponse.json({ output });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Script execution failed";
    console.error(`[api/scripts] Error running "${script}":`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
