---
title: "[Paper Notes] DiT4DiT: Jointly Modeling Video Dynamics and Actions for Generalizable Robot Control"
date: 2026-03-14
permalink: /posts/2026/03/dit4dit-paper-notes/
tags:
  - Robotics
  - Vision-Language-Action Models
  - Video Diffusion
  - Humanoid Robotics
  - Policy Learning
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DiT4DiT** argues that robot policies should not rely only on representations inherited from static image-text pretraining. Instead, it uses a **video diffusion transformer** to model future dynamics and then conditions an **action diffusion transformer** on intermediate denoising features from that video model.

The central message is strong: **video generation can act as a much better scaling proxy for robot policy learning than semantic-only visual pretraining**. In the paper, this gives:

- **98.6%** average success on **LIBERO**
- **50.8%** average success on **RoboCasa-GR1**
- better sample efficiency than semantic-centric baselines by over **10x**
- faster convergence by up to **7x**

My short reading is that this paper is not just proposing another VLA variant. It is making a broader claim that **future dynamics modeling is a more useful foundation for control than static vision-language semantics alone**.

## Paper Info

- **Title**: DiT4DiT: Jointly Modeling Video Dynamics and Actions for Generalizable Robot Control
- **Authors**: Teli Ma, Jia Zheng, Zifan Wang, Chunli Jiang, Andy Cui, Junwei Liang, Shuo Yang
- **Affiliations**: Mondo Robotics, HKUST(GZ), HKUST
- **arXiv**: [2603.10448](https://arxiv.org/abs/2603.10448)
- **Project page**: [dit4dit.github.io](https://dit4dit.github.io/)
- **Paper type**: robot policy learning / video-action models / diffusion transformers

## 1. Problem Setting and Motivation

The paper starts from a clean criticism of current VLA systems:

- most robot policies inherit backbones pretrained on **static image-text data**
- physical dynamics must then be learned from relatively limited robot action data
- this creates a mismatch between what the representation is good at and what control actually needs

By contrast, modern video generation models are trained to predict **temporally coherent and physically plausible futures**. The authors argue that these models already internalize:

- motion priors
- temporal structure
- causal transitions
- implicit physical dynamics

So the main question becomes:

- can video generation be used as an effective proxy task for robot control?
- if yes, how should video features be connected to action generation?

## 2. Core Idea

DiT4DiT combines:

1. a **Video DiT** that predicts future visual dynamics
2. an **Action DiT** that predicts robot actions

The key design choice is that the action model is **not** conditioned on fully reconstructed future frames. Instead, it uses **intermediate hidden states from the video denoising process**.

That is a good idea for two reasons:

- it keeps the action policy tied to temporally grounded dynamics rather than only final pixels
- it avoids forcing control to depend on a fully rendered future prediction

Conceptually, the method turns video generation into a source of **actionable latent dynamics**, rather than treating it as an auxiliary output.

## 3. Method Breakdown

### 3.1 Video DiT as a dynamics backbone

The video side is initialized from **Cosmos-Predict2.5-2B**. Observations and future frames are encoded into latent space with a frozen VAE, and the Video DiT is trained with flow matching to predict future latent dynamics conditioned on the current observation and language goal.

The paper formulates the interpolation path as:

`x_tau = (1 - tau) x_0 + tau z`

and trains a velocity field to recover the target flow:

`v*(x_tau, tau) = z - x_0`

This is standard flow matching machinery, but the important part is how the hidden activations are reused downstream.

### 3.2 Action DiT conditioned on denoising features

The action model is adapted from **GR00T-N1** and acts as a separate flow-matching transformer.

Its inputs include:

- robot proprioceptive state
- noisy action trajectory
- learnable future tokens
- hidden features extracted from the video denoising process

Cross-attention fuses these signals so that action prediction is grounded in the visual dynamics encoded by the Video DiT.

### 3.3 Tri-timestep design

One of the most interesting design choices is the paper's **tri-timestep scheme**.

It uses three different timesteps:

- `tau_v` for video generation, sampled uniformly
- `tau_f` for feature extraction, fixed to stabilize visual conditioning
- `tau_a` for action generation, sampled from a Beta-based scheme to emphasize important control phases

This is a pragmatic solution to a real optimization problem: the model wants stochastic diffusion training for video generation, but stable conditioning for action learning.

### 3.4 Joint dual flow-matching objective

The model is trained end-to-end with a joint loss:

- one flow-matching term for video prediction
- one flow-matching term for action prediction

The action loss is conditioned on hidden features from the video branch, and the total objective balances both terms with a scalar coefficient.

I think this is the paper's most important technical contribution. It is not just "video features help actions"; it is that **video and action diffusion are optimized together so the latent space becomes useful for control**.

## 4. Why the Proxy Objective Matters

Before presenting the main system results, the paper runs a useful validation study: it compares three training paradigms as proxy objectives for policy learning:

- **grounding**
- **FLARE-style latent modeling**
- **video generation**

The reported conclusion is that **video generation is the strongest scaling proxy**. Relative to the semantic-centric alternatives, it:

- improves sample efficiency by more than **10x**
- speeds convergence by up to **7x**
- maintains better scaling behavior as data increases

That result is important beyond this one architecture. If it continues to hold, it suggests a different recipe for robot foundation models:

- use semantics for task understanding
- use video dynamics for control-relevant representation learning

## 5. Experimental Results

The evaluation spans simulation and real-world humanoid deployment.

### 5.1 LIBERO

On **LIBERO**, DiT4DiT reaches a new reported state of the art with **98.6%** average success.

Per-suite results from Table 1:

- **Spatial**: `98.4%`
- **Object**: `99.6%`
- **Goal**: `98.6%`
- **Long**: `97.6%`

The **LIBERO-Long** result is especially important because it supports the paper's main claim: modeling future dynamics helps with **extended-horizon manipulation**, not just short reactive behaviors.

The comparison against the parameter-matched baseline is also clean:

- **Qwen3DiT**: `96.6%`
- **DiT4DiT**: `98.6%`

So the gain is not just model size. It comes from the representation and training design.

### 5.2 RoboCasa-GR1

On the **24-task RoboCasa-GR1 tabletop benchmark**, DiT4DiT reaches **50.8%** average success.

This beats:

- **GR00T-N1.5**: `41.8%`
- **GR00T-N1.6**: `40.8%`
- **Qwen3DiT**: `36.2%`

The gap over Qwen3DiT is particularly notable: **14.6 absolute points**. That is a strong signal that the improvement is coming from video dynamics rather than simply swapping one large backbone for another.

The paper also notes that DiT4DiT achieves the best result on **16 of 24 tasks**, with especially clear gains on tasks requiring:

- precise spatial coordination
- articulated object interaction
- longer multi-stage execution

### 5.3 Real-world Unitree G1

The real-world evaluation uses a **Unitree G1** humanoid robot across seven household tasks, with only an egocentric camera as visual input.

The paper reports that DiT4DiT consistently outperforms both:

- **GR00T-N1.5**
- **Qwen3DiT**

A qualitative point that stands out is how badly the static-VLM-style baseline transfers: the paper states that Qwen3DiT nearly collapses in the real world and remains below `10%` on every task, including `0%` on several tasks.

That contrast supports the paper's broader thesis: **video-dynamics pretraining appears to transfer more naturally to physical interaction than static semantic pretraining alone**.

## 6. Generalization

The paper includes both simulated and real-world zero-shot generalization tests.

In simulation, they train on bottle-only tasks and evaluate on unseen objects such as:

- can
- cup
- milk
- wine

DiT4DiT substantially outperforms Qwen3DiT under this object substitution setting.

In the real world, they evaluate three kinds of shifts:

- **category changes**
- **object substitution**
- **quantity variation**

Examples include changing the kind of cups or vases, swapping the packed object, and changing the number of cups in the scene.

The high-level takeaway is that DiT4DiT is more robust to **surface-level appearance shifts** while preserving the underlying physical interaction pattern.

## 7. Ablations and Efficiency

The ablations are useful because they test exactly where the gains come from.

### 7.1 Best feature layer is not the last layer

The best action conditioning comes from a **middle-to-deep video transformer layer**, with **layer 18** reported as the best default.

This makes sense: early layers are too local, while the final denoising layers are too specialized for pixel reconstruction.

### 7.2 One denoising step is enough

A particularly interesting result is that **a single denoising step** works best for hidden-feature extraction. More denoising steps hurt performance.

The authors' interpretation is convincing: too much denoising overcommits the representation to a specific reconstructed future and loses more general action-relevant structure.

This is also practically important because it means the method does **not** need a full video generation rollout just to provide action conditioning.

### 7.3 Joint training shapes temporal structure

The t-SNE analysis suggests that **joint training** creates a smoother temporal progression in latent space than decoupled training, with the paper reporting roughly a **2x** improvement in silhouette score.

### 7.4 Efficiency tradeoff

Deployment efficiency from Table 3:

- **GR00T-N1.5**: `2.7B` trainable params, `13 Hz`
- **Qwen3DiT**: `2.3B` trainable params, `9 Hz`
- **DiT4DiT**: `2.2B` trainable params, `6 Hz`

So DiT4DiT is not the fastest system, but it is also **not winning by brute-force parameter count**. The tradeoff is computational cost versus a more dynamics-aware representation.

## 8. Strengths and Limitations

### Strengths

- Clear argument for why **video generation** is a stronger control prior than static vision-language pretraining.
- Strong benchmark story across **LIBERO**, **RoboCasa-GR1**, and **real-world G1**.
- Clean comparison against a parameter-matched baseline, which makes the representation claim more convincing.
- Practical ablations that explain where the gains come from.
- Good generalization story under object and appearance shifts.

### Limitations

- The system is still fairly heavy and runs at only **6 Hz** in deployment.
- It depends on large pretrained components such as Cosmos video models.
- The paper argues convincingly for tabletop and household manipulation, but it is less clear how well the approach scales to contact-rich tasks with more severe uncertainty.
- Real-world results are strong, but several claims are presented mainly through figures rather than detailed per-task tables, so some comparisons are easier to interpret qualitatively than numerically.

## 9. Takeaways

My main takeaway is:

**DiT4DiT makes a credible case that robot policy learning should treat video dynamics as a foundation model primitive, not just an auxiliary prediction task.**

More specifically, the paper suggests three broader lessons:

- **static semantics are not enough** for robust low-level control
- **intermediate generative features** may be more useful than fully reconstructed futures
- **joint optimization of world modeling and control** can produce better action representations than a loose multi-stage pipeline

If this line of work holds up, an important future direction is likely not "replace VLA with video generation," but rather:

**combine language for semantic grounding with video-world modeling for physical dynamics.**

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**DiT4DiT** 的核心观点是：机器人策略不应该只依赖从静态图文预训练里继承来的表征。它使用一个**视频扩散 Transformer** 来建模未来动态，再把该视频模型中的**中间去噪特征**提供给**动作扩散 Transformer**，用于动作预测。

这篇论文最重要的信息是：**视频生成比纯语义式视觉预训练更适合作为机器人策略学习的 scaling proxy**。论文中对应的结果包括：

- 在 **LIBERO** 上平均成功率达到 **98.6%**
- 在 **RoboCasa-GR1** 上平均成功率达到 **50.8%**
- 相比语义中心的代理任务，样本效率提升超过 **10x**
- 收敛速度最高提升 **7x**

我的简短判断是，这篇论文并不只是又提出了一个 VLA 变体，而是在更广义上主张：

**对机器人控制来说，未来动态建模比静态语义表征更接近真正需要的能力。**

## 论文信息

- **标题**: DiT4DiT: Jointly Modeling Video Dynamics and Actions for Generalizable Robot Control
- **作者**: Teli Ma, Jia Zheng, Zifan Wang, Chunli Jiang, Andy Cui, Junwei Liang, Shuo Yang
- **机构**: Mondo Robotics, HKUST(GZ), HKUST
- **arXiv**: [2603.10448](https://arxiv.org/abs/2603.10448)
- **项目主页**: [dit4dit.github.io](https://dit4dit.github.io/)
- **论文类型**: 机器人策略学习 / 视频-动作模型 / 扩散 Transformer

## 1. 问题设定与动机

论文首先对当前很多 VLA 系统提出了一个很准确的批评：

- 大多数机器人策略仍然建立在**静态图文预训练**的 backbone 上
- 物理动态和时序结构只能在相对有限的动作数据里再学一遍
- 这导致表征擅长的东西和控制真正需要的东西之间存在错位

相比之下，现代视频生成模型被训练去预测**时间连续且物理上合理的未来**，因此天然会编码：

- 运动先验
- 时序结构
- 因果转移
- 隐式物理动态

于是这篇论文真正想回答的是：

- 视频生成能不能成为机器人控制的有效代理任务？
- 如果可以，视频特征应该如何与动作生成结合？

## 2. 核心思路

DiT4DiT 由两个部分组成：

1. **Video DiT**：预测未来视觉动态
2. **Action DiT**：预测机器人动作

其中最关键的设计点是：动作模型**不是**依赖最终重建出的未来图像，而是使用**视频去噪过程中的中间隐藏状态**。

我认为这个设计很合理，原因有两点：

- 它让动作策略直接绑定在“动态过程”上，而不只是最终像素结果
- 它避免了控制完全依赖于一个完整渲染出的未来帧

换句话说，这篇论文不是把视频生成当作一个附带输出，而是把它变成了**可供控制使用的动态潜表示来源**。

## 3. 方法拆解

### 3.1 用 Video DiT 做动态 backbone

视频分支初始化自 **Cosmos-Predict2.5-2B**。当前观测和未来帧先经过冻结的 VAE 编码到 latent 空间，然后 Video DiT 通过 flow matching 学习在当前观测和语言条件下预测未来 latent 动态。

论文使用的插值路径为：

`x_tau = (1 - tau) x_0 + tau z`

目标速度场为：

`v*(x_tau, tau) = z - x_0`

这些是标准的 flow matching 形式，但真正重要的是这些隐藏特征如何被重用到动作预测里。

### 3.2 用去噪特征条件化 Action DiT

动作模型基于 **GR00T-N1** 改造，是一个独立的 flow-matching Transformer。

它的输入包括：

- 机器人本体状态
- 加噪动作轨迹
- 可学习的 future tokens
- 从视频去噪过程中提取出的隐藏特征

通过 cross-attention，动作分支把这些动态视觉信息和机器人状态融合起来，得到动作轨迹。

### 3.3 三时间步设计

论文里一个很值得注意的点是 **tri-timestep scheme**。

它使用三个不同的时间步：

- `tau_v`：用于视频生成，均匀采样
- `tau_f`：用于特征提取，固定以保证条件稳定
- `tau_a`：用于动作生成，采用 Beta 风格采样强调关键控制阶段

这是一个非常工程化但有效的设计。因为视频生成希望保留扩散训练的随机性，而动作学习又希望看到稳定一致的条件特征。

### 3.4 联合 dual flow-matching 目标

整个模型通过一个联合损失来训练：

- 一个视频预测的 flow-matching loss
- 一个动作预测的 flow-matching loss

动作损失依赖于从视频分支抽出来的隐藏特征，总损失再用一个权重系数平衡两部分。

我认为这是全文最重要的技术贡献。它不只是说“视频特征对动作有帮助”，而是在说：

**视频扩散和动作扩散被联合优化，因此 latent 空间本身就会变得更适合控制。**

## 4. 为什么代理任务很重要

在正式展示主结果之前，论文先做了一个很有价值的验证：比较三种不同的策略学习代理任务：

- **grounding**
- **FLARE-style latent modeling**
- **video generation**

结论非常明确：**video generation 是更强的 scaling proxy**。相较于语义中心的方法，它：

- 样本效率提升超过 **10x**
- 收敛速度提升最高 **7x**
- 在数据量增长时表现出更好的 scaling 行为

这部分意义很大，因为它不仅支持当前模型，也暗示了机器人基础模型的一种可能路线：

- 语义理解交给语言或 VLM
- 与控制相关的表征学习交给视频动态建模

## 5. 实验结果

实验覆盖仿真和真实世界的人形机器人部署。

### 5.1 LIBERO

在 **LIBERO** 上，DiT4DiT 报告了新的最好结果，平均成功率达到 **98.6%**。

Table 1 中各子集结果为：

- **Spatial**: `98.4%`
- **Object**: `99.6%`
- **Goal**: `98.6%`
- **Long**: `97.6%`

其中 **LIBERO-Long** 很关键，因为它正好支持论文的中心观点：未来动态建模不仅对短期反应有帮助，更能提升**长时程操作**能力。

和参数量接近的基线相比，结果也很干净：

- **Qwen3DiT**: `96.6%`
- **DiT4DiT**: `98.6%`

也就是说，性能提升并不是单纯来自更大的模型，而是来自表征方式和训练方式的改变。

### 5.2 RoboCasa-GR1

在 **24 个任务**组成的 **RoboCasa-GR1** 桌面操作基准上，DiT4DiT 达到了 **50.8%** 的平均成功率。

它超过了：

- **GR00T-N1.5**: `41.8%`
- **GR00T-N1.6**: `40.8%`
- **Qwen3DiT**: `36.2%`

其中与 Qwen3DiT 的差距尤其重要：足足高了 **14.6 个百分点**。这说明提升不是因为简单替换了另一个大 backbone，而确实来自视频动态表征本身。

论文还指出，DiT4DiT 在 **24 个任务中的 16 个**上取得了最佳结果，尤其擅长：

- 精细空间协调
- 铰接物体交互
- 更长、更复杂的多阶段执行

### 5.3 真实世界 Unitree G1

真实世界实验使用 **Unitree G1** 人形机器人，在 7 个家庭操作任务上进行测试，只使用第一视角相机作为视觉输入。

论文报告 DiT4DiT 一致优于：

- **GR00T-N1.5**
- **Qwen3DiT**

其中一个非常显著的现象是：静态 VLM 风格的基线在现实中几乎失效。论文指出 Qwen3DiT 在所有任务上都没有超过 `10%`，并且在多个任务上为 `0%`。

这个对比非常有力地支持了论文的核心观点：

**视频动态预训练比静态语义预训练更容易迁移到真实物理交互。**

## 6. 泛化能力

论文同时给出了仿真和真实世界中的 zero-shot 泛化实验。

在仿真里，训练只使用 bottle 相关任务，而测试时换成了新的物体，例如：

- can
- cup
- milk
- wine

在这种对象替换设置下，DiT4DiT 明显优于 Qwen3DiT。

在真实世界中，作者又测试了三类分布偏移：

- **类别变化**
- **物体替换**
- **数量变化**

例如更换杯子或花瓶种类、更换装箱物体、或者改变场景里杯子的数量。

总体结论是：DiT4DiT 对**外观层面的变化**更鲁棒，同时仍能保留对底层物理交互模式的理解。

## 7. 消融与效率

这些消融很有价值，因为它们直接检验了性能提升到底来自哪里。

### 7.1 最优特征层不是最后一层

最好的动作条件特征来自视频 Transformer 的**中后层**，论文默认选择的是 **第 18 层**。

这很合理：太早的层只包含局部纹理，最后几层又过度服务于像素重建。

### 7.2 一步去噪就够了

一个非常有意思的结论是：**只做一步去噪**就能得到最好的动作条件特征。继续增加去噪步数反而会降低性能。

作者的解释也很有说服力：过多去噪会让表征过度绑定到某个具体重建未来，从而损失更泛化的动作相关结构。

这点在工程上也很重要，因为它意味着系统**不需要先完整生成视频**，就可以为动作预测提供有效条件。

### 7.3 联合训练改善时间结构

论文中的 t-SNE 分析表明，**联合训练**比解耦训练更容易在 latent 空间中形成平滑的时间推进结构，silhouette score 大约提升了 **2 倍**。

### 7.4 效率权衡

Table 3 给出的部署效率如下：

- **GR00T-N1.5**: `2.7B` 参数，`13 Hz`
- **Qwen3DiT**: `2.3B` 参数，`9 Hz`
- **DiT4DiT**: `2.2B` 参数，`6 Hz`

因此，DiT4DiT 并不是最快的系统，但它也**不是靠更大参数量硬堆出来的结果**。代价主要来自视频生成 backbone 带来的额外计算。

## 8. 优点与局限

### 优点

- 对为什么 **视频生成** 更适合作为控制先验给出了清晰论证。
- 在 **LIBERO**、**RoboCasa-GR1** 和 **真实 G1** 上都给出了很强的结果。
- 与参数量接近的基线做了直接比较，使得“表征更强”这个论点更可信。
- 消融实验设计到位，能解释性能来源。
- 在对象和外观变化下表现出较强泛化能力。

### 局限

- 系统仍然较重，真实部署频率只有 **6 Hz**。
- 依赖 Cosmos 等大型预训练视频模型。
- 论文在桌面与家庭操作上很强，但对更复杂、更高不确定性的接触任务能否继续成立，还不够明确。
- 一些真实世界对比主要通过图展示，而不是详细表格，因此部分结论更偏定性而不是完全定量。

## 9. 总结

我对这篇论文的主要结论是：

**DiT4DiT 很有说服力地说明了，机器人策略学习应该把“视频动态”视为一种基础模型原语，而不只是附带的辅助任务。**

更具体地说，它给出了三个值得记住的启发：

- **静态语义并不足以支撑鲁棒的低层控制**
- **中间生成特征**可能比最终重建未来更适合动作预测
- **世界建模与控制的联合优化**，可能比松散的多阶段管线更有效

如果这条路线继续发展下去，一个很自然的下一步不是“用视频生成替代 VLA”，而是：

**用语言做语义落地，用视频世界模型做物理动态建模。**

</div>
