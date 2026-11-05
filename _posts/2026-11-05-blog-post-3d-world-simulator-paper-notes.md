---
title: "[Paper Notes] Hybrid Particle-Voxel Dynamics for Multimodal 3D World Simulation"
date: 2026-11-05
permalink: /posts/2026/11/3d-world-simulator-paper-notes/
excerpt: "3D World Simulator predicts action-conditioned voxel latents and decodes them into 3D Gaussian particles and tactile particles, supporting 50 Hz rollouts, policy data generation, policy evaluation, and planning."
tags:
  - Paper Notes
  - World Models
  - Tactile Sensing
  - 3D Gaussian Splatting
  - Deformable Manipulation
  - Data Generation
  - Planning
---

<div data-lang="en" markdown="1">

## TL;DR

**3D World Simulator** runs its dynamics in a 3D voxel latent space and decodes each predicted state into 3D Gaussian particles and tactile particles. One prediction can therefore be rendered from any camera, inspected as geometry, and read as touch aligned with the contacted surface. The authors report interactive rollouts at **50 Hz**.

The central design choice is where each representation lives: voxels give the dynamics model a fixed, predictable target; particles give the decoder free-space detail and something renderable. This removes the need for point tracks or object-specific states during training. Across six ALOHA tasks and 200-step open-loop rollouts, it beats all video and particle baselines on every reported metric. Its generalization evidence is more mixed: on held-out Deform360 objects, geometry stays best while rendering falls behind.

## Paper and reading version

**Hybrid Particle-Voxel Dynamics for Multimodal 3D World Simulation**, by Jimmy Wang, Yifan Chou, Kaifeng Zhang, Yixuan Wang, Binghao Huang, Tao Yu, Saleh Nabi, and Yunzhu Li, from Columbia University, UC Berkeley, the University of Michigan, NVIDIA, and Analog Devices. These notes use the 25-page [arXiv:2611.04492v1](https://arxiv.org/abs/2611.04492v1), dated November 3, 2026, checked November 5, 2026. [PDF](https://arxiv.org/pdf/2611.04492v1) · [Project and interactive demo](https://jwang771.github.io/3dworldsimulator/) · [Code](https://github.com/jwang771/3d-world-simulator)

## Why the state sits on a voxel grid

The input at time $t$ is a point cloud $P_t \in \mathbb{R}^{7\times n}$: 3D position, RGB, and one tactile channel. Predicting this cloud directly is awkward because it is unordered and its point count changes every frame, so there is no stable frame-to-frame target unless identities are maintained. Prior particle models usually maintain them through tracking. The authors avoid that route because correspondences become unreliable with deformable objects and in-hand manipulation under heavy occlusion.

A voxel latent provides fixed spatial locations, which gives the dynamics model a consistent regression target. Voxels alone would be coarse and costly at high resolution, so the decoder adds particles on top. In the ALOHA configuration, an 8-channel latent grid of $32\times16\times32$ covers a $0.52\times0.32\times0.28$ m workspace. By my arithmetic, each latent cell spans about $16\times20\times9$ mm, so fine geometry has to come from the decoder's upsampling and particle offsets.

## Hybrid particle-voxel autoencoder

The encoder voxelizes the cloud, averages point features in occupied cells, and uses strided sparse 3D convolutions to reach the latent $z_t$, which is unit-normalized per voxel along the channel dimension. The decoder has two stages. Transposed 3D convolutions upsample the latent and predict occupancy at three resolutions. Occupied voxels then seed two particle-refinement stages, where a light MLP predicts continuous positions and Gaussian attributes: color through degree-one spherical harmonics, anisotropic scale, rotation, and opacity.

Tactile readings use the same output space. Forward kinematics places the FlexiTac pads in the world frame, so touch enters as additional particles with their own occupancy and signal supervision. This is the mechanism behind "spatially aligned" tactile prediction: touch shares coordinates with the geometry it contacts, and no separate tactile image stream is needed.

Training combines four terms:

$$
\mathcal{L}_{AE}=\mathcal{L}_{voxel}+\mathcal{L}_{particle}+\mathcal{L}_{render}+\mathcal{L}_{cons}.
$$

Multi-resolution occupancy BCE shapes the coarse structure. Local bidirectional Chamfer distance, computed within voxel neighborhoods at both refinement stages, shapes the particles. RGB-D rendering loss uses $\ell_1$, SSIM, and LPIPS on color and $\ell_1$ on valid depth. The consistency term deserves attention because it serves the dynamics stage: it encodes two independent subsamples of the same observation and penalizes latent disagreement at occupied cells, with a coefficient of 100. Without it, sampling noise in the point cloud would look like scene motion to the dynamics model. KL regularization is disabled; the training recipe trains the voxel autoencoder for 10 epochs, freezes it for 10 epochs while particle and render heads train, and then optimizes jointly.

## 3D latent dynamics

With the autoencoder frozen and latents precomputed, the dynamics model learns

$$
\hat z_{t+1}=F_\phi(z_{t-H:t},a_t).
$$

It is a 3D U-Net using five history frames. A shared 3D convolutional encoder downsamples each frame twice, and four pairs of spatial and causal temporal attention blocks run at the coarsest level, $8\times4\times8$ for ALOHA. Spatial attention sees 256 tokens per frame, far below the 16,384 cells of the latent grid. Skip connections take features from the latest available history frame, which during rollout may itself be a prediction. Actions, relative time, and history-noise level are embedded by an MLP, and optional spatial action channels add gripper-position and opening heatmaps to the grid.

Long-horizon stability comes from three training choices. The model rolls out $K$ steps autoregressively under a discounted loss, with $\gamma=0.95$ and a curriculum that gradually raises $K$:

$$
\mathcal{L}_{dyn}=\frac{1}{K}\sum_{k=1}^{K}\gamma^{k-1}\lVert \hat z_{t+k}-z_{t+k}\rVert_2^2.
$$

It also adds Gaussian noise to each history latent, with level sampled up to 0.4 and supplied as conditioning. This exposes the model to imperfect inputs, similar to what it sees when feeding on its own predictions. Finally, it uses direct next-latent prediction with one network evaluation per step, with no diffusion or flow matching. That choice helps explain the 50 Hz speed. The autoencoder and dynamics model each take about 16 hours to train on an RTX 5090.

At inference, the model encodes the initial latent and rolls forward in open loop. Wrist-camera rendering relies on a fine-tuned decoder prediction head.

## Composition assumes a bounded workspace

The learned model covers only a manually set workspace. Anything outside is assumed static or predictable analytically: a Gaussian Splat of a scanned room supplies the background, and a Gaussian robot model driven by kinematics supplies the arms. Fine-tuning can add labels that separate robot, object, and table, which then allows other backgrounds and robot models, including unseen arms such as the SO-101 shown on the project page.

This is a useful hybrid: learned dynamics where contact is hard, assets and kinematics where the world is predictable. It also defines the boundary of the current system, since large-scale or mobile scenes remain future work in the paper.

## Prediction results

ALOHA evaluation covers Part Assembly, Cloth Folding, T Pushing, Box Packing, Rope Threading, and Marker Insertion, with about 200 episodes and 2 hours of data per task. Observations come from three static and two wrist cameras, using FoundationStereo for depth. Table 1 averages over all six tasks and a 200-step open-loop horizon:

| Metric | Best baseline | 3D World Simulator |
|---|---|---|
| PSNR (higher is better) | 20.59 (Robot4DGen) | **23.24** |
| LPIPS | 0.340 (Robot4DGen) | **0.240** |
| Depth Abs Rel | 0.147 (Cosmos) | **0.097** |
| Depth $\delta<1.25$ (higher is better) | 0.833 (Cosmos) | **0.913** |
| Scene Chamfer distance | 10.43 (Robot4DGen) | **7.72** |
| Object Chamfer distance | 15.97 (Robot4DGen) | **11.52** |
| Tactile L1 | 0.128 (Robot4DGen) | **0.081** |

The comparison is favorable and clear in direction, with some context. The video baselines needed adaptation for this multi-view RGB-D setting: Cosmos received four views and depth tiled into one image, and IWS received added depth and per-view latents, so IWS's 12.59 PSNR describes this adapted use. Particle baselines were trained on CoTracker tracks, which is the exact supervision the authors argue is fragile. The paper reports task averages without per-task values or spreads in Table 1, and Table 1 does not label Chamfer units.

Deform360 is the scaling test: 198 objects, 1,980 sequences, more than 215 hours, 41 cameras. The model trains on object particles only, because depth is object-centric, and Table 3 lists tactile supervision as disabled in this configuration. Results below are for 150-step rollouts.

| Method | Train PSNR | Train LPIPS | Train CD (mm) | Held-out PSNR | Held-out LPIPS | Held-out CD (mm) |
|---|---|---|---|---|---|---|
| PGND | 14.9 | 0.41 | 18.6 | 12.3 | 0.50 | 25.2 |
| PointWorld | 16.8 | 0.34 | 12.4 | 15.0 | 0.58 | 14.5 |
| ParticleFormer | 18.0 | 0.30 | 10.5 | 15.6 | 0.31 | 13.4 |
| Ours | **18.6** | **0.26** | **9.6** | 14.8 | 0.43 | **12.1** |

On held-out objects, geometry remains best, while ParticleFormer leads on both image metrics. The authors point to a real asymmetry: particle baselines move Gaussian Splats already fitted to the object, whereas this model generates appearance from scratch. Appearance generalization therefore remains the weak side of the scaled model.

## Policy training, evaluation, and planning

For policy training, the authors collect 100 demonstrations per task on the real robot and inside the simulator, at 10 Hz, holding out 10. They train ACT, Diffusion Policy, $\pi_{0.5}$, and Cosmos Policy, and report mean real-world success across architectures. Each task isolates one capability. The values below are my approximate readings from Figure 6.

| Task and capability | Trained on real data | Trained on simulator data |
|---|---|---|
| Part Assembly, wrist camera + touch | about 0.80 | about 0.68 |
| Part Assembly, no touch | about 0.17 | about 0.18 |
| Cloth Folding, front + wrist cameras | about 0.95 | about 1.00 |
| T Pushing, novel viewpoint | about 0.83 | about 0.68 |

Assembly gives the strongest evidence for generated touch: removing tactile input collapses performance in both columns, and simulated visuo-tactile data recovers most of the real-data result. "Comparable" is still generous for T Pushing and Assembly, where simulator data appears to lose over ten points. Appendix D attributes T Pushing's lower performance mainly to the difficulty of the novel view. Since the real-data bar uses a novel view as well, the gap between the two bars likely has another source, such as generated data quality.

For evaluation, policy checkpoints from different training steps run 20 times each in the simulator and on the robot. Correlations are strong: $r=0.958$ for Part Assembly, $0.965$ for Cloth Folding, and $0.859$ for T Pushing. The checkpoints span nearly the whole success range, which supports using the simulator to tell weak policies from strong ones and inflates $r$ relative to a test among similarly performing policies. With 20 trials per point, intervals are wide, so finer ranking remains unproven.

For planning, the Deform360 model is paired with off-the-shelf MPPI from PGND on a single-arm ALOHA and four unseen objects: cloth, rope, foam, and a sloth toy. Figure 8 reports final CD values from 0.024 to 0.047, with unlabeled units. Its action descriptor uses gripper pose, opening, and presence, which I read as a likely reason it can move to a new arm: the object model sees the end effector and leaves the rest of the kinematic chain out. The evidence here is four shown examples, with no baseline or repeated-trial statistics.

## Strengths and limits

The main strength is a single predicted state serving rendering, geometry, touch, and composition. That makes new cameras, wrist views, and tactile channels part of the same model and reduces the need for separate prediction streams per modality. Dropping point-track supervision also matters for the deformable and in-hand tasks it targets.

The limits follow from the same design. The model is deterministic in its next-latent prediction, trained on an L2 latent loss, and the paper does not evaluate multi-modal futures. Inputs depend on calibrated multi-camera stereo and a fixed workspace box. The per-task ALOHA models also come from around 2 hours of data, and the scaled model drops the robot, the surrounding scene, and touch. A single model covering all of those at once is still open.

## What I take away

The practical lesson is a clean separation of duties: an ordered representation for prediction, an unordered one for detail, and a common coordinate frame connecting them to rendering and touch. The direct regressor also makes interactive speed look achievable once the latent is well-conditioned. Compared with [DexTouch-WM](/posts/2026/09/dextouch-wm-paper-notes/), which jointly generates video and tactile changes from shared sensor layouts, this work places touch in 3D. The next test I would watch is whether synthetic data keeps its value when policies face objects and scenes far from the training workspace.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## 核心概括

**3D World Simulator** 在 3D voxel latent 空间中运行动力学，并把每个预测状态解码为 3D Gaussian 粒子和触觉粒子。因此，同一次预测可以从任意相机渲染，可以作为几何结构检查，也可以读取与接触表面对齐的触觉。作者报告的交互式 rollout 速度为 **50 Hz**。

核心设计在于让每种表示各司其职：voxel 为动力学模型提供固定、可预测的目标；粒子为解码器提供自由空间中的细节和可渲染的载体。这样训练时无需 point track 或针对特定物体的状态表示。在 6 个 ALOHA 任务、200 步开环 rollout 中，它在所有报告指标上都优于视频和粒子基线。泛化方面的证据则有好有坏：在 Deform360 的 held-out 物体上，几何指标仍然最好，渲染指标却落后了。

## 论文与阅读版本

**Hybrid Particle-Voxel Dynamics for Multimodal 3D World Simulation**，作者为 Jimmy Wang、Yifan Chou、Kaifeng Zhang、Yixuan Wang、Binghao Huang、Tao Yu、Saleh Nabi 和 Yunzhu Li，来自 Columbia University、UC Berkeley、University of Michigan、NVIDIA 和 Analog Devices。本文依据 25 页的 [arXiv:2611.04492v1](https://arxiv.org/abs/2611.04492v1)，版本日期为 2026 年 11 月 3 日，查阅于 2026 年 11 月 5 日。[PDF](https://arxiv.org/pdf/2611.04492v1) · [项目页与交互演示](https://jwang771.github.io/3dworldsimulator/) · [代码](https://github.com/jwang771/3d-world-simulator)

## 为什么把状态放在 voxel 网格上

时刻 $t$ 的输入是点云 $P_t \in \mathbb{R}^{7\times n}$，包含 3D 位置、RGB 和一个触觉通道。直接预测这个点云并不顺手：点云无序，点数每帧都在变，除非维护点的身份，否则帧与帧之间没有稳定目标。此前的粒子模型通常靠跟踪来维护身份。作者避开了这条路，因为在严重遮挡下，可变形物体和手内操作的对应关系并不可靠。

Voxel latent 提供固定的空间位置，给动力学模型一个一致的回归目标。单靠 voxel 又太粗，提高分辨率代价也大，所以解码器在其上再生成粒子。在 ALOHA 配置中，8 通道的 $32\times16\times32$ latent 网格覆盖 $0.52\times0.32\times0.28$ m 的工作空间。按我的换算，每个 latent 单元约为 $16\times20\times9$ mm，因此精细几何要靠解码器的上采样和粒子偏移来恢复。

## 粒子-体素混合自编码器

编码器先把点云体素化，在被占据的单元内平均点特征，再通过带步长的稀疏 3D 卷积得到 latent $z_t$，并在通道维度上对每个 voxel 做单位归一化。解码器分两个阶段。转置 3D 卷积上采样 latent，并在三个分辨率上预测占据。随后，被占据的 voxel 作为种子进入两级粒子细化，由轻量 MLP 预测连续位置和 Gaussian 属性：一阶球谐表示的颜色、各向异性尺度、旋转和不透明度。

触觉读数使用同一个输出空间。正运动学把 FlexiTac 触觉垫定位到世界坐标系，触觉便以额外粒子的形式进入模型，并有自己的占据和信号监督。这就是“空间对齐”触觉预测的机制：触觉与其接触的几何共用坐标，不需要单独的触觉图像流。

训练包含四项：

$$
\mathcal{L}_{AE}=\mathcal{L}_{voxel}+\mathcal{L}_{particle}+\mathcal{L}_{render}+\mathcal{L}_{cons}.
$$

多分辨率占据 BCE 负责粗结构。在两级细化上、按 voxel 邻域计算的局部双向 Chamfer 距离负责粒子。RGB-D 渲染损失在颜色上使用 $\ell_1$、SSIM 和 LPIPS，在有效深度上使用 $\ell_1$。一致性项值得留意，因为它服务于后面的动力学阶段：对同一观测做两次独立下采样并编码，惩罚被占据单元上的 latent 差异，系数为 100。缺少这一项时，点云采样噪声在动力学模型看来就像场景运动。KL 正则被关闭；训练流程先训练 voxel 自编码器 10 个 epoch，再冻结它 10 个 epoch 以训练粒子头和渲染头，之后联合优化。

## 3D latent 动力学

自编码器冻结、latent 预先计算好之后，动力学模型学习：

$$
\hat z_{t+1}=F_\phi(z_{t-H:t},a_t).
$$

它是一个使用 5 帧历史的 3D U-Net。共享的 3D 卷积编码器对每帧下采样两次，然后在最粗层运行 4 对空间注意力和因果时间注意力，ALOHA 上这一层为 $8\times4\times8$。空间注意力每帧只看 256 个 token，远少于 latent 网格的 16,384 个单元。跳跃连接取最近一帧历史的特征，rollout 时这一帧可能本身就是预测结果。动作、相对时间和历史噪声水平由 MLP 嵌入，可选的空间动作通道还会把夹爪位置和开合热图加到网格上。

长时域稳定性来自三个训练选择。第一，模型自回归展开 $K$ 步并使用折扣损失，$\gamma=0.95$，并通过 curriculum 逐步增大 $K$：

$$
\mathcal{L}_{dyn}=\frac{1}{K}\sum_{k=1}^{K}\gamma^{k-1}\lVert \hat z_{t+k}-z_{t+k}\rVert_2^2.
$$

第二，给每帧历史 latent 加 Gaussian 噪声，噪声水平最高采样到 0.4，并作为条件输入。这让模型接触到不完美的输入，与它依赖自身预测时遇到的情况相似。第三，直接预测下一个 latent，每步只做一次网络前向，不使用 diffusion 或 flow matching。这一选择有助于解释 50 Hz 的速度。自编码器和动力学模型在 RTX 5090 上各需约 16 小时训练。

推理时，模型编码初始 latent，然后开环向前展开。腕部相机渲染依赖微调过的解码器预测头。

## 组合能力以有界工作空间为前提

学习到的模型只覆盖手动设定的工作空间，其外部被假设为静态或可解析预测：扫描房间得到的 Gaussian Splat 提供背景，由运动学驱动的 Gaussian 机器人模型提供手臂。微调后还可以输出区分机器人、物体和桌面的标签，从而替换背景和机器人模型，包括项目页展示的 SO-101 等未见过的手臂。

这是一种实用的混合方式：接触困难的地方用学习到的动力学，世界可预测的地方用资产和运动学。它同时划定了当前系统的边界，大尺度或移动场景在论文中仍属未来工作。

## 预测结果

ALOHA 评测覆盖 Part Assembly、Cloth Folding、T Pushing、Box Packing、Rope Threading 和 Marker Insertion，每个任务约 200 条 episode、2 小时数据。观测来自 3 个固定相机和 2 个腕部相机，深度由 FoundationStereo 得到。表 1 对 6 个任务和 200 步开环时域取平均：

| 指标 | 最佳基线 | 3D World Simulator |
|---|---|---|
| PSNR（越高越好） | 20.59（Robot4DGen） | **23.24** |
| LPIPS | 0.340（Robot4DGen） | **0.240** |
| 深度 Abs Rel | 0.147（Cosmos） | **0.097** |
| 深度 $\delta<1.25$（越高越好） | 0.833（Cosmos） | **0.913** |
| 场景 Chamfer 距离 | 10.43（Robot4DGen） | **7.72** |
| 物体 Chamfer 距离 | 15.97（Robot4DGen） | **11.52** |
| 触觉 L1 | 0.128（Robot4DGen） | **0.081** |

对比方向明确且有利，但需要结合背景来看。视频基线要针对这个多视角 RGB-D 场景做适配：Cosmos 把四个视角和深度拼进一张图，IWS 增加了深度和逐视角 latent，所以 IWS 的 12.59 PSNR 描述的是这种适配后的用法。粒子基线使用 CoTracker 轨迹训练，而这正是作者认为脆弱的监督来源。表 1 只给出任务平均值，没有逐任务数值或离散度，也没有标注 Chamfer 距离的单位。

Deform360 是规模化测试：198 个物体、1,980 条序列、超过 215 小时、41 个相机。由于深度只覆盖物体，模型只在物体粒子上训练，表 3 也显示该配置关闭了触觉监督。以下结果来自 150 步 rollout。

| 方法 | 训练 PSNR | 训练 LPIPS | 训练 CD (mm) | Held-out PSNR | Held-out LPIPS | Held-out CD (mm) |
|---|---|---|---|---|---|---|
| PGND | 14.9 | 0.41 | 18.6 | 12.3 | 0.50 | 25.2 |
| PointWorld | 16.8 | 0.34 | 12.4 | 15.0 | 0.58 | 14.5 |
| ParticleFormer | 18.0 | 0.30 | 10.5 | 15.6 | 0.31 | 13.4 |
| 本文方法 | **18.6** | **0.26** | **9.6** | 14.8 | 0.43 | **12.1** |

在 held-out 物体上，几何仍然最好，而 ParticleFormer 在两项图像指标上领先。作者指出了一个确实存在的不对称：粒子基线移动的是已拟合到物体上的 Gaussian Splat，这个模型则要从零生成外观。外观泛化因此仍是规模化模型的弱项。

## 策略训练、评估与规划

策略训练方面，作者在真实机器人和模拟器中为每个任务各收集 100 条 10 Hz 示范，留出 10 条。他们训练 ACT、Diffusion Policy、$\pi_{0.5}$ 和 Cosmos Policy，并报告各架构在真实世界中的平均成功率。每个任务隔离一种能力。下表数值是我从图 6 读出的近似值。

| 任务与能力 | 真实数据训练 | 模拟器数据训练 |
|---|---|---|
| Part Assembly，腕部相机 + 触觉 | 约 0.80 | 约 0.68 |
| Part Assembly，无触觉 | 约 0.17 | 约 0.18 |
| Cloth Folding，前视 + 腕部相机 | 约 0.95 | 约 1.00 |
| T Pushing，新视角 | 约 0.83 | 约 0.68 |

Assembly 为生成触觉提供了最有力的证据：去掉触觉后两列表现都大幅下滑，而模拟视触数据恢复了真实数据结果的大部分。不过，对 T Pushing 和 Assembly 来说，“comparable”这个说法偏宽松，模拟器数据看起来损失了十多个百分点。附录 D 把 T Pushing 的较低表现主要归因于新视角本身更难。由于真实数据那一栏同样使用新视角，两栏之间的差距很可能另有来源，例如生成数据的质量。

策略评估方面，不同训练步数的策略 checkpoint 在模拟器和真实机器人上各运行 20 次。相关性很强：Part Assembly 为 $r=0.958$，Cloth Folding 为 $0.965$，T Pushing 为 $0.859$。这些 checkpoint 几乎覆盖整个成功率区间，这支持用模拟器区分强弱策略，同时也会让 $r$ 高于在表现相近的策略之间测试时的数值。每个点只有 20 次试验，置信区间较宽，更精细的排序尚未得到证明。

规划方面，Deform360 模型搭配 PGND 中现成的 MPPI，用在单臂 ALOHA 和 4 个未见物体上：布、绳、泡沫和树懒玩偶。图 8 给出的最终 CD 为 0.024 到 0.047，未标注单位。它的动作描述使用夹爪位姿、开合和存在标记，我认为这可能是它能迁移到新手臂的原因：物体模型只看末端执行器，运动链的其余部分不进入模型。这里的证据是展示出的 4 个例子，没有基线或多次重复试验的统计。

## 优势与局限

主要优势是同一个预测状态可以服务渲染、几何、触觉和组合。新相机、腕部视角和触觉通道都属于同一个模型，减少了为每种模态单独建预测流的需要。去掉 point track 监督，对它所针对的可变形和手内任务也很重要。

局限来自同样的设计。模型对下一个 latent 的预测是确定性的，训练用的是 L2 latent 损失，论文也没有评估多模态未来。输入依赖标定好的多相机立体视觉和固定的工作空间范围。每个 ALOHA 任务的模型只来自约 2 小时数据，规模化模型则去掉了机器人、周围场景和触觉。用一个模型同时覆盖这些内容，仍是开放问题。

## 我的收获

最实用的一点是清晰的职责划分：有序表示用于预测，无序表示用于细节，共同的坐标系把它们与渲染和触觉连接起来。直接回归也让人看到，只要 latent 条件足够好，交互速度是可以达到的。与从共享传感器布局出发、联合生成视频和触觉变化的 [DexTouch-WM](/posts/2026/09/dextouch-wm-paper-notes/) 相比，这项工作把触觉放进了 3D。我接下来会关注的问题是：当策略面对与训练工作空间相去甚远的物体和场景时，合成数据还能保留多少价值。

</div>
