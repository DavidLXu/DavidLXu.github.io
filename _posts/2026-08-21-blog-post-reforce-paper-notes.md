---
title: "[Paper Notes] ReForce: Learning Force-aware Retargeting for Dexterous Manipulation"
date: 2026-08-21
permalink: /posts/2026/08/reforce-paper-notes/
tags:
  - Dexterous Manipulation
  - Force-aware Retargeting
  - Tactile Feedback
  - Human Demonstration
  - Imitation Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**ReForce** treats human-to-robot retargeting as a contact-reproduction problem. A conventional retargeter supplies a desired robot-hand pose, while human tactile measurements or a learned reference policy supply a desired force for each fingertip. ReForce compares these references with the robot's current joint state and measured fingertip forces, then predicts a bounded joint update that repairs missing, excessive, or lingering contact.

The method serves as a lightweight closed-loop execution layer; a separate system supplies the visuomotor task reference. Its general force tracker is behavior-cloned from randomized and augmented simulation interactions, then composed with either live teleoperation or an ACT-style motion-and-force reference policy. Deployment on a new object does not require a per-object digital twin or trajectory optimization.

On real paper-cup grasps, ReForce lowers force-tracking error from **0.309 N to 0.247 N** for a side grasp and from **0.736 N to 0.474 N** for a top grasp relative to direct replay. With learned references, paper-cup force-safe success reaches **70%**, compared with 30% for the reference policy and 60% with admittance control. The tongs result is more mixed: ReForce increases contact engagement, while admittance control achieves the best force-safe success, **90% versus 54.5%**. The evidence supports ReForce as a promising contact-correction layer, with task-dependent advantages over a tuned analytical controller.

## Paper Info

**“ReForce: Learning Force-aware Retargeting for Dexterous Manipulation”** is by **Yuhang Wu, Lingqi Zeng, Changwei Jing, Jianglong Ye, and Xiaolong Wang** from UC San Diego. This note covers [arXiv:2608.15560v1](https://arxiv.org/abs/2608.15560), posted on August 16, 2026. The [project page](https://wuyuhang-eai.github.io/reforce/) contains the system overview and real-robot demonstrations. The current version is an arXiv preprint and does not list a conference venue.

## 1. Retargeting the Interaction

Kinematic retargeting maps human-hand keypoints or joint configurations onto a robot hand. That mapping captures motion intent, yet the physical outcome remains underdetermined. A pose can miss an object because the robot fingers are shorter; it can create too much force because the hardware is stiffer; and a visually similar grasp can slip because contact occurs on a different surface.

This embodiment gap becomes especially visible in force-sensitive manipulation. A paper cup needs enough multi-finger contact to stay secure and enough compliance to avoid deformation. Tongs need contact to appear at the right time and release cleanly. Joint-space similarity alone does not describe these requirements.

Several prior force-aware retargeting methods optimize a robot trajectory inside a simulation model of the demonstrated hand, object, and contacts. That route can produce physically meaningful motion, but it requires a simulation-ready object and performs optimization separately for recorded trajectories. ReForce learns one feedback controller in advance. At execution time, it uses measured contact to adapt the upstream reference online.

The resulting abstraction is:

```text
human motion + human force      or      learned motion-force policy
                     ↓
          pose reference q* and force reference F*
                     ↓
       ReForce + robot joint/force feedback (q, F)
                     ↓
              corrected hand command
```

ReForce therefore changes the retargeting target from geometric correspondence alone to **motion-and-contact correspondence**.

## 2. Closed-Loop Force-Aware Retargeting

At control step $t$, the robot provides its observed hand configuration and five fingertip normal forces:

\[
s_t=(q_t^{\mathrm{obs}},F_t).
\]

An upstream source supplies the desired motion-and-contact state:

\[
s_t^\star=(q_t^\star,F_t^\star).
\]

ReForce also receives the explicit target error:

\[
e_t=(q_t^\star-q_t^{\mathrm{obs}},\;F_t^\star-F_t).
\]

The policy predicts a bounded joint-command update:

\[
\Delta q_t^{\mathrm{cmd}}=\pi_\theta(s_t,s_t^\star,e_t),
\]

which is accumulated and clipped to the hardware limits:

\[
q_{t+1}^{\mathrm{cmd}}
=\operatorname{clip}(q_t^{\mathrm{cmd}}+\Delta q_t^{\mathrm{cmd}},q_{\min},q_{\max}).
\]

This residual interface keeps the upstream kinematic reference as a strong prior. The network learns local corrections: close a finger when target force is present but measured force is absent, reduce closure when contact becomes excessive, and release force when the reference falls.

The policy uses a per-finger MLP. The four non-thumb fingers share a $[128,128]$ trunk and use finger-specific $[64]$ heads; the thumb has a separate trunk and head. Each controlled joint update is limited to $0.088$ rad, approximately $5^\circ$. The design is small enough to serve as a fast feedback component and isolates the thumb's distinct kinematics.

## 3. Learning a General Force Tracker from Simulation

ReForce is trained from simulated hand-object trajectories containing joint configurations and fingertip forces:

\[
\{(q_t,F_t)\}_{t=1}^{T}.
\]

For each time step, the authors average a future window of up to 16 frames to construct post-hoc motion and force targets:

\[
q_t^\star=\frac{1}{K_t}\sum_{k=1}^{K_t}q_{t+k},
\qquad
F_t^\star=\frac{1}{K_t}\sum_{k=1}^{K_t}F_{t+k}.
\]

These targets describe a nearby state that the simulated rollout successfully reached. The supervised action remains the demonstrated one-step update,

\[
\Delta q_t^{\mathrm{demo}}=q_{t+1}-q_t.
\]

The distinction matters: the future window gives the controller a motion-and-contact goal, while the one-step label teaches how to move toward it. The behavior-cloning loss averages joints within each finger and then weights the five fingers equally:

\[
\mathcal L_{\mathrm{ReForce}}
=\mathbb E_{t\sim\mathcal D}\left[
\frac{1}{5}\sum_{i=1}^{5}\frac{1}{D_i}
\left\|\Delta q_t^{\mathrm{demo},(i)}-
\Delta q_t^{\mathrm{cmd},(i)}\right\|_2^2
\right].
\]

Equal finger weighting prevents a finger with more joints from dominating the objective.

### Recovery-Oriented Data Construction

Nominal interaction data alone may teach tracking near successful trajectories without teaching recovery from the errors seen on hardware. ReForce adds Gaussian joint noise, $0.1$ N force noise, and per-finger force dropout with probability 0.30. It also introduces two structured augmentations:

- **Reference-stall augmentation** freezes selected pose-reference components for force-active fingers while retaining the demonstrated action. This represents a stale motion reference during ongoing contact.
- **Pose-drift augmentation** moves low-force fingers toward joint limits and recomputes the corrective label. This creates synthetic recovery examples for displaced fingers.

The final mixture uses 70% Base, 20% reference-stall, and 10% pose-drift samples. Object assets and target grasps originate from Dex1B. This detail sharpens the “no digital twin” claim: ReForce still learns from simulated objects, while deployment does not require a matched digital twin for every new target object.

## 4. Two Sources of Motion-and-Force References

### Online Human Teleoperation

In live teleoperation, a Quest controller supplies wrist pose, a Manus glove captures hand pose, and five fingertip FSR sensors measure human force. The human and robot tactile measurements are calibrated into Newtons. Kinematic retargeting produces $q_t^\star$, the human FSRs provide $F_t^\star$, and the XHand's fingertip sensors close the robot-side loop.

This configuration lets the operator specify task intent and desired contact while ReForce compensates for the embodiment gap during execution.

### Offline Learned References

The paper also trains a separate ACT-style reference policy for each task from approximately 30–40 human demonstrations. Its motion branch predicts a 32-step joint-reference chunk from a nine-step configuration history and task phase. Its force branch predicts the corresponding force chunk from task phase alone:

\[
\{\hat q_{t+k\mid t}^{\mathrm{ref}}\}_{k=0}^{C-1}
=\pi_\eta^q(\mathbf Q_t,\phi_t),
\qquad
\{\hat F_{t+k\mid t}^{\mathrm{ref}}\}_{k=0}^{C-1}
=\pi_\eta^F(\phi_t).
\]

The model uses separate MSE losses for motion and force,

\[
\mathcal L_{\mathrm{ACT}}
=\mathcal L_q^{\mathrm{MSE}}+\lambda_F\mathcal L_F^{\mathrm{MSE}},
\qquad \lambda_F=1,
\]

and temporally ensembles overlapping chunks during deployment. The predicted force is a phase-conditioned contact plan; it does not use measured robot force. ReForce supplies the missing reactive layer by comparing that plan with online tactile feedback.

The ACT model has no visual input. Its reference can encode a nominal task sequence, while its ability to react to object displacement or visual task progress is limited.

## 5. Real-Robot Evaluation

The hardware platform is a UFACTORY xArm with a 12-DoF XHand and fingertip tactile sensing. Experiments cover side and top paper-cup grasps plus tongs manipulation. The baselines are direct reference replay and a hand-designed task-space admittance controller that maps force error into fingertip displacement and then into joint correction through a damped Jacobian inverse.

### Replayed Paper-Cup References

Each method receives the same recorded source trajectory. Force-tracking error is the mean absolute difference between measured and reference force over time and fingertips.

| Grasp | Direct replay | Admittance | ReForce |
|---|---:|---:|---:|
| Side | $0.309\pm0.006$ N | $0.280\pm0.013$ N | **$0.247\pm0.036$ N** |
| Top | $0.736\pm0.000$ N | $0.619\pm0.048$ N | **$0.474\pm0.049$ N** |

The comparison uses five trials per condition. Direct replay cannot respond to contact mismatch. Admittance control improves tracking, although its fixed force-to-motion mapping can retain residual force after the target decreases. ReForce obtains the lowest error for both grasp directions.

### Learned Motion-and-Force References

Force-safe success requires task completion, force below the task threshold, and no severe missing-contact failure. A trial counts as severe missing contact when at least three fingers never establish contact.

| Task | Method | Force-safe success | Tracking error | Over-force | Severe missing contact | Active fingers |
|---|---|---:|---:|---:|---:|---:|
| Paper cup | Reference policy | 30.0% | 0.812 N | 0/10 | 7/10 | 0.17 |
| Paper cup | + Admittance | 60.0% | 0.683 N | 4/10 | 1/10 | 1.26 |
| Paper cup | + **ReForce** | **70.0%** | **0.124 N** | 2/10 | **0/10** | **2.61** |
| Tongs | Reference policy | 50.0% | 0.454 N | 0/10 | 5/10 | 0.94 |
| Tongs | + **Admittance** | **90.0%** | **0.419 N** | **0/10** | 1/10 | 1.34 |
| Tongs | + ReForce | 54.5% | 0.441 N | 4/11 | 1/11 | **1.62** |

Paper-cup grasping is the clearest positive result: ReForce establishes multi-finger contact reliably, sharply reduces force error, and raises force-safe success. Tongs expose the tradeoff. ReForce activates more fingers and avoids most missing-contact failures, yet four over-force trials reduce its force-safe success. Admittance control wins on that task.

The paper's results therefore support a precise conclusion: ReForce consistently improves **contact engagement**, while its advantage in **force regulation and task success** depends on the interaction.

## 6. What the Ablations Show

The simulation ablation evaluates three random seeds on 14,605 held-out episodes. Adding the pose reference to current state and target force cuts force-tracking error by roughly 32–35%. Adding explicit pose and force errors improves it further.

| Training distribution | State + force target | + pose reference | + error features |
|---|---:|---:|---:|
| Base | 0.0601 N | 0.0400 N | 0.0388 N |
| + reference stall | 0.0592 N | 0.0401 N | 0.0381 N |
| + pose drift | 0.0609 N | 0.0396 N | 0.0385 N |
| + both augmentations | 0.0590 N | 0.0396 N | **0.0379 N** |

The largest gain comes from the input representation: force tracking needs the intended pose because a force error alone does not identify which joint motion should create the missing contact. Explicit error features make that relationship easier for a small MLP to learn. Structured recovery data provides a smaller but consistent gain once the full input is available.

## 7. Strengths and Limitations

ReForce has a clean abstraction boundary. Reference generation decides *what interaction should happen*; ReForce decides *how the current robot hand should adjust to realize it*. This makes the controller composable with live teleoperation, replayed demonstrations, and learned reference policies. The compact per-finger network and bounded residual action are also practical choices for high-rate closed-loop control.

The real-world evidence remains narrow. Paper-cup replay uses five trials per condition, and the learned-reference experiments use roughly ten trials per task and method. The two evaluated task families cannot establish broad object, material, hand-hardware, or morphology generalization. A stronger evaluation would include unseen objects, different compliance regimes, disturbances, sensor drift, and multiple dexterous hands.

The force representation contains one normal-force scalar per fingertip. It omits shear force, slip, torque, contact location, and distributed pressure. These signals become important for sliding, rolling, in-hand rotation, and tool interactions. The tongs over-force failures show that stronger contact engagement can conflict with force safety.

The reference policy also has no vision and predicts force only from task phase. It cannot revise the reference using observed object state. ReForce can correct local contact mismatch, but it cannot recover a globally wrong task plan or recognize that an object has moved somewhere unexpected.

Finally, the generalization claim should be interpreted at the controller level. Training uses simulation assets and Dex1B-derived grasps; the paper demonstrates zero-shot execution on the tested real tasks without building their digital twins. It does not yet show universal force retargeting across arbitrary objects and robot hands.

## Takeaway

ReForce's reusable idea is to insert a learned tactile feedback layer between human-guided references and robot control. A pose target provides geometric intent, a force target provides contact intent, and the robot's measured fingertip force reveals the current physical mismatch. Simulation behavior cloning then learns the local joint corrections that connect the three.

The paper also illustrates an important systems distinction. Better contact engagement and better task success are related but separate objectives. ReForce is strong at making intended contacts appear; the tongs experiment shows that regulating those contacts safely still depends on task dynamics and training coverage. The most promising future version would combine ReForce's fast tactile correction with visual, task-aware reference generation and richer tactile observations.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**ReForce** 把 human-to-robot retargeting 定义为一个 contact reproduction 问题。传统 retargeter 给出 robot hand 的目标姿态，人手触觉测量或 learned reference policy 给出每个 fingertip 的目标力；ReForce 比较这些参考与机器人当前 joint state、实测 fingertip forces，再预测有界 joint update，修复 missing、excessive 或 lingering contact。

这个方法是一个轻量 closed-loop execution layer，visuomotor task reference 由独立系统提供。通用 force tracker 从经过随机化与增强的 simulation interactions 中进行 behavior cloning，然后接到 live teleoperation 或 ACT-style motion-and-force reference policy 后面。部署到新物体时，无需为该物体构建专用 digital twin 或重新优化 trajectory。

真实 paper-cup grasp 实验中，相比 direct replay，ReForce 把 side grasp 的 force-tracking error 从 **0.309 N 降到 0.247 N**，把 top grasp 从 **0.736 N 降到 0.474 N**。使用 learned references 时，paper-cup 的 force-safe success 达到 **70%**，reference policy 为 30%，admittance control 为 60%。Tongs 的结果更复杂：ReForce 提高了 contact engagement，admittance control 则获得最高 force-safe success，分别为 **54.5% 和 90%**。这些证据支持把 ReForce 看作有潜力的 contact-correction layer；相对经过调参的 analytical controller，其优势仍具有 task dependency。

## 论文信息

论文标题是 **“ReForce: Learning Force-aware Retargeting for Dexterous Manipulation”**，作者为 UC San Diego 的 **Yuhang Wu、Lingqi Zeng、Changwei Jing、Jianglong Ye 和 Xiaolong Wang**。本文对应 [arXiv:2608.15560v1](https://arxiv.org/abs/2608.15560)，发布时间为 2026 年 8 月 16 日。[项目主页](https://wuyuhang-eai.github.io/reforce/)提供了 system overview 和 real-robot demonstrations。当前版本是 arXiv preprint，论文没有列出 conference venue。

## 1. Retargeting the Interaction

Kinematic retargeting 把 human-hand keypoints 或 joint configurations 映射到 robot hand。这个映射保留 motion intent，physical outcome 仍然没有被唯一确定。机器人手指更短时，相同姿态可能碰不到物体；hardware 更硬时，相同闭合量可能产生过大作用力；看起来相似的 grasp 也可能因为接触面不同而发生滑落。

这类 embodiment gap 在 force-sensitive manipulation 中格外明显。Paper cup 需要足够的 multi-finger contact 保持稳定，同时需要合适 compliance 避免形变。Tongs 需要接触在正确时刻建立，并且能够干净释放。Joint-space similarity 无法完整表达这些要求。

一些已有 force-aware retargeting 方法会在 simulation 中优化 robot trajectory，模拟 demonstrated hand、object 和 contacts。这样可以得到具有物理意义的 motion，但每次都需要 simulation-ready object，并且针对 recorded trajectory 单独执行优化。ReForce 提前学习一个统一 feedback controller；执行时利用实测接触在线调整 upstream reference。

整体抽象可以写成：

```text
human motion + human force      或      learned motion-force policy
                     ↓
          pose reference q* 与 force reference F*
                     ↓
       ReForce + robot joint/force feedback (q, F)
                     ↓
               corrected hand command
```

因此，ReForce 把 retargeting target 从单独的 geometric correspondence 扩展为 **motion-and-contact correspondence**。

## 2. Closed-Loop Force-Aware Retargeting

在 control step $t$，机器人提供 observed hand configuration 和五个 fingertip normal forces：

\[
s_t=(q_t^{\mathrm{obs}},F_t).
\]

Upstream source 提供目标 motion-and-contact state：

\[
s_t^\star=(q_t^\star,F_t^\star).
\]

ReForce 还会显式接收 target error：

\[
e_t=(q_t^\star-q_t^{\mathrm{obs}},\;F_t^\star-F_t).
\]

Policy 预测有界 joint-command update：

\[
\Delta q_t^{\mathrm{cmd}}=\pi_\theta(s_t,s_t^\star,e_t),
\]

系统累计这项更新，并裁剪到 hardware limits：

\[
q_{t+1}^{\mathrm{cmd}}
=\operatorname{clip}(q_t^{\mathrm{cmd}}+\Delta q_t^{\mathrm{cmd}},q_{\min},q_{\max}).
\]

这个 residual interface 保留 upstream kinematic reference 作为强 prior。Network 学习局部 correction：目标有力但实测无力时继续闭合对应手指；接触过强时降低闭合程度；reference force 下降时释放残余作用力。

Policy 使用 per-finger MLP。四根非拇指共享一个 $[128,128]$ trunk，每根手指有各自的 $[64]$ head；拇指使用独立 trunk 和 head。每个受控 joint 的单步更新限制为 $0.088$ rad，约 $5^\circ$。这种小型结构适合作为快速 feedback component，同时显式处理拇指不同的 kinematics。

## 3. 从 Simulation 学习通用 Force Tracker

ReForce 的训练数据是包含 joint configurations 与 fingertip forces 的 simulated hand-object trajectories：

\[
\{(q_t,F_t)\}_{t=1}^{T}.
\]

对每个时间点，作者平均未来最多 16 帧，构造 post-hoc motion and force targets：

\[
q_t^\star=\frac{1}{K_t}\sum_{k=1}^{K_t}q_{t+k},
\qquad
F_t^\star=\frac{1}{K_t}\sum_{k=1}^{K_t}F_{t+k}.
\]

这些 target 表示 simulated rollout 随后真实到达的邻近状态。Supervised action 仍是一帧 demonstrated update：

\[
\Delta q_t^{\mathrm{demo}}=q_{t+1}-q_t.
\]

两者分工明确：future window 给 controller 提供 motion-and-contact goal，one-step label 教它如何朝目标移动。Behavior-cloning loss 先对每根手指内部 joints 求平均，再对五根手指等权平均：

\[
\mathcal L_{\mathrm{ReForce}}
=\mathbb E_{t\sim\mathcal D}\left[
\frac{1}{5}\sum_{i=1}^{5}\frac{1}{D_i}
\left\|\Delta q_t^{\mathrm{demo},(i)}-
\Delta q_t^{\mathrm{cmd},(i)}\right\|_2^2
\right].
\]

Equal finger weighting 可以避免 joint 数量更多的手指主导 objective。

### 面向 Recovery 的 Data Construction

Nominal interaction data 可以训练 successful trajectory 附近的 tracking，却不一定包含 hardware 上常见的 recovery situation。ReForce 加入 Gaussian joint noise、$0.1$ N force noise，以及概率为 0.30 的 per-finger force dropout，并设计两种 structured augmentations：

- **Reference-stall augmentation** 在 force-active fingers 上冻结部分 pose-reference components，同时保留 demonstrated action，用来表示接触过程中出现 stale motion reference。
- **Pose-drift augmentation** 把 low-force fingers 向 joint limits 扰动，并重新计算 corrective label，构造手指偏离后的 synthetic recovery examples。

最终 mixture 包含 70% Base、20% reference-stall 和 10% pose-drift samples。Object assets 与 target grasps 来自 Dex1B。这个细节有助于准确理解 “no digital twin”：ReForce 的学习过程仍使用 simulated objects，部署阶段不再要求为每个新 target object 准备一一对应的 digital twin。

## 4. Motion-and-Force Reference 的两种来源

### Online Human Teleoperation

Live teleoperation 中，Quest controller 提供 wrist pose，Manus glove 捕捉 hand pose，五个 fingertip FSR sensors 测量人手作用力。Human 与 robot 触觉都被标定到 Newton。Kinematic retargeting 生成 $q_t^\star$，human FSRs 提供 $F_t^\star$，XHand fingertip sensors 构成 robot-side closed loop。

这个配置让 operator 指定 task intent 与 desired contact，ReForce 在执行过程中补偿 embodiment gap。

### Offline Learned References

论文还为每项任务使用约 30–40 条 human demonstrations，训练独立的 ACT-style reference policy。Motion branch 根据九步 configuration history 与 task phase 预测 32-step joint-reference chunk；force branch 只根据 task phase 预测对应 force chunk：

\[
\{\hat q_{t+k\mid t}^{\mathrm{ref}}\}_{k=0}^{C-1}
=\pi_\eta^q(\mathbf Q_t,\phi_t),
\qquad
\{\hat F_{t+k\mid t}^{\mathrm{ref}}\}_{k=0}^{C-1}
=\pi_\eta^F(\phi_t).
\]

模型分别计算 motion 和 force 的 MSE loss：

\[
\mathcal L_{\mathrm{ACT}}
=\mathcal L_q^{\mathrm{MSE}}+\lambda_F\mathcal L_F^{\mathrm{MSE}},
\qquad \lambda_F=1,
\]

部署时通过 temporal ensembling 融合 overlapping chunks。Predicted force 表示 phase-conditioned contact plan，不使用机器人 measured force。ReForce 比较这份计划与 online tactile feedback，为系统补上 reactive layer。

ACT model 没有 visual input。它可以编码 nominal task sequence，对 object displacement 或 visual task progress 的响应能力有限。

## 5. Real-Robot Evaluation

Hardware platform 是配备 12-DoF XHand 和 fingertip tactile sensing 的 UFACTORY xArm。实验包含 side/top paper-cup grasp 与 tongs manipulation。Baselines 分别是 direct reference replay，以及 hand-designed task-space admittance controller；后者把 force error 转成 fingertip displacement，再通过 damped Jacobian inverse 得到 joint correction。

### Replayed Paper-Cup References

每种方法接收相同 recorded source trajectory。Force-tracking error 定义为整个时间段、所有 fingertips 上 measured force 与 reference force 的 mean absolute difference。

| Grasp | Direct replay | Admittance | ReForce |
|---|---:|---:|---:|
| Side | $0.309\pm0.006$ N | $0.280\pm0.013$ N | **$0.247\pm0.036$ N** |
| Top | $0.736\pm0.000$ N | $0.619\pm0.048$ N | **$0.474\pm0.049$ N** |

每种 condition 评估五次。Direct replay 无法响应 contact mismatch。Admittance control 改善了 tracking，但固定 force-to-motion mapping 可能在 target 下降后保留 residual force。ReForce 在两个 grasp directions 上都得到最低误差。

### Learned Motion-and-Force References

Force-safe success 同时要求 task completion、作用力低于 task threshold，并且没有 severe missing-contact failure。至少三根手指始终没有建立接触时，该 trial 被记为 severe missing contact。

| Task | Method | Force-safe success | Tracking error | Over-force | Severe missing contact | Active fingers |
|---|---|---:|---:|---:|---:|---:|
| Paper cup | Reference policy | 30.0% | 0.812 N | 0/10 | 7/10 | 0.17 |
| Paper cup | + Admittance | 60.0% | 0.683 N | 4/10 | 1/10 | 1.26 |
| Paper cup | + **ReForce** | **70.0%** | **0.124 N** | 2/10 | **0/10** | **2.61** |
| Tongs | Reference policy | 50.0% | 0.454 N | 0/10 | 5/10 | 0.94 |
| Tongs | + **Admittance** | **90.0%** | **0.419 N** | **0/10** | 1/10 | 1.34 |
| Tongs | + ReForce | 54.5% | 0.441 N | 4/11 | 1/11 | **1.62** |

Paper-cup grasping 给出最清晰的 positive result：ReForce 稳定建立 multi-finger contact，显著降低 force error，并提升 force-safe success。Tongs 则呈现出 tradeoff。ReForce 激活更多手指，并避免大部分 missing-contact failures；四次 over-force trials 拉低了 force-safe success，最终由 admittance control 获胜。

因此，实验支持一个更精确的结论：ReForce 能持续改善 **contact engagement**；它在 **force regulation 与 task success** 上的收益由具体 interaction 决定。

## 6. Ablation 告诉了我们什么

Simulation ablation 使用三个 random seeds，在 14,605 个 held-out episodes 上评估。把 pose reference 加入 current state 与 target force 后，force-tracking error 降低约 32–35%；继续加入显式 pose/force errors，性能进一步提升。

| Training distribution | State + force target | + pose reference | + error features |
|---|---:|---:|---:|
| Base | 0.0601 N | 0.0400 N | 0.0388 N |
| + reference stall | 0.0592 N | 0.0401 N | 0.0381 N |
| + pose drift | 0.0609 N | 0.0396 N | 0.0385 N |
| + both augmentations | 0.0590 N | 0.0396 N | **0.0379 N** |

最大的增益来自 input representation：force error 本身无法确定应该用哪种 joint motion 建立缺失接触，force tracking 还需要 intended pose。显式 error features 可以让小型 MLP 更容易学习这种关系。完整输入就位后，structured recovery data 提供较小但稳定的进一步提升。

## 7. Strengths and Limitations

ReForce 划出了一条清晰的 abstraction boundary。Reference generation 决定 *应该发生什么 interaction*；ReForce 决定 *当前 robot hand 应该如何调整来实现它*。因此，这个 controller 可以和 live teleoperation、replayed demonstrations、learned reference policies 组合。Compact per-finger network 与 bounded residual action 也符合 high-rate closed-loop control 的实际要求。

Real-world evidence 的范围仍然较窄。Paper-cup replay 每种 condition 只有五次 trials，learned-reference experiments 每项 task/method 约十次。两类 tasks 无法证明广泛的 object、material、hand-hardware 或 morphology generalization。更充分的 evaluation 应覆盖 unseen objects、不同 compliance regimes、外部 disturbances、sensor drift 和多种 dexterous hands。

Force representation 只包含每个 fingertip 的一个 normal-force scalar，没有 shear force、slip、torque、contact location 与 distributed pressure。这些信号对 sliding、rolling、in-hand rotation 和 tool interactions 都很重要。Tongs 的 over-force failures 表明，更强 contact engagement 可能与 force safety 发生冲突。

Reference policy 没有 vision，并且只根据 task phase 预测 force，因此无法利用 observed object state 修正 reference。ReForce 可以处理局部 contact mismatch，却无法恢复全局错误的 task plan，也无法识别物体已经移动到意外位置。

最后，generalization claim 应该限定在 controller level。训练使用 simulation assets 与 Dex1B-derived grasps；论文展示了无需为测试任务构建 digital twins 的 zero-shot real execution。现有结果还不能证明跨任意 objects 与 robot hands 的 universal force retargeting。

## Takeaway

ReForce 最值得复用的思路，是在人类引导的 references 与 robot control 之间插入 learned tactile feedback layer。Pose target 提供 geometric intent，force target 提供 contact intent，机器人实测 fingertip force 暴露当前 physical mismatch；simulation behavior cloning 学习连接这三者的局部 joint corrections。

论文还展示了一个重要的 systems distinction：更好的 contact engagement 与更好的 task success 相互关联，但属于两个独立目标。ReForce 擅长让 intended contacts 建立起来；tongs 实验说明，能否安全调节这些接触仍取决于 task dynamics 与 training coverage。更完整的下一步系统可以把 ReForce 的 fast tactile correction、visual task-aware reference generation 和更丰富的 tactile observations 结合起来。

</div>
