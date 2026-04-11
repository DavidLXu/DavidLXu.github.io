---
title: "[Paper Notes] Fast-dVLA: Accelerating Discrete Diffusion VLA to Real-Time Performance"
date: 2026-04-10
permalink: /posts/2026/04/fast-dvla-paper-notes/
tags:
  - VLA
  - Discrete Diffusion
  - Robot Learning
  - Inference Acceleration
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Fast-dVLA** is the first method to accelerate discrete diffusion VLA (dVLA) models to **real-time 30 Hz** control. The key insight: despite using bidirectional attention, dVLAs implicitly follow a left-to-right block-wise decoding pattern. Fast-dVLA exploits this by combining **block-wise causal attention** (enabling KV cache reuse) with **diffusion forcing** (enabling inter-block parallelism), achieving **2.8×–4.1× speedup** while maintaining SOTA-level success rates across CALVIN, LIBERO, and SimplerEnv benchmarks, and demonstrating real-time performance on a real bimanual robot.

## Paper Info

- **Title**: Fast-dVLA: Accelerating Discrete Diffusion VLA to Real-Time Performance
- **Authors**: Wenxuan Song\*, Jiayi Chen\*, Shuai Chen\*, Jingbo Wang, Pengxiang Ding, Han Zhao, Yikai Qin, Xinhu Zheng, Donglin Wang, Yan Wang†, Haoang Li†
- **Affiliation**: HKUST (Guangzhou), ShanghaiTech University, Tsinghua University, Westlake University, Zhejiang University
- **Date**: 2026-03-31 (v1), 2026-04-07 (v3)
- **Venue**: arXiv preprint
- **arXiv**: [2603.25661](https://arxiv.org/abs/2603.25661)
- **Project Page**: [Fast-dVLA](https://chris1220313648.github.io/Fast-dVLA/)

## 1. Problem and Motivation

Discrete diffusion VLAs (dVLAs) like Dream-VLA and DD-VLA are promising alternatives to flow-matching VLAs — they offer better multimodal alignment and preserve pretrained VLM knowledge. However, they are **far too slow** for real-time robotic control (~30 Hz):

| Paradigm | Forwards per Sequence | Forward Speed | Inference Speed |
|---|---|---|---|
| Autoregressive VLA | High | Fast | Slow |
| Discrete Diffusion VLA (dVLA) | Low | **Slow** (no KV cache) | Slow |
| Block Diffusion VLA | Moderate | Fast | Moderate |
| **Fast-dVLA (ours)** | **Low** | **Fast** | **Fast** |

The root cause: dVLAs use **bidirectional attention**, which means KV representations change every denoising iteration — preventing KV cache reuse and making each forward pass expensive.

**Key observation**: Despite bidirectional attention, dVLAs exhibit an **implicit block-wise autoregressive decoding tendency** — earlier action blocks are decoded before later ones. This is because (1) the backbone is initialized from an AR VLM, retaining AR characteristics, and (2) actions have inherent temporal dependencies.

## 2. Method

Fast-dVLA has three core components:

### 2.1 Block-Wise Causal Attention for KV Cache Reuse

Replace bidirectional attention with **block-wise causal attention**: each block can only attend to prefix tokens and tokens within the current block. Once a block is fully decoded, its KV states are frozen and can be cached for all subsequent blocks — just like standard AR decoding but at the block level.

### 2.2 Diffusion Forcing for Inter-Block Parallelism

Instead of waiting for block *i* to finish before starting block *i+1* (as in standard block diffusion), Fast-dVLA assigns **monotonically increasing noise levels** to blocks:

$$t_1 < t_2 < \cdots < t_N$$

Earlier blocks have lower noise (closer to clean) while later blocks are more heavily masked. The model factorizes the denoising as:

$$p_\theta(Y_0 | Y_{t_{1:N}}) = \prod_{i=1}^{N} p_\theta(Y^0_{B_i} | Y^{t_1}_{B_1}, \ldots, Y^{t_i}_{B_i})$$

This allows **concurrent denoising across blocks** — earlier blocks finish first, and their cached KV states accelerate later blocks.

### 2.3 Asymmetric Distillation for Efficient Training

Rather than training from scratch, Fast-dVLA distills from a finetuned bidirectional dVLA teacher:

$$\mathcal{L}_{AD} = \mathbb{E}\left[\sum_{i=1}^{N} D_{KL}\left(p_\theta(\cdot | \text{causal view}) \| p_{\phi^-}(\cdot | \text{global view})\right)\right]$$

The teacher sees all blocks (bidirectional), while the student only sees causally preceding blocks. This is **asymmetric** — the student learns to approximate the teacher's richer context with restricted attention. Converges in only **1/10 of the steps** needed for training from scratch.

### 2.4 Pipelined Parallel Decoding

At inference, blocks operate in a **dynamic pipeline** with two states:

- **Semi-activated**: block is introduced when the preceding block's completion ratio exceeds τ_add; only high-confidence tokens are decoded
- **Fully-activated**: transitions when predecessor exceeds τ_act; at least 1/n remaining tokens decoded per step

This mechanism balances speed and reliability while preserving temporal causality.

## 3. Experiments and Main Results

### Paradigm Comparison (LIBERO)

| Method | Avg SR | Speed (tokens/s) | Speedup |
|---|---|---|---|
| Dream-VLA | 0.856 | 98.8 | 1.0× |
| + Fast-dLLM | 0.828 | 183.2 | 1.9× |
| + Block Diffusion | 0.858 | 181.7 | 1.8× |
| **+ Fast-dVLA** | **0.870** | **313.1** | **3.2×** |
| DD-VLA | 0.963 | 152.1 | 1.5× |
| + Fast-dLLM | 0.935 | 312.5 | 3.2× |
| + Block Diffusion | 0.967 | 322.1 | 3.3× |
| **+ Fast-dVLA** | **0.966** | **402.7** | **4.1×** |

Fast-dVLA achieves the best speed–performance trade-off, even **slightly improving** success rates in some cases.

### CALVIN Long-Horizon (UD-VLA)

Fast-dVLA achieves **2.8× speedup** on UD-VLA (625-token sequences) while maintaining competitive performance (Avg Len 4.54 vs 4.64 baseline), ranking among the top methods on CALVIN ABCD→D.

### SimplerEnv (Dream-VLA)

Fast-dVLA achieves **59.3% average success rate** at **366.4 tokens/s**, outperforming:
- Flow-matching methods (π0: 27.1%, GR00T-N1: 36.5%)
- AR methods (π0-FAST: 32.1%)
- Other dVLA acceleration methods

### Real-World Results

On a bimanual AgileX platform with 3 tasks:
- Achieves consistent **30 Hz execution frequency** — the first dVLA to reach real-time control
- Nearly **doubles efficiency** over Dream-VLA on conveyor belt picking
- Maintains competitive success rates on semantic manipulation tasks

### Training Efficiency

Asymmetric distillation converges in **~2,000 steps** — only 1/5 of the original finetuning budget, and 1/10 of training from scratch.

## 4. Ablation Highlights

- **Block size**: Using multiples of action dimensionality (e.g., 7 for 7-DoF actions) preserves intrinsic temporal dependencies and yields the best speed/performance trade-off
- **Confidence threshold** (τ_conf): 0.5 balances 2.8× acceleration with only 2% performance drop
- **Thresholds** τ_add and τ_act: Set to 2/7 and 4/7 respectively for the pipelined decoding schedule

## 5. Strengths and Limitations

**Strengths:**
- First real-time dVLA — reaches 30 Hz on physical robots
- Clean, principled design: block-wise attention + diffusion forcing is a natural fit for the observed decoding pattern
- Highly efficient training via asymmetric distillation (1/10 steps)
- Generalizes across multiple dVLA architectures (Dream-VLA, DD-VLA, UD-VLA)
- Maintains or improves performance while dramatically accelerating inference

**Limitations:**
- Requires a pretrained bidirectional dVLA as teacher — not a standalone training method
- Block size must align with action dimensionality — less flexible for variable-length outputs
- The implicit AR tendency is observed empirically but not theoretically guaranteed for all architectures
- Real-world experiments limited to a single bimanual platform

## 6. Takeaways

1. **dVLAs have a hidden AR structure** — even with bidirectional attention, the decoding order is block-wise left-to-right. This is a useful inductive bias, not a bug.
2. **Block-wise attention + diffusion forcing** is a powerful combination: KV cache reuse from AR-style attention + inter-block parallelism from diffusion forcing = real-time discrete diffusion.
3. **Asymmetric distillation is remarkably efficient** — converting a bidirectional dVLA to a fast block-wise one costs only ~2k training steps.
4. **dVLAs can now compete with flow-matching VLAs on speed** while retaining their advantages in multimodal alignment and unified generation — a significant step toward practical deployment.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**Fast-dVLA** 是首个将离散扩散 VLA（dVLA）模型加速至**实时 30 Hz** 控制的方法。核心发现：尽管使用了双向注意力，dVLA 隐式地遵循从左到右的逐块解码模式。Fast-dVLA 利用这一特性，结合**逐块因果注意力**（实现 KV 缓存复用）和**扩散强制**（实现块间并行），在 CALVIN、LIBERO 和 SimplerEnv 基准上实现了 **2.8×–4.1× 加速**，同时保持 SOTA 级成功率，并在真实双臂机器人上展示了实时性能。

## 论文信息

- **标题**：Fast-dVLA: Accelerating Discrete Diffusion VLA to Real-Time Performance
- **作者**：Wenxuan Song\*、Jiayi Chen\*、Shuai Chen\* 等
- **机构**：香港科技大学（广州）、上海科技大学、清华大学、西湖大学、浙江大学
- **日期**：2026-03-31（v1），2026-04-07（v3）
- **arXiv**：[2603.25661](https://arxiv.org/abs/2603.25661)
- **项目主页**：[Fast-dVLA](https://chris1220313648.github.io/Fast-dVLA/)

## 1. 问题与动机

离散扩散 VLA（dVLA），如 Dream-VLA 和 DD-VLA，是流匹配 VLA 的有力替代方案——它们具有更好的多模态对齐能力，且能更好地保留预训练 VLM 的知识。然而，它们的推理速度**远不能满足**实时机器人控制的需求（通常约 30 Hz）：

| 范式 | 每序列前向次数 | 单次前向速度 | 推理速度 |
|---|---|---|---|
| 自回归 VLA | 高 | 快 | 慢 |
| 离散扩散 VLA（dVLA）| 低 | **慢**（无 KV 缓存）| 慢 |
| 块扩散 VLA | 中 | 快 | 中 |
| **Fast-dVLA（本文）** | **低** | **快** | **快** |

根本原因：dVLA 使用**双向注意力**，KV 表示在每次去噪迭代中都会变化，无法复用 KV 缓存，导致每次前向传播效率低下。

**关键观察**：尽管使用了双向注意力，dVLA 展现出**隐式的逐块自回归解码趋势**——前面的动作块总是先于后面的被解码。原因有二：（1）骨干网络从 AR VLM 初始化，保留了自回归特性；（2）动作本身存在时间依赖性。

## 2. 方法

Fast-dVLA 包含三个核心组件：

### 2.1 逐块因果注意力实现 KV 缓存复用

将双向注意力替换为**逐块因果注意力**：每个块只能关注前缀 token 和当前块内的 token。一旦某个块完全解码，其 KV 状态即被冻结并缓存，供后续块使用——如同标准自回归解码，但以块为单位。

### 2.2 扩散强制实现块间并行

不同于标准块扩散需要等待第 *i* 块完成才能开始第 *i+1* 块，Fast-dVLA 为各块分配**单调递增的噪声水平**：

$$t_1 < t_2 < \cdots < t_N$$

前面的块噪声较低（更接近干净状态），后面的块则有更多掩码。模型将去噪过程分解为：

$$p_\theta(Y_0 | Y_{t_{1:N}}) = \prod_{i=1}^{N} p_\theta(Y^0_{B_i} | Y^{t_1}_{B_1}, \ldots, Y^{t_i}_{B_i})$$

这允许**跨块并行去噪**——前面的块先完成，其缓存的 KV 状态加速后续块的解码。

### 2.3 非对称蒸馏实现高效训练

Fast-dVLA 从微调后的双向 dVLA 教师模型进行蒸馏，而非从头训练：

$$\mathcal{L}_{AD} = \mathbb{E}\left[\sum_{i=1}^{N} D_{KL}\left(p_\theta(\cdot | \text{因果视野}) \| p_{\phi^-}(\cdot | \text{全局视野})\right)\right]$$

教师模型看到所有块（双向），而学生模型只看到因果方向的前序块。这种**非对称**设计让学生学习用受限注意力逼近教师更丰富的上下文。收敛仅需从头训练步数的 **1/10**。

### 2.4 流水线并行解码

推理时，各块在**动态流水线**中运作，有两种状态：

- **半激活**：当前一块的完成率超过 τ_add 时引入，仅解码高置信度 token
- **全激活**：前一块完成率超过 τ_act 后转换，每步至少解码 1/n 的剩余 token

这一机制在速度和可靠性之间取得平衡，同时保持动作执行的时间因果性。

## 3. 实验与主要结果

### 范式对比（LIBERO）

| 方法 | 平均成功率 | 速度（tokens/s）| 加速比 |
|---|---|---|---|
| Dream-VLA | 0.856 | 98.8 | 1.0× |
| + Fast-dLLM | 0.828 | 183.2 | 1.9× |
| + 块扩散 | 0.858 | 181.7 | 1.8× |
| **+ Fast-dVLA** | **0.870** | **313.1** | **3.2×** |
| DD-VLA | 0.963 | 152.1 | 1.5× |
| + Fast-dLLM | 0.935 | 312.5 | 3.2× |
| + 块扩散 | 0.967 | 322.1 | 3.3× |
| **+ Fast-dVLA** | **0.966** | **402.7** | **4.1×** |

Fast-dVLA 实现了最优的速度-性能权衡，在部分情况下甚至**略微提升**了成功率。

### CALVIN 长程任务（UD-VLA）

Fast-dVLA 在 UD-VLA（625 token 序列）上实现 **2.8× 加速**，同时保持有竞争力的性能（平均长度 4.54 vs 基线 4.64），跻身 CALVIN ABCD→D 排行前列。

### SimplerEnv（Dream-VLA）

Fast-dVLA 以 **366.4 tokens/s** 的速度达到 **59.3% 平均成功率**，超越：
- 流匹配方法（π0：27.1%，GR00T-N1：36.5%）
- 自回归方法（π0-FAST：32.1%）
- 其他 dVLA 加速方法

### 真实世界实验

在双臂 AgileX 平台上的 3 个任务：
- 稳定达到 **30 Hz 执行频率**——首个实现实时控制的 dVLA
- 在传送带抓取任务上效率几乎**翻倍**
- 在语义操作任务上保持有竞争力的成功率

### 训练效率

非对称蒸馏在约 **2,000 步**内收敛——仅为原始微调预算的 1/5，从头训练步数的 1/10。

## 4. 消融实验要点

- **块大小**：使用动作维度的倍数（如 7 自由度动作对应块大小 7）能保持动作的内在时间依赖，获得最佳速度/性能权衡
- **置信度阈值**（τ_conf）：0.5 可在 2.8× 加速和仅 2% 性能下降之间取得平衡
- **阈值** τ_add 和 τ_act：分别设为 2/7 和 4/7

## 5. 优势与局限

**优势：**
- 首个实时 dVLA——在物理机器人上达到 30 Hz
- 设计简洁且有原则：逐块注意力 + 扩散强制自然契合观察到的解码模式
- 非对称蒸馏训练极其高效（1/10 步数）
- 可泛化到多种 dVLA 架构（Dream-VLA、DD-VLA、UD-VLA）
- 大幅加速推理的同时保持甚至提升性能

**局限：**
- 需要预训练的双向 dVLA 作为教师模型——并非独立训练方法
- 块大小需对齐动作维度——对可变长度输出灵活性不足
- 隐式 AR 趋势是经验观察，并非对所有架构有理论保证
- 真实世界实验仅限于单一双臂平台

## 6. 启示

1. **dVLA 隐含 AR 结构**——即使使用双向注意力，解码顺序仍为逐块从左到右。这是有用的归纳偏置，而非缺陷。
2. **逐块注意力 + 扩散强制**是强大的组合：AR 式注意力的 KV 缓存复用 + 扩散强制的块间并行 = 实时离散扩散。
3. **非对称蒸馏效率惊人**——将双向 dVLA 转换为快速逐块模型仅需约 2k 训练步。
4. **dVLA 现在可以在速度上与流匹配 VLA 竞争**，同时保留其在多模态对齐和统一生成方面的优势——向实际部署迈出了重要一步。

</div>
