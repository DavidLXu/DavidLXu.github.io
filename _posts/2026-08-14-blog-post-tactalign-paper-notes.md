---
title: "[Paper Notes] TactAlign: Human-to-Robot Policy Transfer via Tactile Alignment"
date: 2026-08-14
permalink: /posts/2026/08/tactalign-paper-notes/
tags:
  - Tactile Sensing
  - Human-to-Robot Transfer
  - Dexterous Manipulation
  - Rectified Flow
  - Robot Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**TactAlign** transfers human tactile demonstrations to a robot whose tactile sensors have a different layout and signal distribution. It first learns separate self-supervised encoders for a wearable OSMO glove and Xela fingertip sensors. It then builds noisy cross-embodiment correspondences from similar hand-object transitions and trains a **rectified flow** to transport human tactile latents into the robot latent space. A shared action-chunking policy can consequently learn from both human and robot trajectories.

The method's useful insight is that touch does not need an exact sample-by-sample correspondence to become transferable. Fingertip motion, object motion, and contact state provide weak semantic anchors. Rectified flow turns those anchors into a dense mapping while tolerating imperfect pseudo-pairs.

Across pivoting, insertion, and lid closing, the full method reaches **79%** average success, compared with **38%** for robot-only training, **21%** without tactile input, and **28%** without tactile alignment. With 20 human demonstrations and no robot task demonstrations, it also achieves **100%** success on light-bulb screwing; both ablations score 0%. These results make a strong case for alignment, while the evaluation remains limited to one glove–robot sensor pairing, fingertip sensing, ten rollouts per object, and tasks with structured pose information during alignment-data preparation.

## Paper Info

The paper is **“TactAlign: Human-to-Robot Policy Transfer via Tactile Alignment”** by **Youngsun Wi, Jessica Yin, Elvis Xiang, Akash Sharma, Jitendra Malik, Mustafa Mukadam, Nima Fazeli, and Tess Hellebrekers**, with affiliations spanning the University of Michigan, NVIDIA, Amazon Frontier AI & Robotics, UC Berkeley, the University of Washington, and Microsoft Research. This note covers [arXiv:2602.13579v1](https://arxiv.org/abs/2602.13579), posted on February 14, 2026. The project page is [yswi.github.io/tactalign](https://yswi.github.io/tactalign/).

## 1. Why Cross-Sensor Touch Is Hard

Human demonstrations are attractive because people manipulate objects quickly, dexterously, and with natural tactile feedback. Yet a glove reading cannot be inserted directly into a robot policy. The two embodiments differ in hand geometry, contact placement, sampling, and sensor physics.

TactAlign uses an **OSMO glove**, which produces a three-axis magnetic signal at each fingertip with spatial resolution $1\times3$. The robot is a Franka Panda with an Allegro Hand and **Xela** fingertip sensors, whose readings have resolution $30\times3$. Both are magnetic systems, but OSMO uses particle-based magnetic skin while Xela uses discrete magnets. Their scales, spatial structures, drift behavior, and contact responses therefore differ substantially.

The desired map is

\[
g:T^h\rightarrow T^r,
\]

where $T^h,T^r\in\mathbb R^d$ are the learned human and robot tactile latent spaces. Training has two offline trajectory collections:

\[
H=\{\mathcal T_1^h,\ldots,\mathcal T_N^h\},
\qquad
R=\{\mathcal T_1^r,\ldots,\mathcal T_M^r\}.
\]

Each timestep contains multi-finger tactile readings $F_t$, fingertip poses $P_t$, and wrist pose $w_t$. A subset of human and robot trajectories also has estimated object pose $o_t$. The robot dataset is intentionally smaller because kinesthetic robot data is more costly to collect.

“Unpaired” has a precise scope here. Human and robot trajectories do not need temporal alignment or matching tactile measurements. Pseudo-pairs are still constructed between demonstrations of the **same task, object, reset state, and goal state**, using estimated object and hand motion. This is weaker supervision than paired data, though it is stronger than arbitrary collections with no shared task structure.

## 2. Stage One: Modality-Specific Tactile Representations

TactAlign starts with separate human and robot encoder–decoder models. Each encoder receives a **0.1-second tactile window** and is trained through self-supervised reconstruction with mean-squared error:

\[
\operatorname{Enc}^h(f_i^h)=h_i\in\mathbb R^d,
\qquad
\operatorname{Enc}^r(f_i^r)=r_i\in\mathbb R^d.
\]

The architecture is JEPA-inspired. A learnable length-one query performs cross-attention pooling so sensors with different token counts produce fixed-dimensional latents. Separate reconstruction objectives preserve the structure of each sensing modality; equal latent dimensionality makes a later cross-domain transport map possible.

Both encoders use roughly ten minutes of play data plus the in-domain alignment dataset. At this stage, the model has two compact tactile representations, but $h_i$ and $r_j$ still lack shared semantics. Raw human features can be actively harmful during joint policy training, as the ablation later shows.

## 3. Stage Two: Pseudo-Pairs from Interaction

The paper uses observable interaction dynamics as the bridge between embodiments. For a human timestep $i$ and robot timestep $j$, define consecutive fingertip–object transitions

\[
O_i^h=(p_i^h,o_i^h,p_{i+1}^h,o_{i+1}^h),
\qquad
O_j^r=(p_j^r,o_j^r,p_{j+1}^r,o_{j+1}^r).
\]

After task-level normalization using robot statistics, their distance is

\[
\begin{aligned}
S(O_i^h,O_j^r)
={}&\lVert p_i^h-p_j^r\rVert+\lVert o_i^h-o_j^r\rVert\\
&+\lambda\lVert\widehat{\Delta p_i^h}-\widehat{\Delta p_j^r}\rVert
+\lambda\lVert\widehat{\Delta o_i^h}-\widehat{\Delta o_j^r}\rVert.
\end{aligned}
\]

The first two terms compare current hand and object configuration. The latter two compare their transition directions. The implementation uses $\lambda=1$, selects the three nearest robot transitions for each human transition, and rejects matches beyond $\delta=2.0$. Appendix sweeps show stable alignment over nearby values of both hyperparameters.

A binary contact filter removes semantically implausible pairs. Signal norms below $\delta_h=1200$ for OSMO or $\delta_r=30$ for Xela indicate non-contact. Only contact-to-contact and non-contact-to-non-contact matches survive. This small rule matters because contact onset may cause a large tactile change while producing only subtle kinematic motion.

The resulting set

\[
P=\{(h_i^\ast,r_j^\ast)\}
\]

contains useful yet noisy correspondences. Similar object motion does not uniquely determine force, shear, finger pressure, or contact patch, so the method treats each match as an initial guide instead of exact ground truth.

## 4. Rectified Flow as the Alignment Map

Rectified flow learns a time-dependent velocity field $v_\theta(x,t)$ that transports the human latent distribution toward the robot distribution. Using the endpoint-consistent human-to-robot convention, a pseudo-pair defines

\[
x_t=(1-t)h_i^\ast+t r_j^\ast,
\qquad
\dot x_t=r_j^\ast-h_i^\ast,
\]

and the velocity-matching objective is

\[
\min_{v_\theta}
\sum_{(h_i^\ast,r_j^\ast)\in P}
\int_0^1
\left\|
(r_j^\ast-h_i^\ast)-v_\theta(x_t,t)
\right\|^2dt.
\]

At inference, an ODE solver starts at a human latent $x_0=h_i$ and integrates the field to obtain a robot-space feature:

\[
g_\theta(h_i)=x_1,
\qquad
\frac{dx_t}{dt}=v_\theta(x_t,t).
\]

The v1 paper prints the interpolation and velocity with reversed endpoints while also stating $x_0=h_i$ and human-to-robot inference. The equations above use the direction consistent with that stated inference procedure.

Why use a flow instead of directly regressing $h_i^\ast\mapsto r_j^\ast$? The pseudo-pairs are many-to-many and noisy. A learned velocity field can “rewire” crossing assignments while fitting a lower-cost distributional transport. In the authors' synthetic illustration, this property recovers coherent source-to-target structure even when individual pair lines are imperfect.

The alignment network is a three-hidden-layer MLP of width 1,024. It is trained with 100 discretized time steps for 200,000 epochs at learning rate $5\times10^{-5}$, taking about ten minutes on one RTX 4090. Inference uses a vanilla Euler solver.

## 5. Shared Human–Robot Policy Learning

After alignment, TactAlign trains a shared policy adapted from ACT. For human input, the policy sees aligned fingertip features $\{\hat h_{t,k}\}_{k=1}^K$, human fingertip poses, and wrist pose. For robot input, it sees native robot features $\{r_{t,k}\}_{k=1}^K$ with robot proprioception:

\[
\pi_\phi(\{\hat h_{t,k}\},P_t^h,w_t^h)=a_t^h,
\qquad
\pi_\phi(\{r_{t,k}\},P_t^r,w_t^r)=a_t^r.
\]

Both embodiments supervise action chunks expressed in the robot base frame. Depending on the task, actions contain fingertip locations and wrist orientation. During policy training, the tactile encoders and alignment module stay frozen; the policy-side modules learn on their common representation.

The action chunk size is 32. Pivoting, insertion, and lid closing run at 10 Hz, executing 4, 2, and 8 predicted actions per replanning step. Light-bulb screwing runs at 30 Hz and executes 12 actions per step for finer control. Predicted task-space actions are converted to joint commands through inverse kinematics.

This design separates representation alignment from control learning. A single flow trained on pivoting and insertion can be reused when training the lid-closing policy, testing whether tactile semantics transfer to a new task class.

## 6. Data and Experimental Protocol

The alignment stage uses **200 human demonstrations** and **100 robot demonstrations** from pivoting and insertion. For policy co-training, each of pivoting, insertion, and lid closing receives 140–160 human demonstrations: 100 demonstrations (about 30 minutes) use the object also seen by the robot, and 20 demonstrations (about five minutes) are collected for each additional human-only object. Each task also has 50 robot demonstrations (about 60 minutes) with one training object.

Objects are split into three categories:

- **Seen-by-both:** present in human and robot policy data.
- **Human-only:** present only in human policy data.
- **Unseen-by-both:** held out from all policy training.

Every object is evaluated with ten policy rollouts. Pivoting and insertion were present during alignment training. Lid closing was absent from both alignment and encoder training, so it measures cross-task reuse of the learned flow.

The light-bulb experiment is more demanding: it uses only 20 human demonstrations, no robot demonstrations for the task, four fingertip positions, a fixed wrist, and a Manus glove augmented with OSMO sensing. Occlusion from the lamp shade makes reliable visual or teleoperated control difficult.

## 7. Main Results

### Latent Alignment

After flow alignment, the Earth Mover's Distance between human and robot tactile distributions falls from **0.091 to 0.020**, a **78% reduction**. UMAP visualizations show the two distributions nearly overlapping. Feature magnitude also organizes consistently with contact strength even though force labels are never used for encoder or alignment training.

### Human–Robot Co-Training

Across all object categories and tasks, average success is:

| Method | Average success |
|---|---:|
| Robot only | 38% |
| Human + robot, no tactile input | 21% |
| Human + robot, raw unaligned tactile features | 28% |
| **TactAlign** | **79%** |

The full model reaches **76%** on pivoting, **72%** on insertion, and **74%** on lid closing. Aggregated by object exposure, it obtains **100%** on seen-by-both objects, **71%** on human-only objects, and **65.5%** on unseen-by-both objects.

The ablations reveal more than a generic benefit from extra human trajectories. Removing tactile input costs 59 percentage points on average. Keeping touch but removing alignment costs 51 points. Raw cross-sensor latents frequently damage learning because a shared policy receives incompatible semantics under a shared feature slot.

### Human-Only Dexterous Transfer

On light-bulb screwing, TactAlign succeeds in **10/10 rollouts** and takes about 61 seconds on average to illuminate the bulb. The no-tactile policy fails to establish stable contact; the no-alignment policy jams and may fully unscrew the bulb. Both baselines score **0/10**.

### Force Semantics Without Force Supervision

The authors freeze the tactile models, train a force decoder only on robot latents, and evaluate it on aligned human latents. Alignment reduces cross-sensor force-prediction error by about **96.75%** averaged across force axes. Performance approaches the robot-to-robot baseline along two axes, while a larger gap remains along the third. This probe supports the claim that the flow carries physically meaningful contact structure instead of merely improving task-specific action prediction.

## 8. What the Paper Gets Right

First, the method identifies an intermediate representation problem that policy co-training cannot solve automatically. The “without alignment” baseline is especially valuable: additional tactile data can lower performance when embodiment-specific meanings are mixed.

Second, pseudo-pairs use information that is available during ordinary demonstrations. They require estimated hand and object motion, not force labels, exact temporal synchronization, CAD models, or paired sensor readings. Contact filtering adds a strong physical cue with minimal machinery.

Third, the experiments separate three kinds of transfer: new objects seen only in human data, objects unseen in either domain, and a new task absent from alignment training. The human-only light-bulb result then tests the regime where scalable human collection is most valuable.

Finally, the force probe evaluates latent semantics outside the policy loss. Its gains make the representation claim more credible than success rates alone.

## 9. Limitations and Open Questions

The largest external-validity limitation is sensor diversity. Experiments use one OSMO–Xela pairing, and both systems are magnetic. Vision-based tactile sensors, full-palm arrays, multiple robot hands, or sensing families with very different physical responses may produce a harder transport problem.

The alignment data is unpaired in time, yet its construction depends on shared task/object conditions, estimated object poses, task-wise normalization, and nearest-neighbor transition matching. Scaling to unconstrained demonstrations with unknown objects, shifting goals, occlusion, or inaccurate pose estimates needs additional machinery.

Evaluation uses ten rollouts per object, leaving considerable statistical uncertainty around individual percentages. The tasks and hardware are real, but the study covers three co-training tasks and one human-only task on one arm–hand platform.

The human signal preprocessing takes the absolute value to handle OSMO sign flips across magnetic-skin quadrants. This removes an ambiguity, while potentially discarding directional structure that future hardware or calibration might retain.

TactAlign addresses tactile and proprioceptive discrepancies. It does not align human and robot vision, nor does it resolve all kinematic and action-space embodiment gaps. A multimodal policy that jointly aligns vision, touch, and embodiment remains an open direction.

## Takeaway

TactAlign reframes human tactile transfer as **weakly anchored distribution transport**. Interaction geometry proposes approximate correspondences; contact state removes obvious mistakes; rectified flow converts the remaining noisy pairs into a smooth human-to-robot map; and a shared policy learns on the aligned space.

The practical lesson is concise: human touch becomes useful robot supervision only after its semantics are made compatible with the robot's sensors. The full method's 79% average success, its 51-point gain over unaligned tactile co-training, and the 10/10 human-only light-bulb result show how consequential that representation step can be.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**TactAlign** 解决的是跨 embodiment 的触觉迁移：人通过 OSMO tactile glove 采集 demonstration，机器人使用信号分布和空间布局都不同的 Xela fingertip sensors。方法先分别训练 human/robot self-supervised tactile encoders，再根据相似的 hand-object transition 构造带噪声的跨 embodiment 对应关系，最后用 **rectified flow** 把 human tactile latent transport 到 robot latent space。经过对齐后，一个共享的 action-chunking policy 就可以同时利用人类和机器人轨迹训练。

这篇论文最有价值的 insight 是：触觉迁移不要求逐帧、逐样本的精确对应。Fingertip motion、object motion 和 contact state 可以提供弱语义锚点；rectified flow 再把稀疏且不完美的 pseudo-pairs 转成 dense mapping。

在 pivoting、insertion 和 lid closing 三项任务上，完整方法的平均成功率为 **79%**，robot-only training 为 **38%**，移除 tactile input 后为 **21%**，保留触觉但移除 alignment 后为 **28%**。Light-bulb screwing 只使用 20 条 human demonstrations，没有该任务的 robot demonstrations，最终达到 **100%** 成功率；两个 ablation 都是 0%。这些结果清楚展示了 alignment 的价值，同时实验仍局限于一组 glove–robot sensor pairing、fingertip sensing、每个物体十次 rollout，以及在 alignment data 处理中可获得结构化 pose information 的任务。

## 论文信息

论文标题为 **“TactAlign: Human-to-Robot Policy Transfer via Tactile Alignment”**，作者是 **Youngsun Wi、Jessica Yin、Elvis Xiang、Akash Sharma、Jitendra Malik、Mustafa Mukadam、Nima Fazeli 和 Tess Hellebrekers**，作者单位包括 University of Michigan、NVIDIA、Amazon Frontier AI & Robotics、UC Berkeley、University of Washington 和 Microsoft Research。本文对应 [arXiv:2602.13579v1](https://arxiv.org/abs/2602.13579)，版本发布时间为 2026 年 2 月 14 日。项目主页是 [yswi.github.io/tactalign](https://yswi.github.io/tactalign/)。

## 1. 为什么 Cross-Sensor Touch 很难迁移

Human demonstrations 的优势来自采集速度、手部 dexterity 和自然 tactile feedback。不过，glove reading 无法直接作为 robot policy 的输入。两种 embodiment 在 hand geometry、contact placement、sampling 和 sensor physics 上都不同。

TactAlign 使用 **OSMO glove**，每个 fingertip 输出三轴 magnetic signal，空间分辨率为 $1\times3$。机器人平台由 Franka Panda 和 Allegro Hand 组成，指尖安装 **Xela** sensors，分辨率为 $30\times3$。二者都基于磁信号，但 OSMO 使用 particle-based magnetic skin，Xela 使用 discrete magnets，因此信号尺度、空间结构、漂移特性和接触响应存在明显差异。

论文希望学习下面的映射：

\[
g:T^h\rightarrow T^r,
\]

其中 $T^h,T^r\in\mathbb R^d$ 分别是 human 和 robot tactile latent spaces。训练数据包含两组 offline trajectories：

\[
H=\{\mathcal T_1^h,\ldots,\mathcal T_N^h\},
\qquad
R=\{\mathcal T_1^r,\ldots,\mathcal T_M^r\}.
\]

每个 timestep 包含 multi-finger tactile readings $F_t$、fingertip poses $P_t$ 和 wrist pose $w_t$。部分 human/robot trajectories 还有估计得到的 object pose $o_t$。Robot dataset 较小，因为 kinesthetic robot data 的采集成本更高。

这里的 “unpaired” 有明确边界：human 和 robot trajectories 无需时间同步，也无需相同的 tactile measurements；pseudo-pairs 仍然来自**相同 task、object、reset state 和 goal state** 的 demonstrations，并使用估计的 object motion 和 hand motion。这种监督比 paired data 弱，但它还不是完全没有共享任务结构的任意数据集合。

## 2. 第一阶段：Modality-Specific Tactile Representations

TactAlign 首先为 human 和 robot 分别训练 encoder–decoder。每个 encoder 接收 **0.1 秒 tactile window**，通过 mean-squared reconstruction error 完成 self-supervised training：

\[
\operatorname{Enc}^h(f_i^h)=h_i\in\mathbb R^d,
\qquad
\operatorname{Enc}^r(f_i^r)=r_i\in\mathbb R^d.
\]

整体 architecture 受到 JEPA 启发。模型使用一个 learnable length-one query 做 cross-attention pooling，使 token 数量不同的传感器都能输出固定维度 latent。两套独立的 reconstruction objective 保留各自 sensing modality 的结构，统一 latent dimensionality 则为后续 cross-domain transport 提供接口。

两套 encoder 都使用约十分钟 play data 和 in-domain alignment dataset。训练完成后，模型已经得到两种紧凑的 tactile representation，但 $h_i$ 和 $r_j$ 还没有共享语义。后面的 ablation 表明，把 raw human features 直接送入 joint policy training 甚至会损害性能。

## 3. 第二阶段：从 Interaction 构造 Pseudo-Pairs

论文使用可观测的 interaction dynamics 连接两种 embodiment。对于 human timestep $i$ 和 robot timestep $j$，定义连续两帧的 fingertip–object transition：

\[
O_i^h=(p_i^h,o_i^h,p_{i+1}^h,o_{i+1}^h),
\qquad
O_j^r=(p_j^r,o_j^r,p_{j+1}^r,o_{j+1}^r).
\]

使用 robot statistics 完成 task-level normalization 后，transition distance 定义为

\[
\begin{aligned}
S(O_i^h,O_j^r)
={}&\lVert p_i^h-p_j^r\rVert+\lVert o_i^h-o_j^r\rVert\\
&+\lambda\lVert\widehat{\Delta p_i^h}-\widehat{\Delta p_j^r}\rVert
+\lambda\lVert\widehat{\Delta o_i^h}-\widehat{\Delta o_j^r}\rVert.
\end{aligned}
\]

前两项比较当前 hand/object configuration，后两项比较 transition direction。实现中使用 $\lambda=1$，为每个 human transition 选择三个最近的 robot transitions，并通过 $\delta=2.0$ 排除距离过大的匹配。Appendix 中对邻近取值的 sweep 表明，alignment 对这两个 hyperparameters 并不敏感。

随后，binary contact filter 会删除语义上明显不合理的 pair。OSMO signal norm 低于 $\delta_h=1200$，或 Xela signal norm 低于 $\delta_r=30$，就被识别为 non-contact。系统只保留 contact-to-contact 与 non-contact-to-non-contact 的匹配。这条简单规则很重要，因为 contact onset 会让 tactile signal 显著变化，却可能只产生很小的 kinematic motion。

最终得到

\[
P=\{(h_i^\ast,r_j^\ast)\},
\]

其中包含有用但带噪声的对应关系。相似的 object motion 无法唯一确定 force、shear、finger pressure 或 contact patch，因此每个 match 只充当 initial guide，并不被视为精确 ground truth。

## 4. 用 Rectified Flow 学习 Alignment Map

Rectified flow 学习 time-dependent velocity field $v_\theta(x,t)$，把 human latent distribution transport 到 robot distribution。使用与 human-to-robot 方向一致的 endpoint convention，一个 pseudo-pair 对应

\[
x_t=(1-t)h_i^\ast+t r_j^\ast,
\qquad
\dot x_t=r_j^\ast-h_i^\ast,
\]

velocity-matching objective 为

\[
\min_{v_\theta}
\sum_{(h_i^\ast,r_j^\ast)\in P}
\int_0^1
\left\|
(r_j^\ast-h_i^\ast)-v_\theta(x_t,t)
\right\|^2dt.
\]

Inference 从 human latent $x_0=h_i$ 出发，通过 ODE solver 积分得到 robot-space feature：

\[
g_\theta(h_i)=x_1,
\qquad
\frac{dx_t}{dt}=v_\theta(x_t,t).
\]

V1 论文中打印的 interpolation 和 velocity 使用了反向 endpoint，同时又声明 $x_0=h_i$ 并执行 human-to-robot inference。这里采用的公式与论文描述的 inference direction 保持一致。

为什么使用 flow，而不直接 regression $h_i^\ast\mapsto r_j^\ast$？Pseudo-pairs 具有 many-to-many 和 noisy 的特点。Learned velocity field 可以在拟合低成本 distributional transport 的过程中重新连接 crossing assignments。作者的 synthetic illustration 说明，即使个别 pair line 不准确，flow 仍然可以恢复连贯的 source-to-target structure。

Alignment network 是一个三层 hidden layer、每层 width 1,024 的 MLP。训练使用 100 个 discretized time steps、200,000 epochs 和 $5\times10^{-5}$ learning rate，在一张 RTX 4090 上大约需要十分钟。Inference 使用 vanilla Euler solver。

## 5. Shared Human–Robot Policy Learning

完成 alignment 后，TactAlign 训练一个基于 ACT 改造的 shared policy。Human input 包含 aligned fingertip features $\{\hat h_{t,k}\}_{k=1}^K$、human fingertip poses 和 wrist pose；robot input 包含 native robot features $\{r_{t,k}\}_{k=1}^K$ 与 robot proprioception：

\[
\pi_\phi(\{\hat h_{t,k}\},P_t^h,w_t^h)=a_t^h,
\qquad
\pi_\phi(\{r_{t,k}\},P_t^r,w_t^r)=a_t^r.
\]

两种 embodiment 都提供 robot base frame 下的 action chunk supervision。根据任务不同，action 包含 fingertip locations 和 wrist orientation。Policy training 期间 tactile encoders 与 alignment module 保持 frozen，只训练共享 representation 后面的 policy modules。

Action chunk size 为 32。Pivoting、insertion 和 lid closing 以 10 Hz 运行，每次 replanning 分别执行 4、2、8 个 predicted actions。Light-bulb screwing 以 30 Hz 运行，每次执行 12 个 actions，获得更细粒度的控制。Predicted task-space actions 最终通过 inverse kinematics 转为 joint commands。

这个设计把 representation alignment 与 control learning 分开。只在 pivoting 和 insertion 上训练的 flow 可以直接复用到 lid-closing policy，进而测试 tactile semantics 能否迁移到新的 task class。

## 6. 数据与实验设置

Alignment stage 使用 pivoting 和 insertion 的 **200 条 human demonstrations** 与 **100 条 robot demonstrations**。Policy co-training 阶段，pivoting、insertion、lid closing 每项任务有 140–160 条 human demonstrations：其中 100 条（约 30 分钟）使用 robot 也见过的物体，每个额外的 human-only object 有 20 条（约五分钟）。每项任务还有 50 条 robot demonstrations（约 60 分钟），全部使用一个 training object。

物体被分成三类：

- **Seen-by-both：**同时出现在 human 和 robot policy data 中。
- **Human-only：**只出现在 human policy data 中。
- **Unseen-by-both：**完全不参与 policy training。

每个物体进行十次 policy rollouts。Pivoting 和 insertion 参与 alignment training；lid closing 没有参与 alignment 或 encoder training，因此它用于衡量 learned flow 的 cross-task reuse。

Light-bulb experiment 更强调 dexterity：只使用 20 条 human demonstrations，不提供该任务的 robot demonstrations；输入输出包含四个 fingertip positions，wrist 固定；数据采集使用带 OSMO sensing 的 Manus glove。Lamp shade 造成的 occlusion 也让纯视觉或 teleoperation control 更困难。

## 7. 主要结果

### Latent Alignment

Flow alignment 之后，human/robot tactile distributions 之间的 Earth Mover's Distance 从 **0.091 降至 0.020**，下降 **78%**。UMAP visualization 中两种 distribution 几乎重合。Feature magnitude 还会按照 contact strength 呈现一致结构，尽管 encoder 和 alignment training 从未使用 force labels。

### Human–Robot Co-Training

汇总所有 object category 和 task 后，平均成功率如下：

| 方法 | 平均成功率 |
|---|---:|
| Robot only | 38% |
| Human + robot，不输入 tactile | 21% |
| Human + robot，使用 raw unaligned tactile features | 28% |
| **TactAlign** | **79%** |

完整模型在 pivoting、insertion 和 lid closing 上分别达到 **76%**、**72%**、**74%**。按照 object exposure 汇总，seen-by-both objects 为 **100%**，human-only objects 为 **71%**，unseen-by-both objects 为 **65.5%**。

Ablation 说明收益不能简单归结为更多 human trajectories。移除 tactile input 后平均下降 59 个百分点；保留 touch 但移除 alignment 后下降 51 个百分点。Raw cross-sensor latents 会让 shared policy 在同一个 feature slot 中接收语义不兼容的信号，因此经常直接损害学习。

### Human-Only Dexterous Transfer

在 light-bulb screwing 上，TactAlign 完成 **10/10 rollouts**，点亮灯泡平均需要约 61 秒。No-tactile policy 无法建立稳定接触；no-alignment policy 会发生 jamming，有时还会把灯泡完全拧出。两个 baseline 都是 **0/10**。

### 没有 Force Supervision 的 Force Semantics

作者冻结 tactile models，只用 robot latents 训练 force decoder，再把它应用到 aligned human latents。Alignment 使跨 sensor force-prediction error 在三个 force axes 上平均下降约 **96.75%**。其中两个轴已经接近 robot-to-robot baseline，第三个轴仍有较大差距。这个 probe 说明 flow 保留了具有物理意义的 contact structure，作用超出了 task-specific action prediction。

## 8. 这篇论文做得好的地方

第一，论文明确识别出 policy co-training 无法自动解决的 intermediate representation problem。“Without alignment” baseline 尤其关键：当 embodiment-specific semantics 被混在一起时，增加 tactile data 反而会降低性能。

第二，pseudo-pairs 使用普通 demonstration 中可以获得的信息。系统需要估计的 hand/object motion，不需要 force labels、精确 temporal synchronization、CAD models 或 paired sensor readings。Contact filtering 又用很小的额外设计引入了强物理先验。

第三，实验区分了三种 transfer：只在人类数据中出现的新物体、两种数据都没见过的物体，以及 alignment training 没见过的新任务。Human-only light-bulb experiment 进一步覆盖了 scalable human collection 最有价值的场景。

最后，force probe 在 policy loss 之外测试 latent semantics，使 representation alignment 的论证比单独使用 success rate 更完整。

## 9. 局限与开放问题

最大的 external-validity limitation 来自 sensor diversity。实验只覆盖一组 OSMO–Xela pairing，而且两者都属于 magnetic systems。Vision-based tactile sensors、full-palm arrays、多种 robot hands，或物理响应差异更大的 sensing families，可能产生难度更高的 transport problem。

Alignment data 在时间上不配对，但 pseudo-pair construction 依赖 shared task/object conditions、estimated object poses、task-wise normalization 和 nearest-neighbor transition matching。如果 demonstration 来自未知物体、变化的 goal、严重 occlusion 或不准确的 pose estimate，系统还需要额外机制。

每个物体只执行十次 rollout，因此单项百分比仍有较大的统计不确定性。实验使用真实 hardware 和真实物体，但整体范围只有一个 arm–hand platform、三项 co-training tasks 和一项 human-only task。

为处理 OSMO magnetic-skin quadrant 的 sign flip，human signal preprocessing 会取 absolute value。这能消除一种 ambiguity，也可能丢失未来 hardware 或 calibration 可以保留的 directional structure。

TactAlign 处理 tactile 和 proprioceptive discrepancy，没有对齐 human/robot vision，也没有解决所有 kinematic 与 action-space embodiment gaps。未来仍需要在统一 multimodal policy 中联合对齐 vision、touch 和 embodiment。

## Takeaway

TactAlign 可以概括为 **weakly anchored distribution transport**：interaction geometry 提供近似对应，contact state 删除明显错误，rectified flow 把剩余 noisy pairs 转为平滑的 human-to-robot map，shared policy 最后在 aligned space 上学习。

实践层面的结论很直接：只有当 human touch 的语义与 robot sensors 兼容后，它才会成为有效的 robot supervision。79% 的平均成功率、相对 unaligned tactile co-training 的 51 个百分点提升，以及 human-only light-bulb task 的 10/10 成功，说明 representation alignment 对最终 policy 有决定性影响。

</div>
