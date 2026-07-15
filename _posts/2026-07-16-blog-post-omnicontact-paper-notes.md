---
title: "[Paper Notes] OmniContact: Chaining Meta-Skills via Contact Flow for Generalizable Humanoid Loco-Manipulation"
date: 2026-07-16
permalink: /posts/2026/07/omnicontact-paper-notes/
tags:
  - Humanoid Robots
  - Loco-Manipulation
  - Reinforcement Learning
  - Motion Control
  - Skill Chaining
---

<div data-lang="en" markdown="1">

**OmniContact** proposes a compact interface for long-horizon humanoid loco-manipulation. Instead of asking a planner to generate dense whole-body motion, it represents a future skill using sparse body targets and binary contact schedules. A learned controller executes this **contact flow**, while a rule-based planner regenerates it online as the object state changes.

My read: the central contribution is the boundary between planning and control. **CF-Gen** converts object-level goals into contact-aware references through hand-designed phase templates, geometry, IK, and interpolation. **CF-Track** is a unified reinforcement-learning policy that turns those references into low-level humanoid actions. Contact flow is the shared language that makes carrying, pushing, kicking, recovery, and skill chaining fit into one system.

## Paper Info

The paper is **"OmniContact: Chaining Meta-Skills via Contact Flow for Generalizable Humanoid Loco-Manipulation"** by **Runyi Yu, Xiaoyi Lin, Ji Ma, Yinhuai Wang, Koukou Luo, Jiahao Ji, Huayi Wang, Wenjia Wang, Runhan Zhang, Ping Tan, Ting Wu, Ruoli Dai, Qifeng Chen, and Lei Han**. The [paper](https://arxiv.org/abs/2606.26201), [project page](https://omnicontact.github.io/), [official MuJoCo execution repository](https://github.com/Ingrid789/OmniContact_sim2sim), and [OmniContact dataset](https://huggingface.co/datasets/lightcone02/OmniContact-Dataset) are public.

## The Problem: What Should a High-Level Planner Command?

Long-horizon loco-manipulation has two coupled problems. The robot needs a robust controller for individual interactions, and it needs a mechanism for composing those interactions while reacting to failed contacts or displaced objects.

Dense human-object trajectories precisely specify behavior, but they are expensive to synthesize and brittle under online changes. A symbolic command such as `carry(box, target)` is easy to plan, yet gives the low-level controller little information about where and when contact should happen. Latent skill embeddings are compact, although their semantics are difficult for an external planner to inspect and modify.

OmniContact chooses an intermediate representation: preserve the small set of future body targets required to express motion intent, and explicitly attach the contact timing that distinguishes manipulation from ordinary locomotion.

## Contact Flow

At time \(t\), contact flow is defined as

\[
F_t=\{(b_{t+k},c_{t+k})\}_{k\in\mathcal{T}},
\]

with non-uniform future offsets

\[
\mathcal{T}=\{0,1,2,3,4,8,12,16,24,32,50\}.
\]

Here \(b_{t+k}\) contains sparse future body targets, primarily torso, wrists, and ankles. The contact vector

\[
c_{t+k}\in\{0,1\}^{4}
\]

specifies binary contact states for four robot end effectors. Non-uniform sampling allocates more targets to the immediate future and fewer to longer-term intent.

This representation carries two kinds of information:

- **Where the body should move:** sparse future torso and end-effector targets.
- **When interaction should occur:** explicit contact/no-contact state for each end effector.

Contact flow does not contain contact force, pressure, or a dense physics trajectory. It describes intended contact mode and sparse kinematic goals. The low-level policy retains freedom to choose the remaining whole-body motion needed for balance and compliance.

The ablation strongly supports this design. Tracking torso and end effectors without contact reaches only **11.5%** success on the CF-Gen Carry Box evaluation. Adding binary contact raises success to **98.7%**. Adding dense object, joint-DoF, or full-body targets then hurts generalization because the controller becomes overconstrained. The successful interface is the compact set **torso + end effectors + contact**.

## CF-Track: The Learned Low-Level Executor

CF-Track is one unified policy for locomotion, carrying, pushing, sliding, relocating, kicking, and their transitions. Its input combines the target contact flow with a five-step observation history:

\[
x_t=[F_t,H_t],
\qquad
H_t=[o_t,\ldots,o_{t-4}].
\]

Each observation includes robot proprioception, base orientation, end-effector positions, the previous action, and the object's relative 6D pose and bounding box. The policy outputs low-level motor actions at 50 Hz. The actor and critic use Transformer networks.

CF-Track is trained with reinforcement learning using three reward families:

\[
r_t=lambda_{\text{track}}r_t^{\text{track}}
+\lambda_{\text{amp}}r_t^{\text{amp}}
+\lambda_{\text{reg}}r_t^{\text{reg}}.
\]

The tracking term follows sparse body, object, and contact-flow targets. The AMP adversarial motion prior encourages human-like whole-body motion. The regularization term penalizes abrupt action changes. The selected balance places most weight on tracking while retaining enough motion prior to smooth the artifacts of rule-generated references.

Pure tracking achieves relatively accurate motion but reduces disturbance stability. Giving the motion prior too much weight produces stable-looking behavior with almost no task success. This is a genuine control trade-off: the policy must obey contact intent strongly enough to finish the task while preserving enough behavioral flexibility to absorb imperfect plans and perturbations.

## CF-Gen: Rule-Based Contact-Flow Synthesis

CF-Gen is described as a lightweight, heuristic planner. It is not a learned trajectory generator. Each meta-skill has a hand-designed sequence of phases. Carrying, for example, is decomposed into approach, move to a hand-contact pose, lift, walk while maintaining contact, and release.

For each phase, CF-Gen performs four operations.

### 1. Select object-centric contact anchors

The planner uses object pose and dimensions to choose suitable contact faces and approach directions. It adapts wrist, torso, and ankle targets to object geometry, enabling the same carry or push template to handle different object sizes and initial poses.

### 2. Generate keyframes with selective IK

Locomotion phases mainly specify ankle goals and a nominal posture. Contact phases specify ankle and wrist targets, then solve constrained IK over pelvis height, pelvis pitch, and robot joints. The solver is limited to 20 iterations for real-time synthesis.

### 3. Interpolate a dense kinematic reference

Positions and joint values use linear interpolation, while pelvis orientation uses SLERP. This creates a continuous reference between phase keyframes.

### 4. Convert the reference into sparse contact flow

CF-Gen samples the interpolated trajectory at the non-uniform future offsets and transforms the targets into the current torso-yaw frame. CF-Track receives only the resulting sparse body targets and binary contact schedule.

This sequence is important: CF-Gen temporarily creates a dense reference internally, but the controller does not directly track the full joint trajectory. Contact flow discards unnecessary constraints before execution.

## Closed-Loop Chaining and Recovery

CF-Gen maintains a finite stage state containing the active object, selected meta-skill, phase, and target. When a phase finishes, it generates the next contact-flow segment. Multi-stage tasks are built by switching objects and meta-skills at stage boundaries.

During execution, CF-Gen monitors the observed and predicted object state at 50 Hz:

\[
\delta_t=d(x^{\text{obj}}_{t,\text{obs}},x^{\text{obj}}_{t,\text{pred}}).
\]

If \(\delta_t\) crosses a threshold, the planner aborts the current reference and replans from the observed state. A dropped or displaced box can therefore trigger a new approach and contact sequence.

Online replanning raises Push Suitcase from **82.5% to 94.5%**, Stack Boxes from **56.6% to 80.5%**, and Push-Stack Boxes from **76.5% to 84.5%**. The paper also notes an important nuance: most of this gain comes from refreshing future segments with updated object states. Full emergency recovery is triggered relatively rarely.

Under deliberately injected failures, recovery reaches **92.5%** after dropping a carried box, **97.5%** after offsetting its pose, and **89.5%** after offsetting a pushed suitcase, with roughly 1.5-1.8 replans per trial.

## OmniContact Dataset

The authors collect a synchronized MoCap human-object interaction dataset tailored to long-horizon loco-manipulation. It contains:

- **1,274 valid sequences** and **22.29 hours** of motion;
- **7.22 million object frames** captured at **90 Hz**;
- synchronized BVH human motion and rigid-object 6D trajectories;
- carry, push, relocate, slide, and kick primitives;
- primitive-level contact modes and task-level language descriptions.

The average sequence lasts **62.98 seconds** and moves the object **19.76 meters**, emphasizing long-range transport. The dataset has fewer objects and sequences than OMOMO, but longer clips, higher temporal resolution, and explicit loco-manipulation structure. Scaling CF-Track training data from 2.2 to 22.3 hours improves both success and object accuracy.

The dataset does not provide measured contact forces. Contact supervision is constructed from synchronized body/object trajectories, binary contact modes, and dynamic/static phase annotations.

## Main Results

In the randomized simulation benchmark, OmniContact reaches:

- **98.7%** on Carry Box;
- **82.5%** on Push Suitcase;
- **56.5%** final-stage success on stacking three boxes;
- **76.5%** final-stage success on Push-Stack Boxes.

The baselines perform much worse on interaction and chaining. PhysHSI reaches 87% on Carry Box but fails at the final stacking stage. LessMimic reaches 34% on Carry Box and 12.5% on Push Suitcase, with 0% final success on the chained tasks. OmniContact's main empirical advantage is therefore composition under object-pose variation, not basic locomotion; several baselines already perform well on locomotion-only evaluation.

The additional tasks include Relocate Ball, Slide Box, Kick Ball, Relocate-then-Kick, and Push-then-Relocate. Long-duration experiments show perfect 40-minute survival when repeatedly resampling goals for one object under the easiest protocol. Survival drops to 29.5% at 40 minutes when both initial and final object goals are repeatedly resampled, and becomes harder with multiple interacting objects. These extended results give a more calibrated picture than the headline 40-minute demonstration.

## Real-World Deployment

The learned policy is deployed on a **Unitree G1**. The controller runs at 50 Hz, and a Noitom motion-capture system tracks the robot pelvis and manipulated object at 100 Hz to provide global poses. Before hardware deployment, the policy is checked through Isaac Lab-to-MuJoCo sim-to-sim transfer.

The real-world demonstrations show that the controller can execute the behaviors on hardware, but the main quantitative tables are simulation results. The deployment also relies on external MoCap for robot/object pose; this is not yet a vision-only autonomous loco-manipulation system.

The public repository currently focuses on MuJoCo execution. It includes an ONNX policy, CF-Gen references, scripted skill and skill-chaining runners, and an interactive joystick-based state-switching path that mirrors sim-to-real deployment.

## VLM Integration

A VLM can receive a rendered scene and language instruction, then output an ordered list of object-level goals and available meta-skills. For example, it can decompose “arrange the boxes into a heart” into repeated carry/place subgoals. CF-Gen grounds each subgoal into contact anchors and contact flow; CF-Track executes it.

The VLM never predicts joint trajectories, contact timing, or low-level actions. Its role is semantic decomposition. The paper presents this integration qualitatively, including heart-shaped layouts and multi-object arrangements. These examples demonstrate interface compatibility; an end-to-end trained vision-language-control model remains outside the paper's scope.

## What Is Actually New?

OmniContact combines several familiar components: MoCap imitation, AMP-style reinforcement learning, hand-designed state machines, object-centric geometry, IK, interpolation, and online replanning. Its main design contribution is how these components communicate.

Contact flow is compact enough for a planner to synthesize and edit online, explicit enough to represent contact timing, and sparse enough to leave the RL controller freedom over whole-body execution. The system separates:

- **What interaction should happen:** meta-skill, object goal, contact anchors, and binary contact schedule.
- **How the humanoid physically realizes it:** balance, gait, compliant adaptation, and low-level motor actions.

The strongest ablation is the jump from 11.5% to 98.7% after adding explicit contact state to torso and end-effector targets. That result supports contact flow as a useful planning-control interface more directly than the headline VLM examples do.

## Limitations

CF-Gen depends on manually designed phase templates, contact-anchor rules, thresholds, and task-specific geometry logic. The authors report that it struggles in highly dynamic settings and propose learning contact-anchor generation in future work. The G1's underactuated grippers restrict fine manipulation, and contact flow has not yet been extended to dexterous hands.

The approach assumes access to accurate object pose and dimensions. Real deployment uses external MoCap, while VLM demonstrations operate on rendered scenes and qualitative task decomposition. Broader visual perception, uncertain geometry, force-aware contact, and unstructured real-world recovery remain open. The baseline comparison also requires task-specific adaptations because several methods do not natively support autonomous approach, release, or chaining.

## Takeaway

OmniContact is best understood as a **hierarchical humanoid control interface**. It does not ask one model to invent long-horizon motion from language. A semantic planner selects object-level goals; CF-Gen turns them into sparse future body targets and contact schedules; CF-Track converts those targets into stable whole-body control; observed object-state errors close the loop through replanning.

The useful idea is simple: for loco-manipulation, sparse pose targets are too ambiguous, while dense whole-body trajectories are too restrictive. Adding an explicit contact timeline creates a middle representation that can be planned, composed, tracked, and repaired online.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**OmniContact** 为长时程 humanoid loco-manipulation 提出了一种紧凑的中间接口。高层规划器无需生成 dense whole-body motion，只要输出稀疏身体目标和二值接触时序。学习到的控制器负责执行这段 **contact flow**；当物体状态变化时，规则规划器在线重新生成 contact flow。

我的理解是：论文最核心的贡献在规划与控制的边界设计。**CF-Gen** 通过手工 phase templates、物体几何、IK 和 interpolation，把 object-level goal 转换成 contact-aware reference。**CF-Track** 是统一的强化学习策略，把 reference 转成 humanoid low-level actions。Contact flow 是两者之间的共同语言，让 carry、push、kick、recovery 和 skill chaining 可以进入同一套系统。

## 论文信息

论文题目是 **"OmniContact: Chaining Meta-Skills via Contact Flow for Generalizable Humanoid Loco-Manipulation"**，作者为 **Runyi Yu, Xiaoyi Lin, Ji Ma, Yinhuai Wang, Koukou Luo, Jiahao Ji, Huayi Wang, Wenjia Wang, Runhan Zhang, Ping Tan, Ting Wu, Ruoli Dai, Qifeng Chen, and Lei Han**。目前[论文](https://arxiv.org/abs/2606.26201)、[项目主页](https://omnicontact.github.io/)、[官方 MuJoCo 执行仓库](https://github.com/Ingrid789/OmniContact_sim2sim)和 [OmniContact dataset](https://huggingface.co/datasets/lightcone02/OmniContact-Dataset)均已公开。

## 问题：高层规划器应该输出什么？

长时程 loco-manipulation 包含两个耦合问题：机器人要稳定执行单个 interaction，还要能够组合多个 interaction，并在接触失败或物体被移动后继续完成任务。

Dense human-object trajectory 能精确描述动作，但在线合成成本高，对环境变化也比较脆弱。`carry(box, target)` 这样的 symbolic command 容易规划，却没有告诉底层控制器应该在哪里、何时建立接触。Latent skill embedding 很紧凑，其语义难以被外部 planner 检查和修改。

OmniContact 选择中间层表示：保留表达运动意图所需的少量未来 body targets，再显式加入 manipulation 区别于普通 locomotion 的 contact timing。

## Contact Flow

在时间 \(t\)，contact flow 定义为

\[
F_t=\{(b_{t+k},c_{t+k})\}_{k\in\mathcal{T}},
\]

其中非均匀 future offsets 为

\[
\mathcal{T}=\{0,1,2,3,4,8,12,16,24,32,50\}.
\]

\(b_{t+k}\) 表示稀疏 future body targets，主要包含 torso、wrists 和 ankles。Contact vector

\[
c_{t+k}\in\{0,1\}^{4}
\]

表示机器人四个 end effectors 的二值 contact states。Non-uniform sampling 在短期未来放置更多 targets，同时用少量远期目标表达长期意图。

这个表示携带两类信息：

- **身体应该去哪里**：未来 torso 和 end-effector 的稀疏目标。
- **什么时候发生 interaction**：每个 end effector 的 contact/no-contact 状态。

Contact flow 不包含 contact force、pressure 或 dense physics trajectory。它描述预期 contact mode 和稀疏 kinematic goals，剩余 whole-body motion 由底层策略根据平衡和 compliance 自行决定。

消融实验很有说服力。只跟踪 torso 和 end effectors 时，CF-Gen Carry Box evaluation 的成功率只有 **11.5%**；加入 binary contact 后上升到 **98.7%**。继续增加 dense object、joint-DoF 或 full-body targets 会过度约束控制器，反而削弱 generalization。最终有效的接口是 **torso + end effectors + contact**。

## CF-Track：学习到的底层执行器

CF-Track 是一个统一策略，覆盖 locomotion、carry、push、slide、relocate、kick 及其切换。输入由目标 contact flow 和五步 observation history 组成：

\[
x_t=[F_t,H_t],
\qquad
H_t=[o_t,\ldots,o_{t-4}].
\]

每个 observation 包含机器人 proprioception、base orientation、end-effector positions、previous action，以及物体的 relative 6D pose 和 bounding box。策略以 50 Hz 输出 low-level motor actions，actor 和 critic 使用 Transformer networks。

CF-Track 使用 reinforcement learning 训练，包含三类奖励：

\[
r_t=lambda_{\text{track}}r_t^{\text{track}}
+\lambda_{\text{amp}}r_t^{\text{amp}}
+\lambda_{\text{reg}}r_t^{\text{reg}}.
\]

Tracking term 跟踪稀疏身体、物体和 contact-flow targets；AMP adversarial motion prior 维持接近人类的 whole-body motion；regularization term 惩罚突然变化的 action。最终配置让 tracking 占主要权重，同时保留足够的 motion prior，用来平滑规则生成 reference 中的动作瑕疵。

Pure tracking 可以得到比较准确的 motion，却会降低扰动下的稳定性。Motion prior 权重过高则会产生稳定、自然的动作，但任务几乎无法成功。这里存在真实的控制权衡：策略既要强力服从 contact intent 来完成任务，也要保留足够自由度来吸收 imperfect plan 和 perturbation。

## CF-Gen：规则式 Contact-Flow Synthesis

论文把 CF-Gen 定义为 lightweight heuristic planner，它并不是学习到的 trajectory generator。每个 meta-skill 都有手工设计的 phase sequence。例如 carry 会被分解为 approach、移动到 hand-contact pose、lift、保持接触并行走、release。

每个 phase 中，CF-Gen 依次完成四项操作。

### 1. 选择 object-centric contact anchors

Planner 根据 object pose 和 dimensions 选择适合的接触面及 approach direction，并调整 wrist、torso 和 ankle targets，使同一 carry 或 push template 能适应不同物体尺寸和初始位置。

### 2. 使用 selective IK 生成 keyframes

Locomotion phases 主要指定 ankle goals 和 nominal posture。Contact phases 会指定 ankle 和 wrist targets，再对 pelvis height、pelvis pitch 和 robot joints 求 constrained IK。为满足实时性，solver 最多迭代 20 次。

### 3. 插值得到 dense kinematic reference

Position 和 joint values 使用 linear interpolation，pelvis orientation 使用 SLERP，在 phase keyframes 之间形成连续 reference。

### 4. 把 reference 转换成 sparse contact flow

CF-Gen 按非均匀 future offsets 对 interpolated trajectory 采样，并把 targets 转换到当前 torso-yaw frame。CF-Track 最终只接收稀疏 body targets 和 binary contact schedule。

这里有一个重要细节：CF-Gen 内部会暂时产生 dense reference，但 controller 不直接跟踪完整 joint trajectory。Contact flow 会在执行前丢弃多余约束。

## Closed-Loop Chaining 与 Recovery

CF-Gen 维护一个 finite stage state，记录 active object、selected meta-skill、phase 和 target。一个 phase 结束后，它生成下一段 contact flow。Multi-stage task 通过在 stage boundary 切换 object 和 meta-skill 完成。

执行时，CF-Gen 以 50 Hz 比较 observed 和 predicted object state：

\[
\delta_t=d(x^{\text{obj}}_{t,\text{obs}},x^{\text{obj}}_{t,\text{pred}}).
\]

如果 \(\delta_t\) 超过阈值，planner 会中止当前 reference，并从 observed state 重新规划。箱子掉落或被移动后，系统可以重新生成 approach 和 contact sequence。

Online replanning 把 Push Suitcase 从 **82.5% 提高到 94.5%**，Stack Boxes 从 **56.6% 提高到 80.5%**，Push-Stack Boxes 从 **76.5% 提高到 84.5%**。论文同时指出：大部分提升来自根据新 object state 刷新后续 segments，完整 emergency recovery 实际触发次数较少。

在主动注入失败的实验中，carry box 掉落后的恢复成功率为 **92.5%**，box pose offset 后为 **97.5%**，push suitcase pose offset 后为 **89.5%**，平均每次需要约 1.5-1.8 次 replans。

## OmniContact Dataset

作者采集了一个面向长时程 loco-manipulation 的同步 MoCap human-object interaction dataset，包含：

- **1,274 条 valid sequences**，总计 **22.29 小时**；
- 以 **90 Hz** 捕捉的 **7.22 million object frames**；
- 同步 BVH human motion 和 rigid-object 6D trajectories；
- carry、push、relocate、slide 和 kick primitives；
- primitive-level contact modes 和 task-level language descriptions。

平均每条 sequence 长 **62.98 秒**，物体平均移动 **19.76 米**，数据重点是 long-range transport。相比 OMOMO，它的 objects 和 sequences 更少，但 clips 更长、时间分辨率更高，而且包含显式 loco-manipulation structure。把 CF-Track training data 从 2.2 小时扩展到 22.3 小时后，成功率和 object accuracy 都继续提高。

数据集没有 measured contact forces。Contact supervision 来自同步 body/object trajectories、binary contact modes 和 dynamic/static phase annotations。

## 主要结果

在 randomized simulation benchmark 中，OmniContact 达到：

- Carry Box：**98.7%**；
- Push Suitcase：**82.5%**；
- 三个箱子 stacking 的 final-stage success：**56.5%**；
- Push-Stack Boxes final-stage success：**76.5%**。

Baselines 在 interaction 和 chaining 上明显更弱。PhysHSI 的 Carry Box 为 87%，但 stacking 最终阶段失败；LessMimic 在 Carry Box 和 Push Suitcase 上分别为 34% 和 12.5%，chained tasks 最终成功率为 0%。OmniContact 的主要优势是 object-pose variation 下的 composition；它并不以 basic locomotion 为主要贡献，多种 baseline 在 locomotion-only evaluation 中已经表现很好。

Additional tasks 包含 Relocate Ball、Slide Box、Kick Ball、Relocate-then-Kick 和 Push-then-Relocate。长时间实验中，最简单 protocol 对同一物体不断重采样目标，40 分钟 survival 为 100%。如果反复重采样 object initial/final goals，40 分钟 survival 会降到 29.5%；多个物体互相干扰时更困难。这组 extended results 比单独的“运行约 40 分钟”更完整。

## 真实机器人部署

学习到的策略部署在 **Unitree G1** 上。Controller 以 50 Hz 运行，Noitom motion-capture system 以 100 Hz 跟踪 robot pelvis 和 manipulated object，提供 global poses。硬件部署前还进行了 Isaac Lab 到 MuJoCo 的 sim-to-sim 检查。

真实演示说明 controller 能在硬件上执行这些动作，但主要 quantitative tables 来自 simulation。部署还依赖 external MoCap 获取 robot/object pose，因此目前还不是 vision-only autonomous loco-manipulation system。

公开仓库当前主要提供 MuJoCo execution，包括 ONNX policy、CF-Gen references、scripted skill/skill-chaining runners，以及模拟 sim-to-real switching 的 joystick interactive execution path。

## VLM 集成

VLM 接收 rendered scene 和 language instruction，输出有序 object-level goals 与可用 meta-skills。例如，它可以把“把箱子排列成心形”分解成多次 carry/place subgoals。CF-Gen 把每个 subgoal grounding 成 contact anchors 和 contact flow，CF-Track 再负责执行。

VLM 不预测 joint trajectories、contact timing 或 low-level actions，它只负责 semantic decomposition。论文以 heart-shaped layout 和多物体排列进行定性展示。这些例子验证了接口兼容性；端到端训练的 vision-language-control model 不在本文范围内。

## 真正的新设计是什么？

OmniContact 组合了多种已有组件：MoCap imitation、AMP-style reinforcement learning、hand-designed state machines、object-centric geometry、IK、interpolation 和 online replanning。它最主要的设计贡献是这些组件之间如何通信。

Contact flow 足够紧凑，可以由 planner 在线生成和修改；接触语义显式可读；稀疏 targets 又给 RL controller 留出了 whole-body execution 自由度。整个系统拆分了：

- **应该发生什么 interaction**：meta-skill、object goal、contact anchors 和 binary contact schedule。
- **Humanoid 如何在物理上实现它**：balance、gait、compliant adaptation 和 low-level motor actions。

最有说服力的消融是加入 explicit contact state 后，成功率从 11.5% 跳到 98.7%。相比吸引眼球的 VLM examples，这个结果更直接地支持 contact flow 作为 planning-control interface 的价值。

## 局限

CF-Gen 依赖人工设计的 phase templates、contact-anchor rules、thresholds 和 task-specific geometry logic。作者也承认它在 highly dynamic settings 中表现受限，未来希望学习 contact-anchor generation。G1 的 underactuated grippers 限制 fine manipulation，contact flow 也尚未扩展到 dexterous hands。

方法假设能够获得准确 object pose 和 dimensions。真实部署依赖 external MoCap；VLM demonstrations 使用 rendered scenes，主要验证 qualitative task decomposition。更广泛的 visual perception、uncertain geometry、force-aware contact 和 unstructured real-world recovery 仍未解决。Baseline comparison 还需要针对各方法做任务适配，因为部分方法原本不支持 autonomous approach、release 或 chaining。

## 总结

OmniContact 最适合被理解成一种 **hierarchical humanoid control interface**。系统没有让一个模型直接从语言生成完整 long-horizon motion。Semantic planner 选择 object-level goals，CF-Gen 把它们转换成稀疏 future body targets 和 contact schedules，CF-Track 将这些目标变成稳定 whole-body control，object-state error 再通过 replanning 闭合反馈回路。

核心想法很清楚：对于 loco-manipulation，只有 sparse pose targets 会产生歧义，dense whole-body trajectories 又会限制控制器。显式加入 contact timeline 后，就得到一个可以规划、组合、跟踪并在线修复的中间表示。

</div>
