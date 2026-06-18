---
title: "[Paper Notes] Contact-Grounded Policy: Dexterous Visuotactile Policy with Generative Contact Grounding"
date: 2026-06-16
permalink: /posts/2026/06/contact-grounded-policy-paper-notes/
tags:
  - Dexterous Manipulation
  - Tactile Sensing
  - Diffusion Policy
  - Contact-Rich Manipulation
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

## TL;DR

**Contact-Grounded Policy (CGP)** is a supervised visuotactile diffusion policy for contact-rich dexterous manipulation. Its main argument is that tactile prediction becomes useful for control only when it is grounded in what the low-level compliance controller can actually execute. CGP therefore predicts future **actual robot states** and **tactile feedback** together, then maps each predicted state-contact pair into a **target robot state** for the controller.

![Contact grounding intuition](/images/paper-notes/contact-grounded-policy-contact-patches.png)

The figure captures the control issue: actual robot state, target robot state, and contact patches are coupled through the compliant controller. CGP learns this coupling from demonstrations, which turns contact from an observed consequence into a realizable control target.

## Paper Info

The paper is **"Contact-Grounded Policy: Dexterous Visuotactile Policy with Generative Contact Grounding"** by **Zhengtong Xu, Yeping Wang, Ben Abbatematteo, Jom Preechayasomboon, Sonny Chan, Nick Colonnese, and Amirhossein H. Memar**. It is listed as **Robotics: Science and Systems (RSS), 2026** on the project page. The paper is available as [arXiv:2603.05687](https://arxiv.org/abs/2603.05687), with project materials at [contact-grounded-policy.github.io](https://contact-grounded-policy.github.io).

## Core Argument

Dexterous manipulation is hard because success depends on multi-point contacts that evolve continuously. A hand may need to roll, pinch, press, wipe, twist, or delicately hold an object while contact points migrate across fingers and palm. These interactions depend on object geometry, friction, slip, compliance, and partial observability.

Many visuomotor policies predict kinematic targets such as end-effector poses, hand joint angles, or action chunks. In contact-rich tasks, a geometrically plausible hand target can still slip, apply the wrong force, break a fragile object, or lose a contact patch. The paper's key critique is that feeding tactile observations into a policy, or predicting tactile signals as an auxiliary objective, does not ensure that the resulting contact can be realized by the controller.

CGP frames contact under a fixed tactile sensor and compliance controller as a triplet: **actual robot state**, **tactile feedback**, and **target robot state**. The gap between target and actual state is meaningful because contact forces can push the robot away from its commanded reference. During contact, that deviation encodes physical interaction, so CGP learns the setup-specific mapping:

```text
actual robot state + tactile feedback -> target robot state
```

This is the paper's main mechanism. The diffusion model proposes future state-contact evolution, and the learned contact-consistency mapping turns that evolution into controller references.

## Method

CGP has two coupled modules. First, a conditional diffusion model predicts a short-horizon trajectory of future actual robot states and future tactile latents. Second, the contact-consistency mapping converts every predicted actual-state/tactile pair into an executable target state:

```text
predicted actual state + predicted tactile latent -> target robot state
```

At inference time, CGP runs in a receding-horizon loop. The diffusion model predicts the next **16** steps of actual state and tactile feedback, the mapper converts them to target states, and the controller executes **8** steps before replanning. Rollout runs at **5 Hz** with **8 DDIM denoising steps**.

The tactile stream is compressed before diffusion. In simulation, the Tesollo DG-5F hand uses dense tactile arrays with **768 sensing points**, each reporting a 3D force vector. On hardware, each Digit360 fingertip sensor produces RGB tactile images. CGP uses a KL-regularized VAE: dense tactile arrays use a 1D ResNet-style encoder/decoder and a **32-dimensional** latent, while four Digit360 sensors use shared 2D ResNet-style per-sensor encoders/decoders and an **80-dimensional** latent, or 20 dimensions per sensor. The KL term matters because lower reconstruction error without KL can produce a less structured latent space and worse rollout performance.

## Evaluation

The evaluation spans simulation and real hardware. In simulation, the robot is a UR5 arm with a Tesollo DG-5F five-finger 20-DoF hand; the arm uses operational-space impedance control, the hand uses joint-space PD control, and tactile sensing comes from dense whole-hand tactile arrays. On hardware, the system uses a Franka Panda arm, an Allegro V5 four-finger 16-DoF hand, four Digit360 fingertip tactile sensors, and two RGB views: an agent view and a wrist view. Demonstrations are collected through Meta Quest 3 VR teleoperation in simulation and through OptiTrack mocap plus an instrumented glove on the real robot, with retargeting and a shared compliant control stack.

The task suite is deliberately contact-heavy: simulated in-hand box flipping, simulated fragile egg grasping, simulated dish wiping, real jar opening, and real in-hand box flipping. CGP is compared against a visuomotor diffusion policy using vision and robot state, and a visuotactile diffusion policy using vision, robot state, and tactile observations without contact grounding.

| Task | CGP | Visuotactile DP | Visuomotor DP |
|---|---:|---:|---:|
| In-Hand Box Flipping (Sim) | 66.0% | 58.0% | 53.2% |
| Fragile Egg Grasping (Sim) | 74.8% | 70.0% | 53.2% |
| Dish Wiping (Sim) | 58.4% | 43.6% | 42.4% |
| Jar Opening (Real) | 93.3% | 66.7% | 73.3% |
| Real In-Hand Box Flipping | 80.0% | 60.0% | 60.0% |

The largest gains appear where contact evolution is central: dish wiping, jar opening, and real in-hand flipping. The time-aligned predicted and observed tactile visualizations strengthen the result because CGP predicts tactile trajectories, converts them into controller targets, and then observes future tactile frames that closely match the earlier predictions. That makes the tactile prediction part of the executed behavior, not merely an auxiliary forecast.

The paper also isolates the contact-consistency mapping with a hand-configuration prediction task using **150 teleoperated grasping episodes**, **4114 frames**, and **11 objects** in simulation. The strongest setting combines state and tactile input, a ResNet-style tactile encoder, and residual target prediction. MAE drops from **8.80** in absolute mode to **5.94** in residual mode; removing either modality hurts, with **10.64** for state-only residual prediction and **12.15** for tactile-only residual prediction even with the ResNet encoder. This supports the central hypothesis: tactile feedback and actual state together encode the controller-realizable contact structure.

## Limitations

The main limitation is specificity. The contact-consistency mapping is tied to a particular hand, tactile sensor layout, and compliance controller; changing the sensor type, controller gains, or hand embodiment may require retraining or adaptation. The evaluation is also single-task: each policy is trained and evaluated on one task, so the paper does not yet establish cross-task transfer of contact knowledge across different objects, objectives, and contact regimes.

CGP also depends on specialized tactile hardware. Digit360 fingertip sensors are powerful, but broader deployment would need more common tactile sensing or robust cross-sensor adaptation. Finally, the policy is supervised from demonstrations. This avoids reward engineering, while still leaving scale dependent on collecting diverse contact-rich demonstrations.

## Takeaways

CGP is worth reading because it clarifies a useful principle for dexterous manipulation: contact prediction should be shaped by the controller that must realize it. The reusable recipe is compact: represent contact through actual state, tactile feedback, and target state; predict future actual state and tactile feedback together; learn the contact-consistency mapping into executable controller references; compress tactile observations into a KL-regularized latent before diffusion; and treat the compliance controller as part of the learned contact model.

My taxonomy for this paper:

**Supervised Visuotactile Diffusion Policy / Contact-Grounded Dexterous Manipulation / Controller-Aware Tactile Prediction**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**Contact-Grounded Policy (CGP)** 是一个用于 contact-rich dexterous manipulation 的 supervised visuotactile diffusion policy。它的核心论点是：tactile prediction 只有和 low-level compliance controller 的可执行目标连接起来，才真正对控制有用。因此，CGP 同时预测未来的 **actual robot states** 和 **tactile feedback**，再把每个 predicted state-contact pair 映射成 controller 的 **target robot state**。

![Contact grounding intuition](/images/paper-notes/contact-grounded-policy-contact-patches.png)

这张图直接画出了控制问题：actual robot state、target robot state 和 contact patches 通过 compliant controller 耦合在一起。CGP 从 demonstrations 中学习这个耦合关系，让 contact 从被动观测结果变成可实现的控制目标。

## Paper Info

论文标题是 **"Contact-Grounded Policy: Dexterous Visuotactile Policy with Generative Contact Grounding"**，作者是 **Zhengtong Xu, Yeping Wang, Ben Abbatematteo, Jom Preechayasomboon, Sonny Chan, Nick Colonnese, and Amirhossein H. Memar**。项目页标注为 **Robotics: Science and Systems (RSS), 2026**。论文链接是 [arXiv:2603.05687](https://arxiv.org/abs/2603.05687)，项目主页是 [contact-grounded-policy.github.io](https://contact-grounded-policy.github.io)。

## 核心论点

Dexterous manipulation 难在多点接触连续变化。机器人手可能需要滚动、捏持、按压、擦拭、旋转或轻柔抓取，同时 contact points 在手指和手掌之间迁移。这些交互受 object geometry、friction、slip、compliance 和 partial observability 影响。

很多 visuomotor policies 预测 kinematic targets，例如 end-effector pose、hand joint angles 或 action chunks。在 contact-rich tasks 中，一个几何上合理的手部目标仍然可能打滑、用错力、压坏脆弱物体，或者丢失接触区域。论文的关键批评是：把 tactile observations 输入 policy，或者把 tactile signals 作为辅助预测目标，并不能保证这些 contact 会被 controller 实现。

CGP 把固定 tactile sensor 和 compliance controller 下的 contact 表示为三元组：**actual robot state**、**tactile feedback** 和 **target robot state**。target 与 actual 之间的差值很重要，因为 contact forces 会让机器人偏离 commanded reference。在接触过程中，这个偏差编码了物理交互，所以 CGP 学习一个 setup-specific mapping：

```text
actual robot state + tactile feedback -> target robot state
```

这是论文最核心的机制。diffusion model 提出未来 state-contact evolution，learned contact-consistency mapping 把这个演化转换成 controller references。

## 方法

CGP 有两个耦合模块。第一，conditional diffusion model 预测短时未来轨迹，包括 future actual robot states 和 future tactile latents。第二，contact-consistency mapping 把每个 predicted actual-state/tactile pair 转成 executable target state：

```text
predicted actual state + predicted tactile latent -> target robot state
```

推理时，CGP 用 receding-horizon loop 运行。diffusion model 预测未来 **16** 步的 actual state 和 tactile feedback，mapper 把它们转换成 target states，controller 执行 **8** 步后重新规划。rollout frequency 是 **5 Hz**，每次 inference 使用 **8 DDIM denoising steps**。

在 diffusion 前，tactile stream 会先被压缩。仿真中，Tesollo DG-5F 手使用 dense tactile arrays，包含 **768 个 sensing points**，每个点输出 3D force vector；真实硬件中，每个 Digit360 fingertip sensor 输出 RGB tactile images。CGP 使用 KL-regularized VAE：dense tactile arrays 使用 1D ResNet-style encoder/decoder 和 **32-dimensional** latent；四个 Digit360 sensors 使用共享的 2D ResNet-style per-sensor encoder/decoder 和 **80-dimensional** latent，也就是每个 sensor 20 维。KL 项很关键，因为去掉 KL 虽然可能降低 reconstruction error，却会让 latent space 结构变差，并损害 rollout performance。

## 评估

论文同时在仿真和真实硬件上评估。仿真机器人是 UR5 arm 加 Tesollo DG-5F 五指 20-DoF hand；arm 使用 operational-space impedance control，hand 使用 joint-space PD control，tactile sensing 来自 dense whole-hand tactile arrays。真实系统使用 Franka Panda arm、Allegro V5 四指 16-DoF hand、四个 Digit360 fingertip tactile sensors，以及 agent view 和 wrist view 两路 RGB 视觉。demonstrations 在仿真中通过 Meta Quest 3 VR teleoperation 收集，在真实机器人上通过 OptiTrack mocap 和 instrumented glove 收集，两边都使用 retargeting 和共享的 compliant control stack。

任务集刻意选择 contact-heavy 场景：仿真 in-hand box flipping、仿真 fragile egg grasping、仿真 dish wiping、真实 jar opening，以及真实 in-hand box flipping。CGP 对比两个 baseline：只使用 vision + robot state 的 visuomotor diffusion policy，以及使用 vision + robot state + tactile observations 但没有 contact grounding 的 visuotactile diffusion policy。

| Task | CGP | Visuotactile DP | Visuomotor DP |
|---|---:|---:|---:|
| In-Hand Box Flipping (Sim) | 66.0% | 58.0% | 53.2% |
| Fragile Egg Grasping (Sim) | 74.8% | 70.0% | 53.2% |
| Dish Wiping (Sim) | 58.4% | 43.6% | 42.4% |
| Jar Opening (Real) | 93.3% | 66.7% | 73.3% |
| Real In-Hand Box Flipping | 80.0% | 60.0% | 60.0% |

提升最明显的是 contact evolution 最关键的任务：dish wiping、jar opening 和真实 in-hand flipping。论文还展示了 time-aligned predicted and observed tactile feedback：CGP 每次 replanning 时预测 tactile trajectories，把它们转换成 controller targets，再和后续真实观测到的 tactile frames 对齐比较。二者接近，说明 tactile prediction 已经进入执行闭环，承担的角色超过辅助 forecast。

论文还用 hand-configuration prediction task 单独验证 contact-consistency mapping。数据集包含仿真中的 **150 teleoperated grasping episodes**、**4114 frames** 和 **11 objects**。最强配置结合 state、tactile input、ResNet-style tactile encoder 和 residual target prediction。MAE 从 absolute mode 的 **8.80** 降到 residual mode 的 **5.94**；去掉任意模态都会变差，state-only residual prediction 是 **10.64**，tactile-only residual prediction 即使用 ResNet encoder 也是 **12.15**。这支持了核心假设：tactile feedback 和 actual state 合在一起，才能编码 controller-realizable contact structure。

## 局限

主要局限是 specificity。contact-consistency mapping 绑定特定 hand、tactile sensor layout 和 compliance controller；更换 sensor type、controller gains 或 hand embodiment，可能需要重新训练或 adaptation。评估也仍然是 single-task setting：每个 policy 都在一个任务上训练和评估，论文还没有证明 contact knowledge 能跨不同 objects、objectives 和 contact regimes 迁移。

CGP 也依赖专门 tactile hardware。Digit360 fingertip sensors 很强，但更广泛部署需要更常见的 tactile sensing，或者可靠的 cross-sensor adaptation。最后，policy 来自 demonstrations 的 supervised learning；这避免了 reward engineering，但规模化仍然取决于能否收集足够多样的 contact-rich demonstrations。

## Takeaways

这篇论文值得读，因为它给 dexterous manipulation 提供了一个清晰原则：contact prediction 应该被能够实现它的 controller 约束。可复用的 recipe 很紧凑：用 actual state、tactile feedback 和 target state 表示 contact；同时预测 future actual state 和 tactile feedback；学习 contact-consistency mapping，把预测转成 executable controller references；在 diffusion 前把 tactile observations 压缩到 KL-regularized latent；把 compliance controller 视为 learned contact model 的一部分。

我的分类标签会写成：

**Supervised Visuotactile Diffusion Policy / Contact-Grounded Dexterous Manipulation / Controller-Aware Tactile Prediction**

</div>
