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

**Fast-WAM** asks whether World Action Models need to generate future videos at test time. Its answer is practical: keep WAM-style video supervision during training, then run as a direct action policy at inference. The model uses a pretrained video DiT to form latent world representations from the current observation and language, and predicts action chunks without the expensive imagine-then-execute stage.

The main empirical message is that training-time video co-training matters more than test-time future imagination. Fast-WAM reaches **91.8%** average success on RoboTwin 2.0 and **97.6%** on LIBERO without embodied pretraining, while running at **190 ms** latency on a single RTX 5090D V2 GPU. Variants that still generate future videos are close in success but much slower; removing video co-training causes a larger accuracy drop.

## Paper Info

The paper is **"Fast-WAM: Do World Action Models Need Test-time Future Imagination?"** by **Tianyuan Yuan, Zibin Dong, Yicheng Liu, and Hang Zhao** from **IIIS, Tsinghua University** and **Galaxea AI**. It is available as [arXiv:2603.16666](https://arxiv.org/abs/2603.16666), with a project page at [yuantianyuan01.github.io/FastWAM](https://yuantianyuan01.github.io/FastWAM/) and code at [yuantianyuan01/FastWAM](https://github.com/yuantianyuan01/FastWAM). The authors also release checkpoints and preprocessed LIBERO/RoboTwin datasets on Hugging Face.

## Core Argument

Many WAMs follow an intuitive pipeline: observe the scene and language command, imagine future visual states, then predict actions conditioned on that imagined rollout. The intuition is attractive, but video diffusion is slow, and a robot policy ultimately needs low-latency closed-loop control.

Fast-WAM separates two roles that are often bundled together. Future video prediction can be a training objective that shapes the representation; future video generation can also be a test-time procedure used before action prediction. The paper's controlled comparison shows that the first role carries most of the benefit on its benchmarks. In other words, video modeling is most useful as supervision for learning latent world structure, while inference can stay direct:

```text
current observation + language
  -> latent world representation
  -> action chunk
```

This makes Fast-WAM look like a bridge between VLA policies and WAMs. At deployment time, it behaves like a direct action policy. During training, it still receives world-model supervision from future video latents.

## Method

Fast-WAM is built on **Wan2.2-5B**, reusing the video Diffusion Transformer, pretrained T5 text encoder, and video VAE. On top of this video backbone, the authors add a **1B action expert DiT**, giving the full model roughly **6B parameters**. The model groups tokens into clean current-frame latents, noisy future-video latents used for training, and action tokens used for action chunk generation.

The most important implementation detail is the structured attention mask. During training, video tokens learn to predict future latent frames, and action tokens learn to predict actions from the clean current observation. Action tokens cannot attend to future video tokens, which prevents future-frame leakage and keeps the ablation fair: the action branch can benefit from a video-shaped backbone, but it cannot directly see ground-truth future frames. At inference, the future-video branch is removed; the current observation goes through the video backbone once, and the action expert denoises the action chunk.

The training objective is a joint flow-matching loss over action chunks and future video latents:

```text
L_act = L_FM(action chunk)
L_vid = L_FM(future video latents)
L = L_act + lambda * L_vid
```

Reported implementation details include a hidden dimension of **1024** for the action expert, action horizon **32**, future video horizon **9 frames** after 4x temporal downsampling, multi-camera image concatenation before VAE encoding, **10** action denoising steps at inference, AdamW with learning rate **1e-4**, mixed precision training, and gradient clipping. The official repository mirrors this structure through `src/fastwam/`, model and data configs for LIBERO/RoboTwin, evaluation managers under `experiments/`, `scripts/train.py`, DeepSpeed launch scripts, checkpoint evaluation instructions, ActionDiT preprocessing, and T5 embedding precomputation.

## Controlled Variants

The paper tests the core claim by comparing variants that change whether video is used during training and whether future generation is used during inference:

| Variant | Training Video Co-Training | Test-Time Future Generation | Meaning |
|---|---:|---:|---|
| Fast-WAM | Yes | No | Main method |
| Fast-WAM-Joint | Yes | Yes | Joint video/action denoising |
| Fast-WAM-IDM | Yes | Yes | Generate future video, then predict action |
| Fast-WAM w/o video co-train | No | No | Tests whether video co-training matters |

This design isolates the real question: does performance come from learning with video, or from explicitly imagining video during deployment?

## Simulation Results

Fast-WAM is evaluated on **RoboTwin 2.0** and **LIBERO**. On RoboTwin, it is close to pretrained LingBot-VA and clearly above non-pretrained baselines:

| Method | Embodied Pretraining | Average Success |
|---|---:|---:|
| π0 | Yes | 62.2 |
| π0.5 | Yes | 79.8 |
| Motus | Yes | 87.8 |
| Motus from Wan2.2 | No | 77.3 |
| LingBot-VA | Yes | 92.2 |
| LingBot-VA from Wan2.2 | No | 80.6 |
| Fast-WAM | No | 91.8 |

On LIBERO, Fast-WAM remains competitive with strong WAM/VLA baselines even though it does not rely on embodied pretraining:

| Method | Embodied Pretraining | Average Success |
|---|---:|---:|
| OpenVLA | Yes | 76.5 |
| π0 | Yes | 94.1 |
| π0.5 | Yes | 96.9 |
| LingBot-VA | Yes | 98.5 |
| Motus | Yes | 97.7 |
| Fast-WAM | No | 97.6 |

The ablations are the heart of the paper. Fast-WAM stays close to variants that perform explicit future imagination, while removing video co-training causes a much larger drop:

| Variant | RoboTwin Average Success | LIBERO Average Success |
|---|---:|---:|
| Fast-WAM | 91.8 | 97.6 |
| Fast-WAM-Joint | 90.6 | 98.5 |
| Fast-WAM-IDM | 91.3 | 98.0 |
| Fast-WAM w/o video co-train | 83.8 | 93.5 |

## Real-World Towel Folding

The real-world experiment uses a **Galaxea R1 Lite** platform on a long-horizon towel-folding task. The authors collect **60 hours** of teleoperated demonstrations and train for **30k steps**. The result is useful because it measures both success and completion time: a policy that eventually succeeds after repeated corrections may still be weak for deployment.

The real-world pattern matches the simulation story. Pretrained π0.5 remains the strongest baseline, but Fast-WAM variants with video co-training substantially outperform π0.5 without pretraining, and Fast-WAM without video co-training drops to **10%** success. The latency comparison is also decisive: Fast-WAM runs at **190 ms**, compared with about **580 ms** for Fast-WAM-Joint and **810 ms** for Fast-WAM-IDM. Within this model family, direct Fast-WAM gives the best deployment tradeoff: strong success with far lower inference latency.

## Strengths and Limitations

The strongest part of the paper is the clean experimental question. Instead of making model scale the main story, it asks where the benefit of WAMs actually comes from and answers with controlled variants. The released code, checkpoints, and preprocessing/evaluation instructions also make the result easier to inspect and reuse.

There are still important boundaries. The conclusion is tested at a specific scale, with Wan2.2-5B plus a 1B action expert; larger video backbones, larger embodied datasets, or different action decoders may shift the tradeoff. Fast-WAM also still uses diffusion-style action denoising, so **190 ms** is fast for a WAM comparison but still meaningful for high-frequency contact-rich control. The real-world evaluation focuses on towel folding on one robot platform, leaving open how well the conclusion transfers across rigid, articulated, deformable, and more contact-heavy manipulation. Finally, skipping future video generation removes an interpretable visual rollout that could help debugging, planning, or human inspection.

## Takeaway

Fast-WAM's takeaway is concise: **for WAMs, future video prediction may be more valuable as a training objective than as a test-time procedure.** This gives robot learning a useful design path: use video world modeling to learn better representations, keep action inference direct, and reserve explicit future imagination for cases where its interpretability or planning value justifies the latency.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**Fast-WAM** 问的是 World Action Models 是否必须在测试时生成未来视频。它给出的答案很实用：训练时保留 WAM-style video supervision，推理时作为 direct action policy 运行。模型用 pretrained video DiT 从当前 observation 和语言指令中形成 latent world representations，然后直接预测 action chunks，省掉昂贵的 imagine-then-execute 阶段。

论文最核心的经验结论是：training-time video co-training 比 test-time future imagination 更重要。Fast-WAM 在没有 embodied pretraining 的情况下，在 RoboTwin 2.0 上达到 **91.8%** 平均成功率，在 LIBERO 上达到 **97.6%**，并且在单张 RTX 5090D V2 GPU 上延迟为 **190 ms**。仍然生成未来视频的 variants 成功率接近，但慢得多；去掉 video co-training 会带来更明显的性能下降。

## Paper Info

论文标题是 **"Fast-WAM: Do World Action Models Need Test-time Future Imagination?"**，作者是 **Tianyuan Yuan, Zibin Dong, Yicheng Liu, and Hang Zhao**，来自 **IIIS, Tsinghua University** 和 **Galaxea AI**。论文地址是 [arXiv:2603.16666](https://arxiv.org/abs/2603.16666)，项目页是 [yuantianyuan01.github.io/FastWAM](https://yuantianyuan01.github.io/FastWAM/)，代码仓库是 [yuantianyuan01/FastWAM](https://github.com/yuantianyuan01/FastWAM)。作者也在 Hugging Face 上发布了 checkpoints 和预处理后的 LIBERO/RoboTwin datasets。

## 核心论点

很多 WAM 采用一种直观流程：观察当前场景和语言指令，想象未来视觉状态，再基于这个 imagined rollout 预测动作。这个直觉很有吸引力，但 video diffusion 推理慢，而机器人 policy 最终需要低延迟闭环控制。

Fast-WAM 把两个常被绑定在一起的角色拆开。Future video prediction 可以作为训练目标，用来塑造 representation；future video generation 也可以作为测试时动作预测之前的显式过程。论文的 controlled comparison 显示，在它的 benchmarks 上，前者贡献了主要收益。换句话说，video modeling 最有价值的用法是为 latent world structure 提供监督，而推理可以保持直接：

```text
current observation + language
  -> latent world representation
  -> action chunk
```

这让 Fast-WAM 像是 VLA policies 和 WAMs 之间的桥。部署时，它像 direct action policy；训练时，它仍然接受来自 future video latents 的 world-model supervision。

## Method

Fast-WAM 基于 **Wan2.2-5B** 构建，复用了 video Diffusion Transformer、pretrained T5 text encoder 和 video VAE。在这个 video backbone 之上，作者加入一个 **1B action expert DiT**，整体模型约 **6B parameters**。模型把 tokens 分成当前帧 clean latents、训练时使用的 noisy future-video latents，以及用于 action chunk generation 的 action tokens。

最关键的实现细节是 structured attention mask。训练时，video tokens 学习预测未来 latent frames，action tokens 从 clean current observation 学习预测动作。Action tokens 不能 attend 到 future video tokens，因此避免了 future-frame leakage，也让 ablation 更公平：action branch 可以受益于被 video objective 塑造过的 backbone，但不能直接看到 ground-truth future frames。推理时，future-video branch 被移除；当前 observation 只经过一次 video backbone，然后 action expert denoise 出 action chunk。

训练目标是 action chunks 和 future video latents 上的 joint flow-matching loss：

```text
L_act = L_FM(action chunk)
L_vid = L_FM(future video latents)
L = L_act + lambda * L_vid
```

论文报告的实现配置包括：action expert hidden dimension **1024**、action horizon **32**、经过 4x temporal downsampling 后的 future video horizon **9 frames**、VAE encoding 前拼接多相机图像、推理时 **10** 个 action denoising steps、AdamW with learning rate **1e-4**、mixed precision training 和 gradient clipping。官方仓库也对应提供了 `src/fastwam/`、LIBERO/RoboTwin 的 model/data configs、`experiments/` 下的 evaluation managers、`scripts/train.py`、DeepSpeed 启动脚本、checkpoint evaluation 说明、ActionDiT preprocessing 和 T5 embedding precomputation 流程。

## Controlled Variants

论文通过一组 variants 检验核心观点：哪些方法在训练时使用 video，哪些方法在推理时生成未来视频。

| Variant | Training Video Co-Training | Test-Time Future Generation | Meaning |
|---|---:|---:|---|
| Fast-WAM | Yes | No | 主方法 |
| Fast-WAM-Joint | Yes | Yes | Joint video/action denoising |
| Fast-WAM-IDM | Yes | Yes | 先生成 future video，再预测 action |
| Fast-WAM w/o video co-train | No | No | 测试 video co-training 的作用 |

这个设计隔离了真正的问题：性能主要来自用视频训练，还是来自部署时显式想象视频。

## Simulation Results

Fast-WAM 在 **RoboTwin 2.0** 和 **LIBERO** 上评测。RoboTwin 上，它接近 pretrained LingBot-VA，并明显高于没有 embodied pretraining 的 baselines：

| Method | Embodied Pretraining | Average Success |
|---|---:|---:|
| π0 | Yes | 62.2 |
| π0.5 | Yes | 79.8 |
| Motus | Yes | 87.8 |
| Motus from Wan2.2 | No | 77.3 |
| LingBot-VA | Yes | 92.2 |
| LingBot-VA from Wan2.2 | No | 80.6 |
| Fast-WAM | No | 91.8 |

LIBERO 上，Fast-WAM 没有依赖 embodied pretraining，却仍然接近强 WAM/VLA baselines：

| Method | Embodied Pretraining | Average Success |
|---|---:|---:|
| OpenVLA | Yes | 76.5 |
| π0 | Yes | 94.1 |
| π0.5 | Yes | 96.9 |
| LingBot-VA | Yes | 98.5 |
| Motus | Yes | 97.7 |
| Fast-WAM | No | 97.6 |

Ablation 是论文的核心。Fast-WAM 与显式进行 future imagination 的 variants 成功率接近，而去掉 video co-training 会造成更大的下降：

| Variant | RoboTwin Average Success | LIBERO Average Success |
|---|---:|---:|
| Fast-WAM | 91.8 | 97.6 |
| Fast-WAM-Joint | 90.6 | 98.5 |
| Fast-WAM-IDM | 91.3 | 98.0 |
| Fast-WAM w/o video co-train | 83.8 | 93.5 |

## Real-World Towel Folding

真实实验使用 **Galaxea R1 Lite** 平台和长程 towel-folding 任务。作者采集 **60 小时** teleoperated demonstrations，并训练 **30k steps**。这个实验有价值，因为它同时看 success 和 completion time：一个 policy 即使最终成功，如果依赖反复修正，也未必适合部署。

真实任务里的模式与仿真一致。Pretrained π0.5 仍然是最强 baseline，但带 video co-training 的 Fast-WAM variants 明显超过没有 pretraining 的 π0.5，而 Fast-WAM without video co-training 下降到 **10%** success。延迟对比也很清楚：Fast-WAM 是 **190 ms**，Fast-WAM-Joint 约 **580 ms**，Fast-WAM-IDM 约 **810 ms**。在这个 model family 里，direct Fast-WAM 给出了最适合部署的折中：成功率强，同时推理延迟低得多。

## 优点与局限

论文最强的地方是问题问得干净。它把叙事重点从模型规模转向 WAM 收益来源，并用 controlled variants 回答。开源代码、checkpoints、preprocessing 和 evaluation 说明也让结果更容易检查和复用。

边界也很明确。这个结论是在特定 scale 上验证的：Wan2.2-5B 加 1B action expert；更大的 video backbone、更大的 embodied datasets 或不同 action decoder 可能改变 tradeoff。Fast-WAM 仍然使用 diffusion-style action denoising，所以 **190 ms** 在 WAM 对比里很快，但对高频 contact-rich control 仍然是有感延迟。真实实验集中在单一 robot platform 的 towel folding 上，跨 rigid、articulated、deformable 和更强接触任务的泛化还需要更多验证。最后，跳过未来视频生成会少掉一个可解释的 visual rollout，而这个 rollout 对 debugging、planning 或 human inspection 可能仍然有价值。

## Takeaway

Fast-WAM 的 takeaway 很简洁：**对 WAM 来说，future video prediction 可能更适合作为训练目标，而不是测试时必须执行的过程。** 这给 robot learning 提供了一条有用设计路径：用 video world modeling 学到更好的 representations，让 action inference 保持直接，并把显式 future imagination 留给那些确实需要可解释性或 planning 价值、且能接受额外延迟的场景。

</div>
