---
title: "[Paper Notes] T-Rex: Tactile-Reactive Dexterous Manipulation"
date: 2026-06-19
permalink: /posts/2026/06/t-rex-paper-notes/
tags:
  - Tactile Sensing
  - Dexterous Manipulation
  - Vision-Language-Action
  - Robot Learning
  - Imitation Learning
  - Bimanual Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**T-Rex** argues that tactile feedback should be treated as a high-frequency control signal for dexterous manipulation. In this framing, touch is part of the control loop: vision and language provide slow semantic planning, while touch provides local, fast correction when contact changes inside an action chunk.

The paper combines a tactile-synchronized bimanual robot dataset, a variable-rate Mixture-of-Transformer-Experts (MoT) policy, and a three-stage training recipe. Across 12 real-world contact-rich tasks, T-Rex reaches **65%** average success, compared with **35%** for EgoScale, the strongest baseline. A useful warning in the results is that **π0.5 + tactile** drops to **6%**, below π0.5 without tactile, showing that tactile signals need architecture and training alignment to help.

## Paper Info

The paper is **"T-Rex: Tactile-Reactive Dexterous Manipulation"** by Dantong Niu, Zhuoyang Liu, Zekai Wang, Boning Shao, Zhao-Heng Yin, Anirudh Pai, Yuvan Sharma, Stefano Saravalle, Ruijie Zheng, Jing Wang, Ryan Punamiya, Mengda Xu, Yuqi Xie, Yunfan Jiang, Letian Fu, Konstantinos Kallidromitis, Matteo Gioia, Junyi Zhang, Jiaxin Ge, Haiwen Feng, Fabio Galasso, Wei Zhan, David M. Chan, Yutong Bai, Roei Herzig, Jiahui Lei, Fei-Fei Li, Ken Goldberg, Jitendra Malik, Pieter Abbeel, Yuke Zhu, Danfei Xu, Jim Fan, and Trevor Darrell.

It is available as [arXiv:2606.17055](https://arxiv.org/abs/2606.17055). The project page is [tactile-rex.github.io](https://tactile-rex.github.io/), the code is released at [ZhuoyangLiu2005/T-Rex](https://github.com/ZhuoyangLiu2005/T-Rex), and the dataset is on Hugging Face as [zekaiwang/trex_dataset](https://huggingface.co/datasets/zekaiwang/trex_dataset).

## Core Argument

Many VLA policies can interpret instructions and visual context, but contact-rich dexterity often fails at a shorter time scale. Turning a page, extracting a card, squeezing toothpaste, handling an egg, or opening a lock requires quick reactions to force, slip, deformation, and contact geometry. Those signals are local and high-frequency, and the useful correction may need to happen before a slower visual policy replans.

T-Rex addresses this frequency mismatch directly. It keeps a slow visual-language-action pathway for task progress and adds a fast tactile pathway for contact-level refinement. The result is a policy whose control loop is shaped by the sensing modality: vision carries broad context; touch adjusts the action when the physical interaction changes.

## Dataset and Training Recipe

The **T-Rex Dataset** is collected on a fixed-base **Dexmate Vega-1** robot with two **Sharpa Wave** dexterous hands. The setup uses a head camera, two wrist cameras, five fingertip tactile sensors per hand, tactile force vectors, tactile deformation maps, Manus gloves, and VIVE trackers. The full dataset described in the paper contains **100 hours** of teleoperation, **7700+ trajectories**, **22 motor primitives**, **200+ daily objects**, and synchronized RGB, tactile, robot-state, action, and language streams. The public release currently contains about **50 hours** and **5400+ trajectories** in **LeRobot v3.0** format.

The data is designed for more than task cloning. By covering elementary motor primitives and object interactions, it gives the model reusable contact-rich building blocks during robot mid-training. The training recipe has three stages: first, the latent and action experts inherit broad visuomotor priors from EgoScale-style pretraining on **22,889 hours** of egocentric human video; second, robot mid-training on the T-Rex Dataset aligns those priors with bimanual actions and synchronized tactile feedback; third, task-specific post-training adapts the model with about **100 demonstrations** per downstream task. The recipe suggests that tactile reactivity can be learned efficiently in a dedicated robot stage, after large-scale visual pretraining.

## Variable-Rate MoT

The model uses a **Mixture-of-Transformer-Experts** policy with three experts:

| Expert | Role | Rate |
|---|---|---|
| Latent Expert | Future visual latent prediction | Low-rate |
| Action Expert | Low-frequency action denoising | About 5 Hz |
| Tactile Expert | High-frequency tactile refinement | About 20 Hz |

The action expert first produces an intermediate action chunk through flow matching, then the tactile expert refines it using fresh tactile observations. In the implementation, the action chunk length is **16**, denoising uses **10** Euler steps, the split is **τ_split = 0.4**, the action expert runs **6** slow steps, and the tactile expert runs **4** fast refinement steps. Tactile updates are triggered at offsets `{0, 4, 8, 12}` inside the chunk, so the model can react to new contact without rerunning the full vision-language stack.

The tactile encoder also matches the nature of the signal. For fingertip force, a per-finger **VQ-VAE** compresses recent 6D force/torque history into temporal tokens while preserving the current force vector for instantaneous contact. For deformation, a convolutional encoder processes tactile maps. The final tactile tokens combine temporal force, current force, and spatial deformation features, allowing the policy to distinguish events such as force spikes, gradual slip, and local surface deformation.

## Empirical Evidence

The benchmark contains **12 real-world tactile-reactive tasks**: Flip Page, Transfer Egg, Wipe Plate, Apply Toothpaste, Split Cup, Sort Mahjong, Open Lock, Refill Tablet, Acid-Base Neutralization, Extract Card, Deal Poker, and Screw Lightbulb. Each task is evaluated with **16 rollouts** under randomized object poses, and multi-stage tasks use progress-based scoring.

Average success across the 12 tasks:

| Method | Average Success |
|---|---:|
| ViTacFormer | 3% |
| RDP | 6% |
| Tactile-VLA | 15% |
| EgoScale | 35% |
| π0.5 | 17% |
| π0.5 + tactile | 6% |
| T-Rex | 65% |

The main result supports the paper's central claim: tactile feedback is most useful when the policy can react with a separate fast pathway. The tactile ablation tells the same story:

| Configuration | Average |
|---|---:|
| Full T-Rex | 65% |
| w/o Tactile | 42% |
| MLP Force + Deform | 58% |
| Deform only | 54% |
| MLP Force + VQ-VAE Force | 59% |
| w/o Async | 60% |

Removing tactile drops success from **65%** to **42%**. Force and deformation both help, the temporal VQ-VAE improves force modeling, and asynchronous refinement adds a smaller but still meaningful gain. The training ablation further supports the recipe:

| Recipe | Average |
|---|---:|
| No pretraining, no mid-training | 18% |
| Pretraining only | 34% |
| Mid-training only | 45% |
| Full recipe | 65% |

The full system wins because it combines broad human-video priors with tactile-grounded robot mid-training. The code release reflects this split: the main branch includes post-training, inference, dataset quickstart, tactile VQ-VAE tools, and robot-side code, while pretraining and mid-training scripts are provided in the `full-pipeline` branch with released checkpoints.

## Limitations and Takeaway

The paper notes that long-horizon tasks with tight contact tolerances remain difficult to teleoperate and learn from demonstrations alone. Reinforcement learning or online interaction-based refinement may be needed for those cases. It also highlights hardware constraints: tactile sensor distortion, calibration drift, cross-device variation, and the lack of dense palm sensing make tactile foundation policies harder to scale. A practical adoption issue is that T-Rex depends on a rich dexterous platform with fingertip tactile sensing, so broader use will depend on tactile hardware becoming more common and standardized.

The clear takeaway is that tactile feedback changes the control problem. For dexterous manipulation, the policy needs slow vision-language planning plus fast tactile-reactive refinement. T-Rex is valuable because it turns that principle into a dataset, architecture, training recipe, and real-world benchmark result.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**T-Rex** 的核心观点是：在灵巧操作里，触觉反馈应该被当作高频控制信号。按照这个视角，触觉属于控制循环的一部分：视觉和语言负责较慢的语义规划，触觉负责在一个 action chunk 内接触状态变化时做局部、快速的修正。

论文把 tactile-synchronized bimanual robot dataset、variable-rate Mixture-of-Transformer-Experts (MoT) policy 和三阶段训练 recipe 结合起来。在 12 个真实 contact-rich tasks 上，T-Rex 平均成功率达到 **65%**，而最强 baseline EgoScale 是 **35%**。结果里一个很有价值的警告是：**π0.5 + tactile** 只有 **6%**，低于不加 tactile 的 π0.5，说明触觉信号需要匹配的 architecture 和 training alignment 才能真正发挥作用。

## Paper Info

论文标题是 **"T-Rex: Tactile-Reactive Dexterous Manipulation"**，作者包括 Dantong Niu, Zhuoyang Liu, Zekai Wang, Boning Shao, Zhao-Heng Yin, Anirudh Pai, Yuvan Sharma, Stefano Saravalle, Ruijie Zheng, Jing Wang, Ryan Punamiya, Mengda Xu, Yuqi Xie, Yunfan Jiang, Letian Fu, Konstantinos Kallidromitis, Matteo Gioia, Junyi Zhang, Jiaxin Ge, Haiwen Feng, Fabio Galasso, Wei Zhan, David M. Chan, Yutong Bai, Roei Herzig, Jiahui Lei, Fei-Fei Li, Ken Goldberg, Jitendra Malik, Pieter Abbeel, Yuke Zhu, Danfei Xu, Jim Fan, and Trevor Darrell。

论文地址是 [arXiv:2606.17055](https://arxiv.org/abs/2606.17055)。项目页是 [tactile-rex.github.io](https://tactile-rex.github.io/)，代码在 [ZhuoyangLiu2005/T-Rex](https://github.com/ZhuoyangLiu2005/T-Rex)，数据集在 Hugging Face：[zekaiwang/trex_dataset](https://huggingface.co/datasets/zekaiwang/trex_dataset)。

## 核心论点

很多 VLA policy 能理解语言指令和视觉上下文，但 contact-rich dexterity 的失败经常发生在更短的时间尺度上。翻纸、抽卡、挤牙膏、拿鸡蛋、开锁，都需要对力、滑动、形变和接触几何做快速反应。这些信号局部且高频，有用的修正往往需要在慢速视觉 policy 重新规划之前完成。

T-Rex 直接处理这个频率错配。它保留慢速 vision-language-action 路径来推进任务语义进展，同时加入快速 tactile 路径来做接触级 refinement。这样，policy 的控制循环会随感知模态而分层：视觉提供全局上下文，触觉在物理交互变化时修正动作。

## 数据集和训练 Recipe

**T-Rex Dataset** 采集自固定基座的 **Dexmate Vega-1** 机器人和两只 **Sharpa Wave** dexterous hands。系统包含一个 head camera、两个 wrist cameras、每只手五个 fingertip tactile sensors、tactile force vectors、tactile deformation maps、Manus gloves 和 VIVE trackers。论文描述的完整数据集包含 **100 小时** teleoperation、**7700+ trajectories**、**22 个 motor primitives**、**200+ daily objects**，以及同步 RGB、tactile、robot state、action 和 language streams。当前公开 release 约 **50 小时**、**5400+ trajectories**，格式为 **LeRobot v3.0**。

这个数据集的目标不只是克隆完整任务。它刻意覆盖 elementary motor primitives 和 object interactions，让模型在 robot mid-training 阶段获得可迁移的 contact-rich building blocks。训练 recipe 分三步：首先，latent expert 和 action expert 通过 EgoScale 风格的 **22,889 小时** egocentric human video pretraining 获得广泛 visuomotor priors；然后，在 T-Rex Dataset 上做 robot mid-training，把这些 priors 对齐到 bimanual robot actions 和同步 tactile feedback；最后，每个下游任务用大约 **100 条 demonstrations** 做 task-specific post-training。这个 recipe 说明，触觉反应能力可以在大规模视觉预训练之后，通过专门的机器人阶段高效获得。

## Variable-Rate MoT

模型使用包含三个 experts 的 **Mixture-of-Transformer-Experts** policy：

| Expert | Role | Rate |
|---|---|---|
| Latent Expert | Future visual latent prediction | Low-rate |
| Action Expert | Low-frequency action denoising | About 5 Hz |
| Tactile Expert | High-frequency tactile refinement | About 20 Hz |

Action expert 先通过 flow matching 生成中间 action chunk，tactile expert 再用最新 tactile observations 继续 refine。实现中，action chunk length 是 **16**，Euler denoising 共 **10** 步，split 位置是 **τ_split = 0.4**；action expert 运行 **6** 个 slow steps，tactile expert 运行 **4** 个 fast refinement steps。Tactile updates 在 chunk 内 `{0, 4, 8, 12}` 这些 offset 触发，因此模型可以响应新的接触信号，而不用重新运行完整 vision-language stack。

触觉编码方式也贴合信号本身。对 fingertip force，per-finger **VQ-VAE** 会把最近的 6D force/torque history 压缩成 temporal tokens，同时保留 current force vector 来表达瞬时接触。对 deformation，convolutional encoder 处理 tactile maps。最终 tactile tokens 结合 temporal force、current force 和 spatial deformation features，使 policy 能区分 force spike、缓慢滑动、局部表面形变等不同事件。

## 实验证据

Benchmark 包含 **12 个真实 tactile-reactive tasks**：Flip Page、Transfer Egg、Wipe Plate、Apply Toothpaste、Split Cup、Sort Mahjong、Open Lock、Refill Tablet、Acid-Base Neutralization、Extract Card、Deal Poker 和 Screw Lightbulb。每个任务评测 **16 次 rollout**，物体 pose 随机；多阶段任务使用 progress-based scoring。

12 个任务的平均成功率：

| Method | Average Success |
|---|---:|
| ViTacFormer | 3% |
| RDP | 6% |
| Tactile-VLA | 15% |
| EgoScale | 35% |
| π0.5 | 17% |
| π0.5 + tactile | 6% |
| T-Rex | 65% |

主结果支持论文的中心论点：当 policy 有单独的快速路径时，触觉反馈最有价值。Tactile ablation 也给出同样结论：

| Configuration | Average |
|---|---:|
| Full T-Rex | 65% |
| w/o Tactile | 42% |
| MLP Force + Deform | 58% |
| Deform only | 54% |
| MLP Force + VQ-VAE Force | 59% |
| w/o Async | 60% |

去掉 tactile 后，成功率从 **65%** 降到 **42%**。Force 和 deformation 都有贡献，temporal VQ-VAE 改善了 force modeling，asynchronous refinement 也带来较小但明确的收益。训练 ablation 进一步支持这个 recipe：

| Recipe | Average |
|---|---:|
| No pretraining, no mid-training | 18% |
| Pretraining only | 34% |
| Mid-training only | 45% |
| Full recipe | 65% |

完整系统的优势来自 broad human-video priors 和 tactile-grounded robot mid-training 的结合。代码发布也对应这种拆分：main branch 包含 post-training、inference、dataset quickstart、tactile VQ-VAE tools 和 robot-side code；pretraining/mid-training scripts 在 `full-pipeline` branch，相关 checkpoints 已发布。

## 局限和 Takeaway

论文指出，带有高接触精度要求的 long-horizon tasks 仍然很难 teleoperate，也很难只靠 demonstrations 学好，未来可能需要 reinforcement learning 或 online interaction-based refinement。论文还强调硬件限制：tactile sensor distortion、calibration drift、跨设备 tactile variation，以及缺少 dense palm sensing，都会让 tactile foundation policies 更难 scale。一个现实层面的限制是，T-Rex 依赖带 fingertip tactile sensing 的高能力 dexterous platform，因此更广泛的使用还取决于 tactile hardware 的普及和标准化。

最清晰的 takeaway 是：触觉反馈改变了控制问题本身。对 dexterous manipulation 来说，policy 需要慢速 vision-language planning，也需要快速 tactile-reactive refinement。T-Rex 的价值在于，它把这个原则落实成了数据集、architecture、training recipe 和真实机器人 benchmark 结果。

</div>
