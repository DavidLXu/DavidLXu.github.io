---
title: "[Paper Notes] Real2Worlds2Real: Scaling Self-Improving Agentic Real2Sim2Real for Robot Manipulation"
date: 2026-11-25
permalink: /posts/2026/11/real2worlds2real-paper-notes/
excerpt: "A Dexmate robot with Sharpa hands tests policies refined in reconstructed worlds. Separate comparisons examine the simulation used for refinement and the procedure for developing the policy."
tags:
  - Paper Notes
  - Sim-to-Real
  - Dexterous Hands
  - Robot Manipulation
  - Imitation Learning
  - Reinforcement Learning
---

<div data-lang="en" markdown="1">

Jinzhong Gu, Jiakai Chen, Xinyi Cao, Yan Shen, Hangke Sui and colleagues · November 23, 2026 · [arXiv preprint](https://arxiv.org/abs/2611.31098v1)

Inserting a gear and pulling a tissue from a dispenser both depend on how contact plays out after the fingers close. Real2Worlds2Real uses a physical **Dexmate robot with Sharpa dexterous hands** to ask whether a policy can learn those interactions in a scene reconstructed from real observations. Its main experimental distinction is between improving the simulated world and improving the policy inside that world.

### Two things the agent can change

Given images or video and a task description, an agent assembles a digital twin, tests whether the scene behaves plausibly, and revises geometry, collisions or physical properties using execution feedback. It can vary objects, layouts and backgrounds to create related training worlds. In these worlds, it can generate demonstrations with grasp optimization and motion planning, train a visuomotor policy, and collect corrections in states where the current policy fails. Validated procedures enter a reusable library for subsequent tasks.

Table 1a holds the refinement procedure constant. Each task starts from an ACT policy trained on **60 real demonstrations**. The compared methods use the same residual reinforcement-learning procedure and equal data budgets. The twin used for refinement changes. Over **30 physical trials per task**, the proposed worlds yielded **30/30** for peg insertion, **30/30** for stacking cups, **28/30** for gear insertion, **21/30** for retrieving a tissue and wiping, and **28/30** for tightening a bottle cap. Wiping leaves the largest gap, even though the hand hardware is shared across tasks. [Section 4.1 and Table 1a](https://arxiv.org/pdf/2611.31098v1)

### What the second comparison holds fixed

Table 1b gives each development method the authors’ simulation environments and access to the 60 real demonstrations. The proposed procedure reached **73.3%** on tightening a nut by five complete rotations and **100%** on cup stacking. Those numbers evaluate how the policy was developed inside a common environment. They answer a different question from the world-construction comparison.

A separate cup-stacking sweep fixes the demonstration count at 1,000 and expands the number of training worlds from 10 to 1,000. Performance improves on held-out scenes, giving a concrete reason to vary where the hand encounters an object even with a fixed collection budget. The sweep concerns one task. The real-robot results also include real demonstration data, which matters when estimating the cost of reproducing the transfer. [Table 1b and Figure 4](https://arxiv.org/pdf/2611.31098v1)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

Jinzhong Gu、Jiakai Chen、Xinyi Cao、Yan Shen、Hangke Sui 等 · 2026 年 11 月 23 日 · [arXiv 预印本](https://arxiv.org/abs/2611.31098v1)

把齿轮插入定位板和从盒里抽出纸巾，都取决于手指闭合后物体怎样受力、怎样运动。Real2Worlds2Real 在配备 **Sharpa 灵巧手的 Dexmate 真机**上检验，从真实观测重建的仿真环境能否用于学习这类接触操作。理解结果要分清两个实验变量：一组改变用于训练的仿真世界，另一组改变在同一世界里开发策略的方式。

### 智能体能改动什么

系统从图像或视频及任务描述出发，搭建数字孪生，在仿真里执行动作，借助反馈修改几何、碰撞或物理属性。改变物体、摆放和背景后，还能产生一批相关训练场景。智能体可以用抓取优化和运动规划生成示范，训练视觉运动策略，并在当前策略容易失败的状态补采纠正动作。经验证的流程保存在技能库中，供后续任务复用。

表 1a 固定了策略改进流程。每个任务都从用 **60 条真机示范**训练的 ACT 策略起步，各方法使用相同的残差强化学习流程和等量数据，比较的是用于改进策略的数字孪生。**每项真机测试 30 次**：插销和叠杯均为 **30/30**，插齿轮 **28/30**，抽纸并擦桌 **21/30**，拧瓶盖 **28/30**。同一套手在不同接触任务上的差距很大，取纸擦桌留下的改进空间最大。[第 4.1 节、表 1a](https://arxiv.org/pdf/2611.31098v1)

### 固定仿真环境之后

表 1b 给各开发方法提供作者构建的同一批仿真环境，并允许使用那 60 条真机示范。所提流程在要求拧满五圈的螺母任务上成功率为 **73.3%**，叠杯为 **100%**。这组数字衡量的是在给定环境里开发策略的效果，与上一组环境重建实验回答的问题不同。

作者还对叠杯单独做了规模实验。固定 1,000 条示范，把训练世界从 10 个增至 1,000 个，留出场景上的成功率随之提高。这给出了一个具体的数据采集思路：预算固定时，改变手与物体相遇的场景也能产生收益。这项趋势来自叠杯任务；估算真机迁移的复现成本时，也需要把真实示范的采集计入预算。[表 1b、图 4](https://arxiv.org/pdf/2611.31098v1)

</div>
