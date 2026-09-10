---
title: "[Paper Notes] Point2Pose: Occlusion-Recovering 6D Pose Tracking and 3D Reconstruction for Multiple Unknown Objects via 2D Point Trackers"
date: 2026-09-11
permalink: /posts/2026/09/point2pose-paper-notes/
tags:
  - 6D Pose Estimation
  - Object Tracking
  - 3D Reconstruction
  - Robotic Manipulation
  - FoundationPose
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

A hand covers a bottle, moves it, and reveals it in a different orientation. Recovering its pose requires finding correspondences to observations made before the occlusion. **Point2Pose** uses a long-range 2D point tracker for that association, lifts the tracked points into 3D with depth, and registers them against an object map built during the video. It tracks multiple unknown rigid objects and reconstructs their surfaces without a supplied CAD model or a preliminary scan.

Compared with **FoundationPose**, the main gain is reduced object preparation and recovery during long tracking sequences. FoundationPose remains more accurate on the paper's continuously visible benchmarks when given CAD models. Point2Pose's v2 abstract explicitly describes a tradeoff between single-object accuracy and broader tracking capabilities.

## Paper info

**Tzu-Yuan Lin, Ho Jae Lee, Kevin Doherty, Yonghyeon Lee, and Sangbae Kim** authored *Point2Pose: Occlusion-Recovering 6D Pose Tracking and 3D Reconstruction for Multiple Unknown Objects via 2D Point Trackers*. The listed affiliations are MIT and Boston Dynamics; Doherty's contribution was made in personal time, independently of his affiliated organization.

These notes cover the 20-page [arXiv:2604.10415v2](https://arxiv.org/abs/2604.10415v2), revised August 25, 2026, following the April 12 first submission. The [official repository](https://github.com/tzuyuan/point-to-pose) lists **ECCV 2026**. The [PDF](https://arxiv.org/pdf/2604.10415v2) contains the method and evaluation discussed below; the [project page](https://point2pose.github.io/) hosts the project materials.

## 1. What changes from FoundationPose

Both methods consume RGB-D observations. Point2Pose's phrase *monocular RGB-D* means one RGB-D camera stream; measured depth remains an input.

| Question | Point2Pose, as evaluated in the paper | FoundationPose |
|---|---|---|
| What object information is needed? | A few image points to identify each target; geometry is accumulated online | A CAD model, or reference images used to build a neural object representation |
| How is pose obtained? | Long-range point correspondence, 3D registration, and TSDF refinement | Render candidate poses, refine them with a learned network, and score them |
| How are multiple objects handled? | Aggregate their point queries in one tracker pass; maintain separate object maps | Apply the single-object pipeline to each target, with additional association and scheduling |
| What happens after tracking loss? | Recover correspondences to the existing map when points become visible again | Global pose estimation is available, but detecting loss and invoking it are system-level decisions |
| When is geometry built? | During tracking, using object-centric TSDF fusion | Supplied beforehand, or reconstructed from reference views before downstream estimation |

FoundationPose also has a **model-free** mode. Its reference views supply information about the target, and its published evaluation uses reference images with pose annotations. The pose networks generalize to new objects without fine-tuning, while the neural representation is fitted to the target's reference observations. Point2Pose starts from the current sequence and builds its own geometric reference. The distinction concerns available object information and when it is acquired. [FoundationPose, Sections 3.2 and 4.1](https://arxiv.org/html/2312.08344v2)

Point2Pose likewise uses pretrained components: SAM2 for segmentation, SuperPoint for selecting points, and a causal BootsTAP point tracker in the paper's implementation. It needs no new pose-network training for each object. “No training” in a demo description should be understood in that deployment sense.

## 2. From a clicked point to a 6D pose

User clicks prompt SAM2 to obtain an object mask. Within that mask, the system samples points that balance detector confidence and spatial coverage. A cluster of easy points on one small patch gives poor geometric constraints, even if every point is tracked accurately.

For a tracked pixel $u_n=(u_n^x,u_n^y)$ with valid depth, back-projection gives a current 3D observation:

$$
\tilde p_n=D_t(u_n)K^{-1}
\begin{bmatrix}u_n^x\\u_n^y\\1\end{bmatrix},
$$

where $K$ is the camera intrinsic matrix. This is the pinhole back-projection underlying the paper's lifting step. Each query retains an identity across time, so the current observation corresponds to a stored object-map point $p_n$. With $T$ mapping the object frame into the camera frame, the registration problem is

$$
T^*=\underset{T\in\mathrm{SE}(3)}{\arg\min}
\sum_n\left\|\tilde p_n-Tp_n\right\|^2.
$$

Equation (2) has an SVD solution when the correspondences are reliable. In practice, the hard part is deciding which correspondences to trust.

As the object rotates, new surfaces need new points. Appendix A samples additional points when the object rotates more than $10^\circ$ relative to previously sampled frames, or fewer than 25 tracked points remain visible. New points first enter a pending state. Three consecutive checks of pose stability, track quality, and mask consistency, followed by a 3D consistency check, protect the map from noisy additions. An erroneous point admitted to the map can corrupt many later frames.

## 3. Why one RANSAC solution can be wrong

The paper gives a useful mug example. Points on a largely symmetric body may appear stationary as the mug rotates, while a few points on the handle reveal the true rotation. The incorrect motion can have more supporting tracks than the correct one. A single consensus estimate can therefore select the wrong rotation.

Point2Pose runs **sequential RANSAC with SVD**: estimate a candidate, remove its consensus set, then seek another candidate among the remaining correspondences. This preserves alternative motions, including a smaller group of informative tracks.

The online TSDF then checks the candidates against dense depth. For each pose, observed surface points are transformed into the object frame; a small absolute TSDF value indicates agreement with the reconstructed surface. After selection, the method refines the pose with a Huber loss on TSDF residuals. A compact expression of this refinement objective is

$$
\min_{T\in\mathrm{SE}(3)}
\sum_{p\in\mathcal P_{\mathrm{cur}}}
\rho_H\!\left(\Phi(T^{-1}p)^2\right).
$$

Here $\Phi$ is the TSDF and $\mathcal P_{\mathrm{cur}}$ is the masked depth point cloud. The paper's Eq. (3) implements this with pose increments and Levenberg-Marquardt optimization. Sparse tracks propose plausible motions; dense geometry decides which motion fits the observed surface. [Point2Pose, Section 3.3](https://arxiv.org/html/2604.10415v2#S3.SS3)

At new keyframes, a factor graph jointly adjusts keyframe poses and map points. Its objective combines a first-frame prior, relative-pose constraints, and bearing/range observation residuals. TSDF fusion uses the estimated trajectory to accumulate object surfaces, and the resulting geometry supports later pose estimates. This coupling also means that sustained pose errors can damage reconstruction.

## 4. Recovery depends on remembering point identity

All objects' query points are processed together, while maps and pose estimates remain object-specific. When an object reappears, recovered tracks can reconnect the current frame to its existing map. The estimate does not have to rely solely on the last visible frame's pose.

The strongest direct evidence is a small ablation. **P2P-SH(10)** discards points after ten consecutive invisible frames. Across two real sequences containing five occlusion events, the full method recovers **5/5 within 30 frames after reappearance**; the shortened-history version recovers **0/5**. This supports retaining long-range identity, although five events do not establish a general recovery rate. The quantified recovery window also gives a more useful engineering interpretation than assuming that every disappearance is resolved in the first returning frame. [Section 4.5](https://arxiv.org/html/2604.10415v2#S4.SS5)

There is no visual measurement of a fully hidden object's changing pose. The demonstrated capability is recovery after reappearance, conditional on usable point tracks, depth, and geometry.

## 5. Accuracy changes with the tracking scenario

The following values come from Point2Pose v2, Tables 2 and 3. They are **ADD-S / ADD AUC (%) over thresholds from 0 to 0.1 m**, with higher values better. FoundationPose receives CAD meshes; Point2Pose receives no object CAD model. These are the authors' evaluations, not measurements reproduced for this post.

| Benchmark | Point2Pose ADD-S / ADD | FoundationPose ADD-S / ADD |
|---|---:|---:|
| YCBInEOAT: single-object manipulation | 92.67 / 85.11 | **96.00 / 92.48** |
| YCBMultiTrack-Synthetic: largely continuous visibility | 88.67 / 77.94 | **98.39 / 97.58** |
| YCBMultiTrack-Real: full occlusion and re-entry | **89.43 / 74.17** | 42.49 / 35.23 |

YCBInEOAT contains nine evaluated sequences with five objects. The new real-world benchmark contains eleven sequences with one to three objects, recorded with a RealSense D435i and OptiTrack ground truth. For multi-object evaluation, FoundationPose and BundleSDF are run separately for each object; Point2Pose tracks the objects together. [Evaluation setup and results](https://arxiv.org/html/2604.10415v2#S4)

The reversal between synthetic and real sequences matters. With a CAD mesh and sustained visibility, FoundationPose is more accurate. Frequent complete occlusion exposes the tested tracker's difficulty recovering, and Point2Pose gains from its persistent correspondence map. This comparison does not establish that a FoundationPose system with explicit loss detection, re-detection, and global re-initialization would have the same failures.

ADD-S uses closest-point matching and tolerates geometric symmetries; ADD is more sensitive to orientation errors. On the weakly textured HO3D AP12 sequence, Point2Pose reports **84.33 ADD-S AUC but 46.64 ADD AUC**. Coarse geometric alignment can look acceptable while orientation remains unreliable. Table 1 also gives Point2Pose a reconstruction Chamfer distance of **1.02 cm**, versus **0.58 cm** for BundleSDF, where lower is better.

Table 4 supports the geometric checks: removing multiple hypotheses reduces ADD AUC from **82.76 to 65.52**; removing SDF refinement gives **77.37**, and removing graph optimization gives **78.80**. These are comparisons within that ablation table. Its full-method score differs from Table 1's aggregate, so the values should not be mixed as though they were one identical run.

## 6. What this means for manipulation

Coordinate conventions are easy to overlook. Point2Pose initializes each object frame to coincide with the camera frame at the start, $T^C_{O,0}=I$. That frame stays attached to the object. The estimated motion and reconstructed shape are consistent in this chosen frame, but a grasp point specified in a CAD coordinate system needs an additional fixed alignment. The paper also assumes a camera fixed to the world in its formulation. A moving-camera deployment needs explicit handling of camera motion when the controller requires world-frame trajectories.

Runtime is another practical constraint. Point2Pose reports **2–10 Hz**, depending on tracker resolution and point count, with point tracking as the main bottleneck. FoundationPose reports about **32 Hz for tracking** and **1.3 s for pose estimation** on an RTX 3090 with an Intel i9-10980XE. These are separate implementations and workloads, so they do not give a controlled speed ratio. They do distinguish frequent local updates from more expensive global recovery. [Point2Pose, Section 4.4](https://arxiv.org/html/2604.10415v2#S4.SS4); [FoundationPose, Section 4.5](https://arxiv.org/html/2312.08344v2)

I would start with FoundationPose for a known part whose CAD frame defines the insertion axis or grasp contacts, provided the system includes a recovery policy. I would test Point2Pose first for unfamiliar rigid objects that must be tracked together through repeated occlusions. Weak texture, inaccurate masks, unreliable depth, and growing point counts remain reasons to test on the actual camera and objects before connecting either estimator to a controller.

The next comparison I would run is FoundationPose with explicit re-initialization against Point2Pose, using the same masks, depth, objects, and compute budget. Recovery delay, identity switches, orientation error after recovery, and downstream grasp success would show whether Point2Pose's tracking gains solve the manipulation problem at hand.

As of September 11, 2026, the [official repository](https://github.com/tzuyuan/point-to-pose) also advertises model-based tracking and Gaussian Splatting reconstruction added in August. Those extensions broaden the software beyond the CAD-free TSDF method evaluated in this paper; the tables above should not be assigned to those newer branches.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，可使用顶部导航栏的语言按钮。

## TL;DR

手遮住瓶子，将它转动，再露出来。要找回瓶子的位姿，系统需要把当前观测与遮挡前看到的表面重新对应起来。**Point2Pose** 用长期二维点跟踪建立这种对应，通过深度把点提升到三维，再与视频中逐步建立的物体地图配准。它可以跟踪多个未知刚体并重建表面，启动时无需 CAD，也无需先扫描物体。

与 **FoundationPose** 相比，主要收益是减少物体准备工作，并改善长序列中的遮挡恢复。在物体持续可见、提供 CAD 的实验中，FoundationPose 仍然更准确。Point2Pose 的 v2 摘要也明确承认：更广的跟踪能力伴随着部分单物体精度损失。

## 论文信息

论文全名为 *Point2Pose: Occlusion-Recovering 6D Pose Tracking and 3D Reconstruction for Multiple Unknown Objects via 2D Point Trackers*，作者是 **Tzu-Yuan Lin、Ho Jae Lee、Kevin Doherty、Yonghyeon Lee 和 Sangbae Kim**。署名机构为 MIT 和 Boston Dynamics；论文注明 Doherty 的工作在个人时间完成，独立于其任职机构。

本文依据 20 页的 [arXiv:2604.10415v2](https://arxiv.org/abs/2604.10415v2)，该版本更新于 2026 年 8 月 25 日，首版提交于 4 月 12 日。[官方仓库](https://github.com/tzuyuan/point-to-pose)标注论文录用于 **ECCV 2026**。下文的方法和实验来自[论文 PDF](https://arxiv.org/pdf/2604.10415v2)，演示材料见[项目主页](https://point2pose.github.io/)。

## 1. 相比 FoundationPose，改变了什么

两种方法都使用 RGB-D。Point2Pose 所说的 *monocular RGB-D* 指一路 RGB-D 相机输入，深度仍然是必需的观测。

| 问题 | Point2Pose 的论文评测方法 | FoundationPose |
|---|---|---|
| 启动需要哪些物体信息？ | 在图像上点选目标，在线积累几何 | CAD，或用于建立神经物体表示的参考图像 |
| 如何求位姿？ | 长期点对应、三维配准和 TSDF 精修 | 渲染候选位姿，用学习网络精修并评分 |
| 如何处理多个物体？ | 合并点查询，一次运行点跟踪器；分别维护物体地图 | 对各目标运行单物体流程，额外处理关联和调度 |
| 丢失后如何恢复？ | 点重新可见时，恢复与既有地图的对应 | 可重新运行全局位姿估计，但需要系统判断何时触发 |
| 何时建立几何？ | 跟踪期间，在物体坐标系内融合 TSDF | 预先提供，或先从参考视图重建再用于位姿估计 |

FoundationPose 也支持 **model-free**。参考视图提供了目标物体的信息，其论文评测使用带位姿标注的参考图像。位姿网络能够泛化到新物体，无需针对新物体微调；神经表示则需要根据目标的参考观测拟合。Point2Pose 直接从当前序列开始建立几何参考。两者的差别在于获得了哪些物体信息，以及何时获得这些信息。[FoundationPose 第 3.2、4.1 节](https://arxiv.org/html/2312.08344v2)

Point2Pose 同样依赖预训练组件：SAM2 负责分割，SuperPoint 用于选点，论文实现采用因果 BootsTAP 点跟踪器。它不需要为每个目标重新训练位姿网络，演示中“无需训练”的说法应按这个部署含义理解。

## 2. 从点选目标到六维位姿

用户点击目标后，SAM2 生成物体 mask。系统在 mask 内采样关键点，同时考虑检测置信度和空间分布。即使一小块表面上的点都跟得很准，过于集中的分布仍可能无法充分约束物体运动。

对具有有效深度的跟踪像素 $u_n=(u_n^x,u_n^y)$，反投影得到当前三维观测：

$$
\tilde p_n=D_t(u_n)K^{-1}
\begin{bmatrix}u_n^x\\u_n^y\\1\end{bmatrix},
$$

其中 $K$ 是相机内参。这是论文三维提升步骤对应的针孔相机反投影。点查询在时间上保留身份，因此当前观测可以对应到物体地图中的 $p_n$。令 $T$ 将物体坐标变换到相机坐标，配准目标为

$$
T^*=\underset{T\in\mathrm{SE}(3)}{\arg\min}
\sum_n\left\|\tilde p_n-Tp_n\right\|^2.
$$

对应关系可靠时，论文式（2）可以通过 SVD 求解。实际困难在于判断哪些对应关系可信。

物体转动后，新露出的表面需要新点。附录 A 在物体相对先前采样帧转动超过 $10^\circ$，或可见跟踪点少于 25 个时触发补点。新点先进入待验证状态，连续三次通过位姿稳定性、跟踪质量和 mask 一致性检查后，还要接受三维一致性检查，才加入地图。一个错误点一旦进入地图，就可能影响后续很多帧。

## 3. 为什么一次 RANSAC 仍可能选错

论文用杯子解释了这个问题。杯身大致对称，旋转时杯身上的点可能被误判为几乎不动，只有少量杯柄点反映真实转动。错误运动可能获得更多点的支持，单次共识估计便会选错旋转。

Point2Pose 使用**顺序 RANSAC 配合 SVD**：估计一个候选，移除支持它的点集，再从剩余对应中寻找下一个候选。这样可以保留不同运动假设，包括由少量有效点支持的真实运动。

在线 TSDF 随后利用稠密深度检查这些候选。每个候选将当前观测表面变换到物体坐标系；点处的 TSDF 绝对值越小，与重建表面越吻合。选出候选后，再用带 Huber 损失的 TSDF 残差精修位姿。将精修目标简写为

$$
\min_{T\in\mathrm{SE}(3)}
\sum_{p\in\mathcal P_{\mathrm{cur}}}
\rho_H\!\left(\Phi(T^{-1}p)^2\right).
$$

$\Phi$ 是 TSDF，$\mathcal P_{\mathrm{cur}}$ 是 mask 内深度生成的点云。论文式（3）通过位姿增量和 Levenberg-Marquardt 优化求解。稀疏点轨迹提出可能的运动，稠密几何判断哪一种运动符合当前表面。[Point2Pose 第 3.3 节](https://arxiv.org/html/2604.10415v2#S3.SS3)

加入新关键帧时，因子图联合调整关键帧位姿和地图点。目标函数包括首帧先验、相对位姿约束，以及方向和距离的观测残差。TSDF 根据估计轨迹融合物体表面，融合后的几何又支持后续位姿估计。这种相互依赖也意味着，持续的位姿错误会损坏重建结果。

## 4. 遮挡恢复依赖长期保留点的身份

多个物体的查询点一起处理，但地图和位姿分别维护。目标重新出现后，找回的点轨迹可以把当前帧接回既有地图，估计不必只依赖最后一次看见物体时的位姿。

最直接的证据来自一个小规模消融。**P2P-SH(10)** 在点连续不可见十帧后永久删除它。在两段真实序列、共五次遮挡事件中，完整方法在物体重新出现后的 **30 帧内恢复了 5/5 次**，缩短历史的版本恢复 **0/5 次**。结果支持长期保留点身份的作用，但五次事件不足以给出普遍恢复率。这个定量窗口也比假定每次都能在重现首帧恢复更适合工程判断。[第 4.5 节](https://arxiv.org/html/2604.10415v2#S4.SS5)

完全隐藏期间没有物体运动的视觉测量。实验展示的是重新可见后的恢复能力，其前提是仍能获得可用的点对应、深度和几何约束。

## 5. 精度取决于跟踪场景

下表取自 Point2Pose v2 的表 2、表 3。指标为 **0 至 0.1 m 阈值区间上的 ADD-S / ADD AUC（%）**，越高越好。FoundationPose 使用 CAD 网格，Point2Pose 不使用目标 CAD。这些是作者报告的结果，本文没有复现实验。

| 数据集 | Point2Pose ADD-S / ADD | FoundationPose ADD-S / ADD |
|---|---:|---:|
| YCBInEOAT：单物体操作 | 92.67 / 85.11 | **96.00 / 92.48** |
| YCBMultiTrack-Synthetic：大多持续可见 | 88.67 / 77.94 | **98.39 / 97.58** |
| YCBMultiTrack-Real：完全遮挡与离开视野后返回 | **89.43 / 74.17** | 42.49 / 35.23 |

YCBInEOAT 的评测包括五个物体、九段序列。新建真实数据集包含十一段序列，每段有一至三个物体，使用 RealSense D435i 采集 RGB-D，OptiTrack 提供位姿真值。多物体评测中，FoundationPose 和 BundleSDF 分别对各个目标运行，Point2Pose 同时跟踪多个目标。[实验设置与结果](https://arxiv.org/html/2604.10415v2#S4)

合成集与真实集上的结果发生反转，这一点很关键。提供 CAD 且物体持续可见时，FoundationPose 更准确；频繁完全遮挡暴露了被测跟踪流程的恢复困难，Point2Pose 从长期对应地图中受益。该对比不能证明，加入丢失检测、重检测和全局重新初始化的 FoundationPose 系统也会出现同样的失败。

ADD-S 采用最近点匹配，容忍几何对称；ADD 对方向错误更敏感。弱纹理的 HO3D AP12 序列上，Point2Pose 的 **ADD-S AUC 为 84.33，ADD AUC 只有 46.64**。物体几何大致对齐时，旋转仍可能不可靠。表 1 中 Point2Pose 的重建 Chamfer 距离为 **1.02 cm**，BundleSDF 为 **0.58 cm**，该指标越小越好。

表 4 则支持几何检查模块的作用：去掉多假设后，ADD AUC 从 **82.76 降至 65.52**；去掉 SDF 精修为 **77.37**，去掉图优化为 **78.80**。这些数字应在同一张消融表内比较。它的完整方法分数与表 1 的汇总分数不同，不能当作同一次相同运行的数据混用。

## 6. 接入机器人操作时，需要补齐什么

坐标约定很容易被忽略。Point2Pose 将各物体坐标系初始化为与起始相机坐标系重合，即 $T^C_{O,0}=I$，随后这个坐标系随物体运动。估计的运动与重建形状在该坐标系中保持一致，但 CAD 坐标系下定义的抓取点仍需要额外的固定对齐。论文的建模还假设相机固定于世界。若使用移动相机，而控制器需要世界坐标轨迹，就必须明确处理相机自身的运动。

速度也是实际约束。Point2Pose 报告 **2–10 Hz**，受点跟踪分辨率和点数影响，主要瓶颈是点跟踪。FoundationPose 在 RTX 3090 与 Intel i9-10980XE 上报告**跟踪约 32 Hz，单次位姿估计约 1.3 秒**。这些数字来自不同实现和工作负载，不能据此计算公平的加速比，但它们说明了高频局部更新与较昂贵的全局恢复之间的区别。[Point2Pose 第 4.4 节](https://arxiv.org/html/2604.10415v2#S4.SS4)；[FoundationPose 第 4.5 节](https://arxiv.org/html/2312.08344v2)

对于已知零件，如果插入轴或抓取接触点由 CAD 坐标定义，我会优先从 FoundationPose 开始，并为系统配上恢复策略。对于多个陌生刚体、反复遮挡的长序列，我会优先测试 Point2Pose。弱纹理、mask 错误、深度不可靠以及点数增长，都要求先在实际相机和目标物体上验证，再接入控制器。

我最想补做的对比是：让带明确重新初始化策略的 FoundationPose 与 Point2Pose 使用相同的 mask、深度、物体和算力预算，测恢复延迟、身份切换、恢复后的方向误差，以及最终抓取成功率。这些指标能判断跟踪能力的提升是否解决了当前操作任务的问题。

截至 2026 年 9 月 11 日，[官方仓库](https://github.com/tzuyuan/point-to-pose)还列出了 8 月新增的 model-based tracking 和 Gaussian Splatting 重建分支。软件能力已超出本文讨论的无 CAD、TSDF 论文方法；上面的实验数字不应直接归给这些新增分支。

</div>
