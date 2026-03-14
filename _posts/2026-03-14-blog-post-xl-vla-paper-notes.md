---
title: "[Paper Notes] Cross-Hand Latent Representation for Vision-Language-Action Models"
date: 2026-03-14
permalink: /posts/2026/03/xl-vla-paper-notes/
tags:
  - Robotics
  - Dexterous Manipulation
  - Vision-Language-Action Models
  - Cross-Embodiment Learning
  - Latent Actions
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**XL-VLA** tackles a real bottleneck in dexterous robot learning: every new robot hand comes with a different joint space, so standard VLA models do not scale cleanly across embodiments.

The paper's solution is to learn a **shared latent action space** across multiple dexterous hands, then train a single VLA policy to predict **latent action chunks** instead of raw joint commands.

That simple abstraction works surprisingly well:

- cross-hand mean success improves from **0.32** with `pi0` to **0.72** with **XL-VLA**
- on G1 cross-robot evaluation, mean success improves from **0.525** to **0.825**
- the model also shows **zero-shot transfer** to unseen hand-task combinations

My short reading is that the paper's main contribution is not just a better dexterous policy. It is a useful systems argument that **for cross-embodiment dexterous manipulation, the action representation is the real bottleneck**.

## Paper Info

- **Title**: Cross-Hand Latent Representation for Vision-Language-Action Models
- **Authors**: Guangqi Jiang, Yutong Liang, Jianglong Ye, Jia-Yang Huang, Changwei Jing, Rocky Duan, Pieter Abbeel, Xiaolong Wang, Xueyan Zou
- **Affiliations**: UC San Diego, Amazon FAR, UC Berkeley
- **Project page**: [xl-vla.github.io](https://xl-vla.github.io)
- **Paper type**: dexterous manipulation / cross-embodiment learning / VLA

## 1. Problem Setting and Motivation

The paper starts from a clean observation: **language has a fairly stable vocabulary, but robot actions do not**.

This is especially painful for dexterous hands:

- different hands have different numbers of fingers
- different actuation structures
- different joint parameterizations
- new hardware keeps appearing quickly

That makes standard VLA training expensive and fragmented. Even if two hands should perform the same task, their raw action spaces are incompatible.

The paper asks two practical questions:

1. how can we define a unified action representation across a family of dexterous hands?
2. how can we integrate a new hand without retraining a full policy from scratch?

## 2. Core Idea

The central idea is to replace raw joint-space prediction with a **shared latent action space**.

For each hand `h`, the system learns:

- a hand-specific encoder `E_h`
- a hand-specific decoder `D_h`

These map between:

- the hand's own joint-space action chunk
- a common latent action vector

The VLA policy itself is then hand-agnostic:

- it takes vision, language, and previous latent action tokens
- predicts the next latent action chunk
- the hand-specific decoder turns that latent back into joint commands

This gives a very clean separation:

- the VLA backbone does not need to understand every hand's kinematics directly
- embodiment-specific details are pushed into encoders and decoders

## 3. Method Breakdown

### 3.1 Action chunks instead of single-step actions

The model operates on **action chunks** rather than single actions.

Each chunk is:

- `64` joint-position commands
- sampled at `20 Hz`
- corresponding to `3.2` seconds of motion

At time `t`, the policy receives:

- image observations
- language instruction
- short history of joint states
- previously executed action chunk

and predicts the next chunk.

This chunked setup is a reasonable fit for dexterous bimanual manipulation because many tasks require coordinated temporal structure, not just immediate motor responses.

### 3.2 Shared latent space via a multi-headed VAE-style autoencoder

The latent space is pretrained independently of the VLA backbone.

For each hand, the encoder produces a Gaussian posterior:

- mean `mu^(h)`
- variance `sigma^(h)`

and the decoder reconstructs that latent into the hand's own joint configuration.

The paper uses lightweight MLPs for these hand-specific encoders and decoders, but all of them share the same latent distribution.

### 3.3 Three losses define the latent space

The latent space is shaped by three constraints:

1. **Reconstruction loss `L1`**
2. **Retargeting loss `L2`**
3. **Latent KL regularization `L3`**

#### Reconstruction loss

This ensures each hand can autoencode its own joint configurations accurately.

#### Retargeting loss

This is the most interesting part. The paper uses differentiable forward kinematics to align fingertip geometry across hands.

Instead of matching raw joint angles across embodiments, it matches:

- pinch distances
- pinch directions

between corresponding fingers.

That is a good design choice because cross-hand equivalence is geometric and functional, not joint-wise.

#### Latent KL loss

The KL term encourages the shared latent space to follow a standard Gaussian prior, making it smoother and easier to interpolate.

### 3.4 Training without paired cross-hand demonstrations

One of the strongest details in the paper is that the latent autoencoder is trained **without paired cross-hand trajectories**.

Instead, the method:

- samples random joint configurations within each hand's limits
- encodes them into latent codes
- decodes those latents through all hand-specific decoders
- uses reconstruction and geometric retargeting losses to align the space

So the cross-hand alignment is effectively **self-supervised through kinematics**, not supervised through matched demonstrations.

That makes the approach much more scalable than collecting paired multi-hand teleoperation data just for latent alignment.

## 4. Experimental Setup

The authors collect a real-world teleoperation dataset with:

- **4 dexterous hands**: Ability, Inspire, X-Hand1, Paxini DexH13
- **10 tasks**
- **50 demonstrations per task per hand**
- **2000 demonstrations total**
- about **2M state-action pairs**

The tasks include:

- prepare fruits
- stack cans
- sort cans
- hand over bottle
- reorganize lemons
- pour sauce
- rearrange boxes
- push sugar
- pour sugar
- push cans

The hardware setup includes:

- a bimanual `xArm7` platform
- a `Unitree G1` humanoid

## 5. Main Results

### 5.1 Cross-hand VLA training

The core comparison is against `pi0`, trained under the same multi-hand multi-task setting.

Mean success across all tasks and hands:

- **pi0**: `0.32`
- **XL-VLA**: `0.72`

Per-hand means:

- **Ability**: `0.37 -> 0.73`
- **Inspire**: `0.27 -> 0.68`
- **Paxini**: `0.35 -> 0.78`
- **XHand**: `0.29 -> 0.70`

Those are large gains, especially because dexterous hands differ much more than ordinary grippers.

Task-wise, XL-VLA improves the mean success rate on every listed task category in Table 2, with especially large gains on:

- **Hand over Bottle**
- **Sort Cans**
- **Re-arrange Boxes**
- **Pour Sugar**

The broader point is clear: once the action representation is aligned, a single VLA backbone becomes much more reusable across embodiments.

### 5.2 Cross-robot scaling to G1

The paper also tests whether the latent action space helps when mixing data from:

- tabletop `xArm`
- humanoid `G1`

On four tasks, the reported G1 mean success improves from:

- **pi0**: `0.525`
- **XL-VLA**: `0.825`

This is a **57%** relative improvement according to the paper.

That result matters because it suggests the latent space is not just smoothing over minor hand differences. It is helping across broader robot-system variation as well.

### 5.3 Zero-shot unseen-task transfer

The paper also evaluates **zero-shot unseen-task generalization**.

For each hand, some tasks are held out during training. The trained policy is then tested directly on those unseen hand-task combinations using the corresponding decoder.

The comparison baseline is `pi0 + RT`:

- train a policy on XHand
- retarget predicted trajectories to the other hands using kinematic retargeting

The reported result is qualitatively strong:

- XL-VLA consistently outperforms the retargeting baseline
- it never underperforms that baseline on any hand or task
- gains are especially clear on fine-grained dexterous tasks

This is exactly where a latent action space should help: it transfers functional control patterns, not only fingertip geometry after the fact.

## 6. Ablation Results

### 6.1 Latent replay vs LAD

The paper compares its latent space with **LAD**, a supervised latent retargeting method.

Replay mean success:

- **LAD** on Ability+Inspire: `0.60`
- **XL-VLA** on Ability+Inspire: `0.82`
- **LAD** on Paxini+XHand: `0.61`
- **XL-VLA** on Paxini+XHand: `0.81`

This is a strong result because XL-VLA's latent alignment is **unsupervised**, yet it still outperforms the supervised alternative.

### 6.2 Loss design matters

The loss ablations show a clean pattern:

- removing `L1` destroys reconstruction
- removing the distance part of `L2` hurts cross-hand distance preservation
- removing the direction part of `L2` hurts cross-hand directional consistency
- removing `L2` entirely causes the largest cross-embodiment degradation

That supports the paper's modeling decision: **a shared latent action space only works if it is explicitly shaped by cross-hand geometry**.

### 6.3 Latent size should not be too large

The architecture and latent-dimension ablations suggest that very large latent spaces are actually counterproductive.

My read is that this makes sense: once the latent becomes too expressive, it can start storing embodiment-specific shortcuts instead of discovering a compact shared action manifold.

## 7. Why This Paper Is Interesting

I think the paper contributes three useful ideas.

### 7.1 It identifies the right bottleneck

A lot of cross-embodiment work focuses on better policies, better visual backbones, or better retargeting pipelines. This paper argues that for dexterous VLA, the real bottleneck is often the **action representation itself**.

### 7.2 It keeps the VLA architecture mostly standard

XL-VLA does not require a radically new VLA design. It plugs a latent action interface into an existing backbone (`pi0`), which makes the proposal easier to adopt.

### 7.3 It is grounded in real hardware

The paper emphasizes real-world dexterous hands rather than only simulation. That matters because cross-embodiment dexterous transfer is easy to overclaim in simulation and much harder to validate on real hardware.

## 8. Limitations

The paper is strong, but a few limits are worth keeping in mind.

- The experiments are still within a relatively small family of dexterous hands rather than a truly open-ended hardware zoo.
- The latent space is based on hand-specific encoders and decoders, so adding a brand-new hand still requires building that interface.
- The zero-shot transfer results are compelling, but most are presented as plots rather than full numeric tables.
- The approach aligns fingertip geometry well, but richer contact dynamics and object-dependent force patterns may still remain embodiment-specific.

## 9. Takeaways

My main takeaway is:

**XL-VLA shows that cross-embodiment dexterous VLA becomes much more practical once the policy predicts in a shared latent action space instead of raw joints.**

More generally, the paper suggests a useful design principle:

- use a large VLA backbone for perception and instruction following
- hide embodiment-specific motor details behind a compact latent interface
- make that interface geometric and self-supervised rather than purely kinematic or manually engineered

If this line of work continues, I expect the most interesting next step will be extending this idea from **cross-hand transfer** to broader **whole-body cross-embodiment manipulation**.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**XL-VLA** 解决的是灵巧手机器人学习中的一个核心问题：每一种新手型都有自己的关节空间，因此标准 VLA 模型很难自然扩展到多个 embodiment。

论文的解决方案是先学习一个跨手型共享的**latent action space**，然后让 VLA 模型预测**latent action chunk**，而不是直接预测原始关节命令。

这个抽象非常有效：

- 跨手型平均成功率从 `pi0` 的 **0.32** 提升到 **0.72**
- 在 G1 跨机器人实验中，平均成功率从 **0.525** 提升到 **0.825**
- 同时还支持对未见过的 hand-task 组合进行**zero-shot 泛化**

我的简短判断是，这篇论文最重要的贡献不只是一个更强的灵巧手策略，而是明确指出：

**在跨 embodiment 灵巧操作里，真正的瓶颈往往是动作表征，而不是视觉或语言本身。**

## 论文信息

- **标题**: Cross-Hand Latent Representation for Vision-Language-Action Models
- **作者**: Guangqi Jiang, Yutong Liang, Jianglong Ye, Jia-Yang Huang, Changwei Jing, Rocky Duan, Pieter Abbeel, Xiaolong Wang, Xueyan Zou
- **机构**: UC San Diego, Amazon FAR, UC Berkeley
- **项目主页**: [xl-vla.github.io](https://xl-vla.github.io)
- **论文类型**: 灵巧操作 / 跨 embodiment 学习 / VLA

## 1. 问题设定与动机

论文开头有一个非常准确的观察：

**语言的词表相对稳定，但机器人的动作空间并不稳定。**

对灵巧手来说，这个问题尤其严重，因为不同手型之间存在：

- 不同的手指数
- 不同的驱动结构
- 不同的关节参数化
- 新硬件不断出现

这会让标准 VLA 训练变得昂贵而碎片化。即使两个手都该完成同一个任务，它们的原始动作空间往往也完全不兼容。

论文因此提出两个很实际的问题：

1. 如何在一组灵巧手之间定义一个统一的动作表征？
2. 当新手型出现时，如何避免从头重新训练完整策略？

## 2. 核心思路

这篇论文的核心就是：不要直接在原始关节空间里做策略预测，而是先定义一个**共享的 latent action space**。

对于每一种手 `h`，系统学习：

- 一个 hand-specific encoder `E_h`
- 一个 hand-specific decoder `D_h`

它们负责在以下两者之间映射：

- 该手自己的 joint-space action chunk
- 所有手共享的 latent 动作向量

这样一来，VLA 主体模型本身就可以做到 hand-agnostic：

- 输入视觉、语言和过去的 latent action token
- 输出下一段 latent action chunk
- 再由对应手型的 decoder 转回关节命令

这种分工非常清晰：

- VLA backbone 不需要直接理解每种手的细节运动学
- embodiment-specific 的差异被隔离在 encoder / decoder 里

## 3. 方法拆解

### 3.1 用 action chunk 而不是单步动作

模型不是预测单步动作，而是预测**动作块**。

每个 action chunk 包含：

- `64` 个关节位置命令
- 采样频率 `20 Hz`
- 对应 `3.2` 秒动作

在时刻 `t`，策略接收：

- 图像观测
- 语言指令
- 一小段关节状态历史
- 上一个执行过的动作块

然后预测下一个动作块。

这种 chunk 化方式很适合双臂灵巧操作，因为很多任务依赖较长时间范围内的协调结构，而不是只靠当前一拍的反应。

### 3.2 用多头 VAE 风格自编码器构建共享 latent 空间

这个 latent 空间是独立于 VLA backbone 预训练的。

每一种手的 encoder 会输出一个高斯后验：

- 均值 `mu^(h)`
- 方差 `sigma^(h)`

decoder 再把 latent 重建回该手自己的关节配置。

论文中这些 encoder / decoder 都是轻量级 MLP，但它们共享同一个 latent 分布。

### 3.3 三个损失共同定义 latent 空间

这个 latent 空间由三个约束共同塑造：

1. **重建损失 `L1`**
2. **重定向损失 `L2`**
3. **KL 正则 `L3`**

#### 重建损失

保证每一种手都能较好地 autoencode 自己的关节配置。

#### 重定向损失

这是我认为全文最关键的部分。论文没有直接对齐不同手之间的关节角，而是通过可微前向运动学去对齐指尖几何关系。

它对齐的是：

- pinch distance
- pinch direction

而不是原始关节值。

这是一个非常合理的设计，因为不同手之间真正该对齐的是“功能几何关系”，而不是关节编号本身。

#### KL 正则

KL 项鼓励 latent 空间逼近标准高斯分布，从而获得更平滑、更容易插值的潜空间。

### 3.4 不依赖配对跨手轨迹

这篇论文很强的一点是：latent autoencoder 的训练**不需要跨手配对轨迹**。

它的做法是：

- 在每种手的关节范围内随机采样 joint 配置
- 编码成 latent
- 再通过所有 hand-specific decoder 进行解码
- 用重建损失和几何 retargeting 损失把 latent 空间对齐起来

因此这种跨手对齐本质上是通过运动学做出来的**自监督对齐**，而不是靠昂贵的多手配对示范。

这使得方法更可扩展。

## 4. 实验设置

作者构建了一个真实世界 teleoperation 数据集，包含：

- **4 种灵巧手**：Ability、Inspire、X-Hand1、Paxini DexH13
- **10 个任务**
- **每种手每个任务 50 条示范**
- 总计 **2000 条示范**
- 约 **2M state-action pairs**

任务包括：

- prepare fruits
- stack cans
- sort cans
- hand over bottle
- reorganize lemons
- pour sauce
- rearrange boxes
- push sugar
- pour sugar
- push cans

实验硬件包括：

- 双臂 `xArm7`
- 人形机器人 `Unitree G1`

## 5. 主要结果

### 5.1 跨手型 VLA 训练

最核心的比较对象是 `pi0`，两者都在相同的多手多任务设置下训练。

跨所有任务和手型的平均成功率为：

- **pi0**: `0.32`
- **XL-VLA**: `0.72`

分手型结果：

- **Ability**: `0.37 -> 0.73`
- **Inspire**: `0.27 -> 0.68`
- **Paxini**: `0.35 -> 0.78`
- **XHand**: `0.29 -> 0.70`

这组提升很大，尤其考虑到灵巧手之间的差异远大于普通平行夹爪。

在任务维度上，XL-VLA 在 Table 2 中每一类任务上都优于基线，其中提升特别明显的包括：

- **Hand over Bottle**
- **Sort Cans**
- **Re-arrange Boxes**
- **Pour Sugar**

更本质的结论是：一旦动作表征被统一，一个 VLA backbone 就更容易在不同 embodiment 上复用。

### 5.2 跨机器人扩展到 G1

论文还测试了当训练数据同时来自：

- 桌面 `xArm`
- 人形 `G1`

时，latent action space 是否仍然有帮助。

在 4 个任务上的 G1 平均成功率从：

- **pi0**: `0.525`
- **XL-VLA**: `0.825`

论文给出的相对提升是 **57%**。

这很重要，因为它说明 latent 空间不只是缓和了几种灵巧手之间的小差异，而是在更广泛的机器人系统差异下依然有价值。

### 5.3 未见任务的 zero-shot 泛化

论文还测试了 **zero-shot unseen-task generalization**。

对于每种手，训练时故意去掉一部分任务，测试时直接把训练好的策略用于这些未见过的 hand-task 组合，并通过对应 decoder 执行。

对比基线是 `pi0 + RT`：

- 只用 XHand 训练策略
- 再用几何 retargeting 把预测轨迹映射到其他手

论文给出的结论很明确：

- XL-VLA 一致优于这个 retargeting 基线
- 在任何 hand 或 task 上都没有输给该基线
- 在精细灵巧任务上的优势尤其明显

这正是 latent action space 应该发挥作用的地方：它传递的不只是事后修正过的几何轨迹，而是更接近“功能动作模式”的表示。

## 6. 消融结果

### 6.1 Latent replay 对比 LAD

论文把自己的 latent 空间与 **LAD** 这个监督式 latent retargeting 方法进行了比较。

Replay 平均成功率：

- **LAD** on Ability+Inspire: `0.60`
- **XL-VLA** on Ability+Inspire: `0.82`
- **LAD** on Paxini+XHand: `0.61`
- **XL-VLA** on Paxini+XHand: `0.81`

这很强，因为 XL-VLA 的 latent 对齐是**无监督**完成的，但结果却超过了监督式方法。

### 6.2 损失设计确实重要

loss ablation 的结果模式非常清楚：

- 去掉 `L1` 会严重破坏重建能力
- 去掉 `L2` 的 distance 部分会破坏跨手距离保持
- 去掉 `L2` 的 direction 部分会破坏跨手方向一致性
- 完全去掉 `L2` 会造成最明显的跨 embodiment 退化

这很好地支持了论文的核心建模判断：

**共享 latent action space 只有在被跨手几何约束显式塑形时，才真正有效。**

### 6.3 latent 维度不能太大

架构和 latent 维度消融显示，过大的 latent 空间反而会带来退化。

我的理解是，这很合理：latent 一旦过于宽松，就更容易记住 embodiment-specific 的捷径，而不是提炼出真正共享的动作结构。

## 7. 为什么这篇论文值得看

我认为它有三个很有价值的点。

### 7.1 它找对了瓶颈

很多跨 embodiment 工作会把重点放在更强的策略、更强的视觉 backbone 或更好的 retargeting。但这篇论文指出，对灵巧 VLA 而言，真正的瓶颈往往是**动作表征本身**。

### 7.2 它尽量保持 VLA 架构简单

XL-VLA 并没有完全重造一套 VLA，而是在已有 backbone（`pi0`）上接入一个 latent action 接口。这让方法更容易被已有系统吸收。

### 7.3 它强调真实硬件

论文大量基于真实世界灵巧手，而不是只在仿真里做 cross-embodiment。这个非常重要，因为很多看起来漂亮的迁移结果在真实硬件上很容易失效。

## 8. 局限性

这篇论文很强，但也有一些边界需要注意。

- 实验仍然集中在一个相对有限的灵巧手家族中，还不是完全开放的硬件集合。
- latent 空间虽然统一，但新增全新手型时仍然需要构建对应的 encoder / decoder。
- zero-shot 结果很有说服力，但多数是图示而不是完整数字表。
- 该方法很好地对齐了指尖几何，但更复杂的接触动力学和物体相关受力模式可能仍然保留 embodiment-specific 特征。

## 9. 总结

我对这篇论文的核心判断是：

**XL-VLA 表明，只要把策略输出从原始关节空间提升到共享 latent action space，跨 embodiment 的灵巧 VLA 就会变得更实际。**

更一般地说，这篇论文给出了一个值得记住的设计原则：

- 用大 VLA backbone 处理感知和语言指令
- 用紧凑 latent 接口屏蔽 embodiment-specific 的运动细节
- 让这个接口由几何约束和自监督方式塑造，而不是手工设计或单纯 kinematic 对齐

如果这条路线继续走下去，我认为最值得期待的下一步会是：从**跨手型迁移**进一步走向更广义的**全身跨 embodiment 操作**。

</div>
