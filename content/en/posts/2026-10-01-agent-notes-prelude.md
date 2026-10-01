---
title: "Agent Foundations (1): Why Pi and TypeScript"
date: 2026-10-01T19:00:00+08:00
draft: false
slug: "agent-notes-prelude"
summary: "Starting from \"could I write an Agent from scratch\", this series builds agent engineering fundamentals on Pi. The prelude covers three things: the motivation, why Pi, why TypeScript, and what comes next."
categories:
  - notes
tags:
  - agent
  - typescript
  - pi
  - agent-harness
  - less-is-more
---

# Agent Foundations (1): Why Pi and TypeScript

## 1. The motivation

One day I asked myself: without any off-the-shelf product, could I write an Agent from scratch? I couldn't. I can tune prompts and coax models into calling tools, but the story behind a single Agent run — how the system prompt gets assembled, how messages get transformed, how context gets trimmed, how tools execute — I couldn't explain.

I've been using a black box for so long that my fundamentals are hollow. The debt is worth paying in public: I picked a project, and I want to work through Agent Core and TypeScript properly, together with the readers. That project is Pi.

## 2. Why Pi

### The birth of Pi (autumn 2025)

Pi is an agent harness Mario Zechner (the libGDX author) wrote from scratch. He was fed up with Claude Code's feature bloat: eighty percent of the features went unused, and every release rewrote the system prompt and broke existing workflows. What he wanted was absolute control over what the model sees and full observability over every interaction.

Its minimalism is extreme, in three ways:

- The model gets only four tools by default: read, write, edit, bash
- System prompt + tool definitions total under 1,000 tokens
- A public list of what it deliberately does *not* do: no MCP, no built-in sub-agents, no plan mode, no permission dialogs — with an alternative suggested for each

### Someone else took the spotlight (late 2025)

Pi started out as Mario's personal project. The two projects that actually brought agents into the mainstream were others: OpenClaw hit 60,000 stars in 72 hours and sits at 370,000+ now; Hermes gained nearly 90,000 in its first open-source month. They showed everyone what agents could be — and their feature sets kept growing. Hermes ships 60+ tools and 6 execution backends; OpenClaw has 50+ channels.

Heavy has its advantages. But for someone like me who wants to understand how things work, it's hard to read, hard to modify, and hard to tell which layer is doing what.

### The tide turned (2026)

By 2026 the wind had changed: more and more projects started turning back — using Pi, modifying Pi, building things on Pi. This "return to Pi" trend is backed by a few verifiable facts:

- OpenClaw's foundation is Pi: it embeds Pi's agent runtime directly via `createAgentSession()`, thanks the Pi author in its README, and its TUI components depend on pi-tui
- A new generation of coding agents, such as MiniMax Code, is built on top of Pi; base projects like oh-my-pi and pi-harness have grown out of the community
- Even Hermes capabilities are being ported to Pi — pi-hermes-memory rewrites its closed-loop learning as TS extensions

The return isn't nostalgia; it has results behind it. On Terminal-Bench 2.0, Pi reached top-tier scores with its minimal config, and Anthropic's official blog has said the most successful implementations didn't use complex frameworks.

The author's own words say the same thing: "There are many agent harnesses, but this one is yours." In an age of ever-heavier features, what he wanted was a shell he could read and modify himself. Behind it all is an enduring principle of computing — less is more: as models get stronger, agent shells should get thinner.

### Why it works as a textbook

Pi's layering is a map of agent engineering fundamentals:

![Pi layer structure](/images/pi-layers.png)

- **Readable**: the core is `agent-loop.ts` (~940 lines) and `types.ts` (~530 lines)
- **Runnable**: a few dozen lines of code get an agent with tool calling up and running
- **Modifiable**: extensions are TS modules — the agent can even write its own extensions
- **Comparable**: how OpenClaw embeds it and how MiniMax Code modifies it are live case studies

## 3. Why TypeScript

The other thread is TypeScript. Pi is written in TS, and so are its extensions — reading it, modifying it, writing tools for it all start with TS.

Why call TS the de facto standard of the agent era? Start with a table:

| Project | Type | Language | Notes |
| --- | --- | --- | --- |
| Claude Code | Coding agent (closed) | TypeScript | Official Anthropic product |
| Cursor / Windsurf | AI IDE (closed) | TypeScript | Desktop client |
| OpenCode | Coding agent (open) | TypeScript | By SST |
| Pi | Agent harness (open) | TypeScript | The subject of this series |
| OpenClaw | Personal AI assistant (open) | TypeScript | Formerly Clawdbot/Moltbot |
| Gemini CLI | Coding agent (open) | TypeScript | Official Google |

- **Project layer**: mainstream agents are almost all written in TS — the table above is the evidence. GitHub Octoverse 2025 confirms it: in August 2025, TS overtook both Python and JavaScript to become the most-used language on GitHub, growing 66% year over year. OpenAI, Anthropic and Google all ship official SDKs in both Python and TS.
- **Script layer**: even if you never build your own agent, skills, tool scripts and MCP bridges are easiest to run as JS/TS on Node, Bun or Deno. Extension systems default to TS — you'll read, write and modify it eventually. Knowing TS gives you read access to the agent world.
- **Ecosystem layer**: one language spans backend, frontend and client. Node is the default runtime for agent services (the Vercel AI SDK gets 20 million downloads a month), React owns the AI product UI, and desktop agents like Cursor are themselves written in TS. Learn once, use it across three fronts.

## 4. What's next

The series will follow Pi's code, one chapter per fundamental: model abstraction, the agent loop, tool calling, context engineering, state and events — with the TS syntax it meets along the way explained on the spot. No memorizing APIs; the goal is to understand the story behind a single Agent run.

## References

1. Pi official site ("There are many agent harnesses, but this one is yours"): [https://pi.dev/](https://pi.dev/)
2. Pi repository: [https://github.com/earendil-works/pi](https://github.com/earendil-works/pi)
3. Mario Zechner, "What I learned building an opinionated and minimal coding agent": [https://mariozechner.at/posts/2025-11-30-pi-coding-agent/](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
4. GitHub Blog, "How AI is reshaping developer choice (and Octoverse data proves it)": [https://github.blog/ai-and-ml/generative-ai/how-ai-is-reshaping-developer-choice-and-octoverse-data-proves-it/](https://github.blog/ai-and-ml/generative-ai/how-ai-is-reshaping-developer-choice-and-octoverse-data-proves-it/)
5. [claw4science.org](https://claw4science.org), "Agent Harness 三强：OpenClaw、Hermes、Pi 一次比清" (Chinese): [https://claw4science.org/zh/blog/agent-harness-three-way](https://claw4science.org/zh/blog/agent-harness-three-way)
6. OpenClaw official README: [https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
7. explainx.ai, "Pi Agent Harness: Mario Zechner's Minimal Coding Agent You Can Own (2026)": [https://explainx.ai/blog/pi-minimal-agent-harness-mario-zechner-guide-2026](https://explainx.ai/blog/pi-minimal-agent-harness-mario-zechner-guide-2026)
8. pi-hermes-memory: [https://github.com/chandra447/pi-hermes-memory](https://github.com/chandra447/pi-hermes-memory)
9. Anthropic, "Building effective agents": [https://www.anthropic.com/engineering/building-effective-agents](https://www.anthropic.com/engineering/building-effective-agents)
