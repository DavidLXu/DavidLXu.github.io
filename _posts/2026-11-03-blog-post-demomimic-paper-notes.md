---
title: "[Paper Notes] DemoMimic: One Demonstration, Many Objects—Generalizing Manipulation via Local Contact Geometry"
date: 2026-11-03
permalink: /posts/2026/11/demomimic-paper-notes/
excerpt: "DemoMimic learns residual RL teachers with surface-alignment and sustained-contact rewards, then distills task-specific depth policies that transfer across objects sharing local contact geometry."
tags:
  - Paper Notes
  - Dexterous Manipulation
  - Bimanual Manipulation
  - Reinforcement Learning
  - Imitation Learning
  - Sim-to-Real
  - Vision
---

<div data-lang="en" markdown="1">

## TL;DR

A robot can reproduce a lid's motion in simulation while relying on contact that fails immediately on hardware. **DemoMimic** addresses this failure by rewarding how the fingers meet the surface and how long they maintain contact. A human demonstration supplies the motion reference; residual reinforcement learning turns it into executable behavior; a depth-conditioned policy learns from the resulting simulation rollouts.

The useful generalization hypothesis is local: different boxes can share the same lid edge and contact strategy even when their overall dimensions and materials differ. The reported **71%** across sixteen objects is an aggregate of task-specific completion scores, including partial credit. It should not be read as the fraction of episodes that fully succeed.

## Paper and reading version

**One Demonstration, Many Objects: Generalizing Manipulation via Local Contact Geometry**, by Satvik Sharma, Samrat Sahoo, Huang Huang, Fei-Fei Li, Jiajun Wu, Dorsa Sadigh, and Jeannette Bohg, all at Stanford University. Sharma, Sahoo, and Huang contribute equally. These notes follow the 21-page [arXiv:2609.01938v2 preprint](https://arxiv.org/abs/2609.01938v2), revised September 3, 2026, checked on November 3, 2026. [PDF](https://arxiv.org/pdf/2609.01938v2) · [Project](https://demomimic.github.io/)

DemoMimic stands for **Dexterous Motion Mimic**. The method and reward discussion below follows §3 and Appendix A; evaluation follows §4 and Appendices C–F.

## What one demonstration supplies

The training input contains human hand keypoints and an object-state trajectory: position, orientation, and articulation for objects with a hinge. This is richer than an unprocessed demonstration video. The box-opening and lid-lifting references come from ARCTIC motion-capture clips. For pushing a box and moving a bottle, the authors capture hands with Meta Quest tracking and estimate object poses with FoundationPose.

To create references for different object sizes, the pipeline scales assets anisotropically and adapts the hand trajectories. Contact-annotated keypoints receive greater weight in inverse kinematics. Trajectory optimization smooths velocity, acceleration, and jerk; reaching and retreat motions are added around the interaction. These references guide learning, but retargeting alone does not guarantee that the robot makes the necessary contacts. [Appendix A.1](https://arxiv.org/pdf/2609.01938v2#page=14)

For reference $i$, the RL teacher outputs a residual:

$$
q_t^{\mathrm{cmd}}=q_{t,i}^{\mathrm{ref}}+
\operatorname{clip}(\Delta q_t,l,h)\odot s,
\qquad \Delta q_t\sim\pi_{\mathrm{RL}}(\cdot\mid s_t,i).
$$

Here $s$ scales residual actions, while $s_t$ is the privileged simulator state. The teacher can observe object state, contact forces, and distances from hand keypoints to object surfaces. Its task reward tracks the demonstrated object motion. The central design question is which additional rewards make that motion survive transfer to hardware.

## Alignment rewards prepare the contact before it happens

The total reward combines object tracking, alignment, sustained contact, and a smoothness penalty:

$$
r_t=w_{\mathrm{task}}r_{\mathrm{task}}+
 w_{\mathrm{AR}}r_{\mathrm{AR}}+
 w_{\mathrm{SCR}}r_{\mathrm{SCR}}-w_p p_{\mathrm{smooth}}.
$$

Object tracking uses exponential penalties for translation, rotation, and, when relevant, articulation errors. This rewards the intended outcome but leaves room for unreliable contact strategies.

The **alignment reward (AR)** uses the paper's hand-link and object-contact normal convention. For each link, it computes cosine similarity, rescales it above a threshold $b$, and clips it:

$$
A(u)=\operatorname{clip}\!\left(\frac{u-b}{1-b},0,1\right),
\qquad u=\frac{n_{\mathrm{hand}}\cdot n_{\mathrm{contact}}}
{\|n_{\mathrm{hand}}\|\|n_{\mathrm{contact}}\|}.
$$

The symbol $b$ here denotes the rescaling parameter called $s$ in the appendix, avoiding confusion with action scaling. AR averages two terms over hand links: alignment at the current contact and alignment with the next demonstrated contact location. The future term supplies a signal before contact occurs. A finger can therefore learn to approach with an appropriate orientation, instead of receiving feedback only after touching the object. [§3.1 and Appendix A.4](https://arxiv.org/pdf/2609.01938v2#page=15)

## Sustained contact rewards continuity through a task phase

The **sustained contact reward (SCR)** extracts contact windows separately for each hand from the demonstration. Within an active window of length $S$, let $c_t$ be the number of consecutive timesteps with contact above a minimum force threshold. Breaking contact resets this counter to zero. The reward is

$$
r_{\mathrm{SCR}}(t)=\frac{c_t(c_t+1)}{S(S+1)},
$$

averaged over active windows. The increasing marginal reward favors uninterrupted contact. For example, in a ten-step window, a streak of five receives $30/110$, while a streak of ten receives $1$; several short streaks cannot preserve the accumulated progress of a long one.

The window limits when persistence is desirable. It follows the demonstrated contact phase and stops rewarding persistence outside that phase. Force enters through a threshold for valid contact; SCR does not reconstruct or track a demonstrated force waveform. Together, AR and SCR specify contact orientation and continuity, two properties that object-trajectory tracking alone can leave underconstrained. [Appendix A.4](https://arxiv.org/pdf/2609.01938v2#page=16)

## Distilling global guidance and local control

Teacher rollouts produce executed joint targets, wrist depth, robot state, reference wrist trajectories, and initial ego-view RGB images. The deployed low-level policy is a Diffusion Policy trained to predict **absolute joint targets**. It uses wrist depth, proprioception history, and a wrist reference trajectory. It does not deploy the teacher's privileged-state residual interface.

A second Diffusion Policy predicts that wrist trajectory from the initial ego-view RGB image. Cosmos-Transfer-2.5 augments simulation images with more realistic textures and backgrounds for its training. During execution, the high-level reference stays fixed; the low-level policy repeatedly updates actions from local observations. The system is therefore open-loop at the guidance level and closed-loop at the action level. [§§3.2–3.3](https://arxiv.org/pdf/2609.01938v2#page=5)

FoundationStereo estimates depth from wrist stereo pairs at 10 Hz. Depth beyond 0.4 m is clipped to concentrate on nearby geometry; the low-level policy produces targets at 30 Hz and the PD controller tracks interpolated targets at 60 Hz. These are distinct update rates. The student does not require explicit object-pose estimates or tactile measurements at deployment, even though contact information shapes teacher training. [Appendices E–F](https://arxiv.org/pdf/2609.01938v2#page=19)

The authors train separate high- and low-level policy pairs for each task. For articulated assets, separate RL teachers handle different scales before their rollouts support policy training. Box data cover five scales and appliance data three, yielding 5,000 and 4,200 low-level training trajectories respectively. “One demonstration” describes the human reference budget, followed by extensive simulation training and data generation. It does not mean one universal policy learned directly from one video.

## Reading the 71% result with its scoring rules

The real-world suite covers opening a box, lifting a lid, pushing a box, and moving a bottle. Sixteen objects vary in dimensions, material, and friction, with twenty rollouts per object. Hardware uses two Franka arms with Tesollo or Sharpa hands.

| Reported quantity | Value | Interpretation |
| --- | ---: | --- |
| Overall score across objects | 71% | Aggregated task-specific completion scores |
| Sharpa subset | 76% | Scores on the evaluated objects/tasks using that hand |
| Tesollo subset | 65% | Scores on the evaluated objects/tasks using that hand |
| Robot-hand storage box, opening task | 39% | Failure case with a curved lid lip that changes local geometry |

For opening and lifting, the score compares peak articulation to the demonstration. The appendix gives the articulation score as

$$
\max\left(0,1-\frac{|x-x_{\mathrm{demo}}|}{x_{\mathrm{demo}}}\right).
$$

Both overshoot and undershoot reduce the score. Pushing is scored analogously using distance. Bottle moving awards quarters for approaching, grasping, transporting through the air, and reaching the desired final state. These definitions explain why “71% success” includes partial completion. The hand-specific aggregates also do not establish a controlled ranking of the two embodiments. [§4.1–4.2 and Table 5](https://arxiv.org/pdf/2609.01938v2#page=6)

The curved-lip box is an informative boundary case: an object can belong to the same semantic category while requiring different contact geometry. The method transfers most plausibly when the interaction surface remains compatible with its training experience.

## What the comparisons actually isolate

The reward comparisons use two articulated tasks at a single object scale. All methods generate teacher rollouts and train the same kind of low-level depth policy. Real evaluations use twenty rollouts; simulation evaluations use 300 rollouts across three seeds. The comparison therefore addresses the consequences of teacher reward design under a common student pipeline, separately from the sixteen-object generalization study.

The baselines are adapted versions, **DexMachina\*** and **HERMES\***. Both use the authors' residual action interface. HERMES\* is reimplemented and also receives the paper's object-tracking task reward to support articulated tasks. These modifications matter when comparing the results with the original publications. [Appendix B](https://arxiv.org/pdf/2609.01938v2#page=17)

DemoMimic can score below the baselines in simulation while transferring better to hardware. Removing SCR causes nearly complete contact-loss failure on box opening in the real experiment. Removing AR reduces alignment and broadens force variation. Lid lifting is more forgiving once the fingers reach under the lip, so its drop-rate differences are smaller. The evidence supports complementary roles for alignment and persistence within the tested tasks; a high simulation completion score alone does not reveal those differences. [Figures 5–6](https://arxiv.org/pdf/2609.01938v2#page=7)

## Implications for contact-rich policy learning

My main takeaway is to evaluate the contact strategy that produces a successful object trajectory. Demonstration-derived contact windows provide a reusable way to specify when contact should persist; surface alignment supplies a geometric constraint on how it should begin. This could be useful when a policy reaches the right simulated outcome through fragile contact.

There are clear limits. Guidance cannot react to global scene changes after the initial image, initial-pose randomization covers a limited workspace, and the evaluation contains four tasks. Training also requires a reference object trajectory that is difficult to recover reliably from arbitrary videos. Local geometry is a useful generalization assumption precisely because the curved-lip failure makes its boundary visible.

Compared with [FACT](/posts/2026/10/fact-paper-notes/), DemoMimic places contact knowledge in simulator rewards and transfers it into a vision-based student. FACT uses measured tactile context and joint future-force/action prediction. For a deployment without tactile sensing, DemoMimic shows one way to make contact matter during training; it does not establish that visual feedback can replace force sensing across dexterous tasks.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

机器人可能在仿真中复现了盒盖运动，却依赖一种一到真机就失效的接触方式。**DemoMimic** 通过奖励手指与表面的对齐、以及连续保持接触的时间，处理这一问题。人类示范提供动作参考，残差强化学习将其转化为可执行行为，深度条件策略再从仿真执行数据中学习。

它的泛化假设很具体：整体尺寸和材料不同的盒子，可能共享相似的盖沿与接触策略。论文在十六个物体上报告的 **71%** 汇总了不同任务的完成度评分，其中包含部分得分，不能直接解释为完全成功回合的比例。

## 论文与阅读版本

**One Demonstration, Many Objects: Generalizing Manipulation via Local Contact Geometry**，作者为 Satvik Sharma、Samrat Sahoo、Huang Huang、Fei-Fei Li、Jiajun Wu、Dorsa Sadigh 和 Jeannette Bohg，均来自斯坦福大学，前三位共同一作。本文依据 2026 年 9 月 3 日修订的 21 页 [arXiv:2609.01938v2 预印本](https://arxiv.org/abs/2609.01938v2)，于 2026 年 11 月 3 日核对。[PDF](https://arxiv.org/pdf/2609.01938v2) · [项目主页](https://demomimic.github.io/)

DemoMimic 是 **Dexterous Motion Mimic** 的缩写。以下方法与奖励分析依据第 3 节和附录 A，评测分析依据第 4 节与附录 C–F。

## 一次示范究竟提供了什么

训练输入包含人手关键点，以及物体的位置、姿态和关节运动轨迹；带铰链物体还需要开合角度。这比未经处理的示范视频包含更多信息。开盒与抬盖参考来自 ARCTIC 动作捕捉片段；推盒和移瓶则由作者通过 Meta Quest 捕捉手部运动，并用 FoundationPose 估计物体位姿。

为了生成适应不同物体尺寸的参考，流程对资产进行各向异性缩放，并调整手部轨迹。逆运动学为标注为接触状态的关键点赋予更高权重；轨迹优化平滑速度、加速度和 jerk，再补充接近与撤离动作。这些参考用于引导学习，但重定向本身无法保证机器人形成必要接触。[附录 A.1](https://arxiv.org/pdf/2609.01938v2#page=14)

对于参考轨迹 $i$，RL 教师输出残差：

$$
q_t^{\mathrm{cmd}}=q_{t,i}^{\mathrm{ref}}+
\operatorname{clip}(\Delta q_t,l,h)\odot s,
\qquad \Delta q_t\sim\pi_{\mathrm{RL}}(\cdot\mid s_t,i).
$$

其中 $s$ 是残差动作缩放系数，$s_t$ 是仿真特权状态。教师可以观测物体状态、接触力、手部关键点到物体表面的距离等信息。任务奖励追踪示范中的物体运动，关键问题则在于：还需要什么奖励，才能让这一运动可靠地迁移到硬件？

## 对齐奖励在接触发生前准备手指姿态

总奖励结合物体跟踪、接触对齐、持续接触和运动平滑惩罚：

$$
r_t=w_{\mathrm{task}}r_{\mathrm{task}}+
 w_{\mathrm{AR}}r_{\mathrm{AR}}+
 w_{\mathrm{SCR}}r_{\mathrm{SCR}}-w_p p_{\mathrm{smooth}}.
$$

物体跟踪项对平移、旋转及适用时的关节误差施加指数惩罚。它约束预期结果，但仍可能允许不可靠的接触策略。

**对齐奖励 AR** 按论文的手部连杆与物体接触法向约定，计算余弦相似度，在阈值 $b$ 以上重新缩放并截断：

$$
A(u)=\operatorname{clip}\!\left(\frac{u-b}{1-b},0,1\right),
\qquad u=\frac{n_{\mathrm{hand}}\cdot n_{\mathrm{contact}}}
{\|n_{\mathrm{hand}}\|\|n_{\mathrm{contact}}\|}.
$$

这里用 $b$ 表示附录中写作 $s$ 的重缩放参数，避免与动作缩放混淆。AR 对各手部连杆的两项奖励求平均：当前接触位置的对齐，以及与示范中下一次接触位置的对齐。未来项在接触发生前就提供训练信号，让手指以合适姿态接近物体。[§3.1 与附录 A.4](https://arxiv.org/pdf/2609.01938v2#page=15)

## 持续接触奖励约束一个任务阶段内的连续性

**持续接触奖励 SCR** 从示范中分别提取左右手的接触时间窗。设当前窗口长度为 $S$，$c_t$ 为截至当前连续满足最低接触力阈值的步数；一旦接触中断，计数器清零。奖励为：

$$
r_{\mathrm{SCR}}(t)=\frac{c_t(c_t+1)}{S(S+1)},
$$

多个窗口同时有效时取平均。其边际收益随连续接触时间增长。例如，在十步窗口内，连续五步的奖励是 $30/110$，连续十步则为 $1$；多次短暂接触无法保留长接触序列积累的进度。

时间窗限定了需要保持接触的阶段，避免鼓励手无限期抓住物体。力通过最低阈值参与有效接触判定；SCR 并不重建或跟踪示范中的力波形。AR 与 SCR 分别约束接触方向和连续性，补充仅追踪物体轨迹时容易欠约束的部分。[附录 A.4](https://arxiv.org/pdf/2609.01938v2#page=16)

## 将全局引导与局部控制蒸馏到视觉策略

教师执行产生实际关节目标、腕部深度、机器人状态、参考腕部轨迹和初始第一人称 RGB 图像。部署时的底层策略是 Diffusion Policy，预测**绝对关节目标**，输入为腕部深度、本体状态历史和腕部参考轨迹。教师依赖特权状态的残差接口没有直接部署到真机。

另一套 Diffusion Policy 从初始第一人称 RGB 图像预测腕部轨迹。训练时，Cosmos-Transfer-2.5 为仿真图像补充更真实的纹理与背景。执行期间，高层参考保持固定；底层策略持续依据局部观测更新动作。因此，高层引导是开环的，动作执行层是闭环的。[§3.2–3.3](https://arxiv.org/pdf/2609.01938v2#page=5)

FoundationStereo 以 10 Hz 从腕部双目图像估计深度，超过 0.4 米的深度被截断，以聚焦近处几何。底层策略以 30 Hz 生成目标，PD 控制器以 60 Hz 跟踪插值后的目标。这是三个不同的更新频率。部署学生策略不要求显式物体位姿估计或触觉测量，接触信息主要在教师训练中塑造行为。[附录 E–F](https://arxiv.org/pdf/2609.01938v2#page=19)

作者为每项任务分别训练高层与底层策略。对于铰接资产，不同尺度使用独立 RL 教师，再利用其执行数据训练策略。盒子覆盖五种尺度，家电覆盖三种尺度，分别生成 5,000 和 4,200 条底层训练轨迹。“一次示范”描述的是人类参考预算，之后还有大量仿真训练和数据生成；它并不意味着从一个视频直接学出通用策略。

## 带着评分规则阅读 71%

真机实验包含开盒、抬盖、推盒和移瓶四项任务。十六个物体具有不同尺寸、材料和摩擦属性，每个物体评测二十次。硬件由两条 Franka 手臂搭配 Tesollo 或 Sharpa 灵巧手组成。

| 报告指标 | 数值 | 含义 |
| --- | ---: | --- |
| 跨物体总体得分 | 71% | 汇总各任务的完成度评分 |
| Sharpa 子集 | 76% | 使用该手的已测物体与任务得分 |
| Tesollo 子集 | 65% | 使用该手的已测物体与任务得分 |
| 机器人手包装盒，开盒任务 | 39% | 弯曲盖沿改变局部几何的失败案例 |

开盒和抬盖比较实际达到的峰值开合角度与示范值，附录给出的关节评分为：

$$
\max\left(0,1-\frac{|x-x_{\mathrm{demo}}|}{x_{\mathrm{demo}}}\right).
$$

超出和不足都会降低得分。推盒对推动距离采用类似定义；移瓶则对接近、抓住、空中移动、达到最终状态四个阶段各给四分之一分。因此，“71% success”包含部分完成，且不同手的汇总得分不足以建立两种硬件之间的受控优劣排名。[§4.1–4.2 与表 5](https://arxiv.org/pdf/2609.01938v2#page=6)

弯曲盖沿是很有信息量的边界案例：两个物体可以属于同一语义类别，却要求不同的接触几何。只有交互表面与训练经验相容时，方法的迁移假设才更可靠。

## 对照实验分离了什么

奖励对照在两项铰接任务、单一物体尺度上进行。所有方法都生成教师执行数据，再训练同类底层深度策略。真机评测二十次，仿真跨三个随机种子共评测 300 次。因此，该实验检验共同学生训练流程下的教师奖励设计，与十六物体泛化实验属于不同设置。

基线是经过修改的 **DexMachina\*** 和 **HERMES\***，两者都采用作者的残差动作接口。HERMES\* 由作者重新实现，还换用了本文的物体跟踪任务奖励，以支持铰接物体。与原论文比较时，需要保留这些修改条件。[附录 B](https://arxiv.org/pdf/2609.01938v2#page=17)

DemoMimic 在仿真中的分数可能低于基线，但迁移到硬件后表现更好。开盒真机实验中，去掉 SCR 几乎导致所有回合失去接触；去掉 AR 会降低对齐程度，并使力的变化范围更宽。抬盖任务一旦手指进入盖沿下方便更宽容，因此不同版本的掉落率差异较小。这些证据支持对齐与连续性在已测任务中的互补作用；仅看仿真完成度，很难发现这些差别。[图 5–6](https://arxiv.org/pdf/2609.01938v2#page=7)

## 对接触密集策略学习的启发

我最关注的是成功物体轨迹背后的接触策略。由示范提取接触时间窗，可以复用地指定何时必须持续接触；表面对齐则为接触如何开始提供几何约束。当策略靠脆弱接触实现正确的仿真结果时，这两项约束值得单独测试。

方法也有明确边界：高层无法响应初始图像之后的全局场景变化，初始位姿随机化覆盖的工作空间有限，目前只评估四项任务。训练仍依赖难以从任意视频可靠提取的物体参考轨迹。局部几何这一泛化假设的价值，也体现在弯曲盖沿失败案例清楚地暴露了它的适用边界。

与 [FACT](/posts/2026/10/fact-paper-notes/) 对照，DemoMimic 把接触知识写入仿真奖励，再迁移到视觉学生策略；FACT 则使用实测触觉上下文和未来力—动作联合预测。对于没有触觉传感器的部署，DemoMimic 展示了如何在训练阶段让接触影响策略，但尚不能证明视觉反馈可以在各类灵巧操作中替代力感知。

</div>
