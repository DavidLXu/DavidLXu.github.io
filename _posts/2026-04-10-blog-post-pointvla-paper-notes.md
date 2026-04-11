---
title: "[Paper Notes] PointVLA: Injecting the 3D World into Vision-Language-Action Models"
date: 2026-04-10
permalink: /posts/2026/04/pointvla-paper-notes/
tags:
  - Robotics
  - Vision-Language-Action
  - 3D Point Cloud
  - Imitation Learning
  - Bimanual Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Current VLA models are pre-trained on massive 2D vision-language data, but their reliance on RGB images limits spatial reasoning for real-world manipulation. Retraining from scratch with 3D data is prohibitively expensive. **PointVLA** proposes a lightweight solution: freeze the pre-trained VLA, inject point cloud features into its action expert via a modular block, and use a **skip-block analysis** to find which blocks in the action expert are least critical — injecting 3D features only there to minimize disruption. The result is a model that gains 3D spatial understanding (height adaptability, real-vs-photo discrimination, few-shot multi-tasking) while preserving the full benefit of large-scale 2D pre-training, with only 5 additional lightweight injection blocks to train.

## Paper Info

The paper is **"PointVLA: Injecting the 3D World into Vision-Language-Action Models,"** by **Chengmeng Li, Yichen Zhu, Junjie Wen, Yan Peng, Yaxin Peng, and Feifei Feng** from **Midea Group, Shanghai University, and East China Normal University**. Accepted at **IEEE RA-L 2025**. The project page is at [pointvla.github.io](https://pointvla.github.io/) and the paper at [arXiv:2503.07511](https://arxiv.org/abs/2503.07511).

## 1. Problem and Motivation

VLA models like OpenVLA, $\pi_0$, and DexVLA have shown impressive capabilities by leveraging pre-trained vision-language models as backbones, then training action experts to translate visual-linguistic understanding into robot actions. Their strength comes from billions of parameters pre-trained on internet-scale 2D data.

But they only see in 2D. This creates real failure modes: a VLA cannot distinguish a photograph of an object from the real thing (both look identical in RGB from the right angle), cannot adapt when an object is placed at a different height than in training, and generally lacks the depth perception needed for precise 3D manipulation.

The naive fix — retrain the whole foundation model with 3D data — is impractical. 3D robotic datasets are orders of magnitude smaller than 2D vision-language corpora. Retraining would also discard the valuable 2D representations. An alternative approach like 3DVLA processes 3D tokens through the LLM backbone, but current VLMs exhibit limited 3D comprehension when fine-tuned on small 3D datasets due to the domain gap between 2D pixels and 3D structures.

PointVLA takes a different path: treat 3D point clouds as a **complementary conditioning signal** rather than a primary input modality, injecting them into the action expert rather than the vision-language backbone.

## 2. Method

PointVLA builds on **DexVLA** (Qwen2-VL as the 2B-parameter VLM backbone + ScaleDP as the 1B-parameter diffusion policy action expert). The key insight is to keep the VLM entirely intact and inject 3D information only into the action expert, where spatial reasoning most directly affects motor behavior.

### 2.1 Point Cloud Encoder

Rather than using a pre-trained 3D visual encoder (which the authors found hinders generalization to new environments, consistent with findings in DP3 and iDP3), PointVLA adopts a simplified **hierarchical convolutional architecture**. Upper layers extract low-level features, lower layers learn high-level scene representations, with max pooling between layers to reduce point cloud density. Feature embeddings from each convolutional block are concatenated into a unified multi-level 3D representation.

### 2.2 Point Cloud Injector

The injector has three components:

1. **Channel alignment**: Transform the 128-dimensional point cloud embedding to match the action expert's 1280-dimensional channel size
2. **Action embedding bottleneck**: Compress the potentially large action embedding (from chunk-based prediction) to align with the point cloud embedding
3. **Block-wise injection**: For each selected block in the action expert, an MLP adapter processes the point cloud embedding, followed by a **zero-initialized linear layer** that adds the 3D features to the block's output

The zero initialization is important — it means the injected features start as zero, so the model initially behaves identically to the vanilla VLA. The 3D signal is gradually learned during fine-tuning without disrupting existing representations.

### 2.3 Skip-Block Analysis: Where to Inject

Not all blocks in the action expert are equally important. Injecting 3D features everywhere would be both expensive and disruptive. The authors perform a systematic skip-block analysis on DexVLA's 32-block action expert using a shirt-folding task:

**Single-block skipping**: The first 11 blocks are critical — skipping any one causes significant performance drops. From block 11 onward, skipping a single block is acceptable, indicating these later blocks contribute less after training.

**Multi-block skipping**: Starting from block 11, up to 5 consecutive blocks can be skipped before the model fails. Skipping 6 or more causes instant performance collapse.

Based on this analysis, PointVLA injects 3D features into **5 blocks** (blocks 12, 13, 16, and two others in the less-critical zone). All modules in the vanilla action expert are frozen except the final layers that fit the embodiment's output. Only the 5 injection blocks are trained — making the approach highly parameter-efficient.

## 3. Experiments

### 3.1 Setup

Two real-world bimanual platforms:
- **Bimanual UR5e**: Two UR5e arms with Robotiq grippers, three cameras (two wrist RealSense D435i + one top), 14-dim action space, 15Hz. RealSense L515 for point clouds.
- **Bimanual AgileX**: Two 6-DoF AgileX arms with wrist cameras and base camera, 14-dim action space, 30Hz. Same L515 for point clouds.

Baselines: OpenVLA, Diffusion Policy (DP), 3D Diffusion Policy (DP3), ScaleDP-1B, Octo, and DexVLA. Since PointVLA is built on DexVLA, **DexVLA serves as the direct ablation** — same model without point cloud injection.

### 3.2 Few-Shot Multi-Tasking (AgileX)

Four tasks with only **20 demonstrations each** (80 total): ChargePhone, WipePlate, PlaceBread, TransportFruit. These test both independent and coordinated bimanual movements.

PointVLA outperforms all baselines. Notably, Diffusion Policy fails on most tasks — with only 20 demos per task, the action representation space becomes entangled. Even scaling up (ScaleDP-1B) doesn't help much. DexVLA shows strong few-shot capability but PointVLA consistently improves on it, demonstrating that point cloud integration enables more sample-efficient learning.

### 3.3 Long-Horizon Packing (UR5e)

A challenging conveyor belt task: pick up two laundry detergent bottles from a moving belt and pack them into a box, then seal it (5 sequential subtasks). The assembly line is in motion, the embodiment differs from pre-training data, and the task is long-horizon.

Results (average completion length out of 5 subtasks):
- OpenVLA: 0.36, DP: 0.36, ScaleDP-1B: 0.72
- DexVLA: 1.72
- **PointVLA: 2.36**

PointVLA surpasses DexVLA by **0.64** in average completion length — a substantial margin on a task where all other baselines essentially fail after the first 1–2 steps.

### 3.4 Real-vs-Photo Discrimination

A striking experiment: replace a real laundry detergent bottle on the conveyor belt with its **photograph displayed on a screen**. From the egocentric top camera, the photo closely resembles the real object. All 2D-based models (OpenVLA, DP, ScaleDP, DexVLA) attempt to grasp the non-existent object, with DexVLA entering a repetitive grasping loop. PointVLA is the only model that correctly recognizes **no real object exists** on the belt, achieving **3/3** success while all baselines score **0/3**.

This is perhaps the most compelling demonstration of why 3D understanding matters for safety — a purely 2D model can be trivially "deceived" by a printed image.

### 3.5 Height Adaptability

Training data uses a 3mm foam layer under the bread; at test time, this is replaced with a 52mm layer. All 2D baselines (OpenVLA, DP, ScaleDP, DexVLA) fail — they push down to the trained height and miss the object. PointVLA succeeds **5/5** by perceiving the actual 3D height and adjusting accordingly.

### 3.6 Simulation (RoboTwin)

On the RoboTwin benchmark (14-DoF mobile bimanual platform, 16 diverse tasks), PointVLA achieves the **highest average success rate** across all tasks with both 20 and 50 demonstrations. Interestingly, for pure 3D methods like DP3, adding RGB input can actually hurt performance, while PointVLA's approach of conditionally integrating 3D as a complement to 2D avoids this problem.

## 4. Strengths and Limitations

**Strengths.** The paper's core contribution is conceptually clean: rather than choosing between 2D pre-training and 3D understanding, PointVLA gets both by treating point clouds as a complementary signal injected into carefully selected locations. The skip-block analysis is a principled and reusable technique — it provides a general recipe for identifying where to inject new modalities into pre-trained models. The real-vs-photo and height adaptability experiments are not just ablations; they expose genuine safety-critical failure modes of 2D-only VLAs.

**Limitations.** The paper is built entirely on top of DexVLA, so the generality of the approach to other VLA architectures (e.g., $\pi_0$, OpenVLA's architecture) remains untested. The point cloud encoder is deliberately simple (hierarchical convolution), which the authors acknowledge could be improved. The skip-block analysis is conducted on a single task (shirt folding) — whether the same blocks are "less critical" across different tasks and embodiments is an open question. Finally, the real-world experiments, while compelling, use relatively small evaluation sets (3–5 rollouts for some tasks).

## 5. Takeaways

PointVLA solves a practical problem cleanly. The insight that 3D features should be injected into the **action expert** (not the VLM backbone) is well-motivated: the VLM's job is semantic understanding, which 2D pre-training already handles well; it's the action expert that needs spatial precision. The skip-block analysis provides a principled way to do this injection without disrupting pre-trained representations.

The real-vs-photo experiment is the kind of result that sticks with you. It's a simple setup, but it exposes a fundamental limitation of 2D-only models that no amount of scale will fix — you cannot distinguish real from fake without depth. As robots move into less controlled environments, this kind of 3D grounding will shift from "nice to have" to essential.

For practitioners, the takeaway is that you don't need to retrain your VLA from scratch to add 3D. A lightweight injection module with careful placement can get you most of the benefit at a fraction of the cost.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

当前 VLA 模型基于大规模 2D 视觉-语言数据预训练，但对 RGB 图像的依赖限制了其在真实世界操作中的空间推理能力。从头用 3D 数据重训代价过高。**PointVLA** 提出了一个轻量级方案：冻结预训练 VLA，通过模块化组件将点云特征注入动作专家网络，并利用 **skip-block 分析**找出动作专家中最不关键的 block——仅在这些位置注入 3D 特征以最小化对已有表征的干扰。最终模型获得了 3D 空间理解能力（高度自适应、真实物体 vs 照片辨别、小样本多任务），同时完整保留了大规模 2D 预训练的优势，只需额外训练 5 个轻量注入模块。

## 论文信息

论文标题是 **"PointVLA: Injecting the 3D World into Vision-Language-Action Models"**，作者为 **Chengmeng Li、Yichen Zhu、Junjie Wen、Yan Peng、Yaxin Peng 和 Feifei Feng**，来自 **美的集团、上海大学和华东师范大学**，发表于 **IEEE RA-L 2025**。项目主页为 [pointvla.github.io](https://pointvla.github.io/)，论文在 [arXiv:2503.07511](https://arxiv.org/abs/2503.07511)。

## 1. 问题与动机

OpenVLA、$\pi_0$、DexVLA 等 VLA 模型通过预训练的视觉-语言模型作为 backbone，再训练动作专家将视觉-语言理解转化为机器人动作，展现了令人印象深刻的能力。它们的优势来自于数十亿参数在互联网规模 2D 数据上的预训练。

但它们只有 2D 视觉。这带来了真实的失败模式：VLA 无法区分物体的照片和真实物体（从特定角度看 RGB 图像完全一样），无法适应物体高度与训练时不同的情况，也普遍缺乏精确 3D 操作所需的深度感知。

直接的解决办法——用 3D 数据重新训练整个基础模型——不现实。3D 机器人数据集比 2D 视觉-语言语料库小好几个数量级。重训也会丢弃有价值的 2D 表征。另一种方式如 3DVLA 通过 LLM backbone 处理 3D token，但当前 VLM 在小规模 3D 数据集上微调后 3D 理解能力有限，因为 2D 像素和 3D 结构之间存在很大的域差距。

PointVLA 走了不同的路：把 3D 点云视为**互补的条件信号**而非主要输入模态，注入到动作专家而非视觉-语言 backbone 中。

## 2. 方法

PointVLA 建立在 **DexVLA**（Qwen2-VL 作为 2B 参数的 VLM backbone + ScaleDP 作为 1B 参数的扩散策略动作专家）之上。核心洞察是完全保持 VLM 不变，仅在动作专家中注入 3D 信息——因为空间推理最直接影响运动行为的正是这个部分。

### 2.1 点云编码器

作者发现预训练 3D 视觉编码器会阻碍在新环境中的泛化（与 DP3 和 iDP3 的发现一致），因此采用了简化的**分层卷积架构**。上层提取低级特征，下层学习高级场景表示，层间用最大池化降低点云密度。各卷积块的特征拼接成统一的多层次 3D 表示。

### 2.2 点云注入器

注入器包含三个组件：

1. **通道对齐**：将 128 维点云嵌入变换到与动作专家 1280 维通道匹配
2. **动作嵌入瓶颈**：压缩可能很大的动作嵌入（来自 chunk 预测）以与点云嵌入对齐
3. **逐 block 注入**：对选定的动作专家 block，先用 MLP adapter 处理点云嵌入，再通过一个**零初始化线性层**将 3D 特征加到该 block 输出上

零初始化很重要——意味着注入的特征初始为零，模型一开始的行为与原始 VLA 完全一致。3D 信号在微调过程中逐步被学习，不会扰乱已有表征。

### 2.3 Skip-Block 分析：在哪里注入

并非动作专家的所有 block 都同等重要。到处注入 3D 特征既昂贵又有破坏性。作者在 DexVLA 的 32 个 block 上用叠衣任务做了系统性的 skip-block 分析：

**单 block 跳过**：前 11 个 block 是关键的——跳过任何一个都会导致显著性能下降。从第 11 个 block 开始，跳过单个 block 是可接受的，说明这些后面的 block 在训练后贡献较少。

**多 block 连续跳过**：从第 11 个 block 开始，最多可以连续跳过 5 个 block，模型仍能完成任务。跳过 6 个或更多则性能瞬间崩溃。

基于此分析，PointVLA 在 **5 个 block**（第 12、13、16 等不太关键的区域）注入 3D 特征。原始动作专家的所有模块都被冻结（除了适配 embodiment 输出的最后几层）。只有 5 个注入模块需要训练——方法非常参数高效。

## 3. 实验

### 3.1 实验设置

两个真实世界双臂平台：
- **双臂 UR5e**：两个 UR5e 机械臂 + Robotiq 夹爪，三个相机，14 维动作空间，15Hz。RealSense L515 采集点云。
- **双臂 AgileX**：两个 6-DoF AgileX 机械臂，腕部和底座相机，14 维动作空间，30Hz。同样用 L515 采集点云。

基线方法：OpenVLA、Diffusion Policy (DP)、3D Diffusion Policy (DP3)、ScaleDP-1B、Octo 和 DexVLA。由于 PointVLA 建立在 DexVLA 之上，**DexVLA 直接作为消融对照**。

### 3.2 小样本多任务（AgileX）

四个任务各仅 **20 个演示**（共 80 个）：充电手机、擦盘子、放面包、搬运香蕉。

PointVLA 超越所有基线。Diffusion Policy 在大多数任务上失败——每任务仅 20 个 demo 导致动作表示空间纠缠。DexVLA 展现了强大的小样本能力，但 PointVLA 持续优于它，说明点云集成使得学习更样本高效。

### 3.3 长时程包装任务（UR5e）

具有挑战性的传送带任务：从移动传送带上拾取两瓶洗衣液并装入箱子，然后封箱（5 个连续子任务）。

结果（5 个子任务的平均完成长度）：
- OpenVLA: 0.36，DP: 0.36，ScaleDP-1B: 0.72
- DexVLA: 1.72
- **PointVLA: 2.36**

PointVLA 比 DexVLA 平均多完成 **0.64** 个子任务——在所有其他基线基本只能完成前 1–2 步的任务上，这是相当大的差距。

### 3.4 真实物体 vs 照片辨别

一个很有冲击力的实验：将传送带上的真实洗衣液瓶替换为屏幕上显示的照片。从顶部相机的视角看，照片与真实物体非常相似。所有 2D 模型（OpenVLA、DP、ScaleDP、DexVLA）都试图抓取不存在的物体，DexVLA 甚至陷入重复抓取循环。PointVLA 是唯一能正确识别**传送带上没有真实物体**的模型，达到 **3/3** 成功率，而所有基线都是 **0/3**。

这可能是最有说服力的实验，展示了为什么 3D 理解对安全至关重要——纯 2D 模型可以被一张打印照片轻松"欺骗"。

### 3.5 高度自适应

训练数据中面包下面垫了 3mm 的泡沫层；测试时换成 52mm。所有 2D 基线（OpenVLA、DP、ScaleDP、DexVLA）都失败了——它们按训练高度往下按，错过了物体。PointVLA **5/5** 成功，因为它感知到了实际的 3D 高度并相应调整。

### 3.6 仿真（RoboTwin）

在 RoboTwin 基准测试（14-DoF 移动双臂平台，16 个多样化任务）上，PointVLA 在 20 和 50 个演示两种设置下都取得了**最高的平均成功率**。有趣的是，对于纯 3D 方法如 DP3，添加 RGB 输入反而可能降低性能，而 PointVLA 将 3D 作为 2D 补充的条件性集成方式避免了这个问题。

## 4. 优势与局限

**优势。** 论文的核心贡献概念上很干净：不在 2D 预训练和 3D 理解之间二选一，而是把点云作为互补信号注入到精心选择的位置。Skip-block 分析是一种有原则且可复用的技术——它提供了一个通用方案来识别在预训练模型中注入新模态的合适位置。真实 vs 照片和高度自适应实验不只是消融，它们暴露了纯 2D VLA 真正的安全关键失败模式。

**局限。** 论文完全建立在 DexVLA 之上，对其他 VLA 架构（如 $\pi_0$、OpenVLA 的架构）的通用性未经验证。点云编码器刻意简单（分层卷积），作者承认可以改进。Skip-block 分析只在一个任务（叠衣服）上进行——同样的 block 在不同任务和 embodiment 上是否同样"不太关键"是一个开放问题。最后，真实世界实验虽然有说服力，但部分任务的评估集较小（某些任务仅 3–5 次 rollout）。

## 5. 结论

PointVLA 干净地解决了一个实际问题。3D 特征应该注入**动作专家**（而非 VLM backbone）这一洞察是有充分理由的：VLM 的任务是语义理解，2D 预训练已经处理得很好；需要空间精度的是动作专家。Skip-block 分析提供了一种有原则的方式来完成注入，同时不扰乱预训练表征。

真实 vs 照片实验是那种让人印象深刻的结果。设置很简单，但它暴露了纯 2D 模型的一个根本性局限——没有深度信息，你无法区分真实和虚假，而这不是靠增加数据规模能解决的。随着机器人进入更不受控的环境，这种 3D 接地能力将从"锦上添花"变为必需品。

对实践者来说，收获是：你不需要从头重训 VLA 就能添加 3D。一个轻量的注入模块配合精心的放置，就能以极小的代价获得大部分收益。

</div>
