---
title: "[Paper Notes] EquiBim: Learning Symmetry-Equivariant Policy for Bimanual Manipulation"
date: 2026-05-12
permalink: /posts/2026/05/equibim-paper-notes/
tags:
  - Robotics
  - Bimanual Manipulation
  - Imitation Learning
  - Equivariance
  - LeRobot
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**EquiBim** is a simple but useful idea for bimanual imitation learning: if a task is left-right symmetric, then the policy should behave consistently when the observation is mirrored and the two arms are swapped. Instead of building a special equivariant neural architecture, the paper adds a prediction-level regularization term:

\\[
L_{sym} = \|\pi(S(O)) - S(\pi(O))\|_2^2
\\]

This makes EquiBim model-agnostic. It can be attached to image policies, point-cloud policies, joint-space actions, or end-effector actions, as long as the symmetry transform \\(S\\) is defined for both observations and actions. In simulation on RoboTwin and real-world experiments on a dual LeRobot SO101 setup, the method improves average success and robustness under mirrored or shifted object distributions.

From the codebase side, the repository implements the idea inside LeRobot's ACT policy: mirror the observation, run the same policy again, mirror the original prediction, and penalize the mismatch.

## Paper Info

- **Title**: EquiBim: Learning Symmetry-Equivariant Policy for Bimanual Manipulation
- **Authors**: Zhiyuan Zhang, Aditya Mohan, Seungho Han, Wan Shou, Dongyi Wang, Yu She
- **Affiliations**: Purdue University, University of Arkansas
- **arXiv**: [2603.08541](https://arxiv.org/abs/2603.08541)
- **Project page**: [zhangzhiyuanzhang.github.io/equibim-website](https://zhangzhiyuanzhang.github.io/equibim-website/)
- **Codebase**: a LeRobot-based implementation for bimanual SO101 manipulation and ACT symmetry loss

## 1. Motivation

Bimanual robots have a structural prior that many learned policies only use implicitly: the left and right arms are often physically symmetric, and many tasks remain equivalent if we mirror the workspace and exchange the two arms.

Standard behavior cloning does not enforce this. If the dataset has more clean demonstrations on one side than the other, or if the test object appears in a mirrored pose, a policy can produce inconsistent left/right behavior even when the mirrored strategy should be valid. This is especially visible in dual-arm manipulation because coordination errors are not just visual mistakes; they become timing, grasping, and role-assignment failures.

EquiBim's claim is that this symmetry should be an explicit training signal. The nice part is that the signal lives at the policy-output level, so it does not require redesigning the backbone.

## 2. Method

The policy is trained by behavior cloning. Given an observation history \\(O\\), the policy predicts a future action sequence:

\\[
\pi: O \rightarrow A
\\]

EquiBim defines a symmetry transformation \\(S\\) over both observation and action spaces. For a bimanual setup, \\(S\\) corresponds to a left-right reflection plus an exchange of the two arms.

The desired equivariance is:

\\[
\pi(S(O)) \approx S(\pi(O))
\\]

So the symmetry loss is:

\\[
L_{sym} = \|\pi(S(O)) - S(\pi(O))\|_2^2
\\]

The full training objective keeps the ordinary imitation loss and adds this consistency term. Importantly, both branches use the same policy parameters. The model is not asked to learn a new task; it is asked to be self-consistent under a physically meaningful transformation.

## 3. Symmetry Across Modalities

The paper handles several observation/action combinations:

| Component | Symmetry transform |
|---|---|
| RGB image | horizontal flip |
| Point cloud | transform to image/camera-aligned frame, reflect along lateral axis, transform back |
| End-effector pose | reflect position and orientation consistently in the control frame |
| Joint action | swap left/right arms and apply joint-specific sign flips from the robot kinematics |

This is the main reason the method is practical. The regularizer is the same, while the implementation of \\(S\\) changes with the sensor and action representation.

## 4. Results

### RoboTwin Simulation

The paper evaluates eight symmetric bimanual tasks in RoboTwin: Beat Block Hammer, Click Alarmclock, Handover Block, Move Can Pot, Pick Dual Bottles, Place Empty Cup, Stamp Seal, and Press Stapler.

Average success rates improve across all tested observation/action settings:

| Backbone / Setting | Baseline | + EquiBim | Gain |
|---|---:|---:|---:|
| DP, Image + Joint | 34.1 | 43.6 | +9.5 |
| DP, Image + EE | 37.3 | 40.0 | +2.7 |
| DP3, Point Cloud + Joint | 73.5 | 77.9 | +4.4 |
| DP3, Point Cloud + EE | 74.5 | 77.8 | +3.3 |

The biggest gain is in the weakest geometric setting, **image observations plus joint-space actions**. That makes intuitive sense: images do not explicitly encode 3D structure, and joint actions are less directly spatial than end-effector poses. The symmetry loss supplies a missing structural prior.

The paper also reports that some tasks can drop under EquiBim, especially when the optimal strategy contains useful role asymmetry. Handover Block and Pick Dual Bottles are examples where timing, contact, or grasp ordering can make the mirrored policy less universally correct. This is an important caveat: symmetry regularization helps when task-level symmetry dominates, but it can fight the data when the task only looks symmetric geometrically.

### Real-World SO101 Experiments

The real-world setup uses two LeRobot SO101 arms with a centered Logitech C920x camera. The top-down camera arrangement makes horizontal image flips line up naturally with the workspace's left-right direction.

The paper evaluates:

- Banana Handover
- Drumstick Hook Hanging
- Toy Chicken Hook Hanging

With 50 demonstrations per task and 10 evaluation trials per object, ACT + EquiBim improves robustness, especially under distribution shifts:

| Task / Distribution | ACT | ACT + EquiBim |
|---|---:|---:|
| Banana, training distribution | 3/10 | 6/10 |
| Banana, shifted distribution | 0/10 | 5/10 |
| Drumstick, shifted distribution | 1/10 | 4/10 |
| Toy Chicken, shifted distribution | 4/10 | 6/10 |

The banana result is the clearest: when the object orientation and side placement are mirrored relative to training, vanilla ACT fails completely, while the equivariant version keeps half the trials successful.

## 5. Codebase Reading

The repository is built on LeRobot and adds a practical bimanual SO101 workflow:

```text
bimanual_teleop.py
bimanual_teleop_camera.py
bimanual_data_collection.py
train_bimanual.sh
bimanual_capture_home_pose.py
bimanual_inference.py
```

The symmetry switch is exposed in ACT config:

```python
use_sym_loss: bool = False
eq_loss_weight: float = 0.1
```

The main implementation lives in `src/lerobot/policies/act/modeling_act.py`.

The code defines a 6-dimensional per-arm sign vector:

```python
JOINT_SIGN = torch.tensor([-1, +1, +1, +1, -1, +1])
```

Then `mirror_state` and `mirror_action` split the 12-dimensional bimanual vector into left and right halves, apply the sign transform, and concatenate the swapped result:

```text
[left_arm, right_arm] -> [signed_right_arm, signed_left_arm]
```

For images, the implementation simply flips along the width dimension:

```python
torch.flip(img, dims=[-1])
```

During training, ACT first computes the ordinary L1 action loss. If `use_sym_loss` is enabled, it builds a mirrored batch, predicts actions on that mirrored input, and adds:

```python
eq_loss = mse(mirror_action(actions_hat.detach()), actions_hat_sym)
loss = l1_loss + eq_loss_weight * eq_loss
```

The `detach()` is a small but meaningful implementation choice: the original prediction acts like the target for the mirrored branch, so the symmetry term regularizes the mirrored pass without letting both sides chase each other in the same backward path.

## 6. Strengths and Limitations

**Strengths.** EquiBim is easy to add to existing imitation learning systems, and the inductive bias is physically meaningful. The method also gives a concrete recipe for using stronger demonstrations on one side to regularize weaker demonstrations on the other side. For low-cost bimanual platforms where data is limited, this is a very practical advantage.

**Limitations.** The method depends on the symmetry transform being correct. If the camera is not centered, the robot mounting is not symmetric, the object interaction is role-specific, or the task has real left/right asymmetry, the loss can penalize useful behavior. The paper is honest about this through the per-task drops in simulation. Also, the real-world evaluation is promising but still small: 10 trials per object and three task families.

## 7. Takeaways

EquiBim is a good reminder that not every robotics improvement needs a larger model. Sometimes the right move is to encode a physical prior that the robot already gives us for free.

For bimanual learning, bilateral symmetry is one of those priors. The paper's contribution is to turn it into a model-agnostic consistency loss that works across modalities and action spaces. The codebase makes the same point in a very direct way: mirror the batch, predict again, mirror the original prediction, and penalize disagreement.

For practice, I would treat EquiBim as a strong default when:

- the hardware is physically symmetric,
- the camera frame is aligned with the left-right workspace axis,
- the task allows arm-role exchange,
- the dataset is small or imbalanced across sides.

I would be more cautious when the task has hidden asymmetry in timing, force, grasp order, object affordance, or demonstration convention. In those cases, symmetry is still useful, but probably needs a schedule, a lower weight, or task-aware gating.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**EquiBim** 的核心想法很简单，但对双臂模仿学习很实用：如果一个任务具有左右对称性，那么当观测被镜像、两只手臂被交换时，策略输出也应该保持一致。它没有设计专门的等变网络结构，而是在预测层面加入一个正则项：

\\[
L_{sym} = \|\pi(S(O)) - S(\pi(O))\|_2^2
\\]

因此 EquiBim 是 model-agnostic 的。只要能为观测和动作定义对称变换 \\(S\\)，它就可以接到图像策略、点云策略、关节空间动作或末端执行器动作上。在 RoboTwin 仿真和真实双 LeRobot SO101 平台实验中，这个方法提升了平均成功率，也提升了在镜像或分布偏移场景下的鲁棒性。

从代码实现看，这个仓库把 EquiBim 加进了 LeRobot 的 ACT policy：先镜像观测，再用同一个策略预测一次，然后把原始预测镜像过去，并惩罚两者之间的不一致。

## 论文信息

- **标题**：EquiBim: Learning Symmetry-Equivariant Policy for Bimanual Manipulation
- **作者**：Zhiyuan Zhang, Aditya Mohan, Seungho Han, Wan Shou, Dongyi Wang, Yu She
- **机构**：Purdue University, University of Arkansas
- **arXiv**：[2603.08541](https://arxiv.org/abs/2603.08541)
- **项目主页**：[zhangzhiyuanzhang.github.io/equibim-website](https://zhangzhiyuanzhang.github.io/equibim-website/)
- **代码实现**：基于 LeRobot 的双臂 SO101 操作与 ACT 对称损失实现

## 1. 动机

双臂机器人天然带有一个很多学习策略只隐式利用的结构先验：左右臂通常在物理结构上是对称的，许多任务在镜像工作空间并交换左右臂之后仍然等价。

标准行为克隆并不会显式约束这一点。如果数据集中某一侧的高质量示范更多，或者测试时物体出现在镜像位置，策略即使面对等价任务，也可能产生不一致的左右行为。对于双臂操作来说，这种错误不只是视觉识别错误，还会变成时序、抓取、角色分配和协同控制上的失败。

EquiBim 的主张是：这种对称性应该成为显式训练信号。它最漂亮的地方在于，这个信号作用在策略输出层面，因此不需要重写模型 backbone。

## 2. 方法

策略通过行为克隆训练。给定观测历史 \\(O\\)，策略预测未来动作序列：

\\[
\pi: O \rightarrow A
\\]

EquiBim 在观测空间和动作空间上定义同一个对称变换 \\(S\\)。对双臂系统而言，\\(S\\) 对应左右反射以及两只手臂的交换。

理想的等变关系是：

\\[
\pi(S(O)) \approx S(\pi(O))
\\]

因此对称损失为：

\\[
L_{sym} = \|\pi(S(O)) - S(\pi(O))\|_2^2
\\]

完整训练目标保留普通 imitation loss，并加入这个一致性项。两个分支共享同一个策略参数。模型并不是在学习一个新任务，而是在学习对一个有物理意义的变换保持自洽。

## 3. 跨模态对称变换

论文覆盖了多种观测和动作组合：

| 组件 | 对称变换 |
|---|---|
| RGB 图像 | 水平翻转 |
| 点云 | 先转到图像/相机对齐坐标系，沿侧向轴反射，再转回原坐标系 |
| 末端执行器位姿 | 在控制坐标系中一致地反射位置和姿态 |
| 关节动作 | 交换左右臂，并根据机器人运动学对特定关节做符号翻转 |

这正是方法实用的原因：正则项形式不变，具体的 \\(S\\) 随传感器和动作表示而变化。

## 4. 实验结果

### RoboTwin 仿真

论文在 RoboTwin 中评估了八个具有自然对称性的双臂任务：Beat Block Hammer、Click Alarmclock、Handover Block、Move Can Pot、Pick Dual Bottles、Place Empty Cup、Stamp Seal 和 Press Stapler。

所有观测/动作设置下，平均成功率都有提升：

| Backbone / 设置 | Baseline | + EquiBim | 提升 |
|---|---:|---:|---:|
| DP, Image + Joint | 34.1 | 43.6 | +9.5 |
| DP, Image + EE | 37.3 | 40.0 | +2.7 |
| DP3, Point Cloud + Joint | 73.5 | 77.9 | +4.4 |
| DP3, Point Cloud + EE | 74.5 | 77.8 | +3.3 |

最大提升出现在几何信息最弱的设置：**图像观测 + 关节空间动作**。这很符合直觉：图像没有显式 3D 结构，而关节动作也不如末端执行器位姿那样直接对应任务空间。对称损失补上了一个结构先验。

论文也报告了一些任务上的下降，尤其是最优策略包含真实角色不对称的时候。Handover Block 和 Pick Dual Bottles 就是例子：时序、接触、抓取顺序可能让“完全镜像”的策略并不总是正确。这个 caveat 很重要：当任务级对称性占主导时，对称正则非常有效；但当任务只是几何上看起来对称，却存在控制细节上的不对称时，它也可能压制有用行为。

### 真实 SO101 实验

真实平台使用两台 LeRobot SO101 机械臂和一个居中的 Logitech C920x 摄像头。俯视相机使得图像水平翻转自然对应工作空间左右方向。

论文评估了三个任务：

- Banana Handover
- Drumstick Hook Hanging
- Toy Chicken Hook Hanging

每个任务采集 50 条示范，每个物体评估 10 次。ACT + EquiBim 在分布偏移下尤其明显地提升了鲁棒性：

| 任务 / 分布 | ACT | ACT + EquiBim |
|---|---:|---:|
| Banana，训练分布 | 3/10 | 6/10 |
| Banana，偏移分布 | 0/10 | 5/10 |
| Drumstick，偏移分布 | 1/10 | 4/10 |
| Toy Chicken，偏移分布 | 4/10 | 6/10 |

Banana 结果最清楚：当物体朝向和摆放侧相对训练数据发生镜像变化时，普通 ACT 完全失败，而加入等变正则后仍有一半 trial 成功。

## 5. 代码阅读

这个仓库基于 LeRobot，加入了一套实用的双臂 SO101 工作流：

```text
bimanual_teleop.py
bimanual_teleop_camera.py
bimanual_data_collection.py
train_bimanual.sh
bimanual_capture_home_pose.py
bimanual_inference.py
```

ACT 配置中暴露了对称损失开关：

```python
use_sym_loss: bool = False
eq_loss_weight: float = 0.1
```

核心实现位于 `src/lerobot/policies/act/modeling_act.py`。

代码先定义了每只手臂 6 维关节的符号向量：

```python
JOINT_SIGN = torch.tensor([-1, +1, +1, +1, -1, +1])
```

然后 `mirror_state` 和 `mirror_action` 会把 12 维双臂向量拆成左右两半，应用符号变换，再交换左右顺序：

```text
[left_arm, right_arm] -> [signed_right_arm, signed_left_arm]
```

图像部分则直接沿宽度维翻转：

```python
torch.flip(img, dims=[-1])
```

训练时，ACT 先计算普通 L1 动作损失。如果启用 `use_sym_loss`，就构造一个镜像 batch，在镜像输入上再预测一次动作，然后加入：

```python
eq_loss = mse(mirror_action(actions_hat.detach()), actions_hat_sym)
loss = l1_loss + eq_loss_weight * eq_loss
```

这里的 `detach()` 是一个小但有意义的实现选择：原始预测被当作镜像分支的 target，使对称项主要正则化镜像分支，而不是让两个分支在同一次反传里互相追逐。

## 6. 优点与局限

**优点。** EquiBim 很容易加到已有模仿学习系统里，而且这个 inductive bias 有明确物理意义。它也给出了一个很实用的机制：当一侧示范更强、另一侧示范更弱时，可以用对称约束把结构信息从一侧迁移到另一侧。对低成本双臂平台和小数据设置来说，这非常实际。

**局限。** 方法依赖对称变换本身是正确的。如果相机不居中、机器人安装不对称、物体交互有角色特异性，或者任务本身存在真实左右差异，对称损失就可能惩罚有用行为。论文在仿真的逐任务结果中也诚实展示了这种下降。另外，真实实验很有说服力，但规模仍然较小：每个物体 10 次 trial，三个任务族。

## 7. Takeaways

EquiBim 提醒我们：机器人学习的进步不一定总来自更大的模型。有时最有效的是把机器人系统本来就具备的物理先验编码进训练目标。

对双臂学习来说，双边对称性就是这样的先验。论文贡献在于把它变成了一个 model-agnostic 的一致性损失，可以跨模态、跨动作空间使用。代码实现也非常直接：镜像 batch，再预测一次，镜像原始预测，然后惩罚二者不一致。

实践中，我会在以下条件下优先尝试 EquiBim：

- 硬件结构物理对称；
- 相机坐标与工作空间左右轴对齐；
- 任务允许左右臂角色交换；
- 数据量较小，或左右两侧数据质量不均衡。

如果任务在时序、力控、抓取顺序、物体 affordance 或示范习惯上存在隐藏不对称，则需要更谨慎。此时对称性仍然可能有用，但最好配合较小权重、训练 schedule，或者任务感知的 gating。

</div>
