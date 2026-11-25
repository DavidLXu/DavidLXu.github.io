---
title: "[Paper Notes] DexDuet: Learning Contact-Preserving Bimanual Dexterity from Human Demonstrations"
date: 2026-11-25
permalink: /posts/2026/11/dexduet-paper-notes/
excerpt: "DexDuet learns a bimanual policy for one human demonstration. Contact-AUC measures whether each hand stays on the demonstrated object part without sliding."
tags:
  - Paper Notes
  - Dexterous Hands
  - Bimanual Manipulation
  - Reinforcement Learning
  - Human Demonstrations
---

<div data-lang="en" markdown="1">

Haoran Zhang, Haokai Ding, Han Zhou, Zuxing Lu, Heng Zhang and Xingxing Zuo · November 23, 2026 · [arXiv preprint](https://arxiv.org/abs/2611.30495v1)

Two robot hands can carry a bottle along the demonstrated path even as one hand slides or the other catches it on the wrong side. DexDuet treats the contacts that produced the motion as part of the skill. One human demonstration supplies the reference, and reinforcement learning in simulation fits a policy to that demonstration.

### What each hand learns

The two hands share network weights. Each receives information about its partner, and the optimizer clips each hand’s policy update separately. One reward follows the geometry formed by the palm, fingers and fingertip gaps. A second compares contact locations between corresponding regions of the human and robot hands and the manipulated object part. Matching only fingers present on the target hand lets the same construction work across different finger counts. During training, the simulator can help the object follow its trajectory. The curriculum adjusts help by segment and samples starting states the policy has already reached, so a difficult handover can be practiced before the full sequence is reliable.

### Measuring a grip while the object moves

**Contact-AUC** examines windows in which a human hand maintains contact with an object part. It scores whether the corresponding robot hand stays on that part and how far its contacts drift in the part’s own coordinate frame. A rigidly held bottle can travel across the table while this drift stays small. On simulated Inspire hands in the DexMachina suite, object tracking (ADD-AUC) rose from **52.5 to 88.7**, and Contact-AUC from **33.6 to 79.6**. Among 122 pairs of runs matched within three ADD-AUC points, DexDuet had the higher contact score in 117. This comparison controls for much of the difference in object tracking. [Tables 1–2 and supplement C](https://arxiv.org/pdf/2611.30495v1)

The physical examples replay trajectories learned in simulation. Two Franka arms with Allegro hands reorient a bottle, and a Unitree G1 with Inspire hands lowers a box. These are demonstrations of open-loop execution. A new object or motion still calls for a separately trained policy, and recovery from a real slip remains an open question.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

Haoran Zhang、Haokai Ding、Han Zhou、Zuxing Lu、Heng Zhang、Xingxing Zuo · 2026 年 11 月 23 日 · [arXiv 预印本](https://arxiv.org/abs/2611.30495v1)

两只机械手把瓶子沿示范轨迹搬到了终点，中途却可能有一只手在打滑，或是靠另一只手从错误的位置接住了瓶子。DexDuet 把产生物体运动的接触关系也视为技能的一部分。每条人类示范给出一个参考序列，再在仿真中用强化学习为它训练策略。

### 每只手具体学什么

两只手共享网络参数，各自能看到另一只手的状态，优化时分别裁剪左右手的策略更新幅度。一项奖励描述手掌、手指的朝向及指尖间距，另一项奖励约束人手和机械手的对应区域接触了物体哪个部位。目标手上有对应关系的手指才参与匹配，因此不同指头数也能训练。仿真器可以辅助物体跟随参考轨迹，再按示范片段调整辅助强度。策略还可以从自己曾经到达过的状态重新开始，专门练习整段动作中容易失败的交接环节。

### 物体在动，如何衡量手有没有滑

**Contact-AUC** 取人手持续接触同一物体部件的时间窗口，检查相应机械手是否留在该部件上，并在部件自身坐标系里衡量接触点漂移。瓶子可以随手移动很远，只要抓得牢，漂移仍然很小。在 DexMachina 仿真的 Inspire 手上，物体跟踪指标 ADD-AUC 从 **52.5 提至 88.7**，Contact-AUC 从 **33.6 提至 79.6**。作者还配对了 122 组 ADD-AUC 相差至多 3 分的运行结果，其中 117 组由 DexDuet 获得更高的接触分数。这说明即使物体轨迹相当接近，接触质量仍有可辨认的差别。[表 1–2 与补充材料 C](https://arxiv.org/pdf/2611.30495v1)

真机部分采用开环回放。两台 Franka 搭配 Allegro 手共同转动瓶子，Unitree G1 搭配 Inspire 手把箱子放到地上。每段新动作仍要单独训练，真机发生意外滑移后能否恢复，还需要闭环实验验证。

</div>
