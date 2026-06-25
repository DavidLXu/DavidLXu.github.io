---
title: "[Paper Notes] End-to-End Dexterous Arm-Hand VLA Policies via Shared Autonomy"
date: 2026-06-26
permalink: /posts/2026/06/shared-autonomy-dexgrasp-vla-paper-notes/
tags:
  - Vision-Language-Action
  - Dexterous Manipulation
  - Tactile Sensing
  - Teleoperation
---

<div data-lang="en" markdown="1">

This paper is about a very practical bottleneck in dexterous VLA work: high-quality arm-hand demonstrations are hard to collect because full-DoF teleoperation overloads the operator. The proposed answer is **Shared Autonomy**. A human controls the arm's coarse end-effector motion through VR, while a tactile-aware **DexGrasp-VLA** policy controls the dexterous hand as a Copilot. The collected trajectories then fine-tune an end-to-end arm-hand VLA policy.

My read: the interesting part is the division of labor. The human supplies scene understanding, target choice, approach strategy, and pre-grasp positioning. The autonomous hand policy supplies contact-rich grasp closure, tactile adaptation, and force modulation. This converts full arm-hand teleoperation into a semi-autonomous data engine, then uses **Arm-Hand Feature Enhancement** and **Corrective Teleoperation** to turn that data into a stronger policy.

## Paper Info

The paper is **"End-to-End Dexterous Arm-Hand VLA Policies via Shared Autonomy: VR Teleoperation Augmented by Autonomous Hand VLA Policy for Efficient Data Collection"** by **Yu Cui, Yujian Zhang, Lina Tao, Yang Li, Xinyu Yi, and Zhibin Li** from **ByteDance Seed**. The arXiv version is [2511.00139](https://arxiv.org/abs/2511.00139), and the project page is [dexvla-seed.github.io/dex-vla](https://dexvla-seed.github.io/dex-vla/).

## Problem

Dexterous arm-hand manipulation has two coupled difficulties. The arm handles macro motion: reaching, avoiding obstacles, positioning the hand, and aligning pre-grasp poses. The hand handles micro motion: compliant multi-finger closure, contact adaptation, force control, and slip recovery. A monolithic teleoperation setup asks the operator to control both at once. The paper reports that even 20-30 minutes of continuous full-DoF teleoperation can be tiring, especially for untrained operators.

Automated planning has the opposite failure mode. It can create many state-action pairs, but its data distribution reflects its solvers and constraints. The resulting motions may be stiff, physically valid, and diverse while still missing the small human strategies that make dexterous manipulation work.

The paper's formulation is a compromise:

- human operator: VR-guided 6-DoF arm end-effector motion;
- DexGrasp-VLA Copilot: autonomous 12-DoF dexterous hand control;
- final policy: end-to-end arm-hand VLA trained from synchronized shared-autonomy data.

Both the hand-only policy and the final arm-hand policy are fine-tuned from \(\pi_0\) using LeRobot.

## DexGrasp-VLA As Hand Copilot

The paper uses VLA policies in two places. The first is **DexGrasp-VLA**, a hand-only tactile-aware VLA policy. Its job is to control the fingers during data collection, so the operator can focus on moving the arm.

DexGrasp-VLA is bootstrapped in two stages. First, the authors train a vision-free LSTM grasping policy from proprioception and tactile feedback. The dataset combines **68** parameterized force-adaptive control demonstrations and **150** human teleoperation demonstrations. The force-adaptive controller follows:

\[
q_c(i)=q_m(i)+q(0)e^{-k f_z(i)}.
\]

When contact is weak, the command closes the hand quickly. As fingertip normal force increases, the closure slows and tightens into a stable grasp. The LSTM sees a temporal window of proprioception and tactile readings:

\[
x_t=[s^{hand}_t,f^{hand}_t]\in\mathbb{R}^{39},
\quad
s_t=[q^{hand}_t,\tau^{hand}_t]\in\mathbb{R}^{24},
\quad
f^{hand}_t\in\mathbb{R}^{15}.
\]

It predicts a 12-DoF hand action with behavior cloning and MSE loss. This creates a compact reactive expert for tactile force adaptation.

Second, the LSTM expert collects data for a multimodal hand VLA policy. DexGrasp-VLA consumes:

\[
o^{hand}_t=[I^{hand}_t,l_t,q^{hand}_t,z^{tac-f}_t,z^{tac-s}_t].
\]

Here \(I^{hand}_t\) is the eye-in-hand image, \(l_t\) is the language instruction, \(q^{hand}_t\) is the hand state, \(z^{tac-f}_t\) is per-fingertip resultant force, and \(z^{tac-s}_t\) is a spatial tactile embedding. The raw tactile tensor is \(F_{raw}\in\mathbb{R}^{10\times12\times3}\) per fingertip. The paper compresses it two ways:

- resultant force vectors \(f^{tac-f}_t\in\mathbb{R}^{5\times3}\), giving explicit net force magnitude and direction;
- convolutional autoencoder tactile latents \(f^{tac-s}_t\in\mathbb{R}^{5\times128}\), preserving spatial contact patterns.

This combination is important because force magnitude alone cannot describe where contact sits on the fingertip. Spatial tactile latents help the policy detect slippage, off-center contact, and shifts in contact distribution.

## Shared Autonomy Data Collection

Shared autonomy combines VR arm teleoperation with autonomous hand control. The VR system uses relative motion mapping: once the user engages the controller, the initial VR controller pose \(T_{VR,0}\) and robot end-effector pose \(T_{robot,0}\) define the mapping:

\[
T_{robot,t}=T_{robot,0}(T_{VR,0}^{-1}T_{VR,t}).
\]

The target pose is converted to joint commands through a velocity-level QP IK solver using PlaCo and Pinocchio. The paper reports OpenXR support at **90 fps**, less than **100 ms** latency, and synchronized data saving at **30 Hz**.

During collection, the human drives the arm while DexGrasp-VLA produces hand actions:

\[
D^{uni}=\{(o^{uni}_t,a^{arm}_t,a^{hand}_t)\}_{t=1}^{T},
\quad
a^{arm}_t\sim p_{teleop},
\quad
a^{hand}_t\sim\pi_{hand}(\cdot|o^{hand}_t).
\]

The combined observation contains multi-view RGB, language, arm joint states, and hand joint states. The result is a synchronized arm-hand dataset where the arm motion has human spatial intent and the hand motion has tactile-adaptive execution.

In the appendix, shared autonomy collects **110 trajectories/hour/person** for the main dataset, compared with **90 trajectories/hour/person** for full teleoperation. Corrective collection is **100/hour/person** versus **80/hour/person**. The authors frame this as roughly a **25%** collection-rate gain, with lower operator fatigue and a faster policy iteration loop.

## End-to-End Arm-Hand VLA

The final policy \(\pi_{uni}\) controls the full arm-hand system end to end:

\[
\pi_{uni}(A^{uni}_t|o^{uni}_t).
\]

The key architectural addition is **Arm-Hand Feature Enhancement**. The base \(\pi_0\) model produces a shared task representation \(z^{share}_t\) from visual, language, and proprioceptive inputs. The enhancement module passes this shared representation through two dedicated MLPs:

\[
z^{arm}_t=E_{arm}(z^{share}_t),
\quad
z^{hand}_t=E_{hand}(z^{share}_t).
\]

Auxiliary heads predict arm and hand sub-actions from the limb-specific features. The main action head uses the fused representation:

\[
z^{fused}_t=[z^{share}_t,z^{arm}_t,z^{hand}_t].
\]

The loss combines the main flow-matching action loss with auxiliary arm and hand losses:

\[
L_{total}=L_{main}+\lambda(L_{hand}+L_{arm}).
\]

The motivation is straightforward. Arm motion is smooth, spatial, and longer horizon. Hand motion is contact-rich, local, and force-sensitive. A single undifferentiated latent representation can mix these demands poorly. The extra branches encourage the model to preserve shared task context while learning limb-specific dynamics.

## Corrective Teleoperation

The paper also builds a corrective human-in-the-loop system. During deployment, successful autonomous rollouts are recorded. When the policy fails, the operator intervenes through the same shared autonomy interface, recovers the task, and creates a corrective trajectory. At iteration \(k\):

\[
D^{(k)}=D^{(k)}_{success}\cup D^{(k)}_{corrective}.
\]

The next policy is fine-tuned from \(\pi_0\) using the original shared-autonomy dataset plus the curated deployment data:

\[
\pi^{(k+1)}_{uni}=SFT(\pi_0;D^{uni}\cup D^{(k)}).
\]

The important design choice is targeted correction. Human effort is concentrated on failure states: bad orientations, corner positions, unseen object shapes, and adversarial configurations. This creates a small but high-value data flywheel.

## Experiments

The hardware is a UR3e arm with a 12-DoF five-finger Xhand, each fingertip carrying **120 tri-axial force channels**, plus two fixed RealSense D435i cameras and one wrist-mounted RealSense D405. The paper also validates the Arm-Hand Feature Enhancement module on an RY-H2 hand. Policies are evaluated at **30 Hz**.

Datasets are deliberately small:

- LSTM pretraining: 150 human teleoperation demonstrations plus 68 force-adaptive autonomous trajectories.
- DexGrasp-VLA hand policy: 180 successful grasping trajectories in clutter, covering 60 objects.
- End-to-end arm-hand policy: 100 shared-autonomy demonstrations over 20 common household objects.
- Corrective datasets: 50 orientation-recovery trajectories and 50 corner-case trajectories.

The hand-only DexGrasp-VLA policy is evaluated in cluttered tabletop scenes with more than 50 objects. It reaches **95.5%** overall success in a handheld setup, where the human moves the mounted hand and the policy decides finger-level grasping.

The final end-to-end arm-hand VLA is tested on a pick-and-place task across 50 objects. It reaches **88.7%** average success, with **91.7%** on seen objects and **85.6%** on unseen objects.

## Ablations

The tactile ablation is one of the most useful parts of the paper. Under a protocol with 3 seconds of visible grasping followed by 10 seconds of full visual occlusion:

| Hand policy | Average success |
|---|---:|
| \(\pi_{hand-origin}\) from \(\pi_0\) | 21% |
| force tactile only \(f^{tac-f}\) | 70% |
| force + spatial tactile \(f^{tac-f}+f^{tac-s}\) | 90% |

This supports the paper's tactile design: resultant force gives coarse contact magnitude and direction, while spatial tactile embedding gives contact distribution.

The Arm-Hand Feature Enhancement ablation is also strong:

| Policy | Xhand | RY-H2 | Xhand with camera occlusion |
|---|---:|---:|---:|
| baseline \(\pi_{uni-origin}\) | 88% | 71% | 19% |
| \(\pi_{uni-enhance}\) | 95% | 81% | 58% |

The occlusion result is the clearest signal. The enhanced model preserves more limb-specific structure and relies less on a single global visual representation.

The paper also reports a negative result that is worth keeping. Adding the same tactile features directly into the unified arm-hand policy lowered performance from **95%** to **82%** in the tested setting. The authors interpret this as a phase-alignment problem: tactile signals are useful during grasping, but can become noisy during arm reaching, when incidental contacts or no-contact periods dominate. This argues for selective tactile routing or phase-aware gating in future models.

Corrective teleoperation improves targeted failures. The first corrective round with 50 orientation trajectories handles orientation failures better. The second round with 50 corner-case trajectories improves corner placements. The appendix extends the same correction idea to long-horizon gripper tasks, with reported success rates of **65%**, **90%**, and **70%** across three tasks, and to peg-in-hole assembly, where adding 20 recovery trajectories improves success from **70%** to **90%**.

## Strengths and Limitations

The strongest idea is the data collection strategy. Shared autonomy uses humans where they are efficient: semantic understanding, object choice, approach, and spatial positioning. It uses an autonomous tactile VLA where humans are overloaded: force-adaptive multi-finger closure. This is a good pragmatic path for collecting real robot data without asking operators to micromanage every finger.

The Arm-Hand Feature Enhancement module is also conceptually useful. Arm and hand actions are coupled, but their control regimes differ. Explicitly giving the model shared, arm-specific, and hand-specific features is a lightweight way to encode that difference during fine-tuning.

The main limitation is task scope. The current system focuses on grasping and pick-and-place as the core testbed. It has not yet demonstrated complex in-hand reorientation, tool use, or broader long-horizon dexterous manipulation with the five-finger hand. Tactile integration remains unresolved at the full arm-hand policy level; simple uniform fusion hurts performance in their tested setup. Corrective teleoperation is effective and still depends on human intervention, so the longer-term scaling path needs autonomous failure detection and recovery.

## Takeaway

This paper is best read as a systems recipe for dexterous VLA data. The main contribution is not just a new policy architecture. It is a full loop:

1. train a tactile hand Copilot;
2. use it to reduce human burden during shared-autonomy data collection;
3. fine-tune an arm-hand VLA with limb-aware feature enhancement;
4. improve the policy through corrective deployment data.

For my taxonomy, I would label it **Shared Autonomy / Tactile VLA Copilot / Arm-Hand Feature Enhancement / Corrective Teleoperation / Dexterous VLA Fine-Tuning**. The reusable lesson is that dexterous VLA scaling may need better data interfaces before it needs larger models. A human should guide intent and arm motion; a tactile Copilot should handle contact; the final policy should learn the coordination pattern from synchronized data.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇论文讨论的是 dexterous VLA 里非常实际的数据瓶颈：高质量 arm-hand demonstrations 很难采，因为 full-DoF teleoperation 会让操作者负担过重。作者给出的答案是 **Shared Autonomy**。人通过 VR 控制机械臂粗粒度末端运动，触觉增强的 **DexGrasp-VLA** policy 作为 Copilot 控制灵巧手。采到的轨迹再用来 fine-tune 一个端到端 arm-hand VLA policy。

我的理解是，最有意思的部分是分工。人负责 scene understanding、target choice、approach strategy 和 pre-grasp positioning。自主手部 policy 负责 contact-rich grasp closure、tactile adaptation 和 force modulation。这样 full arm-hand teleoperation 被转化成 semi-autonomous data engine，再通过 **Arm-Hand Feature Enhancement** 和 **Corrective Teleoperation** 把这些数据变成更强的 policy。

## 论文信息

论文标题是 **"End-to-End Dexterous Arm-Hand VLA Policies via Shared Autonomy: VR Teleoperation Augmented by Autonomous Hand VLA Policy for Efficient Data Collection"**，作者为 **Yu Cui、Yujian Zhang、Lina Tao、Yang Li、Xinyu Yi 和 Zhibin Li**，来自 **ByteDance Seed**。arXiv 链接是 [2511.00139](https://arxiv.org/abs/2511.00139)，项目主页是 [dexvla-seed.github.io/dex-vla](https://dexvla-seed.github.io/dex-vla/)。

## 问题定义

Dexterous arm-hand manipulation 有两个耦合难点。机械臂处理 macro motion：reaching、避障、手部定位和 pre-grasp alignment。灵巧手处理 micro motion：compliant multi-finger closure、contact adaptation、force control 和 slip recovery。monolithic teleoperation 要求操作者同时控制两者。论文提到，即使是 20-30 分钟的连续 full-DoF teleoperation，对普通操作者也会很累。

自动规划则有另一类失败。它可以产生很多 state-action pairs，但数据分布由 solver 和 constraints 决定。动作可能物理可行、多样，但仍然缺少 dexterous manipulation 中人类的小技巧和自然协调。

论文的方案是折中：

- human operator：通过 VR 控制 6-DoF arm end-effector motion；
- DexGrasp-VLA Copilot：自主控制 12-DoF dexterous hand；
- final policy：用 shared-autonomy 数据训练端到端 arm-hand VLA。

hand-only policy 和最终 arm-hand policy 都基于 \(\pi_0\)，并使用 LeRobot fine-tune。

## DexGrasp-VLA 作为手部 Copilot

这篇论文里 VLA policy 有两种用法。第一种是 **DexGrasp-VLA**，也就是 hand-only tactile-aware VLA policy。它的任务是在数据采集时控制手指，让操作者专注于移动机械臂。

DexGrasp-VLA 分两阶段 bootstrap。第一阶段，作者用 proprioception 和 tactile feedback 训练一个无视觉 LSTM grasping policy。数据由 **68** 条参数化 force-adaptive control demonstrations 和 **150** 条 human teleoperation demonstrations 组成。force-adaptive controller 的形式是：

\[
q_c(i)=q_m(i)+q(0)e^{-k f_z(i)}.
\]

接触弱时，命令让手快速闭合；当 fingertip normal force 增大，闭合速度降低并逐步收紧为稳定抓取。LSTM 看到 proprioception 和 tactile readings 的时间窗：

\[
x_t=[s^{hand}_t,f^{hand}_t]\in\mathbb{R}^{39},
\quad
s_t=[q^{hand}_t,\tau^{hand}_t]\in\mathbb{R}^{24},
\quad
f^{hand}_t\in\mathbb{R}^{15}.
\]

它通过 behavior cloning 和 MSE loss 预测 12-DoF hand action。这一步得到一个 compact reactive expert，专门处理 tactile force adaptation。

第二阶段，LSTM expert 用来收集多模态 hand VLA policy 的训练数据。DexGrasp-VLA 的输入是：

\[
o^{hand}_t=[I^{hand}_t,l_t,q^{hand}_t,z^{tac-f}_t,z^{tac-s}_t].
\]

其中 \(I^{hand}_t\) 是 eye-in-hand image，\(l_t\) 是语言指令，\(q^{hand}_t\) 是手部状态，\(z^{tac-f}_t\) 是每个指尖的 resultant force，\(z^{tac-s}_t\) 是 spatial tactile embedding。原始触觉张量是每个指尖 \(F_{raw}\in\mathbb{R}^{10\times12\times3}\)。论文用两种方式压缩：

- resultant force vectors \(f^{tac-f}_t\in\mathbb{R}^{5\times3}\)，表达净接触力的大小和方向；
- convolutional autoencoder tactile latents \(f^{tac-s}_t\in\mathbb{R}^{5\times128}\)，保留空间接触模式。

这个组合很关键，因为力的大小无法描述接触点在指尖上的位置。spatial tactile latents 可以帮助 policy 感知滑移、偏心接触和接触分布变化。

## Shared Autonomy 数据采集

Shared autonomy 把 VR arm teleoperation 和 autonomous hand control 结合起来。VR 系统使用 relative motion mapping：用户启动控制后，初始 VR controller pose \(T_{VR,0}\) 和 robot end-effector pose \(T_{robot,0}\) 定义映射：

\[
T_{robot,t}=T_{robot,0}(T_{VR,0}^{-1}T_{VR,t}).
\]

目标位姿通过 velocity-level QP IK solver 转成关节命令，底层使用 PlaCo 和 Pinocchio。论文报告 OpenXR 支持 **90 fps**，延迟小于 **100 ms**，同步数据保存频率为 **30 Hz**。

采集时，人控制机械臂，DexGrasp-VLA 生成手部动作：

\[
D^{uni}=\{(o^{uni}_t,a^{arm}_t,a^{hand}_t)\}_{t=1}^{T},
\quad
a^{arm}_t\sim p_{teleop},
\quad
a^{hand}_t\sim\pi_{hand}(\cdot|o^{hand}_t).
\]

combined observation 包括 multi-view RGB、language、arm joint states 和 hand joint states。最终得到的是同步 arm-hand dataset：arm motion 带有人类空间意图，hand motion 带有 tactile-adaptive execution。

附录里，shared autonomy 对主数据集的采集效率是 **110 trajectories/hour/person**，full teleoperation 是 **90 trajectories/hour/person**。corrective collection 是 **100/hour/person** 对 **80/hour/person**。作者将其总结为约 **25%** 的采集效率提升，同时降低 operator fatigue，并加快 policy iteration。

## 端到端 Arm-Hand VLA

最终 policy \(\pi_{uni}\) 端到端控制完整 arm-hand system：

\[
\pi_{uni}(A^{uni}_t|o^{uni}_t).
\]

关键架构是 **Arm-Hand Feature Enhancement**。基础 \(\pi_0\) 模型从视觉、语言和本体状态中得到 shared task representation \(z^{share}_t\)。enhancement module 把这个 shared representation 分别送入两个 MLP：

\[
z^{arm}_t=E_{arm}(z^{share}_t),
\quad
z^{hand}_t=E_{hand}(z^{share}_t).
\]

辅助 head 从 limb-specific features 中预测 arm 和 hand sub-actions。主 action head 使用 fused representation：

\[
z^{fused}_t=[z^{share}_t,z^{arm}_t,z^{hand}_t].
\]

训练 loss 由主 flow-matching action loss 和辅助 arm/hand losses 组成：

\[
L_{total}=L_{main}+\lambda(L_{hand}+L_{arm}).
\]

动机很直接。arm motion 更平滑、更空间化、更长时程；hand motion 更局部、更接触丰富、更依赖力反馈。单一 latent representation 容易把这些需求混在一起。额外的分支让模型保留 shared task context，同时学习 limb-specific dynamics。

## Corrective Teleoperation

论文还构建了 corrective human-in-the-loop system。部署时，成功的自主 rollout 会被记录。policy 失败时，操作者通过同一个 shared autonomy interface 介入，恢复任务并生成 corrective trajectory。第 \(k\) 轮：

\[
D^{(k)}=D^{(k)}_{success}\cup D^{(k)}_{corrective}.
\]

下一版 policy 从 \(\pi_0\) 出发，用原始 shared-autonomy 数据加 curated deployment data fine-tune：

\[
\pi^{(k+1)}_{uni}=SFT(\pi_0;D^{uni}\cup D^{(k)}).
\]

重要设计是 targeted correction。人的工作集中在失败状态：bad orientations、corner positions、unseen object shapes 和 adversarial configurations。这形成了小规模但高价值的数据飞轮。

## 实验

硬件是 UR3e arm 加 12-DoF 五指 Xhand，每个指尖有 **120 个三轴力通道**，感知包括两个固定 RealSense D435i 和一个腕部 RealSense D405。论文还在 RY-H2 手上验证 Arm-Hand Feature Enhancement。policy 评测频率是 **30 Hz**。

数据集规模很小：

- LSTM pretraining：150 条 human teleoperation demonstrations 加 68 条 force-adaptive autonomous trajectories。
- DexGrasp-VLA hand policy：180 条 cluttered scenes 中的成功抓取轨迹，覆盖 60 个物体。
- End-to-end arm-hand policy：100 条 shared-autonomy demonstrations，覆盖 20 个常见家用物体。
- Corrective datasets：50 条 orientation-recovery trajectories 和 50 条 corner-case trajectories。

hand-only DexGrasp-VLA 在包含 50 多个物体的 cluttered tabletop scenes 中评估。使用 handheld setup：人移动 mounted hand，policy 决定 finger-level grasping。它达到 **95.5%** overall success。

最终端到端 arm-hand VLA 在 50 个物体上的 pick-and-place 任务中评估。平均成功率 **88.7%**，seen objects 为 **91.7%**，unseen objects 为 **85.6%**。

## 消融

触觉消融是全文最有用的部分之一。测试协议是：先完成可视抓取 3 秒，再在完全视觉遮挡下保持 10 秒：

| Hand policy | Average success |
|---|---:|
| \(\pi_{hand-origin}\) from \(\pi_0\) | 21% |
| force tactile only \(f^{tac-f}\) | 70% |
| force + spatial tactile \(f^{tac-f}+f^{tac-s}\) | 90% |

这支持了论文的 tactile design：resultant force 提供粗粒度接触力大小和方向，spatial tactile embedding 提供接触分布。

Arm-Hand Feature Enhancement 的消融也很强：

| Policy | Xhand | RY-H2 | Xhand with camera occlusion |
|---|---:|---:|---:|
| baseline \(\pi_{uni-origin}\) | 88% | 71% | 19% |
| \(\pi_{uni-enhance}\) | 95% | 81% | 58% |

occlusion 结果最有信号。enhanced model 保留了更多 limb-specific structure，对单一全局视觉表示的依赖更低。

论文还报告了一个值得保留的负结果。把同样的 tactile features 直接加入 unified arm-hand policy，在测试设置中把成功率从 **95%** 降到 **82%**。作者认为这是 phase-alignment 问题：tactile signals 在 grasping 阶段有用，但在 arm reaching 阶段可能成为噪声，因为会出现 incidental contacts 或长时间 no-contact。这个结果支持未来使用 selective tactile routing 或 phase-aware gating。

Corrective teleoperation 改善 targeted failures。第一轮 50 条 orientation trajectories 提升 orientation failure 的处理能力。第二轮 50 条 corner-case trajectories 改善 corner placements。附录还把同样的 correction 思路扩展到长时程 gripper 任务，三个任务的成功率分别是 **65%**、**90%**、**70%**；peg-in-hole assembly 中，加入 20 条 recovery trajectories 后成功率从 **70%** 提升到 **90%**。

## 优势与限制

最强的想法是数据采集策略。Shared autonomy 把人用在高效的位置：语义理解、物体选择、approach 和空间定位。它把 autonomous tactile VLA 用在人类负担最重的位置：force-adaptive multi-finger closure。这是一条务实路径，可以采集真实机器人数据，同时避免要求操作者微操每个手指。

Arm-Hand Feature Enhancement 也很有概念价值。arm 和 hand actions 是耦合的，但控制 regime 不同。显式给模型 shared、arm-specific、hand-specific features，是一种轻量方式，把这个差异写进 fine-tuning。

主要限制是任务范围。当前系统把 grasping 和 pick-and-place 作为核心 testbed，还没有展示五指手上的复杂 in-hand reorientation、tool use 或更广泛的长时程 dexterous manipulation。full arm-hand policy 中的 tactile integration 也没有完全解决；简单 uniform fusion 在他们的设置中反而降低性能。Corrective teleoperation 有效，但仍依赖人类介入，长期扩展需要 autonomous failure detection 和 recovery。

## Takeaway

这篇论文最适合被看作 dexterous VLA 数据系统 recipe。它的贡献不只是一个新的 policy architecture，而是一整条 loop：

1. 训练 tactile hand Copilot；
2. 用它降低 shared-autonomy data collection 中的人类负担；
3. 用 limb-aware feature enhancement fine-tune arm-hand VLA；
4. 通过 corrective deployment data 继续改进 policy。

如果放进我的分类体系，我会把它标成 **Shared Autonomy / Tactile VLA Copilot / Arm-Hand Feature Enhancement / Corrective Teleoperation / Dexterous VLA Fine-Tuning**。最值得复用的启发是：dexterous VLA scaling 可能先需要更好的数据接口，再谈更大的模型。人负责 intent 和 arm motion；tactile Copilot 处理 contact；最终 policy 从同步数据中学习协调模式。

</div>
