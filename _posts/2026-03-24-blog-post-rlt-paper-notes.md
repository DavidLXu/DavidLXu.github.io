---
title: "[Paper Notes] RL Token: Bootstrapping Online RL with Vision-Language-Action Models"
date: 2026-03-24
permalink: /posts/2026/03/rlt-paper-notes/
tags:
  - Robotics
  - Reinforcement Learning
  - Vision-Language-Action
  - Online RL
  - Sample Efficiency
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

This paper tackles a very practical problem in robotics: pretrained vision-language-action models can already do a surprising amount, but they often break down in the last few millimeters of a task, exactly where precision and speed matter most. The authors propose **RL Token (RLT)**, a lightweight way to fine-tune a pretrained VLA with online reinforcement learning in the real world without trying to RL-train the whole giant model.

The key move is to make the frozen VLA expose a compact **RL token**, then train a small actor-critic on top of that token while keeping the policy anchored to the VLA’s suggested action chunk. On four real-robot precision tasks, this leads to large improvements within minutes to a few hours of robot practice, including up to **3x speedup** in the hardest phase of the task and substantial gains in success rate.

## Paper Info

The paper is **“RL Token: Bootstrapping Online RL with Vision-Language-Action Models,”** by **Charles Xu, Jost Tobias Springenberg, Michael Equi, Ali Amin, Adnan Esmail, Sergey Levine, and Liyiming Ke** from **Physical Intelligence**. The PDF points to the project page at [pi.website/research/rlt](https://pi.website/research/rlt).

## 1. Motivation

The starting point is easy to sympathize with. Modern VLAs can already solve a broad set of manipulation tasks from demonstrations, but their performance on a specific task is capped by the quality of the demonstration data. That becomes painfully obvious on tasks like screw insertion, zip tie fastening, or cable insertion, where tiny alignment errors lead to hesitation, repeated probing, or outright failure.

Reinforcement learning is the obvious tool for pushing beyond that ceiling, because RL can optimize exactly the part of the behavior that matters most for success. The problem is that real-world robot RL is operating under a harsh data budget. You usually do not get millions of trials. You get minutes or hours of robot time, a sparse success signal, and a limited tolerance for breakage, wear, and operator overhead.

That tension defines the paper. Full-scale RL fine-tuning of a giant VLA is too expensive and sample-inefficient, but throwing away the VLA and training a small policy from scratch also throws away the representation and behavioral prior that made the VLA useful in the first place. RLT tries to sit between those two extremes.

## 2. Core Idea

The method builds a compact RL interface on top of a pretrained **π0.6** VLA. Rather than directly updating the whole model online, the authors first train the VLA to expose an **RL token**, a compressed representation extracted from its internal embeddings. This token is meant to preserve task-relevant information while being small enough that a lightweight actor and critic can actually learn from it online.

Concretely, they append a learned special token to the VLA’s internal embedding sequence, run a small encoder over that sequence, and use the resulting token as a bottleneck. A decoder is then trained to reconstruct the original VLA embeddings from this compact representation. The reconstruction objective is what forces the RL token to stay informative rather than becoming an arbitrary low-dimensional projection.

Once that representation is trained, the VLA and token extractor are frozen. Online RL then happens only in a small actor-critic head. The critic estimates chunk-level value, and the actor does not generate behavior from scratch. Instead, it receives both the RL token and a **reference action chunk** sampled from the VLA. This changes the nature of RL from open-ended search to local refinement around a competent prior.

The actor objective reflects that design directly:

$$
\mathcal{L}_{\pi}(\theta) = \mathbb{E}\left[-Q_{\psi}(x, a_{1:C}) + \beta \lVert a_{1:C} - \tilde{a}_{1:C}\rVert_2^2 \right]
$$

Here, \\(a\_{1:C}\\) is the actor’s chunked action, \\(\tilde{a}\_{1:C}\\) is the VLA’s sampled reference chunk, and the regularization term keeps the RL policy near the base VLA unless the critic has a good reason to move away.

That anchoring term is important because the paper is not trying to rediscover robot behavior from scratch. It is trying to take a good-but-imperfect VLA and improve the small, high-precision parts where demonstrations are weakest.

## 3. Why the Method Is Structured This Way

Several choices in the paper are there to make online RL realistic rather than elegant.

First, the method uses **action chunks** rather than single-step actions. The base VLA predicts a 50-step chunk, while the RL policy operates on a shorter chunk of length 10. This shortens the effective credit-assignment horizon and makes sparse-reward temporal-difference learning much more plausible on real robots running at 50 Hz.

Second, the actor is conditioned on the VLA’s sampled reference chunk. That matters for two reasons. It preserves mode information from the VLA’s multimodal action distribution, and it means the RL policy is editing a promising behavior rather than inventing one from scratch. The paper argues, convincingly in my view, that this is one reason online learning can move so quickly.

Third, the authors add **reference action dropout** during training. Without it, the actor could simply copy the VLA proposal and never learn to improve it. By randomly zeroing out the reference chunk for some updates, they force the actor to maintain an independent pathway while still benefiting from the VLA prior whenever it is available.

Finally, the overall system is built around a practical intervention loop. The replay buffer contains VLA rollouts, online RL rollouts, and optional human interventions. A human supervisor also provides sparse success or failure labels. This is not yet a fully autonomous RL pipeline; it is a deliberately pragmatic one.

## 4. Experimental Setup

The experiments focus on four real-world manipulation tasks that all have a narrow, precision-critical bottleneck: **screw installation**, **zip tie fastening**, **Ethernet insertion**, and **charger insertion**. These are exactly the sorts of tasks where a generalist VLA can usually get close, but the hardest part still requires millimeter or sub-millimeter execution.

The authors evaluate the method in two regimes. In the **critical-phase evaluation**, the episode starts right before the most precision-sensitive part of the task. This isolates the part of the behavior that RL is supposed to improve. In the **full-task evaluation**, the robot starts from its home position and must arrive at the critical phase through the normal base-policy execution, which is harder because upstream variation now matters.

The base VLA is fine-tuned on 1 to 10 hours of demonstrations for each task, and then RLT is trained online for roughly 400 to 1000 episodes depending on difficulty. In actual robot time, the online data budget ranges from around **15 minutes to 5 hours**, which is exactly the regime where a method like this needs to work to be practically interesting.

## 5. Main Results

The headline result is that RLT improves both **success rate** and **throughput**, where throughput measures successful completions per 10-minute interval and therefore captures speed as well as reliability. The gains are largest on the hard, contact-rich parts of the task.

In the controlled critical-phase setting, the paper reports up to **3x faster execution** on the hardest portion of the task. On the challenging screw task, the paper highlights a jump in success rate from **20% to 65%**. In the harder full-task setting, where upstream errors compound, RLT still improves overall success by about **40%** on screw installation and **60%** on zip tie fastening.

One of the most striking qualitative results comes from the Ethernet insertion task. The base VLA tends to probe, back off, readjust, and try again. The final RLT policy instead approaches more decisively and inserts in a fluid motion. The paper reports a median episode length of **228 timesteps** for the base policy, **146** for expert teleoperation, and **66** for the RLT policy on the critical insertion phase. That is an unusually concrete example of online RL discovering a strategy that is not just more successful, but genuinely faster than the demonstrations it started from.

## 6. Comparison to Baselines

The baseline comparison helps clarify what is doing the real work here. The paper compares RLT against HIL-SERL, Probe-Learn-Distill, DSRL, and DAgger. The strongest pattern is that methods operating on **single-step actions** struggle badly in this setting. At 50 Hz with sparse rewards, the credit-assignment horizon simply becomes too long.

DAgger and DSRL remain more competitive, especially on the easier Ethernet task, but they do not deliver the same throughput improvement. That makes intuitive sense. DAgger is still imitation learning, so it is constrained by the speed and style of the human interventions. DSRL stays closer to the frozen VLA’s action manifold, which makes it stable but also limits how far it can move toward a better strategy. RLT’s advantage seems to come from allowing meaningful local improvement without abandoning the VLA prior altogether.

## 7. Ablations

The ablations are unusually coherent. Replacing the RL token with a frozen ResNet-10 representation cuts throughput sharply, which suggests the token really is preserving task-relevant structure from the VLA that a generic visual encoder does not capture. Removing chunked actions hurts even more, reinforcing the paper’s argument that chunking is not just a convenience but a core part of why sparse-reward online RL becomes workable here.

The **behavior-cloning regularizer** appears especially important. When the authors remove the penalty that keeps the RL actor near the VLA action, performance drops the most. That is consistent with the overall thesis of the paper: the point is not to train an RL policy from scratch, but to start from a strong pretrained policy and only refine it where the critic has evidence that improvement is possible.

Removing the reference-action pass-through also slows learning and leads to more unstable early exploration. Interestingly, that version can eventually approach the final performance on the simpler Ethernet task, but it learns more slowly and fails more often along the way. In a real robot setting, that difference matters.

## 8. Why I Think This Paper Matters

What I like most about this paper is that it treats RL not as a replacement for VLAs, but as a **post-training specialization mechanism**. The base VLA gives you semantic understanding, a good policy prior, and the ability to start from broadly competent behavior. Online RL then improves the narrow slice of the task where demonstrations are least reliable and precision matters most.

This feels like a more realistic long-term story for robot learning than either pure imitation or pure end-to-end RL. If large VLAs are going to be useful on real robots, they probably need exactly this kind of “last-mile adaptation” layer. The paper also makes a broader point: once online improvement becomes fast and dependable, the job of pretraining changes. Pretraining does not need to solve every downstream task perfectly. It only needs to give exploration a good enough starting point.

## 9. Limitations

The paper is also fairly candid about the current limitations. Training still depends on human involvement in several places: the supervisor provides sparse success labels, can intervene during rollouts, and decides when to hand control between the base policy and the RL-improved critical phase. That makes the system practical, but not fully autonomous.

The evaluation is also concentrated on carefully selected precision bottlenecks rather than general long-horizon open-world manipulation. I do not think that is a weakness in the paper’s framing, because the authors are explicit about it, but it does mean the method should be read as a tool for **targeted capability refinement**, not as a universal recipe for RL-improving any VLA behavior.

## 10. Takeaways

RLT is a strong paper because it solves the right problem at the right level. It does not try to prove that giant VLAs should be trained end to end with RL. Instead, it asks how to extract the useful part of a pretrained VLA and make it compatible with the realities of online robot learning. The answer is a compact RL token, chunk-level actor-critic learning, and a strong regularization link back to the VLA’s own action proposals.

The result is one of the more convincing examples I have seen of online RL acting as a real performance multiplier for pretrained robot foundation models, especially on tasks where precision and speed matter more than broad semantic generalization.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

这篇论文处理的是一个非常现实的问题：预训练好的视觉-语言-动作模型虽然已经能完成不少操作任务，但它们往往会在任务最后几毫米的位置掉链子，而偏偏这些地方最需要速度、精度和稳定性。作者提出了 **RL Token（RLT）**，目标是在不对整个大模型做昂贵在线强化学习的前提下，让预训练 VLA 能够通过少量真实机器人交互继续变强。

核心思路是让冻结的 VLA 暴露出一个紧凑的 **RL token** 表征，然后在这个表征之上训练一个小型 actor-critic，同时把策略约束在接近 VLA 原始动作 chunk 的范围内。实验显示，在四个真实机器人高精度任务上，这个方法可以在几分钟到几小时的练习内明显提升成功率和速度，在最困难的关键阶段达到 **最高 3 倍提速**。

## 论文信息

论文标题是 **“RL Token: Bootstrapping Online RL with Vision-Language-Action Models”**，作者为 **Charles Xu、Jost Tobias Springenberg、Michael Equi、Ali Amin、Adnan Esmail、Sergey Levine 和 Liyiming Ke**，来自 **Physical Intelligence**。PDF 首页给出的项目页是 [pi.website/research/rlt](https://pi.website/research/rlt)。

## 1. 论文动机

这篇论文的出发点很明确。现代 VLA 已经能通过大规模示范数据学到很多通用操作能力，但它在具体任务上的上限，仍然受制于示范数据本身的质量。对于 screw insertion、zip tie fastening、网线插入这类任务来说，最后的对齐误差往往只有毫米甚至更小，一点点不稳定都会让策略表现成反复试探、犹豫接触，或者直接失败。

强化学习当然是突破这个上限的自然工具，因为它可以针对任务中最关键、最难的部分继续优化。但现实中的机器人 RL 一直受数据预算限制。你通常拿不到几百万次 rollout，只能得到几十分钟到几小时的机器人时间、一个非常稀疏的成功信号，以及有限的人力干预空间。

因此，这篇论文真正要解决的张力是：如果直接对整个 VLA 做在线 RL，计算和样本效率都不现实；但如果彻底放弃 VLA、重新训练一个小策略，又会把大模型预训练得到的表征和行为先验一起丢掉。RLT 的价值就在于它试图站在这两者之间。

## 2. 方法核心

作者的方法建立在一个预训练好的 **π0.6** VLA 之上。它不是直接让 RL 去更新整个模型，而是先训练出一个小而紧凑的 **RL token**，把 VLA 内部与当前任务相关的知识压缩成一个适合在线 RL 使用的状态表示。

具体来说，作者在 VLA 的内部 embedding 序列后面附加一个可学习的特殊 token，然后用一个小型 encoder 对整段序列做处理，把这个特殊位置的输出作为 RL token。为了确保这个 token 真的是“信息瓶颈”而不是任意投影，作者再训练一个 decoder，让它从 RL token 自回归地重建原始的 VLA embedding。也正因为有这个重建目标，RL token 被迫保留足够多的任务相关信息。

完成这一步后，VLA 和 RL token 提取器都会被冻结。在线强化学习只发生在一个小型 actor-critic 头上。critic 估计 chunk-level 的价值，而 actor 并不是从零开始生成动作，它会同时看到 RL token 和 VLA 采样出的一个**参考动作 chunk**。这样一来，在线 RL 的角色就不再是大范围搜索，而是围绕一个已经不错的策略做局部修正。

这一点在 actor 的目标函数里写得很直接：

$$
\mathcal{L}_{\pi}(\theta) = \mathbb{E}\left[-Q_{\psi}(x, a_{1:C}) + \beta \lVert a_{1:C} - \tilde{a}_{1:C}\rVert_2^2 \right]
$$

这里 \\(a\_{1:C}\\) 是 RL actor 输出的动作 chunk，\\(\tilde{a}\_{1:C}\\) 是 VLA 提供的参考 chunk，而正则项会把策略约束在靠近 VLA 的区域，除非 critic 有足够理由推动它偏离。

从方法论上看，这篇论文并不打算重新学习机器人行为本身，而是把重点放在对预训练策略进行“精修”。这也是它样本效率高的根本原因。

## 3. 为什么方法要这样设计

论文里的很多设计，都是为了让在线 RL 真正能在真实机器人上跑起来，而不是为了算法形式上的漂亮。

首先，它坚持使用 **action chunk** 而不是 single-step action。基础 VLA 预测长度为 50 的动作 chunk，而 RL 策略使用更短的 chunk 长度 10。这样做的意义在于显著缩短了 credit assignment 的有效时间跨度，让 50Hz 控制频率下的稀疏奖励学习变得可行。

其次，actor 直接条件化在 VLA 采样出的参考 chunk 上。这不仅保留了 VLA 多峰动作分布中的 mode 信息，也让 RL policy 的角色变成“编辑一个不错的提议”，而不是“凭空产生一个新策略”。作者认为，这正是在线学习能在这么短时间内起作用的重要原因之一，我觉得这个判断是可信的。

第三，作者加入了 **reference action dropout**。如果一直把 VLA 的参考 chunk 喂给 actor，actor 很可能只会学会复制它，而不是真正改进它。为了解决这个问题，训练时会随机把部分 batch 里的参考 chunk 置零，逼迫 actor 保留一条独立的动作生成通路，同时又在需要时能够利用 VLA 的强先验。

最后，整个系统是围绕一个非常务实的人机协同流程来设计的。replay buffer 中混合了 VLA rollout、在线 RL rollout 和人类 intervention，成功信号也来自人类监督。这还不是一个完全自动化的 RL 系统，但它是一个很清楚地为了现实可用性而设计的系统。

## 4. 实验设置

实验选择了四个真实机器人任务：**螺丝安装、扎带穿入、网线插入和充电器插入**。这些任务的共同点是都存在一个很窄但非常关键的精度瓶颈。VLA 往往能把任务做到“快成功了”，但最困难的那一小段仍然需要毫米级甚至亚毫米级控制。

作者把评估分成两个层次。第一种是 **critical-phase evaluation**，也就是把 episode 直接重置到最关键的精细操作阶段之前，只观察 RL 真正应该提升的那一段。第二种是 **full-task evaluation**，机器人从初始位置开始完成整个任务，在更真实也更困难的条件下测试 RL 改进后的关键阶段能否承受上游误差带来的状态分布变化。

每个任务先收集 1 到 10 小时的示范数据，对基础 VLA 做单任务微调并训练 RL token。之后再进行 400 到 1000 个 episode 的在线 RL。真正的机器人交互数据规模大约是 **15 分钟到 5 小时**。如果一个方法想在真实世界里有意义，它就必须在这个数据范围内工作，而这也是 RLT 最值得关注的地方。

## 5. 主要结果

论文最核心的结果是，RLT 同时提高了 **成功率** 和 **throughput**。这里的 throughput 指的是每 10 分钟内成功完成多少次任务，因此它把“快”和“稳”两个维度都纳入进来了。

在只看关键阶段的受控评测中，论文报告在任务最难部分达到了 **最高 3 倍提速**。在最具挑战性的 screw 任务上，成功率从 **20% 提升到 65%**。在更难的 full-task 评测中，由于前面阶段的误差会不断累积，整体成功率更低，但 RLT 仍然能把 screw 任务提升约 **40%**，把 zip tie 任务提升约 **60%**。

我觉得最有说服力的定性结果出现在 Ethernet insertion 上。基础 VLA 通常会在端口附近反复试探、后退、调整、再尝试，而 RLT 学到的策略更像是一次流畅且果断的插入。如果第一次没有完全成功，它还会利用接触中的顺应性轻微摆动后继续推进。论文给出的中位 episode length 是：基础策略 **228** 步，专家遥操作 **146** 步，而 RLT 只有 **66** 步。也就是说，它不仅超过了基础 VLA，甚至在这个关键阶段超过了示范它的人类操作速度。

## 6. 与基线方法的比较

基线对比有助于说明，RLT 真正做对了什么。作者把它与 HIL-SERL、Probe-Learn-Distill、DSRL 和 DAgger 做了比较。最清楚的一点是，那些只考虑 **single-step action** 的方法在这里表现很差。在 50Hz 控制频率和稀疏奖励下，时间跨度太长，value learning 很难把信号有效传回去。

DAgger 和 DSRL 的表现更接近，尤其是在相对容易的 Ethernet 任务上，但它们在 throughput 上仍然不如 RLT。这其实也很好理解。DAgger 仍然是 imitation learning，本质上受限于人类 intervention 的速度和行为风格；DSRL 虽然在 VLA 行为空间里做 RL 调整，因此更稳定，但它也更难跳出原策略找到显著更快的解。RLT 的优势在于，它允许策略围绕 VLA 先验进行真正有幅度的局部改进。

## 7. 消融实验

论文的消融实验做得相当完整，而且逻辑也很清楚。用冻结的 ResNet-10 替换 RL token 后，throughput 明显下降，这说明 RL token 确实保留了 generic visual encoder 学不到的、与操作任务高度相关的结构信息。去掉 chunked action 后效果进一步恶化，也进一步支持了作者的核心判断：在这种频率和奖励结构下，chunking 不是一个方便的工程技巧，而是让在线 RL 变得可行的关键。

其中影响最大的单一组件，似乎是 **行为克隆正则项**。一旦把约束 actor 靠近 VLA 动作的正则去掉，性能下滑最明显。这与整篇论文的总思路完全一致：作者不是想用 RL 从零开始训练策略，而是想在强大的预训练先验附近，安全而高效地做局部搜索。

去掉参考动作 pass-through 也会拖慢学习速度，并在早期探索中带来更多漂移和失败。虽然在较简单的 Ethernet 任务上，这个版本最终也能接近 RLT 的最终效果，但它学得更慢，训练过程中的失败也更多。在真实机器人场景里，这种区别并不只是曲线好不好看，而是实实在在的成本差异。

## 8. 我为什么觉得这篇论文重要

我最喜欢这篇论文的一点，是它没有把 RL 和 VLA 设定成对立关系，而是把 RL 放在了一个更现实的位置上：它是 **预训练策略的后训练专精机制**。VLA 提供的是语义理解、感知能力和一个不错的行为起点，而在线 RL 负责提升任务中最精细、最接近接触极限、也最难通过示范覆盖的那一小部分。

我觉得这比“全靠 imitation”或者“全靠 end-to-end RL”都更像未来真实机器人学习的形态。如果大规模 VLA 真要在机器人上长期有用，它们大概率就需要这样的“最后一公里适配层”。论文还隐含了一个更大的观点：一旦在线改进可以做得足够快、足够稳定，预训练的目标也会变化。预训练不需要一开始就把每个下游任务做到完美，它只需要为后续探索提供一个足够好的起点。

## 9. 局限性

论文对当前方法的局限也说得比较直接。训练过程仍然依赖较多人工参与：人类要提供稀疏成功标签、在 rollout 中必要时 intervention，还要决定何时从基础策略切换到 RL 强化的关键阶段策略。因此，这个系统虽然很实用，但还不能称为完全自动化。

另外，论文评估的重点是作者精心挑选的高精度关键阶段，而不是完全开放的长时程通用操作。我并不觉得这会削弱论文本身，因为作者在 framing 上非常诚实，但它确实意味着，这个方法更适合被理解成一种**定向能力强化工具**，而不是“任何 VLA 行为都可以这样被 RL 提升”的通用答案。

## 10. 我的结论

我觉得 RLT 是一篇很好的论文，因为它解决的是一个真正重要、也真正现实的问题，而且切入层次刚刚好。它并不试图证明“大型 VLA 应该整体用 RL 重新训练”，而是在问：怎样把一个预训练好的 VLA 中最有价值的部分提取出来，并让它适配真实机器人的在线学习约束。作者给出的答案是一个紧凑的 RL token、基于动作 chunk 的 actor-critic，以及始终与 VLA 动作提议保持联系的策略正则化。

从结果来看，这篇论文是目前我见过更有说服力的案例之一，它展示了在线 RL 如何真正成为机器人基础模型的性能放大器，尤其是在那些对精度和速度要求远高于“语义理解”的任务上。

</div>
