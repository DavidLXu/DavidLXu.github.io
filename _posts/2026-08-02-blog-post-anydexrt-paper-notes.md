---
title: "[Paper Notes] AnyDexRT: Calibration-Free Dexterous Hand Retargeting with Few-Shot Human Guidance"
date: 2026-08-02
permalink: /posts/2026/08/anydexrt-paper-notes/
tags:
  - Dexterous Manipulation
  - Hand Retargeting
  - Teleoperation
  - Representation Learning
  - Robotics
---

<div data-lang="en" markdown="1">

## TL;DR

**AnyDexRT** learns a fast human-to-robot fingertip mapping for dexterous-hand teleoperation. Its key observation is that a robot hand may have reachable fingertip regions with no natural human counterpart. Forcing global, bidirectional shape alignment can pull the human motion manifold into those redundant regions and make control unintuitive. AnyDexRT instead uses one-way partial correspondence, preserves pairwise geometry and local motion directions, and resolves the remaining mapping ambiguity with a small set of human-guided anchors. A separate contact classifier repairs pinch commands when glove measurements fail to capture actual fingertip contact.

Across seven human-like robot hands with 6–20 degrees of freedom, AnyDexRT raises average local motion consistency from GeoRT's **59.8% to 90.2%** and runs at **293 Hz**. In an eight-operator real-world study, it completes all four teleoperation tasks faster than the compared methods and reaches a **62.0% pinch success rate**, compared with 39.6% for an optimization baseline and 29.2% for GeoRT.

The phrase *calibration-free* needs a precise reading. The method removes dependence on accurate human–robot coordinate alignment and extensive hand-specific scale, offset, and objective tuning. It still requires robot-space samples and a short, one-time collection of reference gestures from the operator.

## Paper Info

The paper is **"AnyDexRT: Calibration-Free Dexterous Hand Retargeting with Few-Shot Human Guidance"** by **Chenxi Wang, Ying Feng, Hongjie Fang, Shangning Xia, Lixin Yang, Chuan Wen, and Cewu Lu**. It was released as [arXiv:2607.08341](https://arxiv.org/abs/2607.08341) in July 2026. The [project page](https://chenxi-wang.github.io/projects/anydexrt/) contains system and task demonstrations.

## Retargeting as Human-to-Robot Space Correspondence

Dexterous teleoperation maps an operator's hand motion to feasible robot joint commands. Direct pose copying is unreliable because human and robot hands differ in scale, joint limits, coupling, proportions, and reachable configurations. AnyDexRT formulates the mapping through fingertip spaces.

For a hand with $F$ fingertips and $D$ robot joints, let $C^H,C^R\subset\mathbb{R}^{F\times3}$ denote human and robot fingertip positions, and let $J^R\subset\mathbb{R}^{D}$ denote robot joint configurations. The complete retargeting map is

$$
f:C^H\rightarrow J^R,
\qquad
f=f_s\circ f_m,
$$

where $f_m:C^H\rightarrow C^R$ maps human fingertips into robot fingertip space and $f_s:C^R\rightarrow J^R$ solves the corresponding robot joints. The paper concentrates on learning $f_m$; $f_s$ can use inverse kinematics, nearest-neighbor search, or another neural network.

The formulation assumes a human-like robot hand whose fingertip targets, together with reference joint angles, sufficiently constrain inverse kinematics. It also assumes that an appropriate transformation can place the natural human fingertip manifold inside the robot's reachable fingertip space. Coverage is required in the human-to-robot direction. Extra robot-only regions can remain unused.

This asymmetric coverage assumption drives the entire method. A robot hand may bend farther, spread wider, or reach configurations that a human operator never produces. Matching both spaces globally gives these extra regions influence over the learned correspondence even though they contribute little to intuitive control.

## Self-Supervised Fingertip Mapping

AnyDexRT represents each finger with an independent MLP $f_m^i$. Four losses progressively turn an unpaired space-matching problem into a stable, operator-aligned mapping.

### 1. Partial Chamfer loss: map human motion into feasible robot space

For finger $i$, the one-way partial Chamfer loss is

$$
\mathcal{L}_{\text{P-Chamfer}}(C^{H,i},C^{R,i})
=\frac{1}{|C^{H,i}|}
\sum_{j=1}^{|C^{H,i}|}
\min_k
\left\|
f_m^i(x_j^{H,i})-x_k^{R,i}
\right\|_2.
$$

Every mapped human point should land near a reachable robot point. The objective does not demand that mapped human samples cover the robot's entire space. It therefore avoids stretching the operator manifold toward redundant robot-only regions.

### 2. Distance loss: preserve the shape and scale of human motion

Partial Chamfer correspondence alone can collapse or distort the point distribution. AnyDexRT adds pairwise distance preservation:

$$
\mathcal{L}_{\text{dist}}(C^{H,i})
=\frac{1}{n(n-1)}
\sum_{j_1\neq j_2}
\left(
\left\|f_m^i(x_{j_1}^{H,i})-f_m^i(x_{j_2}^{H,i})\right\|_2
-\left\|x_{j_1}^{H,i}-x_{j_2}^{H,i}\right\|_2
\right)^2,
$$

where $n=|C^{H,i}|$. This term preserves relative spacing between human poses and prevents scale distortion in the retargeted space.

### 3. Local motion loss: preserve control direction under frame errors

A useful retargeter should make the robot fingertip respond predictably when the operator moves in a local direction. Comparing displacements in a shared global frame makes that requirement sensitive to glove calibration and coordinate rotation. AnyDexRT expresses each displacement in its own local frame.

For a small human perturbation $\Delta x$, define

$$
\Delta f_m^i(x)=f_m^i(x+\Delta x)-f_m^i(x).
$$

The local motion loss maximizes the directional agreement of normalized displacements:

$$
\mathcal{L}_{\text{motion}}
=-\frac{1}{n}\sum_j
\left\langle
\frac{T(x_j)^{-1}\Delta x}{\|\Delta x\|_2},
\frac{T(f_m^i(x_j))^{-1}\Delta f_m^i(x_j)}
{\|\Delta f_m^i(x_j)\|_2}
\right\rangle.
$$

$T(x)$ denotes the local coordinate frame. Since a mapped fingertip position has no predicted orientation, the method assigns the rotation of its nearest robot-space neighbor. The loss encourages a human fingertip moving "forward" in its own local frame to produce the same local response on the robot, even when the two global frames are rotated.

### 4. Sparse anchor alignment: select the intended correspondence

The three self-supervised objectives still admit several geometrically plausible solutions. Different random seeds can place the human manifold in different robot-space regions. AnyDexRT uses a few paired anchor gestures to select a task-relevant solution:

$$
\mathcal{L}_{\text{align}}(C^{H,i},C^{R,i})
=\frac{1}{M}
\sum_{j=1}^{M}
\left\|
f_m^i(\bar{x}_j^{H,i})-\bar{x}_j^{R,i}
\right\|_2.
$$

The anchors cover lateral rotation and finger bending. In the reported setup, the operator provides five human poses for each anchor type. Linear interpolation expands them to 50 lateral-rotation anchors and 100 bending anchors, while paired robot anchors are generated in simulation. Only the initial five-pose collection needs human participation, and the operator can perform the gestures according to personal comfort instead of matching an exact calibrated angle.

The complete mapper objective uses an unweighted sum:

$$
\mathcal{L}_{\text{mapping}}
=\mathcal{L}_{\text{P-Chamfer}}
+\mathcal{L}_{\text{dist}}
+\mathcal{L}_{\text{motion}}
+\mathcal{L}_{\text{align}}.
$$

This is a useful practical detail: the authors do not tune a separate weight for each term.

## Contact-Aware Pinch Refinement

Small-object pinching exposes a failure mode that geometry alone cannot fully solve. A glove may report separated fingertips even when the operator is physically pinching, due to sensing error or electromagnetic interference. AnyDexRT trains one binary classifier $f_c^i$ for every thumb–finger pair:

$$
\mathcal{L}_{\text{contact}}(C^{H,i})
=\frac{1}{N}\sum_{j=1}^{N}
\operatorname{BCE}
\left(
y_j^i,
f_c^i(x_j^{H,0},x_j^{H,i})
\right).
$$

At inference, a contact score above 0.5 triggers a neighborhood search around the mapped robot fingertip position for a valid pinch template. The classifier therefore acts as an intent signal: the geometric mapper supplies the approximate pose, and the contact branch makes the final contact discrete and reliable.

## Implementation and Runtime

For an $F$-finger hand, the fingertip mapper contains $F$ independent MLPs with dimensions $(3,128,128,3)$. The contact module contains $F-1$ MLPs with dimensions $(6,128,128,1)$ followed by sigmoid outputs. Human and robot fingertip samples are centered and normalized into $[-1,1]$ using the largest per-axis range, preserving shape while removing raw scale differences.

Both modules train for 20 epochs with a learning rate of $10^{-4}$ and batch size 2048. Mapper training adds random delta movements for the local-motion objective and uses an anchor batch size of 32. At deployment, the paper uses nearest-neighbor search over robot samples and the previous joint configuration to implement $f_s$. The resulting system runs at **293.0 Hz**, compared with 281.7 Hz for GeoRT and 93.4 Hz for the offline optimization baseline. AnyDexRT exposes three reported hyperparameters, GeoRT four, and the optimization method at least ten.

## Simulation Results Across Seven Hands

The simulation study covers Inspire, Ability, XHand, Wuji, Allegro, LEAP, and Shadow hands, spanning 6–20 degrees of freedom. The baselines are an offline version of an optimization-based retargeter and GeoRT. Stochastic methods are evaluated over five random seeds.

The paper reports two directional metrics. **Global Motion Consistency (GMC)** compares displacement directions in a shared, ideally calibrated frame. **Local Motion Consistency (LMC)** compares directions in local fingertip frames and more directly reflects the calibration-robust control objective.

Across all seven hands, AnyDexRT reaches **79.9% GMC and 90.2% LMC**. GeoRT reaches 78.3% and 59.8%; the optimization baseline reaches 62.0% and 52.2%. AnyDexRT's LMC stays between 88.5% and 92.3% on every tested hand, with standard deviations of only 0.1–0.3 points on most entries.

The metrics also reveal a tradeoff. On LEAP Hand, AnyDexRT records 54.5% GMC, below GeoRT's 73.4%, while its LMC reaches 89.0%, far above GeoRT's 53.2%. The method deliberately prioritizes local control consistency when global coordinate frames are unreliable.

The Wuji Hand ablation is especially informative:

- Partial Chamfer alone: **4.1% LMC**.
- Adding distance preservation: **83.8%**.
- Adding local motion preservation: **89.1%**.
- Adding anchor alignment: **92.3%**.

One-way feasible-space matching is therefore only the starting point. Distance preservation supplies most of the geometric structure, local motion adds calibration robustness, and sparse anchors stabilize the final correspondence. Under synthetic input-frame rotations of $\pm45^\circ$ and $\pm90^\circ$, AnyDexRT maintains stable LMC while both baselines degrade.

## Real-World Teleoperation

The real system combines a Flexiv Rizon 4 arm, Wuji Hand, Manus glove, and HTC Vive Tracker. Eight operators with different levels of teleoperation experience perform four tasks: spray-bottle triggering, light-bulb screwing, steak shoveling, and transferring ten small balls with a pinch.

AnyDexRT records the shortest mean episode time on every task:

- **Spray:** 10.6 s, versus 29.0 s for optimization and 32.1 s for GeoRT.
- **Screw:** 17.0 s, versus 25.3 s and 22.8 s.
- **Shovel:** 28.0 s, versus 36.4 s and 38.5 s.
- **Pick-10:** 105.8 s, versus 150.4 s and 220.4 s.

For Pick-10, pinch success is defined as ten successful transfers divided by the number of attempts. AnyDexRT reaches **62.0%**, compared with 39.6% for optimization and 29.2% for GeoRT. This result connects the contact classifier to a concrete operational benefit: fewer failed pinches and faster repetitive small-object handling.

## Strengths and Limitations

AnyDexRT's strongest contribution is the decomposition of retargeting errors. Redundant robot space is handled with one-way correspondence; scale and shape distortion with pairwise distances; calibration error with local motion; correspondence ambiguity with sparse anchors; and pinch sensor failure with a contact classifier. Each objective has a visible failure case and a measurable ablation effect.

The method is also lightweight. Small per-finger MLPs, offline robot-space sampling, and nearest-neighbor decoding deliver real-time control without a large sequence model. The short anchor procedure can encode an individual operator's preferred scale and pose while keeping data collection under two minutes in the reported system.

Several boundaries remain:

- The formulation assumes a structurally human-like robot hand and human motion coverage inside the robot's reachable fingertip space. Strongly non-anthropomorphic hands fall outside these assumptions.
- Calibration-free operation still needs a glove, sampled robot kinematics, local frames, and a few human anchors. The method removes precise cross-frame calibration and repeated hand-specific objective tuning; it does not remove all setup.
- The real-world study uses one arm–hand platform and eight operators. Completion time provides an objective proxy for intuitiveness, while a larger cross-hand user study and subjective workload measures would strengthen the claim.
- Contact refinement covers thumb–finger pinches through binary labels and pose templates. Power grasps, rolling contact, and multi-finger contact transitions need richer contact representations.
- The paper evaluates teleoperation quality directly. It does not yet train downstream imitation policies on the collected trajectories, so the effect on learned manipulation performance remains open.

## Takeaways

AnyDexRT reframes general dexterous retargeting as **partial, locally consistent correspondence with sparse semantic anchors**. This framing is more useful than global space matching when the robot has capabilities the operator cannot naturally demonstrate.

The broader engineering lesson is to separate invariants from intent. Pairwise distances and local motion directions provide calibration-tolerant geometric invariants. A handful of anchors identifies the operator's intended region, and contact classification recovers a manipulation intent that continuous pose sensing may miss. The resulting pipeline is compact, fast, and well suited to teleoperation systems that must move across robot-hand embodiments with little manual retuning.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**AnyDexRT** 学习一个用于 dexterous-hand teleoperation 的高速 human-to-robot fingertip mapping。它抓住了一个关键现象：robot hand 的 reachable fingertip space 中，可能存在 human hand 无法自然到达的区域。强制进行全局双向 shape alignment 会让 human motion manifold 被这些 redundant regions 拉伸，导致控制变得不直观。AnyDexRT 使用单向 partial correspondence，并保持 pairwise geometry 与 local motion directions，再用少量 human-guided anchors 消除剩余的 mapping ambiguity。当 glove measurement 无法正确反映真实 fingertip contact 时，独立 contact classifier 会修正 pinch command。

在 7 种 6–20 DoF 的 human-like robot hands 上，AnyDexRT 将 average local motion consistency 从 GeoRT 的 **59.8% 提升到 90.2%**，运行速度达到 **293 Hz**。在 8 名操作者参与的 real-world study 中，它在 4 项 teleoperation tasks 上都取得最短完成时间，pinch success rate 达到 **62.0%**；optimization baseline 与 GeoRT 分别为 39.6% 和 29.2%。

这里需要准确理解 *calibration-free*。该方法消除了对精确 human–robot coordinate alignment，以及大量 hand-specific scale、offset 和 objective tuning 的依赖。系统依然需要 robot-space samples，以及一次简短的 operator reference gestures 采集。

## 论文信息

论文题目为 **"AnyDexRT: Calibration-Free Dexterous Hand Retargeting with Few-Shot Human Guidance"**，作者为 **Chenxi Wang、Ying Feng、Hongjie Fang、Shangning Xia、Lixin Yang、Chuan Wen 和 Cewu Lu**。论文于 2026 年 7 月发布为 [arXiv:2607.08341](https://arxiv.org/abs/2607.08341)，[项目主页](https://chenxi-wang.github.io/projects/anydexrt/) 提供系统与任务演示。

## 将 Retargeting 表述为 Human-to-Robot Space Correspondence

Dexterous teleoperation 需要把 operator hand motion 转换为可行的 robot joint commands。Human 与 robot hand 在尺度、joint limits、coupling、比例和 reachable configurations 上都有差异，直接复制 pose 很难稳定工作。AnyDexRT 通过 fingertip spaces 来表述这个 mapping。

对于包含 $F$ 个 fingertips 和 $D$ 个 robot joints 的手，令 $C^H,C^R\subset\mathbb{R}^{F\times3}$ 表示 human 与 robot fingertip positions，$J^R\subset\mathbb{R}^{D}$ 表示 robot joint configurations。完整 retargeting map 为

$$
f:C^H\rightarrow J^R,
\qquad
f=f_s\circ f_m,
$$

其中 $f_m:C^H\rightarrow C^R$ 将 human fingertips 映射到 robot fingertip space，$f_s:C^R\rightarrow J^R$ 求解对应 robot joints。论文重点学习 $f_m$；$f_s$ 可以通过 inverse kinematics、nearest-neighbor search 或 neural network 实现。

该表述假设 robot hand 具有人手相似结构，fingertip targets 与 reference joint angles 可以充分约束 inverse kinematics；同时假设经过合适的 geometric transformation 后，robot reachable fingertip space 能覆盖自然 human fingertip manifold。Coverage 只要求 human-to-robot 方向成立，额外的 robot-only regions 可以不被使用。

这个 asymmetric coverage assumption 决定了整个方法的设计。Robot hand 可能弯曲得更深、张开得更宽，也可能达到 operator 从未做出的 configurations。如果全局匹配两个空间，这些额外区域会影响 learned correspondence，却不会提升 intuitive control。

## Self-Supervised Fingertip Mapping

AnyDexRT 为每根手指使用独立 MLP $f_m^i$。四项 loss 逐步将 unpaired space-matching problem 转化为稳定、符合 operator 意图的 mapping。

### 1. Partial Chamfer loss：把 Human Motion 放入可行 Robot Space

对于第 $i$ 根手指，单向 partial Chamfer loss 为

$$
\mathcal{L}_{\text{P-Chamfer}}(C^{H,i},C^{R,i})
=\frac{1}{|C^{H,i}|}
\sum_{j=1}^{|C^{H,i}|}
\min_k
\left\|
f_m^i(x_j^{H,i})-x_k^{R,i}
\right\|_2.
$$

每个 mapped human point 都应靠近可达 robot point。Objective 不要求 mapped human samples 覆盖整个 robot space，因此可以避免 operator manifold 被拉向 redundant robot-only regions。

### 2. Distance loss：保持 Human Motion 的形状与尺度

仅靠 partial Chamfer correspondence 仍可能产生 point distribution collapse 或 distortion。AnyDexRT 加入 pairwise distance preservation：

$$
\mathcal{L}_{\text{dist}}(C^{H,i})
=\frac{1}{n(n-1)}
\sum_{j_1\neq j_2}
\left(
\left\|f_m^i(x_{j_1}^{H,i})-f_m^i(x_{j_2}^{H,i})\right\|_2
-\left\|x_{j_1}^{H,i}-x_{j_2}^{H,i}\right\|_2
\right)^2,
$$

其中 $n=|C^{H,i}|$。该项保持 human poses 之间的相对间距，避免 retargeted space 发生 scale distortion。

### 3. Local motion loss：在 Frame Error 下保持控制方向

一个实用 retargeter 应当让 robot fingertip 在 operator 沿局部方向移动时产生可预测响应。在共享 global frame 中比较 displacement directions，会让这一要求对 glove calibration 和 coordinate rotation 十分敏感。AnyDexRT 将两侧 displacement 分别表达在自己的 local frame 中。

对于小幅 human perturbation $\Delta x$，定义

$$
\Delta f_m^i(x)=f_m^i(x+\Delta x)-f_m^i(x).
$$

Local motion loss 最大化 normalized displacements 的方向一致性：

$$
\mathcal{L}_{\text{motion}}
=-\frac{1}{n}\sum_j
\left\langle
\frac{T(x_j)^{-1}\Delta x}{\|\Delta x\|_2},
\frac{T(f_m^i(x_j))^{-1}\Delta f_m^i(x_j)}
{\|\Delta f_m^i(x_j)\|_2}
\right\rangle.
$$

$T(x)$ 表示 local coordinate frame。Mapped fingertip position 没有预测 orientation，因此方法使用其 nearest robot-space neighbor 的 rotation。这项 loss 让 human fingertip 在自身 local frame 中向前移动时，robot 也产生相同 local response，即使两个 global frames 发生旋转也能保持控制意图。

### 4. Sparse anchor alignment：选择符合意图的 Correspondence

前三个 self-supervised objectives 依然允许多个几何上合理的解。不同 random seeds 可能把 human manifold 放到不同 robot-space regions。AnyDexRT 使用少量 paired anchor gestures 选择 task-relevant solution：

$$
\mathcal{L}_{\text{align}}(C^{H,i},C^{R,i})
=\frac{1}{M}
\sum_{j=1}^{M}
\left\|
f_m^i(\bar{x}_j^{H,i})-\bar{x}_j^{R,i}
\right\|_2.
$$

Anchors 覆盖 lateral rotation 与 finger bending。论文设置中，operator 为每种 anchor type 提供 5 个 human poses；linear interpolation 将其扩展到 50 个 lateral-rotation anchors 和 100 个 bending anchors，配对 robot anchors 则在 simulation 中生成。只有最初的 five-pose collection 需要 human participation，operator 可以按照个人舒适度做动作，无需精确匹配 calibrated angle。

完整 mapper objective 是不带额外权重的求和：

$$
\mathcal{L}_{\text{mapping}}
=\mathcal{L}_{\text{P-Chamfer}}
+\mathcal{L}_{\text{dist}}
+\mathcal{L}_{\text{motion}}
+\mathcal{L}_{\text{align}}.
$$

这是一个很实用的细节：作者没有为每项 loss 单独调节 weight。

## Contact-Aware Pinch Refinement

Small-object pinching 会暴露单靠 geometry 难以完全解决的 failure mode。由于 sensing error 或 electromagnetic interference，即使 operator 正在真实 pinching，glove 仍可能报告相互分离的 fingertips。AnyDexRT 为每个 thumb–finger pair 训练一个 binary classifier $f_c^i$：

$$
\mathcal{L}_{\text{contact}}(C^{H,i})
=\frac{1}{N}\sum_{j=1}^{N}
\operatorname{BCE}
\left(
y_j^i,
f_c^i(x_j^{H,0},x_j^{H,i})
\right).
$$

Inference 时，超过 0.5 的 contact score 会触发 neighborhood search，在 mapped robot fingertip position 周围寻找有效 pinch template。Classifier 在这里充当 intent signal：geometric mapper 给出 approximate pose，contact branch 负责让最终接触变得明确且稳定。

## Implementation 与 Runtime

对于 $F$-finger hand，fingertip mapper 包含 $F$ 个独立 MLP，尺寸为 $(3,128,128,3)$；contact module 包含 $F-1$ 个尺寸为 $(6,128,128,1)$ 的 MLP，随后连接 sigmoid output。Human 与 robot fingertip samples 会先中心化，再用各轴最大 range 归一化到 $[-1,1]$，从而在消除 raw scale difference 的同时保持几何形状。

两个模块都训练 20 epochs，learning rate 为 $10^{-4}$，batch size 为 2048。Mapper training 加入随机 delta movements 来计算 local-motion objective，anchor batch size 为 32。部署时，论文使用 robot samples 与 previous joint configuration 做 nearest-neighbor search 来实现 $f_s$。系统运行速度为 **293.0 Hz**，GeoRT 为 281.7 Hz，offline optimization baseline 为 93.4 Hz。AnyDexRT 报告 3 个 hyperparameters，GeoRT 为 4 个，optimization method 至少需要 10 个。

## 七种 Robot Hands 上的 Simulation Results

Simulation study 覆盖 Inspire、Ability、XHand、Wuji、Allegro、LEAP 和 Shadow hands，跨度为 6–20 DoF。Baselines 包括 offline optimization-based retargeter 与 GeoRT，含随机性的 methods 使用 5 个 random seeds 评测。

论文报告两种方向指标。**Global Motion Consistency (GMC)** 在共享、理想 calibrated frame 中比较 displacement directions；**Local Motion Consistency (LMC)** 在 fingertip local frames 中比较方向，与 calibration-robust control objective 更直接对应。

七种手的平均结果中，AnyDexRT 达到 **79.9% GMC 与 90.2% LMC**。GeoRT 为 78.3% 和 59.8%，optimization baseline 为 62.0% 和 52.2%。AnyDexRT 在所有手上的 LMC 都处于 88.5%–92.3%，大部分结果的 standard deviation 只有 0.1–0.3 points。

这些指标也揭示了一项 tradeoff。在 LEAP Hand 上，AnyDexRT 的 GMC 为 54.5%，低于 GeoRT 的 73.4%；其 LMC 达到 89.0%，明显超过 GeoRT 的 53.2%。当 global coordinate frames 不可靠时，该方法明确优先保证 local control consistency。

Wuji Hand 上的 ablation 尤其有解释力：

- 仅 Partial Chamfer：**4.1% LMC**。
- 加入 distance preservation：**83.8%**。
- 加入 local motion preservation：**89.1%**。
- 加入 anchor alignment：**92.3%**。

因此，one-way feasible-space matching 只是起点。Distance preservation 提供了主要 geometric structure，local motion 增加 calibration robustness，sparse anchors 稳定最终 correspondence。在对 input frame 施加 $\pm45^\circ$ 与 $\pm90^\circ$ 的 synthetic rotations 后，AnyDexRT 的 LMC 仍保持稳定，两个 baseline 则明显下降。

## Real-World Teleoperation

Real system 由 Flexiv Rizon 4 arm、Wuji Hand、Manus glove 和 HTC Vive Tracker 组成。8 名具有不同 teleoperation experience 的 operators 完成四项任务：spray-bottle triggering、light-bulb screwing、steak shoveling，以及用 pinch 转移 10 个小球。

AnyDexRT 在每项任务上都取得最短 mean episode time：

- **Spray：**10.6 s；optimization 为 29.0 s，GeoRT 为 32.1 s。
- **Screw：**17.0 s；对照方法分别为 25.3 s 和 22.8 s。
- **Shovel：**28.0 s；对照方法分别为 36.4 s 和 38.5 s。
- **Pick-10：**105.8 s；对照方法分别为 150.4 s 和 220.4 s。

Pick-10 的 pinch success 定义为 10 次成功转移除以总尝试次数。AnyDexRT 达到 **62.0%**，optimization 为 39.6%，GeoRT 为 29.2%。这个结果将 contact classifier 与具体 operational benefit 联系起来：失败 pinch 更少，重复 small-object handling 更快。

## 优点与局限

AnyDexRT 最强的贡献是对 retargeting errors 的拆解。Redundant robot space 由 one-way correspondence 处理；scale 与 shape distortion 由 pairwise distances 处理；calibration error 由 local motion 处理；correspondence ambiguity 由 sparse anchors 处理；pinch sensor failure 由 contact classifier 处理。每个 objective 都对应清晰 failure case，并得到可测量的 ablation 支持。

方法也很轻量。Small per-finger MLPs、offline robot-space sampling 与 nearest-neighbor decoding 在无需大型 sequence model 的情况下实现 real-time control。简短 anchor procedure 可以编码 operator 偏好的尺度与姿态，论文系统中 collection time 少于两分钟。

目前仍有几项边界：

- 该表述假设 structurally human-like robot hand，并要求 human motion 被 robot reachable fingertip space 覆盖。形态差异很大的 non-anthropomorphic hands 不满足这些 assumptions。
- Calibration-free operation 依然需要 glove、sampled robot kinematics、local frames 与少量 human anchors。它消除的是精确 cross-frame calibration 和反复 hand-specific objective tuning，并未取消全部 setup。
- Real-world study 只使用一种 arm–hand platform，共 8 名 operators。Completion time 是 intuitiveness 的客观 proxy；更大规模 cross-hand user study 和 subjective workload metrics 能进一步强化结论。
- Contact refinement 只覆盖 binary labels 与 pose templates 表达的 thumb–finger pinches。Power grasps、rolling contact 与 multi-finger contact transitions 需要更丰富 contact representations。
- 论文直接评测 teleoperation quality，尚未使用所收集 trajectories 训练 downstream imitation policies，因此对 learned manipulation performance 的影响仍待验证。

## 我的理解

AnyDexRT 将通用 dexterous retargeting 重新表述为 **partial、locally consistent correspondence with sparse semantic anchors**。当 robot 拥有 operator 无法自然演示的能力时，这个视角比 global space matching 更贴近实际控制目标。

更广泛的 engineering lesson 是将 invariants 与 intent 分开处理。Pairwise distances 和 local motion directions 提供 calibration-tolerant geometric invariants；少量 anchors 指定 operator 想要的区域；contact classification 恢复 continuous pose sensing 可能遗漏的 manipulation intent。最终 pipeline 紧凑、快速，适合需要跨 robot-hand embodiments 工作且希望减少 manual retuning 的 teleoperation systems。

</div>
