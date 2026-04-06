# Agent Conventions for myagents

These rules apply to all agents and to Claude when working in this project.

## Output Hygiene

- All deliverables go to `outputs/<type>/YYYY-MM-DD_<slug>.<ext>`
- Never overwrite existing output files — create a new dated version
- If a task produces no file (conversational answer only), that's fine — don't force file creation
- For large outputs (>500 lines), split into multiple files by section

## Memory Usage

- Before starting any research or learning task, check `.auto-memory/` for relevant prior work
- After completing significant research or learning, save key non-obvious facts to memory
- Don't save ephemeral task details to memory — only things useful across sessions
- Update stale memories rather than creating duplicate entries

## Agent Routing

- Use sub-agents for tasks that benefit from focus and have clear boundaries
- Don't spin up an agent for a 30-second answer
- When a task spans multiple agents (e.g., research → write → publish), chain them explicitly rather than trying to do everything in one shot
- If a task doesn't clearly fit any existing agent, handle it directly and consider whether a new agent is warranted

## Tone and Communication

- Be direct — Jai doesn't need things sugarcoated
- Skip preamble — don't explain what you're about to do, just do it
- Keep responses concise; offer to expand rather than defaulting to long outputs
- When uncertain about scope or intent, ask one clarifying question — not five

## Engineering Plugin Usage

The engineering plugin's skills activate automatically. Key triggers:
- Writing agent code → `code-review` skill applies
- Deciding between frameworks → `architecture` skill applies
- Error messages / bugs → `debug` skill applies
- Designing a new agent system → `system-design` skill applies

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Research report | `outputs/research/YYYY-MM-DD_<topic>.md` | `2026-04-04_ai-agents-overview.md` |
| Study plan | `outputs/learning/YYYY-MM-DD_<subject>.md` | `2026-04-04_reinforcement-learning.md` |
| Flashcards | `outputs/learning/flashcards_<subject>.txt` | `flashcards_python-async.txt` |
| Writing draft | `outputs/writing/YYYY-MM-DD_<format>_<slug>.md` | `2026-04-04_blog_ai-weekly.md` |
| Code / scripts | `scripts/<name>.<ext>` | `scripts/daily_digest_runner.py` |

## When to Ask vs. When to Proceed

**Ask first when:**
- The task scope is ambiguous and the wrong interpretation would waste significant effort
- A destructive action is about to happen (overwriting files, sending communications)
- The audience or tone for a piece of writing isn't clear

**Proceed and check in when:**
- The task is clear but long — start, then show progress
- There are multiple valid approaches — pick one, note the tradeoff, offer to switch

**Just do it:**
- Short, clear, reversible tasks
- Follow-up steps to work already in progress
