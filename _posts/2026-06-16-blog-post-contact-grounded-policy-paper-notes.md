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

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Contact-Grounded Policy (CGP)** is a supervised visuotactile policy for contact-rich dexterous manipulation. Its central idea is subtle and important: tactile feedback should not be used only as another observation channel. Instead, the policy should predict **future actual robot states and tactile feedback together**, then map this predicted state-contact pair into **controller-executable target robot states** for a compliance controller.

In other words, CGP tries to make contact a realizable control target. It does this through two learned modules: a diffusion model that forecasts future robot state plus tactile latent trajectories, and a contact-consistency mapping that converts each predicted actual-state/tactile pair into a target state for the low-level controller.

![Contact grounding intuition](/images/paper-notes/contact-grounded-policy-contact-patches.png)

*The image you sent is a nice summary of the paper's core control issue: the actual robot state, target robot state, and contact patches are coupled through the compliant controller. CGP learns this coupling instead of hand-designing contact modes.*

## Paper Info

The paper is **"Contact-Grounded Policy: Dexterous Visuotactile Policy with Generative Contact Grounding"** by **Zhengtong Xu, Yeping Wang, Ben Abbatematteo, Jom Preechayasomboon, Sonny Chan, Nick Colonnese, and Amirhossein H. Memar**.

It is listed as **Robotics: Science and Systems (RSS), 2026** on the project page. The PDF/HTML is available as [arXiv:2603.05687](https://arxiv.org/abs/2603.05687), and the project page is [contact-grounded-policy.github.io](https://contact-grounded-policy.github.io).

## Problem and Motivation

Dexterous manipulation is hard because success depends on multi-point contacts that evolve continuously. A hand may need to roll, pinch, press, wipe, twist, or delicately hold an object while contact points migrate across fingers and palm. These interactions depend on object geometry, friction, slip, compliance, and partial observability.

Many policies predict kinematic targets: end-effector pose, hand joint angles, or action chunks. This works for many visuomotor tasks, but contact-rich manipulation exposes a gap. A target hand pose may look right geometrically while producing the wrong force, slipping during a flip, applying too much stiffness, or failing to maintain a contact patch.

The paper's critique of prior visuotactile policies is also sharp: simply conditioning on tactile observations or predicting tactile signals as an auxiliary target does not guarantee that the predicted contact will be realized by the low-level controller. The policy needs a bridge between predicted contact evolution and executable controller references.

## Contact Grounding

CGP starts from the observation that contact under a fixed tactile sensor and compliance controller can be represented by a triplet:

- **actual robot state**, the robot state after interacting with the environment;
- **tactile feedback**, the observed contact outcome;
- **target robot state**, the controller reference sent to the compliance controller.

The target-actual mismatch matters. Under a PD or impedance controller, contact forces can cause the actual state to deviate from the target. That deviation is not just tracking error; during contact, it contains information about physical interaction.

CGP learns a contact-consistency mapping:

```text
actual robot state + tactile feedback -> target robot state
```

This mapping is setup-dependent: it depends on the hand, tactile sensor layout, and compliance controller. The paper accepts that dependency and learns the mapping from data rather than trying to write explicit contact-mode equations.

## Policy Architecture

CGP has two coupled components.

First, a conditional diffusion model predicts a short-horizon trajectory of future actual robot states and future tactile feedback. The tactile signal is compressed into a latent space, so the diffusion model predicts:

```text
future actual robot states + future tactile latents
```

Second, a contact-consistency mapping converts each predicted actual-state/tactile pair into an executable target state:

```text
predicted actual state + predicted tactile latent -> target robot state
```

At inference time, CGP runs in a receding-horizon loop. The diffusion model predicts the next **16** steps of actual state and tactile feedback. These are converted into target states. The controller executes **8** steps, then the policy replans. The rollout frequency is **5 Hz** with **8 DDIM denoising steps**.

This factorization is the paper's main design move. The diffusion model describes desired contact evolution; the mapping turns that contact evolution into low-level controller references.

## Latent Tactile Generation

Raw tactile observations can be large. In simulation, the Tesollo DG-5F hand uses a dense tactile array with **768 sensing points**, each reporting a 3D force vector. On real hardware, each Digit360 fingertip sensor produces RGB tactile images.

CGP compresses tactile observations using a KL-regularized VAE:

- dense tactile arrays use a 1D ResNet-style encoder/decoder;
- Digit360 tactile images use shared 2D ResNet-style per-sensor encoder/decoder;
- tactile arrays use a **32-dimensional** latent;
- four Digit360 sensors use an **80-dimensional** latent, i.e. 20 dimensions per sensor.

The KL regularization is important. Removing KL can improve reconstruction error, but it produces a less structured latent space and hurts rollout performance. The paper's conclusion is very latent-diffusion-like: reconstruction quality alone is not enough; the latent space also needs to be well behaved for stable long-horizon generation.

## Systems

The paper evaluates CGP in both simulation and real hardware.

**Simulation setup.** The simulated robot is a UR5 arm with a Tesollo DG-5F five-finger 20-DoF hand. The arm uses operational-space impedance control, and the hand uses joint-space PD control. The simulator combines a real-time finite-element solver with Unreal Engine rendering. Tactile sensing comes from dense whole-hand tactile arrays.

**Real-robot setup.** The real robot uses a Franka Panda arm with an Allegro V5 four-finger 16-DoF hand. Tactile sensing comes from four Digit360 fingertip tactile sensors. Vision uses two RGB views: an agent view and a wrist view.

**Data collection.** In simulation, demonstrations are collected with VR teleoperation using a Meta Quest 3 headset. On the real robot, demonstrations are collected with OptiTrack mocap and an instrumented glove. Both pipelines use retargeting and a shared compliant control stack.

## Tasks

The evaluation covers five contact-rich tasks:

- **In-Hand Box Flipping** in simulation: rotate a box upright while keeping it securely in hand.
- **Fragile Egg Grasping** in simulation: lift and hold an egg without dropping or cracking it.
- **Dish Wiping** in simulation: maintain a stable contact patch with a sponge while wiping a dish.
- **Jar Opening** on real hardware: grasp and rotate a jar lid until it comes off.
- **Real In-Hand Box Flipping** on real hardware: transfer the in-hand flipping challenge to the physical Allegro hand.

These are good task choices because they stress different contact regimes: rolling contacts, delicate force regulation, sustained arm-driven pressure, high-friction twisting, and real-world multi-contact uncertainty.

## Main Results

The paper compares CGP against two baselines:

- **Visuomotor Diffusion Policy:** vision + robot state, no tactile input.
- **Visuotactile Diffusion Policy:** vision + robot state + tactile observation, but without contact grounding.

The success rates are:

| Task | CGP | Visuotactile DP | Visuomotor DP |
|---|---:|---:|---:|
| In-Hand Box Flipping (Sim) | 66.0% | 58.0% | 53.2% |
| Fragile Egg Grasping (Sim) | 74.8% | 70.0% | 53.2% |
| Dish Wiping (Sim) | 58.4% | 43.6% | 42.4% |
| Jar Opening (Real) | 93.3% | 66.7% | 73.3% |
| Real In-Hand Box Flipping | 80.0% | 60.0% | 60.0% |

The largest gains appear in tasks where contact evolution matters most: dish wiping, jar opening, and real in-hand flipping. The key lesson is that tactile input helps, but executable contact grounding helps more.

The paper also visualizes time-aligned predicted and observed tactile feedback. At each replanning step, CGP predicts tactile trajectories, converts them into controller targets, and then compares the future observed tactile frames to the earlier predictions. The close match supports the claim that CGP's tactile prediction is coupled to execution, not only used as an auxiliary forecasting objective.

## Contact-Consistency Mapping Ablation

The paper isolates the contact-consistency mapping through a hand-configuration prediction task. The dataset contains **150 teleoperated grasping episodes**, **4114 frames**, and **11 objects** in simulation. The goal is to predict target hand configuration from actual robot state and tactile feedback.

The strongest configuration uses:

- state + tactile input;
- a ResNet-style tactile encoder;
- residual target prediction.

The reported MAE drops from **8.80** in absolute mode to **5.94** in residual mode. Removing either modality hurts: state-only residual prediction is **10.64**, while tactile-only residual prediction is **12.15** even with the ResNet encoder.

This supports the contact-grounding hypothesis. Tactile alone cannot recover global hand configuration; state alone misses contact-induced offsets. Together, actual state and tactile feedback encode the controller-realizable contact structure.

## Why The Uploaded Figure Works Well

The figure is useful because it shows the exact quantity CGP cares about. The blue line is the actual robot state. The green line is the target robot state. The orange patches are contacts. In a compliant controller, the difference between target and actual state is not a nuisance term; it is how contact and force are expressed through the controller.

That is the conceptual jump in this paper. Instead of asking the policy to output a kinematic target and hoping the contact works out, CGP predicts the contact outcome and learns which target state would make the controller realize it.

## Strengths

CGP has a clear conceptual contribution: it turns tactile prediction into executable contact grounding. This gives tactile sensing a stronger role than observation conditioning.

The method is also sensor-flexible. It is evaluated on dense tactile arrays in simulation and Digit360 RGB tactile images on real hardware. The same broad idea works across both, with different encoder/decoder choices.

The controller-aware formulation is practical. In contact-rich manipulation, the low-level controller is part of the physical behavior. CGP models that link instead of treating the action as an abstract command.

The task set is well chosen. Egg grasping, dish wiping, jar opening, and in-hand flipping all punish policies that ignore contact evolution.

## Limitations

The main limitation is specificity. The contact-consistency mapping is tied to a particular tactile sensor, hand embodiment, and compliance controller. Changing the sensor type, tactile layout, controller gains, or robot hand may require retraining or adaptation.

The evaluation is single-task: each policy is trained and evaluated on one task. The paper does not yet show that CGP can transfer contact knowledge across tasks with different objects, objectives, and contact regimes.

CGP also depends on tactile hardware. The real setup uses Digit360 fingertip sensors, which are powerful but still specialized. Broader deployment would need either more common tactile hardware or robust cross-sensor adaptation.

Finally, the policy is supervised from demonstrations. It avoids reward engineering, but scaling still depends on collecting diverse contact-rich demonstrations.

## Takeaways

CGP is worth reading if you care about dexterous manipulation because it clarifies a subtle point: tactile prediction alone is not enough. For contact-rich control, the policy must predict contact in a form that the low-level controller can execute.

My taxonomy for this paper:

**Supervised Visuotactile Diffusion Policy / Contact-Grounded Dexterous Manipulation / Controller-Aware Tactile Prediction**

The reusable ideas are:

1. Represent contact through actual state, tactile feedback, and target state.
2. Predict future actual state and tactile feedback together.
3. Learn a contact-consistency mapping into executable controller references.
4. Compress tactile observations into a KL-regularized latent before diffusion.
5. Treat the compliance controller as part of the learned contact model.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇笔记支持通过页面顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**Contact-Grounded Policy (CGP)** 是一个用于 contact-rich dexterous manipulation 的 supervised visuotactile policy。它最核心的想法很细，但很关键：tactile feedback 不应该只作为额外 observation channel 使用。policy 应该同时预测 **未来 actual robot states 和 tactile feedback**，再把这个 predicted state-contact pair 映射成 compliance controller 可以执行的 **target robot states**。

换句话说，CGP 试图把 contact 变成可执行的控制目标。它由两个学习模块组成：一个 diffusion model 预测未来 robot state 和 tactile latent trajectories；一个 contact-consistency mapping 把每个 predicted actual-state/tactile pair 转换成 low-level controller 的 target state。

![Contact grounding intuition](/images/paper-notes/contact-grounded-policy-contact-patches.png)

*你发的这张图很适合放在博客里，因为它直接画出了论文的核心控制问题：actual robot state、target robot state 和 contact patches 通过 compliant controller 耦合在一起。CGP 学的正是这个耦合关系，而不是手工设计 contact modes。*

## Paper Info

论文标题是 **"Contact-Grounded Policy: Dexterous Visuotactile Policy with Generative Contact Grounding"**，作者是 **Zhengtong Xu, Yeping Wang, Ben Abbatematteo, Jom Preechayasomboon, Sonny Chan, Nick Colonnese, and Amirhossein H. Memar**。

项目页标注为 **Robotics: Science and Systems (RSS), 2026**。论文链接是 [arXiv:2603.05687](https://arxiv.org/abs/2603.05687)，项目主页是 [contact-grounded-policy.github.io](https://contact-grounded-policy.github.io)。

## 问题和动机

Dexterous manipulation 难在多点接触连续变化。机器人手可能需要滚动物体、捏持、按压、擦拭、旋转或轻柔抓取，同时 contact points 会在手指和手掌之间迁移。这些交互受到 object geometry、friction、slip、compliance 和 partial observability 的影响。

很多 policy 预测的是 kinematic targets：end-effector pose、hand joint angles 或 action chunks。这对许多 visuomotor 任务有效，但 contact-rich manipulation 会暴露问题。一个目标手部姿态看起来几何上正确，却可能产生错误的力、翻转时打滑、过度僵硬，或者无法维持接触区域。

论文对已有 visuotactile policies 的批评也很精准：仅仅把 tactile observations 作为输入，或者把 tactile signals 当辅助预测目标，并不能保证预测出的 contact 会被 low-level controller 真实执行出来。policy 需要在 predicted contact evolution 和 executable controller references 之间建立桥梁。

## Contact Grounding

CGP 从一个观察出发：在固定 tactile sensor 和 compliance controller 下，contact 可以用一个三元组表示：

- **actual robot state**：机器人与环境交互后的真实状态；
- **tactile feedback**：观测到的接触结果；
- **target robot state**：发送给 compliance controller 的参考目标。

target 和 actual 之间的差值很重要。在 PD 或 impedance controller 下，接触力会让 actual state 偏离 target state。这个偏差不只是 tracking error；在接触阶段，它包含了物理交互信息。

CGP 学习一个 contact-consistency mapping：

```text
actual robot state + tactile feedback -> target robot state
```

这个 mapping 是 setup-dependent 的：它依赖手的结构、tactile sensor 布局和 compliance controller。论文接受这种依赖关系，选择从数据中学习 mapping，而不是显式写 contact-mode equations。

## Policy Architecture

CGP 有两个耦合模块。

第一，conditional diffusion model 预测一段短时未来轨迹，包括 future actual robot states 和 future tactile feedback。tactile signal 会先被压缩到 latent space，所以 diffusion model 预测的是：

```text
future actual robot states + future tactile latents
```

第二，contact-consistency mapping 把每个 predicted actual-state/tactile pair 转成 executable target state：

```text
predicted actual state + predicted tactile latent -> target robot state
```

推理时，CGP 用 receding-horizon loop 运行。diffusion model 预测未来 **16** 步的 actual state 和 tactile feedback，再转换成 target states。controller 执行 **8** 步，然后 policy 重新规划。rollout frequency 是 **5 Hz**，每次 inference 使用 **8 DDIM denoising steps**。

这个分解是论文的主要设计。diffusion model 描述期望的 contact evolution；mapping 把这种 contact evolution 转成 low-level controller references。

## Latent Tactile Generation

原始 tactile observations 维度很高。仿真中，Tesollo DG-5F 手使用 dense tactile array，包含 **768 个 sensing points**，每个点输出 3D force vector。真实硬件中，每个 Digit360 fingertip sensor 输出 RGB tactile images。

CGP 使用 KL-regularized VAE 压缩 tactile observations：

- dense tactile arrays 使用 1D ResNet-style encoder/decoder；
- Digit360 tactile images 使用共享的 2D ResNet-style per-sensor encoder/decoder；
- tactile arrays 使用 **32-dimensional** latent；
- 四个 Digit360 sensors 使用 **80-dimensional** latent，也就是每个 sensor 20 维。

KL regularization 很重要。去掉 KL 可以降低 reconstruction error，但会得到结构较差的 latent space，并损害 rollout performance。论文的结论很像 latent diffusion：重建质量本身不够，latent space 还必须足够规整，才能稳定生成长时程 tactile trajectory。

## Systems

论文在仿真和真实硬件上都评估了 CGP。

**Simulation setup.** 仿真机器人是 UR5 arm 加 Tesollo DG-5F 五指 20-DoF hand。arm 使用 operational-space impedance control，hand 使用 joint-space PD control。仿真器把 real-time finite-element solver 和 Unreal Engine rendering 结合起来。tactile sensing 来自 dense whole-hand tactile arrays。

**Real-robot setup.** 真实机器人使用 Franka Panda arm 加 Allegro V5 四指 16-DoF hand。tactile sensing 来自四个 Digit360 fingertip tactile sensors。视觉输入使用两个 RGB views：agent view 和 wrist view。

**Data collection.** 仿真中使用 Meta Quest 3 做 VR teleoperation。真实机器人上使用 OptiTrack mocap 和 instrumented glove 收集 demonstrations。两种设置都使用 retargeting 和一致的 compliant control stack。

## Tasks

评估包含五个 contact-rich tasks：

- **In-Hand Box Flipping**，仿真：在手中旋转 box，让它 upright standing。
- **Fragile Egg Grasping**，仿真：抬起并稳定 holding egg，同时不能掉落或压碎。
- **Dish Wiping**，仿真：用 sponge 在盘子上保持稳定接触并完成擦拭。
- **Jar Opening**，真实硬件：抓住并旋开 jar lid。
- **Real In-Hand Box Flipping**，真实硬件：把 in-hand flipping 转移到物理 Allegro hand。

这些任务设计得很好，因为它们覆盖了不同接触模式：rolling contact、delicate force regulation、持续 arm-driven pressure、高摩擦 twisting，以及真实世界 multi-contact uncertainty。

## Main Results

论文比较了两个 baseline：

- **Visuomotor Diffusion Policy:** vision + robot state，没有 tactile input。
- **Visuotactile Diffusion Policy:** vision + robot state + tactile observation，但没有 contact grounding。

成功率如下：

| Task | CGP | Visuotactile DP | Visuomotor DP |
|---|---:|---:|---:|
| In-Hand Box Flipping (Sim) | 66.0% | 58.0% | 53.2% |
| Fragile Egg Grasping (Sim) | 74.8% | 70.0% | 53.2% |
| Dish Wiping (Sim) | 58.4% | 43.6% | 42.4% |
| Jar Opening (Real) | 93.3% | 66.7% | 73.3% |
| Real In-Hand Box Flipping | 80.0% | 60.0% | 60.0% |

提升最大的任务是 contact evolution 最关键的任务：dish wiping、jar opening 和真实 in-hand flipping。核心结论是：tactile input 有帮助，但 executable contact grounding 更关键。

论文还可视化了 time-aligned predicted and observed tactile feedback。每次 replanning 时，CGP 预测 tactile trajectories，把它们转换成 controller targets，再把未来真实观测到的 tactile frames 与之前预测对齐比较。接近的匹配说明 CGP 的 tactile prediction 和 execution 是耦合的，不只是一个辅助 forecasting objective。

## Contact-Consistency Mapping Ablation

论文通过 hand-configuration prediction task 单独验证 contact-consistency mapping。数据集包含仿真中的 **150 teleoperated grasping episodes**、**4114 frames** 和 **11 objects**。目标是根据 actual robot state 和 tactile feedback 预测 target hand configuration。

最强配置使用：

- state + tactile input；
- ResNet-style tactile encoder；
- residual target prediction。

报告中 MAE 从 absolute mode 的 **8.80** 降到 residual mode 的 **5.94**。去掉任意模态都会变差：state-only residual prediction 是 **10.64**，tactile-only residual prediction 即使用 ResNet encoder 也是 **12.15**。

这支持了 contact-grounding hypothesis。tactile alone 无法恢复全局手部构型；state alone 会遗漏 contact-induced offsets。二者结合才能编码 controller-realizable contact structure。

## 为什么这张图很适合

这张图有用，是因为它展示了 CGP 真正在意的量。蓝线是 actual robot state，绿线是 target robot state，橙色区域是 contacts。在 compliant controller 中，target 和 actual 的差值不是干扰项；它是 contact 和 force 通过 controller 表达出来的方式。

这就是论文的概念跳跃：policy 不再只是输出 kinematic target 并希望 contact 自然成立；CGP 预测 contact outcome，并学习什么 target state 能让 controller 实现这个 outcome。

## 优点

CGP 的概念贡献很清楚：把 tactile prediction 变成 executable contact grounding。这让 tactile sensing 的作用超过了 observation conditioning。

方法也有 sensor flexibility。它在仿真的 dense tactile arrays 和真实硬件的 Digit360 RGB tactile images 上都做了验证。整体思路一致，但 encoder/decoder 根据传感器形式调整。

controller-aware formulation 很实用。在 contact-rich manipulation 中，low-level controller 本身就是物理行为的一部分。CGP 建模这条链路，而不是把 action 当作抽象命令。

任务集也选得好。egg grasping、dish wiping、jar opening 和 in-hand flipping 都会惩罚忽略 contact evolution 的 policy。

## 局限

主要局限是 specificity。contact-consistency mapping 绑定特定 tactile sensor、hand embodiment 和 compliance controller。更换 sensor type、tactile layout、controller gains 或 robot hand，可能需要重新训练或 adaptation。

评估还是 single-task setting：每个 policy 都在一个任务上训练和评估。论文还没有展示 CGP 能否把 contact knowledge 迁移到不同 objects、objectives 和 contact regimes 的任务上。

CGP 也依赖 tactile hardware。真实系统使用 Digit360 fingertip sensors，这类传感器很强，但仍然是专门硬件。更广泛部署需要更常见的 tactile hardware，或者可靠的 cross-sensor adaptation。

最后，policy 是从 demonstrations 做 supervised learning。它避免了 reward engineering，但规模化仍然依赖收集多样的 contact-rich demonstrations。

## Takeaways

如果关注 dexterous manipulation，这篇很值得读，因为它澄清了一个细节：tactile prediction alone 不够。contact-rich control 需要 policy 以 low-level controller 可以执行的形式预测 contact。

我的分类标签会写成：

**Supervised Visuotactile Diffusion Policy / Contact-Grounded Dexterous Manipulation / Controller-Aware Tactile Prediction**

最值得复用的想法是：

1. 用 actual state、tactile feedback 和 target state 表示 contact。
2. 同时预测 future actual state 和 tactile feedback。
3. 学一个 contact-consistency mapping，把预测转成 executable controller references。
4. 在 diffusion 前把 tactile observations 压缩成 KL-regularized latent。
5. 把 compliance controller 当作 learned contact model 的一部分。

</div>
