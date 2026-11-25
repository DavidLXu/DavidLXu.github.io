---
title: "[Paper Notes] Dr. Grasp-RL: Diverse and Robust Dexterous Grasping via Reinforcement Learning"
date: 2026-11-26
permalink: /posts/2026/11/dr-grasp-rl-paper-notes/
excerpt: "Dr. Grasp-RL starts PPO near thousands of feasible grasps, then moves the hand farther away. The resulting policy can change its grip and retry after losing contact."
tags:
  - Paper Notes
  - Dexterous Grasping
  - Reinforcement Learning
  - Policy Distillation
---

<div data-lang="en" markdown="1">

Kunqi Xu, Xiaokang Sun and Xueyan Zou · Tsinghua University · November 22, 2026 · [arXiv preprint](https://arxiv.org/abs/2611.29610v1) · [Project videos](https://xkq1qkx.github.io/Diverse-Manip-RL-web/)

If an object only earns a reward when it rises, a hand starting across the table must discover how to reach, make contact and hold on before any of those actions pays off. Once one grip works, the same reward gives the policy little reason to explore another. Dr. Grasp-RL changes where practice begins. A single policy first learns to lift from many wrist and finger configurations. It then learns how to reach those grasps, and how to try again from the position a missed grasp leaves behind.

### Moving the starting point backward

The curriculum runs backward through the *starting states*. Every rollout still runs forward. In the first stage, the xArm7 and XHand start near candidate grasps derived primarily from Dexonomy templates. A few actions can establish contact and produce a lift. The template sets the initial hand pose. PPO rewards the resulting object height, so the fingers can depart from the template whenever another grip works.

The later stages use 9,036 Dexonomy seeds across 418 objects. First the fingers start halfway open. Next the hand starts fully open and 2–8 cm back along the approach direction. Eventually it can start from any of 200 screened arm and hand configurations. The authors mix easier starts with harder ones and use success averaged across individual resets to decide when to advance. Finally they sample the object's table position independently of the robot's start. A familiar arm configuration can now require a different reach. [Section 3.2](https://arxiv.org/html/2611.29610v1#S3.SS2)

### What the policy learns to do after contact

At 10 Hz the actor issues six wrist-motion increments and twelve finger-joint increments. The main reward scales with the object's rise and saturates at 20 cm. Lifting the center of mass at least 18 cm and holding it there for over two seconds ends the episode successfully, with credit for the remaining time. The critic can therefore assign high returns to several different grips on the same object. At execution, the actor chooses each action from the latest observation.

The PPO teacher has access to simulated touch, contact and object dynamics. The student uses a known object mesh, tracked poses, robot feedback and recent actions. After behavior cloning on teacher rollouts, half the environments run the student for full episodes. The teacher labels the states the student actually visits, including those reached after a miss. This gives the student a corrective action to imitate precisely where its own earlier commands took it off course. [Sections 3.3–3.4](https://arxiv.org/html/2611.29610v1#S3.SS3)

### How much do the starts and retries matter?

On 5,031 held-out objects, with ten simulated starts per object and the arm attached, the teacher succeeds in **92.11%** of episodes and the student in **88.06%**. Lower-quality first-stage seeds bring success down to **54.18%**. Removing near-grasp seeds and training with dense geometric rewards for the same number of steps yields **9.68%**. The latter comparison changes both initialization and reward. A separate transfer evaluation spans six collections totaling more than 20,000 object assets. [Tables 1–2](https://arxiv.org/html/2611.29610v1#S4.SS1)

A retry begins when finger contact resumes after at least 0.3 seconds without it. Of the student's **successful** arm-mounted test episodes, **19.4%** took two or more attempts. That accounts for about **17.1 percentage points** of its overall success rate. For diversity, the authors hold a cuboid fixed and compare wrist poses and fingertip arrangements across 50 successful grasps per method. This reveals variation in how a policy grips one shape, while the retry counts measure what it does after contact breaks. The hardware videos show the student changing its grip after a miss using motion-capture pose estimates and known meshes. Recovery on hardware is illustrated qualitatively. [Figure 4](https://arxiv.org/html/2611.29610v1#S4.SS2) · [Table 3 and Figure 6](https://arxiv.org/html/2611.29610v1#S4.SS3)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

Kunqi Xu、Xiaokang Sun、Xueyan Zou · 清华大学 · 2026 年 11 月 22 日 · [arXiv 预印本](https://arxiv.org/abs/2611.29610v1) · [项目视频](https://xkq1qkx.github.io/Diverse-Manip-RL-web/)

如果只有物体升高才有奖励，那么从桌子另一端出发的机械手，得先碰巧完成伸手、接触和握紧，才能得到第一次反馈。一旦某种抓法奏效，反复用它就能继续拿到奖励，策略也就缺少探索其他抓法的动力。Dr. Grasp-RL 调整了练习的起点。它先让同一个策略从多种腕部姿态和手指构型学会把物体拿起来，再学怎样从远处伸手去抓，以及抓空之后怎样就地再试。

### 把每轮练习的起点往前推

“时间反转”指的是训练依次从抓取过程的后段移到前段，每轮仿真仍然向前运行。第一阶段主要借助 Dexonomy 的抓取模板，让 xArm7 上的 XHand 从接近可行抓姿的位置出发。这样，只需几个动作就有机会建立接触、抬起物体。模板规定手从哪里开始，PPO 根据物体抬升的高度给奖励。只要能拿起来，手指就可以偏离模板。

后续课程使用 418 个物体和 9,036 个来自 Dexonomy 的种子构型。起初，手指从抓姿向张开姿态松开一半。随后，手完全张开，并沿原接近方向后撤 2–8 厘米。再往后，机械手可以从 200 个经过可行性筛选的机械臂与手部构型中任取一个出发。每次增加难度时，仍有一部分环境练习较容易的起点。课程先计算每个起点的成功率，再取平均，以此判断能否进阶。最后，物体在桌上的位置与机械臂起始构型独立采样，即使从熟悉的关节角度出发，手也要根据物体的位置重新决定往哪儿伸。[第 3.2 节](https://arxiv.org/html/2611.29610v1#S3.SS2)

### 接触之后，策略怎样调整动作

策略每秒输出十次动作，每次给出六个腕部位姿增量和十二个手指关节增量。主要奖励随物体抬升高度增长，到 20 厘米时封顶。物体质心升高至少 18 厘米并连续保持超过两秒即算成功，提前结束时还会计入剩余时段的回报。因此，同一物体上的不同抓姿都可能获得较高的价值估计。执行时，策略根据最新观测决定下一步动作。

用 PPO 训练的教师策略能读取仿真中的触觉、接触信息和物体动力学参数。学生策略使用已知物体网格、跟踪得到的位姿、机器人自身反馈和近期动作。学生先在教师采集的轨迹上做行为克隆，随后接管一半的环境，每轮都由自己执行到底。教师为学生实际走到的状态标注动作，其中也包括抓空后的状态。这样，学生能在自己容易失手的位置上学到下一步该怎么调整。[第 3.3–3.4 节](https://arxiv.org/html/2611.29610v1#S3.SS3)

### 起点和重抓分别贡献了多少

在带机械臂的仿真测试中，5,031 个未参与训练的物体各测十个起点，教师与学生的成功率分别为 **92.11%** 和 **88.06%**。第一阶段换用品质较差的种子后，成功率降至 **54.18%**。去掉近抓姿初始化，改用稠密几何奖励，训练相同步数后仅为 **9.68%**。后一组实验同时改变了初始状态和奖励函数。论文还单独做了跨数据集测试，六个物体集合合计超过两万个物体模型。[表 1–2](https://arxiv.org/html/2611.29610v1#S4.SS1)

所有手指与物体脱离接触至少 0.3 秒后，再次接触就算新一次尝试。在带臂测试中，学生**最终成功的回合**有 **19.4%** 经历了至少两次尝试，折合总成功率中的约 **17.1 个百分点**。作者还固定了一个长方体的位置和朝向，对每种方法收集 50 次成功抓取，分别观察手腕位姿和指尖布局的分布。这个实验展示了同一个物体可以怎样抓，重抓统计则说明了失去接触后有多少回合还能挽回。真机视频中，学生利用动作捕捉获得的位姿和已知网格，在抓空后调整手腕和手指，最终拿起物体。真机部分给出的是恢复过程的定性示例。[图 4](https://arxiv.org/html/2611.29610v1#S4.SS2) · [表 3 与图 6](https://arxiv.org/html/2611.29610v1#S4.SS3)

</div>
