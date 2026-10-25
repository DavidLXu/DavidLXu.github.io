---
title: "[Paper Notes] Learning Adaptable Dexterous Skills via Hybrid Dexterous Mimicking"
date: 2026-10-25
permalink: /posts/2026/10/adadex-paper-notes/
excerpt: "AdaDex mixes motion tracking and perturbed-goal practice to learn adaptable dexterous skills from short demonstrations, with separate tests for tracking and complete goal success."
tags:
  - Dexterous Manipulation
  - Reinforcement Learning
  - Motion Retargeting
  - Paper Notes
---

<div id="adadex-en" data-lang="en" markdown="1">

## TL;DR

AdaDex learns an adaptable dexterous skill from one short hand–object motion reference. A shared goal-conditioned policy trains in two environment populations: one rewards accurate tracking, while the other perturbs states and goals so the policy must depart from the reference.

The combination preserves human motion structure while improving generalization. On similar unseen GRAB motions, tracking progress rises to **80.02%**, compared with **31.75%** for the tracking-only ablation. On random goals, however, AdaDex's complete ten-goal success rate is lower than SimToolReal's. The method improves the tradeoff; it does not lead every metric.

## Paper and reading version

**Learning Adaptable Dexterous Skills via Hybrid Dexterous Mimicking** — Yuxuan Kuang, Jiashun Wang, Yixuan Sun, Yufei Ye, Sungjae Park, Umar Iqbal, Katerina Fragkiadaki, Shubham Tulsiani. These notes follow [arXiv:2610.28628v1](https://arxiv.org/abs/2610.28628v1), an arXiv preprint, checked on October 25, 2026. [PDF](https://arxiv.org/pdf/2610.28628v1) · [Project](https://yuxuank.com/AdaDex/)

AdaDex is the method name for this paper. These notes focus on Sections 3–4, Tables 1–2, and Appendix C. It is distinct from papers using names such as AdaDexTrack.

## Replace the reference clock with a goal interface

Training starts with a short trajectory of wrist pose, hand configuration, and object pose, plus a watertight object mesh. The reference may come from motion capture or hand–object reconstruction from RGB(D) video.

The policy receives robot joint positions, wrist pose and velocity, object pose, and a Basis Point Set encoding of object geometry. Its goal has two parts:

$$
g_t=(g_t^w,g_t^o)\in SE(3)\times SE(3).
$$

It outputs a six-dimensional wrist increment and absolute finger-joint targets. The actor does not need the dense reference trajectory at deployment. A sequence of wrist and object goals can come from the original reference, a different trajectory, or a high-level planner.

This interface is important: tracking experience and off-reference practice must train the same actor on the same observation and action spaces. Otherwise, success in the tracking environments would not necessarily become a reusable goal-conditioned skill.

## Two environment distributions train the same behavior

Tracking environments initialize near sampled reference states and use a short look-ahead reference pose as the goal. Their dense reward includes object and wrist tracking, hand-link alignment, contact, and regularization:

$$
r_t^{\rm track}
=\sum_i w_i\exp(-\|e_t^i\|^2/\sigma_i^2)
+r_t^{\rm contact}+r_t^{\rm reg}.
$$

The object terms define task progress; hand and contact terms transmit approach direction, grasp configuration, finger gaiting, and release timing. Strict termination keeps the motion close to the reference. Adaptive reference-state sampling concentrates practice on phases where success remains variable.

Generalization environments perturb initial hand/object states and future goals much more strongly. Their objective combines sparse object success with **dense wrist guidance** and regularization:

$$
r_t^{\rm gen}
=\mathbf 1[\|p_t^o-g_t^{o,p}\|<\delta_p
\land \angle(R_t^o,g_t^{o,R})<\delta_R]
+r_t^{\rm wrist}+r_t^{\rm reg}.
$$

There is no finger-tracking term in this population. The shared policy must draw on finger behavior acquired from tracking while adapting to goals outside the demonstrated path. Calling the entire generalization reward sparse would omit the wrist guidance.

PPO optimizes rollouts from both populations:

$$
J(\theta)=p\,\mathbb E_{\rm track}\!\left[\sum_t\gamma^t r_t^{\rm track}\right]
+(1-p)\,\mathbb E_{\rm gen}\!\left[\sum_t\gamma^t r_t^{\rm gen}\right].
$$

The privileged critic receives simulator information and the reference during training; its reference input is zeroed in generalization environments. The actor uses the common goal interface without an explicit environment-type flag.

The training curriculum matters. Appendix C starts with tracking only, then uses a 50:50 TrackEnv/GenEnv mixture in Stage II. Thus the final hybrid objective follows an initial tracking phase. A single policy here means shared parameters across the two populations for a skill; the quantitative study still trains one policy per reference motion.

## Separate tracking progress from complete goal-sequence success

The main simulation benchmark selects twelve GRAB objects with three similar clips per object. One clip trains each policy and the other two test related unseen motions. Evaluation uses 128 rollouts per motion on a floating 22-DoF Arti-MANO hand with wrist control.

Tracking progress is the fraction of the clip completed before the first object-position error above 5 cm or orientation error above 20°. It is not a binary success rate.

| Setting | Tracking-only ablation | AdaDex |
|---|---:|---:|
| Seen-motion tracking progress | 97.47% | 96.74% |
| Similar unseen-motion tracking progress | 31.75% | 80.02% |

Adding generalization practice sacrifices a small amount of seen-motion tracking and produces a much larger improvement on related unseen motions. It still depends on the object-specific reference and training setup; this is not a universal policy trained once across arbitrary objects.

The random-goal test chains ten procedural goals. AdaDex achieves **51.80% goal progress**, versus SimToolReal's 44.60%, but **27.08% complete-sequence success**, versus 31.71%. More average progress does not guarantee more fully completed sequences. On nine reconstructed RGB-D references, reported mean tracking progress is 80.53%, compared with ManipTrans's 31.70%, using a relaxed failure rule that requires ten consecutive threshold violations.

## What transfers to a robot

The paper demonstrates transfer from Isaac Gym to MuJoCo and real hardware. Physical tests include both replaying simulated joint targets at original 30 Hz speed and closed-loop control. In the closed-loop case, FoundationPose estimates object pose using an object mesh, RGB images, and Fast-FoundationStereo depth. The policy also receives proprioceptive history and object geometry.

These demonstrations establish physical feasibility for selected grasps, reorientation, and tool behaviors. The main numerical comparisons remain simulation results; the paper does not provide a matching large real-robot success table. Object models, pose estimation, and system identification remain practical dependencies.

A high-level coding agent can generate wrist/object waypoints for downstream tasks while the skill handles finger control. My preferred follow-up would fix the planner and compare policies with and without generalization environments under the same pose-estimation errors. That would show whether the generalization gain survives the uncertainty introduced by the real perception pipeline.

</div>

<div id="adadex-zh" data-lang="zh" markdown="1" style="display: none;">

## TL;DR

AdaDex 从一段短暂的人手—物体运动参考中学习可适应目标变化的灵巧技能。一个共享的目标条件策略在两类环境中训练：一类奖励准确跟踪，另一类扰动初始状态和目标，要求策略偏离参考轨迹。

两种训练分布结合后，策略保留人类运动结构，并改善泛化。相似但未见过的 GRAB 动作上，跟踪进度达到 **80.02%**，仅跟踪消融为 **31.75%**。不过，随机目标测试中，AdaDex 完成全部十个目标的成功率低于 SimToolReal。方法改善了取舍，并未在所有指标上领先。

## 论文与阅读版本

**Learning Adaptable Dexterous Skills via Hybrid Dexterous Mimicking**，作者：Yuxuan Kuang, Jiashun Wang, Yixuan Sun, Yufei Ye, Sungjae Park, Umar Iqbal, Katerina Fragkiadaki, Shubham Tulsiani。本文依据 [arXiv:2610.28628v1](https://arxiv.org/abs/2610.28628v1) 预印本，原文核验日期为 2026 年 10 月 25 日。[PDF 全文](https://arxiv.org/pdf/2610.28628v1) · [项目主页](https://yuxuank.com/AdaDex/)

AdaDex 是这篇论文的方法名称。本文重点阅读第 3–4 节、Tables 1–2 和附录 C，与名称类似的 AdaDexTrack 属于不同工作。

## 用目标接口替代对参考时间轴的依赖

训练输入包括一段腕部位姿、手部配置与物体位姿轨迹，以及水密物体网格。参考可以来自运动捕捉，也可以来自 RGB(D) 视频中的人手—物体重建。

策略读取机器人关节位置、腕部位姿和速度、物体位姿，以及物体几何的 Basis Point Set 编码。目标包含两部分：

$$
g_t=(g_t^w,g_t^o)\in SE(3)\times SE(3).
$$

输出为六维腕部增量和绝对手指关节目标。部署时 actor 不需要密集参考轨迹，腕部与物体目标序列可以来自原始示范、另一条轨迹或高层规划器。

这个接口很关键：参考跟踪和偏离参考的练习必须使用同一个 actor，以及相同的观测、动作空间，才能把跟踪环境学到的行为转化成可复用的目标条件技能。

## 两种环境分布共同训练一种行为

跟踪环境在参考状态附近初始化，用短期前瞻参考位姿作为目标。密集奖励包含物体与腕部跟踪、手部链节对齐、接触和正则项：

$$
r_t^{\rm track}
=\sum_i w_i\exp(-\|e_t^i\|^2/\sigma_i^2)
+r_t^{\rm contact}+r_t^{\rm reg}.
$$

物体项定义任务进展，手部与接触项传递接近方向、抓型、换指和释放时机。严格终止条件让运动保持接近参考，自适应参考状态采样则把练习集中到成功与否仍有变化的阶段。

泛化环境对初始手部、物体状态和未来目标施加更强扰动，奖励由稀疏物体成功、**密集腕部引导**与正则项构成：

$$
r_t^{\rm gen}
=\mathbf 1[\|p_t^o-g_t^{o,p}\|<\delta_p
\land \angle(R_t^o,g_t^{o,R})<\delta_R]
+r_t^{\rm wrist}+r_t^{\rm reg}.
$$

这类环境不包含手指跟踪项，策略需要调用跟踪阶段学到的手指行为，同时适应示范之外的目标。将泛化奖励整体描述成稀疏奖励，会遗漏腕部引导。

PPO 使用两类环境的 rollout 优化：

$$
J(\theta)=p\,\mathbb E_{\rm track}\!\left[\sum_t\gamma^t r_t^{\rm track}\right]
+(1-p)\,\mathbb E_{\rm gen}\!\left[\sum_t\gamma^t r_t^{\rm gen}\right].
$$

训练时，特权 critic 可以访问仿真信息与参考轨迹，但在泛化环境中将参考输入置零。Actor 使用统一目标接口，不额外输入环境类型标志。

训练课程同样重要。附录 C 从纯跟踪阶段开始，第二阶段才使用 50:50 的 TrackEnv/GenEnv 混合。因此，混合目标之前还有初始跟踪训练。“一个策略”指某项技能在两类环境中共享参数，定量实验仍然为每条参考动作分别训练策略。

## 跟踪进度与完整目标序列成功率需要分开

主要仿真基准从 GRAB 选取十二种物体，每种有三条相似动作。一条用于训练，另外两条测试相似未见运动。每条动作评测 128 次，平台为带腕部控制的浮动式 22 自由度 Arti-MANO 手。

跟踪进度统计首次出现物体位置误差超过 5 cm 或旋转误差超过 20° 之前，已完成的轨迹比例。这不是二元成功率。

| 设置 | 仅跟踪消融 | AdaDex |
|---|---:|---:|
| 已见动作跟踪进度 | 97.47% | 96.74% |
| 相似未见动作跟踪进度 | 31.75% | 80.02% |

加入泛化练习后，已见动作跟踪略有损失，相似未见动作则明显改善。但结果依赖对应物体的参考与训练设置，不能理解为一次训练后即可控制任意物体的通用策略。

随机目标测试要求连续完成十个程序化目标。AdaDex 的**平均目标进度为 51.80%**，SimToolReal 为 44.60%；但**完整序列成功率为 27.08%**，低于 SimToolReal 的 31.71%。平均走得更远，不一定意味着更多回合全部完成。在九条 RGB-D 重建参考上，AdaDex 的平均跟踪进度为 80.53%，ManipTrans 为 31.70%；该测试采用更宽松的失败规则，需要连续十步超出阈值。

## 哪些能力迁移到了真机

论文展示了 Isaac Gym 到 MuJoCo，以及到真实硬件的迁移。真机测试同时包括按原始 30 Hz 速度重放仿真关节目标，以及闭环控制。闭环设置下，FoundationPose 结合物体网格、RGB 图像和 Fast-FoundationStereo 深度估计物体位姿，策略还读取本体感知历史与物体几何。

这些案例证明选定抓取、重定向和工具行为具备物理可行性。主要数值比较仍来自仿真，文中没有提供规模对应的大型真机成功率表。物体模型、位姿估计和系统辨识仍是实用依赖。

高层编程智能体可以生成腕部与物体路点，由技能策略负责手指控制。我更想做的后续实验是固定规划器，在相同位姿估计误差下比较有无泛化环境训练的策略，检验仿真中的泛化收益能否承受真实感知带来的不确定性。

</div>
