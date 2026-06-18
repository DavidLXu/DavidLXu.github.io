---
title: "[Paper Notes] ConTrack: Constrained Hand Motion Tracking with Adaptive Trade-off Control"
date: 2026-06-16
permalink: /posts/2026/06/contrack-paper-notes/
tags:
  - Dexterous Manipulation
  - Reinforcement Learning
  - Reference Tracking
  - Human Demonstrations
  - Robotics
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## Core Idea

**ConTrack** is a constrained reinforcement-learning controller for tracking dexterous hand-object demonstrations. The paper is **"ConTrack: Constrained Hand Motion Tracking with Adaptive Trade-off Control"** by **Yutong Liang, Quanquan Peng, Ri-Zhao Qiu, and Xiaolong Wang** from **UC San Diego**; the paper is available as [arXiv:2606.03177](https://arxiv.org/abs/2606.03177), with a project page at [lyt0112.com/projects/ConTrack](https://www.lyt0112.com/projects/ConTrack).

The core argument is that human-to-robot tracking should be framed as a trade-off problem, beyond pure imitation. A human hand trajectory can contain unreachable robot postures, unstable contacts, or object motions that only work for a different embodiment. ConTrack therefore separates **task** from **style**: object tracking is treated as the primary requirement, while hand motion and contact fidelity are optimized as style once the object trajectory is under control.

Each reference clip is modeled as a finite-horizon MDP. The state includes robot joints, object poses, and velocities; the reference provides retargeted robot joint targets, object pose targets, link-level contact events, and object-local contact points. The policy predicts a residual around the reference,

$$
q_t^{tar} = q_t^{ref} + a_t
$$

so the controller stays near the demonstration while retaining enough freedom to resolve physical conflicts. The reward decomposes into task tracking, style fidelity, and motion regularization:

$$
r(s_t, a_t) = r_g(s_t, a_t) + r_s(s_t, a_t) + r_p(s_t, a_t)
$$

where \(r_g\) measures object pose tracking, \(r_s\) measures hand kinematics and contact fidelity, and \(r_p\) penalizes high-frequency or unstable motion. The constrained objective is the most compact statement of the paper:

$$
\max_\pi J_s(\pi) \quad \text{s.t.} \quad J_g(\pi) \ge \alpha J_g^\star
$$

In words, ConTrack maximizes style fidelity while maintaining a target fraction of the best observed task-tracking return. The target ratio \(\alpha\) becomes the knob that defines how much object-tracking safety the policy must maintain before it spends capacity on motion style.

## Adaptive Task-Style Mixing

The main mechanism is an online controller for the task-style frontier. ConTrack uses a Lagrangian-style relaxation,

$$
\mathcal{L}(\pi, \lambda) =
J_s(\pi) -
\lambda \left(\alpha - \frac{J_g(\pi)}{J_g^\star}\right)
$$

where \(\lambda\) controls how strongly the policy should emphasize object tracking. PPO updates the policy with a mixed advantage,

$$
A_{mix} =
w_{task} A_g +
(1 - w_{task}) A_s +
A_p
$$

with:

$$
w_{task} = \sigma(\lambda)
$$

and the dual variable is updated online:

$$
\lambda \leftarrow \lambda +
\eta \left(\alpha - \frac{\hat{J}_g}{J_g^\star}\right)
$$

When normalized task return drops below \(\alpha\), \(\lambda\) rises and the policy shifts pressure toward object tracking. When task return is comfortably above the target, \(\lambda\) falls and the policy can recover more hand-pose and contact style. This is the paper's cleanest departure from fixed reward mixtures: the controller adapts the trade-off during training instead of requiring a single static reward balance for every sequence.

## Contact Priors and Adaptive Resets

Contact priors are what keep the style term from degenerating into joint-angle imitation. The reference contains binary contact events between hand links and objects, plus contact points in the object frame. The style reward encourages the policy to match the reference contact timing and keep contact points near the annotated object-local targets. This matters because low object pose error alone can hide very different finger-object interactions.

The reset mechanism addresses the long-horizon side of the same problem. If every rollout begins at frame one, early failures dominate training and later contact phases receive little signal. ConTrack maintains a reset library indexed by reference frame, storing **policy-reachable states** instead of raw reference states. That detail is important: directly resetting to a human hand-object reference can create impossible contacts in simulation, while states visited by the current policy are physically consistent under the learned controller.

For each frame \(k\), ConTrack estimates a survival ratio,

$$
u_k = \frac{\bar{\ell}_k}{T-k}
$$

then samples reset frames with

$$
p(k) \propto \exp(-u_k / \tau)
$$

This favors segments where the policy fails quickly. As tracking improves, the sampled starts move with the current failure boundary, producing a curriculum that remains tied to reachable contact states.

## Experiments and Main Results

ConTrack is evaluated on **GRAB** for bimanual rigid-object interaction, **ARCTIC** for articulated and multi-object bimanual interaction, and **DexterHand** for single-hand in-hand rotation. Each clip is trained as an independent tracking task for **5000 PPO updates** under a fixed simulator-step budget. Evaluation starts from the first reference frame, so progress measures whether the controller can survive the full sequence instead of only selected resets.

| Method | Progress ↑ | Obj pos ↓ | Obj rot ↓ | Finger err ↓ | Contact F1 ↑ | Contact pt ↓ |
|---|---:|---:|---:|---:|---:|---:|
| ConTrack | 0.899 | 0.026 m | 0.272 rad | 0.163 rad | 0.784 | 0.018 m |
| ManipTrans | 0.743 | 0.012 m | 0.207 rad | 0.277 rad | 0.620 | 0.030 m |
| DexMachina | 0.246 | 0.038 m | 0.348 rad | 0.147 rad | 0.708 | 0.024 m |
| SPIDER | 0.444 | 0.201 m | 1.104 rad | 0.157 rad | 0.191 | 0.036 m |

The table captures the main trade-off. ManipTrans has lower object pose error on frames it survives, while ConTrack reaches much higher progress and stronger contact fidelity. DexMachina keeps finger motion close to the reference but has limited progress under the same budget. SPIDER lacks a learned feedback policy and struggles once contact dynamics dominate.

The ablations line up with the method story: adaptive task-style mixing improves progress and contact fidelity over fixed mixing; the reset library improves progress over start-only and uniform mid-clip resets; contact prior rewards improve contact F1 and contact-point accuracy. The paper also reports a real-world feasibility study on a tabletop bimanual platform with two xArm7 arms and two xHands, where policy-predicted joint references are streamed from simulation to a real-time controller over TCP.

## Relation to ManipTrans

ManipTrans is a useful comparison because it also transfers human bimanual manipulation to dexterous robot hands through residual learning. Its pipeline pretrains a generalist trajectory imitator for hand motion, then fine-tunes residual corrections under interaction constraints. ConTrack changes the emphasis: it turns object tracking into the explicit constraint, treats hand motion and contacts as style, and uses an online dual controller to adapt the balance during RL. It also makes mid-trajectory resets depend on policy-reachable states, which is especially relevant when direct reference resets produce inconsistent contact configurations.

My short taxonomy is: **ManipTrans is a two-stage transfer pipeline centered on imitation plus residual correction; ConTrack is a constrained RL tracking controller centered on adaptive task-style allocation.**

## Strengths and Limitations

ConTrack's strength is conceptual clarity. It names the central conflict in dexterous tracking: object success and motion fidelity often compete. The dual controller turns that conflict into an explicit optimization mechanism, and the reset library keeps training aligned with the simulator states the policy can actually reach. The metrics are also well chosen: progress, object errors, joint errors, contact F1, and contact point error make it harder for a method to look good by optimizing only one side of the task-style trade-off.

The limitations are also clear. The constrained formulation uses a running maximum of task return for normalization, so it behaves as a practical controller instead of a strict guarantee. Contact priors depend on the availability and quality of contact annotations. The hardest DexterHand Ring clip remains difficult under the fixed 5000-update budget; the appendix reports that longer training can reach 94% success with 100,000 PPO updates, which suggests feasibility while exposing compute sensitivity. The real-world study demonstrates executable joint-command streaming, but broader deployment would still need stronger perception and tighter sim-to-real alignment.

## Takeaway

The practical recipe is compact: use human motion as a reference, give object tracking priority through a constrained objective, preserve hand motion and contact as style when the task allows it, train from policy-reachable mid-trajectory states, and report progress together with contact fidelity. For my own mental taxonomy, I would label this paper:

**Constrained RL / Reference Tracking / Residual Tracking Controller / Human-Demonstration-Guided Dexterous Manipulation**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## 核心思路

**ConTrack** 是一个用于灵巧手-物体示范跟踪的 constrained reinforcement-learning controller。论文标题是 **"ConTrack: Constrained Hand Motion Tracking with Adaptive Trade-off Control"**，作者是 **Yutong Liang, Quanquan Peng, Ri-Zhao Qiu, and Xiaolong Wang**，来自 **UC San Diego**；论文链接是 [arXiv:2606.03177](https://arxiv.org/abs/2606.03177)，项目主页是 [lyt0112.com/projects/ConTrack](https://www.lyt0112.com/projects/ConTrack)。

论文的核心判断是：human-to-robot tracking 更适合被表述为 trade-off 问题，而非纯 imitation 问题。人手轨迹可能包含机器人手不可达的姿态、不稳定的接触，或者只适用于另一种 embodiment 的物体运动。ConTrack 因此把 **task** 和 **style** 分开：物体跟踪是主要要求，手部动作和接触一致性在物体轨迹成立之后作为风格目标优化。

每条 reference clip 被建模为 finite-horizon MDP。状态包含机器人关节、物体位姿和速度；reference 提供 retargeted robot joint targets、object pose targets、link-level contact events 和 object-local contact points。策略预测的是 reference 周围的 residual：

$$
q_t^{tar} = q_t^{ref} + a_t
$$

这样控制器可以贴近示范动作，同时保留处理物理冲突的自由度。reward 被拆成 task tracking、style fidelity 和 motion regularization：

$$
r(s_t, a_t) = r_g(s_t, a_t) + r_s(s_t, a_t) + r_p(s_t, a_t)
$$

其中 \(r_g\) 衡量物体位姿跟踪，\(r_s\) 衡量手部运动学和接触保真，\(r_p\) 惩罚高频或不稳定动作。最能概括这篇论文的公式是 constrained objective：

$$
\max_\pi J_s(\pi) \quad \text{s.t.} \quad J_g(\pi) \ge \alpha J_g^\star
$$

直观理解是：在维持目标比例的 task-tracking return 之后，最大化动作风格保真度。目标比例 \(\alpha\) 就成了控制 object-tracking 安全边界的旋钮，只有物体轨迹足够稳定时，策略才把更多容量交给 motion style。

## Adaptive Task-Style Mixing

最关键的机制是 task-style frontier 的在线控制。ConTrack 使用 Lagrangian-style relaxation：

$$
\mathcal{L}(\pi, \lambda) =
J_s(\pi) -
\lambda \left(\alpha - \frac{J_g(\pi)}{J_g^\star}\right)
$$

其中 \(\lambda\) 控制策略对 object tracking 的重视程度。PPO 更新时使用 mixed advantage：

$$
A_{mix} =
w_{task} A_g +
(1 - w_{task}) A_s +
A_p
$$

其中：

$$
w_{task} = \sigma(\lambda)
$$

dual variable 的在线更新为：

$$
\lambda \leftarrow \lambda +
\eta \left(\alpha - \frac{\hat{J}_g}{J_g^\star}\right)
$$

当 normalized task return 低于 \(\alpha\)，\(\lambda\) 上升，优化压力转向物体跟踪；当 task return 稳定高于目标，\(\lambda\) 下降，策略可以恢复更多 hand-pose 和 contact style。相对固定 reward mixture，这里的变化很清楚：训练过程中自动调节 task 和 style 的相对压力，减少了为每条 sequence 手工寻找固定权重的负担。

## 接触先验与自适应 Reset

接触先验让 style term 不会退化成简单的 joint-angle imitation。reference 里包含手部 link 和物体之间的 binary contact events，也包含物体坐标系下的接触点。style reward 鼓励策略匹配参考中的接触时序，并让实际接触点靠近标注的 object-local targets。这个设计很重要，因为只看物体位姿误差可能掩盖完全不同的 finger-object interaction。

reset 机制处理的是同一个问题的长时程版本。如果每次 rollout 都从第一帧开始，早期失败会主导训练分布，后面的接触阶段几乎没有学习信号。ConTrack 维护一个按 reference frame 索引的 reset library，里面保存 **policy-reachable states**，避免直接拷贝 reference state。这个细节很关键：直接 reset 到人手-物体 reference 可能在仿真中制造不可能的接触，而当前策略真实访问过的状态更符合 learned controller 下的物理分布。

对每一帧 \(k\)，ConTrack 估计 survival ratio：

$$
u_k = \frac{\bar{\ell}_k}{T-k}
$$

然后按照

$$
p(k) \propto \exp(-u_k / \tau)
$$

采样 reset frame。这个分布会偏向策略很快失败的片段。随着 tracking 能力提升，采样起点会跟随当前 failure boundary 移动，形成一个始终贴近可达接触状态的 curriculum。

## 实验和主要结果

ConTrack 在 **GRAB**、**ARCTIC** 和 **DexterHand** 上评估：前者覆盖双手 rigid-object interaction，中间覆盖 articulated objects 和 multi-object bimanual interaction，后者覆盖单手 in-hand rotation。每条 clip 都作为独立 tracking task 训练，预算是 **5000 PPO updates**。评估统一从第一帧开始，因此 progress 衡量的是端到端跟踪能力，避免只反映中途 reset 后的局部表现。

| Method | Progress ↑ | Obj pos ↓ | Obj rot ↓ | Finger err ↓ | Contact F1 ↑ | Contact pt ↓ |
|---|---:|---:|---:|---:|---:|---:|
| ConTrack | 0.899 | 0.026 m | 0.272 rad | 0.163 rad | 0.784 | 0.018 m |
| ManipTrans | 0.743 | 0.012 m | 0.207 rad | 0.277 rad | 0.620 | 0.030 m |
| DexMachina | 0.246 | 0.038 m | 0.348 rad | 0.147 rad | 0.708 | 0.024 m |
| SPIDER | 0.444 | 0.201 m | 1.104 rad | 0.157 rad | 0.191 | 0.036 m |

这张表体现了主要 trade-off。ManipTrans 在存活帧上的 object pose error 更低，但 ConTrack 的 progress 明显更高，contact fidelity 也更好。DexMachina 的 finger motion 更接近 reference，但在相同预算下 progress 受限。SPIDER 没有 learned feedback policy，接触动力学占主导时更容易失败。

消融结果也和方法设计一致：adaptive task-style mixing 相比 fixed mixing 提升 progress 和 contact fidelity；reset library 相比只从开头 reset 或 uniform mid-clip reset 能提升 progress；contact prior rewards 能提升 contact F1 和接触点精度。论文还做了真实系统可行性实验，平台是两条 xArm7 机械臂加两只 xHand，系统通过 TCP 把仿真中策略预测的 joint references 发送给实时控制器。

## 和 ManipTrans 的关系

ManipTrans 是一个很相关的对照，因为它同样用 residual learning 把人类双手操作迁移到机器人灵巧手。它先预训练 generalist trajectory imitator 来模仿手部运动，再在 interaction constraints 下 fine-tune residual correction。ConTrack 的重心不同：它把 object tracking 写成显式约束，把 hand motion 和 contacts 作为 style，用 online dual controller 在 RL 训练中自适应调节二者比例。它还让 mid-trajectory reset 依赖 policy-reachable states，这对直接 reference reset 会产生不一致接触的长时程任务尤其重要。

我的简短分类是：**ManipTrans 是围绕 imitation plus residual correction 组织的两阶段迁移流程；ConTrack 是围绕 adaptive task-style allocation 组织的 constrained RL tracking controller。**

## 优点与局限

ConTrack 的优点在于概念很清楚：dexterous tracking 中 object success 和 motion fidelity 经常互相竞争。dual controller 把这个冲突变成显式优化机制，reset library 又让训练分布贴近策略真实可到达的仿真状态。论文的指标也选得比较完整：progress、object errors、joint errors、contact F1 和 contact point error 同时汇报，可以避免方法只优化 task 或只优化 style 却看起来很强。

局限也比较明确。constrained formulation 用 task return 的 running maximum 做归一化，所以它更像实用控制器，不能提供严格约束保证。contact priors 依赖接触标注的可获得性和质量。最难的 DexterHand Ring clip 在固定 5000-update 预算下仍然困难；appendix 报告训练到 100,000 PPO updates 后可以达到 94% success，说明任务可行，也暴露了困难旋转接触阶段对训练预算的敏感性。真实系统实验验证了 joint-command streaming 可以执行，但更广泛的部署还需要更强感知和更紧的 sim-to-real alignment。

## Takeaway

从 robot learning 的角度，ConTrack 给出的 recipe 很紧凑：把人类动作当作 reference，通过 constrained objective 给 object tracking 更高优先级，在 task 允许时保留 hand motion 和 contact style，用 policy-reachable mid-trajectory states 训练长时程接触序列，并且同时报告 progress 和 contact fidelity。我的分类标签会写成：

**Constrained RL / Reference Tracking / Residual Tracking Controller / Human-Demonstration-Guided Dexterous Manipulation**

</div>
