---
title: "[Paper Notes] HRDexDB: A Paired Human-Robot Dataset for Cross-Embodiment Dexterous Grasping"
date: 2026-07-02
permalink: /posts/2026/07/hrdexdb-paper-notes/
tags:
  - Dexterous Manipulation
  - Cross-Embodiment Learning
  - Robot Learning
  - Human-Robot Transfer
  - Dataset
---

<div data-lang="en" markdown="1">

**HRDexDB** is a dataset paper, but its real contribution is a data contract for studying cross-embodiment dexterity. It captures human grasps and multiple dexterous robot grasps on the same objects, in the same calibrated workspace, with reconstructed 3D hand motion, robot states, object 6D trajectories, egocentric views, and tactile signals where the robot hardware supports them.

My read: the paper is useful because it moves the question from "can we retarget a human hand pose to a robot hand?" to "can we learn how the contact strategy itself changes across embodiments?" That distinction matters for dexterous grasping. Different hands can share the same grasp intent while using different fingers, contact patches, timing, and feasible force closure patterns.

## Paper Info

The paper is **"HRDexDB: A Paired Human-Robot Dataset for Cross-Embodiment Dexterous Grasping"** by **Jongbin Lim, Taeyun Ha, Mingi Choi, Jisoo Kim, Byungjun Kim, Subin Jeon, and Hanbyul Joo** from **Seoul National University** and **RLWRLD**. It is available as [arXiv:2604.14944](https://arxiv.org/abs/2604.14944), with project page [snuvclab.github.io/HRDexDB](https://snuvclab.github.io/HRDexDB/).

## The Problem

Human manipulation is an attractive source of demonstrations because most everyday objects are designed around the human hand. The hard part is that human hands and robot hands differ in morphology, kinematics, actuation, sensing, and feasible contacts. Even two robot hands can require different grasp strategies for the same object.

Existing datasets usually cover one side of the problem. Human-object interaction datasets provide rich human hand motion and object annotations. Robot datasets provide robot trajectories, often with grippers or a single dexterous embodiment. Paired human-robot datasets exist, but the paper argues that they lack the combination HRDexDB targets: markerless RGB observations, multiple dexterous robot hands, shared objects, 3D hand and object annotations, and tactile signals in a unified setup.

The central missing ingredient is paired behavior. For cross-embodiment learning, the dataset should show a human grasp and a robot grasp that are semantically comparable on the same object, while still allowing embodiment-specific differences in motion and contact.

## Dataset Contract

HRDexDB contains **2.1K grasping sequences**, **24M frames**, **100 objects**, and **five embodiments**: one human hand plus four robotic hands, namely Allegro Hand V4, Allegro Hand V5 Plus, Inspire Hand RH56DFTP, and Inspire Hand RH56F1. The capture system uses **21 synchronized exocentric RGB cameras** and **2 egocentric views**, giving 23 synchronized RGB streams in total. The dataset also includes scanned object meshes, object 6D pose trajectories, success/failure labels, and tactile force signals for tactile-enabled robot fingertips.

The robot trial representation is:

\[
T^{robot}=\left\{\{I_t^{c_i}\}_{i=1}^{21}, I_t^{ego}, q_t^{robot}, T_t^{object}, F_t^{tactile}, y\right\}_{t=1}^{T_r}.
\]

The human trial representation is:

\[
T^{human}=\left\{\{I_t^{c_i}\}_{i=1}^{21}, I_t^{ego}, \theta_t^{human}, T_t^{object}, y\right\}_{t=1}^{T_h}.
\]

Here \(q_t^{robot}\) is the robot state, \(\theta_t^{human}\in\mathbb{R}^{51}\) is the MANO hand pose, \(T_t^{object}\in SE(3)\) is the object pose, \(F_t^{tactile}\) is tactile force data, and \(y\in\{0,1\}\) marks grasp success.

This representation is compact but important. It aligns visual, kinematic, object, tactile, and outcome signals in one coordinate system, making the dataset usable for both manipulation learning and perception evaluation.

## Capture And Reconstruction

The acquisition protocol has two stages. A human subject first performs a natural grasp on the target object. Then a teleoperator observes that demonstration and performs a semantically corresponding grasp with the target robot hand. The teleoperation setup uses an Xsens inertial motion-capture suit and MANUS gloves to map wrist and finger motion to the robot arm and hand.

This protocol avoids forcing an exact joint-level correspondence. The robot execution preserves the grasp intent while adapting to the robot's own morphology. That is the point of the dataset: the paired examples expose how successful contact strategies change when the hand changes.

The reconstruction pipeline combines several vision components:

- Human hand motion: HaMeR detects 2D hand keypoints in each calibrated view, triangulation produces 3D joints, and MANO fitting recovers pose parameters. Subject-specific shape is calibrated with SAM3 masks and silhouette alignment.
- Object pose: FoundationStereo estimates dense depth from a calibrated stereo pair, SAM3 segments the object, and FoundationPose estimates and tracks the CAD model pose through time.
- Multi-view consistency: the object mesh is rendered into all calibrated views, and silhouette misalignment is minimized to reduce drift during long grasps.

The practical challenge is occlusion. Dexterous hands and objects hide each other constantly, so the paper's multi-camera system is not decoration; it is what makes markerless 3D supervision plausible.

## Benchmark 1: Contact Map Transfer

The first downstream task asks: given a human contact pattern on an object, can a model predict the robot-specific contact pattern that will actually work for a target hand?

Each grasp is represented on an object point cloud \(O\in\mathbb{R}^{N\times3}\) with a contact map \(C\in[0,1]^N\) and a part map \(P\). The human part map uses six parts, while the robot part map uses \(B=6\) for Inspire and \(B=5\) for Allegro. Conditioned on the human representation \([C^h,P^h]\) and PointNet++ object features, the model predicts \([C^r,P^r]\). Training uses a contact-weighted L1 loss for \(C^r\) and cross-entropy over contacted points for \(P^r\).

The predicted robot contact map is then used as the objective for a CEDex-style physics-aware grasp optimizer with contact, penetration, and self-collision terms. The comparison is clean: the optimizer stays fixed, and only the contact objective changes.

The results show why paired data matters. Directly using the human contact map reaches **66.7%** real-world success for Inspire and **63.3%** for Allegro. Using the transferred robot-specific contact map improves this to **73.3%** and **80.0%**. In simulation, the same trend appears, with Allegro improving from **60.2%** to **65.8%**.

## Benchmark 2: Latent-Space Grasp Retrieval

The second task learns a shared embedding space across human, Inspire, and Allegro grasps. Given a human hand-object grasp as query, the model retrieves robot grasp candidates from HRDexDB whose geometry and function match the query.

The architecture is CLIP-like: separate point-cloud encoders process the human hand, Inspire hand, Allegro hand, and object, then project query and candidate branches into a shared latent space with a symmetric contrastive loss.

Retrieval is evaluated in two ways. First, the paper measures whether paired robot grasps are ranked highly among 33 candidates. Human-to-Inspire retrieval reaches **36.36% R@1**, **81.82% R@3**, and **100.00% R@5**. Human-to-Allegro is harder, at **24.24% R@1**, **63.64% R@3**, and **72.73% R@5**.

Second, retrieved grasps are used to initialize BODex refinement. This is a useful test because a retrieved prior only matters if it helps downstream optimization. Retrieval-top5 gives the best episode-level success: **75.76%** for Inspire-F1 and **93.94%** for Allegro-V5, outperforming vanilla BODex and kinematic retargeting. Retrieval-top1 gives higher seed-level precision, while top5 gives better coverage across episodes.

## Benchmark 3: 3D Hand Pose Estimation

HRDexDB also functions as a perception benchmark. The paper evaluates WiLoR, HaMeR, Hamba, MeshGraphormer, and FrankMocap on captured human hand-object sequences.

The dataset is harder than FreiHAND for most methods. For example, WiLoR's PA-MPVPE increases from **5.27 mm** on FreiHAND to **6.09 mm** on HRDexDB, and MeshGraphormer's PA-MPJPE increases from **6.64 mm** to **8.31 mm**. The reason is expected: hand-object grasping causes persistent occlusion and contact-rich hand shapes, which are underrepresented in cleaner single-hand benchmarks.

The paper also tests whether HRDexDB adds useful training signal. Adding 6K HRDexDB samples to a 2.7M-sample finetuning pool slightly improves HaMeR and WiLoR on FreiHAND. The improvement is modest, but it supports the claim that the data is complementary instead of redundant.

## Benchmark 4: Object 6D Pose Under Grasping

The object pose benchmark compares FoundPose, GigaPose, PicoPose, and MegaPose-refined variants on paired human-grasp and robot-grasp frames. All methods receive the same RGB image, mask, camera intrinsics, object identity, and CAD model.

Robot grasping is consistently harder than human grasping. FoundPose with MegaPose refinement reaches **3.35 cm ADD** and **70.00% ARMSSD** on human-grasp frames, but drops to **4.40 cm ADD** and **64.10% ARMSSD** on robot-grasp frames. The paper's explanation is plausible: rigid robot links and fingertips introduce visual structures that overlap object boundaries and confuse pose localization.

The authors further fine-tune the MegaPose refiner with 100K GSO synthetic samples plus 5.3K HRDexDB robot-grasp annotations, then evaluate on a held-out OmniRobotHome robot-grasp environment. ADD-S improves from **4.40 cm** to **3.95 cm**, a **10.2%** relative gain. This positions HRDexDB as training data for interaction-centric pose refinement, beyond its role as an evaluation set.

## Strengths And Limitations

HRDexDB's strength is its pairing. The dataset does not merely place human and robot demonstrations in the same folder. It captures comparable human and robot grasps over shared objects, reconstructs both in a calibrated 3D workspace, and includes the signals needed to study contact, retrieval, perception, and outcome.

Another strength is embodiment diversity. Four robot hands are still a small sample of the hand-design space, but they are enough to expose why direct hand-pose retargeting is brittle and why contact-level or latent-space transfer can be more useful.

The limitations are also clear. Tactile sensing is available only for robot hands, and sensor specifications vary across platforms, making unified tactile modeling difficult. The human-robot correspondence is semantic, so defining functionally equivalent trajectories across different hand morphologies remains open. The dataset also focuses on grasping; the authors plan to expand toward 1,000 objects and more complex functional manipulation tasks.

## Takeaway

HRDexDB is best read as infrastructure for learning embodiment-aware dexterity. It gives researchers paired examples where a human grasp and a robot grasp aim at the same object-level function while expressing that function through different bodies.

For robot learning, the strongest lesson is that cross-embodiment transfer should be evaluated at the level of contact, object motion, tactile outcome, and perception robustness. A human demonstration is not just a pose sequence to copy. It is evidence about object affordance and grasp intent, and HRDexDB makes that evidence measurable across multiple robot hands.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**HRDexDB** 是一篇 dataset paper，但它真正的贡献是给 cross-embodiment dexterity 定义了一套数据契约。它在同一个校准工作空间中，采集同一批物体上的人手抓取和多种灵巧机器人手抓取，并提供重建后的 3D hand motion、robot states、object 6D trajectories、egocentric views，以及机器人硬件支持时的 tactile signals。

我的理解是，这篇论文有用的地方在于，它把问题从“能不能把人手 pose retarget 到机器人手”推进到“能不能学习 contact strategy 如何随 embodiment 改变”。这对灵巧抓取很关键。不同的手可以共享同一个 grasp intent，但使用不同手指、不同接触区域、不同时间节奏，以及不同的可行 force closure pattern。

## 论文信息

论文标题是 **"HRDexDB: A Paired Human-Robot Dataset for Cross-Embodiment Dexterous Grasping"**，作者为 **Jongbin Lim, Taeyun Ha, Mingi Choi, Jisoo Kim, Byungjun Kim, Subin Jeon, and Hanbyul Joo**，来自 **Seoul National University** 和 **RLWRLD**。论文链接为 [arXiv:2604.14944](https://arxiv.org/abs/2604.14944)，项目主页为 [snuvclab.github.io/HRDexDB](https://snuvclab.github.io/HRDexDB/)。

## 问题

人类操作是很自然的 demonstration 来源，因为日常物体大多围绕人手设计。难点在于，人手和机器人手在 morphology、kinematics、actuation、sensing 和 feasible contacts 上都不同。即使两个机器人手面对同一个物体，也可能需要不同的抓取策略。

已有数据集通常只覆盖问题的一侧。Human-object interaction 数据集提供丰富的人手运动和物体标注。Robot 数据集提供机器人轨迹，但经常是 gripper 或单一 dexterous embodiment。也有 paired human-robot 数据集，但论文认为它们缺少 HRDexDB 试图同时满足的组合：markerless RGB observations、多种 dexterous robot hands、共享物体、3D hand and object annotations，以及统一系统下的 tactile signals。

真正缺失的是 paired behavior。对于 cross-embodiment learning，数据集需要同时展示同一物体上的人手抓取和语义可对应的机器人抓取，同时允许机器人根据自身结构产生不同的 motion 和 contact。

## 数据契约

HRDexDB 包含 **2.1K grasping sequences**、**24M frames**、**100 objects** 和 **5 种 embodiments**：一个人手，加四种机器人手，分别是 Allegro Hand V4、Allegro Hand V5 Plus、Inspire Hand RH56DFTP 和 Inspire Hand RH56F1。采集系统使用 **21 个同步 exocentric RGB cameras** 和 **2 个 egocentric views**，总共 23 路同步 RGB。数据还包括扫描物体 mesh、object 6D pose trajectories、success/failure labels，以及 tactile-enabled robot fingertips 上的 tactile force signals。

机器人 trial 表示为：

\[
T^{robot}=\left\{\{I_t^{c_i}\}_{i=1}^{21}, I_t^{ego}, q_t^{robot}, T_t^{object}, F_t^{tactile}, y\right\}_{t=1}^{T_r}.
\]

人类 trial 表示为：

\[
T^{human}=\left\{\{I_t^{c_i}\}_{i=1}^{21}, I_t^{ego}, \theta_t^{human}, T_t^{object}, y\right\}_{t=1}^{T_h}.
\]

其中 \(q_t^{robot}\) 是 robot state，\(\theta_t^{human}\in\mathbb{R}^{51}\) 是 MANO hand pose，\(T_t^{object}\in SE(3)\) 是 object pose，\(F_t^{tactile}\) 是 tactile force data，\(y\in\{0,1\}\) 标记抓取是否成功。

这个表示看起来紧凑，但很关键。它把视觉、运动学、物体位姿、触觉和结果标签对齐到同一个坐标系里，让数据既能用于 manipulation learning，也能用于 perception evaluation。

## 采集与重建

采集协议分成两步。人类被试先对目标物体做自然抓取。随后 teleoperator 观察这个 demonstration，并用目标机器人手执行语义对应的抓取。Teleoperation 使用 Xsens inertial motion-capture suit 和 MANUS gloves，把操作者的 wrist 和 finger motion 映射到 robot arm and hand。

这个协议不会强行要求 joint-level correspondence。机器人执行保留 grasp intent，同时根据自身 morphology 调整动作。这正是数据集的重点：paired examples 显示 successful contact strategies 在 hand 变化时如何改变。

重建 pipeline 结合了多个视觉组件：

- Human hand motion：HaMeR 在每个校准视角中检测 2D hand keypoints，triangulation 得到 3D joints，随后通过 MANO fitting 恢复 pose parameters。Subject-specific shape 通过 SAM3 masks 和 silhouette alignment 校准。
- Object pose：FoundationStereo 从校准 stereo pair 估计 dense depth，SAM3 分割物体，FoundationPose 根据 CAD model 估计并跟踪物体 pose。
- Multi-view consistency：把 object mesh 渲染到全部校准视角，并最小化 silhouette misalignment，以减少长时间抓取中的 tracking drift。

这里真正难的是 occlusion。灵巧手和物体会持续互相遮挡，因此论文的 multi-camera system 承担核心作用；它是 markerless 3D supervision 能成立的前提。

## Benchmark 1: Contact Map Transfer

第一个下游任务问的是：给定一个人手在物体上的 contact pattern，模型能不能预测对目标机器人手真正有效的 robot-specific contact pattern？

每个 grasp 在 object point cloud \(O\in\mathbb{R}^{N\times3}\) 上表示为 contact map \(C\in[0,1]^N\) 和 part map \(P\)。Human part map 使用 6 个部位；robot part map 对 Inspire 使用 \(B=6\)，对 Allegro 使用 \(B=5\)。模型以人手表示 \([C^h,P^h]\) 和 PointNet++ object features 为条件，预测 \([C^r,P^r]\)。训练时，对 \(C^r\) 使用 contact-weighted L1 loss，对 \(P^r\) 在 contacted points 上使用 cross-entropy。

预测出的 robot contact map 随后作为 CEDex-style physics-aware grasp optimizer 的目标，优化项包括 contact、penetration 和 self-collision。这个比较很干净：optimizer 保持不变，只改变 contact objective 的来源。

结果说明 paired data 的价值。直接使用 human contact map 时，Inspire 的真实硬件成功率是 **66.7%**，Allegro 是 **63.3%**。使用 transferred robot-specific contact map 后，成功率提升到 **73.3%** 和 **80.0%**。仿真中也有同样趋势，Allegro 从 **60.2%** 提升到 **65.8%**。

## Benchmark 2: Latent-Space Grasp Retrieval

第二个任务是在 human、Inspire 和 Allegro grasps 之间学习共享 embedding space。给定一个 human hand-object grasp query，模型从 HRDexDB 中检索几何和功能上匹配的 robot grasp candidates。

架构类似 CLIP：不同 point-cloud encoders 分别处理 human hand、Inspire hand、Allegro hand 和 object，然后把 query 和 candidate branches 投影到共享 latent space，用 symmetric contrastive loss 训练。

Retrieval 有两种评估方式。第一种是看 paired robot grasps 能否在 33 个 candidates 中排到前面。Human-to-Inspire retrieval 达到 **36.36% R@1**、**81.82% R@3** 和 **100.00% R@5**。Human-to-Allegro 更难，结果是 **24.24% R@1**、**63.64% R@3** 和 **72.73% R@5**。

第二种评估是把 retrieved grasps 用作 BODex refinement 的初始化。这很有意义，因为 retrieved prior 只有能帮助下游优化时才真正有用。Retrieval-top5 给出最好的 episode-level success：Inspire-F1 为 **75.76%**，Allegro-V5 为 **93.94%**，超过 vanilla BODex 和 kinematic retargeting。Retrieval-top1 的 seed-level precision 更高，而 top5 在 episodes 上覆盖更好。

## Benchmark 3: 3D Hand Pose Estimation

HRDexDB 也可以作为 perception benchmark。论文在采集到的人手-物体序列上评估 WiLoR、HaMeR、Hamba、MeshGraphormer 和 FrankMocap。

对大多数方法来说，HRDexDB 比 FreiHAND 更难。例如，WiLoR 的 PA-MPVPE 从 FreiHAND 上的 **5.27 mm** 增加到 HRDexDB 上的 **6.09 mm**；MeshGraphormer 的 PA-MPJPE 从 **6.64 mm** 增加到 **8.31 mm**。原因很直观：hand-object grasping 会带来持续遮挡和接触丰富的手形，这类场景在更干净的 single-hand benchmark 中不足。

论文还测试 HRDexDB 是否能提供有用训练信号。把 6K 个 HRDexDB samples 加入 2.7M samples 的 finetuning pool 后，HaMeR 和 WiLoR 在 FreiHAND 上都有小幅提升。提升不大，但支持了一个判断：这些数据提供了 complementary signal，具有独立价值。

## Benchmark 4: Object 6D Pose Under Grasping

Object pose benchmark 比较 FoundPose、GigaPose、PicoPose，以及经过 MegaPose refinement 的版本，在 paired human-grasp 和 robot-grasp frames 上的表现。所有方法使用相同的 RGB image、mask、camera intrinsics、object identity 和 CAD model。

Robot grasping 一贯比 human grasping 更难。FoundPose with MegaPose refinement 在 human-grasp frames 上达到 **3.35 cm ADD** 和 **70.00% ARMSSD**，在 robot-grasp frames 上下降到 **4.40 cm ADD** 和 **64.10% ARMSSD**。论文给出的解释是合理的：刚性的 robot links 和 fingertips 会与物体边界重叠，并产生类似物体结构的视觉干扰。

作者还用 100K GSO synthetic samples 加 5.3K HRDexDB robot-grasp annotations finetune MegaPose refiner，然后在 held-out OmniRobotHome robot-grasp environment 上评估。ADD-S 从 **4.40 cm** 改善到 **3.95 cm**，相对提升 **10.2%**。这说明 HRDexDB 也可以作为 interaction-centric pose refinement 的训练数据，作用超出了评测集。

## 优点与限制

HRDexDB 的优势在 pairing。它把共享物体上的人类和机器人抓取采集为可对应的 episodes，在校准 3D 工作空间里重建两者，并提供研究 contact、retrieval、perception 和 outcome 所需的信号。

另一个优势是 embodiment diversity。四种机器人手依然只是 hand-design space 的小样本，但已经足以说明为什么直接 hand-pose retargeting 很脆弱，以及为什么 contact-level 或 latent-space transfer 更有用。

限制也很清楚。Tactile sensing 只在机器人手上可用，而且不同平台的传感器规格不同，统一 tactile modeling 会比较困难。Human-robot correspondence 是语义层面的，因此如何定义不同 hand morphologies 之间功能等价的 trajectories 仍然是开放问题。数据集目前也主要集中在 grasping；作者计划扩展到 1,000 objects 和更复杂的 functional manipulation tasks。

## Takeaway

HRDexDB 最适合看作 embodiment-aware dexterity 的基础设施。它提供 paired examples：人手抓取和机器人抓取面向同一个 object-level function，但通过不同身体表达这个 function。

对 robot learning 来说，这篇论文最强的启发是：cross-embodiment transfer 应该在 contact、object motion、tactile outcome 和 perception robustness 层面评估。Human demonstration 包含的价值超过一段要复制的 pose sequence；它提供了 object affordance 和 grasp intent 的证据，而 HRDexDB 让这些证据可以跨多种机器人手被测量。

</div>
