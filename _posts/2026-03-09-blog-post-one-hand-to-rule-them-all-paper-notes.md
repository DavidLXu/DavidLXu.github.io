---
title: "[Paper Notes] One Hand to Rule Them All: Canonical Representations for Unified Dexterous Manipulation"
date: 2026-03-09
permalink: /posts/2026/03/one-hand-to-rule-them-all-paper-notes/
tags:
  - Robotics
  - Dexterous Manipulation
  - Cross-Embodiment Learning
  - Grasping
  - Hand Morphology
  - Sim2Real
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

This paper asks a simple but important question: can we train dexterous manipulation policies that are **not tied to one specific robot hand**?

Their answer is a **canonical hand representation** that maps many dexterous hands into:

- a shared **morphology parameter space**
- a shared **canonical URDF**
- a shared **action space**

This lets a policy condition on hand morphology and transfer across embodiments. The paper shows cross-hand grasp learning, smooth latent interpolation over hand designs, and strong **zero-shot generalization** to unseen LEAP Hand variants, including **81.9%** zero-shot success on an unseen 3-finger LEAP Hand.

## Paper Info

- **Title**: One Hand to Rule Them All: Canonical Representations for Unified Dexterous Manipulation
- **Authors**: Zhenyu Wei, Yunchao Yao, Mingyu Ding
- **Affiliations**: University of North Carolina at Chapel Hill
- **Project page**: [zhenyuwei2003.github.io/OHRA](https://zhenyuwei2003.github.io/OHRA/)
- **Paper type**: dexterous manipulation / cross-embodiment representation paper

## 1. Motivation

Most dexterous manipulation work still assumes a **fixed robot hand**.

That causes two major problems:

- policies trained on one hand do not transfer well to other hands with different finger numbers, joint layouts, or kinematics
- datasets collected for different hands cannot be easily pooled for shared learning

This is a real bottleneck, because dexterous hands differ a lot:

- 3-finger, 4-finger, and 5-finger designs
- different DoF counts
- different joint orders and axis conventions
- different URDF coordinate systems and kinematic trees

The paper’s core claim is that we need a **representation-level solution** before we can get scalable cross-hand learning.

## 2. Core Idea

The method introduces a **canonical representation** for dexterous hands with two linked pieces:

- a **canonical parameterization** that describes morphology and kinematics in a learning-friendly vector form
- a **canonical URDF** that standardizes embodiment-specific action spaces into one unified control interface

In the base version, the hand is represented by **82 parameters**. The canonical URDF supports up to:

- 5 fingers
- 22 DoF

Inactive joints are simply treated as dummy variables, so different hand embodiments can still share one action space.

That is the central design choice: instead of learning separate policies for each hand, learn one policy in a unified embodiment space and condition it on the hand’s canonical description.

## 3. Method Breakdown

### 3.1 Canonical URDF

The canonical URDF captures a human-inspired hand topology while enforcing consistent coordinate conventions.

Important design choices include:

- using a unified right/left-hand kinematic convention
- modeling links with capsule primitives to simplify geometry while preserving essential structure
- standardizing joint axes and frame definitions across hands

This matters because raw URDFs are too heterogeneous for direct learning. Even two similar hands may use incompatible global or local axis conventions, which makes direct parameter sharing difficult.

### 3.2 Canonical parameter space

The canonical representation encodes:

- palm geometry
- finger geometry
- finger origins
- thumb orientation
- joint axes
- joint availability / presence

The paper also provides an **extended 173-parameter version** for higher-fidelity modeling, but the main experiments use the more compact 82-parameter design.

The point is not to exactly preserve every URDF implementation detail. The point is to preserve the key geometric and kinematic features that matter for cross-embodiment learning.

### 3.3 Unified action space

The canonical URDF gives every hand a shared control interface. A policy outputs actions in the canonical space, and those actions can then be interpreted on different hands according to which joints are active.

This is arguably the most practical contribution in the paper, because it turns “cross-hand transfer” from an abstract representation problem into a policy-learning problem that standard neural networks can actually use.

### 3.4 Latent hand morphology learning

The authors train a **VAE** on synthetic hand samples generated from the canonical parameter space.

Key details:

- 65,536 synthetic hand configurations are sampled
- the VAE maps canonical hand parameters into a **16-dimensional latent space**

The learned latent space is structured enough that interpolation between two hand embodiments yields smooth transitions in:

- finger number
- finger spacing
- palm size
- overall morphology

This is a useful sanity check that the canonical space is not just valid symbolically, but also geometrically meaningful for learning.

## 4. Experiments

The paper evaluates four things:

1. latent-space structure
2. physical fidelity of the canonical hand model
3. cross-embodiment grasp learning
4. zero-shot transfer to unseen hand morphologies

## 4.1 VAE latent interpolation

The latent interpolation figures show smooth transitions between very different hand designs, such as a compact 3-finger hand and a more anthropomorphic high-DoF hand.

This is a strong qualitative result because it suggests the representation captures a continuous morphology manifold rather than a bag of disconnected hand templates.

## 4.2 In-hand reorientation

To test whether the canonical URDF preserves useful dynamics, the paper compares RL policies trained on:

- original hand URDFs
- canonical versions of those hands

They evaluate on Shadow Hand and LEAP Hand using an in-hand rotation task. Reported results show the canonical version performs comparably to, and in some cases slightly better than, the original version:

- **Shadow (Original)**: 369.66 steps-to-fall, 9.09 cumulative rotation
- **Shadow (Canonical)**: 390.62 steps-to-fall, 10.92 cumulative rotation
- **LEAP (Original)**: 397.62 steps-to-fall, 5.63 cumulative rotation
- **LEAP (Canonical)**: similar performance trend with no obvious fidelity collapse

This matters because a unified URDF is only useful if it preserves enough physics and kinematics for control.

## 4.3 Cross-embodiment grasping

The grasping experiments use grasps from three very different dexterous hands:

- Allegro
- Barrett
- Shadow Hand

The policy is trained in the canonical representation and compared with baselines as well as embodiment-specific training.

A few important findings:

- unified training outperforms embodiment-specific training across all three hands
- the lightweight canonical grasp model runs very fast, about **0.13 s** inference time
- performance is competitive with stronger grasp pipelines despite using a relatively simple model

Reported unified-vs-specific results:

- **Allegro**: 84.2 vs 82.1
- **Barrett**: 88.1 vs 87.6
- **Shadow Hand**: 62.9 vs 55.4

That Shadow Hand gain is especially notable because it suggests the shared embodiment space lets harder hands benefit from data from easier ones.

## 4.4 Zero-shot transfer to unseen LEAP Hand variants

This is the most interesting experiment in the paper.

The authors create a large family of LEAP Hand variants by removing links from fingers, yielding many different morphologies. They train on a subset and test on unseen variants.

Main takeaway:

- the policy can generalize zero-shot to previously unseen hand morphologies
- one highlighted result is **81.9% zero-shot success** on an unseen 3-finger LEAP Hand variant

The paper also shows that explicit **hand conditioning** is crucial. If the wrong hand condition is used, performance drops sharply, especially in zero-shot settings.

## 4.5 Real-world results

The real-world evaluation is run on a Franka arm with different LEAP Hand variants over 10 objects.

Reported average grasp success:

- `leap_3333 (trained)`: **83/100**
- `leap_3033 (trained)`: **75/100**
- `leap_3033 (zero-shot)`: **71/100**
- `leap_3303 (trained)`: **70/100**
- `leap_3303 (zero-shot)`: **71/100**

The key point is that zero-shot policies are close to the trained ones, which is strong evidence that the morphology-conditioned policy is doing meaningful cross-hand generalization rather than memorizing one embodiment.

## 5. Why This Paper Matters

I think this paper is important because it shifts cross-embodiment dexterous manipulation from “can we transfer grasps between a few hands?” to “can we define a **shared embodiment language** for many hands?”

That framing matters because:

- it scales better than hand-specific pipelines
- it makes heterogeneous grasp data reusable
- it opens the door to universal dexterous manipulation policies that can adapt to new hand hardware

The representation is the real contribution here. The grasp model itself is intentionally simple; the point is to show the representation is strong enough that even a simple policy can work well across embodiments.

## 6. Strengths

- Very clear and useful problem framing around cross-embodiment dexterous learning.
- Canonical URDF plus canonical parameter space is a practical and interpretable design.
- Strong evidence that unified training can outperform per-hand training.
- The VAE interpolation result is a good sanity check that the morphology space is continuous and structured.
- Real-world zero-shot transfer on unseen hand variants is a meaningful demonstration, not just a simulation result.

## 7. Limitations and Open Questions

- Most downstream experiments focus on **grasping**; broader sequential dexterous manipulation remains open.
- The canonical abstraction inevitably introduces approximation error for hands with unusual kinematics.
- The paper notes a mismatch for certain joints, such as Allegro’s axial-rotation behavior, which can reduce fidelity.
- The framework is currently demonstrated mostly on hand morphology transfer, not on richer sensing/control differences across platforms.
- It is still unclear how well the representation would scale to tasks like dynamic in-hand manipulation, tool use, or contact-rich long-horizon dexterity across many embodiments.

## 8. Takeaways

My main takeaway is that this paper provides a strong foundation for **universal dexterous hand conditioning**.

Instead of asking a policy to implicitly infer everything from raw URDF structure, it explicitly gives the model:

- a standardized morphology description
- a standardized action interface
- a structured latent space over hand designs

That combination seems powerful. If future work extends this from grasping to richer manipulation skills, this kind of canonical embodiment representation could become a standard building block for cross-hand dexterous learning.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

这篇论文提出了一个很关键的问题：我们能不能训练出**不绑定某一种机械手**的灵巧操作策略？

作者给出的答案是一个**canonical hand representation**，把不同 dexterous hand 统一映射到：

- 共享的**形态参数空间**
- 共享的**canonical URDF**
- 共享的**动作空间**

这样一来，策略就可以显式地以 hand morphology 作为条件，在不同 embodiment 间迁移。论文展示了跨手型抓取、手型 latent interpolation，以及对未见 LEAP Hand 变体的强**zero-shot 泛化**，其中包括对未见三指 LEAP Hand 的 **81.9%** zero-shot 成功率。

## 论文信息

- **标题**: One Hand to Rule Them All: Canonical Representations for Unified Dexterous Manipulation
- **作者**: Zhenyu Wei, Yunchao Yao, Mingyu Ding
- **机构**: University of North Carolina at Chapel Hill
- **项目主页**: [zhenyuwei2003.github.io/OHRA](https://zhenyuwei2003.github.io/OHRA/)
- **论文类型**: dexterous manipulation / cross-embodiment representation paper

## 1. 研究动机

目前大多数 dexterous manipulation 工作依然默认**固定机械手**。

这会带来两个明显问题：

- 在一种 hand 上训练出来的策略，很难迁移到 finger number、joint layout 或 kinematics 不同的另一种 hand
- 不同 hand 上采集到的数据也很难直接合并利用

这是一个真实的系统瓶颈，因为 dexterous hand 差异很大：

- 有 3 指、4 指、5 指设计
- DoF 数量不同
- joint 顺序和轴定义不同
- URDF 坐标系和运动树结构也不同

论文的核心观点是：如果没有一个**表示层面的统一方案**，就很难真正做可扩展的跨手型学习。

## 2. 核心思路

方法提出了一个面向 dexterous hand 的**canonical representation**，包含两个紧密相关的部分：

- 一个**canonical parameterization**，把机械手形态和运动学编码成适合学习的向量
- 一个**canonical URDF**，把不同 hand 的动作空间统一成一个共享控制接口

在基础版本中，整个 hand 用 **82 个参数**表示。canonical URDF 最多支持：

- 5 根手指
- 22 个自由度

对于不存在的关节，直接把它们当成 dummy variables。这样不同 hand 虽然结构不同，也仍然能共享同一个动作空间。

这正是论文最核心的设计：不再给每种 hand 单独训练一个策略，而是在统一 embodiment 空间里训练一个共享策略，并把 hand 的 canonical 描述作为条件输入。

## 3. 方法拆解

### 3.1 Canonical URDF

canonical URDF 采用人手启发的拓扑，并强制使用一致的坐标定义。

其中几个重要设计包括：

- 统一左右手的运动学约定
- 用 capsule primitive 来表示 link，简化几何但保留关键结构
- 标准化不同 hand 的 joint axis 和 frame 定义

这一点很关键，因为原始 URDF 太异构了。哪怕两个结构很像的 hand，也可能使用完全不兼容的全局或局部坐标定义，导致参数共享变得困难。

### 3.2 Canonical 参数空间

canonical representation 编码了：

- palm geometry
- finger geometry
- finger origins
- thumb orientation
- joint axes
- joint availability / presence

论文还给出了一个更高保真的 **173 参数扩展版本**，但主要实验还是使用更紧凑的 82 参数设计。

这里的重点并不是精确复刻每一个 URDF 的实现细节，而是保留那些真正影响跨手型学习的关键几何和运动学特征。

### 3.3 统一动作空间

canonical URDF 给所有 hand 一个共享控制接口。策略在 canonical 空间中输出动作，然后不同机械手根据自身哪些 joints 是 active 的来解释这些动作。

我觉得这是论文里最实用的贡献，因为它把“跨手型迁移”从一个抽象表示问题，变成了神经网络可以直接处理的策略学习问题。

### 3.4 手形态 latent 学习

作者在 canonical 参数空间上训练了一个 **VAE**。

关键设置包括：

- 采样了 65,536 个 synthetic hand configurations
- VAE 将 canonical hand 参数编码到一个 **16 维 latent space**

这个 latent space 足够结构化，以至于在两个 hand embodiment 之间做插值时，会产生平滑的变化，包括：

- 手指数目
- 手指间距
- palm 尺寸
- 整体 morphology

这是一个很重要的 sanity check，说明 canonical 空间不仅形式上统一，而且对学习来说也确实是几何上有意义的。

## 4. 实验

论文主要评估了四件事：

1. latent 空间结构
2. canonical hand model 的物理保真度
3. 跨 embodiment 抓取学习
4. 对未见 hand morphology 的 zero-shot 泛化

## 4.1 VAE latent interpolation

latent interpolation 图展示了从一个紧凑的 3 指 hand 到一个更拟人的高 DoF hand 之间的平滑过渡。

这是一个很强的定性结果，因为它说明这个表示学到的是一个连续的 morphology manifold，而不是一堆互不相关的 hand 模板。

## 4.2 手内旋转任务

为了测试 canonical URDF 是否保留了足够的动力学和控制特性，论文比较了基于以下两种模型训练出来的 RL 策略：

- 原始 hand URDF
- 该 hand 的 canonical 版本

实验在 Shadow Hand 和 LEAP Hand 上进行，任务是 in-hand rotation。报告结果显示 canonical 版本与原始版本表现相近，甚至有些指标略好：

- **Shadow (Original)**: 369.66 steps-to-fall, 9.09 cumulative rotation
- **Shadow (Canonical)**: 390.62 steps-to-fall, 10.92 cumulative rotation
- **LEAP (Original)**: 397.62 steps-to-fall, 5.63 cumulative rotation
- **LEAP (Canonical)**: 整体趋势接近，没有出现明显 fidelity 崩塌

这很重要，因为一个统一 URDF 只有在能保留足够多物理和运动学属性时，才真正有用。

## 4.3 跨 embodiment 抓取

抓取实验使用了三种差异很大的 dexterous hands：

- Allegro
- Barrett
- Shadow Hand

策略在 canonical representation 上训练，并与 baseline 以及 per-hand 独立训练进行比较。

几个关键结果：

- unified training 在三种 hand 上都优于 embodiment-specific training
- 这个 lightweight canonical grasp model 的推理速度很快，大约 **0.13 s**
- 虽然模型本身不复杂，但性能已经接近更强的 grasp pipeline

论文报告的 unified-vs-specific 结果是：

- **Allegro**: 84.2 vs 82.1
- **Barrett**: 88.1 vs 87.6
- **Shadow Hand**: 62.9 vs 55.4

其中 Shadow Hand 上的提升尤其值得注意，因为它说明共享 embodiment 空间确实让更难的手型从其他手的数据中受益。

## 4.4 对未见 LEAP Hand 变体的 zero-shot 泛化

这是整篇论文里最有意思的实验。

作者通过去掉不同手指上的 link，构造出了大量 LEAP Hand 变体，然后在一部分 hand 上训练，在未见变体上测试。

核心结论是：

- 策略可以 zero-shot 泛化到之前从未见过的 hand morphology
- 论文重点给出的一个结果是：对未见的三指 LEAP Hand 变体，zero-shot 成功率达到 **81.9%**

论文还说明，显式的 **hand conditioning** 非常关键。如果给错 hand condition，性能会显著下降，特别是在 zero-shot 设置下更明显。

## 4.5 真实世界结果

真实世界实验在一台 Franka 机械臂上进行，末端装配不同 LEAP Hand 变体，在 10 个物体上做抓取评测。

报告的平均成功率包括：

- `leap_3333 (trained)`: **83/100**
- `leap_3033 (trained)`: **75/100**
- `leap_3033 (zero-shot)`: **71/100**
- `leap_3303 (trained)`: **70/100**
- `leap_3303 (zero-shot)`: **71/100**

关键点在于，zero-shot 策略和专门训练的策略差距并不大，这说明 morphology-conditioned policy 确实在做有意义的跨手型泛化，而不是只记住某一个 hand。

## 5. 为什么这篇论文重要

我觉得这篇论文重要的地方在于，它把跨 embodiment dexterous manipulation 的问题，从“我们能不能在少数几种 hand 之间迁移 grasp？”提升到了“我们能不能定义一种**共享的 embodiment 语言**给很多 hands 使用？”

这个视角很重要，因为它：

- 比 hand-specific pipeline 更容易扩展
- 让异构抓取数据变得可复用
- 为未来能够适配新 hand hardware 的通用 dexterous manipulation policy 打基础

真正的贡献在于这个表示，而不是抓取模型本身。作者刻意使用了比较简单的 grasp model，就是为了说明：只要表示够强，简单策略也能跨 embodiment 做得很好。

## 6. 优点

- 对 cross-embodiment dexterous learning 的问题定义非常清晰。
- canonical URDF 加 canonical parameter space 的设计既实用又可解释。
- unified training 优于 per-hand training 的结果很有说服力。
- VAE interpolation 很好地验证了 morphology space 是连续且结构化的。
- 对未见 hand variants 的真实世界 zero-shot 迁移，是比纯仿真更有力的展示。

## 7. 局限与开放问题

- 目前大部分下游实验仍集中在**grasping**，更复杂的 sequential dexterous manipulation 还有待验证。
- canonical abstraction 不可避免会给某些具有特殊运动学结构的 hand 带来近似误差。
- 论文也提到，像 Allegro 某些轴向旋转关节，就会出现一定 mismatch，影响保真度。
- 当前框架主要解决的是 hand morphology transfer，对不同平台的感知和控制差异涉及还不多。
- 这个表示未来能否扩展到 dynamic in-hand manipulation、tool use 或更长时序的跨 hand dexterity，仍是开放问题。

## 8. Takeaways

我对这篇论文的主要 takeaway 是：它为**通用 dexterous hand conditioning**提供了一个很强的基础。

它不是让策略自己从原始 URDF 结构里隐式猜所有信息，而是显式给模型提供：

- 一个标准化的 morphology 描述
- 一个标准化的动作接口
- 一个结构化的 hand latent space

这三者组合起来很有力量。如果未来工作能把这种 canonical embodiment representation 从 grasping 扩展到更丰富的 manipulation skill，它很可能会成为 cross-hand dexterous learning 的标准组件。

</div>
