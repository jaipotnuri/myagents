import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function getCareerOpsDir(): string {
  return process.env.CAREER_OPS_DIR ?? path.resolve(process.cwd(), "..", "..");
}

function profileYmlPath(): string {
  return path.join(getCareerOpsDir(), "config", "profile.yml");
}

function cvMdPath(): string {
  return path.join(getCareerOpsDir(), "cv.md");
}

// ---------------------------------------------------------------------------
// YAML helpers — lightweight key: value parser (no deps)
// ---------------------------------------------------------------------------

/**
 * Parse a simple YAML file that contains only flat key: value pairs.
 * Multi-line values (indented continuation lines) are appended with a space.
 * Lines beginning with "#" are ignored.
 */
function parseSimpleYaml(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  let lastKey: string | null = null;

  for (const line of raw.split("\n")) {
    // Comment or empty
    if (line.trimStart().startsWith("#") || line.trim() === "") {
      lastKey = null;
      continue;
    }

    // Continuation line (leading whitespace, no colon at the start)
    if (/^\s+/.test(line) && lastKey && !line.includes(":")) {
      result[lastKey] = (result[lastKey] + " " + line.trim()).trim();
      continue;
    }

    // key: value
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key   = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes if present
    result[key]  = value.replace(/^["']|["']$/g, "");
    lastKey      = key;
  }

  return result;
}

/**
 * Serialise a flat Record<string, string> back to simple YAML.
 * Values containing special characters are quoted.
 */
function dumpSimpleYaml(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => {
      // Quote values that contain colons, leading/trailing spaces, or are empty
      const needs = v === "" || /[:,#\n\r]/.test(v) || v !== v.trim();
      const val   = needs ? `"${v.replace(/"/g, '\\"')}"` : v;
      return `${k}: ${val}`;
    })
    .join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// GET /api/profile
// ---------------------------------------------------------------------------

export async function GET() {
  const ymlPath = profileYmlPath();
  const cvPath  = cvMdPath();

  // Read profile.yml
  let profileData: Record<string, string> = {};
  try {
    const raw = await fs.readFile(ymlPath, "utf-8");
    profileData = parseSimpleYaml(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[api/profile] Error reading profile.yml:", err);
    }
    // Return empty fields — not a fatal error
  }

  // Read cv.md
  let cvContent = "";
  try {
    cvContent = await fs.readFile(cvPath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("[api/profile] Could not read cv.md:", err);
    }
  }

  return NextResponse.json({ ...profileData, cvContent });
}

// ---------------------------------------------------------------------------
// PUT /api/profile
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  const ymlPath = profileYmlPath();

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Read existing file to preserve any keys we don't manage
  let existing: Record<string, string> = {};
  try {
    const raw = await fs.readFile(ymlPath, "utf-8");
    existing = parseSimpleYaml(raw);
  } catch {
    // File doesn't exist yet — we'll create it
  }

  // Merge: incoming fields overwrite existing ones; unknown keys are preserved
  const merged = { ...existing, ...body };

  // Remove the cvContent key — that's never stored in profile.yml
  delete merged["cvContent"];

  try {
    // Ensure the config directory exists
    await fs.mkdir(path.dirname(ymlPath), { recursive: true });
    await fs.writeFile(ymlPath, dumpSimpleYaml(merged), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to write profile.yml";
    console.error("[api/profile] Write error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
