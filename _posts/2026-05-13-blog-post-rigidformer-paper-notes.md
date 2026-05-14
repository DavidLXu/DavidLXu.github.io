---
title: "[Paper Notes] RigidFormer: Learning Rigid Dynamics using Transformers"
date: 2026-05-13
permalink: /posts/2026/05/rigidformer-paper-notes/
tags:
  - World Models
  - Robotics
  - Rigid Dynamics
  - Point Clouds
  - Transformers
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**RigidFormer** is a mesh-free learned simulator for multi-object rigid-body dynamics. It takes two recent object-level point-cloud states, a temporal step size, and optional control signals, then predicts the next point-cloud state. Instead of updating every point independently, it compresses each object into an object token, lets object tokens interact through a Transformer, advances a small set of anchors per object, and then recovers a rigid transform with differentiable Kabsch alignment.

The paper is strong as a **simulator-style world model**. It improves the efficiency and scalability of rigid contact rollout by moving from vertex-level interaction to object-level and anchor-level interaction. The key move is not only "use a Transformer"; it is the choice to respect the low-dimensional structure of rigid motion while still reading contact-relevant local geometry from point clouds.

The most useful critical lens here is to separate "world model" into two concepts:

```text
Action-Conditioned World Model:
world state + action/control -> future world state

World-Action Model:
world observation/change + goal -> action-relevant belief, affordance, risk, or action
```

RigidFormer mostly belongs to the first category. It asks: **if the physical scene continues under this dynamics/control condition, what will the future object state be?** But a policy may not need a full future reconstruction. For action, the important question is often: **what changed, what matters, and how should I react?**

## Paper Info

- **Title**: RigidFormer: Learning Rigid Dynamics using Transformers
- **Authors**: Zhiyang Dou, Minghao Guo, Haixu Wu, Doug Roble, Tuur Stuyck, Wojciech Matusik
- **Affiliations**: MIT and Meta
- **arXiv**: [2605.09196](https://arxiv.org/abs/2605.09196)
- **Project page**: [people.csail.mit.edu/frankzydou/projects/RigidFormer](https://people.csail.mit.edu/frankzydou/projects/RigidFormer/index.html)
- **Code**: [Frank-ZY-Dou/Dynamics-Modeling](https://github.com/Frank-ZY-Dou/Dynamics-Modeling/tree/main/RigidFormer), with the current README noting that code release is coming soon.

## The Problem

Rigid-body dynamics matters for robotics, graphics, and embodied AI because manipulation and interaction are full of contact: blocks collide, objects slide, stacks fall, and articulated parts push against each other. Classical physics engines can simulate this well when we have clean meshes, calibrated material parameters, and carefully tuned contact models. In real perception pipelines, those assumptions are often weak. We may have point clouds, incomplete geometry, noisy segmentation, and approximate material parameters.

Prior learned simulators often rely on mesh connectivity or vertex-level message passing. That creates two bottlenecks:

- Point clouds do not naturally come with triangle connectivity.
- Vertex-level interaction becomes expensive as point resolution and object count grow.

RigidFormer's answer is to treat rigid bodies as coherent objects. A rigid body may have many observed points, but its motion is low-dimensional. So the model should reason over object-level state and only use local point features where contact geometry matters.

## Inputs and Outputs

The core dynamics model is:

\\[
x_{t+1} = f_\theta(x_{t-1}, x_t, \Delta t)
\\]

Each scene has \\(M\\) rigid objects. Object \\(i\\) is represented by a point set:

\\[
x_t^{(i)} \in \mathbb{R}^{N_v^{(i)} \times d}
\\]

For each point, the paper builds a 12-dimensional feature vector from:

- nearest-neighbor displacement to another object or the ground,
- per-step position increment \\(x_t - x_{t-1}\\), used as a discrete velocity proxy,
- offset from a reference shape/frame,
- physical parameters \\([m, \mu, \epsilon]\\): mass, friction, and restitution.

The model also receives the integration step size \\(\Delta t\\). In the articulated-body extension, it can additionally receive high-level control commands such as target speed, target movement direction, and target facing direction.

The output is the next state of every object as full-resolution point positions:

```text
input:  object point clouds at t-1 and t, physics/contact features, step size, optional controls
output: object point clouds at t+1
```

Internally, the output path is more structured than direct point regression:

```text
points -> object tokens -> object interaction Transformer
       -> anchor queries -> anchor accelerations
       -> Verlet integration -> candidate anchor positions
       -> Kabsch rigid alignment -> rigid transform
       -> all object points at t+1
```

This is important. The model predicts enough motion to determine a rigid transform, then applies that transform to all points. The final object cannot arbitrarily deform because the projection enforces rigid-body structure.

## Method

### 1. Object-Level Interaction

RigidFormer first uses a PointNet-style encoder to compress each object's point cloud into one object token. These object tokens, plus 16 learned register tokens, enter a Transformer decoder. Because there is no sequence-index positional embedding over objects, the object interaction stage is designed to be permutation-equivariant: reordering objects should reorder the outputs, not change the physics.

The Transformer is conditioned on the temporal step size through FiLM. The conditioning code uses \\((s, s^2)\\), mirroring the first-order and second-order terms that appear in motion integration. This lets a single model operate at different effective time resolutions.

### 2. Anchor-Based State Advance

Instead of predicting every point's next position, RigidFormer chooses a small number of FPS anchors per object, with \\(N_a = 4\\) as the default. Each anchor attends to object tokens and receives local point features through **Anchor-Vertex Pooling**. This pooling aggregates nearby vertex features with a learnable distance kernel, giving anchors contact-local context without dense vertex-level attention.

The network predicts per-anchor acceleration. Candidate anchor positions are advanced with Verlet integration:

\\[
\hat{q}_{t+1}^{(i,k)} =
a_t^{(i,k)} \Delta t^2 + 2q_t^{(i,k)} - q_{t-1}^{(i,k)}
\\]

The paper then aligns reference anchors to predicted anchors using Kabsch alignment and applies the resulting \\(SE(3)\\) transform to the full object point set.

### 3. Anchor-Based RoPE

The paper introduces **Anchor-based Rotary Positional Embedding** to inject 3D geometry into attention. The idea is to encode object geometry through sparse anchor positions rather than through a single centroid or all vertices. Mean-pooling anchor rotary descriptors makes the embedding invariant to anchor reindexing while still carrying shape extent and world-frame position information.

This is a small but meaningful design decision: a rigid object's geometry matters for contact, but anchor identity should not become an arbitrary index dependency.

## Results

On MOVi-A, MOVi-B, and MOVi-Sphere, RigidFormer matches or outperforms strong learned simulator baselines while using point inputs rather than mesh connectivity. The most relevant comparison is with HopNet, a strong prior rigid-dynamics baseline. On MOVi-B at 100 frames, the paper reports an improvement from **0.176 m / 17.91 deg** to **0.161 m / 15.33 deg** under the matched step-size-1 setting.

The step-size experiments are especially interesting. Larger step sizes reduce long-horizon autoregressive error because the model makes fewer rollout calls over the same physical horizon. On MOVi-B at 100 frames, the reported errors are:

| Step size | Position RMSE | Orientation RMSE |
|---:|---:|---:|
| 1 | 0.161 m | 15.33 deg |
| 5 | 0.136 m | 13.55 deg |
| 10 | 0.115 m | 10.85 deg |

This is not just a numerical trick. It says the learned simulator can expose sparse long-horizon futures cheaply, which is useful for planning when the planner does not need every high-frequency contact frame.

The runtime comparison is also central to the paper's claim:

| Method | ms/step | FPS |
|---|---:|---:|
| HopNet | 4228.7 | 0.2 |
| FIGNet | 336.0 | 3.0 |
| RigidFormer | 41.9 | 23.9 |

The paper also shows scalability on WreckingBall scenes with up to 217 objects and a preliminary extension to command-conditioned articulated bodies, where body parts are treated as interacting object-level components.

## What I Like

The paper has a clean structural bias. Rigid objects should move rigidly; object interactions should be object-level; local contact still needs local geometry. RigidFormer maps those intuitions into architecture:

- object tokens for global interaction,
- anchors for low-dimensional state advance,
- local anchor-vertex pooling for contact cues,
- rigid projection for stability,
- step-size conditioning for controllable rollout.

This makes the model feel less like a generic Transformer pasted onto physics and more like a learned simulator with the right pressure points exposed.

I also like the way it treats point clouds. The model does not require meshes for the dynamics interface, but it also does not pretend geometry can be collapsed to a centroid. The anchor representation is a compromise between dense geometry and low-dimensional physical state.

## A Critical Reading: Simulator World Model vs Policy World Model

RigidFormer is valuable, and it is a good paper to read through this conceptual boundary. It is a **simulator world model**, or more specifically an **action/control-conditioned world model**:

\\[
P(\text{world}_{future} \mid \text{world}_{now}, \text{action/control})
\\]

Its job is to predict future object states. That is useful for physics rollout, data generation, model-predictive control, trajectory optimization, and counterfactual planning.

But a policy-facing world model may want something different:

\\[
P(\text{action or action-relevant latent} \mid \text{world}_{now}, \text{goal}, \text{change})
\\]

Call this a **World-Action Model**. It does not need to reconstruct every future point coordinate. It needs to decide what the current world means for action. The policy may care about:

- whether an object blocks the goal,
- whether it is graspable,
- whether it is sliding or falling,
- whether contact is about to matter,
- whether uncertainty is high enough to slow down,
- whether the scene deserves more prediction compute.

This is closer to how human perception often feels. We usually do not run a full internal physics renderer for every object point. We notice the relevant change, allocate attention, and react. If a cup starts slipping, the useful internal state is not a dense future point cloud. It is something like: "slipping, reachable, act now."

So the question is not whether RigidFormer conflicts with world models. It does not. The question is: **which world model is being built?**

```text
Simulator world model:
state_t, action_t -> state_t+1

Policy world model:
observation_t, goal_t, change_t -> action-relevant belief/action
```

RigidFormer is excellent evidence for the first direction. It does not directly solve the second. For embodied policy learning, the second may be the more central abstraction.

## Why This Distinction Matters

If the goal is simulation, dense state prediction is sensible. We want rollout fidelity, physically plausible contact, and stable long-horizon trajectories. RigidFormer's point-cloud output is a feature, not a burden.

If the goal is policy, dense prediction can become an expensive intermediate. The policy may not need to know every point's future coordinate. It may only need a compressed, task-conditioned representation of interaction:

```text
object location
motion trend
contact affordance
risk
goal relevance
uncertainty
compute budget
```

This suggests a possible research direction: use RigidFormer-like object/anchor structure, but train it not only to predict future geometry. Train it to produce policy-useful state abstractions:

- affordance fields over objects and anchors,
- event predictions such as collision, slip, fall, or blockage,
- adaptive rollout depth,
- uncertainty-aware "think more here" signals,
- action-conditioned summaries rather than full state reconstructions.

In this view, RigidFormer could become a component inside a larger embodied system:

```text
perception -> object point clouds -> RigidFormer-style physical latent
          -> world-action module -> action / planner / compute allocation
```

The simulator module answers "what would happen?" The policy module answers "what should I do with what is happening?"

## Limitations

The paper is clear about several limitations:

- It assumes object labels that tell the model which points belong to which object.
- Partial point-cloud results are promising, but severe occlusion and real sensor noise remain difficult.
- Contact is learned from data rather than solved by an analytic complementarity/contact solver.
- The main setting is rigid objects; articulated bodies are treated as collections of object-level parts.
- Mixed rigid-deformable scenes and adaptive time stepping are left for future work.

From the policy-world-model perspective, I would add one more limitation: the output is still simulator-oriented. It is not wrong, but it is not the same as action understanding. A future embodied model may need to decide when full simulation is worth the cost and when a reactive abstraction is enough.

## Takeaways

RigidFormer is a strong learned-simulation paper because it makes rigid dynamics cheaper and more stable from mesh-free point inputs. The architecture is well matched to the physical structure of the problem: objects interact, anchors move, rigidity is projected, and local geometry enters where contact needs it.

The broader lesson is conceptual. "World model" should not be a single overloaded phrase. Some world models predict the world forward; others translate the world into action. RigidFormer is a good example of the former. For policy learning, the next question is how to build the latter without losing the physical structure that makes RigidFormer effective.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇文章支持通过顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**RigidFormer** 是一个面向多物体刚体动力学的 mesh-free learned simulator。它输入最近两帧按物体分组的点云状态、时间步长，以及可选控制信号，然后预测下一帧物体点云状态。它不是直接逐点预测，而是先把每个物体压成 object token，用 Transformer 建模物体间交互，再用每个物体少量 anchors 推进状态，最后通过 differentiable Kabsch alignment 恢复刚体变换。

这篇论文作为 **simulator 风格的 world model** 是很强的。它通过从 vertex-level interaction 转到 object-level / anchor-level interaction，提高了刚体接触 rollout 的效率和可扩展性。关键不是简单地“用了 Transformer”，而是它尊重了刚体运动的低维结构，同时又能从点云中读到接触相关的局部几何。

读这篇论文时，最有用的批判视角是把 “world model” 拆成两个概念。

```text
Action-Conditioned World Model:
world state + action/control -> future world state

World-Action Model:
world observation/change + goal -> action-relevant belief, affordance, risk, or action
```

RigidFormer 主要属于第一类。它问的是：**如果这个物理场景在当前动力学/控制条件下继续演化，未来物体状态会是什么？** 但一个 policy 不一定需要完整重建未来世界。对行动来说，更重要的问题往往是：**世界发生了什么变化，哪些变化重要，我应该怎么反应？**

## 论文信息

- **标题**：RigidFormer: Learning Rigid Dynamics using Transformers
- **作者**：Zhiyang Dou, Minghao Guo, Haixu Wu, Doug Roble, Tuur Stuyck, Wojciech Matusik
- **机构**：MIT and Meta
- **arXiv**：[2605.09196](https://arxiv.org/abs/2605.09196)
- **项目页**：[people.csail.mit.edu/frankzydou/projects/RigidFormer](https://people.csail.mit.edu/frankzydou/projects/RigidFormer/index.html)
- **代码**：[Frank-ZY-Dou/Dynamics-Modeling](https://github.com/Frank-ZY-Dou/Dynamics-Modeling/tree/main/RigidFormer)，目前 README 写的是 code release is coming soon。

## 它解决什么问题

刚体动力学在机器人、图形学和 embodied AI 里都很重要，因为真实交互里到处是 contact：物体碰撞、滑动、堆叠、掉落、关节部件互相推动。传统物理引擎在 mesh 干净、物理参数准确、contact model 调得好的情况下可以做得很好。但在真实感知系统里，这些前提经常不成立。我们拿到的可能是点云、不完整几何、噪声分割和粗略的物理参数。

很多已有 learned simulator 依赖 mesh connectivity 或 vertex-level message passing。这带来两个瓶颈：

- 点云天然没有三角网格连接关系。
- 点或顶点级交互随着点数和物体数增加会很贵。

RigidFormer 的回答是：把刚体当成 coherent object。一个刚体可以有很多观测点，但它的运动本质是低维的。所以模型应该主要在 object-level 做交互，只在 contact 需要的地方读取局部点云几何。

## 输入和输出

核心动力学模型是：

\\[
x_{t+1} = f_\theta(x_{t-1}, x_t, \Delta t)
\\]

每个场景有 \\(M\\) 个刚体。第 \\(i\\) 个物体表示为一个点集：

\\[
x_t^{(i)} \in \mathbb{R}^{N_v^{(i)} \times d}
\\]

对每个点，论文构造了一个 12 维特征，包括：

- 该点到其他物体或地面的最近邻位移；
- \\(x_t - x_{t-1}\\)，作为离散速度近似；
- 相对 reference shape/frame 的偏移；
- 物理参数 \\([m, \mu, \epsilon]\\)：质量、摩擦系数、恢复系数。

模型还输入积分步长 \\(\Delta t\\)。在 articulated body 扩展里，它还可以输入高层控制命令，例如目标速度、目标运动方向、目标朝向。

输出是每个物体下一帧的全分辨率点云位置：

```text
输入：t-1 和 t 时刻的物体点云、物理/接触特征、时间步长、可选控制
输出：t+1 时刻的物体点云
```

但内部不是简单地直接预测所有点：

```text
points -> object tokens -> object interaction Transformer
       -> anchor queries -> anchor accelerations
       -> Verlet integration -> candidate anchor positions
       -> Kabsch rigid alignment -> rigid transform
       -> all object points at t+1
```

这点很重要。模型先预测足够决定刚体变换的 anchor 运动，再把这个变换作用到物体所有点上。最终物体不能随意形变，因为 rigid projection 强制保留了刚体结构。

## 方法

### 1. Object-Level Interaction

RigidFormer 先用类似 PointNet 的 encoder，把每个物体的点云压缩成一个 object token。这些 object tokens 加上 16 个 learned register tokens 进入 Transformer decoder。因为物体之间没有使用 sequence-index positional embedding，所以 object interaction 阶段被设计成 permutation-equivariant：改变物体输入顺序，只应该改变输出顺序，不应该改变物理结果。

Transformer 通过 FiLM 接收时间步长条件。条件码使用 \\((s, s^2)\\)，对应运动积分里的一阶和二阶时间项。这使得同一个模型可以在不同有效时间分辨率下运行。

### 2. Anchor-Based State Advance

RigidFormer 不直接预测每个点的下一步位置，而是给每个物体选少量 FPS anchors，默认 \\(N_a = 4\\)。每个 anchor attend 到 object tokens，并通过 **Anchor-Vertex Pooling** 获得局部点云特征。这个 pooling 用可学习的距离核聚合 anchor 附近的 vertex features，让 anchor 能看到 contact-local context，同时避免 dense vertex-level attention。

网络预测每个 anchor 的加速度。候选 anchor 位置通过 Verlet integration 推进：

\\[
\hat{q}_{t+1}^{(i,k)} =
a_t^{(i,k)} \Delta t^2 + 2q_t^{(i,k)} - q_{t-1}^{(i,k)}
\\]

然后论文用 Kabsch alignment 把 reference anchors 对齐到预测 anchors，得到 \\(SE(3)\\) 刚体变换，再把这个变换应用到完整物体点云上。

### 3. Anchor-Based RoPE

论文提出了 **Anchor-based Rotary Positional Embedding**，用来把 3D 几何注入 attention。它不是只用一个 centroid，也不是把所有 vertices 都塞进位置编码，而是用稀疏 anchor positions 表示物体的几何范围。通过 mean-pooling anchor rotary descriptors，它对 anchor 重排序保持不变，同时仍然携带 shape extent 和 world-frame position 信息。

这是一个小但关键的设计：刚体几何对 contact 很重要，但 anchor 的任意编号不应该变成模型依赖的虚假信息。

## 实验结果

在 MOVi-A、MOVi-B 和 MOVi-Sphere 上，RigidFormer 在只使用 point inputs、没有 mesh connectivity 的情况下，匹配或超过了强 learned simulator baselines。最相关的对比是 HopNet。论文报告在 MOVi-B 100 frames、matched step-size-1 设置下，HopNet 是 **0.176 m / 17.91 deg**，RigidFormer 是 **0.161 m / 15.33 deg**。

step-size 实验很有意思。更大的 step size 会减少同一物理时间范围内的 autoregressive 调用次数，因此减小 long-horizon error。在 MOVi-B 100 frames 上，论文报告：

| Step size | Position RMSE | Orientation RMSE |
|---:|---:|---:|
| 1 | 0.161 m | 15.33 deg |
| 5 | 0.136 m | 13.55 deg |
| 10 | 0.115 m | 10.85 deg |

这不只是一个数值技巧。它说明 learned simulator 可以更便宜地给出稀疏的 long-horizon futures。对 planning 来说，如果 planner 不需要每个高频 contact frame，这种能力很有用。

runtime 对比也是论文主张的核心：

| Method | ms/step | FPS |
|---|---:|---:|
| HopNet | 4228.7 | 0.2 |
| FIGNet | 336.0 | 3.0 |
| RigidFormer | 41.9 | 23.9 |

论文还展示了 WreckingBall 场景里最多 217 个物体的可扩展性，以及 command-conditioned articulated bodies 的初步扩展：把身体部件当作互相作用的 object-level components。

## 我觉得好的地方

这篇论文的 structural bias 很清楚。刚体应该刚性运动；物体交互应该主要发生在 object-level；局部 contact 又确实需要局部几何。RigidFormer 把这些直觉落实成了架构：

- object tokens 负责全局物体交互；
- anchors 负责低维状态推进；
- local anchor-vertex pooling 负责 contact cues；
- rigid projection 负责稳定性；
- step-size conditioning 负责可控 rollout。

所以它不像是把 Transformer 生硬贴在 physics 上，而是一个把物理结构关键部位暴露出来的 learned simulator。

我也喜欢它处理点云的方式。它不要求 dynamics interface 必须有 mesh，但也不假装几何可以压成一个 centroid。anchor representation 是 dense geometry 和 low-dimensional physical state 之间的一个折中。

## 批判式阅读：Simulator World Model vs Policy World Model

RigidFormer 有价值，而且很适合放进这个概念边界里来读。它是一个 **simulator world model**，或者更具体地说，是一个 **action/control-conditioned world model**：

\\[
P(\text{world}_{future} \mid \text{world}_{now}, \text{action/control})
\\]

它的任务是预测未来物体状态。这对物理 rollout、数据生成、model-predictive control、trajectory optimization 和 counterfactual planning 都有用。

但面向 policy 的 world model 可能想要另一种东西：

\\[
P(\text{action or action-relevant latent} \mid \text{world}_{now}, \text{goal}, \text{change})
\\]

我们可以把它叫作 **World-Action Model**。它不一定需要重建未来每个点的坐标。它需要判断当前世界对行动意味着什么。policy 可能更关心：

- 物体是否挡住目标；
- 是否可以抓取；
- 是否正在滑落或掉落；
- contact 是否即将变得重要；
- 不确定性是否高到需要减速；
- 这个场景是否值得投入更多预测算力。

这更接近人类感知的体验。我们通常不会对每个物体点运行完整的内部物理渲染器。我们注意到相关变化，分配注意力，然后反应。如果一个杯子开始滑落，有用的内部状态不是未来每个点的 dense coordinates，而更像是：“正在滑，够得着，现在该动。”

所以问题不是 RigidFormer 是否和 world model 冲突。它不冲突。真正的问题是：**我们到底在构建哪一种 world model？**

```text
Simulator world model:
state_t, action_t -> state_t+1

Policy world model:
observation_t, goal_t, change_t -> action-relevant belief/action
```

RigidFormer 是第一条路线的很好证据。它没有直接解决第二条路线。对 embodied policy learning 来说，第二种抽象可能更核心。

## 为什么这个区分重要

如果目标是 simulation，dense state prediction 是合理的。我们需要 rollout fidelity、物理上可信的 contact、稳定的 long-horizon trajectories。RigidFormer 的 point-cloud output 在这里是优点，不是负担。

如果目标是 policy，dense prediction 可能会变成昂贵的中间过程。policy 不一定需要知道每个点的未来坐标。它可能只需要一个 task-conditioned interaction representation：

```text
object location
motion trend
contact affordance
risk
goal relevance
uncertainty
compute budget
```

这提示了一个可能的研究方向：保留 RigidFormer 这种 object/anchor 结构，但不只训练它预测未来几何。也可以训练它产生 policy-useful state abstractions：

- objects 和 anchors 上的 affordance fields；
- collision、slip、fall、blockage 等事件预测；
- adaptive rollout depth；
- uncertainty-aware 的 “这里需要多想一下” 信号；
- action-conditioned summaries，而不是完整 state reconstruction。

在这个视角里，RigidFormer 可以成为更大 embodied system 里的一个组件：

```text
perception -> object point clouds -> RigidFormer-style physical latent
          -> world-action module -> action / planner / compute allocation
```

simulator module 回答 “what would happen?”；policy module 回答 “what should I do with what is happening?”

## 局限

论文自己也很明确地列出了若干局限：

- 它假设已经有 object labels，知道哪些点属于哪个物体；
- partial point-cloud 的结果不错，但严重遮挡和真实传感器噪声仍然困难；
- contact 是从数据里学出来的，而不是通过解析的 complementarity/contact solver 求解；
- 主要设置仍然是刚体，articulated bodies 被当成 object-level parts 的集合；
- mixed rigid-deformable scenes 和 adaptive time stepping 留给未来工作。

从 policy world model 的角度，我会再加一点：它的输出仍然是 simulator-oriented。这不是错，但它不是 action understanding。未来 embodied model 可能需要判断什么时候 full simulation 值得花算力，什么时候 reactive abstraction 已经足够。

## Takeaways

RigidFormer 是一篇很强的 learned-simulation 论文，因为它让 mesh-free point inputs 上的刚体动力学预测更快、更稳定、更可扩展。它的架构和问题的物理结构匹配得很好：物体交互、anchors 推进、刚体投影、局部 contact geometry，各自有位置。

更大的启发是概念上的。我们不应该把 “world model” 当成一个单一的大桶。有些 world model 是把世界往前预测；另一些 world model 是把世界翻译成行动。RigidFormer 是前者的好例子。对 policy learning 来说，下一步问题是：如何构建后者，同时不丢掉 RigidFormer 这种物理结构带来的有效归纳偏置。

</div>
