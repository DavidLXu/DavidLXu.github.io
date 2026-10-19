---
title: "[Paper Notes] Draft: A Parametric Tool for Robot Design Exploration"
date: 2026-10-19
permalink: /posts/2026/10/draft-paper-notes/
tags:
  - Robot Design
  - Morphology
  - Co-Design
  - MuJoCo
  - Reinforcement Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Changing a robot's leg length also changes its geometry, mass distribution, inertia, and actuator requirements. **Draft** makes those dependencies explicit: a parameter file, an expression-based kinematic tree, and a root-body mesh specification compile into a simulation-ready MuJoCo MJCF model. Fits to real actuators and robot descriptions supply plausible physical parameters. Engineers can then train controllers and compare designs before investing in detailed CAD.

“Automatic robot skeleton generation” is a useful starting description. More precisely, Draft generates a physical model from a supplied body specification and evaluates its capabilities. The designer still chooses the topology and the next design to try; an outer design optimizer is future work.

## Paper and sources

**Draft: A Parametric Tool for Robot Design Exploration**, by **David Nguyen, Marcelo Coelho, and Sangbae Kim**, MIT. These notes follow the September 29, 2026 preprint, [arXiv:2609.38405v1](https://arxiv.org/abs/2609.38405v1), and its [eight-page PDF](https://arxiv.org/pdf/2609.38405v1). The authors provide [official code and datasets](https://github.com/davidhnguyen2000/draft) and a [supplementary video](https://youtu.be/egzlEqfwwLU). Results below are author-reported; the practical interpretation at the end is my reading of the work.

## 1. How a skeleton becomes a simulation model

The parameter file supplies quantities such as link lengths, densities, and motor classes. Fields in the kinematic tree contain arithmetic expressions referencing those parameters. A link radius can therefore depend on its motor's dimensions, and a torso mesh can change with shoulder width. Editing one parameter propagates through the dependent visual, collision, inertial, and actuation properties.

The generator assembles four primitives. A **basic link** is a structural cylinder with the motor for the child joint at its distal end. A **sphere link** ends a chain with a contact point; a **foot link** supplies a support surface. The **root link** is a closed mesh lofted from cross-section polygons and planes. These primitives share a compiler across humanoid and quadruped specifications. Fixed joints also allow combined modules to place a knee actuator near the hip. Parallel mechanisms are outside the current link library.

MuJoCo's `inertiafromgeom` computes primitive-link inertias from geometry and density; `trimesh` supplies root-mesh inertial properties. MJCF directly represents gear ratios and joint armature, which makes the actuator model part of the generated dynamics. The paper reports compilation to validated MJCF in **50 ms for a 12-joint quadruped** and **202 ms for a 29-joint humanoid** on a laptop CPU. These are model-generation times; controller training is a separate cost.

## 2. Torque and speed determine the rest of the actuator

A simulator will accept physically implausible combinations of torque, mass, and size unless the generator constrains them. Draft surveys **114 integrated actuator modules**, including motor, transmission, bearings, and housing. Its catalog contains 33 quasi-direct-drive, 33 MidGear, and 48 high-reduction modules. The fitted relationships make actuator choices carry their physical costs.

The inputs are peak output torque $\tau$, no-load output speed $\omega_{\mathrm{NL}}$, and aspect ratio $a=\ell/(2r)$. Table I gives the following relationships, using SI quantities: torque in N·m, speed in rad/s, mass in kg, volume in m³, dimensions in m, and inertia in kg·m².

$$
\begin{aligned}
N &= 327\,\omega_{\mathrm{NL}}^{-1.066},\\
m &= 0.0653\,\tau^{0.666},\\
V &= \frac{\tau^{0.700}N^{-0.167}}{23948},\\
r &= \left(\frac{V}{2\pi a}\right)^{1/3},\qquad \ell=2ar,\\
J &= 27.2\,r^4,\qquad J_{\mathrm{armature}}=N^2J.
\end{aligned}
$$

Here $N$ is reduction ratio and $J$ is rotor inertia. These are empirical fits with unit-dependent coefficients. Most rows use 103 geared modules; the rotor-inertia fit uses the 88 entries that publish that quantity. The full 114-entry survey is larger than either fitting subset.

The last expression matters for control. A high gear ratio increases the rotor inertia reflected at the joint quadratically. Choosing a slow, highly geared actuator therefore changes joint dynamics as well as the available torque and speed. During learning, a DC-motor model enforces a linear torque–speed curve. PD gains follow the hand-tuned scaling $k_p=1.43\tau_{\mathrm{peak}}$ and $k_d=0.071\tau_{\mathrm{peak}}$.

Leave-one-out geometric mean fold errors are **1.28× for mass**, **1.33× for reduction**, **1.30× for volume**, and **1.56× for rotor inertia**. The inertia estimate is the loosest: housing radius is only a proxy for rotor radius. These relations provide a baseline for integrated commercial modules; custom actuator designs can fall outside it.

## 3. Structural mass is fitted separately

The authors inspect 118 published robot descriptions and retain **29 humanoids and 20 quadrupeds**, totaling 1,037 segments. To estimate structural mass, they subtract an estimated actuator mass from each link, then fit

$$
m_{\mathrm{structure}}=cL^e
$$

by segment class and body type, with $e\geq0$. This separation avoids counting the motor twice. It also exposes an assumption: the correct link must be assigned each actuator's mass. Negative residual masses are excluded. Material choices and errors in actuator-mass estimation contribute additional variation.

Humanoid and quadruped limbs receive separate fits. For example, Table II gives thigh exponents of 1.36 and 2.69 respectively. Torsos use volumetric density: 716 kg/m³ for humanoids and 654 kg/m³ for quadrupeds. Held-out whole-robot mass errors are 1.22× and 1.18×; Table II's individual segment errors are **in-sample** errors and should be read separately.

A design filter rejects actuators outside catalog/transmission-family extremes and warns about unusual aspect ratios, structural densities, and actuator mass fractions. Passing this filter establishes consistency with the surveyed range. Detailed mechanical engineering remains necessary to turn the model into hardware.

## 4. What the validation establishes

Draft rebuilds Unitree G1, H2, Go2, and B2 using vendor geometry and joint capabilities while deriving mass, density, inertia, and armature. Generated total masses are **111%, 91%, 101%, and 84%** of the reference masses, giving a geometric mean fold error of **1.10×** across these four robots.

The dynamics comparison is less close. Across 300 configurations, Go2 has median joint-space mass-matrix error of **12.8%** and gravity-vector error of **21.4%**. Humanoid errors are larger, partly because some joint axes are misaligned; holding those axes fixed reduces the discrepancy. Rotor armature is disabled in this comparison because only G1 publishes per-joint armature. Thus the experiment does not validate every generated actuator-inertia term.

The locomotion study generates three quadrupeds and trains each with PPO in `mjlab`, using ten independent seeds. Stage one learns velocity tracking on mildly uneven ground with occasional pushes. Stage two branches into three policies, progressively increasing commanded speed, terrain height, or push magnitude. Rewards scale with leg length using Froude similarity: for $s=L/(0.48\,\mathrm m)$, lengths scale with $s$, while characteristic speed and time scale with $\sqrt{s}$.

| Design | Mass | Leg length | Peak speed | Step height | Recoverable velocity kick |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cheetah, QDD 6:1 | 33 kg | 0.48 m | 3.63 m/s | 0.12 m | 7.9 m/s |
| Bear, MidGear 20:1 | 110 kg | 0.74 m | 4.33 m/s | 0.12 m | 8.6 m/s |
| Giraffe, high reduction 80:1 | 91 kg | 1.30 m | 2.17 m/s | 0.20 m | 5.3 m/s |

These are Table V medians over ten seeds, each based on 256 rollouts. “Kick” is an imposed velocity change, not a force. Bear leads absolute speed and kick recovery; Giraffe clears the tallest step. After normalizing speed and kicks by $\sqrt{gL}$ and step height by $L$, Cheetah leads those relative measures. The choice of metric changes which design looks preferable.

The paper also reports drivetrain efficiency from mechanical output and modeled copper loss. This metric excludes a full accounting of battery and auxiliary power. Post-training link-mass perturbations modeled on Go2/B2 reconstruction residuals preserve the reported capability trends without retraining.

## 5. Where I would use Draft

I would use Draft to narrow early choices about proportions, actuator classes, and motor placement before detailed CAD. Its most useful feature is the coupling between decisions: increasing a torque requirement brings corresponding mass, geometry, and inertia changes into the controller experiment. That makes comparisons more informative than changing a torque limit alone.

The terrain experiment also shows why a learned policy needs inspection. Some policies stop attempting harder steps while actuator utilization remains low, because surviving earns more reward than trying and falling. A measured terrain limit can therefore reflect the learning setup. Even actuator saturation under a learned gait does not establish a globally optimal controller.

For a new morphology, I would first check whether the actuator and structural fits cover it, then examine joint utilization and sensitivity to mass estimates before trusting the ranking. The current evidence is strongest for early exploration of the surveyed legged robots. Extending the method to dexterous hands or parallel mechanisms requires additional data or model support.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，可使用页面顶部导航栏中的语言按钮。

## TL;DR

修改机器人的腿长，会连带改变几何形状、质量分布、惯量和驱动需求。**Draft** 将这些依赖关系写进模型生成过程：输入参数文件、包含表达式的运动学树，以及根部躯干的网格定义，输出可直接用于 MuJoCo 的 MJCF 模型；再用真实执行器和机器人描述文件中拟合出的规律补全物理参数。工程师因此可以在详细 CAD 设计之前训练控制器、比较不同方案。

“自动生成机器人骨架”可以作为直观理解。更准确地说，Draft 根据给定的结构描述生成物理模型，并评估它的运动能力。拓扑和下一轮设计仍由设计者选择，外层自动设计优化器属于后续工作。

## 论文与资料

**Draft: A Parametric Tool for Robot Design Exploration**，作者为 MIT 的 **David Nguyen、Marcelo Coelho 和 Sangbae Kim**。本文依据 2026 年 9 月 29 日的预印本 [arXiv:2609.38405v1](https://arxiv.org/abs/2609.38405v1) 及其[八页 PDF](https://arxiv.org/pdf/2609.38405v1)。作者提供了[官方代码与数据](https://github.com/davidhnguyen2000/draft)和[补充视频](https://youtu.be/egzlEqfwwLU)。下文实验数字均来自论文，最后的使用建议是我对这项工作的理解。

## 1. 从骨架到可仿真的物理模型

参数文件提供连杆长度、密度、电机类别等数值；运动学树中的字段保存引用这些参数的算术表达式。因此，连杆半径可以依赖电机尺寸，躯干网格可以跟随肩宽变化。修改一个参数后，相关的可视几何、碰撞几何、惯性和驱动属性会一起更新。

生成器使用四种基本模块。**Basic link** 是结构圆柱，其远端放置驱动下一级关节的电机；**sphere link** 用接触点结束一条运动链；**foot link** 提供足底支撑面；**root link** 则由多个截面多边形及其所在平面放样形成闭合网格。人形与四足的结构定义共享同一套编译器。固定关节还允许组合模块，把膝关节执行器放到髋部附近。目前的连杆库不支持并联机构。

基本几何体的质量和惯量由 MuJoCo 的 `inertiafromgeom` 根据几何与密度计算，根部网格的惯性属性由 `trimesh` 提供。MJCF 可以直接表达传动比与关节 armature，使执行器参数进入生成模型的动力学。论文报告，在笔记本 CPU 上，**12 关节四足生成并验证 MJCF 耗时 50 ms，29 关节人形耗时 202 ms**。这个时间只覆盖模型生成，控制器训练另计。

## 2. 从力矩和转速推导执行器参数

如果不约束参数之间的关系，仿真器也能运行力矩、质量、体积组合不合理的机器人。Draft 调研了 **114 个集成执行器模块**，把电机、传动机构、轴承和外壳作为整体建模。其中包括 33 个准直驱模块、33 个 MidGear 模块和 48 个高减速比模块。拟合关系让执行器能力的变化同时带来相应的物理代价。

输入是峰值输出力矩 $\tau$、空载输出转速 $\omega_{\mathrm{NL}}$ 和长径比 $a=\ell/(2r)$。论文表 I 给出以下关系，使用 SI 量：力矩为 N·m，转速为 rad/s，质量为 kg，体积为 m³，尺寸为 m，惯量为 kg·m²。

$$
\begin{aligned}
N &= 327\,\omega_{\mathrm{NL}}^{-1.066},\\
m &= 0.0653\,\tau^{0.666},\\
V &= \frac{\tau^{0.700}N^{-0.167}}{23948},\\
r &= \left(\frac{V}{2\pi a}\right)^{1/3},\qquad \ell=2ar,\\
J &= 27.2\,r^4,\qquad J_{\mathrm{armature}}=N^2J.
\end{aligned}
$$

其中 $N$ 为减速比，$J$ 为转子惯量。这些是带有单位约定的经验拟合式。多数关系使用 103 个带减速机构的模块，转子惯量拟合使用公开了该参数的 88 个模块；两者都是完整 114 条调研记录的子集。

最后一个关系对控制尤其关键：转子惯量折算到关节侧时，会乘上减速比的平方。选择低速、高减速比执行器，会同时改变关节惯性以及可用力矩、转速。训练环境还通过直流电机模型施加线性力矩—转速约束。PD 增益采用人工调定的比例关系：$k_p=1.43\tau_{\mathrm{peak}}$、$k_d=0.071\tau_{\mathrm{peak}}$。

留一验证的几何平均倍数误差分别为：**质量 1.28×、减速比 1.33×、体积 1.30×、转子惯量 1.56×**。惯量估计最不准确，原因之一是用外壳半径间接估计转子尺寸。这组规律为集成商业模块提供参考基线，定制执行器可能超出其覆盖范围。

## 3. 结构质量需要单独拟合

作者检查了 118 份公开机器人描述，最终保留 **29 台人形和 20 台四足，共 1,037 个结构段**。为了估计纯结构质量，先从连杆总质量中减去估计的执行器质量，再按结构段类别和机器人类型拟合

$$
m_{\mathrm{structure}}=cL^e,
$$

并约束 $e\geq0$。这种处理避免重复计算电机质量，但依赖执行器质量归属正确：必须判断它应计入哪一根连杆。减法得到负质量的样本会被排除，材料差异和执行器质量估计误差也会增加拟合波动。

人形与四足分别拟合。例如，表 II 中两类机器人的大腿质量指数分别为 1.36 和 2.69。躯干使用体积密度，人形为 716 kg/m³，四足为 654 kg/m³。在逐机器人留出验证中，整机质量的倍数误差分别为 1.22× 和 1.18×。表 II 的单独结构段误差属于**样本内误差**，不能与这个留出验证结果混为一谈。

设计过滤器会拒绝超出执行器目录及传动类别极值的配置，并对异常长径比、结构密度和执行器质量占比发出警告。通过过滤意味着设计符合调研范围内的统计约束；真正制造仍需要后续机械设计。

## 4. 实验验证了什么

Draft 使用厂商提供的几何和关节能力重建 Unitree G1、H2、Go2、B2，质量、密度、惯量和 armature 均由生成流程推导。四个模型的总质量分别达到参考机器人的 **111%、91%、101%、84%**，这四台机器人的几何平均倍数误差为 **1.10×**。

动力学的一致性弱于总质量的一致性。在 300 个构型上，Go2 的关节空间质量矩阵误差中位数为 **12.8%**，重力向量误差中位数为 **21.4%**。人形误差更大，部分原因是关节轴线不一致；固定这些轴线后，误差会下降。由于只有 G1 公开了逐关节 armature，此项比较关闭了转子折算惯量，不能据此认为所有生成的执行器惯量项都已得到验证。

运动实验生成三种四足，在 `mjlab` 中用 PPO 训练，每种设计使用十个独立随机种子。第一阶段学习轻微起伏地形上的速度跟踪，并加入间歇推扰；第二阶段分成三个策略，分别逐步提高指令速度、地形高度或推扰幅度。奖励依据腿长和 Froude 相似性缩放：令 $s=L/(0.48\,\mathrm m)$，长度随 $s$ 缩放，特征速度与时间随 $\sqrt{s}$ 缩放。

| 设计 | 质量 | 腿长 | 最高速度 | 台阶高度 | 可恢复的速度冲击 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cheetah，QDD 6:1 | 33 kg | 0.48 m | 3.63 m/s | 0.12 m | 7.9 m/s |
| Bear，MidGear 20:1 | 110 kg | 0.74 m | 4.33 m/s | 0.12 m | 8.6 m/s |
| Giraffe，高减速比 80:1 | 91 kg | 1.30 m | 2.17 m/s | 0.20 m | 5.3 m/s |

这些是表 V 中十个种子的中位数，每个种子的结果又基于 256 次 rollout。“速度冲击”表示施加的速度增量，单位为 m/s。Bear 在绝对速度和抗推扰能力上领先，Giraffe 能通过最高台阶。但用 $\sqrt{gL}$ 归一化速度和冲击、用腿长 $L$ 归一化台阶高度后，Cheetah 在这些相对指标上领先。评价尺度会直接影响设计排序。

论文还通过机械输出功率和建模的铜损计算传动效率，这个指标未完整计入电池及辅助系统功耗。作者参照 Go2/B2 重建残差扰动连杆质量，在不重新训练的情况下评估策略，主要能力趋势保持不变。

## 5. 我会在哪个阶段使用 Draft

我会用 Draft 在详细 CAD 之前筛选身体比例、执行器类别和电机位置。它最有价值的部分是把设计决策联系起来：提高力矩需求后，相应的质量、尺寸和惯量变化也会进入控制实验。这样得到的比较，比单独修改力矩上限更有参考价值。

地形实验也说明，读结果时需要检查策略行为。部分策略在执行器利用率仍较低时就不再尝试更高台阶，因为保持站立获得的回报高于尝试后跌倒。测得的地形极限可能受到训练设置影响；即使执行器在某种步态下达到饱和，也不能据此证明控制器全局最优。

面对新形态，我会先检查执行器和结构拟合是否覆盖该设计，再看关节利用率及质量估计误差是否会改变排序。目前证据最充分的用途，是对调研覆盖的足式机器人进行早期设计探索。扩展到灵巧手或并联机构，还需要补充数据或模型支持。

</div>
