---
title: "[Paper Notes] Tacmap: Bridging the Tactile Sim-to-Real Gap via Geometry-Consistent Penetration Depth Map"
date: 2026-03-19
permalink: /posts/2026/03/tacmap-paper-notes/
tags:
  - Robotics
  - Tactile Sensing
  - Sim-to-Real
  - Reinforcement Learning
  - Dexterous Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Tactile sim-to-real is hard because raw tactile images are full of sensor-specific optical artifacts (reflections, lighting, camera noise). Tacmap sidesteps this by defining a **shared geometric representation** -- the penetration depth map (deform map) -- that can be computed analytically in simulation and learned from real tactile images via a translation network. Both domains meet in this "common geometric space," enabling **zero-shot sim-to-real transfer** of RL policies for contact-rich tasks like in-hand rotation. The approach is fast enough for massive parallel training in Isaac Lab.

## Paper Info

- **Title**: Tacmap: Bridging the Tactile Sim-to-Real Gap via Geometry-Consistent Penetration Depth Map
- **Authors**: Lei Su, Zhijie Peng, Renyuan Ren, Shengping Mao, Juan Du, Kaifeng Zhang, Xuezhou Zhu
- **Affiliations**: Sharpa, HKUST, NVIDIA
- **arXiv**: [2602.21625](https://arxiv.org/abs/2602.21625)
- **Paper type**: tactile simulation / sim-to-real transfer / dexterous manipulation

## 1. Problem and Motivation

Vision-based tactile sensors (VBTS) like GelSight and DIGIT capture rich contact information via a camera observing elastomer deformation. Training policies that use these sensors requires millions of interactions, making simulation essential. But current tactile simulation faces a dilemma:

- **Analytical methods** (e.g., TACTO): fast depth-buffer rendering, but oversimplifies elastomer physics -- large sim-to-real gap.
- **Empirical methods** (e.g., Taxim): supervised by real data, but poor generalization to novel geometries.
- **Physics-based methods** (e.g., FEM): high fidelity, but computationally prohibitive for large-scale RL.

An additional blind spot: most simulators assume **flat sensor surfaces**. Curved fingertips (common in anthropomorphic hands) cause projection distortions that existing tools handle poorly.

## 2. Method

### 2.1 Core Insight: Deform Map as Common Geometric Space

Raw tactile images differ wildly between sim and real due to optics. But the **underlying deformation geometry** is the same physical quantity in both domains. Tacmap defines a unified representation: the **penetration depth map (deform map)** -- a pixel-wise map of how deeply an object penetrates the sensor elastomer.

- In **simulation**: compute the deform map analytically via ray-casting.
- In the **real world**: train a neural network to translate raw tactile images into deform maps.

Both domains produce the same type of output, eliminating the need to simulate complex optical effects.

### 2.2 Simulation: Geometric Rendering Pipeline

The sensor geometry is defined by two surfaces:

1. **Undeformed sensor surface** $S_u$: the physical resting shape of the elastomer.
2. **Virtual sensing surface** $S_s$: positioned at a fixed offset exterior to the sensor, defining the interaction zone.

For each pixel $(u,v)$ on an $H \times W$ grid over $S_s$, a ray is cast along the surface normal toward the sensor interior. The deformation value is:

$$d(u,v) = \max(0, z_s - \max(z_u, z_o))$$

where $z_s$ is the ray origin on $S_s$, $z_u$ is the undeformed surface coordinate, and $z_o$ is the first intersection with the object mesh. This naturally handles **curved fingertips** by computing in local normal-projection space rather than assuming a flat plane.

### 2.3 Real World: Automated Data Collection + Translation

An automated 3-axis motion stage presses geometric indenters into the real sensor under controlled conditions. The indenter's precise 3D pose is recorded, and ground-truth deform maps are computed using the **same geometric projection logic** as simulation. This yields a paired dataset $\mathcal{D} = \{(I_{\text{raw}}^{(i)}, M_{\text{gt}}^{(i)})\}$.

A ResNet-based encoder-decoder is trained to map raw tactile images to deform maps: $\hat{M} = \Phi(I_{\text{raw}})$, minimizing pixel-wise MSE against the kinematically-derived ground truth.

### 2.4 Three Tactile Information Streams

Tacmap provides three synchronized signals:

1. **Net Force** $F$: from physics engine in sim; from a trained regression network in real.
2. **Contact Position** $P$: from contact sensor in sim; from centroid of deform map in real.
3. **Deform Map** $M$ (the main contribution): dense, pixel-wise penetration depth.

## 3. Implementation

Integrated into both **Isaac Lab** and **MuJoCo**:

- A Multi-Mesh Ray Caster pre-defines tactile sensing points and directions on the sensor surface.
- GPU-accelerated ray-casting computes penetration depth in parallel across thousands of environments.
- In Isaac Lab: uses the Raycaster API for massive parallelism. In MuJoCo: uses `mj_ray` function.

The tactile sensing resolution is decoupled from physics collision mesh resolution, so high-fidelity tactile feedback doesn't compromise physics solver stability.

## 4. Experiments and Results

### Sim-to-Real Fidelity

Tested with cylindrical and square indenters on the SharpaWave hand's tactile fingertips:

| Object | Contact Position Error | Deform Depth Error | Net Force $L_2$ Error | Deform IoU |
|---|---|---|---|---|
| Square | 0.66 mm | 18.53% | 0.28 N | 88.21% |
| Cylinder | 0.96 mm | 14.71% | 0.61 N | 85.67% |

The simulated and real deform maps show "remarkable structural similarity" across compression sequences. Force alignment between sim and real is highly correlated.

### Computational Efficiency

- **GPU memory**: near-linear growth from 16 to 8192 parallel environments (ray-casting is much lighter than FEM).
- **Rendering throughput**: negligible degradation of overall simulation speed even with thousands of concurrent environments.
- Trainable on a **single consumer-grade GPU**.

### Zero-Shot Sim-to-Real Transfer: In-Hand Rotation

- Policy trained with **PPO** exclusively in simulation, using the Tacmap stream as observation.
- Deployed directly on the physical SharpaWave hand **without any real-world fine-tuning**.
- Successfully achieves smooth, continuous in-hand rotation of a spherical object.
- The policy interprets real-world tactile images (translated to deform maps) and performs proactive finger coordination to prevent slips.

## 5. Strengths

- **Elegant core idea**: abstract away sensor-specific optics, align sim and real in a shared geometric space. Simple and effective.
- **Geometry-agnostic**: works for both flat and curved sensor surfaces via normal-projection space, unlike most existing simulators.
- **Computationally efficient**: ray-casting is orders of magnitude cheaper than FEM while maintaining sufficient physical fidelity for policy transfer.
- **Practical validation**: zero-shot transfer of a contact-rich RL policy (in-hand rotation) is a strong demonstration.
- **Dual-engine support**: works in both Isaac Lab (for massive parallel RL) and MuJoCo.

## 6. Limitations

- **No shear/tangential force modeling**: Tacmap only captures normal penetration depth. Shear strain and lateral forces (critical for slip prediction) are not represented.
- **Single downstream task**: only in-hand rotation is demonstrated for sim-to-real transfer. More diverse tasks (assembly, insertion) would strengthen the claims.
- **Ray-casting scales with mesh complexity**: as object meshes become more detailed, ray-casting overhead grows. Advanced acceleration structures are mentioned as future work.
- **Translation network generalization**: the real-world image-to-deform translation network is trained on a limited set of geometric indenters. Generalization to arbitrary object shapes in the wild is not extensively tested.

## 7. Takeaways

1. **The deform map is a clever abstraction layer**. By standardizing both sim and real into penetration depth, you sidestep the hardest part of tactile sim-to-real (reproducing optical phenomena) and focus on what actually matters for control: contact geometry.
2. This is the third paper from Sharpa in my recent reading (after DexEMG and SaTA). Together they form a coherent stack: **Tacmap** for tactile sim-to-real, **SaTA** for spatially-anchored tactile policy learning, and **DexEMG** for lightweight teleoperation. All targeting the SharpaWave dexterous hand.
3. The approach is complementary to SaTA: Tacmap provides the sim-to-real bridge for training tactile policies in simulation, while SaTA provides the representation for using tactile data effectively at deployment. Combining them could enable sim-trained policies with spatially-anchored tactile reasoning.
4. The main open question is **shear force**. Normal penetration depth captures a lot, but tasks requiring slip detection or delicate force modulation need tangential information. The authors acknowledge this as a key direction.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 一句话总结

触觉 sim-to-real 之所以困难，是因为原始触觉图像充满了传感器特有的光学伪影（反射、照明、相机噪声）。Tacmap 通过定义一种**共享几何表征** -- 穿透深度图（deform map）来绕过这个问题：在仿真中通过解析方法计算，在真实世界中通过翻译网络从原始触觉图像学习。两个域在这一"公共几何空间"中对齐，实现了接触密集型任务（如手内旋转）的 **零样本 sim-to-real 迁移**。该方法速度足以支持 Isaac Lab 中的大规模并行训练。

## 论文信息

- **标题**: Tacmap: Bridging the Tactile Sim-to-Real Gap via Geometry-Consistent Penetration Depth Map
- **作者**: Lei Su, Zhijie Peng, Renyuan Ren, Shengping Mao, Juan Du, Kaifeng Zhang, Xuezhou Zhu
- **机构**: Sharpa、香港科技大学、NVIDIA
- **arXiv**: [2602.21625](https://arxiv.org/abs/2602.21625)
- **类型**: 触觉仿真 / sim-to-real 迁移 / 灵巧操作

## 1. 问题与动机

GelSight、DIGIT 等视觉触觉传感器（VBTS）通过相机观察弹性体变形来捕获丰富的接触信息。训练使用这些传感器的策略需要数百万次交互，因此仿真不可或缺。但当前触觉仿真面临两难困境：

- **解析方法**（如 TACTO）：快速的深度缓冲渲染，但过度简化弹性体物理 -- sim-to-real 差距大。
- **经验方法**（如 Taxim）：由真实数据监督，但对新几何形状泛化能力差。
- **基于物理的方法**（如 FEM）：高保真，但计算代价过高，无法用于大规模 RL。

另一个盲区：大多数仿真器假设**平面传感器表面**。拟人手上常见的曲面指尖会导致现有工具难以处理的投影畸变。

## 2. 方法

### 2.1 核心思想：Deform Map 作为公共几何空间

原始触觉图像在仿真和真实之间因光学差异而大相径庭。但**底层变形几何**在两个域中是相同的物理量。Tacmap 定义了统一表征：**穿透深度图（deform map）** -- 物体穿透传感器弹性体深度的逐像素映射。

- **仿真中**：通过光线投射解析计算 deform map。
- **真实世界中**：训练神经网络将原始触觉图像翻译为 deform map。

两个域产生相同类型的输出，无需模拟复杂的光学效果。

### 2.2 仿真：几何渲染管线

传感器几何由两个表面定义：

1. **未变形传感器表面** $S_u$：弹性体的物理静止状态。
2. **虚拟感知表面** $S_s$：位于传感器外侧固定偏移处，定义交互区域。

对于 $S_s$ 上 $H \times W$ 网格的每个像素 $(u,v)$，沿表面法线向传感器内部投射光线。变形值为：

$$d(u,v) = \max(0, z_s - \max(z_u, z_o))$$

其中 $z_s$ 是光线在 $S_s$ 上的起点，$z_u$ 是未变形表面坐标，$z_o$ 是光线与物体网格的第一个交点。通过在局部法线投影空间中计算，该方法天然支持**曲面指尖**，而非假设平面。

### 2.3 真实世界：自动化数据采集 + 翻译

自动化三轴运动台在受控条件下将几何压头压入真实传感器。精确记录压头的 3D 位姿，并使用**与仿真相同的几何投影逻辑**计算真值 deform map，得到配对数据集 $\mathcal{D} = \{(I_{\text{raw}}^{(i)}, M_{\text{gt}}^{(i)})\}$。

训练 ResNet 编码器-解码器将原始触觉图像映射为 deform map：$\hat{M} = \Phi(I_{\text{raw}})$，最小化与运动学推导真值之间的逐像素 MSE。

### 2.4 三种触觉信息流

Tacmap 提供三种同步信号：

1. **净力** $F$：仿真中来自物理引擎；真实中来自训练的回归网络。
2. **接触位置** $P$：仿真中来自接触传感器；真实中来自 deform map 的质心。
3. **Deform Map** $M$（主要贡献）：稠密、逐像素的穿透深度。

## 3. 实现

同时集成到 **Isaac Lab** 和 **MuJoCo**：

- 多网格光线投射器在传感器表面预定义触觉感知点和方向。
- GPU 加速光线投射在数千个并行环境中计算穿透深度。
- Isaac Lab 中使用 Raycaster API 实现大规模并行；MuJoCo 中使用 `mj_ray` 函数。

触觉感知分辨率与物理碰撞网格分辨率解耦，高保真触觉反馈不影响物理求解器稳定性。

## 4. 实验与结果

### Sim-to-Real 保真度

使用圆柱和方块压头在 SharpaWave 手的触觉指尖上测试：

| 物体 | 接触位置误差 | 变形深度误差 | 净力 $L_2$ 误差 | 变形 IoU |
|---|---|---|---|---|
| 方块 | 0.66 mm | 18.53% | 0.28 N | 88.21% |
| 圆柱 | 0.96 mm | 14.71% | 0.61 N | 85.67% |

仿真和真实的 deform map 在压缩序列中展现出显著的结构相似性。力对齐在两个域之间高度相关。

### 计算效率

- **GPU 内存**：从 16 到 8192 个并行环境近线性增长（光线投射比 FEM 轻量得多）。
- **渲染吞吐量**：即使数千个并发环境，对整体仿真速度的影响也可忽略。
- 可在**单个消费级 GPU** 上训练。

### 零样本 Sim-to-Real 迁移：手内旋转

- 策略使用 **PPO** 完全在仿真中训练，以 Tacmap 流作为观察。
- 直接部署到物理 SharpaWave 手上，**无需任何真实世界微调**。
- 成功实现球形物体的平滑、连续手内旋转。
- 策略能解读真实触觉图像（翻译为 deform map），并执行主动手指协调以防止滑动。

## 5. 优点

- **核心思想优雅**：抽象掉传感器特有的光学特性，在共享几何空间中对齐 sim 和 real。简单有效。
- **几何无关**：通过法线投影空间支持平面和曲面传感器表面，不同于大多数现有仿真器。
- **计算高效**：光线投射比 FEM 便宜几个数量级，同时保持足够的物理保真度用于策略迁移。
- **实际验证**：接触密集型 RL 策略（手内旋转）的零样本迁移是有力的证明。
- **双引擎支持**：同时适用于 Isaac Lab（大规模并行 RL）和 MuJoCo。

## 6. 局限性

- **无剪切/切向力建模**：Tacmap 仅捕获法向穿透深度。剪切应变和侧向力（对滑动预测至关重要）未被表征。
- **单一下游任务**：仅演示了手内旋转的 sim-to-real 迁移。更多样的任务（装配、插入）能加强论证。
- **光线投射随网格复杂度增长**：物体网格越精细，光线投射开销越大。论文将高级加速结构列为未来工作。
- **翻译网络泛化性**：真实世界图像到 deform map 的翻译网络在有限的几何压头集上训练。对任意物体形状的泛化未被充分测试。

## 7. 启示

1. **Deform map 是一个巧妙的抽象层**。将 sim 和 real 统一标准化为穿透深度，绕过了触觉 sim-to-real 中最难的部分（重现光学现象），专注于对控制真正重要的东西：接触几何。
2. 这是我近期阅读的第三篇 Sharpa 论文（继 DexEMG 和 SaTA 之后）。它们共同构成了一个连贯的技术栈：**Tacmap** 用于触觉 sim-to-real，**SaTA** 用于空间锚定的触觉策略学习，**DexEMG** 用于轻量级遥操作。全部面向 SharpaWave 灵巧手。
3. 该方法与 SaTA 互补：Tacmap 提供在仿真中训练触觉策略的 sim-to-real 桥梁，SaTA 提供在部署时有效使用触觉数据的表征。两者结合可以实现具有空间锚定触觉推理的仿真训练策略。
4. 主要开放问题是**剪切力**。法向穿透深度能捕获很多信息，但需要滑动检测或精细力调制的任务需要切向信息。作者将此列为关键研究方向。

</div>
