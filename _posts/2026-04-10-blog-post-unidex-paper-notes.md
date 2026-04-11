---
title: "[Paper Notes] UniDex: A Robot Foundation Suite for Universal Dexterous Hand Control from Egocentric Human Videos"
date: 2026-04-10
permalink: /posts/2026/04/unidex-paper-notes/
tags:
  - Dexterous Manipulation
  - Vision-Language-Action
  - Human Video Learning
  - Cross-Embodiment
  - Foundation Model
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

UniDex is a complete foundation suite for **universal dexterous hand control**, built from egocentric human videos rather than expensive robot teleoperation data. It introduces three tightly coupled components: (1) **UniDex-Dataset** — 50K+ trajectories across 8 different robot hands (6–24 DoFs) retargeted from human video data; (2) **FAAS** (Function–Actuator–Aligned Space) — a unified action representation that maps functionally similar joints across different hands to shared coordinates, enabling cross-hand transfer; and (3) **UniDex-VLA** — a 3D vision-language-action policy pretrained on this dataset. On five challenging real-world tool-use tasks, UniDex-VLA achieves **81% average task progress** (vs. 38% for π₀), demonstrates zero-shot cross-hand skill transfer, and shows that human video data can partially substitute for robot demonstrations at a ~2:1 exchange rate. Accepted at **CVPR 2026**.

## Paper Info

- **Title**: UniDex: A Robot Foundation Suite for Universal Dexterous Hand Control from Egocentric Human Videos
- **Authors**: Gu Zhang†, Qicheng Xu*, Haozhe Zhang*, Jianhan Ma*, Long He*, Yiming Bao*, and 13 additional contributors
- **Affiliations**: Tsinghua University, Shanghai Qizhi Institute, Sun Yat-sen University, UNC Chapel Hill
- **Venue**: CVPR 2026
- **arXiv**: [2603.22264](https://arxiv.org/abs/2603.22264)
- **Project page**: [unidex-ai.github.io](https://unidex-ai.github.io)
- **Code**: [github.com/unidex-ai/UniDex](https://github.com/unidex-ai/UniDex)

## 1. Problem and Motivation

Dexterous manipulation with multi-fingered hands is hard — and building foundation models for it is even harder than for grippers, for three reasons:

1. **Data scarcity**: Dexterous hand teleoperation is expensive and doesn't scale. Most existing robot foundation datasets are gripper-centric.
2. **Embodiment heterogeneity**: Dexterous hands vary wildly in DoFs (6–24), morphology, kinematics, and appearance. A policy trained on one hand doesn't transfer to another.
3. **High dimensionality**: Controlling 20+ joints simultaneously demands expressive action spaces and effective learning algorithms.

The key insight: **dexterous robot hands are designed to mimic human hands**, and humans naturally generate abundant manipulation data in daily life. Egocentric human videos are cheaper, more diverse, and easier to scale than robot teleoperation. The challenge is bridging the *kinematic* and *visual* gaps between human and robot hands.

## 2. Method

### 2.1 UniDex-Dataset: From Human Videos to Robot Trajectories

**Data Sources**: Four egocentric human-manipulation datasets — H2O, HOI4D, HOT3D, and TACO — providing diverse daily manipulation activities.

**Human-to-Robot Transformation Pipeline**:

1. **Visual alignment**: Compute pointclouds from RGB-D, mask out human hands (using WiLoR + SAM2), replace with retargeted robot hand meshes, and reproject to single-view pointcloud
2. **Kinematic retargeting** (human-in-the-loop):
   - Extract $m$ fingertip targets from human hand pose: $X^\star = [x_1^\star, \ldots, x_m^\star] \in \mathbb{R}^{3 \times m}$
   - Introduce a **6-DoF dummy base offset** $T_{\text{offset}}$ for global alignment
   - Solve fingertip IK: $x_i(q; T_{\text{offset}}) = \text{Trans}(T_{\text{world}}^{\text{dummy}} \cdot T_{\text{offset}} \cdot T_i(q)) \in \mathbb{R}^3$
   - **Automatic stage**: IK solver minimizes fingertip error with joint limits/damping
   - **Interactive stage**: Human adjusts $T_{\text{offset}}$ via GUI sliders until contacts look plausible

**Result**: 9M paired image–pointcloud–action frames, 50K+ trajectories, 8 robot hand platforms (Inspire, Leap, Shadow, Allegro, Ability, Oymotion, Xhand, Wuji), covering 6–24 active DoFs.

| Dataset | Trajectories | Hands | Language | Varied Scenes | Pointcloud |
|---|---|---|---|---|---|
| **UniDex-Dataset** | **52K** | **8** | ✓ | ✓ | ✓ |
| ActionNet | 30K | 2 | ✓ | ✗ | low-quality |
| RoboMind | 19K | 1 | ✓ | ✗ | ✗ |
| RealDex | 2K | 2 | ✓ | ✗ | ✓ |

### 2.2 FAAS: Function–Actuator–Aligned Space

The core idea: despite different DoFs and kinematics, all dexterous hands implement the same small set of **functional primitives** — thumb–index pinch, finger curling around handles, lateral ab-/adduction for stabilization.

FAAS maps each actuator to a shared index based on its **functional role**, not its URDF position. This creates a function-centric control interface shared across embodiments:

- **82-dimensional vector**: 18 dims for wrist pose (9d pose × 2 hands = absolute + relative), 64 dims for joint commands (32 slots per hand)
- **21 base actuator slots** shared across all hands; remaining slots for hand-specific DoFs
- Functionally similar joints (e.g., thumb flexion on Allegro vs. Inspire) get the **same FAAS index**

This is elegant because it's purely a mapping — no learned alignment, no post-processing. Just group actuators by what they *do*.

### 2.3 UniDex-VLA: 3D Vision-Language-Action Policy

Architecture follows π₀ with key modifications for 3D dexterous control:

- **3D pointcloud encoder**: Replace SigLIP (2D) with **Uni3D** — a vanilla ViT pretrained to align pointcloud features with image–text features
- **Backbone**: Gemma (from PaliGemma), fusing pointcloud features with text and proprioception
- **Action head**: Flow matching with forward-Euler integration at inference
- **Observation**: $o_t = [P_t, \ell_t, q_t]$ — colored pointcloud, language instruction, proprioceptive state (all in FAAS)
- **Action**: $H$-step action chunk $A_t = [a_t, \ldots, a_{t+H-1}]$ in FAAS

**Training**: Pretrain on UniDex-Dataset, then finetune with 50 task demonstrations per task.

### 2.4 UniDex-Cap: Human-Robot Data Co-training

A practical portable capture setup:
- Apple Vision Pro (hand/head pose estimation) + Intel RealSense L515 (RGB-D) + 3D-printed mount
- Time-synchronized, calibrated to shared coordinate frame
- Captured human data → transformation pipeline → robot trajectories for co-training

Key finding: **~2 human demos can substitute for 1 robot demo**, and human demos are ~5.2× faster to collect. This means significant cost reduction for scaling dexterous data.

## 3. Experiments and Main Results

### Hardware
- 7-DoF Franka Panda arm + three dexterous end-effectors: Inspire (6 active, 12 full DoFs), Wuji (20 active DoFs), Oymotion (6 active, 11 full DoFs)
- Intel RealSense L515 for egocentric RGB-D
- Only **50 demonstrations** per task for fine-tuning

### Five Real-World Tool-Use Tasks

1. **Make Coffee** (Inspire): Grasp kettle → lift to dripper → pour water
2. **Sweep Objects** (Inspire): Grasp sweeper → sweep objects into dustpan
3. **Water Flowers** (Wuji): Grasp spray bottle → press trigger with thumb
4. **Cut Bags** (Wuji): Insert fingers into scissors → cut bags
5. **Use Mouse** (Wuji): Place fingers on mouse → drag file → click

### Main Results (Average Task Progress, 20 trials/task)

| Model | Make Coffee | Sweep | Water Flowers | Cut Bags | Use Mouse | **Average** |
|---|---|---|---|---|---|---|
| DP | 32.5 | 37.5 | 50.0 | 27.5 | 20.0 | 29.0 ± 19.9% |
| DP3 | 35.0 | 50.0 | 40.0 | 12.5 | 20.0 | 35.0 ± 17.1% |
| π₀ | 60.0 | 55.0 | 85.0 | 15.0 | 60.0 | 38.0 ± 7.4% |
| UniDex-VLA (No Pretrain) | 60.0 | 82.5 | 50.0 | 32.5 | 30.0 | 32.5 ± 18.5% |
| **UniDex-VLA** | **87.5** | **82.5** | **85.0** | **90.0** | **60.0** | **81.0 ± 12.1%** |

UniDex-VLA achieves **81% average task progress** — more than doubling π₀ (38%) and all other baselines.

### Generalization Results

**Spatial generalization**: With DemoGen augmentation, UniDex-VLA approaches near-perfect success across out-of-distribution object placements.

**Object generalization**: Replacing the original black kettle with a smaller purple kettle of different shape → UniDex-VLA achieves 80% (vs. 15% for π₀), showing robust tool understanding.

**Cross-hand transfer (zero-shot)**:

| Hand | π₀ | UniDex-VLA (No Pretrain) | **UniDex-VLA** |
|---|---|---|---|
| Wuji | 0% | 0% | **40%** |
| Oymotion | 10% | 5% | **60%** |

A policy trained only on Inspire Hand transfers zero-shot to Wuji and Oymotion — this is enabled by FAAS. Baselines completely fail.

### Human-Robot Co-training

The co-training heatmap (Fig. 13) reveals:
- With 0 robot demos, adding human demos alone doesn't work (all zeros)
- With even 10 robot demos + human demos, performance scales steadily
- The **"high-performance" boundary** has slope ≈ 2, meaning ~2 human demos ≈ 1 robot demo
- Human demos are ~5.2× faster to collect → substantial cost savings

## 4. Strengths

- **Complete suite, not just a model**: Dataset + action space + policy + capture system — each component is independently useful
- **FAAS is a clean abstraction**: No learned alignment, no post-processing — just a principled functional mapping that enables cross-hand transfer out of the box
- **Human video as scalable data source**: The retargeting pipeline with human-in-the-loop quality control is practical and produces usable training data
- **Strong empirical results**: 81% on genuinely difficult tool-use tasks with only 50 demos, plus zero-shot hand transfer that baselines completely fail at
- **3D pointcloud input**: The right choice for dexterous manipulation — tool-use requires reasoning about 3D geometry and contact affordances that 2D images can't provide
- **Open-source**: Dataset, code, and models all publicly available

## 5. Limitations

- **No action-free pretraining**: The framework doesn't yet leverage the vast amounts of *unlabeled* egocentric video data (without action annotations) — incorporating these could further scale pretraining
- **Human-in-the-loop retargeting**: While practical, the interactive calibration step still requires human effort per dataset/hand combination — fully automatic retargeting would improve scalability
- **Limited to tool-use tasks**: All five real-world tasks involve tool use — in-hand manipulation (e.g., reorienting objects within the hand) is not evaluated
- **50 demos per task**: While much less than end-to-end approaches, this is still not zero-shot — true zero-shot dexterous manipulation from pretraining alone remains open
- **Single-arm setup**: All experiments use a single Franka arm — bimanual dexterous manipulation is not addressed
- **FAAS assumes functional similarity**: The mapping assumes all hands share the same functional primitives — highly exotic hand designs might not fit cleanly

## 6. Takeaways

- **Egocentric human videos are a viable foundation for dexterous manipulation** — the kinematic and visual gaps are real but bridgeable with careful retargeting and visual alignment
- **Function-centric action spaces** (FAAS) are a compelling alternative to learned latent spaces for cross-embodiment transfer — simpler, more interpretable, and immediately effective
- **The 2:1 human-to-robot exchange rate** is an actionable finding: labs can supplement expensive robot demos with cheaper human captures to reduce data costs
- **3D perception matters for dexterous manipulation** — replacing 2D encoders with 3D pointcloud encoders is not just a nice-to-have but essential for tasks requiring precise contact reasoning
- **Pretraining on diverse hands enables generalization** — the performance gap between UniDex-VLA and UniDex-VLA (No Pretrain) is large, especially on the hardest tasks (Cut Bags: 84.6% relative improvement)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，请使用顶部导航栏的语言切换按钮。

## 概要

UniDex 是一套面向**通用灵巧手控制**的完整机器人基础设施，其数据来自第一人称人类视频而非昂贵的机器人遥操作。它包含三个紧密耦合的组件：(1) **UniDex-Dataset** — 50K+ 条轨迹，覆盖 8 种不同机器人手（6–24 自由度），从人类视频数据重定向而来；(2) **FAAS**（功能-执行器对齐空间）— 一种统一的动作表征，将不同手的功能相似关节映射到共享坐标，实现跨手迁移；(3) **UniDex-VLA** — 在该数据集上预训练的 3D 视觉-语言-动作策略。在五个具有挑战性的真实世界工具使用任务上，UniDex-VLA 实现了 **81% 的平均任务进度**（π₀ 为 38%），展示了零样本跨手技能迁移，并证明人类视频数据可以约 2:1 的比率替代机器人示教数据。该工作被 **CVPR 2026** 接收。

## 论文信息

- **标题**：UniDex: A Robot Foundation Suite for Universal Dexterous Hand Control from Egocentric Human Videos
- **作者**：Gu Zhang†, Qicheng Xu*, Haozhe Zhang*, Jianhan Ma*, Long He*, Yiming Bao* 等
- **单位**：清华大学、上海期智研究院、中山大学、北卡罗来纳大学教堂山分校
- **会议**：CVPR 2026
- **arXiv**：[2603.22264](https://arxiv.org/abs/2603.22264)
- **项目主页**：[unidex-ai.github.io](https://unidex-ai.github.io)
- **代码**：[github.com/unidex-ai/UniDex](https://github.com/unidex-ai/UniDex)

## 1. 问题与动机

灵巧操作很难——为其构建基础模型比夹爪更难，原因有三：

1. **数据稀缺**：灵巧手遥操作昂贵且难以扩展。现有机器人基础数据集大多面向夹爪。
2. **形体异质性**：灵巧手在自由度（6–24）、形态、运动学和外观上差异巨大。在一种手上训练的策略无法迁移到另一种。
3. **高维度**：同时控制 20+ 个关节需要表达力强的动作空间和有效的学习算法。

核心洞察：**灵巧机器人手本就是为模仿人手而设计的**，而人类在日常生活中自然产生大量操作数据。第一人称人类视频比机器人遥操作更便宜、更多样、更容易扩展。挑战在于弥合人手和机器人手之间的*运动学*和*视觉*差距。

## 2. 方法

### 2.1 UniDex-Dataset：从人类视频到机器人轨迹

**数据来源**：四个第一人称人类操作数据集 — H2O、HOI4D、HOT3D 和 TACO — 提供多样的日常操作活动。

**人-机器人转换流程**：

1. **视觉对齐**：从 RGB-D 计算点云，遮挡人手（使用 WiLoR + SAM2），替换为重定向后的机器人手网格，重新投影为单视角点云
2. **运动学重定向**（人在环路中）：
   - 从人手姿态提取 $m$ 个指尖目标：$X^\star = [x_1^\star, \ldots, x_m^\star] \in \mathbb{R}^{3 \times m}$
   - 引入 **6自由度虚拟基座偏移** $T_{\text{offset}}$ 进行全局对齐
   - 求解指尖逆运动学：$x_i(q; T_{\text{offset}}) = \text{Trans}(T_{\text{world}}^{\text{dummy}} \cdot T_{\text{offset}} \cdot T_i(q)) \in \mathbb{R}^3$
   - **自动阶段**：IK 求解器在关节限制和阻尼约束下最小化指尖误差
   - **交互阶段**：人类通过 GUI 滑块调整 $T_{\text{offset}}$ 直到接触看起来合理

**成果**：900万对图像-点云-动作帧，50K+ 轨迹，8 种机器人手平台（Inspire、Leap、Shadow、Allegro、Ability、Oymotion、Xhand、Wuji），覆盖 6–24 个主动自由度。

| 数据集 | 轨迹数 | 手数 | 语言标注 | 多样场景 | 点云 |
|---|---|---|---|---|---|
| **UniDex-Dataset** | **52K** | **8** | ✓ | ✓ | ✓ |
| ActionNet | 30K | 2 | ✓ | ✗ | 低质量 |
| RoboMind | 19K | 1 | ✓ | ✗ | ✗ |
| RealDex | 2K | 2 | ✓ | ✗ | ✓ |

### 2.2 FAAS：功能-执行器对齐空间

核心思想：尽管自由度和运动学不同，所有灵巧手都实现相同的**功能原语**集合 — 拇指-食指捏取、手指环绕把手弯曲、侧向内收外展稳定化。

FAAS 根据**功能角色**（而非 URDF 位置）将每个执行器映射到共享索引，创建跨形体的功能中心控制接口：

- **82维向量**：18维用于腕部姿态，64维用于关节命令（每只手32个槽位）
- **21个基础执行器槽位**在所有手之间共享；剩余槽位用于手特定自由度
- 功能相似的关节（如 Allegro 和 Inspire 上的拇指屈曲）获得**相同的 FAAS 索引**

这很优雅，因为它纯粹是一种映射——无需学习对齐，无需后处理。只需按功能对执行器进行分组。

### 2.3 UniDex-VLA：3D 视觉-语言-动作策略

架构沿用 π₀，针对 3D 灵巧控制做了关键修改：

- **3D 点云编码器**：将 SigLIP（2D）替换为 **Uni3D** — 预训练对齐点云与图像-文本特征的 ViT
- **主干网络**：Gemma（来自 PaliGemma），融合点云特征、文本和本体感受
- **动作头**：流匹配，推理时使用前向欧拉积分
- **观测**：$o_t = [P_t, \ell_t, q_t]$ — 彩色点云、语言指令、本体感受状态（均在 FAAS 中）
- **动作**：FAAS 中的 $H$ 步动作块 $A_t = [a_t, \ldots, a_{t+H-1}]$

**训练**：在 UniDex-Dataset 上预训练，然后用每个任务 50 条示教进行微调。

### 2.4 UniDex-Cap：人-机器人数据联合训练

一个实用的便携式数据采集装置：
- Apple Vision Pro（手/头姿态估计）+ Intel RealSense L515（RGB-D）+ 3D打印支架
- 时间同步，标定到共享坐标系
- 采集的人类数据 → 转换流程 → 用于联合训练的机器人轨迹

关键发现：**约 2 条人类示教可替代 1 条机器人示教**，而人类示教的采集速度快约 5.2 倍。这意味着扩展灵巧数据的成本可大幅降低。

## 3. 实验与主要结果

### 硬件
- 7自由度 Franka Panda 机械臂 + 三种灵巧手末端执行器：Inspire（6主动，12全自由度）、Wuji（20主动自由度）、Oymotion（6主动，11全自由度）
- Intel RealSense L515 提供第一人称 RGB-D
- 每个任务仅 **50 条示教**用于微调

### 五个真实世界工具使用任务

1. **冲咖啡**（Inspire）：抓取水壶 → 举起到滴滤器 → 倒水
2. **扫物体**（Inspire）：抓取扫帚 → 将物体扫入簸箕
3. **浇花**（Wuji）：抓取喷壶 → 用拇指按压扳机
4. **剪袋子**（Wuji）：将手指伸入剪刀 → 剪切袋子
5. **使用鼠标**（Wuji）：将手指放在鼠标上 → 拖拽文件 → 点击

### 主要结果（平均任务进度，每任务20次试验）

| 模型 | 冲咖啡 | 扫物体 | 浇花 | 剪袋子 | 用鼠标 | **平均** |
|---|---|---|---|---|---|---|
| DP | 32.5 | 37.5 | 50.0 | 27.5 | 20.0 | 29.0 ± 19.9% |
| DP3 | 35.0 | 50.0 | 40.0 | 12.5 | 20.0 | 35.0 ± 17.1% |
| π₀ | 60.0 | 55.0 | 85.0 | 15.0 | 60.0 | 38.0 ± 7.4% |
| UniDex-VLA（无预训练） | 60.0 | 82.5 | 50.0 | 32.5 | 30.0 | 32.5 ± 18.5% |
| **UniDex-VLA** | **87.5** | **82.5** | **85.0** | **90.0** | **60.0** | **81.0 ± 12.1%** |

UniDex-VLA 实现了 **81% 的平均任务进度** — 是 π₀（38%）及所有其他基线的两倍以上。

### 泛化结果

**空间泛化**：使用 DemoGen 数据增强后，UniDex-VLA 在分布外物体放置位置上接近完美成功率。

**物体泛化**：将原始黑色水壶替换为颜色、大小和形状不同的紫色小水壶 → UniDex-VLA 达到 80%（π₀ 为 15%），展示了鲁棒的工具理解能力。

**跨手迁移（零样本）**：

| 手型 | π₀ | UniDex-VLA（无预训练） | **UniDex-VLA** |
|---|---|---|---|
| Wuji | 0% | 0% | **40%** |
| Oymotion | 10% | 5% | **60%** |

仅在 Inspire Hand 上训练的策略可零样本迁移到 Wuji 和 Oymotion — 这由 FAAS 实现。基线方法完全失败。

### 人-机器人联合训练

联合训练热力图（图13）揭示：
- 零机器人示教时，仅添加人类示教不起作用（全为零）
- 即使只有 10 条机器人示教 + 人类示教，性能也稳步提升
- **"高性能"边界**的斜率 ≈ 2，即约 2 条人类示教 ≈ 1 条机器人示教
- 人类示教的采集速度快约 5.2 倍 → 显著节省成本

## 4. 优势

- **完整套件，不仅仅是模型**：数据集 + 动作空间 + 策略 + 采集系统 — 每个组件都独立有用
- **FAAS 是简洁的抽象**：无需学习对齐，无需后处理 — 只是一种有原则的功能映射，开箱即用实现跨手迁移
- **人类视频作为可扩展数据源**：带有人在环路质量控制的重定向流程实用且能产生可用的训练数据
- **实验结果强劲**：在真正困难的工具使用任务上用仅 50 条示教达到 81%，加上基线完全失败的零样本手迁移
- **3D 点云输入**：对灵巧操作来说是正确的选择 — 工具使用需要 2D 图像无法提供的 3D 几何和接触可供性推理
- **开源**：数据集、代码和模型全部公开

## 5. 局限性

- **未利用无动作预训练**：框架尚未利用大量*无标注*的第一人称视频数据（无动作标注）— 引入这些数据可进一步扩展预训练规模
- **人在环路重定向**：虽然实用，但交互式标定步骤仍需要人力投入 — 全自动重定向将提高可扩展性
- **仅限工具使用任务**：五个真实世界任务都涉及工具使用 — 未评估手内操作（如在手中重新定向物体）
- **每个任务 50 条示教**：虽然远少于端到端方法，但仍非零样本 — 仅从预训练实现真正的零样本灵巧操作仍是开放问题
- **单臂设置**：所有实验使用单个 Franka 臂 — 未涉及双臂灵巧操作
- **FAAS 假设功能相似性**：映射假设所有手共享相同的功能原语 — 高度特殊的手部设计可能无法完美适配

## 6. 总结与启示

- **第一人称人类视频是灵巧操作的可行基础** — 运动学和视觉差距确实存在但可通过精心的重定向和视觉对齐来弥合
- **以功能为中心的动作空间**（FAAS）是跨形体迁移中学习潜空间的有力替代方案 — 更简单、更可解释、立即有效
- **2:1 的人-机器人交换率**是一个可操作的发现：实验室可以用更便宜的人类采集补充昂贵的机器人示教来降低数据成本
- **3D 感知对灵巧操作至关重要** — 将 2D 编码器替换为 3D 点云编码器不仅是锦上添花，而是需要精确接触推理的任务的必需品
- **在多样化手上预训练实现泛化** — UniDex-VLA 与 UniDex-VLA（无预训练）之间的性能差距很大，尤其在最难的任务上（剪袋子：84.6% 的相对提升）

</div>
