---
title: "[Paper Notes] ICI-VLA: In-Context Imitation with Spatiotemporally Aligned Demonstrations for Vision-Language-Action Models"
date: 2026-10-05
permalink: /posts/2026/10/ici-vla-paper-notes/
tags:
  - Vision-Language-Action
  - In-Context Learning
  - Robot Imitation Learning
  - Demonstration Retrieval
  - Robot Manipulation
  - Paper Notes
---

<div id="ici-vla-en" data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Most VLA adaptation still means collecting task-specific demonstrations and updating model weights. **ICI-VLA** turns adaptation into retrieval-conditioned inference: the policy stays fixed at test time and receives a few short demonstrations that match the current subtask, phase, and motion geometry.

The framework has three pieces. It decomposes long trajectories into semantically labeled micro-demonstrations, trains a retriever with semantic hard filtering plus Dynamic Time Warping (DTW) supervision, and uses **Target Action Masking** during policy training to reduce direct copying of contextual action prefixes. With a native text-generation interface, Qwen3-VL-4B predicts continuous actions as numerical text without an extra action head.

ICI-VLA reaches **97.7%** average success on LIBERO, **60.4%** on RoboTwin 2.0, and **83.2%** over four physical dual-arm Aloha tasks. These comparisons follow the paper's reported protocols; external baseline numbers are benchmark-level references rather than fully paired experiments.

## Paper and source version

**ICI-VLA: In-Context Imitation with Spatiotemporally Aligned Demonstrations for Vision-Language-Action Models** is by **Songhua Yang, Ziyu Liu, Xuetao Li, Ruqi Xiao, Kangxin Zhu, and Miao Li** from Wuhan University and the Institute of Technological Sciences, Wuhan University. These notes follow [arXiv:2609.07581v1](https://arxiv.org/abs/2609.07581), submitted September 7, 2026. See the [paper PDF](https://arxiv.org/pdf/2609.07581). Results below are author-reported.

## 1. Adaptation through context instead of test-time updates

A conventional VLA collects demonstrations for a new task and fine-tunes its parameters. ICI-VLA keeps its parameters frozen during deployment and conditions action generation on the current observation plus retrieved reference examples. The setting is few-shot test-time in-context adaptation: the model adapts through context, while all learning happens offline.

The paper preserves a native text-action interface inspired by VLA-0. Continuous actions and proprioceptive states are serialized as numerical text, so Qwen3-VL-4B can generate action chunks without adding a diffusion head, action tokenizer, or specialized control module. This keeps the language model's original input-output interface available to the retrieval mechanism.

At time $t$, the query is

$$
I_q=\langle T,T_{sub},O_t,Z_t\rangle,
$$

where $T$ is the global instruction, $T_{sub}$ is the active subtask, $O_t$ contains main and wrist camera observations, and $Z_t$ is proprioception. A retrieved micro-demonstration is

$$
E=\langle T^e,T^e_{sub},O^e,Z^e,A^e_{e:e+k}\rangle.
$$

The retriever selects

$$
E^*=\arg\max_{E\in\mathcal D}s_\phi(I_q,E),
$$

and the fixed policy generates the next action chunk conditioned on $I_q$ and $E^*$.

## 2. Build a library of short, phase-labeled examples

Long demonstrations are a poor retrieval unit for short-horizon control. A full episode can contain reaching, grasping, placing, and returning, while the current policy step may need only one local motion. ICI-VLA therefore uses a Qwen3-VL model to segment approximately **11,200** long-horizon trajectories into subtasks and attach fine-grained instructions to them.

Each micro-demonstration stores the global instruction, subtask instruction, camera observations, initial proprioception, and a $k$-step textualized action chunk. The resulting library contains approximately **139,659** subtask examples. The library combines LIBERO, RoboTwin 2.0, and physical dual-arm Aloha data, including about **1,000** real teleoperation demonstrations.

This decomposition gives retrieval a useful phase vocabulary. A query asking the robot to close a drawer can retrieve a drawer-closing segment even when the full source episode also contains unrelated bowl placement or navigation motions.

## 3. Semantic filtering plus DTW geometric alignment

Visual or language similarity alone can retrieve an example with the right object and the wrong motion. ICI-VLA trains an RD-Encoder based on **Qwen3-VL-Embedding-2B** through an iterative two-stage alignment process.

First, semantic hard filtering uses the current embedding to retain a compatible candidate pool. A query such as “the robotic arm pushes the drawer closed” filters out candidates about unrelated actions. Second, Dynamic Time Warping ranks the remaining candidates using labeled end-effector trajectories. The lowest-cost candidate becomes the positive; phase-misaligned examples from the same semantic subtask become hard negatives.

For anchor trajectory $Traj_a$ and candidate $Traj_e$, the mining cost is

$$
DTW(Traj_a,Traj_e)=\min_{W}\sum_{(u,v)\in W}\delta(p^a_u,p^e_v),
$$

where $W$ is a valid warping path and $\delta$ measures waypoint discrepancy across active arms. The RD-Encoder is trained with an InfoNCE-style objective:

$$
\mathcal L_{CL}=-\log
\frac{\exp(e_A^\top e_{P^+}/\tau)}
{\exp(e_A^\top e_{P^+}/\tau)+\sum_i\exp(e_A^\top e_{N_i^-}/\tau)}.
$$

The key separation is between training and deployment. DTW uses labeled target trajectories only to create offline supervision. At inference, the target action is unknown; the frozen retriever ranks candidates from the observable query alone.

The full five-cycle RD-Encoder raises RoboTwin retrieval Recall@1 from **27.8%** for the base embedding to **70.8%**, and Recall@5 from **52.4%** to **90.1%**. Semantic filtering and one DTW cycle provide intermediate gains.

## 4. Target Action Masking prevents prefix copying

Even a well-matched demonstration can become a misleading action prefix. If the model sees an exact reference action sequence, it may continue the sequence mechanically instead of grounding its next action in the current observation.

During offline policy fine-tuning, ICI-VLA randomly masks a subset $M$ of the contextual target-action tokens. It optimizes only the unmasked positions $U$:

$$
\mathcal L_{act}=-\sum_{j\in U}
\log\pi_\theta(a_{q,j}\mid I_q,E^*,\tilde a_{q,<j}),
$$

where $\tilde a_q$ contains corrupted earlier target tokens. Masking is disabled at inference, when the fixed policy generates actions autoregressively.

This objective does not explicitly teach a kinematic residual relative to the demonstration. Its intended effect is behavioral: exact action continuation becomes unreliable during training, so the policy must use the current observation, the task instruction, and the retrieved context together.

## 5. Simulation results

ICI-VLA evaluates on LIBERO and RoboTwin 2.0 with three retrieved examples at inference. The number of examples, five retriever-mining cycles, and a confidence threshold of **0.65** are selected on validation data. The context is refreshed when policy confidence falls below that threshold.

| Benchmark / split | ICI-VLA success | Reference comparison |
|---|---:|---:|
| LIBERO Spatial | **98.5%** | VLA-0: 98.2% |
| LIBERO Object | **98.7%** | OpenVLA-OFT: 99.5% |
| LIBERO Goal | **98.0%** | VLA-0: 97.5% |
| LIBERO Long | **96.8%** | OpenVLA-OFT: 93.2% |
| LIBERO average | **97.7%** | Highest listed baseline: 96.4% |
| RoboTwin 2.0 Easy | **72.4%** | Highest listed baseline: 55.2% |
| RoboTwin 2.0 Hard | **46.3%** | Highest listed baseline: 24.5% |
| RoboTwin 2.0 average | **60.4%** | Highest listed baseline: 41.1% |

The strongest RoboTwin result comes from long-horizon dual-arm coordination. The controlled comparison is especially informative: VLA-0 with the same retrieved context but without Target Action Masking reaches only **10.7%**, while ICI-VLA reaches **60.4%**.

The ablations separate the contributions:

| Configuration | LIBERO average | RoboTwin average |
|---|---:|---:|
| Naive ICL, no masking | 71.5% | 10.7% |
| Without DTW ranking | 92.5% | 31.4% |
| Without semantic filtering | 88.4% | 38.1% |
| Full ICI-VLA | **97.7%** | **60.4%** |

Removing DTW or semantic filtering hurts retrieval alignment. Removing masking causes the largest collapse, which is consistent with a policy that copies a reference prefix without robustly checking the current state.

## 6. Physical dual-arm evaluation

The physical setup is a dual-arm Aloha system with four tasks: Single-arm Grasp, Dual-arm Grasp, Drawer Placement, and Object Sorting. Evaluation objects, layouts, instructions, and trajectories are disjoint from policy training and the retrieval library. Each task uses **250 rollouts**, for **1,000** trials total.

| Task | $\pi_0$ | VLA-0 | ICI-VLA |
|---|---:|---:|---:|
| Single-arm Grasp | 78.4% | 75.2% | **89.6%** |
| Dual-arm Grasp | 56.8% | 52.4% | **76.8%** |
| Drawer Placement | 62.0% | 58.8% | **81.2%** |
| Object Sorting | 68.4% | 65.6% | **85.2%** |
| Average | 66.4% | 63.0% | **83.2%** |

The reported 95% Wilson interval for ICI-VLA's average is **80.8%–85.4%**. The result suggests that short, phase-relevant references can help under lighting variation, distractors, sensor noise, and contact dynamics. It remains a four-task deployment, so it does not establish broad cross-embodiment adaptation.

## 7. Sensitivity and limitations

Three retrieved examples work best on the RoboTwin validation split: one or two provide less coverage, while larger contexts introduce irrelevant or conflicting information. Retriever mining improves performance from **34.6%** with no optimization to **60.4%** after five cycles; additional cycles change the result by at most 0.3 points in the reported sweep.

The approach depends on demonstration coverage and the quality of the subtask planner. It also pays offline costs for full-parameter fine-tuning of Qwen3-VL-4B and the embedding model, plus iterative retrieval mining. Inference avoids gradient updates, but it still requires a library search and confidence-based context refresh. The method's success does not prove that the VLA has learned an explicit kinematic residual; Target Action Masking is a context-corruption objective whose causal mechanism remains partly open.

My main takeaway is that in-context imitation for robotics needs alignment at the same granularity as action generation. A whole episode is too coarse, and a visually similar frame is too weak. ICI-VLA combines semantic phase labels, trajectory geometry, and action-prefix corruption so the demonstration becomes a local reference instead of a script to replay. The next useful test would be a larger cross-embodiment library where retrieval must match hand morphology and control conventions as well as task phase.

</div>

<div id="ici-vla-zh" data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏进行 **English / 中文** 切换。

## TL;DR

多数 VLA 的任务适配仍然依赖收集新 demonstrations 并更新模型权重。**ICI-VLA** 把适配转成 retrieval-conditioned inference：测试时保持 policy 固定，只提供与当前 subtask、执行阶段和运动几何匹配的少量短 demonstration。

框架包含三个部分：把长轨迹切成带语义标签的 micro-demonstrations；用 semantic hard filtering 加 Dynamic Time Warping（DTW）监督训练 retriever；在 policy 训练时引入 **Target Action Masking**，减少模型直接复制上下文 action prefix。它保留 native text-generation interface，让 Qwen3-VL-4B 以 numerical text 生成连续动作，不增加额外 action head。

ICI-VLA 在 LIBERO 上达到 **97.7%** 平均 success，在 RoboTwin 2.0 上达到 **60.4%**，在四个真实双臂 Aloha 任务上达到 **83.2%**。这些比较遵循论文报告的实验协议；外部 baseline 数字是 benchmark-level reference，不是完全配对的对照实验。

## 论文与阅读版本

**ICI-VLA: In-Context Imitation with Spatiotemporally Aligned Demonstrations for Vision-Language-Action Models** 的作者是 **Songhua Yang、Ziyu Liu、Xuetao Li、Ruqi Xiao、Kangxin Zhu 和 Miao Li**，来自武汉大学及武汉大学 Institute of Technological Sciences。本文依据 [arXiv:2609.07581v1](https://arxiv.org/abs/2609.07581)，提交日期为 2026 年 9 月 7 日。另见[论文 PDF](https://arxiv.org/pdf/2609.07581)。以下结果均来自作者报告。

## 1. 用上下文完成适配，而不是在测试时更新权重

传统 VLA 为新任务收集 demonstrations 并微调参数。ICI-VLA 在部署时冻结参数，只根据当前 observation 和检索到的 reference example 生成动作。这个设置属于 few-shot test-time in-context adaptation：模型通过上下文适配，所有学习过程都在离线完成。

论文采用受 VLA-0 启发的 native text-action interface。连续动作和 proprioceptive state 被序列化为 numerical text，因此 Qwen3-VL-4B 可以在不增加 diffusion head、action tokenizer 或专用 control module 的情况下生成 action chunk。这样，语言模型原有的输入输出接口可以直接承载 retrieval mechanism。

时刻 $t$ 的 query 为

$$
I_q=\langle T,T_{sub},O_t,Z_t\rangle,
$$

其中 $T$ 是全局指令，$T_{sub}$ 是当前 subtask，$O_t$ 包含主相机和 wrist camera 观测，$Z_t$ 是本体感觉。一个 retrieved micro-demonstration 为

$$
E=\langle T^e,T^e_{sub},O^e,Z^e,A^e_{e:e+k}\rangle.
$$

Retriever 选择

$$
E^*=\arg\max_{E\in\mathcal D}s_\phi(I_q,E),
$$

固定的 policy 再根据 $I_q$ 和 $E^*$ 生成下一段动作。

## 2. 构建短的、带阶段标签的 demonstration library

长轨迹不适合作为短时域控制的 retrieval unit。一条完整 episode 可能包含接近、抓取、放置和返回，而当前 policy step 可能只需要其中一个局部动作。因此，ICI-VLA 使用 Qwen3-VL 把约 **11,200** 条长时域轨迹切成 subtasks，并为每个 subtask 添加细粒度 instruction。

每个 micro-demonstration 保存 global instruction、subtask instruction、相机观测、初始 proprioception 和 $k$ 步 textualized action chunk。最终 library 包含约 **139,659** 个 subtask examples，数据来自 LIBERO、RoboTwin 2.0 和真实双臂 Aloha，其中约 **1,000** 条是真实遥操作 demonstration。

这样的切分给 retrieval 提供了有用的 phase vocabulary。例如，当前任务是关闭抽屉时，系统可以检索 drawer-closing segment，即使 source episode 同时包含无关的 bowl placement 或 navigation 动作。

## 3. Semantic filtering 与 DTW 几何对齐

仅靠视觉或语言相似度，可能检索到物体相同但运动方式错误的 example。ICI-VLA 基于 **Qwen3-VL-Embedding-2B** 构建 RD-Encoder，通过两阶段迭代对齐训练它。

第一步是 semantic hard filtering：根据当前 embedding 保留语义兼容的 candidate pool。对于 “the robotic arm pushes the drawer closed” 这样的 query，系统会过滤掉不相关动作。第二步是 Dynamic Time Warping，根据带标签的末端轨迹对候选进行排序。代价最低的候选成为 positive；同一 semantic subtask 中阶段不匹配的 example 成为 hard negative。

对于 anchor trajectory $Traj_a$ 和 candidate $Traj_e$，挖掘代价为

$$
DTW(Traj_a,Traj_e)=\min_{W}\sum_{(u,v)\in W}\delta(p^a_u,p^e_v),
$$

其中 $W$ 是合法 warping path，$\delta$ 衡量各 active arm 的 waypoint 差异。RD-Encoder 使用 InfoNCE 风格目标训练：

$$
\mathcal L_{CL}=-\log
\frac{\exp(e_A^\top e_{P^+}/\tau)}
{\exp(e_A^\top e_{P^+}/\tau)+\sum_i\exp(e_A^\top e_{N_i^-}/\tau)}.
$$

训练和部署之间的边界很重要：DTW 只在离线训练时用带标签的 target trajectory 构造监督；推理时 target action 未知，冻结的 retriever 只能根据可观察 query 排序候选。

完整五轮 RD-Encoder 训练后，RoboTwin 的 Recall@1 从 base embedding 的 **27.8%** 提升到 **70.8%**，Recall@5 从 **52.4%** 提升到 **90.1%**。Semantic filtering 和一轮 DTW supervision 带来中间增益。

## 4. Target Action Masking 防止 action prefix 复制

即使 demonstration 匹配良好，也可能变成误导性的 action prefix。如果模型看到完整的 reference action sequence，它可能机械地续写这段序列，而没有根据当前 observation 调整动作。

在离线 policy fine-tuning 中，ICI-VLA 随机 mask 上下文 target-action tokens 的子集 $M$，只对未 mask 的位置 $U$ 优化：

$$
\mathcal L_{act}=-\sum_{j\in U}
\log\pi_\theta(a_{q,j}\mid I_q,E^*,\tilde a_{q,<j}),
$$

其中 $\tilde a_q$ 的早期 target tokens 已被破坏。推理时关闭 masking，固定 policy 自回归生成动作。

这个目标没有明确教模型学习相对于 demonstration 的 kinematic residual。它的作用更偏行为层面：训练时精确的 action continuation 不再可靠，因此 policy 必须同时使用当前 observation、任务指令和 retrieved context。

## 5. 仿真结果

ICI-VLA 在 LIBERO 和 RoboTwin 2.0 上评估，推理时使用三个 retrieved examples。example 数量、五轮 retriever mining 和 **0.65** confidence threshold 都在 validation data 上选择。当 policy confidence 低于该阈值时刷新上下文。

| Benchmark / split | ICI-VLA success | 参考比较 |
|---|---:|---:|
| LIBERO Spatial | **98.5%** | VLA-0：98.2% |
| LIBERO Object | **98.7%** | OpenVLA-OFT：99.5% |
| LIBERO Goal | **98.0%** | VLA-0：97.5% |
| LIBERO Long | **96.8%** | OpenVLA-OFT：93.2% |
| LIBERO 平均 | **97.7%** | 最高列出 baseline：96.4% |
| RoboTwin 2.0 Easy | **72.4%** | 最高列出 baseline：55.2% |
| RoboTwin 2.0 Hard | **46.3%** | 最高列出 baseline：24.5% |
| RoboTwin 2.0 平均 | **60.4%** | 最高列出 baseline：41.1% |

RoboTwin 的主要提升来自长时域双臂协调。受控比较尤其有信息量：使用相同 retrieved context、但去掉 Target Action Masking 的 VLA-0 只有 **10.7%**，ICI-VLA 则达到 **60.4%**。

消融实验拆分了各个模块的作用：

| 配置 | LIBERO 平均 | RoboTwin 平均 |
|---|---:|---:|
| Naive ICL，无 masking | 71.5% | 10.7% |
| 去掉 DTW ranking | 92.5% | 31.4% |
| 去掉 semantic filtering | 88.4% | 38.1% |
| 完整 ICI-VLA | **97.7%** | **60.4%** |

去掉 DTW 或 semantic filtering 都会削弱 retrieval alignment。去掉 masking 导致最大的性能坍塌，这与模型复制 reference prefix、却无法可靠检查当前状态的现象一致。

## 6. 真实双臂评估

真实平台是双臂 Aloha，测试四个任务：Single-arm Grasp、Dual-arm Grasp、Drawer Placement 和 Object Sorting。评估物体、布局、指令和轨迹均与 policy training 及 retrieval library 分离。每个任务进行 **250 次 rollout**，总计 **1,000** 次试验。

| 任务 | $\pi_0$ | VLA-0 | ICI-VLA |
|---|---:|---:|---:|
| Single-arm Grasp | 78.4% | 75.2% | **89.6%** |
| Dual-arm Grasp | 56.8% | 52.4% | **76.8%** |
| Drawer Placement | 62.0% | 58.8% | **81.2%** |
| Object Sorting | 68.4% | 65.6% | **85.2%** |
| 平均 | 66.4% | 63.0% | **83.2%** |

ICI-VLA 平均 success 的 95% Wilson interval 为 **80.8%–85.4%**。结果说明，在光照变化、桌面干扰、传感噪声和接触动力学存在时，短的、与执行阶段相关的 reference 仍然有帮助。不过实验只覆盖四个任务，还不足以证明广泛的 cross-embodiment adaptation。

## 7. 敏感性与限制

在 RoboTwin validation split 上，三个 retrieved examples 最好：一个或两个 example 覆盖不足，更多 context 则会引入无关或冲突信息。Retriever mining 把没有优化时的 **34.6%** 提升到五轮后的 **60.4%**；继续增加轮数，报告 sweep 中变化不超过 0.3 个百分点。

方法依赖 demonstration coverage 和 subtask planner 的质量。它还需要对 Qwen3-VL-4B 和 embedding model 做 full-parameter offline fine-tuning，并承担迭代式 retrieval mining 成本。推理阶段避免了 gradient update，但仍需要 library search 和基于 confidence 的 context refresh。论文结果也不能证明 VLA 学到了显式 kinematic residual；Target Action Masking 是 context-corruption objective，其内部因果机制仍有待进一步分析。

我的主要 takeaway 是：机器人 in-context imitation 需要在与 action generation 相同的粒度上进行对齐。完整 episode 太粗，视觉相似的一帧又太弱。ICI-VLA 把 semantic phase label、trajectory geometry 和 action-prefix corruption 结合起来，让 demonstration 成为局部 reference，而不是一段需要重放的 script。下一步值得测试的是更大的 cross-embodiment library，让 retrieval 同时匹配手部形态、控制约定和任务阶段。

</div>
