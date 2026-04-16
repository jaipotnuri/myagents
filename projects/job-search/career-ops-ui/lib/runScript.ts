import { spawn } from "child_process";
import path from "path";

export type ScriptName =
  | "analyze-patterns"
  | "check-liveness"
  | "cv-sync-check"
  | "dedup-tracker"
  | "doctor"
  | "generate-pdf"
  | "merge-tracker"
  | "normalize-statuses"
  | "verify-pipeline"
  | "merge"
  | "verify"
  | "pdf"
  | "evaluate";

const CAREER_OPS_DIR =
  process.env.CAREER_OPS_DIR ?? path.join(process.cwd(), "..", "..");

/**
 * runScript — spawns a Node.js child process to execute a named .mjs script
 * from the career-ops directory, passing optional CLI args.
 *
 * @param scriptName  - The script name without extension (e.g. "analyze-patterns")
 * @param args        - CLI arguments forwarded to the script
 * @param options     - Optional config (timeout in ms, default 30 s)
 * @returns           - Resolved { stdout, stderr, exitCode }
 *
 * The career-ops directory is resolved from the CAREER_OPS_DIR environment
 * variable, falling back to two directories above the Next.js project root.
 */
export function runScript(
  scriptName: string,
  args: string[] = [],
  options?: { timeout?: number }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    if (!process.env.CAREER_OPS_DIR) {
      console.error(
        "[runScript] CAREER_OPS_DIR is not set — falling back to relative path. " +
          "Set CAREER_OPS_DIR in .env.local to point to your career-ops directory."
      );
    }

    const scriptPath = path.join(CAREER_OPS_DIR, `${scriptName}.mjs`);

    const child = spawn("node", [scriptPath, ...args], {
      cwd: CAREER_OPS_DIR,
      env: { ...process.env },
      timeout: options?.timeout ?? 30_000,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    child.on("close", (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    child.on("error", reject);
  });
}
