---
title: "[Paper Notes] CARD: Contact-Anchored Retargeting for Dexterous Manipulation"
date: 2026-11-03
permalink: /posts/2026/11/card-paper-notes/
excerpt: "CARD retargets human hand motion around contact locations, push directions, and force targets, then uses tactile tracking to preserve those forces during robot replay."
tags:
  - Paper Notes
  - Dexterous Manipulation
  - Retargeting
  - Tactile Sensing
  - Force Control
  - Human Demonstration Videos
---

<div data-lang="en" markdown="1">

## TL;DR

Matching a human fingertip trajectory can leave a robot hovering a few millimeters above the object or squeezing too weakly to lift it. **CARD** represents each demonstrated contact by its location, push direction, and force magnitude, then optimizes the robot hand around those targets. A tactile controller compensates for force errors during hardware replay.

The strongest hardware result holds the retargeted trajectories fixed: adding tactile tracking improves success from **4/30 to 25/30** over hammer lifting, cup lifting, and mustard dispensing. The reported **43–78% contact rate** measures geometric agreement over contact-anchor frames, a different quantity from task success.

## Paper and reading version

**CARD: Contact-Anchored Retargeting for Dexterous Manipulation**, by Cunxi Dai, Botao He, Francois R Hogan, Wei Pan, Rao Fu, Wen-Han Hsieh, Ruoshi Liu, Jitendra Malik, Guanya Shi, and Akash Sharma. Affiliations include Carnegie Mellon University, Amazon Frontier AI & Robotics, the University of Maryland, and UC Berkeley. These notes use the 20-page [arXiv:2610.36539v1 preprint](https://arxiv.org/abs/2610.36539v1), submitted October 27, 2026, checked on November 3, 2026. [PDF](https://arxiv.org/pdf/2610.36539v1) · [Project](https://card-retargeting.github.io/)

## A hand-surface contact interface

CARD maps video, tactile gloves, and motion capture into a MANO hand mesh sequence with sixteen semantic regions: three per finger plus the palm. Each region has at most one contact target per frame:

$$
C_f=(c_f,\widehat d_f,F_f),
$$

where $c_f$ lies on the hand surface, $\widehat d_f$ points into the object, and $F_f$ is the target force magnitude. This interface lets different robot hands share a contact description while using different kinematic structures.

For glove input, registered taxels supply contact and pressure. Contacting vertices are reduced to a weighted center in a local surface chart, smoothed over time, and mapped back onto the hand mesh. Video uses equally weighted vertices selected by predicted contact. Its force magnitudes are synthesized with a whole-clip grasp-balance procedure that seeks smooth corrections driving the contacts' net wrench toward zero. This is a force-target construction heuristic; video does not directly measure physical contact force or uniquely determine it. [§3.1 and Appendix A](https://arxiv.org/pdf/2610.36539v1#page=13)

The source distinction matters. Appendix A describes motion capture with a tactile glove, while Appendix H and Table 8 label the reported motion-capture contact-fidelity subset as proximity-derived contact. The pooled glove-plus-mocap result should therefore not be described as uniformly pressure-measured supervision.

## Vid-HACO estimates when and where the hand touches

Vid-HACO predicts contact probabilities for 778 MANO vertices from an eight-frame clip ending at the current frame. HaWoR provides hand crops and world-frame hand tracking. A video-pretrained V-JEPA 2.1 ViT-L encoder and DPT decoder feed vertex-contact and frame-contact heads.

Training uses 1.55 million frames across twelve datasets, with 10% held out per dataset. The contact labeling rule uses a 10 mm surface-distance threshold; predictions use probability threshold 0.52. The frame head and contact-free training frames help suppress false contact during approach and release.

On held-out HRDexDB, vertex F1 reaches **67.2**, versus **63.3** for released HACO and **62.6** for HACO retrained on the same data. Frame F1 reaches 95.3. These are contact-estimation results; downstream retargeting can still fail when a predicted anchor lies on empty space. [§§3.2, 4.4 and Table 2](https://arxiv.org/pdf/2610.36539v1#page=7)

## Retargeting chooses a contact point and a robot pose

Geometric initialization maps human joint motion to the robot skeleton and aligns the wrists and fingertips. The per-frame optimization then solves

$$
q^*=\arg\min_{q\in\mathcal Q}
E_{\mathrm{contact}}+E_{\mathrm{style}}+E_{\mathrm{smooth}}+E_{\mathrm{collision}},
$$

where $q$ includes wrist position, rotation, and hand joints, and $\mathcal Q$ enforces joint and velocity limits. Free fingers retain human-like posture; temporal regularization discourages abrupt motion.

For each assigned robot pad, CARD chooses a point balancing proximity to the target against the demonstrated position along the finger segment. This prevents a fingertip target from being satisfied by an unrelated part of the hand. Its contact objective combines reach error, pad-normal alignment with the desired push direction, and contact migration across the pad:

$$
E_{\mathrm{contact}}=\sum_f\rho_f^2\left[
 w_c^2\left(\|s_f^*-c_f\|^2+
 \lambda r^2(1-\widehat n_f\cdot\widehat d_f)\right)
 +w_{\mathrm{fix}}^2\|s_f^*-\Delta T_f s_f^{*,-}\|^2\right].
$$

Here $\Delta T_f$ carries the previous pad point into the current link pose. The anti-slip term discourages migration over the finger surface, allowing the hand and object to move together. The force-dependent weight $\rho_f=1+\tfrac12F_f/\max_{f'}F_{f'}$ gives larger-force contacts higher priority. This uses force to weight geometric optimization; the actual force is regulated during replay. The directional term encourages friction-cone alignment but does not prove full dynamic feasibility. [§3.3, Eqs. 1–3](https://arxiv.org/pdf/2610.36539v1#page=4)

An annealed cross-entropy optimizer evaluates 1,024 candidates over sixteen iterations per frame, followed by temporal smoothing. The reported solver rate is 10 FPS on one RTX 5090. Whole-clip force synthesis and centered smoothing make this an offline retargeting pipeline, even though Vid-HACO uses a trailing video window.

## “Object-free” still uses a geometric collision proxy

For mesh-free sources, CARD builds a pseudo-object: it maps contact points into each frame's wrist coordinates, accumulates them over the clip, and takes their convex hull. The hull's signed-distance field penalizes penetration into the contacted region. GRAB retargeting uses this proxy while reserving the actual object mesh for penetration evaluation.

This avoids requiring a reconstructed object as an input, but it retains an approximate object constraint inferred from contact. The proxy cannot describe every uncontacted surface or concavity. Appendix D also specifies that the authors' tracked motion-capture clips use the tracked object mesh with a stronger barrier. That is an exception to applying the mesh-free path uniformly across every experiment. [Appendix D](https://arxiv.org/pdf/2610.36539v1#page=16)

## Replay closes the force loop

CARD outputs joint targets and desired finger forces. An integral-dominant admittance loop compares desired and measured fingertip force, then adds bounded finger-curl offsets along fixed synergies:

$$
q_{\mathrm{cmd}}=q_{\mathrm{target}}+\sum_f\kappa_f\widehat\psi_f,
\qquad \kappa_f\in[0,1].
$$

A feedforward term $k_{\mathrm{ff}}J_f^\top F_f^{\mathrm{des}}\widehat d_f$ supplements joint impedance control. The force error adjusts the squeeze, while the recorded trajectory supplies the nominal motion. A contact state machine handles sensor dropouts and feedforward activation.

The paper calls this open-loop replay because there is no object-pose feedback or learned task policy. Fingertip force control is closed-loop. Large object displacement can still defeat the replay, because force regulation does not replan the task. [§3.4 and Appendix F](https://arxiv.org/pdf/2610.36539v1#page=5)

## Contact fidelity and task success need separate tables

The main fidelity evaluation retargets every method to SHARPA Wave. A contact is established when its target lies within 2 mm of the assigned link surface and the nearest pad sample is palmar. The in-cone metric additionally requires the correct region and a push-direction error within 45°. Each anchor-frame is a denominator unit: one frame can contain several anchors.

| Source | Clips | CARD contact rate | Best external baseline contact rate | CARD in-cone rate |
| --- | ---: | ---: | ---: | ---: |
| Monocular video | 20 | 61.4% | 9.7%, DexPilot | 35.2% |
| Glove + motion capture | 66 | 77.7% | 3.8%, DexPilot | 46.0% |
| GRAB | 100 | 43.1% | 22.5%, object-aware ReGrind | 16.2% |

These are Table 1's pooled anchor-frame rates. All methods are scored against the same stored targets, which CARD explicitly optimizes. That makes this a relevant alignment diagnostic, but not an independent measure of physical task completion. The gap between contact and in-cone rates also shows that reaching an anchor is easier than satisfying its directional requirements. [Table 1](https://arxiv.org/pdf/2610.36539v1#page=7)

The hardware ablation uses identical CARD trajectories with ten trials per task:

| Task | Position-only replay | With tactile tracker |
| --- | ---: | ---: |
| Hammer lift | 1/10 | 8/10 |
| Cup lift | 3/10 | 10/10 |
| Mustard dispensing | 0/10 | 7/10 |
| Total | 4/30 | 25/30 |

This directly tests whether adding force regulation helps replay those trajectories. It is a small three-task study, separate from the larger offline contact evaluation. [§4.2](https://arxiv.org/pdf/2610.36539v1#page=6)

Cross-embodiment examples include Wuji Hand 2, Unitree Dex3-1, and a parallel-jaw gripper. Semantic mappings merge human regions when a robot has fewer fingers. The controller assumptions vary: Dex3-1 has no tactile sensing and uses 1.2× grasp-action scaling; Wuji has no tactile sensing either and relies on its compliant inner surfaces without that scaling. These demonstrations do not establish identical force-tracking capability across embodiments.

## CARD-physics is an additional, object-aware experiment

CARD-physics modifies SPIDER's simulation retargeting stage by changing its initial reference, contact objective, and contact-target extraction. It requires object meshes and trajectories. On fifty GRAB clips, Table 3 reports strict task success rising from **12% to 32%**; on 48 motion-capture demonstrations it rises from **40% to 52%**.

The motion-capture evaluation uses two seeds, and a task counts as solved if either succeeds; GRAB uses one seed. The strict criterion includes sufficient object travel and lift, bounded peak position error, complete replay, and valid physics. These results support the contact representation inside a physics-based system. They are not success rates for the mesh-free hardware pipeline. [§4.5 and Appendix I](https://arxiv.org/pdf/2610.36539v1#page=19)

## What this adds to the contact-learning picture

Compared with [DemoMimic](/posts/2026/11/demomimic-paper-notes/), which uses contact rewards to train simulation teachers, CARD directly produces a trajectory and force-target sequence. Compared with [FACT](/posts/2026/10/fact-paper-notes/), which learns joint action/force prediction, CARD uses optimization and a tactile replay controller. The common issue is that reproducing hand motion does not guarantee reproducing contact.

My main takeaway is to preserve contact intent at the data interface, then test whether the controller can realize it. The unresolved bottlenecks are input-contact errors, approximate force synthesis, incomplete collision geometry, and recovery after object motion departs from the demonstration. Training a closed-loop task policy from CARD-generated data is proposed future work; the paper's strongest evidence concerns retargeting and replay.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

匹配人类指尖轨迹，仍可能让机器人悬在物体上方几毫米，或者因夹持力不足而无法提起物体。**CARD** 用接触位置、推力方向和力大小表示每个示范接触，再围绕这些目标优化机器人手部姿态；真机回放时，触觉控制器补偿力误差。

最直接的硬件证据固定了重定向轨迹：加入触觉跟踪后，提锤、提杯和挤芥末三项任务的成功次数从 **4/30 升至 25/30**。论文报告的 **43–78% 接触率**则统计接触锚点帧上的几何一致性，与任务成功率是不同指标。

## 论文与阅读版本

**CARD: Contact-Anchored Retargeting for Dexterous Manipulation**，作者为 Cunxi Dai、Botao He、Francois R Hogan、Wei Pan、Rao Fu、Wen-Han Hsieh、Ruoshi Liu、Jitendra Malik、Guanya Shi 和 Akash Sharma。机构包括卡内基梅隆大学、Amazon Frontier AI & Robotics、马里兰大学和加州大学伯克利分校。本文依据 2026 年 10 月 27 日提交的 20 页 [arXiv:2610.36539v1 预印本](https://arxiv.org/abs/2610.36539v1)，于 2026 年 11 月 3 日核对。[PDF](https://arxiv.org/pdf/2610.36539v1) · [项目主页](https://card-retargeting.github.io/)

## 定义在手表面的接触接口

CARD 将视频、触觉手套和动作捕捉转换为 MANO 手部网格序列，并使用十六个语义区域：每根手指三个区域，加上手掌。每个区域、每一帧最多对应一个接触目标：

$$
C_f=(c_f,\widehat d_f,F_f),
$$

其中 $c_f$ 位于手表面，$\widehat d_f$ 指向物体内部，$F_f$ 为目标力大小。这让运动学结构不同的机器人手能够共享接触描述。

手套输入通过已注册的触觉单元提供接触与压力。接触顶点在局部表面坐标中求加权中心，经过时间平滑后重新映射到手部网格。视频则对预测为接触的顶点等权处理。视频的力大小由整段抓握平衡程序合成：寻找平滑修正，使接触集合的合力旋量趋近零。这是一种构造力目标的启发式方法；视频并没有直接测量物理接触力，也不能唯一确定它。[§3.1、附录 A](https://arxiv.org/pdf/2610.36539v1#page=13)

数据来源需要区分。附录 A 描述了佩戴触觉手套的动作捕捉，但附录 H 和表 8 将接触保真评测中的动作捕捉子集标为基于距离的接触。因此，合并的手套加动作捕捉结果不能统一描述为实测压力监督。

## Vid-HACO 判断何时、何处接触

Vid-HACO 输入截至当前帧的八帧片段，为 778 个 MANO 顶点预测接触概率。HaWoR 提供手部裁剪图像和世界坐标手部跟踪；视频预训练的 V-JEPA 2.1 ViT-L 编码器与 DPT 解码器，再接顶点接触和整帧接触两个预测头。

训练使用十二个数据集的 155 万帧，每个数据集留出 10% 验证。标注规则使用 10 mm 表面距离阈值，预测概率阈值为 0.52。整帧接触头与无接触训练样本，有助于抑制接近、释放阶段的虚假接触。

在独立 HRDexDB 测试集上，顶点 F1 为 **67.2**，发布版 HACO 为 **63.3**，同数据重训 HACO 为 **62.6**；整帧 F1 为 95.3。这些是接触估计成绩，若预测锚点落在空处，下游重定向仍会失败。[§3.2、§4.4、表 2](https://arxiv.org/pdf/2610.36539v1#page=7)

## 同时选择接触点与机器人姿态

几何初始化把人手关节运动映射到机器人骨架，并对齐手腕和指尖。随后逐帧优化：

$$
q^*=\arg\min_{q\in\mathcal Q}
E_{\mathrm{contact}}+E_{\mathrm{style}}+E_{\mathrm{smooth}}+E_{\mathrm{collision}},
$$

$q$ 包含手腕位置、旋转和手部关节，$\mathcal Q$ 限定关节位置与速度。自由手指保留接近人类示范的姿态，时间正则抑制突变。

对于每个指定机器人指腹，CARD 选择一个兼顾目标距离和示范接触在指节上相对位置的表面点，避免用不相关的手部区域满足指尖目标。接触目标函数组合到达误差、指腹法向与推力方向的对齐，以及接触点在指腹表面的迁移：

$$
E_{\mathrm{contact}}=\sum_f\rho_f^2\left[
 w_c^2\left(\|s_f^*-c_f\|^2+
 \lambda r^2(1-\widehat n_f\cdot\widehat d_f)\right)
 +w_{\mathrm{fix}}^2\|s_f^*-\Delta T_f s_f^{*,-}\|^2\right].
$$

$\Delta T_f$ 将上一帧指腹点随连杆变换到当前姿态。防滑项限制接触在手指表面的迁移，同时允许手和物体共同运动。力相关权重 $\rho_f=1+\tfrac12F_f/\max_{f'}F_{f'}$ 提高较大力接触的优先级。这是在几何优化中用力加权，实际力则由回放控制器调节。方向项鼓励摩擦锥对齐，但并不构成完整动力学可行性的证明。[§3.3、公式 1–3](https://arxiv.org/pdf/2610.36539v1#page=4)

退火交叉熵优化器每帧进行十六轮、每轮评估 1,024 个候选，再做时间平滑。论文报告单张 RTX 5090 的求解速度为 10 FPS。即使 Vid-HACO 使用截至当前的窗口，整段力合成和居中平滑仍使完整重定向流程属于离线处理。

## “无需物体模型”仍包含碰撞几何代理

对于没有网格的来源，CARD 将各帧接触点变换到对应腕部坐标，跨片段累积后求凸包，形成伪物体。凸包的有符号距离场用于惩罚穿入已接触区域。GRAB 重定向也使用该代理，真实物体网格只用于穿透评测。

这样不要求输入重建物体，但仍从接触中推导近似物体约束，无法描述全部未接触表面或凹陷。附录 D 还说明，作者带物体跟踪的动作捕捉片段使用真实跟踪网格，并配置更强碰撞惩罚。因此，不能把所有实验都理解为完全相同的无网格路径。[附录 D](https://arxiv.org/pdf/2610.36539v1#page=16)

## 回放时闭合力反馈环

CARD 输出关节目标和手指期望力。以积分为主的导纳环比较期望力与实测指尖力，沿固定协同运动方向加入有界屈曲偏移：

$$
q_{\mathrm{cmd}}=q_{\mathrm{target}}+\sum_f\kappa_f\widehat\psi_f,
\qquad \kappa_f\in[0,1].
$$

前馈项 $k_{\mathrm{ff}}J_f^\top F_f^{\mathrm{des}}\widehat d_f$ 补充关节阻抗控制。记录轨迹提供名义运动，力误差调整挤压力；接触状态机处理传感器丢帧和前馈激活。

论文所说的开环回放，是没有物体位姿反馈或学习到的任务策略，指尖力控制本身是闭环。物体大幅偏移仍可能导致失败，因为调节力并不会重新规划任务。[§3.4、附录 F](https://arxiv.org/pdf/2610.36539v1#page=5)

## 接触保真与任务成功分开统计

主要保真评测将所有方法重定向到 SHARPA Wave。接触目标距离指定连杆表面不超过 2 mm、最近指腹采样点位于掌侧时，计为建立接触。锥内指标还要求语义区域正确、推力方向误差不超过 45°。分母单位是锚点帧，一个视频帧可以包含多个锚点。

| 来源 | 片段数 | CARD 接触率 | 最佳外部基线接触率 | CARD 锥内率 |
| --- | ---: | ---: | ---: | ---: |
| 单目视频 | 20 | 61.4% | DexPilot：9.7% | 35.2% |
| 手套与动作捕捉 | 66 | 77.7% | DexPilot：3.8% | 46.0% |
| GRAB | 100 | 43.1% | 使用物体信息的 ReGrind：22.5% | 16.2% |

这是表 1 合并锚点帧后的比例。所有方法都对同一组存储目标评分，而 CARD 显式优化这些目标，因此该指标适合诊断对齐质量，但并非独立的物理任务完成测量。接触率与锥内率之间的差距，也说明到达锚点比同时满足方向要求容易。[表 1](https://arxiv.org/pdf/2610.36539v1#page=7)

硬件消融固定 CARD 轨迹，每项任务试验十次：

| 任务 | 仅位置回放 | 加入触觉跟踪 |
| --- | ---: | ---: |
| 提起锤子 | 1/10 | 8/10 |
| 提起杯子 | 3/10 | 10/10 |
| 挤出芥末 | 0/10 | 7/10 |
| 合计 | 4/30 | 25/30 |

这直接检验力调节是否帮助同一轨迹完成回放。它是三项任务的小规模实验，需要与更大的离线接触评测区分。[§4.2](https://arxiv.org/pdf/2610.36539v1#page=6)

跨形态示例还包含 Wuji Hand 2、Unitree Dex3-1 和平行夹爪。手指数更少时，语义映射合并人手区域。控制条件并不相同：Dex3-1 没有触觉，采用 1.2 倍抓握动作缩放；Wuji 同样没有触觉，但依靠柔顺内表面，无需该缩放。这些展示不足以证明各形态具备相同力跟踪能力。

## CARD-physics 是额外的物体感知实验

CARD-physics 修改 SPIDER 的仿真重定向阶段，改变初始化参考、接触目标函数和接触目标提取方式，仍需要物体网格与轨迹。表 3 中，五十个 GRAB 片段的严格任务成功率由 **12% 升至 32%**；48 条动作捕捉示范由 **40% 升至 52%**。

动作捕捉评测使用两个随机种子，只要一个成功就视为任务解决；GRAB 使用一个种子。严格条件要求足够的物体移动和抬升、受限的峰值位置误差、完整回放以及有效物理过程。这支持接触表示在物理重定向系统中的价值，不能当作无网格真机流程的成功率。[§4.5、附录 I](https://arxiv.org/pdf/2610.36539v1#page=19)

## 放到接触学习路线中理解

[DemoMimic](/posts/2026/11/demomimic-paper-notes/) 把接触奖励用于训练仿真教师，CARD 直接生成轨迹和力目标序列；[FACT](/posts/2026/10/fact-paper-notes/) 学习动作与力的联合预测，CARD 则采用优化与触觉回放控制器。共同的问题是，复现手部运动并不能保证复现接触。

我最关注的是在数据接口中保留接触意图，再验证控制器能否真正实现它。目前的瓶颈包括输入接触错误、近似力合成、不完整碰撞几何，以及物体偏离示范后的恢复。用 CARD 数据训练闭环任务策略仍属于未来工作，本文最强的证据集中在重定向与回放。

</div>
