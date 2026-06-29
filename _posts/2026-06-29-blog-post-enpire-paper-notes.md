---
title: "[Paper Notes] ENPIRE: Agentic Robot Policy Self-Improvement in the Real World"
date: 2026-06-29
permalink: /posts/2026/06/enpire-paper-notes/
tags:
  - Robot Learning
  - Coding Agents
  - Real-World RL
  - Autonomous Research
  - Dexterous Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

**ENPIRE** is a harness for letting coding agents improve real robot policies through a closed physical feedback loop. The loop is deliberately simple: reset the scene, run the policy, verify the outcome, inspect logs, change the code or training recipe, then try again. The paper's main claim is that this loop can be made concrete enough for frontier coding agents to operate on real manipulation hardware, reaching high success on tasks such as Push-T, pin insertion, GPU insertion, and zip-tie cutting.

My read: the important move is the separation between building the environment interface and running autonomous policy improvement. The authors are not asking a language model to directly "do robotics" from raw pixels and motors. They first construct a reusable physical API around safety, reset, rollout, and reward. Once that interface is stable, the coding agent can work like an experimental scientist with a robot budget: propose a hypothesis, edit code, launch rollouts, read results, and keep the variants that improve success.

## Paper Info

The paper is **"ENPIRE: Agentic Robot Policy Self-Improvement in the Real World"** by **Wenli Xiao, Jia Xie, Tonghe Zhang, Haotian Lin, Letian "Max" Fu, Haoru Xue, Jalen Lu, Yi Yang, Cunxi Dai, Zi Wang, Jimmy Wu, Guanzhi Wang, S. Shankar Sastry, Ken Goldberg, Linxi "Jim" Fan, Yuke Zhu, and Guanya Shi**. The affiliations are **NVIDIA**, **CMU**, and **UC Berkeley**.

The paper is available as [arXiv:2606.19980](https://arxiv.org/abs/2606.19980). The project page is [research.nvidia.com/labs/gear/enpire](https://research.nvidia.com/labs/gear/enpire).

## The Problem: Physical Autoresearch

Coding agents have become useful in digital environments because each trial is cheap: run code, see the error, patch, repeat. Real-world robot learning has a different bottleneck. Every trial consumes robot time, hardware can be damaged, the scene must be reset, and success must be measured reliably. Human supervision often remains hidden inside the "learning" pipeline through data collection, resetting, evaluation, reward engineering, and algorithm tuning.

ENPIRE frames the target as **physical autoresearch**: an agent should be able to run the research loop on hardware under an explicit robot-time budget. The missing abstraction extends beyond a better policy class to a repeatable experimental interface that turns robot interaction into structured feedback.

The paper decomposes that interface into four modules:

| Module | Role |
|---|---|
| **EN: Environment** | hard safety constraints, automatic reset, automatic verification |
| **PI: Policy Improvement** | agent-driven code edits, training recipes, algorithm variants |
| **R: Rollout** | execution on one or more physical robots, logs, videos, rewards |
| **E: Evolution** | multi-agent hypothesis selection, Git-based sharing, branch merging |

This naming is useful because it makes the dependency clear. Policy improvement only becomes autonomous after the Environment and Rollout modules provide reliable feedback.

## Stage 1: Build the Environment From Human Feedback

The first stage is human-guided. A person provides the task objective and feedback while the coding agent constructs the environment APIs. This stage is a one-time setup cost for a task; after it is validated, the API becomes an immutable interface reused during autonomous improvement.

There are three pieces.

**Hard safety constraints** restrict the robot's configuration space and kinematic behavior. Violating the safe region immediately terminates the episode and triggers reset. This is both a physical safety layer and a clean episode boundary for learning.

**Automated verification** converts sensor streams into reward or success signals. Given a few minutes of success and failure demonstrations, the agent synthesizes procedural reward code using videos and proprioception, then optimizes for prediction accuracy and low latency. In pin insertion, the reward combines visual alignment, end-effector height, and force estimates. In zip-tie insertion, the reward uses cropped segmentation from two camera views to detect whether the strap passes through the head, with latency reduced below 150 ms.

**Automated reset** restores the scene after success or failure. For contact-rich tasks, ENPIRE uses modular manipulation tools inspired by CaP-X to reset directly to the critical phase, such as hovering above a pin hole, seating a GPU near a slot, or positioning scissors before cutting. This matters because policy learning should spend robot time on the hard part of the task, not on repeatedly reproducing easy setup motions.

The appendix gives the more concrete tool stack: SAM3 for open-vocabulary segmentation, BundleSDF for 6-DoF pose tracking, cuRobo for collision-free planning, RGB-D and proprioceptive state, and gripper torque as a tactile-like signal for slip and force control.

## Stage 2: Let the Agent Improve the Policy

After the environment is stable, the second stage becomes autonomous. The agent receives the task objective, a writable training codebase, access to rollout logs and videos, and the goal of maximizing real-world success rate. It can review literature, formulate hypotheses, edit behavior cloning or RL code, tune infrastructure, and launch real rollouts through the environment API.

The pin insertion task is the paper's clearest example. The robot must insert a pin into a hole with a tight **4 mm clearance**, and agents are asked to reach **50 consecutive successes**. During the run, agents try behavior cloning, iterative BC with online data aggregation, online RL, offline RL, offline-to-online RL, and BC-regularized RL. They also tune practical variables such as batch size, actor-critic update rate, and the BC regularization weight.

The mechanism is closer to an automated lab notebook than to a single learned controller. ENPIRE gives the coding agent enough observability to ask: did the last idea improve success, what failures remain, which branch found a better recipe, and which code changes should be merged?

## Fleet Scaling: Evolution Through Git

ENPIRE scales by assigning one agent to one robot station. The paper uses a fleet of **eight bimanual YAM robot stations**. Each station has its own arms, cameras, compute, and coding agent. Hardware-control requests go through a local FastAPI server, while coordination across stations happens through Git: agents push branches, pull peer branches, cherry-pick useful commits, and merge promising training recipes.

This is the **Evolution** part of ENPIRE. The fleet does not require a central optimizer that collects all state. It uses a decentralized version-control protocol where ideas compete through measured success rates. In the pin-insertion idea tree, a few changes account for most of the improvement, including BC regularization at **+10.8 percentage points**, online RL mixed with demonstrations at **+3.8 pp**, batch-size tuning at **+0.9 pp**, and controller compensation at **+1.3 pp**.

This framing is nice because it treats code changes as experimental hypotheses. A branch is not just software state; it is a record of a policy-improvement idea tested on hardware.

## Experiments and Results

The real-world tasks cover several forms of dexterity:

| Task | Core challenge |
|---|---|
| Push-T | non-prehensile pushing to align a T-shaped block |
| Pin insertion | plug pins into 4 mm holes |
| GPU insertion | seat GPU chips into thin motherboard sockets |
| Zip-tie cutting | grasp scissors and cut the zip-tie tail |

Success is measured as completing the task in one rollout with up to **eight retries**, where later retries can react to earlier failures. This is stricter in a useful way: it measures precision together with recovery under real-world uncertainty.

Several results stand out.

First, heuristic learning works in simulation but is much harder on real hardware. In Gym-PushT, Claude Code and Codex reach **95%** success in about two hours, while Kimi Code takes roughly twice as long. In the real Push-T setup, two of the three agents fail, showing that real contact, friction, dynamics, and scene variation are the real test.

Second, ENPIRE can support gradient-based real-world policy improvement. For pin insertion, agents use BC, online data aggregation, and RL variants to hill-climb toward the 50-success objective. The paper reports policy convergence to **100%** in pin insertion, faster than a frontier human-in-the-loop method.

Third, fleet size reduces wall-clock time. In Push-T, scaling from one to eight agent-robot pairs reduces the time to reach a **1.0 normalized score** from roughly **five hours to two hours**. In pin insertion, scaling from one to eight agents reduces time to near-perfect success from more than **1.5 hours** to about **40 minutes**.

Fourth, ENPIRE can discover hybrid strategies that combine code-based policies and VLAs. In RoboCasa365, the agent improves over GR00T and zero-shot CaP-X by using perception and motion-planning tools to hover above an object before grasping. The same style of strategy transfers to the real scissors and zip-tie task.

## Resource Metrics: MRU and MTU

The paper's resource metrics are a useful contribution because robot learning is constrained by scarce hardware as well as GPU time.

**Mean Robot Utilization (MRU)** is the fraction of research wall-clock time during which the robot is actively executing experiments. **GPU utilization** measures the analogous active GPU fraction. **Mean Token Utilization (MTU)** measures average token consumption across the agent fleet, and the paper also tracks tokens-to-success and time-to-success.

The observed tradeoff is intuitive and important. Larger fleets reach success faster, while token consumption grows faster than ideal linear scaling. MRU drops as the fleet grows because agents spend more time reading logs, debugging, summarizing peer branches, and waiting on language-model calls. GPU utilization rises, although agents still do not saturate the hardware. The result is a real speed-cost frontier: more robots and agents buy wall-clock acceleration, while the token budget can grow disproportionately.

## System Details

Each station uses two 6-DoF YAM arms with 1-DoF parallel-jaw grippers, giving **14 actuated joints** across the bimanual pair. The arms use PD control with gravity compensation; the grippers use torque-limited compliant grasping so failed contact stalls safely instead of forcing rigid closure. This is a small hardware detail with large autonomy consequences: unattended robot learning needs bounded force behavior.

Perception uses Intel RealSense D405 cameras: one top-down camera and two wrist cameras for most tasks. GPU insertion adds a RealSense D435i side camera. Policies run at **30 Hz**, while low-level joint controllers run at **100 Hz**. Each station has a local workstation with **one NVIDIA RTX 5090 32 GB GPU**, an Intel Core Ultra 9 285K CPU, 128 GB RAM, Ubuntu 22.04, and CUDA 13.2.

The real-world RL integration follows a three-tier design: deployment records episodes and runs hardware, the learner trains an actor-critic with visual features, and the actor exposes a Portal/ZMQ endpoint for policy inference. Rollouts are written to disk with synchronized videos and action-source labels; a daemon ingests finalized episodes and mixes RL-generated transitions with human/manual demonstrations in an RLPD-style buffer.

## Limitations

ENPIRE still leaves resource utilization on the table. Robots wait while agents inspect logs, write code, debug, summarize branches, or wait for model responses. Larger fleets reduce wall-clock time but increase coordination overhead, and token cost grows super-linearly at eight agents.

The environment construction stage also remains human-guided. A person still supplies the task objective, validates reward/reset behavior, and provides representative success and failure demonstrations. ENPIRE amortizes this work across later autonomous improvement; it does not remove it.

Finally, the success of the loop depends heavily on the quality of exposed tools. In RoboCasa, the paper identifies SAM3 perception failures on small or ambiguous objects. Prompt search and higher image resolution help, but perception remains a bottleneck. This generalizes to real hardware: if reset, verification, or perception APIs are brittle, the agent will optimize against brittle feedback.

## Takeaways

ENPIRE is interesting because it gives coding agents a robotics-shaped experimental substrate. The core contribution is not a new policy architecture. It is the construction of a repeatable physical feedback loop where reward, reset, rollout, code editing, and branch-level hypothesis selection are all visible to the agent.

For robot learning, the practical lesson is that autonomy starts before policy training. A robot fleet becomes useful to coding agents only after the environment exposes safe resets, reliable rewards, structured logs, and reproducible execution. Once that substrate exists, agentic code search can improve policies, discover training recipes, and trade tokens for robot-time acceleration.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**ENPIRE** 是一个让 coding agent 在真实机器人上自我改进 policy 的 harness。它把真实机器人学习整理成一个闭环：reset scene，执行 policy，自动验证结果，读取 logs，修改代码或训练 recipe，再继续试。论文的核心结论是，这个闭环可以被做成足够稳定的真实硬件接口，让前沿 coding agents 在 Push-T、pin insertion、GPU insertion、zip-tie cutting 等任务上自主提升成功率。

我的理解是：这篇文章最重要的设计是把 environment interface construction 和 autonomous policy improvement 分开。作者没有让语言模型直接从 raw pixels 和 motors 出发“做机器人”。他们先围绕 safety、reset、rollout、reward 建一个可复用的物理 API。接口稳定以后，coding agent 才像一个带 robot budget 的实验研究员：提出假设，改代码，跑 rollout，读结果，保留能提升成功率的变体。

## 论文信息

论文是 **"ENPIRE: Agentic Robot Policy Self-Improvement in the Real World"**，作者包括 **Wenli Xiao, Jia Xie, Tonghe Zhang, Haotian Lin, Letian "Max" Fu, Haoru Xue, Jalen Lu, Yi Yang, Cunxi Dai, Zi Wang, Jimmy Wu, Guanzhi Wang, S. Shankar Sastry, Ken Goldberg, Linxi "Jim" Fan, Yuke Zhu, Guanya Shi**。机构包括 **NVIDIA**、**CMU** 和 **UC Berkeley**。

论文链接是 [arXiv:2606.19980](https://arxiv.org/abs/2606.19980)。项目页是 [research.nvidia.com/labs/gear/enpire](https://research.nvidia.com/labs/gear/enpire)。

## 问题定义：Physical Autoresearch

Coding agents 在数字环境里变得有用，是因为每次试验都便宜：运行代码，看到错误，修改，再运行。真实机器人学习的瓶颈不同。每次试验都消耗 robot time，硬件可能损坏，场景需要 reset，成功与否也需要可靠测量。很多“自动学习”流程里仍然藏着大量人工参与，包括数据采集、reset、评估、reward engineering 和算法调参。

ENPIRE 把目标定义成 **physical autoresearch**：agent 应该能在显式 robot-time budget 下，在真实硬件上运行研究闭环。缺少的抽象不只是更强的 policy class，而是一个能把机器人交互转成结构化反馈的可重复实验接口。

论文把这个接口拆成四个模块：

| 模块 | 作用 |
|---|---|
| **EN: Environment** | hard safety constraints、automatic reset、automatic verification |
| **PI: Policy Improvement** | agent 驱动的代码修改、训练 recipe、算法变体 |
| **R: Rollout** | 在一个或多个真实机器人上执行，产生 logs、videos、rewards |
| **E: Evolution** | 多 agent 假设选择，通过 Git 共享和合并分支 |

这个命名很有帮助，因为它说明了依赖关系。只有 Environment 和 Rollout 模块能提供可靠反馈之后，Policy Improvement 才能真正自动化。

## Stage 1：从人类反馈构建 Environment

第一阶段是 human-guided。人提供任务目标和反馈，coding agent 负责构建 environment APIs。这个阶段是每个任务的一次性 setup cost；验证通过以后，API 会变成后续 autonomous improvement 中复用的 immutable interface。

这里有三部分。

**Hard safety constraints** 限制机器人的 configuration space 和运动行为。越过安全区域会立即终止 episode 并触发 reset。它既是物理安全层，也是 learning 中清晰的 episode boundary。

**Automated verification** 把传感器流转成 reward 或 success signal。给定几分钟 success/failure demonstrations，agent 用 video 和 proprioception 合成 procedural reward code，并优化预测准确率和推理延迟。Pin insertion 的 reward 融合 visual alignment、end-effector height 和 force estimates。Zip-tie insertion 的 reward 用两个相机视角的 crop segmentation 判断 strap 是否穿过 zip-tie head，并把延迟优化到 150 ms 以下。

**Automated reset** 在成功或失败后恢复场景。对于 contact-rich tasks，ENPIRE 使用受 CaP-X 启发的模块化 manipulation tools，把环境直接 reset 到关键阶段，比如 pin hole 上方、GPU slot 附近，或剪刀准备剪 zip tie 的位置。这样 policy learning 的 robot time 主要花在困难动作上，而不是反复执行简单 setup。

Appendix 给出了更具体的工具栈：SAM3 用于 open-vocabulary segmentation，BundleSDF 用于 6-DoF pose tracking，cuRobo 用于 collision-free planning，输入包括 RGB-D 和 proprioceptive state，gripper torque 作为类 tactile signal，用于 slip detection 和 force control。

## Stage 2：让 Agent 自主改进 Policy

Environment 稳定以后，第二阶段进入全自动。Agent 得到任务目标、可写的训练代码库、rollout logs/videos，以及最大化真实成功率的目标。它可以读文献，提出假设，修改 behavior cloning 或 RL 代码，调训练基础设施，然后通过 environment API 发起真实 rollout。

Pin insertion 是论文里最清楚的例子。机器人要把 pin 插入 **4 mm clearance** 的孔，agent 的目标是达到 **50 consecutive successes**。在这个过程中，agents 尝试 behavior cloning、带 online data aggregation 的 iterative BC、online RL、offline RL、offline-to-online RL，以及带 BC regularization 的 RL。它们还会调 batch size、actor-critic update rate、BC regularization weight 等实践参数。

这个机制更像自动化实验记录，而不是单个 learned controller。ENPIRE 给 coding agent 足够的可观测性，让它能持续追问：上一个 idea 是否提升了成功率，还剩哪些 failure modes，哪个 branch 找到了更好的 recipe，哪些代码修改应该 merge。

## Fleet Scaling：通过 Git 演化

ENPIRE 的扩展方式是一个 agent 对应一个 robot station。论文使用了 **8 个 bimanual YAM robot stations**。每个 station 有自己的机械臂、相机、计算资源和 coding agent。硬件控制请求走本地 FastAPI server，而 station 之间的协作通过 Git 完成：agents push branches、pull peer branches、cherry-pick 有用 commits，并 merge 有希望的训练 recipe。

这就是 ENPIRE 中的 **Evolution**。Fleet 不需要一个收集所有状态的中央 optimizer，而是用 decentralized version-control protocol，让 ideas 通过真实成功率竞争。在 pin-insertion idea tree 中，少数改动贡献了大部分提升，包括 BC regularization 的 **+10.8 percentage points**、online RL mixed with demonstrations 的 **+3.8 pp**、batch-size tuning 的 **+0.9 pp**、controller compensation 的 **+1.3 pp**。

这个视角很漂亮，因为它把代码修改当成实验假设。一个 branch 不只是软件状态，也是一个在硬件上被验证过的 policy-improvement idea 记录。

## 实验和结果

真实任务覆盖了几种 dexterity：

| 任务 | 核心难点 |
|---|---|
| Push-T | non-prehensile pushing，把 T 形块对齐到目标区域 |
| Pin insertion | 把 pins 插入 4 mm holes |
| GPU insertion | 把 GPU chips 插入 motherboard 上的薄 slot |
| Zip-tie cutting | 抓住剪刀并剪断 zip-tie tail |

成功率定义为一次 rollout 中完成任务，最多允许 **8 次 retries**，后续 retry 可以基于前一次失败进行恢复。这个指标很有用，因为它同时测量精度和真实不确定性下的 recovery，而不是只测 one-shot precision。

几个结果值得注意。

第一，heuristic learning 在仿真中可行，但真实硬件难很多。在 Gym-PushT 中，Claude Code 和 Codex 大约两小时达到 **95%** success rate，Kimi Code 约需要两倍时间。在真实 Push-T 中，三个 agents 里有两个失败，说明真实 contact、friction、dynamics 和 scene variation 才是核心考验。

第二，ENPIRE 支持 gradient-based real-world policy improvement。对于 pin insertion，agents 使用 BC、online data aggregation 和 RL variants，逐步接近 50-success objective。论文报告 pin insertion 的 policy convergence 达到 **100%**，并且快于一个 frontier human-in-the-loop method。

第三，fleet size 可以减少 wall-clock time。在 Push-T 中，从 1 个 agent-robot pair 扩到 8 个，会把达到 **1.0 normalized score** 的时间从大约 **5 小时** 降到 **2 小时**。在 pin insertion 中，从 1 个扩到 8 个，会把达到 near-perfect success 的时间从 **1.5 小时以上** 降到约 **40 分钟**。

第四，ENPIRE 能发现 code-based policies 和 VLAs 的混合策略。在 RoboCasa365 中，agent 通过 perception 和 motion-planning tools 先 hover 到目标物体上方再 grasp，使结果优于 GR00T 和 zero-shot CaP-X。类似策略也迁移到真实 scissors 和 zip-tie 任务中。

## 资源指标：MRU 和 MTU

论文里的资源指标很有价值，因为真实机器人学习受限于稀缺硬件，不只是 GPU time。

**Mean Robot Utilization (MRU)** 是 research wall-clock time 中 robot 真正在执行实验的比例。**GPU utilization** 是 GPU 活跃比例。**Mean Token Utilization (MTU)** 衡量 agent fleet 的平均 token consumption，论文还跟踪 tokens-to-success 和 time-to-success。

观察到的 tradeoff 很直观但重要。更大的 fleet 更快达到成功，但 token consumption 的增长快于理想线性扩展。随着 fleet 变大，MRU 会下降，因为 agents 花更多时间读 logs、debug、总结 peer branches，并等待 language-model calls。GPU utilization 上升，但 agents 仍然没有完全打满硬件。结果是一条真实的 speed-cost frontier：更多 robots 和 agents 能换来 wall-clock acceleration，但 token budget 会不成比例地上升。

## 系统细节

每个 station 使用两只 6-DoF YAM arms 和 1-DoF parallel-jaw grippers，整个 bimanual pair 共 **14 个 actuated joints**。机械臂使用带 gravity compensation 的 PD control；gripper 使用 torque-limited compliant grasping，让错误接触以安全 stall 结束，而不是刚性闭合继续硬推。这个硬件细节对自治系统很关键：无人值守的 robot learning 需要 bounded force behavior。

Perception 使用 Intel RealSense D405 cameras：多数任务使用一个 top-down camera 和两个 wrist cameras。GPU insertion 额外使用一个 RealSense D435i side camera。Policy 以 **30 Hz** 运行，低层 joint controllers 以 **100 Hz** 运行。每个 station 的本地 workstation 配有 **一块 NVIDIA RTX 5090 32 GB GPU**、Intel Core Ultra 9 285K CPU、128 GB RAM、Ubuntu 22.04 和 CUDA 13.2。

真实 RL 集成采用三层设计：deployment 负责硬件和 episode recording，learner 训练带视觉特征的 actor-critic，actor 通过 Portal/ZMQ endpoint 提供 policy inference。Rollouts 会以 synchronized videos 和 action-source labels 写入磁盘；daemon 读取完成的 episodes，并按 RLPD-style buffer，把 RL-generated transitions 和 human/manual demonstrations 混合训练。

## 局限

ENPIRE 仍然没有充分利用资源。Agent 读 logs、写代码、debug、总结分支或等待模型响应时，机器人会闲置。更大的 fleet 能减少 wall-clock time，但也增加 coordination overhead，8 agents 时 token cost 出现 super-linear growth。

Environment construction 阶段也仍然需要人类引导。人仍然要提供任务目标，验证 reward/reset 行为，并提供代表性的 success/failure demonstrations。ENPIRE 把这部分工作摊销到后续 autonomous improvement 中，但没有完全消除它。

最后，整个闭环的成功很依赖暴露出来的工具质量。在 RoboCasa 中，论文指出 SAM3 对小物体或歧义物体会出现错误 mask 或无可用 mask。Prompt search 和更高分辨率有帮助，但 perception 仍是 bottleneck。这个问题也会泛化到真实硬件：如果 reset、verification 或 perception APIs 不稳定，agent 就会围绕不稳定反馈优化。

## Takeaways

ENPIRE 有意思的地方在于，它为 coding agents 提供了一个 robotics-shaped experimental substrate。核心贡献从新的 policy architecture 转向可重复物理反馈闭环，把 reward、reset、rollout、code editing 和 branch-level hypothesis selection 都暴露给 agent。

对 robot learning 来说，实践教训是：自治开始于 policy training 之前。只有当环境暴露 safe resets、reliable rewards、structured logs 和 reproducible execution 以后，robot fleet 才能真正被 coding agents 利用。这个 substrate 一旦存在，agentic code search 就可以改进 policy、发现训练 recipe，并用 token budget 换取 robot-time acceleration。

</div>
