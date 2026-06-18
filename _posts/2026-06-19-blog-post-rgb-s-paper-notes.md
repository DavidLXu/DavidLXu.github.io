---
title: "[Paper Notes] RGB-S: Image-Aligned Tactile Saliency for Robust Dexterous Manipulation"
date: 2026-06-19
permalink: /posts/2026/06/rgb-s-paper-notes/
tags:
  - Visuo-Tactile
  - Dexterous Manipulation
  - Tactile Sensing
  - Imitation Learning
  - Diffusion Policy
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**RGB-S** is a lightweight way to fuse touch and vision for dexterous manipulation. The core idea is direct and practical: use robot forward kinematics and camera calibration to project tactile sensor locations into the RGB image plane, then render a force-modulated Gaussian saliency map. The policy receives RGB plus this tactile saliency channel.

This changes tactile input from a robot-centric vector into an image-aligned spatial cue. The representation is called **RGB-Saliency**, or **RGB-S**:

$$
X_t = \mathrm{Concat}(I_t, S_t) \in \mathbb{R}^{H \times W \times 4}
$$

where \(I_t\) is RGB and \(S_t\) is the tactile saliency map. The saliency channel is injected into a pretrained ResNet-18 visual encoder through a zero-initialized fourth input channel, preserving the original RGB behavior at initialization.

The result is strongest under visual occlusion. In real-world occluded dexterous manipulation, RGB-S reaches **51.7%** average success, compared with **25.0%** for the strongest implicit visuo-tactile baseline, giving a **+26.7 percentage-point** improvement.

## Paper Info

The paper is **"RGB-S: Image-Aligned Tactile Saliency for Robust Dexterous Manipulation"** by **Shengcheng Luo, Kefei Wu, Xiaoying Zhou, Wanlin Li, Ziyuan Jiao, and Chenxi Xiao**.

It appears on arXiv as [arXiv:2606.08765](https://arxiv.org/abs/2606.08765), with v2 dated **June 11, 2026**. The project page is [touch-as-saliency.github.io](https://touch-as-saliency.github.io/).

## Problem and Motivation

Dexterous manipulation often needs touch. Vision gives broad scene understanding and benefits from pretrained visual encoders. Touch gives direct evidence of contact, force, and physical interaction, especially when the object or hand is visually occluded.

The difficulty is alignment. RGB images live in a dense 2D coordinate system. Tactile readings often arrive as sparse, low-dimensional, robot-specific vectors. Many existing policies concatenate tactile features with visual features, use FiLM-style modulation, or mix modalities through attention. These methods can work, yet the policy must learn the spatial correspondence between taxels and image regions from limited demonstrations.

RGB-S adds a geometric prior before learning begins. If we know the robot configuration, tactile sensor offsets, camera intrinsics, and camera extrinsics, each tactile sensor can be projected into the RGB image. A tactile contact then becomes a visual saliency point at the approximate image location where contact is happening.

This is especially useful under occlusion. When the RGB pixels around the object are masked or unreliable, the projected contact map can still tell the visual encoder where physical interaction is occurring.

## Force-Aware Kinematic Projection

The method starts with tactile readings:

$$
f_t = \{f_{i,t}\}_{i=1}^{M}
$$

where each \(f_{i,t}\) is a scalar force magnitude or contact intensity from tactile sensor node \(i\).

For each tactile node, the 3D world position is computed with forward kinematics:

$$
P_{i,t} = \mathrm{FK}(s_t, L_i)
$$

Here, \(s_t\) is robot proprioception, and \(L_i\) is the fixed local offset of the tactile sensor relative to its attached robot link.

Then, for camera view \(c\), the node is projected into the image plane:

$$
[u^c_{i,t}, v^c_{i,t}, 1]^\top
\sim
K_c(R_cP_{i,t}+t_c)
$$

where \(K_c\) is the camera intrinsic matrix, and \(R_c, t_c\) are extrinsics. Nodes outside image bounds are discarded.

The projected sparse contacts are rendered as a dense saliency map:

$$
S^c_t(u,v)
=
\max_{i \in V^c_t}
\tilde{f}_{i,t}
\exp
\left(
-\frac{(u-u^c_{i,t})^2 + (v-v^c_{i,t})^2}{2\sigma^2}
\right)
$$

The force is normalized with:

$$
\tilde{f}_{i,t} =
\tanh(\gamma f_{i,t}/F^i_{limit})
$$

The Gaussian handles uncertainty from calibration, kinematics, and contact localization. The force modulation preserves more information than a binary contact map, while max aggregation keeps the map bounded when multiple contacts overlap.

## Network Architecture

After building the RGB-S input, the model uses a standard visual encoder with a small modification. The ResNet-18 first convolution is expanded from three input channels to four:

$$
z^c_t = W_{rgb} * I^c_t + W_s * S^c_t
$$

The RGB weights \(W_{rgb}\) are initialized from the pretrained ResNet-18. The new tactile saliency weights \(W_s\) are initialized to zero.

This zero initialization is important. At the start of training, the RGB-S encoder behaves exactly like the original RGB encoder. During fine-tuning, the saliency channel learns how to influence the visual representation. This gives the method a stable path to reuse pretrained RGB features while adding touch.

The output feature map is compressed with SpatialSoftmax using **32 keypoints**, producing a compact 64-dimensional visual feature per camera view. Features from all camera views are concatenated with proprioception and passed to the downstream policy.

RGB-S is policy-agnostic. The paper tests it with:

- Behavior Cloning MLP,
- Action Chunking Transformer (ACT),
- Diffusion Policy.

## Simulation Setup

The simulation experiments evaluate three dexterous manipulation tasks:

- **Pick-and-place:** grasp a cube-like object, lift it, and drop it into a target region.
- **Cube-push:** push a cube into a target slot through planar contact-rich manipulation.
- **Rotate-cross:** rotate a valve-like object through sustained contact.

Policies are trained under normal vision, then evaluated under both normal and occluded views. The occlusion is applied only during evaluation, using black masks over task-relevant image regions.

The simulation uses tactile readings generated from an ETac-based tactile simulator. RGB-S saliency maps are rendered for each camera view.

## Simulation Results

Across policy families and tasks, RGB-S tends to be best or second-best, with a clear advantage under occlusion.

For **Diffusion Policy**, the average success rates are:

| Fusion | Pick-and-Place Avg | Cube-Push Avg | Rotate-Cross Avg |
|---|---:|---:|---:|
| Vision-only | 39.7 | 60.9 | 52.0 |
| Concat | 43.8 | 57.5 | 59.0 |
| FiLM | 42.6 | 66.7 | 53.0 |
| CLiP-style | 43.4 | 64.2 | 56.0 |
| Cross-Attn | 38.4 | 59.2 | 61.0 |
| RGB-S | 59.1 | 68.3 | 69.0 |

The improvement is most visible when RGB is degraded. For Diffusion Policy on pick-and-place, RGB-S reaches **39.7%** success under occlusion, while vision-only is **7.4%**. On rotate-cross, RGB-S reaches **50.0%** under occlusion, ahead of vision-only at **26.0%**.

An important takeaway is that adding tactile input does not automatically help. Several implicit fusion methods improve some settings and hurt others. RGB-S gives touch a spatial meaning before policy learning, making it easier for the model to use tactile evidence.

## Real-World Setup

The real-world platform uses an **xArm6** with a **LEAP Hand**. The hand has:

- 4 fingertip TwinTac sensors, each with 8 taxels;
- 12 FSR sensors distributed across the hand;
- 44 projected tactile nodes in total.

The visual input comes from two calibrated RealSense D435 cameras. The camera extrinsics are calibrated with EasyHEC. Observations contain proprioception, two RGB views, and tactile readings. Actions are 22-dimensional target commands for 6 arm joints and 16 hand joints.

The real tasks are:

- **Pick-and-place:** grasp a cube and place it into a bowl.
- **Open-drawer:** hook fingers onto the edge of a partially opened drawer and pull.
- **Flip-box:** rotate a tissue box twice along its long edge until the bottom face points upward.

Demonstrations are collected through a VR teleoperation interface using Meta Quest 3 for wrist tracking and a Manus Quantum Metaglove for finger motion.

## Real-World Results

The real-world evaluation uses Diffusion Policy. Each method is tested under normal and occluded views.

| Method | Normal Avg | Occluded Avg |
|---|---:|---:|
| Vision-only | 56.7 | 10.0 |
| Concat | 55.0 | 13.3 |
| Cross-Attn | 30.0 | 25.0 |
| RGB-S | 66.7 | 51.7 |

The per-task occluded results show the same pattern:

| Method | Pick & Place | Open Drawer | Flip Box |
|---|---:|---:|---:|
| Vision-only | 0/20 | 4/20 | 2/20 |
| Concat | 1/20 | 6/20 | 1/20 |
| Cross-Attn | 0/20 | 4/20 | 11/20 |
| RGB-S | 7/20 | 10/20 | 14/20 |

RGB-S improves occluded real-world average success by **26.7 percentage points** over Cross-Attn, the strongest implicit baseline in this table. This is the central result: explicit image-space grounding of touch helps most when vision loses the task-relevant region.

## Ablations

The paper ablates three design choices.

First, saliency rendering matters. Under Diffusion Policy on pick-and-place:

| Variant | Normal | Occluded | Average |
|---|---:|---:|---:|
| Vision-only | 71.9 | 7.4 | 39.7 |
| RGB Overlay | 65.3 | 33.1 | 49.2 |
| Binary RGB-S | 65.3 | 27.3 | 46.3 |
| Force-aware RGB-S | 78.5 | 39.7 | 59.1 |

Binary RGB-S already shows that contact location is useful. Force-aware RGB-S performs best, indicating that force magnitude adds helpful interaction information.

Second, spatial alignment matters most under occlusion. With 25 px random tactile-map offset, simulation occluded success drops from **39.7%** to **32.2%**. At 100 px offset, it drops to **9.9%**. Normal vision is more tolerant because RGB still carries usable object information.

Third, early zero-initialized fusion is the strongest architecture:

| Architecture | Normal | Occluded |
|---|---:|---:|
| Late fusion | 73.6 | 35.5 |
| Intermediate fusion | 73.6 | 22.3 |
| Early RGB-S | 78.5 | 39.7 |

Injecting saliency at the first visual layer gives tactile information access to the full visual hierarchy while keeping initialization stable.

## Efficiency

RGB-S is also computationally lightweight. In the real-time diffusion policy pipeline:

| Model | Pre-denoising latency | Overall time |
|---|---:|---:|
| Vision-only | 10.10 ms | 74.36 ms |
| Cross-Attn | 15.13 ms | 79.69 ms |
| Point Cloud | 95.12 ms | 171.84 ms |
| RGB-S | 21.06 ms | 85.30 ms |

The saliency generation itself takes only **6.14 ms** on average. RGB-S is much faster than an explicit 3D point-cloud branch while preserving the speed profile of a standard 2D visual policy.

## Strengths

The biggest strength is simplicity. RGB-S uses known geometry instead of asking a policy to infer tactile-image correspondence from limited data. That makes the fusion more interpretable and more robust under occlusion.

The method also reuses pretrained 2D vision infrastructure. Many robot policies already use image encoders; adding one zero-initialized saliency channel is much easier than building a separate 3D tactile fusion stack.

The results are well scoped. The authors test multiple policy classes in simulation, deploy on real dexterous hardware, and include ablations for rendering, alignment, architecture, and efficiency.

## Limitations

RGB-S depends on calibration and kinematic accuracy. Camera extrinsics, joint backlash, link deformation, sensor placement, and contact-induced compliance can all shift the projected tactile map.

The representation is 2D. Contacts on the far side of an object can project onto similar image regions as front-side contacts, creating depth ambiguity. The paper reports that proprioception and multi-view observations help, though the ambiguity remains.

The method assumes tactile sensor locations are known. Soft skins, uncalibrated tactile arrays, or sensors that deform substantially may require learnable offsets or online calibration.

The experiments focus on manipulation tasks where image-space contact anchors are useful. Tasks requiring fine force control, slip dynamics, or detailed tactile texture may need richer tactile representations.

## Takeaways

RGB-S is a neat tactile-fusion idea because it turns touch into something a vision backbone already knows how to process: a spatial map. The key design is to preserve the pretrained RGB encoder at initialization, then let the tactile saliency channel learn its role during policy training.

For my taxonomy, I would label this paper:

**Image-Aligned Tactile Fusion / Dexterous Imitation Learning / Occlusion-Robust Manipulation**

The reusable ideas are:

1. project taxels into the camera image with FK and calibration;
2. render force-aware Gaussian saliency maps;
3. concatenate RGB and saliency as a 4-channel visual input;
4. zero-initialize the new tactile channel to preserve pretrained visual features;
5. use occlusion as the stress test for visuo-tactile fusion.

The broader lesson is that tactile learning does not always need a separate tactile foundation model. Sometimes a good geometric adapter can make sparse touch compatible with existing visual representations.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**RGB-S** 是一种轻量的视觉-触觉融合方式，用于 dexterous manipulation。核心思路很直接：利用 robot forward kinematics 和 camera calibration，把 tactile sensor locations 投影到 RGB 图像平面，再渲染成 force-modulated Gaussian saliency map。policy 输入 RGB 加上这个 tactile saliency channel。

这样，触觉输入从 robot-centric vector 变成 image-aligned spatial cue。这个表示叫 **RGB-Saliency**，简称 **RGB-S**：

$$
X_t = \mathrm{Concat}(I_t, S_t) \in \mathbb{R}^{H \times W \times 4}
$$

其中 \(I_t\) 是 RGB，\(S_t\) 是 tactile saliency map。saliency channel 通过 zero-initialized fourth input channel 接入 pretrained ResNet-18 visual encoder，因此初始化时保持原始 RGB 行为不变。

RGB-S 在视觉遮挡下效果最明显。真实机器人 occluded dexterous manipulation 中，RGB-S 平均成功率达到 **51.7%**，最强 implicit visuo-tactile baseline 是 **25.0%**，提升 **26.7 个百分点**。

## Paper Info

论文标题是 **"RGB-S: Image-Aligned Tactile Saliency for Robust Dexterous Manipulation"**，作者是 **Shengcheng Luo, Kefei Wu, Xiaoying Zhou, Wanlin Li, Ziyuan Jiao, and Chenxi Xiao**。

论文 arXiv 页面是 [arXiv:2606.08765](https://arxiv.org/abs/2606.08765)，v2 日期是 **2026 年 6 月 11 日**。项目页是 [touch-as-saliency.github.io](https://touch-as-saliency.github.io/)。

## 问题与动机

Dexterous manipulation 经常需要触觉。视觉提供广泛的场景理解能力，也能使用 pretrained visual encoders。触觉提供接触、力和物理交互的直接证据，在物体或手被遮挡时尤其有价值。

难点在于对齐。RGB 图像存在于稠密 2D 坐标系中。tactile readings 通常是稀疏、低维、robot-specific vectors。很多已有 policy 会把 tactile features 和 visual features 拼接起来，使用 FiLM modulation，或通过 attention 混合多模态。这些方法可以工作，但 policy 需要从有限 demonstrations 中学习 taxel 和 image region 之间的空间对应关系。

RGB-S 在学习前加入几何先验。只要已知 robot configuration、tactile sensor offsets、camera intrinsics 和 camera extrinsics，每个 tactile sensor 都可以被投影到 RGB 图像中。一次触觉接触就变成了图像上近似接触位置的 saliency point。

这在遮挡下尤其有用。当物体附近 RGB pixels 被 mask 或不可靠时，projected contact map 仍然能告诉 visual encoder 物理交互发生在哪里。

## Force-Aware Kinematic Projection

方法从 tactile readings 开始：

$$
f_t = \{f_{i,t}\}_{i=1}^{M}
$$

其中 \(f_{i,t}\) 是 tactile sensor node \(i\) 的 scalar force magnitude 或 contact intensity。

对每个 tactile node，用 forward kinematics 计算 3D world position：

$$
P_{i,t} = \mathrm{FK}(s_t, L_i)
$$

这里 \(s_t\) 是 robot proprioception，\(L_i\) 是 tactile sensor 相对其所在 robot link 的固定 local offset。

随后，对 camera view \(c\)，把这个 node 投影到图像平面：

$$
[u^c_{i,t}, v^c_{i,t}, 1]^\top
\sim
K_c(R_cP_{i,t}+t_c)
$$

其中 \(K_c\) 是 camera intrinsic matrix，\(R_c, t_c\) 是 extrinsics。落在 image bounds 外的 nodes 会被丢弃。

稀疏 contact points 会被渲染成 dense saliency map：

$$
S^c_t(u,v)
=
\max_{i \in V^c_t}
\tilde{f}_{i,t}
\exp
\left(
-\frac{(u-u^c_{i,t})^2 + (v-v^c_{i,t})^2}{2\sigma^2}
\right)
$$

force 归一化为：

$$
\tilde{f}_{i,t} =
\tanh(\gamma f_{i,t}/F^i_{limit})
$$

Gaussian kernel 用来处理 calibration、kinematics 和 contact localization 的不确定性。force modulation 比 binary contact map 保留更多信息，而 max aggregation 可以在多个 contact overlap 时保持 saliency map 有界。

## Network Architecture

构造 RGB-S input 后，模型使用一个稍作修改的标准 visual encoder。ResNet-18 的第一层 convolution 从三个输入通道扩展到四个：

$$
z^c_t = W_{rgb} * I^c_t + W_s * S^c_t
$$

RGB weights \(W_{rgb}\) 来自 pretrained ResNet-18。新的 tactile saliency weights \(W_s\) 初始化为 0。

这个 zero initialization 很重要。训练开始时，RGB-S encoder 和原始 RGB encoder 功能一致。fine-tuning 过程中，saliency channel 再学习如何影响 visual representation。这样可以稳定复用 pretrained RGB features，同时加入 touch。

输出 feature map 通过 SpatialSoftmax 压缩，使用 **32 keypoints**，每个 camera view 产生 64 维 visual feature。多个 camera views 的特征与 proprioception 拼接后送入下游 policy。

RGB-S 是 policy-agnostic 的。论文测试了：

- Behavior Cloning MLP；
- Action Chunking Transformer (ACT)；
- Diffusion Policy。

## Simulation Setup

仿真实验包含三个 dexterous manipulation tasks：

- **Pick-and-place:** 抓取 cube-like object，抬起并放入目标区域。
- **Cube-push:** 通过平面 contact-rich manipulation 把 cube 推入目标 slot。
- **Rotate-cross:** 通过持续接触旋转 valve-like object。

policies 在正常视觉下训练，然后在 normal 和 occluded views 下评估。occlusion 只在评估时施加，用 black masks 遮住任务相关图像区域。

仿真触觉来自基于 ETac 的 tactile simulator。RGB-S saliency maps 会为每个 camera view 渲染。

## Simulation Results

跨 policy family 和任务，RGB-S 通常是最好或第二好的方法，在遮挡条件下优势很明显。

对 **Diffusion Policy**，平均成功率如下：

| Fusion | Pick-and-Place Avg | Cube-Push Avg | Rotate-Cross Avg |
|---|---:|---:|---:|
| Vision-only | 39.7 | 60.9 | 52.0 |
| Concat | 43.8 | 57.5 | 59.0 |
| FiLM | 42.6 | 66.7 | 53.0 |
| CLiP-style | 43.4 | 64.2 | 56.0 |
| Cross-Attn | 38.4 | 59.2 | 61.0 |
| RGB-S | 59.1 | 68.3 | 69.0 |

视觉退化时提升更明显。Diffusion Policy 在 pick-and-place occlusion 下，RGB-S 成功率是 **39.7%**，vision-only 是 **7.4%**。在 rotate-cross occlusion 下，RGB-S 是 **50.0%**，vision-only 是 **26.0%**。

一个重要 takeaway 是，加入 tactile input 并不自动带来提升。几个 implicit fusion methods 在某些设置中提升，在另一些设置中下降。RGB-S 在 policy learning 前先给 touch 赋予空间意义，因此模型更容易使用 tactile evidence。

## Real-World Setup

真实平台使用 **xArm6** 和 **LEAP Hand**。手上有：

- 4 个 fingertip TwinTac sensors，每个 8 个 taxels；
- 12 个分布在手上的 FSR sensors；
- 总计 44 个 projected tactile nodes。

视觉输入来自两个标定后的 RealSense D435 cameras。camera extrinsics 用 EasyHEC 标定。observations 包含 proprioception、两个 RGB views 和 tactile readings。actions 是 22 维 target commands，对应 6 个 arm joints 和 16 个 hand joints。

真实任务包括：

- **Pick-and-place:** 抓取 cube 并放进 bowl。
- **Open-drawer:** 用手指 hook 住半开 drawer 的边缘并拉开。
- **Flip-box:** 沿 tissue box 长边翻转两次，直到底面朝上。

demonstrations 通过 VR teleoperation interface 采集，使用 Meta Quest 3 做 wrist tracking 和 visual feedback，使用 Manus Quantum Metaglove 捕捉 finger motion。

## Real-World Results

真实评估使用 Diffusion Policy。每种方法都在 normal 和 occluded views 下测试。

| Method | Normal Avg | Occluded Avg |
|---|---:|---:|
| Vision-only | 56.7 | 10.0 |
| Concat | 55.0 | 13.3 |
| Cross-Attn | 30.0 | 25.0 |
| RGB-S | 66.7 | 51.7 |

逐任务 occluded 结果也是同样趋势：

| Method | Pick & Place | Open Drawer | Flip Box |
|---|---:|---:|---:|
| Vision-only | 0/20 | 4/20 | 2/20 |
| Concat | 1/20 | 6/20 | 1/20 |
| Cross-Attn | 0/20 | 4/20 | 11/20 |
| RGB-S | 7/20 | 10/20 | 14/20 |

RGB-S 相比表中最强 implicit baseline Cross-Attn，在真实 occluded 平均成功率上提升 **26.7 个百分点**。这是这篇论文最核心的结果：当视觉失去任务相关区域时，触觉的显式 image-space grounding 最有价值。

## Ablations

论文 ablate 了三个设计。

第一，saliency rendering 很重要。Diffusion Policy 在 pick-and-place 上：

| Variant | Normal | Occluded | Average |
|---|---:|---:|---:|
| Vision-only | 71.9 | 7.4 | 39.7 |
| RGB Overlay | 65.3 | 33.1 | 49.2 |
| Binary RGB-S | 65.3 | 27.3 | 46.3 |
| Force-aware RGB-S | 78.5 | 39.7 | 59.1 |

Binary RGB-S 已经说明 contact location 有用。Force-aware RGB-S 效果最好，说明 force magnitude 提供了额外 interaction information。

第二，spatial alignment 在遮挡下最关键。加入 25 px 随机 tactile-map offset 后，仿真 occluded success 从 **39.7%** 降到 **32.2%**。100 px offset 时降到 **9.9%**。正常视觉更宽容，因为 RGB 仍然提供可用物体信息。

第三，early zero-initialized fusion 是最强架构：

| Architecture | Normal | Occluded |
|---|---:|---:|
| Late fusion | 73.6 | 35.5 |
| Intermediate fusion | 73.6 | 22.3 |
| Early RGB-S | 78.5 | 39.7 |

在第一层 visual layer 注入 saliency，让 tactile information 能进入完整 visual hierarchy，同时保持初始化稳定。

## Efficiency

RGB-S 的计算也比较轻。real-time diffusion policy pipeline 中：

| Model | Pre-denoising latency | Overall time |
|---|---:|---:|
| Vision-only | 10.10 ms | 74.36 ms |
| Cross-Attn | 15.13 ms | 79.69 ms |
| Point Cloud | 95.12 ms | 171.84 ms |
| RGB-S | 21.06 ms | 85.30 ms |

saliency generation 本身平均只需要 **6.14 ms**。RGB-S 比显式 3D point-cloud branch 快很多，同时保留标准 2D visual policy 的速度特征。

## 优点

RGB-S 最大的优点是简单。它使用已知几何关系，而不是让 policy 从有限数据里自己推断 tactile-image correspondence。这样的 fusion 更可解释，也在遮挡下更稳。

这个方法还能复用 pretrained 2D vision infrastructure。许多 robot policies 已经使用 image encoders；增加一个 zero-initialized saliency channel，比重新搭建 3D tactile fusion stack 更轻。

实验范围也比较完整。作者在仿真中测试多个 policy classes，在真实 dexterous hardware 上部署，并给出 rendering、alignment、architecture 和 efficiency ablations。

## 局限

RGB-S 依赖 calibration 和 kinematic accuracy。camera extrinsics、joint backlash、link deformation、sensor placement 和 contact-induced compliance 都可能让 projected tactile map 偏移。

这个表示是 2D 的。物体背面的 contact 可能和正面的 contact 投影到相似图像区域，产生 depth ambiguity。论文报告 proprioception 和 multi-view observations 能缓解这个问题，但 ambiguity 依然存在。

方法假设 tactile sensor locations 已知。soft skins、未标定 tactile arrays，或会显著形变的 sensors，可能需要 learnable offsets 或 online calibration。

实验主要集中在 image-space contact anchors 有价值的 manipulation tasks。需要精细 force control、slip dynamics 或 tactile texture 的任务，可能还需要更丰富的 tactile representation。

## Takeaways

RGB-S 的触觉融合思路很干净：把 touch 转换成视觉 backbone 熟悉的形式，也就是 spatial map。关键设计是初始化时保留 pretrained RGB encoder，然后让 tactile saliency channel 在 policy training 中逐渐发挥作用。

如果放进我的分类体系，我会把它标成：

**Image-Aligned Tactile Fusion / Dexterous Imitation Learning / Occlusion-Robust Manipulation**

最值得复用的想法包括：

1. 用 FK 和 calibration 把 taxels 投影到 camera image；
2. 渲染 force-aware Gaussian saliency maps；
3. 把 RGB 和 saliency 拼成 4-channel visual input；
4. zero-initialize 新 tactile channel，保留 pretrained visual features；
5. 用 occlusion 作为 visuo-tactile fusion 的压力测试。

更大的启发是：tactile learning 不一定总需要单独的 tactile foundation model。一个好的 geometric adapter，有时就能让稀疏触觉信号接入已有视觉表示。

</div>
