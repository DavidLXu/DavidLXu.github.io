---
title: "[Paper Notes] UniDexTok: A Unified Dexterous Hand Tokenizer from Real Data"
date: 2026-07-14
permalink: /posts/2026/07/unidextok-paper-notes/
tags:
  - Robot Learning
  - Dexterous Manipulation
  - Tokenization
  - Cross-Embodiment
  - Representation Learning
---

<div data-lang="en" markdown="1">

**UniDexTok** studies a representation problem that sits before dexterous manipulation policy learning: how can data from different human and robot hands be put into one shared state space, then converted into discrete tokens that future VLA or world-action models can use?

My read: the paper's core contribution is a retargeting-free state tokenizer. UniDexTok avoids converting every hand trajectory into a target robot hand through MANO-to-robot retargeting. It first standardizes human and robot hand states into a 22-DoF semantic interface called UDHM, then trains one conditional tokenizer with a shared encoder, shared codebook, and shared decoder across embodiments. The important shift is from "make every hand imitate one robot" to "make every hand speak the same joint-semantic language."

## Paper Info

The paper is **"UniDexTok: A Unified Dexterous Hand Tokenizer from Real Data"** by **Dong Fang, Youjun Wu, Yuanxin Zhong, Rui Zhang, Yunlong Wang, Xiaosong Jia, and Yu-Gang Jiang** from Fudan University, Rimbot, Hefei University of Technology, and Beijing University of Posts and Telecommunications. It is available as [arXiv:2606.10683](https://arxiv.org/abs/2606.10683).

## Why Dexterous Hand States Are Hard to Share

Parallel grippers are easy to represent: opening width, gripper pose, maybe a binary open-close state. Dexterous hands are messier. Different hands have different numbers of fingers, joint names, joint orders, coupled joints, control ranges, and units. Even datasets collected with the same family of hands can log joint states in different conventions, including radians, degrees, or discretized bins.

This makes cross-embodiment learning awkward. If every robot hand has a separate tokenizer, then each codebook learns a private latent space. The model may reconstruct each hand, but the discrete tokens do not have a stable meaning across hardware. If the pipeline relies on retargeting human motion into every robot hand, the representation inherits geometric mismatch from retargeting and loses the native state statistics of real robot data.

UniDexTok's answer is to standardize the state space first, then tokenize.

## UDHM: A 22-DoF Semantic Interface

The Unified Dexterous Hand Model, or UDHM, is the paper's shared coordinate system. It assumes a human-hand-like kinematic structure and maps MANO-style human keypoints and robot hand joints into a 22-dimensional active joint interface.

For the index, middle, and ring fingers, UDHM uses four active coordinates per finger: MCP abduction/adduction, MCP flexion/extension, PIP flexion/extension, and DIP flexion/extension. The pinky adds one twist degree of freedom to cover larger lateral variation. The thumb uses five coordinates: CMC flexion, CMC spread, MCP flexion, MCP abduction, and IP flexion. Together these choices give 22 active coordinates.

The model fits a palm plane from the wrist and MCP keypoints, uses the palm normal and local lateral axes to define motion planes, and reconstructs each finger chain with analytic forward kinematics. For inverse mapping, it extracts palm offsets and bone lengths from the input frame, then solves a nonlinear least-squares problem so the reconstructed joints match the target keypoints.

The practical detail I like is the treatment of heterogeneous robot logs. Each available robot-hand DoF is inserted into the semantically corresponding UDHM coordinate, and missing coordinates are zero-padded. This "semantic insertion" is stronger than simply appending all available coordinates at the front of a vector, because the model can learn that a coordinate means "index MCP pitch" across embodiments without memorizing source-specific column positions.

All raw joint angles are converted to radians and normalized by a fixed scale of \(\pi\). That fixed normalization keeps tokens from depending on train-test split statistics and keeps MPJAE interpretable after denormalization.

## UniDexTok Architecture

Given a standardized hand state \(x \in \mathbb{R}^{22}\) and a hand-type or source label \(h\), the tokenizer learns

\[
\hat{x} = \pi D(Q(E(\tilde{x}, h_{\mathrm{embed}})), h_{\mathrm{embed}}), \quad \tilde{x}=x/\pi.
\]

The encoder projects the 22-dimensional normalized state into \(N=8\) latent tokens with width \(C=512\). Transformer blocks then model correlations among joint coordinates. Hand-type conditioning enters through adaptive layer normalization:

\[
\mathrm{AdaLN}(z,h_{\mathrm{embed}})=\gamma(c_h)\odot \mathrm{LN}(z)+\beta(c_h).
\]

This conditioning matters because the same semantic pose can require different numeric joint patterns on different hands. The shared encoder and decoder learn the cross-hand structure, while the conditioning keeps hardware-specific conventions available.

The decoder mirrors the encoder. It takes quantized tokens, adds positional embeddings and hand conditioning, and reconstructs the normalized 22-dimensional state. The reconstruction objective is based on normalized joint-angle reconstruction, and the full objective adds the VQ commitment loss:

\[
L = L_{\mathrm{rec}} + L_{\mathrm{vq}},
\]

with

\[
L_{\mathrm{vq}}=\beta\lVert \mathrm{sg}[q]-u\rVert_2^2+\lVert q-\mathrm{sg}[u]\rVert_2^2,
\]

where \(\beta=0.25\) in the reported experiments.

## Factorized Codebook

A simple 256-entry codebook would give only 256 choices per quantized vector. UniDexTok instead factorizes the vocabulary across channel groups. The encoder output is projected from 512 to 256 dimensions, divided into \(K=8\) groups, and each group uses a 32-entry sub-codebook. That means one token can express \(32^8\) code combinations while storing only \(32 \times 8 = 256\) learned code vectors.

For each token position and group, the nearest normalized code vector is selected by cosine similarity:

\[
i_{n,k}=\arg\max_j
\left\langle
\frac{u_{n,k}}{\lVert u_{n,k}\rVert_2},
\frac{e_{k,j}}{\lVert e_{k,j}\rVert_2}
\right\rangle.
\]

This design is important for discrete representation quality. In the paper's gesture benchmark, UniHM's single-codebook quantized features drop from 96.15% to 84.62% linear probing accuracy, while UniDexTok keeps 100% accuracy after quantization. The interpretation is straightforward: a single codebook can collapse different gestures into the same discrete code; factorized VQ gives the token more compositional capacity.

## Data and Evaluation

The training data combines two main sources. The first is coarse human hand-object interaction data from DexYCB, OakInk-v2, and EgoDex. UniDexTok does not retarget those motions to a robot hand. It reduces the MANO-style 45-DoF hand representation to the 22 active UDHM coordinates and trains on the standardized human hand as another embodiment.

The second source is real robot-hand data from LET, Dexora, and LinkerHand. These datasets differ in joint ordering, dimensionality, and units, so UniDexTok converts all values to radians, inserts available DoFs into the corresponding UDHM coordinates, and pads missing coordinates.

The paper evaluates reconstruction in joint-angle space and Cartesian space. MPJAE measures mean per-joint angle error in degrees. MPJPE measures mean per-joint position error in millimeters. FK error reports fingertip-position errors.

## Main Results

Against UniHM on the standardized real datasets, UniDexTok reduces average MPJAE from **15.63 degrees to 0.16 degrees** and average MPJPE from **18.51 mm to 0.18 mm**. That is the paper's headline result: reconstruction improves from centimeter-scale error to sub-millimeter error.

The improvement is consistent across LinkerHand L6, LinkerHand L10, LinkerHand L20, and Robotera XHand1. On the retargeted DexYCB evaluation, the gap is smaller because that protocol is closer to the retargeted data distribution used by UniHM, but UniDexTok still improves average MPJAE from **4.40 degrees to 2.83 degrees**.

The zero-shot and few-shot results are also useful. On an unseen Inspire RH56E2 hand, zero-shot per-joint angle errors range from **4.14 to 7.85 degrees**, and fingertip FK errors range from **7.73 to 16.05 mm**. With only **4,528 frames**, about **6.2%** of the full Inspire dataset, fine-tuning for 2 epochs reduces joint errors to roughly **1.42 to 2.08 degrees** and reduces fingertip errors by **58.5% to 78.8%**.

This is the evidence for treating the tokenizer as a cross-embodiment representation, beyond a compression model for one hand. A new hand can enter the same token space and then adapt with a small amount of target data.

## Ablations

The ablation on human-hand data is especially relevant for embodied datasets. With human-hand data included, the average MPJAE is **0.16 degrees** and MPJPE is **0.18 mm**. Without human-hand data, they rise to **0.37 degrees** and **0.43 mm**. The human hand is therefore useful as a training embodiment, not merely as a source for retargeting.

The semantic-insertion ablation supports the UDHM design. With semantic insertion, MPJAE, MPJPE, and FK error are **0.24 degrees**, **0.25 mm**, and **0.53 mm**. Without semantic insertion, they degrade to **0.53 degrees**, **0.57 mm**, and **1.20 mm**. The benefit comes from aligning coordinates by joint meaning.

## Strengths and Limitations

The strength of UniDexTok is that it attacks the representation bottleneck directly. It gives heterogeneous hand datasets a common joint-semantic interface, learns discrete tokens from real standardized states, and avoids making retargeted trajectories the primary source of robot-hand state data. This is a good fit for future dexterous VLA systems, where an action or state token needs a stable meaning across hardware.

The limitations are also clear. UDHM assumes a human-hand-like kinematic structure, so non-anthropomorphic grippers, soft hands, heavily underactuated hands, tendon coupling, compliance, and actuator-level dynamics are only partially captured. The tokenizer focuses on state reconstruction and does not model contacts, tactile signals, object geometry, force, or temporal action dynamics. Low reconstruction error is valuable, but it does not by itself prove better downstream manipulation.

## Takeaway

UniDexTok is best understood as infrastructure for dexterous foundation models. It leaves manipulation policy learning to the next layer and solves a lower-level but very important problem: make heterogeneous real hand states share one semantic, discrete, embodiment-conditioned token space.

The larger lesson is that cross-embodiment learning needs more than a big model and more data. It needs careful state standardization. Once the joint semantics are aligned, human data, robot data, seen hands, and new hands can contribute to the same representation without living in isolated codebooks.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**UniDexTok** 研究的是灵巧操作策略学习之前的一个表示问题：不同 human hands 和 robot hands 的数据，怎样放进同一个状态空间，再变成未来 VLA 或 world-action models 可以使用的离散 tokens？

我的理解：这篇的核心贡献是一个 retargeting-free 的状态 tokenizer。它没有先把所有手部轨迹通过 MANO-to-robot retargeting 转成某一种目标机器人手，而是先用 UDHM 把人手和机器人手状态标准化到一个 22-DoF semantic interface，然后训练一个跨 embodiment 共享 encoder、codebook 和 decoder 的 conditional tokenizer。关键变化是从“让所有手模仿某一个机器人手”转向“让所有手使用同一种关节语义语言”。

## Paper Info

论文是 **"UniDexTok: A Unified Dexterous Hand Tokenizer from Real Data"**，作者为 **Dong Fang, Youjun Wu, Yuanxin Zhong, Rui Zhang, Yunlong Wang, Xiaosong Jia, and Yu-Gang Jiang**，来自 Fudan University、Rimbot、Hefei University of Technology 和 Beijing University of Posts and Telecommunications。论文链接是 [arXiv:2606.10683](https://arxiv.org/abs/2606.10683)。

## 为什么 Dexterous Hand State 难共享

Parallel gripper 很容易表示：开合宽度、夹爪位姿，也许再加一个 open-close binary state。Dexterous hand 就复杂很多。不同灵巧手有不同手指数、关节名、关节顺序、耦合关节、控制范围和单位。甚至同一类手采集的数据，也可能使用不同记录约定，包括 radians、degrees 或离散 bins。

这会让 cross-embodiment learning 很别扭。如果每个机器人手都有单独 tokenizer，每个 codebook 就会学习自己的 private latent space。模型也许可以重建每只手，但离散 token 在不同硬件之间没有稳定含义。如果 pipeline 依赖把 human motion retarget 到每只 robot hand，表示就会继承 retargeting 带来的几何误差，也会丢掉真实机器人数据原本的 state statistics。

UniDexTok 的回答是：先统一 state space，再做 tokenization。

## UDHM：22-DoF Semantic Interface

Unified Dexterous Hand Model，也就是 UDHM，是这篇的共享坐标系。它假设一种 human-hand-like kinematic structure，把 MANO-style human keypoints 和 robot hand joints 映射到 22 维 active joint interface。

对于 index、middle 和 ring fingers，UDHM 每根手指使用四个 active coordinates：MCP abduction/adduction、MCP flexion/extension、PIP flexion/extension 和 DIP flexion/extension。Pinky 额外增加一个 twist DoF，用来覆盖更大的侧向变化。Thumb 使用五个坐标：CMC flexion、CMC spread、MCP flexion、MCP abduction 和 IP flexion。合起来是 22 个 active coordinates。

模型会根据 wrist 和 MCP keypoints 拟合 palm plane，用 palm normal 和 local lateral axes 定义 motion planes，再用解析 forward kinematics 重建每根手指链。做 inverse mapping 时，它从输入帧中提取 palm offsets 和 bone lengths，然后求解 nonlinear least-squares，使重建关节尽量匹配目标 keypoints。

我觉得很实用的一点是它处理异构 robot logs 的方式。每个可用的 robot-hand DoF 会被插入到语义对应的 UDHM coordinate，缺失坐标用 0 padding。这个 semantic insertion 比简单地把所有可用坐标 append 到向量前面更强，因为模型能学到某一维表示的是“index MCP pitch”，而不只是记住某个数据源里的列号。

所有原始关节角都会转换成 radians，并用固定尺度 \(\pi\) 归一化。固定归一化避免 token 依赖某个 train-test split 的统计量，也让 denormalization 之后的 MPJAE 仍然可解释。

## UniDexTok Architecture

给定一个标准化手部状态 \(x \in \mathbb{R}^{22}\)，以及 hand-type 或 source label \(h\)，tokenizer 学习：

\[
\hat{x} = \pi D(Q(E(\tilde{x}, h_{\mathrm{embed}})), h_{\mathrm{embed}}), \quad \tilde{x}=x/\pi.
\]

Encoder 先把 22 维 normalized state 投影成 \(N=8\) 个 latent tokens，每个 token 宽度 \(C=512\)。Transformer blocks 再建模不同关节坐标之间的相关性。Hand-type conditioning 通过 adaptive layer normalization 注入：

\[
\mathrm{AdaLN}(z,h_{\mathrm{embed}})=\gamma(c_h)\odot \mathrm{LN}(z)+\beta(c_h).
\]

这个 conditioning 很关键，因为同一种语义姿态在不同手上可能对应不同数值关节模式。共享 encoder 和 decoder 学 cross-hand structure，conditioning 保留硬件特定约定。

Decoder 结构和 encoder 对称。它接收 quantized tokens，加上 positional embeddings 和 hand conditioning，然后重建 normalized 22-dimensional state。重建目标基于 normalized joint-angle reconstruction，完整目标再加 VQ commitment loss：

\[
L = L_{\mathrm{rec}} + L_{\mathrm{vq}},
\]

其中

\[
L_{\mathrm{vq}}=\beta\lVert \mathrm{sg}[q]-u\rVert_2^2+\lVert q-\mathrm{sg}[u]\rVert_2^2,
\]

实验中 \(\beta=0.25\)。

## Factorized Codebook

普通 256-entry codebook 对每个 quantized vector 只有 256 种选择。UniDexTok 把 vocabulary 沿 channel groups 分解。Encoder output 从 512 维投影到 256 维，然后切成 \(K=8\) 个 groups，每个 group 使用 32-entry sub-codebook。这样一个 token 可以表达 \(32^8\) 种 code combinations，但只需要存储 \(32 \times 8 = 256\) 个 learned code vectors。

对于每个 token position 和 group，quantizer 通过 cosine similarity 选择最近的 normalized code vector：

\[
i_{n,k}=\arg\max_j
\left\langle
\frac{u_{n,k}}{\lVert u_{n,k}\rVert_2},
\frac{e_{k,j}}{\lVert e_{k,j}\rVert_2}
\right\rangle.
\]

这个设计直接影响离散表示质量。在论文的 gesture benchmark 中，UniHM 的 single-codebook quantized features 让 linear probing accuracy 从 96.15% 掉到 84.62%；UniDexTok 在 quantization 之后仍然保持 100%。直观解释是：single codebook 容易把不同 gesture collapse 到同一个 discrete code；factorized VQ 给 token 更强的组合容量。

## 数据与评估

训练数据主要有两类。第一类是 DexYCB、OakInk-v2 和 EgoDex 中的 coarse human hand-object interaction data。UniDexTok 没有把这些 motion retarget 到机器人手，而是把 MANO-style 45-DoF hand representation 降到 22 个 active UDHM coordinates，把标准化后的人手当成另一个 embodiment 来训练。

第二类是真实 robot-hand data，包括 LET、Dexora 和 LinkerHand。这些数据集在 joint ordering、dimensionality 和 units 上都不同，所以 UniDexTok 先把所有值转换为 radians，再把可用 DoF 插入对应 UDHM coordinates，并 padding 缺失坐标。

论文在 joint-angle space 和 Cartesian space 两个层面评估重建质量。MPJAE 是 mean per-joint angle error，单位是 degrees。MPJPE 是 mean per-joint position error，单位是 millimeters。FK error 报告 fingertip-position errors。

## 主要结果

在标准化真实数据集上，相比 UniHM，UniDexTok 把平均 MPJAE 从 **15.63 degrees 降到 0.16 degrees**，把平均 MPJPE 从 **18.51 mm 降到 0.18 mm**。这是这篇最核心的结果：重建误差从厘米级降到了亚毫米级。

这个提升在 LinkerHand L6、LinkerHand L10、LinkerHand L20 和 Robotera XHand1 上都成立。在 retargeted DexYCB evaluation 上，差距小一些，因为这个协议更接近 UniHM 使用的 retargeted data distribution，但 UniDexTok 仍然把平均 MPJAE 从 **4.40 degrees 降到 2.83 degrees**。

Zero-shot 和 few-shot 结果也很有价值。对于训练中没见过的 Inspire RH56E2 hand，zero-shot per-joint angle errors 在 **4.14 到 7.85 degrees** 之间，fingertip FK errors 在 **7.73 到 16.05 mm** 之间。只用 **4,528 frames**，也就是完整 Inspire dataset 的 **6.2%**，fine-tuning 2 个 epochs 后，joint errors 降到大约 **1.42 到 2.08 degrees**，fingertip errors 降低 **58.5% 到 78.8%**。

这说明 tokenizer 更像一种 cross-embodiment representation，而不只是某只手的压缩模型。新手型可以进入同一个 token space，再用少量目标数据适配。

## Ablations

Human-hand data 的 ablation 对 embodied datasets 很有启发。加入 human-hand data 时，平均 MPJAE 是 **0.16 degrees**，MPJPE 是 **0.18 mm**。去掉 human-hand data 后，它们升到 **0.37 degrees** 和 **0.43 mm**。所以人手在这里是有效的 training embodiment，不只是 retargeting source。

Semantic-insertion ablation 支持了 UDHM 设计。使用 semantic insertion 时，MPJAE、MPJPE 和 FK error 分别是 **0.24 degrees**、**0.25 mm** 和 **0.53 mm**。不使用 semantic insertion 时，三者退化到 **0.53 degrees**、**0.57 mm** 和 **1.20 mm**。收益来自按关节语义对齐坐标。

## 优点与限制

UniDexTok 的优点是直接处理 representation bottleneck。它给异构手部数据集建立共同的 joint-semantic interface，从标准化真实状态中学习 discrete tokens，并避免把 retargeted trajectories 当作机器人手状态数据的主要来源。这很适合未来 dexterous VLA 系统，因为 action 或 state token 需要在不同硬件上有稳定含义。

限制也很清楚。UDHM 假设 human-hand-like kinematic structure，所以 non-anthropomorphic grippers、soft hands、强 underactuated hands、tendon coupling、compliance 和 actuator-level dynamics 都只能部分表达。当前 tokenizer 关注 state reconstruction，没有显式建模 contacts、tactile signals、object geometry、force 或 temporal action dynamics。低重建误差很有价值，但它本身还不能证明下游 manipulation 一定更好。

## Takeaway

UniDexTok 最适合理解为 dexterous foundation models 的基础设施。它把 manipulation policy learning 留给下一层，自己解决一个更底层但很关键的问题：让异构真实手部状态共享一个有语义、离散化、带 embodiment conditioning 的 token space。

更大的启发是，cross-embodiment learning 需要的不只是更大的模型和更多数据，还需要仔细的 state standardization。一旦关节语义对齐，人手数据、机器人数据、已见手型和新手型就能共同服务于同一个 representation，而不是散落在彼此隔离的 codebooks 里。

</div>
