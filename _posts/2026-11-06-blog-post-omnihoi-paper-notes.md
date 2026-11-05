---
title: "[Paper Notes] OmniHOI: Dexterous Hand-Object Interaction from Monocular Human Video"
date: 2026-11-06
permalink: /posts/2026/11/omnihoi-paper-notes/
excerpt: "OmniHOI reconstructs finger contacts from RGB video, transfers them to a robot hand, and uses simulated object motion to refine each grasp. Its ablations show how a finger piercing an object can fool a trajectory metric."
tags:
  - Paper Notes
  - Dexterous Manipulation
  - Hand-Object Interaction
  - Motion Retargeting
  - Trajectory Optimization
  - Human Demonstrations
---

<div data-lang="en" markdown="1">

A simulated hand can lift a plate by putting a finger through it. Score the trial by how closely the plate follows the demonstrated path, and that grasp can pass. OmniHOI turns a single RGB video into a robot trajectory and checks the grasp at three points: what the camera saw, where the robot fingers touch, and whether those contacts can sustain the motion in simulation.

Ting Mao, Yanming Shao, Ziheng Wang, Haoyu Liu, Yiqun Wang, Xuanye Wu and Yao Mu. [arXiv preprint, v2, October 14, 2026](https://arxiv.org/html/2610.10855v2) · [Project videos](https://hydrofoooil.github.io/OmniHOI/)

### Which side of the handle is the finger on?

In one camera view, a fingertip can project onto a handle at several plausible depths. The visible surface gives a clue: wherever the finger hides the handle, the hand must be closer to the camera. OmniHOI first fits a hand mesh to estimated 3D scene points at matching pixels, giving more weight to points near the object. It spends its keyframe budget where wrist or joint motion changes rapidly, including direction reversals.

At each keyframe, two fits alternate. One adjusts the hand to reproduce which surface is visible at overlapping pixels. The other draws the palmar surfaces toward the object and pushes any embedded finger surface outward. A thin plate needs a separate check: gradients on opposite sides of a link can cancel even when the link pierces the plate. The solver traces the finger's bone chain for surface crossings and moves the joints just enough to clear them.

### What survives a change of hand?

A robot finger with a different length can match the human finger's direction and still miss the handle. OmniHOI marks the patch each contacting finger reached on the object. Starting from a keypoint fit, it adjusts the robot wrist and joints so points on the robot finger reach a narrow band around that patch, giving crossing repairs first priority.

The resulting keyframes specify where contact should occur; they cannot establish that a grip will hold. OmniHOI interpolates them to 60 Hz and tries small wrist and joint offsets in MuJoCo. A derivative-free optimizer (CMA-ES) scores short rollouts by object position and orientation, gaps at intended contacts, opposing contact forces and penetration. It checks the end of each window so a grasp already starting to slip scores poorly, then fixes the chosen offset and advances. This produces one trajectory per demonstration without training a task-specific policy.

### Reading the success rates

Success measures the object's motion: after rigid alignment, its RMS position and rotation errors must fall below 10 cm and 0.5 radians. The paper tests two different starting points ([Tables 2–3](https://arxiv.org/html/2610.10855v2#S4)):

| Input | What the simulation showed |
|---|---|
| 150 motion-capture trajectories per hand | XHand reached 89%; the six-motor Inspire Hand reached 39%. The three other hands reached 85–89%. This isolates transfer from video reconstruction. |
| 60 RGB clips, XHand | OmniHOI reached 53%, VideoManip 28%, and Do as I Do 25%. The authors selected clips with less occlusion and larger hand and object images. |

The most revealing control is replay before physics optimization. Adding contact repair turned 51 apparent successes into failures; in 38 of those original replays a finger had passed through the object. For evaluating a retargeter, this suggests inspecting finger crossings alongside object tracking. A better score alone can reward a worse grasp.

Scale remains a practical limit: an incorrectly sized object accounted for 12 of the 28 failed video trials. The authors also replayed seven self-recorded demonstrations on two UR5e arms with XHands. These open-loop hardware examples show what transfers when the scene is reproduced; the 53% figure belongs to the simulation benchmark.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

在仿真里，一根手指穿透盘子，也能把盘子“端”起来。如果只看盘子的运动轨迹与演示有多接近，这次抓取就可能得分。OmniHOI 从一段单目 RGB 视频生成机器人轨迹，分三步检查抓取：画面里谁挡住了谁，换成机械手后各指碰到了哪里，以及这些接触在仿真中能否带动物体。

作者：Ting Mao、Yanming Shao、Ziheng Wang、Haoyu Liu、Yiqun Wang、Xuanye Wu、Yao Mu。[arXiv 预印本，2026 年 10 月 14 日 v2](https://arxiv.org/html/2610.10855v2) · [项目视频](https://hydrofoooil.github.io/OmniHOI/)

### 手指在把手的哪一侧？

从一个视角看，指尖处在几个不同的深度，都可能投影到把手上。遮挡关系提供了一条线索：在手指挡住把手的像素处，手指一定更靠近相机。OmniHOI 先按像素对应关系，把人手网格配准到估计的三维场景点上，并给物体附近的点更高权重。手腕或指关节运动变化越快，分到的关键帧就越多，因此动作转向的瞬间也能保留下来。

每个关键帧交替做两次拟合。第一步调整手形和关节，让渲染结果与画面里的遮挡顺序一致；第二步让手指掌侧靠近物体表面，同时把陷进物体的部位向外推。薄盘子还需要单独处理：指节已经穿过盘面时，两侧的距离梯度可能恰好抵消。算法沿指骨折线检查是否穿过表面，再用尽可能小的关节调整把手指移出来。

### 换一只手，哪些接触要保留？

机械手的指长变了，即使指向与人手一致，指腹也可能够不到把手。OmniHOI 在物体表面标出每根手指原先接触的区域。以关键点拟合为起点，算法先修复穿透，再调整机械手腕和指关节，让机械手指表面的采样点落到相应接触区附近。

关键帧确定了手指应该碰到哪里，抓得稳不稳还得看物体怎么动。算法把关键帧插值到 60 Hz，在 MuJoCo 中试跑多组腕部和关节偏移量。无梯度优化器 CMA-ES 根据物体位姿误差、预期接触处的间隙、相向接触力和穿透程度为短时轨迹打分。窗口末端会再检查一次：如果物体已经开始滑，即使前半段跟得准，得分也会下降。算法随后固定当前关键帧的偏移，向前推进。每段演示各自得到一条轨迹，无需为任务单独训练策略。

### 成功率衡量了什么？

评价对象是物体的运动。轨迹经刚体对齐后，位置和旋转的均方根误差须分别低于 10 厘米和 0.5 弧度。论文用两组实验区分误差来源（[表 2、表 3](https://arxiv.org/html/2610.10855v2#S4)）：

| 输入 | 仿真结果 |
|---|---|
| 每种机械手各迁移 150 条动捕轨迹 | XHand 成功率为 89%，六电机的 Inspire Hand 为 39%，其余三种手为 85–89%。这里单独考察动作迁移，跳过了视频重建。 |
| 60 段 RGB 视频，均迁移至 XHand | OmniHOI 为 53%，VideoManip 为 28%，Do as I Do 为 25%。入选片段中手与物体遮挡较少，在画面中所占面积也较大。 |

最能说明问题的是物理优化前的回放。加入接触修复后，原先判为成功的轨迹中有 51 条变成失败；回查这 51 条，发现原先有 38 条出现了手指穿过物体的情况。评测重定向算法时，可以把穿透检查和物体轨迹误差放在一起看，否则分数更高的抓取反而可能更不可信。

物体尺度仍是实际瓶颈：28 次视频实验失败中，有 12 次归因于重建尺寸错误。作者还用两台配备 XHand 的 UR5e 机械臂回放了七段自行录制的演示。这些开环实机案例展示了复现演示场景后可以执行的动作；上文的 53% 是仿真基准上的成功率。

</div>
