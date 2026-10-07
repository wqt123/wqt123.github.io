---
title: "Agent 入门（二）：一次 Turn 的全景"
date: 2026-10-07T12:00:00+08:00
draft: false
slug: "agent-notes-turn-overview"
summary: "概念视角讲清一次 turn：模型抽象、Agent 循环、工具调用、上下文工程、状态与事件如何配合成一次 Agent 调用。代码逐行走读留到第三章。"
categories:
  - notes
tags:
  - agent
  - pi
  - agent-core
  - turn
  - typescript
---

# Agent 入门（二）：一次 Turn 的全景

序言欠的课是 "一次 Agent 调用背后的故事"。这一章用概念视角补：把 agent core 最小的一次运行 —— 一个 turn—— 从头到尾看一遍。不逐行走代码（那是第三章的事），只讲清楚一件事：一次 turn 里有哪些东西，它们怎么配合。读完你会得到一张心智地图，第三章用同一段代码验证它。

## 1. 基本单元：turn

agent core 的每次运行，可以切成一个个 turn。一个 turn 的定义：一次模型响应，加上它触发的所有工具调用。

为什么要以 turn 为单位？因为模型无记忆。模型每次只能看到喂给它的上下文，上一轮发生的事如果不写回上下文，它下一轮就 "忘" 了。所以 agent 必须把每一轮的结果都累积回对话，再带着全部历史继续 —— 这个 "累积 - 继续" 的最小闭环，就是 turn。

turn 不是无限循环，它有明确的停止条件，下一节讲。

## 2. 先备齐术语

这些词后面每章都会出现。这里不用泛泛的教材定义，每个词都对应 Pi 源码里的真实类型，查得到、对得上。



| 术语                             | Pi 语境里的意思                                              | 对应源码                                                 |
| ------------------------------ | ------------------------------------------------------ | ---------------------------------------------------- |
| harness                        | 把模型、工具、循环、界面打包成可用 agent 的壳。Pi 给自己的定位就是 harness         | packages/ 各包                                         |
| agent loop                     | agent 的引擎：调模型 → 执行工具 → 更新消息 → 再调模型的循环                  | agent-loop.ts                                        |
| turn                           | 一轮完整的 "assistant 响应 + 它触发的所有工具调用"                      | types.ts：turn\_start / turn\_end                     |
| AgentMessage                   | 模型与 agent 之间的一条消息；是 "标准 LLM 消息 + 自定义消息" 的联合类型          | types.ts：AgentMessage                                |
| transcript                     | 当前对话的全部消息，即 "模型看到的东西"                                  | types.ts：AgentContext.messages                       |
| system prompt                  | 系统提示词。Pi 里它不是独立配置项，而是由 transcript 里的 system message 携带 | types.ts：AgentState.systemPrompt                     |
| tool / tool call / tool result | 工具的定义 / 一次调用 / 一次调用的结果。工具调用嵌在 assistant 消息的内容里         | types.ts：AgentTool / AgentToolCall / AgentToolResult |
| context window                 | 模型一次能看到的 token 上限。Pi 用 transformContext 钩子做裁剪          | types.ts：AgentLoopConfig.transformContext            |
| event                          | agent 运行中广播给订阅者的事件流，UI、日志、测试全靠它                        | types.ts：AgentEvent                                  |
| hook                           | 插在循环各阶段的回调，不侵入核心逻辑就能定制行为                               | types.ts：AgentLoopConfig                             |

先记住三个关系，后面读代码不迷路：



* **消息是唯一的语言**：系统提示词、工具声明、全部历史，进出 core 的都是消息。

* **turn 是基本单元**：一次调模型 + 它引发的所有工具调用，算一个 turn。

* **事件是观察窗口**：想看懂循环在干什么，跟着事件走就行。

## 3. 一次 turn 的完整旅程



![Agent Loop 主循环](/images/agent-loop.png)

这张图是 agent core 的全貌：六个节点、两条循环。图上跑的是一趟 "动态" 旅程 —— 一次调用从进到出。但这趟旅程脚下踩着一组 "静态" 结构：transcript 和消息。先花一小节看清静态（3.1），再从 3.2 开始按图走动态。

### 3.1 数据结构：transcript、消息与对外窗口

> 机制：上下文工程・模型抽象

agent 的数据结构分两面。向内是 transcript——agent 的全部 "记忆"，一条按顺序排好的消息数组，它长这样：



```
[
  system      ← 系统提示词 + 工具声明（首条）
  user        ← 历史消息……
  assistant
  toolResult
  user        ← 本轮新消息（末尾）
]
```

消息一共四种，全部由 agent 或模型发出：



| 消息         | 谁发的   | 干什么              |
| ---------- | ----- | ---------------- |
| system     | agent | 系统提示词、工具声明       |
| user       | 外部    | 用户输入、历史提问        |
| assistant  | 模型    | 模型的回复；工具调用块也嵌在这里 |
| toolResult | agent | 工具执行的结果，喂回给模型    |

三个要点：



* 系统提示词不是独立配置项，就是首条 system 消息，和工具声明合并在一起；

* 工具调用块嵌在 assistant 消息里 —— 模型说 "我要调用 read 工具"，这只是请求，不是执行；

* 历史消息按顺序排在后面：复用同一个 agent 实例自动累积，创建时传 `initialState.messages` 恢复，或用 `continue()` 从当前 transcript 接着跑；本轮新消息追加在末尾。

向外是两个窗口，外面的人靠它们观察 agent：



* **AgentState**——agent 现在什么样：当前 transcript、活跃模型、流式状态、正在执行的工具、最近错误。

* **AgentEvent**—— 一切变化都广播成事件：`agent_start / turn_start / message_start / tool_execution_start / turn_end / agent_end`。UI、日志、测试、重试都是订阅者。

**为什么这么设计**：这里有两个前提。一是模型来自不同厂商 ——OpenAI、Anthropic、Google、各家国产模型，API、消息格式、工具协议互不相同；core 不认识任何具体厂商，只认这四种消息，厂商差异隔离在 `pi-ai` 包，换模型不动核心逻辑。二是 core 不保存任何平行状态，transcript 是唯一真相，这带出三件事：



1. **可序列化**：存下 transcript 就存下了整个 agent。

2. **可复现、可审计**：给定同样的 transcript，行为必然可复现；模型每轮看到什么，全在数组里。

3. **记忆即上下文**：模型无记忆，transcript 就是它的记忆载体，"记忆管理" 就是 "上下文管理"—— 下一节调模型前要做的裁剪。

### 3.2 旅程：按图走一遍

> 机制：Agent 循环・工具调用・状态与事件

静态结构看完了，现在按图走动态。旅程一共五个站：启动、调模型、判断、执行工具、收尾。顺着走的同时盯住 transcript—— 它每过一个站就多一条消息。

**① 启动**：run 开始，本轮新消息追加进 transcript 尾部（就是 3.1 那个数组），广播 `agent_start` / `turn_start`。静态数组在这里第一次动起来。



```
[system, user ← 本轮新消息]
```

**② 调模型**：transcript 先经过两道工序，再一次喂给模型：



| 工序 | 做什么                                                                     | 对应钩子               |
| -- | ----------------------------------------------------------------------- | ------------------ |
| 转换 | transcript 里的 AgentMessage 转成 LLM 能懂的 Message \[]，UI 通知这类非 LLM 消息在这里被过滤 | `convertToLlm`     |
| 裁剪 | transcript 太长时删旧消息、压缩摘要，保证不超 context window                             | `transformContext` |

模型流式返回 assistant 消息，`message_update` 事件持续广播中间状态。工具声明变了（加了工具、删了工具），也会以 system 消息的形式追加进 transcript—— 连 "变化" 都用消息表达。



```
[system, user, assistant ← toolCall: read]
```

注意 assistant 消息里的 toolCall 只是请求：模型说 "我要调用 read 工具"，不是执行，执行在 ④。

**③ 判断**：看 assistant 消息里有没有工具调用：



* **有**：执行工具（④），结果转成 toolResult 消息回流，回到 ②。

* **没有**：本轮结束，广播 `turn_end`。

循环本体在 `runLoop`（agent-loop.ts），两层：



* **内层**：转 "调模型 → 执行工具" 的圈。这一轮有工具调用，或者队列里有新消息，内层就继续转。

* **外层**：内层停下来（本 turn 结束）后，检查 follow-up 队列 —— 还有消息就再开一轮 turn，没有就 `agent_end` 收工。

两个队列，各喂一层：



* **steering 队列**（`steer()` 入队）：运行中插队。agent 还在跑，外面塞进来的消息 —— 比如用户等着等着又补了一句。内层循环每次转圈前都去队列捞一次，捞到就并进这一轮。

* **follow-up 队列**（`followUp()` 入队）：回合结束后追加。一个 turn 已经结束、agent 本来要停了，这时塞进来的消息，由外层循环检查，有就再开一轮。

**为什么这么设计**：回合内和回合间是两种不同的时序，所以两个队列各喂一层 ——steering 插内层的队，follow-up 开外层的轮：



1. **steering**：运行中插队，要立刻生效 ——agent 还在思考时就能被干预（源码注释的原话场景："user may have typed while waiting"），内层循环每次转圈前轮询。

2. **follow-up**：回合结束后追加，要等回合完整落定 —— 当前 turn 的结论先写完，接力任务才开新轮，外层在 "agent would stop here" 处检查。

**④ 执行工具**：这是整个 agent 机制里最关键的一个概念：**模型不执行工具，模型只请求**。工具调用是循环替模型执行的，执行完把结果喂回去。

一次工具调用的完整生命周期：



```
校验参数 → beforeToolCall（可拦截）→ execute → afterToolCall（可改写结果）→ 结果转消息回流
```

三个特性：



* **可拦截**：`beforeToolCall` 返回 `{ block: true }`，工具就不执行，循环发一个错误结果。

* **可改写**：`afterToolCall` 可以改结果的 content、isError 等字段，再喂给模型。

* **失败不崩**：工具抛错会被转成 `isError: true` 的结果消息，模型能看到错误，循环继续。

结果回流后，transcript 又多一条：



```
[system, user, assistant(toolCall), toolResult ← 结果]
```

带着这条新消息回到 ②，再调一次模型。一次 assistant 消息里可以带多个工具调用，执行默认并行：校验和钩子串行跑，真正执行用 `Promise.all` 并发，结果按调用顺序排好再回流。某个工具若声明了 `executionMode: "sequential"`，整批就降级为串行。

**为什么这么设计**：决策与执行分离。模型是决策者，但不碰真实世界 —— 执行权在循环手里，于是权限控制、拦截、审计、错误兜底都有唯一落点。这带来三件事：



1. **安全**：`beforeToolCall` 是执行前的闸门，可以拦下任何调用。

2. **自由**：执行是循环的事，执行层可以随便优化（比如并行），只要不改变模型看到的顺序。

3. **自愈**：错误也被转成消息喂回模型 ——agent 的自愈能力不是 "跳过错误继续"，而是让模型看见自己的错误并修正。工具抛错不是循环的失败，而是对话里的一个普通消息。

**⑤ 收尾与停止**：本轮结束后，外层循环检查 follow-up 队列：有回合结束后才追加的消息，就再开一轮；没有就广播 `agent_end`，收工。steering 不用等到这一步 —— 内层循环已经把它们消化掉了。

停下来靠两个条件：**没有工具调用，且没有排队消息**。从启动到收尾，每个节点都广播事件（3.1 那张事件表），外面随时能看到循环走到哪一步。

**为什么这么设计**：收尾这步藏着两层设计：



1. **运行与观察解耦**：核心循环只管广播，不关心谁在看 ——agent 是异步、多步、可能出错的系统，问题必须能回放，事件流就是黑匣子，每一步都留痕；核心也因此不需要内置展示层、日志层，这些全是订阅者。

2. **终止可判定**：循环不问模型 "你完了吗"，只看两个可判定的条件 —— 工具调用是 "还有活"，排队消息是 "还有输入"，两者皆空即停。agent 永远不会因为模型 "还想再说一句" 而死循环：没有工具调用，就是没有下一步动作，turn 必然结束。

## 4. 小结

这一章讲的东西，三句话能说完：



* **消息是唯一的语言**：系统提示词、工具声明、历史，进出 core 的都是消息。

* **turn 是基本单元**：一次调模型，加上它引发的所有工具调用。

* **事件是观察窗口**：循环卡在哪，跟着事件走就能看清。

下一章换一种读法：同一段代码，从 `prompt()` 入口到 `agent_end` 逐行走一遍，遇到什么 TS 语法就顺手讲什么。这一章给的是地图，下一章走的是路。