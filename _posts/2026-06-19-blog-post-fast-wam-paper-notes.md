---
title: "[Paper Notes] Fast-WAM: Do World Action Models Need Test-time Future Imagination?"
date: 2026-06-19
permalink: /posts/2026/06/fast-wam-paper-notes/
tags:
  - World Action Models
  - Video World Models
  - Robot Learning
  - Vision-Language-Action
  - Flow Matching
  - Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Fast-WAM** asks a sharp question about World Action Models (WAMs): do robot policies really need to generate future videos at test time, or is the main benefit of video prediction already captured during training?

The paper's answer is surprising and useful. A WAM can keep **video co-training** during training, then skip explicit future video generation during inference. Fast-WAM uses a pretrained video DiT as a single-pass world encoder and directly predicts action chunks from latent world representations. This removes the expensive imagine-then-execute step while preserving most of the performance benefits.

Empirically, Fast-WAM reaches **91.8%** average success on RoboTwin 2.0 and **97.6%** average success on LIBERO without embodied pretraining. It runs at **190 ms** latency on a single RTX 5090D V2 GPU, more than **4x faster** than an IDM-style imagine-then-execute variant. Controlled ablations show the key pattern: removing video co-training hurts much more than removing test-time future imagination.

## Paper Info

The paper is **"Fast-WAM: Do World Action Models Need Test-time Future Imagination?"** by **Tianyuan Yuan, Zibin Dong, Yicheng Liu, and Hang Zhao** from **IIIS, Tsinghua University** and **Galaxea AI**.

It is available as [arXiv:2603.16666](https://arxiv.org/abs/2603.16666). The project page is [yuantianyuan01.github.io/FastWAM](https://yuantianyuan01.github.io/FastWAM/), and the official code is [yuantianyuan01/FastWAM](https://github.com/yuantianyuan01/FastWAM). The authors also release checkpoints and preprocessed LIBERO/RoboTwin datasets on Hugging Face.

## The Question

World Action Models combine future visual prediction and action prediction. The usual intuition is appealing: if the model can imagine what will happen next, it should choose better actions.

Many WAMs therefore follow an imagine-then-execute recipe:

```text
current observation + language
  -> generate future video
  -> predict actions conditioned on imagined future
```

The cost is inference latency. Video diffusion requires iterative denoising, and a real robot policy needs low-latency closed-loop control.

Fast-WAM separates two factors that are usually entangled:

1. **Video modeling during training**: future video prediction shapes the representation.
2. **Future generation during inference**: the model explicitly synthesizes future observations at test time.

The paper asks which factor matters more.

## Core Idea

Fast-WAM keeps the training-time world modeling objective but removes test-time future video generation.

During training, it jointly learns:

- action prediction;
- future video latent prediction.

During inference, it keeps only the current observation tokens, runs the video backbone once, and predicts actions directly:

```text
current observation + language
  -> latent world representation
  -> action chunk
```

This gives Fast-WAM a direct-policy interface similar to a VLA, while still benefiting from WAM-style video supervision during training.

The paper's central claim is:

**Video prediction is valuable mainly as a representation-learning objective, not necessarily as a test-time planning procedure.**

## Architecture

Fast-WAM is built on **Wan2.2-5B**, reusing:

- the video Diffusion Transformer;
- the pretrained T5 text encoder;
- the video VAE.

On top of this video backbone, the authors add a **1B action expert DiT**. The full model has about **6B parameters**.

The model uses a Mixture-of-Transformer style design with shared attention. Tokens are grouped into:

- clean latent tokens of the current observation frame;
- noisy latent tokens of future video frames, used only during training;
- action tokens for action chunk generation.

A structured attention mask is the key implementation detail. During training, video tokens learn to predict future latent frames, and action tokens learn to predict actions from the clean current observation. Crucially, action tokens cannot attend to future video tokens. This prevents future-video leakage and makes the comparison fair: the action branch benefits from the video-shaped backbone, but it does not cheat by seeing ground-truth future frames.

At inference time, the future video branch is removed entirely. Only the clean current-frame latent tokens are passed through the video backbone once, and the action expert denoises the action chunk.

## Training Objective

Fast-WAM uses a joint flow-matching objective. For either action chunks or future video latents, it samples noise and interpolation time, then trains the model to predict the velocity field.

The action loss is:

```text
L_act = L_FM(action chunk)
```

The video co-training loss is:

```text
L_vid = L_FM(future video latents)
```

The full objective is:

```text
L = L_act + lambda * L_vid
```

This is the cleanest part of the paper. Fast-WAM makes video prediction a training signal for better world representations, while action inference remains direct and fast.

## Controlled Variants

To test the hypothesis, the paper builds several variants under a shared implementation:

| Variant | Training Video Co-Training | Test-Time Future Generation | Meaning |
|---|---:|---:|---|
| Fast-WAM | Yes | No | Main method |
| Fast-WAM-Joint | Yes | Yes | Joint video/action denoising |
| Fast-WAM-IDM | Yes | Yes | Generate future video, then predict action |
| Fast-WAM w/o video co-train | No | No | Tests whether video co-training matters |

This design isolates the important comparison:

```text
video co-training vs. explicit future imagination
```

## Implementation Details

The reported implementation uses:

- **Wan2.2-5B** video backbone;
- **1B** action expert with hidden dimension **1024**;
- action horizon **32**;
- future video horizon of **9 frames** after 4x temporal downsampling;
- multi-camera images concatenated before VAE encoding;
- flow matching for both video and action branches;
- **10** denoising steps for action inference;
- AdamW with learning rate **1e-4**;
- mixed precision training and gradient clipping.

The official code repository contains:

- `src/fastwam/`: core runtime and trainer;
- `configs/model/fastwam.yaml`: model config;
- `configs/data/`: LIBERO and RoboTwin dataset configs;
- `experiments/libero/`: LIBERO evaluation manager;
- `experiments/robotwin/`: RoboTwin evaluation manager;
- `scripts/train.py` and DeepSpeed launch scripts;
- released checkpoint evaluation instructions.

The repo supports released checkpoints for LIBERO and RoboTwin, and the README documents dataset download, ActionDiT preprocessing, T5 embedding precomputation, and multi-GPU training.

## Simulation Results

Fast-WAM is evaluated on **LIBERO** and **RoboTwin 2.0**.

On RoboTwin 2.0:

| Method | Embodied Pretraining | Average Success |
|---|---:|---:|
| π0 | Yes | 62.2 |
| π0.5 | Yes | 79.8 |
| Motus | Yes | 87.8 |
| Motus from Wan2.2 | No | 77.3 |
| LingBot-VA | Yes | 92.2 |
| LingBot-VA from Wan2.2 | No | 80.6 |
| Fast-WAM | No | 91.8 |

Fast-WAM is very close to pretrained LingBot-VA and clearly above non-pretrained baselines.

On LIBERO:

| Method | Embodied Pretraining | Average Success |
|---|---:|---:|
| OpenVLA | Yes | 76.5 |
| π0 | Yes | 94.1 |
| π0.5 | Yes | 96.9 |
| LingBot-VA | Yes | 98.5 |
| Motus | Yes | 97.7 |
| Fast-WAM | No | 97.6 |

This is a strong result because Fast-WAM does not rely on embodied pretraining, yet remains competitive with WAM/VLA baselines that do.

## Ablation Results

The ablation is the heart of the paper.

On RoboTwin:

| Variant | Average Success |
|---|---:|
| Fast-WAM | 91.8 |
| Fast-WAM-Joint | 90.6 |
| Fast-WAM-IDM | 91.3 |
| Fast-WAM w/o video co-train | 83.8 |

On LIBERO:

| Variant | Average Success |
|---|---:|
| Fast-WAM | 97.6 |
| Fast-WAM-Joint | 98.5 |
| Fast-WAM-IDM | 98.0 |
| Fast-WAM w/o video co-train | 93.5 |

The lesson is consistent:

- Fast-WAM is close to variants that perform explicit future imagination.
- Removing video co-training causes a much larger drop.

This supports the paper's main claim: for these benchmarks, WAMs benefit more from training-time video modeling than from test-time video generation.

## Real-World Towel Folding

The real-world experiment uses a **Galaxea R1 Lite** platform and a long-horizon towel-folding task. The authors collect **60 hours** of teleoperated demonstrations and train models for **30k steps**.

The paper reports both success rate and completion time. This is important because a policy that eventually succeeds through repeated corrections may still be poor for deployment.

The key findings are:

- pretrained π0.5 remains the strongest real-world baseline;
- Fast-WAM variants with video co-training substantially outperform π0.5 without pretraining;
- Fast-WAM without video co-training drops to **10%** success;
- Fast-WAM has **190 ms** latency;
- Fast-WAM-Joint is around **580 ms**;
- Fast-WAM-IDM is around **810 ms**.

Fast-WAM is therefore the best deployment-style tradeoff among its family: strong performance with much lower inference latency.

## What This Means

Fast-WAM changes how I would think about WAMs.

The naive view is:

```text
the model is good because it imagines future videos at test time
```

The Fast-WAM view is:

```text
the model is good because video prediction shapes better latent world representations during training
```

That distinction matters. If the benefit comes mainly from training, we can keep the representational advantage of video modeling while avoiding slow future-video generation during deployment.

This also helps explain why the method looks like a bridge between VLA policies and WAMs:

- At test time, Fast-WAM behaves like a direct action policy.
- During training, it receives world-model supervision.

## Strengths

The strongest parts of the paper are:

- It asks a precise design question rather than only proposing a larger model.
- The controlled variants isolate training-time video co-training from inference-time future imagination.
- The method keeps real-time deployment in mind.
- The official code and checkpoints are released.
- The result is useful for future WAM design: video objectives may be kept as auxiliary training signals without requiring slow test-time video synthesis.

## Limitations

There are still open questions.

First, the paper evaluates a specific scale and backbone: Wan2.2-5B plus a 1B action expert. The conclusion may evolve with larger video backbones, larger embodied datasets, or different action decoders.

Second, Fast-WAM still uses diffusion-style action denoising. It is much faster than imagine-then-execute WAMs, but **190 ms** is still a meaningful latency for high-frequency contact-rich control.

Third, the real-world task is towel folding on one robot platform. It is useful, but broader real-world evaluation across rigid, articulated, deformable, and contact-rich manipulation would make the claim stronger.

Finally, skipping future video generation improves speed, but it also removes an interpretable visual rollout that could be useful for debugging, planning, or human inspection.

## Takeaways

Fast-WAM's takeaway is concise:

**For WAMs, future video prediction may be more valuable as a training objective than as a test-time procedure.**

This is a practically important result. It suggests a design path for robot policies that combines:

- the representation benefit of video world models;
- the low-latency interface of direct action policies;
- controlled ablations that show where the performance actually comes from.

For robotics, that is a good trade: use video to learn better world representations, then act without waiting for the model to dream.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**Fast-WAM** 问了 World Action Models 里的一个关键问题：机器人 policy 在测试时真的需要生成未来视频吗，还是 video prediction 的主要价值已经在训练阶段被吸收了？

论文的答案很有意思，也很实用。WAM 可以在训练时保留 **video co-training**，推理时跳过显式的未来视频生成。Fast-WAM 把 pretrained video DiT 当成 single-pass world encoder，直接从 latent world representations 预测 action chunks。这样就去掉了昂贵的 imagine-then-execute 步骤，同时保留了大部分性能收益。

实验上，Fast-WAM 在 RoboTwin 2.0 上达到 **91.8%** 平均成功率，在 LIBERO 上达到 **97.6%** 平均成功率，而且没有使用 embodied pretraining。它在单张 RTX 5090D V2 GPU 上推理延迟为 **190 ms**，比 IDM-style imagine-then-execute variant 快超过 **4 倍**。Controlled ablations 显示：去掉 video co-training 的伤害，明显大于去掉 test-time future imagination 的伤害。

## Paper Info

论文标题是 **"Fast-WAM: Do World Action Models Need Test-time Future Imagination?"**，作者是 **Tianyuan Yuan, Zibin Dong, Yicheng Liu, and Hang Zhao**，来自 **IIIS, Tsinghua University** 和 **Galaxea AI**。

论文地址是 [arXiv:2603.16666](https://arxiv.org/abs/2603.16666)。项目页是 [yuantianyuan01.github.io/FastWAM](https://yuantianyuan01.github.io/FastWAM/)，官方代码是 [yuantianyuan01/FastWAM](https://github.com/yuantianyuan01/FastWAM)。作者也在 Hugging Face 上发布了 checkpoints 和预处理后的 LIBERO/RoboTwin datasets。

## The Question

World Action Models 会把 future visual prediction 和 action prediction 结合起来。直觉很自然：如果模型能想象接下来会发生什么，它应该能选出更好的动作。

因此，很多 WAM 采用 imagine-then-execute 形式：

```text
current observation + language
  -> generate future video
  -> predict actions conditioned on imagined future
```

问题是推理延迟。Video diffusion 需要多步 denoising，而真实机器人 policy 需要低延迟闭环控制。

Fast-WAM 把通常混在一起的两个因素拆开：

1. **训练阶段的 video modeling**：future video prediction 用来塑造 representation。
2. **推理阶段的 future generation**：模型在测试时显式合成未来 observation。

论文要回答的是：到底哪个因素更重要？

## Core Idea

Fast-WAM 保留训练时的 world modeling objective，同时去掉测试时的未来视频生成。

训练时，它联合学习：

- action prediction；
- future video latent prediction。

推理时，它只保留当前 observation tokens，运行一次 video backbone，然后直接预测动作：

```text
current observation + language
  -> latent world representation
  -> action chunk
```

这样，Fast-WAM 在测试时像 VLA 一样有 direct-policy interface，同时仍然从 WAM-style video supervision 里获得训练收益。

论文的核心观点是：

**Video prediction 的主要价值可能在于作为 representation-learning objective，而不一定在于作为 test-time planning procedure。**

## Architecture

Fast-WAM 基于 **Wan2.2-5B** 构建，复用了：

- video Diffusion Transformer；
- pretrained T5 text encoder；
- video VAE。

在 video backbone 之上，作者加入了一个 **1B action expert DiT**。整体模型约 **6B parameters**。

模型使用 Mixture-of-Transformer 风格设计，并带 shared attention。Tokens 被分成三组：

- 当前 observation frame 的 clean latent tokens；
- future video frames 的 noisy latent tokens，只在训练时使用；
- 用于 action chunk generation 的 action tokens。

Structured attention mask 是关键实现细节。训练时，video tokens 学习预测未来 latent frames，action tokens 从 clean current observation 学习预测 actions。关键是 action tokens 不能 attend 到 future video tokens。这样可以防止 future-video leakage，使比较更公平：action branch 可以从 video-shaped backbone 受益，但不能直接看到 ground-truth future frames。

推理时，future video branch 被完全移除。只有 clean current-frame latent tokens 会通过 video backbone 跑一次，然后 action expert denoise 出 action chunk。

## Training Objective

Fast-WAM 使用 joint flow-matching objective。对于 action chunks 或 future video latents，模型采样噪声和插值时间，并学习预测 velocity field。

Action loss 是：

```text
L_act = L_FM(action chunk)
```

Video co-training loss 是：

```text
L_vid = L_FM(future video latents)
```

总目标是：

```text
L = L_act + lambda * L_vid
```

这是论文里最干净的设计点。Fast-WAM 把 video prediction 作为训练信号来学习更好的 world representations，同时让 action inference 保持直接和快速。

## Controlled Variants

为了测试假设，论文在同一实现框架下构造了几个 variants：

| Variant | Training Video Co-Training | Test-Time Future Generation | Meaning |
|---|---:|---:|---|
| Fast-WAM | Yes | No | 主方法 |
| Fast-WAM-Joint | Yes | Yes | Joint video/action denoising |
| Fast-WAM-IDM | Yes | Yes | 先生成 future video，再预测 action |
| Fast-WAM w/o video co-train | No | No | 测试 video co-training 的作用 |

这个设计隔离了真正重要的比较：

```text
video co-training vs. explicit future imagination
```

## Implementation Details

论文报告的实现配置包括：

- **Wan2.2-5B** video backbone；
- **1B** action expert，hidden dimension 为 **1024**；
- action horizon **32**；
- future video horizon 为 **9 frames**，经过 4x temporal downsampling；
- 多相机图像在 VAE encoding 前拼接成一张图；
- video 和 action branches 都使用 flow matching；
- action inference 使用 **10** 个 denoising steps；
- AdamW，learning rate **1e-4**；
- mixed precision training 和 gradient clipping。

官方代码仓库包含：

- `src/fastwam/`：核心 runtime 和 trainer；
- `configs/model/fastwam.yaml`：模型配置；
- `configs/data/`：LIBERO 和 RoboTwin dataset configs；
- `experiments/libero/`：LIBERO evaluation manager；
- `experiments/robotwin/`：RoboTwin evaluation manager；
- `scripts/train.py` 和 DeepSpeed 启动脚本；
- released checkpoint evaluation 说明。

README 还写了 LIBERO/RoboTwin checkpoint 评测、ActionDiT preprocessing、T5 embedding precomputation 和 multi-GPU training 流程。

## Simulation Results

Fast-WAM 在 **LIBERO** 和 **RoboTwin 2.0** 上评测。

RoboTwin 2.0 结果：

| Method | Embodied Pretraining | Average Success |
|---|---:|---:|
| π0 | Yes | 62.2 |
| π0.5 | Yes | 79.8 |
| Motus | Yes | 87.8 |
| Motus from Wan2.2 | No | 77.3 |
| LingBot-VA | Yes | 92.2 |
| LingBot-VA from Wan2.2 | No | 80.6 |
| Fast-WAM | No | 91.8 |

Fast-WAM 接近 pretrained LingBot-VA，并明显高于没有 embodied pretraining 的 baselines。

LIBERO 结果：

| Method | Embodied Pretraining | Average Success |
|---|---:|---:|
| OpenVLA | Yes | 76.5 |
| π0 | Yes | 94.1 |
| π0.5 | Yes | 96.9 |
| LingBot-VA | Yes | 98.5 |
| Motus | Yes | 97.7 |
| Fast-WAM | No | 97.6 |

这个结果很强，因为 Fast-WAM 没有依赖 embodied pretraining，却接近使用 embodied pretraining 的 WAM/VLA baselines。

## Ablation Results

Ablation 是论文最核心的部分。

RoboTwin 上：

| Variant | Average Success |
|---|---:|
| Fast-WAM | 91.8 |
| Fast-WAM-Joint | 90.6 |
| Fast-WAM-IDM | 91.3 |
| Fast-WAM w/o video co-train | 83.8 |

LIBERO 上：

| Variant | Average Success |
|---|---:|
| Fast-WAM | 97.6 |
| Fast-WAM-Joint | 98.5 |
| Fast-WAM-IDM | 98.0 |
| Fast-WAM w/o video co-train | 93.5 |

结论很一致：

- Fast-WAM 接近显式做 future imagination 的 variants。
- 去掉 video co-training 会造成更大的下降。

这支持了论文主张：在这些 benchmarks 上，WAM 的主要收益更多来自训练时的 video modeling，而不是测试时的视频生成。

## Real-World Towel Folding

真实实验使用 **Galaxea R1 Lite** 平台和长程 towel-folding 任务。作者采集了 **60 小时** teleoperated demonstrations，并训练模型 **30k steps**。

论文同时报告 success rate 和 completion time。这很重要，因为一个 policy 即使最终成功，如果依赖反复修正，也不一定适合部署。

关键发现是：

- pretrained π0.5 仍然是真实任务里最强的 baseline；
- 带 video co-training 的 Fast-WAM variants 明显优于没有 pretraining 的 π0.5；
- Fast-WAM without video co-training 下降到 **10%** success；
- Fast-WAM latency 是 **190 ms**；
- Fast-WAM-Joint 约 **580 ms**；
- Fast-WAM-IDM 约 **810 ms**。

因此，在 Fast-WAM family 里，Fast-WAM 是更适合部署的折中点：性能强，同时推理延迟低得多。

## What This Means

Fast-WAM 改变了我对 WAM 的理解。

一个朴素观点是：

```text
模型强，是因为测试时想象了未来视频
```

Fast-WAM 的观点是：

```text
模型强，是因为 video prediction 在训练时塑造了更好的 latent world representations
```

这个区别很重要。如果收益主要来自训练，我们就可以保留 video modeling 的 representation advantage，同时避免部署时缓慢的未来视频生成。

这也解释了为什么 Fast-WAM 像是 VLA policies 和 WAMs 之间的一座桥：

- 测试时，它像 direct action policy。
- 训练时，它接受 world-model supervision。

## Strengths

论文最强的地方包括：

- 它问了一个精确的设计问题，而不只是提出更大的模型。
- Controlled variants 把 training-time video co-training 和 inference-time future imagination 拆开了。
- 方法认真考虑了 real-time deployment。
- 官方代码和 checkpoints 已经发布。
- 结果对未来 WAM 设计很有启发：video objective 可以作为 auxiliary training signal 保留，而不必绑定缓慢的 test-time video synthesis。

## Limitations

仍然有一些开放问题。

第一，论文评测的是特定 scale 和 backbone：Wan2.2-5B 加 1B action expert。随着更大的 video backbone、更大的 embodied datasets 或不同 action decoder 出现，这个结论可能继续演化。

第二，Fast-WAM 仍然使用 diffusion-style action denoising。它比 imagine-then-execute WAM 快很多，但 **190 ms** 对高频 contact-rich control 来说仍然是有感的延迟。

第三，真实实验是单一 robot platform 上的 towel folding。这个任务有价值，但如果能覆盖更多 rigid、articulated、deformable 和 contact-rich manipulation，结论会更稳。

最后，跳过未来视频生成提升了速度，但也少了一个可解释的 visual rollout。这个 rollout 对 debugging、planning 或 human inspection 可能仍然有用。

## Takeaways

Fast-WAM 的 takeaway 很简洁：

**对 WAM 来说，future video prediction 可能更适合作为训练目标，而不是测试时必须执行的过程。**

这是一个很实用的结果。它指出了一条 robot policy 设计路径：

- 保留 video world models 的 representation benefit；
- 保持 direct action policies 的低延迟接口；
- 用 controlled ablations 说明性能到底来自哪里。

对机器人来说，这是一个好折中：用 video 学到更好的 world representations，然后行动时不必等模型做梦。

</div>
