---
title: "[Paper Notes] Blind Dexterous Grasping via Real2Sim2Real Tactile Policy Learning"
date: 2026-09-10
permalink: /posts/2026/09/blind-dexterous-grasping-real2sim2real-tactile-policy-learning-paper-notes/
tags:
  - Dexterous Manipulation
  - Tactile Sensing
  - Blind Grasping
  - Sim-to-Real
  - Reinforcement Learning
  - Diffusion Policy
  - Paper Notes
---

<div data-lang="en" markdown="1">

## TL;DR

**Blind Dexterous Grasping via Real2Sim2Real Tactile Policy Learning** presents a complete pipeline for grasping with a multi-finger hand without cameras, object pose estimates, or object geometry at deployment. The system uses a 44-channel binary tactile array on a 16-DoF LEAP Hand, calibrates simulated contact events against real readings, pretrains a spatially grounded tactile encoder with simulator-only supervision, and distills object-specific reinforcement-learning experts into one tactile-conditioned Diffusion Policy.

The result is a real robot policy trained without real grasping demonstrations. On 20 objects—10 used during simulation training and 10 held out—the system succeeds in **27%** of real-world trials. The number is modest, but the paper isolates two useful lessons: tactile sim-to-real alignment must include contact timing, and geometry-supervised pretraining helps a spatial tactile encoder extract useful structure from sparse contacts.

## Paper Info

The paper is **“Blind Dexterous Grasping via Real2Sim2Real Tactile Policy Learning”** by **Shengcheng Luo, Xiyan Huang, Zhe Xu, Wanlin Li, Ziyuan Jiao, and Chenxi Xiao**. These notes use the June 11, 2026 v2 of [arXiv:2606.11767](https://arxiv.org/abs/2606.11767v2); the [project page](https://dex-blind-grasp.github.io/) contains demonstrations. The paper reports experiments on an xArm6 equipped with a LEAP Hand and distributed binary tactile sensors.

## Why Blind Grasping Is Difficult

Blind grasping is useful in darkness, clutter, narrow spaces, and severe self-occlusion. A robot can close its fingers around an object while cameras cannot reliably see the contact geometry. Tactile feedback supplies direct evidence of contact, but it is local and intermittent. The same binary pattern may correspond to different object poses, contact configurations, or future grasp motions.

The sim-to-real problem is equally challenging. Sensor sensitivity, placement, manufacturing variation, and contact mechanics change the timing and location of tactile activations. Even binary sensors, which remove much of the difficulty of matching continuous force values, can activate too early or too late in simulation. A policy trained on those incorrect events may learn the wrong reaction sequence.

The paper addresses both problems with three linked design choices:

1. **Real2Sim tactile calibration** aligns simulated binary contact events with hardware events.
2. **Layout-aware tactile representation learning** gives each contact its kinematic location on the hand and pretrains the encoder using privileged simulation labels.
3. **Expert-to-diffusion policy learning** aggregates successful object-specific RL behaviors into a multimodal policy that can react to sparse tactile histories.

## Hardware and Observation

The physical platform is a 6-DoF xArm6 with a 16-DoF LEAP Hand. Four custom curved TwinTac fingertip sensors contribute $4\times 8=32$ binary channels. Twelve FSR patches are distributed over the palm and finger links, adding 12 channels. The resulting tactile observation has

$$
N_{\text{tac}}=44
$$

binary contact values. The policy also receives proprioceptive joint information. No camera image, object pose, or object geometry is available at deployment.

The curved TwinTac modules enlarge the usable fingertip contact area, including side contacts. The FSR patches extend coverage to regions where a fingertip sensor cannot observe contact. This heterogeneous layout is inexpensive and easy to threshold into binary events, although it still leaves unsensed parts of the hand.

## Stage 1: Real2Sim Contact-Event Calibration

The simulator models each sensing region with 3D surface nodes and queries the object's signed distance. For an FSR region, contact is activated when a node enters a calibrated spatial margin $\lambda_{\text{con}}$. TwinTac sensors require a simple model of elastomer cross-talk: pressure at simulated surface nodes is propagated to virtual taxels with an exponential spatial kernel,

$$
f_i^{\text{taxel}}=\sum_{j=1}^{n} \exp\left(-\alpha\lVert p_j-t_i\rVert\right)f_j,
$$

and taxel $i$ becomes active when $f_i^{\text{taxel}}>\lambda_{\text{pre}}$. The calibration parameters are

$$
\theta=(\lambda_{\text{con}},\alpha,\lambda_{\text{pre}}).
$$

The authors collect task-agnostic tapping and sliding motions on known surfaces. They record real joint trajectories and binary tactile readings, replay the same joint trajectories in simulation, and choose parameters that minimize the event mismatch:

$$
\theta^*=\arg\min_{\theta}\sum_{t=1}^{T}\left\lVert y_t^{\text{sim}}(\theta)-y_t^{\text{real}}\right\rVert_1.
$$

A bounded grid search is sufficient because this is a low-dimensional calibration problem. The important point is the level at which the alignment happens: the method matches contact onset and offset events while leaving continuous hardware properties unmodeled.

The calibration uses nine trajectories against a sphere and a cylinder, totaling 5,674 frames. In the sensing evaluation, nominal simulation has a **426 ms** contact-onset error, **64.2%** taxel activation F1, and **4.2%** false-positive rate. Calibration reduces onset error to **96 ms**, raises F1 to **70.5%**, and lowers false positives to **2.2%**.

## Stage 2: Layout-Aware Tactile Encoding

A flat vector of 44 binary values says which sensors are active, but does not say where those sensors are. The paper attaches a 3D position to every tactile channel. Given hand configuration $q_\tau$ and the sensor's local position $r_i$, forward kinematics maps it into a common hand-centric frame:

$$
s_\tau^i=[\operatorname{FK}_i(q_\tau;r_i),b_\tau^i]\in\mathbb{R}^{4},
$$

where $b_\tau^i$ is the binary activation. A short history of these kinematically grounded points forms the tactile input $S_t$, which is encoded by a lightweight temporal Transformer:

$$
z_t=g_\psi(S_t).
$$

The encoder is pretrained in simulation with a decoder that predicts privileged quantities such as object pose, object geometry, robot state, and contact annotations. These targets are unavailable on the real robot. After pretraining, the decoder is discarded and the encoder is frozen for downstream policy learning; deployment uses only proprioception and binary tactile readings. Privileged information shapes the representation during simulation and does not enter the deployed observation stream.

The simulator state serves as representation-learning supervision. The retained encoder learns to organize sparse contact histories around geometry and contact structure, while its deployed inputs remain tactile and proprioceptive.

## Stage 3: RL Experts to a Diffusion Policy

The calibrated simulator generates grasping data. For each training object, the authors train an object-specific PPO expert. The actor sees only deployable observations—proprioception and binary tactile activations—while the critic and reward computation can use privileged simulator quantities through an asymmetric actor-critic setup. After convergence, 10,000 successful simulated grasp-and-lift trajectories form the offline dataset; the PPO experts themselves are discarded.

The final controller is a tactile-conditioned Diffusion Policy. At time $t$, the pretrained encoder output is concatenated with the proprioceptive state:

$$
c_t=[z_t,x_t].
$$

Conditioned on $c_t$, the policy predicts an action chunk,

$$
A_t=[a_t,a_{t+1},\ldots,a_{t+T_p-1}],
$$

using the standard diffusion denoising objective. The deployment setting conditions on five observations, predicts eight actions, and executes three before replanning. Each action contains 22 incremental arm and hand joint commands. This receding-horizon loop lets the hand search for an object, adjust contacts, and attempt a lift as new sensors activate.

The diffusion formulation is motivated by multimodality. A sparse contact history can support several valid finger motions, especially across objects with different shapes. A single deterministic action regressor tends to average these possibilities; action diffusion can represent multiple successful continuations.

## Evaluation and Results

The benchmark contains 20 physical objects. Ten **seen** objects contribute only to simulation expert generation, encoder pretraining, and diffusion-policy training. Ten **unseen** objects are excluded from all training stages and test shape generalization. Each object is evaluated over five trials.

The full system achieves:

- **Seen objects:** 16/50 successful grasps, or **32%**.
- **Unseen objects:** 11/50 successful grasps, or **22%**.
- **Overall:** 27/100 successful grasps, or **27%**.

The successful behaviors include tactile exploration when an object is initially off-center: the hand moves contacts until the object is better aligned with the palm, then closes and lifts. This is a small but important qualitative result because the policy is not limited to closing around a perfectly positioned object.

The encoder ablation is stronger in simulation. Without privileged pretraining, seen-object success is **36.2%**, unseen-object success is **20.0%**, and overall success is **28.1%**. With pretraining, these become **60.4%**, **43.2%**, and **51.8%**. The gain supports privileged geometric pretraining. The separate layout-only ablation is smaller: without pretraining, adding kinematic coordinates raises overall simulation success from 26.8% to 28.1%. The large gain therefore comes from the pretrained representation, not from coordinates alone.

The calibration ablation answers a different question. The nominal simulator's tactile signals disagree with hardware in timing and activation pattern; the calibrated simulator makes those contact events more consistent. This improves the data-generating environment even before a policy is evaluated on the real hand.

## Strengths

The paper has a clear systems contribution. It connects sensor-level alignment, representation learning, behavior generation, and real deployment into one pipeline. Each stage uses a different kind of supervision for a different purpose:

- paired real/simulation contact motions calibrate event timing;
- privileged simulator labels organize sparse tactile representations;
- object-specific PPO discovers successful behaviors;
- diffusion distillation combines them into one deployable controller.

The choice of binary tactile events is also pragmatic. Binary contacts are much easier to simulate and calibrate than raw tactile images or exact force fields. The layout-aware encoder then recovers some of the spatial information that a flat binary vector would lose.

## Limitations

The headline real-world success rate is **27%**, placing the system at the feasibility stage; robust grasping remains open. Many failures occur after initial contact: the policy does not move contacts into a stable configuration before the fixed execution horizon ends, leading to empty grasps, slips, or drops during lifting. These failure modes appear in simulation and hardware.

Tactile coverage is incomplete. Contacts often occur in unsensed regions, leaving the policy with ambiguous evidence. Full-hand skins, shear sensing, and slip detection could reduce this spatial aliasing.

The data-generation pipeline is also object-specific and simulation-heavy. The experts are discarded after producing demonstrations, and the real robot receives no real grasping demonstrations. That is attractive for reducing data collection, but it places more burden on calibration and simulation diversity.

Finally, a single policy handles search, grasp formation, and lifting within one time horizon. The authors suggest a two-timescale controller for future work: a slower policy for contact search and regrasping, plus a faster tactile reflex for force regulation and slip recovery.

## Takeaways

My read is that the most reusable idea is to treat tactile sim-to-real transfer as an **event-alignment problem**. Even a one-bit contact signal can be wrong in a way that changes the learned behavior if its onset occurs hundreds of milliseconds too early or too late.

The second lesson is that sparse touch needs a coordinate system. Pairing each binary activation with its forward-kinematic 3D location gives the encoder a way to reason about contact layout across an articulated hand.

Here, **end-to-end** describes the deployed mapping from sensor history to robot actions. Training still has separate calibration, expert generation, encoder pretraining, and diffusion-learning stages. For a lab using sparse tactile sensors, this is a concrete recipe to study. Its next test is whether better contact coverage and faster slip recovery can turn the current 27% hardware success into reliable grasping.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**Blind Dexterous Grasping via Real2Sim2Real Tactile Policy Learning** 提出了一套完整流程，让多指机器人手在没有相机、物体位姿估计和物体几何信息的情况下完成抓取。系统在 16-DoF LEAP Hand 上安装 44 通道二值触觉阵列，先把仿真中的接触事件校准到真实传感器，再用仿真中的特权信息预训练具有空间布局意识的触觉编码器，最后将面向不同物体训练的强化学习专家蒸馏成一个由触觉条件控制的 Diffusion Policy。

这个策略没有使用真实抓取示范。在 20 个物体上测试时，其中 10 个物体参与过仿真训练，另外 10 个物体完全留出，真实世界总成功率为 **27%**。虽然数值仍然有限，但论文清楚地展示了两个关键经验：触觉 sim-to-real 需要校准接触时间；结合空间位置与几何监督预训练，触觉编码器能够从稀疏接触中提取更有用的结构。

## 论文信息

论文题目为 **“Blind Dexterous Grasping via Real2Sim2Real Tactile Policy Learning”**，作者是 **Shengcheng Luo、Xiyan Huang、Zhe Xu、Wanlin Li、Ziyuan Jiao 和 Chenxi Xiao**。本文依据 2026 年 6 月 11 日更新的 [arXiv:2606.11767 v2](https://arxiv.org/abs/2606.11767v2)，项目主页为 [dex-blind-grasp.github.io](https://dex-blind-grasp.github.io/)。实验平台是安装了分布式二值触觉传感器的 xArm6–LEAP Hand。

## 为什么盲抓取困难？

在黑暗、杂乱环境、狭窄空间以及严重自遮挡场景中，盲抓取很有价值。机器人可以闭合手指包住物体，即使相机无法稳定看到接触几何，触觉仍然能够提供直接的接触证据。不过，触觉信息是局部且间歇的。同一组二值触觉读数可能对应不同的物体姿态、接触配置和后续动作。

sim-to-real 同样困难。传感器灵敏度、安装位置、制造差异和接触力学都会改变触觉激活的时间和位置。二值化虽然避免了匹配连续力值的大部分困难，但仿真中的接触仍可能过早或过晚激活。策略一旦在错误的事件上训练，就可能学到错误的反应时序。

论文用三个相互连接的设计处理这些问题：

1. **Real2Sim tactile calibration**：让仿真二值接触事件与真实硬件事件对齐。
2. **Layout-aware tactile representation learning**：为每个接触加入其在手上的运动学位置，并使用仿真特权标签预训练编码器。
3. **Expert-to-diffusion policy learning**：把不同物体的强化学习成功行为聚合成一个能够根据稀疏触觉历史生成多种动作的策略。

## 硬件与观测

物理平台由 6-DoF xArm6 和 16-DoF LEAP Hand 组成。四个定制的弯曲 TwinTac 指尖传感器提供 $4\times 8=32$ 个二值通道；分布在手掌和指节上的 12 个 FSR 贴片再提供 12 个通道。因此触觉观测共有

$$
N_{\text{tac}}=44
$$

个二值接触值。策略还接收关节本体感知信息。部署时没有相机图像、物体位姿或物体几何输入。

弯曲 TwinTac 模块扩大了指尖可感知的区域，也覆盖了侧面接触。FSR 贴片将触觉覆盖扩展到指尖传感器无法观察的手掌和指节区域。这种异构布局成本较低，也容易转换为二值事件，但手上仍然存在没有传感器覆盖的区域。

## 第一阶段：Real2Sim 接触事件校准

仿真器把每个传感区域离散成 3D 表面节点，通过物体的 signed distance 查询接近程度。对于 FSR 区域，当某个节点进入校准空间阈值 $\lambda_{\text{con}}$ 时，传感器被激活。TwinTac 需要一个简单的弹性体串扰模型：先用指数空间核传播模拟表面节点上的压力，得到虚拟 taxel 的压力

$$
f_i^{\text{taxel}}=\sum_{j=1}^{n} \exp\left(-\alpha\lVert p_j-t_i\rVert\right)f_j,
$$

当 $f_i^{\text{taxel}}>\lambda_{\text{pre}}$ 时，taxel $i$ 激活。校准参数为

$$
\theta=(\lambda_{\text{con}},\alpha,\lambda_{\text{pre}}).
$$

作者在已知表面上执行与具体任务无关的 tapping 和 sliding，记录真实关节轨迹及二值触觉读数，再把同一组关节轨迹回放到仿真中。参数通过最小化事件序列差异得到：

$$
\theta^*=\arg\min_{\theta}\sum_{t=1}^{T}\left\lVert y_t^{\text{sim}}(\theta)-y_t^{\text{real}}\right\rVert_1.
$$

由于参数维度很低，有限范围内的 grid search 就足够。这里的关键是校准层级：方法对齐接触 onset 和 offset 事件，同时将触觉硬件的连续物理属性留在模型之外。

校准数据包括球体和圆柱体上的 9 条轨迹，共 5,674 帧。在传感评估中，nominal simulation 的接触 onset 误差为 **426 ms**，taxel activation F1 为 **64.2%**，false-positive rate 为 **4.2%**。校准后，onset 误差降至 **96 ms**，F1 提升到 **70.5%**，误报率降至 **2.2%**。

## 第二阶段：具有空间布局意识的触觉编码

44 个二值值组成的平坦向量能够告诉我们哪些传感器激活，却没有告诉我们这些传感器位于手的哪里。论文为每个触觉通道加入 3D 位置。给定手部构型 $q_\tau$ 和传感器局部位置 $r_i$，通过 forward kinematics 将它映射到统一的 hand-centric frame：

$$
s_\tau^i=[\operatorname{FK}_i(q_\tau;r_i),b_\tau^i]\in\mathbb{R}^{4},
$$

其中 $b_\tau^i$ 是二值激活。短时间窗口内的这些运动学接触点组成触觉输入 $S_t$，再由轻量级 temporal Transformer 编码：

$$
z_t=g_\psi(S_t).
$$

编码器在仿真中使用特权标签预训练，解码器预测物体位姿、物体几何、机器人状态和接触标注等信息。这些目标在真实机器人上不可用。预训练结束后丢弃解码器，并在后续策略学习中冻结编码器；部署时编码器只接收本体感知和二值触觉。特权信息只在仿真阶段用于塑造表示，不会进入真实部署的观测流。

仿真状态在这里用作表示学习监督。保留下来的编码器学会围绕几何和接触结构组织稀疏的触觉历史，部署输入仍然只有触觉和本体感知。

## 第三阶段：从 RL 专家到 Diffusion Policy

触觉校准后的仿真器用于生成抓取数据。作者为每个训练物体训练一个 object-specific PPO expert。Actor 只接收部署时可用的本体感知和二值触觉；critic 和 reward 可以通过 asymmetric actor-critic 使用仿真特权量。训练收敛后，10,000 条成功的仿真 grasp-and-lift 轨迹组成离线数据集，PPO 专家本身被丢弃。

最终控制器是 tactile-conditioned Diffusion Policy。在时间 $t$，预训练编码器输出与本体感知状态拼接：

$$
c_t=[z_t,x_t]
$$

策略根据 $c_t$ 预测动作片段

$$
A_t=[a_t,a_{t+1},\ldots,a_{t+T_p-1}],
$$

并使用标准 diffusion denoising objective 训练。部署设置使用五步观测历史，预测八步动作，每执行三步就重新规划。每步动作包含 22 维机械臂和手部关节增量指令。这种 receding-horizon 执行让手能够搜索物体、调整接触，并在传感器产生新激活时尝试抬起物体。

采用 diffusion 的原因是动作分布本身具有多模态。同一段稀疏接触历史，面对不同形状物体时可能对应多种合理的手指运动。单一确定性回归器容易把这些动作平均掉；动作 diffusion 则能够表达多种成功的后续动作。

## 实验与结果

测试集包含 20 个真实物体。10 个 **seen objects** 只用于仿真专家生成、编码器预训练和 Diffusion Policy 训练；另外 10 个 **unseen objects** 在所有训练阶段都被排除，用于测试形状泛化。每个物体进行 5 次测试。

完整系统的结果为：

- **Seen objects**：16/50，成功率 **32%**；
- **Unseen objects**：11/50，成功率 **22%**；
- **Overall**：27/100，成功率 **27%**。

当物体初始位置偏离手掌中心时，策略会表现出触觉探索行为：通过移动接触逐步把物体调整到更适合抓取的位置，然后闭合手指并抬起。这说明策略并不局限于物体已经完美摆放的情况。

编码器消融在仿真中更加明显。没有特权预训练时，seen-object 成功率为 **36.2%**，unseen-object 为 **20.0%**，overall 为 **28.1%**。加入预训练后，三项分别提升到 **60.4%**、**43.2%** 和 **51.8%**。这支持了特权几何预训练的价值。单独加入空间坐标的消融增益较小：没有预训练时，加入运动学坐标使仿真总成功率从 26.8% 提升到 28.1%。较大的收益来自预训练后的表示，不能全部归因于坐标本身。

校准消融回答的是另一类问题。nominal simulator 的触觉信号在时间和激活模式上都与硬件存在差异；校准后的 simulator 能够生成更加一致的接触事件，从而改善策略训练所依赖的数据生成环境。

## 优点

论文的系统性很强，把传感器级对齐、表示学习、行为生成和真实部署连接到同一条流程中。每个阶段使用不同的监督信号来解决不同问题：

- 配对的真实/仿真接触动作校准事件时间；
- 仿真特权标签组织稀疏触觉表示；
- object-specific PPO 发现成功行为；
- diffusion distillation 把这些行为组合成一个可部署控制器。

二值触觉事件的选择也很务实。与原始触觉图像或精确力场相比，二值接触更容易仿真和校准；layout-aware encoder 则补回了平坦二值向量缺失的部分空间信息。

## 局限

真实世界 headline success rate 只有 **27%**，这项工作仍处于可行性验证阶段，稳健抓取仍有待提升。许多失败发生在初始接触之后：策略没有在固定执行时限内把接触移动到稳定配置，最终出现空抓、滑落或抬升时掉落。这些失败在仿真和真实系统中都能观察到。

当前触觉覆盖仍然不完整。接触经常发生在没有传感器的区域，使策略只能依据不完整或含糊的证据行动。完整手部触觉皮肤、剪切力传感和滑移检测可能减少这种空间混淆。

数据生成流程也高度依赖仿真和逐物体专家。专家只负责生成示范，之后会被丢弃；真实机器人没有使用真实抓取示范。这降低了真实数据采集成本，却把更多压力转移到校准质量和仿真多样性上。

最后，一个策略在同一时间尺度内处理搜索、成抓和抬升。作者建议未来采用 two-timescale controller：慢速高层策略负责接触搜索和 regrasp，快速触觉 reflex 负责握力调节和滑移恢复。

## 关键启发

在我看来，最值得复用的思想，是把 tactile sim-to-real 看作一个 **event-alignment problem**。即使传感器只输出一个 bit，只要接触事件提前或延后几百毫秒，就可能改变策略学到的动作。

第二个经验是：稀疏触觉需要坐标系。把每个二值激活和它在多指手上的 forward-kinematic 3D 位置配对，编码器才有机会跨关节手理解接触布局。

这里的 **end-to-end** 描述部署时从传感历史到机器人动作的映射。训练仍然分为校准、专家数据生成、编码器预训练和 diffusion learning 几个阶段。对于使用稀疏触觉传感器的实验室，这是一套可以继续研究的具体方案。接下来需要验证的是：更完整的接触覆盖和更快的滑移恢复，能否把当前 27% 的硬件成功率提升到可靠抓取的水平。

</div>
