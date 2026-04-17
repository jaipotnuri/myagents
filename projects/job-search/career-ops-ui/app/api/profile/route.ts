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

  // Read profile.yml and extract key fields (handles both flat and nested YAML)
  let profileData: Record<string, string> = {};
  try {
    const raw = await fs.readFile(ymlPath, "utf-8");
    const lines = raw.split("\n");
    let currentSection = "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Detect section headers (no leading space + colon)
      if (!line.startsWith(" ") && trimmed.includes(":")) {
        const colonIdx = trimmed.indexOf(":");
        currentSection = trimmed.slice(0, colonIdx).toLowerCase();
        continue;
      }

      // Parse key: value within sections
      if (line.startsWith("  ") && trimmed.includes(":")) {
        const colonIdx = trimmed.indexOf(":");
        const key = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "");

        // Map nested fields to flat structure
        if (currentSection === "candidate") {
          if (["full_name", "email", "location", "phone"].includes(key)) {
            profileData[key] = value;
          }
        } else if (currentSection === "compensation") {
          if (key === "target_range") {
            profileData["comp_target"] = value;
          }
        } else if (currentSection === "location") {
          if (key === "visa_status") {
            profileData["visa_status"] = value;
          }
        } else if (currentSection === "narrative") {
          if (key === "headline") {
            profileData["north_star"] = value;
          }
        }
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[api/profile] Error reading profile.yml:", err);
    }
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

  // Remove the cvContent key — that's never stored in profile.yml
  delete body["cvContent"];

  try {
    // Read existing file to preserve structure
    let raw: string;
    try {
      raw = await fs.readFile(ymlPath, "utf-8");
    } catch {
      raw = ""; // File doesn't exist yet
    }

    // Update nested fields in the YAML content
    const lines = raw.split("\n");
    let currentSection = "";
    let output: string[] = [];
    const fieldMap: Record<string, { section: string; key: string }> = {
      full_name:   { section: "candidate", key: "full_name" },
      email:       { section: "candidate", key: "email" },
      location:    { section: "candidate", key: "location" },
      phone:       { section: "candidate", key: "phone" },
      comp_target: { section: "compensation", key: "target_range" },
      visa_status: { section: "location", key: "visa_status" },
      north_star:  { section: "narrative", key: "headline" },
    };

    const fieldsUpdated = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track current section
      if (!line.startsWith(" ") && trimmed.includes(":") && !trimmed.startsWith("#")) {
        const colonIdx = trimmed.indexOf(":");
        currentSection = trimmed.slice(0, colonIdx).toLowerCase();
        output.push(line);
        continue;
      }

      // Check if this line should be updated
      let updated = false;
      if (line.startsWith("  ") && trimmed.includes(":")) {
        const colonIdx = trimmed.indexOf(":");
        const key = trimmed.slice(0, colonIdx).trim();
        const indent = "  ";

        // Check each field in the body
        for (const [fieldName, fieldValue] of Object.entries(body)) {
          if (!fieldName || !fieldValue) continue;
          const mapping = fieldMap[fieldName];
          if (mapping && mapping.section === currentSection && mapping.key === key) {
            output.push(`${indent}${key}: "${fieldValue.replace(/"/g, '\\"')}"`);
            fieldsUpdated.add(fieldName);
            updated = true;
            break;
          }
        }
      }

      if (!updated) {
        output.push(line);
      }
    }

    const result = output.join("\n");

    // Ensure the config directory exists
    await fs.mkdir(path.dirname(ymlPath), { recursive: true });
    await fs.writeFile(ymlPath, result, "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to write profile.yml";
    console.error("[api/profile] Write error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
