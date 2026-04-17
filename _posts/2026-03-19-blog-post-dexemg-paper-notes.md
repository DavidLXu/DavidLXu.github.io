---
title: "[Paper Notes] DexEMG: Towards Dexterous Teleoperation System via EMG2Pose Generalization"
date: 2026-03-19
permalink: /posts/2026/03/dexemg-paper-notes/
tags:
  - Robotics
  - Dexterous Manipulation
  - Teleoperation
  - EMG
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

DexEMG is a lightweight teleoperation system that uses a commodity **sEMG wristband** to control a 22-DOF dexterous robotic hand. Instead of bulky exoskeletons or line-of-sight-constrained cameras, the operator wears a simple armband that captures forearm muscle signals. A neural network (EMG2Pose) maps those signals to continuous hand joint angles in real time. The system generalizes to unseen objects and cluttered environments, and can handle multi-stage tasks like desktop packaging and table wiping.

## Paper Info

- **Title**: DexEMG: Towards Dexterous Teleoperation System via EMG2Pose Generalization
- **Authors**: Qianyou Zhao, Wenqiao Li, Chiyu Wang, Kaifeng Zhang
- **Affiliations**: Sharpa, Shanghai Jiao Tong University
- **arXiv**: [2603.05861](https://arxiv.org/abs/2603.05861)
- **Paper type**: teleoperation / dexterous manipulation / sEMG-based control

## 1. Problem and Motivation

High-fidelity teleoperation of dexterous hands is a prerequisite for deploying robots in unstructured domestic environments. The two dominant paradigms each have clear drawbacks:

- **Exoskeletons** (e.g., CyberGrasp, Dexmo): precise but bulky, expensive, and cause operator fatigue.
- **Vision-based capture** (e.g., Vicon, Leap Motion): either extremely expensive with strict environment requirements, or susceptible to self-occlusion when fingers are hidden by the palm or grasped objects.

sEMG is attractive because it reads neuromuscular signals directly from the forearm, is wearable and cheap, and is immune to visual occlusion. The key challenge is going from discrete gesture classification to **continuous, high-dimensional pose estimation** accurate enough for dexterous control.

## 2. Method

### 2.1 Data Collection via Kinematic Retargeting

The operator wears two devices simultaneously during data collection:

1. An 8-channel **gForce sEMG armband** on the forearm.
2. A **Manus MoCap glove** providing 35 skeletal keypoints as ground truth.

The captured human hand poses are retargeted to the 22-DOF Sharpa Wave hand via keypoint-based optimization:

\\(q^* = \arg\min_q \sum_i \| p_i^h - p_i^r(q) \|_2^2\\)

A collision classifier checks the optimized joint angles and clamps to a safe manifold if self-collision is detected. The result is a paired dataset of sEMG streams and collision-free robotic joint angles.

### 2.2 EMG2Pose Architecture

The model follows an encoder-decoder design:

- **Encoder**: raw sEMG input of shape \\((B, 8, T)\\) goes through two Conv1d blocks and two Time-Depth Separable (TDS) stages (2D conv + layer norm + feedforward + layer norm).
- **Decoder**: an LSTM + MLP that predicts **joint velocities** \\(\dot{\theta}\\) rather than absolute angles. Poses are reconstructed iteratively: \\(\theta_t = \theta\_{t-1} + \dot{\theta}\_t\\), starting from a rest pose \\(\theta_0\\).

The velocity-based approach decouples muscle activation intensity from static postures, reducing sensitivity to sensor displacement and signal drift during sustained grasping.

### 2.3 Deployment Pipeline

At deployment time the MoCap glove is removed. The operator wears only the sEMG armband and an HTC Vive Tracker for wrist tracking. The system runs inference on a sliding window of sEMG inputs, outputs action chunks of predicted joint angles, and executes the initial frames of each chunk for smooth, continuous control.

## 3. Experiments and Results

### Pose Estimation Accuracy

- **Grasp tasks**: MAE of **0.09 rad**.
- **In-hand rotation tasks**: MAE of **0.15 rad** (more complex joint coupling and rapid transitions).

### Generalization (Grasping)

Tested across 5 object categories (tiny, cylinder, sphere, irregular, deformable) with 20 trials each:

| Scenario | Overall SR | Overall DR |
|---|---|---|
| Trained Objects | 76.0% | 14.5% |
| Unseen Objects | 66.0% | 18.2% |
| Novel Scenarios (cluttered) | 56.0% | 28.6% |

The performance drop on unseen objects is moderate, suggesting the model learns generalizable motor patterns rather than overfitting to specific geometries. In novel (cluttered) scenarios the degradation is attributed mainly to arm-level planning difficulty rather than EMG model failure.

### Long-Horizon Tasks

| Task | One-shot SR | With-retry SR |
|---|---|---|
| Desktop Packaging | 60% | 80% |
| Table Wiping | 40% | 70% |

Wiping is harder because it requires sustained contact force; minor EMG drift causes the cloth to slip. With retry the system recovers well, indicating no irrecoverable failure states.

## 4. Strengths

- **Lightweight and cheap**: a commodity sEMG armband replaces expensive exoskeletons or multi-camera setups.
- **Occlusion-immune**: unlike vision-based systems, sEMG works even when fingers are hidden.
- **Velocity-based decoding**: mitigates signal drift during sustained grasping.
- **Generalization**: reasonable performance on unseen objects and cluttered environments without per-object recalibration.
- **Practical retry behavior**: the system does not enter irrecoverable states after a failure, making it suitable for scalable data collection.

## 5. Limitations

- **Irregular and deformable objects** remain challenging (25-50% SR in novel scenarios).
- sEMG currently lacks the signal-to-noise ratio for **extreme tactile precision** tasks.
- The system only controls the hand; arm-level motion still relies on separate wrist tracking (HTC Vive Tracker).
- A **latency-stability trade-off** exists: longer input windows smooth noise but reduce responsiveness.
- Still requires an initial calibration session (data collection with MoCap glove) though not per-object recalibration.

## 6. Takeaways

1. sEMG is a viable and underexplored modality for dexterous teleoperation. The key insight is predicting joint velocities rather than absolute angles, which makes the system more robust to sensor drift.
2. The approach offers a compelling cost-portability-performance balance for **scalable data collection** in unstructured environments. If you need to teleoperate dexterous hands for hours to collect demonstration data, wearing only a wristband is much more practical than an exoskeleton or being tethered to cameras.
3. The main bottleneck is not the EMG decoding itself but the **precision ceiling** of sEMG signals for fine manipulation. Combining sEMG with complementary sensing (e.g., tactile feedback or sparse vision) could push performance further.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 一句话总结

DexEMG 是一个轻量级遥操作系统，使用廉价的 **sEMG（表面肌电）臂带** 控制 22 自由度灵巧机器人手。操作者无需佩戴笨重的外骨骼或依赖受视线限制的摄像头，只需一个前臂臂带即可捕获肌肉信号。神经网络（EMG2Pose）将这些信号实时映射为连续的手部关节角度。该系统能泛化到未见过的物体和杂乱环境，并可完成桌面打包和擦桌子等多阶段任务。

## 论文信息

- **标题**：DexEMG: Towards Dexterous Teleoperation System via EMG2Pose Generalization
- **作者**：Qianyou Zhao, Wenqiao Li, Chiyu Wang, Kaifeng Zhang
- **机构**：Sharpa、上海交通大学
- **arXiv**：[2603.05861](https://arxiv.org/abs/2603.05861)
- **类型**：遥操作 / 灵巧操作 / 基于 sEMG 的控制

## 1. 问题与动机

灵巧手的高保真遥操作是将机器人部署到非结构化家庭环境中的前提。现有两种主流方案各有明显缺陷：

- **外骨骼**（如 CyberGrasp、Dexmo）：精度高但笨重、昂贵，容易使操作者疲劳。
- **视觉捕捉**（如 Vicon、Leap Motion）：高端系统昂贵且环境要求苛刻；低成本方案在手指被手掌或被抓物体遮挡时容易失败。

sEMG 直接从前臂读取神经肌肉信号，可穿戴、成本低，且不受视觉遮挡影响。核心挑战在于从离散手势分类迈向足够精确的**连续、高维姿态估计**。

## 2. 方法

### 2.1 通过运动学重定向采集数据

数据采集时操作者同时佩戴两个设备：

1. 前臂上的 8 通道 **gForce sEMG 臂带**。
2. 提供 35 个骨骼关键点作为真值的 **Manus 动捕手套**。

采集到的人手姿态通过基于关键点的优化重定向到 22-DOF 的 Sharpa Wave 机器人手：

\\(q^* = \arg\min_q \sum_i \| p_i^h - p_i^r(q) \|_2^2\\)

碰撞分类器检查优化后的关节角，如检测到自碰撞则钳制到安全流形。最终得到 sEMG 数据流与无碰撞机器人关节角的配对数据集。

### 2.2 EMG2Pose 网络架构

模型采用编码器-解码器设计：

- **编码器**：原始 sEMG 输入形状为 \\((B, 8, T)\\)，经过两个 Conv1d 模块和两个时间深度可分离（TDS）阶段。
- **解码器**：LSTM + MLP 预测**关节速度** \\(\dot{\theta}\\) 而非绝对角度。姿态通过迭代重建：\\(\theta_t = \theta\_{t-1} + \dot{\theta}\_t\\)，初始值为静止姿态 \\(\theta_0\\)。

基于速度的方法将肌肉激活强度与静态姿势解耦，降低了传感器偏移和持续抓取过程中信号漂移的敏感性。

### 2.3 部署流程

部署时移除动捕手套。操作者仅佩戴 sEMG 臂带和用于手腕追踪的 HTC Vive Tracker。系统对 sEMG 输入的滑动窗口进行推理，输出预测关节角的动作块（action chunk），执行每个块的起始帧以实现平滑连续控制。

## 3. 实验与结果

### 姿态估计精度

- **抓取任务**：平均绝对误差 **0.09 rad**。
- **手内旋转任务**：平均绝对误差 **0.15 rad**（涉及更复杂的关节耦合和快速转换）。

### 泛化能力（抓取）

在 5 类物体（微小、圆柱、球体、不规则、可变形）上各测试 20 次：

| 场景 | 总体成功率 | 总体掉落率 |
|---|---|---|
| 训练物体 | 76.0% | 14.5% |
| 未见物体 | 66.0% | 18.2% |
| 新场景（杂乱） | 56.0% | 28.6% |

在未见物体上性能下降适中，说明模型学到了可泛化的运动模式而非过拟合到特定几何形状。新场景中的性能下降主要归因于臂级规划难度增加，而非 EMG 模型本身的失败。

### 长时序任务

| 任务 | 一次成功率 | 允许重试成功率 |
|---|---|---|
| 桌面打包 | 60% | 80% |
| 擦桌子 | 40% | 70% |

擦桌子更难，因为需要持续接触力；EMG 轻微漂移会导致布料滑落。允许重试后系统恢复良好，说明不存在不可恢复的失败状态。

## 4. 优点

- **轻量且廉价**：一个普通 sEMG 臂带取代了昂贵的外骨骼或多相机系统。
- **不受遮挡影响**：与视觉系统不同，sEMG 在手指被遮挡时仍然有效。
- **基于速度的解码**：缓解了持续抓取过程中的信号漂移问题。
- **泛化能力**：在未见物体和杂乱环境中表现合理，无需逐物体重新标定。
- **良好的重试特性**：失败后系统不会进入不可恢复状态，适合规模化数据采集。

## 5. 局限性

- **不规则和可变形物体** 仍具挑战性（新场景中成功率 25-50%）。
- sEMG 目前的信噪比不足以支撑**极端触觉精度**任务。
- 系统仅控制手部；臂级运动仍依赖独立的手腕追踪（HTC Vive Tracker）。
- 存在**延迟-稳定性权衡**：更长的输入窗口平滑噪声但降低响应速度。
- 仍需初始标定环节（使用动捕手套采集数据），虽然不需要逐物体重新标定。

## 6. 启示

1. sEMG 是灵巧遥操作中一种可行且尚未被充分探索的模态。核心洞察在于预测关节速度而非绝对角度，使系统对传感器漂移更鲁棒。
2. 该方法在**规模化数据采集**方面提供了极具吸引力的成本-便携性-性能平衡。如果需要长时间遥操作灵巧手以收集示教数据，仅佩戴一个臂带比外骨骼或依赖固定相机实用得多。
3. 主要瓶颈不在 EMG 解码本身，而在于 sEMG 信号对精细操作的**精度上限**。将 sEMG 与互补感知（如触觉反馈或稀疏视觉）结合可能进一步提升性能。

</div>
