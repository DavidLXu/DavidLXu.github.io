---
title: "[Paper Notes] TopoRetarget: Interaction-Preserving Retargeting for Dexterous Manipulation"
date: 2026-06-19
permalink: /posts/2026/06/toporetarget-paper-notes/
tags:
  - Dexterous Manipulation
  - Motion Retargeting
  - Reinforcement Learning
  - Trajectory Optimization
  - Sim-to-Real
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**TopoRetarget** is an interaction-preserving retargeting framework for dexterous manipulation. Its key message is simple and important: for contact-rich manipulation, retargeting should not only copy human hand pose. It should preserve the **local hand-object interaction** that makes the task work.

The method builds a sparse interaction graph over hand and object keypoints, then solves a topology-aware Laplacian optimization with directional consistency, kinematic constraints, and penetration handling. The resulting robot references are used to train a lightweight PPO tracking controller. The paper reports better contact precision and alignment than OmniRetarget, Mink, DexPilot, and GeoRT, improves Pen-Spin RL tracking success by more than 40 percentage points over baselines, and demonstrates zero-shot sim-to-real transfer on Wuji Hand for cube reorientation and pen spinning.

My read: TopoRetarget sits exactly at the bottleneck between human demonstration data and reinforcement learning. If the reference trajectory has wrong contacts, the RL policy learns from a broken target. TopoRetarget tries to make the reference itself physically meaningful before policy learning starts.

## Paper Info

The paper is **"TopoRetarget: Interaction-Preserving Retargeting for Dexterous Manipulation"** by **Jielin Wu, Shenzhe Yao, Guanqi He, Xiaohan Liu, Zhaoqing Zeng, Xiangrui Jiang, Han Yang, Wentao Zhang, and Hang Zhao**.

The project page lists the venue as **CoRL 2026**. The arXiv entry is [arXiv:2606.16272](https://arxiv.org/abs/2606.16272), and the project page is [toporetarget2026.github.io/TopoRetarget](https://toporetarget2026.github.io/TopoRetarget/). The project page currently shows the **Code** link as disabled, so I treat the released material as paper + project page for now.

## Problem and Motivation

Human hand-object demonstrations are useful references for dexterous robot learning. They contain dense information about how fingers move, where the object is, and when contact changes. Reference-based reinforcement learning can use these trajectories to avoid exploring long-horizon contact-rich behaviors from scratch.

The problem is that retargeting a human hand to a robot hand is not only a pose-matching problem. Human and robot hands have different link lengths, joint limits, palm shapes, finger arrangement, and contact surfaces. A method can match fingertip positions while destroying the contact structure that actually performs the task.

For dexterous manipulation, contact can happen on:

- fingertips;
- intermediate phalanges;
- finger sides;
- palm regions;
- changing combinations of the above over time.

If retargeting drifts away from these local relationships, the downstream policy receives a poor reference: the robot may penetrate the object, miss a non-tip contact, grasp from the wrong side, or track a pose that is kinematically feasible but functionally useless.

TopoRetarget reframes retargeting as **interaction-preserving reference generation**.

## Core Idea

The central idea is to preserve the local topology of hand-object interaction.

Instead of saying:

```text
make robot joints look like the human hand pose
```

TopoRetarget says:

```text
preserve which hand regions are near which object regions, and preserve their local directions and distances
```

This matters because the object-relative geometry is often the task. In pen spinning, for example, the useful contact does not stay on a single fingertip. It moves across fingertips, phalanges, and side surfaces. A hand-centric objective can look plausible while losing the rolling contact sequence.

## Method Overview

TopoRetarget takes as input:

- a human hand trajectory represented by MediaPipe-style hand keypoints;
- an object pose trajectory;
- an object mesh;
- a target dexterous hand model.

It outputs:

- a robot base-pose trajectory;
- a robot joint trajectory;
- a retargeted reference that can be tracked by an RL policy.

The pipeline has three major stages.

## 1. Relative Bone-Direction Initialization

First, the method produces an initial robot-hand configuration by matching local finger articulation. For each finger, it compares relative bone directions between adjacent bone pairs rather than trying to directly map human joint angles to robot joint angles.

The initialization objective encourages the robot hand to reproduce the source hand's relative bone directions while staying temporally smooth:

```text
E_bone(q) = sum over adjacent bone pairs of relative direction mismatch
```

This gives a reasonable starting point for the more important interaction-aware refinement stage.

## 2. Interaction Mesh Construction

At each frame, TopoRetarget samples object surface points and combines them with hand keypoints:

```text
source vertices = [human hand keypoints; object surface samples]
robot vertices  = [robot hand keypoints; object surface samples]
```

It then runs Delaunay tetrahedralization on the source vertices to construct an interaction edge set. The same graph connectivity is reused for the robot vertices.

This shared graph is important. It lets the optimizer compare the human and robot hand-object configurations under the same local neighborhood structure. In other words, it gives the retargeting objective a way to ask whether the robot preserved the local interaction topology of the human demonstration.

## 3. Topology-Aware Laplacian Optimization

The refinement step matches weighted Laplacian coordinates on the shared interaction graph.

The paper computes source-frame distance-aware edge weights:

```text
w_ij proportional to exp(-kappa * distance(i, j))
```

Nearby hand-object relationships receive stronger weights. The interaction-mesh energy compares the Laplacian coordinates of the source and robot vertex sets:

```text
E_IM = average || Delta(robot vertices) - Delta(source vertices) ||^2
```

The final optimization combines:

- interaction-mesh preservation;
- bone-direction prior;
- temporal smoothness;
- floating-base regularization;
- kinematic feasibility;
- soft and hard penetration handling.

The authors emphasize that they use a fixed parameter setting across experiments rather than case-by-case tuning. This is a meaningful claim because retargeting methods often become fragile when each object, hand, or scale needs manual adjustment.

## Minimal RL Tracking Controller

TopoRetarget is not only evaluated as a static retargeting method. The paper uses the retargeted references to train RL tracking policies.

The RL setup is deliberately lightweight:

- finite-horizon MDP;
- **PPO** optimizer;
- residual joint-position action;
- reference-state initialization;
- object, hand-link, joint, and smoothness rewards;
- domain randomization.

The policy action is residual:

```text
target joint position = reference joint position + residual action
```

This keeps the demonstration as a strong prior and asks the policy to correct errors rather than discover the full skill from scratch.

The observation includes:

- proprioception: current finger joint positions, velocities, previous action;
- object observation: object axis points in the robot base frame;
- reference observation: current and lookahead joint/object/link references.

The reward is:

```text
r = w_obj r_obj + w_link r_link + w_joint r_joint + w_smooth r_smooth
```

The largest weight is assigned to object tracking. Training randomizes object mass, center of mass, friction, actuator gains, joint damping, inertial properties, observation noise, delays, and external disturbances. The reported PPO setup uses 4096 parallel environments, 20 Hz control, and 20-second episodes.

## Experiments

The experiments ask three questions:

1. Does TopoRetarget preserve local hand-object interaction?
2. Do better references improve downstream RL tracking?
3. Can the same parameters generalize across object scales and robot hand embodiments?

The baselines are:

- **OmniRetarget**;
- **Mink**;
- **DexPilot**;
- **GeoRT**.

## Retargeting Quality

On the ContactPose Dataset, TopoRetarget achieves the best contact precision and alignment:

| Method | Contact Precision ↓ | Contact Alignment ↓ | Max Penetration ↓ | Solve Time ↓ |
|---|---:|---:|---:|---:|
| TopoRetarget | 7.71 mm | 15.67 deg | 1.07 mm | 4.70 ms/frame |
| OmniRetarget | 14.15 mm | 30.80 deg | 1.15 mm | 40.96 ms/frame |
| Mink | 14.12 mm | 37.36 deg | 20.12 mm | 4.37 ms/frame |
| DexPilot | 14.13 mm | 33.71 deg | 11.87 mm | 1.74 ms/frame |
| GeoRT | 26.77 mm | 25.74 deg | 22.22 mm | 1.17 ms/frame |

The takeaway is not only that TopoRetarget is more accurate. It also avoids severe penetration while remaining near real-time. That combination is important because retargeting is often used inside data generation or teleoperation pipelines.

## Downstream RL Tracking

The downstream RL results are the most convincing part of the paper. The authors generate references with each retargeting method, train identical PPO tracking policies, and evaluate success rate and object tracking error.

On the **Ho-cap Dataset**:

| Method | Success Rate ↑ | Object Position Error ↓ | Object Rotation Error ↓ |
|---|---:|---:|---:|
| TopoRetarget | 84.4% | 0.87 cm | 5.76 deg |
| OmniRetarget | 56.2% | 1.07 cm | 7.87 deg |
| Mink | 75.0% | 0.91 cm | 5.55 deg |
| DexPilot | 75.0% | 0.92 cm | 4.99 deg |
| GeoRT | 75.0% | 0.90 cm | 6.07 deg |

On the **MoCap Pen-Spin Dataset**:

| Method | Success Rate ↑ | Object Position Error ↓ | Object Rotation Error ↓ |
|---|---:|---:|---:|
| TopoRetarget | 87.5% | 0.98 cm | 9.25 deg |
| OmniRetarget | 46.9% | 1.45 cm | 14.26 deg |
| Mink | 21.9% | 1.61 cm | 15.25 deg |
| DexPilot | 40.6% | 1.29 cm | 17.66 deg |
| GeoRT | 31.2% | 1.19 cm | 18.62 deg |

Pen spinning is the stress test. It contains fast motion and frequent non-tip contact transitions. This is exactly where preserving local interaction topology matters most.

## Real Robot Transfer

The paper further demonstrates zero-shot sim-to-real transfer on **Wuji Hand** hardware for:

- cube reorientation;
- pen spinning.

This is important because it suggests that better retargeted references can improve not only simulation tracking but also the real-world execution of learned tracking policies. The project page also shows real-world videos and claims 5 / 5 zero-shot pen-spinning trials keep the pen spinning.

## Generalization

TopoRetarget also demonstrates retargeting across object scales and dexterous hand embodiments while keeping the same retargeting parameters fixed. The interaction mesh is rebuilt over the new object surface, and the Laplacian refinement preserves local relations under the new scale or hand model.

This makes the method useful for augmentation:

```text
one human demonstration
  -> multiple object scales
  -> multiple robot hand embodiments
  -> more reference trajectories
```

For dexterous robot learning, this is a practical benefit. Human demonstration data is expensive, so augmentation through reliable retargeting can increase data diversity without new human collection.

## Strengths

The strongest parts of TopoRetarget are:

- It targets the correct abstraction: **interaction**, not only hand pose.
- It handles non-tip contacts, which are central to real dexterous manipulation.
- It uses one fixed parameter setting across tasks and embodiments.
- It links retargeting quality to downstream RL policy success.
- It demonstrates zero-shot transfer to a real dexterous hand.
- It remains fast enough for real-time use, with reported solve time under 5 ms per frame.

## Limitations

The main limitation is dependence on upstream human reference quality. The authors mention that TopoRetarget can handle some contact distortion caused by penetration in the source motion, but it is less effective for **virtual contacts**, where the source finger is intended to interact with the object but does not actually touch the object surface.

This is a real issue for pipelines based on noisy perception or imperfect motion capture. If the original human trajectory misses a contact, the interaction graph has no correct contact relation to preserve. Future work may need source-motion preprocessing or contact completion before retargeting.

Another limitation is scope. The paper focuses on single-hand object manipulation. Extending the same interaction-preserving idea to bimanual manipulation, articulated objects, or whole arm-hand systems would be a natural next step.

## Takeaways

TopoRetarget is useful because it makes retargeting a first-class part of the learning pipeline. In dexterous manipulation, the reference trajectory is not just a target curve. It defines which contacts the policy should learn to create and maintain.

For me, the key lesson is:

**Retargeting quality becomes policy learning quality.**

If the retargeted reference loses contact topology, RL has to repair a broken demonstration. If the reference preserves local hand-object interaction, RL can focus on robust tracking and sim-to-real adaptation.

This connects directly to the broader trend in recent dexterous manipulation papers: human demonstrations are increasingly valuable, but they only become robot data after careful conversion. TopoRetarget is a strong example of this conversion step.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**TopoRetarget** 是一个面向 dexterous manipulation 的 interaction-preserving retargeting 框架。它最重要的信息很简单：对于 contact-rich manipulation，retargeting 不能只复制 human hand pose，还要保留让任务真正成立的 **local hand-object interaction**。

方法会在手和物体 keypoints 之间构建一个 sparse interaction graph，然后用 topology-aware Laplacian optimization 来做 retargeting，同时加入 directional consistency、kinematic constraints 和 penetration handling。生成的 robot references 会进一步用于训练轻量 PPO tracking controller。论文报告：它在 ContactPose 上比 OmniRetarget、Mink、DexPilot、GeoRT 有更好的接触精度和对齐；在 Pen-Spin 任务上比 baseline 提升超过 40 个百分点的 RL tracking success；并且能在 Wuji Hand 上对 cube reorientation 和 pen spinning 做 zero-shot sim-to-real transfer。

我的理解是：TopoRetarget 正好处在人类 demonstration data 和 reinforcement learning 之间的关键瓶颈上。如果 reference trajectory 的接触关系错了，RL policy 学到的就是坏目标。TopoRetarget 试图在 policy learning 之前，把 reference 本身变得物理上更有意义。

## Paper Info

论文标题是 **"TopoRetarget: Interaction-Preserving Retargeting for Dexterous Manipulation"**，作者是 **Jielin Wu, Shenzhe Yao, Guanqi He, Xiaohan Liu, Zhaoqing Zeng, Xiangrui Jiang, Han Yang, Wentao Zhang, and Hang Zhao**。

项目页标注 venue 为 **CoRL 2026**。arXiv 地址是 [arXiv:2606.16272](https://arxiv.org/abs/2606.16272)，项目页是 [toporetarget2026.github.io/TopoRetarget](https://toporetarget2026.github.io/TopoRetarget/)。目前项目页上的 **Code** 链接是 disabled，所以这里暂时把它当作论文和项目页材料来整理。

## 问题和动机

Human hand-object demonstrations 对 dexterous robot learning 很有价值。它们包含手指如何运动、物体在哪里、接触什么时候切换等密集信息。Reference-based reinforcement learning 可以用这些 trajectories 来避免从零探索长程 contact-rich behaviors。

难点在于，把 human hand retarget 到 robot hand，不只是 pose matching。人手和机器人手在 link length、joint limits、palm shape、finger arrangement 和 contact surfaces 上都有差异。一个方法可能把 fingertip positions 对齐得不错，却破坏了真正完成任务的 contact structure。

在 dexterous manipulation 里，接触可能发生在：

- fingertips；
- intermediate phalanges；
- finger sides；
- palm regions；
- 上面这些区域随时间变化的组合。

如果 retargeting 让这些 local relationships 漂移，downstream policy 会收到很差的 reference：机器人可能穿透物体、错过非指尖接触、从错误方向抓取，或者追踪一个运动学可行但功能上无效的姿态。

TopoRetarget 把 retargeting 重新定义成 **interaction-preserving reference generation**。

## Core Idea

核心想法是保留 hand-object interaction 的 local topology。

传统目标可以概括为：

```text
让机器人关节看起来像 human hand pose
```

TopoRetarget 的目标更接近：

```text
保留哪些手部区域靠近哪些物体区域，以及这些局部关系的方向和距离
```

这很重要，因为 object-relative geometry 往往就是任务本身。以 pen spinning 为例，有效接触不会固定在某个 fingertip 上。它会在 fingertips、phalanges 和 side surfaces 之间移动。Hand-centric objective 可能看起来合理，但会丢掉 rolling contact sequence。

## Method Overview

TopoRetarget 的输入包括：

- 由 MediaPipe-style hand keypoints 表示的 human hand trajectory；
- object pose trajectory；
- object mesh；
- target dexterous hand model。

输出包括：

- robot base-pose trajectory；
- robot joint trajectory；
- 一个可被 RL policy tracking 的 retargeted reference。

整体 pipeline 有三个主要阶段。

## 1. Relative Bone-Direction Initialization

第一步，方法通过匹配局部 finger articulation 来生成初始 robot-hand configuration。它对比的是相邻 bone pairs 的 relative bone directions，而不是直接把人手关节角映射到机器人关节角。

初始化目标鼓励机器人手复现 source hand 的 relative bone directions，同时保持时间平滑：

```text
E_bone(q) = sum over adjacent bone pairs of relative direction mismatch
```

这一步为后续更重要的 interaction-aware refinement 提供一个合理初值。

## 2. Interaction Mesh Construction

在每一帧，TopoRetarget 会采样 object surface points，并把它们和 hand keypoints 合并：

```text
source vertices = [human hand keypoints; object surface samples]
robot vertices  = [robot hand keypoints; object surface samples]
```

然后它在 source vertices 上做 Delaunay tetrahedralization，得到 interaction edge set。这个相同的 graph connectivity 会被复用到 robot vertices 上。

这个 shared graph 很关键。它让优化器可以在相同的 local neighborhood structure 下比较 human 和 robot 的 hand-object configurations。换句话说，它给 retargeting objective 一个方式去检查机器人是否保留了人类 demonstration 的 local interaction topology。

## 3. Topology-Aware Laplacian Optimization

refinement 阶段会在 shared interaction graph 上匹配 weighted Laplacian coordinates。

论文计算 source-frame distance-aware edge weights：

```text
w_ij proportional to exp(-kappa * distance(i, j))
```

更近的 hand-object relationships 权重更高。Interaction-mesh energy 比较 source 和 robot vertex sets 的 Laplacian coordinates：

```text
E_IM = average || Delta(robot vertices) - Delta(source vertices) ||^2
```

最终优化目标结合了：

- interaction-mesh preservation；
- bone-direction prior；
- temporal smoothness；
- floating-base regularization；
- kinematic feasibility；
- soft 和 hard penetration handling。

作者强调所有实验使用固定参数设置，没有针对每个 case 做大量调参。这个 claim 很有意义，因为 retargeting 方法经常在每个 object、hand 或 scale 上需要人工调整。

## Minimal RL Tracking Controller

TopoRetarget 不只做静态 retargeting 评测。论文还用 retargeted references 来训练 RL tracking policies。

RL 设置刻意保持轻量：

- finite-horizon MDP；
- **PPO** optimizer；
- residual joint-position action；
- reference-state initialization；
- object、hand-link、joint 和 smoothness rewards；
- domain randomization。

policy action 是 residual：

```text
target joint position = reference joint position + residual action
```

这样 demonstration 会作为很强的 prior，policy 只需要修正 tracking error，而不是从零发现完整技能。

Observation 包括：

- proprioception：当前 finger joint positions、velocities、previous action；
- object observation：robot base frame 下的 object axis points；
- reference observation：当前和 lookahead 的 joint/object/link references。

Reward 形式为：

```text
r = w_obj r_obj + w_link r_link + w_joint r_joint + w_smooth r_smooth
```

最大权重给 object tracking。训练时随机化 object mass、center of mass、friction、actuator gains、joint damping、inertial properties、observation noise、delays 和 external disturbances。论文报告的 PPO 设置包括 4096 个 parallel environments、20 Hz control 和 20 秒 episode。

## Experiments

实验回答三个问题：

1. TopoRetarget 是否能保留 local hand-object interaction？
2. 更好的 references 是否能改善 downstream RL tracking？
3. 同一套参数是否能泛化到不同 object scales 和 robot hand embodiments？

Baselines 包括：

- **OmniRetarget**；
- **Mink**；
- **DexPilot**；
- **GeoRT**。

## Retargeting Quality

在 ContactPose Dataset 上，TopoRetarget 取得了最好的 contact precision 和 alignment：

| Method | Contact Precision ↓ | Contact Alignment ↓ | Max Penetration ↓ | Solve Time ↓ |
|---|---:|---:|---:|---:|
| TopoRetarget | 7.71 mm | 15.67 deg | 1.07 mm | 4.70 ms/frame |
| OmniRetarget | 14.15 mm | 30.80 deg | 1.15 mm | 40.96 ms/frame |
| Mink | 14.12 mm | 37.36 deg | 20.12 mm | 4.37 ms/frame |
| DexPilot | 14.13 mm | 33.71 deg | 11.87 mm | 1.74 ms/frame |
| GeoRT | 26.77 mm | 25.74 deg | 22.22 mm | 1.17 ms/frame |

这里的 takeaway 不只是 TopoRetarget 更准确。它还能避免严重 penetration，同时接近 real-time。这种组合很重要，因为 retargeting 经常会被放进数据生成或 teleoperation pipeline。

## Downstream RL Tracking

downstream RL 结果是论文最有说服力的部分。作者用每种 retargeting method 生成 references，训练相同的 PPO tracking policies，然后评估 success rate 和 object tracking error。

在 **Ho-cap Dataset** 上：

| Method | Success Rate ↑ | Object Position Error ↓ | Object Rotation Error ↓ |
|---|---:|---:|---:|
| TopoRetarget | 84.4% | 0.87 cm | 5.76 deg |
| OmniRetarget | 56.2% | 1.07 cm | 7.87 deg |
| Mink | 75.0% | 0.91 cm | 5.55 deg |
| DexPilot | 75.0% | 0.92 cm | 4.99 deg |
| GeoRT | 75.0% | 0.90 cm | 6.07 deg |

在 **MoCap Pen-Spin Dataset** 上：

| Method | Success Rate ↑ | Object Position Error ↓ | Object Rotation Error ↓ |
|---|---:|---:|---:|
| TopoRetarget | 87.5% | 0.98 cm | 9.25 deg |
| OmniRetarget | 46.9% | 1.45 cm | 14.26 deg |
| Mink | 21.9% | 1.61 cm | 15.25 deg |
| DexPilot | 40.6% | 1.29 cm | 17.66 deg |
| GeoRT | 31.2% | 1.19 cm | 18.62 deg |

Pen spinning 是压力测试。它包含快速运动和频繁的 non-tip contact transitions。这正是 local interaction topology 最重要的场景。

## Real Robot Transfer

论文进一步在 **Wuji Hand** 硬件上展示了 zero-shot sim-to-real transfer：

- cube reorientation；
- pen spinning。

这说明更好的 retargeted references 不只改善 simulation tracking，也可能改善 learned tracking policies 的真实执行。项目页还展示了真实视频，并写到 5 / 5 zero-shot pen-spinning trials 都能保持 pen spinning。

## Generalization

TopoRetarget 还展示了在保持同一套 retargeting parameters 不变的情况下，跨 object scales 和 dexterous hand embodiments 做 retargeting。Interaction mesh 会在新的 object surface 上重建，Laplacian refinement 会在新的 scale 或 hand model 下保留局部关系。

这让它可以用于 augmentation：

```text
one human demonstration
  -> multiple object scales
  -> multiple robot hand embodiments
  -> more reference trajectories
```

对 dexterous robot learning 来说，这是非常实用的优势。Human demonstration data 很贵，如果 reliable retargeting 能产生多样化 reference，就可以在不重新采集人类数据的情况下增加数据多样性。

## Strengths

TopoRetarget 的优势主要在于：

- 它抓住了正确抽象：**interaction**，而不只是 hand pose。
- 它能处理真实 dexterous manipulation 中非常关键的 non-tip contacts。
- 它在不同任务和 embodiments 上使用固定参数。
- 它把 retargeting quality 和 downstream RL policy success 直接连起来。
- 它展示了 zero-shot transfer 到真实 dexterous hand。
- 它速度足够快，报告 solve time 小于 5 ms/frame。

## Limitations

主要限制是依赖 upstream human reference quality。作者提到，TopoRetarget 可以处理一些由 source motion penetration 带来的 contact distortion，但对 **virtual contacts** 效果较弱。所谓 virtual contacts，是指 source finger 本应和物体交互，但实际没有接触到 object surface。

对于基于 noisy perception 或 imperfect motion capture 的 pipeline，这会是现实问题。如果原始 human trajectory 漏掉了某个 contact，interaction graph 就没有正确的 contact relation 可以保留。未来可能需要在 retargeting 之前加入 source-motion preprocessing 或 contact completion。

另一个限制是任务范围。论文主要关注 single-hand object manipulation。把同样的 interaction-preserving idea 扩展到 bimanual manipulation、articulated objects，或者完整 arm-hand systems，会是很自然的下一步。

## Takeaways

TopoRetarget 的价值在于，它把 retargeting 变成 learning pipeline 里的核心环节。在 dexterous manipulation 里，reference trajectory 不只是目标曲线。它定义了 policy 应该学会制造和维持哪些接触。

对我来说，最关键的结论是：

**Retargeting quality becomes policy learning quality.**

如果 retargeted reference 丢掉了 contact topology，RL 就必须修复一个坏 demonstration。如果 reference 保留了 local hand-object interaction，RL 就可以专注于 robust tracking 和 sim-to-real adaptation。

这和最近 dexterous manipulation 论文里的大趋势直接相关：human demonstrations 越来越有价值，但它们只有经过仔细转换之后，才真正变成 robot data。TopoRetarget 是这个 conversion step 的一个很强例子。

</div>
