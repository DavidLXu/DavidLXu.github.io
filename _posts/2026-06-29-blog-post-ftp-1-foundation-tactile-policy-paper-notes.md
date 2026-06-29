---
title: "[Paper Notes] FTP-1: A Generalist Foundation Tactile Policy Across Tactile Sensors for Contact-Rich Manipulation"
date: 2026-06-29
permalink: /posts/2026/06/ftp-1-foundation-tactile-policy-paper-notes/
tags:
  - Robot Learning
  - Tactile Sensing
  - Dexterous Manipulation
  - Generalist Policy
  - Vision Language Action
---

<div data-lang="en" markdown="1">

**FTP-1** is a foundation-policy attempt for tactile manipulation. The paper asks whether tactile feedback can be pretrained at scale across many sensor types and then reused for downstream contact-rich manipulation, including sensor setups that were never seen during pretraining.

My read: the important idea is not simply "add touch to a VLA." FTP-1 is about making heterogeneous tactile sensors look like a shared robot-policy interface. It defines a morphology-aware tactile token space, uses sensor-specific encoders to map raw tactile signals into that space, and trains a separate tactile Transformer expert so tactile knowledge can be reused across sensors without disturbing the vision-language backbone.

## Paper Info

The paper is **"FTP-1: A Generalist Foundation Tactile Policy Across Tactile Sensors for Contact-Rich Manipulation"** by **Chengbo Yuan, Zicheng Zhang, Mingjie Zhou, Wendi Chen, Yi Wang, Zhuoyang Liu, Dantong Niu, Shuo Wang, Hui Zhang, Wenkang Zhang, Yingdong Hu, Yuanqing Gong, Wanli Xing, Chuan Wen, Cewu Lu, Kaifeng Zhang, and Yang Gao**. It is available as [arXiv:2606.13102](https://arxiv.org/abs/2606.13102), with project page [ftp1-policy.github.io](https://ftp1-policy.github.io/).

## The Problem

Vision-based generalist robot policies can aggregate large heterogeneous datasets because camera observations are relatively easy to standardize. Tactile sensing is different. Across hardware, tactile data may be images, arrays, force-torque states, glove readings, fingertip signals, wrist forces, or hand-specific contact fields. Sensors vary in resolution, placement, morphology, physical response, and data format.

This makes tactile policy learning fragmented. A tactile policy trained for one sensor or hand often has little direct path to another sensor or embodiment. FTP-1 tries to build the tactile analogue of a foundation policy: one pretrained model that absorbs many tactile experiences and becomes a useful initialization for new contact-rich tasks.

## Policy Interface

FTP-1 predicts action chunks from language, vision, proprioception, and tactile observations:

\[
\hat{A}_{t:t+H-1}=\pi_\theta(\ell, I_t, s_t, X_t).
\]

Here \(\ell\) is the language instruction, \(I_t\) is multi-view RGB, \(s_t\) is proprioception, and \(X_t\) is tactile input. The action lives in a predefined **Unified Action Space (UAS)**. Following UniDex-style alignment, UAS represents different robots with fixed sparse action slots for left arm, right arm, head pose, and supplementary controls. Dexterous hand joints are mapped through function-aligned slots, so different hands can share action semantics where their functions match.

That action-space design matters because tactile pretraining is only useful if both input and output heterogeneity are handled. FTP-1 pairs a unified tactile input interface with a unified robot-action interface.

## Morphology-Aware Tactile Token Space

The core design is **Morphology-Aware Tactile Token Space (MTTS)**. MTTS defines **24 functional-area slots**. Slots 0-14 represent in-hand functional regions, slots 15-20 represent wrist and finger force/torque signals, and slots 21-23 are reserved. For a parallel gripper, the two side sensors are mapped to the thumb-tip and index-fingertip slots because those are their functional equivalents.

Each tactile input is grouped by functional area and converted into one token per area. FTP-1 adds a learnable functional-area embedding to each token, shared across sensors, with separate left/right hand embeddings where needed. This is the paper's key abstraction: a token carries both the sensor reading and the functional contact region of the hand or robot.

This is also what makes cross-sensor transfer plausible. A GelSight fingertip image, a tactile array, or a force state can all contribute to a similar functional-area slot if they correspond to a similar contact role.

## Heterogeneous Tactile Encoders

MTTS gives the common target space, but raw tactile observations still have different modalities. FTP-1 uses different encoders depending on the input type.

For **image-type tactile inputs**, such as GelSight-style signals, the model uses a lightweight sensor-specific ViT followed by a shared pretrained T3 Transformer tactile encoder. The final CLS token becomes the tactile token.

For **array-type inputs**, the model applies Fourier encoding on the signal dimension, then uses a CNN plus MLP to compress the functional area into one token.

For **state-type inputs**, such as force-torque vectors, the model applies Fourier encoding and uses an MLP.

All tactile tokens are LayerNorm-normalized, augmented with functional-area embeddings, and projected into the tactile expert dimension. The result is a set of unified tactile tokens with sensor-specific front ends and shared downstream semantics.

## Separate Tactile Expert

FTP-1 is built on the \(\pi0.5\) VLA codebase. It keeps a pretrained vision-language expert and a flow-matching action expert, then adds a separate **300M-parameter tactile Transformer expert**. The action expert attends to tactile-expert outputs, while the tactile expert does not attend back into the action expert.

This modularity is important. Prior tactile-augmented VLA methods often inject tactile tokens into the vision-language expert through adapters. FTP-1 argues that this can interfere with pretrained vision-language knowledge and may not provide a reusable tactile module. A separate tactile expert lets the model reuse tactile knowledge across sensors while preserving the vision-language backbone.

The paper also injects proprioception through adaptive RMSNorm instead of a plain proprioceptive token, which improved generalization in their preliminary experiments.

## Pretraining Dataset

The FTP-1 dataset aggregates **26 data sources** covering **21 tactile sensors** and roughly **3,000 hours** of tactile manipulation data. The sensors include **7 image-type**, **5 array-type**, and **9 state-type** tactile or force sensors.

The data mix spans human-hand demonstrations, dexterous-hand robot data, gripper robot data, and UMI-style data. After resampling, the mixture is approximately **20% human hand**, **30% dexterous hand**, and **50% gripper** data. The authors also collect **Sharpa North-FTP-1**, with **4,000 long-horizon dexterous demonstrations**.

During pretraining, the vision encoder, tokenizer, vision-language expert, and action expert are initialized from \(\pi0.5\). The tactile encoder, tactile expert, adaptive RMSNorm proprioception injector, and action projector are trained from scratch. Pretraining uses **48 NVIDIA H20 GPUs** for 50k steps with global batch size 768.

## Evaluation

FTP-1 is evaluated by distributing checkpoints to independent institutions for downstream finetuning across five hardware setups. The seen-sensor setups include UniVTAC in simulation with GelSight-Mini, Sharpa North with Sharpa DTC, and Sharpa&Dexmate with Sharpa DTC. The unseen-sensor setups are FlexivXense with Xense image tactile sensors and TactileUMI with Contactile array sensors.

The baselines separate three questions.

- \(\pi0.5\): strong vision-language-action policy without tactile input.
- Tactile-VLA: tactile tokens injected into the VLM expert without a separate tactile expert.
- FTP-\(\pi0.5\): FTP-1 architecture initialized from \(\pi0.5\), without large-scale FTP-1 tactile pretraining.

On the **UniVTAC simulation benchmark**, FTP-1 reaches **66.66%** average success, and **59.5%** when the two lift tasks are excluded. This is about +17.5 points over the next strongest result under both averages.

On **seen real tactile sensors**, FTP-1 averages **62.5%** across Sharpa North and Sharpa&Dexmate tasks, compared with **45.3%** for \(\pi0.5\), **35.8%** for Tactile-VLA, and **41.6%** for FTP-\(\pi0.5\). This is a useful caution: adding tactile input through a weak fusion design can hurt compared with a strong vision-only VLA.

On **unseen tactile sensors**, FTP-1 is strongest again. It reaches **46.6%** average success across Insert Hanoi, Insert USB, and Wipe Board, compared with **15.0%** for \(\pi0.5\), **8.3%** for Tactile-VLA, and **15.0%** for FTP-\(\pi0.5\). The paper reports this as a **+31.6 point gain** over the architecture without FTP-1 tactile pretraining.

## Does the Gain Come from Tactile Pretraining?

The paper includes a useful ablation called NTP-1. It pretrains on the same data distribution but removes tactile inputs and tactile-specific architecture during pretraining. During finetuning, the tactile architecture is added back. This tests whether the gains come from just seeing similar robot-task data, or from tactile-branch pretraining itself.

On UniVTAC, NTP-1 improves over FTP-\(\pi0.5\), suggesting that data distribution does help. But FTP-1 remains clearly better. On FlexivXense, FTP-1 outperforms NTP-1 by **+37.5 points**, supporting the stronger claim that pretrained tactile knowledge transfers to unseen tactile-sensor setups.

## Strengths and Limitations

The strength of FTP-1 is its interface design. MTTS turns sensor-specific touch into morphology-aware functional tokens. Heterogeneous encoders respect sensor modality differences. The tactile expert gives touch its own modeling capacity while allowing the action expert to consume tactile information when needed. This combination is much more concrete than a generic "add tactile input" recipe.

The limitation is also explicit in the paper: FTP-1 mainly focuses on general tactile perception and policy finetuning, and it does not yet solve tactile- or force-based servoing and low-level control. It is still an action-prediction foundation policy, not a force-control system. The authors also note that the tactile pretraining dataset is still limited in scale and diversity, especially compared with vision-language robot data.

## Takeaway

FTP-1 is best read as an infrastructure paper for tactile foundation policies. Its main contribution is a shared representation and pretraining recipe that makes heterogeneous tactile data usable across sensors and embodiments.

For contact-rich manipulation, the interesting result is the unseen-sensor transfer. If MTTS plus a shared tactile expert can make tactile pretraining useful even when the downstream sensor is new, then tactile policy learning can move from isolated sensor-specific pipelines toward reusable model-level starting points.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**FTP-1** 是一篇面向 tactile manipulation 的 foundation-policy 工作。论文问的问题是：触觉反馈能不能像视觉数据一样，在多种 sensor types 上大规模预训练，然后迁移到下游 contact-rich manipulation，甚至迁移到预训练时没见过的 tactile sensor setups？

我的理解：重点比“给 VLA 加触觉”更具体。FTP-1 真正想解决的是如何把异构触觉传感器变成统一的 robot-policy interface。它定义 morphology-aware tactile token space，用 sensor-specific encoders 把原始触觉信号映射进去，再训练一个独立的 tactile Transformer expert，让触觉知识可以跨传感器复用，同时尽量不扰乱 vision-language backbone。

## Paper Info

论文是 **"FTP-1: A Generalist Foundation Tactile Policy Across Tactile Sensors for Contact-Rich Manipulation"**，作者为 **Chengbo Yuan, Zicheng Zhang, Mingjie Zhou, Wendi Chen, Yi Wang, Zhuoyang Liu, Dantong Niu, Shuo Wang, Hui Zhang, Wenkang Zhang, Yingdong Hu, Yuanqing Gong, Wanli Xing, Chuan Wen, Cewu Lu, Kaifeng Zhang, and Yang Gao**。论文链接是 [arXiv:2606.13102](https://arxiv.org/abs/2606.13102)，项目主页是 [ftp1-policy.github.io](https://ftp1-policy.github.io/)。

## 问题

Vision-based generalist robot policies 能聚合大规模异构数据，一个原因是相机观测比较容易标准化。触觉不一样。不同硬件上的 tactile data 可能是图像、阵列、force-torque state、glove readings、指尖信号、腕部力，或者手部特定 contact fields。不同 sensor 的 resolution、placement、morphology、physical response 和 data format 都可能不同。

这让 tactile policy learning 很碎片化。一个为某个 sensor 或某只手训练的 tactile policy，通常很难直接迁移到另一个 sensor 或 embodiment。FTP-1 想做的是 tactile 版本的 foundation policy：一个在多种触觉经验上预训练的模型，作为新 contact-rich tasks 的好初始化。

## Policy Interface

FTP-1 从 language、vision、proprioception 和 tactile observations 预测 action chunks：

\[
\hat{A}_{t:t+H-1}=\pi_\theta(\ell, I_t, s_t, X_t).
\]

这里 \(\ell\) 是语言指令，\(I_t\) 是 multi-view RGB，\(s_t\) 是 proprioception，\(X_t\) 是 tactile input。action 位于预定义的 **Unified Action Space (UAS)**。沿用 UniDex 风格的 alignment，UAS 用固定稀疏 action slots 表示不同机器人，包括 left arm、right arm、head pose 和 supplementary controls。Dexterous hand joints 通过 function-aligned slots 映射，让不同手在功能相似的关节上共享 action semantics。

这个 action-space 设计很重要，因为 tactile pretraining 要想复用，输入异构和输出异构都要处理。FTP-1 同时提供统一 tactile input interface 和统一 robot-action interface。

## Morphology-Aware Tactile Token Space

核心设计是 **Morphology-Aware Tactile Token Space (MTTS)**。MTTS 定义了 **24 个 functional-area slots**。slots 0-14 表示 hand 上的 functional regions，slots 15-20 表示 wrist 和 finger force/torque signals，slots 21-23 预留。对于 parallel gripper，两侧 tactile sensors 会映射到 thumb-tip 和 index-fingertip slots，因为它们在功能上对应两指夹持。

每个 tactile input 按 functional area 分组，并转换成每个区域一个 token。FTP-1 给每个 token 加上 learnable functional-area embedding，这个 embedding 在不同 sensors 之间共享；需要时左右手使用不同 embedding。这里的关键抽象是：token 同时包含“某个传感器读数”和“来自机器人某个功能接触区域的触觉证据”。

这也是 cross-sensor transfer 成立的基础。GelSight fingertip image、tactile array 或 force state，只要对应相似接触角色，就可以进入相似的 functional-area slot。

## Heterogeneous Tactile Encoders

MTTS 给出了共同目标空间，但原始 tactile observations 仍然有不同 modality。FTP-1 根据输入类型使用不同 encoder。

对于 **image-type tactile inputs**，例如 GelSight-style signals，模型使用轻量 sensor-specific ViT，再接共享的 pretrained T3 Transformer tactile encoder。最终 CLS token 作为 tactile token。

对于 **array-type inputs**，模型在 signal dimension 上做 Fourier encoding，然后用 CNN 加 MLP 把 functional area 压缩成一个 token。

对于 **state-type inputs**，例如 force-torque vectors，模型做 Fourier encoding 后用 MLP 编码。

所有 tactile tokens 都经过 LayerNorm，加入 functional-area embeddings，再投影到 tactile expert 的维度。结果是一组统一 tactile tokens：前端保持 sensor-specific，后端共享功能语义。

## 独立 Tactile Expert

FTP-1 基于 \(\pi0.5\) VLA codebase。它保留 pretrained vision-language expert 和 flow-matching action expert，同时加入一个独立的 **300M-parameter tactile Transformer expert**。action expert 会 attend to tactile-expert outputs，tactile expert 不反向 attend 到 action expert。

这个模块化很重要。已有 tactile-augmented VLA 方法常常通过 adapters 把 tactile tokens 注入 vision-language expert。FTP-1 认为这可能干扰 pretrained vision-language knowledge，也未必能形成可复用的 tactile module。独立 tactile expert 让模型在保留视觉语言 backbone 的同时，跨 sensors 复用 tactile knowledge。

论文还通过 adaptive RMSNorm 注入 proprioception，替代普通 proprioceptive token；作者的初步实验显示这样有更好的 generalization。

## Pretraining Dataset

FTP-1 dataset 聚合了 **26 个 data sources**，覆盖 **21 个 tactile sensors**，总计约 **3,000 小时** tactile manipulation data。传感器包括 **7 个 image-type**、**5 个 array-type** 和 **9 个 state-type** tactile/force sensors。

数据混合包括 human-hand demonstrations、dexterous-hand robot data、gripper robot data 和 UMI-style data。重采样后，数据比例约为 **20% human hand**、**30% dexterous hand**、**50% gripper**。作者还采集了 **Sharpa North-FTP-1**，包含 **4,000 条 long-horizon dexterous demonstrations**。

预训练时，vision encoder、tokenizer、vision-language expert 和 action expert 从 \(\pi0.5\) 初始化。tactile encoder、tactile expert、adaptive RMSNorm proprioception injector 和 action projector 从零训练。预训练使用 **48 张 NVIDIA H20 GPUs**，训练 50k steps，global batch size 为 768。

## Evaluation

FTP-1 的评估方式是把 pretrained checkpoints 分发给多个独立机构，在五种硬件设置上做下游 finetuning。seen-sensor setups 包括使用 GelSight-Mini 的 UniVTAC simulation、使用 Sharpa DTC 的 Sharpa North、以及使用 Sharpa DTC 的 Sharpa&Dexmate。unseen-sensor setups 包括使用 Xense image tactile sensors 的 FlexivXense，以及使用 Contactile array sensors 的 TactileUMI。

baselines 用来拆分三个问题。

- \(\pi0.5\)：强 vision-language-action policy，没有 tactile input。
- Tactile-VLA：把 tactile tokens 注入 VLM expert，没有独立 tactile expert。
- FTP-\(\pi0.5\)：FTP-1 架构从 \(\pi0.5\) 初始化，但没有大规模 FTP-1 tactile pretraining。

在 **UniVTAC simulation benchmark** 上，FTP-1 达到 **66.66%** average success；去掉两个 lift tasks 后为 **59.5%**。两个平均指标都比次优结果高约 +17.5 points。

在 **seen real tactile sensors** 上，FTP-1 在 Sharpa North 和 Sharpa&Dexmate tasks 上平均 **62.5%**，相比之下 \(\pi0.5\) 是 **45.3%**，Tactile-VLA 是 **35.8%**，FTP-\(\pi0.5\) 是 **41.6%**。这个结果很有提醒意义：用不合适的 fusion design 加 tactile input，可能比强 vision-only VLA 更差。

在 **unseen tactile sensors** 上，FTP-1 依然最强。它在 Insert Hanoi、Insert USB 和 Wipe Board 上平均 **46.6%**，而 \(\pi0.5\) 是 **15.0%**，Tactile-VLA 是 **8.3%**，FTP-\(\pi0.5\) 是 **15.0%**。论文把这报告为相比无 FTP-1 tactile pretraining 架构的 **+31.6 point gain**。

## Gain 来自 Tactile Pretraining 吗？

论文做了一个有用的 ablation，叫 NTP-1。它在同样数据分布上预训练，但预训练时移除 tactile inputs 和 tactile-specific architecture。finetuning 时再把 tactile architecture 加回来。这个实验用来区分：提升到底来自更接近下游任务的数据分布，还是来自 tactile branch 本身的预训练知识。

在 UniVTAC 上，NTP-1 优于 FTP-\(\pi0.5\)，说明数据分布确实有帮助。但 FTP-1 仍然明显更好。在 FlexivXense 上，FTP-1 比 NTP-1 高 **+37.5 points**，支持更强的结论：pretrained tactile knowledge 可以迁移到 unseen tactile-sensor setups。

## 优点与限制

FTP-1 的优点是 interface design 很具体。MTTS 把 sensor-specific touch 变成 morphology-aware functional tokens。heterogeneous encoders 保留不同 sensor modality 的差异。tactile expert 给触觉单独建模容量，同时让 action expert 在需要时消费 tactile information。这比泛泛地“加触觉输入”具体得多。

限制也在论文里写得很清楚：FTP-1 主要关注 general tactile perception 和 policy finetuning，还没有解决 tactile- or force-based servoing 以及 low-level control。它仍然是 action-prediction foundation policy，并非 force-control system。作者也指出，tactile pretraining dataset 的规模和多样性相比 vision-language robot data 仍然有限。

## Takeaway

FTP-1 最适合看成 tactile foundation policy 的基础设施论文。它的主要贡献是一个 shared representation 和 pretraining recipe，让异构 tactile data 可以跨 sensors 和 embodiments 使用。

对于 contact-rich manipulation，最有意思的结果是 unseen-sensor transfer。如果 MTTS 加 shared tactile expert 能让 tactile pretraining 在下游新 sensor 上仍然有用，那么 tactile policy learning 就可以从孤立的 sensor-specific pipelines，走向可复用的 model-level starting points。

</div>
