# myagents

A personal AI agent workspace for daily research, learning, and high-impact work. Built on Claude Code + Cowork with a modular agent architecture and specialized skills.

---

## What's Here

10 purpose-built agents, 30+ skills, and a full job search pipeline — all running on Claude via the Cowork desktop app.

### Agents

| Agent | Use for |
|-------|---------|
| `researcher` | Multi-source deep research, topic synthesis, literature review |
| `learner` | Study plans, flashcards, concept breakdowns, quizzes |
| `writer` | Blog posts, emails, newsletters, content drafts |
| `daily-digest` | Morning briefings from Gmail + Google Calendar |
| `chief-of-staff` | Full inbox triage, draft replies, communication management |
| `code-agent` | Code review, debugging, architecture, system design |
| `planner` | Multi-step planning, agent builds, campaign strategy |
| `agent-architect` | Design new agents, multi-agent systems, architecture decisions |
| `loop-operator` | Monitor and control autonomous multi-step agent loops |
| `notes-manager` | Apple Notes "2026 - To Do" CRUD + daily top-2 email digest |

### MCP Servers

| Server | Purpose |
|--------|---------|
| `exa` | Neural web search |
| `context7` | Live library/framework documentation |
| `memory` | Persistent cross-session memory |
| `sequential-thinking` | Complex multi-step reasoning |
| `gmail` | Email reading and drafting |
| `google-calendar` | Calendar access |

---

## Projects

Self-contained projects with their own agents, data, and outputs:

### job-search (`projects/job-search/`)

An AI-powered job search pipeline built on [career-ops](https://github.com/santifer/career-ops) by [@santifer](https://github.com/santifer), customized for an AI Engineer search in the US market.

**What it does:**
- Scans 70+ AI companies across 4 levels: Ashby API → Greenhouse API → Chrome MCP → WebSearch
- Evaluates job descriptions with a 6-dimension A-F scoring system
- Generates tailored, ATS-optimized CV PDFs per job description
- Tracks applications through the full lifecycle in a single source of truth
- Batch-processes 10+ evaluations in parallel with sub-agents

**Key customizations over upstream career-ops:**
- Chrome MCP replaces Playwright (works natively in Cowork)
- Ashby JSON API added as Level 1.5 — real-time, no browser needed
- Per-company `scan_query` execution for targeted searches
- Auto-promotion of Level 3 discoveries to `portals.yml`
- Batch TSV format — one file per day, multiple jobs per file

See [projects/job-search/README.md](projects/job-search/README.md) for full docs.

---

## Layout

```
myagents/
├── CLAUDE.md                    # Project conventions and agent index
├── .mcp.json                    # MCP server config
├── .claude/
│   ├── agents/                  # Agent definitions (10 agents)
│   ├── commands/                # Workflow commands
│   ├── rules/                   # Agent conventions
│   ├── research/                # Research playbook
│   └── skills/                  # 30+ skills (auto-load by trigger)
├── outputs/                     # All agent deliverables
│   ├── research/
│   ├── learning/
│   └── writing/
└── projects/
    └── job-search/              # AI Engineer job search pipeline
```

---

## Author

**Jai Potnuri** — Senior AI Engineer, Raleigh-Durham NC
- GitHub: [github.com/jaipotnuri](https://github.com/jaipotnuri)
- LinkedIn: [linkedin.com/in/jaipotnuri](https://linkedin.com/in/jaipotnuri)
