---
title: "[Paper Notes] UltraDexGrasp: Learning Universal Dexterous Grasping for Bimanual Robots with Synthetic Data"
date: 2026-03-09
permalink: /posts/2026/03/ultradexgrasp-paper-notes/
tags:
  - Robotics
  - Dexterous Grasping
  - Bimanual Manipulation
  - Synthetic Data
  - Sim2Real
  - Point Clouds
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**UltraDexGrasp** tackles a missing piece in dexterous manipulation: **universal grasping for bimanual robots across multiple grasp strategies**. Instead of focusing only on one hand or one grasp type, the paper builds a synthetic-data pipeline that supports:

- two-finger pinch
- three-finger tripod
- whole-hand grasp
- bimanual grasp

Using this pipeline, the authors build **UltraDexGrasp-20M**, a 20-million-frame dataset over 1,000 objects, and train a point-cloud policy that achieves **84.0%** average success in simulation and **81.2%** average success in real-world zero-shot sim-to-real grasping.

## Paper Info

- **Title**: UltraDexGrasp: Learning Universal Dexterous Grasping for Bimanual Robots with Synthetic Data
- **Authors**: Sizhe Yang, Yiman Xie, Zhixuan Liang, Yang Tian, Jia Zeng, Dahua Lin, Jiangmiao Pang
- **Affiliations**: Shanghai AI Laboratory, CUHK, Zhejiang University, HKU, Peking University
- **Project page**: [yangsizhe.github.io/ultradexgrasp](https://yangsizhe.github.io/ultradexgrasp/)
- **arXiv**: [2603.05312](https://arxiv.org/abs/2603.05312)
- **Code**: [UltraDexGrasp GitHub](https://github.com/InternRobotics/UltraDexGrasp)

## 1. Motivation

The paper starts from a clear observation: human grasping is naturally **strategy-dependent**.

- small objects are often handled with pinch or tripod grasps
- medium objects can be grasped with one full hand
- large or heavy objects often require both hands

Current robotic dexterous grasping work usually does not cover this full space. Most prior work is limited to:

- parallel grippers
- single dexterous hands
- one grasp style at a time

For bimanual dexterous robots, the main bottleneck is **data**. The paper argues that generating high-quality universal grasp data is hard because we need:

- physically plausible contact
- good geometric conformity
- arm-level kinematic feasibility
- dual-arm coordination
- multiple grasp strategies for different object regimes

That is the niche UltraDexGrasp is trying to fill.

## 2. Core Idea

The key contribution is not just a policy. It is a **data generation framework** that combines:

- **optimization-based grasp synthesis**
- **planning-based demonstration generation**

This lets the system first find feasible grasp poses, then convert them into closed-loop, coordinated arm-hand trajectories that can be executed and filtered in simulation.

The output is a large-scale multi-strategy dataset, which is then used to train a universal grasp policy.

## 3. Data Generation Pipeline

### 3.1 Optimization-based grasp synthesis

For a given object and robot, the system first synthesizes candidate bimanual grasps by optimizing:

- hand pose
- finger joint positions
- contact forces

under constraints such as:

- forward kinematics
- joint limits
- friction cone feasibility
- hand-object collision avoidance
- hand-hand collision avoidance

The formulation is shared across grasp strategies; the main difference between pinch, tripod, whole-hand, and bimanual grasp is which hand contact points are activated.

For each object, the method generates **500 candidate grasps**, then filters them using:

- physical plausibility checks
- inverse-kinematics reachability
- collision checking

Finally, it selects a preferred grasp based on the shortest `SE(3)` distance from the current end-effector pose, which makes execution easier and more natural.

### 3.2 Planning-based demonstration generation

Once the preferred grasp is selected, the whole grasping process is split into four stages:

1. **pregrasp**
2. **grasp**
3. **squeeze**
4. **lift**

Bimanual motion planning is used to produce collision-free coordinated trajectories. In simulation, the robots execute the planned motions with PD control, and the trajectory is kept only if the object is stably lifted.

The success condition is fairly concrete:

- the object must rise at least **0.17 m**
- it must stay elevated for at least **1 second**

This is a useful design choice because it turns grasp data generation into a physically validated process, not only a kinematic one.

### 3.3 Dataset scale

Using this process, the authors build **UltraDexGrasp-20M**:

- **20 million frames**
- **1,000 objects**
- multiple grasp strategies

The paper also notes that simulated rendering includes an imaged robot point cloud, which helps reduce the sim-to-real gap because at deployment time the robot’s own geometry is known.

## 4. Policy Design

The grasp policy is intentionally simple.

- input: scene point cloud
- encoder: PointNet++-style point encoder
- aggregator: decoder-only transformer with **unidirectional attention**
- output: arm and hand control commands

The point cloud is first downsampled to **2,048 points**, then encoded with two set-abstraction layers.

Two design choices seem especially important in the paper:

- the **unidirectional attention** mechanism for aggregating scene features
- **bounded Gaussian distribution prediction** for actions

The authors emphasize that the policy is meant to be simple and clean, so the paper’s gains should be interpreted mainly as evidence that the data pipeline is strong enough to support universal grasping.

## 5. Main Results

## 5.1 Simulation benchmark

The simulation benchmark evaluates grasping on **600 objects**, split by size:

- small
- medium
- large

Results against DP3 and DexGraspNet are strong:

- **DP3**: 46.7 average success
- **DexGraspNet**: 58.8 average success
- **UltraDexGrasp policy**: **84.0** average success

More specifically:

- seen small: **78.8**
- seen medium: **84.3**
- seen large: **90.4**
- unseen small: **76.9**
- unseen medium: **85.8**
- unseen large: **87.5**

The average performance on unseen objects is about **83.4%**, which is the main generalization result.

An important comparison is that DexGraspNet cannot handle large objects in this setup because it only synthesizes unimanual grasps. That highlights why multi-strategy bimanual data matters.

## 5.2 Data scaling and policy quality

The paper notes that the raw data-generation pipeline itself has a grasping success rate of **68.5%**, but once the policy is trained on more than **1M** frames, policy performance significantly exceeds the generator.

That is a nice result: the learned policy is not just imitating noisy demonstrations; it is actually distilling and improving on the large synthetic dataset.

## 5.3 Ablation study

The ablations show the policy architecture is not arbitrary:

- without bounded distribution prediction: **73.5%**
- without unidirectional attention: **68.2%**
- full model: **84.0%**

So both design choices contribute materially, and the attention design appears particularly important.

## 5.4 Real-world results

The real-world setup uses:

- two UR5e robots
- two 12-DoF XHands
- two Azure Kinect DK cameras

The policy is tested on **25 real objects** across small, medium, and large categories.

Reported real-world results:

- **DP3**: 46.7
- **DexGraspNet**: 62.3
- **UltraDexGrasp policy**: **81.2**

By object size:

- small: **72.0**
- medium: **82.2**
- large: **89.3**

These are strong numbers for direct zero-shot sim-to-real deployment, especially since the policy is trained **only on synthetic data**.

## 6. Why This Paper Matters

I think the most valuable aspect of the paper is its **problem scope**.

A lot of dexterous grasping work asks:

- can one hand grasp many objects?

This paper instead asks:

- can a robot choose among **multiple dexterous grasp strategies**, including **bimanual** ones, using one training framework?

That is much closer to the real-world version of grasping.

The second reason the paper matters is that it shows a realistic pipeline for scaling data:

- synthesis for diverse contact-rich grasps
- planning for executable trajectories
- simulation filtering for physical validity
- policy learning for generalization and speed

## 7. Strengths

- Strong focus on a genuinely underexplored setting: universal bimanual dexterous grasping.
- The dataset-generation pipeline is concrete, scalable, and physically grounded.
- Supports multiple grasp strategies instead of a single grasp mode.
- Strong simulation and real-world results with synthetic-data-only training.
- Clear evidence that the learned policy outperforms both the raw generator and strong baselines.

## 8. Limitations and Open Questions

- The paper focuses on **grasping**, not the subsequent manipulation after grasp acquisition.
- The evaluation is still mostly object lifting; more task-oriented or functional grasp benchmarks would be useful.
- The policy is trained on point clouds with known robot geometry, so robustness to worse sensing conditions remains unclear.
- The architecture is relatively task-specific; it is not obvious yet whether the same setup scales to more general dexterous manipulation beyond grasping.
- The object set is broad, but it would be interesting to see more articulated, deformable, or cluttered scenarios.

## 9. Takeaways

My main takeaway is that UltraDexGrasp makes a strong case that **multi-strategy dexterous grasping can be learned from synthetic data alone**, provided the data are generated with enough physical and kinematic care.

The recipe is fairly compelling:

- synthesize physically plausible grasps
- plan closed-loop coordinated bimanual trajectories
- validate in simulation
- train a simple policy on a very large dataset

That combination gets surprisingly far. For bimanual dexterous robots, this feels like a practical foundation for scaling toward more general manipulation.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**UltraDexGrasp** 解决的是灵巧操作里一个很缺失的问题：**面向双臂机器人的多策略通用灵巧抓取**。它不是只关注单手或单一抓取方式，而是构建了一个合成数据流水线，支持：

- two-finger pinch
- three-finger tripod
- whole-hand grasp
- bimanual grasp

在这个流水线基础上，作者构建了 **UltraDexGrasp-20M** 数据集，包含 **1,000 个物体、2,000 万帧**数据，并训练了一个点云抓取策略，在仿真中达到 **84.0%** 平均成功率，在真实世界 zero-shot sim-to-real 抓取中达到 **81.2%** 平均成功率。

## 论文信息

- **标题**: UltraDexGrasp: Learning Universal Dexterous Grasping for Bimanual Robots with Synthetic Data
- **作者**: Sizhe Yang, Yiman Xie, Zhixuan Liang, Yang Tian, Jia Zeng, Dahua Lin, Jiangmiao Pang
- **机构**: Shanghai AI Laboratory, CUHK, Zhejiang University, HKU, Peking University
- **项目主页**: [yangsizhe.github.io/ultradexgrasp](https://yangsizhe.github.io/ultradexgrasp/)
- **arXiv**: [2603.05312](https://arxiv.org/abs/2603.05312)
- **代码**: [UltraDexGrasp GitHub](https://github.com/InternRobotics/UltraDexGrasp)

## 1. 研究动机

论文从一个很直观的观察出发：人类抓取天然是**策略相关**的。

- 小物体常用 pinch 或 tripod
- 中等物体可以用单手包裹抓取
- 大或重的物体往往需要双手配合

现在很多机器人灵巧抓取工作并没有覆盖这整个空间。大多数方法仍然局限于：

- parallel gripper
- 单个 dexterous hand
- 单一抓取模式

对于双臂灵巧机器人来说，最大的瓶颈是**数据**。论文认为，生成高质量通用抓取数据很难，因为它同时需要：

- 物理上合理的接触
- 良好的几何贴合
- 手臂层面的运动学可达性
- 双臂协调
- 针对不同物体类型的多种抓取策略

UltraDexGrasp 正是想填补这个空白。

## 2. 核心思路

这篇论文最核心的贡献并不只是一个策略，而是一套**数据生成框架**，把下面两部分结合起来：

- **基于优化的抓取合成**
- **基于规划的演示轨迹生成**

这样系统就可以先找到可行抓取姿态，再把这些姿态变成真实可执行的、闭环的、双臂协调的抓取轨迹，并在仿真中执行和筛选。

最终产出的是一个大规模多策略抓取数据集，然后再在其上训练通用抓取策略。

## 3. 数据生成流水线

### 3.1 基于优化的抓取合成

对于给定物体和机器人，系统首先通过优化来合成候选双臂抓取，优化变量包括：

- 手的位姿
- 手指关节角
- 接触力

约束包括：

- forward kinematics
- joint limits
- friction cone feasibility
- hand-object collision avoidance
- hand-hand collision avoidance

整个优化框架对不同抓取策略是统一的；pinch、tripod、whole-hand、bimanual 的差别主要体现在激活哪些手部接触点。

对于每个物体，方法会生成 **500 个 candidate grasps**，然后再通过以下步骤筛选：

- 物理合理性检查
- inverse kinematics 可达性检查
- 碰撞检测

最后，根据当前末端执行器位姿与抓取位姿之间的 `SE(3)` 距离，选择距离最短的 grasp 作为 preferred grasp，这样可以让执行更自然、更容易成功。

### 3.2 基于规划的演示轨迹生成

一旦选定 preferred grasp，整个抓取过程被拆成四个阶段：

1. **pregrasp**
2. **grasp**
3. **squeeze**
4. **lift**

作者使用双臂运动规划生成无碰撞的协调轨迹。在仿真中，机器人用 PD 控制执行这些动作，只有当物体被稳定举起时，这段轨迹才会被保留。

成功标准也定义得比较清楚：

- 物体必须被抬起至少 **0.17 m**
- 并且至少保持 **1 秒**不掉落

这是一个很好的设计，因为它让数据生成不仅是几何上可行，而且是经过物理验证的。

### 3.3 数据集规模

基于这套流程，作者构建了 **UltraDexGrasp-20M**：

- **2,000 万帧**
- **1,000 个物体**
- 覆盖多种抓取策略

论文还提到，在渲染阶段会给机器人补充 imaged point cloud，这样部署时由于机器人自身几何是已知的，可以帮助进一步缩小 sim-to-real gap。

## 4. 策略设计

抓取策略本身设计得比较克制。

- 输入：场景点云
- 编码器：PointNet++ 风格点云编码器
- 特征聚合：带 **unidirectional attention** 的 decoder-only transformer
- 输出：手臂和手部控制命令

点云首先被下采样到 **2,048 个点**，然后经过两层 set abstraction 编码。

论文里两个特别重要的设计选择是：

- 用 **unidirectional attention** 聚合场景特征
- 用 **bounded Gaussian distribution prediction** 做动作预测

作者强调，这个策略有意保持简洁，因此论文的贡献更多应理解为：数据流水线足够强，使得一个简单策略也可以学会通用抓取。

## 5. 主要结果

## 5.1 仿真 benchmark

仿真 benchmark 在 **600 个物体**上评估抓取成功率，并按大小划分为：

- small
- medium
- large

与 DP3 和 DexGraspNet 相比，结果非常强：

- **DP3**: 46.7 平均成功率
- **DexGraspNet**: 58.8 平均成功率
- **UltraDexGrasp policy**: **84.0**

更细一点的结果包括：

- seen small: **78.8**
- seen medium: **84.3**
- seen large: **90.4**
- unseen small: **76.9**
- unseen medium: **85.8**
- unseen large: **87.5**

未见物体上的平均性能大约是 **83.4%**，这是整篇论文最关键的泛化结果。

一个很重要的点是，DexGraspNet 在这个设置下无法处理 large objects，因为它只能做单手 grasp synthesis。这也反过来说明，多策略双臂数据为什么重要。

## 5.2 数据规模与策略质量

论文提到，原始数据生成流水线本身的抓取成功率是 **68.5%**，但当训练帧数超过 **1M** 后，学出来的策略明显超过了数据生成器本身。

这个结果很有意思：说明策略并不是在机械模仿 noisy demonstrations，而是在大规模合成数据上完成了有效蒸馏和泛化。

## 5.3 消融实验

消融实验表明，策略结构中的关键设计并不是随意的：

- 去掉 bounded distribution prediction：**73.5%**
- 去掉 unidirectional attention：**68.2%**
- 完整模型：**84.0%**

所以这两个设计都确实带来了明显提升，其中 attention 机制尤其重要。

## 5.4 真实世界结果

真实世界实验使用：

- 两台 UR5e
- 两只 12-DoF XHand
- 两个 Azure Kinect DK 摄像头

策略在 **25 个真实物体**上测试，覆盖 small、medium、large 三类。

论文报告的真实世界结果为：

- **DP3**: 46.7
- **DexGraspNet**: 62.3
- **UltraDexGrasp policy**: **81.2**

按物体尺寸分：

- small: **72.0**
- medium: **82.2**
- large: **89.3**

考虑到策略完全是**基于合成数据训练**的，这样的 zero-shot sim-to-real 表现是很强的。

## 6. 为什么这篇论文重要

我觉得这篇论文最有价值的地方，在于它的**问题范围定义**。

很多 dexterous grasping 工作关注的是：

- 单只手能不能抓很多物体？

而这篇论文问的是：

- 机器人能不能在一个统一框架下，在**多种灵巧抓取策略**之间切换，甚至包括**双手抓取**？

这更接近真实世界中的抓取问题。

第二个重要点是，它展示了一条现实可行的数据扩展路径：

- 用优化合成多样化的接触抓取
- 用规划生成可执行轨迹
- 用仿真筛选物理有效性
- 再用策略学习去做泛化和提速

## 7. 优点

- 抓住了一个真正欠研究的问题：通用双臂灵巧抓取。
- 数据生成流水线具体、可扩展，而且强调物理合理性。
- 支持多种抓取策略，而不是单一抓取模式。
- 只用合成数据训练，却在仿真和真实世界都拿到强结果。
- 清楚地展示了学到的策略优于原始数据生成器和强基线。

## 8. 局限与开放问题

- 论文主要解决的是**抓取**，还没有涉及抓取之后的操作。
- 当前评测仍以 lifting 为主，更功能性的 grasp benchmark 会更有说服力。
- 策略依赖点云输入以及已知机器人几何，在更差的感知条件下鲁棒性如何还不清楚。
- 模型结构仍然比较 task-specific，是否能自然扩展到更一般的 dexterous manipulation 还需要验证。
- 物体种类虽然较广，但如果是 articulated、deformable 或 clutter 场景，难度还会更高。

## 9. Takeaways

我对这篇论文的主要 takeaway 是：**只要合成数据的物理和运动学质量足够高，多策略灵巧抓取是可以仅靠 synthetic data 学出来的。**

论文给出的配方其实很有说服力：

- 合成物理合理的 grasp
- 规划双臂闭环协调轨迹
- 在仿真中验证
- 在超大规模数据集上训练一个简单策略

这个组合比想象中更有效。对于双臂灵巧机器人来说，这看起来像是一个很实际的基础方向，可以继续往更一般的 manipulation 扩展。

</div>
