---
title: "[Paper Notes] ViserDex: Visual Sim-to-Real for Robust Dexterous In-hand Reorientation"
date: 2026-06-24
permalink: /posts/2026/06/viserdex-paper-notes/
tags:
  - Dexterous Manipulation
  - Sim-to-Real
  - 3D Gaussian Splatting
  - Reinforcement Learning
  - RGB Perception
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**ViserDex** builds an RGB-only sim-to-real pipeline for goal-conditioned dexterous in-hand reorientation. The system uses a monocular wrist camera to estimate object pose, feeds that pose into a recurrent student policy, and deploys the policy on a 16-DoF Allegro Hand. Its main technical move is to use **3D Gaussian Splatting (3DGS)** as the visual simulator and perform domain randomization before rasterization, directly on Gaussian attributes. This gives photorealistic but diverse pose-estimation training data without the cost of full ray-traced scene randomization.

My read: the paper is less about inventing a new hand policy and more about making **visual state estimation usable enough for dexterous control**. The RL policy still learns from privileged simulation, but real-world deployment depends on a monocular RGB pose estimator that survives occlusion, motion, texture variation, and adversarial lighting. The useful lesson is that perception fidelity and perception diversity have to be engineered together; a prettier renderer alone does not close the visual sim-to-real gap.

## Paper and Resources

The paper is **"ViserDex: Visual Sim-to-Real for Robust Dexterous In-hand Reorientation"** by **Arjun Bhardwaj, Maximum Wilder-Smith, Mayank Mittal, Vaishakh Patil, and Marco Hutter** from **ETH Zurich** and **NVIDIA**. It is available as [arXiv:2604.11138](https://arxiv.org/abs/2604.11138), and the project page is [rffr.leggedrobotics.com/works/viserdex](https://rffr.leggedrobotics.com/works/viserdex/). The project page lists the work as accepted to **RSS 2026** and includes videos, visual comparisons, and the BibTeX entry.

The task is continuous goal-conditioned in-hand object reorientation: given a target orientation, the hand must repeatedly rotate an object until the target is reached, then move to the next target. The deployed system uses an Allegro Hand, an Intel RealSense D435i wrist camera, a per-object segmentation module, a keypoint-based pose estimator, and a recurrent control policy running at 30 Hz.

## Why This Problem Is Hard

Dexterous in-hand reorientation is a cruel perception problem. The hand itself occludes the object, the object moves quickly, contact changes are discontinuous, and small pose errors can accumulate into control failures. Prior RGB-based demonstrations often relied on simple objects, multiple cameras, or expensive automatic domain randomization. Tactile and depth sensing help in different ways, but each adds its own hardware and modeling assumptions.

ViserDex chooses a modular decomposition:

- A privileged **teacher policy** learns contact-rich reorientation in simulation.
- A recurrent **student policy** learns to act from noisy proprioceptive and exteroceptive observations.
- A monocular **RGB pose estimator** predicts 2.5D object keypoints from segmented RGB crops.
- A 3DGS rendering pipeline generates the pose-estimator training data with structured appearance randomization.

This division is important. End-to-end RL from pixels would need to learn manipulation, hidden-state inference, and visual sim-to-real transfer at the same time. ViserDex separates the load: RL solves control under state-like observations, while 3DGS-based data generation solves the hard visual transfer problem for object pose estimation.

## Control Pipeline

The teacher policy is trained with PPO in simulation and has access to privileged observations. Its action is a 16-dimensional target joint-position command for the Allegro Hand. The reward combines an orientation-tracking term, a sparse success bonus, and regularization penalties for smoother, lower-energy actions. A success is counted when the orientation error is within a threshold; episodes end if the object is dropped, if the policy goes too long without success, or after a long successful sequence.

The student policy removes privileged access. It receives noisy proprioception, noisy object pose, the goal, action history, and timing information. To handle partial observability, the student uses a recurrent belief encoder. The training objective combines behavior cloning from the teacher and a reconstruction loss:

\\[
L = L_{\mathrm{BC}} + \lambda L_{\mathrm{recon}}.
\\]

The reconstruction target includes exteroceptive and privileged information. In effect, the recurrent state learns to smooth and infer latent physical context from imperfect observations. The paper's appendix shows why this matters: during injected pose-estimation failures, the belief decoder can reject high-amplitude outliers such as a 180-degree flip and keep the controller stable for several timesteps.

The teacher training also uses a performance-based curriculum instead of heavy ADR over many parameters. As the moving average of consecutive successes improves, the curriculum increases regularization penalties, action-latency randomization, and the pressure to complete goals faster. The ablation is sharp: removing the regularization-penalty curriculum or using no curriculum causes near-zero learning progress in the reported curves.

## 3DGS as the Visual Simulator

The perception module needs object pose from RGB. ViserDex trains a ResNet-34 pose estimator that predicts nine normalized 2.5D keypoints: eight object-specific keypoints plus the centroid. The 2.5D keypoints are converted to a 6D pose through rigid Procrustes alignment.

The training data is generated in simulation, but the renderer is unusual. Each object is represented as a 3D Gaussian scene, where each Gaussian has position, covariance, opacity, and spherical harmonic color coefficients. For a viewing direction \\(d\\), color is computed from spherical harmonics:

\\[
c(d) =
\mathrm{Sigmoid}
\left(
\sum_{\ell=0}^{L}\sum_{m=-\ell}^{\ell}
k_{\ell}^{m}Y_{\ell}^{m}(d)
\right).
\\]

During manipulation, the object moves while the camera remains fixed. ViserDex keeps the Gaussian scene static by applying the inverse object transform to the camera before rendering. This preserves vanilla 3DGS assumptions while producing images from the correct object pose. Since object-only 3DGS would ignore finger occlusions, the system also renders a low-fidelity hand depth map from the physics simulator and masks out Gaussian pixels hidden behind the hand.

The result is a pragmatic hybrid: the object appearance is photorealistic, the hand occlusion is physically aligned, and the rendering cost remains compatible with high-throughput simulation.

## Pre-Rasterization Gaussian Augmentations

The core perception idea is to randomize the **Gaussian representation** before rasterization. Standard image augmentation is cheap but operates in 2D and often ignores geometry. Full scene randomization through ray tracing is physically grounded but expensive. ViserDex works between these extremes by perturbing Gaussian attributes, especially spherical harmonic coefficients, before rendering.

The key is structured perturbation. Randomizing each Gaussian independently creates noisy artifacts. Real lighting, material, exposure, and wear usually affect coherent spatial regions or material-like groups. ViserDex therefore clusters Gaussians and perturbs clusters:

| Augmentation group | What it changes | Intuition |
|---|---|---|
| Random noise | Individual Gaussian attributes | Sensor artifacts, tiny appearance errors |
| Spatial clusters | Position-correlated Gaussian groups | Local shadows, marks, damage, patch effects |
| Color clusters | SH0 color-correlated groups | Material-specific albedo and reflectance shifts |
| Global shift | Whole Gaussian scene | Exposure, color temperature, saturation, ambient light |

This is the part I would keep from the paper. The authors do not simply say "use 3DGS because it looks real." They show that realism without diversity can transfer poorly. In Table II, the naive Gaussian Splatting baseline under adversarial lighting reaches only **36.5%** mean strict pose accuracy, below randomized tiled rendering at **47.2%**. The full ViserDex augmentation pipeline reaches **56.3%**. The visual simulator helps because it is both high-fidelity and controllably randomized.

The ablation makes the mechanism clearer. Under adversarial lighting, removing global shift collapses mean pose accuracy to **23.6%**, and the adversarial mean rotation error rises to **38.9 degrees**. Spatial and color cluster removals also hurt substantially. Global appearance shifts are the most important for lighting robustness, while structured cluster perturbations help local and material-level generalization.

## Results

For pose estimation, ViserDex reports strict accuracy using an ADD-style threshold: prediction error below 10 mm and 10 degrees. Across five objects, the full method reaches **65.4%** mean accuracy under nominal lighting and **56.3%** under adversarial lighting. It also improves adversarial rotation error to **14.6 degrees**, compared with **17.7 degrees** for domain-randomized tiled rendering and **32.2 degrees** for naive Gaussian Splatting.

The computational story is also practical. The integrated 3DGS renderer is reported as **1.6x faster** than Isaac Lab's tiled renderer on an RTX 6000 Ada and uses **12 GB** VRAM for a batch of 1,024 environments, compared with **34 GB** for tiled rendering. The proposed pre-rasterization augmentations add less than 2 ms per batch, about 4% of frame rendering time.

For real-world deployment, the system is tested on five objects: Cube, 3D Printed Toy, Rubber Duck, Tablet Bottle, and Globe. Under nominal lighting, the mean number of consecutive successful reorientations is **37.6**. Under adversarial lighting, it remains **25.4**. On the shared Cube object, ViserDex reports **35.4** consecutive successes under nominal lighting, compared with **27.8** for DeXtreme. The Globe is especially strong, while the Tablet Bottle exposes a real limitation: low unmodeled surface friction causes a larger sim-to-real gap despite good visual performance.

One deployment comparison is particularly useful. Replacing the tailored pose estimator with FoundationPose leads to near-total failure at **0.4** consecutive successes on average. The paper attributes this to slower inference, around 4 Hz versus about 18 Hz for their estimator, and to tracking loss under rapid motion and severe finger occlusion. For dexterous control, a general pose estimator can be accurate on static frames and still be the wrong tool inside a fast feedback loop.

## What I Like

The paper's strongest contribution is the way it makes visual sim-to-real concrete. It identifies the bottleneck as pose-estimation data generation, then modifies the scene representation at the level where structured visual variability is cheap. That is a nice engineering point: once objects are stored as Gaussians with SH coefficients, domain randomization becomes a lightweight operation on the representation, not a full physics-and-rendering burden.

The modular training design is also sensible. Teacher-student distillation keeps contact-rich RL from being blocked by image learning. The recurrent student acknowledges that pose estimates will be delayed, noisy, biased, and occasionally wrong. The deployment stack still needs segmentation and per-object pose-estimator training, but within that assumption the pieces are well matched.

## Limitations and Open Questions

ViserDex is instance-specific. Each object has a reconstructed Gaussian scene, a high-fidelity mesh, a pose-estimator training setup, and a fine-tuned segmentation component. That is acceptable for controlled deployments, but it does not yet give category-level or open-set dexterity.

The system also remains visually constrained. Finger occlusions are handled better than in many RGB pipelines, but RGB cannot directly sense contact forces or friction. The Tablet Bottle result shows this clearly: low label friction hurts manipulation even when the pose-estimation pipeline is strong. The authors point to dense visual feedback plus high-frequency tactile sensing as a promising direction.

Finally, the method depends on accurate object assets and simulation integration. It is compute-efficient relative to ray-traced ADR, but it is not asset-free. The practical recipe is closer to "build a good object-specific visual simulator cheaply" than to "train once and generalize to arbitrary household objects."

## Takeaways

For robotic manipulation, ViserDex is a reminder that visual sim-to-real is not just about rendering quality. The target is a perception model whose errors are shaped for control: fast enough, stable under occlusion, robust to lighting, and compatible with a recurrent policy that can smooth occasional failures.

For people building sim-to-real pipelines, the most transferable idea is **representation-space randomization**. If the scene representation exposes geometry, material-like color groups, view-dependent components, and global appearance controls, randomization can be structured before pixels exist. That gives a useful middle ground between weak 2D augmentations and expensive full-scene photorealistic domain randomization.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇文章支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**ViserDex** 做的是一个 RGB-only 的灵巧手 sim-to-real 系统，用单目腕部相机估计物体位姿，再把位姿输入到 recurrent student policy，在 16 自由度 Allegro Hand 上完成目标条件的 in-hand reorientation。它最核心的技术点是把 **3D Gaussian Splatting (3DGS)** 当作视觉仿真器，并且在 rasterization 之前直接对 Gaussian 属性做 domain randomization。这样可以生成既逼真又多样的位姿估计训练数据，同时避免完整 ray tracing 场景随机化的高计算成本。

我的理解是：这篇文章的重点不在于重新发明一个手部控制 policy，而在于让 **视觉状态估计足够可靠，可以支撑灵巧操作闭环**。RL policy 仍然在 privileged simulation 中学习，但真实部署成败很大程度取决于单目 RGB pose estimator 能否承受遮挡、快速运动、纹理变化和恶劣光照。它给人的启发是：perception fidelity 和 perception diversity 必须一起设计；单纯让渲染更漂亮，并不能自动弥合视觉 sim-to-real gap。

## 论文与资源

论文是 **"ViserDex: Visual Sim-to-Real for Robust Dexterous In-hand Reorientation"**，作者包括 **Arjun Bhardwaj, Maximum Wilder-Smith, Mayank Mittal, Vaishakh Patil, Marco Hutter**，来自 **ETH Zurich** 和 **NVIDIA**。论文链接是 [arXiv:2604.11138](https://arxiv.org/abs/2604.11138)，项目页是 [rffr.leggedrobotics.com/works/viserdex](https://rffr.leggedrobotics.com/works/viserdex/)。项目页标注该工作被 **RSS 2026** 接收，并提供了视频、可视化对比和 BibTeX。

任务是连续的 goal-conditioned in-hand object reorientation：给定一个目标姿态，灵巧手要反复把手中的物体转到目标方向，到达后再切换下一个目标。真实系统使用 Allegro Hand、Intel RealSense D435i 腕部相机、逐物体的 segmentation 模块、keypoint-based pose estimator，以及 30 Hz 运行的 recurrent control policy。

## 难点在哪里

灵巧手的 in-hand reorientation 对视觉感知很不友好。手指会频繁遮挡物体，物体运动很快，接触状态离散变化，小的 pose error 会在控制闭环里放大成失败。以往一些 RGB-based 演示通常依赖简单物体、多相机系统，或者昂贵的 automatic domain randomization。触觉和深度传感能解决部分问题，但会带来额外硬件和建模假设。

ViserDex 采用模块化拆解：

- privileged **teacher policy** 在仿真中学习 contact-rich reorientation；
- recurrent **student policy** 学习从带噪 proprioceptive 和 exteroceptive observations 中动作；
- monocular **RGB pose estimator** 从分割后的 RGB crop 中预测 2.5D object keypoints；
- 3DGS 渲染管线通过结构化 appearance randomization 生成 pose estimator 训练数据。

这个拆解很关键。端到端从像素做 RL，需要同时学习操作技能、隐状态推理和视觉 sim-to-real transfer。ViserDex 把负担拆开：RL 在类似状态量的输入上解决控制，3DGS-based data generation 专门解决物体位姿估计的视觉迁移问题。

## 控制管线

Teacher policy 用 PPO 在仿真中训练，并且可以访问 privileged observations。它的 action 是 Allegro Hand 的 16 维目标关节位置。Reward 包括姿态跟踪项、稀疏 success bonus，以及让动作更平滑、更低能耗的 regularization penalties。当 orientation error 小于阈值时计为成功；物体掉落、长时间没有成功，或者完成很长成功序列时 episode 终止。

Student policy 去掉 privileged access。它输入带噪 proprioception、带噪 object pose、目标、action history 和时间信息。为了处理 partial observability，student 使用 recurrent belief encoder。训练目标结合 teacher action 的 behavior cloning 和 reconstruction loss：

\\[
L = L_{\mathrm{BC}} + \lambda L_{\mathrm{recon}}.
\\]

Reconstruction target 包含 exteroceptive 和 privileged information。换句话说，recurrent state 学到的是如何从不完美观测中平滑并推断潜在物理上下文。附录里的分析说明了这点的重要性：当人为注入 pose-estimation failure 时，例如突然出现 180 度翻转，belief decoder 可以过滤高幅值 outlier，让 controller 在若干 timestep 内保持稳定。

Teacher training 还使用 performance-based curriculum，避免在大量参数上做重型 ADR。随着 consecutive successes 的 moving average 提升，curriculum 会增加 regularization penalties、action-latency randomization，并缩短完成目标的时间窗口。消融结果很直接：去掉 regularization-penalty curriculum，或者完全不用 curriculum，曲线几乎学不起来。

## 作为视觉仿真器的 3DGS

感知模块需要从 RGB 中恢复物体位姿。ViserDex 训练了一个 ResNet-34 pose estimator，预测九个 normalized 2.5D keypoints：八个 object-specific keypoints 加上几何中心。随后通过 rigid Procrustes alignment 把 2.5D keypoints 转成 6D pose。

训练数据来自仿真，但渲染器很特别。每个物体用一个 3D Gaussian scene 表示，每个 Gaussian 包含位置、协方差、不透明度和 spherical harmonic color coefficients。对于 viewing direction \\(d\\)，颜色由 spherical harmonics 计算：

\\[
c(d) =
\mathrm{Sigmoid}
\left(
\sum_{\ell=0}^{L}\sum_{m=-\ell}^{\ell}
k_{\ell}^{m}Y_{\ell}^{m}(d)
\right).
\\]

操作过程中，物体在动，相机固定。ViserDex 通过把 object transform 的逆作用到 camera 上，让 Gaussian scene 仍然保持 static，从而满足 vanilla 3DGS 的假设，同时渲染出正确物体姿态下的图像。由于只渲染物体会忽略手指遮挡，系统还从 physics simulator 中渲染低保真 hand depth map，并把被手挡住的 Gaussian pixels mask 掉。

这个组合很实用：物体外观来自 photorealistic 3DGS，手部遮挡和物理状态对齐，渲染成本又能兼容高吞吐仿真。

## Pre-Rasterization Gaussian Augmentations

感知部分的核心思想是在 rasterization 之前随机化 **Gaussian representation**。常规 image augmentation 便宜，但发生在 2D 图像上，通常不理解几何。完整 scene randomization 更物理，但 ray tracing 成本很高。ViserDex 处在两者之间：直接扰动 Gaussian 属性，尤其是 spherical harmonic coefficients，然后再渲染。

关键在于结构化扰动。独立随机化每个 Gaussian 会产生噪声状伪影。真实光照、材质、曝光和磨损通常影响连续空间区域或类似材质的区域。ViserDex 因此先聚类 Gaussians，再按 cluster 扰动：

| Augmentation group | 改变什么 | 直觉 |
|---|---|---|
| Random noise | 单个 Gaussian 属性 | 传感器噪声、微小外观误差 |
| Spatial clusters | 空间相关的 Gaussian groups | 局部阴影、痕迹、损伤、patch effect |
| Color clusters | SH0 颜色相关 groups | 材质级 albedo 和 reflectance shift |
| Global shift | 整个 Gaussian scene | 曝光、色温、饱和度、环境光 |

这是我觉得最值得保留的部分。作者没有只说“3DGS 更真实，所以有用”。他们证明了只有 realism、没有 diversity，迁移可能很差。Table II 中，adversarial lighting 下 naive Gaussian Splatting baseline 的 mean strict pose accuracy 只有 **36.5%**，低于 randomized tiled rendering 的 **47.2%**。完整 ViserDex augmentation pipeline 达到 **56.3%**。视觉仿真器之所以有用，是因为它同时具备高保真和可控随机化。

消融进一步解释了机制。adversarial lighting 下，去掉 global shift 会让 mean pose accuracy 掉到 **23.6%**，adversarial mean rotation error 升到 **38.9 degrees**。去掉 spatial 和 color cluster 也会明显伤害结果。Global appearance shift 对光照鲁棒性最关键，结构化 cluster perturbations 则帮助局部和材质层面的泛化。

## 实验结果

Pose estimation 使用 ADD-style strict accuracy：预测误差低于 10 mm 和 10 degrees。五个物体平均下来，完整方法在 nominal lighting 下达到 **65.4%** mean accuracy，在 adversarial lighting 下达到 **56.3%**。adversarial rotation error 降到 **14.6 degrees**，对比 domain-randomized tiled rendering 的 **17.7 degrees** 和 naive Gaussian Splatting 的 **32.2 degrees**。

计算效率也很实用。论文报告 integrated 3DGS renderer 在 RTX 6000 Ada 上比 Isaac Lab tiled renderer 快 **1.6x**；batch size 为 1,024 environments 时使用 **12 GB** VRAM，而 tiled rendering 需要 **34 GB**。Pre-rasterization augmentations 每个 batch 增加不到 2 ms，约占 frame rendering time 的 4%。

真实部署测试了五个物体：Cube、3D Printed Toy、Rubber Duck、Tablet Bottle 和 Globe。nominal lighting 下平均 consecutive successful reorientations 是 **37.6**；adversarial lighting 下仍有 **25.4**。在共同的 Cube 对象上，ViserDex nominal lighting 下报告 **35.4** consecutive successes，高于 DeXtreme 的 **27.8**。Globe 的结果尤其强；Tablet Bottle 则暴露了限制：标签带来的低表面摩擦没有被建模，即使视觉性能不错，操作仍然出现更大的 sim-to-real gap。

另一个部署对比很有价值。把专门训练的 pose estimator 换成 FoundationPose 后，平均 consecutive successes 只有 **0.4**，几乎失败。论文将其归因于较慢的推理速度，大约 4 Hz，而作者的 estimator 约 18 Hz；另外快速运动和严重手指遮挡也会造成 tracking loss。对灵巧控制来说，一个通用 pose estimator 即使静态帧上准确，也未必适合放进快速反馈闭环。

## 我喜欢的地方

这篇文章最强的贡献，是把 visual sim-to-real 具体化了。它把瓶颈定位到 pose-estimation data generation，然后在 scene representation 层面做低成本结构化随机化。这个工程判断很漂亮：当对象已经表示为带 SH coefficients 的 Gaussians，domain randomization 就变成了对 representation 的轻量操作，而无需完整承担 physics-and-rendering 的负担。

模块化训练设计也合理。Teacher-student distillation 让 contact-rich RL 不被图像学习拖住。Recurrent student 承认 pose estimates 会有延迟、噪声、bias 和偶发错误。部署栈仍然需要 segmentation 和逐物体 pose estimator 训练，但在这个假设下，各模块之间配合得比较紧。

## 局限与问题

ViserDex 仍然是 instance-specific。每个对象需要 reconstructed Gaussian scene、高保真 mesh、pose-estimator training setup，以及 fine-tuned segmentation component。这对受控部署是可接受的，但还不是 category-level 或 open-set dexterity。

系统也仍然受视觉本身限制。手指遮挡被处理得比很多 RGB pipeline 更好，但 RGB 无法直接感知接触力和摩擦。Tablet Bottle 结果很清楚地说明了这一点：低标签摩擦会损害操作，即便 pose-estimation pipeline 很强。作者也指出，dense visual feedback 加 high-frequency tactile sensing 是后续很有希望的方向。

最后，方法依赖准确物体资产和仿真集成。它相对 ray-traced ADR 更省计算，但并不是 asset-free。更准确地说，它的实践配方是“低成本构建高质量 object-specific visual simulator”，还不是“一次训练，泛化到任意家庭物体”。

## Takeaways

对机器人操作来说，ViserDex 提醒我们：visual sim-to-real 的目标不只是让渲染更像真实图像。真正目标是让 perception model 的误差适合控制闭环：足够快，在遮挡下稳定，对光照鲁棒，并且能和 recurrent policy 一起平滑偶发失败。

对构建 sim-to-real pipeline 的人来说，最可迁移的想法是 **representation-space randomization**。如果 scene representation 暴露了几何、材质式颜色分组、view-dependent components 和 global appearance controls，随机化就可以在像素生成之前结构化地发生。这提供了一个很实用的中间路线：比弱 2D augmentation 更有物理结构，比完整 photorealistic scene randomization 更便宜。

</div>
