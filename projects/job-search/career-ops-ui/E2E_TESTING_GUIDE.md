# Career-Ops UI — End-to-End Testing Guide

This guide walks you through every feature of the career-ops UI at localhost:3000, from first-time setup all the way through evaluating, applying to, and tracking job applications.

**NOTE: Server Restart Required**
Before starting any evaluations, you must restart the Next.js development server to pick up the write_file bug fix:
```bash
cd ~/myrepo/myagents/projects/job-search/career-ops-ui && npm run dev
```
Then navigate to `localhost:3000` and proceed.

---

## Table of Contents

1. [Phase 0: First-Time Setup](#phase-0-first-time-setup)
2. [Phase 1: Profile & Career Targets](#phase-1-profile--career-targets)
3. [Phase 2: Company List Configuration](#phase-2-company-list-configuration)
4. [Phase 3: Scan for New Opportunities](#phase-3-scan-for-new-opportunities)
5. [Phase 4: Pipeline Management](#phase-4-pipeline-management)
6. [Phase 5: Evaluate a Single Offer](#phase-5-evaluate-a-single-offer)
7. [Phase 6: Compare Top Picks](#phase-6-compare-top-picks)
8. [Phase 7: Deep Dive on Shortlisted Companies](#phase-7-deep-dive-on-shortlisted-companies)
9. [Phase 8: Generate Tailored CV PDF](#phase-8-generate-tailored-cv-pdf)
10. [Phase 9: Live Application Assistance](#phase-9-live-application-assistance)
11. [Phase 10: Track Application Outcomes](#phase-10-track-application-outcomes)
12. [Phase 11: Analyze Rejection Patterns](#phase-11-analyze-rejection-patterns)
13. [Phase 12: Continuous Loop & Automation](#phase-12-continuous-loop--automation)

---

## Phase 0: First-Time Setup

The UI checks for required files on startup. If anything is missing, set it up here.

### Step 1: Verify Files Exist

Navigate to **Profile** (left nav → Profile).

The Profile page will show you:
- **Left panel:** Your CV (cv.md) as formatted text
- **Right panel:** Profile fields (name, email, location, comp target, visa status, north star goal)

**If either panel is empty or shows errors:**

**For CV (if missing or empty):**
1. Go to **Agent** (left nav → Agent)
2. You will need to manually create or paste your CV. The easiest way is to ask the Agent to help with onboarding:
   - In the Agent page, select mode: **"Evaluate Offer"** (any mode that accepts text)
   - In the input box, paste a sample CV or describe your experience
   - Actually, better approach: Create `cv.md` file directly in the project root with your resume content
   - Or: Go to **Profile** page, manually edit the CV section (if UI allows) or paste your CV via a bulk import

**For Profile fields (if missing):**
1. Go to **Profile** (left nav)
2. Click **Edit** button in the right panel
3. Fill in all 6 fields:
   - **Full Name:** Your name
   - **Email:** Your work email
   - **Location:** Your timezone/city
   - **Comp Target:** Target salary range (e.g., "$250K total comp")
   - **Visa Status:** e.g., "US Citizen", "H-1B", "Green Card"
   - **North Star Goal:** Your career objective (e.g., "Build AI infrastructure at scale")
4. Click **Save**

### Step 2: Verify Portals Configuration

The system uses portals.yml to know which companies to scan.

1. Go to **Profile** → scroll down to see if portals are configured
2. If portals.yml is missing or minimal:
   - Use **Agent** mode **"Scan Portals"** with input: `leave blank to use defaults`
   - Or manually verify that `portals.yml` exists in the project root (copy from templates/portals.example.yml if needed)

### Step 3: Verify Data Files

Before proceeding, these files should exist:
- `cv.md` — your resume in markdown
- `config/profile.yml` — your profile details
- `data/applications.md` — tracker table (will be created or shown in Tracker screen)
- `data/pipeline.md` — pending URLs (can start empty)
- `portals.yml` — company portal list

You don't need to check these manually in Phase 0. The UI will show errors if they're missing, and you can fix them in later phases.

---

## Phase 1: Profile & Career Targets

Personalize the system so it understands your goals and can score offers accurately.

### Step 1: Edit Your Profile

1. Go to **Profile** (left nav)
2. Right panel shows 6 editable fields
3. Click **Edit** button
4. Update each field:
   - Make sure your full name and email are correct
   - Location should be timezone-aware (e.g., "San Francisco, CA" or "UTC-8")
   - Comp Target examples: "$250K-300K total comp", "€150K base + bonus", "$200K base min"
   - Visa Status: Required for offer evaluation (affects sponsorship questions)
   - North Star Goal: Should reflect what excites you (e.g., "Lead AI/ML infrastructure team", "Build LLM applications", "Work on agent systems")
5. Click **Save**

**Expected result:** Profile fields are saved to `config/profile.yml`.

### Step 2: Review Your CV

1. On **Profile** page, left panel shows your CV as formatted text
2. Check:
   - Summary section is compelling
   - Experience shows your best 3-5 roles (with dates, company, achievements)
   - Projects (if any) showcase your strongest work
   - Education section is complete
   - Skills are relevant to your target roles

**If CV needs updates:**
1. You'll need to edit `cv.md` manually in your editor, OR
2. Use **Agent** mode **"Apply Assistant"** and ask it to help refine your CV
3. Then refresh the **Profile** page to see updated CV

### Step 3: Define Your Archetypes & Deal-Breakers

This is handled in `modes/_profile.md`, which you can edit through the Agent or manually.

For now, assume default archetypes. You can customize later if needed:
1. Go to **Agent** (left nav)
2. Select mode: **"Tracker Overview"**
3. Leave input blank
4. Click **Run**
5. The Agent will summarize current archetypes and deal-breakers from your profile

**Expected output:** Confirms your north star goal, comp targets, and visa constraints.

---

## Phase 2: Company List Configuration

The Scanner will scan 70+ pre-configured companies. You can customize which ones to scan.

### Step 1: View Current Portals

1. Go to **Scanner** (left nav)
2. You should see a grid of company logos/names
3. Scroll through to see companies like: Anthropic, OpenAI, Stripe, Figma, etc.

**If no companies show:**
1. Go to **Agent** (left nav)
2. Select mode: **"Scan Portals"**
3. Input: `anthropic, openai, stripe` (just a test)
4. Click **Run**
5. The Agent will verify portals are configured

### Step 2: Add or Remove Companies (Optional)

If you want to customize the company list:

**Via Agent (simplest):**
1. Go to **Agent**
2. Select mode: **"Scan Portals"**
3. Input: `add: Anthropic, OpenAI, Stripe` or `remove: FakeCompany`
4. Click **Run**
5. The Agent will update `portals.yml` accordingly

**Via Profile Edit (direct):**
1. Go to **Profile**
2. Scroll to bottom to see portals section (if editable)
3. Add/remove companies
4. Click Save

**Expected result:** Scanner page updates to show the new company list.

### Step 3: Verify Scanner Ready

1. Go to **Scanner** (left nav)
2. You should see:
   - Grid of 50+ company cards
   - **"Scan All"** button in top right
   - Company names are clickable (leads to their job portal)

---

## Phase 3: Scan for New Opportunities

Scan company portals to find new job URLs and add them to your pipeline.

### Step 1: Scan All Companies

1. Go to **Scanner** (left nav)
2. Click **"Scan All"** button (top right)
3. You'll see a progress indicator and live scan results

**What the scanner does:**
- Checks each company's job portal
- Verifies URLs are still active (not 404'd)
- Adds new matching roles to `data/pipeline.md`
- Skips URLs already in your history (dedup via `data/scan-history.tsv`)

**Expected output:**
- Scan completes in 1-5 minutes depending on company count
- Shows "X new roles found" or "0 new roles, all current"
- New URLs appear in **Pipeline** screen

**Known limitation:** Scanning 70+ companies at once may hit rate limits. If scan times out or fails:
1. Try again with a smaller subset: Go to **Agent** → **"Scan Portals"** → Input: `anthropic, openai, stripe` (3 companies)
2. Or wait 5 minutes and retry

### Step 2: View Scan Results in Pipeline

1. Go to **Pipeline** (left nav)
2. You should see a list of pending URLs with statuses:
   - **pending** — newly found, not yet evaluated
   - **evaluating** — in progress
   - **done** — evaluated, report generated

**Expected state after scan:**
- Pipeline shows 5-20 new pending URLs (depends on company hiring volume)
- Each URL has: company name, role title, date found, status badge

---

## Phase 4: Pipeline Management

Manage the queue of job URLs to evaluate. You can add URLs manually, remove ones that don't fit, and process the queue.

### Step 1: Add a URL Manually (Optional)

1. Go to **Pipeline** (left nav)
2. Look for **"Add URL"** button or input box
3. Paste a full job posting URL (e.g., `https://jobs.anthropic.com/jobs/12345`)
4. Click **Add** or **Enter**

**Expected result:** URL appears in pipeline with status "pending".

### Step 2: Review Pipeline Queue

1. Go to **Pipeline**
2. Read through the list:
   - Which companies are hiring?
   - Which roles match your target? (e.g., "ML Engineer", "AI Infrastructure", not "Sales")
   - Remove obvious non-fits by clicking the **X** or **Remove** button next to each URL

**Expected behavior:**
- You can remove 2-3 roles that clearly don't fit your profile
- Remaining 3-5 URLs are in scope to evaluate

### Step 3: Process Pipeline with Agent

Now let the Agent evaluate all pending URLs at once.

1. Go to **Agent** (left nav)
2. Select mode: **"Process Pipeline"**
3. Input: leave blank (processes all pending)
4. Click **Run**
5. Watch the live stream as the Agent:
   - Reads each JD
   - Scores it against your profile (A-F scale)
   - Generates a short evaluation report
   - Updates `data/applications.md` tracker
   - Updates `data/pipeline.md` status to "done"

**Expected output after 2-10 minutes:**
- Multiple evaluation reports generated in `reports/` folder
- Tracker shows new rows for each evaluated job
- Pipeline shows all URLs as "done"

**Note on speed:**
- First evaluation takes longer (Claude spins up)
- Subsequent evaluations cache results
- 5 URLs typically takes 5-10 minutes

---

## Phase 5: Evaluate a Single Offer

Sometimes you find one job posting and want to evaluate it immediately. Use Evaluate Offer mode.

### Step 1: Get a Job Description

You can provide either:
- **A full job URL:** `https://www.anthropic.com/careers/12345`
- **Pasted JD text:** Copy-paste the job description from LinkedIn, company website, etc.

### Step 2: Run Evaluate Offer

1. Go to **Agent** (left nav)
2. Select mode: **"Evaluate Offer"** (first in the dropdown)
3. Paste either the URL or JD text in the input box
4. Click **Run**
5. Watch the Agent:
   - Parse the JD
   - Extract company, role, comp, location, benefits
   - Score across dimensions: role fit, comp, growth, culture, logistics
   - Generate an A-F rating
   - Create a detailed markdown report

**Example input (URL):**
```
https://www.anthropic.com/careers/ml-engineer
```

**Example input (pasted JD):**
```
Title: Senior ML Engineer at Anthropic

Anthropic is seeking a Senior ML Engineer to work on LLM safety...
Requirements: 5+ years Python, PyTorch experience...
Compensation: $300-350K base + equity
Location: San Francisco, hybrid
```

### Step 3: Review the Output

The Agent will stream:
1. **Thinking phase:** Claude analyzes the JD
2. **Tool calls:** Extracting data, writing reports
3. **Final report:** Detailed evaluation with:
   - **Company name & role**
   - **Score:** e.g., "4.3/5"
   - **Fit summary:** Why you'd be a good match
   - **Concerns:** Any red flags
   - **Next steps:** Should you apply?

### Step 4: Check Generated Report

After the Agent finishes:
1. Go to **Reports** (left nav)
2. Newest report should be at the top (today's date)
3. Click on it to read full details
4. Look for:
   - URL verification (does it say "✓ Active" or "✗ Inactive"?)
   - Score breakdown by category
   - Recommendation (Apply / Consider / Skip)

**Expected result:**
- Report is saved as `reports/NNN-{company}-{date}.md`
- Tracker is updated with new entry for this job
- Status is "Evaluated"

---

## Phase 6: Compare Top Picks

After evaluating 2-3 offers, compare them side-by-side to decide which to pursue.

### Step 1: Gather Job Descriptions

Get URLs or text for 2-3 top offers. Examples:
- **Offer A:** Anthropic, Senior ML Engineer
- **Offer B:** OpenAI, Research Engineer
- **Offer C:** Stripe, AI Engineer

### Step 2: Run Compare Offers Agent

1. Go to **Agent** (left nav)
2. Select mode: **"Compare Offers"** (find it in dropdown)
3. Input format: Paste the 2-3 JDs separated by `---`:
   ```
   https://anthropic.com/careers/senior-ml-engineer
   ---
   https://openai.com/careers/research-engineer
   ---
   https://stripe.com/careers/ai-engineer
   ```
   OR paste full JD text with `---` separators
4. Click **Run**
5. Agent will:
   - Evaluate each offer independently
   - Compare across comp, role fit, growth, logistics
   - Rank them 1st, 2nd, 3rd
   - Highlight tradeoffs (higher comp vs. better role fit, etc.)

**Expected output:**
```
Comparison of 3 offers:

1. Anthropic Senior ML Engineer — 4.5/5
   - Best role fit (LLM safety aligns with your north star)
   - Solid comp ($320K)
   - Top-tier team
   
2. Stripe AI Engineer — 4.2/5
   - Strong role fit, but more infrastructure vs. research
   - Higher comp ($350K)
   
3. OpenAI Research Engineer — 3.8/5
   - Great mission, but less clarity on day-to-day
   - Comp negotiable
```

### Step 3: Decide Your Top 2

After reading the comparison:
1. Note which 2 you want to pursue
2. Plan to apply to top 1-2 within 48 hours
3. Rest can be revisited if you get rejections

---

## Phase 7: Deep Dive on Shortlisted Companies

Before applying, research the company thoroughly and prepare interview stories.

### Step 1: Run Deep Research

1. Go to **Agent** (left nav)
2. Select mode: **"Deep Research"** (in dropdown)
3. Input: Company name and role, e.g., `Anthropic, Senior ML Engineer`
4. Click **Run**
5. Agent will:
   - Research company founding story, recent funding, mission
   - Look up leadership team and engineering culture
   - Identify strategic focus (LLMs, safety, infrastructure, etc.)
   - Extract key problems the team is likely solving
   - Find recent news/announcements

**Expected output:**
- Company overview (mission, funding, size, growth stage)
- Leadership highlights (CEO, CTO, research leads)
- Current strategic focus
- Potential interview topics (what they care about)

### Step 2: Generate Interview Prep Report

1. Go to **Agent** (left nav)
2. Select mode: **"Interview Prep"** (in dropdown)
3. Input: Company name + role, e.g., `Anthropic, Senior ML Engineer`
4. Click **Run**
5. Agent will:
   - Use your story bank (from `interview-prep/story-bank.md`) OR
   - Ask you to share relevant STAR+R stories from your CV
   - Generate company-specific interview tips:
     - Common questions at this company
     - How to frame your experience
     - Red flags to avoid
     - Questions to ask the interviewer

**Expected output:**
- Interview prep report saved to `interview-prep/{company}-{role}.md`
- 5-10 tailored stories mapped to likely interview questions
- Tips specific to the company's culture and values

---

## Phase 8: Generate Tailored CV PDF

Before applying, generate an ATS-optimized PDF resume tailored to the specific role.

### Step 1: Run Generate CV PDF

1. Go to **Agent** (left nav)
2. Select mode: **"Generate CV PDF"** (in dropdown)
3. Input: Company name and role, e.g., `Anthropic, Senior ML Engineer`
4. Click **Run**
5. Agent will:
   - Extract keywords from the job description
   - Reorder your CV to highlight most relevant experience
   - Boost bullet points that match the role (without lying)
   - Generate HTML using `templates/cv-template.html`
   - Convert to PDF using Playwright
   - Save to `output/{company}_{role}.pdf`

**Example input:**
```
Anthropic, Senior ML Engineer
```

**Expected output:**
- PDF file created and saved
- UI shows "PDF generated ✓"
- PDF is ready to attach to your application

### Step 2: Download and Review PDF

1. Check **Reports** or **Logs** to see the PDF generation command completed
2. Or navigate to `output/` folder to find the PDF file
3. Open the PDF and verify:
   - Your name and contact info at top
   - Most relevant experience is front-and-center
   - LLM/ML keywords are emphasized (if role requires it)
   - Format is clean and ATS-friendly (no colors, simple fonts)

---

## Phase 9: Live Application Assistance

Now apply to the job. The Agent can help fill forms and draft answers in real-time.

### Step 1: Access the Application Form

1. Go to the company's careers page or LinkedIn job posting
2. Click **Apply** button
3. Most applications require:
   - Resume upload (use the tailored PDF from Phase 8)
   - Cover letter or short answer (250 words, "Why do you want this role?")
   - Optional: Work portfolio, Github, personal website

### Step 2: Get Application Assistance from Agent

1. Go to **Agent** (left nav)
2. Select mode: **"Apply Assistant"** (in dropdown)
3. Input: Either:
   - Paste the job URL: `https://anthropic.com/careers/12345`
   - Paste the application form questions as text
   - Example:
     ```
     1. Why are you interested in this role?
     2. Tell us about your experience with large language models
     3. What excites you about Anthropic's mission?
     ```
4. Click **Run**
5. Agent will:
   - Understand the role context
   - Draft tailored answers to each question
   - Reference your experience and achievements
   - Keep answers under word limits
   - Ensure each answer is specific to Anthropic (not generic)

**Expected output:**
```
Question 1: Why are you interested in this role?

Draft answer:
"I'm drawn to Anthropic because of your focus on AI safety — 
something I've cared deeply about since [your relevant experience]. 
In my role at [Company], I led [achievement], which directly 
parallels the work your safety team is doing. I want to contribute 
my experience with [relevant skill] to help make advanced AI systems 
more interpretable and aligned."

---

Question 2: Tell us about your experience with LLMs...
[more tailored drafts]
```

### Step 3: Review and Submit

**CRITICAL: Before clicking Submit/Apply:**
1. Read the Agent's draft answers
2. Verify facts (dates, company names, role titles are correct)
3. Edit for tone (make it sound like you, not AI-generated)
4. Ensure it answers the question asked (not a generic "why Anthropic" when asked "what excites you about this role?")
5. Copy-paste into the application form
6. Review one more time
7. **Then click Submit**

**Expected workflow:**
- Agent drafts answers in 1-2 minutes
- You spend 5 minutes editing and personalizing
- You apply within 10 minutes total

---

## Phase 10: Track Application Outcomes

Update your tracker as you progress through each application.

### Step 1: View Current Tracker

1. Go to **Tracker** (left nav)
2. You should see a table with columns:
   - **#** — auto-numbered
   - **Date** — when you applied
   - **Company** — company name
   - **Role** — job title
   - **Score** — 1-5 rating from evaluation
   - **Status** — Evaluated / Applied / Screening / Interview / Offer / Rejected
   - **PDF** — ✓ if tailored CV was generated
   - **Report** — link to evaluation report
   - **Notes** — one-liner about what happened

### Step 2: Update Status After Applying

After you submit an application:
1. Go to **Tracker**
2. Find the row for the company you just applied to
3. Change **Status** from "Evaluated" to "Applied"
4. Update **Date** to today if it's not auto-filled
5. Add a **Note** (optional): "Applied on 4/14, waiting for HM screening"

**Expected result:**
- Status badge changes to blue ("Applied" color)
- Tracker shows your progress across the pipeline

### Step 3: Update After Each Stage

As you progress, update the status:

| Stage | Status | When to Update |
|-------|--------|---|
| Evaluated offer, not applying | `SKIP` | Before applying |
| Submitted application | `Applied` | Right after hitting Submit |
| Company sends you a question or screening task | `Screening` | When you hear from them |
| You have a call or interview scheduled | `Interview` | When the interview is on the calendar |
| You get an offer | `Offer` | When they send an offer email |
| You get rejected | `Rejected` | When they send a rejection |

### Step 4: Merge Tracker Additions

If you've been using the Agent to process URLs in batches, you may have tracker additions in `batch/tracker-additions/`. Merge them:

1. Go to **Scripts** (left nav)
2. Find script: **"Merge Tracker"**
3. Click **Run**
4. Expected result: Batch additions are merged into `data/applications.md`, avoiding duplicates

---

## Phase 11: Analyze Rejection Patterns

After 5+ applications, analyze why you're being rejected and improve your targeting.

### Step 1: Build Application History

1. Continue applying to roles and updating statuses (Phase 10)
2. Collect at least 5-10 applications with various outcomes:
   - 2-3 "Applied" (waiting to hear back)
   - 1-2 "Screening" (progressing)
   - 2-3 "Rejected" (feedback loop)

### Step 2: View Patterns Screen

1. Go to **Patterns** (left nav)
2. If you have fewer than 5 applications, you'll see: "Need 5+ applications to analyze patterns"
3. Once you have 5+, you'll see:
   - **Rejection rate** (e.g., "40% of applications rejected in first week")
   - **Acceptance rate** (e.g., "30% advanced to screening")
   - **Average time to response** (e.g., "4 days")
   - **Top companies rejecting you** (e.g., "Early-stage startups")
   - **Roles with highest success** (e.g., "ML Engineer" > "Research Engineer")

### Step 3: Run Rejection Patterns Agent

1. Go to **Agent** (left nav)
2. Select mode: **"Rejection Patterns"** (in dropdown)
3. Input: Leave blank (analyzes all rejections) OR enter a date range: `2026-04-01 to 2026-04-14`
4. Click **Run**
5. Agent will:
   - Analyze all your rejections
   - Identify common themes (comp too low, startup fatigue, role mismatch)
   - Suggest targeting adjustments (focus on Series B+ instead of seed stage)
   - Recommend CV tweaks (emphasize X instead of Y)
   - Propose new archetype or deal-breaker to add

**Expected output:**
```
Rejection Analysis:

Your rejections cluster into 3 categories:

1. ROLE FIT (40% of rejections)
   - Pattern: "You're overqualified for junior roles"
   - Fix: Shift to "Senior ML Engineer" or "Staff Engineer" level only
   - Action: Update title filter in portals.yml to exclude "Junior"

2. COMPENSATION (35% of rejections)
   - Pattern: Small startups can't match your $250K target
   - Fix: Accept $180K+ in exchange for larger equity (Series B+)
   - Action: Add deal-breaker: "Only startups with $50M+ funding"

3. STARTUP STAGE (25% of rejections)
   - Pattern: Pre-seed startups move slower
   - Fix: Focus on Series A+ companies with faster hiring
   - Action: Exclude pre-seed from scanner

Recommendation: Update your archetypes to emphasize "mid-stage startup" 
and "large company" options, de-emphasize early-stage. This should improve 
your acceptance rate from 30% to 50%+.
```

### Step 4: Implement Changes

Based on the Agent's analysis:
1. Update `modes/_profile.md` with new deal-breakers
2. Update `portals.yml` to exclude non-matching companies
3. Re-scan (Phase 3) with new filters
4. Resume applying with better targeting

---

## Phase 12: Continuous Loop & Automation

Set up a repeating workflow so you're always finding and evaluating new roles.

### Step 1: Manual Cadence (No Automation)

1. **Every Monday morning:**
   - Go to **Scanner** (left nav)
   - Click **"Scan All"**
   - Let it run for 5 minutes
   - Check Pipeline for new URLs

2. **Every day (15 min):**
   - Go to **Agent** → **"Process Pipeline"**
   - Evaluate any new pending URLs
   - Review reports

3. **Every Friday:**
   - Go to **Tracker** (left nav)
   - Update any statuses that changed
   - Go to **Patterns** (if 5+ apps) to check rejection trends

### Step 2: Bulk Evaluation with Batch Mode

If you have a large pipeline (10+ URLs), use batch processing:

1. Go to **Agent** (left nav)
2. Select mode: **"Batch Process"** (in dropdown)
3. Input: Paste all pending URLs, one per line:
   ```
   https://anthropic.com/careers/12345
   https://openai.com/careers/67890
   https://stripe.com/careers/11111
   ```
4. Click **Run**
5. Agent will evaluate all 3 URLs in parallel (faster than sequential)
6. Each gets a report and tracker entry

**Expected result:**
- 3 evaluations complete in 5-8 minutes (vs. 10+ sequential)
- All reports saved
- Tracker updated with all 3 entries

### Step 3: Scheduled Scanning (Optional Advanced)

If you want automatic scanning without manual triggering:
1. Go to **Scripts** (left nav)
2. Look for options to schedule a recurring scan task
3. Or set a calendar reminder to scan every Monday at 9 AM

**Current state:** Manual scanning is supported. Automated scheduling may require additional setup outside the UI (cron job, external scheduler).

### Step 4: Keep Your Data Fresh

Periodically verify your data doesn't get stale:
1. **Weekly:** Run **Tracker Overview** (Agent) to see pipeline health
2. **Weekly:** Run **Verify Pipeline** script to catch broken URLs
3. **Monthly:** Run **Dedup Tracker** script to remove duplicate entries if they occur

---

## Known Limitations & Workarounds

### Scanner Rate Limiting
**Problem:** Scanning all 70+ companies at once may timeout or hit rate limits.
**Workaround:** Scan in smaller batches of 10-15 companies at a time.

### Write_file Bug
**Problem:** Evaluate Offer doesn't save reports to disk or update tracker.
**Workaround:** Ensure you restarted the Next.js server (see top of guide) with the write_file fix applied.

### PDF Generation Delays
**Problem:** PDF generation can take 30-60 seconds on first run.
**Workaround:** Be patient. Subsequent PDFs are faster. You can see progress in **Logs** page.

### Interview Prep Missing Story Bank
**Problem:** Interview Prep asks for stories if you don't have any in `interview-prep/story-bank.md`.
**Workaround:** Manually create story-bank.md with 3-5 STAR+R stories from your CV, OR let the Agent ask you for stories during the run.

### Patterns Analysis Requires 5+ Applications
**Problem:** Rejection Patterns screen shows nothing until you have 5+ applications with outcomes.
**Workaround:** Complete Phase 10 (tracking outcomes) for at least 5 jobs first. Data comes from real applications you've made.

---

## Troubleshooting Checklist

| Issue | Solution |
|-------|----------|
| UI won't load (blank page) | Check that `npm run dev` is running. Restart server. Check localhost:3000 in browser. |
| Profile screen shows empty CV | cv.md is missing. Create it manually or use Agent to generate one. |
| Profile fields show but don't save | Click Edit first, then enter values, then Save. If it still doesn't work, restart server. |
| Scanner shows no companies | portals.yml is missing. Copy from templates/portals.example.yml. |
| Evaluate Offer doesn't generate report | Server needs restart (write_file fix). Run: `cd career-ops-ui && npm run dev` |
| Agent commands timeout | Try with smaller input. For scans, do 5-10 companies at a time instead of all 70. |
| Tracker is empty | No applications have been evaluated yet. Go through Phase 5-6 to create some. |
| Patterns shows no data | Need 5+ applications with outcomes beyond "Evaluated". Track some real rejections/acceptances first. |

---

## Summary: Path to First Application

Here's the fastest path to get one job application tracked:

1. **Phase 0:** Verify cv.md, config/profile.yml, portals.yml exist
2. **Phase 1:** Edit Profile with your name, email, comp target
3. **Phase 3:** Scan portals (or manually add a URL in Phase 4)
4. **Phase 5:** Run Evaluate Offer on one job URL
5. **Phase 8:** Generate CV PDF for that role
6. **Phase 9:** Apply on the company website using Agent's help for answers
7. **Phase 10:** Update Tracker to "Applied" status

**Total time:** 20-30 minutes to complete your first tracked application.

---

## Advanced: Exploring Agent Commands

All 15 Agent modes are available in the Agent page. Here's a quick reference:

| Mode | Input | Output | Use When |
|------|-------|--------|----------|
| **Scan Portals** | Company names or blank | New URLs in pipeline | Weekly job search |
| **Evaluate Offer** | URL or JD text | Report + score | Found one job |
| **Compare Offers** | 2-3 JDs separated by --- | Ranked comparison | Choosing between offers |
| **Process Pipeline** | Blank | Evaluate all pending URLs | After scanning |
| **Tracker Overview** | Blank or filter | Summary stats | Check application health |
| **Deep Research** | Company name + role | Company background | Before applying |
| **Interview Prep** | Company name + role | Interview tips + stories | Before interview |
| **Generate CV PDF** | Company name + role | PDF file saved | Before applying |
| **Apply Assistant** | Form questions or URL | Draft answers | Filling application |
| **LinkedIn Outreach** | Company name | Contact list + draft DMs | Networking |
| **Rejection Patterns** | Blank or date range | Analysis + fixes | After 5+ rejections |
| **Evaluate Project** | Project description | Should you build it? | Planning portfolio |
| **Evaluate Training** | Course/cert name | Is it worth taking? | Skill planning |
| **Batch Process** | Multiple URLs, one per line | Rapid evaluations | Large pipeline |
| **Auto Pipeline** | Single URL | Evaluate + report + PDF + track all at once | One-stop evaluation |

---

## Glossary

- **CV (cv.md):** Your resume in markdown format. Source of truth for your background.
- **Profile (profile.yml):** Your personal settings (name, email, comp target, visa status, north star goal).
- **Portals (portals.yml):** Configuration of 70+ company job boards to scan.
- **Pipeline (pipeline.md):** Queue of URLs waiting to be evaluated.
- **Applications Tracker (applications.md):** Table of all evaluated jobs with scores, statuses, and notes.
- **Reports (reports/):** Generated evaluation reports for each job (markdown format).
- **Score (A-F or 1-5/5):** How well a job matches your profile. A=perfect fit, F=poor fit. Typically 1-5 scale with decimals.
- **Status:** Evaluated, Applied, Screening, Interview, Offer, Rejected, SKIP, or Discarded.
- **Modes (_profile.md):** Your custom archetypes, deal-breakers, and scoring weights. Separate from system defaults.
- **Interview Prep:** Company-specific research and story mapping to prepare for interviews.
- **Batch Process:** Evaluate multiple jobs in parallel (faster than one-by-one).

---

## Questions or Customizations?

This system is designed to be personalized. If you want to:
- Change the scoring weights
- Add/remove deal-breakers (e.g., "no startups")
- Translate modes to Spanish
- Add new companies to the scanner
- Customize the CV template design

Just ask! The agent can edit any of these files for you. This is your system to shape.

Good luck with your job search!
