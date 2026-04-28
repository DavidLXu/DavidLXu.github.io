---
title: "[Paper Notes] VITRA: Scalable VLA Pretraining from Real-Life Human Videos"
date: 2026-04-28
permalink: /posts/2026/04/vitra-paper-notes/
tags:
  - VLA
  - Robot Learning
  - Dexterous Manipulation
  - Human Videos
  - PaliGemma
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**VITRA** explores a simple but powerful idea: use ordinary egocentric human activity videos as scalable pretraining data for dexterous Vision-Language-Action models. The authors treat the human hand as a dexterous end-effector, reconstruct 3D hand motion with MANO-based labels, segment long videos into atomic hand actions, caption each segment with language, and pretrain a PaliGemma-based VLA with a diffusion action head. Robot data is then used mainly for adaptation: after human-video pretraining, the model is fine-tuned on a much smaller set of real robot trajectories, with the robot hand mapped into the human/MANO action space.

## Paper Info

The paper is **"Scalable Vision-Language-Action Model Pretraining for Robotic Manipulation with Real-Life Human Activity Videos"** by **Qixiu Li, Yu Deng, Yaobo Liang, Lin Luo, Lei Zhou, Chengtang Yao, Lingqi Zeng, Zhiyuan Feng, Huizhi Liang, Sicheng Xu, Yizhong Zhang, Xi Chen, Hao Chen, Lily Sun, Dong Chen, Jiaolong Yang, and Baining Guo** from **Tsinghua University** and **Microsoft Research Asia**. It is listed on the project page as **ICRA 2026**. The paper, project, code, data, and models are linked from [microsoft.github.io/VITRA](https://microsoft.github.io/VITRA/), with the arXiv PDF at [2510.21571](https://arxiv.org/pdf/2510.21571).

## The Core Problem

Modern VLA models need action data, but robot action data is expensive, slow to collect, and often narrow in objects, scenes, and skills. This is even more severe for dexterous hands, where large-scale robot datasets are scarce. In contrast, the web and existing egocentric video datasets contain many real human manipulation behaviors, but they are unsegmented, uncalibrated, noisy, and missing action labels.

VITRA asks whether these raw human videos can be converted into the same kind of supervision used by robotic VLA models: image, language instruction, state, and future action chunks. Their answer is yes, with a pipeline that aligns human video data to robot VLA data at two levels: task granularity and action labels.

## Turning Raw Human Videos into VLA Data

The data construction pipeline has three stages.

First, VITRA estimates 3D motion. It detects whether the camera is static or moving, estimates intrinsics, undistorts fisheye or wide-angle videos into a pinhole model, reconstructs per-frame 3D hand motion with **HaWoR**, and represents hand pose with the **MANO** parametric hand model. Camera poses are estimated with a modified MegaSAM pipeline using MoGe-2 depth priors, allowing the system to transform camera-space hand motion into world-space trajectories.

Second, it segments long videos into atomic actions. Instead of using fixed time windows or existing dataset annotations, VITRA cuts at local minima of wrist speed in world space. This is a nicely pragmatic idea: human hand motions often slow down at action boundaries, and because the speed is computed from reconstructed 3D wrist trajectories, the segmentation is tied to action dynamics rather than only image appearance.

Third, it labels each action with language. For every segment, the pipeline samples frames, overlays projected 3D hand trajectories, and asks GPT-4.1 to describe the specified hand action in imperative form. The trajectory overlay is important because it gives the captioning model temporal and geometric hints about what the hand is actually doing.

The resulting dataset contains about **1M atomic VLA episodes** and **26M frames**, sourced from Ego4D, EPIC-KITCHENS, EgoExo4D, and Something-Something-V2. Importantly, the original human annotations from those datasets are not used, because they do not match the desired robotic action granularity.

## Model and Action Space

The VLA model uses **PaliGemma-2 3B** as the vision-language backbone and a **Diffusion Transformer action expert** for action prediction. The VLM receives the image, language instruction, a camera FoV token, and a learnable cognition token. The cognition token becomes the conditioning feature for the diffusion action head.

The model predicts a chunk of future hand actions. In the paper, the hand action is:

$$
a_t = [\Delta t_l, \Delta r_l, \theta_h^l, \Delta t_r, \Delta r_r, \theta_h^r] \in \mathbb{R}^{102}
$$

Here, each hand has 51 dimensions: 3D relative wrist translation, 3D relative wrist rotation, and 45 MANO finger pose angles from 15 joints times 3 Euler angles. The released code pads this into a unified **192-D action space**, where left hand occupies `0:51`, right hand occupies `51:102`, and `102:192` is currently padding. The state is padded to **212-D**. In the code, the active state mostly uses the same left/right hand kinematic slots, while the final 20 dimensions are reserved for MANO beta shape parameters but are not currently used.

This padding is best understood as a fixed interface with masks. The diffusion head always sees the same action dimensionality, but the action mask says which hand and which dimensions are valid. That makes single-hand, dual-hand, human, and robot data easier to route through one model.

## Robot Fine-Tuning and XHand Mapping

My reading of the training flow is: VITRA first learns broad manipulation priors from human data, then uses robot data for deployment adaptation. This is not "robot data only afterthought" exactly, but robot data is not the main source of scale; it is used after pretraining to adapt the policy to real robot embodiment and execution.

For the real robot experiments, the paper uses a Realman arm with a 12-DoF XHand and a RealSense head camera. The robot data is aligned to the human-hand action space: camera-space end-effector pose gives the 6D wrist action, while robot hand joints are mapped to the closest MANO/human-hand joint dimensions.

The released code makes this concrete. XHand raw state/action is 36-D: 18 dimensions per hand, consisting of 6D wrist pose plus 12 hand joints. The function `transfer_xhand_to_human` inserts these XHand dimensions into selected channels of the human/MANO-style action space. During inference, `transfer_human_to_xhand` extracts the same mapped channels back into XHand commands. So the mapping is not an IK solver or full pose retargeting method; it is a hard-coded sparse index/sign correspondence between selected XHand joints and selected MANO action dimensions.

This also explains the relation between human pretraining and robot inference. Human pretraining supervises MANO-style finger action. Robot fine-tuning teaches the model which subset of those human-hand channels matter for XHand, and inference reads only those channels back out for the robot hand.

## Results

On unseen human hand action prediction, VITRA outperforms baselines trained on lab data, original human annotations, and a concurrent hand-VLA baseline. The ablations are intuitive: trajectory-aware augmentation helps, causal action denoising helps, wrist-speed segmentation beats fixed-interval segmentation, and trajectory overlays improve GPT captioning.

The real-robot results are the most important part. After fine-tuning on **1.2K teleoperated robot trajectories**, VITRA reaches **71.0%** average success on seen tasks and **64.6%** on unseen object/background/category settings, substantially higher than the compared baselines including VPP, π0, no VLA pretraining, latent-action pretraining, and OXE pretraining. The paper also shows a positive scaling trend: larger and more diverse human-video pretraining improves both human hand prediction and downstream robot success.

## Codebase Notes

The released repo is useful for understanding the data representation and model interface, but it does not appear to include the complete production-scale raw-video-to-VITRA-1M processing pipeline. It includes dataset documentation, undistortion scripts, metadata formats, loaders, a hand reconstruction wrapper that calls MoGe/HaWoR/MANO, model code, and the robot XHand alignment functions.

For the MANO part, the released metadata stores `hand_pose` as `(T, 15, 3, 3)` local MANO joint rotations, plus wrist orientation, translation, MANO beta, and 21 hand joints. In the training code, the default action type is angle-based, so the finger action is MANO joint pose, not raw robot joint pose. XHand enters later through the sparse mapping described above.

## Takeaway

VITRA is compelling because it treats human video not as a vague source of visual representation, but as explicit action supervision. The key move is to force alignment: segment human videos into robot-like atomic tasks, reconstruct MANO-based 3D hand actions, caption them in robot-instruction style, and train a VLA action head in a unified action space. The approach is imperfect because monocular hand and camera reconstruction is noisy, and the released repo does not expose every dataset-construction component. But the direction feels important: scalable human activity video can become a serious pretraining source for dexterous robot manipulation, with small robot datasets used to bridge embodiment differences.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**VITRA** 的核心想法很直接但很有力量：把真实世界中的第一视角人类活动视频，转成可用于灵巧操作 VLA 预训练的数据。作者把人手看成一种灵巧机器人的末端执行器，用 MANO 表示手部 3D 运动，将长视频切分成原子级手部动作，再为每个片段生成语言指令，最终用这些数据预训练一个基于 PaliGemma 的 VLA 模型和扩散式动作头。机器人数据主要用于后续适配：先在人类视频上学习广泛的操作先验，再用少量真实机器人轨迹微调，并把机器人的手部关节映射到人手/MANO 动作空间中。

## 论文信息

论文标题是 **"Scalable Vision-Language-Action Model Pretraining for Robotic Manipulation with Real-Life Human Activity Videos"**，作者包括 **Qixiu Li、Yu Deng、Yaobo Liang、Lin Luo、Lei Zhou、Chengtang Yao、Lingqi Zeng、Zhiyuan Feng、Huizhi Liang、Sicheng Xu、Yizhong Zhang、Xi Chen、Hao Chen、Lily Sun、Dong Chen、Jiaolong Yang 和 Baining Guo**，来自 **清华大学** 和 **微软亚洲研究院**。项目主页标注为 **ICRA 2026**。论文、项目、代码、数据和模型都可以从 [microsoft.github.io/VITRA](https://microsoft.github.io/VITRA/) 进入，arXiv PDF 为 [2510.21571](https://arxiv.org/pdf/2510.21571)。

## 核心问题

VLA 模型需要动作数据，但真实机器人动作数据采集成本高、规模小，而且常常局限于少数物体、场景和技能。对于灵巧手来说，这个问题更严重，因为大规模灵巧手机器人数据尤其稀缺。相比之下，网络和已有第一视角视频数据集中包含大量真实人类操作行为，但这些视频没有切分、没有标定、噪声很多，也没有可直接用于训练的动作标签。

VITRA 想回答的问题是：能不能把这些原始人类视频转换成机器人 VLA 需要的监督格式，也就是图像、语言指令、状态和未来动作序列？论文的答案是可以，关键在于同时对齐两件事：任务粒度和动作标签。

## 从人类视频到 VLA 数据

整个数据构建流程分为三步。

第一步是估计 3D 运动。系统先判断相机是静止还是运动，估计内参，并把鱼眼或广角视频校正为针孔相机模型。随后使用 **HaWoR** 重建逐帧 3D 手部运动，并用 **MANO** 参数化手模型表示手腕姿态和手指关节角。相机位姿则通过修改后的 MegaSAM 估计，其中使用 MoGe-2 作为深度先验。这样一来，系统可以把相机坐标系下的人手运动转换到世界坐标系中。

第二步是切分原子动作。VITRA 没有简单使用固定时间窗口，也没有使用原始数据集自带的动作标注，而是根据世界坐标系中手腕速度的局部极小值来切分。这个设计很务实：人手在动作切换时往往会短暂减速，因此基于 3D 手腕轨迹的速度极小值，可以比纯图像或固定窗口更贴近真实动作边界。

第三步是生成语言标签。对于每个动作片段，系统采样若干帧，将投影后的 3D 手部轨迹叠加到图像上，再让 GPT-4.1 用祈使句描述指定手的动作。这里的轨迹叠加很关键，因为它给 caption 模型提供了时间顺序和几何运动线索，帮助它判断手到底在做什么。

最终数据集包含约 **100 万个原子 VLA episode** 和 **2600 万帧**，来源包括 Ego4D、EPIC-KITCHENS、EgoExo4D 和 Something-Something-V2。值得注意的是，作者没有使用这些数据集原本的人类动作标注，因为那些标注通常不符合机器人短时操作的粒度。

## 模型与动作空间

VITRA 使用 **PaliGemma-2 3B** 作为视觉语言骨干网络，并使用 **Diffusion Transformer** 作为动作专家。VLM 输入包括图像、语言指令、相机 FoV token 和一个可学习的 cognition token。cognition token 的输出特征会作为扩散动作头的条件。

模型预测未来一段手部动作。论文中的动作定义为：

$$
a_t = [\Delta t_l, \Delta r_l, \theta_h^l, \Delta t_r, \Delta r_r, \theta_h^r] \in \mathbb{R}^{102}
$$

每只手有 51 维：3 维相对手腕平移、3 维相对手腕旋转，以及 45 维 MANO 手指关节角，也就是 15 个关节乘以 3 个 Euler 角。在发布代码中，这个动作会被填充到统一的 **192 维动作空间**：左手占 `0:51`，右手占 `51:102`，`102:192` 当前是 padding。状态则被填充到 **212 维**。代码中真正使用的主要是左右手运动学状态，最后 20 维预留给左右手的 MANO beta 形状参数，但当前没有实际使用。

这些 padding 更适合理解为一个带 mask 的固定接口。扩散动作头始终看到同样维度的动作，但 action mask 会告诉模型哪些手、哪些维度是有效的。这样单手、双手、人类数据和机器人数据都可以通过同一个模型接口处理。

## 机器人微调与 XHand 映射

我对训练流程的理解是：VITRA 先从人类视频中学习通用操作先验，然后再用机器人数据做部署适配。机器人数据并不是完全不重要，但它不是规模的主要来源；它主要负责把模型适配到具体机器人 embodiment 和真实执行上。

真实机器人实验使用 Realman 机械臂、12 自由度 XHand 灵巧手和 RealSense 头部相机。机器人数据会被对齐到人手动作空间：相机坐标系下的末端位姿提供 6D 手腕动作，而机器人手指关节会映射到拓扑上最接近的 MANO/人手关节维度。

发布代码把这件事写得很清楚。XHand 原始状态和动作是 36 维：每只手 18 维，包括 6D 手腕位姿和 12 个手部关节。`transfer_xhand_to_human` 会把这些 XHand 维度插入到人手/MANO 风格动作空间的特定通道中。推理时，`transfer_human_to_xhand` 再从同样的通道取出预测值，转换回 XHand 命令。因此这里不是 IK 求解器，也不是完整的姿态重定向，而是一个手写的稀疏索引和符号映射。

这也解释了人类预训练和机器人推理之间的关系。人类预训练监督的是 MANO 风格的手指动作；机器人微调告诉模型 XHand 具体对应哪些 MANO/人手通道；推理时只读取这些被映射的通道来控制 XHand。

## 结果

在 unseen 环境下的人手动作预测任务中，VITRA 优于使用实验室数据、原始人类标注和并行工作手部 VLA 的基线。消融实验也比较符合直觉：轨迹感知的数据增强有帮助，因果动作去噪有帮助，基于手腕速度的切分优于固定时间切分，给 GPT caption 时叠加手部轨迹也能提升标注质量。

真实机器人结果是论文最关键的部分。模型在 **1200 条遥操作机器人轨迹** 上微调后，在 seen 任务上达到 **71.0%** 平均成功率，在 unseen 物体、背景和类别设置下达到 **64.6%**，明显高于 VPP、π0、无 VLA 预训练、latent action 预训练和 OXE 预训练等基线。论文还展示了正向 scaling 趋势：更大、更丰富的人类视频预训练数据，可以同时提升人手动作预测和下游机器人成功率。

## 代码层面的补充

发布的代码仓库很适合理解数据表示和模型接口，但它似乎没有完整释放生产级的 raw video 到 VITRA-1M 元数据处理流水线。仓库中包含数据文档、去畸变脚本、元数据格式、数据加载器、调用 MoGe/HaWoR/MANO 的手部重建 wrapper、模型代码，以及 XHand 机器人对齐函数。

关于 MANO，发布的数据元信息中 `hand_pose` 是 `(T, 15, 3, 3)` 的 MANO 局部手指关节旋转，同时还有手腕旋转、平移、MANO beta 和 21 个手部关节点。在训练代码中，默认动作类型是 angle，因此 finger action 是 MANO joint pose，而不是原始机器人关节。XHand 是在机器人微调阶段通过前面提到的稀疏映射进入统一动作空间的。

## 我的理解

VITRA 最有价值的地方在于，它没有把人类视频只当作模糊的视觉表征来源，而是努力把它变成显式动作监督。关键是强制对齐：把人类长视频切成机器人式短时任务，恢复 MANO 3D 手部动作，用机器人指令风格生成语言，再用统一动作空间训练 VLA 动作头。这个方向当然不完美，因为单目手部和相机重建会有噪声，而且当前代码没有开放完整数据生产流水线。但整体思路很重要：大规模人类活动视频有机会成为灵巧机器人操作的可扩展预训练来源，而少量机器人数据则用来补齐 embodiment 差异。

</div>
