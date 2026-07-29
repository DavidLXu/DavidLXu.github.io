---
title: "[Paper Notes] Data Pyramid for Embodied Manipulation"
date: 2026-07-29
permalink: /posts/2026/07/data-pyramid-embodied-manipulation-paper-notes/
tags:
  - Embodied AI
  - Robot Learning
  - Robotics Data
  - Vision-Language-Action
  - World Models
---

<div data-lang="en" markdown="1">

**Data Pyramid for Embodied Manipulation** gives the fragmented embodied-data landscape a useful coordinate system. It organizes five sources—**real-robot, UMI-style, egocentric/exocentric, simulation, and general multimodal data**—along a central tension: data becomes easier to scale as it moves toward the base, while direct alignment with robot execution generally becomes stronger toward the apex.

My main takeaway is that the pyramid should guide **data composition**, not rank datasets with a single score. Each layer supplies a different missing capability. General data provides semantics and reasoning; human video provides interaction structure; simulation provides controllable action-consequence pairs; UMI preserves portable end-effector supervision; real-robot trajectories ground the final policy in hardware, sensing, and contact. The unresolved research problem is how much of each source to use, at which training stage, and under which action representation.

## Paper Info

The paper is **“Data Pyramid for Embodied Manipulation”** by **Yifan Ye, Yankai Fu, Yaoxu Lv, Bohan Hou, Jun Cen, Lingdong Kong, Duo Zheng, Tianxing Chen, Jiaming Liu, Ziang Cao, Yunfan Lou, Wei Chow, Xian Sun, Yingshuo Wang, Kuangzhi Ge, Xiaowei Chi, Xidong Zhang, Zhibo Pang, Yiwu Zhong, Sirui Han, Zhihe Lu, Weihao Yuan, Qifeng Chen, Michael Yu Wang, Yao Mu, Ziwei Liu, Jianfei Yang, Ping Luo, and Shanghang Zhang**. The authors span PKU, NTU, HKUST, NUS, CUHK, HKU, Duke, UC Berkeley, GBU, NJU, and SJTU. These notes refer to **arXiv:2607.24744v1**, submitted on **July 27, 2026**.

- [Paper](https://arxiv.org/abs/2607.24744)
- [PDF](https://arxiv.org/pdf/2607.24744)
- [Project page](https://jasper-aaa.github.io/embodied-data-pyramid/)
- [Dataset and resource repository](https://github.com/worldbench/awesome-embodied-data-pyramid)

This is a **data-centric survey and taxonomy**. Its scope is the framework connecting data collection, representation, model family, and research capability; it introduces no new policy architecture or benchmark result.

## The Two Axes and Four Supporting Dimensions

The pyramid is organized primarily by two axes:

| Dimension | Question |
|---|---|
| **Scalability** | How efficiently can the source expand under hardware, labor, reset, safety, and marginal-generation costs? |
| **Robot alignment** | How directly do its observations, representations, and supervision support learning and execution on a physical robot? |

These axes usually pull in opposite directions. A real-robot trajectory contains executable commands and authentic consequences, while every additional hour consumes hardware and operating effort. Web video can grow by orders of magnitude with weak direct supervision for control.

The paper adds four dimensions because scale and alignment alone cannot describe data utility:

- **Quality:** validity, synchronization, informativeness, consistency, and task relevance;
- **Diversity:** coverage across tasks, scenes, objects, viewpoints, embodiments, sensors, behaviors, and outcomes;
- **Reusability:** transfer across robots, tasks, environments, sensing systems, and model families;
- **Physical fidelity:** contact, friction, compliance, latency, sensor noise, actuation, and object dynamics.

A large dataset can still have narrow state-action coverage. A physically authentic human video can still lack robot-compatible actions. A simulator can offer exact contact labels while approximating the contact physics that produced them. The six dimensions expose these distinctions.

## The Five-Layer Data Pyramid

| Layer, apex to base | Supervision retained | Main advantage | Main bottleneck |
|---|---|---|---|
| **Real-robot data** | observations, robot states, actions, outcomes | direct executability and authentic hardware interaction | cost, resets, safety, platform dependence |
| **UMI-style data** | wrist-view observations, relative end-effector trajectories, gripper state; sometimes force or touch | portable in-the-wild collection with explicit action structure | tracking, calibration, retargeting, missing robot dynamics |
| **Egocentric / exocentric data** | human activity, hand-object interaction, task progression; optional pose, gaze, force, EMG, or touch | real-world diversity and natural high-DoF behavior | partial observability and human–robot embodiment gap |
| **Simulation data** | executable actions, privileged states, contacts, rewards, success signals | parallel, controllable, low-marginal-cost generation | asset coverage and observation/dynamics sim-to-real gaps |
| **General data** | image, video, language, spatial, 3D, planning, and reasoning supervision | web-scale semantic and cognitive coverage | weak action, contact, and consequence grounding |

The ordering summarizes the overall trade-off across all six dimensions. Individual properties can depart from that order. Simulation, for example, is highly robot-aligned at the action-interface level and less physically faithful than unstructured human video.

## 1. Real-Robot Data: The Physical Anchor

Real-robot data records the closed loop that matters at deployment:

\[
(\text{observation},\ \text{robot state},\ \text{action},\ \text{physical outcome}).
\]

It naturally includes sensor noise, controller latency, kinematic limits, actuator response, contact, and hardware failures. The actions are executable on the platform that generated them. These properties make real-robot data the strongest source for final policy grounding and recovery behavior.

Scale has grown from narrow grasping collections to multi-task and multi-embodiment corpora. The survey cites **MT-Opt** at roughly 800K episodes across 12 tasks, **RT-1** at 130K trajectories, **RoboMIND** at 107K, **AgiBot World Beta** at one million trajectories and nearly 3,000 hours, **RoboMIND 2.0** at more than 310K trajectories across 739 tasks, and **Open X-Embodiment** at more than two million aggregated trajectories.

Raw trajectory count is an incomplete measure. Variation in initial states, paths, contact sequences, speed, task stage, scene layout, sensor suite, and embodiment often matters more than repeated demonstrations of one behavior. The paper therefore argues for wider in-the-wild coverage and for preserving policy rollouts, human interventions, failures, and recoveries.

## 2. UMI-Style Data: Action Structure Without a Robot in the Loop

UMI-style systems use a portable handheld gripper or wearable interface equipped with cameras, pose tracking, and gripper sensing. The operator directly performs tasks in ordinary environments while the device records observation and action-like signals. Recent variants add bimanual capture, dexterous hands, 3D sensing, force, and touch.

The key representation is a **future end-effector trajectory relative to the current end-effector pose**. Relative 6-DoF motion plus a gripper command avoids dependence on a global tracking frame and gives different robots a reusable task-space target. Deployment composes this motion with the robot's current pose, then uses inverse kinematics, motion planning, or a Cartesian controller to produce joint commands.

This separation is valuable:

1. collection remains robot-free and portable;
2. the demonstration retains more control structure than ordinary human video;
3. embodiment-specific execution is deferred to retargeting and low-level control.

The gap remains substantial for dexterous hands. Wrist motion alone cannot encode finger morphology, contact geometry, compliance, or force. **DexUMI**, for example, constrains human motion with a wearable exoskeleton and visually replaces the human hand with the target robot hand. Even then, visual plausibility and dynamic feasibility are different tests.

## 3. Egocentric and Exocentric Data: Human Interaction Priors

Human video occupies the middle of the pyramid. It preserves real objects, real physics, dexterous hand use, tool-use strategies, and long-horizon activity structure at much greater breadth than robot collection.

First-person capture is especially relevant to manipulation, but it brings hand-object occlusion, camera motion, blur, and limited field of view. Synchronized exocentric cameras improve reconstruction and body context while increasing setup, calibration, synchronization, and storage costs. Wearable sensing can add depth, gaze, IMU, EMG, force, or tactile pressure. Post-processing can recover hand pose, object pose, trajectories, action segments, task labels, and contact events.

Robot-oriented use requires another transformation:

\[
\text{human observation}
\rightarrow
\text{hand/object reconstruction}
\rightarrow
\text{shared or retargeted representation}
\rightarrow
\text{robot-compatible action}.
\]

The paper's most useful framing for dexterity is to treat human video as **structured interaction supervision**. It reliably contributes task intent, object affordances, grasp choices, contact order, tool-use strategy, and task decomposition. Robot data must still ground those priors in a particular hand's joints, forces, friction, sensing, and actuator limits.

## 4. Simulation Data: Scalable Robot-Oriented Experience

Simulation provides the strongest combination of scalability and explicit robot supervision. It can generate actions, object states, segmentation, contacts, physical parameters, rewards, failures, and success labels in parallel without hardware wear or safety risk. It is useful for policy pretraining, controlled evaluation, curriculum generation, and rare-state coverage.

The central limitation has two parts:

- **Observation mismatch:** textures, illumination, material appearance, depth noise, calibration, occlusion, tactile response, and force signals differ from reality.
- **Interaction mismatch:** morphology, coordinate frames, control frequency, latency, compliance, backlash, friction, deformation, torque limits, and multi-body contact remain imperfect.

Scale also does not guarantee behavioral diversity. A generator constrained by a small skill library can produce many trajectories whose key action states remain concentrated in one narrow region.

World models extend simulation from manually constructed physics environments to learned predictive environments. They can support policy optimization, checkpoint evaluation, or synthetic data generation. Their failure mode is different: a generated rollout may look coherent while containing ambiguous actions or physically invalid consequences. Filtering, uncertainty estimation, and calibration against physics or real interaction are therefore essential.

## 5. General Data: The Cognitive Base

General image, video, language, spatial, 3D, planning, and reasoning data gives embodied models capabilities that robot trajectories rarely cover at sufficient scale:

| Data form | Capability contributed |
|---|---|
| image–text and VQA | semantics, object properties, language grounding, commonsense |
| segmentation and localization | spatial reference and interaction-region grounding |
| 3D data | geometry, pose, depth, and spatial structure |
| video | motion, object-state changes, temporal order, and procedural memory |
| planning and task decomposition | goals, subgoals, step order, and long-horizon reasoning |
| physical and causal QA | plausibility, consequence, and failure reasoning |
| grasp resources | contact and grasp priors that still require a robot-specific generator |

This layer offers enormous diversity and reuse across embodiments. It does not record proprioception, actuator dynamics, contact forces, or executed robot actions. Automatically generated captions, plans, and reasoning traces also introduce hallucinated or physically inconsistent supervision. General data is best understood as a cognitive prior that higher layers ground in interaction.

## Data Recipes Are Becoming Broader—and Remain Unsolved

The survey identifies three trends.

First, model families are adding more pyramid layers. The **π** series moves from real-robot data in π0, to real-robot plus general data in π0.5, then adds egocentric data in π0.7. **LingbotVA** uses real-robot, UMI, and simulation data; **LingbotVA 2.0** reports all five layers.

Second, the reported scale is rising rapidly. **Qwen-RobotManip** describes an approximately 38,100-hour multi-source corpus, including about 11.4K hours of open robot data and 24,808 hours of robot-compatible trajectories synthesized from 1,933 hours of egocentric video. **Xiaomi-Robotics-1** reports more than 100,000 hours of UMI pretraining data followed by roughly 10,000 hours of cross-embodiment post-training.

Third, egocentric data is becoming a major pretraining substrate. Some models mix it with robot and general data, while EgoVLA, Being-H0, H-RDT, VITRA, UniDex, HumanScale, and related systems place human interaction at the center of pretraining.

These reports do not establish a universal recipe. Hours from raw video, reconstructed trajectories, UMI recordings, simulation, and robot execution are not directly comparable. Model architecture, filtering, prompts, action representation, and training stage all confound attribution. Strong robot-only models also remain competitive.

## Action Representation Is Part of the Data Recipe

Mixing datasets requires more than putting them into the same file format. The paper separates **structural alignment** from **geometric alignment**.

### Structural alignment across embodiments

| Strategy | Mechanism | Trade-off |
|---|---|---|
| **Embodiment-specific projection** | each robot keeps its native action space and uses a dedicated adapter or head | preserves native control; sharing happens inside the backbone |
| **Fixed-dimensional padding** | all actions use one vector length; inactive dimensions are zeroed and masked | simple batching; aligned shapes do not guarantee aligned meanings |
| **Semantic action slots** | fixed vector blocks have consistent physical meanings across robots | stronger semantic alignment; requires a carefully designed canonical schema |

The survey highlights Qwen-RobotManip's 80-dimensional canonical representation: two 29-dimensional arm blocks plus 22 reserved dimensions, with arm joints, end-effector pose, gripper, and dexterous-hand fields assigned explicit slots.

### Geometric alignment

End-effector actions may be expressed in:

- a **robot/world frame**, which interfaces naturally with controllers but inherits mounting and workspace conventions;
- a **camera frame**, which can align visually similar motions across robots;
- a **wrist frame**, which separates local hand articulation from global arm motion.

Every dataset should record frame origin and axes, handedness, tool-center point, absolute versus delta mode, rotation parameterization, units, calibration, and controller mode. Shared storage without shared geometric semantics can create contradictory supervision.

## Three Model Families Consume the Pyramid Differently

| Model family | Primary target | Role of action-free data | Role of action-labeled data |
|---|---|---|---|
| **Embodied brain / VLM** | perception, grounding, reasoning, memory, planning | semantics, spatial-temporal understanding, physical priors | affordances, waypoints, task boundaries, next-action and planning supervision |
| **VLA** | executable action generation | latent actions, motion fields, visual goals, plans, affordances | direct policy learning through discrete tokens, diffusion, or flow matching |
| **World Action Model** | world evolution and action consequence | broad temporal and physical priors | action-conditioned dynamics, policy evaluation, control, and synthetic rollouts |

For VLAs, discrete action tokens reuse language-model machinery, while continuous diffusion or flow-matching heads better preserve high-frequency and high-dimensional control. Action-free video can provide latent motion tokens, point trajectories, object motion fields, and intermediate plans; robot demonstrations or an action decoder still connect those proxies to execution.

WAMs commonly use a two-stage recipe: large-scale action-free pretraining learns generic dynamics, then action-conditioned post-training grounds the model in interaction. Continuous-action systems use diffusion or flow matching; autoregressive systems can discretize observations and actions into joint token sequences.

## Six Open Problems

### 1. Large-scale tactile data

Vision gives indirect evidence of slip, force, deformation, friction, and grasp stability. Tactile data remains sensor-specific, inconsistent in format, narrow in task coverage, and rarely synchronized with long-horizon trajectories. A standard contact layer is still missing from most embodied datasets.

### 2. Failure and recovery data

Success-only demonstrations leave policies poorly prepared for their own deployment distribution. Useful failure records need temporal and causal structure: pre-failure context, onset, category, cause, state change, corrective action, and recovery outcome. Failed trajectories can also contain reusable successful segments.

### 3. Scalable collection across pyramid layers

Wearable systems need lighter, wireless, modular, and less intrusive hardware, along with automatic calibration, on-device hand-object reconstruction, and standardized metadata. Collection should target uncertain, rare, and underrepresented states instead of only increasing raw volume.

### 4. Cross-embodiment state-action alignment

Cartesian end-effector poses still conflict when datasets use different base, camera, wrist, or world frames. Coordinate conventions, controller semantics, and calibration must become first-class metadata.

### 5. Egocentric priors for dexterous hands

Human and robot hands differ in topology, DoF, geometry, compliance, sensing, friction, and force limits. Human data is most dependable for interaction structure; morphology-conditioned policies, contact-centric representations, uncertainty-aware retargeting, and robot grounding must convert that structure into feasible execution.

### 6. Principled data recipes

The field lacks compute-matched ablations that isolate individual sources and categories. Future studies should compare fixed mixtures, curricula, and adaptive sampling under controlled architecture, representation, and compute budgets.

## Critical Reading

The paper's strongest contribution is conceptual compression. It turns a long list of datasets into a decision framework and then connects that framework to model capability. The six-dimensional view prevents “more data” from becoming a content-free strategy.

Three caveats matter:

1. **The pyramid is a taxonomy whose ordering has not been fitted as an empirical law.** It is a category-level synthesis; individual datasets can violate the expected trade-offs.
2. **Scale numbers are heterogeneous.** Trajectories, hours, clips, frames, QA pairs, and synthetic episodes measure different quantities and vary widely in information density.
3. **Data-mixture claims remain correlational.** Modern systems change architecture, action representation, curation, compute, and data at the same time. The marginal value of each pyramid layer is rarely isolated.

The most productive way to use the framework is to ask which capability and failure mode a source covers:

\[
\text{semantics}
\rightarrow
\text{interaction prior}
\rightarrow
\text{controllable experience}
\rightarrow
\text{portable action structure}
\rightarrow
\text{hardware grounding}.
\]

This sequence is a practical design heuristic. The training order can vary with the target capability and available supervision.

## Takeaways

For building a manipulation foundation model, a reasonable interpretation of the pyramid is:

- use **general data** to establish perception, language, spatial reasoning, and task structure;
- use **egocentric/exocentric data** to learn human interaction priors and long-horizon behavior;
- use **simulation** to scale explicit action-consequence supervision and rare-state coverage;
- use **UMI-style data** to collect portable real-world demonstrations with end-effector structure;
- use **real-robot data** to calibrate the final action representation, contact dynamics, failures, and recovery.

The next leap will depend on the interfaces between layers: shared geometry, action semantics, calibrated uncertainty, touch, failure structure, and controlled mixture studies. The data pyramid is valuable because it makes those interfaces visible.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**Data Pyramid for Embodied Manipulation** 为碎片化的具身数据生态提供了一套很实用的坐标系。论文把数据划分为五层：**真实机器人数据、UMI-style 数据、第一/第三视角人类数据、仿真数据和通用多模态数据**。核心张力是：越靠近金字塔底部，数据通常越容易扩展；越靠近顶端，数据通常与真实机器人执行对齐得越直接。

我的主要结论是，这座金字塔应该用于指导**数据组合**，不适合被理解成单一分数下的数据排名。每一层补充的能力不同：通用数据提供语义和推理，人类视频提供交互结构，仿真提供可控的动作—后果数据，UMI 保留可移植的末端执行器监督，真实机器人轨迹负责把最终策略落到硬件、传感与接触上。真正尚未解决的问题是：每一类数据应该使用多少、放在哪个训练阶段、配合什么动作表示。

## 论文信息

论文 **“Data Pyramid for Embodied Manipulation”** 的作者是 **Yifan Ye、Yankai Fu、Yaoxu Lv、Bohan Hou、Jun Cen、Lingdong Kong、Duo Zheng、Tianxing Chen、Jiaming Liu、Ziang Cao、Yunfan Lou、Wei Chow、Xian Sun、Yingshuo Wang、Kuangzhi Ge、Xiaowei Chi、Xidong Zhang、Zhibo Pang、Yiwu Zhong、Sirui Han、Zhihe Lu、Weihao Yuan、Qifeng Chen、Michael Yu Wang、Yao Mu、Ziwei Liu、Jianfei Yang、Ping Luo 和 Shanghang Zhang**。作者来自 PKU、NTU、HKUST、NUS、CUHK、HKU、Duke、UC Berkeley、GBU、NJU 和 SJTU。本文依据 **arXiv:2607.24744v1**，提交日期为 **2026 年 7 月 27 日**。

- [论文](https://arxiv.org/abs/2607.24744)
- [PDF](https://arxiv.org/pdf/2607.24744)
- [项目主页](https://jasper-aaa.github.io/embodied-data-pyramid/)
- [数据集与资源仓库](https://github.com/worldbench/awesome-embodied-data-pyramid)

这是一篇**以数据为中心的综述与分类框架**，没有提出新的 policy architecture 或 benchmark 成绩。它的贡献是把数据采集、表示、模型类型和能力需求放进同一个分析框架。

## 两条主轴与四个辅助维度

金字塔首先由两条主轴组织：

| 维度 | 核心问题 |
|---|---|
| **可扩展性（Scalability）** | 考虑硬件、人工、环境复位、安全与边际生成成本后，这类数据能否高效扩张？ |
| **机器人对齐度（Robot alignment）** | 数据的观测、表示和监督信号能多直接地支持真实机器人学习与执行？ |

两者往往存在张力。真实机器人轨迹包含可执行指令和真实物理后果，但每增加一小时都要占用硬件和操作资源。网络视频可以扩大几个数量级，却很少直接给出机器人控制监督。

论文进一步加入四个维度，因为规模和对齐度不足以描述数据价值：

- **质量（Quality）：** 有效性、同步精度、信息量、一致性与任务相关性；
- **多样性（Diversity）：** 任务、场景、物体、视角、机器人形态、传感器、行为与结果的覆盖；
- **可复用性（Reusability）：** 跨机器人、任务、环境、传感系统和模型族的迁移能力；
- **物理保真度（Physical fidelity）：** 接触、摩擦、柔顺、时延、传感噪声、执行器响应和物体动力学。

大数据集仍可能只覆盖狭窄的 state-action 分布。真实的人类视频仍可能缺少机器人兼容动作。仿真器可以给出精确接触标签，同时用近似物理生成这些标签。这六个维度把这些差异显式化。

## 五层数据金字塔

| 层级：从顶端到底部 | 保留的监督 | 主要优势 | 主要瓶颈 |
|---|---|---|---|
| **真实机器人数据** | 观测、机器人状态、动作、结果 | 动作可直接执行，硬件交互真实 | 成本、复位、安全、平台依赖 |
| **UMI-style 数据** | 腕部视角、相对末端轨迹、夹爪状态；有时包含力或触觉 | 便携式野外采集，同时保留明确动作结构 | 跟踪、标定、重定向、缺少机器人动力学 |
| **第一/第三视角数据** | 人类活动、手物交互、任务进程；可选姿态、视线、力、EMG、触觉 | 真实环境多样性与自然高自由度行为 | 部分可观测性与人机形态差异 |
| **仿真数据** | 可执行动作、特权状态、接触、奖励、成功信号 | 并行、可控、低边际成本 | 资产覆盖，以及观测/动力学 sim-to-real gap |
| **通用数据** | 图像、视频、语言、空间、3D、规划与推理监督 | 网络级语义与认知覆盖 | 动作、接触与物理后果 grounding 较弱 |

这个顺序综合了六个维度下的总体权衡，并不要求每个属性严格单调。例如，仿真在动作接口上可以高度 robot-aligned，但物理保真度可能低于无结构人类视频。

## 1. 真实机器人数据：物理锚点

真实机器人数据记录了部署时最重要的闭环：

\[
(\text{observation},\ \text{robot state},\ \text{action},\ \text{physical outcome}).
\]

它自然包含传感噪声、控制时延、运动学限制、执行器响应、接触与硬件故障。数据中的动作可以在原平台上直接执行，因此它最适合做最终 policy grounding 和 recovery behavior 学习。

规模已经从单一抓取任务扩展到多任务、多机器人形态数据集。论文列举了约 80 万 episode、覆盖 12 个任务的 **MT-Opt**，13 万轨迹的 **RT-1**，10.7 万轨迹的 **RoboMIND**，100 万轨迹、近 3,000 小时的 **AgiBot World Beta**，超过 31 万轨迹、覆盖 739 个任务的 **RoboMIND 2.0**，以及聚合超过 200 万条轨迹的 **Open X-Embodiment**。

轨迹数量不能完整表达数据价值。初始状态、运动路径、接触序列、速度、任务阶段、场景布局、传感器和 embodiment 的变化，通常比重复采集同一行为更重要。因此，论文主张扩大 in-the-wild 覆盖，并保留 policy rollout、人类干预、失败和恢复数据。

## 2. UMI-Style 数据：移出机器人采集回路，保留动作结构

UMI-style 系统使用带相机、位姿跟踪和夹爪传感的便携手持夹爪或可穿戴接口。操作者直接在普通环境中完成任务，设备同步记录观测和 action-like 信号。新系统进一步加入双手、灵巧手、3D 感知、力和触觉。

关键表示是**相对于当前末端位姿的未来末端轨迹**。相对 6-DoF 运动与夹爪命令减少了对全局跟踪坐标系的依赖，也为不同机器人提供可复用的 task-space target。部署时，系统把预测的相对轨迹与机器人当前位姿组合，再通过逆运动学、运动规划或笛卡尔控制器生成关节指令。

这种分解带来三个价值：

1. 数据采集保持 robot-free 和 portable；
2. demonstration 比普通人类视频保留更多控制结构；
3. embodiment-specific execution 延后交给 retargeting 与低层控制。

灵巧手上的差距仍然很大。只有腕部运动无法编码手指形态、接触几何、柔顺性和力。以 **DexUMI** 为例，它使用可穿戴外骨骼把人手运动限制到更接近机器人可行域的范围，并在视觉上用目标机器人手替换人手。即使完成这些处理，视觉合理性和动力学可行性仍是两个不同标准。

## 3. 第一/第三视角数据：人类交互先验

人类视频位于金字塔中层。它保留真实物体、真实物理、灵巧人手、工具使用策略和长时程活动结构，覆盖范围远大于机器人采集。

第一视角与 manipulation 的视角分布更接近，但存在手物遮挡、相机运动、模糊和视野受限。同步第三视角相机可以改善重建和全身上下文，同时增加环境搭建、标定、同步和存储成本。可穿戴传感器还能加入深度、视线、IMU、EMG、力或触觉压力。后处理可以恢复手部姿态、物体位姿、轨迹、动作片段、任务标签与接触事件。

用于机器人学习还需要一条转换链：

\[
\text{human observation}
\rightarrow
\text{hand/object reconstruction}
\rightarrow
\text{shared or retargeted representation}
\rightarrow
\text{robot-compatible action}.
\]

论文对灵巧操作最有价值的观点，是把人类视频视为**结构化交互监督**。它可以可靠提供任务意图、物体 affordance、抓取选择、接触顺序、工具使用策略和任务分解。机器人数据还要把这些先验落实到具体灵巧手的关节、力、摩擦、传感和执行器限制上。

## 4. 仿真数据：可扩展的机器人导向经验

仿真在可扩展性和显式机器人监督之间取得了很强的组合。它可以并行生成动作、物体状态、分割、接触、物理参数、奖励、失败和成功标签，不产生硬件磨损与安全风险。它适合 policy pretraining、可控评测、curriculum generation 和稀有状态覆盖。

核心限制分成两类：

- **观测差异：** 纹理、照明、材质外观、深度噪声、标定、遮挡、触觉响应和力信号与现实不同；
- **交互差异：** 机器人形态、坐标系、控制频率、时延、柔顺、回差、摩擦、形变、力矩限制和多体接触仍然存在近似。

规模也不等于行为多样性。受限于小型技能库的生成器可以产生大量轨迹，但关键动作状态仍集中在非常狭窄的区域。

World model 把仿真从人工搭建的物理环境扩展到学习得到的预测环境，可以用于 policy optimization、checkpoint evaluation 或 synthetic data generation。它的风险形态不同：生成 rollout 可能视觉连贯，却包含歧义动作或物理无效后果。因此，过滤、不确定性估计，以及与物理仿真或真实交互的校准仍然不可缺少。

## 5. 通用数据：认知底座

通用图像、视频、语言、空间、3D、规划和推理数据，为具身模型补充机器人轨迹难以大规模覆盖的能力：

| 数据形式 | 提供的能力 |
|---|---|
| 图文数据与 VQA | 语义、物体属性、语言 grounding、常识 |
| 分割与定位 | 空间指代与交互区域 grounding |
| 3D 数据 | 几何、位姿、深度与空间结构 |
| 视频 | 运动、物体状态变化、时间顺序与过程记忆 |
| 规划与任务分解 | 目标、子目标、步骤顺序与长时程推理 |
| 物理与因果问答 | 合理性、后果与失败推理 |
| 抓取资源 | 接触和抓取先验，仍需要机器人专用 grasp generator |

这一层具有极大的多样性，并能跨 embodiment 复用。它不记录本体感觉、执行器动力学、接触力或真实机器人动作。自动生成的 caption、plan 和 reasoning trace 也可能带来幻觉与物理不一致。通用数据更适合作为认知先验，再由上层数据完成 interaction grounding。

## 数据配方正在变宽，最优组合仍未解决

综述识别出三条趋势。

第一，模型开始组合更多金字塔层级。**π** 系列从 π0 的真实机器人数据，发展到 π0.5 的真实机器人加通用数据，再到 π0.7 加入第一视角数据。**LingbotVA** 使用真实机器人、UMI 和仿真数据；**LingbotVA 2.0** 报告使用了全部五层。

第二，报告的数据规模快速增长。**Qwen-RobotManip** 构建了约 38,100 小时的多源语料，其中包括约 11.4K 小时开放机器人数据，以及从 1,933 小时第一视角视频合成的 24,808 小时 robot-compatible trajectories。**Xiaomi-Robotics-1** 报告使用超过 10 万小时 UMI 轨迹进行预训练，之后再使用约 1 万小时 cross-embodiment 数据做 post-training。

第三，第一视角数据正在成为重要的预训练底座。一些模型把它与机器人数据和通用数据混合；EgoVLA、Being-H0、H-RDT、VITRA、UniDex、HumanScale 等系统则把人类交互数据放在预训练中心。

这些报告还不能推出通用配方。原始视频、重建轨迹、UMI 记录、仿真数据和机器人执行的“小时数”不可直接比较。模型结构、过滤策略、prompt、动作表示和训练阶段都会影响归因。只使用机器人数据的强模型仍有竞争力。

## 动作表示也是数据配方的一部分

混合数据集所需的工作远多于统一文件格式。论文把问题拆成**结构对齐**与**几何对齐**。

### 跨 embodiment 的结构对齐

| 策略 | 机制 | 权衡 |
|---|---|---|
| **Embodiment-specific projection** | 每个机器人保留原生动作空间，通过专用 adapter 或 head 接入共享 backbone | 保留原生控制；共享发生在模型内部 |
| **固定维度 padding** | 所有动作使用相同向量长度，无效维度置零并 mask | batching 简单；形状一致不保证物理语义一致 |
| **Semantic action slots** | 共享向量中的固定区块对应一致物理含义 | 语义对齐更强；需要精心设计 canonical schema |

论文重点介绍了 Qwen-RobotManip 的 80 维 canonical representation：两个 29 维手臂区块加 22 个保留维度，arm joints、末端位姿、夹爪和灵巧手分别占用具有明确语义的 slots。

### 几何对齐

末端动作可以表达在：

- **机器人/世界坐标系**：容易接入传统控制器，但会继承底座安装与 workspace convention；
- **相机坐标系**：有机会让视觉相似的动作在不同机器人上得到更一致的数值；
- **腕部坐标系**：把局部手指运动与全局手臂运动分离。

数据集应该明确记录坐标原点与轴、左右手系、tool-center point、绝对/增量动作、旋转参数化、单位、标定和 controller mode。只有共享存储格式、缺少共享几何语义时，联合训练仍可能收到互相冲突的监督。

## 三类模型使用金字塔的方式不同

| 模型类型 | 主要目标 | 无动作标签数据的作用 | 有动作标签数据的作用 |
|---|---|---|---|
| **Embodied brain / VLM** | 感知、grounding、推理、记忆、规划 | 语义、时空理解、物理先验 | affordance、waypoint、任务边界、next-action 和规划监督 |
| **VLA** | 生成可执行动作 | latent action、motion field、visual goal、plan、affordance | 通过离散 token、diffusion 或 flow matching 直接学习 policy |
| **World Action Model** | 世界演化与动作后果 | 广泛的时间和物理先验 | action-conditioned dynamics、policy evaluation、控制与 synthetic rollout |

对 VLA 来说，离散 action token 可以复用语言模型机制；连续 diffusion 或 flow-matching head 更适合保持高频、高维控制精度。无动作视频可以提供 latent motion token、point trajectory、object motion field 和中间 plan；机器人 demonstration 或 action decoder 负责把这些 proxy 接到可执行动作。

WAM 常见两阶段 recipe：先用大规模 action-free 数据学习通用动力学，再用 action-conditioned 数据完成 interaction grounding。连续动作系统常用 diffusion 或 flow matching；自回归系统可以把观测与动作离散成联合 token sequence。

## 六个开放问题

### 1. 大规模触觉数据

视觉只能间接反映滑移、力、形变、摩擦与抓取稳定性。触觉数据仍然依赖特定传感器，格式不一致，任务覆盖窄，也很少与长时程轨迹同步。大多数具身数据集仍缺少标准化的 contact layer。

### 2. 失败与恢复数据

只包含成功 demonstration 的数据让 policy 很难应对自身部署分布。有效的失败记录需要时间和因果结构：失败前上下文、发生时刻、类别、原因、状态变化、修正动作与恢复结果。失败轨迹中也可能包含可复用的成功片段。

### 3. 跨金字塔层级的可扩展采集

可穿戴系统需要更轻、更无线、更模块化、对操作者干扰更小，并支持自动标定、端侧手物重建与标准化 metadata。采集策略还应优先覆盖不确定、稀有和欠采样状态，提升信息覆盖率。

### 4. 跨 embodiment 的 state-action 对齐

即使都使用笛卡尔末端位姿，不同数据集采用 robot base、camera、wrist 或 world frame 时仍会产生冲突。坐标约定、controller semantics 和 calibration 应成为一等元数据。

### 5. 面向灵巧手的第一视角先验

人手和机器人手在拓扑、自由度、几何、柔顺、传感、摩擦和力限制上都有差异。人类数据最稳定的贡献是交互结构；morphology-conditioned policy、contact-centric representation、uncertainty-aware retargeting 和机器人 grounding 要负责把这种结构转成可行执行。

### 6. 有原则的数据配方

当前缺少在相同 compute 下隔离单个数据源和类别的消融实验。未来需要在控制 architecture、representation 和 compute budget 的条件下，比较 fixed mixture、curriculum 与 adaptive sampling。

## 批判性阅读

论文最强的贡献是概念压缩：它把很长的数据集列表转成决策框架，再把这个框架与模型能力连接起来。六维视角让“增加数据”变成可以分析的工程选择。

三个限制需要保持清醒：

1. **金字塔首先是一套 taxonomy，尚未被拟合或验证为经验定律。** 它表达类别层面的综合趋势，单个数据集完全可能偏离这种权衡。
2. **规模单位高度异质。** 轨迹、小时、clip、frame、QA pair 和 synthetic episode 的信息密度不同。
3. **数据混合结论大多是相关性证据。** 现代系统经常同时改变模型结构、动作表示、数据清洗、算力和数据源，很少单独测量每一层的边际价值。

使用这套框架时，更有效的问题是：某种数据补足了哪项能力、覆盖了哪类失败模式？

\[
\text{semantics}
\rightarrow
\text{interaction prior}
\rightarrow
\text{controllable experience}
\rightarrow
\text{portable action structure}
\rightarrow
\text{hardware grounding}.
\]

这个序列是一条设计 heuristic，不代表强制训练顺序。

## 总结

如果要构建 manipulation foundation model，可以把金字塔理解成下面这套分工：

- 用**通用数据**建立感知、语言、空间推理与任务结构；
- 用**第一/第三视角数据**学习人类交互先验与长时程行为；
- 用**仿真数据**扩展显式动作—后果监督与稀有状态覆盖；
- 用 **UMI-style 数据**采集带末端动作结构的可移植真实世界 demonstration；
- 用**真实机器人数据**校准最终动作表示、接触动力学、失败与恢复。

下一次跃迁很可能来自各层之间的接口：共享几何、动作语义、校准后的不确定性、触觉、失败结构，以及受控的数据混合实验。数据金字塔的价值，就在于让这些接口变得清晰可见。

</div>
