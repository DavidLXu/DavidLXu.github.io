---
title: "[Paper Notes] HandX: Scaling Bimanual Motion and Interaction Generation"
date: 2026-04-10
permalink: /posts/2026/04/handx-paper-notes/
tags:
  - Hand Motion
  - Motion Generation
  - Bimanual Interaction
  - Diffusion Models
  - Scaling Laws
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

This paper introduces **HandX**, a unified foundation for bimanual hand motion generation that spans data, annotation, and evaluation. The authors consolidate existing datasets and collect new motion-capture data emphasizing contact-rich two-hand interactions, then propose a decoupled annotation pipeline that extracts kinematic features and uses LLM reasoning to produce fine-grained text descriptions. They benchmark both diffusion and autoregressive models across multiple scales and observe clear scaling trends: jointly increasing model capacity and data size consistently improves text-motion alignment and hand-contact quality.

## Paper Info

The paper is **"HandX: Scaling Bimanual Motion and Interaction Generation,"** by **Zimu Zhang, Yucheng Zhang, Xiyan Xu, Ziyin Wang, Sirui Xu, Kai Zhou, Bing Zhou, Chuan Guo, Jian Wang, Yu-Xiong Wang, and Liang-Yan Gui** from **University of Illinois Urbana-Champaign, Specs Inc., and Snap Inc.** It appears at **CVPR 2026**. The project page is at [handx-project.github.io](https://handx-project.github.io) and code is available at [github.com/handx-project/HandX](https://github.com/handx-project/HandX).

## 1. Problem and Motivation

Human motion synthesis has made impressive progress, but hand motion — especially bimanual interaction — remains underexplored. Most whole-body motion models treat hands as rigid end-effectors and miss the fine-grained cues that matter: finger articulation, contact timing, and inter-hand coordination. Meanwhile, hand-centric datasets tend to focus on object interaction, use coarse annotations, or lack high-fidelity bimanual sequences altogether.

The bottleneck is threefold. First, existing datasets either lack hand detail (Motion-X, InterAct) or are limited to object-centric settings with categorical labels (ARCTIC, H2O). Second, mismatched skeletons, frame rates, and annotation protocols across sources make it hard to unify data. Third, standard evaluation metrics like FID and R-Precision do not capture hand-specific qualities like contact fidelity or bimanual coordination.

HandX is designed to address all three. It provides a large-scale, contact-rich bimanual motion dataset with fine-grained multi-level text annotations, and introduces hand-focused metrics to evaluate generation quality.

## 2. Dataset

HandX is built in two steps.

**Aggregating existing data.** The authors consolidate multiple open-source datasets with bimanual motion (HOT3D, ARCTIC, GigaHands, H2O, HoloAssist), converting them to a unified skeletal representation and coordinate system. An intensity-aware filter removes static or near-static segments that would cause generative models to freeze.

**Capturing new data.** Using a 36-camera OptiTrack optical motion-capture system, they record dexterous two-hand interactions with 25 reflective markers per hand, capturing fine-grained articulation of the wrist, palm, fingers, and fingertips. The hand skeleton is reconstructed by estimating joint centers and enforcing anatomical constraints on bone lengths, with per-frame refinement for kinematic consistency.

The final dataset comprises **54.2 hours** of high-quality bimanual motion, **5.9 million frames**, and **490K text descriptions**. Compared to prior datasets, HandX stands out for its contact richness, motion intensity, and fine-grained language annotations organized in a triplet structure (left hand, right hand, inter-hand relation).

## 3. Annotation Pipeline

Manually annotating this much bimanual motion is prohibitively expensive. The authors propose a two-stage automatic pipeline.

**Stage 1: Kinematic Feature Extraction.** They compute a set of kinematic descriptors at each frame — finger flexion, finger-palm distances, inter-hand spatial relationships — then segment the temporal evolution into discrete events (e.g., touch, slide, release). These events are organized into a structured JSON format that LLMs can readily parse.

**Stage 2: LLM-based Description Generation.** Given the JSON-formatted kinematic features, a carefully designed prompt guides the LLM to generate descriptions following three principles: (a) explicitly describe left hand, right hand, and their inter-hand relationships; (b) report critical motion events like contact, separation, and hyperextension; (c) incorporate temporal context to preserve the progression of events. The LLM generates five levels of detail, from concise summaries to comprehensive descriptions covering subtle changes and speed variations.

This decoupled approach ensures that annotations are grounded in actual motion dynamics rather than hallucinated from visual appearance, and the multi-level structure supports both fine- and coarse-grained generation tasks.

## 4. Generation Models

The paper benchmarks two representative paradigms.

### 4.1 Diffusion Model

The motion representation concatenates 3D joint coordinates with a compact rotation scalar per joint (exploiting the limited rotational degrees of freedom of hand joints). An MLP-based encoder projects each frame into a $D$-dimensional embedding. The three text prompts ($T_L$, $T_R$, $T_I$ for left, right, and interaction) are encoded separately by T5, each with a learnable CLS token to prevent left-right confusion. The text embeddings are cross-attended with the motion embeddings and fused through residual connections:

$$
\tilde{z} = z'_t + \sum_{k \in \{L,R,I\}} \text{CrossAttention}(z'_t, \mathfrak{T}_k)
$$

An MLP decoder maps the fused representation back to motion: $\tilde{x} = G(\tilde{z}) \in \mathbb{R}^{F \times 2J \times 4}$.

A key design insight is that at inference time, the diffusion model supports diverse generation tasks through **partial denoising** — blending known constraints with the current sample at each denoising step. This enables motion in-betweening, keyframe control, wrist trajectory conditioning, hand-reaction synthesis, and long-horizon generation, all from a single model.

### 4.2 Autoregressive Model

The AR model uses **Finite Scalar Quantization (FSQ)** for tokenization, which offers better codebook utilization and scaling behavior than VQ-VAE. It adopts a local motion representation (wrist-relative positions and velocities) to improve codebook utilization. A text-prefix autoregressive model then predicts the next motion token conditioned on preceding tokens and the T5-encoded text prefix:

$$
\mathcal{L} = -\sum_{k=1}^{n} \log p(\hat{y}^k \mid y^{<k}, \mathfrak{T})
$$

The tokenizer uses 1D convolutional blocks with a temporal downsampling factor of 2, and the autoregressive model is explored with varying Transformer layers (8, 12, 16) and codebook sizes (512 to 4,096).

## 5. Metrics

Beyond standard FID, Diversity, R-Precision, and MM Distance, the paper introduces **contact-focused metrics**: contact precision ($C_\text{prec}$), recall ($C_\text{rec}$), and F1 ($C_\text{F1}$). These evaluate whether the generated sequence reproduces contact events at the corresponding frames in the ground truth, with a 2 cm contact threshold.

This is a meaningful addition. Standard metrics can look good even when contact timing and inter-hand coordination are poor, which is exactly the failure mode you care about in bimanual generation.

## 6. Experiments and Main Results

### Scaling Trends

Both model families show **clear positive scaling trends**. For diffusion models, scaling either model depth or training data consistently improves R-Precision and contact-related scores. The 12-layer model achieves the best overall performance, but further scaling to a 16-layer ultra-large variant (6.7× more parameters) causes performance to drop across all metrics — a clear saturation point.

For autoregressive models, increasing codebook size alone does not reliably help. Performance only improves when codebook size and model capacity are scaled **jointly**, suggesting finer discrete representations need sufficient autoregressive capacity to be useful.

Under a fixed 5% data budget, the authors observe an approximately **log-linear relationship** between Top-3 R-Precision and FLOPs, with a correlation coefficient of 0.96:

$$
R_\text{prec} = 0.4391 \times \log_{10}(\text{FLOPS}) - 3.8707
$$

### Qualitative Results

The qualitative comparisons are telling. Models trained on the full dataset generate more expressive motion with better text alignment than those on 5% or 20% subsets. Larger models produce motion better aligned with text and exhibit improved bimanual contact. The generated sequences successfully capture complex contact events specified in the text prompt — finger-to-finger touches, temporal coordination, and hand-hand spatial relationships.

The framework also demonstrates versatile generation: text-to-motion, motion in-betweening, trajectory control, keyframe guidance, hand-reaction synthesis, and long-horizon generation, all from the same model via the partial denoising mechanism.

## 7. Code and Implementation

The [codebase](https://github.com/handx-project/HandX) is well-structured, with separate modules for diffusion, autoregressive, evaluation, and IsaacGym-based simulation. Key implementation details:

- **Diffusion**: Hydra-based config, 4/8/12/16-layer Transformer decoder variants
- **Autoregressive**: VQ tokenizer training → code extraction → text-prefix AR training; model sizes from 4.6M to 3B parameters; codebook sizes 512–65,536
- **Evaluation**: Unified pipeline computing FID, R-Precision, MM Dist, Diversity, and contact metrics ($C_\text{prec}$, $C_\text{rec}$, $C_\text{F1}$)
- **Simulation**: IsaacGym-based physics replay for MANO hand meshes, supporting single-sequence and grid visualizations

## 8. Strengths and Limitations

**Strengths.** The paper's main value lies in its holistic approach: it does not just build a model but constructs a complete ecosystem — dataset, annotation pipeline, benchmarks, metrics, and scaling analysis. The triplet annotation structure (left, right, interaction) is a clean design choice that helps models avoid left-right confusion. The contact-focused metrics fill a genuine evaluation gap. And the scaling analysis, while not earth-shattering, provides concrete evidence of when scaling helps and when it saturates.

**Limitations.** The paper is primarily about hand-only motion without body context. The practical applicability depends on how well these hand motions integrate with whole-body models downstream. The LLM-based annotation pipeline, while scalable, inherits whatever biases the LLM brings to motion description — the paper does not analyze annotation quality or failure modes in depth. Finally, the scaling analysis is limited to the HandX dataset; it would be interesting to see whether the trends hold when transferring to other domains or combining with body-level data.

## 9. Takeaways

HandX makes a strong case that hand motion generation is a field that was held back more by data and evaluation infrastructure than by model architecture. The core contributions — a clean, contact-rich bimanual dataset, a principled annotation pipeline, and hand-focused evaluation metrics — are the kind of foundation that enables others to build on top of. The scaling analysis adds useful guidance: moderate scaling works, but matching model capacity to data size matters more than blindly increasing either one.

For anyone working on embodied AI, telepresence, or human animation, the practical message is that fine-grained bimanual motion is now within reach of generative models, but it requires purpose-built data and evaluation to get there.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

这篇论文提出了 **HandX**，一个面向双手运动生成的统一基础设施，涵盖数据、标注和评估三个层面。作者汇聚已有数据集并采集新的动作捕捉数据，重点覆盖接触丰富的双手交互场景，同时提出一种解耦式标注流水线：先提取运动学特征，再利用大语言模型推理生成细粒度文本描述。在此基础上，他们对扩散模型和自回归模型进行了多尺度的基准测试，发现了清晰的缩放趋势：同时增大模型容量和数据规模可以持续提升文本-运动对齐和手部接触质量。

## 论文信息

论文标题是 **"HandX: Scaling Bimanual Motion and Interaction Generation"**，作者为 **Zimu Zhang、Yucheng Zhang、Xiyan Xu、Ziyin Wang、Sirui Xu、Kai Zhou、Bing Zhou、Chuan Guo、Jian Wang、Yu-Xiong Wang 和 Liang-Yan Gui**，来自 **University of Illinois Urbana-Champaign、Specs Inc. 和 Snap Inc.**，发表于 **CVPR 2026**。项目主页为 [handx-project.github.io](https://handx-project.github.io)，代码开源在 [github.com/handx-project/HandX](https://github.com/handx-project/HandX)。

## 1. 问题与动机

人体运动合成已经取得了很大进展，但手部运动——尤其是双手交互——仍然是被低估的领域。大多数全身运动模型把手当作刚性末端执行器处理，忽略了真正重要的细粒度信息：手指关节运动、接触时序和双手协调。而现有的手部数据集要么集中在物体交互上，要么标注粗糙，要么缺少高质量的双手序列。

瓶颈有三个方面。第一，现有数据集要么缺乏手部细节（如 Motion-X、InterAct），要么局限于以物体为中心的场景、只有分类标签（如 ARCTIC、H2O）。第二，不同来源的数据在骨架定义、帧率和标注协议上不统一，很难整合。第三，FID 和 R-Precision 等标准评估指标无法捕捉手部特有的质量维度，比如接触准确性和双手协调性。

HandX 的设计目标就是同时解决这三个问题：提供一个大规模、接触丰富的双手运动数据集，配以细粒度多层次文本标注，并引入面向手部的评估指标。

## 2. 数据集

HandX 的构建分两步。

**整合已有数据。** 作者汇总了多个包含双手运动的开源数据集（HOT3D、ARCTIC、GigaHands、H2O、HoloAssist），将它们转换为统一的骨架表示和坐标系。一个基于关节角速度的强度感知过滤器会剔除静止或接近静止的片段，避免生成模型学到"冻结"行为。

**采集新数据。** 使用 36 台 OptiTrack 光学动捕相机，在专用工作室中录制灵巧的双手交互动作。每位演员佩戴 25 个反光标记点，覆盖手腕、手掌、手指和指尖。从标记轨迹重建手部骨架时，通过估计关节中心并施加骨骼长度的解剖学约束，配合逐帧优化来保证运动学一致性。

最终数据集包含 **54.2 小时**高质量双手运动、**590 万帧**和 **49 万条文本描述**。与已有数据集相比，HandX 在接触丰富度、运动强度和细粒度语言标注（三元组结构：左手、右手、双手关系）方面都有明显优势。

## 3. 标注流水线

手动标注如此大规模的双手运动数据成本极高。作者提出了一个两阶段自动化流水线。

**阶段一：运动学特征提取。** 在每一帧计算一组运动学描述符——手指弯曲度、指-掌距离、双手空间关系等——然后将其时间演化分割为离散事件（如接触、滑动、分离）。这些事件被组织为结构化 JSON 格式，方便 LLM 直接解析。

**阶段二：LLM 驱动的描述生成。** 基于 JSON 格式的运动学特征，一个精心设计的 prompt 引导 LLM 按照三个原则生成描述：(a) 分别描述左手、右手及其双手关系；(b) 报告关键运动事件，如接触、分离、过伸；(c) 保留事件的时间顺序。LLM 生成五个详细程度不同的文本，从简洁摘要到包含细微变化和速度信息的全面描述。

这种解耦方法确保标注基于实际运动动力学而非视觉外观的"幻觉"，多层次结构也同时支持粗粒度和细粒度的生成任务。

## 4. 生成模型

论文对两种代表性范式进行了基准测试。

### 4.1 扩散模型

运动表示将每个关节的 3D 坐标与一个紧凑的旋转标量拼接起来（利用手部关节有限的旋转自由度）。MLP 编码器将每帧投影为 $D$ 维嵌入。三种文本提示（$T_L$、$T_R$、$T_I$ 分别对应左手、右手和交互）由 T5 分别编码，每种都附加一个可学习的 CLS token 以避免左右混淆。文本嵌入通过交叉注意力与运动嵌入融合，并通过残差连接汇总：

$$
\tilde{z} = z'_t + \sum_{k \in \{L,R,I\}} \text{CrossAttention}(z'_t, \mathfrak{T}_k)
$$

MLP 解码器将融合表示映射回运动：$\tilde{x} = G(\tilde{z}) \in \mathbb{R}^{F \times 2J \times 4}$。

一个关键的设计洞察是：在推理时，扩散模型通过**部分去噪**策略支持多样化生成任务——在每个去噪步骤中将已知约束与当前样本混合。这使得一个模型就能同时支持运动中间插值、关键帧控制、手腕轨迹约束、手部反应合成和长时程生成。

### 4.2 自回归模型

自回归模型使用 **FSQ（Finite Scalar Quantization）** 进行 token 化，相比 VQ-VAE 具有更好的 codebook 利用率和缩放特性。它采用局部运动表示（基于手腕的相对位置和速度）来提升 codebook 利用率。文本前缀自回归模型根据已有 token 和 T5 编码的文本前缀预测下一个运动 token：

$$
\mathcal{L} = -\sum_{k=1}^{n} \log p(\hat{y}^k \mid y^{<k}, \mathfrak{T})
$$

token 化器使用一维卷积块，时间下采样因子为 2；自回归模型在 Transformer 层数（8、12、16）和 codebook 大小（512 到 4,096）上进行了多配置探索。

## 5. 评估指标

除了标准的 FID、Diversity、R-Precision 和 MM Distance，论文引入了**接触相关指标**：接触精确率（$C_\text{prec}$）、召回率（$C_\text{rec}$）和 F1（$C_\text{F1}$）。这些指标评估生成序列是否在 ground truth 对应帧处复现了接触事件，接触阈值为 2 cm。

这是一个有意义的补充。标准指标即使在接触时序和双手协调很差的情况下也可能表现不错，而这恰恰是双手生成中最需要关注的失败模式。

## 6. 实验结果

### 缩放趋势

两类模型都展现出**清晰的正向缩放趋势**。对于扩散模型，增加模型深度或训练数据都能持续提升 R-Precision 和接触相关分数。12 层模型达到最佳综合性能，但进一步扩展到 16 层超大模型（参数量多 6.7 倍）时，所有指标反而下降——出现了明确的饱和点。

对于自回归模型，单独增大 codebook 大小并不能可靠地提升性能，只有**同时**增大 codebook 和模型容量才能获得最佳结果。这表明更细的离散表示需要足够的自回归容量来匹配。

在固定 5% 数据预算下，作者观察到 Top-3 R-Precision 与 FLOPs 之间近似**对数线性关系**，相关系数为 0.96：

$$
R_\text{prec} = 0.4391 \times \log_{10}(\text{FLOPS}) - 3.8707
$$

### 定性结果

定性对比很有说服力。在完整数据集上训练的模型比 5% 或 20% 子集训练的模型生成了更富表现力、更好对齐文本的运动。更大的模型产生的运动与文本更一致，双手接触质量也更好。生成序列成功捕获了文本中指定的复杂接触事件——指尖接触、时间协调和双手空间关系。

框架还展示了多样化生成能力：文本到运动、运动中间插值、轨迹控制、关键帧引导、手部反应合成和长时程生成，全部由同一个模型通过部分去噪机制实现。

## 7. 代码与实现

[代码仓库](https://github.com/handx-project/HandX) 结构清晰，包含扩散、自回归、评估和基于 IsaacGym 的仿真四个独立模块。关键实现细节：

- **扩散模型**：基于 Hydra 配置，4/8/12/16 层 Transformer 解码器
- **自回归模型**：VQ tokenizer 训练 → 运动编码提取 → 文本前缀 AR 训练；模型规模从 460 万到 30 亿参数；codebook 大小 512–65,536
- **评估**：统一的评估流水线，计算 FID、R-Precision、MM Dist、Diversity 和接触指标（$C_\text{prec}$、$C_\text{rec}$、$C_\text{F1}$）
- **仿真**：基于 IsaacGym 的物理回放，支持 MANO 手部网格的单序列和网格可视化

## 8. 优势与局限

**优势。** 这篇论文的核心价值在于其整体性方法：它不只是建了一个模型，而是构建了一个完整的生态——数据集、标注流水线、基准测试、评估指标和缩放分析。三元组标注结构（左手、右手、交互）是一个简洁的设计选择，帮助模型避免左右混淆。接触相关指标填补了真实的评估空白。缩放分析虽然不算震撼，但提供了关于何时缩放有用、何时饱和的具体证据。

**局限。** 论文主要关注纯手部运动，没有身体上下文。实际应用价值取决于这些手部运动能否与下游全身模型良好集成。基于 LLM 的标注流水线虽然可扩展，但不可避免地继承了 LLM 在运动描述上的偏差——论文没有深入分析标注质量或失败模式。此外，缩放分析仅限于 HandX 数据集；如果能看到这些趋势在迁移到其他领域或与身体级数据结合时是否依然成立，会更有意义。

## 9. 结论

HandX 有力地证明了手部运动生成这个领域，更多是被数据和评估基础设施拖慢，而非模型架构。核心贡献——干净且接触丰富的双手数据集、有原则的标注流水线、面向手部的评估指标——是那种能让其他人在上面继续建设的基础。缩放分析也提供了有用的指导：适度缩放有效，但让模型容量与数据规模匹配比盲目增大任何一个都更重要。

对于从事具身智能、远程临场或人体动画的研究者来说，这篇论文传递的实用信息是：细粒度双手运动现在已经在生成模型的能力范围内，但需要专门构建的数据和评估才能真正做好。

</div>
