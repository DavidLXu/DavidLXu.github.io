---
title: "[Paper Notes] Morphologically Symmetric Reinforcement Learning for Ambidextrous Bimanual Manipulation"
date: 2026-05-12
permalink: /posts/2026/05/symdex-paper-notes/
tags:
  - Robotics
  - Reinforcement Learning
  - Bimanual Manipulation
  - Equivariance
  - Sim-to-Real
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**SYMDEX** asks a clean question: if a bimanual robot is physically symmetric, why should one arm have to relearn what the other arm already discovered? The paper turns bilateral morphology into an RL prior for ambidextrous manipulation. It decomposes a complex bimanual task into per-hand subtasks, trains each subtask policy with a symmetry-equivariant actor and symmetry-invariant critic, then distills those specialist policies into a global ambidextrous policy.

The key design is not merely data augmentation. SYMDEX encodes the robot's reflection group directly into the policy class:

\\[
g \triangleright_A \pi(o) = \pi(g \triangleright_O o)
\\]

In practice, this means a reflected scene should produce a correspondingly reflected action. On six Isaac Lab bimanual dexterous tasks, SYMDEX reaches more than 80% success and outperforms PPO baselines. The authors also report zero-shot real-world transfer on box-lift and table-clean, with curriculum learning playing a major role.

## Paper Info

- **Title**: Morphologically Symmetric Reinforcement Learning for Ambidextrous Bimanual Manipulation
- **Authors**: Zechu Li, Yufeng Jin, Daniel Ordonez Apraez, Claudio Semini, Puze Liu, Georgia Chalvatzaki
- **Venue**: CoRL 2025
- **arXiv**: [2505.05287](https://arxiv.org/abs/2505.05287)
- **Project page**: [supersglzc.github.io/projects/symdex](https://supersglzc.github.io/projects/symdex/)
- **Codebase read here**: PyTorch / Isaac Lab implementation of SYMDEX with ESCNN and MorphoSymm

## 1. Motivation

Humans can mirror many gross manipulation skills between left and right hands, but fine dexterity often develops a dominant side. Robots do not need this kind of handedness. If the hardware is bilaterally symmetric, a robot should be able to choose whichever arm is better placed for the current scene.

The problem is that bimanual RL is hard in exactly the places where this symmetry would help:

- the observation and action spaces are high-dimensional,
- both arms contribute to one task-level outcome,
- reward shaping becomes messy when one arm succeeds and the other fails,
- ambidexterity turns a fixed two-arm controller into a task-assignment problem.

SYMDEX addresses this by making the learning problem smaller and more structured: learn one policy per subtask, enforce morphology-aware equivariance, then distill the behavior into a single deployable policy.

## 2. Method

The paper formulates bimanual manipulation as a multi-task, multi-agent POMDP. Each robot arm is an agent, and each manipulation role is a subtask. In the running example, one arm holds a bowl while the other operates an egg beater. Under a left-right reflection, the roles should swap.

For a symmetry group \\(G\\), the paper assumes the POMDP dynamics, rewards, and initial-state distribution are invariant under group actions. This gives the usual policy equivariance and value invariance conditions:

\\[
g \triangleright_A \pi^*(\sigma(s)) = \pi^*(\sigma(g \triangleright_S s))
\\]

\\[
V^*(\sigma(s)) = V^*(\sigma(g \triangleright_S s))
\\]

SYMDEX uses this structure in three steps.

### Subtask Decomposition

Instead of training one monolithic 44-DoF bimanual policy, SYMDEX trains 22-DoF single-arm policies. Each policy sees the assigned arm state and task-specific object state. This reduces action dimensionality and gives each policy a cleaner reward signal.

### Equivariant PPO

Each subtask actor is a \\(G\\)-equivariant neural network, while each critic is \\(G\\)-invariant. The actor should transform actions consistently when observations are reflected; the critic should assign the same value to symmetric states.

The intuition is simple: a left hand reaching in a mirrored workspace should behave like a transformed version of the right hand reaching in the original workspace.

### Global Policy Distillation

After the subtask policies are trained, they generate a dataset of state-action pairs. A student policy is then trained to imitate the combined behavior. This student is also equivariant, but unlike the subtask policies, it observes the global non-privileged state and learns the task-arm assignment implicitly.

This is the deployable policy: one global ambidextrous controller, trained from specialist teachers.

## 3. Curriculum for Sim-to-Real

The paper uses a curriculum with two practical pieces:

- **Randomization curriculum**: begin with scene-level symmetry randomization, then gradually introduce object pose and physical-parameter variation.
- **Safety curriculum**: introduce collision and energy penalties later, after the policy has learned useful task behavior.

This matters. In real-world evaluation, an equivariant Gaussian policy without curriculum drops sharply, while the curriculum-trained version transfers much better.

## 4. Experiments

SYMDEX is evaluated on six simulated Isaac Lab tasks:

| Task | Main challenge |
|---|---|
| Box-lift | coordinated symmetric lifting |
| Table-clean | two-arm sweeping / object handling |
| Drawer-insert | asymmetric object and drawer roles |
| Threading | coordinated precise insertion |
| Bowl-stir | one arm stabilizes, the other manipulates |
| Handover | role-specific grasp and transfer |

The paper compares against five PPO-style baselines: monolithic equivariant PPO, independent PPO, equivariant independent PPO, a centralized-critic variant, and a symmetry-augmentation variant.

The headline simulation result is that SYMDEX learns all six tasks and exceeds 80% success, while the baselines fail especially when the two arms must perform different roles. This supports two claims at once: task decomposition helps credit assignment, and architectural equivariance is stronger than only augmenting data.

For distillation, the paper compares:

| Student | Box | Table | Drawer | Threading | Bowl | Handover |
|---|---:|---:|---:|---:|---:|---:|
| Gaussian policy | 0.83 | 0.74 | 0.69 | 0.62 | 0.75 | 0.54 |
| Equivariant Gaussian policy | 0.89 | 0.83 | 0.87 | 0.63 | 0.87 | 0.86 |
| Equivariant Diffusion policy | 0.91 | 0.84 | 0.87 | 0.60 | 0.88 | 0.68 |

Both equivariant students improve over the vanilla Gaussian student. Interestingly, the Gaussian equivariant student is more robust than the diffusion variant in the real world, which the authors attribute to the homogeneous teacher-generated dataset and imperfect state estimation at deployment time.

## 5. Codebase Reading

The repository is a compact Isaac Lab project. The public entry points are straightforward:

```text
train.py       # train SYMDEX with Hydra configs and W&B logging
visualize.py   # load saved actors and execute policies in simulation
random_actions.py
symdex/cfg/
symdex/env/tasks/
symdex/algo/
symdex/utils/
```

The README exposes six tasks:

```text
insertDrawer, boxLift, pickObject, stirBowl, threading, handover
```

The default training command is:

```bash
python train.py task=insertDrawer save_model=True
```

The most important implementation pieces are:

### Symmetry Configuration

`symdex/cfg/task/base.yaml` defines the reflection group:

```yaml
group_label: C2
symmetric_envs: True
permutation_Q_js: ...
reflection_Q_js: ...
permutation_student_Q_js: ...
reflection_student_Q_js: ...
```

For the single-arm policy, the joint representation keeps the 22-DoF order and applies joint-specific sign flips. For the student/global policy, `permutation_student_Q_js` swaps the two 22-DoF halves, while `reflection_student_Q_js` applies the corresponding signs.

### Equivariant Networks

`symdex/utils/symmetry.py` builds the ESCNN group and registers representations for joint space, tangent joint space, Euclidean vectors, pseudo-vectors, and flattened rotations. `symdex/algo/network/emlp.py` then uses those field types to build equivariant MLPs.

The implementation is particularly nice because it handles both actor and critic cases:

- if the output representation is non-trivial, the EMLP is equivariant;
- if the output is trivial, the EMLP pools invariant features and behaves as an invariant function.

That matches the paper's actor/critic split almost directly.

### PPO Agent

`symdex/algo/eqs.py` defines `AgentSYMDEX`. It creates two actor-critic pairs:

```text
actor, critic
actor_left, critic_left
```

When `same_policy` is enabled, these can share parameters. Otherwise they are optimized separately, which mirrors the paper's dedicated subtask-policy setup.

During rollout, the agent:

1. reads the environment's `symmetry_tracker`,
2. slices each subtask observation through `SymmetryManager.get_multi_agent_obs`,
3. samples actions from the two actors,
4. combines or swaps actions through `get_execute_action`,
5. splits detailed rewards back into subtask rewards through `get_multi_agent_rew`,
6. runs PPO updates for the right and left buffers.

This is the code-level version of the paper's MTMA-POMDP decomposition.

### Symmetric Environments

Task YAML files such as `insertDrawer.yaml`, `stirBowl.yaml`, `threading.yaml`, and `handover.yaml` define both original and `_symmetry` reward terms, plus `single_agent_obs_idx_symmetry` and `single_agent_rew_symmetry`. The environment can therefore train on original and reflected configurations while giving each subtask policy the right observation and reward slice.

## 6. Strengths

The best part of SYMDEX is that it treats symmetry as a control prior, not as a dataset trick. The robot's morphology constrains the policy class, so symmetric configurations are tied together by construction. This is exactly the kind of inductive bias that can make RL less wasteful.

The task decomposition is also practical. A single global policy must solve exploration, credit assignment, role specialization, and symmetry at the same time. SYMDEX separates those concerns: train specialists first, then distill.

Finally, the four-arm extension is conceptually important. The symmetry group changes from bilateral reflection \\(C_2\\) to a rotational group \\(C_4\\), but the learning recipe remains the same. That suggests the framework is more general than a hand-coded left-right swap.

## 7. Limitations

The method depends on real symmetry. If the hardware, sensors, task roles, or object affordances are not actually symmetric, the inductive bias can become a constraint in the wrong direction.

The paper also works mostly with state-based policies. In real-world failures, perception is a major bottleneck because the controller depends on accurate multi-object pose tracking. The authors mention RGB-D and point-cloud equivariant models as future directions, and that feels like the right next step.

There is also a pipeline cost: subtask decomposition, reward design, symmetry-field configuration, and distillation are all extra engineering. SYMDEX pays that cost to make difficult bimanual RL tractable, but it is not a plug-and-play method for arbitrary manipulation tasks.

## 8. Takeaways

SYMDEX is a strong example of morphology-aware learning: instead of asking a network to rediscover left-right structure from rollouts, encode that structure in the policy and value function.

For practice, I would reach for this recipe when:

- the robot has clear morphological symmetry,
- the task can be decomposed into meaningful arm-level subtasks,
- mirrored initial states should imply mirrored optimal actions,
- exploration and reward assignment are the main bottlenecks,
- sim-to-real robustness matters enough to justify a curriculum.

I would be more cautious when the task has hidden asymmetry in tooling, object affordances, perception, or safety constraints. In those cases, symmetry may still help, but it probably needs selective application rather than a blanket architectural prior.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**SYMDEX** 问了一个很朴素但重要的问题：如果双臂机器人在形态上是对称的，为什么一只手学到的经验不能自然迁移给另一只手？这篇论文把双侧形态对称性变成了一个强化学习先验，用来学习真正的 ambidextrous manipulation。方法先把复杂双臂任务分解成每只手对应的子任务，为每个子任务训练带有对称等变 actor 和对称不变 critic 的策略，再把这些专家策略蒸馏成一个全局的双手通用策略。

关键点不是简单的数据增强，而是把机器人的反射群直接编码进策略函数类：

\\[
g \triangleright_A \pi(o) = \pi(g \triangleright_O o)
\\]

也就是说，一个被镜像的场景应该产生相应被镜像的动作。在六个 Isaac Lab 双臂灵巧操作任务中，SYMDEX 都达到 80% 以上成功率，并显著超过 PPO 基线。论文还展示了在 box-lift 和 table-clean 两个任务上的 zero-shot sim-to-real 部署，其中 curriculum learning 起到了非常关键的作用。

## 论文信息

- **标题**：Morphologically Symmetric Reinforcement Learning for Ambidextrous Bimanual Manipulation
- **作者**：Zechu Li, Yufeng Jin, Daniel Ordonez Apraez, Claudio Semini, Puze Liu, Georgia Chalvatzaki
- **会议**：CoRL 2025
- **arXiv**：[2505.05287](https://arxiv.org/abs/2505.05287)
- **项目主页**：[supersglzc.github.io/projects/symdex](https://supersglzc.github.io/projects/symdex/)
- **本文阅读的代码**：基于 PyTorch / Isaac Lab / ESCNN / MorphoSymm 的 SYMDEX 实现

## 1. 研究动机

人类可以把很多粗粒度操作技能在左右手之间镜像迁移，但精细动作往往会形成优势手。机器人没有必要继承这种 handedness。如果硬件本身是双侧对称的，那么机器人应该根据当前场景选择更合适的手，而不是固定偏好左手或右手。

问题在于，双臂 RL 难点恰好集中在这些地方：

- 观测和动作维度很高；
- 两只手共同决定一个任务结果；
- 一只手成功、另一只手失败时，reward credit assignment 很困难；
- ambidexterity 会把固定双臂控制问题变成角色分配问题。

SYMDEX 的解法是把学习问题变小、变结构化：先学习每个子任务的策略，并强制它们满足形态对称下的等变性；然后再把这些策略蒸馏成一个全局策略。

## 2. 方法

论文把双臂操作形式化为 multi-task multi-agent POMDP。每只机械臂是一个 agent，每个操作角色是一个 subtask。例如在 bowl-stir 中，一只手固定碗，另一只手操作打蛋器；当场景左右镜像后，两只手的角色应该交换。

对称群 \\(G\\) 作用在状态、观测和动作空间上。如果 POMDP 的 dynamics、reward 和初始状态分布在群作用下保持不变，那么最优策略和值函数会满足：

\\[
g \triangleright_A \pi^*(\sigma(s)) = \pi^*(\sigma(g \triangleright_S s))
\\]

\\[
V^*(\sigma(s)) = V^*(\sigma(g \triangleright_S s))
\\]

SYMDEX 分三步利用这个结构。

### 子任务分解

它没有直接训练一个 44-DoF 的整体双臂策略，而是训练 22-DoF 的单臂策略。每个策略只看到对应手臂状态和任务相关的物体状态。这样既降低动作维度，也让每个策略对应的 reward 更清晰。

### 等变 PPO

每个子任务 actor 是 \\(G\\)-equivariant neural network，每个 critic 是 \\(G\\)-invariant neural network。Actor 的输出需要随着输入的镜像而一致变换；critic 对对称状态应该给出相同价值。

直观地说：左手在镜像场景中的动作，应该等价于右手在原场景动作经过对称变换后的结果。

### 全局策略蒸馏

子任务策略训练完成后，它们生成 state-action 数据集。然后训练一个 student policy 来模仿组合后的行为。这个 student policy 也是等变的，但它观察的是全局 non-privileged state，并且隐式学习 task-arm assignment。

最终部署的是这个全局策略：一个由专家策略蒸馏出来的 ambidextrous controller。

## 3. Sim-to-Real Curriculum

论文使用了两个 curriculum 组件：

- **随机化 curriculum**：先从 scene-level symmetry randomization 开始，再逐步引入物体位姿和物理参数变化；
- **安全 curriculum**：碰撞和能量惩罚在后期再加入，避免一开始就让探索过于保守。

这个设计很关键。真实实验中，不使用 curriculum 的 equivariant Gaussian policy 性能明显下降，而使用 curriculum 的版本迁移效果好得多。

## 4. 实验结果

SYMDEX 在六个 Isaac Lab 仿真任务上评估：

| 任务 | 主要挑战 |
|---|---|
| Box-lift | 双臂协同抬升 |
| Table-clean | 双臂清理 / 物体处理 |
| Drawer-insert | 物体和抽屉的非对称角色 |
| Threading | 精密协同插入 |
| Bowl-stir | 一只手稳定，另一只手操作 |
| Handover | 角色特定的抓取和交接 |

论文比较了五个 PPO 风格基线：整体 equivariant PPO、independent PPO、equivariant independent PPO、centralized critic 变体，以及 symmetry data augmentation 变体。

核心结果是：SYMDEX 在六个任务上都能学到超过 80% 的成功率；基线方法尤其在两只手需要执行不同角色时容易失败。这同时说明了两点：任务分解能缓解 credit assignment，而架构层面的等变性比单纯的数据增强更强。

蒸馏实验中，论文比较了三种 student：

| Student | Box | Table | Drawer | Threading | Bowl | Handover |
|---|---:|---:|---:|---:|---:|---:|
| Gaussian policy | 0.83 | 0.74 | 0.69 | 0.62 | 0.75 | 0.54 |
| Equivariant Gaussian policy | 0.89 | 0.83 | 0.87 | 0.63 | 0.87 | 0.86 |
| Equivariant Diffusion policy | 0.91 | 0.84 | 0.87 | 0.60 | 0.88 | 0.68 |

两个 equivariant student 都优于普通 Gaussian student。一个有意思的点是：虽然 equivariant diffusion policy 在仿真蒸馏上略强，但真实世界中 Gaussian equivariant student 更鲁棒。作者认为原因是 teacher 生成的数据比较同质，而真实部署时状态估计存在噪声，diffusion policy 对分布外观测更敏感。

## 5. 代码阅读

这个仓库是一个比较紧凑的 Isaac Lab 项目，入口清晰：

```text
train.py       # Hydra 配置 + W&B 日志的训练入口
visualize.py   # 加载 actor 并在仿真中执行
random_actions.py
symdex/cfg/
symdex/env/tasks/
symdex/algo/
symdex/utils/
```

README 中暴露的任务包括：

```text
insertDrawer, boxLift, pickObject, stirBowl, threading, handover
```

默认训练命令是：

```bash
python train.py task=insertDrawer save_model=True
```

几个最关键的实现点如下。

### 对称性配置

`symdex/cfg/task/base.yaml` 定义了反射群：

```yaml
group_label: C2
symmetric_envs: True
permutation_Q_js: ...
reflection_Q_js: ...
permutation_student_Q_js: ...
reflection_student_Q_js: ...
```

对单臂策略来说，joint representation 保持 22-DoF 的顺序，并对特定关节做符号翻转。对 student/global policy 来说，`permutation_student_Q_js` 会交换两个 22-DoF 半区，`reflection_student_Q_js` 再施加对应的符号变换。

### 等变网络

`symdex/utils/symmetry.py` 构建 ESCNN group，并注册 joint space、tangent joint space、Euclidean vector、pseudo-vector 和 flattened rotation 等 representation。`symdex/algo/network/emlp.py` 再基于这些 field type 构造 equivariant MLP。

这个实现比较优雅的一点是同时覆盖 actor 和 critic：

- 如果输出 representation 是非平凡的，EMLP 是 equivariant；
- 如果输出是 trivial representation，EMLP 会做 invariant feature pooling，从而成为 invariant function。

这和论文中的 actor/critic 设计基本一一对应。

### PPO Agent

`symdex/algo/eqs.py` 定义了 `AgentSYMDEX`。它创建两组 actor-critic：

```text
actor, critic
actor_left, critic_left
```

如果启用 `same_policy`，两侧可以共享参数；否则分别优化，对应论文中的 dedicated subtask policies。

rollout 时，agent 会：

1. 读取环境中的 `symmetry_tracker`；
2. 用 `SymmetryManager.get_multi_agent_obs` 切出每个子任务观测；
3. 分别从两个 actor 采样动作；
4. 通过 `get_execute_action` 拼接或交换动作；
5. 通过 `get_multi_agent_rew` 把 detailed reward 拆回子任务 reward；
6. 对左右两个 buffer 分别执行 PPO 更新。

这就是论文中 MTMA-POMDP 分解在代码里的样子。

### 对称环境

`insertDrawer.yaml`、`stirBowl.yaml`、`threading.yaml`、`handover.yaml` 等任务配置中都定义了原始 reward 和 `_symmetry` reward，同时还有 `single_agent_obs_idx_symmetry` 与 `single_agent_rew_symmetry`。因此环境可以同时训练原始和镜像配置，并为每个子任务策略提供正确的观测和 reward 切片。

## 6. 优点

SYMDEX 最有价值的地方，是它把 symmetry 当成控制先验，而不是数据层面的小技巧。机器人的形态结构直接约束策略函数类，因此对称场景在模型内部天然绑定在一起。这类 inductive bias 对 RL 尤其重要，因为它能减少大量无意义探索。

子任务分解也非常实用。一个全局策略要同时解决探索、credit assignment、角色专门化和对称泛化；SYMDEX 先训练专家，再蒸馏，等于把问题拆开处理。

另外，四臂扩展也很有启发性。对称群从双侧反射 \\(C_2\\) 变成旋转群 \\(C_4\\)，但学习流程不需要本质改变。这说明框架不只是手写的左右交换，而是可以扩展到更一般的 morphology symmetry。

## 7. 局限

方法依赖真实存在的对称性。如果硬件、传感器、任务角色或物体 affordance 并不对称，那么这个 inductive bias 可能会变成错误约束。

论文主要使用 state-based policy。真实实验的失败案例中，感知是主要瓶颈，因为控制器依赖准确的多物体位姿跟踪。作者提到未来可以把等变架构扩展到 RGB-D 和点云输入，这应该是很自然的下一步。

此外，这套 pipeline 有工程成本：子任务分解、reward 设计、symmetry field 配置、distillation 都需要额外工作。SYMDEX 用这些成本换来了困难双臂 RL 的可训练性，但它不是一个可以直接套到任意操作任务上的方法。

## 8. 启发

SYMDEX 是 morphology-aware learning 的一个很好的例子：与其让网络从海量 rollout 中重新发现左右结构，不如把这个结构直接写进 policy 和 value function。

实践中，我会在这些条件下优先考虑这类方法：

- 机器人具有清晰的形态对称性；
- 任务可以分解成有意义的 arm-level subtasks；
- 镜像初始状态应该对应镜像最优动作；
- 探索和 reward assignment 是主要瓶颈；
- sim-to-real 鲁棒性重要到值得设计 curriculum。

如果任务存在隐藏的不对称性，例如工具形状、物体 affordance、感知视角或安全约束，那么 symmetry 仍然可能有帮助，但应该更谨慎地局部使用，而不是作为全局硬约束。

</div>
