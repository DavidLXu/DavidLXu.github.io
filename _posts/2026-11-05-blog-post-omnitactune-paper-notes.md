---
title: "[Paper Notes] OmniTacTune: Policy-Agnostic Real-World RL for Tactile Residual Adaptation of Visual Policies"
date: 2026-11-05
permalink: /posts/2026/11/omnitactune-paper-notes/
excerpt: "OmniTacTune learns tactile corrections on top of a frozen visual policy. On four real-robot tasks, 40–80 minutes of adaptation raised success from 5–40% to 85–100%."
tags:
  - Paper Notes
  - Reinforcement Learning
  - Residual Policy Learning
  - Tactile Sensing
  - Contact-Rich Manipulation
---

<div data-lang="en" markdown="1">

A robot can bring a bottle opener to the cap and still slip as it starts to lever. Its visual policy has already learned most of the motion. **OmniTacTune trains a residual actor on the real robot to adjust that motion using touch.** The critic helps train this actor. At execution time, the visual policy proposes an action and the residual actor supplies a correction.

Kelin Yu, Haode Zhang, Harish Ravichandar, Yunhai Han, and Ruohan Gao are the authors of this CoRL 2026 paper. [Paper](https://arxiv.org/abs/2607.03723) · [Project and robot videos](https://colinyu1.github.io/omnitactune-site/)

## What the residual actor sees

The visual policy exposes its current action and a short sequence of planned actions. These tell the residual actor where the robot intends to move. A separate model predicts a trajectory of object keypoints from the initial observation. The robot tracks the current subgoal until the observed keypoints come close enough to advance. This gives the residual actor a reference for judging whether the object actually moved as intended.

The actor combines that reference with the action sequence, robot state, and tactile features gated by contact. The executed action is **base action + scale × residual action**. The contact gate controls the tactile input, while a separate schedule controls the size of the correction. This interface lets the authors adapt ACT, Diffusion Policy, and π₀.₅ through their action outputs. Each base policy gets its own real-world adaptation run. [Sections 3.2–3.3 and 4.2](https://arxiv.org/pdf/2607.03723)

## Where the first tactile training signal comes from

Human demonstrations can teach the approach motion, but they contain no record of what the robot’s fingertip felt. For the first 12 minutes, the robot runs its frozen visual policy and records its own contacts. Those transitions fill the replay buffer and train a critic to score the executed action given the robot state, object motion, and touch. Marker displacement identifies contact frames, on which the tactile encoder learns from both the critic loss and an image reconstruction loss. ControlTac generates two force-conditioned tactile variants of each trajectory, reusing the recorded states, actions, and rewards.

During online training, the residual actor learns which corrections improve the critic’s estimate of return. The reward changes with the phase of the task. Approaching the object earns credit before grasping. After grasping, progress is measured against the generated keypoint trajectory. Tactile signals report grasp quality and unsafe contact, and an operator marks successful completion. This gives the learner feedback even on a trial that ends with the opener slipping. [Sections 3.3–3.4](https://arxiv.org/pdf/2607.03723)

## What improved on hardware

The main experiment used an xArm7 with GelSight Mini and a visual policy trained from 50 human demonstrations per task. Each final success rate represents 20 trials. The reported adaptation time includes the 12-minute warm start. [Section 4.1, Table 1](https://arxiv.org/pdf/2607.03723)

| Task | Visual policy | With tactile residual | Adaptation time |
|---|---:|---:|---:|
| Peg-in-hole | 40% | 100% | 50 min |
| Charger insertion | 10% | 100% | 40 min |
| Cap opening | 5% | 90% | 60 min |
| Box opening | 5% | 85% | 80 min |

The tactile version of the PLD baseline averaged 52.5% across tasks, compared with 93.75% for OmniTacTune. The peg-in-hole ablations help interpret that gap. Using warm-start rollouts only to populate replay gave poorer learning than also fitting the critic and adapting the tactile encoder. The remaining tool-use failures show what is still hard. An opener can reach the right place yet miss the narrow edge or tilt under load, directing force away from the intended contact. The cross-policy comparison covers peg-in-hole, while the four-task results above all use the human-demonstration flow policy. [Sections 4.1–4.2 and Appendices C–D](https://arxiv.org/pdf/2607.03723)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

机器人能把开瓶器送到瓶盖边缘，一撬却滑开了。视觉策略已经学会了大部分动作，难点集中在接触后的几步。**OmniTacTune 在真机上训练一个残差策略，让机器人根据指尖触觉微调原动作。** 训练时，critic 帮助残差策略判断哪些修正值得尝试。执行时，视觉策略给出基础动作，残差策略给出修正量。

作者为 Kelin Yu、Haode Zhang、Harish Ravichandar、Yunhai Han 和 Ruohan Gao，论文发表于 CoRL 2026。[论文](https://arxiv.org/abs/2607.03723) · [项目主页与真机视频](https://colinyu1.github.io/omnitactune-site/)

## 残差策略怎么知道该往哪里修

视觉策略输出当前动作和接下来的一小段动作序列，告诉残差策略机械臂打算怎样走。另一个模型根据初始观测预测物体关键点的运动轨迹。执行时，只有观测到的关键点足够接近当前子目标，系统才切换到下一个子目标。这样，残差策略既知道机械臂打算往哪里走，也有参照来判断物体实际上有没有跟上。

残差策略结合关键点目标、基础动作序列、机器人自身状态和触觉特征，给出修正量。**最终动作 = 基础动作 + 缩放系数 × 残差动作**。接触门控决定何时向网络输入触觉特征，单独的调度器控制动作修正幅度。这也解释了为什么同一套方法能接到 ACT、Diffusion Policy 和 π₀.₅ 上。接口只需读取它们输出的动作。实验中，每种基础策略都单独经历一次真机适配。[第 3.2–3.3、4.2 节](https://arxiv.org/pdf/2607.03723)

## 第一批触觉训练信号从哪里来

人的示范可以教会机器人怎样接近物体，却没有记录机器人指尖会感受到什么。作者先让机器人用冻结的视觉策略自主运行 12 分钟，记录接触过程。这批数据一方面填入经验回放池，另一方面用于训练 critic，让它根据机器人状态、物体运动和触觉，评估实际执行的动作。系统根据触觉图像中标记点的位移筛出接触帧，用 critic 损失和图像重建损失共同训练触觉编码器。每条轨迹还通过 ControlTac 生成两组不同接触力下的触觉图像，沿用原轨迹的状态、动作和奖励。

进入在线训练后，残差策略通过 critic 学习哪些修正有望提高回报。奖励随任务阶段变化。抓取前，末端靠近物体就能获得奖励。抓取后，系统对照生成的关键点轨迹衡量物体移动了多少，同时用触觉判断抓持质量和接触是否安全。操作员在任务成功时给出终止奖励。因此，即使一次开瓶尝试最终打滑，前面哪些动作把工具送到了正确位置，仍然有信号可学。[第 3.3–3.4 节](https://arxiv.org/pdf/2607.03723)

## 真机上改善了多少

主实验使用配备 GelSight Mini 的 xArm7。每项任务用 50 条人类示范训练基础视觉策略，最终成功率按每项 20 次试验计算。表中的适配时间包含最初 12 分钟的预热。[第 4.1 节、表 1](https://arxiv.org/pdf/2607.03723)

| 任务 | 基础视觉策略 | 加入触觉残差后 | 适配时间 |
|---|---:|---:|---:|
| 插销入孔 | 40% | 100% | 50 分钟 |
| 插充电器 | 10% | 100% | 40 分钟 |
| 用工具开瓶盖 | 5% | 90% | 60 分钟 |
| 用工具撬开盒子 | 5% | 85% | 80 分钟 |

同样接入触觉的 PLD 基线，四项平均成功率为 52.5%，OmniTacTune 为 93.75%。插销入孔的消融实验解释了部分差距。如果预热轨迹只用来填充回放池，后续学习效果较差，同时训练 critic 和触觉编码器更有效。工具任务中残留的失败也很具体。即使开瓶器已经到位，工具仍可能错过狭窄的受力边缘，或在撬动时倾斜，让力偏离所需方向。解读泛化结果时要区分两组实验。上表四项任务都使用从人类示范学到的流引导策略，多种基础策略之间的对照只在插销入孔上进行。[第 4.1–4.2 节及附录 C–D](https://arxiv.org/pdf/2607.03723)

</div>
