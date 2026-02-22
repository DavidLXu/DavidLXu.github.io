---
title: "[Paper Notes] BFM-Zero: A Promptable Behavioral Foundation Model for Humanoid Control Using Unsupervised Reinforcement Learning (arXiv 2025)"
date: 2026-02-23
permalink: /posts/2026/02/bfm-zero-paper-notes/
tags:
  - Robotics
  - Humanoid
  - Reinforcement Learning
  - Unsupervised RL
  - Sim2Real
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**BFM-Zero** is a humanoid-control foundation model built with **off-policy unsupervised RL** (instead of standard PPO-style task-specific training). It learns a **shared latent task space** that can be prompted for:

- zero-shot **motion tracking**
- zero-shot **goal reaching**
- zero-shot **reward optimization**
- few-shot **latent-space adaptation** (without finetuning network weights)

The paper's main contribution is not just a single algorithmic trick, but a full sim-to-real recipe combining:

- Forward-Backward (FB) unsupervised RL representations
- motion-data regularization (FB-CPR lineage)
- asymmetric history-based learning
- domain randomization
- safety/feasibility reward regularization

They demonstrate the system on a **real Unitree G1 humanoid**, including recovery from large perturbations and promptable behavior composition.

## Paper Info

- **Title**: BFM-Zero: A Promptable Behavioral Foundation Model for Humanoid Control Using Unsupervised Reinforcement Learning
- **Authors**: Yitang Li, Zhengyi Luo, Tonghe Zhang, et al.
- **Affiliations**: Carnegie Mellon University, Meta
- **Venue**: arXiv preprint (submitted **2025-11-06**)
- **arXiv**: [2511.04131](https://arxiv.org/abs/2511.04131)
- **Project page** (paper first page): [BFM-Zero Website](https://lecar-lab.github.io/BFM-Zero/)

## 1. Motivation and Problem Setting

The paper targets a core gap in humanoid control:

- Many strong humanoid systems are **task-specific** (especially tracking).
- Many rely on **on-policy RL** (e.g., PPO) with explicit rewards.
- It is hard to get large-scale humanoid action-label datasets for pure behavior cloning.

The authors ask whether **off-policy unsupervised RL** can train a reusable, promptable behavioral foundation model for humanoids that supports multiple downstream tasks without retraining.

They formulate real-world humanoid control as a **POMDP** and train in simulation with:

- privileged state available in sim
- partial observations for the actor (plus history)
- a motion dataset of unlabeled trajectories used as behavioral regularization

## 2. Core Idea: A Promptable Behavioral Foundation Model

BFM-Zero learns:

- a **shared latent task space** `Z`
- a **promptable policy** conditioned on latent vector `z`

Different task types are mapped into the same latent space:

- **Goal reaching**: prompt with a latent derived from a target state
- **Reward optimization**: infer a latent from reward-weighted state embeddings
- **Tracking**: generate a sequence of latent prompts from a motion trajectory

This gives a unified interface for humanoid behaviors instead of training separate policies per task.

## 3. Method Overview

### 3.1 Built on Forward-Backward (FB) Unsupervised RL

The method builds on **Forward-Backward representations** and **FB-CPR**:

- `B(s)` encodes states into a latent/task-related representation
- `F(s, a, z)` behaves like a latent-conditioned successor-feature-style quantity
- `z` defines a task/objective in latent space

The paper emphasizes that this latent space is structured enough to support:

- explainable prompting
- zero-shot task execution
- interpolation between skills
- few-shot optimization in latent space

### 3.2 Key Sim-to-Real Design Choices (Most Important in Practice)

The paper highlights several design choices needed to make unsupervised RL work on real humanoids:

- **Asymmetric learning**: actor uses observation history, critics use privileged information
- **Domain randomization**: masses, friction, offsets, perturbations, sensor noise
- **Reward regularization**: auxiliary penalties for safety / physically feasible behavior
- **Large-scale off-policy training**: many parallel environments, replay buffer, high UTD ratio

This is the strongest practical lesson from the paper: the success comes from the **combination** of representation learning and systems-level sim-to-real engineering.

### 3.3 Training Objective (High Level)

BFM-Zero combines multiple components during training:

- an FB objective for learning long-horizon latent dynamics / representations
- an auxiliary critic for safety and physical constraints
- a discriminator/style critic to bias behaviors toward motion-data realism
- a policy objective that balances task value, style, and regularization terms

The result is a policy that is both:

- broad enough to support different prompts
- constrained enough to remain stable and human-like on hardware

## 4. Zero-Shot Inference Modes (Why This Paper Is Interesting)

The same pre-trained model supports multiple downstream uses:

### 4.1 Zero-shot Tracking

Given a motion trajectory, BFM-Zero derives a sequence of latent prompts and tracks the motion without retraining.

### 4.2 Zero-shot Goal Reaching

A target pose/state is embedded into the latent space and used as a prompt. The paper shows smooth transitions and reasonable behavior even for difficult or partially infeasible targets.

### 4.3 Zero-shot Reward Optimization

A reward function can be converted into a latent prompt via replay-buffer samples and state embeddings. This enables:

- locomotion commands
- arm-raise commands
- crouching / sitting-like behaviors
- combined rewards (composed skills)

This is an unusually clean interface: the same model can be prompted by rewards, goals, or motions.

## 5. Experiments and Results

## 5.1 Training / Setup

- **Robot**: Unitree G1 humanoid
- **Simulation**: IsaacLab for training (paper reports simulation at `200 Hz`, control at `50 Hz`)
- **Behavior dataset**: retargeted **LAFAN1** motions (40 several-minute motions)
- **Also evaluated**: Mujoco sim transfer and a Booster T1 humanoid in appendix

## 5.2 Simulation Validation (Zero-shot)

The paper evaluates:

- tracking
- reward optimization
- pose/goal reaching

Key reported observations:

- Domain-randomized deployable BFM-Zero performs somewhat worse than a privileged no-DR version, but remains strong.
- The paper reports drops of about **2.47% / 25.86% / 10.65%** across tracking / reward / pose-reaching compared with the idealized privileged setting.
- Sim-to-sim transfer to Mujoco shows relatively small degradation (reported variations under ~7%).
- The model also generalizes to out-of-distribution AMASS motions/poses (evaluated in Mujoco).

## 5.3 Real-Robot Results (Main Highlight)

The real-robot section demonstrates:

- **tracking** of diverse motions (including dynamic behaviors)
- **goal reaching** with smooth transitions
- **reward optimization** for locomotion / posture / arm control
- **disturbance rejection and recovery** (pushes, kicks, being dragged/falling)

A particularly notable claim is that recovery looks natural/human-like rather than brittle or overly aggressive.

## 5.4 Few-Shot Adaptation Without Finetuning Weights

The paper adapts behavior by optimizing in **latent prompt space**:

- **Single-pose adaptation**: with a **4 kg** payload, optimized latent prompt improves single-leg standing from failure (<5s collision) to >15s balance.
- **Trajectory adaptation**: under friction shift, latent-sequence optimization improves tracking error by about **29.1%**.

This is a strong demonstration of prompt-level adaptation for control.

## 6. Latent Space Structure (Interpretability / Compositionality)

The authors visualize the latent space (t-SNE) and show:

- semantically similar motions cluster together
- different task types occupy structured regions
- interpolating latent vectors yields meaningful intermediate behaviors

This supports their "promptable BFM" framing: the latent space is not just a hidden internal variable, but a usable interface.

## 7. Strengths

- Clear and ambitious objective: a **promptable humanoid behavioral foundation model**
- Strong real-world focus, not simulation-only
- Unified interface across **tracking / goals / rewards**
- Practical sim-to-real recipe (asymmetric learning + DR + regularization)
- Compelling prompt-space adaptation results without network finetuning
- Good qualitative emphasis on robustness and natural recovery

## 8. Limitations / Open Questions

The paper explicitly notes several limitations (Discussion):

- Behavior scope depends on the training motion data distribution
- More work is needed on scaling laws (data size / architecture / performance)
- Sim-to-real gap is reduced but not solved; stronger online adaptation may be needed
- Fast adaptation and finetuning are only preliminarily explored

My additional practical questions:

- How robust is reward-to-latent inference when replay-buffer samples shift under stronger domain randomization?
- How much of the real-world quality comes from the discriminator/style prior vs. the FB latent structure itself?
- What is the failure boundary for more contact-rich manipulation-like humanoid tasks?

## 9. Takeaways for Robotics Research

- **Off-policy unsupervised RL** for real humanoids is more viable than many people assume.
- A reusable humanoid controller may benefit from a **latent prompt interface** instead of task-specific policies.
- Sim-to-real success here is heavily driven by **engineering choices**, not only the base algorithm.
- Prompt-space optimization is a promising middle ground between zero-shot execution and full policy finetuning.

## 10. Notes for Future Reading

If I revisit this paper, I would look more closely at:

- Appendix details on architecture/data-size scaling
- reward inference stability and dataset choice
- how this compares empirically to newer humanoid RL pipelines and VLA-style humanoid systems

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过网站顶部语言切换按钮在 **English / 中文** 间切换。

## TL;DR

**BFM-Zero** 是一个面向人形机器人全身控制的“行为基础模型（Behavioral Foundation Model）”，其核心不是传统的任务专用 PPO 管线，而是基于 **off-policy 无监督强化学习（unsupervised RL）** 构建一个可提示（promptable）的统一策略。

它学习一个共享的潜在任务空间 `Z`，同一个模型可在不重训练的情况下完成：

- 零样本 **动作跟踪（tracking）**
- 零样本 **目标姿态到达（goal reaching）**
- 零样本 **奖励优化（reward optimization）**
- 少样本 **潜在空间适配（few-shot latent adaptation）**

论文的真正价值在于一整套可落地的 sim-to-real 配方，而不只是某个单点算法改进：

- Forward-Backward (FB) 无监督 RL 表征
- 基于动作数据的行为正则（FB-CPR 路线）
- 非对称历史输入训练（asymmetric history-based learning）
- 域随机化（domain randomization）
- 安全/物理可行性奖励正则

作者在真实 **Unitree G1** 上展示了多种可提示行为，以及较强的扰动恢复能力。

## 论文信息

- **标题**: BFM-Zero: A Promptable Behavioral Foundation Model for Humanoid Control Using Unsupervised Reinforcement Learning
- **作者**: Yitang Li, Zhengyi Luo, Tonghe Zhang, 等
- **机构**: Carnegie Mellon University, Meta
- **论文类型**: arXiv 预印本（提交日期 **2025-11-06**）
- **arXiv**: [2511.04131](https://arxiv.org/abs/2511.04131)
- **项目主页**（论文首页给出）: [BFM-Zero Website](https://lecar-lab.github.io/BFM-Zero/)

## 1. 问题动机

这篇论文试图解决人形机器人控制中的一个关键矛盾：

- 许多强结果仍然是**任务专用**的（尤其是 tracking）
- 很多方法依赖 **on-policy RL**（如 PPO）和显式奖励设计
- 人形机器人的大规模动作标签/遥操作数据并不像操作任务那样容易获得

作者提出的问题是：能否用 **off-policy 无监督 RL** 训练一个“可提示”的行为基础模型，让它在不重训练的情况下支持多种下游任务？

论文将真实人形控制建模为 **POMDP**，在仿真中训练，并结合：

- 仿真可用的特权状态（privileged state）
- 策略端使用部分观测 + 历史
- 无标注动作轨迹数据集用于行为正则

## 2. 核心思想：统一潜在空间 + 可提示策略

BFM-Zero 学习两部分：

- 一个共享的潜在任务空间 `Z`
- 一个以潜在向量 `z` 为条件的策略（promptable policy）

不同类型任务都映射到同一个 `Z` 空间中：

- **目标到达**：将目标状态编码成潜在向量
- **奖励优化**：通过奖励加权的状态嵌入推断潜在向量
- **动作跟踪**：从目标动作序列生成一串潜在提示

这样就不需要为每类任务分别训练策略，而是使用统一模型接口。

## 3. 方法概览

### 3.1 基于 Forward-Backward (FB) 无监督 RL 表征

论文方法建立在 **FB 表征** 与 **FB-CPR** 之上：

- `B(s)`：状态的潜在/任务相关表示
- `F(s, a, z)`：潜在条件下的长期动态表示（可理解为 successor-feature 风格）
- `z`：潜在空间中的任务/目标提示

论文强调，这个潜在空间具备结构性，因此可以支持：

- 可解释的 prompt 接口
- 零样本执行下游任务
- 技能插值
- 潜在空间内少样本优化

### 3.2 真正关键：让无监督 RL 能落地到真实人形的工程设计

为了实现 sim-to-real，作者强调了几项关键设计：

- **非对称学习（Asymmetric learning）**：actor 使用观测历史，critic 使用特权信息
- **域随机化（DR）**：质量、摩擦、偏置、扰动、传感器噪声等
- **奖励正则化**：引入辅助惩罚，避免不安全/物理不合理动作
- **大规模 off-policy 训练**：大量并行环境、回放缓冲区、高 UTD 比例

这篇论文最值得借鉴的点之一是：效果来自 **表征学习 + sim-to-real 工程组合拳**，而不是单独某个损失函数。

### 3.3 训练目标（高层理解）

BFM-Zero 的训练包含多个组件：

- 用于学习长期潜在动态/表征的 FB 目标
- 用于安全与物理约束的辅助 critic
- 将行为拉向“更像人类动作”的判别器 / 风格 critic
- 同时平衡任务价值、风格项与正则项的策略目标

最终得到的策略既能保持稳定和自然，又能通过潜在提示执行多样任务。

## 4. 零样本推理模式（这篇论文最有意思的地方）

同一个预训练模型支持多种下游使用方式：

### 4.1 零样本动作跟踪（Tracking）

给定动作轨迹，模型生成一串潜在提示并进行跟踪，无需重训练。

### 4.2 零样本目标姿态到达（Goal Reaching）

将目标姿态/状态编码到潜在空间后作为 prompt。论文展示了平滑过渡，并且对一些较难甚至部分不可行的目标也能给出合理行为。

### 4.3 零样本奖励优化（Reward Optimization）

通过回放缓冲区状态样本与状态嵌入，可以把奖励函数转换成潜在提示。这使得同一模型能完成：

- 行走/移动速度控制
- 抬臂
- 下蹲/坐姿类行为
- 奖励线性组合带来的技能组合

这类“奖励 / 目标 / 动作”统一到一个 prompt 接口的设计非常有启发性。

## 5. 实验与结果

## 5.1 训练与系统设置

- **机器人**: Unitree G1
- **训练仿真**: IsaacLab（论文中提到仿真 `200 Hz`，控制频率 `50 Hz`）
- **行为数据**: 重定向到 G1 的 **LAFAN1** 数据集（40 段数分钟动作）
- **附录扩展**: 还做了 Mujoco 测试与 Booster T1 的泛化展示

## 5.2 仿真零样本验证

论文评估了三类任务：

- tracking
- reward optimization
- pose/goal reaching

一些关键结论：

- 可部署版本（带 DR）相比“特权 + 无 DR”的理想版本会有下降，但整体性能仍然可用
- 论文报告相对理想配置在 tracking / reward / pose-reaching 上约有 **2.47% / 25.86% / 10.65%** 的下降
- 在 Mujoco 中进行 sim-to-sim 测试时，性能变化整体较小（报告中约小于 7%）
- 对 OOD 的 AMASS 动作/姿态也表现出一定泛化能力

## 5.3 真实机器人结果（论文亮点）

真实 G1 上展示了：

- 多种动作的 **tracking**
- 平滑的 **goal reaching**
- 面向移动/姿态/手臂控制的 **reward optimization**
- **抗扰动与恢复能力**（推、踢、被拖倒后恢复）

论文特别强调恢复行为的“自然性”和“类人性”，而非仅仅是硬抗不倒。

## 5.4 少样本适配（不微调网络权重）

作者在 **潜在提示空间** 进行优化，而不是微调模型参数：

- **单姿态适配**：在躯干增加 **4 kg** 载荷后，通过优化 latent prompt，使单腿站立从未适配时的 <5 秒失败提升到 >15 秒稳定
- **轨迹适配**：在摩擦变化下进行潜在序列优化，tracking 误差约降低 **29.1%**

这说明“prompt-level adaptation”在控制场景中是一个非常值得继续挖掘的方向。

## 6. 潜在空间结构（可解释性 / 可组合性）

论文通过 t-SNE 可视化潜在空间，并展示：

- 语义相近动作会聚类
- 不同任务形式在空间中具有结构
- 潜在向量插值可以生成有意义的中间行为

这使“可提示行为基础模型”的表述更可信，因为潜在空间确实在行为层面可用，而不只是训练中的隐变量。

## 7. 优点

- 目标清晰且有野心：构建 **可提示的人形行为基础模型**
- 重点在真实机器人验证，而非仅仿真
- 用统一接口覆盖 **tracking / goals / rewards**
- sim-to-real 工程方案完整（非对称学习 + 域随机化 + 正则）
- 不微调权重的 prompt 空间适配结果很有说服力
- 对鲁棒性和自然恢复的展示很强

## 8. 局限性与开放问题

论文在 Discussion 中明确提到的限制包括：

- 行为范围与性能受训练动作数据分布约束
- 需要进一步研究数据规模/模型规模/性能之间的关系（类似 scaling law）
- sim-to-real gap 仍未彻底解决，需要更强的在线适应能力
- 快速适配与微调目前仍是初步探索

我额外关心的几个问题：

- 更强域随机化下，reward-to-latent 推断对采样数据分布偏移是否稳定？
- 真实效果中，判别器/风格先验与 FB 潜在结构各自贡献有多大？
- 对更强接触、更复杂交互任务（例如类操作任务）失败边界在哪里？

## 9. 我的研究启发

- **off-policy 无监督 RL** 在真实人形上的潜力比常见印象更大
- 人形控制的统一接口可以是 **潜在 prompt 空间**，而不一定是任务专用策略集合
- 这类系统的成功很大程度上依赖 **工程组合设计**，不只是基础算法
- prompt 空间优化是零样本执行与全量策略微调之间一个很有价值的折中方案

## 10. 后续阅读关注点

如果后续继续深入，我会重点看：

- 附录中的模型规模 / 数据规模消融
- reward inference 的稳定性与数据来源选择
- 与更新的人形 RL 管线、以及 VLA 风格人形系统的实证对比

</div>
