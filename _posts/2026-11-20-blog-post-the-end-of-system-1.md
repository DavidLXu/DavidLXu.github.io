---
title: "The End of System 1? From Imitation Policies to Robot-Use RL"
date: 2026-11-20
permalink: /posts/2026/11/the-end-of-system-1/
excerpt: "I think the independent imitation policy is losing its place between a reasoning model trained to use a robot and a dexterous hand trained to control contact."
tags:
  - Robot Learning
  - Agentic Robotics
  - Reinforcement Learning
  - Dexterous Hands
  - Personal Thoughts
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

In the PEAR demo, the model looks at an eraser from three camera views, works out how far to lower the gripper, and issues a pose update. The arm moves. The model looks again. Nobody needs to hand it a learned *pick up eraser* skill. The part I keep coming back to is the second look. Once the model can tell what the last movement accomplished, it can make the next decision itself. [PEAR, Figure 1](https://mit-han-lab.github.io/pear-blog/#fig-1)

My bet is that **System 1 is dying as the default place to put robot intelligence.** For many tasks, I would start with two learned pieces. Train **System 2** with the same kind of reinforcement learning used to post-train reasoning models. Train **System 0** with RL on the dexterous hand, where the problem is keeping contact under control. The separate generalist policy in the middle now has to earn its place.

## System 2 learns by using the robot

PEAR starts with Qwen3.8-27B and gives it camera views, robot state, and an action interface. The model generates reasoning and a structured end-effector command. The backend moves the arm and returns a new observation. During post-training, the simulator supplies a binary reward at the end of the episode. Group-relative RL reinforces the generated reasoning and actions from rollouts that succeed relative to other attempts from the same start. There's no robot demonstration stage in this post-training recipe. [PEAR, training setup](https://mit-han-lab.github.io/pear-blog/)

The base model goes from 1.6% to 74.4% on LIBERO. After further RL in RoboDojo, it succeeds in 18 of 30 trials across pickup and block alignment on a real dual-arm YAM, with all training done in simulation. I find the comparison with a LIBERO-trained π₀.₅ more revealing. On standard LIBERO, π₀.₅ leads 96.9% to 74.4%. When LIBERO-Pro changes the requested task while keeping the training scene and initial state, the scores are 0.75% and 57.4%, respectively. The original scene is still there, but the robot has a different job. [PEAR, Figures 2, 4 and 8](https://mit-han-lab.github.io/pear-blog/)

The coding-agent analogy makes sense here. The robot interface gives the model something it can try, and the verifier gives it a reason to try a different way. But the curriculum has to get it to an occasional success first. PEAR adds LIBERO-Long after training on shorter suites has already made some long tasks solvable. If every attempt in a group fails, there is no relative reward to learn from. I would spend time making a simulator expose that first success and making the verifier check the actual goal. [PEAR, curriculum and transfer](https://mit-han-lab.github.io/pear-blog/)

## What happens to the VLA or WAM in the middle?

Grid Robotics describes three routes from a decision to the body. System 2 can call a System 1 skill, send a permitted target directly to System 0, or write a program that takes on the System 1 role for that task. The routes can coexist. I'd start with direct control for a new task and add a callable skill when it solves a recurring problem the direct path handles poorly. [Grid Robotics, Three Typical Paths to Execution](https://grid-robotics-official.github.io/agentic-robotics-roadmap/#execution-paths)

A vision-language-action model (VLA) typically maps observations and an instruction to actions. A world-action model (WAM) such as DreamZero also learns to predict how the scene will evolve. DreamZero reports real-robot gains from learning on diverse robot data and shows that even video from another embodiment can help. I expect WAMs to remain useful for predicting consequences or executing motions fast enough to be worth delegating. My claim about imitation learning is about its role in the stack. A model trained to predict recorded actions still needs evidence that its proposed motion will serve *this* goal after something changes. When a reasoning model can propose a move, check the outcome, and recover, I see less reason to train a separate imitation policy to own the whole task. [DreamZero](https://arxiv.org/abs/2602.15922)

Latency can still give System 1 a job. PEAR reports about 4.3 seconds of reasoning per round at its highest tested effort on a GB300. A fast, validated skill can run a series of movements in the time the model spends choosing one. I'd keep it if it improves success or throughput at the same safety limits. [PEAR, inference speed](https://mit-han-lab.github.io/pear-blog/)

## System 0 learns what to do when the object moves

Suppose System 2 asks the hand to rotate a pen until its tip faces forward. As the thumb releases, another finger has to take up the load while the pen is still in contact. The hand needs feedback during the motion. I would train a goal-conditioned policy in simulation, with rewards for progress toward the target orientation and a stable grasp. The policy can see joint history and whatever contact signals the hand actually has. Local motor control and force limits continue to run while the model looks at the scene and decides whether the result is good enough. In-hand rotation via rapid motor adaptation already gives a concrete precedent. An RL-trained policy produced finger gaits on a real hand from joint position and command history, with an adaptation module estimating a latent state from that same history. [Qi et al., *In-Hand Object Rotation via Rapid Motor Adaptation*](https://proceedings.mlr.press/v205/qi23a.html)

That result makes me take the more provocative idea seriously. **A foundation model might replace some uses of tactile sensing.** If fingers stop closing at the expected gap or an object visibly twists against them, a multimodal model has evidence about contact. A fast local policy could use a learned estimate from that evidence. A foundation model can also take over the encoding of actual tactile readings. LingBot-Touch already learns a shared representation across several types of tactile sensors. The two ideas have different requirements. A shared encoder still receives measurements. To remove a sensor, the remaining signals have to reveal the relevant contact state before the hand needs to react. Incipient slip inside an occluded grasp is where I'd expect that assumption to fail first. [LingBot-Touch](https://arxiv.org/abs/2611.12806)

I'd change the target orientation halfway through a run and repeat the test with objects the hand hasn't trained on. With the same hand, controller, and time budget, I'd compare direct control with a callable imitation policy. For touch, I'd compare measured tactile input, estimates from the foundation model, and vision and proprioception alone. The trials with hidden fingertips are the ones I'd watch most closely. Did the robot notice the new goal, keep hold of the object, and finish? That's where I'd decide how much System 1 and how much tactile hardware the robot needs.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过网站顶部语言切换按钮在 **English / 中文** 间切换。

PEAR 有个捡橡皮的演示。模型看了三个相机视角，估计夹爪还要往下降多少，然后发出一次位姿指令。机械臂动完，模型再看一眼。整个过程无需提前给它一个学好的「捡橡皮」技能。我最在意的是第二眼。只要模型能看出上一步做成了什么，下一步就可以由它自己决定。 [PEAR，图 1](https://mit-han-lab.github.io/pear-blog/#fig-1)

我现在的判断是，**System 1 正在失去作为机器人智能默认载体的位置。** 对不少任务，我会从两个需要训练的部分做起。**System 2 直接用推理大模型后训练的那套方法做强化学习。System 0 就训灵巧手 RL**，让手自己处理接触和反馈。中间要不要再放一套独立的通用策略，得看它能解决什么具体问题。

## System 2 在使用机器人的过程中学习

PEAR 从 Qwen3.8-27B 出发，给模型相机画面、机器人状态和动作接口。模型生成推理文本和结构化的末端位姿指令，机器人执行后再返回观测。后训练时，仿真器在一轮任务结束后给一个成败奖励。组相对强化学习在同一个起始状态下比较多次尝试，强化结果较好的 rollout 里生成的推理和动作。这套后训练流程省掉了用机器人示范做监督微调的阶段。 [PEAR，训练设置](https://mit-han-lab.github.io/pear-blog/)

基模在 LIBERO 上的成功率从 1.6% 提到 74.4%。继续在 RoboDojo 里做 RL 之后，模型在双臂 YAM 真机的抓取和方块对齐任务上做成了 18 次，共测试 30 次，训练都在仿真里完成。我更在意它和用 LIBERO 示范训练的 π₀.₅ 那组对照。标准 LIBERO 上，π₀.₅ 以 96.9% 领先 PEAR 的 74.4%。LIBERO-Pro 保留训练场景和初始状态，只换一条要求做别的事的指令，二者就分别变成了 0.75% 和 57.4%。桌上还是那些东西，但机器人接到的是另一项工作。 [PEAR，图 2、4、8](https://mit-han-lab.github.io/pear-blog/)

这有点像训代码 agent。接口让模型能动手试，验证器让它知道要不要换个做法。难的是先拿到少量成功。PEAR 先训练较短的任务，等模型偶尔能完成长任务之后，才把 LIBERO-Long 加进训练。如果一组尝试全失败，组内就没有可用的相对奖励。我会把时间花在让模型在仿真里够得着第一次成功，以及让验证器能检查任务到底有没有做成。 [PEAR，课程安排与迁移实验](https://mit-han-lab.github.io/pear-blog/)

## 中间的 VLA 和 WAM 还做什么？

Grid Robotics 给出了从决策到本体的三条路。System 2 可以调用 System 1 的技能，可以直接把允许的目标交给 System 0，也可以现场写一段程序，让它临时承担 System 1 的职责。三条路可以在一个任务里并用。我会先用直连跑新任务，遇到反复出现、直连又做不好的动作，再把它做成可调用的技能。 [Grid Robotics，三种执行路径](https://grid-robotics-official.github.io/agentic-robotics-roadmap/#execution-paths)

VLA（视觉—语言—动作模型）通常根据观测和指令输出动作。像 DreamZero 这样的 WAM（世界—动作模型）还会一起预测场景接下来怎么变。DreamZero 在真机上展示了多样化机器人数据带来的泛化收益，来自其他本体的视频也能帮上忙。我仍然看好 WAM 用来预测动作后果，或者接手那些值得快速连续执行的动作。我说模仿学习在退场，指的是它在系统里负责的那一段。即使模型很会预测记录里的动作，现场一变，机器人也得确认眼前这个动作还服务于当前目标。既然推理模型能试一步、看结果、再纠错，我就越来越难说服自己还要训练一套独立的模仿策略，让它从头到尾负责整个任务。 [DreamZero](https://arxiv.org/abs/2602.15922)

时延仍然能给 System 1 留下位置。PEAR 在一张 GB300 上以实验中的最高推理档运行，每轮光推理就要约 4.3 秒。这段时间里，一个经过验证的快速技能已经能连做几个动作。如果它能在同样的安全约束下提高成功率或吞吐，我会保留它。 [PEAR，推理速度](https://mit-han-lab.github.io/pear-blog/)

## 物体动起来之后，交给 System 0

假设 System 2 要求灵巧手把笔转到笔尖朝前。拇指一让开，另一根手指就得趁笔还贴在手上时接住力。手在动作过程中就需要反馈。我会在仿真里训一个目标条件策略，奖励它转向目标姿态，同时保持抓持稳定。输入可以是关节历史，以及这只手实际能拿到的接触信号。大模型观察结果、判断要不要重来时，底层电机控制和力限幅照常跑。Rapid Motor Adaptation 的手内旋转实验已经给了一个先例。研究者用 RL 训出了真机上的手指交替动作，部署时用关节位置和指令历史，适应模块也用这些历史来估计隐状态。 [Qi 等，手内旋转与快速运动适应](https://proceedings.mlr.press/v205/qi23a.html)

这也让我认真看待一个更激进的猜想。**一部分触觉传感器的用途，可能会被基模替代。** 比如手指比预期更早停止闭合，或者物体在两指间明显扭了一下，视觉和本体感知已经透露了接触信息。快速的局部策略可以用模型从这些信号里估出的接触状态。基模也可以接手对实际触觉读数的编码，LingBot-Touch 就在几类触觉传感器之间学出了共享表示。两件事的条件不一样。共享编码器仍然有测量值可用。真要把传感器拿掉，剩下的信号就得赶在手需要反应之前暴露相关的接触状态。我最先怀疑这个假设的地方，是被挡住的指尖刚刚开始打滑时。 [LingBot-Touch](https://arxiv.org/abs/2611.12806)

我想在动作进行到一半时改目标姿态，再用训练中没见过的物体重跑。在同一只手、同一个控制器和同样的时间预算下，对比直连和调用模仿策略。触觉这边做三组：用实测触觉、用基模估计的接触状态、只给视觉和本体感知。我最想看指尖被挡住的几组。机器人有没有察觉新目标、稳住物体、完成动作？我想用这样的结果来决定机器人还需要多少 System 1，又需要多少触觉硬件。

</div>
