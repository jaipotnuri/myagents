---
name: engineering-bridge
description: Routes engineering tasks to the installed engineering plugin. Active in this project for: writing agent code, debugging agent scripts, designing multi-agent systems, choosing between agent frameworks, and writing technical documentation for agents. This skill ensures the engineering plugin's full power is available for building and maintaining agents in this workspace.
---

# Engineering Plugin — Project Bridge

This project has the **engineering plugin** installed globally. The following skills from that plugin are available and should activate automatically for the tasks below.

## Active Skills in This Project

### system-design
Use when designing new agents, planning multi-agent orchestration, or choosing how to structure agent workflows.

*Triggers: "design an agent that", "how should the agents communicate", "architect a system for", "what's the right structure for"*

### architecture
Use when making a technology choice that will be hard to reverse — choosing an agent framework, picking a storage solution for agent memory, deciding on API design.

*Triggers: "should we use X or Y", "ADR for", "choosing between", "evaluate this approach"*

### documentation
Use when writing README files for agents, API docs for agent scripts, or onboarding guides for this workspace.

*Triggers: "write docs for", "document this agent", "create a README", "write a runbook"*

### code-review
Use when reviewing agent definition files, Python/Node scripts, or any code in this project before it's considered done.

*Triggers: "review this", "is this code safe", "check this before I use it"*

### debug
Use when an agent is behaving unexpectedly, a script is erroring, or something isn't triggering the way it should.

*Triggers: error messages, "why isn't this working", "this agent isn't doing what I expect"*

### testing-strategy
Use when planning how to test an agent's behavior, validate its outputs, or set up evals.

*Triggers: "how do I test this agent", "write tests for", "validate this workflow"*

## Skills NOT Needed in This Project

The following engineering plugin skills are available but rarely relevant here (they're for production engineering teams):

- `standup` — not applicable to a personal agent workspace
- `incident-response` — use only if an agent causes a production incident
- `deploy-checklist` — use if publishing an agent to production
- `tech-debt` — use for periodic cleanup of outdated agents
