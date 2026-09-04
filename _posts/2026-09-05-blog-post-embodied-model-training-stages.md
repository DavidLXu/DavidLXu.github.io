---
title: "Four Stages of Embodied Model Training: From Semantic Priors to Robot Deployment"
date: 2026-09-05
permalink: /posts/2026/09/embodied-model-training-stages/
excerpt: "A bilingual framework for comparing VLA, world-action, and native sensorimotor models—with an interactive map of training stages and the human-to-robot data continuum."
tags:
  - Embodied Intelligence
  - Robot Learning
  - Vision-Language-Action Models
  - World Models
  - Egocentric Data
  - Training Stages
---

<div data-lang="en" markdown="1">

I started with a simple hypothesis: an embodied model passes through four rounds of training—language or vision-language pretraining, robot foundation training, a human-data middle stage, and task-specific fine-tuning. The more training recipes I compared, the less convincing that fixed chronology became. Some learn actions from human data before seeing a robot. Others adapt a video model directly on task demonstrations. Still others acquire a new behavior through a prompt, without another gradient update.

The useful part of the hypothesis survives, with one revision: **these are four functional stages, not four mandatory training runs.** They describe where semantic knowledge, physical priors, actionable representations, and deployment competence come from. Their boundaries can overlap; their order is not universal.

The interactive map emphasizes **shared ingredients**. The article explains **how different models use those ingredients**, what the public evidence supports, and where this framework stops being literal. Use the navigation's English / 中文 switch for both the text and the map. Sources and version scope were checked on September 5, 2026.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

我最初的想法很直接：一个具身模型大概会经历四次训练——语言或视觉语言预训练、机器人大模型训练、以人类数据为主的中间训练，以及针对具体任务的微调。但在对照不同模型的训练配方之后，我发现，把它们固定成四次先后发生的训练，并不准确。有些模型先从人类数据里学动作，再接触机器人；有些直接把视频模型适配到目标任务；还有一些通过一个示范提示就能获得新行为，并不需要再更新权重。

这个想法仍然有用，但我会把它修正为：**四个功能阶段，而不是四次必经的训练。** 它们分别回答语义知识、物理先验、动作表示和部署能力从哪里来。阶段可以重叠，也不必遵循唯一顺序。

下面的交互图侧重展示**共享的数据和训练环节**；正文则解释**不同模型怎样使用这些环节**、公开证据支持到哪里，以及这个框架在哪些地方不能按字面理解。顶部 English / 中文 开关会同时切换正文与图。资料与版本范围核对至 2026 年 9 月 5 日。

</div>

{% include embodied-training-stages.html %}

<p><a href="{{ '/demos/embodied-training-stages/' | relative_url }}" data-i18n-en="Open the interactive map on its own →" data-i18n-zh="单独打开交互图 →">Open the interactive map on its own →</a></p>

<div data-lang="en" markdown="1">

## 1. What the four stages actually mean

| Stage | Name used here | The question it answers |
| --- | --- | --- |
| 1 | **Pre-training — semantic foundations** | How does the system understand language, objects, scenes, and goals? |
| 2 | **Pre-training — physical-world priors** | How does it learn interaction, temporal change, and plausible motion at scale? |
| 3 | **Pre-training / Mid-training — action foundations and grounding** | How does that knowledge become an action representation that can support robot control? |
| 4 | **Fine-tuning / Post-training — deployment adaptation** | How is a pretrained system adapted to a target embodiment, task, or operating distribution? |

For a conventional VLA, Stage 1 often means inheriting a pretrained VLM. As one scale reference, Qwen3 reports approximately **36 trillion tokens** for its pretraining corpus. The unit is tokens—not “trillions of text”—and image/video counts need their own accounting. This is one model family's disclosure, not a universal budget. [Qwen3 technical introduction](https://qwenlm.github.io/blog/qwen3/).

Stage 2 need not output executable actions. Predicting observations or learning latent transitions from action-free video can supply useful temporal structure. But a latent action inferred from video is not automatically an identifiable robot command; observational prediction alone also does not establish causal control.

Stage 3 is about **action grounding**, not a particular sensor. A broad robot corpus can serve this function, as can human motion mapped into a common action space. Stage 2 and Stage 3 may happen in the same training mixture. In a native sensorimotor model, physical knowledge and action structure can develop together, while the final correspondence to a particular robot is learned later.

Stage 4 concerns a narrower deployment distribution. It may use supervised learning, reinforcement learning, distillation, or combinations of them. Engineering a controller or reducing latency can be necessary for deployment, but these operations do not all constitute model fine-tuning. The map includes this deployment context without pretending that every highlighted box is a gradient-based stage.

## 2. The data continuum is a different axis

“Egocentric” describes the viewpoint. It does not tell us whether a sample contains raw video, reconstructed hand poses, calibrated motion capture, a robot-compatible command, or actual robot feedback. Those distinctions determine what supervision the sample provides.

I find the following progression useful: **web semantics → observed interactions → human motion signals → robot-aligned human actions → robot-native trajectories**. This is an alignment spectrum, not a ranking of intrinsic data quality or collection cost. Robot-native data from the wrong task or hardware can still be far from the intended deployment distribution.

A MANUS-type glove, an exoskeleton, or a handheld interface can provide much richer supervision than ordinary video. Yet accurate human joint measurements do not by themselves specify robot control targets. Coordinate frames, kinematics, timing, actuation, contact, and dynamics still matter. Hardware–data co-design can reduce this gap, especially when the capture interface and robot share an action convention; kinematic similarity does not eliminate every embodiment difference.

Consequently, the **same collection interface can supply several stages**. A large, diverse human dataset may build Stage 2 priors; retargeted motion may support Stage 3 grounding; demonstrations collected for a particular robot and task may support Stage 4 adaptation. Detailed language labels can provide instruction supervision, but their benefit depends on temporal alignment, task coverage, and how they enter the objective—not just annotation granularity.

## 3. How representative models occupy the framework

The paths below are my analytical mapping, not stage names standardized by the authors. “2 + 3” means overlapping functions; “3 / 4” means grounding and deployment adaptation may share one training step. A skipped stage does not imply a missing capability.

<div class="training-comparison" markdown="1">

| Model / version scope | Approximate functional path | Main emphasis |
| --- | --- | --- |
| π0.5 | 1 → broad 3 → 4 | Heterogeneous supervised co-training and generalization |
| π0.6 / π*0.6 | 1 → 3 → 4, with experience feeding learning | Separate the supervised base from RECAP's RL extension |
| π0.7 | 1 → overlapping 2 + 3; task-specific 4 often omitted in reported evaluations | Diverse experience and richer conditioning |
| GR00T N1 / N1.5 | 1 → mixed 2 + 3 → 4 | Real, human, simulated, and synthetic data; robot adaptation |
| LingBot-VLA 2.0 | 1 → mixed 2 + 3 → 4 | VLM-based action learning with robot and ego data |
| LingBot-VA 2.0 | Semantic components → 2 → 3 → 4, with co-training | Native causal video–action representation and efficient deployment |
| Cosmos Policy | Video foundations, 1 + 2 → combined 3 / 4 | Adapt a video model to actions, future states, and value |
| Generalist GEN-0 / GEN-1 | Native physical and action learning, 2 + 3 → 4 | High-fidelity human interaction at scale, then robot adaptation |
| Generalist GEN-1.5 | Native base → physical prompting **or** few-step 4 | Distinguish in-context behavior from weight updates |
| EgoScale | 1 → action-labeled human 2 → aligned 3 → 4 | Explicit human-to-robot transfer through a middle stage |
| Helix 02 | Different components occupy different stages | Semantic policy, whole-body action, and low-level control |
| Gemini Robotics, 2025 releases | 1 → robot 3 → embodiment/task 4 | Transfer semantic competence into adaptable robot policies |

</div>

### The π family: supervised learning, RL, and experience reuse are different

**π0.5** combines heterogeneous robot and non-robot supervision, including semantic tasks and high-level action descriptions. I place broad robot learning primarily in Stage 3, followed by deployment-oriented adaptation. Its reported recipe is supervised; it should not be used as the example of on-robot RL. [π0.5 paper](https://arxiv.org/abs/2504.16054).

**π0.6 and π*0.6 must be distinguished.** The base is supervised; the starred model uses RECAP. That framework includes offline RL pretraining, task adaptation, and learning from autonomous robot experience and expert corrections. RL therefore does not belong exclusively to a final box. The shared map's on-robot RL highlight refers specifically to the starred extension. [π*0.6 / RECAP](https://arxiv.org/abs/2511.14759).

**π0.7** emphasizes generalization through richer conditioning and a broader mixture, including autonomous trajectories and experience produced by RL-trained specialists. Reusing or distilling such trajectories is not the same claim as optimizing the resulting policy with an RL objective. Many reported evaluations avoid task-specific post-training; that is not a guarantee that every evaluated task is absent from pretraining. [π0.7 paper](https://arxiv.org/abs/2604.15483), [official introduction](https://www.pi.website/blog/pi07).

### VLA foundations: scale robot learning without losing semantic priors

For **GR00T N1 / N1.5**, the useful distinction is between the inherited visual-language foundation, the mixed embodied training data, and target-robot adaptation. N1 describes combining human video, real robot data, and synthetic sources; N1.5 develops the data and representation recipe further. A simulator or synthetic trajectory source is not evidence of on-robot RL. [GR00T N1](https://research.nvidia.com/publication/2025-03_nvidia-isaac-gr00t-n1-open-foundation-model-humanoid-robots), [GR00T N1.5](https://research.nvidia.com/labs/gear/gr00t-n1_5/).

**LingBot-VLA 2.0** reports 50,000 hours of robot trajectories and 10,000 hours of egocentric data, alongside a VLM-based policy and standardized action/state representation. Human trajectories are processed into usable motion supervision; future-feature and geometry objectives enrich the policy. Such auxiliary prediction does not, by itself, make a VLA equivalent to a generative world-action model. [Official repository](https://github.com/Robbyant/lingbot-vla-v2), [technical report](https://arxiv.org/abs/2607.06403).

### World–action models: the inherited prior and the training boundary both change

**LingBot-VA 2.0** builds a semantic visual–action tokenizer and a causal video–action backbone rather than merely retrofitting a generic bidirectional video generator. It also uses pretrained semantic components; “from scratch” does not mean every component lacks prior training. Human–robot co-training and later adaptation connect this representation to control. Its asynchronous, observation-grounded execution is an inference mechanism, not evidence of RL. [Technical report](https://arxiv.org/abs/2607.08639).

**Cosmos Policy** offers a different route: start from a pretrained video model and use a single robot-demonstration post-training stage to learn actions, future observations, and value. Within this article's framework, action grounding and task adaptation can therefore coincide. Additional rollout data refine prediction and value for planning; the world-model label alone does not specify an RL algorithm. [Cosmos Policy paper](https://arxiv.org/abs/2601.16163).

### Native sensorimotor learning: Generalist is a company and a distinct hypothesis

Generalist AI's **GEN-0** frames high-fidelity physical interaction as a scalable foundation-training substrate. **GEN-1** reports pretraining from scratch on more than half a million hours of human physical data, without robot data in that base, followed by roughly an hour of target-robot data for the reported adaptations. Its introduction also mentions learning from experience, including RL; it is not accurate to summarize the whole program as “no RL.” The public company release does not expose a RECAP-style recipe in equivalent detail. [GEN-0](https://generalistai.com/blog/gen-0), [GEN-1](https://generalistai.com/blog/gen-1).

My interpretation is that this route moves much of physical and action-foundation learning into a common human sensorimotor substrate. It does **not** establish that human data are literally robot commands, or that a separate semantic model is mandatory. Here, “native” describes the training substrate and modeling choice, not a certification of perfect embodiment alignment.

**GEN-1.5** makes another distinction essential: the company reports physical prompting with a 3–12-second demonstration and no gradient updates, alongside adaptation using 1–10 gradient steps. Only the latter is fine-tuning. These are reported capabilities on the release's evaluation tasks, not a universal guarantee of one-shot robot learning. [GEN-1.5](https://generalistai.com/blog/gen-1.5).

### EgoScale, hierarchical control, and a semantic-first route

**EgoScale** is particularly close to an explicit middle-stage story: large-scale, action-labeled human pretraining, aligned human–robot play for mid-training, then downstream post-training. Its human pretraining set contains 20,854 hours. This is not simply action-free ego video; the action supervision is central to the transfer argument. [EgoScale](https://research.nvidia.com/labs/gear/egoscale/).

**Helix 02** is a warning against treating an entire robot stack as one checkpoint. Its semantic, visuomotor, and low-level systems run at different rates; the low-level controller uses retargeted human motion and simulation training. Simulation RL in that component should not be relabeled as on-robot RL post-training of the semantic policy. [Helix 02](https://www.figure.ai/news/helix-02).

For the **2025 Gemini Robotics releases**, the broad story is semantic foundations followed by robot learning and adaptation. The On-Device release describes adapting to new tasks with 50–100 demonstrations. This illustrates targeted deployment learning, not evidence that the entire stack follows a four-run schedule. [Gemini Robotics report](https://arxiv.org/abs/2503.20020), [On-Device introduction](https://deepmind.google/blog/gemini-robotics-on-device-brings-ai-to-local-robotic-devices/).

## 4. Two boundaries that prevent misleading comparisons

**ACT and Diffusion Policy belong near target-task demonstrations, but not necessarily under literal fine-tuning.** Their classic formulations learn task policies through supervised imitation; the policy can be trained from scratch, even if a visual encoder has prior training. Calling all of this “pure post-training” would imply a pretrained robot policy that need not exist. In this map, their location describes deployment scope, not checkpoint history. [ACT](https://arxiv.org/abs/2304.13705), [Diffusion Policy](https://diffusion-policy.cs.columbia.edu/).

**A rollout is data; RL is a learning method.** A failed rollout might train a value model, become a correction example for behavior cloning, or enter reward-conditioned learning. A robot recovering during execution might merely be exercising a fixed policy. Likewise, a demonstration in the context window can change behavior without changing weights. To classify a recipe, I would ask what is predicted, what feedback enters the loss, and which parameters are updated—not whether a video shows recovery.

## 5. What the demo shows—and what the article adds

The demo is deliberately selective. It keeps model names in the selectors and shared categories in the diagram. Highlighting answers **“which ingredients are relevant to this route?”**, not “what is the exact order, scale, or objective of every training run?” Gray means not mapped in this compact view. The GEN selector covers a family of releases; the π0.6 selector explicitly includes its starred extension.

The article supplies the distinctions the graphic compresses: version scope, supervised versus RL objectives, a reused foundation versus native pretraining, joint versus sequential learning, and prompting versus fine-tuning. Company disclosures and technical papers also offer different levels of reproducibility. Neither the number of highlighted nodes nor training hours alone is a model-quality ranking.

My revised formulation is therefore: **semantic foundations → physical priors → action grounding → deployment adaptation**, understood as four questions to ask of a system. VLA, world–action, and native sensorimotor approaches differ less in whether these questions exist than in **where they answer them, what supervision they can scale, and how much target-robot learning remains**.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## 1. 四个阶段到底在划分什么

| 阶段 | 本文采用的名称 | 它回答的问题 |
| --- | --- | --- |
| 1 | **Pre-training：语义基础训练** | 系统怎样理解语言、物体、场景和目标？ |
| 2 | **Pre-training：物理世界预训练** | 怎样规模化地学习交互、时序变化和合理的运动？ |
| 3 | **Pre-training / Mid-training：动作基础训练与 Grounding** | 怎样把这些知识变成能够支持机器人控制的动作表示？ |
| 4 | **Fine-tuning / Post-training：部署后训练** | 怎样把已有模型适配到目标本体、任务或运行分布？ |

对于常见的 VLA，Stage 1 往往是继承一个预训练 VLM。作为量级参考，Qwen3 披露的预训练语料约为 **36 万亿 tokens**。这里的单位是 token，不能笼统写成“数 T 文本”；图像和视频还需要分别统计。这只是一个模型家族的披露，不是所有基座的统一预算。[Qwen3 官方介绍](https://qwenlm.github.io/blog/qwen3/)。

Stage 2 不一定输出可执行动作。用无动作标签的视频预测观察、学习潜在状态转移，也能获得有用的时序结构。但从视频中推断出的 latent action，并不自动对应某个确定的机器人 command；观察预测本身也不等于掌握了因果控制关系。

Stage 3 的核心是**动作 grounding**，而不是某一种传感器。广泛的机器人轨迹可以承担这个功能，映射到共同动作空间的人类运动数据也可以。Stage 2 和 Stage 3 可能在同一份混合数据、同一次训练中完成。对原生 sensorimotor model 来说，物理知识与动作结构可以共同形成，而与某个具体机器人的最后一段对应关系留到后面学习。

Stage 4 面向更具体的部署分布，可以采用监督学习、强化学习、蒸馏，或它们的组合。控制器适配、降低延迟等工程工作也可能是部署所必需的，但不应该全部叫作模型微调。图中保留了这些部署相关因素，并不表示每个亮起的框都是一个需要梯度更新的训练阶段。

## 2. 数据连续谱是另一条轴

“Egocentric”描述的是视角，并没有告诉我们数据里究竟有什么：只有视频，还是有重建的手部姿态、经过标定的动作捕捉、机器人兼容的控制指令，或者真实机器人的反馈？这些区别，才决定它能够提供哪一种监督。

我倾向于用这样一条连续谱理解它：**网络语义 → 观察到的交互 → 人体运动信号 → 与机器人对齐的人类动作 → 机器人原生轨迹**。这是一条动作对齐程度的轴，不是数据质量或采集成本的排行榜。即使是真机数据，如果任务或硬件不匹配，也可能离目标部署很远。

MANUS 一类手套、外骨骼、手持采集接口，能够提供比普通视频丰富得多的监督。但精确的人体关节测量，并不天然等于机器人控制目标。坐标系、运动学、时序、驱动方式、接触和动力学仍然需要处理。硬件与采集系统的 co-design，尤其是共享动作约定的设计，可以减少这段差距；运动学同构并不意味着所有本体差异都消失了。

所以，**同一种采集接口可以服务不同阶段**。大规模、多样化的人类数据可以建立 Stage 2 的先验；经过重定向的运动可以支持 Stage 3 的动作 grounding；针对具体机器人和任务收集的示范，又可以服务 Stage 4。细致语言标注能够提供 instruction following 的监督，但实际收益取决于时序对齐、任务覆盖以及训练目标怎样使用它，而不只是标签写得多细。

## 3. 不同模型怎样占据这四个阶段

下表是我的分析性映射，不是各作者共同采用的官方阶段划分。“2 + 3”表示功能重叠；“3 / 4”表示动作 grounding 与部署适配可能在同一步训练中完成。某个阶段被跳过，也不意味着系统缺少对应能力。

<div class="training-comparison" markdown="1">

| 模型 / 版本范围 | 大致的功能路径 | 主要侧重点 |
| --- | --- | --- |
| π0.5 | 1 → 广泛的 3 → 4 | 异构数据监督共同训练与泛化 |
| π0.6 / π*0.6 | 1 → 3 → 4，经验继续回流学习 | 区分监督基座与 RECAP 的 RL 扩展 |
| π0.7 | 1 → 重叠的 2 + 3；不少评测不做任务专属 4 | 更丰富的经验与条件输入 |
| GR00T N1 / N1.5 | 1 → 混合的 2 + 3 → 4 | 真实、人类、仿真与合成数据，以及机器人适配 |
| LingBot-VLA 2.0 | 1 → 混合的 2 + 3 → 4 | 在 VLM 基础上结合机器人与 ego 数据学动作 |
| LingBot-VA 2.0 | 语义组件 → 2 → 3 → 4，包含共同训练 | 原生因果视频—动作表示与高效部署 |
| Cosmos Policy | 视频基础，1 + 2 → 合并的 3 / 4 | 将视频模型适配为动作、未来状态和价值预测器 |
| Generalist GEN-0 / GEN-1 | 原生物理与动作学习，2 + 3 → 4 | 规模化高保真人类交互，再适配机器人 |
| Generalist GEN-1.5 | 原生基座 → physical prompting **或**少步数 4 | 区分上下文行为适配与权重更新 |
| EgoScale | 1 → 带动作标签的人类 2 → 对齐的 3 → 4 | 通过明确的中间阶段实现人到机器人的迁移 |
| Helix 02 | 不同组件分别占据不同阶段 | 语义策略、全身动作与底层控制 |
| Gemini Robotics，2025 年版本 | 1 → 机器人 3 → 本体 / 任务 4 | 将语义能力迁移到可适配的机器人策略 |

</div>

### π 系列：监督学习、RL 与经验复用是三件事

**π0.5** 的重点是异构的机器人与非机器人监督，包括语义任务和高层动作描述。我把它广泛的机器人学习主要放在 Stage 3，再接面向部署的适配。它披露的训练配方是监督学习，不应该拿来作为真机 RL 的例子。[π0.5 论文](https://arxiv.org/abs/2504.16054)。

**π0.6 和 π*0.6 需要分开理解。** 基础版本采用监督学习；带星版本使用 RECAP。这个框架包含 offline RL pre-training、任务适配，以及从机器人自主经验和专家纠正中继续学习。因此，RL 也不只属于最后一个框。交互图中的真机 RL 高亮，具体对应带星的扩展版本。[π*0.6 / RECAP](https://arxiv.org/abs/2511.14759)。

**π0.7** 更强调丰富条件输入和扩大经验混合，其中包括自主轨迹，以及由 RL 训练的专门策略产生的经验。复用或蒸馏这些轨迹，与最终策略本身采用 RL 目标优化，不是同一个论断。它的不少评测不做任务专属后训练，但这不能自动推出所有评测任务都没有出现在预训练中。[π0.7 论文](https://arxiv.org/abs/2604.15483)、[官方介绍](https://www.pi.website/blog/pi07)。

### VLA 基础：继承语义先验，扩大机器人学习

对于 **GR00T N1 / N1.5**，值得区分的是继承的视觉语言基础、混合的具身训练数据，以及目标机器人的适配。N1 介绍了人类视频、真机和合成来源的结合；N1.5 继续推进数据与表示的训练配方。使用仿真器或合成轨迹，本身并不构成采用真机 RL 的证据。[GR00T N1](https://research.nvidia.com/publication/2025-03_nvidia-isaac-gr00t-n1-open-foundation-model-humanoid-robots)、[GR00T N1.5](https://research.nvidia.com/labs/gear/gr00t-n1_5/)。

**LingBot-VLA 2.0** 披露了 50,000 小时机器人轨迹与 10,000 小时 egocentric 数据，并结合 VLM 策略和标准化的动作 / 状态表示。人类轨迹经过处理，转化为可用的运动监督；未来特征与几何相关目标进一步丰富策略。但加入这类辅助预测，本身并不意味着一个 VLA 就等同于生成式 world-action model。[官方仓库](https://github.com/Robbyant/lingbot-vla-v2)、[技术报告](https://arxiv.org/abs/2607.06403)。

### World–action 路线：基础先验与训练边界都可能改变

**LingBot-VA 2.0** 构建语义视觉—动作 tokenizer 和因果视频—动作骨干，而不只是把一个通用双向视频生成器改造成策略。它同时使用预训练语义组件，因此“从零训练”不表示所有组件都没有预训练。人—机器人共同训练和后续适配将表示连接到控制；异步推理、根据最新观察修正执行，是推理机制，不是使用 RL 的证据。[技术报告](https://arxiv.org/abs/2607.08639)。

**Cosmos Policy** 展示了另一条路线：从预训练视频模型出发，通过一次机器人示范后训练，学习动作、未来观察与价值。在本文的框架里，动作 grounding 和任务适配因此可以同时发生。额外的 rollout 数据又可以改进预测和价值，用于规划；但 world model 这个名称本身没有指定某种 RL 算法。[Cosmos Policy 论文](https://arxiv.org/abs/2601.16163)。

### 原生 sensorimotor 学习：Generalist 是一家公司，也代表一种不同假设

Generalist AI 的 **GEN-0** 把高保真物理交互作为可规模化的基础训练数据。**GEN-1** 披露，其基座从零训练于超过 50 万小时的人类物理数据，基座预训练不使用机器人数据；随后用约一小时的目标机器人数据完成所报告的适配。官方介绍也提到从经验学习，包括 RL，因此不能把整个方案概括为“不用 RL”。不过，公司公开介绍没有提供与 RECAP 同等细致的训练配方。[GEN-0](https://generalistai.com/blog/gen-0)、[GEN-1](https://generalistai.com/blog/gen-1)。

我的理解是，这条路线把大量物理先验与动作基础学习，放进了共同的人类 sensorimotor 数据基础中。这**不等于**证明人类数据就是机器人 command，也不意味着一个独立的语义模型是必需的。这里的“native”更多描述训练数据基础与建模选择，不是一张“完全消除了本体差距”的认证。

**GEN-1.5** 又让一个区别变得不可忽略：公司报告，模型可以接收 3–12 秒示范作为 physical prompt，不做梯度更新；也可以用 1–10 步梯度更新完成适配。只有后一种属于微调。这些是该发布中具体评测任务上的能力，不能泛化成任意机器人任务都能 one-shot 学会的保证。[GEN-1.5](https://generalistai.com/blog/gen-1.5)。

### EgoScale、分层控制，以及语义先行的路线

**EgoScale** 很接近一个明确的中间阶段案例：先做大规模带动作标签的人类数据预训练，再用对齐的人—机器人 play data 做 mid-training，最后进行下游后训练。人类预训练数据为 20,854 小时。这不是单纯的 action-free ego video，动作监督正是其迁移逻辑的重要部分。[EgoScale](https://research.nvidia.com/labs/gear/egoscale/)。

**Helix 02** 则提醒我们，不应该把整个机器人技术栈当成一个 checkpoint。它的语义、视觉动作和底层系统以不同频率运行，底层控制器使用重定向的人体运动与仿真训练。这个组件里的仿真 RL，不能被重新标注成语义策略的真机 RL 后训练。[Helix 02](https://www.figure.ai/news/helix-02)。

对于 **2025 年的 Gemini Robotics 系列**，主线是语义基础、机器人学习，以及后续适配。On-Device 发布介绍了用 50–100 条示范适配新任务的方式。这体现了面向部署的定向学习，并不能证明整个系统按四次训练的固定时间表构建。[Gemini Robotics 报告](https://arxiv.org/abs/2503.20020)、[On-Device 介绍](https://deepmind.google/blog/gemini-robotics-on-device-brings-ai-to-local-robotic-devices/)。

## 4. 两个容易造成误解的边界

**ACT 和 Diffusion Policy 可以放在目标任务示范附近，但不一定是字面意义的 fine-tuning。** 它们的经典形式通过监督模仿学习训练任务策略；策略本身可以从零训练，即使视觉编码器带有预训练。因此，把它们一概叫成“纯后训练”，会暗示一个未必存在的预训练机器人策略。在图中的位置，描述的是部署和任务范围，而不是 checkpoint 的历史。[ACT](https://arxiv.org/abs/2304.13705)、[Diffusion Policy](https://diffusion-policy.cs.columbia.edu/)。

**Rollout 是数据，RL 是学习方法。** 一条失败轨迹可以用来训练价值模型，可以被整理成行为克隆的纠正样本，也可以进入奖励条件学习。机器人在执行时能够恢复，可能只是固定策略已有的能力。同样，把示范放入上下文可以改变行为，却不改变权重。判断训练配方时，我会追问预测目标是什么、什么反馈进入了损失函数、哪些参数被更新，而不只看视频里有没有 recovery。

## 5. Demo 展示什么，Blog 补充什么

Demo 是有意简化的：模型名放在上面的选择按钮里，内部节点保留为共享类别。点亮回答的是**“这条路线涉及哪些环节？”**，而不是“每一轮训练的精确顺序、规模和损失函数是什么？”灰色表示这张简图没有映射。GEN 选项覆盖一个系列的发布；π0.6 选项则明确包含带星扩展。

正文补充了图里被压缩掉的区别：版本范围、监督学习与 RL 目标、继承基座与原生预训练、共同训练与顺序训练，以及 prompting 与 fine-tuning。公司披露和技术论文也具有不同程度的可复现性。亮起的节点数量、甚至训练小时数，都不能单独构成模型能力排名。

所以，我最终会把这套说法改成：**语义基础 → 物理先验 → 动作 grounding → 部署适配**，把它理解为分析一个系统时要问的四个问题。VLA、world–action 和原生 sensorimotor 路线的区别，不在于谁有或没有这四个问题，而在于**它们在哪里回答这些问题，什么监督可以规模化，以及还需要多少目标机器人学习**。

</div>
