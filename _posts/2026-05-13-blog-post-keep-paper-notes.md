---
title: "[Paper Notes] KEEP: A KV-Cache-Centric Memory Management System for Efficient Embodied Planning"
date: 2026-05-13
permalink: /posts/2026/05/keep-paper-notes/
tags:
  - Embodied Planning
  - KV Cache
  - Memory Systems
  - LLM Inference
  - Robotics
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**KEEP** studies a very practical bottleneck in LLM-based embodied planning: memory is useful, but feeding long textual memory into the model at every planning step makes the agent slow. The planner may only need to output one action such as "find the potato" or "open the microwave", yet before it can do that, the LLM repeatedly pays the prefill cost for a long prompt containing object states, robot state, past actions, and few-shot task examples.

The paper’s answer is to treat memory as **KV cache** rather than repeatedly as raw text. But embodied memory is awkward for naive caching because the world changes after actions. If the robot picks up an object, opens a drawer, places a plate in the sink, or turns on a faucet, part of the memory becomes stale and part of the cache is no longer valid. KEEP is therefore not simply a KV cache reuse paper. It is a paper about how to make KV reuse respect the structure and update pattern of embodied memory.

The system has three main pieces:

- **Static-Dynamic Memory Construction**: stable memory is cached in larger semantic groups, while frequently changing memory is cached at finer segment granularity.
- **Multi-hop Memory Re-computation**: the system recomputes KV for memories that matter to the current query, including memories that are only indirectly relevant through other memories.
- **Layer-balanced Memory Loading**: KV loading from CPU memory to GPU is scheduled across layers to avoid idle bubbles caused by uneven recomputation ratios.

On ALFRED, KEEP keeps success rate close to full recomputation while substantially lowering TTFT. Compared with CacheBlend, the paper reports **4.13% success-rate improvement** and **1.90x TTFT reduction** on Qwen-2.5-32B INT4.

## Paper Info

The paper is **"KEEP: A KV-Cache-Centric Memory Management System for Efficient Embodied Planning"** by **Zebin Yang, Tong Xie, Baotong Lu, Shaoshan Liu, Bo Yu, and Meng Li**. The arXiv version is [2602.23592](https://arxiv.org/abs/2602.23592). The paper is also listed by [Microsoft Research](https://www.microsoft.com/en-us/research/publication/keep-a-kv-cache-centric-memory-management-system-for-efficient-embodied-planning/), and the code is available at [PKU-SEC-Lab/KEEP_Embodied_Memory](https://github.com/PKU-SEC-Lab/KEEP_Embodied_Memory).

The local codebase I read contains two implementations:

- `KEEP_transformers`, a simpler Transformers implementation mainly for accuracy-oriented experiments.
- `KEEP_vllm`, a modified vLLM implementation used for latency experiments and system-level KV loading/recomputation.

## Why This Problem Exists

A language-based embodied planner usually runs in a loop. It observes the environment, updates memory, builds a prompt, asks the LLM to choose the next action, executes that action, then repeats. At first glance this looks like ordinary prompting. But the cost profile is different from a chat application.

The generated answer is short. In ALFRED-style planning, the output might be one skill selected from a constrained set: find an object, pick it up, put it down, slice something, open a receptacle, close it, toggle an appliance, and so on. The prompt, however, can be long. It may contain task rules, demonstrations, object memories, the current state of discovered objects, and the task instruction. Over many planning steps, this creates a strange imbalance: the model spends most of its time reading memory, not producing action.

This is why TTFT matters. If every step must prefill thousands of memory tokens before generating a tiny action, the agent becomes sluggish. In a real robot loop, that is not a cosmetic issue. Slow planning changes the feel of interaction, limits how often the agent can replan, and makes long-horizon tasks more expensive.

The tempting fix is KV caching. Once the model has processed a memory segment, why not store its key-value states and reuse them later? That is exactly the right instinct, but embodied memory immediately complicates it.

Suppose the memory says:

```text
{"object": "milk", "state": "cold", "position": "on the table"}
{"object": "table", "position": "in the kitchen"}
```

After the agent picks up the milk, the milk record changes. Depending on the representation, the table record may change too, because it no longer holds the milk. A prefix cache would only reuse the exact unchanged prefix, so a small edit can invalidate a long suffix. Fixed-size KV blocks are less brittle, but their boundaries are mechanical rather than semantic. A block might mix a stable task-history example with a volatile object state, or split two related object memories apart.

KEEP is built around this mismatch. Embodied memory is structured, semantically meaningful, and updated unevenly. A good cache strategy should be structured too.

## The Memory Design Space

The paper places KEEP against several broad memory paradigms.

**Parametric memory** stores task experience in model weights through fine-tuning. It can be fast at inference time, but it is expensive to update and risks forgetting or overfitting.

**Text memory** keeps memory as prompt text. This is simple, transparent, and training-free, which is why it is common in embodied-agent prototypes. But the more memory you retrieve, the larger the prefill cost becomes.

**Latent memory** compresses history into learned or summarized states. This can be efficient, but compression may discard details that later become important. In embodied tasks, a tiny detail such as where a key was last seen may become the whole difference between success and failure.

**KV-centric memory**, KEEP’s choice, stores memory as the LLM’s own KV states. It is training-free like text memory, but aims to avoid repeated prefill. The challenge is scalability and correctness: KV tensors are large, may live partly in CPU RAM, and become invalid when their corresponding memory changes.

So the core contribution of KEEP is not merely "store KV". The contribution is a management policy for deciding **what granularity to cache**, **what to recompute**, and **when to load it**.

## Idea 1: Not All Memory Ages at the Same Speed

The first KEEP idea is **Static-Dynamic Memory Construction**. The intuition is almost mundane, which is part of why I like it: some memories change all the time, and some barely change at all.

Object-state memory is often dynamic. A potato can be whole, sliced, heated, moved, placed in a sink, or held by the robot. A drawer can be opened or closed. A mug can move from a countertop to a table. These records are exactly the ones that make embodied memory useful, but they are also the ones that break naive cache reuse.

Task-history examples are different. A few-shot example saying "Human: Put a cooked potato slice in the sink. Robot: find a knife, pick up the knife, ..." does not change after the robot executes the current task. It is semantically rich and stable. Caching it as many tiny independent blocks would lose useful internal attention for no good reason.

KEEP therefore clusters memory using a sentence encoder, and then classifies memory groups by recent update frequency. A group is static if all its segments have stayed unchanged for the recent threshold window, set to `t = 10` in the paper. Static groups are cached and retrieved as groups, preserving cross-attention inside the group. Dynamic groups are cached at individual segment granularity, so one updated object does not invalidate a large semantic neighborhood.

In other words, KEEP asks each memory group a practical question: are you old enough to be cached together, or active enough that I should isolate your changes?

This directly addresses a weakness of fixed-size block reuse. Fixed token blocks know nothing about object identity, task examples, or update frequency. KEEP uses the fact that embodied memory already has a semantic structure.

## Idea 2: Importance Can Be Indirect

The second idea is **Multi-hop Memory Re-computation**. This part answers a subtle question: if we cached memory segments independently, how do we recover the cross-attention that the model would have used under full prefill?

One answer is to recompute a small fraction of tokens. Prior KV recomputation systems often choose positions heuristically, or choose tokens based on local discrepancy. KEEP argues that embodied planning needs a more query-aware and context-aware criterion.

Consider the instruction:

```text
Open the door.
```

The directly relevant memory might be:

```text
{"object": "door", "state": "locked"}
```

But the correct next action may depend on another memory:

```text
{"object": "key", "position": "on the table"}
```

And that memory may itself depend on:

```text
{"object": "table", "position": "in the kitchen"}
```

The table memory is not necessarily the most query-similar memory if we only compare it to "open the door". But through the chain door to key to table, it becomes essential. This is the paper’s central reason for doing importance propagation.

At selected layers, KEEP starts from query-to-memory attention and assigns initial importance scores. It then selects a top ratio of memories, looks at attention from those selected memories to other memories, updates importance scores, and repeats until the selected set stabilizes. The final set is recomputed for the next layer.

This is a nice conceptual shift. Importance is not treated as a one-hop retrieval score. It is allowed to move through the memory graph created implicitly by attention. For embodied planning, that matters because many tasks are chains of preconditions: to open the door, find the key; to find the key, locate the table; to reach the table, go to the kitchen.

The paper also chooses memory-segment granularity rather than arbitrary token granularity. That is less fine-grained, but much friendlier to contiguous KV loading. In the code, the vLLM path tracks memory modules through `module_lengths` and `recompute_modules`, rather than maintaining a scattered set of individual token positions as the primary abstraction.

## Idea 3: The Loader Has to Be Scheduled Too

The third idea, **Layer-balanced Memory Loading**, is the most systems-flavored part of the paper.

KEEP stores KV memory in larger-capacity memory such as CPU RAM and loads it to GPU when needed. This is necessary because long memory creates a large KV footprint. But once KV loading enters the picture, the bottleneck is no longer just "how many tokens do we recompute?" It is also "when do we move KV, and can that movement be hidden behind computation?"

A straightforward schedule loads KV for layer `i + 1` while computing layer `i`. That works only if each layer has similar loading and computation work. KEEP observes that under recomputation, this assumption breaks. Early layers recompute more memory, so they load less old KV. Later layers recompute less memory, so they load more old KV. As a result, the loader may be idle early and the compute path may wait later.

KEEP uses a cross-layer observation: once a memory segment is not recomputed in an earlier layer, it cannot suddenly be recomputed later, because the hidden state needed to recompute it has already been discarded. Therefore, its KV for later layers is guaranteed to be needed. The system can use idle time in early layers to pre-load KV for future layers, smoothing the load.

This turns memory loading into a scheduling problem. The system is not only choosing which memories matter; it is also trying to make GPU computation and CPU-to-GPU KV movement arrive at the right time.

## How the Code Maps to the Paper

The codebase makes the paper easier to understand because it exposes the planner-level and model-level pieces separately.

At the planner level, `KEEP_vllm/src/task_planner.py` defines `message_kv`, which wraps one memory item with its text content, token ids, semantic vector, KV cache, length, id, and KV placement. This is the basic unit that lets the system talk about memory semantically while still holding the concrete KV tensors needed by the model.

The same file defines `overall_kv_schedule`, which is the main coordination object for static KV, object memories, example memories, similarity scores, selected memory order, module ranges, and layer-wise loading buffers. Functions such as `add_message_objects_by_observation` and `add_message_objects_by_action` show how ALFRED observations and executed actions update object memory. If an object record changes, the old KV placement is removed and the object memory is re-added.

At the task level, `KEEP_vllm/src/alfred/alfred_task_planner.py` turns ALFRED objects and skills into planner prompts. It maintains skill sets for actions like finding objects, picking them up, putting them down, opening and closing receptacles, slicing objects, and toggling appliances. It also selects few-shot examples using sentence-transformer similarity. These examples become a relatively stable memory source, which fits the static side of KEEP.

At the serving/model level, `KEEP_vllm/vllm_KEEP/vllm/model_executor/models/qwen2.py` is where the custom vLLM behavior appears. The modified forward path passes `cache_fuse_metadata`, `old_kv`, `layer_id`, and `kv_schedule` through Qwen2 layers. The model tracks whether it is collecting KV, checking/recomputing memory, or using cached KV. It maintains `recompute_modules`, `imp_indices`, `query_imp_indices`, `check_layers`, and per-layer recomputation counts.

The layer-balanced loading logic appears through calls such as:

```text
move_kv_layer_wise_vllm_v1
move_kv_layer_wise_extra_vllm_v1
```

These functions fill preallocated layer-wise KV buffers and use loading tables to avoid repeatedly loading the same memory for the same layer. The code is researchy, with placeholders such as `PATH/TO/SENTENCE_TRANSFORMER`, explicit CUDA assumptions, and Qwen-specific paths. But the artifact is still valuable because it shows how the abstract system idea lands in an actual inference loop.

## Experiments and What They Show

The paper evaluates KEEP on **ALFRED** and **WAH-NL**, using Qwen-2.5 models. ALFRED reports Success Rate (SR), while WAH-NL reports Subgoal Success Rate (Sub-SR). Efficiency is measured with TTFT, because prefill dominates planning latency.

On ALFRED, the main comparison is telling:

- Full recompute with Qwen-2.5-14B reaches **44.63% SR** and **0.410s TTFT**.
- KEEP with Qwen-2.5-14B reaches **44.30% SR** and **0.236s TTFT**.
- Full recompute with Qwen-2.5-32B INT4 reaches **45.81% SR** and **1.213s TTFT**.
- KEEP with Qwen-2.5-32B INT4 reaches **45.50% SR** and **0.635s TTFT**.

So KEEP nearly preserves full-recompute accuracy while removing a large part of the prefill cost. Compared with CacheBlend, KEEP improves ALFRED SR from **39.36% to 44.30%** on Qwen-14B and from **41.37% to 45.50%** on Qwen-32B INT4. The TTFT improvement over CacheBlend is also substantial.

On WAH-NL, the pattern is similar. KEEP keeps Sub-SR close to full recompute while reducing TTFT. Compared with CacheBlend, it improves Sub-SR by about **3.3%** and cuts TTFT by around **1.5x to 1.9x**, depending on model size.

The ablation study clarifies the role of each module:

- Without static-dynamic memory construction, ALFRED SR drops from **44.30% to 37.36%**, and TTFT rises from **0.230s to 0.355s**. This means the grouping strategy is not just a speed trick; it also preserves useful memory interactions.
- Without multi-hop memory recomputation, SR drops to **41.78%**, while TTFT stays close. This is the accuracy-protection mechanism.
- Without layer-balanced loading, SR is unchanged, but TTFT rises to **0.273s**. This isolates the scheduler’s role as a latency optimization.

I read these results as a clean decomposition: static-dynamic construction decides the right cache granularity, multi-hop recomputation repairs the most important lost attention, and layer-balanced loading makes the system run efficiently.

## Why I Find KEEP Interesting

Many agent-memory papers talk about what to remember: summaries, episodic records, semantic facts, retrieved examples, or compressed latent states. KEEP is more concerned with how memory is physically represented and moved through inference. That shift is important.

For an embodied agent, memory is not a decorative prompt section. It is part of the control loop. If the agent must consult memory before every action, then memory representation directly affects action latency. A memory system that is semantically elegant but too slow may fail in deployment. A memory system that is fast but breaks important relationships may plan badly. KEEP sits exactly at that tension point.

I also like that the three designs operate at different levels:

- Static-dynamic construction is a memory-organization idea.
- Multi-hop recomputation is a model-attention idea.
- Layer-balanced loading is a runtime-scheduling idea.

The paper is strongest when these levels reinforce each other. Segment-level memory makes recomputation decisions meaningful. Recomputed modules define what needs to be loaded. Loading decisions affect whether the system speedup materializes in wall-clock TTFT. It is not one isolated trick; it is a stack.

## Limitations and Questions

KEEP assumes memory can be represented as structured segments. ALFRED and WAH-NL provide a friendly setting for this because object states and task histories can be written down clearly. In a less controlled real robot setting, the hard part may shift upstream: perception may be noisy, object identity may be uncertain, and memory updates may be incomplete or wrong.

There is also an implementation portability question. The released code is closely tied to Qwen, vLLM internals, attention-weight access, KV tensor layout, and explicit CUDA behavior. That is understandable for a systems prototype, but adopting KEEP in a different serving stack would require careful engineering.

Another question is how robust the importance propagation is when attention does not align with causal task relevance. The door-key-table story is compelling, but attention can be noisy or diffuse. In larger environments, it would be interesting to study whether explicit symbolic relations, retrieval graphs, or learned memory routers could complement attention-based propagation.

Finally, KEEP accelerates planning with the memory it is given. It does not guarantee memory correctness. If the agent records the wrong location for the key, faster KV reuse only helps the model consult the wrong fact faster.

## Takeaway

KEEP is best understood as a systems paper about making long-memory embodied planners practical. It starts from a very real observation: LLM agents need memory, but long text memory turns every short action decision into an expensive prefill. KV cache reuse is the obvious direction, yet embodied memory changes too often and too unevenly for naive reuse.

The contribution is to make caching aware of the life cycle of memory. Stable memories can be grouped. Active memories should be isolated. Indirectly important memories deserve recomputation. KV loading should be scheduled across layers rather than treated as a passive cost.

That is the larger lesson I take from this paper: in embodied agents, memory is simultaneously a semantic object, a planning resource, and a systems artifact. Good memory design has to respect all three.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**KEEP** 讨论的是 LLM 具身规划里一个很现实、也很容易被低估的问题：记忆很有用，但每一步都把长长的文本记忆重新喂给模型，会让智能体变慢。规划器最后可能只需要输出一个很短的动作，比如 “find the potato” 或 “open the microwave”，但在输出这个动作之前，LLM 却要反复 prefill 一整段包含物体状态、机器人状态、历史动作和 few-shot 示例的长 prompt。

论文的回答是：不要只把记忆当成文本，而要把记忆当成可以复用的 **KV cache**。不过，具身环境对朴素 cache reuse 并不友好，因为每次动作之后，世界都可能改变。机器人拿起物体、打开抽屉、把盘子放进水槽、打开水龙头，都会让一部分记忆变旧，也会让对应的 KV cache 不再完全有效。因此 KEEP 不是一篇简单的 KV cache 复用论文，它真正关心的是：如何让 KV 复用尊重具身记忆的结构和更新规律。

整个系统有三块核心设计：

- **静态-动态记忆构建**：稳定记忆以更大的语义 group 缓存，频繁变化的记忆以更细的 segment 粒度缓存。
- **多跳记忆重计算**：只重计算当前 query 真正需要的记忆，其中包括那些通过其他记忆间接变得重要的记忆。
- **层均衡记忆加载**：跨层调度 CPU 到 GPU 的 KV 加载，减少由于不同层重计算比例不均带来的等待。

在 ALFRED 上，KEEP 基本保持了 full recompute 的成功率，同时显著降低 TTFT。相比 CacheBlend，论文在 Qwen-2.5-32B INT4 上报告了 **4.13% 成功率提升** 和 **1.90x TTFT 降低**。

## 论文信息

论文标题是 **"KEEP: A KV-Cache-Centric Memory Management System for Efficient Embodied Planning"**，作者为 **Zebin Yang、Tong Xie、Baotong Lu、Shaoshan Liu、Bo Yu 和 Meng Li**。arXiv 版本是 [2602.23592](https://arxiv.org/abs/2602.23592)。[Microsoft Research](https://www.microsoft.com/en-us/research/publication/keep-a-kv-cache-centric-memory-management-system-for-efficient-embodied-planning/) 也收录了这篇论文页面，代码仓库为 [PKU-SEC-Lab/KEEP_Embodied_Memory](https://github.com/PKU-SEC-Lab/KEEP_Embodied_Memory)。

我阅读的本地代码中有两条实现路径：

- `KEEP_transformers`：较简单的 Transformers 实现，主要用于理解逻辑和做 accuracy-oriented 实验。
- `KEEP_vllm`：基于修改版 vLLM 的实现，用于 latency 实验，也更接近论文真正的系统贡献。

## 为什么会有这个问题

一个基于语言模型的具身规划器，通常会在一个循环里运行。它先观察环境，然后更新记忆，再构造 prompt，请 LLM 选择下一步动作，执行动作，然后进入下一轮。乍看之下，这和普通 prompting 没什么不同。但它的开销结构其实很特殊。

生成的答案很短。在 ALFRED 这类任务中，输出可能只是从一个受限技能集合里选择下一步：find、pick up、put down、slice、open、close、toggle。可是输入 prompt 可能很长，里面有任务规则、示例、物体记忆、当前发现的物体状态和任务指令。随着任务推进，这会造成一个奇怪的不平衡：模型大部分时间都在“读记忆”，而不是“生成动作”。

这就是为什么 TTFT 很重要。如果每一步都要先 prefill 成千上万个记忆 token，最后只生成一个很短的动作，那么智能体自然会显得迟缓。在真实机器人闭环里，这不是单纯的体验问题。慢规划会影响交互节奏，限制重规划频率，也会让长时序任务的成本上升。

一个自然的想法是 KV caching。既然模型已经处理过某段记忆，为什么不把它的 key-value states 存下来，之后直接复用？这个方向是对的，但具身记忆马上会让问题复杂起来。

假设记忆里有：

```text
{"object": "milk", "state": "cold", "position": "on the table"}
{"object": "table", "position": "in the kitchen"}
```

机器人拿起牛奶之后，牛奶的位置变了；根据具体表示，桌子的状态也可能要变，因为桌上不再有牛奶。Prefix cache 只能复用完全一致的前缀，所以一个很小的修改就可能让后面一大段缓存失效。固定大小 KV block 虽然更灵活一些，但它的边界是机械切出来的，不是语义边界。一个 block 可能同时混进稳定的历史任务示例和频繁变化的物体状态，也可能把两个强相关的物体记忆切开。

KEEP 正是围绕这种 mismatch 设计的。具身记忆是结构化的、有语义的，而且更新频率非常不均匀。好的 cache 策略也应该是结构化的。

## 记忆方法的几种选择

论文把 KEEP 放在几类常见记忆范式中理解。

**参数记忆** 把任务经验通过 fine-tuning 写进模型权重。它推理时可能很快，但更新成本高，也容易遗忘或过拟合。

**文本记忆** 直接把记忆作为 prompt 文本保存。这种方法简单、透明、不需要训练，所以在具身智能体原型里很常见。但检索越多记忆，prefill 成本就越高。

**潜变量记忆** 把历史压缩成 learned state 或 summary token。它可能更高效，但压缩不可避免会丢细节。在具身任务中，一个小细节，比如钥匙最后在哪里被看到，可能就是成败关键。

**KV-centric memory** 是 KEEP 的选择：把记忆保存成 LLM 自己的 KV states。它像文本记忆一样 training-free，但希望避免重复 prefill。难点在于可扩展性和正确性：KV tensor 很大，可能要部分放在 CPU RAM 中；同时，当对应记忆发生变化，KV 也会失效。

所以 KEEP 的核心贡献不是简单地“保存 KV”，而是一套管理策略：用什么粒度缓存，哪些内容需要重计算，什么时候加载到 GPU。

## 设计一：不是所有记忆都以同样速度老去

KEEP 的第一个设计是 **静态-动态记忆构建**。这个直觉非常朴素，但也正因为朴素，所以很有说服力：有些记忆总是在变，有些记忆几乎不变。

物体状态记忆往往是动态的。一个 potato 可以是完整的、被切开的、被加热的、被移动的、被放进水槽的，或者正被机器人拿着。一个 drawer 可以打开或关闭。一个 mug 可以从 countertop 移到 table。这些记忆正是具身任务里最有用的部分，但它们也最容易让 cache 失效。

任务历史示例则不同。一个 few-shot 示例写着 “Human: Put a cooked potato slice in the sink. Robot: find a knife, pick up the knife, ...”，它不会因为当前机器人执行了一个动作而变化。它语义丰富、内部结构稳定。如果把它切成很多小块独立缓存，反而会平白损失内部 cross-attention。

所以 KEEP 先用 sentence encoder 对记忆聚类，再根据最近更新频率给 group 分类。如果一个 group 里所有 segment 在最近的阈值窗口内都没有变化，它就是 static group；论文里这个阈值设为 `t = 10`。静态 group 以整体计算和检索，从而保留 group 内部的上下文联系。动态 group 则按单个 segment 缓存，这样某个物体更新时，不会让一大组记忆都失效。

换句话说，KEEP 会问每组记忆一个很实际的问题：你已经稳定到可以合在一起缓存了吗？还是你仍然活跃到应该被单独隔离管理？

这直接修正了 fixed-size block reuse 的弱点。固定 token block 不知道什么是物体、什么是任务示例，也不知道哪段记忆经常变化。KEEP 则利用了具身记忆原本就具备的语义结构。

## 设计二：重要性常常是间接的

第二个设计是 **多跳记忆重计算**。它回答的是一个更细的问题：如果我们把记忆片段独立缓存了，怎样恢复 full prefill 时模型本来可以使用的 cross-attention？

一种方法是只重计算一小部分 token。已有 KV recomputation 方法往往根据位置启发式或局部差异来选择 token。KEEP 认为，具身规划需要更 query-aware、context-aware 的选择标准。

考虑这个指令：

```text
Open the door.
```

最直接相关的记忆可能是：

```text
{"object": "door", "state": "locked"}
```

但真正有用的下一步动作，可能取决于另一条记忆：

```text
{"object": "key", "position": "on the table"}
```

而这条记忆又会继续依赖：

```text
{"object": "table", "position": "in the kitchen"}
```

如果只把 “table” 和 “open the door” 做一跳相似度比较，table 不一定排在最前面。但沿着 door 到 key 到 table 这条链，它就变成了关键记忆。这就是论文做 importance propagation 的核心理由。

在被选中的层里，KEEP 先用 query 到各个 memory 的 attention 作为初始重要性分数。然后选出当前 top ratio 的记忆，再看这些被选中记忆到其他记忆的 attention，把重要性继续传播出去。这个过程重复进行，直到重要记忆集合稳定。最后，下一层只重计算这个稳定集合中的记忆。

这是一个很有意思的概念变化。重要性不再是单次 retrieval score，而是可以沿着 attention 隐含出来的记忆关系图传播。对于具身规划来说，这很重要，因为很多任务本来就是前置条件链：要开门，先找钥匙；要找钥匙，先找桌子；要找桌子，先去厨房。

论文还选择了 memory segment 粒度，而不是任意 token 粒度。这样粒度更粗，但对连续 KV 加载更友好。代码里，vLLM 路径主要通过 `module_lengths` 和 `recompute_modules` 跟踪记忆模块，而不是把一堆离散 token 位置作为核心抽象。

## 设计三：加载本身也需要调度

第三个设计 **层均衡记忆加载** 是最系统方向的一部分。

KEEP 会把 KV 记忆放在 CPU RAM 等容量更大的存储里，需要时再加载到 GPU。这是可扩展性所必需的，因为长记忆会带来很大的 KV footprint。但一旦引入 KV loading，瓶颈就不只是“重计算多少 token”，还包括“什么时候移动 KV，以及这个移动能不能藏在计算后面”。

一种直观调度是：计算第 `i` 层时，加载第 `i + 1` 层需要的 KV。这个策略只有在每层加载和计算工作量差不多时才理想。KEEP 观察到，在重计算机制下，这个假设不成立。早期层重计算比例高，所以要加载的旧 KV 少；后期层重计算比例低，所以要加载的旧 KV 多。结果就是早期 loading 线程可能空等，后期 compute 又可能等待 loading。

KEEP 利用了一个跨层观察：如果一个 memory segment 在较早层已经决定不重计算，那么它在后续层也不可能突然重计算，因为用于重计算它的 hidden state 已经被丢弃了。因此，它在后续层的 KV 一定会被需要。系统就可以利用早期层的空闲时间，提前加载未来层的 KV，平滑整体负载。

这让记忆加载变成了一个调度问题。系统不仅要判断哪些记忆重要，还要让 GPU 计算和 CPU-to-GPU KV 搬运在时间上尽可能对齐。

## 代码如何对应论文

代码仓库让这篇论文更容易理解，因为它把 planner 层和 model/runtime 层分开暴露了出来。

在 planner 层，`KEEP_vllm/src/task_planner.py` 定义了 `message_kv`，它把一个记忆项包装起来，里面包含文本内容、token ids、语义向量、KV cache、长度、id 和 KV placement。这是系统能同时谈论“语义记忆”和“具体 KV tensor”的基础单位。

同一个文件还定义了 `overall_kv_schedule`，它是静态 KV、物体记忆、示例记忆、相似度分数、已选记忆顺序、module 范围和 layer-wise loading buffer 的协调器。`add_message_objects_by_observation` 和 `add_message_objects_by_action` 展示了 ALFRED 中观测和已执行动作如何更新物体记忆。如果一个物体记录变化，代码会移除旧的 KV placement，再重新加入这个物体记忆。

在任务层，`KEEP_vllm/src/alfred/alfred_task_planner.py` 把 ALFRED 物体和技能转成规划 prompt。它维护了一组低层技能，包括找物体、拿起、放下、打开、关闭、切开和开关电器等。它还会用 sentence-transformer 相似度选择 few-shot examples。这些 examples 相对稳定，天然对应 KEEP 中 static memory 的一侧。

在 serving/model 层，`KEEP_vllm/vllm_KEEP/vllm/model_executor/models/qwen2.py` 里能看到修改版 vLLM 的核心逻辑。改过的 forward path 会把 `cache_fuse_metadata`、`old_kv`、`layer_id` 和 `kv_schedule` 传入 Qwen2 layer。模型会追踪当前是在收集 KV、检查并重计算记忆，还是使用已缓存 KV。它维护 `recompute_modules`、`imp_indices`、`query_imp_indices`、`check_layers` 和逐层 recomputation counts。

层均衡加载逻辑则通过这些函数体现：

```text
move_kv_layer_wise_vllm_v1
move_kv_layer_wise_extra_vllm_v1
```

这些函数会填充预分配的 layer-wise KV buffer，并用 loading table 避免同一层同一段记忆重复加载。代码整体是典型 research artifact，有 `PATH/TO/SENTENCE_TRANSFORMER` 这样的本地路径占位符，也有显式 CUDA 假设和 Qwen-specific 路径。但它仍然很有价值，因为它展示了论文里的抽象系统设计如何落到真实 inference loop 中。

## 实验结果说明了什么

论文在 **ALFRED** 和 **WAH-NL** 上评估 KEEP，使用 Qwen-2.5 系列模型。ALFRED 用 Success Rate，也就是 SR；WAH-NL 用 Subgoal Success Rate，也就是 Sub-SR。效率指标用 TTFT，因为 prefill 是规划延迟的主体。

在 ALFRED 上，主结果很清楚：

- Qwen-2.5-14B 的 full recompute 达到 **44.63% SR** 和 **0.410s TTFT**。
- Qwen-2.5-14B 的 KEEP 达到 **44.30% SR** 和 **0.236s TTFT**。
- Qwen-2.5-32B INT4 的 full recompute 达到 **45.81% SR** 和 **1.213s TTFT**。
- Qwen-2.5-32B INT4 的 KEEP 达到 **45.50% SR** 和 **0.635s TTFT**。

也就是说，KEEP 基本保留了 full recompute 的准确率，同时拿掉了很大一部分 prefill 成本。相比 CacheBlend，KEEP 在 Qwen-14B 上把 ALFRED SR 从 **39.36%** 提升到 **44.30%**，在 Qwen-32B INT4 上从 **41.37%** 提升到 **45.50%**。TTFT 相比 CacheBlend 也有明显下降。

在 WAH-NL 上，趋势类似。KEEP 让 Sub-SR 接近 full recompute，同时降低 TTFT。相比 CacheBlend，它带来约 **3.3%** 的 Sub-SR 提升，并根据模型大小实现约 **1.5x 到 1.9x** 的 TTFT 降低。

消融实验把每个模块的作用拆得比较清楚：

- 去掉静态-动态记忆构建，ALFRED SR 从 **44.30%** 降到 **37.36%**，TTFT 从 **0.230s** 增加到 **0.355s**。这说明分组策略不只是速度优化，它也保留了有用的记忆交互。
- 去掉多跳记忆重计算，SR 降到 **41.78%**，TTFT 基本接近。这说明它主要负责保护准确率。
- 去掉层均衡加载，SR 不变，但 TTFT 增加到 **0.273s**。这隔离出了调度器的延迟优化作用。

我的理解是，这组结果形成了一个很清晰的分工：静态-动态构建决定 cache 粒度，多跳重计算修补最重要的 attention 损失，层均衡加载确保系统收益能落实到真实 wall-clock TTFT 上。

## 我为什么觉得 KEEP 有意思

很多 agent memory 论文更关注“记住什么”：summary、episodic record、semantic fact、retrieved example，或者压缩成 latent state。KEEP 更关心的是：记忆在推理系统里到底以什么形式存在，又如何被移动和复用。这个视角很重要。

对于具身智能体来说，记忆不是 prompt 里一个漂亮的附录。它是控制循环的一部分。如果智能体每一步行动前都要查记忆，那么记忆表示会直接影响动作延迟。一个语义上优雅但太慢的记忆系统，在部署时可能不可用。一个很快但破坏重要关系的记忆系统，又会让规划变差。KEEP 正好卡在这个张力点上。

我也喜欢它三个设计所在的层次：

- 静态-动态构建是 memory organization 的设计。
- 多跳重计算是 model attention 的设计。
- 层均衡加载是 runtime scheduling 的设计。

论文最有力量的地方，是这三个层次能互相支撑。Segment-level memory 让重计算决策有意义。重计算模块决定哪些 KV 需要加载。加载策略决定系统加速能否真的体现到 TTFT。它不是一个孤立 trick，而是一整套围绕记忆生命周期搭起来的系统。

## 局限与问题

KEEP 假设记忆可以被表示为结构化 segment。在 ALFRED 和 WAH-NL 中，这个假设比较友好，因为物体状态和任务历史可以清晰写下来。但在更开放的真实机器人场景里，困难可能会前移：感知有噪声，物体身份不确定，记忆更新可能不完整或错误。

还有实现可迁移性的问题。发布代码与 Qwen、vLLM 内部、attention-weight 访问、KV tensor layout 和显式 CUDA 行为都绑定得比较紧。这对系统原型来说可以理解，但如果要把 KEEP 放到另一个 serving stack 中，需要做不少细致工程。

另一个值得继续追问的问题是：当 attention 不完全等价于任务因果相关性时，importance propagation 有多稳健？door-key-table 的例子很有说服力，但 attention 也可能分散或带噪声。在更大、更复杂的环境里，也许显式符号关系、检索图或 learned memory router 可以和 attention-based propagation 互补。

最后，KEEP 加速的是“基于已有记忆的规划”。它不保证记忆本身正确。如果智能体把钥匙位置记错了，更快的 KV 复用也只是让模型更快地查到错误事实。

## 我的理解

KEEP 最适合被理解为一篇让 long-memory embodied planner 变得更实际的系统论文。它从一个真实观察出发：LLM agent 需要记忆，但长文本记忆会让每个短动作决策都付出昂贵 prefill 成本。KV cache 复用显然是方向，但具身记忆变化太频繁、太不均匀，朴素复用远远不够。

它的贡献在于让 caching 认识到记忆的生命周期。稳定记忆可以成组缓存，活跃记忆应该细粒度隔离，间接重要的记忆值得重计算，KV 加载也应该跨层调度，而不是被动等待。

我从这篇论文里得到的最大提醒是：在具身智能体中，记忆同时是语义对象、规划资源和系统对象。好的记忆设计必须同时尊重这三件事。

</div>
