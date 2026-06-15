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

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**SynManDex** is a synthetic data pipeline for bimanual dexterous grasping and prehensile manipulation. Its central move is a useful staging decision: use generated digital human **pre-grasps** as affordance-aware proposals, then let robot-native optimization decide the final contacts, reachability, and executable trajectory.

The paper avoids treating human hand poses as robot demonstrations. Human priors supply approach direction, wrist orientation, and coarse finger coordination. Robot-specific modules then retarget the proposal to XHand, refine contacts with force-closure optimization, check IK and rollout feasibility, and keep only demonstrations that pass the admission gates. This gives the system a way to preserve human-like functional intent while grounding the final grasp in the target robot's geometry and dynamics.

The numbers are strong for a synthetic-data paper: **86.4%** force-closure success on a 312-object, 25-class grasp-quality manifest, **4.67/5** combined human-likeness, **65.8%** lift-admitted trajectory rate, **80.7%** held-out simulated policy success, and **25/30** real-robot successes on a 36-DoF bimanual UR5e-XHand platform.

## Paper Info

The paper is **"SynManDex: Synthesizing Human-like Dexterous Grasps from Synthetic Human Pre-Grasps"** by **Yanming Shao, Zanxin Chen, Wenwei Lin, Mingjie Zhou, Tianxing Chen, Xiaokang Yang, Yichen Chi, and Yao Mu**, from Shanghai AI Lab, Shanghai Jiao Tong University, Shenzhen University, Fudan University, University of Hong Kong, and ZTE Corporation. The arXiv version is [2606.09798](https://arxiv.org/abs/2606.09798), submitted as v1 on **June 8, 2026**. The project page is [tsunami-kun.github.io/SynManDex](https://tsunami-kun.github.io/SynManDex/).

## The Problem

Dexterous grasping has two constraints that often pull in different directions.

First, a grasp should be **functionally meaningful**. A human holding a camera, flute, bottle, teapot, or phone does not choose contacts only to resist gravity. The hand pose reflects how the object is meant to be used: where the handle is, where the lens faces, which fingers should stabilize, and which side should remain accessible.

Second, a grasp must be **robot-native and physically executable**. Human hands and robot hands differ in joint limits, finger lengths, palm shape, collision geometry, actuation, and reachable wrist poses. Directly retargeting a MANO hand pose can preserve a plausible silhouette while producing missing contacts, object penetration, unreachable wrists, or grasps that slip during lift.

SynManDex is built around this diagnosis. Human hand-object priors are valuable, but their role should be early-stage proposal generation. The final validity tests should happen on the robot embodiment.

## Core Idea: Human Prior as Proposal, Robot Optimizer as Grounding

The pipeline can be summarized as:

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

Here \(M\) is the object mesh, \(h_0\) is a generated digital human pre-grasp, \(q_{init}\) is the retargeted robot seed, \(q^\star\) is the robot-grounded keyframe, and \(\tau\) is the admitted executable trajectory.

The important detail is the admission gate:

$$
A(\tau) = A_{coll} \wedge A_{FC} \wedge A_{IK} \wedge A_{lift}
$$

A sample enters the dataset only after collision, force-closure, inverse kinematics, and lift checks succeed. The human prior guides the search basin; it does not certify the grasp.

## Stage 1: Synthetic Human Pre-Grasps

SynManDex-Human is an object-conditioned diffusion model trained on hand-object interaction resources such as GRAB and ContactPose. The model generates a **single pre-contact frame** ahead of the closed human grasp. For temporal human-object sequences, the authors identify the first contact frame by minimum hand-object distance and supervise a frame **0.2 seconds earlier**. Static grasps are used as pose priors.

This pre-contact choice is subtle and important. A pre-grasp contains approach direction and coarse hand coordination without forcing the robot to reproduce a human contact state. It gives the optimizer a functional basin: this side of the bottle, this orientation of the wrist, this kind of bimanual role assignment.

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

The object mesh is encoded with a point-based representation, and the denoising network predicts digital human pre-grasp parameters.

## Stage 2: Retargeting Human Pre-Grasps to XHand Seeds

After diffusion sampling, the system has a digital human hand seed \(X^H\) with 21 hand keypoints. Human and XHand morphologies differ, so SynManDex retargets to an **open robot pre-grasp**. This preserves the approach and coarse finger arrangement while leaving final contact resolution to the next stage.

The retargeting objective includes five geometric criteria:

- **Motion direction preservation:** local source and target keypoint displacements should point in similar directions.
- **Coverage:** robot keypoints should cover the reachable keypoint space.
- **Flatness:** finite-difference responses should avoid unstable local distortions.
- **Pinch preservation:** human fingertip closeness should map to robot fingertip closeness.
- **Self-collision margin:** the robot seed should avoid obvious self-collision.

The paper writes this compactly as:

$$
L_{GeoRT} =
\lambda_{dir}L_{dir}
+ \lambda_{cov}L_{cov}
+ \lambda_{flat}L_{flat}
+ \lambda_{pinch}L_{pinch}
+ \lambda_{self}L_{self}
$$

Then it solves for wrist pose and joints:

$$
(\theta_0, T_0) =
\arg\min_{\theta,T}
\sum_i \|\bar{x}^H_i - T x^R_i(\theta)\|_2^2
+ \lambda_\psi \|\theta - g_\psi(X^H)\|_2^2
+ \lambda_{self}L_{self}(\theta)
$$

This seed is still only a proposal. Retarget-only outputs often look plausible while missing the load-bearing contact patch.

## Stage 3: Force-Closure Contact Grounding

The robot-native optimizer starts from \(q_{init}\) and refines the wrist-hand configuration:

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

The authors use this as an admission score, with simulation rollout still serving as the executable check. This is the right level of humility: discretized contact models are approximate, so the pipeline still validates with simulation rollout.

The full pipeline strongly improves over the partial variants:

| Method | G1 | Pen. mm | Contact | FC | Combined human-likeness | PCD |
|---|---:|---:|---:|---:|---:|---:|
| SynManDex full | 7.2 | 0.6 | 89.2% | 86.4% | 4.67 | 0.41 |
| Optimization-only | 4.6 | 0.67 | 71.6% | 79.1% | 2.81 | 0.11 |
| Retarget-only | 0.4 | 8.3 | 34.7% | 12.3% | 4.18 | 0.09 |

The comparison is revealing. Retarget-only keeps human-like appearance but loses physical contact. Optimization-only finds stable contacts more often, yet the grasps can look unnatural or task-misaligned. SynManDex combines a human-functional search basin with robot-native contact refinement.

## Stage 4: Execution Admission and Trajectory Data

A grounded floating-hand grasp still needs arms. SynManDex checks arm-hand reachability with cuRobo and rolls out approach, closure, squeeze, and lift phases in simulation. A trajectory is admitted only if it passes a vertical lift test:

$$
y =
\mathbf{1}
\left[
\max_{t \ge t_{lift}}(z_t - z_0) > \tau_z
\right]
$$

The paper reports this funnel under a fixed **240 candidates per object** budget:

| Stage | Pass signal |
|---|---:|
| Grounded keyframes | 86.4% force-closure among optimized XHand candidates |
| IK-valid trajectories | 82.3% IK-valid among grounded candidates |
| Lift-admitted demonstrations | 65.8% lift-admitted among grounded candidates |

This matters because many dexterous grasp papers stop at static grasp pose quality. SynManDex pushes the generated keyframes into executable arm-hand demonstrations, which can then train a policy.

## Policy Learning

The admitted rollouts train a closed-loop point-cloud policy. Each observation is the union of scene geometry and rendered robot proprioceptive points:

$$
P_t = P^{scene}_t \cup P^{robot}_t
$$

The policy predicts a 36-DoF bimanual action chunk with a truncated-normal distribution:

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

At inference, the policy replans in a receding-horizon loop instead of replaying a fixed open-loop trajectory. The architecture uses PointNet++ features and action-query tokens; the input point budget is 2048, chunk size is 16, and control dimension is 36.

The policy ablation is one of the clearest pieces of evidence:

| Configuration | Success | Avg. L2 |
|---|---:|---:|
| Full SynManDex policy | 80.7% | 0.474 |
| No human prior | 37.1% | 0.622 |
| No force closure | 22.9% | 0.893 |
| No pre-validation | 42.9% | 0.561 |
| Scene-only point cloud | 45.7% | 0.539 |
| MLP pooling without action queries | 40.0% | 0.601 |

The policy needs both components: human-prior proposals and robot-native force-closure refinement. Demonstration quality dominates the learning result.

## VLM Agent for Task Specification

SynManDex also uses validated grasp keyframes as an interface to a VLM agent. The VLM receives multi-view renders, object metadata, contact regions, hand-role candidates, admission metrics, and an allowed primitive library. It outputs a JSON task specification with:

- functional goal;
- left/right hand roles;
- object-relative waypoints;
- release conditions;
- terminal success predicates;
- risk flags.

The allowed primitives include maintain-possession, lift, translate, tilt, aim, handover, finger-release, and place/release. The VLM does not command torques or raw joints. It proposes object-relative tasks, and a deterministic executor checks IK, collision, possession, and task success.

This makes the agent useful without letting it bypass physics. Example tasks include teapot pouring proxies, camera aiming proxies, and flute finger-release variants. The flute case is especially illustrative: a stable two-hand support grasp can become multiple finger-release states, which resembles how a human holds an instrument while freeing selected fingers.

## Experiments and Main Results

The evaluation is organized around four questions:

- **RQ1:** Do human pre-grasp priors improve grasp quality and human-likeness?
- **RQ2:** Do robot-native grounding and admission filters improve executable success over taxonomy, optimization, and retargeting baselines?
- **RQ3:** Do admitted trajectories improve closed-loop policy learning?
- **RQ4:** Do keyframes support downstream manipulation, hardware transfer, cross-embodiment seeding, and VLM-generated task proposals?

The main result across baselines is:

| Method | Artifact | Bimanual | Pen. mm | FC | Bench success | IK/lift |
|---|---|---|---:|---:|---:|---:|
| Dexonomy-XHand | pose | no | 4.7 | 42.5% | 36.8% | 28.3% |
| DexGraspNet | pose | no | 3.4 | 54.8% | 46.2% | 33.9% |
| BODex | pose | no | 1.4 | 74.6% | 63.5% | 45.7% |
| UltraDexGrasp | trajectory | yes | 1.9 | 70.8% | 62.1% | 58.6% |
| SynManDex | trajectory | yes | 0.6 | 86.4% | 78.9% | 65.8% |

On real hardware, the policy is evaluated on vase, apple, and spray bottle, ten trials each. The full SynManDex policy succeeds in **25/30** trials, compared with **5/30** for retarget-only data and **11/30** for optimization-only data. The paper reports the main failure modes as rim slip, rotational contact shift, and handle occlusion.

The paper also adds a useful cross-embodiment diagnostic on Shadow Hand. Replacing BODex's standard initialization with a MANO-to-Shadow human seed improves valid grasps from **96/384** to **142/384**, raises FC from **44.3%** to **61.5%**, and reduces penetration from **1.8 mm** to **1.2 mm**. This result supports the claim that human pre-grasp seeds improve contact-basin search beyond XHand, while full cross-embodiment policy transfer remains open.

## Strengths

The strongest idea is the **placement of the human prior**. SynManDex uses digital humans before contact, then hands physical validity to robot-native checks. This avoids two common failure modes: pure optimization can find physically stable but unnatural grasps, while direct retargeting can preserve human shape but fail contact and lift.

The admission chain is also valuable. The paper consistently separates static grasp quality, IK/lift admission, policy success, transition success, and hardware success. That makes the claims easier to interpret than a single "success" number.

The VLM agent is framed carefully. It proposes task specifications over validated keyframes and allowed primitives, then the executor validates them. This is a healthy pattern for combining semantic planning with physical constraints.

## Limitations

The biggest limitation is scope. The real-world benchmark has only three objects and 30 counted trials, with additional functional rollouts shown qualitatively. The results are promising, but they do not yet demonstrate broad real-world dexterous manipulation over many object categories, clutter, deformables, or tools.

The pipeline also depends on many engineered gates: diffusion generation, retargeting calibration, force-closure optimization, IK, lift rollout, point-cloud policy learning, and VLM task proposal validation. This makes it powerful, but reproduction and scaling will require careful infrastructure.

Force closure and lift checks are approximate proxies. The paper acknowledges discretized friction-cone scoring as an admission score, and observed hardware failures include slip and occlusion. Tactile feedback, force sensing, and contact-state estimation would likely matter for harder in-hand and tool-use tasks.

Finally, the cross-embodiment result is a seed diagnostic. Human pre-grasps help initialize Shadow Hand optimization, while morphology-agnostic policy transfer remains open.

## My Takeaway

SynManDex is best read as a data-engineering recipe for dexterous manipulation. It takes a clean stance on human priors: use them to suggest where functional grasps live, then let the robot prove what it can actually execute.

For future VLA or dexterous policy work, this is useful because high-quality demonstrations are often the bottleneck. A model can have a strong policy architecture and still learn poor behavior from unstable, unnatural, or unreachable synthetic grasps. SynManDex shows that synthetic demonstrations become much more valuable when they pass through a staged funnel: human-like proposal, robot-native contact grounding, arm-hand execution admission, and closed-loop policy validation.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**SynManDex** 是一套面向双手灵巧抓取和 prehensile manipulation 的合成数据流水线。它最核心的设计是分阶段处理：先用生成式 digital human **pre-grasps** 给出带 affordance 的候选，再由 robot-native optimization 决定最终接触、可达性和可执行轨迹。

论文没有把人手姿态直接当作机器人示教。human prior 提供 approach direction、wrist orientation 和粗粒度 finger coordination；随后系统把 proposal retarget 到 XHand，用 force-closure optimization 修正接触，再检查 IK 和 rollout feasibility，只保留通过 admission gates 的 demonstration。这样既能保留人类抓取中的功能意图，又能让最终 grasp 符合目标机器人本体的几何和动力学约束。

作为一篇合成数据论文，它的数字很亮眼：在 312 个物体、25 个类别的 grasp-quality manifest 上达到 **86.4%** force-closure success，combined human-likeness 为 **4.67/5**，lift-admitted trajectory rate 为 **65.8%**，held-out simulated policy success 为 **80.7%**，并在 36 自由度双臂 UR5e-XHand 真实平台上完成 **25/30** 次成功。

## 论文信息

论文标题是 **"SynManDex: Synthesizing Human-like Dexterous Grasps from Synthetic Human Pre-Grasps"**，作者为 **Yanming Shao、Zanxin Chen、Wenwei Lin、Mingjie Zhou、Tianxing Chen、Xiaokang Yang、Yichen Chi 和 Yao Mu**，来自 Shanghai AI Lab、上海交通大学、深圳大学、复旦大学、香港大学和中兴通讯。arXiv 链接是 [2606.09798](https://arxiv.org/abs/2606.09798)，v1 提交日期为 **2026 年 6 月 8 日**。项目主页是 [tsunami-kun.github.io/SynManDex](https://tsunami-kun.github.io/SynManDex/)。

## 核心问题

灵巧抓取里有两个经常互相拉扯的要求。

第一，grasp 需要 **功能上合理**。人拿相机、笛子、瓶子、茶壶或手机时，并非只是在找一个能抗重力的接触形态。手的姿态会反映物体用途：把手在哪里，镜头朝向哪里，哪只手负责支撑，哪一面需要留给后续操作。

第二，grasp 必须 **适配机器人本体并可执行**。人手和机器人手在关节限制、手指长度、掌面形状、碰撞几何、驱动方式和 wrist reachability 上都不同。直接把 MANO hand pose retarget 到机器人上，可能外观看起来合理，却出现接触缺失、物体穿透、手腕不可达，或者 lift 时滑落。

SynManDex 正是围绕这个判断设计的。human hand-object prior 很有价值，但更适合作为早期 proposal；最终的有效性测试应当落在机器人本体上。

## 核心思路：Human Prior 负责 Proposal，Robot Optimizer 负责 Grounding

整个流程可以写成：

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

其中 \(M\) 是物体 mesh，\(h_0\) 是生成出来的 digital human pre-grasp，\(q_{init}\) 是 retarget 后的 robot seed，\(q^\star\) 是 robot-grounded keyframe，\(\tau\) 是最终被接收的可执行轨迹。

关键在 admission gate：

$$
A(\tau) = A_{coll} \wedge A_{FC} \wedge A_{IK} \wedge A_{lift}
$$

一个样本只有通过 collision、force-closure、inverse kinematics 和 lift checks 后才会进入数据集。human prior 指引搜索区域；grasp 的有效性由机器人侧验证决定。

## Stage 1：Synthetic Human Pre-Grasps

SynManDex-Human 是一个 object-conditioned diffusion model，训练数据来自 GRAB、ContactPose 等 hand-object interaction 资源。模型生成的是 **single pre-contact frame**，而非闭合后的人手抓取。对于时间序列人-物交互，作者通过最小 hand-object distance 找到 first contact frame，并监督其前 **0.2 秒** 的 frame；静态抓取则作为 pose prior 使用。

这个 pre-contact 选择很关键。pre-grasp 包含 approach direction 和粗粒度手部协调，但不会要求机器人复现人手的最终接触状态。它给优化器提供一个功能性搜索 basin：从瓶子的这一侧接近，wrist 大概这样转，双手角色这样分配。

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

物体 mesh 通过 point-based representation 编码，denoising network 预测 digital human pre-grasp parameters。

## Stage 2：把 Human Pre-Grasps Retarget 到 XHand Seeds

diffusion 采样后，系统得到一个带 21 个 hand keypoints 的 digital human hand seed \(X^H\)。人手和 XHand 形态不同，因此 SynManDex retarget 到的是一个 **open robot pre-grasp**。这个阶段保留 approach 和粗粒度 finger arrangement，把最终接触留给下一阶段。

retargeting objective 包含五类几何约束：

- **Motion direction preservation：** 源 keypoint 和目标 keypoint 的局部位移方向应当相似。
- **Coverage：** robot keypoints 要覆盖可达 keypoint space。
- **Flatness：** finite-difference response 应避免不稳定局部扭曲。
- **Pinch preservation：** 人手 fingertip close 的关系要映射到机器人 fingertip close。
- **Self-collision margin：** robot seed 应避免明显自碰撞。

论文将其写成：

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

这个 seed 仍然只是 proposal。retarget-only 的结果经常外观合理，但缺少真正承重的 contact patch。

## Stage 3：Force-Closure Contact Grounding

robot-native optimizer 从 \(q_{init}\) 出发，细化 wrist-hand configuration：

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

作者把它用作 admission score，而非正式物理保证。这个表述很克制：离散化接触模型毕竟只是近似，所以流水线后面仍然要做 simulation rollout validation。

完整 pipeline 明显优于两个部分版本：

| Method | G1 | Pen. mm | Contact | FC | Combined human-likeness | PCD |
|---|---:|---:|---:|---:|---:|---:|
| SynManDex full | 7.2 | 0.6 | 89.2% | 86.4% | 4.67 | 0.41 |
| Optimization-only | 4.6 | 0.67 | 71.6% | 79.1% | 2.81 | 0.11 |
| Retarget-only | 0.4 | 8.3 | 34.7% | 12.3% | 4.18 | 0.09 |

这个对比很有解释力。retarget-only 能保留人手外观，却丢失物理接触；optimization-only 更容易找到稳定接触，但抓取姿态可能不自然、与任务意图不匹配；SynManDex 把 human-functional search basin 和 robot-native contact refinement 结合起来。

## Stage 4：Execution Admission 和轨迹数据

grounded floating-hand grasp 还需要机械臂可达。SynManDex 用 cuRobo 检查 arm-hand reachability，并在仿真中 rollout approach、closure、squeeze 和 lift 阶段。轨迹只有通过垂直 lift test 后才会被接收：

$$
y =
\mathbf{1}
\left[
\max_{t \ge t_{lift}}(z_t - z_0) > \tau_z
\right]
$$

论文在固定 **每个物体 240 个 candidates** 的预算下报告了这个 funnel：

| Stage | Pass signal |
|---|---:|
| Grounded keyframes | optimized XHand candidates 中 86.4% force-closure |
| IK-valid trajectories | grounded candidates 中 82.3% IK-valid |
| Lift-admitted demonstrations | grounded candidates 中 65.8% lift-admitted |

这点很重要，因为很多 dexterous grasp 论文停在静态 grasp pose quality。SynManDex 把生成的 keyframes 推到可执行 arm-hand demonstrations，后续可以直接训练 policy。

## Policy Learning

被接收的 rollouts 用来训练 closed-loop point-cloud policy。每个 observation 是 scene geometry 和 rendered robot proprioceptive points 的并集：

$$
P_t = P^{scene}_t \cup P^{robot}_t
$$

policy 用 truncated-normal distribution 预测 36-DoF 双手动作 chunk：

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

推理时，policy 采用 receding-horizon loop，避免固定 open-loop replay。架构使用 PointNet++ features 和 action-query tokens；输入点数为 2048，chunk size 为 16，control dimension 为 36。

policy ablation 是论文最清楚的证据之一：

| Configuration | Success | Avg. L2 |
|---|---:|---:|
| Full SynManDex policy | 80.7% | 0.474 |
| No human prior | 37.1% | 0.622 |
| No force closure | 22.9% | 0.893 |
| No pre-validation | 42.9% | 0.561 |
| Scene-only point cloud | 45.7% | 0.539 |
| MLP pooling without action queries | 40.0% | 0.601 |

policy 同时需要 human-prior proposal 和 robot-native force-closure refinement。demonstration quality 是学习结果的核心因素。

## VLM Agent 做任务规格生成

SynManDex 还把 validated grasp keyframes 作为 VLM agent 的接口。VLM 输入 multi-view renders、object metadata、contact regions、hand-role candidates、admission metrics 和 allowed primitive library。它输出一个 JSON task specification，包括：

- functional goal；
- left/right hand roles；
- object-relative waypoints；
- release conditions；
- terminal success predicates；
- risk flags。

allowed primitives 包括 maintain-possession、lift、translate、tilt、aim、handover、finger-release 和 place/release。VLM 不直接输出 torques 或 raw joints。它提出 object-relative tasks，然后由 deterministic executor 检查 IK、collision、possession 和 task success。

这个设计让 agent 有用，同时不绕过物理验证。例子包括 teapot pouring proxy、camera aiming proxy 和 flute finger-release variants。笛子例子很直观：一个稳定双手支撑抓取可以派生出多种 finger-release 状态，类似人类拿乐器时释放部分手指的方式。

## 实验与主要结果

实验围绕四个问题展开：

- **RQ1：** human pre-grasp priors 是否改善 grasp quality 和 human-likeness？
- **RQ2：** robot-native grounding 和 admission filters 是否比 taxonomy、optimization、retargeting baselines 更可执行？
- **RQ3：** admitted trajectories 是否能改善 closed-loop policy learning？
- **RQ4：** keyframes 是否支持下游 manipulation、hardware transfer、cross-embodiment seeding 和 VLM-generated task proposals？

主 baseline 对比是：

| Method | Artifact | Bimanual | Pen. mm | FC | Bench success | IK/lift |
|---|---|---|---:|---:|---:|---:|
| Dexonomy-XHand | pose | no | 4.7 | 42.5% | 36.8% | 28.3% |
| DexGraspNet | pose | no | 3.4 | 54.8% | 46.2% | 33.9% |
| BODex | pose | no | 1.4 | 74.6% | 63.5% | 45.7% |
| UltraDexGrasp | trajectory | yes | 1.9 | 70.8% | 62.1% | 58.6% |
| SynManDex | trajectory | yes | 0.6 | 86.4% | 78.9% | 65.8% |

真实硬件上，policy 在 vase、apple 和 spray bottle 上评测，每个物体 10 次。完整 SynManDex policy 成功 **25/30**，retarget-only data policy 为 **5/30**，optimization-only data policy 为 **11/30**。论文报告的主要失败模式包括 rim slip、contact rotational shift 和 handle occlusion。

论文还做了 Shadow Hand 的 cross-embodiment diagnostic。把 BODex 标准初始化替换成 MANO-to-Shadow human seed 后，valid grasps 从 **96/384** 提升到 **142/384**，FC 从 **44.3%** 提升到 **61.5%**，penetration 从 **1.8 mm** 降到 **1.2 mm**。这还不能说明完整跨 embodiment policy transfer 已解决，但支持 human pre-grasp seeds 对 XHand 之外的 contact-basin search 也有帮助。

## 优点

最强的想法是 **human prior 放置的位置**。SynManDex 在接触前使用 digital humans，然后把物理有效性交给 robot-native checks。这个设计避开了两类常见问题：纯优化容易找到稳定但不自然的 grasp；直接 retargeting 容易保留人手形状，却在 contact 和 lift 上失败。

admission chain 也很有价值。论文持续区分 static grasp quality、IK/lift admission、policy success、transition success 和 hardware success。相比单一的 success 数字，这样更容易理解每个结果到底证明了什么。

VLM agent 的定位也比较健康。它基于 validated keyframes 和 allowed primitives 提出 task specifications，再由 executor 做验证。这是把 semantic planning 和 physical constraints 结合起来的一种稳妥方式。

## 局限

最大的局限是范围。真实实验只有三个物体和 30 次计数 trials，额外的 functional rollouts 主要是 qualitative。结果很有希望，但还没有覆盖大量真实物体类别、杂乱场景、可变形物体或工具使用。

流水线也依赖很多工程化 gates：diffusion generation、retargeting calibration、force-closure optimization、IK、lift rollout、point-cloud policy learning 和 VLM task proposal validation。这让系统很强，但复现和扩展都需要扎实基础设施。

force closure 和 lift checks 仍然是近似代理。论文把 discretized friction-cone scoring 称为 admission score，真实硬件失败中也出现 slip 和 occlusion。更难的 in-hand 和 tool-use tasks 可能需要触觉、力传感和 contact-state estimation。

最后，cross-embodiment 结果属于 seed diagnostic。human pre-grasps 能帮助初始化 Shadow Hand optimization，morphology-agnostic policy transfer 仍然是开放问题。

## 我的理解

SynManDex 最适合被看作一套灵巧操作数据工程 recipe。它对 human prior 的使用方式很清晰：用人类先验建议功能性 grasp 可能在哪里，再让机器人证明自己能执行什么。

这对未来 VLA 或 dexterous policy work 很有价值，因为高质量 demonstration 经常是瓶颈。policy architecture 再强，如果训练数据来自不稳定、不自然或不可达的合成 grasp，也容易学到坏行为。SynManDex 说明，合成 demonstration 需要经过分阶段漏斗：human-like proposal、robot-native contact grounding、arm-hand execution admission，以及 closed-loop policy validation。

</div>
