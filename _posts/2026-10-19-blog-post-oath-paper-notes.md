---
title: "[Paper Notes] OATH: Object-Agnostic Tracking for Dexterous Hands, Enabling Rapid Physics-based Retargeting"
date: 2026-10-19
permalink: /posts/2026/10/oath-paper-notes/
tags:
  - Dexterous Manipulation
  - Motion Retargeting
  - Residual Policy Learning
  - Contact Representation
  - Reinforcement Learning
  - Paper Notes
---

<div id="oath-en" data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

A hand can match the joint angles of a human-derived reference and still fail to hold the object. **OATH** learns the joint offsets needed to turn that reference into a physically feasible grasp. Its most useful design choice is a contact-error representation: for each hand body, the policy sees the displacement between a reference point attached to the object and its corresponding point attached to the hand. A single residual policy then handles new trajectories and held-out object geometries.

On DexYCB, the selected model achieves **58% success on held-out trajectories and 54% on unseen objects**, with reported object tracking errors of 15.3 and 13.8 mm. Simulation rollout takes **0.40 seconds per second of reference motion**. Hardware experiments replay the synthesized trajectories open-loop; they establish physical plausibility without measuring the same closed-loop success rates on a real robot.

## Paper and source version

**Solvin Sigurdson, Prasanna Sriganesh, Juan Borbon, Joel Burdick, Dingqi Zhang, and Jiuguang Wang**, affiliated with Multiply Labs, Caltech, and Carnegie Mellon University. These notes follow [arXiv:2610.14379v1](https://arxiv.org/abs/2610.14379v1), submitted October 9, 2026. Sources: [eight-page PDF](https://arxiv.org/pdf/2610.14379v1) and [official project page](https://multiplylabs.github.io/oath/). The manuscript is an arXiv preprint; all experimental numbers below are author-reported.

## 1. The residual supplies what a pose reference leaves unresolved

OATH starts with a kinematic robot trajectory and an object trajectory. At step $k$, the policy predicts a residual $\delta_k$ conditioned on the reference $r_k$ and current observations $o_k$:

$$
\delta_k\sim\pi(\delta_k\mid r_k,o_k),\qquad
u_k=\bar q_k^{\mathrm{robot}}+\delta_k.
$$

The low-level controller tracks the joint command $u_k$. The bar marks a reference quantity. Executing this policy in a physics simulator produces a dynamically retargeted trajectory $q_k^*$. The reference supplies the intended motion; the learned correction adjusts the commanded configuration so contact can support the object through that motion. Joint targets may need to push against a constrained finger to generate force, which geometric pose matching alone leaves unresolved.

The tested embodiment has **26 actuated joints: a six-DoF UR5e arm and a 20-DoF Wuji 2 hand**. Arm residuals also change wrist pose, so the correction can coordinate the arm and fingers. The study concentrates on dexterous grasping for pick-and-place motions.

## 2. Contact correspondence becomes a state-dependent error

The reference pipeline first uses **TopoRetarget** to transfer interactions from the human MANO mesh to the robot hand. It replays the resulting hand and object poses kinematically in MuJoCo, with dynamics disabled, and reads collisions at zero margin. Touching or penetrating the object activates a contact slot. Multiple contacts on one hand body are reduced to their centroid.

For each of **16 bodies**—the palm and three bodies per finger—the pipeline stores a contact-presence flag $\bar m_{k,i}$ and two local coordinates: $\bar g_{k,i}$ in the object frame and $\bar h_{k,i}$ in hand-body $i$'s frame. Inactive slots have a zero flag and zero coordinates. Differential inverse kinematics supplies the arm motion, and Time-Optimal Path Parameterization adjusts timing under joint velocity, acceleration, and torque constraints. The resulting reference contains motion targets and contact correspondences.

At runtime, the policy input includes the following vector, Equation 5 of the paper:

$$
e_{k,i}=
\left(p_{k,o}+R_{k,o}\bar g_{k,i}\right)
-\left(p_{k,i}+R_{k,i}\bar h_{k,i}\right).
$$

Here $(p_{k,o},R_{k,o})$ is the **current** world pose of the object, and $(p_{k,i},R_{k,i})$ is the current pose of the corresponding hand body. The two reference points move with their respective bodies. Their world-coordinate difference tells the policy how far, and in which direction, the intended contact pair has separated.

For example, if an object slips while a finger remains near its reference joint angles, the object-attached point moves away from the hand-attached point. The contact-error vector exposes that mismatch even when joint tracking looks satisfactory. This example is an interpretation of the equation, not a separate slip-recovery experiment reported by the authors.

The representation has a fixed size across object geometries. A mug handle and a bottle surface both supply local contact targets for the same hand-body slots. “Object-agnostic” therefore refers to **reuse of a policy across objects**. The pipeline still needs object pose and geometry to construct the references and evaluate these errors; it does not remove the state-estimation problem.

The network also receives robot state, joint velocity, wrist state, the previous residual, and reference motion. The nominal reference horizon is one second sampled every 0.1 seconds. Table I reports 497 input dimensions and 26 action dimensions, with MLP widths of 512, 256, and 128; the method text describes temporal convolution followed by the MLP. The best-performing configuration later replaces the future object-pose window with the current object reference.

## 3. Learning contact behavior with a tracking reward

Contact error enters the **observation**. The stated tracking reward uses five other distances: object position, object orientation, hand joint angles, wrist position, and wrist orientation:

$$
R_{k,\mathrm{track}}=\prod_j\exp(-\beta_j d_{j,k}).
$$

Position distances are Euclidean; orientation error is $\sin^2(\theta/2)$; joint error is the per-joint RMS. The multiplicative form makes a large error in one component suppress the whole tracking reward. Additional terms penalize residual changes and arm residual magnitude:

$$
R_{k,\mathrm{rate}}=-w_{\mathrm{rate}}\sum_j s_j(\delta_{k,j}-\delta_{k-1,j})^2,
\qquad
R_{k,\mathrm{arm}}=-\frac{w_{\mathrm{arm}}}{n_{\mathrm{arm}}}
\sum_{j\in\mathrm{arm}}\delta_{k,j}^2.
$$

The scale factors $s_j$ normalize the action-rate penalty across joints. The arm penalty decays to zero over the first 10,000 iterations, limiting disruptive shoulder exploration early in training. There is no explicit contact-force target in this reward; the policy learns useful actuation through simulated interaction and tracking feedback.

Training uses PPO with MuJoCo through mjlab, **16,384 parallel environments**, a 30 Hz policy, and 120 Hz physics. Each iteration gathers 24 steps per environment. The 15,000-iteration run totals approximately **5.9 billion environment steps and ten hours on four L40S GPUs**. This cost is paid before the fast retargeting rollout.

Episodes last up to five seconds and terminate when object position error exceeds 15 cm. Reference State Initialization samples a start frame anywhere in a clip, including mid-grasp, places the arm, hand, and object at the corresponding reference poses, and resets velocities and the previous residual to zero. Physical properties are randomized once per environment at startup; observation noise is sampled every control step. Those choices matter when reproducing the training distribution.

## 4. Read success, speed, and ablations together

The dataset contains **340 DexYCB trajectories across 20 objects**. Mustard bottle, mug, bowl, and power drill are held out completely. The remaining 276 trajectories are split 80/20 into training and testing sets. After time parameterization, the average clip lasts 5.82 seconds.

Table II defines success as bringing the object within **10 cm of its goal position**. The separate object tracking error measures trajectory accuracy; a sub-2 cm reported error should not be read as a 2 cm success threshold.

| Method / split | Success | Object tracking error | Compute seconds per reference second |
|---|---:|---:|---:|
| SPIDER | 22.0% | 29.9 mm | 25.2 |
| DAID | 100% | 20.4 mm | 138 |
| ReGrind | 5.4% | 43.2 mm | 0.93 |
| CHORD | 2.0% | 7.9 mm | 0.88 |
| OATH training | 90% | 11.7 mm | 0.40 |
| OATH testing | 58% | 15.3 mm | 0.40 |
| OATH unseen objects | 54% | 13.8 mm | 0.40 |

The baselines use 50 randomly selected trajectories from the dataset. DAID generates its own kinematic references, while the other baselines use the supplied references. Compute figures are normalized to RTX 5080 processing speeds because every evaluation could not run serially on the same machine. These conditions limit an interpretation of the table as a controlled comparison of controller architecture alone.

OATH trades some of DAID's success for much faster rollout. The rounded table values imply roughly **63×** and **345×** lower compute than SPIDER and DAID. The paper describes rollout as 2.4× faster than real time. End-to-end processing also includes approximately **four seconds of kinematic retargeting plus 2.3 seconds of rollout per average clip**, reported as about 6.5 seconds overall. A faster-than-real-time rollout does not establish the same throughput for the complete pipeline.

The observation ablation in Table III is more revealing about the mechanism:

| Reference / observation variant | Training success | Testing success | Unseen success |
|---|---:|---:|---:|
| All listed terms | 89% | 53% | 46% |
| Remove contact flag and contact error | 69% | 31% | 38% |
| Remove robot reference window | 89% | 47% | 52% |
| Use current robot reference instead of its window | 89% | 56% | 52% |
| Use current object reference instead of its window | 90% | 58% | 54% |

Removing contact inputs from the all-terms row reduces success by **20, 22, and 8 percentage points**. The paper's prose gives drops of 21, 27, and 16 points, which correspond to comparison against the selected best row. Keeping that distinction avoids attributing the entire best-model gap to one controlled removal. Both comparisons support the usefulness of contact information, while additional future poses offer little benefit in these experiments. Table II uses the selected best configuration.

## 5. Reference quality sets a practical limit

The paper illustrates fingers penetrating the table, spurious approach contacts, missing grasp contacts, and floating object references that fall when physics starts. These failures expose a dependence on the reference construction: a policy guided toward the wrong contact can receive a precise error signal for an unhelpful target.

Hardware trials use **open-loop joint playback** on the UR5e and Wuji 2. Figure 7 shows four held-out trajectories, including the unseen mug. The authors identify contact slip and calibration offsets as sources of accumulating error and leave tactile or visual feedback for more reliable execution. The real-robot evidence is qualitative; the 58% and 54% success figures belong to simulation.

My main takeaway is that contact correspondence is a useful interface between demonstration processing and control. For a system that already has object geometry, object state, and reasonable grasp references, I would first test this compact error signal before adding a more elaborate geometry encoder. If contact references are incomplete or wrong, improving their extraction becomes the more urgent experiment. The present evidence covers grasping across a small set of held-out household objects; broader dynamic manipulation remains an open test.

</div>

<div id="oath-zh" data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，可使用页面顶部导航栏的语言按钮。

## TL;DR

机械手即使准确跟踪由人类示范生成的关节角，也可能抓不住物体。**OATH** 学习参考关节位置上的残差，让几何动作产生维持抓取所需的物理交互。其中最值得关注的是接触误差表示：针对每个手部刚体，计算物体上的参考接触点与手部对应点之间的位移，再将其输入策略。一个统一的残差策略由此迁移到新轨迹和训练中未见过的物体。

在 DexYCB 上，选出的模型对**留出轨迹和未见物体分别达到 58% 与 54% 成功率**，物体跟踪误差分别为 15.3 和 13.8 mm。仿真 rollout 每处理一秒参考动作需要 **0.40 秒计算时间**。硬件实验采用生成轨迹的开环回放，展示了物理可执行性；论文没有报告与仿真对应的实机闭环成功率。

## 论文与阅读版本

作者为 **Solvin Sigurdson、Prasanna Sriganesh、Juan Borbon、Joel Burdick、Dingqi Zhang 和 Jiuguang Wang**，来自 Multiply Labs、加州理工学院和卡内基梅隆大学。本文依据 2026 年 10 月 9 日提交的 [arXiv:2610.14379v1](https://arxiv.org/abs/2610.14379v1)。资料入口：[八页论文 PDF](https://arxiv.org/pdf/2610.14379v1)、[官方项目主页](https://multiplylabs.github.io/oath/)。当前阅读版本为 arXiv 预印本，下文实验数字均来自作者报告。

## 1. 用残差补上位姿参考未解决的接触控制

OATH 的输入包含机械手臂的运动学参考轨迹与物体轨迹。在时刻 $k$，策略根据参考 $r_k$ 和当前观测 $o_k$ 输出残差 $\delta_k$：

$$
\delta_k\sim\pi(\delta_k\mid r_k,o_k),\qquad
u_k=\bar q_k^{\mathrm{robot}}+\delta_k.
$$

底层控制器跟踪关节指令 $u_k$，上划线表示参考量。将策略放入物理仿真器执行，就得到经过动力学重定向的轨迹 $q_k^*$。参考轨迹给出动作意图，学习到的修正调整目标关节配置，使接触能够在运动过程中支撑物体。手指受到物体阻挡时，关节目标仍可能需要继续向内偏移才能产生作用力，单纯匹配几何姿态没有解决这一点。

实验平台共 **26 个驱动关节：UR5e 机械臂的 6 个自由度，以及 Wuji 2 灵巧手的 20 个自由度**。机械臂残差会改变手腕位姿，因此策略可以同时修正手臂和手指。论文主要研究用于抓取搬运的多指抓握动作。

## 2. 把接触对应关系转成随状态变化的误差

参考生成首先使用 **TopoRetarget**，将人类 MANO 网格上的交互关系迁移到机器人手部。随后在 MuJoCo 中固定每帧的手部与物体位姿，关闭动力学，以零碰撞边距读取接触。接触或穿透物体都会激活对应槽位，同一手部刚体上的多个接触则归并为质心。

系统为 **16 个刚体**保存参考：手掌加上每根手指的三个刚体。每个槽位包含接触标志 $\bar m_{k,i}$，以及物体坐标系内的点 $\bar g_{k,i}$ 和手部刚体 $i$ 坐标系内的点 $\bar h_{k,i}$。未激活槽位的标志和坐标均置零。差分逆运动学生成机械臂轨迹，Time-Optimal Path Parameterization 再依据关节速度、加速度和力矩约束调整时间。最终参考同时提供运动目标与接触对应关系。

运行时，策略接收论文公式 5 定义的向量：

$$
e_{k,i}=
\left(p_{k,o}+R_{k,o}\bar g_{k,i}\right)
-\left(p_{k,i}+R_{k,i}\bar h_{k,i}\right).
$$

其中 $(p_{k,o},R_{k,o})$ 是物体的**当前**世界位姿，$(p_{k,i},R_{k,i})$ 是对应手部刚体的当前位姿。两个参考点分别附着在各自刚体上，再用当前状态变换到世界坐标系。两者之差告诉策略：预期接触点之间偏离了多远，以及偏离的方向。

例如，手指仍接近参考关节角，但物体发生滑动时，物体上的点会离开手部对应点。接触误差因而能暴露关节跟踪误差较小时仍然存在的交互偏差。这个例子是对公式机制的解释，论文没有单独报告一项对应的滑移恢复实验。

不同物体共享固定大小的表示。杯柄与瓶身都可以为相同的手部槽位提供局部接触目标。因此，object-agnostic 指的是**策略能够跨物体复用**。参考构造和误差计算仍依赖物体几何与位姿，实际部署还需要解决状态估计。

网络还接收机器人状态、关节速度、手腕状态、上一步残差和参考运动。默认参考窗口覆盖未来一秒，每隔 0.1 秒采样。表 I 给出 497 维输入、26 维动作，以及 512、256、128 的 MLP 隐藏层宽度；方法正文描述的网络为时序卷积后接 MLP。后面的实验选出一个更好的配置，用当前物体参考替代未来物体位姿窗口。

## 3. 接触信息进入观测，奖励仍围绕跟踪

接触误差属于**观测输入**。论文的跟踪奖励使用另外五类距离：物体位置、物体姿态、手部关节角、手腕位置和手腕姿态：

$$
R_{k,\mathrm{track}}=\prod_j\exp(-\beta_j d_{j,k}).
$$

位置采用欧氏距离，姿态误差为 $\sin^2(\theta/2)$，关节角采用逐关节 RMS 误差。乘积形式使某一项较大的误差压低整体奖励。系统另加残差变化与机械臂残差幅值惩罚：

$$
R_{k,\mathrm{rate}}=-w_{\mathrm{rate}}\sum_j s_j(\delta_{k,j}-\delta_{k-1,j})^2,
\qquad
R_{k,\mathrm{arm}}=-\frac{w_{\mathrm{arm}}}{n_{\mathrm{arm}}}
\sum_{j\in\mathrm{arm}}\delta_{k,j}^2.
$$

$s_j$ 根据关节残差尺度归一化动作变化惩罚。机械臂幅值惩罚在前 10,000 次迭代中逐渐降到零，避免训练初期肩关节探索引起过大的手腕偏移。上述奖励没有显式的接触力目标；策略通过仿真交互和跟踪反馈学习有效的驱动方式。

训练使用 PPO，通过 mjlab 运行 MuJoCo，设有 **16,384 个并行环境**，策略频率 30 Hz，物理频率 120 Hz。每次迭代从每个环境采集 24 步，15,000 次迭代合计约 **59 亿环境步，在四张 L40S 上训练约十小时**。快速重定向的前提是先支付这笔训练成本。

每个 episode 最长五秒，物体位置误差超过 15 cm 时提前终止。Reference State Initialization 从整段参考中随机抽取起始帧，因此可以从抓握中途开始；手臂、手部和物体被放置到对应参考位姿，速度与上一动作残差清零。物理参数在环境启动时随机化一次，观测噪声则每个控制步重采样。复现实验时，这些细节直接影响训练状态分布。

## 4. 把成功率、速度和消融放在一起看

数据包含 **20 个物体的 340 条 DexYCB 轨迹**。芥末瓶、杯子、碗和电钻完全不参与训练，其余 276 条轨迹按 80/20 划分训练与测试。时间参数化后的平均轨迹长度为 5.82 秒。

表 II 将成功定义为物体到达**目标位置 10 cm 范围内**。物体跟踪误差是另一项轨迹精度指标，报告的低于 2 cm 误差不能理解成成功判定采用 2 cm 阈值。

| 方法 / 数据划分 | 成功率 | 物体跟踪误差 | 每秒参考动作的计算秒数 |
|---|---:|---:|---:|
| SPIDER | 22.0% | 29.9 mm | 25.2 |
| DAID | 100% | 20.4 mm | 138 |
| ReGrind | 5.4% | 43.2 mm | 0.93 |
| CHORD | 2.0% | 7.9 mm | 0.88 |
| OATH 训练集 | 90% | 11.7 mm | 0.40 |
| OATH 测试集 | 58% | 15.3 mm | 0.40 |
| OATH 未见物体 | 54% | 13.8 mm | 0.40 |

基线在数据集中随机选取的 50 条轨迹上评估。DAID 使用自己的运动学重定向，其他基线使用提供的参考。由于无法让所有评估依次在同一机器上运行，计算耗时归一化到 RTX 5080 的处理速度。参考生成与运行条件存在差异，因此这张表不能单独隔离控制器结构的贡献。

OATH 以低于 DAID 的成功率换取更快的 rollout。按表中四舍五入后的数字计算，相比 SPIDER 和 DAID，计算耗时分别约降低 **63 倍与 345 倍**。论文将 rollout 速度描述为实时的 2.4 倍。完整流程还需要平均约**四秒运动学重定向，加上 2.3 秒策略 rollout**，作者报告每段约 6.5 秒。仅 rollout 超过实时速度，并不意味着完整处理链路达到相同吞吐。

表 III 的观测消融更能说明方法为何有效：

| 参考 / 观测配置 | 训练成功率 | 测试成功率 | 未见物体成功率 |
|---|---:|---:|---:|
| 保留表中全部项 | 89% | 53% | 46% |
| 移除接触标志与接触误差 | 69% | 31% | 38% |
| 移除机器人参考窗口 | 89% | 47% | 52% |
| 用当前机器人参考替代其窗口 | 89% | 56% | 52% |
| 用当前物体参考替代其窗口 | 90% | 58% | 54% |

以全部项这一行为基准，移除接触输入使成功率下降 **20、22、8 个百分点**。正文写出的 21、27、16 个百分点，对应的是与选出的最佳行比较。区分这两种基准，可以避免把最佳模型的全部差距归因于一次严格控制变量的移除实验。两种比较都支持接触信息的作用，而额外未来位姿在这些实验中的收益有限。表 II 使用的是选出的最佳配置。

## 5. 参考质量决定了方法的实际边界

论文展示的失败包括手指穿入桌面、接近物体时出现伪接触、抓握阶段缺失接触参考，以及悬空物体在启动物理仿真后掉落。这些案例说明了参考构造的影响：如果目标接触本身有误，策略可能得到一个计算准确却没有帮助的误差信号。

实机实验在 UR5e 与 Wuji 2 上采用**关节轨迹开环回放**。图 7 展示四条留出轨迹，其中杯子属于未见物体。作者指出，接触滑移与标定误差会累积，需要触觉或视觉反馈提高执行可靠性。实机证据以定性演示为主，58% 和 54% 成功率均来自仿真。

我认为最值得迁移的是把接触对应关系作为示范处理与控制之间的接口。对于已有物体几何、状态估计和合理抓握参考的系统，我会优先测试这种紧凑的误差信号，再考虑更复杂的几何编码器。如果接触参考缺失或错误，改进参考提取应当优先。当前证据覆盖少量留出日常物体上的抓握，能否扩展到更动态的操作仍需要实验。

</div>
