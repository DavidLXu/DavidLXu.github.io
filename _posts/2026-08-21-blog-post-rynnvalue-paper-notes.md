---
title: "[Paper Notes] RynnValue: Scaling Robotic Value Foundation Models with Temporal Distance"
date: 2026-08-21
permalink: /posts/2026/08/rynnvalue-paper-notes/
tags:
  - Robot Learning
  - Reward Models
  - Value Models
  - Reinforcement Learning
  - Vision-Language Models
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**RynnValue** is an open-source robotic value foundation model built around a simple target: given a language instruction and robot observations, predict the **remaining time in seconds until task completion**. This temporal distance acts as a directed, goal-conditioned cost-to-go. Its labels come from timestamps and relabeled completion cutoffs, allowing training on more than **7,000 hours**, **1.67M original episodes**, and **3.09M instruction-conditioned segments** without trajectory-preference labels or per-task normalized-progress annotations.

The model uses absolute and relative temporal heads, irregular frame sampling, temporal-order shuffling, and value-isolation attention. These choices prevent easy shortcuts such as inferring progress from frame index, regular sampling intervals, or neighboring value queries. On the six-dataset RBM-EVAL-OOD trajectory-ranking benchmark, RynnValue-8B reaches **0.675 average Kendall's \(\tau_a\)**, above preference-supervised Robometer at 0.655 and far above its progress-only variant at 0.292.

RynnValue does not emit an action reward directly. It predicts an observation potential \(\Phi_t=-v_t\), where \(v_t\) is remaining time. Potential differences provide dense reward shaping while a manually annotated sparse terminal signal preserves the final task objective. In four unseen real-robot tasks, the resulting reward interface achieves **72.5% average online-RL success** versus 52.5% for Robometer, and **82.5% offline-RL success** versus 63.8%.

## Paper Info

**“RynnValue: Scaling Robotic Value Foundation Models with Temporal Distance”** is by **Dongchi Huang, Hongyin Zhang, Bohan Hou, Siteng Huang, Zhian Su, Hang Guo, Tong Lu, Zhaofeng Xu, Jiahao Tang, Jianfei Yang, Donglin Wang, Peixi Peng, Mingxiu Chen, Deli Zhao, and Xin Li** from DAMO Academy, Alibaba Group, and Hupan Lab. This note covers [arXiv:2608.09853v1](https://arxiv.org/abs/2608.09853), dated August 11, 2026. The authors release a [project page](https://alibaba-damo-academy.github.io/RynnValue.github.io/), [code](https://github.com/alibaba-damo-academy/RynnValue), and [4B/8B checkpoints](https://huggingface.co/collections/Alibaba-DAMO-Academy/rynnvalue).

## 1. Is RynnValue a Reward Model?

RynnValue can serve as a reward model, though its learned object is more precisely a **goal-conditioned state-value potential**. Its input is a task instruction, embodiment metadata, and a short sequence of visual observations. Its main output is the time remaining until the instruction is completed. The model does not score actions, predict transition rewards, or estimate an action-conditioned \(Q(s,a)\).

The complete pipeline is:

```text
instruction + observation history
                 ↓
     predicted remaining time v_t
                 ↓
          potential Φ_t = -v_t
                 ↓
dense shaping κ(γΦ_{t+1} - Φ_t) + sparse task reward
                 ↓
        offline or online robot RL
```

This distinction matters. RynnValue learns a reusable notion of “how far this visual state is from the language goal.” A downstream RL algorithm turns changes in that potential into rewards.

## 2. Temporal Distance as the Scaling Target

General-purpose robotic reward models commonly use one of three anchors: human or model preferences between trajectories, comparison with reference demonstrations, or normalized task progress in \([0,1]\). Each anchor creates friction at scale. Preferences require comparison labels; references require an appropriate successful trajectory; normalized progress has no shared physical meaning across a ten-second pick and a one-minute bimanual task.

RynnValue labels an observation at timestamp \(t_i\) using the relabeled goal-completion cutoff \(t_G\):

\[
v_i^*=\max(0,t_G-t_i).
\]

Observations at or after completion receive zero. A second target captures signed local displacement between consecutively presented frames:

\[
\Delta_i^*=t_{i+1}-t_i.
\]

Positive \(\Delta_i^*\) indicates forward movement through the recorded trajectory; negative values arise when training frames are deliberately presented in reverse temporal order. Absolute distance anchors each state to completion, while relative distance teaches local temporal direction.

Temporal distance preserves seconds as a common unit. It also avoids a separate progress-normalization recipe for every dataset. This choice gives the model a cost-to-go interpretation under an approximately minimum-time objective.

## 3. Architecture: One Backbone, Three Outputs

RynnValue builds on the embodied multimodal model **RynnBrain**. The main configuration samples \(K=8\) observations. Each observation receives an absolute-value query group with \(N=8\) repeated tokens; observations after the first also receive an eight-token relative-value group. Tokens within a group exchange information, and their hidden states are concatenated before prediction. The grouped representation can preserve cues about object configuration, robot–object interaction, task stage, and completion evidence.

Two distributional heads produce numerical outputs:

- The **absolute head** predicts remaining time on \([0,512]\) seconds.
- The **relative head** predicts signed displacement on \([-256,256]\) seconds.

Each range is divided into **256 symlog-spaced bins**. Continuous targets are represented with two-hot labels over adjacent bins. At inference, the expected symlog-space bin center is transformed back to seconds. This classification formulation compresses large values, preserves precision near zero, and prevents large temporal targets from dominating gradient scale.

The original language-model head generates a structured analysis after the temporal queries:

```text
Video Description: ...
Match: Yes / No
Success: Yes / No
```

These language outputs help the shared representation understand events, instruction alignment, and completion. They are not fed back into the temporal predictions.

## 4. Scaling Heterogeneous Robot Data

The training mixture spans real robots, simulation, egocentric human videos, single- and dual-arm systems, dexterous hands, mobile manipulation, and many camera layouts.

| Source | Original episodes | Instruction-conditioned segments |
|---|---:|---:|
| AgiBot | 167,535 | 1,166,042 |
| EgoDex | 338,234 | 338,234 |
| Galaxea Open-World | 16,979 | 95,671 |
| InternData-A1 | 320,905 | 320,905 |
| Open X-Embodiment | 693,037 | 693,037 |
| RDT | 6,109 | 6,109 |
| RoboCOIN | 67,420 | 410,877 |
| RoboMIND | 32,138 | 32,138 |
| RoboTwin | 27,414 | 27,414 |
| Soft-FOLD | 1,542 | 1,542 |
| **Total** | **1,671,313** | **3,091,969** |

The resulting corpus contains **223,395 unique instructions** and more than 7,000 hours. Long episodes are split using native subtask annotations when available; otherwise, the full episode remains a coarse segment. Each segment then receives a completion cutoff. The endpoint is the default, with dataset-specific ratio or duration trimming used where post-completion motion would corrupt the target.

Source-aware curation removes placeholders, data-quality metadata, malformed commands, and pure locomotion segments without a manipulation goal. In the four corpora analyzed in the appendix, the pipeline retains 83.35% of trajectory units and 98.99% of unique valid instructions, suggesting that removal is concentrated in repeated annotation noise.

## 5. Preventing Temporal Shortcuts

Timestamp labels are cheap, but a multi-frame model can solve the training task without understanding manipulation. Uniformly spaced chronological frames expose several shortcuts: later sequence positions usually have lower remaining time, neighboring values often follow an arithmetic pattern, and successful training videos usually progress monotonically.

RynnValue uses four mechanisms to break these correlations:

1. **Random temporal sampling:** eight observations are drawn at irregular timestamps, removing fixed value increments.
2. **Temporal-order shuffling:** half of the sequences are unsorted; the remainder use a forward-biased walk with 0.3 rewind probability. Frame position no longer implies progress.
3. **Value-isolation attention:** value-query groups from different observations cannot attend to one another, and context tokens cannot absorb earlier value queries. Each estimate must use its own visual-language context.
4. **Instruction-mismatch augmentation:** 10% of samples receive an instruction from another trajectory. The language branch predicts `Match: No` and `Success: No`; the invalid absolute target is masked while the instruction-independent relative target remains active.

The final loss is

\[
\mathcal L=\mathcal L_{\mathrm{abs}}+
\mathcal L_{\mathrm{rel}}+2\mathcal L_{\mathrm{lang}}.
\]

The absolute and relative heads plus the shared backbone receive gradients. The LM output projection stays frozen, while the language loss still updates backbone representations through it.

## 6. From Value to Dense Reward

At inference, observations return to chronological order and RynnValue predicts non-negative remaining time \(v_t\). Sign reversal produces a higher-is-better potential:

\[
\Phi_t=-v_t.
\]

Potential approaches zero as the task reaches completion. The RL experiments use

\[
r_t'=r_t^{\mathrm{sparse}}+
\kappa\left(\gamma\Phi_{t+1}-\Phi_t\right),
\]

with

\[
r_t^{\mathrm{sparse}}=
\begin{cases}
0,&\text{if the action completes the task successfully},\\
-1,&\text{otherwise}.
\end{cases}
\]

The shaping term rewards reductions in predicted remaining time and penalizes regressions. Potential-based shaping has a policy-invariance motivation, while the sparse completion term guards the final objective against reward-model noise.

The terminal signal is still manually annotated. Operators also determine task success and episode termination; reward models supply only the shaping potential. RynnValue therefore improves sparse reward density without eliminating task-level success supervision in the reported policy-learning experiments.

For comparison, the shaping coefficient is fixed across tasks at \(\kappa=0.1\) for RynnValue and \(\kappa=1.0\) for Robometer. Each trajectory is scored from the task instruction and one third-person RGB stream. Histories are uniformly subsampled to four frames during RL reward inference to match Robometer's protocol.

## 7. Reward-Model Benchmark Results

RBM-EVAL-OOD contains 976 failed, suboptimal, and successful trajectories across six held-out robot datasets. The benchmark measures Kendall's \(\tau_a\) between human trajectory-quality ordering and model ordering. RynnValue scores a trajectory using the negative predicted remaining time at its final queried observation.

| Model | Preference supervision | Average Kendall's \(\tau_a\) |
|---|---:|---:|
| Robometer, progress only | No | 0.292 |
| RoboReward-4B | No preference pairs | 0.502 |
| Robometer, RBM-1M | Yes | 0.655 |
| **RynnValue-4B** | **No** | **0.670** |
| **RynnValue-8B** | **No** | **0.675** |

The 4B and 8B variants are nearly tied, suggesting that the supervision recipe and anti-shortcut design contribute more than parameter count in this range. In an instruction–trajectory confusion test, RynnValue obtains a **0.79 normalized diagonal margin**, compared with 0.67 for the strongest baseline, showing stronger language-goal grounding.

The ablation table makes the shortcut problem especially clear:

| Variant | Average Kendall's \(\tau_a\) |
|---|---:|
| Without temporal-order shuffling | 0.189 |
| Uniform temporal sampling | 0.379 |
| Without value-isolation attention | 0.482 |
| Without language supervision | 0.537 |
| Without relative temporal prediction | 0.627 |
| **Full RynnValue-8B** | **0.675** |

Removing shuffling causes the largest collapse. A model that always sees ordered sequences can learn “later frame means better” and still fit its labels. Random gaps and isolated queries force more visual reasoning.

## 8. Data Diversity Matters More Than Repetition

The paper separately scales episode count and the number of training tasks while keeping total episode counts comparable at each fraction. Additional episodes from the same tasks saturate quickly. Increasing task diversity reduces held-out temporal-distance error across the full scaling range.

This result changes the interpretation of “more robot data.” For value learning, repeated successful executions of a narrow skill family provide limited new information after basic visual dynamics are learned. New goal structures, failure modes, objects, embodiments, and viewpoints expose the model to qualitatively different cost-to-go relationships.

## 9. Real-World Policy Learning

The reward model is evaluated zero-shot on four tasks using a dual-arm Franka system; their tasks, objects, and scenes are absent from RynnValue training. Each policy is tested over 20 trials.

### Online RL

| Reward | Bread basket | Steak + spatula | Box + drawer | Bimanual transfer | Average |
|---|---:|---:|---:|---:|---:|
| Sparse | 40% | 45% | 40% | 70% | 48.8% |
| Robometer | 35% | 45% | 65% | 65% | 52.5% |
| **RynnValue** | **45%** | **75%** | **70%** | **100%** | **72.5%** |

Online training uses DSRL to optimize latent noise for a frozen \(\pi_{0.5}\) action decoder. Bread Basket and Steak Serving start from SFT policies; Box-in-Drawer and Bimanual Transfer start from the same Robometer-based offline-RL checkpoints for every online reward variant. Each task uses 60 online trajectories and 6,000 training steps.

### Offline RL

| Reward / policy | Bread basket | Steak + spatula | Box + drawer | Bimanual transfer | Average |
|---|---:|---:|---:|---:|---:|
| SFT | 70% | 25% | 0% | 0% | 23.8% |
| Sparse IQL | 70% | 20% | 0% | 0% | 22.5% |
| Robometer IQL | 80% | 80% | 50% | 45% | 63.8% |
| **RynnValue IQL** | **100%** | **90%** | **90%** | **50%** | **82.5%** |

Offline IQL relabels the same 410-trajectory mixed-expertise dataset for every reward variant. The dataset is heavily success-dominated: 398 successes and 12 failures. RynnValue still provides enough intra-trajectory structure to outperform sparse IQL and Robometer, especially on Box-in-Drawer, where SFT and sparse IQL never succeed.

The smallest online gap appears on Box-in-Drawer: RynnValue reaches 70% and Robometer 65%. Precise grasp stability and box–drawer alignment can look similar in third-person RGB even when physical outcomes differ. The paper uses this case to expose a sensing limitation of visual reward models.

## 10. Strengths and Limitations

RynnValue's main strength is a supervision target that can be generated across heterogeneous corpora with minimal annotation. Temporal seconds form a shared interface across datasets, and the ablations convincingly show that this apparent simplicity needs aggressive shortcut suppression. The work also closes the loop from intrinsic value evaluation to offline and online policy improvement, with released code, models, benchmark adapters, and RL infrastructure.

The central assumption deserves care. Logged remaining time is produced by the behavior policy, operator speed, control frequency, hesitation, and the chosen completion cutoff. It equals an optimal minimum-time cost-to-go only under strong conditions. Two visually identical states can receive different labels when one trajectory pauses or follows a slower controller. Task diversity may help average over these effects, but the paper does not explicitly identify an embodiment-invariant optimal hitting time.

Completion cutoffs are also a source of supervision noise. Native subtask annotations are used when available; coarse episodes may retain their endpoint, and some datasets receive ratio- or duration-based trimming. This recipe is cheaper than preference labeling, yet it still depends on source-specific curation and cutoff assumptions.

The real-world reward pipeline retains manually annotated success and termination. RynnValue supplies shaping, so the experiments do not demonstrate a fully autonomous replacement for terminal rewards. Reward models use only a third-person RGB history and language; they lack proprioception, force, tactile input, and explicit geometry. The Box-in-Drawer result shows the consequence for precision-sensitive contact states.

Evaluation uses 20 rollouts per policy, four real tasks, and one Franka platform. RynnValue and Robometer use different fixed shaping coefficients, which is practical tuning but complicates a pure comparison of raw potential quality. The short observation window and four-frame RL inference also limit long-horizon memory. The authors identify streaming inference, longer horizons, dexterous hands, mobile manipulation, and richer energy/safety/precision costs as future directions.

## Takeaway

RynnValue treats reward modeling as **learning a reusable temporal potential**. Timestamps provide cheap supervision; absolute and relative heads learn global and local temporal structure; shuffled sampling and isolated queries prevent positional shortcuts; potential differences convert remaining time into dense reward for robot RL.

The paper's most useful contribution is the interface boundary. The foundation model answers, “How many seconds of goal-directed work appear to remain?” The RL system decides how changes in that estimate should shape behavior, while a sparse terminal label secures the final objective. The strong OOD ranking and real-policy gains make temporal distance a compelling scaling target, while the gap between logged time and true optimal cost-to-go remains the key conceptual question.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**RynnValue** 是一个开源 robotic value foundation model，其监督目标非常直接：给定 language instruction 和 robot observations，预测**距离任务完成还剩多少秒**。这个 temporal distance 可以被理解为 directed、goal-conditioned cost-to-go。标签由 timestamps 和重新标注的 completion cutoffs 自动产生，因此模型可以在超过 **7,000 小时**、**167 万条 original episodes** 和 **309 万条 instruction-conditioned segments** 上训练，不需要 trajectory-preference labels，也不需要为每项任务制作 normalized-progress annotations。

模型同时学习 absolute/relative temporal heads，并引入 irregular frame sampling、temporal-order shuffling 和 value-isolation attention。这些设计用于防止模型根据 frame index、固定 sampling interval 或相邻 value queries 猜测进度。在包含六个 datasets 的 RBM-EVAL-OOD trajectory-ranking benchmark 上，RynnValue-8B 达到 **0.675 average Kendall's \(\tau_a\)**，高于使用 preference supervision 的 Robometer 0.655，也远高于 progress-only variant 的 0.292。

RynnValue 不直接输出 action reward。它先预测 observation potential \(\Phi_t=-v_t\)，其中 \(v_t\) 是 remaining time。Potential difference 提供 dense reward shaping，人工标注的 sparse terminal signal 则保留最终 task objective。在四项 unseen real-robot tasks 上，该 reward interface 的 **online-RL average success 为 72.5%**，Robometer 为 52.5%；**offline-RL average success 为 82.5%**，Robometer 为 63.8%。

## 论文信息

论文标题为 **“RynnValue: Scaling Robotic Value Foundation Models with Temporal Distance”**，作者是 **Dongchi Huang、Hongyin Zhang、Bohan Hou、Siteng Huang、Zhian Su、Hang Guo、Tong Lu、Zhaofeng Xu、Jiahao Tang、Jianfei Yang、Donglin Wang、Peixi Peng、Mingxiu Chen、Deli Zhao 和 Xin Li**，来自 Alibaba Group DAMO Academy 与 Hupan Lab。本文对应 [arXiv:2608.09853v1](https://arxiv.org/abs/2608.09853)，日期为 2026 年 8 月 11 日。作者公开了[项目主页](https://alibaba-damo-academy.github.io/RynnValue.github.io/)、[代码](https://github.com/alibaba-damo-academy/RynnValue)和 [4B/8B checkpoints](https://huggingface.co/collections/Alibaba-DAMO-Academy/rynnvalue)。

## 1. RynnValue 是 Reward Model 吗？

RynnValue 可以作为 reward model 使用，不过它直接学习的对象更准确地说是 **goal-conditioned state-value potential**。输入包括 task instruction、embodiment metadata 和一小段 visual observations，主要输出是距离 instruction 完成还剩多少时间。模型不直接评价 actions，也不预测 transition reward，更不估计 action-conditioned \(Q(s,a)\)。

完整 pipeline 如下：

```text
instruction + observation history
                 ↓
     predicted remaining time v_t
                 ↓
          potential Φ_t = -v_t
                 ↓
dense shaping κ(γΦ_{t+1} - Φ_t) + sparse task reward
                 ↓
        offline or online robot RL
```

这个区别十分重要。RynnValue 学到的是可复用的“当前 visual state 距离 language goal 有多远”，downstream RL algorithm 再把 potential 的变化转成 rewards。

## 2. 用 Temporal Distance 作为 Scaling Target

General-purpose robotic reward models 通常依赖三类 anchors：trajectory 之间的 human/model preferences、与 reference demonstrations 的比较，或 \([0,1]\) normalized task progress。每种 anchor 都会给 scaling 带来摩擦。Preferences 需要 comparison labels；references 需要合适的 successful trajectory；normalized progress 在十秒 pick task 和一分钟 bimanual task 中没有统一的物理含义。

RynnValue 使用 observation timestamp \(t_i\) 和 relabeled goal-completion cutoff \(t_G\) 构造标签：

\[
v_i^*=\max(0,t_G-t_i).
\]

Completion 时刻及之后的 observations 标签为零。第二个 target 描述输入序列里相邻 frames 的 signed local displacement：

\[
\Delta_i^*=t_{i+1}-t_i.
\]

正 \(\Delta_i^*\) 表示沿 recorded trajectory 向前移动；训练阶段故意反向排列 frames 时会产生负值。Absolute distance 把每个 state 锚定到 completion，relative distance 则学习 local temporal direction。

Temporal distance 使用 seconds 作为公共单位，也省去了针对每个 dataset 单独设计 progress normalization 的过程。在近似 minimum-time objective 的假设下，它具有 cost-to-go interpretation。

## 3. Architecture：一个 Backbone，三类 Outputs

RynnValue 构建在 embodied multimodal model **RynnBrain** 之上。主要配置从每个 video 采样 \(K=8\) 个 observations。每个 observation 都带有一个由 \(N=8\) 个 repeated tokens 构成的 absolute-value query group；从第二个 observation 开始，还会加入同样大小的 relative-value group。同一 group 内的 tokens 可以交换信息，最终 hidden states 在 prediction head 之前直接 concatenation，从而保留 object configuration、robot–object interaction、task stage 和 completion evidence 等互补线索。

两个 distributional heads 负责 numerical outputs：

- **Absolute head** 在 \([0,512]\) seconds 上预测 remaining time。
- **Relative head** 在 \([-256,256]\) seconds 上预测 signed displacement。

两个区间都划分为 **256 个 symlog-spaced bins**，continuous targets 用相邻 bins 上的 two-hot labels 表示。Inference 时先计算 symlog space 中的 expected bin center，再变换回 seconds。Classification formulation 可以压缩 large values、保留 near-zero precision，也避免 large temporal targets 主导 gradient scale。

原始 language-model head 在 temporal queries 之后生成结构化分析：

```text
Video Description: ...
Match: Yes / No
Success: Yes / No
```

这些 language outputs 帮助 shared representation 理解 events、instruction alignment 和 completion，但不会被反馈到 temporal predictions 中。

## 4. 扩展 Heterogeneous Robot Data

Training mixture 覆盖 real robots、simulation、egocentric human videos、single/dual-arm systems、dexterous hands、mobile manipulation 和多种 camera layouts。

| Source | Original episodes | Instruction-conditioned segments |
|---|---:|---:|
| AgiBot | 167,535 | 1,166,042 |
| EgoDex | 338,234 | 338,234 |
| Galaxea Open-World | 16,979 | 95,671 |
| InternData-A1 | 320,905 | 320,905 |
| Open X-Embodiment | 693,037 | 693,037 |
| RDT | 6,109 | 6,109 |
| RoboCOIN | 67,420 | 410,877 |
| RoboMIND | 32,138 | 32,138 |
| RoboTwin | 27,414 | 27,414 |
| Soft-FOLD | 1,542 | 1,542 |
| **Total** | **1,671,313** | **3,091,969** |

最终 corpus 包含 **223,395 条 unique instructions**，总时长超过 7,000 小时。Long episodes 在有 native subtask annotations 时按 subtask 切分，否则保留完整 episode 作为 coarse segment。每个 segment 随后获得 completion cutoff：默认使用 endpoint；若数据包含 post-completion motion，则使用 dataset-specific ratio 或 duration trimming。

Source-aware curation 会移除 placeholders、data-quality metadata、malformed commands，以及没有 manipulation goal 的 pure locomotion segments。在 appendix 分析的四个 corpora 中，pipeline 保留了 83.35% 的 trajectory units 和 98.99% 的 unique valid instructions，说明被删除的主要是重复 annotation noise。

## 5. 防止 Temporal Shortcuts

Timestamp labels 很便宜，但 multi-frame model 可能完全不理解 manipulation 也能拟合训练目标。Uniformly spaced chronological frames 会暴露多种 shortcuts：越靠后的 sequence position 通常 remaining time 越小；相邻 values 经常形成 arithmetic pattern；成功 training videos 往往单调向完成状态推进。

RynnValue 使用四种机制破坏这些 correlation：

1. **Random temporal sampling：**八个 observations 在 irregular timestamps 上采样，消除固定 value increment。
2. **Temporal-order shuffling：**一半 sequences 直接打乱；另一半使用 forward-biased walk，并设置 0.3 rewind probability，使 frame position 不再等价于 progress。
3. **Value-isolation attention：**不同 observations 的 value-query groups 不能相互 attend，context tokens 也不能吸收早先 value queries。每个 estimate 都必须使用自己的 visual-language context。
4. **Instruction-mismatch augmentation：**10% samples 换成另一条 trajectory 的 instruction。Language branch 学习 `Match: No` 与 `Success: No`；失效的 absolute target 被 mask，instruction-independent relative target 仍然保留。

最终 objective 为

\[
\mathcal L=\mathcal L_{\mathrm{abs}}+
\mathcal L_{\mathrm{rel}}+2\mathcal L_{\mathrm{lang}}.
\]

Absolute/relative heads 和 shared backbone 都接收 gradients。LM output projection 保持 frozen，language loss 仍通过它更新 backbone representations。

## 6. 从 Value 转成 Dense Reward

Inference 时 observations 恢复 chronological order，RynnValue 输出 non-negative remaining time \(v_t\)。对它取负号可以得到 higher-is-better potential：

\[
\Phi_t=-v_t.
\]

任务逐渐完成时，potential 接近零。RL experiments 使用

\[
r_t'=r_t^{\mathrm{sparse}}+
\kappa\left(\gamma\Phi_{t+1}-\Phi_t\right),
\]

其中

\[
r_t^{\mathrm{sparse}}=
\begin{cases}
0,&\text{action 成功完成任务},\\
-1,&\text{其他情况}.
\end{cases}
\]

Shaping term 奖励 predicted remaining time 的减少，并惩罚 regressions。Potential-based shaping 具有 policy-invariance motivation，sparse completion term 则保护最终 objective，降低 reward-model noise 的影响。

Terminal signal 仍由人工标注。Operators 也负责确认 task success 和 episode termination；reward models 只提供 shaping potential。因此，论文展示的是 sparse reward densification，还没有在 policy-learning experiments 中完全消除 task-level success supervision。

比较时，RynnValue 的 shaping coefficient 在所有 tasks 上固定为 \(\kappa=0.1\)，Robometer 为 \(\kappa=1.0\)。每条 trajectory 使用 task instruction 和一路 third-person RGB 进行评分。RL reward inference 把 history 均匀采样成四帧，以匹配 Robometer protocol。

## 7. Reward-Model Benchmark Results

RBM-EVAL-OOD 包含来自六个 held-out robot datasets 的 976 条 failed、suboptimal 和 successful trajectories。Metric 是 human trajectory-quality ordering 与 model ordering 之间的 Kendall's \(\tau_a\)。RynnValue 使用最后一个 queried observation 的 negative predicted remaining time 作为 trajectory score。

| Model | Preference supervision | Average Kendall's \(\tau_a\) |
|---|---:|---:|
| Robometer, progress only | No | 0.292 |
| RoboReward-4B | No preference pairs | 0.502 |
| Robometer, RBM-1M | Yes | 0.655 |
| **RynnValue-4B** | **No** | **0.670** |
| **RynnValue-8B** | **No** | **0.675** |

4B 与 8B variants 几乎持平，说明在这个参数范围内，supervision recipe 和 anti-shortcut design 的贡献可能高于单纯增加 parameter count。Instruction–trajectory confusion test 中，RynnValue 的 **normalized diagonal margin 为 0.79**，最强 baseline 为 0.67，显示出更好的 language-goal grounding。

Ablation table 更清楚地揭示了 shortcut problem：

| Variant | Average Kendall's \(\tau_a\) |
|---|---:|
| Without temporal-order shuffling | 0.189 |
| Uniform temporal sampling | 0.379 |
| Without value-isolation attention | 0.482 |
| Without language supervision | 0.537 |
| Without relative temporal prediction | 0.627 |
| **Full RynnValue-8B** | **0.675** |

移除 shuffling 造成最大幅度的性能崩塌。始终看到 ordered sequences 的模型可以只学习“later frame means better”。Random gaps 和 isolated queries 迫使模型更多依赖 visual evidence。

## 8. Data Diversity 比重复采样更重要

论文分别增加 episode count 和 training-task count，并在每个比例上保持两组的 total episode counts 近似可比。相同 tasks 内继续增加 episodes 很快饱和；增加 task diversity 则在完整 scaling range 内持续降低 held-out temporal-distance error。

这个结果改变了 “more robot data” 的含义。对 value learning 来说，狭窄 skill family 中的大量重复成功执行，在模型学会基本 visual dynamics 后提供的新信息有限。新的 goal structures、failure modes、objects、embodiments 和 viewpoints 会带来性质不同的 cost-to-go relationships。

## 9. Real-World Policy Learning

Reward model 在 dual-arm Franka system 上的四项 tasks 中做 zero-shot evaluation；这些 tasks、objects 和 scenes 都没有出现在 RynnValue training data 中。每个 policy 测试 20 次。

### Online RL

| Reward | Bread basket | Steak + spatula | Box + drawer | Bimanual transfer | Average |
|---|---:|---:|---:|---:|---:|
| Sparse | 40% | 45% | 40% | 70% | 48.8% |
| Robometer | 35% | 45% | 65% | 65% | 52.5% |
| **RynnValue** | **45%** | **75%** | **70%** | **100%** | **72.5%** |

Online training 使用 DSRL，在 frozen \(\pi_{0.5}\) action decoder 的 latent noise space 中优化 policy。Bread Basket 和 Steak Serving 从 SFT policies 开始；Box-in-Drawer 与 Bimanual Transfer 则对所有 online reward variants 使用同一份 Robometer-based offline-RL checkpoint。每项任务使用 60 条 online trajectories 和 6,000 training steps。

### Offline RL

| Reward / policy | Bread basket | Steak + spatula | Box + drawer | Bimanual transfer | Average |
|---|---:|---:|---:|---:|---:|
| SFT | 70% | 25% | 0% | 0% | 23.8% |
| Sparse IQL | 70% | 20% | 0% | 0% | 22.5% |
| Robometer IQL | 80% | 80% | 50% | 45% | 63.8% |
| **RynnValue IQL** | **100%** | **90%** | **90%** | **50%** | **82.5%** |

Offline IQL 为所有 reward variants 重标注同一份 410-trajectory mixed-expertise dataset。这份数据明显由 successes 主导：398 条成功，12 条失败。RynnValue 仍能提供足够的 intra-trajectory structure，在所有任务上超过 sparse IQL 和 Robometer；Box-in-Drawer 上，SFT 与 sparse IQL 都没有成功，RynnValue IQL 达到 90%。

Online gap 最小的是 Box-in-Drawer：RynnValue 为 70%，Robometer 为 65%。精确 grasp stability 和 box–drawer alignment 在 third-person RGB 中可能非常相似，但 physical outcomes 完全不同。论文用这个案例展示 visual reward model 的 sensing limitation。

## 10. 优点与局限

RynnValue 最大的优点，是把可以低成本生成的 supervision target 扩展到 heterogeneous corpora。Temporal seconds 为不同 datasets 提供 shared interface，ablation 也充分证明这种简单标签需要强力 shortcut suppression。论文还完成了从 intrinsic value evaluation 到 offline/online policy improvement 的闭环，并公开 code、models、benchmark adapters 和 RL infrastructure。

核心假设需要谨慎理解。Logged remaining time 由 behavior policy、operator speed、control frequency、hesitation 和 completion cutoff 共同决定。只有在很强的条件下，它才等于 optimal minimum-time cost-to-go。两个 visually identical states 可能因为一条 trajectory 暂停或 controller 更慢而获得不同标签。Task diversity 或许能平均一部分偏差，但论文并没有显式识别 embodiment-invariant optimal hitting time。

Completion cutoffs 也是 supervision noise 来源。有 native subtask annotations 时优先使用；coarse episodes 可能保留 endpoint；某些 datasets 需要 ratio/duration trimming。这套 recipe 比 preference labeling 便宜很多，但仍依赖 source-specific curation 和 cutoff assumptions。

Real-world reward pipeline 保留人工标注的 success 与 termination。RynnValue 提供 shaping，因此 experiments 还不是 fully autonomous terminal-reward replacement。Reward model 只使用 third-person RGB history 和 language，没有 proprioception、force、tactile input 或 explicit geometry。Box-in-Drawer result 体现了这种限制对 precision-sensitive contact states 的影响。

Evaluation 只有 20 rollouts per policy、四项 real tasks 和一个 Franka platform。RynnValue 与 Robometer 使用不同的 fixed shaping coefficients，这是一种实用 tuning，但也让 raw potential quality 的纯粹比较更复杂。Short observation window 和 four-frame RL inference 同样限制了 long-horizon memory。作者把 streaming inference、longer horizons、dexterous hands、mobile manipulation，以及 richer energy/safety/precision costs 作为 future directions。

## Takeaway

RynnValue 把 reward modeling 表述为**学习可复用 temporal potential**。Timestamps 提供低成本 supervision；absolute/relative heads 学习 global 与 local temporal structure；shuffled sampling 和 isolated queries 阻止 positional shortcuts；potential differences 再把 remaining time 转成 robot RL 的 dense reward。

论文最有价值的是清晰的 interface boundary。Foundation model 回答：“从当前状态看，距离 language goal 似乎还需要多少秒的有效工作？”RL system 决定这个 estimate 的变化如何塑造 behavior，sparse terminal label 则保护最终 objective。强劲的 OOD ranking 与 real-policy gains 说明 temporal distance 是很有潜力的 scaling target；logged time 与 true optimal cost-to-go 之间的差距，仍是最关键的概念问题。

</div>
