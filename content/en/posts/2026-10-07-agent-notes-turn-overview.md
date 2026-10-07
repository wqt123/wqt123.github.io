---
title: "Agent Foundations (2): One Turn, End to End"
date: 2026-10-07T12:00:00+08:00
draft: false
slug: "agent-notes-turn-overview"
summary: "A conceptual walk through one turn: how model abstraction, the agent loop, tool calling, context engineering, and state & events fit together in a single Agent run. Line-by-line code reading comes in chapter 3."
categories:
  - notes
tags:
  - agent
  - pi
  - agent-core
  - turn
  - typescript
---

# Agent Foundations (2): One Turn, End to End

The prelude left one debt: "the story behind a single Agent run." This chapter pays it from a conceptual angle — we walk the smallest complete run of an agent core, one turn, from start to finish. No line-by-line code reading (that is chapter 3); we just need to see what exists inside a turn and how the pieces fit together. By the end you will have a mental map; chapter 3 will verify it against the same code.

## 1. The basic unit: turn

Every run of an agent core can be cut into turns. A turn is: one model response, plus all the tool calls it triggers.

Why cut at turns? Because the model has no memory. A model only sees the context it is given; if you do not write last round's events back into the context, it forgets them next round. So the agent has to accumulate every round's results back into the conversation, then continue with the full history. That minimal accumulate-and-continue loop is a turn.

A turn is not an infinite loop. It has explicit stop conditions — next section.

## 2. Terms first

These words come back in every chapter. Instead of textbook definitions, each term maps to a real type in Pi's source — checkable, verifiable.

| term | what it means in Pi | source |
| --- | --- | --- |
| harness | the shell that packages model, tools, loop and UI into a usable agent. Pi positions itself as a harness | packages/ |
| agent loop | the agent's engine: call model, run tools, update messages, call model again | agent-loop.ts |
| turn | one complete round of "assistant response + all the tool calls it triggers" | types.ts: turn_start / turn_end |
| AgentMessage | one message between model and agent; a union of "standard LLM message + custom message" | types.ts: AgentMessage |
| transcript | all messages in the current conversation — what the model sees | types.ts: AgentContext.messages |
| system prompt | carried by the first system message in the transcript, not a separate config item | types.ts: AgentState.systemPrompt |
| tool / tool call / tool result | a tool's definition / one invocation / one invocation's result; tool calls live inside assistant message content | types.ts: AgentTool / AgentToolCall / AgentToolResult |
| context window | the token ceiling a model can see in one go; Pi trims via the transformContext hook | types.ts: AgentLoopConfig.transformContext |
| event | the stream broadcast to subscribers while the agent runs; UI, logging, testing all rely on it | types.ts: AgentEvent |
| hook | callbacks plugged into each stage of the loop; customize behavior without touching core logic | types.ts: AgentLoopConfig |

Three relationships to keep in mind:

* **Messages are the only language**: system prompt, tool declarations, full history — everything in and out of the core is a message.

* **Turn is the basic unit**: one model call, plus all the tool calls it triggers.

* **Events are the observation window**: to see what the loop is doing, follow the events.

## 3. The full journey of one turn

![The agent loop](/images/agent-loop.png)

This figure is the whole agent core: six nodes, two loops. What runs on it is a dynamic journey — one call, from entry to exit. But that journey stands on a set of static structures: the transcript and messages. First a quick look at the static side (3.1), then walk the figure from 3.2 on.

### 3.1 Data structures: transcript, messages, and the outward windows

> Mechanisms: context engineering · model abstraction

Agent data structures come in two faces. Inward is the transcript — all of the agent's memory, an ordered array of messages. It looks like this:

```
[
  system      <- system prompt + tool declarations (first entry)
  user        <- history...
  assistant
  toolResult
  user        <- this round's new message (at the end)
]
```

Four message kinds, all produced by the agent or the model:

| message | produced by | what it does |
| --- | --- | --- |
| system | agent | system prompt, tool declarations |
| user | external | user input, past questions |
| assistant | model | the model's reply; tool-call blocks are embedded here |
| toolResult | agent | result of a tool execution, fed back to the model |

Three points:

* The system prompt is not a separate config item — it is the first system message, merged with the tool declarations;

* Tool-call blocks live inside assistant messages — when the model says "I want to call the read tool", that is a request, not an execution;

* History follows in order: reusing the same agent instance accumulates automatically; pass `initialState.messages` at creation to restore, or use `continue()` to keep going from the current transcript; this round's new message is appended at the end.

Outward are two windows, through which outsiders observe the agent:

* **AgentState** — what the agent looks like right now: current transcript, active model, streaming state, tools in flight, last error.

* **AgentEvent** — every change broadcast as an event: `agent_start / turn_start / message_start / tool_execution_start / turn_end / agent_end`. UI, logging, testing, retries are all subscribers.

**Why this design**: two premises. First, models come from different vendors — OpenAI, Anthropic, Google, plus domestic models — with different APIs, message formats and tool protocols; the core knows no specific vendor, only these four message kinds, with vendor differences isolated in the `pi-ai` package, so swapping models does not touch core logic. Second, the core keeps no parallel state; the transcript is the single source of truth. Three things follow:

1. **Serializable**: save the transcript and you have saved the whole agent.

2. **Reproducible and auditable**: same transcript in, same behavior out; what the model sees each round is all in the array.

3. **Memory is context**: the model has no memory, so the transcript is its memory carrier; memory management is context management — the trimming we will do before calling the model next section.

### 3.2 The journey: walk the figure

> Mechanisms: agent loop · tool calling · state and events

The static picture is done; now the dynamic walk. Five stops: start, call the model, judge, run tools, wrap up. Keep an eye on the transcript along the way — it gains one message per stop.

**1. Start**: the run begins; this round's new message is appended to the tail of the transcript (the array from 3.1); `agent_start` / `turn_start` are broadcast. This is where the static array first moves.

```
[system, user <- this round's new message]
```

**2. Call the model**: the transcript goes through two steps before being handed to the model:

| step | what it does | hook |
| --- | --- | --- |
| convert | turn AgentMessages into the Message[] the LLM understands; non-LLM messages like UI notifications are filtered here | `convertToLlm` |
| trim | when the transcript is too long, drop old messages or compress summaries to stay within the context window | `transformContext` |

The model streams back an assistant message; `message_update` keeps broadcasting intermediate state. Even a change to the tool declarations (tools added or removed) is appended to the transcript as a system message — change itself is expressed as a message.

```
[system, user, assistant <- toolCall: read]
```

Note that a toolCall inside an assistant message is only a request: the model says "I want to call the read tool". Execution happens at stop 4.

**3. Judge**: does the assistant message contain a tool call?

* **Yes**: run the tool (stop 4), turn the result into a toolResult message, flow back to stop 2.

* **No**: this round ends, broadcast `turn_end`.

The loop body lives in `runLoop` (agent-loop.ts), two layers:

* **Inner**: spins the "call model, run tools" circle. If this round has tool calls, or the queue has new messages, the inner loop keeps spinning.

* **Outer**: once the inner loop stops (this turn ends), checks the follow-up queue — if there are still messages, open another turn; if not, `agent_end` wraps up.

Two queues, each feeding one layer:

* **steering queue** (enqueued via `steer()`): mid-run interjection. Messages pushed in from outside while the agent is still running — say the user types one more sentence while waiting. The inner loop drains it before every spin and merges it into this round.

* **follow-up queue** (enqueued via `followUp()`): appended after a round ends. When a turn has ended and the agent was about to stop, messages pushed in here are checked by the outer loop — if any, it opens another round.

**Why this design**: within-round and between-round are two different timings, so the two queues feed two different layers — steering cuts in line on the inner loop, follow-up opens a new round on the outer:

1. **steering**: must take effect immediately — the agent can be interrupted mid-thought (the source comment's scenario: "user may have typed while waiting"), so the inner loop polls before every spin.

2. **follow-up**: takes effect only after a round fully settles — this turn's conclusion is written first, then the handoff task opens a new round, so the outer loop checks at "agent would stop here".

**4. Run tools**: the most critical concept in the whole mechanism: **the model does not execute tools, the model only requests**. The loop executes on the model's behalf and feeds the results back.

The full lifecycle of one tool call:

```
validate params -> beforeToolCall (can block) -> execute -> afterToolCall (can rewrite result) -> result as message
```

Three properties:

* **Blockable**: if `beforeToolCall` returns `{ block: true }`, the tool does not run; the loop emits an error result.

* **Rewritable**: `afterToolCall` can change fields like content or isError on the result before it is fed to the model.

* **Failures do not crash**: a thrown tool error becomes a result message with `isError: true`; the model can see the error and the loop continues.

After the result flows back, the transcript gains one more entry:

```
[system, user, assistant(toolCall), toolResult <- result]
```

Back to stop 2 with this new message, and call the model again. One assistant message can carry multiple tool calls; execution is parallel by default: validation and hooks run serially, the actual execution runs concurrently via `Promise.all`, and results are reordered back in call order. If any tool declares `executionMode: "sequential"`, the whole batch degrades to serial.

**Why this design**: separation of decision and execution. The model decides but never touches the real world — execution power is in the loop's hands, so permission control, blocking, auditing and error fallbacks have a single home. Three things follow:

1. **Safety**: `beforeToolCall` is the gate before execution; it can block any call.

2. **Freedom**: execution belongs to the loop, so the execution layer can be optimized freely (e.g. parallelism), as long as the order the model sees does not change.

3. **Self-healing**: errors are also turned into messages fed back to the model — an agent's self-healing is not "skip the error and move on"; it is letting the model see its own mistake and fix it. A thrown tool error is not a loop failure; it is an ordinary message in the conversation.

**5. Wrap-up and stop**: after this round ends, the outer loop checks the follow-up queue: if there are messages appended after the round ended, open another round; if not, broadcast `agent_end` and call it done. Steering never waits for this step — the inner loop has already absorbed it.

Stopping comes down to two conditions: **no tool calls, and no queued messages**. From start to wrap-up, every node broadcasts events (the event list from 3.1), so outsiders can always see where the loop is.

**Why this design**: two layers hidden in the wrap-up step:

1. **Runtime and observation decoupled**: the core loop only broadcasts; it does not care who is watching — an agent is asynchronous, multi-step and error-prone; problems must be replayable, and the event stream is the black box, with every step leaving a trace; the core therefore needs no built-in presentation or logging layer — those are all subscribers.

2. **Termination is decidable**: the loop never asks the model "are you done?"; it only checks two decidable conditions — tool calls mean work remains, queued messages mean input remains; empty both, stop. An agent can never loop forever because the model wants to say one more thing: no tool call means no next action, and the turn must end.

## 4. Summary

Three sentences:

* **Messages are the only language**: system prompt, tool declarations, history — everything in and out of the core is a message.

* **Turn is the basic unit**: one model call, plus all the tool calls it triggers.

* **Events are the observation window**: wherever the loop is stuck, follow the events and you will see.

Next chapter reads differently: the same code, walked line by line from the `prompt()` entry to `agent_end`, picking up whatever TypeScript syntax we meet along the way. This chapter gives the map; the next one walks the road.
