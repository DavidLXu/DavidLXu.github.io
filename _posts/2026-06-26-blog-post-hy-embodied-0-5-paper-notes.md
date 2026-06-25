---
title: "[Paper Notes] HY-Embodied-0.5: Embodied Foundation Models for Real-World Agents"
date: 2026-06-26
permalink: /posts/2026/06/hy-embodied-0-5-paper-notes/
tags:
  - Embodied Intelligence
  - Vision-Language Models
  - Vision-Language-Action
  - Robot Learning
  - Spatial Reasoning
  - Paper Notes
---

<div data-lang="en" markdown="1">

## TL;DR

**HY-Embodied-0.5** is Tencent Robotics X and HY Vision Team's attempt to build an embodied VLM foundation model before attaching a robot action head. The paper's main claim is that real-world agents need more than general image-language understanding: they need fine-grained spatial perception, temporal/trajectory reasoning, affordance grounding, and planning-oriented reasoning. The system therefore combines a modality-adaptive **Mixture-of-Transformers (MoT)** architecture, visual latent tokens, embodied/spatial data construction, iterative RL + rejection-sampling post-training, and large-to-small on-policy distillation.

My read: this paper is best treated as a **backbone paper for embodied agents**, not a complete robot policy paper. The strongest technical story is the path from embodied VLM to robot-ready VLA: first build a compact MoT-2B model that can reason about spatial and embodied tasks, then reuse it as the perception/reasoning backbone for downstream real-robot control.

## Paper Info

The paper is **"HY-Embodied-0.5: Embodied Foundation Models for Real-World Agents"** by **Tencent Robotics X and HY Vision Team**, including **Xumin Yu, Zuyan Liu, Ziyi Wang, He Zhang, Yongming Rao, Fangfu Liu, Yani Zhang, Ruowen Zhao, Oran Wang, Yves Liang, Haitao Lin, Minghui Wang, Yubo Dong, Kevin Cheng, Bolin Ni, Rui Huang, Han Hu, Zhengyou Zhang, Linus, and Shunyu Yao**. It appears on arXiv as [arXiv:2604.07430](https://arxiv.org/abs/2604.07430), submitted **April 8, 2026**. Code and models are released at [Tencent-Hunyuan/HY-Embodied](https://github.com/Tencent-Hunyuan/HY-Embodied), with the MoT-2B weights linked from the project repository.

The model family has two main variants:

- **HY-Embodied-0.5 MoT-2B:** an edge-oriented model with about **2B activated / 4B total parameters**.
- **HY-Embodied-0.5 MoE-A32B:** a larger reasoning model with about **32B activated / 407B total parameters**.

## Core Problem

General VLMs are good at describing images, answering broad visual questions, and using internet-scale semantics. Embodied agents need a different mix of abilities. A robot policy or planning system has to know where objects are, how far they are, which part is graspable, what trajectory is plausible, what state will come next, and how an instruction maps into a physical sequence.

HY-Embodied-0.5 frames this as a foundation-model gap. Action outputs are only the final interface. The backbone itself needs stronger **fine-grained visual perception**, **3D/spatial grounding**, and **embodied reasoning for prediction, interaction, and planning**. This is why the paper spends most of its effort on VLM architecture, embodied/spatial data, and post-training, before showing a downstream VLA experiment.

## Architecture

The compact model keeps the usual VLM shape: a visual encoder produces visual tokens, and an LLM processes visual and text tokens together. The difference is that HY-Embodied-0.5 changes how visual tokens are handled after the encoder.

The visual encoder is **HY-ViT 2.0**, a native-resolution ViT with about **400M parameters**. It supports arbitrary-resolution inputs and is distilled from a stronger internal ViT. The paper also trains a larger ViT that turns each **8 x 8 image patch** into a discrete code from a **2K codebook**; those codes are later used as supervision for the visual branch.

The central architectural choice is **Mixture-of-Transformers (MoT)**. Instead of forcing visual and text tokens through fully shared transformer parameters, the model duplicates the QKV and FFN parameters for a vision branch while keeping the language branch separate. Visual tokens use the vision-specific parameters; text tokens use the original language parameters.

This design targets a practical problem: heavy visual training can improve perception while damaging language capability, especially in small models. MoT gives the model more visual capacity without turning the compact model into a slow dense model. The paper reports that MoT converges faster than a dense transformer baseline and adds negligible inference overhead because decoding dominates runtime.

The attention pattern is also modality-specific. Visual tokens use more bidirectional/full attention because image patches do not have the left-to-right causal structure of language. Text tokens retain causal attention. This makes the vision branch more like a visual modeling module while preserving the LLM-style generation path.

## Visual Latent Tokens

HY-Embodied-0.5 appends a learnable **visual latent token** after each image or video frame. The paper treats this token as a bridge between visual full attention and language causal attention. During pre-training, the latent token is supervised to match a global feature from the teacher ViT, so it is encouraged to carry image-level semantics instead of staying at local patch information.

The training objective combines three losses during large-scale pre-training:

\\[
L_{\mathrm{total}} = L_{\mathrm{llm}} + L_{\mathrm{vision}} + L_{\mathrm{global}}
\\]

The visual branch predicts the teacher ViT's next discrete visual code:

\\[
L_{\mathrm{vision}} =
-\frac{1}{N_v}\sum_{i=1}^{N_v}\log p_i(z_i)
\\]

The latent token is aligned to the teacher ViT global feature using negative cosine similarity:

\\[
L_{\mathrm{global}} =
-
\frac{f_{\mathrm{latent}}^\top f_{\mathrm{teacher}}}
{\|f_{\mathrm{latent}}\|\|f_{\mathrm{teacher}}\|}
\\]

After pre-training and mid-training, the extra visual/global objectives are removed; later stages use standard autoregressive language loss. The design is useful because the model gets visual supervision when it is learning representations, then returns to a clean generation objective for reasoning and instruction following.

## Data Recipe

The data construction is the other major contribution. The paper does not rely on generic image-text pairs alone. It mixes visual perception, embodied-centric, spatial-centric, and general understanding data.

The large-scale pre-training stage uses more than **600B tokens**: **389B** general understanding tokens and **236B** embodied/perception tokens. Inside the embodied/perception portion, spatial and robotics data account for **43%**, with the rest coming from visual perception data. The mid-training stage then uses about **30M** higher-quality instances mixed at a **12:5:3** ratio across general understanding, embodied, and spatial data.

The visual perception data includes:

- **62M** Omni-Detection samples for 2D/3D detection and object grounding.
- **36M** depth-estimation samples for absolute and relative depth.
- **5M** segmentation samples based on filtered high-quality masks.
- **11M** pointing/counting samples to reduce enumeration errors and spatial hallucinations.

The embodied-centric data is organized into grounding, affordance, trajectory, understanding, planning, and reasoning. This structure matters. It turns "embodied data" from a vague label into a curriculum: locate the relevant thing, infer what can be done to it, predict or evaluate a path, understand task state, then plan the next actions.

The spatial-centric data targets correspondence, geometry, configuration, measurement, and dynamics. This is the part that makes the model more than a robot benchmark specialist. It trains capabilities like 2D-3D correspondence, metric object size estimation, relative direction, room area estimation, camera motion, and object movement.

## Post-Training

The post-training pipeline is built around long-chain embodied reasoning. It starts with about **100K cold-start CoT instances**, constructed through a human-model collaborative pipeline and filtered for reasoning quality, correctness, and repetition.

For RL, the paper avoids a fixed training set. Each RL round samples from a large candidate pool using the current model. Examples that are always solved are too easy; examples that always fail are too hard. The retained samples are those with partial success, which sit near the current capability frontier. Each RL stage uses **50K** newly selected samples, balanced across perception, prediction, interaction, and planning.

The reward design is task-aware. Grounding uses IoU, Hungarian matching, point distance, or Chamfer distance. Trajectory tasks use DTW or Frechet-style path similarity. Counting and multiple-choice tasks use exact or partial matching. Continuous estimates get regression-style rewards. Free-form reasoning falls back to an LLM judge.

The RL objective is GRPO-style. For each input, the model samples a group of **G = 16** responses, normalizes rewards inside the group, and updates with a clipped policy-ratio objective. The group-relative form matters because embodied tasks have different reward scales; a point-localization score and a planning score should not be treated as directly comparable raw numbers.

The paper then alternates RL with rejection-sampling fine-tuning. RL expands the frontier; rejection sampling selects successful high-quality reasoning traces and turns them into supervised data. In practice, around **1M** candidate examples are filtered into about **300K** high-quality traces for the next SFT stage.

## On-Policy Distillation

The large MoE-A32B model is stronger, but deployment favors the compact MoT-2B model. HY-Embodied-0.5 therefore uses large-to-small **on-policy distillation**. The student first rolls out its own response:

\\[
y \sim \pi_s(\cdot \mid x)
\\]

Then the teacher is evaluated on the same student-generated prefixes. The student minimizes token-level KL to the teacher:

\\[
L_{\mathrm{OPD}} =
\mathbb{E}_{x,y\sim\pi_s}
\left[
\frac{1}{|y|}
\sum_t
\mathrm{KL}
\left(
\pi_t(\cdot \mid x,y_{<t})
\|
\pi_s(\cdot \mid x,y_{<t})
\right)
\right]
\\]

This is more interesting than ordinary response imitation. Offline distillation trains the student on teacher trajectories; on-policy distillation trains the student on states it actually visits during decoding. For embodied reasoning, this is important because many errors happen in intermediate spatial or planning steps before the final answer appears.

## Evaluation

HY-Embodied-0.5 is evaluated on **22 benchmarks** covering visual perception, embodied understanding, and spatial understanding. The compact **MoT-2B** model reaches the best score on **16 of 22** benchmarks and second place on **4** more among compared sub-7B embodied/general VLMs. The paper reports an average score of **58.0%**, outperforming Qwen3-VL-4B by **10.2 points** and RoboBrain2.5-4B by **8.6 points** in that evaluation setup.

The larger **MoE-A32B** model reaches **67.0** average over the same benchmark suite, ahead of Gemini 3.0 Pro at **63.6**, Seed 2.0 at **66.2**, Qwen 3.5 A17B at **66.1**, and Kimi K2.5 at **61.1** in the paper's reported comparison.

The most useful interpretation goes beyond "higher score." The benchmark categories line up with the design choices: perception improvements support detection, depth, segmentation, and counting; spatial-centric data supports 3D and multi-view reasoning; embodied-centric data supports affordance, trajectory, and planning tasks. The reported gains are most meaningful where these capabilities are physically relevant.

## Robot Control

The robot section extends HY-Embodied-0.5 MoT-2B into a VLA model by adding an action expert similar to the \\(\pi_0\\) / \\(\pi_{0.5}\\) design. The system first fine-tunes on **5K hours** of UMI data. Because this stage uses UMI data, the model has not yet seen the specific robot embodiment used in later deployment.

The model is then SFT-trained on real-robot data for three tasks, with **300-700 demonstrations per task**. The setup uses a dual-arm Xtrainer with head-mounted and wrist-mounted cameras. Evaluation uses **20 real-robot trials per task** with randomized object poses.

The reported success rates are:

| Task | HY-Embodied-0.5 VLA | \\(\pi_0\\) | \\(\pi_{0.5}\\) |
|---|---:|---:|---:|
| Precision Plug-in Packing | 85% | 80% | 85% |
| Tableware Stacking | 80% | 60% | 85% |
| Mug Hanging | 75% | 45% | 50% |

The mug hanging result is the clearest signal: it is the hardest of the three tasks and shows the largest margin. The paper's claim is that the embodied VLM backbone, UMI pre-training, and MoT architecture transfer into manipulation after task-specific SFT.

## Limitations

The paper is broad, so some details are inevitably compressed. The VLA section is convincing as a downstream signal, but it is shorter than the backbone sections and does not yet isolate every component of the robot stack. The reported robot tasks also use SFT with task-specific demonstrations; the paper does not establish zero-shot robot control.

The benchmark suite is large, yet embodied VLM evaluation remains unstable as a field. Some baselines are reported in best-of thinking/non-thinking mode, and the paper notes repetitive thinking problems for some Qwen3.5 variants. This makes exact leaderboard interpretation less important than the consistent pattern across perception, spatial, and embodied tasks.

Finally, HY-Embodied-0.5 is still mostly a VLM foundation model. Bridging language and action is explicitly listed as future work. The newer Hy-Embodied-0.5-VLA report appears to continue that direction, but this paper's main contribution is the embodied perception/reasoning backbone.

## Takeaways

HY-Embodied-0.5 is useful because it treats embodiment as a foundation-model design problem. The model architecture protects language ability while giving vision its own capacity; latent tokens summarize visual inputs for language reasoning; data construction targets physical-world competencies; post-training turns partial successes into stronger reasoning traces; and on-policy distillation transfers the large model's behavior into a deployable compact model.

For robotics, the reusable idea is clear: build the VLA stack on a backbone that already understands space, affordance, trajectory, and planning. The action head matters, but the "brain" under it matters too.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**HY-Embodied-0.5** 是 Tencent Robotics X 和 HY Vision Team 面向 embodied agents 做的一组 foundation models。它的核心判断是：真实世界智能体需要的能力超过普通 image-language understanding，必须具备 fine-grained spatial perception、temporal/trajectory reasoning、affordance grounding，以及面向 planning 的 embodied reasoning。因此系统把 **Mixture-of-Transformers (MoT)**、visual latent tokens、embodied/spatial 数据构造、iterative RL + rejection-sampling post-training，以及 large-to-small on-policy distillation 组合在一起。

我的理解：这篇更适合作为 **embodied agent 的 backbone paper** 来读，完整 robot policy 不是它的主战场。最重要的技术主线是从 embodied VLM 到 robot-ready VLA：先训练一个能做空间和具身推理的 compact MoT-2B model，再把它作为下游真实机器人控制的 perception/reasoning backbone。

## Paper Info

论文标题是 **"HY-Embodied-0.5: Embodied Foundation Models for Real-World Agents"**，作者来自 **Tencent Robotics X 和 HY Vision Team**，包括 **Xumin Yu、Zuyan Liu、Ziyi Wang、He Zhang、Yongming Rao、Fangfu Liu、Yani Zhang、Ruowen Zhao、Oran Wang、Yves Liang、Haitao Lin、Minghui Wang、Yubo Dong、Kevin Cheng、Bolin Ni、Rui Huang、Han Hu、Zhengyou Zhang、Linus 和 Shunyu Yao**。论文在 arXiv 上是 [arXiv:2604.07430](https://arxiv.org/abs/2604.07430)，提交日期是 **2026 年 4 月 8 日**。代码和模型发布在 [Tencent-Hunyuan/HY-Embodied](https://github.com/Tencent-Hunyuan/HY-Embodied)，MoT-2B 权重也从项目仓库链接出去。

模型族包含两个主要版本：

- **HY-Embodied-0.5 MoT-2B:** 面向 edge deployment，约 **2B activated / 4B total parameters**。
- **HY-Embodied-0.5 MoE-A32B:** 面向复杂推理，约 **32B activated / 407B total parameters**。

## Core Problem

通用 VLM 擅长描述图片、回答一般视觉问题、利用互联网语义知识。embodied agents 需要的能力组合不同。机器人策略或规划系统要知道物体在哪里、距离多远、哪一部分可抓、轨迹是否合理、下一状态是什么，以及一条指令怎样落到物理动作序列。

HY-Embodied-0.5 把这个问题看成 foundation-model gap。action output 只是最终接口；backbone 本身也需要更强的 **fine-grained visual perception**、**3D/spatial grounding**，以及用于 prediction、interaction 和 planning 的 **embodied reasoning**。所以论文的大部分篇幅在讲 VLM architecture、embodied/spatial data 和 post-training，然后再展示 downstream VLA experiment。

## Architecture

compact model 保留常见 VLM 形态：visual encoder 产生 visual tokens，LLM 共同处理 visual/text tokens。不同之处在于，HY-Embodied-0.5 改了 visual tokens 进入 LLM 后的处理方式。

visual encoder 是 **HY-ViT 2.0**，一个约 **400M 参数**的 native-resolution ViT。它支持 arbitrary-resolution inputs，并从更强的内部 ViT distill 而来。论文还训练了一个更大的 ViT，把每个 **8 x 8 image patch** 编成来自 **2K codebook** 的 discrete code；这些 codes 后续作为 vision branch 的监督信号。

核心架构选择是 **Mixture-of-Transformers (MoT)**。模型没有强行让 visual 和 text tokens 共用所有 transformer 参数，而是为 vision branch 复制一套 QKV 和 FFN 参数，同时保留 language branch。visual tokens 使用 vision-specific parameters；text tokens 使用原始 language parameters。

这个设计解决的是一个实际问题：heavy visual training 可以增强 perception，但也可能损伤 language capability，尤其在小模型里更明显。MoT 给视觉侧额外容量，同时避免把 compact model 变成很慢的 dense model。论文报告 MoT 比 dense transformer baseline 收敛更快，并且 inference overhead 很小，因为实际推理中 decode 阶段占主导。

attention pattern 也按模态区分。visual tokens 使用更接近 bidirectional/full attention 的方式，因为 image patches 没有语言那种 left-to-right causal structure。text tokens 仍然使用 causal attention。这让 vision branch 更像视觉建模模块，同时保留 LLM-style generation path。

## Visual Latent Tokens

HY-Embodied-0.5 在每张图或每个视频帧后面追加一个可学习的 **visual latent token**。论文把它看成连接 visual full attention 和 language causal attention 的桥。pre-training 时，latent token 会被监督去匹配 teacher ViT 的 global feature，因此它被鼓励携带 image-level semantics，避免停留在局部 patch 信息上。

large-scale pre-training 阶段的目标包含三项：

\\[
L_{\mathrm{total}} = L_{\mathrm{llm}} + L_{\mathrm{vision}} + L_{\mathrm{global}}
\\]

vision branch 预测 teacher ViT 的 next discrete visual code：

\\[
L_{\mathrm{vision}} =
-\frac{1}{N_v}\sum_{i=1}^{N_v}\log p_i(z_i)
\\]

latent token 用 negative cosine similarity 对齐 teacher ViT 的 global feature：

\\[
L_{\mathrm{global}} =
-
\frac{f_{\mathrm{latent}}^\top f_{\mathrm{teacher}}}
{\|f_{\mathrm{latent}}\|\|f_{\mathrm{teacher}}\|}
\\]

pre-training 和 mid-training 之后，额外的 visual/global objectives 会被移除；后续阶段只优化标准 autoregressive language loss。这个设计的好处是：模型在学 representation 时获得视觉监督，在推理和指令遵循阶段回到干净的 generation objective。

## Data Recipe

数据构造是另一个主要贡献。论文没有只依赖普通 image-text pairs，而是混合 visual perception、embodied-centric、spatial-centric 和 general understanding data。

large-scale pre-training 阶段使用超过 **600B tokens**：其中 **389B** 是 general understanding tokens，**236B** 是 embodied/perception tokens。在 embodied/perception 部分里，spatial 和 robotics data 占 **43%**，其余来自 visual perception data。mid-training 阶段继续使用约 **30M** 高质量实例，并按 **12:5:3** 混合 general understanding、embodied 和 spatial data。

visual perception data 包括：

- **62M** Omni-Detection samples，用于 2D/3D detection 和 object grounding。
- **36M** depth-estimation samples，用于 absolute 和 relative depth。
- **5M** segmentation samples，来自过滤后的高质量 masks。
- **11M** pointing/counting samples，用来减少 enumeration errors 和 spatial hallucinations。

embodied-centric data 被组织成 grounding、affordance、trajectory、understanding、planning 和 reasoning。这种结构很重要。它把 "embodied data" 从一个宽泛标签变成 curriculum：先定位相关物体，再判断可操作性，预测或评估轨迹，理解任务状态，最后规划后续动作。

spatial-centric data 关注 correspondence、geometry、configuration、measurement 和 dynamics。这一部分让模型超出机器人 benchmark specialist 的范围，学习 2D-3D correspondence、metric object size estimation、relative direction、room area estimation、camera motion 和 object movement 等能力。

## Post-Training

post-training pipeline 围绕 long-chain embodied reasoning 展开。它先构造约 **100K cold-start CoT instances**，这些样本来自 human-model collaborative pipeline，并经过 reasoning quality、correctness 和 repetition 等维度过滤。

RL 阶段不使用固定训练集。每轮 RL 都让当前模型在一个大 candidate pool 上多次采样。总是做对的样本太简单；总是失败的样本太难。保留下来的样本是 partial success 的部分，也就是当前能力边界附近的例子。每个 RL stage 使用 **50K** 个新选择样本，并在 perception、prediction、interaction 和 planning 之间做平衡。

reward design 是 task-aware 的。grounding 使用 IoU、Hungarian matching、point distance 或 Chamfer distance；trajectory tasks 使用 DTW 或 Frechet-style path similarity；counting 和 multiple-choice 使用 exact 或 partial matching；continuous estimates 使用 regression-style rewards；free-form reasoning 则 fallback 到 LLM judge。

RL objective 是 GRPO-style。对每个输入，模型采样 **G = 16** 个 responses，在组内归一化 rewards，再用 clipped policy-ratio objective 更新。group-relative 形式很适合 embodied RL，因为不同任务的 reward scale 差异很大；point localization score 和 planning score 不应该直接用原始数值比较。

随后论文交替使用 RL 和 rejection-sampling fine-tuning。RL 扩展能力边界；rejection sampling 选择成功且高质量的 reasoning traces，并把它们变成 supervised data。实践中，约 **1M** candidate examples 被过滤成约 **300K** high-quality traces，用于下一轮 SFT。

## On-Policy Distillation

大的 MoE-A32B model 更强，但部署目标偏向 compact MoT-2B。HY-Embodied-0.5 因此使用 large-to-small **on-policy distillation**。student 先 rollout 自己的 response：

\\[
y \sim \pi_s(\cdot \mid x)
\\]

然后 teacher 在同样的 student-generated prefixes 上做 teacher forcing。student 最小化每个 token 上对 teacher distribution 的 KL：

\\[
L_{\mathrm{OPD}} =
\mathbb{E}_{x,y\sim\pi_s}
\left[
\frac{1}{|y|}
\sum_t
\mathrm{KL}
\left(
\pi_t(\cdot \mid x,y_{<t})
\|
\pi_s(\cdot \mid x,y_{<t})
\right)
\right]
\\]

这比普通 response imitation 更有意思。offline distillation 让 student 学 teacher trajectories；on-policy distillation 让 student 在自己实际 decoding 会访问到的 states 上学习 teacher。对 embodied reasoning 来说，这很关键，因为很多错误发生在中间的空间推理或 planning steps，早于 final answer 出现。

## Evaluation

HY-Embodied-0.5 在 **22 个 benchmarks** 上评估，覆盖 visual perception、embodied understanding 和 spatial understanding。compact **MoT-2B** 在 sub-7B embodied/general VLM 对比中，取得 **16/22** 个 benchmark 第一，以及另外 **4** 个第二。论文报告平均分为 **58.0%**，在该设置下比 Qwen3-VL-4B 高 **10.2 points**，比 RoboBrain2.5-4B 高 **8.6 points**。

更大的 **MoE-A32B** 在同一 benchmark suite 上平均分为 **67.0**，高于论文报告中的 Gemini 3.0 Pro **63.6**、Seed 2.0 **66.2**、Qwen 3.5 A17B **66.1** 和 Kimi K2.5 **61.1**。

这里最有价值的解读超过了分数本身。benchmark categories 和设计选择是对齐的：perception improvements 支撑 detection、depth、segmentation 和 counting；spatial-centric data 支撑 3D 和 multi-view reasoning；embodied-centric data 支撑 affordance、trajectory 和 planning tasks。真正有意义的是这些能力都和物理世界任务相关。

## Robot Control

robot section 把 HY-Embodied-0.5 MoT-2B 扩展成 VLA model，方法是在 backbone 上加入类似 \\(\pi_0\\) / \\(\pi_{0.5}\\) 的 action expert。系统先在 **5K 小时** UMI data 上 fine-tune。因为这一阶段只用 UMI data，模型还没有看到后续部署所用的具体 robot embodiment。

随后模型在三个任务的真实机器人数据上做 SFT，每个任务收集 **300-700 条 demonstrations**。硬件是 dual-arm Xtrainer，带 head-mounted 和 wrist-mounted cameras。评估每个任务做 **20 次 real-robot trials**，object poses 随机初始化。

论文报告的成功率如下：

| Task | HY-Embodied-0.5 VLA | \\(\pi_0\\) | \\(\pi_{0.5}\\) |
|---|---:|---:|---:|
| Precision Plug-in Packing | 85% | 80% | 85% |
| Tableware Stacking | 80% | 60% | 85% |
| Mug Hanging | 75% | 45% | 50% |

Mug Hanging 是最清楚的信号：它是三个任务中最难的一个，margin 最大。论文的主张是 embodied VLM backbone、UMI pre-training 和 MoT architecture 能在 task-specific SFT 后迁移到 manipulation。

## Limitations

这篇覆盖面很宽，所以一些细节不可避免地压缩了。VLA section 作为 downstream signal 有说服力，但篇幅明显短于 backbone 部分，也没有完全拆开 robot stack 的每个组件。机器人实验仍然使用 task-specific demonstrations 做 SFT，因此不能说明 zero-shot robot control。

benchmark suite 很大，但 embodied VLM evaluation 这个领域本身仍然不稳定。一些 baseline 使用 thinking/non-thinking 取更优结果，论文也提到部分 Qwen3.5 variants 会产生重复 thinking。精确 leaderboard 解读的重要性低于跨 perception、spatial 和 embodied tasks 的一致趋势。

最后，HY-Embodied-0.5 本质上仍然主要是 VLM foundation model。论文把 bridging language and action 明确列为后续方向。更新的 Hy-Embodied-0.5-VLA report 看起来继续推进这条线，但这篇的主要贡献是 embodied perception/reasoning backbone。

## Takeaways

HY-Embodied-0.5 的价值在于把 embodiment 当成 foundation-model design problem。architecture 上保护 language ability，同时给 vision 侧自己的容量；latent tokens 把视觉输入汇总给语言推理；数据构造对准 physical-world competencies；post-training 把 partial successes 变成更稳定的 reasoning traces；on-policy distillation 再把大模型行为转移到可部署的小模型。

对 robotics 来说，可复用的观点很清楚：VLA stack 应该建立在已经理解 space、affordance、trajectory 和 planning 的 backbone 上。action head 很重要，但它下面的 "brain" 同样重要。

</div>
