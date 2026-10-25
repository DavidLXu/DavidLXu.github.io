---
title: "[Paper Notes] GPT-6 Astra Is a Native Visuo-Tactile Policy for Contact-Rich Manipulation"
date: 2026-10-25
permalink: /posts/2026/10/astra-visuo-tactile-policy-paper-notes/
excerpt: "Astra uses tactile images through its existing visual interface; these notes separate the modality gain from published baseline comparisons, small-sample effects, and control latency."
tags:
  - Multimodal Models
  - Tactile Sensing
  - In-Context Learning
  - Paper Notes
---

<div id="astra-en" data-lang="en" markdown="1">

## TL;DR

This paper feeds tactile RGB images directly into GPT-6 Astra alongside scene images, robot state, and demonstrations. The model outputs end-effector and gripper actions, observes the result, and chooses the next action sequence. No tactile-specific policy training is added by the study.

Across nineteen **simulated** tasks, visual-plus-tactile input reaches **93.8%** on UniVTAC and **81.8%** on OpenViTac. Vision-only scores are already 76.3% and 80.6%. The main finding is that image-based touch can contribute to direct multimodal control, with strongly task-dependent benefits and substantial response latency.

## Paper and reading version

**GPT-6 Astra Is a Native Visuo-Tactile Policy for Contact-Rich Manipulation** — Chen Yang, Linzhe Shi, Hang Zhang, Mu Xu, Jiansheng Fan, Chen Wang. These notes follow [arXiv:2610.26846v1](https://arxiv.org/abs/2610.26846v1), an arXiv preprint, checked on October 25, 2026. [PDF](https://arxiv.org/pdf/2610.26846v1)

The interface and protocol are described in Sections 3–4; Tables 1–4 and the trajectory analyses support the results discussed below. “Native” describes using the model's existing visual interface; it does not mean that the experiment has no demonstrations or robot-control adapter.

## Touch arrives as an image with an action history

At decision $t$, Astra receives a task instruction $g$, robot state $x_t$, scene views $I_t$, and, in the tactile condition, two fingertip contact images $T_t$. Its policy can be written as the paper's Equation 1:

$$
A_t\sim\pi(\cdot\mid g,\mathcal D,\mathcal M_t,x_t,I_t,T_t),
\qquad a=(\Delta p,\Delta r,u).
$$

The output contains translation and rotation increments and a gripper target. The adapter executes the sequence and returns an action receipt plus a new observation. An executed command is therefore separate from evidence that the object actually moved as intended.

Demonstration blocks contain an initial observation and state, recorded actions, an execution receipt, and the resulting observation. They remain available throughout the episode. Interaction memory keeps earlier anchors and the most recent feedback, with explicit markers for omitted intervals. This supports comparing a new contact pattern with both a demonstrated transition and the robot's own preceding attempt.

The model uses xhigh reasoning effort. Twelve tasks use one demonstration with twelve selected segments; six classification or selection tasks use two demonstrations with five segments each; Insert Block v2 uses three shape-specific demonstrations, each with five segments. UniVTAC uses released training recordings, while OpenViTac demonstrations come from its scripted experts.

## The cleanest comparison is vision versus vision plus touch

Both conditions share demonstrations, segment starts, recorded actions, and sampled test scenes. The vision-only setting removes tactile images from demonstrations and online observations. Robot state and task text remain available in both.

The study uses a stratified 10% sample with seed 42: 80 UniVTAC scenes and 130 OpenViTac scenes per condition. Most tasks have ten episodes; Insert Block v2 has thirty across three shapes. Means give equal weight to tasks, not to individual episodes.

| Suite | Published strongest specialist mean | Astra, vision | Astra, vision + touch |
|---|---:|---:|---:|
| UniVTAC, eight tasks | SimpleTouch 70.9% | 76.3% | 93.8% |
| OpenViTac, eleven tasks | OpenVTLA 68.7% | 80.6% | 81.8% |

The specialist results are taken from their benchmark reports. They were not freshly rerun on Astra's sampled scenes. One task also changes the success criterion: Grasp Chip accepts intact transfer and stable supported placement without requiring the original release-and-withdrawal sequence. These qualifications limit a strict head-to-head interpretation.

The observed tactile benefit is **17.5 points** on UniVTAC but only **1.2 points** on OpenViTac. Across nineteen task scores, touch improves six, leaves nine unchanged, and reduces four. Pull-out Key increases from 30% to 90%, and Insert Hole from 60% to 100%. Weight Classify drops from 50% to 40%, and Empty-Can Selection from 70% to 50%.

## Contact cues can guide a correction and still be ambiguous

In a successful hole-insertion trace, opposing slopes in fingertip contact bands and visible shaft deflection lead to a change in orientation while maintaining entrance contact. The resulting observation then guides another advance. This makes the proposed mechanism concrete: the contact image changes the next control decision.

Other traces expose the limits. Weak visible shear is interpreted as low weight even when the held object is heavy. Contact geometry and grip can change how much load appears in a tactile image. In a failed block insertion, the model recognizes misalignment but repeated correction commands do not produce the required motion. In Empty-Can Selection, prolonged probing leaves too little of the 400-action budget to finish transfer.

Selected trajectories demonstrate possible behaviors, not their frequency. Most task-condition scores use only ten episodes, so one outcome changes the score by ten percentage points.

Vision can also reveal texture or shape cues correlated with the physical property being classified. OpenViTac supplies fixed and wrist views for every task, while six UniVTAC tasks supply only the fixed camera. This may help explain the different marginal value of touch, but camera access was not independently randomized to test that explanation.

## The next contact correction waits for another response

For the evaluation phase, the paper logs **CNY 7,505.05** in provider-estimated costs across both conditions, including billed errors, retries, and reruns, while excluding demonstration preparation and supplementary experiments.

Median complete API response time is **15.4 seconds** for vision and **14.0 seconds** for vision plus touch; the respective 90th percentiles are 46.3 and 44.0 seconds. These are full response latencies, including provider and gateway waiting, with simulation execution excluded. A response can contain several control actions, but the next observation-dependent correction still waits for another response.

I read this as evidence for a useful sensory interface and a demanding benchmark baseline. Physical-robot validation remains open. A stronger follow-up would remove visual property shortcuts, retain matched evaluation scenes and criteria, and test whether a faster local controller can use the model's contact interpretation without waiting seconds between corrections.

</div>

<div id="astra-zh" data-lang="zh" markdown="1" style="display: none;">

## TL;DR

这篇论文把触觉 RGB 图像与场景图像、机器人状态和示范一起输入 GPT-6 Astra。模型输出末端执行器与夹爪动作，观察执行结果，再选择下一段动作。研究没有额外训练专门的触觉策略。

在十九项**仿真**任务上，视觉加触觉输入在 UniVTAC 达到 **93.8%**，在 OpenViTac 达到 **81.8%**；仅视觉已经分别达到 76.3% 和 80.6%。主要发现是图像形式的触觉能够参与通用多模态模型的直接控制，但收益高度依赖任务，而且响应时延仍然很大。

## 论文与阅读版本

**GPT-6 Astra Is a Native Visuo-Tactile Policy for Contact-Rich Manipulation**，作者：Chen Yang, Linzhe Shi, Hang Zhang, Mu Xu, Jiansheng Fan, Chen Wang。本文依据 [arXiv:2610.26846v1](https://arxiv.org/abs/2610.26846v1) 预印本，原文核验日期为 2026 年 10 月 25 日。[PDF 全文](https://arxiv.org/pdf/2610.26846v1)

接口与协议见第 3–4 节；下文结果依据 Tables 1–4 及轨迹分析。“Native” 指使用模型现有的视觉接口，不代表实验没有示范或机器人控制适配器。

## 触觉以图像形式进入带动作历史的上下文

每次决策时，Astra 接收任务指令 $g$、机器人状态 $x_t$、场景视图 $I_t$，在触觉条件下再加入两个指尖接触图像 $T_t$。论文公式 1 将策略写为：

$$
A_t\sim\pi(\cdot\mid g,\mathcal D,\mathcal M_t,x_t,I_t,T_t),
\qquad a=(\Delta p,\Delta r,u).
$$

输出包括平移增量、旋转增量和夹爪目标。适配器执行动作序列，再返回动作回执与新观测。“命令执行完毕”与“物体确实按预期移动”因此是两类证据。

示范块包含起始观测与状态、记录的动作、执行回执，以及结果观测，在整个回合中持续可用。交互记忆保留较早阶段的锚点和最近反馈，并明确标出省略区间。模型可以把当前接触与示范中的状态变化、以及自身上一轮尝试联系起来。

实验使用 xhigh 推理强度。十二项任务采用一条示范中的十二个片段；六项分类或选择任务采用两条示范，每条五个片段；Insert Block v2 为三种形状分别提供一条示范，每条五个片段。UniVTAC 使用发布的训练录像，OpenViTac 示范由其脚本专家产生。

## 最直接的对照是有无触觉输入

两种条件使用相同的示范轨迹、片段起点、记录动作和采样测试场景。仅视觉条件同时移除示范和在线观测中的触觉图像，但仍保留机器人状态与任务文本。

论文使用 seed 42 做分层 10% 抽样：每种输入条件包含 80 个 UniVTAC 场景和 130 个 OpenViTac 场景。大多数任务评测十次，Insert Block v2 在三种形状上共三十次。汇总时各任务等权，回合本身不等权。

| 基准 | 已发表的最强专用策略均值 | Astra，仅视觉 | Astra，视觉加触觉 |
|---|---:|---:|---:|
| UniVTAC，八项任务 | SimpleTouch 70.9% | 76.3% | 93.8% |
| OpenViTac，十一项任务 | OpenVTLA 68.7% | 80.6% | 81.8% |

专用策略成绩直接取自对应基准报告，没有在 Astra 的采样场景上重新运行。此外，Grasp Chip 调整了成功判据：完整转移并稳定承托芯片即可，不再要求原有的特定释放与撤离序列。因此，不能把表格理解为严格同条件下重新开展的直接对决。

触觉带来的平均提升，在 UniVTAC 为 **17.5 个百分点**，在 OpenViTac 只有 **1.2 个百分点**。十九项任务中，六项提高、九项不变、四项下降。Pull-out Key 从 30% 提高到 90%，Insert Hole 从 60% 提高到 100%；Weight Classify 从 50% 降到 40%，Empty-Can Selection 从 70% 降到 50%。

## 接触线索能够引导修正，也可能被误读

一次成功的插孔轨迹中，两侧指尖接触带的相反倾斜方向与可见的轴杆偏斜，促使模型保持入口接触并调整朝向，再根据新观测继续推进。这个案例具体展示了触觉图像如何改变下一步控制决策。

其他轨迹暴露了限制。模型把弱剪切变化解释成轻物体，但实际握住的是重物体；抓持方式和接触几何也会改变图像中呈现的载荷。一次方块插入失败中，模型识别出倾斜，却无法通过反复修正命令产生所需运动。Empty-Can Selection 中，长时间试探耗尽了 400 步动作预算的大部分，最终来不及完成转移。

选取的轨迹证明某种行为可以出现，无法说明其发生频率。多数任务条件只有十次评测，一次成败就会改变十个百分点。

视觉本身也可能泄露与物理属性相关的纹理或形状线索。OpenViTac 所有任务都提供固定和腕部视角，UniVTAC 则有六项任务仅提供固定相机。这或许解释了触觉边际收益的差异，但实验没有独立随机化相机访问来验证该解释。

## 下一次接触修正仍要等待模型响应

评测阶段，两种输入条件的服务商估算费用合计为 **7,505.05 元人民币**，包含已计费错误、重试和重跑，不含示范准备与补充实验。

完整 API 响应的中位时延，视觉条件为 **15.4 秒**，视觉加触觉为 **14.0 秒**；90 分位分别为 46.3 秒和 44.0 秒。统计包含服务商及网关等待，不含仿真执行。一次响应可以给出多个控制动作，但依赖新观测的下一次修正仍需等待下一次响应。

我把它视为一种有价值的感知接口证据，也是一项对现有基准提出挑战的结果。真机验证仍待完成。更有说服力的后续实验应消除视觉属性捷径，保持评测场景和判据一致，并测试快速局部控制器能否利用模型对接触的解释，减少连续修正之间数秒的等待。

</div>
