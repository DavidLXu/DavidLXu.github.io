---
title: "[Paper Notes] DITTO-X: Forward and Reverse Teleoperation for Dexterous Manipulation and Human Intervention"
date: 2026-10-12
permalink: /posts/2026/10/ditto-x-paper-notes/
tags:
  - Dexterous Manipulation
  - Teleoperation
  - Force Feedback
  - Human-in-the-Loop
  - Imitation Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

A robot is holding a pair of tongs when its policy needs help. If the operator takes over with a different hand pose, the first human command can loosen the grasp and drop the tool. **DITTO-X** addresses this transfer: an actuated hand exoskeleton moves the operator's fingers along with the policy before intervention, then lets the operator assume control from an already aligned configuration.

The same hardware supplies joint-level force feedback and, when fingertip tactile sensing is available, a brief vibration at contact onset. It supports Sharpa Wave, Wuji 2, and Inspire RH56DFX through hand-specific mappings. The strongest learning evidence comes from Sharpa: after two intervention rounds, task success reaches **86.7% for tong use, 93.3% for raspberry placement, and 90.0% for battery insertion**, with 30 evaluation rollouts per task and condition.

## Paper and source version

**DITTO-X: Forward and Reverse Teleoperation for Dexterous Manipulation and Human Intervention** is by **Zhanpeng He, Joaquin Palacios, Zhangyu Wang, Chenhao Li, Katelyn Lee, Matei Ciocarlie, C. Karen Liu, and Jiajun Wu**, from Stanford University and Columbia University. These notes follow [arXiv:2610.00781v2](https://arxiv.org/abs/2610.00781v2), revised October 5, 2026, and its [nine-page PDF](https://arxiv.org/pdf/2610.00781v2). The first submission was September 30. The [project website](https://tml.stanford.edu/ditto-x/) includes demonstrations. Results below are author-reported; the source is an arXiv preprint.

## 1. Preparing the human hand for takeover

During autonomous execution, the robot may already be squeezing a fragile object or applying force through a tool. Camera views can hide the contact, and a passive tracking glove leaves the operator to reconstruct the robot's grasp. DITTO-X uses its actuators to make this configuration available through the operator's own fingers.

The two operating modes exchange who supplies the motion reference:

| Mode | Motion reference | Exoskeleton's role |
|---|---|---|
| Forward teleoperation | Operator's measured hand configuration | Measure motion and render contact feedback while the robot follows |
| Reverse teleoperation | Policy's commanded robot-hand configuration | Drive the operator's fingers toward its projection onto the exoskeleton |

Section III-B specifically projects the **commanded configuration**. Contact and tracking error can separate that command from the robot's measured state; the paper does not establish exact physical state equality under every contact condition.

Let $g_h$ denote the forward position mapping for hand $h$, and $P_h$ its reverse projection. The following is a compact restatement of the mechanism:

$$
q_f^{\mathrm{cmd}}=g_h(q_l),\qquad
q_l^{\mathrm{proj}}=P_h(q_f^{\mathrm{cmd}}).
$$

Here $l$ denotes the leader exoskeleton and $f$ the follower robot hand. For joints with direct correspondence, the reverse mapping is exact. The thumb needs geometric retargeting: compute the robot fingertip pose with forward kinematics, express it in the exoskeleton palm frame, undo the hand-specific length scale $s_f$, and solve exoskeleton inverse kinematics. Under different kinematics or actuation constraints, $P_h$ should be understood as a projection into the available motion space.

### A keypress requests control; movement completes the transfer

After a keyboard takeover request, policy control continues until at least one measured exoskeleton joint differs from the projection by more than $\delta_{\mathrm{release}}$. In compact notation, the gate is

$$
\max_j\left|q_{l,j}^{\mathrm{meas}}-q_{l,j}^{\mathrm{proj}}\right|
>\delta_{\mathrm{release}}.
$$

An accidental keypress alone therefore does not transfer authority. The operator must actively depart from the pose that the exoskeleton is following. Control can later return to the policy through the keyboard trigger, allowing several interventions within one episode.

The inverse-kinematics initialization matters here. **Each solve starts from the previous projection; only the first solve starts from the measured human pose.** If a redundant IK solver were initialized from the currently displaced hand at every step, it could follow that displacement along equivalent solutions. The reference would move toward the operator, reduce the measured error, and hide the action meant to open the takeover gate. Keeping the projection independent preserves a usable signal of human intent.

This is the implementation detail I would check first in a reproduction. A geometrically valid inverse mapping can still break the authority-transfer logic if its initialization absorbs the operator's motion.

## 2. How one exoskeleton controls three hands

DITTO-X extends the earlier DITTO interface with a motorized middle-finger module and a simplified thumb. The robot's ring and little fingers follow the middle finger, so the interface independently controls three digits while retaining power grasps involving all five.

For Sharpa and Wuji, the index and middle fingers admit joint correspondence for MCP abduction/adduction, MCP flexion, and PIP flexion. Unmatched joints are held at neutral angles. Thumb geometry varies more, so thumb control uses fingertip retargeting in palm frames anchored at the index MCP joint. Inspire's underactuated fingers receive a single flexion command derived from total exoskeleton finger flexion.

| Robot hand | Actuated DoF | Feedback used by DITTO-X |
|---|---:|---|
| Sharpa Wave | 22 | Current-based torque estimates, fingertip tactile forces, and contact vibration |
| Wuji 2 | 20 | Current-based torque estimates; no fingertip contact vibration |
| Inspire RH56DFX | 6 | One force magnitude per finger, mapped into exoskeleton feedback; no fingertip contact vibration |

Table I groups Inspire's sensing under a scalar per-finger entry; Section III-A2 describes the exposed quantity as a force magnitude. It is not a full vector of independently sensed joint torques. More generally, support across hands still requires position mappings, scale factors, and sensing-specific feedback choices. The shared component is the exoskeleton hardware.

## 3. Sustained force and contact onset use different feedback paths

### Mapping robot contact into exoskeleton torques

Where corresponding joints exist, current-derived robot torque estimates can be assigned directly to the matching exoskeleton joints. For the thumb, the method passes through fingertip force. Following Eq. (1),

$$
\hat F_f=(J_f^\top)^\dagger\hat\tau_f,
\qquad
\hat\tau_l^{\mathrm{des}}
=J_l^\top R_lR_f^\top\hat F_f.
$$

$J_f$ and $J_l$ are fingertip position Jacobians, $\dagger$ denotes the pseudoinverse, and the rotation term changes frames using the paper's convention. Sharpa's tactile force vector can enter this mapping directly, bypassing the current-to-force estimate. Inspire's scalar force measurement supplies a more restricted input.

Each desired torque is low-pass filtered and converted to motor current. Eq. (2) can be written equivalently as

$$
i_{l,j}^{\mathrm{cmd}}
=-k_j\operatorname{sign}(\tilde\tau_{l,j}^{\mathrm{des}})
\max\!\left(\left|\tilde\tau_{l,j}^{\mathrm{des}}\right|-\tau_{\mathrm{th},j},0\right).
$$

The gain sets the rendered strength. For current-derived estimates, the deadband rejects bias during free motion; for tactile-derived torques, the threshold is zero. The device also uses software joint limits, conservative joint-dependent current limits below 200 mA, reported torque limits of at most 0.08 N·m, and an emergency stop.

### A short vibration marks a new contact

Filtering helps stabilize force feedback but attenuates rapid changes. DITTO-X adds linear resonant actuators beneath the operator's fingertips to signal contact onset. This path is implemented only for **Sharpa**, which supplies fingertip tactile measurements.

The contact detector selects different force thresholds during loading and unloading to account for sensor hysteresis. On a transition into contact, force magnitude sets the initial vibration intensity, which decays to zero over about **0.5 seconds**. Vibration remains off until contact clears and a new onset occurs. Sustained grasp force continues through the motor-torque path. This avoids using continuous vibration to represent a continuously held object.

In the six-person study, with vision removed, both feedback modes together yield **86.1% size identification** and **91.7% compliance identification**, against a three-choice chance level of 33.3%. Removing vibration gives 61.1% and 80.6%; removing force feedback gives 61.1% and 47.2%. Each participant performs six trials per condition in each identification task. These ablations support complementary information from the two channels within this setup.

## 4. What improves in data collection and intervention?

The user study compares DITTO-X with **Manus Pro**, a passive hand-tracking glove. Six subjects perform ten trials per interface for full tool-use collection (T3) and ten for intervention (T4). In T4, both interfaces take over the same type of policy trained on DITTO-X demonstrations after it has picked up the tongs. Dropping the tool counts as task failure.

| User-study condition | DITTO-X success | Manus success | Time per success, DITTO-X / Manus |
|---|---:|---:|---:|
| T3: full tool-use collection | 70.0% | 46.7% | 56.1 / 85.5 s |
| T4: takeover after tool acquisition | 78.3% | 27.7% | 35.7 / 97.4 s |

These are the values reported in Section V-A; the paired success comparisons have $p=0.005$ for T3 and $p=0.007$ for T4. The paper prints 27.7% for Manus T4, which these notes retain. T4 asks the human to complete a shorter portion of the task than T3, so their absolute rates do not measure identical difficulty.

For policy learning, a proficient operator collects equal numbers of demonstrations with each interface: **80 for tong use and 60 each for raspberry placement and battery insertion**. The arm is a Franka Panda. All policies use the UNet variant of Diffusion Policy, trained for 50 epochs with the same architecture and hyperparameters. Observations include wrist and side images, end-effector pose, hand joint angles, and tactile signals when available.

Each task and interface then receives **two DAgger rounds of 20 intervention trajectories**, with ten fine-tuning epochs per round on accumulated data. The operator chooses when to intervene; successful interventions are retained. Every DITTO-X intervention uses reverse teleoperation. Each interface corrects its own learned policy, so the two branches encounter different failure distributions.

## 5. Corrective data changes which states the policy learns from

Figures 7–8 and Table II report the following final-task success rates. Every policy condition is evaluated over **30 rollouts**, using matched starting configurations; at least ten of those configurations per task fall outside the pretraining object-placement distribution.

| Task | Manus initial | DITTO-X initial | DITTO-X DAgger r1 | DITTO-X DAgger r2 | DITTO-X equal-count, non-iterative data |
|---|---:|---:|---:|---:|---:|
| Tong use | 13.3% | 63.3% | 73.3% | **86.7%** | 70.0% |
| Raspberry placement | 43.3% | 63.3% | 73.3% | **93.3%** | 76.7% |
| Battery insertion | 36.7% | 40.0% | 56.7% | **90.0%** | 36.7% |

The last column uses the same demonstration counts as round two: 120 for tong use and 100 for each other task, collected non-iteratively from the original task distribution. Its gap to DAgger supports the value of collecting corrections at states the current policy actually visits and struggles with. The control matches trajectory counts, not necessarily operator time or total training frames.

The stage breakdown is more informative than the overall tong score alone. Initial Manus and DITTO-X policies acquire the tongs at similar rates, **73.3% and 76.7%**. Their cumulative success at picking up the toy then separates to **23.3% and 66.7%**. The useful difference appears when the grasp must transmit force through the tool. For battery insertion, DITTO-X's second correction round increases final insertion success from 56.7% to 90.0%, after grasping and alignment have already become more reliable.

Manus DAgger ends at 36.7%, 43.3%, and 46.7% on these tasks; tong and raspberry decline from round one. The authors attribute this to corrections that first disturb an existing grasp during takeover. That is a plausible explanation supported by qualitative examples, but the comparison changes the complete interface. It does not isolate reverse teleoperation from force feedback with a DITTO-X intervention ablation.

## 6. Scope and the next experiment

Wuji policies reach **83.3% on toy pick-and-place** and **66.7% on drawer manipulation**; Inspire reaches **93.3% on bunny lifting**. Reverse teleoperation is implemented for both hands, while DAgger experiments on them remain future work. These results demonstrate reusable collection hardware across several embodiments; they do not establish a single policy that transfers between hands.

The evaluation has six user-study participants, one proficient collector for the policy-data comparisons, and 30 rollouts per policy condition. It leaves uncertainty about variation across operators, independently trained seeds, and a broader range of contact tasks. Coupling the ring and little fingers also limits independent digit control. Current-based force estimates and retargeting remain dependent on the target hand's sensing and geometry.

My takeaway is to treat takeover quality as part of the data-collection method. A human correction can begin by breaking a good grasp, and the resulting recovery then enters the training set. For a system that often requests help while holding tools, I would test pose alignment before expanding demonstration volume. The decisive next experiment would keep the DITTO-X hardware, force feedback, policy, and starting states fixed, toggle reverse projection, and measure grasp loss immediately after takeover alongside the quality of the resulting correction data. That would establish how much of the learning benefit comes specifically from preparing the operator's hand.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

机器人已经握住夹钳，策略执行到一半需要人帮忙。如果操作者以不同的手部姿态接管，第一条人工指令就可能松开抓握，让工具掉落。**DITTO-X** 针对这个切换过程设计了反向遥操作：在人工干预之前，主动外骨骼跟随策略带动人的手指，使操作者从已经对齐的姿态开始控制。

同一套硬件还提供关节级力反馈，并在灵巧手具备指尖触觉传感器时，以短促振动提示接触开始。系统通过手型专属映射适配 Sharpa Wave、Wuji 2 和 Inspire RH56DFX。最充分的学习实验来自 Sharpa：两轮干预后，**夹钳使用、覆盆子放置和电池插入的成功率分别达到 86.7%、93.3% 和 90.0%**，每个任务、每种策略条件评估 30 次。

## 论文与来源版本

论文 **DITTO-X: Forward and Reverse Teleoperation for Dexterous Manipulation and Human Intervention** 的作者为 **Zhanpeng He、Joaquin Palacios、Zhangyu Wang、Chenhao Li、Katelyn Lee、Matei Ciocarlie、C. Karen Liu 和 Jiajun Wu**，来自斯坦福大学和哥伦比亚大学。本文依据 2026 年 10 月 5 日更新的 [arXiv:2610.00781v2](https://arxiv.org/abs/2610.00781v2) 及其 [9 页 PDF](https://arxiv.org/pdf/2610.00781v2)。首次提交日期为 9 月 30 日，[项目网站](https://tml.stanford.edu/ditto-x/)提供演示。下文实验结果均为作者报告，来源是 arXiv 预印本。

## 1. 先让人的手准备好接管

自主执行期间，机器人可能正在捏住易碎物体，或通过工具向外施力。相机视角容易遮挡接触位置，而被动追踪手套需要操作者自己重建机器人的抓握姿态。DITTO-X 用驱动器把这种姿态直接传递给人的手指。

两种模式的区别在于谁提供运动参考：

| 模式 | 运动参考 | 外骨骼的作用 |
|---|---|---|
| 正向遥操作 | 测得的人手姿态 | 测量运动并呈现接触反馈，机器人跟随人手 |
| 反向遥操作 | 策略下发的机器人手部指令姿态 | 将该姿态投影到外骨骼，带动操作者手指跟随 |

论文 III-B 节明确使用的是**指令姿态**。接触约束和跟踪误差可能使指令与机器人实测状态出现偏差，因此原文并未证明任意接触条件下两者都能达到精确的物理状态一致。

记 $g_h$ 为手型 $h$ 的正向位置映射，$P_h$ 为反向投影，可以把上述机制概括为：

$$
q_f^{\mathrm{cmd}}=g_h(q_l),\qquad
q_l^{\mathrm{proj}}=P_h(q_f^{\mathrm{cmd}}).
$$

这里 $l$ 表示主端外骨骼，$f$ 表示从端机器人手。这是对方法的紧凑重述。有直接关节对应时，反向映射可以精确求得；拇指需要几何重定向：先用正运动学计算机器人指尖位姿，再变换到外骨骼掌部坐标系，撤销手型长度缩放 $s_f$，最后求解外骨骼逆运动学。对于运动学或驱动约束不同的手型，$P_h$ 应理解为向可用运动空间的投影。

### 按键提出接管请求，主动移动完成切换

操作者按键请求接管后，策略仍保持控制，直到至少一个外骨骼关节的实测位置与投影参考相差超过 $\delta_{\mathrm{release}}$。用紧凑形式表示，门控条件为：

$$
\max_j\left|q_{l,j}^{\mathrm{meas}}-q_{l,j}^{\mathrm{proj}}\right|
>\delta_{\mathrm{release}}.
$$

因此，误触按键本身不会转移控制权。操作者需要主动偏离外骨骼正在跟随的姿态。之后还可以通过按键把控制权交还策略，同一条轨迹中能够多次干预。

这里的逆运动学初值很关键：**每次求解沿用上一帧投影，只有第一次使用实测人手姿态初始化。** 如果冗余 IK 每一帧都从已经移动的人手姿态开始求解，就可能沿着等价解跟随人的偏移。参考值随之靠近人手，测得的误差变小，原本应该触发接管的动作就被掩盖了。保持投影参考独立，才能保留可用的主动接管信号。

这是我复现时会优先检查的实现细节。即使逆映射在几何上有效，只要初始化吸收了操作者的动作，控制权切换逻辑仍然可能失效。

## 2. 同一套外骨骼如何控制三种手？

DITTO-X 在此前 DITTO 的基础上增加了主动中指模块，并简化了拇指结构。机器人无名指和小指跟随中指，因此接口独立控制三个手指，同时保留五指参与的包络抓握。

Sharpa 和 Wuji 的食指、中指可以直接对应 MCP 外展／内收、MCP 屈曲和 PIP 屈曲关节，未匹配关节保持中性角度。不同手型的拇指几何差异更大，因此使用指尖重定向，掌部参考坐标系固定在食指 MCP 关节处。对于 Inspire 的欠驱动手指，系统把外骨骼手指的总屈曲量映射到单个屈曲指令。

| 机器人手 | 主动自由度 | DITTO-X 使用的反馈 |
|---|---:|---|
| Sharpa Wave | 22 | 电流估计力矩、指尖触觉力与接触振动 |
| Wuji 2 | 20 | 电流估计力矩；无指尖接触振动 |
| Inspire RH56DFX | 6 | 每指一个力幅值，映射到外骨骼反馈；无指尖接触振动 |

表 I 将 Inspire 的感知列为每指一维，III-A2 节则把接口提供的量描述为力幅值，不能将其理解为完整的独立关节力矩向量。适配不同手型仍需要位置映射、缩放系数和与传感器相匹配的反馈方式；复用的是外骨骼硬件。

## 3. 持续受力与接触开始，分别怎样反馈？

### 将机器人接触映射为外骨骼力矩

存在直接关节对应时，可以把由电流估计的机器人关节力矩赋给对应的外骨骼关节。拇指则经过指尖力这个中间量。按照论文式（1）：

$$
\hat F_f=(J_f^\top)^\dagger\hat\tau_f,
\qquad
\hat\tau_l^{\mathrm{des}}
=J_l^\top R_lR_f^\top\hat F_f.
$$

$J_f$ 和 $J_l$ 为指尖位置雅可比矩阵，$\dagger$ 表示伪逆，旋转项按论文约定变换坐标系。Sharpa 的触觉力向量可以直接进入这一映射，省去从电流估计指尖力的步骤。Inspire 的标量力测量提供的信息更有限。

每个目标力矩经过低通滤波，再转换为电机电流。论文式（2）可以等价写成：

$$
i_{l,j}^{\mathrm{cmd}}
=-k_j\operatorname{sign}(\tilde\tau_{l,j}^{\mathrm{des}})
\max\!\left(\left|\tilde\tau_{l,j}^{\mathrm{des}}\right|-\tau_{\mathrm{th},j},0\right).
$$

增益决定反馈强度。对于电流估计的力矩，死区用来抑制自由运动时的估计偏差；对于触觉测得的力矩，阈值设为零。设备还采用软件关节限位、按关节设置且低于 200 mA 的保守电流限制、报告为不超过 0.08 N·m 的力矩限制，以及急停开关。

### 用短振动标记一次新接触

滤波有助于稳定力反馈，也会削弱快速变化。DITTO-X 在操作者指尖下方加入线性谐振执行器，提示接触开始。这条反馈通路只在具备指尖触觉测量的 **Sharpa** 上实现。

接触检测器在加载和卸载过程中选择不同的力阈值，以处理传感器迟滞。检测到进入接触的瞬间后，力幅值决定初始振动强度，振动在约 **0.5 秒**内衰减至零。随后保持关闭，直到接触解除并再次发生。持续抓握力仍由电机力矩通路呈现，避免用持续振动表示一直握着物体的状态。

在六人用户研究中，去除视觉信息后，同时开启两种反馈时，**尺寸辨识准确率为 86.1%，柔顺性辨识为 91.7%**，三选一的随机水平为 33.3%。关闭振动后，两项分别为 61.1% 和 80.6%；关闭力反馈后，分别为 61.1% 和 47.2%。每人在每项辨识任务的每个条件下完成六次试验。这些消融支持两条通路在该设置中提供互补信息。

## 4. 数据采集和人工干预分别改善了多少？

用户研究将 DITTO-X 与被动手部追踪手套 **Manus Pro** 比较。六名参与者分别在每种接口下完成十次完整工具使用采集（T3），以及十次中途干预（T4）。T4 中，两种接口接管的都是用 DITTO-X 示范训练的同类策略，接管发生在机器人已经拿起夹钳之后，工具掉落直接计为任务失败。

| 用户研究条件 | DITTO-X 成功率 | Manus 成功率 | 每次成功所需时间，DITTO-X / Manus |
|---|---:|---:|---:|
| T3：完整工具使用采集 | 70.0% | 46.7% | 56.1 / 85.5 秒 |
| T4：取得工具后接管 | 78.3% | 27.7% | 35.7 / 97.4 秒 |

表中保留 V-A 节报告的数值；成功率的配对比较在 T3 中为 $p=0.005$，在 T4 中为 $p=0.007$。原文将 Manus 的 T4 成功率写为 27.7%，本文沿用该报告值。T4 要求人完成的任务段比 T3 短，因此两者绝对成功率不能视作相同难度下的比较。

策略学习实验由一名熟练操作者使用两种接口采集等量示范：**夹钳任务各 80 条，覆盆子与电池任务各 60 条**。机械臂为 Franka Panda。所有策略采用 UNet 版本的 Diffusion Policy，以相同架构与超参数训练 50 个 epoch。观测包括腕部及侧面图像、末端位姿、手部关节角，以及硬件提供的触觉信号。

随后，每个任务、每种接口进行**两轮 DAgger，每轮收集 20 条干预轨迹**，每轮在累积数据上微调十个 epoch。操作者自行决定何时接管，成功干预会被保留。DITTO-X 的全部干预均使用反向遥操作。两种接口各自纠正用自身数据训练的策略，因此两条实验分支遇到的失败状态分布有所不同。

## 5. 纠正数据改变了策略学习覆盖的状态

图 7、图 8 和表 II 报告了以下完整任务成功率。每个策略条件均评估 **30 次**，使用相匹配的起始配置；每个任务至少十个配置位于预训练物体摆放分布之外。

| 任务 | Manus 初始策略 | DITTO-X 初始策略 | DITTO-X DAgger 第 1 轮 | DITTO-X DAgger 第 2 轮 | DITTO-X 等条数非迭代数据 |
|---|---:|---:|---:|---:|---:|
| 夹钳使用 | 13.3% | 63.3% | 73.3% | **86.7%** | 70.0% |
| 覆盆子放置 | 43.3% | 63.3% | 73.3% | **93.3%** | 76.7% |
| 电池插入 | 36.7% | 40.0% | 56.7% | **90.0%** | 36.7% |

最后一列使用与第二轮 DAgger 相同的示范条数：夹钳任务 120 条，其余任务各 100 条，但从原始任务分布非迭代地采集。它与 DAgger 的差距支持这样一个判断：在当前策略实际访问、容易失败的状态上采集纠正数据具有价值。这个对照匹配了轨迹条数，并未保证操作时间或训练总帧数相等。

分阶段结果比夹钳任务的总成功率更能说明问题。初始 Manus 与 DITTO-X 策略拿起夹钳的比例相近，分别为 **73.3% 和 76.7%**；到夹起玩具这一步，累积成功率已经分化为 **23.3% 和 66.7%**。差距出现在抓握需要通过工具传递力的时候。电池任务中，抓取与对齐已经较可靠之后，DITTO-X 的第二轮纠正把最终插入成功率从 56.7% 提升到 90.0%。

Manus 的 DAgger 最终在三项任务上分别达到 36.7%、43.3% 和 46.7%，其中夹钳与覆盆子任务相比第一轮下降。作者将其归因于接管时先破坏已有抓握的纠正轨迹，定性案例也支持这一解释。不过，对照改变的是完整接口，论文没有在保持 DITTO-X 力反馈的条件下，单独消融反向遥操作的干预实验。

## 6. 适用范围与下一步实验

Wuji 策略在**玩具抓放上达到 83.3%，抽屉操作达到 66.7%**；Inspire 在**提起兔子玩偶上达到 93.3%**。后两种手也已实现反向遥操作，但其 DAgger 实验留待后续工作。这些结果验证了同一采集硬件对多个本体的适用性，尚未建立一个能在手型之间迁移的共享策略。

评估规模包括六名用户研究参与者、策略数据比较中的一名熟练采集者，以及每种策略条件 30 次 rollout。不同操作者、独立训练随机种子和更广泛接触任务下的变化仍待验证。无名指与小指耦合也限制了独立手指控制；电流力估计和重定向依赖目标手的传感器与几何特性。

我的收获是，应当把接管质量纳入数据采集方法的评估。一次人工纠正可能先破坏原本稳定的抓握，随后恢复的过程又进入训练集。对于经常握着工具请求帮助的系统，我会在扩大示范数量前先测试姿态对齐。最有辨别力的下一步实验，是固定 DITTO-X 硬件、力反馈、策略和起始状态，只开关反向投影，同时测量接管后立即丢失抓握的比例和后续纠正数据的质量。这样才能确定，学习收益中有多少来自提前让操作者的手准备好。

</div>
