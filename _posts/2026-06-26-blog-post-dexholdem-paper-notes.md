---
title: "[Paper Notes] DexHoldem: Playing Texas Hold'em with Dexterous Embodied System"
date: 2026-06-26
permalink: /posts/2026/06/dexholdem-paper-notes/
tags:
  - Dexterous Manipulation
  - Embodied Agents
  - Robot Learning
  - Benchmark
  - ShadowHand
  - Vision-Language-Action
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DexHoldem** is a real-world benchmark for dexterous embodied systems built around Texas Hold'em tabletop interaction. The platform uses a ShadowHand mounted on a UR10e arm, three RealSense RGB-D cameras for policy-side observation, and a separate agent-view camera for system-level state parsing. The benchmark contains **1,470 teleoperated demonstrations** across **14 card and chip manipulation primitives**, a physical policy benchmark, a **36-problem agentic perception benchmark**, and three released closed-loop system case studies.

My read: the paper is useful because it evaluates the full stack at the point where many embodied-agent demos become vague. A robot needs to decide that it should call, raise, reveal a card, or collect chips, then parse a changing tabletop state, translate the decision into executable low-level primitives, manipulate thin cards and small chips with a dexterous hand, preserve the table for the next decision, and recover when perception or execution is slightly wrong. DexHoldem makes those failure surfaces measurable.

## Paper and Resources

The paper is **"DexHoldem: Playing Texas Hold'em with Dexterous Embodied System"** by **Feng Chen, Tianzhe Chu, Li Sun, Pei Zhou, Zhuxiu Xu, Shenghua Gao, Yuexiang Zhai, Yanchao Yang, and Yi Ma**. It is available as [arXiv:2605.18727](https://arxiv.org/abs/2605.18727), with the project page at [dexholdem.github.io/Dexholdem](https://dexholdem.github.io/Dexholdem/). The dataset is released as [TexasPokerRobot](https://huggingface.co/datasets/Winniechen2002/TexasPokerRobot), the policy code is in [DexHoldem/Dexholdem-Policy](https://github.com/DexHoldem/Dexholdem-Policy), and the embodied-agent runtime is in [DexHoldem/DexHoldemSKills](https://github.com/DexHoldem/DexHoldemSKills).

The policy repository is organized around six public training recipes: DP(DINO), DP_transformer_resnet, DP_unet, ACT, RDT_small, and RDT_FT. The released pipeline downloads the Hugging Face dataset, organizes demonstrations with five validation trajectories per primitive, optionally precomputes DinoV2 or SigLIP visual features, and serves trained checkpoints through a ZeroMQ policy server. The skills repository exposes the agent loop as a coding-agent-native workflow: install the skill, launch a game loop, parse the table, route the state, and dispatch robot primitives.

## Why Poker Is a Good Benchmark Shape

Texas Hold'em is not used here as a test of poker strategy. It is a controlled tabletop domain where semantic state and physical state are tightly coupled. Cards are thin, chips are small and denomination-specific, bets change the legal action space, and every physical movement can disturb later decisions. The robot may need to pick up a left or right hole card, show a card, place it back face down, push a 50-chip, pull a 100-chip, or compose several such actions into a higher-level poker move.

This makes the benchmark more demanding than isolated hand skills. A local manipulation success can still be a system failure if a non-target card shifts, a chip stack becomes unreadable, or the next agent step cannot trust the table state. DexHoldem therefore scores primitive rollouts with four outcome levels: scene-preserving success, disruptive completion, retryable task failure, and disruptive failure requiring reset. The distinction between task completion and scene preservation is the main metric design choice.

## Benchmark Structure

DexHoldem separates the system into two levels. The **primitive level** defines callable dexterous skills for data collection, policy training, and physical rollouts. The **agent level** defines the perception, routing, verification, recovery, and human-help branches that arise when those primitives are composed into a poker hand.

The policy benchmark covers 14 instruction-conditioned primitives:

| Group | Primitives |
|---|---|
| Card pickup | `pick_up_left`, `pick_up_right` |
| Chip push | `push_5`, `push_10`, `push_50`, `push_100` |
| Chip pull | `pull_5`, `pull_10`, `pull_50`, `pull_100` |
| Card placement/reveal | `put_down_left`, `put_down_right`, `show_left`, `show_right` |

Each primitive has **105 accepted teleoperated demonstrations**, split into **100 training** and **5 validation** trajectories. During deployment, each low-level policy receives top-down, third-person, and wrist RGB-D observations, 30-dimensional arm-hand proprioception, and a task condition. The action is a short-horizon sequence of 30-dimensional joint-position targets: 6 dimensions for the UR10e arm and 24 for the ShadowHand.

The agentic perception benchmark isolates the visual parsing problem. Each of 36 problems asks the perceiver to recover a structured game state from a real tabletop image plus predecessor context. The schema is split into eight scored challenges: loop stage, turn ownership, blind information, community cards, current bet chips, robot chip inventory, opponent chip inventory, and showdown outcome. The important detail is that overall correctness is a strict exact match over all applicable fields, so a single wrong chip dictionary can make a state unusable for routing.

## The Closed-Loop Agent

The embodied loop is `capture -> perceive -> route -> execute`. A dedicated agent-view camera captures the table. The perceiver writes structured state. A deterministic router loads persistent game-state memory, validates fields, handles waiting, verifies primitive outcomes, retries harmless failures, and escalates unsafe states to human help. The main agent is queried only when multiple high-level branches are legal, such as a new poker decision at an idle state.

High-level agent primitives are translated into low-level policy primitives. For example, `view_card(L)` becomes `pick_up_left -> perceive -> put_down_left`, while `call` dispatches chip-push primitives according to the difference between the opponent's bet and the robot's bet. Chip actions use a min-count rule over denominations in the order 100, 50, 10, 5, so a failed atom can be retried without discarding the whole high-level action.

This architecture is deliberately mundane in the right places. The router carries workflow constraints that should not be left to the language model at every frame, while the learned policy handles contact-rich motion. The result is a benchmark where an agent's perception errors, policy errors, verification delays, and recovery decisions all show up in the same physical trace.

## Main Results

On the 80-trial primitive schedule covering all 14 skills, **π0.5** obtains the best task completion rate at **61.2%**. On the stricter scene-preserving success rate, **π0.5** and **π0** tie at **47.5%**. RDT reaches **30.0% SPSR** and **46.2% TCR**; DP(DINO) is the strongest task-specific imitation baseline at **26.2% SPSR** and **36.2% TCR**. Smaller or simpler baselines remain much lower: ACT reaches **10.0% SPSR**, BAKU **6.2%**, and DP-UNet **1.2%**.

The gap between SPSR and TCR is the key signal. For π0.5, the score rises from **47.5%** to **61.2%** when disruptive completions are counted. For RDT, it rises from **30.0%** to **46.2%**. These are not small bookkeeping differences; they show that a policy can complete a local primitive while damaging the table state needed by the next agent step.

The primitive-group breakdown is also revealing. π-series models reach **100.0/100.0 SPSR/TCR** on pickup, but chip motion remains much harder: π0.5 reaches **25.0/35.0** on chip push and **15.0/30.0** on chip pull. Put-down/show has a larger completion-preservation gap, reaching **50.0/80.0** for both π0.5 and π0. Cards can be placed or revealed while still disturbing the scene enough to hurt continuation.

For agentic perception, **Opus 4.7** gives the best strict problem-level exact match at **34.3%**, while **GPT 5.5** gives the best average field-wise accuracy at **66.8%**. This split is important. Individual fields can be recognizable, yet full routing-relevant state recovery remains fragile because many fields must be right together. Blind information is nearly saturated, and turn ownership is high for several models, while current bet chips and opponent chip inventory are weak: the best CB score is **45.8%**, and the best OCI score is **43.8%**.

The three system-level case studies pair GPT 5.5 with the π0 dexterous policy. They are not presented as a statistically powered success-rate estimate. Their value is operational: the traces show repeated waiting, verification, continuation of multi-atom actions, recovery dispatches, and occasional human-help requests. One 23-state trajectory views both hole cards, raises, checks, calls a 200-chip bet, and reveals both cards, with about a third of states spent in the wait branch.

## RDT Fine-Tuning Diagnostic

The RDT data-scaling study is a useful caution against overreading pretraining. The authors compare random initialization with a gripper-pretrained RDT checkpoint under 10%, 20%, 50%, and 100% of the DexHoldem training split. At 10% data, pretrained initialization reduces validation loss by only **1.2%** relative to random initialization. The reductions grow to **9.0%**, **10.7%**, and **11.3%** at 20%, 50%, and 100%, but both curves follow similar scaling trends.

The interpretation is conservative: gripper-centric pretraining gives an optimization or initialization benefit once enough dexterous-hand data exists, without creating a qualitatively new low-data regime for this ShadowHand poker setting. That is a helpful result because it keeps the benchmark grounded in physical embodiment mismatch instead of assuming that large robot pretraining automatically transfers to dexterous card and chip manipulation.

## Limitations

DexHoldem is tightly scoped. The hardware, table layout, camera arrangement, cards, and chip denominations are fixed. The benchmark measures performance under a standardized real-world interface; cross-embodiment transfer and arbitrary-object dexterity are outside its claim. The dataset is also modest compared with modern pretrained robot-policy corpora. **1,470 demonstrations** are enough to define and compare the task suite, while large-scale policy scaling remains open.

The system-level evaluation is intentionally small because current components are still unreliable. The paper reports three closed-loop case studies instead of a large success-rate table. That is a limitation, but it is also a useful honesty boundary: once perception, routing, policy execution, verification, and recovery are composed on physical hardware, evaluation becomes expensive and errors compound quickly.

## Takeaways

DexHoldem's strongest idea is the **scene-preserving embodied benchmark**. It evaluates whether a policy leaves the world in a usable state, and whether an agent can keep enough structured memory to route the next action. For dexterous manipulation, that is closer to deployment than asking whether a hand can complete one primitive in isolation.

For embodied-agent research, the perception result is a warning. Field-wise scores can look passable while strict full-state recovery remains weak. Poker makes this visible because chip counts, bets, cards, turn markers, and loop stages must all agree before an action is legal and executable.

For robot-learning practice, the released policy code and dataset matter. The benchmark provides a concrete recipe for comparing pretrained VLA policies, diffusion policies, ACT-style policies, and RDT variants under a shared 30-dimensional ShadowHand-UR interface. The open question is how to reduce the cost of real-contact evaluation without losing the very property that makes DexHoldem useful: small physical disturbances matter.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**DexHoldem** 是一个围绕 Texas Hold'em 桌面交互构建的真实世界 dexterous embodied system benchmark。平台使用安装在 UR10e 机械臂上的 ShadowHand，policy 侧有三路 RealSense RGB-D 相机，system-level 状态解析则使用单独的 agent-view camera。benchmark 包含 **1,470 条 teleoperated demonstrations**，覆盖 **14 个卡牌和筹码操作 primitives**，并提供 physical policy benchmark、**36 个问题的 agentic perception benchmark**，以及三个闭环系统 case studies。

我的理解是：这篇文章有价值的地方在于，它把很多 embodied-agent demo 里容易被模糊处理的 full-stack 问题变成了可评测对象。机器人需要决定 call、raise、翻牌或收筹码，还要解析持续变化的桌面状态，把决策翻译成可执行的低层 primitives，用灵巧手操作很薄的扑克牌和很小的筹码，保持桌面可供下一步继续使用，并且在感知或执行略微出错时恢复。DexHoldem 把这些 failure surfaces 放到了同一个真实物理环境里。

## 论文与资源

论文标题是 **"DexHoldem: Playing Texas Hold'em with Dexterous Embodied System"**，作者包括 **Feng Chen, Tianzhe Chu, Li Sun, Pei Zhou, Zhuxiu Xu, Shenghua Gao, Yuexiang Zhai, Yanchao Yang, and Yi Ma**。论文地址是 [arXiv:2605.18727](https://arxiv.org/abs/2605.18727)，项目页是 [dexholdem.github.io/Dexholdem](https://dexholdem.github.io/Dexholdem/)。数据集发布在 [TexasPokerRobot](https://huggingface.co/datasets/Winniechen2002/TexasPokerRobot)，policy 代码在 [DexHoldem/Dexholdem-Policy](https://github.com/DexHoldem/Dexholdem-Policy)，embodied-agent runtime 在 [DexHoldem/DexHoldemSKills](https://github.com/DexHoldem/DexHoldemSKills)。

Policy 仓库围绕六个公开训练 recipe 组织：DP(DINO)、DP_transformer_resnet、DP_unet、ACT、RDT_small 和 RDT_FT。公开 pipeline 支持下载 Hugging Face 数据集、用每个 primitive 五条 validation trajectories 的方式整理数据、可选地预计算 DinoV2 或 SigLIP 视觉特征，并通过 ZeroMQ policy server 部署 checkpoint。Skills 仓库则把 agent loop 包装成 coding-agent-native workflow：安装 skill，启动 game loop，解析桌面，路由状态，再调度机器人 primitives。

## 为什么扑克适合做这个 Benchmark

这里的 Texas Hold'em 主要承担 benchmark 场景的角色：它提供一个语义状态和物理状态高度耦合的受控桌面环境。扑克牌很薄，筹码很小且有面额，下注会改变合法 action space，每一次物理动作都可能扰乱后续决策。机器人可能需要拿起左侧或右侧手牌、亮牌、把牌放回背面、推出 50 面额筹码、拉回 100 面额筹码，或者把多个 primitive 组合成一个高层 poker move。

这让 benchmark 超出了 isolated hand skills 的范畴。一个局部操作成功，如果移动了非目标卡牌、让筹码堆变得不可读，或者让下一步 agent 不能信任桌面状态，仍然可能是系统失败。因此 DexHoldem 用四级 outcome rubric 评估 primitive rollout：scene-preserving success、disruptive completion、可重试 task failure，以及必须 reset 的 disruptive failure。task completion 和 scene preservation 的区分，是这篇文章最关键的指标设计。

## Benchmark 结构

DexHoldem 把系统拆成两个层级。**Primitive level** 定义用于数据采集、policy training 和 physical rollout 的 callable dexterous skills。**Agent level** 定义当这些 primitives 被组合成一局扑克时出现的 perception、routing、verification、recovery 和 human-help 分支。

Policy benchmark 覆盖 14 个 instruction-conditioned primitives：

| Group | Primitives |
|---|---|
| Card pickup | `pick_up_left`, `pick_up_right` |
| Chip push | `push_5`, `push_10`, `push_50`, `push_100` |
| Chip pull | `pull_5`, `pull_10`, `pull_50`, `pull_100` |
| Card placement/reveal | `put_down_left`, `put_down_right`, `show_left`, `show_right` |

每个 primitive 有 **105 条 accepted teleoperated demonstrations**，拆分为 **100 条训练** 和 **5 条验证** trajectories。部署时，每个低层 policy 输入 top-down、third-person 和 wrist RGB-D observations，30 维 arm-hand proprioception，以及 task condition。action 是一段短时域的 30 维 joint-position targets：UR10e 机械臂 6 维，ShadowHand 24 维。

Agentic perception benchmark 单独评估视觉解析问题。36 个问题中的每一个，都要求 perceiver 根据真实桌面图像和 predecessor context 恢复 structured game state。schema 被拆成八个评分项：loop stage、turn ownership、blind information、community cards、current bet chips、robot chip inventory、opponent chip inventory 和 showdown outcome。重要细节是 overall correctness 是所有适用字段的 strict exact match，所以一个错误的筹码字典就足以让状态无法可靠路由。

## 闭环 Agent

Embodied loop 是 `capture -> perceive -> route -> execute`。专用 agent-view camera 拍摄桌面，perceiver 写出结构化状态，deterministic router 读取持久化 game-state memory、校验字段、处理等待、验证 primitive outcome、重试无害失败，并把不安全状态升级为 human help。Main agent 只在多个高层分支都合法时被调用，例如 idle 状态下需要做新的 poker decision。

高层 agent primitives 会被翻译成低层 policy primitives。例如 `view_card(L)` 会变成 `pick_up_left -> perceive -> put_down_left`，而 `call` 会根据 opponent bet 和 robot bet 的差值调度一串 chip-push primitives。筹码动作按照 100、50、10、5 的顺序做 min-count 分解，这样某个 atom 失败时可以单独重试，不必丢弃整个高层动作。

这个架构在合适的位置保持朴素。Router 承担不该每一帧都交给语言模型的 workflow constraints，learned policy 负责 contact-rich motion。最终得到的 benchmark 能在同一条物理轨迹里暴露 agent 感知错误、policy 执行错误、verification 延迟和 recovery 决策。

## 主要结果

在覆盖全部 14 个技能的 80-trial primitive schedule 上，**π0.5** 的 task completion rate 最高，为 **61.2%**。在更严格的 scene-preserving success rate 上，**π0.5** 和 **π0** 都是 **47.5%**。RDT 达到 **30.0% SPSR** 和 **46.2% TCR**；DP(DINO) 是最强的 task-specific imitation baseline，为 **26.2% SPSR** 和 **36.2% TCR**。更小或更简单的 baseline 明显更低：ACT 是 **10.0% SPSR**，BAKU 是 **6.2%**，DP-UNet 是 **1.2%**。

SPSR 和 TCR 之间的差距是最关键的信号。π0.5 在把 disruptive completions 计入后，从 **47.5%** 上升到 **61.2%**。RDT 从 **30.0%** 上升到 **46.2%**。这不是无关紧要的记分差异；它说明 policy 可以完成局部 primitive，同时破坏下一步 agent 所需的桌面状态。

Primitive-group breakdown 也很有信息量。π-series models 在 pickup 上达到 **100.0/100.0 SPSR/TCR**，但 chip motion 困难得多：π0.5 在 chip push 上是 **25.0/35.0**，chip pull 上是 **15.0/30.0**。Put-down/show 则体现了更大的 completion-preservation gap，π0.5 和 π0 都是 **50.0/80.0**。牌可以被放下或亮出，但仍然可能扰乱场景，从而影响后续。

Agentic perception 方面，**Opus 4.7** 的 strict problem-level exact match 最高，为 **34.3%**；**GPT 5.5** 的 average field-wise accuracy 最高，为 **66.8%**。这个分裂很重要。单个字段可以被识别出来，但 full routing-relevant state recovery 仍然很脆弱，因为很多字段必须同时正确。Blind information 几乎饱和，多个模型的 turn ownership 也很高；current bet chips 和 opponent chip inventory 则明显更弱：最好的 CB 是 **45.8%**，最好的 OCI 是 **43.8%**。

三个 system-level case studies 使用 GPT 5.5 搭配 π0 dexterous policy。作者没有把它们当成统计意义上的 success-rate estimate。它们的价值在于 operational trace：轨迹里会出现反复等待、验证、多 atom 动作的 continuation、recovery dispatch，以及偶发 human-help request。其中一条 23-state trajectory 先查看两张 hole cards，然后 raise、两次 check、call 一个 200-chip bet，最后 reveal 两张牌；大约三分之一状态都处在 wait branch。

## RDT Fine-Tuning Diagnostic

RDT data-scaling study 对过度解读 pretraining 很有提醒作用。作者比较 random initialization 和 gripper-pretrained RDT checkpoint，在 DexHoldem training split 的 10%、20%、50% 和 100% 上训练。10% data 时，pretrained initialization 相比 random initialization 只把 validation loss 降低 **1.2%**。20%、50% 和 100% 时降幅扩大到 **9.0%**、**10.7%** 和 **11.3%**，但两条曲线整体遵循相似的 scaling trend。

论文的解释很克制：gripper-centric pretraining 在有足够 dexterous-hand data 时提供 optimization 或 initialization benefit，同时没有为 ShadowHand poker 场景创造一个质变的 low-data regime。这个结果很有用，因为它把问题落回到具体 embodiment mismatch，避免默认大规模 robot pretraining 会自然迁移到灵巧手卡牌和筹码操作。

## 局限

DexHoldem 的范围很明确。硬件、桌面布局、相机配置、扑克牌和筹码面额都是固定的。benchmark 评估的是标准化真实世界接口下的性能，并不证明 cross-embodiment transfer 或 arbitrary-object dexterity。数据规模相对现代 pretrained robot-policy corpus 也偏小。**1,470 条 demonstrations** 足以定义和比较这组任务，但不足以回答大规模 policy scaling 的问题。

System-level evaluation 也刻意保持小规模，因为当前组件仍然不够可靠。论文报告三个闭环 case studies，没有给出大规模 success-rate table。这是局限，也是一个诚实边界：一旦把 perception、routing、policy execution、verification 和 recovery 组合到真实硬件上，评测成本会很高，错误会快速累积。

## Takeaways

DexHoldem 最强的思想是 **scene-preserving embodied benchmark**。它评估 policy 是否把世界留在可继续使用的状态里，也评估 agent 是否能保持足够结构化的记忆来路由下一步动作。对 dexterous manipulation 来说，这比单独问一只手能否完成某个 primitive 更接近部署。

对 embodied-agent research 来说，perception result 是一个警告。Field-wise scores 看起来可以接受时，strict full-state recovery 仍然可能很弱。扑克让这个问题变得清楚：chip counts、bets、cards、turn markers 和 loop stages 必须共同一致，一个动作才合法且可执行。

对 robot-learning practice 来说，公开 policy code 和 dataset 很重要。这个 benchmark 给出了一个具体 recipe，用统一的 30 维 ShadowHand-UR interface 比较 pretrained VLA policies、diffusion policies、ACT-style policies 和 RDT variants。接下来的问题是如何降低 real-contact evaluation 的成本，同时保留 DexHoldem 最有价值的属性：小的物理扰动也会影响系统。

</div>
