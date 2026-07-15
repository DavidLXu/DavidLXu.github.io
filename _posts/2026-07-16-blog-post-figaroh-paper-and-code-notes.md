---
title: "[Paper Notes] FIGAROH: a Python toolbox for dynamic identification and geometric calibration of robots and humans"
date: 2026-07-16
permalink: /posts/2026/07/figaroh-paper-and-code-notes/
tags:
  - Robot Calibration
  - System Identification
  - Robot Dynamics
  - Optimal Experiment Design
  - Open Source
---

<div data-lang="en" markdown="1">

**FIGAROH** is a Python toolbox for two closely related model-correction problems: **geometric calibration**, which estimates errors in robot kinematics, and **dynamic identification**, which estimates inertial, friction, actuator, and sensor parameters. Its most useful systems idea is the complete experimental loop: construct the identification model from URDF, determine which parameter combinations are observable, design informative postures or motions, estimate parameters, validate the result, and update the robot model.

This note reads the original paper together with the current [`figaroh-plus`](https://github.com/thanhndv212/figaroh-plus) codebase. The distinction matters. The paper describes the unified scientific workflow demonstrated on robots and a human subject. The current v0.4.5 repository has grown into a more modular library with robust calibration, additional solvers, physical-consistency projection, URDF export, multi-backend interfaces, and reporting/verification tools.

## Paper Info

The paper is **"FIGAROH: a Python toolbox for dynamic identification and geometric calibration of robots and humans"** by **Dinh Vinh Thanh Nguyen, Vincent Bonnet, Maxime Sabbah, Maxime Gautier, Pierre Fernbach, and Florent Lamiraux**. The provided PDF is the HAL version of the paper published at the **2023 IEEE-RAS International Conference on Humanoid Robots**, DOI [`10.1109/Humanoids57100.2023.10375232`](https://doi.org/10.1109/Humanoids57100.2023.10375232). Despite the local filename `FIGAROH_IROS_2022-5.pdf`, it is a Humanoids 2023 paper.

The current GitHub repository is a maintained fork of the original LAAS GitLab project. It publishes the `figaroh` Python package, while runnable robot examples live in a separate [`figaroh-examples`](https://github.com/thanhndv212/figaroh-examples) repository.

## Two Problems in One Toolbox

Geometric and dynamic identification use similar mathematics and experimental logic, although they correct different parts of the model.

### Geometric calibration

A URDF gives each joint a nominal transform. Real assembly introduces small translation and rotation errors. FIGAROH parameterizes the local variation of joint \(j\) as

\[
\Phi_{g,j}
=
[\delta p_x,\delta p_y,\delta p_z,
\delta\phi_x,\delta\phi_y,\delta\phi_z]^T.
\]

The forward-kinematics residual is locally linearized:

\[
\Delta P=R_g(q,p)\Phi_g,
\]

where \(R_g\) is a geometric regressor or kinematic Jacobian connecting parameter errors to measured pose errors. Measurements can be full poses, positions, orientations, camera observations, motion-capture markers, or geometric constraints such as contact with a plane.

The six-parameter representation does not mean that all six parameters of every joint can be independently recovered. The paper notes that a revolute joint has at most four independently identifiable geometric parameters and a prismatic joint at most two; collinear axes introduce additional dependencies. FIGAROH uses rank analysis to keep the observable parameter combinations.

### Dynamic identification

Rigid-body inverse dynamics is linear in inertial and several extended mechanical parameters:

\[
D=R_d(q,\dot q,\ddot q)\Phi_d.
\]

Here \(D\) is a stack of measured torques, motor currents, or external wrenches; \(R_d\) is the dynamic regressor; and \(\Phi_d\) can include:

- ten inertial parameters per body: mass, first moment, and six inertia-tensor terms;
- joint viscous and Coulomb friction;
- torque-sensor offsets;
- actuator rotor inertia and drive-chain friction;
- current-to-torque or sensor gains.

The identifiable set depends on available measurements. Joint torques can identify inertial and joint parameters. Combining joint torque with motor current exposes drive-chain terms. External wrench measurements identify a different subset. FIGAROH builds the regressor according to this measurement contract.

## Rank Deficiency and Base Parameters

Robot regressors are generally rank deficient. Some physical parameters always appear together in the equations, so data cannot separate them regardless of sample count. FIGAROH numerically applies QR decomposition with column pivoting to rewrite the original regressor in terms of full-rank **base parameters**:

\[
Y=R\Phi=R_b\Phi_b,
\qquad
\operatorname{rank}(R_b)=\dim(\Phi_b).
\]

This step is central. A least-squares solver can produce numbers for an underdetermined parameterization, but those numbers are not uniquely supported by the measurements. Base-parameter reduction makes the estimation problem honest: the solver estimates only independent combinations that the experiment can observe.

The paper emphasizes the interpretability of numerical QR. It can expose which original columns combine into each base parameter, and it can produce different static and dynamic base sets. For example, static data removes velocity and acceleration terms, leaving mass and center-of-mass combinations.

## Parameter Estimation

Once the base regressor is full rank, the simplest estimate is ordinary least squares:

\[
\hat\Phi_b
=
(R_b^TR_b)^{-1}R_b^TY.
\]

Weighted least squares compensates for measurement channels with different noise levels or units. The paper also covers total least squares for experiments with loaded and unloaded configurations, iterative least squares and Levenberg-Marquardt for nonlinear geometric calibration, and constrained optimization for physically plausible inertial parameters.

The current code retains the regressor/QR workflow and broadens solver support. `BaseIdentification.solve()` runs the standard identification path, while `solve_with_custom_solver()` can invoke least squares, QR/SVD-style methods, Ridge, Lasso, Elastic Net, robust regression, and constrained variants through `figaroh.tools.LinearSolver`.

Physical consistency deserves separate treatment. An unconstrained fit can yield negative mass or an impossible inertia tensor while still minimizing torque error. The paper uses quadratic constrained programming to recover individually meaningful parameters. The current code additionally provides optional pseudo-inertia SDP/LMI projection and full-parameter reconstruction from base parameters, with CAD-derived mass, center-of-mass, and symmetry constraints. These paths require an SDP solver and are disabled by default.

## Optimal Experiment Design

FIGAROH treats data collection as part of identification. Random postures may leave the regressor poorly conditioned; random motions can waste robot time and become unsafe for humanoids. The toolbox therefore designs **Optimal Exciting Postures (OEP)** for calibration and static identification, and **Optimal Exciting Motions (OEM)** for dynamic identification.

The paper uses singular-value criteria derived from the regressor, including determinant-like information volume, condition number, and minimum singular value. Informally, a useful experiment makes the regressor columns distinguishable:

\[
\text{good excitation}
\Longrightarrow
\sigma_{\min}(R)\text{ increases and }
\kappa(R)=\frac{\sigma_{\max}(R)}{\sigma_{\min}(R)}
\text{ decreases}.
\]

### Selecting calibration postures

Candidate postures receive information matrices \(\Sigma_i\) and continuous weights \(\omega_i\). FIGAROH solves

\[
\max_{\omega}
\Psi\!\left(\sum_i\omega_i\Sigma_i\right),
\qquad
\sum_i\omega_i=1,
\]

then ranks candidates by weight. The excitation score eventually reaches a peak or plateau, which gives a data-driven stopping point for the number of postures. The paper illustrates a case where the criterion peaks near 40 postures.

Postures are optimized under joint limits, torque limits, workspace bounds, and self-collision constraints. The paper uses Pinocchio/hpp-fcl geometry and IPOPT-based nonlinear optimization.

### Generating exciting motions

OEM generation connects consecutive OEP using cubic splines. The optimizer adjusts spline waypoints while respecting endpoint positions, zero endpoint velocity, joint/velocity/torque limits, workspace constraints, and collision avoidance. The objective improves the accumulated dynamic base regressor over the trajectory.

This design closes a loop that many system-identification scripts leave manual:

```text
URDF + measurement setup
        -> identifiable regressor
        -> optimal postures/motions
        -> robot data collection
        -> parameter estimation
        -> cross-validation and model update
```

## What the Paper Demonstrates

The paper evaluates the workflow across human, humanoid, mobile-manipulator, and serial-arm cases.

For a 43-DoF human model, motion capture and force-plate data are used for geometry and dynamics. Compared with anthropometric-table parameters, identified parameters reduce average external-wrench RMSE from **19.47 N to 16.84 N** for force and from **33.22 N·m to 16.77 N·m** for moment.

For TALOS and TIAGo torso-arm geometric calibration, end-effector position RMSE drops from **14.1 mm to 0.3 mm** on TALOS and from **16.9 mm to 1.5 mm** on TIAGo. TALOS whole-body calibration with three-point planar contact and 31 automatically generated OEP reduces RMSE from **10.4 mm to 3.3 mm**.

TIAGo dynamic identification includes drive-chain parameters and its differential wrist transmission; the identified model predicts measured motor current within **1%**. The toolbox also reproduces published Stäubli TX40 inertial identification results and obtains **1.76 mm** end-effector position RMSE for UR10 eye-in-hand calibration.

These examples show the toolbox's breadth. They are heterogeneous case studies with different sensors and metrics, so they do not form one standardized benchmark.

## Reading the Current `figaroh-plus` Code

The current source follows three practical layers.

### Workflow layer

`figaroh.calibration.BaseCalibration` orchestrates configuration loading, measurement validation, QR-based parameter selection, nonlinear optimization, iterative outlier removal, metrics, plots, reports, and verification. Robot-specific behavior can be provided through a subclass cost function. The implementation uses SE(3) log-map residuals for pose calibration and can apply separate weights to position and orientation channels.

`figaroh.identification.BaseIdentification` loads trajectory data, computes and reduces the dynamic regressor, performs filtering/decimation, solves for base parameters, reconstructs predictions, evaluates RMSE/correlation/condition number, and optionally applies physical-consistency or full-parameter reconstruction.

`BaseOptimalCalibration` and `BaseOptimalTrajectory` provide the optimization framework for posture selection and spline trajectory design. IPOPT support relies on `cyipopt`, which is intentionally omitted from the simple pip dependency set; the repository recommends its Conda environment for this path.

### Tools layer

The reusable tools include `RegressorBuilder`, `QRDecomposer`, `LinearSolver`, collision utilities, IPOPT wrappers, URDF export, visualization, result provenance, and report generation. The current library can emit self-contained HTML diagnostics, machine-readable pass/fail verification reports, and static comparisons between two runs.

This V&V layer is a meaningful extension beyond the paper. Calibration quality is more than a fitted RMSE: the code reports per-DoF residuals, held-out before/after validation, parameter uncertainty, strongly correlated parameters, and regressor conditioning. `verify()` converts configured thresholds into a CI-friendly verdict.

### Backend layer

The source currently contains real `PinocchioBackend` and `MuJoCoBackend` implementations. Pinocchio remains the default and provides the most complete URDF/regressor path. MuJoCo implements mass, bias, kinematics, and contact-related computations, but its analytical parameter regressor delegates to a lazily loaded Pinocchio model because MuJoCo does not expose the same runtime inertial-parameter regressor.

The architecture document also discusses Genesis and Isaac Sim backends, marked as future work. There are no `genesis.py` or `isaacsim.py` implementations in the checked v0.4.5 source tree, so users should currently treat backend support as **Pinocchio plus optional MuJoCo**.

## Paper Versus Current Repository

The scientific spine remains stable:

- URDF-based rigid multi-body modeling;
- geometric and dynamic regressors;
- numerical base-parameter extraction;
- least-squares or constrained estimation;
- OEP/OEM experiment design;
- statistical validation and model export.

The `plus` repository modernizes the engineering surface. It uses a `src/` package layout, abstract workflow classes, unified YAML parsing with legacy conversion, Python packaging on PyPI, broader regression solvers, optional physically consistent reconstruction, model-export validation, richer reports, and an explicit backend interface.

Several practical boundaries are visible in the code:

- The package has no registered command-line entry point; users work through Python classes and project scripts.
- Robot examples and some datasets are maintained in the separate examples repository.
- `BaseCalibration` is extensible by design and may require a task-specific subclass or cost function.
- Advanced OEP/OEM and SDP workflows bring native optimization dependencies that are more involved than `pip install figaroh`.
- Documentation describes a broader backend roadmap than the checked source currently implements.

This is a research toolbox that has accumulated production-oriented checks, not a black-box auto-calibration service. Users still need to define the measurement model, frame conventions, active parameters, excitation constraints, and validation protocol correctly.

## Strengths

FIGAROH's strongest quality is end-to-end consistency. The same robot model drives regressor construction, observability analysis, experiment design, estimation, collision checking, and final model update. This reduces the chance that each stage uses subtly different joint ordering, frames, or parameter conventions.

The second strength is support for tree-structured and floating-base systems. The workflow covers industrial manipulators, mobile manipulators, humanoids, and human biomechanical models. Optimal excitation is especially valuable for these systems because manually selected configurations become unsafe or uninformative as kinematic complexity grows.

The current code's validation tooling is also well chosen. A parameter fit should be judged on held-out measurements and physical plausibility, with uncertainty and conditioning made visible. HTML reports and machine-readable verdicts make that discipline easier to repeat.

## Limitations and Cautions

Identification quality remains bounded by the assumed model. Unmodeled flexibility, backlash, temperature-dependent friction, cable effects, timing errors, and sensor bias can leak into the estimated rigid-body parameters. Numerical differentiation of positions to obtain velocity and acceleration amplifies noise, making filtering and excitation design essential.

Geometric calibration starts from local linearization, while the nonlinear solve still depends on a reasonable initial model and correct frame conventions. Base parameters are identifiable combinations; recovering every URDF inertial term requires priors or physical constraints and may remain ambiguous.

The original paper leaves joint geometric-dynamic identification and nonlinear flexibility as future directions. The current repository improves physical reconstruction and calibration validation, but it still separates the primary calibration and identification workflows. Documentation and APIs are evolving quickly, and v0.4.5 is classified as beta software.

## Takeaway

FIGAROH is best understood as an **experiment-design and model-identification framework**, not simply a least-squares implementation. Its key chain is:

\[
\text{measurement contract}
\rightarrow
\text{regressor and observability}
\rightarrow
\text{optimal excitation}
\rightarrow
\text{parameter estimation}
\rightarrow
\text{held-out validation}
\rightarrow
\text{updated model}.
\]

The paper establishes that this chain can serve very different robots and humans. The current `figaroh-plus` code turns it into a cleaner library with stronger verification and export support. For serious calibration work, the value is precisely this integration: the toolbox helps decide what can be identified, which experiment will identify it, and whether the resulting model actually improved.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**FIGAROH** 是一个同时解决两类模型修正问题的 Python toolbox：**geometric calibration** 用来估计机器人运动学误差，**dynamic identification** 用来估计惯性、摩擦、执行器和传感器参数。它最有价值的系统设计是一条完整实验闭环：从 URDF 构建 identification model，判断哪些参数组合可观测，设计有信息量的姿态或运动，估计参数，验证结果，再更新机器人模型。

这篇笔记同时阅读原始论文和当前 [`figaroh-plus`](https://github.com/thanhndv212/figaroh-plus) 代码。两者需要分开理解。论文描述统一 scientific workflow，并在机器人和人体数据上验证；当前 v0.4.5 仓库已经发展为更模块化的 library，增加 robust calibration、更多 solvers、physical-consistency projection、URDF export、multi-backend interface 以及 reporting/verification tools。

## 论文信息

论文题目是 **"FIGAROH: a Python toolbox for dynamic identification and geometric calibration of robots and humans"**，作者为 **Dinh Vinh Thanh Nguyen, Vincent Bonnet, Maxime Sabbah, Maxime Gautier, Pierre Fernbach, and Florent Lamiraux**。用户提供的 PDF 是发表于 **2023 IEEE-RAS International Conference on Humanoid Robots** 的 HAL 版本，DOI 为 [`10.1109/Humanoids57100.2023.10375232`](https://doi.org/10.1109/Humanoids57100.2023.10375232)。虽然本地文件名是 `FIGAROH_IROS_2022-5.pdf`，论文实际来自 Humanoids 2023。

当前 GitHub 仓库是原 LAAS GitLab 项目的持续维护 fork，发布 `figaroh` Python package；可运行的机器人例程放在独立的 [`figaroh-examples`](https://github.com/thanhndv212/figaroh-examples) 仓库中。

## 一个工具箱里的两个问题

Geometric calibration 和 dynamic identification 修正模型的不同部分，但它们具有相近的数学形式和实验逻辑。

### Geometric calibration

URDF 为每个 joint 提供 nominal transform，真实装配会产生细小平移和旋转误差。FIGAROH 把 joint \(j\) 的局部变化写成

\[
\Phi_{g,j}
=
[\delta p_x,\delta p_y,\delta p_z,
\delta\phi_x,\delta\phi_y,\delta\phi_z]^T.
\]

Forward-kinematics residual 在 nominal model 附近线性化：

\[
\Delta P=R_g(q,p)\Phi_g,
\]

其中 \(R_g\) 是 geometric regressor 或 kinematic Jacobian，把 parameter error 映射到 measured pose error。Measurement 可以来自 full pose、position、orientation、camera、motion-capture markers，或者接触平面这样的 geometric constraints。

六参数表示不等于每个 joint 的六个参数都能被独立恢复。论文指出 revolute joint 最多有四个独立 identifiable geometric parameters，prismatic joint 最多两个；collinear axes 还会引入更多依赖。FIGAROH 通过 rank analysis 保留实际可观测的参数组合。

### Dynamic identification

Rigid-body inverse dynamics 对惯性参数和多种扩展机械参数是线性的：

\[
D=R_d(q,\dot q,\ddot q)\Phi_d.
\]

这里 \(D\) 是 measured torques、motor currents 或 external wrenches 的堆叠，\(R_d\) 是 dynamic regressor，\(\Phi_d\) 可以包含：

- 每个 body 的十个 inertial parameters：mass、first moment 和六个 inertia-tensor terms；
- joint viscous/Coulomb friction；
- torque-sensor offsets；
- actuator rotor inertia 和 drive-chain friction；
- current-to-torque 或 sensor gains。

可辨识参数集合由 available measurements 决定。Joint torques 可以识别 inertial 和 joint parameters；加入 motor current 后可以暴露 drive-chain terms；external wrench 对应另一组 identifiable subset。FIGAROH 根据 measurement contract 构造相应 regressor。

## Rank Deficiency 与 Base Parameters

Robot regressor 通常 rank deficient。某些物理参数在方程中始终组合出现，无论采集多少样本，数据都无法将它们拆开。FIGAROH 使用带 column pivoting 的数值 QR decomposition，把原 regressor 改写成 full-rank **base parameters**：

\[
Y=R\Phi=R_b\Phi_b,
\qquad
\operatorname{rank}(R_b)=\dim(\Phi_b).
\]

这是整个方法的核心步骤。Least-squares solver 可以给欠定参数化输出一组数值，但这些数值并没有得到 measurement 的唯一支持。Base-parameter reduction 让 estimation problem 保持诚实：solver 只估计当前实验真正能够观测的独立组合。

论文强调 numerical QR 的可解释性：它能显示哪些 original columns 被组合成一个 base parameter，也可以分别得到 static 和 dynamic base sets。例如 static data 中 velocity 和 acceleration terms 消失，只剩 mass 与 center-of-mass combinations。

## Parameter Estimation

Base regressor 变成 full rank 后，最简单的估计是 ordinary least squares：

\[
\hat\Phi_b
=
(R_b^TR_b)^{-1}R_b^TY.
\]

Weighted least squares 用来处理噪声水平或单位不同的 measurement channels。论文还包括 loaded/unloaded experiments 的 total least squares、nonlinear geometric calibration 的 iterative least squares 与 Levenberg-Marquardt，以及得到 physically plausible inertial parameters 的 constrained optimization。

当前代码保留 regressor/QR workflow，并扩展 solver support。`BaseIdentification.solve()` 运行标准 identification path；`solve_with_custom_solver()` 可以通过 `figaroh.tools.LinearSolver` 调用 least squares、QR/SVD 类方法、Ridge、Lasso、Elastic Net、robust regression 和 constrained variants。

Physical consistency 需要单独关注。Unconstrained fit 即使 torque error 很低，也可能产生 negative mass 或不可能的 inertia tensor。论文使用 quadratic constrained programming 恢复具有物理意义的 individual parameters。当前代码进一步提供可选的 pseudo-inertia SDP/LMI projection，以及从 base parameters 重建 full parameters 的功能，并可加入 CAD-derived mass、center-of-mass 和 symmetry constraints。这些路径需要 SDP solver，默认关闭。

## Optimal Experiment Design

FIGAROH 把 data collection 视作 identification 的一部分。Random postures 可能让 regressor 严重 ill-conditioned，random motions 也会浪费机器人时间，并给 humanoid 带来安全风险。因此工具箱为 calibration/static identification 设计 **Optimal Exciting Postures (OEP)**，为 dynamic identification 设计 **Optimal Exciting Motions (OEM)**。

论文使用 regressor singular values 构造多种 criterion，包括类似 determinant 的 information volume、condition number 和 minimum singular value。直观上，好实验会让 regressor columns 更容易区分：

\[
\text{good excitation}
\Longrightarrow
\sigma_{\min}(R)\text{ increases and }
\kappa(R)=\frac{\sigma_{\max}(R)}{\sigma_{\min}(R)}
\text{ decreases}.
\]

### 选择 calibration postures

每个 candidate posture 对应 information matrix \(\Sigma_i\) 和连续权重 \(\omega_i\)。FIGAROH 求解

\[
\max_{\omega}
\Psi\!\left(\sum_i\omega_i\Sigma_i\right),
\qquad
\sum_i\omega_i=1,
\]

再根据 weight 对 candidate 排序。随着姿态数量增加，excitation score 会达到峰值或 plateau，从而自动决定需要采集多少姿态。论文示例中的 criterion 在约 40 个 postures 达到峰值。

Posture optimization 同时考虑 joint limits、torque limits、workspace bounds 和 self-collision constraints。论文使用 Pinocchio/hpp-fcl geometry 和基于 IPOPT 的 nonlinear optimization。

### 生成 exciting motions

OEM generation 用 cubic splines 连接相邻 OEP。Optimizer 调整 spline waypoints，同时满足 endpoint positions、zero endpoint velocity、joint/velocity/torque limits、workspace constraints 和 collision avoidance。Objective 用来改善整段轨迹累计的 dynamic base regressor。

这套设计补上了许多 system-identification scripts 仍需手工完成的闭环：

```text
URDF + measurement setup
        -> identifiable regressor
        -> optimal postures/motions
        -> robot data collection
        -> parameter estimation
        -> cross-validation and model update
```

## 论文做了哪些验证？

论文在 human、humanoid、mobile manipulator 和 serial arm 上验证整个 workflow。

对于 43-DoF human model，系统使用 motion capture 和 force-plate data 完成 geometry/dynamics identification。相比 anthropometric-table parameters，identified parameters 把 external-wrench average RMSE 从 force **19.47 N 降到 16.84 N**，moment 从 **33.22 N·m 降到 16.77 N·m**。

对于 TALOS 和 TIAGo torso-arm geometric calibration，TALOS end-effector position RMSE 从 **14.1 mm 降到 0.3 mm**，TIAGo 从 **16.9 mm 降到 1.5 mm**。TALOS whole-body calibration 使用 three-point planar contact 和 31 个自动生成 OEP，把 RMSE 从 **10.4 mm 降到 3.3 mm**。

TIAGo dynamic identification 覆盖 drive-chain parameters 和 differential wrist transmission，identified model 预测 measured motor current 的误差约 **1%**。工具箱还复现了 Stäubli TX40 的公开 inertial identification 结果，并在 UR10 eye-in-hand calibration 中达到 **1.76 mm** end-effector position RMSE。

这些案例展示了 toolbox 的适用范围。它们使用不同 sensors 和 metrics，属于异构 case studies，不是一个统一 benchmark。

## 阅读当前 `figaroh-plus` 代码

当前源码分成三个实用层次。

### Workflow layer

`figaroh.calibration.BaseCalibration` 负责 configuration loading、measurement validation、QR-based parameter selection、nonlinear optimization、iterative outlier removal、metrics、plots、reports 和 verification。Robot-specific behavior 可以通过 subclass cost function 提供。实现使用 SE(3) log-map residuals 处理 pose calibration，并可对 position/orientation channels 施加不同权重。

`figaroh.identification.BaseIdentification` 负责加载 trajectory data、计算并约简 dynamic regressor、filtering/decimation、求解 base parameters、重建 prediction、评估 RMSE/correlation/condition number，并可选择 physical-consistency 或 full-parameter reconstruction。

`BaseOptimalCalibration` 和 `BaseOptimalTrajectory` 提供 posture selection 与 spline trajectory design 的 optimization framework。IPOPT support 依赖 `cyipopt`；它没有放进简单 pip dependency set，仓库建议这类任务使用 Conda environment。

### Tools layer

复用工具包括 `RegressorBuilder`、`QRDecomposer`、`LinearSolver`、collision utilities、IPOPT wrappers、URDF export、visualization、result provenance 和 report generation。当前 library 可以输出 self-contained HTML diagnostics、machine-readable pass/fail verification reports，以及两个运行结果的静态对比页面。

这套 V&V layer 是论文之后很有意义的扩展。Calibration quality 不应只看 fitted RMSE；代码还报告 per-DoF residuals、held-out before/after validation、parameter uncertainty、strongly correlated parameters 和 regressor conditioning。`verify()` 可以按照 configurable thresholds 输出适合 CI 使用的 verdict。

### Backend layer

当前源码实际包含 `PinocchioBackend` 和 `MuJoCoBackend`。Pinocchio 仍是默认后端，提供最完整的 URDF/regressor path。MuJoCo 实现 mass、bias、kinematics 和 contact-related computations，但 analytical parameter regressor 会委托给 lazy-loaded Pinocchio model，因为 MuJoCo 没有暴露同等形式的 runtime inertial-parameter regressor。

Architecture document 还讨论 Genesis 和 Isaac Sim backends，并标记为 future work。检查 v0.4.5 source tree 后，没有发现 `genesis.py` 或 `isaacsim.py` 实现，因此当前 backend support 应理解为 **Pinocchio + optional MuJoCo**。

## 论文与当前仓库的关系

Scientific spine 保持稳定：

- 基于 URDF 的 rigid multi-body modeling；
- geometric/dynamic regressors；
- numerical base-parameter extraction；
- least-squares 或 constrained estimation；
- OEP/OEM experiment design；
- statistical validation 和 model export。

`plus` 仓库主要现代化了 engineering surface：采用 `src/` package layout、abstract workflow classes、带 legacy conversion 的 unified YAML parsing、PyPI packaging、更广泛的 regression solvers、可选 physically consistent reconstruction、model-export validation、丰富 reports，以及显式 backend interface。

代码中也能看到若干实际边界：

- Package 没有注册 command-line entry point，用户通过 Python classes 和 project scripts 工作。
- Robot examples 和部分 datasets 位于独立 examples repository。
- `BaseCalibration` 面向扩展，实际项目可能需要 task-specific subclass 或 cost function。
- Advanced OEP/OEM 和 SDP workflow 需要更复杂的 native optimization dependencies。
- Documentation 描述的 backend roadmap 比当前源码实现更广。

这是一个增加了 production-oriented checks 的 research toolbox，不是 black-box auto-calibration service。用户仍然需要正确设置 measurement model、frame conventions、active parameters、excitation constraints 和 validation protocol。

## 优点

FIGAROH 最大的优点是 end-to-end consistency。同一个 robot model 贯穿 regressor construction、observability analysis、experiment design、estimation、collision checking 和最终 model update，降低不同阶段使用错误 joint ordering、frames 或 parameter conventions 的风险。

第二个优点是支持 tree-structured 和 floating-base systems。Workflow 覆盖 industrial manipulators、mobile manipulators、humanoids 和 human biomechanical models。随着 kinematic complexity 增长，手工选择 configurations 更容易不安全或缺少信息，因此 optimal excitation 对这些系统尤其有价值。

当前代码的 validation tooling 也很合理。Parameter fit 应该在 held-out measurements 上验证，同时检查 physical plausibility，并展示 uncertainty 与 conditioning。HTML reports 和 machine-readable verdicts 让这套流程更容易重复执行。

## 局限与注意事项

Identification quality 仍然受 assumed model 限制。Unmodeled flexibility、backlash、temperature-dependent friction、cable effects、timing errors 和 sensor bias 都可能泄漏进 estimated rigid-body parameters。通过 position 数值微分得到 velocity/acceleration 会放大噪声，因此 filtering 和 excitation design 非常关键。

Geometric calibration 从 local linearization 出发，nonlinear solve 仍依赖合理 initial model 和正确 frame conventions。Base parameters 是 identifiable combinations；恢复每个 URDF inertial term 需要 priors 或 physical constraints，而且仍可能存在歧义。

原论文把 joint geometric-dynamic identification 和 nonlinear flexibility 留作未来工作。当前仓库增强了 physical reconstruction 与 calibration validation，但主要 calibration/identification workflows 仍然分开。Documentation 和 APIs 还在快速演进，v0.4.5 的软件状态是 beta。

## 总结

FIGAROH 最适合被理解成 **experiment-design and model-identification framework**，它的价值不局限于 least-squares implementation。核心链路是：

\[
\text{measurement contract}
\rightarrow
\text{regressor and observability}
\rightarrow
\text{optimal excitation}
\rightarrow
\text{parameter estimation}
\rightarrow
\text{held-out validation}
\rightarrow
\text{updated model}.
\]

论文证明这条链路可以服务差异很大的 robots 和 humans；当前 `figaroh-plus` 代码把它整理成更清晰的 library，并增强 verification 与 export support。对于严肃的 calibration 工作，真正重要的正是这种整合：工具箱帮助用户判断什么能被识别、应该进行什么实验，以及最终模型是否真的改善。

</div>
