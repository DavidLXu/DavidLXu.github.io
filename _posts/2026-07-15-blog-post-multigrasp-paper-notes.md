---
title: "[Paper Notes] Grasp Multiple Objects with One Hand"
date: 2026-07-15
permalink: /posts/2026/07/multigrasp-paper-notes/
tags:
  - Dexterous Manipulation
  - Multi-Object Grasping
  - Grasp Synthesis
  - Diffusion Models
  - Reinforcement Learning
---

<div data-lang="en" markdown="1">

**MultiGrasp** enables a Shadow Hand to grasp and lift multiple independent objects concurrently. Its decisive choice is to make every stage object-aware: the pre-grasp objective asks for force closure on each object, the diffusion model keeps object identities separate, and the lifting reward is controlled by the lowest object. A grasp that secures only one of two targets cannot score well.

My read: the paper succeeds by dividing the problem at the boundary between **static contact geometry** and **dynamic execution**. An augmented differentiable force-closure optimizer and a diffusion model construct a multi-contact hand pose; motion planning and goal-conditioned reinforcement learning then reach that pose and preserve all contacts during lift. This split is especially important because moving one finger to help one object can destabilize the other.

## Paper Info

**“Grasp Multiple Objects with One Hand”** is by **Yuyang Li, Bo Liu, Yiran Geng, Puhao Li, Yaodong Yang, Yixin Zhu, Tengyu Liu, and Siyuan Huang**. It appeared in **IEEE Robotics and Automation Letters (RA-L), Vol. 9, No. 5, 2024**.

- [Paper PDF](https://yzhu.io/publication/grasp2024ral/paper.pdf)
- [Project page](https://multigrasp.github.io/)
- [Paper on arXiv](https://arxiv.org/abs/2403.01694)
- [Official code](https://github.com/MultiGrasp/MultiGrasp)
- [Grasp'Em dataset branch](https://github.com/MultiGrasp/MultiGrasp/tree/graspem)

## Why Two Objects Change the Problem

A single-object dexterous grasp can often envelop the target and close all fingers toward it. With two independent objects, improving contact on one target may release the other. The hand must use its full workspace—including finger lengths and side surfaces—and maintain a separate force-closure condition for every object.

MultiGrasp studies tabletop arrangements

\[
O=\{O_j\}_{j=1}^{N_o},
\]

where each object is represented by a surface point cloud. The output is a sequence of hand actions that simultaneously grasps and lifts all targets. The objects must be close enough and small enough to fit in one hand; this is a geometric assumption of the task, not a capability learned around arbitrary placements.

The complete pipeline has two high-level stages:

1. propose and refine a pre-grasp pose that encloses all targets;
2. plan a collision-aware reach, then use a learned policy to lift every object.

## 1. Independent Force Closure for Every Object

The synthetic grasp generator extends Differentiable Force Closure (DFC). For hand configuration \(H\) and objects \(O\), it minimizes

\[
E(H,O)
=
\sum_{j=1}^{N_o}
\min_{x_j\subset S(H)} E_{\mathrm{FC}}(x_j,O_j)
+\lambda_p E_p(H,O)
+\lambda_{sp}E_{sp}(H)
+\lambda_qE_q(H).
\]

The first term is the key multi-object design. For each object \(O_j\), the optimizer selects hand contacts \(x_j\) and independently evaluates force-closure error. Stability cannot come solely from treating the pair as one combined shape. The remaining terms penalize hand-object penetration, hand self-collision, and joint-limit violations. Gradient optimization with Metropolis-Adjusted Langevin Algorithm sampling explores multiple local solutions, followed by filtering.

This objective encourages different parts of the dexterous hand to support different objects. The allocation is produced by contact optimization instead of a fixed assignment such as “thumb and index finger for object A.”

## 2. A Diffusion Model That Preserves Object Identity

DFC synthesis is effective and slow—roughly 1000 seconds in the reported batched setting. MultiGrasp therefore learns a SceneDiffuser-style DDPM that maps the object point clouds to a pre-grasp pose:

\[
p(H^{(0)}\mid O)
=
\prod_{t=1}^{T}p(H^{(t-1)}\mid H^{(t)},O).
\]

PointNet++ extracts features independently from each object. The denoising network uses the noisy hand representation as queries and object features as keys and values in cross-attention. A learned object embedding is attached to every point feature: points from the same object share an embedding, while different objects receive different embeddings. The network can therefore reason about two independent targets instead of seeing one merged point set.

The hand pose is represented by **31 Cartesian keypoints** distributed over the palm and finger links. An optimization-based inverse-kinematics solver converts these points to joint angles. Cartesian keypoints expose local finger-link/object relations directly. In the ablation, this representation reaches **40.20%** execution success, compared with **19.31%** when the model directly generates joint angles.

The training set, **Grasp'Em**, contains about 90,000 synthetic pre-grasps:

- 16.4k single-object grasps;
- 73.7k dual-object grasps;
- 8 objects and 36 single/dual combinations from YCB and ContactDB;
- randomized stable tabletop positions and orientations.

The objects are rescaled so several can fit in the hand. Training also normalizes the palm's projected direction around the tabletop's vertical axis. At inference, rotating the scene into this canonical orientation and rotating the predicted hand back allows the system to control palm direction and avoid particularly difficult approaches.

## 3. Contact Refinement Before Execution

Diffusion samples can contain shallow penetration or leave useful fingers floating near a surface. A coarse-to-fine refinement step minimizes penetration while attracting nearby potential hand contacts toward object surfaces. Its distance threshold decreases from 2 mm to 1 mm.

This small-looking stage has a large effect. Removing refinement increases maximum penetration from **1.67 mm to 7.68 mm** and reduces success from **40.20% to 16.24%**. The comparison shows that a visually plausible hand pose is insufficient; multi-object lifting needs contacts that survive dynamics.

## 4. Reach First, Then Learn to Lift

Execution is split into reaching and lifting. The reaching stage linearly interpolates from a flat hand to the pre-grasp, then optimizes the trajectory for smoothness and hand-object collision reduction. Small remaining collisions may displace an object, so the lifting policy is trained to recover from the resulting state.

The PPO lifting policy controls **18 actuated joint-angle targets** and a **6D hand-base wrench**. Its observations include proprioception, fingertip wrenches, current and goal hand states, object states, and point-cloud features. The policy is goal-conditioned on the pre-grasp configuration instead of discarding it after reaching.

The central reward is

\[
r
=
\omega_{\mathrm{lift}}r_{\mathrm{lift}}
+\omega_{\mathrm{succ}}\mathbf{1}_{\mathrm{succ}}
+\omega_r r_r
+\omega_q r_q
+\omega_{\mathrm{obj}}r_{\mathrm{obj}},
\qquad
r_{\mathrm{lift}}=\min_j h_j.
\]

Here \(h_j\) is the height of object \(j\). Taking the minimum makes the lowest object the bottleneck: lifting one target high cannot compensate for leaving or dropping another. A success bonus is activated only when all objects exceed the training threshold. Additional terms maintain the goal hand orientation, joint configuration, and each object's position relative to the hand.

This reward encodes simultaneous grasping in the dynamic stage. The ablation is direct: the complete training setting obtains **45.25%**, while removing RL leaves only **1.37%** success. Removing goal observations and rewards gives **16.79%**.

## 5. Specialists, Vision Distillation, and Error Adaptation

Object shape, pair identity, and placement relative to the palm produce different lifting dynamics. The authors cluster training grasps by object combination and by the direction connecting object centers in the palm frame. A specialist policy is trained for each cluster. Their demonstrations are distilled with DAgger into a vision-based generalist that consumes a fused scene point cloud from three RGB-D cameras.

The final policy also needs to tolerate imperfect pre-grasps. MultiGrasp uses a three-phase curriculum:

1. train on high-quality synthetic pre-grasps;
2. mix synthetic samples with generated poses and states disturbed during reaching;
3. emphasize generated and displaced states.

Without adaptation to imperfect poses, success drops to **25.05%**; removing the curriculum yields **24.88%**. This training recipe closes the gap between a static target pose and the actual state encountered after physical reaching.

## What the Experiments Establish

Success is defined as lifting **all objects** above 10 cm. Evaluation uses 512 unique poses with five trials per pose. For unseen object placements using synthetic pre-grasps, state-based specialists achieve **68.34%**, while the distilled vision generalist achieves the paper's headline **44.13%**. With diffusion-generated pre-grasps on unseen placements, the corresponding results are **40.20% / 30.24%**.

The number **44.13%** therefore has a precise scope: it is the vision-based generalist's simulated dual-object success with synthetic pre-grasps on unseen placements. It is not an unrestricted real-world success rate.

The pre-grasp ablations isolate the representation choices:

| Pre-grasp model | Q1 ↑ | Penetration (mm) ↓ | Success ↑ |
|---|---:|---:|---:|
| Full model | 0.29 | 1.67 | **40.20%** |
| Joint-angle representation | 0.18 | 5.50 | 19.31% |
| Without object embedding | 0.27 | 1.38 | 37.21% |
| Without refinement | 0.29 | 7.68 | 16.24% |

The method also demonstrates three to five small cylinders. As object count grows, inter-object contact becomes increasingly important; the five-object case uses an inverted, scooping hand pose. These tests use synthesized grasps and case-specific state-based execution policies, so they demonstrate scalability of the formulation more than a single general policy across arbitrary object counts.

On the physical system, a Shadow Hand mounted on a UR10e lifts two objects. The authors precompute execution trajectories in simulation and replay them on the robot. This experiment establishes physical feasibility while leaving online perception and closed-loop sim-to-real robustness open.

## Strengths and Limitations

The strongest aspect is alignment across stages. Static synthesis, learned generation, execution reward, and evaluation all require success on every object. The method also preserves the distinction between two independent objects through explicit embeddings and per-object state goals.

Its main boundaries are equally clear. Objects must be close and fit in one hand. The data contains only eight mostly convex training objects, and performance falls on unseen combinations and geometries. Vision suffers from severe occlusion around a closed hand, and the physical demonstration replays trajectories prepared in simulation. Typical failures come from missing force closure, penetration, dropping an object during lift, or failing to raise every target. The paper identifies tactile sensing and improved sim-to-real modeling as natural next steps.

## Takeaways

MultiGrasp's recipe for concurrent dual-object grasping can be summarized as

\[
\boxed{
\text{per-object force closure}
+\text{object-aware diffusion}
+\text{Cartesian hand keypoints}
+\text{contact refinement}
+\min_j h_j\text{-driven lifting}
}.
\]

The first and last terms are the most fundamental. Per-object force closure defines a static grasp that supports both targets; the minimum-height reward prevents the controller from sacrificing one target during execution. The keypoint generator, refinement, specialist distillation, and curriculum make that objective computationally practical and robust to imperfect reaching.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**MultiGrasp** 让 Shadow Hand 用一只手同时抓起并抬升多个相互独立的物体。它最关键的选择是让整个流程都显式感知每个物体：pre-grasp 目标要求每个物体分别达到 force closure，扩散模型保留不同物体的身份，抬升奖励则由高度最低的物体决定。双物体中只抓稳一个，策略无法获得高回报。

我的理解是：论文沿着**静态接触几何**与**动态执行**的边界拆解问题。扩展后的可微 force-closure 优化器和扩散模型负责构造多接触手型，运动规划与目标条件强化学习负责到达该手型，并在抬升过程中维持所有接触。双物体抓取尤其需要这种分工，因为调整一根手指帮助一个物体时，另一个物体可能随之失稳。

## 论文信息

论文 **“Grasp Multiple Objects with One Hand”** 的作者是 **Yuyang Li、Bo Liu、Yiran Geng、Puhao Li、Yaodong Yang、Yixin Zhu、Tengyu Liu 和 Siyuan Huang**，发表于 **IEEE Robotics and Automation Letters（RA-L），Vol. 9, No. 5, 2024**。

- [论文 PDF](https://yzhu.io/publication/grasp2024ral/paper.pdf)
- [项目主页](https://multigrasp.github.io/)
- [arXiv](https://arxiv.org/abs/2403.01694)
- [官方代码](https://github.com/MultiGrasp/MultiGrasp)
- [Grasp'Em 数据集分支](https://github.com/MultiGrasp/MultiGrasp/tree/graspem)

## 为什么两个物体会改变问题

单物体灵巧抓取通常可以包住目标，再让所有手指朝它闭合。面对两个彼此独立的物体，改善一个目标的接触可能释放另一个目标。整只手需要充分利用工作空间，包括手指长度和侧面，并为每个物体维持独立的 force-closure 条件。

MultiGrasp 研究桌面场景中的物体集合

\[
O=\{O_j\}_{j=1}^{N_o},
\]

每个物体由表面点云表示，系统输出同时抓取并抬升所有目标的手部动作序列。物体需要彼此足够靠近，尺寸也要适合装入一只手；这是任务的几何假设，系统并不能处理任意远距离或任意尺寸的摆放。

完整流程包含两个高层阶段：

1. 生成并优化一个包围所有目标的 pre-grasp；
2. 规划避碰的 reaching 轨迹，再通过学习策略抬起全部物体。

## 1. 为每个物体分别建立 Force Closure

合成抓姿生成器扩展了 Differentiable Force Closure（DFC）。给定手部构型 \(H\) 和物体集合 \(O\)，其优化目标为

\[
E(H,O)
=
\sum_{j=1}^{N_o}
\min_{x_j\subset S(H)} E_{\mathrm{FC}}(x_j,O_j)
+\lambda_p E_p(H,O)
+\lambda_{sp}E_{sp}(H)
+\lambda_qE_q(H).
\]

第一项是最核心的多物体设计。对于每个物体 \(O_j\)，优化器选择对应的手部接触点 \(x_j\)，并单独计算 force-closure error。稳定性不能只来自把两个物体当作一个组合形状来包裹。其余三项分别惩罚手—物体穿透、手部自碰撞和关节越界。算法使用梯度优化与 Metropolis-Adjusted Langevin Algorithm 采样探索多个局部解，最后过滤不合格结果。

这个目标会促使灵巧手的不同区域分别支撑不同物体。接触分配由优化产生，并未硬编码成“拇指和食指负责物体 A”之类的固定规则。

## 2. 保留物体身份的扩散模型

DFC 合成有效但很慢，论文报告的批量设置约需 1000 秒。MultiGrasp 因此训练了一个基于 SceneDiffuser 的 DDPM，把多个物体的点云映射为 pre-grasp：

\[
p(H^{(0)}\mid O)
=
\prod_{t=1}^{T}p(H^{(t-1)}\mid H^{(t)},O).
\]

PointNet++ 分别提取每个物体的特征。去噪网络以带噪手部表示为 query，以物体特征为 key 和 value 进行 cross-attention。每个点特征还附带一个可学习的 object embedding：同一物体的点共享 embedding，不同物体使用不同 embedding。网络由此能够推理两个独立目标，而不会把它们看成一个合并点集。

手部姿态使用分布在手掌和手指 link 上的 **31 个笛卡尔关键点**表示，再由优化式 IK 恢复关节角。笛卡尔关键点直接表达局部的手指 link—物体关系。消融实验中，这种表示达到 **40.20%** 执行成功率，直接生成关节角只有 **19.31%**。

训练数据集 **Grasp'Em** 包含约 9 万个合成 pre-grasp：

- 16.4k 个单物体抓姿；
- 73.7k 个双物体抓姿；
- 来自 YCB 和 ContactDB 的 8 种物体，共 36 种单双物体组合；
- 随机生成的稳定桌面位置和朝向。

物体会被缩放到多个目标能够装入一只手。训练还会围绕桌面竖直轴归一化手掌投影方向。推理时先把场景旋转到规范朝向，生成后再把手型旋回原场景，从而控制手掌接近方向，并避开特别困难的抓取朝向。

## 3. 执行前的接触 Refinement

扩散模型生成的手型可能有轻微穿透，也可能让有用的手指悬在物体表面附近。论文加入由粗到细的 refinement：在降低穿透的同时，把附近的潜在手部接触点拉向物体表面，距离阈值从 2 mm 逐步缩小到 1 mm。

这个看似很小的步骤影响很大。去掉 refinement 后，最大穿透从 **1.67 mm** 上升到 **7.68 mm**，成功率从 **40.20%** 降到 **16.24%**。外观合理的手型还不够，多物体抬升需要能够经受动力学过程的真实接触。

## 4. 先到达抓姿，再学习抬升

执行过程分成 reaching 和 lifting。Reaching 首先从张开的手线性插值到 pre-grasp，随后优化整段轨迹的平滑性，并减少手—物体碰撞。少量残余碰撞仍可能推动物体，因此 lifting 策略专门训练了对这种状态偏移的恢复能力。

PPO 抬升策略控制 **18 个主动关节角目标**和一个 **6D 手掌基座 wrench**。观测包含本体状态、指尖 wrench、当前与目标手部状态、物体状态和点云特征。策略始终以 pre-grasp 为目标条件，在 reaching 结束后继续使用这份目标信息。

最重要的奖励是

\[
r
=
\omega_{\mathrm{lift}}r_{\mathrm{lift}}
+\omega_{\mathrm{succ}}\mathbf{1}_{\mathrm{succ}}
+\omega_r r_r
+\omega_q r_q
+\omega_{\mathrm{obj}}r_{\mathrm{obj}},
\qquad
r_{\mathrm{lift}}=\min_j h_j.
\]

其中 \(h_j\) 是第 \(j\) 个物体的高度。取最小值会让最低的物体成为瓶颈：把一个目标抬得很高，无法补偿另一个目标留在桌面上或中途掉落。只有所有物体超过训练阈值时才得到成功奖励。其他奖励项分别维持目标手掌朝向、关节构型和各物体相对手掌的位置。

这个奖励在动态执行阶段直接编码了“同时抓住”。消融结果很清楚：完整训练达到 **45.25%**，去掉 RL 后只剩 **1.37%**；去掉目标观测和目标奖励后为 **16.79%**。

## 5. Specialist、视觉蒸馏与误差适应

物体形状、物体组合和二者相对手掌的摆放都会改变抬升动力学。作者按照物体组合，以及两个物体中心连线在手掌坐标系中的方向，对训练抓姿进行聚类。每个 cluster 训练一个 specialist，再通过 DAgger 将示范蒸馏到视觉 generalist。最终策略使用三台 RGB-D 相机融合得到的场景点云。

策略还需要容忍不准确的 pre-grasp。MultiGrasp 使用三阶段 curriculum：

1. 先训练高质量合成 pre-grasp；
2. 混合合成样本、扩散生成的手型，以及 reaching 过程中发生位移的状态；
3. 后期以生成样本和受扰动状态为主。

去掉对不准确抓姿的适应训练后，成功率降到 **25.05%**；保留适应但去掉 curriculum 后为 **24.88%**。这套训练方法连接了静态目标手型与真实 reaching 结束后遇到的物理状态。

## 实验到底证明了什么

实验把成功定义为**所有物体**都被抬到 10 cm 以上。评估包含 512 个独立抓姿，每个运行五次。对于未见过的物体摆放和合成 pre-grasp，基于状态的 specialist 达到 **68.34%**，蒸馏后的视觉 generalist 达到论文摘要中的 **44.13%**。换成扩散模型生成的 pre-grasp 后，对应结果为 **40.20% / 30.24%**。

因此，**44.13%** 的准确含义是：在仿真中，面对未见过的双物体摆放，视觉 generalist 使用合成 pre-grasp 得到的成功率。它不是无约束真实场景中的成功率。

Pre-grasp 消融进一步分离了各项表示设计：

| Pre-grasp 模型 | Q1 ↑ | 穿透（mm）↓ | 成功率 ↑ |
|---|---:|---:|---:|
| 完整模型 | 0.29 | 1.67 | **40.20%** |
| 关节角表示 | 0.18 | 5.50 | 19.31% |
| 无 object embedding | 0.27 | 1.38 | 37.21% |
| 无 refinement | 0.29 | 7.68 | 16.24% |

论文还展示了抓取三到五个小圆柱。物体数量增加后，物体间接触越来越重要；五物体场景使用了翻转手掌的“铲取”姿态。这些实验采用合成抓姿，并为不同物体数量训练专门的状态策略，因此它们主要证明框架形式可以扩展，还没有得到覆盖任意物体数量的单一通用策略。

真实系统由 UR10e 搭载 Shadow Hand，能够从桌面上抓起两个物体。作者先在仿真中预计算执行轨迹，再在机器人上复现。这个实验验证了物理可行性，在线感知和闭环 sim-to-real 鲁棒性仍有待解决。

## 优点与局限

论文最强的地方是各阶段目标一致。静态合成、学习式生成、执行奖励和评测都要求每个物体成功。显式 object embedding 与逐物体状态目标也始终保留两个独立实体之间的区别。

方法边界同样明确。物体必须足够接近并能放入一只手，训练集只有 8 种以凸形为主的物体，遇到新组合和新几何时性能明显下降。手部闭合后会造成严重视觉遮挡，真实机器人演示也使用了仿真预计算轨迹。典型失败包括缺少 force closure、手—物体穿透、抬升途中掉落一个物体，以及部分目标始终没有离开桌面。论文把触觉感知和更准确的 sim-to-real 建模列为后续方向。

## Takeaways

MultiGrasp 的并发双物体抓取方案可以概括为

\[
\boxed{
\text{逐物体 force closure}
+\text{物体感知扩散模型}
+\text{笛卡尔手部关键点}
+\text{接触 refinement}
+\min_j h_j\text{ 驱动的抬升策略}
}.
\]

其中第一项和最后一项最根本。逐物体 force closure 定义了同时支撑两个目标的静态手型，最小高度奖励防止控制器在动态执行中牺牲任何一个目标。关键点生成、接触 refinement、specialist 蒸馏和 curriculum 则让这个目标具备可计算性，并能容忍 reaching 产生的误差。

</div>
