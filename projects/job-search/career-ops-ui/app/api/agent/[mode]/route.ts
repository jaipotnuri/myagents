// updated: force reload
import { NextRequest } from "next/server";
import path from "path";
import {
  runAgentMode,
  ALLOWED_MODES,
  AgentEvent,
} from "@/lib/agentRunner";
import { appendLog } from "@/lib/logger";

const CAREER_OPS_DIR =
  process.env.CAREER_OPS_DIR ?? path.join(process.cwd(), "..", "..");

// ---------------------------------------------------------------------------
// POST /api/agent/[mode]
//
// Streams SSE events as the agent loop progresses.
//
// Request body: { input: string }
//
// SSE event shapes:
//   data: {"type":"thinking","text":"..."}
//   data: {"type":"tool_call","name":"read_file","input":{"path":"..."}}
//   data: {"type":"tool_result","name":"read_file","content":"..."}
//   data: {"type":"done","output":"...","filesWritten":["..."]}
//   data: {"type":"error","text":"..."}
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: { mode: string } }
) {
  const { mode } = params;

  // Validate mode against allowlist
  if (!ALLOWED_MODES.includes(mode as (typeof ALLOWED_MODES)[number])) {
    return new Response(
      JSON.stringify({
        error: `Unknown mode: "${mode}". Allowed: ${ALLOWED_MODES.join(", ")}`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  let body: { input?: string; conversationHistory?: { role: string; content: string }[] };
  try {
    body = (await request.json()) as { input?: string; conversationHistory?: { role: string; content: string }[] };
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const userMessage = (body.input ?? "").trim() || `Run the ${mode} command`;
  const conversationHistory = body.conversationHistory ?? [];
  const startTime = Date.now();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let controllerClosed = false;

      function safeEnqueue(data: string) {
        if (controllerClosed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          controllerClosed = true;
        }
      }

      function safeClose() {
        if (controllerClosed) return;
        controllerClosed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }

      function emit(event: AgentEvent) {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      }

      runAgentMode({
        modeName: mode,
        userMessage,
        careerOpsDir: CAREER_OPS_DIR,
        onEvent: emit,
        conversationHistory,
      })
        .then(async ({ output, filesWritten }) => {
          const doneEvent: AgentEvent = {
            type: "done",
            output,
            filesWritten,
          };
          safeEnqueue(`data: ${JSON.stringify(doneEvent)}\n\n`);
          safeClose();

          // Log to runs.jsonl
          await appendLog({
            command: `agent/${mode}`,
            args: [userMessage.slice(0, 120)],
            exitCode: 0,
            durationMs: Date.now() - startTime,
            stdout: output.slice(0, 500),
            stderr: "",
          });
        })
        .catch(async (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          const errorEvent: AgentEvent = { type: "error", text: msg };
          safeEnqueue(`data: ${JSON.stringify(errorEvent)}\n\n`);
          safeClose();

          await appendLog({
            command: `agent/${mode}`,
            args: [userMessage.slice(0, 120)],
            exitCode: 1,
            durationMs: Date.now() - startTime,
            stdout: "",
            stderr: msg,
          });
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering for SSE
    },
  });
}
