---
title: "[Paper Notes] RoboGrammar: Graph Grammar for Terrain-Optimized Robot Design"
date: 2026-08-12
permalink: /posts/2026/08/robogrammar-paper-notes/
tags:
  - Robot Design
  - Graph Grammar
  - Graph Neural Networks
  - Model Predictive Control
  - Design Optimization
  - Evolutionary Robotics
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**RoboGrammar** automates rigid robot design for a specified terrain. Its pipeline has three layers: a recursive **graph grammar** generates structurally valid morphologies from available components; **model predictive control (MPC)** finds a locomotion controller for each completed design; and **Graph Heuristic Search (GHS)** learns which partial grammar derivations are likely to lead to high-performing robots.

The graph grammar is more than a convenient encoding. It excludes large regions of nonsensical design space, enforces bilateral limb symmetry and valid component connectivity, and makes every robot a sequence of production-rule applications. GHS then assigns value to incomplete designs. A GNN predicts the best reward reachable from each partial graph, allowing search to prioritize promising branches before paying for an expensive dynamics-and-MPC evaluation.

Across flat ground, low-friction ice, ridges, gaps, stairs, and wall obstacles, different bodies emerge: short low-inertia legs for speed, long reaching legs for gaps, articulated arms for ice, and flexible bodies for turning. GHS finds stronger designs in 2,000 evaluations than MCTS and random search find in 5,000. The main limitations are equally important: the grammar encodes a human-designed arthropod prior, the controller favors stable periodic gaits, continuous dimensions are fixed, and fabricability is checked only at the component-layout level without physical deployment.

## Paper Info

The paper is **“RoboGrammar: Graph Grammar for Terrain-Optimized Robot Design”** by **Allan Zhao, Jie Xu, Mina Konaković-Luković, Josephine Hughes, Andrew Spielberg, Daniela Rus, and Wojciech Matusik** from **MIT**. It appeared in **ACM Transactions on Graphics 39(6), Proceedings of SIGGRAPH Asia 2020**.

- Project page: [people.csail.mit.edu/jiex/papers/robogrammar](https://people.csail.mit.edu/jiex/papers/robogrammar/)
- Paper: [robogrammar.pdf](https://cdfg.csail.mit.edu/assets/files/robogrammar.pdf)
- Code: [github.com/allanzhao/RoboGrammar](https://github.com/allanzhao/RoboGrammar)

## 1. The Design Problem

RoboGrammar receives:

- a library of physical primitives such as body links, limb links, joints, connectors, and wheels;
- one or more terrains;
- a locomotion reward.

It returns a robot morphology and a controller optimized for those conditions. Conceptually,

\[
(G^\star,U^\star)
=
\arg\max_{G\in\mathcal L(\mathcal G),\,U}
J(G,U;\mathcal T),
\]

where \(\mathcal G\) is the graph grammar, \(\mathcal L(\mathcal G)\) is the set of complete robot graphs it can generate, \(U\) is a control sequence, and \(\mathcal T\) is the terrain.

The difficulty comes from two nested combinatorial problems. A short sequence of grammar rules can branch into hundreds of thousands of bodies. Every completed body then needs a good controller before its morphology can be judged. Most computation is spent on control synthesis and simulation, so search efficiency matters more than generating candidates quickly.

RoboGrammar organizes this process into:

\[
\text{components + terrain}
\rightarrow
\text{grammar-constrained design tree}
\rightarrow
\text{GHS candidate selection}
\rightarrow
\text{MPC evaluation}
\rightarrow
\text{best morphology + gait}.
\]

## 2. Robot Structure as a Graph

A robot is represented as a directed acyclic graph. Nodes correspond to physically realizable components or temporary grammar symbols. Edges express component connectivity.

The grammar assumes an arthropod-like organization: a sequence of body segments, optional head and tail, and limb pairs attached to body segments. Legs are bilaterally symmetric. One graph branch represents both members of a leg pair, compressing repetition and simplifying production rules. Head and tail appendages may be asymmetric.

Once derivation finishes, the robot graph is expanded into a kinematic tree for simulation. A node may produce multiple physical components because a single grammar branch can encode a symmetric pair. Tree structure supports efficient articulated-body dynamics.

This representation builds a strong inductive bias into the design language. It guarantees a meaningful root-to-limb hierarchy and generates animal-like robots efficiently. It also excludes robots that cannot be expressed through that hierarchy.

## 3. The Recursive Graph Grammar

The grammar is defined as

\[
\mathcal G=(N,T,A,R,S),
\]

where:

- \(N\) contains non-terminal symbols used during construction;
- \(T\) contains terminal symbols corresponding to physical components;
- \(A\) stores component attributes such as joint angle and rotation range;
- \(R\) is the set of production rules;
- \(S\) is the start symbol.

A rule has the form

\[
Q\rightarrow W,
\]

with \(Q\in N\) and \(W\) a replacement subgraph. A graph containing non-terminals is a **partial design**. A graph containing only terminal symbols is a **complete design** that can be converted to a physical simulation model.

Rules fall into two categories.

### Structural Rules

Structural rules create body and limb topology. They initialize and extend the torso, attach symmetric limb pairs, add limb segments, or leave a body segment without legs. Recursion lets a compact rule set generate robots with many body segments and appendages.

### Component Rules

Component rules replace abstract symbols with specific body links, limb links, rigid joints, roll joints, twist joints, knees, elbows, connectors, mounts, or wheels. Joint terminals carry attributes such as initial angle \(\theta_i\) and allowed rotation range \(\theta_r\).

The experiment caps derivations at 40 rule applications. Without that bound, recursive rules allow an unbounded number of segments. Increasing the cap expands morphological complexity and search cost together.

## 4. How Grammar Encodes Fabricability

Unconstrained graph mutation produces many disconnected, self-intersecting, or mechanically meaningless structures. RoboGrammar moves feasibility upstream into the generative language:

- terminal nodes correspond to available physical parts;
- production rules specify legal connections;
- symmetric legs are created as matched pairs;
- each body segment receives at most one leg pair;
- completed robots convert to kinematic trees;
- initial self-collisions are detected and rejected before evaluation.

“Fabricable” here means that the simulated configuration can be assembled from the allowed components with valid connectivity. It does not guarantee actuator wiring, structural strength, collision-free motion over a full trajectory, manufacturing tolerance, or sim-to-real agreement.

The important methodological point is that the grammar converts hard constraints into syntax. Search spends its evaluations inside a design language already shaped by engineering knowledge.

## 5. Simulation and Control with MPPI

Completed robots are simulated as articulated rigid bodies using Featherstone-style recursive dynamics in Bullet Physics. The simulation includes terrain contact, self-collision, position-controlled joints, and velocity-controlled wheels. Joint torque is limited to 1 Nm.

For each morphology, RoboGrammar uses a sampling-based MPC method based on **Model Predictive Path Integral control (MPPI)**. It maintains an action horizon

\[
U=[u_0,u_1,\dots,u_{H-1}]
\]

and samples \(K\) perturbed candidates \(U_k\). Each candidate is rolled out in a separate simulator. Returns \(r_k\) produce exponential weights

\[
w_k=\exp\bigl(\kappa(r_k-\max_l r_l)\bigr),
\]

and the horizon is updated by the weighted average

\[
U
\leftarrow
\frac{\sum_{k=1}^{K}w_kU_k}
{\sum_{k=1}^{K}w_k}.
\]

The first command is committed, the window shifts, and the procedure repeats. The paper uses 64 samples, a default horizon of 16 control intervals, and a simulation timestep of \(1/240\) s.

## 6. Sampling for Periodic but Reactive Gaits

Half of MPPI's samples are **warm-start samples** centered on the previously optimized action sequence shifted forward. They preserve local continuity.

The other half are **history samples**. Their mean repeats a recent block of control inputs, explicitly biasing search toward periodic gait structure. The repeated history length varies from half to all of the MPC horizon.

This mixture captures two locomotion needs. Periodicity makes walking efficient, while receding-horizon replanning lets the controller respond to steps, gaps, and walls. The upward-step example begins with a cyclic trot and switches to an ad hoc motion for higher steps.

The same sampling bias also limits the result. Highly dynamic or deliberately aperiodic gaits are unlikely to be discovered, especially under low motor torque and high damping.

## 7. Terrain-Conditioned Reward

The same reward is used across terrains:

\[
r(t)
=
\mathbf w_x\cdot\mathbf d_x(t)
+
\mathbf w_y\cdot\mathbf d_y(t)
+
\mathbf w_v\cdot\mathbf v(t).
\]

Here, \(\mathbf d_x\) and \(\mathbf d_y\) are the robot base's forward and upward axes in world coordinates, and \(\mathbf v\) is base velocity. The first two terms reward preservation of the initial orientation; the last rewards forward progress. Terrain changes the dynamics and feasible path while the objective stays fixed.

The six terrains are:

- **Flat:** high-friction, obstacle-free ground.
- **Frozen lake:** a low-friction surface with coefficient 0.05.
- **Ridged:** repeated hurdles that reward climbing or jumping.
- **Wall:** a slalom of tall barriers that requires fast turning.
- **Gap:** platforms separated by increasingly wide gaps.
- **Upward stepped:** stairs with varying heights.

Because reward is held constant, morphology differences can be attributed to terrain demands instead of task-specific scoring changes.

## 8. Graph Heuristic Search: The Key Algorithm

Grammar restricts the language of designs, but the derivation tree remains too large for exhaustive search. GHS learns a value function on partial robot graphs:

\[
V_\theta(g)
\approx
\max_{d\in\operatorname{Complete}(g)}J(d),
\]

where \(\operatorname{Complete}(g)\) contains all completed robots reachable from partial design \(g\). The heuristic estimates the best performance hidden below a branch, not the immediate quality of an unfinished body.

GHS interleaves three phases.

### 8.1 Design Phase

Starting from \(S\), rules are applied until a complete robot appears. At each partial graph \(s_l\), an \(\epsilon\)-greedy decision either picks a random valid rule or selects

\[
a_{l+1}
=
\arg\max_a
V_\theta(P(s_l,a)),
\]

where \(P(s,a)\) applies rule \(a\). Sixteen complete candidates are sampled in each iteration. A second \(\epsilon\)-greedy decision chooses which one receives the expensive MPC evaluation.

The exploration rate decays from 1.0 to 0.1. Early search collects diverse graphs while the heuristic is inaccurate; later search exploits its predictions.

### 8.2 Evaluation Phase

Only one candidate per iteration is evaluated. MPPI supplies its gait and average reward. Because MPC is stochastic, a design's stored score is the best reward observed across repeated evaluations.

Every partial ancestor on the chosen derivation path receives a target equal to the maximum reward of any completed descendant seen so far:

\[
\widehat V(g)
\leftarrow
\max\bigl(\widehat V(g),r_{\text{descendant}}\bigr).
\]

### 8.3 Learning Phase

The heuristic minimizes

\[
\mathcal L(\theta)
=
\sum_{g\in\mathcal B}
\left\|
V_\theta(g)-\widehat V(g)
\right\|_2^2
\]

over minibatches of partial and complete graphs. The paper runs 25 Adam steps after each design evaluation.

## 9. Why a GNN Is the Natural Heuristic

Partial robots vary in size and topology, making fixed-size MLP inputs awkward. RoboGrammar uses a DiffPool-style graph neural network. Node features encode component geometry, initial transform, joint rotation and servo properties, or one-hot non-terminal identity.

GraphSAGE layers aggregate local structure; DiffPool hierarchically reduces graph cardinality; final pooling produces a scalar performance estimate. The architecture is invariant to node ordering, so isomorphic robot graphs receive the same prediction without explicit permutation handling.

The correspondence between representation and model is strong: grammar builds a robot hierarchically, and DiffPool learns hierarchical graph summaries. The GNN can also evaluate incomplete graphs containing non-terminals, which is essential for branch prioritization.

## 10. Comparison with MCTS and Random Search

The paper implements two baselines.

**Random search** repeatedly samples valid rule sequences and evaluates the resulting robot.

**MCTS** represents partial designs as search-tree nodes, selects edges with a UCT criterion, randomly completes a selected partial design, evaluates it with MPC, and backs up visit counts and maximum reward. The implementation handles transpositions, uses UCT-RAVE, and blocks partial designs after repeated failures to sample a simulable completion.

On flat, frozen-lake, ridged, and wall terrains, GHS consistently finds higher-reward robots. GHS uses **2,000 iterations**, while MCTS and random search receive **5,000**. This matters because each MPC evaluation takes roughly 40–60 seconds and dominates runtime.

A 2,000-iteration GHS run takes about 31 hours on a 32-core Google Cloud instance; approximately 20 hours are evaluation. The learned heuristic earns its value by reducing how many completed robots need this expensive test.

## 11. Terrain Produces Specialized Bodies

The optimized morphologies reveal how environment shapes mechanical strategy.

On **flat terrain**, successful robots often have short legs spaced far apart. Low limb inertia supports fast cycling, and obstacle clearance is unnecessary.

On **frozen lake**, compact, highly articulated arms maintain ground contact while part of the body slides. The body exploits low friction instead of merely fighting it.

On **ridged terrain**, long limbs swing upward to clear obstacles. Quadrupeds dominate, with some tripedal solutions using the body as a third contact.

On **gap terrain**, long limbs are oriented for forward reach. Joints that produce horizontal motion become more common than those emphasizing vertical lift.

On **wall terrain**, a long articulated body supports sharp turns around barriers. MPC pairs morphology with an exaggerated turning gait.

These are co-design results: the terrain selects a body, and MPPI discovers how to use that body.

## 12. Multi-Terrain Design and Pareto Structure

RoboGrammar also evaluates 20,000 randomly sampled designs on combinations of flat, ridged, and wall terrains. Pareto fronts contain multiple morphologies with different trade-offs. No single body dominates every terrain pair.

This result has two implications. First, the grammar is expressive enough to generate diverse high-performing strategies. Second, “optimal robot” is incomplete without specifying the deployment distribution. A specialized body may win on one terrain while a more moderate morphology offers better multi-terrain robustness.

The paper uses random search for Pareto analysis to avoid steering samples toward one objective. The experiment studies the design language's coverage separately from GHS's single-objective search bias.

## 13. Search Bias and Grammar Bias

Every layer introduces a prior:

- The grammar favors symmetric arthropod-like bodies.
- The 40-step derivation cap limits complexity.
- GHS focuses on branches that resemble previously successful graphs.
- MCTS prefers shallower derivations because it expands the tree locally.
- MPPI favors stable, approximately periodic motion.
- The reward favors forward velocity and upright orientation.

These biases make the problem tractable. They also determine what cannot emerge. The paper's design-length analysis shows the effect directly: among the best 100 flat-terrain designs, GHS averages 25.0 derivation steps, MCTS 20.9, and random search 23.4.

Automated design is therefore never prior-free. RoboGrammar's contribution is to make several useful priors explicit and programmable.

## 14. Strengths and Limitations

**Strengths.** RoboGrammar joins a meaningful design language, efficient learned search, dynamics simulation, and controller synthesis in one end-to-end system. The grammar prevents many invalid candidates before evaluation and can be edited when component inventory changes. GHS learns from both complete and partial graphs and substantially improves sample efficiency. Terrain-specific and Pareto results demonstrate genuine morphological diversity.

**Limitations.** The demonstrated grammar covers bilaterally symmetric, arthropod-inspired rigid robots. New domains require expert-authored rules. Link dimensions and other continuous design variables are fixed; attribute grammars or post-optimization would be needed to tune them. The control scheme is biased toward stable periodic locomotion and may miss dynamic gaits.

Physical fabricability is asserted at the component-and-connectivity level. The paper does not build the generated robots or address sim-to-real calibration, actuator wiring, structural load, power, sensing, or manufacturing tolerance. Search remains expensive even with GHS, and the learned heuristic is not admissible, so it offers no guarantee of finding a global optimum.

## 15. My Takeaway

RoboGrammar's deepest idea is to treat robot design as **program synthesis over a mechanical language**. A morphology is a derivation, a partial morphology is a program prefix, and GHS learns which prefixes are worth completing. MPC supplies the expensive execution test.

This decomposition remains relevant beyond the specific 2020 system. Modern extensions could learn the grammar itself, use graph foundation models as heuristics, amortize controller learning across designs, optimize discrete topology together with continuous dimensions, or add fabrication and sim-to-real constraints to the syntax.

The paper also offers a useful lesson about automation: creativity and constraints are compatible. The grammar removes nonsensical regions of design space, which gives the search enough efficiency to discover morphology that still looks surprising. Good generative design starts by choosing a language in which useful novelty is easy to express.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**RoboGrammar** 面向给定 terrain 自动设计 rigid robot。完整 pipeline 分为三层：recursive **graph grammar** 根据已有 components 生成 structurally valid morphologies；**model predictive control（MPC）** 为每个 complete design 搜索 locomotion controller；**Graph Heuristic Search（GHS）** 学习哪些 partial grammar derivations 更可能通向 high-performing robot。

Graph grammar 是具有工程约束的 design language。它排除了大量 nonsensical design space，强制 bilateral limb symmetry 和 valid component connectivity，并把每个 robot 表示成一串 production-rule applications。GHS 则为 incomplete design 估值。GNN 预测每个 partial graph 可达到的 best reward，使 search 可以在支付昂贵的 dynamics-and-MPC evaluation 之前，优先探索 promising branches。

在 flat ground、low-friction ice、ridges、gaps、stairs 和 wall obstacles 上，系统产生不同 bodies：适合高速运动的 short low-inertia legs、跨越 gap 的 long reaching legs、适应冰面的 articulated arms，以及用于转向的 flexible body。GHS 只用 2,000 evaluations 就找到比 MCTS 和 random search 在 5,000 evaluations 下更强的 designs。局限同样重要：grammar 编码了人类设计的 arthropod prior，controller 偏好 stable periodic gait，continuous dimensions 固定，而且 fabricability 只在 component layout 层面检查，没有 physical deployment。

## 论文信息

论文标题是 **“RoboGrammar: Graph Grammar for Terrain-Optimized Robot Design”**，作者为 **Allan Zhao、Jie Xu、Mina Konaković-Luković、Josephine Hughes、Andrew Spielberg、Daniela Rus 和 Wojciech Matusik**，来自 **MIT**。论文发表于 **ACM Transactions on Graphics 39(6)，SIGGRAPH Asia 2020 Proceedings**。

- 项目主页：[people.csail.mit.edu/jiex/papers/robogrammar](https://people.csail.mit.edu/jiex/papers/robogrammar/)
- 论文：[robogrammar.pdf](https://cdfg.csail.mit.edu/assets/files/robogrammar.pdf)
- 代码：[github.com/allanzhao/RoboGrammar](https://github.com/allanzhao/RoboGrammar)

## 1. Design Problem

RoboGrammar 接收：

- body links、limb links、joints、connectors 和 wheels 等 physical primitive library；
- 一个或多个 terrains；
- locomotion reward。

系统返回针对这些条件优化的 robot morphology 与 controller。概念上：

\[
(G^\star,U^\star)
=
\arg\max_{G\in\mathcal L(\mathcal G),\,U}
J(G,U;\mathcal T),
\]

其中 \(\mathcal G\) 是 graph grammar，\(\mathcal L(\mathcal G)\) 是它可以生成的 complete robot graphs，\(U\) 是 control sequence，\(\mathcal T\) 是 terrain。

难点来自两层嵌套的 combinatorial problem。一小段 grammar rules 就能分支出数十万种 bodies。每个 complete body 又必须先获得 good controller，才能公平评价其 morphology。绝大多数 computation 都用于 control synthesis 和 simulation，因此 search efficiency 比快速生成 candidates 更重要。

RoboGrammar 把这一过程组织为：

\[
\text{components + terrain}
\rightarrow
\text{grammar-constrained design tree}
\rightarrow
\text{GHS candidate selection}
\rightarrow
\text{MPC evaluation}
\rightarrow
\text{best morphology + gait}.
\]

## 2. 用 Graph 表示 Robot Structure

Robot 被表示为 directed acyclic graph。Nodes 对应 physically realizable components 或临时 grammar symbols，edges 表示 component connectivity。

Grammar 假设 arthropod-like organization：一串 body segments、optional head/tail，以及连接到 body segments 上的 limb pairs。Legs 保持 bilateral symmetry。一个 graph branch 同时表示一对 legs，从而压缩 repetition，并简化 production rules。Head 和 tail appendages 可以 asymmetric。

Derivation 完成后，robot graph 被展开成用于 simulation 的 kinematic tree。一个 node 可能产生多个 physical components，因为单个 grammar branch 可以编码 symmetric pair。Tree structure 也支持 efficient articulated-body dynamics。

这个 representation 给 design language 加入了强 inductive bias。它保证有意义的 root-to-limb hierarchy，并能高效生成 animal-like robot；同时也排除了无法通过该 hierarchy 表达的 robot。

## 3. Recursive Graph Grammar

Grammar 定义为：

\[
\mathcal G=(N,T,A,R,S),
\]

其中：

- \(N\) 包含 construction 过程中使用的 non-terminal symbols；
- \(T\) 包含对应 physical components 的 terminal symbols；
- \(A\) 保存 joint angle 和 rotation range 等 component attributes；
- \(R\) 是 production rules；
- \(S\) 是 start symbol。

每条 rule 写为：

\[
Q\rightarrow W,
\]

其中 \(Q\in N\)，\(W\) 是 replacement subgraph。包含 non-terminals 的 graph 是 **partial design**，只包含 terminal symbols 的 graph 是 **complete design**，可以被转换成 physical simulation model。

Rules 分成两类。

### Structural Rules

Structural rules 创建 body 与 limb topology。它们初始化和延伸 torso、添加 symmetric limb pairs、增加 limb segments，或让某个 body segment 不连接 legs。Recursion 使 compact rule set 可以生成具有大量 body segments 和 appendages 的 robots。

### Component Rules

Component rules 把 abstract symbols 替换成具体 body links、limb links、rigid joints、roll joints、twist joints、knees、elbows、connectors、mounts 或 wheels。Joint terminal 携带 initial angle \(\theta_i\) 和 allowed rotation range \(\theta_r\) 等 attributes。

实验把 derivation 限制在最多 40 次 rule applications。没有这个 bound，recursive rules 可以产生无限数量的 segments。提高 cap 会同时增加 morphological complexity 与 search cost。

## 4. Grammar 如何编码 Fabricability

Unconstrained graph mutation 会产生大量 disconnected、self-intersecting 或 mechanically meaningless structures。RoboGrammar 把 feasibility 提前写入 generative language：

- terminal nodes 对应 available physical parts；
- production rules 规定 legal connections；
- symmetric legs 以 matched pairs 生成；
- 每个 body segment 最多接一对 legs；
- completed robot 可转换成 kinematic tree；
- initial self-collision 在 evaluation 前检测并拒绝。

这里的 “fabricable” 表示 simulated configuration 可以由 allowed components 按 valid connectivity 组装。它不保证 actuator wiring、structural strength、完整 trajectory 上 collision-free motion、manufacturing tolerance 或 sim-to-real agreement。

方法上的关键点是：grammar 把 hard constraints 转换成 syntax。Search 的 evaluation budget 被集中在已经受到 engineering knowledge 约束的 design language 内。

## 5. 使用 MPPI 的 Simulation 与 Control

Complete robot 在 Bullet Physics 中用 Featherstone-style recursive dynamics 模拟为 articulated rigid body。Simulation 包括 terrain contact、self-collision、position-controlled joints 和 velocity-controlled wheels。Joint torque 限制为 1 Nm。

对于每种 morphology，RoboGrammar 使用基于 **Model Predictive Path Integral control（MPPI）** 的 sampling-based MPC。它维护 action horizon：

\[
U=[u_0,u_1,\dots,u_{H-1}],
\]

然后采样 \(K\) 个 perturbed candidates \(U_k\)。每个 candidate 都在独立 simulator 中 rollout。Returns \(r_k\) 转换为 exponential weights：

\[
w_k=\exp\bigl(\kappa(r_k-\max_l r_l)\bigr),
\]

horizon 再通过 weighted average 更新：

\[
U
\leftarrow
\frac{\sum_{k=1}^{K}w_kU_k}
{\sum_{k=1}^{K}w_k}.
\]

第一个 command 被提交，window 向前移动，再重复整个过程。论文使用 64 个 samples、默认 16 个 control intervals 的 horizon，以及 \(1/240\) s 的 simulation timestep。

## 6. 为 Periodic 且 Reactive 的 Gait 设计 Sampling

MPPI 的一半 samples 是 **warm-start samples**，以向前移动后的 previous optimized action sequence 为中心，用于保持 local continuity。

另一半是 **history samples**。它们的 mean 会重复最近的一段 control inputs，明确让 search 偏向 periodic gait structure。Repeated history length 在 MPC horizon 的一半到完整 horizon 之间变化。

这种 mixture 同时满足 locomotion 的两个需求。Periodicity 提升 walking efficiency，receding-horizon replanning 则允许 controller 对 steps、gaps 和 walls 作出反应。Upward-step example 会先使用 cyclic trot，再针对更高台阶切换到 ad hoc motion。

同一个 sampling bias 也限制了结果。Highly dynamic 或刻意 aperiodic gait 很难被发现，尤其是在 motor torque 较低、damping 较高的 setting 中。

## 7. Terrain-Conditioned Reward

所有 terrains 使用同一个 reward：

\[
r(t)
=
\mathbf w_x\cdot\mathbf d_x(t)
+
\mathbf w_y\cdot\mathbf d_y(t)
+
\mathbf w_v\cdot\mathbf v(t).
\]

其中 \(\mathbf d_x\) 和 \(\mathbf d_y\) 是 robot base 的 forward/upward axes 在 world coordinates 中的表示，\(\mathbf v\) 是 base velocity。前两项奖励保持 initial orientation，最后一项奖励 forward progress。Terrain 改变 dynamics 与 feasible path，objective 则保持一致。

六种 terrains 为：

- **Flat：**high-friction、没有 obstacle 的 ground。
- **Frozen lake：**friction coefficient 为 0.05 的 low-friction surface。
- **Ridged：**反复出现的 hurdles，鼓励 climbing 或 jumping。
- **Wall：**由 tall barriers 组成的 slalom，需要快速转向。
- **Gap：**由越来越宽 gaps 分隔的平台。
- **Upward stepped：**step height 不同的楼梯。

由于 reward 保持不变，morphology differences 可以归因于 terrain demands，而非 task-specific scoring change。

## 8. Graph Heuristic Search：核心算法

Grammar 限制了 design language，但 derivation tree 仍然太大，无法 exhaustive search。GHS 在 partial robot graphs 上学习 value function：

\[
V_\theta(g)
\approx
\max_{d\in\operatorname{Complete}(g)}J(d),
\]

其中 \(\operatorname{Complete}(g)\) 包含所有可从 partial design \(g\) 得到的 completed robots。Heuristic 估计的是某个 branch 下隐藏的 best performance，而非 unfinished body 的 immediate quality。

GHS 交替执行三个 phases。

### 8.1 Design Phase

从 \(S\) 开始持续应用 rules，直到出现 complete robot。在每个 partial graph \(s_l\) 上，\(\epsilon\)-greedy decision 随机选择 valid rule，或者选择：

\[
a_{l+1}
=
\arg\max_a
V_\theta(P(s_l,a)),
\]

其中 \(P(s,a)\) 表示应用 rule \(a\)。每次 iteration 采样 16 个 complete candidates，再通过第二个 \(\epsilon\)-greedy decision 选择一个执行昂贵 MPC evaluation。

Exploration rate 从 1.0 下降到 0.1。训练早期 heuristic 不准确，需要收集 diverse graphs；后期则更多利用已有 prediction。

### 8.2 Evaluation Phase

每次 iteration 只评价一个 candidate。MPPI 提供 gait 和 average reward。由于 MPC 带随机性，同一个 design 可能被多次提出，stored score 取历次 evaluations 中的 best reward。

Chosen derivation path 上的每个 partial ancestor 都获得一个 target，等于目前看到的所有 completed descendants 中的 maximum reward：

\[
\widehat V(g)
\leftarrow
\max\bigl(\widehat V(g),r_{\text{descendant}}\bigr).
\]

### 8.3 Learning Phase

Heuristic 在 partial 与 complete graphs 组成的 minibatches 上最小化：

\[
\mathcal L(\theta)
=
\sum_{g\in\mathcal B}
\left\|
V_\theta(g)-\widehat V(g)
\right\|_2^2.
\]

论文在每次 design evaluation 后运行 25 个 Adam steps。

## 9. 为什么 GNN 是自然的 Heuristic

Partial robots 的 size 和 topology 不同，fixed-size MLP input 很难直接适配。RoboGrammar 使用 DiffPool-style graph neural network。Node features 编码 component geometry、initial transform、joint rotation 和 servo properties；对于 non-terminal 则使用 one-hot identity。

GraphSAGE layers 聚合 local structure，DiffPool 逐层缩小 graph cardinality，final pooling 输出 scalar performance estimate。该 architecture 对 node ordering 不敏感，因此 isomorphic robot graphs 无需显式 permutation handling，就能获得同样 prediction。

Representation 与 model 的对应关系很自然：grammar 以 hierarchical substitution 构造 robot，DiffPool 则学习 hierarchical graph summary。GNN 还可以评价包含 non-terminals 的 incomplete graph，这是 branch prioritization 的必要条件。

## 10. 与 MCTS 和 Random Search 比较

论文实现了两个 baselines。

**Random search** 反复采样 valid rule sequence，再评估生成的 robot。

**MCTS** 用 search-tree nodes 表示 partial designs，通过 UCT criterion 选择 edge，随机补全 selected partial design，用 MPC evaluation，再回传 visit counts 和 maximum reward。实现还处理 transpositions、使用 UCT-RAVE，并在多次无法获得 simulable completion 后阻塞该 partial design。

在 flat、frozen-lake、ridged 和 wall terrains 上，GHS 一致找到更高 reward 的 robots。GHS 使用 **2,000 iterations**，MCTS 和 random search 则得到 **5,000**。这个差异很关键，因为每次 MPC evaluation 大约需要 40–60 秒，是 runtime 的主要部分。

在 32-core Google Cloud instance 上，一次 2,000-iteration GHS run 大约需要 31 小时，其中约 20 小时用于 evaluation。Learned heuristic 的价值来自减少需要接受昂贵测试的 completed robots 数量。

## 11. Terrain 产生 Specialized Bodies

Optimized morphologies 展示了 environment 如何塑造 mechanical strategy。

在 **flat terrain** 上，成功 robots 经常使用间隔较大的 short legs。Low limb inertia 有利于快速循环，而且这里不需要 obstacle clearance。

在 **frozen lake** 上，compact、highly articulated arms 持续保持 ground contact，body 的一部分则自由滑动。Robot 把 low friction 转换成运动优势。

在 **ridged terrain** 上，long limbs 向上摆动以越过 obstacles。Quadrupeds 占多数，也出现了以 body 作为第三个 contact point 的 tripedal solutions。

在 **gap terrain** 上，long limbs 更偏向 forward reach。产生 horizontal motion 的 joints 比强调 vertical lift 的 joints 更常见。

在 **wall terrain** 上，long articulated body 支持在 barriers 之间急转弯，MPC 为该 morphology 配合 exaggerated turning gait。

这些都是 co-design results：terrain 选择 body，MPPI 再发现如何使用该 body。

## 12. Multi-Terrain Design 与 Pareto Structure

RoboGrammar 还在 flat、ridged 和 wall terrains 的组合上评价了 20,000 个 randomly sampled designs。Pareto fronts 中包含多种 morphology，代表不同 trade-offs，没有单个 body 能支配每一组 terrain pair。

这个结果有两个含义。第一，grammar 足够 expressive，可以生成 diverse high-performing strategies。第二，“optimal robot” 必须先指定 deployment distribution。Specialized body 可以在单个 terrain 上获胜，而较温和的 morphology 可能提供更好的 multi-terrain robustness。

Pareto analysis 使用 random search，以避免 samples 被引导到某个单一 objective。这个 experiment 把 design language coverage 与 GHS 的 single-objective search bias 分开研究。

## 13. Search Bias 与 Grammar Bias

每一层都会引入 prior：

- Grammar 偏好 symmetric arthropod-like bodies。
- 40-step derivation cap 限制 complexity。
- GHS 聚焦与已有成功 graphs 相似的 branches。
- MCTS 因为 local tree expansion 更偏好 shallow derivations。
- MPPI 偏好 stable、approximately periodic motion。
- Reward 偏好 forward velocity 与 upright orientation。

这些 biases 让问题变得 tractable，也决定了什么无法 emerge。论文的 design-length analysis 直接展示了结果：在 flat-terrain best 100 designs 中，GHS 的平均 derivation steps 是 25.0，MCTS 是 20.9，random search 是 23.4。

Automated design 从来不会 prior-free。RoboGrammar 的贡献是把多种有用 prior 变成显式且可编程的结构。

## 14. 优势与局限

**优势。** RoboGrammar 把 meaningful design language、efficient learned search、dynamics simulation 和 controller synthesis 组合成一个 end-to-end system。Grammar 在 evaluation 前排除许多 invalid candidates，也可以在 component inventory 改变时编辑。GHS 同时从 complete 与 partial graphs 学习，显著提高 sample efficiency。Terrain-specific 与 Pareto results 展示了真正的 morphological diversity。

**局限。** 论文展示的 grammar 只覆盖 bilaterally symmetric、arthropod-inspired rigid robots。新领域需要专家编写 rules。Link dimensions 等 continuous design variables 固定，需要 attribute grammar 或 post-optimization 才能调节。Control scheme 偏向 stable periodic locomotion，可能错过 dynamic gait。

Physical fabricability 只在 component-and-connectivity 层面成立。论文没有制造 generated robots，也没有处理 sim-to-real calibration、actuator wiring、structural load、power、sensing 或 manufacturing tolerance。即使使用 GHS，search 仍然昂贵；learned heuristic 也不是 admissible heuristic，因此无法保证 global optimum。

## 15. 我的理解

RoboGrammar 最深层的想法是把 robot design 看成 **mechanical language 上的 program synthesis**。Morphology 是 derivation，partial morphology 是 program prefix，GHS 学习哪些 prefixes 值得完成，MPC 则提供昂贵的 execution test。

这种 decomposition 在今天仍然很有意义。现代扩展可以学习 grammar 本身，用 graph foundation model 作为 heuristic，在 designs 之间 amortize controller learning，同时优化 discrete topology 和 continuous dimensions，或把 fabrication 与 sim-to-real constraints 直接加入 syntax。

论文还给出了一条关于 automation 的重要经验：creativity 与 constraints 可以共存。Grammar 删除 nonsensical design space，使 search 有足够效率发现仍然令人意外的 morphology。好的 generative design 首先要选择一种让 useful novelty 容易表达的语言。

</div>
