---
title: "Could Simulation Connect Foundation Models and Embodied AI?"
date: 2026-11-27
permalink: /posts/2026/11/simulation-as-a-bridge-to-embodied-ai/
excerpt: "I think simulation can turn a foundation model’s suggestions into something a robot can learn from, because we can try an action and see what happens after the gripper lets go."
tags:
  - Personal Thoughts
  - Embodied Intelligence
  - Robot Learning
  - Simulation
  - Reinforcement Learning
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

Ask a language model how to put a cup on a table and it can give a sensible piece of advice: lower the cup until the base touches the surface, then open the gripper. What could a robot learn from that sentence? For imitation learning, I'd want a record of what the robot saw and how it moved. For reinforcement learning, I'd want to know what happened to the cup. The sentence gives me somewhere to start, but I still need a way to get both kinds of data.

This is the gap I keep coming back to. We can teach a robot a skill on one bench and still have quite a job getting it to work on the next. Meanwhile, a general-purpose model can draw on experience across many tasks, much of it expressed in language. **I think simulation could connect the two.** It gives us somewhere to try a model's suggestion and keep a record of what follows.

## A sandbox for the robot

Consider how a coding model can learn in a sandbox. It calls a tool, runs a candidate program, and gets a test result. A training system can use that result as a reward and give the model another attempt. Someone has to write a test that captures the intended behavior, but once it's written, nobody has to read every program to find out whether it passed.

A simulator could do much the same for the cup. Give the model a few actions the robot can actually execute, such as lowering the gripper and opening it. Let it choose when to release. We can record the observations and actions, wait for the cup to settle, and check whether it's upright on the table. Now two plans that sound equally reasonable on paper can earn different rewards. We can also move the table a little higher and see which plan still works.

## What the model can do offline

One way we've been getting useful training data is to ask a model for examples, look through what it produces, and ask again with a more precise constraint. A good example late in the batch tells me something about the model: it could produce that answer, even when its first attempt gave me little reason to expect it. It reminds me of prompt engineering around GPT-3.5, when a surprising amount of human work went into finding the wording that brought out a capability.

For the cup, I'd spend that effort offline. A model could propose release timings, or suggest a starting condition we had overlooked. We could run those trials before the physical robot ever touches a cup. Successful trajectories give an imitation learner demonstrations. Failed attempts and their rewards can also inform reinforcement learning. I expect stronger models to need less coaxing to propose worthwhile trials. What counts as worthwhile will still depend on the task.

## Why judging can be easier than acting

Having a model propose examples and then help grade them sounds circular. I can hear when a pianist misses a note in a piece I know, though I couldn't play the passage myself. For some robot tasks there is a similar difference in difficulty. It takes a controller many coordinated actions to put the cup down. To judge the result, an evaluator may only need to look a moment after the fingers open.

The timing matters. Freeze the scene at first contact and a cup about to tip can look like a success. A person who specifies “upright after release” has contributed information. The simulator contributes the outcome of the attempt. A model helping to score it now has evidence outside its own answer. Where the simulator exposes the cup's pose directly, a simple check can settle that part of the judgment.

## Slow thinking, fast reactions

Offline we can afford a hundred attempts at the same placement and spend time inspecting the failures. At the table the robot has one cup in its gripper and only so long to react. This is what I mean by using slow thinking to train fast reactions. A policy trained on those trials may learn when to open its fingers from what it senses in the moment. The search that took so long can pay off in a movement that takes a fraction of a second.

In coding, running a candidate and feeding the result back into training already feels like a natural way to work. In robotics, the part that still feels early to me is getting the whole process to carry across setups. I'd start with a modest test. Change the cup and the table height, then try the learned policy on a real arm. When the fingers open, does the cup stay up? That's the result that would convince me the model's offline work had bought the robot some experience it could use.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过网站顶部语言切换按钮在 **English / 中文** 间切换。

问大模型怎么把杯子放到桌上，它大概能给出一句挺在理的建议：把杯子往下放，等杯底碰到桌面，再松开夹爪。可拿着这句话，我能教机器人什么？做模仿学习，我想要的是机器人一路看到了什么、手是怎么动的；做强化学习，我还得知道，松手以后杯子怎么样了。这句话给了我一个值得尝试的动作，离能拿来训练的数据还差一次动手。

这也是我最近一直在想的问题。同一个技能，在这张实验台上学会了，换张台子可能又得费一番功夫。另一边，通用大模型能调动许多任务里的经验，其中很大一部分是用语言表达的。这两边的数据到底怎么打通？**我觉得关键拼图可能就在仿真。** 有了仿真，模型提的建议就有地方试，试过以后还留得下记录。

## 给机器人一个沙箱

想想代码模型在沙箱里怎么学。模型调用工具，把写好的程序跑一遍，测试给出结果。训练时可以把这个结果当作奖励，让模型再试。人得先想明白用什么测试来衡量这段程序，但测试一旦写好，就用不着每次都找个人读代码，判断这一版过没过关。

把杯子放进仿真器，也可以这么做。先给模型几个机器人真能执行的动作，比如降低夹爪、张开手指，让它自己选什么时候松手。我们可以记下沿途的观测和动作，再等杯子停稳，看它还立不立在桌上。两套用文字讲起来都挺合理的方案，到这里就可能拿到不同的奖励。把桌面调高一点，还能再试试哪套方案管用。

## 离线生成的数据从哪来

我们现在生成训练数据，有个挺管用的办法：让模型先出一批例子，看过一遍，再把要求提得具体一点，让它接着出。有时翻到后面才看到一个好例子。只看第一次回答，我可能根本想不到它能做到这一步。这让我想起 GPT-3.5 那会儿做提示工程，人的功夫很大一部分花在琢磨怎么问，才能把模型已有的能力引出来。

放杯子这件事上，我愿意把这个功夫花在离线阶段。让模型提几种松手时机，或者想一个我们漏掉的初始条件。等真机碰到杯子之前，这些设想在仿真里就能先过一遍。成功的轨迹可以留下来做模仿学习的示范，失败的尝试连同奖励，也能用来做强化学习。我猜底座模型越强，提出值得一试的方案就越用不着人反复提示。至于什么算值得试，还得看我们想让机器人学会什么。

## 为什么有时裁判更好当

让模型出题，再让模型参与打分，听起来像“左脚踩右脚”。可一首熟悉的钢琴曲，别人弹错一个音，我可能听得出来；让我自己弹，那一小节我都弹不下来。有些机器人任务也有这个差别。要把杯子放稳，控制器得协调一连串动作。要判断这次放稳了没有，有时只消在松手之后多看一眼。

这一眼什么时候看，很有讲究。画面停在杯底刚碰到桌面的瞬间，一个马上要倒的杯子也像是放好了。人把“松手以后还立得住”写进标准，就已经给了模型额外的信息。仿真器再给出这次动作的后果。到了这一步，参与评分的模型手里就有了独立于它自己回答的证据。如果仿真器能直接读出杯子的姿态，这一项判断交给一条简单的规则就够了。

## 用慢思考训练快反应

离线时，同一个杯子可以放一百遍，失败的那几次还可以慢慢看。真到了桌前，夹爪里只有一个杯子，留给机器人反应的时间也有限。这才是我理解的“用慢思考训练快反应”。策略从这些轨迹里学到的，也许就是凭眼下的观测判断该不该松手。之前花时间搜索和筛选的价值，最后落在手指张开的那一瞬间。

写代码时，生成一个方案、跑一遍、拿结果回去训练，已经是很自然的做法。在具身智能里，我觉得还处在早期的，是怎么让这整套办法换个环境也管用。我想先看一个很小的检验：换个杯子，改一改桌面高度，把学到的策略放到真机上。手指张开以后，杯子还站得住吗？如果站得住，我才会相信，大模型在离线阶段做的那些功课，真给机器人换来了一点可以带走的经验。

</div>
