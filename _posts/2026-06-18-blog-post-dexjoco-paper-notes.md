---
title: "[Paper Notes] DexJoCo: A Benchmark and Toolkit for Task-Oriented Dexterous Manipulation on MuJoCo"
date: 2026-06-18
permalink: /posts/2026/06/dexjoco-paper-notes/
tags:
  - Dexterous Manipulation
  - MuJoCo
  - Benchmark
  - Imitation Learning
  - Vision-Language-Action
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DexJoCo** is a MuJoCo-based benchmark and toolkit for task-oriented dexterous manipulation. Its main value is not a new policy architecture, but a more complete evaluation and data pipeline for dexterous hands: realistic arm-hand simulation, functionally grounded tasks, low-cost teleoperation, replayable demonstrations, domain randomization, unified data conversion, and evaluation support for modern imitation-learning and VLA policies.

The benchmark contains **11 tasks** built around a **Franka Panda + Allegro Hand** setup. These tasks are designed to test capabilities that parallel grippers do not naturally expose: fine finger coordination, tool use, articulated-object interaction, bimanual coordination, long-horizon sequencing, and language-conditioned reasoning. The authors collect **1.1K human demonstration trajectories** and evaluate **ACT**, **Diffusion Policy**, **π0.5**, and **GR00T N1.5**.

My read: DexJoCo is useful because it makes dexterous manipulation evaluation feel less like an isolated RL toy problem and more like a full robot-learning workflow. It exposes an important gap in current policies: visual imitation and VLA pretraining help, but fine contact, insertion, button pressing, temporal memory, and high-dimensional hand action heads remain fragile.

## Paper Info

The paper is **"DexJoCo: A Benchmark and Toolkit for Task-Oriented Dexterous Manipulation on MuJoCo"** by **Hanwen Wang, Weizhi Zhao, Xiangyu Wang, Siyuan Huang, He Lin, Boyuan Zheng, Rongtao Xu, Gang Wang, Yao Mu, He Wang, Lue Fan, Hongsheng Li, Zhaoxiang Zhang, and Tieniu Tan**.

It is available as [arXiv:2605.16257](https://arxiv.org/abs/2605.16257). The project page is [dexjoco.github.io](https://dexjoco.github.io/), and the code is released at [brave-eai/dexjoco](https://github.com/brave-eai/dexjoco). The dataset is also available on Hugging Face in LeRobot format through [DexJoCo/DexJoCo-Datasets-LeRobot](https://huggingface.co/datasets/DexJoCo/DexJoCo-Datasets-LeRobot).

## Problem and Motivation

Dexterous manipulation benchmarks have a structural problem. Many existing dexterous tasks are hand-only, in-hand manipulation, or simple pick-and-place setups. They are useful for low-level control, but they do not fully test what dexterous hands are meant to do in everyday manipulation.

DexJoCo argues that a good dexterous benchmark should satisfy several requirements:

- It should include a realistic **manipulator-hand system**, not only a floating hand.
- It should include tasks where fingers matter, such as tool use, button pressing, folding, squeezing, insertion, and bimanual coordination.
- It should provide a practical way to collect high-quality demonstrations.
- It should support modern policy evaluation, including language-conditioned VLA models and standard dataset formats.
- It should make robustness evaluation easy through visual and dynamics randomization.

This is why DexJoCo is positioned as both a **benchmark** and a **toolkit**.

## Benchmark Design

DexJoCo is built on **MuJoCo**. The robot setup consists of:

- a Rethink Robotics mount as the base;
- a **Franka Panda** manipulator;
- an **Allegro Hand** for dexterous manipulation.

The simulator provides third-person and wrist-mounted RGB/RGB-D observations, object poses, robot states, end-effector pose, and hand joint angles. Demonstration actions are represented as target absolute end-effector poses plus target absolute hand joint angles.

The 11 tasks are:

| Task | Setup | Core Capability |
|---|---|---|
| Hammer Nail | Single-arm | Tool use |
| Click Mouse | Single-arm | Precise button interaction |
| Pick Bucket | Single-arm | Long-horizon object handling |
| Pinch Tongs | Single-arm | Fine finger coordination |
| Fold Glasses | Single-arm | Articulated object manipulation |
| Water Plant | Single-arm | Tool use with functional feedback |
| Unlock iPad | Bimanual | Reasoning + precise touch |
| Hanoi | Bimanual | Sequencing + bimanual coordination |
| Assembly | Bimanual | Peg insertion |
| Microwave Cook | Bimanual | Long-horizon articulated interaction |
| Photograph | Bimanual | Bimanual alignment + button pressing |

The task definition is functional. Each task is specified by interactive objects and a set of success constraints over sequence, pose, articulated joint state, and contact:

```text
G = {g_seq, g_pose, g_joint, g_contact}
```

A task succeeds only when all relevant constraints are satisfied. This matters because a dexterous task should not reward a policy for merely moving close to the right object. It should verify that the intended functional outcome happened.

## Low-Cost Teleoperation

DexJoCo includes a human demonstration collection system with about **$2,300 USD** in hardware:

- **Rokoko Smartgloves** for hand motion capture;
- **HTC Vive Trackers** for wrist pose;
- **HTC Base Stations** for tracking;
- a simple 3D-printed connector.

The glove avoids camera occlusion problems that are common in vision-only hand tracking. The wrist tracker controls the Franka end-effector pose. The hand motion is retargeted to the Allegro Hand using **GeoRT**, a self-supervised retargeting method that does not require paired human-robot annotations.

The retargeting loss combines terms for fingertip motion direction, workspace coverage, uniform sensitivity, pinch behavior, and self-collision avoidance:

```text
L = L_dir + λ1 L_cover + λ2 L_flat + λ3 L_pinch + λ4 L_col
```

This is one of the most practical parts of the paper. The benchmark is paired with a realistic data collection path, so users can collect new trajectories instead of only consuming a fixed dataset.

## Domain Randomization

DexJoCo supports two main evaluation regimes:

- **rand-obj**: object placement and table height are randomized;
- **rand-full**: rand-obj plus third-person camera pose, lighting direction/color, and tabletop texture randomization.

The important implementation detail is replay. Visual randomization can be applied by replaying the same trajectories under different rendering settings. This makes augmentation cheaper because users do not need to recollect teleoperation data for every visual condition.

The code also exposes a `--randomize-dynamics` evaluation option, which randomizes dynamics parameters such as joint friction, stiffness, and object mass.

## Code and Toolkit

The [GitHub repository](https://github.com/brave-eai/dexjoco) is fairly complete. It includes:

- `dexjoco/`: MuJoCo simulation environments and task wrappers;
- `teleoperation/`: Vive/Rokoko/GeoRT interfaces and hardware tutorial;
- `scripts/record_demos_zarr.py`: teleoperation demonstration recording;
- `scripts/replay_demos_zarr.py`: demonstration replay and visual randomization;
- `dexjoco-data-converter/`: conversion to LeRobot datasets and Diffusion Policy Zarr-style buffers;
- `openpi/`: π0.5 training and evaluation support;
- `docs/custom_policy_integration.md`: guidance for plugging in custom policies.

The repository uses a server-client evaluation pattern for OpenPI-style policies. A policy server serves action chunks, while the DexJoCo evaluation client executes buffered actions in the simulator and requests the next plan before the buffer runs dry. This mirrors real deployment more closely than a purely synchronous one-step inference loop.

The action/state conventions are also clearly documented:

| Setup | Policy Action | Environment Action |
|---|---:|---:|
| Single-arm | 22D `[xyz, rotvec, hand16]` | 23D `[xyz, quat, hand16]` |
| Bimanual | 44D `[r_xyz, r_rotvec, r_hand16, l_xyz, l_rotvec, l_hand16]` | 46D quaternion layout |

The recorded state contains privileged environment information for replay, but policy training should use only robot proprioception: the first **23** dimensions for single-arm tasks and the first **46** dimensions for bimanual tasks.

## Policy Evaluation

DexJoCo evaluates five policy variants:

- **ACT**;
- **Diffusion Policy Transformer (DP-T)**;
- **Diffusion Policy CNN (DP-C)**;
- **π0.5**;
- **GR00T N1.5**.

ACT and Diffusion Policy are trained from scratch using vision and proprioception. π0.5 and GR00T N1.5 are fine-tuned with LoRA and also condition on language. Because the default VLA action heads do not directly match bimanual dexterous action dimensions, the authors adapt the action heads, including partially reinitializing extra dimensions.

Under **rand-obj**, the average success rates are:

| Model | Avg. Success |
|---|---:|
| DP-T | 50.4% |
| DP-C | 47.6% |
| ACT | 35.5% |
| π0.5 | 52.5% |
| GR00T N1.5 | 40.2% |

Under **rand-full**, the averages drop sharply:

| Model | Avg. Success |
|---|---:|
| DP-T | 20.0% |
| DP-C | 28.4% |
| ACT | 22.7% |
| π0.5 | 34.1% |
| GR00T N1.5 | 30.5% |

The result is useful because it shows both progress and fragility. π0.5 benefits from large-scale pretraining and achieves the highest overall average. At the same time, smaller Diffusion Policy variants remain competitive, especially on some bimanual settings. This suggests that dexterous manipulation still depends heavily on action representation, temporal memory, and contact-level details rather than only large-scale visual-language pretraining.

## Failure Modes

The paper's failure analysis is especially important. Policies often fail at:

- **button pressing**: they can pick up an object but miss the interactive element;
- **insertion**: Assembly and Hanoi expose precise alignment failures;
- **temporal memory**: Pinch Tongs requires repeated open-close motions;
- **bimanual coordination**: several bimanual tasks remain very difficult;
- **contact-rich control**: vision-only policies lack force/contact cues.

This matches a broader trend in dexterous manipulation: a policy can look semantically correct while failing physically. For example, holding a camera and aiming at a target is not enough if the finger misses the shutter button.

## Main Takeaways

DexJoCo is most useful as an infrastructure paper. It gives the community:

- functionally grounded dexterous tasks;
- a practical teleoperation path;
- replayable human demonstrations;
- standard data conversion;
- VLA and imitation-learning evaluation;
- robustness tests under visual and dynamics randomization.

The benchmark also makes several research gaps concrete:

1. **Dexterous-hand-centric foundation models are still missing.** Current VLA models are mostly pretrained on gripper-heavy robot data, so their action representations transfer poorly to high-DoF hands.
2. **Vision-only policies are insufficient for contact-rich manipulation.** Tactile sensing, force feedback, or better contact state estimation may be needed for reliable precision manipulation.
3. **Bimanual dexterity remains a bottleneck.** The action dimension grows, timing matters, and asymmetric roles between hands are hard.
4. **Language grounding is still shallow.** The paper's iPad password experiment suggests that π0.5 can default to action bias rather than truly following arithmetic or paraphrased language instructions.
5. **Simulation fidelity matters.** Domain randomization helps, but realistic physical, visual, and sensing models are still needed for sim-to-real transfer.

## My Read

DexJoCo feels like a missing benchmark layer between classic dexterous RL environments and real-world dexterous robot learning. It is more grounded than hand-only in-hand manipulation benchmarks, and more dexterous than the gripper-centric VLA evaluation setups.

For my own research taste, the most interesting part is that DexJoCo gives a place to test whether a method truly understands functional interaction. Button pressing, folding, squeezing, pouring, insertion, and bimanual sequencing expose errors that simple pick-and-place cannot reveal.

The code release also matters. Because the repo includes recording, replay, conversion, OpenPI evaluation, and custom policy integration, DexJoCo can be used as a practical testbed rather than only as a paper benchmark.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**DexJoCo** 是一个基于 MuJoCo 的 task-oriented dexterous manipulation benchmark 和 toolkit。它的主要价值不是提出新的 policy architecture，而是为 dexterous hands 提供了一套更完整的评测和数据流程：真实一些的 arm-hand simulation、功能性任务、低成本 teleoperation、可 replay 的 demonstrations、domain randomization、统一的数据转换，以及现代 imitation learning / VLA policy 的评测支持。

这个 benchmark 包含 **11 个任务**，围绕 **Franka Panda + Allegro Hand** 搭建。任务设计的目标是测试 parallel gripper 很难体现的能力：细粒度手指协调、工具使用、articulated object interaction、双手协同、长程任务顺序，以及 language-conditioned reasoning。作者收集了 **1.1K 条 human demonstration trajectories**，并评测了 **ACT**、**Diffusion Policy**、**π0.5** 和 **GR00T N1.5**。

我的理解是：DexJoCo 的价值在于，它让 dexterous manipulation evaluation 不再像一个孤立的 RL toy problem，而更像完整的 robot-learning workflow。它揭示了当前 policy 的一个重要短板：visual imitation 和 VLA pretraining 确实有帮助，但细接触、插入、按按钮、时间记忆，以及高维 hand action head 仍然很脆弱。

## Paper Info

论文标题是 **"DexJoCo: A Benchmark and Toolkit for Task-Oriented Dexterous Manipulation on MuJoCo"**，作者是 **Hanwen Wang, Weizhi Zhao, Xiangyu Wang, Siyuan Huang, He Lin, Boyuan Zheng, Rongtao Xu, Gang Wang, Yao Mu, He Wang, Lue Fan, Hongsheng Li, Zhaoxiang Zhang, and Tieniu Tan**。

论文地址是 [arXiv:2605.16257](https://arxiv.org/abs/2605.16257)。项目页是 [dexjoco.github.io](https://dexjoco.github.io/)，代码在 [brave-eai/dexjoco](https://github.com/brave-eai/dexjoco)。数据也通过 Hugging Face 以 LeRobot 格式发布在 [DexJoCo/DexJoCo-Datasets-LeRobot](https://huggingface.co/datasets/DexJoCo/DexJoCo-Datasets-LeRobot)。

## 问题和动机

Dexterous manipulation benchmark 有一个结构性问题。很多现有 dexterous tasks 是 hand-only、in-hand manipulation，或者简单 pick-and-place。它们对低层控制有用，但不足以测试 dexterous hands 在日常操作里真正应该具备的能力。

DexJoCo 认为，一个好的 dexterous benchmark 应该满足几个要求：

- 它应该包含真实一些的 **manipulator-hand system**，而不是只有 floating hand。
- 它应该包含手指真正重要的任务，比如工具使用、按按钮、折叠、夹取、插入和双手协同。
- 它应该提供一个可实际使用的高质量 demonstration 采集方案。
- 它应该支持现代 policy 评测，包括 language-conditioned VLA models 和标准数据格式。
- 它应该能方便地通过 visual 和 dynamics randomization 评估鲁棒性。

这就是 DexJoCo 同时强调 **benchmark** 和 **toolkit** 的原因。

## Benchmark Design

DexJoCo 基于 **MuJoCo** 构建。机器人系统包含：

- Rethink Robotics mount 作为 base；
- **Franka Panda** manipulator；
- 用于 dexterous manipulation 的 **Allegro Hand**。

模拟器提供 third-person 和 wrist-mounted RGB/RGB-D observations、object poses、robot states、end-effector pose 和 hand joint angles。Demonstration actions 表示为目标 absolute end-effector pose 加目标 absolute hand joint angles。

11 个任务如下：

| Task | Setup | Core Capability |
|---|---|---|
| Hammer Nail | Single-arm | 工具使用 |
| Click Mouse | Single-arm | 精细按钮交互 |
| Pick Bucket | Single-arm | 长程物体操作 |
| Pinch Tongs | Single-arm | 细粒度手指协调 |
| Fold Glasses | Single-arm | Articulated object manipulation |
| Water Plant | Single-arm | 带功能反馈的工具使用 |
| Unlock iPad | Bimanual | 推理 + 精细触控 |
| Hanoi | Bimanual | 顺序执行 + 双手协同 |
| Assembly | Bimanual | Peg insertion |
| Microwave Cook | Bimanual | 长程 articulated interaction |
| Photograph | Bimanual | 双手对齐 + 按按钮 |

任务定义是 functional 的。每个任务由 interactive objects 和一组 success constraints 定义，约束包括顺序、姿态、关节状态和接触：

```text
G = {g_seq, g_pose, g_joint, g_contact}
```

只有所有相关约束都满足，任务才算成功。这一点很重要，因为 dexterous task 不应该只奖励 policy 靠近正确物体。它应该验证预期功能结果是否真的发生。

## Low-Cost Teleoperation

DexJoCo 提供了一套 human demonstration collection system，硬件成本约 **2,300 美元**：

- **Rokoko Smartgloves** 用于 hand motion capture；
- **HTC Vive Trackers** 用于 wrist pose；
- **HTC Base Stations** 用于 tracking；
- 一个简单的 3D-printed connector。

手套避免了 vision-only hand tracking 里常见的遮挡问题。wrist tracker 控制 Franka end-effector pose。手部动作通过 **GeoRT** retarget 到 Allegro Hand，GeoRT 是一种 self-supervised retargeting 方法，不需要 paired human-robot annotations。

Retargeting loss 结合了 fingertip motion direction、workspace coverage、uniform sensitivity、pinch behavior 和 self-collision avoidance：

```text
L = L_dir + λ1 L_cover + λ2 L_flat + λ3 L_pinch + λ4 L_col
```

这是论文里最实用的部分之一。benchmark 搭配了真实可用的数据采集路径，所以用户可以采集新轨迹，而不只是消费一个固定 dataset。

## Domain Randomization

DexJoCo 支持两个主要评测 regime：

- **rand-obj**：随机化 object placement 和 table height；
- **rand-full**：在 rand-obj 基础上，再随机化 third-person camera pose、lighting direction/color 和 tabletop texture。

实现上的关键点是 replay。视觉随机化可以通过在不同渲染条件下 replay 同一条 trajectory 实现。这让 augmentation 更便宜，因为用户不需要为每一种视觉条件重新 teleoperate。

代码里还提供了 `--randomize-dynamics` 评测选项，可以随机化 joint friction、stiffness、object mass 等 dynamics parameters。

## Code and Toolkit

[GitHub 仓库](https://github.com/brave-eai/dexjoco) 相当完整，包含：

- `dexjoco/`：MuJoCo simulation environments 和 task wrappers；
- `teleoperation/`：Vive/Rokoko/GeoRT interfaces 和硬件教程；
- `scripts/record_demos_zarr.py`：teleoperation demonstration recording；
- `scripts/replay_demos_zarr.py`：demonstration replay 和 visual randomization；
- `dexjoco-data-converter/`：转换到 LeRobot datasets 和 Diffusion Policy Zarr-style buffers；
- `openpi/`：π0.5 training 和 evaluation 支持；
- `docs/custom_policy_integration.md`：接入 custom policy 的说明。

仓库采用 server-client evaluation pattern 来支持 OpenPI-style policies。policy server 负责输出 action chunks，DexJoCo evaluation client 在模拟器里执行 buffered actions，并在 buffer 用完前请求下一段 plan。这比纯同步的 one-step inference loop 更接近真实部署。

Action/state conventions 也写得很清楚：

| Setup | Policy Action | Environment Action |
|---|---:|---:|
| Single-arm | 22D `[xyz, rotvec, hand16]` | 23D `[xyz, quat, hand16]` |
| Bimanual | 44D `[r_xyz, r_rotvec, r_hand16, l_xyz, l_rotvec, l_hand16]` | 46D quaternion layout |

记录的 state 包含用于 replay 的 privileged environment information，但 policy training 应该只使用 robot proprioception：single-arm 使用前 **23** 维，bimanual 使用前 **46** 维。

## Policy Evaluation

DexJoCo 评测了五种 policy variants：

- **ACT**；
- **Diffusion Policy Transformer (DP-T)**；
- **Diffusion Policy CNN (DP-C)**；
- **π0.5**；
- **GR00T N1.5**。

ACT 和 Diffusion Policy 从零开始用 vision 和 proprioception 训练。π0.5 和 GR00T N1.5 使用 LoRA fine-tuning，并额外 condition on language。由于默认 VLA action heads 不能直接匹配 bimanual dexterous action dimensions，作者对 action heads 做了适配，包括对额外维度进行部分随机初始化。

在 **rand-obj** 下，平均成功率如下：

| Model | Avg. Success |
|---|---:|
| DP-T | 50.4% |
| DP-C | 47.6% |
| ACT | 35.5% |
| π0.5 | 52.5% |
| GR00T N1.5 | 40.2% |

在 **rand-full** 下，平均成功率明显下降：

| Model | Avg. Success |
|---|---:|
| DP-T | 20.0% |
| DP-C | 28.4% |
| ACT | 22.7% |
| π0.5 | 34.1% |
| GR00T N1.5 | 30.5% |

这个结果很有用，因为它同时展示了进展和脆弱性。π0.5 受益于大规模 pretraining，整体平均成功率最高。同时，更小的 Diffusion Policy variants 仍然很有竞争力，尤其在一些 bimanual settings 上。这说明 dexterous manipulation 仍然强烈依赖 action representation、temporal memory 和 contact-level details，而不只是大规模视觉语言预训练。

## Failure Modes

论文的 failure analysis 很关键。Policies 经常失败在：

- **button pressing**：能拿起物体，但按不到交互元素；
- **insertion**：Assembly 和 Hanoi 暴露精确对齐失败；
- **temporal memory**：Pinch Tongs 需要重复 open-close motions；
- **bimanual coordination**：多个双手任务仍然很难；
- **contact-rich control**：vision-only policies 缺少力和接触信息。

这和 dexterous manipulation 里的一个大趋势一致：policy 在语义上看起来正确，但物理上仍然失败。比如拿起相机并对准目标还不够，手指还必须真的按到快门。

## Main Takeaways

DexJoCo 最适合作为一篇 infrastructure paper 来理解。它为社区提供了：

- functionally grounded dexterous tasks；
- 实用的 teleoperation 路径；
- replayable human demonstrations；
- 标准数据转换；
- VLA 和 imitation-learning evaluation；
- visual 和 dynamics randomization 下的鲁棒性测试。

这个 benchmark 也把几个研究缺口具体化了：

1. **还缺少 dexterous-hand-centric foundation models。** 当前 VLA models 主要在 gripper-heavy robot data 上预训练，所以 action representation 迁移到 high-DoF hands 时很吃力。
2. **Vision-only policies 不足以解决 contact-rich manipulation。** 可靠的精细操作可能需要 tactile sensing、force feedback 或更好的 contact state estimation。
3. **Bimanual dexterity 仍然是瓶颈。** Action dimension 变高，时序更重要，两只手还常常承担不对称角色。
4. **Language grounding 仍然比较浅。** 论文里的 iPad password 实验显示，π0.5 可能会依赖 action bias，而不是真正理解算术或改写后的语言指令。
5. **Simulation fidelity 很重要。** Domain randomization 有帮助，但要做 sim-to-real，还需要更真实的物理、视觉和 sensing models。

## My Read

DexJoCo 像是 classic dexterous RL environments 和 real-world dexterous robot learning 之间缺失的一层 benchmark。它比 hand-only in-hand manipulation benchmark 更 grounded，也比 gripper-centric VLA evaluation setup 更强调 dexterity。

以我的研究口味看，最有意思的是 DexJoCo 提供了一个测试 functional interaction 的场地。按按钮、折叠、夹取、浇水、插入和双手顺序执行，会暴露简单 pick-and-place 看不到的问题。

代码发布也很重要。因为 repo 里包含 recording、replay、conversion、OpenPI evaluation 和 custom policy integration，DexJoCo 可以作为真正可用的 testbed，而不只是论文里的 benchmark。

</div>
