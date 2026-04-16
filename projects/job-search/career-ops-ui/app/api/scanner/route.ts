import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { appendLog } from "@/lib/logger";
import { runScript } from "@/lib/runScript";

interface Company {
  name: string;
  tier: number;
  openRoles: number;
  lastScanned: string;
  slug: string;
  url?: string;
  isLive?: boolean;
  lastStatus?: string;
}

export interface ScanResult {
  url: string;
  live: boolean;
  status: "active" | "expired" | "uncertain";
}

/**
 * Maps a portals.yml section title (the text between # === separators) to a
 * tier number 1–4.  The file groups companies by category rather than using an
 * explicit `tier:` field, so we infer the tier from the section heading.
 *
 *   Tier 1 – frontier AI labs & model providers
 *   Tier 2 – AI infrastructure, compute, tooling, data
 *   Tier 3 – agentic AI, voice AI, enterprise AI platforms
 *   Tier 4 – developer tools, international companies, newly discovered
 */
function sectionToTier(sectionTitle: string): number {
  const t = sectionTitle.toUpperCase();
  if (t.includes("LAB") || t.includes("FRONTIER") || t.includes("MODEL PROVIDER")) return 1;
  if (
    t.includes("INFRASTRUCTURE") ||
    t.includes("COMPUTE") ||
    t.includes("TOOLING") ||
    t.includes("OBSERVABILITY") ||
    t.includes("DATA")
  )
    return 2;
  if (
    t.includes("AGENTIC") ||
    t.includes("VOICE") ||
    t.includes("ENTERPRISE") ||
    t.includes("APPLICATION")
  )
    return 3;
  return 4;
}

/**
 * Minimal line-by-line YAML parser for portals.yml.
 *
 * portals.yml groups companies under `tracked_companies:` using
 * # ===== section comment headers rather than an explicit `tier:` field.
 * This parser detects those headers and derives the tier automatically.
 */
function parsePortalsYaml(content: string): Company[] {
  const companies: Company[] = [];
  let current: Partial<Company> | null = null;
  let currentTier = 1;
  let afterSeparator = false;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trimEnd();

    if (/^\s*#\s*={10,}/.test(line)) {
      afterSeparator = true;
      continue;
    }

    if (afterSeparator) {
      afterSeparator = false;
      if (/^\s*#/.test(line)) {
        const titleMatch = line.match(/^\s*#\s+(.+)/);
        if (titleMatch) {
          currentTier = sectionToTier(titleMatch[1].trim());
        }
        continue;
      }
    }

    if (/^\s*-\s+name:/.test(line)) {
      if (current?.name) companies.push(current as Company);
      const nameMatch = line.match(/name:\s*(.+)/);
      const rawName = nameMatch ? nameMatch[1].trim() : "";
      current = {
        name: rawName,
        tier: currentTier,
        openRoles: 0,
        lastScanned: "never",
        slug: rawName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      };
      continue;
    }

    if (!current) continue;

    const kvMatch = line.match(/^\s+(\w+):\s*(.+)/);
    if (!kvMatch) continue;
    const [, key, val] = kvMatch;

    switch (key) {
      case "name":
        current.name = val.trim();
        break;
      case "slug":
        current.slug = val.trim();
        break;
      case "tier":
        current.tier = parseInt(val.trim(), 10) || currentTier;
        break;
      case "open_roles":
      case "openRoles":
        current.openRoles = parseInt(val.trim(), 10) || 0;
        break;
      case "last_scanned":
      case "lastScanned":
        current.lastScanned = val.trim();
        break;
      case "careers_url":
        current.url = val.trim();
        break;
    }
  }

  if (current?.name) companies.push(current as Company);

  return companies;
}

function resolveCareerOpsDir(): string {
  return process.env.CAREER_OPS_DIR ?? path.resolve(process.cwd(), "../../");
}

/**
 * Read scan-history.tsv to get last-scanned timestamps per company.
 *
 * Actual format (from scan.md):
 *   url\tfirst_seen\tportal\ttitle\tcompany\tstatus
 *
 * Groups by company slug, returning the most recent entry per company.
 */
function readScanHistory(
  careerOpsDir: string
): Map<string, { lastScanned: string; openRoles: number; isLive: boolean; lastStatus: string }> {
  const historyPath = path.join(careerOpsDir, "data", "scan-history.tsv");

  // company slug → aggregated entry
  const byCompany = new Map<string, { lastDate: string; lastStatus: string; addedCount: number }>();

  try {
    if (!fs.existsSync(historyPath)) return new Map();
    const raw = fs.readFileSync(historyPath, "utf-8");

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const parts = trimmed.split("\t");
      if (parts.length < 2) continue;

      const url = parts[0]?.trim() ?? "";
      if (!url.startsWith("http")) continue; // skip header row

      const date = parts[1]?.trim() ?? "";
      const company = parts[4]?.trim() ?? "";
      const status = parts[5]?.trim() ?? "";

      if (!company) continue;

      const slug = company.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const existing = byCompany.get(slug);

      if (!existing || date > existing.lastDate) {
        byCompany.set(slug, {
          lastDate: date,
          lastStatus: status,
          addedCount: (existing?.addedCount ?? 0) + (status === "added" ? 1 : 0),
        });
      } else {
        existing.addedCount += status === "added" ? 1 : 0;
      }
    }
  } catch {
    // scan-history.tsv doesn't exist yet — that's fine
  }

  const result = new Map<
    string,
    { lastScanned: string; openRoles: number; isLive: boolean; lastStatus: string }
  >();

  byCompany.forEach((entry, slug) => {
    result.set(slug, {
      lastScanned: entry.lastDate,
      openRoles: entry.addedCount,
      isLive: entry.lastStatus === "added",
      lastStatus: entry.lastStatus,
    });
  });

  return result;
}

/**
 * Parse check-liveness.mjs stdout into structured per-URL results.
 *
 * Output format from the script:
 *   ✅ active     https://...
 *   ❌ expired    https://...
 *              reason text
 *   ⚠️ uncertain  https://...
 */
function parseScanOutput(stdout: string, requestedUrls: string[]): ScanResult[] {
  const resultMap = new Map<string, ScanResult>();

  // Pessimistic default: treat all as expired until proven otherwise
  for (const url of requestedUrls) {
    resultMap.set(url, { url, live: false, status: "expired" });
  }

  for (const line of stdout.split("\n")) {
    // Match lines where the status word is immediately followed by the URL
    // Format: "[icon] active|expired|uncertain   https://..."
    const m = line.match(/\b(active|expired|uncertain)\b\s+(https?:\/\/\S+)/);
    if (!m) continue;
    const [, statusWord, url] = m;
    const status = statusWord as "active" | "expired" | "uncertain";
    resultMap.set(url, { url, live: status === "active", status });
  }

  return Array.from(resultMap.values());
}

export async function GET() {
  const careerOpsDir = resolveCareerOpsDir();
  const portalsPath = path.join(careerOpsDir, "portals.yml");

  if (!process.env.CAREER_OPS_DIR) {
    console.error(
      "[api/scanner] CAREER_OPS_DIR is not set. Set it in .env.local to point to your career-ops directory."
    );
  }

  if (!fs.existsSync(portalsPath)) {
    return NextResponse.json(
      {
        error: "portals.yml not found",
        path: portalsPath,
        hint: "Set CAREER_OPS_DIR in .env.local to point to your career-ops directory",
      },
      { status: 500 }
    );
  }

  try {
    const raw = fs.readFileSync(portalsPath, "utf-8");
    const companies = parsePortalsYaml(raw);

    if (companies.length === 0) {
      return NextResponse.json(
        { error: "portals.yml parsed but found no companies", path: portalsPath },
        { status: 500 }
      );
    }

    const history = readScanHistory(careerOpsDir);

    const enriched = companies.map((c) => {
      const hist = history.get(c.slug);
      if (hist) {
        return {
          ...c,
          lastScanned: hist.lastScanned || c.lastScanned,
          openRoles: hist.openRoles || c.openRoles,
          isLive: hist.isLive,
          lastStatus: hist.lastStatus,
        };
      }
      return c;
    });

    return NextResponse.json(enriched);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read portals.yml";
    console.error("[api/scanner] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/scanner
 *
 * Runs check-liveness.mjs against jobs currently in pipeline.md (or a single
 * URL if `{ url }` is provided in the request body).
 *
 * Body (optional): { url: string }
 *   If provided, checks only that URL. Otherwise checks all pending URLs in pipeline.md.
 *
 * Returns: { results: ScanResult[], started: false, urlsChecked: number, durationMs: number }
 */
export async function POST(request: Request) {
  const careerOpsDir = resolveCareerOpsDir();

  if (!process.env.CAREER_OPS_DIR) {
    console.error("[api/scanner POST] CAREER_OPS_DIR is not set. Set it in .env.local.");
    return NextResponse.json(
      {
        error: "CAREER_OPS_DIR is not configured",
        hint: "Set CAREER_OPS_DIR in .env.local to point to your career-ops directory",
      },
      { status: 500 }
    );
  }

  // Parse optional single-URL from request body
  let singleUrl: string | null = null;
  try {
    const body = await request.json() as { url?: unknown };
    if (body?.url && typeof body.url === "string") {
      singleUrl = body.url;
    }
  } catch {
    // No body or non-JSON body — scan all pipeline URLs
  }

  let urls: string[] = [];

  if (singleUrl) {
    urls = [singleUrl];
  } else {
    const pipelinePath = path.join(careerOpsDir, "data", "pipeline.md");
    try {
      if (fs.existsSync(pipelinePath)) {
        const raw = fs.readFileSync(pipelinePath, "utf-8");
        urls = raw
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => /^-\s*\[\s*\]\s*https?:/.test(l))
          .map((l) => l.replace(/^-\s*\[\s*\]\s*/, "").split(/\s/)[0])
          .filter(Boolean);
      }
    } catch (err) {
      console.error("[api/scanner POST] Error reading pipeline.md:", err);
    }
  }

  if (urls.length === 0) {
    await appendLog({
      command: "check-liveness",
      args: [],
      exitCode: 0,
      durationMs: 0,
      stdout: "No pending URLs to check",
      stderr: "",
    });
    return NextResponse.json({
      started: false,
      results: [] as ScanResult[],
      message: "No pending URLs in pipeline.md. Add job URLs to pipeline.md first, then scan to check liveness.",
      urlsChecked: 0,
    });
  }

  const start = Date.now();
  try {
    const { stdout, stderr, exitCode } = await runScript("check-liveness", urls, {
      timeout: 120_000,
    });
    const durationMs = Date.now() - start;

    await appendLog({
      command: "check-liveness",
      args: urls,
      exitCode,
      durationMs,
      stdout,
      stderr,
    });

    const results = parseScanOutput(stdout, urls);

    return NextResponse.json({
      started: false,
      results,
      urlsChecked: urls.length,
      durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Script execution failed";
    console.error("[api/scanner POST] Error:", message);
    await appendLog({
      command: "check-liveness",
      args: urls,
      exitCode: -1,
      durationMs: Date.now() - start,
      stdout: "",
      stderr: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
