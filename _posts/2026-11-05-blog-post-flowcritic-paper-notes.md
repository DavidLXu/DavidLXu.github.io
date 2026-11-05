---
title: "[Paper Notes] FlowCritic: Bridging Value Estimation with Flow Matching in Reinforcement Learning"
date: 2026-11-05
permalink: /posts/2026/11/flowcritic-paper-notes/
excerpt: "FlowCritic samples state-conditioned returns with flow matching and uses their relative dispersion to weight PPO policy updates."
tags:
  - Paper Notes
  - Reinforcement Learning
  - Flow Matching
  - Distributional Reinforcement Learning
  - PPO
---

<div data-lang="en" markdown="1">

**FlowCritic** asks how much each state should contribute to a PPO update. Imagine two states with the same expected return of 10. In one, most rollouts earn close to 10. In the other, returns cluster around 0 and 20. A scalar value baseline gives both states the same score. FlowCritic learns to sample possible returns at each state and gives the second state less weight when updating the policy.

Shan Zhong, Shutong Ding, He Diao, Xiangyu Wang, Kah Chan Teh, and Bei Peng published the paper in *IEEE TPAMI* in 2026. Equation and table numbers below refer to arXiv v2. [Journal article](https://doi.org/10.1109/TPAMI.2026.3728663) · [Full text](https://arxiv.org/html/2510.22686v2)

## What the flow learns

One draw from the critic represents the discounted return that could follow from a state under the current policy. To build a training target, FlowCritic takes an on-policy rollout and works backward, combining observed rewards with sampled continuation returns through a λ-return recursion. It detaches the resulting scalar target from the computation graph.

Call that target *y*. Draw fresh standard Gaussian noise *e* and a flow time *u* uniformly between zero and one. At the interpolation point *(1 − u)e + uy*, the network sees the state, the point, and the flow time. Its regression target is the velocity *y − e*. Repeating this exercise across rollouts teaches a state-conditioned velocity field. At sampling time, five Euler steps carry a fresh noise draw through that field to produce one return estimate. During training, a clipped loss penalizes large changes in predicted velocity relative to the previous network (Eqs. 20–25).

## How ten samples change a PPO update

The same ten generated returns serve two different calculations. For the **advantage baseline**, the default configuration discards the highest draw and averages the remaining nine. PPO uses that conservative estimate in the temporal-difference errors that feed generalized advantage estimation. The truncation acts on generated critic samples. A high reward actually earned during the rollout still enters the advantage calculation.

For the **policy weight**, FlowCritic uses all ten draws. Given their mean μ and standard deviation σ, it computes κ = σ / (|μ| + 10⁻⁸) and assigns weight exp(−0.1κ). The weights are rescaled to average one across the batch, then multiply the individual terms of PPO’s clipped policy objective. This explains a sensitivity worth checking when adapting the method. Adding a constant to all ten draws preserves their spread but changes their mean, so a change in the reward offset can change which states receive the most weight. [Method, Eqs. 26–35](https://arxiv.org/html/2510.22686v2#S4)

## What the experiments measure

Across 12 Isaac Gym tasks and five seeds, FlowCritic had the highest mean episodic return over the final 10% of training on every task. The size of the lead varied. On AllegroHand it scored 1044.12 against 742.51 for the strongest baseline, PPO-IQN. On BallBalance the same comparison was 377.87 against 376.44. In the Ant ablation, removing the dispersion-based weighting caused the largest drop. Removing velocity clipping or upper-tail truncation mainly increased the spread of the later learning curves. [Table III and Fig. 4](https://arxiv.org/html/2510.22686v2#S6)

The extra sampling costs training time. With 1,024 parallel environments, one million transitions took 14.73 seconds for FlowCritic and 9.09 for PPO. The deployed Unitree Go2 ran only the actor, including during stair climbing. For a robotics implementation, this separates two budgets worth measuring independently, namely simulator training time and time per control action on the robot. [Table V and Fig. 7](https://arxiv.org/html/2510.22686v2#S6)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**FlowCritic** 研究的是 PPO 更新策略时，每个状态应当占多大权重。假设两个状态的期望回报都是 10。从第一个状态出发，多数轨迹的回报都接近 10。从第二个出发，回报大多落在 0 或 20 附近。标量价值基线给两者的分数相同。FlowCritic 学习从每个状态可能产生的回报中采样，再根据这些样本降低第二个状态在策略更新中的权重。

作者为 Shan Zhong、Shutong Ding、He Diao、Xiangyu Wang、Kah Chan Teh 和 Bei Peng，论文于 2026 年发表于 *IEEE TPAMI*。下文的公式和图表编号采用 arXiv v2。[期刊论文](https://doi.org/10.1109/TPAMI.2026.3728663) · [论文全文](https://arxiv.org/html/2510.22686v2)

## 流模型具体学什么

给定一个状态，critic 每采样一次，就得到一个在当前策略下可能出现的折扣回报。训练时，FlowCritic 沿当前策略采集的轨迹向后递推，用 λ-return 将实际奖励和采样得到的后续回报合成一个标量目标，并在这个目标处停止梯度传播。

把目标记作 *y*，独立采一个标准高斯噪声 *e*，再从 0 到 1 之间均匀采一个流时间 *u*。网络的输入是状态、插值点 *(1 − u)e + uy* 和流时间，监督信号是从噪声走向目标的速度 *y − e*。在不同轨迹上重复训练，就得到以状态为条件的速度场。使用 critic 时，从一份新噪声出发，沿速度场做五步欧拉积分，即可生成一个回报样本。训练损失还会参考上一版网络的预测，对速度变化过大的更新施加约束（公式 20–25）。

## 十个回报样本怎样进入 PPO

同一组样本用了两次，取法各有讲究。计算**优势基线**时，默认生成十个回报，去掉最大值，对余下九个取均值。这个偏保守的估计进入时序差分误差，再通过广义优势估计得到每一步的优势。截断只作用于 critic 生成的样本，轨迹中实际获得的高奖励仍会计入优势。

计算**策略权重**时，十个样本全部参与。记样本均值为 μ、标准差为 σ，变异系数为 κ = σ / (|μ| + 10⁻⁸)，对应权重为 exp(−0.1κ)。作者把整批权重归一化到均值为一，再给 PPO 裁剪目标中的各项加权。从这个公式可以看出，迁移到新任务时值得检查奖励的零点。给十个回报都加上同一常数，标准差保持原值，均值却会移动，各状态在更新中的相对权重也可能随之改变。[方法，公式 26–35](https://arxiv.org/html/2510.22686v2#S4)

## 哪些任务受益，代价有多大

作者在 12 个 Isaac Gym 任务上各运行五个随机种子，统计训练最后 10% 阶段的平均回合回报。FlowCritic 在每个任务上的均值都排第一，领先幅度则因任务而异。AllegroHand 上，FlowCritic 得到 1044.12，最强基线 PPO-IQN 得到 742.51。换到 BallBalance，两者分别是 377.87 和 376.44。Ant 上的消融显示，去掉变异系数加权后，回报下降最多。去掉速度裁剪或高值截断，主要影响是训练后期各次运行的表现更分散。[表 III 和图 4](https://arxiv.org/html/2510.22686v2#S6)

多次采样的代价主要体现在训练阶段。在 1,024 个并行环境下，每百万次环境转移耗时 14.73 秒，标准 PPO 为 9.09 秒。部署到宇树 Go2 后，机器人在爬台阶等任务中只需运行 actor。因此，评估这类方法时可以分别计量仿真训练耗时和真机每次输出动作的延迟。[表 V 和图 7](https://arxiv.org/html/2510.22686v2#S6)

</div>
