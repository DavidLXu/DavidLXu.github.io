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

## TL;DR

**Qwen-VLA** is best read as a scaling recipe for embodied generalist models. Its contribution is less about inventing a new robot controller in isolation and more about aligning three pieces that usually fight each other: a strong vision-language backbone, a continuous action expert, and a mixed embodied data interface that can absorb robots, navigation, synthetic trajectories, and human egocentric motion.

The core technical story has five parts. First, Qwen-VLA keeps Qwen3.5-4B as the semantic and spatial reasoning backbone. Second, it attaches a 1.15B DiT-style flow-matching **action expert** for continuous action chunks. Third, it uses **embodiment-aware prompting** plus a shared padded tensor interface so different robots can keep their native control conventions. Fourth, it introduces **T2A**, a text-to-action pretraining stage that teaches the action decoder a language-conditioned motor prior before visual grounding. Fifth, it builds a broad training mixture where robot data remains central, while human ego data, synthetic data, navigation, and auxiliary vision-language tasks provide coverage and regularization.

The takeaway is simple: Qwen-VLA treats VLA as a data and representation unification problem. The model does not claim that every embodiment shares a pure semantic action ontology. It instead creates a practical interface where prompts describe the body, masks select valid action channels, and the action expert learns to decode future motion under those constraints.

## Problem Framing

The paper, **"Qwen-VLA: Unifying Vision-Language-Action Modeling across Tasks, Environments, and Robot Embodiments"**, is by the **Qwen Team**. It was submitted to arXiv on **May 28, 2026**, with v2 on **June 1, 2026**. The PDF is available at [arXiv:2605.30280](https://arxiv.org/pdf/2605.30280), and the official repository is [QwenLM/Qwen-VLA](https://github.com/QwenLM/Qwen-VLA).

Qwen-VLA frames manipulation, navigation, human hand motion, and trajectory prediction as one conditional prediction problem:

$$
p_\theta(y_{t:t+H-1} \mid o_t, x, e, z)
$$

Here, \(o_t\) is visual context, \(x\) is the instruction, \(e\) is the embodiment description, and \(z\) is an optional task identifier. The target \(y\) may be an end-effector command, joint action, gripper state, dexterous-hand action, navigation waypoint, or human hand motion. The unifying move is the model interface: predict a future action or trajectory chunk while using prompts, masks, and dataset-specific normalization to keep the channel semantics interpretable.

Qwen-VLA supports multiple robot platforms through text prompts. A training example is prefixed with a description like:

```text
The robot is {robot_tag} with {single arm / dual arms}[, waist][, and mobile base].
The control frequency is {FPS} Hz.
Please predict the next {chunk_size} control actions to execute the following task: {instruction}.
```

This prompt carries the platform, arm configuration, control frequency, horizon, and control convention. Actions then enter a fixed tensor:

$$
Y \in \mathbb{R}^{H \times K}
$$

If an embodiment uses only \(c \le K\) channels, its valid values occupy the prefix of the vector and the rest are zero-padded. A binary mask \(M \in \{0,1\}^{H \times K}\) tells the loss which channels and timesteps are valid. The paper does not need a single declared semantic meaning for every coordinate of \(K\); the combination of embodiment prompt, dataset convention, per-dataset quantile normalization, and mask makes one action expert usable across many control spaces.

## Action Expert and T2A

The architecture has a clean division of labor. The **Qwen3.5-4B vision-language backbone** handles perception, instruction following, visual grounding, and spatial reasoning. The **DiT-style flow-matching action expert** generates continuous action chunks. It concatenates VLM hidden states with a noisy action chunk, applies joint self-attention with AdaLN timestep conditioning, and learns a velocity field for denoising actions. At inference time, actions are produced with a small number of Euler integration steps. This keeps continuous motor prediction out of the language-token channel and gives the policy head capacity for high-frequency control.

The training recipe then builds the model in four stages: T2A, CPT, SFT, and RL. **T2A** is the key idea. During Stage I, the VLM is frozen, images are removed, and only the DiT action decoder learns from text plus embodiment prompts. The paper treats this as a compression-decompression problem: a compact instruction such as "pick up the red cup" must expand into a long, structured real-valued trajectory. T2A teaches the decoder the shape of plausible actions before the model has to solve visual grounding at the same time.

The ablation makes the point concrete. On Simpler-WidowX after SFT:

| T2A setting | SFT success |
|---|---:|
| No T2A | 60.9% |
| Full-sequence T2A with about 20% synthetic + 80% real text-action data | 71.1% |

Several details sharpen the story. Removing images during T2A helps the decoder focus on language-action structure and reduces cost. Full-sequence prediction performs better than chunk-only prediction because it exposes global temporal structure and termination patterns. Synthetic-only and real-only T2A both trail the mixed setting: synthetic trajectories broaden instruction coverage, while real trajectories anchor the prior in physical motion. The paper also reports that T2A can overfit when run too long, which is a useful reminder that pretraining a motor prior is still pretraining on a finite corpus.

After T2A, **CPT** unfreezes the VLM and action expert and trains on the heterogeneous embodied plus vision-language mixture. **SFT** uses curated downstream manipulation, navigation, grounding, and VQA data with task-balanced and embodiment-balanced sampling. **RL** starts from SFT and uses PPO with sparse binary success rewards in SimplerEnv; because flow-matching policies do not naturally expose token-style log probabilities, the paper injects controlled noise into Euler denoising transitions so PPO can recompute Gaussian log probabilities at the action-chunk level.

## Data Recipe and Human Ego Actions

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

Robot manipulation dominates the mixture, with public sources such as RobotSet, Galaxea, AgiBot World, RoboCOIN, RoboMIND, RDT-1B, DROID, BridgeData V2, RH20T, RT-1, and BC-Z, plus more than **1,000 hours** of in-house real-robot trajectories and simulation-based manipulation data. The important design choice is that Qwen-VLA preserves source action formats: delta end-effector commands, absolute joint commands, gripper states, and dexterous-hand joints remain dataset-native, then get normalized and disambiguated through prompts. Camera views are also explicitly tagged with boundary tokens such as `ego`, `cam_left_wrist`, and `cam_right_wrist`.

Human egocentric data is only **6.0%** of the mixture, but it is conceptually important because it supplies scalable manipulation priors from human activity. Qwen-VLA uses Ego4D and EPIC-KITCHENS subsets processed by VITRA, plus EgoDex, EgoVerse, and Xperience. For each egocentric sample, the model predicts a future bimanual hand action chunk. Each wrist is represented as 3D relative translation plus 3D axis-angle rotation, giving **6 wrist dimensions** per hand.

Finger articulation is compressed. A MANO hand pose has 45 axis-angle dimensions, so Qwen-VLA applies PCA over the 45D hand pose across the human datasets and keeps the first **10 principal components**. These coefficients are the **eigengrasps**.

For each hand, the action is therefore:

$$
6 \text{ wrist dims} + 10 \text{ eigengrasp dims} = 16
$$

For two hands:

$$
2 \times 16 = 32
$$

So human ego contributes a **32D action per timestep**: relative bimanual wrist motion plus compact hand articulation. This representation gives the model reusable hand-shape priors without forcing it to predict all MANO joint angles directly. It also has a clear boundary: eigengrasps compress human hand pose, while executable robot behavior still depends on robot trajectories, embodiment prompts, contact dynamics, and downstream fine-tuning.

Synthetic data plays two roles. The vision-language-action branch uses an internal ROBOINF-style pipeline to build tabletop scenes, generate tasks and success checks, produce motion programs, and roll out successful trajectories; the paper reports about **359,848** successful full trajectories including subtask segments. The text-only language-action branch is the main T2A source, covering six single-arm template families across six robot configurations and reporting roughly **7.2M trajectories** and more than **14,000 hours** of simulated robot trajectory data. Navigation adds waypoint-style actions \((\Delta x, \Delta y, \Delta \theta)\), while auxiliary VL data protects object recognition, spatial grounding, OCR, VQA, and instruction following during heavy action training.

## Results and Limits

The post-training trend is clear in Table 11:

| Stage | Simpler | RoboCasa | RoboTwin-E | RoboTwin-H | LIBERO | Simpler-OOD | DOMINO SR |
|---|---:|---:|---:|---:|---:|---:|---:|
| CPT | 64.3 | 40.4 | 64.3 | 66.4 | 90.8 | 25.3 | 21.1 |
| + SFT | 70.8 | 56.0 | 86.3 | 87.1 | 97.8 | 31.6 | 25.7 |
| + RL | 73.7 | 56.7 | 86.1 | 87.2 | 97.9 | 32.0 | 26.6 |

The largest jump comes from SFT; RL adds smaller gains without obvious broad forgetting. The headline benchmark picture is also strong: **97.9%** on LIBERO, **73.7%** on Simpler-WidowX, **86.1% / 87.2%** on RoboTwin Easy/Hard, **57.5 SR** on R2R Val-Unseen, **59.6 SR** on RxR Val-Unseen, and **26.6%** zero-shot SR on DOMINO dynamic manipulation. The real-world ALOHA comparison is especially diagnostic: with the same architecture, fine-tuning from Qwen-VLA-Base reaches **83.6%** in-domain and **76.9%** OOD, while training from scratch reaches **48.5%** and **36.2%**. That gap points to the value of the pretraining recipe and data mixture.

The limitations are also part of the story. Several ingredients are hard to reproduce exactly, including in-house robot data, the ROBOINF synthetic pipeline, Qwen3.6-plus captioning, and the full heterogeneous training schedule. The unified action space is pragmatic and depends on prompts, normalization, masks, and dataset conventions. Human ego data adds useful priors, but eigengrasps do not solve contact, tactile feedback, force, or full human-robot embodiment transfer. The evaluations remain benchmark-heavy, and long-duration real-world deployment, recovery, memory, and world modeling are still open.

My final takeaway: Qwen-VLA's most reusable idea is the separation between **action-prior learning** and **visual grounding**. T2A teaches the motor decoder what action trajectories look like under language and embodiment constraints; CPT and SFT then connect that prior to images, tasks, and downstream control. As VLA systems absorb messier mixtures of robot logs, human video, simulation, navigation, and VL data, this kind of staged interface may matter as much as the backbone choice.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**Qwen-VLA** 更适合被理解为一套 embodied generalist 的 scaling recipe。它的贡献不在单独发明一种全新的机器人控制器，而在于把三件经常互相拉扯的东西对齐：强视觉语言 backbone、连续动作专家，以及能够吸收机器人、导航、合成轨迹和人类第一视角动作的混合数据接口。

它的核心技术故事可以概括为五点。第一，用 Qwen3.5-4B 继续承担语义和空间推理。第二，接入一个 1.15B 的 DiT-style flow-matching **action expert** 来生成连续 action chunk。第三，用 **embodiment-aware prompting** 加共享 padding tensor，让不同机器人保留各自的原生控制约定。第四，引入 **T2A**，也就是 text-to-action 预训练，让 action decoder 在视觉 grounding 之前先学习 language-conditioned motor prior。第五，构建大规模训练 mixture：机器人数据仍是主体，人类 ego、合成数据、导航和辅助视觉语言任务提供覆盖面和正则化。

关键 takeaway 很直接：Qwen-VLA 把 VLA 当成数据与表示统一问题。它并不要求所有 embodiment 共享一个纯净的语义动作本体；它构造的是一个务实接口：prompt 描述身体，mask 选择有效动作通道，action expert 在这些约束下解码未来运动。

## 问题设定

论文标题是 **"Qwen-VLA: Unifying Vision-Language-Action Modeling across Tasks, Environments, and Robot Embodiments"**，作者为 **Qwen Team**。论文于 **2026 年 5 月 28 日**提交到 arXiv，v2 更新于 **2026 年 6 月 1 日**。PDF 地址是 [arXiv:2605.30280](https://arxiv.org/pdf/2605.30280)，官方仓库是 [QwenLM/Qwen-VLA](https://github.com/QwenLM/Qwen-VLA)。

Qwen-VLA 把 manipulation、navigation、人手运动和 trajectory prediction 统一为一个条件预测问题：

$$
p_\theta(y_{t:t+H-1} \mid o_t, x, e, z)
$$

其中 \(o_t\) 是视觉上下文，\(x\) 是语言指令，\(e\) 是 embodiment 描述，\(z\) 是可选任务标识。目标 \(y\) 可以是末端执行器命令、关节动作、夹爪状态、灵巧手动作、导航 waypoint 或人手运动。真正统一的是模型接口：预测未来 action / trajectory chunk，并用 prompt、mask 和 dataset-specific normalization 来解释不同通道的含义。

Qwen-VLA 通过文本 prompt 支持多个机器人平台。每个训练样本前面会加一段描述：

```text
The robot is {robot_tag} with {single arm / dual arms}[, waist][, and mobile base].
The control frequency is {FPS} Hz.
Please predict the next {chunk_size} control actions to execute the following task: {instruction}.
```

prompt 描述平台、手臂配置、控制频率、预测 horizon 和控制约定。动作则进入固定张量：

$$
Y \in \mathbb{R}^{H \times K}
$$

如果某个 embodiment 只使用 \(c \le K\) 个通道，有效值会放在前 \(c\) 个维度，其余通道 zero padding。二值 mask \(M \in \{0,1\}^{H \times K}\) 告诉 loss 哪些通道和时间步有效。论文不需要给 \(K\) 的每个坐标声明一个固定语义；embodiment prompt、数据集约定、per-dataset quantile normalization 和 mask 共同让一个 action expert 服务多种控制空间。

## Action Expert 与 T2A

模型结构的分工很清楚。**Qwen3.5-4B 视觉语言 backbone** 负责感知、指令理解、视觉 grounding 和空间推理。**DiT-style flow-matching action expert** 负责生成连续 action chunk：它把 VLM hidden states 和 noisy action chunk 拼接起来，通过带 AdaLN timestep conditioning 的 joint self-attention 处理，并学习去噪动作的 velocity field。推理时，模型用少量 Euler integration steps 生成动作。这样，高频连续控制不会被硬塞进语言 token，policy head 也有足够容量处理连续轨迹。

训练 recipe 分为 T2A、CPT、SFT、RL 四个阶段。**T2A** 是最关键的设计。Stage I 冻结 VLM，移除图像，只让 DiT action decoder 从文本和 embodiment prompt 中学习。论文把它看成 compression-decompression：一句 "pick up the red cup" 加 embodiment 描述很短，但对应的真实控制轨迹很长、很结构化。T2A 先让 decoder 学会 plausible action 的形状，再让模型同时面对视觉 grounding。

消融结果很直接。在 Simpler-WidowX 上，SFT 后的表现是：

| T2A 设置 | SFT success |
|---|---:|
| 无 T2A | 60.9% |
| full-sequence T2A，约 20% synthetic + 80% real text-action data | 71.1% |

几个细节把这个结论补得更完整。T2A 阶段去掉图像有助于 decoder 专注 language-action structure，同时降低成本。full-sequence prediction 优于只预测 chunk，因为完整轨迹包含全局时间结构和终止模式。纯 synthetic 和纯 real T2A 都弱于混合设置：synthetic 扩展语言覆盖，real 把先验锚定在物理运动上。论文还显示 T2A 训练过久会过拟合，这说明 motor prior 预训练同样受语料边界限制。

T2A 之后，**CPT** 解冻 VLM 和 action expert，在异构 embodied + vision-language mixture 上训练。**SFT** 用 curated downstream manipulation、navigation、grounding 和 VQA 数据做 task-balanced 与 embodiment-balanced 微调。**RL** 从 SFT checkpoint 出发，在 SimplerEnv 中用 PPO 和 sparse binary success reward 训练；由于 flow-matching policy 没有 token policy 那种天然 log probability，论文在 Euler denoising transition 中注入受控噪声，把 transition 写成可计算 log-probability 的 Gaussian，并在 action-chunk 层级计算 PPO。

## 数据配方与 Human Ego Action

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

机器人操作占主体，公共来源包括 RobotSet、Galaxea、AgiBot World、RoboCOIN、RoboMIND、RDT-1B、DROID、BridgeData V2、RH20T、RT-1 和 BC-Z，此外还有超过 **1,000 小时** 内部真实机器人轨迹以及仿真操作数据。关键做法是保留 source action format：delta end-effector、absolute joint、gripper state、dexterous-hand joints 延续各自数据源的控制约定，再通过归一化和 prompt 消歧。多视角相机也用 `ego`、`cam_left_wrist`、`cam_right_wrist` 这类 boundary tokens 显式标注。

人类第一视角数据只占 **6.0%**，但概念上很重要，因为它提供了可扩展的人类操作先验。Qwen-VLA 使用 VITRA 处理过的 Ego4D 和 EPIC-KITCHENS 子集，以及 EgoDex、EgoVerse、Xperience。每个 ego 样本输入图像和语言指令，输出未来一段双手动作。每只手的手腕用 3 维相对平移加 3 维 axis-angle 旋转表示，也就是 **6 维 wrist action**。

手指 articulation 需要压缩。MANO 手部姿态有 45 维 axis-angle，Qwen-VLA 在所有人类数据集的 45D hand pose 上做 PCA，并保留前 **10 个主成分**。这些系数就是 **eigengrasps**。

于是每只手的动作是：

$$
6 \text{ wrist dims} + 10 \text{ eigengrasp dims} = 16
$$

双手就是：

$$
2 \times 16 = 32
$$

所以 human ego 每个时间步提供 **32 维动作监督**：双手相对手腕运动加紧凑手部 articulation。这个表示让模型吸收人类手型和抓握先验，同时避免直接预测完整 MANO 关节角。边界也很明确：eigengrasps 压缩的是人手姿态，真正可执行的机器人行为仍依赖机器人轨迹、embodiment prompt、接触动力学和下游微调。

合成数据有两个作用。vision-language-action 分支使用内部 ROBOINF-style pipeline 构建桌面场景、生成任务和 success checks、产生 motion programs，并 roll out 成功轨迹；论文报告约 **359,848** 条包含 subtask segments 的 successful full trajectories。text-only language-action 分支是 T2A 的主要来源，覆盖六类单臂模板和六种机器人配置，报告约 **7.2M 条轨迹**、超过 **14,000 小时** 的模拟机器人轨迹数据。导航数据提供 waypoint 形式的 \((\Delta x, \Delta y, \Delta \theta)\)，辅助 VL 数据则在重度动作训练中保住物体识别、空间 grounding、OCR、VQA 和指令跟随能力。

## 结果与局限

post-training 的趋势可以从 Table 11 直接看出来：

| Stage | Simpler | RoboCasa | RoboTwin-E | RoboTwin-H | LIBERO | Simpler-OOD | DOMINO SR |
|---|---:|---:|---:|---:|---:|---:|---:|
| CPT | 64.3 | 40.4 | 64.3 | 66.4 | 90.8 | 25.3 | 21.1 |
| + SFT | 70.8 | 56.0 | 86.3 | 87.1 | 97.8 | 31.6 | 25.7 |
| + RL | 73.7 | 56.7 | 86.1 | 87.2 | 97.9 | 32.0 | 26.6 |

最大提升来自 SFT；RL 带来较小增益，并且没有明显破坏 held-out benchmark。headline benchmark 也很强：**97.9%** LIBERO，**73.7%** Simpler-WidowX，**86.1% / 87.2%** RoboTwin Easy/Hard，R2R Val-Unseen **57.5 SR**，RxR Val-Unseen **59.6 SR**，DOMINO dynamic manipulation zero-shot **26.6% SR**。真实 ALOHA 对比尤其有诊断意义：同样架构下，从 Qwen-VLA-Base 微调达到 **83.6%** in-domain 和 **76.9%** OOD；从零训练只有 **48.5%** 和 **36.2%**。这个差距指向 pretraining recipe 和 data mixture 的价值。

局限同样重要。内部机器人数据、ROBOINF 合成管线、Qwen3.6-plus captioning 和完整异构训练 schedule 都很难完全复现。unified action space 是工程务实的统一，仍然依赖 prompt、normalization、mask 和 dataset convention。human ego 数据提供有用先验，但 eigengrasps 不能解决接触、触觉、力反馈和完整 human-robot embodiment transfer。评测也仍然偏 benchmark 和短时程任务，长时间真实部署、失败恢复、记忆和 world modeling 还没有解决。

我的最终理解是：Qwen-VLA 最值得复用的思想，是把 **action-prior learning** 和 **visual grounding** 分阶段处理。T2A 先教 motor decoder 在语言和 embodiment 约束下动作轨迹大概应当是什么形状；CPT 和 SFT 再把这个 prior 接到图像、任务和下游控制上。随着 VLA 系统不断吸收机器人日志、人类视频、仿真、导航和 VL 数据，这种 staged interface 可能和 backbone 选择一样关键。

</div>
