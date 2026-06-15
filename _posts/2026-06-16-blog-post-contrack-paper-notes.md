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

## TL;DR

**ConTrack** is best read as a **constrained reinforcement-learning reference-tracking controller** for dexterous hand-object manipulation. It uses human demonstrations as reference motion and contact priors, then trains a residual policy in physics simulation to make those references executable on robot hands.

The key design choice is the separation between **task success** and **motion style**. Object tracking becomes the primary constraint, while hand motion and contact fidelity become the style objective. A dual-variable controller adjusts the task-style trade-off online: when object tracking falls behind, optimization shifts toward task tracking; when object tracking is strong enough, optimization shifts back toward preserving hand motion and contact style.

This makes ConTrack especially relevant for human-to-robot transfer, where a captured human hand trajectory often cannot be physically realized by a robot hand. The paper's practical answer is simple and sharp: keep the object on track first, then use the remaining control freedom to preserve human-like motion and contacts.

## Paper Info

The paper is **"ConTrack: Constrained Hand Motion Tracking with Adaptive Trade-off Control"** by **Yutong Liang, Quanquan Peng, Ri-Zhao Qiu, and Xiaolong Wang** from **UC San Diego**. It is available as [arXiv:2606.03177](https://arxiv.org/abs/2606.03177), with the project page at [lyt0112.com/projects/ConTrack](https://www.lyt0112.com/projects/ConTrack).

Keywords from the paper: **dexterous manipulation**, **in-hand manipulation**, **reference tracking**, and **multi-objective reinforcement learning**.

## Problem and Motivation

Human demonstrations are abundant and expressive, but transferring them to robot hands is difficult because of the embodiment gap. Human hands and robot hands differ in morphology, actuation, joint limits, and contact affordances. A trajectory that looks valid for a human may create impossible contacts, unstable object motion, or unreachable robot postures.

Prior approaches often rely on retargeting, fixed reward mixtures, or per-sequence tuning. These methods become fragile when contact timing matters. Long-horizon dexterous sequences add another problem: if training starts from the first frame every time, early failures dominate the rollout distribution and later contact phases receive little learning signal.

ConTrack focuses on this exact failure mode. It asks: when a reference trajectory cannot satisfy object tracking, hand-pose fidelity, and contact fidelity at the same time, how should a controller allocate its limited optimization budget?

## Method Overview

ConTrack treats each reference clip as a finite-horizon MDP. The simulator state includes robot joints, object poses, and velocities. The reference provides:

- robot joint targets obtained from retargeted human hand motion,
- object pose targets,
- link-level contact annotations,
- object-local contact points.

The policy outputs a residual joint displacement around the reference:

$$
q_t^{tar} = q_t^{ref} + a_t
$$

This residual form keeps exploration near the demonstrated motion while giving the controller room to deviate when physics demands it.

The reward is decomposed into three parts:

$$
r(s_t, a_t) = r_g(s_t, a_t) + r_s(s_t, a_t) + r_p(s_t, a_t)
$$

Here:

- \(r_g\) measures task success through object pose tracking.
- \(r_s\) measures style fidelity through hand kinematics and contacts.
- \(r_p\) penalizes high-frequency or unstable motion.

The main constrained objective is:

$$
\max_\pi J_s(\pi) \quad \text{s.t.} \quad J_g(\pi) \ge \alpha J_g^\star
$$

In words, the policy maximizes style fidelity while maintaining a target fraction of the best observed task-tracking return.

## Adaptive Task-Style Mixing

The central technical idea is an online controller for the task-style trade-off. ConTrack uses a Lagrangian-style relaxation:

$$
\mathcal{L}(\pi, \lambda) =
J_s(\pi) -
\lambda \left(\alpha - \frac{J_g(\pi)}{J_g^\star}\right)
$$

The scalar \(\lambda\) controls how strongly the policy should care about task tracking. PPO then updates the policy with a mixed advantage:

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

The dual variable is updated online:

$$
\lambda \leftarrow \lambda +
\eta \left(\alpha - \frac{\hat{J}_g}{J_g^\star}\right)
$$

If the normalized task return drops below the target ratio \(\alpha\), \(\lambda\) increases and the policy emphasizes object tracking. If the task return stays above the target, \(\lambda\) decreases and the policy spends more capacity on style fidelity.

This is the main difference from fixed reward-weight tracking. The target ratio \(\alpha\) becomes an interpretable knob over the task-style frontier.

## Adaptive Mid-Trajectory Reset Library

Long-horizon contact tracking is inefficient when every rollout begins at the first frame. ConTrack introduces a reset library indexed by reference frame. Each entry stores a full simulator state: robot joints and velocities, object poses and velocities, and the current reference index.

The important detail is that the library is refreshed from **policy-reachable states**. Directly resetting the simulator to a reference hand-object state can create physically inconsistent contacts. ConTrack instead stores states that the current policy actually visited and uses continuation length to decide whether a cached state should be replaced.

For each frame \(k\), the method estimates a survival ratio:

$$
u_k = \frac{\bar{\ell}_k}{T-k}
$$

and samples reset frames with:

$$
p(k) \propto \exp(-u_k / \tau)
$$

This focuses training on segments where the policy tends to fail quickly. As tracking improves, the reset distribution moves earlier in the clip, continually targeting the current boundary between success and failure.

## Contact Priors

ConTrack uses contact annotations as part of the style objective. The reference includes binary contact events between hand links and objects, plus object-local contact points. The style reward encourages:

- matching the reference contact event,
- placing contact points near the annotated object-local contact targets.

This matters because object pose error alone does not fully specify contact behavior. Two policies may keep the object near the target while using very different finger-object interactions. Contact priors help preserve the demonstrated interaction pattern.

## Experiments and Main Results

The paper evaluates ConTrack on three benchmark tiers:

- **GRAB:** bimanual rigid-object interaction.
- **ARCTIC:** bimanual interaction with articulated objects and multi-object contact.
- **DexterHand:** single-hand in-hand rotation.

Each clip is trained as an independent tracking task for **5000 PPO updates** under a fixed simulator-step budget. Evaluation always starts from the first reference frame, so progress measures end-to-end tracking.

The main comparison includes **ManipTrans**, **DexMachina**, and **SPIDER**. Under the fixed 5000-update budget, the averaged results are:

| Method | Progress ↑ | Obj pos ↓ | Obj rot ↓ | Finger err ↓ | Contact F1 ↑ | Contact pt ↓ |
|---|---:|---:|---:|---:|---:|---:|
| ConTrack | 0.899 | 0.026 m | 0.272 rad | 0.163 rad | 0.784 | 0.018 m |
| ManipTrans | 0.743 | 0.012 m | 0.207 rad | 0.277 rad | 0.620 | 0.030 m |
| DexMachina | 0.246 | 0.038 m | 0.348 rad | 0.147 rad | 0.708 | 0.024 m |
| SPIDER | 0.444 | 0.201 m | 1.104 rad | 0.157 rad | 0.191 | 0.036 m |

ManipTrans achieves lower object pose error on the frames it survives, but ConTrack makes much more progress and preserves contact fidelity better. DexMachina keeps finger motion close to the reference, but its progress is limited under the same budget. SPIDER has no learned feedback policy, so it struggles once contact dynamics dominate.

The ablations support the paper's core mechanisms:

- Adaptive task-style mixing improves progress and contact fidelity over fixed mixing.
- The reset library improves progress compared with start-only resets and uniform mid-clip resets.
- Contact prior rewards improve contact F1 and contact point accuracy.

The paper also includes a real-world feasibility study on a tabletop bimanual platform with two xArm7 arms and two xHands. The system streams policy-predicted joint references from simulation to a real-time controller over TCP.

## Compared with ManipTrans

ManipTrans is a strong and relevant baseline because it also transfers human bimanual manipulation to dexterous robot hands through residual learning. Its pipeline has two stages: pretrain a generalist trajectory imitator for hand motion, then fine-tune a residual module under interaction constraints.

ConTrack changes the framing in three important ways.

First, ConTrack makes object tracking the primary constraint and treats hand motion/contact fidelity as the style objective. This gives the method a clear rule for physically inconsistent references: preserve the object's task trajectory first, then recover as much motion style as possible.

Second, ConTrack replaces fixed reward balancing with an online dual controller. ManipTrans relies on a residual correction setup after imitation pretraining. ConTrack directly adapts the relative pressure between task and style during RL training, which reduces the need for per-sequence reward tuning.

Third, ConTrack adds a policy-reachable mid-trajectory reset library. This is especially useful for long-horizon contact sequences, where direct reference-state resets can produce inconsistent hand-object contact states.

My summary: **ManipTrans is a two-stage human-to-robot transfer pipeline centered on imitation plus residual correction. ConTrack is a constrained RL tracking controller centered on adaptive task-style allocation.**

## Strengths

ConTrack is strong because it names the central conflict in dexterous tracking: object success and motion fidelity often compete. The dual controller turns that conflict into an explicit optimization mechanism instead of hiding it inside fixed reward weights.

The reset library is also practical. It respects contact dynamics by using states the policy can actually reach. This makes the curriculum more aligned with the simulator's physical state distribution.

The paper's metrics are well chosen. Reporting progress, object errors, joint errors, contact F1, and contact point error makes it harder for a method to look good by optimizing only one side of the task-style trade-off.

## Limitations

The constrained formulation uses a running maximum of task return for online normalization. This is stable in practice, but it does not provide a strict guarantee that the constraint will always be satisfied.

Contact priors depend on the availability and quality of contact annotations. If contact labels are noisy, sparse, or missing, the style objective becomes weaker.

The hardest DexterHand Ring clip remains challenging under the fixed 5000-update budget. The appendix shows that longer training can reach 94% success on this clip with 100,000 PPO updates, which suggests feasibility but also highlights the compute sensitivity of difficult rotational contact phases.

The real-world study demonstrates executable joint-command streaming, while broader deployment would need richer perception and tighter sim-to-real alignment.

## Takeaways

For robot learning, ConTrack is useful as a clean recipe for turning human hand-object motion into executable robot trajectories:

1. Use human motion as a reference, not as an absolute command.
2. Give object tracking priority through a constrained objective.
3. Preserve hand motion and contact as style when the task constraint allows it.
4. Train from policy-reachable mid-trajectory states to handle long contact sequences.
5. Measure progress and contact fidelity together.

For my own mental taxonomy, I would label this paper:

**Constrained RL / Reference Tracking / Residual Tracking Controller / Human-Demonstration-Guided Dexterous Manipulation**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**ConTrack** 可以归类为一个用于灵巧手-物体交互的 **constrained reinforcement-learning reference-tracking controller**。它使用人类示范作为参考轨迹和接触先验，然后在物理仿真中训练 residual policy，让这些参考动作变成机器人手可以执行的控制轨迹。

它最关键的设计是把 **任务成功** 和 **动作风格** 分开。物体跟踪是主要约束，手部动作和接触一致性是风格目标。训练过程中，一个 dual-variable controller 会在线调整 task-style 权重：物体跟踪变差时，优化压力转向 task tracking；物体已经跟得比较稳时，优化压力回到 hand motion 和 contact fidelity。

这套思路很适合 human-to-robot transfer，因为人手轨迹经常无法被机器人手完全复现。ConTrack 给出的策略很直接：先让物体轨迹成立，再把剩余控制自由度用于保留人类动作和接触风格。

## Paper Info

论文标题是 **"ConTrack: Constrained Hand Motion Tracking with Adaptive Trade-off Control"**，作者是 **Yutong Liang, Quanquan Peng, Ri-Zhao Qiu, and Xiaolong Wang**，来自 **UC San Diego**。论文链接是 [arXiv:2606.03177](https://arxiv.org/abs/2606.03177)，项目主页是 [lyt0112.com/projects/ConTrack](https://www.lyt0112.com/projects/ConTrack)。

论文关键词包括：**dexterous manipulation**、**in-hand manipulation**、**reference tracking**、**multi-objective reinforcement learning**。

## 问题和动机

人类示范数量多、动作自然，但迁移到机器人手上很难。人手和机器人手在形态、驱动方式、关节限制、接触能力上都有差异。一个人手可以完成的轨迹，放到机器人手上可能带来不可实现的接触、不稳定的物体运动，或者不可达的关节姿态。

很多已有方法依赖 retargeting、固定 reward mixture，或者针对每条 sequence 调参。只要接触时序变重要，这些方法就容易变得脆弱。长时程灵巧操作还会带来一个额外问题：如果每次 rollout 都从第一帧开始，早期失败会占据训练分布，后面的接触阶段几乎学不到。

ConTrack 针对的正是这个痛点。它关心的问题是：当一条参考轨迹无法同时满足物体跟踪、手部姿态保真、接触保真时，控制器应该怎样分配有限的优化预算？

## 方法概览

ConTrack 把每条 reference clip 建模为一个 finite-horizon MDP。仿真状态包含机器人关节、物体位姿和速度。参考信号包含：

- 由人手动作 retarget 得到的机器人关节目标，
- 物体位姿目标，
- link-level contact annotations，
- 物体局部坐标系下的接触点。

策略输出的是 reference 周围的 residual joint displacement：

$$
q_t^{tar} = q_t^{ref} + a_t
$$

这种 residual 形式让探索保持在示范动作附近，同时允许控制器在物理约束需要时偏离参考。

每一步 reward 被分解为三部分：

$$
r(s_t, a_t) = r_g(s_t, a_t) + r_s(s_t, a_t) + r_p(s_t, a_t)
$$

其中：

- \(r_g\) 通过物体位姿跟踪衡量任务成功。
- \(r_s\) 通过手部运动学和接触衡量风格一致性。
- \(r_p\) 惩罚高频或不稳定运动。

核心 constrained objective 是：

$$
\max_\pi J_s(\pi) \quad \text{s.t.} \quad J_g(\pi) \ge \alpha J_g^\star
$$

直观理解就是：在任务跟踪达到目标比例的前提下，尽量提高动作风格保真度。

## Adaptive Task-Style Mixing

论文最核心的技术点是 task-style trade-off 的在线控制。ConTrack 使用一个 Lagrangian-style relaxation：

$$
\mathcal{L}(\pi, \lambda) =
J_s(\pi) -
\lambda \left(\alpha - \frac{J_g(\pi)}{J_g^\star}\right)
$$

标量 \(\lambda\) 控制 task tracking 的压力。PPO 更新时使用 mixed advantage：

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

dual variable 在线更新：

$$
\lambda \leftarrow \lambda +
\eta \left(\alpha - \frac{\hat{J}_g}{J_g^\star}\right)
$$

当 normalized task return 低于目标比例 \(\alpha\)，\(\lambda\) 增大，策略更重视物体跟踪。当 task return 高于目标比例，\(\lambda\) 下降，策略把更多容量分给 style fidelity。

这就是它相对固定 reward-weight tracking 的关键变化。目标比例 \(\alpha\) 变成了一个可解释的旋钮，用来控制 task-style frontier。

## Adaptive Mid-Trajectory Reset Library

长时程接触跟踪中，每次都从第一帧开始训练效率很低。ConTrack 引入了按 reference frame 索引的 reset library。每个 entry 存一份完整的仿真状态：机器人关节和速度、物体位姿和速度，以及当前 reference index。

这里最重要的细节是：library 从 **policy-reachable states** 中刷新。直接把仿真器 reset 到 reference hand-object state，可能会制造物理上不一致的接触状态。ConTrack 存储当前策略真实访问过的状态，并根据 continuation length 判断是否替换缓存。

对每一帧 \(k\)，方法估计 survival ratio：

$$
u_k = \frac{\bar{\ell}_k}{T-k}
$$

然后按照：

$$
p(k) \propto \exp(-u_k / \tau)
$$

采样 reset frame。

这样训练会集中到策略快速失败的片段。随着 tracking 能力增强，reset 分布会逐步往 clip 更早的位置移动，持续对准成功和失败之间的边界。

## Contact Priors

ConTrack 把接触标注作为 style objective 的一部分。reference 里包含手部 link 和物体之间的 binary contact event，也包含物体局部坐标下的接触点。style reward 鼓励：

- 匹配 reference contact event，
- 让接触点靠近标注的 object-local contact target。

这一点很重要，因为只看物体位姿误差无法完整描述接触行为。两个策略都可能让物体接近目标轨迹，但手指与物体的交互方式完全不同。contact priors 能帮助策略保留示范中的接触模式。

## 实验和主要结果

论文在三个 benchmark tier 上评估 ConTrack：

- **GRAB:** bimanual rigid-object interaction。
- **ARCTIC:** 带 articulated objects 和 multi-object contact 的双手交互。
- **DexterHand:** 单手 in-hand rotation。

每条 clip 都作为独立 tracking task 训练，训练预算是 **5000 PPO updates**。评估时统一从第一帧开始，所以 progress 衡量的是端到端 tracking 能力。

主要 baseline 包括 **ManipTrans**、**DexMachina** 和 **SPIDER**。在固定 5000-update 预算下，平均结果如下：

| Method | Progress ↑ | Obj pos ↓ | Obj rot ↓ | Finger err ↓ | Contact F1 ↑ | Contact pt ↓ |
|---|---:|---:|---:|---:|---:|---:|
| ConTrack | 0.899 | 0.026 m | 0.272 rad | 0.163 rad | 0.784 | 0.018 m |
| ManipTrans | 0.743 | 0.012 m | 0.207 rad | 0.277 rad | 0.620 | 0.030 m |
| DexMachina | 0.246 | 0.038 m | 0.348 rad | 0.147 rad | 0.708 | 0.024 m |
| SPIDER | 0.444 | 0.201 m | 1.104 rad | 0.157 rad | 0.191 | 0.036 m |

ManipTrans 在存活帧上的物体位姿误差更低，但 ConTrack 的 progress 明显更高，contact fidelity 也更好。DexMachina 的 finger motion 更接近 reference，但在相同预算下 progress 受限。SPIDER 没有 learned feedback policy，所以接触动力学占主导时更容易失败。

消融实验支持论文的三个核心模块：

- adaptive task-style mixing 相比 fixed mixing 提升 progress 和 contact fidelity；
- reset library 相比从开头 reset 和 uniform mid-clip reset 提升 progress；
- contact prior rewards 提升 contact F1 和接触点精度。

论文还做了真实系统可行性实验，平台是两条 xArm7 机械臂加两只 xHand。系统把仿真中策略预测的 joint references 通过 TCP 发送给实时控制器。

## 和 ManipTrans 的对比

ManipTrans 是一个很相关的强 baseline，因为它同样面向从人类双手操作到机器人灵巧手的迁移，并使用 residual learning。它的流程分两阶段：先预训练一个 hand motion trajectory imitator，再在 interaction constraints 下 fine-tune residual module。

ConTrack 的变化主要有三点。

第一，ConTrack 把 object tracking 设为主要约束，把 hand motion/contact fidelity 设为 style objective。对于物理上不一致的 reference，它给出了清晰的优先级：先保住物体任务轨迹，再尽可能恢复动作风格。

第二，ConTrack 用 online dual controller 替代固定的 reward balancing。ManipTrans 依赖 imitation pretraining 后的 residual correction。ConTrack 在 RL 训练过程中直接调节 task 和 style 的相对压力，减少了针对每条 sequence 调 reward 的需求。

第三，ConTrack 增加了 policy-reachable mid-trajectory reset library。这个机制对长时程接触序列很有用，因为直接从 reference state reset 可能生成不一致的 hand-object contact state。

我的总结是：**ManipTrans 是围绕 imitation plus residual correction 组织的人类到机器人迁移流程。ConTrack 是围绕 adaptive task-style allocation 组织的 constrained RL tracking controller。**

## 优点

ConTrack 的优点在于它把 dexterous tracking 中最核心的冲突说清楚了：object success 和 motion fidelity 经常互相竞争。dual controller 把这个冲突变成显式优化机制，而不需要把它藏在固定 reward weights 里面。

reset library 也很实用。它使用策略真实可到达的状态，尊重接触动力学。这让 curriculum 更贴近仿真器中的真实物理状态分布。

论文的评估指标也比较完整。progress、object errors、joint errors、contact F1、contact point error 同时汇报，能避免一个方法只优化 task 或只优化 style 就显得很强。

## 局限

constrained formulation 依赖 task return running maximum 做在线归一化。它在实践中比较稳定，但不能严格保证约束始终满足。

contact priors 依赖接触标注的可获得性和质量。如果 contact labels 噪声大、稀疏或缺失，style objective 会变弱。

最难的 DexterHand Ring clip 在固定 5000-update 预算下仍然困难。appendix 显示，训练到 100,000 PPO updates 后，这条 clip 可以达到 94% success，说明任务可行，同时也说明困难旋转接触阶段对算力和训练时长敏感。

真实系统实验验证了 joint-command streaming 的可执行性。更广泛的真实部署还需要更强的感知和更紧的 sim-to-real alignment。

## Takeaways

从 robot learning 的角度，ConTrack 给出了一套把人类手-物体动作转成机器人可执行轨迹的清晰 recipe：

1. 把人类动作当作 reference，避免当成绝对命令。
2. 用 constrained objective 给 object tracking 更高优先级。
3. 当 task constraint 允许时，保留 hand motion 和 contact style。
4. 用 policy-reachable mid-trajectory states 训练长时程接触序列。
5. 同时度量 progress 和 contact fidelity。

我的分类标签会写成：

**Constrained RL / Reference Tracking / Residual Tracking Controller / Human-Demonstration-Guided Dexterous Manipulation**

</div>
