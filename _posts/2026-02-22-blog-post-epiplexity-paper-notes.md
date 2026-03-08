---
title: "[Paper Notes] From Entropy to Epiplexity: Rethinking Information for Computationally Bounded Intelligence"
date: 2026-02-23
permalink: /posts/2026/02/epiplexity-paper-notes/
tags:
  - Machine Learning Theory
  - Information Theory
  - Data-Centric AI
  - Pretraining
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle.

## TL;DR

This paper argues that classical information notions (Shannon entropy, Kolmogorov complexity) miss a key ingredient for modern ML:

- **the observer is computationally bounded**

To address this, the authors introduce **epiplexity**:

- a measure of **structural information** that a computationally bounded learner can extract from data

paired with:

- **time-bounded entropy**: the residual random/unpredictable part for that bounded learner

The paper’s core message is highly relevant to data-centric ML:

- data quality is not only about total bits or likelihood
- it is also about how much **reusable structure** a bounded model can absorb
- this may better explain OOD transfer and pretraining data value

## Paper Info

- **Title**: From Entropy to Epiplexity: Rethinking Information for Computationally Bounded Intelligence
- **Authors**: Marc Finzi, Shikai Qiu, Yiding Jiang, Pavel Izmailov, J. Zico Kolter, Andrew Gordon Wilson
- **Source**: arXiv (2026, based on `2601.03220`)

## 1. What problem is this paper solving?

The paper asks a fundamental question:

> How should we define and measure the information value of data for learning systems with limited compute?

Why this matters:

- In modern pretraining, **data choice/curation** often matters as much as architecture.
- Classical information theory is excellent for communication and coding, but often does not capture:
  - structure vs randomness (from the model’s perspective)
  - compute constraints of the learner
  - why some data formats/orderings improve transfer without improving in-distribution loss much

The authors position epiplexity as a step toward a theory of **data selection**, not just model selection.

## 2. The three “paradoxes” motivating the paper

The paper frames the gap between theory and practice using three apparent paradoxes:

### Paradox 1: “Information cannot be increased by deterministic transformations”

Classical view:

- deterministic transforms should not create new information

But practice suggests otherwise:

- synthetic data can improve models
- self-play systems (e.g., AlphaZero-style examples) extract useful knowledge from simple rules
- dynamical systems generate emergent structures that models can learn

### Paradox 2: “Information is independent of factorization/order”

Classical view:

- total information content should not depend on ordering/factorization

But in practice:

- left-to-right vs reverse text/chess orderings can change what models learn
- one direction can be easy to predict while the reverse is much harder

### Paradox 3: “Likelihood modeling is just distribution matching”

Classical intuition:

- maximizing likelihood only matches the data-generating distribution
- models should not learn “more structure” than what is in the generating process

But in practice:

- predictive models often need to learn **extra internal structure** (induction, emergent shortcuts) to make tractable predictions under limited compute

The paper’s thesis is that these paradoxes weaken once we explicitly model a **computationally bounded observer**.

## 3. Core concept: Epiplexity + Time-Bounded Entropy

The paper defines an MDL-style optimization under a runtime constraint `T`:

- find the best time-bounded probabilistic program `P*` minimizing:
  - model description length + expected coding loss

Then decompose information into:

- **Epiplexity `S_T(X)`** = size of the optimal time-bounded program (`|P*|`)
- **Time-bounded entropy `H_T(X)`** = residual expected unpredictability under that program

Interpretation:

- `S_T(X)` = **structural information** visible to the bounded learner
- `H_T(X)` = **random/unpredictable information** (to that learner)

This decomposition is the main conceptual contribution.

### Intuition

Two datasets can have similar training loss / entropy-like behavior but differ in:

- how much structure the model had to internalize to get that loss

The paper argues that this “missing component” is often what matters for **OOD transfer**.

## 4. Why this is different from Shannon entropy / Kolmogorov complexity

The paper is not merely proposing another complexity metric. It changes the viewpoint:

- information becomes **observer-dependent**
- the observer is constrained by **computation**

Consequences:

- CSPRNG outputs can look random to polynomial-time observers (high time-bounded entropy, low epiplexity)
- deterministic dynamics can produce data with high structural content for bounded learners
- ordering/factorization can matter because forward and inverse computations can have different computational difficulty

This is why the framework naturally connects to cryptography, emergence, and ML training dynamics.

## 5. How they estimate epiplexity in practice (important)

The theory is abstract, but the paper gives practical estimators using neural network training.

### 5.1 Prequential coding (fast heuristic)

Key idea:

- estimate model information from the **area under the loss curve above the final loss**

If loss drops slowly and substantially:

- the model may be absorbing more structural information from data

Pros:

- simple
- can reuse standard training runs

Cons:

- not fully rigorous as an explicit time-bounded code for the learned model

### 5.2 Requential coding (more rigorous, slower)

Key idea:

- explicitly code the learned model via a teacher-student training process
- use cumulative KL terms (teacher vs student) to estimate model code length

The paper presents this as a more principled way to estimate epiplexity, but with extra computational overhead (they note it is typically slower than prequential coding).

### Practical recommendation (paper’s stance)

- use **prequential** for quick ranking / rough comparisons
- use **requential** when more accurate estimates are needed

This is a strong part of the paper: it does not stop at theory, it gives a measurement pipeline.

## 6. Key experiments / evidence (what the paper shows)

## 6.1 Deterministic computation can create useful information (for bounded observers)

Using cellular automata (ECA rules), the paper shows different deterministic rules produce very different decompositions:

- mostly simple/predictable
- mostly random (high time-bounded entropy, low epiplexity)
- mixed random + structured (higher epiplexity)

This supports the idea that deterministic processes can create **learnable structure** from the perspective of a bounded learner.

## 6.2 Factorization/order matters

The paper shows order-dependent effects in:

- one-way-function-like setups
- chess data formatting/ordering

A particularly interesting result:

- a reverse chess ordering can yield **higher epiplexity** and better OOD transfer on some downstream chess tasks, even if the in-distribution setup is not obviously better by standard metrics

This is a very practical takeaway for data formatting and curriculum design.

## 6.3 Likelihood modeling can require learning more than the generating process

Through induction and emergence examples (e.g., masked latent information, ECA dynamics), the paper shows that a bounded predictive model may need to learn:

- inversion strategies
- latent inference procedures
- emergent pattern abstractions

that are not explicitly present in the short data-generating program.

This is one of the most important conceptual contributions in my view.

## 6.4 Epiplexity and natural data / pretraining

The paper estimates epiplexity across natural modalities and data formats and argues:

- language tends to exhibit higher epiplexity than images under their estimation setup
- tokenization/representation choices (e.g., VQ tokenization) can change epiplexity
- epiplexity may explain part of why some pretraining data sources transfer better than others

They also connect this to **Adaptive Data Optimization (ADO)** and show evidence that data selection strategies that improve downstream/OOD performance can coincide with higher estimated epiplexity.

## 7. Why this matters for data-centric ML (my take)

This paper gives a useful lens for questions like:

- Why does data ordering matter?
- Why can synthetic data help even when “no new Shannon information” is added?
- Why do some corpora transfer better than others despite similar perplexity?
- Why can training loss fail to predict downstream transfer?

The key distinction is:

- **loss / entropy-like terms** capture residual unpredictability
- **epiplexity** captures how much reusable structure the model had to build

That decomposition is not a full theory of transfer, but it is much closer to the phenomena we actually observe in pretraining.

## 8. Strengths

- Ambitious and original conceptual framing
- Connects ML practice with cryptography / complexity / MDL in a non-trivial way
- Provides both theory and practical estimation procedures
- Explains several empirically familiar phenomena (ordering, emergence, synthetic data usefulness) in a unified language
- Opens a path toward **data selection theory**

## 9. Limitations / Cautions

- Estimation is still approximation-heavy (especially prequential proxy)
- Epiplexity is **not** a direct guarantee of OOD performance on a specific task (the paper explicitly emphasizes this)
- The framework depends on the choice of observer/model class/time budget
- Practical estimation can be expensive (requential coding)
- Some claims are currently more explanatory/interpretive than directly actionable at large scale

## 10. Practical Takeaways for Research

If you work on pretraining, data curation, or synthetic data:

- Evaluate datasets beyond held-out perplexity / in-domain loss
- Test data **ordering / factorization / formatting** as a first-class variable
- Consider whether an intervention increases learnable structure vs just reducing noise
- Use epiplexity-like proxies (even crude ones) to rank dataset variants or curricula
- Treat “more data” and “more useful structure” as different objectives

## 11. One-sentence summary

This paper introduces **epiplexity** as a compute-aware measure of structural information in data, offering a new lens for understanding synthetic data, emergence, pretraining data value, and OOD generalization beyond classical entropy and likelihood.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过网站顶部语言切换按钮在 **English / 中文** 间切换。

## TL;DR

这篇论文的核心观点是：经典信息论（Shannon entropy、Kolmogorov complexity）在解释现代机器学习时缺了一个关键前提：

- **学习者是计算受限的（computationally bounded）**

作者因此提出 **Epiplexity**：

- 用来刻画“计算受限学习者从数据中能提取出的**结构性信息**”

并与之配对定义：

- **time-bounded entropy（时间受限熵）**：在该计算预算下仍然不可预测/随机的部分

这对数据中心化 AI 很重要，因为它强调：

- 数据价值不只是“总信息量”或“似然”
- 更在于模型能否从中吸收可复用的结构（reusable structure）
- 这可能更接近 OOD 泛化和预训练迁移能力的本质

## 论文信息

- **标题**：From Entropy to Epiplexity: Rethinking Information for Computationally Bounded Intelligence
- **作者**：Marc Finzi, Shikai Qiu, Yiding Jiang, Pavel Izmailov, J. Zico Kolter, Andrew Gordon Wilson
- **来源**：arXiv（2026，文件名 `2601.03220`）

## 1. 这篇论文在解决什么问题？

论文试图回答一个很基础但非常现实的问题：

> 对于计算资源有限的学习系统，我们应该如何定义和衡量“数据的信息价值”？

为什么这个问题重要：

- 在现代预训练里，**数据选择/数据配比/数据格式** 往往和模型结构同样重要
- 经典信息论非常适合通信与编码，但不一定能解释：
  - 从模型角度看，哪些信息是“结构”，哪些只是“噪声/随机性”
  - 学习者算力受限时能学到什么
  - 为什么一些数据重排/格式改动能改善迁移，却不一定显著改善 in-domain loss

作者的目标可以理解为：给 **data selection（数据选择）** 提供一个理论基础，而不仅是 model selection。

## 2. 三个“信息悖论”（论文动机）

论文用三个看似矛盾的现象来说明经典信息观点和现代 ML 实践之间的张力：

### 悖论 1：确定性变换不能增加信息

经典观点：

- 确定性变换不会创造新信息

但实践上：

- 合成数据可能提升模型能力
- AlphaZero/self-play 这类系统能从简单规则里学出复杂策略
- 动力系统能产生模型可学习的涌现结构

### 悖论 2：信息与因子分解/顺序无关

经典观点：

- 总信息量不应依赖 factorization / 顺序

但实践上：

- 文本或棋谱的不同顺序会显著影响模型学习效果
- 正向预测可能容易，逆向预测可能困难得多

### 悖论 3：似然建模只是分布匹配

经典直觉：

- 最大似然只是去逼近数据生成分布
- 模型不应学到“超出生成过程”的结构

但实践上：

- 计算受限的预测模型往往必须学会额外的归纳/中间结构/涌现 shortcut，才能高效预测

论文的核心论点是：一旦把“观察者/学习者是计算受限的”写进定义，这些悖论就没那么矛盾了。

## 3. 核心概念：Epiplexity + Time-Bounded Entropy

论文在给定时间预算 `T` 下，定义了一个 MDL 风格的最优概率程序 `P*`：

- 最小化：模型描述长度 + 期望编码损失

然后把信息分解为两部分：

- **Epiplexity `S_T(X)`** = 最优程序长度（`|P*|`）
- **Time-bounded entropy `H_T(X)`** = 在该最优程序下剩余的不可预测性

解释上：

- `S_T(X)`：计算受限学习者可见的**结构性信息**
- `H_T(X)`：该学习者看来仍然是“随机/不可预测”的部分

这就是论文最重要的概念贡献。

### 直觉理解

两个数据集可能有相近的 loss / entropy 表现，但差别在于：

- 模型为了达到这个 loss，究竟吸收了多少可复用结构

论文认为这部分“结构吸收量”恰恰和 OOD 迁移更相关。

## 4. 它和 Shannon 熵 / Kolmogorov 复杂度有什么本质不同？

这篇论文不是简单换一个 complexity 指标，而是换了观察视角：

- 信息是 **相对于观察者** 的
- 观察者受 **计算资源** 约束

这会带来几个自然结果：

- CSPRNG 输出对多项式时间观察者来说可以“像随机的一样”（高时间受限熵、低 epiplexity）
- 确定性动力系统能为受限学习者产生可学习结构
- 顺序/因子分解会影响可学习性，因为正向和逆向计算难度不对称

这也是为什么这篇论文能同时连接密码学、复杂系统和机器学习训练现象。

## 5. 实际上怎么估计 Epiplexity（很关键）

论文不仅给理论定义，还给出可操作估计方法。

### 5.1 Prequential coding（快速近似）

核心直觉：

- 用训练过程中 **loss 曲线高于最终 loss 的面积** 来近似模型吸收的信息量

如果 loss 持续下降且下降幅度大：

- 可以理解为模型从数据里吸收了较多结构信息

优点：

- 简单
- 能复用常规训练过程

缺点：

- 作为严格的 time-bounded 模型编码并不完全严谨（论文也明确指出）

### 5.2 Requential coding（更严格、更慢）

核心思路：

- 用 teacher-student 的训练过程显式构造模型编码
- 用累计 KL（teacher vs student）近似模型描述长度

论文把它作为更严格的 epiplexity 估计方案，但计算开销更高（通常明显慢于 prequential）。

### 论文给出的实践建议

- **快速排序/粗估**：用 prequential
- **更严格估计**：用 requential

这是这篇论文很强的一点：不是只有概念和定理，也有可落地的测量方法。

## 6. 关键实验与证据（论文展示了什么）

## 6.1 确定性计算也能为受限学习者“创造”有用信息

通过 ECA（初等元胞自动机）实验，论文展示不同确定性规则会导致很不同的信息分解：

- 有的主要是简单可预测结构
- 有的主要是随机性（高 time-bounded entropy，低 epiplexity）
- 有的是随机+结构并存（更高 epiplexity）

这支持了论文的观点：对计算受限学习者而言，确定性过程确实可以产生可学习结构。

## 6.2 因子分解/顺序会影响信息（对学习者而言）

论文在以下场景展示顺序影响：

- 类 one-way function 设置
- 棋谱/棋局顺序建模（chess ordering）

一个非常有启发的结果是：

- 某种 reverse chess ordering 会带来更高 epiplexity，并在一些 OOD chess 下游任务上表现更好

这对数据格式设计、课程学习（curriculum）、序列化方式很有启发。

## 6.3 似然建模并不只是“复刻生成过程”

通过 induction 与 emergence 实验，论文表明计算受限的预测模型可能必须学会：

- latent/缺失信息归纳
- 逆向推断策略
- 涌现模式的高层抽象

这些结构并不一定显式存在于“短小的数据生成程序”中。

这是我认为论文最有价值的思想贡献之一。

## 6.4 Epiplexity 与自然数据 / 预训练数据价值

论文还尝试比较自然数据模态与表示方式的 epiplexity，并讨论：

- 在其估计设定下，语言数据往往具有更高 epiplexity
- tokenization / 表示方式（如 VQ tokenization）会改变 epiplexity
- epiplexity 可能解释为什么某些预训练数据源更容易产生广泛迁移能力

另外，论文还连接到 **ADO（Adaptive Data Optimization）**：

- 一些能提升下游/OOD表现的数据选择策略，也对应更高的估计 epiplexity

这让 epiplexity 从“解释性概念”更接近“可用于数据选择的指标”。

## 7. 为什么这对 Data-Centric ML 很重要（我的理解）

这篇论文提供了一个很有用的视角去理解：

- 为什么数据顺序会影响结果？
- 为什么合成数据在经典信息论下看似“不增加信息”，却可能真的有帮助？
- 为什么类似 perplexity 的指标不能完全预测迁移效果？
- 为什么一些数据改造能提高 OOD 能力但对 in-domain loss 提升有限？

核心区分是：

- **loss / entropy 类指标** 更偏向衡量“剩余不可预测性”
- **epiplexity** 更偏向衡量模型为了拟合数据而构建了多少可复用结构

这当然还不是完整的泛化理论，但比单看 likelihood 更贴近预训练实践。

## 8. 优点

- 概念框架非常新颖且有野心
- 把 ML 现象与密码学 / 复杂性 / MDL 做了有机连接
- 既有理论定义，也有实用估计流程
- 能统一解释多个常见经验现象（顺序、涌现、合成数据收益）
- 为 **数据选择理论** 提供了有潜力的方向

## 9. 局限性 / 使用时的注意点

- 实际估计仍有近似成分（尤其 prequential proxy）
- Epiplexity **不是** 对某个具体下游任务 OOD 泛化的直接保证（论文也明确强调）
- 结果依赖观察者/模型类/时间预算的设定
- 更严格估计（requential）开销较高
- 一些结论目前更偏解释性与方向性，距离大规模工程标准化还需要更多工作

## 10. 对研究实践的启发

如果你做预训练、数据筛选、合成数据或 curriculum：

- 不要只看 held-out perplexity / in-domain loss
- 把数据的 **顺序、因子分解、格式化方式** 当作一等设计变量
- 区分“降噪”与“增加可学习结构”这两类数据干预
- 可以尝试用 epiplexity 风格 proxy（哪怕是粗略版）来比较数据变体
- 把“更多数据”和“更多可复用结构”当成两个不同优化目标

## 11. 一句话总结

这篇论文提出 **Epiplexity** 作为一种“计算受限视角下的数据结构信息”度量，为理解合成数据价值、涌现、预训练数据选择与 OOD 泛化提供了一个比经典熵/似然更贴近现代 ML 的理论视角。

</div>
