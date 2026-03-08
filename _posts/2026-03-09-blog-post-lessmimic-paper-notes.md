---
title: "[Paper Notes] LESSMIMIC: Long-Horizon Humanoid Interaction with Unified Distance Field Representations"
date: 2026-03-09
permalink: /posts/2026/03/lessmimic-paper-notes/
tags:
  - Robotics
  - Humanoid
  - Long-Horizon Control
  - Distance Fields
  - Reinforcement Learning
  - Sim2Real
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**LESSMIMIC** proposes a unified representation for humanoid-object interaction based on **distance fields (DFs)**. Instead of conditioning a humanoid policy on motion references or crafting task-specific rewards per skill, the paper represents interaction through:

- distance to the object surface
- distance-field gradients
- velocity components decomposed into surface-normal and tangential directions

The result is a **single whole-body policy** that can generalize across object geometry and scale, recover from failures, and compose multiple skills over long horizons. The paper’s central argument is that a good **interaction representation** matters as much as the control algorithm.

## Paper Info

- **Title**: LESSMIMIC: Long-Horizon Humanoid Interaction with Unified Distance Field Representations
- **Authors**: Yutang Lin, Jieming Cui, Yixuan Li, Baoxiong Jia, Yixin Zhu, Siyuan Huang
- **Affiliations**: Peking University, BIGAI, Beijing Institute of Technology
- **Project page**: [lessmimic.github.io](https://lessmimic.github.io)
- **arXiv**: [2602.21723](https://arxiv.org/abs/2602.21723)

## 1. Motivation

The paper targets a familiar limitation in humanoid manipulation:

- **reference-based** methods can produce high-quality motions, but they are tightly coupled to the geometry and trajectories seen in demonstrations
- **reference-free** methods are more flexible, but usually rely on task-specific rewards and end up as isolated single-skill policies

So the real question becomes: what interaction representation would let a humanoid:

- act without reference motions at inference time
- generalize to new object shapes and scales
- compose different interaction skills inside one policy
- recover when the world deviates from the nominal script

The authors argue that **distance fields** provide exactly that interface.

## 2. Core Idea

The key move in LESSMIMIC is to represent humanoid-object interaction in a geometry-aware but motion-agnostic way.

For each humanoid link position relative to the object, the distance field provides:

- the distance to the nearest surface
- the local surface gradient / normal
- a way to decompose link velocity into:
  - **normal motion**: approach / push / apply force
  - **tangential motion**: slide / traverse along the surface

This representation is meant to capture the **structure of interaction** rather than memorizing a particular reference trajectory.

That is the paper’s main conceptual contribution. Instead of telling the humanoid “follow this motion,” it tells the humanoid “reason about how your body is moving relative to the object’s geometry.”

## 3. Method Overview

### 3.1 DF-based interaction representation

At the representation level, the policy observes geometric cues derived from the object’s distance field. The paper emphasizes that absolute coordinates alone are not enough, because they do not tell the agent whether it is approaching, pressing, sliding, or disengaging from the object.

So the method uses:

- DF values
- DF gradients
- velocity decomposition into normal and tangential parts

These interaction features over time are encoded by a **VAE** into an interaction latent `z_t`, which smooths the signal and provides a compact policy input.

### 3.2 Three-stage training pipeline

The training pipeline has three stages:

1. **Interaction skill pre-training**  
   A teacher `pi_mimic` tracks retargeted human motions with physics-aware residual compensation. A student `pi_base` is then trained via DAgger-style behavior cloning, but crucially **without** access to reference motions at inference.

2. **Discriminative post-training**  
   The student is fine-tuned with RL under geometry randomization. Instead of reference tracking rewards, the policy is guided by **Adversarial Interaction Priors (AIP)**, which regularize interaction validity in the DF latent space.

3. **Visual-motor distillation**  
   A MoCap-conditioned full policy is distilled into a vision-based policy that uses **egocentric depth** only, so the system can deploy without motion-capture infrastructure.

This is a clean design: mimic for physical feasibility, RL for geometric generalization, and distillation for deployability.

## 4. Why Distance Fields Help

The value of DFs here is not just that they encode geometry. The representation has three useful properties:

- it is **local**, so it stays meaningful across different object shapes
- it is **continuous and differentiable**, so it provides smooth geometric feedback
- it is **task-agnostic**, so the same interface can support pushing, pickup, carrying, and sitting interactions

That last point is the most important one. LESSMIMIC is trying to build a shared language for heterogeneous humanoid-object interactions.

## 5. Main Results

## 5.1 Generalization across object scale and shape

The paper evaluates four interaction tasks under object scale variation:

- PickUp
- SitStand
- Push
- Carry

The training scale is `1.0x`, while evaluation ranges from `0.4x` to `1.6x`. For pickup, the paper also varies object shape across boxes, cylinders, and spheres.

Key takeaways:

- reference-based baselines degrade sharply once object scale shifts away from the reference motion setup
- LESSMIMIC remains much more stable across scales
- the MoCap-conditioned full model reports **80-100% success** on several scale-generalization settings for PickUp and SitStand
- the policy generalizes in the real world from trained box-like objects to a **soccer ball**, which is a good qualitative sign that the policy is using geometry rather than memorized motion patterns

This is the strongest result in the paper: the representation seems to support geometry generalization better than motion-conditioned baselines.

## 5.2 Long-horizon skill composition

The paper then tests whether one policy can handle multiple heterogeneous tasks in sequence **without environment resets**.

They evaluate randomly ordered task compositions of length:

- `N = 5`
- `N = 10`
- `N = 15`
- `N = 25`
- `N = 40`

The full MoCap-based LESSMIMIC policy reports:

- **61.7%** success at `N=5`
- **38.1%** at `N=10`
- **23.5%** at `N=15`
- **9.0%** at `N=25`
- **2.1%** at `N=40`

Those numbers are not huge at the longest horizon, but they matter because the ablated variants collapse to nearly zero much earlier. The result suggests the unified DF representation actually helps preserve cross-skill consistency over long execution chains.

## 5.3 Failure recovery

One of the paper’s qualitative claims is that the policy can recover from perturbations. For example, after an object is dropped, the humanoid can re-initiate pickup from the object’s new location instead of failing permanently because a reference trajectory was broken.

This makes sense given the representation design: if the policy is grounded in current geometry rather than a fixed motion target, it has a better chance to re-plan implicitly through closed-loop control.

## 5.4 Real-world deployment

The paper evaluates both a MoCap-based and a vision-based policy on a real humanoid platform.

Reported results include:

- **MoCap-based**
  - PickUp `22 cm^3`: `10/10`
  - PickUp `60 cm^3`: `8/10`
  - SitStand `12 cm`: `8/10`
  - SitStand `46 cm`: `10/10`
- **Vision-based**
  - PickUp `22 cm^3`: `8/10`
  - PickUp `60 cm^3`: `7/10`

The vision model is weaker than the MoCap-conditioned one, but still reasonably effective, which supports the claim that the DF-based interaction logic can be distilled into depth-based deployment.

## 6. Ablation Insights

The ablations are useful because they show the system is not succeeding from one trick alone.

- Removing **AIP** significantly hurts robustness, implying the adversarial interaction prior is important for geometry-consistent interaction.
- Removing **synthetic physicalization** hurts contact-rich tasks, especially carrying, showing that physically valid teacher trajectories matter.
- Removing **geometry randomization** causes severe overfitting outside the training scale.
- Removing **RL post-training** leaves behavior cloning insufficient for strong generalization.
- Replacing the **Transformer** with an MLP hurts performance, especially on tasks with longer temporal dependencies.

Overall, the paper argues that the full stack is necessary: representation, physically grounded pre-training, adversarial post-training, and sufficient model capacity.

## 7. Strengths

- Clear problem framing around representation rather than only reward design or imitation quality.
- The DF formulation is intuitive and task-general.
- Strong evidence for scale/shape generalization relative to motion-tracking baselines.
- Long-horizon skill composition is a meaningful benchmark, not just isolated single-task success.
- The paper includes a plausible path from privileged MoCap training to egocentric-depth deployment.

## 8. Limitations and Open Questions

- The vision-based model still shows a noticeable gap from the MoCap-conditioned version.
- The long-horizon success rate drops substantially by `N=25` and `N=40`, so this is still far from robust open-ended execution.
- The task set, while heterogeneous, is still fairly structured; more cluttered or highly deformable interactions would be a harder test.
- The method still depends on retargeted human interaction data and a mimic teacher during pre-training.
- It is not fully clear how far the DF abstraction can scale once interactions involve more complex articulated or deformable objects.

## 9. Takeaways

My main takeaway is that LESSMIMIC makes a compelling case that **interaction representation** is a bottleneck in humanoid manipulation. A policy that reasons through distance-field geometry can be both more adaptive than motion-tracking systems and more unified than task-specific reference-free controllers.

The paper does not solve long-horizon humanoid interaction in a complete sense. But it gives a strong recipe:

- use a geometry-centered interaction representation
- pre-train from physically valid demonstrations
- post-train with geometry randomization and interaction priors
- distill into vision for practical deployment

That feels like a solid direction for building humanoids that can actually chain contact-rich behaviors together in the real world.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**LESSMIMIC** 提出了一个基于 **Distance Field (DF)** 的统一 humanoid-object interaction 表示。它不再依赖动作参考轨迹，也不需要为每个技能单独手工设计奖励，而是用下面这些几何量来描述交互：

- 到物体表面的距离
- 距离场梯度
- 相对于表面法向 / 切向分解后的速度分量

基于这个表示，论文训练出了一个**单一的全身策略**，能够在不同物体几何与尺度上泛化、在失败后恢复，并且在长时序任务中组合多个技能。整篇论文最核心的观点是：**交互表示本身**就是 humanoid manipulation 的关键瓶颈。

## 论文信息

- **标题**: LESSMIMIC: Long-Horizon Humanoid Interaction with Unified Distance Field Representations
- **作者**: Yutang Lin, Jieming Cui, Yixuan Li, Baoxiong Jia, Yixin Zhu, Siyuan Huang
- **机构**: Peking University, BIGAI, Beijing Institute of Technology
- **项目主页**: [lessmimic.github.io](https://lessmimic.github.io)
- **arXiv**: [2602.21723](https://arxiv.org/abs/2602.21723)

## 1. 研究动机

论文针对 humanoid manipulation 中一个非常典型的问题：

- **reference-based** 方法动作质量高，但严重依赖演示中出现过的物体几何和参考轨迹
- **reference-free** 方法更灵活，但通常需要为每个任务单独设计奖励，最后只能学成一个个孤立技能

所以真正的问题变成了：什么样的交互表示，才能让 humanoid：

- 在推理时不需要参考动作
- 泛化到新的物体形状和尺度
- 在单一策略中组合不同交互技能
- 当环境偏离脚本时仍能恢复

作者认为，**Distance Field** 正好提供了这样一种统一接口。

## 2. 核心思路

LESSMIMIC 的关键做法，是用一种“几何感知但不绑定具体动作轨迹”的方式来表示 humanoid-object interaction。

对于机器人身体各个 link 相对于物体的位置，距离场可以提供：

- 到最近表面的距离
- 局部表面梯度 / 法向
- 将 link 速度分解为：
  - **法向速度**：靠近、施力、推压
  - **切向速度**：滑动、沿表面移动

这个表示的目标，是去捕捉**交互结构本身**，而不是记住某一条具体的参考动作轨迹。

这就是论文最核心的概念贡献。它不是告诉 humanoid “去跟踪这条 motion”，而是告诉 humanoid “去理解你的身体相对于物体几何是如何运动的”。

## 3. 方法概览

### 3.1 基于 DF 的交互表示

在表示层面，策略接收从物体距离场导出的几何信号。论文强调，绝对坐标本身是不够的，因为它无法表达 agent 当前是在接近、施压、滑动还是脱离物体。

因此方法使用：

- DF 数值
- DF 梯度
- 相对于法向和切向分解后的速度

这些时序交互特征再被一个 **VAE** 编码成交互 latent `z_t`，用于平滑信号并形成紧凑策略输入。

### 3.2 三阶段训练流程

整个训练流程分成三个阶段：

1. **Interaction skill pre-training**  
   教师策略 `pi_mimic` 跟踪从人类动作重定向而来的参考运动，并通过 residual 机制补偿接触动力学误差。学生策略 `pi_base` 再通过 DAgger 风格的行为克隆进行训练，但在推理时**不访问**任何参考动作。

2. **Discriminative post-training**  
   学生策略在几何随机化环境中用 RL 微调。这里不再使用参考跟踪奖励，而是使用 **Adversarial Interaction Priors (AIP)** 在 DF latent 空间中对交互有效性进行约束。

3. **Visual-motor distillation**  
   最后把依赖 MoCap 的完整策略蒸馏为只使用**第一视角深度图**的视觉策略，从而摆脱 motion-capture 基础设施。

这个设计很清晰：用 mimic 保证物理可行性，用 RL 获得几何泛化，用 distillation 提高部署可用性。

## 4. 为什么 Distance Field 有用

DF 在这里的价值不只是“编码了几何”这么简单。这个表示有三个重要特性：

- 它是**局部的**，所以换了物体形状之后依然有意义
- 它是**连续且可微的**，因此能提供平滑的几何反馈
- 它是**任务无关的**，同一个接口可以支持 pushing、pickup、carry、sit-stand 等不同交互

最后这一点最关键。LESSMIMIC 真正想做的，是为不同 humanoid-object interaction 建立一套共享语言。

## 5. 主要实验结果

## 5.1 物体尺度和形状泛化

论文在四个交互任务上评估了物体尺度变化下的泛化能力：

- PickUp
- SitStand
- Push
- Carry

训练尺度是 `1.0x`，测试范围则是 `0.4x` 到 `1.6x`。在 pickup 任务上，论文还额外变化了物体形状，包括 box、cylinder 和 sphere。

主要结论是：

- 一旦物体尺度偏离参考动作对应的几何，reference-based 基线会明显退化
- LESSMIMIC 在尺度变化下稳定得多
- MoCap 条件下的完整模型在多个 PickUp 和 SitStand 尺度泛化设置上报告了 **80-100%** 的成功率
- 真实世界中，策略还能从训练时的盒状物体泛化到**足球**，这说明策略更像是在利用几何关系，而不是死记动作轨迹

这是整篇论文最强的结果之一：相比依赖 motion reference 的方法，这种表示更能支持几何泛化。

## 5.2 长时序技能组合

论文进一步评估，单一策略能否在**不重置环境**的情况下顺序执行多个异质任务。

他们测试了长度为：

- `N = 5`
- `N = 10`
- `N = 15`
- `N = 25`
- `N = 40`

的随机任务组合。

完整的 MoCap 版本 LESSMIMIC 在这些设置下报告：

- `N=5` 时 **61.7%**
- `N=10` 时 **38.1%**
- `N=15` 时 **23.5%**
- `N=25` 时 **9.0%**
- `N=40` 时 **2.1%**

这些数字在超长序列上当然不算高，但重要的是，各种消融版本在更短的长度上就已经接近归零了。这说明统一 DF 表示确实有助于在长链执行中维持跨技能一致性。

## 5.3 失败恢复

论文一个很重要的定性结论是，策略能够在受扰动后恢复。例如物体掉到地上之后，humanoid 可以重新从新的位置发起 pickup，而不是因为参考轨迹失效就彻底崩掉。

这和表示设计本身是一致的：如果策略依赖的是当前几何关系，而不是一条固定 motion target，它就更有机会通过闭环控制隐式“重规划”。

## 5.4 真实世界部署

论文在真实 humanoid 平台上评估了 MoCap 版本和视觉版本策略。

报告结果包括：

- **MoCap-based**
  - PickUp `22 cm^3`: `10/10`
  - PickUp `60 cm^3`: `8/10`
  - SitStand `12 cm`: `8/10`
  - SitStand `46 cm`: `10/10`
- **Vision-based**
  - PickUp `22 cm^3`: `8/10`
  - PickUp `60 cm^3`: `7/10`

视觉版本比 MoCap 版本弱一些，但依然有比较可用的效果，这支持了论文的说法：基于 DF 的交互逻辑是可以被蒸馏到深度视觉部署中的。

## 6. 消融实验启示

这些消融实验很有价值，因为它们表明系统并不是靠某一个 trick 偶然成功的。

- 去掉 **AIP** 后，尺度泛化能力明显下降，说明 adversarial interaction prior 对几何一致性交互很关键。
- 去掉 **synthetic physicalization** 后，carry 这类强接触任务受损最严重，说明教师数据的物理可行性很重要。
- 去掉 **geometry randomization** 后，在训练尺度之外几乎彻底过拟合。
- 去掉 **RL post-training** 后，仅靠行为克隆无法获得强泛化能力。
- 用 **MLP** 替代 Transformer 后，尤其在需要时间依赖的任务上性能明显下降。

整体看下来，论文的结论是：完整系统缺一不可，表示、物理可行预训练、对抗式后训练和足够模型容量都很关键。

## 7. 优点

- 论文把问题重心放在“交互表示”上，而不只是奖励设计或 imitation 质量。
- DF 表示直观，而且天然支持任务共享。
- 相比 motion-tracking 基线，尺度/形状泛化证据比较强。
- 长时序技能组合是一个比单任务成功率更有意义的评测。
- 论文给出了一条从 MoCap 特权训练走向第一视角深度部署的现实路径。

## 8. 局限与开放问题

- 视觉版模型与 MoCap 版之间仍有明显性能差距。
- 到 `N=25` 和 `N=40` 时，长时序成功率下降很明显，距离真正稳健的开放式执行还很远。
- 任务虽然是异质的，但整体仍然比较结构化；如果是更杂乱场景或可变形物体，难度会更高。
- 预训练阶段依然依赖人类交互数据重定向和 mimic teacher。
- 对于更复杂的 articulated / deformable object interaction，DF 这个抽象还能扩展多远，目前并不完全清楚。

## 9. Takeaways

我对这篇论文的主要判断是：LESSMIMIC 很有说服力地说明了，**交互表示**是 humanoid manipulation 的关键瓶颈。一个通过 distance-field geometry 来推理的策略，既可能比 motion-tracking 系统更灵活，也可能比 task-specific 的 reference-free 控制器更统一。

这篇论文当然还没有彻底解决 long-horizon humanoid interaction，但它给出了一个很强的配方：

- 用几何中心化的交互表示
- 用物理可行的示范做预训练
- 用几何随机化和 interaction prior 做后训练
- 最后蒸馏到视觉部署

这看起来是一个很扎实的方向，有希望让 humanoid 真正在真实世界里把多种接触技能串起来执行。

</div>
