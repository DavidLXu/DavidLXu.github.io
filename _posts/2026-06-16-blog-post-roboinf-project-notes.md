---
title: "[Project Notes] RoboInF: Scaling Robot Manipulation Data in Simulation for General Instruction Following"
date: 2026-06-16
permalink: /posts/2026/06/roboinf-project-notes/
tags:
  - Robot Learning
  - Simulation
  - VLA
  - Synthetic Data
  - Instruction Following
  - Project Notes
---

<div data-lang="en" markdown="1">

## TL;DR

**RoboInF** is XLANG Lab's preview release for scaling instruction-following robot manipulation data in simulation. It is best read as a data-engine preview: the release gives the generation pipeline, qualitative examples, and scale numbers, while quantitative model results, training recipes, benchmarks, data, and code are still pending.

The key idea is to make synthetic trajectories usable for VLA training by pairing them with natural instructions, executable reward checks, motion-planning programs, and reward-verified rollouts. The resulting records can carry instruction, observation, action, end-effector pose, phase labels, success metadata, predicate-level results, and optional videos.

## Core Story

The project page, published on **May 27, 2026** at [xlang.ai/blog/roboinf](https://xlang.ai/blog/roboinf), reports **1M+ successful trajectories**, **5K+ tasks**, **300+ scenes**, and **50+ reward primitives**. The suggested citation is an `@article` with `journal = {xlang.ai}`, which matches the current status: a public project/blog preview whose full experimental tables are still forthcoming.

RoboInF addresses a data bottleneck that keeps appearing in generalist robot learning. Real teleoperation gives robot-native actions but scales slowly; internet videos scale broadly but lack robot actions and embodiment alignment; narrow simulation benchmarks give clean labels but often miss linguistic, visual, and task diversity. RoboInF tries to occupy the middle ground by producing simulated manipulation experience that is scene-diverse, language-rich, programmatically checkable, and easy to filter.

The release goes beyond simple pick-and-place. Its examples cover object orientation, precise spatial arrangement, semantic grouping, articulated-object interaction, drawer opening and closing, tool use, edge placement, multi-object layout, and longer-horizon tasks. This breadth matters because instruction following fails when language variation and control precision are generated separately. RoboInF's bet is that scene, task, reward, program, and rollout should be generated as one coupled artifact.

## Pipeline

| Stage | Role in the data engine |
| --- | --- |
| Scene generation | Builds randomized tabletop worlds through random synthesis and image-conditioned organized-scene reconstruction. |
| Task generation | Produces scene-grounded natural-language instructions from object identities and spatial relations. |
| Reward generation | Synthesizes executable `evaluate()` checks from the task, scene objects, and predicate library. |
| Motion-code generation | Uses simulator feedback to write and refine manipulation programs through an Agent-Simulation Interface. |
| Trajectory generation | Replays successful programs under randomized variants and keeps reward-verified rollouts. |

The two scene modes play complementary roles. Random synthesis samples everyday objects, turns them into simulation-ready assets, rescales them to plausible physical sizes, and places them in physics-valid layouts. Image-conditioned generation reconstructs more natural household or kitchen-style arrangements from reference images. Across both modes, RoboInF randomizes object poses, camera views, robot initial states, textures, backgrounds, lighting, physics parameters, and controller dynamics such as stiffness and damping.

Reward synthesis is the strongest technical hook. For each task, RoboInF generates an executable `evaluate()` function using predicates such as `On`, `LeftTo`, `RightTo`, `IsInside`, `IsStatic`, `Upright`, `IsOpen`, and `ConstraintAlways`. These checks combine spatial relations, object states, contact and orientation conditions, articulation state, temporal constraints, and neural/image predicates. If the reward code is good, it turns synthetic data generation from "render many attempts" into "retain attempts that satisfy task-specific intent."

Motion-code generation closes the loop. An agent writes robot programs with low-level calls such as `move_to(...)`, `open_gripper()`, `close_gripper()`, `move_linear(...)`, and `move_planar(...)`; the simulator returns planning failures, collisions, joint-limit issues, predicate-level reward results, object and robot states, multi-view observations, local object frames, and visualized target poses. The program is revised until the reward succeeds or the refinement budget is exhausted. For a drawer task, this can mean opening the drawer, grasping a can, moving it into the cavity, releasing it, re-grasping the handle, closing the drawer, and checking the final state.

## Relation to Qwen-VLA

RoboInF also clarifies part of Qwen-VLA's synthetic-data story. The Qwen-VLA paper describes an internal early ROBOINF pipeline for vision-language-action simulation data: 20 tabletop scenes, 10 initial configurations per scene, 450 manipulation tasks, and about 359,848 successful full trajectories including subtask segments. The public RoboInF preview expands that direction to a larger stated scale: 1M+ successful trajectories, 5K+ tasks, 300+ scenes, and 50+ reward primitives.

I read the relationship as a split between model recipe and data factory. Qwen-VLA shows one downstream use of RoboInF-style data; RoboInF is the generator being expanded into a broader, inspectable, reusable source of VLA supervision.

## Evidence, Scope, and Limits

The current release does not publish benchmark tables, ablations, model training recipes, or released code/data. The qualitative claims are that RoboInF-trained models handle distractors, lighting changes, and shifted camera poses more reliably than internal baselines; follow compositional instructions more consistently; and show early signs of zero-shot sim-to-real transfer. Those are promising signals, but they remain directional until the benchmark and training details are public.

The current scope is also deliberately bounded: single-arm manipulation, rigid objects, reward-filtered SFT data, and relatively coarse-grained manipulation tasks. The roadmap points to dual-arm systems, broader embodiments, soft objects, liquids, deformables, RL fine-tuning, multi-task co-training, and more intricate fine-grained programs. These are exactly the cases that will stress-test reward generation and motion-code robustness.

The main risk is reward misspecification. If `evaluate()` omits a key constraint or encodes a shortcut, the system can produce many trajectories that pass code while drifting from the intended instruction. Simulation still carries the usual reality gap as well: contact-rich manipulation, deformable objects, liquids, tool use, and fine force control remain hard to model faithfully, even with domain randomization.

## Takeaway

RoboInF is worth watching because it treats synthetic robot data as a full verification pipeline. The reusable lesson is simple: generate tasks together with executable success checks, debug motion programs through simulator feedback, and keep only reward-verified rollouts for VLA supervision. If the reward layer proves reliable, the same infrastructure could support both filtered imitation data and RL-style optimization from generated success checks.

For my taxonomy, I would label RoboInF as:

**Synthetic Robot Data Engine / Simulation-to-VLA Data Generation / Reward-Verified Instruction Following**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**RoboInF** 是 XLANG Lab 发布的一个 preview release，用来在仿真中规模化生成 instruction-following robot manipulation 数据。它更适合理解为数据引擎预览：当前页面给出了生成管线、定性示例和规模数字，定量模型结果、训练 recipe、benchmark、数据和代码仍待发布。

核心思路是让 synthetic trajectories 能真正用于 VLA 训练：每条数据都尽量配套自然语言指令、可执行 reward checks、motion-planning programs 和经过 reward 验证的成功 rollouts。最终记录可以包含 instruction、observation、action、end-effector pose、phase labels、success metadata、predicate-level results 和可选视频。

## Core Story

项目页面发布于 **2026 年 5 月 27 日**，链接是 [xlang.ai/blog/roboinf](https://xlang.ai/blog/roboinf)，报告规模为 **1M+ successful trajectories**、**5K+ tasks**、**300+ scenes** 和 **50+ reward primitives**。官方建议引用格式是 `@article`，其中 `journal = {xlang.ai}`，这也符合它当前的状态：公开 project/blog preview，而非带完整实验表格的传统论文。

RoboInF 处理的是通用机器人学习中反复出现的数据瓶颈。真实遥操作能给 robot-native actions，但扩展慢；互联网视频规模大，却缺少机器人 action 和 embodiment alignment；窄范围仿真 benchmark 标签干净，但通常缺少语言、视觉和任务多样性。RoboInF 选择中间路线：生成具有场景多样性、自然语言变化、程序化验证能力和过滤机制的仿真 manipulation experience。

它覆盖的任务也不止 pick-and-place。页面示例包括物体朝向、精确空间排列、语义分组、articulated-object interaction、抽屉开合、工具使用、边缘放置、多物体布局和长时程任务。这一点很关键，因为 instruction following 的难点常常出现在语言变化和控制精度脱节的时候。RoboInF 的判断是：scene、task、reward、program 和 rollout 应该作为一组耦合 artifact 一起生成。

## Pipeline

| Stage | Role in the data engine |
| --- | --- |
| Scene generation | 通过 random synthesis 和 image-conditioned organized-scene reconstruction 构建 randomized tabletop worlds。 |
| Task generation | 根据物体身份和空间关系生成 scene-grounded natural-language instructions。 |
| Reward generation | 根据任务、场景物体和 predicate library 合成可执行 `evaluate()` checks。 |
| Motion-code generation | 通过 Agent-Simulation Interface 和 simulator feedback 编写、修正 manipulation programs。 |
| Trajectory generation | 在随机化变体中复用成功程序，只保留 reward-verified rollouts。 |

两种 scene 模式各自承担不同功能。Random synthesis 采样 everyday objects，把它们转成 simulation-ready assets，缩放到合理物理尺寸，再放进 physics-valid layouts。Image-conditioned generation 则从参考图像重建更自然的 household 或 kitchen-style arrangements。两种模式都会随机化 object poses、camera views、robot initial states、textures、backgrounds、lighting、physics parameters，以及 stiffness、damping 等 controller dynamics。

Reward synthesis 是最值得关注的技术点。对每个任务，RoboInF 会用 `On`、`LeftTo`、`RightTo`、`IsInside`、`IsStatic`、`Upright`、`IsOpen`、`ConstraintAlways` 等 predicates 生成可执行 `evaluate()` function。这些 checks 组合了空间关系、物体状态、接触和朝向条件、articulation state、temporal constraints 以及 neural/image predicates。如果 reward code 足够可靠，synthetic data generation 的目标就从“渲染大量尝试”变成“保留满足任务意图的尝试”。

Motion-code generation 把这个循环闭合起来。Agent 会用 `move_to(...)`、`open_gripper()`、`close_gripper()`、`move_linear(...)`、`move_planar(...)` 这类低层 API 写机器人程序；仿真器返回 planning failures、collisions、joint-limit issues、predicate-level reward results、object and robot states、multi-view observations、local object frames 和 visualized target poses。程序会被反复修正，直到 reward 成功或 refinement budget 用完。对于抽屉任务，这可能包含打开抽屉、抓取罐子、移动到抽屉腔体、释放、重新抓取把手、关上抽屉并检查最终状态。

## Relation to Qwen-VLA

RoboInF 也帮助理解 Qwen-VLA 的 synthetic-data 部分。Qwen-VLA 论文描述过一个内部早期 ROBOINF pipeline，用来生成 vision-language-action simulation data：20 个 tabletop scenes，每个 scene 10 个 initial configurations，450 个 manipulation tasks，以及约 359,848 条包含 subtask segments 的成功完整轨迹。公开 RoboInF preview 把这个方向扩展到更大的目标规模：1M+ successful trajectories、5K+ tasks、300+ scenes 和 50+ reward primitives。

我的理解是，两者分工不同。Qwen-VLA 展示了 RoboInF-style data 的一个下游用法；RoboInF 是正在扩展成更大、更可检查、更可复用的 VLA supervision 生成器。

## Evidence, Scope, and Limits

当前 release 没有公开 benchmark tables、ablations、model training recipes 或 released code/data。页面中的定性说法是：使用 RoboInF 数据训练的模型，对 distractors、lighting changes 和 shifted camera poses 更稳；能更一致地遵循 compositional instructions；并出现了 early signs of zero-shot sim-to-real transfer。这些信号值得关注，但在 benchmark 和训练细节公开前，仍应视为方向性证据。

当前范围也比较明确：single-arm manipulation、rigid objects、reward-filtered SFT data，以及相对 coarse-grained 的 manipulation tasks。路线图指向 dual-arm systems、更广泛 embodiments、soft objects、liquids、deformables、RL fine-tuning、multi-task co-training 和更细粒度的 programs。这些正是会真正考验 reward generation 和 motion-code robustness 的场景。

主要风险是 reward misspecification。如果 `evaluate()` 漏掉关键约束，或者编码出 shortcut，系统可能生成大量“通过代码但偏离指令意图”的轨迹。仿真本身也仍有 reality gap：即使有 domain randomization，contact-rich manipulation、deformable objects、liquids、tool use 和精细 force control 仍然很难被忠实建模。

## Takeaway

RoboInF 值得关注，因为它把 synthetic robot data 当作一整套 verification pipeline 来做。最可复用的经验很直接：生成 task 时同步生成 executable success checks，用 simulator feedback 调试 motion programs，只把 reward-verified rollouts 放进 VLA supervision。如果 reward layer 足够可靠，同一套基础设施未来既可以支持 filtered imitation data，也可以支持基于 generated success checks 的 RL-style optimization。

我的分类标签会写成：

**Synthetic Robot Data Engine / Simulation-to-VLA Data Generation / Reward-Verified Instruction Following**

</div>
