---
title: "[Paper Notes] DexAnyTwist: Learning General Dexterous Twisting with Hybrid Manipulation System Identification"
date: 2026-07-24
permalink: /posts/2026/07/dexanytwist-paper-notes/
tags:
  - Dexterous Manipulation
  - Reinforcement Learning
  - Hybrid Systems
  - Sim-to-Real
  - Robotics
---

<div data-lang="en" markdown="1">

**DexAnyTwist** asks a useful scaling question for dexterous manipulation: why can adding more object diversity make a universal policy worse? Its answer is that a broad twisting dataset is a *hybrid dynamical system*. A screwdriver, valve, bottle cap, nut, and fragile light bulb impose different contact formation, torque transmission, friction, scale, and slip constraints. A single continuous policy receives incompatible gradients and settles on a mediocre average action pattern.

The paper's central contribution is **DexSifter**, an iterative expert-discovery procedure. It trains a policy over all objects, assigns the reliably solved objects to that expert, trains a new expert on the unsolved residual set, and finally learns a router that selects one expert at inference. This turns general twisting from one giant function-fitting problem into partitioning and controlling locally consistent manipulation regimes.

## Paper Info

The paper is **"DexAnyTwist: Learning General Dexterous Twisting with Hybrid Manipulation System Identification"** by **Xing Liu, Yunlong Dong, Jun Wan, Linan Deng, Feng Hua, Yi Shen, Min Yu, Guijun Ma, Cheng Cheng, Haitao Song, Han Ding, and Ye Yuan**. It appeared in *National Science Review* in June 2026. The official [paper page](https://academic.oup.com/nsr/advance-article/doi/10.1093/nsr/nwag351/8704707) and [project page](https://prevalenter.github.io/dexanytwist.github.io/) provide the article, demonstrations, and data.

## Why General Twisting Is a Hybrid-System Problem

Twisting looks like a single skill at the task label level, yet its contact mechanics change sharply across objects. A small nut asks for fingertip coordination inside a narrow workspace. A valve may allow a stable power grasp. A light bulb asks for torque with controlled contact force. Screw and bulb tasks can also slip or tilt as the movable component loosens.

The authors model this using latent manipulation modes (m_o\in\{1,\ldots,K\}):

\[
P(\mathbf{s}_{t+1}\mid\mathbf{s}_t,\mathbf{a}_t,m_o)=P_k(\mathbf{s}_{t+1}\mid\mathbf{s}_t,\mathbf{a}_t).
\]

Each (P_k) represents a locally consistent regime. The mode is not manually labeled from physical properties. DexAnyTwist discovers a practical partition through learning performance: objects an expert handles consistently are treated as one subsystem; the unresolved cases expose a residual regime that needs a new expert.

This explains the paper's counterintuitive scaling result. With the same architecture, optimizer, and training setup, increasing the object library from 10 to 290 instances sharply reduces the consecutive-success metric for a monolithic policy. More data expands coverage, but it also increases dynamic conflict.

## Training World and Task Definition

The authors build a self-contained library of **more than 300 simulated objects in 10 categories**, including bottles, valves, screws, and bolts. Every object is modeled as a stationary base plus a twistable part.

There are two physics templates. Valve-like tasks use one revolute joint about the vertical axis. Screw- and bulb-like tasks add two revolute joints at the bottom along the (x) and (y) axes. Those additional degrees of freedom represent loosening, pose change, and relative motion that can make an object slide out of the hand. The benchmark therefore spans both straightforward rotation and contact-rich rotation with grasp-stability requirements.

The reported metrics separate short-horizon completion from sustained control:

- **CSC (Consecutive Success Count):** average number of sequential goals completed in one continuous episode; this is the primary long-horizon metric.
- **SR (Success Rate):** fraction of attempts that finish the goal.
- **TTR (Time to Reach):** time required to reach a goal.

## DexSifter: Forward Partition, Backward Refinement, Hard Routing

DexSifter has three stages.

First, it performs **forward partitioning**. An initial expert is trained on the full object distribution and evaluated by empirical CSC on every object. The objects it reliably solves become that expert's assigned subset. The remaining objects form the residual set. A fresh expert is trained on this residual set while prior experts stay frozen. Repeating the process produces a library of complementary experts.

Second, it applies **backward refinement**. Each expert is further optimized only on its assigned subset. This removes gradients from unrelated contact regimes after the partition is established.

Third, a learned gating network receives hand-object interaction features and routes to a single expert:

\[
j^*=\arg\max_{j\in\{1,\ldots,K\}}p_{\boldsymbol\phi,j},
\qquad
\mathbf{a}=\pi_{j^*}(\mathbf{x}).
\]

The route selects one expert instead of averaging their actions. That detail matters: blending two policies that expect different contact modes can create exactly the incoherent action that the decomposition was designed to avoid.

## Policy Inputs and Architecture

DexAnyTwist observes proprioceptive hand states, object states, and an object point cloud. A recurrent backbone encodes the temporal interaction state, while a PointNet encoder extracts geometry-aware object features. A routing module maps these features to the expert policy library.

The point cloud is doing more than visual decoration. Similar rotational objectives can require different finger placements for different geometry, and the routing decision needs a representation that connects shape with the current contact state. The recurrent component likewise lets an expert react to interaction history instead of treating every frame as an independent grasp pose.

## Results: Decompose the Long Tail

DexAnyTwist's result is strongest in the heterogeneous, difficult portion of the distribution. On the most challenging setting, the paper reports an **18.5%** improvement in success rate and a **114%** improvement in CSC over the baselines. On the hard subset, the method maintains **69.5% SR**, while the compared baselines fall to **18.1% SR**.

The system is also transferred directly from simulation to real hardware. High-level target joint positions run at **10 Hz**, and the low-level PD motor controller runs at **1 kHz**. Training initially uses object-joint positions, which are convenient simulator states but unavailable on physical objects. The authors therefore distill a deployment student with curriculum learning: Gaussian noise on those joint-position inputs is gradually increased until the final policy operates without that privileged signal.

The real-world evaluation includes six representative objects. The demonstrations show twisting for a screwdriver, valve, spray bottle, nut, and fragile bulb-like objects. The point is zero-shot transfer across unfamiliar geometries, with no object-specific policy fine-tuning.

## Emergent Manipulation Primitives

One attractive qualitative result is that the learned behavior becomes interpretable. Fingertip-density visualizations show the **thumb** acting as the main torque-producing digit, while the **index and middle fingers** tend to form localized contact regions that behave like virtual pivots. This division resembles a human twist strategy: one digit drives rotation and other digits stabilize the object and constrain its axis.

That observation should be read as an empirical property, not a hand-coded prior. The method does not prescribe a thumb-actuator / finger-pivot controller. The roles emerge after learning policies whose partitions better match the underlying contact regimes.

## What I Take from the Paper

DexAnyTwist makes a broader point about embodied-policy scaling. Dataset diversity is valuable only when the learner has a mechanism to represent incompatible physical modes. For contact-rich skills, more objects can create a fractured optimization landscape before they create a universal policy.

DexSifter offers a simple operational test for that situation: train on all data, identify what is already stable, isolate the residual failure modes, specialize, then learn a state-and-geometry-aware router. It uses control performance to build a useful latent decomposition instead of recovering symbolic equations for the hybrid system. This occupies a practical middle ground between a monolithic end-to-end policy and fully specified contact-mode modeling.

The remaining question is routing under broader real-world uncertainty. The paper's hard routing is deliberately mode-consistent, yet a wrong mode decision can be costly around contact transitions. Extending the approach with uncertainty-aware routing, recovery behaviors, or tactile observations would be a natural next step for deployment in cluttered everyday settings.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**DexAnyTwist** 提出一个很值得重视的 scaling 问题：为什么 dexterous manipulation 中，加入更多物体多样性反而可能让通用 policy 变差？论文的答案是，大规模 twisting 数据集本质上构成一个 **hybrid dynamical system**。Screwdriver、valve、bottle cap、nut 和 fragile bulb 对 contact formation、torque transmission、friction、尺度与 slip 的约束并不相同。一个连续的单一 policy 同时接收这些相互冲突的梯度，最终容易收敛成处处能做一点、但没有一类做得足够稳的平均策略。

论文的核心贡献是 **DexSifter**，一个逐步发现 expert 的过程。它先在全部物体上训练 policy，将能稳定完成的物体划给当前 expert，再在未解决的 residual set 上训练新 expert，最后学习一个 router，在推理时选择其中一个 expert。这样，general twisting 从一个巨大函数拟合问题，转成了对局部动力学一致的 manipulation regimes 进行划分与控制的问题。

## 论文信息

论文题目为 **"DexAnyTwist: Learning General Dexterous Twisting with Hybrid Manipulation System Identification"**，作者为 **Xing Liu, Yunlong Dong, Jun Wan, Linan Deng, Feng Hua, Yi Shen, Min Yu, Guijun Ma, Cheng Cheng, Haitao Song, Han Ding 和 Ye Yuan**，发表于 2026 年 6 月的 *National Science Review*。官方 [论文页面](https://academic.oup.com/nsr/advance-article/doi/10.1093/nsr/nwag351/8704707) 与 [项目主页](https://prevalenter.github.io/dexanytwist.github.io/) 提供论文、演示和数据。

## 为什么 General Twisting 属于 Hybrid-System 问题

从任务标签看，twisting 像是一项单一技能；从接触力学看，它会随着物体发生突变。小 nut 需要在狭窄空间内协调 fingertip；valve 可以使用更稳定的 power grasp；light bulb 既要施加 torque，也要控制接触力。Screw 和 bulb 在松动后还可能发生滑移或倾斜。

作者用潜在 manipulation mode (m_o\in\{1,\ldots,K\}) 建模：

\[
P(\mathbf{s}_{t+1}\mid\mathbf{s}_t,\mathbf{a}_t,m_o)=P_k(\mathbf{s}_{t+1}\mid\mathbf{s}_t,\mathbf{a}_t).
\]

每个 (P_k) 对应一个局部一致的动态区域。这个 mode 不由人工物理标签指定。DexAnyTwist 从 learning performance 中构造可用的划分：一个 expert 能稳定处理的物体被视为一个 subsystem，持续失败的 residual cases 则暴露出需要新 expert 的动态区域。

这也解释了论文中反直觉的 scaling 现象。在 architecture、optimizer 和 training setup 相同的条件下，object library 从 10 扩展到 290 个实例时，monolithic policy 的 consecutive-success 指标显著下降。更多数据提升了覆盖面，同时放大了动力学冲突。

## 训练环境与任务定义

作者构建了一个包含 **300 多个 simulated objects、10 个类别** 的自包含库，覆盖 bottles、valves、screws 和 bolts 等。每个 object 都由 stationary base 和可旋转 component 组成。

其中有两类物理模板。Valve 类任务只使用绕竖直轴的一个 revolute joint。Screw 和 bulb 类任务会在物体底部沿 (x)、(y) 方向再加入两个 revolute joints，用来模拟部件松动后出现的姿态变化、相对运动和从手中滑出的风险。因此 benchmark 同时覆盖了直接旋转，以及需要保持抓取稳定性的 contact-rich rotation。

论文用三个指标区分短期完成和持续控制能力：

- **CSC (Consecutive Success Count)：** 单个连续 episode 中完成的序列目标平均数量，是主要的 long-horizon 指标。
- **SR (Success Rate)：** 完成目标的尝试比例。
- **TTR (Time to Reach)：** 到达目标所需时间。

## DexSifter：Forward Partition、Backward Refinement 与 Hard Routing

DexSifter 分为三个阶段。

首先是 **forward partitioning**。初始 expert 在完整 object distribution 上训练，然后针对每个物体按 empirical CSC 评估。它能可靠解决的 objects 归入当前 expert 的 assigned subset；其余 objects 组成 residual set。新 expert 从头在 residual set 上训练，已有 expert 保持 frozen。重复这一过程即可得到一组互补的 experts。

第二步是 **backward refinement**。每个 expert 只在自己被分配到的 subset 上进一步优化，使其不再受到无关 contact regimes 的梯度干扰。

第三步，learned gating network 根据 hand-object interaction features 路由到单个 expert：

\[
j^*=\arg\max_{j\in\{1,\ldots,K\}}p_{\boldsymbol\phi,j},
\qquad
\mathbf{a}=\pi_{j^*}(\mathbf{x}).
\]

这里采用 hard route，而不是对多个 action 做加权平均。这个选择很关键：如果两个 policy 预期的是不同 contact modes，混合它们的动作很可能重新制造出模型划分想要消除的不连贯行为。

## Policy 输入与架构

DexAnyTwist 的输入包括 hand proprioceptive states、object states 和 object point cloud。Recurrent backbone 编码时序 hand-object interaction state，PointNet encoder 提取 geometry-aware object features，routing module 再据此连接到 expert policy library。

Point cloud 不只是装饰性的视觉输入。相同的 rotation objective 在不同几何上需要不同 finger placement，router 需要把 shape 与当前 contact state 连接起来。Recurrent 部分则让 expert 根据 interaction history 做反应，而不是把每帧都当作独立 grasp pose。

## 结果：把 Long Tail 拆开处理

DexAnyTwist 最显著的收益出现在 heterogeneous、困难的分布部分。在最具挑战的设置上，论文报告相较 baselines，**success rate 提升 18.5%**，**CSC 提升 114%**。在 hard subset 中，该方法保持 **69.5% SR**，而所比较的 baselines 只有 **18.1% SR**。

系统也从 simulation 直接部署到 real hardware。High-level target joint position 的输出频率为 **10 Hz**，low-level PD motor controller 运行在 **1 kHz**。训练早期会输入 simulator 中容易取得、现实中难以直接测得的 object-joint position。作者因此通过 curriculum learning 蒸馏 deployment student：逐渐提高该 joint-position 输入上的 Gaussian noise，直到最终 policy 不再依赖这个 privileged signal。

Real-world evaluation 包括 6 个代表性物体。论文展示了 screwdriver、valve、spray bottle、nut 及 fragile bulb 类物体上的 twisting。核心是对陌生几何进行 zero-shot transfer，不做 object-specific policy fine-tuning。

## Emergent Manipulation Primitives

论文中一个很有意思的定性结果是，学出的行为具有可解释性。Fingertip density visualization 显示，**thumb** 往往承担主要 torque-producing 作用，**index 与 middle fingers** 则形成局部接触区域，效果类似 virtual pivots。这种分工接近人的 twisting 方式：一个手指驱动旋转，其他手指稳定物体并约束其轴线。

这应当被理解为一个 empirical property，而非 hand-coded prior。论文没有预先规定 thumb-actuator / finger-pivot controller；这些角色是在各 expert 的学习过程更好地匹配 underlying contact regimes 后自然出现的。

## 我的理解

DexAnyTwist 对 embodied-policy scaling 的启发在于：数据多样性只有在 learner 能表达不相容 physical modes 时才真正转化为通用性。对于 contact-rich skill，更多 objects 可能先形成碎裂的 optimization landscape，再带来 universal policy。

DexSifter 给出了一个可操作的应对方式：先在全部 data 上训练，识别已经稳定的部分，隔离 residual failure modes，进行 specialist training，最后学习一个能看 state 和 geometry 的 router。它并不显式恢复 hybrid system 的符号方程，却能利用 control performance 构建有用的 latent decomposition。这处在 monolithic end-to-end policy 与完全指定的 contact-mode model 之间，是一个实用的折中。

下一步值得关注的是更广泛 real-world uncertainty 下的 routing。论文刻意采用 mode-consistent hard routing，但接触切换附近的错误 mode decision 代价可能很高。结合 uncertainty-aware routing、recovery behaviors 或 tactile observations，会是部署到杂乱日常环境的自然延伸。

</div>
