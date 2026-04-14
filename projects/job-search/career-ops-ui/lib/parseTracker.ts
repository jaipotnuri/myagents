/**
 * lib/parseTracker.ts
 *
 * Parses the applications.md markdown table into a typed array of Application records.
 *
 * Actual table format (from data/applications.md):
 *
 * | # | Date | Company | Role | Score | Status | PDF | Report | Notes |
 * |---|------|---------|------|-------|--------|-----|--------|-------|
 * | 1 | 2026-04-11 | Anthropic | ... | 4.1/5 | Evaluated | ✅ | [001](...) | ... |
 */

import { Application } from "@/types/career-ops";

export type { Application };

/**
 * Normalises a header string to a lowercase key with underscores.
 * Handles "#" as "id".
 */
function normaliseHeader(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "_");
  return trimmed === "#" ? "id" : trimmed;
}

/**
 * Splits a markdown table row into trimmed cell values.
 */
function parseRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/**
 * Returns true if the line is a markdown table separator (e.g. |---|---|).
 */
function isSeparator(line: string): boolean {
  return /^\|?[\s\-:]+(\|[\s\-:]+)*\|?$/.test(line.trim());
}

/**
 * Parses a score string like "4.1/5" or "4.1" into a float.
 * Returns NaN if not parseable.
 */
function parseScore(raw: string): number {
  const cleaned = raw.replace(/\/\d+$/, "").trim(); // strip "/5"
  return parseFloat(cleaned);
}

/**
 * Extracts the URL from a markdown link like "[001](../reports/foo.md)".
 * Returns the href portion, or empty string if not found.
 */
function extractMarkdownLink(raw: string): string {
  const match = raw.match(/\[.*?\]\((.*?)\)/);
  return match ? match[1] : "";
}

/**
 * Heuristically determines if a role is remote based on Notes or Role text.
 */
function inferRemote(notes: string, role: string): boolean {
  return /\bremote\b/i.test(notes) || /\bremote\b/i.test(role);
}

/**
 * Main parser — reads the markdown string line by line, finds the first
 * markdown table, and maps each data row to an Application object.
 *
 * @param markdown - Raw contents of applications.md
 */
export function parseTracker(markdown: string): Application[] {
  const lines = markdown.split("\n");
  const applications: Application[] = [];

  let headers: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed.startsWith("|")) {
      if (inTable) break; // end of table block
      continue;
    }

    if (isSeparator(trimmed)) {
      inTable = true;
      continue;
    }

    const cells = parseRow(trimmed);

    if (!inTable) {
      // First pipe row = header
      headers = cells.map(normaliseHeader);
      continue;
    }

    // Data row — map cells to named fields
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = cells[i] ?? "";
    });

    // Score: "4.1/5" → 4.1 (default 0 if unparseable)
    const scoreRaw = record["score"] ?? "";
    const scoreNum = parseScore(scoreRaw);
    const score = isNaN(scoreNum) ? 0 : scoreNum;

    // Report link → url
    const reportRaw = record["report"] ?? "";
    const url = extractMarkdownLink(reportRaw) || reportRaw;

    // Remote: inferred from notes + role
    const notes = record["notes"] ?? "";
    const role = record["role"] ?? "";
    const remote = inferRemote(notes, role);

    applications.push({
      id: record["id"] ?? String(applications.length + 1),
      company: record["company"] ?? "",
      role,
      score,
      status: record["status"] ?? "",
      date: record["date"] ?? "",
      remote,
      url,
    });
  }

  return applications;
}
