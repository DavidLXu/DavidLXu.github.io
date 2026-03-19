---
title: "[Paper Notes] SaTA: Spatially-anchored Tactile Awareness for Robust Dexterous Manipulation"
date: 2026-03-19
permalink: /posts/2026/03/sata-paper-notes/
tags:
  - Robotics
  - Dexterous Manipulation
  - Tactile Sensing
  - Imitation Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Existing visuo-tactile learning methods can tell *that* contact happened, but struggle to reason about *where* and *how* contact relates to the hand's geometry. SaTA fixes this by **anchoring tactile features to the hand's kinematic frame** via forward kinematics + Fourier encoding + FiLM conditioning. The result: an end-to-end imitation learning policy that achieves sub-millimeter precision on tasks like bimanual USB-C mating in free space, light bulb installation, and card sliding -- improving success rates by up to 30% and reducing completion times by ~27% over strong baselines.

## Paper Info

- **Title**: Spatially-anchored Tactile Awareness for Robust Dexterous Manipulation
- **Authors**: Jialei Huang, Yang Ye, Yuanqing Gong, Xuezhou Zhu, Yang Gao, Kaifeng Zhang
- **Affiliations**: Sharpa, Tsinghua University, Wuhan University, Shanghai Qi Zhi Institute
- **arXiv**: [2510.14647](https://arxiv.org/abs/2510.14647)
- **Paper type**: tactile perception / dexterous manipulation / imitation learning

## 1. Problem and Motivation

Dexterous manipulation tasks like USB insertion or bulb threading demand **sub-millimeter precision**. At the critical moment of contact, fingers occlude the object from cameras, specular reflections degrade visual localization, and small perceptual errors accumulate into task failure. Vision-based tactile sensors (e.g., GelSight, DIGIT) provide rich contact information, but current learning frameworks fail to exploit it fully.

The paper identifies a core limitation: existing methods either:

- Preserve raw tactile image richness but **lack spatial localization** (the policy knows contact happened but not where in hand-space).
- Convert tactile data into geometric forms (e.g., point clouds) but **lose fine details** like contact texture and pressure distribution.

The key question: how to get both **perceptual richness** and **spatial grounding** in a single representation?

## 2. Method

### 2.1 Core Idea: Spatial Anchoring

SaTA anchors every tactile measurement to the hand's **URDF coordinate system** (wrist frame) rather than the world or camera frame. The rationale: manipulation success depends on *relative geometric relationships within the hand*, not global positions. A USB insertion learned in one arm configuration should transfer to another.

### 2.2 Spatially-Anchored Tactile Encoder

For each tactile sensor (one per fingertip, 10 total on a dual-hand setup):

1. **Forward kinematics**: compute the sensor's 6D pose (position + orientation) from current joint angles.
2. **Fourier positional encoding**: encode the 6D pose into multi-scale frequency features. Low frequencies capture coarse alignment; high frequencies capture fine adjustments ("rotate 2 degrees", "translate 1mm").
3. **FiLM conditioning**: use Feature-wise Linear Modulation to let spatial information *modulate* the tactile features from a ResNet encoder, rather than naive concatenation.

The result is a set of **spatially-anchored tactile tokens** -- each preserving full tactile image features while carrying precise spatial context. The same edge pattern detected at the thumb vs. the index finger triggers different policy actions because FiLM enables context-dependent interpretation.

### 2.3 Policy Architecture

Built on **ACT** (Action Chunking with Transformers):

- **Inputs**: robot joint states, RGB-D images (head + wrist cameras), and 10 spatially-anchored tactile tokens.
- **State encoder**: cVAE to handle multi-modality and capture demonstration distribution.
- **Output**: action chunk of 100 timesteps for smooth, anticipatory control.
- **Training**: standard imitation learning from 200 expert teleoperation demonstrations per task.

The spatial anchoring idea is architecture-agnostic and could be plugged into Diffusion Policy or other frameworks.

## 3. Experiments and Results

### Hardware

- Dual-arm: two RealMan 7-DoF manipulators + Sharpa Wave 22-DOF dexterous hands.
- Tactile: vision-based fingertip sensors (320x240 @ 30Hz) on each finger.
- Visual: head-mounted stereo camera + two wrist fisheye cameras.

### Tasks

Three tasks chosen specifically because visual information is severely degraded at the critical contact moment:

1. **USB-C Mating** (bimanual, free space): sub-mm positional tolerance, plug fully occludes port during approach.
2. **Card Sliding**: fan out cards at specific angles; requires force along card surface, not perpendicular.
3. **Bulb Installation**: thread engagement requires perpendicular alignment; small angular errors cause jamming.

### Main Results

| Method | Card Sliding SR | USB-C Mating SR | Bulb Install SR | Avg SR |
|---|---|---|---|---|
| Vision-Only | 50% | 0% | 45% | 31.7% |
| Tactile-Flat (no anchoring) | 60% | 0% | 70% | 43.3% |
| Tactile-Global (pose in proprioception) | 65% | 10% | 65% | 46.7% |
| **SaTA** | **95%** | **35%** | **100%** | **76.7%** |

Key observations:
- On USB-C mating, **all baselines essentially fail** (0-10% SR). SaTA reaches 35% -- still hard, but a qualitative leap.
- First-contact success rate (correct alignment on first try) is 48.3% for SaTA vs. 25.0% for the best baseline, directly measuring geometric reasoning quality.
- SaTA reduces average completion time by ~28% due to fewer trial-and-error attempts.

### Ablation Study (Card Sliding)

| Configuration | SR |
|---|---|
| SaTA (Full) | 95% |
| w/o FiLM (concat instead) | 70% |
| w/o Fourier encoding | 70% |
| World frame (instead of hand frame) | 60% |

Every component matters. The hand-frame anchoring is the most impactful single choice.

### Failure Mode Analysis

Without spatial anchoring, baselines consistently fail in specific geometric ways:
- **Bulb**: tilted insertion angle; cannot correct angular error from tactile feedback.
- **Card**: applies force perpendicular to card surface (bending) instead of along it (sliding).
- **USB-C**: cannot learn the thumb-index coordinated rubbing motion to adjust plug orientation.

These failures share a pattern: the policy detects contact but cannot map tactile patterns to correct spatial adjustments.

## 4. Three Levels of Tactile Sensing (from the paper's discussion)

The authors propose a useful taxonomy:

1. **Gating signals**: binary contact detection to trigger phase transitions (~3 bits of information). Simple but crucial.
2. **Geometric reasoning** (this paper's focus): high-precision local geometry to complement occluded vision. Requires spatial anchoring.
3. **Force-dominant control**: policies driven entirely by force/tactile feedback (e.g., pen spinning). Current teleoperation data collection limits this level because operators feel vibration, not actual force distributions.

## 5. Strengths

- **Clean, well-motivated design**: the spatial anchoring idea is simple, principled, and architecture-agnostic.
- **Impressive task selection**: USB-C mating in free space is genuinely hard and the kind of task that matters for real deployment.
- **Strong ablations**: each component (FiLM, Fourier, hand frame) is justified with clear ablation results.
- **Failure mode analysis** is thorough and provides insight into *why* spatial anchoring helps, not just *that* it helps.

## 6. Limitations

- **USB-C mating is still only 35% SR**. The paper is honest about this -- the task remains extremely challenging even with SaTA.
- **Teleoperation bottleneck**: operators cannot feel actual force distributions during demonstration collection, so demonstrations are inherently vision-dominant. This limits progress toward force-dominant policies.
- **200 demonstrations per task** is a moderate data requirement. The paper does not explore data efficiency or few-shot settings.
- **Single hardware platform**: all experiments use the same Sharpa Wave hand. Generalization across hand morphologies is not tested.

## 7. Takeaways

1. **Spatial grounding is the missing piece** in current visuo-tactile learning. Simply feeding tactile images into a policy network wastes most of their geometric potential. Anchoring to the kinematic frame is a low-cost, high-impact change.
2. **FiLM > concatenation** for fusing spatial and tactile information. The same tactile pattern means different things at different fingers -- modulation captures this; concatenation does not.
3. The **three-level taxonomy** (gating / geometric reasoning / force-dominant) is a useful mental model. Most current work barely reaches level 2. Level 3 requires better data collection (haptic feedback or RL), which is an open problem.
4. Interesting that the approach is from Sharpa (same group as DexEMG). They are building a full teleoperation + perception stack for dexterous manipulation.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 一句话总结

现有的视触觉学习方法能检测到接触发生，但难以推理接触在手部几何空间中的位置和含义。SaTA 通过**前向运动学 + 傅里叶编码 + FiLM 条件调制**将触觉特征锚定到手部运动学坐标系，实现了端到端的模仿学习策略，在双手 USB-C 对接、灯泡安装和卡牌滑动等任务上达到亚毫米级精度，成功率提升最高达 30%，完成时间减少约 27%。

## 论文信息

- **标题**: Spatially-anchored Tactile Awareness for Robust Dexterous Manipulation
- **作者**: Jialei Huang, Yang Ye, Yuanqing Gong, Xuezhou Zhu, Yang Gao, Kaifeng Zhang
- **机构**: Sharpa、清华大学、武汉大学、上海期智研究院
- **arXiv**: [2510.14647](https://arxiv.org/abs/2510.14647)
- **类型**: 触觉感知 / 灵巧操作 / 模仿学习

## 1. 问题与动机

USB 插入、灯泡拧入等灵巧操作任务需要**亚毫米级精度**。在关键接触时刻，手指遮挡物体使相机失效，镜面反射进一步降低视觉定位精度，微小感知误差不断累积导致任务失败。视觉触觉传感器（如 GelSight、DIGIT）提供丰富的接触信息，但现有学习框架未能充分利用。

论文指出核心局限：现有方法要么保留原始触觉图像的丰富性但**缺乏空间定位**（策略知道发生了接触但不知道在手部空间的何处），要么将触觉数据转换为几何形式（如点云）但**丢失细节**（接触纹理、压力分布等）。

核心问题：如何在单一表征中同时获得**感知丰富性**和**空间锚定**？

## 2. 方法

### 2.1 核心思想：空间锚定

SaTA 将每个触觉测量锚定到手部的 **URDF 坐标系**（腕部参考系），而非世界坐标系或相机坐标系。理由：操作成功取决于*手内部的相对几何关系*，而非全局位置。在某个臂位姿下学到的 USB 插入技能应能迁移到其他位姿。

### 2.2 空间锚定触觉编码器

对每个触觉传感器（每个指尖一个，双手共 10 个）：

1. **前向运动学**：根据当前关节角度计算传感器的 6D 位姿（位置 + 朝向）。
2. **傅里叶位置编码**：将 6D 位姿编码为多尺度频率特征。低频分量捕获粗略对齐，高频分量捕获精细调整（"旋转 2 度"、"平移 1mm"）。
3. **FiLM 条件调制**：使用 Feature-wise Linear Modulation 让空间信息*调制* ResNet 编码的触觉特征，而非简单拼接。

结果是一组**空间锚定的触觉 token** -- 每个保留完整的触觉图像特征，同时携带精确的空间上下文。同一个边缘模式在拇指和食指上检测到时会触发不同的策略动作，因为 FiLM 实现了上下文相关的解释。

### 2.3 策略架构

基于 **ACT**（Action Chunking with Transformers）：

- **输入**：机器人关节状态、RGB-D 图像（头部 + 腕部相机）、10 个空间锚定触觉 token。
- **状态编码器**：cVAE 处理多模态并捕获示教数据分布。
- **输出**：100 步的动作块（action chunk），实现平滑预测控制。
- **训练**：每个任务 200 条专家遥操作示教的标准模仿学习。

空间锚定的思想与架构无关，可迁移到 Diffusion Policy 等其他框架。

## 3. 实验与结果

### 硬件平台

- 双臂：两个 RealMan 7-DoF 机械臂 + Sharpa Wave 22-DOF 灵巧手。
- 触觉：每个指尖的视觉触觉传感器（320x240 @ 30Hz）。
- 视觉：头部立体相机 + 两个腕部鱼眼相机。

### 任务

三个任务的共同特点是在关键接触时刻视觉信息严重退化：

1. **USB-C 对接**（双手，自由空间）：亚毫米位置公差，插头在接近时完全遮挡端口。
2. **卡牌滑动**：以特定角度展开扑克牌；需要沿卡面施力而非垂直施力。
3. **灯泡安装**：螺纹啮合需要垂直对齐；微小角度偏差导致卡死。

### 主要结果

| 方法 | 卡牌滑动 SR | USB-C 对接 SR | 灯泡安装 SR | 平均 SR |
|---|---|---|---|---|
| 纯视觉 | 50% | 0% | 45% | 31.7% |
| Tactile-Flat（无锚定） | 60% | 0% | 70% | 43.3% |
| Tactile-Global（位姿放入本体感知） | 65% | 10% | 65% | 46.7% |
| **SaTA** | **95%** | **35%** | **100%** | **76.7%** |

关键发现：
- USB-C 对接任务中，**所有基线基本失败**（0-10% SR）。SaTA 达到 35% -- 仍然很难，但是质的飞跃。
- 首次接触成功率（首次尝试即正确对齐）：SaTA 48.3% vs 最强基线 25.0%，直接衡量几何推理能力。
- SaTA 将平均完成时间减少约 28%，因为减少了试错次数。

### 消融实验（卡牌滑动）

| 配置 | SR |
|---|---|
| SaTA（完整） | 95% |
| 去掉 FiLM（改为拼接） | 70% |
| 去掉傅里叶编码 | 70% |
| 使用世界坐标系（而非手部坐标系） | 60% |

每个组件都重要。手部坐标系锚定是影响最大的单一设计选择。

### 失败模式分析

缺少空间锚定时，基线在几何推理上表现出一致的失败模式：
- **灯泡**：倾斜插入角度，无法根据触觉反馈纠正角度误差。
- **卡牌**：垂直于卡面施力（导致弯曲）而非沿卡面施力（实现滑动）。
- **USB-C**：无法学会调整插头朝向所需的拇指-食指协调摩擦动作。

## 4. 触觉感知的三个层次（论文讨论部分）

作者提出了一个有用的分类：

1. **门控信号**：二值接触检测触发阶段转换（约 3 比特信息）。简单但关键。
2. **几何推理**（本文重点）：高精度局部几何补充被遮挡的视觉信息。需要空间锚定。
3. **力主导控制**：完全由力/触觉反馈驱动的策略（如转笔）。当前遥操作数据采集限制了这一层次，因为操作者感受到的是振动而非真实的力分布。

## 5. 优点

- **设计简洁、动机清晰**：空间锚定的思想简单、有原则性，且与架构无关。
- **任务选择出色**：自由空间中的 USB-C 对接确实很难，也是真实部署需要的能力。
- **消融实验充分**：每个组件（FiLM、傅里叶、手部坐标系）都有清晰的消融验证。
- **失败模式分析**深入，揭示了空间锚定为何有帮助，而非仅展示它有帮助。

## 6. 局限性

- **USB-C 对接仍然只有 35% SR**。论文对此很坦诚 -- 即使使用 SaTA，该任务仍极具挑战性。
- **遥操作瓶颈**：操作者在采集示教时无法感受真实的力分布，因此示教本质上以视觉为主导。这限制了力主导策略的进展。
- 每个任务需要 **200 条示教**，数据需求适中。论文未探索数据效率或少样本设置。
- **单一硬件平台**：所有实验使用同一款 Sharpa Wave 手。未测试跨手部形态的泛化能力。

## 7. 启示

1. **空间锚定是当前视触觉学习的缺失环节**。将触觉图像直接输入策略网络浪费了大部分几何潜力。锚定到运动学坐标系是低成本、高收益的改进。
2. **FiLM 优于拼接**来融合空间和触觉信息。同一触觉模式在不同手指上含义不同 -- 调制能捕获这一点，拼接不行。
3. **三层次分类**（门控 / 几何推理 / 力主导）是有用的思维模型。大多数当前工作刚达到第二层。第三层需要更好的数据采集方式（触觉反馈或强化学习），这是一个开放问题。
4. 值得注意的是该工作来自 Sharpa（与 DexEMG 同一团队），他们正在为灵巧操作构建完整的遥操作 + 感知技术栈。

</div>
