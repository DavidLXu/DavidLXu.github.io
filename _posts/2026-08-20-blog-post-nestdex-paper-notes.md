---
title: "[Paper Notes] NestDex: Nested Policy Learning with Copilot Assisted Teleoperation for Dexterous Manipulation"
date: 2026-08-20
permalink: /posts/2026/08/nestdex-paper-notes/
tags:
  - Dexterous Manipulation
  - Shared Autonomy
  - Teleoperation
  - Imitation Learning
  - Latent Actions
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**NestDex** changes the role of learned hand policies in dexterous robot learning. Small proprioceptive policies first learn reusable hand skills such as grasping, pinching, or button pressing. During data collection, these **inner policies** act as a copilot: the human moves the robot arm and controls skill progress with a reversible one-degree-of-freedom clutch, while the selected policy generates coordinated finger motion from recent joint positions and efforts. A vision-language selector chooses the appropriate skill at task boundaries.

The resulting complete-task demonstrations train a separate **outer visuomotor policy** that predicts both arm and hand actions. The inner policies and vision-language selector disappear at deployment. A hand variational autoencoder, or **H-VAE**, compresses each 20-dimensional hand command into a 10-dimensional latent action so the outer policy can learn coordinated finger motion from only 20 successful trajectories per task.

Across six real-world tasks, copilot-assisted collection succeeds in **100%** of 20 attempts per task; the AnyTeleop baseline ranges from 0% to 75%. Autonomous outer policies with H-VAE reach **100%, 75%, 90%, and 100%** success on four single-arm tasks. In a bottle-grasp study, fixed-command replay succeeds in 3/10 trials, closed-loop prediction in 7/10, and closed-loop prediction with temporal ensembling in 9/10. The paper's useful lesson is that learned skills can be temporary infrastructure for producing better training data, while the final policy remains end-to-end and independent.

## Paper Info

**“NestDex: Nested Policy Learning with Copilot Assisted Teleoperation for Dexterous Manipulation”** is by **James Zhao, Jinhe Tang, Mingyuan Ba, and Weiming Zhi**, with affiliations at the University of Sydney, the Australian Centre for Robotics, and Vanderbilt University. This note covers [arXiv:2608.13362v1](https://arxiv.org/abs/2608.13362), posted on August 13, 2026. The [project page](https://aus.bot/research/nestdex/) provides system diagrams and real-robot videos.

## 1. The Demonstration Bottleneck

Dexterous imitation learning has a data problem before policy training begins. A parallel-jaw gripper exposes roughly one hand coordinate, while a five-finger hand demands continuous coordination across many joints and changing contact states. A teleoperator must simultaneously decide where the arm should move and how every finger should interact with the object. Errors in either stream can invalidate a complete long-horizon demonstration.

NestDex divides the work into two nested layers:

- The **inner layer** contains reusable, contact-aware hand policies. It assists a human during demonstration collection.
- The **outer layer** is a visuomotor policy trained on those complete demonstrations. It controls the full arm–hand system autonomously.

This separation distinguishes NestDex from a conventional hierarchical controller. The skill library and selector support data generation; they are absent from the final autonomous controller. The outer policy learns the complete visual-to-action mapping from the demonstrations that the nested system made easier to collect.

## 2. Learning the Inner Hand Skills

### Multi-View Retargeting

Each inner skill begins with natural human-hand demonstrations. Synchronized keypoints from several calibrated cameras are triangulated into a 3D hand pose, reducing the depth ambiguity and occlusion of a single view. The robot configuration is obtained with a robust version of AnyTeleop's vector retargeting objective:

\[
q_t^*=\arg\min_{q_{\min}\le q\le q_{\max}}
\sum_{i=1}^{M}
\rho_\delta\!\left(\left\|\alpha v_{i,t}^{h}-v_i^{r}(q)\right\|_2\right)
+\beta\left\|q-q_{t-1}^*\right\|_2^2.
\]

Human and robot hand vectors are matched after a scale correction \(\alpha\). The Huber penalty \(\rho_\delta\) limits the influence of large tracking errors, and the final term encourages temporal smoothness. The recorded skill trajectory contains measured robot-hand joint positions \(q_t\) and efforts \(e_t\).

### Proprioceptive Action-Chunk Policies

One Transformer policy is trained for each hand skill. Its state is

\[
x_t=[q_t,e_t],
\]

and each training example maps a history of \(h\) states to a chunk of \(H_{\mathrm{in}}\) future joint-position commands:

\[
o_t=[x_{t-h+1},\ldots,x_t],
\qquad
A_t=[q_{t+1},\ldots,q_{t+H_{\mathrm{in}}}].
\]

The experiments use a four-encoder-layer, one-decoder-layer Transformer, a **30-step observation history**, a **30-step action chunk**, and **10 trajectories per skill**. Training runs for 20,000 steps. Inner-policy control runs at 100 Hz.

The policy sees no camera image or object identity. Joint positions reveal where motion has reached; joint efforts reflect evolving contact. A grasp policy trained on four objects consequently produces different hand configurations as different physical constraints appear.

## 3. The Copilot Interface

The operator directly controls a 7-DoF follower arm through a matching leader arm. A one-DoF clutch controls normalized hand-skill progress:

\[
p_t=\operatorname{clip}\!\left(
\frac{c_t-c_{\mathrm{start}}}{c_{\mathrm{end}}-c_{\mathrm{start}}},0,1
\right).
\]

The progress value selects a target index along the learned skill:

\[
s_t^{\mathrm{in}}=\left\lfloor p_t(T_{\max}-1)\right\rfloor.
\]

The current execution index moves toward that target by at most one step per control cycle:

\[
r_{t+1}^{\mathrm{in}}=r_t^{\mathrm{in}}+
\operatorname{clip}(s_t^{\mathrm{in}}-r_t^{\mathrm{in}},-1,1).
\]

Forward motion queries the inner policy using the latest proprioceptive history, so new commands incorporate the contact state created by earlier commands. Reversing the clutch walks backward through buffered commands. The operator can reopen a grasp, reposition the arm, and resume forward prediction from the updated physical state.

A pretrained vision-language agent receives the wrist image and a numbered list of skill descriptions. It chooses a skill at startup and whenever the active skill has been fully reversed to index zero. Selection is locked during skill execution, which avoids mid-motion switching. Toast Preparation, for example, uses Tongs Grasp, Button Press, Plate Grasp, and Tongs Grasp again; the same inner skill can reappear at multiple task stages.

## 4. From Assisted Collection to Autonomous Control

Each complete demonstration records wrist images, arm and hand state, and arm and hand commands. The hand command has 20 dimensions, with strong correlations among finger joints. NestDex trains a task-specific H-VAE to encode it as

\[
z_k=\mu_\phi(a_k^{\mathrm{hand}})\in\mathbb R^{10}.
\]

The posterior mean removes sampling noise from the behavior-cloning target. Arm commands remain in their original 7-dimensional joint space, so one outer-policy label is

\[
a_k=[a_k^{\mathrm{arm}},z_k].
\]

The decoder reconstructs the complete hand command during deployment. The H-VAE uses hidden layers of sizes 128 and 64 and trains for 100 epochs with reconstruction and KL losses.

The outer policy is a visuomotor Transformer with four encoder layers, one decoder layer, and DINOv3 visual features. It receives a \(256\times256\) wrist image plus arm–hand joint positions and efforts, then predicts a 100-step action chunk. Training uses behavior cloning for 50,000 steps. At inference, overlapping chunks are combined through temporal ensembling, and the H-VAE decoder converts predicted hand latents back to 20 joint commands.

## 5. Tasks and Evaluation Protocol

The follower platform combines a 7-DoF Piper Nero arm, a 20-DoF five-finger WujiHand I, and a wrist camera. The six tasks span tool use, simultaneous multi-object grasping, sequential object transfer, and bimanual long-horizon manipulation:

| Task | Mode | Goal |
|---|---|---|
| Tongs Transfer | Single arm | Extract tongs, grasp a carrot, and move it to a pan |
| Bottle Disposal | Single arm | Open a bin, grasp a bottle, and place it inside |
| Dual-Object Transfer | Single arm | Grasp two blocks with separate finger groups and transfer both |
| Ingredient and Pot Transfer | Single arm | Move an ingredient into a pot, then relocate the pot |
| Toast Preparation | Dual arm | Use tongs, operate a toaster, position a plate, and return the toast |
| Binder Filing | Dual arm | Retrieve paper, punch it, insert it into a binder, and close the rings |

For demonstration collection, one trained operator performs 20 attempts per task with NestDex and AnyTeleop after familiarization. A trial succeeds only if every task stage is completed. Time per successful demonstration includes failed attempts and amortizes the one-time collection of ten inner-skill trajectories. The paper does not include policy-training compute in this collection-time metric.

For autonomous learning, the authors obtain 20 successful complete-task demonstrations whenever the collection method can produce them. Each outer policy is then evaluated for 20 rollouts.

## 6. Demonstration Collection Results

| Method | Tongs | Bottle | Dual-object | Ingredient + pot | Toast | Binder |
|---|---:|---:|---:|---:|---:|---:|
| **NestDex success** | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** |
| NestDex time/success (s) | 44.33 | 41.37 | 36.19 | 43.26 | 327.46 | 221.80 |
| AnyTeleop success | 0% | 50% | 30% | 75% | 0% | 0% |
| AnyTeleop time/success (s) | N/A | 88.88 | 121.63 | 55.29 | N/A | N/A |

NestDex produces a successful demonstration in every attempt across all six tasks. On the three tasks where AnyTeleop obtains at least one success, the copilot also reduces time per success. The gap is largest when the task requires continuous regrasping, tool operation, or coordination across two arms and many fingers.

The result supports the proposed division of labor: direct arm teleoperation preserves human task judgment, while the inner policy removes high-dimensional finger coordination from the operator's moment-to-moment workload.

## 7. Autonomous Policy and H-VAE Results

| Training data and action target | Tongs | Bottle | Dual-object | Ingredient + pot |
|---|---:|---:|---:|---:|
| Copilot demonstrations, direct hand actions | 65% | 60% | 80% | 85% |
| **Copilot demonstrations, H-VAE** | **100%** | **75%** | **90%** | **100%** |
| AnyTeleop demonstrations, direct hand actions | N/A | 40% | 20% | 75% |

Copilot data improves the direct-action policy wherever both sources are available. Tongs Transfer exposes the harder failure mode: AnyTeleop produces no successful demonstration, so an autonomous policy cannot be trained from that source.

H-VAE improves every copilot-trained task by 10 to 35 percentage points. The largest gain occurs on Tongs Transfer, from 65% to 100%. Compressing coordinated hand actions provides a useful inductive bias for a small dataset, while retaining arm commands directly avoids forcing two mechanically different action groups through one latent bottleneck.

## 8. Why Closed-Loop Execution Matters

The bottle-grasp experiment isolates three execution modes for the same inner policy:

| Execution mode | Success |
|---|---:|
| Fixed successful command replay | 3/10 |
| Closed loop, no temporal ensemble | 7/10 |
| **Closed loop + temporal ensemble** | **9/10** |

Replaying one previously successful trajectory is brittle under small contact changes. Querying the policy from the latest joint-position and effort history raises success from 3/10 to 7/10. Adding temporal ensembling reaches 9/10; the difference between fixed replay and the full method is statistically significant at \(p=0.0198\).

Temporal ensembling mainly improves smoothness. Closed-loop execution without ensembling has **2.30× higher executed-command P95 jerk** than the ensembled version, with \(p=1.8\times10^{-4}\), while closing duration does not increase. The two mechanisms therefore serve distinct functions: feedback adapts motion to contact, and ensembling suppresses discontinuities between overlapping action chunks.

## 9. Strengths and Limitations

NestDex presents a coherent path from low-cost hand-skill demonstrations to complete-task data and autonomous deployment. Its strongest design decision is the temporary use of hierarchy: skill structure improves the data-generation process without constraining the deployed policy to a fixed skill graph. The reversible clutch is also more expressive than a binary trigger because it gives the operator direct control over progress and recovery.

The evaluation uses one robot platform and one trained operator, with nominal object resets and 20 attempts or rollouts per condition. The comparison isolates the interface on identical hardware, though broader operator studies are needed to measure learning effort and inter-user variation. Collection time amortizes the ten inner demonstrations but excludes policy-training compute.

The autonomous outer-policy evaluation covers the four single-arm tasks. Toast Preparation and Binder Filing demonstrate successful dual-arm collection and qualitative skill switching; autonomous execution is not reported for them. The skill selector is also evaluated qualitatively, without a selection accuracy or failure analysis.

H-VAE is trained separately for each task, leaving cross-task latent-action reuse open. The four-object grasp study demonstrates adaptation among objects seen during inner-policy training and does not establish generalization to unseen geometry. Finally, all inner skills require predefined demonstrations and textual descriptions; scaling the library raises questions about skill discovery, selector ambiguity, and maintenance.

## Takeaway

NestDex reframes shared autonomy as a **data-production tool**. A human contributes long-horizon task judgment and arm motion; small proprioceptive policies supply contact-rich finger coordination; a clutch exposes reversible control over skill progress; and a vision-language model routes stages to reusable skills. The collected trajectories then supervise a compact, independent outer policy.

The broader lesson is valuable for dexterous learning systems: intermediate autonomy can make demonstrations more reliable even when the final objective is a unified end-to-end controller. NestDex's 100% collection rate across six tasks, the consistent H-VAE gains, and the 3/10-to-9/10 closed-loop grasp improvement show how interface design, action representation, and online feedback reinforce one another.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**NestDex** 重新定义了 learned hand policies 在 dexterous robot learning 中的作用。系统先训练一组小型 proprioceptive policies，表示 grasping、pinching、button pressing 等可复用 hand skills。采集数据时，这些 **inner policies** 充当 copilot：人负责移动 robot arm，并通过一个可逆的 one-degree-of-freedom clutch 控制 skill progress；policy 根据最近的 joint positions 和 efforts 生成协调的 finger motion。Vision-language selector 在 task boundaries 选择合适技能。

采集到的 complete-task demonstrations 用于训练独立的 **outer visuomotor policy**，同时预测 arm 和 hand actions。部署阶段不再需要 inner policies 和 vision-language selector。一个 hand variational autoencoder，也就是 **H-VAE**，把 20-dimensional hand command 压缩成 10-dimensional latent action，使 outer policy 可以仅用每项任务 20 条成功 trajectories 学习 coordinated finger motion。

在六项 real-world tasks 上，copilot-assisted collection 的每项任务 20 次尝试全部成功，即 **100%**；AnyTeleop baseline 的成功率为 0%–75%。使用 H-VAE 的 autonomous outer policies 在四项 single-arm tasks 上分别达到 **100%、75%、90% 和 100%**。Bottle-grasp 实验中，fixed-command replay 为 3/10，closed-loop prediction 为 7/10，再加入 temporal ensembling 后达到 9/10。论文给出的重要启发是：learned skills 可以作为临时基础设施来制造更好的 training data，final policy 仍保持 end-to-end 和 independent。

## 论文信息

论文标题为 **“NestDex: Nested Policy Learning with Copilot Assisted Teleoperation for Dexterous Manipulation”**，作者是 **James Zhao、Jinhe Tang、Mingyuan Ba 和 Weiming Zhi**，作者单位包括 University of Sydney、Australian Centre for Robotics 和 Vanderbilt University。本文对应 [arXiv:2608.13362v1](https://arxiv.org/abs/2608.13362)，发布时间为 2026 年 8 月 13 日。[项目主页](https://aus.bot/research/nestdex/)提供了 system diagrams 和 real-robot videos。

## 1. Demonstration Bottleneck

Dexterous imitation learning 在 policy training 开始前就遇到了 data problem。Parallel-jaw gripper 的 hand control 基本只有一个 coordinate；five-finger hand 则要求操作者持续协调大量 joints 和不断变化的 contact states。Teleoperator 需要同时决定 arm 移向何处，以及每根手指如何与物体交互。任意一条控制流出错，都可能让完整 long-horizon demonstration 失效。

NestDex 把工作分成两个 nested layers：

- **Inner layer** 是可复用、contact-aware 的 hand policies，在 demonstration collection 期间辅助人类。
- **Outer layer** 是从完整 demonstrations 训练的 visuomotor policy，负责 autonomous arm–hand control。

这种分工与 conventional hierarchical controller 有明显区别。Skill library 和 selector 服务于 data generation，在最终 autonomous controller 中不再出现。Outer policy 直接学习完整的 visual-to-action mapping，而 nested system 的作用是提高训练数据的可采集性和一致性。

## 2. 学习 Inner Hand Skills

### Multi-View Retargeting

每个 inner skill 从自然的 human-hand demonstrations 开始。多个 calibrated cameras 采集 synchronized keypoints，再通过 triangulation 重建 3D hand pose，从而减轻 single view 中的 depth ambiguity 和 occlusion。Robot configuration 通过 AnyTeleop vector-retargeting objective 的 robust version 得到：

\[
q_t^*=\arg\min_{q_{\min}\le q\le q_{\max}}
\sum_{i=1}^{M}
\rho_\delta\!\left(\left\|\alpha v_{i,t}^{h}-v_i^{r}(q)\right\|_2\right)
+\beta\left\|q-q_{t-1}^*\right\|_2^2.
\]

Human 和 robot hand vectors 经过 scale correction \(\alpha\) 后进行匹配。Huber penalty \(\rho_\delta\) 降低较大 tracking error 的影响，最后一项鼓励 temporal smoothness。记录得到的 skill trajectory 包含 robot-hand joint positions \(q_t\) 和 efforts \(e_t\)。

### Proprioceptive Action-Chunk Policies

每项 hand skill 训练一个 Transformer policy。Hand state 定义为

\[
x_t=[q_t,e_t],
\]

每个 training example 把长度为 \(h\) 的 state history 映射到未来 \(H_{\mathrm{in}}\) 步 joint-position commands：

\[
o_t=[x_{t-h+1},\ldots,x_t],
\qquad
A_t=[q_{t+1},\ldots,q_{t+H_{\mathrm{in}}}].
\]

实验使用 four-encoder-layer、one-decoder-layer Transformer，配合 **30-step observation history**、**30-step action chunk** 和**每项技能 10 条 trajectories**。模型训练 20,000 steps，inner-policy control frequency 为 100 Hz。

Policy 不接收 camera image 或 object identity。Joint positions 表示 motion 已经到达的位置，joint efforts 则反映不断变化的 contact。一个在四种 objects 上训练的 grasp policy，因此可以在遇到不同 physical constraints 时产生不同 hand configurations。

## 3. Copilot Interface

操作者通过 matching leader arm 直接控制 7-DoF follower arm，再用 one-DoF clutch 控制 normalized hand-skill progress：

\[
p_t=\operatorname{clip}\!\left(
\frac{c_t-c_{\mathrm{start}}}{c_{\mathrm{end}}-c_{\mathrm{start}}},0,1
\right).
\]

Progress value 决定 learned skill 上的 target index：

\[
s_t^{\mathrm{in}}=\left\lfloor p_t(T_{\max}-1)\right\rfloor.
\]

Current execution index 每个 control cycle 最多朝 target 移动一步：

\[
r_{t+1}^{\mathrm{in}}=r_t^{\mathrm{in}}+
\operatorname{clip}(s_t^{\mathrm{in}}-r_t^{\mathrm{in}},-1,1).
\]

Clutch 向前移动时，inner policy 根据最新 proprioceptive history 重新预测，因此新 command 会吸收先前动作造成的 contact state。反向移动 clutch 时，系统沿 buffered commands 向后执行。操作者可以重新打开 grasp、调整 arm pose，再从更新后的 physical state 恢复 forward prediction。

Pretrained vision-language agent 接收 wrist image 和带编号的 skill descriptions，只在 startup 或当前 skill 完全退回 index zero 时选择新技能。Skill execution 期间 selection 被锁定，避免 mid-motion switching。Toast Preparation 会依次使用 Tongs Grasp、Button Press、Plate Grasp，随后再次使用 Tongs Grasp；同一个 inner skill 可以在多个 task stages 重复出现。

## 4. 从 Assisted Collection 到 Autonomous Control

每条 complete demonstration 记录 wrist images、arm/hand state，以及 arm/hand commands。Hand command 有 20 个 dimensions，并且 finger joints 之间存在很强的 correlation。NestDex 为每项任务单独训练 H-VAE，把 hand command 编码成

\[
z_k=\mu_\phi(a_k^{\mathrm{hand}})\in\mathbb R^{10}.
\]

使用 posterior mean 可以消除 behavior-cloning target 中的 sampling noise。Arm commands 保留原始 7-dimensional joint space，因此 outer-policy label 为

\[
a_k=[a_k^{\mathrm{arm}},z_k].
\]

部署时 decoder 重建完整 hand command。H-VAE 的 hidden layers 为 128 和 64，使用 reconstruction loss 与 KL loss 训练 100 epochs。

Outer policy 是一个包含 four encoder layers、one decoder layer 和 DINOv3 visual features 的 visuomotor Transformer。输入为 \(256\times256\) wrist image，以及 arm–hand joint positions 和 efforts；输出为 100-step action chunk。模型通过 behavior cloning 训练 50,000 steps。Inference 时，overlapping chunks 经过 temporal ensembling，H-VAE decoder 再把 predicted hand latents 转回 20 个 joint commands。

## 5. Tasks 与 Evaluation Protocol

Follower platform 由 7-DoF Piper Nero arm、20-DoF five-finger WujiHand I 和 wrist camera 组成。六项任务覆盖 tool use、simultaneous multi-object grasping、sequential object transfer 和 bimanual long-horizon manipulation：

| Task | Mode | Goal |
|---|---|---|
| Tongs Transfer | Single arm | 取出夹子，夹起胡萝卜并移入锅中 |
| Bottle Disposal | Single arm | 打开垃圾桶，抓住瓶子并放入桶中 |
| Dual-Object Transfer | Single arm | 用不同 finger groups 同时抓取两个积木并转移 |
| Ingredient and Pot Transfer | Single arm | 把食材放入锅中，再移动整口锅 |
| Toast Preparation | Dual arm | 使用夹子、操作烤面包机、放置盘子并取回吐司 |
| Binder Filing | Dual arm | 取纸、打孔、装入 binder 并合上圆环 |

Demonstration collection 由一名完成 interface familiarization 的 operator 执行。NestDex 和 AnyTeleop 在每项任务上各进行 20 次 attempts。只有完成全部 task stages 才算成功。Time per successful demonstration 包含 failed attempts，并摊销了采集十条 inner-skill trajectories 的一次性成本；该指标不包含 policy-training compute。

Autonomous learning 阶段，只要 collection method 能够产生成功样本，作者就继续采集至 20 条 successful complete-task demonstrations。每个 outer policy 最终评估 20 次 rollouts。

## 6. Demonstration Collection Results

| Method | Tongs | Bottle | Dual-object | Ingredient + pot | Toast | Binder |
|---|---:|---:|---:|---:|---:|---:|
| **NestDex success** | **100%** | **100%** | **100%** | **100%** | **100%** | **100%** |
| NestDex time/success (s) | 44.33 | 41.37 | 36.19 | 43.26 | 327.46 | 221.80 |
| AnyTeleop success | 0% | 50% | 30% | 75% | 0% | 0% |
| AnyTeleop time/success (s) | N/A | 88.88 | 121.63 | 55.29 | N/A | N/A |

NestDex 在六项任务的全部 attempts 中都得到 successful demonstration。AnyTeleop 能够产生成功样本的三项任务上，copilot 也降低了 time per success。当任务需要连续 regrasping、tool operation，或两个 arms 与多根 fingers 的协同控制时，两者差距最明显。

结果支持论文提出的 division of labor：direct arm teleoperation 保留人类的 task judgment；inner policy 则从操作者的实时负担中移除 high-dimensional finger coordination。

## 7. Autonomous Policy 与 H-VAE Results

| Training data and action target | Tongs | Bottle | Dual-object | Ingredient + pot |
|---|---:|---:|---:|---:|
| Copilot demonstrations, direct hand actions | 65% | 60% | 80% | 85% |
| **Copilot demonstrations, H-VAE** | **100%** | **75%** | **90%** | **100%** |
| AnyTeleop demonstrations, direct hand actions | N/A | 40% | 20% | 75% |

只要两种 data sources 都可用，copilot data 训练的 direct-action policy 都表现更好。Tongs Transfer 展示了更严重的 failure mode：AnyTeleop 没有产生任何 successful demonstration，因此无法用该来源训练 autonomous policy。

H-VAE 让四项 copilot-trained tasks 都提高了 10–35 percentage points。最大提升出现在 Tongs Transfer，从 65% 上升到 100%。压缩 coordinated hand actions 为 small dataset 提供了有效 inductive bias；arm commands 保留 direct representation，也避免把机械属性差异很大的两组 actions 强行塞进同一个 latent bottleneck。

## 8. Closed-Loop Execution 为什么重要

Bottle-grasp experiment 对同一个 inner policy 比较了三种 execution modes：

| Execution mode | Success |
|---|---:|
| Fixed successful command replay | 3/10 |
| Closed loop, no temporal ensemble | 7/10 |
| **Closed loop + temporal ensemble** | **9/10** |

对一条曾经成功的 trajectory 做 replay，面对细微 contact variation 时十分脆弱。根据最新 joint-position 和 effort history 重复 query policy，成功率从 3/10 提高到 7/10；加入 temporal ensembling 后达到 9/10。Fixed replay 与完整方法之间的差异达到 statistical significance，\(p=0.0198\)。

Temporal ensembling 的主要收益是 smoothness。没有 ensembling 的 closed-loop execution，其 executed-command P95 jerk 是 ensembled version 的 **2.30×**，\(p=1.8\times10^{-4}\)，同时 closing duration 没有增加。两种机制承担不同功能：feedback 让 motion 适应 contact，ensembling 则抑制 overlapping action chunks 之间的 discontinuity。

## 9. 优点与局限

NestDex 给出了从低成本 hand-skill demonstrations、complete-task data 到 autonomous deployment 的完整路径。最值得肯定的设计是 hierarchy 的临时使用方式：skill structure 改善 data-generation process，又不会把 deployed policy 固定在预定义 skill graph 中。Reversible clutch 也比 binary trigger 更有表达力，因为 operator 可以直接控制 progress 和 recovery。

实验只使用一个 robot platform 和一名 trained operator，object reset 接近 nominal configuration，每个 condition 只有 20 次 attempts 或 rollouts。同一硬件上的比较很好地隔离了 interface effect；更大规模的 operator study 仍是衡量 learning effort 和 inter-user variation 的必要步骤。Collection time 摊销了十条 inner demonstrations，却不包含 policy-training compute。

Autonomous outer-policy evaluation 只覆盖四项 single-arm tasks。Toast Preparation 和 Binder Filing 验证了 successful dual-arm collection 与 qualitative skill switching，没有报告 autonomous execution。Skill selector 同样只接受 qualitative evaluation，缺少 selection accuracy 和 failure analysis。

H-VAE 为每项任务单独训练，cross-task latent-action reuse 仍未解决。Four-object grasp study 展示的是 inner-policy training objects 之间的 adaptation，无法证明对 unseen geometry 的 generalization。所有 inner skills 还需要预先定义 demonstrations 和 textual descriptions；当 library 持续扩大时，skill discovery、selector ambiguity 和 maintenance 都会成为新问题。

## Takeaway

NestDex 把 shared autonomy 重新定义为一种 **data-production tool**。人类贡献 long-horizon task judgment 和 arm motion；小型 proprioceptive policies 提供 contact-rich finger coordination；clutch 暴露可逆的 skill progress control；vision-language model 负责把不同 task stages 路由给可复用技能。最终收集到的 trajectories 再监督一个紧凑、独立的 outer policy。

对 dexterous learning systems 更普遍的启发是：即使最终目标是 unified end-to-end controller，intermediate autonomy 依然能够显著提高 demonstrations 的可靠性。六项任务 100% 的 collection rate、H-VAE 的一致收益，以及 closed-loop grasp 从 3/10 到 9/10 的提升，展示了 interface design、action representation 和 online feedback 如何相互增强。

</div>
