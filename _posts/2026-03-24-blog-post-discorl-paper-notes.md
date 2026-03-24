---
title: "[Paper Notes] Discovering state-of-the-art reinforcement learning algorithms"
date: 2026-03-24
permalink: /posts/2026/03/discorl-paper-notes/
tags:
  - Reinforcement Learning
  - Meta-Learning
  - RL Algorithms
  - Automated Discovery
  - DiscoRL
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DiscoRL** turns RL algorithm design itself into a meta-learning problem. Instead of hand-writing TD targets, policy losses, or auxiliary objectives, the paper learns a **meta-network that emits update targets** for an agent's policy and internal predictions.

This is not "meta-RL" in the usual fast-adaptation sense. The thing being meta-learned is the **learning rule itself**.

The headline result is strong:

- **Disco57** reaches **IQM 13.86 on Atari**, outperforming prior hand-designed RL rules on this benchmark
- The discovered rule also transfers to **unseen benchmarks** such as ProcGen, Crafter, and NetHack
- A broader discovery run, **Disco103**, gets even stronger by training on a more diverse set of environments

The big message is that **RL algorithm discovery can scale with environment diversity and compute**, much like model pretraining scales with data.

## Paper Info

- **Title**: Discovering state-of-the-art reinforcement learning algorithms
- **Authors**: Junhyuk Oh, Gregory Farquhar, Iurii Kemaev, Dan A. Calian, Matteo Hessel, Luisa Zintgraf, Satinder Singh, Hado van Hasselt, David Silver
- **Affiliation**: Google DeepMind
- **Venue**: *Nature*, Vol. 648, 11 December 2025 issue
- **Published online**: 2025-10-22
- **DOI**: [10.1038/s41586-025-09761-x](https://doi.org/10.1038/s41586-025-09761-x)
- **Code**: [google-deepmind/disco_rl](https://github.com/google-deepmind/disco_rl)

## 1. Motivation

Most RL progress still comes from humans inventing better update rules: TD learning, Q-learning, PPO, auxiliary losses, distributional targets, and so on. Previous "automatic discovery" work usually searched a much narrower space:

- tune a few hyperparameters
- learn a scalar objective
- meta-train in toy environments

This paper asks a more ambitious question:

> Can we directly discover the RL rule that updates the agent, using only the cumulative experience of many agents interacting with complex environments?

That framing is what makes the paper interesting. It is not just learning a better policy. It is trying to learn **how policies and predictions should be learned**.

## 2. Core Idea

### 2.1 Agent outputs

The agent produces more than a policy:

- a policy `\pi(s)`
- an observation-conditioned prediction vector `y(s)`
- an action-conditioned prediction vector `z(s, a)`
- an action-value head `q(s, a)`
- an auxiliary policy prediction `p(s, a)`

The important part is that `y` and `z` do **not** have predefined semantics. They are slots in which the meta-learning process can invent useful internal predictions.

### 2.2 Meta-network as the discovered RL rule

A backward LSTM-based **meta-network** reads short trajectory segments containing:

- agent outputs over time
- rewards
- episode termination signals

It then emits targets for the current policy and predictions:

- `\hat{\pi}`
- `\hat{y}`
- `\hat{z}`

The agent is updated to move toward those targets. In simplified form:

$$
\mathcal{L}_{\theta}
=
\mathbb{E}\left[
D(\hat{\pi}, \pi_{\theta})
+ D(\hat{y}, y_{\theta})
+ D(\hat{z}, z_{\theta})
+ \mathcal{L}_{\text{aux}}
\right]
$$

where the paper uses KL-style distances and auxiliary targets for the value and auxiliary-policy heads.

### 2.3 Why this is more expressive than tuning a loss scalar

The meta-network outputs **targets**, not just one scalar loss. That matters because it naturally includes:

- **bootstrapping** from future predictions
- **joint policy-and-prediction updates**
- the possibility of inventing new prediction semantics beyond value functions

The authors argue this search space is strictly more expressive than only meta-learning a scalar objective.

### 2.4 Meta-optimization

The meta-parameters `\eta` are improved so that agents trained under the discovered rule get higher return:

$$
\nabla_{\eta} J(\eta)
\approx
\mathbb{E}\left[
(\nabla_{\eta} \theta)(\nabla_{\theta} J(\theta))
\right]
$$

In practice, they backpropagate through a window of agent updates and use a large population of agents across many environments. This is what lets the "algorithm designer" receive gradient signal from actual downstream learning performance.

## 3. What DiscoRL Seems to Discover

One of the most interesting parts of the paper is that the discovered predictions are **not just hidden value functions with different names**.

The analysis suggests:

- the discovered predictions often spike **before salient events**, such as large rewards
- they encode information about **future policy entropy**
- they attend to observation regions that are different from what the policy or value function focuses on
- future predictions strongly affect current targets, showing an **emergent bootstrapping mechanism**

The takeaway is that DiscoRL seems to invent internal predictive signals that **complement** the usual policy/value decomposition rather than simply rediscovering it.

## 4. Main Empirical Results

### 4.1 Atari

The strongest single claim is on Atari:

- **Disco57** is discovered from the 57 Atari games themselves
- it reaches **IQM 13.86**
- it outperforms prior published hand-designed RL rules on Atari, including strong model-based and actor-critic baselines

The paper also emphasizes improved wall-clock efficiency relative to MuZero in this setting.

### 4.2 Generalization to unseen benchmarks

Even though Disco57 is discovered on Atari, it transfers to environments it never saw during discovery:

- **ProcGen**: beats existing published methods in the paper's comparison
- **Crafter**: competitive performance
- **NetHack Challenge**: reaches **third place** on the NeurIPS 2021 challenge leaderboard without domain-specific shaping or handcrafted subtasks

This is one of the paper's most convincing results. A discovered rule is only interesting if it generalizes beyond the exact benchmarks used to create it.

### 4.3 More diverse discovery environments help

The second discovered rule, **Disco103**, uses a broader discovery set:

- Atari
- ProcGen
- DMLab-30

Compared with Disco57, it achieves:

- similar Atari performance
- better scores on every other seen and unseen benchmark reported in the main figure
- **human-level performance on Crafter**
- near-MuZero state-of-the-art performance on **Sokoban**

This supports the paper's key scaling claim: **stronger and more diverse discovery environments produce a better RL rule**.

### 4.4 Discovery efficiency and compute

The paper frames discovery as surprisingly efficient relative to manual algorithm design:

- the best Atari rule emerges within roughly **600 million steps per game**
- this is about **three full experiments per Atari game**

But the absolute compute is still large:

- **Disco57**: 128 agents, **1,024 TPUv3 cores for 64 hours**
- **Disco103**: 206 agents, **2,048 TPUv3 cores for 60 hours**

So the story is not "cheap discovery". It is "expensive, but now plausibly worth scaling".

## 5. Why the Paper Matters

- **It expands the discovery space** beyond hyperparameter tuning or minor loss shaping
- **It shows real benchmark competitiveness**, not just toy-environment meta-learning
- **It provides evidence for novel internal predictions**, which is more interesting than merely matching known RL rules
- **It turns algorithm design into a scaling problem** over environments and compute

For me, that last point is the most important. The paper suggests that at least part of RL algorithm research may become a systems-and-scaling problem, not only a human-theory problem.

## 6. Limitations and Open Questions

- **Very high discovery cost**: the method is still far from cheap or easy to reproduce
- **Handcrafted scaffolding remains**: the agent architecture, auxiliary heads, KL-style update form, and meta-optimization recipe are all still designed by humans
- **Benchmark domain bias**: the strongest evidence is on discrete-action game-like environments; the paper does not yet prove the same effect for continuous control or robotics
- **Interpretability remains partial**: we know the discovered predictions matter, but we still do not have a clean semantic theory for what each learned signal represents
- **Commercial framing**: the paper notes pending patent applications and Google ownership, which is worth keeping in mind for long-term openness

## 7. Takeaways

1. **Learning rules themselves are now viable targets for scaling.** This paper makes RL algorithm discovery feel more like pretraining than like manual feature engineering.
2. **Searching over target-generating update rules is powerful.** It is richer than tuning coefficients on a fixed PPO-style or TD-style loss.
3. **Complex discovery environments matter.** Toy meta-training is not enough if the goal is to invent algorithms that work in hard settings.
4. **New predictive semantics may be a core ingredient of stronger RL.** DiscoRL's hidden predictions seem to carry information that standard policy/value heads miss.
5. **This is a milestone, not the endpoint.** The paper shows that machine-discovered RL rules can beat strong human-designed baselines, but it does not yet mean human algorithm design is obsolete.

## References

- [Paper] [Nature DOI: 10.1038/s41586-025-09761-x](https://doi.org/10.1038/s41586-025-09761-x)
- [Code] [github.com/google-deepmind/disco_rl](https://github.com/google-deepmind/disco_rl)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**DiscoRL** 把 RL 算法设计本身变成了一个元学习问题。论文不是去手写 TD target、policy loss 或 auxiliary objective，而是学习一个**会输出更新目标的元网络**，让它来决定 agent 的策略和内部预测该如何更新。

这不是通常意义上那种“快速适应任务”的 meta-RL。这里被元学习的是**学习规则本身**。

论文的主结论很强：

- **Disco57** 在 Atari 上达到 **IQM 13.86**，超过此前的人类手工设计 RL 规则
- 学到的规则还能迁移到**未见过的 benchmark**，例如 ProcGen、Crafter 和 NetHack
- 当 discovery 阶段使用更丰富的环境集合时，得到的 **Disco103** 进一步变强

最重要的信息是：**RL 算法发现这件事本身开始呈现出“随着环境多样性和算力而扩展”的特征**。

## 论文信息

- **标题**: Discovering state-of-the-art reinforcement learning algorithms
- **作者**: Junhyuk Oh, Gregory Farquhar, Iurii Kemaev, Dan A. Calian, Matteo Hessel, Luisa Zintgraf, Satinder Singh, Hado van Hasselt, David Silver
- **机构**: Google DeepMind
- **期刊**: *Nature*，Vol. 648，2025-12-11 期
- **在线发表**: 2025-10-22
- **DOI**: [10.1038/s41586-025-09761-x](https://doi.org/10.1038/s41586-025-09761-x)
- **代码**: [google-deepmind/disco_rl](https://github.com/google-deepmind/disco_rl)

## 1. 动机

大多数 RL 的进展仍然依赖人类去发明更好的更新规则，例如 TD learning、Q-learning、PPO、各种 auxiliary loss 和 distributional target。此前的“自动发现算法”工作，通常只在更窄的空间里搜索：

- 调少量超参数
- 学一个标量目标函数
- 只在玩具环境里做元训练

这篇论文问了一个更大胆的问题：

> 我们能不能直接从大量 agent 在复杂环境中的交互经验里，自动发现更新 agent 的 RL 规则？

这也是论文真正有意思的地方。它不是只想学一个更好的 policy，而是想学**policy 和 prediction 应该如何被学习**。

## 2. 核心方法

### 2.1 Agent 会输出什么

这个 agent 不只输出 policy，还会输出：

- 一个策略 `\pi(s)`
- 一个 observation-conditioned prediction `y(s)`
- 一个 action-conditioned prediction `z(s, a)`
- 一个 action-value head `q(s, a)`
- 一个 auxiliary policy prediction `p(s, a)`

关键在于 `y` 和 `z` **没有预先定义语义**。它们是留给元学习过程去“发明”的内部预测槽位。

### 2.2 把 meta-network 当成被发现的 RL rule

论文用一个基于 backward LSTM 的 **meta-network** 读取短轨迹片段，输入包括：

- 不同时间步上的 agent 输出
- reward
- episode termination signal

然后它输出当前时刻 policy 和 prediction 的目标：

- `\hat{\pi}`
- `\hat{y}`
- `\hat{z}`

随后 agent 朝这些目标更新。简化写法如下：

$$
\mathcal{L}_{\theta}
=
\mathbb{E}\left[
D(\hat{\pi}, \pi_{\theta})
+ D(\hat{y}, y_{\theta})
+ D(\hat{z}, z_{\theta})
+ \mathcal{L}_{\text{aux}}
\right]
$$

其中论文使用的是 KL 风格的距离，同时对 value head 和 auxiliary-policy head 还加入了额外目标。

### 2.3 为什么“输出 target”比“学一个标量 loss”更强

meta-network 输出的是**目标**，而不只是一个标量 loss。这一点很重要，因为它天然包含了：

- 从未来预测中进行 **bootstrapping**
- **联合更新 policy 与 prediction**
- 发明超出 value function 语义的新型内部预测

作者认为，这个搜索空间严格强于只元学习一个标量目标函数。

### 2.4 Meta-optimization

meta-parameter `\eta` 的优化目标，是让在该规则下训练出来的 agent 拿到更高回报：

$$
\nabla_{\eta} J(\eta)
\approx
\mathbb{E}\left[
(\nabla_{\eta} \theta)(\nabla_{\theta} J(\theta))
\right]
$$

在实现上，论文会对一段 agent update 过程做反向传播，并在大量环境上的 agent population 上并行进行。这使得“算法设计者”真正能从下游学习效果中获得梯度信号。

## 3. DiscoRL 到底学到了什么

论文里最有意思的一点，是这些被发现的 prediction **并不只是换了名字的 value function**。

分析表明：

- 这些 prediction 往往会在**重要事件发生之前**出现尖峰，例如大 reward 到来之前
- 它们包含关于**未来 policy entropy** 的信息
- 它们关注的 observation 区域与 policy/value 关注的位置并不相同
- 未来 prediction 的扰动会显著影响当前 target，说明出现了**自发形成的 bootstrapping 机制**

也就是说，DiscoRL 学到的内部信号更像是在补充传统的 policy/value 分解，而不只是简单复现它。

## 4. 主要实验结果

### 4.1 Atari

论文最强的单点结论来自 Atari：

- **Disco57** 是直接在 57 个 Atari 游戏上发现出来的
- 它达到 **IQM 13.86**
- 在 Atari 上超过了此前公开发表的人类手工设计 RL 规则，包括强力的 model-based 和 actor-critic baseline

论文还特别强调，在这个设定下它相对于 MuZero 有更好的 wall-clock efficiency。

### 4.2 对未见 benchmark 的泛化

虽然 Disco57 只在 Atari 上被发现，但它可以迁移到 discovery 过程中从未见过的环境：

- **ProcGen**: 在论文比较中超过已有公开方法
- **Crafter**: 表现有竞争力
- **NetHack Challenge**: 在 NeurIPS 2021 challenge leaderboard 上拿到**第三名**，而且没有使用 domain-specific shaping 或手工子任务

这是论文最有说服力的结果之一。一个被“发现”的规则，只有在超出原始发现环境时还能工作，才真正值得关注。

### 4.3 更丰富的 discovery 环境会带来更强的规则

第二个规则 **Disco103** 在更大的 discovery 集上训练：

- Atari
- ProcGen
- DMLab-30

与 Disco57 相比，它实现了：

- Atari 上大体相近的性能
- 主图中其余 seen/unseen benchmark 上全部更高的分数
- 在 **Crafter** 上达到**人类水平**
- 在 **Sokoban** 上逼近 MuZero 的 state-of-the-art 表现

这直接支持了论文的核心 scaling 结论：**discovery 阶段环境越复杂、越多样，学到的 RL rule 就越强**。

### 4.4 Discovery 效率与算力

论文认为，相比人工发明算法，自动发现的效率已经开始变得有吸引力：

- 最好的 Atari 规则大约在每个游戏 **6 亿步**左右就会出现
- 这大致相当于每个 Atari 游戏只做 **3 次完整实验**

但绝对算力依然非常大：

- **Disco57**: 128 个 agents，使用 **1,024 个 TPUv3 核心，64 小时**
- **Disco103**: 206 个 agents，使用 **2,048 个 TPUv3 核心，60 小时**

所以这篇论文讲述的不是“便宜的自动发现”，而是“虽然昂贵，但已经开始值得继续 scale 的自动发现”。

## 5. 这篇论文为什么重要

- **它把搜索空间大幅扩展了**，不再只是调超参数或微调 loss
- **它在真实 benchmark 上给出了有分量的结果**，而不是停留在 toy environment
- **它提供了新型内部 prediction 的证据**，这比单纯复现已有 RL 规则更有意义
- **它把算法设计转化成了一个可随环境和算力扩展的问题**

对我来说，最后这一点最关键。它暗示 RL 算法研究未来可能不再只是“人类想公式”，也会越来越像一个“系统 + 规模化搜索”的问题。

## 6. 局限与开放问题

- **discovery 成本非常高**：目前仍然不便宜，也不容易复现
- **仍然有大量人工脚手架**：agent architecture、auxiliary heads、KL 风格更新形式以及 meta-optimization recipe 仍然是人类手工设计的
- **benchmark 偏置明显**：最强证据主要来自离散动作、游戏风格环境，还没有证明同样结论会自动延伸到 continuous control 或 robotics
- **可解释性仍然有限**：我们知道这些 discovered predictions 很重要，但还没有一个干净的语义理论去解释每个信号到底代表什么
- **商业化因素需要注意**：论文明确提到有相关专利申请和 Google 的所有权

## 7. 我的收获

1. **学习规则本身已经可以成为 scale 的对象。** 这篇论文让 RL algorithm discovery 更像 pretraining，而不只是人工 feature engineering。
2. **搜索“生成 target 的更新规则”非常强。** 它比在固定 PPO 或 TD loss 上调系数更有表达力。
3. **复杂 discovery 环境是必要条件。** 如果目标是发明能在困难任务里工作的算法，toy meta-training 远远不够。
4. **新的 prediction 语义可能是更强 RL 的关键组成。** DiscoRL 的隐藏 prediction 似乎携带了 standard policy/value head 捕捉不到的信息。
5. **这是一个里程碑，但不是终点。** 论文证明机器发现的 RL rule 可以超过强的人类 baseline，但还没有到“人类算法设计不再重要”的阶段。

## References

- [论文] [Nature DOI: 10.1038/s41586-025-09761-x](https://doi.org/10.1038/s41586-025-09761-x)
- [代码] [github.com/google-deepmind/disco_rl](https://github.com/google-deepmind/disco_rl)

</div>
