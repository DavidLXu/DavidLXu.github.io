---
title: "[Paper Notes] Do as I Do: Dexterous Manipulation Data from Everyday Human Videos"
date: 2026-06-26
permalink: /posts/2026/06/do-as-i-do-paper-notes/
tags:
  - Robot Learning
  - Dexterous Manipulation
  - Human Videos
  - Retargeting
  - Sim-to-Real
---

<div data-lang="en" markdown="1">

**Do as I Do** is a complete video-to-robot-data pipeline for dexterous manipulation. It starts from ordinary monocular RGB videos of people manipulating objects, reconstructs 4D hand-object interaction, and retargets the recovered motion into executable trajectories for multi-fingered robot hands.

My read: the paper is strongest as a systems bridge between two worlds that usually stay separate. Vision foundation models recover a usable hand-object reference from messy human video. A dynamics-aware optimizer then turns that noisy reference into robot-complete manipulation data. The important shift is from treating human video as a vague prior to treating it as a source of physically replayable trajectories.

## Paper Info

The paper is **"Do as I Do: Dexterous Manipulation Data from Everyday Human Videos"** by **Bhawna Paliwal, Haritheja Etukuru, William Liang, Pieter Abbeel, Nur Muhammad "Mahi" Shafiullah, and Jitendra Malik** from UC Berkeley. It is available as [arXiv:2606.19333](https://arxiv.org/abs/2606.19333), with project page [do-as-i-do.com](https://do-as-i-do.com/) and code at [malik-group/do-as-i-do](https://github.com/malik-group/do-as-i-do).

## The Problem

Dexterous robot learning needs data, but the most scalable data is observational. Humans leave behind enormous amounts of manipulation video; robots need action-labeled, embodiment-specific trajectories. Teleoperation is slow and hardware-bound. Simulation can scale rollouts, but open-ended dexterous tasks are hard to specify with rewards and environments.

The paper frames this as the old "Do as I do" problem under modern constraints: reconstruct what the human did, then retarget it to a different body. The hard setting is everyday monocular RGB video. There is no depth, no motion capture, no known object mesh, no clean hand-object contact signal, and no robot action.

## Method Overview

The pipeline has two stages.

First, **reconstruction** estimates the human hand, object shape, object pose, and camera-aligned hand-object trajectory from RGB video. The hand side uses HaWoR. The object side uses SAM 3D for single-frame mesh generation and a guided-diffusion tracker that keeps object shape fixed while updating pose over time.

Second, **retargeting** takes the reconstructed hand-object trajectory and solves for a robot trajectory in simulation. The target embodiment in the paper is a 22-DoF Sharpa Wave hand, deployed with UR3e arms for real-world bimanual rollouts. The retargeting step is dynamics-aware: it optimizes in physics simulation, so the result must track the reference while respecting contact, gravity, object motion, and hand-object interaction.

This two-stage split matters because the reconstruction is inevitably noisy. The retargeter is designed around that reality and handles references far messier than clean MoCap.

## Object Tracking via Guided Diffusion

The most interesting reconstruction component is the SAM 3D-based object tracker. Applying SAM 3D independently to every frame gives inconsistent meshes and poses. Do as I Do instead anchors the object shape at one frame and uses flow-matching inference to sample pose updates conditioned on the current image and previous pose.

The paper writes the guided update as:

\[
x^s_t=(1-\alpha_s)(x^s_{t-\Delta}+\Delta v^s_\theta)+\alpha_s z^s_{\mathrm{ref}}(t),
\qquad
x^p_t=(1-\alpha_p)(x^p_{t-\Delta}+\Delta v^p_\theta)+\alpha_p z^p_{\mathrm{ref}}(t).
\]

Here \(x^s\) is the shape block, \(x^p\) is the pose block, and the reference interpolants pull the diffusion sample toward the fixed canonical shape and previous-frame pose. Shape guidance can stay high because objects are rigid. Pose guidance is adaptive: the method estimates object rotational velocity from 2D point tracks, then lowers or raises pose guidance depending on how much motion the object appears to have.

Per frame, the tracker samples multiple candidate poses and clusters them under a weighted SE(3) distance. Candidate selection by clustering performs about as well as log-likelihood scoring while avoiding the expensive trace computation needed for exact flow-model likelihood.

After tracking, the system aligns hand and object scales. HaWoR hand reconstruction and SAM 3D object reconstruction live in different scale conventions, so the method uses MoGe pointmaps and hand/object centroids to slide the object along its camera ray until the visible object position is consistent with the hand.

## Dynamics-Aware Retargeting

The retargeting stage begins with a kinematic hand retargeting reference, then runs MPPI-style sampling-based optimization in MuJoCo Warp. It plans every 0.5 seconds over a 3-second horizon, evaluates 1024 samples per planning step, and runs 32 optimization iterations. Rewards track object position/orientation, hand position/orientation, and finger joints, with penalties for excessive penetration.

The paper adds three pieces that make the optimizer robust to reconstructed references.

**Warmup steps.** A noisy first frame can put the robot hand and object in an unrecoverable state. The method prepends a warmup horizon where the object is temporarily held in place while the robot hand moves into a better configuration. Then the weld is released and normal simulation begins.

**Random force perturbation.** Some rollouts look good briefly but are dynamically fragile, such as balancing an object on fingertips. Random forces during sampled rollouts push the optimizer toward grasps that survive small disturbances.

**Transition reward.** Rest-to-in-hand and in-hand-to-rest transitions are discrete interaction events. Tracking loss alone is too soft when references are noisy, so the method adds a penalty when the object should be resting but lacks floor contact, or should be in-hand but lacks hand-object contact.

These additions are practical. They do not require hand-written grasp samplers or task-specific object heuristics; they use the same simulation optimizer and make it less brittle.

## Results

On reconstruction, Do as I Do improves over existing hand-object reconstruction and object-tracking baselines. On DexYCB it reports **0.71 F-5**, **0.93 F-10**, and **0.66 Chamfer distance**. On HOI4D it reports **0.72 F-5**, **0.91 F-10**, and **0.49 Chamfer distance**. On a 150-video in-the-wild benchmark, human raters prefer its object tracking over FoundationPose **67%** of the time, with **79%** win rate among non-tie judgments.

On retargeting, the gap is large. On reconstructed in-the-wild references, the annealed-sampling baseline succeeds **25%** of the time. Adding warmup raises success to **66%**; adding perturbation reaches **67%**; adding transition reward reaches **71%**. On clean OakInk2 MoCap references, the same sequence improves from **72%** to **81%**. This is a good sign: the new components help noisy internet-video references, yet they also improve cleaner human-object trajectories.

For real-world deployment, the pipeline produces **500 high-quality, human-verified dexterous manipulation trajectories** from internet videos, egocentric videos, and generated videos. The paper demonstrates real robot rollouts on 10 tasks including whisking, pouring, dusting, squeezing, tamping, erasing, stirring, hammering, spreading, and picking.

## Data Filtering Playbook

One especially useful section is the data-quality analysis. From 2,000 ten-second 100DOH clips, only **187** contain meaningful hand-object interaction. After removing boundary failures, shot-boundary issues, camera-motion failures, SAM 3D failures, and other problems, only **83 clips** remain suitable for reconstruction, about **4%** of the sampled data.

The practical message is blunt: internet video is huge, but usable robot-learning video is sparse after quality filtering. Scaling from human video needs serious preprocessing, not just a bigger crawler. The paper estimates roughly a **20x penalty** if one skips careful filtering.

## Strengths and Limitations

The strength of Do as I Do is end-to-end completeness. It goes from an everyday RGB video to robot rollouts with dexterous hands, and the key modules are chosen for open-world coverage: SAM 3D for objects, HaWoR for hands, MoGe for metric geometry, and sampling-based simulation optimization for retargeting.

The limitation is also clear. The method assumes rigid objects and reasonably accurate monocular depth. Monocular video has contact ambiguity: visual occlusion can look like physical touch. The reconstruction covers the hand and one object, so it misses scene constraints such as tables, obstacles, articulated supports, and container geometry. The final rollouts also inherit simulator mismatch, which bounds real-world reliability.

## Takeaway

Do as I Do is best read as a recipe for making human videos operational. The paper does not claim that human video directly gives robot actions. It builds a layered compiler: RGB video to 4D hand-object reference, reference to physically plausible robot trajectory, trajectory to real-world rollout.

For dexterous manipulation research, the key lesson is that video-scale data becomes useful only after representation and retargeting are designed together. Better object tracking alone is insufficient; better simulation optimization alone is also insufficient. The value comes from making the reconstruction noisy in the right format for a robust dynamics-aware retargeter.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**Do as I Do** 是一套面向灵巧操作的 video-to-robot-data pipeline。它从普通单目 RGB 人类操作视频出发，重建 4D hand-object interaction，再把恢复出的动作 retarget 成多指机器人手可以执行的轨迹。

我的理解：这篇最强的地方是把两个通常割裂的环节接起来。视觉 foundation models 从嘈杂的人类视频里恢复可用的手物参考轨迹；dynamics-aware optimizer 再把这个 noisy reference 变成 robot-complete manipulation data。关键变化是：人类视频不再只是模糊先验，而是被编译成可以物理回放的机器人轨迹。

## Paper Info

论文是 **"Do as I Do: Dexterous Manipulation Data from Everyday Human Videos"**，作者为 **Bhawna Paliwal, Haritheja Etukuru, William Liang, Pieter Abbeel, Nur Muhammad "Mahi" Shafiullah, and Jitendra Malik**，来自 UC Berkeley。论文链接是 [arXiv:2606.19333](https://arxiv.org/abs/2606.19333)，项目主页是 [do-as-i-do.com](https://do-as-i-do.com/)，代码在 [malik-group/do-as-i-do](https://github.com/malik-group/do-as-i-do)。

## 问题

Dexterous robot learning 需要数据，但最容易扩展的数据是 observational data。人类留下了大量操作视频；机器人需要的是带动作、带 embodiment、能执行的轨迹。遥操作很慢，而且绑定硬件。仿真可以大规模 rollout，但开放式灵巧操作很难写 reward 和环境。

论文把这个问题放回经典的 "Do as I do" 框架里：先重建人做了什么，再迁移到另一个身体上。难点在于这里的输入是 everyday monocular RGB video。没有 depth，没有 mocap，没有已知物体 mesh，没有干净的 hand-object contact signal，也没有 robot action。

## 方法概览

pipeline 分为两步。

第一步是 **reconstruction**，从 RGB video 估计人手、物体形状、物体姿态，以及相机坐标下的 hand-object trajectory。人手侧使用 HaWoR。物体侧使用 SAM 3D 做单帧 mesh generation，再用 guided-diffusion tracker 在保持物体形状固定的同时逐帧更新 pose。

第二步是 **retargeting**，把重建出的手物轨迹放进仿真里求机器人轨迹。论文中的目标 embodiment 是 22-DoF Sharpa Wave hand，真实部署时搭配 UR3e arms 做双臂 rollout。这个 retargeting 是 dynamics-aware 的：它在 physics simulation 里优化，所以输出轨迹既要跟踪 reference，也要满足接触、重力、物体运动和手物交互。

这个两阶段设计很重要，因为 reconstruction 一定有噪声。retargeter 的设计正是围绕这种 noisy reference 展开的，目标是处理比干净 MoCap 更混乱的输入。

## Guided Diffusion 物体跟踪

重建部分最有意思的是基于 SAM 3D 的 object tracker。如果逐帧独立运行 SAM 3D，每一帧会得到不一致的 mesh 和 pose。Do as I Do 先在 anchor frame 固定物体形状，再利用 flow-matching inference，在当前图像和上一帧 pose 的条件下采样新的物体 pose。

论文中的 guided update 是：

\[
x^s_t=(1-\alpha_s)(x^s_{t-\Delta}+\Delta v^s_\theta)+\alpha_s z^s_{\mathrm{ref}}(t),
\qquad
x^p_t=(1-\alpha_p)(x^p_{t-\Delta}+\Delta v^p_\theta)+\alpha_p z^p_{\mathrm{ref}}(t).
\]

这里 \(x^s\) 是 shape block，\(x^p\) 是 pose block，reference interpolants 会把 diffusion sample 拉向固定的 canonical shape 和上一帧 pose。由于物体被假设为刚体，shape guidance 可以保持较强。pose guidance 则是 adaptive 的：方法先用 2D point tracks 估计物体旋转速度，再根据物体运动幅度调节 pose guidance 强度。

每一帧 tracker 会采样多个 candidate poses，并用 weighted SE(3) distance 聚类。通过聚类选 pose 的效果接近 log-likelihood scoring，但避免了精确 flow-model likelihood 所需的昂贵 trace computation。

tracking 完成后，系统还要对齐手和物体的尺度。HaWoR 的 hand reconstruction 和 SAM 3D 的 object reconstruction 不在同一个尺度约定下，所以方法使用 MoGe pointmaps 与 hand/object centroids，把物体沿 camera ray 平移到与人手位置一致的深度。

## Dynamics-Aware Retargeting

retargeting 先用 kinematic hand retargeting 得到初始 reference，再在 MuJoCo Warp 中运行 MPPI-style sampling-based optimization。它每 0.5 秒 planning 一次，horizon 为 3 秒；每个 planning step 评估 1024 个 samples，优化 32 次。reward 跟踪 object position/orientation、hand position/orientation 和 finger joints，同时惩罚 excessive penetration。

论文加入了三个让 optimizer 适应 reconstructed references 的组件。

**Warmup steps。** noisy first frame 可能让机器人手和物体一开始就处于不可恢复状态。方法在 reference 前面添加一段 warmup horizon：物体临时被固定，机器人手先移动到更好的构型；随后释放 weld，进入正常仿真。

**Random force perturbation。** 有些 rollout 短时间看起来能跟踪，但动力学上很脆，比如物体只是勉强平衡在指尖。采样 rollout 时加入随机力，可以推动 optimizer 找到能承受小扰动的 grasp。

**Transition reward。** rest-to-in-hand 和 in-hand-to-rest 是离散交互事件。reference 有噪声时，tracking loss 对这些事件太软，所以方法增加 transition penalty：物体应该 resting 时必须有 floor contact，物体应该 in-hand 时必须有 hand-object contact。

这些组件都很实用。它们不需要手写 grasp sampler，也不依赖任务特定 object heuristic；它们仍然使用同一个 simulation optimizer，只是让优化过程更不脆。

## 实验结果

在 reconstruction 上，Do as I Do 超过了已有 hand-object reconstruction 和 object-tracking baselines。在 DexYCB 上，它报告 **0.71 F-5**、**0.93 F-10**、**0.66 Chamfer distance**。在 HOI4D 上，它报告 **0.72 F-5**、**0.91 F-10**、**0.49 Chamfer distance**。在 150 个 in-the-wild videos 上，人类评审有 **67%** 的时间更偏好它的 object tracking；去掉 tie 后 win rate 为 **79%**。

在 retargeting 上，提升很明显。对 reconstructed in-the-wild references，annealed-sampling baseline 的 success rate 是 **25%**。加入 warmup 后提升到 **66%**；加入 perturbation 后为 **67%**；加入 transition reward 后达到 **71%**。在更干净的 OakInk2 MoCap references 上，同一组组件把成功率从 **72%** 提到 **81%**。这说明这些组件不是只在 noisy internet-video reference 上补漏洞，在干净 human-object trajectory 上也有收益。

真实部署方面，pipeline 生成了 **500 条 high-quality、human-verified dexterous manipulation trajectories**，来源包括 internet videos、egocentric videos 和 generated videos。论文展示了 10 个真实机器人任务：whisking、pouring、dusting、squeezing、tamping、erasing、stirring、hammering、spreading 和 picking。

## 数据过滤 Playbook

论文里很有价值的一节是 data-quality analysis。作者从 100DOH 采样 2,000 个 10 秒 clips，其中只有 **187** 个真的包含 meaningful hand-object interaction。去掉出界、shot boundary、camera motion、SAM 3D failure 和其他问题后，只有 **83 clips** 适合进入 reconstruction，大约是 **4%**。

实践信息很直接：internet video 很大，但经过质量过滤后，真正可用于 robot learning 的视频很稀疏。想用人类视频 scale robot data，不能只靠更大的 crawler，还需要严肃的 preprocessing。论文估计，如果没有合适的 filtering，会有大约 **20x** 的有效数据损耗。

## 优点与限制

Do as I Do 的优点是端到端闭环完整。它从 everyday RGB video 出发，最终到 dexterous hand 的真实 rollout；关键模块也都服务于开放世界覆盖：SAM 3D 处理物体，HaWoR 处理手，MoGe 提供 metric geometry，sampling-based simulation optimization 处理 retargeting。

限制也很清楚。方法假设物体是刚体，并且单目 depth 预测足够准确。monocular video 有接触歧义：视觉遮挡可能看起来像真实接触。重建对象只包括手和一个物体，因此无法表达桌面、障碍物、铰接结构、容器几何等 scene constraints。最终 rollout 还会继承 simulator mismatch，这会给真实世界可靠性设置上限。

## Takeaway

Do as I Do 最适合看成一套让 human videos operational 的 recipe。论文没有声称人类视频直接给出 robot actions。它构建的是分层 compiler：RGB video 编译成 4D hand-object reference，reference 编译成物理可行的机器人轨迹，轨迹再进入真实机器人 rollout。

对 dexterous manipulation 研究来说，最重要的启发是：video-scale data 只有在 representation 和 retargeting 一起设计时才真正有用。单独改善 object tracking 不够，单独改善 simulation optimization 也不够；价值来自把 reconstruction 输出成一种适合 robust dynamics-aware retargeter 消化的 noisy-but-actionable reference。

</div>
