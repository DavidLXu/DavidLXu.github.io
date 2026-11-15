---
title: "[Paper Notes] Robot-Use RL: Training Reasoning Models in Simulation to Natively Use Real Robots"
date: 2026-11-15
permalink: /posts/2026/11/robot-use-rl-pear-paper-notes/
excerpt: "PEAR trains a 27B reasoning model with binary task rewards in simulation. Group-relative policy gradients and a staged curriculum improve robot use, with 18 successes in 30 real-robot trials after LIBERO and RoboDojo training."
tags:
  - Paper Notes
  - Reinforcement Learning
  - Robot-Use Agents
  - Vision-Language Models
  - Sim-to-Real
  - Robotic Manipulation
---

<div data-lang="en" markdown="1">

**Robot-Use RL (RURL) trains a reasoning model to observe a robot, reason in text, and issue its next movement.** The reward is a single success/failure bit for the whole episode. With PEAR, the authors train Qwen3.8-27B entirely in simulation, raising LIBERO success from 1.6% to 74.4%. After additional simulated dual-arm training, it completes 18 of 30 trials on a real robot. The useful question is how such sparse feedback can improve a policy whose initial success rate is almost zero.

These notes cover *Training Reasoning Models in Simulation to Natively Use Real Robots*, a November 14, 2026 preprint by Jiaming Tang, Zhuoyang Zhang, Junxian Guo, Fangzhou Zhao, Yilong Zhao, Zekai Li, Xingyang Li, Yuyang Zhao, Song Bian, Zhijian Liu, and Song Han. [Paper PDF](https://mit-han-lab.github.io/pear-blog/paper.pdf) · [Project](https://mit-han-lab.github.io/pear-blog/) · [Code](https://github.com/mit-han-lab/pear)

## What the model actually controls

At each round, the context contains the instruction, a description of the robot and its coordinate frame, camera images, current arm state, and previous rounds. The model generates reasoning followed by a JSON action. Section 3.1 specifies changes to named robot quantities, with translations in centimeters and rotations in radians. This detail matters when implementing the interface: the paper's shorthand “next pose” should not be read as an arbitrary absolute-pose command.

The robot backend executes the action and returns a new observation. LIBERO uses the Franka's operational-space controller; RoboDojo uses Cartesian waypoints with inverse kinematics. Execution continues until the target is reached and the robot rests, or motion is blocked. The language model therefore makes decisions at the movement level, while the robot-specific controller handles execution. “Without a harness” here means the authors supply no perception tools, grasp or motion planners, or skill library. A robot description, action protocol, and controller remain necessary. [Sections 3.1 and A](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=4)

## One outcome supervises every generated token

For a task and initial state, PEAR samples a group of eight episodes. An episode receives reward 1 if the simulator reports success and 0 otherwise. GRPO supplies the episode advantage:

$$
\hat A_i = \frac{R(\tau_i)-\operatorname{mean}_j R(\tau_j)}{\operatorname{std}_j R(\tau_j)+\epsilon}.
$$

Every generated token in that episode receives the same advantage, including reasoning tokens and JSON action tokens from every round. There is no separate label for a good grasp, a correct spatial explanation, or a successful recovery. This gives trajectory-level credit assignment: tokens in successful episodes are reinforced relative to other attempts from the same start, without identifying which individual sentence or action caused success.

The update uses a REINFORCE policy gradient with group-relative advantages, **without PPO clipping**. Rollouts and updates run asynchronously, so the behavior policy μ is one or two versions behind the policy πθ being trained. Equation 2 centers each token's score gradient by subtracting its expectation under μ. In compact notation, with *c* the token context and *y* the sampled token, the contribution is proportional to

$$
\hat A_i\left[\nabla_\theta\log\pi_\theta(y\mid c)
-\mathbb E_{v\sim\mu(\cdot\mid c)}\nabla_\theta\log\pi_\theta(v\mid c)\right].
$$

This score-centering correction handles the policy mismatch; the authors do not combine it with truncated importance sampling. They average the loss over generated tokens, use AdamW at a learning rate of 10⁻⁶, and apply neither a KL penalty nor an entropy bonus. Each step contains 128 retained groups of eight rollouts. [Equations 1–2 and Table 1](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=5)

## The curriculum creates the first useful rewards

If all eight attempts fail, every advantage is zero. The same happens if all eight succeed. PEAR follows DAPO's dynamic sampling approach: discard these groups and sample replacements. This concentrates updates on starts where outcomes vary, but it cannot rescue a task on which the model never succeeds.

The training schedule addresses that problem directly:

| Stage | Training tasks | Updates |
| --- | --- | --- |
| 1 | LIBERO Goal, Spatial, and Object | 1–148 |
| 2 | All four LIBERO suites, adding Long | 149–225 |
| 3 | RoboDojo general pickup and align blocks | 115 further updates |

After stage 1, success on the still-unseen LIBERO-Long suite rises from 0.4% to 39.0%. Adding Long now provides mixed-outcome groups and raises its eventual success to 53.2%. The curriculum lets easier tasks establish behaviors that produce rewards on harder ones. It is central to the sparse-reward recipe. [Sections 3.3 and 4.3](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=5)

Long episodes make this expensive. Appendix A reports roughly 94k tokens and 19.7 rounds per training episode on average. Sequence limits are 256k tokens for LIBERO and 160k for RoboDojo. PEAR combines asynchronous veRL training, sequence parallelism, FSDP, and gradient checkpointing; on H100 nodes, LMCache offloads prefix KV caches to CPU memory and maintains about 95% or higher cache hits. The infrastructure makes repeated observations and growing interaction histories affordable enough to train on.

## Which results demonstrate transfer?

The 74.4% LIBERO result uses the stage-2 checkpoint, evaluated over 2,000 episodes spanning 40 tasks. It remains below the reported 96.9% of the demonstration-trained π0.5 checkpoint on that benchmark. On the LIBERO-Pro perturbation that changes the task instruction while keeping the scene, PEAR obtains 57.4% and π0.5 obtains 0.75%. That contrast supports instruction sensitivity under changed goals. π0.5 still leads on LIBERO-Plus overall, 85.7% versus 62.2%; PEAR's advantage is not uniform across visual perturbations. These π0.5 numbers come from prior reports, not a fresh matched evaluation by the PEAR authors. [Section 4.2](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=7)

The real-robot experiment uses a dual-arm YAM, unseen during training. Each model gets 20 pickup trials across ten objects and ten block-alignment trials across five scenes. The base model succeeds in 0/30, the LIBERO-only model in 7/30, and the final model in 18/30, comprising 12 pickup and six alignment successes. The final model has already trained on the corresponding two tasks in RoboDojo with a different robot. This is transfer to real hardware and a new embodiment; the 60% figure does not measure wholly unseen task families. Drawing and chemistry examples are separate qualitative demonstrations. [Section 4.4 and Appendix G](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=8)

## Reasoning time is still part of the control budget

Lowering reasoning effort reduces LIBERO success from 74.4% at xhigh to 21.9% at low, while average thinking tokens per round fall from 3.23k to 0.86k. The paper also reports lower accuracy with NVFP4 quantization, so all evaluations use BF16. Fast quantized decoding and the headline success rates should therefore be treated as different measurements. The final model still fails 12 real trials, including six that exhaust the round budget and three that leave blocks misaligned. [Sections 4.6–5 and Appendix G](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=9)

My main takeaway is to test whether an intended training task can produce mixed-success rollout groups before committing to a large RURL run. This paper provides a concrete way to expand that set through transfer. For deployment, I would also measure time per completed task: the observed drop at low effort makes reasoning latency a practical research problem, even when the robot's low-level controller is already fast.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**Robot-Use RL（RURL）训练推理模型观察机器人、用文本推理，再输出下一次运动。** 整个回合只有一个成功或失败的奖励。作者用 PEAR 在纯仿真中训练 Qwen3.8-27B，将 LIBERO 成功率从 1.6% 提升到 74.4%；追加仿真双臂训练后，模型在真机上完成了 30 次试验中的 18 次。值得细读的问题是：初始成功率几乎为零时，这样稀疏的反馈如何推动学习？

本文记录 *Training Reasoning Models in Simulation to Natively Use Real Robots*，采用 2026 年 11 月 14 日预印本。作者为 Jiaming Tang、Zhuoyang Zhang、Junxian Guo、Fangzhou Zhao、Yilong Zhao、Zekai Li、Xingyang Li、Yuyang Zhao、Song Bian、Zhijian Liu 和 Song Han。[论文 PDF](https://mit-han-lab.github.io/pear-blog/paper.pdf) · [项目主页](https://mit-han-lab.github.io/pear-blog/) · [代码](https://github.com/mit-han-lab/pear)

## 模型具体控制什么

每轮输入包含任务指令、机器人及其坐标系的描述、相机图像、当前机械臂状态和此前各轮交互。模型先生成推理，再输出 JSON 动作。第 3.1 节将动作定义为机器人各命名量的变化值，平移单位为厘米，旋转单位为弧度。实现接口时需要核对这一点，不能把文中概括性的“下一个位姿”直接当作任意绝对位姿指令。

后端执行动作并返回新观测。LIBERO 使用 Franka 的操作空间控制器；RoboDojo 通过逆运动学跟踪笛卡尔路径点。执行持续到目标到达且机器人静止，或运动受阻。语言模型在一次运动的尺度上做决策，机器人自身的控制器负责执行。文中的“无需 harness”具体指不提供感知工具、抓取或运动规划器、技能库；机器人描述、动作协议和控制器仍然存在。[第 3.1 节与附录 A](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=4)

## 一个终局结果如何监督所有 token

PEAR 针对同一任务和初始状态采样八条完整轨迹。仿真器判定成功时奖励为 1，否则为 0。通过 GRPO 得到每条轨迹的优势：

$$
\hat A_i = \frac{R(\tau_i)-\operatorname{mean}_j R(\tau_j)}{\operatorname{std}_j R(\tau_j)+\epsilon}.
$$

同一轨迹里所有生成的 token 都使用这个优势，包括每轮的推理文本和 JSON 动作。训练没有为正确抓取、准确空间解释或成功纠错分别提供标签。这是一种轨迹级信用分配：相对于同一起点的其他尝试，提高成功轨迹中生成内容的概率，但不直接判定其中哪句话或哪个动作导致了成功。

更新采用带组内相对优势的 REINFORCE 策略梯度，**不使用 PPO clipping**。采样和更新完全异步，生成轨迹的行为策略 μ 比正在训练的 πθ 落后一到两个版本。公式 2 对每个 token 的 score gradient 做中心化，减去它在 μ 下的期望。记 *c* 为 token 的上下文，*y* 为采样 token，其贡献可简写为：

$$
\hat A_i\left[\nabla_\theta\log\pi_\theta(y\mid c)
-\mathbb E_{v\sim\mu(\cdot\mid c)}\nabla_\theta\log\pi_\theta(v\mid c)\right].
$$

作者用这个 score-centering 修正处理策略不一致，没有叠加截断重要性采样。损失按整批生成 token 求平均，使用学习率为 10⁻⁶ 的 AdamW，不加 KL 惩罚或熵奖励。每次更新使用筛选后保留的 128 组轨迹，每组八条。[公式 1–2 与表 1](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=5)

## 训练课程怎样产生第一批有效奖励

八次尝试全部失败时，优势全部为零；全部成功也一样。PEAR 沿用 DAPO 的动态采样思路，丢弃这些组并重新补采样，让更新集中在结果存在差异的初始状态上。不过，如果一个任务始终无法成功，这种筛选本身仍然无法产生学习信号。

训练安排直接针对这个问题：

| 阶段 | 训练任务 | 更新次数 |
| --- | --- | --- |
| 1 | LIBERO Goal、Spatial、Object | 第 1–148 步 |
| 2 | 加入 Long，覆盖 LIBERO 四个任务集 | 第 149–225 步 |
| 3 | RoboDojo 的 general pickup 与 align blocks | 追加 115 步 |

第一阶段结束时，尚未参与训练的 LIBERO-Long 成功率已从 0.4% 升至 39.0%。此时加入 Long，可以获得成功与失败混合的组，随后该任务集的成功率升至 53.2%。较容易任务上学到的行为先迁移过去，让困难任务也开始产生奖励。课程设计因此是这套稀疏奖励训练方法的关键组成部分。[第 3.3、4.3 节](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=5)

长交互的计算成本很高。附录 A 报告，训练回合平均约有 94k token、19.7 轮交互；LIBERO 和 RoboDojo 的序列上限分别为 256k 与 160k token。PEAR 结合异步 veRL、序列并行、FSDP 和梯度检查点；在 H100 节点上用 LMCache 将前缀 KV 缓存卸载到 CPU 内存，保持约 95% 及以上的缓存命中率。这些工程设计支撑了带完整历史、不断重复观测的长序列训练。

## 哪些结果说明了迁移能力

LIBERO 的 74.4% 使用第二阶段检查点，在 40 个任务、2,000 个回合上评估。它低于示范训练的 π0.5 检查点所报告的 96.9%。在 LIBERO-Pro 中保持场景、改变任务指令的测试上，PEAR 为 57.4%，π0.5 为 0.75%，说明 PEAR 更能根据新目标调整行为。π0.5 在 LIBERO-Plus 总体上仍领先，结果为 85.7% 对 62.2%；PEAR 的优势并不覆盖所有视觉扰动。这里的 π0.5 数字引用自既有报告，并非 PEAR 作者重新做的配套评测。[第 4.2 节](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=7)

真机使用训练中未出现过的双臂 YAM。每个模型进行 20 次抓取试验，覆盖十种物体，以及十次方块对齐试验，覆盖五个场景。基础模型成功 0/30，仅用 LIBERO 训练的模型成功 7/30，最终模型成功 18/30，其中抓取成功 12 次，对齐成功六次。最终模型已经在 RoboDojo 中用另一种机器人训练过这两个对应任务。因此，60% 衡量的是向真实硬件和新构型的迁移，不能解读为对全新任务类型的成功率。绘画和化学实验属于另外展示的定性案例。[第 4.4 节与附录 G](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=8)

## 推理耗时仍然占据控制预算

将推理强度从 xhigh 降到 low，LIBERO 成功率从 74.4% 降至 21.9%，每轮平均思考 token 从 3.23k 减少到 0.86k。论文还报告 NVFP4 量化会降低准确率，因此所有评测都使用 BF16。量化后的解码速度与主要成功率结果需要分别阅读。最终模型在真机上仍失败了 12 次，其中六次耗尽交互轮数，三次未将方块对齐。[第 4.6–5 节与附录 G](https://mit-han-lab.github.io/pear-blog/paper.pdf#page=9)

我认为，准备投入大规模 RURL 训练前，首先应该测量目标任务能否产生成功与失败混合的轨迹组。这篇论文给出了通过迁移扩大这一任务集合的具体方法。面向部署时，我还会记录完成每个任务的总耗时：降低推理强度带来的成功率损失说明，即使底层控制器已经很快，推理延迟依然是需要单独解决的问题。

</div>
