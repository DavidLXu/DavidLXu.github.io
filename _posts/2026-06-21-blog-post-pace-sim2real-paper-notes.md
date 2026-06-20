---
title: "[Paper Notes] Towards Bridging the Gap: Systematic Sim-to-Real Transfer for Diverse Legged Robots"
date: 2026-06-21
permalink: /posts/2026/06/pace-sim2real-paper-notes/
tags:
  - Legged Robots
  - Sim-to-Real
  - System Identification
  - Actuator Modeling
  - Reinforcement Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**PACE** is a sim-to-real pipeline for legged robots that treats actuator and joint dynamics as the main reality gap. The key move is practical: collect short fixed-base, in-air encoder trajectories, fit a compact physical parameterization in simulation with CMA-ES, then train locomotion policies directly in the fitted simulator without dynamics randomization. The paper is useful if you are thinking about parameter identification as an alternative to ActuatorNet-style black-box actuator modeling.

My read: PACE is strongest as a **joint-space dynamics alignment recipe**. It does not try to learn a full residual simulator. It fits per-joint effective inertia, viscous damping, Coulomb friction, joint bias, and one global command delay. That gives a small parameter vector, enough physical meaning to debug, and a workflow that works even when the robot has only joint encoders and no joint torque sensors.

## Paper and Resources

The paper is **"Towards Bridging the Gap: Systematic Sim-to-Real Transfer for Diverse Legged Robots"** by **Filip Bjelonic, Fabian Tischhauser, and Marco Hutter** from ETH Zurich's Robotic Systems Lab. It is available as [arXiv:2509.06342](https://arxiv.org/abs/2509.06342), with the project code at [leggedrobotics/pace-sim2real](https://github.com/leggedrobotics/pace-sim2real), documentation at [pace.filipbjelonic.com](https://pace.filipbjelonic.com/), and an ETH Research Collection dataset for actuator model identification and locomotion experiments at [PACE Dataset for Sim-to-Real Transfer in Legged Robots](https://www.research-collection.ethz.ch/items/ea53e17a-76eb-460f-81ba-6e65f7078539).

The repository frames PACE as **Precise Adaptation through Continuous Evolution**. In the public code path, the basic example collects excitation data and runs `scripts/pace/fit.py`, which estimates actuator and joint parameters with CMA-ES for Isaac Lab / Isaac Sim 5.0-style workflows.

## Why Actuator Modeling Matters Here

For legged locomotion, the actuator model can dominate sim-to-real transfer. A policy trained against a URDF-only model may learn joint trajectories that look plausible in simulation but land in the wrong phase and energy regime on hardware. Earlier ETH work used actuator networks: learned models that map histories of commands and joint states to torques, often requiring torque-instrumented data and careful data collection.

PACE takes a more physically constrained route. It asks whether the important low-level discrepancy can be captured by a small number of joint-space parameters. The paper's answer is yes for the tested quadrupeds: a fitted simulator can match in-air joint trajectories, generalize across gains and trajectories, and remain competitive with an ActuatorNet baseline on ANYmal while using much less and less specialized data.

The important distinction is interpretability. An actuator network can be very expressive, but its errors are harder to attribute. In PACE, if the fitted \\(I_a\\) is too large, you can reason about rotor inertia, CAD link inertia, firmware compensation, and apparent inertia. If damping shifts, you can look at gearbox, motor, compensation, temperature, or motor-constant mismatch. That makes the method feel more like a debugging loop than a pure function approximator.

## Data Collection Setup

PACE collects data with the robot base fixed and the legs moving freely in air. This removes unmeasured contact forces and avoids base-motion coupling. The authors excite all joints simultaneously with chirp signals, usually 20-60 seconds per sequence, with high-rate synchronized logging. The target is not to reproduce locomotion contact directly; the target is to isolate the joint and drive dynamics that will later shape contact behavior.

Three practical details matter:

- **Fixed base:** the simulated replay uses the same base pose as the real experiment.
- **No contact:** legs move in air, so the loss does not need foot forces or contact estimates.
- **Excitation bandwidth:** the chirp should cover the frequencies the policy can excite, or at least twice the highest frequency expected in the actual walking motion.

The paper also emphasizes PD gains. If gains are too high, the closed-loop poles move to high frequencies, making the required excitation bandwidth hard or unsafe. PACE uses small gains for identification and policy training so that the characteristic dynamics are visible in the collected data.

The joint transfer function used to explain this is:

\\[
H_q(s) = e^{-sT_d}\frac{P_\tau}{I_a s^2 + (d + D_\tau)s + P_\tau}
\\]

Here \\(I_a\\) is effective armature inertia, \\(d\\) is viscous damping, \\(T_d\\) is lumped delay, and \\(P_\tau,D_\tau\\) are the joint-level PD gains.

## Parameter Identification

The fitted parameter vector is deliberately small:

\\[
\mathbf{p} =
[\mathbf{I}_a,\mathbf{d},\boldsymbol{\tau}_f,\tilde{\mathbf{q}}_b,T_d]^\top
\in \mathbb{R}^{4n+1}
\\]

For \\(n\\) actuated joints, PACE fits per-joint effective inertia \\(\mathbf{I}_a\\), viscous damping \\(\mathbf{d}\\), Coulomb friction \\(\boldsymbol{\tau}_f\\), joint bias \\(\tilde{\mathbf{q}}_b\\), and one global command delay \\(T_d\\). For the robots in the paper, this gives about 49 parameters, small enough for evolutionary search in massively parallel simulation.

The simulator runs \\(N=4096\\) environments in parallel. Each environment samples a candidate parameter vector, replays the recorded real joint targets, and compares simulated joint positions to the measured ones:

\\[
\ell_e =
\frac{1}{k}\sum_{i=1}^{k}
\left\|\mathbf{q}_i^{\mathrm{real}}-\mathbf{q}_{i,e}^{\mathrm{sim}}\right\|^2
\\]

PACE then solves:

\\[
\mathbf{p}^{\ast} =
\arg\min_{\mathbf{p}}\mathbb{E}[\ell_e]
\\]

using CMA-ES over the parallel population. The choice makes sense: gradients through the full simulator are not required, the dimension is moderate, and the objective can have local traps caused by delay, saturation, compensation, and friction.

At the single-joint level, the reference model is:

\\[
I_a\ddot q+d\dot q=\tau_i+\tau_{\mathrm{comp}}+\tau_f
\\]

and the practical closed-loop form is:

\\[
I_a\ddot q+d\dot q=
\mathrm{sat}\left(P_\tau(\hat q-q+\tilde q_b)-D_\tau\dot q+\tau_{\mathrm{comp}}\right)+\tau_f
\\]

This equation is the heart of the paper for me. The authors are not just matching trajectories; they are choosing a parameterization that absorbs the effects that matter at the joint: inertia-like terms, damping-like terms, Coulomb friction, bias, firmware compensation, and saturation.

One subtle but important point: PACE does **not** co-optimize PD gains with the dynamics. If \\(I_a,d,P_\tau,D_\tau\\) are scaled together, the same trajectories can be preserved, which creates non-uniqueness. The gains are treated as known, and the fit focuses on the physical simulator parameters.

## PACE versus ActuatorNet

The paper's ANYmal comparison is the cleanest place to read PACE against ActuatorNet. The authors compare three settings: URDF-only, actuator network, and PACE. URDF-only diverges in in-air replay and fails in forward walking. Both actuator network and PACE transfer, but PACE has smaller delta phase-portrait spread in the reported in-air comparison and avoids the joint-position bias visible in the actuator-network baseline.

The data story is also different. PACE uses roughly **20 seconds of encoder-only in-air data per robot**. Actuator networks generally need minutes of torque-instrumented data, and the deployed vendor LSTM baseline was likely trained on an even larger dataset. That changes the engineering trade-off: ActuatorNet is appealing when torque sensing and broad training logs are available; PACE is attractive when you want a lower-data, encoder-only path with parameters that can be inspected.

For me the useful mental model is:

| Method | What it learns | Data pressure | Debuggability |
|---|---|---:|---:|
| ActuatorNet | black-box actuator mapping, often recurrent | higher, often torque-instrumented | lower |
| PACE | compact physical joint-space parameters | lower, encoder-only in-air trajectories | higher |

The paper does not make ActuatorNet obsolete. It shows that for many PMSM-driven legged robots, a small physically meaningful parameter set can cover the main gap well enough to train blind locomotion without dynamics randomization.

## Results and What to Keep

The single-drive experiments validate that the fitted inertia tracks known analytic changes in load. At the full-robot level, Tytan, ANYmal, and Minimal show close real-sim trajectory overlays in in-air replay. The fitted simulators generalize across unseen gains and trajectories, which is important because a parameter fit that only memorizes one chirp would be much less useful.

On the locomotion side, policies are trained in fitted simulation and deployed zero-shot. The paper reports deployment across three main platforms and more than ten additional robots. It also reports an energy result: ANYmal D reaches full Cost of Transport **1.27**, about **32% lower** than the state-of-the-art ANYmal C reference in the paper's comparison. Tytan reaches CoT **0.97** in the same running-track analysis.

I would keep the RL part secondary. The more reusable idea is the upstream alignment loop:

```text
fixed-base encoder logs
    -> replay target trajectories in simulation
    -> fit {inertia, damping, friction, bias, delay}
    -> train policy in fitted simulation
    -> zero-shot hardware deployment
```

That is a clean recipe for teams trying to reduce sim-to-real iteration cost without building a large learned actuator model first.

## Limitations

PACE depends on the assumptions behind its fitted parameterization. The paper is explicit about this. Identification and deployment need consistent firmware compensation modes and filters. Finite excitation bandwidth can hide higher-frequency dynamics, especially on suspended setups where structural constraints cap the chirp. Temperature, wear, and aging can shift effective parameters over time. The method currently folds many electrical effects into joint-space terms; future work targets bus-voltage/current limits, inverter switching behavior, compliance, and higher-order motion terms such as jerk and snap.

The contact side is also deliberately indirect. PACE identifies in-air joint dynamics, then shows that this suffices for the tested contact tasks. If foot contact parameters, compliance, or terrain interaction dominate the gap for another platform, the recipe may need contact-parameter refinement or online adaptation.

## Takeaways

PACE is worth remembering because it gives a concrete middle path between hand tuning and fully learned actuator models. The parameter vector \\(4n+1\\) is small, the data requirement is modest, and the resulting simulator is interpretable enough to diagnose. For a new legged robot, I would treat this as an early sim-to-real checklist: verify torque/current bandwidth, collect fixed-base chirps, fit the joint-space parameters, compare phase portraits and time traces, then train the policy only after the low-level dynamics stop lying.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇文章支持通过顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**PACE** 是一个面向足式机器人的 sim-to-real pipeline，它把 actuator 和 joint dynamics 当成主要 reality gap 来处理。核心做法很工程化：先采集固定基座、腿悬空的短时 encoder trajectory；再用 CMA-ES 在仿真里拟合一组小而物理可解释的参数；最后直接在拟合后的仿真中训练 locomotion policy，不再依赖 dynamics randomization。这个论文很适合作为“参数辨识能否替代一部分 ActuatorNet 用途”的参考。

我的理解是：PACE 最强的地方是给出了一套 **joint-space dynamics alignment recipe**。它避开完整 residual simulator 的学习，把目标收缩到每个关节的 effective inertia、viscous damping、Coulomb friction、joint bias，以及一个全局 command delay。这组参数足够小，有物理含义，方便 debug；并且即使机器人只有 joint encoder、没有 joint torque sensor，也可以跑起来。

## 论文与资源

论文是 ETH Zurich Robotic Systems Lab 的 **Filip Bjelonic, Fabian Tischhauser, Marco Hutter** 写的 **"Towards Bridging the Gap: Systematic Sim-to-Real Transfer for Diverse Legged Robots"**。论文地址是 [arXiv:2509.06342](https://arxiv.org/abs/2509.06342)，代码在 [leggedrobotics/pace-sim2real](https://github.com/leggedrobotics/pace-sim2real)，文档在 [pace.filipbjelonic.com](https://pace.filipbjelonic.com/)，ETH Research Collection 还放了用于 actuator model identification 和 locomotion experiments 的 [PACE Dataset for Sim-to-Real Transfer in Legged Robots](https://www.research-collection.ethz.ch/items/ea53e17a-76eb-460f-81ba-6e65f7078539)。

仓库里把 PACE 展开为 **Precise Adaptation through Continuous Evolution**。公开代码路径里，基础示例先收集 excitation data，再运行 `scripts/pace/fit.py`，用 CMA-ES 为 Isaac Lab / Isaac Sim 5.0 风格的工作流估计 actuator 和 joint parameters。

## 为什么这里的 Actuator Modeling 重要

对 legged locomotion 来说，actuator model 往往决定 sim-to-real 是否成立。只用 URDF 训练出来的 policy，可能在仿真里关节轨迹看起来正常，但硬件上的相位、响应和能耗都会错。ETH 早期工作里常见的 actuator network，是用命令历史和关节状态历史去预测 torque 的 learned model，通常需要带 torque 的数据和更复杂的数据采集。

PACE 走的是更受物理约束的路线。它问的问题是：关键的 low-level discrepancy 能不能由少量 joint-space 参数覆盖？在论文测试的四足机器人上，答案是可以。拟合后的 simulator 能匹配 in-air joint trajectory，能跨 gains 和 trajectories 泛化，并且在 ANYmal 上和 ActuatorNet baseline 竞争，同时只需要更少、更容易获取的数据。

这里最重要的是可解释性。ActuatorNet 表达能力强，但出错之后不容易判断原因。PACE 里如果拟合出的 \\(I_a\\) 偏大，可以沿着 rotor inertia、CAD link inertia、firmware compensation、apparent inertia 去查；如果 damping 漂了，可以查 gearbox、motor、compensation、temperature 或 motor constant mismatch。它更像一个可调试的系统辨识闭环。

## 数据采集方式

PACE 采数据时把 robot base 固定，让腿在空中自由摆动。这样可以去掉未知 contact force，也避免 base motion coupling。作者同时激励所有关节，用 chirp signals，通常每段 20-60 秒，并做高频同步 logging。这里的目标是先隔离并辨识后续会影响 contact behavior 的 joint/drive dynamics，暂时不把 locomotion contact 本身放进辨识问题。

三个实践细节很关键：

- **Fixed base:** 仿真 replay 使用和真实实验一致的 base pose。
- **No contact:** 腿悬空运动，loss 不需要 foot force 或 contact estimate。
- **Excitation bandwidth:** chirp 要覆盖 policy 可能激发的频率，至少覆盖实际步态中最高运动频率的两倍。

论文还特别强调 PD gains。如果 gains 太高，closed-loop poles 会跑到高频，所需 excitation bandwidth 很难安全采到。PACE 在辨识和 policy training 中使用较小 gains，让特征动态落在可见的频段内。

用于解释这一点的 joint transfer function 是：

\\[
H_q(s) = e^{-sT_d}\frac{P_\tau}{I_a s^2 + (d + D_\tau)s + P_\tau}
\\]

其中 \\(I_a\\) 是 effective armature inertia，\\(d\\) 是 viscous damping，\\(T_d\\) 是 lumped delay，\\(P_\tau,D_\tau\\) 是关节层 PD gains。

## 参数辨识

PACE 拟合的参数向量非常小：

\\[
\mathbf{p} =
[\mathbf{I}_a,\mathbf{d},\boldsymbol{\tau}_f,\tilde{\mathbf{q}}_b,T_d]^\top
\in \mathbb{R}^{4n+1}
\\]

对于 \\(n\\) 个 actuated joints，PACE 拟合每个关节的 effective inertia \\(\mathbf{I}_a\\)、viscous damping \\(\mathbf{d}\\)、Coulomb friction \\(\boldsymbol{\tau}_f\\)、joint bias \\(\tilde{\mathbf{q}}_b\\)，再加一个全局 command delay \\(T_d\\)。论文里的机器人通常约 49 个参数，这个规模适合在大规模并行仿真中用 evolutionary search。

仿真端并行运行 \\(N=4096\\) 个 environments。每个 environment 采样一组候选参数，replay 真实实验中的 joint targets，然后比较仿真 joint positions 和真实 measurements：

\\[
\ell_e =
\frac{1}{k}\sum_{i=1}^{k}
\left\|\mathbf{q}_i^{\mathrm{real}}-\mathbf{q}_{i,e}^{\mathrm{sim}}\right\|^2
\\]

优化目标是：

\\[
\mathbf{p}^{\ast} =
\arg\min_{\mathbf{p}}\mathbb{E}[\ell_e]
\\]

作者用 CMA-ES 在并行 population 上优化。这个选择很合理：不需要 simulator 的梯度，参数维度中等，delay、saturation、compensation、friction 会让目标函数出现局部陷阱。

单关节层面，参考模型是：

\\[
I_a\ddot q+d\dot q=\tau_i+\tau_{\mathrm{comp}}+\tau_f
\\]

实际 closed-loop 写法是：

\\[
I_a\ddot q+d\dot q=
\mathrm{sat}\left(P_\tau(\hat q-q+\tilde q_b)-D_\tau\dot q+\tau_{\mathrm{comp}}\right)+\tau_f
\\]

这组公式是我觉得论文里最值得抓住的部分。作者把 trajectory matching 放进一个物理参数化框架里，让这组参数吸收关键 joint-level effects：inertia-like term、damping-like term、Coulomb friction、bias、firmware compensation 和 saturation。

还有一个容易忽略的点：PACE 不把 PD gains 和 dynamics 一起优化。如果 \\(I_a,d,P_\tau,D_\tau\\) 被共同缩放，轨迹可以保持不变，会产生 non-uniqueness。因此 gains 被视为已知量，拟合集中在物理仿真参数上。

## PACE 与 ActuatorNet

论文里 ANYmal 的对比最适合看 PACE 和 ActuatorNet 的关系。作者比较了三种设置：URDF-only、actuator network、PACE。URDF-only 在 in-air replay 中明显发散，forward walking 也失败。Actuator network 和 PACE 都能 transfer，但 PACE 在报告的 in-air 对比里 delta phase portrait 更集中，也避免了 actuator-network baseline 中可见的 joint-position bias。

数据需求也不同。PACE 每个机器人大约只用 **20 秒 encoder-only in-air data**。Actuator network 通常需要分钟级、带 torque 的数据；论文里部署的 vendor LSTM baseline 可能还用了更大的训练集。这改变了工程取舍：如果有 torque sensing 和丰富日志，ActuatorNet 很有吸引力；如果想要低数据、encoder-only、并且希望参数可解释，PACE 更合适。

可以把两者这样理解：

| Method | 学到什么 | 数据压力 | 可调试性 |
|---|---|---:|---:|
| ActuatorNet | black-box actuator mapping，通常带 recurrent history | 更高，常需要 torque 数据 | 较低 |
| PACE | 紧凑的物理 joint-space 参数 | 更低，encoder-only in-air trajectories | 较高 |

这篇论文没有让 ActuatorNet 失去意义。它说明在很多 PMSM-driven legged robots 上，一组小而物理明确的参数已经足以覆盖主要 gap，并支持 blind locomotion policy 在无 dynamics randomization 的情况下迁移。

## 结果与该记住的东西

single-drive 实验验证了拟合出的 inertia 能跟随已知 load 的解析变化。full-robot 层面，Tytan、ANYmal、Minimal 的 in-air replay 中真实和仿真轨迹高度贴合。拟合后的 simulator 还能跨 unseen gains 和 unseen trajectories 泛化，这一点很重要，因为只记住某一条 chirp 的 parameter fit 没有太大价值。

locomotion 部分，policy 在拟合后的仿真中训练，并 zero-shot 部署到硬件。论文报告了三个主平台和十多个额外机器人上的部署。能耗结果也比较突出：ANYmal D 的 full Cost of Transport 达到 **1.27**，相比论文中引用的 ANYmal C state-of-the-art reference 降低约 **32%**；Tytan 在同一 running-track 分析中达到 CoT **0.97**。

我会把 RL 部分放在次要位置。更可复用的是前面的 alignment loop：

```text
fixed-base encoder logs
    -> replay target trajectories in simulation
    -> fit {inertia, damping, friction, bias, delay}
    -> train policy in fitted simulation
    -> zero-shot hardware deployment
```

这对想降低 sim-to-real iteration cost、但暂时不想先训练大型 learned actuator model 的团队，是一套很干净的 recipe。

## 局限

PACE 依赖它那组参数背后的假设。论文对此说得很清楚：辨识和部署时 firmware compensation modes 与 filters 要一致；悬空实验的结构约束会限制 excitation bandwidth，从而隐藏更高频 dynamics；temperature、wear、aging 会让 effective parameters 随时间漂移。当前方法还把很多 electrical effects 折叠进 joint-space terms，后续工作会继续处理 bus-voltage/current limits、inverter switching behavior、compliance，以及 jerk、snap 等更高阶运动项。

contact 相关内容也是间接处理的。PACE 辨识的是 in-air joint dynamics，然后证明这足以支持论文里的 contact tasks。如果某个平台的主要 gap 来自 foot contact parameters、compliance 或 terrain interaction，那么这套 recipe 可能还需要 contact-parameter refinement 或 online adaptation。

## Takeaways

PACE 值得记住，因为它给了一个介于手工调参和全学习 actuator model 之间的具体方案。参数向量 \\(4n+1\\) 很小，数据需求低，拟合后的 simulator 也足够可解释。对一个新的 legged robot，我会把它当成早期 sim-to-real checklist：先验证 torque/current bandwidth，采 fixed-base chirps，拟合 joint-space parameters，对比 phase portrait 和 time trace，等 low-level dynamics 不再明显说谎之后，再开始训练 policy。

</div>
