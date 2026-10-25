---
title: "[Paper Notes] Scaling Online Exploration for Robot Agents"
date: 2026-10-25
permalink: /posts/2026/10/rax-paper-notes/
excerpt: "How RAX learns robot skills in a persistent code workspace, and how exploration budgets, demonstration access, and evaluation protocols shape its results."
tags:
  - Robot Agents
  - Online Exploration
  - Program Synthesis
  - Paper Notes
---

<div id="rax-en" data-lang="en" markdown="1">

## TL;DR

RAX turns online robot experience into executable perception and control programs. A frozen coding model explores through robot APIs, records failures, revises its code, and saves skills that have passed unattended execution. Learning updates the workspace while model parameters stay fixed.

The important result is that additional exploration improves performance on new scenes. The headline **37.4-point average gain** combines five benchmark comparisons with different scoring conventions and selected task subsets. Some evaluations still retain an agent in the loop, and some provide demonstration information. Those details matter when interpreting “autonomous” and “without demonstrations.”

## Paper and reading version

**Scaling Online Exploration for Robot Agents** — Runhan Huang, Xiangcheng Zhang, Haoyu Chen, Yitong Li, Yen-Jen Wang, Bohan Lyu, Haotian Ye, Chuye Hong, Yixuan Wang, Chloe Su, Haoyu Xiong, Yangzhen Wu, Enze Xie, Travis Manderson, Stefano Ermon, Pieter Abbeel, Antonio Torralba, Dawn Song, Weirui Ye, Yilun Du. These notes follow [arXiv:2610.22496v1](https://arxiv.org/abs/2610.22496v1), an arXiv preprint, checked on October 25, 2026. [PDF](https://arxiv.org/pdf/2610.22496v1) · [Project](https://robot-agent-exploration.com/)

The mechanism below follows Sections 3–4; evaluation details follow Section 5 and Appendices C, F, and H.

## Experience becomes a program the robot can run

RAX starts with a task, a robot-specific tool interface, and a workspace containing general instructions. The agent observes RGB-D images, camera calibration, and available force or state signals. It uses control APIs, inverse kinematics, and robot geometry to attempt the task. A failure becomes evidence for a change to a perception routine, a motion plan, or an execution check.

For example, the air-fryer program fits a geometric model to a point cloud, estimates the drawer axis and handle, checks reachability, and pulls in short increments. The model contains a fixed body and a sliding drawer. Measurements from the first successful attempt become parameters; later layouts require fresh perception. This explains how the generated program can adapt without asking the language model to reason about every action.

A useful schematic of the learning process is

$$
P_{k+1}=\operatorname{Revise}_{\mathrm{LLM}}(P_k,\mathcal E_k,\mathcal M_k),
\qquad a_t=P_k(o_{\leq t}),
$$

where $P_k$ is the current program, $\mathcal E_k$ is execution evidence, and $\mathcal M_k$ is workspace memory. This is my notation for the workflow, not a training objective from the paper. The LLM's weights stay fixed.

Programs contain preconditions, stage transitions, outcome checks, and exception handling. If an observation falls outside the program's reliable operating conditions, it can stop and return control to the agent. A skill enters persistent memory after successful unattended execution, along with its applicability conditions and run evidence. Later tasks can compose those skills.

## Where the learned code ends and the robot stack begins

The frontend contains the agent and generated programs. The backend owns hardware drivers, sensing, low-level controllers, and enforced limits. Both interactive tool calls and autonomous programs use this same boundary. An agent-generated collision check supplements the backend; it does not replace its joint limits or operator arming requirement.

The available control abstraction varies by platform. HumanoidArena uses the SONIC whole-body tracker; LIBERO uses its operational-space controller. Some settings offer planning and IK helpers. RAX discovers task-specific logic on top of these interfaces. Reproducing the system therefore requires documenting the robot backend as carefully as the prompt.

Compilation also changes inference cost. In the selected air-fryer session, reported inference time falls from 72 minutes for agent-mediated execution to 18 seconds for its program, a 241× reduction. This is a comparison of inference time for a successful execution, not a claim that the physical robot moves 241 times faster.

## The benchmark averages need their protocols

| Setting | RAX | Reference | What the number measures |
|---|---:|---:|---|
| RoboDojo, seven tasks | 78.3% | VPP2 24.9% | Native score, including partial credit; largest budget per task |
| BEHAVIOR-1K, six tasks | 46.5% | Leading challenge entry 8.2% | Fraction of goal conditions satisfied on ten public test instances |
| HumanoidArena, seven tasks | 89.8% | WB-WAM 81.9% | Success on official unseen test episodes |
| DexJoCo, five bimanual tasks | 94.3% | ME-Dex 48.8% | Success with 32 exploration episodes |
| LIBERO-Pro, position perturbation | 84.4% | VPP2 42.3% | Comparison with the strongest learned model in the summary |

Appendix F averages the five margins to obtain **37.4 percentage points**. Its DexJoCo row uses only the five bimanual tasks. Across all eleven DexJoCo tasks at 32 episodes, the reported score is 96.7%, against 65.3% for ME-Dex. On LIBERO-Pro, the coding-agent baseline ASPIRE reaches 63.2%; the 42.1-point headline margin uses VPP2 instead. These are different comparisons.

RoboDojo evaluates the resulting program without its agent on 30–50 unseen scenes per task. BEHAVIOR-1K mostly evaluates an agent-in-the-loop program, with a fresh agent and frozen workspace; exploration also receives detailed review-model feedback. Its 46.5% Q-score cannot be read as 46.5% complete-task success.

Demonstration access also varies. RoboDojo supplies a goal image; BEHAVIOR-1K supplies visual demonstration keyframes without actions or states. HumanoidArena gives the exploring agent three teleoperated demonstrations. The general framework avoids fitting a policy to a teleoperation corpus, but a blanket claim that every experiment has no demonstration input would conflict with the protocol.

## What scales, and what still costs work

On RoboDojo, charger insertion increases from 26% with four exploration episodes to 94% with eight; the long-horizon Kong task reaches 96% at 32 episodes. Hang Mugs remains around 33–39% across its tested budgets. More exploration helps many tasks, while particular perception or control difficulties can persist.

Physical experiments cover hidden-object memory, articulated objects, wiping, precise insertion, and long-horizon mobile manipulation. They provide detailed sessions and case studies, not one uniform real-robot success-rate benchmark. Operators still reset scenes. Appendix H reports **more than US$100,000 in API credits across all simulation and physical experiments**; that is a study-wide total, not a cost per learned skill.

My takeaway is to evaluate the stored program as the main product of exploration. For a follow-up, I would measure unseen-scene success, agent intervention frequency, exploration cost, and reuse across tasks separately. A fast replay that needs frequent intervention and a reliable unattended skill have different practical value, even if both eventually finish the task.

</div>

<div id="rax-zh" data-lang="zh" markdown="1" style="display: none;">

## TL;DR

RAX 把机器人的在线交互经验写成可执行的感知与控制程序。冻结的编程模型通过机器人 API 探索任务、记录失败、修改代码，并把通过无人干预运行验证的技能保存下来。学习发生在工作区，模型参数保持固定。

论文的重要结果是：增加探索次数后，系统在新场景中的表现有所提高。但摘要中的 **37.4 个百分点平均提升**汇总了五组评分方式和任务范围不同的比较；部分评测保留智能体参与，部分实验也提供示范信息。理解“自主”和“无需示范”时，需要回到具体协议。

## 论文与阅读版本

**Scaling Online Exploration for Robot Agents**，作者：Runhan Huang, Xiangcheng Zhang, Haoyu Chen, Yitong Li, Yen-Jen Wang, Bohan Lyu, Haotian Ye, Chuye Hong, Yixuan Wang, Chloe Su, Haoyu Xiong, Yangzhen Wu, Enze Xie, Travis Manderson, Stefano Ermon, Pieter Abbeel, Antonio Torralba, Dawn Song, Weirui Ye, Yilun Du。本文依据 [arXiv:2610.22496v1](https://arxiv.org/abs/2610.22496v1) 预印本，原文核验日期为 2026 年 10 月 25 日。[PDF 全文](https://arxiv.org/pdf/2610.22496v1) · [项目主页](https://robot-agent-exploration.com/)

下文机制对应第 3–4 节，评测条件对应第 5 节及附录 C、F、H。

## 经验如何成为机器人可以运行的程序

RAX 的起点是一项任务、适配机器人的工具接口，以及包含通用指令的工作区。智能体读取 RGB-D 图像、相机标定和可用的力或状态信号，通过控制 API、逆运动学与机器人几何模型尝试完成任务。每次失败都可能推动它修改感知函数、运动计划或执行检查。

空气炸锅实验给出了具体例子。智能体用点云拟合几何模型，估计抽屉轴线和把手位置，检查可达性，再分段拉开抽屉。模型包含固定机身与滑动抽屉；第一次成功尝试中的测量可以成为程序参数，但新布局仍需重新感知。这使程序能够适应场景变化，不必让语言模型逐个动作推理。

可以用下面的示意式理解学习过程：

$$
P_{k+1}=\operatorname{Revise}_{\mathrm{LLM}}(P_k,\mathcal E_k,\mathcal M_k),
\qquad a_t=P_k(o_{\leq t}),
$$

其中 $P_k$ 是当前程序，$\mathcal E_k$ 是执行证据，$\mathcal M_k$ 是工作区记忆。这是我对流程的概括，不是论文给出的训练目标。LLM 权重保持冻结。

程序包含前置条件、阶段切换、结果验证和异常处理。如果新观测超出程序能够可靠处理的范围，程序可以停止，并把控制权交回智能体。技能通过无人干预执行后，连同适用条件和运行证据进入长期记忆，供后续任务组合使用。

## 生成的代码与机器人底层如何分工

前端包括智能体和它生成的程序，后端负责驱动、传感、低层控制及强制执行的约束。交互式工具调用与自动程序都经过同一个边界。智能体生成的碰撞检查是额外保障，后端关节限位和操作员使能仍然有效。

不同平台提供的控制抽象并不相同：HumanoidArena 使用 SONIC 全身运动跟踪器，LIBERO 使用自身的操作空间控制器，部分设置还提供规划与 IK 工具。RAX 在这些接口之上探索任务逻辑。因此，复现实验时，机器人后端的说明与提示词同样重要。

把决策写成程序也降低了推理开销。在选取的空气炸锅案例中，一次成功执行的推理时间从智能体参与时的 72 分钟降到程序的 18 秒，约减少 241 倍。这里比较的是推理时间，不能据此推断机器人实际运动速度提高了 241 倍。

## 五组数字背后的不同协议

| 设置 | RAX | 对照 | 数字的含义 |
|---|---:|---:|---|
| RoboDojo，七项任务 | 78.3% | VPP2 24.9% | 包含部分奖励的原生评分，各任务采用最大探索预算 |
| BEHAVIOR-1K，六项任务 | 46.5% | 挑战赛领先方法 8.2% | 十个公开测试实例中满足目标条件的比例 |
| HumanoidArena，七项任务 | 89.8% | WB-WAM 81.9% | 官方未见测试回合的成功率 |
| DexJoCo，五项双手任务 | 94.3% | ME-Dex 48.8% | 使用 32 次探索回合后的成功率 |
| LIBERO-Pro，位置扰动 | 84.4% | VPP2 42.3% | 摘要汇总中与最强学习模型的比较 |

附录 F 将五组差值平均，得到 **37.4 个百分点**。其中 DexJoCo 只统计五项双手任务；若统计全部十一项任务，32 次探索后的结果为 96.7%，ME-Dex 为 65.3%。LIBERO-Pro 中，编程智能体基线 ASPIRE 达到 63.2%，摘要汇总采用的 42.1 点优势则以 VPP2 为对照。两种比较应分开阅读。

RoboDojo 在每项任务的 30–50 个未见场景中独立运行生成程序。BEHAVIOR-1K 大多保留智能体参与，使用新智能体读取冻结工作区；探索时还会收到评审模型的详细反馈。46.5% 的 Q-score 表示满足目标条件的比例，不能直接理解成完整任务成功率。

示范输入也有差异。RoboDojo 提供目标图像；BEHAVIOR-1K 提供不含动作和状态的成功示范关键帧；HumanoidArena 则向探索智能体提供三条遥操作示范。该框架不需要用遥操作数据集拟合策略，但把全部实验概括成“没有任何示范输入”会与实验协议冲突。

## 扩大探索预算，仍需付出哪些成本

RoboDojo 的插充电器任务从四次探索后的 26% 提高到八次后的 94%，长时程 Kong 任务在 32 次探索后达到 96%。Hang Mugs 则在测试预算内保持约 33–39%。探索有助于很多任务，但特定感知或控制难点仍可能持续存在。

真机实验涵盖隐藏物体记忆、铰接物体、擦拭、精密插入和长时程移动操作，主要提供详细交互记录与案例，没有统一的真机成功率汇总。场景重置仍需操作员。附录 H 报告，全部仿真与真机实验合计消耗**超过 10 万美元的 API 额度**；这是整项研究的总成本，不能当成单项技能成本。

我的判断是，应把探索后留下的程序作为主要评估对象。后续实验需要分别报告未见场景成功率、智能体接管频率、探索成本和跨任务复用效果。需要频繁接管的快速程序，与能够稳定独立运行的技能，即使最终都能完成任务，实用价值仍有明显差别。

</div>
