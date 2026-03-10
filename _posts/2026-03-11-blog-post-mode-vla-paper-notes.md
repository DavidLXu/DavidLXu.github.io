---
title: "[Paper Notes] Towards Human-Like Manipulation through RL-Augmented Teleoperation and Mixture-of-Dexterous-Experts VLA"
date: 2026-03-11
permalink: /posts/2026/03/mode-vla-paper-notes/
tags:
  - Robotics
  - Vision-Language-Action
  - Dexterous Manipulation
  - Bimanual Manipulation
  - Teleoperation
  - Tactile Sensing
  - Reinforcement Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

This paper pushes VLA-style robot control toward **human-like bimanual dexterous manipulation**. The core idea is to split the problem into two parts:

- **IMCopilot**: RL-trained in-hand manipulation skills that both assist humans during teleoperation and act as callable low-level skills during inference
- **MoDE-VLA**: a VLA architecture that injects **force and tactile feedback** into a pretrained backbone through a dedicated sparse-expert pathway

The result is a system that can handle harder contact-rich tasks such as **gear assembly, charger plugging, tube rearranging, and apple peeling**, with a clear gain over the baseline `pi_0` backbone.

## Paper Info

- **Title**: Towards Human-Like Manipulation through RL-Augmented Teleoperation and Mixture-of-Dexterous-Experts VLA
- **Authors**: Tutian Tang, Xingyu Ji, Wanli Xing, Ce Hao, Wenqiang Xu, Lin Shao, Cewu Lu, Qiaojun Yu, Jiangmiao Pang, Kaifeng Zhang
- **arXiv**: [2603.08122](https://arxiv.org/abs/2603.08122)
- **Topic**: dexterous manipulation, multimodal VLA, force/tactile fusion, shared-autonomy teleoperation

## 1. Motivation

Most successful VLAs still operate in a relatively easy regime:

- low-DoF grippers
- visually guided actions
- limited contact reasoning

This paper focuses on the harder setting of **63-DoF bimanual dexterous manipulation**, where the robot must coordinate:

- visual perception
- language-conditioned task execution
- arm torques and contact forces
- fingertip tactile feedback
- in-hand object rotation and grasp stabilization

The authors argue that current VLA pipelines break down here for three reasons:

1. **Data collection is too hard**: direct teleoperation of high-DoF bimanual systems is cognitively demanding.
2. **One policy struggles to cover all skills**: gross motion, insertion, peeling, and in-hand rotation are qualitatively different.
3. **Force/tactile inputs are not easy to fuse**: naive concatenation can hurt a pretrained VLA rather than help it.

## 2. Core Idea

The framework combines two complementary components:

### 2.1 IMCopilot

`IMCopilot` is a set of RL-trained atomic in-hand manipulation skills, especially:

- stable grasp maintenance
- in-hand object rotation around a target axis

It serves two roles:

- **during teleoperation**: the operator controls gross motion and triggers IMCopilot through foot pedals for difficult in-hand phases
- **during inference**: the high-level VLA emits a trigger signal, and IMCopilot takes over hand-level control when needed

This is a practical shared-autonomy design. Instead of forcing the human or the VLA to solve every dexterous subproblem directly, the system delegates the hardest contact-rich finger coordination to a specialized low-level controller.

### 2.2 MoDE-VLA

`MoDE-VLA` stands for **Mixture-of-Dexterous-Experts VLA**. It extends a pretrained VLA backbone with a modality-specific branch for:

- **force**: arm joint torque readings
- **tactile**: 6-DoF force/wrench readings from ten fingertip sensors

The design has three important pieces:

1. **Dedicated pathway** for force and tactile tokens instead of naive state concatenation
2. **Sparse MoE routing** so different experts can specialize to different contact regimes
3. **Residual injection** so multimodal corrections refine the pretrained action prediction rather than overwrite it

This is the architectural part I found most convincing. The paper is not just saying "more sensors help"; it explains why these sensors should be routed differently because arm-level torques and fingertip contact patterns carry different physical meanings.

## 3. Method Details

## 3.1 Platform and sensing

The robot platform includes:

- dual 7-DoF arms
- dual 22-DoF dexterous hands
- fingertip tactile sensors on all ten fingers
- stereo head cameras and wrist cameras

The data collection setup uses:

- upper-body exoskeleton
- exoskeleton gloves
- VR headset
- force/tactile visualization in VR
- vibrotactile fingertip feedback

This makes the teleoperation system much richer than vision-only data collection.

## 3.2 RL training for IMCopilot

IMCopilot skills are trained in simulation with PPO and teacher-student distillation.

The policy observes:

- short proprioceptive history
- fingertip contact forces
- target rotation axis

The reward encourages:

- rotation around the desired axis
- low unwanted linear motion
- low torque and joint work
- stable motion

The high-level takeaway is simple: the paper isolates in-hand dexterity as a reusable skill module instead of expecting the VLA to learn everything end-to-end from limited demonstrations.

## 3.3 MoDE-VLA action generation

The base VLA is built on a pretrained `pi_0`-style flow-matching backbone. MoDE adds force and tactile tokens, lets them interact with the backbone through self-attention, routes them through sparse experts, and then generates residual corrections.

The paper uses:

- `E = 8` experts
- `top-k = 1` routing
- action horizon `H = 50`
- `N = 10` Euler denoising steps at inference

The action vector contains:

- arm actions
- hand actions
- other actions including waist motion
- an **IMCopilot trigger scalar**

When the trigger is active, hand actions are delegated to IMCopilot.

## 4. Experiments and Main Results

The paper evaluates four contact-rich tasks:

- **Apple Peeling**
- **Tube Rearranging**
- **Gear Assembling**
- **Charger Plugging**

All methods are evaluated over 20 trials per task.

## 4.1 Teleoperation benefits from force/tactile feedback

The paper reports that force/tactile feedback improves demonstration quality and collection efficiency. One example given is **Gear Assembling**:

- without feedback: 100 trials in 75 minutes, 85 successful demonstrations
- with feedback: 100 trials in 65 minutes, 93 successful demonstrations

That is a practical result: multimodal sensing helps before learning even starts.

## 4.2 IMCopilot strongly improves in-hand rotation

For in-hand manipulation, plain teleoperation is much weaker than IMCopilot:

- **Ping-pong ball**: 10% -> 83%
- **Tennis ball**: 67% -> 93%
- **Apple**: 27% -> 90%
- **Overall**: 34% -> 89%

This is one of the clearest findings in the paper. The authors are not just using RL as a benchmark skill; they show it directly fixes a bottleneck in data acquisition.

## 4.3 MoDE-VLA vs. baseline

Compared with the pretrained backbone `pi_0`, the proposed method improves average success rate from **15%** to **34%** across the four tasks.

Task-level results:

- **Apple Peeling**: task failure for baseline, proposed method reaches **30% SR** and **73% peel completion ratio**
- **Tube Rearranging**: **8% -> 30%**
- **Gear Assembling**: **40% -> 60%**
- **Charger Plugging**: **5% -> 15%**

The absolute numbers are still modest, especially for the hardest tasks, but the direction is consistent: contact-aware sensing plus skill hierarchy helps.

## 4.4 Ablations

The ablations show each component matters:

- **without force**: average SR drops to **23%**
- **without tactile**: average SR drops to **26%**
- **without IMCopilot**: apple peeling PCR drops from **73%** to **25%**

Interpretation:

- force matters most for insertion and contact onset
- tactile helps with slip-sensitive hand interactions
- IMCopilot is crucial for the peel-and-rotate loop

## 5. Why This Paper Is Interesting

I think the strongest aspect of the paper is its **systems framing**.

A lot of VLA work assumes that scaling a single end-to-end policy is enough. This paper takes a different position:

- use **teleoperation**, but augment it with autonomy
- use a **pretrained VLA**, but refine it with modality-aware residual experts
- use **end-to-end action generation**, but keep a specialized low-level controller for in-hand dexterity

That feels much closer to how capable robotic systems will likely be built in practice.

## 6. Limitations

A few limitations are worth keeping in mind:

- the final success rates are still not high enough for robust deployment
- evaluation covers only **four tasks**
- the system depends on specialized hardware: dexterous hands, tactile sensors, exoskeletons, and VR teleoperation
- IMCopilot currently focuses on a small set of atomic in-hand skills rather than a broad manipulation library

So this is better viewed as a strong research prototype than a general-purpose deployment recipe.

## 7. My Takeaways

- **Shared autonomy is a good data strategy** for dexterous manipulation. Humans do not need to control every fine contact event manually.
- **Force and tactile signals should not be fused naively** into a pretrained VLA. The modality-specific residual path is a sensible design.
- **Hierarchical skill invocation** is probably necessary for long-horizon dexterous tasks such as peeling, tool use, and regrasping.
- The paper is especially relevant if you care about the next step beyond simple gripper-based VLA benchmarks.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇文章支持通过网站顶部语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

这篇论文尝试把 VLA 风格的机器人控制推进到更接近 **人类双手灵巧操作** 的阶段。核心思路是把问题拆成两部分：

- **IMCopilot**：一组通过强化学习训练得到的手内操作技能，既能在遥操作时辅助人类，也能在推理时作为可调用的底层技能
- **MoDE-VLA**：一种把 **力觉与触觉信号** 通过专门稀疏专家路径注入到预训练 VLA 主干中的架构

最终系统可以处理更难的接触丰富任务，例如 **齿轮装配、充电器插接、试管整理和苹果削皮**，相较基线 `pi_0` 有明显提升。

## 论文信息

- **标题**: Towards Human-Like Manipulation through RL-Augmented Teleoperation and Mixture-of-Dexterous-Experts VLA
- **作者**: Tutian Tang, Xingyu Ji, Wanli Xing, Ce Hao, Wenqiang Xu, Lin Shao, Cewu Lu, Qiaojun Yu, Jiangmiao Pang, Kaifeng Zhang
- **arXiv**: [2603.08122](https://arxiv.org/abs/2603.08122)
- **主题**: 灵巧操作、多模态 VLA、力觉/触觉融合、共享自主遥操作

## 1. 研究动机

目前很多成功的 VLA 系统仍主要工作在相对简单的设定下：

- 低自由度夹爪
- 以视觉为主的动作执行
- 对接触过程的建模较弱

而这篇论文关注的是更难的 **63 自由度双臂双手灵巧操作**，机器人需要同时处理：

- 视觉感知
- 语言条件任务执行
- 机械臂扭矩和接触力
- 指尖触觉反馈
- 手内旋转与抓握稳定

作者认为现有 VLA 在这里失效主要有三个原因：

1. **数据采集太难**：高自由度双手系统的直接遥操作认知负担极大。
2. **单一策略难以覆盖所有技能阶段**：大范围移动、插入、削皮、手内旋转本质上是不同类型的技能。
3. **力觉/触觉难以直接融合**：简单拼接到预训练 VLA 输入里，往往会破坏而不是提升性能。

## 2. 核心方法

整个框架由两个互补部分组成：

### 2.1 IMCopilot

`IMCopilot` 是一组通过 RL 学到的基础手内操作技能，重点包括：

- 稳定抓持
- 围绕目标轴的手内物体旋转

它承担双重角色：

- **在遥操作阶段**：操作者负责大范围动作，通过脚踏板触发 IMCopilot 完成困难的手内阶段
- **在自主执行阶段**：高层 VLA 输出触发信号，在需要时把手部控制切换给 IMCopilot

这是一个很务实的共享自主设计。作者并没有强迫人类或 VLA 自己解决所有高难度手指协调问题，而是把最难的接触丰富手内控制交给专门的底层技能。

### 2.2 MoDE-VLA

`MoDE-VLA` 即 **Mixture-of-Dexterous-Experts VLA**。它在预训练 VLA 主干上增加了针对以下两类信号的专门分支：

- **力觉**：双臂关节扭矩读数
- **触觉**：十个指尖传感器的 6-DoF 力/力矩读数

设计上有三个关键点：

1. **专门通路**：不把力觉和触觉当成普通状态直接拼接
2. **稀疏 MoE 路由**：让不同专家专门处理不同接触阶段
3. **残差注入**：多模态信号只做修正，不覆盖预训练主干的能力

我认为这是论文最有说服力的部分。它不是简单地说“多传感器更好”，而是解释了为什么机械臂扭矩和指尖接触模式具有不同物理语义，因此应区别处理。

## 3. 方法细节

## 3.1 平台与传感

机器人平台包括：

- 双 7 自由度机械臂
- 双 22 自由度灵巧手
- 十个手指都带指尖触觉传感器
- 头部双目相机与腕部相机

数据采集系统包括：

- 上半身外骨骼
- 外骨骼手套
- VR 头显
- VR 中显示力觉/触觉可视化
- 指尖振动反馈

因此，这套遥操作系统比纯视觉采集方式丰富得多。

## 3.2 IMCopilot 的强化学习训练

IMCopilot 技能在仿真中使用 PPO 和 teacher-student 蒸馏训练。

策略输入包括：

- 短时历史本体状态
- 指尖接触力
- 目标旋转轴

奖励函数鼓励：

- 围绕目标轴旋转
- 减少不必要的线速度
- 降低扭矩和关节功耗
- 保持动作稳定

从更高层看，这篇论文把“手内灵巧操作”抽成一个可复用技能模块，而不是指望 VLA 仅凭有限示范端到端学会一切。

## 3.3 MoDE-VLA 的动作生成

基础 VLA 使用的是预训练 `pi_0` 风格的 flow-matching 主干。MoDE 在此基础上加入力觉与触觉 token，通过自注意力与主干特征交互，再经过稀疏专家路由后生成残差修正。

论文中使用：

- `E = 8` 个专家
- `top-k = 1` 路由
- 动作时域长度 `H = 50`
- 推理时 `N = 10` 步 Euler 去噪

动作向量包含：

- 机械臂动作
- 手部动作
- 其他动作（包括腰部）
- 一个 **IMCopilot 触发标量**

当触发信号有效时，手部动作由 IMCopilot 接管。

## 4. 实验与主要结果

论文评估了四个接触丰富任务：

- **苹果削皮**
- **试管整理**
- **齿轮装配**
- **充电器插接**

每个任务都进行了 20 次试验。

## 4.1 力觉/触觉反馈改善遥操作

论文显示，力觉和触觉反馈能提升示范质量与采集效率。以 **齿轮装配** 为例：

- 无反馈：100 次试验耗时 75 分钟，成功示范 85 次
- 有反馈：100 次试验耗时 65 分钟，成功示范 93 次

这说明多模态传感在“学习之前”的数据采集阶段就已经带来实际收益。

## 4.2 IMCopilot 显著提升手内旋转

在手内操作上，纯遥操作远弱于 IMCopilot：

- **乒乓球**：10% -> 83%
- **网球**：67% -> 93%
- **苹果**：27% -> 90%
- **总体**：34% -> 89%

这是论文里最清晰的结果之一。作者并不是把 RL 技能仅作为一个对照，而是明确证明它解决了数据采集中的关键瓶颈。

## 4.3 MoDE-VLA 相比基线的效果

与预训练主干 `pi_0` 相比，方法在四个任务上的平均成功率从 **15%** 提升到 **34%**。

各任务结果如下：

- **苹果削皮**：基线完全失败，本文方法达到 **30% 成功率**，**73% 削皮完成率**
- **试管整理**：**8% -> 30%**
- **齿轮装配**：**40% -> 60%**
- **充电器插接**：**5% -> 15%**

虽然绝对数值仍然不算高，尤其是最难任务上，但趋势很一致：接触感知加上技能层次结构确实有效。

## 4.4 消融实验

消融结果说明每个组件都有贡献：

- **去掉力觉**：平均成功率降到 **23%**
- **去掉触觉**：平均成功率降到 **26%**
- **去掉 IMCopilot**：苹果削皮完成率从 **73%** 降到 **25%**

可以这样理解：

- 力觉对插入类任务最关键，因为它负责接触建立与柔顺控制
- 触觉对防滑和手部接触稳定更重要
- IMCopilot 对削皮这种“削一下再旋转一下”的循环尤其关键

## 5. 为什么这篇论文值得关注

我认为这篇论文最强的地方在于它的 **系统性视角**。

很多 VLA 工作默认只要放大单一端到端策略就够了，而这篇文章采取的是另一条路线：

- 使用 **遥操作**，但通过共享自主增强它
- 使用 **预训练 VLA**，但通过多模态残差专家来修正它
- 使用 **端到端动作生成**，但保留专门的底层手内技能控制器

这更像是真实可落地机器人系统会采用的构建方式。

## 6. 局限性

也需要看到一些明显限制：

- 最终成功率仍不足以支持稳定部署
- 实验只覆盖了 **四个任务**
- 系统依赖较复杂的专用硬件：灵巧手、触觉传感器、外骨骼和 VR 设备
- IMCopilot 当前只覆盖少数基础手内技能，还不是一个完整技能库

因此，这篇工作更适合被看作一个很强的研究型系统原型，而不是通用部署方案。

## 7. 我的收获

- **共享自主是灵巧操作数据采集的好策略**。人类不需要手动控制每一个细小接触过程。
- **力觉和触觉不应被粗暴拼接进预训练 VLA**，论文中的按模态残差修正路径是合理设计。
- 对于削皮、工具使用、重抓取这类长时程灵巧任务，**分层技能调用** 很可能是必要的。
- 如果你关注的是从简单夹爪 VLA 基准走向更接近人类双手操作的下一步，这篇论文很值得看。

</div>
