---
title: "[Paper Notes] RynnWorld-Teleop: An Action-Conditioned World Model for Digital Teleoperation"
date: 2026-07-16
permalink: /posts/2026/07/rynnworld-teleop-paper-notes/
tags:
  - Digital Teleoperation
  - World Models
  - Video Generation
  - Dexterous Manipulation
  - Robot Learning
---

<div data-lang="en" markdown="1">

**RynnWorld-Teleop** replaces the physical robot in a teleoperation session with an action-conditioned video world model. An operator's hand-pose stream simultaneously drives a robot-view video generator and a human-to-robot retargeting pipeline, producing synchronized RGB observations and 54-dimensional robot actions for imitation learning.

My main takeaway concerns the operator's “feel.” The system provides a **responsive visual control loop**: a distilled causal generator produces robot-centric video at 40 FPS with about 25 ms model latency. It does not provide haptic or force feedback. The Manus gloves capture pose; they do not return contact force, weight, friction, or slip to the hands. RynnWorld-Teleop is therefore best understood as a scalable data engine with visual telepresence, not a bilateral force-reflecting teleoperation system.

## Paper Info

**“RynnWorld-Teleop: An Action-Conditioned World Model for Digital Teleoperation”** is by **Haoyu Zhao, Xingyue Zhao, Hangyu Li, Biao Gong, Kehan Li, Siteng Huang, Xin Li, Deli Zhao, and Zhongyu Li**, from DAMO Academy, Alibaba Group, the Hong Kong Embodied AI Lab, CUHK, Hupan Lab, and Ant Group. The notes below refer to **arXiv:2607.06558v2, dated July 12, 2026**.

- [Paper](https://arxiv.org/abs/2607.06558)
- [PDF](https://arxiv.org/pdf/2607.06558)
- [Project page](https://alibaba-damo-academy.github.io/RynnWorld-Teleop.github.io/)
- [Official code](https://github.com/alibaba-damo-academy/RynnWorld-Teleop)
- [Models on Hugging Face](https://huggingface.co/Alibaba-DAMO-Academy/RynnWorld-Teleop)

## Digital Teleoperation as Data Generation

Physical teleoperation couples every demonstration to robot availability, a prepared workspace, real objects, and manual resets. RynnWorld-Teleop moves the interaction into a learned visual world. Given a reference image \(I_{\mathrm{ref}}\) and a hand-gesture sequence

\[
P=\{p_1,\ldots,p_T\},
\]

the model generates a robot-centric egocentric video

\[
V=\{v_1,\ldots,v_T\}.
\]

The same gesture stream is retargeted into robot joint positions. The output trajectory is therefore

\[
\tau=\{(v_t,a_t)\}_{t=1}^{T},
\qquad a_t\in\mathbb{R}^{54},
\]

where each action concatenates two 7-DoF arms and two 20-DoF dexterous hands. The generated observation and robot action share the same human control signal, which gives the system its **action-grounded** property.

The paper defines three requirements for useful digital teleoperation:

- **robot-centric:** the generated view depicts the target robot embodiment;
- **action-grounded:** each frame remains tied to recoverable joint-level actions;
- **real-time:** the operator stays in the visual loop and can compose longer skills.

## What the Operator Actually Feels

The operator wears five HTC Vive trackers—chest, wrists, and upper arms—and Manus data gloves. In the physical data-collection setup, the trackers provide wrist-to-chest transforms at 100–120 Hz. The gloves are converted into a 21-point MediaPipe hand skeleton and then retargeted to each 20-DoF WUJI hand, with an exponential moving average for smoothing.

These devices are motion sensors. The paper describes no actuators in the gloves, fingertip force display, vibrotactile feedback, exoskeleton resistance, or other haptic channel. The feedback available during digital teleoperation is the generated first-person robot video.

| Feedback or control channel | Present in the paper? | Role |
|---|---|---|
| Hand and arm pose tracking | Yes | Captures operator intent |
| Real-time robot-view video | Yes | Visual closed-loop feedback |
| Motion smoothing and IK constraints | Yes | Stabilizes retargeted action labels |
| Contact-force reflection | No | No physical reaction force reaches the operator |
| Weight or inertia sensation | No | Inferred only from generated visual motion |
| Friction and slip sensation | No | No tactile slip feedback |
| Operator user study | No | No measured comfort, presence, or subjective hand-feel score |

“Fluid and responsive” in the paper is supported by throughput and latency measurements. It should not be interpreted as measured haptic realism.

## 1. Depth-Aware Skeletons Preserve Fine Motion

A standard 2D skeleton loses the hand's distance from the camera, which is crucial when reaching behind, around, or into contact with an object. RynnWorld-Teleop renders a 21-joint skeletal video whose color and joint/bone diameter vary with camera-space depth. The result remains a 2D image-like signal while carrying explicit 3D cues.

A pretrained VAE maps this skeleton video to a control latent

\[
c\in\mathbb{R}^{C\times T\times H\times W},
\]

spatially and temporally aligned with the target video latent. This representation gives the video model fine-grained articulation and depth information without requiring full meshes or robot simulation assets.

## 2. Pose-Conditioned Video DiT

The world model builds on Wan2.2-TI2V-5B. It introduces a control patch-embedding branch alongside the original video branch. Because skeleton and video latents have different statistics, the control latent is normalized into the video latent distribution before fusion:

\[
\tilde c
=
\frac{c-\mu_c}{\sigma_c}\sigma_z+\mu_z,
\]

\[
x
=
\operatorname{PatchEmbed}_z(z_t)
+\alpha\operatorname{PatchEmbed}_c(\tilde c).
\]

The control branch is zero-initialized and \(\alpha\) starts small, allowing pose control to enter gradually while preserving the pretrained video prior. Direct concatenation disrupts that distribution: the reported FVD rises from **585** to **1191** in the LoRA ablation.

This conditioning mechanism is the link between an operator gesture and the visual consequence. It improves controllability, although it cannot guarantee that every generated contact obeys true rigid-body dynamics.

## 3. Human Priors First, Robot Embodiment Second

Training proceeds across two domains. Stage 1 uses large-scale egocentric human video to learn hand-object interaction priors:

- VITRA: 30.7 million frames;
- EgoDex: 74.0 million frames.

Stage 2 fine-tunes on 1,800 paired human-robot teleoperation episodes, totaling 0.43 million robot frames. The four tasks are dual picking, block pushing, bimanual lifting, and lid placement. Human gestures are paired with their robot executions through IK, teaching the generator how a human intention should appear through a specific robot embodiment.

The human-video stage supplies object permanence, contact patterns, and visual “common sense.” Removing it causes a severe collapse: FVD increases to **2598**, with ghosting, blurred structures, and disappearing end effectors or objects. These learned priors make contact look plausible to the operator and make generated trajectories useful for policy training. They remain learned statistical dynamics, without explicit online force or contact solving.

## 4. Streaming Distillation Creates the Visual Loop

A bidirectional diffusion teacher is too slow for interactive control. The authors convert it into a causal student in two steps.

First, causal flow-matching warm-up teaches frame-causal generation. At time \(t\), attention can use only frames \(1,\ldots,t\). A fixed-size KV cache supports streaming, while the reference-image embedding persists as a sink token to preserve the original scene.

Second, Distribution Matching Distillation (DMD) transfers the teacher's output distribution into a four-step generator. Training backpropagates through the persistent KV cache across successive chunks, reducing boundary artifacts and improving long-rollout consistency.

On one H100 at \(480\times832\), the causal model reports:

- **40.0 FPS**;
- approximately **25 ms per generated frame**;
- about 5% of latency in skeletal encoding;
- about 72% in four-step causal DiT denoising;
- about 23% in VAE decoding.

This rate matches or exceeds a typical 30 Hz robot camera stream and is the main basis for the paper's claim of a responsive operator experience. The paper reports model inference latency, not complete motion-to-photon latency including trackers, communication, display, and buffering.

There is also a quality-speed trade-off. On EgoDex-Test, the non-causal SFT model obtains FVD **550** at 2.8 FPS; the causal model reaches 40 FPS with FVD **1226**. Real-time interaction comes with reduced visual fidelity.

## 5. Retargeting Produces Smooth Robot Actions

The operator's wrist pose is expressed relative to the chest, scaled into the robot workspace, and transformed into the robot base frame:

\[
T_{\mathrm{target}}
=
T_{\mathrm{base}}
\cdot
\operatorname{Scale}(T_{\mathrm{chest}}^{-1}T_{\mathrm{wrist}})
\cdot
T_{\mathrm{ee}}.
\]

An iterative damped least-squares IK solver maps this pose to robot joints. Adaptive damping handles near-singular configurations, a null-space shoulder prior favors natural arm postures, and hard clipping enforces joint limits. During physical demonstration collection, Ruckig further limits velocity, acceleration, and jerk before sending arm commands at 200 Hz. The robot's low-level interface runs at 500 Hz; policy commands are reported at 50 Hz with 18–30 ms delay.

These mechanisms improve control smoothness and the quality of action labels. They do not add physical feedback to the digital operator.

## 6. Long-Horizon Generation and Re-Anchoring

Pure autoregressive generation accumulates visual drift. The data-generation pipeline divides long videos into 81-frame chunks. The first chunk starts from the true initial frame; later chunks can be re-anchored with an actual robot-camera frame from the corresponding source demonstration.

This detail narrows the strongest “unbounded digital generation” interpretation. Re-anchoring preserves object pose and lighting when a physical source trajectory exists. A fully synthetic, live session starting from only one image cannot access future real frames, so it must tolerate model drift or use another state-correction mechanism.

## Experiments: Is the Generated Data Useful?

The downstream evaluation trains Diffusion Policy, \(\pi_0\), and \(\pi_{0.5}\) on real and generated trajectories, then runs 35 real-robot trials per task. Adding 300 generated episodes to 300 real episodes generally improves success. The largest reported gain occurs in lid placement:

| Policy | Training data | Lid placement success |
|---|---|---:|
| \(\pi_{0.5}\) | 300 real | 42.86% |
| \(\pi_{0.5}\) | 300 real + 300 generated | **62.86%** |
| \(\pi_0\) | 300 real | 34.29% |
| \(\pi_0\) | 300 real + 300 generated | **54.29%** |

A \(\pi_0\) policy trained on 300 generated episodes and zero real episodes reaches **82.86%** on block pushing and **77.14%** on bimanual lifting. Lid placement remains harder at **28.57%**, revealing the limit of generated data for precise contact and alignment.

These results validate RynnWorld-Teleop primarily as a robot-data generator. They do not measure whether a human operator can reliably judge contact forces or complete tasks through the generated visual loop.

## Strengths and Limitations

The paper's strongest idea is the shared action source. A hand-pose stream produces both visual observations and embodiment-specific actions, making generated trajectories immediately compatible with imitation learning. Depth-aware skeletal conditioning preserves fine control, and causal distillation turns a large video model into a 40 Hz interactive generator.

Several boundaries matter in practice:

1. The system offers visual feedback without haptic or force feedback.
2. Model latency is measured; full operator-loop latency and subjective usability are not evaluated.
3. Generated contact follows learned visual priors and can fail on liquids and highly deformable objects.
4. Each robot platform currently requires separate embodiment adaptation.
5. Causal real-time generation loses image quality relative to the slower teacher.
6. Long-horizon re-anchoring uses real source frames when available, limiting a fully synthetic interpretation.

## Takeaways

RynnWorld-Teleop's operator loop can be summarized as

\[
\boxed{
\text{tracked gesture}
\rightarrow
\begin{cases}
\text{40 Hz generated robot-view video}\\
\text{retargeted 54D robot action}
\end{cases}
}.
\]

The operator receives fast visual consequences for hand motion, which supports a useful sense of control. Physical hand feel remains absent: contact, load, friction, and slip are seen through generated pixels and never reflected into the operator's hands. For scalable imitation-learning data, that trade is compelling. For contact-rich telepresence or delicate force-controlled manipulation, an additional bilateral haptic channel and stronger state grounding would still be required.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**RynnWorld-Teleop** 在遥操过程中用动作条件视频世界模型替代真实机器人。遥操员的手部姿态流同时驱动机器人视角视频生成器和人到机器人的 retargeting 流程，最终产生时间同步的 RGB 观测与 54 维机器人动作，用于模仿学习。

我最关注的是遥操员的“手感”。系统提供的是**低延迟视觉控制闭环**：蒸馏后的因果生成器以 40 FPS 输出机器人第一视角视频，模型延迟约 25 ms。系统没有力反馈或触觉反馈。Manus 手套负责采集姿态，不会把接触力、重量、摩擦或滑移反馈到人的手上。因此，RynnWorld-Teleop 更适合被理解为带视觉临场感的可扩展数据引擎，而非双向力反射遥操作系统。

## 论文信息

论文 **“RynnWorld-Teleop: An Action-Conditioned World Model for Digital Teleoperation”** 的作者是 **Haoyu Zhao、Xingyue Zhao、Hangyu Li、Biao Gong、Kehan Li、Siteng Huang、Xin Li、Deli Zhao 和 Zhongyu Li**，来自 DAMO Academy、Alibaba Group、Hong Kong Embodied AI Lab、CUHK、Hupan Lab 和 Ant Group。本文依据 **arXiv:2607.06558v2，日期为 2026 年 7 月 12 日**。

- [论文页面](https://arxiv.org/abs/2607.06558)
- [PDF](https://arxiv.org/pdf/2607.06558)
- [项目主页](https://alibaba-damo-academy.github.io/RynnWorld-Teleop.github.io/)
- [官方代码](https://github.com/alibaba-damo-academy/RynnWorld-Teleop)
- [Hugging Face 模型](https://huggingface.co/Alibaba-DAMO-Academy/RynnWorld-Teleop)

## 把数字遥操定义成数据生成

物理遥操让每条示范都依赖机器人可用时间、整理好的工作空间、真实物体与人工复位。RynnWorld-Teleop 把交互移入学习得到的视觉世界。给定参考图像 \(I_{\mathrm{ref}}\) 与手势序列

\[
P=\{p_1,\ldots,p_T\},
\]

模型生成机器人第一视角视频

\[
V=\{v_1,\ldots,v_T\}.
\]

同一手势流还会被 retarget 成机器人关节位置，最终轨迹为

\[
\tau=\{(v_t,a_t)\}_{t=1}^{T},
\qquad a_t\in\mathbb{R}^{54},
\]

其中每个动作拼接了两条 7-DoF 手臂和两只 20-DoF 灵巧手。生成观测和机器人动作共享同一个人体控制信号，这构成了系统的 **action-grounded** 属性。

论文为可用的数字遥操提出三个条件：

- **robot-centric：**生成画面呈现目标机器人 embodiment；
- **action-grounded：**每一帧都与可恢复的关节级动作绑定；
- **real-time：**操作者能够留在视觉闭环中，并连续组合较长技能。

## 遥操员实际感受到什么

遥操员佩戴五个 HTC Vive tracker，位置分别是胸部、双手腕和双上臂，同时佩戴 Manus 数据手套。在物理数据采集系统中，tracker 以 100–120 Hz 提供手腕相对胸部的位姿。手套信号被转换成 21 点 MediaPipe 手骨架，再 retarget 到每只 20-DoF WUJI Hand，并通过指数移动平均进行平滑。

这些设备属于运动传感器。论文没有描述手套执行器、指尖力显示、振动触觉、外骨骼阻力或其他触觉通道。数字遥操过程中，操作者获得的反馈是生成的机器人第一视角视频。

| 反馈或控制通道 | 论文是否提供 | 作用 |
|---|---|---|
| 手部和手臂姿态跟踪 | 有 | 捕获操作者意图 |
| 实时机器人视角视频 | 有 | 提供视觉闭环反馈 |
| 运动平滑与 IK 约束 | 有 | 稳定 retarget 后的动作标签 |
| 接触力反射 | 无 | 操作者接收不到物理反作用力 |
| 重量或惯性感受 | 无 | 只能从生成画面推测 |
| 摩擦和滑移感受 | 无 | 没有触觉滑移反馈 |
| 操作者用户研究 | 无 | 没有舒适度、临场感或主观手感评分 |

论文中的 “fluid and responsive” 由吞吐率和延迟测量支持，不能等同于经过测量的触觉真实性。

## 1. Depth-Aware Skeleton 保留精细动作

普通二维骨架会丢失手相对相机的深度，这个信息对绕过物体、伸向物体后方和建立接触都很重要。RynnWorld-Teleop 渲染 21 关节点骨架视频，颜色以及关节/骨骼直径会随相机坐标系深度变化。最终信号保持二维图像形式，同时携带显式三维线索。

预训练 VAE 将骨架视频映射为控制 latent：

\[
c\in\mathbb{R}^{C\times T\times H\times W},
\]

它在空间和时间上与目标视频 latent 对齐。世界模型由此获得精细手指关节和深度信息，同时不依赖完整 mesh 或机器人仿真资产。

## 2. 由姿态控制的 Video DiT

世界模型基于 Wan2.2-TI2V-5B，在原始视频分支旁增加控制 patch-embedding 分支。骨架 latent 和视频 latent 的统计分布不同，因此控制信号会先对齐到视频 latent 分布：

\[
\tilde c
=
\frac{c-\mu_c}{\sigma_c}\sigma_z+\mu_z,
\]

\[
x
=
\operatorname{PatchEmbed}_z(z_t)
+\alpha\operatorname{PatchEmbed}_c(\tilde c).
\]

控制分支使用零初始化，\(\alpha\) 的初值也很小，让姿态控制逐步进入网络，同时保留预训练视频先验。直接拼接会破坏原有分布：LoRA 消融中的 FVD 从 **585** 上升到 **1191**。

这个条件机制把操作者手势连接到视觉结果，提高了可控性，但无法保证每次生成接触都严格满足真实刚体动力学。

## 3. 先学习人类先验，再适配机器人 Embodiment

训练横跨两个域。Stage 1 使用大规模第一视角人类视频学习手—物交互先验：

- VITRA：3070 万帧；
- EgoDex：7400 万帧。

Stage 2 使用 1800 条人—机器人配对遥操 episode 继续训练，共计 43 万机器人视频帧。四项任务分别是双手拾取、推方块、双臂抬升和盒盖放置。人体手势通过 IK 与机器人执行配对，使生成器学会同一人类意图在特定机器人 embodiment 上应该呈现什么样的视觉结果。

人类视频预训练提供物体持续性、接触模式和视觉“常识”。去掉这一阶段后，FVD 恶化到 **2598**，并出现重影、模糊以及末端执行器或物体消失。学习得到的先验让接触在操作者眼中更合理，也使生成轨迹能够训练策略。它依然属于统计动力学，没有在线显式求解接触力。

## 4. Streaming Distillation 建立视觉闭环

双向扩散 teacher 太慢，无法交互式控制。作者用两步方法将其转换为因果 student。

第一步是 causal flow-matching warm-up，让模型学习逐帧因果生成。在时刻 \(t\)，attention 只能使用第 \(1,\ldots,t\) 帧。固定大小 KV cache 支持流式推理，参考图像 embedding 则作为持续存在的 sink token，维持初始场景身份。

第二步使用 Distribution Matching Distillation（DMD），把 teacher 的输出分布转移到四步生成器。训练会跨连续 chunk 反向传播通过持续 KV cache，减少 chunk 边界伪影并提高长序列一致性。

因果模型在一张 H100、\(480\times832\) 分辨率下报告：

- **40.0 FPS**；
- 每个生成帧约 **25 ms**；
- 骨架编码约占 5% 延迟；
- 四步因果 DiT 去噪约占 72%；
- VAE 解码约占 23%。

这个速度达到或超过常见的 30 Hz 机器人相机，是论文声称操作者体验流畅的主要依据。论文测量的是模型推理延迟，没有覆盖 tracker、通信、显示器和缓冲在内的完整 motion-to-photon 延迟。

实时性也带来质量交换。在 EgoDex-Test 上，非因果 SFT 模型以 2.8 FPS 获得 FVD **550**；因果模型达到 40 FPS 时 FVD 为 **1226**。交互速度提升伴随着视觉质量下降。

## 5. Retargeting 生成平滑机器人动作

系统先计算操作者手腕相对胸部的位姿，将平移缩放到机器人工作空间，再变换到机器人基座坐标系：

\[
T_{\mathrm{target}}
=
T_{\mathrm{base}}
\cdot
\operatorname{Scale}(T_{\mathrm{chest}}^{-1}T_{\mathrm{wrist}})
\cdot
T_{\mathrm{ee}}.
\]

迭代式 damped least-squares IK 将目标位姿映射到机器人关节。自适应 damping 处理接近奇异位形的情况，null-space shoulder prior 引导自然手臂姿态，hard clipping 则执行关节限制。在物理示范采集期间，Ruckig 继续限制速度、加速度和 jerk，再以 200 Hz 发送手臂命令。机器人底层接口运行在 500 Hz，策略命令为 50 Hz，报告延迟为 18–30 ms。

这些机制提高控制平滑性和动作标签质量，不会为数字遥操员增加物理反馈。

## 6. 长序列生成与 Re-Anchoring

纯自回归生成会积累视觉漂移。数据生成流程把长视频分成 81 帧 chunk。第一个 chunk 使用真实初始帧，后续 chunk 可以使用来源示范中对应时刻的真实机器人相机帧重新锚定。

这个细节限定了最强意义上的“无限数字生成”。存在物理来源轨迹时，re-anchoring 可以保持物体位置与光照。只从一张图像开始的完全合成在线遥操无法取得未来真实帧，因此需要承受模型漂移，或增加其他状态修正机制。

## 实验：生成数据是否有用

下游实验分别训练 Diffusion Policy、\(\pi_0\) 和 \(\pi_{0.5}\)，再对每项任务进行 35 次真实机器人测试。向 300 条真实 episode 中加入 300 条生成 episode 后，成功率总体提高。盒盖放置的提升最明显：

| 策略 | 训练数据 | 盒盖放置成功率 |
|---|---|---:|
| \(\pi_{0.5}\) | 300 条真实数据 | 42.86% |
| \(\pi_{0.5}\) | 300 真实 + 300 生成 | **62.86%** |
| \(\pi_0\) | 300 条真实数据 | 34.29% |
| \(\pi_0\) | 300 真实 + 300 生成 | **54.29%** |

只用 300 条生成数据、完全不使用真实数据训练的 \(\pi_0\)，在推方块任务达到 **82.86%**，双臂抬升达到 **77.14%**。盒盖放置只有 **28.57%**，显示生成数据在精细接触和对准任务上的局限。

这些结果主要验证 RynnWorld-Teleop 的机器人数据生成能力，没有测量人类操作者能否通过生成视觉闭环可靠判断接触力或完成任务。

## 优点与局限

论文最强的想法是共享动作来源：手部姿态流同时产生视觉观测和 embodiment-specific 动作，生成轨迹可以直接进入模仿学习。Depth-aware skeletal conditioning 保留精细控制，因果蒸馏则把大型视频模型转化为 40 Hz 交互生成器。

实际使用时需要关注以下边界：

1. 系统提供视觉反馈，没有触觉或力反馈。
2. 论文测量了模型延迟，没有评测完整操作者闭环延迟和主观可用性。
3. 生成接触依赖学习得到的视觉先验，在液体和高度可变形物体上可能失败。
4. 当前每种机器人平台都需要单独进行 embodiment adaptation。
5. 因果实时生成的画质低于较慢的 teacher。
6. 长序列 re-anchoring 会在可用时使用真实来源帧，限制了完全合成的解释。

## Takeaways

RynnWorld-Teleop 的操作者闭环可以概括为

\[
\boxed{
\text{人体手势跟踪}
\rightarrow
\begin{cases}
\text{40 Hz 生成机器人视角视频}\\
\text{retarget 后的 54D 机器人动作}
\end{cases}
}.
\]

操作者能够快速看到手部动作产生的视觉结果，由此获得可用的控制感。物理手感仍然缺失：接触、负载、摩擦和滑移只呈现在生成像素中，不会回传到操作者手上。对于扩展模仿学习数据，这个取舍很有吸引力；对于接触丰富的临场遥操作或精细力控任务，系统仍需要双向触觉通道和更强的状态锚定。

</div>
