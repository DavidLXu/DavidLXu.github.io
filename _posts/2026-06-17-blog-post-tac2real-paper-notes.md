---
title: "[Paper Notes] Tac2Real: Reliable and GPU Visuotactile Simulation for Online Reinforcement Learning and Zero-Shot Real-World Deployment"
date: 2026-06-17
permalink: /posts/2026/06/tac2real-paper-notes/
tags:
  - Visuotactile Simulation
  - Tactile Sensing
  - Reinforcement Learning
  - Sim-to-Real
  - Robot Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Tac2Real** is a tactile simulation and sim-to-real recipe for contact-rich robot learning. The paper argues that online RL with vision-based tactile sensors needs two things at the same time: a physically meaningful tactile simulator and enough throughput to run many parallel environments. Tac2Real tries to sit exactly at that tradeoff point.

The simulator uses **PNCG-IPC**, a GPU-friendly variant of Incremental Potential Contact, to generate GelSight-style marker displacement fields. Instead of rendering full tactile RGB images, it outputs a low-dimensional **9 x 7 marker displacement field**, which is more sensitive to contact modes such as pressing, sliding, and collision direction, while being easier to use in RL.

The second contribution is **TacAlign**, a four-stage alignment pipeline for zero-shot deployment: robot controller alignment, baseline IPC material calibration, task-based contact calibration, and domain randomization. This part is the real bridge from high-fidelity simulation to real-world success.

On blind peg insertion, Tac2Real reaches **91.7% zero-shot real-world success** over 60 trials. In the same real-world setting, TacSL reaches **15.0%**, Tacchi reaches **8.3%**, and no tactile feedback reaches **6.7%**. The key lesson is that simulation success alone is not enough: TacSL performs similarly to Tac2Real in simulation, but collapses in real deployment because its tactile fields are less physically aligned with reality.

## Paper Info

The paper is **"Tac2Real: Reliable and GPU Visuotactile Simulation for Online Reinforcement Learning and Zero-Shot Real-World Deployment"** by **Ningyu Yan, Shuai Wang, Xing Shen, Hui Wang, Hanqing Wang, Yang Xiang, and Jiangmiao Pang**.

It was submitted to arXiv on **March 30, 2026** as [arXiv:2603.28475](https://arxiv.org/abs/2603.28475). The project page is [ningyurichard.github.io/tac2real-project-page](https://ningyurichard.github.io/tac2real-project-page/), and it links to the official code.

## Problem and Motivation

Vision-based tactile sensors such as GelSight Mini are powerful because they convert local contact into dense visual or marker signals. For manipulation, this is especially useful when object pose is hidden, camera feedback is ambiguous, or the task becomes dominated by subtle contact geometry.

The difficulty is that tactile simulation is caught between two bad extremes:

- Fast approximations can scale to online RL, but often miss deformation, friction, slip, and realistic contact modes.
- High-fidelity physics methods can model soft contact better, but are usually too slow or unstable for thousands of online RL environments.

Tac2Real targets the middle ground: physically grounded enough to transfer, but lightweight and parallel enough to train policies online.

The paper positions existing methods along this axis. Tacchi uses MPM and can be visually plausible, but struggles with numerical instability and adhesion-like artifacts under large deformation. TacSL is very fast because it uses SDF and penalty-based contact, but its tactile field can deviate from real marker displacement. IPC-based methods are more robust for contact, but need careful acceleration to be useful in RL.

## Tac2Real Simulation Framework

Tac2Real uses **Preconditioned Nonlinear Conjugate Gradient Incremental Potential Contact (PNCG-IPC)** for the tactile sensor gel. IPC formulates elastodynamic contact as an optimization problem. With implicit Euler integration, the next positions are obtained by minimizing an energy:

$$
E(x) =
\frac{1}{2}(x - \hat{x})^\top M(x - \hat{x})
+ h^2 \Psi(x)
+ B(x)
+ D(x)
$$

The terms correspond to inertia, hyperelastic energy, log-barrier contact potential, and frictional potential.

Standard IPC often uses Newton-style optimization with Hessian assembly, factorization, and continuous collision detection based line search. That is accurate but expensive. PNCG-IPC replaces Newton steps with nonlinear conjugate gradient updates. The computation mainly needs gradients, diagonal Hessian entries, and vector dot products, which map well to GPUs. It also uses an analytical step-size bound to avoid costly CCD in each line search.

This is a deliberate engineering tradeoff. Each iteration is less accurate than Newton's method, but the iteration is cheap enough that the solver can reach sufficient tactile accuracy at interactive speed.

## Why Marker Displacement Fields?

Tac2Real focuses on GelSight Mini marker displacement fields rather than tactile RGB images. A GelSight Mini can produce either RGB tactile images or a marker displacement field depending on gel type. The paper's test shows that marker displacement fields change clearly across stationary, press-down, move-forward, and move-backward contact modes, while RGB tactile images show subtler changes.

For RL, this matters for three reasons:

- The representation is compact: **9 x 7 x 2** marker displacement values.
- It directly exposes contact direction and shear-like deformation cues.
- It avoids the cost and uncertainty of optical rendering.

In simulation, marker positions are mapped to initial IPC mesh nodes using k-nearest neighbors, then interpolated from the deformed mesh state.

## Integration with Robot Simulators

Tac2Real is designed as a plugin outside the main physics engine. The robot simulator, such as Isaac Lab, advances the robot and object dynamics. Tac2Real receives relative quantities between the tactile sensor and the contacted object:

- relative position,
- relative rotation,
- relative linear velocity,
- relative angular velocity.

It then runs tactile simulation and returns marker displacement fields. These tactile fields are concatenated with the base robot observation and passed back to the RL policy.

This interface is important because it makes Tac2Real **cross-engine compatible**. The tactile backend only needs relative sensor-object quantities, so the same idea can be attached to Isaac Lab, Isaac Gym, MuJoCo, PyBullet, or similar environments.

For throughput, Tac2Real uses a Ray cluster over multiple nodes and GPUs. Each GPU owns a Ray-wrapped tactile simulation worker responsible for a subset of environments. During rollout, tactile fields are computed in parallel and gathered for policy training.

## TacAlign: Closing the Gap in Layers

Tac2Real's strongest practical idea is that simulation fidelity alone is not enough. The paper separates the sim-to-real gap into structured and stochastic parts, then introduces **TacAlign** to attack both.

### 1. Robot Control Alignment

Both simulated and real Franka robots use Cartesian impedance control. A naive approach would try to match controller gains directly, but the paper shows that similar gains do not necessarily imply similar end-effector trajectories because of actuator delays, friction, and unmodeled dynamics.

Instead, TacAlign minimizes trajectory discrepancy over six canonical motions: three translations and three rotations. It alternates between optimizing simulation gains and real-controller gains. The initial average translational discrepancy is **11.11 mm**, which is already larger than the roughly **8 mm** socket hole in the peg insertion task. After alignment, the discrepancy drops to **2.521 mm** translation and **0.454 degrees** rotation.

### 2. Baseline IPC Calibration

The tactile gel's material parameters are calibrated against real GelSight Mini measurements. The parameters are:

- Young's modulus \(E\),
- Poisson's ratio \(\nu\),
- density \(\rho\),
- friction coefficient \(\mu\).

The authors use a 6-DOF positioning stage and four 3D-printed indenters: cube, cylinder, moon, and triangle. Each indenter performs pressing, sliding, and rotating interactions. The objective is the MSE between simulated and real marker displacement fields, optimized with CMA-ES.

### 3. Task-Based Calibration

Baseline indentation is not enough for the actual peg insertion task. TacAlign also fine-tunes Isaac Lab contact parameters, especially contact friction and compliant contact settings, using task-relevant states:

- stationary grasping,
- press-down collision,
- forward collision,
- backward collision.

This stage turns out to be especially important in ablation. Removing task-based calibration drops Tac2Real's real-world success rate from **91.7%** to **25.0%**.

### 4. Randomization

Finally, TacAlign adds randomization for residual uncertainty. It randomizes controller gains, friction, socket position, object pose, hand pose, end-effector pose noise, and IPC movement perturbations. This complements deterministic calibration by making the policy robust to errors that cannot be cleanly identified.

## Online RL Setup

The evaluation uses two contact-rich simulation tasks:

- **Random Orientation Peg Insertion.** A Franka robot inserts a cylindrical peg into a socket. The peg orientation in the gripper is randomized within \([-35^\circ, 35^\circ]\). The peg and socket hole diameter are both **8 mm**.
- **Random Orientation Nut Threading.** The robot places a randomly oriented nut onto a bolt and rotates the gripper until the nut is threaded to **1.5 pitches**.

The policy is deliberately given a partial observation:

$$
o_t = [p_{ee}, u, a_{t-1}]
$$

where \(p_{ee} \in \mathbb{R}^7\) is end-effector pose, \(u \in \mathbb{R}^{7 \times 9 \times 2}\) is the marker displacement field for one finger, and \(a_{t-1}\) is the previous action. No object pose and no camera observation are provided. This makes the task close to "blind" manipulation, where tactile feedback has to infer contact state and object orientation.

The policy is trained with PPO from `rl-games`, using 512 environments distributed across four nodes, each with 16 GPUs. The actor-critic uses an LSTM, which makes sense because marker fields over time reveal contact mode and insertion progress.

## Main Results

In simulation, Tac2Real and TacSL are close:

| Task | Tac2Real | TacSL | Tacchi | No Tactile |
|---|---:|---:|---:|---:|
| Peg insertion, sim | 0.776 | 0.789 | 0.173 | 0.168 |
| Nut threading, sim | 0.702 | 0.708 | 0.152 | 0.313 |

This table is easy to misread. If we only looked at simulation, TacSL would seem just as good as Tac2Real. But the real-world deployment changes the conclusion:

| Real peg insertion setting | Tac2Real | TacSL | Tacchi | No Tactile |
|---|---:|---:|---:|---:|
| Full TacAlign | 0.917 | 0.150 | 0.083 | 0.067 |
| Without control alignment | 0.533 | 0.033 | 0.050 | 0.017 |
| Without task-based calibration | 0.250 | 0.150 | 0.016 | 0.067 |
| Without randomization | 0.767 | 0.100 | 0.100 | 0.017 |

The main takeaway is that **simulation learning curves are not enough to validate tactile simulators**. A tactile representation can support policy learning in simulation while still encoding the wrong contact physics for transfer.

## Real-World Deployment

The real-world experiment uses two GelSight Mini sensors on Franka grippers for force balance, but only the right finger's marker displacement field is used for inference. The peg orientations are initialized at \(0^\circ\), \(+15^\circ\), and \(-15^\circ\), with 20 trials for each orientation.

Tac2Real succeeds in **55 out of 60 trials**, giving **91.7%** zero-shot success. The policy is trained entirely in simulation.

The paper also includes a practical sensor-protection rule: if the MSE difference between successive marker displacement fields exceeds a threshold, inference is paused, the end-effector moves back one step, and inference resumes. This is a small detail, but it is very real-robot flavored: tactile gels are fragile, and safe deployment needs guardrails.

## Strengths

The biggest strength is that Tac2Real connects three layers that are often handled separately:

1. high-fidelity tactile deformation,
2. scalable online RL infrastructure,
3. systematic sim-to-real alignment.

PNCG-IPC is also a good fit for the problem. The paper does not chase perfect offline physics. It chooses the level of physical fidelity that helps tactile RL while keeping the computation GPU-parallel.

Another strength is the ablation design. The TacSL comparison is especially useful because it shows a subtle failure mode: a fast tactile simulator can be good enough for simulation training but not good enough for real deployment.

Finally, the paper is implementation-oriented. It gives concrete controller alignment numbers, material calibration ranges, randomization ranges, RL hyperparameters, and deployment settings.

## Limitations

The real-world validation is still narrow. The headline result is strong, but it is focused on peg insertion with a Franka gripper and GelSight Mini sensors. The simulation also evaluates nut threading, but the zero-shot real-world deployment is only reported for peg insertion.

Tac2Real depends on a large compute setup for online RL. The main training setting uses four nodes with 16 GPUs each for tactile simulation distribution. The method is scalable, but not lightweight in the everyday lab sense.

The tactile representation is marker displacement only. That is a reasonable choice for contact-rich control, but it gives up texture and fine visual details that tactile RGB images can provide.

The system still requires careful calibration. TacAlign is a strength, but it is also a dependency: without task-based calibration or control alignment, transfer performance drops sharply.

## Takeaways

My read is that Tac2Real is most useful as a **systems paper for tactile sim-to-real RL**. The core message is not simply "use IPC." It is:

1. choose a tactile representation that exposes the contact variables the policy needs;
2. make the simulator physically meaningful enough for real contact;
3. make it fast enough for online RL;
4. align controller dynamics and tactile fields before trusting zero-shot transfer;
5. judge tactile simulation by real deployment, not simulation curves alone.

For my taxonomy, I would label this paper:

**Visuotactile Simulation / Contact-Rich RL / GPU Physics / Zero-Shot Sim-to-Real**

The most reusable idea is TacAlign. Even if a future system replaces PNCG-IPC with a learned tactile surrogate or another high-performance solver, the layered alignment recipe remains valuable: control first, material response second, task contact third, then randomized robustness.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**Tac2Real** 是一套面向 contact-rich robot learning 的 tactile simulation 和 sim-to-real 方法。论文的核心判断是：带 vision-based tactile sensor 的在线强化学习，同时需要两件事：足够真实的接触物理，以及足够高的并行吞吐。Tac2Real 试图卡在这个关键折中点上。

模拟器使用 **PNCG-IPC**，也就是更适合 GPU 并行的 Incremental Potential Contact 变体，用来生成 GelSight 风格的 marker displacement field。它没有去渲染完整 tactile RGB image，而是输出低维的 **9 x 7 marker displacement field**。这种表示对 press、slide、collision direction 等接触模式更敏感，也更适合直接喂给 RL policy。

第二个贡献是 **TacAlign**：一个四阶段 zero-shot deployment 对齐流程，包括 robot controller alignment、baseline IPC material calibration、task-based contact calibration 和 domain randomization。真正把高保真仿真推到真实机器人上的，是这部分系统化对齐。

在 blind peg insertion 任务上，Tac2Real 在 60 次真实机器人实验中达到 **91.7% zero-shot real-world success**。同一真实任务里，TacSL 是 **15.0%**，Tacchi 是 **8.3%**，无 tactile feedback 是 **6.7%**。最重要的结论是：simulation success 不等于 real success。TacSL 在仿真里的学习效果接近 Tac2Real，但真实部署会崩，因为它的 tactile field 和真实 marker deformation 对不上。

## Paper Info

论文标题是 **"Tac2Real: Reliable and GPU Visuotactile Simulation for Online Reinforcement Learning and Zero-Shot Real-World Deployment"**，作者是 **Ningyu Yan, Shuai Wang, Xing Shen, Hui Wang, Hanqing Wang, Yang Xiang, and Jiangmiao Pang**。

论文于 **2026 年 3 月 30 日**提交到 arXiv：[arXiv:2603.28475](https://arxiv.org/abs/2603.28475)。项目页是 [ningyurichard.github.io/tac2real-project-page](https://ningyurichard.github.io/tac2real-project-page/)，其中也链接了官方代码。

## 问题与动机

GelSight Mini 这类 vision-based tactile sensors 很有价值，因为它能把局部接触转换成稠密图像或 marker signal。对 manipulation 来说，这在 object pose 不可见、相机反馈模糊、任务主要由细微接触几何决定时尤其重要。

问题是 tactile simulation 很容易夹在两个极端之间：

- 快速近似方法可以扩展到在线 RL，但往往缺少真实 deformation、friction、slip 和复杂接触模式。
- 高保真物理方法更能模拟软接触，但通常太慢，或者在大规模并行 RL 中不稳定。

Tac2Real 试图走中间路线：物理上足够可信，能迁移到真实世界；工程上足够轻，能支撑在线训练。

论文把已有方法放在这条轴上比较。Tacchi 使用 MPM，视觉上可以比较合理，但在大变形时容易出现 numerical instability 和类似粘连的 artifact。TacSL 很快，因为它依赖 SDF 和 penalty-based contact，但 tactile field 可能和真实 marker displacement 偏差很大。IPC 方法对接触更稳，但必须做 GPU 加速才能用于 RL。

## Tac2Real Simulation Framework

Tac2Real 用 **Preconditioned Nonlinear Conjugate Gradient Incremental Potential Contact (PNCG-IPC)** 来模拟 tactile sensor gel。IPC 把 elastodynamic contact 写成优化问题。通过 implicit Euler integration，下一时刻的位置来自最小化下面这个能量：

$$
E(x) =
\frac{1}{2}(x - \hat{x})^\top M(x - \hat{x})
+ h^2 \Psi(x)
+ B(x)
+ D(x)
$$

四项分别对应 inertia、hyperelastic energy、log-barrier contact potential 和 frictional potential。

标准 IPC 常用 Newton-style optimization，需要组装 Hessian、矩阵分解，以及基于 continuous collision detection 的 line search，精度高但很贵。PNCG-IPC 用 nonlinear conjugate gradient 取代 Newton step。主要计算变成 gradient、diagonal Hessian entries 和 vector dot products，这些都适合 GPU 并行。它还用 analytical step-size bound 避免每步 line search 都做昂贵 CCD。

这是一个明确的工程取舍：单步精度不如 Newton，但每步足够便宜，可以在几十步内达到 tactile simulation 所需的精度。

## 为什么用 Marker Displacement Field?

Tac2Real 主要关注 GelSight Mini 的 marker displacement field，而不是 tactile RGB image。GelSight Mini 根据 gel type 可以输出 RGB tactile image 或 marker displacement field。论文的测试显示，在 stationary、press-down、move-forward、move-backward 这些 contact mode 下，marker displacement field 的变化更明显，而 RGB tactile image 的差别更细微。

这对 RL 很关键：

- 表示紧凑：**9 x 7 x 2** marker displacement values。
- 直接暴露 contact direction 和 shear-like deformation cue。
- 避免 optical rendering 的成本和不确定性。

在仿真里，marker 和初始 IPC mesh nodes 通过 k-nearest neighbors 建立映射，再从 deformed mesh state 中插值得到 marker displacement。

## 与机器人模拟器集成

Tac2Real 被设计成主 physics engine 外部的插件。Isaac Lab 这类机器人模拟器负责推进 robot/object dynamics。Tac2Real 接收 tactile sensor 和接触物体之间的相对量：

- relative position,
- relative rotation,
- relative linear velocity,
- relative angular velocity.

然后 Tac2Real 运行 tactile simulation，返回 marker displacement fields。这些 tactile fields 和基础 robot observation 拼接后再送给 RL policy。

这个接口很重要，因为它让 Tac2Real 具备 **cross-engine compatibility**。tactile backend 只需要 sensor-object relative quantities，所以同样的思路可以接到 Isaac Lab、Isaac Gym、MuJoCo、PyBullet 等环境中。

为了提高吞吐，Tac2Real 使用跨多节点多 GPU 的 Ray cluster。每张 GPU 有一个 Ray-wrapped tactile simulation worker，负责一部分环境。rollout 时并行计算 tactile fields，然后汇总给 policy training。

## TacAlign: 分层缩小 Sim-to-Real Gap

Tac2Real 最有实践价值的部分，是它不把 simulation fidelity 当成唯一答案。论文把 sim-to-real gap 分成 structured 和 stochastic 两部分，然后用 **TacAlign** 分层处理。

### 1. Robot Control Alignment

仿真和真实 Franka 都使用 Cartesian impedance control。朴素做法可能是直接匹配 controller gains，但论文发现 gain 接近不代表 end-effector trajectory 接近，因为真实系统有 actuator delay、friction 和未建模 dynamics。

TacAlign 直接最小化六个 canonical motions 上的 trajectory discrepancy：三维平移和三维旋转。它交替优化 simulation gains 和 real-controller gains。初始平均 translation discrepancy 是 **11.11 mm**，已经大于 peg insertion 任务里约 **8 mm** 的孔径。对齐后，translation discrepancy 降到 **2.521 mm**，rotation discrepancy 降到 **0.454 degrees**。

### 2. Baseline IPC Calibration

tactile gel 的材料参数通过真实 GelSight Mini 数据标定。参数包括：

- Young's modulus \(E\),
- Poisson's ratio \(\nu\),
- density \(\rho\),
- friction coefficient \(\mu\).

作者使用 6-DOF positioning stage 和四种 3D-printed indenters：cube、cylinder、moon、triangle。每种 indenter 做 pressing、sliding、rotating 三类交互。优化目标是真实和仿真 marker displacement fields 的 MSE，用 CMA-ES 做 gradient-free optimization。

### 3. Task-Based Calibration

基线 indentation calibration 不足以覆盖实际 peg insertion 的接触状态。因此 TacAlign 进一步针对任务状态微调 Isaac Lab 的 contact parameters，尤其是 contact friction 和 compliant contact settings。使用的任务状态包括：

- stationary grasping,
- press-down collision,
- forward collision,
- backward collision.

这个阶段在 ablation 中非常关键。去掉 task-based calibration 后，Tac2Real 的真实成功率从 **91.7%** 降到 **25.0%**。

### 4. Randomization

最后，TacAlign 用随机化处理剩余不确定性，包括 controller gains、friction、socket position、object pose、hand pose、end-effector pose noise 和 IPC movement perturbations。它补上 deterministic calibration 无法完全识别的误差。

## Online RL 设置

评估中有两个 contact-rich simulation tasks：

- **Random Orientation Peg Insertion.** Franka 将圆柱 peg 插入 socket。peg 在 gripper 中的初始方向在 \([-35^\circ, 35^\circ]\) 内随机。peg 和 socket hole 的直径都是 **8 mm**。
- **Random Orientation Nut Threading.** 机器人把随机初始方向的 nut 放到 bolt 上，并旋转 gripper，直到 nut 拧入 **1.5 pitches**。

policy 被故意限制在 partial observation 下：

$$
o_t = [p_{ee}, u, a_{t-1}]
$$

其中 \(p_{ee} \in \mathbb{R}^7\) 是 end-effector pose，\(u \in \mathbb{R}^{7 \times 9 \times 2}\) 是单个手指的 marker displacement field，\(a_{t-1}\) 是上一时刻动作。没有 object pose，也没有 camera observation。也就是说，这几乎是一个 "blind" manipulation setting，policy 必须靠 tactile feedback 推断 contact state 和 object orientation。

训练使用 `rl-games` 的 PPO，512 个环境分布在四个节点上，每个节点 16 张 GPU。actor-critic 使用 LSTM，这也合理，因为一段时间内的 marker field 才能揭示 contact mode 和 insertion progress。

## 主要结果

在仿真中，Tac2Real 和 TacSL 很接近：

| Task | Tac2Real | TacSL | Tacchi | No Tactile |
|---|---:|---:|---:|---:|
| Peg insertion, sim | 0.776 | 0.789 | 0.173 | 0.168 |
| Nut threading, sim | 0.702 | 0.708 | 0.152 | 0.313 |

这张表很容易误导人。如果只看仿真，TacSL 似乎和 Tac2Real 一样好。但真实部署给出了完全不同的结论：

| Real peg insertion setting | Tac2Real | TacSL | Tacchi | No Tactile |
|---|---:|---:|---:|---:|
| Full TacAlign | 0.917 | 0.150 | 0.083 | 0.067 |
| Without control alignment | 0.533 | 0.033 | 0.050 | 0.017 |
| Without task-based calibration | 0.250 | 0.150 | 0.016 | 0.067 |
| Without randomization | 0.767 | 0.100 | 0.100 | 0.017 |

核心 takeaway 是：**不能只用 simulation learning curve 来验证 tactile simulator**。一个 tactile representation 可以让 policy 在仿真中学得不错，但如果 contact physics 错了，真实部署仍然会失败。

## Real-World Deployment

真实实验中，Franka gripper 上装了两个 GelSight Mini sensors 来保持 force equilibrium，但 inference 只使用右手指的 marker displacement field。peg 初始角度设置为 \(0^\circ\)、\(+15^\circ\)、\(-15^\circ\)，每个角度 20 次试验。

Tac2Real 在 **60 次中成功 55 次**，即 **91.7%** zero-shot success。policy 完全在仿真中训练，没有真实数据微调。

论文还加入了一个实用的 sensor-protection rule：如果连续 marker displacement fields 的 MSE difference 超过阈值，就暂停 inference，让 end-effector 后退一步，再恢复 inference。这是一个很真实机器人味道的细节：tactile gel 很脆弱，部署时需要保护机制。

## 优点

Tac2Real 最大的优点，是把三个经常被分开处理的层次连起来了：

1. high-fidelity tactile deformation,
2. scalable online RL infrastructure,
3. systematic sim-to-real alignment.

PNCG-IPC 也很适合这个问题。论文并没有追求离线物理仿真的完美精度，而是选择了能帮助 tactile RL、同时能 GPU 并行的物理保真度。

另一个优点是 ablation 设计清楚。TacSL 对比尤其有价值，因为它暴露了一个容易被忽略的失败模式：快速 tactile simulator 可能足够支持 simulation training，却不足以支持 real deployment。

最后，这篇论文很工程化。它给出了具体 controller alignment 数字、material calibration ranges、randomization ranges、RL hyperparameters 和 deployment settings。

## 局限

真实验证仍然比较窄。headline result 很强，但主要集中在 Franka gripper 加 GelSight Mini 的 peg insertion。仿真里还评估了 nut threading，但 zero-shot real-world deployment 只报告了 peg insertion。

Tac2Real 的在线 RL 依赖比较大的算力配置。主要训练设置使用四个节点，每个节点 16 张 GPU 来分布 tactile simulation。方法是 scalable 的，但不是普通实验室意义上的轻量。

tactile representation 只使用 marker displacement。这对 contact-rich control 很合理，但放弃了 tactile RGB image 中的 texture 和更细粒度视觉细节。

系统仍然需要细致 calibration。TacAlign 是优点，也是依赖：去掉 task-based calibration 或 control alignment 后，transfer performance 会明显下降。

## Takeaways

我的理解是，Tac2Real 最适合被看作一篇 **tactile sim-to-real RL systems paper**。它的核心不是简单地说 "use IPC"，而是：

1. 选择能暴露 policy 所需接触变量的 tactile representation；
2. 让 simulator 的 contact physics 足够可信；
3. 让模拟器快到能支撑 online RL；
4. 在 zero-shot transfer 前对齐 controller dynamics 和 tactile fields；
5. 用真实部署评价 tactile simulation，而不是只看仿真曲线。

如果放进我的分类体系，我会把它标成：

**Visuotactile Simulation / Contact-Rich RL / GPU Physics / Zero-Shot Sim-to-Real**

最可复用的想法是 TacAlign。即使未来系统用 learned tactile surrogate 或其他高性能 solver 替换 PNCG-IPC，这套 layered alignment recipe 仍然有价值：先对 control，再对 material response，再对 task contact，最后用 randomization 做鲁棒性补偿。

</div>
