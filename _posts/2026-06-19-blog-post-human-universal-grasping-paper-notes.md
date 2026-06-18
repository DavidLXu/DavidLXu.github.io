---
title: "[Paper Notes] Human Universal Grasping"
date: 2026-06-19
permalink: /posts/2026/06/human-universal-grasping-paper-notes/
tags:
  - Dexterous Grasping
  - Human Data
  - Robot Learning
  - Flow Matching
  - Sim-to-Real
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Human Universal Grasping (HUG)** is built around a direct scaling argument: human egocentric grasp data can become dexterous robot grasp supervision if every grasp is mapped into a canonical human hand space and then retargeted at deployment. The paper collects smart-glasses recordings of people grasping everyday objects, fits each terminal grasp to MANO, trains an RGB-D and point-conditioned flow-matching model, and retargets the predicted human grasp to robot hands.

The headline assets are **1M-HUGs**, a 27.8-hour dataset with 1M egocentric grasp frames, 6,707 object instances, and 41 buildings; **HUG**, the flow-matching grasp model; and **HUG-Bench**, a 90-object benchmark with metric-scale meshes for paired simulation and real-world evaluation.

On the 30-object HUG-Bench test set, HUG reaches **73.0%** success in MuJoCo simulation, **66.7%** real-world tabletop success, and **62.0%** in-the-wild success. In tabletop trials, it beats Dex1B by **+23%** and CAP by **+34%**.

## Paper Info

The paper is **"Human Universal Grasping"** by **Kevin Yuanbo Wu, Tianxing Zhou, Isaac Tu, Billy Yan, Irmak Guzey, David Fouhey, Dandan Shan, and Lerrel Pinto**.

It appears on arXiv as [arXiv:2606.17054](https://arxiv.org/abs/2606.17054), dated **June 15, 2026**. The project page is [grasping.io](https://grasping.io/), with code, data, benchmark, checkpoints, and an interactive demo.

## Problem and Motivation

Dexterous grasping is still bottlenecked by data. Simulation can generate many grasps, but sim-to-real transfer for multi-fingered hands remains brittle; teleoperation collects real robot grasps, but it is slow and embodiment-specific. HUG shifts the source of supervision to ordinary human behavior. People already grasp thousands of objects in natural settings, and smart glasses now provide calibrated egocentric RGB-D, camera motion, and hand tracking for that behavior.

The core pipeline is compact: collect in-the-wild human grasps, fit them into a shared MANO hand space, learn a conditional distribution over human grasps from RGB-D observations and target points, then retarget the generated grasp to a robot hand. The paper's central claim is that this route gives robot dexterity a scalable data source while keeping the learned representation independent of any single robot embodiment.

## 1M-HUGs Dataset

1M-HUGs is collected with **Aria Gen 2** smart glasses. In each recording, the wearer first looks around a target object for 15-30 seconds while the hands stay out of view, then reaches in with the right hand and grasps the object. This protocol turns one physical grasp into many training pairs: the final grasp pose is propagated backward through camera poses and paired with earlier object-only RGB-D frames from different viewpoints.

Each curated training entry contains a 224 x 224 RGB or grayscale frame, intrinsics, metric depth, an object mask, and the terminal MANO hand pose plus wrist transform in the camera frame. The pipeline uses a vision-language model for object identification, SAM3 for mask propagation, heuristics for grasp-frame selection, and human review in a web annotation interface. After filtering, the dataset has **1M RGB frames** and **1M grayscale stereo-left frames**, roughly **2M training entries**, from **6,707 recordings**, **41 buildings**, and about **1.5K unique objects**.

## MANO as the Common Hand Space

Aria provides sparse 21-hand-landmark tracking, so HUG optimizes a full MANO hand for each frame. MANO separates shape \(\beta\), which controls hand size and proportions, from pose \(\theta\), which controls joint articulation. HUG fixes shape to one canonical hand during training, so different collectors do not introduce different hand scales into the grasp target.

This is the representation choice that makes the whole system portable. The model learns wrist placement and articulated finger pose in a stable human hand coordinate system. The same canonical MANO hand can be exported to MuJoCo for simulation, and the predicted hand pose can later be retargeted to robot hands with different kinematics.

## HUG Model

The model takes a single RGB-D observation and a 2D click \((u, v)\) on the target object. Depth and camera intrinsics lift the click to a 3D query point \(p_q\), giving the model a compact way to specify which object or object part should be grasped.

The output is a 99-dimensional grasp state:

$$
x = [t, R_{6d}, \theta_{6d}] \in \mathbb{R}^{99}
$$

Here \(t \in \mathbb{R}^3\) is wrist translation in the camera frame, \(R_{6d} \in \mathbb{R}^6\) is wrist rotation in the continuous 6D representation, and \(\theta_{6d} \in \mathbb{R}^{15 \times 6}\) represents the 15 MANO finger joints.

The perception stack combines RGB semantics with local 3D geometry. A frozen **DINOv2-Base with register tokens** encodes the image, while a trainable **PointNeXt U-Net** encodes 4096 points cropped within **0.3 m** of the query point. The two streams meet through **point painting**: point-cloud centroids are projected into the image, DINO features are sampled at those locations, and the concatenated RGB/3D features are refined by a transformer. The grasp generator is a flow-matching transformer that tokenizes translation, wrist rotation, and finger pose, conditions on the fused scene tokens, and integrates the learned velocity field with 50 Euler steps at inference.

## Training Objective

The learning objective combines velocity prediction in normalized grasp space with geometric hand supervision. The paper reconstructs the predicted clean grasp, runs it through MANO, and applies an L1 loss to 3D hand landmarks in the camera frame:

$$
L = \lambda_v L_v + \lambda_{3D}(1 - t)L_{3D}
$$

The weights are \(\lambda_v = 1\) and \(\lambda_{3D} = 20\). The \((1 - t)\) factor emphasizes near-clean denoising steps, where the reconstructed hand is physically meaningful. This 3D loss is crucial: removing it drops HUG-Bench test success from **73.0%** to **32.7%** and raises fingertip contact error from **14.6 mm** to **35.7 mm**. The full model trains for **100K steps** with AdamW, batch size 128, and two RTX 5090 GPUs, taking about **10 hours** including MuJoCo validation.

## HUG-Bench

HUG-Bench contains **90 unseen everyday objects**, arranged by five geometric categories (cylindrical, spheroidal, prismatic, appendaged, and amorphous) and three size bins. Each category-size cell has four validation objects and two test objects, giving **30 test objects** for real-world evaluation. The set is deliberately awkward: small and large items, handles, articulated structures, and objects that require structure-aware contact, including glue stick, pepper shaker, wine bottle, strawberry, football, storage bin, picnic basket, rubber duck, grapes, headphones, and easel.

The benchmark also contributes the simulation assets needed to evaluate dexterous grasps. The authors build metric meshes from short Aria recordings by extending Multi-view SAM3D with Aria intrinsics, extrinsics, and stereo depth, then manually align, make meshes watertight, and compute convex decompositions for MuJoCo. The released scan-to-asset pipeline is called **aria2mesh**.

## Simulation Results

In MuJoCo, the canonical MANO hand executes an open-loop pre-grasp, grasp, and lift rollout. A grasp succeeds if the object is lifted away from the surface.

The main simulation results are:

| Method | Val SR | Test SR | Test fingertip contact error |
|---|---:|---:|---:|
| RGB + PC full HUG | 71.5% | 73.0% | 14.6 mm |
| without point cloud crop | 61.2% | 58.0% | 25.7 mm |
| without point painting | 61.8% | 58.3% | 23.3 mm |
| without 3D loss | 39.2% | 32.7% | 35.7 mm |
| PC only | 64.2% | 70.7% | 22.1 mm |
| RGB only | 26.8% | 29.7% | 108.6 mm |
| Human grasp oracle | 90.3% | 94.0% | 7.4 mm |

The ablations point to a useful division of labor. Point-cloud geometry carries the main spatial signal, RGB adds semantic grounding and improves fingertip placement, and the full RGB+PC model gives the best contact accuracy. The human grasp oracle exposes the remaining gap from tracking noise, asset imperfections, and open-loop execution. Scaling is equally important: from **25K** to **1M** RGB frames, test success rises from **33%** to **73%**, while fingertip contact error drops from **54.2 mm** to **14.6 mm**. The curve has not saturated at 1M, so the system still looks data-bound.

## Real-World Results

The real-world evaluation uses the **30 HUG-Bench test objects**, with **10 trials per object** and **300 trials per method**.

In tabletop experiments, HUG and Dex1B are deployed on a 6-DoF Ability hand mounted on a 7-DoF xArm, using a third-person ZED stereo camera. CAP uses its published parallel-jaw configuration with an iPhone wrist camera.

| Method | Overall tabletop success | Objects with at least one success |
|---|---:|---:|
| Dex1B | 43.7% | 27/30 |
| CAP | 32.7% | 20/30 |
| HUG | 66.7% | 28/30 |

HUG is especially strong on large prismatic and structured objects: **10/10** on the storage bin where both baselines get **0/10**, **9/10** on the picnic basket, **9/10** on the spray bottle, and **8/10** on the easel.

The in-the-wild evaluation changes camera, arm, hand, scene, and viewpoint at once. HUG is deployed on a YOR mobile manipulator with an AgileX NERO arm, a 20-DoF WUJI hand, and Aria Gen 2 for vision, with no onsite model tuning or WUJI-specific retargeting adjustment. It reaches **62.0%** in-the-wild success, only **4.7 percentage points** below tabletop, and succeeds at least once on **29/30** objects.

## Failure Modes

The failure breakdown is practical rather than mysterious. Most failures occur during the transition from pre-grasp to grasp: the hand hits the object while closing, collides with the table, misses or overreaches before pre-grasp, slips during lift, or drops the object after it has been raised. This matches the system design. HUG predicts a static grasp and executes it open-loop after retargeting, so motion planning could reduce object/table collisions and force-aware closing could reduce post-grasp slips.

## Strengths and Limitations

The strongest part of HUG is the data flywheel. A single human grasp becomes many object-only RGB-D training pairs by back-propagating the final grasp into earlier frames, making smart-glasses capture far more efficient than one-pair-per-grasp collection. MANO gives the system a canonical human hand space for learning, simulation, and retargeting, while HUG-Bench makes the evaluation concrete with real objects, metric simulation assets, and real robot trials. The real-world transfer is the most compelling empirical signal: the same human-trained model works zero-shot across a ZED+xArm+Ability tabletop setup and an Aria+YOR+WUJI household setup.

The limitations are also clear. HUG is trained on right-hand grasps only, so left-handed, bimanual, and morphology-specific grasp styles are outside the current coverage. The fixed MANO shape gives consistency but can mismatch a target robot hand or a human grasp that depends on hand size. Deployment is open-loop, with no visual or force feedback during contact and lift. The model predicts one grasp per trial, leaving multi-sample selection as an obvious next step. The evaluation remains indoor-focused; outdoor, industrial, tool-use, transparent, reflective, and heavily deformable objects are still open directions.

## Takeaway

For my taxonomy, I would label this paper **Human Grasp Data / Dexterous Grasp Generation / RGB-D Flow Matching / Cross-Embodiment Retargeting**.

The reusable message is concise: use wearable capture to turn everyday human grasping into large-scale supervision; use MANO to canonicalize the human hand target; use RGB-D, a clicked 3D query point, and flow matching to generate a grasp; then use retargeting to move from human hand space to robot embodiments. HUG makes a persuasive case that human egocentric data can be a scalable route to dexterous robot grasping when the capture stack provides calibrated depth, camera motion, and hand tracking.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**Human Universal Grasping (HUG)** 的核心是一个很直接的 scaling argument：如果把人类第一视角抓取数据映射到 canonical human hand space，再在部署时 retarget 到机器人手，那么日常人手抓取就可以成为 dexterous robot grasping 的监督来源。论文用智能眼镜采集人类抓取日常物体的视频，拟合 MANO 终端抓取姿态，训练 RGB-D 和目标点条件化的 flow-matching model，最后把预测的人手抓取迁移到机器人手。

这篇论文的核心资产包括 **1M-HUGs**，一个包含 1M 帧第一视角抓取、27.8 小时记录、6,707 个 object instances 和 41 栋建筑的数据集；**HUG**，一个 flow-matching grasp model；以及 **HUG-Bench**，一个包含 90 个未见日常物体和 metric-scale meshes 的仿真/真实评估 benchmark。

在 30 个 HUG-Bench test objects 上，HUG 在 MuJoCo 仿真中达到 **73.0%** 成功率，在真实 tabletop 中达到 **66.7%**，在 in-the-wild 家庭环境中达到 **62.0%**。在 tabletop 评估里，它比 Dex1B 高 **+23%**，比 CAP 高 **+34%**。

## Paper Info

论文标题是 **"Human Universal Grasping"**，作者是 **Kevin Yuanbo Wu, Tianxing Zhou, Isaac Tu, Billy Yan, Irmak Guzey, David Fouhey, Dandan Shan, and Lerrel Pinto**。

论文 arXiv 页面是 [arXiv:2606.17054](https://arxiv.org/abs/2606.17054)，日期是 **2026 年 6 月 15 日**。项目页是 [grasping.io](https://grasping.io/)，包含 code、data、benchmark、checkpoints 和 interactive demo。

## 问题与动机

Dexterous grasping 仍然被数据限制。仿真可以生成大量 grasp，但多指机器人手的 sim-to-real transfer 仍然脆弱；teleoperation 可以采集真实机器人抓取，但速度慢且绑定特定 embodiment。HUG 把监督来源转向普通人的日常行为。人类本来就在自然环境里反复抓取各种物体，而智能眼镜现在可以为这种行为提供 calibrated egocentric RGB-D、camera motion 和 hand tracking。

这条 pipeline 很紧凑：采集 in-the-wild human grasps，将它们拟合到统一的 MANO hand space，用 RGB-D observation 和 target point 学习人手抓取的条件分布，再把生成的抓取 retarget 到机器人手。论文的中心判断是，这条路线给 robot dexterity 提供了可扩展的人类数据源，同时让学习到的表示不依赖某一个具体机器人。

## 1M-HUGs Dataset

1M-HUGs 使用 **Aria Gen 2** 智能眼镜采集。每段 recording 中，佩戴者先在双手不入镜的情况下围绕目标物体看 15-30 秒，然后右手进入画面并完成抓取。这个协议把一次真实抓取变成多条 training pairs：最终 grasp pose 通过 camera poses 回传到更早的 object-only RGB-D frames，于是同一个终端人手抓取可以和多个视角下的物体图像配对。

每个 curated training entry 包含 224 x 224 RGB 或 grayscale frame、intrinsics、metric depth、object mask，以及 camera frame 下的终端 MANO hand pose 和 wrist transform。pipeline 使用 vision-language model 识别物体，SAM3 传播 masks，启发式规则选择 grasp frame，并通过网页标注界面进行人工审核。过滤后，数据集包含 **1M RGB frames** 和 **1M grayscale stereo-left frames**，约 **2M training entries**，来自 **6,707 recordings**、**41 buildings** 和约 **1.5K unique objects**。

## MANO 作为统一手部空间

Aria 提供稀疏的 21 个 hand landmarks，HUG 通过逐帧优化得到完整 MANO hand。MANO 将人手拆成 shape \(\beta\) 和 pose \(\theta\)：前者控制手的大小与比例，后者控制关节姿态。HUG 在训练时固定 shape 到一个 canonical hand，因此不同采集者的手大小不会直接进入 grasp target。

这是整套系统可迁移的关键表示。模型在稳定的人手坐标系中学习 wrist placement 和 articulated finger pose；同一个 canonical MANO hand 可以导出到 MuJoCo 中做仿真，也可以在部署时 retarget 到具有不同 kinematics 的机器人手。

## HUG Model

模型输入是一张 RGB-D observation，以及目标物体上的一个 2D click \((u, v)\)。depth 和 camera intrinsics 会把这个点击提升为 3D query point \(p_q\)，用一个紧凑方式指定要抓哪个物体或物体部位。

输出是 99 维 grasp state：

$$
x = [t, R_{6d}, \theta_{6d}] \in \mathbb{R}^{99}
$$

其中 \(t \in \mathbb{R}^3\) 是 camera frame 下的 wrist translation，\(R_{6d} \in \mathbb{R}^6\) 是连续 6D rotation representation 下的 wrist rotation，\(\theta_{6d} \in \mathbb{R}^{15 \times 6}\) 表示 15 个 MANO finger joints。

perception stack 把 RGB semantics 和局部 3D geometry 结合起来。frozen **DINOv2-Base with register tokens** 编码图像；trainable **PointNeXt U-Net** 编码 query point 周围 **0.3 m** 内采样的 4096 个点。两路特征通过 **point painting** 融合：point-cloud centroids 投影到图像平面，采样对应 DINO feature，再与 3D feature 拼接并由 transformer refine。grasp generator 是 flow-matching transformer，它把 translation、wrist rotation 和 finger pose token 化，基于 fused scene tokens 条件化，并在推理时用 50 步 Euler integration 积分 learned velocity field。

## Training Objective

训练目标结合 normalized grasp space 中的 velocity prediction 和 geometric hand supervision。论文会重建 predicted clean grasp，通过 MANO 得到 3D hand landmarks，并在 camera frame 下使用 L1 loss：

$$
L = \lambda_v L_v + \lambda_{3D}(1 - t)L_{3D}
$$

其中 \(\lambda_v = 1\)，\(\lambda_{3D} = 20\)。\((1 - t)\) 因子强调接近 clean 的 denoising steps，因为这些步骤里的 reconstructed hand 在几何上更有意义。这个 3D loss 很关键：去掉它后，HUG-Bench test success 从 **73.0%** 降到 **32.7%**，fingertip contact error 从 **14.6 mm** 升到 **35.7 mm**。完整模型训练 **100K steps**，使用 AdamW、batch size 128 和两张 RTX 5090，包括 MuJoCo validation 在内约 **10 小时**。

## HUG-Bench

HUG-Bench 包含 **90 个未见日常物体**，按五类几何形状（cylindrical、spheroidal、prismatic、appendaged、amorphous）和三个尺寸区间组织。每个 category-size cell 有四个 validation objects 和两个 test objects，因此真实机器人评估使用 **30 个 test objects**。物体刻意选得比较难，覆盖小物体、大物体、handle、articulated structures 和需要结构化接触的物体，例如 glue stick、pepper shaker、wine bottle、strawberry、football、storage bin、picnic basket、rubber duck、grapes、headphones 和 easel。

benchmark 也提供 dexterous grasp evaluation 所需的仿真资产。作者从短 Aria recordings 构建 metric meshes：扩展 Multi-view SAM3D，引入 Aria intrinsics、extrinsics 和 stereo depth，再手动对齐、生成 watertight meshes，并计算 MuJoCo 需要的 convex decompositions。发布的 scan-to-asset pipeline 名为 **aria2mesh**。

## Simulation Results

在 MuJoCo 中，canonical MANO hand 执行 open-loop pre-grasp、grasp、lift rollout。如果物体被 lift 后离开表面，则认为 grasp 成功。

主要仿真结果如下：

| Method | Val SR | Test SR | Test fingertip contact error |
|---|---:|---:|---:|
| RGB + PC full HUG | 71.5% | 73.0% | 14.6 mm |
| without point cloud crop | 61.2% | 58.0% | 25.7 mm |
| without point painting | 61.8% | 58.3% | 23.3 mm |
| without 3D loss | 39.2% | 32.7% | 35.7 mm |
| PC only | 64.2% | 70.7% | 22.1 mm |
| RGB only | 26.8% | 29.7% | 108.6 mm |
| Human grasp oracle | 90.3% | 94.0% | 7.4 mm |

这些 ablation 显示了清晰分工：point-cloud geometry 提供主要空间信号，RGB 提供 semantic grounding 并改善 fingertip placement，完整 RGB+PC 模型获得最好的 contact accuracy。human grasp oracle 则暴露了 tracking noise、asset imperfections 和 open-loop execution 带来的剩余差距。scaling 结果同样重要：从 **25K** 到 **1M** RGB frames，test success 从 **33%** 增长到 **73%**，fingertip contact error 从 **54.2 mm** 降到 **14.6 mm**。曲线在 1M 时还没有饱和，说明系统仍然 data-bound。

## Real-World Results

真实评估使用 **30 个 HUG-Bench test objects**，每个物体 **10 次 trials**，每种方法总计 **300 次 trials**。

tabletop 实验中，HUG 和 Dex1B 部署在 7-DoF xArm 上的 6-DoF Ability hand，输入来自第三人称 ZED stereo camera。CAP 使用其论文配置：iPhone wrist camera 加 parallel-jaw gripper。

| Method | Overall tabletop success | Objects with at least one success |
|---|---:|---:|
| Dex1B | 43.7% | 27/30 |
| CAP | 32.7% | 20/30 |
| HUG | 66.7% | 28/30 |

HUG 在大型 prismatic objects 和结构复杂物体上尤其强：storage bin 上 HUG 是 **10/10**，两个 baseline 都是 **0/10**；picnic basket 是 **9/10**，spray bottle 是 **9/10**，easel 是 **8/10**。

in-the-wild 评估一次性改变 camera、arm、hand、scene 和 viewpoint。HUG 被部署到 YOR mobile manipulator，上面有 AgileX NERO arm、20-DoF WUJI hand，以及 Aria Gen 2 视觉输入；测试发生在不受控家庭环境中，没有 onsite model tuning，也没有针对 WUJI 做 retargeting adjustment。HUG 达到 **62.0%** in-the-wild success，只比 tabletop 低 **4.7 个百分点**，并在 **29/30** 个物体上至少成功一次。

## Failure Modes

失败分析展示的是一个很实际的问题。大多数失败发生在 pre-grasp 到 grasp 的转换阶段：手在闭合时撞到物体、撞到桌面、pre-grasp 前 miss 或 overreach、lift 时 slip，或者物体抬起后 drop。这与系统设计一致。HUG 预测的是 static grasp，retarget 后 open-loop 执行，因此 motion planning 可以减少物体/桌面碰撞，force-aware closing 可以减少 post-grasp slips。

## 优点与局限

HUG 最强的是 data flywheel。一次人手抓取可以通过 camera pose 回传到更早帧，生成大量 object-only RGB-D training pairs，让 smart-glasses capture 的效率远高于一次抓取只产生一个样本的采集方式。MANO 提供 canonical human hand space，连接 learning、simulation 和 retargeting；HUG-Bench 则用真实物体、metric simulation assets 和真实机器人 trials 让评估更具体。最有说服力的 empirical signal 是真实迁移：同一个人类数据训练出的模型，可以 zero-shot 部署到 ZED+xArm+Ability tabletop setup 和 Aria+YOR+WUJI household setup。

局限也很清楚。HUG 只在 right-hand grasps 上训练，left-handed、bimanual 和 morphology-specific grasp styles 还没有覆盖。固定 MANO shape 带来一致性，但也可能和目标机器人手或依赖手尺寸的人类抓取方式 mismatch。部署是 open-loop，在 contact 和 lift 阶段没有 closed-loop visual 或 force feedback。模型每次 trial 只预测一个 grasp，未来可以做多候选采样和选择。评估仍然集中在室内；户外、工业场景、tool use、透明/反光物体和高度 deformable objects 都还是开放方向。

## Takeaway

如果放进我的分类体系，我会把它标成 **Human Grasp Data / Dexterous Grasp Generation / RGB-D Flow Matching / Cross-Embodiment Retargeting**。

最值得复用的信息很简洁：用 wearable capture 把日常人手抓取变成大规模监督；用 MANO 统一人手目标；用 RGB-D、点击得到的 3D query point 和 flow matching 生成抓取；再用 retargeting 从 human hand space 迁移到机器人 embodiment。HUG 有力地说明，当 capture stack 同时提供 calibrated depth、camera motion 和 hand tracking 时，人类第一视角抓取数据可以成为 dexterous robot grasping 的可扩展路径。

</div>
