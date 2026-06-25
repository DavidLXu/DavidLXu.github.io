---
title: "[Paper Notes] DeformGen: Dynamics-Based Topology Augmentation for Deformable Manipulation Policy Learning"
date: 2026-06-26
permalink: /posts/2026/06/deformgen-paper-notes/
tags:
  - Deformable Manipulation
  - Data Augmentation
  - Imitation Learning
  - Simulation
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DeformGen** is a data augmentation framework for deformable object manipulation. It starts from sparse demonstrations, generates new physically plausible deformable object states through localized physical disturbances and forward simulation, then transfers the original manipulation trajectory to each new state using deformation-field warping. The goal is to turn one or a few demonstrations into many usable training episodes for rope, cloth, toy, and other deformable manipulation tasks.

My read: the paper is useful because it states the failure mode of rigid-object demonstration augmentation precisely. Rigid augmentation assumes equivariance: if the object pose changes by an SE(3) transform, the end-effector trajectory can receive the same transform and remain valid. Deformable objects break this assumption. Their state is high-dimensional, physically constrained, and non-equivariant under local deformation. DeformGen therefore augments both sides together: the object topology and the behavior attached to that topology.

## Paper and Resources

The paper is **"DeformGen: Dynamics-Based Topology Augmentation for Deformable Manipulation Policy Learning"** by **Zili Lin, Wenyao Zhang, Yuyang Zhang, Zekun Qi, Junyan Lin, Hanxin Zhu, Jiaolong Yang, Zhibo Chen, Yao Mu, Xiaokang Yang, Xin Jin, and Wenjun Zeng**. The affiliations include **Shanghai Jiao Tong University**, **Eastern Institute of Technology, Ningbo**, **Tsinghua University**, **The Hong Kong Polytechnic University**, **University of Science and Technology of China**, **Zhongguancun Academy**, and **Microsoft Research**.

The paper is available as [arXiv:2606.25939](https://arxiv.org/abs/2606.25939). The project page is [zili2002.github.io/DeformGen](https://zili2002.github.io/DeformGen), and the code is at [Zili2002/DeformGen](https://github.com/Zili2002/DeformGen).

## Why Rigid Augmentation Fails

For rigid manipulation, a single demonstration can often be reused by changing the object pose and applying a matching rigid transform to the robot trajectory. This works because distances between material points are preserved, and the relative pose between gripper and object can be kept consistent.

Deformable manipulation has two different problems.

First, the object state is not a 6-DoF pose. The paper models a deformable object as \\(N\\) particles:

\\[
s = (p_1, \ldots, p_N) \in \mathbb{R}^{3N}.
\\]

Only a small subset \\(S_{\mathrm{real}} \subset \mathbb{R}^{3N}\\) corresponds to physically plausible configurations. A random perturbation in particle space can easily create disconnected ropes, impossible cloth folds, self-intersections, or shapes with unrealistic internal stress. Low-dimensional rigid pose perturbations stay valid, but they cover only spatial diversity, not shape or topological diversity.

Second, trajectory transfer is non-equivariant. When a rope bends or a cloth drapes, nearby material points move differently. A global rigid transform of the end-effector trajectory may misalign the grasp pose, miss the local geometry, or fail to compensate for the changed global shape. For deformables, valid data augmentation must synthesize a new object state and a new trajectory that matches that state.

## State Augmentation: Simulate Into Plausible Topologies

DeformGen's first component is **Dynamic Topological Transformation**. Instead of directly editing the particle positions, it starts from a known valid state \\(s_0 \in S_{\mathrm{real}}\\), applies localized physical disturbances, and forward-simulates the object dynamics:

\\[
s_{\mathrm{aug}} = \Phi_{\mathrm{sim}}(s_0, f, \Delta t).
\\]

Here \\(f\\) is a localized force field and \\(\Phi_{\mathrm{sim}}\\) is the simulator rollout. The key assumption is conditional: a good simulator approximately preserves physical plausibility when it evolves from a valid state, while it cannot reliably repair an invalid state produced by arbitrary geometric perturbation.

This is the core design choice. DeformGen does not ask the simulator to fix broken shapes after the fact. It uses the simulator as the generator itself. Localized forces can produce bending, twisting, folding, draping, and compression while the internal constraints, contacts, and settling dynamics remain coupled through simulation.

In the implementation, the simulator does not expose a direct external-force API. The authors implement disturbances by commanding an xArm7 gripper to execute randomized Cartesian perturbations while contacting the object. Rope and toy use 180 random steps; cloth uses 260. After perturbation, the object is stabilized for 30 to 40 simulation steps.

## Trajectory Augmentation: Warp the Demonstration Through the Deformation Field

Generating a new object state is only half the problem. The source demonstration trajectory must also be adapted. DeformGen uses **Deformation-Field Warping**.

Let \\(p^{\mathrm{orig}}, p^{\mathrm{def}} \in \mathbb{R}^{N \times 3}\\) be the source and deformed point clouds. Each particle displacement is:

\\[
\delta_i = p^{\mathrm{def}}_i - p^{\mathrm{orig}}_i.
\\]

For an end-effector waypoint \\(x_t\\), DeformGen finds its \\(K\\) nearest source particles and interpolates their displacements with inverse-distance weights:

\\[
d(x_t) = \sum_j \tilde{w}_{t,j}\delta_{\mathrm{nn}_j(x_t)}.
\\]

The warped waypoint is:

\\[
x_t^{\mathrm{warp}} = x_t + \alpha_t d(x_t).
\\]

The scalar \\(\alpha_t\) is a decay function. It lets the trajectory strongly follow local deformation near the grasp phase while gradually reverting toward the original path when useful for the manipulation phase.

Orientation is adapted by estimating a local Jacobian from the original KNN neighborhood to the deformed neighborhood. The induced rotation is projected onto \\(SO(3)\\), then interpolated with the original orientation using SLERP:

\\[
R_t^{\mathrm{warp}} = \mathrm{SLERP}(R_t, R'_t, \alpha_t).
\\]

The practical detail is important: the grasp pose uses small \\(K\\), because grasp alignment depends on nearby geometry. The manipulation phase uses all object points, because the motion must compensate for the global deformation of the object.

## Policy Training Setup

The experiments use **Real2Sim-Eval** with **PhysTwin** for soft-body dynamics and rendering. The robot is an **xArm7** with two RGB cameras: third-person and wrist-mounted, both at 848 by 480 and 30 Hz. The policy outputs an 8D action: end-effector position, quaternion orientation, and gripper opening.

The paper evaluates three tasks:

| Task | Goal | Success criterion |
|---|---|---|
| Rope routing | Thread a rope through a clip | enough rope intersections with upper and lower clip planes |
| Toy packing | Put a stuffed toy into a container | enough object points inside a scaled oriented bounding box |
| Cloth folding | Fold cloth into a triangle | projected mask matches a fitted triangle by contour and IoU criteria |

For each task, the authors collect one teleoperation source demonstration, generate more than 1,200 distinct object states, synthesize trajectories, and keep successful rollouts. They train ACT, Diffusion Policy, SmolVLA, and \\(\pi_0\\) with LoRA, then evaluate on held-out object states unseen during training.

## Baselines and Ablations

The comparison is structured to separate state augmentation from trajectory transfer:

| Method | State augmentation | Trajectory transfer |
|---|---|---|
| 1 Src. | none | source demo only |
| SoftMimicGen* | rigid state perturbation | deformation-field warping |
| DeformGen* | topological state augmentation | local rigid trajectory transfer |
| DeformGen | topological state augmentation | deformation-field warping |

This setup isolates two questions. Comparing SoftMimicGen* with DeformGen tests whether topology-diverse states help. Comparing DeformGen* with DeformGen tests whether deformation-field warping improves over local rigid transfer on the same augmented states.

## Results

The headline result is that DeformGen improves policy learning in most settings. In Table 2, the single-source baseline is close to zero success on most tasks. Full DeformGen achieves the best average success for three of four policy architectures:

- ACT: **59.00%** average success with DeformGen, compared with **1.33%** for one source demo.
- SmolVLA: **56.50%** with DeformGen, compared with **2.50%** for one source demo.
- \\(\pi_0\\): **56.67%** with DeformGen, compared with **2.33%** for one source demo.

Diffusion Policy is the exception where DeformGen* slightly exceeds full DeformGen on average, but the overall trend still supports the value of topological augmentation. The strongest numbers appear in rope routing, where DeformGen reaches **90.50%** with ACT, **92.00%** with SmolVLA, and **99.00%** with \\(\pi_0\\).

The state coverage analysis supports the mechanism. Rigid augmentation clusters near the source state with near-zero non-rigid residual. DeformGen spreads broadly in the unified state PCA and shows large non-rigid residuals after Procrustes alignment. This indicates that it is creating genuine deformable shape variation, not simply more rigid poses.

The synthetic data scaling study also matters. For ACT, average success increases from **19.50%** at 100 synthetic trajectories to **61.50%** at 750. For SmolVLA, it increases from **36.83%** to **63.17%**. This suggests the generated data is useful at scale, beyond acting as a small regularizer.

## Limitations

The paper is simulation-only. Real2Sim-Eval and PhysTwin provide high-fidelity dynamics and rendering, but the authors do not show real-robot deployment. Sim-to-real transfer could require additional adaptation for material properties, contact dynamics, and visual appearance.

The tasks are limited to single-arm manipulation with xArm7. Rope, stuffed toy, and cloth cover 1D, quasi-rigid 3D, and 2D sheet-like deformables, but they do not cover bimanual folding, cable routing in clutter, dough or clay shaping, or surgical tissue manipulation.

Trajectory synthesis is also not guaranteed. The success rates for generating valid trajectories vary: rope is easy at **99.5%**, toy is **60.3%**, and cloth is **39.5%**. Large topology changes, unstable contact, and kinematic constraints can make warped trajectories fail. The paper partially addresses this by filtering and by showing that policies can generalize to some synthesis-failure states, while the generation process still has clear reliability limits.

## Takeaways

DeformGen's main contribution is a clear augmentation principle for deformable manipulation: **generate new states through dynamics, then transfer trajectories through deformation fields**. This is a stronger recipe than adapting rigid-object SE(3) augmentation to a setting where the object state lives in \\(\mathbb{R}^{3N}\\).

For robot learning, the practical message is direct. If the task involves deformable objects, collecting one demonstration and rigidly moving it around will mostly create spatial variety. To create useful training diversity, the augmentation process must change the object's topology while preserving physical plausibility, and the robot trajectory must move with the object's local and global deformation.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇文章支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**DeformGen** 是一个面向 deformable object manipulation 的数据增强框架。它从少量 demonstrations 出发，通过局部物理扰动和 forward simulation 生成新的、物理上合理的可变形物体状态，然后用 deformation-field warping 把原始操作轨迹转移到这些新状态上。目标是把一条或少量演示扩增成很多可训练的 rope、cloth、toy 等可变形物体操作 episodes。

我的理解是：这篇文章的价值在于把刚体 demonstration augmentation 在可变形物体上失败的原因讲清楚。刚体增强依赖 equivariance：物体 pose 做了一个 SE(3) 变换，end-effector trajectory 做同样变换后仍然有效。可变形物体打破了这个假设。它的状态高维、受物理约束，并且局部形变下不再满足刚体等变。DeformGen 因此同时增强两件事：物体 topology，以及绑定到这个 topology 的操作行为。

## 论文与资源

论文是 **"DeformGen: Dynamics-Based Topology Augmentation for Deformable Manipulation Policy Learning"**，作者包括 **Zili Lin, Wenyao Zhang, Yuyang Zhang, Zekun Qi, Junyan Lin, Hanxin Zhu, Jiaolong Yang, Zhibo Chen, Yao Mu, Xiaokang Yang, Xin Jin, Wenjun Zeng**。机构包括 **上海交通大学**、**宁波东方理工大学**、**清华大学**、**香港理工大学**、**中国科学技术大学**、**中关村学院** 和 **Microsoft Research**。

论文链接是 [arXiv:2606.25939](https://arxiv.org/abs/2606.25939)。项目页是 [zili2002.github.io/DeformGen](https://zili2002.github.io/DeformGen)，代码在 [Zili2002/DeformGen](https://github.com/Zili2002/DeformGen)。

## 为什么刚体增强不适用

在刚体操作里，一条 demonstration 常常可以通过改变 object pose 并对 robot trajectory 施加相同刚体变换来复用。这个做法成立，是因为 material points 之间的距离不变，gripper 和 object 的相对 pose 可以保持一致。

可变形操作有两个不同问题。

第一，object state 不是一个 6-DoF pose。论文把可变形物体表示为 \\(N\\) 个 particles：

\\[
s = (p_1, \ldots, p_N) \in \mathbb{R}^{3N}.
\\]

只有很小一部分 \\(S_{\mathrm{real}} \subset \mathbb{R}^{3N}\\) 是物理上合理的配置。随意在 particle space 里扰动，容易生成断裂的 rope、不可能的 cloth folds、自相交结构，或者内部应力不真实的形状。低维刚体 pose perturbation 虽然保持 valid，但只能提供 spatial diversity，不能提供 shape 或 topology diversity。

第二，trajectory transfer 不满足 equivariance。当 rope 弯曲、cloth drape 时，附近 material points 的移动方式不同。对 end-effector trajectory 施加一个全局刚体变换，可能导致 grasp pose 对不上局部几何，或者无法补偿整体形状变化。对 deformables 来说，有效的数据增强必须同时生成新的 object state 和匹配这个 state 的新 trajectory。

## State Augmentation: 用仿真生成合理 topology

DeformGen 的第一个组件是 **Dynamic Topological Transformation**。它不直接编辑 particle positions，而是从已知 valid state \\(s_0 \in S_{\mathrm{real}}\\) 出发，施加局部物理扰动，并让物体 forward-simulate：

\\[
s_{\mathrm{aug}} = \Phi_{\mathrm{sim}}(s_0, f, \Delta t).
\\]

这里 \\(f\\) 是 localized force field，\\(\Phi_{\mathrm{sim}}\\) 是 simulator rollout。核心假设是条件式的：一个校准良好的 simulator 从 valid state 出发时，大体能保持物理合理性；但如果先用任意几何扰动生成 invalid state，再指望 simulator 修复，通常不可靠。

这是整篇文章最关键的设计选择。DeformGen 没有让 simulator 事后修坏掉的形状，而是直接把 simulator 当作 generator。局部力可以产生 bending、twisting、folding、draping、compression，同时内部约束、接触和 settling dynamics 都由仿真耦合处理。

实现上，实验环境没有直接 external-force API。作者通过让 xArm7 gripper 在接触物体时执行随机 Cartesian perturbations，把扰动通过接触动力学传给物体。Rope 和 toy 使用 180 个随机 steps，cloth 使用 260 个。扰动结束后，再稳定 30 到 40 个 simulation steps。

## Trajectory Augmentation: 用 deformation field 转移 demonstration

生成新 object state 只解决了一半问题。源 demonstration trajectory 也必须适配。DeformGen 使用 **Deformation-Field Warping**。

设 \\(p^{\mathrm{orig}}, p^{\mathrm{def}} \in \mathbb{R}^{N \times 3}\\) 是源点云和变形后点云。每个 particle displacement 为：

\\[
\delta_i = p^{\mathrm{def}}_i - p^{\mathrm{orig}}_i.
\\]

对于一个 end-effector waypoint \\(x_t\\)，DeformGen 找到它在源点云中的 \\(K\\) 个最近 particles，并用 inverse-distance weights 插值这些 particles 的位移：

\\[
d(x_t) = \sum_j \tilde{w}_{t,j}\delta_{\mathrm{nn}_j(x_t)}.
\\]

Warp 后的位置是：

\\[
x_t^{\mathrm{warp}} = x_t + \alpha_t d(x_t).
\\]

\\(\alpha_t\\) 是 decay function。它让 trajectory 在 grasp phase 强烈跟随局部形变，而在后续 manipulation phase 中根据需要逐渐回到原路径。

Orientation adaptation 通过原始 KNN 邻域和变形后邻域估计 local Jacobian。诱导出的 rotation 被投影到 \\(SO(3)\\)，再和原始 orientation 做 SLERP：

\\[
R_t^{\mathrm{warp}} = \mathrm{SLERP}(R_t, R'_t, \alpha_t).
\\]

一个重要实践细节是：grasp pose 用小 \\(K\\)，因为 grasp alignment 更依赖附近几何；manipulation phase 用所有 object points，因为轨迹需要补偿物体的整体形变。

## Policy Training Setup

实验使用 **Real2Sim-Eval** 和 **PhysTwin** 做 soft-body dynamics 与 rendering。机器人是 **xArm7**，带两个 RGB cameras：第三视角和腕部视角，分辨率 848 by 480，30 Hz。Policy 输出 8D action：end-effector position、quaternion orientation 和 gripper opening。

论文评估三个任务：

| Task | 目标 | 成功标准 |
|---|---|---|
| Rope routing | 把 rope 穿过 clip | rope 与 clip 上下平面有足够交叉 |
| Toy packing | 把 stuffed toy 放进 container | 足够多 object points 落入 scaled oriented bounding box |
| Cloth folding | 把 cloth 折成三角形 | 投影 mask 与拟合三角形满足 contour 和 IoU 条件 |

每个任务只采集一条 teleoperation source demonstration，然后生成超过 1,200 个不同 object states，合成 trajectories，并保留成功 rollout。训练的 policy 架构包括 ACT、Diffusion Policy、SmolVLA 和 LoRA fine-tuned \\(\pi_0\\)，测试在训练未见过的 held-out object states 上进行。

## Baselines and Ablations

对比实验把 state augmentation 和 trajectory transfer 分开看：

| Method | State augmentation | Trajectory transfer |
|---|---|---|
| 1 Src. | 无 | 只用 source demo |
| SoftMimicGen* | rigid state perturbation | deformation-field warping |
| DeformGen* | topological state augmentation | local rigid trajectory transfer |
| DeformGen | topological state augmentation | deformation-field warping |

这个设置回答两个问题。SoftMimicGen* 和 DeformGen 的比较，用来测试 topology-diverse states 是否有帮助。DeformGen* 和 DeformGen 的比较，用来测试在同一组 augmented states 上，deformation-field warping 是否优于 local rigid transfer。

## 实验结果

核心结果是 DeformGen 在多数设置下提升了 policy learning。Table 2 中，single-source baseline 在大多数任务上接近零成功率。完整 DeformGen 在四个 policy architectures 中有三个拿到最高平均成功率：

- ACT: DeformGen 平均成功率 **59.00%**，one source demo 是 **1.33%**。
- SmolVLA: DeformGen 是 **56.50%**，one source demo 是 **2.50%**。
- \\(\pi_0\\): DeformGen 是 **56.67%**，one source demo 是 **2.33%**。

Diffusion Policy 是例外，DeformGen* 的平均值略高于完整 DeformGen，但整体趋势仍然支持 topological augmentation 的价值。Rope routing 的数字最强，DeformGen 在 ACT 上达到 **90.50%**，SmolVLA 上 **92.00%**，\\(\pi_0\\) 上 **99.00%**。

State coverage analysis 也支持机制解释。Rigid augmentation 在 source state 附近聚集，non-rigid residual 接近零。DeformGen 在 unified state PCA 中覆盖更广，并且 Procrustes alignment 后有较大的 non-rigid residual。这说明它生成的内容从更多刚体 pose，转向真正的 deformable shape variation。

Synthetic data scaling study 也值得注意。ACT 的平均成功率从 100 条 synthetic trajectories 时的 **19.50%** 提升到 750 条时的 **61.50%**。SmolVLA 从 **36.83%** 提升到 **63.17%**。这说明生成数据在规模增加时仍然有价值，不只是小规模 regularization。

## 局限

这篇论文是 simulation-only。Real2Sim-Eval 和 PhysTwin 提供高保真 dynamics 与 rendering，但作者没有展示真实机器人部署。Sim-to-real transfer 可能还需要额外处理材料属性、接触动力学和视觉外观差异。

任务也限制在 single-arm xArm7 manipulation。Rope、stuffed toy、cloth 覆盖了 1D、准刚性 3D 和 2D sheet-like deformables，但还没有覆盖 bimanual folding、cluttered cable routing、dough 或 clay shaping、surgical tissue manipulation 等类别。

Trajectory synthesis 也不是保证成功。有效 trajectory 生成成功率差异明显：rope 是 **99.5%**，toy 是 **60.3%**，cloth 是 **39.5%**。大的 topology changes、不稳定接触和机器人运动学约束都会让 warped trajectories 失败。论文通过 filtering 和 failure-state generalization 实验部分缓解这个问题，但生成过程还不是 universally reliable。

## Takeaways

DeformGen 的主要贡献是给 deformable manipulation 提出一个清晰的数据增强原则：**用 dynamics 生成新状态，再用 deformation field 转移轨迹**。这比把刚体物体的 SE(3) augmentation 直接搬到 \\(\mathbb{R}^{3N}\\) 状态空间里更合理。

对 robot learning 来说，实践信息很直接。如果任务涉及可变形物体，只收集一条 demonstration 然后做刚体移动，主要只能制造 spatial variety。要产生真正有用的训练多样性，augmentation 必须改变物体 topology，同时保持物理合理性；机器人轨迹也必须跟随物体的局部和全局形变一起变化。

</div>
