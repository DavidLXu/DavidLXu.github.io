---
title: "[Paper Notes] Flora: An Open Model Suite for Scaling Robotics Data Engines"
date: 2026-10-25
permalink: /posts/2026/10/flora-paper-notes/
excerpt: "Flora segments and captions robot videos and labels execution quality; the notes explain its training recipe, benchmark tradeoffs, and conditional cost estimate."
tags:
  - Robot Data
  - Video Annotation
  - Reward Models
  - Paper Notes
---

<div id="flora-en" data-lang="en" markdown="1">

## TL;DR

Flora turns existing human and robot videos into timestamped action instructions and reward annotations. It combines a segmenter, a captioner, and a reward model. The segmenter and captioner receive supervised fine-tuning and reinforcement learning; the released reward model uses supervised fine-tuning.

This identifies the “Flora” associated with Jim Fan: **a robotics data engine**, with video labeling as its central job. Its approximately 125× cost advantage over maximum-effort Astra is an engineering estimate with explicit deployment assumptions. The strongest reason to read the report is how it separates event boundaries, intended actions, and execution quality.

## Report and source version

**Flora: An Open Model Suite for Scaling Robotics Data Engines** — Sicong Leng, Yunze Man, Zhiqi Li, Jing Wang, Yuhe Zhang, Ryan Punamiya, Siddharth Patki, Kaiyuan Zheng, Zi-ang Cao, Zhiding Yu, Sifei Liu, Danfei Xu, Ben Levin, Jan Kautz, Yuke Zhu, Johan Bjorck, and Linxi “Jim” Fan, NVIDIA. These notes follow the technical report linked by the [official project](https://research.nvidia.com/labs/gear/flora/), downloaded October 25, 2026: [PDF](https://research.nvidia.com/labs/gear/flora/assets/paper/flora.pdf?v=2026-10-19c). The source URL carries the revision marker 2026-10-19c; it is not an arXiv version number.

These notes focus on Section 4 and Appendices D, F, and G. Model weights are linked in the [official Flora collection](https://huggingface.co/collections/nvidia/flora).

## Segment first, then describe the intended action

A useful action label needs both a description and the interval over which it applies. Flora produces

$$
\mathcal A(X)=\{(s_i,e_i,c_i)\}_{i=1}^{N},
$$

where $c_i$ describes the action intended during $[s_i,e_i)$. An attempted insertion can receive an insertion instruction even when it fails; execution quality is labeled separately.

The segmenter processes overlapping video windows. Each window has a central region from which predictions are emitted and surrounding context used to interpret boundaries. Predicted intervals carry flags indicating whether an action continues beyond either window edge. A deterministic procedure converts local timestamps to episode time and stitches compatible fragments. Concurrent actions can retain separate intervals. Shifted windows provide another pass for boundary refinement.

For each resulting interval, the captioner sees target frames plus frames from neighboring non-overlapping events:

$$
c_i=g_\varphi(X_i^{-},X_i,X_i^{+},q_{\rm cap}).
$$

Before, target, and after blocks are explicitly identified. Context helps resolve the manipulated object and local intent, while the generated instruction stays tied to the target interval. Synchronized camera views can be tiled into a single image per sampled time. This division lets temporal localization and language quality be evaluated separately.

## Three reward outputs, with different meanings

One task-conditioned model supports outcome, dense, and rubric-based rewards. The outcome mode assigns one of five completion levels. A continuous score can be computed from the expected score-token value, rescaled to $\lbrack 0,1\rbrack$.

Dense labeling assigns **normal, suboptimal, or failure** to half-second steps. These labels are retrospective. Later observations can reveal an earlier mistake, while a later recovery does not erase it. Windows cover 16 seconds and advance by ten; the last four seconds of each non-final window are discarded so retained labels have later evidence. These annotations are designed for offline processing. Using them as a causal live reward would require changing the information available to the model.

Rubric mode receives user-defined task steps and allowed credit values. The maximum credits sum to one, and the model assigns one permitted value per step:

$$
R_\rho(X)=\sum_j\hat y_j,\qquad
\hat y_j\in V_j,\qquad \sum_j\max V_j=1.
$$

This allows the evaluation target to specify partial completion without changing model weights. It also makes the rubric part of the measurement protocol: two rubrics need not produce comparable scores.

## The training recipe follows the output structure

The segmenter starts from Qwen3.5-9B; captioning and reward models start from Qwen3.5-27B. Data combines public, licensed proprietary, and internally collected sources with human annotations.

All three use token cross-entropy for supervised adaptation. The segmenter trains LoRA parameters with its visual encoder frozen. Captioning updates the language model and visual merger. Reward training also updates the visual encoder at a lower learning rate; outcome, dense, and rubric examples are shuffled together for one epoch.

The segmenter then receives GRPO with a verifiable reward:

$$
r_{\rm seg}=0.45F_{0.5}+0.15F_{0.75}+0.25P_{0.5}+0.15B,
$$

combining temporal F1, precision, and boundary/continuation accuracy. Captioner GRPO uses a reference-grounded point score,

$$
r_{\rm cap}=\frac{2M}{R+M+F},
$$

where $R$ is supported reference mass, $M$ is covered mass, and $F$ penalizes factual errors supported by the evidence. Both retain KL regularization to the fixed supervised policy. Validation selects the two checkpoints independently.

## Good segmentation does not guarantee the best caption

On WGO-Bench's 100 episodes, Flora reaches **50.3% segmentation F1** at temporal IoU 0.75, ahead of Astra's 46.0%. Its joint semantic F1 is **34.5%**, below Astra's 39.0%; gold-window caption accuracy is 64.7%, versus 77.4%. The advantage is therefore more pronounced in temporal localization.

On the internal DenseCaptionBench, Flora's joint point F1 is 37.4% on Human100 and 51.0% on Robot200, compared with Astra's 29.7% and 57.9%. DenseRewardBench macro F1 is 46.2% versus 40.7%, while rubric pooled L1 error favors Astra, 3.6 versus Flora's 6.5 in the table's scaled units. The report supports a useful suite of complementary capabilities, with clear remaining errors.

These comparisons evaluate complete systems with different visual input packaging and inference compute. They do not isolate an architecture effect under an identical compute budget.

## Read the cost claim through Appendix D

The report compares an estimated **US$0.7224 per source-video hour** for Flora with **US$88.4922** for maximum-effort Astra, a ratio of 122.49 summarized as approximately 125×. Flora assumes eight GB300 GPUs, US$10 per GPU-hour, and a conditional serving rate of 1.23495 episodes per second. The throughput uses an earlier workload and a deployment model; the report explicitly says its production GPU-hour denominator has not been verified.

The API accounting uses October 4, 2026 prices and excludes training, reference construction, and judging. Some requests lack priced usage. Flora's estimate excludes storage and deployment overheads, and its scenario range is not a confidence interval. The separate claim of labeling 200,000 video hours daily across 512 GB300s is reported production scale, not a single-GPU throughput measurement.

I would first test Flora on a small labeled sample of the intended dataset, separating boundary errors, action-description errors, and failure-label errors. For policy training, the next experiment should measure whether these labels improve the downstream policy. Annotation benchmark accuracy alone does not quantify that benefit.

</div>

<div id="flora-zh" data-lang="zh" markdown="1" style="display: none;">

## TL;DR

Flora 将现有的人类与机器人视频转换成带时间戳的动作指令和奖励标注。系统包含时间分割模型、描述模型与奖励模型。前两者接受监督微调和强化学习，发布的奖励模型则使用监督微调。

这就是 Jim Fan 参与的 **Flora 机器人数据引擎**，核心工作是视频标注。报告中相对最大推理强度 Astra 约 125 倍的成本优势，来自带有明确部署假设的工程估算。更值得关注的是，它如何分别处理事件边界、动作意图和执行质量。

## 报告与原文版本

**Flora: An Open Model Suite for Scaling Robotics Data Engines**，作者：Sicong Leng, Yunze Man, Zhiqi Li, Jing Wang, Yuhe Zhang, Ryan Punamiya, Siddharth Patki, Kaiyuan Zheng, Zi-ang Cao, Zhiding Yu, Sifei Liu, Danfei Xu, Ben Levin, Jan Kautz, Yuke Zhu, Johan Bjorck, and Linxi “Jim” Fan，NVIDIA。本文依据[官方项目](https://research.nvidia.com/labs/gear/flora/)链接的技术报告，下载于 2026 年 10 月 25 日：[PDF 全文](https://research.nvidia.com/labs/gear/flora/assets/paper/flora.pdf?v=2026-10-19c)。源链接带有 2026-10-19c 修订标识，这不是 arXiv 版本号。

本文重点阅读第 4 节和附录 D、F、G。模型权重见[官方 Flora 集合](https://huggingface.co/collections/nvidia/flora)。

## 先定位时间区间，再描述动作意图

一条可用的动作标注，需要同时说明做什么，以及发生在哪段时间。Flora 输出：

$$
\mathcal A(X)=\{(s_i,e_i,c_i)\}_{i=1}^{N},
$$

其中 $c_i$ 描述区间 $[s_i,e_i)$ 内的动作意图。即使插入失败，这段视频仍可以对应“插入”的指令，执行质量由另一类标签记录。

时间分割模型处理相互重叠的视频窗口。每个窗口划分为中央输出区和外围上下文，预测片段还包含动作是否延续到左右边界之外的标志。确定性的后处理将局部时间换算为整段视频时间，再拼接兼容片段；并发动作可以保留独立区间。移动窗口位置后，还能进一步修正边界。

对每个重建区间，描述模型读取目标帧，以及前后相邻、不重叠事件中的上下文帧：

$$
c_i=g_\varphi(X_i^{-},X_i,X_i^{+},q_{\rm cap}).
$$

输入明确标注前、当前、后三个部分。上下文帮助确定物体和局部意图，但生成指令仍限定于目标区间。多相机录像可以在同一采样时刻拼成一张图。时间定位与语言质量因此能够分开评估。

## 三种奖励输出分别表达什么

同一个任务条件化模型支持结果奖励、密集奖励和 rubric 评分。结果模式给出五档完成程度，也可以根据分数 token 的期望值构造 $\lbrack 0,1\rbrack$ 连续得分。

密集模式每半秒标注一次**正常、次优或失败**。这些是回溯标签：后续画面可能揭示之前的错误，但之后恢复成功不会抹去早先的失误。窗口长度为 16 秒、步长为十秒，非末尾窗口会丢弃最后四秒的标签，让保留部分拥有后续视觉证据。因此，该输出面向离线标注；若要用于因果在线奖励，需要重新限定模型可访问的信息。

Rubric 模式接收用户定义的任务步骤及各步骤允许的分值，所有步骤的最高分之和为一：

$$
R_\rho(X)=\sum_j\hat y_j,\qquad
\hat y_j\in V_j,\qquad \sum_j\max V_j=1.
$$

这样无需修改模型权重就能定义部分完成的奖励，但 rubric 本身也成为测量协议的一部分，不同评分表产生的数值未必可比。

## 训练方式与输出结构对应

分割模型以 Qwen3.5-9B 初始化，描述模型和奖励模型以 Qwen3.5-27B 初始化。训练数据混合公开数据、获授权的专有数据，以及内部采集与人工标注的数据。

三种模型都使用 token 交叉熵进行监督适配。分割模型冻结视觉编码器，仅训练 LoRA；描述模型更新语言模型和视觉 merger；奖励模型还更新视觉编码器，但为它使用更低学习率。三类奖励样本混合打乱，训练一个 epoch。

随后，分割模型用 GRPO 优化可验证奖励：

$$
r_{\rm seg}=0.45F_{0.5}+0.15F_{0.75}+0.25P_{0.5}+0.15B,
$$

其中包含不同时间 IoU 阈值的 F1、精确率，以及边界和延续标志准确度。描述模型的 GRPO 奖励为：

$$
r_{\rm cap}=\frac{2M}{R+M+F},
$$

$R$ 表示有依据的参考内容总量，$M$ 表示已覆盖内容，$F$ 惩罚由证据确认的事实错误。两者都保留相对于固定监督策略的 KL 正则项，并通过验证集分别选取 checkpoint。

## 时间分割更好，不等于描述也全面领先

在包含 100 个回合的 WGO-Bench 上，Flora 的时间 IoU 0.75 分割 F1 为 **50.3%**，高于 Astra 的 46.0%。联合语义 F1 则为 **34.5%**，低于 Astra 的 39.0%；使用标准时间窗口时，描述准确率为 64.7%，Astra 为 77.4%。收益主要体现在时间定位。

内部 DenseCaptionBench 中，Flora 在 Human100 和 Robot200 上的联合 point F1 分别为 37.4% 和 51.0%，Astra 为 29.7% 和 57.9%。DenseRewardBench 的 macro F1 为 46.2%，高于 Astra 的 40.7%；rubric 的 pooled L1 误差则由 Astra 领先，按表中缩放单位分别为 3.6 和 6.5。这是一组具有互补能力、仍存在明显误差的模型。

上述比较评估的是完整系统，各方法的视觉输入组织和推理计算量不同，因此不能单独归因于相同计算预算下的模型结构优势。

## 成本结论要连同附录 D 一起读

报告将 Flora 的估算成本 **每小时源视频 0.7224 美元**与最大推理强度 Astra 的 **88.4922 美元**比较，得到 122.49 倍，再概括为约 125 倍。Flora 假设使用八张 GB300，每 GPU 小时十美元，条件化服务速率为每秒 1.23495 个回合。这一吞吐率来自早期工作负载和部署模型；报告明确说明，生产环境 GPU 小时分母尚未验证。

API 成本采用 2026 年 10 月 4 日价格，不包含训练、参考标注构造和评审，部分请求也缺少可计价的 usage。Flora 估算不含存储和部署额外开销，其情景范围也不是置信区间。另一个“512 张 GB300 每日标注 20 万小时视频”的数字描述作者报告的生产规模，不能当作单 GPU 吞吐率。

我会先在目标数据集的一小部分人工标注样本上验证 Flora，分别检查时间边界、动作描述和失败标签。若用于训练策略，下一步应直接测量这些标签是否改善下游策略，不能用标注基准成绩替代这个问题。

</div>
