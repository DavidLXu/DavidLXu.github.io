---
title: "[Paper Notes] TiPToP: A Modular Open-Vocabulary Planning System for Robotic Manipulation"
date: 2026-03-14
permalink: /posts/2026/03/tiptop-paper-notes/
tags:
  - Robotics
  - Manipulation
  - Task and Motion Planning
  - Vision-Language Models
  - Embodied AI
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**TiPToP** is a modular robotic manipulation system that turns a **stereo RGB observation plus a natural-language instruction** into a complete manipulation plan, without any robot training data.

Its core claim is simple but important: for long-horizon tabletop manipulation, a pipeline built from **foundation-model perception + explicit task-and-motion planning + precise execution** can compete with, and often outperform, a large end-to-end VLA policy that was fine-tuned on hundreds of hours of embodiment-specific demonstrations.

What makes the paper stand out is not only the benchmark result. It is the systems argument that **modularity is still a strong design choice** in robotics, because it gives:

- better semantic grounding on distractor-heavy tasks
- stronger multi-step reasoning through symbolic planning
- clearer failure diagnosis at the component level
- easier cross-embodiment deployment

## Paper Info

- **Title**: TiPToP: A Modular Open-Vocabulary Planning System for Robotic Manipulation
- **Authors**: William Shen, Nishanth Kumar, Sahit Chintalapudi, Jie Wang, Christopher Watson, Edward Hu, Jing Cao, Dinesh Jayaraman, Leslie Pack Kaelbling, Tomas Lozano-Perez
- **Affiliations**: MIT CSAIL, University of Pennsylvania
- **arXiv**: [2603.09971](https://arxiv.org/abs/2603.09971)
- **Project page**: [tiptop-robot.github.io](https://tiptop-robot.github.io)
- **Paper type**: robotic manipulation / modular systems / task and motion planning

## 1. Problem Setting and Motivation

The paper studies a practical manipulation setting:

- input: a stereo RGB image pair and a language instruction
- output: robot joint trajectories and gripper commands that complete the task

The target is not just simple pick-and-place. The tasks include:

- distractor-heavy object selection
- semantic grounding such as "matching plate" or "largest toy"
- multi-step manipulation with obstacle removal or packing

The authors position TiPToP against a strong baseline: **pi0.5-DROID**, a vision-language-action model fine-tuned on **350 hours** of embodiment-specific demonstrations.

The motivation is clear:

- end-to-end VLAs are appealing, but expensive in data and hard to debug
- classical TAMP is structured and interpretable, but has usually been too brittle or too tightly engineered
- recent foundation models make it possible to revisit modular planning with much stronger perception

## 2. System Overview

TiPToP is split into three modules:

1. **Perception**
2. **Planning**
3. **Execution**

The full policy is planner-based. It observes the scene once at the beginning and then executes an open-loop plan.

### 2.1 Perception module

The perception module builds an object-centric scene representation from the initial stereo observation and the language instruction.

Its two branches run in parallel:

- a **3D vision branch** for depth and grasp generation
- a **semantic branch** for object detection, segmentation, and goal grounding

The key ingredients are:

- **FoundationStereo** for dense stereo depth
- **M2T2** for 6-DoF grasp proposals
- **Gemini Robotics-ER 1.5** for open-vocabulary object detection and symbolic goal grounding
- **SAM-2** for segmentation

The output is a set of per-object meshes, candidate grasps, and symbolic goal predicates.

### 2.2 Planning module

Planning is handled by **cuTAMP**, a GPU-parallelized task-and-motion planner.

Given the symbolic goal, TiPToP:

- enumerates candidate plan skeletons
- samples grasps, placements, IK solutions, and trajectories
- optimizes these parameters under collision and feasibility constraints
- invokes **cuRobo** for collision-free motion generation

This is the paper's central engineering point: instead of hoping a policy implicitly discovers long-horizon structure, TiPToP **builds that structure explicitly**.

### 2.3 Execution module

The robot executes the planned trajectory with a joint impedance controller.

This makes accurate tracking a first-class requirement. Because TiPToP does not replan during execution, errors from slipping, missed grasps, or object motion can directly cause task failure.

## 3. Technical Details That Matter

Several implementation choices are more important than they may look at first glance.

### 3.1 From pixels to symbolic goals

Instead of using a VLM only for captions or labels, TiPToP asks the VLM to produce symbolic goals such as `On(a, b)`.

That matters because the planner can then reason over:

- which objects are relevant
- what relations need to hold
- which multi-step action sequence could satisfy them

This is what enables tasks like sorting by color or placing items on matching containers.

### 3.2 Convex-hull object completion

Each segmented object is converted into a watertight mesh by projecting observed points downward and taking the convex hull.

This is a pragmatic choice:

- it is cheap
- it provides conservative geometry for collision checking
- but it also causes errors on concave shapes like bananas

The paper's failure analysis shows this approximation is one of the main weak points.

### 3.3 Open-loop planning as a tradeoff

TiPToP uses a single initial observation and then executes open-loop.

This gives:

- fast task completion
- strong geometric consistency with the planner

But it also removes:

- recovery after failed grasps
- correction after object slip
- adaptation to unexpected scene changes

The paper is honest that this tradeoff is currently one of the biggest limitations.

## 4. Experimental Results

The evaluation spans **28 tasks** and **165 trials** across:

- simulation
- the authors' DROID setup
- an external evaluation team's DROID setup

The tasks are grouped into:

- simple
- distractor
- semantic
- multi-step

### 4.1 Main comparison against pi0.5-DROID

The headline result is:

- **TiPToP**: `98/165` successes, **74.6%**
- **pi0.5-DROID**: `55/165` successes, **52.4%**

The most interesting pattern is not that TiPToP wins everywhere. It does not.

Instead:

- on **simple tasks**, the two systems are fairly close
- on **distractor tasks**, TiPToP is much stronger
- on **semantic tasks**, TiPToP is much stronger
- on **multi-step tasks**, TiPToP is again much stronger

This matches the architecture:

- VLM grounding helps when language and semantic selection matter
- TAMP helps when multi-step structure and collision constraints matter
- end-to-end reactive control still helps on fragile grasps and execution recovery

### 4.2 Time-to-success

TiPToP is also often faster than the VLA baseline on successful trials.

Examples from Table II:

- `can -> mug (sim)`: **18.6s** vs **41.0s**
- `crackers -> tray (simple)`: **14.9s** vs **32.2s**
- `crackers -> tray (medium)`: **14.9s** vs **45.2s**

The reason is straightforward: TiPToP executes a planned trajectory directly, while the reactive VLA may spend extra time probing, retrying, or idling.

## 5. Failure Analysis

This section is one of the paper's strongest parts.

The authors manually analyzed **173 additional real-world trials** and traced failures to specific modules. The dominant categories are:

- **grasping failures**: `31 / 55` failures
- **scene completion errors**: `13 / 55`
- **VLM errors**: `6 / 55`
- **cuTAMP failures**: `5 / 55`

The big takeaway is that **grasping and execution robustness dominate** the remaining error budget.

In other words, the planning stack is already fairly strong. The larger problems are:

- bad grasp proposals
- slip during transport
- mesh approximation errors from partial observation
- lack of visual feedback during execution

This is exactly the kind of conclusion that modular systems make easier to reach.

## 6. Why the Paper Is Interesting

I think the paper makes three useful arguments.

### 6.1 Modular systems are still competitive

There is a strong current narrative that large end-to-end policies will absorb everything. TiPToP pushes back with a concrete counterexample: if task structure matters, explicit planning can still be very competitive.

### 6.2 Better debugging is a real research advantage

Because the system is decomposed, the authors can identify whether failures come from:

- perception
- mesh completion
- grasp generation
- planning
- execution

That is much more actionable than simply reporting a task-level failure rate.

### 6.3 Cross-embodiment deployment matters

The authors also show deployment on **UR5e** and **WidowX AI**. This is important because many robotics systems look strong only inside one tightly controlled stack. TiPToP argues for a reusable interface between perception, planning, and embodiment-specific execution.

## 7. Limitations

The paper is strong, but the limitations are substantial and worth keeping in view.

- **Open-loop execution** is the biggest weakness. Many failures could likely be recovered with re-perception and re-planning.
- **Single-view perception** limits object visibility and mesh quality.
- **Convex hull geometry** is too crude for concave objects and can distort collision reasoning.
- The system still depends on a fairly heavyweight collection of external foundation models.
- Some extensions, especially to richer manipulation skills, will require more abstract action models and more robust low-level controllers.

## 8. Takeaways

My main takeaway is that **TiPToP is not just a manipulation system, but a strong argument for bringing planning back into the modern foundation-model robotics stack**.

The paper shows that a system can be:

- open-vocabulary
- data-efficient
- interpretable
- fairly portable across robots

without giving up strong performance on long-horizon tabletop manipulation.

If I had to summarize the paper in one sentence, it would be:

**foundation models are now good enough that explicit planning becomes attractive again, because perception can finally provide the semantic and geometric abstractions that planners need.**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**TiPToP** 是一个模块化机器人操作系统，它把**双目 RGB 观测 + 自然语言指令**直接转换成完整的操作计划，而且**不需要任何机器人训练数据**。

这篇论文最核心的观点很明确：对于长时程桌面操作任务，基于**基础模型感知 + 显式任务与运动规划 + 高精度执行**的系统，不仅可以工作，而且常常能胜过一个在数百小时同构机器人示范数据上微调得到的大型端到端 VLA 策略。

它真正有价值的地方不只是结果更好，而是提出了一个很强的系统论断：**模块化在机器人里依然是非常有竞争力的设计选择**，因为它带来了：

- 在干扰物密集任务上更强的语义定位能力
- 通过符号规划实现更可靠的多步推理
- 更清晰的组件级故障分析
- 更容易迁移到不同机器人平台

## 论文信息

- **标题**: TiPToP: A Modular Open-Vocabulary Planning System for Robotic Manipulation
- **作者**: William Shen, Nishanth Kumar, Sahit Chintalapudi, Jie Wang, Christopher Watson, Edward Hu, Jing Cao, Dinesh Jayaraman, Leslie Pack Kaelbling, Tomas Lozano-Perez
- **机构**: MIT CSAIL, University of Pennsylvania
- **arXiv**: [2603.09971](https://arxiv.org/abs/2603.09971)
- **项目主页**: [tiptop-robot.github.io](https://tiptop-robot.github.io)
- **论文类型**: 机器人操作 / 模块化系统 / 任务与运动规划

## 1. 问题设定与动机

论文研究的是一个非常实际的操作设定：

- 输入：一对双目 RGB 图像和一条语言指令
- 输出：完成任务所需的机器人关节轨迹和夹爪命令

目标并不只是简单抓取放置，而是覆盖了：

- 有大量干扰物的目标选择
- 像“matching plate”或“largest toy”这样的语义指代理解
- 需要移开障碍或装箱的多步操作

作者将 TiPToP 与一个很强的基线进行比较：**pi0.5-DROID**，它是在 **350 小时**同构机器人示范数据上微调得到的 vision-language-action 模型。

论文的动机很清楚：

- 端到端 VLA 很吸引人，但数据成本高，而且难以调试
- 经典 TAMP 有结构化优势，但过去通常太脆弱、太依赖特定工程实现
- 现在基础模型的感知能力变强了，模块化规划值得重新认真做一遍

## 2. 系统概览

TiPToP 被拆成三个模块：

1. **感知**
2. **规划**
3. **执行**

整个策略是以规划器为核心的。系统只在开始时观察一次场景，然后执行一条开环计划。

### 2.1 感知模块

感知模块根据初始双目观测和语言指令，构建一个以物体为中心的场景表示。

其中两条分支并行运行：

- **3D 视觉分支**负责深度和抓取生成
- **语义分支**负责物体检测、分割与目标语义落地

关键组件包括：

- **FoundationStereo**：双目深度估计
- **M2T2**：6-DoF 抓取候选生成
- **Gemini Robotics-ER 1.5**：开放词表物体检测与符号目标生成
- **SAM-2**：实例分割

最终输出是一组逐物体网格、候选抓取以及符号目标谓词。

### 2.2 规划模块

规划由 **cuTAMP** 完成，它是一个 GPU 并行化的任务与运动规划器。

给定符号目标后，TiPToP 会：

- 枚举候选计划骨架
- 采样抓取、放置、逆解和轨迹
- 在碰撞与可行性约束下优化连续参数
- 调用 **cuRobo** 生成无碰撞运动轨迹

这其实就是论文最核心的工程观点：与其希望一个策略隐式“学会”长时程结构，不如把这个结构**显式建模出来**。

### 2.3 执行模块

机器人通过关节阻抗控制器来跟踪规划出的轨迹。

这使得轨迹跟踪精度成为系统成败的关键。由于 TiPToP 在执行阶段不会重新规划，一旦发生抓取滑落、抓空或物体意外移动，就可能直接导致失败。

## 3. 真正关键的技术点

有几处实现细节看似朴素，但实际上非常重要。

### 3.1 从像素到符号目标

TiPToP 并不是只让 VLM 生成文字描述或物体标签，而是让它直接输出像 `On(a, b)` 这样的符号目标。

这一点非常重要，因为规划器随后就可以显式推理：

- 哪些物体与任务相关
- 需要满足哪些关系
- 该使用怎样的多步动作序列

这正是系统能够处理颜色分类、匹配容器等任务的关键。

### 3.2 基于凸包的物体补全

每个分割出的物体都会通过向下投影观测点并取凸包的方式，被转换成一个封闭网格。

这是一个很务实的设计：

- 计算便宜
- 对碰撞检测来说偏保守
- 但对香蕉这类凹形或细长物体会带来明显误差

论文中的失败分析也表明，这种几何近似是系统的重要短板之一。

### 3.3 开环规划的利弊

TiPToP 只在开始时看一次场景，然后开环执行。

这样做的好处是：

- 任务完成速度快
- 规划与执行之间的几何假设更一致

但代价也很明显：

- 抓取失败后无法恢复
- 搬运中物体滑落后无法纠正
- 对突发场景变化没有适应能力

论文对此没有回避，而是明确指出这正是当前系统最重要的限制。

## 4. 实验结果

实验覆盖 **28 个任务**、**165 次试验**，场景包括：

- 仿真环境
- 作者自己的 DROID 平台
- 外部评测团队的 DROID 平台

任务被分成四类：

- simple
- distractor
- semantic
- multi-step

### 4.1 与 pi0.5-DROID 的主结果比较

最核心的总结果是：

- **TiPToP**: `98/165` 成功，**74.6%**
- **pi0.5-DROID**: `55/165` 成功，**52.4%**

真正值得注意的不是 TiPToP 在所有任务上都赢了，它并没有。

更准确的结论是：

- 在 **simple** 任务上，两者比较接近
- 在 **distractor** 任务上，TiPToP 明显更强
- 在 **semantic** 任务上，TiPToP 明显更强
- 在 **multi-step** 任务上，TiPToP 同样明显更强

这和架构本身是高度一致的：

- VLM 的目标语义落地让它更擅长复杂指代与干扰物筛选
- TAMP 让它更擅长多步结构和碰撞约束推理
- 端到端闭环控制则仍然在脆弱抓取与执行恢复上有优势

### 4.2 成功耗时

在成功案例上，TiPToP 往往也比 VLA 基线更快。

例如 Table II 中：

- `can -> mug (sim)`: **18.6s** vs **41.0s**
- `crackers -> tray (simple)`: **14.9s** vs **32.2s**
- `crackers -> tray (medium)`: **14.9s** vs **45.2s**

原因也很直接：TiPToP 先规划好，再直接执行；而闭环 VLA 往往需要多次试探、补抓或者出现明显停顿。

## 5. 失败分析

这部分是全文最有说服力的内容之一。

作者额外分析了 **173 次真实世界试验**，并把失败追溯到具体模块。主要类别是：

- **抓取失败**: `31 / 55`
- **场景补全错误**: `13 / 55`
- **VLM 错误**: `6 / 55`
- **cuTAMP 失败**: `5 / 55`

最大的结论是：**当前剩余误差主要来自抓取和执行鲁棒性，而不是高层规划本身**。

也就是说，系统当前更大的问题在于：

- 抓取提议质量不稳定
- 搬运中物体滑落
- 部分观测导致的网格近似错误
- 执行阶段没有视觉反馈

这恰恰说明模块化系统的优势所在：它让研究者可以真正定位瓶颈。

## 6. 为什么这篇论文值得看

我认为这篇论文提出了三个很有价值的观点。

### 6.1 模块化系统依然有竞争力

现在很流行的一种叙事是，大模型端到端策略最终会吞掉全部机器人架构。TiPToP 给出了一个具体而有力的反例：只要任务结构足够重要，显式规划依然非常强。

### 6.2 可调试性本身就是研究价值

由于系统是分解的，作者可以清楚判断失败来自：

- 感知
- 网格补全
- 抓取生成
- 规划
- 执行

这比只汇报一个任务级成功率更能指导后续研究。

### 6.3 跨机器人平台迁移很重要

论文还展示了在 **UR5e** 和 **WidowX AI** 上的部署。这一点很关键，因为很多机器人系统只在单一封闭平台上表现强。TiPToP 试图建立一种可复用的接口，把感知、规划和平台相关执行明确分开。

## 7. 局限性

这篇论文很强，但局限也很明确。

- **开环执行** 是最主要的弱点，很多失败本来有机会通过重新感知和重新规划恢复。
- **单视角感知** 限制了可见性和网格质量。
- **凸包几何近似** 对凹形物体太粗糙，会影响碰撞推理。
- 系统仍然依赖一整套较重的外部基础模型。
- 如果要扩展到更丰富的操作技能，还需要更强的低层控制器和更完善的动作抽象模型。

## 8. 总结

我对这篇论文的总体判断是：**TiPToP 不只是一个操作系统实现，更像是在当前基础模型时代重新为“规划”争取了一次有说服力的位置。**

它表明，一个系统可以同时做到：

- 开放词表
- 低数据依赖
- 可解释
- 跨平台相对容易迁移

并且仍然在长时程桌面操作任务上取得很强的表现。

如果只用一句话概括这篇论文，我会说：

**基础模型的感知能力已经强到足以重新喂养规划器，因此显式规划在现代机器人系统里再次变得值得。**

</div>
