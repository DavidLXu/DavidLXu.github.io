---
title: "[Paper Notes] TacReasoner: A Dynamic Tactile-Language Framework for Interactive Reasoning in Real-World Scenarios"
date: 2026-07-29
permalink: /posts/2026/07/tacreasoner-paper-notes/
tags:
  - Tactile Reasoning
  - Multimodal Learning
  - Embodied AI
  - Chain of Thought
  - Robotics
---

<div data-lang="en" markdown="1">

## TL;DR

**TacReasoner** treats touch as an evolving interaction instead of a collection of tactile snapshots. Its Dynamic-aware Tactile Encoder keeps a stable appearance representation, explicitly extracts inter-frame deformation, conditions temporal aggregation on the user's question, and fuses the two streams before passing tactile tokens to a language model. The accompanying **TouchCoT-10K** dataset supervises intermediate tactile reasoning, while **DynTAC-Bench** evaluates physical-property understanding, commonsense inference, and contact-state reasoning.

The most useful result is the combination of representation and supervision. A Qwen2.5-based TacReasoner with 7B parameters reaches **66.7% average accuracy** on VTV-150K tasks, ahead of VTV-LLM-7B at 60.4% and VTV-LLM-14B at 62.1%. The gains are largest on elasticity, surface comparison, object-sensation correlation, and other tasks where changing contact evidence matters.

## Paper Info

The paper is **"TacReasoner: A Dynamic Tactile-Language Framework for Interactive Reasoning in Real-World Scenarios"** by **Kailin Lyu, Di Wu, Long Xiao, Jianning Zeng, Jianwei He, Chang Lin, Lianyu Hu, Lin Shu, Jie Hao, and Ce Hao**. It was accepted at **IROS 2026** and is available as [arXiv:2607.05131](https://arxiv.org/abs/2607.05131).

## Why Tactile Reasoning Needs Dynamics

A tactile image records the contact surface at one instant. Many physical properties appear only through change: softness affects how the contact patch expands during indentation, friction affects texture motion during sliding, and contact state is defined by transitions among approach, compression, slip, and release. A model that reconstructs frames or classifies a key contact region can learn strong appearance features while missing these temporal relations.

The paper identifies a second problem at the language level. Existing tactile-language datasets often use predefined attributes and fixed question templates. Such supervision rewards short input-to-label associations and leaves the intermediate inference unconstrained. Under a new object, sensor, or scenario, the language model can produce a plausible physical explanation without grounding it in the observed contact process.

TacReasoner addresses the two issues together. The encoder makes temporal evidence explicit; the structured dataset teaches the language model how to turn that evidence into a staged explanation and answer.

## TouchCoT-10K: Reasoning Supervision from Contact Phases

TouchCoT-10K is built from raw VTV-150K tactile videos. Each video follows a standardized interaction containing indentation, maximum contact, and sliding. The construction pipeline has four steps:

1. Tactile videos, question types, and interaction stages are organized into a consistent schema.
2. A language model such as DeepSeek receives prompts grounded in cues including deformation evolution, contact-area variation, and geometry, then generates a concise reasoning trace.
3. Automatic consistency checks and manual review remove samples whose trace omits a key interaction stage or conflicts with the answer.
4. Each retained sample is serialized as `<think> ... </think><answer> ... </answer>`.

This format turns a label such as "high friction" into a short physical argument: inspect the contour and texture at maximum contact, track texture displacement during sliding, observe deformation during indentation, and connect those changes to the requested property. The dataset therefore supplies supervision at the level where hallucination can begin—the mapping from tactile evidence to a physical claim.

## Dynamic-aware Tactile Encoder

Let a tactile video be $V=\{I_t\}_{t=0}^{T}$. TacReasoner uses two complementary branches.

### Stable appearance branch

A pretrained VTV encoder processes the tactile frames with patch embeddings and temporal positional encodings:

$$
F_{\mathrm{app}}
= f_{\mathrm{enc}}(V)
= \operatorname{ViT}\left(
\{\operatorname{Patch}(I_t)+\operatorname{TE}(t)\}_{t=0}^{T}
\right).
$$

Its global CLS token becomes $F_{\mathrm{app}}$, a compact representation of geometry and appearance. This encoder is frozen to preserve the pretrained tactile semantics.

### Trainable temporal branch

The temporal branch starts from frame differences:

$$
\Delta I_t = I_t-I_{t-1},
\qquad
F_{\mathrm{temp}}
=\operatorname{Enc}_{\mathrm{temp}}
\left(\{\Delta I_t\}_{t=1}^{T}\right).
$$

Frame differencing focuses the branch on deformation propagation, texture displacement, shear accumulation, and slip. The question is embedded and injected as a condition when the temporal tokens are aggregated:

$$
\bar{F}_{\mathrm{temp}}
=\operatorname{Aggregator}(F_{\mathrm{temp}};\,q).
$$

This query conditioning is important. A hardness question should emphasize indentation and contact-area growth; a friction question should emphasize motion during sliding. The same video can therefore produce task-relevant dynamic evidence.

### Appearance–dynamics fusion

The appearance feature queries the aggregated temporal features through cross-attention:

$$
F_{\mathrm{attn}}
=\operatorname{Attention}
\left(
Q=F_{\mathrm{app}},
K=\bar{F}_{\mathrm{temp}},
V=\bar{F}_{\mathrm{temp}}
\right),
$$

$$
F_{\mathrm{enh}}
=\operatorname{FFN}(F_{\mathrm{attn}})+F_{\mathrm{app}}.
$$

The residual connection retains stable geometry, while the attention output adds evidence about how that geometry changes under contact. A two-layer projector finally maps the enhanced feature into the language-model embedding space:

$$
E_V
=W_2\,\operatorname{GELU}(W_1F_{\mathrm{enh}}+b_1)+b_2.
$$

This decomposition is the paper's central architectural idea: one stream describes what the contact looks like; the other describes how it evolves for the current question.

## Two-Stage Training Recipe

TacReasoner separates modality alignment from reasoning activation.

In **Stage I**, the trainable tactile components and tactile-language adapter learn from raw VTV-150K instruction data. The adapter represents tactile patches as pseudo-text tokens, and the language model remains frozen. Token prediction uses standard teacher-forced cross-entropy:

$$
\mathcal{L}_{\mathrm{CE}}
=-\mathbb{E}
\left[
\log \pi_\theta(Y_i\mid V,T_{<i})
\right].
$$

In **Stage II**, the tactile encoder is frozen. The adapter and LoRA parameters in the LLM self-attention layers are fine-tuned on TouchCoT-10K. For a video $V$, prompt $p$, and structured output $O$, the objective is

$$
\mathcal{L}_{\mathrm{SFT}}
=-\mathbb{E}_{(V,p,O)\sim\mathcal{D}_{\mathrm{TouchCoT}}}
\sum_{i=1}^{M}
\log \pi_\theta(y_i\mid E_V,p,y_{<i}).
$$

The experiments use Qwen2.5 backbones at 7B and 14B scale. Training runs on two A100-80GB GPUs with AdamW and a learning rate of $2\times10^{-4}$. LoRA uses rank 128, scaling factor 256, and at most 10,000 steps. An independent set of 545 question-answer pairs over objects unseen during training is used for evaluation.

The ablations support the staging. Removing Stage I lowers the reported reasoning-task average to **51.0%**; removing Stage II lowers it to **40.9%**. Under the full recipe, replacing TouchCoT-10K with VTV-150K gives 62.9%, while the proposed configuration reaches **67.3%**.

## DynTAC-Bench

DynTAC-Bench adds tasks whose answer depends on a contact trajectory. Data are collected with a UR5 robot under a fixed procedure: hover, press, rotate or slide, release, and retract. Each interaction produces a tactile video of about five seconds, and the robot repeats the procedure to collect five videos.

The benchmark contains five matched real/fake fruit pairs and five categories of everyday objects. The fruit replicas are visually convincing and can also be ambiguous under static touch, so successful recognition requires evidence from deformation and motion.

Its tasks span three levels:

- **Fundamental property understanding:** hardness, roughness, texture, elasticity, and friction.
- **Commonsense-driven reasoning:** Surface Feature Distinction (SFD), Surface Optimality Identification (SOI), Object Sensation Correlation (OSC), and Tactile Scenario Analysis (TSA). TSA is held out from the training set.
- **Dynamic-aware reasoning:** Real vs. Fake Object Recognition (RFOR) and Object Contact State Estimation (OCSE).

RFOR tests whether sensed properties agree with the expected physics of an authentic object. OCSE asks the model to identify phases such as contact, sliding, and release from a temporal segment.

## Main Results

On 500 VTV-150K question-answer pairs, averaged over three random seeds, TacReasoner-7B achieves **66.7%** overall accuracy. VTV-LLM-7B reaches 60.4%, and its 14B version reaches 62.1%. TacReasoner-14B raises the average to **68.6%**.

Compared with VTV-LLM-7B, the 7B model improves:

- hardness by 4.26 points, protrusion by 2.82, elasticity by 9.24, and friction by 1.96;
- SFD by 2.26 points, SOI by 12.72, OSC by 11.07, and TSA by 7.0.

The large elasticity gain fits the architecture: elasticity is expressed through temporal deformation and recovery. The larger gains on SOI and OSC also suggest that structured supervision helps when the task requires comparison or a physical inference beyond direct attribute naming.

On DynTAC's dynamic tasks, TacReasoner-7B scores **68%** on RFOR versus 43% for VTV-LLM-7B, and **53%** on OCSE versus 46%. These figures need context. The random baselines are 50% and 33.33%, respectively, and the dynamic test sets are small: RFOR samples three examples per category, while OCSE contains 45 segments. The results are encouraging evidence for the proposed mechanism, with broad generalization still open.

The component ablation gives a clear progression on the four reasoning tasks. The starting configuration averages 59.0%; adding only the Dynamic-aware Encoder reaches 62.9%; adding only TouchCoT-10K supervision reaches 65.8%; combining both reaches **67.3%**. Representation and reasoning data contribute independently, and their combination is strongest.

## Strengths and Limitations

The paper's strongest design choice is its alignment between failure diagnosis and method. Missing dynamics is handled with explicit frame changes and question-conditioned temporal attention. Shallow label association is handled with structured intermediate supervision. DynTAC then tests the same temporal and reasoning capabilities.

The encoder is also economical. It reuses a frozen appearance model, adds a lightweight temporal path, and presents one fused tactile representation to the LLM. The 7B result ahead of a 14B tactile-language baseline shows that modality-specific structure can matter more than simply increasing language-model size.

Several limitations remain:

- TouchCoT traces are generated with templated guidance from a language model and manually filtered. Final-answer accuracy does not establish that each generated trace is faithful to the tactile evidence. Counterfactual videos or explicit rationale-faithfulness tests would make this claim stronger.
- DynTAC uses a standardized UR5 collection procedure and relatively small dynamic test sets. Cross-sensor, cross-protocol, and larger-scale evaluation is needed.
- The system performs tactile video question answering. The paper leaves closed-loop deployment—where a robot chooses the next probing action and updates its conclusion online—for future work.
- Frame differences expose local motion efficiently, but they may also amplify sensor noise, lighting variation, or camera jitter. Robustness under those perturbations is not isolated in the reported ablations.

## Takeaways

TacReasoner offers a practical recipe for tactile foundation models: preserve stable contact appearance, separately encode physical change, let the question select relevant dynamics, align tactile tokens before reasoning fine-tuning, and supervise the evidence-to-conclusion path.

The broader lesson is that embodied reasoning benefits from representations organized around interaction. For touch, a single frame rarely contains the full physical fact. The useful unit is a controlled probe together with its temporal response. TacReasoner makes that principle explicit in architecture, data, and evaluation, and provides a compact foundation for future systems that can actively touch, reason, and decide what to probe next.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**TacReasoner** 将触觉建模为持续演化的交互过程，而非一组彼此独立的 tactile snapshots。它的 Dynamic-aware Tactile Encoder 保留稳定的 appearance representation，显式提取跨帧形变，用用户问题控制 temporal aggregation，再把两条特征流融合后送入 language model。配套的 **TouchCoT-10K** 为中间触觉推理过程提供监督，**DynTAC-Bench** 则评测物理属性理解、常识推断与接触状态判断。

这篇工作的关键结果来自 representation 与 supervision 的组合。基于 Qwen2.5 的 TacReasoner-7B 在 VTV-150K 任务上达到 **66.7% average accuracy**，超过 VTV-LLM-7B 的 60.4% 和 VTV-LLM-14B 的 62.1%。主要收益集中在 elasticity、surface comparison、object-sensation correlation 等依赖动态接触证据的任务上。

## 论文信息

论文题目为 **"TacReasoner: A Dynamic Tactile-Language Framework for Interactive Reasoning in Real-World Scenarios"**，作者为 **Kailin Lyu、Di Wu、Long Xiao、Jianning Zeng、Jianwei He、Chang Lin、Lianyu Hu、Lin Shu、Jie Hao 和 Ce Hao**。论文已被 **IROS 2026** 接收，原文见 [arXiv:2607.05131](https://arxiv.org/abs/2607.05131)。

## 为什么触觉推理需要动态信息

一张 tactile image 只记录某个瞬间的接触表面。很多物理属性只会通过变化显现：softness 决定 indentation 过程中 contact patch 如何扩张，friction 影响 sliding 时的纹理位移，contact state 则由 approach、compression、slip 和 release 之间的转换定义。只做 frame reconstruction 或 key contact region 分类的模型可以学到很强的外观特征，却可能遗漏这些时序关系。

论文在语言层面还指出了第二个问题。现有 tactile-language datasets 往往依赖预定义属性和固定问答模板。这类监督容易鼓励从输入直接匹配标签，中间推断过程缺少约束。面对新物体、新传感器或新场景时，language model 可能生成听起来合理的物理解释，却没有把结论锚定在观测到的接触过程上。

TacReasoner 同时处理这两个问题。Encoder 将 temporal evidence 显式化，structured dataset 则教 language model 把证据转化成分阶段的解释与答案。

## TouchCoT-10K：从接触阶段构造推理监督

TouchCoT-10K 基于 VTV-150K 的原始 tactile videos 构建。每段视频都遵循标准化交互流程，包含 indentation、maximum contact 和 sliding。数据构造分为四步：

1. 将 tactile videos、question types 和 interaction stages 整理为统一格式。
2. 使用 DeepSeek 等 language model，根据 deformation evolution、contact-area variation 和 geometry 等线索生成简洁 reasoning trace。
3. 通过一致性检查和人工审核，删除遗漏关键交互阶段或推理与答案冲突的样本。
4. 将保留样本写成 `<think> ... </think><answer> ... </answer>` 格式。

这个格式把“high friction”一类标签展开为简短的物理论证：检查 maximum contact 时的轮廓与纹理，跟踪 sliding 阶段的纹理位移，观察 indentation 中的形变，再将这些变化连接到问题要求的属性。监督因此覆盖了幻觉可能开始的位置，也就是从 tactile evidence 到 physical claim 的映射过程。

## Dynamic-aware Tactile Encoder

设触觉视频为 $V=\{I_t\}_{t=0}^{T}$。TacReasoner 使用两条互补分支。

### 稳定外观分支

预训练 VTV encoder 使用 patch embeddings 和 temporal positional encodings 处理各帧：

$$
F_{\mathrm{app}}
= f_{\mathrm{enc}}(V)
= \operatorname{ViT}\left(
\{\operatorname{Patch}(I_t)+\operatorname{TE}(t)\}_{t=0}^{T}
\right).
$$

全局 CLS token 构成 $F_{\mathrm{app}}$，用于压缩表示 geometry 与 appearance。这个 encoder 保持 frozen，以保留预训练得到的 tactile semantics。

### 可训练时序分支

Temporal branch 从帧差开始：

$$
\Delta I_t = I_t-I_{t-1},
\qquad
F_{\mathrm{temp}}
=\operatorname{Enc}_{\mathrm{temp}}
\left(\{\Delta I_t\}_{t=1}^{T}\right).
$$

Frame differencing 让这条分支聚焦于 deformation propagation、texture displacement、shear accumulation 和 slip。Question embedding 作为条件注入 temporal tokens 的聚合过程：

$$
\bar{F}_{\mathrm{temp}}
=\operatorname{Aggregator}(F_{\mathrm{temp}};\,q).
$$

这种 query conditioning 很重要。Hardness 问题需要关注 indentation 和 contact-area growth；friction 问题更应关注 sliding 时的运动。同一段视频因而可以提取出与当前任务相关的动态证据。

### 外观—动态融合

Appearance feature 通过 cross-attention 查询聚合后的 temporal features：

$$
F_{\mathrm{attn}}
=\operatorname{Attention}
\left(
Q=F_{\mathrm{app}},
K=\bar{F}_{\mathrm{temp}},
V=\bar{F}_{\mathrm{temp}}
\right),
$$

$$
F_{\mathrm{enh}}
=\operatorname{FFN}(F_{\mathrm{attn}})+F_{\mathrm{app}}.
$$

Residual connection 保留稳定 geometry，attention output 增加几何在接触作用下如何变化的证据。最后，two-layer projector 将增强特征映射到 language-model embedding space：

$$
E_V
=W_2\,\operatorname{GELU}(W_1F_{\mathrm{enh}}+b_1)+b_2.
$$

这个 decomposition 是论文最核心的架构设计：一条特征流描述接触“看起来是什么”，另一条描述它针对当前问题“如何演化”。

## 两阶段训练方法

TacReasoner 将 modality alignment 与 reasoning activation 分开进行。

在 **Stage I**，可训练的 tactile components 与 tactile-language adapter 使用 VTV-150K 原始 instruction data 学习。Adapter 将 tactile patches 表示为 pseudo-text tokens，language model 保持 frozen。Token prediction 使用 teacher-forced cross-entropy：

$$
\mathcal{L}_{\mathrm{CE}}
=-\mathbb{E}
\left[
\log \pi_\theta(Y_i\mid V,T_{<i})
\right].
$$

在 **Stage II**，tactile encoder 被冻结，adapter 与 LLM self-attention layers 中的 LoRA parameters 在 TouchCoT-10K 上 fine-tune。对于 video $V$、prompt $p$ 与 structured output $O$，优化目标为

$$
\mathcal{L}_{\mathrm{SFT}}
=-\mathbb{E}_{(V,p,O)\sim\mathcal{D}_{\mathrm{TouchCoT}}}
\sum_{i=1}^{M}
\log \pi_\theta(y_i\mid E_V,p,y_{<i}).
$$

实验采用 7B 与 14B 两种规模的 Qwen2.5 backbone，在两张 A100-80GB 上训练。AdamW learning rate 为 $2\times10^{-4}$，LoRA rank 为 128、scaling factor 为 256，最多训练 10,000 steps。评测使用由 training 中未见物体组成的 545 个独立 question-answer pairs。

Ablation 支持这种分阶段训练。去掉 Stage I 后，论文报告的 reasoning-task average 降到 **51.0%**；去掉 Stage II 后降到 **40.9%**。在完整流程下，以 VTV-150K 取代 TouchCoT-10K 可得到 62.9%，论文配置达到 **67.3%**。

## DynTAC-Bench

DynTAC-Bench 增加了必须依赖 contact trajectory 才能回答的任务。数据由 UR5 robot 按固定流程采集：hover、press、rotate 或 slide、release、retract。每次交互产生约五秒的 tactile video，robot 重复该过程采集五段视频。

Benchmark 包含五组一一配对的 real/fake fruits，以及五类 everyday objects。仿真水果具有高度逼真的视觉外观，static touch 也可能难以区分，因此判断真伪需要利用 deformation 与 motion 信息。

任务分为三个层次：

- **Fundamental property understanding：** hardness、roughness、texture、elasticity 和 friction。
- **Commonsense-driven reasoning：** Surface Feature Distinction (SFD)、Surface Optimality Identification (SOI)、Object Sensation Correlation (OSC) 与 Tactile Scenario Analysis (TSA)。其中 TSA 不进入 training set。
- **Dynamic-aware reasoning：** Real vs. Fake Object Recognition (RFOR) 与 Object Contact State Estimation (OCSE)。

RFOR 判断触觉属性是否符合真实物体应有的物理特征。OCSE 根据时序片段识别 contact、sliding、release 等阶段。

## 主要结果

在 500 个 VTV-150K question-answer pairs 上，经过三个 random seeds 取平均，TacReasoner-7B 达到 **66.7%** overall accuracy。VTV-LLM-7B 为 60.4%，其 14B 版本为 62.1%。TacReasoner-14B 进一步达到 **68.6%**。

与 VTV-LLM-7B 相比，TacReasoner-7B 的提升包括：

- hardness +4.26 points、protrusion +2.82、elasticity +9.24、friction +1.96；
- SFD +2.26 points、SOI +12.72、OSC +11.07、TSA +7.0。

Elasticity 的大幅提升与架构设计一致：该属性主要通过时序形变与恢复过程显现。SOI 和 OSC 上更大的收益也说明，任务需要 comparison 或超越直接属性命名的物理推断时，structured supervision 更有价值。

在 DynTAC dynamic tasks 上，TacReasoner-7B 的 RFOR 得分为 **68%**，VTV-LLM-7B 为 43%；OCSE 为 **53%**，对照模型为 46%。这些数字需要结合评测规模理解。两个任务的 random baselines 分别为 50% 和 33.33%；dynamic test sets 也较小：RFOR 每类随机选取三个样本，OCSE 共包含 45 个 segments。现有结果支持方法设计的有效性，更广泛的 generalization 仍待验证。

Component ablation 在四个 reasoning tasks 上呈现出清晰的增益路径。起始配置平均为 59.0%；只加入 Dynamic-aware Encoder 后达到 62.9%；只加入 TouchCoT-10K supervision 后达到 65.8%；两者结合达到 **67.3%**。Representation 与 reasoning data 各自都有贡献，组合效果最好。

## 优点与局限

论文最扎实的地方是 failure diagnosis 与 method 之间的对应关系。缺少 dynamics 的问题由显式 frame changes 和 question-conditioned temporal attention 处理；浅层 label association 则由 structured intermediate supervision 处理；DynTAC 又针对同一组 temporal 与 reasoning capabilities 进行评测。

Encoder 也具有较好的经济性。它复用 frozen appearance model，增加轻量 temporal path，只向 LLM 提供一个融合后的 tactile representation。7B 模型超过 14B tactile-language baseline 的结果说明，适合模态结构的建模可能比单纯扩大 language-model size 更有效。

目前仍有几项局限：

- TouchCoT traces 由 language model 在模板化提示下生成，再经过人工过滤。Final-answer accuracy 无法证明每条 reasoning trace 都忠实对应 tactile evidence。加入 counterfactual videos 或专门的 rationale-faithfulness tests 会让这一结论更有说服力。
- DynTAC 使用标准化 UR5 collection procedure，dynamic test sets 的规模也较小。Cross-sensor、cross-protocol 与更大规模评测仍然必要。
- 当前系统完成 tactile video question answering。Robot 自主选择下一次 probing action、在线更新判断的 closed-loop deployment 被留作后续工作。
- Frame differences 能高效暴露局部运动，也可能放大 sensor noise、lighting variation 或 camera jitter。现有 ablation 没有单独报告这些扰动下的 robustness。

## 我的理解

TacReasoner 给 tactile foundation models 提供了一条可操作的路线：保留稳定 contact appearance，单独编码 physical change，让 question 选择相关 dynamics，先完成 tactile-token alignment，再进行 reasoning fine-tuning，并监督从 evidence 到 conclusion 的过程。

更广泛的启发是，embodied reasoning 的 representation 应围绕 interaction 组织。对于触觉，单帧很少包含完整的物理事实；更有用的基本单元是一次受控 probe 及其 temporal response。TacReasoner 在 architecture、data 和 evaluation 三个层面显式落实了这一原则，也为未来能够主动触摸、推理并决定下一步探测动作的系统提供了紧凑基础。

</div>
