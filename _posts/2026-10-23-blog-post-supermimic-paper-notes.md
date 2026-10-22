---
title: "[Paper Notes] SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model"
date: 2026-10-23
permalink: /posts/2026/10/supermimic-paper-notes/
tags:
  - Humanoid Control
  - World Models
  - Model-Based Reinforcement Learning
  - Differentiable Control
  - Motion Tracking
  - Paper Notes
---

<div id="supermimic-en" data-lang="en" markdown="1">

## Three hours, including learning the dynamics

SuperMimic reports surpassing SONIC's released motion-tracking checkpoint after three hours on one H100. The question that made me look more closely was what those three hours purchase: a policy update on top of an already trained world model, or the whole learning process? **The reported time covers simulator data collection, world-model fitting, and policy/critic training in one alternating loop.** Checkpoint evaluations are performed afterward and excluded. This is the training-loop budget; it should not be read as a measurement of every step of preparing a new robot and motion dataset. [§4.1](https://arxiv.org/pdf/2610.28480v1#page=6)

The next question is more interesting. If a simulator still supplies the dynamics data, why can learning a second model save so much computation? SuperMimic combines cheaper predicted trajectories with gradients through those trajectories, while sharing the learned dynamics across the motion library.

These notes follow *SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model*, by **Qiayuan Liao, Yiyang Shao, Junfeng Long, Kevin Zakka, Roberto Horowitz, Pieter Abbeel, and Koushil Sreenath**, UC Berkeley. [arXiv:2610.28480v1](https://arxiv.org/abs/2610.28480v1) was submitted on October 20, 2026 and lists acceptance as a CoRL 2026 Oral. Sources are the [paper](https://arxiv.org/pdf/2610.28480v1) and [official project page](https://supermimic.github.io/); the measurements below are author-reported.

## Two kinds of motion data do different jobs

The reference library specifies what the robot should do. SuperMimic uses G1-retargeted BONES-SEED motions, filtered to remove unsuitable terrain/object interactions and infeasible trajectories. The retained set contains 129,514 clips totaling 264.56 hours. A reference supplies the policy's goal and the target used by the tracking reward. [§4.1; Appendix E](https://arxiv.org/pdf/2610.28480v1#page=15)

World-model supervision comes from **what happens when the current policy acts in MuJoCo Warp**. The simulator executes a joint-target command, with exploration noise during collection, and records the resulting state transition. A useful shorthand for one dynamics training example is $(s_t,a_t^{\mathrm{exec}},\xi,s_{t+1})$, where $\xi$ contains episode parameters such as friction, joint calibration offsets, and torso center-of-mass offset. Reward, observation, and termination information support the other model components.

This distinction matters. A reference pose sequence alone does not specify which control command produced each transition. The collected data supplies that action–consequence relationship, including imperfect tracking and failures. Earlier policies' transitions remain usable because the body's dynamics do not depend on which policy collected them. The replay buffer retains recent experience as the controller improves. [§3.1–3.2](https://arxiv.org/pdf/2610.28480v1#page=4)

Here “world model” means a surrogate of the robot's state dynamics and task-relevant quantities. The dynamics network is an MLP with three hidden layers of width 2048; the task is grounded in simulator states and controls. [Appendix C](https://arxiv.org/pdf/2610.28480v1#page=15)

## What alternates, and what stays differentiable

Each training iteration has the following sequence:

1. Run the current policy in simulation and add transitions to the replay buffer.
2. Fit the world model on eight-step replay windows, feeding its predicted state into the next prediction while using recorded actions.
3. Start imagined rollouts from replay states, hold the world-model parameters fixed, and improve the policy through 32 predicted steps. Fit the critic using the imagined transitions.

The next iteration updates the world model again. Freezing its **parameters** during the policy update still allows derivatives through its **state and action inputs**. Otherwise the policy would lose the very gradient the method needs. The physical simulator supplies training targets without participating in backpropagation. [§3; Algorithm A.1](https://arxiv.org/pdf/2610.28480v1#page=15)

Writing the imagined dynamics as

$$
\hat s_{t+1}=f_\omega(\hat s_t,a_t,\xi),\qquad
a_t=\pi_\theta(\hat{\bar o}_t+\eta_t,g_t),
$$

the model provides a predicted noise-free observation $\hat{\bar o}_t$, and sensor noise $\eta_t$ is added for policy training. The policy maximizes the paper's short-horizon objective:

$$
\hat J(\theta)=\mathbb{E}\left[
\sum_{t=0}^{H-1}\gamma^t\hat c_t\hat r_{t+1}
+\gamma^H\hat c_H V_\psi(\hat s_H,g_H,\xi)
\right],\qquad H=32.
$$

The survival weight follows $\hat c_0=1$ and $\hat c_{t+1}=\hat c_t(1-\hat d_{t+1})$, using the predicted termination probability. This makes termination affect the objective smoothly. The critic supplies value beyond the rollout horizon. At the 50 Hz control rate, 32 steps cover 0.64 seconds: the model handles a short explicit trajectory, and the critic represents its longer-term consequences. [Eq. 2; §3.3](https://arxiv.org/pdf/2610.28480v1#page=5)

## Where the speed comes from

**A cheaper forward calculation.** The simulator resolves rigid-body dynamics and contact at each step. A learned network approximates the resulting transition with batched neural computation. On an H100, the paper measures more than 10× higher rollout throughput at the 2k–16k batch sizes used in practice. The comparison counts one 50 Hz control step, implemented by MuJoCo Warp as four 5 ms substeps; the world model uses TF32. This is a rollout-throughput result, with model fitting and policy backpropagation accounted for separately in the full training time. [Figure 5(a)](https://arxiv.org/pdf/2610.28480v1#page=8)

**A more informative policy update.** PPO estimates improvement from sampled actions and their advantages while treating the transition function as a black box. A differentiable dynamics model supplies local derivatives of the predicted next state with respect to the action. Backpropagation through time connects policy parameters to actions, predicted states, and return. For intuition, the model can indicate how a small change to a joint command would affect a later tracking error. That direction is an estimate under the learned dynamics.

The paper isolates this second contribution with **PPO-WM**, which also learns from world-model rollouts. On LAFAN1 walk/run/sprint motions, SuperMimic reaches PPO-WM's best training return with approximately **64× fewer imagined steps**. This is the result I find most useful for understanding the method: both optimizers already have access to inexpensive imagined experience, yet their learning efficiency differs substantially. Its scope is this mechanism ablation, and its metric is imagined steps to a specified training return. It is not a measured 64× reduction in simulator interactions across the full BONES-SEED dataset. [Figure 5(b)](https://arxiv.org/pdf/2610.28480v1#page=8)

The 10× throughput result and 64× step-efficiency result have different denominators and experimental settings. Multiplying them would not establish the total training speedup.

Shared dynamics explain why this can remain useful as the library grows. Walking, rolling, and jumping expose different parts of the same body's dynamics. Across the authors' 1–264-hour data sweep, the normalized eight-step state prediction error stays within 0.007–0.011 while compute to a target return grows slowly. These errors are measured online on policy rollouts, so the evidence concerns the encountered training distribution. My reading is that the cost of learning the body's response can be reused across many motion goals; the sweep does not establish unrestricted extrapolation to new contacts or embodiments. [Figure 3](https://arxiv.org/pdf/2610.28480v1#page=7)

## The results and their measurement boundaries

| Controller | Reported training hardware and time | Failed motions out of 129,514 |
|---|---|---:|
| SONIC released checkpoint | 128 L40 GPUs, 7 days | 179 |
| SuperMimic | 1 H100 GPU, 3 hours | 25 |
| SuperMimic | 2 H100 GPUs, 9.8 hours | 0 |

The three-hour run also exceeds SONIC's normalized return. SONIC's reported budget is about 21,000 GPU-hours; the corresponding SuperMimic checkpoint costs three GPU-hours. Hardware differs, and SONIC trained on 611 hours of motion compared with SuperMimic's 264.56 hours. These are published pipeline costs, not a controlled same-hardware measure of algorithmic efficiency. [§4.1](https://arxiv.org/pdf/2610.28480v1#page=6)

A separate LAFAN1 comparison matches motions, observations, rewards, termination, domain randomization, network sizes, and evaluation protocol. SuperMimic reaches an evaluation return of 0.82 in 1.2 hours on one GPU. PPO-Sim does not reach that value within 18 hours, including its eight-GPU configuration, whose final return is 0.72. This supports the efficiency claim under a more closely matched setup, while remaining a comparison against the specified PPO recipe. [Figure 4(a)](https://arxiv.org/pdf/2610.28480v1#page=7)

The large benchmark evaluates each motion once from its first frame, with deterministic physics, foot friction 1.0, and no observation noise or domain randomization. Failure uses SuperMimic's termination rule. **The evaluated motions belong to both methods' training sets, so zero failures measures training-motion coverage.** It does not mean zero tracking error or success on unseen motions. The real G1 demonstrations separately establish transfer of one tracker across motions including a side roll and flips. [Appendix F; §4.4](https://arxiv.org/pdf/2610.28480v1#page=17)

## The approximation that still needs checking

A model can predict states reasonably well while giving imperfect local derivatives. Differentiability makes an update available; its usefulness depends on the learned approximation in the states the policy visits. Continued simulator collection helps keep that approximation current, and short rollouts limit how far the policy differentiates through accumulated prediction error.

The critic has a measurable role here. In the reported horizon sweep, training without it fails at horizons of 16 steps or fewer. With a critic, 16 steps match the critic-free 32-step setting, while the default 32-step setting reaches the target return fastest. Extending the rollout to 128 steps increases cost and lowers final return in that sweep. More imagined future is therefore not automatically better. [§4.3; Figure 4](https://arxiv.org/pdf/2610.28480v1#page=8)

I would prioritize this approach for a controller with a dense tracking reward, a shared body, and many reference motions. For manipulation or uneven terrain, my first experiment would test model prediction and policy improvement around the new contacts under a matched compute budget. The paper learns dynamics entirely from simulation and trains on flat ground; terrain and object interaction remain outside its demonstrated scope. That is where the proposed reuse of dynamics still needs evidence. [§6](https://arxiv.org/pdf/2610.28480v1#page=9)

</div>

<div id="supermimic-zh" data-lang="zh" markdown="1" style="display: none;">

## 三小时包含动力学模型的学习

SuperMimic 报告，用一张 H100 训练三小时，就能超过 SONIC 已发布动作跟踪模型的回报。我最先想确认的是这三小时的计时范围：是在一个提前训练好的世界模型上优化策略，还是涵盖完整学习过程？**论文明确将仿真数据采集、世界模型拟合，以及策略和 critic 的训练都计入这三小时。** Checkpoint 评估在训练后运行，不计入。这里衡量的是训练循环，不能扩展理解为适配新机器人、准备动作数据等全部工作的耗时。[§4.1](https://arxiv.org/pdf/2610.28480v1#page=6)

接下来的问题更有意思：动力学数据仍然由仿真器生成，额外学习一个模型为什么能节省这么多计算？SuperMimic 将更便宜的预测轨迹与沿轨迹反向传播的梯度结合，并在整个动作库中复用同一套学到的动力学。

本文依据 *SuperMimic: Scaling Humanoid Whole-Body Control with One Differentiable World Model*，作者为 UC Berkeley 的 **Qiayuan Liao、Yiyang Shao、Junfeng Long、Kevin Zakka、Roberto Horowitz、Pieter Abbeel 和 Koushil Sreenath**。[arXiv:2610.28480v1](https://arxiv.org/abs/2610.28480v1) 于 2026 年 10 月 20 日提交，标注为 CoRL 2026 Oral。资料来源为[论文](https://arxiv.org/pdf/2610.28480v1)与[官方项目主页](https://supermimic.github.io/)，下文实验数字均由作者报告。

## 两类动作数据承担不同的任务

参考动作库规定机器人应该做什么。SuperMimic 使用已经重定向到 G1 的 BONES-SEED 数据，过滤不适用于当前地形、物体条件的动作，以及不可行轨迹后，保留 129,514 段，共 264.56 小时。参考轨迹为策略提供目标，也为跟踪奖励提供比较对象。[§4.1；附录 E](https://arxiv.org/pdf/2610.28480v1#page=15)

世界模型的监督数据来自**当前策略在 MuJoCo Warp 中执行动作后实际发生的状态变化**。仿真器执行关节目标指令，采集阶段还会向指令加入探索噪声，再记录状态转移。一个动力学训练样本可以简写为 $(s_t,a_t^{\mathrm{exec}},\xi,s_{t+1})$，其中 $\xi$ 包含摩擦、关节标定偏移、躯干质心偏移等回合参数。奖励、观测和终止信息则服务于模型的其他组成部分。

这个区别很重要。参考姿态序列本身没有说明每次状态变化由什么控制指令产生；仿真交互补充了动作与结果的对应关系，其中包含跟踪偏差和失败。旧策略采集的转移仍然有用，因为身体动力学不取决于采集数据的策略身份。随着控制器改进，回放缓冲区持续保存近期经验。[§3.1–3.2](https://arxiv.org/pdf/2610.28480v1#page=4)

这里的“世界模型”是机器人状态动力学及任务相关量的代理模型。动力学网络采用三层隐藏层、每层宽度 2048 的 MLP，学习对象是仿真状态与控制之间的关系。[附录 C](https://arxiv.org/pdf/2610.28480v1#page=15)

## 交替更新什么，梯度又穿过什么

每轮训练按以下顺序进行：

1. 当前策略在仿真器中执行，将状态转移加入回放缓冲区。
2. 从缓冲区抽取八步窗口，使用记录的动作自回归拟合世界模型，将预测状态继续输入下一步。
3. 从回放状态出发，在暂时固定世界模型参数的条件下展开 32 步想象轨迹，通过反向传播改进策略，并用想象轨迹训练 critic。

下一轮会再次更新世界模型。策略更新时固定的是世界模型的**参数**，对其**状态和动作输入**的导数仍然保留，否则策略就失去了所需的梯度。物理仿真器负责提供监督目标，不参与反向传播。[§3；算法 A.1](https://arxiv.org/pdf/2610.28480v1#page=15)

将想象过程写成：

$$
\hat s_{t+1}=f_\omega(\hat s_t,a_t,\xi),\qquad
a_t=\pi_\theta(\hat{\bar o}_t+\eta_t,g_t),
$$

模型给出预测的无噪声观测 $\hat{\bar o}_t$，策略训练时再加入传感器噪声 $\eta_t$。策略最大化论文中的短时域目标：

$$
\hat J(\theta)=\mathbb{E}\left[
\sum_{t=0}^{H-1}\gamma^t\hat c_t\hat r_{t+1}
+\gamma^H\hat c_H V_\psi(\hat s_H,g_H,\xi)
\right],\qquad H=32.
$$

生存权重满足 $\hat c_0=1$、$\hat c_{t+1}=\hat c_t(1-\hat d_{t+1})$，其中 $\hat d$ 是预测的终止概率，使终止对目标的影响可以平滑求导。Critic 补充展开终点之后的价值。在 50 Hz 控制频率下，32 步对应 0.64 秒：模型显式预测这一小段轨迹，critic 则表示更长时间范围的后果。[公式 2；§3.3](https://arxiv.org/pdf/2610.28480v1#page=5)

## 加速具体来自哪里

**前向计算更便宜。** 物理仿真器每步需要处理刚体动力学和接触，神经网络则通过批量计算近似最终的状态转移。论文在 H100 上测得，在实际使用的 2k–16k 并行规模下，世界模型 rollout 吞吐量超过 MuJoCo Warp 的 10 倍。比较中的一步对应一个 50 Hz 控制周期，MuJoCo Warp 内部执行四个 5 ms 子步；世界模型使用 TF32。这衡量的是生成轨迹的吞吐量，拟合模型与策略反向传播的开销仍需计入完整训练时间。[图 5(a)](https://arxiv.org/pdf/2610.28480v1#page=8)

**策略更新获得了更直接的信息。** PPO 根据采样动作及其 advantage 估计如何改进策略，将状态转移视为黑箱。可微动力学模型则提供“动作发生小幅变化时，预测的下一状态如何变化”的局部导数。沿时间反向传播将策略参数、动作、预测状态和回报连接起来。直观地说，模型可以估计关节指令稍作调整会怎样影响后续跟踪误差；这个方向依赖学到的动力学近似。

作者用同样在世界模型中训练的 **PPO-WM** 分离出第二种收益。在 LAFAN1 的走、跑、冲刺动作上，SuperMimic 达到 PPO-WM 最佳训练回报所需的想象步数约少 **64 倍**。我认为这组实验最有助于理解方法：两个优化器都能使用便宜的想象经验，学习效率仍然差别很大。这个数字的适用范围是该消融设置，指标是达到指定训练回报所需的 imagined steps，不能当作完整 BONES-SEED 动作库上的仿真交互量减少倍数。[图 5(b)](https://arxiv.org/pdf/2610.28480v1#page=8)

10 倍吞吐量与 64 倍步数效率的分母、实验条件不同，直接相乘无法得到完整训练的加速比。

共享动力学进一步解释了动作库扩大后为何仍能受益。走路、翻滚、跳跃覆盖的是同一个身体动力学的不同部分。作者将数据量从 1 小时扩大到 264 小时，归一化八步状态预测误差维持在 0.007–0.011，达到目标回报所需的计算量增长较慢。误差在线测于策略生成的轨迹，因此证据对应训练过程中访问到的分布。我的理解是，学习身体响应的成本能够在大量动作目标之间复用；这组实验尚不能证明模型能任意外推到新接触条件或新机器人形态。[图 3](https://arxiv.org/pdf/2610.28480v1#page=7)

## 实验结果与测量范围

| 控制器 | 报告的训练硬件与时间 | 129,514 条动作中的失败数 |
|---|---|---:|
| SONIC 已发布 checkpoint | 128 张 L40，7 天 | 179 |
| SuperMimic | 1 张 H100，3 小时 | 25 |
| SuperMimic | 2 张 H100，9.8 小时 | 0 |

三小时的模型也超过了 SONIC 的归一化回报。SONIC 报告的训练预算约为 21,000 GPU-hours，SuperMimic 对应 checkpoint 为 3 GPU-hours。双方硬件不同，SONIC 使用 611 小时动作数据，SuperMimic 使用 264.56 小时。这些数字比较的是各自训练流程的报告成本，不能等同于同硬件受控实验中的算法效率比。[§4.1](https://arxiv.org/pdf/2610.28480v1#page=6)

论文另在 LAFAN1 上对齐动作、观测、奖励、终止、域随机化、网络规模和评估协议。SuperMimic 单卡 1.2 小时达到 0.82 的评估回报；PPO-Sim 在 18 小时内未达到这一数值，包括最终回报为 0.72 的八卡配置。这为效率优势提供了条件更接近的证据，其结论仍对应文中指定的 PPO 训练配置。[图 4(a)](https://arxiv.org/pdf/2610.28480v1#page=7)

大规模基准中，每条动作从第一帧执行一次，使用确定性物理、1.0 的足部摩擦系数，关闭观测噪声和域随机化，并按 SuperMimic 的终止规则判定失败。**这些动作属于双方训练集，因此零失败衡量的是训练动作覆盖率。** 它不等于零跟踪误差，也不代表在未见动作上全部成功。真实 G1 上的侧滚、翻转等演示，则另行提供了同一个跟踪器跨动作迁移到硬件的证据。[附录 F；§4.4](https://arxiv.org/pdf/2610.28480v1#page=17)

## 仍然需要检验的近似

模型对状态的预测足够接近，并不自动保证局部导数足够准确。可微性让策略获得更新方向，方向是否有效取决于模型在策略访问区域内的近似质量。持续采集仿真数据有助于跟上策略分布的变化，短 rollout 则限制了梯度穿过累积预测误差的长度。

Critic 的作用有具体实验支持：在时域长度消融中，去掉 critic 后，16 步及以下的训练失败；加入 critic 后，16 步可达到无 critic 的 32 步设置的水平，默认 32 步则最快达到目标回报。继续延长到 128 步，在该实验中增加了计算开销，还降低了最终回报。想象得更远并不自动带来更好的控制。[§4.3；图 4](https://arxiv.org/pdf/2610.28480v1#page=8)

面对有密集跟踪奖励、共享机器人身体和大量参考动作的任务，我会优先考虑这条路线。若扩展到操作或复杂地形，我会先在相同计算预算下检验新接触附近的模型预测与策略改进。论文的动力学学习完全依赖仿真，训练限定在平地，尚未覆盖地形和物体交互；共享动力学能否继续带来同样的收益，需要从这些条件下的新证据判断。[§6](https://arxiv.org/pdf/2610.28480v1#page=9)

</div>
