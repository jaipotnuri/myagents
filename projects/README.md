# projects/

Self-contained projects under the `myagents` workspace. Each one has its own `README.md`, `CLAUDE.md`, agents, data, and outputs — when working inside a project folder, that project's `CLAUDE.md` takes precedence.

| Project | Purpose |
|---------|---------|
| [job-search/](job-search/README.md) | AI Engineer job search pipeline — scan portals, evaluate JDs (A-F scoring), tailor CV PDFs, track applications. Built on [career-ops](https://github.com/santifer/career-ops). |
| [mydailyagents/](mydailyagents/README.md) | 8 AM daily digest email — top 2 to-dos from Apple Notes + today's Google Calendar meetings. Two redundant delivery paths (Chrome MCP via Cowork, SMTP via launchd) with a shared "already sent today" flag. |

---

## Conventions

Each project should keep:
- `README.md` at its root explaining what it does and how to run it
- `CLAUDE.md` for project-specific Claude conventions (overrides parent)
- A `.env.example` if it needs secrets, with `.env` gitignored
- All deliverables in its own `outputs/` (or equivalent) — never in the workspace-level `outputs/`

To add a new project, create `projects/<name>/` with a `README.md` and add a row to the table above.
