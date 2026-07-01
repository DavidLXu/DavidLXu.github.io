---
title: "[Paper Notes] Inverting the Bellman Equation: From Q-Values to World Models"
date: 2026-07-02
permalink: /posts/2026/07/inverting-bellman-q-values-world-models-paper-notes/
tags:
  - Reinforcement Learning
  - Goal-Conditioned RL
  - World Models
  - Model-Free RL
  - Theory
---

<div data-lang="en" markdown="1">

**Inverting the Bellman Equation** asks a deceptively simple question: if a model-free, value-based agent has learned \(Q(s,a,g)\) for many goals, how much of the environment dynamics is already encoded inside those values?

My read: the paper turns the usual RL direction around. Classical value learning fixes the transition kernel \(P\) and solves for \(Q\). This work fixes \(Q\), the policy \(\pi\), and the reward family \(r\), then solves for a compatible transition kernel \(P\). The resulting method, **\(P\)-learning**, is both an extraction algorithm and a conceptual bridge between model-free RL, model-based RL, and goal-conditioned RL.

## Paper Info

The paper is **"Inverting the Bellman Equation: From \(Q\)-Values to World Models"** by **Alistair Letcher, Mattie Fellows, Alexander D. Goldie, Jonathan Richens, Jakob N. Foerster, and Oliver Richardson** from FLAIR, University of Oxford, Google DeepMind, and Mila. It appears on arXiv as [arXiv:2606.21173](https://arxiv.org/abs/2606.21173), submitted on **June 19, 2026**. The paper reports code at [github.com/aletcher/inverting-bellman](https://github.com/aletcher/inverting-bellman).

The high-level claim is that goal-conditioned value functions can carry more than task-specific preference. Under suitable goal coverage, they can identify the environment transition kernel. Even when the theory's sufficient conditions are stronger than the experiments satisfy, the extracted world models are accurate in Reacher, MountainCar, and stochastic FourRooms variants.

## Why This Is Interesting

Model-free RL is usually described as reward-specific: the agent learns values or policies useful for the training reward, while a model-based agent learns dynamics \(P(s'|s,a)\). The value-equivalence problem explains why this distinction is not trivial. Many different dynamics can induce the same value function for a single reward, so a value function alone may underdetermine the world.

Goal-conditioned RL changes the information content. A collection of values \(\{Q_g\}_{g\in G}\) gives many Bellman constraints on the same unknown transition kernel. Each goal contributes a different "probe" of the next-state distribution. If these probes are rich enough, the transition kernel becomes identifiable.

The paper's central question is:

\[
\text{When do value-based agents implicitly encode an accurate model of their environment?}
\]

## P-Learning: Bellman Inversion

For a fixed goal-conditioned agent, assume we know:

- a \(Q\)-function \(Q(s,a,g)\),
- the policy \(\pi(a'|s',g)\), usually induced by the \(Q\)-function,
- the reward family \(r(s,g)\),
- the discount factor \(\gamma\).

Instead of learning \(Q\) from environment transitions, \(P\)-learning learns a candidate world model \(P_\phi\) by minimizing the Bellman residual:

\[
L(\phi)=\left\|T^\pi_{P_\phi}(Q)-Q\right\|_d^2.
\]

Here the Bellman operator depends on the candidate model:

\[
T^\pi_{P_\phi}(Q)(s,a,g)
=
\mathbb{E}_{s'\sim P_\phi(s,a),\,a'\sim \pi(s',g)}
\left[
r(s',g)+\gamma Q(s',a',g)
\right].
\]

So \(P\)-learning searches for dynamics under which the already-learned \(Q\)-values satisfy the Bellman equation. This is the inverse analogue of \(Q\)-learning:

| Usual direction | Inverted direction |
|---|---|
| Fix \(P\), learn \(Q\) such that \(T_P(Q)=Q\) | Fix \(Q\), learn \(P\) such that \(T_P(Q)=Q\) |
| Environment samples provide next states | The candidate model samples next states |
| Target moves as \(Q\) changes | Objective is stationary for fixed \(Q,\pi,r\) |

For finite state spaces, the paper rewrites the Bellman equation as a linear system. Define

\[
M(s',g)=r(s',g)+\gamma V(s',g),
\]

where \(V(s',g)=\mathbb{E}_{a'\sim\pi(s',g)}[Q(s',a',g)]\). For each state-action pair:

\[
M P(s,a)=Q(s,a).
\]

This makes the extraction problem especially clear. The rows of \(M\) are Bellman probes indexed by goals; the unknown is the next-state distribution \(P(s,a)\). If \(M\) has enough rank, \(P(s,a)\) is determined.

The tabular \(P\)-learning update is:

\[
P_{n+1}(s,a)=P_n(s,a)-\alpha M^\top(MP_n(s,a)-Q(s,a)).
\]

Theorem 1 shows that this converges to:

\[
P_\infty(s,a)=M^+Q(s,a)+(I-M^+M)P_0(s,a),
\]

where \(M^+\) is the Moore-Penrose pseudo-inverse. The second term is the remaining value-equivalence ambiguity. If \(M\) has full column rank, that ambiguity vanishes and the solution becomes unique.

## When Are Dynamics Identifiable?

The theoretical section gives sufficient conditions for recovering \(P\) from \(Q,\pi,r\). A useful way to remember the results is:

| Setting | What goals need to do |
|---|---|
| Deterministic finite MDP | A single generic goal can be enough |
| Stochastic finite MDP | Goals need to span the state space; \(|G|\ge |S|\) is a clean sufficient condition |
| Local stochastic finite MDP | Fewer goals can suffice if transition support is local or known |
| Deterministic continuous MDP | Coverage or structured Gaussian goals can separate successor states |
| Stochastic continuous MDP | The paper proves coverage-based results mainly for unconditional policies |

The intuition is test functions. For each goal \(g\), the Bellman equation gives:

\[
Q(s,a,g)=\mathbb{E}_{s'\sim P(s,a)}[M_g(s')].
\]

So each \(M_g\) is a known test function whose expectation under the unknown next-state distribution must match \(Q(s,a,g)\). One goal gives one expectation constraint. Many sufficiently different goals can determine the whole distribution, much like enough moments can determine a finite distribution.

This also clarifies the deterministic case. If dynamics are deterministic, the unknown next state is a point, so the columns \(M(\cdot,g)\) only need to distinguish states. A single generic reward can make those columns distinct. For stochastic dynamics, the unknown is a distribution over states, so spanning or rank conditions are stronger.

## Experiments

The experiments test whether this extraction works when the theoretical conditions are only partly met. Agents are trained with PQN plus Hindsight Experience Replay, then \(P\)-learning extracts a world model from the converged \(Q\)-values.

**Reacher.** The agent is trained on only four position goals on the unit circle. The continuous state includes joint angles, angular velocities, and fingertip position, but the training rewards depend only on fingertip position. Despite imperfect learned \(Q\)-values, the extracted world model is very accurate: the paper reports world-model NMSE around \(1.2\times 10^{-4}\). Policies trained entirely inside the extracted model are quasi-optimal on unseen goals, including velocity goals that were outside the position-only reward family.

The architecture sweep is also important. Across 42 Reacher architectures and 10 seeds each, better goal-conditioned agents tend to have more accurate extracted world models. The paper reports a Spearman correlation of \(-0.98\) between agent return and world-model error, and \(+0.95\) between agent return and the return of policies trained inside the extracted model on unseen goals.

**MountainCar.** The position-trained agent uses four sparse position goals. The extracted dynamics match the true transition kernel well, with NMSE around \(6.7\times 10^{-3}\). Planning inside the extracted world model works on out-of-distribution goals such as velocity targets and constrained hill-climbing. A second agent trained on velocity goals yields a world model extremely close to the position-trained agent's world model, suggesting that different reward views of the same environment can lead to similar implicit dynamics.

**FourRooms.** The finite-state experiments test deterministic, windy, and teleporting gridworlds. In deterministic FourRooms, one generic training goal recovers the world model exactly, matching the finite deterministic theory. In windy FourRooms, four goals bring the world-model-derived policy within about 1% of optimal return. In teleporting FourRooms, 20 goals work well even though the worst-case stochastic finite-state guarantee would suggest \(|G|=|S|=68\).

## Strengths and Limitations

The strongest part of the paper is the clean inversion view. It gives a concrete procedure for asking what dynamics are already latent in a trained value function. That makes the result relevant to transfer, interpretability, auditing, and hybrid RL: a model-free agent may already contain a usable model, even if it never explicitly represented one during training.

The second strength is the theory-experiment contrast. The theorems explain when recovery is guaranteed, while the experiments show that useful recovery can happen with far fewer goals than the worst-case sufficient conditions require. This gap is productive: it suggests that practical environments and learned \(Q\)-functions have structure that the broad theory does not yet exploit.

The limitations are real. The continuous stochastic theory is restricted mainly to unconditional policies. The work does not cover partially observable MDPs or model-free agents that do not learn \(Q\)-values. The experiments are still small relative to modern large-scale RL systems, and \(P\)-learning is framed as an extraction and analysis tool, not as a replacement for model-based RL.

## Takeaway

The reusable idea is: **a goal-conditioned \(Q\)-function is a set of Bellman probes into the transition kernel**. With enough goal diversity, those probes can identify the dynamics. \(P\)-learning turns that observation into an algorithm: fit a world model whose Bellman operator makes the agent's existing \(Q\)-values self-consistent. The result is a sharper picture of goal-conditioned RL as an implicitly hybrid method: it can look model-free on the surface while carrying a recoverable world model inside its values.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**Inverting the Bellman Equation** 问了一个看起来简单、其实很深的问题：如果一个 model-free value-based agent 已经学到了很多 goals 下的 \(Q(s,a,g)\)，这些 values 里面到底隐含了多少环境 dynamics？

我的理解是：这篇论文把 RL 里常见的方向反过来了。经典 value learning 固定 transition kernel \(P\)，求解 \(Q\)。这篇固定 \(Q\)、policy \(\pi\) 和 reward family \(r\)，再反推出一个 compatible transition kernel \(P\)。这个方法叫 **\(P\)-learning**，既是 world model extraction 算法，也是连接 model-free RL、model-based RL 和 goal-conditioned RL 的概念桥梁。

## 论文信息

论文标题是 **"Inverting the Bellman Equation: From \(Q\)-Values to World Models"**，作者是 **Alistair Letcher, Mattie Fellows, Alexander D. Goldie, Jonathan Richens, Jakob N. Foerster, and Oliver Richardson**，来自 FLAIR, University of Oxford、Google DeepMind 和 Mila。arXiv 页面是 [arXiv:2606.21173](https://arxiv.org/abs/2606.21173)，提交日期是 **2026 年 6 月 19 日**。论文中给出的代码地址是 [github.com/aletcher/inverting-bellman](https://github.com/aletcher/inverting-bellman)。

高层判断是：goal-conditioned value functions 同时承载 task-specific preference 和 dynamics information。在合适的 goal coverage 下，它们可以识别环境 transition kernel。即使实验设置没有完全满足理论中的充分条件，论文也能在 Reacher、MountainCar 和 stochastic FourRooms variants 中抽取出准确的 world models。

## 为什么这个问题有意思

Model-free RL 通常被理解成 reward-specific：agent 学到的是对训练 reward 有用的 values 或 policies；model-based agent 才显式学习 dynamics \(P(s'|s,a)\)。value-equivalence problem 说明这个区别有真实的数学含义。对于单个 reward，很多不同的 dynamics 可能诱导出同一个 value function，因此一个 value function 往往无法唯一决定世界。

Goal-conditioned RL 改变了信息量。一组 values \(\{Q_g\}_{g\in G}\) 会给同一个未知 transition kernel 提供很多 Bellman constraints。每个 goal 都像是对 next-state distribution 的一个不同 probe。只要这些 probes 足够丰富，transition kernel 就可能被识别出来。

论文的核心问题可以写成：

\[
\text{When do value-based agents implicitly encode an accurate model of their environment?}
\]

## P-Learning：反过来用 Bellman Equation

对一个固定的 goal-conditioned agent，假设我们知道：

- \(Q\)-function \(Q(s,a,g)\)，
- policy \(\pi(a'|s',g)\)，通常由 \(Q\)-function 诱导，
- reward family \(r(s,g)\)，
- discount factor \(\gamma\)。

\(P\)-learning 的方向是通过最小化 Bellman residual 来学习候选 world model \(P_\phi\)，输入端使用已有 \(Q\) 而非从环境 transitions 重新学习 values：

\[
L(\phi)=\left\|T^\pi_{P_\phi}(Q)-Q\right\|_d^2.
\]

这里 Bellman operator 依赖候选模型：

\[
T^\pi_{P_\phi}(Q)(s,a,g)
=
\mathbb{E}_{s'\sim P_\phi(s,a),\,a'\sim \pi(s',g)}
\left[
r(s',g)+\gamma Q(s',a',g)
\right].
\]

所以 \(P\)-learning 寻找的是一组 dynamics，使得已经学好的 \(Q\)-values 满足 Bellman equation。它可以看成 \(Q\)-learning 的反向版本：

| 常规方向 | 反向方向 |
|---|---|
| 固定 \(P\)，学习满足 \(T_P(Q)=Q\) 的 \(Q\) | 固定 \(Q\)，学习满足 \(T_P(Q)=Q\) 的 \(P\) |
| 环境 samples 提供 next states | 候选模型 samples next states |
| \(Q\) 更新时 target 也在变 | 对固定 \(Q,\pi,r\)，objective 是 stationary 的 |

在 finite state space 中，论文把 Bellman equation 写成线性系统。定义：

\[
M(s',g)=r(s',g)+\gamma V(s',g),
\]

其中 \(V(s',g)=\mathbb{E}_{a'\sim\pi(s',g)}[Q(s',a',g)]\)。对每个 state-action pair：

\[
M P(s,a)=Q(s,a).
\]

这样 extraction problem 就很清楚了。\(M\) 的每一行是由 goal 索引的 Bellman probe；未知量是 next-state distribution \(P(s,a)\)。如果 \(M\) 有足够 rank，\(P(s,a)\) 就被确定下来。

tabular \(P\)-learning update 是：

\[
P_{n+1}(s,a)=P_n(s,a)-\alpha M^\top(MP_n(s,a)-Q(s,a)).
\]

Theorem 1 证明它收敛到：

\[
P_\infty(s,a)=M^+Q(s,a)+(I-M^+M)P_0(s,a),
\]

其中 \(M^+\) 是 Moore-Penrose pseudo-inverse。第二项表示残留的 value-equivalence ambiguity。如果 \(M\) 是 full column rank，这个 ambiguity 消失，解就是唯一的。

## 什么时候 Dynamics 可识别

理论部分给出了从 \(Q,\pi,r\) 恢复 \(P\) 的充分条件。可以这样记：

| Setting | Goals 需要提供什么 |
|---|---|
| Deterministic finite MDP | 一个 generic goal 可能就足够 |
| Stochastic finite MDP | goals 需要 span state space；\(|G|\ge |S|\) 是一个清晰充分条件 |
| Local stochastic finite MDP | 如果 transition support 是 local 或已知的，可以少用一些 goals |
| Deterministic continuous MDP | coverage 或结构化 Gaussian goals 可以区分 successor states |
| Stochastic continuous MDP | 论文主要对 unconditional policies 证明 coverage-based results |

直觉是 test functions。对每个 goal \(g\)，Bellman equation 给出：

\[
Q(s,a,g)=\mathbb{E}_{s'\sim P(s,a)}[M_g(s')].
\]

所以每个 \(M_g\) 都是一个已知 test function；它在未知 next-state distribution 下的 expectation 必须匹配 \(Q(s,a,g)\)。一个 goal 给一个 expectation constraint。多个足够不同的 goals 可以决定整个 distribution，类似于足够多 moments 可以决定一个 finite distribution。

这也解释了 deterministic case。若 dynamics 是 deterministic，未知 next state 是一个点，因此 \(M(\cdot,g)\) 的 columns 只需要能区分 states。一个 generic reward 就可能让这些 columns 两两不同。对于 stochastic dynamics，未知量是 states 上的 distribution，所以 spanning 或 rank 条件更强。

## 实验结果

实验检验的是：即使理论条件只部分满足，world model extraction 是否仍然有效。agent 使用 PQN 加 Hindsight Experience Replay 训练；训练完成后，\(P\)-learning 从收敛的 \(Q\)-values 中抽取 world model。

**Reacher。** agent 只在单位圆上的四个 position goals 上训练。连续状态包含 joint angles、angular velocities 和 fingertip position，但训练 rewards 只依赖 fingertip position。尽管学到的 \(Q\)-values 并不完美，抽取出的 world model 非常准确：论文报告 world-model NMSE 约为 \(1.2\times 10^{-4}\)。完全在抽取出的 model 内训练出来的 policies，在 unseen goals 上也接近最优，其中包括训练 reward family 中没有出现过的 velocity goals。

architecture sweep 也很重要。论文在 42 个 Reacher architectures、每个 10 个 seeds 上比较 agent performance 和 extracted world model accuracy。结果显示，goal-conditioned agent 表现越好，抽取出的 world model 越准确。论文报告 agent return 和 world-model error 的 Spearman correlation 是 \(-0.98\)，agent return 和 model 内训练出的 unseen-goal policy return 的 correlation 是 \(+0.95\)。

**MountainCar。** position-trained agent 使用四个 sparse position goals。抽取出的 dynamics 和真实 transition kernel 很接近，NMSE 约为 \(6.7\times 10^{-3}\)。在抽取出的 world model 中 planning，可以处理 velocity targets 和 constrained hill-climbing 这类 out-of-distribution goals。论文还训练了另一个 velocity-goal agent，结果它抽取出的 world model 和 position-goal agent 的 world model 非常接近，说明同一环境的不同 reward views 可能导向相似的 implicit dynamics。

**FourRooms。** finite-state experiments 测试 deterministic、windy 和 teleporting gridworlds。deterministic FourRooms 中，一个 generic training goal 就能准确恢复 world model，符合 finite deterministic theory。windy FourRooms 中，四个 goals 让 world-model-derived policy 距离 optimal return 约 1%。teleporting FourRooms 中，20 个 goals 已经表现很好，而 stochastic finite-state 的 worst-case guarantee 会要求 \(|G|=|S|=68\)。

## 优点和局限

这篇论文最强的地方是 inversion view 很干净。它提供了一个具体方法，用来追问一个 trained value function 里已经隐含了什么 dynamics。这让结果和 transfer、interpretability、auditing、hybrid RL 都有关：一个 model-free agent 在训练时没有显式表示 model，但它的 values 里面可能已经有可恢复的 world model。

第二个优点是理论和实验之间的张力。theorems 解释了什么时候 recovery 有保证，而实验显示，在很多环境里，远少于 worst-case sufficient conditions 的 goals 也能抽出有用 model。这个 gap 很有价值：它提示实际环境和 learned \(Q\)-functions 中存在结构，而当前 broad theory 还没有完全利用这些结构。

局限也明确。continuous stochastic theory 主要限制在 unconditional policies。论文没有覆盖 partially observable MDPs，也没有覆盖不学习 \(Q\)-values 的 model-free agents。实验规模相对现代大规模 RL 系统仍然较小，而且 \(P\)-learning 更像 extraction 和 analysis tool，定位不同于 model-based RL 的训练替代方案。

## Takeaway

最值得复用的观点是：**goal-conditioned \(Q\)-function 是一组指向 transition kernel 的 Bellman probes**。goal diversity 足够时，这些 probes 可以识别 dynamics。\(P\)-learning 把这个观察变成算法：拟合一个 world model，使它的 Bellman operator 能让 agent 现有的 \(Q\)-values 自洽。最终得到的是 goal-conditioned RL 的一个更细视角：表面上它可以是 model-free 的，但 values 内部可能携带可抽取的 world model。

</div>
