---
title: "[Paper Notes] Cross-Embodiment Robot Manipulation via a Unified Hand Action Space"
date: 2026-08-12
permalink: /posts/2026/08/uhas-cross-embodiment-hand-action-space-paper-notes/
tags:
  - Dexterous Manipulation
  - Cross-Embodiment Learning
  - Unified Action Space
  - Reinforcement Learning
  - Sim-to-Real
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**UHAS** addresses a structural obstacle in cross-embodiment dexterous learning: joint-space actions from one hand have no direct meaning on another hand with different joints, finger counts, dimensions, or ranges of motion. The paper replaces joint actions with deformations of a normalized **canonical sphere**. A policy predicts how that sphere should deform, and a hand-specific **Cascade Inverse Kinematics (CIK)** controller converts the deformation into executable joint targets.

The representation is compact and geometric. Each finger owns one driving plane that controls lateral angular motion \(\Delta\theta\), plus two driving vectors that control radial deformation \(\Delta r\). With five planes, the policy produces a 15-dimensional continuous action shared by Allegro, LEAP, Shadow, and MANO hands. Hand scale and kinematic details enter only through sphere construction, surface correspondence, and CIK.

In simulation, a single multi-hand policy matches hand-specific policies: success rates remain between 98.7% and 99.5% across four hands. Leaving the target hand out during training still yields 85.7–98.1% zero-shot success. Transfer across four- and five-finger morphology is weaker, and real-world zero-shot policies average fewer than one consecutive cube reorientation. UHAS therefore succeeds as an action interface, while the experiments also show that a shared coordinate system cannot erase differences in reachable workspace, dynamics, or hardware reliability.

## Paper Info

The paper is **“Cross-Embodiment Robot Manipulation via a Unified Hand Action Space”** by **Luis Felipe Casas, Robert Teal, Keval Shah, Abhijit Tadepalli, Wanxin Jin, and Yu Xiang**, from the **University of Texas at Dallas** and **Arizona State University**. It was presented at the **4th Workshop on Dexterous Manipulation at Robotics: Science and Systems (RSS), 2026**.

- Paper: [arXiv:2607.03570](https://arxiv.org/abs/2607.03570)
- Project page, code, data, and videos: [irvlutd.github.io/UHAS](https://irvlutd.github.io/UHAS/)

## 1. The Cross-Embodiment Action Problem

Consider two dexterous hands that can both rotate a cube. Their successful behaviors may share the same semantics—spread two fingers, close the thumb, roll the cube toward the palm—while their joint commands are incompatible. An Allegro joint vector cannot be sent to a LEAP hand, and matching vector dimensions does not solve the problem because joint axes and ranges still mean different things.

This creates two barriers to generalist dexterous policies:

- The **action space** is embodiment-specific: each hand exposes a different joint vector.
- The **proprioceptive observation** is embodiment-specific: raw joint positions and velocities have different dimensions and semantics.

UHAS moves both sides of the policy interface into a canonical geometric frame. The action becomes a deformation of a sphere in the hand's grasping workspace. Proprioception becomes the normalized positions and velocities of corresponding points along the fingers. A single network can then receive and produce tensors with consistent meaning across embodiments.

The complete control chain is:

\[
\text{homogeneous state}
\xrightarrow{\pi_\theta}
(\Delta\theta,\Delta r)
\rightarrow
\text{deformed canonical sphere}
\xrightarrow{\mathrm{CIK}_e}
q_e^{\text{target}},
\]

where \(e\) identifies the target hand. The policy is shared; sphere construction and \(\mathrm{CIK}_e\) contain the embodiment-specific geometry.

## 2. Automatically Constructing a Sphere for Each Hand

UHAS begins with a robot hand URDF and an open-hand configuration. It identifies palm and fingertip frames, computes the palm center from the average finger-root position, and measures the average distance \(l\) from the palm center to the fingertips. The physical sphere radius is set to

\[
r_h = \frac{2l}{\pi}.
\]

This radius makes the fingertip span correspond approximately to a \(90^\circ\) arc. The sphere center is placed one radius above the palm center along the outward palm normal, locating it inside the hand's natural grasping workspace.

The hand-specific sphere frame is oriented consistently:

- \(+z\) follows the outward palm normal.
- \(+x\) points toward the middle finger.
- \(+y\) follows from the right-hand rule.

All distances in this frame are divided by \(r_h\), turning every hand-specific sphere into a unit sphere. A large hand and a small hand therefore share the same normalized coordinates. The original center, orientation, and radius remain available to CIK when it reconstructs physical joint configurations.

This normalization removes hand scale from the learned interface. It does not assume that every hand has the same workspace; CIK still has to realize each target under the actual hand kinematics.

## 3. Binding the Hand Surface to the Canonical Sphere

The sphere becomes useful only after establishing correspondence with the hand. UHAS uniformly samples points on the sphere and assigns each point spherical coordinates

\[
(\theta,\phi,r),
\]

where \(\theta\) is azimuth, \(\phi\) is polar angle, and \(r=1\) on the undeformed unit sphere. These points are projected onto nearby locations on the interior surface of the palm and fingers.

Each projected hand-surface point retains the spherical coordinates of its source point. Its 3D location changes as the hand moves, while its identity in the canonical domain stays fixed. The result is a dense, configuration-invariant correspondence:

\[
\text{canonical sphere coordinate}
\longleftrightarrow
\text{semantic hand-surface location}.
\]

Different hands can now refer to comparable regions through the same spherical domain. A deformation near one finger's driving plane has a consistent geometric interpretation even though the joint chain that produces it differs across hands.

This is the conceptual center of UHAS. The sphere serves as a control canvas, and the surface correspondence tells each embodiment how to interpret that canvas.

## 4. A Compact Sphere-Deformation Action

Predicting a displacement for every surface point would produce an unwieldy action vector. UHAS instead uses sparse control primitives and reconstructs a continuous deformation through interpolation.

### Driving Planes: Lateral Motion

A driving plane passes through the sphere center at a fixed azimuth \(\theta_{\text{plane}}\). One plane is aligned with each fingertip. Rotating a plane produces an azimuthal displacement \(\Delta\theta\), corresponding to lateral finger motion such as abduction and adduction.

### Driving Vectors: Closing and Opening

Each plane contains control points at selected polar angles. Their radial displacements \(\Delta r\) contract or expand the sphere locally, representing how fingers close around or move away from the object-centered workspace. The final radial field is interpolated over \((\theta,\phi)\).

The paper uses five planes and two driving vectors per plane. The action dimension is therefore

\[
5\;\Delta\theta
+
5\times2\;\Delta r
=15.
\]

The two radial vectors sit at \(\phi=60^\circ\) and \(120^\circ\), with actions in \([-2,2]\). Negative radius is allowed during deformation because it lets the controller command rapid finger closure during aggressive cube rotations. Sphere points with negative final radius are removed before CIK; when an encompassing joint has no reachable target points left, it is commanded fully closed.

The design strikes a useful balance. One radial vector per finger lacks control flexibility. Three vectors achieve slightly higher final performance, while two reach strong performance with the shortest training time. Four vectors enlarge the action space without a consistent benefit.

## 5. Unifying Four- and Five-Finger Hands

The shared policy uses five driving planes. Shadow and MANO naturally associate one plane with each of their five fingers. Allegro and LEAP have four fingers, so UHAS inserts an extra plane at the ring-finger azimuth. The duplicated ring-finger plane and its radial actions are averaged before sphere interpolation.

The observation side uses the same padding strategy: ring-finger observations are duplicated for four-finger embodiments so that all hands expose an equal-sized tensor.

This makes the interface dimensionally compatible while preserving five independently controlled channels for five-finger hands. It is a practical convention, and it also exposes a limitation: a missing finger cannot be recovered through padding. Cross-morphology policies still face different reachable contact patterns and coordination options.

## 6. Cascade Inverse Kinematics

Once the policy has deformed the sphere, the controller must find executable joint targets. Generic numerical IK over all hand surface points would be too expensive for high-rate control. CIK uses the geometry of UHAS to decompose the problem.

### 6.1 Automatic Joint Classification

For each hand, every joint is swept across its range in an open-hand configuration. Forward kinematics records how the fingertip changes in spherical coordinates. Each joint is assigned to one of two classes:

- **Lateral joints** mainly change fingertip azimuth \(\theta\), producing side-to-side motion.
- **Encompassing joints** mainly change radial distance \(r\) and polar angle \(\phi\), making the finger wrap around the sphere.

If a joint axis points toward the fingertip and its effect is ambiguous in the open pose, the remaining joints are partially flexed and the sweep is repeated. Classification happens once from the URDF.

### 6.2 Lateral Lookup

CIK precomputes a lookup table for every lateral joint. It samples the joint over its full range, resolves the encompassing joints on the undeformed sphere, and records the resulting fingertip azimuth:

\[
q_{\text{lateral}}
\longmapsto
\theta_{\text{fingertip}}.
\]

At runtime, the policy supplies \(\Delta\theta\), giving

\[
\theta_{\text{target}}
=
\theta_{\text{initial}}+\Delta\theta.
\]

The table returns the lateral joint target in constant time, bounded by the hand's attainable range.

### 6.3 Proximal-to-Distal Encompassing Cascade

After setting the lateral joints, CIK visits encompassing joints from the finger root toward the fingertip. For each joint, it transforms the associated surface targets and all descendant targets into the joint's local frame, then directly computes the angle that places them on the deformed sphere.

Each joint is solved once in a single forward pass. Fingers are kinematically independent in this formulation, so their cascades run independently. The final output is an embodiment-specific joint target \(q\) for the low-level controller.

CIK reaches approximately **150 Hz** on the real setup. The paper reports that serial communication and AprilTag pose estimation, not CIK, dominate system latency.

## 7. A Homogeneous Observation Space

A unified action alone is insufficient: the policy also needs comparable proprioception. UHAS samples seven candidate points from each finger root to fingertip and obtains their positions through forward kinematics. Velocities are calculated from the corresponding Jacobians and joint velocities.

The final policy keeps only two points per finger—the midpoint and fingertip. Their positions and velocities are represented in the canonical sphere frame and divided by the hand-specific radius. This produces scale-normalized geometric proprioception with consistent semantics across hands.

Object state, goal orientation, and the remaining task variables come from the cube-reorientation environment. Raw robot joint values are excluded from the shared policy observation because their dimensions, limits, and meanings are embodiment-specific.

An ablation shows that one to four observation points per finger all reach about 98.8–99.1% success. Additional points add computation with marginal gain, supporting the two-point choice.

## 8. Policy Learning

The authors train PPO policies in NVIDIA Isaac Lab on an in-hand cube reorientation task. Each simulated episode evaluates ten sequential target orientations. A target must be reached within 30 seconds; the environment resets after a cube drop and continues evaluating the remaining targets.

The reward follows Isaac Lab's Reposing Cube task, with two extra joint regularizers:

\[
R
=
w_d d
+w_r r_{\text{rot}}
+w_{\text{lat}}p_{\text{lat}}
+w_{\text{rad}}p_{\text{rad}}
+b_{\text{success}}
+p_{\text{fall}}.
\]

Here, \(d\) measures object-to-goal distance, \(r_{\text{rot}}\) rewards orientation alignment, and \(p_{\text{lat}},p_{\text{rad}}\) regularize lateral and encompassing joints around a reference configuration. The regularizers discourage an embodiment-specific shortcut in which the policy overuses one joint class.

Domain randomization covers object scale, mass, friction, robot mass and friction, joint armature, effort limits, stiffness, damping, hand-base inclination, and driving-vector angle. These variations prevent the policy from depending on a single hand's cube-palm dynamics or exact action geometry.

The main evaluation metrics are individual reorientation success rate and average consecutive reorientations before the first drop, capped at ten in simulation.

## 9. Main Simulation Results

| Test hand | Single-hand UHAS | Joint control | Multi-hand UHAS | Zero-shot UHAS |
|---|---:|---:|---:|---:|
| Allegro | 99.1 / 9.6 | 98.5 / 9.2 | **99.2 / 9.5** | 95.3 / 7.7 |
| LEAP | **99.7 / 9.8** | 98.6 / 9.3 | 99.1 / 9.5 | 95.5 / 7.7 |
| Shadow | **99.3 / 9.6** | 98.0 / 9.1 | 98.7 / 9.2 | 85.7 / 4.4 |
| MANO | **99.8 / 9.9** | 99.6 / 9.8 | 99.5 / 9.8 | 98.1 / 8.9 |

Each entry is success rate (%) / average consecutive reorientations. The multi-hand model is one policy trained on all four hands. Its performance is close to separately trained policies and generally stronger than direct joint control. This is the clearest evidence that the sphere representation retains enough control authority for dexterous reorientation.

For zero-shot evaluation, the test hand is held out and the policy is trained on the other three. Transfer remains high on Allegro, LEAP, and MANO. Shadow is harder at 85.7% success and 4.4 consecutive reorientations, indicating that shared semantics still leave an embodiment gap.

## 10. Morphology Transfer and Fast Adaptation

Training on the two five-finger hands and testing on four-finger hands yields 66.2% success on Allegro and 80.8% on LEAP. Training on the two four-finger hands transfers at 83.2% to Shadow and 95.0% to MANO. These figures are meaningful, yet clearly below the near-perfect in-distribution results.

The direction of transfer is asymmetric. In the one-source-hand experiments, a LEAP-trained policy transfers far better than a MANO-trained policy. The paper connects this to LEAP's large range of motion: training on a flexible hand exposes the policy to more transferable behaviors, while a constrained hand encourages solutions tied to its own workspace. Similar finger count alone does not guarantee transfer; MANO-to-Shadow performs poorly even though both have five fingers.

Finetuning is much easier than training from scratch. Starting from a MANO policy and adapting for 500 iterations raises success to 96.3% on Allegro, 96.2% on LEAP, and 95.8% on Shadow. Full training takes about 4,500 iterations. UHAS therefore provides a useful initialization even when zero-shot behavior is imperfect.

## 11. Real-World Results

The real system uses AprilTags on all cube faces, one or two Intel RealSense cameras, and a pose-fusion pipeline that rejects inconsistent tag estimates. Policies run at 20 Hz because LEAP serial communication is the main bandwidth constraint.

| Physical hand | Zero-shot | Multi-hand | Target-hand trained | Joint baseline |
|---|---:|---:|---:|---:|
| LEAP | 0.9 | 1.1 | **2.0** | 0.6 |
| Allegro | 0.8 | **2.1** | **2.1** | — |

Values are mean consecutive reorientations over ten trials. UHAS variants outperform the available joint-control baseline on LEAP, and the Allegro multi-hand policy matches the hand-specific model. Still, the gap from simulation is large. Zero-shot transfer averages below one reorientation on both physical hands, and trial-to-trial variance is high.

The hardware appendix explains why sim-to-real is difficult. Effective LEAP PD gains differ from manufacturer specifications, damping is almost negligible, motor communication drops reads and writes, joints overshoot, structural parts deform under load, and repeated use loosens the fingers. The authors add velocity limits, broaden randomization, restrict joint ranges, and reinforce the hand mechanically.

These observations put the results in perspective: UHAS unifies the command semantics, while contact dynamics and hardware quality remain embodiment-specific.

## 12. What the Ablations Say

The ablations reveal three practical design choices:

- **Two driving vectors per plane** give the best training-efficiency trade-off: 98.7% success in 4.5 hours. Three vectors reach 99.5% but require 6.5 hours.
- **Two observation points per finger** are sufficient. Denser finger sampling produces only small gains.
- **Four versus five driving planes** makes little difference on cube reorientation because the pinky contributes little to this task. Three planes fail to learn reliable reorientation, showing that the action space still needs a minimum level of expressiveness.

Domain randomization particularly helps morphologically different targets: Shadow zero-shot success rises from 80.1% to 85.7%, and MANO rises from 97.1% to 98.1%. Allegro changes from 96.7% to 95.3%, so the benefit is not uniform across every hand.

## 13. Strengths and Limitations

**Strengths.** UHAS is interpretable, compact, and executable. The canonical sphere cleanly separates shared action semantics from hand-specific kinematics. Automatic sphere construction reduces per-hand engineering, and CIK is fast enough for real-time control. The evaluation covers four different simulated hands, held-out embodiments, finger-count transfer, short-budget finetuning, and two physical hands.

**Limitations.** The task is limited to in-hand cube reorientation with a fixed palm-up setup. The sphere naturally fits enclosing interactions around a compact object; its value for tool use, precision pinch, articulated objects, bimanual tasks, and arm-hand coordination remains open. Surface correspondence and CIK preserve geometric intent but do not explicitly model contact force, tactile feedback, friction state, or dynamic feasibility.

Cross-morphology transfer loses substantial performance, and the four-finger padding rule provides dimensional consistency without semantically replacing absent fingers. The policy also depends strongly on reward design, PD parameters, and extensive domain randomization. Real-world zero-shot performance remains modest.

Finally, UHAS creates an embodiment-agnostic hand interface, not a complete embodiment-agnostic manipulation system. Perception, object representation, palm motion, low-level actuation, system identification, and hardware maintenance still require task- and platform-specific work.

## 14. My Takeaway

UHAS offers a useful way to think about universal robot actions: search for a geometric intermediate object on which different embodiments can express comparable intent. Here, the intermediate object is a deformable sphere. The policy learns sphere motion; CIK compiles it into the joints of a particular hand.

The strongest result is the multi-hand policy. Near-single-hand performance across four kinematically different hands shows that joint vectors are not necessary for high-quality dexterous control when a sufficiently expressive geometric interface is available. The zero-shot and real-world numbers supply the necessary qualification: common coordinates improve transfer, while the feasible behavior distribution still depends on morphology and dynamics.

For future dexterous foundation models, UHAS is best viewed as a candidate **action tokenizer before tokenization**—a continuous, physically interpretable canonical layer that could let heterogeneous hand datasets supervise one policy. Extending it beyond spherical enclosure tasks will determine how universal that layer really is.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**UHAS** 处理 cross-embodiment dexterous learning 中一个结构性障碍：一只手的 joint-space action 无法直接用于另一只具有不同关节、手指数、尺寸和运动范围的手。论文把 joint action 替换成 normalized **canonical sphere** 的形变。Policy 预测球面如何变形，hand-specific **Cascade Inverse Kinematics（CIK）** controller 再把形变转换成可执行的 joint targets。

这个 representation 紧凑且具有明确的几何意义。每根手指对应一个 driving plane，控制 lateral angular motion \(\Delta\theta\)；plane 上还有两个 driving vectors，控制 radial deformation \(\Delta r\)。使用五个 planes 时，policy 输出一个 15 维 continuous action，可由 Allegro、LEAP、Shadow 和 MANO hands 共享。Hand scale 和 kinematic details 只进入 sphere construction、surface correspondence 和 CIK。

在 simulation 中，单个 multi-hand policy 达到与 hand-specific policies 接近的表现，四只手的成功率为 98.7%–99.5%。训练时排除 target hand，zero-shot success 仍达到 85.7%–98.1%。四指与五指之间的 morphology transfer 明显更弱，真实环境的 zero-shot policy 平均连续转动次数不足一次。因此，UHAS 成功构造了共享 action interface；实验也说明 shared coordinate system 无法消除 reachable workspace、dynamics 和 hardware reliability 的差异。

## 论文信息

论文标题是 **“Cross-Embodiment Robot Manipulation via a Unified Hand Action Space”**，作者为 **Luis Felipe Casas、Robert Teal、Keval Shah、Abhijit Tadepalli、Wanxin Jin 和 Yu Xiang**，来自 **University of Texas at Dallas** 和 **Arizona State University**。论文发表于 **Robotics: Science and Systems（RSS）2026 第四届 Dexterous Manipulation Workshop**。

- 论文：[arXiv:2607.03570](https://arxiv.org/abs/2607.03570)
- 项目主页、代码、数据和视频：[irvlutd.github.io/UHAS](https://irvlutd.github.io/UHAS/)

## 1. Cross-Embodiment Action Problem

假设两种 dexterous hands 都能旋转 cube。它们的成功行为可能具有同样的 semantics：张开两根手指、收拢 thumb、把 cube 滚向 palm。然而，两只手的 joint commands 完全不兼容。Allegro 的 joint vector 无法发送给 LEAP；即使把 vector dimension 强行对齐，joint axes 和 ranges 表达的含义仍然不同。

这给 generalist dexterous policy 带来两个障碍：

- **Action space** 与 embodiment 绑定：每只手暴露不同的 joint vector。
- **Proprioceptive observation** 与 embodiment 绑定：raw joint positions 和 velocities 的维度与语义不同。

UHAS 把 policy interface 的两侧都移到 canonical geometric frame 中。Action 变成 hand grasping workspace 内一个 sphere 的 deformation。Proprioception 变成手指上对应点的 normalized positions 和 velocities。单个 network 因此可以在不同 embodiments 上接收和输出具有相同语义的 tensors。

完整控制链为：

\[
\text{homogeneous state}
\xrightarrow{\pi_\theta}
(\Delta\theta,\Delta r)
\rightarrow
\text{deformed canonical sphere}
\xrightarrow{\mathrm{CIK}_e}
q_e^{\text{target}},
\]

其中 \(e\) 表示 target hand。Policy 完全共享；sphere construction 和 \(\mathrm{CIK}_e\) 保存 embodiment-specific geometry。

## 2. 为每只手自动构造 Sphere

UHAS 从 robot hand URDF 和 open-hand configuration 开始。它识别 palm 与 fingertip frames，根据 finger-root positions 的均值计算 palm center，再计算 palm center 到 fingertips 的平均距离 \(l\)。Physical sphere radius 定义为：

\[
r_h = \frac{2l}{\pi}.
\]

这个 radius 让 fingertip span 大约对应 \(90^\circ\) arc。Sphere center 位于 palm center 沿 outward palm normal 向外一个 radius 的位置，落在手指自然聚拢的 grasping workspace 内。

Hand-specific sphere frame 采用统一朝向：

- \(+z\) 沿 outward palm normal。
- \(+x\) 指向 middle finger。
- \(+y\) 根据 right-hand rule 确定。

该坐标系中的所有距离都除以 \(r_h\)，从而把每个 hand-specific sphere 归一化为 unit sphere。大手和小手因此共享相同 normalized coordinates。原始 center、orientation 和 radius 会被保留，供 CIK 恢复 physical joint configuration。

这个 normalization 从 learned interface 中移除了 hand scale，但没有假设所有手拥有同样的 workspace。CIK 仍需在真实 hand kinematics 下实现每个 target。

## 3. 把 Hand Surface 绑定到 Canonical Sphere

Sphere 只有在与手建立 correspondence 后才能用于控制。UHAS 在球面上均匀采样 points，并给每个点分配 spherical coordinates：

\[
(\theta,\phi,r),
\]

其中 \(\theta\) 是 azimuth，\(\phi\) 是 polar angle，undeformed unit sphere 上的 \(r=1\)。这些 points 被投影到 palm 和 fingers 内表面的邻近位置。

每个 projected hand-surface point 保留其 source point 的 spherical coordinates。手运动时，该点的 3D location 会改变，但它在 canonical domain 中的 identity 保持不变。最终得到 dense、configuration-invariant correspondence：

\[
\text{canonical sphere coordinate}
\longleftrightarrow
\text{semantic hand-surface location}.
\]

不同的手由此可以通过同一个 spherical domain 指向可比较的区域。某个 finger driving plane 附近的 deformation 在各只手上具有一致的 geometric interpretation，即使产生该动作的 joint chain 完全不同。

这是 UHAS 的概念核心。Sphere 是 control canvas，surface correspondence 则告诉每个 embodiment 如何解释这块 canvas。

## 4. 紧凑的 Sphere-Deformation Action

如果给每个 surface point 都预测 displacement，action vector 会过于庞大。UHAS 使用 sparse control primitives，再通过 interpolation 恢复 continuous deformation。

### Driving Planes：Lateral Motion

Driving plane 以固定 azimuth \(\theta_{\text{plane}}\) 通过 sphere center，每个 fingertip 对齐一个 plane。旋转 plane 产生 azimuthal displacement \(\Delta\theta\)，对应 abduction、adduction 一类 lateral finger motion。

### Driving Vectors：Closing 与 Opening

每个 plane 在若干 polar angles 上设置 control points。它们的 radial displacements \(\Delta r\) 在局部收缩或扩张 sphere，表示手指如何围绕 object-centered workspace 闭合或离开。完整 radial field 通过 \((\theta,\phi)\) 上的 interpolation 得到。

论文使用五个 planes，每个 plane 配置两个 driving vectors，因此 action dimension 为：

\[
5\;\Delta\theta
+
5\times2\;\Delta r
=15.
\]

两个 radial vectors 位于 \(\phi=60^\circ\) 和 \(120^\circ\)，action range 为 \([-2,2]\)。Deformation 允许 negative radius，使 controller 可以在快速 cube rotation 中命令手指迅速闭合。进入 CIK 前，final radius 为负的 sphere points 会被删除；如果某个 encompassing joint 已没有 reachable target points，它会被直接设为 fully closed。

这个设计在 expressiveness 和 complexity 之间取得了不错平衡。每根手指一个 radial vector 时 control flexibility 不足。三个 vectors 的最终性能略高，但两个 vectors 达到强性能所需训练时间最短。四个 vectors 增大了 action space，却没有稳定收益。

## 5. 统一 Four- 与 Five-Finger Hands

Shared policy 使用五个 driving planes。Shadow 和 MANO 的五根手指可以各自对应一个 plane。Allegro 和 LEAP 只有四根手指，因此 UHAS 在 ring-finger azimuth 处额外插入一个 plane。进行 sphere interpolation 前，duplicated ring-finger plane 及其 radial actions 会先取平均。

Observation side 使用相同 padding strategy：对于 four-finger embodiments，ring-finger observations 被复制，使所有 hands 暴露同样维度的 tensor。

这个规则实现了 interface 的 dimensional compatibility，同时给 five-finger hands 保留五个独立控制 channels。它也是一个需要正视的限制：padding 无法补回缺失手指。Cross-morphology policy 仍然面对不同的 reachable contact patterns 和 coordination options。

## 6. Cascade Inverse Kinematics

Policy 完成 sphere deformation 后，controller 需要找到 executable joint targets。如果使用 generic numerical IK 同时拟合全部 hand surface points，计算开销会影响 high-rate control。CIK 利用 UHAS 的几何结构进行分解。

### 6.1 自动 Joint Classification

系统在 open-hand configuration 中扫描每只手的所有 joints。Forward kinematics 记录 fingertip 在 spherical coordinates 中的变化。每个 joint 被分到两类之一：

- **Lateral joints** 主要改变 fingertip azimuth \(\theta\)，产生 side-to-side motion。
- **Encompassing joints** 主要改变 radial distance \(r\) 和 polar angle \(\phi\)，让手指包覆 sphere。

如果某个 joint axis 指向 fingertip，导致 open pose 下的效果不明确，系统会先让其余 joints 部分弯曲，再重复 sweep。这个 classification 只需根据 URDF 执行一次。

### 6.2 Lateral Lookup

CIK 为每个 lateral joint 离线预计算 lookup table。系统在完整 joint range 内采样，固定该 lateral joint，在 undeformed sphere 上解 encompassing joints，再记录对应 fingertip azimuth：

\[
q_{\text{lateral}}
\longmapsto
\theta_{\text{fingertip}}.
\]

Runtime 时，policy 给出 \(\Delta\theta\)，于是：

\[
\theta_{\text{target}}
=
\theta_{\text{initial}}+\Delta\theta.
\]

Lookup table 在 hand attainable range 内以 constant time 返回 lateral joint target。

### 6.3 Proximal-to-Distal Encompassing Cascade

Lateral joints 设置完成后，CIK 沿 finger root 到 fingertip 的顺序访问 encompassing joints。对于每个 joint，它把当前 joint 和所有 descendant links 对应的 surface targets 转换到 joint local frame，再直接计算使这些 points 贴合 deformed sphere 的 angle。

每个 joint 在 single forward pass 中只求解一次。该 formulation 中各根手指在 kinematics 上彼此独立，因此它们的 cascades 也可独立执行。最终输出是 low-level controller 使用的 embodiment-specific joint target \(q\)。

CIK 在真实系统上可以达到约 **150 Hz**。论文报告的主要 latency 来自 serial communication 和 AprilTag pose estimation，CIK 本身没有成为 runtime bottleneck。

## 7. Homogeneous Observation Space

只有 unified action 还不够，policy 同样需要可比较的 proprioception。UHAS 从每根手指的 root 到 fingertip 采样七个 candidate points，用 forward kinematics 得到 positions，并通过相应 Jacobians 和 joint velocities 计算 velocities。

最终 policy 对每根手指只保留两个 points：midpoint 和 fingertip。它们的 positions 与 velocities 在 canonical sphere frame 中表示，并除以 hand-specific radius。这样即可获得跨手语义一致、对尺度归一化的 geometric proprioception。

Object state、goal orientation 和其余 task variables 继承自 cube-reorientation environment。Shared policy observation 排除 raw robot joint values，因为它们的 dimensions、limits 和 meanings 都与 embodiment 绑定。

Ablation 显示，每根手指使用一到四个 observation points 都能达到约 98.8%–99.1% success。更多 points 只带来很小收益，却会增加计算量，因此论文选择 two-point configuration。

## 8. Policy Learning

作者在 NVIDIA Isaac Lab 中用 PPO 训练 in-hand cube reorientation policy。每个 simulated episode 依次评估十个 target orientations。每个 target 必须在 30 秒内完成；cube 掉落后 environment reset，再继续评估剩余 targets。

Reward 基于 Isaac Lab Reposing Cube task，并增加两个 joint regularizers：

\[
R
=
w_d d
+w_r r_{\text{rot}}
+w_{\text{lat}}p_{\text{lat}}
+w_{\text{rad}}p_{\text{rad}}
+b_{\text{success}}
+p_{\text{fall}}.
\]

其中 \(d\) 衡量 object-to-goal distance，\(r_{\text{rot}}\) 奖励 orientation alignment，\(p_{\text{lat}}\) 和 \(p_{\text{rad}}\) 则约束 lateral 与 encompassing joints 不要过度偏离 reference configuration。Regularizers 用于抑制 embodiment-specific shortcut，例如 policy 只依赖某类 lateral joints，而几乎不用 encompassing joints。

Domain randomization 覆盖 object scale、mass、friction、robot mass/friction、joint armature、effort limits、stiffness、damping、hand-base inclination 和 driving-vector angle。它们减少 policy 对某一只手的 cube-palm dynamics 或精确 action geometry 的依赖。

主要 evaluation metrics 是 individual reorientation success rate，以及 cube 第一次掉落前的 average consecutive reorientations；simulation 中最大值为十次。

## 9. 主要 Simulation Results

| Test hand | Single-hand UHAS | Joint control | Multi-hand UHAS | Zero-shot UHAS |
|---|---:|---:|---:|---:|
| Allegro | 99.1 / 9.6 | 98.5 / 9.2 | **99.2 / 9.5** | 95.3 / 7.7 |
| LEAP | **99.7 / 9.8** | 98.6 / 9.3 | 99.1 / 9.5 | 95.5 / 7.7 |
| Shadow | **99.3 / 9.6** | 98.0 / 9.1 | 98.7 / 9.2 | 85.7 / 4.4 |
| MANO | **99.8 / 9.9** | 99.6 / 9.8 | 99.5 / 9.8 | 98.1 / 8.9 |

每个单元格表示 success rate（%）/ average consecutive reorientations。Multi-hand model 是在四只手上共同训练的单个 policy，其表现接近分别训练的 policies，也整体优于 direct joint control。这是 sphere representation 保留了足够 dexterous control authority 的最直接证据。

Zero-shot evaluation 在训练时排除 test hand，只使用其余三只手。Allegro、LEAP 和 MANO 的 transfer 仍然很强，Shadow 则下降到 85.7% success 和 4.4 次连续转动，说明 shared semantics 之外仍然存在 embodiment gap。

## 10. Morphology Transfer 与 Fast Adaptation

在两只 five-finger hands 上训练，再测试 four-finger hands，Allegro 和 LEAP 分别达到 66.2% 与 80.8% success。在两只 four-finger hands 上训练，迁移到 Shadow 和 MANO 时分别达到 83.2% 与 95.0%。这些结果具有实际意义，但明显低于接近满分的 in-distribution performance。

Transfer direction 具有 asymmetry。One-source-hand experiments 中，LEAP-trained policy 的迁移远好于 MANO-trained policy。论文把这与 LEAP 较大的 range of motion 联系起来：flexible hand 的训练过程包含更多 transferable behaviors；constrained hand 更容易学到与自身 workspace 绑定的 solution。Finger count 相同也无法保证 transfer，MANO-to-Shadow 在两者均为 five-finger hand 的情况下仍然较差。

Finetuning 比 from-scratch training 高效得多。从 MANO policy 出发，只在 target hand 上训练 500 iterations，Allegro、LEAP 和 Shadow 的成功率即可分别达到 96.3%、96.2% 和 95.8%。完整训练大约需要 4,500 iterations。因此，即使 zero-shot behavior 不完美，UHAS 仍然提供了很好的 initialization。

## 11. 真实机器人结果

真实系统在 cube 的六个面布置 AprilTags，使用一到两台 Intel RealSense cameras，并通过 pose-fusion pipeline 剔除不一致的 tag estimates。由于 LEAP serial communication 是主要 bandwidth constraint，policy 以 20 Hz 运行。

| Physical hand | Zero-shot | Multi-hand | Target-hand trained | Joint baseline |
|---|---:|---:|---:|---:|
| LEAP | 0.9 | 1.1 | **2.0** | 0.6 |
| Allegro | 0.8 | **2.1** | **2.1** | — |

表中数值是十次 trials 的 mean consecutive reorientations。UHAS variants 在 LEAP 上优于 joint-control baseline，Allegro multi-hand policy 也追平了 hand-specific model。不过，sim-to-real gap 仍然很大。两只 physical hands 上的 zero-shot transfer 平均都不到一次 reorientation，trial-to-trial variance 也很高。

Hardware appendix 解释了 sim-to-real 的难点。LEAP 的 effective PD gains 与厂商参数不一致，damping 几乎可以忽略，motor communication 会丢失 reads/writes，joints 存在 overshoot，结构件受力后会变形，反复使用还会让手指松动。作者增加了 velocity limits，扩大 randomization，限制部分 joint ranges，并从机械结构上加固 hand。

这些现象帮助我们正确理解实验：UHAS 统一的是 command semantics，contact dynamics 和 hardware quality 仍然与 embodiment 绑定。

## 12. Ablations 带来的结论

Ablations 给出三个实用设计结论：

- **每个 plane 两个 driving vectors** 的训练效率最好：4.5 小时达到 98.7% success。三个 vectors 达到 99.5%，但需要 6.5 小时。
- **每根手指两个 observation points** 已经足够；更密集的 finger sampling 只带来微小增益。
- **四个或五个 driving planes** 在 cube reorientation 上差别不大，因为 pinky 对该任务贡献有限。三个 planes 无法学到可靠 reorientation，说明 action space 仍需保持最低限度的 expressiveness。

Domain randomization 对 morphology 差异较大的 targets 帮助更明显：Shadow zero-shot success 从 80.1% 提升到 85.7%，MANO 从 97.1% 提升到 98.1%。Allegro 从 96.7% 变为 95.3%，说明收益并非在每只手上都一致。

## 13. 优势与局限

**优势。** UHAS 可解释、紧凑且可执行。Canonical sphere 把 shared action semantics 与 hand-specific kinematics 清晰分开。Automatic sphere construction 减少了每只手的工程工作，CIK 也足够快，可以用于 real-time control。实验覆盖四种不同 simulated hands、held-out embodiments、finger-count transfer、short-budget finetuning 和两只 physical hands。

**局限。** 当前任务局限于固定 palm-up setup 下的 in-hand cube reorientation。Sphere 很适合围绕 compact object 的 enclosing interaction；它对 tool use、precision pinch、articulated objects、bimanual tasks 和 arm-hand coordination 的价值仍需验证。Surface correspondence 与 CIK 保留 geometric intent，却没有显式建模 contact force、tactile feedback、friction state 或 dynamic feasibility。

Cross-morphology transfer 存在明显性能损失，four-finger padding rule 也只是 dimensional convention，无法在语义上补回 absent finger。Policy 对 reward design、PD parameters 和 extensive domain randomization 仍然敏感，real-world zero-shot performance 也比较有限。

最后，UHAS 构造的是 embodiment-agnostic hand interface，并非完整的 embodiment-agnostic manipulation system。Perception、object representation、palm motion、low-level actuation、system identification 和 hardware maintenance 仍需要 task- 与 platform-specific work。

## 14. 我的理解

UHAS 提供了一个理解 universal robot action 的有用角度：寻找一个几何中间对象，让不同 embodiments 可以在上面表达可比较的 intent。这里的中间对象是 deformable sphere。Policy 学习 sphere motion，CIK 再把它编译成某只手的 joints。

论文最强的结果是 multi-hand policy。一个 shared policy 在四只 kinematics 差异很大的手上达到接近 single-hand policy 的性能，说明只要 geometric interface 具有足够 expressiveness，高质量 dexterous control 并不依赖 joint vector。Zero-shot 和 real-world numbers 则给出了必要限定：common coordinates 可以改善迁移，但 feasible behavior distribution 仍然取决于 morphology 和 dynamics。

面向未来 dexterous foundation models，UHAS 可以被理解成一种 **action tokenizer before tokenization**：先用连续、可解释且具有物理含义的 canonical layer，把 heterogeneous hand datasets 对齐到同一个 policy interface。它能否扩展到 spherical enclosure 以外的任务，将决定这一层究竟有多 universal。

</div>
