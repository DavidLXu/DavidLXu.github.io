---
title: "[Paper Notes] DiagGen: Agentic Generation of Deformable Assets with Sim-based Diagnostics for Robotic Simulation"
date: 2026-10-12
permalink: /posts/2026/10/diaggen-paper-notes/
tags:
  - Deformable Manipulation
  - Simulation
  - Asset Generation
  - Vision-Language Models
  - Real2Sim
  - Paper Notes
---

<div id="diaggen-en" data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

A generated USB hub can look convincing while its cable moves like a rigid extension of the case. **DiagGen** tests such assets in a physics simulator, observes their response to controlled interactions, and sends the evidence back to the generation stage responsible for the suspected fault. Starting from one image, it builds geometry and material specifications, then runs a **generate–simulate–diagnose–refine** loop.

The useful idea is the repair decision: an implausibly stiff cable may require a new material assignment, a better part mask, or a corrected mesh. DiagGen makes those alternatives explicit. In the paper's 40-object experiment, diagnostics requests 14 revisions. Static specification scores improve, while paired interaction judgments favor nine revisions, four baselines, and one tie. The method provides a practical way to debug generated assets; the results also show why each repair needs another interaction test.

## Paper and sources

**DiagGen: Agentic Generation of Deformable Assets with Sim-based Diagnostics for Robotic Simulation**, by **Guanxiong Chen, Yiduo Qu, Qianjun Xia, Pengyu Jing, Yixian Cheng, Bole Ma, Pengzhi Yang, Bingyang Zhou, Ziming Li, Shashwat Suri, Gongbo Sun, Chao Liu, Peter Yichen Chen, Ziqiu Zeng, and Fan Shi**. The first three authors share equal technical contribution. Affiliations span UBC, Cambridge, NUS, FAU, and Wisconsin–Madison.

These notes follow the eight-page preprint [arXiv:2609.23103v1](https://arxiv.org/abs/2609.23103v1), submitted September 19, 2026. See the [PDF](https://arxiv.org/pdf/2609.23103v1) and [project page](https://diaggen.github.io/) for the original figures and videos. The cited version does not state a conference acceptance. Results below are author-reported; the interpretation and proposed evaluation priorities are my reading of the paper.

## 1. Part boundaries determine which physics can be assigned

The USB hub example explains why physical repair reaches upstream into perception. In the initial asset, poor segmentation prevents the cable from becoming a distinct deformable part. Downstream processing consequently assigns one material to the whole object. During a grasp-and-lift test, the cable keeps an overly stiff bend as the case rises. After segmentation repair, the cable and case can receive different material behavior: the cable stays attached, bends under gravity, and lets the connector hang downward (Section IV-C and Fig. 5).

This dependency shapes the generation pipeline. Image cleanup produces a reference image and a description emphasizing rest shape and material cues. SAM3 supplies part masks, and OmniPart uses the masks and description to reconstruct separate part meshes. Material inference assigns mechanical properties to the parts. Mesh processing establishes metric scale and joins the parts into a connected, monolithic mesh for Genesis. Diagnostics tests that candidate before final export.

The paper uses volumetric meshes and Genesis's linear elastic material model to represent objects containing both soft and relatively rigid regions. The material specification includes Young's modulus $E$, Poisson's ratio $\nu$, density $\rho$, friction, and representation choices such as fill mode. Connectivity is just as consequential as these values: a tetrahedralized OmniPart toy separates during a lift when its parts lack an elastic connection; DiagGen's monolithized version remains one object under the same action.

For me, this is the strongest motivation for the workflow. A usable deformable asset couples semantic parts, geometry, scale, connectivity, and material response. A failure in one layer can appear as a material problem during simulation.

## 2. The diagnostic agent chooses a physical question to test

The agent receives indexed parts, geometry summaries, and material specifications, then proposes up to **four semantic anchors**. Each anchor identifies a region with informative behavior, such as a handle, rim, flap, or compliant body, and states a physical hypothesis. A grasp box specifies the intended contact region. Preview renders let the agent correct the target and motion direction before running the interaction.

Each approved anchor starts a fresh episode from a resting state. The end effector approaches, grasps the selected region, applies a prescribed displacement, releases it, and allows the object to settle. The protocol is shared across revisions; the anchor, displacement, duration, and observation schedule depend on the asset. If the evidence is insufficient, the agent can pause, inspect, and run further probes.

The observations include synchronized RGB triptychs from top and oblique views, overlays linking visible regions to parts, geometry and action metadata, step summaries, and runtime logs. Deformation under contact and recovery after release provide different evidence. The metadata helps distinguish a material mismatch from an incorrect target, bad scale, missing geometry, or a simulator initialization failure.

The diagnostic agent returns observations, a suspected cause, and a recommended repair route. An orchestrator considers the revision history and decides whether to accept the asset, launch the repair, or halt. This is an inference-time workflow built around model reasoning and tool calls. The paper's central mechanism does not depend on a newly trained end-to-end asset generator or a differentiable reconstruction objective.

## 3. Repair reruns the responsible stage and its downstream stages

Section III-C defines three destinations for repair. Problems in the diagnostic episode itself, such as a misplaced grasp target, stay within diagnostics.

| Repair destination | Evidence that motivates it | Artifacts preserved before rebuilding |
|---|---|---|
| Segmentation | Distinct functional regions were merged, or a continuous region was fragmented | Cleaned image reference |
| Material inference | Geometry is coherent, but representation or mechanical response is implausible | Reference, masks, and OmniPart meshes |
| Mesh processing | Scale, topology, or discretization prevents meaningful contact or deformation | Earlier artifacts, including representation and material assignments |

The selected stage and every later stage run again to produce a complete candidate. Versioned outputs preserve which image, masks, geometry, materials, and diagnostic evidence produced each revision. The exported bundle contains the asset and its supporting manifest, material specification, and diagnostic record.

Table II gives concrete examples of the information passed through this loop. For a juice box, Genesis rejects initialization because local self-clearance is below the assigned shell-thickness threshold. The material stage reduces shell thicknesses and replaces a uniform 3.0 GPa stiffness with 0.8, 0.7, 0.6, and 0.3 GPa for the body, top, seam, and flap. The rebuilt candidate initializes and completes its probes. These are generated settings that resolve the reported failure; the paper does not establish them as measured properties of the photographed carton.

A medical bag exposes a different problem. Its surviving pouch looks stable during interaction, but handles, straps, and hardware are absent from the simulated object. Mesh processing increases fidelity for the missing parts and restores all five part labels in a connected mesh with 13,318 tetrahedra. Stable motion of the surviving geometry would have missed that failure.

## 4. Static consistency and dynamic plausibility answer different questions

**Part–Material Specification Consistency (PMSC)** scores whether the asset's static specification agrees with the image and common material priors. Two independent VLM evaluators inspect an anonymous candidate; they do not see its revision status, diagnostic history, paired alternative, or each other's judgment. One assigns a whole-asset score $H\in\{1,2,3,4,5\}$. The other sets $F=1$ when a major concern undermines the representation or specification, and $F=0$ otherwise. Equation (1) gives

$$
S=\max\left(1,\;H-F-\mathbf{1}[T>40{,}000]\right),
$$

where $T$ is the tetrahedron count. The 40,000 threshold is a heuristic computation budget; exceeding it costs one point. PMSC therefore combines semantic and material consistency with a mesh-cost penalty. It is not a force or deformation error measured against a real object. The reported experiment applies this rubric retrospectively to existing independent reviews.

**Paired Asset Interaction Plausibility (PAIP)** compares the baseline and revision in motion. Before examining the revision, the evaluation freezes one probe from the baseline diagnostic evidence, including its target part, anchor, and action. Both candidates execute that probe under the same simulator, controller, and camera settings, with each grounding the target on its own parts. Two VLM judges each compare A versus B and B versus A, producing four judgments for the final win/loss/tie outcome. Swapping presentation order helps mitigate position bias.

The repair experiment uses GPT-5.6 Luna at Max reasoning for generation and diagnostics, and GPT-5.6 Terra at Max reasoning for PAIP judging. Using another model variant and hiding revision information reduce some evaluation biases. They still leave an evaluation based on visual plausibility and model priors, without calibrated physical ground truth.

## 5. What the experiments actually establish

The fixed evaluation set contains **40 objects** from phone images and prior work. Each run permits **at most one repair** to keep the experiment tractable. The before/after comparisons concern the 14 assets selected for revision.

| Evaluation | Scope | Reported result |
|---|---|---|
| Seeded-fault diagnosis | Three selected objects, one known fault per object | Correct issue and repair destination in all three cases |
| PMSC before/after | 14 revised assets; five-point scale | Mean 2.14 → 3.43; 10 improve, 4 tie, 0 decline |
| PMSC without revision | 26 assets accepted on the first attempt | Mean 3.12 |
| PAIP before/after | The same 14 revised assets | Revised wins 9; baseline wins 4; 1 tie |

The seeded faults isolate the three repair routes: a curling iron's flexible cord receives barrel-like stiffness; a massager's segmentation omits most of its metal coil; kitchen tongs have their metric scale changed from 0.28 m to 2.8 m. GPT-5.5 at high reasoning diagnoses these cases without being told the injected issue or its owning stage. The three successes are useful qualitative evidence for routing, with a deliberately small and unambiguous test set.

The dynamic results deserve as much attention as the static gain. The revised plunger cup deforms more plausibly relative to its handle, although the baseline recovers more cleanly after release. The baseline plush kitten supports slightly better garment selection and a similar response with less force. For the sport watch, the baseline buckle and keeper respond more clearly; the revised target barely moves. A better specification score can coexist with a worse response to a particular interaction.

The robotic case studies use Genesis's implicit FEM solver with SAP contact and an agent that iteratively proposes gripper poses and apertures, simulates them, and revises the trajectory. The demonstrations cover a toy with a keyring, kitchen tongs and a cookie, and a USB hub. A scene reconstruction example also integrates a DiagGen asset into Agentic Real2Sim using Genesis. These studies demonstrate simulation usability and qualitative behavior. The paper leaves quantitative effects on policy learning and real-world manipulation success for future work.

## 6. What I would reuse, and what I would measure next

I would reuse the combination of **targeted interaction tests, explicit repair destinations, and versioned artifacts** in an asset-generation system. It gives a failed rollout a concrete next action and makes regressions inspectable. For a downstream task, I would preserve its critical probes and require repaired assets to pass them again before entering a training set.

The hardest unresolved issue is attribution. Bad segmentation and bad materials can produce similar symptoms, a limitation the authors explicitly acknowledge. Three isolated faults do not establish reliable diagnosis when several stages are wrong at once. The one-repair budget also leaves the behavior of longer revision loops largely untested, and large-scale parallel generation has not been evaluated.

If the goal is diverse, plausible objects for simulation, this workflow looks useful. If the goal is a quantitatively accurate twin of a particular object, I would add measured forces and deformations to the evaluation. My next experiment would hold out real interaction trajectories, compare generated responses against those observations, and check whether the repaired assets improve the policy's target task. That would connect the paper's plausibility gains to the physical errors that matter in deployment.

</div>

<div id="diaggen-zh" data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言按钮进行 **English / 中文** 切换。

## 核心概括

生成的 USB hub 外观可能很逼真，线缆却像外壳的刚性延伸一样运动。**DiagGen** 把这样的资产放进物理仿真器，用受控交互观察它的反应，再把证据送回负责生成问题部分的阶段。系统从单张图片构建几何和材料配置，通过**生成—仿真—诊断—修正**循环改进资产。

这里最有价值的是修复决策：线缆过硬，可能需要重新赋予材料参数，也可能需要修改部件掩码或网格。DiagGen 把这些原因对应到明确的处理阶段。论文在 40 个物体上运行系统，其中 14 个进入修复；静态配置评分有所提高，动态交互比较则是修复版 9 胜、原版 4 胜、1 平。它提供了一种调试生成资产的方法，结果也说明每次修复之后仍需要交互复测。

## 论文与来源

**DiagGen: Agentic Generation of Deformable Assets with Sim-based Diagnostics for Robotic Simulation**，作者为 **Guanxiong Chen、Yiduo Qu、Qianjun Xia、Pengyu Jing、Yixian Cheng、Bole Ma、Pengzhi Yang、Bingyang Zhou、Ziming Li、Shashwat Suri、Gongbo Sun、Chao Liu、Peter Yichen Chen、Ziqiu Zeng 和 Fan Shi**。前三位作者为同等技术贡献，单位包括 UBC、剑桥大学、NUS、FAU 和威斯康星大学麦迪逊分校。

本文依据 2026 年 9 月 19 日提交的八页预印本 [arXiv:2609.23103v1](https://arxiv.org/abs/2609.23103v1)。原始图表和视频见 [论文 PDF](https://arxiv.org/pdf/2609.23103v1) 与 [项目主页](https://diaggen.github.io/)。该版本未注明会议录用信息。下文实验结果均由论文作者报告，方法解读与后续评估建议是我的阅读判断。

## 1. 部件边界决定物理属性能赋给谁

USB hub 的案例解释了为什么物理修复需要回到感知阶段。初始资产的分割不佳，线缆没有成为独立的可变形部件，后续处理便给整个物体赋予同一种材料。抓住外壳向上提起时，线缆仍保留过硬的弯曲形状。修复分割后，外壳与线缆可以采用不同材料行为：线缆保持连接，在重力下弯曲，末端接头自然下垂，见论文 IV-C 节和图 5。

生成流程围绕这种依赖关系组织。图像清理先得到参考图和强调静止形状、材料线索的描述；SAM3 生成部件掩码，OmniPart 根据掩码与描述重建分部件网格。材料推断为各部件指定机械属性，网格处理确定真实尺度，再把部件连接成可被 Genesis 加载的整体网格。候选资产经过仿真诊断后，才进入最终导出。

论文用体积网格与 Genesis 的线弹性材料模型，表示同时包含柔软区域和相对刚性区域的物体。材料配置包括杨氏模量 $E$、泊松比 $\nu$、密度 $\rho$、摩擦以及填充模式等表示选择。连接关系同样重要：直接四面体化的 OmniPart 玩具模型缺少部件间的弹性连接，在提起时分散；DiagGen 整体化处理后的网格，在相同动作下保持为一个物体。

我认为这是整套流程最有说服力的动机。可用的可变形资产要求语义部件、几何、尺度、连接关系与材料响应相互一致，任何一层的错误，都可能在仿真中表现为材料异常。

## 2. 诊断智能体先决定要验证什么物理行为

智能体读取带索引的部件、几何摘要和材料配置，提出最多 **4 个语义锚点**。每个锚点标出一个行为信息较丰富的区域，例如把手、边缘、翻片或柔软主体，并说明要检验的物理假设。抓取框指定接触区域，预览渲染则让智能体在执行前修正目标与运动方向。

每个通过预览的锚点都从静止状态开始一个新的仿真回合。末端执行器接近物体，抓住指定区域，施加设定的位移，再释放并等待物体稳定。不同版本采用相同的测试协议，具体锚点、位移、持续时间和观察时刻则依物体而定。如果证据还不充分，智能体可以暂停、查看状态并追加探测。

观察信息包括俯视与斜视角的同步 RGB 三联图、可见区域与部件对应关系的叠加图、几何和动作元数据、步骤摘要以及运行日志。受力时的形变和释放后的恢复提供不同证据；元数据帮助区分材料错误、抓取位置错误、尺度不对、几何缺失，以及仿真器初始化失败。

诊断智能体输出观察、推测原因和建议修复路径，由编排智能体结合完整修订历史决定接受、修复或终止。这是一套在推理时运行的模型与工具协作流程，论文的核心机制不依赖新训练的端到端资产生成器或可微重建目标。

## 3. 修复从责任阶段开始，重跑所有后续阶段

论文 III-C 节定义了三条修复路径。若问题出在诊断回合本身，例如抓取目标放错，系统会在诊断内部调整。

| 修复阶段 | 触发修复的证据 | 重建前保留的产物 |
|---|---|---|
| 分割 | 功能不同的区域被合并，或连续区域被拆碎 | 清理后的参考图 |
| 材料推断 | 几何连贯，但物理表示或机械响应不合理 | 参考图、掩码与 OmniPart 网格 |
| 网格处理 | 尺度、拓扑或离散化问题妨碍有效接触与形变 | 更早的产物，包括表示与材料配置 |

选定的阶段及其全部下游阶段会重新执行，形成完整候选资产。产物带有版本记录，可以追溯每次修订使用了哪些图像、掩码、几何、材料和诊断证据。最终导出的资产包还包含清单、材料配置与诊断记录。

表 II 给出了反馈如何改变生成决策的实例。一个果汁盒在初始化时就被 Genesis 拒绝，因为局部自间隙小于指定的壳厚阈值。材料阶段降低各部件的壳厚，并把统一的 3.0 GPa 刚度改为主体、顶部、接缝和翻片分别使用 0.8、0.7、0.6、0.3 GPa。重建后的资产可以初始化并完成探测。这些是解决所报告故障的生成配置，论文没有将其验证为照片中纸盒的实测材料属性。

医疗包暴露了另一类问题。剩余袋体在交互中看起来稳定，但提手、背带和五金件没有进入仿真物体。网格处理提高缺失部件的网格保真度，在包含 13,318 个四面体的连通网格中恢复了全部 5 个部件标签。只检查剩余几何是否运动稳定，就会漏掉这个问题。

## 4. 静态一致性与动态合理性衡量不同的东西

**部件—材料配置一致性（PMSC）** 判断资产的静态配置是否符合原图和常见材料先验。两位独立的 VLM 评估者分别查看匿名候选，看不到修订状态、诊断历史、配对版本或彼此的判断。一位给出整体分数 $H\in\{1,2,3,4,5\}$；另一位判断是否存在影响整体表示或配置的重大问题，存在时 $F=1$，否则 $F=0$。论文式（1）为：

$$
S=\max\left(1,\;H-F-\mathbf{1}[T>40{,}000]\right),
$$

其中 $T$ 是四面体数量。40,000 是启发式计算预算阈值，超过便扣一分。因此，PMSC 将语义和材料一致性判断与网格成本惩罚合并在一起；它不衡量相对于真实物体的力或形变误差。实验中的这项评分，是将该规则回溯应用到已有的独立评审记录上得到的。

**配对资产交互合理性（PAIP）** 比较原版和修复版的动态行为。在查看修复版本前，评估先从原版诊断证据中固定一个探测动作，包括目标部件、锚点和动作。两个版本使用相同仿真器、控制器和相机设置，各自在自己的部件上定位该目标。两位 VLM 评委分别查看 A 对 B 与 B 对 A，共产生四次判断，再合并为修复版胜、原版胜或平局。交换展示顺序用于减轻位置偏差。

修复实验使用 GPT-5.6 Luna 的 Max reasoning 配置完成生成和诊断，PAIP 使用 GPT-5.6 Terra 的 Max reasoning 配置评判。更换模型变体和隐藏修订信息可以减轻部分评估偏差，但这些判断仍依赖视觉合理性与模型先验，缺少经过标定的真实物理参照。

## 5. 实验支持到什么程度

固定评估集合包含来自手机图片和既有工作的 **40 个物体**。为控制实验成本，每次运行**最多修复一轮**。前后配对比较针对其中被选中修复的 14 个资产。

| 评估 | 范围 | 作者报告的结果 |
|---|---|---|
| 注入故障诊断 | 3 个选定物体，每个注入 1 个已知故障 | 3 例均正确识别问题与修复阶段 |
| 修复前后 PMSC | 14 个修复资产，五分制 | 均值 2.14 → 3.43；10 升、4 平、0 降 |
| 无修复 PMSC | 26 个首轮即被接受的资产 | 均值 3.12 |
| 修复前后 PAIP | 同一组 14 个修复资产 | 修复版 9 胜、原版 4 胜、1 平 |

注入故障分别对应三条修复路径：把卷发棒软电源线的刚度改成接近刚性棒体；让按摩器分割遗漏大部分金属弹簧；把厨房夹的真实尺度从 0.28 m 改成 2.8 m。GPT-5.5 在 high reasoning 配置下完成诊断，事先不知道注入的问题及其责任阶段。这三次成功提供了修复路由的定性证据，测试集规模很小，而且每例都刻意隔离了单一故障。

动态结果与静态提升同样值得关注。修复后的马桶吸橡胶杯相对于手柄产生了更合理的形变，但原版释放后恢复得更干净。原版毛绒猫更容易选中衣物区域，用更小的力就能产生类似响应。运动手表也是原版的表扣与固定环响应更清楚，修复后的目标几乎不动。静态配置得分提高，仍可能伴随某个交互动作下的退步。

机器人案例使用 Genesis 的隐式 FEM 求解器与 SAP 接触处理，由智能体反复提出夹爪位姿和开口、运行仿真并修订轨迹，展示了带钥匙环的玩具、厨房夹与饼干，以及 USB hub 的操作。场景重建案例还把 DiagGen 资产通过 Genesis 接入 Agentic Real2Sim。这些演示支持资产的仿真可用性和定性行为表现；对策略学习与真实机器人操作成功率的定量影响，论文留作后续工作。

## 6. 我会复用什么，下一步测什么

我会在资产生成系统中复用**针对性的交互测试、明确的修复阶段和带版本的中间产物**。它们能让一次失败的仿真对应到具体处理动作，也便于检查修复引入的退步。面向某个下游任务时，我会保留该任务的关键探测动作，要求修复后的资产重新通过测试，再进入训练集。

最难的问题仍是归因。错误分割和错误材料可能产生相似症状，这是作者明确承认的局限。三个隔离故障案例，尚不足以证明多个阶段同时出错时也能可靠诊断。单轮修复预算也没有充分检验长修订循环的行为，大规模并行生成还未经过评估。

如果目标是为仿真提供多样、行为合理的物体，这套流程值得尝试。如果目标是准确复现某个具体实物，我会加入实测力与形变作为评估参照。下一步实验应留出真实交互轨迹，对比生成资产与实物的响应，再检查修复资产是否改善策略的目标任务表现，从而把合理性评分的提升对应到部署时真正关心的物理误差。

</div>
