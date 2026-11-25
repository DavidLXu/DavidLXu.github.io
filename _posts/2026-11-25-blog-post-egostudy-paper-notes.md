---
title: "[Paper Notes] EgoStudy: How Does Scaling Egocentric Data Affect VLA and WAM Pretraining?"
date: 2026-11-25
permalink: /posts/2026/11/egostudy-paper-notes/
excerpt: "Scaling egocentric human data at fixed robot exposure improves wrist translation on XHand and RoboCasa-GR1. Fingertip poses and wrist rotations show less consistent gains."
tags:
  - Paper Notes
  - Dexterous Hands
  - Bimanual Manipulation
  - Vision-Language-Action Models
  - World Models
  - Egocentric Video
---

<div data-lang="en" markdown="1">

Puzhen Yuan, Yanjiang Guo, Yichen Liu and colleagues · November 23, 2026 · [arXiv preprint](https://arxiv.org/abs/2611.30490v1)

When more first-person human video improves a robot policy, which part of the hand motion improves? EgoStudy measures wrist displacement, wrist orientation and fingertip pose separately. Across two model families and two robot domains, wrist translation gives the clearest scaling trend. The result matters for dexterous manipulation because reaching a cup and establishing stable fingertip contacts require different kinds of accuracy.

### A common target for human and robot hands

Both models predict 32-step chunks. Each hand contributes a wrist and five fingertips, each with three position and six rotation coordinates, giving 108 values per step across both hands. Wrist motion is measured relative to the starting pose in the initial camera frame. Each fingertip is described relative to its own wrist at that step. This separates an error in reaching across the table from an error in shaping the fingers.

The team compares a vision-language-action model (VLA) with a world-action model (WAM) that also predicts future video. Human clips account for 75% of pretraining samples, real bimanual XHand trajectories for 20%, and RoboCasa-GR1 simulation for 5%. The sweep changes the eligible human pool while keeping robot sampling probabilities, robot data and the optimization budget fixed. Thus a larger pool brings more distinct human experience at a similar expected number of robot updates. [Methods §§3.1–3.3](https://arxiv.org/pdf/2611.30490v1)

### Where scale reaches the fingers

Going from 1% to 100% of the human pool reduced wrist-translation mean squared error on held-out XHand trajectories by **20.2% for the VLA** and **18.8% for the WAM**. Wrist rotation and wrist-relative fingertip error showed no comparably consistent decline. The authors suggest that fine hand tracking and differences in human and robot contact geometry may limit transfer. Their experiments identify the component-wise gap, while the causes remain hypotheses.

The closed-loop test used **RoboCasa-GR1 simulation** after robot-task posttraining. Over the same increase in human data, success went from 38.3% to 43.8% for the VLA and from 39.6% to 45.4% for the WAM. XHand supplied held-out real trajectories for offline prediction. A claim about more reliable physical fingertip contact would need a real closed-loop test designed to measure it. [Figures 4, 6 and 7](https://arxiv.org/pdf/2611.30490v1) · [Project](https://puzhenyuan.github.io/EgoStudy-website)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

Puzhen Yuan、Yanjiang Guo、Yichen Liu 等 · 2026 年 11 月 23 日 · [arXiv 预印本](https://arxiv.org/abs/2611.30490v1)

扩大第一视角人类视频的规模，机器人究竟是哪一部分动作学得更好？EgoStudy 分开测了腕部位移、腕部旋转和指尖位姿。在两类模型、两种机器人数据上，最稳定的改善出现在腕部平移。对灵巧手而言，这个拆分很重要：把手伸到杯子旁边和让各指稳稳贴住杯壁，需要的精度并不相同。

### 给人手和机械手同一套预测目标

两个模型都预测连续 32 步。每只手包含手腕与五个指尖，每个位姿用三维位置和六维旋转表示，双手合计每步 108 维。腕部运动以初始位姿为基准，在初始相机坐标系中表达；每个指尖则相对于同一时刻的手腕表达。这样一来，伸手位置偏了多少，与手指构型偏了多少，可以分别统计。

作者比较了视觉语言动作模型（VLA）和同时预测未来视频的世界动作模型（WAM）。预训练采样中，75% 来自人类视频，20% 来自双 XHand 真机轨迹，5% 来自 RoboCasa-GR1 仿真。实验只扩大可供抽样的人类数据池，机器人数据池、采样概率和优化预算均保持固定。数据规模的增益因此对应于人类经历更加多样，而机器人样本的预期曝光量相当。[方法 §3.1–3.3](https://arxiv.org/pdf/2611.30490v1)

### 增益传到了手指吗

从人类数据池的 1% 扩到 100%，在留出的 XHand 轨迹上，腕部平移均方误差分别下降 **20.2%（VLA）** 和 **18.8%（WAM）**。腕部旋转和相对于手腕的指尖位姿误差则没有同样稳定的下降。作者提出，精细手部跟踪的误差，以及人手和机械手在接触几何上的差异，都可能限制迁移。实验测到了这几类动作的差别，对成因的解释仍待验证。

闭环测试在 **RoboCasa-GR1 仿真**中进行，并先做了机器人任务后训练。以同样幅度扩大人类数据池后，VLA 成功率从 38.3% 升至 43.8%，WAM 从 39.6% 升至 45.4%。真机 XHand 提供的是用于离线预测的留出轨迹。若要判断实际抓取时指尖接触是否更稳，仍需要针对接触的真机闭环测试。[图 4、6、7](https://arxiv.org/pdf/2611.30490v1) · [项目主页](https://puzhenyuan.github.io/EgoStudy-website)

</div>
