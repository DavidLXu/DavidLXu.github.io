---
title: "[Paper Notes] EVA: Aligning Video World Models with Executable Robot Actions via Inverse Dynamics Rewards"
date: 2026-04-10
permalink: /posts/2026/04/eva-paper-notes/
tags:
  - Video World Models
  - Robotics
  - Reinforcement Learning
  - Alignment
  - Inverse Dynamics
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**EVA (Executable Video Alignment)** identifies and addresses the **executability gap** in video world models for robotics — where visually coherent generated rollouts can still produce infeasible robot actions. The key idea: train an **inverse dynamics model (IDM)** on real robot data, then repurpose it as a **reward model** to post-train the video generator via GRPO. The reward penalizes non-smooth motions (high acceleration/jerk) and out-of-bound actions, directly aligning generated videos with physical executability. On the RoboTwin benchmark and a real bimanual robot, EVA improves kinematic plausibility by +20.9% and boosts real-world task success from 52% to 64% (seen) and 42% to 60% (OOD).

## Paper Info

- **Title**: Aligning Video World Models with Executable Robot Actions via Inverse Dynamics Rewards
- **Authors**: Ruixiang Wang, Qingming Liu, Yueci Deng, Guiliang Liu, Zhen Liu, Kui Jia
- **Affiliation**: The Chinese University of Hong Kong, Shenzhen; DexForce Technology Co., Ltd.
- **Date**: 2026-03-24
- **Venue**: arXiv preprint
- **arXiv**: [2603.17808](https://arxiv.org/abs/2603.17808)
- **Project Page**: [eva-project-page.github.io](https://eva-project-page.github.io/)

## 1. Problem and Motivation

Video generative models are increasingly used as **world models** for robotic manipulation in a decoupled paradigm:

1. A **video world model** generates a future visual rollout conditioned on the current observation and language instruction
2. An **inverse dynamics model (IDM)** converts the generated frames into executable robot actions

The problem: current video world models are optimized for **visual realism** but lack **executability constraints**. Even visually coherent rollouts can contain:

- **Morphological deformations** — arm stretching or melting
- **Joint ambiguity** — unclear articulation states
- **Temporal discontinuities** — abrupt jumps between frames

When decoded by an IDM, these artifacts translate into **unstable control signals**: high-frequency jitter, abrupt joint jumps, or out-of-bounds commands. The authors call this the **executability gap**.

While this gap can be mitigated at inference time (e.g., rejection sampling), such approaches are inefficient given the high cost of video generation. EVA instead addresses this at **training time**.

## 2. Method: Executable Video Alignment

### 2.1 Inverse Dynamics Model (IDM)

The IDM predicts robot actions from short temporal windows of visual observations:

\\(\mathcal{L}_{\text{IDM}} = \mathbb{E}\left[\sum_t \|f_\phi(I_{t-k:t+k}) - a_t^{gt}\|_2^2\right]\\)

Architecture: convolutional backbone → spatial softmax → MLP. The spatial softmax produces keypoint-like 2D coordinates per channel, which proves more stable than global pooling when decoding actions from generated (potentially artifact-laden) rollouts.

### 2.2 IDM-based Executability Reward

Given a generated video \\(V\\), the frozen IDM predicts joint commands \\(A = \{a_t\}_{t=1}^T\\). The reward evaluates the **action sequence** along two axes:

**Smoothness penalties** — Huber penalties on acceleration and jerk (finite differences of IDM-decoded actions):

\\(P_\alpha = \mathbb{E}_t[\text{Huber}(\alpha_t; \delta_\alpha)], \quad P_j = \mathbb{E}_t[\text{Huber}(j_t; \delta_j)]\\)

**Embodiment limit penalties** — penalize violations of velocity and acceleration bounds:

\\(P_{\text{vel}} = \mathbb{E}_t\|\max(|v_t| - v_{\max}, 0)\|_2^2, \quad P_{\text{acc}} = \mathbb{E}_t\|\max(|\alpha_t| - a_{\max}, 0)\|_2^2\\)

The total penalty is combined into a bounded reward:

\\(R(V) = \left(\frac{1 + P(A)}{P_0}\right)^{-\gamma}\\)

where \\(P_0\\) is estimated from rollouts of the pretrained model, and \\(\gamma\\) controls decay rate.

**Key insight**: the reward remains informative even when generated videos contain **severe visual artifacts**, because such artifacts typically translate into unstable or out-of-bound actions — providing a strong penalty signal.

### 2.3 RL Post-Training via GRPO

EVA uses **Flow-GRPO** (Group Relative Policy Optimization adapted for flow-matching models) to fine-tune the video generator:

- Sample \\(G=8\\) rollouts per prompt from a stochastic SDE derived from the flow model
- Score each rollout with the IDM-based reward
- Compute group-relative advantages: \\(\hat{A}_i = (R_i - \mu_R) / (\sigma_R + \epsilon)\\)
- Optimize using clipped policy gradient with KL regularization against the reference model

The IDM is kept **frozen** during GRPO fine-tuning — it serves purely as a reward model.

## 3. Experiments and Main Results

### Base Model

- Wan2.1-14B DiT backbone with diffusion forcing
- Initialized from the Large Video Planner (LVP) checkpoint
- SFT on embodiment-specific data → then GRPO with IDM reward
- LoRA rank 32, 8× A800 GPUs, batch size 32

### Visual Rollout Quality (Human Evaluation, 210 prompts)

| Method | Kinematic | Interaction | Instruction | Perfect |
|---|---|---|---|---|
| Vidar (Wan2.2) | 67.6% | 66.7% | 87.6% | 62.9% |
| EVA (w/o RL) | 70.5% | 83.3% | 90.5% | 68.1% |
| **EVA (with RL)** | **91.4%** | **86.2%** | 89.5% | **83.8%** |

EVA improves kinematic plausibility by **+20.9%** and perfect execution by **+15.7%** over the SFT-only baseline.

### Simulation (RoboTwin 2.0, 21 bimanual tasks)

| Method | Average Success |
|---|---|
| ACT | 29.0% |
| Diffusion Policy | 29.5% |
| RDT | 37.1% |
| π₀ | 45.7% |
| EVA (w/o RL) | 46.2% |
| **EVA (with RL)** | **52.6%** |

EVA outperforms strong VLA baselines (π₀) while using a single multi-task policy across all 21 tasks (baselines are per-task).

### Real-World Deployment (Agilex CobotMagic bimanual platform)

| Method | Seen (5 tasks) | OOD (5 tasks) |
|---|---|---|
| ACT | 42.0% | N/A |
| π₀ | 51.0% | 11.0% |
| Vidar | 44.0% | 34.0% |
| GE-Act | 43.0% | 3.0% |
| EVA (w/o RL) | 52.0% | 42.0% |
| **EVA (with RL)** | **64.0%** | **60.0%** |

Particularly strong OOD generalization: **60%** success on novel tasks, far exceeding π₀ (11%) and GE-Act (3%).

### IDM Validation

The IDM achieves **89.52%** success rate when decoding ground-truth video demonstrations on RoboTwin, confirming it is a reliable reward model for the alignment phase.

## 4. Strengths

- **Elegant problem formulation**: the executability gap is a real and underexplored issue — using the IDM as both action decoder and reward model is a clean, dual-purpose design
- **Dense reward from action space**: the reward remains informative even for badly artifact-laden videos, since visual artifacts reliably produce kinematic violations
- **Strong OOD generalization**: the video world model paradigm + alignment produces the best generalization to novel tasks among all tested methods
- **Practical simplicity**: only requires an IDM trained on real robot data + domain knowledge about joint limits — no learned value function or human feedback needed

## 5. Limitations

- **No contact dynamics modeling**: the reward focuses on kinematic smoothness but does not model forces, friction, or torques — critical for precision contact-rich tasks
- **Computational cost**: diffusion-based video generation is expensive, limiting applicability to high-frequency reactive control
- **Open-loop execution**: the receding-horizon approach helps, but true closed-loop control with video world models remains challenging
- **IDM as bottleneck**: the 89.52% IDM accuracy means ~10% of failures may stem from the IDM itself, not the video generator

## 6. Takeaways

- **Executability as an alignment target**: shifting from visual/semantic fidelity to physical feasibility is a promising direction for robotic world models. The action space provides a natural, dense signal for alignment.
- **IDM dual use**: training an IDM for action decoding and then repurposing it as a reward model is efficient — no additional reward model training needed.
- **Video world models generalize better**: the decoupled paradigm (video planner + IDM) consistently shows stronger OOD performance than end-to-end VLA policies, likely due to leveraging internet-scale video priors.
- **RL post-training works for video generation**: the success of Flow-GRPO for aligning video world models mirrors the RLHF paradigm in LLMs, suggesting this could become standard practice for robotic video generation.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## 摘要

**EVA（Executable Video Alignment，可执行视频对齐）** 识别并解决了机器人视频世界模型中的**可执行性差距**——即视觉上连贯的生成视频仍然可能产生不可行的机器人动作。核心思路：在真实机器人数据上训练一个**逆动力学模型（IDM）**，然后将其复用为**奖励模型**，通过 GRPO 对视频生成器进行后训练。奖励函数惩罚非平滑运动（高加速度/冲击）和超出范围的动作，直接将生成视频与物理可执行性对齐。在 RoboTwin 基准和真实双臂机器人上，EVA 将运动学合理性提升了 +20.9%，真实世界任务成功率从 52% 提升至 64%（已见任务），从 42% 提升至 60%（分布外任务）。

## 论文信息

- **标题**: Aligning Video World Models with Executable Robot Actions via Inverse Dynamics Rewards
- **作者**: Ruixiang Wang, Qingming Liu, Yueci Deng, Guiliang Liu, Zhen Liu, Kui Jia
- **机构**: 香港中文大学（深圳）；DexForce Technology Co., Ltd.
- **日期**: 2026-03-24
- **发表**: arXiv 预印本
- **arXiv**: [2603.17808](https://arxiv.org/abs/2603.17808)
- **项目主页**: [eva-project-page.github.io](https://eva-project-page.github.io/)

## 1. 问题与动机

视频生成模型在机器人操作中越来越多地被用作**世界模型**，采用解耦范式：

1. **视频世界模型**根据当前观测和语言指令生成未来的视觉轨迹
2. **逆动力学模型（IDM）** 将生成的帧转换为可执行的机器人动作

问题在于：当前的视频世界模型针对**视觉真实感**进行优化，但缺乏**可执行性约束**。即使视觉上连贯的轨迹也可能包含：

- **形态变形** — 机械臂拉伸或融化
- **关节模糊** — 不清晰的关节状态
- **时间不连续** — 帧间突然跳变

当被 IDM 解码时，这些伪影转化为**不稳定的控制信号**：高频抖动、关节突变或超出范围的指令。作者将此称为**可执行性差距（executability gap）**。

虽然可以在推理时通过拒绝采样等方法缓解这一差距，但考虑到视频生成的高计算成本，这些方法效率低下。EVA 选择在**训练阶段**解决这个问题。

## 2. 方法：可执行视频对齐

### 2.1 逆动力学模型（IDM）

IDM 从短时间窗口的视觉观测中预测机器人动作：

\\(\mathcal{L}_{\text{IDM}} = \mathbb{E}\left[\sum_t \|f_\phi(I_{t-k:t+k}) - a_t^{gt}\|_2^2\right]\\)

架构：卷积主干 → 空间 softmax → MLP。空间 softmax 为每个通道生成类似关键点的 2D 坐标，在从生成的（可能含伪影的）轨迹中解码动作时比全局池化更稳定。

### 2.2 基于 IDM 的可执行性奖励

给定生成视频 \\(V\\)，冻结的 IDM 预测关节指令 \\(A = \{a_t\}_{t=1}^T\\)。奖励沿两个维度评估**动作序列**：

**平滑性惩罚** — 对加速度和冲击（IDM 解码动作的有限差分）施加 Huber 惩罚：

\\(P_\alpha = \mathbb{E}_t[\text{Huber}(\alpha_t; \delta_\alpha)], \quad P_j = \mathbb{E}_t[\text{Huber}(j_t; \delta_j)]\\)

**本体限制惩罚** — 惩罚违反速度和加速度边界的情况：

\\(P_{\text{vel}} = \mathbb{E}_t\|\max(|v_t| - v_{\max}, 0)\|_2^2, \quad P_{\text{acc}} = \mathbb{E}_t\|\max(|\alpha_t| - a_{\max}, 0)\|_2^2\\)

总惩罚组合为有界奖励：

\\(R(V) = \left(\frac{1 + P(A)}{P_0}\right)^{-\gamma}\\)

其中 \\(P_0\\) 从预训练模型的轨迹中估计，\\(\gamma\\) 控制衰减速率。

**关键洞察**：即使生成的视频包含**严重的视觉伪影**，奖励仍然具有信息量，因为这些伪影通常会转化为不稳定或超出范围的动作——提供强惩罚信号。

### 2.3 通过 GRPO 进行 RL 后训练

EVA 使用 **Flow-GRPO**（适配流匹配模型的分组相对策略优化）微调视频生成器：

- 每个提示采样 \\(G=8\\) 条轨迹
- 使用 IDM 奖励对每条轨迹评分
- 计算组内相对优势：\\(\hat{A}_i = (R_i - \mu_R) / (\sigma_R + \epsilon)\\)
- 使用裁剪策略梯度 + 对参考模型的 KL 正则化进行优化

IDM 在 GRPO 微调期间保持**冻结**——纯粹作为奖励模型使用。

## 3. 实验与主要结果

### 基础模型

- Wan2.1-14B DiT 主干 + 扩散强制
- 从 Large Video Planner (LVP) 检查点初始化
- 在特定本体数据上 SFT → 然后使用 IDM 奖励进行 GRPO
- LoRA 秩 32，8 块 A800 GPU，批大小 32

### 视觉轨迹质量（人工评估，210 个提示）

| 方法 | 运动学 | 交互 | 指令遵循 | 完美执行 |
|---|---|---|---|---|
| Vidar (Wan2.2) | 67.6% | 66.7% | 87.6% | 62.9% |
| EVA (无 RL) | 70.5% | 83.3% | 90.5% | 68.1% |
| **EVA (有 RL)** | **91.4%** | **86.2%** | 89.5% | **83.8%** |

EVA 将运动学合理性提升了 **+20.9%**，完美执行率提升了 **+15.7%**。

### 仿真实验（RoboTwin 2.0，21 个双臂任务）

| 方法 | 平均成功率 |
|---|---|
| ACT | 29.0% |
| Diffusion Policy | 29.5% |
| RDT | 37.1% |
| π₀ | 45.7% |
| EVA (无 RL) | 46.2% |
| **EVA (有 RL)** | **52.6%** |

EVA 使用单一多任务策略覆盖全部 21 个任务，超越了强 VLA 基线（π₀），而基线方法是逐任务训练的。

### 真实世界部署（Agilex CobotMagic 双臂平台）

| 方法 | 已见任务 (5个) | 分布外任务 (5个) |
|---|---|---|
| ACT | 42.0% | N/A |
| π₀ | 51.0% | 11.0% |
| Vidar | 44.0% | 34.0% |
| GE-Act | 43.0% | 3.0% |
| EVA (无 RL) | 52.0% | 42.0% |
| **EVA (有 RL)** | **64.0%** | **60.0%** |

分布外泛化能力尤其突出：新任务上 **60%** 的成功率，远超 π₀（11%）和 GE-Act（3%）。

### IDM 验证

IDM 在 RoboTwin 上解码真实视频演示时达到 **89.52%** 的成功率，验证了其作为对齐阶段奖励模型的可靠性。

## 4. 优势

- **优雅的问题定义**：可执行性差距是一个真实且未被充分探索的问题——将 IDM 同时用作动作解码器和奖励模型是一个简洁的双重用途设计
- **来自动作空间的密集奖励**：即使对于严重伪影的视频，奖励仍然具有信息量，因为视觉伪影可靠地产生运动学违规
- **强大的分布外泛化**：视频世界模型范式 + 对齐在所有测试方法中产生了最好的新任务泛化能力
- **实践上的简洁性**：仅需在真实机器人数据上训练的 IDM + 关于关节限制的领域知识——不需要学习的价值函数或人类反馈

## 5. 局限性

- **无接触动力学建模**：奖励聚焦于运动学平滑性，未建模力、摩擦或扭矩——这对精密接触丰富的任务至关重要
- **计算成本高**：基于扩散的视频生成成本昂贵，限制了在高频反应式控制中的适用性
- **开环执行**：滚动视界方法有所帮助，但使用视频世界模型的真正闭环控制仍具挑战
- **IDM 瓶颈**：89.52% 的 IDM 准确率意味着约 10% 的失败可能源于 IDM 本身，而非视频生成器

## 6. 要点总结

- **可执行性作为对齐目标**：从视觉/语义保真度转向物理可行性是机器人世界模型的一个有前景的方向。动作空间提供了自然的密集对齐信号。
- **IDM 的双重用途**：训练 IDM 用于动作解码，然后复用为奖励模型——高效且无需额外的奖励模型训练。
- **视频世界模型泛化更好**：解耦范式（视频规划器 + IDM）一致地展现出比端到端 VLA 策略更强的分布外性能，可能得益于互联网规模的视频先验。
- **RL 后训练适用于视频生成**：Flow-GRPO 对齐视频世界模型的成功与 LLM 中的 RLHF 范式相呼应，表明这可能成为机器人视频生成的标准实践。

</div>
