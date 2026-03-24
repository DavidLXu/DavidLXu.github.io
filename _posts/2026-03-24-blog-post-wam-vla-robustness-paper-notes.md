---
title: "[Paper Notes] Do World Action Models Generalize Better than VLAs? A Robustness Study"
date: 2026-03-24
permalink: /posts/2026/03/wam-vla-robustness-paper-notes/
tags:
  - Robotics
  - World Models
  - Vision-Language-Action
  - Robustness
  - Benchmarking
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

- **WAMs are strongest on visual perturbations.** LingBot-VA reaches **74.2%** on RoboTwin 2.0-Plus, and Cosmos-Policy reaches **82.2%** on LIBERO-Plus.
- **But WAMs do not universally dominate.** On LIBERO-Plus, **pi0.5** reaches **85.7%**, beating the best WAM overall.
- The likely advantage of WAMs is that **video pretraining gives them stronger spatiotemporal priors**, so downstream policy training does not need to learn dynamics from scratch as aggressively.
- The biggest practical downside is **speed**: the evaluated WAMs are about **4.8x to 83.0x slower** than pi0.5 per action chunk.

## Paper Info

- **Title**: Do World Action Models Generalize Better than VLAs? A Robustness Study
- **Authors**: Zhanguang Zhang, Zhiyuan Li, Behnam Rahmati, Rui Heng Yang, Yintao Ma, Amir Rasouli, Sajjad Pakdamansavoji, Yangzheng Wu, Lingfeng Zhang, Tongtong Cao, Feng Wen, Xingyue Quan, Yingxue Zhang
- **Affiliation**: Huawei Technologies; University of Toronto
- **Date**: 2026-03-23
- **Venue**: arXiv preprint
- **arXiv**: [2603.22078](https://arxiv.org/abs/2603.22078)

## 1. Question and Setup

The paper asks a simple but important question: **do world action models (WAMs) actually generalize more robustly than vision-language-action models (VLAs)?**

To test this, the authors evaluate open-source or publicly released policies on two perturbation-heavy benchmarks:

- **LIBERO-Plus**: single-arm Franka manipulation
- **RoboTwin 2.0-Plus**: a new dual-arm benchmark built on RoboTwin 2.0

Both benchmarks perturb the policy along seven axes:

- **Camera**
- **Robot initial state**
- **Language**
- **Light**
- **Background**
- **Noise**
- **Layout**

The model pool spans three families:

- **VLAs**: pi0, pi0.5, OpenVLA-OFT, X-VLA, UniVLA, RIPT-VLA
- **Hybrid approaches**: MOTUS, VLA-JEPA
- **WAMs**: GE-Act, Cosmos-Policy, LingBot-VA

One caveat matters: **DreamZero** is discussed in the taxonomy, but excluded from quantitative evaluation because of dataset mismatch and very high training/inference cost.

## 2. What distinguishes WAMs from VLAs?

The paper frames the difference cleanly:

- **VLA**: predict the next action directly from the current history, `p_theta(a_t | h_t)`
- **WAM**: jointly predict future state and action, `p_phi(h_{t+1}, a_t | h_t)`, or first predict future state and then generate action, `p_phi(h_{t+1} | h_t) * g_psi(a_t | h_t, h_{t+1})`

So the main distinction is not just "language model backbone" versus "video model backbone". It is also:

- **direct action prediction** versus
- **future-state-aware action generation**

Because WAM backbones are pretrained for video generation, the authors argue they inherit stronger **spatiotemporal priors** from web-scale video pretraining.

## 3. Main Results

### Overall outcome

| Benchmark | Best WAM | Total | Best overall model | Total | Main read |
|---|---:|---:|---|---:|---|
| **RoboTwin 2.0-Plus** | LingBot-VA | **74.2** | LingBot-VA | **74.2** | WAMs lead clearly on this dual-arm robustness benchmark |
| **LIBERO-Plus** | Cosmos-Policy | **82.2** | pi0.5 | **85.7** | A strong VLA beats the best WAM overall |

This is why I would read the paper's title question as **"often yes, but not always."**

### Where WAMs look strongest

- On **RoboTwin 2.0-Plus**, LingBot-VA is especially strong under **light (89.0)**, **background (91.3)**, **noise (80.9)**, and **layout (87.9)** perturbations.
- On **LIBERO-Plus**, Cosmos-Policy and GE-Act also show strong robustness under **light**, **noise**, and **layout** perturbations.
- Hybrid methods such as **MOTUS** and **VLA-JEPA** also improve robustness, which suggests that even partial integration of video/dynamics learning helps.

### Where WAMs still struggle

- **Camera viewpoint changes** remain hard. On RoboTwin 2.0-Plus, LingBot-VA drops to **28.9** under camera perturbation.
- **Robot initial-state perturbations** are another weak spot. LingBot-VA gets **36.2** on RoboTwin, and Cosmos-Policy trails pi0.5 on LIBERO-Plus robot perturbations (**63.3** vs **77.5**).

So the current evidence says: **WAMs are especially good at visual robustness, but not automatically better under geometry or embodiment shifts.**

## 4. Why WAMs help

The paper's explanation is intuitive:

- video backbones are pretrained on **temporally rich internet-scale videos**
- that pretraining teaches **fine-grained visual dynamics**
- downstream policy training can therefore focus more on **action generation**, instead of learning dynamics from scratch

Table 2 is one of the most interesting parts of the paper. It highlights how different the training pipelines are:

- **Cosmos-Policy** uses only **185 task trajectories** for task-specific finetuning
- **pi0.5** relies on a much broader recipe: robot data, web captioning/VQA/grounding data, high-level planning data, and post-training stages

My read: the paper supports a **training-efficiency** story more strongly than a pure **architecture-only** story. WAMs seem to buy robustness more cheaply, while strong VLAs can catch up or even surpass them when backed by a richer data pipeline.

## 5. Runtime and Practical Limits

The paper is also very clear about the main downside: **WAM inference is slow**.

| Model | Inference time per chunk |
|---|---:|
| pi0.5 | 63 ms |
| X-VLA | 195 ms |
| GE-Act | 300 ms |
| Cosmos-Policy | 390 ms |
| LingBot-VA (real-world setting) | 480 ms |
| MOTUS | 1175 ms |
| LingBot-VA (RoboTwin setting) | 5230 ms |

The authors attribute much of this gap to the **state denoising process** inside WAMs. Even the faster WAMs in this study are at least **4.8x slower** than pi0.5.

Other limitations worth keeping in mind:

- **RoboTwin 2.0-Plus** is an in-house benchmark, so external replication will take time
- **DreamZero** is not included in the quantitative benchmark comparison
- the compared methods do **not** use matched data pipelines, so this is not a perfectly controlled apples-to-apples study

## 6. Takeaways

1. **This paper supports "WAMs are a strong robustness prior" more than "WAMs always generalize better than VLAs."**
2. **WAMs look especially attractive for visual perturbations** such as light, noise, and cluttered layouts.
3. **Strong VLAs can still win overall** when they are trained with sufficiently rich and diverse data, as pi0.5 shows on LIBERO-Plus.
4. **Hybrid methods matter** because they show that importing temporal/video structure into VLA pipelines already helps a lot.
5. **Inference efficiency is the biggest deployment bottleneck** for WAMs today.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

- **WAMs 在视觉扰动上最有优势。** LingBot-VA 在 RoboTwin 2.0-Plus 上达到 **74.2%**，Cosmos-Policy 在 LIBERO-Plus 上达到 **82.2%**。
- **但 WAMs 并不是在所有场景都占优。** 在 LIBERO-Plus 上，**pi0.5** 取得 **85.7%**，总体上超过了最强 WAM。
- WAMs 的核心优势很可能在于：**视频预训练给了它们更强的时空先验**，因此下游策略训练不必像 VLA 那样更激进地从零学习世界动力学。
- 最大的现实代价是 **推理速度**：论文中评估的 WAM 每个 action chunk 大约比 pi0.5 **慢 4.8 倍到 83.0 倍**。

## 论文信息

- **标题**: Do World Action Models Generalize Better than VLAs? A Robustness Study
- **作者**: Zhanguang Zhang, Zhiyuan Li, Behnam Rahmati, Rui Heng Yang, Yintao Ma, Amir Rasouli, Sajjad Pakdamansavoji, Yangzheng Wu, Lingfeng Zhang, Tongtong Cao, Feng Wen, Xingyue Quan, Yingxue Zhang
- **机构**: Huawei Technologies；University of Toronto
- **日期**: 2026-03-23
- **发表形式**: arXiv preprint
- **arXiv**: [2603.22078](https://arxiv.org/abs/2603.22078)

## 1. 论文问题与实验设置

这篇论文在问一个很直接但很关键的问题：**世界动作模型（WAMs）是否真的比视觉-语言-动作模型（VLAs）更鲁棒、更会泛化？**

作者在两个高扰动基准上评测公开模型：

- **LIBERO-Plus**：单臂 Franka 操作任务
- **RoboTwin 2.0-Plus**：作者基于 RoboTwin 2.0 构建的双臂新基准

两个基准都沿着七个维度对策略进行扰动：

- **相机**
- **机器人初始状态**
- **语言**
- **光照**
- **背景**
- **噪声**
- **布局**

模型大致分为三类：

- **VLAs**: pi0, pi0.5, OpenVLA-OFT, X-VLA, UniVLA, RIPT-VLA
- **混合方法**: MOTUS, VLA-JEPA
- **WAMs**: GE-Act, Cosmos-Policy, LingBot-VA

有一个重要限制需要注意：**DreamZero** 虽然出现在 WAM 分类表里，但由于数据集不匹配以及训练/推理成本很高，被排除在定量评测之外。

## 2. WAM 和 VLA 的区别到底是什么？

论文把两者的区别总结得很清楚：

- **VLA**: 直接根据当前历史预测动作，`p_theta(a_t | h_t)`
- **WAM**: 联合预测未来状态和动作，`p_phi(h_{t+1}, a_t | h_t)`，或者先预测未来状态再生成动作，`p_phi(h_{t+1} | h_t) * g_psi(a_t | h_t, h_{t+1})`

所以它们的区别不只是“语言模型骨干”和“视频模型骨干”的差异，更是**直接动作预测**与**基于未来状态的动作生成**之间的差异。

由于 WAM 的骨干是视频生成模型，作者认为它们从大规模网络视频预训练中继承了更强的**时空先验**。

## 3. 主要结果

### 整体结论

| 基准 | 最强 WAM | 总分 | 全表最强模型 | 总分 | 结论 |
|---|---:|---:|---|---:|---|
| **RoboTwin 2.0-Plus** | LingBot-VA | **74.2** | LingBot-VA | **74.2** | 在这个双臂鲁棒性基准上，WAM 明显领先 |
| **LIBERO-Plus** | Cosmos-Policy | **82.2** | pi0.5 | **85.7** | 强 VLA 在总分上超过了最强 WAM |

因此，我会把论文标题里的问题理解成：**很多时候是，但不是永远如此。**

### WAM 最强的地方

- 在 **RoboTwin 2.0-Plus** 上，LingBot-VA 在 **光照 (89.0)**、**背景 (91.3)**、**噪声 (80.9)**、**布局 (87.9)** 扰动下表现尤其强。
- 在 **LIBERO-Plus** 上，Cosmos-Policy 和 GE-Act 在 **光照**、**噪声**、**布局** 等视觉扰动上也表现很稳。
- **MOTUS** 和 **VLA-JEPA** 这样的混合方法同样带来了鲁棒性提升，这说明即便只是部分引入视频/动力学学习，也会有明显帮助。

### WAM 仍然较弱的地方

- **相机视角变化**仍然很难。在 RoboTwin 2.0-Plus 上，LingBot-VA 在相机扰动下掉到 **28.9**。
- **机器人初始状态扰动**也是弱项。LingBot-VA 在 RoboTwin 上只有 **36.2**，而 Cosmos-Policy 在 LIBERO-Plus 的机器人状态扰动上也明显落后于 pi0.5（**63.3** 对 **77.5**）。

所以当前证据更像是在说：**WAM 在视觉鲁棒性上特别强，但在几何变化或具身变化下并不会自动更好。**

## 4. 为什么 WAM 会更强？

论文给出的解释很直观：

- 视频骨干在**时间连续的大规模互联网视频**上预训练
- 这种预训练让模型学到了**细粒度视觉动态**
- 因此下游策略训练可以更专注于**动作生成**，而不是从零开始学习动力学

论文里的 Table 2 是我觉得最有意思的部分之一，因为它清楚展示了不同方法的训练配方差异：

- **Cosmos-Policy** 的任务级微调只用了 **185 条任务轨迹**
- **pi0.5** 则依赖更复杂的数据组合：机器人数据、web captioning / VQA / grounding 数据、高层规划数据，以及后训练阶段

我的理解是：这篇论文更强地支持一种**训练效率优势**，而不完全是纯粹的**架构绝对优势**。也就是说，WAM 似乎能更“便宜”地换来鲁棒性；而如果给 VLA 足够丰富的数据和训练配方，它也能追上甚至超过 WAM。

## 5. 推理代价与现实限制

论文也非常坦率地指出了最大缺点：**WAM 推理很慢**。

| 模型 | 每个 chunk 的推理时间 |
|---|---:|
| pi0.5 | 63 ms |
| X-VLA | 195 ms |
| GE-Act | 300 ms |
| Cosmos-Policy | 390 ms |
| LingBot-VA（真实机器人配置） | 480 ms |
| MOTUS | 1175 ms |
| LingBot-VA（RoboTwin 配置） | 5230 ms |

作者认为，这个速度差距很大程度上来自 WAM 内部的**状态去噪过程**。即使是这篇论文里较快的 WAM，也至少比 pi0.5 **慢 4.8 倍**。

另外还有几个现实限制需要注意：

- **RoboTwin 2.0-Plus** 是作者自建基准，外部复现还需要时间
- **DreamZero** 没有被纳入定量基准比较
- 各方法使用的训练数据并不一致，因此这并不是一个完全严格的同条件对比

## 6. 我的结论

1. **这篇论文更支持“WAM 是很强的鲁棒性先验”，而不是“WAM 一定比 VLA 更会泛化”。**
2. **在光照、噪声、杂乱布局这类视觉扰动上，WAM 确实很有吸引力。**
3. **只要训练数据足够丰富且足够多样，强 VLA 仍然可能在总体上取胜**，pi0.5 在 LIBERO-Plus 上就是例子。
4. **混合方法非常重要**，因为它们说明把时序/视频结构引入 VLA 管线，本身就能带来明显收益。
5. **推理效率是 WAM 走向真实部署的最大瓶颈。**

</div>
