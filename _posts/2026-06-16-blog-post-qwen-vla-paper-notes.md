---
title: "[Paper Notes] Qwen-VLA: Unifying Vision-Language-Action Modeling"
date: 2026-06-16
permalink: /posts/2026/06/qwen-vla-paper-notes/
tags:
  - VLA
  - Robot Learning
  - Embodied AI
  - Egocentric Data
  - Flow Matching
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Qwen-VLA** arrives after several major VLA paradigms are already visible, so its contribution sits at the level of scale, unification, and training design. It turns VLA into a broader **unified embodied pretraining problem**. The model uses a Qwen3.5-4B vision-language backbone plus a 1.15B DiT flow-matching action expert, then trains over manipulation, navigation, trajectory-centric supervision, human egocentric demonstrations, synthetic trajectories, and auxiliary vision-language data.

My reading is that the strongest parts are the **training recipe** and **data interface**. The paper keeps dataset-native control conventions, uses an embodiment-aware text prompt to describe the platform and control mode, pads heterogeneous actions into one tensor interface, and masks invalid channels. The more interesting training idea is **T2A**, a text-to-action pretraining stage that teaches the DiT decoder an action prior before visual grounding begins.

The human egocentric data is especially worth noting. Qwen-VLA imports Ego4D/EPIC-KITCHENS subsets processed by VITRA, EgoDex, EgoVerse, and Xperience. For each hand, it predicts 6D relative wrist motion plus 10 PCA coefficients over 45D hand-pose axes. These 10 coefficients are the **eigengrasps**: a low-dimensional hand articulation basis that gives the model scalable human manipulation priors without asking the robot policy to directly imitate every human finger joint.

## Paper Info

The paper is **"Qwen-VLA: Unifying Vision-Language-Action Modeling across Tasks, Environments, and Robot Embodiments"** by the **Qwen Team**. It was submitted to arXiv on **May 28, 2026**, with v2 on **June 1, 2026**. The PDF is available at [arXiv:2605.30280](https://arxiv.org/pdf/2605.30280), and the official repository is [QwenLM/Qwen-VLA](https://github.com/QwenLM/Qwen-VLA).

## What Is Different from a Typical VLA?

Many VLA papers focus on one task family, usually robot manipulation. Some convert continuous actions into discrete action tokens and ask an autoregressive VLM to generate them. Others, such as π0-style models, use a VLM backbone with a flow-matching or diffusion action expert for continuous control. Qwen-VLA is closer to the second family architecturally, with a broader scope: it treats manipulation actions, navigation waypoints, human hand trajectories, and trajectory prediction as variants of the same conditional prediction problem:

$$
p_\theta(y_{t:t+H-1} \mid o_t, x, e, z)
$$

Here, \(o_t\) is visual context, \(x\) is the instruction, \(e\) is the embodiment description, and \(z\) is an optional task identifier. The target \(y\) may be an end-effector command, joint-space action, gripper command, dexterous-hand action, navigation waypoint, or human hand motion. The unifying trick is a shared model interface for predicting future action or trajectory chunks, with channel semantics supplied by prompts, masks, and dataset conventions.

That distinction matters. Qwen-VLA's "unified action space" is best understood as a **unified tensor and masking scheme** instead of a clean universal robot ontology. Each dataset keeps its own action convention, while the model is told how to interpret it through text prompts and dataset-specific normalization. This is less elegant on paper, yet much more scalable in practice.

## Model Architecture

Qwen-VLA has two main modules.

First, the **Qwen3.5-4B vision-language backbone** handles perception, instruction following, visual grounding, and reasoning. It receives visual tokens and text tokens in a unified multimodal stream.

Second, a **DiT-style flow-matching action expert** generates continuous action chunks. The action expert concatenates VLM hidden states with a noisy action chunk, processes the sequence with joint self-attention and AdaLN timestep conditioning, and learns a velocity field for denoising actions. At inference, it produces actions by a few Euler integration steps. The action expert is about **1.15B parameters**, with 16 DiT blocks forming almost all of the capacity.

This design is important because the model does not have to squeeze high-frequency continuous control into language tokens. The VLM can remain a semantic and spatial reasoning module, while the DiT action expert specializes in continuous trajectory generation.

## Embodiment-Aware Prompting and Action Interface

Qwen-VLA supports multiple robot platforms through text prompts. A training example is prefixed with a description like:

```text
The robot is {robot_tag} with {single arm / dual arms}[, waist][, and mobile base].
The control frequency is {FPS} Hz.
Please predict the next {chunk_size} control actions to execute the following task: {instruction}.
```

The prompt specifies the platform, arm configuration, control frequency, prediction horizon, and control convention. In the pretraining mixture, the representative embodiments include WidowX, Google Robot, Franka Panda, ARX5, Fourier GR-1, Mobile ALOHA, AgiBot A2-D, Galaxea R1, AIRBOT MMK2, TienKung, and real human demonstrations.

Actions are placed into a fixed tensor:

$$
Y \in \mathbb{R}^{H \times K}
$$

If an embodiment only uses \(c \le K\) channels, those channels occupy the prefix of the vector and the rest are zero-padded. A binary mask \(M \in \{0,1\}^{H \times K}\) tells the loss which channels and timesteps are valid. This means one DiT can serve many embodiments without per-robot output heads.

The paper also uses per-dataset quantile normalization: for each action dimension, values are mapped with the dataset's 1st and 99th percentiles and clipped to \([-1, 1]\). This removes scale mismatch while preserving each dataset's local motion structure.

## Training Recipe: Why T2A Matters

The training recipe has four stages:

1. **T2A: text-to-action DiT pretraining.** Freeze the VLM. Train only the DiT action decoder from text and embodiment prompts, deliberately removing images.
2. **CPT: continued pretraining.** Unfreeze both VLM and DiT. Train on the heterogeneous embodied and vision-language mixture so the action prior becomes visually grounded.
3. **SFT: supervised fine-tuning.** Fine-tune on curated downstream manipulation, navigation, spatial grounding, and VQA data with task-balanced and embodiment-balanced sampling. A separate real-robot branch fine-tunes from Qwen-VLA-Base on in-house teleoperation data.
4. **RL: reinforcement learning.** Starting from the SFT checkpoint, optimize task success with PPO and sparse binary rewards in SimplerEnv, producing Qwen-VLA-Instruct.

The most interesting stage is T2A. The paper frames action learning as a compression-decompression problem. A phrase like "pick up the red cup" plus an embodiment prompt is short; the corresponding control trajectory may contain hundreds or thousands of real-valued motor variables. T2A asks the DiT decoder to learn the decompression map from compact language to full action structure before it ever sees images.

This is more than a warm start. Without T2A, the action decoder must simultaneously learn the action distribution, embodiment conditioning, flow-matching dynamics, and visual grounding while also sending noisy gradients into a pretrained VLM. T2A separates "learn what actions look like" from "ground those actions in the current scene."

The ablation supports this claim. On Simpler-WidowX after SFT, the paper reports:

| T2A setting | SFT success |
|---|---:|
| No T2A | 60.9% |
| Full-sequence T2A with about 20% synthetic + 80% real text-action data | 71.1% |

Several details are also telling:

- **No images during T2A.** Adding images hurts the intended language-action prior and increases cost.
- **Full-sequence prediction beats chunk prediction.** Full trajectories expose global temporal structure, start/termination patterns, and compositionality.
- **Synthetic-only and real-only both underperform the mixture.** Synthetic data broadens language-action coverage; real data anchors the prior in physical dynamics.
- **Timestep distribution matters.** Sigmoid-Normal at T2A and Beta at SFT performs best in their sweep.
- **Longer T2A eventually overfits.** Performance peaks around 2,000 steps and drops at 40,000 steps, suggesting overfitting to the T2A corpus.

## Data Mixture

The pretraining mixture is the real engine of Qwen-VLA. The paper reports this sampling composition:

| Data source | Proportion |
|---|---:|
| Robot manipulation trajectories | 74.2% |
| Human egocentric trajectories | 6.0% |
| Navigation trajectories | 7.5% |
| Synthetic simulation trajectories | 3.7% |
| General vision-language data | 3.4% |
| Spatial grounding 2D | 2.5% |
| Autonomous driving VQA | 2.4% |
| Fine-grained embodied action caption | 0.2% |

The proportions show the design philosophy. Robot manipulation remains the core, but Qwen-VLA wraps it with several complementary sources:

- **Robot data** supplies direct executable action supervision across arms, grippers, hands, mobile manipulators, and bimanual platforms.
- **Human egocentric data** supplies scalable real-world manipulation priors and object/task diversity.
- **Synthetic data** supplies controllable coverage, long-tail scenes, long-horizon tasks, and text-only language-action pairs for T2A.
- **Navigation data** injects long-horizon instruction following, object search, target tracking, and waypoint-style movement.
- **Vision-language data** protects the backbone from forgetting semantic grounding, VQA, spatial reasoning, OCR, and object recognition.

This is why Qwen-VLA feels like a data-system paper as much as a model paper. The architecture is fairly recognizable; the training data is deliberately assembled to make "embodied generalist" plausible.

## Robot Manipulation Data

Robot manipulation trajectories make up **74.2%** of the mixture. Public sources include RobotSet, Galaxea, AgiBot World, RoboCOIN, RoboMIND, RDT-1B, DROID, BridgeData V2, RH20T, RT-1, and BC-Z. The paper describes over **10,000 hours** of public interaction data across tabletop manipulation, mobile manipulation, bimanual manipulation, dexterous hand control, and in-the-wild execution.

The authors also add over **1,000 hours** of in-house real-robot trajectories, around **20%** of the total pretraining mixture, plus simulation-based manipulation data from InternData-A1 and GR00T-X-Embodiment-Sim.

Two details are useful for understanding the data engineering:

First, the action format is preserved. Delta end-effector actions, absolute joint commands, gripper states, and dexterous-hand joints keep their source conventions, then get normalized per dataset and disambiguated by the embodiment prompt.

Second, camera views are explicitly tagged. Images are wrapped with view-specific boundary tokens such as `ego`, `cam_left_wrist`, and `cam_right_wrist`. This is a small but important interface choice: the backbone can learn view-aware features without adding architecture-specific camera channels.

## Human Egocentric Data and Eigengrasps

The egocentric data is only **6.0%** of the pretraining mixture, yet conceptually it is one of the most interesting parts. Robot trajectories are expensive and narrow; human videos are abundant and diverse. Qwen-VLA uses human ego data as a source of manipulation priors, with robot control still learned through robot trajectories and embodiment conditioning.

The sources are:

- **Ego4D** and **EPIC-KITCHENS** subsets processed by **VITRA**, which segments egocentric video into atomic manipulation trajectories and generates fine-grained language annotations with 3D hand and camera motion.
- **EgoDex**, captured with Apple Vision Pro, with **829 hours** of egocentric video and paired 3D hand/finger tracking across **194** tabletop tasks.
- **EgoVerse**, with over **1,300 hours**, **1,965 tasks**, and **240 scenes**.
- **Xperience**, a large egocentric multimodal dataset with synchronized first-person video, depth, hand/body motion capture, and hierarchical language annotations.

For each egocentric sample, the model receives an image and language instruction, then predicts a future bimanual hand action chunk.

The wrist action for each hand is represented as a relative SE(3) transformation from the current wrist frame to a future frame. During training, this becomes:

- 3D relative translation
- 3D axis-angle rotation

So each hand gets **6 wrist dimensions**.

The harder question is finger articulation. A MANO hand pose has 45 axis-angle dimensions: 15 joints times 3 values. Predicting all 45 directly is high-dimensional and redundant. Qwen-VLA applies PCA over the 45D hand pose across all human datasets and keeps the first **10 principal components**. These coefficients are called **eigengrasps**.

For each hand, the action is therefore:

$$
6 \text{ wrist dims} + 10 \text{ eigengrasp dims} = 16
$$

For two hands:

$$
2 \times 16 = 32
$$

So egocentric human data contributes a **32D action per timestep**: relative bimanual wrist motion plus compact hand articulation.

This is a smart compromise. The model gets meaningful dexterous manipulation supervision from human data with a compact representation that avoids carrying every MANO joint angle directly. Eigengrasps encode dominant hand-shape modes: grasp closure, pinch-like patterns, spread, curl, and other correlated finger motions. That makes the human data more learnable and more compatible with a shared action expert.

The limitation is also clear. Eigengrasps compress hand pose, while embodiment transfer still depends on much more than compact hand articulation. Human hands and robot hands differ in contacts, kinematics, actuation, compliance, and force. In Qwen-VLA, ego data is best understood as **pretraining prior**; robot data and embodiment prompts remain responsible for executable robot control.

## Synthetic Data: Two Roles

The synthetic data has two components.

The first is **vision-language-action synthetic data**. The authors use an internal early version of ROBOINF to build tabletop scenes, generate tasks, synthesize success checks, produce motion programs, and roll out successful trajectories under domain randomization. They report:

- 20 tabletop scenes
- 10 initial-pose configurations each
- 200 base scene configurations
- 450 manipulation tasks
- 300 successful trajectories per task
- approximately 359,848 successful full trajectories including subtask segments

The data includes both short-horizon tasks, such as placing two staplers side by side, and long-horizon compositional tasks, such as grouping drinks while leaving a sponge alone. The trajectories are segmented into subtasks, giving supervision at both full-task and atomic-action granularity.

The second is **language-action synthetic data** for T2A. This is text-only: no images, no rendering, no physics simulation. It spans six single-arm template families: pick-and-place, linear pushing, linear pulling, rotation with repositioning, rotation toward a viewpoint direction, and swapping two objects. The tasks are instantiated across six robot configurations: Franka Panda, UR10e, UR5e, Kinova Gen3, TM12, and xArm7.

The paper reports roughly **7.2M trajectories** and over **14,000 hours** of simulated robot trajectory data from this language-action component. This dataset is the primary source for T2A. Its purpose is to teach the decoder the relation between language, embodiment, and motion structure before visual grounding, without spending compute on photorealistic rendering.

## Navigation and Auxiliary VL Data

Navigation data is **7.5%** of the mixture. It contributes mobile-agent trajectories sampled at 2 FPS and represented as relative waypoints \((\Delta x, \Delta y, \Delta \theta)\). The paper divides this into instruction following, object searching, and target tracking. This is important because it forces the model to see action prediction beyond tabletop arms: action can also mean moving through a space under language guidance.

The auxiliary vision-language data is another key design choice. The paper uses:

- **Fine-grained embodied action captions**: about 48,000 video-caption pairs, annotated along action primitive, actor, object, contact region, source/target location, trajectory, orientation, gripper state, and body motion.
- **Autonomous driving VQA**: temporal scene understanding, surround-view spatial reasoning, language-grounded localization, and planning-aware reasoning.
- **2D spatial grounding**: object-level localization needed for manipulation.
- **General VL data**: captioning, VQA, OCR, visual reasoning, referring expressions, and spatial relation prediction.

This mixture supports more than nicer language outputs. It helps preserve the Qwen backbone's object recognition, spatial grounding, and instruction-following ability while heavy action training tries to pull the model toward motor control.

The ablation in the paper is consistent with this: adding VL data does not hurt simple action benchmarks, and it helps harder ones that require object recognition and compositional instruction parsing, such as RoboCasa-GR1 and RoboTwin-2.0.

## Post-Training and RL

After pretraining, Qwen-VLA-Base is broad but not maximally precise. Post-training converts the foundation model into Qwen-VLA-Instruct.

SFT jointly optimizes next-token prediction for VL samples and flow matching for manipulation/navigation actions. The paper sets the loss weight to **0.1** for VL next-token prediction and **1.0** for action prediction, keeping perception alive while focusing gradients on control.

RL then uses PPO with sparse binary success rewards in simulation. A subtle technical issue is that flow-matching policies do not naturally produce autoregressive token log-probabilities. The paper handles this by adding controlled noise to Euler denoising steps, turning transitions into Gaussians whose log-probabilities can be recomputed for PPO. Rewards and advantages are computed at the action-chunk level.

The RL effect is modest but positive. Table 11 shows:

| Stage | Simpler | RoboCasa | RoboTwin-E | RoboTwin-H | LIBERO | Simpler-OOD | DOMINO SR |
|---|---:|---:|---:|---:|---:|---:|---:|
| CPT | 64.3 | 40.4 | 64.3 | 66.4 | 90.8 | 25.3 | 21.1 |
| + SFT | 70.8 | 56.0 | 86.3 | 87.1 | 97.8 | 31.6 | 25.7 |
| + RL | 73.7 | 56.7 | 86.1 | 87.2 | 97.9 | 32.0 | 26.6 |

The biggest jump comes from SFT; RL adds a smaller improvement and does not catastrophically forget held-out benchmarks. That is roughly what one would hope from a narrow simulation RL stage: refine decisiveness and closed-loop recovery without destroying the generalist prior.

## Results Worth Remembering

The headline result is that a single generalist competes with or beats many per-benchmark specialists:

- **LIBERO**: Qwen-VLA-Instruct 97.9%
- **Simpler-WidowX**: 73.7%
- **RoboTwin Easy/Hard**: 86.1% / 87.2%
- **R2R Val-Unseen**: 69.0 OSR, 57.5 SR
- **RxR Val-Unseen**: 59.6 SR
- **Real ALOHA OOD**: 76.9% average success after fine-tuning from Qwen-VLA-Base
- **DOMINO dynamic manipulation**: 26.6% zero-shot SR

For this post, the real-world ALOHA result is the most diagnostic. With the same architecture, fine-tuning from Qwen-VLA-Base reaches **83.6%** in-domain and **76.9%** OOD; training from scratch reaches **48.5%** in-domain and **36.2%** OOD. That comparison points to the pretrained VLA representation built from the training recipe and data mixture, beyond the DiT head or Qwen backbone alone.

## Limitations

The limitations are substantial.

First, many important pieces are hard to reproduce exactly: in-house robot data, ROBOINF synthetic generation, Qwen3.6-plus captioning, and the full heterogeneous training recipe require more than simply downloading public assets.

Second, the "unified action space" is pragmatic and not semantically pure. This helps scaling, while leaving the model dependent on prompts, normalization, masks, and dataset-specific conventions.

Third, human egocentric data helps, while eigengrasps remain an action abstraction with limited coverage of human-robot embodiment transfer. Contact dynamics, tactile feedback, and force remain weakly represented.

Fourth, the evaluation remains benchmark-heavy and mostly short-horizon. The paper points this out directly: long-duration real-world deployment, failure recovery, memory, and world modeling are still open.

## My Takeaway

Qwen-VLA is best read as a **scaling recipe for embodied generalists**. Its novelty comes from the alignment of several practical choices:

- use Qwen3.5 for semantic and spatial reasoning;
- use a continuous DiT flow-matching action expert for motor chunks;
- preserve native action conventions and avoid over-normalizing robots into one brittle action ontology;
- describe embodiments through prompts;
- pretrain action priors with T2A before visual grounding;
- mix robot, human ego, synthetic, navigation, driving, grounding, and VL data;
- keep human hand action compact through eigengrasps;
- use SFT and lightweight RL to turn the broad base model into a more decisive policy.

The most reusable idea for future VLA work may be the separation of **action-prior learning** and **visual grounding**. T2A says: before asking a model to look at a scene and act, first teach its motor decoder what action trajectories look like under language and embodiment constraints. That is a clean and useful abstraction, especially as VLA systems absorb increasingly messy data from robots, humans, simulation, navigation, and video.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**Qwen-VLA** 出现在 VLA 多条主线已经成型之后，它的贡献更集中在规模化、统一建模和训练设计上。它把 VLA 推向 **统一具身预训练**：模型用 Qwen3.5-4B 作为视觉语言 backbone，再接一个 1.15B 的 DiT flow-matching action expert，然后在 manipulation、navigation、trajectory prediction、人类第一视角示教、合成轨迹和辅助视觉语言数据上联合训练。

我认为这篇最值得看的部分是 **training recipe** 和 **data interface**。它保留各数据集原生的控制约定，用 embodiment-aware text prompt 描述机器人平台和控制方式，再把不同动作 pad 到同一个 tensor 接口，并用 mask 屏蔽无效通道。训练上最有意思的是 **T2A**：先让 DiT action decoder 在没有图像的情况下学习 text-to-action 先验，再进入视觉 grounding。

人类第一视角数据也很关键。Qwen-VLA 融入了 VITRA 处理过的 Ego4D/EPIC-KITCHENS 子集，以及 EgoDex、EgoVerse、Xperience。对每只手，它预测 6 维相对手腕运动加 10 个手部 PCA 系数。这 10 个系数就是 **eigengrasps**：一种低维手部动作基，把 45 维 MANO 手部姿态压缩为主要抓握模式，让模型能从人类视频中学习操作先验，而不用直接预测每个手指关节的完整高维动作。

## 论文信息

论文标题是 **"Qwen-VLA: Unifying Vision-Language-Action Modeling across Tasks, Environments, and Robot Embodiments"**，作者为 **Qwen Team**。论文于 **2026 年 5 月 28 日**提交到 arXiv，v2 更新于 **2026 年 6 月 1 日**。PDF 地址是 [arXiv:2605.30280](https://arxiv.org/pdf/2605.30280)，官方仓库是 [QwenLM/Qwen-VLA](https://github.com/QwenLM/Qwen-VLA)。

## 它和一般 VLA 的不同

很多 VLA 论文主要聚焦一个任务族，通常是机器人操作。有些方法把连续动作离散成 action tokens，让 autoregressive VLM 像生成文本一样生成动作；也有 π0 这类方法，用 VLM backbone 加 flow-matching 或 diffusion action expert 来做连续控制。Qwen-VLA 在架构上更接近后者，但目标更宽：它把机械臂动作、导航 waypoint、人手轨迹和 trajectory prediction 都看成同一个条件预测问题：

$$
p_\theta(y_{t:t+H-1} \mid o_t, x, e, z)
$$

其中 \(o_t\) 是视觉上下文，\(x\) 是语言指令，\(e\) 是 embodiment 描述，\(z\) 是可选任务标识。目标 \(y\) 可以是末端执行器命令、关节动作、夹爪状态、灵巧手动作、导航 waypoint 或人手运动。真正统一的是“预测未来 action / trajectory chunk”这个模型接口，通道语义则交给 prompt、mask 和数据集约定来补充。

这个区别很重要。Qwen-VLA 所谓的 unified action space 更接近一个 **统一 tensor + mask 的工程接口**，而非干净的 universal robot ontology。每个数据集仍然保留自己的 action convention，模型通过 prompt 和 normalization 学会如何解释它。这个设计没有那么理想主义，但更容易扩展到真实混杂数据。

## 模型结构

Qwen-VLA 有两个主要模块。

第一是 **Qwen3.5-4B 视觉语言 backbone**，负责感知、指令理解、视觉 grounding 和空间推理。图像 token 和文本 token 进入统一的多模态序列。

第二是 **DiT-style flow-matching action expert**，负责生成连续 action chunk。action expert 将 VLM hidden states 和 noisy action chunk 拼在一起，通过 joint self-attention 与 AdaLN timestep conditioning 处理，并学习从噪声到干净动作的 velocity field。推理时用少量 Euler integration steps 生成动作。这个 action expert 约 **1.15B 参数**，其中 16 个 DiT block 占了绝大部分容量。

这个设计的意义在于：模型不必把高频连续控制硬塞进语言 token。VLM 可以保留语义和空间推理能力，DiT 则专门负责连续轨迹生成。

## Embodiment-Aware Prompt 和动作接口

Qwen-VLA 通过文本 prompt 支持多个机器人平台。每个训练样本前面都会加一段描述：

```text
The robot is {robot_tag} with {single arm / dual arms}[, waist][, and mobile base].
The control frequency is {FPS} Hz.
Please predict the next {chunk_size} control actions to execute the following task: {instruction}.
```

prompt 描述平台、手臂配置、控制频率、预测 horizon 和控制约定。预训练中的代表性 embodiment 包括 WidowX、Google Robot、Franka Panda、ARX5、Fourier GR-1、Mobile ALOHA、AgiBot A2-D、Galaxea R1、AIRBOT MMK2、TienKung 和真实人类示教。

动作会被放进固定张量：

$$
Y \in \mathbb{R}^{H \times K}
$$

如果某个 embodiment 只使用 \(c \le K\) 个通道，就把有效值放在前 \(c\) 个维度，剩余通道 zero padding。二值 mask \(M \in \{0,1\}^{H \times K}\) 告诉 loss 哪些通道和时间步有效。这样一个 DiT 就能服务多个 embodiment，而不需要每个机器人一个专用 output head。

论文还使用 per-dataset quantile normalization：每个动作维度用该数据集的 1% 和 99% 分位数线性映射并 clip 到 \([-1, 1]\)。这样能消除不同数据集和 action space 的尺度差异，同时保留每个数据源内部的相对运动结构。

## Training Recipe：为什么 T2A 重要

训练分四个阶段：

1. **T2A: text-to-action DiT pretraining。** 冻结 VLM，只训练 DiT action decoder；输入只有文本和 embodiment prompt，故意不加入图像。
2. **CPT: continued pretraining。** 解冻 VLM 和 DiT，在异构 embodied + vision-language mixture 上训练，让 action prior 和视觉观察对齐。
3. **SFT: supervised fine-tuning。** 在 manipulation、navigation、spatial grounding、VQA 等下游数据上进行 task-balanced 和 embodiment-balanced 微调。真实机器人分支则从 Qwen-VLA-Base 出发，用内部遥操作数据微调。
4. **RL: reinforcement learning。** 从 SFT checkpoint 出发，在 SimplerEnv 中用 PPO 和 sparse binary success reward 优化闭环任务成功率，得到 Qwen-VLA-Instruct。

最有意思的是 T2A。论文把 action learning 看作 compression-decompression 问题。像 "pick up the red cup" 这样的语言指令加 embodiment prompt 很短，但对应控制轨迹可能包含成百上千个连续运动变量。T2A 要求 DiT decoder 在没有图像的情况下，先学习从紧凑语言描述到完整动作结构的 decompression map。

这已经超出了普通 warm start 的意义。如果没有 T2A，action decoder 要同时学习动作分布、embodiment conditioning、flow-matching dynamics 和视觉 grounding，还会把随机初始化 decoder 的噪声梯度传回已经预训练好的 VLM。T2A 把“动作长什么样”与“如何基于当前图像选择动作”拆开了。

消融结果支持这个判断。在 Simpler-WidowX 上，SFT 后的结果是：

| T2A 设置 | SFT success |
|---|---:|
| 无 T2A | 60.9% |
| full-sequence T2A，约 20% synthetic + 80% real text-action data | 71.1% |

还有几个细节值得记住：

- **T2A 阶段不要图像。** 加图像会破坏原本想学习的 language-action prior，还增加训练成本。
- **full-sequence prediction 优于 chunk prediction。** 完整轨迹能提供全局时间结构、起止模式和组合性。
- **纯 synthetic 和纯 real 都弱于混合方案。** synthetic 扩大语言-动作覆盖面，real 把先验锚定在真实物理动态上。
- **flow-matching timestep distribution 会影响结果。** T2A 用 Sigmoid-Normal、SFT 用 Beta 效果最好。
- **T2A 过长会过拟合。** 约 2,000 steps 最优，40,000 steps 会下降，说明 action prior 也会过拟合。

## 数据构成

Qwen-VLA 的核心发动机其实是 pretraining mixture。论文给出的采样比例是：

| 数据源 | 比例 |
|---|---:|
| 机器人操作轨迹 | 74.2% |
| 人类第一视角轨迹 | 6.0% |
| 导航轨迹 | 7.5% |
| 合成仿真轨迹 | 3.7% |
| 通用视觉语言数据 | 3.4% |
| 2D spatial grounding | 2.5% |
| 自动驾驶 VQA | 2.4% |
| 细粒度 embodied action caption | 0.2% |

这个比例能看出它的设计哲学：机器人操作仍然是主体，但外面包了一圈互补数据：

- **机器人数据** 提供可执行动作监督，覆盖机械臂、夹爪、灵巧手、移动操作和双臂平台。
- **人类第一视角数据** 提供可扩展的真实世界操作先验和更多物体/任务多样性。
- **合成数据** 提供可控覆盖、长尾场景、长时程任务，以及 T2A 所需的 text-only language-action pairs。
- **导航数据** 注入长时程指令跟随、物体搜索、目标跟踪和 waypoint 式移动。
- **视觉语言数据** 防止 backbone 在重度动作训练中遗忘语义 grounding、VQA、空间推理、OCR 和物体识别能力。

所以这篇既是模型论文，也是一篇数据系统论文。架构本身比较容易识别；数据组织方式承担了让 embodied generalist 变得可训练的关键任务。

## 机器人操作数据

机器人操作轨迹占 **74.2%**。公共数据源包括 RobotSet、Galaxea、AgiBot World、RoboCOIN、RoboMIND、RDT-1B、DROID、BridgeData V2、RH20T、RT-1 和 BC-Z。论文称这些公共数据超过 **10,000 小时**，覆盖桌面操作、移动操作、双臂操作、灵巧手控制和开放环境执行。

作者还加入了超过 **1,000 小时** 内部真实机器人轨迹，约占总预训练 mixture 的 **20%**，并加入 InternData-A1 和 GR00T-X-Embodiment-Sim 等仿真操作数据。

有两个数据工程细节很有用。

第一，动作格式被保留下来。delta end-effector、absolute joint、gripper state、dexterous-hand joints 延续各自来源中的控制约定，然后每个数据集单独归一化，再由 embodiment prompt 消歧。

第二，多视角相机会显式打标签。图像会被 `ego`、`cam_left_wrist`、`cam_right_wrist` 这类 view-specific boundary tokens 包住。这样 backbone 可以学习视角感知的表示，而不需要额外设计相机通道结构。

## Human Egocentric Data 和 Eigengrasps

人类第一视角数据只占 **6.0%**，但概念上非常关键。机器人轨迹贵且窄，人类视频多且丰富。Qwen-VLA 把人类 ego data 当作 manipulation prior，而非直接的机器人遥操作数据。

数据来源包括：

- **Ego4D** 和 **EPIC-KITCHENS** 的 VITRA 处理子集：VITRA 会把 egocentric video 切成原子操作轨迹，生成细粒度语言标注，并恢复 3D hand/camera motion。
- **EgoDex**：用 Apple Vision Pro 采集，包含 **829 小时** 第一视角视频，以及 **194** 个桌面任务中的 3D hand/finger tracking。
- **EgoVerse**：超过 **1,300 小时**、**1,965 个任务** 和 **240 个场景**。
- **Xperience**：大规模第一视角多模态数据，包含视频、深度、手/身体动捕和层级语言标注。

对每个 ego 样本，模型输入图像和语言指令，预测未来一段双手动作。

每只手的手腕动作表示为当前 wrist frame 到未来 wrist frame 的相对 SE(3) 变换。训练时写成：

- 3 维相对平移；
- 3 维 axis-angle 旋转。

所以每只手有 **6 维 wrist action**。

更难的是手指动作。MANO 手部姿态有 45 维 axis-angle：15 个关节乘以 3 维。直接预测 45 维既高维又冗余。Qwen-VLA 在所有人类数据集的 45 维 hand pose 上做 PCA，只保留前 **10 个主成分**。这些系数被称为 **eigengrasps**。

于是每只手的动作是：

$$
6 \text{ wrist dims} + 10 \text{ eigengrasp dims} = 16
$$

双手就是：

$$
2 \times 16 = 32
$$

也就是说，egocentric human data 为模型提供了每个时间步 **32 维动作监督**：双手相对手腕运动加紧凑手部 articulation。

这是一个很好的折中。模型能从人类数据中学到有意义的灵巧操作监督，同时避免被完整 MANO 每个关节的高维细节拖垮。Eigengrasps 编码的是主要手型变化模式，比如闭合抓握、pinch、展开、弯曲和手指协同运动。这使得人类数据更容易学习，也更适合接入共享 action expert。

限制也很清楚。Eigengrasps 压缩了人手姿态，human-to-robot embodiment transfer 仍然依赖更多因素。人手和机器人手在接触、运动学、驱动、柔顺性和力反馈上有很大差异。在 Qwen-VLA 里，ego 数据更适合理解为 **预训练先验**，真正可执行的机器人控制仍然依赖机器人轨迹、embodiment prompt 和后续微调。

## 合成数据的两个作用

合成数据分成两个部分。

第一类是 **vision-language-action synthetic data**。作者用内部早期版本 ROBOINF 构建桌面场景、生成任务、合成 success checks、生成 motion programs，并在 domain randomization 下 roll out 成功轨迹。论文报告：

- 20 个桌面场景；
- 每个场景 10 种初始物体配置；
- 200 个基础场景配置；
- 450 个操作任务；
- 每个任务 300 条成功轨迹；
- 约 359,848 条包含 subtask segments 的成功完整轨迹。

这些数据既有短时程任务，比如把两个订书机并排放好，也有长时程组合任务，比如把饮料分组并把海绵单独留下。轨迹还会被分解成子任务，让模型同时看到完整任务粒度和原子动作粒度。

第二类是用于 T2A 的 **language-action synthetic data**。它是 text-only 的：没有图像、没有渲染、没有物理仿真。它覆盖六类单臂模板：pick-and-place、linear pushing、linear pulling、rotation with repositioning、rotation toward viewpoint direction、两个物体位置交换。这些任务在六种机器人配置上实例化：Franka Panda、UR10e、UR5e、Kinova Gen3、TM12 和 xArm7。

论文报告这部分大约有 **7.2M 条轨迹**，超过 **14,000 小时** 的模拟机器人轨迹数据。它是 T2A 的主要语料。它的目标是让 decoder 在没有视觉 grounding 前，先学会语言、embodiment 和运动结构之间的关系，不把算力花在照片级真实渲染上。

## 导航与辅助 VL 数据

导航数据占 **7.5%**，包含 2 FPS 采样的 mobile-agent trajectory，并表示为相对 waypoint \((\Delta x, \Delta y, \Delta \theta)\)。论文把它分成 instruction following、object searching 和 target tracking。这一点很重要，因为它让模型看到桌面机械臂之外的 action prediction：动作也可以是在空间中按语言指令移动。

辅助视觉语言数据也是关键设计。论文使用：

- **细粒度 embodied action captions**：约 48,000 个 video-caption pairs，标注 action primitive、actor、object、contact region、source/target location、trajectory、orientation、gripper state 和 body motion。
- **自动驾驶 VQA**：时间场景理解、环视空间推理、语言 grounding localization 和 planning-aware reasoning。
- **2D spatial grounding**：操作所需的物体级定位能力。
- **通用 VL 数据**：captioning、VQA、OCR、visual reasoning、referring expressions 和 spatial relation prediction。

这些数据的作用远不止让模型更会聊天。它们在重度动作训练时保住 Qwen backbone 的物体识别、空间 grounding 和指令跟随能力。

论文消融也符合这个判断：加入 VL 数据不会伤害简单 action benchmark，并且在需要细粒度物体识别和组合指令解析的 RoboCasa-GR1、RoboTwin-2.0 上有帮助。

## Post-Training 和 RL

预训练后的 Qwen-VLA-Base 覆盖广，但还不够精确。post-training 负责把 foundation model 变成 Qwen-VLA-Instruct。

SFT 同时优化 VL 样本的 next-token prediction 和 manipulation/navigation 动作的 flow matching。论文设置 VL next-token loss 权重为 **0.1**，action prediction 权重为 **1.0**，也就是保留感知语言能力，但主要梯度还是给控制。

RL 阶段在仿真里用 PPO 和 sparse binary success reward。这里有一个技术细节：flow-matching policy 不像 autoregressive token policy 那样天然有 softmax log-probability。论文通过在 Euler denoising step 中注入受控噪声，把 transition 变成可以计算 log-probability 的 Gaussian，用来做 PPO 的 importance ratio。reward 和 advantage 都在 action-chunk 层级计算。

RL 的提升不大但稳定。Table 11 的结果是：

| Stage | Simpler | RoboCasa | RoboTwin-E | RoboTwin-H | LIBERO | Simpler-OOD | DOMINO SR |
|---|---:|---:|---:|---:|---:|---:|---:|
| CPT | 64.3 | 40.4 | 64.3 | 66.4 | 90.8 | 25.3 | 21.1 |
| + SFT | 70.8 | 56.0 | 86.3 | 87.1 | 97.8 | 31.6 | 25.7 |
| + RL | 73.7 | 56.7 | 86.1 | 87.2 | 97.9 | 32.0 | 26.6 |

最大提升来自 SFT；RL 只是在此基础上进一步改善，而且没有明显遗忘 held-out benchmark。这基本符合对 narrow simulation RL 的预期：提升执行果断性和闭环恢复能力，同时尽量不破坏 generalist prior。

## 结果中最值得记住的部分

论文的 headline 是一个 generalist 可以接近甚至超过多个 per-benchmark specialists：

- **LIBERO**：Qwen-VLA-Instruct 97.9%
- **Simpler-WidowX**：73.7%
- **RoboTwin Easy/Hard**：86.1% / 87.2%
- **R2R Val-Unseen**：69.0 OSR，57.5 SR
- **RxR Val-Unseen**：59.6 SR
- **真实 ALOHA OOD**：从 Qwen-VLA-Base 微调后平均成功率 76.9%
- **DOMINO dynamic manipulation**：zero-shot SR 26.6%

对这篇笔记来说，我觉得最有诊断意义的是真实 ALOHA。架构相同的情况下，从 Qwen-VLA-Base 微调能达到 **83.6%** in-domain 和 **76.9%** OOD；从零训练同样架构只有 **48.5%** in-domain 和 **36.2%** OOD。这个对比把收益指向 training recipe 和 data mixture 共同形成的 pretrained VLA representation，超出了 DiT head 或 Qwen backbone 单独能解释的范围。

## 局限

局限也很明显。

第一，很多关键组件很难完整复现：内部机器人数据、ROBOINF 合成管线、Qwen3.6-plus captioning，以及完整异构训练 recipe 都需要超出公开下载资产的工程投入。

第二，所谓 unified action space 属于工程务实的统一，语义上并不纯净。这对 scaling 有帮助，同时也意味着模型仍然依赖 prompt、normalization、mask 和 dataset-specific conventions。

第三，人类第一视角数据有帮助，eigengrasps 仍然只是动作抽象，对 human-robot embodiment transfer 的覆盖有限。接触动力学、触觉、力反馈仍然很弱。

第四，评测仍然以 benchmark 和短时程任务为主。论文也承认，长时间真实部署、失败恢复、记忆和 world modeling 仍然是开放问题。

## 我的理解

Qwen-VLA 最适合被理解为一套 **embodied generalist 的 scaling recipe**。它的创新来自几件务实选择的组合：

- 用 Qwen3.5 承担语义和空间推理；
- 用连续 DiT flow-matching action expert 生成 motor chunks；
- 保留原生 action convention，避免把所有机器人硬塞进脆弱的统一动作本体；
- 用文本 prompt 描述 embodiment；
- 先用 T2A 学 action prior，再做视觉 grounding；
- 混合 robot、human ego、synthetic、navigation、driving、grounding 和 VL 数据；
- 用 eigengrasps 让人手动作保持紧凑；
- 用 SFT 和轻量 RL 把宽泛 base model 变成更果断的 policy。

未来 VLA 工作最值得复用的也许是 **action-prior learning** 和 **visual grounding** 的分离。T2A 的意思是：在要求模型看图行动之前，先让它的 motor decoder 学会在语言和 embodiment 约束下，动作轨迹大概应该长什么样。随着 VLA 系统不断吸收机器人、人类、仿真、导航和视频数据，这个抽象会越来越有用。

</div>
