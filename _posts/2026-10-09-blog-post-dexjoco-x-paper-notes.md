---
title: "[Paper Notes] DexJoCo-X: Benchmarking Action Representations for Multi-Hand Dexterous Manipulation"
date: 2026-10-09
permalink: /posts/2026/10/dexjoco-x-paper-notes/
tags:
  - Dexterous Manipulation
  - Cross-Embodiment Learning
  - Action Representation
  - Benchmark
  - Vision-Language-Action
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DexJoCo-X** asks how to represent actions when one manipulation policy controls several dexterous hands. It builds a matched simulation benchmark with **seven hands, six tasks, and 2,100 accepted demonstrations**, then compares native coordinates, function-aligned slots (FAAS), and learned cross-hand latents (DexLatent) within Being-H0.5.

The central result is a task-dependent tradeoff: **Native reaches 47.0% overall success, FAAS 47.7%, and DexLatent 33.1%**. Native leads on single-arm tasks; FAAS leads on bimanual tasks. This makes a useful case for evaluating an action representation together with its pretrained policy and execution decoder. It provides no evidence yet for transfer to an unseen hand.

## Paper and source version

**DexJoCo-X: Benchmarking Action Representations for Multi-Hand Dexterous Manipulation** is by **Xiangwei Jiang, Yao Mu, Lixin Duan, and Wen Li**, affiliated with the University of Electronic Science and Technology of China and Shanghai Jiao Tong University. These notes follow the October 2, 2026 preprint, [arXiv:2610.03278v1](https://arxiv.org/abs/2610.03278v1), and its [eight-page PDF](https://arxiv.org/pdf/2610.03278v1). The authors list a [project website](https://darenrenjian.github.io/DexJoCo-X-website/). All experimental numbers below are author-reported.

The benchmark builds on [DexJoCo, covered in an earlier post](/posts/2026/06/dexjoco-paper-notes/). Its focus shifts to comparing representations across heterogeneous hands under shared tasks, demonstrations, and execution conditions. Being-H0.5, Ego-Pi, and the representation principles are adopted from prior work; the contribution here is the benchmark, collection toolkit, dataset, and controlled comparison.

## 1. What is shared across hands?

The seven embodiments are **XHand, Inspire, Wuji, LEAP, Sharpa Wave, LinkerHand, and Allegro**. They retain their own kinematics, actuator limits, joint ordering, and mechanical coupling. The single-arm tasks are bucket lifting, nail hammering, and Hanoi; the bimanual tasks are microwave cooking, iPad unlocking, and photography. Every hand uses the same task objects, initial-scene protocol, and physical success criteria.

A common learning interface synchronizes RGB images, instructions, proprioception, and commands at **20 Hz**. Arm actions use world-frame translation and rotation-vector increments. Native state and execution-command layouts are padded to $2\times31$ and $2\times28$, with masks for valid coordinates and active arms. These are native interface dimensions; policy representations can use different layouts. The system supports up to five $256\times256$ camera streams, with a fixed view subset within a backbone comparison.

For hand $h$, let $u_h$ denote its valid native hand command. An encoder produces training targets and a decoder converts predictions back to executable commands:

$$
z=e_h(u_h),\qquad \hat u_h=d_h(\hat z).
$$

This separation is the experimental foundation: observations, arm commands, and execution remain shared while the hand-action encoding changes. A common tensor shape gives a policy a consistent interface, but learning still has to account for the meaning of each hand's coordinates.

## 2. The three action representations

### Native: preserve each hand's coordinate order

Native inserts the original command vector into a shared padded layout:

$$
z=P_hu_h.
$$

The decoder selects valid entries, and a mask excludes padding. It is a simple baseline that preserves the original control variables. The policy must learn how those variables relate across embodiments because the same position in the vector need not express the same functional role.

### FAAS: assign coordinates to functional slots

FAAS uses a **32-slot hand layout**, separate from arm commands, following the functional-slot principle of UniDex. A hand-specific adapter assigns native coordinate $i$ to slot $\sigma_h(i)$:

$$
z_{\sigma_h(i)}=s_{h,i}u_{h,i}+b_{h,i}.
$$

The assignment aligns functional roles; $s_{h,i}$ and $b_{h,i}$ account for direction and offset. Execution applies the corresponding inverse mapping to active coordinates, with dependent joints expanded according to the native hand model. The alignment retains hand-specific command values and coupling constraints.

The practical attraction is a transparent, structured correspondence between the policy output and the hardware. The remaining question is whether this correspondence helps the tasks and pretrained backbone being used. The experiments show that its benefit changes between single-arm and bimanual control.

### DexLatent: learn a codec for each hand

DexLatent follows the hand-specific encoder/decoder formulation of XL-VLA. Each encoder $E_h$ maps native commands into a shared latent, while $D_h$ maps policy predictions back to that hand. Codec fitting uses

$$
\mathcal L_{\mathrm{codec}}
=\lambda_r\mathcal L_{\mathrm{rec}}
+\lambda_g\mathcal L_{\mathrm{geom}}
+\lambda_p\mathcal L_{\mathrm{prior}}.
$$

The terms measure native-command reconstruction, cross-hand fingertip geometry through differentiable forward kinematics, and latent-distribution regularization. Geometry is compared over corresponding available digits. The codec is **frozen during policy training**, so control performance depends on both the policy's latent predictions and the fitted decoder.

My interpretation is that this introduces another place where geometric similarity and task-relevant contact precision can diverge. The paper reports lower success for DexLatent, but supplies no codec-loss ablation or decoder-error analysis that identifies the cause. Its results therefore constrain this implementation and training setting; they do not establish that learned action latents are generally inferior.

## 3. Data collection preserves the comparison

Rokoko gloves and Vive trackers provide finger and wrist motion. Redesigned mappings for all seven hands produce native demonstrations, respecting digit correspondence, motion direction, actuator limits, and coupling. Representation encoding happens afterward, so Native, FAAS, and DexLatent reuse the same trajectories.

Reviewed source demonstrations are expanded into randomized scenes using task-specific recipes: scene-relative motions, stage transitions, and hand-specific parameters. Development trials refine these recipes before they are frozen for batch generation. Figure 4 describes GPT-6 assistance in task-rule development; the batch pipeline then executes frozen rules with pose feedback and timing- or state-based transitions.

A trajectory enters the accepted dataset only when all four checks pass:

$$
A(\tau)=S(\tau)\land Q(\tau)\land R(\tau)\land D(\tau).
$$

Here $S$ checks physical task success, $Q$ motion quality, $R$ replay of saved actions, and $D$ data validity, including images, masks, timestamps, and metadata. Failed attempts remain in the audit record. The resulting training set has **50 accepted trajectories per hand–task pair**, totaling $7\times6\times50=2{,}100$. Balanced trajectory counts do not imply balanced frame counts: sampling is uniform over applicable frames, so longer trajectories contribute more training frames.

## 4. Preserving the action head helps, but joint training remains harder

The authors first replace the pretrained 32-dimensional action projection of $\pi_{0.5}$ with an 80-dimensional bimanual output, reserving 40 dimensions per side. That adaptation produces near-zero success in their experiment.

Following Ego-Pi, they then preserve the 32-dimensional projection and interleave commands across tokens:

$$
L_t,\ R_t,\ L_{t+1},\ R_{t+1},\ldots
$$

Each arm–hand command contains at most 28 valid values and fits in one token. Fifty tokens represent 25 bimanual control steps, with left/right commands paired by time for execution. This supports seven separately trained policies, each covering one hand's six tasks. Mixing all seven hands into one Ego-Pi policy performs substantially below the per-hand models, although the paper does not tabulate that joint model's score.

Being-H0.5 supplies a different starting point: cross-embodiment pretraining involving human MANO motion and 30 robot embodiments, plus a Mixture-of-Flow architecture with embodiment-aware experts. DexJoCo-X fine-tunes one joint seven-hand policy for each representation. The three Being-H0.5 runs share demonstrations, views, arm commands, sampling, and optimization budgets, making this the strongest controlled comparison in the paper.

## 5. Results and what they support

Table I reports the following success rates. Each single-arm or bimanual average weights 21 hand–task pairs equally.

| Policy and training scope | Representation | Single-arm | Bimanual | Overall |
|---|---|---:|---:|---:|
| $\pi_{0.5}$ + Ego-Pi, seven per-hand policies | Native | 31.5% | 23.2% | — |
| Being-H0.5, one joint policy | Native | **57.2%** | 36.7% | 47.0% |
| Being-H0.5, one joint policy | FAAS | 54.3% | **41.0%** | **47.7%** |
| Being-H0.5, one joint policy | DexLatent | 40.7% | 25.6% | 33.1% |

Evaluation uses three independent sets of 50 resets per hand–task pair: **150 rollouts per cell and 6,300 per full configuration**. Reset sets are shared across methods and disjoint from demonstration-generation seeds. Overall success is the macro-average of the 42 cells. These repeated evaluations are not reported as independent training-seed replications.

FAAS gains **4.3 percentage points** over Native on bimanual tasks and loses **2.9 points** on single-arm tasks. The overall advantage is only **0.7 points**, and the paper provides no significance test or uncertainty interval for that difference. The useful finding is the task-group tradeoff. Native remains a strong baseline inside a model capable of joint multi-hand learning.

Cross-backbone comparisons need a separate reading. Table II uses 300 demonstrations, 5,000 updates, and batch size 128 for each Ego-Pi policy; Being-H0.5 uses 2,100 demonstrations, 120,000 updates, and batch size 8. Learning rates, warmup, prediction horizons, pretraining, and architecture also differ. These are comparisons between complete training systems. They do not isolate the causal contribution of embodiment-aware experts or pretraining. Update counts alone also do not measure relative compute because batch sizes and model costs differ.

## 6. Research takeaways and limits

The benchmark's strength is a reusable route from native demonstrations to representation-specific training and a common physical execution interface. It makes it practical to ask whether a proposed alignment improves closed-loop task completion while holding the downstream backbone and data fixed.

The reported policies train on **all seven evaluated hands**. Physical-robot evaluation and held-out-hand zero-shot/one-shot protocols are future work. Six simulated tasks also leave substantial room for broader contact patterns and task distributions. A shared policy with 47.7% mean success still has substantial failure rates and sharply uneven hand–task performance.

For my own experiments, I would start with Native and explicit masks, compare a functional-slot adapter under the same backbone and training budget, and inspect single-arm and bimanual results separately. For a learned codec, I would additionally measure reconstruction and contact-sensitive decoding errors alongside rollout success. Those are proposed follow-up diagnostics. DexJoCo-X establishes the comparison framework and the observed tradeoff; explaining exactly why a representation succeeds or fails requires further ablations.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**DexJoCo-X** 研究一个策略控制多种灵巧手时，动作应该如何表示。它构建了包含 **7 种手、6 个任务、2,100 条通过验收的示范**的统一仿真基准，并在 Being-H0.5 内比较原生坐标 Native、功能对齐槽位 FAAS，以及跨手潜变量表示 DexLatent。

核心结果体现了任务相关的取舍：**Native 总体成功率为 47.0%，FAAS 为 47.7%，DexLatent 为 33.1%**。Native 在单臂任务上更好，FAAS 在双手任务上更好。这说明动作表示需要结合预训练策略和执行解码器一起评估。当前实验尚未验证向未见过的手型迁移。

## 论文与来源版本

论文 **DexJoCo-X: Benchmarking Action Representations for Multi-Hand Dexterous Manipulation** 的作者是 **Xiangwei Jiang、Yao Mu、Lixin Duan 和 Wen Li**，来自电子科技大学和上海交通大学。本文依据 2026 年 10 月 2 日发布的预印本 [arXiv:2610.03278v1](https://arxiv.org/abs/2610.03278v1) 及其 [8 页 PDF](https://arxiv.org/pdf/2610.03278v1)。作者另列有[项目网站](https://darenrenjian.github.io/DexJoCo-X-website/)。下文实验数值均来自论文报告。

它建立在[此前笔记介绍的 DexJoCo](/posts/2026/06/dexjoco-paper-notes/) 之上，将重点转向共享任务、示范和执行条件下的异构手型动作表示比较。Being-H0.5、Ego-Pi 和几类表示的基本思想来自已有工作；本篇的贡献集中在基准、采集工具、数据集与受控比较。

## 1. 不同手型之间，哪些部分保持一致？

7 种手分别是 **XHand、Inspire、Wuji、LEAP、Sharpa Wave、LinkerHand 和 Allegro**，各自保留原生运动学、驱动器限制、关节顺序和机械耦合。单臂任务包括提桶、敲钉子和汉诺塔；双手任务包括微波炉烹饪、解锁 iPad 和拍照。不同手型使用相同的任务物体、初始场景协议和物理成功判据。

公共学习接口以 **20 Hz** 同步 RGB 图像、任务指令、本体状态和控制命令。机械臂动作采用世界坐标系下的平移增量与旋转向量增量。原生状态和执行命令分别填充到 $2\times31$ 与 $2\times28$，并用掩码标记有效坐标和启用的机械臂。这些是原生接口维度；策略端的编码表示可以有不同布局。系统最多支持 5 路 $256\times256$ 图像，同一骨干模型的比较使用固定视角子集。

对于手型 $h$，以 $u_h$ 表示有效的原生手部命令。编码器产生训练目标，解码器将策略预测转换回可执行命令：

$$
z=e_h(u_h),\qquad \hat u_h=d_h(\hat z).
$$

这种分离构成了实验的基础：观测、机械臂命令与执行方式保持一致，只改变手部动作的编码。统一张量形状提供了共同接口，模型仍然需要处理不同手型坐标含义的差异。

## 2. 三种动作表示

### Native：保留每种手的原生坐标顺序

Native 将原始命令插入统一的填充布局：

$$
z=P_hu_h.
$$

解码器选取有效分量，掩码排除填充项。这是保留原始控制变量的简单基线。由于向量中同一个位置在不同手型上可能具有不同功能，模型需要从数据中学习这些变量之间的关系。

### FAAS：按照功能分配动作槽位

FAAS 沿用 UniDex 的功能槽位思想，为手部命令设置 **32 个槽位**，与机械臂命令分开编码。每种手的适配器把原生坐标 $i$ 分配到槽位 $\sigma_h(i)$：

$$
z_{\sigma_h(i)}=s_{h,i}u_{h,i}+b_{h,i}.
$$

槽位分配负责功能对齐，$s_{h,i}$ 和 $b_{h,i}$ 处理方向与偏移。执行时对有效坐标使用对应的逆映射，依赖关节按照原生手模型展开。功能对齐仍然保留每种手自己的命令值和耦合约束。

它的工程吸引力在于：策略输出和硬件之间有清晰、可检查的结构化对应关系。接下来需要验证这种对应是否适合当前任务和预训练骨干。实验表明，其收益会随单臂、双手控制设置而变化。

### DexLatent：为每种手学习编码器与解码器

DexLatent 采用 XL-VLA 的手型专属 codec 形式。编码器 $E_h$ 将原生命令映射到共享潜空间，解码器 $D_h$ 再将策略预测还原为该手的命令。codec 的拟合目标为：

$$
\mathcal L_{\mathrm{codec}}
=\lambda_r\mathcal L_{\mathrm{rec}}
+\lambda_g\mathcal L_{\mathrm{geom}}
+\lambda_p\mathcal L_{\mathrm{prior}}.
$$

三项分别对应原生命令重建、通过可微正运动学计算的跨手指尖几何对齐，以及潜变量分布正则化。几何比较只使用能够对应且实际存在的手指。codec 在**策略训练期间保持冻结**，因此控制结果同时依赖策略预测的潜变量和已经拟合好的解码器。

我的理解是，这额外引入了一个需要检查的环节：几何相似性是否能保留任务所需的接触精度。论文报告 DexLatent 成功率较低，但没有通过 codec 损失消融或解码误差分析定位原因。因此，结果约束的是当前实现和训练设置，不能推广成“学习式动作潜空间普遍较差”。

## 3. 数据采集如何保证表示之间可比较？

Rokoko 手套与 Vive 追踪器分别提供手指和腕部运动。作者为全部 7 种手重新设计映射，使原生示范满足手指对应、运动方向、驱动器限制和关节耦合。动作表示编码发生在采集之后，Native、FAAS 与 DexLatent 因而使用相同轨迹。

经过检查的源示范通过任务专属规则扩展到随机化场景，规则包含相对场景的运动、阶段切换和手型参数。开发阶段先进行小规模试验，再冻结规则用于批量生成。图 4 提到 GPT-6 辅助任务规则开发；批量采集阶段使用冻结规则，结合位姿反馈，以及时间或状态触发的阶段切换。

一条轨迹必须同时通过四项检查，才能进入验收后的数据集：

$$
A(\tau)=S(\tau)\land Q(\tau)\land R(\tau)\land D(\tau).
$$

其中 $S$ 检查物理任务成功，$Q$ 检查运动质量，$R$ 检查保存动作的回放，$D$ 检查图像、掩码、时间戳和元数据等数据有效性。失败尝试保留在审计记录中。最终每个“手型—任务”组合有 **50 条通过验收的轨迹**，共 $7\times6\times50=2{,}100$ 条。轨迹数量均衡不等于训练帧数量均衡：采样在适用帧上均匀进行，较长轨迹会贡献更多训练帧。

## 4. 保留动作头有帮助，多手联合训练仍然更难

作者首先尝试把 $\pi_{0.5}$ 预训练的 32 维动作投影替换为 80 维双手输出，每侧预留 40 维。该适配在实验中得到接近零的成功率。

随后采用 Ego-Pi 的方式，保留 32 维投影，在输出 token 序列中交错预测左右命令：

$$
L_t,\ R_t,\ L_{t+1},\ R_{t+1},\ldots
$$

每侧机械臂与手的命令最多有 28 个有效值，可以放进一个 token。50 个 token 对应 25 个双手控制步，执行时按时间配对左右命令。这种方式支持分别训练 7 个策略，每个覆盖一种手的 6 个任务。将全部手型混合训练成一个 Ego-Pi 策略后，表现明显低于逐手模型，不过论文没有列出该联合模型的具体分数。

Being-H0.5 提供了另一种起点：其跨具身预训练涉及人类 MANO 动作和 30 种机器人具身，并采用包含具身感知专家的 Mixture-of-Flow 架构。DexJoCo-X 为每种表示分别微调一个覆盖 7 种手的联合策略。三个 Being-H0.5 实验共享示范、视角、机械臂命令、采样方式和优化预算，因此这是论文中控制条件最充分的一组比较。

## 5. 结果支持什么结论？

表 I 报告了以下成功率。单臂和双手两组平均值，各自对 21 个“手型—任务”组合等权平均。

| 策略与训练范围 | 表示 | 单臂 | 双手 | 总体 |
|---|---|---:|---:|---:|
| $\pi_{0.5}$ + Ego-Pi，7 个逐手策略 | Native | 31.5% | 23.2% | — |
| Being-H0.5，一个联合策略 | Native | **57.2%** | 36.7% | 47.0% |
| Being-H0.5，一个联合策略 | FAAS | 54.3% | **41.0%** | **47.7%** |
| Being-H0.5，一个联合策略 | DexLatent | 40.7% | 25.6% | 33.1% |

每个“手型—任务”组合独立评估 3 轮，每轮 50 个重置场景，即**每格 150 次 rollout，每个完整配置 6,300 次**。不同方法共享评估重置集合，且这些随机种子与示范生成种子不重叠。总体结果是 42 格的宏平均。这里的重复评估不能当作独立训练随机种子的重复实验。

FAAS 在双手任务上比 Native 高 **4.3 个百分点**，在单臂任务上低 **2.9 个百分点**，总体只高 **0.7 个百分点**。论文没有为这一差异提供显著性检验或不确定性区间。更有价值的发现是不同任务组之间的取舍；在能够进行多手联合学习的模型里，Native 仍然是很强的基线。

跨骨干模型的结果需要另行解读。表 II 中，每个 Ego-Pi 策略使用 300 条示范、5,000 次更新和 128 的 batch size；Being-H0.5 使用 2,100 条示范、120,000 次更新和 8 的 batch size。学习率、warmup、预测时域、预训练和架构也不同。这些结果比较的是完整训练系统，无法单独确定具身感知专家或预训练带来的因果贡献。更新次数本身也不能代表相对算力开销，因为 batch size 与模型成本不同。

## 6. 研究启发与边界

这个基准的价值，是打通了从原生示范、不同动作编码，到统一物理执行接口的可复用路径。研究者可以固定下游骨干与数据，检查一种对齐方式是否真正改善闭环任务完成率。

当前策略在**全部 7 种被评估的手型上都接受过训练**。真实机器人评估，以及保留未见手型的 zero-shot、one-shot 协议，属于后续工作。6 个仿真任务也只覆盖了有限的接触模式和任务分布。47.7% 的平均成功率意味着共享策略仍有大量失败，而且不同手型与任务组合的表现差异很大。

如果据此设计自己的实验，我会先建立带显式掩码的 Native 基线，在相同骨干和训练预算下比较功能槽位适配器，并分别检查单臂与双手结果。对于学习式 codec，我还会结合 rollout 成功率，测量重建误差与影响接触的解码误差。这些是后续诊断建议。DexJoCo-X 给出了比较框架和观察到的取舍；解释一种表示为什么成功或失败，还需要进一步消融。

</div>
