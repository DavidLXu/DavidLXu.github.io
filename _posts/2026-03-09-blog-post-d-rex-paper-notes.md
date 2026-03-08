---
title: "[Paper Notes] D-REX: Differentiable Real-to-Sim-to-Real Engine for Learning Dexterous Grasping"
date: 2026-03-09
permalink: /posts/2026/03/d-rex-paper-notes/
tags:
  - Robotics
  - Dexterous Grasping
  - Sim2Real
  - Differentiable Simulation
  - Gaussian Splatting
  - Imitation Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**D-REX** is a real-to-sim-to-real framework for dexterous grasping that tries to solve a specific bottleneck in sim-to-real transfer: the simulator often has the wrong object physics, especially object mass. The paper combines:

- Gaussian-Splat-based object reconstruction for visually realistic digital twins
- a differentiable physics engine for **mass identification from robot interaction videos**
- human-video-to-robot-demo transfer for supervision
- a **force-aware grasping policy** conditioned on the identified mass

The key idea is simple but useful: if the simulator can infer the object's mass from real robot-object interactions, then the learned grasp policy can apply more appropriate grasp force and transfer more reliably to the real world.

## Paper Info

- **Title**: D-REX: Differentiable Real-to-Sim-to-Real Engine for Learning Dexterous Grasping
- **Authors**: Haozhe Lou, Mingtong Zhang, Haoran Geng, Hanyang Zhou, Sicheng He, Zhiyuan Gao, Siheng Zhao, Jiageng Mao, Pieter Abbeel, Jitendra Malik, Daniel Seita, Yue Wang
- **Affiliations**: University of Southern California, University of California Berkeley
- **Venue**: ICLR 2026 conference paper
- **arXiv**: [2603.01151](https://arxiv.org/abs/2603.01151)
- **Project page**: [drex.github.io](https://drex.github.io)

## 1. Motivation

The paper starts from a practical issue in robot learning:

- simulation is cheap and scalable for policy learning
- but sim-to-real performance depends heavily on whether the simulator matches real-world object dynamics
- geometry alone is not enough; **mass mismatch** often causes grasp failure because the required grasp force changes with object weight

The authors focus on building a pipeline that can recover a physically plausible digital twin from real observations, then use that twin to train better dexterous grasping policies.

## 2. What D-REX Does

D-REX has four main stages:

1. **Real-to-Sim reconstruction**: reconstruct scene/object geometry from RGB videos using Gaussian Splat representations, then derive collision meshes for simulation.
2. **Mass identification**: execute consistent robot actions in the real world and in simulation, then optimize object mass so the simulated trajectory matches the real one.
3. **Human-to-robot demo transfer**: recover human hand/object motion from RGB videos and retarget them into robot joint trajectories.
4. **Policy learning**: train a dexterous grasping policy conditioned on object geometry and identified mass.

This makes the pipeline a genuine "real-to-sim-to-real" loop instead of only using reconstruction for visualization.

## 3. Core Technical Idea

### 3.1 Differentiable mass identification

The central optimization target is to infer object mass `m` by minimizing the discrepancy between simulated and real trajectories:

```text
min_{m > 0} L_traj(m) = sum_t || s_t^sim(m) - s_t^real ||_2^2
```

where the object state `s = [p, q]^T` contains 3D position and quaternion orientation.

The simulator uses a differentiable rigid-body/contact model and computes gradients of the trajectory loss with respect to mass. The paper implements the state update with a semi-implicit Euler integrator so gradients can backpropagate through the dynamics rollout.

In effect, the robot pushes an object, the system compares simulated motion with real motion, and the mass is adjusted until the simulated motion becomes consistent with reality.

### 3.2 Human demonstration transfer

Human RGB videos are processed to estimate:

- articulated hand pose
- object pose through time

These are then retargeted to a robotic hand using Dex-Retargeting, producing robot-executable trajectories that serve as demonstrations for learning grasp poses.

### 3.3 Force-aware policy learning

The learned policy does not only predict hand joint positions. It also predicts force-related outputs and explicitly conditions on the identified object mass.

This is the main learning claim of the paper: **grasping should be mass-aware**, because a pose that works for a light object may fail for a heavy object if the applied force is not adjusted.

## 4. Why This Is Interesting

Many sim-to-real manipulation papers focus on:

- geometry reconstruction
- domain randomization
- direct imitation from human videos

D-REX argues that **physical parameter identification**, especially mass, should be part of the loop. That framing is useful because it turns "better reconstruction" into something task-relevant: the policy can exploit the recovered mass to learn force-aware grasps instead of only shape-aware grasps.

## 5. Experiments and Main Results

## 5.1 Mass identification

The paper evaluates mass identification by pushing objects with the same actions in the real world and in simulation, then optimizing mass from trajectory mismatch.

Reported findings:

- across diverse objects, percentage error ranges roughly from **4.8% to 12.0%**
- for objects with the same geometry but different internal densities, the estimated mass error is under **13 g**
- simulated trajectories with optimized mass match real trajectories much better than trajectories using an incorrect lighter mass

This is the strongest systems contribution in the paper: the differentiable engine appears accurate enough to recover task-relevant mass information from interaction data.

## 5.2 Force-aware grasping

The grasping experiments show that:

- policies trained for one mass perform well mainly on that mass
- mismatched mass leads to failures from too much or too little force
- policies using **identified mass** achieve performance comparable to policies using **ground-truth mass**

The cross-evaluation table is especially intuitive: train on one density, evaluate on another, and success drops sharply when mass no longer matches.

## 5.3 End-to-end tabletop grasping

The method is compared against:

- **DexGraspNet 2.0**
- **Human2Sim2Robot**

Across eight tabletop objects with different shapes and masses, D-REX reports consistently higher success rates and lower variance. The paper emphasizes that baseline performance degrades as objects get heavier, whereas the proposed force-aware policy remains more stable.

## 5.4 Runtime

The system is not lightweight, but it is practical as an offline pipeline:

- object reconstruction uses about **300-340 RGB images**
- offline reconstruction takes about **30-35 minutes** per object
- mass identification takes about **1.43-1.68 s per iteration**
- convergence is typically around **200 epochs**, or roughly **5-20 minutes**

This is acceptable if the goal is offline digital-twin construction followed by policy training.

## 6. Strengths

- Clear systems story: reconstruction, identification, demo transfer, and policy learning are tightly connected.
- Good task framing: identifying **mass** is a concrete and manipulation-relevant target.
- Differentiable physics is used for a meaningful downstream benefit rather than as a standalone novelty.
- The force-aware policy claim is experimentally interpretable: wrong mass leads to the wrong force.
- The pipeline uses only RGB observations plus robot interaction data, which is appealing from a deployment standpoint.

## 7. Limitations and Open Questions

- The identified physical parameter is mainly **mass**; other contact properties such as friction and compliance are still major contributors to sim-to-real error.
- The paper relies on several upstream components, including pose estimation, reconstruction, and retargeting, so the full pipeline may be brittle in harder settings.
- Runtime is clearly offline; this is not yet close to online adaptation.
- It is not obvious how well the approach scales to more contact-rich tasks such as in-hand reorientation or dynamic non-prehensile manipulation.
- The grasping policy is conditioned on a single inferred mass value, which may be too coarse for objects with complicated internal mass distributions.

## 8. Takeaways

My main takeaway is that the paper makes a strong case for **task-driven system identification** in dexterous manipulation. Instead of treating digital twins as purely visual assets, D-REX uses differentiable simulation to recover the part of physics that most directly matters for grasp success.

For robotics research, this suggests a useful recipe:

- reconstruct the object
- identify the missing physical parameters from interaction
- train the policy with those parameters explicitly in the loop

That is a more convincing route to sim-to-real transfer than relying on geometry reconstruction alone.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**D-REX** 是一个面向灵巧抓取的 real-to-sim-to-real 框架，核心想解决 sim-to-real 中一个非常实际的问题：仿真里的物体物理参数常常不对，尤其是**质量**。论文把以下几个部分串了起来：

- 基于 Gaussian Splat 的物体重建，用于构建视觉上逼真的数字孪生
- 基于**可微物理引擎**的质量识别，从真实机器人交互视频中反推出物体质量
- 从人类演示视频到机器人演示轨迹的迁移
- 一个以识别质量为条件的**力感知抓取策略**

核心思想很直接：如果仿真器能从真实交互中推断出物体质量，那么学到的抓取策略就能施加更合适的抓力，从而更稳定地迁移到真实世界。

## 论文信息

- **标题**: D-REX: Differentiable Real-to-Sim-to-Real Engine for Learning Dexterous Grasping
- **作者**: Haozhe Lou, Mingtong Zhang, Haoran Geng, Hanyang Zhou, Sicheng He, Zhiyuan Gao, Siheng Zhao, Jiageng Mao, Pieter Abbeel, Jitendra Malik, Daniel Seita, Yue Wang
- **机构**: University of Southern California, University of California Berkeley
- **发表**: ICLR 2026 conference paper
- **arXiv**: [2603.01151](https://arxiv.org/abs/2603.01151)
- **项目主页**: [drex.github.io](https://drex.github.io)

## 1. 研究动机

论文从机器人学习中的一个老问题切入：

- 仿真环境便宜、可扩展，适合做策略学习
- 但 sim-to-real 的效果高度依赖仿真是否真的贴近真实物体动力学
- 只有几何信息还不够，**质量不匹配**会直接导致抓取失败，因为不同重量需要不同抓力

作者希望构建一个流程：从真实观察中恢复更可信的数字孪生，再利用它训练更可靠的灵巧抓取策略。

## 2. D-REX 做了什么

D-REX 主要包含四个阶段：

1. **Real-to-Sim 重建**：从 RGB 视频中用 Gaussian Splat 重建场景和物体几何，再提取仿真所需的碰撞网格。
2. **质量识别**：在真实世界和仿真中施加相同机器人动作，通过最小化两者轨迹差异来优化物体质量。
3. **人类演示到机器人演示迁移**：从 RGB 视频恢复人手和物体运动，并重定向到机器人手的关节轨迹。
4. **策略学习**：训练一个以物体几何和识别质量为条件的灵巧抓取策略。

因此，这篇工作不是把重建只当成视觉展示，而是把它接入了完整的 real-to-sim-to-real 学习闭环。

## 3. 核心技术点

### 3.1 可微质量识别

最核心的优化目标是通过最小化仿真轨迹与真实轨迹之间的误差来估计质量 `m`：

```text
min_{m > 0} L_traj(m) = sum_t || s_t^sim(m) - s_t^real ||_2^2
```

其中物体状态 `s = [p, q]^T` 包含三维位置和四元数姿态。

仿真器采用可微的刚体与接触模型，并对轨迹损失关于质量求梯度。论文使用 semi-implicit Euler 积分来保证含接触动力学时的稳定性，同时允许梯度沿着 rollout 反向传播。

直观地说，就是让机器人去推动物体，系统把真实运动和仿真运动做对齐，再不断调整质量，直到仿真行为尽量接近真实世界。

### 3.2 人类演示迁移

人类 RGB 视频会被处理成：

- 手部关节与腕部位姿
- 物体随时间变化的位姿

随后通过 Dex-Retargeting 重定向到机器人手，得到可执行的机器人演示轨迹，用于监督抓取姿态学习。

### 3.3 力感知策略学习

这个策略不仅预测手部关节位置，还会输出与抓取力相关的量，并显式以识别出的物体质量为条件。

论文最重要的学习结论也在这里：**抓取策略应该感知质量**。因为同一个抓取姿态，对轻物体可能抓得过紧，对重物体则可能抓力不足。

## 4. 为什么这篇论文值得看

很多 sim-to-real 抓取工作更关注：

- 几何重建
- domain randomization
- 从人类视频直接模仿

D-REX 的观点是：**物理参数识别**，尤其是质量，应该进入整个闭环。这个视角很有价值，因为它把“更好的重建”变成了与任务直接相关的能力，也就是让策略能够利用估计出的质量去学会更合适的抓力，而不仅仅是感知形状。

## 5. 实验与主要结果

## 5.1 质量识别

论文通过 pushing 实验评估质量识别：在真实世界和仿真中执行相同动作，再根据轨迹误差优化质量。

主要结果包括：

- 面对不同几何形状的物体，质量估计百分比误差大约在 **4.8% 到 12.0%** 之间
- 对于几何相同但内部密度不同的物体，质量误差低于 **13 g**
- 使用优化后质量的仿真轨迹明显比使用错误较轻质量时更贴近真实轨迹

这是整篇论文最扎实的系统贡献之一：可微引擎看起来确实能够从交互数据中恢复对任务有意义的质量信息。

## 5.2 力感知抓取

抓取实验表明：

- 针对某一质量训练的策略，通常只在该质量附近表现最好
- 质量不匹配会导致抓力过大或过小，从而抓取失败
- 使用**识别质量**训练/条件化的策略，效果与使用**真实质量**的策略相当

其中最直观的是 cross-evaluation：在一种密度上训练、在另一种密度上测试，成功率会明显下降，说明质量信息对抓力控制非常关键。

## 5.3 端到端桌面抓取

论文将方法与两个基线进行比较：

- **DexGraspNet 2.0**
- **Human2Sim2Robot**

在 8 个几何和质量各异的桌面物体上，D-REX 的成功率整体更高、方差更小。论文特别强调，随着物体变重，基线方法性能下降更明显，而其力感知策略更加稳定。

## 5.4 运行开销

这套系统并不轻量，但作为离线流程是可接受的：

- 每个物体约需要 **300-340 张 RGB 图像**
- 离线重建约需 **30-35 分钟**
- 质量识别每次迭代约 **1.43-1.68 秒**
- 通常约 **200 个 epoch** 收敛，总体约 **5-20 分钟**

如果目标是先离线构建数字孪生，再做策略学习，这样的代价是现实可用的。

## 6. 优点

- 系统故事完整：重建、识别、演示迁移、策略学习彼此衔接紧密。
- 问题抓得准：把 **质量** 作为关键物理参数，非常贴合抓取任务。
- 可微物理不是单独炫技，而是服务于明确的下游收益。
- 力感知策略的实验解释性强：质量错了，抓力就会错。
- 只依赖 RGB 观测和机器人交互数据，部署视角上有吸引力。

## 7. 局限与开放问题

- 论文主要识别的是**质量**，而摩擦、柔顺性等接触参数同样会显著影响 sim-to-real。
- 这套方法依赖多个上游模块，包括位姿估计、重建和重定向，因此在更复杂场景下可能会比较脆弱。
- 运行方式明显偏离线，目前还谈不上在线快速自适应。
- 还不清楚它是否能顺利扩展到更复杂的接触任务，比如手内重定向或动态非抓持操作。
- 策略只条件化一个单一质量值；对于内部质量分布复杂的物体，这可能过于粗糙。

## 8. Takeaways

我对这篇论文的主要判断是：它很好地说明了**任务驱动的系统辨识**在灵巧操作中的价值。数字孪生不应该只是一个视觉上像真的物体，还应该恢复那些真正影响任务成败的物理量。

对机器人研究来说，这篇论文给出的配方很值得参考：

- 先重建物体
- 再通过交互识别缺失的物理参数
- 最后把这些参数显式放进策略学习闭环

相比只做几何重建，这样的 sim-to-real 路线更有说服力。

</div>
