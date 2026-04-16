import fs from "fs";
import path from "path";

export interface LogEntry {
  timestamp: string;
  command: string;
  args: string[];
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
}

const LOGS_DIR = path.join(process.cwd(), "logs");
const RUNS_FILE = path.join(LOGS_DIR, "runs.jsonl");

function truncate(s: string, maxLen = 500): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + "…";
}

export async function appendLog(entry: Omit<LogEntry, "timestamp">): Promise<void> {
  const record: LogEntry = {
    timestamp: new Date().toISOString(),
    command: entry.command,
    args: entry.args,
    exitCode: entry.exitCode,
    durationMs: entry.durationMs,
    stdout: truncate(entry.stdout),
    stderr: truncate(entry.stderr),
  };

  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    fs.appendFileSync(RUNS_FILE, JSON.stringify(record) + "\n", "utf-8");
  } catch (err) {
    console.error("[logger] Failed to write run log:", err instanceof Error ? err.message : err);
  }
}

export function readLogs(limit = 50): LogEntry[] {
  try {
    if (!fs.existsSync(RUNS_FILE)) return [];
    const raw = fs.readFileSync(RUNS_FILE, "utf-8");
    const lines = raw.trim().split("\n").filter(Boolean);
    const entries: LogEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as LogEntry);
      } catch {
        // skip malformed lines
      }
    }
    return entries.slice(-limit).reverse();
  } catch (err) {
    console.error("[logger] Failed to read run log:", err instanceof Error ? err.message : err);
    return [];
  }
}
