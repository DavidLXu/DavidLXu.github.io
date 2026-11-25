---
title: "[Paper Notes] DexLatentWorld: 3D Cross-Embodiment Latent Action World Models for Zero-Shot Robotic Manipulation"
date: 2026-11-25
permalink: /posts/2026/11/dexlatentworld-paper-notes/
excerpt: "A point-cloud world model plans motions for an unseen Sharpa Wave hand. Physical trials use recorded goal hand poses and reach 43 successes in 50 attempts."
tags:
  - Paper Notes
  - Dexterous Hands
  - World Models
  - Model Predictive Control
  - Point Clouds
---

<div data-lang="en" markdown="1">

Vinay Udit Mohan, Xuchuan Huang and Rolandos Alexandros Potamias · Imperial College London · November 23, 2026 · [arXiv preprint](https://arxiv.org/abs/2611.30907v1)

A grasp learned with one hand has to survive a change in finger lengths, joint limits and even finger count. DexLatentWorld represents an action by the motion it produces in a 3D scene. This lets a planner search for a desired change in hand geometry before converting that change into commands for a particular robot.

### Learning a shared motion from point clouds

The authors retarget H2O human demonstrations to eight robot hands. A time window from the original demonstration therefore has several geometrically different renditions of the same motion. An inverse-dynamics encoder reads point-cloud transitions and infers a latent action. A contrastive loss pulls matching windows across embodiments together. A forward model uses the latent sequence and initial cloud to predict displacements of hand, object and scene points. The training loss gives extra weight to moving points so that predicting a stationary table cannot dominate the objective.

At deployment, the cross-entropy method samples five-step latent sequences and scores their predicted outcomes against the goal. Fitting the selected hand points to the target robot’s kinematics yields wrist and finger commands. For the physical tests, the team recorded goal poses by arranging the robot manually. The controller executes three predicted targets, observes the scene again and replans. The transferred component is the world model. The executor still uses the new hand’s geometry and joint feedback. [Methods and appendix C.3](https://arxiv.org/pdf/2611.30907v1)

### What the unseen hand achieved

A UR7e arm equipped with a **Sharpa Wave** hand completed **43 of 50** physical trials without further model adaptation. With ten attempts per task it pushed a tissue box in 10, pushed an egg carton in 9, grasped and lifted a cup in 7, grasped a bottle in 9 and grasped a scarf in 8. The cup had to clear the table by at least 5 cm and stay held for three seconds. Bottle and scarf trials required a grasp. Those criteria help explain why the aggregate 86% is best read alongside the task counts. [Figure 7 and Table 16](https://arxiv.org/pdf/2611.30907v1)

There is a practical dependency in this result. Goal hand points are reconstructed in the robot base frame, so the experiment relies on consistent object placement. Locating an unfamiliar object and choosing a goal grasp for it would add another problem upstream of this planner.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

Vinay Udit Mohan、Xuchuan Huang、Rolandos Alexandros Potamias · 帝国理工学院 · 2026 年 11 月 23 日 · [arXiv 预印本](https://arxiv.org/abs/2611.30907v1)

把一种手上学到的抓取迁到另一种手，手指长度、关节限位乃至指头数都可能改变。DexLatentWorld 用一次动作在三维场景中产生的运动来表示动作。规划器可以先搜索手部几何应该如何变化，再把结果换算成目标机械手的控制指令。

### 从点云变化学到共用的动作

作者将 H2O 人手示范重定向到八种机械手，同一个时间窗口于是有了多种手型的对应运动。逆动力学编码器从点云变化中推断潜动作，对比损失拉近不同手型上对应窗口的表示。前向模型根据初始点云和潜动作序列，预测手、物体与环境各点的位移。训练时给运动点更高权重，避免静止桌面贡献的大量易预测点主导损失。

部署时，交叉熵法采样五步潜动作序列，按预测结果离目标有多近来筛选，再用目标手的运动学把选中点位拟合成手腕和手指指令。真机实验的目标由研究者手动摆好机器人并记录。控制器依次执行前三步，重新观察，再规划。这里跨手型迁移的是世界模型，执行端仍需新手的几何模型和关节反馈。[方法及附录 C.3](https://arxiv.org/pdf/2611.30907v1)

### 未见过的手实际完成了什么

UR7e 机械臂搭配训练中未出现的 **Sharpa Wave** 手，未经额外模型适配，在真机上完成 **43/50 次**。每项各试十次：推纸巾盒成功 10 次，推蛋盒 9 次，抓起并举杯 7 次，抓瓶子 9 次，抓围巾 8 次。杯子须离桌至少 5 厘米并保持三秒；瓶子和围巾以抓住为达标。读总体 86% 时，各项的成功条件也值得一起看。[图 7、表 16](https://arxiv.org/pdf/2611.30907v1)

目标手的点位是在机器人基座坐标系中恢复的，因此实验依赖物体摆放的一致性。面对随意摆放的陌生物体，定位物体并选择合适的目标抓姿，仍是这套规划器上游要解决的问题。

</div>
