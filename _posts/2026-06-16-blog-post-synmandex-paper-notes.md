---
title: "[Paper Notes] SynManDex: Synthesizing Human-like Dexterous Grasps"
date: 2026-06-16
permalink: /posts/2026/06/synmandex-paper-notes/
tags:
  - Dexterous Manipulation
  - Robot Learning
  - Human Priors
  - Synthetic Data
  - Grasp Synthesis
  - Paper Notes
---

<div data-lang="en" markdown="1">

## TL;DR

**SynManDex** is a synthetic-data pipeline for bimanual dexterous grasping. Its core argument is simple and useful: let human priors propose where a functional grasp should live, then let the robot embodiment decide whether the grasp can be contacted, reached, lifted, and used for policy learning.

The paper uses generated digital-human **pre-grasps** as affordance-aware proposals. These proposals encode approach direction, wrist orientation, and coarse finger coordination, while robot-native modules retarget them to XHand, refine contacts with force-closure optimization, check arm-hand IK, and admit only demonstrations that survive a lift rollout. The important shift is from human-like pose imitation to executable grounding.

The results make the staging decision credible: **86.4%** force-closure success on a 312-object, 25-class grasp-quality manifest, **4.67/5** combined human-likeness, **65.8%** lift-admitted trajectory rate, **80.7%** held-out simulated policy success, and **25/30** real-robot successes on a 36-DoF bimanual UR5e-XHand platform.

## Paper Info

The paper is **"SynManDex: Synthesizing Human-like Dexterous Grasps from Synthetic Human Pre-Grasps"** by **Yanming Shao, Zanxin Chen, Wenwei Lin, Mingjie Zhou, Tianxing Chen, Xiaokang Yang, Yichen Chi, and Yao Mu**. The arXiv version is [2606.09798](https://arxiv.org/abs/2606.09798), submitted as v1 on **June 8, 2026**. The project page is [tsunami-kun.github.io/SynManDex](https://tsunami-kun.github.io/SynManDex/).

## Core Argument

Dexterous grasping is hard because functional plausibility and robot executability are different filters. A person holding a camera, flute, bottle, teapot, or phone chooses contacts that preserve use: a handle stays accessible, a lens points outward, one hand stabilizes while the other can release or reposition fingers. A robot hand then faces its own geometry, joint limits, palm shape, collision model, actuation, and arm reachability. A MANO-like human pose can look plausible while missing load-bearing contacts, penetrating the object, or putting the wrist outside the robot's reachable set.

SynManDex places the human prior at the proposal stage. The generated human pre-grasp suggests a functional search basin; the robot pipeline resolves the final contact state and rejects samples that fail physical or kinematic checks. I find this the most important design choice in the paper, because it treats human data as a guide to intent while keeping validity tests on the target embodiment.

The whole pipeline can be written compactly as:

$$
h_0 \sim p_\theta(h \mid M)
$$

$$
q_{init} = R_\psi(h_0, M)
$$

$$
q^\star = \Pi_{phys}(q_{init}, M)
$$

$$
\tau = \Pi_{exec}(q^\star, M)
$$

Here \(M\) is the object mesh, \(h_0\) is a generated digital-human pre-grasp, \(q_{init}\) is the retargeted robot seed, \(q^\star\) is the robot-grounded keyframe, and \(\tau\) is the admitted executable trajectory. The admission gate is the real dataset boundary:

$$
A(\tau) = A_{coll} \wedge A_{FC} \wedge A_{IK} \wedge A_{lift}
$$

A sample enters the dataset only after collision, force-closure, inverse-kinematics, and lift checks succeed. This gate is what turns a visually plausible human-inspired grasp into a robot demonstration.

## Method

SynManDex-Human is an object-conditioned diffusion model trained on hand-object interaction resources such as GRAB and ContactPose. Instead of generating the final closed grasp, it generates a **single pre-contact frame**. For temporal human-object sequences, the authors locate the first contact frame by minimum hand-object distance and supervise the frame **0.2 seconds earlier**; static grasps provide pose priors. This pre-contact choice matters because it gives the robot an approach and role assignment without forcing it to reproduce human contact geometry.

The diffusion objective follows the usual DDPM form:

$$
L_{diff} =
\mathbb{E}_{t,h_0,\epsilon}
\left[
\left\|
\epsilon -
\epsilon_\theta(\sqrt{\bar{\alpha}_t}h_0 + \sqrt{1-\bar{\alpha}_t}\epsilon, t, M)
\right\|_2^2
\right]
$$

After diffusion sampling, the system has a digital-human hand seed \(X^H\) with 21 hand keypoints. SynManDex retargets it to an **open XHand pre-grasp**, preserving motion direction, coverage, local flatness, pinch relations, and self-collision margins:

$$
L_{GeoRT} =
\lambda_{dir}L_{dir}
+ \lambda_{cov}L_{cov}
+ \lambda_{flat}L_{flat}
+ \lambda_{pinch}L_{pinch}
+ \lambda_{self}L_{self}
$$

It then solves for wrist pose and joints:

$$
(\theta_0, T_0) =
\arg\min_{\theta,T}
\sum_i \|\bar{x}^H_i - T x^R_i(\theta)\|_2^2
+ \lambda_\psi \|\theta - g_\psi(X^H)\|_2^2
+ \lambda_{self}L_{self}(\theta)
$$

This retargeted seed is deliberately incomplete. It serves as the starting point for a robot-native module that refines the wrist-hand configuration:

$$
q^\star =
\arg\min_q
w_c C_{coll}(q)
+ w_f L_{FC}(q)
+ w_r \|q - q_{init}\|^2
$$

The force-closure score is based on a discretized friction-cone wrench margin:

$$
Q_{FC}(q) =
\min_{\|w\|_2=1}
\max_{f \in F(q), \|f\|_1 \le 1}
w^\top G(q)f
$$

The paper uses this score as an admission signal, with simulation rollout still serving as the execution check. That separation is important: a discretized contact model can guide contact search, while lift rollout tests whether the grasp survives the dynamics the policy will later imitate.

The ablation table captures the method's main claim:

| Method | G1 | Pen. mm | Contact | FC | Combined human-likeness | PCD |
|---|---:|---:|---:|---:|---:|---:|
| SynManDex full | 7.2 | 0.6 | 89.2% | 86.4% | 4.67 | 0.41 |
| Optimization-only | 4.6 | 0.67 | 71.6% | 79.1% | 2.81 | 0.11 |
| Retarget-only | 0.4 | 8.3 | 34.7% | 12.3% | 4.18 | 0.09 |

Retarget-only preserves the human silhouette and loses contact quality. Optimization-only improves contact and stability while reducing human-likeness. The full pipeline keeps the human-functional basin and adds robot-grounded contact refinement.

Grounded floating-hand grasps still need arms. SynManDex checks arm-hand reachability with cuRobo and rolls out approach, closure, squeeze, and lift phases in simulation. A trajectory is admitted only if it passes a vertical lift test:

$$
y =
\mathbf{1}
\left[
\max_{t \ge t_{lift}}(z_t - z_0) > \tau_z
\right]
$$

Under a fixed **240 candidates per object** budget, the funnel looks like this:

| Stage | Pass signal |
|---|---:|
| Grounded keyframes | 86.4% force-closure among optimized XHand candidates |
| IK-valid trajectories | 82.3% IK-valid among grounded candidates |
| Lift-admitted demonstrations | 65.8% lift-admitted among grounded candidates |

This is where SynManDex becomes more than a static grasp generator. The admitted rollouts train a closed-loop point-cloud policy whose observation is the union of scene geometry and rendered robot proprioceptive points:

$$
P_t = P^{scene}_t \cup P^{robot}_t
$$

The policy predicts a 36-DoF bimanual action chunk with a truncated-normal distribution and is trained by negative log-likelihood:

$$
p_\phi(a_{t:t+H-1} \mid P_t)
=
\prod_{\tau=0}^{H-1}
\text{TN}(a_{t+\tau}; \mu_{t+\tau}, \sigma_{t+\tau}, a_{min}, a_{max})
$$

The training loss is negative log-likelihood:

$$
L_{policy} =
-\sum_{\tau=0}^{H-1}
\log p_\phi(a_{t+\tau} \mid P_t)
$$

At inference, the policy replans in a receding-horizon loop. The architecture uses PointNet++ features and action-query tokens; the input point budget is 2048, chunk size is 16, and control dimension is 36.

The policy ablation shows that demonstration quality dominates the learning result:

| Configuration | Success | Avg. L2 |
|---|---:|---:|
| Full SynManDex policy | 80.7% | 0.474 |
| No human prior | 37.1% | 0.622 |
| No force closure | 22.9% | 0.893 |
| No pre-validation | 42.9% | 0.561 |
| Scene-only point cloud | 45.7% | 0.539 |
| MLP pooling without action queries | 40.0% | 0.601 |

SynManDex also uses validated keyframes as an interface to a VLM agent. The VLM sees multi-view renders, object metadata, contact regions, hand-role candidates, admission metrics, and an allowed primitive library, then emits a JSON task specification with functional goals, hand roles, object-relative waypoints, release conditions, terminal predicates, and risk flags. The executor still checks IK, collision, possession, and task success. This keeps semantic planning attached to a physically vetted grasp state.

## Experiments and Main Results

The main benchmark compares SynManDex with pose-only and trajectory-generation baselines:

| Method | Artifact | Bimanual | Pen. mm | FC | Bench success | IK/lift |
|---|---|---|---:|---:|---:|---:|
| Dexonomy-XHand | pose | no | 4.7 | 42.5% | 36.8% | 28.3% |
| DexGraspNet | pose | no | 3.4 | 54.8% | 46.2% | 33.9% |
| BODex | pose | no | 1.4 | 74.6% | 63.5% | 45.7% |
| UltraDexGrasp | trajectory | yes | 1.9 | 70.8% | 62.1% | 58.6% |
| SynManDex | trajectory | yes | 0.6 | 86.4% | 78.9% | 65.8% |

On real hardware, the policy is evaluated on vase, apple, and spray bottle, ten trials each. The full SynManDex policy succeeds in **25/30** trials, compared with **5/30** for retarget-only data and **11/30** for optimization-only data. The main reported failure modes are rim slip, rotational contact shift, and handle occlusion. The paper also includes a Shadow Hand diagnostic: replacing BODex's standard initialization with a MANO-to-Shadow human seed improves valid grasps from **96/384** to **142/384**, raises FC from **44.3%** to **61.5%**, and reduces penetration from **1.8 mm** to **1.2 mm**. That result supports the broader value of human pre-grasp seeds, while full morphology-agnostic policy transfer remains open.

## Limitations

The largest limitation is scope. The real-world benchmark has three objects and 30 counted trials, with additional functional rollouts shown qualitatively. The results are promising, while broad real-world dexterous manipulation across many object categories, cluttered scenes, deformables, or tool-use tasks remains unproven.

The system is also infrastructure-heavy. Diffusion generation, retargeting calibration, force-closure optimization, IK, lift rollout, point-cloud policy learning, and VLM task validation all contribute to the final result. This is a strength for data quality and a cost for reproduction. Force closure and lift checks are approximate proxies, and the hardware failures suggest that tactile feedback, force sensing, and contact-state estimation would matter for harder manipulation settings.

## Takeaway

SynManDex is best read as a data-engineering recipe for dexterous manipulation. It gives human priors a precise job: propose functional grasp basins. It gives the robot embodiment the final authority: contact grounding, reachability, lift admission, and policy validation.

For future VLA or dexterous policy work, the practical message is that synthetic demonstrations need a validity funnel. A strong policy architecture can still learn poor behavior from unstable, unnatural, or unreachable grasps. SynManDex shows how to turn synthetic human priors into more useful robot data by passing them through human-like proposal, robot-native contact grounding, arm-hand execution admission, and closed-loop policy validation.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

**SynManDex** 是一套面向双手灵巧抓取的合成数据流水线。它的核心论点很清楚：用人类先验提出功能性 grasp 可能在哪里，再由机器人本体判断这个 grasp 是否能接触、可达、可 lift，并最终用于 policy learning。

论文使用生成式 digital-human **pre-grasps** 作为带 affordance 的 proposal。这些 proposal 编码 approach direction、wrist orientation 和粗粒度 finger coordination；机器人侧模块再把它们 retarget 到 XHand，用 force-closure optimization 修正接触，检查 arm-hand IK，并只接收通过 lift rollout 的 demonstration。关键变化是从 human-like pose imitation 转向 executable grounding。

结果让这个分阶段设计很有说服力：在 312 个物体、25 个类别的 grasp-quality manifest 上达到 **86.4%** force-closure success，combined human-likeness 为 **4.67/5**，lift-admitted trajectory rate 为 **65.8%**，held-out simulated policy success 为 **80.7%**，并在 36 自由度双臂 UR5e-XHand 真实平台上完成 **25/30** 次成功。

## 论文信息

论文标题是 **"SynManDex: Synthesizing Human-like Dexterous Grasps from Synthetic Human Pre-Grasps"**，作者为 **Yanming Shao、Zanxin Chen、Wenwei Lin、Mingjie Zhou、Tianxing Chen、Xiaokang Yang、Yichen Chi 和 Yao Mu**。arXiv 链接是 [2606.09798](https://arxiv.org/abs/2606.09798)，v1 提交日期为 **2026 年 6 月 8 日**。项目主页是 [tsunami-kun.github.io/SynManDex](https://tsunami-kun.github.io/SynManDex/)。

## 核心论点

灵巧抓取的难点在于，功能合理性和机器人可执行性是两道不同的筛选。人拿相机、笛子、瓶子、茶壶或手机时，会保留物体的使用方式：把手要可接近，镜头要朝外，一只手负责支撑，另一只手可能释放或重新布置手指。机器人手还要面对自己的几何、关节限制、掌面形状、碰撞模型、驱动方式和机械臂可达性。一个 MANO 式人手姿态可以看起来很合理，却缺少承重接触、穿透物体，或者把 wrist 放在机器人达不到的位置。

SynManDex 把 human prior 放在 proposal 阶段。生成的人类 pre-grasp 提供一个功能性的搜索 basin；机器人流水线负责确定最终接触状态，并拒绝物理或运动学检查失败的样本。我认为这是全文最重要的设计，因为它把人类数据用于表达 intent，同时把有效性判断留给目标本体。

整个流程可以简写为：

$$
h_0 \sim p_\theta(h \mid M)
$$

$$
q_{init} = R_\psi(h_0, M)
$$

$$
q^\star = \Pi_{phys}(q_{init}, M)
$$

$$
\tau = \Pi_{exec}(q^\star, M)
$$

其中 \(M\) 是物体 mesh，\(h_0\) 是生成出来的 digital-human pre-grasp，\(q_{init}\) 是 retarget 后的 robot seed，\(q^\star\) 是 robot-grounded keyframe，\(\tau\) 是最终被接收的可执行轨迹。真正的数据边界是 admission gate：

$$
A(\tau) = A_{coll} \wedge A_{FC} \wedge A_{IK} \wedge A_{lift}
$$

一个样本只有通过 collision、force-closure、inverse-kinematics 和 lift checks 后才会进入数据集。这道 gate 把视觉上合理的人类启发式 grasp 变成机器人 demonstration。

## 方法

SynManDex-Human 是一个 object-conditioned diffusion model，训练数据来自 GRAB、ContactPose 等 hand-object interaction 资源。它生成的是 **single pre-contact frame**。对于时间序列人-物交互，作者通过最小 hand-object distance 找到 first contact frame，并监督其前 **0.2 秒** 的 frame；静态抓取则作为 pose prior。这个 pre-contact 选择很关键，因为它给机器人提供 approach 和 hand-role assignment，同时避免要求机器人复现人手最终接触几何。

diffusion objective 是标准 DDPM 形式：

$$
L_{diff} =
\mathbb{E}_{t,h_0,\epsilon}
\left[
\left\|
\epsilon -
\epsilon_\theta(\sqrt{\bar{\alpha}_t}h_0 + \sqrt{1-\bar{\alpha}_t}\epsilon, t, M)
\right\|_2^2
\right]
$$

diffusion 采样后，系统得到一个带 21 个 hand keypoints 的 digital-human hand seed \(X^H\)。SynManDex 把它 retarget 到 **open XHand pre-grasp**，同时保留 motion direction、coverage、local flatness、pinch relation 和 self-collision margin：

$$
L_{GeoRT} =
\lambda_{dir}L_{dir}
+ \lambda_{cov}L_{cov}
+ \lambda_{flat}L_{flat}
+ \lambda_{pinch}L_{pinch}
+ \lambda_{self}L_{self}
$$

随后求解 wrist pose 和 joints：

$$
(\theta_0, T_0) =
\arg\min_{\theta,T}
\sum_i \|\bar{x}^H_i - T x^R_i(\theta)\|_2^2
+ \lambda_\psi \|\theta - g_\psi(X^H)\|_2^2
+ \lambda_{self}L_{self}(\theta)
$$

这个 retargeted seed 的定位很明确：它是 robot-native refinement 的起点。下一步用 robot-native objective 细化 wrist-hand configuration：

$$
q^\star =
\arg\min_q
w_c C_{coll}(q)
+ w_f L_{FC}(q)
+ w_r \|q - q_{init}\|^2
$$

force-closure score 基于 discretized friction-cone wrench margin：

$$
Q_{FC}(q) =
\min_{\|w\|_2=1}
\max_{f \in F(q), \|f\|_1 \le 1}
w^\top G(q)f
$$

论文把这个 score 用作 admission signal，并继续用 simulation rollout 作为 execution check。这个拆分很重要：离散化接触模型可以引导 contact search，而 lift rollout 检查这个 grasp 是否能经受后续 policy imitation 面对的动力学。

ablation 表很好地概括了方法主张：

| Method | G1 | Pen. mm | Contact | FC | Combined human-likeness | PCD |
|---|---:|---:|---:|---:|---:|---:|
| SynManDex full | 7.2 | 0.6 | 89.2% | 86.4% | 4.67 | 0.41 |
| Optimization-only | 4.6 | 0.67 | 71.6% | 79.1% | 2.81 | 0.11 |
| Retarget-only | 0.4 | 8.3 | 34.7% | 12.3% | 4.18 | 0.09 |

retarget-only 保留人手轮廓，但 contact quality 很差。optimization-only 改善接触和稳定性，同时牺牲 human-likeness。完整 pipeline 保留 human-functional basin，并加入 robot-grounded contact refinement。

grounded floating-hand grasp 还需要机械臂可达。SynManDex 用 cuRobo 检查 arm-hand reachability，并在仿真中 rollout approach、closure、squeeze 和 lift 阶段。轨迹只有通过垂直 lift test 后才会被接收：

$$
y =
\mathbf{1}
\left[
\max_{t \ge t_{lift}}(z_t - z_0) > \tau_z
\right]
$$

在固定 **每个物体 240 个 candidates** 的预算下，这个 funnel 如下：

| Stage | Pass signal |
|---|---:|
| Grounded keyframes | optimized XHand candidates 中 86.4% force-closure |
| IK-valid trajectories | grounded candidates 中 82.3% IK-valid |
| Lift-admitted demonstrations | grounded candidates 中 65.8% lift-admitted |

这让 SynManDex 超出静态 grasp generator 的范围。被接收的 rollouts 用来训练 closed-loop point-cloud policy；每个 observation 是 scene geometry 和 rendered robot proprioceptive points 的并集：

$$
P_t = P^{scene}_t \cup P^{robot}_t
$$

policy 用 truncated-normal distribution 预测 36-DoF 双手动作 chunk，并通过 negative log-likelihood 训练：

$$
p_\phi(a_{t:t+H-1} \mid P_t)
=
\prod_{\tau=0}^{H-1}
\text{TN}(a_{t+\tau}; \mu_{t+\tau}, \sigma_{t+\tau}, a_{min}, a_{max})
$$

训练 loss 是 negative log-likelihood：

$$
L_{policy} =
-\sum_{\tau=0}^{H-1}
\log p_\phi(a_{t+\tau} \mid P_t)
$$

推理时，policy 采用 receding-horizon loop。架构使用 PointNet++ features 和 action-query tokens；输入点数为 2048，chunk size 为 16，control dimension 为 36。

policy ablation 说明 demonstration quality 对学习结果非常关键：

| Configuration | Success | Avg. L2 |
|---|---:|---:|
| Full SynManDex policy | 80.7% | 0.474 |
| No human prior | 37.1% | 0.622 |
| No force closure | 22.9% | 0.893 |
| No pre-validation | 42.9% | 0.561 |
| Scene-only point cloud | 45.7% | 0.539 |
| MLP pooling without action queries | 40.0% | 0.601 |

SynManDex 还把 validated keyframes 作为 VLM agent 的接口。VLM 输入 multi-view renders、object metadata、contact regions、hand-role candidates、admission metrics 和 allowed primitive library，然后输出包含 functional goal、hand roles、object-relative waypoints、release conditions、terminal predicates 和 risk flags 的 JSON task specification。executor 仍然检查 IK、collision、possession 和 task success。这样 semantic planning 会被绑定在一个已经物理筛选过的 grasp state 上。

## 实验与主要结果

主 benchmark 将 SynManDex 与 pose-only 和 trajectory-generation baselines 对比：

| Method | Artifact | Bimanual | Pen. mm | FC | Bench success | IK/lift |
|---|---|---|---:|---:|---:|---:|
| Dexonomy-XHand | pose | no | 4.7 | 42.5% | 36.8% | 28.3% |
| DexGraspNet | pose | no | 3.4 | 54.8% | 46.2% | 33.9% |
| BODex | pose | no | 1.4 | 74.6% | 63.5% | 45.7% |
| UltraDexGrasp | trajectory | yes | 1.9 | 70.8% | 62.1% | 58.6% |
| SynManDex | trajectory | yes | 0.6 | 86.4% | 78.9% | 65.8% |

真实硬件上，policy 在 vase、apple 和 spray bottle 上评测，每个物体 10 次。完整 SynManDex policy 成功 **25/30**，retarget-only data policy 为 **5/30**，optimization-only data policy 为 **11/30**。论文报告的主要失败模式包括 rim slip、contact rotational shift 和 handle occlusion。论文还做了 Shadow Hand 的 cross-embodiment diagnostic：把 BODex 标准初始化替换成 MANO-to-Shadow human seed 后，valid grasps 从 **96/384** 提升到 **142/384**，FC 从 **44.3%** 提升到 **61.5%**，penetration 从 **1.8 mm** 降到 **1.2 mm**。这支持 human pre-grasp seeds 的广泛价值，同时完整的 morphology-agnostic policy transfer 仍然是开放问题。

## 局限

最大的局限是范围。真实实验只有三个物体和 30 次计数 trials，额外的 functional rollouts 主要是 qualitative。结果很有希望，但还没有建立起对大量真实物体类别、杂乱场景、可变形物体或工具使用的广泛覆盖。

系统也很依赖基础设施。diffusion generation、retargeting calibration、force-closure optimization、IK、lift rollout、point-cloud policy learning 和 VLM task validation 都会影响最终结果。这对数据质量是优势，对复现是成本。force closure 和 lift checks 仍然是近似代理，硬件失败也提示更难的 manipulation setting 可能需要触觉、力传感和 contact-state estimation。

## Takeaway

SynManDex 最适合被看作一套灵巧操作数据工程 recipe。它给 human prior 一个明确职责：提出功能性 grasp basin。它也给 robot embodiment 最终裁决权：contact grounding、reachability、lift admission 和 policy validation。

对未来 VLA 或 dexterous policy work 来说，实际启发是 synthetic demonstrations 需要一条 validity funnel。policy architecture 再强，如果训练数据来自不稳定、不自然或不可达的 grasp，也容易学到坏行为。SynManDex 展示了怎样把 synthetic human priors 变成更有用的机器人数据：human-like proposal、robot-native contact grounding、arm-hand execution admission，以及 closed-loop policy validation。

</div>
