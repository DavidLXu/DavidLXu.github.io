---
title: "[Paper Notes] RoboPaint: From Human Demonstration to Any Robot and Any View"
date: 2026-06-16
permalink: /posts/2026/06/robopaint-paper-notes/
tags:
  - Robot Learning
  - Dexterous Manipulation
  - Human Demonstrations
  - VLA
  - Tactile Sensing
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**RoboPaint** is a Real-Sim-Real pipeline that turns instrumented human manipulation into robot-view VLA data. The core story is compact: capture human motion, vision, and tactile contact; retarget the hand motion across embodiments with tactile constraints; reconstruct the real scene; render robot trajectories from arbitrary views; then train policies on the generated image-action data.

The paper is primarily a data-generation paper. Its strongest technical idea is **Dex-Tactile retargeting**, which maps glove states to dexterous robot-hand states while preserving contact timing and force-related cues. The headline numbers are substantial for this kind of pipeline: retargeted trajectories reach **84% real-world replay success** across 10 objects, and Pi0.5 trained only on generated Real-Sim-Real data reaches **80% average success** on pick-and-place, pushing, and pouring.

## Paper Info

The paper is **"RoboPaint: From Human Demonstration to Any Robot and Any View"** by **Jiacheng Fan, Zhiyue Zhao, Yiqian Zhang, Chao Chen, Peide Wang, Hengdi Zhang, and Zhengxue Cheng** from **Paxini Tech**, **Shanghai Jiao Tong University**, and **Zhejiang University**.

The PDF is available as [arXiv:2602.05325](https://arxiv.org/abs/2602.05325). The data-processing toolkit referenced by the paper is [px-DataCollection/px_omnisharing_dataprocess_kit](https://github.com/px-DataCollection/px_omnisharing_dataprocess_kit).

## Core Technical Story

RoboPaint starts from the observation that passive human videos lack robot actions and tactile information, while direct robot teleoperation is slow, expensive, and tied to one embodiment. The paper therefore shifts the source of demonstrations to **instrumented human operation**. Operators wear custom gloves and manipulate objects in standardized capture rooms. The system records **11 RGB streams** at **1200 x 1920**, **3 RGB-D streams** at **720 x 1280**, **29-DoF glove joint angles**, tactile readings from glove sensors, and synchronized timestamps. The tactile channel count is reported as **14-channel tactile signals** in the abstract and **15 tactile channels** in the contribution list, so I would treat that detail as slightly inconsistent in the paper text.

This capture setup is the foundation of the method. The demonstrations are stored as a physical trace of manipulation: what the operator sees, how the wrist and fingers move, where the object is, and where contact forces appear. Wrist 6D poses are estimated with ArUco markers on wristbands, object 6D poses with FoundationPose, and glove kinematics/tactile maps from the instrumented glove. Calibrated extrinsics then move these quantities from camera coordinates into the robot/simulation frame.

## Cross-Embodiment Retargeting

Dex-Tactile retargeting maps human glove inputs:

$$
(J^{Glove}, P^{Glove}, \Gamma^{Glove})
$$

to target robot dex-hand states:

$$
(J^{Dex}, P^{Dex}, \Gamma^{Dex})
$$

The optimization has two terms:

$$
L = L_{kin} + L_{tac}
$$

The kinematic term aligns fingertip positions and orientation vectors:

$$
L_{kin} =
\frac{1}{N}\sum_i
\lambda_{pos}\|p_i^{Glove} - p_i^{Dex}\|_2
+ \lambda_{dir}\|d_i^{Glove} - d_i^{Dex}\|_2
$$

The tactile term gives higher weight to active contact regions. Each tactile point on the glove is mapped to a corresponding location on the robot hand surface, and the normalized force controls the contact weight:

$$
w_j^g = [1 + \exp(-20(F_j - 0.5))]^{-1}
$$

This weighting is the key design choice. Human and robot hands differ in finger length, topology, joint limits, actuation, and contact geometry, so pose matching alone can produce the wrong grasp. RoboPaint uses tactile correspondences to keep contact-heavy regions important during optimization, then synthesizes robot tactile signals by attenuating the original glove tactile readings according to spatial mismatch. The generated robot record can therefore include an optional ObjTac-style tactile heatmap channel.

## Scene Reconstruction and Rendering

The rendering side gives the pipeline its "any view" claim. RoboPaint reconstructs the deployment workspace with **3D Gaussian Splatting**, aligns the 3DGS scene to the robot/simulation coordinate system using a known-size ArUco marker and a similarity transform, exports it as a USD asset, and imports it into **Isaac Sim 5.1**. Static background appearance comes from 3DGS, while dynamic objects and robots are rendered with mesh models.

At each time step, the robot arm joints are computed by IK from retargeted TCP poses, dex-hand joints come from Dex-Tactile retargeting, object poses follow the estimated object trajectory, and observations can be rendered from arbitrary cameras. The VLA record is:

$$
d_t = [a_t, img_t^{visual}, (img_t^{tactile})]
$$

where:

$$
a_t = [pos_t, rot_t, j_t^{Dex}]
$$

Here, the action stores TCP translation, TCP rotation direction, and dex-hand joint angles. The released toolkit also describes a practical data stack: **DF-1** for preprocessed raw data, **DF-2** for parsed encoder/tactile data with bimanual and object poses, **DF-2R** for dex-hand retargeting, and **DF-3** for LeRobot-format training data.

## Results

The experiments test geometric alignment, real-world replay, and downstream policy learning. In simulation validation, the authors reproject estimated 3D gloves, object poses, and tactile contact points back onto RGB frames, then replay retargeted manipulation in Isaac Sim. The reported **average tactile contact error is 3.86 mm**.

For real-world replay, the setup is UR5 plus Paxini DexH13 across 10 objects, with 10 demonstrations per object. Replaying retargeted end-effector trajectories and dex-hand joint angles reaches **84% average success**. The paper reports higher success for simpler stable-contact objects and above-80% success even for harder objects such as a plastic cup and camera.

The policy experiment compares real teleoperation data with RoboPaint-generated Real-Sim-Real data on pick-and-place, push cuboid, and pour bottle. The most important table is:

| Model / Camera Setting | Tele Avg. | Paint Avg. |
|---|---:|---:|
| Diffusion Policy | 76.6% | 50.0% |
| Pi0.5 with wrist camera | 100.0% | 80.0% |
| Pi0.5 without wrist camera | 83.3% | 46.6% |

The best generated-data result is Pi0.5 with a wrist camera: **80%** average success from painted data, compared with **100%** from teleoperation. The gap is still real, but it is a meaningful tradeoff because the data source is much faster to collect and can be re-rendered across views.

The collection-time comparison explains why the paper cares about this tradeoff. For 100 successful demonstrations, human data collection is consistently faster, with speedups growing as tasks become longer or more dexterous:

| Task | Teleoperation | Human Demo | Speedup |
|---|---:|---:|---:|
| Pick and place | about 1h30m | about 35m | 2.57x |
| Open box | about 2h | about 30m | 4.00x |
| Push cuboid | about 2h | about 30m | 4.00x |
| Bagging fruits | about 10h | about 2h20m | 4.28x |
| Table bussing | about 12h | about 2h30m | 4.80x |
| Fold clothes | about 16h | about 3h | 5.33x |

## Limitations and Takeaway

RoboPaint is still an infrastructure-heavy approach. It needs specialized capture rooms, instrumented gloves, calibrated cameras, object scans, environment reconstruction, tactile correspondences, accurate object poses, and feasible IK. Errors in any part of that chain can produce trajectories that look plausible in rendering but fail physically. The policy results are also narrow: three downstream tasks, a small replay object set, and a remaining gap against teleoperation data.

The clear takeaway is that RoboPaint should be read as a data-scaling recipe for dexterous VLA systems. Its contribution is the connection between multimodal human capture, tactile-aware cross-embodiment retargeting, 3DGS + Isaac Sim rendering, and policy training from generated Real-Sim-Real data. For my taxonomy, I would label it as:

**Human-Demonstration-to-Robot Data Generation / Tactile-Aware Retargeting / Real-Sim-Real VLA Data Pipeline**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**RoboPaint** 是一套 Real-Sim-Real 管线，把带传感器的人类操作转换成机器人视角的 VLA 数据。核心技术故事很清楚：采集 human motion、vision 和 tactile contact；用触觉约束做跨 embodiment 的手部 retargeting；重建真实场景；从任意视角渲染机器人轨迹；最后用生成的 image-action data 训练 policy。

这篇论文主要贡献在数据生成。最强的技术点是 **Dex-Tactile retargeting**：它把 glove states 映射成 robot dex-hand states，同时保留 contact timing 和 force-related cues。关键结果也比较有分量：retargeted trajectories 在 10 个物体上达到 **84% real-world replay success**；只用生成的 Real-Sim-Real 数据训练的 Pi0.5，在 pick-and-place、pushing、pouring 上达到 **80% average success**。

## Paper Info

论文标题是 **"RoboPaint: From Human Demonstration to Any Robot and Any View"**，作者是 **Jiacheng Fan, Zhiyue Zhao, Yiqian Zhang, Chao Chen, Peide Wang, Hengdi Zhang, and Zhengxue Cheng**，来自 **Paxini Tech**、**上海交通大学** 和 **浙江大学**。

PDF 链接是 [arXiv:2602.05325](https://arxiv.org/abs/2602.05325)。论文中引用的数据处理工具是 [px-DataCollection/px_omnisharing_dataprocess_kit](https://github.com/px-DataCollection/px_omnisharing_dataprocess_kit)。

## 核心技术故事

RoboPaint 的出发点是：普通人类视频没有 robot actions 和 tactile information，而直接机器人遥操作又慢、贵，并且绑定具体 embodiment。因此论文把 demonstration 的来源转向 **instrumented human operation**。操作者戴着自研手套，在标准化采集房里操作物体。系统记录 **11 路 RGB streams**，每路 **1200 x 1920**；**3 路 RGB-D streams**，每路 **720 x 1280**；**29-DoF glove joint angles**；手套触觉传感器读数；以及同步时间戳。触觉通道数在摘要中写作 **14-channel tactile signals**，在 contribution list 中写作 **15 tactile channels**，所以这个细节在论文文本里略有不一致。

这个采集系统是整个方法的基础。demonstration 被存成操作的 physical trace：操作者看到什么、手腕和手指如何运动、物体在哪里、接触力出现在哪里。wrist 6D poses 来自 wristbands 上的 ArUco markers，object 6D poses 来自 FoundationPose，glove kinematics 和 tactile maps 来自 instrumented glove。之后再通过标定外参，把这些量从相机坐标系转换到 robot/simulation frame。

## Cross-Embodiment Retargeting

Dex-Tactile retargeting 把 human glove inputs：

$$
(J^{Glove}, P^{Glove}, \Gamma^{Glove})
$$

映射成目标 robot dex-hand states：

$$
(J^{Dex}, P^{Dex}, \Gamma^{Dex})
$$

优化目标有两部分：

$$
L = L_{kin} + L_{tac}
$$

kinematic term 对齐 fingertip positions 和 orientation vectors：

$$
L_{kin} =
\frac{1}{N}\sum_i
\lambda_{pos}\|p_i^{Glove} - p_i^{Dex}\|_2
+ \lambda_{dir}\|d_i^{Glove} - d_i^{Dex}\|_2
$$

tactile term 给 active contact regions 更高权重。glove 上每个 tactile point 都映射到机器人手表面的对应位置，normalized force 决定 contact weight：

$$
w_j^g = [1 + \exp(-20(F_j - 0.5))]^{-1}
$$

这个权重设计是关键。人手和机器人手在指长、拓扑、关节限制、驱动方式和接触几何上都不同，只匹配姿态容易得到错误 grasp。RoboPaint 用 tactile correspondences 让接触更强的位置在优化中更重要，然后根据空间误差衰减原始 glove tactile readings，合成 robot tactile signals。生成的机器人记录因此可以包含可选的 ObjTac-style tactile heatmap channel。

## Scene Reconstruction and Rendering

渲染模块支撑了 “any view” 这个主张。RoboPaint 用 **3D Gaussian Splatting** 重建部署工作区，通过已知尺寸的 ArUco marker 和 similarity transform，把 3DGS scene 对齐到 robot/simulation coordinate system，再导出为 USD asset 并导入 **Isaac Sim 5.1**。静态背景来自 3DGS，动态物体和机器人由 mesh models 渲染。

每个时间步中，robot arm joints 由 retargeted TCP poses 通过 IK 求解，dex-hand joints 来自 Dex-Tactile retargeting，object poses 跟随估计出的 object trajectory，observations 可以从任意相机渲染。VLA record 写作：

$$
d_t = [a_t, img_t^{visual}, (img_t^{tactile})]
$$

其中：

$$
a_t = [pos_t, rot_t, j_t^{Dex}]
$$

这里的 action 包含 TCP translation、TCP rotation direction 和 dex-hand joint angles。发布的工具仓库还给出了一套实用数据栈：**DF-1** 是经过 preprocessing 和 quality inspection 的 raw data，**DF-2** 解析 encoder/tactile data 并加入 bimanual/object poses，**DF-2R** 做 dex-hand retargeting，**DF-3** 转成 LeRobot-format training data。

## Results

实验验证 geometric alignment、real-world replay 和 downstream policy learning。在 simulation validation 中，作者把估计出的 3D gloves、object poses 和 tactile contact points 重新投影到 RGB frames 上，再在 Isaac Sim 中 replay retargeted manipulation。论文报告的 **average tactile contact error 是 3.86 mm**。

真实 replay 的平台是 UR5 加 Paxini DexH13，覆盖 10 个物体，每个物体 10 条 demonstrations。机器人 replay 由人类示范 retarget 得到的 end-effector trajectories 和 dex-hand joint angles，平均成功率达到 **84%**。论文还提到，简单几何和稳定接触的物体成功率更高；塑料杯、相机等较难物体也能保持 80% 以上。

policy 实验比较真实 teleoperation data 和 RoboPaint 生成的 Real-Sim-Real data，任务是 pick-and-place、push cuboid、pour bottle。最关键结果如下：

| Model / Camera Setting | Tele Avg. | Paint Avg. |
|---|---:|---:|
| Diffusion Policy | 76.6% | 50.0% |
| Pi0.5 with wrist camera | 100.0% | 80.0% |
| Pi0.5 without wrist camera | 83.3% | 46.6% |

生成数据的最好结果是带 wrist camera 的 Pi0.5：只用 painted data 达到 **80%** average success，而 teleoperation data 是 **100%**。这个差距仍然存在，但考虑到采集速度和可从多视角重新渲染的能力，它是一个有意义的 tradeoff。

采集时间对比解释了论文为什么重视这个 tradeoff。收集 100 条成功 demonstrations 时，人类数据采集始终更快，并且任务越长、越依赖灵巧操作，速度优势越明显：

| Task | Teleoperation | Human Demo | Speedup |
|---|---:|---:|---:|
| Pick and place | about 1h30m | about 35m | 2.57x |
| Open box | about 2h | about 30m | 4.00x |
| Push cuboid | about 2h | about 30m | 4.00x |
| Bagging fruits | about 10h | about 2h20m | 4.28x |
| Table bussing | about 12h | about 2h30m | 4.80x |
| Fold clothes | about 16h | about 3h | 5.33x |

## 局限和 Takeaway

RoboPaint 仍然是基础设施较重的方案。它需要专门采集房、instrumented gloves、标定相机、物体扫描、环境重建、tactile correspondences、准确 object poses 和可行 IK。链条中任一环节出错，都可能生成视觉上合理但物理上脆弱的轨迹。policy 结果的范围也还有限：三个下游任务、较小的 replay 物体集合，并且和 teleoperation data 之间仍有性能差距。

清晰 takeaway 是：RoboPaint 应该被当作 dexterous VLA 的数据扩展 recipe 来读。它把 multimodal human capture、tactile-aware cross-embodiment retargeting、3DGS + Isaac Sim rendering、以及基于生成 Real-Sim-Real 数据的 policy training 串成了一条完整链路。我的分类标签会写成：

**Human-Demonstration-to-Robot Data Generation / Tactile-Aware Retargeting / Real-Sim-Real VLA Data Pipeline**

</div>
