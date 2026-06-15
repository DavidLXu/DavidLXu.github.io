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

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**RoboInF** is a synthetic robot-data engine from XLANG Lab for scaling instruction-following manipulation data in simulation. The public artifact is currently a **preview release** rather than a full arXiv paper: it describes the data-generation pipeline, shows qualitative examples, gives scale numbers, and states that quantitative model results, training recipes, benchmark details, data, and code will come later.

The core idea is to make simulation data useful for VLA training by generating not only scenes and robot motions, but also **natural instructions**, **executable reward checks**, **motion-planning programs**, and **verified successful rollouts**. The retained trajectories become filtered VLA supervision: instruction, observation, action, phase labels, success metadata, and optional videos.

My read is that RoboInF is best understood as infrastructure for the next wave of VLA scaling. It is less about proposing a new policy architecture and more about making synthetic manipulation data broad, inspectable, controllable, and reward-verified.

## Project Info

The release is **"RoboInF: Scaling Robot Manipulation Data in Simulation for General Instruction Following"** by **XLANG Lab**. It was published as a preview release on **May 27, 2026** at [xlang.ai/blog/roboinf](https://xlang.ai/blog/roboinf).

The release reports:

- **1M+ successful trajectories**
- **5K+ tasks**
- **300+ scenes**
- **50+ reward primitives**

The suggested citation is an `@article` entry with `journal = {xlang.ai}`, which reinforces that this is currently a project/blog release rather than a conventional conference paper.

## Why RoboInF Matters

Generalist robot policies need data that is diverse in scene layout, natural in language, spatially precise, physically varied, and broad in task type. Real robot teleoperation gives high-quality actions but scales slowly. Internet videos scale well but lack robot actions and introduce embodiment mismatch. Narrow simulation benchmarks can produce clean labels, yet often cover limited visual and linguistic variation.

RoboInF tries to fill that gap with generated simulation experience. Its target is not just more pick-and-place. The examples include object orientation, spatial arrangement, semantic grouping, articulated-object interaction, drawer opening and closing, tool use, edge placement, multi-object layout, and long-horizon tasks.

This is also why RoboInF connects naturally to recent VLA systems such as Qwen-VLA. In my Qwen-VLA notes, ROBOINF appears as part of the synthetic data stack: an internal version was used to build visual-language-action simulation data with tabletop scenes, tasks, generated success checks, motion programs, successful trajectories, and domain randomization.

## Pipeline Overview

RoboInF couples five stages:

1. **Scene generation:** build a randomized tabletop world.
2. **Task generation:** propose scene-conditioned natural-language instructions.
3. **Reward generation:** synthesize executable `evaluate()` checks.
4. **Motion-code generation:** write and debug motion-planning code with simulator feedback.
5. **Trajectory generation:** roll out randomized variants and retain successful trajectories.

The output is a VLA training record containing language, observations, robot actions, and task-success metadata.

The nice part is that each stage produces an artifact that makes the next stage easier to verify. A task is grounded in a scene. A reward is grounded in the task and scene objects. A motion program is tested against the reward. Rollouts are filtered by the same executable success checker.

## Scene Generation

RoboInF uses two complementary scene-generation modes.

The first mode is **random synthesis**. It samples everyday objects, converts them into simulation-ready assets, rescales them to plausible physical sizes, and places them in physics-valid tabletop layouts. This gives broad combinatorial coverage.

The second mode is **image-conditioned agentic generation**. It reconstructs more natural arrangements from real-world reference images, including object and spatial manifests for household or kitchen-style scenes. In the blog examples, these are called organized scenes.

Across both modes, RoboInF randomizes:

- object poses,
- camera views,
- robot initial states,
- textures,
- backgrounds,
- lighting,
- physics parameters.

The goal is not one perfect simulated room. The goal is many plausible tabletop worlds that expose policies to visual and physical variation.

## Task Generation

The task generator uses scene information and spatial relationships to propose feasible natural-language instructions. The release emphasizes that a dataset can be large and still be narrow if every task comes from a fixed template. RoboInF therefore aims for scene-grounded language diversity.

Representative task types include:

- atomic object moves,
- precise spatial arrangements,
- semantic grouping,
- visual-attribute grounding,
- simple physical reasoning,
- multi-stage articulated-object tasks.

Examples from the release include turning a mouse around, setting a brush parallel to a glue stick, arranging multiple objects in a line, placing an object into a drawer and closing it, grouping drink items together, and positioning a toy car partly over the edge of a display stand.

This is the part I find especially important for instruction-following. Many robot datasets have action diversity but weak language diversity, or natural language but limited control precision. RoboInF tries to generate both together.

## Reward Code Generation

RoboInF's most reusable idea may be reward synthesis. For each task, the system generates an executable `evaluate()` function from the instruction, scene object identities, and a predicate library.

The predicate library includes concepts such as:

- `On`
- `LeftTo`
- `RightTo`
- `IsInside`
- `IsStatic`
- `Upright`
- `IsOpen`
- `ConstraintAlways`

The release describes success checks as compositions of spatial relations, object states, contact/orientation conditions, articulation state, temporal constraints, and neural/image predicates.

This matters because synthetic data quality depends on filtering. If every generated rollout enters the dataset, the policy learns from many failed or ambiguous attempts. RoboInF instead keeps only trajectories that satisfy generated reward code.

## Motion-Code Generation

The motion-code stage uses an Agent-Simulation Interface. An agent writes robot programs with low-level APIs such as:

```python
move_to(...)
open_gripper()
close_gripper()
move_linear(...)
move_planar(...)
```

The simulator executes the code and returns feedback: planning failures, collisions, joint-limit issues, predicate-level reward results, object states, robot states, multi-view observations, local object frames, and visualized target poses.

The agent revises the program until the reward code reports success or the refinement budget runs out.

For a long-horizon task such as placing a can into the bottom drawer and closing the drawer, the generated strategy can include opening the drawer, picking the can, moving it into the cavity, releasing it, re-grasping the handle, pushing the drawer closed, and verifying the final state.

This turns RoboInF into more than a scene sampler. It is a loop for generating executable manipulation strategies.

## Trajectory Generation

Once a motion program succeeds, RoboInF reuses it across many randomized variants. It randomizes object initial poses, cameras, lighting, backgrounds, textures, robot initial states, and controller dynamics such as stiffness and damping.

Each rollout is checked by the generated `evaluate()` function. Successful rollouts become VLA training records. Failed rollouts are filtered out from the main dataset.

The retained record can include:

- natural-language instruction,
- observations,
- robot actions,
- end-effector poses,
- phase labels,
- success flags,
- predicate-level results,
- optional videos.

This is the bridge from a solved simulation program to scalable supervised VLA data.

## Relation to Qwen-VLA

RoboInF also helps explain part of the synthetic-data story in Qwen-VLA. In the Qwen-VLA paper, an internal early ROBOINF pipeline is used for vision-language-action synthetic data. That component reportedly covers 20 tabletop scenes, 10 initial configurations per scene, 450 manipulation tasks, and roughly 359,848 successful full trajectories including subtask segments.

The public RoboInF preview is broader in stated ambition: 1M+ successful trajectories, 5K+ tasks, 300+ scenes, and 50+ reward primitives. So I read the relationship this way:

- Qwen-VLA shows one downstream use case for RoboInF-style synthetic VLA data.
- RoboInF is the data engine being expanded into a larger, inspectable, reusable generator.

This is useful context because it separates two ideas: Qwen-VLA is a model/training recipe; RoboInF is a data-production system.

## Early Model Observations

The preview does not report quantitative benchmark results. The authors explicitly say that they want published numbers to come with a reproducible benchmark and ablation study.

The qualitative claims are:

- models trained with RoboInF data handle distractor objects, changed lighting, and shifted camera poses more reliably than internal baselines;
- models follow compositional instructions more consistently;
- the team has seen early signs of zero-shot sim-to-real transfer.

These claims are promising, but I would treat them as directional until the code, data, benchmark, and training details are released.

## Current Scope and Next Steps

The release frames RoboInF's current scope as:

- single-arm manipulation,
- rigid objects,
- reward-filtered SFT data,
- relatively coarse-grained manipulation tasks.

The next directions are:

- dual-arm and broader embodiments,
- soft objects, liquids, and deformables,
- RL fine-tuning and multi-task co-training using the same rewards,
- more intricate fine-grained task programs.

The reward angle is especially interesting. If the generated reward functions are reliable enough, the same infrastructure could support both supervised imitation from filtered trajectories and RL-style optimization from generated success checks.

## Strengths

RoboInF is strong because it treats synthetic data generation as a full pipeline rather than a rendering problem. Scene diversity, task language, reward verification, motion programs, domain randomization, and filtering all matter.

The generated `evaluate()` layer is the most important engineering idea. It makes the dataset inspectable: a retained trajectory is not only a video-action pair, but a rollout that passed a task-specific success checker.

The two scene modes are also practical. Random synthesis gives coverage, while image-conditioned reconstruction gives more natural co-occurrence and layout.

## Limitations

The current release is a preview. There are no published quantitative benchmark tables, ablation studies, model training recipes, or released code/data at the time of this note.

Reward generation can become a bottleneck. If the `evaluate()` function misses an intended constraint or encodes a shortcut, the dataset may reward behaviors that satisfy code while missing task intent.

Simulation still has the usual reality gap. Domain randomization helps, but contact-rich manipulation, deformable objects, liquids, tool use, and fine-grained force interactions remain hard to simulate faithfully.

The current scope focuses on single-arm, rigid-object tabletop manipulation. The roadmap is ambitious, but the hard cases are exactly the ones that will test reward synthesis and motion-code robustness.

## Takeaways

RoboInF is worth watching because it points to a scalable middle path between slow real-robot collection and weakly labeled internet video. It tries to produce robot-native actions, natural instructions, and executable verification at the same time.

The most reusable lessons are:

1. Generate success checks together with tasks.
2. Treat motion programs as editable artifacts, not just one-shot samples.
3. Use simulator feedback to debug data generation.
4. Keep only reward-verified rollouts for VLA supervision.
5. Mix broad random scenes with image-conditioned organized scenes.

For my taxonomy, I would label RoboInF as:

**Synthetic Robot Data Engine / Simulation-to-VLA Data Generation / Reward-Verified Instruction Following**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**RoboInF** 是 XLANG Lab 发布的一个 synthetic robot-data engine，目标是在仿真中规模化生成 instruction-following manipulation 数据。当前公开材料是 **preview release**，还不是完整 arXiv 论文：它描述了数据生成管线，展示了定性例子，给出规模数字，并说明定量结果、训练 recipe、benchmark、数据和代码会在后续发布。

它的核心思路是：仿真数据要真正服务 VLA 训练，不能只生成场景和轨迹，还要一起生成 **自然语言指令**、**可执行 reward checks**、**motion-planning programs** 和 **经过验证的成功 rollouts**。最终保留下来的轨迹会变成 VLA 监督数据：instruction、observation、action、phase labels、success metadata，以及可选视频。

我的理解是，RoboInF 更像下一阶段 VLA scaling 的基础设施。它的重点不是提出新 policy architecture，而是让 synthetic manipulation data 变得更广、更可检查、更可控，并且经过 reward verification。

## Project Info

这篇 release 的标题是 **"RoboInF: Scaling Robot Manipulation Data in Simulation for General Instruction Following"**，作者是 **XLANG Lab**。发布时间是 **2026 年 5 月 27 日**，链接是 [xlang.ai/blog/roboinf](https://xlang.ai/blog/roboinf)。

release 中报告了：

- **1M+ successful trajectories**
- **5K+ tasks**
- **300+ scenes**
- **50+ reward primitives**

官方建议的引用格式是 `@article`，其中 `journal = {xlang.ai}`。这也说明它目前更接近 project/blog release，而不是传统会议论文。

## 为什么 RoboInF 重要

通用机器人策略需要的数据必须同时覆盖场景多样性、自然语言变化、精细空间控制、物理变化和任务类型变化。真实机器人遥操作能提供高质量动作，但扩展慢。互联网视频规模大，但缺少机器人 action，并且有 embodiment mismatch。窄范围仿真 benchmark 能给干净标签，但视觉和语言变化往往有限。

RoboInF 想用生成式仿真经验补这个缺口。它的目标不只是扩展 pick-and-place。页面展示的任务包括物体朝向、空间排列、语义分组、articulated-object interaction、抽屉开合、工具使用、边缘放置、多物体布局和长时程任务。

这也是它和 Qwen-VLA 很自然地连起来的原因。在我之前写的 Qwen-VLA 笔记里，ROBOINF 是 synthetic data stack 的一部分：内部版本被用来构建 visual-language-action simulation data，包括桌面场景、任务、success checks、motion programs、成功轨迹和 domain randomization。

## Pipeline Overview

RoboInF 把五个阶段串成一条管线：

1. **Scene generation:** 构建 randomized tabletop world。
2. **Task generation:** 生成 scene-conditioned natural-language instructions。
3. **Reward generation:** 合成可执行的 `evaluate()` checks。
4. **Motion-code generation:** 结合 simulator feedback 编写和调试 motion-planning code。
5. **Trajectory generation:** 在随机化变体中 rollout，并只保留成功轨迹。

最终输出是 VLA training record，包含 language、observations、robot actions 和 task-success metadata。

这条管线漂亮的地方在于，每一步都会产生一个能帮助下一步验证的 artifact。task 绑定到 scene，reward 绑定到 task 和 scene objects，motion program 用 reward 测试，rollout 再用同一套 success checker 过滤。

## Scene Generation

RoboInF 使用两种互补的 scene-generation 模式。

第一种是 **random synthesis**。它采样 everyday objects，把它们转成 simulation-ready assets，缩放到合理物理尺寸，再放入 physics-valid tabletop layouts。这个模式提供组合覆盖。

第二种是 **image-conditioned agentic generation**。它从真实参考图像中重建更自然的物体排列，包括 household 或 kitchen-style 场景中的 object manifest 和 spatial manifest。页面示例里把这类场景称为 organized scenes。

两种模式都会随机化：

- object poses，
- camera views，
- robot initial states，
- textures，
- backgrounds，
- lighting，
- physics parameters。

目标不是构建一个完美仿真房间，而是构建许多可信的 tabletop worlds，让策略接触视觉和物理变化。

## Task Generation

task generator 会利用场景信息和空间关系，提出可行的自然语言指令。release 特别强调，一个数据集即使很大，如果所有指令都来自固定模板，仍然会很窄。所以 RoboInF 追求 scene-grounded language diversity。

代表性任务类型包括：

- 原子级物体移动，
- 精确空间排列，
- 语义分组，
- 视觉属性 grounding，
- 简单物理推理，
- 多阶段 articulated-object tasks。

release 中的例子包括：把鼠标转到另一面、让刷子与胶棒平行、把多个物体排成一条线、把物体放进抽屉并关上、把饮料类物品分组、把玩具车放到展示台边缘并部分悬空。

这部分对 instruction following 尤其关键。很多机器人数据集有动作多样性但语言弱，或者语言自然但控制精度有限。RoboInF 试图把两者一起生成。

## Reward Code Generation

RoboInF 最值得复用的想法可能是 reward synthesis。对每个任务，系统会根据 instruction、scene object identities 和 predicate library 生成可执行的 `evaluate()` function。

predicate library 包含：

- `On`
- `LeftTo`
- `RightTo`
- `IsInside`
- `IsStatic`
- `Upright`
- `IsOpen`
- `ConstraintAlways`

release 把 success checks 描述为对空间关系、物体状态、接触/朝向条件、articulation state、temporal constraints 和 neural/image predicates 的组合。

这很重要，因为 synthetic data 的质量取决于过滤。如果所有生成 rollout 都进入训练集，策略会从大量失败或模糊尝试中学习。RoboInF 只保留通过 generated reward code 的轨迹。

## Motion-Code Generation

motion-code 阶段使用 Agent-Simulation Interface。agent 会用低层 API 写机器人程序，例如：

```python
move_to(...)
open_gripper()
close_gripper()
move_linear(...)
move_planar(...)
```

仿真器执行代码并返回反馈：planning failures、collisions、joint-limit issues、predicate-level reward results、object states、robot states、multi-view observations、local object frames 和 visualized target poses。

agent 根据反馈修改程序，直到 reward code 报告成功，或者达到 refinement budget。

对于“把 7 Up 罐放进底部抽屉并关上抽屉”这种长时程任务，生成策略可以包括打开抽屉、抓取罐子、把罐子移动到抽屉腔体、释放、重新抓取把手、推回抽屉并验证最终状态。

这说明 RoboInF 不只是 scene sampler。它是一套生成可执行 manipulation strategies 的循环。

## Trajectory Generation

当 motion program 成功后，RoboInF 会把它复用到许多随机化变体中。随机化内容包括 object initial poses、cameras、lighting、backgrounds、textures、robot initial states，以及 stiffness、damping 等 controller dynamics。

每条 rollout 都由生成的 `evaluate()` function 检查。成功 rollout 进入 VLA training records，失败 rollout 从主数据集中滤掉。

保留下来的 record 可以包含：

- natural-language instruction，
- observations，
- robot actions，
- end-effector poses，
- phase labels，
- success flags，
- predicate-level results，
- optional videos。

这就是从已解决仿真程序到规模化 supervised VLA data 的桥。

## 和 Qwen-VLA 的关系

RoboInF 也能帮助理解 Qwen-VLA 的 synthetic-data 部分。Qwen-VLA 论文中，一个内部早期 ROBOINF pipeline 被用于生成 vision-language-action synthetic data。那部分报告覆盖 20 个 tabletop scenes，每个 scene 10 个 initial configurations，450 个 manipulation tasks，以及约 359,848 条包含 subtask segments 的成功完整轨迹。

公开的 RoboInF preview 在目标上更大：1M+ successful trajectories、5K+ tasks、300+ scenes、50+ reward primitives。所以我会这样理解两者关系：

- Qwen-VLA 展示了 RoboInF-style synthetic VLA data 的一个下游用法。
- RoboInF 是正在扩展成更大、更可检查、更可复用的 data engine。

这个区分很有用：Qwen-VLA 是 model/training recipe；RoboInF 是 data-production system。

## Early Model Observations

preview 没有报告定量 benchmark 结果。作者明确说，希望第一批数字和可复现 benchmark、ablation study 一起发布。

当前定性观察是：

- 使用 RoboInF 数据训练的模型，对 distractor objects、changed lighting、shifted camera poses 更稳；
- 模型能更一致地遵循 compositional instructions；
- 团队观察到 early signs of zero-shot sim-to-real transfer。

这些说法很有潜力，但在代码、数据、benchmark 和训练细节发布前，我会把它们看作方向性证据。

## Current Scope and Next Steps

release 中把当前范围描述为：

- single-arm manipulation，
- rigid objects，
- reward-filtered SFT data，
- 相对 coarse-grained 的 manipulation tasks。

后续方向包括：

- dual-arm 和更广泛 embodiments，
- soft objects、liquids、deformables，
- 使用同一套 rewards 做 RL fine-tuning 和 multi-task co-training，
- 更复杂、更细粒度的 task programs。

reward 这条线特别值得关注。如果 generated reward functions 足够可靠，同一套基础设施既可以支持 filtered trajectories 的 supervised imitation，也可以支持基于 generated success checks 的 RL-style optimization。

## 优点

RoboInF 的优点在于，它把 synthetic data generation 当作完整管线，而不是单纯渲染问题。scene diversity、task language、reward verification、motion programs、domain randomization 和 filtering 都很关键。

生成 `evaluate()` 这一层是最重要的工程想法。它让数据集更可检查：保留下来的轨迹不仅是 video-action pair，还是通过 task-specific success checker 的 rollout。

两种 scene 模式也很实际。random synthesis 负责覆盖，image-conditioned reconstruction 负责更自然的物体共现和布局。

## 局限

当前 release 仍然是 preview。写这篇笔记时，还没有公开的定量 benchmark tables、ablation studies、model training recipes 或 released code/data。

reward generation 可能成为瓶颈。如果 `evaluate()` function 漏掉任务意图中的关键约束，或者编码出 shortcut，数据集可能奖励满足代码但偏离真实意图的行为。

simulation 仍然有现实差距。domain randomization 有帮助，但 contact-rich manipulation、deformable objects、liquids、tool use 和精细 force interactions 仍然难以被忠实仿真。

当前范围聚焦 single-arm rigid-object tabletop manipulation。roadmap 很有野心，但真正困难的部分正是会考验 reward synthesis 和 motion-code robustness 的那些场景。

## Takeaways

RoboInF 值得关注，因为它给出了一条介于慢速真实机器人采集和弱标注互联网视频之间的可扩展路径。它试图同时生成 robot-native actions、natural instructions 和 executable verification。

最值得复用的经验是：

1. task 生成时一起生成 success checks。
2. 把 motion programs 当成可编辑 artifact，而不是一次性样本。
3. 用 simulator feedback 调试数据生成。
4. 只把 reward-verified rollouts 放进 VLA supervision。
5. 把 broad random scenes 和 image-conditioned organized scenes 混合起来。

我的分类标签会写成：

**Synthetic Robot Data Engine / Simulation-to-VLA Data Generation / Reward-Verified Instruction Following**

</div>
