---
title: "[Paper Notes] FACT: A Multimodal Force-Action-Track Foundation Model for Human-to-Robot Dexterity"
date: 2026-10-25
last_modified_at: 2026-11-03
permalink: /posts/2026/10/fact-paper-notes/
excerpt: "FACT couples future force and action denoising after visual-track planning; these notes explain EgoForce, the noise handoff, and the different metrics in its ten-task evaluation."
tags:
  - Dexterous Manipulation
  - Force Prediction
  - Tactile Sensing
  - Flow Matching
  - Human Demonstration Videos
  - Human-Robot Transfer
  - Paper Notes
---

<div id="fact-en" data-lang="en" markdown="1">

## TL;DR

FACT transfers human dexterous experience through a model that first predicts visual motion and a coarse action, then jointly refines the action and its future force consequences. Its EgoForce dataset adds calibrated human tactile measurements to video and hand motion.

The distinction to watch is the role of force: observed touch supplies current context, while **future force is a generated target that interacts with action during denoising**. On seven binary real-robot tasks, FACT averages 41.4% success versus T-Rex's 8.6%. The full ten-task suite also includes musical-note scores and a pipette adjustment metric, which should remain separate.

## Paper and reading version

**FACT: A Multimodal Force-Action-Track Foundation Model for Human-to-Robot Dexterity** — Zhi Cao, Yining Hong, Jiaolong Yang, Yejin Choi, Li Fei-Fei, Jiajun Wu, Huang Huang. These notes follow [arXiv:2610.19155v1](https://arxiv.org/abs/2610.19155v1), an arXiv preprint, rechecked against the main text and appendices on November 3, 2026. [PDF](https://arxiv.org/pdf/2610.19155v1) · [Project](https://fact-1-0.github.io/)

These notes focus on Sections III–V, Figure 3, and Tables I–III. The model is evaluated after skill-specific fine-tuning, not as one unchanged zero-shot policy across the ten tasks.

## EgoForce adds contact measurements to human demonstrations

The EgoForce collection platform combines a head stereo camera, two wrist cameras, and tactile gloves. Hand motion is estimated from video using ViTPose keypoints and HaMeR hand meshes, with stereo depth supplying metric scale. Glove bend sensors and an orientation IMU help refine estimates under occlusion. A calibration system applies approximately uniform pneumatic pressure from 0 to 50 psi. For each sensing element, pressure and area determine a reference force, $F_i=P_iA_i$, which is paired with the raw A/D reading to fit a calibration mapping.

EgoForce contains approximately **2,000 hours, 40,000 episodes, 1,000 tasks, 120 scenes, and 1,000 demonstrators**. Fine manipulation occupies more than two thirds of the corpus. Pretraining mixes these human demonstrations with 100 hours of T-Rex robot teleoperation data, sampled proportionally to hours.

Calibration does not remove every human–robot difference. It does provide a physical supervision signal that visual motion alone omits: similar hand poses can correspond to different contact loads.

## A shared wrench format still leaves a sensing gap

Human fingertip measurements are converted into the robot model's six-axis wrench format. For twelve taxels on a fingertip, summing the calibrated normal forces gives the normal load. Their force-weighted centroid gives the center of pressure, from which two bending moments are derived. **Tangential forces and the twisting moment are set to zero**, because the pressure array cannot observe them. Thus, a shared six-dimensional tensor does not imply equally complete sensing on humans and robots. [Appendix C(b)](https://arxiv.org/pdf/2610.19155v1#page=10)

Human finger angles are retargeted to the Sharpa Wave's 22 joints. Wrist poses use the same chunk-relative convention as robot actions. Each arm contributes three position coordinates, six rotation coordinates, and 22 hand joints, giving $2(3+6+22)=62$ action dimensions. This end-effector representation also accommodates the different arms used for T-Rex pretraining and YAM fine-tuning.

The ninety human demonstrations per downstream task are newly collected on the evaluation tasks, using Wuji gloves, wrist cameras, and VIVE wrist trackers. They are separate from EgoForce's pretraining corpus and use a different acquisition setup. The ten-robot-trajectory result therefore also depends on ninety task-specific human demonstrations, plus the human and robot pretraining data. [Appendix C(e–f)](https://arxiv.org/pdf/2610.19155v1#page=11)

## The coarse planner predicts a shared visual future

FACT's coarse planner is a 5B video DiT initialized from Wan2.2-TI2V. Task text and anchor-image features enter through cross-attention. Clean video context, robot state, and past tracks condition the generation of future video, visual tracks, and an action chunk.

For a clean target $c$, noise $\epsilon$, and noise level $\tau$,

$$
x_\tau=(1-\tau)c+\tau\epsilon,\qquad v^*=\epsilon-c.
$$

Per-token noise conditioning lets clean context coexist with noisy prediction targets. The model uses a block-causal attention structure; track tokens retain a dedicated geometric pathway. The coarse loss combines video and action flow losses with track flow, position, and smoothness terms:

$$
\mathcal L_{\rm coarse}=\mathcal L_{\rm dyn}+\mathcal L_{\rm act}
+20\left(\mathcal L_{\rm trk}^{\rm flow}
+5\mathcal L_{\rm trk}^{\rm pos}
+2\mathcal L_{\rm trk}^{\rm smooth}\right).
$$

At inference, six Euler steps take the generated modalities to $\tau=0.4$. An additional forward pass at $\tau=0.4$ reads out video and tracks and supplies the cached hidden states; the action is still partially denoised. Hidden states from observation and action tokens become fixed coarse memory for the next stage. This shared visual-motion prediction is the proposed route for transferring task structure across different hands.

## Future force and action are refined together

The refiner receives the partially denoised action, observed tactile history, and noisy future-force tokens. Bidirectional self-attention allows action and future force to influence each other. Cross-attention reads the cached coarse memory without rerunning the large planner.

The two target streams use different schedules:

$$
\tau_a:0.4\rightarrow0,\qquad \tau_F:1\rightarrow0.
$$

Four Euler steps update the remaining action suffix and unobserved force slots. Executed actions and observed force remain fixed. At the subsequent 5 Hz tactile refreshes—action offsets 4, 8, and 12—the refiner runs again against cached coarse memory, with executed actions and newly measured force slots clamped. **Predicted future force is not sent to the controller as a force reference**; it influences action through joint denoising and is logged for analysis. This separates learned anticipation from measured feedback in the execution loop. [Appendix B(f)](https://arxiv.org/pdf/2610.19155v1#page=10)

The policy outputs a 16-step action chunk at 20 Hz, with 62 dimensions for the two arms and hands. Future tactile prediction has shape $4\times10\times6$, matching four 5 Hz refresh slots and ten fingertips. The refiner loss supervises action and force velocities, with force weight 0.5, plus a VQ term. The overall objective adds this loss to the coarse objective, and the components train jointly.

“Frozen coarse memory” refers to caching within a sampling pass. The DiT backbone itself is fine-tuned during training. Confusing these two meanings of frozen would lead to a different implementation.

## Ten tasks require three kinds of result

The YAM station uses two Sharpa Wave hands with fingertip six-axis sensing, one ego camera, and two wrist cameras. Each downstream task has **ten robot and ninety human demonstrations** for fine-tuning. Binary tasks use ten evaluation rollouts, with randomized object placement.

| Binary task | T-Rex | Full FACT |
|---|---:|---:|
| Lab pipetting | 0% | 40% |
| Open test-tube cap | 20% | 80% |
| Open microcentrifuge flip cap | 20% | 50% |
| Tie shoelaces | 0% | 20% |
| Shuffle cards | 10% | 30% |
| Multi-object grasp | 0% | 40% |
| Use screwdriver | 10% | 30% |
| Mean of seven binary tasks | 8.6% | 41.4% |

The maximum 60-point gain over T-Rex occurs on test-tube cap opening. It is not an average gain across the suite.

Harp and xylophone scores count cleanly sounded notes out of ten: FACT reaches 6.7 and 5.4, versus T-Rex's 2.1 and 3.2. Pipette-volume adjustment reports whether the robot engages the dial, followed by error only on engaged trials. FACT engages in **5/10 trials**, with **6.4 µL** mean absolute error; T-Rex engages in 2/10, with 14.0 µL error. Reporting the error without engagement frequency would hide half of FACT's failures.

## What the ablations support

Removing future-force prediction reduces the seven-task binary mean from 41.4% to 14.3%; removing track prediction gives 35.7%. For harp playing, eliminating force prediction drops the clean-note score from 6.7 to zero. The force-prediction pathway matters within this architecture, though the ablation changes the learned model as a whole.

Human force supervision during pretraining is also consequential. Removing it while retaining human data drops test-tube opening from 80% to zero and pipetting from 40% to 20%. Multi-object grasp remains at 40%, showing that the effect varies by task.

A separate comparison keeps ten robot demonstrations fixed and adds ninety human demonstrations: shoelace success rises from 10% to 20%, card shuffling from 10% to 30%, and pipette-dial engagement from 4/10 to 5/10, with conditional error falling from 11.2 to 6.4 µL. This tests the benefit of adding human data; the following mixture experiment instead holds total dataset size fixed. [Table III](https://arxiv.org/pdf/2610.19155v1#page=6)

On three selected tasks, replacing part of a fixed 100-trajectory fine-tuning set with additional robot data produces fairly small observed changes. This supports the usefulness of human data in that regime. Ten evaluation trials and a few mixtures cannot establish a universal human-to-robot data exchange rate.

My takeaway is to test future-force prediction as an action-coupled target, and to preserve engagement or contact-establishment metrics alongside final precision. For manipulation like turning a pipette dial, reaching stable contact is already a large part of the problem.

</div>

<div id="fact-zh" data-lang="zh" markdown="1" style="display: none;">

## TL;DR

FACT 先预测视觉运动和粗动作，再联合细化动作及其未来力学后果，将人类灵巧操作经验迁移到机器人。EgoForce 数据集在视频和手部运动之外，增加了经过标定的人类触觉测量。

需要注意力信号的两种角色：已观测触觉提供当前上下文，**未来力则是生成目标，并在去噪过程中与动作相互影响**。七项二元评分真机任务上，FACT 平均成功率为 41.4%，T-Rex 为 8.6%。完整十项任务还包含乐器音符评分和移液器调节指标，应分开报告。

## 论文与阅读版本

**FACT: A Multimodal Force-Action-Track Foundation Model for Human-to-Robot Dexterity**，作者：Zhi Cao, Yining Hong, Jiaolong Yang, Yejin Choi, Li Fei-Fei, Jiajun Wu, Huang Huang。本文依据 [arXiv:2610.19155v1](https://arxiv.org/abs/2610.19155v1) 预印本，于 2026 年 11 月 3 日重新核对正文与附录。[PDF 全文](https://arxiv.org/pdf/2610.19155v1) · [项目主页](https://fact-1-0.github.io/)

本文重点阅读第 III–V 节、Figure 3 及 Tables I–III。每项技能都经过单独微调，不能把十项任务的结果理解为同一个未经适配的零样本策略。

## EgoForce 为人类示范补上接触测量

EgoForce 采集平台包含头部双目相机、双腕相机和触觉手套。手部运动由视频中的 ViTPose 关键点和 HaMeR 手部网格估计，双目深度提供公制尺度；遮挡时，手套弯曲传感器与姿态 IMU 辅助修正估计。标定系统施加约均匀的 0–50 psi 气压，对每个感知单元根据压力与面积计算参考力 $F_i=P_iA_i$，再与原始 A/D 读数配对拟合标定映射。

EgoForce 约包含 **2,000 小时、40,000 个回合、1,000 项任务、120 个场景和 1,000 名示范者**，精细操作占数据的三分之二以上。预训练将这些人类数据与 100 小时 T-Rex 机器人遥操作数据按时长比例混合。

标定不能消除人手与机器人之间的所有差异，但能提供视觉运动缺少的物理监督：类似手部姿态可能对应不同的接触载荷。

## 统一力旋量格式之后，感知差异仍然存在

人类指尖测量会转换为机器人模型使用的六轴力旋量。每个指尖有十二个感知单元：标定后的法向力求和得到法向载荷，以力为权重计算质心得到压力中心，再据此推导两个弯曲力矩。**切向力和绕法向的扭转力矩被置零**，因为压力阵列无法观测这些分量。因此，两端具有相同的六维张量格式，并不意味着它们具有同样完整的力学信息。[附录 C(b)](https://arxiv.org/pdf/2610.19155v1#page=10)

人手关节角被重定向到 Sharpa Wave 的 22 个关节，腕部位姿采用与机器人动作相同的动作块起点相对坐标约定。每条手臂对应三维位置、六维旋转表示和 22 个手部关节，合计 $2(3+6+22)=62$ 维。末端位姿表示也使 T-Rex 预训练与 YAM 微调所用的不同机械臂能够共享动作空间。

每项下游任务的九十条人类示范是在评测任务上重新采集的，使用 Wuji 手套、腕部相机和 VIVE 腕部追踪器。这批数据独立于 EgoForce 预训练语料，采集配置也不同。因此，“十条机器人轨迹”的结果同时依赖九十条任务专属人类示范，以及此前的人类与机器人预训练数据。[附录 C(e–f)](https://arxiv.org/pdf/2610.19155v1#page=11)

## 粗规划器预测可共享的视觉未来

粗规划器是以 Wan2.2-TI2V 初始化的 5B 视频 DiT。文本和锚点图像特征通过 cross-attention 输入；干净的视频上下文、机器人状态和历史轨迹用于预测未来视频、视觉轨迹与动作块。

给定干净目标 $c$、噪声 $\epsilon$ 和噪声等级 $\tau$：

$$
x_\tau=(1-\tau)c+\tau\epsilon,\qquad v^*=\epsilon-c.
$$

每个 token 独立的噪声条件，使干净上下文与带噪目标可以共存。模型采用分块因果注意力结构，轨迹 token 保留独立的几何通路。粗规划损失结合视频和动作 flow loss，以及轨迹的 flow、位置与平滑项：

$$
\mathcal L_{\rm coarse}=\mathcal L_{\rm dyn}+\mathcal L_{\rm act}
+20\left(\mathcal L_{\rm trk}^{\rm flow}
+5\mathcal L_{\rm trk}^{\rm pos}
+2\mathcal L_{\rm trk}^{\rm smooth}\right).
$$

推理时，六次 Euler 更新将生成模态推进到 $\tau=0.4$，随后在 $\tau=0.4$ 额外做一次前向计算，读出视频、轨迹和用于缓存的隐藏状态；动作仍保留部分噪声。观测和动作 token 的隐藏状态被固定为下一阶段的粗规划记忆。共享的视觉运动预测，承担不同手部之间任务结构迁移的作用。

## 未来力与动作如何共同细化

细化器接收部分去噪动作、已观测触觉历史和带噪未来力 token。双向 self-attention 使动作与未来力相互影响，cross-attention 则读取缓存的粗规划记忆，无需重复运行大型规划器。

两类目标使用不同噪声日程：

$$
\tau_a:0.4\rightarrow0,\qquad \tau_F:1\rightarrow0.
$$

四次 Euler 更新只修改尚未执行的动作后缀与尚未观测的力。已经执行的动作和已观测力保持固定；后续 5 Hz 触觉刷新对应动作偏移 4、8、12，细化器利用缓存的粗规划记忆再次运行，并锁定已执行动作和新测得的力槽位。**预测的未来力不会作为力参考发送给控制器**；它通过联合去噪影响动作，并被记录用于分析。执行闭环中，学习到的接触预期与实际测量反馈分别承担不同作用。[附录 B(f)](https://arxiv.org/pdf/2610.19155v1#page=10)

策略输出 20 Hz、16 步的动作块，双臂双手合计 62 维。未来触觉预测形状为 $4\times10\times6$，对应四个 5 Hz 刷新槽和十个指尖。细化损失监督动作与力的速度场，力项权重为 0.5，另有 VQ 项；整体目标将其与粗规划损失相加，联合训练各组件。

“冻结粗规划记忆”指一次采样过程中的缓存，DiT 骨干在训练时仍然微调。混淆这两种冻结含义，会得到不同的实现。

## 十项任务需要三种结果指标

真机平台是搭载两只 Sharpa Wave 手的 YAM，具备指尖六轴感知、一个第一人称相机和两个腕部相机。每项下游任务用**十条机器人示范与九十条人类示范**微调。二元任务各评测十次，随机改变物体位置。

| 二元任务 | T-Rex | 完整 FACT |
|---|---:|---:|
| 实验室移液 | 0% | 40% |
| 打开试管旋盖 | 20% | 80% |
| 打开微量离心管翻盖 | 20% | 50% |
| 系鞋带 | 0% | 20% |
| 洗牌 | 10% | 30% |
| 多物体抓取 | 0% | 40% |
| 使用螺丝刀 | 10% | 30% |
| 七项二元任务均值 | 8.6% | 41.4% |

相对 T-Rex 的最大 60 个百分点提升出现在打开试管旋盖任务，并非整个任务集的平均收益。

竖琴和木琴统计十个目标音符中清晰发声的数量，FACT 分别为 6.7 和 5.4，T-Rex 为 2.1 和 3.2。移液器容积调节先统计是否成功接触并操作旋钮，再只在已操作回合上计算误差。FACT 为 **5/10 次接合成功、平均绝对误差 6.4 µL**；T-Rex 为 2/10 次、14.0 µL。只写精度而不报告接合比例，会隐藏 FACT 一半的失败。

## 消融能够支持哪些判断

移除未来力预测后，七项二元任务均值由 41.4% 降至 14.3%；移除轨迹预测后为 35.7%。竖琴任务中，去除力预测让清晰音符数从 6.7 降到零。力预测通路在这个架构内有明显作用，但消融也会改变整个模型的学习结果。

预训练阶段的人类力监督同样重要。保留人类数据、去掉其中的力监督后，开试管旋盖从 80% 降到零，移液从 40% 降到 20%；多物体抓取仍为 40%，说明影响依任务而异。

另一组比较固定十条机器人示范，再加入九十条人类示范：系鞋带成功率从 10% 升至 20%，洗牌从 10% 升至 30%，移液器旋钮接合从 4/10 升至 5/10，条件误差从 11.2 降至 6.4 µL。这检验的是增加人类数据的收益；下面的数据混合实验则固定总数据量。[表 III](https://arxiv.org/pdf/2610.19155v1#page=6)

在三项选定任务上，保持微调集为 100 条轨迹，增加机器人数据、减少人类数据，观察到的变化较小。这支持人类数据在该设置下的实用价值，但少量数据混合比例和每项十次评测，不足以建立普遍的人类—机器人数据换算关系。

我会优先测试与动作耦合的未来力预测，同时保留接触建立或接合成功指标。对于旋转移液器刻度盘这类操作，先形成稳定接触，本身就占据了很大一部分难度。

</div>
