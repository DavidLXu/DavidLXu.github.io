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

**RGB-S** makes tactile sensing look like something a standard visual encoder can already use: an image-space saliency map. Instead of feeding touch as a robot-centric vector and asking the policy to discover where each taxel belongs in the camera view, the method uses forward kinematics and camera calibration to project tactile sensor locations into the RGB image plane. Contact force is then rendered as a Gaussian saliency channel and concatenated with RGB:

$$
X_t = \mathrm{Concat}(I_t, S_t) \in \mathbb{R}^{H \times W \times 4}
$$

Here \(I_t\) is RGB and \(S_t\) is the tactile saliency map. The fourth channel is added to a pretrained ResNet-18 with zero initialization, so the encoder begins as an ordinary RGB encoder and gradually learns how projected touch should affect the visual representation. The central result appears under occlusion: in real-world dexterous manipulation, RGB-S reaches **51.7%** average success, compared with **25.0%** for the strongest implicit visuo-tactile baseline, a **+26.7 percentage-point** gain.

## Paper Info

The paper is **"RGB-S: Image-Aligned Tactile Saliency for Robust Dexterous Manipulation"** by **Shengcheng Luo, Kefei Wu, Xiaoying Zhou, Wanlin Li, Ziyuan Jiao, and Chenxi Xiao**.

It appears on arXiv as [arXiv:2606.08765](https://arxiv.org/abs/2606.08765), with v2 dated **June 11, 2026**. The project page is [touch-as-saliency.github.io](https://touch-as-saliency.github.io/).

## 核心论点

Dexterous manipulation needs both broad scene context and direct evidence of contact. Vision provides the first, and pretrained image encoders make it cheap to reuse. Touch provides the second, especially when the hand or object hides task-relevant pixels. The hard part is alignment: RGB images live in a dense 2D coordinate system, while tactile readings are sparse, low-dimensional, and tied to a robot hand. If a policy only receives tactile features through concatenation, FiLM, or attention, it must learn the taxel-to-image correspondence from demonstrations.

RGB-S inserts a geometric prior before learning begins. Given robot proprioception, tactile sensor offsets, camera intrinsics, and camera extrinsics, each tactile node can be projected into the image. A contact becomes a visual cue near the image location where interaction is happening. Under occlusion, this matters because the tactile map can still mark where the robot is touching even when the corresponding RGB region is masked or unreliable.

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

The Gaussian absorbs uncertainty from calibration, kinematics, and contact localization. Force modulation preserves more information than a binary contact map, and max aggregation keeps the saliency map bounded when multiple contacts overlap.

## Network Architecture

After building the RGB-S input, the policy can use a standard visual stack. The ResNet-18 first convolution is expanded from three input channels to four:

$$
z^c_t = W_{rgb} * I^c_t + W_s * S^c_t
$$

The RGB weights \(W_{rgb}\) come from pretrained ResNet-18, while the tactile weights \(W_s\) start at zero. This makes initialization conservative: the model initially behaves like the original RGB encoder, then fine-tuning learns how the saliency channel should modulate perception. The feature map is compressed with SpatialSoftmax into **32 keypoints**, giving a 64-dimensional feature per camera view; multi-view features are concatenated with proprioception and passed to downstream policies. The same RGB-S representation is evaluated with Behavior Cloning MLP, ACT, and Diffusion Policy, so the contribution centers on image-aligned tactile representation across policy families.

## Experiments

The simulation suite covers pick-and-place, cube-push, and rotate-cross. Policies are trained with normal vision and evaluated under both normal and occluded views, where black masks cover task-relevant image regions only at test time. Tactile readings come from an ETac-based simulator, and RGB-S maps are rendered for each camera view.

Across policy families and tasks, RGB-S is usually best or second-best. For **Diffusion Policy**, the average success rates are:

| Fusion | Pick-and-Place Avg | Cube-Push Avg | Rotate-Cross Avg |
|---|---:|---:|---:|
| Vision-only | 39.7 | 60.9 | 52.0 |
| Concat | 43.8 | 57.5 | 59.0 |
| FiLM | 42.6 | 66.7 | 53.0 |
| CLiP-style | 43.4 | 64.2 | 56.0 |
| Cross-Attn | 38.4 | 59.2 | 61.0 |
| RGB-S | 59.1 | 68.3 | 69.0 |

The improvement is most visible when RGB is degraded. For Diffusion Policy on pick-and-place, RGB-S reaches **39.7%** success under occlusion while vision-only reaches **7.4%**. On rotate-cross, RGB-S reaches **50.0%** under occlusion, ahead of vision-only at **26.0%**. The pattern is important: extra tactile input alone is not enough, since implicit fusion methods improve some settings and hurt others. RGB-S makes touch spatial before policy learning, so the visual encoder receives contact as a location-aware cue.

The real-world platform uses an **xArm6** with a **LEAP Hand**, four fingertip TwinTac sensors, twelve FSR sensors, and **44 projected tactile nodes**. Visual input comes from two calibrated RealSense D435 cameras, with EasyHEC used for camera extrinsics. Observations include proprioception, two RGB views, and tactile readings; actions are 22-dimensional targets for the arm and hand. Demonstrations are collected through VR teleoperation with Meta Quest 3 and Manus Quantum Metaglove. On pick-and-place, open-drawer, and flip-box, Diffusion Policy gives the following real-world results:

| Method | Normal Avg | Occluded Avg |
|---|---:|---:|
| Vision-only | 56.7 | 10.0 |
| Concat | 55.0 | 13.3 |
| Cross-Attn | 30.0 | 25.0 |
| RGB-S | 66.7 | 51.7 |

The per-task occluded results show the same picture:

| Method | Pick & Place | Open Drawer | Flip Box |
|---|---:|---:|---:|
| Vision-only | 0/20 | 4/20 | 2/20 |
| Concat | 1/20 | 6/20 | 1/20 |
| Cross-Attn | 0/20 | 4/20 | 11/20 |
| RGB-S | 7/20 | 10/20 | 14/20 |

RGB-S improves occluded real-world average success by **26.7 percentage points** over Cross-Attn, the strongest implicit baseline in this table. This is the central result: explicit image-space grounding of touch helps most when vision loses the task-relevant region.

## Ablations

The ablations keep the same message tight. Under Diffusion Policy on pick-and-place, rendering contact as a force-aware saliency map beats binary contact and RGB overlay:

| Variant | Normal | Occluded | Average |
|---|---:|---:|---:|
| Vision-only | 71.9 | 7.4 | 39.7 |
| RGB Overlay | 65.3 | 33.1 | 49.2 |
| Binary RGB-S | 65.3 | 27.3 | 46.3 |
| Force-aware RGB-S | 78.5 | 39.7 | 59.1 |

Binary RGB-S already shows the value of contact location, while force-aware RGB-S adds interaction strength. Spatial alignment matters most under occlusion: with a 25 px random tactile-map offset, simulated occluded success drops from **39.7%** to **32.2%**; at 100 px, it falls to **9.9%**. Normal vision is more tolerant because RGB still carries usable object information. Architecture also matters, with early zero-initialized fusion performing best:

| Architecture | Normal | Occluded |
|---|---:|---:|
| Late fusion | 73.6 | 35.5 |
| Intermediate fusion | 73.6 | 22.3 |
| Early RGB-S | 78.5 | 39.7 |

Injecting saliency at the first visual layer lets tactile information flow through the full visual hierarchy while keeping initialization stable.

## Efficiency

RGB-S is computationally lightweight in the real-time diffusion policy pipeline:

| Model | Pre-denoising latency | Overall time |
|---|---:|---:|
| Vision-only | 10.10 ms | 74.36 ms |
| Cross-Attn | 15.13 ms | 79.69 ms |
| Point Cloud | 95.12 ms | 171.84 ms |
| RGB-S | 21.06 ms | 85.30 ms |

The saliency generation itself takes only **6.14 ms** on average. RGB-S is much faster than an explicit 3D point-cloud branch while preserving the speed profile of a standard 2D visual policy.

## Strengths

The strength of RGB-S is its restraint. It uses known geometry to make tactile-image correspondence explicit, then lets an ordinary visual encoder process the result. This is interpretable, cheap, and compatible with existing robot policy stacks. The experiments are also well scoped: the paper tests multiple policy classes in simulation, deploys on real dexterous hardware, and checks rendering, alignment, architecture, and efficiency.

## Limitations

RGB-S depends on calibration and kinematic accuracy. Camera extrinsics, joint backlash, link deformation, sensor placement, and contact-induced compliance can all shift the projected tactile map.

The representation is 2D. Contacts on the far side of an object can project onto similar image regions as front-side contacts, creating depth ambiguity. The paper reports that proprioception and multi-view observations help, though the ambiguity remains.

The method assumes tactile sensor locations are known. Soft skins, uncalibrated tactile arrays, or sensors that deform substantially may require learnable offsets or online calibration.

The experiments focus on manipulation tasks where image-space contact anchors are useful. Tasks requiring fine force control, slip dynamics, or detailed tactile texture may need richer tactile representations.

## Takeaways

The takeaway is simple: tactile fusion becomes much easier when touch arrives with a spatial prior. RGB-S projects taxels into the camera image, renders force-aware Gaussian saliency, concatenates RGB and saliency as a 4-channel input, and zero-initializes the new channel so pretrained visual features remain intact. Occlusion is the right stress test because it exposes whether the policy can use touch when pixels disappear.

**Image-Aligned Tactile Fusion / Dexterous Imitation Learning / Occlusion-Robust Manipulation**

The broader reusable idea is that tactile learning does not always need a separate tactile foundation model. A good geometric adapter can make sparse touch compatible with existing visual representations, especially when contact is the clue that survives occlusion.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**RGB-S** 把 tactile sensing 转成标准 visual encoder 已经擅长处理的形式：image-space saliency map。它没有把 touch 当作 robot-centric vector 直接塞给 policy，而是利用 forward kinematics 和 camera calibration，把 tactile sensor locations 投影到 RGB 图像平面，再把 contact force 渲染成 Gaussian saliency channel，与 RGB 拼接：

$$
X_t = \mathrm{Concat}(I_t, S_t) \in \mathbb{R}^{H \times W \times 4}
$$

其中 \(I_t\) 是 RGB，\(S_t\) 是 tactile saliency map。第四通道通过 zero initialization 接入 pretrained ResNet-18，因此 encoder 一开始仍像普通 RGB encoder，随后在 fine-tuning 中学习 projected touch 如何影响 visual representation。最关键的结果出现在遮挡场景：真实机器人 dexterous manipulation 中，RGB-S 的 occluded 平均成功率达到 **51.7%**，最强 implicit visuo-tactile baseline 是 **25.0%**，提升 **26.7 个百分点**。

## Paper Info

论文标题是 **"RGB-S: Image-Aligned Tactile Saliency for Robust Dexterous Manipulation"**，作者是 **Shengcheng Luo, Kefei Wu, Xiaoying Zhou, Wanlin Li, Ziyuan Jiao, and Chenxi Xiao**。

论文 arXiv 页面是 [arXiv:2606.08765](https://arxiv.org/abs/2606.08765)，v2 日期是 **2026 年 6 月 11 日**。项目页是 [touch-as-saliency.github.io](https://touch-as-saliency.github.io/)。

## 核心论点

Dexterous manipulation 同时需要大范围场景理解和接触层面的直接证据。视觉负责前者，并且可以复用 pretrained image encoders；触觉负责后者，在手或物体遮住任务相关像素时尤其重要。难点是 alignment：RGB 图像在稠密 2D 坐标系中，tactile readings 却是稀疏、低维、和机械手绑定的信号。如果 policy 只通过 concat、FiLM 或 attention 接收 tactile features，它需要从 demonstrations 中自己学出 taxel 到 image region 的对应关系。

RGB-S 在学习前放入一个几何先验。只要有 robot proprioception、tactile sensor offsets、camera intrinsics 和 camera extrinsics，每个 tactile node 都能投影到图像里。一次接触就变成图像中接近交互位置的 visual cue。遮挡时这个设计特别有用，因为即使相关 RGB 区域被 mask 或不可靠，tactile map 仍能告诉 visual encoder 物理接触发生在哪里。

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

Gaussian kernel 用来吸收 calibration、kinematics 和 contact localization 的不确定性。force modulation 比 binary contact map 保留更多信息，max aggregation 则在多个 contact overlap 时保持 saliency map 有界。

## Network Architecture

构造 RGB-S input 后，policy 可以沿用标准 visual stack。ResNet-18 的第一层 convolution 从三个输入通道扩展到四个：

$$
z^c_t = W_{rgb} * I^c_t + W_s * S^c_t
$$

RGB weights \(W_{rgb}\) 来自 pretrained ResNet-18，新的 tactile weights \(W_s\) 初始化为 0。这样初始化很保守：模型一开始保持原始 RGB encoder 的行为，fine-tuning 时再学习 saliency channel 的作用。输出 feature map 通过 SpatialSoftmax 压缩为 **32 keypoints**，每个 camera view 得到 64 维 feature；多视角 feature 与 proprioception 拼接后送入下游 policy。论文分别在 Behavior Cloning MLP、ACT 和 Diffusion Policy 上测试同一 RGB-S 表示，因此贡献重点是跨 policy family 的 image-aligned tactile representation。

## 实验

仿真部分包含 pick-and-place、cube-push 和 rotate-cross 三个 dexterous manipulation tasks。policies 在正常视觉下训练，然后在 normal 和 occluded views 下评估；occlusion 只在测试时施加，用 black masks 遮住任务相关图像区域。仿真触觉来自基于 ETac 的 tactile simulator，RGB-S saliency maps 会为每个 camera view 渲染。

跨 policy family 和任务，RGB-S 通常是最好或第二好的方法。对 **Diffusion Policy**，平均成功率如下：

| Fusion | Pick-and-Place Avg | Cube-Push Avg | Rotate-Cross Avg |
|---|---:|---:|---:|
| Vision-only | 39.7 | 60.9 | 52.0 |
| Concat | 43.8 | 57.5 | 59.0 |
| FiLM | 42.6 | 66.7 | 53.0 |
| CLiP-style | 43.4 | 64.2 | 56.0 |
| Cross-Attn | 38.4 | 59.2 | 61.0 |
| RGB-S | 59.1 | 68.3 | 69.0 |

视觉退化时提升更明显。Diffusion Policy 在 pick-and-place occlusion 下，RGB-S 成功率是 **39.7%**，vision-only 是 **7.4%**；在 rotate-cross occlusion 下，RGB-S 是 **50.0%**，vision-only 是 **26.0%**。这个结果说明，加入 tactile input 本身并不自动提升性能，因为 implicit fusion methods 在不同设置中表现并不稳定。RGB-S 的优势来自它在 policy learning 前先给 touch 加上空间含义，让 visual encoder 更容易利用 tactile evidence。

真实平台使用 **xArm6** 和 **LEAP Hand**，包含 4 个 fingertip TwinTac sensors、12 个 FSR sensors，总计 **44 个 projected tactile nodes**。视觉输入来自两个标定后的 RealSense D435 cameras，camera extrinsics 由 EasyHEC 标定。observations 包含 proprioception、两个 RGB views 和 tactile readings，actions 是面向 arm 与 hand 的 22 维 targets。demonstrations 通过 Meta Quest 3 与 Manus Quantum Metaglove 的 VR teleoperation 采集。真实任务包括 pick-and-place、open-drawer 和 flip-box，Diffusion Policy 结果如下：

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

消融实验把同一个结论压得更实。Diffusion Policy 在 pick-and-place 上，force-aware saliency 优于 binary contact 和 RGB overlay：

| Variant | Normal | Occluded | Average |
|---|---:|---:|---:|
| Vision-only | 71.9 | 7.4 | 39.7 |
| RGB Overlay | 65.3 | 33.1 | 49.2 |
| Binary RGB-S | 65.3 | 27.3 | 46.3 |
| Force-aware RGB-S | 78.5 | 39.7 | 59.1 |

Binary RGB-S 已经说明 contact location 有价值，force-aware RGB-S 进一步加入 interaction strength。spatial alignment 在遮挡下最关键：加入 25 px 随机 tactile-map offset 后，仿真 occluded success 从 **39.7%** 降到 **32.2%**；100 px offset 时降到 **9.9%**。正常视觉更宽容，因为 RGB 仍提供可用物体信息。架构上，early zero-initialized fusion 表现最好：

| Architecture | Normal | Occluded |
|---|---:|---:|
| Late fusion | 73.6 | 35.5 |
| Intermediate fusion | 73.6 | 22.3 |
| Early RGB-S | 78.5 | 39.7 |

在第一层 visual layer 注入 saliency，让 tactile information 能经过完整 visual hierarchy，同时保持初始化稳定。

## Efficiency

RGB-S 在 real-time diffusion policy pipeline 中也比较轻：

| Model | Pre-denoising latency | Overall time |
|---|---:|---:|
| Vision-only | 10.10 ms | 74.36 ms |
| Cross-Attn | 15.13 ms | 79.69 ms |
| Point Cloud | 95.12 ms | 171.84 ms |
| RGB-S | 21.06 ms | 85.30 ms |

saliency generation 本身平均只需要 **6.14 ms**。RGB-S 比显式 3D point-cloud branch 快很多，同时保留标准 2D visual policy 的速度特征。

## 优点

RGB-S 的优点在于克制。它用已知几何关系显式给出 tactile-image correspondence，再交给普通 visual encoder 处理。这种做法可解释、计算轻，也容易接入现有 robot policy stack。实验覆盖也比较完整：仿真中测试多个 policy classes，真实 dexterous hardware 上部署，并检查 rendering、alignment、architecture 和 efficiency。

## 局限

RGB-S 依赖 calibration 和 kinematic accuracy。camera extrinsics、joint backlash、link deformation、sensor placement 和 contact-induced compliance 都可能让 projected tactile map 偏移。

这个表示是 2D 的。物体背面的 contact 可能和正面的 contact 投影到相似图像区域，产生 depth ambiguity。论文报告 proprioception 和 multi-view observations 能缓解这个问题，但 ambiguity 依然存在。

方法假设 tactile sensor locations 已知。soft skins、未标定 tactile arrays，或会显著形变的 sensors，可能需要 learnable offsets 或 online calibration。

实验主要集中在 image-space contact anchors 有价值的 manipulation tasks。需要精细 force control、slip dynamics 或 tactile texture 的任务，可能还需要更丰富的 tactile representation。

## Takeaways

这篇论文的 takeaway 很清楚：当 touch 带着空间先验进入模型时，tactile fusion 会简单很多。RGB-S 用 FK 和 calibration 把 taxels 投影到 camera image，渲染 force-aware Gaussian saliency，把 RGB 和 saliency 拼成 4-channel input，并通过 zero-initialized channel 保留 pretrained visual features。occlusion 是合适的压力测试，因为它检验 policy 在 pixels 消失时能否真正使用 touch。

**Image-Aligned Tactile Fusion / Dexterous Imitation Learning / Occlusion-Robust Manipulation**

更大的启发是：tactile learning 不一定总需要单独的 tactile foundation model。一个好的 geometric adapter，就可以让稀疏触觉信号接入已有视觉表示；当 contact 是遮挡后仍然存在的线索时，这个 adapter 尤其有价值。

</div>
