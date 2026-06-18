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

**DexJoCo** is best read as an integrated benchmark and workflow for task-oriented dexterous manipulation. Its contribution is the full stack around policy learning: MuJoCo environments, a Franka Panda + Allegro Hand robot setup, low-cost human teleoperation, replayable demonstrations, LeRobot/Zarr data conversion, policy training and evaluation, and robustness tests under visual and dynamics randomization.

The paper builds **11 functional tasks** and collects **1.1K human demonstration trajectories**. The tasks cover tool use, button pressing, folding, grasping with tongs, watering, peg insertion, articulated-object interaction, bimanual sequencing, and language-conditioned reasoning. My main takeaway is that DexJoCo turns dexterous manipulation from a set of isolated simulator puzzles into a reproducible robot-learning pipeline, while also showing how fragile current imitation-learning and VLA policies remain once fine contact, hand coordination, temporal memory, and visual generalization matter.

## Paper and Resources

The paper is **"DexJoCo: A Benchmark and Toolkit for Task-Oriented Dexterous Manipulation on MuJoCo"** by **Hanwen Wang, Weizhi Zhao, Xiangyu Wang, Siyuan Huang, He Lin, Boyuan Zheng, Rongtao Xu, Gang Wang, Yao Mu, He Wang, Lue Fan, Hongsheng Li, Zhaoxiang Zhang, and Tieniu Tan**. It is available as [arXiv:2605.16257](https://arxiv.org/abs/2605.16257), with a project page at [dexjoco.github.io](https://dexjoco.github.io/), code at [brave-eai/dexjoco](https://github.com/brave-eai/dexjoco), and LeRobot-format data on Hugging Face at [DexJoCo/DexJoCo-Datasets-LeRobot](https://huggingface.co/datasets/DexJoCo/DexJoCo-Datasets-LeRobot).

## 核心论点

Many dexterous manipulation benchmarks emphasize hand-only control, in-hand manipulation, or simple pick-and-place. DexJoCo argues for a more task-oriented setting where the full arm-hand system must produce a functional outcome: a nail is hammered, a mouse is clicked, glasses are folded, a plant is watered, a peg is inserted, an iPad is unlocked, or a camera shutter is pressed. This design makes success depend on sequence, pose, articulated state, and contact:

```text
G = {g_seq, g_pose, g_joint, g_contact}
```

That framing is important because dexterity is evaluated through what the hand accomplishes, with visual plausibility treated as insufficient. The benchmark includes single-arm and bimanual tasks around a MuJoCo model of a Rethink mount, Franka Panda arm, and Allegro Hand. Observations include third-person and wrist RGB/RGB-D views, object poses, robot states, end-effector pose, and hand joint angles; demonstrations use target absolute end-effector poses plus target absolute hand joint angles.

The task suite is broad enough to stress different failure surfaces without turning the post into a catalog: Hammer Nail and Water Plant test tool use, Click Mouse and Photograph test precise button interaction, Pinch Tongs tests finger coordination, Fold Glasses and Microwave Cook test articulated objects, Assembly and Hanoi test alignment and sequencing, Pick Bucket tests long-horizon object handling, and Unlock iPad adds language-conditioned reasoning to bimanual control.

## Teleoperation and Data Pipeline

A strong part of DexJoCo is that the benchmark comes with a practical data path. The authors use a roughly **$2,300 USD** teleoperation setup built from Rokoko Smartgloves, HTC Vive Trackers, HTC Base Stations, and a 3D-printed connector. The glove captures hand motion while avoiding camera-occlusion issues common in vision-only hand tracking; the wrist tracker drives the Franka end-effector. Human hand motion is retargeted to the Allegro Hand with **GeoRT**, using a self-supervised objective over fingertip direction, workspace coverage, sensitivity, pinch behavior, and self-collision:

```text
L = L_dir + λ1 L_cover + λ2 L_flat + λ3 L_pinch + λ4 L_col
```

The released repository mirrors this end-to-end story. `dexjoco/` contains the MuJoCo environments and task wrappers, `teleoperation/` documents the Vive/Rokoko/GeoRT hardware workflow, `scripts/record_demos_zarr.py` and `scripts/replay_demos_zarr.py` support recording and replay, `dexjoco-data-converter/` converts demonstrations into LeRobot datasets and Diffusion Policy-style Zarr buffers, `openpi/` supports π0.5 training and evaluation, and `docs/custom_policy_integration.md` describes the observation/action contract for custom policies.

One useful engineering detail is the OpenPI-style server-client evaluation pattern. The policy server emits action chunks, while the DexJoCo evaluation client buffers and executes those actions in simulation, requesting the next plan before the buffer runs dry. That is closer to deployed policy execution than a purely synchronous one-step inference loop.

| Setup | Policy Action | Environment Action |
|---|---:|---:|
| Single-arm | 22D `[xyz, rotvec, hand16]` | 23D `[xyz, quat, hand16]` |
| Bimanual | 44D `[r_xyz, r_rotvec, r_hand16, l_xyz, l_rotvec, l_hand16]` | 46D quaternion layout |

The state logs include privileged environment information for replay, but policy training should use only robot proprioception: the first **23** dimensions for single-arm tasks and the first **46** dimensions for bimanual tasks.

## Robustness and Evaluation

DexJoCo evaluates ACT, Diffusion Policy Transformer (DP-T), Diffusion Policy CNN (DP-C), **π0.5**, and **GR00T N1.5**. ACT and Diffusion Policy are trained from scratch with vision and proprioception; π0.5 and GR00T N1.5 are LoRA fine-tuned and condition on language. Because default VLA action heads do not directly match bimanual dexterous action dimensions, the authors adapt the heads, including partial reinitialization for extra dimensions.

The robustness design is compact but revealing. **rand-obj** randomizes object placement and table height. **rand-full** adds third-person camera pose, lighting direction/color, and tabletop texture randomization. The replay system lets users apply visual randomization by replaying the same trajectories under different rendering settings, and the code also exposes `--randomize-dynamics` for parameters such as joint friction, stiffness, and object mass.

| Model | rand-obj Avg. Success | rand-full Avg. Success |
|---|---:|---:|
| DP-T | 50.4% | 20.0% |
| DP-C | 47.6% | 28.4% |
| ACT | 35.5% | 22.7% |
| π0.5 | 52.5% | 34.1% |
| GR00T N1.5 | 40.2% | 30.5% |

The table gives the main result in one glance: π0.5 has the strongest average success, but all methods degrade sharply under fuller visual randomization. Smaller Diffusion Policy variants remain competitive on several settings, which suggests that dexterous manipulation still depends heavily on action representation, temporal memory, and contact-level control instead of scaling vision-language pretraining alone.

## Limitations

The failure modes are the most useful part of the benchmark. Policies can look semantically correct while failing physically: they pick up a camera but miss the shutter, reach a button but fail to press it, align near a peg but miss insertion, or start a bimanual sequence and lose timing. Pinch Tongs exposes repeated open-close memory, Assembly and Hanoi expose precise alignment, and several bimanual tasks show how quickly action dimensionality and asymmetric hand roles become bottlenecks.

The benchmark also inherits limits from simulation and sensing. Vision-only policies lack force and tactile cues for contact-rich manipulation. Current VLA models are still mostly pretrained on gripper-heavy robot data, so high-DoF hand action heads require adaptation and can remain brittle. Domain randomization improves coverage, but sim-to-real transfer will still need stronger physical, visual, and sensing fidelity. The iPad password setting also hints that language grounding can collapse into action bias when instructions require arithmetic or paraphrased reasoning.

## Takeaway

DexJoCo is most valuable as infrastructure: it packages functional dexterous tasks, accessible teleoperation, replayable demonstrations, data conversion, policy integration, and robustness evaluation into one benchmark pipeline. For research, it is a good place to test whether a method can actually complete contact-rich functional interactions beyond plausible arm-hand motion. For practice, the code release matters because the benchmark can be extended, replayed, converted, and evaluated with modern imitation-learning and VLA tooling.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**DexJoCo** 更适合被理解为一个面向 task-oriented dexterous manipulation 的 integrated benchmark 和 workflow。它的贡献集中在 policy learning 周围的完整栈：MuJoCo environments、Franka Panda + Allegro Hand 机器人设置、低成本 human teleoperation、可 replay 的 demonstrations、LeRobot/Zarr 数据转换、policy training/evaluation，以及 visual 和 dynamics randomization 下的鲁棒性测试。

论文构建了 **11 个功能性任务**，并收集了 **1.1K 条 human demonstration trajectories**。这些任务覆盖工具使用、按按钮、折叠、夹钳操作、浇水、peg insertion、articulated-object interaction、双手顺序执行和 language-conditioned reasoning。我的主要 takeaway 是：DexJoCo 把 dexterous manipulation 从一组孤立的 simulator puzzles 推向了可复现的 robot-learning pipeline，同时也清楚暴露了当前 imitation-learning 和 VLA policies 在精细接触、手指协调、时间记忆和视觉泛化上的脆弱性。

## Paper and Resources

论文标题是 **"DexJoCo: A Benchmark and Toolkit for Task-Oriented Dexterous Manipulation on MuJoCo"**，作者是 **Hanwen Wang, Weizhi Zhao, Xiangyu Wang, Siyuan Huang, He Lin, Boyuan Zheng, Rongtao Xu, Gang Wang, Yao Mu, He Wang, Lue Fan, Hongsheng Li, Zhaoxiang Zhang, and Tieniu Tan**。论文地址是 [arXiv:2605.16257](https://arxiv.org/abs/2605.16257)，项目页是 [dexjoco.github.io](https://dexjoco.github.io/)，代码在 [brave-eai/dexjoco](https://github.com/brave-eai/dexjoco)，LeRobot 格式数据发布在 Hugging Face 的 [DexJoCo/DexJoCo-Datasets-LeRobot](https://huggingface.co/datasets/DexJoCo/DexJoCo-Datasets-LeRobot)。

## Core Argument

许多 dexterous manipulation benchmarks 侧重 hand-only control、in-hand manipulation 或简单 pick-and-place。DexJoCo 的主张是，一个更 task-oriented 的设置应该要求完整 arm-hand system 产生功能性结果：钉子被敲入、鼠标被点击、眼镜被折叠、植物被浇水、peg 被插入、iPad 被解锁，或者相机快门被按下。于是 success 由顺序、姿态、articulated state 和接触共同定义：

```text
G = {g_seq, g_pose, g_joint, g_contact}
```

这个 framing 很关键，因为 dexterity 的评估对象是手最终完成了什么功能，视觉上合理的姿态本身还不够。benchmark 包含 single-arm 和 bimanual tasks，机器人是 MuJoCo 中的 Rethink mount、Franka Panda arm 和 Allegro Hand。观测包括 third-person 和 wrist RGB/RGB-D views、object poses、robot states、end-effector pose 和 hand joint angles；demonstration actions 表示为目标 absolute end-effector poses 加目标 absolute hand joint angles。

任务覆盖面足够广，但不必展开成长清单：Hammer Nail 和 Water Plant 测试工具使用，Click Mouse 和 Photograph 测试精细按钮交互，Pinch Tongs 测试手指协调，Fold Glasses 和 Microwave Cook 测试 articulated objects，Assembly 和 Hanoi 测试对齐与顺序执行，Pick Bucket 测试长程物体操作，Unlock iPad 则把 language-conditioned reasoning 加入双手控制。

## Teleoperation and Data Pipeline

DexJoCo 很强的一点是 benchmark 配套了可实际使用的数据路径。作者使用约 **2,300 美元** 的 teleoperation setup，由 Rokoko Smartgloves、HTC Vive Trackers、HTC Base Stations 和一个 3D-printed connector 组成。手套负责捕捉 hand motion，避免 vision-only hand tracking 常见的遮挡问题；wrist tracker 驱动 Franka end-effector。人手动作通过 **GeoRT** retarget 到 Allegro Hand，目标函数覆盖 fingertip direction、workspace coverage、sensitivity、pinch behavior 和 self-collision：

```text
L = L_dir + λ1 L_cover + λ2 L_flat + λ3 L_pinch + λ4 L_col
```

代码仓库也延续了这个 end-to-end story。`dexjoco/` 提供 MuJoCo environments 和 task wrappers，`teleoperation/` 说明 Vive/Rokoko/GeoRT 硬件流程，`scripts/record_demos_zarr.py` 和 `scripts/replay_demos_zarr.py` 支持 recording 与 replay，`dexjoco-data-converter/` 将 demonstrations 转成 LeRobot datasets 和 Diffusion Policy 风格的 Zarr buffers，`openpi/` 支持 π0.5 training/evaluation，`docs/custom_policy_integration.md` 则描述 custom policies 需要遵守的 observation/action contract。

一个有用的工程细节是 OpenPI-style server-client evaluation pattern。policy server 输出 action chunks，DexJoCo evaluation client 在模拟器中缓存并执行这些 actions，并在 buffer 用完前请求下一段 plan。这个执行方式比纯同步 one-step inference loop 更接近真实部署。

| Setup | Policy Action | Environment Action |
|---|---:|---:|
| Single-arm | 22D `[xyz, rotvec, hand16]` | 23D `[xyz, quat, hand16]` |
| Bimanual | 44D `[r_xyz, r_rotvec, r_hand16, l_xyz, l_rotvec, l_hand16]` | 46D quaternion layout |

记录的 state 包含用于 replay 的 privileged environment information，但 policy training 应该只使用 robot proprioception：single-arm 取前 **23** 维，bimanual 取前 **46** 维。

## Robustness and Evaluation

DexJoCo 评测了 ACT、Diffusion Policy Transformer (DP-T)、Diffusion Policy CNN (DP-C)、**π0.5** 和 **GR00T N1.5**。ACT 和 Diffusion Policy 从零开始用 vision 和 proprioception 训练；π0.5 和 GR00T N1.5 使用 LoRA fine-tuning，并 condition on language。由于默认 VLA action heads 不能直接匹配 bimanual dexterous action dimensions，作者适配了 action heads，包括对额外维度进行部分重新初始化。

鲁棒性设计很简洁，但很能说明问题。**rand-obj** 随机化 object placement 和 table height。**rand-full** 进一步加入 third-person camera pose、lighting direction/color 和 tabletop texture randomization。replay system 允许用户在不同渲染设置下 replay 同一批 trajectories 来做 visual randomization，代码还提供 `--randomize-dynamics` 来随机化 joint friction、stiffness、object mass 等参数。

| Model | rand-obj Avg. Success | rand-full Avg. Success |
|---|---:|---:|
| DP-T | 50.4% | 20.0% |
| DP-C | 47.6% | 28.4% |
| ACT | 35.5% | 22.7% |
| π0.5 | 52.5% | 34.1% |
| GR00T N1.5 | 40.2% | 30.5% |

这张表给出了最核心的结果：π0.5 的平均成功率最高，但所有方法在更完整的视觉随机化下都明显下降。较小的 Diffusion Policy variants 在一些设置上仍然很有竞争力，这说明 dexterous manipulation 仍然强依赖 action representation、temporal memory 和 contact-level control，不能只靠扩大 vision-language pretraining 来解决。

## Limitations

benchmark 中最有价值的是 failure modes。Policies 常常在语义上看起来正确、物理上却失败：拿起相机但没有按到快门，移动到按钮附近但没有按下，peg 对齐差一点导致插不进去，或者双手任务开始后时序失控。Pinch Tongs 暴露 repeated open-close memory，Assembly 和 Hanoi 暴露精确对齐问题，多个 bimanual tasks 则展示了 action dimensionality 和两只手不对称分工带来的瓶颈。

这个 benchmark 也继承了 simulation 和 sensing 的限制。Vision-only policies 缺少 force 和 tactile cues，很难稳定完成 contact-rich manipulation。当前 VLA models 主要在 gripper-heavy robot data 上预训练，迁移到 high-DoF hand action heads 时需要额外适配，仍然容易脆弱。Domain randomization 能提升覆盖面，但 sim-to-real 还需要更强的物理、视觉和传感建模。iPad password 设置也提示，语言指令需要算术或改写理解时，policy 可能退化为 action bias。

## Takeaway

DexJoCo 的最大价值是 infrastructure：它把功能性 dexterous tasks、可负担的 teleoperation、可 replay 的 demonstrations、数据转换、policy integration 和鲁棒性评测打包成一个 benchmark pipeline。对研究来说，它适合检验一个方法是否真的能完成 contact-rich functional interactions，超越表面上合理的 arm-hand motion。对实践来说，代码发布很重要，因为这个 benchmark 可以被扩展、replay、转换，并接入现代 imitation-learning 和 VLA tooling。

</div>
