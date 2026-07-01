---
title: "[Paper Notes] WARP: Whole-Body Retargeting for Learning from Offline Human Demonstrations"
date: 2026-07-02
permalink: /posts/2026/07/warp-retargeting-paper-notes/
tags:
  - Robot Learning
  - Motion Retargeting
  - Whole-Body Manipulation
  - Imitation Learning
  - Humanoid Robots
---

<div data-lang="en" markdown="1">

**WARP** is best understood as an analytic retargeting system that makes offline human motion usable as robot supervision. The retargeting part is not a learned neural model and is not a generic weighted IK optimizer. It is a geometry-first pipeline built around a closed-form Shoulder-Elbow-Wrist solver. Learning enters after retargeting: WARP-generated robot trajectories are used to train a behavior-cloning policy.

My read: the important contribution is the separation of two problems that often get mixed together. First, convert human whole-body motion into precise, consistent, robot-feasible actions. Second, train a policy on those actions. WARP argues that if the first step is noisy, multi-modal, or seed-dependent, then behavior cloning inherits that ambiguity as supervision error.

## Paper Info

The paper is **"WARP: Whole-Body Retargeting for Learning from Offline Human Demonstrations"** by **Zhenyang Chen, Chuizheng Kong, Chuye Zhang, Yuanshao Yang, Lawrence Y. Zhu, Shreyas Kousik, and Danfei Xu** from **Georgia Institute of Technology**. It is available as [arXiv:2606.29940](https://arxiv.org/abs/2606.29940), with project page [warp-retarget.github.io](https://warp-retarget.github.io/).

WARP stands for **Whole-body-Aware Retargeting from human Pose**.

## The Problem

Human demonstrations are attractive because they can be collected without robot hardware in the loop. A person can move naturally, use their torso, route their elbows around obstacles, shift their body to extend reach, and demonstrate contact-rich whole-body behavior. The hard part is that a human demonstration is not directly a robot demonstration.

Offline retargeting is stricter than online teleoperation. During teleoperation, a human operator can watch the robot and compensate when the wrist drifts, contact fails, or the IK solver chooses an awkward branch. Offline data has no such correction. The retargeted trajectory itself becomes the target action sequence for policy learning.

The paper frames two failure modes:

- **Imprecision:** a retargeter may trade off end-effector accuracy against torso or elbow similarity, turning geometric error into action-label error.
- **Inconsistency:** redundant humanoid kinematics can map similar human poses to different robot configurations depending on solver initialization, creating multi-modal labels for behavior cloning.

WARP's goal is therefore precise and consistent retargeting. The robot should match the task-critical palm pose while preserving the demonstrator's whole-body structural intent.

## Is WARP Optimization-Based Or Learning-Based?

The clean answer is:

**WARP retargeting is analytic / geometric. The downstream policy is learning-based.**

The retargeter constructs a target robot skeleton and solves closed-form geometric subproblems. It avoids the usual weighted multi-task IK formulation:

\[
\dot q^\ast =
\arg\min_{\dot q}
\sum_i w_i\lVert J_i\dot q-\dot x_i^\ast\rVert^2
+w_{\mathrm{posture}}\lVert \dot q-\dot q_{\mathrm{posture}}\rVert^2.
\]

That optimization-based baseline, represented by MINK variants in the paper, makes palm tracking, torso orientation, elbow swivel, and posture regularization compete through task weights. WARP instead makes palm matching a hard geometric constraint and resolves the remaining arm configuration through SEW geometry.

Learning appears later. After retargeting, the generated robot trajectory provides proprioceptive states and action supervision for behavior cloning:

\[
q_t^r = \mathrm{Ret}(H(t)).
\]

The policy maps observations and recent robot state history to future action chunks. So WARP is not an end-to-end learned retargeting map; it is an analytic data-conversion pipeline paired with a learned controller.

## Core Representation: SEW

The core mechanism is the **Shoulder-Elbow-Wrist (SEW)** representation. For each arm, WARP represents the human skeleton as:

\[
H=(s,e,w,\mathbf{H},t),
\]

where \(s,e,w,t\in\mathbb{R}^3\) are shoulder, elbow, wrist, and palm/tool positions, and \(\mathbf{H}\in SO(3)\) is the palm orientation. These quantities are expressed in an upper-body-centric frame built from the shoulder line and an anchor point.

The representation separates arm shape from embodiment scale. Human limb configuration is captured by scale-invariant directions:

\[
u=\mathrm{unit}(e-s), \qquad l=\mathrm{unit}(w-e).
\]

For humanoid arms with a spherical shoulder, pin-joint elbow, and spherical wrist, SEW admits a closed-form IK solution with at most one valid joint configuration. This is the key to consistency: similar human poses should map to a single robot action, not a family of seed-dependent IK branches.

Vanilla SEW-Mimic aligns limb directions. WARP changes the target. For offline policy learning, the robot palm must land exactly where the human palm indicates task contact. WARP therefore uses SEW as the deterministic IK backbone while adding constrained skeleton alignment for exact palm matching.

## WARP Retargeting Pipeline

WARP solves retargeting in two main stages.

First, **adaptive offset** accounts for link-length differences. If the robot copies the human arm directions \(u^{hm}, l^{hm}\), its predicted palm \(\hat t^{rb}\) may drift from the human palm \(t\). WARP computes a two-arm centroid offset:

\[
p_{\mathrm{offset}}
=
\frac{1}{2}(t_L+t_R)
-
\frac{1}{2}(\hat t_L^{rb}+\hat t_R^{rb}).
\]

This shifts the robot upper-body origin so the left/right palm centroid aligns with the human palm centroid.

Second, **per-arm palm alignment** solves each arm independently. The robot hand orientation transfers from the human hand:

\[
\mathbf{H}^{rb}=\mathbf{H}^{hm}.
\]

The robot wrist is recovered from the desired palm pose and the fixed wrist-to-palm offset \(p_{WT}\). The hard constraint is:

\[
w^{rb}+\mathbf{H}^{rb}p_{WT}
=
(T^{hm\leftarrow rb})^{-1}t.
\]

After shoulder and wrist are fixed, the remaining question is where the robot elbow should lie. WARP transfers the human elbow configuration through the SEW elbow angle \(\psi\), computes the elbow half-plane normal \(\hat n\), and uses a geometric subproblem, SP3, to find the robot elbow:

\[
e^{rb}
=
s^{rb}
+
R(\hat n,\theta_{\mathrm{SEW}})
\ell_{SE}\hat e_{SW}.
\]

The corrected robot skeleton \((s^{rb},e^{rb},w^{rb},\mathbf{H}^{rb})\) is then passed to the SEW solver to recover joint angles in closed form. The paper is explicit that no iterative solver is invoked in this retargeting path. The torso pose is also solved with a closed-form IK-Geo solver.

## Lazy Mobile-Base Control

Whole-body human motion implies a base pose, but directly tracking every small upper-body shift with the mobile base would make the wheels chase jitter and introduce lag. WARP's design is to let the torso absorb fine adjustments while the base moves for real relocation.

It keeps a filtered base target \(q_b=(p_b,\theta_b)\) and compares it with the desired base pose \(q_d=(p_d,\theta_d)\). Small errors inside a deadband are ignored:

\[
\tilde e_{xy}
=
\max(0,\lVert p_d-p_b\rVert-\delta_{xy})\hat e_{xy},
\qquad
\tilde e_\theta
=
\mathrm{sign}(e_\theta)\max(0,\lvert e_\theta\rvert-\delta_\theta).
\]

Then a damped second-order filter updates the base:

\[
\ddot p_b=\omega_n^2\tilde e_{xy}-2\zeta\omega_n\dot p_b,
\qquad
\ddot\theta_b=\omega_n^2\tilde e_\theta-2\zeta\omega_n\dot\theta_b.
\]

This is a small systems detail with a large effect: smooth base motion makes open-loop replay and downstream policy learning less brittle.

## Policy Learning After Retargeting

The policy is trained after WARP converts human motion into robot actions. The authors instantiate the policy with HPT, a transformer-based action-chunk model trained with flow matching. The action chunk is decomposed into base, torso, arm, and hand components:

\[
a_{1:H}=[a_b,a_\tau,a_r,a_h]_{1:H}.
\]

The model uses a proximal-to-distal hierarchy:

\[
b \preceq \tau \preceq r \preceq h.
\]

A block-causal attention mask lets proximal body blocks inform distal blocks, while temporal tokens over the action horizon remain jointly visible. The final policy is lightweight, with about **11M trainable parameters**. This policy detail matters because WARP's retargeting is designed to produce unimodal, consistent action labels that a standard behavior-cloning model can learn.

## Experiments

The experiments test three claims: WARP improves retargeting quality, WARP-generated data improves downstream policy learning, and whole-body retargeting is necessary for tasks where torso, elbow, or base configuration matters.

For retargeting quality, the authors sample **514 manipulation demonstrations** from BONES-SEED-SOMA and compare WARP with SEW-Mimic and MINK variants. MINK-EF tracks end-effectors only. MINK-TE adds soft torso and elbow objectives. WARP achieves very low palm error without joint-limit constraints: **0.0046 mm** mean palm position error and **0.046 mm** P95 error, compared with **0.701 mm / 1.853 mm** for MINK-EF and **18.557 mm / 73.980 mm** for MINK-TE. It also has lower joint-limit and self-collision fractions than the MINK variants. The paper reports roughly **30x** faster solving than iterative optimization-based retargeters: converting SEED takes about one CPU hour for WARP versus a full day for the baseline.

For simulation policy learning, the authors use DexMimicGen demonstrations on three bimanual tasks: can sort, pouring, and coffee. WARP and MINK have similar replay success, about **80.0%** versus **79.5%** on average. The policy gap is larger: policies trained on WARP data reach **71%** average success, compared with **59%** for MINK. On the coffee task, WARP policy success is **34%**, while MINK is **8%**. This is the paper's most important empirical point: replay success can hide retargeting defects that later hurt learning.

For real-world evaluation, the robot platform is RB-Y1 with a holonomic base, 6-DoF torso, two 7-DoF arms, and 12-DoF XHands. Human data is collected with a Meta Quest headset. The tasks are rotate box, push cart, pick up laundry, and fridge-door closing with the elbow. Across tasks, WARP outperforms the end-effector-centric MINK baseline. In rotate-box policy rollout, WARP reaches **65%** success versus **40%** for MINK. In the elbow-mode fridge task, WARP succeeds in **90%** replay trials, showing why end-effector-only retargeting is too narrow for whole-body manipulation.

## Why The Baselines Fail

The appendix is useful because it explains the failure mechanism in addition to reporting metrics. MINK-style retargeting optimizes in joint space with weighted soft objectives. This creates three issues:

- Seed-dependent null-space choices create inconsistent action labels.
- Increasing posture weights can degrade palm tracking, while decreasing them can create unsafe whole-body configurations.
- Absolute keypoint or skeleton mapping suffers from embodiment mismatch between human and robot link lengths.

WARP removes these tradeoffs structurally. It returns one solution per non-degenerate pose, enforces palm matching as a hard constraint, and compares human and robot arms through scale-aware SEW geometry.

## Limitations

The main limitation is that WARP is still primarily kinematic. It generates reference joint trajectories that satisfy geometric constraints, but it does not explicitly model controller error, actuator bandwidth, latency, contact dynamics, or disturbances from object interaction. A trajectory can be geometrically valid and still fail if the robot cannot track it under contact.

The policy and perception setup are also simplified. The real-world experiments use low-dimensional object-state inputs from AprilTag tracking, with Vicon localization for the robot base. This isolates retargeting quality, but it does not solve marker-free visual generalization in cluttered home environments.

Finally, human data quality depends on the capture device. A Quest headset is scalable and accessible, but inside-out tracking can introduce jitter, drift, discontinuities, and inaccurate limb estimates. Since WARP is an offline pipeline, those artifacts can propagate into robot supervision.

## Takeaway

WARP's central message is that retargeting quality is policy-learning quality. If offline human data is converted into imprecise or inconsistent robot actions, a behavior-cloning policy sees ambiguous labels even when replay appears acceptable.

For robot learning, the method is a useful reference point because it refuses to treat whole-body retargeting as just another weighted IK tuning problem. It makes task-critical palm tracking exact, preserves elbow and torso structure through SEW geometry, smooths the base through a lazy controller, and leaves learning to the policy stage after the action labels are made consistent.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**WARP** 最适合理解为一个 analytic retargeting system：它把离线采集的人类动作转成可作为机器人监督信号的轨迹。Retargeting 本身属于几何解析 pipeline，核心是 closed-form Shoulder-Elbow-Wrist solver，区别于神经网络或通用 weighted IK optimizer。Learning 出现在后面：WARP 生成机器人轨迹后，再用这些轨迹训练 behavior-cloning policy。

我的理解是，这篇论文最重要的贡献，是把两个经常混在一起的问题拆开。第一步，把人类 whole-body motion 转成精确、一致、机器人可执行的动作。第二步，用这些动作训练 policy。如果第一步本身有噪声、多解或者依赖初始化，behavior cloning 就会把这些问题当成监督标签学进去。

## 论文信息

论文标题是 **"WARP: Whole-Body Retargeting for Learning from Offline Human Demonstrations"**，作者为 **Zhenyang Chen, Chuizheng Kong, Chuye Zhang, Yuanshao Yang, Lawrence Y. Zhu, Shreyas Kousik, and Danfei Xu**，来自 **Georgia Institute of Technology**。论文链接为 [arXiv:2606.29940](https://arxiv.org/abs/2606.29940)，项目主页为 [warp-retarget.github.io](https://warp-retarget.github.io/)。

WARP 全称是 **Whole-body-Aware Retargeting from human Pose**。

## 问题

人类 demonstration 很有吸引力，因为采集时不需要机器人硬件在环。人可以自然移动，使用 torso，把 elbow 绕过障碍，移动身体来扩展 reach，并演示 contact-rich whole-body behavior。难点在于，人类 demonstration 还需要转换成机器人 demonstration。

Offline retargeting 比 online teleoperation 更苛刻。Teleoperation 中，操作者可以实时看着机器人，当 wrist 漂移、接触失败或者 IK 选择了奇怪分支时，人可以立刻补偿。Offline data 没有这个纠错环节。Retargeted trajectory 本身就变成 policy learning 的目标动作序列。

论文总结了两个失败模式：

- **Imprecision:** retargeter 可能在人手末端精度和 torso / elbow 相似性之间做折中，把几何误差变成动作标签误差。
- **Inconsistency:** humanoid kinematics 冗余度高，相似的人类姿态可能因为 solver initialization 不同而映射到不同机器人配置，给 behavior cloning 造成多模态标签。

WARP 的目标因此是 precise and consistent retargeting。机器人应该匹配任务关键的 palm pose，同时保留演示者的 whole-body structural intent。

## WARP 是优化还是学习？

最干净的回答是：

**WARP retargeting 是 analytic / geometric；下游 policy 是 learning-based。**

Retargeter 先构造目标机器人 skeleton，再求解 closed-form geometric subproblems。它避开了常见的 weighted multi-task IK 形式：

\[
\dot q^\ast =
\arg\min_{\dot q}
\sum_i w_i\lVert J_i\dot q-\dot x_i^\ast\rVert^2
+w_{\mathrm{posture}}\lVert \dot q-\dot q_{\mathrm{posture}}\rVert^2.
\]

这种 optimization-based baseline 在论文中由 MINK variants 代表：palm tracking、torso orientation、elbow swivel 和 posture regularization 通过任务权重相互竞争。WARP 的做法是把 palm matching 设为 hard geometric constraint，再用 SEW geometry 解析地解决剩余的 arm configuration。

Learning 出现在下一阶段。Retargeting 完成后，生成的机器人轨迹提供 proprioceptive states 和 action supervision：

\[
q_t^r = \mathrm{Ret}(H(t)).
\]

Policy 根据 observation 和最近的 robot state history 预测未来 action chunks。因此 WARP 属于 analytic data-conversion pipeline 加 learned controller，区别于 end-to-end learned retargeting map。

## 核心表示：SEW

核心机制是 **Shoulder-Elbow-Wrist (SEW)** 表示。对于每条手臂，WARP 把人类 skeleton 表示为：

\[
H=(s,e,w,\mathbf{H},t),
\]

其中 \(s,e,w,t\in\mathbb{R}^3\) 是 shoulder、elbow、wrist 和 palm/tool positions，\(\mathbf{H}\in SO(3)\) 是 palm orientation。这些量都表达在 upper-body-centric frame 中，这个 frame 由 shoulder line 和 anchor point 构造。

这个表示把 arm shape 和 embodiment scale 分开。人类手臂配置由 scale-invariant limb directions 描述：

\[
u=\mathrm{unit}(e-s), \qquad l=\mathrm{unit}(w-e).
\]

对于包含 spherical shoulder、pin-joint elbow 和 spherical wrist 的 humanoid arm，SEW 可以给出 closed-form IK solution，并且最多只有一个合法 joint configuration。这就是 consistency 的来源：相似的人类姿态应该映射到唯一机器人动作，避免产生依赖 seed 的一组 IK branches。

Vanilla SEW-Mimic 对齐的是 limb directions。WARP 改变了目标。对于 offline policy learning，机器人 palm 必须精确到达人类 palm 指示的任务接触位置。因此 WARP 使用 SEW 作为 deterministic IK backbone，同时加入 constrained skeleton alignment 来实现 exact palm matching。

## WARP Retargeting Pipeline

WARP 的 retargeting 主要分两步。

第一步是 **adaptive offset**，用于处理 link length 差异。如果机器人直接复制人类手臂方向 \(u^{hm}, l^{hm}\)，预测的机器人 palm \(\hat t^{rb}\) 可能会偏离人类 palm \(t\)。WARP 计算左右手的 centroid offset：

\[
p_{\mathrm{offset}}
=
\frac{1}{2}(t_L+t_R)
-
\frac{1}{2}(\hat t_L^{rb}+\hat t_R^{rb}).
\]

这个 offset 会移动机器人 upper-body origin，使左右 palm 的 centroid 和人类 palm centroid 对齐。

第二步是 **per-arm palm alignment**，每条手臂独立求解。机器人手的 orientation 直接从人手转移：

\[
\mathbf{H}^{rb}=\mathbf{H}^{hm}.
\]

机器人 wrist 由目标 palm pose 和固定 wrist-to-palm offset \(p_{WT}\) 反推得到。Hard constraint 是：

\[
w^{rb}+\mathbf{H}^{rb}p_{WT}
=
(T^{hm\leftarrow rb})^{-1}t.
\]

当 shoulder 和 wrist 固定后，剩下的问题是机器人 elbow 应该在哪里。WARP 通过 SEW elbow angle \(\psi\) 转移人类 elbow configuration，计算 elbow half-plane normal \(\hat n\)，再用几何子问题 SP3 求 robot elbow：

\[
e^{rb}
=
s^{rb}
+
R(\hat n,\theta_{\mathrm{SEW}})
\ell_{SE}\hat e_{SW}.
\]

修正后的 robot skeleton \((s^{rb},e^{rb},w^{rb},\mathbf{H}^{rb})\) 会传给 SEW solver，以 closed form 恢复 joint angles。论文明确说明，这条 retargeting path 不调用 iterative solver。Torso pose 也通过 closed-form IK-Geo solver 求解。

## Lazy Mobile-Base Control

Whole-body human motion 会隐含一个 base pose，但如果 mobile base 直接跟踪每个小的 upper-body shift，轮子会追踪抖动并引入延迟。WARP 的设计是：torso 处理 fine adjustment，base 只处理真正的 relocation。

它维护 filtered base target \(q_b=(p_b,\theta_b)\)，并与 desired base pose \(q_d=(p_d,\theta_d)\) 比较。Deadband 内的小误差会被忽略：

\[
\tilde e_{xy}
=
\max(0,\lVert p_d-p_b\rVert-\delta_{xy})\hat e_{xy},
\qquad
\tilde e_\theta
=
\mathrm{sign}(e_\theta)\max(0,\lvert e_\theta\rvert-\delta_\theta).
\]

随后用阻尼二阶系统更新 base：

\[
\ddot p_b=\omega_n^2\tilde e_{xy}-2\zeta\omega_n\dot p_b,
\qquad
\ddot\theta_b=\omega_n^2\tilde e_\theta-2\zeta\omega_n\dot\theta_b.
\]

这是一个小的系统细节，但影响很大：更平滑的 base motion 会让 open-loop replay 和下游 policy learning 都更稳定。

## Retargeting 之后的 Policy Learning

Policy training 发生在 WARP 把人类动作转成机器人动作之后。作者用 HPT 作为 policy backbone。HPT 是 transformer-based action-chunk model，通过 flow matching 训练。Action chunk 被分成 base、torso、arm 和 hand components：

\[
a_{1:H}=[a_b,a_\tau,a_r,a_h]_{1:H}.
\]

模型使用 proximal-to-distal hierarchy：

\[
b \preceq \tau \preceq r \preceq h.
\]

Block-causal attention mask 让 proximal body blocks 影响 distal blocks，而 action horizon 上的时间 tokens 仍然可以联合建模。最终 policy 比较轻量，大约 **11M trainable parameters**。这个 policy 细节之所以重要，是因为 WARP retargeting 的目的就是生成 unimodal、consistent action labels，让标准 behavior-cloning model 更容易学习。

## 实验

实验验证三个主张：WARP 提高 retargeting quality，WARP 生成的数据能提升下游 policy learning，whole-body retargeting 对依赖 torso、elbow 或 base configuration 的任务是必要的。

在 retargeting quality 上，作者从 BONES-SEED-SOMA 采样 **514 个 manipulation demonstrations**，并与 SEW-Mimic 和 MINK variants 比较。MINK-EF 只跟踪 end-effectors。MINK-TE 增加 soft torso and elbow objectives。WARP 在没有 joint-limit constraints 时达到很低的 palm error：mean palm position error 为 **0.0046 mm**，P95 error 为 **0.046 mm**；相比之下，MINK-EF 是 **0.701 mm / 1.853 mm**，MINK-TE 是 **18.557 mm / 73.980 mm**。WARP 的 joint-limit 和 self-collision fractions 也低于 MINK variants。论文还报告了大约 **30x** 的求解速度优势：WARP 在一个 CPU 上转换 SEED 大约需要一小时，而 baseline 需要一整天。

在 simulation policy learning 中，作者使用 DexMimicGen demonstrations，任务包括 can sort、pouring 和 coffee。WARP 和 MINK 的 replay success 接近，平均 **80.0%** 对 **79.5%**。但 policy gap 更大：用 WARP 数据训练的 policy 平均 success 为 **71%**，MINK 为 **59%**。在 coffee task 上，WARP policy success 为 **34%**，MINK 是 **8%**。这是论文最关键的实验点：replay success 会掩盖 retargeting 缺陷，而这些缺陷会在 learning 阶段暴露出来。

真实世界实验使用 RB-Y1 机器人平台，包含 holonomic base、6-DoF torso、两条 7-DoF arms 和 12-DoF XHands。Human data 由 Meta Quest headset 采集。任务包括 rotate box、push cart、pick up laundry，以及用 elbow 关闭 fridge door。整体上，WARP 优于 end-effector-centric MINK baseline。在 rotate-box policy rollout 中，WARP 达到 **65%** success，MINK 为 **40%**。在 elbow-mode fridge task 中，WARP 的 replay success 是 **90%**，说明 end-effector-only retargeting 对 whole-body manipulation 来说太窄。

## Baselines 为什么失败

Appendix 很有价值，因为它在指标之外解释了失败机制。MINK-style retargeting 在 joint space 中优化 weighted soft objectives，会带来三个问题：

- Seed-dependent null-space choices 会产生不一致的 action labels。
- 增加 posture weights 可能损害 palm tracking，降低它们又可能产生不安全的 whole-body configurations。
- 绝对 keypoint 或 skeleton mapping 会受到人和机器人 link lengths 差异影响。

WARP 从结构上移除了这些 tradeoffs。它对每个非退化姿态返回唯一解，把 palm matching 作为 hard constraint，并通过 scale-aware SEW geometry 比较人类和机器人手臂。

## 限制

主要限制是 WARP 仍然是 primarily kinematic。它生成满足几何约束的 reference joint trajectories，但没有显式建模 controller error、actuator bandwidth、latency、contact dynamics 或 object interaction 带来的扰动。一个轨迹几何上合法，但如果机器人在接触中跟踪不上，仍然可能失败。

Policy 和 perception setup 也被简化了。真实世界实验使用 AprilTag tracking 提供 low-dimensional object-state inputs，并用 Vicon 做 robot base localization。这有助于隔离 retargeting quality，但没有解决杂乱家庭环境中的 marker-free visual generalization。

最后，human data quality 依赖采集设备。Quest headset 具有可扩展、易使用的优点，但 inside-out tracking 可能引入 jitter、drift、discontinuities 和 limb estimate errors。由于 WARP 是 offline pipeline，这些采集噪声可能直接进入机器人 supervision。

## Takeaway

WARP 的核心信息是：retargeting quality 就是 policy-learning quality。如果 offline human data 被转换成不精确或不一致的 robot actions，即使 replay 看起来还可以，behavior-cloning policy 看到的仍然是含混的 labels。

对 robot learning 来说，这个方法很值得作为参照，因为它没有把 whole-body retargeting 当成一个 weighted IK 调参问题。它把任务关键的 palm tracking 设为 exact constraint，用 SEW geometry 保留 elbow 和 torso structure，用 lazy controller 平滑 base，再把 learning 留给 action labels 已经变得一致之后的 policy stage。

</div>
