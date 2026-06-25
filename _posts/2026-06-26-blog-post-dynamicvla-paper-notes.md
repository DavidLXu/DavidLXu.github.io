---
title: "[Paper Notes] DynamicVLA: A Vision-Language-Action Model for Dynamic Object Manipulation"
date: 2026-06-26
permalink: /posts/2026/06/dynamicvla-paper-notes/
tags:
  - Vision-Language-Action
  - Dynamic Manipulation
  - Robotics
  - Imitation Learning
---

<div data-lang="en" markdown="1">

**DynamicVLA** studies a failure mode that is easy to hide in static manipulation: by the time a VLA finishes thinking, the object may have already moved. Static pick-and-place tolerates slow action chunking because the scene changes little during inference. Dynamic object manipulation changes the constraint. A rolling can, a moving ball, or a deflected object requires fast perception, temporal anticipation, and action execution that stays synchronized with the latest observation.

My read: the paper's center of gravity is temporal control, not model scaling. DynamicVLA uses a compact 0.4B model, overlaps inference and execution with **Continuous Inference**, and uses **Latent-aware Action Streaming** to discard stale actions. The benchmark contribution, **Dynamic Object Manipulation (DOM)**, is equally central because it creates the data and evaluation surface that static robot datasets lack.

## Paper Info

The paper is **"DynamicVLA: A Vision-Language-Action Model for Dynamic Object Manipulation"** by **Haozhe Xie, Beichen Wen, Jiarui Zheng, Zhaoxi Chen, Fangzhou Hong, Haiwen Diao, and Ziwei Liu** from **S-Lab, Nanyang Technological University**. It is available as [arXiv:2601.22153](https://arxiv.org/abs/2601.22153). The project page is [haozhexie.com/project/dynamic-vla](https://haozhexie.com/project/dynamic-vla), and the official implementation is released at [hzxie/DynamicVLA](https://github.com/hzxie/DynamicVLA).

## The Problem

Most VLA systems use action chunking: the model observes the scene, predicts a short action sequence, then the robot executes that sequence. This amortizes inference cost, but it creates two timing problems under moving objects.

First, there is a **perception-execution gap**. The model starts inference from observation \(O_t\), but the resulting action chunk becomes available only after latency \(m\). The first actions in the chunk were meant for the old state, while the world has already advanced to \(O_{t+m}\). Second, there is **inter-chunk waiting**. Many systems trigger the next inference only after finishing the current action chunk, which leaves pauses or stale behavior between chunks.

DynamicVLA frames dynamic manipulation as a synchronization problem:

\[
A_t = M(O_t, L_t, P_t), \quad A_t = \{a_t,\ldots,a_{t+n}\}
\]

Here \(O_t\) is a temporal window of visual observations, \(L_t\) is the language instruction, and \(P_t\) is proprioception. The latent object state \(s_t\) keeps evolving while the model reasons. The control system therefore needs a model that is fast enough and an execution policy that knows which actions are already outdated.

## Model Design

DynamicVLA has a compact VLA backbone and a diffusion-style action expert. The language backbone is **SmolLM2-360M**, truncated to the first 16 transformer layers. For vision, the paper uses **FastViT**, a convolutional vision encoder that compresses spatial structure efficiently and avoids the token growth of transformer-based visual encoders under multi-frame inputs.

The model input includes:

- visual observations from a sparse temporal window, defaulting to \(O_t=\{o_{t-2},o_t\}\);
- language instruction tokens;
- robot proprioception, projected as a state token.

The output is an action chunk:

- horizon \(n=20\);
- each action is a 32D vector representing end-effector pose and gripper state, with padding for unused dimensions.

The action expert is a conditional Flow Matching Transformer. Given VLM features \(f_t\), noisy action chunk \(A_t^\tau\), and diffusion timestep \(\tau\), it learns the denoising vector field:

\[
\ell_\tau(\theta)=\mathbb{E}_{p(A_t|f_t),q(A_t^\tau|A_t)}
\left[\left\|E_\theta(A_t^\tau,O_t)-u(A_t^\tau|A_t)\right\|\right]
\]

This architecture is designed around latency. The model is small enough for high-frequency inference, while the action expert still produces temporally structured action chunks.

## Continuous Inference

Continuous Inference changes when the next inference starts. In a serial chunking pipeline, the system predicts \(A_t\), executes the full chunk, then predicts the next chunk. That creates waiting at chunk boundaries.

DynamicVLA instead starts a new inference as soon as the previous inference finishes. While the robot executes actions from \(A_t\), the model already predicts \(A_{t+m}\). If the action horizon \(n\) is longer than inference latency \(m\), a fresh chunk arrives before the current chunk is exhausted. Execution no longer blocks on inference completion.

This is a simple systems idea, but it matters because dynamic manipulation is dominated by timing. A policy that waits cleanly in static scenes can lose the object in dynamic scenes.

## Latent-Aware Action Streaming

Continuous Inference creates overlapping action chunks. At a given execution timestep, actions from the older chunk \(A_t\) and the newer chunk \(A_{t+m}\) may both exist. DynamicVLA resolves this with **Latent-aware Action Streaming (LAAS)**.

LAAS applies two rules:

- discard actions in \(A_t\) whose intended timesteps are earlier than \(t+m\), since they correspond to already outdated observations;
- when old and new chunks overlap, prioritize the newer chunk \(A_{t+m}\).

This turns action chunking from a fixed commitment into a streaming control interface. The model still benefits from chunk prediction, but execution remains tied to the most recent observation available after inference delay.

## DOM Benchmark

The paper also introduces **Dynamic Object Manipulation (DOM)**, a benchmark and data pipeline for moving-object manipulation. It contains **200K synthetic episodes**, **2.8K scenes**, **206 objects**, and **2K real-world episodes** collected without teleoperation.

The data collection pipeline is important. In simulation, Isaac Sim provides object 6D pose and velocity. A state-machine controller produces four stages: approach object, grasp and lift, approach target and place, then reset. In the real world, teleoperation is too slow for fast moving objects, so the authors build a real-world "simulator": synchronized third-person RGB-D cameras estimate object pose and velocity, then feed the same state-machine controller.

DOM evaluates three groups of abilities:

- **Interaction:** closed-loop reactivity, dynamic adaptation, long-horizon sequencing.
- **Perception:** visual understanding, spatial reasoning, motion perception.
- **Generalization:** visual generalization, motion generalization, disturbance robustness.

This benchmark design is useful because it separates dynamic manipulation into the axes that usually get collapsed into a single success rate.

## Results

In simulation, DynamicVLA is evaluated against Diffusion Policy, OpenVLA-OFT, \(\pi_0\), \(\pi_{0.5}\), SmolVLA, GR00T-N1.5, VLA-Adapter-Pro, and VLASH. Each method is fine-tuned on DOM. DynamicVLA reaches **47.06%** average success across the nine DOM dimensions, while the strongest baseline in the table is **13.61%**. It also completes tasks faster, with **8.53 s** average time versus around 10 s for most baselines.

The interaction gains are especially large. In simulation, DynamicVLA reports **60.5%** closed-loop reactivity, **38.5%** dynamic adaptation, and **40.5%** long-horizon sequencing. Real-world interaction tasks show the same pattern: on tasks such as placing a moving coffee can, conical bottle, pickleball, or collecting repeated balls, DynamicVLA is far more reliable than \(\pi_{0.5}\), SmolVLA, and VLASH.

Perception remains harder. DynamicVLA improves visual understanding, spatial reasoning, and motion perception, but motion-conditioned targets are still difficult. The real-world perception section reports **51.9%** average success for DynamicVLA, while the best baselines remain near **11.7%**.

For generalization, DynamicVLA improves transfer to unseen appearances and unseen motion patterns. Disturbance robustness remains the weakest axis, which makes sense because random impacts and surface variation create state changes that are difficult to model from rigid-body pose streams alone.

## Ablations

The ablations make the paper's engineering choices clearer:

- Full DynamicVLA reaches **47.06%** success on DOM.
- Removing both Continuous Inference and LAAS drops success to **30.27%**.
- Keeping Continuous Inference but removing LAAS gives **39.72%**, showing that overlapping inference is useful but stale action handling still matters.
- Replacing FastViT with a transformer-style visual encoder drops success to **28.89%**.
- A 135M backbone is too small at **26.67%**, while a 1.7B backbone is too slow at **24.33%**. The 360M setting gives the best latency-capacity balance.

The appendix adds a useful detail about temporal context. A single current frame reaches **38.22%**, while the sparse pair \(\{o_{t-2},o_t\}\) reaches **47.06%**. Adding more frames gives little extra benefit. The takeaway is precise: dynamic manipulation needs motion cues, but extra visual history can quickly become redundant if it raises compute without improving timing.

## Strengths and Limitations

DynamicVLA is strong because it treats latency as part of the model design. The architecture, inference schedule, action streaming rule, and benchmark all target the same failure mode. The paper also avoids relying on human teleoperation for dynamic object data, which is important because human reaction time becomes a data-collection bottleneck.

The main limitation is scope. DOM focuses on short- to medium-horizon rigid-body dynamics. The real-world setup estimates object 6D pose and velocity, then uses that interface to collect demonstrations and evaluate policies. This is a strong start, but deformable objects, liquids, articulated objects, and long-horizon moving-object tasks need richer state representations and planning. The authors also note that the real-time architecture trades off multimodal understanding against responsiveness; larger models can reason better, but slow inference breaks dynamic control.

## Takeaway

DynamicVLA's practical message is that dynamic robot manipulation is not solved by adding a temporal input window alone. The execution semantics matter. A VLA must decide when to infer, how to overlap inference with execution, and which predicted actions are still temporally valid. CI and LAAS make that control loop explicit.

For future VLA systems, I would keep three ideas from this paper: use compact backbones when the task is timing-sensitive; treat action chunks as streamable predictions, with execution allowed to refresh them; and evaluate moving-object manipulation along interaction, perception, and generalization axes so static success rate does not hide timing failures.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**DynamicVLA** 研究的是静态操作里容易被掩盖的一个失败模式：VLA 还在推理时，物体已经移动了。静态 pick-and-place 对慢速 action chunking 比较宽容，因为推理期间场景变化不大。动态物体操作改变了约束。滚动的易拉罐、移动的小球、碰撞后改变轨迹的物体，都要求模型快速感知、预测时间变化，并且让动作执行和最新观测保持同步。

我的理解是，这篇论文的重心在 temporal control，而不在单纯扩大 VLA。DynamicVLA 使用紧凑的 0.4B 模型，用 **Continuous Inference** 重叠推理和执行，再用 **Latent-aware Action Streaming** 丢弃过时动作。另一个核心贡献是 **Dynamic Object Manipulation (DOM)** benchmark，因为它补上了静态机器人数据集中缺失的动态物体数据和评估面。

## 论文信息

论文标题是 **"DynamicVLA: A Vision-Language-Action Model for Dynamic Object Manipulation"**，作者为 **Haozhe Xie、Beichen Wen、Jiarui Zheng、Zhaoxi Chen、Fangzhou Hong、Haiwen Diao 和 Ziwei Liu**，来自 **S-Lab, Nanyang Technological University**。论文地址是 [arXiv:2601.22153](https://arxiv.org/abs/2601.22153)，项目主页是 [haozhexie.com/project/dynamic-vla](https://haozhexie.com/project/dynamic-vla)，官方代码发布在 [hzxie/DynamicVLA](https://github.com/hzxie/DynamicVLA)。

## 问题定义

大多数 VLA 系统使用 action chunking：模型观察场景，预测一小段动作序列，然后机器人执行这段序列。这样可以摊薄推理成本，但在移动物体场景里会产生两个时间问题。

第一是 **perception-execution gap**。模型从观测 \(O_t\) 开始推理，但动作 chunk 要经过延迟 \(m\) 才能产生。chunk 前几步动作原本对应旧状态，而真实世界已经推进到 \(O_{t+m}\)。第二是 **inter-chunk waiting**。很多系统只有在当前动作 chunk 执行完后才触发下一次推理，于是在 chunk 边界出现等待或陈旧动作。

DynamicVLA 把动态操作写成同步问题：

\[
A_t = M(O_t, L_t, P_t), \quad A_t = \{a_t,\ldots,a_{t+n}\}
\]

其中 \(O_t\) 是视觉观测时间窗，\(L_t\) 是语言指令，\(P_t\) 是本体状态。潜在物体状态 \(s_t\) 会在模型推理时继续演化。因此控制系统既需要足够快的模型，也需要知道哪些动作已经过时的执行策略。

## 模型设计

DynamicVLA 包含一个紧凑的 VLA backbone 和一个 diffusion-style action expert。语言 backbone 是 **SmolLM2-360M**，只保留前 16 层 transformer。视觉部分使用 **FastViT**，这是一个卷积视觉编码器，可以高效压缩空间结构，并避免多帧输入下 transformer visual encoder 的 token 数膨胀。

模型输入包括：

- 稀疏时间窗中的视觉观测，默认是 \(O_t=\{o_{t-2},o_t\}\)；
- 语言指令 tokens；
- 机器人本体状态，投影为 state token。

模型输出是 action chunk：

- horizon \(n=20\)；
- 每个 action 是 32 维向量，表示末端位姿和夹爪状态，未使用维度用 padding。

action expert 是 conditional Flow Matching Transformer。给定 VLM 特征 \(f_t\)、带噪动作 chunk \(A_t^\tau\) 和 diffusion timestep \(\tau\)，它学习 denoising vector field：

\[
\ell_\tau(\theta)=\mathbb{E}_{p(A_t|f_t),q(A_t^\tau|A_t)}
\left[\left\|E_\theta(A_t^\tau,O_t)-u(A_t^\tau|A_t)\right\|\right]
\]

这个架构围绕 latency 设计。模型足够小，可以高频推理；action expert 仍然输出有时间结构的 action chunk。

## Continuous Inference

Continuous Inference 改变的是下一次推理的触发时间。串行 chunking pipeline 会先预测 \(A_t\)，执行完整 chunk，再预测下一个 chunk。这会在 chunk 边界带来等待。

DynamicVLA 在上一次推理结束后立即开始下一次推理。机器人执行 \(A_t\) 中动作的同时，模型已经在预测 \(A_{t+m}\)。如果 action horizon \(n\) 大于推理延迟 \(m\)，新的 chunk 会在当前 chunk 执行完之前到达。执行不再被推理完成时间阻塞。

这个系统设计很简单，但对动态操作很关键。一个在静态场景中可以慢慢等待的 policy，在动态场景中可能会直接跟丢物体。

## Latent-Aware Action Streaming

Continuous Inference 会产生重叠的 action chunks。在某个执行时刻，旧 chunk \(A_t\) 和新 chunk \(A_{t+m}\) 可能都给出了候选动作。DynamicVLA 用 **Latent-aware Action Streaming (LAAS)** 处理这个冲突。

LAAS 有两条规则：

- 丢弃 \(A_t\) 中目标时间早于 \(t+m\) 的动作，因为这些动作对应的观测已经过时；
- 当旧 chunk 和新 chunk 重叠时，优先执行更新的 \(A_{t+m}\)。

这样 action chunking 就从固定承诺变成了流式控制接口。模型仍然利用 chunk prediction 的效率，但执行会绑定到推理延迟之后能获得的最新观测。

## DOM Benchmark

论文还提出 **Dynamic Object Manipulation (DOM)**，用于移动物体操作的数据集和 benchmark。DOM 包含 **200K synthetic episodes**、**2.8K scenes**、**206 objects**，以及无需遥操作采集的 **2K real-world episodes**。

数据采集流水线很重要。在仿真中，Isaac Sim 提供物体 6D pose 和 velocity。一个状态机 controller 生成四个阶段：approach object、grasp and lift、approach target and place、reset。在真实世界中，遥操作对快速移动物体太慢，所以作者构建了一个 real-world "simulator"：同步第三人称 RGB-D 相机估计物体 pose 和 velocity，再送入同一个状态机 controller。

DOM 评估三组能力：

- **Interaction：** closed-loop reactivity、dynamic adaptation、long-horizon sequencing。
- **Perception：** visual understanding、spatial reasoning、motion perception。
- **Generalization：** visual generalization、motion generalization、disturbance robustness。

这个 benchmark 的设计有用，因为它把动态操作拆成多个轴，而不是压成一个总成功率。

## 实验结果

仿真实验中，DynamicVLA 和 Diffusion Policy、OpenVLA-OFT、\(\pi_0\)、\(\pi_{0.5}\)、SmolVLA、GR00T-N1.5、VLA-Adapter-Pro、VLASH 对比。所有方法都在 DOM 上 fine-tune。DynamicVLA 在九个 DOM 维度上的平均成功率达到 **47.06%**，表中最强 baseline 是 **13.61%**。它也更快，平均完成时间是 **8.53 s**，多数 baseline 在 10 s 左右。

interaction 维度的提升尤其明显。仿真中，DynamicVLA 的 closed-loop reactivity 是 **60.5%**，dynamic adaptation 是 **38.5%**，long-horizon sequencing 是 **40.5%**。真实世界 interaction 任务也呈现同样趋势，例如放置移动的咖啡罐、锥形瓶、pickleball，或连续收集球时，DynamicVLA 比 \(\pi_{0.5}\)、SmolVLA 和 VLASH 更可靠。

perception 仍然更难。DynamicVLA 提升了 visual understanding、spatial reasoning 和 motion perception，但用运动属性指定目标仍然困难。真实世界 perception 部分报告 DynamicVLA 平均成功率为 **51.9%**，最强 baseline 约为 **11.7%**。

generalization 方面，DynamicVLA 提升了对未见外观和未见运动模式的迁移。disturbance robustness 仍然是最弱的轴，这也合理，因为随机碰撞和表面变化会产生很难只靠 rigid-body pose stream 建模的状态变化。

## 消融

消融实验让这篇论文的工程选择更清楚：

- 完整 DynamicVLA 在 DOM 上达到 **47.06%** 成功率。
- 同时去掉 Continuous Inference 和 LAAS 后降到 **30.27%**。
- 保留 Continuous Inference、去掉 LAAS 后是 **39.72%**，说明重叠推理有用，但仍需要处理过时动作。
- 把 FastViT 换成 transformer-style visual encoder 后降到 **28.89%**。
- 135M backbone 太小，成功率 **26.67%**；1.7B backbone 太慢，成功率 **24.33%**。360M 设置给出了最好的 latency-capacity 平衡。

附录里还有一个关于 temporal context 的细节。只用当前帧时成功率是 **38.22%**，稀疏帧对 \(\{o_{t-2},o_t\}\) 达到 **47.06%**。再加更多帧收益很小。这里的 takeaway 很明确：动态操作需要运动线索，但额外视觉历史如果提高计算量却不改善时序，就会很快变成冗余。

## 优势与限制

DynamicVLA 的优势在于把 latency 当成模型设计的一部分。架构、推理调度、动作流规则和 benchmark 都指向同一个失败模式。论文也避免依赖人类遥操作采集动态物体数据，这很关键，因为人类反应时间本身会成为数据采集瓶颈。

主要限制是范围。DOM 关注短到中等时间尺度的 rigid-body dynamics。真实世界设置估计物体 6D pose 和 velocity，再用这个接口采集示教和评估 policy。这是一个很好的起点，但 deformable objects、liquids、articulated objects 和长时程移动物体任务需要更丰富的状态表示和规划。作者也指出，实时架构需要在 multimodal understanding 和 responsiveness 之间权衡；大模型可能推理更强，但推理太慢会破坏动态控制。

## Takeaway

DynamicVLA 的实际启发是：动态机器人操作不能只靠增加 temporal input window 来解决。执行语义同样重要。VLA 必须决定什么时候推理、如何让推理和执行重叠，以及哪些预测动作在时间上仍然有效。CI 和 LAAS 把这个控制闭环显式化了。

对后续 VLA 系统，我会保留这篇论文的三个想法：时间敏感任务要使用紧凑 backbone；把 action chunk 看成可流式更新的预测，而不是固定执行承诺；评估移动物体操作时，应沿 interaction、perception 和 generalization 多个轴展开，而不是只看静态成功率。

</div>
