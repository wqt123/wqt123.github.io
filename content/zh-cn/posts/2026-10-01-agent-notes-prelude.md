---
title: "Agent 入门（一）：为什么是 Pi 与 TypeScript"
date: 2026-10-01T19:00:00+08:00
draft: false
slug: "agent-notes-prelude"
summary: "从\"想徒手写一个 Agent\"出发，借 Pi 夯实 Agent 基本功。序言讲清三件事：初衷、为什么是 Pi、为什么是 TypeScript，以及这套公开笔记的后续计划。"
categories:
  - notes
tags:
  - agent
  - typescript
  - pi
  - agent-harness
  - less-is-more
---

# Agent 入门（一）：为什么是 Pi 与 TypeScript

## 1. 初衷

有天我突然问自己：不让我用任何现成产品，能徒手写一个 Agent 吗？我答不上来。会调优 prompt、会催模型调工具，但一次 Agent 调用背后的故事 —— 系统提示词怎么组装、消息怎么转换、上下文怎么裁剪、工具怎么执行 —— 我说不清。

黑盒用了这么久，基本功是空的。欠的课，打算写套公开笔记来补：我选中了一个项目，想和读者一起，把 Agent Core 和 TypeScript 一项一项学明白。这个项目是 Pi。

## 2. 为什么是 Pi

### Pi 的诞生（2025 年秋）

Pi 是 Mario Zechner（libGDX 作者）从零写的 agent harness。他受够了 Claude Code 的功能膨胀：八成功能用不上，每次发布还改系统提示词、破坏既有工作流。他要的，是对模型看到什么有绝对控制权、对每次交互有完整可观测性。

它的极简哲学相当极端，三条：

- 默认只给模型四个工具：read、write、edit、bash
- 系统提示词 + 工具定义，加起来不到 1000 token
- 一份公开的"不做什么"清单：不做 MCP、不做内置子 agent、不做 plan mode、不做权限弹窗，每一条都给了替代方案

### 风口上的是别人（2025 年底）

Pi 起初只是 Mario 的个人项目。真正把 agent 带出圈的是另外两个：OpenClaw 72 小时冲到 6 万星标，如今 37 万 +；Hermes 开源一个月涨了近 9 万。它们让所有人看见了 agent，功能也越做越重 ——Hermes 自带 60 多个工具、6 种执行后端，OpenClaw 有 50 多个渠道。

重有重的好处。可对我这种想搞懂原理的人，它难读、难改、难判断是哪一层在起作用。

### 潮水回头（2026 年）

到 2026 年，风向变了：越来越多的项目开始回头，用 Pi、改 Pi、在 Pi 上做东西。这股"回归 Pi"的风，有几件可查证的事：

- OpenClaw 底层就是 Pi—— 它通过 `createAgentSession()` 直接嵌 Pi 的 agent runtime，README 里致谢 Pi 作者，TUI 组件还依赖 pi-tui
- MiniMax Code 等新一代编码 agent 基于 Pi 改造，社区长出一批 oh-my-pi、pi-harness 这样的底座项目
- 连 Hermes 的能力也被往 Pi 上搬 ——pi-hermes-memory 把它的闭环学习翻译成了 TS 扩展

回头不是怀旧，是有成绩打底：Terminal-Bench 2.0 上，Pi 用最小配置就跑到了顶级水平；Anthropic 官方博客也说过，最成功的实现没用复杂框架。

作者的原话，说的也是这件事："harness 很多，但这个是你的。"在功能越做越重的年代，他要的恰恰是一个自己看得懂、改得动的壳子。这背后，正是计算机领域一个经久不衰的原则——less is more：模型越来越强，agent 壳子就该越来越薄。

### 当教材的底气

Pi 的分层，正好是一张 Agent 工程师的基本功地图：

![Pi 的分层结构](/images/pi-layers.png)

- 读得完：核心就是 `agent-loop.ts`（约 940 行）和 `types.ts`（约 530 行）
- 跑得起：二三十行代码就能跑起一个带工具调用的 agent
- 改得动：扩展就是 TS 模块，agent 甚至能给自己写扩展
- 有对照：OpenClaw 怎么嵌它、MiniMax Code 怎么改它，都是现成案例

## 3. 为什么是 TypeScript

另一条主线是 TypeScript。Pi 是 TS 写的，它的扩展也是 TS—— 想看懂它、改它、给它写工具，第一步都是 TS。

为什么说 TS 是 Agent 时代的事实标准，先看一张表：

| 项目 | 类型 | 语言 | 备注 |
| --- | --- | --- | --- |
| Claude Code | 编码 Agent（闭源） | TypeScript | Anthropic 官方产品 |
| Cursor / Windsurf | AI IDE（闭源） | TypeScript | 桌面客户端 |
| OpenCode | 编码 Agent（开源） | TypeScript | SST 出品 |
| Pi | Agent Harness（开源） | TypeScript | 本专题研究对象 |
| OpenClaw | 个人 AI 助手（开源） | TypeScript | 曾用名 Clawdbot/Moltbot |
| Gemini CLI | 编码 Agent（开源） | TypeScript | Google 官方 |

- **项目层**：主流 agent 几乎都是 TS 写的，上表就是证据。GitHub Octoverse 2025 印证：2025 年 8 月，TS 首次超过 Python 和 JavaScript 成为 GitHub 最常用语言，年增 66%。OpenAI、Anthropic、Google 的官方 SDK 也都同时提供 Python 和 TS 两版。
- **脚本层**：就算不自己搭 agent，skill、工具脚本、MCP 桥接，在 Node/Bun/Deno 里跑 JS/TS 最省事。扩展系统默认就是 TS，你迟早要读、要写、要改。会 TS，就有 Agent 世界的读码权。
- **生态层**：一套语言贯穿后端、前端、客户端。Node 是 agent 服务的默认运行时（Vercel AI SDK 月下载两千万次），React 是 AI 产品界面的主场，Cursor 这类桌面 agent 本身就是 TS 写的。学一次，三个战场通用。

## 4. 后续计划

正文会跟着 Pi 的代码，一章过一块基本功：模型抽象、Agent 循环、工具调用、上下文工程、状态与事件，代码里出现的 TS 语法顺带讲清。不背 API，目标是看懂"一次 Agent 调用背后的故事"。

## 参考资料

1. Pi 官网（"There are many agent harnesses, but this one is yours"）：[https://pi.dev/](https://pi.dev/)
2. Pi 仓库：[https://github.com/earendil-works/pi](https://github.com/earendil-works/pi)
3. Mario Zechner，《What I learned building an opinionated and minimal coding agent》：[https://mariozechner.at/posts/2025-11-30-pi-coding-agent/](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
4. GitHub Blog，《How AI is reshaping developer choice (and Octoverse data proves it)》：[https://github.blog/ai-and-ml/generative-ai/how-ai-is-reshaping-developer-choice-and-octoverse-data-proves-it/](https://github.blog/ai-and-ml/generative-ai/how-ai-is-reshaping-developer-choice-and-octoverse-data-proves-it/)
5. [claw4science.org](https://claw4science.org)，《Agent Harness 三强：OpenClaw、Hermes、Pi 一次比清》：[https://claw4science.org/zh/blog/agent-harness-three-way](https://claw4science.org/zh/blog/agent-harness-three-way)
6. OpenClaw 官方 README：[https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
7. explainx.ai，《Pi Agent Harness: Mario Zechner's Minimal Coding Agent You Can Own（2026）》：[https://explainx.ai/blog/pi-minimal-agent-harness-mario-zechner-guide-2026](https://explainx.ai/blog/pi-minimal-agent-harness-mario-zechner-guide-2026)
8. pi-hermes-memory：[https://github.com/chandra447/pi-hermes-memory](https://github.com/chandra447/pi-hermes-memory)
9. Anthropic，《Building effective agents》：[https://www.anthropic.com/engineering/building-effective-agents](https://www.anthropic.com/engineering/building-effective-agents)
