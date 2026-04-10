# myagents — Project Config

## Purpose

This project is a personal agent workspace for Jai. Its goal is to build and orchestrate multiple purpose-built agents for daily use across three domains:

- **Research** — deep-dive investigations, topic summaries, source synthesis
- **Learning** — study plans, flashcards, concept explanations, progress tracking
- **User impact** — writing, outreach, communication, content that reaches people

## Project Layout

```
myagents/
├── CLAUDE.md                    # This file — project conventions
├── README.md                    # Public-facing description
├── .mcp.json                    # MCP server config (exa, context7, memory, sequential-thinking, gmail, gcal)
├── .claude/
│   ├── agents/                  # Sub-agent definitions
│   │   ├── researcher.md        # Deep research agent
│   │   ├── learner.md           # Learning & study agent
│   │   ├── writer.md            # Writing & content agent
│   │   ├── daily-digest.md      # Daily summary agent
│   │   ├── chief-of-staff.md    # Email + calendar triage agent
│   │   ├── code-agent.md        # Coding & engineering agent
│   │   ├── planner.md           # Multi-phase planning specialist
│   │   ├── agent-architect.md   # Agent design & architecture specialist
│   │   ├── loop-operator.md     # Autonomous loop monitor & controller
│   │   └── notes-manager.md     # Apple Notes "2026 - To Do" CRUD + daily email digest
│   ├── commands/
│   │   └── build-agent.md       # Workflow: new agent from idea to shipped
│   ├── rules/
│   │   └── agent-conventions.md # How agents should behave
│   ├── research/
│   │   └── research-playbook.md # Research standards and workflow
│   ├── skills/                  # Project-level skills (auto-load)
│   │   └── [30 skills — see table below]
│   └── hooks/                   # Lifecycle hooks (empty — add as needed)
└── outputs/                     # Where agents save deliverables
    ├── research/
    ├── learning/
    └── writing/
```

## Available Agents

| Agent | Invocation | Use for |
|-------|-----------|---------|
| `researcher` | "use the researcher agent" | Multi-source research, topic deep-dives, literature review |
| `learner` | "use the learner agent" | Study plans, flashcards, concept breakdowns, quizzes |
| `writer` | "use the writer agent" | Blog posts, emails, docs, newsletters, content drafts |
| `daily-digest` | "use the daily-digest agent" | Morning briefings from Gmail + Calendar |
| `chief-of-staff` | "use the chief-of-staff agent" | Full inbox triage, draft replies, communication management |
| `code-agent` | "use the code agent" | Code review, debugging, architecture, system design |
| `planner` | "use the planner agent" | Plan complex multi-step tasks, agent builds, campaigns |
| `agent-architect` | "use the agent-architect agent" | Design new agents, multi-agent systems, architecture decisions |
| `loop-operator` | "use the loop-operator agent" | Monitor and control autonomous multi-step agent loops |
| `notes-manager` | "use the notes-manager agent" | Add/edit/delete items in "2026 - To Do" Apple Note; daily top-2 email digest |

## Skills

Skills load automatically when relevant.

### Research
| Skill | When it fires |
|-------|--------------|
| `deep-research` | "research", "deep dive", "investigate", multi-source synthesis |
| `market-research` | market sizing, competitive analysis, industry intel |
| `exa-search` | web search, neural search via Exa MCP |
| `documentation-lookup` | library/framework/API questions via Context7 MCP |
| `search-first` | before writing code or building anything new |

### Writing & Content
| Skill | When it fires |
|-------|--------------|
| `article-writing` | blog posts, essays, tutorials, newsletter issues |
| `brand-voice` | building a voice profile, consistent style across content |
| `content-engine` | X threads, LinkedIn posts, TikTok scripts, YouTube, social calendars |
| `crosspost` | distributing one piece across multiple platforms |
| `x-api` | posting to X programmatically, reading timelines, X analytics |
| `investor-outreach` | cold emails, warm intros, investor follow-ups |
| `investor-materials` | pitch decks, one-pagers, fundraising docs |

### Outreach & Network
| Skill | When it fires |
|-------|--------------|
| `lead-intelligence` | find leads, qualify prospects, warm path discovery, outreach lists |
| `connections-optimizer` | clean up X/LinkedIn network, grow toward priorities, warm outreach |
| `social-graph-ranker` | rank network contacts, bridge scoring, warm intro mapping |
| `google-workspace-ops` | find, edit, clean up Google Docs/Sheets/Slides as working systems |

### Planning & Execution
| Skill | When it fires |
|-------|--------------|
| `blueprint` | turn an objective into a multi-session, multi-agent construction plan |
| `product-lens` | validate the "why" before building, convert vague ideas to specs |
| `agentic-engineering` | eval-first agent building, decomposition, model routing |
| `continuous-agent-loop` | patterns for continuous autonomous loops with quality gates |
| `prompt-optimizer` | "optimize my prompt", "improve this prompt", "help me write a prompt" |

### Quality & Reliability
| Skill | When it fires |
|-------|--------------|
| `santa-method` | high-stakes output (published content, investor docs, production code) |
| `verification-loop` | before delivering any significant completed work |
| `strategic-compact` | long sessions approaching context limits |
| `context-budget` | auditing token usage when sessions get sluggish |
| `token-budget-advisor` | "short version", "token budget", controlling response depth |

### Learning & Growth
| Skill | When it fires |
|-------|--------------|
| `continuous-learning` | end of sessions — extract reusable patterns (v1) |
| `continuous-learning-v2` | instinct-based learning with confidence scoring (v2) |
| `workspace-surface-audit` | "what am I missing?", "recommend more automations", setup audit |

### Engineering Plugin (auto-trigger)
| Skill | When it fires |
|-------|--------------|
| `documentation` | writing READMEs, runbooks, API docs |
| `system-design` | designing agent architectures |
| `architecture` | ADRs for technology/framework choices |
| `code-review` | reviewing agent code before publishing |
| `debug` | debugging agent scripts or unexpected behavior |
| `testing-strategy` | designing tests for agent workflows |

## MCP Servers (.mcp.json)

| Server | Purpose |
|--------|---------|
| `exa` | Neural web search — powers exa-search skill |
| `context7` | Live documentation — powers documentation-lookup skill |
| `memory` | Persistent cross-session memory for agents |
| `sequential-thinking` | Complex multi-step reasoning chains |
| `gmail` | Email reading and drafting — powers daily-digest and chief-of-staff |
| `google-calendar` | Calendar access — powers daily-digest and chief-of-staff |

## Commands

| Command | Use for |
|---------|---------|
| `/build-agent` | End-to-end workflow for designing and shipping a new agent |

## Working Conventions

### File outputs
- All agent deliverables go to `outputs/` (create subdirs as needed)
- Use descriptive filenames: `YYYY-MM-DD_topic.md`

### Agent invocation
- Spin up sub-agents for tasks that benefit from focus (research, long-form writing, multi-step learning)
- Use direct response for quick questions, lookups, and single-step tasks
- For complex multi-session work → `planner` agent first, then chain

### Memory
- Important findings, preferences, and recurring topics go to `.auto-memory/`
- Don't re-research things already in memory — check first

### Research playbook
- See `.claude/research/research-playbook.md` for standards: source attribution, date-anchored claims, evidence trails

## What Was Intentionally Left Out from ECC

Skipped because they're for software team workflows or language-specific patterns not relevant to this workspace:

- Language skills (python, swift, kotlin, Go, Rust, PHP, Django, Laravel, Spring, etc.)
- CI/CD skills (e2e-testing, tdd-workflow, deployment-patterns, security-scan)
- Team-scale skills (enterprise-agent-ops, team-builder, governance-capture)
- Industry vertical skills (healthcare, logistics, customs, energy, etc.)
- ECC internal tooling (skill-comply, skill-stocktake, configure-ecc, rules-distill)
- Platform-specific media skills (remotion-video-creation, fal-ai-media, videodb) — add if needed

## Projects

Self-contained projects live in `projects/`. Each has its own `CLAUDE.md`, agents, data, and outputs. When working inside a project folder, its `CLAUDE.md` takes precedence for project-specific rules.

| Project | Folder | Purpose |
|---------|--------|---------|
| `job-search` | `projects/job-search/` | AI Engineer job search — built on career-ops. Scan portals, evaluate JDs, tailor CV, apply. |

### Job Search Project (projects/job-search/)

Built on top of [career-ops](https://github.com/santifer/career-ops) by santifer. Full pipeline: scan → evaluate → tailor CV → apply.

**Quick commands (run from `projects/job-search/`):**
- Paste a job URL → auto-evaluates with A-F scoring + generates tailored CV PDF
- `/career-ops scan` → scan all configured portals for new AI Engineer roles
- `/career-ops tracker` → view application status overview
- `/career-ops batch` → batch evaluate multiple jobs in parallel

**Key files to fill in first:**
1. `cv.md` — your master CV (at project root)
2. `config/profile.yml` — personal info, comp targets, narrative
3. `modes/_profile.md` — archetype framing (pre-filled for AI Engineer)
4. `portals.yml` — job boards and companies (pre-configured, 45+ AI companies)

---

## Adding New Agents

1. Use `/build-agent` command or the `agent-architect` agent to design it
2. Create `.claude/agents/<name>.md` with proper YAML frontmatter
3. Add a row to the agents table above
4. The agent is immediately available — no restart needed

## Adding New Skills

1. Create `.claude/skills/<name>/SKILL.md` with `name`, `description`, `origin` frontmatter
2. Skills load automatically — add a row to the skills table above so it's discoverable
