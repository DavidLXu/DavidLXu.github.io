---
title: "[Paper Notes] HIVE-Bench: Evaluating Patch-Level Visual Representations for Egocentric Robot Manipulation"
date: 2026-11-25
permalink: /posts/2026/11/hive-bench-paper-notes/
excerpt: "HIVE-Bench compares visual encoders on bimanual tasks. Keeping image patches strongly improves simulated GR1 hand control, while its physical robot experiments use grippers."
tags:
  - Paper Notes
  - Visual Representation Learning
  - Dexterous Hands
  - Bimanual Manipulation
  - Benchmarking
---

<div data-lang="en" markdown="1">

Qiwei Liang, Zhengtu Liang, Minghao Lai, Yikeng Chen and colleagues · November 23, 2026 · [arXiv preprint](https://arxiv.org/abs/2611.30813v1)

A camera can show that a cup is present while giving the policy too little information to align fingers to its rim. HIVE-Bench asks how much a robot policy can recover from the spatial features of a pretrained visual encoder. Its dexterous-hand evidence comes from the simulated RoboCasa-GR1 kitchens, where the action includes six coordinates for each hand, seven for each arm and three for the waist.

### Which visual information reaches the policy?

The study compares 20 encoders from seven families across 24 bimanual tasks, split evenly between RoboCasa-GR1 and RoboTwin 2.0. RoboTwin uses two grippers. A common flow-matching policy reads the visual features, so changes to token pooling, extraction layer or encoder adaptation can be evaluated with the same type of action head.

One controlled comparison keeps the encoder frozen and retrains the head after replacing all patches in a camera view with their mean. On the **multitask RoboCasa** policy, DINOv2 fell from **32.28% to 9.94%** and DINOv3 from **31.22% to 6.44%**. Pooling hurt in 23 of the 24 encoder–task pairs across these two encoders. This is a test of a particular compression rule. Averaging removes the explicit spatial arrangement that the action head could otherwise use. Learned compression is a separate experiment. [Figure 4 and appendix C.2](https://arxiv.org/pdf/2611.30813v1)

### What transfers to a hardware decision

The authors also train a small inverse-dynamics readout to recover commanded motion from visual features. Its error is informative about policy performance, but correlations depend on which checkpoints are compared. On RoboTwin, pooling frozen and adapted checkpoints yields a correlation of −0.80, compared with −0.40 within the adapted group. A large difference between training conditions can make a proxy look more predictive than it is for choosing among similar encoders. [Section 5 and Figure 8](https://arxiv.org/pdf/2611.30813v1)

The physical ARX A7 uses two **grippers** and an egocentric RGB camera. On three tasks with 100 trials apiece, mean success was 49.67% for DINOv2, 41.00% for DINOv3 and 17.00% for CLIP. For a multi-finger hand project, the directly relevant result is the simulated GR1 patch ablation. Checking that ranking on physical fingers would require a separate experiment. [Appendix D, Table 15](https://arxiv.org/pdf/2611.30813v1)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

Qiwei Liang、Zhengtu Liang、Minghao Lai、Yikeng Chen 等 · 2026 年 11 月 23 日 · [arXiv 预印本](https://arxiv.org/abs/2611.30813v1)

相机画面足够辨认出杯子，却未必保留了让手指对准杯沿所需的局部位置关系。HIVE-Bench 研究视觉编码器交给策略的空间特征中，有多少能用于控制。与灵巧手直接相关的是仿真厨房 RoboCasa-GR1：每只手有 6 维动作，每条手臂有 7 维，腰部另有 3 维。

### 策略能读到哪些视觉信息

作者在 24 项双臂任务上比较七类、共 20 个编码器。RoboCasa-GR1 和使用双夹爪的 RoboTwin 2.0 各占 12 项。策略统一采用流匹配动作头，因而可以在相同类型的动作头下比较图像块如何聚合、读取哪层特征，以及微调编码器的效果。

一组对照冻结编码器，把每个相机视角的所有图像块特征平均成一个向量，再重新训练动作头。在 **RoboCasa 多任务策略**上，DINOv2 的成功率从 **32.28% 降到 9.94%**，DINOv3 从 **31.22% 降到 6.44%**。两个编码器与 12 项任务构成的 24 组比较里，23 组出现下降。简单平均会抹去动作头原本可以利用的显式空间排列。可学习的压缩方法是否同样损失信息，需要另外检验。[图 4、附录 C.2](https://arxiv.org/pdf/2611.30813v1)

### 如何把结果用于硬件选型

作者还训练小型逆动力学读出模型，从视觉特征恢复实际下发的动作。其误差能提供筛选线索，但相关性依赖比较范围。在 RoboTwin 上，将冻结和适配过的编码器合并统计，相关系数为 −0.80；只看适配过的模型则为 −0.40。不同训练条件之间的整体差距，会放大一个代理指标在相似编码器之间的排序能力。[第 5 节、图 8](https://arxiv.org/pdf/2611.30813v1)

真机 ARX A7 装有两个**夹爪**和第一视角 RGB 相机。三项任务各评测 100 次，DINOv2、DINOv3 和 CLIP 的平均成功率分别为 49.67%、41.00% 和 17.00%。做多指手视觉选型时，可以直接参考 GR1 仿真的图像块消融；这个排序在真实多指手上是否成立，还需实测。[附录表 15](https://arxiv.org/pdf/2611.30813v1)

</div>
