import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runScript } from "@/lib/runScript";

interface Company {
  name: string;
  tier: number;
  openRoles: number;
  lastScanned: string;
  slug: string;
}

const MOCK_COMPANIES: Company[] = [
  { name: "Anthropic",    tier: 1, openRoles: 3, lastScanned: "2h ago",  slug: "anthropic"   },
  { name: "OpenAI",       tier: 1, openRoles: 7, lastScanned: "4h ago",  slug: "openai"      },
  { name: "DeepMind",     tier: 1, openRoles: 2, lastScanned: "1d ago",  slug: "deepmind"    },
  { name: "Cohere",       tier: 2, openRoles: 4, lastScanned: "6h ago",  slug: "cohere"      },
  { name: "Mistral AI",   tier: 2, openRoles: 1, lastScanned: "2d ago",  slug: "mistral"     },
  { name: "Hugging Face", tier: 2, openRoles: 5, lastScanned: "12h ago", slug: "huggingface" },
  { name: "Groq",         tier: 2, openRoles: 2, lastScanned: "1d ago",  slug: "groq"        },
  { name: "Together AI",  tier: 3, openRoles: 3, lastScanned: "3d ago",  slug: "together"    },
  { name: "Perplexity",   tier: 3, openRoles: 1, lastScanned: "2d ago",  slug: "perplexity"  },
  { name: "Stability AI", tier: 3, openRoles: 2, lastScanned: "5d ago",  slug: "stability"   },
  { name: "Replicate",    tier: 4, openRoles: 1, lastScanned: "7d ago",  slug: "replicate"   },
  { name: "LangChain",    tier: 4, openRoles: 2, lastScanned: "6d ago",  slug: "langchain"   },
];

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
  // DEVELOPER TOOLS, INTERNATIONAL, NEW → Tier 4
  return 4;
}

/**
 * Minimal line-by-line YAML parser for portals.yml.
 *
 * portals.yml groups companies under `tracked_companies:` using
 * # ===== section comment headers rather than an explicit `tier:` field.
 * This parser detects those headers and derives the tier automatically.
 *
 * If a company entry does happen to include an explicit `tier:` field it
 * takes precedence.  The `slug` is auto-generated from the company name
 * when not present.
 */
function parsePortalsYaml(content: string): Company[] {
  const companies: Company[] = [];
  let current: Partial<Company> | null = null;
  let currentTier = 1;
  let afterSeparator = false;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trimEnd();

    // Detect # ===== separator lines
    if (/^\s*#\s*={10,}/.test(line)) {
      afterSeparator = true;
      continue;
    }

    // The comment line immediately following a ===== separator is the section title
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

    // Start of a new list entry
    if (/^\s*-\s+name:/.test(line)) {
      if (current?.name) companies.push(current as Company);
      const nameMatch = line.match(/name:\s*(.+)/);
      const rawName = nameMatch ? nameMatch[1].trim() : "";
      current = {
        name: rawName,
        tier: currentTier,
        openRoles: 0,
        lastScanned: "unknown",
        // Auto-generate slug from name; overridden below if `slug:` key present
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
        // Explicit tier field takes precedence over section-derived tier
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
    }
  }

  // Push the last entry
  if (current?.name) companies.push(current as Company);

  return companies;
}

function resolvePortalsPath(): string {
  const careerOpsDir =
    process.env.CAREER_OPS_DIR ??
    path.resolve(process.cwd(), "../../");

  return path.join(careerOpsDir, "portals.yml");
}

export async function GET() {
  try {
    const portalsPath = resolvePortalsPath();

    if (!fs.existsSync(portalsPath)) {
      // File not present — return mock data so the UI always has content
      return NextResponse.json(MOCK_COMPANIES);
    }

    const raw = fs.readFileSync(portalsPath, "utf8");
    const parsed = parsePortalsYaml(raw);

    if (parsed.length === 0) {
      return NextResponse.json(MOCK_COMPANIES);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[scanner] Failed to read portals.yml:", err);
    return NextResponse.json(MOCK_COMPANIES);
  }
}

/**
 * POST /api/scanner
 *
 * Fire-and-forget: spawns check-liveness.mjs in the background and
 * returns immediately so the UI stays responsive.
 */
export async function POST() {
  // Intentionally not awaited — fire and forget
  runScript("check-liveness", [], { timeout: 300_000 }).catch((err: unknown) => {
    console.error("[scanner POST] Background scan error:", err);
  });

  return NextResponse.json({ started: true });
}
