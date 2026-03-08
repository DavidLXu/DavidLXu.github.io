---
title: "[Paper Notes] MEM: Multi-Scale Embodied Memory for Vision Language Action Models"
date: 2026-03-09
permalink: /posts/2026/03/mem-paper-notes/
tags:
  - Robotics
  - Vision-Language-Action
  - Memory
  - Long-Horizon Control
  - Embodied AI
  - Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**MEM** adds explicit memory to Vision-Language-Action models by splitting memory into two parts:

- **short-term video memory** for recent visual context, self-occlusion handling, and quick strategy adaptation
- **long-term language memory** for compact semantic summaries of what has already happened in a long task

The paper’s main claim is that end-to-end robot policies need **multi-scale memory**, not just a longer observation window. MEM lets a VLA solve tasks that require memory over **up to 15 minutes**, while still respecting real-time inference constraints.

## Paper Info

- **Title**: MEM: Multi-Scale Embodied Memory for Vision Language Action Models
- **Authors**: Marcel Torne, Karl Pertsch, Homer Walke, Kyle Vedder, Suraj Nair, Brian Ichter, Allen Z. Ren, Haohuan Wang, Jiaming Tang, Kyle Stachowicz, Karan Dhabalia, Michael Equi, Quan Vuong, Jost Tobias Springenberg, Sergey Levine, Chelsea Finn, Danny Driess
- **Affiliations**: Physical Intelligence, Stanford University, UC Berkeley, MIT
- **Project page**: [pi.website/research/memory](https://pi.website/research/memory)
- **Paper type**: robotics/VLA systems paper

## 1. Motivation

The paper starts from a gap in current VLAs:

- many strong VLAs act only on the **current observation**
- some memory-augmented methods simply append a dense history of past observations
- that approach becomes expensive and still does not distinguish between **fine-grained short-term context** and **abstract long-term task state**

For real robot tasks, these two memory types matter for different reasons:

- short-term memory helps with self-occlusion, tracking recent failures, and adjusting manipulation online
- long-term memory helps remember semantic progress, such as which ingredients have already been collected or which subtasks are done

The authors argue that a single uniform memory mechanism is a poor fit for both.

## 2. Core Idea of MEM

MEM splits action generation into a low-level and high-level process.

- The **low-level policy** uses a short horizon of dense observations plus a subtask instruction.
- The **high-level policy** predicts both the next subtask instruction and an updated **language memory** summarizing past semantic events.

This gives the model a mixed-modal memory system:

- **video memory** for recent detailed visual context
- **language memory** for long-horizon compressed task history

That design is the real contribution of the paper. It is not just "more context"; it is a structured memory interface matched to different timescales.

## 3. Method Breakdown

### 3.1 Language memory for long-horizon context

The language memory is a running semantic summary of what has already happened in the episode. Instead of passing all previous observations or all previous subtasks verbatim, the model updates a compact textual state over time.

This is important because:

- it compresses long-horizon history much better than raw images
- it keeps the model focused on semantically relevant events
- it avoids exploding context length for tasks that span many minutes

The paper also shows that a naive alternative, simply concatenating previous subtask instructions, works noticeably worse because training-time demonstrations rarely contain repeated failures, while inference-time rollouts often do.

### 3.2 Video encoder for short-horizon context

For short-term memory, MEM uses a video encoder that extends a ViT-style image encoder into a video encoder by interleaving:

- spatial attention within each frame
- causal-temporal attention across frames

An important engineering detail is that this encoder:

- compresses time before passing features into the VLA backbone
- preserves the token count seen by the backbone at roughly the single-frame level
- introduces **no new learnable parameters** compared with the standard image ViT

That makes it possible to initialize from pre-trained VLM weights while keeping inference latency under real-time constraints.

### 3.3 Integrating MEM into `pi0.6`

The paper instantiates MEM inside the `pi0.6` VLA. During pre-training, the model sees sequences of six observations with one-second stride. During post-training, the observation horizon can be expanded significantly, up to around one minute for observation-based memory, while the language memory covers much longer horizons.

The broader point is that the memory capability is developed during large-scale pre-training, not bolted on only at the end.

## 4. Main Results

## 4.1 Long-horizon manipulation tasks

The headline result is that MEM enables long-horizon tasks such as:

- recipe setup
- kitchen cleanup
- grilled cheese preparation

These tasks require maintaining task-relevant memory over **up to fifteen minutes**. The paper shows that memoryless `pi0.6` struggles badly on them, while the full MEM system makes them much more tractable.

The ablations are especially informative:

- removing **video memory** hurts tasks that require recent timing, occlusion handling, or adaptation
- removing **language memory** hurts tasks that require long-range semantic progress tracking
- using **naive text memory** without compression performs much worse than learned semantic summaries

This supports the paper’s central claim that both memory scales are necessary.

## 4.2 In-context adaptation

One of the most interesting parts of the paper is that memory is not only for remembering task progress. It also enables **in-context adaptation** of manipulation strategy.

The authors demonstrate this on tasks like:

- picking up a chopstick at an out-of-distribution table height
- opening a refrigerator when the door-opening direction is ambiguous

With memory, the policy can use recent failed attempts as context and switch strategy. The reported gains are substantial:

- about **+11%** on chopstick pickup
- about **+62%** on fridge opening

The memoryless baseline cannot adapt as effectively because it cannot explicitly condition on what was just tried and failed.

## 4.3 Core memory capability benchmarks

The paper also evaluates memory-intensive skills including:

- partial observability
- counting
- timing
- spatial memory

Example tasks include finding an object hidden in one of four drawers, unpacking groceries without forgetting items inside the bag, counting coffee scoops, cooking for the right duration, and remembering which parts of a window have already been cleaned.

Across these tasks, MEM is reported as the only approach that performs strongly across the full range of memory demands, outperforming:

- no-memory VLAs
- pooled observation-memory baselines
- proprio-only memory baselines

## 4.4 Memory without sacrificing standard manipulation

A useful systems result is that MEM does not just improve memory-heavy tasks. The paper also shows it remains competitive on manipulation tasks that do **not** require memory, suggesting the memory machinery does not degrade core dexterous control.

## 5. Why This Paper Matters

I think the most important idea here is conceptual: **robot memory should be structured by abstraction level and timescale**.

That is more convincing than the simpler "just add more frames" strategy for three reasons:

- recent visual context and long-term semantic state are fundamentally different objects
- runtime constraints matter a lot for real robot control
- long-horizon deployment requires compression, not only larger context windows

In that sense, MEM feels closer to a practical robot architecture than a pure sequence-model scaling exercise.

## 6. Strengths

- Clear separation between short-term and long-term memory roles.
- Strong systems focus: the method is designed around real-time latency constraints, not only benchmark accuracy.
- Good ablation story showing why both memory modalities matter.
- The in-context adaptation result is more interesting than standard memory benchmarks because it shows memory changing behavior, not just recall.
- The paper evaluates a fairly broad set of embodied tasks across different memory requirements.

## 7. Limitations and Open Questions

- The language memory still depends on the model learning useful semantic compression; it is not guaranteed to preserve every critical detail.
- The approach is integrated into a large proprietary-style VLA stack (`pi0.6`), so reproducibility and accessibility may be limited compared with fully open systems.
- It is still episodic memory. The paper explicitly frames longer-term deployment memory across days, weeks, or months as future work.
- It remains unclear how robust the memory summaries are under very long failure chains or heavily out-of-distribution task structures.
- The paper demonstrates strong system behavior, but it is harder to isolate how much comes from the memory design itself versus the scale of the underlying training setup.

## 8. Takeaways

My main takeaway is that MEM gives a strong recipe for long-horizon robot control:

- keep recent observations in a compact visual memory
- summarize distant history in language
- let the policy reason over both

This feels like a more scalable direction for embodied agents than trying to extend a flat observation history indefinitely. If long-horizon robotics is going to work in open-ended homes and kitchens, some version of this multi-scale memory design is likely to become standard.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**MEM** 为 Vision-Language-Action 模型加入了显式记忆机制，并把记忆拆成两部分：

- **短期视频记忆**：处理最近的视觉上下文、自遮挡以及快速策略调整
- **长期语言记忆**：用紧凑的语义摘要记录长任务中已经发生过什么

这篇论文的核心观点是，端到端机器人策略需要的是**多尺度记忆**，而不是简单地把观察窗口拉长。MEM 让 VLA 在满足实时推理约束的前提下，解决需要 **最长 15 分钟记忆** 的任务。

## 论文信息

- **标题**: MEM: Multi-Scale Embodied Memory for Vision Language Action Models
- **作者**: Marcel Torne, Karl Pertsch, Homer Walke, Kyle Vedder, Suraj Nair, Brian Ichter, Allen Z. Ren, Haohuan Wang, Jiaming Tang, Kyle Stachowicz, Karan Dhabalia, Michael Equi, Quan Vuong, Jost Tobias Springenberg, Sergey Levine, Chelsea Finn, Danny Driess
- **机构**: Physical Intelligence, Stanford University, UC Berkeley, MIT
- **项目主页**: [pi.website/research/memory](https://pi.website/research/memory)
- **论文类型**: robotics/VLA systems paper

## 1. 研究动机

论文针对当前 VLA 的一个明显短板：

- 很多强大的 VLA 只依赖**当前观测**
- 一些带记忆的方法只是把过去一串观测直接拼接起来
- 这种方案一方面计算成本高，另一方面也没有区分**细粒度短期上下文**和**抽象长期任务状态**

对于真实机器人任务，这两类记忆的作用其实不同：

- 短期记忆有助于处理自遮挡、跟踪刚刚失败过的尝试、在线调整操作方式
- 长期记忆则帮助机器人记住语义层面的进度，比如哪些食材已经拿出来了、哪些子任务已经完成

作者认为，用同一种机制同时处理这两种需求并不合适。

## 2. MEM 的核心思路

MEM 将动作生成拆成高层和低层两个过程。

- **低层策略**使用短时间范围内的密集观测，以及一个子任务指令。
- **高层策略**负责预测下一个子任务指令，并更新一段**语言记忆**，用于总结之前发生的语义事件。

因此，整个系统形成了一个混合模态记忆结构：

- **视频记忆**负责最近的细粒度视觉上下文
- **语言记忆**负责长时间跨度的压缩任务历史

这才是这篇论文真正的贡献。它不是单纯“给模型更多上下文”，而是给不同时间尺度设计了不同的记忆接口。

## 3. 方法拆解

### 3.1 用语言记忆处理长期上下文

语言记忆是对当前 episode 中已发生语义事件的滚动式摘要。它不是把所有过去观测都塞进来，也不是原样拼接所有过去子任务，而是让模型持续维护一个紧凑的文本状态。

这样做的好处是：

- 相比原始图像，语言对长时历史压缩得更好
- 模型会更聚焦于语义上真正重要的事件
- 对于跨度很多分钟的任务，不会让上下文长度无限膨胀

论文还特别说明，一个看似简单的替代方案，即直接拼接过去所有子任务指令，效果会明显更差。原因是训练时的人类演示通常很顺，很少反复失败；但测试时策略可能连续几次在同一子任务上失败，导致输入分布发生明显偏移。

### 3.2 用视频编码器处理短期上下文

在短期记忆部分，MEM 使用了一个将 ViT 图像编码器扩展为视频编码器的设计，它交替进行：

- 帧内的空间注意力
- 跨帧的因果时间注意力

这里一个很重要的工程点是，这个编码器：

- 会先沿时间维做压缩，再把特征送入 VLA 主干
- 传给主干的 token 数量大致保持在单帧级别
- 相比标准图像 ViT，**不引入新的可学习参数**

因此它既可以继承预训练 VLM 权重，又能把推理延迟控制在机器人实时执行所需范围内。

### 3.3 将 MEM 集成到 `pi0.6`

论文将 MEM 集成到 `pi0.6` VLA 中。预训练阶段模型看到的是 6 帧观测序列，每帧间隔 1 秒；后训练阶段可以把 observation-based memory 的范围进一步扩展到约 1 分钟，而语言记忆则覆盖更长时间尺度。

更关键的是，记忆能力是在大规模预训练中形成的，而不是最后临时外挂进去的。

## 4. 主要实验结果

## 4.1 长时序操作任务

最核心的结果是，MEM 能够处理一些真正需要长时间记忆的任务，例如：

- recipe setup
- kitchen cleanup
- grilled cheese preparation

这些任务需要维持**最长约 15 分钟**的任务相关记忆。论文显示，不带记忆的 `pi0.6` 在这些任务上表现很差，而完整的 MEM 系统显著提高了完成能力。

消融实验也很有说服力：

- 去掉**视频记忆**后，模型在计时、遮挡处理和在线调整方面会明显变差
- 去掉**语言记忆**后，模型难以跟踪长时间跨度上的语义进度
- 使用**朴素文本记忆**而不是压缩后的语义摘要，效果也明显更差

这些结果基本支撑了论文的核心论点：两种时间尺度的记忆都不可少。

## 4.2 In-context adaptation

我觉得这篇论文最有意思的部分之一，是它把记忆的作用从“记住过去发生了什么”扩展到了**根据最近失败进行在线策略调整**。

作者在以下任务上展示了这一点：

- 在分布外桌面高度上夹起筷子
- 在门铰链方向不明显时打开冰箱门

有记忆时，策略可以利用最近几次失败的尝试作为上下文，主动切换操作方式。论文报告的提升很明显：

- 筷子抓取大约 **+11%**
- 冰箱开门大约 **+62%**

无记忆基线无法同样有效地适应，因为它并不知道自己刚刚尝试过什么、又是如何失败的。

## 4.3 核心记忆能力评测

论文还系统评测了几类典型的记忆需求：

- partial observability
- counting
- timing
- spatial memory

对应任务包括：记住隐藏物体被放进了哪一个抽屉、从购物袋中逐个取出所有物体、精确加两勺咖啡豆、把食物烹饪到正确时长、记住窗户哪些区域已经擦过等。

在这些任务上，论文报告 MEM 是唯一一个在全部记忆能力上都表现稳定的方法，优于：

- 无记忆 VLA
- 基于池化的 observation-memory 基线
- 只记机器人自身状态的 proprio-memory 基线

## 4.4 不牺牲普通操作能力

另一个比较实用的结论是，MEM 不仅提升了强记忆任务上的表现，在那些**并不需要记忆**的灵巧操作任务上也能保持与当前强基线相当的性能。这说明加入记忆机制并没有明显损伤基本操作能力。

## 5. 为什么这篇论文重要

我觉得这篇论文最重要的贡献是一个概念层面的判断：**机器人记忆应该按抽象层级和时间尺度来组织**。

相比“直接多喂几帧图像”的思路，这个方向更有说服力，原因有三点：

- 最近的视觉上下文和长期的语义状态本来就是两类不同对象
- 真实机器人控制对运行时延迟非常敏感
- 长时任务真正需要的是压缩，而不是无限扩上下文窗口

从这个角度看，MEM 更像是一个可落地的机器人系统架构，而不仅仅是一次序列模型扩容实验。

## 6. 优点

- 清晰地区分了短期记忆和长期记忆的职责。
- 很强的系统意识：方法设计始终围绕真实机器人实时约束，而不是只追求 benchmark 分数。
- 消融实验完整，能说明两种记忆模态各自为什么重要。
- in-context adaptation 的结果比普通记忆 benchmark 更有价值，因为它体现的是记忆如何改变策略行为，而不仅是 recall。
- 任务覆盖面较广，包含不同类型的 embodied memory 需求。

## 7. 局限与开放问题

- 语言记忆仍然依赖模型自己学会有用的语义压缩，不能保证每个关键细节都被完整保留。
- 该方法依赖较大的 `pi0.6` VLA 体系，开放性和复现性可能不如完全开源方案。
- 目前仍然是 episode 内记忆。论文也明确把跨天、跨周、跨月的长期部署记忆留作未来工作。
- 在特别长的失败链条或强分布外任务结构下，语言摘要是否还能稳定工作，仍然不够清楚。
- 论文展示了很强的系统效果，但很难完全分离：究竟有多少收益来自记忆设计本身，多少来自底层大规模训练配置。

## 8. Takeaways

我对这篇论文的主要 takeaway 是，MEM 给长时序机器人控制提供了一个很清晰的配方：

- 用紧凑的视频记忆保留最近观察
- 用语言摘要压缩远期历史
- 让策略同时在这两种记忆上进行推理

相比无限拉长扁平的 observation history，这看起来是一个更可扩展的 embodied agent 方向。如果未来家居机器人真的要处理开放式、长时间、多步骤任务，这种多尺度记忆设计大概率会变成标配。

</div>
