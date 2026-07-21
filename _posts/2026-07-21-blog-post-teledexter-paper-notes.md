---
title: "[Paper Notes] TeleDexter: Towards Human-level Dexterous Teleoperation"
date: 2026-07-21
permalink: /posts/2026/07/teledexter-paper-notes/
tags:
  - Dexterous Manipulation
  - Teleoperation
  - Reinforcement Learning
  - Sim-to-Real
  - Imitation Learning
---

<div data-lang="en" markdown="1">

**TeleDexter adds a learned low-level “cerebellum” between an operator's intent and a dexterous robot hand.** The operator and a tracked object provide synchronized fingertip-position and object-pose targets. A reinforcement-learning controller then chooses robot joint commands and contact transitions that realize those targets. This changes dexterous teleoperation from direct pose copying into **goal-conditioned, contact-aware execution**.

The mechanism is also the right boundary for reading the paper's “human-level” claim. TeleDexter demonstrates in-hand reorientation, finger gaiting, and multi-stage tool use that conventional retargeting baselines rarely complete. It remains an object-specific controller trained from motion-capture data, requires real-time object tracking, observes no tactile signal, and is evaluated on seven fixed tasks with 15 trials each. The result is a strong contact-execution layer and a valuable demonstration generator; general human-level manipulation remains a much larger goal.

## Paper Info

**“Towards Human-level Dexterous Teleoperation”** is by **Puhao Li, Zeyuan Chen, Yingying Wu, Pengkun Wei, Yuyang Li, Tianyu Wang, Jiaxiao Shi, Mingrui Yu, Baoxiong Jia, Song-Chun Zhu, Tengyu Liu, and Siyuan Huang**. The authors are affiliated with Tsinghua University, the State Key Laboratory of General Artificial Intelligence at BIGAI, and Peking University. These notes refer to **arXiv:2607.11481v1, submitted July 13, 2026**.

- [Paper](https://arxiv.org/abs/2607.11481)
- [PDF](https://arxiv.org/pdf/2607.11481)
- [Project page and videos](https://bigai-dex.github.io/blog/teledexter/)

## The Missing Layer in Dexterous Teleoperation

Kinematic teleoperation maps tracked human joints or geometric hand features into robot joint targets. It is intuitive and fast, but the mapping carries no model of contact force, friction, object inertia, or actuator response. This becomes fragile as soon as a finger must release, move around the object, and re-establish contact while other fingers keep the object stable.

TeleDexter inserts a learned dynamics prior into this loop. All quantities are expressed in the robot wrist frame. The arm independently follows the operator's wrist through inverse kinematics, while the hand policy receives a co-tracking goal

\[
g_t=\left(\hat{p}^{\mathrm{tip}}_t,\hat{T}^{o}_t\right),
\]

where \(\hat{p}^{\mathrm{tip}}_t\) contains target fingertip positions and \(\hat{T}^{o}_t=(\hat{x}^{o}_t,\hat{R}^{o}_t)\in SE(3)\) is the target object pose. The policy outputs joint-position commands

\[
a_t=\pi_\theta(o_t,g_t).
\]

The goal specifies **what geometry should be reached**. Simulation-trained control supplies **how to move contacts and joints to reach it**. Tracking the object target matters as much as tracking the fingertips: identical fingertip positions can correspond to a stable regrasp, a slipping object, or a failed contact transition.

At deployment, motion capture measures an operator-side hand-object interaction while the robot-side state provides the current hand and object configuration. The resulting feedback loop is therefore grounded in two errors simultaneously: fingertip target versus robot fingertip state, and desired object motion versus the robot object's measured motion.

## 1. Geometry-Aware Reference Motions

The low-level controller is trained from unscripted human hand-object interaction. For each object, the authors record **150 trajectories of 20 seconds each**, totaling about **50 minutes**. The recordings include in-hand translation, rotation, free play, finger gaiting, and tool-use motions.

Direct human-to-robot retargeting provides a useful initialization but can place fingers inside the object or destroy intended contacts. TeleDexter uses a two-stage pipeline:

1. vector-based retargeting aligns human and robot hand geometry;
2. object-mesh-aware optimization refines the whole trajectory.

The second stage solves

\[
q^*_{1:T}=\arg\min_{q_{1:T}}
\sum_{t=1}^{T}
\left(
L^t_{\mathrm{vec}}
+\lambda_{\mathrm{surf}}L^t_{\mathrm{surf}}
+\lambda_{\mathrm{pen}}L^t_{\mathrm{pen}}
+\lambda_{\mathrm{col}}L^t_{\mathrm{col}}
\right)
+\lambda_{\mathrm{smooth}}L_{\mathrm{smooth}}.
\]

The surface term attracts near-contact hand points to the object surface; the penetration term pushes hand points out of the object; the collision term prevents fingers from overlapping; and trajectory smoothness suppresses motion-capture jitter. This produces synchronized robot fingertip and object-pose targets with more plausible contact geometry. The later RL rollouts supply physical feasibility by resolving forces and friction that lie outside the geometric optimization.

## 2. Consecutive Subgoals Give RL Room to Discover Contact

Dense frame-by-frame imitation fixes a target at every instant. For dexterous contact, this can over-constrain exploration: the robot embodiment and dynamics may require a finger sequence that differs from the captured human timing.

TeleDexter samples **consecutive co-tracking subgoals** from each reference trajectory. For active subgoal \(k\), it measures per-finger position error, object-position error, and object-rotation error:

\[
e^f_{t,k}=\lVert p^{\mathrm{tip}}_{t,f}-\hat p^{\mathrm{tip}}_{k,f}\rVert_2,
\qquad
e^{\mathrm{pos}}_{t,k}=\lVert x^o_t-\hat x^o_k\rVert_2,
\]

\[
e^{\mathrm{rot}}_{t,k}
=\left\lVert
\operatorname{Log}\!\left(\hat R^{o\top}_kR^o_t\right)
\right\rVert_2.
\]

A subgoal counts as reached after all errors stay below their thresholds for 5–15 consecutive frames. The final tolerances are **3 cm per fingertip, 1 cm object translation, and 10° object rotation**. Once the target is reached, the system samples a later subgoal; 10% of transitions switch to a different reference trajectory at the same temporal index. The policy must therefore connect configurations that were never adjacent in a human demonstration.

The reward combines a sparse reach bonus, a small dense tracking term, and a time penalty:

\[
r_t=
\mathbf{1}_{\mathrm{reach}}(t)
w_{\mathrm{step}}(t)r_{\mathrm{score}}(t)
+\alpha_{\mathrm{dense}}r_{\mathrm{dense}}(t)
-c_{\mathrm{time}}.
\]

The sparse bonus is weighted by subgoal distance, so longer successful transitions earn more. The dense term helps early exploration before the first goal is reached. A curriculum gradually increases gravity, subgoal distance, object-tracking pressure, and action-mask duration. This formulation preserves the reference motion's geometric intent while allowing RL to discover rolling, regrasping, and finger-gaiting strategies through contact simulation.

The ablation makes this point sharply. On held-out cuboid, hammer, and screwdriver motions, the dense-tracking policy reaches only about **2.6–2.7 sparse subgoals** before stalling; TeleDexter reaches **32.6, 186.6, and 178.5**, respectively.

## 3. The Learned Controller and Its Information Boundary

For SharpaWave, the observation has 142 dimensions; LeapHand uses 112. It contains joint positions and their sine/cosine encoding, the current object pose, gravity in the wrist frame, target and error vectors for fingertips and object pose, and the previous low-level command. An LSTM policy produces residual joint-position targets through a soft dead zone that lets the controller explicitly hold its previous command.

Two omissions are important: **the controller receives neither contact force nor joint velocity**. The authors exclude these signals because they are noisy or unavailable on the hardware. The policy must infer motion and contact consequences from kinematic state history, the previous command, gravity, and object-pose feedback. This makes hardware deployment simpler, while leaving ambiguous contact states unresolved. The appendix identifies tracking stalls caused by exactly this ambiguity: without touch, the controller cannot tell whether a finger is pressing the object or sliding past it.

Training uses SAPG in Isaac Gym with about **62,400 parallel environments** on **four RTX 5090 GPUs**. Each object-specific controller consumes roughly \(10^{10}\) environment steps and about one day of training. The paper's “single-stage” description means one RL stage and a shared reward recipe across contact modes. It still requires offline capture, geometry-aware retargeting, large-scale simulation, and a separately trained controller for each object.

## 4. Random Action Masking Bridges Asynchronous Hardware

Domain randomization covers hand and object dynamics, friction, object scale, external perturbations, observation noise, latency, and wrist initialization. TeleDexter adds **random action masking** as a stronger action-space regularizer.

With probability 0.15, the simulator selects three joint dimensions and freezes them at their previous commands for 1–10 control steps. Other joints receive the new action normally:

\[
\tilde a_t[j]=
\begin{cases}
\tilde a_{t-1}[j], & j\in\mathcal{M}_t,\\
a_t[j], & \text{otherwise}.
\end{cases}
\]

This exposes the policy to stale and desynchronized actuation, approximating motor lag, backlash, compliance, and missed SDK commands. Removing action masking drops real-world success from **66.7% to 33.3%** on HammerUse, from **73.3% to 0%** on ScrewdriverUse, and from **80.0% to 26.7%** on CuboidReorient. Among the reported sim-to-real interventions, it is the most consequential single design.

## 5. Real-Time Teleoperation Has Two Control Modes

The complete deployment loop runs at **30 Hz** on a Franka FR3 equipped with either a 22-DoF SharpaWave or a 16-DoF LeapHand. NOKOV optical motion capture tracks wrist pose, fingertip positions, and 6D object pose.

TeleDexter splits each trial into two phases:

1. **Reaching and grasping:** standard vector retargeting drives the pre-grasp approach and establishes initial contact.
2. **In-hand manipulation:** the operator switches to the learned co-tracking controller for reorientation, regrasping, finger gaiting, and tool use.

This division is practical and narrows the learned controller's responsibility. TeleDexter handles the contact-rich regime after a usable grasp exists; the free-space reach and initial grasp remain under conventional retargeting.

## Experiments: Where the Gain Appears

The main evaluation contains seven tasks, 15 real-world trials per method and task, and two metrics: full-task success rate (SR) and fraction of task stages completed (TP). Three tasks test in-hand reorientation; four test long-horizon tool use.

| Task | DexRT SR | GeoRT SR | DexGen SR | TeleDexter SR / TP |
|---|---:|---:|---:|---:|
| CylinderReorient | 6.7% | 0.0% | 0.0% | **80.0% / 86.7%** |
| CuboidReorient | 26.7% | 0.0% | 0.0% | **80.0% / 86.7%** |
| BunnyReorient | 0.0% | 0.0% | 0.0% | **66.7% / 77.8%** |
| HammerUse | 0.0% | 0.0% | 0.0% | **66.7% / 86.7%** |
| BrushSweep | 0.0% | 0.0% | 0.0% | **73.3% / 89.5%** |
| ScrewdriverUse | 6.7% | 0.0% | 0.0% | **73.3% / 86.7%** |
| BulbReplace | 0.0% | 0.0% | 0.0% | **86.7% / 95.6%** |
| **Average** | **5.7%** | **0.0%** | **0.0%** | **75.2% / 87.1%** |

The stage-wise analysis is more informative than the average. Baselines often complete pickup and gross motion, then collapse at the first in-hand rotation, functional grasp switch, continuous axial rotation, or sustained tool contact. TeleDexter retains most trials through these stages. For example, 13 of 15 ScrewdriverUse trials complete continuous tightening, and all 15 BulbReplace trials that reach installation also survive both screw-in and unscrew stages.

Cross-embodiment results are promising but narrower. Using the same human references and adapting only geometry-aware retargeting, the LeapHand controller reaches **60.0%** on cylinder and **73.3%** on cuboid reorientation. An any-to-any target stress test reports 41.1 consecutive targets for the cylinder and 12.1 for the cuboid on average, showing both generalization beyond recorded sequences and sensitivity to object geometry.

## From Teleoperation to Autonomous Policies

The authors collect 50 TeleDexter demonstrations per task and train RGB-conditioned Diffusion Policies with third-person and wrist cameras. On 15 trials, the autonomous policies achieve:

- **73.3%** on HammerDriver;
- **46.7%** on BulbInstall;
- **40.0%** on BrushForward.

These results are modest compared with the teleoperation controller, yet they validate the data-engine argument: TeleDexter can collect contact-rich examples that standard teleoperation baselines fail to produce. The failure pattern also exposes perception bottlenecks. BrushForward loses most trials during the thin-handle grasp, while hammering fails mainly during repeated environment contact and bulb installation during precise alignment.

## How to Interpret the 75.2% Result

The comparison strongly supports the value of learned hand-object co-tracking over pure kinematic retargeting for the tested tasks. Several qualifications matter when interpreting the headline number:

1. Each task uses 15 trials, so a single trial changes SR by 6.7 percentage points.
2. Objects are wrapped in medical bandage tape to increase friction.
3. Controllers are object-specific and use about 50 minutes of reference capture plus a dedicated training run per object.
4. Real-time deployment depends on a NOKOV optical motion-capture setup and marked objects.
5. DexGen has no official implementation. The authors reimplement it and substitute TeleDexter's co-tracking controller for an underspecified rollout-generation stage, which complicates a fully clean method comparison.
6. SimToolReal is an autonomous object-centric tool policy included as a reference, with a different interface from the teleoperation baselines.
7. The paper reports task success without a user study of operator workload, learnability, latency perception, or subjective control quality.

## Failure Modes and Research Opportunities

The appendix gives a useful diagnosis of three real-world failures:

- **interaction perturbation:** impacts such as hammer strikes shift the in-hand object outside the free-space training distribution;
- **contact-transition jam:** compliant real fingers wedge against edges or concavities in ways rigid simulation misses;
- **tracking stall:** the hand keeps the object but cannot find a productive new contact, partly because the policy has no tactile observation.

These failures point directly to useful extensions: impact-aware reference collection and simulation, better compliant-contact models, tactile state estimation, markerless hand-object tracking, and an object-conditioned controller shared across shapes and tools.

## Takeaway

TeleDexter's essential computation is

\[
\boxed{
\text{operator wrist, fingertips, and object motion}
\rightarrow
\text{hand-object geometric subgoals}
\rightarrow
\text{learned contact execution}
}.
\]

Its contribution is the middle-to-low-level bridge: human intent remains geometric and easy to specify, while a simulation-trained recurrent policy absorbs the burden of joint coordination, timing, and contact switching. Consecutive subgoals give the policy enough freedom to discover feasible strategies; geometry-aware references keep those strategies aligned with human intent; random action masking makes them survive imperfect hardware.

This is a convincing recipe for collecting rare, high-dexterity robot data and for executing long contact sequences under operator guidance. General human-level dexterity will require broader object generalization, touch, interaction-aware training, lighter perception infrastructure, and stronger evidence across operators and unstructured tasks.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**TeleDexter 在操作者意图与灵巧手之间加入了一个学习得到的低层“类小脑”控制器。** 操作者的手和被跟踪物体共同给出同步的指尖位置目标与物体位姿目标；强化学习控制器负责生成机器人关节指令和接触切换，使这些目标在真实动力学下实现。灵巧遥操作由此从直接复制姿态，转变为**目标条件、接触感知的低层执行**。

这条机制也是理解论文“human-level”表述的准确边界。TeleDexter 展示了传统 retargeting 基线几乎无法完成的手内重定向、finger gaiting 和多阶段工具使用；但它仍然是基于动作捕捉数据训练的物体专用控制器，需要实时物体跟踪，没有触觉观测，并且只在 7 个固定任务上各测试 15 次。它证明了一个很强的接触执行层和数据采集器，还没有构成通用的人类水平操作系统。

## 论文信息

论文 **“Towards Human-level Dexterous Teleoperation”** 的作者是 **Puhao Li、Zeyuan Chen、Yingying Wu、Pengkun Wei、Yuyang Li、Tianyu Wang、Jiaxiao Shi、Mingrui Yu、Baoxiong Jia、Song-Chun Zhu、Tengyu Liu 和 Siyuan Huang**，作者来自 Tsinghua University、BIGAI 的 State Key Laboratory of General Artificial Intelligence 和 Peking University。本文依据 **arXiv:2607.11481v1，提交日期为 2026 年 7 月 13 日**。

- [论文页面](https://arxiv.org/abs/2607.11481)
- [PDF](https://arxiv.org/pdf/2607.11481)
- [项目主页与视频](https://bigai-dex.github.io/blog/teledexter/)

## 灵巧遥操作缺失的中间层

运动学遥操作把跟踪到的人手关节或几何特征映射成机器人关节目标。这种接口直观、延迟低，却不包含接触力、摩擦、物体惯量和执行器响应。当某根手指需要离开物体、绕行并重新建立接触，同时其他手指还要稳定物体时，纯运动学映射会迅速变得脆弱。

TeleDexter 在控制回路里插入一个学习得到的动力学先验。所有量都表达在机器人腕部坐标系中。机械臂通过逆运动学独立跟踪操作者手腕；灵巧手策略接收 co-tracking 目标

\[
g_t=\left(\hat{p}^{\mathrm{tip}}_t,\hat{T}^{o}_t\right),
\]

其中 \(\hat{p}^{\mathrm{tip}}_t\) 是目标指尖位置，\(\hat{T}^{o}_t=(\hat{x}^{o}_t,\hat{R}^{o}_t)\in SE(3)\) 是目标物体位姿。策略输出关节位置指令

\[
a_t=\pi_\theta(o_t,g_t).
\]

目标描述**应该达到什么几何状态**，仿真中训练的策略负责决定**怎样移动关节和切换接触才能到达该状态**。物体目标与指尖目标同样重要：相同的指尖位置可能对应稳定换抓、物体滑移，也可能对应已经失败的接触切换。

真实部署时，动作捕捉系统测量操作者侧的手—物体交互，机器人侧状态则给出当前灵巧手和物体配置。控制回路同时闭合两类误差：操作者指尖目标与机器人指尖状态之间的误差，以及期望物体运动与机器人侧实测物体运动之间的误差。

## 1. 带物体几何约束的参考动作

低层控制器从无脚本的人类手—物体交互中学习。每个物体采集 **150 段、每段 20 秒**的轨迹，总计约 **50 分钟**，内容覆盖手内平移、旋转、自由操作、finger gaiting 和工具使用。

直接进行人手到机器人手的 retargeting 可以提供良好初值，但可能让手指穿进物体，也可能破坏原动作中的预期接触。TeleDexter 使用两阶段流程：

1. 基于向量的 retargeting 对齐人手与机器人手的几何关系；
2. 引入物体 mesh，对整段轨迹做几何后优化。

第二阶段求解

\[
q^*_{1:T}=\arg\min_{q_{1:T}}
\sum_{t=1}^{T}
\left(
L^t_{\mathrm{vec}}
+\lambda_{\mathrm{surf}}L^t_{\mathrm{surf}}
+\lambda_{\mathrm{pen}}L^t_{\mathrm{pen}}
+\lambda_{\mathrm{col}}L^t_{\mathrm{col}}
\right)
+\lambda_{\mathrm{smooth}}L_{\mathrm{smooth}}.
\]

surface loss 把近接触的手部表面点拉向物体表面；penetration loss 把穿入物体的点推出；collision loss 避免手指互相重叠；轨迹平滑项抑制动作捕捉抖动。输出的机器人指尖目标与物体位姿目标在接触几何上更合理。力和摩擦仍需后续 RL 在物理仿真中解决，几何优化本身不负责动力学可行性。

## 2. 连续子目标给 RL 留出发现接触策略的空间

逐帧 dense tracking 会在每个时刻固定参考目标。灵巧接触对执行时序非常敏感，机器人形态和动力学往往需要一套不同于人手原始时序的指法，逐帧约束容易限制探索。

TeleDexter 从每条参考轨迹中采样**连续 co-tracking 子目标**。对于当前子目标 \(k\)，系统计算每根手指的位置误差、物体位置误差和物体旋转误差：

\[
e^f_{t,k}=\lVert p^{\mathrm{tip}}_{t,f}-\hat p^{\mathrm{tip}}_{k,f}\rVert_2,
\qquad
e^{\mathrm{pos}}_{t,k}=\lVert x^o_t-\hat x^o_k\rVert_2,
\]

\[
e^{\mathrm{rot}}_{t,k}
=\left\lVert
\operatorname{Log}\!\left(\hat R^{o\top}_kR^o_t\right)
\right\rVert_2.
\]

所有误差连续 5–15 帧保持在阈值内，才算到达子目标。训练结束时的阈值为：**每个指尖 3 cm、物体平移 1 cm、物体旋转 10°**。到达后再采样更后面的子目标；其中 10% 的转移会保持时间索引不变、切换到另一条参考轨迹。因此，策略还要连接人类示范中从未相邻出现过的两个配置。

奖励由稀疏到达奖励、小权重 dense tracking 奖励和时间惩罚组成：

\[
r_t=
\mathbf{1}_{\mathrm{reach}}(t)
w_{\mathrm{step}}(t)r_{\mathrm{score}}(t)
+\alpha_{\mathrm{dense}}r_{\mathrm{dense}}(t)
-c_{\mathrm{time}}.
\]

子目标跨度越大，成功后的稀疏奖励越高；dense 项帮助策略在尚未到达第一个目标时形成早期探索信号。课程学习逐渐增加重力、子目标间距、物体跟踪权重和 action mask 时长。这套设计保留了参考动作的几何意图，同时允许 RL 在接触仿真中发现滚动、换抓和 finger gaiting 策略。

消融结果非常直接。在 held-out 的 cuboid、hammer 和 screwdriver 动作上，dense tracking 策略在停滞前只能到达约 **2.6–2.7 个稀疏子目标**；TeleDexter 分别达到 **32.6、186.6 和 178.5 个**。

## 3. 控制器观测与信息边界

SharpaWave 的观测维度为 142，LeapHand 为 112。观测包含关节位置及其正余弦编码、当前物体位姿、腕部坐标系中的重力方向、指尖与物体位姿的目标和误差，以及上一时刻的低层指令。LSTM 策略输出残差式关节位置目标，并使用 soft dead zone，让控制器可以明确选择保持上一条指令。

两个缺失信号尤其重要：**策略既不接收接触力，也不接收关节速度**。作者认为这些信号在硬件上噪声较大或不可得，因此让策略通过运动学状态历史、上一条指令、重力和物体位姿反馈来推断动作与接触结果。这样更容易部署到真实硬件，也留下了无法区分的接触状态。附录中的 tracking stall 正是由这个边界引起：没有触觉时，策略无法判断手指正在压住物体，还是已经从物体旁边滑过。

训练在 Isaac Gym 中使用 SAPG，约 **62,400 个并行环境**分布在 **4 张 RTX 5090** 上。每个物体专用控制器需要约 \(10^{10}\) 个环境步，训练时间约一天。论文所说的“single-stage”指单个 RL 阶段，以及所有接触模式共用一套奖励配方；完整流程仍包含离线采集、带几何约束的 retargeting、大规模仿真和逐物体训练。

## 4. Random Action Masking 处理硬件异步响应

Domain randomization 覆盖灵巧手与物体动力学、摩擦、物体尺度、外部扰动、观测噪声、延迟和腕部初始姿态。TeleDexter 进一步加入 **random action masking**，在动作空间中施加强正则。

每个仿真步以 0.15 概率选中 3 个关节维度，并让它们在 1–10 个控制步内保持上一条指令；其余关节正常执行新动作：

\[
\tilde a_t[j]=
\begin{cases}
\tilde a_{t-1}[j], & j\in\mathcal{M}_t,\\
a_t[j], & \text{其他情况}.
\end{cases}
\]

这种训练主动制造过期、不同步的执行器响应，用来近似电机延迟、backlash、被动柔顺和 SDK 丢指令。移除 action masking 后，HammerUse 的真实成功率从 **66.7% 降到 33.3%**，ScrewdriverUse 从 **73.3% 降到 0%**，CuboidReorient 从 **80.0% 降到 26.7%**。在论文报告的 sim-to-real 设计中，这是影响最大的单项机制。

## 5. 真实遥操作包含两种控制模式

完整系统以 **30 Hz** 运行，平台是 Franka FR3，加装 22-DoF SharpaWave 或 16-DoF LeapHand。NOKOV 光学动作捕捉系统实时跟踪手腕、指尖和物体 6D 位姿。

每次操作分为两个阶段：

1. **接近与抓取：**标准 vector retargeting 负责 pre-grasp 接近和建立初始接触。
2. **手内操作：**建立稳定抓取后，操作者切换到学习得到的 co-tracking 控制器，完成重定向、换抓、finger gaiting 和工具使用。

这种分工缩小了学习控制器的责任范围。TeleDexter 聚焦于形成可用抓取之后的接触密集阶段，没有训练一个从自由空间接近一直覆盖到任务结束的端到端策略。

## 实验：优势出现在哪些阶段

主实验包含 7 个任务，每个方法、每个任务进行 15 次真实实验。指标包括完整任务成功率（SR）与完成阶段比例（TP）。3 个任务测试手内重定向，4 个任务测试长时序工具使用。

| 任务 | DexRT SR | GeoRT SR | DexGen SR | TeleDexter SR / TP |
|---|---:|---:|---:|---:|
| CylinderReorient | 6.7% | 0.0% | 0.0% | **80.0% / 86.7%** |
| CuboidReorient | 26.7% | 0.0% | 0.0% | **80.0% / 86.7%** |
| BunnyReorient | 0.0% | 0.0% | 0.0% | **66.7% / 77.8%** |
| HammerUse | 0.0% | 0.0% | 0.0% | **66.7% / 86.7%** |
| BrushSweep | 0.0% | 0.0% | 0.0% | **73.3% / 89.5%** |
| ScrewdriverUse | 6.7% | 0.0% | 0.0% | **73.3% / 86.7%** |
| BulbReplace | 0.0% | 0.0% | 0.0% | **86.7% / 95.6%** |
| **平均** | **5.7%** | **0.0%** | **0.0%** | **75.2% / 87.1%** |

分阶段结果比平均值更能说明机制差异。基线通常可以完成抓取和大范围移动，进入第一次手内旋转、功能性换抓、连续轴向旋转或持续工具接触后迅速失败。TeleDexter 在这些阶段仍保留了大部分实验。例如，15 次 ScrewdriverUse 中有 13 次完成连续拧紧；BulbReplace 中所有进入安装环节的 15 次实验都通过了拧入与拧出两个阶段。

跨形态结果很有潜力，但覆盖面更窄。使用相同的人类参考动作，仅调整 geometry-aware retargeting，LeapHand 控制器在 cylinder 和 cuboid 重定向上分别达到 **60.0%** 与 **73.3%**。any-to-any 目标压力测试中，cylinder 平均连续到达 41.1 个目标，cuboid 为 12.1 个，说明策略可以超出原始参考序列，同时也对物体几何高度敏感。

## 从遥操作数据到自主策略

作者为每个任务采集 50 条 TeleDexter 示范，使用第三人称相机和腕部相机 RGB 训练 Diffusion Policy。每项测试 15 次，自主策略的结果为：

- HammerDriver：**73.3%**；
- BulbInstall：**46.7%**；
- BrushForward：**40.0%**。

这些结果低于遥操作控制器本身，但支持了 data engine 的论点：TeleDexter 可以采集传统遥操作基线难以产生的接触密集示范。失败分布也揭示了感知瓶颈。BrushForward 的主要损失发生在细而不规则的刷柄抓取阶段；hammer 的失败集中于反复环境接触；bulb installation 的瓶颈则是精确对齐。

## 75.2% 这个结果能说明什么

对比实验有力支持了学习式 hand-object co-tracking 在这些任务上优于纯运动学 retargeting。解读 headline number 时还需要保留以下限定：

1. 每项任务只有 15 次实验，一次实验对应 6.7 个百分点。
2. 测试物体包裹了医用绷带胶带，以增加表面摩擦。
3. 控制器按物体训练，每个物体约需 50 分钟参考采集和一次独立训练。
4. 真实部署依赖 NOKOV 光学动作捕捉系统与带 marker 的物体。
5. DexGen 没有官方实现。作者自行复现，并因原论文 rollout 生成阶段描述不足，使用 TeleDexter 的 co-tracking controller 代替其中间策略，因此方法比较无法完全排除实现差异。
6. SimToolReal 是自主式 object-centric 工具策略，只作为参考系统加入；它与遥操作基线的接口不同。
7. 论文报告了任务成功率，没有测试操作者负担、学习成本、延迟感知或主观控制体验。

## 失败模式与后续方向

附录把真实失败归纳为三类：

- **interaction perturbation：**锤击等冲击会让手中物体瞬间偏离只含自由空间交互的训练分布；
- **contact-transition jam：**真实手指的柔顺性会让手指卡在边缘或凹面，刚体仿真没有充分覆盖这种现象；
- **tracking stall：**手没有丢掉物体，却找不到能继续推进的接触；缺少触觉观测使策略更难判断当前接触状态。

这些问题直接指向几条扩展路线：加入冲击接触数据与仿真、提升柔顺接触建模、引入触觉状态估计、使用 markerless 手—物体跟踪，以及训练跨形状和工具共享的 object-conditioned controller。

## 总结

TeleDexter 的核心计算可以写成

\[
\boxed{
\text{操作者手腕、指尖和物体运动}
\rightarrow
\text{手—物体几何子目标}
\rightarrow
\text{学习式接触执行}
}.
\]

它补上的正是中低层桥梁：人类仍然用容易表达的几何目标给出意图，仿真中训练的循环策略承担关节协调、接触时序和接触切换。连续子目标给策略留下发现可行动作的空间；geometry-aware references 让动作维持人类意图；random action masking 让策略可以适应不完美的硬件响应。

这套方法非常适合采集稀缺的高灵巧度机器人数据，也能在操作者指导下执行长接触序列。走向更广义的人类水平灵巧操作，还需要跨物体泛化、触觉、包含环境冲击的训练、更轻量的感知基础设施，以及覆盖更多操作者和开放任务的证据。

</div>
