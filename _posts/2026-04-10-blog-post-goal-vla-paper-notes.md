---
title: "[Paper Notes] Goal-VLA: Image-Generative VLMs as Object-Centric World Models Empowering Zero-shot Robot Manipulation"
date: 2026-04-10
permalink: /posts/2026/04/goal-vla-paper-notes/
tags:
  - Vision-Language-Action
  - Zero-shot Manipulation
  - World Model
  - Goal-conditioned
  - Spatial Grounding
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Goal-VLA proposes a **zero-shot** robotic manipulation framework that uses image-generative VLMs as **object-centric world models**. Instead of training end-to-end VLAs on expensive paired action data, Goal-VLA generates a goal image depicting the desired task outcome, extracts a precise 3D object pose from it via feature matching and point cloud registration, and then uses a training-free low-level policy to execute the manipulation. A novel **Reflection-through-Synthesis** mechanism iteratively validates and refines the generated goal image before execution. The result: 59.9% average success in RLBench simulation (vs. 26% for the best baseline MOKA) and 60% in real-world tasks — all **zero-shot**, with no task-specific fine-tuning.

## Paper Info

- **Title**: Goal-VLA: Image-Generative VLMs as Object-Centric World Models Empowering Zero-shot Robot Manipulation
- **Authors**: Haonan Chen*, Jingxiang Guo*, Bangjun Wang, Tianrui Zhang, Xuchuan Huang, Boren Zheng, Yiwen Hou, Chenrui Tie, Jiajun Deng, Lin Shao†
- **Affiliations**: National University of Singapore, HKU, Peking University, Tsinghua University
- **arXiv**: [2506.23919](https://arxiv.org/abs/2506.23919)
- **Project page**: [nus-lins-lab.github.io/goalvlaweb](https://nus-lins-lab.github.io/goalvlaweb/)

## 1. Problem and Motivation

Generalization in robotic manipulation is hard. Two dominant VLA paradigms both have critical weaknesses:

| Paradigm | Intermediate Repr. | Training-Free? | Precise 3D Grounding? |
|---|---|---|---|
| **End-to-end VLAs** (OpenVLA, π₀) | N/A | ✗ | ✗ |
| **Hierarchical VLAs** (MOKA, VoxPoser, SUSIE) | Keypoints / Value maps / Subgoal images | Partially | ✗ |
| **Goal-VLA (this paper)** | Object state (goal image → 3D pose) | ✓ | ✓ |

The key insight: **object state representation is the golden interface** that naturally separates high-level semantic reasoning from low-level spatial control. End-to-end models need massive action data. Hierarchical models either use sparse representations (keypoints — not enough spatial detail) or dense ones (subgoal images — but then need trained low-level policies to interpret them). VLMs excel at semantic reasoning but struggle with precise spatial reasoning.

Goal-VLA resolves this by letting the VLM do what it's good at (semantic goal generation) and offloading spatial grounding to a dedicated geometric module.

## 2. Method

The framework has three stages:

### 2.1 Goal State Reasoning (High-Level)

Given an RGB-D observation \\(O = (I, D)\\) and language instruction \\(L\\):

1. **Prompt Enhancement**: Feed \\(I\\) and \\(L\\) into a text-output VLM (Gemini 2.5 Pro) to produce a richer, more descriptive prompt \\(L_e\\).
2. **Goal Image Generation**: An image-generative VLM (Gemini 2.5 Flash-image) generates a candidate goal image \\(I'\_{\text{cand}}\\).
3. **Reflection-through-Synthesis Loop** (the key novelty):
   - **Synthesize**: Segment the target object from the candidate goal using Grounded SAM, overlay it onto the original scene with partial transparency
   - **Reflect**: A Reflector VLM evaluates whether the synthesized image is semantically correct and physically feasible
   - **Refine**: If rejected, the Reflector generates corrective feedback for the next generation attempt
   - Repeat until validated or max iterations reached

This is clever — the synthesis step grounds the reflection by showing the goal object *in the context of the original scene*, making errors much easier to spot (e.g., the VLM moving the pan along with the tomato).

### 2.2 Spatial Grounding

Once a valid goal image \\(I'\\) is obtained, convert the semantic goal into a precise 3D transformation:

**Semantic Matching**: Use Geo-Aware features to find pixel correspondences between initial image \\(I\\) and goal image \\(I'\\):

\\((x', y') = \arg\max\_{(p,q)} \frac{f\_{(x,y)} \cdot f'\_{(p,q)}}{\|f\_{(x,y)}\| \|f'\_{(p,q)}\|}\\)

This is necessary because the generated goal image is semantically correct but may not preserve instance-level appearance — so traditional optical flow fails.

**Point Cloud Registration**: Lift 2D to 3D using depth, align depth scales via least-squares regression on background pixels:

\\(D[(M \cup M')^c] = s_1 \cdot D'[(M \cup M')^c] + b\\)

Then solve for a similarity transformation using the Umeyama algorithm:

\\(s_2 \cdot P' = RP + t\\)

where \\(R \in SO(3)\\), \\(t \in \mathbb{R}^3\\), and \\(s_2\\) accounts for scale differences.

### 2.3 Low-Level Policy

- **Contact Module**: Sample-based method to find feasible contact poses on the object's point cloud (surface normals → collision filtering → geometric scoring)
- **Goal Pose**: Apply the computed \\((R, t)\\) transformation to the contact pose
- **Motion Planning**: Standard sample-based planner to execute the trajectory

The entire low-level policy is **training-free** — no action data needed.

## 3. Experiments and Main Results

### Simulation (RLBench, 8 tasks, 100 trials each)

| Method | Paradigm | Avg Success |
|---|---|---|
| OpenVLA | End-to-end | 0.2% |
| π₀ | End-to-end | 0.0% |
| SUSIE | Hierarchical | 0.0% |
| VoxPoser | Hierarchical | 5.8% |
| MolmoAct | End-to-end | 11.3% |
| MOKA | Hierarchical | 26.0% |
| **Goal-VLA** | **Hierarchical** | **59.9%** |

End-to-end models completely fail in zero-shot settings — they're brittle without in-domain action data. Goal-VLA more than doubles the best baseline.

### Real World (4 tasks, 10 trials each)

| Method | Tomato | Sweeping | Duck | Bottle | Avg |
|---|---|---|---|---|---|
| OpenVLA | 0/10 | 0/10 | 0/10 | 0/10 | 0% |
| MOKA | 5/10 | 1/10 | 3/10 | 0/10 | 22.5% |
| MolmoAct | 5/10 | 0/10 | 6/10 | 0/10 | 27.5% |
| **Goal-VLA** | **9/10** | **4/10** | **7/10** | **4/10** | **60%** |

### Ablation Study

| Configuration | Avg Success |
|---|---|
| Base (no enhancement, no reflection) | 40.0% |
| + Reflector only | 51.2% |
| + Input Enhancement only | 67.5% |
| + Both (max 1 reflection) | 83.8% |
| + Both (max 3 reflections) | **88.8%** |

Input Enhancement contributes the most (+27.5pp), Reflection adds +11.2pp, and they're complementary. More reflection iterations help further.

## 4. Strengths

- **Truly zero-shot**: No task-specific fine-tuning, no paired action data — the whole pipeline uses off-the-shelf foundation models
- **Object-centric abstraction**: By focusing on object state rather than agent-centric representations, the framework is inherently cross-embodiment
- **Reflection-through-Synthesis is well-designed**: The synthesis overlay trick makes VLM self-evaluation much more reliable by providing in-context visual comparison
- **Strong empirical results**: 2.3× the best baseline in simulation, 2.2× in real world
- **Minimal assumptions**: Only requires a single RGB-D view and language instruction — no pre-scanned maps, object meshes, or task-specific priors

## 5. Limitations

- **Depth estimation bottleneck**: Most real-world failures trace back to inaccurate depth in the spatial grounding module, especially for precision-demanding tasks (weighing duck, bottle stand-up)
- **High-level reasoning failures**: Table sweeping requires sophisticated semantic understanding that the VLM sometimes gets wrong
- **Rigid-body assumption**: The framework assumes rigid object transformations — deformable objects or articulated manipulations would need extensions
- **Latency**: Multiple VLM calls (prompt enhancement → image generation → reflection loop) means this is not a real-time system
- **Limited task complexity**: All evaluated tasks are single-step pick-and-place style — long-horizon multi-step manipulation is not addressed
- **Dependency on commercial VLMs**: Uses Gemini 2.5 Pro/Flash, which may not always be available or affordable

## 6. Takeaways

- **Object state as the interface** between high-level and low-level is a powerful design choice — it cleanly separates what VLMs are good at (semantics) from what geometric methods are good at (spatial precision)
- **Image-generative VLMs as world models** is a natural and underexplored direction — instead of training robot-specific world models, just use the VLM's ability to imagine future states
- **Reflection-through-Synthesis** is a generally useful technique: synthesize the proposed change *in context* before evaluating it, rather than evaluating the generated output in isolation
- The massive gap between end-to-end VLAs (0-0.2%) and Goal-VLA (59.9%) in zero-shot settings is striking — it suggests that current end-to-end VLAs have essentially no zero-shot capability outside their training distribution

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，请使用顶部导航栏的语言切换按钮。

## 概要

Goal-VLA 提出了一种**零样本**机器人操作框架，利用图像生成式 VLM 作为**以物体为中心的世界模型**。与在昂贵的配对动作数据上训练端到端 VLA 不同，Goal-VLA 生成一张描绘期望任务结果的目标图像，通过特征匹配和点云配准从中提取精确的 3D 物体位姿，然后使用无需训练的底层策略执行操作。其核心创新 **Reflection-through-Synthesis** 机制在执行前迭代验证和改进生成的目标图像。最终效果：RLBench 仿真中平均成功率 59.9%（最优基线 MOKA 为 26%），真实世界任务中 60%——全部**零样本**，无需任何任务特定微调。

## 论文信息

- **标题**：Goal-VLA: Image-Generative VLMs as Object-Centric World Models Empowering Zero-shot Robot Manipulation
- **作者**：Haonan Chen*, Jingxiang Guo*, Bangjun Wang, Tianrui Zhang, Xuchuan Huang, Boren Zheng, Yiwen Hou, Chenrui Tie, Jiajun Deng, Lin Shao†
- **单位**：新加坡国立大学、香港大学、北京大学、清华大学
- **arXiv**：[2506.23919](https://arxiv.org/abs/2506.23919)
- **项目主页**：[nus-lins-lab.github.io/goalvlaweb](https://nus-lins-lab.github.io/goalvlaweb/)

## 1. 问题与动机

机器人操作中的泛化能力始终是核心挑战。两种主流 VLA 范式各有致命缺陷：

| 范式 | 中间表征 | 无需训练？ | 精确3D定位？ |
|---|---|---|---|
| **端到端 VLA**（OpenVLA, π₀） | 无 | ✗ | ✗ |
| **分层 VLA**（MOKA, VoxPoser, SUSIE） | 关键点 / 价值图 / 子目标图像 | 部分 | ✗ |
| **Goal-VLA（本文）** | 物体状态（目标图像 → 3D位姿） | ✓ | ✓ |

关键洞察：**物体状态表征是连接高层语义推理和底层空间控制的黄金接口**。端到端模型需要大量动作数据；分层模型要么使用稀疏表征（关键点——空间细节不足），要么使用密集表征（子目标图像——但需要训练底层策略来解读）。VLM 擅长语义推理，但在精确空间推理上表现较弱。

Goal-VLA 的解决方案：让 VLM 做它擅长的事（语义目标生成），把空间定位交给专门的几何模块。

## 2. 方法

框架分为三个阶段：

### 2.1 目标状态推理（高层）

给定 RGB-D 观测 \\(O = (I, D)\\) 和语言指令 \\(L\\)：

1. **提示增强**：将 \\(I\\) 和 \\(L\\) 送入文本输出 VLM（Gemini 2.5 Pro），生成更丰富的描述性提示 \\(L_e\\)
2. **目标图像生成**：图像生成 VLM（Gemini 2.5 Flash-image）生成候选目标图像 \\(I'\_{\text{cand}}\\)
3. **Reflection-through-Synthesis 循环**（核心创新）：
   - **合成**：使用 Grounded SAM 从候选目标中分割目标物体，以半透明方式叠加到原始场景上
   - **反思**：反思 VLM 评估合成图像是否语义正确且物理可行
   - **改进**：如果被拒绝，反思器生成修正反馈用于下一次生成
   - 重复直到验证通过或达到最大迭代次数

这个设计很巧妙——合成步骤通过将目标物体展示在*原始场景的上下文中*来锚定反思过程，使错误更容易被发现（例如 VLM 在移动番茄时连锅一起移动了）。

### 2.2 空间定位

获得有效目标图像 \\(I'\\) 后，将语义目标转换为精确的 3D 变换：

**语义匹配**：使用 Geo-Aware 特征在初始图像 \\(I\\) 和目标图像 \\(I'\\) 之间找到像素对应关系：

\\((x', y') = \arg\max\_{(p,q)} \frac{f\_{(x,y)} \cdot f'\_{(p,q)}}{\|f\_{(x,y)}\| \|f'\_{(p,q)}\|}\\)

这是必要的，因为生成的目标图像语义正确但可能无法保持实例级外观——传统光流方法会失效。

**点云配准**：利用深度信息将 2D 提升到 3D，通过背景像素的最小二乘回归对齐深度尺度：

\\(D[(M \cup M')^c] = s_1 \cdot D'[(M \cup M')^c] + b\\)

然后使用 Umeyama 算法求解相似变换：

\\(s_2 \cdot P' = RP + t\\)

其中 \\(R \in SO(3)\\)，\\(t \in \mathbb{R}^3\\)，\\(s_2\\) 补偿尺度差异。

### 2.3 底层策略

- **接触模块**：基于采样的方法在物体点云上寻找可行的接触位姿（表面法线 → 碰撞过滤 → 几何评分）
- **目标位姿**：将计算得到的 \\((R, t)\\) 变换应用到接触位姿
- **运动规划**：标准的基于采样的规划器执行轨迹

整个底层策略**无需训练**——不需要动作数据。

## 3. 实验与主要结果

### 仿真实验（RLBench，8个任务，每个100次试验）

| 方法 | 范式 | 平均成功率 |
|---|---|---|
| OpenVLA | 端到端 | 0.2% |
| π₀ | 端到端 | 0.0% |
| SUSIE | 分层 | 0.0% |
| VoxPoser | 分层 | 5.8% |
| MolmoAct | 端到端 | 11.3% |
| MOKA | 分层 | 26.0% |
| **Goal-VLA** | **分层** | **59.9%** |

端到端模型在零样本设定下完全失败——没有领域内动作数据就非常脆弱。Goal-VLA 是最优基线的两倍以上。

### 真实世界（4个任务，每个10次试验）

| 方法 | 番茄 | 扫桌 | 鸭子 | 瓶子 | 平均 |
|---|---|---|---|---|---|
| OpenVLA | 0/10 | 0/10 | 0/10 | 0/10 | 0% |
| MOKA | 5/10 | 1/10 | 3/10 | 0/10 | 22.5% |
| MolmoAct | 5/10 | 0/10 | 6/10 | 0/10 | 27.5% |
| **Goal-VLA** | **9/10** | **4/10** | **7/10** | **4/10** | **60%** |

### 消融实验

| 配置 | 平均成功率 |
|---|---|
| 基础版（无增强、无反思） | 40.0% |
| + 仅反思器 | 51.2% |
| + 仅输入增强 | 67.5% |
| + 两者结合（最多1次反思） | 83.8% |
| + 两者结合（最多3次反思） | **88.8%** |

输入增强贡献最大（+27.5pp），反思增加了 +11.2pp，两者互补。更多的反思迭代进一步提升性能。

## 4. 优势

- **真正的零样本**：无需任务特定微调、无需配对动作数据——整个流水线使用现成的基础模型
- **以物体为中心的抽象**：聚焦物体状态而非以智能体为中心的表征，框架天然具备跨形体能力
- **Reflection-through-Synthesis 设计精巧**：合成叠加技巧通过提供上下文内的视觉比较，使 VLM 自我评估更加可靠
- **实验结果优异**：仿真中为最优基线的 2.3 倍，真实世界中为 2.2 倍
- **假设最少**：只需要单视角 RGB-D 和语言指令——不需要预扫描地图、物体模型或任务特定先验

## 5. 局限性

- **深度估计瓶颈**：大多数真实世界失败源于空间定位模块中的深度不准确，尤其是对精度要求高的任务（称鸭子、竖瓶子）
- **高层推理失败**：扫桌任务需要复杂的语义理解，VLM 有时无法胜任
- **刚体假设**：框架假设刚体变换——可变形物体或铰接操作需要扩展
- **延迟较高**：多次 VLM 调用（提示增强 → 图像生成 → 反思循环）意味着这不是实时系统
- **任务复杂度有限**：所有评估任务都是单步抓放式——未涉及长程多步操作
- **依赖商业 VLM**：使用 Gemini 2.5 Pro/Flash，可能并非总是可用或经济实惠

## 6. 总结与启示

- **物体状态作为高低层之间的接口**是一个很好的设计选择——清晰地分离了 VLM 擅长的（语义）和几何方法擅长的（空间精度）
- **图像生成 VLM 作为世界模型**是一个自然且尚未充分探索的方向——与其训练机器人专用的世界模型，不如直接利用 VLM 想象未来状态的能力
- **Reflection-through-Synthesis** 是一种通用有用的技术：在评估之前，先将提议的变化*在上下文中*合成出来，而不是孤立地评估生成输出
- 端到端 VLA（0-0.2%）与 Goal-VLA（59.9%）在零样本设定下的巨大差距令人震惊——这表明当前端到端 VLA 在训练分布之外基本上没有零样本能力

</div>
