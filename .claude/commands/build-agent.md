---
name: build-agent
description: Workflow for building and shipping a new agent in this workspace — from idea to working .md file with proper frontmatter, tested invocation, and CLAUDE.md entry.
allowed_tools: ["Read", "Write", "Edit", "Bash"]
---

# /build-agent

Use this workflow when adding a new agent to myagents.

## Goal

Take an agent idea from concept to ready-to-use in 5 steps.

## Steps

1. **Define the job** — What exactly does this agent do? Write a one-paragraph description.
2. **Design with `agent-architect`** — Use the agent-architect agent to decide: pattern, tools needed, output format.
3. **Write the `.md` file** — Save to `.claude/agents/<name>.md` with proper YAML frontmatter.
4. **Add to CLAUDE.md** — Add a row to the agents table.
5. **Test it** — Invoke the agent with a real task and verify the output lands in `outputs/`.

## File Template

```markdown
---
name: <kebab-case>
description: <trigger description — be specific about when to use AND when not to>
tools: Read, Write, [others]
---

# [Agent Name]

[Role definition in 2 sentences]

## Behavior
...

## Output
Save to outputs/<type>/YYYY-MM-DD_<slug>.md
```

## Quality Gate (before shipping)

- [ ] Description is specific enough to route correctly (not just "helps with X")
- [ ] Tools list is minimal (only what's needed)
- [ ] Output path is defined
- [ ] Added to CLAUDE.md agents table
- [ ] Tested with one real invocation
