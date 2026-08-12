---
title: "[Paper Notes] Evolution Gym: A Large-Scale Benchmark for Evolving Soft Robots"
date: 2026-08-12
permalink: /posts/2026/08/evolution-gym-paper-notes/
tags:
  - Soft Robotics
  - Robot Co-Design
  - Evolutionary Robotics
  - Reinforcement Learning
  - Benchmark
  - Embodied Intelligence
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Evolution Gym (EvoGym)** is a benchmark for jointly optimizing a soft robot's **body** and **controller**. A robot is a connected grid of fewer than 100 voxels selected from five types: empty, rigid, soft, horizontal actuator, and vertical actuator. This small material alphabet creates a large combinatorial morphology space while remaining cheap enough for repeated controller training.

The benchmark formalizes co-design as a bilevel loop. An outer optimizer proposes a body; an inner reinforcement-learning procedure trains a controller for that body; the achieved task reward becomes the body's fitness. EvoGym supplies a fast 2D mass-spring simulator, a Gym-style Python interface, and more than 30 locomotion and manipulation environments. The paper evaluates three outer-loop methods—genetic algorithm, Bayesian optimization, and CPPN-NEAT—with PPO in the inner loop.

The central result is deliberately mixed. Automatically evolved robots outperform hand-designed morphologies on many tasks and develop recognizable structures such as grippers, feet, and friction-maximizing backs. A simple genetic algorithm is the strongest overall baseline. Every tested method fails on the hardest environments, exposing how little the field had solved about morphology-control co-optimization. EvoGym's main contribution is therefore a standardized research problem and failure surface, not a single winning evolution algorithm.

## Paper Info

The paper is **“Evolution Gym: A Large-Scale Benchmark for Evolving Soft Robots”** by **Jagdeep Singh Bhatia, Holly Jackson, Yunsheng Tian, Jie Xu, and Wojciech Matusik** from **MIT CSAIL**. It appeared at **NeurIPS 2021**.

- Paper: [arXiv:2201.09863](https://arxiv.org/abs/2201.09863)
- Project, environments, documentation, and tutorials: [evogym.csail.mit.edu](https://evogym.csail.mit.edu/)

## 1. Why Co-Design Is a Different Problem

Most robot-learning benchmarks hold the body fixed and optimize a controller:

\[
\pi^\star
=
\arg\max_\pi
J(D_{\text{fixed}},\pi;T),
\]

where \(D\) is robot design, \(\pi\) is the controller, and \(T\) is the task. EvoGym expands the decision space:

\[
(D^\star,\pi^\star)
=
\arg\max_{D,\pi}
J(D,\pi;T).
\]

This change is more difficult than adding another policy parameter. Altering the body changes observation dimension, action dimension, dynamics, contact geometry, and which behaviors are physically reachable. A body can look poor because its controller was undertrained; a controller can look poor because the body makes the task impossible. Evaluation must separate controller-training noise from morphology quality.

The paper adopts a practical bilevel approximation:

\[
\pi_D^\star
\approx
\operatorname{OptimizeControl}(T,D),
\qquad
D^\star
\approx
\arg\max_D J(D,\pi_D^\star;T).
\]

Every body evaluation contains a full control-learning problem. This nested cost is the main computational bottleneck in robot evolution and one reason earlier work used only a handful of simple environments.

## 2. Multi-Material Voxel Robots

EvoGym represents a robot as a material matrix \(M\) plus a connectivity list \(C\). Each cell in \(M\) has one of five labels:

1. empty,
2. rigid,
3. soft,
4. horizontal actuator,
5. vertical actuator.

The connectivity list records links between adjacent occupied voxels. Valid designs must form a connected body and contain at least one actuator. Changing an occupied cell to empty changes topology; changing its material changes compliance or actuation.

This direct encoding is important for benchmarking. All search methods operate on the same explicit morphology, so performance differences come from optimization instead of incompatible simulators or body representations. The encoding is also expressive: a small grid and a few material types can form legs, cavities, grippers, compliant contact regions, and asymmetric appendages.

There is a trade-off. A voxel grid makes topology editing easy and simulation fast, but it limits geometry to a 2D lattice and discrete material categories. EvoGym studies algorithmic co-design under this abstraction; it does not claim that an evolved voxel body can be fabricated directly as a complete physical robot.

## 3. Observation and Action Change with the Body

Let \(N\) be the number of unique voxel corner points. Robot state includes every corner's 2D position relative to the robot center of mass, plus center-of-mass velocity and orientation:

\[
o_{\text{robot}}\in\mathbb R^{2N+3}.
\]

Tasks may append a local terrain-height window and goal-specific state. Manipulation environments, for example, include the object's orientation, velocity, and position relative to the robot.

Each action component controls one actuator voxel. The command \(u\in[0.6,1.6]\) specifies a target deformation as a fraction of that voxel's rest length. Horizontal and vertical actuators change their preferred shape along different axes.

Consequently, observation and action dimensions depend on morphology. The benchmark trains a separate controller for each proposed body, avoiding the need for a universal policy architecture across arbitrary voxel counts. This choice simplifies baseline evaluation while making the inner loop expensive.

## 4. The 2D Soft-Body Simulator

The simulator models objects and terrain as a mass-spring system. Each voxel begins as a cross-braced square; its edges behave as ideal springs with stiffness determined by material type. The system advances with symplectic RK-4 integration.

Collision detection uses a bounding-box tree. Normal and friction forces are penalty-based and scale with penetration depth. The backend is written in C++, with Python bindings designed around the OpenAI Gym API.

The simulator's simplicity is a feature. Co-design may require evaluating thousands of bodies, and every evaluation trains a controller. High-fidelity 3D simulation would make a benchmark-scale comparison prohibitively expensive. EvoGym chooses fast, consistent dynamics so researchers can spend computation on the co-design algorithm itself.

The same decision defines the benchmark's boundary. Results demonstrate optimization inside the 2D mass-spring world. They provide limited evidence about 3D mechanics, actuator bandwidth, manufacturing tolerances, material hysteresis, or sim-to-real transfer.

## 5. More Than 30 Tasks

The environment suite spans locomotion, manipulation, and combinations of the two. Tasks are labeled easy, medium, or hard based on baseline performance.

Representative locomotion tasks include:

- **Walker:** maximize speed on flat ground.
- **Bridge Walker:** cross soft rope bridges separated by rigid supports.
- **Up Stepper:** climb stairs with varying step lengths.
- **Climber:** move upward between two walls using contact and friction.
- **Traverser:** cross a pit filled with rigid blocks without sinking.

Representative manipulation tasks include:

- **Carrier:** catch a falling object and carry it forward.
- **Thrower:** throw an object far while keeping the body near its start.
- **Beam Slider:** reach a beam resting on separated platforms and slide it forward.
- **Catcher:** catch a spinning object dropped from a random high position.
- **Lifter:** grasp an object and lift it out of a hole.

These environments force morphology to serve different functions. Flat walking rewards efficient periodic motion. Climbing rewards contact area and traction. Catching needs impact absorption and containment. Lifting requires an appendage that behaves like a gripper. A morphology optimizer that performs well across the suite must discover task-conditioned structure, not a single fast walker.

## 6. The Bilevel Evolution Loop

For a population of \(p\) designs over \(n\) generations, the generic loop is:

1. sample or propose robot designs;
2. train a controller for every design;
3. evaluate the optimized design-controller pair;
4. update the design optimizer from the accumulated fitness data;
5. repeat and return the best pair.

In compact form,

\[
\mathcal S
\leftarrow
\mathcal S\cup
\{(D_j,\pi_j,r_j)\}_{j=1}^{p},
\qquad
D_{1:p}^{\text{next}}
=
\operatorname{OptimizeDesigns}(\mathcal S,p).
\]

The dataset \(\mathcal S\) preserves each body, its trained controller, and achieved reward. The outer loop sees only the expensive, noisy result of inner-loop learning.

## 7. Three Design Optimizers

### 7.1 Genetic Algorithm

The GA retains an elite fraction of the current population and constructs offspring by mutating survivors. Each voxel has a 10% probability of changing type. Mutation to or from empty edits body topology. The survivor fraction decreases from 60% toward zero over the run, shifting population turnover across generations. The implementation does not use crossover.

This baseline is intentionally simple. Its strong results later show that direct local mutation is well matched to EvoGym's discrete grid.

### 7.2 Bayesian Optimization

BO treats morphology evaluation as an expensive black-box problem. It fits a Gaussian-process surrogate over categorical voxel inputs, uses batch Thompson sampling, and optimizes the acquisition function with L-BFGS.

The setting is hostile to standard BO: the categorical morphology vector is high-dimensional, topology validity is structured, and PPO introduces noisy fitness estimates. The results confirm that an inaccurate surrogate cannot guide this design space effectively.

### 7.3 CPPN-NEAT

A Compositional Pattern Producing Network receives voxel coordinates and outputs a material type. NEAT evolves the CPPN topology and weights. This indirect encoding favors spatial regularity and can generate repeated, smooth material patterns with few parameters.

That inductive bias often helps locomotion. It can become restrictive for manipulation, where an irregular hook, gripper, or cavity may be essential. EvoGym makes this encoding-task interaction visible.

## 8. PPO as the Inner-Loop Controller

Previous soft-robot evolution often optimized open-loop periodic actuation or a CPPN that generated actuator phases and frequencies. Those controllers fit regular locomotion but struggle when terrain changes or an object arrives unpredictably.

EvoGym trains a feedback policy with **Proximal Policy Optimization (PPO)** for every proposed morphology. The controller can react to voxel state, local terrain, and task variables. This allows non-periodic behaviors such as catching, lifting, climbing uneven geometry, and manipulating an object.

PPO greatly expands behavioral expressiveness, while multiplying evaluation cost and adding variance. The benchmark therefore tests two optimization capabilities at once: exploration of a combinatorial body space and reliable comparison of bodies under imperfect controller training.

## 9. What the Baselines Reveal

There is no universally best outer-loop method, but the simple GA performs best overall. CPPN-NEAT is competitive on locomotion and weak on complex manipulation. BO performs poorly on most tasks.

The likely reasons align with each method's inductive bias:

- GA mutations make local, discrete changes directly in the evaluated representation.
- CPPN-NEAT favors regular morphology, which suits repeated locomotion patterns.
- BO must learn a smooth surrogate over a noisy, high-dimensional categorical space with strong topology constraints.

The result is valuable because it resists an easy “more sophisticated optimizer wins” story. Representation and task structure determine which search bias is useful.

## 10. Morphology Actually Changes During Evolution

The qualitative sequences show increasing functional specialization.

In **Carrier**, early survivors already contain legs and a pocket-like region that catches the falling object. Later generations improve locomotion while retaining containment. Fitness couples two body requirements: object security and forward speed.

In **Lifter**, evolution creates a parallel-gripper-like structure beneath the body. This structure is absent from the initial random population and emerges because lifting rewards a specific manipulation affordance.

In **Bridge Walker**, successful bodies grow a large front foot. The increased contact area and friction help the robot move across compliant rope bridges.

These examples are the paper's strongest illustration of embodied intelligence. The controller learns how to use a body, and the outer loop changes the body so that useful control strategies become easier or possible.

## 11. Comparison with Hand-Designed Robots

The authors build several bio-inspired robots manually and optimize their controllers with the same PPO procedure. On every evaluated task, at least one co-design method finds a body that outperforms the hand-designed set.

The Climber result is especially revealing. Human designs struggle to balance upward propulsion and wall traction. Evolution finds legs that generate progress, a long flat back that increases frictional contact, and a central hole that supports the resulting gait.

Some tasks are closer. A natural hand-designed Carrier nearly matches the best evolved designs because the required morphology—a container plus locomotor appendages—is intuitive. On Beam Slider, neither human nor evolved designs are satisfactory. One GA robot moves the beam across several supports, yet remains far from an effective solution.

The conclusion is narrower than “evolution beats engineers.” Automated search helps when body-task interactions are unintuitive, and the hardest tasks defeat both search and intuition.

## 12. Strengths and Limitations

**Strengths.** EvoGym turns scattered soft-robot evolution experiments into a comparable benchmark. It standardizes morphology, simulation, task interfaces, and evaluation while allowing researchers to replace the co-design algorithm. The task suite goes beyond flat-ground locomotion and includes contact-rich manipulation. Open-source code and a familiar Gym interface lower the barrier to entry.

**Limitations.** The world is 2D, voxelized, and simulated with simplified mass-spring physics. Morphologies use a small discrete material set, and the paper does not demonstrate fabrication or real-world transfer. A separate PPO controller is trained from scratch for each body, making body evaluation costly and noisy. Direct encoding also scales poorly as grid resolution increases.

Difficulty labels depend on the chosen baselines, so “hard” means unsolved by these algorithms under their budgets. The benchmark can expose failure without identifying whether it comes from design search, controller optimization, reward shaping, or insufficient computation.

## 13. My Takeaway

Evolution Gym's enduring idea is to treat **morphology as part of the learning problem** and give that problem a reproducible interface. Its voxel world is deliberately modest, yet the bilevel optimization structure captures a fundamental challenge: every body defines a new control problem, and every controller determines how that body is judged.

The strongest research opportunities follow directly from this bottleneck: reuse controllers across related morphologies, learn morphology-conditioned value estimates, differentiate through physics, jointly update body and policy, discover compact generative encodings, and optimize bodies for multiple tasks.

EvoGym should therefore be read as an invitation to improve co-design methodology. Its hardest environments are useful precisely because the included baselines fail. A benchmark becomes valuable when it measures progress that has not happened yet.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**Evolution Gym（EvoGym）** 是一个同时优化 soft robot **body** 与 **controller** 的 benchmark。每个 robot 都是由少于 100 个 voxels 组成的 connected grid，voxel type 包括 empty、rigid、soft、horizontal actuator 和 vertical actuator。很小的 material alphabet 可以形成巨大的 combinatorial morphology space，同时保证每个 design 的 controller training 仍具有可接受的成本。

Benchmark 把 co-design 形式化为 bilevel loop。Outer optimizer 提出 body；inner reinforcement-learning procedure 为该 body 训练 controller；最终 task reward 作为 body fitness。EvoGym 提供 fast 2D mass-spring simulator、Gym-style Python interface，以及 30 多个 locomotion 和 manipulation environments。论文在 inner loop 统一使用 PPO，并比较 genetic algorithm、Bayesian optimization 和 CPPN-NEAT 三种 outer-loop methods。

论文给出的结论有意保留了两面性。Automatically evolved robots 在许多任务上超过 hand-designed morphologies，并形成 gripper、large foot 和用于增加 friction 的 flat back 等可识别结构。简单 GA 是综合表现最好的 baseline，但所有方法都无法解决 hardest environments。因此，EvoGym 的核心贡献是标准化 research problem 与 failure surface，而非提出一个已经解决 robot evolution 的单一算法。

## 论文信息

论文标题是 **“Evolution Gym: A Large-Scale Benchmark for Evolving Soft Robots”**，作者为 **Jagdeep Singh Bhatia、Holly Jackson、Yunsheng Tian、Jie Xu 和 Wojciech Matusik**，来自 **MIT CSAIL**，发表于 **NeurIPS 2021**。

- 论文：[arXiv:2201.09863](https://arxiv.org/abs/2201.09863)
- 项目、环境、文档和教程：[evogym.csail.mit.edu](https://evogym.csail.mit.edu/)

## 1. 为什么 Co-Design 是一个不同的问题

大部分 robot-learning benchmark 固定 body，只优化 controller：

\[
\pi^\star
=
\arg\max_\pi
J(D_{\text{fixed}},\pi;T),
\]

其中 \(D\) 是 robot design，\(\pi\) 是 controller，\(T\) 是 task。EvoGym 扩展了 decision space：

\[
(D^\star,\pi^\star)
=
\arg\max_{D,\pi}
J(D,\pi;T).
\]

这项扩展远超增加一组 policy parameters。改变 body 会同时改变 observation dimension、action dimension、dynamics、contact geometry，以及哪些 behaviors 在物理上可达。Body 表现差可能源于 controller 没有充分训练；controller 表现差也可能因为 body 根本无法完成任务。Evaluation 必须面对 controller-training noise 与 morphology quality 的耦合。

论文采用实用的 bilevel approximation：

\[
\pi_D^\star
\approx
\operatorname{OptimizeControl}(T,D),
\qquad
D^\star
\approx
\arg\max_D J(D,\pi_D^\star;T).
\]

每次 body evaluation 都包含一个完整 control-learning problem。Nested cost 是 robot evolution 的主要 computational bottleneck，也是早期工作通常只评估少量简单环境的原因。

## 2. Multi-Material Voxel Robots

EvoGym 用 material matrix \(M\) 和 connectivity list \(C\) 表示 robot。\(M\) 中每个 cell 有五种标签之一：

1. empty；
2. rigid；
3. soft；
4. horizontal actuator；
5. vertical actuator。

Connectivity list 记录相邻 occupied voxels 之间的 links。Valid design 必须形成 connected body，并且至少包含一个 actuator。把 occupied cell 改成 empty 会改变 topology，改变 material 则会改变 compliance 或 actuation。

这个 direct encoding 很适合 benchmark。所有 search methods 都在同一个 explicit morphology 上工作，因此性能差异来自 optimization，而非互不兼容的 simulator 或 body representation。它也具有足够 expressiveness：一个小型 grid 和少量 material types 就能构成 legs、cavities、grippers、compliant contact regions 与 asymmetric appendages。

代价同样明确。Voxel grid 便于 topology editing，也能快速 simulation，但 geometry 被限制在 2D lattice，material 也是离散类别。EvoGym 研究的是该 abstraction 内的 algorithmic co-design，并没有声称 evolved voxel body 可以直接作为完整 physical robot 制造出来。

## 3. Observation 与 Action 会随 Body 改变

设 \(N\) 是 unique voxel corner points 的数量。Robot state 包含每个 corner 相对于 robot center of mass 的 2D position，以及 center-of-mass velocity 和 orientation：

\[
o_{\text{robot}}\in\mathbb R^{2N+3}.
\]

Task 可以额外加入 local terrain-height window 和 goal-specific state。例如 manipulation environments 会提供 object orientation、velocity，以及 object center 相对于 robot 的位置。

每个 action component 控制一个 actuator voxel。Command \(u\in[0.6,1.6]\) 表示相对于该 voxel rest length 的 target deformation。Horizontal 和 vertical actuators 沿不同方向改变 preferred shape。

因此，observation 与 action dimensions 都依赖 morphology。Benchmark 为每个 proposed body 单独训练 controller，无需设计一个兼容任意 voxel count 的 universal policy architecture。这个选择简化了 baseline evaluation，也使 inner loop 变得昂贵。

## 4. 2D Soft-Body Simulator

Simulator 把 objects 和 terrain 表示成 mass-spring system。每个 voxel 初始是 cross-braced square，edge 作为 ideal spring，其 stiffness 由 material type 决定。系统通过 symplectic RK-4 integration 前进。

Collision detection 使用 bounding-box tree。Normal 与 friction forces 采用 penalty-based 形式，并随 penetration depth 增大。Backend 用 C++ 实现，再通过参考 OpenAI Gym API 的 Python bindings 接入 learning framework。

Simulator 的简洁性本身就是设计目标。Co-design 需要评估数千个 bodies，每个 evaluation 又要训练 controller。High-fidelity 3D simulation 会让 benchmark-scale comparison 成本过高。EvoGym 选择快速且一致的 dynamics，让研究者可以把 computation 用在 co-design algorithm 上。

这项选择也限定了 benchmark 的外延。实验只说明 algorithm 在 2D mass-spring world 中的 optimization 能力，对 3D mechanics、actuator bandwidth、manufacturing tolerance、material hysteresis 与 sim-to-real transfer 的证据有限。

## 5. 30 多个 Tasks

Environment suite 覆盖 locomotion、manipulation 以及两者的组合。Task difficulty 根据 baseline performance 分为 easy、medium 和 hard。

代表性的 locomotion tasks 包括：

- **Walker：**在 flat ground 上最大化速度。
- **Bridge Walker：**跨越由 rigid supports 分隔的 soft rope bridges。
- **Up Stepper：**爬上 step length 不同的楼梯。
- **Climber：**利用 contact 和 friction 在两堵墙之间向上运动。
- **Traverser：**穿过装有 rigid blocks 的 pit，同时避免下沉。

代表性的 manipulation tasks 包括：

- **Carrier：**接住 falling object 并向前搬运。
- **Thrower：**尽量把物体扔远，同时让 body 保持在起点附近。
- **Beam Slider：**移动到位于多个 platforms 上的 beam 旁，并把它向前推动。
- **Catcher：**接住从随机高处落下的 spinning object。
- **Lifter：**抓取物体并将其从 hole 中提起。

不同 environments 会迫使 morphology 承担不同功能。Flat walking 奖励 efficient periodic motion，climbing 奖励 contact area 与 traction，catching 需要 impact absorption 和 containment，lifting 则需要能充当 gripper 的 appendage。要在整个 suite 中表现良好，morphology optimizer 必须发现 task-conditioned structure，不能只产生一种 fast walker。

## 6. Bilevel Evolution Loop

对于包含 \(p\) 个 designs、运行 \(n\) 个 generations 的过程，通用循环为：

1. sample 或提出 robot designs；
2. 为每个 design 训练 controller；
3. 评估 optimized design-controller pair；
4. 用积累的 fitness data 更新 design optimizer；
5. 重复并返回最佳 pair。

写成紧凑形式：

\[
\mathcal S
\leftarrow
\mathcal S\cup
\{(D_j,\pi_j,r_j)\}_{j=1}^{p},
\qquad
D_{1:p}^{\text{next}}
=
\operatorname{OptimizeDesigns}(\mathcal S,p).
\]

Dataset \(\mathcal S\) 保存每个 body、trained controller 和 achieved reward。Outer loop 只能看到 inner-loop learning 产生的昂贵且带噪声的结果。

## 7. 三种 Design Optimizers

### 7.1 Genetic Algorithm

GA 保留当前 population 中的 elite fraction，再通过 mutation survivors 构造 offspring。每个 voxel 有 10% 概率改变 type。Mutate to/from empty 会直接编辑 body topology。Survivor fraction 在训练过程中从 60% 逐渐下降到零，调整各 generations 的 population turnover。实现中没有使用 crossover。

这个 baseline 有意保持简单。它后续取得的强结果说明，direct local mutation 很适合 EvoGym 的 discrete grid。

### 7.2 Bayesian Optimization

BO 把 morphology evaluation 当作 expensive black-box problem。它在 categorical voxel inputs 上拟合 Gaussian-process surrogate，使用 batch Thompson sampling，并通过 L-BFGS 优化 acquisition function。

这个 setting 对 standard BO 非常困难：categorical morphology vector 维度高，topology validity 具有结构约束，PPO 还会引入 noisy fitness estimate。实验结果说明，不准确的 surrogate 很难有效引导这个 design space。

### 7.3 CPPN-NEAT

Compositional Pattern Producing Network 接收 voxel coordinates 并输出 material type。NEAT 演化 CPPN topology 与 weights。该 indirect encoding 偏好 spatial regularity，能够用较少参数生成 repeated、smooth material patterns。

这种 inductive bias 经常有利于 locomotion，却会限制 manipulation。在 manipulation 中，irregular hook、gripper 或 cavity 可能是关键。EvoGym 让 encoding-task interaction 变得可测量。

## 8. 作为 Inner Loop 的 PPO

早期 soft-robot evolution 经常优化 open-loop periodic actuation，或者让 CPPN 生成各 actuator 的 phase 与 frequency。这类 controller 适合规则 locomotion，却很难应对变化 terrain 或不可预测的 object arrival。

EvoGym 为每个 proposed morphology 使用 **Proximal Policy Optimization（PPO）** 训练 feedback policy。Controller 可以根据 voxel state、local terrain 与 task variables 做出反应，因此能够学习 catching、lifting、uneven climbing 和 object manipulation 等 non-periodic behavior。

PPO 扩大了 behavioral expressiveness，同时成倍增加 evaluation cost 并引入 variance。Benchmark 实际同时测试两种 optimization 能力：探索 combinatorial body space，以及在 controller training 不完美的情况下可靠比较不同 bodies。

## 9. Baselines 揭示了什么

没有一个 outer-loop method 在所有 tasks 上最好，但简单 GA 的综合表现最强。CPPN-NEAT 在 locomotion 上有竞争力，在 complex manipulation 上较弱。BO 在多数 tasks 上表现不佳。

可能原因与各方法的 inductive bias 一致：

- GA mutation 直接在 evaluated representation 中执行 local discrete changes。
- CPPN-NEAT 偏好 regular morphology，适合重复 locomotion pattern。
- BO 需要在带强 topology constraints、噪声显著的 high-dimensional categorical space 中学习 smooth surrogate。

这个结果避免了“更复杂 optimizer 自然更好”的简单叙事。Representation 与 task structure 决定了哪种 search bias 真正有效。

## 10. Morphology 如何在 Evolution 中变化

Qualitative sequences 展示了逐步增强的 functional specialization。

在 **Carrier** 中，早期 survivors 已经包含 legs 和用于接住 falling object 的 pocket-like region。后续 generations 在保留 containment 的同时提升 locomotion。Fitness 同时耦合 object security 与 forward speed 两种 body requirement。

在 **Lifter** 中，evolution 在 body 下方形成 parallel-gripper-like structure。这个结构没有出现在 initial random population 中，源于 lifting reward 对 manipulation affordance 的要求。

在 **Bridge Walker** 中，成功 body 长出 large front foot。更大的 contact area 与 friction 帮助 robot 跨越 compliant rope bridge。

这些例子最能说明论文对 embodied intelligence 的理解：controller 学会如何使用 body；outer loop 继续改变 body，让有用的 control strategy 变得更容易，甚至从不可能变成可能。

## 11. 与 Hand-Designed Robots 比较

作者手工构造了多个 bio-inspired robots，并用相同 PPO procedure 优化它们的 controllers。在每个 evaluated task 上，至少有一种 co-design method 找到超过 hand-designed set 的 body。

Climber 的结果尤其有启发。Human design 很难同时平衡 upward propulsion 与 wall traction。Evolution 找到了提供 forward progress 的 legs、增加 frictional contact 的 long flat back，以及帮助形成特定 gait 的 central hole。

有些 tasks 的差距较小。一个直观的 hand-designed Carrier 几乎追平 best evolved designs，因为需要的 morphology——container 加 locomotor appendages——比较容易想到。在 Beam Slider 中，人类和自动生成 designs 都不够理想。一个 GA robot 可以把 beam 推过几个 supports，但距离真正高效的 solution 仍然很远。

因此，论文结论比“evolution beats engineers”更克制。Automated search 在 body-task interaction 不直观时特别有用，而 hardest tasks 同时击败 search 与 intuition。

## 12. 优势与局限

**优势。** EvoGym 把分散的 soft-robot evolution experiments 变成可比较 benchmark。它统一 morphology、simulation、task interface 和 evaluation，同时允许研究者替换 co-design algorithm。Task suite 超越 flat-ground locomotion，包含 contact-rich manipulation。Open-source code 和熟悉的 Gym interface 降低了使用门槛。

**局限。** 整个世界是 2D、voxelized，并使用简化 mass-spring physics。Morphology 只有少量 discrete materials，论文也没有展示 fabrication 或 real-world transfer。每个 body 都要从头训练独立 PPO controller，使 body evaluation 昂贵且带噪声。随着 grid resolution 增长，direct encoding 的可扩展性也会迅速下降。

Difficulty labels 依赖所选 baselines，因此 “hard” 的实际含义是这些 algorithms 在给定预算下无法解决。Benchmark 能暴露 failure，却无法直接判断根因来自 design search、controller optimization、reward shaping 还是 computation 不足。

## 13. 我的理解

Evolution Gym 最持久的观点是把 **morphology 纳入 learning problem**，再给这个问题一个 reproducible interface。Voxel world 有意保持简洁，但 bilevel optimization structure 捕捉了一个根本难题：每个 body 都定义了新的 control problem，每个 controller 又决定了我们如何评价该 body。

最值得继续研究的方向都来自这一 bottleneck：在相近 morphologies 间复用 controllers，学习 morphology-conditioned value estimate，对 physics 求导，同时更新 body 与 policy，发现 compact generative encoding，以及优化能完成多个 tasks 的 body。

因此，EvoGym 更适合作为改进 co-design methodology 的起点。Hardest environments 的价值恰恰来自 included baselines 的失败。Benchmark 真正有用的时候，就是它能够测量尚未发生的进步。

</div>
