---
title: "[Paper Notes] Embodied Playground: A Long-Horizon Agentic Robotics Benchmark for Physical, Strategic, and Spatial Reasoning"
date: 2026-11-03
permalink: /posts/2026/11/embodied-playground-paper-notes/
excerpt: "Embodied Playground evaluates coding agents across 410 simulated task–embodiment combinations, with trajectory-level validity checks and an audit of rule-disclosure gaps."
tags:
  - Paper Notes
  - Robot Agents
  - Benchmark
  - Long-Horizon Manipulation
  - Task Planning
  - Dexterous Manipulation
  - Bimanual Manipulation
  - Simulation
---

<div data-lang="en" markdown="1">

## TL;DR

Solving a Hanoi puzzle requires a legal sequence of moves. Executing that solution with a robot also requires grasping each ring, clearing the peg, placing it correctly, and leaving it stable. **Embodied Playground** evaluates this connection between planning and physical execution across 410 simulated task–embodiment combinations. Its EP-100 selection contains 100 tasks in five suites.

The benchmark's strongest contribution is its explicit episode contract: success depends on the final goal, the interaction history, and physical validity. The initial results need care. In the authors' audit, 574 of 645 scored GPT-6-Astra failures involved incompletely disclosed rules or thresholds. These remain failures in the scores, but they limit what those scores establish about reasoning ability.

## Paper and reading version

**Embodied Playground: A Long-Horizon Agentic Robotics Benchmark for Physical, Strategic, and Spatial Reasoning**, by Feng Chen, Pei Zhou, Lixuan He, Yunchao Yao, Li Sun, Shenghua Gao, Mingyu Ding, Kaifeng Zhang, Kaichen Zhou, and Yi Ma. These notes use the 38-page [arXiv v2 preprint](https://arxiv.org/abs/2610.27039v2), revised October 25, 2026, checked on November 3, 2026. [PDF](https://arxiv.org/pdf/2610.27039v2) · [Project website](https://winniechen2002.github.io/Agent-bench-website/)

## The task continues after a correct plan

The collection couples three demands. Spatial reasoning determines feasible poses and paths: a lock piece must face the right way, and a ring must align with its peg. Physical reasoning predicts how contact, friction, and motion affect the scene. Strategic reasoning handles dependencies: a legal move or an indirect projectile impact changes what becomes possible next. The task families make these demands observable within the same episode, although they do not experimentally isolate the three abilities.

The 410 entries count **task configurations paired with robot embodiments**. For example, 40 Hanoi configurations instantiated with three embodiments produce 120 entries. Extra seeds are trial conditions within an entry. The collection contains 100 launcher, 120 Hanoi, 20 pocket-cube, 60 Rubik's-cube, 60 Kongming-lock, 20 bookshelf, and 30 ManiSkill environments. Launcher tasks use MuJoCo; puzzles and bookshelf tasks use Isaac Lab; the remaining household, geometry, and dynamics tasks use ManiSkill. [§3, Tables 1–2](https://arxiv.org/pdf/2610.27039v2#page=5)

EP-100 selects 34 Launch, 21 Tower, 16 Lock, 12 Cube, and 17 Home tasks, covering 16 task types. Parallel grippers receive most slots; dexterous hands receive smaller samples from easier native configurations. EP-Easy and EP-Hard each contain 50 tasks, ranked within task type by workload quantities such as legal move count or scramble length. EP-20 selects ten tasks from each split. Five of its hard tasks have pilot success evidence on the same or related scenes, making it a compact diagnostic selection with a different sampling rationale from the workload split.

## Code, feedback, and the boundary of assistance

The shared interface has four operations: `describe` exposes task and control specifications, `observe` returns authorized observations, `step` executes robot actions, and `finish` ends the episode. The agent writes, runs, and revises control code using execution feedback. Observation reads do not advance simulated time. Physical time advances through actions, while a separate wall-clock budget includes deliberation and startup.

The access hierarchy is cumulative. L0 permits code, RGB, proprioception, calibration, public task parameters, and self-written algorithms. L1 makes explicitly granted perception and planning tools eligible; L2 adds pretrained grasp or contact models; L3 adds selected read-only simulator state. Each run must still declare its actual grants. An L3 label alone does not imply that every lower-level tool is installed or available. Privileged observations preserve the action interface and task rules. [§§3.1, 5.1](https://arxiv.org/pdf/2610.27039v2#page=9)

The reported experiment uses L3 with Python's standard library, NumPy, and Pillow, without auxiliary tool grants, reference solutions, or pretrained action controllers. Model weights remain frozen. Consequently, this is an evaluation of coding agents with privileged observations and online program revision; it supplies no controlled comparison of L0 versus L3 or of alternative controllers.

## Success includes release, stability, and earlier violations

A useful schematic of the evaluator is

$$
\text{success}=\text{goal satisfied}\land\text{history valid}\land\text{physical conditions satisfied}\land\text{within budget}.
$$

This is a summary of §5.4, not an additional equation from the paper. Recorded violations remain binding. A correct final arrangement cannot erase an illegal earlier action, and calling `finish` grants no extra settling time.

The settling conditions are task-specific. Hanoi requires legal moves, correct seating, and one second of stability. Rubik's cube requires a solved physical configuration, legal fixture use, return and release, and a fresh 0.5-second stability window. Kongming-lock assembly requires release followed by two seconds of stability. Protected-target launcher tasks require at least three seconds of observation after the last required target hit. These requirements make termination part of control: the agent must release and observe long enough to establish success before exhausting its budget. [§5.4](https://arxiv.org/pdf/2610.27039v2#page=11)

The Rubik's-cube interface also includes declared support, grasp-attachment, and layer-control fixtures. Its results should be interpreted under those mechanics. They do not directly measure unrestricted in-hand cube manipulation.

## Four conditions and two attempts are different axes

EP-100 has four prescribed conditions per task, giving 400 task–condition pairs. Perturbations depend on the family: launcher conditions change spring stiffness and other scene factors, while Rubik's cube, locks, and ManiSkill retain authored physical configurations and vary lighting. Launcher evaluation uses loaded initialization, with the first projectile already loaded; later reloads remain the agent's responsibility.

The experiment scores up to two valid attempts per condition, stopping at the first success. Ordinary failures and budget exhaustion consume an opportunity; confirmed infrastructure incidents do not. This experiment extends the base protocol, whose treatment of invalid or missing slots leaves final group metrics undefined. Mixing the two rules would change the denominator.

For subset $D$, the experiment reports

$$
\operatorname{Pass@}k(D)=\frac{1}{5}\sum_{s=1}^{5}\frac{1}{|D_s|}\sum_{\tau\in D_s}\frac{1}{4}\sum_{i=1}^{4}p^{(k)}_{\tau,i},\quad k\in\{1,2\},
$$

where $p^{(k)}_{\tau,i}$ indicates observed success within the first $k$ eligible attempts. Each suite receives one fifth of the total weight, despite its different task count. Pass@2 is calculated from recorded attempts. [§6.1, Eq. 3](https://arxiv.org/pdf/2610.27039v2#page=13)

## Reported performance and its limits

The following values reproduce Table 5's suite-balanced percentages. GPT-6-Astra uses high reasoning effort; Opus-5.5-extra uses extra reasoning effort. Each attempt has a declared allowance of 30 million tokens including cached input and 100 images, alongside the family-specific physical and wall-clock budgets.

| Subset | Astra Pass@1 | Astra Pass@2 | Opus Pass@1 | Opus Pass@2 |
| --- | ---: | ---: | ---: | ---: |
| EP-100 | 13.80% | 19.94% | 29.22% | 35.85% |
| EP-Easy | 18.42% | 27.41% | 33.99% | 42.88% |
| EP-Hard | 8.81% | 12.01% | 24.21% | 28.48% |
| EP-20 | 15.42% | 18.75% | 30.58% | 39.13% |

For Astra, 64 of 400 conditions succeed on the first attempt, with 27 additional successes on the second. The pooled rates are therefore 16.00% and 22.75%; suite weighting produces the headline 13.80% and 19.94%. Only nine tasks succeed under all four conditions within the two-attempt allowance. Occasional completion and repeatable completion remain far apart. [Tables 5–7](https://arxiv.org/pdf/2610.27039v2#page=14)

There is also an internal reporting discrepancy worth preserving when reusing these results. Table 7 lists 20 successful Opus Lock conditions out of 64, which gives 31.25% under the stated equal-condition aggregation. Table 6 reports 45.63% for that suite's EP-100 Pass@2. The headline values above are quoted as reported; the supplied tables do not fully reconcile, so they should not be treated as independently reproduced scores.

The more consequential attribution issue is the disclosure audit. Of Astra's 645 scored failed attempts, **574 (88.99%)** involve incomplete rule or threshold disclosure, including launcher joint-speed margins, forbidden-contact thresholds in Lock, and fixed-joint tolerances in Cube. The paper distinguishes missing numerical tolerances from undisclosed obligations. These findings neither establish that all affected attempts would otherwise succeed nor justify attributing all failures to the model. They call for reruns with complete public contracts. Diagnostic labels can overlap, and a contact or penetration label identifies a recorded event without proving its underlying cause. [§6.3](https://arxiv.org/pdf/2610.27039v2#page=15)

The audit also excludes 69 confirmed infrastructure records and 41 extra attempts from Astra's scoring window. Separate sessions and directories are documented, but complete cache clearing and simulator-state independence are not certified. Successful-attempt timing excludes earlier failures, and complete provider token usage is unavailable. These conditions constrain comparisons of both reliability and cost.

## What I would carry into a robot-agent evaluation

The most reusable design is a task contract that makes intermediate legality, release, and stability machine-checkable. For an agent that generates control programs, each stage needs a precondition, an observable completion test, and a recovery path that respects violations already recorded. A symbolic plan supplies only part of that program.

My first follow-up experiment would disclose every relevant rule and tolerance, then hold the controller, task conditions, and attempt budget fixed while changing observation access or feedback. That would help separate errors in state estimation, action selection, and physical execution. The current simulation benchmark provides a useful setting for this experiment; its reported comparison does not yet isolate those contributions or establish real-robot transfer.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

解出汉诺塔需要合法的移动序列；让机器人执行这个解，还需要抓住圆环、越过柱子、准确放置，并让它保持稳定。**Embodied Playground** 用 410 个仿真任务与机器人形态组合，评估规划和物理执行之间的衔接。其中 EP-100 选取了五个套件中的 100 个任务。

这项工作的主要价值是明确整段执行的判定条件：成功取决于最终目标、交互历史和物理有效性。初步结果需要谨慎解读。作者审计发现，GPT-6-Astra 的 645 次计分失败中，有 574 次涉及规则或阈值披露不完整。这些记录仍计为失败，但限制了分数对推理能力的解释力。

## 论文与阅读版本

**Embodied Playground: A Long-Horizon Agentic Robotics Benchmark for Physical, Strategic, and Spatial Reasoning**，作者为 Feng Chen、Pei Zhou、Lixuan He、Yunchao Yao、Li Sun、Shenghua Gao、Mingyu Ding、Kaifeng Zhang、Kaichen Zhou 和 Yi Ma。本文依据 2026 年 10 月 25 日修订的 38 页 [arXiv v2 预印本](https://arxiv.org/abs/2610.27039v2)，于 2026 年 11 月 3 日核对。[PDF](https://arxiv.org/pdf/2610.27039v2) · [项目主页](https://winniechen2002.github.io/Agent-bench-website/)

## 正确规划之后，任务仍在继续

这组任务把三种要求结合起来。空间推理决定可行的位姿和路径：锁块需要朝向正确，圆环需要对准柱子。物理推理预测接触、摩擦和运动如何改变场景。策略推理处理动作依赖：一次合法移动或间接撞击，会改变后续可选动作。这些任务让三种需求在同一执行过程中显现，但并没有通过受控实验把三种能力单独分离出来。

410 个条目指的是**任务配置与机器人形态的组合**。例如，40 种汉诺塔配置搭配三种形态，得到 120 个条目；额外随机种子属于条目内部的试验条件。完整集合包含 100 个发射器、120 个汉诺塔、20 个二阶魔方、60 个三阶魔方、60 个孔明锁、20 个书架和 30 个 ManiSkill 环境。发射器使用 MuJoCo，拼图与书架使用 Isaac Lab，其余家务、几何和动力学任务使用 ManiSkill。[§3、表 1–2](https://arxiv.org/pdf/2610.27039v2#page=5)

EP-100 分别选取 Launch 34 个、Tower 21 个、Lock 16 个、Cube 12 个、Home 17 个任务，覆盖 16 种任务类型。平行夹爪占多数，灵巧手从各自较容易的原生配置中选取较少样本。EP-Easy 和 EP-Hard 各有 50 个任务，按同类型内部的工作量排序，例如合法移动次数或魔方打乱长度。EP-20 从两组各取十个任务；其中五个困难任务在相同或相近场景的先导实验中有过成功记录。因此，EP-20 是便于快速诊断的精选集合，其取样依据与工作量划分不同。

## 代码、反馈与辅助能力的边界

统一接口包含四个操作：`describe` 提供任务与控制规格，`observe` 返回获准观测，`step` 执行机器人动作，`finish` 结束当前回合。智能体依据执行反馈编写、运行和修改控制代码。读取观测不会推进仿真时间；动作推进物理过程，独立的墙钟时间预算则包含推理和启动耗时。

访问权限逐级累积。L0 允许代码、RGB、本体状态、标定信息、公开任务参数和自行编写的算法；L1 允许显式授权的感知与规划工具；L2 增加预训练抓取或接触模型；L3 增加指定的只读仿真状态。每次运行仍需列出实际授权工具，L3 标签本身不表示所有低等级工具都已安装或可用。特权观测不改变动作接口和任务规则。[§3.1、§5.1](https://arxiv.org/pdf/2610.27039v2#page=9)

论文实验采用 L3，提供 Python 标准库、NumPy 和 Pillow，没有额外工具授权、参考解或预训练动作控制器，模型权重保持冻结。因此，这项实验评估的是获得特权观测、能够在线修改程序的编码智能体；它没有提供 L0 与 L3 或不同控制器之间的受控比较。

## 成功还包括释放、稳定和历史违规

可以把评估器概括为：

$$
\text{success}=\text{goal satisfied}\land\text{history valid}\land\text{physical conditions satisfied}\land\text{within budget}.
$$

这是对 §5.4 的整理，并非论文新增的公式。已记录的违规始终有效，最终布局正确无法消除先前非法操作；调用 `finish` 也不会额外提供等待物体稳定的时间。

稳定条件随任务变化。汉诺塔要求移动合法、圆环正确就位，并稳定一秒。三阶魔方要求物理状态复原、辅助装置使用合法、归位释放，再满足一个新的 0.5 秒稳定窗口。孔明锁装配要求释放后稳定两秒。需要保护目标的发射任务，在最后一次命中必要目标后，还需观察至少三秒。这些要求把终止判断纳入控制：智能体必须在预算耗尽前完成释放，并观察足够长的时间来确认成功。[§5.4](https://arxiv.org/pdf/2610.27039v2#page=11)

三阶魔方接口还提供了明确声明的支撑、抓取附着和层转动辅助装置。解读结果时需要保留这些机制条件，不能直接将其等同于不受辅助约束的手内魔方操作能力。

## 四个条件与两次尝试是两个维度

EP-100 每个任务有四个指定条件，共 400 个任务—条件组合。扰动方式取决于任务族：发射器改变弹簧刚度等场景因素，三阶魔方、孔明锁和 ManiSkill 则保留原定物理配置、改变光照。发射任务统一从第一发已装填的状态开始；多次射击所需的后续装填仍由智能体完成。

实验对每个条件最多计入两次有效尝试，首次成功后停止。普通失败和预算耗尽会消耗机会，确认的基础设施事故不消耗机会。这扩展了基础协议：在基础协议中，无效或缺失槽位会使最终分组指标保持未定义。混用两套规则会改变统计分母。

对于子集 $D$，实验使用：

$$
\operatorname{Pass@}k(D)=\frac{1}{5}\sum_{s=1}^{5}\frac{1}{|D_s|}\sum_{\tau\in D_s}\frac{1}{4}\sum_{i=1}^{4}p^{(k)}_{\tau,i},\quad k\in\{1,2\},
$$

其中 $p^{(k)}_{\tau,i}$ 表示前 $k$ 次符合计分条件的尝试内是否实际成功。五个套件各占总分的五分之一，不受任务数量差异影响。Pass@2 直接来自尝试记录。[§6.1、公式 3](https://arxiv.org/pdf/2610.27039v2#page=13)

## 报告结果与解释边界

下表转录表 5 的套件等权百分比。GPT-6-Astra 使用 high reasoning effort，Opus-5.5-extra 使用 extra reasoning effort。除各任务族的物理时间和墙钟预算外，每次尝试声明允许 3000 万 token（含缓存输入）和 100 张图像。

| 子集 | Astra Pass@1 | Astra Pass@2 | Opus Pass@1 | Opus Pass@2 |
| --- | ---: | ---: | ---: | ---: |
| EP-100 | 13.80% | 19.94% | 29.22% | 35.85% |
| EP-Easy | 18.42% | 27.41% | 33.99% | 42.88% |
| EP-Hard | 8.81% | 12.01% | 24.21% | 28.48% |
| EP-20 | 15.42% | 18.75% | 30.58% | 39.13% |

Astra 首次尝试解决了 400 个条件中的 64 个，第二次尝试再增加 27 个。直接合并条件的成功率是 16.00% 和 22.75%；经过套件等权计算后，得到摘要中的 13.80% 和 19.94%。即使每个条件允许两次尝试，也只有九个任务在四个条件下全部成功。偶尔完成与稳定完成之间仍有明显差距。[表 5–7](https://arxiv.org/pdf/2610.27039v2#page=14)

复用这些结果时，还需要保留一处论文内部的统计不一致。表 7 列出 Opus 在 Lock 中成功 20 个条件，总数为 64；按声明的条件等权聚合，应得到 31.25%。表 6 给出的该套件 EP-100 Pass@2 却为 45.63%。上表保留作者报告的数值；现有表格不能完全相互核对，因此不能把这些数值当作已经独立复算通过的结果。

更影响能力归因的是规则披露审计。Astra 的 645 次计分失败中，**574 次（88.99%）**涉及规则或阈值披露不完整，包括发射器关节速度裕量、Lock 的禁止接触阈值、Cube 的固定关节完整性容差。论文区分了数值容差缺失和任务义务未披露。这既不能证明受影响的尝试本来都会成功，也不足以把全部失败归因于模型；需要在完整公开判定条件后重新评测。诊断标签可以重叠，接触或穿透标签只能确认记录到的事件，无法单独证明其成因。[§6.3](https://arxiv.org/pdf/2610.27039v2#page=15)

审计还将 69 条确认的基础设施事故记录和 41 次窗口外额外尝试排除在 Astra 计分范围外。记录支持会话与目录相互隔离，但并未证明缓存完全清空或仿真状态完全独立。成功尝试耗时不包含先前失败成本，完整的服务商 token 用量也不可得。这些条件同时限制了可靠性和成本比较。

## 我会怎样借用这套评测设计

最值得复用的是把中间状态合法性、释放和稳定要求写成可执行的任务判定条件。对于生成控制程序的智能体，每个阶段都需要前置条件、可观测的完成测试，以及尊重既有违规记录的恢复路径。符号规划只提供了程序的一部分。

我的第一项后续实验会先公开所有相关规则和容差，再固定控制器、任务条件与尝试预算，只改变观测权限或反馈方式。这样更有助于区分状态估计、动作选择和物理执行各自造成的误差。当前仿真基准为这类实验提供了环境，但现有比较尚未分离这些贡献，也没有证明向真实机器人的迁移效果。

</div>
