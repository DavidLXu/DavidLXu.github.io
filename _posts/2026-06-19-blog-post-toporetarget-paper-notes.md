---
title: "[Paper Notes] TopoRetarget: Interaction-Preserving Retargeting for Dexterous Manipulation"
date: 2026-06-19
permalink: /posts/2026/06/toporetarget-paper-notes/
tags:
  - Dexterous Manipulation
  - Motion Retargeting
  - Reinforcement Learning
  - Trajectory Optimization
  - Sim-to-Real
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**TopoRetarget** shifts dexterous retargeting from **Human Pose -> Robot Pose** to **Human Hand-Object Interaction -> Robot Hand-Object Interaction**. The central object in the method is a shared interaction mesh that contains both hand keypoints and object surface points. On top of that mesh, the method optimizes topology-aware Laplacian coordinates so that the robot hand preserves the local hand-object interaction pattern in the human demonstration.

The important part of the paper is Sections 3.2-3.4. The method first builds a reasonable robot-hand warm start from relative bone directions, then constructs a shared hand-object graph, then refines the robot hand by matching local topology in place of absolute keypoint positions. The RL controller comes after this retargeting stage: it tracks the generated reference with residual joint-position actions and absorbs dynamics, timing, and sim-to-real robustness.

Paper: **"TopoRetarget: Interaction-Preserving Retargeting for Dexterous Manipulation"**. arXiv: [2606.16272](https://arxiv.org/abs/2606.16272). Project page: [toporetarget2026.github.io/TopoRetarget](https://toporetarget2026.github.io/TopoRetarget/).

## Core Framing

TopoRetarget moves the goal away from direct keypoint fitting. Human and robot hands differ in bone lengths, joint layout, palm shape, finger arrangement, and feasible contact surfaces. A retargeted pose can match fingertips in Euclidean space while losing the actual manipulation structure, especially when useful contact occurs on phalanges, finger sides, or palm regions.

The paper therefore treats manipulation retargeting as preservation of **local hand-object interaction**. The robot should keep the same local relationship between hand regions and object regions as the human demonstration. In this view, object-relative geometry becomes the object of imitation. The optimization target shifts from "where is this human keypoint in global space" to "where is this hand point relative to its neighboring hand and object points".

## 3.2 Relative Bone-Direction Initialization

The first stage provides a robot-hand initialization. Since human and robot hands have different geometry, TopoRetarget uses the local bending pattern of the fingers as the initialization signal and avoids direct copying of absolute hand keypoint positions.

For each non-terminal keypoint \\(k\\), define the bone direction \\(d_k\\) as the unit vector from the current keypoint to its child keypoint. \\(d_k^s\\) denotes the source human bone direction, and \\(d_k^r(q)\\) denotes the robot bone direction under joint configuration \\(q\\).

The key design is to compare **relative changes between adjacent bones** on the same finger. For adjacent bone pairs \\((k,l)\in A_B\\), the bone-direction mismatch is:

\\[
E_{bone}(q)
=
\sum_{(k,l)\in A_B}
\left\|
(d_k^r(q)-d_l^r(q))
-
(d_k^s-d_l^s)
\right\|_2^2 .
\\]

This loss captures local articulation. It describes how a finger bends from one bone to the next and avoids forcing a single bone to point in an absolute direction. This distinction matters for cross-embodiment transfer because link lengths and palm frames are mismatched across hands.

The initialization solves:

\\[
\tilde q_t^r
=
\arg\min_q
\lambda_{warm}E_{bone}(q)
+
\lambda_{smooth}
\|q-\tilde q_{t-1}^r\|_2^2 .
\\]

The first term makes the robot reproduce the local hand shape. The second term keeps the initialization temporally continuous. The result \\(\tilde q_t^r\\) serves as a warm start for the final retargeting output. Its purpose is to put the robot hand near a plausible local articulation state before the interaction-aware refinement begins.

## 3.3 Interaction Mesh Construction

Matching hand shape alone is insufficient for manipulation. The core signal is the relationship between the hand and the object.

At frame \\(t\\), TopoRetarget forms a source vertex set and a robot vertex set:

\\[
V_t^s=[P_t^h;O_t],
\qquad
V_t^r(q)=[P_t^r(q);O_t].
\\]

\\(P_t^h\\) is the human hand keypoint set, \\(P_t^r(q)\\) is the robot hand keypoint set, and \\(O_t\\) is a set of points sampled from the object surface. The graph has \\(N_v=21+N_o\\) vertices: the first 21 are hand keypoints, and the remaining vertices are object surface points.

The paper runs Delaunay tetrahedralization on the source vertices \\(V_t^s\\) to obtain the interaction edge set \\(\mathcal I_t\\). This gives a source graph:

\\[
G_t^s=(V_t^s,\mathcal I_t).
\\]

Then it reuses the same connectivity for the robot graph:

\\[
G_t^r(q)=(V_t^r(q),\mathcal I_t).
\\]

This shared connectivity is the main structural move. Human and robot graphs now have the same local neighborhood structure, so the optimizer can compare corresponding hand-object interactions directly. The method avoids manually specifying which fingertip, phalanx, or palm point should contact which object region. The interaction mesh encodes those local neighborhoods from the source demonstration.

## 3.4 Topology-Aware Laplacian Refinement

Once the shared graph exists, TopoRetarget compares local geometry through weighted Laplacian coordinates.

The edge weights \\(w_{ij,t}\\) are computed from spatial distances in the source graph. Close neighbors receive high weight, distant neighbors receive low weight. These weights are computed once on the source graph and then reused for the robot graph.

For vertex \\(v_i\\), the weighted Laplacian coordinate is:

\\[
\Delta_t(V)_i
=
\sum_{j\in\mathcal N_t(i)}
w_{ij,t}(v_i-v_j).
\\]

When the weights are normalized so that \\(\sum_j w_{ij,t}=1\\), the same expression becomes:

\\[
\Delta_i
=
v_i-\sum_jw_{ij,t}v_j.
\\]

This is "the current point minus the weighted center of its neighbors." It describes local structure in place of absolute position. It is naturally insensitive to global translation and fits cross-embodiment comparison better than coordinate matching.

The interaction-mesh energy is:

\\[
E_{IM}(q)
=
\frac1{N_v}
\sum_{i=1}^{N_v}
\left\|
\Delta_t(V_t^r(q))_i
-
\Delta_t(V_t^s)_i
\right\|_2^2 .
\\]

This objective asks the robot graph to match the human graph's Laplacian coordinates. Put differently, it preserves how a hand point sits relative to surrounding hand points and object surface points. The retained quantity is local hand-object topology: which regions are near each other, in what local direction, and under what local neighborhood geometry.

## Final Optimization

The final retargeting problem combines the interaction objective with the hand-shape prior and feasibility terms:

\\[
(q_t^{r,\ast},s_t^\ast)
=
\arg\min_{q,s}
\lambda_{IM}E_{IM}(q)
+
\lambda_{bone}E_{bone}(q)
+
E_{reg}(q;q_{t-1}^{r,\ast})
+
\frac{w_s}{2}
\sum_{i\in Q_t}s_i^2 .
\\]

\\(E_{IM}\\) is the core term. It keeps local hand-object interaction consistent with the human demonstration. \\(E_{bone}\\) preserves the local articulation prior from initialization. \\(E_{reg}\\) provides temporal smoothness and floating-base regularization. The slack variables \\(s_i\\) belong to the penetration constraints and are penalized so that the optimizer can tolerate small controlled violations while rejecting severe penetration.

The paper also adds signed-distance constraints \\(\phi_i(q)\\) for robot-hand and object geometry. The design combines a soft tolerance with a hard bound: the optimization can absorb minor geometric noise, while large interpenetration is blocked. This is important because retargeting is often driven by noisy hand-object capture, where tiny contact errors are common and strict zero-penetration constraints can make the problem brittle.

## Where RL Fits

The RL part should be read as a tracking layer on top of the retargeted reference. TopoRetarget first produces \\(q_t^{r,\ast}\\) and object-aligned references; then a PPO controller learns to track them.

The policy uses residual joint-position control:

\\[
q^{target}_t = q^{ref}_t + a_t .
\\]

The observation contains robot proprioception, object state, and current/lookahead reference information. The reward combines object tracking, hand-link tracking, joint tracking, and smoothness. Domain randomization is used for physical robustness.

This RL section matters because it clarifies the division of labor. Retargeting encodes the contact topology and generates a meaningful reference. RL handles dynamical tracking, residual correction, and robustness. The policy executes and corrects a topology-preserving reference, which reduces the burden of discovering the manipulation sequence from scratch.

## Limitations

The most important limitation is source quality. TopoRetarget can preserve local hand-object relations that exist in the captured motion. If the source trajectory contains a virtual contact, where a finger is meant to interact with the object but fails to touch or approach the surface, the interaction mesh has no correct relation to preserve. This suggests that upstream contact completion or motion cleanup may be necessary for noisy egocentric or monocular data.

Another limitation is that Laplacian topology is a geometric proxy. It preserves local neighborhoods, relative directions, and object-relative structure, but it does not directly optimize contact force, friction cone feasibility, or force closure. The downstream RL controller can absorb part of this gap, yet the retargeted reference itself remains kinematic.

The current setting mainly targets single-hand rigid-object manipulation. Extending the same idea to bimanual manipulation, articulated objects, deformable objects, and full arm-hand-body retargeting would require richer graph construction and stronger physical constraints.

## Takeaway

TopoRetarget's main contribution is the interaction mesh plus topology-aware Laplacian objective. Relative bone-direction initialization gives a plausible hand shape. The shared hand-object graph gives both human and robot the same local topology. Laplacian refinement makes the robot preserve local interaction in place of absolute pose. Penetration constraints keep the result physically usable. RL then tracks the generated reference.

The key message for robot learning is: reference quality becomes policy quality. If the retargeted trajectory loses contact topology, the controller inherits a damaged objective. If the retargeted trajectory preserves local hand-object interaction, RL can spend its capacity on execution robustness instead of repairing the demonstration.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**TopoRetarget** 把 dexterous retargeting 的目标从 **Human Pose -> Robot Pose** 推进到 **Human Hand-Object Interaction -> Robot Hand-Object Interaction**。它的核心对象是一个同时包含手部关键点和物体表面点的 shared interaction mesh。基于这个 mesh，方法优化 topology-aware Laplacian coordinate，让机器人手保留人手示范中的局部 hand-object interaction。

这篇论文真正重要的是 Section 3.2-3.4。方法先根据 relative bone direction 得到一个合理的机器人手 warm start，然后构造手和物体共享拓扑的 interaction graph，最后通过 Laplacian refinement 优化机器人手，使它保持与人手示范一致的局部 hand-object topology。RL controller 位于 retargeting 之后：它用 residual joint-position action 去 tracking 生成的 reference，主要处理 dynamics、timing 和 sim-to-real robustness。

论文：**"TopoRetarget: Interaction-Preserving Retargeting for Dexterous Manipulation"**。arXiv: [2606.16272](https://arxiv.org/abs/2606.16272)。项目页：[toporetarget2026.github.io/TopoRetarget](https://toporetarget2026.github.io/TopoRetarget/)。

## 核心问题

TopoRetarget 的目标从直接拟合人手关键点位置，转向复现人手与物体之间的局部交互关系。人手和机器人手在尺寸、骨骼长度、关节结构、palm shape、finger arrangement 和 feasible contact surfaces 上都存在差异。一个 retargeted pose 可能在欧氏空间里对齐了 fingertip，却破坏了真正完成任务的 manipulation structure，尤其是当有效接触发生在 phalanges、finger sides 或 palm regions 上时。

因此，TopoRetarget 把 manipulation retargeting 理解成对 **local hand-object interaction** 的保持。机器人应该复现人手与物体之间的局部交互关系。这里被模仿的对象是 object-relative geometry。优化目标从某个人手关键点在全局空间的绝对位置，转向某个手部点相对于周围手部点和物体点的局部关系。

## 3.2 Relative Bone-Direction Initialization

第一步是给机器人手一个合理初始化。由于人手和机器人手的 geometry 不同，TopoRetarget 选择匹配手指的局部弯曲模式，避开对绝对 hand keypoint positions 的直接复制。

对于每个非末端关键点 \\(k\\)，定义 bone direction \\(d_k\\) 为从当前关键点指向子关键点的单位向量。其中 \\(d_k^s\\) 表示人手的 bone direction，\\(d_k^r(q)\\) 表示机器人在关节配置 \\(q\\) 下的 bone direction。

关键设计是比较同一根手指上相邻骨骼之间的方向变化。对于相邻骨骼对 \\((k,l)\in A_B\\)，bone-direction mismatch 写为：

\\[
E_{bone}(q)
=
\sum_{(k,l)\in A_B}
\left\|
(d_k^r(q)-d_l^r(q))
-
(d_k^s-d_l^s)
\right\|_2^2 .
\\]

这个 loss 捕捉的是 local articulation。它描述一根手指从一段骨骼到下一段骨骼如何弯曲，避免要求某一根骨骼指向绝对方向。这个区别对 cross-embodiment transfer 很重要，因为不同手之间 link lengths 和 palm frames 都不一致。

初始化优化为：

\\[
\tilde q_t^r
=
\arg\min_q
\lambda_{warm}E_{bone}(q)
+
\lambda_{smooth}
\|q-\tilde q_{t-1}^r\|_2^2 .
\\]

第一项鼓励机器人手复现人手的局部手型，第二项保证时间连续性。求得的 \\(\tilde q_t^r\\) 是后续 refinement 的 warm start，并非最终 retargeting 结果。它的作用是在进入 interaction-aware refinement 之前，把机器人手放到一个合理的局部关节状态附近。

## 3.3 Interaction Mesh Construction

仅仅匹配手型不足以完成 manipulation retargeting，因为 manipulation 真正重要的是手与物体之间的关系。

对于第 \\(t\\) 帧，TopoRetarget 构造 source 顶点集合和 robot 顶点集合：

\\[
V_t^s=[P_t^h;O_t],
\qquad
V_t^r(q)=[P_t^r(q);O_t].
\\]

其中 \\(P_t^h\\) 是人手关键点，\\(P_t^r(q)\\) 是机器人关键点，\\(O_t\\) 是从物体表面采样得到的点集。整个图共有 \\(N_v=21+N_o\\) 个顶点，其中前 21 个为手部关键点，其余为物体表面点。

作者在 source 顶点集 \\(V_t^s\\) 上执行 Delaunay tetrahedralization，得到交互边集合 \\(\mathcal I_t\\)，并构造 source graph：

\\[
G_t^s=(V_t^s,\mathcal I_t).
\\]

随后作者直接将同样的 connectivity 复用到机器人图中：

\\[
G_t^r(q)=(V_t^r(q),\mathcal I_t).
\\]

这个 shared connectivity 是最关键的结构设计。人手图和机器人图拥有完全相同的局部邻域结构，因此优化器可以直接比较对应的 hand-object interaction。方法无需手工指定哪个 fingertip、phalanx 或 palm point 应该接触哪个物体区域；interaction mesh 会从 source demonstration 中编码这些局部邻域。

## 3.4 Topology-Aware Laplacian Refinement

在获得共享图结构之后，TopoRetarget 通过 weighted Laplacian coordinate 比较局部几何关系。

边权重 \\(w_{ij,t}\\) 根据 source graph 中的空间距离计算。距离越近的邻居权重越大，距离越远的邻居权重越小。这些权重只在 source graph 中计算一次，然后复用到 robot graph 中。

对于任意顶点 \\(v_i\\)，加权 Laplacian coordinate 定义为：

\\[
\Delta_t(V)_i
=
\sum_{j\in\mathcal N_t(i)}
w_{ij,t}(v_i-v_j).
\\]

如果权重满足归一化条件 \\(\sum_j w_{ij,t}=1\\)，上式可以写成：

\\[
\Delta_i
=
v_i-\sum_jw_{ij,t}v_j.
\\]

这就是“当前点减去邻居加权中心”。它描述的是局部结构，而非绝对位置，因此天然对整体平移不敏感，也更适合跨 embodiment 的比较。

Interaction-mesh energy 写为：

\\[
E_{IM}(q)
=
\frac1{N_v}
\sum_{i=1}^{N_v}
\left\|
\Delta_t(V_t^r(q))_i
-
\Delta_t(V_t^s)_i
\right\|_2^2 .
\\]

这个目标要求机器人图中的 Laplacian coordinate 接近人手图中的 Laplacian coordinate。换句话说，它保持的是某个手部点相对于周围手部点和物体点的位置关系。最终被保留下来的量是 local hand-object topology：哪些区域彼此接近、局部方向如何、邻域几何如何组织。

## 最终优化

最终 retargeting 问题把 interaction objective、hand-shape prior 和可行性约束合在一起：

\\[
(q_t^{r,\ast},s_t^\ast)
=
\arg\min_{q,s}
\lambda_{IM}E_{IM}(q)
+
\lambda_{bone}E_{bone}(q)
+
E_{reg}(q;q_{t-1}^{r,\ast})
+
\frac{w_s}{2}
\sum_{i\in Q_t}s_i^2 .
\\]

\\(E_{IM}\\) 是核心项，用于保持局部 hand-object interaction；\\(E_{bone}\\) 保留初始化阶段得到的局部手型先验；\\(E_{reg}\\) 用于时间平滑和 floating-base regularization；slack variables \\(s_i\\) 对应 penetration constraints，并通过惩罚项限制不可控穿透。

作者还加入 signed-distance 约束 \\(\phi_i(q)\\)，限制机器人手与物体之间的几何穿透。这里采用 soft tolerance 与 hard bound 相结合的设计，使优化可以吸收少量几何噪声，同时禁止严重 interpenetration。这个设计很实用，因为 hand-object capture 往往有微小接触误差，如果严格要求零穿透，优化会变得很脆。

## RL 在哪里

RL 部分可以理解为 retargeted reference 之上的 tracking layer。TopoRetarget 先生成 \\(q_t^{r,\ast}\\) 和 object-aligned references，然后用 PPO controller 学习 tracking。

Policy 采用 residual joint-position control：

\\[
q^{target}_t = q^{ref}_t + a_t .
\\]

Observation 包含 robot proprioception、object state，以及当前和 lookahead 的 reference 信息。Reward 由 object tracking、hand-link tracking、joint tracking 和 smoothness 组成。训练时使用 domain randomization 来增强物理鲁棒性。

这部分的意义在于分工清晰：retargeting 负责编码 contact topology 并生成有意义的 reference；RL 负责 dynamics tracking、residual correction 和 robustness。Policy 需要把 topology-preserving reference 执行出来，无需从零发现完整的 manipulation sequence。

## Limitation

最重要的限制是 source quality。TopoRetarget 能保留 captured motion 中已经存在的局部 hand-object relations。如果 source trajectory 里存在 virtual contact，也就是手指本应和物体交互，但几何上没有真正接触或接近 object surface，interaction mesh 就没有正确关系可以保留。这意味着对于 noisy egocentric data 或 monocular capture，retargeting 前可能需要 contact completion 或 motion cleanup。

另一个限制是 Laplacian topology 本质上是几何代理目标。它保留 local neighborhood、relative direction 和 object-relative structure，但没有直接优化 contact force、friction cone feasibility 或 force closure。后续 RL controller 可以弥补一部分差距，但 retargeted reference 本身仍然主要是 kinematic reference。

当前设置主要面向 single-hand rigid-object manipulation。要扩展到 bimanual manipulation、articulated objects、deformable objects，或者 full arm-hand-body retargeting，需要更丰富的 graph construction 和更强的物理约束。

## Takeaway

TopoRetarget 的核心创新在于 interaction mesh 和 topology-aware Laplacian objective。Relative bone-direction initialization 给出合理手型；共享 hand-object graph 让人手和机器人手拥有同一套局部拓扑；Laplacian refinement 让机器人保留局部 interaction，减少对绝对 pose 的追逐；penetration constraints 保证结果在几何上可用；RL 则负责把生成的 reference track 起来。

对 robot learning 来说，最关键的 takeaway 是：reference quality becomes policy quality。如果 retargeted trajectory 丢掉了 contact topology，controller 继承的就是损坏的目标。如果 retargeted trajectory 保留了 local hand-object interaction，RL 的容量可以更多用于 execution robustness，减少对 demonstration 修补的负担。

</div>
