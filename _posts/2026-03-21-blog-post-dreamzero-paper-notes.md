---
title: "[Paper Notes] DreamZero: World Action Models are Zero-shot Policies"
date: 2026-03-21
permalink: /posts/2026/03/dreamzero-paper-notes/
tags:
  - Robotics
  - World Models
  - Video Diffusion
  - Robot Foundation Models
  - Cross-Embodiment
  - Zero-shot Generalization
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**DreamZero** is a 14B **World Action Model (WAM)** built on a pre-trained video diffusion backbone (Wan2.1-I2V-14B). It jointly predicts future video frames and robot actions from image observations and language instructions. Key results:

- **2x+ improvement** in zero-shot generalization to unseen tasks/environments over SOTA VLAs (GR00T N1.6, pi0.5)
- Learns effectively from **diverse, non-repetitive** teleoperation data (~500 hrs on AgiBot G1)
- **Cross-embodiment transfer**: 42%+ relative improvement on unseen tasks from just 10-20 min of video-only demos from other robots or humans
- **Few-shot embodiment adaptation**: transfers to a new robot with only 30 minutes of play data
- **Real-time control at 7Hz** via a 38x inference speedup through system, implementation, and model-level optimizations

## Paper Info

- **Title**: World Action Models are Zero-shot Policies
- **Authors**: Seonghyeon Ye, Yunhao Ge, Kaiyuan Zheng, Shenyuan Gao, Sihyun Yu, George Kurian, et al.
- **Affiliation**: NVIDIA
- **Date**: 2026-02-19
- **arXiv**: [2602.15922](https://arxiv.org/abs/2602.15922)
- **Project page**: [dreamzero0.github.io](https://dreamzero0.github.io)

## 1. Motivation

Vision-Language-Action models (VLAs) inherit semantic priors from VLMs — they know *what* to do — but lack spatiotemporal priors for *how* to execute novel physical motions. A VLA can do "move coke can to Taylor Swift" (if it knows the move skill) but fails at "untie the shoelace" if that skill was never in the training data. VLAs are also pre-trained on **static** image-text data, which limits their understanding of physical dynamics.

The core hypothesis: **video diffusion models** encode rich spatiotemporal priors about how the physical world evolves. By building a robot policy on top of a video model — jointly predicting video and actions — we can achieve much better generalization to novel tasks and environments.

## 2. What is a World Action Model (WAM)?

A WAM has the input-output structure:

> **[Current Image + Language Instruction]** → **[Future Video + Robot Actions]**

Unlike VLAs that directly map observations to actions, WAMs first "imagine" what successful execution looks like (video), then extract actions aligned with that imagined future. The key insight is that joint video-action prediction decomposes into:

\\(\pi(o_{l:l+H}, a_{l:l+H} | o_{0:l}, c, q_l) = \underbrace{\pi(o_{l:l+H} | o_{0:l}, c, q_l)}_{\text{video prediction}} \cdot \underbrace{\pi(a_{l:l+H} | o_{0:l+H}, q_l)}_{\text{inverse dynamics}}\\)

But instead of using two separate models, DreamZero trains a single end-to-end model with a joint denoising objective.

## 3. Architecture

DreamZero is built on **Wan2.1-I2V-14B**, a 14B image-to-video diffusion transformer:

- **Inputs**: visual context (VAE-encoded), language instruction (text encoder), proprioceptive state (state encoder)
- **Backbone**: autoregressive DiT with flow matching
- **Outputs**: future video frames (VAE decoder) + continuous actions (action decoder)
- **Training objective**: flow matching with teacher-forcing chunk-wise video denoising

### Why autoregressive (not bidirectional)?

| Property | Autoregressive | Bidirectional |
|---|---|---|
| Inference speed | Fast (KV caching) | Slower (fixed-length) |
| Frame rate | Preserves native FPS | Requires subsampling → misalignment |
| Motion smoothness | Smoother (temporal backprop) | Similar task progress but jerkier |
| Error accumulation | Mitigated via ground-truth observation replacement in KV cache | N/A |

### Closed-loop inference

A critical advantage of WAMs in closed-loop control: after executing each action chunk, **ground-truth observations replace generated frames in the KV cache**. This eliminates the compounding error problem inherent to autoregressive video generation.

## 4. Real-time Execution (38x Speedup)

Naive inference: ~5.7s per action chunk on a single GPU. Target: <200ms for smooth 7Hz control.

| Optimization Level | Technique | Cumulative Speedup (GB200) |
|---|---|---|
| **System** | CFG parallelism (2 GPUs) | 1.8x |
| **System** | DiT caching (reuse attention) | 5.4x |
| **Implementation** | Torch compile + CUDA graphs | 10.9x |
| **Implementation** | Kernel & scheduler optimizations | 14.8x |
| **Implementation** | NVFP4 quantization | 16.6x |
| **Model** | **DreamZero-Flash** (1-step denoising) | **38x** |

### DreamZero-Flash

Key insight: at inference with very few denoising steps, the video tokens remain noisy while we need clean actions. Standard training couples video and action noise levels → train-test mismatch.

**Solution**: decouple noise schedules. Bias video timesteps toward high-noise states via Beta(7, 1), while keeping action timesteps uniform. This trains the model to predict clean actions from noisy visual context, directly matching the single-step inference regime.

Result: **1-step inference at 150ms** with only ~9% performance drop vs. 4-step baseline.

## 5. Key Experimental Results

### Data and setup

- **AgiBot G1**: ~500 hrs diverse teleoperation across 22 environments, ~7.2K episodes, ~42 subtasks/episode
- **DROID-Franka**: public heterogeneous dataset
- **Baselines**: GR00T N1.6, pi0.5 (both from-scratch and pretrained variants)

### Q1: Learning from diverse data (seen tasks, unseen environments)

| Model | Initialization | AgiBot Avg Task Progress |
|---|---|---|
| GR00T N1.6 | From scratch | 0.6% |
| GR00T N1.6 | Pretrained | 8.4% |
| pi0.5 | From scratch | 0% |
| pi0.5 | Pretrained | 27.4% |
| **DreamZero** | **From scratch** | **62.2%** |

VLAs trained from scratch achieve near-zero on diverse data. DreamZero achieves **2x+** over the best pretrained VLA.

### Q2: Zero-shot generalization to unseen tasks

On 10 tasks entirely absent from training (untying shoelaces, ironing, painting, shaking hands, etc.):

- **DreamZero**: 39.5% average task progress
- Best pretrained VLA: 16.3%
- From-scratch VLAs: <1%

Qualitatively: VLAs overfit to dominant training behaviors (e.g., always try pick-and-place). DreamZero performs visual planning and executes novel motions.

### Q3: Post-training

After fine-tuning on task-specific data (shirt folding, fruit packing, table bussing):
- DreamZero: **90.5% average task progress**
- Best pretrained VLA: 53.3%
- Environment generalization is **retained** after post-training.

### Q4: Cross-embodiment transfer

Using only 10-20 min of **video-only** data (no actions) from another robot (YAM) or humans:

| Method | Unseen Task Progress |
|---|---|
| DreamZero (baseline) | 38.3% |
| + Human-to-robot transfer | 54.3% (+42% relative) |
| + Robot-to-robot transfer | 55.4% (+45% relative) |

### Q5: Few-shot embodiment adaptation

Transfer to a new robot (YAM) with only **30 minutes of play data**: retains strong language following and zero-shot generalization to novel objects.

## 6. Ablations

| Factor | Finding |
|---|---|
| **Data diversity** | Diverse data >> repetitive data (50% vs 33%) — robust IDM needs diverse state-action correspondences |
| **Model scale** | 14B >> 5B (50% vs 21%) — smaller models hallucinate visually → erroneous actions. VLAs at any size (5B-32B) still fail on diverse data (0%) |
| **Architecture** | AR ≈ BD in task progress, but AR produces smoother motions and is 3-4x faster |

## 7. Strengths

- **Strong generalization story**: 2x+ over SOTA VLAs on unseen tasks/environments, even without cross-embodiment pretraining
- **Data-efficient cross-embodiment**: 10-20 min of video-only data yields 42%+ relative improvement
- **Practical real-time system**: 38x speedup to reach 7Hz closed-loop control
- **Interesting failure mode**: most failures come from video prediction errors, not action extraction — improving the video backbone directly improves the policy
- **Clean scaling signal**: larger video models → better video quality → better actions (unlike VLAs where scaling doesn't help with diverse data)

## 8. Limitations

- **Behavior cloning paradigm**: WAMs are still fundamentally instruction → action, without the ability to do RL or counterfactual reasoning (as noted in the [Tale of Two World Models](https://x.com/Majumdar_Ani/status/2033910830048125090) discussion)
- **High-precision tasks**: sub-centimeter tasks (key insertion, fine assembly) remain challenging
- **Long-horizon tasks**: limited by action chunk horizon and context window
- **Single-embodiment pretraining**: multi-embodiment joint pretraining not yet explored
- **No scaling laws**: the relationship between model size, data size, and compute for WAMs is still unknown

## 9. Takeaways

1. **Video models are powerful priors for robot policies** — they encode spatiotemporal knowledge that VLMs fundamentally lack
2. **Data diversity > data repetition** for WAMs — the video prediction is already learned from pretraining; the key is learning a robust inverse dynamics model
3. **Joint end-to-end training matters** — single model with shared objective > separate video + IDM models
4. **Cross-embodiment transfer through video is surprisingly effective** — video is embodiment-agnostic, making WAMs natural candidates for multi-robot learning
5. **The inference cost is solvable** — with aggressive optimization, 14B video diffusion can run at 7Hz for real-time control

## References

- [Paper] [arXiv:2602.15922](https://arxiv.org/abs/2602.15922)
- [Project] [dreamzero0.github.io](https://dreamzero0.github.io)
- [Code] [github.com/dreamzero0/dreamzero](https://github.com/dreamzero0/dreamzero)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**DreamZero** 是一个基于预训练视频扩散模型（Wan2.1-I2V-14B）构建的 140 亿参数 **世界动作模型（WAM）**。它从图像观测和语言指令出发，联合预测未来视频帧和机器人动作。核心成果：

- 在零样本泛化到未见任务/环境方面，比 SOTA VLAs（GR00T N1.6、pi0.5）**提升 2 倍以上**
- 可从**多样化、非重复**的遥操作数据（AgiBot G1 上约 500 小时）中高效学习
- **跨具身平台迁移**：仅需 10-20 分钟其他机器人或人类的纯视频演示，未见任务性能相对提升 42% 以上
- **少样本具身平台适配**：仅用 30 分钟游戏数据即可迁移到新机器人
- 通过 38 倍推理加速实现 **7Hz 实时控制**

## 论文信息

- **标题**: World Action Models are Zero-shot Policies
- **作者**: Seonghyeon Ye, Yunhao Ge, Kaiyuan Zheng, Shenyuan Gao, Sihyun Yu, George Kurian 等
- **机构**: NVIDIA
- **日期**: 2026-02-19
- **arXiv**: [2602.15922](https://arxiv.org/abs/2602.15922)
- **项目主页**: [dreamzero0.github.io](https://dreamzero0.github.io)

## 1. 动机

视觉-语言-动作模型（VLAs）从 VLMs 继承了语义先验——它们知道**做什么**——但缺少**如何执行**新颖物理运动的时空先验。VLA 可以执行"把可乐罐移到 Taylor Swift 那里"（如果它学过 move 技能），但在"解开鞋带"这种训练数据中没有的技能上会失败。而且 VLAs 是在**静态**图文数据上预训练的，限制了对物理动态的理解。

核心假设：**视频扩散模型**从海量网络视频数据中编码了丰富的时空先验。在视频模型之上构建机器人策略——联合预测视频和动作——可以实现更好的泛化。

## 2. 什么是世界动作模型（WAM）？

WAM 的输入-输出结构：

> **[当前图像 + 语言指令]** → **[未来视频 + 机器人动作]**

与直接将观测映射到动作的 VLAs 不同，WAMs 首先"想象"成功执行的样子（视频），然后提取与想象的未来对齐的动作。联合视频-动作预测可以分解为：

\\(\pi(o_{l:l+H}, a_{l:l+H} | o_{0:l}, c, q_l) = \underbrace{\pi(o_{l:l+H} | o_{0:l}, c, q_l)}_{\text{视频预测}} \cdot \underbrace{\pi(a_{l:l+H} | o_{0:l+H}, q_l)}_{\text{逆动力学}}\\)

但 DreamZero 并非使用两个独立模型，而是用一个端到端模型以联合去噪目标进行训练。

## 3. 架构

DreamZero 构建在 **Wan2.1-I2V-14B** 之上，一个 140 亿参数的图生视频扩散 Transformer：

- **输入**：视觉上下文（VAE 编码）、语言指令（文本编码器）、本体感觉状态（状态编码器）
- **主干**：自回归 DiT + flow matching
- **输出**：未来视频帧（VAE 解码器）+ 连续动作（动作解码器）
- **训练目标**：flow matching，teacher-forcing 逐 chunk 视频去噪

### 为什么选择自回归（而非双向）？

| 属性 | 自回归 | 双向 |
|---|---|---|
| 推理速度 | 快（KV 缓存） | 较慢（固定长度） |
| 帧率 | 保持原生 FPS | 需要下采样 → 对齐失真 |
| 运动平滑度 | 更平滑（时序反向传播） | 任务进度相近但更抖动 |
| 误差累积 | 通过在 KV 缓存中替换真实观测来缓解 | 不适用 |

### 闭环推理

WAM 在闭环控制中的关键优势：每执行完一个动作 chunk 后，**真实观测替换 KV 缓存中的生成帧**，消除了自回归视频生成固有的累积误差问题。

## 4. 实时执行（38 倍加速）

原始推理：单 GPU 约 5.7 秒/动作 chunk。目标：<200ms 以实现平滑的 7Hz 控制。

| 优化层级 | 技术 | 累积加速（GB200） |
|---|---|---|
| **系统级** | CFG 并行化（双 GPU） | 1.8x |
| **系统级** | DiT 缓存（复用注意力） | 5.4x |
| **实现级** | Torch compile + CUDA graphs | 10.9x |
| **实现级** | 内核与调度器优化 | 14.8x |
| **实现级** | NVFP4 量化 | 16.6x |
| **模型级** | **DreamZero-Flash**（单步去噪） | **38x** |

### DreamZero-Flash

核心洞察：在极少步去噪的推理中，视频 token 仍然有噪声，但我们需要干净的动作。标准训练将视频和动作的噪声水平耦合 → 训练-测试不匹配。

**解决方案**：解耦噪声调度。通过 Beta(7, 1) 将视频时间步偏向高噪声状态，而保持动作时间步均匀。这训练模型从有噪声的视觉上下文中预测干净的动作，直接匹配单步推理场景。

结果：**150ms 单步推理**，相比 4 步基线仅下降约 9% 的性能。

## 5. 核心实验结果

### 数据与设置

- **AgiBot G1**：约 500 小时多样化遥操作数据，22 个环境，约 7200 个 episode，平均每个 episode 约 42 个子任务
- **DROID-Franka**：公开的异构数据集
- **基线**：GR00T N1.6、pi0.5（从头训练和预训练两种变体）

### Q1：从多样化数据中学习（已见任务，未见环境）

| 模型 | 初始化 | AgiBot 平均任务进度 |
|---|---|---|
| GR00T N1.6 | 从头训练 | 0.6% |
| GR00T N1.6 | 预训练 | 8.4% |
| pi0.5 | 从头训练 | 0% |
| pi0.5 | 预训练 | 27.4% |
| **DreamZero** | **从头训练** | **62.2%** |

从头训练的 VLAs 在多样化数据上几乎为零。DreamZero 比最好的预训练 VLA **高出 2 倍以上**。

### Q2：对未见任务的零样本泛化

在训练中完全不存在的 10 个任务（解鞋带、熨衣服、刷画、握手等）上：

- **DreamZero**：39.5% 平均任务进度
- 最佳预训练 VLA：16.3%
- 从头训练的 VLAs：<1%

定性观察：VLAs 过拟合到主要训练行为（例如总是尝试拿放）。DreamZero 会进行视觉规划并执行新颖的运动。

### Q3：后训练

在任务特定数据上微调后（叠衬衫、水果打包、收桌）：
- DreamZero：**90.5% 平均任务进度**
- 最佳预训练 VLA：53.3%
- 后训练后**仍保持**环境泛化能力

### Q4：跨具身平台迁移

仅使用 10-20 分钟来自另一个机器人（YAM）或人类的**纯视频**数据（无动作标注）：

| 方法 | 未见任务进度 |
|---|---|
| DreamZero（基线） | 38.3% |
| + 人到机器人迁移 | 54.3%（相对 +42%） |
| + 机器人到机器人迁移 | 55.4%（相对 +45%） |

### Q5：少样本具身平台适配

仅用 **30 分钟游戏数据**迁移到新机器人（YAM）：仍保持较强的语言跟随能力，并能零样本泛化到训练中未见的新物体。

## 6. 消融实验

| 因素 | 发现 |
|---|---|
| **数据多样性** | 多样化数据 >> 重复数据（50% vs 33%）—— 鲁棒的逆动力学模型需要多样化的状态-动作对应关系 |
| **模型规模** | 14B >> 5B（50% vs 21%）—— 小模型视觉幻觉严重 → 错误动作。任何规模的 VLAs（5B-32B）在多样化数据上仍为 0% |
| **架构** | 自回归 ≈ 双向（任务进度），但自回归运动更平滑且快 3-4 倍 |

## 7. 优势

- **强泛化能力**：即使没有跨具身平台预训练，也在未见任务/环境上比 SOTA VLAs 高出 2 倍以上
- **数据高效的跨具身平台迁移**：10-20 分钟纯视频数据即可带来 42%+ 的相对提升
- **实用的实时系统**：38 倍加速达到 7Hz 闭环控制
- **有意义的失败模式**：大多数失败来自视频预测错误而非动作提取——改进视频主干直接改进策略
- **清晰的规模化信号**：更大的视频模型 → 更好的视频质量 → 更好的动作（不同于 VLAs 在多样化数据上扩大模型并无帮助）

## 8. 局限性

- **行为克隆范式**：WAMs 本质仍是"指令 → 动作"，无法进行强化学习或反事实推理（如 [两种世界模型的故事](https://x.com/Majumdar_Ani/status/2033910830048125090) 中所讨论的）
- **高精度任务**：亚厘米级任务（钥匙插入、精密装配）仍有挑战
- **长时域任务**：受限于动作 chunk 时域和上下文窗口
- **单具身平台预训练**：多具身平台联合预训练尚未探索
- **缺少 scaling laws**：WAMs 的模型大小、数据量和计算量的关系仍未知

## 9. 核心要点

1. **视频模型是机器人策略的强大先验**——它们编码了 VLMs 根本缺乏的时空知识
2. **对 WAMs 而言，数据多样性 > 数据重复**——视频预测已在预训练中学会；关键是学习鲁棒的逆动力学模型
3. **联合端到端训练很重要**——单模型共享目标 > 分离的视频 + IDM 模型
4. **通过视频的跨具身平台迁移出人意料地有效**——视频与具身平台无关，使 WAMs 成为多机器人学习的天然选择
5. **推理成本是可解决的**——通过激进优化，140 亿参数的视频扩散可以在 7Hz 下运行以实现实时控制

## 参考链接

- [论文] [arXiv:2602.15922](https://arxiv.org/abs/2602.15922)
- [项目] [dreamzero0.github.io](https://dreamzero0.github.io)
- [代码] [github.com/dreamzero0/dreamzero](https://github.com/dreamzero0/dreamzero)

</div>
