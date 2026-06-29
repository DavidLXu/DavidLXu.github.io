---
title: "[Paper Notes] Shape Your Body: Value Gradients for Multi-Embodiment Robot Design"
date: 2026-06-29
permalink: /posts/2026/06/shape-your-body-paper-notes/
tags:
  - Robot Learning
  - Robot Co-Design
  - Multi-Embodiment Learning
  - Reinforcement Learning
  - Value Functions
---

<div data-lang="en" markdown="1">

**Shape Your Body** turns a multi-embodiment value function into a reusable robot-design model. The key idea is simple and useful: train one embodiment-aware policy and critic across many randomized robot bodies, freeze them, then optimize a new robot's continuous design parameters by differentiating through the critic.

My read: the paper is best understood as amortized co-design. Traditional robot co-design repeatedly proposes a body and retrains or adapts a controller. Here, most of the expensive learning is paid once during multi-embodiment RL training. After that, robot design becomes a fast gradient-based search over morphology, actuator, and control parameters.

## Paper Info

The paper is **"Shape Your Body: Value Gradients for Multi-Embodiment Robot Design"** by **Nico Bohlinger and Jan Peters** from Technical University of Darmstadt, Robotics Institute Germany, DFKI, and hessian.AI. It is available as [arXiv:2606.00702](https://arxiv.org/abs/2606.00702), with project page [nico-bohlinger.github.io/shape-your-body](https://nico-bohlinger.github.io/shape-your-body/).

## The Problem

Robot embodiment and robot control are coupled. A controller can only exploit the physical capabilities that the body gives it, while a good body should be evaluated under a competent controller. Many co-design methods therefore use a bi-level loop: an outer optimizer proposes robot designs, and an inner loop trains or adapts a controller for each candidate. That is expensive, especially when the design vector includes hundreds of continuous parameters such as masses, inertias, joint limits, actuator force limits, velocity limits, geometry, PD gains, and action scales.

This paper changes the unit of reuse. Instead of solving a new co-design problem from scratch for every target robot, it trains a generalist policy and value function over a distribution of robot embodiments. The policy learns to control many bodies. The critic learns to predict how promising a given state and embodiment are under that shared policy. Once trained, the critic becomes a differentiable surrogate objective for downstream design.

## Core Formulation

Each robot design starts as a normalized vector \(f \in [-1,1]^{d_{\mathrm{design}}}\). A differentiable map \(\Phi(f)\) turns this normalized design into physical embodiment parameters \(e\): joint origins, ranges, torque and velocity limits, damping, stiffness, friction, armature, body mass, inertia, center of mass, link geometry, foot properties, PD gains, and related quantities.

For an embodiment-aware policy \(\pi_\theta(a_t \mid s_t,e)\), the expected return is:

\[
J(\theta,e)=\mathbb{E}_{\tau\sim\pi_\theta(\cdot\mid\cdot,e)}
\left[\sum_{t=0}^{T}\gamma^t r_e(s_t,a_t)\right].
\]

During training, each parallel environment samples a design from the current curriculum range, maps it through \(\Phi\), and keeps that design fixed for the episode. The training objective is the expected return over the full design distribution:

\[
\max_\theta\;\mathbb{E}_{f\sim U([-1,1]^{d_{\mathrm{design}}})}
\left[J(\theta,\Phi(f))\right].
\]

After this stage, both policy and critic are frozen. Downstream robot design no longer runs a full RL loop.

## Value-Gradient Design Search

The search method is called **Value-Gradient Design Search (VGDS)**. It first collects a state bank \(S=\{s_1,\ldots,s_M\}\) from rollouts of the final policy. Then it optimizes the design vector directly against the frozen critic. With an ensemble of \(K\) value heads, the mean value prediction is:

\[
\bar{V}(s,\Phi(f))=\frac{1}{K}\sum_{k=1}^{K}V_k(s,\Phi(f)).
\]

Naively maximizing the critic is dangerous because the design may move toward regions where the learned value function extrapolates badly. The paper therefore anchors search around a reference design \(f_{\mathrm{ref}}\), usually a nominal URDF or other valid robot, through a soft trust-region objective:

\[
\hat{J}_\lambda(f)=
\frac{1}{M}\sum_{m=1}^{M}\bar{V}(s_m,\Phi(f))
-\lambda\frac{\lVert f-f_{\mathrm{ref}}\rVert_2^2}{d_{\mathrm{design}}}.
\]

The gradient has two parts: the value gradient from backpropagating through the critic and design map, and the analytic trust-region gradient that pulls the design toward the reference. VGDS applies Adam ascent on minibatches from the state bank, clips each parameter update, and clips the final vector back into the valid design range.

This is the conceptual center of the paper. A value function trained for control becomes a design critic. The design loop is cheap because each step is only batched neural-network inference and backpropagation, not another RL run.

## Critic Architecture Detail

The paper builds on URMA, a multi-embodiment architecture that handles variable robot topology by encoding per-joint observations and per-joint description vectors. In the original URMA critic, the description vector mainly affects attention keys. For design optimization, that is too indirect: the gradient with respect to embodiment parameters needs to be strong and useful.

The authors therefore introduce a **direct-design URMA critic**. The value encoder receives both the per-joint observation \(o_j\) and the per-joint description \(d_j\), written as \(g_\psi(o_j,d_j)\). This makes masses, gains, limits, geometry, and other design parameters enter the value path more directly. They also use multiple value heads and optimize the mean prediction, reducing sensitivity to single-head approximation errors.

That architecture change matters because VGDS depends on gradients through the critic. If the critic can predict returns but gives weak or noisy design gradients, the downstream optimizer has little to work with.

## Experiments

The experiments use a velocity-tracking locomotion task in MuJoCo XLA through RL-X. The largest training set contains **50 robots**: 15 quadrupeds, 31 bipeds and humanoids, and 4 hexapods. The design spaces are high-dimensional, reaching **over 1100 continuous embodiment parameters**.

The paper evaluates three progressively harder settings.

First, in **single-robot design**, the policy and critic are trained on randomized versions of one robot, then used to improve perturbed designs of that same robot. The main robots are Unitree Go2 with 358 design parameters, MIT Humanoid with 514, and Golem with 688. VGDS significantly improves the sampled initial designs and often approaches or exceeds the nominal reference design.

Second, in **cross-training-distribution generalization**, the target robot may be held out from its morphology-class training set, or included in a larger all-robot training set. VGDS remains the strongest search method overall. Training on all 50 robots helps Go2 and MIT Humanoid, while Golem benefits more from the hexapod-specific training set, likely because the all-robot set is dominated by quadrupeds and bipeds.

Third, in **comparison to RL-based co-design**, VGDS matches or slightly exceeds adapted RL co-design baselines while having a much lower marginal cost. The initial multi-embodiment training run takes around **7-9 hours**, but each additional downstream design takes only about **1-2 minutes** of search. In contrast, RL co-design baselines scale roughly linearly with the number of initial designs because each one needs a separate training run.

## What the Gradients Reveal

One especially practical contribution is design analysis. Because VGDS optimizes a design vector, the same gradients can indicate which parameter groups limit performance.

For MIT Humanoid, the largest changes involve nominal joint positions and gains, along with reduced foot size. Copying only the optimized gains into the initial design already improves return from **5.8 to 12.5** in the paper's analysis. For Golem, VGDS reduces the action scale, lowers the P gain, and increases the D gain. For Unitree Go2, the changes are more physical and local, including rear-leg joint-axis changes, foot geometry changes, and actuator velocity-limit changes on the front hip and calf.

This makes the method interesting beyond automatic optimization. It can serve as an engineering diagnostic: the critic does not just propose a better robot, it points to which body parts, actuator limits, gains, or geometry parameters are worth inspecting.

## Strengths and Limitations

The strength of Shape Your Body is that it separates expensive learning from cheap design search. Once a broad multi-embodiment policy and critic exist, the same value function can optimize many new designs through gradients. The method scales to realistic legged-robot models and hundreds to thousands of continuous parameters, where pure black-box search is difficult.

The limitation is that the design topology is fixed. VGDS tunes continuous parameters while leaving joints, body parts, and structural graph edges unchanged. It also depends on critic coverage: if the search leaves the distribution where the critic learned reliable predictions, the value gradients can become misleading. The trust region helps, though it also assumes that a reasonable reference design is available. Finally, all results are in relatively simple MuJoCo simulations, so manufacturability, hardware transfer, materials, electronics, and fabrication constraints remain outside the demonstrated loop.

## Takeaway

Shape Your Body reframes robot co-design as a reuse problem. A generalist multi-embodiment critic is trained once, then reused as a differentiable design model. The result is a fast loop for optimizing body parameters, actuator settings, and controller-related quantities without rerunning RL for every candidate robot.

For robot learning, the broader lesson is that value functions can be more than control-time estimators. If they are trained across a rich enough embodiment distribution and structured to expose useful gradients, they can become interactive tools for designing and understanding robots.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**Shape Your Body** 把 multi-embodiment value function 变成了一个可复用的机器人设计模型。核心想法很直接：先在大量随机机器人身体上训练一个 embodiment-aware policy 和 critic，训练完成后冻结它们，再通过 critic 的梯度优化新机器人的连续设计参数。

我的理解：这篇论文最适合看成 amortized co-design。传统 robot co-design 会反复提出一个身体，然后重新训练或适配控制器。这里把最贵的学习成本集中到一次 multi-embodiment RL 训练里。训练完成后，机器人设计变成对 morphology、actuator 和 control 参数的快速梯度搜索。

## Paper Info

论文是 **"Shape Your Body: Value Gradients for Multi-Embodiment Robot Design"**，作者是 **Nico Bohlinger and Jan Peters**，来自 Technical University of Darmstadt、Robotics Institute Germany、DFKI 和 hessian.AI。论文链接为 [arXiv:2606.00702](https://arxiv.org/abs/2606.00702)，项目主页为 [nico-bohlinger.github.io/shape-your-body](https://nico-bohlinger.github.io/shape-your-body/)。

## 问题

机器人身体和机器人控制是耦合的。控制器只能利用身体本身提供的物理能力；一个好的身体也应该在有能力的控制器下评估。很多 co-design 方法因此采用 bi-level loop：外层优化器提出机器人设计，内层为每个 candidate 训练或适配控制器。这个过程很贵，特别是当设计向量包含数百个连续参数时，例如质量、惯量、关节限制、执行器力矩上限、速度上限、几何尺寸、PD gains 和 action scales。

这篇论文改变了复用的对象。它先在一个机器人 embodiment 分布上训练 generalist policy 和 value function，再把同一套模型用于多个目标机器人的 co-design。policy 学会控制多种身体；critic 学会预测共享 policy 在某个状态和某个 embodiment 下有多大潜力。训练完成后，critic 就变成下游设计中的 differentiable surrogate objective。

## 核心形式化

每个机器人设计先表示为归一化向量 \(f \in [-1,1]^{d_{\mathrm{design}}}\)。一个可微映射 \(\Phi(f)\) 把这个 normalized design 转成物理 embodiment 参数 \(e\)：joint origins、ranges、torque and velocity limits、damping、stiffness、friction、armature、body mass、inertia、center of mass、link geometry、foot properties、PD gains 等。

对于 embodiment-aware policy \(\pi_\theta(a_t \mid s_t,e)\)，期望回报为：

\[
J(\theta,e)=\mathbb{E}_{\tau\sim\pi_\theta(\cdot\mid\cdot,e)}
\left[\sum_{t=0}^{T}\gamma^t r_e(s_t,a_t)\right].
\]

训练时，每个并行环境在当前 curriculum 范围内采样一个设计，通过 \(\Phi\) 映射成物理机器人，并在整个 episode 中保持这个设计不变。训练目标是在完整设计分布上的期望回报：

\[
\max_\theta\;\mathbb{E}_{f\sim U([-1,1]^{d_{\mathrm{design}}})}
\left[J(\theta,\Phi(f))\right].
\]

完成这一步后，policy 和 critic 都被冻结。下游机器人设计不再运行完整 RL loop。

## Value-Gradient Design Search

论文的搜索方法叫 **Value-Gradient Design Search (VGDS)**。它先从最终 policy 的 rollout 中收集一个 state bank \(S=\{s_1,\ldots,s_M\}\)，然后直接用冻结 critic 优化 design vector。对于包含 \(K\) 个 value heads 的 ensemble，平均 value prediction 是：

\[
\bar{V}(s,\Phi(f))=\frac{1}{K}\sum_{k=1}^{K}V_k(s,\Phi(f)).
\]

直接最大化 critic 很危险，因为 design 可能跑到 value function 外推很差的区域。论文因此围绕参考设计 \(f_{\mathrm{ref}}\) 加入 soft trust region。参考设计通常是 nominal URDF 或其他合法机器人：

\[
\hat{J}_\lambda(f)=
\frac{1}{M}\sum_{m=1}^{M}\bar{V}(s_m,\Phi(f))
-\lambda\frac{\lVert f-f_{\mathrm{ref}}\rVert_2^2}{d_{\mathrm{design}}}.
\]

这个梯度由两部分组成：一部分来自通过 critic 和 design map 反向传播得到的 value gradient；另一部分是 trust-region penalty 的解析梯度，用来把设计拉回参考机器人附近。VGDS 在 state bank 的 minibatch 上做 Adam ascent，裁剪每个参数的更新幅度，并把更新后的向量裁剪回合法设计范围。

这是论文的机制中心。为控制训练出来的 value function 被转化成设计 critic。设计循环很便宜，因为每一步只是 batched neural-network inference 和 backpropagation，不需要重新跑 RL。

## Critic Architecture Detail

论文基于 URMA 架构。URMA 面向 multi-embodiment robot control，通过编码 per-joint observations 和 per-joint description vectors 来处理可变机器人拓扑。在原始 URMA critic 中，description vector 主要影响 attention keys。对于 design optimization 来说，这条路径太间接；设计参数的梯度需要更强、更稳定。

作者因此提出 **direct-design URMA critic**。value encoder 同时接收 per-joint observation \(o_j\) 和 per-joint description \(d_j\)，写作 \(g_\psi(o_j,d_j)\)。这样，质量、gains、limits、geometry 等设计参数会更直接地进入 value 路径。论文还使用多个 value heads，并优化它们的平均预测，以降低单个 head 近似误差的影响。

这个架构改动很关键，因为 VGDS 依赖 critic 给出的梯度。如果 critic 能预测 return，但对设计参数给出的梯度很弱或很噪，下游优化器就很难真正工作。

## 实验

实验使用 MuJoCo XLA 和 RL-X 中的 velocity-tracking locomotion task。最大训练集包含 **50 个机器人**：15 个 quadrupeds、31 个 bipeds/humanoids、4 个 hexapods。设计空间维度很高，最高达到 **超过 1100 个连续 embodiment parameters**。

论文评估了三个逐步变难的设定。

第一是 **single-robot design**。policy 和 critic 在同一个机器人的随机化版本上训练，然后用来改进该机器人的 perturbed designs。主要机器人包括 Unitree Go2，358 个设计参数；MIT Humanoid，514 个设计参数；Golem，688 个设计参数。VGDS 显著提升 sampled initial designs，经常接近甚至超过 nominal reference design。

第二是 **cross-training-distribution generalization**。目标机器人可能从对应 morphology-class training set 中 hold out，也可能包含在 all-robot training set 中。VGDS 整体仍然是最强的搜索方法。使用全部 50 个机器人训练会帮助 Go2 和 MIT Humanoid；Golem 则更受益于 hexapod-specific training set，可能是因为 all-robot set 主要由 quadrupeds 和 bipeds 主导。

第三是 **与 RL-based co-design 对比**。VGDS 达到或略微超过改造后的 RL co-design baselines，同时 marginal cost 低很多。初始 multi-embodiment training run 大约需要 **7-9 小时**，但每个额外下游设计只需要 **1-2 分钟**搜索。相比之下，RL co-design baselines 基本随 initial designs 数量线性增长，因为每个设计都需要单独训练。

## 梯度揭示了什么

一个很实用的贡献是 design analysis。因为 VGDS 优化的是 design vector，同样的梯度也可以指出哪些参数组限制了性能。

对于 MIT Humanoid，最大的变化集中在 nominal joint positions 和 gains，同时 foot size 变小。论文分析中，只把 optimized gains 拷贝到 initial design，就已经把 return 从 **5.8 提升到 12.5**。对于 Golem，VGDS 会降低 action scale，降低 P gain，提高 D gain。对于 Unitree Go2，变化更偏物理且局部，包括 rear-leg joint-axis changes、foot geometry changes，以及 front hip 和 calf 的 actuator velocity-limit changes。

这让方法的价值超出了自动优化。它也可以作为工程诊断工具：critic 会提出更好的机器人，同时指出哪些 body parts、actuator limits、gains 或 geometry parameters 值得工程师重点检查。

## 优点与限制

Shape Your Body 的优点是把昂贵学习和便宜设计搜索分开。只要已经有一个覆盖较广的 multi-embodiment policy 和 critic，同一个 value function 就可以通过梯度优化很多新设计。方法能扩展到真实感较强的 legged-robot models，以及数百到上千维连续参数空间；在这种设定下，纯 black-box search 会很困难。

限制在于设计拓扑固定。VGDS 调整连续参数，同时保持 joints、body parts 和 structural graph edges 不变。它也依赖 critic 的覆盖范围：一旦搜索走到 critic 没有可靠学习过的分布外，value gradients 可能误导优化。trust region 可以缓解这个问题，同时也假设存在一个合理的 reference design。最后，所有实验都在相对简单的 MuJoCo 仿真中完成，manufacturability、hardware transfer、materials、electronics 和 fabrication constraints 还没有进入验证闭环。

## Takeaway

Shape Your Body 把 robot co-design 重新表述为一个复用问题。先训练一个 generalist multi-embodiment critic，再把它复用成 differentiable design model。最终得到的是一个快速循环，可以优化身体参数、执行器设置和控制相关参数，而不必为每个 candidate robot 重新跑 RL。

对 robot learning 来说，更大的启发是 value function 可以超出控制时的未来回报估计。如果它在足够丰富的 embodiment distribution 上训练，并且架构能暴露有用梯度，它就可以变成设计和理解机器人的交互式工具。

</div>
