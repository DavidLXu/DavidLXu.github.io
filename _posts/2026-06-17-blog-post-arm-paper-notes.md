---
title: "[Paper Notes] ARM: Advantage Reward Modeling for Long-Horizon Manipulation"
date: 2026-06-17
permalink: /posts/2026/06/arm-paper-notes/
tags:
  - Reward Model
  - Robot Learning
  - Long-Horizon Manipulation
  - VLA
  - Behavior Cloning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**ARM** trains a reward model for long-horizon manipulation, but the important move is subtle: it avoids asking humans or VLMs to assign an absolute progress score to every frame. Instead, it asks a simpler relative question: over a short interval, did the robot make progress, regress, or stay stagnant?

This gives the paper its core primitive:

$$
y \in \{-1, 0, +1\}
$$

where \(+1\) means **Progressing**, \(0\) means **Stagnant**, and \(-1\) means **Regressing**. A MIMO temporal transformer then turns these tri-state advantage labels into dense progress curves. Those curves are used to weight imitation learning data through **Advantage-Weighted Behavior Cloning (AW-BC)**.

The result is strong on a real long-horizon towel-folding task. Standard BC with GR00T-N1.5 reaches **62.1%** success. RA-BC with SARM reaches **78.5%**. AW-BC with ARM reaches **99.4%**, with better throughput and folding precision. My read: ARM is less about a new policy architecture and more about a scalable reward-supervision interface for messy, non-monotonic robot demonstrations.

## Paper Info

The paper is **"ARM: Advantage Reward Modeling for Long-Horizon Manipulation"** by **Yiming Mao, Zixi Yu, Weixin Mao, Yinhao Li, Qirui Hu, Zihan Lan, Minzhao Zhu, and Hua Chen**.

It appears on arXiv as [arXiv:2604.03037](https://arxiv.org/abs/2604.03037), with v2 dated **April 21, 2026**. The project page is [aiming1998.github.io/ARM](https://aiming1998.github.io/ARM).

## Problem and Motivation

Long-horizon manipulation is hard for reinforcement learning because sparse rewards are too thin for credit assignment. A binary success signal at the end of a 120-second towel-folding episode does not tell the policy which grasp, pull, fold, recovery, or placement mattered.

Dense progress rewards are the usual answer, but they are expensive and brittle. A human annotator can label subtask boundaries, but this requires careful temporal localization. A VLM can be prompted to segment videos, but it is noisy, slow, and often lacks the geometric grounding needed for fine robot state changes. A scalar progress score also assumes something that is often false: progress should monotonically increase over time.

Real robot demonstrations contain backtracking, corrections, pauses, and recovery motions. In towel folding, for example, a local adjustment can temporarily move the towel away from the final shape while still being necessary for the next fold. A progress model that only knows "later means better" will punish exactly the kind of recovery behavior that long-horizon manipulation needs.

ARM reframes the reward-labeling problem around **relative advantage**. Instead of asking "how complete is this frame?", it asks "did this interval improve the state relative to the recent past?" That makes the annotation more local, more robust to non-monotonic behavior, and easier to scale.

## Core Idea: Tri-State Advantage Labels

The labeling scheme has three classes:

- **Progressing (+1):** the state advances toward the task goal.
- **Regressing (-1):** the state deviates from the goal, hits an error, or moves toward failure.
- **Stagnant (0):** no meaningful progress is made, such as waiting or idle motion.

This is much easier than asking for frame-level normalized progress \(P \in [0, 1]\). Humans do not need to decide whether a towel is 0.43 or 0.47 complete. They only need to judge the local direction of change.

The paper also uses this tri-state supervision as a cold start. After the initial human labels, ARM can run over large unlabeled trajectory datasets and generate pseudo-labels automatically. This is where the approach becomes more scalable than manual subtask segmentation.

## Advantage Reward Model Architecture

ARM is a multimodal temporal reward model. For each timestep, it combines:

- CLIP visual features from video frames,
- robot proprioceptive state,
- task instruction text.

Each input is projected into a shared latent space:

$$
x_i = \mathrm{MLP}(v_i) + \mathrm{MLP}(s_i) + \mathrm{MLP}(g)
$$

where \(v_i\) is the visual feature, \(s_i\) is the robot state, and \(g\) is the language task embedding.

The model uses an **8-layer Transformer encoder** over a causal window:

$$
W_t = \{o_{t-4k}, \dots, o_t\}
$$

The key architectural choice is **MIMO**: Multi-Input Multi-Output. Instead of producing one scalar progress estimate for one window, ARM predicts multiple interval advantage labels in one forward pass. This lets the model share temporal context across adjacent predictions and reduces redundant sliding-window inference.

ARM has two heads:

1. **Multi-frame advantage classification head.** Predicts tri-state interval transitions \(\Delta \hat{y}\) between consecutive hidden states.
2. **Task completion head.** Predicts whether a state is a successful terminal state.

The total loss is:

$$
\mathcal{L}_{ARM} = \lambda_{int}\mathcal{L}_{int} + \lambda_{succ}\mathcal{L}_{succ}
$$

The interval loss uses cross entropy over tri-state labels. The completion loss uses focal loss, because successful terminal states are rare in long continuous trajectories.

## Global Progress Reconstruction

Tri-state labels are local. Policy learning, however, benefits from a dense progress signal over the whole episode. ARM reconstructs such a curve in three steps.

First, the MIMO model runs over clipped video segments in parallel, predicting interval advantages efficiently.

Second, segments are aligned and padded when needed, with synthetic padding ignored during final aggregation.

Third, the predicted relative transitions are integrated into a global progress curve \(P_t\), anchored by the task completion head. A successful terminal frame provides the absolute anchor, such as \(P_T = 1.0\), while earlier frames are reconstructed from accumulated predicted gains.

This turns local labels such as "progressing" or "regressing" into a dense reward-like signal that can detect dips, pauses, and recoveries instead of forcing a staircase-shaped subtask curve.

## AW-BC: Using ARM for Policy Improvement

The downstream policy training method is **Advantage-Weighted Behavior Cloning (AW-BC)**. The idea is simple: use ARM's reconstructed progress gains to weight action chunks. Good transitions get high weight; regressive or low-value transitions are suppressed.

For an action chunk with horizon \(H\), ARM defines a length-adaptive gain:

$$
\Delta G_t = (P_{t+H} - P_t) \cdot \frac{L_{seq}}{\bar{L}}
$$

Here, \(P_t\) is reconstructed progress, \(L_{seq}\) is the current episode length, and \(\bar{L}\) is the average episode length. This normalization helps avoid a bias where short episodes get artificially steep progress slopes.

Weights are computed from the batch gain distribution. If \(\mu\) and \(\sigma\) are the mean and standard deviation of gains, the paper clips gains between \(\mu - 2\sigma\) and \(\mu + 2\sigma\), then maps them into \([0, 1]\):

$$
\tilde{w}_i =
\mathrm{clamp}
\left(
\frac{\Delta G_i - b_{lower}}{b_{upper} - b_{lower} + \epsilon},
0,
1
\right)
$$

The weighted BC objective is:

$$
\mathcal{L}_{AW-BC}(\theta)
=
\mathbb{E}_{(s,a)\sim\mathcal{D}}
[-\tilde{w}(s,a)\log \pi_\theta(a|s)]
$$

This is offline policy improvement in the spirit of advantage-weighted regression: stay close to the data, but prioritize the parts of the data that actually move the task forward.

## Task and Dataset

The main benchmark is a real-world **bimanual towel-folding** task using an AgileX ALOHA-style teleoperation setup. A successful episode requires an 8-stage sequence:

1. extract exactly one towel from a cluttered pile;
2. place it on the central tabletop;
3. flatten it into a planar initial state;
4. perform a bottom-to-up longitudinal fold;
5. perform a top-to-bottom longitudinal fold;
6. perform a right-to-center lateral fold;
7. perform a left-to-right lateral fold;
8. transport and deposit the folded towel into a target box.

The trial must complete within **120 seconds**, with a single towel neatly folded and fully inside the box.

The dataset contains **972 towel-folding episodes**, about **20 hours** total:

- **809 expert demonstrations**,
- **163 DAgger-augmented error-correction episodes**.

Unlike approaches that discard slow or messy trajectories, ARM keeps them because they contain valuable recovery behavior.

The real robot setup uses three RGB views: a high global view plus left and right wrist cameras. The proprioceptive state and action are both **14-dimensional**, covering bimanual joint positions and gripper states.

## Reward Model Results

ARM is compared with SARM on reward reconstruction and terminal success identification.

| Metric | SARM | ARM |
|---|---:|---:|
| Progress reconstruction MSE ↓ | 0.0059 | 0.0014 |
| Standard episode terminal ID | 83.3% (10/12) | 100.0% (12/12) |
| Failure episode terminal ID | 91.6% (11/12) | 100.0% (12/12) |

Qualitatively, SARM produces stepped progress curves around subtask boundaries. ARM produces smoother dense curves and captures temporary downward dips during regressive adjustments. This is exactly what a long-horizon reward model should do: penalize regressions, but not erase them from the learning signal.

## Labeling and Inference Efficiency

The annotation throughput comparison is one of the paper's clearest practical wins:

| Annotation protocol | Samples per 8 hours |
|---|---:|
| Human baseline subtask segmentation | 100 |
| Human tri-state labeling | 250 |
| VLM labeling with Qwen3-VL | about 3,000 |
| Auto tri-state labeling with ARM | more than 400,000 |

Tri-state labeling is **2.5x** faster for humans than subtask segmentation. After automation, ARM scales far beyond VLM labeling.

The MIMO architecture is also much faster:

| Method | Architecture | Throughput |
|---|---|---:|
| Qwen3-VL | MISO | 1.03 it/s |
| SARM baseline | SISO | 3.9 it/s |
| ARM | MIMO | 14.1 it/s |

The paper computes ARM's effective speed from 5 parallel outputs per input. This matters because reward labeling becomes a dataset-scale operation, not a small manual step.

## Downstream Policy Results

The downstream policy uses **GR00T-N1.5-3B** with a DiT flow-matching action head. Training uses 32 NVIDIA A100 GPUs, BF16 mixed precision, action horizon 32, and three \(224 \times 224\) camera views.

The performance comparison is:

| Method | Success Rate | Throughput | Folding Precision |
|---|---:|---:|---:|
| BC baseline with GR00T-N1.5 | 62.1% | 18 episodes/hr | 2.2 |
| RA-BC with GR00T + SARM | 78.5% | 24 episodes/hr | 2.7 |
| AW-BC with GR00T + ARM | 99.4% | 32 episodes/hr | 3.6 |

The ablation separates the two main contributions:

| Method | Labeling | Training | Success |
|---|---|---|---:|
| SARM | task segmentation | RA-BC | 78.5% |
| ARM | tri-state | RA-BC | 92.3% |
| ARM | tri-state | AW-BC | 99.4% |

This shows two effects. First, tri-state labels improve reward quality even under the older RA-BC training recipe. Second, AW-BC adds another jump by turning dense relative gains into more effective action weights.

## Strengths

The main strength is the label interface. ARM asks annotators for a cognitively simple judgment that still captures the structure long-horizon manipulation needs. "Better, worse, or same" is much easier to scale than frame-level progress scoring or precise subtask boundary labeling.

The method also treats regressions as first-class events. This matters for real manipulation, where recovery is not an anomaly. If a robot adjusts a towel edge before folding, a reward model should recognize the temporary regression and still produce a coherent global signal.

The integration with policy training is clean. AW-BC does not require online environment interaction or hand-designed rewards. It turns a noisy demonstration dataset into a weighted imitation dataset where high-advantage chunks matter more.

Finally, the paper is strong on systems details: dataset size, annotation throughput, reward-model throughput, policy training hardware, camera views, action dimensions, and precision scoring protocol are all specified.

## Limitations

The main limitation is task scope. The results are compelling, but they focus on one long-horizon towel-folding setup. It remains unclear how well the same tri-state reward model transfers across very different manipulation categories, objects, or embodiments.

ARM still needs an initial supervised seed. The paper reduces annotation cost, but does not eliminate human supervision entirely.

The downstream policy training is compute-heavy: GR00T-N1.5 policy training uses **32 A100 GPUs**. The reward model itself is lighter, using **2 A100 GPUs**, but the full pipeline is still a serious systems setup.

The method also depends on visual and proprioceptive observability. If a key task variable is hidden from the cameras and robot state, the tri-state reward model may still misjudge progress.

## Takeaways

My takeaway is that ARM is a practical answer to the reward engineering bottleneck in long-horizon robot learning. The paper's best idea is not a more complicated reward scalar. It is making the supervision question simpler:

**Did this short interval help, hurt, or do nothing?**

That small shift makes reward modeling cheaper, less monotonicity-biased, and more compatible with messy demonstrations. For research taxonomy, I would label this paper:

**Reward Modeling / Long-Horizon Manipulation / Advantage-Weighted Imitation / VLA Policy Refinement**

The idea I would reuse first is tri-state advantage labeling. It feels like a nice middle ground between sparse success labels and full dense reward engineering: enough signal for credit assignment, but simple enough to scale.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**ARM** 是一个用于长程操作任务的 Reward Model，但它最关键的设计不是让人或者 VLM 给每一帧打绝对进度分数，而是把问题改成一个更局部、更简单的相对判断：这一小段动作是在推进任务、让任务倒退，还是基本停滞？

所以它的核心标签是：

$$
y \in \{-1, 0, +1\}
$$

其中 \(+1\) 表示 **Progressing**，\(0\) 表示 **Stagnant**，\(-1\) 表示 **Regressing**。一个 MIMO temporal transformer 会把这些 tri-state advantage labels 转成 dense progress curves。随后这些 progress curves 被用于 **Advantage-Weighted Behavior Cloning (AW-BC)**，给 imitation learning 数据加权。

实验结果很强。在真实长程 towel-folding 任务上，标准 GR00T-N1.5 BC 成功率是 **62.1%**，使用 SARM 的 RA-BC 是 **78.5%**，使用 ARM 的 AW-BC 达到 **99.4%**，同时 task throughput 和 folding precision 也更好。我的理解是：ARM 的重点不在于换了一个 policy architecture，而是在于给复杂、非单调、带恢复动作的机器人数据提供了一个可扩展的 reward supervision interface。

## Paper Info

论文标题是 **"ARM: Advantage Reward Modeling for Long-Horizon Manipulation"**，作者是 **Yiming Mao, Zixi Yu, Weixin Mao, Yinhao Li, Qirui Hu, Zihan Lan, Minzhao Zhu, and Hua Chen**。

论文 arXiv 页面是 [arXiv:2604.03037](https://arxiv.org/abs/2604.03037)，v2 日期是 **2026 年 4 月 21 日**。项目页是 [aiming1998.github.io/ARM](https://aiming1998.github.io/ARM)。

## 问题与动机

长程操作任务对 reinforcement learning 很难，因为 sparse reward 对 credit assignment 来说太稀疏。一个 120 秒 towel-folding episode 结束时的 binary success signal，并不能告诉 policy 哪一次抓取、拉平、折叠、恢复或放置是关键。

常见解决方案是 dense progress reward，但这又昂贵又脆弱。人可以标注 subtask boundaries，但需要非常仔细的 temporal localization。VLM 可以被 prompt 去切视频，但有噪声、慢，而且对机器人状态变化缺少精细几何 grounding。更麻烦的是，scalar progress score 往往假设 progress 会随时间单调增加，而这个假设在真实机器人数据里经常不成立。

真实演示里会有 backtracking、correction、pause 和 recovery motion。比如叠毛巾时，机器人可能先局部调整毛巾边缘，这一步会暂时让状态远离最终矩形，但它对后续折叠是必要的。如果 reward model 只知道 "later means better"，就会错误惩罚这种恢复行为。

ARM 把 reward labeling 改写成 **relative advantage** 问题。它不问 "这一帧完成了百分之多少？"，而是问 "这一小段相对前一段是否让任务变好了？" 这个问题更局部，更能处理非单调行为，也更容易规模化。

## 核心思想：Tri-State Advantage Labels

标签只有三类：

- **Progressing (+1):** 状态向任务目标推进。
- **Regressing (-1):** 状态偏离目标、发生错误或走向失败。
- **Stagnant (0):** 没有明显进展，比如等待或 idle motion。

这比让人标注每一帧的 normalized progress \(P \in [0, 1]\) 简单得多。标注者不需要判断毛巾当前是 0.43 完成还是 0.47 完成，只需要判断局部变化方向。

论文还把 tri-state supervision 用作 cold start。初始少量人工标注完成后，ARM 可以在大量未标注 trajectory 上推理，自动生成 pseudo-labels。这也是它比人工 subtask segmentation 更可扩展的地方。

## Advantage Reward Model Architecture

ARM 是一个 multimodal temporal reward model。对每个 timestep，它融合：

- 来自视频帧的 CLIP visual features；
- robot proprioceptive state；
- task instruction text。

每种输入会被投影到共享 latent space：

$$
x_i = \mathrm{MLP}(v_i) + \mathrm{MLP}(s_i) + \mathrm{MLP}(g)
$$

其中 \(v_i\) 是视觉特征，\(s_i\) 是机器人状态，\(g\) 是语言任务 embedding。

模型使用 **8-layer Transformer encoder** 处理一个 causal window：

$$
W_t = \{o_{t-4k}, \dots, o_t\}
$$

关键架构选择是 **MIMO**，也就是 Multi-Input Multi-Output。它不是对一个窗口输出一个 scalar progress，而是在一次 forward pass 中预测多个 interval advantage labels。这样相邻预测可以共享 temporal context，也减少 sliding-window inference 的重复计算。

ARM 有两个 head：

1. **Multi-frame advantage classification head.** 预测连续 hidden states 之间的 tri-state interval transitions \(\Delta \hat{y}\)。
2. **Task completion head.** 判断某个 state 是否为成功终止状态。

总 loss 是：

$$
\mathcal{L}_{ARM} = \lambda_{int}\mathcal{L}_{int} + \lambda_{succ}\mathcal{L}_{succ}
$$

interval loss 是 tri-state labels 上的 cross entropy。completion loss 使用 focal loss，因为长程连续 trajectory 里的 successful terminal states 非常稀少。

## Global Progress Reconstruction

tri-state labels 是局部信号，而 policy learning 更需要整条 episode 上的 dense progress signal。ARM 分三步重建这个曲线。

第一，MIMO model 在 clipped video segments 上并行推理，高效预测 interval advantages。

第二，对 segment 做 alignment 和 padding；最终聚合时会丢弃 synthetic padding 对应的预测。

第三，把 predicted relative transitions 积分成 global progress curve \(P_t\)，并用 task completion head 作为 anchor。成功终止帧提供绝对锚点，比如 \(P_T = 1.0\)，前面的 frame 由累计 predicted gains 重建。

这样，局部的 "progressing" 或 "regressing" 标签会被转换成 dense reward-like signal。它可以表达下降、停顿和恢复，而不是只产生阶梯状的 subtask curve。

## AW-BC: 用 ARM 做 Policy Improvement

下游 policy training 方法是 **Advantage-Weighted Behavior Cloning (AW-BC)**。思路很直接：用 ARM 重建出的 progress gains 给 action chunks 加权。好的 transitions 权重大；regressive 或低价值 transitions 被压低。

对 horizon 为 \(H\) 的 action chunk，ARM 定义 length-adaptive gain：

$$
\Delta G_t = (P_{t+H} - P_t) \cdot \frac{L_{seq}}{\bar{L}}
$$

其中 \(P_t\) 是 reconstructed progress，\(L_{seq}\) 是当前 episode 长度，\(\bar{L}\) 是平均 episode 长度。这个归一化可以避免短 episode 因为 progress slope 太陡而被过度偏好。

权重来自 batch gain distribution。如果 \(\mu\) 和 \(\sigma\) 是 gains 的均值和标准差，论文把 gain 裁剪到 \(\mu - 2\sigma\) 和 \(\mu + 2\sigma\) 之间，再映射到 \([0, 1]\)：

$$
\tilde{w}_i =
\mathrm{clamp}
\left(
\frac{\Delta G_i - b_{lower}}{b_{upper} - b_{lower} + \epsilon},
0,
1
\right)
$$

weighted BC objective 是：

$$
\mathcal{L}_{AW-BC}(\theta)
=
\mathbb{E}_{(s,a)\sim\mathcal{D}}
[-\tilde{w}(s,a)\log \pi_\theta(a|s)]
$$

这相当于一种离线 policy improvement：仍然贴近数据，但优先学习真正推进任务的片段。

## 任务与数据集

主要 benchmark 是真实世界 **bimanual towel-folding** 任务，使用 AgileX ALOHA 风格的 teleoperation setup。一次成功 episode 需要完成 8 个阶段：

1. 从杂乱毛巾堆里抽出且只抽出一条毛巾；
2. 放到中央桌面；
3. 拉平成平面初始状态；
4. 完成 bottom-to-up longitudinal fold；
5. 完成 top-to-bottom longitudinal fold；
6. 完成 right-to-center lateral fold；
7. 完成 left-to-right lateral fold，形成紧凑矩形；
8. 把折好的毛巾放入左侧目标箱。

任务需要在 **120 秒** 内完成，并且必须是一条毛巾被整齐折叠并完全放入 box。

数据集包含 **972 条 towel-folding episodes**，总计约 **20 小时**：

- **809 条 expert demonstrations**；
- **163 条 DAgger-augmented error-correction episodes**。

和会丢弃慢速或不干净 trajectories 的方法不同，ARM 保留这些数据，因为其中包含有价值的 recovery behavior。

真实机器人使用三个 RGB 视角：一个全局 high view，加上左右 wrist cameras。proprioceptive state 和 action 都是 **14 维**，覆盖双臂关节位置和 gripper states。

## Reward Model Results

ARM 和 SARM 在 reward reconstruction 与 terminal success identification 上对比：

| Metric | SARM | ARM |
|---|---:|---:|
| Progress reconstruction MSE ↓ | 0.0059 | 0.0014 |
| Standard episode terminal ID | 83.3% (10/12) | 100.0% (12/12) |
| Failure episode terminal ID | 91.6% (11/12) | 100.0% (12/12) |

定性上，SARM 会在 subtask boundaries 附近产生阶梯状 progress curve。ARM 产生更平滑的 dense curve，并且能捕捉 regressive adjustment 造成的短暂下跌。这正是长程 reward model 应该做的事：识别退步，但不要把它从学习信号中抹掉。

## 标注与推理效率

标注吞吐对比是这篇论文很清楚的实用价值点：

| Annotation protocol | Samples per 8 hours |
|---|---:|
| Human baseline subtask segmentation | 100 |
| Human tri-state labeling | 250 |
| VLM labeling with Qwen3-VL | about 3,000 |
| Auto tri-state labeling with ARM | more than 400,000 |

对人类标注者来说，tri-state labeling 比 subtask segmentation 快 **2.5x**。自动化后，ARM 的规模化能力远高于 VLM labeling。

MIMO 架构也更快：

| Method | Architecture | Throughput |
|---|---|---:|
| Qwen3-VL | MISO | 1.03 it/s |
| SARM baseline | SISO | 3.9 it/s |
| ARM | MIMO | 14.1 it/s |

论文把 ARM 的有效速度计算为每个 input 并行输出 5 个预测。这个效率很重要，因为 reward labeling 在这里已经不是小规模人工步骤，而是 dataset-scale operation。

## Downstream Policy Results

下游 policy 使用 **GR00T-N1.5-3B**，配 DiT flow-matching action head。训练使用 32 张 NVIDIA A100，BF16 mixed precision，action horizon 32，以及三个 \(224 \times 224\) camera views。

性能对比如下：

| Method | Success Rate | Throughput | Folding Precision |
|---|---:|---:|---:|
| BC baseline with GR00T-N1.5 | 62.1% | 18 episodes/hr | 2.2 |
| RA-BC with GR00T + SARM | 78.5% | 24 episodes/hr | 2.7 |
| AW-BC with GR00T + ARM | 99.4% | 32 episodes/hr | 3.6 |

ablation 把两个主要贡献拆开：

| Method | Labeling | Training | Success |
|---|---|---|---:|
| SARM | task segmentation | RA-BC | 78.5% |
| ARM | tri-state | RA-BC | 92.3% |
| ARM | tri-state | AW-BC | 99.4% |

这说明两件事。第一，tri-state labels 即使配旧的 RA-BC training recipe，也能显著提升 reward quality。第二，AW-BC 进一步把 dense relative gains 转成更有效的 action weights。

## 优点

最主要的优点是 label interface。ARM 让标注者回答一个认知负担很低、但对长程操作很有用的问题。"变好了、变差了、还是没变" 比 frame-level progress scoring 或精确 subtask boundary labeling 更容易规模化。

它也把 regression 当成一等公民。真实 manipulation 里，recovery 不是异常。机器人在折叠前调整毛巾边缘时，reward model 应该识别短暂退步，同时仍然保持全局 progress signal 一致。

和 policy training 的连接也很干净。AW-BC 不需要 online environment interaction，也不需要手写 reward。它把 noisy demonstration dataset 转换成 weighted imitation dataset，让 high-advantage chunks 更重要。

最后，这篇论文的系统细节比较完整：dataset size、annotation throughput、reward-model throughput、policy training hardware、camera views、action dimensions、precision scoring protocol 都给得比较具体。

## 局限

主要局限是任务范围。结果很有说服力，但集中在一个 long-horizon towel-folding setup 上。tri-state reward model 是否能很好迁移到完全不同的 manipulation category、object 或 embodiment，还需要更多验证。

ARM 仍然需要初始 supervised seed。它降低了 annotation cost，但没有完全消除人工监督。

下游 policy training 的算力需求很高：GR00T-N1.5 policy training 使用 **32 张 A100**。reward model 本身轻一些，使用 **2 张 A100**，但完整 pipeline 仍然是一个重系统。

方法也依赖视觉和 proprioception 能观察到关键任务变量。如果关键状态被遮挡，且 robot state 也无法反映，tri-state reward model 仍然可能误判 progress。

## Takeaways

我的 takeaway 是，ARM 是一个很实用的长程机器人学习 reward engineering bottleneck 解决方案。它最好的点不是设计了一个更复杂的 reward scalar，而是把监督问题简化成：

**这一小段动作让任务变好了、变差了，还是没变化？**

这个小改动让 reward modeling 更便宜、更少受 monotonicity 假设束缚，也更适合混乱的真实演示数据。如果放进我的分类体系，我会把它标成：

**Reward Modeling / Long-Horizon Manipulation / Advantage-Weighted Imitation / VLA Policy Refinement**

我最想复用的想法是 tri-state advantage labeling。它介于 sparse success labels 和完整 dense reward engineering 之间：信号足够支撑 credit assignment，又足够简单，能规模化。

</div>
