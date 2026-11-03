---
title: "[Paper Notes] Generative Neural Retargeting for Human-to-Robot Dexterous Manipulation"
date: 2026-11-03
permalink: /posts/2026/11/gnr-paper-notes/
excerpt: "GNR learns flow-matching corrections to human-derived robot references, amortizing physics-based retargeting through simulation-verified sampling and MPC warm starts."
tags:
  - Paper Notes
  - Dexterous Manipulation
  - Retargeting
  - Flow Matching
  - Human Demonstration Videos
  - Simulation
  - Model Predictive Control
---

<div data-lang="en" markdown="1">

## TL;DR

Physics-based retargeting can spend hours finding robot controls for a few seconds of human motion. **Generative Neural Retargeting (GNR)** learns from successful optimizer outputs, then generates corrections to new kinematic references. Simulation checks each candidate; difficult long-horizon tasks use the generated trajectory to initialize MPC. Previously solved demonstrations thus reduce the search cost of future ones.

On 1,000 held-out HOT3D-derived demonstrations, GNR reaches **56.2% success with 256 candidates**, compared with DIAL-MPC's **27.2% with a 3,000-sample budget**. This is simulation-verified pass@256. Its single-candidate success is 18.1%, and its strongest long-horizon assembly result still needs MPC feedback. These distinctions determine what the claimed efficiency buys.

## Paper and reading version

**Generative Neural Retargeting for Human-to-Robot Dexterous Manipulation**, by Dechen Gao, Yue Yang, Ben Abbatematteo, Nathan Godwin, Pengcheng Wang, Roger Boldu, Steven Man, Zhiyang Dou, Chuan Qin, Sho Nakagome, and Eric Whitmire. The work is led by Meta Reality Labs Research, with university affiliations including UC Davis, UNC Chapel Hill, UC Berkeley, MIT, and CMU. These notes use the 40-page [arXiv:2610.12440v1](https://arxiv.org/abs/2610.12440v1), submitted October 8, 2026, checked November 3, 2026. [PDF](https://arxiv.org/pdf/2610.12440v1) · [Project](https://yy-gx.github.io/GNR/)

## What the generator learns

The reference trajectory contains robot and object states, obtained by reconstructing human motion and applying inverse kinematics. IK provides useful geometry, but its controls can lose contact, penetrate objects, or fail to move them. A physics-based optimizer searches for controls that reproduce the demonstrated behavior under simulated dynamics:

$$
\min_{u_{0:T-1}}J(u_{0:T-1}),\qquad x_{t+1}=f(x_t,u_t),\quad x\in\mathcal X,\ u\in\mathcal U.
$$

The cost includes object tracking and force regularization. Contact makes this search discontinuous and expensive. GNR assumes that successful trajectories share structure that a conditional generative model can learn. The seed dataset contains successful DIAL-MPC solutions, paired with their human-derived references.

GNR predicts the **residual control sequence** $\Delta=u_{0:T-1}-\bar u_{0:T-1}$, conditioned on the reference and task-dependent object geometry or pose, $c=(\bar x_{0:T},o)$. Its flow-matching objective uses Gaussian noise $z_0$ and flow time $\tau$:

$$
z_\tau=(1-\tau)z_0+\tau\Delta,\qquad
\mathcal L_{\mathrm{FM}}=\mathbb E\left[\|v_\theta(z_\tau,\tau,c)-(\Delta-z_0)\|_2^2\right].
$$

At inference, integrating the learned velocity field produces $\widehat\Delta$ and controls $u=\bar u+\widehat\Delta$. The residual formulation preserves the reference as an initial guess and learns the changes needed for physical interaction. The HOT3D model uses a temporal U-Net with FiLM conditioning, a Point Transformer V3 encoder over 1,024 object points, and ten Euler integration steps. It has 19.57 million parameters and trains on 28,480 seed episodes. ShapeFilter and NIST use separate task models; the main precision-task experiments condition on object pose. [Sections 3 and 5.1, Appendix B](https://arxiv.org/pdf/2610.12440v1)

## Sampling, verification, and feedback

For open-loop retargeting, the model draws $S$ noise samples and generates $S$ control sequences. Each sequence is replayed in simulation. A demonstration succeeds when at least one candidate passes its task-specific criterion, giving **pass@$S$**. Increasing $S$ spends more simulation and inference compute to search the learned distribution. A sampled trajectory has no automatic feasibility guarantee.

For difficult tasks, GNR supplies an initialization that MPC refines with feedback. This distinction matters on NIST: at 256 samples, open-loop GNR reaches only **4.7%** success. GNR-initialized MPC reaches **92.2%** using 2,296 samples, versus 3,440 for IK-initialized MPC at the same success rate. The learned proposal helps the optimizer begin near useful solutions; feedback handles errors that accumulate during the roughly 29-second assembly sequence. [Sections 3.2 and 5.3](https://arxiv.org/pdf/2610.12440v1)

## The data engine: discovery before expansion

The pipeline needs per-frame human hand motion, object poses, and object meshes. It repairs meshes, computes signed distance fields, transfers motion to a simulated human hand, and uses keypoint IK to create the robot reference. If a segment begins with an object already grasped, the simulator temporarily fixes the object while the robot closes its fingers, then releases it before replay.

For HOT3D, the discovery phase searches the nominal conditions and sixteen single-axis perturbations of pose, timing, scale, or friction. Only segments with a successful retargeting proceed to expansion. The scaling phase varies mass, friction, and geometry, including SAM3D-generated meshes and direct mesh deformations. This concentrates expensive generation on segments already shown to be retargetable.

Acceptance combines four checks:

$$
\Gamma(\xi)=\gamma_{\mathrm{track}}(\xi)\land\gamma_{\mathrm{pen}}(\xi)\land\gamma_{\mathrm{grasp}}(\xi)\land\gamma_{\mathrm{force}}(\xi).
$$

HOT3D thresholds include object position error below 150 mm, orientation error below 40 degrees, mean finger-capsule penetration at most 5 mm, median squeeze force after object release at least 1 N, and per-finger force's 95th percentile at most 100 N. These are practical dataset filters with finite tolerances. The headline millimeter-precision results belong to the separate assembly tasks.

SuperDex provides simulated dynamics and spatially distributed 3-D contact forces. The resulting dense force annotations are **simulation-derived labels**. The main target hand is the five-finger Tesollo DG-5F; the precision tasks add a Franka FR3 arm. [Section 4, Appendix B.2](https://arxiv.org/pdf/2610.12440v1)

## Reading the experiments with their denominators

HOT3D contributes **780 source motions across 33 objects**, averaging roughly two seconds. Augmentation expands these into about 360,000 candidate demonstrations. The 1,000-example evaluation set contains unseen objects, source grasps, or geometry variants: 203, 338, and 459 examples respectively. Of these, 272 are DIAL-MPC successes and 728 are failures under its specified budget.

| HOT3D method | Sampling budget | Success | Mean CPU core-seconds per demonstration |
|---|---:|---:|---:|
| Fingertip IK | 1 | 18.3% | 39.0 |
| DIAL-MPC | 3,000 | 27.2% | 2,689.3 |
| iCEM | 3,000 | 34.7% | 3,862.1 |
| GNR | 1 | 18.1% | 48.9 |
| GNR | 64 | 49.6% | 90.9 |
| GNR | 256 | 56.2% | 354.1 |

The 8.5% figure is the ratio $256/3000$ of sampling budgets. The measured per-demonstration CPU reduction against DIAL-MPC is **7.6×**. At 256 samples, GNR solves **42.58% of the 728 MPC-failure cases**. That shows recovery beyond the seed optimizer's finite-budget output; it does not establish that MPC could never solve those cases with more compute. [Table 1](https://arxiv.org/pdf/2610.12440v1)

ShapeFilter inserts a cross-shaped part through a matching opening with **1.96 mm clearance**. With 2,448 training and 589 test demonstrations, open-loop GNR rises from 52.4% at one sample to 99.3% at 256. Even a model trained on 50 demonstrations reaches 99.5% at 256 samples, from 11.5% at one sample. This is a task-specific demonstration of trading seed data for test-time search. The reported success check uses the object's final insertion region; clearance and measured tracking error are different quantities.

NIST requires horizontal error below 1 mm, at least 8 mm of screw-down, and axis error below 0.003 radians. Its 294/64 training/test split and weak open-loop result make the role of MPC especially clear. Both precision datasets use high-quality recordings from 15 OptiTrack cameras and an instrumented wearable exoskeleton. Their results therefore depend on a more accurate input pipeline than ordinary reconstructed video. [Section 5.3, Table 4](https://arxiv.org/pdf/2610.12440v1)

## Dataset size and the full cost of bootstrapping

The reported **223k trajectories across 3.3k geometries** combine approximately 95k MPC successes with 127,136 additional trajectories recovered by GNR from MPC-failure demonstrations. These are augmented and retargeted trajectories derived from 780 source motions, so the count should not be read as 223k independent human recordings or 3.3k independently captured objects.

The paper also estimates a practical generation schedule: first spend compute to obtain 28k successful MPC seeds, then run GNR on the remaining 332k demonstrations. Including seed generation, this produces approximately **215k successful trajectories at 148.7k CPU core-hours**, compared with 390k core-hours for MPC alone, a **2.62× cost reduction**. This schedule has a different output count from the 223k union because GNR does not recover every non-seed MPC success. The 7.6× per-example speedup should therefore be kept separate from the full pipeline's cost reduction.

Including seed costs also yields **11.2×** total CPU savings on ShapeFilter and **1.8×** on NIST under the paper's chosen settings. These are CPU accounting results for retargeting; the models additionally require GPU training. [Sections 5.2–5.3, Appendix G](https://arxiv.org/pdf/2610.12440v1)

## What transfers beyond retargeting?

The downstream behavioral-cloning experiment trains equal-sized datasets of 500 episodes with the same state-based policy architecture. Best checkpoint success over 32 test episodes is 37.5% for MPC data and 43.75% for both GNR and GNR+MPC data. This supports the usability of generated trajectories, while the small evaluation and checkpoint selection leave limited evidence for a general policy-learning advantage. The paper demonstrates policy learning in simulation and lists sim-to-real transfer as future work.

A separate ShapeFilter expansion experiment starts with 200 seeds, uses MPC to solve GNR failures, and grows to 749 training trajectories over four rounds. On a fixed 256-example test set, pass@8 improves from 55.2% to 74.4%. This suggests a useful allocation strategy: concentrate optimizer effort on failures, then reuse those solutions through the generator. [Appendix I](https://arxiv.org/pdf/2610.12440v1)

My main takeaway is that retargeting can become an accumulating dataset-generation process: expensive solutions train a reusable proposal model, simulation selects valid candidates, and feedback remains available where open-loop generation fails. Compared with [CARD's contact targets and tactile replay](/posts/2026/11/card-paper-notes/), GNR emphasizes amortizing simulated trajectory search. Its force labels inherit the simulator's geometry and physical assumptions, and hardware transfer still needs validation. As checked on November 3, the project page links the paper and says further details are forthcoming; it does not establish a released code or dataset package.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## 核心概括

物理重定向可能花费数小时，为几秒钟的人类动作找到可执行的机器人控制序列。**Generative Neural Retargeting（GNR）** 从优化器已经求解成功的轨迹中学习，再为新的运动学参考生成控制修正量。仿真负责逐条检查候选；复杂长时序任务进一步使用生成轨迹初始化 MPC。这样，过去求解的示范可以降低后续示范的搜索成本。

在 1,000 条 HOT3D 衍生留出示范上，GNR 用 **256 个候选达到 56.2% 成功率**，DIAL-MPC 在 **3,000 次采样预算下为 27.2%**。前者是经过仿真验证的 pass@256；单候选成功率为 18.1%。最困难的长时序装配结果仍依赖 MPC 反馈。这些条件决定了论文的效率提升应该如何理解。

## 论文与阅读版本

论文题为 **Generative Neural Retargeting for Human-to-Robot Dexterous Manipulation**，作者为 Dechen Gao、Yue Yang、Ben Abbatematteo、Nathan Godwin、Pengcheng Wang、Roger Boldu、Steven Man、Zhiyang Dou、Chuan Qin、Sho Nakagome 和 Eric Whitmire。工作由 Meta Reality Labs Research 主导，大学署名包括 UC Davis、UNC Chapel Hill、UC Berkeley、MIT 和 CMU。本文依据 40 页的 [arXiv:2610.12440v1](https://arxiv.org/abs/2610.12440v1)，提交于 2026 年 10 月 8 日，核对日期为 2026 年 11 月 3 日。[PDF](https://arxiv.org/pdf/2610.12440v1) · [项目主页](https://yy-gx.github.io/GNR/)

## 生成器究竟学习什么

参考轨迹包含机器人与物体状态，由人类动作重建及逆运动学得到。IK 提供几何上的初始解，但控制执行后可能丢失接触、穿透物体，或者无法带动物体。物理优化器需要寻找能在仿真动力学下复现示范行为的控制序列：

$$
\min_{u_{0:T-1}}J(u_{0:T-1}),\qquad x_{t+1}=f(x_t,u_t),\quad x\in\mathcal X,\ u\in\mathcal U.
$$

代价包含物体跟踪和力正则项。接触使搜索不连续、计算昂贵。GNR 假设成功轨迹具有可学习的共同结构，用成功的 DIAL-MPC 解及其人类动作参考组成种子训练集。

模型预测的是**控制序列残差** $\Delta=u_{0:T-1}-\bar u_{0:T-1}$，条件为参考轨迹以及随任务变化的物体几何或位姿，记作 $c=(\bar x_{0:T},o)$。Flow matching 使用高斯噪声 $z_0$ 和流时间 $\tau$：

$$
z_\tau=(1-\tau)z_0+\tau\Delta,\qquad
\mathcal L_{\mathrm{FM}}=\mathbb E\left[\|v_\theta(z_\tau,\tau,c)-(\Delta-z_0)\|_2^2\right].
$$

推理时积分学习到的速度场，得到 $\widehat\Delta$，再还原控制 $u=\bar u+\widehat\Delta$。残差形式保留参考动作作为初始猜测，让网络学习满足物理交互所需的修正。HOT3D 模型采用带 FiLM 条件注入的时序 U-Net，以 Point Transformer V3 编码 1,024 个物体点，使用十步 Euler 积分。模型含 1,957 万参数，在 28,480 条种子轨迹上训练。ShapeFilter 和 NIST 分别训练任务模型，主要精密操作实验使用物体位姿条件。[第 3、5.1 节与附录 B](https://arxiv.org/pdf/2610.12440v1)

## 采样、验证与反馈如何分工

开环重定向时，模型采样 $S$ 个噪声并生成 $S$ 条控制序列，每条都在仿真中回放。只要有一个候选通过任务判据，该示范就计为成功，因此指标是 **pass@$S$**。增加 $S$，相当于投入更多仿真和推理计算，在学习到的分布内搜索。生成出来的轨迹本身没有自动满足物理可行性的保证。

困难任务则使用 GNR 初始化 MPC，再由 MPC 结合反馈细化。在 NIST 上，这一区别尤其明显：开环 GNR 即使采样 256 次也只有 **4.7%** 成功率；GNR 初始化的 MPC 使用 2,296 次采样达到 **92.2%**，IK 初始化的 MPC 达到同样成功率需要 3,440 次。学习到的候选帮助优化器接近有效解，反馈负责处理约 29 秒装配过程中逐渐积累的误差。[第 3.2、5.3 节](https://arxiv.org/pdf/2610.12440v1)

## 数据引擎：先发现可行片段，再扩展

流水线需要逐帧人手运动、物体位姿和物体网格。系统修复网格、计算符号距离场，将动作转入仿真人手，再通过关键点 IK 得到机器人参考。如果片段开始时物体已经被握住，仿真会暂时固定物体，让机器人闭合手指重新建立抓握，随后释放物体并回放动作。

对于 HOT3D，发现阶段搜索原始条件及十六种单轴扰动，包括位姿、时间、尺度或摩擦。只有至少找到一个成功重定向解的片段，才进入扩展阶段。扩展阶段改变质量、摩擦和几何，几何变化包括 SAM3D 生成网格及直接网格变形。这使昂贵的数据生成集中在已经证明可重定向的片段上。

接受判据组合四类检查：

$$
\Gamma(\xi)=\gamma_{\mathrm{track}}(\xi)\land\gamma_{\mathrm{pen}}(\xi)\land\gamma_{\mathrm{grasp}}(\xi)\land\gamma_{\mathrm{force}}(\xi).
$$

HOT3D 的阈值包括：物体位置误差小于 150 mm、朝向误差小于 40 度、手指胶囊体平均穿透不超过 5 mm、物体释放后夹持力中位数至少 1 N，以及每根手指接触力的第 95 百分位不超过 100 N。这是带容差的数据筛选标准。论文宣传的毫米级精度来自另外两项装配任务。

SuperDex 提供动力学和空间分布式三维接触力，因此密集力标注属于**仿真生成的标签**。主要目标手型为五指 Tesollo DG-5F，精密操作任务再搭配 Franka FR3 机械臂。[第 4 节与附录 B.2](https://arxiv.org/pdf/2610.12440v1)

## 实验数字及其分母

HOT3D 提供 **33 个物体上的 780 段原始动作**，平均约两秒；增强后得到约 36 万条候选示范。1,000 条测试样本分别覆盖未见物体、原始抓握和几何变体，对应 203、338、459 条。其中 272 条能被指定预算下的 DIAL-MPC 求解，728 条不能。

| HOT3D 方法 | 采样预算 | 成功率 | 每条示范平均 CPU 核秒 |
|---|---:|---:|---:|
| 指尖 IK | 1 | 18.3% | 39.0 |
| DIAL-MPC | 3,000 | 27.2% | 2,689.3 |
| iCEM | 3,000 | 34.7% | 3,862.1 |
| GNR | 1 | 18.1% | 48.9 |
| GNR | 64 | 49.6% | 90.9 |
| GNR | 256 | 56.2% | 354.1 |

8.5% 来自采样预算比值 $256/3000$；实测每条示范的 CPU 开销相对 DIAL-MPC 降低 **7.6 倍**。采样 256 次时，GNR 解决了 **728 条 MPC 失败样本中的 42.58%**。这说明生成模型能补充种子优化器在有限预算下遗漏的解；它并不能证明 MPC 增加计算后仍然无法求解这些样本。[表 1](https://arxiv.org/pdf/2610.12440v1)

ShapeFilter 要将十字形零件插入匹配孔，**间隙为 1.96 mm**。使用 2,448 条训练示范、589 条测试示范，开环 GNR 从单次采样的 52.4% 提升至 256 次采样的 99.3%。即使只训练 50 条示范，也能从单次采样的 11.5% 提升到 256 次采样的 99.5%。这个结果展示了在特定任务内，用推理搜索换取更少种子数据的可能性。成功判据检查物体最终是否进入插入区域；装配间隙与实测轨迹误差需要分别理解。

NIST 要求水平误差小于 1 mm、旋入深度至少 8 mm、轴线误差小于 0.003 弧度。训练/测试划分为 294/64，开环结果很弱，进一步说明 MPC 的作用。两项精密操作数据都使用 15 台 OptiTrack 相机和带传感器的可穿戴外骨骼采集，因此实验依赖比普通视频重建更精确的输入。[第 5.3 节与表 4](https://arxiv.org/pdf/2610.12440v1)

## 数据规模与启动成本

论文报告的 **22.3 万条轨迹、3,300 种几何**，由约 9.5 万条 MPC 成功轨迹，加上 GNR 从 MPC 失败示范中恢复的 127,136 条轨迹组成。它们来自 780 段原始动作的增强与重定向，不能据此推断采集了 22.3 万段独立人类示范，或 3,300 个独立真实物体。

论文另行估算了一种实际生成流程：先投入计算获得 2.8 万条成功 MPC 种子，再对剩余 33.2 万条示范使用 GNR。计入种子生成后，约 **14.87 万 CPU 核时可生成 21.5 万条成功轨迹**，相对纯 MPC 的 39 万核时节省 **2.62 倍**计算。这个流程的输出量与前述 22.3 万条并集不同，因为 GNR 无法恢复所有非种子 MPC 成功样本。单条示范的 7.6 倍加速与完整流水线的成本收益应分别报告。

在论文选择的配置下，计入种子开销后的整体 CPU 节省分别为 ShapeFilter **11.2 倍**、NIST **1.8 倍**。这些数字描述重定向的 CPU 核算；模型训练还需要 GPU 计算。[第 5.2–5.3 节与附录 G](https://arxiv.org/pdf/2610.12440v1)

## 从重定向走向策略学习，还有多远

下游行为克隆实验使用相同的状态输入策略结构，以及各 500 条轨迹的等规模数据集。在 32 条测试 episode 上，最佳 checkpoint 成功率为 MPC 数据 37.5%，GNR 和 GNR+MPC 数据均为 43.75%。结果支持生成轨迹可用于策略学习；有限测试规模与最佳 checkpoint 选择，尚不足以支撑普遍的策略学习优势。论文的策略实验在仿真中完成，sim-to-real 被列为未来工作。

另一个 ShapeFilter 数据扩展实验从 200 条种子开始，用 MPC 求解 GNR 失败的示范，四轮后扩展到 749 条训练轨迹。在固定的 256 条测试样本上，pass@8 从 55.2% 提升到 74.4%。这提示了一种计算分配方式：把优化器预算投入失败案例，再让生成器复用新找到的解。[附录 I](https://arxiv.org/pdf/2610.12440v1)

我的主要收获是，重定向可以成为逐步积累经验的数据生成过程：昂贵的解训练可复用的候选生成模型，仿真筛选有效轨迹，开环不足时保留反馈修正。与 [CARD 的接触目标和触觉回放](/posts/2026/11/card-paper-notes/) 相比，GNR 更关注摊薄仿真轨迹搜索成本。其力标签继承了仿真的几何与物理假设，硬件迁移仍待验证。截至 11 月 3 日，项目主页提供论文链接，并表示更多细节即将公布；页面尚未提供可确认发布的代码或数据集包。

</div>
