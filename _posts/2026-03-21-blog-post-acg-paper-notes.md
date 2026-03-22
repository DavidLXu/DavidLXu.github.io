---
title: "[Paper Notes] ACG: Action Coherence Guidance for Flow-based VLA Models"
date: 2026-03-21
permalink: /posts/2026/03/acg-paper-notes/
tags:
  - Robotics
  - VLA
  - Flow Matching
  - Diffusion Policy
  - Test-time Guidance
  - Action Coherence
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Action Coherence Guidance (ACG)** is a **training-free, test-time** guidance technique for flow-matching-based VLA models (GR00T-N1, pi0, SmolVLA, etc.). The problem: diffusion/flow policies memorize noise in human demos (jerks, pauses, jitter), producing temporally incoherent action sequences that cause failures in fine-grained manipulation. ACG's solution: construct an **incoherent** denoising vector by replacing self-attention maps with identity matrices (forcing each action token to attend only to itself), then **guide away** from this incoherent direction during sampling. Results: +6.7 pp average success rate across RoboCasa, DexMimicGen, and real-world SO-101 tasks, with especially large gains on fine manipulation (+23.1 pp button pressing, +28.8 pp real-world pick-and-place). No retraining required.

## Paper Info

- **Title**: ACG: Action Coherence Guidance for Flow-based VLA models
- **Authors**: Minho Park*, Kinam Kim*, Junha Hyung, Hyojin Jang, Hoiyeong Jin, Jooyeol Yun, Hojoon Lee, Jaegul Choo
- **Affiliation**: KAIST AI
- **arXiv**: [2510.22201](https://arxiv.org/abs/2510.22201)

## 1. Problem: Action Incoherence in Flow-based VLAs

Flow matching policies trained via imitation learning have high generative capacity — but this capacity also memorizes imperfections in human demos:
- **Jerks** during teleoperation
- **Pauses** and hesitations
- **Jitter** from hand tremor

This degrades **action coherence**: the smoothness and consistency of successive actions within an action chunk. During deployment, incoherent actions cause:
1. **Instability at critical moments** — fumbling near objects, pushing them away
2. **Trajectory drift** — small noise accumulates, deviating from the desired path

This is especially catastrophic for **fine-grained manipulation** (button pressing, insertion, precise grasping).

## 2. Method: Action Coherence Guidance

### 2.1 CFG Recap (and why it doesn't work well for VLAs)

Standard CFG for flow policies:

$$v_\theta^{\text{CFG}(\lambda)} = (1+\lambda) \, v_\theta(\mathbf{A}_t^\tau, \mathbf{o}_t, \ell_t, \tau) - \lambda \, v_\theta(\mathbf{A}_t^\tau, \mathbf{o}_t, \varnothing, \tau)$$

Problem: in VLAs, removing the language condition $\ell_t$ changes the action distribution dramatically — the "unconditional" direction is not meaningful and causes unstable behavior.

### 2.2 ACG: Guide Away from Incoherence

Instead of guiding toward a condition, ACG guides **away from incoherence**:

$$v_\theta^{\text{ACG}(\lambda)} = (1+\lambda) \, v_\theta(\mathbf{A}_t^\tau, \mathbf{o}_t, \ell_t, \tau) - \lambda \, v_\theta^{\text{IC}}(\mathbf{A}_t^\tau, \mathbf{o}_t, \ell_t, \tau)$$

where $v_\theta^{\text{IC}}$ is the **incoherent denoising vector** — same model, same inputs, but with modified self-attention.

### 2.3 Constructing the Incoherent Vector

The key insight: in transformer-based flow policies, **self-attention** is what creates temporal coherence between action tokens. Each token (representing an action at a specific timestep) attends to all other tokens:

$$\text{Attn}(Q, K, V) = \text{softmax}\left(\frac{QK^\top}{\sqrt{d}}\right) V$$

To generate an **incoherent** action sequence, replace the attention map with an **identity matrix**:

$$\text{Attn}^{\text{IC}}(Q, K, V) = I \cdot V = V$$

This forces each action token to attend only to itself — no temporal communication — producing a temporally disconnected action chunk. Then ACG steers the generation **away** from this incoherent direction.

**Implementation details**:
- Replace self-attention in layers 4-6 (out of 8 total) with identity attention
- Share the first half of layers between base and incoherent passes → ~1.5x compute overhead
- Guidance scale $\lambda = 3.0$ (default)

## 3. Key Results

### Main comparison (GR00T-N1 backbone)

| Method | RoboCasa | DexMG | Real: Strawberries | Real: Tic-Tac-Toe | **Average** |
|---|---|---|---|---|---|
| Vanilla GR00T-N1 | 32.6% | 40.6% | 43.6% | 38.3% | 38.8% |
| Ensemble (n=2) | 34.0% | 40.3% | 56.7% | 45.0% | 44.0% |
| Feature Smoothing | 34.4% | 42.4% | 57.8% | 45.0% | 44.9% |
| CFG | 35.0% | 41.5% | 50.0% | 43.3% | 42.5% |
| WNG | 35.0% | 42.0% | 65.6% | 48.3% | 47.7% |
| **ACG (Ours)** | **39.3%** | **44.0%** | **74.4%** | **56.7%** | **53.6%** |

ACG outperforms all baselines by a clear margin, especially on real-world tasks.

### Fine-grained tasks see the largest gains

| Skill | Vanilla | ACG | Improvement |
|---|---|---|---|
| Button pressing | — | — | **+23.1 pp** |
| Insertion | — | — | **+11.8 pp** |
| Real-world pick-and-place | — | — | **+28.8 pp** |

### Action coherence metrics

| Method | ATV (rad/s, ↓) | Jerk_RMS (×10³ rad/s³, ↓) |
|---|---|---|
| Vanilla GR00T-N1 | 1.314 | 1.353 |
| Ensemble (n=5) | **0.984** | 1.172 |
| CFG | 1.332 | 1.317 |
| Incoherent ($v_\theta^{\text{IC}}$) | 4.509 | 1.993 |
| **ACG** | 1.130 | **1.156** |

The incoherent variant is indeed much worse than baseline (validating the design), and ACG achieves the best smoothness while maintaining accuracy (unlike ensemble which smooths but loses precision).

### Ablation highlights

- **Guidance scale**: performance improves up to ~3.0, then degrades (divergence from pretrained distribution)
- **Number of incoherent layers**: 2-6 layers all help; robust to this choice
- **Layer position**: middle/later layers work best; early layers can hurt
- **Complementary with Self-GAD**: ACG improves intra-chunk coherence, Self-GAD improves inter-chunk coherence; combining both yields further gains

## 4. Connection to CFGRL

This paper has an interesting conceptual link to [CFGRL](/posts/2026/03/cfgrl-paper-notes/). Both use guidance at test time to improve flow policy outputs — but for different purposes:

| | CFGRL | ACG |
|---|---|---|
| **Guides toward** | Optimality (higher advantage) | Temporal coherence |
| **Guides away from** | Unconditional (no goal) | Incoherent (no self-attention) |
| **Requires** | Optimality labels | Nothing (architectural perturbation) |
| **Improves** | Return / success rate | Action smoothness → success rate |

Both demonstrate that **test-time guidance is a powerful, underexplored tool** for robot policy improvement.

## 5. Strengths

- **Training-free**: zero additional training, works on any flow-based VLA
- **Principled design**: identity attention → incoherence is clean and well-motivated
- **Large real-world gains**: +28.8 pp on real SO-101 tasks — not just sim improvements
- **Fine-grained manipulation**: biggest gains exactly where they matter most
- **Complementary**: works alongside other guidance methods (Self-GAD)

## 6. Limitations

- **~1.5x compute overhead**: requires an extra (partial) forward pass for the incoherent vector
- **Hyperparameter sensitivity**: guidance scale too high → performance degrades
- **Shallow network assumption**: replacing layers 4-6 of 8 works; unclear if the same recipe scales to much deeper networks
- **Only tested on GR00T-N1**: applicability to other VLA architectures (pi0, SmolVLA) not empirically verified

## 7. Takeaways

1. **Action coherence is a real bottleneck** in flow-based VLA policies — demo noise gets memorized and causes deployment failures, especially for fine manipulation
2. **Self-attention = temporal coherence**: replacing attention maps with identity is a clean way to construct a "negative example" for guidance
3. **Test-time guidance is broadly useful for robot policies** — not just for image/video generation. Both ACG (coherence) and CFGRL (optimality) show this
4. **Intra-chunk coherence matters more than inter-chunk**: ACG outperforms Self-GAD, and combining both helps further
5. **Practical recipe**: for anyone deploying GR00T-N1 or similar flow-based VLAs, ACG is essentially free performance — no retraining, just modify inference

## References

- [Paper] [arXiv:2510.22201](https://arxiv.org/abs/2510.22201)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**动作一致性引导（ACG）**是一种适用于基于 flow matching 的 VLA 模型（GR00T-N1、pi0、SmolVLA 等）的**免训练、测试时**引导技术。问题：扩散/flow 策略会记忆人类演示中的噪声（抖动、停顿、颤抖），产生时间上不连贯的动作序列，导致精细操作失败。ACG 的解决方案：通过将自注意力图替换为单位矩阵（迫使每个动作 token 只关注自身）来构造**不连贯**的去噪向量，然后在采样过程中**远离**这个不连贯方向。结果：在 RoboCasa、DexMimicGen 和真实世界 SO-101 任务上平均成功率提升 +6.7 pp，精细操作增益尤其显著（按钮按压 +23.1 pp，真实世界抓取 +28.8 pp）。无需重新训练。

## 论文信息

- **标题**: ACG: Action Coherence Guidance for Flow-based VLA models
- **作者**: Minho Park*, Kinam Kim*, Junha Hyung, Hyojin Jang, Hoiyeong Jin, Jooyeol Yun, Hojoon Lee, Jaegul Choo
- **机构**: KAIST AI
- **arXiv**: [2510.22201](https://arxiv.org/abs/2510.22201)

## 1. 问题：Flow-based VLA 中的动作不连贯

基于 flow matching 的策略通过模仿学习训练，具有很强的生成能力——但这种能力也会记忆人类演示中的不完美：
- 遥操作中的**抖动**
- **停顿**和犹豫
- 手部颤抖导致的**颤振**

这降低了**动作一致性**：动作 chunk 内连续动作的平滑度和一致性。部署时，不连贯的动作导致：
1. **关键时刻的不稳定**——在物体附近摸索、推走物体
2. **轨迹漂移**——小噪声积累，偏离期望路径

这对**精细操作**（按钮按压、插入、精确抓取）尤其致命。

## 2. 方法：动作一致性引导

### 2.1 CFG 回顾（以及为什么它不太适用于 VLA）

标准 CFG 用于 flow 策略：

$$v_\theta^{\text{CFG}(\lambda)} = (1+\lambda) \, v_\theta(\mathbf{A}_t^\tau, \mathbf{o}_t, \ell_t, \tau) - \lambda \, v_\theta(\mathbf{A}_t^\tau, \mathbf{o}_t, \varnothing, \tau)$$

问题：在 VLA 中，移除语言条件 $\ell_t$ 会剧烈改变动作分布——"无条件"方向没有意义，会导致不稳定行为。

### 2.2 ACG：远离不连贯方向

ACG 不是朝着某个条件引导，而是**远离不连贯方向**：

$$v_\theta^{\text{ACG}(\lambda)} = (1+\lambda) \, v_\theta(\mathbf{A}_t^\tau, \mathbf{o}_t, \ell_t, \tau) - \lambda \, v_\theta^{\text{IC}}(\mathbf{A}_t^\tau, \mathbf{o}_t, \ell_t, \tau)$$

其中 $v_\theta^{\text{IC}}$ 是**不连贯去噪向量**——同一模型、同样输入，但修改了自注意力。

### 2.3 构造不连贯向量

核心洞察：在基于 transformer 的 flow 策略中，**自注意力**是创建动作 token 间时序一致性的关键。每个 token（代表特定时间步的动作）关注所有其他 token：

$$\text{Attn}(Q, K, V) = \text{softmax}\left(\frac{QK^\top}{\sqrt{d}}\right) V$$

要生成**不连贯**的动作序列，将注意力图替换为**单位矩阵**：

$$\text{Attn}^{\text{IC}}(Q, K, V) = I \cdot V = V$$

这迫使每个动作 token 只关注自身——无时序通信——产生时序断开的动作 chunk。然后 ACG 将生成过程**远离**这个不连贯方向引导。

**实现细节**：
- 将第 4-6 层（共 8 层）的自注意力替换为单位注意力
- 共享前半部分层 → 约 1.5 倍计算开销
- 引导尺度 $\lambda = 3.0$（默认）

## 3. 核心结果

### 主要对比（GR00T-N1 骨干）

| 方法 | RoboCasa | DexMG | 真实：草莓 | 真实：井字棋 | **平均** |
|---|---|---|---|---|---|
| Vanilla GR00T-N1 | 32.6% | 40.6% | 43.6% | 38.3% | 38.8% |
| Ensemble (n=2) | 34.0% | 40.3% | 56.7% | 45.0% | 44.0% |
| Feature Smoothing | 34.4% | 42.4% | 57.8% | 45.0% | 44.9% |
| CFG | 35.0% | 41.5% | 50.0% | 43.3% | 42.5% |
| WNG | 35.0% | 42.0% | 65.6% | 48.3% | 47.7% |
| **ACG（本文）** | **39.3%** | **44.0%** | **74.4%** | **56.7%** | **53.6%** |

### 精细任务增益最大

| 技能 | 提升 |
|---|---|
| 按钮按压 | **+23.1 pp** |
| 插入 | **+11.8 pp** |
| 真实世界抓取 | **+28.8 pp** |

### 动作一致性指标

| 方法 | ATV (rad/s, ↓) | Jerk_RMS (×10³ rad/s³, ↓) |
|---|---|---|
| Vanilla GR00T-N1 | 1.314 | 1.353 |
| Ensemble (n=5) | **0.984** | 1.172 |
| 不连贯变体 ($v_\theta^{\text{IC}}$) | 4.509 | 1.993 |
| **ACG** | 1.130 | **1.156** |

不连贯变体确实比基线差很多（验证了设计），ACG 在保持精度的同时实现了最佳平滑度。

### 消融亮点

- **引导尺度**：性能在约 3.0 时最佳，过大则下降
- **不连贯层数**：2-6 层都有效；对此参数鲁棒
- **层位置**：中间/后面的层效果最好
- **与 Self-GAD 互补**：ACG 改善 chunk 内一致性，Self-GAD 改善 chunk 间一致性；结合两者进一步提升

## 4. 与 CFGRL 的联系

本文与 [CFGRL](/posts/2026/03/cfgrl-paper-notes/) 有有趣的概念关联。两者都在测试时使用引导来改进 flow 策略输出——但目的不同：

| | CFGRL | ACG |
|---|---|---|
| **引导方向** | 朝向最优性（更高优势） | 朝向时序一致性 |
| **远离方向** | 无条件（无目标） | 不连贯（无自注意力） |
| **需要** | 最优性标签 | 无需额外标签（架构扰动） |
| **改善** | 回报/成功率 | 动作平滑度 → 成功率 |

两者都证明了**测试时引导是机器人策略改进的强大且未被充分探索的工具**。

## 5. 优势

- **免训练**：零额外训练，适用于任何基于 flow 的 VLA
- **原理清晰**：单位注意力 → 不连贯，设计干净且动机充分
- **真实世界大幅提升**：SO-101 任务 +28.8 pp——不仅仅是仿真改进
- **精细操作**：最大增益恰��出现在最需要的地方
- **可组合**：与其他引导方法（Self-GAD）兼容

## 6. 局限性

- **约 1.5 倍计算开销**：需要额外的（部分）前向传播计算不连贯向量
- **超参数敏感**：引导尺度过大 → 性能下降
- **浅层网络假设**：替换 8 层中的 4-6 层有效；不确定是否适用于更深的网络
- **仅在 GR00T-N1 上测试**：对其他 VLA 架构（pi0、SmolVLA）的适用性未经验证

## 7. 核心要点

1. **动作一致性是 flow-based VLA 策略的真实瓶颈**——演示噪声被记忆，导致部署失败，尤其是精细操作
2. **自注意力 = 时序一致性**：用单位矩阵替换注意力图是构造引导"负例"的干净方法
3. **测试时引导广泛适用于机器人策略**——不仅限于图像/视频生成。ACG（一致性）和 CFGRL（最优性）都证明了这一点
4. **chunk 内一致性比 chunk 间更重要**：ACG 优于 Self-GAD，结合两者进一步提升
5. **实用方案**：对于部署 GR00T-N1 或类似 flow-based VLA 的人，ACG 本质上是免费性能提升——无需重新训练，只需修改推理

## 参考链接

- [论文] [arXiv:2510.22201](https://arxiv.org/abs/2510.22201)

</div>
