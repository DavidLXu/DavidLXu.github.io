---
title: "[Paper Notes] Play2Perfect: What Matters in Dexterous Play Pretraining for Precise Assembly?"
date: 2026-07-29
permalink: /posts/2026/07/play2perfect-paper-notes/
tags:
  - Dexterous Manipulation
  - Reinforcement Learning
  - Robot Assembly
  - Sim-to-Real
  - Pretraining
---

<div data-lang="en" markdown="1">

**Play2Perfect** takes a simple position on dexterous assembly: an agent should acquire broad manipulation competence before it is asked to solve a millimetre-scale contact problem. Its two-stage recipe first trains one goal-conditioned policy to play with many objects in free space, then finetunes that policy with sparse rewards on a particular CAD-defined assembly task. The pretraining phase learns reusable grasping, in-hand reorientation, and 6D pose-control behaviors; finetuning concentrates exploration on contact, alignment, insertion, and screwing.

The important result is not merely that pretraining helps. The paper identifies what makes a play prior transfer: diverse objects, random goal trajectories, a 6D objective with orientation control, and precise goal tolerances. Each choice pushes the hand toward finger-driven in-hand control, the capability needed when an assembly trajectory can no longer be achieved by moving the arm with a fixed grasp.

## Paper Info

**"Play2Perfect: What Matters in Dexterous Play Pretraining for Precise Assembly?"** is by **Tyler Ga Wei Lum, Kushal Kedia, C. Karen Liu, and Jeannette Bohg** (Stanford University and Cornell University). It is an arXiv preprint, [arXiv:2606.26428](https://arxiv.org/abs/2606.26428), revised in July 2026. The [project page](https://play2perfect.github.io/) provides videos and additional implementation material.

## Why Sparse-Reward Assembly Is So Difficult

A dexterous hand starting from a random policy must first discover how to grasp an object, retain it, reorient it, bring it to the fixture, align it, and cope with contact before it reaches an assembly terminal reward. This makes direct sparse-reward reinforcement learning extremely unlikely to obtain useful early trajectories. Dense, task-specific shaping can guide exploration, yet it encodes detailed knowledge about the particular task and may create shortcuts that do not survive perturbations.

Play2Perfect shifts the learning burden. Free-space play makes object motion and grasp recovery attainable, so it can train a reusable prior without knowing the final assembly geometry. Downstream RL then adapts an already dexterous policy to the final high-precision interaction. This keeps the assembly task sparse-reward while avoiding discovery from a completely unskilled initialization.

## Stage 1: Goal-Conditioned Dexterous Play

The play policy controls both a 7-DoF KUKA iiwa 14 arm and a 22-DoF Sharpa five-fingered hand. At time \(t\), it conditions on robot proprioception \(s_t\), current object pose \(o_t\in SE(3)\), target pose \(g_t\in SE(3)\), and bounding-box dimensions \(\phi\):

\[
\pi_\theta(s_t,o_t,g_t,\phi).
\]

Simulation procedurally generates cuboids and cylinders whose dimensions fit the hand. Density, extra end masses, center of mass, and inertia are randomized as well. The default pretraining set contains 1,000 objects. This deliberately modest object family makes simulation fast and stable while exposing the policy to geometry and dynamics that cannot be handled with one memorized grasp.

Every episode follows a sequence of random 6D object-pose goals. The first goal requires grasping and lifting from the table. Later goals require maintaining the grasp while changing translation and rotation. The reward combines action smoothness, a lifting incentive, and a goal term with a large success bonus:

\[
r = r_{\mathrm{smooth}} + r_{\mathrm{grasp}} + r_{\mathrm{goal}},
\qquad
r_{\mathrm{goal}}\text{ is successful when }d_{\mathrm{pose}}(o_t,g_t)<\epsilon.
\]

The default \(\epsilon=1\,\mathrm{cm}\) is consequential. It turns play into accurate pose control instead of coarse transport. Goals are sampled online: the first is broad in workspace and later goals sit near the prior pose with substantial rotations. These trajectories repeatedly force regrasping and finger-mediated orientation changes.

## Stage 2: Turn a CAD Assembly into Sparse RL

For a target assembly, the method starts from CAD meshes and the completed part configuration. It uses **assembly-by-disassembly**: find a feasible sequence of removals, reverse it, and obtain an assembly sequence. Each step inserts a part \(p_i\) into the fixture formed by already assembled parts \(f_i\).

The CAD model supplies the desired relative transform \(T^{f_i}_{p_i}\), so the final goal follows from the current fixture pose:

\[
g_i^M = f_i^t T^{f_i}_{p_i}.
\]

Reversing the assembly motion also yields a small set of contact-aware intermediate poses. An insertion task receives an aligned pre-insertion pose; a screwing task receives poses along the thread at 90-degree rotational intervals. These goals remain sparse, because they describe success configurations instead of an engineered reward for every action. Finetuning starts from the play policy and uses Split and Aggregate Policy Gradients (SAPG).

The deployment pipeline uses the same CAD meshes with FoundationPose to track both the movable part and fixture in 6D. Policies run closed-loop at 60 Hz, pose tracking at 30 Hz, and domain randomization covers action latency plus delays and noise in current and goal poses.

## What the Ablations Actually Say

The four ablations are a useful design guide for pretraining embodied policies.

- **Object diversity:** pretraining on 1,000 primitives produces more stable finetuning than 100 or 10 objects. Diversity includes inertial properties, not just geometry.
- **6D objective:** translation-only play can learn lifting and transport but misses the orientation-control prior required for assembly. Rotation-only play transfers much better; full 6D goals are most consistent because they couple reorientation with translation.
- **Trajectory diversity:** freshly sampled goal trajectories outperform fixed banks of 10 or 100 trajectories. The policy gains broader coverage of object-pose transitions.
- **Goal precision:** a 10 cm success tolerance transfers poorly and 5 cm learns more slowly. The 1 cm objective teaches the fine object-pose control that tight clearance later demands.

Together, these results sharpen the paper's thesis. Pretraining data is useful when its objective makes the desired control skill unavoidable. A large amount of play that permits a fixed grasp and arm-only transport is much less relevant to contact-rich assembly.

## Results: Fast RL, Then Contact-Aware Behavior

The authors evaluate tight T-peg insertion, two stages of multi-part beam assembly, and screwing a furniture leg. Across the four contact-rich tasks, Play2Perfect reaches successful policies in roughly **2–5 hours** of wall-clock RL. Scratch policies with either sparse rewards or hand-designed dense multi-stage rewards obtain no successful rollouts after 24 hours.

On an easier fixtured insertion variant, scratch training can eventually work, but dense-reward scratch needs more than **100 hours** to approach perfect success; Play2Perfect reaches the same level in **4 hours**, a reported **33×** speed-up. The behavioral distinction matters: the dense-reward policy balances the peg with its thumb, then collapses under perturbation. At a 10 N perturbation it falls to about 20% success and reaches zero under stronger disturbances. The play-pretrained policy forms a multi-finger grasp and stays above 75% even at the largest tested perturbations.

Play alone is still insufficient for fine assembly. In simulation, the frozen play policy succeeds about 75% of the time at 40 mm insertion clearance and falls near zero by 4 mm. After assembly finetuning, Play2Perfect reports 95% at 4 mm, 92% at 1 mm, and 80% at 0.2 mm, including a tighter setting than its training range. The adaptation phase learns local contact search and corrective motions instead of treating contact as a disturbance.

## Zero-Shot Sim-to-Real Transfer

Without real-world finetuning, the system achieves **10/10**, **9/10**, and **6/10** successes for tight insertion at 10 mm, 2 mm, and 0.5 mm clearance. Its two beam-assembly stages achieve **8/10** and **7/10**, while the furniture-leg task reaches **7/10** for insertion and **5/10** for full screwing. Completion time increases as clearance tightens—from \(6.8\pm1.5\) s at 10 mm to \(11.1\pm5.1\) s at 0.5 mm—consistent with the policy taking more local alignment actions.

These results are encouraging, especially the 60% success rate at 0.5 mm clearance. They should still be read at the scale of the reported evaluation: ten hardware trials per condition, fixed fixture pose, and randomized initial part poses. The most common failures remain at the final contact-rich interaction, where occlusion degrades pose estimates and contact dynamics expose simulation-to-reality mismatch.

## Takeaways and Limits

For dexterous robotics, Play2Perfect reframes play as **RL pretraining**, not a zero-shot replacement for task-specific control. Free-space play solves the broad skill-acquisition problem; sparse assembly finetuning learns the geometry- and contact-specific part. This division is a practical answer to sparse rewards when demonstrations, fixtures, and hand-engineered reward staging are costly.

The method also has boundaries. It learns short-horizon skills, while task sequencing, part selection, and goal poses are supplied externally. It finetunes per task or benchmark family and depends on CAD-based pose tracking; the policy does not directly observe the fixture or surrounding geometry beyond goal poses. Integrating scene perception, tactile sensing, recovery behavior, and a higher-level sequencing policy would be the natural route from individual assembly skills toward autonomous multi-part assembly.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**Play2Perfect** 对灵巧装配提出了一个直接的判断：在面对毫米级接触任务之前，policy 应先获得广泛的 manipulation competence。它采用两阶段流程：先训练一个 goal-conditioned policy，在自由空间中与大量物体进行 play；再用 sparse reward 将该 policy finetune 到一个特定、由 CAD 定义的 assembly task。预训练得到可复用的 grasping、in-hand reorientation 和 6D pose control，finetuning 则把探索集中在接触、对齐、插入和旋拧上。

这篇论文有价值的地方不只是“pretraining 有效”。它系统地回答了什么样的 play prior 能迁移：更丰富的物体、多样且随机的 goal trajectories、包含 orientation control 的 6D objective，以及严格的 goal tolerance。这些设计共同迫使手指参与 in-hand manipulation；当装配轨迹无法靠固定抓取后移动机械臂完成时，这正是最关键的能力。

## 论文信息

论文 **"Play2Perfect: What Matters in Dexterous Play Pretraining for Precise Assembly?"** 由 **Tyler Ga Wei Lum、Kushal Kedia、C. Karen Liu 和 Jeannette Bohg** 撰写，作者来自 Stanford University 与 Cornell University。论文为 arXiv preprint，[arXiv:2606.26428](https://arxiv.org/abs/2606.26428)，最新版本修订于 2026 年 7 月。[项目主页](https://play2perfect.github.io/) 提供了演示视频和补充材料。

## 为什么 Sparse-Reward Assembly 如此困难

一个从随机策略开始的灵巧手，必须先发现如何抓取物体、保持抓取、在手内调整朝向、搬运到 fixture、完成对齐并处理接触，之后才可能得到一次 assembly 的终止奖励。对于 sparse-reward RL，这几乎不会自然产生有价值的早期轨迹。Dense、task-specific reward 可以引导探索，但它依赖对具体任务的细致先验，也容易诱导在扰动下失效的 shortcut。

Play2Perfect 将学习负担拆开。自由空间中的 play 让 object motion 与 grasp recovery 变得可学习，因此能在未知最终 assembly geometry 的情况下训练通用 prior。下游 RL 在已有灵巧能力的基础上，适应最终的 high-precision contact interaction。Assembly task 保持 sparse reward，训练也不再从完全没有技能的初始化开始。

## 阶段一：Goal-Conditioned Dexterous Play

Play policy 同时控制 7-DoF KUKA iiwa 14 arm 和 22-DoF Sharpa five-fingered hand。在时刻 \(t\)，其输入为 robot proprioception \(s_t\)、当前 object pose \(o_t\in SE(3)\)、目标 pose \(g_t\in SE(3)\)，以及物体 bounding-box dimensions \(\phi\)：

\[
\pi_\theta(s_t,o_t,g_t,\phi).
\]

仿真中会程序化生成 cuboid 与 cylinder，并限制尺寸使其能够被手抓取。系统还随机化 density、末端附加质量、center of mass 和 inertia。默认预训练集包含 1,000 个 objects。这个相对简单的 object family 保持了 simulation 的速度和稳定性，同时让 policy 面对无法靠单一记忆 grasp 解决的 geometry 与 dynamics 变化。

每个 episode 对应一段随机的 6D object-pose goals。第一个目标要求从桌面抓起物体；后续目标要求在不掉落的前提下同时改变 translation 与 rotation。Reward 包括动作平滑、抬起物体和到达目标三部分，其中 goal term 带有较大的 sparse success bonus：

\[
r = r_{\mathrm{smooth}} + r_{\mathrm{grasp}} + r_{\mathrm{goal}},
\qquad
r_{\mathrm{goal}}\text{ 在 }d_{\mathrm{pose}}(o_t,g_t)<\epsilon\text{ 时成功}.
\]

默认 \(\epsilon=1\,\mathrm{cm}\) 很关键。它让 play 学习精确 pose control，而不是粗略搬运。Goals 以在线随机方式采样：第一个目标覆盖较大 workspace，后续目标位于前一个 pose 附近且包含明显 rotation。这些轨迹持续要求 regrasp 和由手指完成的 orientation adjustment。

## 阶段二：将 CAD Assembly 转为 Sparse RL

对于目标 assembly，方法从 CAD mesh 和完成后的 part configuration 出发，采用 **assembly-by-disassembly**：先找到可行的拆卸顺序，再反转顺序形成 assembly sequence。每一步都把 part \(p_i\) 插入由已装配 parts 构成的 fixture \(f_i\)。

CAD 给出目标 relative transform \(T^{f_i}_{p_i}\)，因此最终 goal pose 可写为：

\[
g_i^M = f_i^t T^{f_i}_{p_i}.
\]

反转 assembly motion 还会生成少量 contact-aware intermediate poses。Insertion 会得到对齐后的 pre-insertion pose；screwing 会沿螺纹按 90-degree rotation 间隔得到目标 poses。它们仍然是 sparse goals：表达的是成功 configuration，而不是为每个 action 手工塑造 reward。Finetuning 从 play policy 初始化，并使用 Split and Aggregate Policy Gradients (SAPG)。

在 real-world deployment 中，系统复用 CAD meshes 并用 FoundationPose 跟踪 movable part 和 fixture 的 6D poses。Policy 在 60 Hz 闭环运行，pose tracking 为 30 Hz；domain randomization 则覆盖 action latency、观测延迟以及 current/goal poses 的噪声。

## Ablation 真正说明了什么

四组 ablation 给出了 embodied-policy pretraining 的实用设计准则。

- **Object diversity：** 在 1,000 个 primitives 上预训练，比 100 或 10 个 objects 带来更稳定的 finetuning；其中的 diversity 同时包括 inertia，而不只是几何形状。
- **6D objective：** Translation-only play 能学会抬起和搬运，却缺少 assembly 所需的 orientation-control prior。Rotation-only 的迁移明显更好；完整 6D goals 最稳定，因为它把 reorientation 与 translation 结合在一起。
- **Trajectory diversity：** 在线随机采样的 goal trajectories 优于固定的 10 或 100 条轨迹，说明 policy 获得了更广的 object-pose transition coverage。
- **Goal precision：** 10 cm tolerance 的迁移很差，5 cm 也更慢。1 cm objective 迫使 policy 学习 tight-clearance assembly 所需的精细 object-pose control。

这些结果共同强化了论文的主张：pretraining data 只有在 objective 让目标 control skill 无法被绕开时才真正有用。如果 play 允许固定 grasp 后只依靠 arm 来搬运，再多这类 data 对 contact-rich assembly 的帮助也有限。

## 结果：先快速学会 RL，再学会处理接触

作者评估了 tight T-peg insertion、两阶段 multi-part beam assembly，以及 furniture leg screwing。在四个 contact-rich tasks 上，Play2Perfect 在约 **2–5 小时** wall-clock RL 内得到成功 policy；使用 sparse reward 或手工 dense multi-stage reward 的 scratch baselines 在 24 小时后都没有产生 successful rollouts。

在更简单、带 fixture 的 insertion variant 中，scratch training 最终可以成功，但 dense-reward scratch 需要超过 **100 小时** 才接近 perfect success；Play2Perfect 在 **4 小时** 达到相同水平，论文报告为 **33×** speed-up。行为差别也很重要：dense-reward policy 用 thumb 平衡 peg，而不是建立稳定 grasp，因此扰动下很脆弱。10 N perturbation 时其 success 约为 20%，扰动继续增大后降为 0；play-pretrained policy 形成 multi-finger grasp，在最大测试扰动下仍保持超过 75% 的 success。

只有 play 仍不足以处理精细装配。仿真中 frozen play policy 在 40 mm clearance 下约有 75% success，到 4 mm 时接近 0。经过 assembly finetuning 后，Play2Perfect 在 4 mm、1 mm 和 0.2 mm 下分别报告 95%、92% 和 80%，其中 0.2 mm 比训练分布更紧。适应阶段学到的是 hole 附近的 local contact search 和 corrective motion，而不再把 contact 当作需要排除的扰动。

## Zero-Shot Sim-to-Real Transfer

在没有 real-world finetuning 的条件下，系统在 10 mm、2 mm 和 0.5 mm tight insertion 上分别达到 **10/10**、**9/10** 与 **6/10** success。两步 beam assembly 分别为 **8/10** 与 **7/10**；furniture-leg task 在 insertion 和完整 screwing 上分别为 **7/10** 与 **5/10**。随着 clearance 变紧，completion time 从 10 mm 时的 \(6.8\pm1.5\) s 增至 0.5 mm 时的 \(11.1\pm5.1\) s，这与 policy 为获得更精确对齐而执行更多 local adjustment 一致。

这些结果很有鼓舞性，尤其是 0.5 mm clearance 下 60% 的成功率。不过也需要放在其 evaluation scale 中理解：每个真实条件只做了十次 trials，fixture pose 固定，initial part poses 随机。主要 failure 仍集中在最终 contact-rich interaction：occlusion 会恶化 pose estimate，contact dynamics 会暴露 sim-to-real mismatch。

## 启发与边界

对 dexterous robotics 而言，Play2Perfect 将 play 重新定义为 **RL pretraining**，而不是 zero-shot task-specific control 的替代品。Free-space play 负责广泛的 skill acquisition；sparse assembly finetuning 负责几何与接触细节。这为 demonstrations、fixtures 和手工 reward staging 成本较高时的 sparse-reward learning 提供了一个实际路径。

方法也有清晰边界。它学习的是 short-horizon skills，task sequencing、part selection 和 goal poses 由外部提供；policy 会针对 task 或 benchmark family finetune，并依赖 CAD-based pose tracking。除了 goal pose 之外，policy 不直接观察 fixture 或 surrounding geometry。进一步结合 scene perception、tactile sensing、recovery behavior 与 high-level sequencing policy，才可能从单个 assembly skills 走向 autonomous multi-part assembly。

</div>
