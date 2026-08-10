---
title: "[Paper Notes] HumanEgo: Zero-Shot Robot Learning from Minutes of Human Egocentric Videos"
date: 2026-08-10
permalink: /posts/2026/08/humanego-paper-notes/
tags:
  - Egocentric Video
  - Robot Learning
  - Imitation Learning
  - Flow Matching
  - Bimanual Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

## TL;DR

**HumanEgo** learns deployable robot manipulation policies from roughly 30 minutes of human egocentric demonstrations per task, without task-specific robot data or large-scale pretraining. Its central idea is to represent manipulation through explicit **hand–object interaction geometry**. Each hand and object becomes a 29D Interaction-Centric Token (ICT) containing entity type, pose, relations to both hands, and grasp state. A conditional flow-matching policy maps these observations to bimanual action chunks, while three auxiliary objectives forecast object motion, 2D traces, and future interaction state.

The experiments make a sharp representational point. Closing the visual appearance gap alone reaches at most 32.5% success on the representation ablation, whereas adding ICT to raw human RGB raises success from 7.5% to 85%. With the full pipeline, HumanEgo reports 92.5% average success across four real-world tasks using 30 minutes of human data per task, and 75% with 15 minutes. The approach is compelling because it identifies a compact transferable state; its main dependency is the perception stack that must recover stable, metric 3D hand and object poses.

## Paper Information

- **Title:** HumanEgo: Zero-Shot Robot Learning from Minutes of Human Egocentric Videos
- **Authors:** Zhi (Leo) Wang, Botao He, Kelin Yu, Seungjae Lee, Ruohan Gao, Furong Huang, Yiannis Aloimonos
- **Affiliation:** University of Maryland
- **Status:** arXiv preprint, arXiv:2605.24934v2, May 2026
- **Links:** [Project page](https://humanego-ai.github.io/) · [Paper](https://arxiv.org/abs/2605.24934) · [Code](https://github.com/TX-Leo/HumanEgo)

## The Problem: Transfer the Interaction, Not the Body

Human egocentric video is easy to collect, but a robot cannot directly imitate its pixels or human joint trajectories. The visual gap includes different arms, grippers, cameras, and backgrounds. The kinematic gap includes different morphologies, workspaces, grasp mechanisms, and executable motion constraints. Existing methods often encode hand trajectories, object trajectories, sparse points, or visually retargeted robot images. Each captures part of a skill while leaving the relation between the manipulator and the object implicit.

HumanEgo defines the transferable unit as **interaction geometry**: how the hands approach, grasp, transport, coordinate around, and release task entities. The complete pipeline is:

```text
Aria egocentric demonstrations
  -> hand/object tracking and motion optimization
  -> arm inpainting + virtual-gripper/keypoint rendering
  -> Interaction-Centric Tokens
  -> flow-matching bimanual action policy
  -> zero-shot robot deployment
```

This decomposition assigns separate mechanisms to separate gaps. Visual preprocessing reduces appearance mismatch. ICT exposes the spatial state shared by human and robot. Flow matching models multiple valid action trajectories. Auxiliary forecasting extracts more learning signal from each short demonstration set.

## From Human Hands to Executable Gripper Actions

A demonstrator wears Aria Gen1 glasses, which provide synchronized RGB, calibrated SLAM, and stereo-based 3D hand keypoints through Meta's Machine Perception Services. Demonstrations are recorded at 30 Hz. The system uses five stable keypoints per hand: wrist, thumb MCP, thumb tip, index MCP, and index tip.

The virtual parallel-jaw gripper position is the midpoint between thumb and index fingertips:

$$
\mathbf{p}_{ee}=\frac{1}{2}\left(\mathbf{p}_{thumb\ tip}+\mathbf{p}_{index\ tip}\right).
$$

For orientation, HumanEgo builds a Gram–Schmidt frame from the wrist and the thumb/index MCP joints. MCP joints remain separated during a pinch, avoiding the orientation degeneracy that occurs when fingertip-based axes collapse at contact. The gripper aperture is a normalized thumb–index distance:

$$
g=\operatorname{clip}\left(
\frac{\lVert\mathbf{p}_{thumb\ tip}-\mathbf{p}_{index\ tip}\rVert-d_{min}}
{d_{max}-d_{min}},0,1\right),
$$

followed by filtering and binary open/close control at deployment. Confidence filtering, gap interpolation, Savitzky–Golay position smoothing, and EMA rotation smoothing convert noisy hand estimates into coherent action labels.

Objects are detected with Grounding DINO, segmented with SAM2, tracked in 2D with CoTracker3, and triangulated into 3D using camera intrinsics and Aria SLAM. Orient-Anything V2 estimates object orientation. When a grasp causes occlusion, **kinematic latching** rigidly attaches the estimated object pose to the hand until release.

## Interaction-Centric Tokens

For each entity $k$—a left hand, right hand, or task object—HumanEgo constructs a 29D token:

$$
\mathrm{ICT}_k=
[\tau\;\Vert\;{}^{REF}T_E\;\Vert\;{}^ET_{LH}\;\Vert\;{}^ET_{RH}\;\Vert\;g].
$$

Here, $\tau$ is the entity type; ${}^{REF}T_E$ is the entity pose in a shared reference frame; ${}^{E}T_{LH}$ and ${}^{E}T_{RH}$ express both hand poses in that entity's local frame; and $g$ is the grasp state for a hand or a sentinel value for an object. Every $SE(3)$ transform is flattened to 9 dimensions using normalized translation and a continuous 6D rotation representation.

The token has three useful properties. First, hand poses expressed in an object's frame directly encode approach, contact, transport, and release. Second, relative transforms reduce sensitivity to embodiment and viewpoint. Third, the entity list is variable-length, so the same policy interface can represent tasks with different numbers of objects.

HumanEgo still supplies RGB observations. It removes the human arm with SAM2 and LaMa, then renders a virtual gripper and tracked object keypoints. This channel retains visual context, while ICT carries the explicit 3D interaction state that is difficult to infer reliably from monocular pixels.

## Flow Matching and Dense Auxiliary Supervision

Given RGB and ICT state $s_t$, the policy generates a $K$-step bimanual action chunk containing both end-effectors' positions, 6D rotations, and binary grasps. Conditional flow matching transports Gaussian noise $x_0$ to a ground-truth action chunk $x_1$ along

$$
x_t=(1-t)x_0+t x_1, \qquad t\sim\mathcal{U}(0,1).
$$

The velocity model learns the target displacement $x_1-x_0$ with separate weights for position, rotation, and grasp:

$$
\mathcal{L}_{FM}=\mathbb{E}\left[
w_p\lVert\Delta p\rVert^2+
w_r\lVert\Delta r\rVert^2+
w_g\lVert\Delta g\rVert^2
\right].
$$

The implementation uses a 6-layer, 8-head transformer decoder with embedding dimension 384. At inference it integrates the learned ODE with 20 fixed Euler steps and produces a 50-step action chunk.

Three heads share the context encoder and forecast future scene evolution:

- **Object motion:** predicts the manipulated object's future 6-DoF trajectory, supervising physical 3D dynamics.
- **2D trace:** predicts future image-plane trajectories of entity anchor points, tying state features to visual motion.
- **Latent consistency:** predicts future ICT hand states, encouraging a temporally predictive interaction representation.

The full objective is

$$
\mathcal{L}=\mathcal{L}_{FM}
+\lambda_{OM}\mathcal{L}_{OM}
+\lambda_{2D}\mathcal{L}_{2D}
+\lambda_{LC}\mathcal{L}_{LC}.
$$

All targets come from the same perception pipeline, so the auxiliary tasks require no extra manual labels. Together they act as a lightweight interaction world model and as multi-task regularization, with the strongest value in the low-data regime.

## Real-World Results

The main evaluation uses dual Trossen WidowX arms and a top-mounted RealSense D405. Each result is measured over 40 trials with randomized object positions. The four tasks cover distinct control demands: Serve Bread is pick-and-place; Downstack Cups is long-horizon and multi-step; Water Flowers requires contact-rich bimanual ordering; Adjust Table requires sustained rotational control.

| Method / data budget | Average | Serve Bread | Downstack Cups | Water Flowers | Adjust Table |
|---|---:|---:|---:|---:|---:|
| HumanEgo, 30 min human | **92.5** | 95.0 | 87.5 | 95.0 | 92.5 |
| HumanEgo, 15 min human | 75.0 | 82.5 | 67.5 | 75.0 | 75.0 |
| ACT, 30 min robot teleop | 51.2 | 52.5 | 45.0 | 45.0 | 62.5 |
| Best human-video baseline per task | — | 62.5 | 45.0 | 45.0 | 47.5 |

HumanEgo improves over matched-time ACT by about **41.3 percentage points** in average success. On Serve Bread, eight minutes of human data reaches 57.5%, already exceeding ACT trained from 30 minutes of robot teleoperation at 52.5%. The paper attributes this efficiency to smoother motion, less idle time, higher signal-to-noise ratio, and broader spatial and trajectory coverage in the human demonstrations.

The same policies are evaluated without retraining under new robot embodiments, cameras, viewpoints, heights, lighting, backgrounds, objects, and distractors. Reported success remains between 85% and 91.25% across these conditions. Transfer to Franka and UR10 arms is especially relevant because the training demonstrations contain no robot hardware.

## What the Ablations Show

The representation study gives the paper's clearest result:

| Input representation | Success on Water Flowers |
|---|---:|
| Raw human RGB | 7.5% |
| Inpainted RGB + keypoints | 20.0% |
| Robot RGB | 32.5% |
| Raw human RGB + ICT | 85.0% |
| Full HumanEgo | **95.0%** |

Even robot RGB, which removes the visual embodiment mismatch, reaches only 32.5%. ICT adds the explicit spatial relation that pixels fail to recover from a small dataset. The 7.5% to 85% jump from adding ICT to raw human RGB supports the paper's core claim more directly than the aggregate benchmark.

At the 15-minute budget, the auxiliary-objective study starts from a 50% baseline. Object motion reaches 67.5%, latent consistency 62.5%, and 2D trace 55%. Combining all three reaches 75%, a cumulative gain of 25 percentage points. On Serve Bread, the largest low-data gap appears at eight minutes: 57.5% with auxiliary losses versus 37.5% without them. Once the dataset reaches 30 minutes, both variants converge near 95%, showing that dense supervision mainly changes sample efficiency.

## Strengths and Limitations

The strongest contribution is the alignment between the claimed problem and the chosen representation. ICT makes the hand–object relation explicit, preserves variable numbers of entities, and gives human and robot observations a common interface. The auxiliary heads reuse signals already available in each trajectory, which is a practical way to regularize a policy trained from minutes of data. The paper also evaluates tasks beyond simple pick-and-place and reports ablations that separate visual preprocessing, spatial representation, and learning objectives.

The main limitations are equally concrete:

- **Perception quality is a hard dependency.** Replacing Aria's stereo hand tracking with monocular WiLoR, HaMeR, or MediaPipe drops Serve Bread success from 95% to 45%, 32.5%, and 0%. Metric depth, temporal smoothness, and tracking persistence directly affect the action labels and ICTs.
- **The preprocessing chain is long.** Grounding DINO, SAM2, CoTracker3, triangulation, orientation estimation, inpainting, and hand tracking create multiple opportunities for cascading errors.
- **Object tracking is offline and occlusion-sensitive.** Per-frame detection and kinematic latching fit the evaluated tasks; in-hand manipulation, fast motion, and complex occlusion need stronger online tracking.
- **Precision plateaus near one centimeter.** Sub-centimeter contact-rich behavior may require downstream reinforcement learning or simulation refinement.
- **The evidence remains task-scale.** Four curated real-world tasks demonstrate strong transfer, while open-world object diversity, unseen task composition, failure recovery, and long-duration deployment remain open.

## Takeaways

HumanEgo suggests a useful recipe for learning robot actions from small, high-quality egocentric datasets. Capture metric hand motion with a reliable wearable system; retarget the hand into an executable end-effector representation; encode hands and objects through relative $SE(3)$ relations; train a multi-modal action generator; and predict future dynamics in several complementary spaces.

The deeper lesson is representational. Embodiment transfer becomes more manageable once the state describes **what entities are doing relative to one another**. Visual editing can reduce appearance mismatch, but explicit interaction geometry supplies the transferable control state. HumanEgo's reported results show how far this idea can go with minutes of demonstrations, while its hand-tracking ablation shows exactly where the current pipeline remains fragile.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**HumanEgo** 从每个任务约 30 分钟的人类第一视角示范中学习可部署的机器人操作策略，不需要该任务的机器人数据，也不依赖大规模预训练。它的核心思想是用显式的**手–物体交互几何**表示 manipulation。每只手和每个物体都被编码成一个 29 维 Interaction-Centric Token（ICT），其中包含实体类型、位姿、相对双手的空间关系和抓握状态。Conditional flow matching policy 根据这些 observation 生成双臂 action chunk，三个辅助目标分别预测 object motion、2D trace 和未来 interaction state。

实验给出了很清晰的 representation 结论。在表示消融中，仅缩小视觉外观差异最多达到 32.5% success；在原始 human RGB 上加入 ICT，成功率从 7.5% 提升到 85%。完整系统使用每个任务 30 分钟的人类数据，在四个真实任务上取得 92.5% 平均成功率；数据减半到 15 分钟后仍有 75%。这项工作的价值在于找到了紧凑且可迁移的 control state；它的主要依赖是 perception stack 必须稳定恢复具有 metric scale 的 3D 手部和物体位姿。

## 论文信息

- **标题：** HumanEgo: Zero-Shot Robot Learning from Minutes of Human Egocentric Videos
- **作者：** Zhi (Leo) Wang、Botao He、Kelin Yu、Seungjae Lee、Ruohan Gao、Furong Huang、Yiannis Aloimonos
- **单位：** University of Maryland
- **状态：** arXiv preprint，arXiv:2605.24934v2，2026 年 5 月
- **链接：** [项目主页](https://humanego-ai.github.io/) · [论文](https://arxiv.org/abs/2605.24934) · [代码](https://github.com/TX-Leo/HumanEgo)

## 问题定义：迁移交互，而非模仿身体

人类第一视角视频采集方便，但机器人无法直接模仿其中的像素或人体关节轨迹。Visual gap 来自手臂、夹爪、相机和背景差异；kinematic gap 来自形态、工作空间、抓握机制和可执行运动约束的差异。已有方法通常编码手部轨迹、物体轨迹、稀疏点，或把人类画面渲染成机器人画面。这些表示各自覆盖技能的一部分，manipulator 与物体之间的关系仍然是隐式的。

HumanEgo 把可迁移的基本单元定义为 **interaction geometry**：双手如何接近、抓取、搬运、围绕物体协作，以及如何释放任务实体。完整流程为：

```text
Aria 第一视角示范
  -> 手部/物体 tracking 与 motion optimization
  -> 手臂 inpainting + 虚拟夹爪/关键点渲染
  -> Interaction-Centric Tokens
  -> flow-matching 双臂动作策略
  -> 零样本部署到机器人
```

这套分解为不同 gap 配置了不同机制。视觉预处理缩小 appearance mismatch；ICT 暴露人类和机器人共享的空间状态；flow matching 表达多个有效动作轨迹；辅助 forecasting 从短时示范中提取更密集的训练信号。

## 从人手轨迹到可执行夹爪动作

示范者佩戴 Aria Gen1 眼镜，系统通过 Meta Machine Perception Services 获得同步 RGB、标定后的 SLAM 和基于双目的 3D 手部关键点。视频以 30 Hz 采集。每只手只使用五个稳定关键点：手腕、拇指 MCP、拇指指尖、食指 MCP 和食指指尖。

虚拟平行夹爪的位置取拇指与食指指尖的中点：

$$
\mathbf{p}_{ee}=\frac{1}{2}\left(\mathbf{p}_{thumb\ tip}+\mathbf{p}_{index\ tip}\right).
$$

方向由手腕和拇指/食指 MCP 关节构造 Gram–Schmidt 坐标系。MCP 关节在捏合时仍保持分离，避免以指尖建轴时在接触瞬间出现方向退化。夹爪开度来自归一化后的拇指–食指距离：

$$
g=\operatorname{clip}\left(
\frac{\lVert\mathbf{p}_{thumb\ tip}-\mathbf{p}_{index\ tip}\rVert-d_{min}}
{d_{max}-d_{min}},0,1\right),
$$

经过滤波后，在部署时转成二值开合控制。Confidence filtering、缺失区间插值、Savitzky–Golay 位置平滑和 EMA 旋转平滑共同把带噪的手部估计转换成连贯 action label。

物体处理依次使用 Grounding DINO 检测、SAM2 分割、CoTracker3 跟踪 2D 关键点，再结合相机内参和 Aria SLAM 三角化到 3D。Orient-Anything V2 估计物体方向。当抓握造成遮挡时，**kinematic latching** 将物体位姿刚性绑定到手部，持续到释放为止。

## Interaction-Centric Tokens

对于左手、右手或任务物体中的每个实体 $k$，HumanEgo 构造一个 29 维 token：

$$
\mathrm{ICT}_k=
[\tau\;\Vert\;{}^{REF}T_E\;\Vert\;{}^ET_{LH}\;\Vert\;{}^ET_{RH}\;\Vert\;g].
$$

$\tau$ 表示实体类型；${}^{REF}T_E$ 是实体在共享参考系中的位姿；${}^{E}T_{LH}$ 和 ${}^{E}T_{RH}$ 表示左右手在该实体局部坐标系中的位姿；$g$ 是手部的抓握状态，物体则使用 sentinel value。每个 $SE(3)$ transform 被展平成 9 维，包括归一化 translation 和连续 6D rotation representation。

这个 token 有三个重要性质。第一，在物体坐标系中表达手部位姿，可直接编码接近、接触、搬运和释放。第二，相对变换降低了对 embodiment 和 viewpoint 的敏感性。第三，实体列表长度可变，同一个 policy interface 能处理包含不同物体数量的任务。

HumanEgo 同时保留 RGB observation。它使用 SAM2 和 LaMa 移除人类手臂，再渲染虚拟夹爪和物体关键点。RGB 通道保留视觉上下文，ICT 则承载小规模单目图像很难可靠恢复的显式 3D interaction state。

## Flow Matching 与稠密辅助监督

给定 RGB 和 ICT 状态 $s_t$，policy 生成长度为 $K$ 的双臂 action chunk，其中包括两侧末端执行器的位置、6D rotation 和二值 grasp。Conditional flow matching 沿下面的线性路径把高斯噪声 $x_0$ 传输到真实动作块 $x_1$：

$$
x_t=(1-t)x_0+t x_1, \qquad t\sim\mathcal{U}(0,1).
$$

Velocity model 学习目标位移 $x_1-x_0$，并分别为位置、旋转和抓握设置权重：

$$
\mathcal{L}_{FM}=\mathbb{E}\left[
w_p\lVert\Delta p\rVert^2+
w_r\lVert\Delta r\rVert^2+
w_g\lVert\Delta g\rVert^2
\right].
$$

实现采用 6 层、8 个 attention head、embedding dimension 为 384 的 transformer decoder。推理时使用 20 步固定 Euler integration，输出 50 步 action chunk。

三个辅助 head 与主任务共享 context encoder，并预测未来 scene evolution：

- **Object motion：**预测被操作物体未来的 6-DoF 轨迹，提供 3D physical dynamics 监督。
- **2D trace：**预测实体 anchor point 在图像平面的未来轨迹，让 state feature 与视觉运动对齐。
- **Latent consistency：**预测未来的 ICT hand state，促使 interaction representation 具备时间预测能力。

完整目标为：

$$
\mathcal{L}=\mathcal{L}_{FM}
+\lambda_{OM}\mathcal{L}_{OM}
+\lambda_{2D}\mathcal{L}_{2D}
+\lambda_{LC}\mathcal{L}_{LC}.
$$

所有 target 都由同一套 perception pipeline 自动生成，不需要额外人工标注。三者共同形成轻量级 interaction world model，也通过 multi-task regularization 减少过拟合，在小数据区间的收益最明显。

## 真实机器人实验

主要实验平台由两台 Trossen WidowX 和一台顶置 RealSense D405 组成。每个结果在物体初始位置随机化的条件下测试 40 次。四个任务覆盖不同控制难点：Serve Bread 是 pick-and-place；Downstack Cups 是长时程多步骤任务；Water Flowers 需要接触丰富且具有顺序约束的双臂协作；Adjust Table 需要持续旋转控制。

| 方法 / 数据量 | 平均 | Serve Bread | Downstack Cups | Water Flowers | Adjust Table |
|---|---:|---:|---:|---:|---:|
| HumanEgo，30 分钟 human | **92.5** | 95.0 | 87.5 | 95.0 | 92.5 |
| HumanEgo，15 分钟 human | 75.0 | 82.5 | 67.5 | 75.0 | 75.0 |
| ACT，30 分钟 robot teleop | 51.2 | 52.5 | 45.0 | 45.0 | 62.5 |
| 每个任务最优 human-video baseline | — | 62.5 | 45.0 | 45.0 | 47.5 |

HumanEgo 相比同等采集时间的 ACT，平均成功率提高约 **41.3 个百分点**。在 Serve Bread 上，8 分钟 human data 已达到 57.5%，超过使用 30 分钟 robot teleoperation 训练的 ACT（52.5%）。论文认为这种效率来自人类示范更平滑、idle time 更少、signal-to-noise ratio 更高，并覆盖更丰富的空间位置和轨迹。

同一策略在不重新训练的条件下，还测试了新机器人形态、相机、视角、高度、光照、背景、物体和干扰物。各条件成功率保持在 85% 到 91.25% 之间。迁移到 Franka 和 UR10 尤其能说明问题，因为训练示范中完全没有机器人硬件。

## 消融实验说明了什么

Representation study 给出了全文最清晰的结果：

| 输入表示 | Water Flowers 成功率 |
|---|---:|
| 原始 human RGB | 7.5% |
| Inpainted RGB + keypoints | 20.0% |
| Robot RGB | 32.5% |
| 原始 human RGB + ICT | 85.0% |
| 完整 HumanEgo | **95.0%** |

即使使用完全消除视觉 embodiment mismatch 的 robot RGB，成功率也只有 32.5%。ICT 补充了小数据条件下很难从像素恢复的显式空间关系。在原始 human RGB 上加入 ICT 后，成功率从 7.5% 跃升到 85%；这组结果比 aggregate benchmark 更直接地支撑了论文的核心主张。

在 15 分钟数据量下，辅助目标消融的 baseline 为 50%。单独加入 object motion、latent consistency 和 2D trace 后分别达到 67.5%、62.5% 和 55%；三者组合达到 75%，累计提升 25 个百分点。在 Serve Bread 的 8 分钟数据点上，带辅助损失的模型为 57.5%，不带辅助损失的模型为 37.5%。数据增加到 30 分钟后，两者都接近 95%，说明 dense supervision 主要改善 sample efficiency。

## 优点与局限

这项工作最强的部分是问题主张与 representation design 高度一致。ICT 显式表示手–物体关系，支持可变数量实体，并为人类和机器人 observation 提供统一接口。辅助 head 重用每条轨迹中已有的信号，是对分钟级数据训练进行 regularization 的实用方案。实验任务也超出了简单 pick-and-place，并通过消融区分了视觉预处理、空间表示和学习目标各自的作用。

主要局限同样很具体：

- **Perception quality 是硬依赖。** 将 Aria 双目手部 tracking 换成单目的 WiLoR、HaMeR 或 MediaPipe 后，Serve Bread 成功率从 95% 分别降到 45%、32.5% 和 0%。Metric depth、时间平滑性和 tracking persistence 会直接影响 action label 与 ICT。
- **预处理链较长。** Grounding DINO、SAM2、CoTracker3、三角化、方向估计、inpainting 和手部 tracking 中的误差可能逐级传递。
- **物体 tracking 依赖离线处理且对遮挡敏感。** Per-frame detection 与 kinematic latching 适合当前任务；in-hand manipulation、快速运动和复杂遮挡需要更强的在线 tracker。
- **精度在约一厘米处出现平台。** 亚厘米级 contact-rich 行为可能需要下游 reinforcement learning 或 simulation refinement。
- **证据规模仍是 task-scale。** 四个经过设计的真实任务展示了强迁移能力；开放世界物体多样性、未见任务组合、失败恢复和长时间部署仍未解决。

## 总结与启发

HumanEgo 给出了一套适合小规模高质量第一视角数据的 robot learning recipe：使用可靠的 wearable system 采集 metric hand motion；把人手重定向成可执行的 end-effector representation；通过相对 $SE(3)$ 关系编码手和物体；训练 multi-modal action generator；再从多个互补空间预测 future dynamics。

更深一层的启发来自 representation。只要状态直接描述**各个实体彼此之间正在发生什么**，embodiment transfer 就会变得更容易处理。视觉编辑可以缩小外观差异，显式 interaction geometry 则提供真正可迁移的控制状态。HumanEgo 的结果展示了分钟级示范可以达到的上限，而 hand-tracking 消融也准确指出了当前 pipeline 最脆弱的位置。

</div>
