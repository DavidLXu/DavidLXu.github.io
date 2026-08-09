---
title: "A Systematic View of Dexterous Hand Manipulation"
date: 2026-08-09
permalink: /posts/2026/08/systematic-view-dexterous-hand-manipulation/
tags:
  - Dexterous Manipulation
  - Robotics Hardware
  - Robot Learning
  - Reinforcement Learning
  - Embodied AI
---

<div data-lang="en" markdown="1">

Dexterous manipulation is often discussed as an algorithm problem. In practice, its progress depends on a longer chain: the hand determines the control problem, the software infrastructure determines how quickly the system can iterate, learning algorithms determine how knowledge and skills are acquired, and data determines which parts of intelligence can scale. A strong result in one layer cannot compensate indefinitely for weaknesses in the others.

This article presents an engineering view of that full stack. The central claim is simple: large-scale data is best suited to perception and world understanding; precise motor skills still require interaction, dynamics, and high-frequency feedback. The path to general physical intelligence will likely combine imitation learning at the upper layer with reinforcement learning and control at the lower layer.

## Hardware Defines the Control Problem

### Direct drive and tendon drive

Most high-degree-of-freedom dexterous hands follow two main transmission designs.

A **direct-drive hand** places the actuator close to the finger joint. Its dynamics are relatively legible: each joint can be identified and controlled with familiar position, velocity, impedance, or admittance loops. Per-joint control also makes the hand easier to integrate with a robotic arm. The main difficulty is mechanical. Fingers provide very little room for motors, gearboxes, sensors, wiring, and thermal management, so achieving compact size, adequate torque, and durability at the same time is demanding.

A **tendon-driven hand** moves the actuators away from the fingers and transmits force through cables. This reduces finger inertia and produces a structure closer to the human hand, whose finger motion is powered largely by muscles in the forearm. Tendons can also couple several joints into useful motion synergies. Their control cost appears in friction, elasticity, slack, hysteresis, routing variation, and channel coupling. The mapping from motor motion to joint motion can change with pose and load, making calibration and long-term consistency difficult.

Linkage transmissions remain useful in simpler or lower-degree-of-freedom mechanisms. At high degrees of freedom, their nonlinear transmission and packaging constraints make them less attractive because they offer neither the clean joint-level control of direct drive nor the low distal inertia of tendon drive.

The hardware choice therefore moves complexity between disciplines. Direct drive gives control engineers a cleaner plant and gives mechanical engineers a severe miniaturization problem. Tendon drive creates a lighter, more biomimetic hand while shifting more work into modeling, calibration, sensing, and coupled control.

### Reduction ratio, transparency, and force

Within direct-drive designs, the reduction ratio creates another fundamental trade-off.

A high ratio allows a small motor to generate large joint torque and hold force efficiently. It also increases reflected inertia and exposes the controller to gearbox friction, backlash, compliance, and other nonlinear effects. External forces become harder to feel through the joint, and accurate force or impedance behavior requires better sensing and compensation.

A low ratio gives the finger greater mechanical transparency. When an external force moves the joint, the user can often feel the motor's cogging directly. This backdrivability supports responsive contact and safer interaction. The cost is lower torque density: sustained grasp force requires current, which raises power consumption, heat, and motor-protection requirements.

Backdrivability and active compliance should be separated conceptually. Mechanical backdrivability describes how readily an external force can drive the transmission. Impedance control can also create compliant behavior by regulating the relationship among position, velocity, and contact force. If a commanded point lies inside an object, a well-tuned impedance loop settles at the surface with a controlled force instead of continuing to push aggressively. Its quality still depends on sensing, control bandwidth, latency, actuator limits, and transmission friction. Mechanical transparency and active control reinforce each other; neither fully replaces the other.

## The Software Stack Is a Core Moat

For an embodied-intelligence company, durable capability comes from both the machine and the software system around it. Individual models can often be reproduced; a reliable pipeline spanning hardware, data, training, deployment, and diagnosis takes much longer to build. Three systems are especially important.

### 1. Embodiment and motion control

The lowest software layer coordinates the arm, dexterous hand, other end effectors, motors, audio devices, force sensors, and tactile sensors. ROS can provide part of the middleware, but the real work lies in exposing stable timing, state estimation, safety limits, and consistent control interfaces across heterogeneous hardware.

This layer requires practical understanding of position and velocity control, impedance and admittance control, damping, system identification, and control frequency. These concepts directly affect sim-to-real transfer and real-world deployment. A policy trained under idealized dynamics cannot recover performance if the real control loop is slow, poorly identified, or inconsistent across devices.

### 2. Teleoperation

Teleoperation is both a control interface and a data-production system. Whole-body teleoperation maps an operator's motion to the robot. Arm-hand teleoperation often divides the interface: a glove controls the fingers, while a tracker on the hand or wrist controls the arm end effector.

For a seven-degree-of-freedom arm, one end-effector pose admits many joint-space solutions. This null-space freedom can produce unnatural elbows, self-collision, or discontinuous motion. A practical system constrains it through multi-objective optimization: extra trackers provide body context, secondary objectives favor human-like posture and joint margins, or a learned model predicts a stable configuration. Good teleoperation therefore depends as much on redundancy resolution and ergonomics as on pose tracking accuracy.

### 3. Training and deployment

An early-stage team can reproduce an open-source policy manually. A mature robotics organization needs a repeatable production loop: automatically ingest collected data, validate and version it, launch training, save checkpoints, deploy a selected model, run tests, and inspect every joint and subsystem during evaluation.

At larger scale, this becomes a distributed-systems problem. The platform must schedule multi-node and multi-GPU workloads, manage communication and limited memory, recover from failures, and retain reproducible links among data, code, checkpoints, robot configuration, and results. Real-robot reinforcement learning adds a closed loop in which rollout, safety filtering, upload, training, evaluation, and redeployment operate continuously. Large datasets also need to be decomposed into processing operators and scheduled as traceable computation graphs. This infrastructure forms part of the research engine itself.

## Two Learning Regimes, Two Roles

### Imitation learning scales priors

Imitation learning covers a broad family of data-driven policies, from compact behavior-cloning models such as ACT and Diffusion Policy to larger vision-language-action and world-action models. It is accessible because progress can come from better data, representations, architectures, and training recipes without redesigning the robot's mechanics or low-level controller.

The success of language models makes scaling an appealing template, yet embodied intelligence faces three additional constraints. First, action changes the next observation, so inference runs inside a tightly coupled feedback loop. Second, the model must combine vision, language, proprioception, touch, and action. Third, physical control has strict latency and reliability requirements, which limits dependence on remote compute. Larger models increase capability and simultaneously intensify deployment pressure.

These constraints make a direct replay of the language-model scaling path uncertain. Embodied systems may need more structured models, better compression, hierarchical control, and a careful division between slow reasoning and fast action.

### Reinforcement learning acquires motor skill

Reinforcement learning is well suited to high-frequency, dynamics-sensitive skills. Policies trained in simulation have already shown that locomotion and other whole-body behaviors can transfer to real robots, often with models small enough for fast on-device inference.

Dexterous-hand reinforcement learning usually appears in two forms. **Task RL** defines a reward and lets the policy discover grasping or in-hand manipulation strategies. A **tracking policy** follows human or generated motion while satisfying physical constraints. The second form resembles humanoid motion tracking: the policy should reproduce the target style and also keep the object stable, just as a humanoid dance policy must follow a trajectory while maintaining balance.

Reinforcement learning does not receive rich world priors automatically; it must obtain them through exploration or transfer them from pretrained representations. That limitation is also its strength for physical skill. People may learn goals and rough strategies by observation, while balance, swimming, cycling, and dexterous force control are refined through bodily experience. Interaction reveals contact dynamics that passive observation cannot fully provide.

A plausible hierarchy places imitation learning at the upper layer to supply perception, semantics, task intent, and coarse action proposals. Reinforcement learning and classical control form the lower layer, converting those proposals into stable, high-frequency behavior under real dynamics. The boundary can move with the task, but the distinction between knowledge acquisition and motor adaptation remains useful.

## What Each Data Source Can Teach

Embodied data sources differ most in action alignment and dynamics fidelity.

| Data source | Best use | Main limitation |
| --- | --- | --- |
| Real-robot teleoperation | Pretraining and fine-tuning executable arm-hand policies | Expensive collection; tied to a robot embodiment and interface |
| Portable manipulation interfaces such as UMI | Convenient collection of diverse human demonstrations | Primarily kinematic; robot dynamics and contact response do not match directly |
| Egocentric human video | Scalable perception, semantics, affordances, and world evolution | Weak robot-action alignment and little usable dynamics supervision |
| Human skeleton or motion-capture data | Whole-body references and general tracking policies | Requires a tracker or controller to convert kinematics into dynamically feasible motion |
| Simulation and synthetic data | Safe exploration, domain randomization, and scalable task variation | High-fidelity contact and environment details are costly to model |

The television analogy is useful here. Egocentric video can teach what objects are, how scenes evolve, and which actions are plausible. It gives limited instruction on the exact forces needed to ride a bicycle, maintain balance, or manipulate a deformable object. Teleoperation provides closer guidance by replaying desired robot actions, though it still reflects the operator interface and collection setup.

Motion-capture data has already proved valuable for humanoid control when a tracking policy converts reference kinematics into dynamically valid movement. Dexterous manipulation may follow a similar transition as execution speed, contact complexity, and force requirements rise.

Simulation offers controllable variation, but fidelity has a price. Small effects can decide success: the changing resistance of a magnetically sealed drawer, the compliance and breakage of a stem, or the motion of a fruit under airflow. These effects can be modeled; each extra detail raises construction, identification, and computation costs. Synthetic data scales most easily where approximate geometry and broad variation matter, and least easily where success depends on subtle contact dynamics.

This suggests a division of labor. Massive heterogeneous datasets can accumulate in perception and world models, where rough alignment still carries substantial information. Detailed motor behavior can be refined through reinforcement learning, system identification, and real interaction. The major open problem is how to let the lower-level learner exploit large-scale priors without losing the speed, stability, and physical grounding required for control.

## Progress Without the Hype Cycle

Embodied intelligence has not yet reached its iPhone or GPT moment. The hardware remains difficult to manufacture, the software stack remains fragmented, data remains expensive, and the relationship among large models, control, and dynamics remains unresolved.

That is a reason for patience, not pessimism. Progress comes from reducing one source of friction at a time: a more transparent hand, a more stable control loop, a better teleoperation system, a reproducible training platform, a scalable data pipeline, or a policy that learns safely from interaction. The breakthrough may arrive in three years, five years, or ten. Teams that keep building through multiple technical and industrial cycles will have accumulated the systems knowledge needed to recognize and use it when it comes.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

灵巧操作常被讨论成一个算法问题。落到工程中，它依赖一条更长的链路：手的结构决定控制问题，软件基础设施决定系统的迭代速度，学习算法决定知识与技能如何获得，数据则决定哪些智能能够规模化。任何单层的优势，都无法长期弥补其他层的薄弱。

这篇文章尝试给出一幅完整的工程图景。核心观点很简单：海量数据更适合沉淀感知和世界理解；精细运动技能仍然依赖交互、动力学和高频反馈。通用物理智能很可能采用分层结构，上层由模仿学习提供先验与意图，下层由强化学习和控制负责动作落地。

## 硬件决定控制问题

### 直驱与绳驱

目前，高自由度灵巧手主要采用两类传动方案。

**直驱手**把执行器布置在手指关节附近。它的动力学关系相对清晰：完成关节与电机辨识后，便可以使用成熟的位置、速度、阻抗或导纳控制。逐关节控制也方便灵巧手与机械臂集成。真正的难点集中在机械端。手指内部必须同时容纳电机、减速器、传感器、线缆和散热结构，要兼顾体积、扭矩与寿命，制造难度很高。

**绳驱手**把电机移出手指，通过绳索传递动力。它能降低手指端惯量，结构也更接近人手——人手的手指运动主要由前臂肌肉提供动力。绳索还可以把多个关节耦合成有效的运动协同。相应的控制代价来自摩擦、弹性、松弛、迟滞、走线差异和通道耦合。电机运动到关节运动的映射会随姿态与负载变化，标定和长期一致性都更难保证。

连杆传动在结构简单、自由度较低的机构中仍有价值。自由度升高以后，非线性传动和空间布置会迅速变复杂；它既缺少直驱清晰的关节级控制，又没有绳驱较低的末端惯量，因此吸引力逐渐下降。

硬件路线的选择，本质上是在不同学科之间转移复杂度。直驱为控制工程师提供更干净的被控对象，同时把小型化难题留给机械工程；绳驱带来更轻、更仿生的手指，同时增加建模、标定、传感和耦合控制的工作量。

### 减速比、反驱性与力量

在直驱方案内部，减速比又形成一组基础权衡。

高减速比可以让小电机输出更大的关节扭矩，并以较低的电机负担维持抓取力。与此同时，它会放大折算惯量，并引入减速器摩擦、回差、柔性等非线性因素。外力更难透过关节传回电机，精确的力控或阻抗行为也需要更好的传感与补偿。

低减速比让手指具有更高的机械透明度。从外界反向推动关节时，甚至可以直接感受到电机的齿槽转矩。这种反驱性有利于灵敏接触和安全交互。代价是扭矩密度较低：持续抓握需要依靠电流维持，随之带来功耗、散热和电机保护问题。

反驱性与主动柔顺需要分开理解。机械反驱性描述外力能否顺畅地驱动传动系统；阻抗控制则通过调节位置、速度与接触力之间的关系产生柔顺行为。当目标点落在物体内部时，合理调校的阻抗环会让机器人停在物体表面并维持受控的力，避免持续强推。它的效果仍取决于传感、控制频率、延迟、执行器能力和传动摩擦。机械透明度与主动控制可以相互增强，任何一方都无法完全替代另一方。

## 软件系统是核心壁垒

对具身智能公司而言，长期能力同时来自机器本体和围绕它构建的软件系统。单个模型往往可以复现，贯穿硬件、数据、训练、部署和诊断的可靠链路却需要长期积累。其中有三个系统尤其重要。

### 1. 本体运控系统

最底层的软件需要协调机械臂、灵巧手、其他末端执行器、电机、音频设备、力传感器和触觉传感器。ROS 可以承担部分中间件职责，真正关键的是为异构硬件提供稳定的时序、状态估计、安全边界和统一控制接口。

这一层需要真正理解位置控制、速度控制、阻抗与导纳控制、阻尼、系统辨识和控制频率。它们会直接影响 sim-to-real 和真机部署。真实控制环一旦频率不足、辨识不准或设备间行为不一致，仿真中训练的策略很难维持原有性能。

### 2. 遥操系统

遥操既是控制界面，也是数据生产系统。本体遥操把操作者的身体运动映射给机器人；臂手协同遥操通常进一步拆分输入设备：手套控制手指，手部或腕部的定位器控制机械臂末端。

七自由度机械臂到达同一末端位姿时，关节空间存在多组解。零空间自由度处理不当，会产生不自然的肘部姿态、自碰撞或运动跳变。工程系统通常采用多目标优化约束它：增加定位器以提供身体上下文，用次要目标约束仿人姿态和关节余量，或者用学习模型预测稳定构型。遥操质量因此同时取决于冗余度求解、人体工学和位姿追踪精度。

### 3. 训练与部署系统

初创团队可以手工复现开源策略，成熟的机器人公司则需要可重复的生产闭环：自动接入采集数据，完成校验与版本管理，启动训练并定期保存 checkpoint，选择模型后一键部署、测试，同时观察评测期间每个关节和子系统的状态。

规模扩大以后，它会变成分布式系统问题。平台需要调度多机多卡任务，管理通信和有限显存，处理故障恢复，并在数据、代码、checkpoint、机器人配置与实验结果之间保留可追溯关系。真机强化学习还需要持续运转的闭环：真机 rollout、安全过滤、数据上传、训练、评测和重新部署。大规模数据处理也要拆成可复用算子，以可追踪的计算图自动编排。这套基础设施本身就是研究引擎的一部分。

## 两种学习范式，两类职责

### 模仿学习负责扩展先验

模仿学习可以覆盖一大类数据驱动策略，从 ACT、Diffusion Policy 等紧凑的行为克隆模型，到更大的视觉—语言—动作模型和世界—动作模型。它的进入门槛相对较低：研究者可以围绕数据、表征、结构和训练方法取得进展，无需重新设计机器人机械结构或底层控制器。

语言模型的成功让规模化成为一个很自然的参照，但具身智能还面对三项额外约束。第一，动作会改变下一时刻的观测，推理运行在紧密耦合的闭环中。第二，模型需要同时处理视觉、语言、本体状态、触觉与动作。第三，物理控制对延迟和可靠性要求很高，难以长期依赖远端算力。模型变大能够提升能力，也会同步加重部署压力。

因此，语言模型的规模化路径未必能原样迁移到具身智能。具身系统可能需要更有结构的模型、更好的压缩、分层控制，以及对慢速推理和快速动作的明确分工。

### 强化学习负责获得运动技能

强化学习适合高频、动力学强相关的技能。仿真训练已经证明，行走等全身运动可以迁移到真机，而且策略通常足够紧凑，能够在本地快速推理。

灵巧手强化学习通常有两种形式。**任务型强化学习**通过 reward 定义目标，让策略自行发现抓取或手内操作方法。**追踪策略**跟随真人或生成的动作，同时满足物理约束。后一种形式与人形运动追踪很相似：策略既要复现目标动作的风格，也要保持物体稳定；人形舞蹈策略同样需要跟随轨迹并维持平衡。

强化学习不会自动获得丰富的世界先验，它需要通过探索学习，或者从预训练表征中迁移。这项局限也对应着它在物理技能上的优势。人可以通过观察理解目标和大致策略，平衡、游泳、骑车以及精细用力仍要通过身体体验不断修正。交互能够暴露被动观察难以完整提供的接触动力学。

一种合理的分层方案，是让模仿学习在上层提供感知、语义、任务意图和粗粒度动作建议；强化学习与经典控制位于下层，把这些建议转化为真实动力学约束下稳定、高频的行为。具体边界会随任务变化，但“知识获取”和“运动适应”的区分仍然有用。

## 不同数据分别能教会什么

具身数据源之间最关键的差异，在于动作对齐程度与动力学保真度。

| 数据来源 | 最适合的用途 | 主要局限 |
| --- | --- | --- |
| 真机遥操数据 | 预训练和微调可执行的臂手策略 | 采集成本高，并与特定本体和遥操界面绑定 |
| UMI 等便携式操作采集 | 方便地采集多样化真人示范 | 主要提供运动学关系，无法直接匹配机器人动力学和接触响应 |
| 真人第一视角视频 | 扩展感知、语义、可供性和世界演化知识 | 机器人动作对齐弱，几乎不提供可直接使用的动力学监督 |
| 真人骨架或动捕数据 | 提供全身参考动作和通用追踪策略 | 需要 tracker 或控制器把运动学轨迹转换为动力学可行的运动 |
| 仿真与合成数据 | 安全探索、域随机化和规模化任务变化 | 高保真接触和环境细节的建模成本很高 |

“看电视”的类比很有解释力。第一视角视频能够教会模型物体是什么、场景如何变化、哪些动作可能发生，却很难给出骑车、维持平衡或操作柔性物体所需的精确作用力。遥操更接近手把手示范，通过重放目标机器人动作提供直接指导，但仍然受遥操界面和采集配置影响。

动捕数据已经在人形机器人上证明了价值：追踪策略可以把参考运动学转换为满足动力学约束的动作。随着执行速度、接触复杂度和力控要求提高，灵巧操作也可能经历类似的转变。

仿真可以提供可控的变化，保真度却有明确代价。很多微小效应都会决定任务成败，例如磁吸抽屉在开启瞬间发生变化的阻力、植物茎秆的柔性和断裂，或气流下果实的晃动。这些效果都能建模，每增加一层细节，场景构建、参数辨识和计算成本都会上升。合成数据最容易扩展的是近似几何和大范围变化，最难扩展的是依赖细微接触动力学的任务。

由此可以形成一种数据分工：海量异构数据沉淀在感知与世界模型中，粗粒度对齐依然能够提供大量信息；精细运动行为则通过强化学习、系统辨识和真机交互持续修正。最大的开放问题，是如何让底层学习器利用规模化先验，同时保留控制所需的速度、稳定性和物理落地能力。

## 在热潮之外持续推进

具身智能的 iPhone 时刻或 GPT 时刻还没有到来。硬件制造仍然困难，软件系统依旧割裂，数据成本很高，大模型、控制与动力学之间的关系也没有解决。

这更需要耐心，而非悲观。进步来自逐项减少摩擦：一只机械透明度更高的手，一个更稳定的控制环，一套更好用的遥操系统，一条可复现的训练链路，一个可扩展的数据平台，或者一个能够通过交互安全学习的策略。突破可能发生在三年、五年或十年以后。能够跨越多轮技术与产业周期持续建设的团队，才会积累足够的系统知识，在那一刻到来时识别它、接住它。

</div>
