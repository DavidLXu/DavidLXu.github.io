---
title: "Inverse Kinematics for Any URDF: Tasks, Weights, and Solver Design"
date: 2026-03-09
permalink: /posts/2026/03/inverse-kinematics-for-any-urdf/
tags:
  - Robotics
  - Inverse Kinematics
  - URDF
  - Optimization
  - Pinocchio
  - Technical Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

For a robot described by any valid URDF, inverse kinematics should be approached as a weighted nonlinear least-squares problem built on top of forward kinematics and Jacobians. The critical design choices are not the exact link names in the model, but the task definition, the relative weights between translation and rotation, the damping and regularization terms that stabilize the solve, and the iterative update rule that keeps the solver well behaved in a real control loop.

## 1. Problem Formulation

Once a URDF has been parsed into a kinematic model, the IK problem is conceptually uniform across robots. A solver receives one or more target poses, evaluates the current pose of the corresponding frames, computes task-space errors, and finds a joint update that reduces those errors. The code below shows the essential pattern: a frame pose is extracted from the current configuration, a relative pose error is computed in SE(3), and a frame Jacobian maps joint-space motion to task-space motion.

```python
def _pose_task(self, q: np.ndarray, frame_id: int, target: pin.SE3):
    pin.forwardKinematics(self.model, self.data, q)
    pin.updateFramePlacements(self.model, self.data)
    current = self.data.oMf[frame_id]
    err = pin.log(current.actInv(target)).vector
    J = pin.computeFrameJacobian(
        self.model, self.data, q, frame_id, pin.ReferenceFrame.LOCAL
    )
    return J, err
```

This abstraction is the reason a single solver architecture can be reused across many URDFs. The specific frame identifiers may differ from one robot to another, but the mathematical structure is unchanged: define a target frame, compute its local pose error, compute its Jacobian, and reduce that error iteratively.

## 2. Task Stacking Is the Core Design Choice

A practical IK system rarely solves only one task. The more general formulation is to stack several tasks with different priorities into a single optimization problem. In the provided script, two end-effector pose targets are treated as the main objectives, while two intermediate-link targets act as weaker shaping terms. That is more informative than a robot-specific implementation detail because it reveals how to structure IK for arbitrary models: isolate the behavior that must be satisfied, then add softer tasks that improve posture, coordination, or motion quality without dominating the main objective.

The implementation makes this explicit by computing one Jacobian and one error vector per task, then assembling them into one large system. The relevant code is short:

```python
J_lm, e_lm = self._pose_task(q, self.main_frames["left"], left_main)
J_rm, e_rm = self._pose_task(q, self.main_frames["right"], right_main)
J_ls, e_ls = self._pose_task(q, self.secondary_frames["left"], left_secondary)
J_rs, e_rs = self._pose_task(q, self.secondary_frames["right"], right_secondary)

J_stack = np.vstack([J_lm, J_rm, J_ls, J_rs])
e_stack = np.hstack([e_lm, e_rm, e_ls, e_rs])
```

This stacked form is more important than the dual-arm setting itself. For any URDF, the right question is not “what is the exact link name,” but “which frame errors belong in the objective, and how strongly should each one influence the update.” This becomes especially important when the robot has more than six degrees of freedom in an arm chain. A 7-DOF arm can satisfy the same end-effector pose with infinitely many joint configurations along its null space, so a single pose target is often not enough to determine the motion you actually want. In practice, a secondary target is often used to guide that redundancy toward a meaningful posture, such as keeping an elbow lifted, preventing it from collapsing inward, or shaping the arm into a natural configuration.

## 3. Weights Define the Semantics of the Solve

Once multiple tasks are present, the solver needs a way to express their relative importance. Weights are the mechanism that encode this. In the shared code, position and orientation are weighted separately, and primary tasks are assigned much larger values than secondary ones. That design is not cosmetic tuning; it tells the optimizer what counts as success.

```python
@dataclass
class IKSolverWeights:
    main_pos: float = 100.0
    main_rot: float = 100.0
    secondary_pos: float = 5
    secondary_rot: float = 0.5
    damping: float = 1e-3
    q_reg: float = 1e-4
```

The weighting is then applied directly to both the Jacobian rows and the corresponding error terms:

```python
@staticmethod
def _apply_pose_weights(J, err, w_pos, w_rot):
    w = np.array([w_pos, w_pos, w_pos, w_rot, w_rot, w_rot], dtype=float)
    return w[:, None] * J, w * err
```

This separation between translational and rotational weights is particularly important in practice. Pose errors live in mixed units and mixed semantics. A one-centimeter position error and a small angular error are not directly comparable, either numerically or behaviorally. A technically sound IK formulation should therefore avoid treating all six components as if they were interchangeable. The weights should reflect application intent: end-effector position may dominate orientation in one task, while tool orientation may be the primary objective in another.

## 4. Damping and Regularization Make the Optimization Usable

An undamped least-squares solve is often too fragile for real robots, especially near singular configurations or when tasks compete. The script stabilizes the normal equations with two additional terms: a damping term that improves numerical conditioning and a joint regularization term that biases the solution toward a reference posture. The resulting system is still simple, but much more robust:

```python
H = J_stack.T @ J_stack
H += self.weights.damping * np.eye(self.model.nv)
H += self.weights.q_reg * np.eye(self.model.nv)
g = J_stack.T @ e_stack - self.weights.q_reg * (q - self.q_ref)

dq = np.linalg.solve(H, g)
```

From an optimization perspective, this is the part that turns a clean derivation into a practical solver. Damping suppresses pathological updates when the Jacobian becomes poorly conditioned. Joint regularization prevents unnecessary drift in redundant systems and helps the solver stay near a reasonable posture when many joint configurations produce similar task-space behavior. For URDF-agnostic IK, these terms are essential because a general-purpose solver cannot assume that every robot will have convenient geometry or well-separated tasks.

## 5. Iterative Integration Matters More Than Closed-Form Ambition

The update rule is equally important. After solving for a joint increment, the script does not jump directly to a final answer; it integrates a scaled update and repeats for a bounded number of iterations. This is exactly the right design for online IK:

```python
q = pin.integrate(self.model, q, step_scale * dq)
q = np.clip(q, self.lower, self.upper)

if np.linalg.norm(e_stack) < 1e-4:
    break
```

The step scale controls solver aggressiveness. If the update is too large, the linearization is trusted too far away from the current state and the iteration may oscillate or overshoot. If it is too small, convergence becomes slow. The bounded iterative loop is therefore not an implementation detail but a core part of the method. In a real control pipeline, the current solution serves as the warm start for the next cycle, and solver quality depends heavily on whether each incremental step is stable and predictable.

## 6. Joint Limits Must Be Treated as Part of the Solver

URDF-based IK is not complete if it ignores joint bounds. The script clips the configuration after every integrated update, which is a simple but effective safeguard. More elaborate constrained formulations are possible, but the conceptual point is the same: an invalid configuration is not an acceptable intermediate state just because the task-space residual is small.

This is also why solver evaluation should not focus only on end-effector accuracy. A numerically small residual is not enough if the solution lives on the edge of a singularity, runs into limits continuously, or requires large oscillatory corrections from one iteration to the next. For a reusable IK architecture, robustness criteria must include feasibility and numerical behavior, not only task error.

The same argument applies to redundancy resolution. For a 7-DOF arm, feasibility is not only about reaching the end-effector pose, but also about selecting one posture out of infinitely many possibilities in the null space. In bimanual systems, this matters even more because mirror-symmetric pose targets can still produce visually awkward or mechanically undesirable elbow placements. A secondary objective on an intermediate frame is therefore not just a refinement; it is often the mechanism that makes the final motion look deliberate and physically natural.

## 7. What General IK for Arbitrary URDFs Should Look Like

A technically sound IK pipeline for arbitrary URDFs should therefore be organized around a consistent sequence. It should parse the robot model, choose the task frames, represent targets in SE(3), compute frame-level pose errors and Jacobians, scale those errors according to task semantics, solve a damped and regularized least-squares system, integrate a conservative joint update, enforce limits, and iterate until the residual is small or the iteration budget is exhausted. The underlying idea is generic even when the robot is not.

The main lesson from the code is not tied to this particular dual-arm example. The transferable insight is that inverse kinematics becomes general once it is phrased in terms of task construction and solver design rather than robot-specific casework. If the task stack is well chosen, the weights reflect the intended behavior, and the numerical update is stabilized properly, the same architecture can be adapted to a large range of URDF-defined robots with minimal conceptual change.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在中英文之间切换。

## TL;DR

只要机器人能够由一份合法的 URDF 建模，逆运动学的关键就不在于模型文件里某个连杆或关节叫什么，而在于你如何围绕这个模型构造求解问题。真正决定效果的，是任务项怎么定义、平移和旋转如何分配权重、阻尼与正则化是否足够稳健，以及每一轮迭代的更新步幅是否合适。从工程角度看，逆运动学首先是一个数值优化器，其次才是一个“对着某台机器人写特例”的程序。

## 1. 从任务误差和雅可比开始理解问题

对于任意 URDF，逆运动学都可以归结为同一类过程：先给定一个或多个目标位姿，再根据当前关节构型算出对应坐标系的实际位姿，然后在任务空间中定义误差，并利用雅可比把“关节怎么变”映射成“误差会怎么变”。这段代码正好体现了这种最基本的结构：

```python
def _pose_task(self, q: np.ndarray, frame_id: int, target: pin.SE3):
    pin.forwardKinematics(self.model, self.data, q)
    pin.updateFramePlacements(self.model, self.data)
    current = self.data.oMf[frame_id]
    err = pin.log(current.actInv(target)).vector
    J = pin.computeFrameJacobian(
        self.model, self.data, q, frame_id, pin.ReferenceFrame.LOCAL
    )
    return J, err
```

这里最值得注意的不是具体框架编号，而是求解器的抽象方式。无论机器人是单臂、双臂还是人形，只要能够从当前构型得到某个坐标系的位姿，并为这个坐标系计算误差和雅可比，后面的逆运动学求解框架就可以保持一致。URDF 决定了模型结构，求解器决定了你如何利用这些结构。

## 2. 通用 IK 的核心不是单个目标，而是任务堆叠

实际系统里，很少只存在一个孤立的末端目标。更常见的情况是，一部分目标决定系统是否完成主要动作，另一部分目标则用于塑造姿态、限制中间连杆的位置，或者让整体运动更协调。你给出的脚本正是这种做法：两个主要目标负责末端六维位姿跟踪，两个较弱的辅助目标负责补充约束和改善形态。其意义不在于“这是一个双臂例子”，而在于它清楚地展示了任意 URDF 上更通用的逆运动学组织方式。

代码里，这些任务是分别计算误差和雅可比之后，再统一堆叠进一个大系统里的：

```python
J_lm, e_lm = self._pose_task(q, self.main_frames["left"], left_main)
J_rm, e_rm = self._pose_task(q, self.main_frames["right"], right_main)
J_ls, e_ls = self._pose_task(q, self.secondary_frames["left"], left_secondary)
J_rs, e_rs = self._pose_task(q, self.secondary_frames["right"], right_secondary)

J_stack = np.vstack([J_lm, J_rm, J_ls, J_rs])
e_stack = np.hstack([e_lm, e_rm, e_ls, e_rs])
```

因此，通用逆运动学里最先要问的问题并不是“URDF 里哪个 link 最重要”，而是“哪些误差项必须被优先压低，哪些误差项只是用于塑形，可以在必要时做出让步”。这一步决定了后面整个求解器的行为边界。这个问题在自由度大于六的机械臂上会更加明显。以七自由度机械臂为例，单靠末端六维位姿通常不足以唯一确定关节解，因为系统天然存在冗余，自然也就存在一整族落在零空间中的可行姿态。如果没有额外约束，求解器虽然能把末端送到目标点，但肘部朝向、整条手臂的展开方式以及姿态观感都可能不符合预期。

## 3. 权重是求解器对任务优先级的显式编码

一旦进入多任务求解，权重就不再是简单的调参项，而是系统意图的直接表达。脚本中主任务与辅助任务的权重相差很大，同时平移与旋转也被分开处理：

```python
@dataclass
class IKSolverWeights:
    main_pos: float = 100.0
    main_rot: float = 100.0
    secondary_pos: float = 5
    secondary_rot: float = 0.5
    damping: float = 1e-3
    q_reg: float = 1e-4
```

这些权重随后被作用到雅可比和误差向量上：

```python
@staticmethod
def _apply_pose_weights(J, err, w_pos, w_rot):
    w = np.array([w_pos, w_pos, w_pos, w_rot, w_rot, w_rot], dtype=float)
    return w[:, None] * J, w * err
```

这里的关键思想是，位姿误差并不是一个可以机械对待的六维量。位置误差和姿态误差在数值尺度上不同，在任务语义上也不同，所以通常不应共享同一组权重。对于很多系统来说，末端位置必须严格逼近，而姿态可以稍微宽松；也有一些工具操作任务正好相反。一个成熟的逆运动学实现，应该让权重体现任务语义，而不是让所有误差分量被一视同仁地处理。

## 4. 阻尼和正则化决定这个优化器是否稳定

如果只保留最朴素的最小二乘项，求解器在接近奇异位形、任务冲突明显或模型冗余较高时，往往会出现数值不稳定。脚本通过在法方程中加入阻尼项和关节正则项来缓解这些问题：

```python
H = J_stack.T @ J_stack
H += self.weights.damping * np.eye(self.model.nv)
H += self.weights.q_reg * np.eye(self.model.nv)
g = J_stack.T @ e_stack - self.weights.q_reg * (q - self.q_ref)

dq = np.linalg.solve(H, g)
```

从优化角度看，阻尼的作用是改善条件数，避免雅可比退化时某些方向上的更新量突然失控；关节正则化则是在冗余自由度较多时，把解轻轻拉回参考姿态附近，减少无意义的漂移。这两项看起来只是几个额外系数，但对通用求解器来说几乎是不可缺少的，因为你无法预先假设每一份 URDF 都会给出一个数值性质良好的系统。

## 5. 真正的求解质量体现在迭代更新规则里

很多逆运动学实现的问题并不出在目标函数，而是出在更新方式过于激进。即使线性系统求出来的 `dq` 方向是合理的，也不意味着应该一次性把它全部施加到关节上。脚本采用的是缩放后再积分，并在每轮之后检查收敛条件：

```python
q = pin.integrate(self.model, q, step_scale * dq)
q = np.clip(q, self.lower, self.upper)

if np.linalg.norm(e_stack) < 1e-4:
    break
```

这里的 `step_scale` 本质上控制了求解器的攻击性。步子太大，线性化近似会被使用到超出适用范围的区域，导致振荡或过冲；步子太小，又会让收敛过慢。对在线控制系统而言，更稳妥的做法往往是每个周期只走一小步，让当前解成为下一周期的初值。这样构造出来的求解器，虽然没有追求一次性“解到底”的形式美感，但在实时系统里通常更可靠。

## 6. 关节限位必须属于求解器本体的一部分

URDF 已经明确给出了关节上下界，因此逆运动学求解不能把限位当成事后修补。脚本的做法是每次积分后立即裁剪到合法区间，这是一种直接但有效的保护。更复杂的系统当然可以使用带约束的优化形式，但无论采用哪种实现，核心原则都一样：越界构型不应被视为有效中间结果，更不能被当成求解成功。

这也意味着评价一个通用逆运动学求解器时，不能只盯着末端误差是否足够小。如果一个解总是在限位附近抖动、频繁落入病态区域，或者每轮都依赖很大的修正量才能维持任务，那么即使目标残差不大，它也称不上是一个工程上可靠的解。

同样的道理也适用于冗余自由度的处理。对于七自由度机械臂来说，“能到达末端目标”只说明主任务被满足了，并不意味着求解已经完整，因为零空间里通常还存在无限多个姿态选择。尤其是在双臂系统中，这个问题更不能忽视。即使左右末端的目标位姿都已经满足，肘部仍然可能朝向不自然的方向，甚至互相干扰。因此，给肘部附近的中间连杆增加一个较弱的辅助目标，在很多场景下不是锦上添花，而是让整套动作看起来合理、协调、符合人类直觉的必要条件。

## 7. 面向任意 URDF 的 IK 应该具备什么结构

从技术结构上看，一个可复用的通用逆运动学求解器应该遵循同一条主线：读入 URDF 并建立运动学模型，选定若干任务坐标系，把目标统一表示为 SE(3) 位姿，计算每个任务的误差和雅可比，根据任务语义施加权重，构造带阻尼和正则化的最小二乘系统，求出保守的关节更新量，执行积分并处理限位，然后在有限迭代内持续收敛。真正具有可迁移性的，并不是某个机器人上的特殊技巧，而是这套由任务定义、权重设计和数值稳定策略组成的框架。

因此，从你给出的代码里最值得提炼的结论并不是“双臂如何写”，而是“任意 URDF 的逆运动学都应该如何组织”。只要任务选得合理、权重反映实际需求、阻尼与正则化足够稳健、迭代步长控制得当，同一套求解思想就可以迁移到大量不同的机器人系统上，而不必为每个新模型重新发明一套求解器。

</div>
