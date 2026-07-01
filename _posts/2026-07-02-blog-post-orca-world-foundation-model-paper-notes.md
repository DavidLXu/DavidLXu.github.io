---
title: "[Paper Notes] Orca: The World is in Your Mind"
date: 2026-07-02
permalink: /posts/2026/07/orca-world-foundation-model-paper-notes/
tags:
  - World Models
  - Multimodal Learning
  - Embodied AI
  - Vision-Language-Action
  - Foundation Models
---

<div data-lang="en" markdown="1">

**Orca** is an early attempt to define a **general world foundation model** around one central modeling target: learn a unified latent state of the world, then expose that state through downstream readouts for language, images, and robot actions.

My read: the paper's main move is the shift from isolated next-token, next-frame, or next-action objectives to **Next-State-Prediction**. Orca treats text, image, and action as interfaces to a shared world latent. The backbone is trained to model state transitions, then frozen; lightweight decoders test whether the latent can be read out into reasoning, future images, and embodied control.

## Paper Info

The paper is **"Orca: The World is in Your Mind"** by the **Orca Team, Beijing Academy of Artificial Intelligence**. The arXiv page is [arXiv:2606.30534](https://arxiv.org/abs/2606.30534), with v1 submitted on **June 29, 2026** and v2 revised on **June 30, 2026**. The project page is [orca-wm.github.io](https://orca-wm.github.io).

The core contributors listed in the paper are **Yihao Wang, Yuheng Ji, Mingyu Cao, Yanqing Shen, and Runze Xiao**, with **Yuheng Ji** marked as project lead and **Zhongyuan Wang** and **Pengwei Wang** as corresponding authors.

## The Big Idea

Many current foundation-model families are organized by output format. Language models predict the next token. Image and video models predict or generate frames. VLA models predict actions. Orca proposes a different center of gravity: the model should learn an internal world state and its transitions, and downstream tasks should read from that latent state.

The paper writes this as latent world-state modeling. Given multimodal world signals \(X=\{X^m\}_{m\in M}\), the encoder maps them into a latent state:

\[
S = f_\theta(X).
\]

The state then evolves forward or backward under implicit dynamics and explicit conditions:

\[
S_{t+\Delta}\sim p_\Theta(S_{t+\Delta}\mid S_t,z_t,c_t),\quad \Delta\in\mathbb{Z}_{\ne 0}.
\]

Here \(z_t\) represents unobserved dynamics such as physical laws, object properties, scene dynamics, and environmental forces. \(c_t\) represents explicit conditions such as human instructions or language-described events. Positive \(\Delta\) predicts future states; negative \(\Delta\) backtracks to past states.

In this first Orca version, the world signals are vision and language. The authors frame them as two complementary channels: visual signals capture how the world evolves, while language signals describe meaning, intention, causal premises, and event structure.

## Two Learning Modes

Orca uses a VLM backbone, based on Qwen3.5, and learns through two complementary paradigms.

**Unconscious learning** captures dense natural transitions from continuous video. Given a video frame \(v_t\), Orca predicts the latent of the adjacent next frame \(v^l_{t+1}\). The target is obtained from a frozen vision encoder, so supervision happens in latent space instead of pixel space. This mode is meant to absorb motion, occlusion, object interaction, and local physical regularities from observation alone.

**Conscious learning** captures sparse meaningful transitions under language conditions. Videos are segmented into events, and each event has a caption. Given a frame \(v_t\) and an instruction or event description \(e_{t+\Delta}\), Orca predicts the latent of a frame sampled from the specified adjacent event. This lets language describe target transitions such as a future event, past event, task intention, or causal premise.

The same conscious branch also includes VQA response generation. Given a video \(V\) and question \(l_q\), the LM head generates answer \(l_a\), preserving a natural-language interface to the latent.

## Pre-Training Objective

The pre-training objective combines three terms:

\[
\mathcal{L}=\lambda_{\mathrm{obs}}\mathcal{L}_{\mathrm{obs}}
+\lambda_{\mathrm{evt}}\mathcal{L}_{\mathrm{evt}}
+\lambda_{\mathrm{vqa}}\mathcal{L}_{\mathrm{vqa}}.
\]

The appendix gives the concrete weights:

\[
\mathcal{L}_{\mathrm{pre}}
=0.1\mathcal{L}_{\mathrm{obs}}
+0.5\mathcal{L}_{\mathrm{evt}}
+0.4\mathcal{L}_{\mathrm{vqa}}.
\]

The latent matching loss is a blend of MSE and cosine distance:

\[
\ell_{\mathrm{lat}}(\hat v^l,v^l)
=0.1\lVert \hat v^l-v^l\rVert_2^2
+0.9\left(1-\frac{\langle \hat v^l,v^l\rangle}{\lVert \hat v^l\rVert_2\lVert v^l\rVert_2}\right).
\]

\(\mathcal{L}_{\mathrm{obs}}\) predicts the adjacent next-frame latent. \(\mathcal{L}_{\mathrm{evt}}\) predicts event-conditioned previous or next event latents. \(\mathcal{L}_{\mathrm{vqa}}\) is the standard next-token loss for answers. The paper mixes state-transition samples and VQA samples at roughly **5:1**.

The query mechanism is simple. Observation-only transition uses `<Query 1>` to read out a predicted visual latent. Event-conditioned transition adds an instruction and `<Query 2>` to read out the instruction-conditioned target latent. All learnable queries are trained from scratch.

## Data and Training Scale

The paper constructs a world-learning inventory with:

| Data type | Scale | Role |
|---|---:|---|
| General video | **125K hours** | Dense visual transitions |
| Event annotations | **160M** | Language-described state transitions |
| General VQA | **11.5M** | Language grounding and world understanding |

The video data covers ego-centric interaction, exo-centric manipulation, action-free robot execution, and natural dynamics. Event data is derived from video through coarse and fine event segmentation plus captions. VQA data teaches the model to describe and interpret observed world states.

The current release uses only about **one-tenth** of the video inventory. The appendix reports **12.5K hours** of video used for both Orca-4B and Orca-0.8B training, over **10,844 steps** on **32 nodes / 256 GPUs**. The base VLMs are **Qwen3.5-4B** and **Qwen3.5-0.8B**. The vision encoder is frozen; the LLM part and visual transition head are trainable.

The infrastructure section is practical. The authors use FlagScale with FSDP2, chunked cross-entropy loss, activation recomputation, and communication prefetching. Throughput rises from **0.66** samples/sec/GPU in the StarVLA pipeline to **2.91** samples/sec/GPU in full Orca training, a reported **4.4x** improvement.

## Readout Design

After pre-training, Orca freezes the backbone and trains only modality-specific readout modules.

**Language readout** reuses the LM head. It exposes the latent as answers, explanations, and event-level reasoning.

**Vision readout** maps Orca's predicted visual latent into image space through a frozen Stable Diffusion 3.5 MMDiT. The trainable parts are an MLP adaptor and LoRA modules. The target image size is **768 x 768**, and vision readout training runs for **200K steps**.

**Action readout** maps the latent to robot action chunks. A DiT-based Action Expert with flow-matching loss receives Orca latent, noisy action with time embedding, and proprioception. Only the MLP adaptor and Action Expert are trained. For real-robot tasks, the Action Expert sees **200 trajectories per task** across five tasks.

This readout protocol is important because it isolates the question the paper wants to test: does pre-training produce a latent that downstream decoders can use?

## Results

The first scaling result is straightforward: total pre-training loss decreases as video data grows, and the 4B model reaches lower loss than the 0.8B model. More importantly, frozen-backbone readouts improve as pre-training scales. The paper reports gains in text generation, image prediction, and action generation as the world latent strengthens.

**Text generation.** Orca is evaluated on MVBench, TemporalBench, 3DSRBench, and SWITCH. Orca-4B reaches an average score of **51.8**, compared with **46.7** for Qwen3.5-4B in the same table. The paper also groups questions into capability dimensions: state transition, commonsense reasoning, spatial relations, and dynamic motion. Orca-4B improves most clearly on state transition and dynamic motion, which matches the training objective.

**Image prediction.** The paper introduces **PRICE-V0.1**, a real-world interaction-conditioned image prediction benchmark. Given an initial image and instruction, the model predicts the target state image after the action. Orca-4B+2B reaches **59.8±10.9** average score across Gemini 3.1 Pro, GPT 5.4, Doubao-Seed-2.0, and Gemma 4-31B judges. The closest baseline in the main table, Flux.2 [klein], reaches **56.1±18.1**. The qualitative claim is that Orca better preserves scene consistency, robot morphology, contact relationships, and instruction-conditioned state change.

**Action generation.** The robot evaluation uses five tasks on a dual-arm wheeled humanoid: Take Book, Stacked Bowls, Pull Out Tissue, Stamp, and Scoop Sugar. The benchmark tests environment OOD and object OOD. Orca is compared with V-JEPA 2.1, Qwen3.5, and \(\pi0.5\). For overall rule-based score, Orca reaches **32.4**, compared with **29.4** for \(\pi0.5\), **17.0** for V-JEPA 2.1, and **10.5** for Qwen3.5. Orca is especially strong in environment OOD, with **36.6** rule-based score versus **27.6** for \(\pi0.5\). Object OOD is closer: Orca scores **28.2**, while \(\pi0.5\) scores **31.2**.

The diagnostic metrics matter more than the single success rate. Orca tends to advance further before failure and recover better after progress drops. The paper uses PRM-as-a-Judge metrics such as MaxProcess in Failure, Failure Near-Success Score, and Drawdown Recovery Ratio to show that even failed Orca trajectories often remain useful and structured.

## Ablation

The ablation studies the three losses:

| Pre-training losses | Text | Image | Action | Average |
|---|---:|---:|---:|---:|
| VQA only | 48.4 | - | 10.2 | 29.3 |
| Obs + Event | - | 58.2 | 30.9 | 44.6 |
| Obs + VQA | 50.5 | - | 32.6 | 41.6 |
| Event + VQA | 50.1 | 54.7 | 23.0 | 42.6 |
| Obs + Event + VQA | **51.8** | **59.8** | **32.4** | **48.0** |

The conclusion is nicely interpretable. Observation-only transition is especially helpful for action readout because it teaches dense temporal and physical dynamics. Event-conditioned transition is crucial for image prediction because image readout needs instruction-conditioned target states. VQA keeps the language interface alive and adds semantic grounding. The full combination gives the most balanced latent.

## Strengths and Limitations

The strength of Orca is its framing. It offers a concrete recipe for world-state learning that can be probed across three different downstream surfaces while the backbone stays frozen. The paper also makes a useful empirical point for robotics: video-only world pre-training can improve action readout even without action labels during pre-training.

The limitations are equally important. Orca currently uses mainly vision and language, leaving out audio, tactile, force, light, proprioception, and many scientific signals. Visual state prediction is supervised in a frozen ViT/VLM latent space, so the learned world state remains tied to a pre-trained semantic embedding. The model scale is modest, 0.8B and 4B, and the authors use only one-tenth of their video inventory. State-transition supervision is mostly short-horizon and event-local. The action tasks are still relatively short, and success rates remain low in strict real-robot OOD settings.

## Takeaway

Orca's reusable message is: **learn a world latent first, then ask different decoders what that latent contains**. The paper is strongest as a system-level proposal: train a backbone through dense observation-only transitions, sparse language-conditioned event transitions, and VQA grounding; freeze it; then probe text, image, and action readouts. The current results leave the full definition of a general world foundation model open, while making a clear case that Next-State-Prediction is a productive organizing principle for multimodal and embodied intelligence.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**Orca** 是一篇试图定义 **general world foundation model** 的早期系统论文。它的中心目标是先学习一个统一的 world latent state，再通过 language、image 和 robot action readouts 把这个 latent 读出来，让建模重心从单独任务转向 world state。

我的理解是：这篇论文最重要的动作，是把建模中心从孤立的 next-token、next-frame、next-action objectives 转向 **Next-State-Prediction**。Orca 把 text、image、action 看作 shared world latent 的不同接口。backbone 先学习 state transitions，之后被冻结；轻量 decoders 再检验这个 latent 能否支持 reasoning、future image prediction 和 embodied control。

## 论文信息

论文标题是 **"Orca: The World is in Your Mind"**，作者为 **Orca Team, Beijing Academy of Artificial Intelligence**。arXiv 页面是 [arXiv:2606.30534](https://arxiv.org/abs/2606.30534)，v1 提交于 **2026 年 6 月 29 日**，v2 修改于 **2026 年 6 月 30 日**。项目页是 [orca-wm.github.io](https://orca-wm.github.io)。

论文列出的 core contributors 是 **Yihao Wang, Yuheng Ji, Mingyu Cao, Yanqing Shen, Runze Xiao**，其中 **Yuheng Ji** 标注为 project lead，**Zhongyuan Wang** 和 **Pengwei Wang** 是 corresponding authors。

## 核心想法

很多 foundation model family 是按输出形式组织的：语言模型预测 next token，图像/视频模型预测或生成 frames，VLA 模型预测 actions。Orca 提出另一个中心：模型应该先学习世界的内部状态及其转移，下游任务再从这个 latent state 中读取所需信息。

论文把它写成 latent world-state modeling。给定 multimodal world signals \(X=\{X^m\}_{m\in M}\)，encoder 将它们映射成 latent state：

\[
S = f_\theta(X).
\]

然后 state 在 implicit dynamics 和 explicit conditions 下向前或向后演化：

\[
S_{t+\Delta}\sim p_\Theta(S_{t+\Delta}\mid S_t,z_t,c_t),\quad \Delta\in\mathbb{Z}_{\ne 0}.
\]

其中 \(z_t\) 表示不可观测 dynamics，例如 physical laws、object properties、scene dynamics 和 environmental forces。\(c_t\) 表示显式条件，例如 human instructions 或 language-described events。正的 \(\Delta\) 预测未来状态；负的 \(\Delta\) 回溯过去状态。

在 Orca 的第一个版本中，world signals 主要是 vision 和 language。作者把它们看成互补通道：visual signals 捕捉世界如何演化，language signals 描述意义、意图、因果前提和 event structure。

## 两种学习模式

Orca 使用基于 Qwen3.5 的 VLM backbone，并通过两种互补范式学习。

**Unconscious learning** 从连续视频中捕捉密集自然转移。给定视频帧 \(v_t\)，Orca 预测相邻下一帧的 latent \(v^l_{t+1}\)。target 来自 frozen vision encoder，因此监督发生在 latent space，而非 pixel space。这个模式用于从 observation alone 中吸收 motion、occlusion、object interaction 和 local physical regularities。

**Conscious learning** 在语言条件下捕捉稀疏但有意义的转移。视频被分割成 events，每个 event 配有 caption。给定 frame \(v_t\) 和 instruction/event description \(e_{t+\Delta}\)，Orca 预测指定相邻 event 中采样帧的 latent。语言可以描述 future event、past event、task intention 或 causal premise。

conscious branch 还包含 VQA response generation。给定 video \(V\) 和 question \(l_q\)，LM head 生成 answer \(l_a\)，从而保留 latent 的自然语言接口。

## 预训练目标

预训练目标由三项组成：

\[
\mathcal{L}=\lambda_{\mathrm{obs}}\mathcal{L}_{\mathrm{obs}}
+\lambda_{\mathrm{evt}}\mathcal{L}_{\mathrm{evt}}
+\lambda_{\mathrm{vqa}}\mathcal{L}_{\mathrm{vqa}}.
\]

附录给出的具体权重是：

\[
\mathcal{L}_{\mathrm{pre}}
=0.1\mathcal{L}_{\mathrm{obs}}
+0.5\mathcal{L}_{\mathrm{evt}}
+0.4\mathcal{L}_{\mathrm{vqa}}.
\]

latent matching loss 混合了 MSE 和 cosine distance：

\[
\ell_{\mathrm{lat}}(\hat v^l,v^l)
=0.1\lVert \hat v^l-v^l\rVert_2^2
+0.9\left(1-\frac{\langle \hat v^l,v^l\rangle}{\lVert \hat v^l\rVert_2\lVert v^l\rVert_2}\right).
\]

\(\mathcal{L}_{\mathrm{obs}}\) 预测相邻下一帧 latent。\(\mathcal{L}_{\mathrm{evt}}\) 预测 event-conditioned previous 或 next event latent。\(\mathcal{L}_{\mathrm{vqa}}\) 是 answer 的标准 next-token loss。论文在采样层面按约 **5:1** 混合 state-transition samples 和 VQA samples。

query 机制也比较直接。Observation-only transition 用 `<Query 1>` 读出 predicted visual latent。Event-conditioned transition 加入 instruction 和 `<Query 2>`，读出 instruction-conditioned target latent。所有 learnable queries 都从零训练。

## 数据和训练规模

论文构建了一个 world-learning inventory：

| Data type | Scale | Role |
|---|---:|---|
| General video | **125K hours** | Dense visual transitions |
| Event annotations | **160M** | Language-described state transitions |
| General VQA | **11.5M** | Language grounding and world understanding |

视频数据覆盖 ego-centric interaction、exo-centric manipulation、action-free robot execution 和 natural dynamics。Event data 来自视频的 coarse/fine event segmentation 与 captions。VQA data 用于让模型描述和解释观察到的 world states。

当前版本只使用了约 **十分之一** 的 video inventory。附录报告 Orca-4B 和 Orca-0.8B 都使用约 **12.5K hours** 视频，训练 **10,844 steps**，资源是 **32 nodes / 256 GPUs**。base VLM 分别是 **Qwen3.5-4B** 和 **Qwen3.5-0.8B**。vision encoder 冻结；LLM 部分和 visual transition head 可训练。

infra 部分也很实际。作者使用 FlagScale + FSDP2，并加入 chunked cross-entropy loss、activation recomputation 和 communication prefetching。训练吞吐从 StarVLA pipeline 的 **0.66** samples/sec/GPU 提升到 full Orca training 的 **2.91** samples/sec/GPU，论文报告约 **4.4x** 加速。

## Readout 设计

预训练之后，Orca 冻结 backbone，只训练 modality-specific readout modules。

**Language readout** 复用 LM head。它把 latent 读成 answers、explanations 和 event-level reasoning。

**Vision readout** 通过 frozen Stable Diffusion 3.5 MMDiT，把 Orca 的 predicted visual latent 映射到 image space。可训练部分是 MLP adaptor 和 LoRA modules。target image size 是 **768 x 768**，vision readout 训练 **200K steps**。

**Action readout** 将 latent 映射成 robot action chunks。DiT-based Action Expert 使用 flow-matching loss，输入包括 Orca latent、带 time embedding 的 noisy action 和 proprioception。训练时只有 MLP adaptor 和 Action Expert 可训练。真实机器人任务中，Action Expert 在五个任务上每个任务只看 **200 trajectories**。

这个 readout protocol 很关键，因为它隔离了论文真正想测试的问题：预训练是否产生了一个下游 decoder 能使用的 latent？

## 实验结果

第一个 scaling 结果很直接：随着 video data 增长，total pre-training loss 下降；4B model 的 loss 低于 0.8B model。更重要的是，frozen-backbone readouts 会随着 pre-training scale 提升。论文报告 text generation、image prediction 和 action generation 都随 world latent 变强而提高。

**Text generation。** Orca 在 MVBench、TemporalBench、3DSRBench 和 SWITCH 上评估。Orca-4B 平均分 **51.8**，同表中 Qwen3.5-4B 是 **46.7**。论文还把问题聚合成 state transition、commonsense reasoning、spatial relations、dynamic motion 四类能力。Orca-4B 在 state transition 和 dynamic motion 上提升最明显，这和训练目标相符。

**Image prediction。** 论文提出 **PRICE-V0.1**，一个 real-world interaction-conditioned image prediction benchmark。给定 initial image 和 instruction，模型预测 action 执行后的 target state image。Orca-4B+2B 在 Gemini 3.1 Pro、GPT 5.4、Doubao-Seed-2.0 和 Gemma 4-31B judges 下平均 **59.8±10.9**。主表中最接近的 baseline Flux.2 [klein] 是 **56.1±18.1**。定性结论是 Orca 更好地保持 scene consistency、robot morphology、contact relationships 和 instruction-conditioned state change。

**Action generation。** 机器人评估使用双臂轮式 humanoid 的五个任务：Take Book、Stacked Bowls、Pull Out Tissue、Stamp、Scoop Sugar。benchmark 包含 environment OOD 和 object OOD。Orca 对比 V-JEPA 2.1、Qwen3.5 和 \(\pi0.5\)。overall rule-based score 中，Orca 是 **32.4**，\(\pi0.5\) 是 **29.4**，V-JEPA 2.1 是 **17.0**，Qwen3.5 是 **10.5**。Orca 在 environment OOD 上更强，rule-based score **36.6**，\(\pi0.5\) 是 **27.6**。object OOD 更接近：Orca **28.2**，\(\pi0.5\) **31.2**。

诊断指标比单一 success rate 更有信息量。Orca 往往在失败前推进得更远，并且在 progress drops 之后恢复得更好。论文用 PRM-as-a-Judge 指标，例如 MaxProcess in Failure、Failure Near-Success Score 和 Drawdown Recovery Ratio，展示即使失败的 Orca trajectories 也常常更有结构。

## Ablation

ablation 比较三种 losses：

| Pre-training losses | Text | Image | Action | Average |
|---|---:|---:|---:|---:|
| VQA only | 48.4 | - | 10.2 | 29.3 |
| Obs + Event | - | 58.2 | 30.9 | 44.6 |
| Obs + VQA | 50.5 | - | 32.6 | 41.6 |
| Event + VQA | 50.1 | 54.7 | 23.0 | 42.6 |
| Obs + Event + VQA | **51.8** | **59.8** | **32.4** | **48.0** |

结论很清楚。Observation-only transition 对 action readout 特别重要，因为它教授 dense temporal 和 physical dynamics。Event-conditioned transition 对 image prediction 很关键，因为 image readout 需要 instruction-conditioned target states。VQA 保留语言接口并提供 semantic grounding。三者组合得到最均衡的 latent。

## 优点和局限

Orca 的优点首先是 framing。它给出了一条具体路线：学习 world-state latent，然后在 backbone frozen 的情况下，用三个不同下游接口 probing latent。论文还给机器人学习提供了一个有用经验：即使预训练没有 action labels，video-only world pre-training 仍然能改善 action readout。

局限同样重要。Orca 目前主要使用 vision 和 language，尚未纳入 audio、tactile、force、light、proprioception 以及更广泛的科学信号。visual state prediction 监督来自 frozen ViT/VLM latent space，因此 learned world state 仍然绑定在预训练 semantic embedding 上。模型规模是 0.8B 和 4B，作者只使用了十分之一 video inventory。state-transition supervision 主要是 short-horizon 和 event-local。action tasks 仍相对短，在严格 real-robot OOD settings 下成功率还不高。

## Takeaway

Orca 最值得复用的信息是：**先学习 world latent，再让不同 decoders 读取这个 latent 中的内容**。这篇论文更像一个系统级 proposal：通过 dense observation-only transitions、sparse language-conditioned event transitions 和 VQA grounding 训练 backbone；冻结 backbone；再 probing text、image、action readouts。当前结果还不能彻底定义 general world foundation model，但它清楚展示了 Next-State-Prediction 可以成为 multimodal 和 embodied intelligence 的有效组织原则。

</div>
