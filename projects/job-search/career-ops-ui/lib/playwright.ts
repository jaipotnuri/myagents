import { chromium } from "playwright";

export interface JobPosting {
  title: string;
  company: string;
  description: string;
  url: string;
}

/**
 * scrapeJobPosting — launches a headless Chromium browser, navigates to the
 * given URL, and extracts the job title, company name, and description text.
 *
 * Works with Greenhouse, Lever, Ashby, and most static career pages.
 * For Workday and other heavily-guarded portals, text extraction may be partial.
 *
 * Note: This is used by the UI to pre-fill job data before evaluation.
 * For full portal scanning (discovering new roles), use `/career-ops scan`
 * in the Claude Code CLI which uses the Chrome MCP with session cookies.
 */
export async function scrapeJobPosting(url: string): Promise<JobPosting> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait briefly for JS-rendered content
    await page.waitForTimeout(2000);

    const title = await extractTitle(page);
    const company = await extractCompany(page, url);
    const description = await extractDescription(page);

    return { title, company, description, url };
  } finally {
    await browser.close();
  }
}

async function extractTitle(page: import("playwright").Page): Promise<string> {
  const selectors = [
    "h1.posting-headline",      // Lever
    "h1[data-testid='job-title']",
    ".posting-headline h2",
    "h1.job-title",
    ".gh-job-title",            // Greenhouse
    "[class*='job-title']",
    "[class*='jobTitle']",
    "h1",
  ];

  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 })) {
        const text = (await el.textContent())?.trim();
        if (text && text.length > 2) return text;
      }
    } catch {
      continue;
    }
  }

  // Fallback: page title stripped of company suffix
  const pageTitle = await page.title();
  return pageTitle.split(/[|–\-]/)[0].trim() || "Unknown Title";
}

async function extractCompany(page: import("playwright").Page, url: string): Promise<string> {
  // Try meta tags first
  try {
    const ogSite = await page.$eval(
      'meta[property="og:site_name"]',
      (el) => (el as HTMLMetaElement).content
    );
    if (ogSite) return ogSite.trim();
  } catch { /* not found */ }

  // Platform-specific selectors
  const selectors = [
    ".company-name",
    "[class*='companyName']",
    "[data-testid='company-name']",
    ".employer-name",
  ];

  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 })) {
        const text = (await el.textContent())?.trim();
        if (text) return text;
      }
    } catch {
      continue;
    }
  }

  // Extract from URL — e.g. boards.greenhouse.io/anthropic → "anthropic"
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (u.hostname.includes("greenhouse.io") && segments.length > 0) {
      return capitalize(segments[0]);
    }
    if (u.hostname.includes("lever.co") && segments.length > 0) {
      return capitalize(segments[0]);
    }
    if (u.hostname.includes("ashbyhq.com") && segments.length > 0) {
      return capitalize(segments[0]);
    }
    // Subdomain: careers.anthropic.com → anthropic
    const parts = u.hostname.split(".");
    if (parts.length >= 3) return capitalize(parts[parts.length - 2]);
  } catch { /* invalid url */ }

  return "Unknown Company";
}

async function extractDescription(page: import("playwright").Page): Promise<string> {
  const selectors = [
    ".posting-description",     // Lever
    "#content",                 // Greenhouse
    ".job-description",
    "[class*='jobDescription']",
    "[class*='job-description']",
    ".description",
    "article",
    "main",
  ];

  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 })) {
        const text = (await el.innerText())?.trim();
        if (text && text.length > 100) {
          // Limit to 6000 chars to keep within eval token budget
          return text.slice(0, 6000);
        }
      }
    } catch {
      continue;
    }
  }

  // Last resort: full page text
  const bodyText = await page.innerText("body");
  return bodyText.slice(0, 6000);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
