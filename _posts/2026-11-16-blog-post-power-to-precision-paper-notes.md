---
title: "[Paper Notes] From Power to Precision: Learning Fine-grained Dexterity for Multi-fingered Robotic Hands"
date: 2026-11-16
permalink: /posts/2026/11/power-to-precision-paper-notes/
excerpt: "Power to Precision co-optimizes parallel thumb–index control and printable fingertip contact planes using a learned simulation-success surrogate, improving precision grasp transfer on commercial dexterous hands."
tags:
  - Paper Notes
  - Dexterous Manipulation
  - Grasping
  - Co-Design
  - Imitation Learning
  - Sim-to-Real
---

<div data-lang="en" markdown="1">

## TL;DR

A hand can grasp a small object successfully in simulation and still miss it on the real robot. **From Power to Precision** tackles this mismatch by constraining precision grasps to parallel thumb–index motion and fitting those fingers with optimized, flat contact surfaces. A learned predictor of simulation success supplies gradients for the fingertip design. The resulting hardware and demonstrations support both simulation-trained grasping policies and ACT policies trained from teleoperation.

The strongest result is on unseen real objects: precision grasp success rises from **12.5% for Dex1B to 82.5% for the full method**, while control optimization alone reaches 20%. This is a joint hardware-and-control result, measured over 40 trials per grasp category. [Paper, Table I](https://arxiv.org/pdf/2511.13710v1)

## Paper and reading version

**From Power to Precision: Learning Fine-grained Dexterity for Multi-fingered Robotic Hands**, by Jianglong Ye, Lai Wei, Guangqi Jiang, Changwei Jing, Xueyan Zou, and Xiaolong Wang (UC San Diego). Ye and Wei contributed equally. These notes use **arXiv:2511.13710v1**, submitted November 17, 2025. The linked record identifies it as an arXiv preprint. [Paper record](https://arxiv.org/abs/2511.13710v1) · [Project and demonstrations](https://jianglongye.com/power-to-precision/)

## Make the precision motion easier to reproduce

The control pipeline separates power grasps from precision grasps. Power grasps retain the whole-hand force-closure formulation used by the baseline. For precision grasps, the optimizer fixes the other fingers and samples contacts only on the thumb and index fingertip. With contact positions $x_i$, normals $c_i$, and the grasp map $G$ that converts contact forces into an object wrench, it minimizes

$$
E_{\mathrm{precise}}=\|Gc\|_2,\qquad
c=[c_1^\top,\ldots,c_{2n}^\top]^\top.
$$

This encourages the selected contact normals to produce a small net force and torque. It is one grasp-synthesis objective; the generated demonstrations still undergo simulation filtering.

The approach motion also matters. Let $d$ be the unit direction from the thumb contacts to the index contacts. To open the fingers for a pre-grasp, use Jacobian pseudoinverses to move them apart:

$$
\Delta q_{\mathrm{thumb}}=-\alpha J_{\mathrm{thumb}}^\dagger d,
\qquad
\Delta q_{\mathrm{index}}=\alpha J_{\mathrm{index}}^\dagger d.
$$

Here $\alpha$ sets a small opening distance. This construction keeps the motion along a shared axis and reduces the number of contacts that must transfer accurately to the real robot. ManiSkill filters the trajectories. Two DexSimple policies learn power and precision grasps separately, and a PointNet–MLP switcher predicts which policy to use from the object.

For teleoperation, the same precision controller maps the operator's thumb–index distance to the robot's opening, alongside normal retargeting for other grasps. ACT then learns from camera images, robot joint positions, and raw joint-command targets. The simplified motion shapes the demonstrations; the learned policy still outputs robot joint targets. [Paper, Sections III-B and IV-A](https://arxiv.org/pdf/2511.13710v1)

## Optimize a contact plane and the pose that uses it

The hardware search changes the fingertip covers. Its design variable is a plane

$$
P=\{x\in\mathbb R^3:n^\top(x-p)=0\},\qquad \|n\|_2=1.
$$

A slightly inflated convex hull of the fingertip is projected onto this plane, and the resulting union geometry is 3D printed as a cover. During design optimization, the plane parameters and a hand configuration $q$ are optimized together. This $q$ describes the hand without an object present; it should be distinguished from an object-specific grasp pose.

Geometric attraction brings candidate thumb and index contacts toward the plane. Repulsion penalizes finger surface points crossing it. A directional manipulability term favors configurations that permit movement along the plane normal. Together, these terms seek contact surfaces that can meet and separate under the hand's existing kinematics.

The physics term adds task evidence. The authors first optimize **1,000 candidate planes** from different initializations using the geometric and kinematic terms, then evaluate them in simulated grasping. A PointNet encoder and MLP learn

$$
f(P,q,o)=\hat s\in[0,1],\qquad E_{\mathrm{phys}}=-f(P,q,o),
$$

where $o$ is an object point cloud and $\hat s$ predicts success. Optimization uses gradients through this predictor, sampling batches of objects while refining a shared plane $P$ and diverse configurations $q$. Although the paper calls it a neural-physics surrogate, its specified output is **task success probability**. The formulation supplies a differentiable design score without requiring a differentiable simulator or a prediction of the full next physical state. [Paper, Section III-C](https://arxiv.org/pdf/2511.13710v1)

## What changes in the experiments

The platforms are xArm with XHand and Unitree G1 with Inspire. For the simulated grasping comparison, each method receives 30,000 demonstrations per grasp type; 30% of objects are held out. Table I reports both platforms in simulation, while its quantitative zero-shot real-robot comparison uses xArm. Real evaluation uses unseen objects, five trials per object, and 40 trials per category.

| xArm zero-shot real grasping | Power grasp | Precision grasp |
| --- | ---: | ---: |
| Dex1B | 60.0% | 12.5% |
| Control optimization | 70.0% | 20.0% |
| Control + fingertip design | 80.0% | 82.5% |

The difference is much smaller in simulation: unseen-object precision success is 53.91% for Dex1B and 64.17% for the full method. The authors attribute the larger real-world gain to simpler motions and increased contact area, which tolerate sensing, calibration, and dynamics errors. This comparison makes transfer robustness the central result. [Paper, Table I and Section IV-B](https://arxiv.org/pdf/2511.13710v1)

Table II measures a different quantity: **success during precision-grasp data optimization**, before imitation learning. Restricting control alone reduces success from 2.75% to 0.41%. Adding geometry optimization raises it to 3.77%, and adding the learned physics objective reaches 5.35%. The restriction makes valid grasps harder to discover; the geometry helps recover feasible solutions. These percentages should not be compared directly with policy rollout success.

For real-to-real learning, the authors collect 15 successful demonstrations per task and evaluate autonomous policies 15 times. Bread Pinch reaches 93.3% versus 60.0% for the baseline, and Cooking Setup reaches 73.3% versus 20.0%. Benefits are not uniform across every setting: Multi-pen Grasp teleoperation falls from 57.7% to 50.0%, even though its autonomous policy improves from 53.3% to 66.7%. [Paper, Tables II–IV](https://arxiv.org/pdf/2511.13710v1)

## Reading the result as a design choice

My takeaway is to test the interaction between contact geometry and the motion family early when a dexterous policy transfers poorly. Here, restricting the motion becomes useful only when the fingertips can make reliable contact under that restriction. The physics surrogate offers a practical way to rank designs by task outcomes after geometric feasibility has narrowed the search.

The evidence supports precision pinching and the reported compositional tasks on two commercial hands. The small real-robot trial counts leave uncertainty about broader reliability, and this study does not establish general fingertip reorientation or arbitrary contact transitions. For a task that needs those motions, I would first check whether the parallel thumb–index constraint still admits the required skill before adopting it.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## TL;DR

灵巧手在仿真中抓住小物体，到了真机上却可能夹空。**From Power to Precision** 通过两个相互配合的改动处理这一问题：将精细抓取约束为拇指与食指的平行运动，并为两指安装经过优化的平面指尖套。作者用仿真抓取结果训练成功率预测器，再借助它的梯度优化指尖设计。得到的硬件和示范既支持仿真训练的抓取策略，也支持用遥操作数据训练的 ACT 策略。

最突出的结果来自未见过的真实物体：精细抓取成功率从 **Dex1B 的 12.5% 提升到完整方法的 82.5%**，仅优化控制则为 20%。这是硬件与控制共同改变后的结果，每种抓取类别测试 40 次。[论文，表 I](https://arxiv.org/pdf/2511.13710v1)

## 论文与阅读版本

**From Power to Precision: Learning Fine-grained Dexterity for Multi-fingered Robotic Hands**，作者为加州大学圣迭戈分校的 Jianglong Ye、Lai Wei、Guangqi Jiang、Changwei Jing、Xueyan Zou 和 Xiaolong Wang，前两位为共同第一作者。本文依据 **arXiv:2511.13710v1**，提交日期为 2025 年 11 月 17 日；所链接记录将其列为 arXiv 预印本。[论文记录](https://arxiv.org/abs/2511.13710v1) · [项目与演示](https://jianglongye.com/power-to-precision/)

## 让精细抓取动作更容易在真机复现

控制流程区分力量抓取与精细抓取。力量抓取沿用基线的全手力闭合目标；精细抓取则固定其他手指，仅在拇指和食指指尖采样接触。记接触位置为 $x_i$、法向为 $c_i$，将接触力映射为物体合力与合力矩的抓取矩阵为 $G$，优化目标为

$$
E_{\mathrm{precise}}=\|Gc\|_2,\qquad
c=[c_1^\top,\ldots,c_{2n}^\top]^\top.
$$

该目标鼓励选定接触法向对应的合力与合力矩接近零。它是抓取合成中的一个目标，生成的示范仍需经过仿真筛选。

接近物体的过程同样重要。令 $d$ 为从拇指接触点指向食指接触点的单位方向，利用雅可比伪逆生成预抓取张开动作：

$$
\Delta q_{\mathrm{thumb}}=-\alpha J_{\mathrm{thumb}}^\dagger d,
\qquad
\Delta q_{\mathrm{index}}=\alpha J_{\mathrm{index}}^\dagger d.
$$

其中 $\alpha$ 控制小幅张开的距离。两指沿共同轴线运动，减少了迁移到真机时必须准确复现的接触关系。轨迹经 ManiSkill 筛选后，分别训练力量抓取和精细抓取的 DexSimple 策略，再由 PointNet–MLP 切换器根据物体选择策略。

遥操作也使用这一精细控制器，将操作者拇指与食指的距离映射为机器人两指开合，并结合普通重定向处理其他抓取。随后，ACT 使用相机图像、机器人关节位置以及原始关节命令目标学习。动作简化体现在示范生成中，学习后的策略仍输出机器人关节目标。[论文，第 III-B、IV-A 节](https://arxiv.org/pdf/2511.13710v1)

## 同时优化接触平面与使用它的手部构型

硬件搜索针对指尖套展开，设计变量是平面

$$
P=\{x\in\mathbb R^3:n^\top(x-p)=0\},\qquad \|n\|_2=1.
$$

作者将略微膨胀的指尖凸包投影到该平面，将得到的并集几何体 3D 打印为指尖套。设计阶段联合优化平面参数和手部构型 $q$。这里的 $q$ 描述没有物体时的手部状态，需要与针对具体物体优化的抓取姿态区分。

几何吸引项将拇指和食指的候选接触点拉向平面，排斥项惩罚越过平面的手指表面点。方向可操作性项鼓励手指沿平面法向运动。这些目标共同寻找一种接触面，使两指能够在现有运动学约束下接触并分离。

物理项进一步引入任务结果。作者先从不同初始化出发，用几何和运动学目标优化出 **1,000 个候选平面**，再在仿真抓取任务中评估。PointNet 编码器与 MLP 学习

$$
f(P,q,o)=\hat s\in[0,1],\qquad E_{\mathrm{phys}}=-f(P,q,o),
$$

其中 $o$ 为物体点云，$\hat s$ 为预测成功率。随后通过预测器反向传播梯度，在采样的一批物体上优化共享平面 $P$ 和不同构型 $q$。论文将其称为神经物理代理模型，但公式明确给出的输出是**任务成功概率**。这个预测器提供可微的设计评分，无需让整个仿真器可微，也无需预测完整的下一时刻物理状态。[论文，第 III-C 节](https://arxiv.org/pdf/2511.13710v1)

## 实验中真正改变了什么

实验平台包括搭载 XHand 的 xArm 和搭载 Inspire 的宇树 G1。仿真抓取对比中，每种方法对每类抓取使用 30,000 条示范，留出 30% 的物体用于测试。表 I 在仿真中报告了两个平台，而零样本真机定量对比使用 xArm。真机测试物体均未在训练中出现，每个物体测试五次，每类抓取共 40 次。

| xArm 零样本真机抓取 | 力量抓取 | 精细抓取 |
| --- | ---: | ---: |
| Dex1B | 60.0% | 12.5% |
| 仅优化控制 | 70.0% | 20.0% |
| 控制与指尖设计联合优化 | 80.0% | 82.5% |

仿真中的差距小得多：未见物体的精细抓取成功率，Dex1B 为 53.91%，完整方法为 64.17%。作者将更大的真机增益归因于动作简化和接触面积增大，它们提高了对感知、标定和动力学误差的容忍度。因此，这组对比的重点在于迁移鲁棒性。[论文，表 I、第 IV-B 节](https://arxiv.org/pdf/2511.13710v1)

表 II 测量的是另一个指标：**模仿学习之前，精细抓取数据优化的成功率**。仅约束控制会使成功率从 2.75% 降到 0.41%；加入几何优化后升至 3.77%，再加入神经物理目标后达到 5.35%。动作约束让有效抓取更难搜索，几何设计则帮助恢复可行解。这些百分比不能直接与最终策略执行成功率比较。

真机示范学习中，每个任务采集 15 条成功示范，自主策略测试 15 次。Bread Pinch 从基线的 60.0% 提升到 93.3%，Cooking Setup 从 20.0% 提升到 73.3%。收益并非覆盖所有设置：Multi-pen Grasp 的遥操作成功率从 57.7% 降至 50.0%，尽管其自主策略从 53.3% 提升到 66.7%。[论文，表 II–IV](https://arxiv.org/pdf/2511.13710v1)

## 如何把结果转化为设计判断

我的理解是，灵巧策略迁移效果不佳时，应尽早检查接触几何与动作形式是否匹配。在这项工作里，指尖能够在受限动作下可靠接触物体，才让动作简化发挥作用。几何约束先缩小设计空间，物理代理模型再根据任务结果为候选设计提供优化方向。

论文支持的结论集中在两种商业灵巧手的精细捏取和所报告的组合任务。真机测试次数较少，更广泛的可靠性仍有不确定性；这些实验也尚未验证通用的指尖重定向或任意接触切换。如果目标任务依赖这些动作，我会先检查拇指与食指平行运动的约束是否仍允许完成任务，再决定是否采用这一方案。

</div>
