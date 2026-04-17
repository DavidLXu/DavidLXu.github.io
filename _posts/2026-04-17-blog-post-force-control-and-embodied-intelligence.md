---
title: "Force Control and the Missing Layer in Embodied Intelligence"
date: 2026-04-17
permalink: /posts/2026/04/force-control-and-embodied-intelligence/
excerpt: "A late-night conversation over grilled skewers revealed a gap: most embodied AI researchers don't think about what the robot arm is actually doing at the control level — and closing that gap might reshape how we think about action spaces."
tags:
  - Embodied Intelligence
  - Force Control
  - Impedance Control
  - Admittance Control
  - Robotics
  - Personal Thoughts
---

<div data-lang="en" markdown="1">
This post supports **English / 中文** switching via the site language toggle in the top navigation.

## A Gap I Didn't Know I Had

Late one night, over grilled skewers, a friend who builds measurement and control systems for robotic arms said something that stuck with me: most people doing embodied AI algorithms have no real picture of what the arm is doing below the policy level. They send out position targets, the arm moves, and they treat everything in between as a solved problem — a hardware detail.

He was right. I was one of those people.

We ended up spending the rest of the night talking through admittance control, impedance control, the MIT control protocol, and what all of it might mean for how embodied intelligence should be designed. This post is an attempt to write down what I learned, and where I think it leads.

## Two Ways to Think About Control

The vocabulary is slightly confusing because the words "admittance" and "impedance" mean something specific in control engineering that does not map cleanly onto "admittance control" and "impedance control" as strategies. Let me try to be precise.

**Admittance** and **impedance** as system properties describe the same thing from opposite directions. A high-impedance system resists force — push on it and it doesn't move much. A high-admittance system yields readily to force — push on it and it deforms easily. The two are inverses of each other: high impedance means low admittance, and vice versa.

When we talk about **admittance control** and **impedance control** as strategies, we are talking about something different — about what the controller is designed to regulate.

**Admittance control** targets force directly. The controller drives the robot to whatever position is necessary to produce the desired contact force. Position is just the means; force is the goal. If you want the finger to press against a surface with 2 N, the controller moves the joint until that force is achieved, backed by a force sensor or tactile feedback. This is the way human hands actually work: we sense force at our fingertips and adjust grip accordingly, largely ignoring the precise angular position of our joints.

**Impedance control** does not target either force or position directly. Instead, it specifies a *dynamic relationship* between position error and force. The robot is told to behave as if it were a mechanical system with a particular stiffness, damping, and effective inertia — a virtual mass-spring-damper. The classic formulation looks like:

$$F = M \ddot{x}_e + B \dot{x}_e + K x_e$$

where \\(x_e\\) is the position error and \\(F\\) is the contact force. The controller does not say "go to position X" or "produce force F." It says "if you are displaced by \\(x_e\\), respond as if this were a spring." The result is a robot that has a calibrated *compliance* — it gives way smoothly under unexpected contact rather than either holding rigid or going limp.

Impedance control is sometimes mislabeled "force-position hybrid control," which is misleading. Traditional hybrid control switches between force and position control on different axes or at different moments. Impedance control is neither — it defines a behavioral contract between displacement and force that holds continuously.

## The MIT Protocol and What It Actually Encodes

The MIT mini-cheetah control protocol, widely used in embodied AI robots (including arms like those from Damiao/DM) and quadrupeds, is a good lens for understanding impedance control in practice. The control law is:

$$\tau = K_p (q_d - q) + K_d (\dot{q}\_d - \dot{q}) + \tau\_{ff}$$

where \\(q_d\\) and \\(\dot{q}\_d\\) are target position and velocity, \\(q\\) and \\(\dot{q}\\) are current position and velocity, \\(K_p\\) and \\(K_d\\) are stiffness and damping gains, and \\(\tau\_{ff}\\) is a feedforward torque.

At first glance this looks like a standard PD controller with a feedforward term. But looking at each piece reveals something more:

- **The \\(K_d(-\dot{q})\\) term** (when target velocity is zero) is a pure damping term that dissipates energy from the system. This is not incidental — it is precisely the definition of mechanical damping, and it prevents oscillation without needing a separate velocity loop.

- **The \\(\tau\_{ff}\\) term** is where gravity compensation and friction compensation live. If you have a model of the robot's dynamics, you can cancel the forces that would otherwise bias the position. But critically, this term is also a torque command in its own right. If you zero out \\(K_p\\) and \\(K_d\\), what remains is a direct current (torque) command. The motor's inner current loop closes around this, making \\(\tau\_{ff}\\) a direct handle on the robot's output force.

- **The overall law** encodes the mass-spring-damper relationship. \\(K_p\\) is the virtual spring stiffness; \\(K_d\\) is the virtual damper. Together they define how the joint responds to displacement, which is exactly what impedance control means.

This is different from the classical cascaded three-loop architecture (position loop → velocity loop → current loop), where each loop's output is the next loop's reference. In the MIT scheme, position error, velocity error, and feedforward torque combine in parallel to produce the final torque command. The inner current loop still exists inside the motor drive, but the outer control law is not cascaded — it is a single composed expression.

The practical implication is compliance: if the robot cannot reach a target position because an obstacle is in the way, it does not stall out or fight — it exerts a force proportional to how far off it is, and yields when that force is exceeded.

## Why Embodied AI Researchers Don't Need to Know This — And Why They Should

Here is the interesting part.

Most current embodied AI systems use position control as their action space. The policy outputs target joint angles; the low-level controller executes them. This works, partly because of a subtle cancellation that happens in end-to-end learning.

With impedance-based controllers, there is a systematic gap between commanded positions and achieved positions — caused by gravity, friction, and the compliance of the controller itself. But because the *same gap* exists during data collection (teleoperation) and during policy deployment, the policy learns to anticipate it. If the arm consistently ends up 5 degrees short of the commanded angle, the policy simply learns to command 5 degrees further. The error is absorbed into the learned behavior rather than corrected at the control level.

This is why embodied AI does not, in practice, need the kind of meticulous gravity compensation and friction identification that industrial robot programming demands. Classical industrial arms are programmed with explicit motion plans that assume the arm reaches exactly where it is told. For that to work, every systematic error must be identified and corrected. Embodied AI, using a closed-loop learned policy, gets around this by treating the entire robot + controller as a black box whose behavior the policy learns to invert.

The gap, in other words, is real but harmless — as long as train and deploy environments are consistent.

This is also why embodied AI researchers rarely develop deep knowledge of robot dynamics. They do not need to. But that invisibility has a cost: when it matters — in sim-to-real transfer, in hardware changes, in unusual contact scenarios — the lack of a mental model becomes a liability.

## The Admittance Direction

If impedance control is the natural substrate for current embodied AI, admittance control points to where it might go next.

Consider what admittance control offers: a robot that is told to produce a certain contact force, and moves until it achieves it. This is how dexterous manipulation actually works. When a human picks up an egg, they do not compute the joint angles required to achieve contact — they feel the shell, adjust grip force continuously, and stop squeezing when the feedback says *enough*. Force at the fingertip is the primary sense; joint position is derivative.

Most robot hands and arms today do not work this way. They are position-controlled devices executing spatial plans. They have no native sense of contact force, and their controllers have no way to target it directly. Tactile sensors exist, but they are usually treated as perception inputs to the policy rather than as the control variable.

Admittance control changes the architecture: force becomes the action, and position becomes the consequence. This is a fundamentally different framing, and it maps much better onto manipulation tasks that require compliance — grasping fragile objects, inserting parts with tight tolerances, maintaining contact during tool use.

The challenge is that admittance control does not naturally pair with teleoperation-based data collection, which is currently the dominant paradigm for embodied AI. Teleoperation gives you position targets from the human operator. Translating those into force targets requires knowing the environment contact state — which you often do not have during demonstration collection.

## A Possible Path Forward

My friend's framing at the end of the night stayed with me:

> Maybe what we need is not purely admittance and not purely impedance, but a staged approach — impedance to approach and make contact, admittance to regulate once contact is established.

This decomposition maps onto the natural phases of manipulation: free-space motion (where position matters and contact forces are zero), contact establishment (where the transition needs to be smooth), and constrained manipulation (where force regulation is primary). A controller — or a learned policy — that knows which phase it is in could invoke the appropriate regime.

From a learning perspective, this suggests that action spaces for embodied AI might benefit from being richer than pure joint positions. Including target force as part of the action representation, or training policies that output impedance parameters rather than just position targets, could give the learning more room to express what the robot actually needs to do.

This is speculative. But the underlying point is less speculative: the control layer is not just a hardware detail. It shapes what the robot can sense, what it can express, and what failure looks like. Embodied AI researchers who treat it as a black box are giving up leverage.

## What I Took Away

Embodied intelligence is currently built on a control substrate that most of its practitioners do not think about. That substrate — impedance-based joint control — is, for the most part, a good match for end-to-end learning. Its systematic biases cancel out across train and deploy. Its compliance provides a buffer against modeling error.

But admittance control, force as the primary variable, maps more naturally onto what dexterous manipulation actually requires. Getting there will require bridging the gap between the high-level policy and the low-level controller in a way that current systems do not.

The people building that bridge are probably going to need to understand both sides.

</div>

<div data-lang="zh" markdown="1" style="display: none;">


本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## 一个我不知道自己有的认知盲区

某个深夜，在烧烤摊上，一个做机械臂运控系统的朋友说了一句让我一直记着的话：大部分做具身智能算法的人，根本不知道机械臂在 policy 层以下到底在干什么。他们发位置指令，臂动了，然后把中间发生的一切当作已解决的问题——硬件的事，不用管。

他说得对。我就是其中一个。

那天晚上我们接着聊了很久：导纳控制、阻抗控制、MIT 控制协议，以及这些对具身智能设计意味着什么。这篇文章是我试图把那晚学到的东西写下来，以及我认为它指向哪里。

## 两种控制思路

术语这里有点绕，因为"导纳"和"阻抗"作为系统特性，和"导纳控制"、"阻抗控制"作为控制策略，说的并不是同一件事。先把概念厘清。

**阻抗**和**导纳**作为系统特性，描述的是同一件事的两面。高阻抗系统抵抗力——推它不太动。高导纳系统顺从力——推它就让。两者互为倒数：高阻抗对应低导纳，反之亦然。

但**导纳控制**和**阻抗控制**作为控制策略，说的是控制器被设计成要调节什么。

**导纳控制**的目标是力。控制器驱动机器人到达任何必要的位置，以产生期望的接触力。位置只是手段，力才是目标。如果你想让手指以 2 N 的力压着一个表面，控制器就移动关节直到力传感器或触觉传感器反馈说"到了"。这其实就是人手工作的方式：我们感受指尖的力，然后调整抓握，对关节实际转了多少角度几乎没有意识。

**阻抗控制**既不直接控制力，也不直接控制位置。它规定的是位置误差和力之间的*动态关系*。机器人被要求表现得像一个具有特定刚度、阻尼和等效质量的机械系统——一个虚拟的质量-弹簧-阻尼器。标准形式是：

$$F = M \ddot{x}_e + B \dot{x}_e + K x_e$$

其中 \\(x_e\\) 是位置误差，\\(F\\) 是接触力。控制器既没说"到达位置 X"，也没说"产生力 F"，而是说："如果你被偏移了 \\(x_e\\)，就像弹簧一样响应。"结果是机器人有了一种经过标定的**柔顺性**——遇到意外接触时，它会平滑地让步，而不是僵硬地对抗或完全瘫软。

阻抗控制有时被错误地叫做"力位混合控制"，这个说法容易误导。传统的力位混合控制是在不同轴、不同关节、或不同时刻之间切换力控和位控；而阻抗控制不是切换，它定义的是位移和力之间持续成立的一种行为契约。

## MIT 控制协议及其真正蕴含的东西

MIT mini-cheetah 控制协议，被具身智能机器人（包括达妙等机械臂）和四足机器狗广泛采用，是理解阻抗控制实践的一个好窗口。控制律是：

$$\tau = K_p (q_d - q) + K_d (\dot{q}\_d - \dot{q}) + \tau\_{ff}$$

其中 \\(q_d\\)、\\(\dot{q}\_d\\) 是目标位置和速度，\\(q\\)、\\(\dot{q}\\) 是当前位置和速度，\\(K_p\\)、\\(K_d\\) 是刚度和阻尼增益，\\(\tau\_{ff}\\) 是前馈力矩。

初看像一个带前馈项的标准 PD 控制器。但仔细看每一项，能发现更多：

- **\\(K_d(-\dot{q})\\) 项**（目标速度为零时）是一个纯阻尼项，耗散系统能量。这不是附带效果——它就是机械阻尼的定义，在不需要单独速度环的情况下阻止振荡。

- **\\(\tau\_{ff}\\) 项**是重力补偿和摩擦力补偿存在的地方。如果你有机器人的动力学模型，就可以在这里抵消掉那些会拉偏位置的力。但更关键的是，这一项本身就是一个力矩指令。如果把 \\(K_p\\) 和 \\(K_d\\) 全部置零，剩下的就是一个直接的电流（力矩）指令，电机内部的电流环闭环去跟踪它——\\(\tau\_{ff}\\) 成了直接操控机器人输出力的把手。

- **整体控制律**编码了质量-弹簧-阻尼关系。\\(K_p\\) 是虚拟弹簧刚度，\\(K_d\\) 是虚拟阻尼，合起来定义了关节对位移的响应——这就是阻抗控制的含义。

这和经典的级联三环（位置环→速度环→电流环）不同。三环结构里，上一环的输出是下一环的输入，层层串联。MIT 方案中，位置误差、速度误差和前馈力矩并联组合成最终的力矩指令，电流环仍然在电机驱动内部闭合，但上层控制律不是级联的——它是一个并联合成的表达式。

实际意义是柔顺性：如果机器人因为障碍物无法到达目标位置，它不会卡死或强行对抗——而是产生与偏差成比例的力，超过限制时就让步。

## 为什么具身智能研究者不需要知道这些——以及为什么应该知道

这里是有意思的地方。

当前大多数具身智能系统用位置控制作为动作空间。Policy 输出目标关节角，底层控制器执行。这能用，部分原因在于端到端学习中发生了一个巧妙的抵消。

基于阻抗的控制器存在一个系统性偏差：由于重力、摩擦和控制器本身的柔顺性，实际到达的位置和指令位置之间有稳定的差距。但因为**同样的偏差**在数据采集（遥操作）和 policy 部署时都存在，policy 学会了预期这个偏差。如果臂总是比指令角度少 5 度，policy 就学会多指令 5 度。误差被吸收进了学到的行为里，而不是在控制层面被修正。

这就是为什么具身智能在实践中不需要工业机器人编程所要求的那种精细重力补偿和摩擦力辨识。传统工业臂用显式运动规划编程，假设臂能精确到达指令位置；为此每一个系统误差都必须被辨识和补偿。具身智能用闭环学习 policy，把整个"机器人+控制器"当成一个黑盒，然后学习逆转它的行为。

这个偏差是真实存在的，但只要训练和部署环境保持一致，它就是无害的。

这也是为什么具身智能研究者很少建立机器人动力学的深入认识——他们确实不需要。但这种不可见性是有代价的：当它变得重要的时候——在仿真到真机迁移、在硬件更换、在非常规接触场景中——缺少心智模型就变成了一种劣势。

## 导纳控制的方向

如果阻抗控制是当前具身智能的自然底层，导纳控制指向的是它可能去往的地方。

想想导纳控制提供了什么：机器人被告知要产生某个接触力，然后一直移动直到达到这个力。这才是灵巧操作真正的工作方式。人类拿起一颗鸡蛋时，不会计算所需的关节角度——他们感受蛋壳，持续调整抓握力，感觉到"差不多了"就停止。指尖的力是主要感知，关节位置是衍生结果。

今天大多数机械手臂不是这样工作的。它们是执行空间规划的位置控制设备。没有原生的接触力感知，控制器也没有办法直接以力为目标。触觉传感器存在，但通常只是作为 policy 的感知输入，而不是控制变量。

导纳控制改变了架构：力变成了动作，位置成了结果。这是根本不同的框架，它更好地对应那些需要柔顺性的操作任务——抓取易碎物品、高公差零件插入、工具使用过程中维持接触。

挑战在于导纳控制天然不适配遥操作数据采集——而遥操作目前是具身智能数据的主流范式。遥操作给你的是人类操作者的位置目标，把它们转化成力目标需要知道环境接触状态，而这在演示采集时通常是未知的。

## 一种可能的路径

那天晚上朋友最后说的一句话一直在我脑子里：

> 也许我们需要的不是纯导纳也不是纯阻抗，而是一种分阶段的方式——用阻抗来接近和建立接触，用导纳来在接触建立后进行调节。

这个分解对应操作的自然阶段：自由空间运动（位置重要，接触力为零）、建立接触（过渡需要平滑）、约束操作（力调节是主要任务）。一个知道自己处于哪个阶段的控制器——或者 learned policy——可以在合适的时机调用合适的机制。

从学习的角度看，这也许意味着具身智能的动作空间可能从纯关节位置中获益于更丰富的表示——把目标力纳入动作表示，或者训练输出阻抗参数而不只是位置目标的 policy，可以给学习更多余地去表达机器人真正需要做的事情。

这是猜测性的。但背后的基本观点不那么猜测：控制层不只是硬件细节。它塑造了机器人能感知什么、能表达什么，以及失败是什么样子的。把它当黑盒处理的具身智能研究者，正在放弃一个可以利用的杠杆。

## 最后

具身智能目前建立在一个大多数从业者不思考的控制底层之上。这个底层——基于阻抗的关节控制——在大多数情况下，确实是端到端学习的好搭档。它的系统偏差在训练和部署之间互相抵消，它的柔顺性提供了对建模误差的缓冲。

但导纳控制——以力为主要变量——更自然地对应灵巧操作真正需要的东西。到达那里，需要以当前系统还不具备的方式，架起高层 policy 和底层控制器之间的桥梁。

建造那座桥的人，大概需要理解桥的两端。

</div>
