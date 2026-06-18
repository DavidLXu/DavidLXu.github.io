---
title: "[Paper Notes] T-Rex: Tactile-Reactive Dexterous Manipulation"
date: 2026-06-19
permalink: /posts/2026/06/t-rex-paper-notes/
tags:
  - Tactile Sensing
  - Dexterous Manipulation
  - Vision-Language-Action
  - Robot Learning
  - Imitation Learning
  - Bimanual Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**T-Rex** is a tactile-reactive dexterous manipulation framework. Its core argument is that dexterous robot policies should not only see and reason, but also **feel and react** at a higher frequency than ordinary vision-language-action models.

The paper contributes three connected pieces: a **100-hour tactile-synchronized bimanual dexterous manipulation dataset**, a **variable-rate Mixture-of-Transformer-Experts (MoT)** model with a spatial-temporal tactile VQ-VAE encoder, and a real-world benchmark of **12 contact-rich tactile-reactive tasks**. T-Rex combines large-scale human egocentric pretraining, tactile-grounded robot mid-training, and task-specific post-training.

The headline result is strong: T-Rex reaches **65% average success** across 12 real-world tasks, compared with **35%** for EgoScale, the strongest baseline. A particularly important finding is that simply concatenating tactile signals into a pretrained VLA can make performance worse. Tactile feedback helps only when the architecture and training recipe can use it as a dynamic, high-frequency control signal.

## Paper Info

The paper is **"T-Rex: Tactile-Reactive Dexterous Manipulation"** by **Dantong Niu, Zhuoyang Liu, Zekai Wang, Boning Shao, Zhao-Heng Yin, Anirudh Pai, Yuvan Sharma, Stefano Saravalle, Ruijie Zheng, Jing Wang, Ryan Punamiya, Mengda Xu, Yuqi Xie, Yunfan Jiang, Letian Fu, Konstantinos Kallidromitis, Matteo Gioia, Junyi Zhang, Jiaxin Ge, Haiwen Feng, Fabio Galasso, Wei Zhan, David M. Chan, Yutong Bai, Roei Herzig, Jiahui Lei, Fei-Fei Li, Ken Goldberg, Jitendra Malik, Pieter Abbeel, Yuke Zhu, Danfei Xu, Jim Fan, and Trevor Darrell**.

It is available as [arXiv:2606.17055](https://arxiv.org/abs/2606.17055). The project page is [tactile-rex.github.io](https://tactile-rex.github.io/), and the code is released at [ZhuoyangLiu2005/T-Rex](https://github.com/ZhuoyangLiu2005/T-Rex). The public dataset is on Hugging Face as [zekaiwang/trex_dataset](https://huggingface.co/datasets/zekaiwang/trex_dataset).

## Problem and Motivation

Humans rely heavily on touch for dexterous manipulation. Turning a thin page, sliding a card out of a slot, squeezing toothpaste, handling a fragile egg, or opening a lock all require fast closed-loop reactions to contact, force, slip, and deformation.

Most current VLA policies are still vision-heavy. They may use language and images well, but tactile feedback is often missing, encoded statically, or added as a simple extra observation channel. That is not enough for contact-rich dexterity because touch is different from vision in two ways:

- tactile signals are high-frequency and local;
- useful tactile responses often need to happen inside an action chunk, before the slower visual policy replans.

T-Rex targets this frequency mismatch. It keeps slow visuomotor planning for semantic task progress, then adds a fast tactile refinement path for contact-level correction.

## Dataset

The **T-Rex Dataset** is a tactile-synchronized bimanual dexterous manipulation dataset collected on a real robot. The full dataset described in the paper contains:

- **100 hours** of teleoperation data;
- **7700+ trajectories**;
- **22 motor primitives**;
- **200+ daily objects**;
- synchronized RGB, tactile, robot state, action, and language data.

The public release currently contains about **50 hours** and **5400+ trajectories** in **LeRobot v3.0** format.

The robot platform is a fixed-base **Dexmate Vega-1** with two **Sharpa Wave** dexterous hands. The setup uses:

- one ZED X Mini head camera;
- two ZED X One S wrist cameras;
- five fingertip tactile sensors per hand;
- per-fingertip tactile force vectors;
- tactile deformation maps;
- Manus gloves and VIVE trackers for teleoperation.

The released dataset includes head and wrist RGB videos, joint states and targets, raw tactile images, tactile deformation fields, and estimated 6D fingertip wrenches.

This dataset design matters because it does not only collect full task demonstrations. It deliberately covers elementary motor primitives and object interactions, so mid-training can teach the model contact-rich building blocks that transfer to later tasks.

## Model Overview

T-Rex uses a **Mixture-of-Transformer-Experts** architecture with three experts:

| Expert | Role | Rate |
|---|---|---|
| Latent Expert | Future visual latent prediction | Low-rate |
| Action Expert | Low-frequency action denoising | About 5 Hz |
| Tactile Expert | High-frequency tactile refinement | About 20 Hz |

The model receives RGB observations, language instructions, tactile force history, and tactile deformation maps. It predicts a future action chunk using flow matching.

The key architectural idea is split control:

```text
slow visual-language planning
  -> intermediate action chunk
  -> fast tactile refinement
  -> executable action chunk
```

This keeps the expensive visual-language context cached, then lets the tactile expert update actions more frequently using fresh tactile observations.

## Spatial-Temporal Tactile Encoding

T-Rex does not treat touch as a single static vector.

For tactile force, it uses a per-finger **VQ-VAE** over recent force history. The encoder compresses a window of recent 6D force/torque signals into compact temporal tokens. It also keeps the current force vector to preserve instantaneous contact information.

For tactile deformation, it uses a convolutional encoder over deformation maps.

The final tactile token sequence combines:

```text
VQ-VAE temporal force token
+ current force projection
+ deformation-map feature
```

This is important because tactile information has both temporal and spatial structure. A force spike, a gradual slip, and a local deformation patch mean different things for action correction.

## Cascaded Flow Matching

The action generation process is split into slow and fast stages.

The action expert first denoises from pure noise to an intermediate timestep:

```text
tau: 1 -> tau_split
```

Then the tactile expert continues from that intermediate state:

```text
tau_split -> 0
```

In the paper's implementation:

- action chunk length is **16**;
- total Euler denoising steps are **10**;
- the split is at **tau_split = 0.4**;
- the action expert runs **6** slow steps;
- the tactile expert runs **4** fast refinement steps;
- tactile updates are triggered at offsets `{0, 4, 8, 12}` inside the action chunk.

The point is not just speed. The tactile expert can react to new contact signals without rerunning the full vision-language stack.

## Training Recipe

T-Rex uses a three-stage training recipe.

**1. Large-scale human egocentric pretraining.**  
Following EgoScale, the latent and action experts are pretrained on **22,889 hours** of egocentric human video. This gives the model broad visual-language and visuomotor priors.

**2. Tactile-grounded robot mid-training.**  
The model is then trained on the **100-hour T-Rex Dataset**, aligning the pretrained visuomotor representation with robot-executable bimanual actions and synchronized tactile feedback.

**3. Skill-specific post-training.**  
For downstream tasks, the model is fine-tuned with about **100 task demonstrations**.

This recipe is a major part of the contribution. The paper argues that tactile capability does not need to be learned from scratch at pretraining scale. It can be acquired during a dedicated robot mid-training stage.

## Evaluation Setup

The benchmark includes **12 real-world tactile-reactive tasks** covering:

- insertion;
- deformation-aware manipulation;
- force-sensitive interaction;
- bimanual coordination;
- extraction;
- precise contact.

Tasks include **Flip Page**, **Transfer Egg**, **Wipe Plate**, **Apply Toothpaste**, **Split Cup**, **Sort Mahjong**, **Open Lock**, **Refill Tablet**, **Acid-Base Neutralization**, **Extract Card**, **Deal Poker**, and **Screw Lightbulb**.

Each task is evaluated with **16 rollouts** under randomized object positions and rotations. Multi-stage tasks use progress-based rubrics to capture partial completion.

The baselines are:

- **ViTacFormer**;
- **RDP**;
- **Tactile-VLA**;
- **EgoScale**;
- **π0.5**;
- **π0.5 + tactile**.

All methods use the same robot setup, action space, and evaluation protocol.

## Main Results

Average success across 12 tasks:

| Method | Average Success |
|---|---:|
| ViTacFormer | 3% |
| RDP | 6% |
| Tactile-VLA | 15% |
| EgoScale | 35% |
| π0.5 | 17% |
| π0.5 + tactile | 6% |
| T-Rex | 65% |

T-Rex is far ahead of the strongest baseline, EgoScale. The result also contains a subtle warning: **π0.5 + tactile performs worse than π0.5**. Naively adding tactile signals to a pretrained VLA can degrade performance.

The paper's interpretation is that tactile feedback needs architectural support and training alignment. It is not just another low-dimensional state vector.

## Ablations

The tactile modality ablation is very clear:

| Configuration | Average |
|---|---:|
| Full T-Rex | 65% |
| w/o Tactile | 42% |
| MLP Force + Deform | 58% |
| Deform only | 54% |
| MLP Force + VQ-VAE Force | 59% |
| w/o Async | 60% |

Several takeaways:

- Removing tactile drops average success from **65%** to **42%**.
- Force and deformation are complementary.
- The VQ-VAE temporal force representation helps.
- Asynchronous tactile refinement matters, though it is a smaller gap than removing tactile entirely.

The training recipe ablation also supports the three-stage design:

| Recipe | Average |
|---|---:|
| No pretraining, no mid-training | 18% |
| Pretraining only | 34% |
| Mid-training only | 45% |
| Full recipe | 65% |

Human egocentric pretraining provides broad priors, while tactile-grounded mid-training connects those priors to robot contact dynamics.

## Code and Release

The [GitHub repository](https://github.com/ZhuoyangLiu2005/T-Rex) is substantial. It includes:

- `qwen_vla/`: the three-expert MoT model and VLA wrapper;
- `tactile_vqvae/`: tactile VQ-VAE training and extraction code;
- `scripts/train.py` and `scripts/test.py`: post-training and ZMQ inference server;
- `dataset_quickstart/`: tools to browse, inspect, and replay the released dataset;
- `hardware_code/`: teleoperation and robot-side inference stack;
- `utils/`: data conversion, LeRobot support, and checkpoint tools.

The README says the main branch ships post-training and inference code. Pretraining and mid-training scripts live in a separate `full-pipeline` branch, while pretrained and midtrained checkpoints are released on Hugging Face.

## Why This Paper Matters

T-Rex is interesting because it pushes tactile sensing into the foundation-policy discussion.

Many recent robotics papers focus on scaling vision-language-action models, world models, or human egocentric pretraining. T-Rex says that for dexterous manipulation, scale and vision are not enough. The robot must react to physical contact in real time.

The most important lesson is:

**Tactile feedback is not just an observation modality. It changes the control frequency and architecture.**

That is why the variable-rate MoT design matters. The slow expert handles visual-language planning; the fast expert handles contact-level corrections.

## Limitations

The paper points to two main limitations.

First, some long-horizon tasks with tight contact tolerances are still difficult to teleoperate and learn from demonstrations alone. The authors suggest reinforcement learning or online interaction-based refinement as future directions.

Second, tactile-reactive manipulation remains hardware-limited. Sensor distortion, calibration drift, cross-device tactile variation, and the lack of dense palm sensing all make tactile foundation policies harder to scale.

I would add one more practical limitation: the system is tied to a rich dexterous platform with fingertip tactile sensors. This is exactly the right setup for the research question, but it also means adoption depends on tactile hardware becoming more common and standardized.

## Takeaways

T-Rex is best understood as a tactile counterpart to the recent VLA and ego-video scaling wave.

The model uses human egocentric pretraining to get broad visuomotor priors, then uses tactile-rich robot mid-training to make those priors physically reactive. The strong result across 12 real-world tasks suggests that tactile grounding is not an optional add-on for dexterous manipulation. It is a core capability.

For future robot learning, I would summarize the direction as:

```text
vision-language planning
+ tactile-reactive refinement
+ dexterous hardware
= contact-rich manipulation that actually works
```

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**T-Rex** 是一个 tactile-reactive dexterous manipulation 框架。它的核心观点是：灵巧操作 policy 不应该只会看图像和理解语言，还应该能以比普通 VLA 更高的频率 **感知触觉并做出反应**。

论文贡献了三件彼此关联的东西：一个 **100 小时 tactile-synchronized bimanual dexterous manipulation dataset**，一个带 spatial-temporal tactile VQ-VAE encoder 的 **variable-rate Mixture-of-Transformer-Experts (MoT)** 模型，以及一个包含 **12 个 contact-rich tactile-reactive tasks** 的真实机器人 benchmark。T-Rex 结合了 large-scale human egocentric pretraining、tactile-grounded robot mid-training 和 task-specific post-training。

最核心的结果很强：T-Rex 在 12 个真实任务上的平均成功率是 **65%**，而最强 baseline EgoScale 是 **35%**。一个特别重要的发现是，简单把 tactile signals 拼进 pretrained VLA 可能会让性能变差。触觉要发挥作用，需要能把它当成动态高频控制信号的 architecture 和 training recipe。

## Paper Info

论文标题是 **"T-Rex: Tactile-Reactive Dexterous Manipulation"**，作者包括 **Dantong Niu, Zhuoyang Liu, Zekai Wang, Boning Shao, Zhao-Heng Yin, Anirudh Pai, Yuvan Sharma, Stefano Saravalle, Ruijie Zheng, Jing Wang, Ryan Punamiya, Mengda Xu, Yuqi Xie, Yunfan Jiang, Letian Fu, Konstantinos Kallidromitis, Matteo Gioia, Junyi Zhang, Jiaxin Ge, Haiwen Feng, Fabio Galasso, Wei Zhan, David M. Chan, Yutong Bai, Roei Herzig, Jiahui Lei, Fei-Fei Li, Ken Goldberg, Jitendra Malik, Pieter Abbeel, Yuke Zhu, Danfei Xu, Jim Fan, and Trevor Darrell**。

论文地址是 [arXiv:2606.17055](https://arxiv.org/abs/2606.17055)。项目页是 [tactile-rex.github.io](https://tactile-rex.github.io/)，代码在 [ZhuoyangLiu2005/T-Rex](https://github.com/ZhuoyangLiu2005/T-Rex)。公开数据集在 Hugging Face：[zekaiwang/trex_dataset](https://huggingface.co/datasets/zekaiwang/trex_dataset)。

## 问题和动机

人类灵巧操作高度依赖触觉。翻薄纸、从缝里抽卡、挤牙膏、拿脆弱的鸡蛋、开锁，这些任务都需要对接触、力、滑动和形变做快速闭环反应。

当前大多数 VLA policy 仍然以视觉为主。它们可以用语言和图像做出不错的语义决策，但触觉反馈常常缺失，或者只被静态编码，或者被当成简单额外 observation channel。对 contact-rich dexterity 来说，这不够。

触觉和视觉有两个关键差异：

- tactile signals 更高频、更局部；
- 有用的触觉反应经常需要发生在一个 action chunk 内部，比慢速视觉 policy 重新规划更快。

T-Rex 直接瞄准这个频率错配。它保留慢速 visuomotor planning 来处理语义任务进展，然后加入快速 tactile refinement 路径来做接触级修正。

## Dataset

**T-Rex Dataset** 是一个在真实机器人上采集的 tactile-synchronized bimanual dexterous manipulation dataset。论文描述的完整数据集包含：

- **100 小时** teleoperation data；
- **7700+ trajectories**；
- **22 个 motor primitives**；
- **200+ daily objects**；
- 同步 RGB、tactile、robot state、action 和 language data。

当前公开 release 约 **50 小时**、**5400+ trajectories**，格式是 **LeRobot v3.0**。

机器人平台是固定基座的 **Dexmate Vega-1**，搭配两只 **Sharpa Wave** dexterous hands。系统使用：

- 一个 ZED X Mini head camera；
- 两个 ZED X One S wrist cameras；
- 每只手五个 fingertip tactile sensors；
- 每个指尖的 tactile force vectors；
- tactile deformation maps；
- Manus gloves 和 VIVE trackers 做 teleoperation。

公开数据包含 head/wrist RGB videos、joint states 和 targets、raw tactile images、tactile deformation fields，以及估计的 6D fingertip wrenches。

这个数据设计很关键，因为它不只采集完整任务 demonstrations。它刻意覆盖 elementary motor primitives 和 object interactions，让 mid-training 可以学习能迁移到后续任务的 contact-rich building blocks。

## Model Overview

T-Rex 使用 **Mixture-of-Transformer-Experts** architecture，包含三个 experts：

| Expert | Role | Rate |
|---|---|---|
| Latent Expert | Future visual latent prediction | Low-rate |
| Action Expert | Low-frequency action denoising | About 5 Hz |
| Tactile Expert | High-frequency tactile refinement | About 20 Hz |

模型输入 RGB observations、language instructions、tactile force history 和 tactile deformation maps。它用 flow matching 预测未来 action chunk。

关键 architecture idea 是把控制拆成两层：

```text
slow visual-language planning
  -> intermediate action chunk
  -> fast tactile refinement
  -> executable action chunk
```

这样可以缓存昂贵的 visual-language context，然后让 tactile expert 用最新 tactile observations 更高频地更新动作。

## Spatial-Temporal Tactile Encoding

T-Rex 没有把触觉当成单帧静态向量。

对 tactile force，它使用 per-finger **VQ-VAE** 处理最近一段 force history。encoder 会把最近的 6D force/torque signals 压缩成 compact temporal tokens。同时，它也保留 current force vector 来表达瞬时接触。

对 tactile deformation，它使用 convolutional encoder 处理 deformation maps。

最终 tactile token sequence 结合了：

```text
VQ-VAE temporal force token
+ current force projection
+ deformation-map feature
```

这很重要，因为 tactile information 同时有时间结构和空间结构。force spike、缓慢滑动、局部形变 patch，对 action correction 来说含义完全不同。

## Cascaded Flow Matching

动作生成被分成慢速和快速两个阶段。

Action expert 先从纯噪声 denoise 到中间 timestep：

```text
tau: 1 -> tau_split
```

然后 tactile expert 从中间状态继续 denoise：

```text
tau_split -> 0
```

论文实现里：

- action chunk length 是 **16**；
- 总 Euler denoising steps 是 **10**；
- split 在 **tau_split = 0.4**；
- action expert 运行 **6** 个 slow steps；
- tactile expert 运行 **4** 个 fast refinement steps；
- tactile updates 在 action chunk 内的 `{0, 4, 8, 12}` 这些 offset 触发。

重点不只是速度。tactile expert 可以使用新的接触信号做反应，而不需要重新跑完整的 vision-language stack。

## Training Recipe

T-Rex 使用三阶段训练。

**1. Large-scale human egocentric pretraining.**  
沿用 EgoScale，latent expert 和 action expert 先在 **22,889 小时** egocentric human video 上预训练。这一步提供广泛的 visual-language 和 visuomotor priors。

**2. Tactile-grounded robot mid-training.**  
然后模型在 **100 小时 T-Rex Dataset** 上训练，把 pretrained visuomotor representation 对齐到 robot-executable bimanual actions 和同步 tactile feedback。

**3. Skill-specific post-training.**  
对下游任务，模型再用约 **100 条 task demonstrations** fine-tune。

这个 recipe 是论文的主要贡献之一。论文认为触觉能力不一定要在 pretraining scale 从零学出来，它可以在专门的 robot mid-training 阶段被高效获得。

## Evaluation Setup

Benchmark 包含 **12 个真实世界 tactile-reactive tasks**，覆盖：

- insertion；
- deformation-aware manipulation；
- force-sensitive interaction；
- bimanual coordination；
- extraction；
- precise contact。

任务包括 **Flip Page**、**Transfer Egg**、**Wipe Plate**、**Apply Toothpaste**、**Split Cup**、**Sort Mahjong**、**Open Lock**、**Refill Tablet**、**Acid-Base Neutralization**、**Extract Card**、**Deal Poker** 和 **Screw Lightbulb**。

每个任务评测 **16 次 rollout**，物体位置和姿态随机。多阶段任务使用 progress-based rubrics 来计算部分完成度。

Baselines 包括：

- **ViTacFormer**；
- **RDP**；
- **Tactile-VLA**；
- **EgoScale**；
- **π0.5**；
- **π0.5 + tactile**。

所有方法使用相同 robot setup、action space 和 evaluation protocol。

## Main Results

12 个任务平均成功率：

| Method | Average Success |
|---|---:|
| ViTacFormer | 3% |
| RDP | 6% |
| Tactile-VLA | 15% |
| EgoScale | 35% |
| π0.5 | 17% |
| π0.5 + tactile | 6% |
| T-Rex | 65% |

T-Rex 明显超过最强 baseline EgoScale。这个结果里还有一个很微妙但重要的警告：**π0.5 + tactile 比 π0.5 更差**。简单给 pretrained VLA 拼上 tactile signals 可能会破坏性能。

论文的解释是：触觉反馈需要 architecture support 和 training alignment。它不是另一个低维 state vector。

## Ablations

Tactile modality ablation 非常清楚：

| Configuration | Average |
|---|---:|
| Full T-Rex | 65% |
| w/o Tactile | 42% |
| MLP Force + Deform | 58% |
| Deform only | 54% |
| MLP Force + VQ-VAE Force | 59% |
| w/o Async | 60% |

几个 takeaway：

- 去掉 tactile 后，平均成功率从 **65%** 掉到 **42%**。
- Force 和 deformation 互补。
- VQ-VAE temporal force representation 有帮助。
- Asynchronous tactile refinement 也有收益，不过 gap 小于完全去掉 tactile。

训练 recipe ablation 也支持三阶段设计：

| Recipe | Average |
|---|---:|
| No pretraining, no mid-training | 18% |
| Pretraining only | 34% |
| Mid-training only | 45% |
| Full recipe | 65% |

Human egocentric pretraining 提供广泛 priors，tactile-grounded mid-training 把这些 priors 连接到机器人接触动力学。

## Code and Release

[GitHub 仓库](https://github.com/ZhuoyangLiu2005/T-Rex) 很完整，包含：

- `qwen_vla/`：three-expert MoT model 和 VLA wrapper；
- `tactile_vqvae/`：tactile VQ-VAE training 和 extraction code；
- `scripts/train.py` 和 `scripts/test.py`：post-training 和 ZMQ inference server；
- `dataset_quickstart/`：浏览、检查和 replay 公开 dataset 的工具；
- `hardware_code/`：teleoperation 和 robot-side inference stack；
- `utils/`：data conversion、LeRobot support 和 checkpoint tools。

README 说明 main branch 发布的是 post-training 和 inference code。Pretraining/midtraining scripts 在单独的 `full-pipeline` branch 里，pretrained 和 midtrained checkpoints 已经在 Hugging Face 发布。

## Why This Paper Matters

T-Rex 有意思的地方在于，它把 tactile sensing 拉进了 foundation policy 的讨论中心。

最近很多机器人论文在 scale vision-language-action models、world models 或 human egocentric pretraining。T-Rex 的观点是：对 dexterous manipulation 来说，scale 和 vision 还不够。机器人必须能实时响应物理接触。

最重要的 lesson 是：

**Tactile feedback is not just an observation modality. It changes the control frequency and architecture.**

这也是 variable-rate MoT design 的意义。慢 expert 负责 visual-language planning，快 expert 负责 contact-level corrections。

## Limitations

论文指出两个主要限制。

第一，对一些 contact coordination 精度要求很高、teleoperation 本身很难的长程任务，仅靠 demonstrations 仍然不够。作者建议未来可以结合 reinforcement learning 或 online interaction-based refinement。

第二，tactile-reactive manipulation 仍然受限于硬件。Sensor distortion、calibration drift、跨设备 tactile variation，以及缺少 dense palm sensing，都会让 tactile foundation policies 更难 scale。

我会再补充一个现实限制：系统依赖带 fingertip tactile sensors 的高能力 dexterous platform。这正好匹配研究问题，但也意味着这条路线的普及依赖 tactile hardware 变得更常见、更标准化。

## Takeaways

T-Rex 可以看作最近 VLA 和 ego-video scaling 浪潮里的 tactile counterpart。

模型用 human egocentric pretraining 获得广泛 visuomotor priors，再用 tactile-rich robot mid-training 让这些 priors 具备物理反应能力。12 个真实任务上的强结果说明，tactile grounding 对 dexterous manipulation 不是可选项，而是核心能力。

我会把这个方向总结成：

```text
vision-language planning
+ tactile-reactive refinement
+ dexterous hardware
= contact-rich manipulation that actually works
```

</div>
