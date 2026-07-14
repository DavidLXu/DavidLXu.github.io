---
title: "[Paper Notes] InterMimic: Towards Universal Whole-Body Control for Physics-Based Human-Object Interactions"
date: 2026-07-14
permalink: /posts/2026/07/intermimic-paper-notes/
tags:
  - Human-Object Interaction
  - Physics-Based Animation
  - Reinforcement Learning
  - Motion Imitation
  - Humanoid Control
---

<div data-lang="en" markdown="1">

**InterMimic** learns one physics-based controller for diverse whole-body human-object interactions (HOIs) from imperfect motion-capture data. Its central recipe is **“perfect first, then scale up”**: small teacher policies first retarget and physically repair the captured interactions; a Transformer student then absorbs the teachers' corrected references and actions, followed by reinforcement-learning fine-tuning.

My read: the most important idea is that the teachers are more than action-label generators. Their simulated rollouts become a **cleaner training distribution** for the student. This converts teacher-student learning into two coupled operations—**reference distillation** cleans what the student should track, while **policy distillation** teaches how to track it. PPO then resolves conflicts left by supervised aggregation.

## Paper Info

The paper is **“InterMimic: Towards Universal Whole-Body Control for Physics-Based Human-Object Interactions”** by **Sirui Xu, Hung Yu Ling, Yu-Xiong Wang, and Liang-Yan Gui**, from the University of Illinois Urbana-Champaign and Electronic Arts. It was presented at **CVPR 2025 as a Highlight paper**.

- [Paper (arXiv:2502.20390)](https://arxiv.org/abs/2502.20390)
- [Project page](https://sirui-xu.github.io/InterMimic/)
- [Official code](https://github.com/Sirui-Xu/InterMimic)

## The Problem: Large HOI Data Is Useful and Physically Messy

Physics-based motion imitation usually asks a simulated character to follow a reference trajectory. Human-object interaction raises the difficulty because errors couple across the body and the object. A floating hand contact can make the object fall; an inaccurate symmetric-object rotation can imply sliding; shape differences between captured subjects and the simulated body can destroy a valid interaction after retargeting. Many HOI datasets also omit detailed finger motion.

The target trajectory contains human and object states:

\[
q_t = \{q_t^h,q_t^o\},
\qquad
q_t^h=\{\theta_t^h,p_t^h\},
\qquad
q_t^o=\{\theta_t^o,p_t^o\}.
\]

The human model has 52 joints: 22 body joints and 30 hand joints. Fifty-one joints are actuated, and the action

\[
a_t\in\mathbb{R}^{51\times 3}
\]

specifies exponential-map joint targets that a PD controller converts into torques. The objective is therefore richer than pose matching: the controller must preserve the interaction outcome while repairing reference errors and accommodating a new embodiment.

## The Two-Stage Curriculum

| Stage | Model | Training signal | Main job |
|---|---|---|---|
| 1. Perfect | Subject-specific MLP teachers | PPO with tracking, contact, and energy rewards | Retarget and physically refine small data subsets |
| 2. Scale | One Transformer student | Refined references, teacher actions, DAgger, then PPO | Integrate many subjects, objects, and interaction skills |

The decomposition is a space-time trade-off. Seventeen OMOMO teacher policies can be trained on subject-sized subsets in parallel. Their experience then bootstraps one large student, avoiding the sample cost of discovering every skill through PPO from scratch.

## Policy Inputs: Geometry, Contact, and Future Goals

The policy state has a physical-state component (s_t^s) and a goal component (s_t^g):

\[
s_t=\{s_t^s,s_t^g\}.
\]

The physical state contains human and object poses and velocities, plus two interaction descriptors:

- (d_t): vectors from human joints to the nearest points on each object surface;
- (c_t): body-part contact markers derived from applied forces.

The goal provides relative and absolute reference information at several future keyframes. Teachers use offsets (K=\{1,16\}); the student uses (K=\{1,2,4,16\}). The longer temporal context helps the student distinguish skills that look locally similar but require different future actions.

Most MoCap datasets have no reliable contact labels. InterMimic infers reference contact using object acceleration as evidence of human-applied force, then combines it with distance thresholds. Contacts fall into three zones: promote, neutral, or penalize. The neutral buffer is important because a noisy reference distance should not become a rigid physical constraint.

## Stage 1: Imitation as Retargeting and Perfecting

Each teacher uses the same canonical human model while learning data from one captured subject. This embeds retargeting inside RL. The paper separates the reward into two kinds of evidence.

**Embodiment-aware terms** loosely preserve the captured kinematics. Joint-position tracking receives more weight near an object, where spatial precision controls contact; joint-rotation tracking dominates farther away. Joint-to-object distance tracking preserves the interaction layout.

**Embodiment-agnostic terms** preserve the interaction dynamics through object position and rotation tracking, promoted or penalized contacts, and energy penalties. The authors' assumption is that body shape may change the exact kinematic trajectory while the human-object dynamics should remain consistent.

For a tracking cost (E), each corresponding reward takes the exponential form

\[
R_E=\exp(-\lambda E).
\]

The complete scalar reward combines human pose, interaction distance, object pose, contact, and energy terms. The contact-energy penalty discourages abrupt forces and jitter.

### Recovering Missing Hand Interaction

OMOMO and BEHAVE often contain averaged or flattened hand poses. When a fingertip or palm lies close to an object, InterMimic activates a hand contact target and lets PPO discover a workable grasp under hand range-of-motion constraints. This recovers functional contact for the paper's relatively low-dexterity tasks; it does not reconstruct precise captured finger articulation.

### Physical State Initialization (PSI)

Reference State Initialization (RSI) starts an episode from a random MoCap frame. With faulty contacts, that frame may already be dynamically unrecoverable: the object drops immediately, or a floating hand cannot reach it in time.

PSI maintains an initialization buffer containing raw reference states and successful simulation states from earlier rollouts. After a rollout, high-return trajectory states enter the FIFO buffer. Future episodes can therefore begin from states that are close to the intended phase and physically achievable. PSI preserves access to later motion phases without repeatedly initializing the simulator inside broken reference configurations.

### Interaction Early Termination (IET)

Standard motion-imitation termination checks character deviation and unwanted ground contacts. IET adds HOI-specific failure tests. An episode ends when:

1. mean object-point deviation exceeds 0.5 m;
2. the weighted joint-to-object distance differs from the reference by more than 0.5 m; or
3. a required body-object contact is absent for over 10 consecutive frames.

This keeps PPO from spending rollout budget after the interaction has already failed.

## Stage 2: Two Forms of Distillation

After teacher training, the teachers are frozen and rolled out online. Their trajectories provide both states (s^{(T)}) and actions (a^{(T)}).

### Reference Distillation

Teacher simulation states replace noisy MoCap states when constructing the student's goal and reward. This transfers corrected contacts, feasible hand placement, a canonical embodiment, and physically consistent object motion. The student learns from references that its simulator can actually realize.

### Policy Distillation and RL Fine-Tuning

The teacher actions supervise the student through behavior cloning and DAgger. Training gradually shifts toward PPO:

\[
\mathcal{L}_t
=
w_t\mathcal{L}_{\mathrm{PPO}}
+
(1-w_t)\lVert a^{(S)}-a^{(T)}\rVert,
\qquad
w_t\uparrow 1.
\]

Early supervision provides efficient skill acquisition. Later PPO updates optimize the actual interaction reward and resolve ambiguous supervision, such as different teachers choosing different controls for similar observed states. The critic is trained throughout this transition.

The teachers are three-hidden-layer MLPs with widths 1024, 1024, and 512. The student uses a three-layer Transformer encoder with four heads, hidden size 256, and feed-forward size 512. All controllers run at 30 Hz in Isaac Gym.

## Experiments

InterMimic draws on OMOMO, BEHAVE, HODome, IMHD, and HIMO. OMOMO is the main large-scale benchmark, with 15 objects and about 10 hours of motion. The authors train 17 subject-specific teachers, reserve subject 14 as the test subject, and discard a small amount of severely corrupted data that the teachers cannot repair.

The metrics measure success rate, imitation duration before IET, human joint-position error (E_h), and object point-position error (E_o).

### Teacher-Level Correction

On one BEHAVE subject interacting with a yoga mat, the full teacher substantially improves over SkillMimic:

| Method | Duration ↑ | (E_h) (cm) ↓ | (E_o) (cm) ↓ |
|---|---:|---:|---:|
| SkillMimic | 12.2 | 7.2 | 13.4 |
| InterMimic without IET | 40.3 | 6.7 | 9.9 |
| InterMimic without PSI | 36.1 | 6.6 | 10.2 |
| InterMimic | **42.6** | **6.4** | **9.2** |

Both PSI and IET contribute. The qualitative examples show the controller correcting floating contacts, misplaced hands, and implausible rotations of symmetric objects.

### Student Scaling and Generalization

Direct PPO on raw MoCap reaches only **9.6% success** on the held-out OMOMO subject. The complete Transformer student reaches **98.1%**, with 176.5 seconds of tracked duration, 5.9 cm human error, and 11.3 cm object error. The full MLP student scores 95.5% on the same split, while the Transformer has the best test success and improves results on the InterDiff-generated references.

The broader table adds useful nuance. A ten-times-heavier-object test remains hard: the Transformer student's success falls to **56.8%**. Text-conditioned HOI-Diff references are harder still, with **12.5%** success. On future interactions generated by InterDiff, success reaches **76.7%**. These experiments support zero-shot compatibility with new references and geometries, while also showing that “universal” does not mean uniformly solved.

## What the Ablations Say

The ablations give each training component a distinct role:

- **PSI** makes later and contact-sensitive motion phases reachable during training.
- **IET** removes rollouts whose human-object relationship has already broken.
- **Reference distillation** produces a large gain on the held-out body shape because the teachers have already retargeted all references to one embodiment.
- **Policy distillation** supplies a scalable supervised starting point.
- **PPO fine-tuning** resolves teacher conflicts and improves beyond demonstration averaging.
- **The Transformer** benefits from denser future keyframes and temporal modeling, especially on held-out and generated references.

This separation is a major strength of the paper: data repair, optimization efficiency, and policy capacity are handled by different mechanisms with corresponding measurements.

## Limitations

The supplementary material identifies several concrete boundaries:

1. Teachers fail when a reference contains too many severe errors, such as a flipped hand. Those clips are filtered before student training.
2. The simulator can produce unnatural object support through penetration. Contact-energy penalties reduce the problem but do not eliminate it.
3. Hand recovery works for the evaluated tasks and may be insufficient for dexterous manipulation requiring detailed finger motion.
4. Soft-body interactions, such as carrying a bag by its strap, are excluded because the simulator lacks suitable support.
5. Generalization still depends on coverage. More diverse objects and motions should improve performance, and the heavy-object and HOI-Diff results leave substantial room for progress.

The real-humanoid demonstrations are best read as evidence that the formulation can transfer to a Unitree G1 embodiment. The paper's main quantitative claims concern physics simulation, so broad real-world robustness remains open.

## Takeaways

InterMimic offers a reusable recipe for learning control from imperfect motion data:

1. use small experts to turn noisy kinematic demonstrations into feasible physical trajectories;
2. distill both the corrected **targets** and the expert **actions**;
3. transition from imitation to reward optimization as the student becomes competent;
4. encode geometry and contact explicitly so one controller can span object shapes and interaction modes.

The conceptual shift is subtle and valuable. The MoCap sequence becomes a task specification with uncertain measurements. Physics-based RL is allowed to modify the path while preserving the interaction, and the corrected simulations become the dataset used for scale.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**InterMimic** 从不完美的动作捕捉数据中学习一个统一的物理控制器，覆盖多种全身人-物交互（Human-Object Interaction, HOI）。它的核心路线是 **“先完善，再扩展”（perfect first, then scale up）**：小规模教师策略先对交互动作进行重定向和物理修正，Transformer 学生再吸收教师生成的修正版参考轨迹与控制动作，最后通过强化学习继续优化。

我的理解是：教师的价值远超动作标签生成。教师在仿真器中的 rollout 为学生构造了一个**更干净的训练分布**。教师-学生学习因此包含两个相互配合的过程：**参考蒸馏**负责修正“学生应该跟踪什么”，**策略蒸馏**负责传递“应该怎样跟踪”；PPO 随后处理监督聚合遗留的策略冲突。

## 论文信息

论文题目为 **“InterMimic: Towards Universal Whole-Body Control for Physics-Based Human-Object Interactions”**，作者是 **Sirui Xu、Hung Yu Ling、Yu-Xiong Wang 和 Liang-Yan Gui**，来自伊利诺伊大学厄巴纳-香槟分校与 Electronic Arts。论文发表于 **CVPR 2025，并入选 Highlight**。

- [论文（arXiv:2502.20390）](https://arxiv.org/abs/2502.20390)
- [项目主页](https://sirui-xu.github.io/InterMimic/)
- [官方代码](https://github.com/Sirui-Xu/InterMimic)

## 问题：大规模 HOI 数据很有价值，也存在物理缺陷

物理运动模仿通常要求仿真角色跟踪参考轨迹。进入人-物交互后，误差会沿人体与物体的耦合关系传播：悬空的手部接触可能让物体掉落；对称物体的错误旋转可能表现为贴地滑动；被采集者和仿真人体之间的体型差异也会让原本有效的交互在重定向后失效。许多 HOI 数据集还缺少细致的手指动作。

目标轨迹同时包含人体和物体状态：

\[
q_t = \{q_t^h,q_t^o\},
\qquad
q_t^h=\{\theta_t^h,p_t^h\},
\qquad
q_t^o=\{\theta_t^o,p_t^o\}.
\]

人体模型共有 52 个关节，包括 22 个身体关节和 30 个手部关节。其中 51 个关节可驱动，动作

\[
a_t\in\mathbb{R}^{51\times 3}
\]

表示指数映射形式的关节目标，随后由 PD 控制器转换为关节力矩。因此，学习目标需要同时完成姿态跟踪、参考误差修复、接触结果保持和跨体型适配。

## 两阶段课程

| 阶段 | 模型 | 训练信号 | 主要任务 |
|---|---|---|---|
| 1. 完善 | 按被试划分的 MLP 教师 | PPO、跟踪奖励、接触奖励、能量奖励 | 对小数据子集进行重定向和物理修正 |
| 2. 扩展 | 单一 Transformer 学生 | 修正版参考、教师动作、DAgger、PPO | 整合多被试、多物体和多类交互技能 |

这种拆分形成了空间换时间的训练方式。17 个 OMOMO 教师可以分别在被试级数据子集上并行学习，再由一个大规模学生吸收它们的经验，减少学生从零开始通过 PPO 探索全部技能的样本成本。

## 策略输入：几何、接触与未来目标

策略状态由物理状态 (s_t^s) 和目标状态 (s_t^g) 组成：

\[
s_t=\{s_t^s,s_t^g\}.
\]

物理状态包含人体和物体的姿态与速度，还包含两类交互描述：

- (d_t)：从人体各关节指向物体表面最近点的向量；
- (c_t)：依据受力判断的身体部位接触标记。

目标状态在多个未来关键帧上提供相对和绝对参考信息。教师使用 (K=\{1,16\})，学生使用 (K=\{1,2,4,16\})。学生获得更密集的时间上下文后，可以区分局部状态相似、后续动作不同的交互技能。

大多数 MoCap 数据没有可靠的接触标签。InterMimic 把物体加速度作为人体施力的证据，再与距离阈值结合，推断参考接触。接触标签分为促进、缓冲和惩罚三个区域。缓冲区可以避免把有噪声的参考距离强行变成严格的物理约束。

## 第一阶段：把模仿作为重定向与完善

每个教师都使用相同的规范人体模型，同时学习一个被试的数据，重定向过程由此直接进入 RL 训练。论文将奖励中的证据分为两类。

**与 embodiment 相关的奖励**对采集运动学进行宽松保持。人体靠近物体时，关节位置跟踪的权重更高，因为空间精度决定能否建立接触；远离物体时，关节旋转跟踪占据更高权重。关节到物体的距离奖励用于保持交互布局。

**与 embodiment 无关的奖励**通过物体位置、物体旋转、接触促进或惩罚以及能量约束来保持交互动力学。作者的基本假设是：体型变化会改变具体的运动学轨迹，而人体与物体之间的动力学关系应保持一致。

对任意跟踪代价 (E)，对应奖励采用指数形式：

\[
R_E=\exp(-\lambda E).
\]

最终标量奖励综合人体姿态、交互距离、物体姿态、接触和能量等部分。接触能量惩罚用于抑制突发大力和抖动。

### 恢复缺失的手部交互

OMOMO 和 BEHAVE 中的手部姿态经常经过平均化或被压平。只要指尖或手掌靠近物体，InterMimic 就激活手部接触目标，让 PPO 在手部运动范围约束下搜索可用的抓持方式。该方法可以为论文中的低灵巧度任务恢复功能性接触，但无法还原精确的被采集手指关节运动。

### Physical State Initialization（PSI）

Reference State Initialization（RSI）从随机 MoCap 帧启动 episode。当这一帧存在错误接触时，初始状态在动力学上可能已经无法挽回，例如物体立即掉落，或悬空的手无法及时到达物体。

PSI 维护一个初始化缓冲区，其中同时保存原始参考状态和此前 rollout 中成功的仿真状态。一次 rollout 结束后，高回报轨迹中的状态进入 FIFO 缓冲区。后续 episode 因而能够从接近目标动作阶段、同时满足物理可达性的状态启动。这样可以继续学习轨迹后段和接触敏感阶段，也减少了从破损参考状态重复初始化的次数。

### Interaction Early Termination（IET）

常规运动模仿会在角色偏离过大或发生非计划地面接触时终止。IET 增加三项 HOI 失败条件：

1. 物体表面点的平均偏差超过 0.5 m；
2. 加权关节-物体距离相对参考值的偏差超过 0.5 m；
3. 参考要求的身体-物体接触连续缺失超过 10 帧。

当交互关系已经失效时，IET 会停止 episode，避免继续消耗 PPO rollout 预算。

## 第二阶段：两种蒸馏

教师训练完成后参数被冻结，并在线生成 rollout。教师轨迹同时提供状态 (s^{(T)}) 和动作 (a^{(T)})。

### 参考蒸馏

构造学生的目标与奖励时，教师仿真状态替代带噪声的 MoCap 状态。学生得到的参考已经包含修正后的接触、可行的手部位置、统一的人体 embodiment 和物理一致的物体运动。这些目标在学生所处的仿真器中具有实际可实现性。

### 策略蒸馏与 RL 微调

教师动作通过行为克隆和 DAgger 监督学生，训练过程逐渐转向 PPO：

\[
\mathcal{L}_t
=
w_t\mathcal{L}_{\mathrm{PPO}}
+
(1-w_t)\lVert a^{(S)}-a^{(T)}\rVert,
\qquad
w_t\uparrow 1.
\]

早期监督让学生高效获得技能，后期 PPO 直接优化交互奖励，并处理模糊监督。例如，当多个教师对相似状态输出不同控制动作时，PPO 可以帮助学生选择更高回报的解。Critic 在整个过渡过程中持续训练。

教师是三层隐藏层 MLP，宽度分别为 1024、1024 和 512。学生使用三层 Transformer Encoder，包含 4 个注意力头、256 维隐藏层和 512 维前馈层。所有控制器均在 Isaac Gym 中以 30 Hz 运行。

## 实验

InterMimic 使用 OMOMO、BEHAVE、HODome、IMHD 和 HIMO。OMOMO 是主要的大规模评测数据集，包含 15 种物体和约 10 小时运动。作者训练 17 个按被试划分的教师，将 14 号被试留作测试，并丢弃少量教师也无法修复的严重损坏数据。

评测指标包括成功率、触发 IET 前的持续模仿时间、人体关节位置误差 (E_h) 和物体表面点位置误差 (E_o)。

### 教师级修正能力

在 BEHAVE 中单一被试与瑜伽垫交互的实验上，完整教师相对 SkillMimic 有明显提升：

| 方法 | 持续时间 ↑ | (E_h)（cm）↓ | (E_o)（cm）↓ |
|---|---:|---:|---:|
| SkillMimic | 12.2 | 7.2 | 13.4 |
| InterMimic 去掉 IET | 40.3 | 6.7 | 9.9 |
| InterMimic 去掉 PSI | 36.1 | 6.6 | 10.2 |
| InterMimic | **42.6** | **6.4** | **9.2** |

PSI 和 IET 都有独立贡献。定性结果还展示了控制器对悬空接触、错误手部位置和对称物体不合理旋转的修正。

### 学生的扩展能力与泛化

直接在原始 MoCap 上运行 PPO，在 OMOMO 留出被试上只有 **9.6% 成功率**。完整 Transformer 学生达到 **98.1%**，持续跟踪时间为 176.5 秒，人体误差为 5.9 cm，物体误差为 11.3 cm。完整 MLP 学生在相同划分上的成功率为 95.5%；Transformer 在测试成功率上更高，并改善了对 InterDiff 生成参考的执行效果。

完整表格也揭示了边界。在物体质量放大十倍的测试中，Transformer 学生成功率下降到 **56.8%**。文本条件 HOI-Diff 生成的参考更难，成功率为 **12.5%**。对 InterDiff 预测的未来交互，成功率达到 **76.7%**。这些结果支持策略对新参考和新几何的零样本兼容性，同时说明 “universal” 仍然对应一个尚未均匀解决的目标。

## 消融实验揭示了什么

各组件在消融实验中承担不同职责：

- **PSI** 让轨迹后段和接触敏感阶段在训练中真正可达；
- **IET** 及时停止人体-物体关系已经破坏的 rollout；
- **参考蒸馏**先将所有参考重定向到统一 embodiment，因此在留出体型上带来显著提升；
- **策略蒸馏**提供可扩展的监督学习起点；
- **PPO 微调**处理教师冲突，并突破动作平均化带来的性能上限；
- **Transformer**利用更密集的未来关键帧和时序建模，在留出参考与生成参考上更有优势。

这种职责分解是论文的一项重要优点：数据修复、优化效率与策略容量分别由不同机制处理，并得到对应实验验证。

## 局限性

补充材料明确给出了几项边界：

1. 当参考中包含过多严重错误时，教师也会失败，例如手掌方向完全翻转。这类片段会在学生训练前被过滤。
2. 仿真器有时会通过物体穿透产生不自然的支撑。接触能量惩罚可以缓解，但无法彻底消除。
3. 手部恢复适用于论文评测的任务，对需要精细手指运动的灵巧操作可能不足。
4. 由于仿真器缺少合适的软体支持，论文排除了通过包带提包等交互。
5. 泛化能力仍受数据覆盖范围影响。增加物体和动作多样性有望继续提升性能；重物体和 HOI-Diff 实验仍有很大改进空间。

真实人形机器人演示说明该建模方式可以迁移到 Unitree G1 embodiment。论文的核心定量结论来自物理仿真，因此大范围真实环境鲁棒性仍是开放问题。

## 总结

InterMimic 给出了一套可复用的不完美运动数据学习方案：

1. 用小型专家把带噪声的运动学示范转换为物理可行轨迹；
2. 同时蒸馏修正后的**目标**和专家的**动作**；
3. 随着学生能力提升，从动作模仿逐步转向奖励优化；
4. 显式编码物体几何与接触，让单一控制器覆盖多种物体形状和交互模式。

其中的观念转变很有价值：MoCap 序列被视为带有测量不确定性的任务规格。物理 RL 可以在保持交互结果的前提下修改执行路径，修正后的仿真轨迹再成为规模化学习使用的数据集。

</div>
