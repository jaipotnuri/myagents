# Job Search — AI-Powered Pipeline

A personal AI job search system built on top of [career-ops](https://github.com/santifer/career-ops) by [@santifer](https://github.com/santifer), customized for my AI Engineer search.

> **Base system:** [santifer/career-ops](https://github.com/santifer/career-ops) — all credit for the core architecture, scoring system, and pipeline design. This fork adapts it for a Cowork (Claude desktop) environment and extends it with additional scan levels.

---

## What It Does

- **Scans 70+ AI companies** across 4 levels: Ashby API, Greenhouse API, Chrome MCP, and WebSearch
- **Evaluates job descriptions** with a 6-dimension A-F scoring system (Match con CV, North Star alignment, Comp, Cultural signals, Red flags)
- **Generates tailored CV PDFs** per JD — ATS-optimized, customized Professional Summary and bullet selection
- **Tracks everything** in `data/applications.md` — one source of truth with status lifecycle
- **Processes in batch** — evaluate 10+ offers in parallel with sub-agents

---

## My Customizations vs. Upstream

| Area | Upstream (career-ops) | This Fork |
|------|----------------------|-----------|
| Browser automation | Playwright (`browser_navigate` + `browser_snapshot`) | Chrome MCP (`mcp__Claude_in_Chrome__navigate` + `get_page_text`) |
| Job board scanning | Level 1 (custom pages) + Level 2 (Greenhouse) + Level 3 (WebSearch) | Added **Level 1.5** — Ashby public JSON API (no browser needed) |
| Per-company queries | Not in original | Added `scan_query` execution per company (Level 3b) |
| Level 3 discovery | Manual add to portals.yml | **Auto-promotion**: new companies detected via WebSearch auto-added with correct platform detection |
| TSV tracker format | One file per job | **One file per batch day** (`batch-{YYYY-MM-DD}.tsv`, multi-line) |
| Companies covered | ~30 in template | 70+ AI companies in `portals.yml` |

---

## Setup

### 1. Fill in your profile

```bash
# 1. Your master CV
cv.md

# 2. Personal info, comp targets, visa status
config/profile.yml

# 3. Archetype framing and narrative
modes/_profile.md
```

### 2. Install dependencies

```bash
cd projects/job-search
npm install
```

### 3. Set your PDF template (optional)

The `generate-pdf.mjs` script uses `cv-template.html` as the base. Customize it to match your design.

---

## Quick Commands

Run from `projects/job-search/`:

| Command | What it does |
|---------|-------------|
| Paste a job URL | Auto-evaluates with A-F scoring + generates tailored CV PDF |
| `/career-ops scan` | Scan all configured portals for new AI Engineer roles |
| `/career-ops pipeline` | Evaluate pending jobs from `data/pipeline.md` |
| `/career-ops batch` | Batch evaluate multiple jobs in parallel |
| `/career-ops tracker` | View application status overview |
| `node merge-tracker.mjs` | Merge batch TSV additions into `data/applications.md` |
| `node merge-tracker.mjs --dry-run` | Preview merge without writing |

---

## Scan Architecture

The scanner hits companies in priority order — fastest and most reliable first:

```
Level 1.5  Ashby JSON API         → api.ashbyhq.com/posting-api/job-board/{slug}
Level 2    Greenhouse JSON API    → boards-api.greenhouse.io/v1/boards/{slug}/jobs
Level 1    Chrome MCP             → Lever boards and custom career pages
Level 3a   WebSearch broad        → "{company} AI Engineer jobs 2026"
Level 3b   WebSearch per-company  → Uses scan_query field from portals.yml
```

New companies found via Level 3 are auto-promoted to `portals.yml` with the correct platform detected from the URL pattern.

---

## Key Files

```
projects/job-search/
├── cv.md                      # Master CV (fill this in)
├── config/profile.yml         # Personal config, comp targets
├── portals.yml                # 70+ companies to scan
├── modes/
│   ├── _shared.md             # Scoring rules, global constraints
│   ├── _profile.md            # Your archetype framing (fill this in)
│   ├── scan.md                # Scanner instructions
│   └── evaluate.md            # Evaluation mode
├── data/
│   ├── applications.md        # Tracker (gitignored — personal)
│   ├── pipeline.md            # Pending jobs queue (gitignored)
│   └── scan-history.tsv       # Seen URLs (gitignored)
├── batch/
│   └── tracker-additions/     # batch-{YYYY-MM-DD}.tsv files (gitignored)
├── reports/                   # Per-job evaluation reports
├── merge-tracker.mjs          # Merges TSV batches into applications.md
├── generate-pdf.mjs           # Generates tailored CV PDF
└── cv-sync-check.mjs          # Validates CV data integrity
```

---

## Scoring System

Every job gets scored across 6 dimensions:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Match con CV | 30% | Skills, experience, proof points alignment |
| North Star alignment | 25% | Fit with target archetypes |
| Comp | 15% | Salary vs market rate |
| Cultural signals | 15% | Culture, growth, remote policy, stability |
| Red flags | 15% | Blockers, warnings (negative) |
| **Global** | — | Weighted average |

**Decision thresholds:**
- 4.5+ → Apply immediately
- 4.0–4.4 → Worth applying
- 3.5–3.9 → Apply only with specific reason
- Below 3.5 → Skip

---

## Tracker Lifecycle

```
Evaluated → Applied → Responded → Interview → Offer
                                              ↘ Rejected
                                 ↘ Rejected
                    ↘ Rejected
         ↘ Discarded (dead links, duplicates, geo-blocked)
         ↘ SKIP (not applying — monitored only)
```

---

## Credits

Built on [career-ops](https://github.com/santifer/career-ops) by [Santiago Fernández](https://github.com/santifer). The original system is a fully open-source AI-powered job search pipeline. This fork adapts it for the Cowork desktop environment with Ashby API integration and extended portal coverage.

---

## Contact

**Jai Potnuri**
- GitHub: [github.com/jaipotnuri](https://github.com/jaipotnuri)
- LinkedIn: [linkedin.com/in/jaipotnuri](https://linkedin.com/in/jaipotnuri)
- Email: jaipotnuri7@gmail.com
