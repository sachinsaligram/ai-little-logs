---
marp: true
theme: default
paginate: true
style: |
  section {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 48px 64px;
  }
  h1 { color: #1a1a2e; font-size: 2rem; margin-bottom: 0.5rem; }
  h2 { color: #16213e; font-size: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3rem; }
  ul { line-height: 1.5; }
  code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
  .subtitle { color: #64748b; font-size: 1.1rem; margin-top: 0.25rem; }
  .tag { display: inline-block; background: #e2e8f0; border-radius: 999px; padding: 2px 12px; font-size: 0.75rem; margin-right: 6px; }
---

# Little Logs

<p class="subtitle">AI Bootcamp Demo — June 2026</p>

**Sachin Saligram**

---

## Project Overview

A **mobile-first baby tracking PWA** — log sleeps, feeds, and nappy changes with ≤3 taps.

**Two independent access paths, one database:**

| Path | Interface |
|---|---|
| Web UI (Next.js PWA) | Quick logging on any device |
| MCP + Claude Desktop | Natural language — ask & log in plain English |

**Stack:** Next.js 15 · Turso (SQLite edge DB) · Drizzle ORM · NextAuth v5 · Anthropic SDK  
**Deploy:** Vercel (web) + local Node process (MCP)

---

## How I Leveraged AI

**Old Approach**
Custom project description + plan fed directly into Claude Code → broken, disconnected implementation; idea lost in translation from brain to code

**New Approach:**

1. **Claude Chat first** — debate the concept before touching code
   - AWS vs Turso + Vercel, MCP integration options, login tradeoffs
   - Arrive at a clear stack + UX decision *before* any implementation

2. **Claude Code + SpecKit second** — structured build from a solid foundation
   - Summary from chat → rich spec → plan → tasks → implementation
   - Near-zero ambiguity at each step; limited issues during testing

---

## Key Learnings

- **SpecKit + task-driven workflow compounds** — writing spec → plan → tasks up front felt slow, but each implementation step was near-zero ambiguity
- **Session limits hit even with sub-agents** — parallel task implementation via sub-agents helped, but context limits were still reached mid-implementation; interestingly most of the usage was *output* tokens, not input — worth exploring ways to reduce Claude's verbosity during task execution

---

## Gotchas

- **MCP works great in Claude Code, not so much in Claude Desktop / Claude.ai** — the MCP server ran reliably when accessed via Claude Code, but the experience in Claude Desktop and Claude.ai was inconsistent; tool calls would fail silently or not be picked up at all, making it a poor surface for demoing the natural language interaction as originally planned

---

## What I'd Do Differently

- **Test incrementally after each feature, not at the end** — rather than implementing all tasks and testing in one go, validate each piece as it lands: get login working and confirmed before moving to the first button, get sleep logging solid before adding feeds, and so on; catching issues at the boundary of each feature is far cheaper than untangling them across a fully-built app
- **Use something like Playwright MCP to automate that validation** — rather than manually checking each feature, a Playwright MCP server could let Claude drive the browser and verify behaviour as part of the same implementation loop; test and build in the same context, no context switching

---

# Demo

**Web UI** → log a nappy change in 3 taps

**Claude Desktop** → *"Summarise last night's sleep"*

**Insights** → AI-generated weekly summary
