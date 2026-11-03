---
title: "[Paper Notes] Zero-HLM: Generalizable Humanoid Loco-Manipulation without Real Robot Data"
date: 2026-11-03
permalink: /posts/2026/11/zero-hlm-paper-notes/
excerpt: "Zero-HLM aligns Gaussian appearance with physical scenes and corrects motion–environment geometry from rollout feedback, generating simulation demonstrations for humanoid loco-manipulation."
tags:
  - Paper Notes
  - Humanoid
  - Loco-Manipulation
  - Sim-to-Real
  - Imitation Learning
  - Vision-Language-Action
  - Simulation
---

<div data-lang="en" markdown="1">

## TL;DR

A humanoid can track a plausible reference motion and still miss the object: balance control changes where the base stops, which changes where the hand arrives. **Zero-HLM** addresses this mismatch by correcting both the reference motion and the simulated scene using rollout feedback. Successful physical executions become training demonstrations, paired with photorealistic egocentric images.

Starting from 45 demonstrations teleoperated in simulation, the framework produces 4,800 validated trajectories. On three real Unitree G1 tasks, GR00T N1.7 trained with 800 simulation demonstrations per task achieves **66.7% mean full-task success**, versus **46.7% with 100 real demonstrations per task**. At the matched count of 100, simulation training reaches 43.3%. The headline advantage therefore includes the benefit of scaling generated data.

## Paper and reading version

**Zero-HLM: Generalizable Humanoid Loco-Manipulation without Real Robot Data**, by Dianyi Yang, Mengya Liu, Zhumei Wang, Yu Liu, Xiaochen Zhang, Yixuan Li, Le Ma, Yuhang Yang, Weiqi Huang, Wei Liang, Baoxiong Jia, and Siyuan Huang. Affiliations include Beijing Institute of Technology, BIGAI, Tsinghua University, and Delta Intelligence. These notes follow the 23-page [arXiv:2610.35075v1 technical report](https://arxiv.org/abs/2610.35075v1), submitted October 26, 2026, checked on November 3, 2026. [PDF](https://arxiv.org/pdf/2610.35075v1) · [Project](https://young-bit.github.io/zero-hlm/)

## What “without real robot data” covers

The task-policy training demonstrations are generated in simulation. The pipeline still uses smartphone captures of the real scene, dedicated asset captures, metric calibration, and a camera-calibration sequence executed on the physical robot. It also starts from pretrained GR00T and SONIC components. The claim concerns the task-specific demonstration source, not the absence of all real-world measurements or pretrained experience.

There are fifteen successful simulation teleoperation demonstrations per task. Event predicates identify locomotion, manipulation, and leg-critical interaction segments. The three tasks are mobile banana pick-and-place, squatting to pick up and place a hat, and carrying a basket while closing an obstructing cabinet door with a foot. Each combines three reported stages. The last stage's score measures completion of the full sequence. [§§3.2, 4.1](https://arxiv.org/pdf/2610.35075v1#page=7)

## A scene needs appearance and collision geometry in agreement

Zero-HLM reconstructs a Gaussian scene with MAtCha from smartphone images. Checkerboards establish metric scale and ground alignment. A multimodal agent uses Blender MCP and Isaac Lab to build an editable mesh scene, consulting a mesh extracted from the Gaussian reconstruction and comparing matched-camera renderings to refine geometry and placement.

The Gaussian representation supplies appearance and a spatial reference; meshes supply collision, joints, and physical parameters. Interaction-critical assets receive separate captures and reconstruction. The agent configures mass, friction, center of mass, collision shapes, and articulation, then checks interactions such as opening a cabinet or releasing an object. A visually convincing surface alone would not establish these properties.

After a successful rollout, recorded robot and object states are replayed for rendering. Mask-guided z-buffer compositing combines Gaussian backgrounds with simulator-rendered robots and objects. The policy thus sees images corresponding to **executed states**, including tracking deviations. [§§3.1, 3.3](https://arxiv.org/pdf/2610.35075v1#page=4)

## Adapting a source motion to a new interaction

The generator selects among nearby valid source demonstrations using target-position and orientation distance. A* plans locomotion paths; the SONIC motion planner converts paths into whole-body references. Carrying preserves the relevant upper-body posture, while a foot interaction retains the source lower-body motion.

For manipulation, the source hand trajectory is transformed relative to the target:

$$
\widetilde T_{e,t}=T_o(T_o^{\mathrm{src}})^{-1}T_{e,t}^{\mathrm{src}}.
$$

Here $T_o$ is the new object or placement-target pose, and $T_{e,t}^{\mathrm{src}}$ is the demonstrated hand pose. Arm inverse kinematics realizes this transformed trajectory while keeping the reference root and inactive joints fixed. Decaying offsets blend segment boundaries, and transition duration changes with the required hand displacement. Grasp and release commands are retimed with the motion. [§3.2, Eqs. 2–4](https://arxiv.org/pdf/2610.35075v1#page=5)

The resulting reference is only a candidate. SONIC must execute it while satisfying balance and contact constraints, so its actual root and wrist trajectories can differ from the reference.

## Correcting the environment to match the executed robot

Each candidate is rolled out through the deployment controller. Success, stability, and collision tests decide whether to retain it. Recoverable failures trigger three forms of correction.

First, root tracking error produces a planar scene correction. Let $(x,\psi)$ be the intended robot position and heading, and $(x',\psi')$ the executed values. An asset at $(x_j,\psi_j)$ is moved to

$$
x_j^{+}=x'+R_2(\psi'-\psi)(x_j-x),\qquad
\psi_j^{+}=\psi_j+\psi'-\psi.
$$

This restores the intended robot–asset relationship around the position the controller actually reaches. It changes the configuration used for data generation. It is not an operation performed on the physical environment during deployment.

Second, object-level correction measures the candidate's extra planar tracking error relative to a successful source rollout:

$$
\Delta e_{xy}=e_{xy}^{\mathrm{candidate}}-e_{xy}^{\mathrm{source}}.
$$

The generator shifts the interaction object or placement target accordingly, with task-specific yaw rules. Third, vertical grasp mismatch changes the reference wrist height smoothly around grasp closure through IK, while object height stays fixed. The corrected scene and motion are simulated again under the same acceptance tests. Falls, invalid collisions, and errors beyond the correction scope trigger resampling. [§3.2, Eqs. 5–6](https://arxiv.org/pdf/2610.35075v1#page=6)

This is the central contribution: reference synthesis proposes an interaction, rollout exposes the controller's systematic deviation, and correction constructs a feasible training example. The accepted dataset reflects configurations that this correction procedure can make executable, which matters when interpreting its coverage.

## The policy learns the controller's command space

The recorded action is

$$
a_t=(z_t,g_t)\in\mathbb R^{66},\qquad
z_t=E(\mathcal R_t)\in\mathbb R^{64},\qquad
u_t=D(z_t,h_t).
$$

SONIC's encoder maps a reference window to a 64-dimensional motion latent; its frozen decoder combines that latent with proprioceptive history to produce body joint targets. The remaining two action dimensions command the two hands' opening values. Despite the dexterous-hand hardware, this interface does not independently command every finger joint.

At deployment, the visuomotor policy predicts latent-and-hand action chunks from egocentric RGB, a 34-dimensional robot state, and the task instruction where supported. Real-time chunking supports continuous 50 Hz execution through the same controller interface used in data generation. GR00T fine-tuning updates the action module, projections, and selected normalization layers while keeping both backbones frozen. [§4.1 and §4.5.2](https://arxiv.org/pdf/2610.35075v1#page=14)

## Results with their training and evaluation counts

Table 8 reports twenty real trials per task under the Base configuration. The entries below are full-task successes, not intermediate-stage completion.

| Training demonstrations per task | Mobile pick-and-place | Hat placement | Basket transport | Mean |
| --- | ---: | ---: | ---: | ---: |
| 100 real | 8/20 | 11/20 | 9/20 | 46.7% |
| 100 generated | 7/20 | 10/20 | 9/20 | 43.3% |
| 800 generated | 12/20 | 15/20 | 13/20 | 66.7% |

The 20-percentage-point gain compares different data volumes. Equal-count results support the practical usefulness of the generated supervision, while the larger dataset shows the value of scaling it. With twenty trials per task and no uncertainty intervals in the table, small differences should not be treated as established equivalence or superiority. [Table 8](https://arxiv.org/pdf/2610.35075v1#page=11)

Expanded evaluation shifts robot starts, pick locations, place locations, and an object–goal pair. It compares a real-data policy trained only on Base with policies trained on expanded simulation coverage. Pooled success rises from **23/100 to 69/100**, across five settings with five trials per configuration. This measures transfer of added simulation coverage to the real robot; the expanded configurations are not all unseen during simulation training. [Table 9 and Appendix B.3](https://arxiv.org/pdf/2610.35075v1#page=12)

The 4,800 trajectories comprise 2,400 Base examples across three tasks, 1,600 Expanded examples for Tasks A and B, and 800 object–goal-shift examples. They are not 4,800 demonstrations for each task or each reported training condition.

## Which parts of the pipeline earn their cost

In the Task A Base generation ablation, removing root-guided scene correction reduces generation success from 61% to 16%. Removing object correction, vertical compensation, or velocity-adaptive transitions yields 49%, 51%, and 55%. This ablation has its own setting; the broader generation analysis reports 33%, 34%, and 25% success on Tasks A–C. Those denominators should stay separate.

Rendering also matters. With 100 simulated demonstrations, Gaussian observations improve Task A real full-task success from 3/20 with mesh rendering to 7/20. Reconstruction plus seven interaction assets takes a reported 7 hours 13 minutes. The 1.8× data-collection speedup averages the time to obtain fifty successful demonstrations for each task under the stated setup; it is not an end-to-end speedup that includes reconstruction and policy training. [Tables 3, 5–7](https://arxiv.org/pdf/2610.35075v1#page=9)

Adding real data does not automatically improve the final policy. With 100 real demonstrations plus 800 simulated demonstrations per task, mean full-task success is 53.3%, below the 66.7% simulation-only result. The authors connect this to the remaining visual-domain gap, but the experiment does not isolate that gap as the sole cause. The simulation benchmark's separate 69.7% GR00T result also uses a different evaluation protocol and must not be substituted for the real-robot score. [Tables 12–13](https://arxiv.org/pdf/2610.35075v1#page=13)

## What I would test next

The most useful idea is to validate demonstrations through the controller that will execute the learned policy. Kinematically valid reference motion is insufficient when balance changes the reachable interaction geometry. Co-adapting motion and scene gives a practical way to generate recoverable examples under that controller.

The remaining question is how far this correction-based coverage extends. The study uses one humanoid, a fixed whole-body controller, three tasks, and reconstructed environments with limited cross-scene evaluation. A useful next test would report how correction shifts the sampled configuration distribution, then evaluate on held-out scenes and interaction geometries. That would distinguish broader task coverage from repeatedly making familiar contact arrangements feasible.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

人形机器人可以跟踪一条看似合理的参考动作，却仍抓不到物体：平衡控制改变了机身实际停下的位置，也改变了手最终到达的位置。**Zero-HLM** 利用执行反馈，同时修正参考动作和仿真场景，处理这一误差。通过物理验证的成功执行，再配上逼真的第一人称图像，形成训练示范。

框架从 45 条仿真遥操作示范生成 4,800 条有效轨迹。在三项 Unitree G1 真机任务上，每任务使用 800 条仿真示范训练的 GR00T N1.7，平均完整任务成功率为 **66.7%**；每任务使用 100 条真实示范时为 **46.7%**。同样只有 100 条示范时，仿真训练为 43.3%。因此，摘要中的优势包含了生成数据扩量的收益。

## 论文与阅读版本

**Zero-HLM: Generalizable Humanoid Loco-Manipulation without Real Robot Data**，作者为 Dianyi Yang、Mengya Liu、Zhumei Wang、Yu Liu、Xiaochen Zhang、Yixuan Li、Le Ma、Yuhang Yang、Weiqi Huang、Wei Liang、Baoxiong Jia 和 Siyuan Huang。机构包括北京理工大学、BIGAI、清华大学和 Delta Intelligence。本文依据 2026 年 10 月 26 日提交的 23 页 [arXiv:2610.35075v1 技术报告](https://arxiv.org/abs/2610.35075v1)，于 2026 年 11 月 3 日核对。[PDF](https://arxiv.org/pdf/2610.35075v1) · [项目主页](https://young-bit.github.io/zero-hlm/)

## “无真实机器人数据”的适用范围

任务策略使用的示范来自仿真。整个流程仍使用真实场景的手机影像、关键资产的独立拍摄、公制标定，以及物理机器人执行的相机标定动作；还依赖预训练 GR00T 和 SONIC。这里的主张针对任务专属示范的来源，并不表示完全没有真实世界测量或预训练经验。

每项任务有十五条成功的仿真遥操作示范，事件条件将其划分为移动、操作和腿部关键交互片段。三项任务分别是走到桌边抓香蕉并放入篮子、蹲下取帽子后起身搬运并放到柜上、双手搬篮子的同时用脚关闭挡路柜门。每项报告三个阶段，最后一阶段的分数对应整个任务序列完成。[§3.2、§4.1](https://arxiv.org/pdf/2610.35075v1#page=7)

## 场景外观必须与碰撞几何对齐

Zero-HLM 用 MAtCha 从手机图像重建高斯场景，通过棋盘格确定公制尺度和地面对齐。多模态智能体利用 Blender MCP 与 Isaac Lab 构建可编辑网格场景，参考高斯重建提取的网格，并比较同一相机位姿下的渲染结果，修正几何与摆放。

高斯表示提供外观和空间参考，网格负责碰撞、关节及物理参数。关键交互资产单独拍摄和重建，智能体配置质量、摩擦、质心、碰撞形状和关节，再通过开柜门、释放物体等交互检查验证。表面看起来真实，并不足以确定这些物理属性。

成功执行后，系统回放记录的机器人和物体状态，通过带掩码的 z-buffer 合成，将高斯背景与仿真器渲染的机器人、物体组合起来。训练图像因此对应**实际执行状态**，包括跟踪误差。[§3.1、§3.3](https://arxiv.org/pdf/2610.35075v1#page=4)

## 将源动作适配到新的交互位置

生成器依据目标的位置与姿态距离，从附近的有效源示范中选择参考。A* 规划行走路径，SONIC 动作规划器将其转为全身参考。搬运时保留所需上身姿态，脚部交互则保留示范中的下身动作。

操作片段按照目标物体的相对关系变换手部轨迹：

$$
\widetilde T_{e,t}=T_o(T_o^{\mathrm{src}})^{-1}T_{e,t}^{\mathrm{src}}.
$$

其中 $T_o$ 是新物体或放置目标的位姿，$T_{e,t}^{\mathrm{src}}$ 是示范中的手部位姿。机械臂逆运动学实现变换后的轨迹，参考根节点和非活动关节保持不变。逐渐衰减的偏移连接片段边界，过渡时长根据手部所需位移调整，抓取与释放指令同步重新定时。[§3.2、公式 2–4](https://arxiv.org/pdf/2610.35075v1#page=5)

这仍只是一条候选参考。SONIC 必须同时满足平衡和接触约束，实际机身与手腕运动因此可能偏离参考。

## 根据机器人实际执行修正环境

每条候选动作都通过部署控制器在仿真中执行，再由成功、稳定和碰撞检查决定是否保留。可恢复的失败触发三类修正。

首先，根节点跟踪误差产生平面场景修正。设预期机器人位置和朝向为 $(x,\psi)$，实际值为 $(x',\psi')$，原本位于 $(x_j,\psi_j)$ 的资产更新为：

$$
x_j^{+}=x'+R_2(\psi'-\psi)(x_j-x),\qquad
\psi_j^{+}=\psi_j+\psi'-\psi.
$$

这围绕控制器实际到达的位置恢复预期的机器人—资产关系，改变的是生成数据时使用的仿真配置。真机部署时不会执行这一环境搬移操作。

其次，物体级修正测量候选执行相对于成功源执行增加的平面误差：

$$
\Delta e_{xy}=e_{xy}^{\mathrm{candidate}}-e_{xy}^{\mathrm{source}}.
$$

生成器据此平移交互物体或放置目标，并按任务规则调整偏航角。第三类修正处理垂直抓取错位：在抓取闭合附近平滑调整参考腕部高度，通过 IK 转为关节目标，物体高度保持不变。修正后的场景与动作重新执行相同验收测试；跌倒、非法碰撞和超出修正范围的错误则触发重新采样。[§3.2、公式 5–6](https://arxiv.org/pdf/2610.35075v1#page=6)

这构成论文的核心机制：动作合成提出交互，执行暴露控制器的系统性偏差，修正再构造可行训练样本。被接收的数据集也反映了这套修正流程能够实现的配置范围，解读覆盖度时需要考虑这一点。

## 策略学习控制器的指令空间

记录的动作表示为：

$$
a_t=(z_t,g_t)\in\mathbb R^{66},\qquad
z_t=E(\mathcal R_t)\in\mathbb R^{64},\qquad
u_t=D(z_t,h_t).
$$

SONIC 编码器把参考动作窗口映射到 64 维动作潜变量，冻结的解码器结合本体状态历史产生身体关节目标。其余两维控制两只手的开合。虽然硬件采用灵巧手，该接口并不独立控制每个手指关节。

部署时，视觉运动策略依据第一人称 RGB、34 维机器人状态，以及模型支持时的任务指令，预测潜变量与手部指令块。实时动作分块通过与数据生成一致的接口支持连续 50 Hz 执行。GR00T 微调更新动作模块、投影层和部分归一化层，两个骨干保持冻结。[§4.1、§4.5.2](https://arxiv.org/pdf/2610.35075v1#page=14)

## 带着训练量和评测次数读结果

表 8 在 Base 配置下为每项任务进行二十次真机评测。下表给出完整任务成功次数，不是中间阶段完成度。

| 每任务训练示范 | 移动抓放 | 帽子放置 | 搬篮关门 | 均值 |
| --- | ---: | ---: | ---: | ---: |
| 100 条真实示范 | 8/20 | 11/20 | 9/20 | 46.7% |
| 100 条生成示范 | 7/20 | 10/20 | 9/20 | 43.3% |
| 800 条生成示范 | 12/20 | 15/20 | 13/20 | 66.7% |

20 个百分点的提升比较了不同数据量。同数量结果支持生成监督的实用性，更大数据集则体现扩量价值。每项只有二十次试验，表中也没有不确定性区间，因此不能把小幅差异当作已经确立的等价性或优劣关系。[表 8](https://arxiv.org/pdf/2610.35075v1#page=11)

Expanded 评测改变机器人起点、抓取位置、放置位置及物体—目标组合。对照是仅用 Base 真实数据训练的策略，与接受扩展仿真覆盖的策略。五类设置、每个配置五次试验，合并成功次数从 **23/100 升到 69/100**。这检验新增仿真覆盖向真机的迁移；这些扩展配置并非全部在仿真训练中未见。[表 9、附录 B.3](https://arxiv.org/pdf/2610.35075v1#page=12)

4,800 条数据由三项任务的 2,400 条 Base 示例、任务 A/B 的 1,600 条 Expanded 示例，以及 800 条物体—目标变化示例组成。它们不是每项任务或每个报告条件各有 4,800 条示范。

## 哪些环节值得投入成本

任务 A 的 Base 生成消融中，去掉根节点引导的场景修正，生成成功率从 61% 降到 16%；去掉物体修正、垂直补偿或速度自适应过渡，分别得到 49%、51% 和 55%。该消融有独立设置；更广泛的数据生成分析对任务 A–C 报告 33%、34% 和 25%。这两组分母需要分开理解。

渲染同样重要。使用 100 条仿真示范时，高斯观测将任务 A 真机完整成功从网格渲染的 3/20 提高到 7/20。场景与七个交互资产的重建耗时为 7 小时 13 分钟。论文的 1.8 倍采集加速，来自给定设置下各任务获得五十条成功示范所需时间的平均比较，不是包含重建与策略训练的端到端加速。[表 3、5–7](https://arxiv.org/pdf/2610.35075v1#page=9)

加入真实数据也不一定改善最终策略。每任务使用 100 条真实示范加 800 条仿真示范时，平均完整成功率为 53.3%，低于纯仿真的 66.7%。作者将其与残留视觉域差距联系起来，但实验没有将视觉差距分离为唯一原因。此外，仿真基准中 GR00T 的 69.7% 使用另一套评测协议，不能替代真机分数。[表 12–13](https://arxiv.org/pdf/2610.35075v1#page=13)

## 我会继续验证的问题

最值得借鉴的是通过未来实际执行策略的控制器来验证训练示范。当平衡控制改变可达交互几何时，运动学可行的参考还不够。联合调整动作与场景，为生成控制器能够实现的示例提供了一条实用途径。

下一步的问题是，这种基于修正的覆盖能扩展多远。当前研究使用一种人形机器人、固定全身控制器和三项任务，跨重建场景评测仍有限。我会先报告修正前后配置采样分布如何变化，再测试未见场景与交互几何，以区分真正扩展任务覆盖和反复构造熟悉接触关系这两种效果。

</div>
