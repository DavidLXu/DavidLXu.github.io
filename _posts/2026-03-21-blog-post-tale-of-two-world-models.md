---
title: "A Tale of Two World Models: WAMs vs. Action-Conditioned World Models"
date: 2026-03-21
permalink: /posts/2026/03/tale-of-two-world-models/
tags:
  - Robotics
  - World Models
  - Video Generation
  - Robot Learning
  - Reinforcement Learning
  - Planning
  - Blog Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Two distinct "world model" recipes are emerging in robotics: **World Action Models (WAMs)** that take `[Image + Text] → [Video + Actions]`, and **Action-Conditioned World Models (AC-WMs)** that take `[Image + Future Actions] → [Video]`. WAMs better preserve pre-trained video model capabilities and enable easy cross-embodiment training; AC-WMs unlock broader data utilization (including failures and play), RL inside the world model, and fine-grained planning. The long-term winner is likely a **flexibly conditioned model** that can condition on either text or actions, getting the best of both worlds.

This is a summary of [Anirudha Majumdar's blog post](https://x.com/Majumdar_Ani/status/2033910830048125090) (March 2026).

## Context

As of early 2026, world model-based approaches are starting to surpass vision-language-action models (VLAs) on benchmarks like DROID on RoboArena [1]. The top performer is **DreamZero** [2], a WAM fine-tuned from a video model. The central design question: **should the world model condition its generation on a sequence of future robot actions?**

## Two Recipes

### World Action Models (WAMs)

**Input-output**: `[Current Image + Text Instruction]` → `[Video + Actions]`

The model generates a video of successful task execution from a language instruction, then decodes robot actions from the video. Two decoding strategies:
1. **Sequential**: generate video first, then use a vision pipeline to extract actions (e.g., Large Video Planner [3])
2. **Joint**: train an inverse dynamics model alongside the video generator (e.g., mimic-video [4], DreamZero [2], VideoPolicy [5], UVA [6])

### Action-Conditioned World Models (AC-WMs)

**Input-output**: `[Current Image + Future Actions]` → `[Video]`

The model simulates the consequences of given actions. Examples: Dreamer [7], Veo-Robotics [8], Ctrl-World [9], DreamDojo [10], PlayWorld [11]. Dynamics can also be modeled in latent space (e.g., V-JEPA2 [13]).

## Arguments for WAMs

| Advantage | Explanation |
|---|---|
| **Preserving pre-trained abilities** | WAMs share the same input modalities (image + text) as pre-trained video models → minimal distribution shift during fine-tuning. AC-WMs must learn to condition on action representations, which can destroy pre-trained capabilities. |
| **Easier learning problem** | WAMs only need to model what *successful* task execution looks like, rather than predicting consequences of arbitrary actions. |
| **Good action proposals** | WAMs enable best-of-N planning [14]: generate diverse candidate plans by varying text prompts, score with a reward model, pick the best. AC-WMs need a separate policy to propose actions. |
| **Cross-embodiment training** | WAM video generation is embodiment-agnostic; only the action decoder needs embodiment-specific fine-tuning with limited data [4]. AC-WMs face the open challenge of conditioning on heterogeneous action spaces. |

## Arguments for AC-WMs

| Advantage | Explanation |
|---|---|
| **Data, data, data** | AC-WMs can train on *all* robot data — successes, failures, and autonomous play [11]. WAMs require hindsight relabeling of "tasks", which is hard to scale. |
| **Beyond behavior cloning** | WAMs are still instruction-in → actions-out (behavior cloning with a video objective). AC-WMs enable RL inside the world model (e.g., World-Gymnast [15], PlayWorld [11]) and planning via counterfactual simulation (e.g., DreamDojo [10]). |
| **Fine-grained planning** | AC-WMs support gradient-based action-sequence optimization at inference time. WAMs would require gradient-based optimization in text/prompt or diffusion-noise space — feasibility unclear. |
| **Policy evaluation** | AC-WMs allow closed-loop policy rollouts inside the model (e.g., Veo-Robotics [8], WorldGym [17]). WAMs cannot do this since they lack action conditioning. |

### A Non-Argument

"AC-WMs uniquely enable inference-time scaling via planning" — this is **not** a valid differentiator. WAMs can also do best-of-N planning with a reward model [14].

## Long-Term Prediction

Applying **Sutton's bitter lesson** (which approach scales better with compute and data?):

- AC-WMs have a clearer data scaling story: all policy rollouts + autonomous play data can be thrown in
- In the long term, frontier labs may **pre-train video models with actions as an input modality** once the commercial case for robotics is clear
- This would eliminate WAMs' main advantage (preserving pre-training abilities), while AC-WMs' advantages (RL, fine-grained planning) would keep improving with scale

## The Best of Both Worlds: Flexible Conditioning

The likely convergence point is a **flexibly conditioned world model** that can accept *either* text or actions as conditioning (e.g., by masking the unused input during training). Such a unified model would enable:

- Easy action proposal generation (WAM mode)
- Training on vast failure and play data (AC-WM mode)
- Fine-grained planning at inference time
- RL inside the world model
- Policy evaluation

## Key Takeaways

1. **WAMs are surprisingly strong** — they preserve pre-trained video model abilities and are the current SOTA (DreamZero on DROID)
2. **AC-WMs have the better long-term scaling story** — they can leverage all robot data, not just success demonstrations
3. **The dichotomy is likely false** — flexibly conditioned models that handle both text and action inputs will probably win out
4. **Inference-time planning is not exclusive to AC-WMs** — WAMs can do best-of-N planning with reward models

## References

- [1] Atreya et al., 2025, "RoboArena: Distributed Real-World Evaluation of Generalist Robot Policies"
- [2] Ye et al., 2026, "DreamZero: World Action Models are Zero-shot Policies"
- [3] Chen et al., 2025, "Large Video Planner Enables Generalizable Robot Control"
- [4] Pai et al., 2025, "mimic-video: Video-Action Models for Generalizable Robot Control Beyond VLAs"
- [5] Liang et al., 2025, "Video Generators are Robot Policies"
- [6] Li et al., 2025, "Unified Video Action Model"
- [7] Hafner et al., 2025, "Training Agents Inside of Scalable World Models"
- [8] Gemini Robotics Team et al., 2025, "Evaluating Gemini Robotics Policies in a Veo World Simulator"
- [9] Guo et al., 2025, "Ctrl-World: A Controllable Generative World Model for Robot Manipulation"
- [10] Gao et al., 2026, "DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos"
- [11] Yin et al., 2026, "PlayWorld: Learning Robot World Models from Autonomous Play"
- [12] Ha and Schmidhuber, 2018, "World Models"
- [13] Assran et al., 2025, "V-JEPA 2: Self-Supervised Video Models Enable Understanding, Prediction and Planning"
- [14] Kim et al., 2026, "Cosmos Policy: Fine-Tuning Video Models for Visuomotor Control and Planning"
- [15] Sharma et al., 2026, "World-Gymnast: Training Robots with Reinforcement Learning in a World Model"
- [16] Wagenmaker et al., 2025, "Steering Your Diffusion Policy with Latent Space Reinforcement Learning"
- [17] Quevedo et al., 2025, "WorldGym: World Model as An Environment for Policy Evaluation"

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

机器人领域正在涌现两种截然不同的"世界模型"方案：**世界动作模型 (WAMs)**，输入 `[图像 + 文本]` 输出 `[视频 + 动作]`；以及**动作条件世界模型 (AC-WMs)**，输入 `[图像 + 未来动作]` 输出 `[视频]`。WAMs 能更好地保留预训练视频模型的能力，并支持跨具身平台训练；AC-WMs 能利用更广泛的数据（包括失败数据和自主游戏数据）、在世界模型内做强化学习、以及实现细粒度规划。长期来看，最终胜出的很可能是**灵活条件化的世界模型**——既可以文本为条件，也可以动作为条件，兼取两者之长。

本文为 [Anirudha Majumdar 的博客文章](https://x.com/Majumdar_Ani/status/2033910830048125090)（2026年3月）的结构化笔记。

## 背景

截至2026年初，基于世界模型的方法在 RoboArena [1] 上的 DROID 基准测试中已开始超越视觉-语言-动作模型 (VLAs)。目前表现最佳的是 **DreamZero** [2]——一个从视频模型微调而来的 WAM。核心设计问题是：**世界模型是否应该以未来的机器人动作序列作为生成条件？**

## 两种方案

### 世界动作模型 (WAMs)

**输入-输出**：`[当前图像 + 文本指令]` → `[视频 + 动作]`

模型根据语言指令生成任务执行的视频，然后从视频中解码机器人动作。两种解码策略：
1. **顺序式**：先生成视频，再用视觉流水线提取动作（如 Large Video Planner [3]）
2. **联合式**：与视频生成器同时训练逆动力学模型（如 mimic-video [4]、DreamZero [2]、VideoPolicy [5]、UVA [6]）

### 动作条件世界模型 (AC-WMs)

**输入-输出**：`[当前图像 + 未来动作]` → `[视频]`

模型模拟给定动作的执行后果。代表工作：Dreamer [7]、Veo-Robotics [8]、Ctrl-World [9]、DreamDojo [10]、PlayWorld [11]。也可以在潜空间中建模动力学（如 V-JEPA2 [13]）。

## WAMs 的优势

| 优势 | 说明 |
|---|---|
| **保留预训练能力** | WAMs 与预训练视频模型共享相同的输入模态（图像 + 文本）→ 微调时分布偏移小。AC-WMs 需要学习以动作表示为条件，可能破坏预训练能力。 |
| **更简单的学习问题** | WAMs 只需建模*成功*的任务执行过程，无需预测任意动作的后果。 |
| **良好的动作提议** | WAMs 支持 best-of-N 规划 [14]：通过变换文本提示生成多样的候选方案，用奖励模型评分后选择最优。AC-WMs 需要额外的策略来提议动作。 |
| **跨具身平台训练** | WAM 的视频生成与具身平台无关；只有动作解码器需要少量具身平台特定数据微调 [4]。AC-WMs 面临异构动作空间条件化的开放性挑战。 |

## AC-WMs 的优势

| 优势 | 说明 |
|---|---|
| **数据，数据，数据** | AC-WMs 可以利用*所有*机器人数据——成功的、失败的、自主游戏的 [11]。WAMs 需要对"任务"进行事后标注，这难以规模化。 |
| **超越行为克隆** | WAMs 本质仍是"指令输入 → 动作输出"的行为克隆范式。AC-WMs 可以在世界模型内做强化学习（如 World-Gymnast [15]、PlayWorld [11]），或通过反事实模拟进行规划（如 DreamDojo [10]）。 |
| **细粒度规划** | AC-WMs 支持基于梯度的推理时动作序列优化。WAMs 理论上也可以，但需要在文本/提示空间或扩散噪声空间做梯度优化——可行性存疑。 |
| **策略评估** | AC-WMs 可以在模型内进行闭环策略展开（如 Veo-Robotics [8]、WorldGym [17]）。WAMs 因缺少动作条件化而无法实现。 |

### 一个无效论点

"AC-WMs 独有地支持通过规划实现推理时扩展"——这**不是**有效的区分点。WAMs 同样可以结合奖励模型实现 best-of-N 规划 [14]。

## 长期预测

从 **Sutton 的苦涩教训**出发（哪种方法在计算和数据上的扩展性更好？）：

- AC-WMs 的数据扩展故事更清晰：所有的策略展开数据 + 自主游戏数据都可以纳入训练
- 长期来看，前沿 AI ��验室可能会**在视频模型预训练中加入动作作为输入模态**——一旦机器人的商业前景明确
- 这将消除 WAMs 的主要优势（保留预训练能力），而 AC-WMs 的优势（强化学习、细粒度规划）将随着规模扩展持续提升

## 两全其美：灵活条件化

最终很可能收敛到**灵活条件化的世界模型**——可以接受文本或动作中的任一种作为条件输入（例如在训练时遮蔽未使用的输入）。这种统一模型将实现：

- 轻松生成动作提议（WAM 模式）
- 利用海量失败和游戏数据训练（AC-WM 模式）
- 推理时的细粒度规划
- 在世界模型内做强化学习
- 策略评估

## 核心要点

1. **WAMs 出人意料地强大**——它们保留了预训练视频模型能力，是当前 SOTA（DreamZero 在 DROID 上领先）
2. **AC-WMs 的长期扩展故事更优**——它们能利用所有机器人数据，而不仅仅是成功示范
3. **这种二分法很可能是虚假的**——同时处理文本和动作输入的灵活条件化模型最终可能会胜出
4. **推理时规划并非 AC-WMs 独有**——WAMs 也可以借助奖励模型实现 best-of-N 规划

## 参考文献

- [1] Atreya et al., 2025, "RoboArena: Distributed Real-World Evaluation of Generalist Robot Policies"
- [2] Ye et al., 2026, "DreamZero: World Action Models are Zero-shot Policies"
- [3] Chen et al., 2025, "Large Video Planner Enables Generalizable Robot Control"
- [4] Pai et al., 2025, "mimic-video: Video-Action Models for Generalizable Robot Control Beyond VLAs"
- [5] Liang et al., 2025, "Video Generators are Robot Policies"
- [6] Li et al., 2025, "Unified Video Action Model"
- [7] Hafner et al., 2025, "Training Agents Inside of Scalable World Models"
- [8] Gemini Robotics Team et al., 2025, "Evaluating Gemini Robotics Policies in a Veo World Simulator"
- [9] Guo et al., 2025, "Ctrl-World: A Controllable Generative World Model for Robot Manipulation"
- [10] Gao et al., 2026, "DreamDojo: A Generalist Robot World Model from Large-Scale Human Videos"
- [11] Yin et al., 2026, "PlayWorld: Learning Robot World Models from Autonomous Play"
- [12] Ha and Schmidhuber, 2018, "World Models"
- [13] Assran et al., 2025, "V-JEPA 2: Self-Supervised Video Models Enable Understanding, Prediction and Planning"
- [14] Kim et al., 2026, "Cosmos Policy: Fine-Tuning Video Models for Visuomotor Control and Planning"
- [15] Sharma et al., 2026, "World-Gymnast: Training Robots with Reinforcement Learning in a World Model"
- [16] Wagenmaker et al., 2025, "Steering Your Diffusion Policy with Latent Space Reinforcement Learning"
- [17] Quevedo et al., 2025, "WorldGym: World Model as An Environment for Policy Evaluation"

</div>
