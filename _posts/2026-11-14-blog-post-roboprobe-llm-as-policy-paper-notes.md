---
title: "[Paper Notes] An Unexpected Robot Policy: Early Evaluations of GPT-6 Astra on RoboDojo and Beyond"
date: 2026-11-14
permalink: /posts/2026/11/roboprobe-llm-as-policy-paper-notes/
excerpt: "RoboProbe evaluates GPT-6 Astra as the robot policy itself across 2,100 RoboDojo trials. Astra leads the public board, while one-shot examples fail to improve aggregate success and unsafe real-robot actions stop the trials."
tags:
  - Paper Notes
  - Robot Manipulation
  - Vision-Language Models
  - Benchmarking
  - Robot Policies
  - Safety
---

<div data-lang="en" markdown="1">

**RoboProbe** tests a stark version of robot agency. The paper removes the usual learned motor policy and asks a fixed LLM to choose executable motion targets from RGB images, robot state and a task description. A non-learned adapter handles inverse kinematics and validation. The benchmark therefore measures the model plus its harness, including prompt, tools, perception and post-processing, while keeping a language model in every closed-loop decision.

Wenbo Zhang, Kaixuan Wang, Yutao Ouyang, Xiaoyu Huang, Liyang Li, Kailun Su, Weiyang Jin, Wenhao Chai, Haotian Liang, Zhiyang Dou, Yue Chen and Tianxing Chen. [arXiv:2609.24170v1](https://arxiv.org/abs/2609.24170v1), September 21, 2026 · [RoboProbe code](https://github.com/RoboProbe/RoboProbe) · [Evaluation report](https://robodojo-benchmark.com/report/gpt-6-astra-eval)

### A policy without a learned action expert

Each episode starts with a system prompt, the official task instruction, a task recipe from the RoboDojo wiki, and tool definitions. At each turn, the model sees a head camera and both wrist cameras, 14 grasp-point and gripper dimensions, 12 read-only joint angles, the remaining step budget and the text history. Images from only the two latest observation turns remain in context. The model can call `move_eef` or `give_up`, with a budget of 100 model calls.

The implementation defines LLM-as-policy using two conditions: no learned policy appears between the model and the robot, and model weights stay fixed during evaluation. Inverse kinematics is allowed because it converts an end-effector target into joint commands through geometry. This is a useful boundary. It separates the effect of replacing a motor policy with an LLM from the separate effect of replacing only the high-level planner in a conventional policy stack.

### Astra leads overall, with a polarized profile

GPT-6 Astra ran all 42 tasks with the official 50 episodes per task, for 2,100 trials. It reached **28.97 Score** and **22.48% average success rate**, ranking above the 40 public policy entries in the September 10 snapshot. GPT-5.5 reached 1.13 Score and 0.88% success, and DeepSeek-Flash reached 2.99 and 1.92% under a smaller 10-episode-per-task budget. The result therefore supports Astra as a strong case study; it does not establish an advantage for frontier LLMs as a class.

The category profile is uneven. Astra's success rate was 30.50% on Generalization, 4.00% on Precision, 8.25% on Long-Horizon, 38.67% on Memory and 31.00% on Open. It beat the strongest public policies on some semantic and language-conditioned tasks while scoring below 5% where the best policy exceeded 20%, including insert tubes, make Kong, play tic-tac-toe and pour liquid into a cup. The aggregate lead combines strong individual capabilities with large holes.

Selected traces show useful behavior without a learned controller: matching a Mahjong tile to the opponent, moving one wrist camera to inspect an occluded tube rack, and carrying a different object in each hand. The same traces also show a missed moving target, a failed two-arm transfer, and a tower being knocked over while reaching nearby. These examples establish that the behaviors occur; they do not estimate their frequency or contribution to the score.

### One-shot context helps less than it seems

The demonstration experiment used 340 matched task-layout pairs drawn from 34 tasks. The matched zero-shot baseline succeeded in 78 of 340 trials. An image plus end-effector demonstration succeeded in 61, and a text trajectory succeeded in 44. On the 150 pairs where zero-shot had no success, the image condition added two successes and the text condition added none. The aggregate demonstration loss came mainly from episodes that the baseline already solved.

The controlled result does not show demonstrations are generally useless. It shows that one demonstration from another layout, delivered through this particular interface, hurt this model on this sample. Precision-heavy tasks may already be limited by execution, while a different layout may encourage the model to copy geometry from the example. The experiment leaves demonstration format, context length and stochastic variation entangled.

Interaction feedback produced a more encouraging, though still small, signal. On eight layouts that Astra solved in the unperturbed condition, success remained 8/8 under a top-bottom image flip. It fell to 6/8 with a left-right mirror, 6/8 without the head camera, 3/8 with only the right wrist view, 3/8 under 10 cm mean pose jitter, and 4/8 after negating the Cartesian axes. A few traces show the model changing its arm assignment, searching for an object with the wrist camera, or reversing an incorrect forward-back estimate. The paper presents these as evidence of within-episode correction, not causal proof of adaptation.

### The physical boundary is part of the result

The authors did not complete RoboDojo-Real. Testing stopped after repeated physically unreasonable or unsafe actions, including incidents that damaged hardware. No person was injured. The retained real-robot trials are diagnostic examples and do not form an official benchmark score.

Taken with the simulation results, the study draws a clear boundary. A fixed LLM can interpret language and some scene semantics well enough to direct a robot in a controlled simulator. Aggregate success does not establish reliable contact, collision awareness or safe deployment. The paper also notes that its comparison gives the LLM a task recipe while the public policies were not rerun with the same text, so score parity does not mean identical information or interfaces.

### Why RoboProbe is useful

RoboProbe contributes a reproducible baseline and a broad failure taxonomy. It exposes per-task and per-layout outcomes, publishes the harness, and makes it possible to compare prompt, perception and control-interface changes on the same 2,100-cell protocol. The later HexaShell result with the same model, where a richer general tool interface reaches 69.9% success without task skills in its own evaluation, makes the harness dependence especially visible. Cross-paper numbers still use different evaluation episodes and cannot be treated as a direct head-to-head.

My main takeaway is that LLM-as-policy deserves evaluation as a complete system. The result is not captured by asking whether an LLM can output an action. It depends on what geometric evidence the interface exposes, how execution results return to the model, how demonstrations are encoded, and whether the benchmark tests precision and safety separately from semantic understanding.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**RoboProbe** 测试一种直接的机器人策略形式。论文移除常见的预训练运动策略，让一个参数固定的 LLM 根据 RGB 图像、机器人状态和任务描述直接选择可执行的动作目标，再用不包含学习组件的适配器完成逆运动学与校验。因此，benchmark 测的是模型及其 harness 的整体表现，包括 prompt、工具、感知和后处理，而每一步闭环决策仍由语言模型完成。

作者为 Wenbo Zhang、Kaixuan Wang、Yutao Ouyang、Xiaoyu Huang、Liyang Li、Kailun Su、Weiyang Jin、Wenhao Chai、Haotian Liang、Zhiyang Dou、Yue Chen 和 Tianxing Chen。[arXiv:2609.24170v1](https://arxiv.org/abs/2609.24170v1)，2026 年 9 月 21 日 · [RoboProbe 代码](https://github.com/RoboProbe/RoboProbe) · [评测报告](https://robodojo-benchmark.com/report/gpt-6-astra-eval)

### 没有学习型动作专家的策略

每一轮开始时，系统提供固定的 system prompt、官方任务指令、来自 RoboDojo wiki 的任务说明和工具定义。模型之后会看到头部相机、左右腕部相机、14 维抓取点与夹爪状态、12 个只读关节角、剩余步数和文本历史。图像只保留最近两轮观测，文本历史持续累积。模型可以调用 `move_eef` 或 `give_up`，每段 episode 最多调用 100 次。

论文对 LLM-as-policy 给出两个条件：模型与机器人之间没有学习型策略，评测过程中模型权重保持不变。允许使用逆运动学，因为它通过几何计算把末端目标转换为关节指令。这个边界很重要。它区分了“用 LLM 替代运动策略”和“用 LLM 替代传统策略栈中的高层规划器”两种不同问题。

### Astra 总体领先，但能力分布很分裂

GPT-6 Astra 在全部 42 个任务上按官方协议各运行 50 次，共 2,100 次试验，得到 **28.97 Score** 和 **22.48% 平均成功率**，高于 9 月 10 日榜单快照中的 40 个公开策略。GPT-5.5 为 1.13 Score 和 0.88% 成功率，DeepSeek-Flash 在每任务 10 次试验的较小预算下为 2.99 和 1.92%。结果支持把 Astra 作为重点案例研究，还不能证明前沿 LLM 作为一个类别整体占优。

各类别差异很大。Astra 在 Generalization 上成功率 30.50%，Precision 4.00%，Long-Horizon 8.25%，Memory 38.67%，Open 31.00%。它在部分语义和语言条件任务上超过最强公开策略，同样在 insert tubes、make Kong、井字棋和倒液体等任务上低于 5%，而这些任务的最强策略超过 20%。总体领先来自若干突出能力与另一些明显缺口。

挑选出的轨迹展示了学习型控制器之外的行为：把麻将牌与对手的出牌匹配，转动空闲腕部相机查看被遮挡的管子架，以及双手各拿一件物体。轨迹也展示了错过移动目标、双臂交接失败和伸向积木时撞倒已有结构。这些例子证明行为会出现，没有给出出现频率或对总分的贡献。

### One-shot 上下文的作用比表面更少

示范实验从 34 个任务中选取 340 组匹配的 task-layout pair。匹配的零示范基线成功 78/340 次，图像加末端动作示范成功 61 次，纯文本轨迹成功 44 次。在零示范完全失败的 150 组中，图像条件增加了两次成功，文本条件没有增加。聚合成功率下降主要发生在基线本来能完成、加入示范后反而失败的 episode 上。

这组结果不能推广成“示范没有价值”。它说明在特定接口、特定模型和这一组样本上，从其他布局复制来的一段示范会伤害性能。精度任务可能主要受执行限制，而不同布局也可能诱导模型搬运示例中的几何关系。实验没有拆开示范格式、上下文长度和随机波动的影响。

执行反馈给出的信号更积极，规模仍然很小。Astra 在未扰动时能解出的八个布局上，上下翻转图像仍有 8/8 成功；左右镜像和无头部相机为 6/8，仅保留右腕相机为 3/8，平均 10 厘米动作位姿扰动为 3/8，笛卡尔坐标轴取反为 4/8。几条轨迹显示模型会更换持物手臂、用腕部相机搜索物体，或在反馈后纠正前后方向判断。论文把这些现象写成 episode 内修正的证据，没有声称已经证明完整的适应机制。

### 物理边界本身就是结果

作者没有完成 RoboDojo-Real 官方协议。测试在模型反复给出物理上不合理或不安全的动作后停止，其中有设备损坏，没有人员受伤。保留下来的真机试验只作为诊断材料，不构成官方真机分数。

结合仿真结果，这项研究给出了一条清楚边界。参数固定的 LLM 已能在受控仿真中理解语言和部分场景语义，并据此选择机器人动作；聚合成功率仍不能证明可靠的接触控制、碰撞意识和安全部署。论文还指出，LLM 条件获得了 wiki 派生的任务说明，而公开策略没有用相同文本重跑，因此分数相近不代表信息完全相同。

### RoboProbe 的价值

RoboProbe 提供了可复现的基线和较完整的失败分类。它公开 per-task 与 per-layout 结果、控制 harness，并提出在相同 2,100 个评测单元上比较 prompt、感知和控制接口。后续 HexaShell 使用相同模型，在自己较少的测试 episode 上把通用工具接口做到 69.9% 无技能成功率，进一步显示 harness 的影响。两篇论文的测试集与协议不同，不能把这两个数字直接当作同条件对比。

我的主要结论是，LLM-as-policy 适合作为一个完整系统来评估。问题不能停留在 LLM 能否输出动作。它依赖接口向模型提供什么几何证据、执行结果怎样返回、示范怎样编码，以及 benchmark 是否把精度、动态控制和安全与语义理解分开测量。

</div>
