---
title: "[Paper Notes] Temporal Visuo-Tactile Learning for Dexterous Grasp Stability"
date: 2026-10-19
permalink: /posts/2026/10/temporal-visuo-tactile-grasp-stability-paper-notes/
tags:
  - Dexterous Grasping
  - Visuo-Tactile Learning
  - Grasp Stability
  - Temporal Modeling
  - Tactile Sensing
  - Paper Notes
---

<div id="temporal-grasp-en" data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

A hand has closed around an object, but the table is still supporting its weight. **Temporal Visuo-Tactile Learning for Dexterous Grasp Stability** asks whether the preceding three seconds of contact formation can predict what happens after lifting. A temporal multimodal classifier estimates stability, and the robot uses its score to choose between lifting and releasing the object for another sampled grasp.

The study collects **10,000 trials on 200 objects** with four Digit 360 fingertips. Object-disjoint cross-validation reaches **83.55% classification accuracy**, compared with 79.56% without touch. On 20 additional unseen objects, the tactile gate succeeds on **82.0% of executed lifts**, versus 71.5% for the non-tactile gate. Counting episodes that end without a lift lowers these figures to **59.2% and 54.8%**. The gain in lift reliability comes with additional grasp attempts and abstentions.

## Paper and source version

**Ken Nakahara, Aleksei Buvailik, Prokhor Kotov, and Roberto Calandra**, LASR Lab, TU Dresden. These notes follow [arXiv:2610.10283v1](https://arxiv.org/abs/2610.10283v1), submitted October 7, 2026, including its appendices. See the [12-page PDF](https://arxiv.org/pdf/2610.10283v1) and [official project and dataset page](https://lasr-lab.github.io/dexterous-grasp-stability/). The source is an arXiv preprint; experimental values below are author-reported unless explicitly calculated.

## 1. Predict the lift outcome from contact formation

The platform combines a seven-DoF xArm7, a four-fingered **16-DoF Tilburg Hand**, four Digit 360 sensors, and an external RealSense D435i camera. Each fingertip records tactile images, audio, acceleration, and pressure. The predictor consumes a window starting at grasp initiation and ending before lift onset:

$$
p_\theta=f_\theta(s_{t:t+T})=P(o=1\mid s_{t:t+T}),\qquad T=3\ \mathrm{s}.
$$

The label $o=1$ means that the robot lifts the object by **100 mm** and holds it for **three seconds** without dropping it. The paper trains with binary cross-entropy, which can be written as

$$
\mathcal L_{\mathrm{BCE}}=-\frac{1}{N}\sum_{n=1}^{N}
\left[o_n\log p_n+(1-o_n)\log(1-p_n)\right].
$$

The observation window contains how contact develops during closure. It excludes post-lift observations, which would reveal the target outcome. The model learns from the resulting interaction without explicit contact-force or friction estimates. Its output is a stability score; reaching motions and hand targets are sampled by a separate procedure.

For data collection, SAM 3 segments the object, and depth plus camera calibration supplies its location. Reaching pose and hand joint targets are randomized, the hand closes through 50 interpolated position commands at a nominal 50 Hz, and every trial proceeds to a lift. This unconditional lift produces labels for both good and bad candidates. Object height supplies most labels automatically, with proprioceptive fallback under failed detection and manual correction of some labels. The dataset contains **47.1% stable and 52.9% unstable trials**.

## 2. Encode each fingertip over time, then fuse the hand

The input branches preserve different sampling structures:

| Branch | Resampled model input | Encoder |
|---|---|---|
| External RGB | 16 frames | Pretrained VideoMAEv2-Base plus temporal Transformer |
| Proprioception | 100 steps of 16 joint angles and six-dimensional end-effector pose | Sequence Transformer |
| Each tactile camera | 16 frames | VideoMAEv2-Base plus temporal Transformer, shared across fingers |
| Each fingertip's audio | 224 steps of 256-bin log-magnitude spectra | Sequence Transformer |
| Each fingertip's IMU / pressure | 224 steps of three-axis acceleration / scalar pressure | Sequence Transformers |

Visual and tactile images are resized to $256\times256$ and cropped to $224\times224$, keeping crop coordinates consistent across frames in a clip. Training includes both a center crop and a random crop of each sample; evaluation uses center crops.

Within a fingertip, camera, audio, IMU, and pressure features are resampled to a common temporal grid and fused by a shared modality Transformer. Factorized Transformer blocks then exchange information over **time and fingers**. Small finger-specific residual adapters capture differences between fingertips, and temporal pooling produces one token per finger.

The final stage joins **six sensing tokens**—external vision, proprioception, and four fingertips—with **16 learnable fusion tokens** in a 512-dimensional space. Three Transformer layers with eight attention heads mix them. Mask-aware pooling over the updated sensing tokens feeds a two-layer MLP and sigmoid. Masks accommodate unavailable streams.

The separation is useful: the tactile branch can represent both the evolution of one contact and how several fingers support the same object. It also avoids requiring one independently trained visual backbone per finger. The final fusion stage can still attend to individual fingertips alongside the external scene.

All models train for **100 epochs** with AdamW, batch size 4, initial learning rate $10^{-6}$, weight decay $10^{-4}$, cosine scheduling, and a 0.03 warmup ratio. Offline evaluation uses the final checkpoint, a 0.5 classification threshold, and **five-fold object-disjoint cross-validation**. Every input ablation is trained and evaluated with its modified inputs, so these experiments measure what can be learned from a restricted signal.

## 3. The useful tactile signal is mostly optical in this setup

The VideoMAEv2-based modality results are:

| Inputs | Mean classification accuracy |
|---|---:|
| Vision | 79.66% |
| Proprioception | 79.99% |
| Touch | 82.64% |
| Vision + proprioception | 79.56% |
| Proprioception + touch | 82.34% |
| Vision + touch | 83.52% |
| Vision + proprioception + touch | 83.55% |

Touch accounts for a **3.99-percentage-point** improvement over vision plus proprioception. Adding the other modalities to touch alone gives a smaller 0.91-point gain, with a paired test across five folds reported at $p=0.035$. Proprioception adds almost nothing to vision plus touch in this comparison.

Appendix II narrows down which Digit 360 streams matter. With vision and proprioception retained, tactile-camera-only input reaches **83.41 ± 1.30%**, close to **83.55 ± 1.58%** with all fingertip streams. Audio-only, IMU-only, and pressure-only variants of the touch branch reach 79.60%, 79.94%, and 79.93%, respectively. These are near the 79.56% non-tactile baseline. The result favors optical tactile information under this architecture; the authors leave open whether the other signals need more suitable encoders.

Raw tactile RGB also slightly outperforms absolute differences from the first frame: 83.55% versus 82.58%. Subtracting the background changes the statistics seen by a video backbone pretrained on RGB and can discard stable appearance cues. The experiment gives a concrete reason to test raw inputs before committing to contact-only preprocessing.

## 4. Separate temporal evidence from backbone capacity

With all sensing branches enabled, a static ResNet-50 plus MLP model reaches **79.79%**, a ResNet-50 plus temporal Transformer reaches **81.42%**, and VideoMAEv2 plus Transformer reaches **83.55%**. That comparison changes architecture, capacity, and pretraining together. The controlled input ablations provide a cleaner test of temporal information.

Keeping the VideoMAEv2-based architecture fixed, the authors repeat the final observation throughout selected streams, preserving the final grasp configuration while removing variation within the window:

| Temporal input condition, all-modality model | Accuracy |
|---|---:|
| Original sequence | 83.55% |
| Repeat final visual observation | 83.20% |
| Repeat final proprioceptive observation | 83.57% |
| Repeat final tactile observations | 81.48% |
| Repeat all final observations | 80.05% |
| Jointly permute RGB and tactile-camera frames | 81.93% |

Removing tactile variation costs **2.07 points**; removing visual or proprioceptive variation individually changes little. Joint image permutation preserves the frames and alignment between image streams but disrupts their temporal order, reducing accuracy by **1.62 points**. This supports information in the dynamics and ordering of contact formation beyond the final contact image. Because the permutation jointly changes vision and tactile-camera order, its effect cannot be assigned exclusively to tactile order.

Spatial detail matters too. The authors downsample tactile images and restore them to the original encoder size. A $1\times1$ image, retaining only mean RGB, yields 79.40%; $28\times28$ reaches 82.51%; both $112\times112$ and $224\times224$ reach 83.55%. Much of the benefit appears at modest spatial resolution. Since the images are enlarged again before encoding, this experiment does **not** demonstrate reduced model inference cost.

Finger selection changes the sensor inputs while every grasp still uses the full four-fingered hand. All-finger input reaches 83.55%, versus 83.41% for thumb plus middle finger and 82.55% for thumb alone. These findings concern observability under this grasp distribution, not the physical sufficiency of a two-finger hand. The appendix's contact-count analysis is also observational: trials with more contacts can differ in object difficulty and grasp geometry.

## 5. A lift gate changes both reliability and coverage

At deployment, both learned gates use a probability threshold of **0.95**, fixed before testing. A rejected candidate causes the hand to open, a small end-effector displacement, and another sampled grasp. One initial grasp plus up to five retries is allowed. Six rejections end the episode with a no-lift reset.

Each method is evaluated until it has executed **200 lifts: ten per object across 20 unseen objects**, excluded from the training set. The random gate accepts each candidate with probability 0.25, approximating the tactile gate's acceptance rate, and uses the same retry protocol.

| Method | Successful lifts / executed lifts | Grasp candidates | No-lift resets | Success counting no-lift episodes as failures |
|---|---:|---:|---:|---:|
| Direct lift | 99/200 = 49.5% | 200 | 0 | 49.5% |
| Random gate | 95/200 = 47.5% | 764 | 49 | 38.2% |
| Vision + proprioception gate | 143/200 = 71.5% | 690 | 61 | 54.8% |
| Vision + proprioception + touch gate | 164/200 = 82.0% | 779 | 77 | 59.2% |

For the tactile gate, the conservative episode denominator is $200+77=277$, giving $164/277\approx59.2\%$. Its **10.5-point** advantage over the non-tactile gate among executed lifts becomes **4.4 points** under the episode-level metric. Calculated from the reported counts, the tactile gate uses about **3.90 candidates per executed lift**, versus 3.45 without touch. These counts expose the retry burden; the paper does not establish a corresponding wall-clock throughput advantage.

The tactile-versus-non-tactile lift-success comparison has an object-level paired-test $p=0.003$. Random gating does not detectably improve on direct lifting ($p=0.48$), so extra attempts and abstention alone do not explain the learned gates' benefit. On the random gate's independently accepted lifts, the tactile score separates candidates strongly: success is **77/89 = 86.5%** above its threshold and **18/111 = 16.2%** below it.

One detail in Section VI-B needs care: the prose says the episode metric preserves the same ordering as lift success, but its reported numbers place direct lift above the random gate at the episode level. The table here follows the numerical results. Also, a 0.95 model threshold is an operating choice; the observed lift success does not establish 95% probability calibration.

## 6. What I would carry into a grasping system

The useful component is a **pre-lift critic trained on the dynamics of contact formation**. It could screen candidates from an existing planner, provided the sensing and grasp distribution remain suitable. The current system's retries are random local adjustments; the predictor neither scores explicit candidate actions nor learns which correction will improve a rejected grasp.

The three heaviest test objects still achieve only 40–60% lift success. Pre-lift contact can look plausible while failing to support the object's weight, and mass is not an explicit input. Learning to predict the consequences of a short load-bearing probe, or conditioning the model on proposed adjustments, would address a different and useful part of the control problem.

For a reproduction, I would keep the object-disjoint split, the repeat/permutation controls, and both deployment denominators. A reliable decision to lift and a productive grasping system are related goals, but candidate count, abstention, and elapsed time determine whether a more selective gate is useful in practice.

</div>

<div id="temporal-grasp-zh" data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，可使用顶部导航栏的语言按钮。

## TL;DR

手指已经合拢，但物体重量仍由桌面承担。**Temporal Visuo-Tactile Learning for Dexterous Grasp Stability** 研究的是：能否根据之前三秒内接触形成的过程，预测抬起物体后的稳定性？时序多模态分类器输出稳定概率，机器人据此决定直接抬升，或松手后重新采样一次抓取。

论文用四个 Digit 360 指尖传感器采集了 **200 个物体上的 10,000 次试验**。按物体划分的交叉验证达到 **83.55% 分类准确率**，无触觉版本为 79.56%。在额外 20 个未见物体上，触觉门控的**已执行抬升成功率为 82.0%**，无触觉门控为 71.5%；若把没有执行抬升就结束的回合也计入，分别为 **59.2% 和 54.8%**。更可靠的抬升选择伴随着更多候选抓取与放弃抬升。

## 论文与阅读版本

作者为 **Ken Nakahara、Aleksei Buvailik、Prokhor Kotov 和 Roberto Calandra**，来自德累斯顿工业大学 LASR Lab。本文依据 2026 年 10 月 7 日提交的 [arXiv:2610.10283v1](https://arxiv.org/abs/2610.10283v1)，包含附录。资料入口：[12 页 PDF](https://arxiv.org/pdf/2610.10283v1)、[官方项目与数据集页面](https://lasr-lab.github.io/dexterous-grasp-stability/)。来源为 arXiv 预印本，除明确标注的计算外，下文实验数字均为作者报告。

## 1. 从接触形成过程预测抬升结果

硬件包括七自由度 xArm7、四指 **16 自由度 Tilburg Hand**、四个 Digit 360 传感器和外部 RealSense D435i 相机。每个指尖记录触觉图像、音频、加速度与压力。预测窗口从抓握开始，持续到抬升之前：

$$
p_\theta=f_\theta(s_{t:t+T})=P(o=1\mid s_{t:t+T}),\qquad T=3\ \mathrm{s}.
$$

标签 $o=1$ 表示物体被抬高 **100 mm**，并保持**三秒**不掉落。论文采用二元交叉熵训练，可写为：

$$
\mathcal L_{\mathrm{BCE}}=-\frac{1}{N}\sum_{n=1}^{N}
\left[o_n\log p_n+(1-o_n)\log(1-p_n)\right].
$$

窗口保留手指闭合时接触如何发展的信息，排除会直接暴露标签的抬升后观测。模型通过交互结果学习，无需显式估计接触力或摩擦。它输出稳定性分数，接近动作与手部目标则由另一套采样过程提供。

采集时，SAM 3 分割物体，深度和相机标定提供物体位置。系统随机化接近位姿与手部关节目标，通过 50 个插值位置指令、以名义 50 Hz 频率闭合手部，然后每次都执行抬升。无条件抬升为好坏候选都提供结果标签。大部分标签根据物体高度自动生成，检测失败时使用本体感知辅助，并人工修正部分标签。最终数据包含 **47.1% 稳定与 52.9% 不稳定试验**。

## 2. 先编码每根手指的时间变化，再融合整只手

不同输入分支保留各自的采样结构：

| 分支 | 重采样后的模型输入 | 编码器 |
|---|---|---|
| 外部 RGB | 16 帧 | 预训练 VideoMAEv2-Base 加时序 Transformer |
| 本体感知 | 100 步，每步含 16 个关节角与六维末端位姿 | 序列 Transformer |
| 每个触觉相机 | 16 帧 | 各手指共享的 VideoMAEv2-Base 加时序 Transformer |
| 每个指尖的音频 | 224 步、256 频点对数幅度谱 | 序列 Transformer |
| 每个指尖的 IMU / 压力 | 224 步三轴加速度 / 标量压力 | 序列 Transformer |

视觉和触觉图像先缩放到 $256\times256$，再裁剪为 $224\times224$，同一视频片段内各帧采用一致的裁剪坐标。训练同时使用每个样本的中心裁剪与随机裁剪版本，评估采用中心裁剪。

单个指尖内部，图像、音频、IMU 和压力特征重采样到公共时间网格，由共享的模态 Transformer 融合。随后，分解式 Transformer 分别沿**时间和手指维度**交换信息。小型手指专属残差适配器处理指尖间差异，再沿时间池化，得到每指一个 token。

最终融合将**六个感知 token**——外部视觉、本体感知与四个指尖——和 **16 个可学习融合 token** 放入 512 维空间，经过三层、八头注意力的 Transformer。对更新后的感知 token 做带掩码池化，再由两层 MLP 和 sigmoid 输出概率。掩码用于处理缺失的感知流。

这种分层处理既能表示单个接触如何变化，也能表示多根手指如何共同支撑物体，同时避免每根手指分别训练一个视觉骨干。最终融合仍可将各指尖信息与外部场景分别关联。

所有模型使用 AdamW 训练 **100 个 epoch**，batch size 为 4，初始学习率 $10^{-6}$，weight decay 为 $10^{-4}$，采用余弦调度与 0.03 的 warmup 比例。离线评估使用最后一个 checkpoint、0.5 分类阈值，以及**按物体互斥划分的五折交叉验证**。每项输入消融都用修改后的输入重新训练和评估，因此测试的是受限信息下能学到什么。

## 3. 在这套系统里，触觉收益主要来自光学图像

VideoMAEv2 版本的模态比较如下：

| 输入 | 平均分类准确率 |
|---|---:|
| 视觉 | 79.66% |
| 本体感知 | 79.99% |
| 触觉 | 82.64% |
| 视觉 + 本体感知 | 79.56% |
| 本体感知 + 触觉 | 82.34% |
| 视觉 + 触觉 | 83.52% |
| 视觉 + 本体感知 + 触觉 | 83.55% |

相对视觉加本体感知，加入触觉提高 **3.99 个百分点**。在纯触觉基础上再加其他模态，只增加 0.91 个百分点，五折配对检验报告 $p=0.035$。本体感知对视觉加触觉的额外贡献很小。

附录 II 进一步区分 Digit 360 的各类信号。保留视觉与本体感知，仅使用触觉相机时达到 **83.41 ± 1.30%**，接近使用全部指尖信号的 **83.55 ± 1.58%**。触觉分支只用音频、IMU 或压力时，分别为 79.60%、79.94%、79.93%，都接近 79.56% 的无触觉基线。这说明当前架构主要利用了光学触觉信息；其他信号是否需要更适合的编码器，作者保留了这一问题。

原始触觉 RGB 也略优于相对首帧的绝对差分图像：83.55% 对 82.58%。背景相减改变了 RGB 视频预训练骨干看到的输入统计，还可能删除稳定的外观线索。这个实验支持在采用接触差分预处理之前，先测试原始输入。

## 4. 将时序证据与骨干容量的影响分开

使用全部模态时，静态 ResNet-50 加 MLP 达到 **79.79%**，ResNet-50 加时序 Transformer 达到 **81.42%**，VideoMAEv2 加 Transformer 达到 **83.55%**。这组比较同时改变了架构、容量和预训练，控制输入的消融更适合验证时间信息。

保持 VideoMAEv2 架构不变，作者将选定感知流的最后一次观测重复填满整个窗口，保留最终抓握状态，移除窗口内变化：

| 全模态模型的时间输入条件 | 准确率 |
|---|---:|
| 原始序列 | 83.55% |
| 重复最终视觉观测 | 83.20% |
| 重复最终本体感知观测 | 83.57% |
| 重复最终触觉观测 | 81.48% |
| 重复全部最终观测 | 80.05% |
| 联合打乱 RGB 与触觉相机帧 | 81.93% |

移除触觉变化损失 **2.07 个百分点**，单独移除视觉或本体感知变化影响很小。联合打乱图像顺序保留全部帧及图像流之间的对齐，却破坏时间顺序，使准确率下降 **1.62 个百分点**。结果支持接触形成的动态和先后顺序提供了最终接触图像以外的信息。由于打乱同时涉及视觉与触觉相机，不能将全部下降归因于触觉顺序。

空间细节同样有效。作者先降低触觉图像分辨率，再放大回编码器原有输入尺寸。仅保留平均 RGB 的 $1\times1$ 条件达到 79.40%，$28\times28$ 达到 82.51%，$112\times112$ 与 $224\times224$ 都达到 83.55%。较低空间分辨率已经保留大部分收益。由于编码前仍放大回原尺寸，这个实验**没有证明推理计算量下降**。

手指选择实验只限制传感输入，实际抓握始终使用完整四指手。全部手指输入为 83.55%，拇指加中指为 83.41%，仅拇指为 82.55%。这些结果反映当前抓握分布下的可观测信息，不能据此判断两指手在物理上同样足够。附录的接触数量分析也属于观察性比较，不同组的物体难度与抓握几何可能同时变化。

## 5. 抬升门控同时改变可靠性与覆盖率

部署时，两种学习门控都采用测试前固定的 **0.95 概率阈值**。拒绝候选后，机器人松手、轻微移动末端，再采样一次抓握。每回合允许一次初始抓握和最多五次重试；连续六次拒绝后，以不抬升的方式重置。

每种方法在 **20 个额外未见物体上，每物体完成十次抬升，共 200 次**。随机门控以 0.25 的概率接受每个候选，近似匹配触觉门控的接受率，并使用相同重试协议。

| 方法 | 成功抬升 / 已执行抬升 | 候选抓握次数 | 无抬升重置次数 | 将无抬升回合计为失败的成功率 |
|---|---:|---:|---:|---:|
| 直接抬升 | 99/200 = 49.5% | 200 | 0 | 49.5% |
| 随机门控 | 95/200 = 47.5% | 764 | 49 | 38.2% |
| 视觉 + 本体感知门控 | 143/200 = 71.5% | 690 | 61 | 54.8% |
| 视觉 + 本体感知 + 触觉门控 | 164/200 = 82.0% | 779 | 77 | 59.2% |

触觉门控的保守回合分母为 $200+77=277$，因此 $164/277\approx59.2\%$。相对无触觉门控，在已执行抬升上的 **10.5 个百分点**优势，换成回合指标后为 **4.4 个百分点**。根据报告次数计算，每次实际抬升平均需要约 **3.90 个候选抓握**，无触觉版本为 3.45。次数反映了重试负担，论文没有据此证明按实际耗时计算的吞吐优势。

触觉与无触觉门控的抬升成功率比较，在物体层面的配对检验中为 $p=0.003$。随机门控相对直接抬升没有显著改善（$p=0.48$），说明额外采样和拒绝本身不足以解释学习门控的收益。在随机门控独立接受的抬升中，触觉模型的分数仍能区分候选：高于阈值者成功率为 **77/89 = 86.5%**，低于阈值者为 **18/111 = 16.2%**。

VI-B 节有一处需要注意：正文说回合指标保持了与抬升指标相同的排序，但其数字在回合层面将直接抬升排在随机门控之前。本文表格遵循报告的数值。此外，0.95 是门控工作阈值，观测到的抬升成功率并不支持“概率已校准到 95%”的结论。

## 6. 哪些部分值得接入抓取系统

最有价值的组件是一个**根据接触形成过程训练的抬升前评价器**。在传感配置和抓握分布合适时，它可以筛选已有规划器给出的候选。当前重试仍然是局部随机调整，预测器没有显式评价候选动作，也没有学习哪种修正能改善被拒绝的抓握。

最重的三个测试物体仍只有 40–60% 的抬升成功率。抬升前的接触看起来合理，实际却可能无法支撑重量，而物体质量没有作为显式输入。预测短暂承重试探的结果，或让模型以拟执行的调整动作为条件，会进一步触及控制问题。

复现时，我会保留按物体互斥的划分、重复与打乱序列的对照，以及两种部署分母。可靠地决定何时抬升和高效完成抓取密切相关，而候选次数、放弃比例与实际耗时，决定了更挑剔的门控是否具有实际价值。

</div>
