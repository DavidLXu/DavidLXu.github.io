---
title: "[Paper Notes] TactiDex: A Real-World Tactile-Guided Benchmark for Human-Like Dexterous Manipulation"
date: 2026-08-02
permalink: /posts/2026/08/tactidex-paper-notes/
tags:
  - Tactile Sensing
  - Dexterous Manipulation
  - Human-to-Robot Transfer
  - Reinforcement Learning
  - Sim-to-Real
---

<div data-lang="en" markdown="1">

**TactiDex asks a precise question: if a robot reproduces the geometry of a human hand trajectory but touches the object with the wrong fingers, timing, or force, has the skill really been transferred?** The paper's answer is no. It contributes a human hand–object interaction dataset with synchronized whole-hand pressure, kinematics, and object motion, then uses those tactile traces as structured supervision for reinforcement-learning-based transfer.

The most important boundary is easy to miss: **TactiSkill is tactile-guided during data processing and policy training, while the reported real-robot deployment does not use online tactile feedback.** Human tactile references define desired contact patterns, simulated contact forces shape the reward and the critic, and the learned trajectory is retargeted to physical hands for open-loop execution. The work therefore demonstrates tactile-supervised trajectory generation and sim-to-real transfer; closed-loop tactile correction remains future work.

## Paper Info

The paper is **“TactiDex: A Real-World Tactile-Guided Benchmark for Human-Like Dexterous Manipulation”** by **Suting Ni, Hanbing Zhang, Zhenyu Wei, Guo Chen, Chixuan Zhang, Ye Shi, and Jingya Wang** from **ShanghaiTech University** and **InstAdapt**. It is accepted to **ACM Multimedia 2026**. These notes refer to **arXiv:2607.09190v1**, submitted on **July 10, 2026**.

- [Paper](https://arxiv.org/abs/2607.09190)
- [PDF](https://arxiv.org/pdf/2607.09190)
- [Project page and videos](https://tactidex.github.io/)

The contribution has two coupled parts:

1. **TactiDex:** a tactile-rich human hand–object interaction dataset and contact-aware benchmark;
2. **TactiSkill:** a residual RL transfer method with a three-component tactile reward.

## Why Kinematic Matching Is Incomplete

Human-to-robot transfer commonly optimizes hand pose, joint motion, fingertip position, wrist trajectory, and object trajectory. These targets describe where the hand and object should move. They leave several physically distinct executions indistinguishable:

- a fingertip may hover a few millimeters above the surface;
- a mesh may penetrate the object and still achieve a low joint-space error;
- the correct object motion may be produced with the wrong fingers;
- average force may look reasonable while short destructive spikes occur;
- a visually similar grasp may distribute load very differently across the hand.

TactiDex treats contact as measured supervision. The transfer objective now includes **which fingers should contact, when contact should occur, how force should be distributed, and whether transient forces remain safe**.

## TactiDex Dataset

The dataset combines high-precision motion capture with a dual-glove system. An inner motion-tracking glove records articulated hand kinematics; an outer tactile glove records spatial pressure across the whole hand. OptiTrack tracks wrists and objects in a shared global coordinate frame, and objects are reconstructed as simulation-ready meshes.

| Property | TactiDex specification |
|---|---|
| Participants | 10 |
| Objects | 49 calibrated everyday objects |
| Interaction sequences | 757 |
| Scale | approximately 5.1M frames |
| Task forms | left hand, right hand, and bimanual |
| Tactile array | 162 piezoresistive sensing elements across fingertips and palm |
| Tactile sampling | 17 Hz |
| Reported force resolution | up to 0.01 N |
| Motion capture | 8 OptiTrack PX13W cameras at 120 Hz |
| Capture volume | (1.2\,\mathrm{m}\times1.8\,\mathrm{m}) |
| Additional labels | wrist/object 6D pose, MANO hand state, task ID, interaction phases, language description |

The object set includes rigid household items, delicate objects, containers, tools, and paired parts such as lids, rods, and receptacles. This supports functional and long-horizon interactions beyond isolated grasps. The authors report a motion-capture mean ray error of **0.2 mm** after calibration.

The streams run at different native rates, so synchronization is a central part of the collection system. An eSync module and the shared capture pipeline align 120 Hz pose/kinematic data with lower-rate tactile measurements at the frame level.

## Tactile-Constrained Annotation Refinement

Raw motion capture still produces floating fingers, near-contact ambiguity, and mesh penetration. TactiDex refines the fitted MANO motion in two stages.

First, MANO parameters are fitted to captured 3D keypoints with L-BFGS. Shape is shared across a subject's frames, while pose regularization and second-order temporal smoothness suppress jitter.

Then tactile evidence determines which geometric relationships count as real contact:

1. **Contact interval detection:** geometric proximity is gated by measured pressure, filtering near-contact frames that look plausible in 3D but carry no force.
2. **Reference-grasp refinement:** a stable frame is selected inside each contact interval. Fingers above the pressure threshold receive stronger surface-attraction weights; inactive fingers are down-weighted to avoid invented contacts.
3. **Temporal propagation:** inverse kinematics propagates the refined grasp through the contact interval while preserving free-space motion elsewhere.
4. **Collision correction:** an object Signed Distance Field removes residual hand–object penetration.

This processing step is one of the paper's strongest ideas. Touch acts as evidence for annotation, improving the physical validity of geometry before policy learning starts.

## TactiSkill: Residual RL as a Force Modulator

TactiSkill starts from a frozen kinematic imitation policy (pi_{\mathrm{base}}) and learns a residual policy (pi_{\mathrm{res}}):

\[
\pi^*=\pi_{\mathrm{base}}+\pi_{\mathrm{res}}.
\]

The action is a residual joint-position target,

\[
a_t=\Delta q_t,
\]

executed by a low-level PD controller. The residual policy has a more specific job than generic tracking correction: it adjusts joint configuration so that simulated fingertip forces follow the human tactile reference while the hand and object continue to track their target motion.

### 1. Human sensor to simulated force

The tactile glove outputs raw ADC values; PhysX exposes contact forces in Newtons. A finger-wise calibration map converts the recorded signals into force references compatible with simulation:

\[
F^{\mathrm{human}}_t=\mathcal{M}(\mathrm{ADC}_t).
\]

The main text describes (mathcal{M}) as finger-wise and nonlinear, while the appendix gives a calibrated linear form,

\[
F=k(\mathrm{ADC}_{\mathrm{raw}}-\mathrm{ADC}_{\mathrm{offset}}).
\]

This mapping is a critical reproducibility interface because sensor calibration directly determines the target force scale.

### 2. Asymmetric actor–critic

Training uses PPO with asymmetric information. The actor receives deployable proprioception and target references, including the human target tactile signal. The critic additionally receives privileged simulation state: exact object dynamics, center of mass, joint velocity, and real-time simulated fingertip contact forces.

For one 12-DoF Inspire hand, the appendix reports:

| Input | Dimension | Contents |
|---|---:|---|
| Proprioceptive state | 46 | joints, sine/cosine encoding, wrist pose and velocity |
| Target reference | 330 | object BPS, target tactile distances, future wrist/hand/object trajectories |
| Privileged critic state | 49 | exact object dynamics, 3D fingertip forces and magnitudes, internal physics |
| Actor input | 376 | proprioception + target |
| Critic input | 425 | actor input + privileged state |
| Action | 12 | residual joint-position targets |

Bimanual dimensions are doubled. Actor and critic are MLPs with hidden sizes ([512,256,128]) and ELU activations.

## The Three-Component Tactile Reward

The tactile reward is

\[
R_{\mathrm{tactile}}
=w_g r_{\mathrm{guide}}
+w_a r_{\mathrm{align}}
+w_s r_{\mathrm{safe}}.
\]

Each term blocks a different failure mode.

### Contact guidance: make the intended contact happen

For (N_f) fingers and contact threshold (	au), the policy receives credit when the simulated and human signals both indicate active contact:

\[
r_{\mathrm{guide}}
=\frac{1}{N_f}\sum_{i=1}^{N_f}
\mathbf{1}(F_i^{\mathrm{sim}}>\tau)
\mathbf{1}(F_i^{\mathrm{human}}>\tau).
\]

This term provides a contact trigger and discourages air grasping. The reported training threshold is **0.3 N**.

### Human-like alignment: match the force profile

Contact alone is insufficient. TactiSkill aligns the force magnitude of each finger through a bounded Tanh distance:

\[
r_{\mathrm{align}}
=\frac{1}{N_f}\sum_{i=1}^{N_f}
\left[
1-\tanh\left(
\frac{|F_i^{\mathrm{sim}}-F_i^{\mathrm{human}}|}{\sigma}
\right)
\right].
\]

The bounded metric reduces sensitivity to tactile outliers and preserves useful gradients while encouraging the same cross-finger force distribution as the human demonstration.

### Contact safety: suppress force spikes

The safety term applies an exponential penalty when simulated force exceeds an allowed limit:

\[
r_{\mathrm{safe}}
=\exp\left[
-\lambda\sum_{i=1}^{N_f}
\max(0,F_i^{\mathrm{sim}}-F_{\mathrm{limit}})^2
\right].
\]

The body text defines a human-relative limit (F_i^{\mathrm{human}}+\delta); the hyperparameter table also lists a **40 N safety force limit**. The intent is consistent: average force alignment needs an additional guard against rare large impulses.

The complete objective combines tactile structure with pose imitation, object tracking, task completion, energy, and velocity regularization:

\[
R_{\mathrm{total}}
=\lambda_{\mathrm{im}}r_{\mathrm{im}}
+\lambda_{\mathrm{task}}r_{\mathrm{task}}
+\lambda_{\mathrm{reg}}r_{\mathrm{reg}}
+\lambda_{\mathrm{tactile}}R_{\mathrm{tactile}}.
\]

## Evaluation: Geometry, Touch, and Safety

The main evaluation uses **73 representative sequences** spanning single-hand and bimanual tasks. The benchmark separates four dimensions:

- **Geometry:** object translation/rotation error, MPJPE, and fingertip error;
- **Tactile fidelity:** mean tactile force error (MTFE) and contact F1;
- **Safety:** PeakSafe@3N and SafeTac@3N;
- **Task outcome:** kinematic success (SR_{\mathrm{kin}}) and tactile-aware success (SR_{\mathrm{tac}}).

(SR_{\mathrm{kin}}) requires object rotation error at most (30^\circ), translation error at most 3 cm, MPJPE at most 8 cm, and fingertip error at most 6 cm. (SR_{\mathrm{tac}}) adds MTFE at most 3 N and contact F1 of at least 0.3. For bimanual tasks, both hands must satisfy the spatial conditions.

| Method | (SR_{\mathrm{kin}}) | (SR_{\mathrm{tac}}) | OTE-t | Contact F1 | PeakSafe@3N | SafeTac@3N |
|---|---:|---:|---:|---:|---:|---:|
| Kinematic baseline | 72.91% | 39.35% | 1.1947 cm | 0.5569 | 63.66% | 35.84% |
| TactiSkill without contact bonus | 76.87% | 41.93% | 1.2031 cm | 0.5425 | 57.00% | 35.68% |
| TactiSkill without alignment | 76.37% | 42.20% | 1.0828 cm | 0.5134 | 59.88% | 34.41% |
| TactiSkill without safety | 77.05% | 41.24% | 1.0265 cm | 0.5686 | 68.70% | 38.72% |
| **TactiSkill full** | **81.95%** | **64.64%** | **0.9577 cm** | **0.7384** | **72.80%** | **53.57%** |

The full method improves tactile-aware success by **25.29 percentage points** over the kinematic baseline and also raises kinematic success by **9.04 points**. This supports the paper's physical-regularization argument: contact supervision helps the policy avoid geometrically convenient but physically invalid optima.

The safety ablation is especially informative. Removing the safety term produces the lowest mean tactile error, **0.0921 N**, yet SafeTac@3N falls to **38.72%**, compared with **53.57%** for the full method. A low average can hide rare destructive events; peak and episode-level metrics are necessary for contact-rich control.

## Real-Robot Deployment

The physical platform uses two 7-DoF Franka Panda arms and two Inspire dexterous hands. The simulated hand has 12 DoF, while the physical Inspire hand exposes six independent actuators. An offline optimization maps the simulated trajectory to six actuator commands by balancing fingertip-position matching, proximity to a heuristic anchor mapping, and temporal smoothness:

\[
\mathcal{L}
=W_{\mathrm{pos}}\mathcal{L}_{\mathrm{pos}}
+W_{\mathrm{anchor}}\mathcal{L}_{\mathrm{anchor}}
+W_{\mathrm{smooth}}\mathcal{L}_{\mathrm{smooth}}.
\]

The appendix uses weights 50, 20, and 10. Franka arms track relative wrist delta poses with a 100 Hz operational-space controller; optimized hand commands are sent through a serial interface. The paper shows qualitative single-hand and bimanual tasks including phone use, lid handling, cooking, pouring, and cutting.

The deployment evidence should be read carefully:

- the physical hand's tactile sensors are **not fed back into the policy**;
- hand execution is open loop after offline retargeting;
- the paper presents representative videos and snapshots without a real-world trial table or hardware success rate;
- successful transfer therefore validates the usefulness of tactile-shaped simulation trajectories, while online contact recovery is not evaluated.

## Strengths

The dataset aligns real pressure, precise hand motion, object pose, mesh geometry, language, and task phases in one capture system. Its tactile-constrained annotation refinement is reusable beyond this specific RL method: measured pressure resolves ambiguity that geometry alone cannot.

The method also assigns clear roles to its three reward components. Guidance establishes contact, alignment shapes the distribution, and safety limits extreme behavior. The ablations show that these roles are complementary, and the safety analysis demonstrates why average tactile error is insufficient.

Finally, the benchmark defines tactile-aware success separately from kinematic success. This exposes a substantial evaluation blind spot: the kinematic baseline reaches 72.91% geometric success while only 39.35% of trials satisfy the tactile criterion.

## Limitations and Open Questions

The largest limitation is the absence of robot-side closed-loop touch during deployment. Real sensing could detect slip, unexpected contact, pose error, and material changes, but the current system cannot react to them online.

Several other questions remain:

1. The dataset contains 757 sequences and 49 objects, a strong multimodal collection with modest behavioral scale compared with modern video or robot corpora.
2. The tactile glove samples at 17 Hz, which may miss fast transients and limits direct study of high-frequency slip.
3. Human glove pressure and robot contact force differ in sensor geometry, compliance, contact area, and morphology. The sensor-to-simulation calibration is therefore a strong modeling assumption.
4. The dataset records 162 spatial sensing elements across fingers and palm, while TactiSkill largely compresses this signal into per-finger normal-force targets. Palm contact and within-finger pressure geometry remain underused.
5. The evaluation is predominantly simulation-based. Physical results lack repeated-trial statistics, object perturbations, unseen objects, and force measurements on the real robot.
6. The real Inspire hand is underactuated relative to the simulated model, and the final open-loop optimization can absorb part of the apparent transfer gain.
7. “Human-like” is operationalized as agreement with a recorded reference under selected force and contact metrics. The experiments do not establish a universal human contact strategy or physical human-likeness on hardware.
8. Some implementation descriptions deserve further clarification, including nonlinear versus linear sensor calibration and the dynamic versus fixed safety-force limit.

## Takeaways

TactiDex makes a strong case that contact should enter the human-to-robot pipeline in three places:

1. **annotation:** touch distinguishes real contact from geometric proximity;
2. **learning:** target contact timing and force distribution shape physically plausible policies;
3. **evaluation:** kinematic success must be paired with contact fidelity and peak-force safety.

The next step is a closed loop: use the TactiDex prior to initialize contact behavior, then let real robot tactile sensing correct force and slip during execution. That would extend tactile-guided transfer into tactile-reactive dexterous manipulation.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**TactiDex 提出了一个很准确的问题：如果机器人复现了人手轨迹的几何形状，却在错误的时间用错误的手指和力量接触物体，这项技能真的完成迁移了吗？** 论文的答案是否定的。它采集了同步的全手压力、手部运动学与物体轨迹，并把这些触觉轨迹作为结构化监督，用于基于强化学习的人到机器人技能迁移。

最容易被忽略的边界是：**TactiSkill 在数据处理和 policy training 阶段由触觉引导，论文中的真实机器人部署没有使用在线触觉反馈。** 人类触觉参考定义期望接触模式，仿真接触力进入 reward 和 critic，学习得到的轨迹随后被重定向到实体灵巧手并开环执行。因此，这项工作证明了 tactile-supervised trajectory generation 和 sim-to-real transfer；闭环触觉修正仍属于未来工作。

## 论文信息

论文 **“TactiDex: A Real-World Tactile-Guided Benchmark for Human-Like Dexterous Manipulation”** 的作者是 **Suting Ni、Hanbing Zhang、Zhenyu Wei、Guo Chen、Chixuan Zhang、Ye Shi 和 Jingya Wang**，来自 **ShanghaiTech University** 和 **InstAdapt**。论文已被 **ACM Multimedia 2026** 接收。本文依据 **arXiv:2607.09190v1**，提交日期为 **2026 年 7 月 10 日**。

- [论文](https://arxiv.org/abs/2607.09190)
- [PDF](https://arxiv.org/pdf/2607.09190)
- [项目主页与视频](https://tactidex.github.io/)

论文包含两个紧密连接的贡献：

1. **TactiDex：** 带丰富触觉的人类手物交互数据集与 contact-aware benchmark；
2. **TactiSkill：** 使用三段式触觉奖励的 residual RL 迁移方法。

## 为什么运动学匹配还不够

常见的人到机器人迁移会优化手部姿态、关节运动、指尖位置、手腕轨迹和物体轨迹。这些目标描述手和物体应该移动到哪里，却无法区分若干物理上完全不同的执行方式：

- 指尖可能悬停在物体表面几毫米之外；
- 手部 mesh 可能穿透物体，同时保持很低的 joint-space error；
- 正确的物体运动可能由错误的手指接触产生；
- 平均力看似合理，但存在短暂的破坏性尖峰；
- 视觉相似的抓取可能在整只手上形成完全不同的载荷分布。

TactiDex 把接触变成可测量监督。迁移目标由此涵盖**哪些手指接触、接触何时发生、力量如何分布，以及瞬态力是否安全**。

## TactiDex 数据集

数据集把高精度 motion capture 与双层手套系统结合。内层运动捕捉手套记录 articulated hand kinematics，外层触觉手套记录整只手的空间压力分布。OptiTrack 在统一全局坐标系中跟踪手腕与物体，物体还会被重建成可用于仿真的 mesh。

| 属性 | TactiDex 规格 |
|---|---|
| 参与者 | 10 人 |
| 物体 | 49 个完成标定的日常物体 |
| 交互序列 | 757 条 |
| 总规模 | 约 510 万帧 |
| 任务形式 | 左手、右手和双手 |
| 触觉阵列 | 162 个压阻式 sensing elements，分布在指尖和手掌 |
| 触觉采样率 | 17 Hz |
| 报告的力分辨率 | 最高 0.01 N |
| 运动捕捉 | 8 台 OptiTrack PX13W，相机频率 120 Hz |
| 捕捉空间 | (1.2\,\mathrm{m}\times1.8\,\mathrm{m}) |
| 其他标注 | 手腕/物体 6D pose、MANO hand state、task ID、interaction phase、语言描述 |

物体集合包含刚性日用品、易损物、容器、工具和成对部件，例如盖子、研磨棒和容器，因此可以支持功能性长时程交互。作者报告系统标定后的 motion-capture mean ray error 为 **0.2 mm**。

各数据流的原始频率并不相同，因此同步是采集系统的重要组成部分。eSync 模块与共享采集 pipeline 把 120 Hz 位姿/运动学数据与低频触觉测量对齐到帧级。

## 触觉约束的标注优化

原始 motion capture 仍会产生手指悬空、near-contact 歧义和 mesh 穿透。TactiDex 分两个阶段细化拟合后的 MANO motion。

第一步使用 L-BFGS 把 MANO 参数拟合到捕捉得到的 3D keypoints。同一参与者的所有帧共享 shape 参数，pose regularization 与二阶 temporal smoothness 用于抑制抖动。

随后，触觉证据决定哪些几何关系属于真实接触：

1. **检测接触区间：** 用实测压力约束几何邻近关系，过滤 3D 上看似接近、实际没有力的帧；
2. **优化参考抓取：** 在每个接触区间选择稳定帧。压力超过阈值的手指获得更强的表面吸引权重，未激活手指被降权，避免生成虚假接触；
3. **时间传播：** 通过 inverse kinematics 把细化后的抓取传播到整个接触区间，同时保留其他自由空间动作；
4. **碰撞修正：** 使用物体 Signed Distance Field 消除剩余的手物穿透。

这是论文最强的思想之一。触觉在 policy learning 之前就作为标注证据，解决纯几何无法判断的接触歧义。

## TactiSkill：把 Residual RL 变成 Force Modulator

TactiSkill 从冻结的运动学 imitation policy (pi_{\mathrm{base}}) 出发，再学习 residual policy (pi_{\mathrm{res}})：

\[
\pi^*=\pi_{\mathrm{base}}+\pi_{\mathrm{res}}.
\]

动作为 residual joint-position target，

\[
a_t=\Delta q_t,
\]

并由低层 PD controller 执行。Residual policy 的任务比普通 tracking correction 更具体：它调整关节配置，使仿真指尖力跟随人类触觉参考，同时继续追踪目标手部与物体运动。

### 1. 从人类传感器映射到仿真力

触觉手套输出原始 ADC 数值，PhysX 提供以 Newton 为单位的接触力。Finger-wise calibration map 把记录信号转换成仿真兼容的 force reference：

\[
F^{\mathrm{human}}_t=\mathcal{M}(\mathrm{ADC}_t).
\]

正文把 (mathcal{M}) 描述成逐指非线性映射，附录给出的却是标定后的线性形式：

\[
F=k(\mathrm{ADC}_{\mathrm{raw}}-\mathrm{ADC}_{\mathrm{offset}}).
\]

这个映射是可复现性的关键接口，因为传感器标定直接决定目标力的尺度。

### 2. Asymmetric Actor–Critic

训练使用带非对称信息的 PPO。Actor 接收可部署的 proprioception 和目标参考，其中包括人类 target tactile signal；critic 额外接收 privileged simulation state：精确物体动力学、质心、关节速度，以及实时仿真指尖接触力。

对于一只 12-DoF Inspire hand，附录给出的维度是：

| 输入 | 维度 | 内容 |
|---|---:|---|
| Proprioceptive state | 46 | 关节、正余弦编码、手腕位姿与速度 |
| Target reference | 330 | 物体 BPS、目标触觉距离、未来手腕/手部/物体轨迹 |
| Critic privileged state | 49 | 精确物体动力学、3D 指尖力与模长、内部物理状态 |
| Actor input | 376 | proprioception + target |
| Critic input | 425 | actor input + privileged state |
| Action | 12 | residual joint-position targets |

双手设置的维度加倍。Actor 与 critic 都采用 hidden size 为 ([512,256,128])、使用 ELU activation 的 MLP。

## 三段式触觉奖励

触觉奖励为：

\[
R_{\mathrm{tactile}}
=w_g r_{\mathrm{guide}}
+w_a r_{\mathrm{align}}
+w_s r_{\mathrm{safe}}.
\]

三个分量分别阻止不同的失败模式。

### Contact guidance：让目标接触真正发生

对于 (N_f) 根手指和接触阈值 (	au)，只有仿真信号与人类信号都表示 active contact 时，policy 才获得奖励：

\[
r_{\mathrm{guide}}
=\frac{1}{N_f}\sum_{i=1}^{N_f}
\mathbf{1}(F_i^{\mathrm{sim}}>\tau)
\mathbf{1}(F_i^{\mathrm{human}}>\tau).
\]

这个分量相当于 contact trigger，用于减少 air grasping。报告的训练阈值是 **0.3 N**。

### Human-like alignment：匹配跨手指的力分布

只有接触仍然不够。TactiSkill 用有界的 Tanh distance 对齐每根手指的力：

\[
r_{\mathrm{align}}
=\frac{1}{N_f}\sum_{i=1}^{N_f}
\left[
1-\tanh\left(
\frac{|F_i^{\mathrm{sim}}-F_i^{\mathrm{human}}|}{\sigma}
\right)
\right].
\]

有界 metric 降低了 tactile outlier 的影响，在提供有效梯度的同时，让机器人复现人类示范中的跨手指 force distribution。

### Contact safety：抑制力尖峰

当仿真力超过允许范围时，安全项施加指数惩罚：

\[
r_{\mathrm{safe}}
=\exp\left[
-\lambda\sum_{i=1}^{N_f}
\max(0,F_i^{\mathrm{sim}}-F_{\mathrm{limit}})^2
\right].
\]

正文使用相对人类参考的限制 (F_i^{\mathrm{human}}+\delta)，hyperparameter table 还列出了 **40 N safety force limit**。两者的设计意图一致：平均力对齐还需要额外机制限制少量大冲击。

完整目标把触觉结构与 pose imitation、object tracking、task completion、能耗和速度正则结合：

\[
R_{\mathrm{total}}
=\lambda_{\mathrm{im}}r_{\mathrm{im}}
+\lambda_{\mathrm{task}}r_{\mathrm{task}}
+\lambda_{\mathrm{reg}}r_{\mathrm{reg}}
+\lambda_{\mathrm{tactile}}R_{\mathrm{tactile}}.
\]

## 评测：几何、触觉与安全

主要评测使用 **73 条代表性序列**，包含单手和双手任务。Benchmark 分成四个维度：

- **几何：** 物体平移/旋转误差、MPJPE 和 fingertip error；
- **触觉保真度：** mean tactile force error（MTFE）与 contact F1；
- **安全：** PeakSafe@3N 与 SafeTac@3N；
- **任务结果：** kinematic success (SR_{\mathrm{kin}}) 和 tactile-aware success (SR_{\mathrm{tac}})。

(SR_{\mathrm{kin}}) 要求物体旋转误差不超过 (30^\circ)、平移误差不超过 3 cm、MPJPE 不超过 8 cm、指尖误差不超过 6 cm。(SR_{\mathrm{tac}}) 进一步要求 MTFE 不超过 3 N 且 contact F1 至少为 0.3。双手任务需要两只手同时满足空间条件。

| 方法 | (SR_{\mathrm{kin}}) | (SR_{\mathrm{tac}}) | OTE-t | Contact F1 | PeakSafe@3N | SafeTac@3N |
|---|---:|---:|---:|---:|---:|---:|
| Kinematic baseline | 72.91% | 39.35% | 1.1947 cm | 0.5569 | 63.66% | 35.84% |
| TactiSkill without contact bonus | 76.87% | 41.93% | 1.2031 cm | 0.5425 | 57.00% | 35.68% |
| TactiSkill without alignment | 76.37% | 42.20% | 1.0828 cm | 0.5134 | 59.88% | 34.41% |
| TactiSkill without safety | 77.05% | 41.24% | 1.0265 cm | 0.5686 | 68.70% | 38.72% |
| **TactiSkill full** | **81.95%** | **64.64%** | **0.9577 cm** | **0.7384** | **72.80%** | **53.57%** |

完整方法相对 kinematic baseline 把 tactile-aware success 提升了 **25.29 个百分点**，kinematic success 也提升了 **9.04 个百分点**。这支持了论文的 physical regularization 论点：接触监督帮助 policy 避开几何上方便、物理上无效的最优点。

安全项消融尤其有信息量。移除 safety term 后，mean tactile error 降到最低的 **0.0921 N**，但 SafeTac@3N 只有 **38.72%**，完整方法达到 **53.57%**。平均误差会隐藏少量破坏性事件，因此 contact-rich control 必须同时报告 peak 和 episode-level metrics。

## 真实机器人部署

实体平台使用两台 7-DoF Franka Panda 和两只 Inspire dexterous hands。仿真手有 12 DoF，实体 Inspire hand 只有 6 个独立 actuator。Offline optimization 把仿真轨迹映射成六维 actuator command，目标同时考虑指尖位置匹配、靠近 heuristic anchor mapping，以及时间平滑：

\[
\mathcal{L}
=W_{\mathrm{pos}}\mathcal{L}_{\mathrm{pos}}
+W_{\mathrm{anchor}}\mathcal{L}_{\mathrm{anchor}}
+W_{\mathrm{smooth}}\mathcal{L}_{\mathrm{smooth}}.
\]

附录使用 50、20 和 10 三个权重。Franka 机械臂通过 100 Hz operational-space controller 跟踪相对手腕 delta pose，优化后的手部命令经串口发送。论文展示了打电话、操作盖子、烹饪、倒液体和切割等单手/双手定性结果。

这些部署证据需要谨慎解读：

- 实体手的触觉信号**没有反馈给 policy**；
- 手部在 offline retargeting 后开环执行；
- 论文展示了代表性视频和截图，没有提供真实机器人重复试验表或 hardware success rate；
- 因而，实验验证的是 tactile-shaped simulation trajectory 的迁移价值，还没有评估 online contact recovery。

## 优点

数据集在同一采集系统里对齐了真实压力、精确手部运动、物体位姿、mesh geometry、语言和任务阶段。触觉约束标注优化也可以独立于这套 RL 方法复用：实测压力解决了纯几何无法判断的歧义。

方法对三个 reward component 的分工也很清楚。Guidance 建立接触，alignment 调整分布，safety 限制极端行为。消融实验显示三者互补，安全性分析进一步说明 average tactile error 无法替代峰值指标。

最后，benchmark 把 tactile-aware success 与 kinematic success 分开定义，直接暴露了传统评测的盲点：kinematic baseline 的几何成功率达到 72.91%，满足触觉条件的试验只有 39.35%。

## 局限与开放问题

最大的限制是部署阶段缺少 robot-side closed-loop touch。真实触觉可以检测滑移、意外接触、位姿误差和材质变化，当前系统无法在线响应这些事件。

还有几个问题需要后续回答：

1. 数据集包含 757 条序列和 49 个物体，是高质量多模态集合，但行为规模低于现代视频或机器人数据集；
2. 触觉手套采样率为 17 Hz，可能遗漏快速瞬态，也限制了对高频 slip 的直接研究；
3. 人类手套压力与机器人接触力在传感器几何、柔顺性、接触面积和形态上不同，sensor-to-simulation calibration 因此包含很强的建模假设；
4. 数据集记录了手指和手掌上的 162 个空间 sensing elements，TactiSkill 则主要把它们压缩成逐指 normal-force target；手掌接触和单根手指内部的压力几何没有得到充分利用；
5. 主要量化评测位于仿真。实体实验缺少重复试验统计、物体扰动、未见物体和真实机器人力测量；
6. 实体 Inspire hand 相对仿真模型存在欠驱动，最终 open-loop optimization 可能吸收了部分表观迁移增益；
7. “Human-like” 在论文中被操作化为：在给定 force/contact metric 下与某条人类参考一致。实验还没有证明普遍的人类接触策略，也没有在硬件上测量物理 human-likeness；
8. 一些实现描述还需要进一步澄清，包括 nonlinear/linear sensor calibration，以及 dynamic/fixed safety-force limit。

## 总结

TactiDex 有力说明了接触应该在 human-to-robot pipeline 的三个位置发挥作用：

1. **标注：** 用触觉区分真实接触与几何邻近；
2. **学习：** 用目标接触时序和力分布塑造物理可行的 policy；
3. **评测：** 让 kinematic success 与 contact fidelity、peak-force safety 同时出现。

下一步应该形成闭环：用 TactiDex prior 初始化接触行为，再让真实机器人触觉在执行时修正力与滑移。这样才能把 tactile-guided transfer 进一步推进到 tactile-reactive dexterous manipulation。

</div>
