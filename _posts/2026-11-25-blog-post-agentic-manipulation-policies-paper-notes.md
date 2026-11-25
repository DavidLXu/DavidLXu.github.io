---
title: "[Paper Notes] On Agentic Manipulation Policies"
date: 2026-11-25
permalink: /posts/2026/11/agentic-manipulation-policies-paper-notes/
excerpt: "Apple’s AMP1 lets a general-purpose model inspect a scene and write robot motions in Python. Across 108 physical trials, it completed 104 with controller-error recovery and 94 with recovery disabled."
tags:
  - Paper Notes
  - Robot Manipulation
  - Vision-Language Models
  - Robot Policies
  - Closed-Loop Control
---

<div data-lang="en" markdown="1">

What should a foundation model do when a grasp misses? In Apple’s **AMP1**, the model can inspect the latest camera image, revise its estimate of the object’s position, and write Python to try a different approach. It makes these decisions throughout the episode. The same interface supports single-arm, bimanual and mobile manipulation in simulation. The physical experiments use three instances of a Franka Research 3 tabletop setup.

Omid Bagherieh, Naveen Nikamanth Appiah Balaji, Chen Chen and colleagues at Apple. The first eleven authors share equal credit. These notes follow the November 24, 2026 revision. [arXiv v4](https://arxiv.org/abs/2611.09892v4) · [Project, code and videos](https://apple-aiml-research.github.io/ml-amp/)

### From a camera image to a grasp

Consider the project’s simulated banana-and-bowl task. The model can request RGB images, depth, a fused point cloud and an editable scene model. The banana’s curvature creates a small but consequential problem. The centroid of its visible points can lie in empty space. In the walkthrough, the model chooses a measured point on the banana nearest that centroid as its grasp target. The interface supplies geometry. The model supplies the rule for choosing where to close the fingers. [Interactive walkthrough](https://apple-aiml-research.github.io/ml-amp/)

A Python interpreter keeps variables and functions alive between calls. The model specifies timed waypoints for the gripper and when to open or close it. The motion interface checks the proposed movement and reports execution feedback. On its next turn the model can inspect what moved, reuse an earlier estimate, or change its approach. The distinction matters for a slipping object. Once a trajectory starts, the model must wait for it to finish or be interrupted before it can revise the plan. [Methods §4A–B and discussion §3B](https://arxiv.org/html/2611.09892v4)

### What the success rates measure

On **RoboLab-120**, each of 120 simulated tasks has ten trials under the default wording. With the same AMP1 interface, Gemini 4 Argon completed **1,027/1,200 (85.6%)** and Opus 5.5 completed **994/1,200 (82.8%)**, both zero-shot. The strongest vision-language-action and world-action entries cited in those categories scored 49.2% and 42.9%, respectively. Simulation pauses during model reasoning, so these scores measure task completion within a motion budget. [Figure 2 and supplement §S6](https://arxiv.org/html/2611.09892v4)

On **physical hardware**, the authors ran each of twelve tasks three times on each of three arms per method. Opus 5.5 with AMP1 succeeded in **104/108 trials (96.3%)**. After a recoverable controller error, it could query the arm, request recovery and continue with a revised trajectory. The baseline deployments ended the trial on a controller error. Applying that termination rule to AMP1 gave **94/108 (87.0%)**. The reported success rates for π0.5 and FLUX 3 were 27.8% and 45.4%. [Table 1 and Table S1](https://arxiv.org/html/2611.09892v4)

### What the robot pays for another look

Depth and calibration affect how much work the model must do to locate an object. Removing both lowered Opus 5.5’s RoboLab success from 82.8% to 75.8%, while mean model calls per episode rose from 34.8 to 53.5. Some runs show the agent moving its wrist camera to obtain another view and reconstructing geometry from known gripper poses. Haiku 5.5 fell from 51.6% to 10.7% under the same removal. A sensor choice that mostly costs a stronger model extra turns can make the same task infeasible for a weaker one. [Section 2D.3](https://arxiv.org/html/2611.09892v4)

The paper also asks what can carry over to the next episode. On RoboDojo’s 42 bimanual tasks, the agent can write observations, strategies and reusable code to persistent memory after practice, with the model weights fixed. Practicing individual tasks raised success on held-out layouts from a 26.4% zero-shot baseline to 84.1%. That last number measures the benefit of previous attempts at the same task. [Section 2C](https://arxiv.org/html/2611.09892v4)

For a physical deployment, I would read completion rate alongside the time the arm spends waiting. Table 1 reports 280 seconds to completion for successful AMP1 trials, with 211 seconds assigned to reasoning and 69 to execution. The five-minute execution budget excludes reasoning time. A tabletop scene can stay put while the model checks a grasp. A moving target gives that same decision a deadline. [Table 1 and §§3B, 4F](https://arxiv.org/html/2611.09892v4)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

机械臂一把抓空，基模接下来能做什么？在苹果的 **AMP1** 中，模型可以看一眼最新的相机画面，重新估计物体的位置，再写一段 Python 换个方向去抓。整个任务中，每一轮都由模型决定接下来要看哪里、怎么动。作者用同一套接口在仿真中评测了单臂、双臂和移动操作，真机实验则在三套 Franka Research 3 桌面机械臂平台上完成。

作者为苹果的 Omid Bagherieh、Naveen Nikamanth Appiah Balaji、Chen Chen 等，前十一位作者贡献相同。本文依据 2026 年 11 月 24 日修订的版本。[arXiv v4](https://arxiv.org/abs/2611.09892v4) · [项目主页、代码与演示](https://apple-aiml-research.github.io/ml-amp/)

### 从相机画面到一个抓取点

项目页演示了一个仿真任务：把香蕉放进碗里。模型可以读取彩色图像、深度图、多视角融合点云，还可以修正感知模块给出的场景模型。香蕉的弧度带来一个实际问题。直接对可见点求平均，算出的质心可能落在弧线内侧的空处。演示里，模型先算质心，再从香蕉点云中找离质心最近的实测点，把夹爪对准那里。接口提供几何数据，选择抓取位置的规则则是模型当场写出来的。[交互式演示](https://apple-aiml-research.github.io/ml-amp/)

同一回合内，多次调用共用一个 Python 解释器，先前算出的坐标和写好的函数都可以继续用。模型给出夹爪要经过的位姿、到达时间和开合指令，运动接口检查轨迹并反馈执行情况。模型可以在下一轮查看物体实际移动了多少，再决定是否沿用先前的估计。这个闭环有明确的时间边界：一段轨迹开始执行后，模型要等它结束或被控制器中断，才能修改计划。如果物体正在滑落，下一轮观察就可能来得太迟。[方法 §4A–B、讨论 §3B](https://arxiv.org/html/2611.09892v4)

### 两组成功率各自衡量什么

**RoboLab-120 仿真**在默认指令措辞下有 120 项任务，每项运行 10 次。使用同一套 AMP1 接口，Gemini 4 Argon 零样本完成 **1,027/1,200 次（85.6%）**，Opus 5.5 完成 **994/1,200 次（82.8%）**。作者列出的视觉语言动作模型和世界动作模型中，两类最佳成绩分别为 49.2% 和 42.9%。模型推理时仿真暂停，因此这里衡量的是给定运动步数内的任务完成率。[图 2、补充材料 §S6](https://arxiv.org/html/2611.09892v4)

**真机实验**有 12 项任务。每种方法在三台机械臂上各做三遍，共 108 次。AMP1 搭配 Opus 5.5 成功 **104/108 次（96.3%）**。控制器触发可恢复的错误后，模型可以查询机械臂状态、请求恢复，再换一条轨迹继续。基线部署遇到控制器错误就结束该次试验。让 AMP1 同样在报错时结束，成绩为 **94/108（87.0%）**。π0.5 和 FLUX 3 的成功率分别为 27.8% 和 45.4%。[表 1、补充表 S1](https://arxiv.org/html/2611.09892v4)

### 多看一眼的代价

深度和标定信息决定了模型要花多少工夫才能定位物体。在 RoboLab 上同时移除这两项输入后，Opus 5.5 的成功率从 82.8% 降至 75.8%，平均每回合的模型调用次数从 34.8 次升至 53.5 次。作者观察到，模型有时会移动腕部相机换一个视角，结合已知的夹爪位姿恢复几何关系。在同样条件下，Haiku 5.5 的成功率从 51.6% 降至 10.7%。较强模型还能靠多几轮观测补回部分信息，较弱模型则很难完成任务。[§2D.3](https://arxiv.org/html/2611.09892v4)

一次尝试的经验也可以留给下一次。在 RoboDojo 的 42 项双臂任务上，模型练习后可以把观察、策略和可复用的代码写入持久记忆，模型权重保持固定。逐项练习以后，在同一任务的新布局上，成功率从零样本的 26.4% 升至 84.1%。后一个数字衡量的是做过同一任务后，对新布局的适应能力。[§2C](https://arxiv.org/html/2611.09892v4)

读真机结果时，我会把成功率和机械臂等待的时间放在一起看。按表 1 的统计，AMP1 成功完成任务耗时 280 秒，其中推理占 211 秒，执行动作占 69 秒。实验给各方法的五分钟执行预算只计算执行时间。桌上的物体可以等模型确认抓取位置，一旦目标开始移动，同一个判断就有了截止时间。[表 1、§3B、§4F](https://arxiv.org/html/2611.09892v4)

</div>
