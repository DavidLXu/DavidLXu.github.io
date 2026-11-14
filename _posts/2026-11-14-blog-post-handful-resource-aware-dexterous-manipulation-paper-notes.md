---
title: "[Paper Notes] HANDFUL: Sequential Grasp-Conditioned Dexterous Manipulation with Resource Awareness"
date: 2026-11-14
permalink: /posts/2026/11/handful-resource-aware-dexterous-manipulation-paper-notes/
excerpt: "HANDFUL learns nine resource-aware grasps with active and inactive finger constraints, then selects the grasp that best supports a second manipulation subtask. It improves simulation success and reports 40-66.7% two-stage success on four real-world tasks."
tags:
  - Paper Notes
  - Dexterous Manipulation
  - Grasping
  - Reinforcement Learning
  - Sequential Manipulation
  - Sim-to-Real
---

<div data-lang="en" markdown="1">

A dexterous hand holding a block still has to press a button, pull a drawer, or pick up another object. The first grasp consumes fingers and the empty space inside the hand. HANDFUL treats those resources as part of the grasp decision, so the initial contact pattern leaves a usable action budget for the next subtask.

Ethan Foong, Yunshuang Li, Hao Jiang, Gaurav S. Sukhatme and Daniel Seita. [arXiv:2604.25126v2](https://arxiv.org/abs/2604.25126v2), revised July 7, 2026 · [Project page](https://handful-dex.github.io/)

### The grasp has to pay for the next action

Conventional grasping rewards favor a stable grip on the current object. In a sequential task, a highly stable grip can lock all four fingers around the object and leave no finger available for the second action. HANDFUL studies tasks with the form `grasp first object -> manipulate second target while preserving the grasp`. The second target can be a button, knob, drawer, another block, or a destination for an object being pushed.

The paper separates each hand pose into **active** and **inactive** fingers. During grasping, active fingers establish contact with the first block while inactive fingers are held away from it. During the second subtask, the roles reverse: the original grasping fingers stabilize the block, and the previously inactive fingers perform the new action. This simple role assignment turns finger allocation into an explicit learning signal.

### A reward for spending only the fingers needed now

HANDFUL adds two terms to a standard grasping reward. For active contact points `M`, the active-finger reward pulls fingertips and the palm toward the object:

```text
r_a = (1 / |M|) sum_{i in M} exp(-lambda_a d_i)
```

The inactive-finger penalty suppresses contact forces from the conserved fingers:

```text
p_ina = clip(-sum_{j in J} f_j, -beta_ina, 0)
r_t = w_g r_g + w_v p_v + w_c p_c + w_a r_a + w_ina p_ina
```

Here `r_g` rewards reaching and lifting, `p_v` penalizes excessive arm velocity, and `p_c` penalizes table collisions. The result is a grasp policy that still has to hold the object, while avoiding the temptation to use every available contact.

The authors train policies for all one- and two-finger combinations on the four-finger LEAP Hand, using two starting palm orientations. This produces nine feasible grasp strategies, spanning single-finger contacts and two-finger grasps. Each policy is trained with SAC. The useful diversity comes from hand resource allocation, since every policy initially reaches a high grasp success rate.

### Selecting a grasp through a three-stage curriculum

The terminal states of each grasping policy become candidate starting states for the second subtask. Training nine second-subtask policies to completion would be expensive, so HANDFUL uses a curriculum with three randomization levels:

| Stage | Environment | Surviving grasps |
|---|---|---|
| `C0` | Almost deterministic | 9 candidates train |
| `C1` | Half-strength pose and domain randomization | Top 6 continue |
| `C2` | Full randomization, including mass and friction | Top 3 continue |

Candidates are ranked first by terminal success rate, then anytime success rate, then average return. Each surviving second-subtask policy continues from its earlier checkpoint. The final winner defines a pair `(pi_1, pi_2)`: execute the chosen grasp policy, retain its terminal state, then run the matching second-subtask policy.

The role reversal remains active in the second policy. The fingers that now hold the block receive the active-contact reward, while the fingers that should be free for the new task receive the inactive-contact penalty. This carries the resource constraint across the boundary between the two learned skills.

### Five ways to expose the bottleneck

**HANDFUL-Bench** uses an xArm7 and a 16-DoF LEAP Hand in ManiSkill. All tasks share the first grasp and change only the second objective: push a block, press a button, twist a knob, pull a drawer, or pick up a second block. The action space has 23 dimensions, with 16 hand joints and 7 arm joints. Observations are state-based and include joint state, palm and fingertip poses, object poses, relative poses, object sizes, articulation state, and a one-hot vector for the active fingers.

An episode lasts for its full fixed horizon, including after success. The primary metric is terminal success, so a policy has to preserve the grasp and the completed second subtask until the end. Every reported simulation number evaluates only the selected grasp for that task, averaged over five seeds.

### The finger constraint carries the result

Simulation terminal success rates are shown below. HANDFUL uses both finger constraints and curriculum selection. The two main ablations remove one mechanism at a time.

| Task | HANDFUL | No curriculum | No finger constraint |
|---|---:|---:|---:|
| Push object | **69.90%** | 69.47% | 66.69% |
| Press button | **77.75%** | 76.80% | 44.26% |
| Twist knob | **61.52%** | 58.50% | 49.44% |
| Pull drawer | **78.94%** | 71.38% | 58.99% |
| Pick second | 76.54% | **80.42%** | 0.00% |

Removing the finger split causes a large drop on tasks that need free fingers, and the no-constraint policy never succeeds at picking a second block. The task decomposition also matters: a single policy with phase-based rewards reaches only 32.38% on pushing and 0% on the last three tasks.

The curriculum result needs a narrower reading. HANDFUL and the no-curriculum ablation have similar final success rates, while the curriculum reduces total training time by about 40%. On Pick Second, the selected grasp never beats the no-curriculum result across these five seeds. The evidence therefore supports the curriculum mainly as a cheaper and more stable candidate-selection procedure; the learned allocation of fingers supplies the large gain in downstream success.

### Real-world execution retrieves a simulated trajectory

The real setup uses an xArm7 with a LEAP Hand and two Intel RealSense L515 cameras. For each task, the authors collect 50 successful, collision-free simulation rollouts over a `10 cm x 10 cm` range of first-block positions. SAM2 segments the real block, and fused point clouds estimate its 3D position. The robot executes the simulated trajectory whose initial block position is closest to the observed position.

This is open-loop trajectory retrieval. The second object stays fixed during real evaluation, reducing the variability that the policies handled in simulation. Fifteen trials per task produce the following full two-stage success rates:

| Push | Press | Twist | Pull | Pick second |
|---:|---:|---:|---:|---:|
| 66.7% | 53.3% | 40.0% | 40.0% | 26.7% |

Most failures happen during the second action, usually because the first block drops after contact conditions change. Picking a second object is hardest, with only 4/15 full successes. A DP3 baseline trained on 30 teleoperated demonstrations per task reaches 38.6% across the same 75 rollouts. The demonstration dataset tends to reserve the index finger for the second action and underuses palm contact, while HANDFUL explores grasps outside that human-data distribution.

### What HANDFUL establishes

The paper makes a strong case for conditioning grasp learning on the next action. Finger contacts, remaining finger count, and in-hand space all belong in the utility of a grasp. The nine-policy pool and role reversal give the method a compact mechanism for discovering and exploiting those resources, and the ablations make the mechanism visible.

The limits are equally clear. Evaluation uses state observations, five rigid-object tasks, one four-fingered hand, and manually specified curriculum constants. The real robot follows precomputed trajectories with a fixed second object, over 15 trials per task. Direct closed-loop sim-to-real execution remains outside the tested setting.

The main research lesson is to score intermediate states by what they leave available. A grasp can be stable and still be a poor first step. For dexterous sequential manipulation, the better objective combines present task completion with a measured budget of fingers, contact regions, and workspace for the future action.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

灵巧手抓住积木以后，还可能需要按按钮、拉抽屉或抓取另一个物体。第一次抓取会占用手指和手掌内部空间。HANDFUL 把这些资源纳入抓取决策，让初始接触方式为后续子任务保留足够的手部动作预算。

作者：Ethan Foong、Yunshuang Li、Hao Jiang、Gaurav S. Sukhatme、Daniel Seita。[arXiv:2604.25126v2](https://arxiv.org/abs/2604.25126v2)，2026 年 7 月 7 日修订 · [项目主页](https://handful-dex.github.io/)

### 好抓取还要为下一步留出手指

传统抓取奖励更关注当前物体是否抓得稳。在连续任务里，非常稳定的抓法可能让四根手指全部包住物体，后续动作就没有手指可用。HANDFUL 研究形如 `抓住第一个物体 -> 保持抓取并操作第二个目标` 的任务。第二个目标可以是按钮、旋钮、抽屉、另一块积木，也可以是推动物体的目标位置。

论文把每只手势中的手指分成 **active** 和 **inactive** 两组。抓取阶段，主动手指接触第一块积木，非主动手指保持离开。进入第二个子任务后，角色互换：原先负责抓取的手指继续稳定物体，原先空闲的手指执行新动作。这个分组把“手指怎样分配”变成了明确的学习信号。

### 只消耗当前任务真正需要的手指

HANDFUL 在常规抓取奖励上加入两项。对于主动接触点集合 `M`，主动手指奖励把指尖和手掌拉向物体：

```text
r_a = (1 / |M|) sum_{i in M} exp(-lambda_a d_i)
```

非主动手指惩罚则压低被保留手指的接触力：

```text
p_ina = clip(-sum_{j in J} f_j, -beta_ina, 0)
r_t = w_g r_g + w_v p_v + w_c p_c + w_a r_a + w_ina p_ina
```

其中 `r_g` 奖励接近和抬起物体，`p_v` 惩罚机械臂速度过大，`p_c` 惩罚与桌面的碰撞。最终得到的策略既要抓住物体，也要避免把所有可用接触都消耗在一次抓取中。

作者在四指 LEAP Hand 上训练了所有单指和双指组合，并用两种初始手掌朝向增加差异，得到九种可执行的抓取策略，覆盖单指接触和双指抓取。每个策略使用 SAC 训练。九种策略本身的抓取成功率都较高，它们提供的主要差异来自手部资源分配。

### 用三阶段课程筛选适合下一步的抓取

每个抓取策略的终止状态成为第二个子任务的候选起点。把九个后续策略全部训练到底代价很高，因此方法采用三级环境随机化课程：

| 阶段 | 环境 | 保留候选 |
|---|---|---|
| `C0` | 基本确定性环境 | 9 个策略并行训练 |
| `C1` | 半强度位姿与域随机化 | 前 6 名继续 |
| `C2` | 完整随机化，加入质量与摩擦变化 | 前 3 名继续 |

候选策略依次按终止成功率、任意时刻成功率、平均回报排序。存活策略从原检查点继续训练。最后胜出的组合是一对策略 `(pi_1, pi_2)`：先执行选中的抓取策略，再从它的终止状态执行对应的第二子任务策略。

第二个策略同样保留手指角色约束。此时继续稳定积木的手指接受主动接触奖励，新任务应保留的手指接受非主动接触惩罚。资源约束因此同时存在于第一次抓取和第二个子任务中。

### 五个任务共同暴露手部瓶颈

**HANDFUL-Bench** 基于 ManiSkill，使用 xArm7 和 16 自由度 LEAP Hand。五个任务共享第一次抓取，只改变第二个目标：推动积木、按按钮、旋钮、拉抽屉和抓取第二块积木。动作空间为 23 维，其中手部 16 维、机械臂 7 维。状态观测包括关节位置与速度、手掌和指尖位姿、物体位姿、相对位姿、物体尺寸、关节机构状态，以及表示主动手指的 one-hot 向量。

每次 episode 都跑满固定时长，成功以后也不提前结束。主指标是终止时的成功率，策略必须在最后时刻同时保持初始抓取和完成第二个子任务。仿真表格中的每个数字只评估该任务选中的抓取，并报告五个随机种子的结果。

### 提升主要来自手指资源约束

仿真的终止成功率如下。HANDFUL 同时使用手指约束和课程筛选，两项消融分别去掉其中一项。

| 任务 | HANDFUL | 去掉课程 | 去掉手指约束 |
|---|---:|---:|---:|
| 推动物体 | **69.90%** | 69.47% | 66.69% |
| 按按钮 | **77.75%** | 76.80% | 44.26% |
| 旋转旋钮 | **61.52%** | 58.50% | 49.44% |
| 拉开抽屉 | **78.94%** | 71.38% | 58.99% |
| 抓取第二个物体 | 76.54% | **80.42%** | 0.00% |

去掉手指分组以后，需要空闲手指的任务明显下降，抓取第二个物体的成功率直接变成零。任务分解也很关键：使用阶段式奖励的单一策略在推动任务上只有 32.38%，后三个任务均为零。

课程结果需要更窄的解读。HANDFUL 与去掉课程的版本在最终成功率上接近，课程把总训练时间缩短约 40%。在这五个种子上，抓取第二个物体的课程版本也没有超过非课程版本。现有证据主要支持把课程看作更便宜、更稳定的候选筛选流程；真正带来大幅下游提升的是手指资源分配。

### 真机执行依靠检索仿真轨迹

真机平台由 xArm7、LEAP Hand 和两台 Intel RealSense L515 相机组成。每个任务先在仿真中收集 50 条成功且无碰撞的轨迹，第一块积木的位置在机器人前方 `10 cm x 10 cm` 区域内随机。运行时使用 SAM2 分割积木，融合两路点云估计三维位置，再选择初始位置最接近的仿真轨迹，以开环方式执行。

真机评估固定第二个物体的位置，减少了仿真策略原本需要处理的场景变化。每个任务执行 15 次，完整完成两个子任务的成功率如下：

| 推动 | 按按钮 | 旋转旋钮 | 拉开抽屉 | 抓取第二个物体 |
|---:|---:|---:|---:|---:|
| 66.7% | 53.3% | 40.0% | 40.0% | 26.7% |

大部分失败发生在第二个动作期间，常见原因是接触条件变化后第一块积木掉落。抓取第二个物体最难，15 次中只有 4 次完整成功。每个任务用 30 条遥操作示范训练的 DP3 基线，在相同的 75 次评估中成功率为 38.6%。示范数据倾向于让食指执行第二步，保留其他手指稳定抓取，也较少使用手掌接触；HANDFUL 能搜索到超出这类人类示范分布的抓法。

### HANDFUL 说明了什么

这项工作把抓取学习与下一步动作直接联系起来。手指接触、剩余手指数量、手掌内部空间，都应进入抓取价值判断。九策略池和角色互换提供了一套紧凑机制，让策略主动发现并利用这些资源，消融实验则把贡献拆得较清楚。

局限同样明确。实验使用状态观测、五类刚体任务和一种四指机械手，课程常数由人工设定。真机阶段使用预计算轨迹和固定第二个物体，每个任务只有 15 次试验，尚未覆盖直接部署闭环 sim-to-real 策略的情形。

更一般的研究启示是，评价中间状态时要看它留下了什么。一个抓取可能很稳，却仍然是不好的第一步。连续灵巧操作的目标应同时包含当前任务完成度，以及可供未来动作使用的指数量、接触区域和手内空间。

</div>
