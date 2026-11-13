---
title: "[Paper Notes] HexaShell: A Universal Harness for Robot Coding Agents in Simulation and the Real World"
date: 2026-11-14
permalink: /posts/2026/11/hexashell-robot-coding-agents-paper-notes/
excerpt: "HexaShell fixes one 14-tool robot API while a VLM writes one Python cell per turn. SAM 3 and calibrated geometry supply positions, and a short reviewed skill adds task knowledge without task-specific code."
tags:
  - Paper Notes
  - Robot Learning
  - Vision-Language Models
  - Coding Agents
  - Robot Manipulation
  - Sim-to-Real
---

<div data-lang="en" markdown="1">

**HexaShell** treats the interface between a coding agent and a robot as the main object of study. The agent writes one Python cell per turn, reads the printed result and images, then decides what to run next. The same motion, perception and state tools remain available across tasks; a new simulator or robot changes the adapter and world prompt, not the agent loop. Short natural-language task skills can be added later, but the fixed code stays the same.

Hongcheng Gao, Jianshu Zeng, Alex Zhou, Shijia Ge, Xuan Shangguan, Yazhe Wang, Yexing Wan, Zelin Zheng, Jay Zhu, Xiping Li, Di Wu, Yongli Wang, Lingyu He, Zhiqi Jia, Sihang Wu and Xiao He. [arXiv:2610.23479v3](https://arxiv.org/abs/2610.23479v3), November 3, 2026 · [Code](https://github.com/HexaFuture/HexaShell) · [Project page](https://hexafuture.ai/home/)

### Fourteen tools and one small loop

The robot API has 14 basic calls. Four consume simulation steps: `goto`, `gripper`, `home` and `wait`. Five perception calls do not: `look`, `find`, `measure`, `to_world` and `to_pixel`. Five state calls expose the instruction, step budget, arms, grippers, previously measured objects, images and camera parameters. The agent writes code in a sandbox with NumPy and OpenCV, but has no network or subprocess access and can touch only workspace files.

The split between model and geometry is deliberate. SAM 3 turns a short phrase, point or box into object masks. When several calibrated cameras see the same object, their rays define a visual hull; a fitted footprint gives the object centre, size and grasp yaw. With RGB-D, the same measurements use depth. `measure` returns an uncertainty estimate and puts warnings first. If one view cannot determine height, it suggests a wrist-camera pose for a second look.

This gives the VLM work it can do well. It decides which object to inspect, when to ask for another view and what order of operations makes sense. It also decides when a failed motion requires a new approach. Pixel-to-metre estimation stays in deterministic geometry. The interface reports measured results back into the same Python turn, which preserves the coding-agent pattern: run a small experiment, inspect the result, revise the next cell.

### A skill is guidance, not a private toolset

The optional task skill is a Markdown page with five sections: what counts as completion, the successful flow, measured parameters, common failures and typical step costs. A person reviews every skill. A checking script prevents simulator positions, internal object names and checker thresholds from entering the text. The median skill has 39-61 lines, and only three of 205 skills contain code.

The paper compares this arrangement with an earlier variant that wrote and repaired task-specific Python tools. That version ran for up to 12 hours per task and accumulated 327 commands in roughly 78,000 lines after 769 optimization rounds. On the official RoboDojo evaluation it reached 46.9% success and a 53.2 score. HexaShell with its shared tools and short skills reached 85.0% and 88.8 in the authors' own test run. These use different episodes, so the comparison is not a clean causal estimate. The sharper paired result is on the authors' RoboDojo episodes: outside Open, 234 episodes succeeded only with skills and 37 only without.

### Results across four simulators

The same API, sandbox and agent loop were tested on four public benchmark families. The table reports the paper's own evaluations, not every official benchmark protocol.

| Benchmark | No task skills | With task skills |
|---|---:|---:|
| RoboDojo | 69.9% success, 75.7 score | 85.0% success, 88.8 score |
| RoboCasa365 | 59.3% | 85.6% |
| LIBERO-PRO | 78.3% | 96.7% |
| RoboTwin 2.0, randomized | 82.2% | 96.8% |

On RoboDojo, the no-skill result is especially relevant to the harness question. The earlier RoboProbe agent with the same GPT-6 Astra model reached 22.48% official average success using a lean direct-action interface. HexaShell reports 69.9% success on 30 public test episodes per task and three seeds, with score computed from the same task dimensions. The gap shows how much tool semantics, perception support and control commands affect the apparent capability of a VLM agent. The runs differ in interface and evaluation episodes, so this is evidence of a large system effect, not a controlled estimate of exactly how much each component contributes.

With skills, the paper reports 76 successes in 90 real dual-arm episodes across nine tasks. Three PiPER-X robots used head and wrist RGB-D cameras, a 907-line adapter and URAI collision-checked motion planning. Object detection did not use SAM 3 on the real robots; the model read pixels from the images and converted them with depth. GPT-6.1-Terra wrote the code for the nine tasks, while GPT-6-Astra judged the episodes because no external checker was available. Those facts limit how strongly the real-robot result supports autonomous closed-loop performance.

### What still fails

HexaShell moves most of the remaining difficulty below task interpretation. With skills, 153 of 1,020 non-Open RoboDojo episodes contained a slip. Those episodes succeeded 46% of the time, versus 91% when no slip occurred. Store Tools in Toolbox failed every episode as a long object rotated out of a central pinch during lifting. Better grasping and motion control would improve several tasks at once, and a task skill cannot repair a grasp that the lower-level API cannot achieve.

The paper is explicit about several evidence limits. Test runs use fewer episodes than official protocols. The RoboCasa365 entry is an agent-track submission based on the authors' evaluation, not the official main track. The contribution of SAM 3 and geometry has not been isolated by disabling them. Skill creation needs a few runs and a human review, and the minimum number remains unmeasured. Real-robot trials are few and use a model-assisted judge.

### Why the harness is the contribution

The paper shifts attention from generating more task code to making a stable interface that returns useful evidence. Tools such as `measure`, `to_world` and `dry_run` turn a visual task into a sequence of checkable geometric operations. A short skill can supply contact-sensitive parameters and completion criteria that general perception cannot infer, while remaining readable and auditable.

For practice, this suggests separating three budgets: the general robot API, the task-level guidance and the controller beneath it. My next tests would compare the same model and episodes with SAM 3 and geometry disabled, vary skill authorship, and measure how often the agent recovers after a reported uncertainty or blocked motion. Those experiments would show which parts make the harness transferable and which gains still come from human task knowledge.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**HexaShell** 把编码智能体与机器人之间的接口本身作为研究对象。智能体每轮写一段 Python cell，读取打印结果和图像，再决定下一段代码。运动、感知和状态工具在所有任务间复用；换到新的仿真器或机器人时，只需要修改适配器和世界描述，agent loop、sandbox 与 API 保持不变。任务技能可以在后续加入，但不会变成每个任务一套代码。

作者为 Hongcheng Gao、Jianshu Zeng、Alex Zhou、Shijia Ge、Xuan Shangguan、Yazhe Wang、Yexing Wan、Zelin Zheng、Jay Zhu、Xiping Li、Di Wu、Yongli Wang、Lingyu He、Zhiqi Jia、Sihang Wu 和 Xiao He。[arXiv:2610.23479v3](https://arxiv.org/abs/2610.23479v3)，2026 年 11 月 3 日 · [代码](https://github.com/HexaFuture/HexaShell) · [项目页](https://hexafuture.ai/home/)

### 十四个工具与一个短循环

机器人 API 共有 14 个基本调用。四个会消耗仿真步数：`goto`、`gripper`、`home` 和 `wait`。五个感知调用不消耗步数：`look`、`find`、`measure`、`to_world` 和 `to_pixel`。五个状态调用提供任务、剩余步数、机械臂与夹爪状态、已经测量的物体、图像和相机参数。智能体在 sandbox 中使用 NumPy 和 OpenCV 写代码，但没有网络与子进程权限，只能访问工作区文件。

模型和几何计算的分工很清楚。SAM 3 根据短语、点或框产生物体 mask。多个已标定相机同时看到物体时，对应视线形成 visual hull；再对俯视轮廓拟合旋转矩形，就能得到中心、尺寸和抓取角度。RGB-D 场景则直接使用深度。`measure` 会返回误差估计，并把警告放在输出最前面。当单一视角无法确定高度时，它会建议一个腕部相机位姿来补看。

这样安排把适合 VLM 的工作留给模型。模型决定查看哪个物体、什么时候补视角、动作顺序是否合理，以及动作失败后是否需要换方案。像素到米制坐标的估计交给确定性几何。工具把测量结果返回同一轮 Python 执行，延续了编码智能体的典型循环：运行小实验、读取结果、修改下一段代码。

### 技能是一页说明，不是私有工具集

可选的任务技能是一页 Markdown，包含五部分：完成条件、成功流程、已验证参数、常见失败与修正方法、典型步数开销。每份技能都有人审阅。检查脚本禁止把仿真器中的真实位置、内部物体名称和 checker 阈值写进去。技能中位长度为 39-61 行，205 份技能里只有三份包含代码。

论文把这种设计与早期版本作对比。早期版本会为每个任务编写和修复 Python 工具，每个任务最多优化 12 小时，769 轮优化后积累了 327 个命令，约 78,000 行代码。它在 RoboDojo 官方评测中得到 46.9% 成功率和 53.2 分。HexaShell 的共享工具加短技能在作者自测中得到 85.0% 和 88.8 分。两组实验使用不同 episode，不能当作干净的单变量比较。更明确的配对结果是作者自己的 RoboDojo 数据：在 Open 以外的任务中，234 段 episode 只在有技能时成功，37 段只在无技能时成功。

### 四个仿真 benchmark 上的结果

作者在四组公开 benchmark 上使用同一 API、sandbox 和 agent loop。下表是论文自己的评测，并非所有项目都采用官方完整协议。

| Benchmark | 无任务技能 | 有任务技能 |
|---|---:|---:|
| RoboDojo | 69.9% 成功率，75.7 分 | 85.0% 成功率，88.8 分 |
| RoboCasa365 | 59.3% | 85.6% |
| LIBERO-PRO | 78.3% | 96.7% |
| RoboTwin 2.0，随机场景 | 82.2% | 96.8% |

RoboDojo 的无技能结果与 harness 问题直接相关。RoboProbe 使用相同 GPT-6 Astra 和精简的直接动作接口，官方平均成功率为 22.48%。HexaShell 每个任务使用 30 个公开测试 episode、三个 seed，报告 69.9% 成功率。这个差距说明工具语义、感知支持和动作指令会显著改变 VLM agent 的表现。两次运行使用不同接口和测试 episode，因此它支持“系统设计影响很大”的判断，不能精确拆出每个组件的贡献。

加入技能后，作者在九个任务、90 段双臂真机试验中成功 76 次。三台 PiPER-X 使用头部和腕部 RGB-D 相机，907 行适配器把动作交给 URAI 做碰撞检查与执行。真机没有 SAM 3，模型从图像中读出像素，再用深度转换到三维点。九个任务的代码由 GPT-6.1-Terra 编写，因为没有外部 checker，episode 由 GPT-6-Astra 判定。这些条件限制了真机结果对自主闭环能力的支持力度。

### 仍然失败在哪里

HexaShell 把剩余困难更多推到任务解释之下。有技能时，Open 以外的 1,020 段 RoboDojo episode 中有 153 段发生物体滑落，这些 episode 的成功率为 46%，没有滑落的 episode 为 91%。Store Tools in Toolbox 在所有 episode 中失败，长工具在抬升时绕中部夹持点旋转并滑出。更可靠的抓取与运动控制会同时改善多个任务，任务技能无法修复底层 API 做不到的抓取。

论文也明确列出证据边界。测试 episode 少于官方协议；RoboCasa365 结果是基于作者自评的 agent-track 提交，不属于官方主赛道；关闭 SAM 3 或几何模块的消融尚未完成；技能创建需要少量运行记录和人工审阅，最少需要多少次运行仍未知；真机试验数量较少，而且使用模型判分。

### 接口才是主要贡献

这篇论文把注意力从“多写一些任务代码”转到“怎样提供稳定、能返回证据的接口”。`measure`、`to_world` 和 `dry_run` 把视觉任务拆成可检查的几何操作。一页技能可以补充接触参数与完成标准，这些信息很难从通用感知中推出，同时仍能被人阅读和审计。

对实践而言，可以分开评估三层：通用机器人 API、任务级说明和底层控制器。下一步值得在相同模型与 episode 上关闭 SAM 3 和几何模块，比较不同作者写出的技能，并统计 agent 在看到不确定度或动作受阻后恢复的频率。这些实验能说明 harness 的哪些部分真正支持跨平台迁移，哪些收益仍来自人类任务知识。

</div>
