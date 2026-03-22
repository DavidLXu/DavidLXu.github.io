---
title: "[Paper Notes] DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos"
date: 2026-03-21
permalink: /posts/2026/03/dreamdojo-paper-notes/
tags:
  - Robotics
  - World Models
  - Video Diffusion
  - Human Videos
  - Latent Actions
  - Cross-Embodiment
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DreamDojo** is a foundation **action-conditioned world model** (AC-WM) that learns diverse interaction physics from **44k hours of egocentric human videos** — the largest video dataset to date for world model pretraining. To overcome the scarcity of action labels in human videos, it introduces **continuous latent actions** as unified proxy actions extracted via a self-supervised VAE. After post-training on small-scale robot data, DreamDojo demonstrates:

- Strong OOD generalization to unseen objects, skills, and environments
- Real-time inference at **10.81 FPS** via an autoregressive distillation pipeline
- Downstream applications: **policy evaluation** (Pearson r=0.995 with real-world), **model-based planning** (2x success rate improvement), and **live teleoperation**

This is an AC-WM (actions-in) — the counterpart to WAMs like [DreamZero](/posts/2026/03/dreamzero-paper-notes/). See also [A Tale of Two World Models](/posts/2026/03/tale-of-two-world-models/) for the WAM vs. AC-WM debate.

## Paper Info

- **Title**: DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos
- **Authors**: Shenyuan Gao, William Liang, Kaiyuan Zheng, Ayaan Malik, Seonghyeon Ye, et al.
- **Affiliation**: NVIDIA, HKUST, UC Berkeley, UW, Stanford, KAIST, UofT, UCSD, UT Austin
- **Date**: 2026-02-06
- **arXiv**: [2602.06949](https://arxiv.org/abs/2602.06949)
- **Project page**: [dreamdojo-world.github.io](https://dreamdojo-world.github.io)

## 1. Motivation

Existing robot world models are trained on limited robot data and confined to in-distribution settings. The key bottleneck:

- **Robot data is scarce and expensive** — hardware variability, teleoperation cost, mostly expert demonstrations
- **Real-world diversity is nearly infinite** — objects, scenes, skills far exceed any robot dataset
- **Expert-only data lacks stochasticity** — models don't learn to respond to counterfactual actions

The insight: **human videos** capture the same underlying physics as robot interactions, despite the embodiment gap. And human videos are available at massive scale.

## 2. DreamDojo-HV Dataset

The paper curates the **largest egocentric human video dataset** for world model pretraining:

| Dataset | Type | Hours | Trajectories | Skills | Scenes |
|---|---|---|---|---|---|
| DROID | Robot | 350 | 76k | 86 | 564 |
| AgiBot-World | Robot | 2.9k | 1,000k | 87 | 106 |
| In-lab | Human | 55 | 13.9k | 35 | 1 |
| EgoDex | Human | 829 | 30k | 194 | 5 |
| **DreamDojo-HV** | **Human** | **43,827** | **1,135k** | **6,015** | **1,135k** |
| **Total mixture** | **Human** | **44,711** | **1,179k** | **>6,015** | **>1,135k** |

Compared to the largest prior robot datasets: **15x longer duration, 96x more skills, 2,000x more scenes**.

DreamDojo-HV covers home, retail, transport, food, repair, and many other daily scenarios, collected via crowdsourcing with text annotations for each episode.

## 3. Approach

### 3.1 Latent Actions as Proxy Actions

The central technical challenge: human videos don't have fine-grained action labels. Three options considered:

| Method | Pros | Cons |
|---|---|---|
| Action-free pretraining | Simple | Ignores causality → poor controllability |
| Hand pose extraction (HaMeR/MANO) | Precise for hands | Can't capture arm/locomotion; fails under occlusion |
| **Latent actions (proposed)** | **Self-supervised, cross-embodiment, captures all motions** | **Proxy, not ground truth** |

The latent action model is a **700M spatiotemporal Transformer VAE**:

- **Encoder**: takes two consecutive frames $f_t, f_{t+1}$, extracts a compact latent vector $\hat{a}_t$ (dim=32) representing the action between frames
- **Decoder**: reconstructs $f_{t+1}$ from $\hat{a}_t$ and $f_t$
- **Information bottleneck**: forces the model to disentangle the most critical motion information

$$\mathcal{L}_{\theta,\varphi}(f_{t+1}) = \mathbb{E}_{q_\varphi(\hat{a}|f_{t:t+1})} \log p_\theta(f_{t+1}|\hat{a}, f_t) - \beta D_{KL}(q_\varphi(\hat{a}|f_{t:t+1}) \| p(\hat{a}))$$

Key finding: the learned latent actions **transfer across embodiments** — frames with similar latent actions show the same motion regardless of whether performed by a human or robot (see Fig. 3 in the paper).

### 3.2 World Model Architecture

Built on **Cosmos-Predict2.5** (latent video diffusion model with DiT blocks):

- **Action injection**: actions are chunked to match the temporal compression ratio of the video tokenizer (4 frames per latent). Each chunk of 4 consecutive actions conditions the corresponding latent frame.
- **Relative actions**: transform absolute actions to relative for better generalization.
- **Causal chunked injection**: future actions don't condition current predictions — respects causality.

### 3.3 Training Objective

Standard flow matching loss + a **temporal consistency loss**:

$$\mathcal{L}_{\text{temporal}}(\theta) = \mathbb{E}\left[\sum_{i=1}^{K-1} \|(z_{i+1} - z_i) - (v_{i+1} - v_i)\|^2\right]$$

This supervises the *transitions* between frames, not just individual frames — directly encourages learning object dynamics and action following. Found to accelerate action controllability learning and improve object completeness.

### 3.4 Three-Phase Training

1. **Pretraining** on human videos (In-lab + EgoDex + DreamDojo-HV) with latent action conditioning
2. **Post-training** on target robot data — reset action conditioning layer, learn new action space
3. **Distillation** — convert to autoregressive, few-step model for real-time inference

### 3.5 Distillation Pipeline

Based on **Self Forcing** (Huang et al., 2025):

1. **Warmup**: regress student predictions to teacher's ODE solutions (teacher forcing)
2. **Distillation**: student generates from its own previous outputs, supervised by KL divergence between teacher and student distributions — minimizes train-test mismatch

Key innovation: student generates $N' > N$ frames (longer than teacher horizon) during training to simulate long rollouts and reduce compounding error.

Result: **35 denoising steps → 4 steps**, bidirectional → causal attention, enabling **10.81 FPS** real-time inference.

## 4. Key Results

### Scaling data improves everything

Adding more human data consistently improves OOD performance:

| Pretraining Data | In-lab PSNR | Counterfactual PSNR |
|---|---|---|
| No pretraining | 20.576 | 20.472 |
| In-lab only | 20.913 | 20.755 |
| In-lab + EgoDex | 20.972 | 20.797 |
| **In-lab + EgoDex + DreamDojo-HV** | **21.016** | **20.852** |

### Latent actions match ground-truth actions

| Conditioning Method | In-lab PSNR | EgoDex PSNR |
|---|---|---|
| No pretraining | 20.576 | 19.952 |
| Action-free pretraining | 20.797 | 19.924 |
| **Latent action** | **20.913** | **20.344** |
| Ground-truth action (ideal) | 20.960 | 20.474 |

Latent actions close most of the gap to ground-truth labels — and are infinitely more scalable.

### Human preference: scaling model helps

| Comparison | Physics Correctness | Action Following |
|---|---|---|
| DreamDojo-2B > Cosmos-Predict2.5 | 62.5% | 63.5% |
| DreamDojo-14B > Cosmos-Predict2.5 | 73.5% | 72.6% |
| DreamDojo-14B > DreamDojo-2B | 72.5% | 65.5% |

### Distillation: real-time with minimal degradation

| Model | FPS | Predict Len | Context Len |
|---|---|---|---|
| Teacher | 2.72 | 12 frames | 1 frame |
| **Student (distilled)** | **10.81** | 4 frames | 12 frames |

The student is 4x faster and has better context awareness (12-frame sliding window vs. 1-frame conditioning).

### Downstream applications

**Policy evaluation**: Pearson correlation r=0.995 between DreamDojo-predicted success rates and real-world success rates across 6 policy checkpoints. Near-perfect ranking.

**Model-based planning**: Sample N action proposals from a policy ensemble, simulate all with DreamDojo, select best via a value model. Result: ~2x improvement in success rate over uniform sampling.

**Live teleoperation**: Real-time teleoperation of a virtual G1 robot using PICO VR controller on a single RTX 5090.

### Architecture ablations

| Modification | GR-1 Val PSNR | Counterfactual PSNR |
|---|---|---|
| Baseline | 16.199 | 19.448 |
| + Relative actions | 16.522 | 19.482 |
| + Chunked injection | 17.626 | 20.783 |
| + Temporal consistency loss | **17.630** | **20.980** |

Chunked injection is the biggest single improvement — respecting causality matters a lot.

## 5. Strengths

- **Massive scale**: 44k hours of human video pretraining — by far the largest for any robot world model
- **Elegant latent action design**: self-supervised, cross-embodiment, nearly matches ground-truth actions
- **Consistent scaling**: more data, bigger model → better OOD generalization on all benchmarks
- **Practical applications demonstrated**: policy evaluation with r=0.995, 2x planning improvement, live teleoperation
- **Distillation pipeline**: 10.81 FPS with improved context consistency

## 6. Limitations

- **Uncommon actions**: struggles with fast/unusual motions (slapping, fast waving)
- **Optimistic simulator**: absolute success rates in DreamDojo are often higher than real-world — doesn't accurately generate nuanced failures
- **Single-view only**: no multi-view simulation support (important for SOTA policies)
- **Post-training forgetting**: retaining pretrained knowledge during fine-tuning not deeply studied
- **Pixel-space generation**: computationally heavier than latent-space world models (V-JEPA2, Dreamer)

## 7. DreamDojo vs. DreamZero: Two Sides of the Same Coin

Both from NVIDIA, released weeks apart, representing the two world model paradigms:

| | DreamZero (WAM) | DreamDojo (AC-WM) |
|---|---|---|
| Input | Image + text instruction | Image + future actions |
| Output | Video + actions | Video |
| Pretraining data | Robot teleoperation (500 hrs) | Human videos (44k hrs) |
| Data scaling | Limited to success demos | All data including failures & play |
| Cross-embodiment | Video-only demos (no action labels) | Latent actions as unified proxy |
| Planning | Best-of-N via text prompt variation | Gradient-based / action optimization |
| RL in model | Not possible | Possible (counterfactual simulation) |
| Policy evaluation | Not possible | Yes (r=0.995 correlation) |
| Real-time speed | 7 Hz (38x speedup) | 10.81 FPS (distilled) |

These two papers together make a compelling case for the "flexibly conditioned" world model predicted in the [Tale of Two World Models](/posts/2026/03/tale-of-two-world-models/) discussion.

## 8. Takeaways

1. **Human videos are a goldmine for robot world models** — the physics transfers despite the embodiment gap, and the data is orders of magnitude more diverse than robot data
2. **Latent actions solve the label scarcity problem** — self-supervised, cross-embodiment, nearly as good as ground truth
3. **Causal, chunked action injection is critical** — respecting temporal causality dramatically improves controllability
4. **AC-WMs enable unique downstream applications** — policy evaluation and model-based planning that WAMs simply cannot do
5. **Distillation bridges the gap to real-time** — autoregressive + few-step denoising achieves 10.81 FPS with better context consistency

## References

- [Paper] [arXiv:2602.06949](https://arxiv.org/abs/2602.06949)
- [Project] [dreamdojo-world.github.io](https://dreamdojo-world.github.io)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**DreamDojo** 是一个基础**动作条件世界模型**（AC-WM），从 **44,000 小时自我中心视角的人类视频**中学习多样化的交互物理——这是迄今为止用于世界模型预训练的最大视频数据集。为解决人类视频中动作标注稀缺的问题，论文引入了**连续潜在动作**作为统一的代理动作，通过自监督 VAE 提取。在少量机器人数据上后训练后，DreamDojo 展示了：

- 对未见物体、技能和环境的强 OOD 泛化能力
- 通过自回归蒸馏管线实现 **10.81 FPS** 实时推理
- 下游应用：**策略评估**（与真实世界 Pearson r=0.995）、**基于模型的规划**（成功率提升 2 倍）和**实时遥操作**

这是一个 AC-WM（动作输入型）——与 [DreamZero](/posts/2026/03/dreamzero-paper-notes/)（WAM）形成对比。参见[两种世界模型的故事](/posts/2026/03/tale-of-two-world-models/)了解 WAM vs. AC-WM 的讨论。

## 论文信息

- **标题**: DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos
- **作者**: Shenyuan Gao, William Liang, Kaiyuan Zheng, Ayaan Malik, Seonghyeon Ye 等
- **机构**: NVIDIA, HKUST, UC Berkeley, UW, Stanford, KAIST, UofT, UCSD, UT Austin
- **日期**: 2026-02-06
- **arXiv**: [2602.06949](https://arxiv.org/abs/2602.06949)
- **项目主页**: [dreamdojo-world.github.io](https://dreamdojo-world.github.io)

## 1. 动机

现有机器人世界模型在有限的机器人数据上训练，局限于分布内场景。核心瓶颈：

- **机器人数据稀缺且昂贵**——硬件差异、遥操作成本高、大多是专家示范
- **真实世界的多样性几乎无限**——物体、场景、技能远超任何机器人数据集
- **纯专家数据缺乏随机性**——模型无法学会响应反事实动作

核心洞察：**人类视频**捕获了与机器人交互相同的底层物理，尽管存在具身平台差异。而且人类视频可以大规模获取。

## 2. DreamDojo-HV 数据集

论文构建了迄今**最大的自我中心人类视频数据集**用于世界模型预训练：

| 数据集 | 类型 | 时长 | 轨迹数 | 技能数 | 场景数 |
|---|---|---|---|---|---|
| DROID | 机器人 | 350h | 76k | 86 | 564 |
| AgiBot-World | 机器人 | 2.9kh | 1,000k | 87 | 106 |
| In-lab | 人类 | 55h | 13.9k | 35 | 1 |
| EgoDex | 人类 | 829h | 30k | 194 | 5 |
| **DreamDojo-HV** | **人类** | **43,827h** | **1,135k** | **6,015** | **1,135k** |
| **总数据混合** | **人类** | **44,711h** | **1,179k** | **>6,015** | **>1,135k** |

与此前最大的机器人数据集相比：**时长长 15 倍、技能多 96 倍、场景多 2,000 倍**。

## 3. 方法

### 3.1 潜在动作作为代理动作

核心技术挑战：人类视频没有细粒度的动作标注。三种方案比较：

| 方法 | 优点 | 缺点 |
|---|---|---|
| 无动作预训练 | 简单 | 忽略因果性 → 可控性差 |
| 手部姿态提取 (HaMeR/MANO) | 手部精确 | 无法捕获手臂/移动；遮挡下失败 |
| **潜在动作（本文）** | **自监督、跨具身平台、捕获所有运动** | **代理而非真实标签** |

潜在动作模型是一个 **7 亿参数的时空 Transformer VAE**：

- **编码器**：输入连续两帧 $f_t, f_{t+1}$，提取紧凑的潜在向量 $\hat{a}_t$（维度=32），���示帧间动作
- **解码器**：从 $\hat{a}_t$ 和 $f_t$ 重建 $f_{t+1}$
- **信息瓶颈**：迫使模型解纠缠出最关键的运动信息

$$\mathcal{L}_{\theta,\varphi}(f_{t+1}) = \mathbb{E}_{q_\varphi(\hat{a}|f_{t:t+1})} \log p_\theta(f_{t+1}|\hat{a}, f_t) - \beta D_{KL}(q_\varphi(\hat{a}|f_{t:t+1}) \| p(\hat{a}))$$

关键发现：学到的潜在动作可以**跨具身平台迁移**——具有相似潜在动作的帧展现相同的运动，无论是人还是机器人执行。

### 3.2 世界模型架构

基于 **Cosmos-Predict2.5**（DiT 块的潜空间视频扩散模型）：

- **动作注入**：动作按 chunk 注入，匹配视频 tokenizer 的时间压缩比（每个潜在帧对应 4 帧）
- **相对动作**：将绝对动作转换为相对动作以提高泛化性
- **因果 chunk 注入**：未来动作不影响当前预测——尊重因果关系

### 3.3 训练目标

标准 flow matching 损失 + **时间一致性损失**：

$$\mathcal{L}_{\text{temporal}}(\theta) = \mathbb{E}\left[\sum_{i=1}^{K-1} \|(z_{i+1} - z_i) - (v_{i+1} - v_i)\|^2\right]$$

监督帧间的*转换*而不仅仅是单帧——直接鼓励学习物体动力学和动作跟随。

### 3.4 三阶段训练

1. **预训练**：在人类视频上以潜在动作为条件
2. **后训练**：在目标机器人数据上——重置动作条件化层，学习新动作空间
3. **蒸馏**：转换为自回归、少步模型以实现实时推理

### 3.5 蒸馏管线

基于 **Self Forcing**（Huang et al., 2025）：

1. **预热**：学生预测回归教师的 ODE 解（teacher forcing）
2. **蒸馏**：学生从自身之前的输出生成，通过教师和学生分布间的 KL 散度监督——最小化训练-测试不匹配

关键创新：训练时学生生成 $N' > N$ 帧（比教师视野更长），模拟更长的展开以减少累积误差。

结果：**35 步去噪 → 4 步**，双向注意力 → 因果注意力，实现 **10.81 FPS** 实时推理。

## 4. 核心结果

### 数据规模扩大，一切变好

增加人类数据持续改善 OOD 性能：

| 预训练数据 | In-lab PSNR | 反事实 PSNR |
|---|---|---|
| 无预训练 | 20.576 | 20.472 |
| 仅 In-lab | 20.913 | 20.755 |
| In-lab + EgoDex | 20.972 | 20.797 |
| **In-lab + EgoDex + DreamDojo-HV** | **21.016** | **20.852** |

### 潜在动作接近真实动作

| 条件化方法 | In-lab PSNR | EgoDex PSNR |
|---|---|---|
| 无预训练 | 20.576 | 19.952 |
| 无动作预训练 | 20.797 | 19.924 |
| **潜在动作** | **20.913** | **20.344** |
| 真实动作（理想情况） | 20.960 | 20.474 |

潜在动作弥补了与真实标签之间的大部分差距——而且可扩展性无限好。

### 人类偏好：模型越大越好

| 比较 | 物理正确性 | 动作跟随 |
|---|---|---|
| DreamDojo-2B > Cosmos-Predict2.5 | 62.5% | 63.5% |
| DreamDojo-14B > Cosmos-Predict2.5 | 73.5% | 72.6% |
| DreamDojo-14B > DreamDojo-2B | 72.5% | 65.5% |

### 蒸馏：实时且退化极小

| 模型 | FPS | 预测长度 | 上下文长度 |
|---|---|---|---|
| 教师 | 2.72 | 12 帧 | 1 帧 |
| **学生（蒸馏后）** | **10.81** | 4 帧 | 12 帧 |

学生快 4 倍且上下文感知更好（12 帧滑动窗口 vs. 单帧条件化）。

### 下游应用

**策略评估**：6 个策略检查点上，DreamDojo 预测的成功率与真实世界成功率的 Pearson 相关系数 r=0.995。近乎完美的排序。

**基于模型的规划**：从策略集合中采样 N 个动作提议，全部用 DreamDojo 模拟，用价值模型选最优。结果：相比均匀采样，成功率提升约 2 倍。

**实时遥操作**：在单张 RTX 5090 上使用 PICO VR 控制器实时遥操作虚拟 G1 机器人。

### 架构消融

| 修改 | GR-1 Val PSNR | 反事实 PSNR |
|---|---|---|
| 基线 | 16.199 | 19.448 |
| + 相对动作 | 16.522 | 19.482 |
| + Chunk 注入 | 17.626 | 20.783 |
| + 时间一致性损失 | **17.630** | **20.980** |

Chunk 注入是最大的单项改进——尊重因果关系非常重要。

## 5. 优势

- **海量规模**：44k 小时人类视频预训练——在所有机器人世界模型中遥遥领先
- **优雅的潜在动作设计**：自监督、跨具身平台、接近真实动作效果
- **持续的规模化收益**：更多数据、更大模型 → 所有基准上更好的 OOD 泛化
- **实用下游应用**：策略评估（r=0.995）、2 倍规划改进、实时遥操作
- **蒸馏管线**：10.81 FPS 且上下文一致性更优

## 6. 局限性

- **罕见动作**：难以模拟快速/不常见动作（拍打、快速挥手）
- **乐观模拟器**：DreamDojo 中的绝对成功率通常高于真实世界——无法精确生成细微的失败
- **仅单视角**：不支持多视角模拟（对 SOTA 策略很重要）
- **后训练遗忘**：预训练知识在微调过程中的保留尚未深入研究
- **像素空间生成**：计算量大于潜空间世界模型（V-JEPA2、Dreamer）

## 7. DreamDojo vs. DreamZero：同一枚硬币的两面

两篇论文均来自 NVIDIA，相隔数周发布，代表了两种世界模型范式：

| | DreamZero (WAM) | DreamDojo (AC-WM) |
|---|---|---|
| 输入 | 图像 + 文本指令 | 图像 + 未来动作 |
| 输出 | 视频 + 动作 | 视频 |
| 预训练数据 | 机器人遥操作（500h） | 人类视频（44kh） |
| 数据扩展 | 仅限成功示范 | 包括失败和游戏的所有数据 |
| 跨具身平台 | 纯视频演示（无动作标注） | 潜在动作作为统一代理 |
| 规划 | 通过文本提示变化做 best-of-N | 基于梯度/动作优化 |
| 模型内 RL | 不可能 | 可能（反事实模拟） |
| 策略评估 | 不可能 | 是（r=0.995 相关性） |
| 实时速度 | 7 Hz（38x 加速） | 10.81 FPS（蒸馏后） |

这两篇论文共同有力地支持了[两种世界模型的故事](/posts/2026/03/tale-of-two-world-models/)中预测的"灵活条件化"世界模型。

## 8. 核心要点

1. **人类视频是机器人世界模型的金矿**——尽管存在具身平台差距，物理知识可以迁移，且数据多样性远超机器人数据
2. **潜在动作解决了标注稀缺问题**——自监督、跨具身平台、接近真实标签的效果
3. **因果 chunk 动作注入至关重要**——尊重时间因果性大幅提升可控性
4. **AC-WMs 实现了独特的下游应用**——策略评估和基于模型的规划是 WAMs 无法做到的
5. **蒸馏弥合了实时推理的鸿沟**——自回归 + 少步去噪实现 10.81 FPS 且上下文一致性更好

## 参考链接

- [论文] [arXiv:2602.06949](https://arxiv.org/abs/2602.06949)
- [项目] [dreamdojo-world.github.io](https://dreamdojo-world.github.io)

</div>
