---
title: "[Paper Notes] CUDA Agent: Large-Scale Agentic RL for High-Performance CUDA Kernel Generation"
date: 2026-03-21
permalink: /posts/2026/03/cuda-agent-paper-notes/
tags:
  - LLM
  - Reinforcement Learning
  - CUDA
  - Code Generation
  - Agentic AI
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

LLMs are decent at general coding but struggle to beat `torch.compile` at writing optimized CUDA kernels. CUDA Agent fixes this with large-scale **agentic reinforcement learning**: a scalable data pipeline (6K synthesized operator tasks), a skill-augmented CUDA development environment with anti-hacking safeguards, and multi-stage warm-up techniques (RFT + Value Pretraining) that stabilize 150-step RL training. Result: **100%, 100%, 92% faster rate** over `torch.compile` on KernelBench Level-1/2/3 -- blowing past Claude Opus 4.5 and Gemini 3 Pro by ~40% on the hardest split.

## Paper Info

- **Title**: CUDA Agent: Large-Scale Agentic RL for High-Performance CUDA Kernel Generation
- **Authors**: Weinan Dai\*, Hanlin Wu\*, Qiying Yu, Huan-ang Gao, Jiahao Li, Chengquan Jiang, Weiqiang Lou, Yufan Song, Hongli Yu, Jiaze Chen, Wei-Ying Ma, Ya-Qin Zhang, Jingjing Liu, Mingxuan Wang, Xin Liu, Hao Zhou
- **Affiliations**: ByteDance Seed, Institute for AI Industry Research (AIR) Tsinghua University, SIA-Lab
- **arXiv**: [2602.24286](https://arxiv.org/abs/2602.24286)
- **Date**: March 2, 2026
- **Paper type**: LLM agent training / CUDA kernel optimization / reinforcement learning

## 1. Problem and Motivation

GPU kernel optimization is critical for deep learning performance but requires deep hardware expertise. Despite LLMs excelling at general programming, they remain **uncompetitive with compiler-based systems** like `torch.compile` for CUDA kernel generation.

Existing approaches fall into two camps, both with fundamental limits:

- **Training-free refinement** (STARK, ReGraphT, EvoEngineer): hand-designed heuristics with execution feedback. Performance is capped by the base model's intrinsic CUDA ability.
- **Fine-tuning within fixed loops** (Kevin, CUDA-L1, ConCuR): multi-turn execution-feedback pipelines. These waste context on all previous solutions and constrain the agent's autonomy to learn its own debugging/profiling strategies.

Neither paradigm fundamentally improves the model's intrinsic CUDA optimization capability.

## 2. Method

CUDA Agent has three pillars: **data**, **environment**, and **RL techniques**.

### 2.1 Scalable Data Synthesis Pipeline

High-quality CUDA training data is scarce. The pipeline:

1. **Seed Problem Crawling**: mine reference operators from `torch` and `transformers` libraries
2. **Combinatorial Synthesis**: LLMs sample up to 5 operator classes and compose them into fused tasks -- because fused problems require joint optimization (shared registers/SMEM/occupancy), not just chaining individually-optimized ops
3. **Rubric-based Filtering**: keep only executable, deterministic, non-trivial problems with 1-100ms eager runtime; exclude KernelBench-similar cases

This yields **CUDA-Agent-Ops-6K**, a curated operator-level dataset.

### 2.2 Skill-Integrated Agent Loop

The agent loop follows a ReAct-style paradigm (reason → act → observe) compatible with OpenHands, using standard tools (BashTool, GlobTool, MultiEditTool, TodoWriteTool). On top of this, CUDA Agent gets a `SKILL.md` that formalizes the CUDA optimization workflow:

1. Profile the native PyTorch implementation to find bottlenecks
2. Implement custom CUDA operators targeting identified hotspots
3. Compile and evaluate in a GPU sandbox, iterate until correct
4. Repeat until ≥5% speedup over `torch.compile`

**Anti-reward-hacking measures** (this is a highlight):
- Evaluation scripts are **file-permission protected** -- the agent can't modify them
- Context managers **forbid fallback** to `torch.nn.functional`
- 5 random inputs for correctness validation
- Proper GPU synchronization, warm-up iterations, and averaged measurements
- No web search tools -- all solutions from local environment only

### 2.3 Robust Reward Scheduling

Instead of raw speedup (noisy, biased toward easy kernels), they use a **discrete milestone-based reward**:

$$r = \begin{cases} -1 & \text{if correctness check fails} \\ 3 & \text{if faster than both eager and compile} \\ 2 & \text{if faster than eager only} \\ 1 & \text{otherwise (correct but not faster)} \end{cases}$$

where "faster" means >5% speedup. This normalized reward avoids outlier-driven optimization.

### 2.4 Multi-Stage Warm-up for Stable Training

The core training instability comes from **domain distribution mismatch** -- CUDA code is <0.01% of pretraining data, causing low-probability tokens and exploding importance sampling ratios.

The fix is a multi-stage warm-up:

1. **Single-Turn RL**: standard PPO on the base model (Seed1.6, 23B active / 230B total MoE) for basic CUDA generation ability
2. **Actor Initialization (RFT)**: collect agent trajectories from the single-turn model, reject-sample for high-quality ones (positive reward, no hallucinated tool calls), fine-tune
3. **Critic Initialization (Value Pretraining)**: pretrain the critic on trajectory data with GAE targets so it can immediately provide useful advantage estimates
4. **Agentic RL**: full PPO with 128K context, up to 150 agent turns during training (200 at eval)

Without RFT → entropy explodes → policy collapses within ~17 steps.
Without Value Pretraining → critic can't estimate values → trajectory lengths explode.

## 3. Experiments and Main Results

**Benchmark**: KernelBench (250 operator tasks across Level 1-3).

**Setup**: Seed1.6 base model, batch size 1024, 128 H20 GPUs for profiling, Docker-based sandboxes.

### Key Results (vs. `torch.compile`)

| Model | L1 Faster Rate | L2 Faster Rate | L3 Faster Rate | L3 Speedup |
|-------|:-:|:-:|:-:|:-:|
| GLM 4.6 | 32% | 11% | 10% | 0.62x |
| Kimi K2 | 39% | 15% | 6% | 0.29x |
| Gemini 3 Pro | 72% | 76% | 52% | 1.17x |
| Claude Opus 4.5 | 72% | 69% | 50% | 1.10x |
| **CUDA Agent** | **97%** | **100%** | **90%** | **1.52x** |

Three takeaways:
- CUDA Agent **massively outperforms** proprietary models, especially on harder tasks (~40% gap on L3)
- Level 2 (operator sequences / fusion) shows the biggest win: 100% faster rate, 2.80x speedup. Compiler heuristics can't handle non-trivial fusion patterns; the agent explores a much larger design space
- Learned optimization policies can **consistently beat static compiler heuristics**

### Ablation Highlights

| Variant | Overall Faster Rate (vs. Compile) | Overall Speedup (vs. Compile) |
|---------|:-:|:-:|
| w/o Agent Loop | 14.1% | 0.69x |
| w/o Robust Reward | 60.4% | 1.25x |
| w/o RFT | 49.8% | 1.05x |
| w/o Value Pretraining | 50.9% | 1.00x |
| **Full CUDA Agent** | **96.8%** | **2.11x** |

Every component matters, but the agent loop is the biggest contributor -- without it, the model can barely beat `torch.compile` at all.

## 4. Strengths and Limitations

**Strengths:**
- Comprehensive anti-reward-hacking design (file permissions, fallback prevention, measurement rigor)
- The multi-stage warm-up is well-motivated and cleanly ablated -- each stage addresses a specific instability mode
- The combinatorial data synthesis is clever: fused operator tasks create genuinely novel optimization challenges
- SOTA results with large margins, especially on the harder splits

**Limitations:**
- Built on Seed1.6 (230B MoE) -- unclear how much transfers to smaller models
- KernelBench is the only benchmark; real-world kernel optimization has additional complexities (library integration, memory management across kernel boundaries)
- 128 H20 GPUs for the sandbox pool is a significant resource requirement
- The paper notes ChatGPT-5 series models "declined to respond to CUDA-related prompts" -- an interesting but unelaborated observation

## 5. Takeaways

- **Agentic RL > fixed pipelines** for code optimization tasks. Letting the model learn its own debugging and profiling strategies (via agent loop) is far more effective than constraining it to pre-designed multi-turn templates.
- **Domain-specific warm-up is critical** when the target domain is a tiny fraction of pretraining data. The RFT → Value Pretraining → PPO pipeline is a reusable recipe for other low-resource agentic RL domains.
- **Discrete milestone rewards > continuous speedup rewards** for optimization tasks with noisy measurements. The robust reward design avoids outlier-driven training while still incentivizing genuine performance gains.
- **LLM-based kernel generation is now competitive with (and often superior to) compiler-driven optimization.** This is a significant milestone -- it suggests a path where AI agents handle performance-critical low-level optimization that currently requires deep hardware expertise.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## 概要

大语言模型在通用编程方面表现出色，但在编写优化的 CUDA 内核时仍然难以超越 `torch.compile`。CUDA Agent 通过大规模 **智能体强化学习** 解决了这一问题：可扩展的数据合成管线（6K 合成算子任务）、配备防作弊机制的技能增强 CUDA 开发环境，以及多阶段预热技术（RFT + Value Pretraining）稳定 150 步 RL 训练。最终结果：在 KernelBench Level-1/2/3 上相比 `torch.compile` 的 **faster rate 分别达到 100%、100%、92%** —— 在最难的 Level-3 上领先 Claude Opus 4.5 和 Gemini 3 Pro 约 40%。

## 论文信息

- **标题**: CUDA Agent: Large-Scale Agentic RL for High-Performance CUDA Kernel Generation
- **作者**: Weinan Dai\*, Hanlin Wu\* 等
- **机构**: 字节跳动 Seed、清华大学智能产业研究院（AIR）、SIA-Lab
- **arXiv**: [2602.24286](https://arxiv.org/abs/2602.24286)
- **日期**: 2026 年 3 月 2 日

## 1. 问题与动机

GPU 内核优化对深度学习性能至关重要，但需要深厚的硬件专业知识。尽管 LLM 在通用编程上表现优异，在 CUDA 内核生成方面却仍然 **无法与编译器系统** 如 `torch.compile` 竞争。

现有方法分为两类，都有根本性局限：

- **无需训练的方案**（STARK、ReGraphT 等）：依赖手工设计的启发式规则和执行反馈，性能受限于基座模型的内在 CUDA 能力。
- **固定循环内微调**（Kevin、CUDA-L1 等）：多轮执行反馈管线，浪费上下文在历史方案上，且限制了智能体自主学习调试和性能分析策略的能力。

两种范式都无法从根本上提升模型的 CUDA 优化能力。

## 2. 方法

CUDA Agent 建立在三大支柱上：**数据**、**环境** 和 **RL 技术**。

### 2.1 可扩展的数据合成管线

1. **种子问题爬取**：从 `torch` 和 `transformers` 库中挖掘参考算子
2. **组合合成**：LLM 采样最多 5 个算子类并将其组合为融合任务 —— 因为融合问题需要联合优化（共享寄存器/共享内存/占用率约束），不能简单地拼接单独优化的算子
3. **基于规则的过滤**：仅保留可执行、确定性、非平凡的问题（eager 模式运行时间 1-100ms）

最终产出 **CUDA-Agent-Ops-6K** 数据集。

### 2.2 技能增强的智能体循环

智能体循环采用 ReAct 范式（推理 → 执行 → 观察），兼容 OpenHands 框架。CUDA Agent 配备 `SKILL.md` 规范化 CUDA 优化流程：

1. 分析原生 PyTorch 实现的性能瓶颈
2. 实现自定义 CUDA 算子
3. 在 GPU 沙箱中编译评估，迭代优化
4. 重复直到相比 `torch.compile` 获得 ≥5% 加速

**防奖励作弊机制**（亮点）：
- 评估脚本通过 **文件权限保护**，智能体无法修改
- 上下文管理器 **禁止回退** 到 `torch.nn.functional`
- 5 个随机输入验证正确性
- GPU 同步、预热迭代、多次测量取平均
- 不提供网络搜索工具

### 2.3 鲁棒的奖励调度

采用 **离散里程碑式奖励**（而非原始加速比）：

- -1：正确性检查失败
- 3：同时快于 eager 和 compile
- 2：仅快于 eager
- 1：正确但未加速

"快于"定义为 >5% 的加速。这种归一化奖励避免了异常值驱动的优化。

### 2.4 多阶段预热实现稳定训练

训练不稳定的根本原因是 **领域分布不匹配** —— CUDA 代码不到预训练数据的 0.01%，导致低概率 token 和重要性采样比爆炸。

多阶段预热方案：

1. **单轮 RL**：在基座模型（Seed1.6，23B 激活 / 230B 总参数 MoE）上用 PPO 训练基本 CUDA 生成能力
2. **Actor 初始化（RFT）**：收集智能体轨迹，拒绝采样保留高质量轨迹，微调
3. **Critic 初始化（Value Pretraining）**：在轨迹数据上预训练 critic，使其能立即提供有用的优势估计
4. **智能体 RL**：完整 PPO，128K 上下文，训练时最多 150 轮交互（评估时 200 轮）

缺少 RFT → 熵爆炸 → 策略在约 17 步内崩溃。
缺少 Value Pretraining → critic 无法估计价值 → 轨迹长度爆炸。

## 3. 实验与主要结果

**基准测试**：KernelBench（250 个算子任务，Level 1-3）。

### 核心结果（vs. `torch.compile`）

| 模型 | L1 Faster Rate | L2 Faster Rate | L3 Faster Rate | L3 加速比 |
|------|:-:|:-:|:-:|:-:|
| GLM 4.6 | 32% | 11% | 10% | 0.62x |
| Kimi K2 | 39% | 15% | 6% | 0.29x |
| Gemini 3 Pro | 72% | 76% | 52% | 1.17x |
| Claude Opus 4.5 | 72% | 69% | 50% | 1.10x |
| **CUDA Agent** | **97%** | **100%** | **90%** | **1.52x** |

三个要点：
- CUDA Agent **大幅超越** 专有模型，尤其在困难任务上（L3 差距约 40%）
- Level 2（算子序列/融合）优势最大：100% faster rate，2.80x 加速。编译器启发式规则无法处理非平凡的融合模式
- 学习到的优化策略可以 **持续超越静态编译器启发式**

### 消融实验要点

每个组件都很重要，但智能体循环贡献最大 —— 没有它，模型几乎无法超越 `torch.compile`。

## 4. 优势与局限

**优势：**
- 全面的防奖励作弊设计
- 多阶段预热有清晰的动机和充分的消融实验
- 组合式数据合成创造了真正新颖的优化挑战
- SOTA 结果且优势显著

**局限：**
- 基于 Seed1.6（230B MoE）—— 不清楚多少能力可迁移到更小的模型
- 仅在 KernelBench 上评估；真实世界的内核优化有额外复杂性
- 128 块 H20 GPU 的沙箱池是重大资源需求

## 5. 启示

- **智能体 RL > 固定管线**：让模型自主学习调试和性能分析策略，比约束在预设多轮模板中更有效。
- **领域特定预热至关重要**：当目标领域仅占预训练数据极小比例时，RFT → Value Pretraining → PPO 管线是可复用的方案。
- **离散里程碑奖励 > 连续加速比奖励**：对于测量噪声大的优化任务，鲁棒的奖励设计避免了异常值驱动的训练。
- **基于 LLM 的内核生成已可与编译器驱动的优化竞争（甚至超越）**，这是一个重要的里程碑。

</div>
