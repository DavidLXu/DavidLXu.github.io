---
title: "[Paper Notes] One Policy to Run Them All: URMA for Multi-Embodiment Locomotion"
date: 2026-10-02
permalink: /posts/2026/10/one-policy-to-run-them-all-urma-paper-notes/
tags:
  - Robot Learning
  - Multi-Embodiment Learning
  - Legged Locomotion
  - Reinforcement Learning
  - URMA
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**One Policy to Run Them All** introduces **URMA (Unified Robot Morphology Architecture)**, an end-to-end multi-task reinforcement-learning architecture that uses one policy for legged robots with different numbers of joints, feet, and morphology types. Instead of padding every robot into one maximum-size vector or maintaining a separate network head for each platform, URMA describes each joint and foot with morphology metadata, aggregates variable-length observations with attention, and decodes one action for every joint.

The paper trains a single PPO policy on 16 simulated robots: nine quadrupeds, five humanoids, one biped, and one hexapod. The policy transfers zero-shot to held-out simulated robots and to three real quadrupeds. Its strongest practical result is that the same policy can control the Unitree A1, MAB Honey Badger, and MAB Silver Badger after simulation training with domain randomization, with no real-world fine-tuning. The main limitation is coverage: transfer works best near the training distribution, and the experiments do not yet include exteroceptive sensing or humanoid hardware deployment.

## Paper Info

The paper is **“One Policy to Run Them All: an End-to-end Learning Approach to Multi-Embodiment Locomotion”** by **Nico Bohlinger, Grzegorz Czechmanowski, Maciej Piotr Krupka, Piotr Kicki, Krzysztof Walas, Jan Peters, and Davide Tateo**. It appeared at **CoRL 2024** and was published in **PMLR 270**.

- [Project page](https://nico-bohlinger.github.io/one_policy_to_run_them_all_website/)
- [Paper](https://proceedings.mlr.press/v270/bohlinger25a.html)
- [Code](https://github.com/nico-bohlinger/one_policy_to_run_them_all)

## 1. Why Multi-Embodiment Locomotion Is Difficult

Deep reinforcement learning has produced strong locomotion controllers for individual quadrupeds, bipeds, and humanoids. Reusing those policies across robots is difficult because the embodiment changes the dimensionality and meaning of both observations and actions. A quadruped may have a different number of joints from another quadruped; a humanoid adds a different topology and foot set; a hexapod changes the correspondence problem again.

Two common workarounds have clear costs. A padding-based policy puts every robot into a maximum-length vector, but one coordinate can represent different joints on different robots. A multi-head policy gives each platform its own encoder and decoder, but a new morphology requires a new head and a new mapping into the shared representation. Both approaches make zero-shot transfer to an unseen morphology awkward.

URMA treats embodiment as part of the input structure. It learns a shared locomotion representation while retaining the per-joint information needed to produce the correct low-level action.

## 2. The URMA Architecture

URMA splits a robot observation into fixed-size **general observations** and variable-length **robot-specific observations**. For locomotion, the latter are divided into joint observations and foot observations.

Each joint has an observation vector (o_j) and a description vector (d_j). The description can include the joint's rotation axis, relative position, torque and velocity limits, control range, and other characteristic properties. The description tells the network what a joint is; the observation tells it what that joint is currently doing.

The joint encoder maps descriptions into attention keys and joint observations into values. A learnable-temperature attention operation produces a fixed-size latent representation:

\[
\bar z_{\text{joints}}
=
\sum_{j\in J}
\frac{\exp(f_\phi(d_j)/(\tau+\epsilon))}
{\sum_{k\in J}\exp(f_\phi(d_k)/(\tau+\epsilon))}
f_\psi(o_j).
\]

The same mechanism encodes feet. The two variable-length latents are concatenated with the general observations and sent through a shared core network:

\[
\bar z_{\text{action}}
=h_\theta(o_g,\bar z_{\text{joints}},\bar z_{\text{feet}}).
\]

The **universal morphology decoder** then combines this action latent with each joint's description and its individual latent. It outputs a mean and standard deviation for every joint, so the policy can produce an action vector whose size follows the current robot:

\[
a_j\sim
\mathcal N\bigl(\mu_\nu(d^a_j,\bar z_{\text{action}},z_j),\;
\sigma_\nu(d^a_j)\bigr).
\]

The architecture therefore has one shared encoder, one shared core, and one shared decoder. The variable-length part is handled through attention and per-joint decoding instead of padding or platform-specific heads.

## 3. Training Objective and Practical Recipe

The paper formulates each robot embodiment as a task in multi-task reinforcement learning. If there are (M) embodiments, the objective is the average expected discounted return:

\[
J(\theta)=\frac{1}{M}\sum_{m=1}^{M}J_m(\theta),
\qquad
J_m(\theta)=\mathbb E_{\tau\sim\pi_\theta}
\left[\sum_{t=0}^{T}\gamma^t r_m(s_t,a_t)\right].
\]

The policy is trained with PPO in MuJoCo. The authors use 48 parallel environments, three for each of 16 robots, and train for 100 million simulation steps per robot. Adding a robot requires adjusting reward coefficients, controller gains, and domain-randomization ranges; the neural architecture itself remains unchanged. A time-dependent curriculum gradually increases penalty terms, allowing the shared policy to learn basic locomotion before handling stricter gait shaping.

Domain randomization covers embodiment and environment dynamics. This is essential for sim-to-real transfer: the policy should learn motion patterns that survive changes in friction, mass, actuator behavior, and other physical parameters.

## 4. Experiments

The training set contains nine quadrupeds with three joint configurations, five humanoids with five configurations, one biped, and one hexapod. The baselines are a multi-head architecture and a padding architecture with a one-hot task ID.

URMA learns faster and reaches a higher final return than training separate policies for each robot. It eventually outperforms the multi-head baseline, although the attention encoder learns more slowly at the beginning because it must discover how to route joint information. The padding baseline performs substantially worse because the task ID alone does not resolve the structural mismatch between different observation and action spaces.

For zero-shot evaluation, a policy trained without Unitree A1 transfers well to A1. It also transfers to MAB Silver Badger, whose embodiment includes an additional spine joint and lacks the foot observations used by the training robots. After zero-shot evaluation, URMA remains ahead during fine-tuning on Silver Badger because it starts from a better representation.

The authors also remove all foot observations at test time. URMA retains stronger performance than the baselines, suggesting that the morphology-aware representation can degrade gracefully when part of the sensor input disappears.

In the real world, the same simulation-trained policy controls Unitree A1, MAB Honey Badger, and MAB Silver Badger on pavement, grass, and plastic turf with small inclines. Honey Badger is unseen during training. Its gait is weaker than the gaits of the two training-set robots, but it still locomotes robustly without further fine-tuning.

## 5. What the Paper Establishes

The paper's central result is architectural: variable-size low-level control spaces can be handled by a single end-to-end policy when each joint is represented together with a meaningful description. This creates a reusable correspondence between joints across embodiments. A knee on one robot and a differently placed knee on another do not need to occupy the same fixed input coordinate; their descriptions let the network route their information into a shared latent space.

The experiments also show a useful training-efficiency effect. Sharing representations across embodiments lets the policy benefit from data collected for other robots. A single multi-embodiment run can reach useful performance faster than training every robot from scratch, while the same representation provides a starting point for zero-shot and few-shot transfer.

## 6. Limitations

Generalization still depends on training coverage. A robot that is far outside the training distribution can remain difficult, even though its joint descriptions fit the architecture. The method also relies on reward and controller settings being adapted when a new robot is added; the network is shared, but the training configuration is not completely automatic.

The experiments omit exteroceptive sensors such as cameras and depth inputs, so the demonstrated policy focuses on proprioceptive locomotion rather than navigation over complex terrain. Real-world deployment is limited to quadrupeds, and the paper does not yet establish transfer to a physical humanoid. Finally, the theoretical analysis supports the sample-efficiency intuition for shared encoders and decoders, but it does not remove the empirical need for a sufficiently broad embodiment distribution.

## Takeaway

URMA is a morphology-aware interface between a robot's variable joint structure and a fixed neural policy. Its contribution is a practical recipe: describe each joint, aggregate variable-length observations with attention, decode actions per joint, and train across many embodiments with PPO and domain randomization.

This makes URMA an important predecessor to later multi-embodiment locomotion systems. Compared with approaches centered on long-context online adaptation, URMA's main focus is representing and transferring across robot structures. Its longer-term value is the idea that a low-level locomotion policy can be shared at the level of joint descriptions, providing a foundation on which larger embodiment-scaling and adaptation systems can build.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇论文提出了 **URMA（Unified Robot Morphology Architecture）**：一个端到端的 multi-task reinforcement learning 架构，用同一个 policy 控制关节数量、足端数量和形态都不同的腿式机器人。它没有把所有机器人强行 padding 到同一个最大向量，也没有为每个平台维护独立的网络 head，而是用 morphology metadata 描述每个关节和足端，用 attention 汇聚可变长度的观测，再为每个关节单独解码动作。

## TL;DR

**One Policy to Run Them All** 在 16 个模拟机器人上训练一个 PPO policy：9 个 quadruped、5 个 humanoid、1 个 biped 和 1 个 hexapod。这个 policy 可以 zero-shot 迁移到留出的模拟机器人，也可以迁移到三个真实 quadruped。最有代表性的结果是：同一个 simulation-trained policy 能控制 Unitree A1、MAB Honey Badger 和 MAB Silver Badger，不需要在真实机器人上继续 fine-tuning。它的主要局限是训练分布覆盖仍然关键，实验还没有加入视觉等 exteroceptive sensing，也没有展示 humanoid 的真实硬件部署。

## Paper Info

论文题目是 **“One Policy to Run Them All: an End-to-end Learning Approach to Multi-Embodiment Locomotion”**，作者是 **Nico Bohlinger、Grzegorz Czechmanowski、Maciej Piotr Krupka、Piotr Kicki、Krzysztof Walas、Jan Peters 和 Davide Tateo**。论文发表于 **CoRL 2024**，收录于 **PMLR 270**。

- [项目主页](https://nico-bohlinger.github.io/one_policy_to_run_them_all_website/)
- [论文](https://proceedings.mlr.press/v270/bohlinger25a.html)
- [代码](https://github.com/nico-bohlinger/one_policy_to_run_them_all)

## 1. 为什么 multi-embodiment locomotion 很难

Deep reinforcement learning 已经能为单个 quadruped、biped 或 humanoid 学到很强的 locomotion controller，但这些 policy 很难直接复用到其他机器人。原因在于 embodiment 同时改变了 observation 和 action 的维度与语义：同样是 quadruped，不同机器人也可能拥有不同数量的关节；humanoid 会带来不同的拓扑和足端集合；hexapod 又会改变另一套 correspondence problem。

常见做法各有代价。Padding-based policy 把所有机器人放进一个最大长度向量，但同一个坐标在不同机器人上可能对应不同关节。Multi-head policy 为每个平台单独设置 encoder 和 decoder，但新 morphology 需要新增 head，以及一套新的 shared representation 映射。这两类方法都让 unseen morphology 的 zero-shot transfer 变得困难。

URMA 把 embodiment 当作输入结构的一部分。它学习共享的 locomotion representation，同时保留每个关节需要的局部信息，最后输出当前机器人所需的低层动作。

## 2. URMA 架构

URMA 把 observation 分成固定维度的 **general observations** 和可变长度的 **robot-specific observations**。对于 locomotion，后者进一步拆成 joint observations 和 foot observations。

每个关节拥有 observation vector (o_j) 和 description vector (d_j)。description 可以包含关节旋转轴、相对位置、力矩和速度限制、控制范围等属性。description 告诉网络“这是怎样的关节”，observation 告诉网络“这个关节当前处于什么状态”。

Joint encoder 把 description 映射成 attention key，把 joint observation 映射成 value。带有 learnable temperature 的 attention 操作把任意数量的关节压缩成固定维度的 latent：

\[
\bar z_{\text{joints}}
=
\sum_{j\in J}
\frac{\exp(f_\phi(d_j)/(\tau+\epsilon))}
{\sum_{k\in J}\exp(f_\phi(d_k)/(\tau+\epsilon))}
f_\psi(o_j).
\]

Feet 使用同样的机制编码。两个可变长度的 latent 与 general observations 拼接后，进入共享 core network：

\[
\bar z_{\text{action}}
=h_\theta(o_g,\bar z_{\text{joints}},\bar z_{\text{feet}}).
\]

最后，**universal morphology decoder** 把 action latent、每个关节的 description 和该关节的 latent 结合起来，为每个关节输出 action distribution 的均值和标准差：

\[
a_j\sim
\mathcal N\bigl(\mu_\nu(d^a_j,\bar z_{\text{action}},z_j),\;
\sigma_\nu(d^a_j)\bigr).
\]

因此，URMA 只使用一套共享 encoder、core 和 decoder。机器人关节数量的变化通过 attention 和 per-joint decoding 处理，不需要 padding 或 platform-specific heads。

## 3. 训练目标和训练配方

论文把每个 robot embodiment 看成 multi-task reinforcement learning 中的一个 task。若有 (M) 个 embodiment，目标是平均 expected discounted return：

\[
J(\theta)=\frac{1}{M}\sum_{m=1}^{M}J_m(\theta),
\qquad
J_m(\theta)=\mathbb E_{\tau\sim\pi_\theta}
\left[\sum_{t=0}^{T}\gamma^t r_m(s_t,a_t)\right].
\]

Policy 使用 MuJoCo 中的 PPO 训练。作者使用 48 个并行环境，每个机器人有 3 个环境，并让每个机器人训练 1 亿个 simulation steps。加入新机器人时，需要调整 reward coefficients、controller gains 和 domain-randomization ranges；神经网络架构本身无需改变。一个 time-dependent curriculum 会逐渐增加 penalty terms，让共享 policy 先学会基本 locomotion，再处理更严格的 gait shaping。

Domain randomization 同时覆盖 embodiment 和 environment dynamics。这是 sim-to-real transfer 的基础：policy 需要学到能够承受 friction、mass、actuator behavior 等变化的运动模式。

## 4. 实验结果

训练集包含 9 个 quadruped、5 个 humanoid、1 个 biped 和 1 个 hexapod，其中 quadruped 有 3 种 joint configuration，humanoid 有 5 种 configuration。对比方法是 multi-head architecture 和带 one-hot task ID 的 padding architecture。

URMA 的学习速度和最终 return 都优于为每个机器人单独训练 policy 的设置。训练初期，URMA 比 multi-head baseline 稍慢，因为 attention encoder 需要自行学习如何路由 joint information；但最终 URMA 达到更高性能。Padding baseline 明显更差，因为 task ID 无法单独解决不同 observation 和 action structure 之间的对应问题。

在 zero-shot evaluation 中，没有见过 Unitree A1 的 policy 能很好地迁移到 A1。它也能迁移到 MAB Silver Badger：该机器人多了一个 spine joint，并且没有训练机器人使用的 foot observations。之后在 Silver Badger 上 fine-tuning 时，URMA 仍保持领先，因为它的 zero-shot 初始 representation 更好。

作者还在测试阶段删除所有 foot observations。URMA 的性能仍然比两个 baseline 更强，说明 morphology-aware representation 在部分传感器输入消失时具有更好的退化特性。

在真实世界中，同一个 simulation-trained policy 控制 Unitree A1、MAB Honey Badger 和 MAB Silver Badger，在 pavement、grass 和带小坡度的 plastic turf 上行走。Honey Badger 没有出现在训练集中。虽然它的 gait 不如训练集机器人，但仍然可以在没有额外 fine-tuning 的情况下稳定行走。

## 5. 这篇论文真正建立了什么

论文最核心的结果是一个架构结论：只要每个关节都带有有意义的 description，variable-size 的低层控制空间就可以由同一个端到端 policy 处理。description 建立了跨 embodiment 的 joint correspondence。一个机器人上的 knee 和另一个机器人上位置不同的 knee，不需要占据固定输入坐标；网络可以根据 description 把它们路由到共享 latent space。

实验还体现了 shared representation 的训练效率。不同机器人收集的数据可以互相帮助，使一次 multi-embodiment training 比为每个机器人从零训练更快达到有效性能，同时为 zero-shot 和 few-shot transfer 提供更好的起点。

## 6. 局限

Generalization 仍然依赖训练覆盖范围。即使新机器人的 joint descriptions 可以输入 URMA，远离训练分布的 morphology 仍然可能很难控制。加入新机器人时，reward 和 controller configuration 也需要调整，因此训练流程还没有完全自动化。

实验没有使用 camera、depth 等 exteroceptive sensors，展示的重点是 proprioceptive locomotion，而不是复杂环境中的 navigation。真实部署目前只覆盖 quadruped，也没有证明对真实 humanoid 的迁移。最后，理论分析支持共享 encoder 和 decoder 的 sample-efficiency 直觉，但它无法替代足够丰富的 embodiment distribution。

## Takeaway

URMA 是一个 morphology-aware interface：一端连接可变的机器人关节结构，另一端连接固定的 neural policy。它给出了一个清晰的工程配方：描述每个关节，用 attention 汇聚 variable-length observations，为每个关节解码 action，再通过 PPO 和 domain randomization 在多种 embodiment 上训练。

这使 URMA 成为后续 multi-embodiment locomotion 系统的重要前身。与强调 long-context online adaptation 的方法相比，URMA 的重点是机器人结构的表示和迁移。它更长期的价值在于：低层 locomotion policy 可以在 joint-description 层面共享，为更大规模的 embodiment scaling 和在线适应系统提供基础。

</div>
