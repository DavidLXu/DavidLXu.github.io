---
title: "[Paper Notes] DexterCap: Affordable and Automated Capture of Complex Hand-Object Interactions"
date: 2026-06-16
permalink: /posts/2026/06/dextercap-paper-notes/
tags:
  - Dexterous Manipulation
  - Motion Capture
  - Hand-Object Interaction
  - Dataset
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DexterCap** is a low-cost optical motion-capture system for fine-grained hand-object interaction. The paper's main contribution is a capture-and-reconstruction pipeline for data collection; policy learning is downstream. It shows that dense, identifiable visual markers plus automated geometry can collect subtle in-hand manipulation data with higher fidelity and less manual cleanup than typical low-cost capture setups.

The key mechanism is to attach many character-coded marker patches directly to relatively rigid hand regions and objects. CornerNet, EdgeNet, and BlockNet recover marker corners, valid block edges, and two-character IDs from multi-view grayscale video; triangulated 3D markers then drive MANO hand fitting and object pose reconstruction. The resulting **DexterHand** dataset contains long in-hand manipulation sequences over primitive objects and a Rubik's Cube, making the work most useful as dataset infrastructure for dexterous robot learning.

## Paper Info

The paper is **"DexterCap: Affordable and Automated Capture of Complex Hand-Object Interactions"** by **Yutong Liang, Shiyi Xu, Yulong Zhang, Bowen Zhan, He Zhang, and Libin Liu**, accepted to **Eurographics 2026 / Computer Graphics Forum**. The arXiv entry uses the title **"DexterCap: An Affordable and Automated System for Capturing Dexterous Hand-Object Manipulation"** and is available as [arXiv:2601.05844](https://arxiv.org/abs/2601.05844). The project page is [pku-mocca.github.io/Dextercap-Page](https://pku-mocca.github.io/Dextercap-Page/), with code at [PKU-MoCCA/dextercap](https://github.com/PKU-MoCCA/dextercap) and dataset access through [Hugging Face](https://huggingface.co/datasets/pku-mocca/DexterCap).

## Core Problem

Fine hand-object capture sits in an awkward middle ground. Commercial optical mocap is accurate but expensive and often needs cleanup when markers disappear or swap. Data gloves reduce visual occlusion but still face drift and finger-accuracy issues. Markerless RGB/RGB-D methods are cheaper, yet severe self-occlusion, close contact, motion blur, and small in-hand rotations remain difficult.

DexterCap chooses explicit sensing design. The prototype uses **13 Hikvision MV-CS050-10GM industrial GigE PoE cameras** around a **2 x 1 x 2 m** capture cage, recording grayscale video at **2048 x 2448** and **20 FPS**. The reported hardware cost is **under 6,000 USD**. The system still needs one-time calibration, subject-specific MANO shape estimation, and a small amount of session labeling: **2-3 frames from each video captured by each camera**, with about **180 labeled frames** enough for the image models to generalize well in the same environment.

## Method

DexterCap's marker design is the center of the system. Each checkerboard-like white square contains a two-character ID drawn from uppercase letters and digits after removing visually confusing characters, giving **324 unique tags**; an underscore marks orientation. Instead of putting markers on a glove that can stretch, wrinkle, or slide, the system attaches marker patches to finger knuckles, finger segments, dorsum, and palm. Each hand uses **19 patches** and provides more than **500 detectable corners**. Object surfaces are marked as well, so rigid objects can be solved by pose alignment and articulated objects can expose internal state.

The visual parser is a three-stage cascade. **CornerNet** predicts checkerboard-corner heatmaps on grayscale patches. **EdgeNet** decides whether two candidate corners form a valid block edge, which makes assembly much cheaper than exhaustive quadrilateral validation. **BlockNet** reads the two characters and orientation, after which a voting step uses the known marker-patch layout to correct local mistakes. The edge-first design is both a speed trick and a reliability trick: it reduces wrong correspondences before geometric reconstruction begins.

Once 2D marker IDs are recovered across cameras, DexterCap triangulates 3D marker positions, keeps markers observed by at least **three cameras**, and uses RANSAC to reject outlier observations. It then removes inconsistent 3D clusters within a marker patch, filters abnormal temporal z-scores, and linearly interpolates short gaps when neighboring frames contain observations.

Hand reconstruction uses MANO with shape parameters \(\beta \in \mathbb{R}^{10}\) and pose parameters \(\theta \in \mathbb{R}^{45}\). The authors define anatomically informed local joint coordinates and reduce the controllable hand pose to:

$$
\phi \in \mathbb{R}^{27}
$$

which maps differentiably into the full MANO pose space. For each subject, a coarse Structure Sensor scan mounted on an iPhone produces a mesh of about 6k vertices for shape fitting through Chamfer distance, optionally helped by finger-length measurements. Calibration ties physical markers to constrained MANO submeshes and fixes marker-to-surface barycentric coordinates; per-frame optimization then solves global translation, global orientation, and hand pose with pose-limit regularization. When a marker and downstream markers on the same kinematic chain are occluded, the corresponding joint DoFs are held at their previous-frame values for temporal stability.

Object reconstruction is simple for rigid objects and more interesting for the Rubik's Cube. Rigid pose is estimated with the **Kabsch algorithm** by aligning observed object markers to canonical marker positions on the object mesh. For the **2 x 2 x 2** Rubik's Cube, DexterCap uses **384 markers** on external facelets, detects the rotating face through coplanarity analysis, decomposes the cube into two **1 x 2 x 2** blocks, registers them separately, and snaps accumulated rotation to discrete quarter turns. This example matters because it turns the system from rigid object tracking into structured articulated-state capture.

## Dataset and Results

DexterCap is used to build **DexterHand**, an open-source dataset for in-hand manipulation over seven basic object shapes plus a Rubik's Cube, including cuboids, cylinder, disk/plate, ring, and triangular prism variants. The selected sequences in Table 1 total **4936.65 seconds**, about **82 minutes**, with most sequences lasting around **7-12 minutes**. The reported average hand-object penetration is **0.38 +/- 0.31 cm**, which the authors interpret as consistent with real hand deformation under grasping forces.

Marker extraction is quantitatively strong: CornerNet reaches **94.7% precision**, **81.6% recall**, and **87.7% F1** at the image level; EdgeNet reaches **99.02% accuracy**, **98.9% precision**, **99.1% recall**, and **99.0% F1**; BlockNet reaches **98.39% orientation accuracy**, **97.95% left-character accuracy**, and **97.36% right-character accuracy**. The edge-first assembly reduces the search from **5550 quads per frame** to **83 blocks via 707 edges**. Reconstruction errors are also small for this capture setting: triangulated detected markers have **1.42 px** reprojection error, MANO marker reconstruction error is **0.77 +/- 0.28 mm** during calibration and **2.06 +/- 1.09 mm** during dynamic manipulation, and object marker fitting error is **1.512 mm**.

For motion quality, the paper compares DexterHand with GRAB, ARCTIC, HUMOTO, HaMeR, and GigaHands. The table is worth keeping because it compresses the main empirical claim: DexterHand is competitive with mocap/data-glove datasets and much stronger than vision-only baselines for fine in-hand manipulation.

| Dataset | MSNR ↑ | Jerk ↓ | Diversity ↑ | Coherence ↑ |
|---|---:|---:|---:|---:|
| DexterHand / Ours | 9.31 | 0.76 | 0.97 | 0.68 |
| GRAB (Vicon) | 7.29 | 3.68 | 0.91 | 0.70 |
| ARCTIC (Vicon) | 7.82 | 0.91 | 0.90 | 0.81 |
| HUMOTO (Data Glove) | 7.51 | 1.90 | 0.93 | 0.63 |
| HaMeR (Vision) | -0.05 | 23.76 | 0.90 | 0.81 |
| GigaHands (Vision) | 3.50 | 2.62 | 0.91 | 0.73 |

## Why It Matters

For robot learning, DexterCap is valuable because it records the things policies and tracking controllers often need but ordinary video rarely provides cleanly: fine hand articulation, object pose trajectories, contact-rich motion, long-horizon interaction, and articulated object state. DexterHand can therefore serve as a manipulation-prior source for later work such as ConTrack, which evaluates on DexterHand clips for continuous single-hand in-hand rotation.

The strongest idea is the full systems argument. DexterCap combines affordable camera hardware, dense explicit markers, learned visual parsing, geometric reconstruction, and MANO fitting into one capture loop. The Rubik's Cube example expands that argument from 6-DoF rigid pose to structured object state, which is exactly the sort of signal future dexterous manipulation datasets need.

## Limitations

DexterCap remains a vision-based marker system, so severe occlusion is still a real failure mode. The paper specifically mentions the ring-object case where fingers can be fully occluded, producing artifacts such as finger-object penetration. The dataset is useful but still limited in subject count, object diversity, and task range; the authors list future directions including more subjects, deformable and articulated objects, bimanual interaction, tool use, grasp labels, functional intent, contact regions, and force annotations.

The current implementation is also offline and computationally heavy: marker recognition takes roughly **5 seconds per frame**, and hand-object reconstruction takes **5-12 seconds per frame**. Marker patches reduce ambiguity but change the appearance of hands and objects, so the captured videos differ from natural RGB observations.

## Takeaway

DexterCap's core message is that high-quality dexterous hand data may need explicit capture design alongside stronger markerless vision. Dense character-coded patches, direct attachment to rigid hand regions, learned corner/edge/block recognition, anatomically constrained MANO fitting, and structured articulated-object reconstruction together make a low-cost system capable of collecting data that RGB-only methods still struggle to recover.

My short label for the paper is:

**Dexterous Hand-Object Motion Capture / Marker-Based Reconstruction / Dataset Infrastructure**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**DexterCap** 是一个用于精细 hand-object interaction 的低成本 optical motion-capture 系统。论文的主要贡献是一套用于数据采集的 capture-and-reconstruction pipeline；policy learning 是下游用途。它说明 dense, identifiable visual markers 加自动几何重建，可以用低成本采集高保真 in-hand manipulation 数据，并显著减少常见低成本采集系统中的人工清理。

核心机制是把大量 character-coded marker patches 直接贴到相对刚性的手部区域和物体表面。CornerNet、EdgeNet、BlockNet 从多视角灰度视频中恢复 marker corners、valid block edges 和两字符 ID；三角化后的 3D markers 再驱动 MANO hand fitting 和 object pose reconstruction。由此得到的 **DexterHand** 数据集包含基础物体和 Rubik's Cube 上的长时程 in-hand manipulation 序列，因此这篇工作的主要价值是为 dexterous robot learning 提供数据基础设施。

## Paper Info

论文标题是 **"DexterCap: Affordable and Automated Capture of Complex Hand-Object Interactions"**，作者是 **Yutong Liang, Shiyi Xu, Yulong Zhang, Bowen Zhan, He Zhang, and Libin Liu**，被 **Eurographics 2026 / Computer Graphics Forum** 接收。arXiv 页面使用的标题是 **"DexterCap: An Affordable and Automated System for Capturing Dexterous Hand-Object Manipulation"**，链接为 [arXiv:2601.05844](https://arxiv.org/abs/2601.05844)。项目主页是 [pku-mocca.github.io/Dextercap-Page](https://pku-mocca.github.io/Dextercap-Page/)，代码在 [PKU-MoCCA/dextercap](https://github.com/PKU-MoCCA/dextercap)，数据集在 [Hugging Face](https://huggingface.co/datasets/pku-mocca/DexterCap)。

## 核心问题

精细 hand-object capture 处在一个很尴尬的中间地带。商业 optical mocap 精度高，但成本高，marker 消失或交换时常常需要清理。Data gloves 能减少视觉遮挡影响，但仍有漂移和手指精度问题。Markerless RGB/RGB-D 方法更便宜，可是在严重自遮挡、紧密接触、运动模糊和细微 in-hand rotation 上仍然吃力。

DexterCap 选择从显式传感设计入手。原型系统使用 **13 台 Hikvision MV-CS050-10GM industrial GigE PoE cameras**，布置在 **2 x 1 x 2 m** 的 capture cage 周围，采集 **2048 x 2448**、**20 FPS** 的灰度视频。论文报告硬件成本低于 **6000 USD**。系统仍需要一次 calibration、subject-specific MANO shape estimation，以及少量 session 标注：每个 capture session 中，每个相机视频人工标注 **2-3 帧**；累计约 **180 个标注帧** 后，图像模型就能较好泛化到同一环境的新 session。

## 方法

DexterCap 的 marker design 是系统中心。每个类似 checkerboard 的白色方格包含一个两字符 ID，字符来自大写字母和数字，并剔除视觉上容易混淆的字符，总共有 **324 个 unique tags**；下划线用于指示方向。系统避开会伸缩、起皱、相对皮肤滑动的手套，把 marker 贴到 finger knuckles、finger segments、dorsum 和 palm 等手部区域。每只手使用 **19 个 patches**，提供超过 **500 个 detectable corners**。物体表面也贴 markers，因此刚体物体可以通过姿态对齐求解，articulated object 则可以暴露内部状态。

视觉解析器是三阶段 cascade。**CornerNet** 在灰度 patch 上预测 checkerboard-corner heatmaps。**EdgeNet** 判断两个候选 corners 是否构成有效 block edge，使组装过程比穷举 quadrilateral validation 便宜得多。**BlockNet** 读取两个字符和方向，随后利用 marker patch 内部的已知布局做 voting，纠正局部误识别。edge-first design 同时是效率策略和可靠性策略：它在进入几何重建前就减少了错误 correspondence。

当跨相机恢复出 2D marker IDs 后，DexterCap 三角化 3D marker positions，只保留至少被 **三台相机** 观测到的 markers，并用 RANSAC 去除 outlier observations。随后系统会移除 marker patch 内不一致的 3D clusters，过滤时间滑窗中的异常 z-scores，并在相邻帧有观测时对短缺失做线性插值。

手部重建使用 MANO，包含 shape parameters \(\beta \in \mathbb{R}^{10}\) 和 pose parameters \(\theta \in \mathbb{R}^{45}\)。作者定义符合解剖结构的局部关节坐标，把可控手部 pose 降到：

$$
\phi \in \mathbb{R}^{27}
$$

再以可微方式映射到完整 MANO pose space。对每个 subject，安装在 iPhone 上的低成本 Structure Sensor 会生成约 6k vertices 的粗 hand mesh，用 Chamfer distance 做 shape fitting，也可以加入手指长度测量。Calibration 把物理 markers 绑定到受限的 MANO submeshes，并固定 marker-to-surface barycentric coordinates；每帧优化 global translation、global orientation 和 hand pose，同时用 pose-limit regularization 限制不自然姿态。当某个 marker 及同一 kinematic chain 上更远端的 markers 都被遮挡时，相应 joint DoFs 会保持上一帧数值，以提升时间稳定性。

物体重建对刚体很直接，对 Rubik's Cube 更有意思。刚体 pose 使用 **Kabsch algorithm**，把 observed object markers 对齐到 object mesh 上的 canonical marker positions。对于 **2 x 2 x 2** Rubik's Cube，DexterCap 在外部 facelets 上布置 **384 个 markers**，通过 coplanarity analysis 判断正在旋转的面，把 cube 分解成两个 **1 x 2 x 2** blocks 分别注册，再把累计旋转 snap 到离散 quarter turns。这个例子很关键，因为它把系统从 6-DoF rigid pose tracking 推到 structured articulated-state capture。

## 数据集和结果

作者用 DexterCap 构建了 **DexterHand**，一个面向 in-hand manipulation 的开源数据集，覆盖七类基础物体形状和 Rubik's Cube，包括 cuboids、cylinder、disk/plate、ring 和 triangular prism 变体。Table 1 中的 selected sequences 总时长为 **4936.65 秒**，约 **82 分钟**，多数 sequence 约 **7-12 分钟**。selected sequences 的平均 hand-object penetration 是 **0.38 +/- 0.31 cm**，论文认为这与真实抓握力下的人手形变相符。

marker extraction 的定量结果很强：CornerNet 在 image level 达到 **94.7% precision**、**81.6% recall**、**87.7% F1**；EdgeNet 达到 **99.02% accuracy**、**98.9% precision**、**99.1% recall**、**99.0% F1**；BlockNet 达到 **98.39% orientation accuracy**、**97.95% left-character accuracy**、**97.36% right-character accuracy**。edge-first assembly 把搜索量从每帧 **5550 个 quads** 降到 **707 条 edges 产生的 83 个 blocks**。重建误差对这个采集设定也较小：triangulated detected markers 的 reprojection error 是 **1.42 px**，MANO marker reconstruction error 在 calibration 阶段是 **0.77 +/- 0.28 mm**，dynamic manipulation 阶段是 **2.06 +/- 1.09 mm**，object marker fitting error 是 **1.512 mm**。

motion quality 方面，论文把 DexterHand 与 GRAB、ARCTIC、HUMOTO、HaMeR 和 GigaHands 对比。这个表值得保留，因为它浓缩了主要实验结论：DexterHand 在 fine in-hand manipulation 上能和 mocap/data-glove 数据集竞争，并明显强于 vision-only baselines。

| Dataset | MSNR ↑ | Jerk ↓ | Diversity ↑ | Coherence ↑ |
|---|---:|---:|---:|---:|
| DexterHand / Ours | 9.31 | 0.76 | 0.97 | 0.68 |
| GRAB (Vicon) | 7.29 | 3.68 | 0.91 | 0.70 |
| ARCTIC (Vicon) | 7.82 | 0.91 | 0.90 | 0.81 |
| HUMOTO (Data Glove) | 7.51 | 1.90 | 0.93 | 0.63 |
| HaMeR (Vision) | -0.05 | 23.76 | 0.90 | 0.81 |
| GigaHands (Vision) | 3.50 | 2.62 | 0.91 | 0.73 |

## 为什么重要

对 robot learning 来说，DexterCap 的价值在于它记录了许多 policy 和 tracking controller 需要、但普通视频很难干净提供的信号：精细 hand articulation、object pose trajectories、contact-rich motion、long-horizon interaction 和 articulated object state。因此 DexterHand 可以作为 manipulation priors 的来源，也能服务 ConTrack 这类后续工作；ConTrack 就使用 DexterHand clips 评估 continuous single-hand in-hand rotation。

最强的思想是完整的系统论证。DexterCap 把 affordable camera hardware、dense explicit markers、learned visual parsing、geometric reconstruction 和 MANO fitting 串成一个 capture loop。Rubik's Cube 示例又把这个论证从 6-DoF rigid pose 扩展到 structured object state，而这正是未来 dexterous manipulation 数据集需要的信号。

## 局限

DexterCap 仍然是 vision-based marker system，因此严重遮挡仍然是真实失败模式。论文特别提到 ring-object 场景：手指可能被完全遮挡，从而产生 finger-object penetration 等 artifacts。数据集有价值，但 subject 数量、object diversity 和 task range 仍有限；作者列出的未来方向包括更多 subjects、deformable and articulated objects、bimanual interaction、tool use、grasp labels、functional intent、contact regions 和 force annotations。

当前实现也是离线且计算量较大的：marker recognition 大约 **5 秒/帧**，hand-object reconstruction 大约 **5-12 秒/帧**。marker patches 能降低歧义，但会改变手和物体的外观，因此采集视频和自然 RGB observations 之间存在 domain difference。

## Takeaway

DexterCap 的核心信息是：高质量 dexterous hand data 需要显式 capture design，不能只依赖更强的 markerless vision。dense character-coded patches、直接贴在手部刚性区域、learned corner/edge/block recognition、带解剖约束的 MANO fitting，以及 structured articulated-object reconstruction 合在一起，让低成本系统也能采集 RGB-only 方法仍难稳定恢复的数据。

我给这篇论文的短标签是：

**Dexterous Hand-Object Motion Capture / Marker-Based Reconstruction / Dataset Infrastructure**

</div>
