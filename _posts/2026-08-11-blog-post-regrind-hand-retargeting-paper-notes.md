---
title: "[Paper Notes] REGRIND: A Minimalist Retargeting-Guided RL Recipe for Dexterous Manipulation"
date: 2026-08-11
permalink: /posts/2026/08/regrind-hand-retargeting-paper-notes/
tags:
  - Dexterous Manipulation
  - Hand Retargeting
  - Reinforcement Learning
  - Sim-to-Real
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**REGRIND** asks whether the familiar humanoid-control recipe—retarget a human motion, train an RL policy to track it, then deploy the policy on hardware—also works for contact-rich dexterous manipulation. Its answer is yes, provided that the retargeted reference preserves **hand-object interaction**, the RL policy stays close to that reference through residual control and reference-state initialization, and the simulator is carefully aligned with the real system.

The hand-retargeting component is the center of the pipeline. REGRIND combines 21 semantic hand keypoints with 50 object keypoints into an interaction mesh, then minimizes the change in their Laplacian coordinates. This objective preserves the local spatial arrangement between fingers and object surfaces across the human-to-robot embodiment gap. Joint limits, velocity bounds, and non-penetration constraints keep the reference robot-feasible. The resulting trajectory provides both a human-like nominal action and a high-value exploration distribution for RL.

The full recipe learns from a **single human demonstration**, reaches roughly 99% success on four simulated task-hand settings, and transfers successfully on three of them: LEAP-Scissors 9/10, LEAP-Screwdriver 10/10, and WUJI-Screwdriver 9/10. The unsuccessful WUJI-Scissors case is equally informative: inaccurate object geometry and non-backdrivable hand motors create a dynamics gap that good retargeting alone cannot remove.

## Paper Info

The paper is **“A Minimalist Retargeting-Guided Reinforcement Learning Recipe for Dexterous Manipulation”** by **Yunhai Feng, Natalie Leung, Jiaxuan Wang, Lujie Yang, Haozhi Qi, and Preston Culbertson**, from **Cornell University** and **Amazon FAR**. REGRIND stands for **REtargeting-Guided ReINforcement learning for Dexterous manipulation**.

- Paper: [arXiv:2607.11874](https://arxiv.org/abs/2607.11874)
- Project page, videos, and code: [yunhaifeng.com/REGRIND](https://yunhaifeng.com/REGRIND)

## 1. The Pipeline in One Equation Chain

REGRIND follows a real-to-sim-to-real pipeline:

\[
\text{human hand-object motion}
\rightarrow
\text{interaction-preserving robot reference}
\rightarrow
\text{residual RL tracking in simulation}
\rightarrow
\text{zero-shot hardware deployment}.
\]

The human demonstration contains MANO hand keypoints and the object configuration at every timestep. For a rigid object, the configuration is a 6D pose; an articulated object additionally includes its joint state. The retargeter converts this demonstration into a wrist-and-finger trajectory for the robot. RL then learns the dynamic corrections needed to execute the kinematic reference under gravity, friction, contact, motor lag, and disturbances.

The division of labor is important:

- **Retargeting** specifies the hand-object strategy and contact arrangement.
- **Residual RL** supplies force-producing corrections and robust closed-loop execution.
- **System identification and domain randomization** narrow the simulation-to-reality gap.

REGRIND is minimalist because it avoids task-specific contact rewards and large collections of robot demonstrations. Most of the task structure is already encoded by the retargeted reference.

## 2. Why Ordinary Hand IK Is a Weak Reference

A human hand and a robot hand differ in palm proportions, finger lengths, joint axes, ranges of motion, and available contact surfaces. Matching corresponding fingertips can therefore produce a pose that looks kinematically plausible while placing the robot fingers inside the object, around the wrong handle, or on an unstable side of the tool.

This matters twice in a retargeting-guided RL system. First, the reference is added directly to the policy action, so a poor reference biases every control target. Second, reference state initialization resets the simulator to states along that trajectory. A penetrated or semantically wrong grasp then becomes the policy's exploration distribution. The reference can accelerate learning only when it lies near a useful state-visitation distribution.

REGRIND therefore evaluates retargeting by the structure it preserves between the hand and the object. The target becomes a **robot hand-object interaction** with the same local geometry as the demonstrated human interaction.

## 3. Semantic Hand-Object Correspondence

At timestep \(t\), the demonstration provides human hand keypoints \(P_t^h\) and object keypoints \(P_t^o\). Their union forms the source point set:

\[
\widetilde P_t = P_t^o \cup P_t^h.
\]

Given robot configuration \(q_t\), forward kinematics produces robot keypoints \(P_t^r(q_t)\) that semantically correspond to the MANO hand keypoints. The target point set is:

\[
P_t(q_t) = P_t^o \cup P_t^r(q_t).
\]

The object points appear in both sets. This shared object frame anchors the comparison: the optimizer measures where each robot hand region sits relative to the same task geometry seen in the human demonstration.

The implementation uses **21 hand keypoints** following MANO. It samples **50 object keypoints**. For scissors, sampling is concentrated on the handle region where contact occurs; for the screwdriver, points are sampled over the full surface. The authors manually define corresponding points on the LEAP and WUJI robot models.

This representation expresses task semantics without prescribing contact forces. A human thumb point, for example, is paired with a robot-thumb point, while nearby object samples specify which side and region of the tool that point should approach.

## 4. Interaction Mesh and Laplacian Coordinates

The source and target point sets are converted into interaction meshes through Delaunay tetrahedralization. For a mesh \(M(P)=(P,E)\), the Laplacian coordinate of vertex \(i\) is

\[
L_i(P)
=
p_i-
\frac{1}{|\mathcal N_i|}
\sum_{j\in\mathcal N_i}p_j,
\]

where \(\mathcal N_i\) contains the neighbors of vertex \(i\).

This quantity describes a point relative to the center of its local neighborhood. When that neighborhood contains both hand and object vertices, it encodes local finger-object geometry: which hand region lies near which object region, along with their local relative arrangement. It is translation-invariant and more compatible with embodiment changes than copying absolute human keypoint coordinates.

REGRIND measures deformation between the human and robot interaction meshes by

\[
D\!\left(M(\widetilde P_t),M(P_t(q_t))\right)
=
\sum_i
\left\|
L_i(\widetilde P_t)-L_i(P_t(q_t))
\right\|_2^2.
\]

Minimizing this energy encourages the robot to preserve the demonstrated hand-object spatial and contact relationships. This is the main difference from a hand-only IK objective: object geometry participates directly in the retargeting metric.

## 5. Trajectory Optimization and Feasibility

The robot configuration is \(q_t=(T_t^r,q_t^r)\), containing the floating wrist pose and all actuated finger joints. The complete trajectory is optimized as

\[
\bar q_{0:T-1}
=
\arg\min_{q_{0:T-1}}
\sum_{t=0}^{T-1}
D\!\left(M(\widetilde P_t),M(P_t(q_t))\right)
+
\lambda\sum_{t=1}^{T-1}
\|q_t-q_{t-1}\|_2^2,
\qquad
q_{0:T-1}\in\mathcal Q.
\]

The deformation term preserves interaction. The temporal term suppresses frame-to-frame jitter. The feasible set \(\mathcal Q\) imposes hard constraints:

\[
\mathcal Q=
\left\{
q_t:
q_{\min}\le q_t\le q_{\max},
\quad
v_{\min}\Delta t\le q_t-q_{t-1}\le v_{\max}\Delta t,
\quad
\phi_j(q_t)\ge 0
\right\}.
\]

These constraints enforce joint limits, per-frame velocity limits, and non-penetration for robot-object and robot-environment collision pairs. The demonstration object pose stays fixed during optimization. In practice, the authors solve the trajectory sequentially: each frame is warm-started from the previous solution, then refined with a small number of SQP iterations using Drake and MOSEK.

The output remains a kinematic trajectory: smooth, collision-free, and equipped with useful contact geometry. RL supplies dynamic feasibility during execution.

## 6. How the Retargeted Motion Guides RL

The retargeted trajectory is used in three coupled ways.

### 6.1 Residual Action Prior

The policy predicts a scaled correction on top of the reference:

\[
q_t^{\text{target}}
=
\bar q_t
+
\alpha\odot
\pi_\theta(\bar q_t,o_t).
\]

The target is sent to a low-level PD controller. Initializing the actor's final layer around zero makes training begin close to the retargeted motion. RL can then adjust finger and wrist targets to produce the forces and timing left outside the kinematic optimizer.

### 6.2 Reference State Initialization

At reset, REGRIND samples a random phase along the retargeted trajectory and initializes both robot and object near the corresponding reference state. This places exploration around states that already express a plausible manipulation strategy. Episodes terminate when the object keypoint error exceeds 15 cm, since a small residual policy is unlikely to recover after a large departure from the reference.

### 6.3 Dense Object-Centric Reward

The main tracking error is the mean distance between current and reference object keypoints:

\[
\epsilon_{\text{object}}
=
\frac{1}{N_k}
\sum_{i=1}^{N_k}
\left\|
p_{t,i}^o-\bar p_{t,i}^o
\right\|_2,
\]

with shaped reward

\[
r_{\text{object}}
=
\exp\!\left(-\epsilon_{\text{object}}/\sigma\right).
\]

Object keypoints provide one metric for rigid and articulated objects. The remaining reward terms track object linear and angular velocity and wrist pose, while regularizing action magnitude and action rate. The policy receives no explicit contact schedule or contact reward; the interaction prior is carried by the retargeted reference.

## 7. Observation and Training Design for Sim-to-Real

REGRIND uses asymmetric actor-critic observations. The actor receives the object pose and articulated joint state, current and previous robot joint positions, the previous action, and a normalized phase variable. The critic additionally observes robot fingertip positions and joint velocities.

The actor deliberately avoids measured velocity. Joint and object velocities are often noisy or delayed on hardware, so excluding them reduces observation mismatch. Object states come from a nine-camera motion-capture system during deployment, which lets the study isolate dynamics transfer from perception error.

Training uses PPO with 4,096 parallel Isaac Sim environments. Simulation runs at 120 Hz, while the policy acts at 30 Hz. Domain randomization covers object center of mass, geometry, mass, hand/table/object friction, PD gains, default joint offsets, observation noise, and 0–2 control steps of latency. A curriculum increases gravity from zero to full gravity and later introduces random pushes.

The gravity curriculum is especially relevant for pickup tasks. Early training can learn the motion structure before full gravitational forces destabilize contact; later stages require the learned residuals to maintain the grasp under realistic loading.

## 8. Dynamic Augmentation from One Demonstration

A single demonstration covers only one initial object pose. REGRIND perturbs the initial object position by up to \(\pm5\) cm and yaw by up to \(\pm30^\circ\). It then applies a time-varying rigid transform to the object pose and hand root pose:

\[
p^\star(t)=p_t^{\text{ref}}+w(t)\Delta p,
\qquad
R^\star(t)=R_z\!\left(w(t)\Delta\psi\right)R_t^{\text{ref}}.
\]

The weight \(w(t)\) stays at one before pickup, linearly decays between pickup and tool use, and becomes zero afterward. The augmented reference therefore starts from a perturbed object configuration and smoothly rejoins the original task goal.

The same rigid transform is applied to the hand wrist and fingertip positions; finger joint references stay unchanged. REGRIND generates each sample without rerunning retargeting. Because hand and object are transformed together, their relative spatial and contact relationships remain intact, and the trainer can generate effectively unlimited reference variants online.

## 9. Experiments: Does Interaction Preservation Matter?

The evaluation covers two tasks and two hands:

- **Scissors:** pick up the scissors, hold them at the target orientation, and complete an opening and closing sweep of at least \(20^\circ\) each.
- **Screwdriver:** keep the screwdriver upright and rotate it by at least one full turn.
- **LEAP:** 16 finger DoFs, using enlarged 3D-printed tools due to hand size.
- **WUJI:** 20 finger DoFs, using real tools.

The baselines are SPIDER, DexMachina, and Mink IK followed by the same RL training setup.

### Simulation Results

| Method | LEAP-Scissors | LEAP-Screwdriver | WUJI-Scissors | WUJI-Screwdriver |
|---|---:|---:|---:|---:|
| **REGRIND** | **99.8%** | **99.7%** | **98.7%** | **98.8%** |
| SPIDER | 0.0% | 0.0% | 0.0% | 0.0% |
| DexMachina | 22.3% | 99.7% | 0.0% | 99.3% |
| Mink IK + RL | 2.0% | 0.0% | 0.0% | 3.1% |

REGRIND also keeps object-keypoint tracking error between 5.3 and 6.5 mm across the four settings. DexMachina succeeds on the screwdriver tasks, where the grasp structure is simpler, but breaks down on scissors. Qualitative retargeting reveals why: IK-based solutions contain severe hand-object penetration, and collision projection can move fingers in a direction that destroys the intended grasp.

The comparison supports a specific conclusion. A reference must carry useful interaction geometry before residual RL can exploit it. Physics plausibility, hand-pose similarity, and collision cleanup can still yield a weak exploration prior.

### Real-World Results

| Method | LEAP-Scissors | LEAP-Screwdriver | WUJI-Scissors | WUJI-Screwdriver |
|---|---:|---:|---:|---:|
| **REGRIND** | **9/10** | **10/10** | **0/10** | **9/10** |
| DexMachina | 0/10 | 2/10 | — | 5/10 |
| Mink IK + RL | — | — | — | 0/10 |

DexMachina's screwdriver policies perform well in simulation yet transfer poorly. The authors hypothesize that weaker interaction regularization leaves more room for policies to exploit simulator artifacts, creating aggressive motion, unstable grasps, table collisions, and overshoot on hardware.

For randomized initial poses, REGRIND obtains 8/10 on LEAP-Scissors, 10/10 on LEAP-Screwdriver, and 9/10 on WUJI-Screwdriver. These results are close to the nominal-start results and validate the simple trajectory-warping augmentation.

## 10. What the Failed WUJI-Scissors Task Teaches

WUJI-Scissors achieves 98.7% success in simulation and 0/10 in reality. The paper attributes the gap mainly to two factors: the WUJI hand uses non-backdrivable motors, and the real scissors mesh is inaccurate. Both factors directly affect contact-rich behavior. Motor backdrivability changes compliance under impact and sustained force; mesh error shifts when and where contact occurs.

The system-identification procedure also finds a real-robot response delay of roughly 1–2 policy steps, or 30–60 ms. REGRIND models this delay during training. The broader lesson is that the closer a task operates to contact and friction limits, the more exact its simulation needs to be. Interaction-preserving retargeting gives the policy the right strategy, while system identification determines whether that strategy survives hardware contact.

## 11. Strengths and Limitations

**Strengths.** REGRIND is unusually clear about the complete chain from human data to real robot behavior. The interaction-mesh objective gives the reference an interpretable role. Residual actions, reference-state initialization, and object-centric rewards all reuse the same trajectory, making the design coherent. The real-robot ablations also expose simulation-only success as insufficient evidence for dexterous manipulation.

**Limitations.** The current system depends on motion capture for object state during deployment, so perception is outside the evaluation. The retargeter uses manually defined semantic keypoint correspondences and task-dependent object sampling; scaling to arbitrary hands and objects will require automated correspondence and contact-region discovery. The kinematic objective omits forces, friction cones, and compliance. Real-world transfer still requires careful per-platform system identification, and one of four task-hand combinations fails completely on hardware.

The study also uses one demonstrated trajectory per task. Dynamic augmentation broadens the initial pose distribution while staying within the same contact strategy and tool-use mode; recovery behaviors far from the reference remain uncovered.

## 12. My Takeaway

REGRIND's strongest insight is that retargeting quality shapes the entire RL problem. A reference trajectory is simultaneously a nominal action, an exploration distribution, and an implicit contact prior. Errors in that trajectory therefore enter the learner three times.

For hand retargeting, the useful target is the local relationship among robot fingers and object surfaces. The interaction mesh and Laplacian objective provide a compact geometric representation of that relationship. Hard feasibility constraints keep it usable as a simulator reset state. Residual RL then concentrates on dynamics and robustness.

If TopoRetarget is read primarily as a retargeting-method paper, REGRIND is best read as a system recipe and an empirical study of what happens after retargeting. It shows that a strong interaction-aware reference can make single-demonstration dexterous RL work, while the final gap to hardware is governed by contact-sensitive system identification.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**REGRIND** 研究了一个直接的问题：humanoid control 中常用的“先 retarget human motion，再用 RL tracking，最后部署到硬件”的路线，能否用于 contact-rich dexterous manipulation。论文给出的答案是可以，但有三个前提：retargeted reference 必须保留 **hand-object interaction**；RL policy 需要通过 residual control 和 reference state initialization 始终围绕该 reference 学习；simulation 还要经过细致的 system identification 才能接近真实系统。

整条流水线的中心是 hand retargeting。REGRIND 把 21 个 semantic hand keypoints 和 50 个 object keypoints 组成 interaction mesh，然后最小化两组 mesh 的 Laplacian coordinates 变化。这个目标让机器人在跨越 human-to-robot embodiment gap 时，仍然保留手指与物体表面之间的局部空间和接触关系。Joint limits、velocity bounds 和 non-penetration constraints 进一步保证 reference 对机器人可用。最终轨迹既提供 human-like nominal action，也为 RL 提供高价值的 exploration distribution。

整套方法只使用 **一条 human demonstration**。四个仿真 task-hand setting 的成功率都接近 99%，其中三个成功迁移到真实机器人：LEAP-Scissors 为 9/10，LEAP-Screwdriver 为 10/10，WUJI-Screwdriver 为 9/10。WUJI-Scissors 的 0/10 同样很有价值：不准确的物体 mesh 和 non-backdrivable motors 带来的 dynamics gap，无法只靠高质量 retargeting 消除。

## 论文信息

论文标题是 **“A Minimalist Retargeting-Guided Reinforcement Learning Recipe for Dexterous Manipulation”**，作者为 **Yunhai Feng、Natalie Leung、Jiaxuan Wang、Lujie Yang、Haozhi Qi 和 Preston Culbertson**，来自 **Cornell University** 和 **Amazon FAR**。REGRIND 是 **REtargeting-Guided ReINforcement learning for Dexterous manipulation** 的缩写。

- 论文：[arXiv:2607.11874](https://arxiv.org/abs/2607.11874)
- 项目主页、视频和代码：[yunhaifeng.com/REGRIND](https://yunhaifeng.com/REGRIND)

## 1. 一条公式串起完整流水线

REGRIND 采用 real-to-sim-to-real pipeline：

\[
\text{human hand-object motion}
\rightarrow
\text{interaction-preserving robot reference}
\rightarrow
\text{simulation 中的 residual RL tracking}
\rightarrow
\text{zero-shot hardware deployment}.
\]

Human demonstration 在每个 timestep 提供 MANO hand keypoints 和 object configuration。对于 rigid object，configuration 是 6D pose；对于 articulated object，还要加上 object joint state。Retargeter 把这段 demonstration 转成机器人的 wrist-and-finger trajectory。随后，RL 学习执行这条 kinematic reference 所需的动态修正，以应对 gravity、friction、contact、motor lag 和外部扰动。

三部分的职责划分很清楚：

- **Retargeting** 确定 hand-object strategy 和接触布局。
- **Residual RL** 负责产生力所需的修正和 closed-loop robust execution。
- **System identification 与 domain randomization** 用于缩小 simulation-to-reality gap。

REGRIND 的 “minimalist” 体现在它不需要 task-specific contact rewards，也不依赖大量 robot demonstrations。任务的大部分结构已经编码在 retargeted reference 中。

## 2. 为什么普通 Hand IK 不是好的 Reference

人手和机器人手在 palm proportion、finger length、joint axis、range of motion 和 available contact surface 上都不同。只匹配对应 fingertip 可能得到一个运动学上看似合理的姿态，但机器人手指可能已经穿进物体、绕错 handle，或者落在工具上不稳定的一侧。

这个问题会在 retargeting-guided RL 中出现两次。第一，reference 会直接加到 policy action 上，因此不好的 reference 会持续偏置每一个 control target。第二，reference state initialization 会把 simulator reset 到轨迹上的状态。带有 penetration 或 grasp semantic 错误的状态因此会直接变成 policy 的 exploration distribution。Reference 只有接近高价值 state-visitation distribution 时，才能真正加速学习。

因此，REGRIND 根据 hand 和 object 之间保留下来的结构来评价 retargeting。最终目标是得到一个与 human demonstration 具有相同局部几何关系的 **robot hand-object interaction**。

## 3. Semantic Hand-Object Correspondence

在 timestep \(t\)，demonstration 提供 human hand keypoints \(P_t^h\) 和 object keypoints \(P_t^o\)。两者的并集构成 source point set：

\[
\widetilde P_t = P_t^o \cup P_t^h.
\]

给定 robot configuration \(q_t\)，forward kinematics 产生与 MANO hand keypoints 语义对应的 robot keypoints \(P_t^r(q_t)\)。Target point set 写为：

\[
P_t(q_t) = P_t^o \cup P_t^r(q_t).
\]

Object points 同时出现在两组点集中。这个共享的 object frame 固定了比较基准：optimizer 关注每个 robot hand region 相对于 human demonstration 中同一组 task geometry 的位置关系。

实现中使用了遵循 MANO 定义的 **21 个 hand keypoints**，并采样 **50 个 object keypoints**。对于 scissors，采样集中在手指发生接触的 handle region；对于 screwdriver，采样覆盖整个物体表面。作者在 LEAP 和 WUJI 的机器人模型上手工定义了对应点。

这种表示能够在不规定 contact force 的情况下表达 task semantics。例如，human thumb point 与 robot-thumb point 对应，附近的 object samples 则表达它应该接近工具的哪一侧和哪个区域。

## 4. Interaction Mesh 与 Laplacian Coordinates

Source 和 target point sets 通过 Delaunay tetrahedralization 转换为 interaction meshes。对于 mesh \(M(P)=(P,E)\)，vertex \(i\) 的 Laplacian coordinate 定义为：

\[
L_i(P)
=
p_i-
\frac{1}{|\mathcal N_i|}
\sum_{j\in\mathcal N_i}p_j,
\]

其中 \(\mathcal N_i\) 是 vertex \(i\) 的邻居集合。

这个量描述当前点相对于局部邻域中心的位置。当邻域中同时存在 hand vertices 和 object vertices 时，它就编码了局部 finger-object geometry：哪个手部区域靠近哪个物体区域，以及它们的局部相对布局。Laplacian coordinate 对全局平移不敏感，也比直接复制 human keypoint 的绝对坐标更适合 embodiment change。

REGRIND 用下面的量度计算 human 与 robot interaction meshes 之间的 deformation：

\[
D\!\left(M(\widetilde P_t),M(P_t(q_t))\right)
=
\sum_i
\left\|
L_i(\widetilde P_t)-L_i(P_t(q_t))
\right\|_2^2.
\]

最小化该能量会鼓励机器人保留 demonstration 中的 hand-object spatial and contact relationships。它与 hand-only IK objective 的关键区别在于：object geometry 直接参与 retargeting metric。

## 5. Trajectory Optimization 与可行性约束

Robot configuration 写为 \(q_t=(T_t^r,q_t^r)\)，包含 floating wrist pose 和全部 actuated finger joints。完整 trajectory 的优化问题为：

\[
\bar q_{0:T-1}
=
\arg\min_{q_{0:T-1}}
\sum_{t=0}^{T-1}
D\!\left(M(\widetilde P_t),M(P_t(q_t))\right)
+
\lambda\sum_{t=1}^{T-1}
\|q_t-q_{t-1}\|_2^2,
\qquad
q_{0:T-1}\in\mathcal Q.
\]

Deformation term 用于保留 interaction，temporal term 用于抑制 frame-to-frame jitter。Feasible set \(\mathcal Q\) 施加 hard constraints：

\[
\mathcal Q=
\left\{
q_t:
q_{\min}\le q_t\le q_{\max},
\quad
v_{\min}\Delta t\le q_t-q_{t-1}\le v_{\max}\Delta t,
\quad
\phi_j(q_t)\ge 0
\right\}.
\]

这些 constraints 分别对应 joint limits、per-frame velocity limits，以及 robot-object 和 robot-environment collision pairs 的 non-penetration。Demonstration 中的 object pose 在优化时保持固定。实际求解采用 sequential scheme：每一帧都由上一帧解进行 warm start，再通过 Drake 与 MOSEK 执行少量 SQP iterations。

这个 formulation 本身不保证 trajectory 动力学可行。它生成的是一条 smooth、collision-free，并且具有有效 contact geometry 的 kinematic reference。缺失的 dynamics 由 RL 处理。

## 6. Retargeted Motion 如何引导 RL

Retargeted trajectory 在三个互相耦合的位置发挥作用。

### 6.1 Residual Action Prior

Policy 在 reference 上预测一个经过缩放的 correction：

\[
q_t^{\text{target}}
=
\bar q_t
+
\alpha\odot
\pi_\theta(\bar q_t,o_t).
\]

得到的 target 发送给 low-level PD controller。Actor 最后一层被初始化为接近零输出，使训练从 retargeted motion 附近开始。RL 随后调整 finger 和 wrist targets，产生 kinematic optimizer 未建模的接触力和时间修正。

### 6.2 Reference State Initialization

在 reset 时，REGRIND 从 retargeted trajectory 中随机采样 phase，并把 robot 和 object 初始化到对应 reference state 附近。这样，exploration 会围绕已经包含合理 manipulation strategy 的状态展开。当 object keypoint error 超过 15 cm 时 episode 会提前终止，因为幅度较小的 residual policy 很难从大幅偏离 reference 的状态恢复。

### 6.3 Dense Object-Centric Reward

主要 tracking error 是当前 object keypoints 和 reference object keypoints 之间的平均距离：

\[
\epsilon_{\text{object}}
=
\frac{1}{N_k}
\sum_{i=1}^{N_k}
\left\|
p_{t,i}^o-\bar p_{t,i}^o
\right\|_2,
\]

对应的 shaped reward 为：

\[
r_{\text{object}}
=
\exp\!\left(-\epsilon_{\text{object}}/\sigma\right).
\]

Object keypoints 为 rigid 和 articulated objects 提供了统一 metric。其余 reward terms 用于 tracking object linear/angular velocity 和 wrist pose，同时约束 action magnitude 与 action rate。Policy 不需要显式 contact schedule 或 contact reward；interaction prior 已由 retargeted reference 携带。

## 7. 面向 Sim-to-Real 的 Observation 与训练设计

REGRIND 使用 asymmetric actor-critic observations。Actor 输入包括 object pose、articulated joint state、当前和上一时刻的 robot joint positions、previous action，以及 normalized phase variable。Critic 还会看到 robot fingertip positions 和 joint velocities。

Actor 有意避开 measured velocity。真实硬件上的 joint/object velocities 往往噪声较大或存在延迟，因此移除它们可以减少 observation mismatch。部署时，object state 来自九相机 motion-capture system，使实验能够把 dynamics transfer 与 perception error 分开研究。

训练采用 PPO 和 4,096 个并行 Isaac Sim environments。Simulation 频率为 120 Hz，policy 频率为 30 Hz。Domain randomization 覆盖 object center of mass、geometry、mass、hand/table/object friction、PD gains、default joint offsets、observation noise，以及 0–2 个 control steps 的 latency。Curriculum 从零逐渐增加到 full gravity，之后再加入 random pushes。

Gravity curriculum 对 pickup task 尤其有意义。训练早期先学习 motion structure，避免完整重力过早破坏接触；后期则要求 residual corrections 在真实载荷下保持 grasp。

## 8. 从一条 Demonstration 动态扩增

单条 demonstration 只覆盖一个 initial object pose。REGRIND 对初始物体位置加入最多 \(\pm5\) cm 的扰动，对 yaw 加入最多 \(\pm30^\circ\) 的扰动，然后给 object pose 和 hand root pose 施加 time-varying rigid transform：

\[
p^\star(t)=p_t^{\text{ref}}+w(t)\Delta p,
\qquad
R^\star(t)=R_z\!\left(w(t)\Delta\psi\right)R_t^{\text{ref}}.
\]

在 pickup 前，\(w(t)\) 保持为 1；从 pickup 到 tool use 之间线性下降；之后变成 0。因此，augmented reference 从扰动后的 object configuration 开始，并平滑回到原始 task goal。

同一个 rigid transform 会用于 hand wrist 和 fingertip positions，finger joint references 保持不变。REGRIND 无需为每个 sample 重新运行 retargeting。Hand 和 object 被共同变换，它们之间的 relative spatial and contact relationships 得以保留，训练阶段也可以在线生成近乎无限的 reference variants。

## 9. 实验：Interaction Preservation 是否真的重要

实验覆盖两个任务和两种机器人手：

- **Scissors：**拿起剪刀，在目标朝向下完成一次打开和闭合，每个方向至少运动 \(20^\circ\)。
- **Screwdriver：**保持螺丝刀竖直，并旋转至少一整圈。
- **LEAP：**16 个 finger DoFs；由于手尺寸较大，使用放大的 3D-printed tools。
- **WUJI：**20 个 finger DoFs；使用真实尺寸工具。

Baseline 包括 SPIDER、DexMachina，以及 Mink IK 加上相同的 RL training setup。

### 仿真结果

| Method | LEAP-Scissors | LEAP-Screwdriver | WUJI-Scissors | WUJI-Screwdriver |
|---|---:|---:|---:|---:|
| **REGRIND** | **99.8%** | **99.7%** | **98.7%** | **98.8%** |
| SPIDER | 0.0% | 0.0% | 0.0% | 0.0% |
| DexMachina | 22.3% | 99.7% | 0.0% | 99.3% |
| Mink IK + RL | 2.0% | 0.0% | 0.0% | 3.1% |

REGRIND 在四个 setting 上的 object-keypoint tracking error 都处于 5.3–6.5 mm。DexMachina 在 grasp structure 相对简单的 screwdriver task 上表现很好，但在 scissors 上失败。Qualitative retargeting 展示了原因：IK-based solution 中存在严重 hand-object penetration；collision projection 又可能把手指推向破坏 grasp semantic 的方向。

这些对比支持一个具体结论：reference 必须先包含有效的 interaction geometry，residual RL 才能真正利用它。单独追求 physics plausibility、hand-pose similarity 或 collision cleanup，并不能保证得到好的 exploration prior。

### 真实机器人结果

| Method | LEAP-Scissors | LEAP-Screwdriver | WUJI-Scissors | WUJI-Screwdriver |
|---|---:|---:|---:|---:|
| **REGRIND** | **9/10** | **10/10** | **0/10** | **9/10** |
| DexMachina | 0/10 | 2/10 | — | 5/10 |
| Mink IK + RL | — | — | — | 0/10 |

DexMachina 的 screwdriver policies 在 simulation 中表现很好，却无法稳定迁移。作者的解释是，较弱的 interaction regularization 给 policy 留下了更多利用 simulator artifact 的空间，最终在硬件上表现为 aggressive motion、unstable grasp、table collision 和 overshoot。

在 randomized initial poses 下，REGRIND 在 LEAP-Scissors、LEAP-Screwdriver 和 WUJI-Screwdriver 上分别得到 8/10、10/10 和 9/10。它们与 nominal-start results 接近，验证了简单 trajectory-warping augmentation 的有效性。

## 10. 失败的 WUJI-Scissors 告诉了我们什么

WUJI-Scissors 在 simulation 中达到 98.7%，真实环境却是 0/10。论文主要把 gap 归因于两个因素：WUJI hand 使用 non-backdrivable motors，真实剪刀的 mesh 也不够准确。两个因素都会直接影响 contact-rich behavior。Motor backdrivability 决定系统在冲击和持续受力下的 compliance；mesh error 则会改变接触发生的时间和位置。

System identification 还发现，真实机器人响应大约延迟 1–2 个 policy steps，即 30–60 ms。REGRIND 在训练时显式建模了这种 delay。更普遍的结论是：任务越接近 contact 和 friction limit，对 simulation accuracy 的要求越高。Interaction-preserving retargeting 给 policy 提供正确 strategy，system identification 决定该 strategy 能否在硬件接触中成立。

## 11. 优势与局限

**优势。** REGRIND 对从 human data 到真实机器人行为的完整链路解释得很清楚。Interaction-mesh objective 让 reference 的作用可解释。Residual actions、reference-state initialization 和 object-centric rewards 都围绕同一条 trajectory 设计，因此系统结构非常一致。Real-robot ablations 也明确说明，simulation-only success 还不足以证明 dexterous manipulation 的有效性。

**局限。** 当前系统在部署时依赖 motion capture 获得 object state，perception 没有进入评估。Retargeter 使用手工定义的 semantic keypoint correspondences 和 task-dependent object sampling；如果要扩展到任意手和任意物体，还需要自动化 correspondence 与 contact-region discovery。Kinematic objective 没有编码 force、friction cone 或 compliance。Real-world transfer 仍然依赖针对具体硬件的 system identification，而且四个 task-hand combinations 中有一个在真实环境完全失败。

每个任务的训练也只使用一条 demonstrated trajectory。Dynamic augmentation 能扩展 initial pose distribution，却无法产生新的 contact strategy、tool-use mode，以及远离 reference 的 recovery behavior。

## 12. 我的理解

REGRIND 最重要的 insight 是：retargeting quality 会改变整个 RL problem。一条 reference trajectory 同时扮演 nominal action、exploration distribution 和 implicit contact prior 三个角色，因此 reference 中的误差会通过三条路径进入 learner。

对于 hand retargeting，真正有用的目标是 robot fingers 与 object surfaces 之间的局部关系。Interaction mesh 和 Laplacian objective 为这种关系提供了紧凑的 geometric representation。Hard feasibility constraints 保证生成结果可以作为 simulator reset state，residual RL 再集中处理 dynamics 和 robustness。

如果把 TopoRetarget 主要理解为 retargeting method paper，那么 REGRIND 更适合作为一套 system recipe 和一项 “retargeting 之后会发生什么” 的实证研究。它说明 strong interaction-aware reference 足以让 single-demonstration dexterous RL 工作，而从 simulation 到 hardware 的最后一段距离，主要由 contact-sensitive system identification 决定。

</div>
