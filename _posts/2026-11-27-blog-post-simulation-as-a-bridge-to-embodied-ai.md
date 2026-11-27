---
title: "Simulation May Be the Missing Piece Connecting General-Purpose Models and Embodied AI"
date: 2026-11-27
permalink: /posts/2026/11/simulation-as-a-bridge-to-embodied-ai/
excerpt: "I think simulation could break the data bottleneck in embodied AI by giving general-purpose models a place to generate and evaluate training data offline."
tags:
  - Personal Thoughts
  - Embodied Intelligence
  - Robot Learning
  - Simulation
  - Reinforcement Learning
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

One question has been on my mind lately. Why is it still so hard to put data from general-purpose models to work in embodied AI and get data flowing between the two?

In embodied AI, much of the work on reinforcement learning and imitation learning still happens within small circles. Neither approach has achieved the kind of generalization we see in language models. Yet I think the way to connect these fields is already in front of us: **simulation**.

Step back from robotics for a moment and look at how general-purpose models developed. The same underlying logic runs through both.

**1. Sandboxes and rewards: how models already learn by interacting with an environment**

General-purpose models rely heavily on reinforcement learning to develop skills such as calling tools and executing code. The ingredients are simple: **an isolated sandbox, an environment the model can interact with, and a reward we can define**. With enough trial and error, we can train the particular skill we want to improve.

Carry that logic over to the physical world and **a simulator becomes the robot’s code sandbox**. A model can “call” its body much as it calls a tool, and learn to interact with the physical world through measurable rewards in simulation.

**2. Where does the data come from? Models can already generate it offline**

Many people see a shortage of data as the bottleneck in embodied AI. Consider what today’s models can already do, though. They can generate high-quality data themselves.

One approach has worked well for us. We keep refining what we ask of a model until it **generates a good batch of data offline**, then use that batch for training. The model already has the ability to get it right. For now, it takes considerable human effort to guide it and set constraints. It reminds me of the GPT-3.5 days, when we racked our brains over **prompt engineering** to draw out what the model could do.

As the underlying models grow more capable, I expect them to need less and less of that painstaking prompting. They’ll be able to generate good data on their own.

**3. Can a model pull itself up by its bootstraps? Being the referee is always easier than being the athlete**

When a model generates its own data and gives itself a score, an obvious objection comes up. How can it make any progress by grading its own work?

The rules, constraints, and evaluation criteria that people set are themselves **an input from outside the model**. More importantly, **in any field, it’s always easier to be the referee than the athlete**. You can appreciate a piece of music or taste a dish long before you can play the piece or cook the dish yourself. Likewise, it’s much easier for a model to judge whether a robot finished a task and whether its movements made sense than to generate the low-level actions that control the robot.

This is a case of **training fast reactions through slow thinking, trading time for room to maneuver**. Working offline in simulation, a general-purpose model can take its time reasoning through possibilities, generating examples, and choosing which ones to keep. That slow work eventually becomes muscle memory for an embodied model acting in the physical world.

**4. Where things stand and what could break the bottleneck**

General-purpose models already benefit from a mature training loop that brings together sandboxes, offline data generation and filtering, and reinforcement learning. In embodied AI, that way of working is still in its infancy.

I think we’ll finally break the data bottleneck in embodied AI when simulation lets us put general-purpose models’ ability to generate and judge data offline to work for robots.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过网站顶部语言切换按钮在 **English / 中文** 间切换。

**打通通用大模型与具身智能，关键拼图或许就在“仿真”**

最近一直在思考一个问题：通用大模型和具身智能（Embodied AI）之间的数据，为什么至今没有真正有效地打通？

在具身智能领域，无论是强化学习还是模仿学习，目前大多还是在各自的小圈子里打转，并没有像语言模型那样产生真正的泛化能力。但其实，打通这两者的核心路径已经摆在眼前了——**仿真环境（Simulation）**。

如果我们跳出具身智能的局限，回头看看通用大模型的发展路径，就会发现这两套技术在底层逻辑上是完全相通的。

**1. 沙箱与 Reward：大模型早已跑通的“环境交互”**

现在的通用大模型在训练工具调用（Tool Use）、代码执行等能力时，非常依赖强化学习。这套机制的核心要素非常简单：**一个隔离的沙箱、一个交互环境、一套可定义的 Reward（奖励机制）**，通过海量试错去定向拔高模型的某项能力。

把这套逻辑平移到物理世界，**仿真器就是机器人的“代码沙箱”**。大模型完全可以在仿真环境里用同样的方式“调用身体”，通过可量化的 Reward 学会物理交互。

**2. 数据从哪来？大模型本身就有“离线生成”的潜力**

很多人觉得具身智能卡在数据不够，但换个角度看，现在的大模型其实已经具备了生成高质量数据的能力。

我们现在用一种很有效的方法：通过不断地向模型提出要求，让它**离线生成**一批比较好的数据，再拿去训练。这说明模型本身是有能力做对的，只不过现阶段还需要人类投入大量的精力去引导和约束——就像当年 GPT-3.5 时期，大家需要绞尽脑汁做 **Prompt Engineering** 才能把模型的能力逼出来一样。

当然，随着底座能力的增强，未来一定会越来越不需要这种繁琐的 Prompt Engineering，模型自己就能把数据生成得很好。

**3. 打破“左脚踩右脚”的质疑：裁判永远比运动员好当**

说到让模型自己生成数据、自己给自己打分，很多人会质疑：这不是“左脚踩右脚”，纯属原地踏步吗？

其实并不是。人在背后设定的规则、约束和评估标准，本身就是一种**外部注入的力**。更重要的是，**在任何领域，“做裁判”永远比“做运动员”简单**。就像欣赏一首曲子、品尝一道菜，门槛远低于亲自演奏和掌勺；让模型去做一个打分器，判断任务有没有完成、动作合不合理，也远比直接让它生成控制机器人的底层动作要容易得多。

这就是典型的**用“慢思考”训练“快反应”，用时间去换取空间**。大模型在离线和仿真环境里慢慢推演、生成、筛选（慢思考），最终沉淀为具身模型在物理世界里的肌肉记忆（快反应）。

**4. 现状与破局**

目前，通用大模型把“沙箱环境 + 离线数据生成与筛选 + 强化学习”这套飞轮转得已经非常成熟了，但在具身智能圈子里，这套范式还处于极其早期的阶段。

一旦我们能通过仿真环境，把大模型离线生成和评判数据的能力真正接进来，具身智能的数据瓶颈才算被打破。

</div>
