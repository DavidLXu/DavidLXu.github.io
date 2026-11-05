---
title: "[Paper Notes] DexPort: A Hand-Held Skill Interface for Dexterous Hand Data Collection"
date: 2026-11-05
permalink: /posts/2026/11/dexport-paper-notes/
excerpt: "DexPort collects demonstrations with a hand-held 20-DoF robot hand. A diffusion policy learns wrist motion and finger joint commands, including the closing commands that sustain a grasp during contact."
tags:
  - Paper Notes
  - Dexterous Manipulation
  - Imitation Learning
  - Data Collection
  - In-Hand Manipulation
  - Visuomotor Learning
  - Proprioception
  - Diffusion Policy
---

<div data-lang="en" markdown="1">

When a robot hand closes around a package, the fingers stop moving as soon as the package resists them. The controller may still be asking them to close farther. **DexPort records both signals**, so a robot learning from the demonstration can recover the command that kept the package in the hand. The operator can collect that demonstration wherever they can carry the hand.

Amber Xie, Jiawei Fu, Xiaofeng Guo, Carmelo Sferrazza, Guanya Shi and Haozhi Qi published the preprint on October 23, 2026. [Paper](https://arxiv.org/abs/2610.32969) · [Project and videos](https://amberxie88.github.io/dexport/)

## What the operator controls

A 20-DoF Wuji hand and a fisheye camera attach to a Quest 2 controller. Moving the controller sets the wrist trajectory. The operator can position the thumb with the joystick, then close one finger for a pinch or four fingers for a power grasp. Screwing illustrates a more involved division of labor. The operator guides the wrist to keep the tool aligned while a button activates a finger-gaiting policy trained in simulation. The fingers take turns repositioning so the tool can keep turning inside the grasp.

For deployment, the hand and camera move together from the controller to a robot arm, preserving the camera's view relative to the fingers. The skills simplify demonstration. During behavior cloning, a diffusion policy learns the wrist motion and all 20 joint targets directly from the demonstrations. It can reproduce the finger sequence without a skill label or a signal telling it when the operator pressed the button. [Method, §III](https://arxiv.org/html/2610.32969v1#S3)

## What a joint angle leaves out

Imagine replaying the measured finger position at the instant of contact. Once the finger reaches that angle, the position controller has little error left to correct. Replaying the original closing target preserves the error that makes the finger keep pressing. The difference becomes visible during barcode scanning, when the robot has to hold the package while presenting it to the scanner.

Across pick-and-place, drawer stowing and bimanual scanning, average final success was **64% with commanded targets and 11% with measured states as action labels**. Screwing used different metrics. The state-trained policy held the tool longer (31.7 versus 15.6 seconds), while the command-trained policy turned it faster (3.8 versus 1.2 rotations per minute). Holding on and making progress on the screw are distinct outcomes. [Results and comparison videos](https://amberxie88.github.io/dexport/)

## What portable collection adds

The team collected 1,617 laboratory demonstrations across four tasks and another 1,007 pick-and-place demonstrations in homes and offices. With 700 lab examples, adding 1,000 from outside the lab raised average pick-and-place success from **36% to 78%** across familiar objects, unfamiliar objects and scenes with distractors.

The smaller training set reveals a boundary. With 500 lab examples, adding the same 1,000 demonstrations improved performance on familiar objects and cluttered scenes, but success on unfamiliar objects fell from 20% to 7%. The portable collection changed the surroundings while reusing the lab objects. For a team planning its own collection, the distinction matters. New rooms provide visual variety, while new grasp geometries require a separate decision about which objects to bring. [Appendix A, Table III](https://arxiv.org/html/2610.32969v1#A1)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

机械手握住包裹时，手指受到阻挡，关节角度可能已经不再变化，控制器却还在要求手指继续闭合。**DexPort 把实际角度和闭合指令都记下来**，这样机器人从示范中能学到当时靠什么指令握住了包裹。采集时，操作者手持这只机械手就能完成示范，也可以把它带出实验室。

这篇预印本发表于 2026 年 10 月 23 日，作者为 Amber Xie、Jiawei Fu、Xiaofeng Guo、Carmelo Sferrazza、Guanya Shi 和 Haozhi Qi。[论文](https://arxiv.org/abs/2610.32969) · [项目与演示视频](https://amberxie88.github.io/dexport/)

## 操作者怎么控制二十个自由度

设备把一只 20 自由度的 Wuji 灵巧手和鱼眼相机装在 Quest 2 手柄上。操作者移动手柄，就给出了腕部轨迹。手指可以成组控制，例如用摇杆调好拇指位置，再单独合拢食指去捏小物体，或让其余四指一起闭合，包住较大的物体。拧螺丝时，两部分的分工尤其清楚。人移动手腕，让工具对准螺丝，再按键启动一个在仿真中训练的策略，让各根手指交替换位，持续转动手里的工具。

部署时，把机械手和相机一起从手柄移到机械臂上，相机相对手指的视角也就保留下来。采集阶段用技能来简化操作，行为克隆阶段则用扩散策略直接学习腕部运动和全部 20 个关节的目标值。模型可以从连续指令中学到换指过程，训练数据无需标注操作者用了哪个技能、在哪一刻按了键。[论文方法，第 III 节](https://arxiv.org/html/2610.32969v1#S3)

## 只记录关节角度，会漏掉什么

假设把接触瞬间测到的手指角度当作目标回放。手指一到这个角度，位置控制器要纠正的误差就很小了。如果回放当初发出的闭合指令，目标位置仍在物体表面以内，控制器便会继续驱动手指压住物体。双手扫码的对比视频里能看到这个差别。机械手需要一边移动包裹对准扫描器，一边维持抓力。

在抓取放置、抽屉收纳和双手扫码三项任务上，**用关节指令作动作标签，平均最终成功率为 64%，用实测关节位置作标签，平均为 11%**。拧螺丝单独计分。用实测位置训练的策略握住工具的时间更长（31.7 秒对 15.6 秒），用指令训练的策略转得更快（每分钟 3.8 圈对 1.2 圈）。如果只看工具多久掉下来，就会漏掉螺丝到底转了多少。[实验结果与对比视频](https://amberxie88.github.io/dexport/)

## 把设备带出实验室，增加了哪种数据

作者在实验室为四项任务采了 1,617 条示范，又到住宅和办公室采了 1,007 条抓取放置示范。以 700 条实验室示范为基础，加入 1,000 条外采示范后，抓取放置在熟悉物体、陌生物体和有干扰物三种条件下的平均成功率从 **36% 升至 78%**。

附录里的小数据实验给这个结果划出了边界。实验室示范减至 500 条时，加入同样的 1,000 条外采示范，熟悉物体和有干扰物两种条件都有改善，但陌生物体的成功率从 20% 降到了 7%。研究者带出门的是实验室里那批物体，变化主要来自周围环境。实际规划采集时，「去哪些房间」和「带哪些物体」值得分开考虑。前者改变视觉背景，后者才决定能覆盖多少种抓取形状。[附录 A，表 III](https://arxiv.org/html/2610.32969v1#A1)

</div>
