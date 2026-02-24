---
title: "[Paper Notes] A Review of Learning-Based Dynamics Models for Robotic Manipulation (Science Robotics 2025)"
date: 2026-02-24
permalink: /posts/2026/02/learning-based-dynamics-models-review/
tags:
  - Robotics
  - Manipulation
  - Dynamics Models
  - World Models
  - Model-Based Control
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

This Science Robotics review is a strong, robotics-centered survey of **learning-based dynamics models for manipulation**, with one especially useful organizing idea:

- the design space is largely shaped by the **state representation**

The paper builds a clear taxonomy from less-structured to more-structured representations:

- pixels
- latent states
- 3D particles
- keypoints
- object-centric states

and analyzes trade-offs across:

- perception difficulty
- inductive bias / sample efficiency
- generalization
- interpretability
- control-time computational cost

If you work on world models / model-based control for manipulation, this review is worth reading because it connects **representation choice -> dynamics architecture -> control method -> task suitability** in a very practical way.

## Paper Info

- **Title**: A review of learning-based dynamics models for robotic manipulation
- **Authors**: Bo Ai, Stephen Tian, Haochen Shi, Yixuan Wang, Tobias Pfaff, Cheston Tan, Henrik I. Christensen, Hao Su, Jiajun Wu, Yunzhu Li
- **Venue**: *Science Robotics* (Review article)
- **Publication date**: **2025-09-17**
- **DOI**: `10.1126/scirobotics.adt1497`

## 1. Why This Review Matters

There are many papers on world models, learned simulators, and model-based control, but they often focus on a single object type, a single sensing setup, or one task family. This review is valuable because it asks a broader robotics question:

How should we design learned dynamics models for manipulation when the environment is partially observable, contact-rich, and task-dependent?

The answer the paper emphasizes is not "use architecture X." Instead, the authors argue that a major design choice is the **state representation** used by the perception+dynamics+control stack. That framing is practical and reusable.

## 2. Core Framework: Perception, Dynamics, Control

The paper formalizes manipulation under a POMDP and decomposes learned dynamics pipelines into three modules:

- **Perception module** `g`: estimate a task-relevant state `s_t` from observations (and possibly action/history)
- **Dynamics module** `\hat{T}`: predict state transitions `s_t -> s_{t+1}` given action `a_t`
- **Control module** `\pi`: planning or policy learning using the learned dynamics model

This decomposition is simple but important. In practice, many failures come from the interaction between these modules, especially when a representation is good for one stage (e.g., efficient dynamics learning) but hard for another (e.g., robust state estimation).

## 3. Main Taxonomy: State Representations (The Most Useful Part)

The review organizes methods by state representation and repeatedly highlights a central trade-off:

- **more structure** usually improves inductive bias and sample efficiency
- but often makes perception/state estimation harder

### 3.1 Pixel representations (2D pixel space)

Pixel-based models treat dynamics learning as action-conditioned video prediction.

Strengths:

- minimal explicit state-estimation pipeline
- broad applicability to many modalities (RGB, depth, tactile images, density fields)
- can leverage large-scale video modeling advances (transformers, diffusion)

Weaknesses:

- high-dimensional prediction space -> data hungry
- can hallucinate under partial observability
- expensive for high-frequency control
- standard video metrics often do not align with control quality

My takeaway: pixel models are attractive for generality, but control reliability remains difficult unless you add stronger priors or huge data.

### 3.2 Latent representations

Latent-state models compress observations into a lower-dimensional `z_t`, then predict dynamics in latent space.

The review nicely separates:

- reconstruction-based representation learning
- reconstruction-free objectives (e.g., inverse dynamics, contrastive, reward-predictive)

and discusses probabilistic vs deterministic latent dynamics (e.g., RSSMs vs MLP/CNN predictors).

Strengths:

- efficient control-time inference
- good sample efficiency when latent structure is well chosen
- widely used in real-world model-based RL / manipulation

Weaknesses:

- latent quality depends heavily on training objective
- task-specific objectives may hurt transfer
- generalization across object counts / scene configurations is still limited

### 3.3 3D particle representations

Particle representations explicitly encode geometry and local interactions, making them especially strong for deformable / nonrigid manipulation.

Common modeling choices:

- GNN-based particle interaction models (e.g., DPI-Net / GNS-style families)
- convolutional particle interaction architectures (e.g., SPNets-style)

Strengths:

- strong physical inductive bias
- sample efficiency
- good fit for deformable objects, granular materials, fluids
- natural integration with multimodal sensing (vision + touch)

Weaknesses:

- state estimation from observations is hard (occlusion, tracking, correspondences)
- scalability/cost issues for dense graphs

This is a recurring theme in the review: particle models can be excellent dynamics models, but perception can become the bottleneck.

### 3.4 Keypoint representations

Keypoints are sparse, task-relevant points (2D/3D) with implicit or explicit semantics.

The review covers:

- supervised keypoint learning
- unsupervised keypoint discovery
- zero-shot keypoint detection using vision foundation models (CLIP/DINO-style features, etc.)

Strengths:

- compact and efficient
- often good for control and real-time planning
- can generalize across object instances when keypoints capture consistent task structure

Weaknesses:

- sensitive to occlusion and temporal consistency errors
- keypoint extraction quality is critical

### 3.5 Object-centric representations

Object-centric models represent scenes as discrete interacting entities and explicitly model relations.

Strengths:

- good for multi-object reasoning and compositional generalization
- natural fit for graph-based relational dynamics
- high-level abstraction often matches rearrangement/manipulation tasks

Weaknesses:

- difficult perception problem (instance segmentation, inverse rendering, object proposals)
- less suitable for highly deformable/continuous materials

## 4. Representation Choice Is Really a Control Design Choice

One of the best messages in the paper is that representation choice is not just a perception or modeling preference. It directly affects control:

- planning stability
- computational cost
- whether gradients are useful
- how badly model errors are exploited during optimization

The review discusses two main control paradigms:

- **motion planning** (path planning + trajectory optimization; e.g., random search, CEM, MPPI, gradient-based optimization)
- **policy learning** (including model-based RL and goal-conditioned policy training from learned rollouts)

The practical insight is that different representations pair naturally with different control styles. For example:

- compact latents/keypoints can support fast iterative control
- particle models can offer better physical fidelity for deformables but may be heavier
- object-centric models can help planning in multi-object tasks

## 5. Representative Tasks Covered

The review summarizes how learned dynamics models are used across several task families:

- **object repositioning**
- **deformable object manipulation** (rope, cloth, dough, soft objects)
- **multi-object manipulation** (packing, insertion, rearrangement)
- **tool-use manipulation**

This section is useful because it maps task types to representation choices instead of treating "world model for robotics" as one homogeneous problem.

## 6. Future Directions (Well-Framed and Worth Reading)

The future-directions section is one of the strongest parts of the review. It is concrete and not just generic "scale more data."

Some key directions the authors emphasize:

- better handling of **partial observability** and robust state estimation
- richer **multimodal perception** (vision + touch + audio, etc.)
- more **robust dynamics models** under long-horizon planning and model exploitation
- **foundation dynamics models** (and the data bottleneck for action-labeled interaction data)
- using **foundation-model priors** for physical parameter estimation
- importing new scene representations from graphics (e.g., NeRF/3DGS-inspired directions)
- **large-scale scene representations** beyond tabletop settings
- **hierarchical dynamics modeling and planning**
- planning under imperfect models with stronger robustness / guarantees

I especially like the emphasis on hierarchical abstraction. It matches the review’s core thesis: one representation level is unlikely to be optimal for every decision scale.

## 7. Strengths of the Review

- Clear robotics-centric framing (not just ML taxonomy)
- Useful representation-first organization
- Connects perception, dynamics learning, and control in one pipeline
- Discusses practical task fit and deployment constraints
- Balanced treatment of both structured and unstructured representations
- Strong future-directions section with concrete open problems

## 8. Limitations / What This Review Is (and Is Not)

The authors explicitly scope out:

- analytical (non-learned) dynamics models as the main focus
- differentiable-but-not-learned models
- hybrid approaches beyond selected examples
- learned dynamics work without demonstrated robotic manipulation applications

That scope makes the review focused and useful, but readers looking for a unified comparison with broader world-model literature (e.g., general RL world models, video world models without robotics deployment) will still need complementary reading.

## 9. My Takeaways

- The most important design choice is often **state representation**, not just network architecture.
- In robotics, stronger inductive bias often shifts difficulty from dynamics learning to **perception/state estimation**.
- "Model quality" should be evaluated in the context of the **control algorithm** that uses it.
- A universal manipulation dynamics model likely requires **multi-level representations** and hierarchical planning.

If I were designing a new manipulation system, I would use this review as a checklist:

1. What representation matches the task physics?
2. Can I estimate that state robustly from my sensors?
3. What control method can exploit this model without overfitting to model errors?
4. What level of abstraction is actually needed for the decision horizon?

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过网站顶部语言切换按钮在 **English / 中文** 间切换。

## TL;DR

这篇 *Science Robotics* 的综述非常值得读，尤其是它给出了一个对机器人操控很实用的组织视角：

- 学习式动力学模型（learning-based dynamics models）的设计空间，很大程度上由 **状态表示（state representation）** 决定

论文把常见方法按表示方式分成一条从“弱结构”到“强结构”的谱系：

- 像素（pixels）
- 潜变量（latent）
- 3D 粒子（particles）
- 关键点（keypoints）
- 物体中心（object-centric）

并系统讨论它们在以下维度上的权衡：

- 感知/状态估计难度
- 归纳偏置与样本效率
- 泛化能力
- 可解释性
- 控制时的计算开销

如果你做的是机器人操控里的 world model / model-based control，这篇综述最大的价值在于它把 **表示选择 -> 动力学模型结构 -> 控制方法 -> 任务适配性** 串成了一条清晰的工程逻辑链。

## 论文信息

- **标题**: A review of learning-based dynamics models for robotic manipulation
- **作者**: Bo Ai, Stephen Tian, Haochen Shi, Yixuan Wang, Tobias Pfaff, Cheston Tan, Henrik I. Christensen, Hao Su, Jiajun Wu, Yunzhu Li
- **期刊**: *Science Robotics*（综述）
- **发表日期**: **2025-09-17**
- **DOI**: `10.1126/scirobotics.adt1497`

## 1. 为什么这篇综述重要

关于 world model、learned simulator、model-based control 的论文很多，但很多工作只覆盖某一类物体、某一类传感器设置，或单一任务类型。这篇综述的价值在于它提出了一个更“机器人系统”视角的问题：

在部分可观测、强接触、任务依赖很强的操控场景中，应该如何设计学习式动力学模型？

这篇文章给出的核心答案并不是“用某个最强网络结构”，而是强调：一个关键设计决策是整个感知-动力学-控制链条使用的 **状态表示**。这个视角非常实用，也很容易迁移到新任务上。

## 2. 核心框架：感知、动力学、控制

论文在 POMDP 框架下，把学习式动力学操控系统拆成三个模块：

- **感知模块** `g`：从观测（以及可能的历史/动作）估计任务相关状态 `s_t`
- **动力学模块** `\hat{T}`：给定动作 `a_t` 预测 `s_t -> s_{t+1}`
- **控制模块** `\pi`：利用 learned dynamics 做规划或策略学习

这个分解看起来简单，但非常关键。真实系统里很多失败其实都来自这三个模块之间的不匹配。例如某种表示也许非常适合做动力学学习，但在实际传感器下很难稳定估计状态。

## 3. 主线分类：状态表示（这篇综述最有价值的部分）

文章按状态表示组织方法，并反复强调一个核心权衡：

- **结构越强**，通常归纳偏置越强、样本效率越高
- 但往往 **感知/状态估计更难**

### 3.1 像素表示（2D pixel space）

像素方法本质上把动力学学习写成带动作条件的视频预测。

优点：

- 不需要复杂的显式状态估计管线
- 可以自然处理多种模态（RGB、深度、触觉图像、密度场等）
- 能直接受益于视频模型（Transformer、Diffusion）进展

缺点：

- 预测空间高维，数据需求大
- 部分可观测时容易出现 hallucination
- 高频控制下计算代价高
- 常见视频指标和控制效果不一定一致

我的理解是：像素表示泛化潜力大，但如果没有足够强的先验/数据，控制可靠性仍然是难点。

### 3.2 潜变量表示（latent）

潜变量方法先把观测压缩到低维 `z_t`，再在 latent 空间做动力学预测。

综述里一个很好的点是把表示学习目标分成：

- 基于重建（reconstruction-based）
- 非重建式（如 inverse dynamics、contrastive、reward-predictive）

并讨论了 probabilistic vs deterministic latent dynamics（例如 RSSM vs MLP/CNN）。

优点：

- 控制时推理高效
- 如果 latent 结构设计合理，样本效率不错
- 在真实机器人 model-based RL / manipulation 中应用广泛

缺点：

- latent 表示质量高度依赖训练目标
- 任务特化目标可能牺牲迁移性
- 跨物体数量/场景结构泛化仍有限

### 3.3 3D 粒子表示（particles）

粒子表示显式编码几何结构和局部相互作用，尤其适合可变形体/非刚体操控。

常见动力学建模方式：

- 基于 GNN 的粒子交互模型（DPI-Net / GNS 一类）
- 基于卷积的粒子交互结构（如 SPNets 风格）

优点：

- 物理归纳偏置强
- 样本效率高
- 很适合可变形体、颗粒材料、流体
- 容易融合多模态感知（视觉 + 触觉）

缺点：

- 从观测估计粒子状态很难（遮挡、跟踪、对应关系）
- 稠密图情况下计算/扩展性可能成为瓶颈

这篇综述反复强调的一点是：粒子模型常常不是“动力学学不好”，而是“感知端成了瓶颈”。

### 3.4 关键点表示（keypoints）

关键点表示使用稀疏、任务相关的点（2D/3D），可以带显式或隐式语义。

综述覆盖了：

- 有监督关键点学习
- 无监督关键点发现
- 使用视觉基础模型的零样本关键点检测（CLIP/DINO 等特征）

优点：

- 状态紧凑，控制效率高
- 常常适合实时规划/反馈控制
- 若关键点定义稳定，跨实例泛化潜力较好

缺点：

- 对遮挡、时序一致性很敏感
- 关键点提取质量直接决定上限

### 3.5 物体中心表示（object-centric）

物体中心表示把场景看作离散对象及其相互作用，并显式建模关系结构。

优点：

- 适合多物体交互与组合泛化（compositional generalization）
- 天然适配图结构关系建模
- 高层抽象与很多整理/堆叠/重排任务匹配

缺点：

- 感知难度高（实例分割、逆渲染、object proposal）
- 不适合高度连续/强变形材料

## 4. 表示选择本质上也是控制设计选择

这篇综述最值得记住的一点是：状态表示选择不只是“感知偏好”或“模型偏好”，它会直接影响控制行为：

- 规划稳定性
- 计算开销
- 梯度是否可用、是否有意义
- 控制优化会不会过度利用模型误差（model exploitation）

论文讨论了两类主要控制范式：

- **运动规划**（路径规划 + 轨迹优化；如 random search、CEM、MPPI、梯度法）
- **策略学习**（包括基于 learned rollouts 的 model-based RL / goal-conditioned policy）

实践上的关键洞见是：不同表示常常天然适配不同控制方式。例如：

- 紧凑 latent / keypoint 更适合快速迭代控制
- 粒子模型在可变形体上物理保真度更强，但代价可能更高
- object-centric 模型在多物体任务中更利于规划

## 5. 代表性任务覆盖（很实用）

综述总结了 learned dynamics 在多个典型任务族中的应用：

- **物体重定位（object repositioning）**
- **可变形物体操控**（绳、布、面团、软物体）
- **多物体操控**（packing / insertion / rearrangement）
- **工具使用（tool use）**

这一部分的价值在于它不是把“robotics world model”当成一个统一问题，而是明确指出不同任务类型更适合哪些表示与控制组合。

## 6. 未来方向（写得很好，且不空泛）

我觉得这篇综述的 future directions 部分写得很强，不是泛泛地说“做大模型/加数据”，而是给出了很多结构化问题。

作者重点强调的方向包括：

- 更好处理 **部分可观测** 与鲁棒状态估计
- 更强的 **多模态感知融合**（视觉、触觉、音频等）
- 面向长时域规划与模型利用问题的 **鲁棒动力学模型**
- **foundation dynamics models**（以及动作标注交互数据稀缺问题）
- 用 **基础模型先验** 帮助估计物理参数
- 引入图形学中的新表示（如 NeRF / 3DGS 方向）
- 超越桌面场景的 **大尺度场景表示**
- **分层动力学建模与分层规划**
- 在模型不完美前提下进行更稳健规划与性能保证

其中我最认同的是“分层抽象”的强调。这其实和全文主线高度一致：不太可能存在一个表示层级在所有决策尺度上都最优。

## 7. 这篇综述的优点

- 机器人系统视角很强（不只是 ML 方法罗列）
- 用“状态表示”组织全篇，结构非常清晰
- 把感知、动力学学习、控制三者真正串起来了
- 讨论了任务适配性和部署约束，而不仅是 benchmark 指标
- 对结构化表示与非结构化表示都比较平衡
- future directions 具体、可执行

## 8. 这篇综述的边界（它是什么 / 不是什么）

作者明确限定了范围，主要聚焦在：

- 学习式动力学模型 + 机器人操控应用

因此它不会系统覆盖：

- 非学习的解析动力学模型
- “可微但不学习”的动力学模型
- 更广义 world model 文献（尤其是没有真实操控应用的工作）

这个取舍让文章更聚焦也更实用；但如果你想做更广泛的 world model 对比（例如通用 RL world model、纯视频 world model），仍然需要配合其他综述或论文一起看。

## 9. 我的几点总结

- 对操控系统来说，最关键的设计选择之一往往是 **状态表示**，而不只是网络结构。
- 在机器人里，更强的归纳偏置常常会把难题从动力学学习转移到 **感知/状态估计**。
- “模型好不好”必须结合 **下游控制算法** 来评价，不能只看预测误差。
- 一个真正通用的操控动力学系统，很可能需要 **多层级表示 + 分层规划**。

如果我要设计一个新的操控系统，这篇综述可以直接当 checklist：

1. 任务的物理属性更适合哪种表示？
2. 我的传感器能否稳定估计这种状态？
3. 我的控制方法会不会过度利用模型误差？
4. 当前决策时域到底需要多高/多低的抽象层级？

</div>
