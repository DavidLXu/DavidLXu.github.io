---
title: "[Paper Notes] Reward Prediction with Factorized World States"
date: 2026-03-14
permalink: /posts/2026/03/statefactory-paper-notes/
tags:
  - LLM Agents
  - World Models
  - Reward Modeling
  - Planning
  - State Representation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

This paper asks a very practical question for planning agents:

**Can we predict useful rewards in a zero-shot way without training a task-specific reward model, simply by building a better state representation?**

The answer proposed here is **StateFactory**, a method that factorizes text observations into **hierarchical object-attribute world states**, then predicts reward as the semantic similarity between the current state and a dynamically interpreted goal state.

The paper contributes both:

- a new benchmark, **RewardPrediction**, with **2,454** trajectories across **five domains**
- a zero-shot reward prediction framework that beats strong baselines

The headline numbers are:

- **60%** lower EPIC distance than **VLWM-critic**
- **8%** lower EPIC distance than **LLM-as-a-Judge**
- planning gains of **+21.64%** on **AlfWorld**
- planning gains of **+12.40%** on **ScienceWorld**

My short read is that the paper's strongest idea is simple: **reward quality is largely a state-representation problem**.

## Paper Info

- **Title**: Reward Prediction with Factorized World States
- **Authors**: Yijun Shen, Delong Chen, Xianming Hu, Jiaming Mi, Hongbo Zhao, Kai Zhang, Pascale Fung
- **Affiliations**: East China Normal University, HKUST
- **arXiv**: [2603.09400](https://arxiv.org/abs/2603.09400)
- **Project page**: [statefactory.github.io](https://statefactory.github.io)
- **Paper type**: agent planning / reward prediction / world-state representation

## 1. Problem and Motivation

Planning agents need more than just next-state prediction. They also need to know:

- whether a predicted state is closer to the goal
- how much progress an action makes
- which branch of a plan is more promising

The usual fix is to train a supervised reward model. But the paper points out a real problem:

- supervised reward models can overfit to training domains
- reward labels can encode dataset-specific biases
- generalization to new goals and environments can collapse

So the paper explores a different route:

- do not train a domain-specific reward predictor
- instead, build a structured state representation
- estimate reward by measuring distance between current state and goal state

This is a good framing because it shifts the problem from "how do I fit a scalar critic?" to "how do I represent world state so that semantic distance actually reflects task progress?"

## 2. The RewardPrediction Benchmark

One of the paper's strongest contributions is the benchmark itself.

**RewardPrediction** contains:

- **2,454** unique trajectories
- step-wise actions, observations, and ground-truth rewards
- five interactive domains

The five domains are:

- **AlfWorld**
- **ScienceWorld**
- **TextWorld**
- **WebShop**
- **BlocksWorld**

This mix is useful because it spans:

- embodied planning
- scientific reasoning
- text-adventure procedural tasks
- web navigation
- classical symbolic planning

### 2.1 Why this benchmark matters

Most prior setups evaluate sparse end success or domain-specific reward quality. This benchmark instead focuses on **step-wise progress estimation**, which is much closer to what a planner actually needs.

The evaluation metric is **EPIC distance**, which compares predicted reward sequences against ground-truth reward sequences. Lower is better.

I think this is the right choice for the paper's claim, because the goal is not only to know who wins at the end, but whether the model's reward landscape is actually aligned with task progress.

### 2.2 Benchmark construction

The data construction is also thoughtful.

Each task instance includes:

- a **positive trajectory**
- a **negative trajectory**

Positive trajectories come from expert demonstrations and are densified with interpolated progress rewards. Negative trajectories come from random policies and are filtered to avoid accidental overlap with expert behavior.

That design makes it harder for a method to game the benchmark with shallow heuristics such as trajectory length or generic optimism.

## 3. StateFactory

The core method is **StateFactory**, a representation-based reward predictor.

Instead of regressing reward directly from raw text history, it decomposes the process into:

1. **state extraction**
2. **goal interpretation**
3. **hierarchical routing**

The final reward is computed as semantic similarity between the extracted current state and the interpreted goal state.

## 4. Method Breakdown

### 4.1 State extraction

StateFactory converts each observation into a structured state:

- a set of objects
- each object paired with attributes and values

The paper writes each object as an identity plus attribute-value pairs, such as:

- object identity: `Mug`
- attribute: `location`
- value: `on the table`

This is a stronger abstraction than:

- raw observation text, which is noisy
- plain object-centric state, which often entangles multiple properties together

The state extraction is also **recurrent** and **goal-conditioned**. It uses:

- current observation
- previous state
- previous action
- previous goal interpretation
- original goal text

That matters because state tracking in long-horizon tasks is not just parsing a snapshot. It is updating a belief over evolving world state.

### 4.2 Goal interpretation

The paper argues that static goal representations can create an **illusion of progress** because they do not adapt to changes during execution.

So StateFactory treats goal interpretation as a dynamic process:

- start from the language goal
- repeatedly refine its grounded meaning using current state and trajectory context

This is an important design choice. In practical planning, the operational meaning of a goal often becomes clearer as the agent interacts with the environment.

### 4.3 Hierarchical routing

This is the mechanism that turns structured states into rewards.

For each goal object, the method:

1. finds the best matching object in the current state
2. checks identity similarity
3. checks attribute-value similarity
4. aggregates these scores into local progress
5. averages over all goal objects to get global reward

The matching is hierarchical:

- first align the right object
- then align the right attributes
- then measure how close the values are

This is much more interpretable than asking an LLM to emit a reward directly.

## 5. Main Results on RewardPrediction

Table 1 is the key result.

### 5.1 Zero-shot comparison

Overall EPIC distance:

- **VLWM-critic**: `0.738`
- **LLM-as-a-Judge` (best listed)`**: `0.322`
- **StateFactory**: `0.297`

So StateFactory improves substantially over the zero-shot baselines, especially against VLWM-critic.

The abstract summarizes this as:

- **60%** lower EPIC distance than VLWM-critic
- **8%** lower EPIC distance than LLM-as-a-Judge

Those numbers match the main takeaway: explicit structured state helps reward generalization.

### 5.2 Comparison to supervised reward models

The supervised models are especially interesting because they expose the generalization gap.

When trained on a single domain, they do very well in-domain, but their error rises sharply on unseen domains. The paper reports an average **138%** increase in error when transferring out of domain.

That is probably the most important result in the paper besides StateFactory itself:

**supervised reward modeling is powerful in-domain, but brittle for cross-domain zero-shot planning.**

### 5.3 Nearing the supervised upper bound

A particularly strong result is that StateFactory's zero-shot performance gets close to the supervised model trained on **all domains**.

That does not mean supervision is useless. It means that for this task, a strong structured representation can recover a large fraction of what supervised critics were learning.

## 6. Ablations

The ablations are well aligned with the paper's claim.

### 6.1 Representation granularity matters

Figure 5(a) shows a clear progression:

- raw observations are worst
- plain textual states are better
- object-centric states are better still
- full **object-attribute factorization** is best

The argument is convincing:

- raw observations contain too much distractor text
- object-only states still entangle attributes
- object-attribute factorization separates the parts of state that actually change during task progress

### 6.2 Dynamic goal interpretation is close to oracle

The online goal interpretation performs only slightly worse than an offline oracle goal-state setup, with about a **0.02** EPIC gap according to the paper.

That is a strong sign that the dynamic goal grounding mechanism is not the main bottleneck.

### 6.3 Better reasoning models help

The paper also shows that stronger LLM backbones and "thinking" modes improve factorization quality. This is a good sign for scalability: the method should benefit as reasoning models improve.

### 6.4 Embedding quality matters

StateFactory depends on semantic embeddings to measure similarity. The paper shows a strong correlation between triplet-based embedding accuracy and final reward performance.

That is useful because it clarifies where future gains may come from:

- better factorization
- better semantic alignment models

## 7. Utility for Planning

The reward model is only interesting if it actually helps planning.

### 7.1 ReAct + StateFactory

The paper augments ReAct with StateFactory-based reward scoring and reports:

- **AlfWorld**: `34.33 -> 55.97`
- **BlocksWorld**: `85.00 -> 93.00`
- **ScienceWorld**: `22.63 -> 35.03`

These are large gains, especially on AlfWorld and ScienceWorld.

This is important because it shows the benchmark result is not merely cosmetic. The reward signal is actually useful for action selection.

### 7.2 System-2 planning

The paper also integrates StateFactory into a system-2 planning setup with:

- LLM action proposals
- a world model
- Monte Carlo Tree Search

The qualitative analysis suggests that StateFactory serves as a structured heuristic, helping search avoid dead ends and making reward increases more grounded in state evidence.

## 8. Why This Paper Is Interesting

I think the paper is valuable for three reasons.

### 8.1 It reframes reward prediction

Rather than treating reward modeling as a scalar regression problem, it treats it as a **world-state representation problem**. That is a cleaner and more general framing.

### 8.2 It contributes a useful benchmark

RewardPrediction is not only another dataset. It provides a way to evaluate **step-wise reward quality across domains**, which is still missing in many agent papers.

### 8.3 It connects representation quality to planning quality

The paper does not stop at EPIC scores. It closes the loop by showing that better reward estimates actually improve agent success rates.

## 9. Limitations

A few limitations are worth keeping in mind.

- The method relies on strong LLM-based state extraction and goal interpretation, so quality depends on those components.
- The environments are text-based or text-grounded; extension to richer visual real-world settings is plausible but not directly demonstrated here.
- Semantic similarity is powerful, but it may still miss deeper causal or irreversible task structure in some domains.
- The benchmark is diverse, but still limited to five domains and offline trajectories.

## 10. Takeaways

My main takeaway is:

**StateFactory shows that if you can factorize world state into the right semantic units, reward prediction becomes much more generalizable.**

More broadly, the paper suggests a practical recipe for planning agents:

- predict or track explicit world state
- represent state as objects plus attributes
- interpret goals dynamically rather than once
- derive reward from semantic alignment instead of only learned scalar heads

For LLM agents, that feels like a productive direction. Instead of asking a model to "judge progress" directly, we can first make the state legible and then let reward emerge from structure.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

这篇论文讨论了一个对规划型 agent 很关键的问题：

**如果不训练任务专用的 reward model，只靠更好的状态表示，能不能在 zero-shot 条件下预测出足够有用的 reward？**

作者给出的答案是 **StateFactory**。它先把文本观测分解为**层次化的 object-attribute world state**，再把 reward 定义为“当前状态”和“动态解释后的目标状态”之间的语义相似度。

论文同时贡献了：

- 一个新的 benchmark：**RewardPrediction**
- 一个 zero-shot reward prediction 框架：**StateFactory**

核心结果包括：

- 相比 **VLWM-critic**，EPIC distance 降低 **60%**
- 相比 **LLM-as-a-Judge**，EPIC distance 降低 **8%**
- 在 **AlfWorld** 上的规划成功率提升 **+21.64%**
- 在 **ScienceWorld** 上的规划成功率提升 **+12.40%**

我对这篇论文的简短判断是：

**reward 预测的核心问题，很大程度上其实是状态表示问题。**

## 论文信息

- **标题**: Reward Prediction with Factorized World States
- **作者**: Yijun Shen, Delong Chen, Xianming Hu, Jiaming Mi, Hongbo Zhao, Kai Zhang, Pascale Fung
- **机构**: East China Normal University, HKUST
- **arXiv**: [2603.09400](https://arxiv.org/abs/2603.09400)
- **项目主页**: [statefactory.github.io](https://statefactory.github.io)
- **论文类型**: agent planning / reward prediction / 状态表示

## 1. 问题与动机

一个规划 agent 不只需要预测下一步状态，它还需要知道：

- 当前状态离目标还有多远
- 某个动作是否真的带来了进展
- 哪条规划分支更值得继续搜索

最常见的方法是直接训练一个 supervised reward model。但论文指出了一个很现实的问题：

- 监督式 reward model 容易过拟合训练域
- reward 标签本身可能带入数据偏差
- 一旦换到新任务或新环境，泛化就会迅速变差

所以作者选择了另一条路：

- 不直接训练域专用 reward predictor
- 而是先构造结构化 world state
- 再通过“当前状态”和“目标状态”的距离来定义 reward

我认为这是很好的问题重述：它把问题从“如何拟合一个标量 critic”转成了“如何构造一个让语义距离真正对应任务进展的状态空间”。

## 2. RewardPrediction Benchmark

这篇论文非常强的一点，是它自己先把 benchmark 搭起来了。

**RewardPrediction** 包含：

- **2,454** 条独特轨迹
- 每一步都有 action、observation 和 ground-truth reward
- 覆盖 **5 个不同领域**

这五个领域分别是：

- **AlfWorld**
- **ScienceWorld**
- **TextWorld**
- **WebShop**
- **BlocksWorld**

这种组合很有价值，因为它同时覆盖了：

- 具身规划
- 科学实验推理
- 文本冒险类程序性任务
- 网页导航
- 经典符号规划

### 2.1 为什么这个 benchmark 有意义

很多已有工作只看最终是否成功，或者只评估某一类 domain 内的 reward 质量。这个 benchmark 关注的是**step-wise progress estimation**，这其实更接近规划器真正需要的信号。

论文采用 **EPIC distance** 来比较预测 reward 序列与真实 reward 序列。数值越低越好。

我认为这个指标选得很对，因为论文想回答的不是“最后会不会成功”，而是“这个 reward landscape 是否真的和任务进展对齐”。

### 2.2 Benchmark 构建方式

数据构建本身也很认真。

每个任务实例都包含：

- 一条 **positive trajectory**
- 一条 **negative trajectory**

正样本来自 expert trajectory，并通过插值方式 densify 成分步 reward。负样本来自随机策略，并会过滤掉意外和 expert 重合的情况。

这种设计可以有效减少一些浅层启发式作弊，例如只看轨迹长度、或一味对后期状态给更高分。

## 3. StateFactory

论文的核心方法是 **StateFactory**，它属于一种 representation-based reward predictor。

它不是直接从原始文本历史回归 reward，而是把问题拆成三层：

1. **state extraction**
2. **goal interpretation**
3. **hierarchical routing**

最后的 reward 由“当前状态”和“目标状态”之间的语义相似度得到。

## 4. 方法拆解

### 4.1 State extraction

StateFactory 会把每一时刻的观测变成结构化状态：

- 一组 object
- 每个 object 再带上一组 attribute-value

论文中每个 object 可以理解为：

- object identity，例如 `Mug`
- attribute，例如 `location`
- value，例如 `on the table`

这种抽象明显强于：

- 原始 observation 文本，因为噪声太多
- 只有 object 的状态，因为很多关键变化其实发生在属性上

更重要的是，这里的 state extraction 是**递归的、goal-conditioned 的**。它会结合：

- 当前 observation
- 上一时刻 state
- 上一时刻 action
- 上一时刻 goal interpretation
- 初始 goal 文本

这很关键，因为长时程任务里的 world state 跟踪，本来就不是一次性的 snapshot 解析，而是持续更新 belief state。

### 4.2 Goal interpretation

论文指出，静态 goal representation 容易造成一种 **illusion of progress**：因为目标本身不会随着执行上下文更新，系统可能会错误地高估当前进展。

所以 StateFactory 把 goal interpretation 也做成了动态过程：

- 从语言目标开始
- 随着当前状态和执行历史不断调整目标在状态空间中的具体含义

这个设计很重要，因为在真实规划中，goal 的可操作语义往往是在交互过程中逐渐明确的。

### 4.3 Hierarchical routing

这是把结构化状态转成 reward 的关键模块。

对每个 goal object，StateFactory 会：

1. 在当前 state 中找最匹配的 object
2. 检查 identity 是否匹配
3. 检查 attribute-value 是否匹配
4. 得到局部进展分数
5. 对所有 goal object 做聚合，得到全局 reward

这个匹配是分层进行的：

- 先找对 object
- 再找对 attribute
- 最后比较 value

这比让一个 LLM 直接输出 reward 要可解释得多。

## 5. RewardPrediction 上的主结果

Table 1 是最核心的结果。

### 5.1 Zero-shot 比较

整体 EPIC distance 为：

- **VLWM-critic**: `0.738`
- **LLM-as-a-Judge`（表中最佳）`**: `0.322`
- **StateFactory**: `0.297`

也就是说，StateFactory 明显优于 zero-shot 基线，尤其是相较于 VLWM-critic。

摘要里将这一点总结为：

- 相比 VLWM-critic，EPIC distance 降低 **60%**
- 相比 LLM-as-a-Judge，EPIC distance 降低 **8%**

这与论文的主结论一致：显式结构化状态能够显著改善 reward 泛化。

### 5.2 和 supervised reward model 的比较

监督式模型的结果其实很能说明问题。

它们在训练域内表现很好，但一旦换到未见 domain，误差就迅速变大。论文报告这种 out-of-domain 转移下，平均误差上升了 **138%**。

我认为这是整篇论文除 StateFactory 本身之外最重要的发现之一：

**监督式 reward model 虽然在域内强，但在跨域 zero-shot 规划上非常脆弱。**

### 5.3 接近 supervised upper bound

一个很强的结果是：StateFactory 这种 zero-shot 方法，已经接近“使用所有 domain 监督训练”的 reward model 上界。

这并不意味着 supervision 没用，而是说明对于 reward prediction 这件事，好的结构化表示本身就能恢复出相当大的一部分监督模型能力。

## 6. 消融实验

这些消融和论文主张非常一致。

### 6.1 表示粒度确实重要

Figure 5(a) 展示出非常清晰的趋势：

- 原始 observation 最差
- textual state 更好
- object-centric state 更进一步
- 完整 **object-attribute factorization** 最好

这个结论是很有说服力的：

- 原始 observation 有太多无关文本
- 只有 object 的状态仍然会把多个属性缠在一起
- object-attribute factorization 才真正把“状态变化”拆成了任务进展所需要的最小语义单元

### 6.2 动态目标解释接近 oracle

在线 goal interpretation 和离线 oracle goal state 之间只差大约 **0.02** 的 EPIC distance。

这说明动态 goal grounding 本身已经非常稳定，不是当前主要瓶颈。

### 6.3 更强的 reasoning model 会继续带来收益

论文还表明，拥有更强推理能力的 LLM backbone，以及开启 thinking 模式后，StateFactory 会表现得更好。

这意味着方法具备不错的可扩展性：随着 reasoning model 变强，StateFactory 也会继续受益。

### 6.4 embedding 质量也很关键

StateFactory 依赖 embedding 模型来计算语义相似度。论文展示了 triplet-based embedding accuracy 与最终 reward 质量之间有很强相关性。

这说明未来提升主要可能来自两个方向：

- 更好的 factorization
- 更强的语义对齐 embedding

## 7. 对规划的实际帮助

一个 reward model 只有真的改善规划，才算有意义。

### 7.1 ReAct + StateFactory

论文把 StateFactory 的 reward signal 接入 ReAct 后，成功率变成：

- **AlfWorld**: `34.33 -> 55.97`
- **BlocksWorld**: `85.00 -> 93.00`
- **ScienceWorld**: `22.63 -> 35.03`

尤其在 AlfWorld 和 ScienceWorld 上提升非常明显。

这说明 benchmark 上的 reward 质量提升不是“纸面指标”，而是真正能帮助动作选择。

### 7.2 System-2 planning

论文还将 StateFactory 接入到包含以下组件的 system-2 规划框架中：

- LLM action proposal
- world model
- Monte Carlo Tree Search

论文中的定性分析表明，StateFactory 可以作为结构化 heuristic，帮助搜索摆脱死胡同，并让 reward 的上升更加扎根于状态证据，而不是语言模型的主观臆测。

## 8. 为什么这篇论文值得看

我认为它有三个特别有价值的点。

### 8.1 它重新定义了 reward prediction 的重点

这篇论文并没有把 reward modeling 看成简单的标量回归，而是把它看成**world-state representation 问题**。这个重述更干净，也更有泛化潜力。

### 8.2 它贡献了一个很有用的 benchmark

RewardPrediction 不只是又一个数据集，它提供了一个能跨 domain 评估**分步 reward 质量**的方式，这对 agent 研究是非常有价值的。

### 8.3 它把表示质量和规划质量真正连了起来

论文没有停留在 EPIC 分数，而是继续证明更好的 reward 预测真的会转化成更高的 agent success rate。

## 9. 局限性

这篇论文也有一些边界需要注意。

- 方法依赖较强的 LLM 做 state extraction 和 goal interpretation，因此这些组件的质量会直接影响整体效果。
- 当前环境主要是文本型或文本驱动环境，对真实视觉具身环境的扩展还没有直接验证。
- 语义相似度很强，但面对更深层的因果结构或不可逆操作时，仍可能不足。
- benchmark 虽然多样，但仍然只有五个 domain，并且基于离线轨迹。

## 10. 总结

我对这篇论文的核心结论是：

**StateFactory 表明，只要把 world state 分解成合适的语义单位，reward prediction 就可以变得更可泛化。**

更一般地，它给出了一个很有操作性的 agent 设计思路：

- 显式预测或维护 world state
- 用 object + attribute 的形式表示状态
- 让 goal interpretation 动态更新
- 通过语义对齐而不是单纯训练标量 head 来构造 reward

对 LLM agent 来说，这是一条很值得继续走的路线。与其让模型直接“判断进度”，不如先让状态变得清晰可读，再让 reward 从结构中自然产生。

</div>
