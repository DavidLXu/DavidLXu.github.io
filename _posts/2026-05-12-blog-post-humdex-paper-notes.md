---
title: "[Paper Notes] HumDex: Humanoid Dexterous Manipulation Made Easy"
date: 2026-05-12
permalink: /posts/2026/05/humdex-paper-notes/
tags:
  - Humanoid Robotics
  - Dexterous Manipulation
  - Teleoperation
  - Imitation Learning
  - Human Data
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**HumDex** is a portable teleoperation and imitation-learning system for humanoid whole-body dexterous manipulation. Its core idea is practical: replace infrastructure-heavy or occlusion-prone tracking with inertial full-body and hand tracking, learn a lightweight hand retargeter for 20-DoF dexterous hands, and use abundant human demonstrations as a pretraining source before fine-tuning on a small amount of robot data. The result is a system that can collect better demonstrations faster, solve tasks that vision-based teleoperation struggles with, and improve policy generalization to new object positions, categories, and backgrounds.

## Paper Info

The paper is **"HumDex: Humanoid Dexterous Manipulation Made Easy"** by **Liang Heng, Yihe Tang, Jiajun Xu, Henghui Bao, Di Huang, and Yue Wang**, from **USC Physical Superintelligence Lab** and **WorldEngine AI**. It is available as [arXiv:2603.12260](https://arxiv.org/abs/2603.12260), with the code released at [physical-superintelligence-lab/HumDex](https://github.com/physical-superintelligence-lab/HumDex). The local codebase I reviewed includes the teleoperation pipeline, Wuji hand retargeting/training utilities, ACT policy learning scripts, and documentation for real/human data collection.

## 1. Problem and Motivation

Humanoid dexterous manipulation has a data problem. Imitation learning can learn impressive long-horizon manipulation behaviors, but collecting high-quality demonstrations on a humanoid with dexterous hands is slow, brittle, and hardware-dependent. Optical motion capture and exoskeleton systems can be accurate but require dedicated infrastructure. VR or vision-based systems are more portable but suffer from self-occlusion, especially when the operator grasps tools or performs fine finger motions.

HumDex attacks this bottleneck from two directions. First, it builds a portable whole-body dexterous teleoperation stack based on IMU tracking, so operators can move naturally without keeping hands inside a headset camera's field of view. Second, it treats human demonstrations as a cheap source of diversity: the robot policy first learns broad visual and motion priors from human data, then adapts to the robot embodiment with robot teleoperation data.

## 2. System Overview

HumDex combines three layers:

- **Wearable tracking.** The system supports inertial full-body tracking, including a commercial 15-node Vdmocap/VIRDYN-style setup and a low-cost SlimeVR-based alternative. For hands, it supports inertial gloves such as Vdhand and Manus.
- **Whole-body control.** Human body motion is retargeted through a pelvis-centric General Motion Retargeting formulation, then streamed into low-level humanoid controllers such as TWIST2 or SONIC. This keeps locomotion and balance handled by robust existing controllers while providing high-level targets.
- **Dexterous hands.** Each Wuji hand has 20 actuated DoFs. Instead of controlling hands as binary open/close grippers, HumDex maps five fingertip positions to full 20-DoF joint targets.

The implementation mirrors this modular design. The repo exposes a unified teleoperation entry point:

```bash
bash scripts/teleop.sh --policy twist2 --body slimevr --hand vdhand
bash scripts/teleop.sh --policy sonic --body vdmocap --hand manus
```

That code-level detail matters: the paper is not just proposing a concept, but a composable stack where body source, hand source, and low-level controller can be swapped through configuration.

## 3. Learning-Based Hand Retargeting

Dexterous hand retargeting is one of the paper's most useful engineering choices. The inertial glove provides five fingertip positions, represented as a 15D vector in the glove wrist frame. HumDex trains a small MLP:

$$
f_\theta: \mathbb{R}^{15} \rightarrow \mathbb{R}^{20}
$$

to predict the 20-DoF Wuji hand joint vector. The training objective is simple supervised regression:

$$
\min_\theta \mathbb{E}_{(p,q)\sim D}\left[\|f_\theta(p)-q\|_2^2\right]
$$

The labels come from an offline optimization-based retargeting process, but runtime inference is neural and constant-time. In the appendix, the paper describes a finger-wise MLP with five sub-networks, each mapping one fingertip's 3D position to four finger joints. The calibration cost is modest: about **20k frames**, or **less than 20 minutes** of recording.

This design is attractive because it turns a per-frame constrained optimization problem into a fast learned mapping, while still using optimization to produce the initial supervised targets. In task tests, glove plus learned retargeting performs especially well on dexterity-heavy subtasks such as scanner triggering and doll grasping.

## 4. Two-Stage Imitation Learning

The policy backbone is **ACT** with a ResNet-18 visual encoder. Observations include egocentric RGB from a RealSense camera plus proprioceptive state; actions include whole-body targets and bimanual hand targets.

The central difficulty is that human demonstrations do not have true robot proprioception. HumDex approximates the missing robot state with the previous action, based on the observation that robot actions correspond closely to next-step states. Then it trains sequentially:

1. **Human pretraining.** Train on diverse human demonstrations to learn visual invariances and broad motion priors.
2. **Robot fine-tuning.** Fine-tune on robot teleoperation data to adapt the policy to the Unitree G1 plus Wuji hand embodiment.

This sequential design is important. The paper reports that naively mixing human and robot data fails to converge, likely because similar visual states map to conflicting human-style and robot-style actions. Pretrain-then-finetune avoids that conflict: human data teaches diversity first; robot data teaches embodiment-specific execution second.

The repo's data tools match this story. Human data preprocessing explicitly approximates proprioception with previous-frame action, and `act/imitate_episodes.py` supports sequential training with multiple datasets.

## 5. Experiments and Main Results

The evaluated tasks are deliberately hard for a humanoid with hands:

- **Scan & Pack:** hold a scanner, pull its trigger, scan a toy, pack it into a bag, and hand the bag over.
- **Hang Towel:** coordinate both hands to thread a towel through a hanger and return the hanger.
- **Open Door:** press a real door handle while walking forward.
- **Place Basket on Shelf:** squat, pick up a basket, stand, rotate, and place it.
- **Pick Bread:** grasp a deformable-like object and place it into a basket.

Compared with a vision-based teleoperation baseline, HumDex improves the common-task data collection time from **59.8 minutes** to **44.3 minutes** for 60 episodes, a **26%** efficiency gain. It also improves teleoperation success from **74.6%** to **91.7%**, and policies trained on its demonstrations improve from **57.5%** to **80.0%** success on the shared task set. The baseline cannot complete Scan & Pack because scanner grasping occludes the hand; HumDex succeeds because inertial gloves do not depend on visual hand visibility.

For generalization on Pick Bread, the robot-data-only policy performs well in the seen setting but drops sharply under distribution shift:

| Policy | Seen | Unseen Position | Unseen Object | Unseen Background |
|---|---:|---:|---:|---:|
| Robot data only | 29/30 | 12/30 | 10/30 | 9/30 |
| HumDex two-stage | 30/30 | 21/30 | 20/30 | 25/30 |

The strongest gain is background generalization, where human pretraining improves from **9/30** to **25/30**. This supports the paper's main claim: diverse human data is valuable not because it can be replayed directly on the robot, but because it teaches robust perception and high-level action priors.

## 6. Codebase Notes

The repository is unusually implementation-facing for a paper release. The reviewed code and docs expose several practical pieces:

- `deploy_real/config/teleop.yaml` centralizes runtime, network, retargeting, adapter, and policy settings.
- `scripts/teleop.sh` provides the unified selector interface for controller, body tracker, and hand tracker.
- `deploy_real/adapters/` separates body sources such as Vdmocap, SlimeVR, and Xsens from hand sources such as Vdhand and Manus.
- `wuji_policy/training/` contains the learned hand policy stack, including dataset, model, trainer, loss, and export logic.
- `act/convert_to_hdf5.py`, `act/scripts/convert_human_data.py`, and `act/imitate_episodes.py` support policy learning from robot and human datasets.

This is the most encouraging part of HumDex as a research artifact: the paper's abstractions appear as runnable interfaces rather than only diagrams.

## 7. Strengths and Limitations

**Strengths.** HumDex is strong because it solves a real systems bottleneck, not just a modeling subproblem. The IMU-first design directly targets the occlusion failure mode of vision-based teleoperation. The learned hand retargeter is simple, fast, and calibratable. The two-stage learning setup is also a clean answer to a subtle problem: human data is useful, but direct mixed training is not automatically safe under embodiment mismatch.

**Limitations.** The paper is still data-limited: the authors explicitly note that larger-scale training may further improve results. The hand retargeter is trained from fingertip positions, which is elegant but may not cover all contact-rich hand postures or force-sensitive interactions. Hardware payload and actuation limits also constrain the range of manipulation behaviors. Finally, the generalization experiments are convincing but still narrow; it would be useful to test the same human-pretraining recipe across more tasks and more severe environment shifts.

## 8. Takeaways

HumDex's main lesson is that humanoid dexterous manipulation needs better data interfaces as much as it needs better policies. A portable, occlusion-resistant teleoperation system changes what demonstrations are feasible to collect. Once human data becomes cheap, the learning problem also changes: instead of asking robot teleoperation to cover every variation, one can use human demonstrations to teach diversity and reserve robot data for embodiment adaptation.

For future work, the most interesting direction is scaling this recipe: more human data, richer force/contact sensing, broader task families, and stronger policy architectures. But the current system already offers a pragmatic path forward for whole-body humanoid manipulation: make collection easy, make retargeting fast, and use robot data where it matters most.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**HumDex** 是一个面向人形机器人全身灵巧操作的便携式遥操作与模仿学习系统。它的核心思路非常务实：用惯性全身和手部追踪替代依赖固定场地或容易被遮挡的视觉追踪；为 20 自由度灵巧手训练一个轻量级手部重定向模型；再用大量易采集的人类示教进行预训练，最后用少量机器人数据微调。最终效果是：更快采集更高质量的示教，完成视觉遥操作难以完成的任务，并提升策略对新位置、新物体和新背景的泛化能力。

## 论文信息

论文标题是 **"HumDex: Humanoid Dexterous Manipulation Made Easy"**，作者为 **Liang Heng、Yihe Tang、Jiajun Xu、Henghui Bao、Di Huang 和 Yue Wang**，来自 **USC Physical Superintelligence Lab** 与 **WorldEngine AI**。论文地址为 [arXiv:2603.12260](https://arxiv.org/abs/2603.12260)，代码开源在 [physical-superintelligence-lab/HumDex](https://github.com/physical-superintelligence-lab/HumDex)。我在本地代码库中查看了遥操作流水线、Wuji 手重定向与训练工具、ACT 策略学习脚本，以及真实机器人/人类数据采集文档。

## 1. 问题与动机

人形机器人灵巧操作首先卡在数据上。模仿学习可以学习复杂的长时程操作行为，但在人形机器人和灵巧手上采集高质量示教非常慢、非常脆弱，也很依赖硬件方案。光学动捕和外骨骼系统精度高，但需要固定基础设施；VR 或视觉方案更便携，却容易受到自遮挡影响，尤其是操作者握住工具或做精细手指动作时。

HumDex 从两个方向解决这个瓶颈。第一，它基于 IMU 追踪构建便携式全身灵巧遥操作系统，让操作者不必把手一直保持在头显相机视野里。第二，它把人类示教当作低成本的多样性来源：策略先从人类数据中学习视觉与运动先验，再用机器人遥操作数据适配具体机器人 embodiment。

## 2. 系统概览

HumDex 由三层组成：

- **可穿戴追踪。** 系统支持惯性全身追踪，包括商业 15 节点 Vdmocap/VIRDYN 类方案，也支持低成本 SlimeVR 方案；手部支持 Vdhand 和 Manus 等惯性手套。
- **全身控制。** 人体动作通过以骨盆为中心的 General Motion Retargeting 重定向，再流式发送给 TWIST2 或 SONIC 等低层人形控制器。这样可以把行走和平衡交给成熟控制器，同时提供高层动作目标。
- **灵巧手控制。** 每只 Wuji 手有 20 个主动自由度。HumDex 不把手简化成开合夹爪，而是把五个指尖位置映射为完整的 20 自由度关节目标。

代码实现也体现了这种模块化设计。仓库提供了统一的遥操作入口：

```bash
bash scripts/teleop.sh --policy twist2 --body slimevr --hand vdhand
bash scripts/teleop.sh --policy sonic --body vdmocap --hand manus
```

这个细节很重要：论文不只是提出概念，而是给出了一个可以通过配置替换身体追踪源、手部追踪源和低层控制器的可组合系统。

## 3. 学习式手部重定向

灵巧手重定向是这篇论文最有价值的工程选择之一。惯性手套提供五个指尖位置，在手套腕部坐标系中表示为 15 维向量。HumDex 训练一个小型 MLP：

$$
f_\theta: \mathbb{R}^{15} \rightarrow \mathbb{R}^{20}
$$

来预测 20 自由度 Wuji 手关节向量。训练目标是简单的监督回归：

$$
\min_\theta \mathbb{E}_{(p,q)\sim D}\left[\|f_\theta(p)-q\|_2^2\right]
$$

标签来自离线优化式重定向，但运行时推理是神经网络的常数时间前向传播。附录中写到，模型采用 finger-wise 的 MLP 结构：五个子网络分别把单个手指的 3D 指尖位置映射到 4 个手指关节。校准成本也不高，大约 **2 万帧**，也就是 **不到 20 分钟** 的记录。

这个设计的吸引力在于，它把逐帧约束优化问题变成了快速学习映射，同时仍然利用优化方法生成初始监督标签。在任务测试中，手套加学习式重定向在高度依赖灵巧度的子任务上表现尤其好，例如扫描枪扣动和玩偶抓取。

## 4. 两阶段模仿学习

策略骨干是带 ResNet-18 视觉编码器的 **ACT**。观测包括 RealSense 相机的第一视角 RGB 和本体状态；动作包括全身目标和双手目标。

核心难点是：人类示教没有真实的机器人本体状态。HumDex 用上一帧动作近似缺失的机器人状态，因为作者在机器人数据中观察到动作与下一步状态高度对应。随后采用顺序训练：

1. **人类数据预训练。** 在多样化的人类示教上训练，学习视觉不变性和粗粒度运动先验。
2. **机器人数据微调。** 在机器人遥操作数据上微调，把策略适配到 Unitree G1 加 Wuji 手的具体 embodiment。

这个顺序训练设计很关键。论文报告称，直接混合人类和机器人数据会无法收敛，可能是因为相似视觉状态对应了互相冲突的人类式动作和机器人式动作。先预训练再微调则避免了这个冲突：人类数据先教多样性，机器人数据再教具体执行。

代码库中的数据工具也与这个思路一致。人类数据预处理脚本会用上一帧动作近似本体状态，`act/imitate_episodes.py` 也支持多数据集顺序训练。

## 5. 实验与主要结果

论文评估的任务对带手的人形机器人来说都不简单：

- **Scan & Pack：** 拿起扫描枪、扣动扳机、扫描玩具、放入购物袋并递给人。
- **Hang Towel：** 双手协同，把毛巾穿过衣架并挂回去。
- **Open Door：** 按下真实门把手并向前走推开门。
- **Place Basket on Shelf：** 下蹲拿篮子、起身、转身并放到架子上。
- **Pick Bread：** 抓取类似柔性物体的面包并放入篮子。

相对视觉遥操作 baseline，HumDex 在共同任务上把采集 60 条 episode 的时间从 **59.8 分钟**降到 **44.3 分钟**，效率提升 **26%**。遥操作成功率从 **74.6%** 提升到 **91.7%**，用其示教训练出的策略成功率也从 **57.5%** 提升到 **80.0%**。baseline 无法完成 Scan & Pack，因为握住扫描枪会遮挡手部；HumDex 依靠惯性手套，不依赖视觉可见性，因此可以完成。

在 Pick Bread 泛化实验中，只用机器人数据训练的策略在 seen setting 表现很好，但遇到分布变化会明显下降：

| 策略 | Seen | 未见位置 | 未见物体 | 未见背景 |
|---|---:|---:|---:|---:|
| 仅机器人数据 | 29/30 | 12/30 | 10/30 | 9/30 |
| HumDex 两阶段 | 30/30 | 21/30 | 20/30 | 25/30 |

提升最明显的是背景泛化，从 **9/30** 提高到 **25/30**。这支持了论文的核心观点：人类数据有价值，不是因为它能直接在机器人上回放，而是因为它能教会策略更鲁棒的感知和高层动作先验。

## 6. 代码库观察

这个仓库对论文复现很友好。我查看到的代码与文档中，有几块非常实用：

- `deploy_real/config/teleop.yaml` 集中管理运行时、网络、重定向、adapter 和策略配置。
- `scripts/teleop.sh` 提供低层控制器、身体追踪源、手部追踪源的统一选择入口。
- `deploy_real/adapters/` 将 Vdmocap、SlimeVR、Xsens 等身体源与 Vdhand、Manus 等手部源解耦。
- `wuji_policy/training/` 包含学习式手部策略栈，包括 dataset、model、trainer、loss 和 export。
- `act/convert_to_hdf5.py`、`act/scripts/convert_human_data.py` 和 `act/imitate_episodes.py` 支持机器人/人类数据上的策略学习。

这也是 HumDex 作为研究 artifact 最值得肯定的一点：论文中的抽象不是只停留在图里，而是落到了可运行的接口上。

## 7. 优势与局限

**优势。** HumDex 强在它解决的是实际系统瓶颈，而不只是一个模型子问题。IMU 优先的设计直接针对视觉遥操作的遮挡失败模式。学习式手部重定向简单、快速、易校准。两阶段学习也干净地回答了一个微妙问题：人类数据很有用，但在 embodiment mismatch 下直接混合训练并不一定可靠。

**局限。** 论文仍然受数据规模限制，作者也明确提到更大规模训练可能进一步提升性能。手部重定向只基于指尖位置，虽然优雅，但未必覆盖所有接触丰富的手姿态和力敏感交互。硬件负载和执行器力量也限制了可探索的操作行为范围。最后，泛化实验有说服力但范围仍然较窄；如果能在更多任务和更强环境变化下验证同样的人类预训练策略，会更完整。

## 8. Takeaways

HumDex 最重要的启发是：人形灵巧操作需要更好的数据接口，不只是更强的策略模型。一个便携、抗遮挡的遥操作系统会改变哪些示教可以被采集。一旦人类数据变得便宜，学习问题也随之改变：不必要求机器人遥操作覆盖所有变化，而是可以用人类示教学习多样性，把机器人数据留给最关键的 embodiment 适配。

面向未来，最有意思的方向是扩展这条路线：更多人类数据、更丰富的力/接触传感、更广任务族，以及更强的策略架构。但当前系统已经给出了一条务实路径：让采集变容易，让重定向变快速，把机器人数据用在真正需要它的地方。

</div>
