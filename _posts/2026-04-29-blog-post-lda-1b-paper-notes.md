---
title: "[Paper Notes] LDA-1B: Scaling Latent Dynamics Action Model via Universal Embodied Data Ingestion"
date: 2026-04-29
permalink: /posts/2026/04/lda-1b-paper-notes/
tags:
  - Robotics
  - World Models
  - Latent Dynamics
  - DINO
  - Embodied AI
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**LDA-1B** is a 1.6B-parameter robot foundation model that learns **policy, forward dynamics, inverse dynamics, and visual forecasting** in a shared **DINO latent space**. Instead of predicting future pixels, it predicts future structured visual features extracted by a frozen DINOv3 encoder, which lets the model focus more on object structure, contact-relevant regions, and action-induced state changes.

The paper's central claim is not that DINO itself is a physics engine. Rather, DINO provides a cleaner and more semantic visual state space, making it easier for a large action-conditioned dynamics model to learn interaction physics from heterogeneous embodied data. LDA-1B scales this recipe to **30k+ hours** of robot and human interaction data and reports strong results across simulation, real-world gripper manipulation, dexterous manipulation, and long-horizon tasks.

## Paper Info

- **Title**: LDA-1B: Scaling Latent Dynamics Action Model via Universal Embodied Data Ingestion
- **Authors**: Jiangran Lyu\*, Kai Liu\*, Xuheng Zhang\*, Haoran Liao, Yusen Feng, Wenxuan Zhu, Tingrui Shen, Jiayi Chen, Jiazhao Zhang, Yifei Dong, Wenbo Cui, Senmao Qi, Shuo Wang, Yixin Zheng, Mi Yan, Xuesong Shi, Haoran Li, Dongbin Zhao, Ming-Yu Liu, Zhizheng Zhang, Li Yi, Yizhou Wang, He Wang
- **Affiliations**: Peking University, Galbot, CASIA, BAAI, Tsinghua University, Sun Yat-sen University, NVIDIA
- **Date**: 2026-02-12
- **arXiv**: [2602.12215](https://arxiv.org/abs/2602.12215)
- **Project page**: [pku-epic.github.io/LDA](https://pku-epic.github.io/LDA/)

## 1. Motivation

Most recent robot foundation models are still heavily behavior-cloning-centric: collect high-quality demonstrations, then train a policy to imitate expert actions. This works, but it creates a bottleneck:

- High-quality robot data is expensive.
- Many large embodied datasets are heterogeneous, noisy, or actionless.
- Pure BC discards low-quality trajectories and actionless videos, even though they may contain useful dynamics knowledge.
- Pixel-space world models waste capacity on appearance details such as lighting, texture, and background clutter.

The paper argues that robot pretraining should use data according to its quality and supervision type:

| Data Type | Main Use |
|---|---|
| High-quality robot/human demonstrations | Policy + dynamics + visual forecasting |
| Lower-quality trajectories | Dynamics + visual forecasting, not direct policy imitation |
| Actionless human videos | Visual forecasting and scene-transition priors |

This is what the authors call **Universal Embodied Data Ingestion**.

## 2. Core Idea

LDA-1B follows a Unified World Model style formulation. Given current observation \\(o_t\\), future observations \\(o_{t+1:t+k}\\), action chunk \\(a_{t+1:t+k}\\), and language instruction \\(\ell\\), it jointly learns:

1. **Policy**: \\(p(a_{t+1:t+k} \mid o_t, \ell)\\)
2. **Forward dynamics**: \\(p(o_{t+1:t+k} \mid o_t, a_{t+1:t+k}, \ell)\\)
3. **Inverse dynamics**: \\(p(a_{t+1:t+k} \mid o_{t:t+k}, \ell)\\)
4. **Visual planning / forecasting**: \\(p(o_{t+1:t+k} \mid o_t, \ell)\\)

The important twist is that future visual states are represented as **DINO latent features**, not pixels or VAE image latents.

```text
RGB observation
  -> frozen DINOv3-ViT-s encoder
  -> structured visual latent tokens
  -> MM-DiT predicts future DINO latents and/or action chunks
```

During pretraining, the DINO encoder and VLM are frozen. The trainable part is the MM-DiT plus action encoder/decoder.

## 3. Why DINO Latent Helps

The paper makes a strong case that **representation quality is a scaling bottleneck** for world models. Pixel-space or VAE-space prediction entangles many things:

- object geometry
- texture
- background
- illumination
- camera viewpoint
- task-relevant contact dynamics

This makes dynamics learning harder because the model must spend capacity predicting visual details that may not matter for control.

DINO features are different. They tend to preserve semantic and spatial structure while suppressing irrelevant low-level appearance variation. For robot manipulation, this means the latent state is closer to the things we care about:

- where the object is
- whether the object has moved
- which surface is contact-relevant
- whether a tool, hand, or gripper is aligned with the object
- whether the future state is coherent under the action

My read: **DINO latent is not physics by itself; it is a better coordinate system for learning physics-like dynamics.** The physics comes from training the temporal/action model on lots of interaction sequences.

## 4. Model Architecture

LDA uses a **Multi-Modal Diffusion Transformer (MM-DiT)**. It jointly denoises action chunks and future DINO latent tokens.

The model receives:

- current observation and language encoded by a VLM
- current / past DINO visual features
- noisy future action chunks
- noisy future DINO latent tokens
- task embeddings indicating policy, forward dynamics, inverse dynamics, or visual forecasting
- diffusion timestep embeddings

Each MM-DiT block uses multi-modal self-attention over action and visual tokens, with modality-specific projections and output heads. Language tokens are injected through cross-attention.

Key model details from the appendix:

| Component | Value |
|---|---|
| VLM | Qwen3-VL-4B-Instruct |
| Observation encoder | DINOv3-ViT-s |
| Hidden size | 1536 |
| Layers | 16 |
| Attention heads | 32 |
| Image shape | 224 x 224 x 3 |
| DINO latent shape | 14 x 14 x 384 |
| Action chunk | 16 |
| Pretraining batch | 32 x 48 |
| Pretraining hardware | 48 NVIDIA H800 GPUs |
| Pretraining iterations | 400k |
| Compute cost | 4,608 GPU hours |

## 5. EI-30k Dataset

The paper builds **EI-30k**, an embodied interaction dataset with more than 30,000 hours of human and robot trajectories.

| Category | Hours |
|---|---:|
| Real-world robot data | 8.03k |
| Simulated robot data | 8.6k |
| Ego human data with actions | 7.2k |
| Actionless ego human videos | 10k |
| **Total** | **30k+** |

The dataset is standardized into the LeRobot format and includes aligned hand-centric action representations:

- robot 6-DoF end-effector pose plus gripper width or dexterous hand joints
- human 6-DoF wrist pose plus MANO hand parameters
- camera extrinsics retained to decouple hand motion from egocentric camera motion
- quality labels so lower-quality trajectories can be used for dynamics without forcing policy imitation

This dataset engineering is one of the paper's quiet but important contributions. The model improvement is not just from architecture; it also comes from making heterogeneous data trainable in one pipeline.

## 6. Main Results

### RoboCasa-GR1 Simulation

On RoboCasa-GR1, the paper evaluates 24 tabletop rearrangement and articulated-object manipulation tasks. The key ablation compares VAE latent state representations with DINO latent representations.

| Method | Visual Rep. | MM-DiT | VLM | Success Rate |
|---|---|---:|---|---:|
| GR00T-N1.6 | - | - | Cosmos | 47.6 |
| StarVLA | - | - | Qwen3-VL | 47.8 |
| GR00T-EI30k | - | - | Qwen3-VL | 51.3 |
| UWM-0.1B | VAE | no | - | 14.2 |
| UWM-1B | VAE | no | Qwen3-VL | 19.3 |
| UWM + MM-DiT | VAE | yes | Qwen3-VL | 20.0 |
| LDA + DiT | DINO | no | Qwen3-VL | 48.9 |
| LDA-0.5B | DINO | yes | Qwen3-VL | 50.7 |
| **LDA-1B** | **DINO** | **yes** | **Qwen3-VL** | **55.4** |

The striking number is the jump from **20.0 to 55.4** when replacing VAE-style pixel latents with DINO representations under the LDA setup. The authors use this to argue that semantically structured latent spaces are critical for scalable dynamics learning.

### Real-World Gripper Manipulation

LDA-1B is evaluated on Galbot G1 with a two-finger gripper. It outperforms GR00T-N1.6 and \\(\pi_{0.5}\\) across pick-and-place, contact-rich, fine manipulation, and long-horizon tasks.

Examples:

- Pick and place: 80-90% success
- Flip box: 60% success vs. 40% / 20% baselines
- Wipe board: 72% success vs. 44% / 52% baselines
- Clean rubbish: 35% success while both baselines fail at 0%

The long-horizon and contact-rich tasks are especially relevant: they require temporal consistency, contact reasoning, and recovery from intermediate errors.

### Dexterous Manipulation

The model is also tested on low-DoF BrainCo hands and high-DoF Sharpa hands. On tasks like Pull Nail and Flip Bread, LDA shows much stronger performance than baselines:

- Pull Nail: 80% for LDA vs. much lower baselines
- Flip Bread: 90% for LDA vs. 10% for \\(\pi_{0.5}\\)

The authors interpret this as evidence that large-scale human interaction data provides useful latent priors for dexterous control.

### Generalization

On pick-and-place with perturbations:

| Method | Novel Objects | Variant Background | OOD Position |
|---|---:|---:|---:|
| \\(\pi_{0.5}\\) | 26.7 | 20.0 | 6.7 |
| GR00T | 40.0 | 40.0 | 20.0 |
| **LDA-1B** | **60.0** | **60.0** | **40.0** |

This supports the paper's claim that DINO-latent dynamics helps the model focus on task-relevant affordances rather than visual distractors.

### Mixed-Quality Fine-Tuning

The most practically interesting result: LDA benefits from adding low-quality trajectories, while \\(\pi_{0.5}\\) degrades.

| Task | Split | \\(\pi_{0.5}\\) | LDA |
|---|---|---:|---:|
| Place pen into box | High only | 60 | 70 |
| Place pen into box | High + Low | 40 | 80 |
| Remove lid | High only | 50 | 50 |
| Remove lid | High + Low | 40 | 60 |

This is exactly the kind of behavior you want from a dynamics-centric pretraining method: imperfect trajectories are not simply noise; they can teach what happens under suboptimal actions.

## 7. Does DINO Latent Learn Physics?

Short answer: **it helps the model learn intuitive interaction physics, but it is not a substitute for explicit physical modeling.**

DINO latent is useful because it gives the downstream dynamics model a structured state representation. It tends to preserve:

- object-level semantics
- spatial coherence
- foreground object structure
- contact-relevant regions
- motion-relevant visual changes

But DINO latent does not explicitly encode:

- mass
- friction
- force
- torque
- material stiffness
- conservation laws
- precise contact constraints

So the real recipe is:

```text
structured visual state space
+ action-conditioned temporal prediction
+ large-scale interaction data
+ forward/inverse dynamics objectives
= better intuitive physics for robot control
```

This distinction matters. If a task requires precise force control, transparent objects, deformable materials, or hidden physical variables, DINO latent alone may be insufficient. The paper itself lists future work around jointly learning visual representations and latent dynamics, richer sensory modalities, and better data-role optimization.

## 8. Strengths

- **Clear scaling direction**: use more heterogeneous data, not just more expert demonstrations.
- **Good representation choice**: DINO latent avoids wasting capacity on pixel-level appearance modeling.
- **Unified objectives**: policy, forward dynamics, inverse dynamics, and visual forecasting reinforce each other.
- **Practical data usage**: lower-quality trajectories and actionless videos become useful instead of discarded.
- **Strong robotics evaluation**: simulation, real-world gripper tasks, dexterous hands, generalization tests, and mixed-quality fine-tuning.

## 9. Limitations

- **Frozen DINO features may bottleneck generalization**: if DINO misses a physical cue, the dynamics model may not recover it.
- **Egocentric camera bias**: the paper notes reliance on predominantly egocentric viewpoints.
- **No guarantee of physical correctness**: predictions are learned from data, not constrained by physical laws.
- **Dataset and reproducibility**: EI-30k and checkpoints are marked as coming soon on the project page at the time of writing.
- **Real-world success rates are still far from solved**: some long-horizon tasks remain difficult.

## 10. Takeaways

1. **DINO latent is a strong state representation for robot world models** because it is semantic, spatial, and less distracted by low-level visual variation.
2. **The dynamics model, not DINO alone, learns interaction physics** through action-conditioned future prediction.
3. **Data quality should be role-aware**: low-quality data may hurt behavior cloning but help dynamics learning.
4. **Actionless human videos are useful** when the objective includes visual forecasting.
5. **For embodied intelligence, representation and data ingestion may matter as much as model size.**

My personal read: this paper is a useful bridge between VLA policy learning and world-model-style robot pretraining. It suggests a practical direction: stop forcing all data into expert imitation, and instead let different data teach different parts of the robot's world model.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**LDA-1B** 是一个 1.6B 参数的机器人基础模型，在统一的 **DINO latent space** 里同时学习 **policy、forward dynamics、inverse dynamics 和 visual forecasting**。它不直接预测未来像素，而是预测 frozen DINOv3 encoder 提取出的未来视觉特征，因此模型可以更专注于物体结构、接触相关区域，以及动作导致的状态变化。

这篇论文的核心并不是说 DINO 本身就是物理引擎。更准确地说，**DINO 提供了一个更干净、更语义化的视觉状态空间，让后面的 action-conditioned dynamics model 更容易从大规模交互数据里学到直觉物理和机器人动力学规律**。

论文将这一方法扩展到 **30k+ 小时**的人类和机器人交互数据，在仿真、真实机器人夹爪操作、灵巧手操作和长时程任务上都展示了不错的结果。

## 论文信息

- **标题**：LDA-1B: Scaling Latent Dynamics Action Model via Universal Embodied Data Ingestion
- **作者**：Jiangran Lyu\*、Kai Liu\*、Xuheng Zhang\*、Haoran Liao、Yusen Feng、Wenxuan Zhu、Tingrui Shen、Jiayi Chen、Jiazhao Zhang、Yifei Dong、Wenbo Cui、Senmao Qi、Shuo Wang、Yixin Zheng、Mi Yan、Xuesong Shi、Haoran Li、Dongbin Zhao、Ming-Yu Liu、Zhizheng Zhang、Li Yi、Yizhou Wang、He Wang
- **机构**：北京大学、Galbot、中科院自动化所、BAAI、清华大学、中山大学、NVIDIA
- **日期**：2026-02-12
- **arXiv**：[2602.12215](https://arxiv.org/abs/2602.12215)
- **项目主页**：[pku-epic.github.io/LDA](https://pku-epic.github.io/LDA/)

## 1. 动机

很多机器人基础模型仍然以 behavior cloning 为中心：收集高质量 demonstration，然后训练 policy 去模仿专家动作。这条路线有效，但瓶颈也很明显：

- 高质量机器人数据很贵。
- 大量 embodied data 是异构的、带噪声的，或者没有 action label。
- 纯 BC 往往会丢掉低质量轨迹和无动作视频，尽管这些数据里可能包含有价值的动力学信息。
- 像素空间 world model 会浪费很多容量去建模光照、纹理、背景等外观细节。

这篇论文提出：不同质量、不同监督形式的数据，应该在训练里承担不同角色：

| 数据类型 | 主要用途 |
|---|---|
| 高质量机器人/人类 demonstration | Policy + dynamics + visual forecasting |
| 低质量轨迹 | Dynamics + visual forecasting，不直接用于 policy imitation |
| 无动作标签的人类视频 | Visual forecasting 和场景转移先验 |

作者把这个思路称为 **Universal Embodied Data Ingestion**。

## 2. 核心方法

LDA-1B 采用 Unified World Model 风格的建模方式。给定当前观测 \\(o_t\\)、未来观测 \\(o_{t+1:t+k}\\)、动作块 \\(a_{t+1:t+k}\\) 和语言指令 \\(\ell\\)，它同时学习：

1. **Policy**：\\(p(a_{t+1:t+k} \mid o_t, \ell)\\)
2. **Forward dynamics**：\\(p(o_{t+1:t+k} \mid o_t, a_{t+1:t+k}, \ell)\\)
3. **Inverse dynamics**：\\(p(a_{t+1:t+k} \mid o_{t:t+k}, \ell)\\)
4. **Visual planning / forecasting**：\\(p(o_{t+1:t+k} \mid o_t, \ell)\\)

关键变化是：未来视觉状态不是用像素或 VAE latent 表示，而是用 **DINO latent feature** 表示。

```text
RGB observation
  -> frozen DINOv3-ViT-s encoder
  -> structured visual latent tokens
  -> MM-DiT 预测未来 DINO latent 和/或动作块
```

预训练阶段，DINO encoder 和 VLM 都是 frozen，真正训练的是 MM-DiT 以及 action encoder/decoder。

## 3. 为什么 DINO Latent 有帮助

论文强调：**representation quality 是 world model scaling 的关键瓶颈之一**。如果在像素空间或 VAE latent 空间做预测，模型往往会把很多因素纠缠在一起：

- 物体几何
- 纹理
- 背景
- 光照
- 相机视角
- 真正和任务相关的接触动力学

这会让 dynamics learning 变难，因为模型必须同时预测许多对控制并不重要的视觉细节。

DINO feature 的好处是，它通常更偏向语义结构和空间结构，同时弱化无关的低层外观变化。对于机器人操作而言，这意味着 latent state 更接近真正重要的东西：

- 物体在哪里
- 物体有没有移动
- 哪个表面和接触相关
- 手、工具、夹爪是否和物体对齐
- 在某个动作下，未来状态是否合理

我的理解是：**DINO latent 本身不是物理；它是一个更适合学习物理规律的坐标系。** 物理感来自后续模型在大量交互序列上进行 action-conditioned temporal prediction。

## 4. 模型结构

LDA 使用 **Multi-Modal Diffusion Transformer (MM-DiT)**，同时对动作块和未来 DINO latent tokens 做去噪预测。

模型输入包括：

- 当前观测和语言，由 VLM 编码
- 当前/历史 DINO 视觉特征
- 加噪后的未来动作块
- 加噪后的未来 DINO latent tokens
- task embedding，用来指示 policy、forward dynamics、inverse dynamics 或 visual forecasting
- diffusion timestep embedding

每个 MM-DiT block 对 action tokens 和 visual tokens 做 multi-modal self-attention，并保留 modality-specific projections 和 output heads。语言 token 通过 cross-attention 注入。

附录中的关键配置如下：

| 组件 | 配置 |
|---|---|
| VLM | Qwen3-VL-4B-Instruct |
| Observation encoder | DINOv3-ViT-s |
| Hidden size | 1536 |
| Layers | 16 |
| Attention heads | 32 |
| Image shape | 224 x 224 x 3 |
| DINO latent shape | 14 x 14 x 384 |
| Action chunk | 16 |
| Pretraining batch | 32 x 48 |
| Pretraining hardware | 48 NVIDIA H800 GPUs |
| Pretraining iterations | 400k |
| Compute cost | 4,608 GPU hours |

## 5. EI-30k 数据集

论文构建了 **EI-30k**，包含超过 30,000 小时的人类和机器人交互轨迹。

| 类别 | 时长 |
|---|---:|
| 真实机器人数据 | 8.03k 小时 |
| 仿真机器人数据 | 8.6k 小时 |
| 带动作的人类第一视角数据 | 7.2k 小时 |
| 无动作标签的人类第一视角视频 | 10k 小时 |
| **总计** | **30k+ 小时** |

数据被统一到 LeRobot 格式，并且对 hand-centric action representation 做了对齐：

- 机器人：6-DoF end-effector pose 加 gripper width 或 dexterous hand joints
- 人类：6-DoF wrist pose 加 MANO hand parameters
- 保留 camera extrinsics，用来把手部运动和 egocentric camera motion 解耦
- 标注 quality label，让低质量轨迹可以用于 dynamics，而不是强行用于 policy imitation

这其实是论文里很重要但容易被忽略的贡献：性能提升不只是来自模型结构，也来自把异构数据工程化成同一个可训练管线。

## 6. 主要结果

### RoboCasa-GR1 仿真

论文在 RoboCasa-GR1 上评估了 24 个桌面整理和 articulated-object manipulation 任务。关键 ablation 是比较 VAE latent 和 DINO latent。

| 方法 | Visual Rep. | MM-DiT | VLM | Success Rate |
|---|---|---:|---|---:|
| GR00T-N1.6 | - | - | Cosmos | 47.6 |
| StarVLA | - | - | Qwen3-VL | 47.8 |
| GR00T-EI30k | - | - | Qwen3-VL | 51.3 |
| UWM-0.1B | VAE | no | - | 14.2 |
| UWM-1B | VAE | no | Qwen3-VL | 19.3 |
| UWM + MM-DiT | VAE | yes | Qwen3-VL | 20.0 |
| LDA + DiT | DINO | no | Qwen3-VL | 48.9 |
| LDA-0.5B | DINO | yes | Qwen3-VL | 50.7 |
| **LDA-1B** | **DINO** | **yes** | **Qwen3-VL** | **55.4** |

最醒目的数字是：在 LDA 设置下，从 VAE 风格的 pixel latent 换成 DINO representation 后，成功率从 **20.0 提升到 55.4**。作者据此强调，语义结构化 latent space 对可扩展 dynamics learning 很关键。

### 真实夹爪操作

LDA-1B 在 Galbot G1 双指夹爪上评估，并在 pick-and-place、contact-rich、fine manipulation 和 long-horizon manipulation 上超过 GR00T-N1.6 和 \\(\pi_{0.5}\\)。

一些结果：

- Pick and place：80-90% success
- Flip box：60%，baseline 为 40% / 20%
- Wipe board：72%，baseline 为 44% / 52%
- Clean rubbish：35%，两个 baseline 都是 0%

长时程和接触丰富任务尤其重要，因为它们需要时间一致性、接触推理，以及从中间错误中恢复的能力。

### 灵巧手操作

论文还测试了低 DoF 的 BrainCo hand 和高 DoF 的 Sharpa hand。在 Pull Nail 和 Flip Bread 这类任务上，LDA 明显强于 baseline：

- Pull Nail：LDA 80%
- Flip Bread：LDA 90%，而 \\(\pi_{0.5}\\) 只有 10%

作者认为，这说明大规模人类交互数据可以为 dexterous control 提供有用的 latent prior。

### 泛化能力

在 pick-and-place 的扰动测试中：

| 方法 | 新物体 | 新背景 | OOD 位置 |
|---|---:|---:|---:|
| \\(\pi_{0.5}\\) | 26.7 | 20.0 | 6.7 |
| GR00T | 40.0 | 40.0 | 20.0 |
| **LDA-1B** | **60.0** | **60.0** | **40.0** |

这支持了作者的观点：DINO-latent dynamics 能让模型更关注任务相关 affordance，而不是被视觉干扰项带偏。

### 混合质量微调

最有实践价值的结果之一：LDA 加入低质量轨迹后性能提升，而 \\(\pi_{0.5}\\) 反而下降。

| 任务 | 数据划分 | \\(\pi_{0.5}\\) | LDA |
|---|---|---:|---:|
| Place pen into box | High only | 60 | 70 |
| Place pen into box | High + Low | 40 | 80 |
| Remove lid | High only | 50 | 50 |
| Remove lid | High + Low | 40 | 60 |

这正是 dynamics-centric pretraining 希望看到的现象：不完美轨迹并不只是噪声，它们也能教会模型“次优动作会导致什么后果”。

## 7. DINO Latent 能学到物理吗？

简短回答：**它有助于模型学习直觉交互物理，但不能替代显式物理建模。**

DINO latent 的价值在于给 dynamics model 提供一个结构化状态表示。它倾向于保留：

- 物体级语义
- 空间一致性
- 前景物体结构
- 接触相关区域
- 和运动有关的视觉变化

但 DINO latent 不会显式编码：

- 质量
- 摩擦
- 力
- 力矩
- 材料刚度
- 守恒定律
- 精确接触约束

所以真正的配方是：

```text
结构化视觉状态空间
+ action-conditioned temporal prediction
+ 大规模交互数据
+ forward / inverse dynamics objectives
= 更好的机器人直觉物理
```

这个区分很重要。如果任务需要非常精细的力控、透明物体、可变形材料，或者隐藏物理变量，单靠 DINO latent 可能是不够的。论文自己也把 future work 指向了 joint learning of visual representations and latent dynamics、更丰富的传感器模态，以及更自动的数据角色分配。

## 8. 优点

- **清晰的 scaling 路线**：不是只增加 expert demonstration，而是利用更多异构数据。
- **表示选择合理**：DINO latent 避免把模型容量浪费在低层像素外观上。
- **统一目标**：policy、forward dynamics、inverse dynamics 和 visual forecasting 互相增强。
- **数据利用更实际**：低质量轨迹和无动作视频不再被直接丢弃。
- **机器人评估较全面**：包含仿真、真实夹爪、灵巧手、泛化测试和混合质量微调。

## 9. 局限

- **Frozen DINO feature 可能成为瓶颈**：如果 DINO 漏掉某个物理线索，后续 dynamics model 未必能补回来。
- **第一视角偏置**：论文也提到主要依赖 egocentric camera viewpoint。
- **不能保证物理正确性**：预测来自数据学习，而不是物理方程约束。
- **数据和 checkpoint 复现性**：项目页目前显示 EI-30k 和 checkpoints 仍是 coming soon。
- **真实世界成功率仍未完全解决**：部分长时程任务依然很难。

## 10. 启发

1. **DINO latent 是机器人 world model 很好的状态表示**，因为它更语义化、更空间结构化，也更少被低层视觉变化干扰。
2. **真正学习交互物理的是 dynamics model，不是 DINO 本身**。
3. **数据质量应该 role-aware**：低质量数据可能伤害 BC，但能帮助 dynamics learning。
4. **无动作人类视频也是有用的**，前提是训练目标里包含 visual forecasting。
5. **对于具身智能，representation 和 data ingestion 可能和模型大小一样重要。**

我的个人理解：这篇论文把 VLA policy learning 和 world-model-style robot pretraining 之间的桥搭得比较清楚。它给出的路线是：不要把所有数据都硬塞进 expert imitation，而是让不同类型的数据分别教会模型不同部分的世界知识。

</div>
