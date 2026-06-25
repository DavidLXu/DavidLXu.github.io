---
title: "[Paper Notes] GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction"
date: 2026-06-26
permalink: /posts/2026/06/gentlehumanoid-compliance-paper-notes/
tags:
  - Humanoid Robots
  - Compliance Control
  - Human-Robot Interaction
  - Reinforcement Learning
  - Whole-Body Control
  - Paper Notes
---

<div data-lang="en" markdown="1">

## TL;DR

**GentleHumanoid** is a whole-body humanoid control framework for safe upper-body contact. The paper's main move is to make compliance part of the motion-tracking target itself: shoulder, elbow, and hand links are governed by a spring-damper reference dynamics model, then an RL policy learns to reproduce that compliant reference while still tracking human-like motion.

My read: this is best understood as **impedance reference tracking for upper-body humanoid interaction**. The policy still outputs joint position targets for low-level PD control, but the reward asks the robot to behave like a multi-link impedance system under simulated contact. That changes the training problem from rigid motion imitation to motion imitation with bounded, coordinated yielding.

## Paper Info

The paper is **"GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction"** by **Qingzhou Lu, Yao Feng, Baiyu Shi, Michael Piseno, Zhenan Bao, and C. Karen Liu** from **Stanford University**. It appears on arXiv as [arXiv:2511.04679](https://arxiv.org/abs/2511.04679), dated **November 6, 2025**. The project page is [gentle-humanoid.axell.top](https://gentle-humanoid.axell.top/), and the deployment code is available at [Axellwppr/gentle-humanoid](https://github.com/Axellwppr/gentle-humanoid).

The showcased tasks are deliberately physical: handshaking with a **5 N** force limit, sit-to-stand support, shape-aware hugging, and balloon handling. These are the right examples for the paper because they expose the weakness of stiff tracking controllers: they can follow a pose, but they do not know when to give way.

## Core Problem

Recent humanoid RL has become strong at whole-body motion tracking. A Unitree G1 can imitate expressive upper-body motions, walk, recover, and execute long motion clips. But rigid tracking is uncomfortable and unsafe when a human is part of the contact loop. A hug should yield around the partner's body, a handshake should move with the human hand, and sit-to-stand assistance should provide firm support without spiking contact force.

The key difficulty is that upper-body contact is not localized to one end effector. In hugging or support, the hand, elbow, shoulder, torso, and arm chain can all participate. A controller that only adapts the wrist or base misses the coupled nature of the interaction. GentleHumanoid therefore models compliance over multiple upper-body links instead of treating external forces as disturbances to suppress.

## Reference Dynamics

GentleHumanoid starts from a simple second-order model for each upper-body link:

\\[
M\ddot{x}_i = f_{\mathrm{drive},i} + f_{\mathrm{interact},i}
\\]

Here \\(x_i\\) is the 3D Cartesian position of a link such as a shoulder, elbow, or hand in the robot root frame. \\(M\\) is a scalar virtual mass, set to **0.1 kg** in the reference model. The total behavior comes from two forces.

The **driving force** pulls the link toward the target motion:

\\[
f_{\mathrm{drive}} =
K_p(x_{\mathrm{tar}} - x_{\mathrm{cur}})
+ K_d(v_{\mathrm{tar}} - v_{\mathrm{cur}})
\\]

This is classical impedance control: the target motion acts like a virtual spring-damper. The damping is set near critical damping, \\(K_d = 2\sqrt{M K_p}\\), so the reference does not oscillate unnecessarily.

The **interaction force** represents contact with humans or objects:

\\[
f_{\mathrm{interact}} =
K_{\mathrm{spring}}(x_{\mathrm{anchor}} - x_{\mathrm{cur}})
\\]

The clever part is how the anchor is chosen. GentleHumanoid uses one unified spring formulation for two contact cases:

- **Resistive contact:** when the robot presses against a surface, the anchor is fixed at the initial contact point. The spring produces a restoring force.
- **Guiding contact:** when an external agent pushes or pulls the robot, the anchor is sampled from plausible upper-body postures in human motion data. The spring guides the robot toward a new coordinated pose.

This matters because the sampled anchor is not an independent random offset for each link. It comes from complete human upper-body postures, so the shoulder, elbow, and hand forces remain kinematically consistent. That is the paper's main answer to multi-link compliance: generate simulated contact that already respects the body chain.

## Force Thresholding

Unbounded impedance tracking can still be unsafe. If the target motion and current link position differ a lot, the virtual spring can demand a large force. GentleHumanoid caps the driving force with a task-adjustable threshold:

\\[
f_{\mathrm{drive}}^{\mathrm{limited}} =
\min\left(1.0, \frac{\tau_{\mathrm{safe}}}{\|f_{\mathrm{drive}}\|}\right)
f_{\mathrm{drive}}
\\]

The policy observes \\(\tau_{\mathrm{safe}}\\), so compliance becomes tunable at deployment. Lower thresholds produce softer interactions for hugging and handshaking; higher thresholds allow firmer support for sit-to-stand assistance.

The paper trains with force limits sampled between **5 N** and **15 N**. It explicitly relates this range to ISO/TS 15066 pain-onset limits and comfort studies. For realistic hugging contact areas, the resulting pressure range is reported as roughly **3-9 kPa**, in the same band as soft human hugs and below common comfort thresholds.

## Policy Training

The RL policy is trained to track the impedance reference dynamics, not merely the original motion clip. The reference positions and velocities are integrated with semi-implicit Euler:

\\[
\dot{x}_{t+1}^{\mathrm{ref}} =
\dot{x}_{t}^{\mathrm{ref}} +
\Delta t \frac{f_{\mathrm{drive}} + f_{\mathrm{interact}}}{M}
\\]

\\[
x_{t+1}^{\mathrm{ref}} =
x_t^{\mathrm{ref}} + \Delta t \dot{x}_{t+1}^{\mathrm{ref}}
\\]

The policy uses a teacher-student PPO setup for sim-to-real. The student receives deployable observations: the force-safety threshold, target motion information, root angular velocity, projected gravity, joint-position history, and recent action history. The teacher additionally sees privileged simulation/reference signals, including reference link states, predicted and actual interaction forces, link heights, previous torques, and cumulative tracking error.

Both policies output **29-dimensional joint position targets** at **50 Hz**, tracked by low-level joint PD controllers. Training motions come from GMR-retargeted **AMASS**, **InterX**, and **LAFAN**, filtered down to about **25 hours** of interaction-relevant motion at **50 Hz**.

The compliance reward has three parts:

- **Reference dynamics tracking:** match simulated link positions and velocities to the impedance reference.
- **Reference force tracking:** align simulated contact forces with the force predicted by the reference dynamics.
- **Unsafe force penalty:** penalize interaction force above \\(\tau_{\mathrm{safe}} + \delta_{\mathrm{tol}}\\), with \\(\delta_{\mathrm{tol}} = 10\,\mathrm{N}\\).

This reward is the mechanism that turns the analytic impedance model into a deployable neural whole-body policy.

## Experiments

The simulation comparison uses a hugging motion with external pulling force. GentleHumanoid keeps forces lower and more stable across the hand, elbow, and shoulder. At the hand, it stabilizes around **10 N**, while Vanilla-RL exceeds **20 N** and Extreme-RL exceeds **13 N**. At elbow and shoulder links, the baselines saturate around **15-20 N**, while GentleHumanoid stays closer to **7-10 N**.

On the Unitree G1, the first real-world test applies external wrist force in a static pose. The baselines resist stiffly and move the torso instead of yielding at the arm. Extreme-RL requires a peak force of **51.14 N** to reposition the arm, and Vanilla-RL requires **24.59 N**. GentleHumanoid yields more smoothly and keeps the response near the specified force threshold across different postures.

The hugging evaluation uses customized waist-mounted pressure pads with **40 calibrated capacitive taxels**. The robot hugs a mannequin under correct alignment and intentional misalignment. GentleHumanoid maintains moderate, bounded contact pressure, while baselines create localized pressure peaks and less predictable force profiles.

The object test uses balloon handling with the force threshold set to **5 N**. GentleHumanoid holds the balloon without damaging it. The baselines apply excessive pressure, deform the balloon, and eventually lose balance and drop it.

The paper also shows a shape-aware hugging pipeline. A head-mounted RGB camera estimates a human body mesh, the system extracts waist targets, and an optimization step adapts the G1 upper-body hugging motion to the person's body shape. This is more than a demo trick: it connects compliance control with perception, where the robot must choose both a comfortable target pose and a safe contact response.

## Limitations

The main limitation is contact realism. The training force model uses simulated spring forces, which provide structure and coverage, but real human contact includes friction, tissue deformation, clothing, delayed human response, and complex distributed pressure. The paper reports occasional **1-3 N** force overshoots on hardware from sim-to-real mismatch, suggesting that tactile feedback would be useful for tighter force regulation.

The method also depends on the diversity of human motion data. Because guiding forces are sampled from retargeted human postures, the force distribution inherits the coverage of those datasets. The authors note that shoulder forces remain relatively small due to limited motion variation; richer datasets such as dancing could improve coverage.

Finally, autonomous hugging still uses motion capture for human location and height. Replacing that with a fully vision-based localization and scaling pipeline would make the system more practical outside a lab.

## Takeaways

GentleHumanoid is useful because it gives compliance a concrete training interface. Instead of hoping a motion-tracking policy becomes safe after perturbation randomization, it defines a multi-link impedance reference, exposes the policy to kinematically consistent contact forces, and makes the force limit an explicit input. The result is a humanoid controller whose softness can be adjusted by task: gentle for hugging and balloons, firmer for sit-to-stand support.

The broader lesson is that humanoid interaction needs controller-aware learning targets. A policy trained only to match poses will treat contact as error. A policy trained to match compliant reference dynamics can treat contact as part of the motion.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**GentleHumanoid** 是一个面向安全上肢接触的 humanoid whole-body control framework。论文的关键做法是把 compliance 直接放进 motion-tracking target：shoulder、elbow、hand 这些 link 由 spring-damper reference dynamics 控制，然后用 RL policy 学会复现这个 compliant reference，同时继续跟踪人类动作。

我的理解：这篇最适合看成 **upper-body humanoid interaction 的 impedance reference tracking**。policy 最终仍然输出给 low-level PD controller 的 joint position targets，但 reward 要求机器人表现得像一个 multi-link impedance system。训练目标因此从刚性模仿动作，变成了带有 bounded、coordinated yielding 的动作模仿。

## Paper Info

论文标题是 **"GentleHumanoid: Learning Upper-body Compliance for Contact-rich Human and Object Interaction"**，作者是 **Qingzhou Lu、Yao Feng、Baiyu Shi、Michael Piseno、Zhenan Bao 和 C. Karen Liu**，来自 **Stanford University**。论文在 arXiv 上是 [arXiv:2511.04679](https://arxiv.org/abs/2511.04679)，日期为 **2025 年 11 月 6 日**。项目页是 [gentle-humanoid.axell.top](https://gentle-humanoid.axell.top/)，部署代码在 [Axellwppr/gentle-humanoid](https://github.com/Axellwppr/gentle-humanoid)。

论文展示的任务都很依赖物理接触：**5 N** force limit 的握手、sit-to-stand support、shape-aware hugging，以及 balloon handling。这些例子选得很准，因为它们暴露了 stiff tracking controller 的核心问题：可以跟 pose，但不知道什么时候该让。

## Core Problem

最近的 humanoid RL 已经很擅长 whole-body motion tracking。Unitree G1 可以模仿上肢动作、行走、恢复平衡和执行较长动作片段。但当人进入 contact loop 后，rigid tracking 会变得不舒服也不安全。拥抱应该顺着对方身体让开，握手应该跟随人的手移动，sit-to-stand assistance 则需要提供稳定支撑，同时避免 contact force spike。

难点在于，upper-body contact 通常超出了单个 end effector。拥抱或支撑时，hand、elbow、shoulder、torso 和整条 arm chain 都可能参与接触。只适配 wrist 或 base 的 controller 会漏掉这种 coupled interaction。GentleHumanoid 因此把 compliance 建模在多个 upper-body links 上，并避免把 external force 简化成需要压制的 disturbance。

## Reference Dynamics

GentleHumanoid 对每个 upper-body link 使用一个简单的二阶模型：

\\[
M\ddot{x}_i = f_{\mathrm{drive},i} + f_{\mathrm{interact},i}
\\]

这里 \\(x_i\\) 是 shoulder、elbow、hand 等 link 在 robot root frame 下的 3D Cartesian position。\\(M\\) 是 scalar virtual mass，reference model 中设为 **0.1 kg**。整体行为来自两类 force。

**Driving force** 把 link 拉向目标动作：

\\[
f_{\mathrm{drive}} =
K_p(x_{\mathrm{tar}} - x_{\mathrm{cur}})
+ K_d(v_{\mathrm{tar}} - v_{\mathrm{cur}})
\\]

这是经典 impedance control：目标动作相当于一个 virtual spring-damper。damping 设在接近 critical damping 的形式，\\(K_d = 2\sqrt{M K_p}\\)，避免 reference dynamics 产生不必要的振荡。

**Interaction force** 表示和人或物体的接触：

\\[
f_{\mathrm{interact}} =
K_{\mathrm{spring}}(x_{\mathrm{anchor}} - x_{\mathrm{cur}})
\\]

这里最关键的是 anchor 怎么选。GentleHumanoid 用同一个 spring formulation 覆盖两类 contact：

- **Resistive contact:** 机器人压到人或物体时，anchor 固定在初始接触点，spring 产生 restoring force。
- **Guiding contact:** 外部主体推或拉机器人时，anchor 从人类动作数据中的 plausible upper-body posture 采样，把机器人引导到新的协调姿态。

重点是这个 anchor 不是每个 link 独立随机偏移。它来自完整的人体上肢 posture，所以 shoulder、elbow、hand 的 force 在运动学上保持一致。这是论文处理 multi-link compliance 的主要机制：训练时生成的模拟接触本身就尊重 body chain。

## Force Thresholding

没有限制的 impedance tracking 仍然可能不安全。如果目标动作和当前 link 位置差得很远，virtual spring 会产生很大的 force。GentleHumanoid 用 task-adjustable threshold 限制 driving force：

\\[
f_{\mathrm{drive}}^{\mathrm{limited}} =
\min\left(1.0, \frac{\tau_{\mathrm{safe}}}{\|f_{\mathrm{drive}}\|}\right)
f_{\mathrm{drive}}
\\]

policy 会观测 \\(\tau_{\mathrm{safe}}\\)，所以 compliance 在部署时可调。较低 threshold 对应 hugging 和 handshaking 里的柔和接触；较高 threshold 对应 sit-to-stand assistance 里的更强支撑。

论文训练时在 **5 N** 到 **15 N** 之间采样 force limit，并把这个范围和 ISO/TS 15066 pain-onset limits 以及 comfort studies 对齐。对于更真实的 hugging contact area，论文报告的 pressure range 大约是 **3-9 kPa**，和 soft human hugs 的压力范围相近，也低于常见 comfort threshold。

## Policy Training

RL policy 训练时跟踪的是 impedance reference dynamics，同时保留对原始 motion clip 的动作语义。reference positions 和 velocities 用 semi-implicit Euler 积分：

\\[
\dot{x}_{t+1}^{\mathrm{ref}} =
\dot{x}_{t}^{\mathrm{ref}} +
\Delta t \frac{f_{\mathrm{drive}} + f_{\mathrm{interact}}}{M}
\\]

\\[
x_{t+1}^{\mathrm{ref}} =
x_t^{\mathrm{ref}} + \Delta t \dot{x}_{t+1}^{\mathrm{ref}}
\\]

policy 使用 teacher-student PPO 结构做 sim-to-real。student 只接收部署时可用的观测：force-safety threshold、target motion information、root angular velocity、projected gravity、joint-position history 和 recent action history。teacher 额外看到 privileged simulation/reference signals，包括 reference link states、预测和实际 interaction forces、link heights、previous torques 以及 cumulative tracking error。

两种 policy 都输出 **29 维 joint position targets**，频率为 **50 Hz**，再由 low-level joint PD controller 跟踪。训练动作来自经过 GMR retarget 的 **AMASS**、**InterX** 和 **LAFAN**，过滤后得到约 **25 小时** interaction-relevant motion，采样频率为 **50 Hz**。

compliance reward 有三部分：

- **Reference dynamics tracking:** 让仿真中的 link positions 和 velocities 贴近 impedance reference。
- **Reference force tracking:** 让仿真 contact force 对齐 reference dynamics 预测的 force。
- **Unsafe force penalty:** 惩罚超过 \\(\tau_{\mathrm{safe}} + \delta_{\mathrm{tol}}\\) 的 interaction force，其中 \\(\delta_{\mathrm{tol}} = 10\,\mathrm{N}\\)。

这个 reward 是把解析 impedance model 变成可部署 neural whole-body policy 的关键桥梁。

## Experiments

仿真实验使用 hugging motion，并加入外部 pulling force。GentleHumanoid 在 hand、elbow 和 shoulder 上都保持更低、更稳定的 force。hand link 上，它稳定在约 **10 N**；Vanilla-RL 超过 **20 N**，Extreme-RL 超过 **13 N**。elbow 和 shoulder 上也类似：baselines 很快接近 **15-20 N**，GentleHumanoid 更接近 **7-10 N**。

真实 Unitree G1 上，第一个实验是在 static pose 下对 wrist 施加外力。两个 baseline 都表现得很 stiff：arm 不顺着力移动，torso 反而开始偏移。Extreme-RL 需要 **51.14 N** peak force 才能重新摆动手臂，Vanilla-RL 需要 **24.59 N**。GentleHumanoid 更平滑地让开，并且在不同姿态下都把响应控制在指定 force threshold 附近。

hugging evaluation 使用定制的 waist-mounted pressure pads，包含 **40 个 calibrated capacitive taxels**。机器人在正确对齐和故意错位两种情况下拥抱 mannequin。GentleHumanoid 保持 moderate、bounded contact pressure；baselines 则产生局部 pressure peaks，并且 force profile 更不可预测。

object test 使用 balloon handling，force threshold 设为 **5 N**。GentleHumanoid 可以拿住气球而不损坏；两个 baseline 施加过大压力，使气球变形，最后 G1 失去平衡并掉落气球。

论文还展示了 shape-aware hugging pipeline。G1 头部 RGB camera 估计人体 mesh，系统提取 waist targets，再通过优化把 G1 upper-body hugging motion 适配到不同人的身体形状。这个 pipeline 把 compliance control 和 perception 接了起来：机器人既要选择舒服的目标姿态，也要在接触后保持安全响应。

## Limitations

主要局限是 contact realism。训练中的 force model 使用 simulated spring forces，这能提供结构化覆盖和 kinematic consistency，但真实 human contact 还包含 friction、tissue deformation、clothing、人的延迟反应，以及复杂的 distributed pressure。论文报告了硬件上偶发的 **1-3 N** force overshoot，来自 sim-to-real mismatch；这说明更精确的 force regulation 可能需要 tactile feedback。

方法也依赖 human motion data 的覆盖度。guiding forces 来自 retargeted human postures，所以 force distribution 会继承这些数据集的覆盖范围。作者提到 shoulder forces 相对较小，原因是记录动作里的变化有限；加入 dancing 等更丰富的数据集可能改善覆盖。

最后，autonomous hugging 目前仍然用 motion capture 获得人的位置和身高。用完全 vision-based 的 localization 和 scaling pipeline 替代这部分，会让系统更适合实验室外使用。

## Takeaways

GentleHumanoid 的价值在于给 compliance 一个非常具体的训练接口。它没有指望 motion-tracking policy 通过 perturbation randomization 自然变安全，而是定义 multi-link impedance reference，生成 kinematically consistent contact forces，并把 force limit 作为显式输入。最终得到的 humanoid controller 可以按任务调节 softness：拥抱和气球处理更柔和，sit-to-stand support 更有支撑力。

更大的启发是：humanoid interaction 需要 controller-aware learning targets。只学 pose tracking 的 policy 会把 contact 看成 error；学 compliant reference dynamics 的 policy 才能把 contact 当作 motion 的一部分。

</div>
