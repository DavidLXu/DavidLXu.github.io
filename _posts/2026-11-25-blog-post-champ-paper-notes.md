---
title: "[Paper Notes] CHAMP: Coordinated Humanoid Loco-Manipulation with Whole-Body Motion Priors"
date: 2026-11-25
permalink: /posts/2026/11/champ-paper-notes/
excerpt: "CHAMP pretrains on shared body, wrist and fingertip motion and grounds those features in a controller. A Unitree G1 with Dex3 hands completes 64 of 70 physical task trials."
tags:
  - Paper Notes
  - Dexterous Hands
  - Humanoid Robots
  - Loco-Manipulation
  - Imitation Learning
---

<div data-lang="en" markdown="1">

Lijun Han, Muyuan Ma, Zichen Wang, Siyuan Liu and colleagues · November 23, 2026 · [arXiv preprint](https://arxiv.org/abs/2611.30449v1)

Serving popcorn tests the timing between a humanoid’s hands and feet. One hand grasps a scoop while the other holds a bucket. After pouring, the robot carries the bucket to a table and sets it down. A grasp that works while standing still must survive the transition to walking. CHAMP uses this kind of task to study how a vision-language model can learn body and hand motion together.

### How fingertip motion enters whole-body control

Pretraining uses about 2,298 hours of human, robot and simulated motion. A sample can supervise body motion, hand motion or both, depending on its annotations. The model predicts five future poses covering one second. Body joints are represented relative to the pelvis and fingertips relative to their wrists, while wrist and pelvis poses retain their trajectory reference frame. This design lets hand-only video contribute even when leg motion is unavailable.

The team then freezes the vision-language model and trains a coordination-oriented action expert on robot motions replayed with the target controller. A router selects features from several model layers, and a diffusion transformer produces action chunks. On the G1 with Dex3 hands, each action has a 64-dimensional body-control representation and seven joint commands per hand. The hand and locomotion targets therefore share a time step. Task demonstrations supply the final fine-tuning stage. [Methods and Table 6](https://arxiv.org/pdf/2611.30449v1)

### Reading the G1 trials

With 100 demonstrations per task for each compared method, CHAMP reached **84.8%** mean success across seven simulated tasks and **64/70 (91.4%)** across seven physical tasks. The full popcorn sequence succeeded in **7/10** real trials, against **4/10** for GR00T N1.6. Removing motion pretraining while retaining action grounding and fine-tuning lowered simulation success to **71.9%**. This ablation tests the contribution of the combined motion prior. [Tables 1–3](https://arxiv.org/pdf/2611.30449v1)

For hand research, the scope of the metric matters. The popcorn score covers grasping, scooping, carrying and placement together. It cannot localize a failure to the fingers. The pretraining targets describe kinematics, and assessing contact force or slip would require additional measurements. [Project and task videos](https://han-li-jun.github.io/CHAMP/index.html)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

Lijun Han、Muyuan Ma、Zichen Wang、Siyuan Liu 等 · 2026 年 11 月 23 日 · [arXiv 预印本](https://arxiv.org/abs/2611.30449v1)

盛爆米花很考验人形机器人的手脚配合。一只手拿铲子，另一只手扶桶，倒进爆米花之后还得提着桶走到桌前放下。原地站立时成立的抓姿，迈步以后仍要保持。CHAMP 用这类任务研究视觉语言模型如何同时学习身体和手部运动。

### 指尖运动怎么进入全身控制

预训练使用约 2,298 小时的人类、机器人及仿真运动数据。每个样本按已有标注监督身体、手部或两者，预测未来一秒内的五个位姿。身体关节相对骨盆表示，各指尖相对手腕表示，腕部和骨盆位姿保留轨迹参考坐标。这样，即使一段视频只有手部标注，也能贡献训练信号。

随后冻结视觉语言模型，用目标控制器回放过的机器人运动训练动作专家。路由器从多层特征中选取信息，再由扩散 Transformer 生成动作片段。具体到搭载 Dex3 手的 G1，每步动作包含 64 维身体控制表示，左右手各有七个关节指令，手部动作和步态在同一时间步输出。最后再用任务示范微调。[方法与表 6](https://arxiv.org/pdf/2611.30449v1)

### G1 的成功率测到了哪些能力

各方法每项任务都用 100 条示范。CHAMP 在七项仿真任务上的平均成功率为 **84.8%**，七项真机任务合计成功 **64/70 次（91.4%）**。其中，盛爆米花的完整流程成功 **7/10 次**，GR00T N1.6 为 **4/10 次**。保留动作映射训练和任务微调、去掉运动预训练后，仿真成功率降到 **71.9%**。这项消融测到的是身体与手部运动先验的合计贡献。[表 1–3](https://arxiv.org/pdf/2611.30449v1)

从灵巧手角度读，盛爆米花的分数合并了抓取、铲取、搬运和放置。仅凭任务成败很难把失误定位到某根手指。预训练目标描述的是运动学轨迹，若要判断接触力是否合适、行走中是否打滑，还需要单独测量。[项目与任务视频](https://han-li-jun.github.io/CHAMP/index.html)

</div>
