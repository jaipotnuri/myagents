import Anthropic from "@anthropic-ai/sdk";
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentEventType =
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "done"
  | "error";

export interface AgentEvent {
  type: AgentEventType;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  output?: string;
  filesWritten?: string[];
}

export interface RunAgentModeOptions {
  modeName: string;
  userMessage: string;
  careerOpsDir: string;
  onEvent: (event: AgentEvent) => void;
}

export interface RunAgentModeResult {
  success: boolean;
  output: string;
  filesWritten: string[];
}

// ---------------------------------------------------------------------------
// Allowlist — only these modes may be invoked through the agent API
// ---------------------------------------------------------------------------

export { ALLOWED_MODES, MODE_LABELS } from "@/lib/agentModes";
export type { AllowedMode } from "@/lib/agentModes";

// ---------------------------------------------------------------------------
// Path sandboxing — block traversal outside CAREER_OPS_DIR
// ---------------------------------------------------------------------------

function safePath(careerOpsDir: string, relativePath: string): string {
  const resolved = path.resolve(careerOpsDir, relativePath);
  const root = path.resolve(careerOpsDir);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// System prompt — mode file + _shared.md + _profile.md
// ---------------------------------------------------------------------------

function readModeSystemPrompt(careerOpsDir: string, modeName: string): string {
  const modesDir = path.join(careerOpsDir, "modes");
  const modeFile = path.join(modesDir, `${modeName}.md`);

  let sections: string[] = [];

  const sharedPath = path.join(modesDir, "_shared.md");
  if (existsSync(sharedPath)) {
    sections.push(readFileSync(sharedPath, "utf-8"));
  }

  if (existsSync(modeFile)) {
    sections.push(readFileSync(modeFile, "utf-8"));
  } else {
    sections.push(
      `You are a career ops assistant. The user has requested the "${modeName}" operation. Help them as best you can using the available file tools.`
    );
  }

  const profilePath = path.join(modesDir, "_profile.md");
  if (existsSync(profilePath)) {
    sections.push(readFileSync(profilePath, "utf-8"));
  }

  return sections.join("\n\n---\n\n");
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "read_file",
    description:
      "Read the contents of a file. Path is relative to the career-ops directory.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "File path relative to career-ops directory (e.g. 'data/applications.md')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write (overwrite) a file. Path is relative to the career-ops directory. Parent directories are created if needed.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to career-ops directory",
        },
        content: {
          type: "string",
          description: "Full content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "append_file",
    description:
      "Append content to an existing file. Path is relative to the career-ops directory.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "File path relative to career-ops directory",
        },
        content: {
          type: "string",
          description: "Content to append",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_dir",
    description:
      "List files and subdirectories at a path. Use '.' for the career-ops root.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description:
            "Directory path relative to career-ops directory. Use '.' for root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "fetch_url",
    description:
      "Fetch the text content of a URL. HTML tags are stripped. Use for static pages.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "Full URL to fetch (must start with https://)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "run_playwright",
    description:
      "Scrape a job posting URL using a headless browser. Handles JavaScript-rendered pages (Greenhouse, Lever, Ashby, etc.). Returns job title, company, and description.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "Job posting URL to scrape",
        },
      },
      required: ["url"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  careerOpsDir: string,
  filesWritten: string[]
): Promise<string> {
  try {
    switch (name) {
      case "read_file": {
        const filePath = safePath(careerOpsDir, input.path as string);
        if (!existsSync(filePath)) {
          return `[read_file] File not found: ${input.path}`;
        }
        const content = readFileSync(filePath, "utf-8");
        // Limit very large files to avoid exhausting token budget
        return content.length > 12000
          ? content.slice(0, 12000) + "\n\n[...truncated]"
          : content;
      }

      case "write_file": {
        const filePath = safePath(careerOpsDir, input.path as string);
        const dir = path.dirname(filePath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const raw = input.content;
        const contentStr = raw === undefined || raw === null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
        writeFileSync(filePath, contentStr, "utf-8");
        const rel = input.path as string;
        if (!filesWritten.includes(rel)) filesWritten.push(rel);
        return `[write_file] Written: ${input.path}`;
      }

      case "append_file": {
        const filePath = safePath(careerOpsDir, input.path as string);
        const dir = path.dirname(filePath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const raw = input.content;
        const contentStr = raw === undefined || raw === null ? "" : typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
        appendFileSync(filePath, contentStr, "utf-8");
        const rel = input.path as string;
        if (!filesWritten.includes(rel)) filesWritten.push(rel);
        return `[append_file] Appended to: ${input.path}`;
      }

      case "list_dir": {
        const dirPath = safePath(careerOpsDir, input.path as string);
        if (!existsSync(dirPath)) {
          return `[list_dir] Directory not found: ${input.path}`;
        }
        const entries = readdirSync(dirPath, { withFileTypes: true });
        return entries
          .map((e) => (e.isDirectory() ? `[dir]  ${e.name}/` : `       ${e.name}`))
          .join("\n");
      }

      case "fetch_url": {
        const url = input.url as string;
        if (!url.startsWith("https://") && !url.startsWith("http://")) {
          return `[fetch_url] Only http(s) URLs are supported`;
        }
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(15_000),
        });
        const html = await res.text();
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return text.length > 8000 ? text.slice(0, 8000) + "\n[...truncated]" : text;
      }

      case "run_playwright": {
        const { scrapeJobPosting } = await import("@/lib/playwright");
        const posting = await scrapeJobPosting(input.url as string);
        return [
          `Title: ${posting.title}`,
          `Company: ${posting.company}`,
          `URL: ${posting.url}`,
          `\nDescription:\n${posting.description}`,
        ].join("\n");
      }

      default:
        return `[error] Unknown tool: ${name}`;
    }
  } catch (err) {
    return `[tool error] ${name}: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ---------------------------------------------------------------------------
// Main agent loop
// ---------------------------------------------------------------------------

const MAX_ITERATIONS = 30;

export async function runAgentMode(
  options: RunAgentModeOptions
): Promise<RunAgentModeResult> {
  const { modeName, userMessage, careerOpsDir, onEvent } = options;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = readModeSystemPrompt(careerOpsDir, modeName);
  const filesWritten: string[] = [];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let finalOutput = "";

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const maxTokens = modeName === "scan" ? 1024 : 8192;
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      tools: AGENT_TOOLS,
    });

    // Surface any text blocks as "thinking" events
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        try { onEvent({ type: "thinking", text: block.text }); } catch { /* client disconnected, continue writing */ }
        finalOutput = block.text;
      }
    }

    // Collect tool_use blocks
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    // If done (no more tool calls)
    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      break;
    }

    // Execute each tool call and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      try { onEvent({
        type: "tool_call",
        name: toolUse.name,
        input: toolUse.input as Record<string, unknown>,
      }); } catch { /* client disconnected, continue writing */ }

      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, unknown>,
        careerOpsDir,
        filesWritten
      );

      try { onEvent({
        type: "tool_result",
        name: toolUse.name,
        content: result.slice(0, 600),
      }); } catch { /* client disconnected, continue writing */ }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // Extend conversation history
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  return { success: true, output: finalOutput, filesWritten };
}
