---
title: "[Paper Notes] Self-Contained and Automatic Calibration of a Multi-Fingered Hand Using Only Pairwise Contact Measurements"
date: 2026-08-19
permalink: /posts/2026/08/contact-hand-calibration-paper-notes/
tags:
  - Robot Calibration
  - Dexterous Manipulation
  - Multi-Fingered Hands
  - Self-Contact
  - Optimal Experimental Design
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

This paper presents a calibration procedure for a multi-fingered robotic hand that needs no camera, marker, fixture, or external reference object. The hand brings two fingertips into contact, records the joint configuration at first contact, and fits its kinematic parameters so the modeled distance between those fingertip geometries is zero. Repeating this process across every finger pair turns the hand into its own calibration instrument.

The main intellectual contribution is an observability argument. Each contact supplies only one scalar distance constraint, so it cannot recover every absolute kinematic quantity. The authors show that a joint calibration over multiple finger chains still identifies every parameter direction that affects the relative fingertip positions needed for grasping and in-hand manipulation. A single finger pair remains insufficient; adding a third chain removes the relevant ambiguity.

On the four-fingered DLR-Hand II, the method reduces maximum pairwise distance error from **17.70 mm to 3.69 mm** and mean error from **6.07 mm to 0.72 mm**. The propagated mean error for the manipulation-oriented relative-position metric falls from **8.01 mm to 0.89 mm**. About **150 contacts**, collected automatically in **9 minutes**, are sufficient for accurate calibration.

## Paper Info

**“Self-Contained and Automatic Calibration of a Multi-Fingered Hand Using Only Pairwise Contact Measurements”** is by **Johannes Tenhumberg, Leon Sievers, and Berthold Bäuml**. It was presented at the **2023 IEEE-RAS 22nd International Conference on Humanoid Robots (Humanoids)**. The paper is available from the [DLR Electronic Library](https://elib.dlr.de/204196/), [arXiv:2311.03957](https://arxiv.org/abs/2311.03957), and [IEEE](https://doi.org/10.1109/Humanoids57100.2023.10375208). The authors also provide a [project page](https://aidx-lab.org/2023-humanoids-contact/).

## 1. Calibration from a Zero Measurement

A dexterous hand needs an accurate forward-kinematics model. Small geometric errors move fingertips away from planned contacts, weaken grasp planning, and widen the sim-to-real gap for tactile in-hand manipulation. Conventional calibration often tracks fingertip markers with an external camera or electromagnetic system. A compact multi-fingered hand makes that setup awkward because markers occlude one another and several end effectors share a small workspace.

The paper exploits a measurement already available inside the mechanism: **two bodies are at zero separation when contact begins**. Let the forward kinematics be

\[
f(q,\rho)=F,
\]

where \(q\) contains joint angles and \(\rho\) contains the Denavit–Hartenberg parameters. For a fingertip pair \(u=(E_k,E_l)\), the relative transform is

\[
{}^{E_k}T_{E_l}=f(q,\rho)_{E_k}^{-1}f(q,\rho)_{E_l}.
\]

Given the fingertip geometries, their signed or unsigned distance is a function of this relative pose:

\[
h_c^u(q,\Theta)=d^u\!\left({}^{E_k}T_{E_l}\right).
\]

At the measured contact configuration \(q^{(n)}\), the target is always

\[
y^{(n)}=0.
\]

The data therefore reverse the usual sensing pattern. An external tracker selects \(q\) and returns a Cartesian position \(y\). Contact calibration already knows \(y=0\); the search motion discovers the joint configuration \(q\) at which that constraint becomes true.

All parameters are fitted jointly with a regularized maximum-a-posteriori least-squares objective:

\[
\Theta^*=\arg\min_{\Theta}
\left[
\sum_{n=1}^{N}\frac{\|y^{(n)}-h(q^{(n)},\Theta)\|^2}{\sigma_m^2}
+(\Theta-\Theta_p)^\top\Lambda_p^{-1}(\Theta-\Theta_p)
\right].
\]

The Gaussian prior stabilizes parameter directions that the measurements cannot identify. For the DLR-Hand II, fingertip contact regions are capsules, so distance is inexpensive to compute. A hand with mesh fingertips could use a collision-distance algorithm such as GJK.

## 2. Calibrate What Manipulation Actually Uses

The paper separates the **measurement available on hardware** from the **quantity the downstream task needs**. Dexterous manipulation depends primarily on relative fingertip positions. Choosing fingertip \(E_1\) as a reference gives

\[
h_t^k(q,\rho)=f(q,\rho)_{E_k,x}-f(q,\rho)_{E_1,x},
\qquad k=2,\ldots,N_E.
\]

A common translation applied to every fingertip cannot be recovered from pairwise contact, yet it also leaves these difference vectors unchanged. Requiring every DH parameter to be individually observable would therefore be unnecessarily strict.

The authors linearize the contact and task measurement functions with respect to calibration parameters:

\[
J_s=\left.\frac{\partial h(q_s,\Theta)}{\partial\Theta}\right|_{\Theta_0}.
\]

The nullspace of \(J^\top J\) contains parameter directions that a measurement cannot sense. Contact calibration has enough information for the manipulation task when

\[
\operatorname{kernel}(J_c^\top J_c)
\subseteq
\operatorname{kernel}(J_t^\top J_t).
\]

This inclusion is the conceptual center of the paper: every ambiguity left by contact must also be irrelevant to relative fingertip placement.

For the full DLR-Hand II, contact and task Jacobians both have **56 eigenvalues above \(10^{-6}\)** among 64 DH parameters. The eight null directions come from parallel joint axes and do not alter the fingertip task metric. Their kernels satisfy the required inclusion.

The result depends on calibrating the hand as one kinematic tree. For a single pair, 28 parameter directions should matter, but the task measurement observes 27 and scalar contact observes only 26. Two fingertips can change relative orientation while remaining on a constant-distance sphere. With three fingers, this invariance disappears; using all six pairs in the four-fingered hand gives the strongest result. The practical rule is simple: **collect contacts across the whole hand, then solve one joint calibration problem**.

## 3. Choosing Informative Contacts

Contact imposes a severe sampling constraint: the hand can measure only configurations in which two fingertips touch. Those configurations cover a thin subset of joint space, while calibration quality must remain high across the full Cartesian workspace.

The authors address this distribution shift with **task D-optimal experimental design**. Candidate contacts are scored by the parameter covariance induced by contact measurements and by how that uncertainty propagates through the desired task Jacobians. In compact form, the criterion minimizes a determinant involving

\[
\operatorname{cov}(\Theta)
\quad\text{and}\quad
\frac{1}{\bar N_D}\sum_s J_t^{s\top}J_t^s.
\]

This score asks which feasible contacts will best reduce relative-fingertip error over a Cartesian-uniform test distribution. The paper compares greedy selection and DETMAX with random sampling.

In simulation, 100 perturbed hand models are generated with uniform noise of \(\pm5^\circ\) on rotational DH parameters and \(\pm5\) mm on translational parameters. Their initial average deviation is about 21 mm. Both optimized selection methods converge faster than random sampling, reaching roughly **0.1 mm mean error with 300 contacts**. The advantage persists at larger dataset sizes because the contact and task distributions remain different.

## 4. Making Contact Collection Automatic

Each sample needs a safe search trajectory whose endpoint crosses the unknown real contact surface. The procedure is:

1. Sample 100,000 configurations in the shared reachable workspace of a finger pair.
2. Choose one configuration for finger A and find configurations of finger B whose modeled tips collide.
3. Keep one finger passive; generate a start pose for the other finger that is clearly separated.
4. Move along a path from modeled separation to modeled penetration and stop at detected contact.
5. Move the two unused fingers away from the pair’s shared workspace and repeat for all six pairs.

This search is necessary because the uncalibrated error reaches 17.7 mm, roughly the fingertip size and around 10% of the hand workspace. A pose that appears to touch in the nominal model may miss completely on hardware.

DLR-Hand II has output-side torque sensing on all 12 active joints. Before an approach, the passive finger’s torque offset \(\tau_0\) is recorded. Contact is declared when the torque change exceeds **0.1 Nm**, and the corresponding joint angles become the measurement. Detecting the earliest low-force contact reduces deformation and penetration error.

## 5. Real-Hand Results

The platform has four fingers, each with three active and one passive joint. Calibrating four DH parameters per joint yields **64 parameters**. The authors collect 300 contact samples, use an 80/20 train–test split with cross-validation, and find that 150 samples are already sufficient. Automatic acquisition of those 150 samples takes nine minutes.

| Model | Contact mean (mm) | Contact std. (mm) | Contact max (mm) | Task mean (mm) |
|---|---:|---:|---:|---:|
| Nominal kinematics | 6.07 | 3.90 | 17.70 | 8.01 |
| Calibrated joint offsets | 1.04 | 0.82 | 5.13 | 1.36 |
| **Calibrated full DH model** | **0.72** | **0.58** | **3.69** | **0.89** |

Joint-offset calibration captures most of the easy correction. Fitting the full DH model still reduces the maximum residual by another 1.44 mm and the mean by 0.32 mm. The remaining 3.69 mm worst case is close to the “few millimeters” regime needed for tactile manipulation.

One evaluation detail deserves care. Contact errors are measured on held-out contact configurations. The task-space means in the last column are obtained by propagating contact uncertainty through the contact Jacobian, parameter covariance, and task Jacobian. They are therefore model-based estimates of relative-position uncertainty, not independent measurements from an external tracking system.

## 6. Strengths and Limitations

The strongest aspect is the alignment between calibration theory and the downstream task. The nullspace inclusion explains why losing absolute pose information is acceptable, and it reveals why all finger pairs must be calibrated together. The paper also covers the full operational loop: candidate generation, experimental design, safe approach motions, contact detection, nonlinear fitting, and real-hardware validation.

The method does assume accurate fingertip geometry and repeatable low-force contact detection. Soft fingertips, compliance, backlash, thermal drift, or contact hysteresis can shift the apparent zero-distance event. The current model fits rigid DH geometry on one hand design; elastic drivetrain and fingertip parameters are left for future work. A broader study across hand morphologies and sensing technologies would clarify generality.

The strongest numerical evidence is still contact-domain cross-validation. The task error is inferred through local linear uncertainty propagation, so direct external ground-truth measurements of relative fingertip positions would provide a useful complementary validation. Very small nonzero eigenvalues may also be practically fragile even when the theoretical rank condition holds.

## Takeaway

This work turns self-contact into a metrology system. Its deeper lesson is that calibration should target **task-relevant observability**: a robot does not need to identify every geometric degree of freedom if the remaining ambiguities cannot change the quantities used by control.

For multi-fingered hands, scalar touch events become surprisingly informative when three ingredients are combined: all finger chains are solved jointly, contact poses are selected for their downstream information value, and uncertain nominal geometry is handled by active search motions. The result is a compact, automatic nine-minute routine that brings a 17.7 mm worst-case model error down to 3.7 mm without external equipment.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

这篇论文提出了一套 multi-fingered robotic hand calibration 方法，不需要 camera、marker、fixture 或外部 reference object。机械手让两个 fingertips 发生接触，记录 first contact 时的 joint configuration，再拟合 kinematic parameters，使模型中的两指尖几何距离等于零。对所有 finger pairs 重复这一过程，机械手本身就成为 calibration instrument。

论文最重要的理论贡献是 observability analysis。每次 contact 只提供一个 scalar distance constraint，无法恢复所有 absolute kinematic quantities。作者证明，只要对多条 finger chains 做 joint calibration，系统仍能识别所有会影响 relative fingertip positions 的 parameter directions，而这正是 grasping 和 in-hand manipulation 所需要的信息。只使用一个 finger pair 仍存在歧义；加入第三条 chain 后，task-relevant ambiguity 得以消除。

在 four-fingered DLR-Hand II 上，最大 pairwise distance error 从 **17.70 mm 降至 3.69 mm**，平均误差从 **6.07 mm 降至 0.72 mm**。通过 uncertainty propagation 得到的 manipulation-oriented relative-position mean error 从 **8.01 mm 降至 0.89 mm**。大约 **150 次 contacts** 就能完成准确 calibration，自动采集耗时 **9 分钟**。

## 论文信息

论文标题为 **“Self-Contained and Automatic Calibration of a Multi-Fingered Hand Using Only Pairwise Contact Measurements”**，作者是 **Johannes Tenhumberg、Leon Sievers 和 Berthold Bäuml**，发表于 **2023 IEEE-RAS 22nd International Conference on Humanoid Robots (Humanoids)**。论文可从 [DLR Electronic Library](https://elib.dlr.de/204196/)、[arXiv:2311.03957](https://arxiv.org/abs/2311.03957) 和 [IEEE](https://doi.org/10.1109/Humanoids57100.2023.10375208) 获取，作者也提供了[项目主页](https://aidx-lab.org/2023-humanoids-contact/)。

## 1. 从 Zero Measurement 完成 Calibration

Dexterous hand 需要准确的 forward-kinematics model。很小的 geometric error 也会让 fingertip 偏离 planned contact，降低 grasp planning 精度，并扩大 tactile in-hand manipulation 的 sim-to-real gap。传统 calibration 通常用外部 camera 或 electromagnetic system 跟踪 fingertip markers。Multi-fingered hand 的空间紧凑、end effectors 密集，markers 很容易相互遮挡，系统搭建也比较繁琐。

论文利用了机构内部天然存在的 measurement：**两个物体刚接触时，其间距为零**。设 forward kinematics 为

\[
f(q,\rho)=F,
\]

其中 \(q\) 表示 joint angles，\(\rho\) 表示 Denavit–Hartenberg parameters。对 fingertip pair \(u=(E_k,E_l)\)，relative transform 为

\[
{}^{E_k}T_{E_l}=f(q,\rho)_{E_k}^{-1}f(q,\rho)_{E_l}.
\]

给定 fingertip geometry，两者的 signed 或 unsigned distance 是 relative pose 的函数：

\[
h_c^u(q,\Theta)=d^u\!\left({}^{E_k}T_{E_l}\right).
\]

在实际测得的 contact configuration \(q^{(n)}\) 上，target 始终为

\[
y^{(n)}=0.
\]

这组数据与常见 sensing pattern 的方向相反。External tracker 先选定 \(q\)，再返回 Cartesian position \(y\)。Contact calibration 已知 \(y=0\)，search motion 负责找到使该 constraint 成立的 joint configuration \(q\)。

所有参数通过带 regularization 的 maximum-a-posteriori least-squares objective 联合拟合：

\[
\Theta^*=\arg\min_{\Theta}
\left[
\sum_{n=1}^{N}\frac{\|y^{(n)}-h(q^{(n)},\Theta)\|^2}{\sigma_m^2}
+(\Theta-\Theta_p)^\top\Lambda_p^{-1}(\Theta-\Theta_p)
\right].
\]

Gaussian prior 用于稳定 measurements 无法识别的 parameter directions。DLR-Hand II 的 fingertip contact regions 是 capsules，因此 distance computation 十分直接。若 fingertips 以 mesh 表示，也可以使用 GJK 等 collision-distance algorithm。

## 2. Calibration 应围绕 Manipulation 真正使用的量

论文区分了**硬件能够得到的 measurement**和**下游任务真正需要的 quantity**。Dexterous manipulation 主要依赖 relative fingertip positions。选择 fingertip \(E_1\) 作为 reference，可以写成

\[
h_t^k(q,\rho)=f(q,\rho)_{E_k,x}-f(q,\rho)_{E_1,x},
\qquad k=2,\ldots,N_E.
\]

Pairwise contact 无法恢复所有 fingertips 的 common translation，不过这种平移不会改变 difference vectors。强制要求每个 DH parameter 都 individually observable，会引入任务并不需要的约束。

作者分别对 contact measurement function 和 task measurement function 关于 calibration parameters 做 linearization：

\[
J_s=\left.\frac{\partial h(q_s,\Theta)}{\partial\Theta}\right|_{\Theta_0}.
\]

\(J^\top J\) 的 nullspace 包含 measurement 无法感知的 parameter directions。Contact calibration 能够满足 manipulation task 的条件是

\[
\operatorname{kernel}(J_c^\top J_c)
\subseteq
\operatorname{kernel}(J_t^\top J_t).
\]

这条 inclusion 是全文的概念核心：contact 留下的每一个 ambiguity，也必须对 relative fingertip placement 无关。

在完整 DLR-Hand II 上，contact Jacobian 和 task Jacobian 都在 64 个 DH parameters 中得到 **56 个大于 \(10^{-6}\) 的 eigenvalues**。八个 null directions 来自 parallel joint axes，不影响 fingertip task metric；两者 kernel 满足所需 inclusion。

这个结果依赖于把整只手作为一棵 kinematic tree 联合标定。对单个 finger pair，理论上有 28 个 relevant parameter directions；task measurement 只能观测 27 个，scalar contact 更只能观测 26 个。两个 fingertips 可以沿 constant-distance sphere 改变相对姿态，同时保持距离不变。加入第三根手指后，这种 invariance 消失；four-fingered hand 使用全部六组 pairs 时信息最完整。实际工程规则非常明确：**采集整只手所有 pairs 的 contacts，再求解一个 joint calibration problem**。

## 3. 选择 Informative Contacts

Contact 对 sampling 施加了很强的 constraint：只有两个 fingertips 接触时，系统才能测量。这些 configurations 只覆盖 joint space 中很薄的一部分，而 calibration 必须在完整 Cartesian workspace 内保持准确。

作者使用 **task D-optimal experimental design** 处理这种 distribution shift。Candidate contacts 的评分同时考虑 contact measurements 引起的 parameter covariance，以及这些 uncertainty 经过 task Jacobians 后对下游误差的影响。简写后，criterion 最小化由下面两部分构成的 determinant：

\[
\operatorname{cov}(\Theta)
\quad\text{和}\quad
\frac{1}{\bar N_D}\sum_s J_t^{s\top}J_t^s.
\]

这个 score 衡量哪些 feasible contacts 最能降低 Cartesian-uniform test distribution 上的 relative-fingertip error。论文比较了 greedy selection、DETMAX 和 random sampling。

Simulation 随机生成 100 个 perturbed hand models：rotational DH parameters 加入 \(\pm5^\circ\) uniform noise，translational parameters 加入 \(\pm5\) mm uniform noise，初始平均偏差约为 21 mm。两种 optimized selection 都比 random sampling 收敛更快，使用 300 个 contacts 时 mean error 约为 **0.1 mm**。即使 dataset 增大，这种优势仍然存在，因为 contact distribution 和 task distribution 始终不同。

## 4. 如何让 Contact Collection 自动运行

每个 sample 都需要一条 safe search trajectory，让其 endpoint 穿过未知的真实 contact surface。具体过程如下：

1. 在一个 finger pair 的 shared reachable workspace 内采样 100,000 个 configurations。
2. 选择 finger A 的一个 configuration，并寻找会让 finger B 的 modeled tip 发生 collision 的 configurations。
3. 保持一根手指 passive，为另一根手指生成一个明显分离的 start pose。
4. 沿 modeled separation 到 modeled penetration 的路径运动，在检测到 contact 时停止。
5. 将其余两根手指移出当前 pair 的 shared workspace，对全部六组 pairs 重复该过程。

这一步 search 十分必要，因为 uncalibrated error 高达 17.7 mm，与 fingertip 尺寸相近，也约等于 hand workspace 的 10%。Nominal model 中看似接触的 pose，在真实硬件上可能完全错开。

DLR-Hand II 的 12 个 active joints 都有 output-side torque sensing。Approach 开始前，系统记录 passive finger 的 torque offset \(\tau_0\)。当 torque change 超过 **0.1 Nm** 时判定 contact，并把对应 joint angles 作为 measurement。尽早检测 low-force contact，可以减小 deformation 和 penetration error。

## 5. Real-Hand Results

实验平台包含四根手指，每根有三个 active joints 和一个 passive joint。每个 joint 拟合四个 DH parameters，总计 **64 个 parameters**。作者采集 300 个 contact samples，采用 80/20 train–test split 和 cross-validation，并发现 150 个 samples 已经足够。自动采集这 150 个 samples 只需要九分钟。

| Model | Contact mean (mm) | Contact std. (mm) | Contact max (mm) | Task mean (mm) |
|---|---:|---:|---:|---:|
| Nominal kinematics | 6.07 | 3.90 | 17.70 | 8.01 |
| Calibrated joint offsets | 1.04 | 0.82 | 5.13 | 1.36 |
| **Calibrated full DH model** | **0.72** | **0.58** | **3.69** | **0.89** |

Joint-offset calibration 已经修正了大部分显著误差。继续拟合 full DH model，maximum residual 又降低 1.44 mm，mean residual 再降低 0.32 mm。最终 3.69 mm 的 worst case 已接近 tactile manipulation 所要求的 “few millimeters” 范围。

这里有一项 evaluation detail 值得注意。Contact errors 来自 held-out contact configurations。表格最后一列的 task-space means 则通过 contact Jacobian、parameter covariance 和 task Jacobian 传播 contact uncertainty 得到。因此，这些数值是 relative-position uncertainty 的 model-based estimates，并非外部 tracking system 给出的 independent measurements。

## 6. 优点与局限

论文最大的优点，是 calibration theory 与 downstream task 之间的对齐。Nullspace inclusion 解释了 absolute pose information 的缺失为何可以接受，也揭示了为何必须 joint calibration all finger pairs。论文还给出了完整 operational loop：candidate generation、experimental design、safe approach motions、contact detection、nonlinear fitting 和 real-hardware validation。

这套方法依赖准确的 fingertip geometry 和可重复的 low-force contact detection。Soft fingertips、compliance、backlash、thermal drift 或 contact hysteresis 都可能改变 apparent zero-distance event。当前工作只在一种 hand design 上拟合 rigid DH geometry；drivetrain 和 fingertip 的 elastic parameters 被留给 future work。更多 hand morphologies 和 sensing technologies 上的实验将更有助于判断 generality。

当前最强的 numerical evidence 仍来自 contact-domain cross-validation。Task error 通过 local linear uncertainty propagation 推断得到，因此使用外部 ground truth 直接测量 relative fingertip positions，会是很有价值的 complementary validation。即使 theoretical rank condition 成立，非常小的 nonzero eigenvalues 在实际系统中也可能缺乏 robustness。

## Takeaway

这项工作把 self-contact 变成了 metrology system。更深层的启发是 calibration 应关注 **task-relevant observability**：如果剩余 ambiguity 无法改变 controller 使用的 quantity，机器人就不必识别每一个 geometric degree of freedom。

对 multi-fingered hands 来说，三个条件让 scalar touch events 产生了超出直觉的信息量：联合求解所有 finger chains；按照 downstream information value 选择 contact poses；通过 active search motions 处理 nominal geometry uncertainty。最终得到的九分钟自动流程无需外部设备，就把 17.7 mm worst-case model error 降到了 3.7 mm。

</div>
