---
title: "From Egocentric Human Videos to Executable Robot Actions"
date: 2026-06-16
permalink: /posts/2026/06/ego-video-to-robot-action-notes/
tags:
  - Egocentric Video
  - Robot Learning
  - Imitation Learning
  - Reinforcement Learning
  - Dexterous Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Recent work on learning robot manipulation from egocentric human videos is moving through a clear progression:

```text
human ego video
  -> robot-looking video
  -> robot-compatible supervision
  -> executable robot trajectories
  -> policy training data
```

**Phantom** and **Masquerade** show that visual data editing is useful: remove the human arm, render a robot, and train policies with a reduced visual embodiment gap. **HumanEgo** moves toward an interaction-centric representation, using hand-object relations as the transferable signal. **EgoEngine** pushes the direction further by producing both robot observation videos and task-aligned executable action trajectories.

My read is that the next important direction is **high-fidelity action generation/refinement**, likely using reinforcement learning, trajectory optimization, MPC, or hybrid methods inside simulation or digital twins. The reason is simple: for dexterous and bimanual manipulation, success is often limited by contact feasibility, grasp timing, force application, release timing, and object pose evolution. A robot-looking video helps, but a physically executable action trajectory is what turns human video into robot training data.

## The Core Question

Egocentric human videos are attractive because they are cheap, scalable, and naturally capture hand-object interaction. A person can wear smart glasses or use a head-mounted camera and collect many manipulation episodes without robot hardware.

The hard part is conversion. A human video does not directly contain robot actions. It also contains hands, arms, head motion, camera motion, human morphology, occlusions, and contact behavior that may be impossible for a target robot to reproduce directly.

Most papers in this area can be understood by asking two questions:

1. How do they close the **visual gap** between human observations and robot observations?
2. How do they close the **action gap** between human motion and robot-executable control?

The first gap is about what the policy sees. The second gap is about what the robot can actually do.

## Four Closely Related Papers

## Phantom

**Phantom: Training Robots Without Robots Using Only Human Videos** is one of the cleanest starting points for this line of work. It uses human video demonstrations, estimates hand poses, replaces the human arm with a rendered robot, and trains policies on these edited robot-like demonstrations.

The appealing part of Phantom is its simplicity: the data becomes robot-compatible observation-action pairs, and the resulting policy can be deployed zero-shot without collecting robot-specific data. It also lowers the collection barrier because contributors only need an RGB-D camera.

The limitation is that the setup is more curated than later large-scale in-the-wild pipelines. The method also depends on the quality of hand pose estimation, depth, and the assumption that the edited trajectory is close enough to what the robot can execute.

Source: [Phantom project page](https://phantom-human-videos.github.io/), [arXiv:2503.00779](https://arxiv.org/abs/2503.00779).

## Masquerade

**Masquerade: Learning from In-the-wild Human Videos using Data-Editing** extends the visual editing idea to large-scale in-the-wild egocentric videos such as Epic Kitchens. It estimates left/right hand trajectories, inpaints the human embodiment, and overlays a rendered bimanual robot whose end-effectors follow the estimated trajectories.

The policy-learning recipe is also important. Masquerade pretrains a ViT-based encoder on edited human clips to predict future 2D robot keypoints, then co-trains it with a diffusion policy head on only 50 robot demonstrations per task. The paper reports strong out-of-distribution generalization on long-horizon bimanual kitchen tasks, and its ablations show that both robot overlay and co-training matter.

Masquerade is probably the most practically grounded paper among the visual-editing group. Its story is clear: rough robotization of web-scale egocentric video improves the visual representation and makes small robot datasets go further.

Its main limitation is that the human videos mainly provide auxiliary supervision and visual representation learning. The final action policy still relies on task-specific robot demonstrations.

Source: [Masquerade project page](https://masquerade-robot.github.io/), [arXiv:2508.09976](https://arxiv.org/abs/2508.09976).

## HumanEgo

**HumanEgo: Zero-Shot Robot Learning from Minutes of Human Egocentric Videos** takes a different route. Instead of relying mainly on robot-looking image edits, it lifts each demonstration into an entity-level representation of hand-object interaction.

Its key object is the **Interaction-Centric Token (ICT)**. The representation encodes hand and object poses, their relative spatial relationships, and grasp state. The policy uses a flow matching action generator with dense auxiliary objectives, including 2D trace prediction, object motion prediction, and latent consistency.

This is a beautiful idea because manipulation is defined by interaction. A hand trajectory alone is incomplete. An object trajectory alone is also incomplete. The useful signal lies in how hands approach, grasp, move, release, and coordinate around objects.

The claim is strong: learning from only minutes of human egocentric video, with no robot data and no internet-scale pretraining. That makes HumanEgo one of the most exciting papers in this cluster. At the same time, its pipeline depends heavily on reliable hand/object tracking, entity pose estimation, and clean task-level demonstrations. I would like to see how robust it remains across messier in-the-wild videos and more contact-rich dexterous tasks.

Source: [arXiv:2605.24934](https://arxiv.org/abs/2605.24934).

## EgoEngine

**EgoEngine: From Egocentric Human Videos to High-Fidelity Dexterous Robot Demonstrations** is the most complete formulation of the problem. It explicitly states that human-to-robot transfer requires bridging two gaps:

- the **visual gap** between human and robot observations;
- the **action gap** between human motion and robot-executable action.

Given an egocentric RGB video, EgoEngine produces two outputs: a high-fidelity robot observation video and a task-aligned executable robot action trajectory under feasibility constraints. It constructs a digital twin, generates robot-view observations, maps human motion to robot rollout, and refines the trajectory into something executable.

This matters because EgoEngine's ablation shows that action generation is the dominant gain. Averaged over four Aria tasks, the reported success rates are:

| Setting | Success Rate |
|---|---:|
| Human Videos | 0.03 |
| + Visual branch | 0.05 |
| + Action branch | 0.43 |
| Full EgoEngine | 0.51 |

The exact numbers should not be over-interpreted as official contribution percentages. Still, the trend is clear: visual conversion alone gives a small gain, while executable action generation changes the policy-learning outcome.

Source: [EgoEngine project page](https://egoengine.github.io/), [arXiv:2606.12604](https://arxiv.org/abs/2606.12604).

## Side-by-Side Comparison

| Paper | Main Data Processing | Robot Data Needed? | Action Fidelity | Best Use Case |
|---|---|---:|---|---|
| Phantom | Hand pose + inpainting + rendered robot | No | Medium | Simple zero-shot human-video-to-policy pipeline |
| Masquerade | In-the-wild video editing + robot overlay + co-training | Yes, small task-specific set | Medium | Scaling visual representation from web ego data |
| HumanEgo | Hand-object entity representation + flow matching | No | Medium to high, depending on perception | Data-efficient zero-shot transfer from clean ego demos |
| EgoEngine | Digital twin + robot observation generation + executable trajectory refinement | No real robot demos for policy learning | High | Generating full robot demonstrations from human videos |

## My Ranking

If I had to pick the strongest paper conceptually, I would pick **EgoEngine**.

The reason is that it targets the most important bottleneck: converting human motion into robot-executable trajectories. Visual editing is useful, but dexterous manipulation often fails because the robot cannot realize the required contact sequence. EgoEngine makes the action branch a first-class component.

If I had to pick the most practical and easy-to-explain system, I would pick **Masquerade**.

It is direct, scalable, and experimentally clean. It makes a strong case that even imperfect robot overlays can unlock value from in-the-wild egocentric videos, especially when combined with co-training.

If I had to pick the most interesting representation idea, I would pick **HumanEgo**.

The interaction-centric token is a compelling way to abstract away embodiment while preserving the hand-object relation that actually defines the manipulation skill.

Phantom remains important as a foundation paper in this branch. It makes the data-editing route simple and concrete.

## Why High-Fidelity Action Generation Matters

The field is now approaching a useful realization: making a video look robotic is not enough. The action must be physically realizable.

For tabletop pick-and-place tasks, a rough retargeted action may sometimes work. For dexterous manipulation, bimanual coordination, tool use, insertion, twisting, wiping, folding, or contact-rich tasks, small action errors dominate:

- the grasp pose may be slightly wrong;
- contact may happen too early or too late;
- the object may rotate into an infeasible orientation;
- one hand may block the other;
- the robot may need force rather than just pose tracking;
- the release timing may determine task success.

These are not primarily visual problems. They are contact and control problems.

This is why I think **RL-based action refinement** is an important next direction.

## Where RL Fits

The promising version of RL here is not open-ended trial-and-error from scratch. The better formulation is:

```text
human ego video
  -> rough human hand/object trajectory
  -> robot retargeting
  -> simulation or digital twin rollout
  -> RL / MPC / trajectory optimization refinement
  -> executable robot demonstration
  -> downstream imitation policy
```

In this pipeline, RL acts as a **refinement engine**. It starts from a strong human prior and fixes the details that humans do not directly specify in robot coordinates:

- stable grasp pose;
- contact force and compliance;
- object reorientation;
- handover timing;
- bimanual coordination;
- release phase;
- recovery from small tracking errors.

This framing also makes RL more scalable. The goal is not to deploy an RL policy directly. The goal is to use RL to manufacture better demonstrations from human videos, then train a robust visuomotor policy on those demonstrations.

## A Useful Research Direction

I would summarize the direction as:

**Ego-to-Robot Action Refinement with Physics Feedback**

or:

**Turning egocentric human videos into contact-feasible robot demonstrations.**

This direction combines the strengths of the current papers:

- Phantom and Masquerade show that visual embodiment editing helps.
- HumanEgo shows that hand-object interaction is a strong abstraction.
- EgoEngine shows that executable action generation is the key performance driver.
- RL or trajectory optimization can provide the missing physics feedback loop.

The next step is likely not a purely visual generative model. It is a system that can watch a human video, infer the intended interaction, retarget it to a robot, test it in simulation, repair the contact sequence, and output training data that a real robot can use.

That is the point where egocentric video becomes more than a visual pretraining source. It becomes a robot demonstration engine.

</div>

<div data-lang="zh" markdown="1" style="display:none">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

最近这一批从 egocentric human videos 学机器人操作的工作，正在沿着一条很清晰的路线演进：

```text
人类第一视角视频
  -> 看起来像机器人在做的视频
  -> 机器人可用的监督信号
  -> 可执行的机器人动作轨迹
  -> policy 训练数据
```

**Phantom** 和 **Masquerade** 说明 visual data editing 很有用：把人的手臂去掉，渲染机器人，再用视觉 embodiment gap 更小的数据训练 policy。**HumanEgo** 往 interaction-centric representation 走，把手和物体之间的关系作为可迁移信号。**EgoEngine** 往前推进一步，同时生成机器人视角视频和 task-aligned executable action trajectory。

我的判断是，下一步很重要的方向会是 **高保真 action generation/refinement**，很可能会用到 reinforcement learning、trajectory optimization、MPC，或者它们在 simulation / digital twin 里的混合形式。原因很直接：在 dexterous 和 bimanual manipulation 里，成败常常取决于接触是否可行、抓取时机、施力方式、释放时机、物体姿态演化。视频看起来像机器人有帮助，但真正把 human video 变成 robot training data 的，是物理上可执行的动作轨迹。

## 核心问题

Egocentric human videos 很吸引人，因为它便宜、可扩展，而且自然包含手和物体的交互。一个人戴上智能眼镜或者头戴相机，就可以不依赖机器人硬件采集很多 manipulation episodes。

难点在转换。人类视频里没有直接可用的机器人动作。它还包含人的手、手臂、头部运动、相机运动、人类形态、遮挡，以及目标机器人未必能复现的接触行为。

这类论文大多可以用两个问题来理解：

1. 它如何缩小 human observation 和 robot observation 之间的 **visual gap**？
2. 它如何缩小 human motion 和 robot-executable control 之间的 **action gap**？

第一个 gap 关乎 policy 看到什么。第二个 gap 关乎机器人真的能做什么。

## 四篇最相关的工作

## Phantom

**Phantom: Training Robots Without Robots Using Only Human Videos** 是这条路线很干净的起点之一。它使用 human video demonstrations，估计手部姿态，把人的手臂替换成 rendered robot，然后用这些 edited robot-like demonstrations 训练 policy。

Phantom 最吸引人的地方是简单：数据被转换成 robot-compatible observation-action pairs，policy 可以在没有 robot-specific data 的情况下 zero-shot 部署。它也降低了采集门槛，因为贡献者只需要 RGB-D camera。

它的限制也比较清楚：数据场景比后来的 large-scale in-the-wild pipeline 更 curated；方法也依赖 hand pose estimation、depth，以及 edited trajectory 足够接近机器人可执行动作这个前提。

来源：[Phantom project page](https://phantom-human-videos.github.io/)，[arXiv:2503.00779](https://arxiv.org/abs/2503.00779)。

## Masquerade

**Masquerade: Learning from In-the-wild Human Videos using Data-Editing** 把 visual editing 思路扩展到 Epic Kitchens 这类大规模 in-the-wild egocentric videos。它估计左右手轨迹，inpaint 掉 human embodiment，再 overlay 一个 rendered bimanual robot，让机器人的 end-effectors 跟随估计出来的轨迹。

它的 policy-learning recipe 也很关键。Masquerade 先在 edited human clips 上预训练 ViT-based encoder，让它预测未来 2D robot keypoints，然后用每个任务 50 条 robot demonstrations 和 diffusion policy head 进行 co-training。论文在长程双臂厨房任务上展示了很强的 OOD 泛化，并且 ablation 表明 robot overlay 和 co-training 都很重要。

Masquerade 可能是 visual-editing 组里最现实、最稳的一篇。它的故事非常清楚：粗糙的 robotization 也可以让 web-scale egocentric video 改善视觉表示，并让小规模 robot dataset 更有用。

它的主要限制是，human videos 更多提供辅助监督和视觉表示学习。最终动作 policy 仍然依赖 task-specific robot demonstrations。

来源：[Masquerade project page](https://masquerade-robot.github.io/)，[arXiv:2508.09976](https://arxiv.org/abs/2508.09976)。

## HumanEgo

**HumanEgo: Zero-Shot Robot Learning from Minutes of Human Egocentric Videos** 走的是另一条路线。它没有主要依赖机器人外观的视频编辑，而是把每段 demonstration 提升成 entity-level 的手-物体交互表示。

它的关键对象是 **Interaction-Centric Token (ICT)**。这个表示编码手和物体的 pose、相对空间关系，以及 grasp state。policy 使用 flow matching action generator，并加入 dense auxiliary objectives，包括 2D trace prediction、object motion prediction 和 latent consistency。

这个思路很漂亮，因为 manipulation 的本质是 interaction。只有手轨迹是不完整的。只有物体轨迹也是不完整的。真正有用的信号在于手如何接近、抓取、移动、释放，以及双手如何围绕物体协同。

它的 claim 很强：只用分钟级 human egocentric video，不用 robot data，也不用 internet-scale pretraining。这让 HumanEgo 成为这个 cluster 里最值得关注的工作之一。不过它也高度依赖可靠的手/物体 tracking、entity pose estimation 和干净的任务级演示。我会继续关注它在更混乱的 in-the-wild videos 和更 contact-rich dexterous tasks 上的鲁棒性。

来源：[arXiv:2605.24934](https://arxiv.org/abs/2605.24934)。

## EgoEngine

**EgoEngine: From Egocentric Human Videos to High-Fidelity Dexterous Robot Demonstrations** 对这个问题的定义最完整。它明确指出 human-to-robot transfer 需要同时处理两个 gap：

- human 和 robot observation 之间的 **visual gap**；
- human motion 和 robot-executable action 之间的 **action gap**。

给定一段 egocentric RGB video，EgoEngine 输出两个东西：一个 high-fidelity robot observation video，以及一个满足 feasibility constraints 的 task-aligned executable robot action trajectory。它构建 digital twin，生成机器人视角 observation，把 human motion 映射到 robot rollout，并进一步 refinement 成可执行轨迹。

这个点很关键，因为 EgoEngine 的 ablation 显示 action generation 是主要收益来源。四个 Aria tasks 的平均成功率如下：

| Setting | Success Rate |
|---|---:|
| Human Videos | 0.03 |
| + Visual branch | 0.05 |
| + Action branch | 0.43 |
| Full EgoEngine | 0.51 |

这些数字不能被当成官方的贡献百分比去过度解读。但趋势很清楚：只做 visual conversion 提升很小，executable action generation 才真正改变了 policy-learning outcome。

来源：[EgoEngine project page](https://egoengine.github.io/)，[arXiv:2606.12604](https://arxiv.org/abs/2606.12604)。

## 横向对比

| Paper | 主要数据处理 | 是否需要 robot data | Action fidelity | 最适合的使用场景 |
|---|---|---:|---|---|
| Phantom | Hand pose + inpainting + rendered robot | 不需要 | 中等 | 简洁的 zero-shot human-video-to-policy pipeline |
| Masquerade | In-the-wild video editing + robot overlay + co-training | 需要少量 task-specific 数据 | 中等 | 从 web ego data 扩展视觉表示 |
| HumanEgo | Hand-object entity representation + flow matching | 不需要 | 中高，取决于 perception | 从干净 ego demos 做 data-efficient zero-shot transfer |
| EgoEngine | Digital twin + robot observation generation + executable trajectory refinement | policy learning 不需要真实 robot demos | 高 | 从 human videos 生成完整 robot demonstrations |

## 我的排序

如果只选概念上最强的一篇，我会选 **EgoEngine**。

原因是它正面处理了最重要的瓶颈：把 human motion 转换成 robot-executable trajectories。Visual editing 有价值，但 dexterous manipulation 经常失败在机器人无法实现正确的 contact sequence。EgoEngine 把 action branch 放到了核心位置。

如果选最现实、最容易讲清楚的系统，我会选 **Masquerade**。

它直接、可扩展、实验也干净。它很有力地说明，即使是不完美的 robot overlay，也能从 in-the-wild egocentric videos 里释放价值，特别是在 co-training 结合少量 robot data 的情况下。

如果选最有意思的 representation idea，我会选 **HumanEgo**。

Interaction-Centric Token 很有吸引力：它在保留手-物体关系的同时，抽象掉了部分 embodiment 差异。

Phantom 仍然是这个方向的重要基础工作。它把 data-editing route 做得简单、具体。

## 为什么高保真 action generation 重要

这个方向正在接近一个关键共识：让视频看起来像机器人还不够。动作必须物理可实现。

对 tabletop pick-and-place 来说，粗糙 retargeted action 有时可以工作。对 dexterous manipulation、双手协同、工具使用、插入、旋转、擦拭、折叠、接触丰富任务来说，微小动作误差会主导成败：

- grasp pose 稍微不对；
- contact 太早或太晚；
- 物体转到不可行姿态；
- 一只手挡住另一只手；
- 机器人需要施力，而不仅仅是 pose tracking；
- release timing 决定任务是否成功。

这些主要是 contact 和 control 问题。

这就是我认为 **RL-based action refinement** 会很重要的原因。

## RL 应该放在哪里

这里更有前途的 RL 形式，并不是从零开始开放探索。更好的 formulation 是：

```text
human ego video
  -> rough human hand/object trajectory
  -> robot retargeting
  -> simulation or digital twin rollout
  -> RL / MPC / trajectory optimization refinement
  -> executable robot demonstration
  -> downstream imitation policy
```

在这个 pipeline 里，RL 是一个 **refinement engine**。它从很强的人类先验出发，修正那些 human video 无法直接给到 robot coordinates 的细节：

- 稳定的 grasp pose；
- contact force 和 compliance；
- object reorientation；
- handover timing；
- bimanual coordination；
- release phase；
- 小 tracking error 下的恢复。

这种 framing 也让 RL 更容易 scale。目标并不是直接部署 RL policy。目标是用 RL 从 human videos 制造更好的 demonstrations，再用这些 demonstrations 训练稳健的 visuomotor policy。

## 一个值得押注的方向

我会把这个方向概括成：

**Ego-to-Robot Action Refinement with Physics Feedback**

或者：

**把 egocentric human videos 转成 contact-feasible robot demonstrations。**

这条路线把当前几篇工作的优点串起来：

- Phantom 和 Masquerade 说明 visual embodiment editing 有帮助。
- HumanEgo 说明 hand-object interaction 是很强的抽象。
- EgoEngine 说明 executable action generation 是关键性能来源。
- RL 或 trajectory optimization 可以补上 physics feedback loop。

下一步大概率不会只是一个纯视觉生成模型。更有价值的系统应该能看懂 human video，推断 interaction intention，retarget 到机器人，在 simulation 里测试，修复 contact sequence，最后输出真实机器人可以使用的训练数据。

到这个阶段，egocentric video 就不只是 visual pretraining source。它会变成 robot demonstration engine。

</div>
