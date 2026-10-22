---
title: "[Paper Notes] DONIC: Generalist Dexterous Bimanual Tracking Control from Human Demonstrations"
date: 2026-10-23
permalink: /posts/2026/10/donic-paper-notes/
tags:
  - Dexterous Manipulation
  - Bimanual Manipulation
  - Human Demonstrations
  - Motion Retargeting
  - Reinforcement Learning
  - Paper Notes
---

<div id="donic-en" data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

A bimanual reference can ask one hand to support an object while the other releases and repositions. Learning that motion requires useful feedback for each hand, including when its partner fails. **DONIC** combines object tracking with contact rewards assigned to each hand's reference role, then trains a shared policy using PPO and verified successful demonstrations. Clip-Centered Advantages (CCA) remove a reference-specific mean from the policy's learning signal.

The public-data model reaches **86.79% success on unseen trajectories and 57.32% on unseen objects**. These numbers measure reference tracking in simulation. The interesting research question is how much of the improvement comes from the reward, the executable demonstration library, and the way heterogeneous trajectories share policy updates.

## Paper and source version

**DONIC: Generalist Dexterous Bimanual Tracking Control from Human Demonstrations**, by **Mingze Sun, Ziang Cao, Yuan Fei, Qiankuan Tao, Zihan Wang, Tianqi Liu, Junhao Chen, Haiwen Diao, Fangzhou Hong, Zhaoxi Chen, and Ziwei Liu**, all affiliated with Ropedia. These notes follow [arXiv:2610.29997v1](https://arxiv.org/abs/2610.29997v1), submitted October 21, 2026, and its [26-page PDF](https://arxiv.org/pdf/2610.29997v1). The authors provide an [official project page](https://ropedia.github.io/DONIC/). All numerical results below are author-reported; the final research suggestions are my interpretation.

![DONIC training overview: reconstructed references, a shared bimanual policy, verified demonstrations, and the three learning signals.](/images/donic/donic-training-overview.png)

*Figure 2 from Sun et al., DONIC, arXiv:2610.29997v1, p. 6, cropped from the PDF; [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The demonstration library receives verified executions from specialists and the shared policy.*

## 1. The policy corrects a supplied motion reference

DONIC receives trajectories for both robot hands and the object. Each simulated Wuji Hand V1 has six wrist coordinates and twenty finger joints, giving a **52-dimensional action** for the pair. The 3,016-dimensional observation includes proprioception, object pose and velocity, upcoming reference targets, tracking errors, fingertip-to-object vectors, and an object descriptor with 128 basis-point-set features. Forty contact-force channels are zeroed; simulated forces are used in the reward.

At each step, the policy outputs bounded corrections around the next reference configuration:

$$
\mathbf q_t^{\mathrm{pd}}
=\operatorname{clamp}\left(
\hat{\mathbf q}_{t+1}+\mathbf s\odot\mathbf a_t,
\mathbf q_{\min},\mathbf q_{\max}\right),
\qquad \mathbf a_t\in[-1,1]^{52}.
$$

The PD controller executes this target. Corrections are re-anchored to the reference every step and do not accumulate. Their bounds are 0.1 m for wrist translation, 1.0 rad for wrist rotation, and 0.15 rad for finger joints ([Appendix C.1](https://arxiv.org/html/2610.29997v1#A3.SS1)).

This defines the scope of the generalist: one checkpoint tracks new supplied references across objects and motions without further training. The interface still requires reference construction, object geometry, and state estimates. It also models wrist motion through six virtual coordinates, so deploying on a complete arm-hand system introduces additional kinematic and control constraints.

## 2. Give object motion and each hand a usable reward

The object reward multiplies agreement in position, orientation, and linear velocity:

$$
r_t^{\mathrm{obj}}
=e^{-\kappa_p\|\mathbf p_t^o-\hat{\mathbf p}_t^o\|_2}
e^{-\kappa_R d_{SO(3)}(R_t^o,\hat R_t^o)}
e^{-\kappa_v\|\mathbf v_t^o-\hat{\mathbf v}_t^o\|_2}.
$$

This term remains active independently of the contact gate. Velocity agreement penalizes holding the object stationary while the reference moves. The coefficients are $(\kappa_p,\kappa_R,\kappa_v)=(9,2,14)$, with distances in metres and velocities in metres per second.

Contact supervision starts from a reference-defined set $\mathcal C_t^h$: the fingertips of hand $h$ that should contact the object at time $t$. A simulated fingertip counts as contacting when its net contact force exceeds 0.5 N **and** its distance to the object surface is below 3 cm:

$$
\alpha_{i,t}^h
=\mathbf 1[f_{i,t}^h>0.5\,\mathrm N]\,
\mathbf 1[\delta_{i,t}^h<0.03\,\mathrm m].
$$

For each required fingertip, the contact reward mixes a smooth proximity term with this binary indicator, using equal weights. A separate hold reward measures the fraction of required fingertips currently in contact. It permits sliding and rolling: instantaneous contact coverage does not impose a no-slip constraint. Net force also cannot identify which body caused a collision, so the distance check improves contact attribution while remaining a proxy.

The aggregation across hands is especially useful. Define $\mathcal E_t=\lbrace h:\mathcal C_t^h\neq\varnothing\rbrace$. For either contact-related reward $u$,

$$
r_t^u=
\frac{\sum_{h\in\mathcal E_t}w_h r_t^{u,h}}
{\sum_{h\in\mathcal E_t}w_h},
\quad \mathcal E_t\neq\varnothing,
$$

and set it to zero when no hand is required to contact. The implementation fixes $w_L=0.5$ and $w_R=1$. A hand scheduled to release contributes no contact reward; if both hands should engage and one fails, the other still supplies feedback. The full reward adds hand tracking, object tracking, contact acquisition, and contact coverage with coefficients $(0.25,0.45,0.15,0.15)$, then multiplies the sum by $1+w_L$ ([Section 4.3 and Appendix C.2](https://arxiv.org/html/2610.29997v1#S4.SS3)).

## 3. CCA changes the comparison within each reference

PPO batches mix trajectories with different contact patterns and difficulty. The authors argue that unequal critic accuracy can leave reference-dependent offsets in GAE advantages. A relatively useful transition in a difficult clip may then receive a negative advantage along with the rest of that clip.

CCA groups on-policy transitions by **reference clip identity**. Multiple parallel environments executing the same reference contribute to the same group $\mathcal G_m$. After ordinary GAE, it computes

$$
\bar A_m=\frac{1}{|\mathcal G_m|}
\sum_{j\in\mathcal G_m}A_j^{\mathrm{GAE}},
\qquad
\widetilde A_j=A_j^{\mathrm{GAE}}-\bar A_{m(j)}.
$$

As an illustrative calculation, advantages $\lbrack -8,-6,-4\rbrack$ become $\lbrack -2,0,2\rbrack$. The best transition in that group now has a positive learning signal, while every pairwise difference is preserved. This example explains the mean subtraction; it is not an experimental result.

CCA subtracts only the group mean. There is no division by a per-clip standard deviation, and the critic's regression targets remain unchanged. The centered values enter the usual clipped PPO actor loss. Appendix C.3 explicitly cautions that these algebraic properties do not establish an unbiased policy-gradient estimator. I read CCA as a practical adjustment for joint training whose value should be tested against critic quality, group size, and sampling balance.

## 4. Successful robot executions supply the BC targets

The human recordings first become geometric references. BiHOI contributes **1,575 sequences, 229 objects, and 14.77 hours**, captured with 32 RGB cameras. Its 65.91% simultaneous-contact rate uses frames with at least one hand in contact as the denominator. Multi-view reconstruction estimates hand motion, object geometry, and object pose; kinematic fitting maps the hands to the robot. Appendix B.2 states that joint reconstruction refinement has no explicit contact or collision loss.

Open-loop replay with zero policy correction screens references before training. Immediate object loss and ejection are excluded; contact without lifting and partially executed references remain eligible because feedback could recover them. Trajectory-specific policies then seek executable versions of these references. Successful rollouts must pass replay verification before entering the demonstration library, and verified successes of the shared policy are added later. Verification checks object displacement and lifting when required; the benchmark uses a separate tracking-fidelity criterion.

The actor objective is

$$
\mathcal L_{\mathrm{actor}}(\theta)
=\mathcal L_{\mathrm{PPO}}(\theta;\widetilde A)
+\lambda_{\mathrm{BC}}
\mathbb E_{(\mathbf o^D,\mathbf a^D)\sim\mathcal D}
\left\|\mu_\theta(\mathbf o^D)-\mathbf a^D\right\|_2^2.
$$

BC regresses the policy mean toward verified **robot actions paired with their execution states**. Demonstration samples use a separate budget and do not enter PPO's importance ratio or GAE. This distinction explains why directly cloning retargeted human poses would omit part of DONIC's training signal.

The reported recipe uses Isaac Gym with 8,192 parallel environments, separate actor and critic MLPs of widths $\lbrack 1024,1024,1024,512\rbrack$, and Adam at $2\times10^{-5}$. Each rollout spans 64 steps; PPO uses minibatches of 16,384 and six passes. BC uses 4,096 pairs per minibatch with $\lambda_{\mathrm{BC}}=50$. Adaptive recovery sampling and object-position perturbation curricula are disabled ([Appendices C.4–C.5](https://arxiv.org/html/2610.29997v1#A3.SS4)).

## 5. Read the success rate together with its thresholds

The public-data training pool contains 1,845 clips from GRAB, GigaHands, OakInk2, TACO, and H2O. Adding BiHOI raises it to 3,420. Evaluation reserves **53 unseen trajectories of training objects** and **164 clips involving held-out objects**; these references are excluded from policy training, specialist training, and demonstration collection.

| Method | Unseen trajectory SR | Unseen object SR | Unseen object Comp |
|---|---:|---:|---:|
| DexTrack-bi | 0.00% | 0.00% | 0.88% |
| Dexplore-bi | 9.43% | 11.59% | 26.37% |
| DONIC without CCA | 81.13% | 48.17% | 43.89% |
| DONIC without contact gate | 81.13% | 48.78% | 49.52% |
| DONIC | 86.79% | 57.32% | 54.69% |
| DONIC + BiHOI | 88.68% | 59.76% | 55.35% |

*Selected columns from Table 2. Each method uses one checkpoint across both splits, without fine-tuning. The two baselines are adaptations of released single-hand tracking systems to the bimanual interface.*

For each trajectory, SR requires **both hands** to pass the following tests on trajectory-averaged errors:

$$
\frac{T_o+T_h}{2}\leq10\,\mathrm{cm},
\qquad
\frac{R_o+R_h}{2}\leq60^\circ,
\qquad
E_{\mathrm{finger}}\leq40^\circ.
$$

Comp applies the same tests frame by frame and averages the valid-frame fraction across trajectories. A valid frame after an earlier violation still counts. Consequently, SR can be substantially higher than Comp: DONIC's unseen-trajectory values are 86.79% and 67.62%. These metrics assess tracking fidelity under the specified tolerances; task completion such as successfully fastening or assembling an object would need its own test.

Object error also gives context. DONIC's unseen-object translation error is **15.74 cm**, falling to **13.96 cm** with BiHOI. The success test averages object and wrist errors, so a successful trajectory need not keep object error alone below 10 cm.

The ablations isolate narrower changes than their labels might suggest. Removing CCA costs 9.15 percentage points of unseen-object SR. Removing the contact gate costs 8.54 points, but Appendix D.4 defines this as deleting the **3 cm proximity condition** from the contact proxy while retaining the force test, object reward, and reward weights. It does not ablate the entire object-centered per-hand reward. Adding BiHOI improves unseen-object SR by 2.44 points; the experiment adds data volume and diversity together.

## 6. What I would reuse and what I would test next

I would first reuse the separation between object-motion feedback and reference-dependent hand contact roles. It offers a direct way to train asymmetric coordination without suppressing one hand's progress when its partner fails. CCA is a small additional experiment once the observation-action interface and verified demonstration pipeline work.

The large baseline gap does not by itself attribute the gain to either component. A reproduction should hold the demonstration library and interaction budget fixed, then compare the full per-hand reward against alternatives and CCA against batch-wide centering. That would help distinguish improved exploration, better imitation targets, and a better policy update.

The manuscript's quantitative scope is reference-conditioned tracking of a single rigid object in simulation. **Figure 1 does show real-world evaluation examples**; the reported held-out success rates remain simulation results, and the text does not provide a matching quantitative hardware benchmark. Held-out operation-category generalization, unconstrained goal-conditioned manipulation, and broader multi-object interaction remain outside the reported quantitative evaluation ([Appendix D.6](https://arxiv.org/html/2610.29997v1#A4.SS6)). For hardware use, the next evidence I would want is tracking and task success under measured state-estimation error, physical arm constraints, and repeated contact disturbances.

</div>

<div id="donic-zh" data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言按钮切换 **English / 中文**。

## TL;DR

一段双手操作参考可能要求左手托住物体，右手松开并重新调整位置。学习这种动作时，每只手都需要获得有用的反馈，包括另一只手暂时失败的时候。**DONIC** 将物体轨迹奖励与按参考角色分配的单手接触奖励结合，再通过 PPO 和经过验证的成功执行示范训练共享策略。Clip-Centered Advantages（CCA）则从策略学习信号中减去每条参考片段对应的均值。

仅使用公开数据训练的模型，在**未见轨迹上达到 86.79% 成功率，在未见物体上达到 57.32%**。这些数字衡量的是仿真中的参考轨迹跟踪。我更关心的问题是：奖励设计、可执行示范库，以及多种轨迹共享策略更新的方式，分别贡献了多少提升。

## 论文与版本

**DONIC: Generalist Dexterous Bimanual Tracking Control from Human Demonstrations**，作者为 **Mingze Sun、Ziang Cao、Yuan Fei、Qiankuan Tao、Zihan Wang、Tianqi Liu、Junhao Chen、Haiwen Diao、Fangzhou Hong、Zhaoxi Chen 和 Ziwei Liu**，均来自 Ropedia。本文依据 2026 年 10 月 21 日提交的 [arXiv:2610.29997v1](https://arxiv.org/abs/2610.29997v1) 及其 [26 页 PDF](https://arxiv.org/pdf/2610.29997v1)，另附作者的[项目主页](https://ropedia.github.io/DONIC/)。下文实验数字均为论文报告，最后的研究建议属于我的理解。

![DONIC 训练流程：重建参考轨迹、共享双手策略、验证后的执行示范，以及三类学习信号。](/images/donic/donic-training-overview.png)

*图源：Sun 等，DONIC，arXiv:2610.29997v1，第 6 页图 2，由 PDF 裁出，遵循 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。示范库同时接收专用策略与共享策略经过验证的成功执行。*

## 1. 策略修正一条已经给定的动作参考

DONIC 的输入包含双手机器人与物体的参考轨迹。仿真中的每只 Wuji Hand V1 有 6 个手腕坐标和 20 个手指关节，双手合计输出 **52 维动作**。3,016 维观测包含本体状态、物体位姿与速度、即将到来的参考目标、跟踪误差、指尖到物体的向量，以及包含 128 维 basis-point-set 特征的物体描述。40 个接触力通道被置零，仿真接触力用于奖励计算。

每一步，策略围绕下一帧参考构型输出有界修正：

$$
\mathbf q_t^{\mathrm{pd}}
=\operatorname{clamp}\left(
\hat{\mathbf q}_{t+1}+\mathbf s\odot\mathbf a_t,
\mathbf q_{\min},\mathbf q_{\max}\right),
\qquad \mathbf a_t\in[-1,1]^{52}.
$$

PD 控制器执行这个目标。修正量每步重新以参考动作为基准，不跨时间累加。手腕平移、手腕旋转和手指关节的修正边界分别为 0.1 m、1.0 rad 和 0.15 rad（[附录 C.1](https://arxiv.org/html/2610.29997v1#A3.SS1)）。

这里的通用性有明确范围：同一个 checkpoint 无需重新训练，就能跟踪新物体和新动作的给定参考。接口仍然依赖参考构建、物体几何与状态估计。手腕运动采用 6 个虚拟坐标建模，因此部署到完整的机械臂与灵巧手系统，还需要处理机械臂的运动学与控制约束。

## 2. 让物体运动与每只手都提供有效奖励

物体奖励将位置、姿态和线速度的一致性相乘：

$$
r_t^{\mathrm{obj}}
=e^{-\kappa_p\|\mathbf p_t^o-\hat{\mathbf p}_t^o\|_2}
e^{-\kappa_R d_{SO(3)}(R_t^o,\hat R_t^o)}
e^{-\kappa_v\|\mathbf v_t^o-\hat{\mathbf v}_t^o\|_2}.
$$

这个奖励项独立于接触门控，持续提供物体运动反馈。速度项会惩罚“参考已经移动，物体仍停在原地”的解。系数为 $(\kappa_p,\kappa_R,\kappa_v)=(9,2,14)$，距离以米计，速度以米每秒计。

接触监督从参考定义的集合 $\mathcal C_t^h$ 开始：它表示时刻 $t$，手 $h$ 应该接触物体的那些指尖。只有当某个仿真指尖的净接触力超过 0.5 N，**并且**到物体表面的距离小于 3 cm，才将其计为接触：

$$
\alpha_{i,t}^h
=\mathbf 1[f_{i,t}^h>0.5\,\mathrm N]\,
\mathbf 1[\delta_{i,t}^h<0.03\,\mathrm m].
$$

对每个需要接触的指尖，contact 奖励等权混合平滑的距离项与这个二值指标。另一个 hold 奖励统计所需指尖中当前已经接触的比例。这里允许滑动和滚动，因为瞬时接触覆盖率并不施加无滑动约束。净接触力也无法直接识别碰撞对象，因此距离条件改善了接触归属判断，但仍然只是近似指标。

双手之间的聚合方式尤其值得关注。令 $\mathcal E_t=\lbrace h:\mathcal C_t^h\neq\varnothing\rbrace$，对于 contact 或 hold 奖励 $u$，有

$$
r_t^u=
\frac{\sum_{h\in\mathcal E_t}w_h r_t^{u,h}}
{\sum_{h\in\mathcal E_t}w_h},
\quad \mathcal E_t\neq\varnothing.
$$

当没有任何手需要接触时，将其设为零。实现中固定 $w_L=0.5$、$w_R=1$。参考要求松开的手不贡献接触奖励；当两只手都应该参与，但其中一只失败时，另一只仍然能提供反馈。完整奖励将手部跟踪、物体跟踪、接触建立和接触覆盖按 $(0.25,0.45,0.15,0.15)$ 加权相加，再乘以 $1+w_L$（[第 4.3 节与附录 C.2](https://arxiv.org/html/2610.29997v1#S4.SS3)）。

## 3. CCA 调整同一参考片段内部的比较基准

一个 PPO batch 会混合接触模式和难度不同的轨迹。作者认为，critic 在不同参考上的估计精度不一致，会使 GAE advantage 带有依赖参考的整体偏移。于是，一条困难轨迹中相对有用的 transition，也可能和整条轨迹一起得到负 advantage。

CCA 按**参考片段身份**对 on-policy transition 分组。多个并行环境执行同一条参考时，它们属于同一个集合 $\mathcal G_m$。完成普通 GAE 计算后，再执行：

$$
\bar A_m=\frac{1}{|\mathcal G_m|}
\sum_{j\in\mathcal G_m}A_j^{\mathrm{GAE}},
\qquad
\widetilde A_j=A_j^{\mathrm{GAE}}-\bar A_{m(j)}.
$$

举一个算术例子：$\lbrack -8,-6,-4\rbrack$ 会变成 $\lbrack -2,0,2\rbrack$。组内最好的 transition 现在获得正的学习信号，而任意两个 transition 的 advantage 差值保持不变。这个例子用于解释减均值操作，不是论文中的实验结果。

CCA 只减去组均值，不除以每条片段的标准差，critic 的回归目标也保持不变。中心化后的数值进入常规的 clipped PPO actor loss。附录 C.3 明确指出，这些代数性质本身并不能证明策略梯度估计无偏。我的理解是，CCA 是一种服务于联合训练的实用调整，其效果仍应结合 critic 精度、分组样本量和采样平衡来检验。

## 4. BC 学习的是成功执行过的机器人动作

人类录像首先被转换成几何参考。BiHOI 包含 **1,575 段序列、229 个物体、14.77 小时交互**，由 32 台 RGB 相机采集。其 65.91% 双手同时接触比例，以“至少一只手接触”的帧数作为分母。多视角重建得到手部运动、物体几何与位姿，再通过运动学拟合映射到机器人。附录 B.2 说明，联合重建优化没有显式的接触或碰撞损失。

训练前，系统用零策略修正的开环回放筛选参考。立即丢失物体和物体弹飞的序列被排除；已经接触但未抬起，以及只完成部分动作的序列仍可保留，因为反馈控制可能修复这些失败。随后，逐轨迹专用策略尝试生成可执行版本。成功 rollout 还要通过回放验证才能进入示范库；共享策略后来产生的成功执行也会补充进去。入库验证检查物体位移，以及参考要求时的抬升；基准评估另有轨迹保真度标准。

Actor 的目标为

$$
\mathcal L_{\mathrm{actor}}(\theta)
=\mathcal L_{\mathrm{PPO}}(\theta;\widetilde A)
+\lambda_{\mathrm{BC}}
\mathbb E_{(\mathbf o^D,\mathbf a^D)\sim\mathcal D}
\left\|\mu_\theta(\mathbf o^D)-\mathbf a^D\right\|_2^2.
$$

BC 将策略均值回归到经过验证的**机器人动作，以及动作执行时配对的状态**。示范使用独立的采样预算，不进入 PPO 的重要性比率或 GAE。因此，直接克隆重定向后的人手姿态，会缺少 DONIC 训练信号中来自实际成功执行的部分。

论文使用 Isaac Gym 的 8,192 个并行环境，actor 与 critic 分别采用宽度为 $\lbrack 1024,1024,1024,512\rbrack$ 的 MLP，Adam 学习率为 $2\times10^{-5}$。每次 rollout 包含 64 步，PPO minibatch 为 16,384，更新六轮；BC 每个 minibatch 采样 4,096 对数据，$\lambda_{\mathrm{BC}}=50$。自适应恢复采样与物体位置扰动课程均关闭（[附录 C.4–C.5](https://arxiv.org/html/2610.29997v1#A3.SS4)）。

## 5. 成功率需要与判定阈值一起阅读

公开训练池包含来自 GRAB、GigaHands、OakInk2、TACO 和 H2O 的 1,845 段参考；加入 BiHOI 后增至 3,420 段。评估保留了**训练物体上的 53 条未见轨迹**，以及**涉及未见物体的 164 段序列**。这些评估参考均不参与策略训练、专用策略训练或示范收集。

| 方法 | 未见轨迹 SR | 未见物体 SR | 未见物体 Comp |
|---|---:|---:|---:|
| DexTrack-bi | 0.00% | 0.00% | 0.88% |
| Dexplore-bi | 9.43% | 11.59% | 26.37% |
| DONIC 去掉 CCA | 81.13% | 48.17% | 43.89% |
| DONIC 去掉 contact gate | 81.13% | 48.78% | 49.52% |
| DONIC | 86.79% | 57.32% | 54.69% |
| DONIC + BiHOI | 88.68% | 59.76% | 55.35% |

*摘自表 2。每种方法均使用同一个 checkpoint 评估两个划分，无需微调。两个基线均由已发布的单手跟踪系统适配到双手接口。*

对于每条轨迹，SR 要求**两只手分别**在轨迹平均误差上满足：

$$
\frac{T_o+T_h}{2}\leq10\,\mathrm{cm},
\qquad
\frac{R_o+R_h}{2}\leq60^\circ,
\qquad
E_{\mathrm{finger}}\leq40^\circ.
$$

Comp 将相同条件逐帧判断，再对每条轨迹的合格帧比例求平均。即使前面某帧失败，后续合格帧仍然计入。因此，SR 可以明显高于 Comp：DONIC 在未见轨迹上的两个数值分别为 86.79% 和 67.62%。这些指标评估指定容差下的跟踪保真度；若要判断拧紧或装配等任务是否真正完成，还需要任务自身的成功条件。

物体误差提供了另一个观察角度。DONIC 在未见物体上的平移误差为 **15.74 cm**，加入 BiHOI 后降至 **13.96 cm**。成功判定将物体与手腕误差取平均，所以一条成功轨迹并不保证物体误差单独低于 10 cm。

消融实验的改动范围也需要读准确。去掉 CCA 后，未见物体 SR 降低 9.15 个百分点；去掉 contact gate 后降低 8.54 个百分点。但附录 D.4 将后一个改动定义为删除接触近似指标中的 **3 cm 距离条件**，保留力阈值、物体奖励和奖励权重。它没有消融整套以物体为中心的单手奖励。加入 BiHOI 带来 2.44 个百分点的未见物体 SR 提升，这个实验同时增加了数据量与多样性。

## 6. 我会复用什么，以及接下来验证什么

我会优先复用物体运动反馈与参考手部接触角色的分离。这为不对称双手协作提供了直接的训练方式，也避免其中一只手失败时压掉另一只手的进展。等观测动作接口和成功示范流程运行起来，CCA 可以作为一个成本较小的附加实验。

巨大的基线差距本身，还无法把提升归因于其中某个模块。复现时，我会固定示范库与环境交互预算，再分别比较完整单手奖励与其他设计，以及 CCA 与全 batch 中心化。这样才能更清楚地判断：提升来自探索、模仿目标的质量，还是策略更新方式。

论文的定量实验范围是仿真中的单刚体、参考条件轨迹跟踪。**图 1 确实展示了真机评估示例**；文中未见轨迹与未见物体的成功率仍来自仿真，正文没有提供对应的定量真机基准。未见操作类别泛化、无约束的目标条件操作，以及更广泛的多物体交互，都超出了已报告的定量评估范围（[附录 D.6](https://arxiv.org/html/2610.29997v1#A4.SS6)）。面向硬件，我接下来希望看到的是：在可测量的状态估计误差、真实机械臂约束和重复接触扰动下，跟踪精度与任务成功率如何变化。

</div>
