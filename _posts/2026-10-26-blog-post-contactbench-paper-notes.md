---
title: "[Paper Notes] ContactBench 1.0: A Benchmark for Everyday Contact-Rich Robotic Manipulation"
date: 2026-10-26
permalink: /posts/2026/10/contactbench-paper-notes/
tags:
  - Contact-Rich Manipulation
  - Tactile Sensing
  - Benchmark
  - Behavioral Generalization
  - Simulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

## TL;DR

A robot can open a familiar door almost perfectly and fail when its knob becomes just 5 mm smaller. **ContactBench 1.0** makes this kind of failure measurable through 36 tasks, more than 40 printable assets, and matching simulation models. Its most useful design choice is to vary the mechanics of an interaction, including resistance and required rotation, while controlling what the robot can see.

The real-world study covers six tasks, with tactile-policy comparisons on four of them. Adding tactile input produces no consistent improvement in those original task settings. Yet Reactive Diffusion Policy (RDP) adapts when a visually unchanged door requires more rotation to unlock. These results put the emphasis on **whether contact feedback changes the action at the right moment**.

## Paper and reading version

**ContactBench 1.0: A Benchmark for Everyday Contact-Rich Robotic Manipulation**, by Jingyi Xiang, Yixuan Wang, Jeannette Bohg, and Wenzhen Yuan, from the University of Illinois Urbana-Champaign and Stanford University. These notes use the 23-page [project-hosted PDF](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf), checked on October 26, 2026. The supplied version does not identify a publication venue or version number.

The [project website](https://jingyi-xiang.github.io/contactbench/) provides asset and task pages; its simulation-code link is still marked “coming soon” at the time of reading. The discussion below separates the simulation system described in the paper from code availability.

## Eight skills, with explicit stopping conditions

The benchmark contains 31 short-horizon tasks and five longer tasks that combine several skills. Its eight categories cover grasping thin or small objects, grasping multiple objects, extracting objects from clutter, placing under environmental constraints, in-hand repositioning, extrinsic contact control, articulated-object manipulation, and insertion/alignment. The categories overlap: tightening a screw with an Allen key involves both alignment and maintaining contact between the tool and screw.

That overlap matters for diagnosis. A controller may reach the right pose but lose the contact needed to transmit torque. It may also tighten the screw and then keep repeating the operation. ContactBench specifies when to stop and release: several task definitions require disengaging from the objects and terminating motion after the physical goal is achieved. For door opening, success requires opening the door by at least 5°. These definitions make completion and termination part of the evaluation. [§III-A/B and Table II](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=9)

## Reproducing a force response across laboratories

A tight fit between printed parts can create insertion resistance, but small differences in printer tolerances also change that resistance. ContactBench instead uses compliant PLA spring structures to set forces through geometry and material properties. A door handle contains a torsional spring; an outlet uses a compression spring. Assets use standard PLA and M3 screws and nuts.

The authors test three handle variants and two charger–outlet variants printed on a Bambu Lab P1S and a Prusa XL, with the same filament and print settings. Each physical asset is measured ten times. Printed handles require 5.01–9.54 N, compared with 5.45–9.53 N for the tested real handles. Printed outlets require 8.04–29.26 N, within the 5.24–37.18 N range of the tested commercial outlets. Differences between the two printers reach at most 0.5 N for handles and 1.19 N for outlets. This is evidence for the tested mechanisms and fabrication settings; it does not establish reproducibility for every asset or printer. [§III-D and Figure 5](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=6)

The design also gives behavioral generalization a concrete test. Changing a hidden spring or the rotation required to unlock a door can alter the necessary action without providing a clear visual cue. Changing knob diameter alters both geometry and the required grasp. Keeping these variations separate helps identify which feedback the policy uses.

## Simulation preserves the mechanism's resistance

The simulation suite uses Newton with the MuJoCo Warp solver. CAD assemblies become rigid parts connected by joints, limits, and supports. Printed springs become prismatic or revolute spring–damper drives with adjustable stiffness and preload. For the door handle, tuning stiffness $K$ and preload torque $\tau_0$ reproduces the shape and ordering of the measured force profiles. The simulator approximates the spring's mechanical response without resolving its full material deformation.

Contact-critical geometry, including threads and insertion passages, uses mesh signed-distance fields; simpler regions use collision primitives. Thin geometry requires particular care: the 1.2 mm card uses a maximum SDF resolution of 512 cells. The optional GelSight Mini model converts hydroelastic contact into pressure, indentation, and shear fields, then renders tactile images using Taxim-based optical shading. Keyboard, gamepad, and SpaceMouse teleoperation and task-specific scripted policies support demonstration collection. These scripted executions demonstrate the modeled mechanisms; the learned-policy comparisons below are real-world experiments. [§IV and Figures 6–9](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=6)

## What was trained and measured

The robot is a UR5e with a WSG50 parallel-jaw gripper and one RealSense D435i wrist camera. Four tasks use GelSight Mini fingers. The utensil and card tasks use compliant Fin-Ray fingers because the GelSight hardware's shape and sensing coverage are unsuitable; tactile policies are therefore **not evaluated** on those two tasks.

The authors collect 100 UMI demonstrations per task, with HTC VIVE motion tracking replacing SLAM; one utensil demonstration is discarded during quality checks. DP and RDP train from scratch, while $\pi_{0.5}$ and FTP-1 are fully fine-tuned per task. They are evaluated as task specialists. RDP receives tactile marker displacements and runs a 12 Hz slow policy with a 24 Hz fast policy; FTP-1 receives tactile images at 24 Hz. These differences matter when interpreting the comparison as evidence about tactile sensing. [§V-A and Appendix B, Table B1](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=18)

Each evaluated method–task pair has 30 rollouts with a one-minute limit and matched initial conditions. Object positions are sampled within a 0.15 × 0.15 m area; Velcro fixes task fixtures to the workspace. The four reported outcomes are success, checkpoint progress, the fraction of episodes exceeding 40 N peak wrist force, and completion time conditioned on success.

| Task | DP | RDP | $\pi_{0.5}$ | FTP-1 |
| --- | ---: | ---: | ---: | ---: |
| Thread nut onto screw | 8/30 | 0/30 | 14/30 | 14/30 |
| Tighten screw with Allen key | 0/30 | 0/30 | 17/30 | 3/30 |
| Plug in charger | 2/30 | 4/30 | 6/30 | 4/30 |
| Turn doorknob to open door | 30/30 | 29/30 | 30/30 | 29/30 |
| Retrieve one utensil from bin | 0/30 | Not evaluated | 16/30 | Not evaluated |
| Pick up card from platform | 14/30 | Not evaluated | 2/30 | Not evaluated |

These are successful episodes, transcribed from [Table III](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=10). The often-quoted 56.7% is the best method–task result **outside door opening**, $17/30$ for $\pi_{0.5}$ using the Allen key. It is not a suite-wide average.

Success alone hides substantial differences. For threading the nut, $\pi_{0.5}$ and FTP-1 both succeed 14 times, but 27% and 83% of their episodes, respectively, exceed 40 N. On door opening, DP succeeds 30 times and RDP 29 times, while their force-exceedance rates are 10% and 63%. The threshold is a reported diagnostic, not a universal boundary for safe interaction. Completion times also need their denominator: FTP-1's 0.84× human time on Allen-key tightening comes from only three successful episodes.

## Why touch does not consistently improve the base tasks

The rollout analysis identifies failures at several points between sensing and action. Some collisions occur on the back of a gripper finger, outside the inner fingertip sensing area. A policy cannot use tactile evidence that the sensor never captures. Even when contact information is available, the policies often fail to learn the small search and alignment motions that demonstrators use when the charger occludes its own pins.

There is also a more specific mistake: both tactile policies sometimes stop tightening after the Allen key slips in the grasp. Slip can occur during normal progress or after misalignment, so it does not reliably mean that the screw is tight. Figure 13 contrasts this incidental cue with the large in-plane torque associated with actual tightening. The failure concerns how the policy interprets contact history, as well as what its sensors observe. [§V-B/C and Figure 13](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=12)

The human demonstrations expose another gap. Operators see the same wrist-camera stream, but their hands feel contact across the UMI gripper body. GelSight Mini captures a smaller contact region. Matching the visual viewpoint therefore leaves a difference in the tactile evidence available to teacher and learner.

## A hidden rotation change reveals adaptation

All four policies nearly solve the training door, which unlocks after roughly 60° of rotation. On visually indistinguishable doors requiring 72° and 80°, RDP retains **80% and 53.3% success**, respectively, across 30 trials per condition. The other methods fall to roughly half success at 72° and near zero at 80°.

The wrist-angle distributions are more informative than success alone: RDP shifts toward larger rotations as the required angle increases. DP, $\pi_{0.5}$, and FTP-1 keep approximately the same distributions. Their occasional successes can come from the existing spread of actions reaching the new threshold. This is the paper's clearest evidence that a tactile policy can adapt its behavior despite showing no improvement on the base task. It does not isolate which component of RDP causes the advantage. [§V-D and Figure 14](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=13)

Changing knob diameter from 60 to 55 mm defeats all four policies: each records 0/10 successes. Their gripper widths remain around 59 mm, so they fail to establish the smaller grasp. The authors stop at ten trials because failure is immediate and consistent; this experiment does not use the full 30-trial protocol. Contact feedback helps only after the controller takes actions that make useful contact possible.

## Reading ContactBench alongside GALATEA

[GALATEA]({% post_url 2026-09-11-blog-post-galatea-paper-notes %}) reconstructs hand–object motion from generated videos and learns a simulator-grounded tracking controller. ContactBench provides a way to ask what happens when the motion reference is plausible but the interaction mechanics change. A useful follow-up would hold the intended task fixed, vary resistance or the unlocking threshold, and measure whether execution changes while preserving completion and acceptable forces. This is a proposed experiment; the two papers do not report a joint evaluation.

I would use ContactBench first to test that feedback-to-action connection. Its current results cover six tasks on one arm–gripper setup, while the full suite includes skills requiring other embodiments. The assets focus on rigid and articulated objects, and printed layer texture can introduce tactile cues unlike those of manufactured objects. Surface friction is not systematically characterized or varied. For a transfer study, I would measure the force response of the actual printed fixtures and keep success, force, and termination behavior visible as separate outcomes. [Discussion, §VI](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=14)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

机器人几乎每次都能打开熟悉的门，门把手直径缩小 5 mm 后却可能完全失败。**ContactBench 1.0** 用 36 项任务、40 多个可打印资产及其仿真模型，让这类失败能够被重复测量。它最有价值的设计，是在控制视觉变化的同时，改变阻力、解锁角度等交互条件。

真机实验覆盖六项任务，其中四项比较了触觉策略。加入触觉后，所评估策略在这四项原任务设置下没有获得稳定收益；但当外观相同的门需要更大旋转角度才能解锁时，Reactive Diffusion Policy（RDP）表现出了适应能力。值得关注的是：**接触反馈是否在合适的时刻改变了动作**。

## 论文与阅读版本

**ContactBench 1.0: A Benchmark for Everyday Contact-Rich Robotic Manipulation**，作者为 Jingyi Xiang、Yixuan Wang、Jeannette Bohg、Wenzhen Yuan，来自伊利诺伊大学厄巴纳-香槟分校和斯坦福大学。本文依据[项目网站上的 23 页 PDF](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf)，核验日期为 2026 年 10 月 26 日。所提供版本未标明发表 venue 或版本号。

[项目主页](https://jingyi-xiang.github.io/contactbench/)提供资产与任务页面；阅读时，仿真代码入口仍标注为“coming soon”。下文介绍的仿真能力来自论文描述，代码可用状态需要单独核对。

## 八类技能，也规定何时结束动作

基准包含 31 项短程任务和五项组合多种技能的长程任务。八类技能分别是：薄小物体抓取、多物体抓取、杂乱环境中抓取、环境约束下放置、手内重定位、外部接触控制、关节物体操作，以及插入与对齐。这些类别允许重叠，例如用内六角扳手拧紧螺钉，既需要对准，也需要维持工具与螺钉之间能够传递扭矩的接触。

这样的划分有助于定位失败。控制器可以到达正确位姿，却失去传递扭矩所需的接触；也可能已经拧紧螺钉，仍不断重复动作。ContactBench 将结束和释放写进成功标准：若干任务要求达到物理目标后，脱离任务物体并停止运动；开门任务则要求门至少打开 5°。因此，完成任务与正确终止都进入了评估。[§III-A/B 与 Table II](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=9)

## 让不同实验室复现相近的力学响应

缩小打印零件之间的配合间隙可以增加插入阻力，但打印精度的细微差异也会改变阻力。ContactBench 使用柔顺的 PLA 弹簧结构，通过几何与材料属性设定作用力：门把手内部采用扭转弹簧，插座内部采用压缩弹簧。资产使用普通 PLA 耗材和 M3 螺钉、螺母。

作者用相同耗材和打印设置，在 Bambu Lab P1S 与 Prusa XL 上制作三种门把手、两种充电器—插座变体，每个实物测量十次。打印门把手的按压力为 5.01–9.54 N，所测试真实门把手为 5.45–9.53 N；打印插座的插入力为 8.04–29.26 N，落在所测试商业插座的 5.24–37.18 N 范围内。两台打印机之间的最大差异，门把手为 0.5 N，插座为 1.19 N。这些结果支持已测试机构与制作条件下的可重复性，不能直接扩展到所有资产和打印机。[§III-D 与 Figure 5](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=6)

这也让行为泛化有了具体的测试方式。改变隐藏弹簧或门锁所需的旋转角度，可以在缺少明显视觉线索的情况下改变正确动作；改变把手直径，则同时改变几何外观和抓取要求。分别测试这两类变化，有助于判断策略究竟使用了什么反馈。

## 仿真保留机构的阻力特性

仿真套件基于 Newton 和 MuJoCo Warp 求解器。CAD 装配被拆成刚体，通过关节、行程限制和支撑结构连接；打印弹簧则替换为具有可调刚度与预载的平移或旋转弹簧—阻尼驱动。门把手通过调节刚度 $K$ 和预载扭矩 $\tau_0$，复现测得力曲线的形状和相对顺序。仿真近似弹簧的机械响应，无需求解完整材料形变。

螺纹、插入通道等接触关键区域采用网格符号距离场，简单区域采用碰撞几何体。薄结构尤其依赖分辨率：厚度为 1.2 mm 的卡片使用最高 512 格的 SDF 分辨率。可选 GelSight Mini 模型将水弹性接触转换为压力、压入深度和剪切场，再通过基于 Taxim 的光学着色渲染触觉图像。键盘、手柄和 SpaceMouse 遥操作接口，以及任务脚本，支持示范采集。脚本执行用于展示机构行为；下文学习策略的对比来自真机实验。[§IV 与 Figures 6–9](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=6)

## 实际训练与测量了什么

真机使用 UR5e、WSG50 平行夹爪和单个 RealSense D435i 腕部相机。四项任务采用 GelSight Mini 手指；取餐具和拾卡片改用柔顺 Fin-Ray 手指，因为 GelSight 硬件的体积与感知覆盖不适合这两项任务。因此，触觉策略在这两项任务上**没有被评估**。

每项任务采集 100 条 UMI 示范，用 HTC VIVE 动作追踪替代 SLAM；取餐具任务有一条示范未通过质量检查。DP 和 RDP 从头训练，$\pi_{0.5}$ 与 FTP-1 按任务进行全参数微调，评估对象都是任务专用策略。RDP 输入触觉标记点位移，慢策略为 12 Hz、快策略为 24 Hz；FTP-1 输入触觉图像，数据频率为 24 Hz。解释触觉效果时，需要保留这些训练与架构差异。[§V-A 与附录 B、Table B1](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=18)

每个已评估的方法—任务组合执行 30 次，每次限时一分钟，各方法共享初始条件。物体位置在 0.15 × 0.15 m 区域内采样，任务夹具通过魔术贴固定。论文报告四类结果：成功率、任务检查点完成比例、腕部峰值力超过 40 N 的试验比例，以及仅在成功试验中统计的完成时间。

| 任务 | DP | RDP | $\pi_{0.5}$ | FTP-1 |
| --- | ---: | ---: | ---: | ---: |
| 将螺母旋上螺钉 | 8/30 | 0/30 | 14/30 | 14/30 |
| 用内六角扳手拧紧螺钉 | 0/30 | 0/30 | 17/30 | 3/30 |
| 插入充电器 | 2/30 | 4/30 | 6/30 | 4/30 |
| 转动门把手并开门 | 30/30 | 29/30 | 30/30 | 29/30 |
| 从容器中取出单件餐具 | 0/30 | 未评估 | 16/30 | 未评估 |
| 从平台拾起卡片 | 14/30 | 未评估 | 2/30 | 未评估 |

表中为成功次数，数据来自 [Table III](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=10)。常被引用的 56.7%，对应**除开门以外**最好的方法—任务组合，即 $\pi_{0.5}$ 使用内六角扳手时的 $17/30$，不应写成整个基准的平均成功率。

成功次数相同，也可能掩盖明显差异。旋螺母时，$\pi_{0.5}$ 与 FTP-1 都成功 14 次，但峰值力超过 40 N 的试验比例分别为 27% 和 83%。开门时，DP 成功 30 次、RDP 成功 29 次，对应超阈值比例却为 10% 和 63%。40 N 是论文报告的诊断指标，不能当作通用安全界限。完成时间同样需要保留样本条件：FTP-1 拧紧螺钉的耗时是人类的 0.84 倍，这个数字只来自三次成功试验。

## 触觉为何没有稳定改善原任务

轨迹分析发现，从感知到动作的多个环节都可能出错。有些碰撞发生在夹爪手指背面，超出了内侧指尖的感知区域；传感器没有捕获的事件，策略自然无法据此调整。即使能够观测接触，策略也经常学不会示范者使用的小幅搜索与对齐动作，例如充电器遮住自身插脚时的接触搜索。

还有一种更具体的误判：两种触觉策略有时会在内六角扳手发生手内滑动后停止拧紧。滑动既可能出现在正常操作中，也可能来自工具与螺钉错位，因而不能可靠地表示螺钉已拧紧。Figure 13 展示了这一偶然线索与真正拧紧时较大平面内扭矩的区别。这里的问题同时涉及传感器能看见什么，以及策略如何解释接触历史。[§V-B/C 与 Figure 13](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=12)

人类示范还暴露了另一处差距。操作者虽然只能看同样的腕部相机画面，手却能感受到整个 UMI 夹爪上的接触，GelSight Mini 只覆盖局部区域。因此，统一视觉视角以后，教师与学习者获得的触觉信息仍然不同。

## 隐藏的旋转要求揭示了适应能力

训练门在旋转约 60° 后解锁，四种策略都接近完全成功。换成外观相同、需要旋转 72° 和 80° 的门后，每种条件测试 30 次，RDP 分别保持 **80% 和 53.3% 的成功率**；其他方法在 72° 时降到约一半，在 80° 时接近零。

腕部旋转角度的分布比单看成功率更有解释力：随着解锁角度增加，RDP 的分布向更大角度移动；DP、$\pi_{0.5}$ 和 FTP-1 的分布基本不变。后几种方法偶尔成功，可以来自原有动作分布的尾部恰好达到新阈值。这是论文中触觉策略能够调整行为的最明确证据，即使它在原任务上没有提高成功率。该实验尚未单独分离 RDP 哪个组件带来了优势。[§V-D 与 Figure 14](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=13)

将把手直径从 60 mm 缩小到 55 mm，则让四种策略全部失败，各为 0/10。夹爪宽度仍停在约 59 mm，无法建立对小把手的稳定抓取。由于每次都立即出现一致失败，作者只测试十次，没有执行完整的 30 次协议。接触反馈要发挥作用，控制器首先得采取能够获得有效接触的动作。

## 与 GALATEA 放在一起看

[GALATEA]({% post_url 2026-09-11-blog-post-galatea-paper-notes %}) 从生成视频重建手—物体运动，再在仿真中学习跟踪控制器。ContactBench 可以进一步检验：参考动作看起来合理，但交互力学发生变化时，控制器会怎样反应。一个值得做的后续实验，是固定任务目标，改变阻力或解锁阈值，测量执行行为是否随之调整，同时保留任务完成情况与作用力指标。这是我提出的实验方向，两篇论文没有报告联合评估。

我会优先用 ContactBench 检验接触反馈到动作调整之间的关系。现有结果只覆盖一套机械臂—夹爪上的六项任务，完整任务集还包含需要其他本体的技能。资产范围集中在刚体与关节物体；打印层纹可能带来不同于日常制造物品的触觉线索，表面摩擦也尚未被系统表征和变化。做迁移实验时，我会先测量实际打印夹具的力响应，再分别记录成功、作用力与终止行为。[讨论 §VI](https://jingyi-xiang.github.io/contactbench/website_assets/pdf/contact-rich-manipulation-benchmark.pdf#page=14)

</div>
