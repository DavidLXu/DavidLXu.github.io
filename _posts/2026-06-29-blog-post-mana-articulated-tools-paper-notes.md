---
title: "[Paper Notes] Mana: Dexterous Manipulation of Articulated Tools"
date: 2026-06-29
permalink: /posts/2026/06/mana-articulated-tools-paper-notes/
tags:
  - Robot Learning
  - Dexterous Manipulation
  - Articulated Tools
  - Sim-to-Real
  - Diffusion Policy
---

<div data-lang="en" markdown="1">

**Mana** studies a hard corner of dexterous manipulation: small articulated tools such as tongs, pliers, clothespins, and syringes. These objects require the hand to grasp thin moving parts, stabilize the tool body, and apply enough force to actuate an internal joint.

My read: the main contribution is a data-generation view of tool use. Mana treats manipulation like animation. A few human affordance clicks define functional regions; procedural keyframes sketch the important poses; motion planning fills geometric reaching; short-horizon RL fills contact-rich inbetweening; a point-cloud diffusion policy then learns from the generated simulation trajectories and transfers zero-shot to the real robot.

## Paper Info

The paper is **"Mana: Dexterous Manipulation of Articulated Tools"** by **Zhao-Heng Yin, Guanya Shi, Pieter Abbeel, and C. Karen Liu** from UC Berkeley, CMU, Stanford University, and Amazon FAR. It is available as [arXiv:2606.13677](https://arxiv.org/abs/2606.13677), with project page [zhaohengyin.github.io/mana](https://zhaohengyin.github.io/mana).

## Why Articulated Tools Are Hard

Rigid object manipulation already has difficult contact dynamics, but articulated tools add another layer: the robot must control the tool's internal degree of freedom while keeping the whole tool stable. A tong must open and close; a plier must squeeze; a syringe requires plunger motion; a clothespin needs forceful actuation around a spring-loaded joint.

The paper emphasizes that successful force directions are often misaligned with stable surface normals. Pressing along the normal may reduce slip, yet it can rotate or eject the tool. Pressing in the desired actuation direction may generate the correct moment, yet it may also leave the friction cone. Small contact-location errors change moment arms and can destabilize the entire coupled hand-tool system.

This also explains why common data sources are weak here. Position-based teleoperation retargets fingertip poses, so it cannot reliably command the precise contact forces needed for centimeter-scale handles. End-to-end RL from scratch faces a sparse exploration problem: it must discover functional contacts, maintain them as the tool moves, and generate large task-specific forces in a high-dimensional hand action space.

## Mana as Manipulation Animation

Mana reframes articulated tool use as a coarse-to-fine motion synthesis problem. The input is a tool mesh, an articulated joint model, and a small set of human-provided functional affordance annotations. The user marks regions such as handles, arms, plungers, or barrels in a 3D interface; the paper reports that this takes less than one minute per tool instance.

The output is a dataset of successful simulated manipulation trajectories. Each trajectory contains wrist motion, hand joint commands, object state, and semantic phase labels such as grasping, opening, and closing. These trajectories become training data for the real-world visuomotor policy.

The pipeline has three main layers.

**Grasp generator.** Mana builds on Lightning Grasp and adds a collision-aware IK procedure, called Lightning Grasp+, for thin tabletop objects. It uses annotated functional regions to construct contact domains, optimizes fingertip contact locations and finger joints, filters grasps in IsaacLab, and samples dense keyframes across relevant tool configurations.

**Trajectory generator.** Mana decomposes the episode into pre-grasping, grasping, and in-hand actuation. Pre-grasping uses GPU-accelerated RRT-Connect because it is mostly geometric. Grasping can be procedural when contact normals and squeezing motions are reliable, and it can use RL for thin or unstable cases. In-hand actuation uses RL because it needs coupled position-force control.

**Visuomotor policy.** After simulation data is generated, Mana trains a point-cloud-conditioned diffusion policy. The policy observes the segmented tool point cloud in the wrist frame plus proprioception, then outputs delta 6D wrist poses and delta hand joint position targets.

## The RL Inbetweening Objective

The RL part is used for the phases where geometry alone is insufficient. Each episode starts from a generated stable grasp or pre-grasp keyframe and targets a meaningful tool configuration, such as moving from open to closed.

The dense reward has the form:

\[
r = r_{\mathrm{tool}} + w_1 r_{\mathrm{hand}} + w_2 r_{\mathrm{contact}}.
\]

The tool term tracks the target tool joint, position, and orientation. The hand term regularizes the hand gesture, and in grasping also tracks wrist pose. The contact term counts active contacts between finger links and tool links:

\[
r_{\mathrm{contact}}=\sum_{i\in\mathrm{Finger},j\in\mathrm{Tool}} \mathbf{1}[f_{ij}>\epsilon].
\]

The appendix makes the physical story clearer. The RL teachers are trained with strong force-related randomization: action noise, robot PD gain randomization, tool PD gain randomization, tool mass randomization, friction randomization, and object force perturbations. The goal is to prevent policies from depending on a single brittle force balance.

This matters because tool use is force sensitive. A policy that looks good under one simulated stiffness, friction, or mass can fail immediately when the real tool pushes back differently.

## Real Robot Policy and Hardware

The real platform is a 7-DoF xArm7 with a 16-DoF Allegro hand. Mana also uses custom flattened compliant fingertips because standard hemispherical rigid fingertips create unstable point contacts on thin handles. The soft silicone layer enlarges the contact patch and helps tolerate small pose errors during high-force actuation.

For perception, the system uses one RealSense D435 RGB-D camera. During deployment, SAM 3 segments the image, Fast Foundation Stereo produces an object point cloud, and the point cloud is represented in the wrist frame. The system runs at about 10 Hz on a workstation with two RTX 4090 GPUs.

The student policy uses 512 point-cloud points. A Perceiver-style transformer compresses the point cloud into four 128-dimensional tokens. Proprioception, including hand joint positions and targets from the past two frames, is encoded into another token. A lightweight transformer diffusion head then predicts the action. The policy is trained with a standard denoising objective:

\[
L=\mathbb{E}_{(o_i,a_i)\sim D,\;t\sim U[0,T]}
\left[\lVert a_i-\pi(\tilde{a}_i,o_i,t)\rVert^2\right].
\]

Point-cloud randomization, including noise and random part masking, is used to bridge imperfect segmentation and depth noise in real deployment.

## Results

Mana evaluates four articulated object categories: tongs, pliers, clothespins, and syringes, with two instances per category. The tools are thin, about **0.8-1.5 cm** thick, and require around **3-7 N** of actuation force.

The main table reports roughly **70% success** for both grasping and in-hand manipulation across categories, with each cell evaluated over 10 trials per instance. Teleoperation performs poorly, often near zero on clothespins and syringes, and only around 30% on some tong phases. Open-loop execution of Mana-generated trajectories is better than teleoperation but still sensitive to mesh and pose errors. The closed-loop learned policy is consistently strongest.

The ablations support the data-generation thesis. Real-world success improves with more generated trajectories, more grasp keyframes, and stronger force randomization. That is an important result: for articulated tool use, robustness scales with dense state coverage around functional contacts and with physical diversity in simulation.

The paper also composes learned skills into functional tasks, using manual wrist teleoperation only for fine alignment to task sites. It reports **7/10** success for tong picking, **5/10** for plier cutting, **6/10** for clothespin use, and **5/10** for syringe injection. These numbers are lower than phase-level results because tool-object interaction introduces unseen perturbations and additional slip modes.

## Strengths and Limitations

The strength of Mana is its decomposition. It avoids asking one method to solve everything. Human clicks provide functional intent. Procedural grasp generation gives the system contact candidates that RL would struggle to discover. Motion planning handles collision-free approach. RL focuses on short contact-rich segments. Diffusion policy learning turns the generated trajectories into a perception-conditioned controller.

The limitations are also concrete. The Allegro hand cannot handle stiff tools requiring more than about **10 N** because of motor torque limits. The work focuses on precision grasps and does not explore human-like power grasps, partly because the Allegro hand is around twice the size of a human hand. Perception under occlusion and slip detection remain difficult, especially for very small tools. Finally, the demonstrated tool-use workflows still use wrist teleoperation for fine alignment, so full autonomous skill chaining needs another policy layer.

## Takeaway

Mana is a useful reminder that dexterous manipulation data does not need to come only from human demonstrations or blind RL exploration. For articulated tools, the most effective supervision may be structured: sparse affordance annotation, dense procedural keyframes, simulation-based inbetweening, and learned closed-loop deployment.

The larger lesson is that contact-rich tool use benefits from separating function, geometry, force, and perception. Mana gives each part a suitable mechanism, then composes them into a sim-to-real pipeline that can grasp and actuate thin articulated tools with meaningful real-world success.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**Mana** 研究的是灵巧操作里很难的一类对象：tongs、pliers、clothespins、syringes 这类小型 articulated tools。这些物体要求机器人手抓住很薄、会运动的部件，同时稳定整个工具本体，并施加足够大的力去驱动内部关节。

我的理解：这篇最核心的贡献是把 tool use 重新看成一个数据生成问题。Mana 把 manipulation 当作 animation 来做。少量人工 affordance clicks 定义功能区域；procedural keyframes 勾勒关键姿态；motion planning 填充几何可达段；short-horizon RL 填充接触丰富的 inbetweening；最后用生成出来的仿真轨迹训练 point-cloud diffusion policy，并 zero-shot transfer 到真实机器人。

## Paper Info

论文是 **"Mana: Dexterous Manipulation of Articulated Tools"**，作者为 **Zhao-Heng Yin, Guanya Shi, Pieter Abbeel, and C. Karen Liu**，来自 UC Berkeley、CMU、Stanford University 和 Amazon FAR。论文链接是 [arXiv:2606.13677](https://arxiv.org/abs/2606.13677)，项目主页是 [zhaohengyin.github.io/mana](https://zhaohengyin.github.io/mana)。

## 为什么 Articulated Tools 难

刚体操作已经有复杂接触动力学，articulated tools 又多了一层：机器人必须在保持工具稳定的同时控制工具内部自由度。夹子要开合，钳子要挤压，注射器需要推动 plunger，衣夹需要绕弹簧关节施加力量。

论文强调，真正有效的施力方向经常和稳定表面法向不一致。沿法向按压可以降低打滑风险，却可能让工具旋转或飞出。沿功能方向施力可以产生正确力矩，却可能离开 friction cone。接触点的小误差会改变 moment arm，并让整个 hand-tool coupling 失稳。

这也解释了为什么常见数据来源在这里不够好。Position-based teleoperation 主要 retarget fingertip poses，难以稳定指定厘米级薄把手所需的精确接触力。End-to-end RL from scratch 则面对稀疏探索：它要发现功能接触点，在工具运动过程中维持这些接触，还要在高维手部 action space 中生成较大的任务特定力。

## Mana as Manipulation Animation

Mana 把 articulated tool use 重新表述为 coarse-to-fine motion synthesis。输入是工具 mesh、articulated joint model，以及少量人工 functional affordance annotations。用户在 3D 界面中标注 handles、arms、plungers、barrels 等区域；论文报告每个工具实例的标注少于 1 分钟。

输出是成功的仿真操作轨迹数据集。每条轨迹包含 wrist motion、hand joint commands、object state，以及 grasping、opening、closing 等 semantic phase labels。这些轨迹随后用于训练真实部署的 visuomotor policy。

pipeline 有三层。

**Grasp generator。** Mana 基于 Lightning Grasp，并为 tabletop thin objects 加入 collision-aware IK，形成 Lightning Grasp+。它使用标注好的功能区域构造 contact domains，优化 fingertip contact locations 和 finger joints，在 IsaacLab 中筛选稳定 grasp，并在相关工具构型上密集采样 keyframes。

**Trajectory generator。** Mana 把 episode 分成 pre-grasping、grasping 和 in-hand actuation。Pre-grasping 主要是几何问题，所以使用 GPU-accelerated RRT-Connect。Grasping 在 contact normals 和 squeezing motions 可靠时可以用 procedural 方法生成；遇到薄工具或不稳定接触时使用 RL。In-hand actuation 需要耦合的 position-force control，因此使用 RL。

**Visuomotor policy。** 仿真数据生成后，Mana 训练 point-cloud-conditioned diffusion policy。policy 输入 wrist frame 下的 segmented tool point cloud 和 proprioception，输出 delta 6D wrist poses 与 delta hand joint position targets。

## RL Inbetweening Objective

RL 用在单纯几何无法解决的阶段。每个 episode 从生成好的 stable grasp 或 pre-grasp keyframe 出发，目标是到达有功能意义的工具构型，例如从 open 变成 closed。

dense reward 形式为：

\[
r = r_{\mathrm{tool}} + w_1 r_{\mathrm{hand}} + w_2 r_{\mathrm{contact}}.
\]

tool term 跟踪目标工具关节、位置和姿态。hand term 约束手势，在 grasping 中还会跟踪 wrist pose。contact term 统计 finger links 和 tool links 之间的 active contacts：

\[
r_{\mathrm{contact}}=\sum_{i\in\mathrm{Finger},j\in\mathrm{Tool}} \mathbf{1}[f_{ij}>\epsilon].
\]

appendix 里的物理细节很关键。RL teachers 使用了很强的 force-related randomization：action noise、robot PD gain randomization、tool PD gain randomization、tool mass randomization、friction randomization，以及 object force perturbations。目标是避免 policy 依赖某一种脆弱的力平衡。

这点很重要，因为 tool use 对 force 很敏感。一个 policy 在某个仿真 stiffness、friction 或 mass 下看起来很好，换成真实工具不同的反作用力后可能马上失败。

## 真实机器人策略与硬件

真实平台是 7-DoF xArm7 加 16-DoF Allegro hand。Mana 还设计了 flattened compliant fingertips，因为标准 hemispherical rigid fingertips 在薄把手上容易形成不稳定点接触。软硅胶层能扩大 contact patch，并在高力 actuation 时容忍小的 pose errors。

感知使用单个 RealSense D435 RGB-D camera。部署时，SAM 3 做图像分割，Fast Foundation Stereo 生成 object point cloud，点云再转换到 wrist frame。系统在配有两张 RTX 4090 的工作站上约 10 Hz 运行。

student policy 使用 512 个 point-cloud points。Perceiver-style transformer 把点云压缩成四个 128 维 tokens。proprioception 包括 hand joint positions 和过去两帧 targets，并被编码成另一个 token。轻量 transformer diffusion head 负责预测 action。训练目标是标准 denoising objective：

\[
L=\mathbb{E}_{(o_i,a_i)\sim D,\;t\sim U[0,T]}
\left[\lVert a_i-\pi(\tilde{a}_i,o_i,t)\rVert^2\right].
\]

训练时还加入 point-cloud randomization，包括噪声和 random part masking，用来适应真实部署中的分割不完美和 depth noise。

## 实验结果

Mana 评估了四类 articulated objects：tongs、pliers、clothespins 和 syringes，每类两个实例。工具都很薄，厚度约 **0.8-1.5 cm**，驱动需要大约 **3-7 N** 的力。

主表显示，Mana 在 grasping 和 in-hand manipulation 上整体达到大约 **70% success**，每个 cell 都是每个实例 10 次 trial。Teleoperation 表现很弱，在 clothespins 和 syringes 上经常接近 0，在某些 tong phases 上也只有约 30%。Open-loop 执行 Mana 生成轨迹优于 teleoperation，但仍然对 mesh 和 pose errors 敏感。闭环 learned policy 最稳定。

ablation 支持了 data-generation 这条主线。真实成功率会随着 generated trajectories 数量、grasp keyframes 数量和 force randomization 强度增加而提升。这是一个重要结果：对于 articulated tool use，robustness 来自功能接触附近的 dense state coverage，也来自仿真中的 physical diversity。

论文还把学到的技能组合成功能任务，只在对准 task site 的阶段使用 manual wrist teleoperation。结果是 tong picking **7/10**，plier cutting **5/10**，clothespin use **6/10**，syringe injection **5/10**。这些数字低于单阶段结果，因为工具与其他物体交互时会引入未见过的扰动和额外打滑模式。

## 优点与限制

Mana 的优点是分解得很清楚。它没有让一个方法解决所有问题。人工 clicks 提供功能意图；procedural grasp generation 给出 RL 很难自己探索到的接触候选；motion planning 处理无碰撞 approach；RL 专注于短的接触丰富片段；diffusion policy learning 再把生成轨迹变成 perception-conditioned controller。

限制也很具体。由于 Allegro hand 的电机扭矩限制，系统无法处理需要超过约 **10 N** 的 stiff tools。工作聚焦 precision grasps，没有探索人类常用的 power grasps，部分原因是 Allegro hand 大约是人手的两倍，难以像人一样握住和驱动薄把手。遮挡下的 slip detection 和非常小工具的感知仍然困难。最后，展示的 tool-use workflows 仍然用 wrist teleoperation 做精细对准，所以完全自主的 skill chaining 还需要额外策略层。

## Takeaway

Mana 提醒我们，dexterous manipulation data 不一定只能来自 human demonstrations 或 blind RL exploration。对于 articulated tools，更有效的监督可能是结构化的：稀疏 affordance annotation、密集 procedural keyframes、simulation-based inbetweening，以及 learned closed-loop deployment。

更大的启发是，contact-rich tool use 需要把 function、geometry、force 和 perception 分开处理。Mana 给每一部分选择合适机制，再把它们组合成一个 sim-to-real pipeline，从而在真实世界中抓取并驱动很薄的 articulated tools。

</div>
