---
title: "[Paper Notes] SALA: Semantically Aligned Latent Actions Enable Dual-Axis Scaling of Embodied Foundation Models"
date: 2026-11-14
permalink: /posts/2026/11/sala-semantic-latent-actions-paper-notes/
excerpt: "SALA uses atomic-action language to align latent actions from unpaired human and robot videos, then trains one VLA action expert on both. It reaches 64.4% average simulation success and 72.5% on four real-world dexterous tasks."
tags:
  - Paper Notes
  - Vision-Language-Action
  - Human Videos
  - Latent Actions
  - Cross-Embodiment Learning
  - Robot Manipulation
  - Scaling
---

<div data-lang="en" markdown="1">

Action-free human video becomes useful to a robot when the same visual transition receives the same control-relevant meaning across embodiments. SALA constructs that shared meaning with language. It uses short atomic-action descriptions to relate unpaired human and robot clips, aligns their latent actions through those relations, and then lets both video sources train the same vision-language-action policy.

Jiachun Jin, Zetong Zhou, Haonan Wang, Xiao Yang, Jun Zhu and Zhijie Deng. Sharpa Robotics, SJTU–Sharpa Joint Lab for Embodied AI, and Tsinghua University. [arXiv:2611.17110v1](https://arxiv.org/abs/2611.17110), November 12, 2026 · [Project page](https://sala-vla.github.io/)

### A reconstruction target does not name the action

A latent action model compresses the transition between two observations into a code, then reconstructs the later observation from the earlier one and that code. This provides supervision without action labels. The code also has freedom to store camera pose, object appearance, background and scene identity. Two clips can reconstruct future frames well while representing different actions as similar latents because they share a visual setting.

That failure matters for cross-embodiment learning. Human and robot videos differ in viewpoint, hand geometry and workspace. Reconstruction alone gives no reason for “grasp the bottle” by a person and the corresponding robot motion to share a latent. SALA adds the missing relation: language describes what a short clip does, independently of which embodiment performs it.

### Language turns unpaired clips into soft neighbors

Each clip has two endpoint observations and an atomic-action description such as “grasp the cup” or “press the stapler.” Human and robot clips are collected independently, so SALA does not need paired demonstrations. In each batch, a frozen text encoder measures language similarity between every human clip and the robot clips. A softmax turns those scores into the human clip's target neighborhood over robot clips.

The latent embeddings produce a second neighborhood through cosine similarity. SALA aligns the two distributions with cross-entropy:

```text
P_i = softmax_j(language_similarity(i, j))
Q_i = softmax_j(latent_similarity(i, j))
L_align = CE(P_i, Q_i)
```

The robot side is stop-gradiented. Robot latents remain fixed targets while human latents move toward them. This direction matters because robot latents also reconstruct executable actions and states; pulling them toward unlabeled human features would weaken their control meaning.

The tokenizer trains with three signals:

```text
L_token = 0.5 * (L_Hvis + L_Rvis) + lambda_act * L_act + lambda_align * L_align
```

Visual reconstruction preserves the transition, a robot-only action decoder grounds robot latents in control, and semantic alignment relates embodiments. SoftVQ represents each token as a categorical distribution over a 256-code book, so graded semantic relations can move the pre-quantization latents without waiting for a hard code switch. The transformer produces eight latent tokens per clip.

### The policy predicts latent actions during training

After tokenizer training, SALA freezes it and uses it as a teacher. Both human and robot clips receive latent-action distributions. The policy is a `pi0`-style model: a Qwen3-VL-4B vision-language model and a separately parameterized 0.6B action expert, with eight learnable latent queries inserted into the expert. The noisy action chunk attends to these queries, so latent-action prediction participates directly in action generation.

Human data supply the KL loss between teacher and predicted latent actions. Robot data supply both that loss and flow-matching action supervision:

```text
L_policy = L_RFM + lambda_LA * (L_RLA + L_HLA)
```

The future observation is used only by the teacher to create a training target. At deployment, the policy receives the current observation and language instruction; neither future frames nor the tokenizer are needed online.

The training recipe separates data according to what each stage can exploit:

| Stage | Data | Policy supervision |
|---|---|---|
| Pre-training | Large action-free human video | Latent-action prediction only |
| Mid-training | Robot teleoperation | Latent actions plus flow-matching robot actions |
| Post-training | Task teleop plus task human video | Full robot objective plus human latent actions |

Pre-training on general human video needs no atomic-action descriptions, because the frozen teacher already assigns latent targets from frames. Task-specific human demonstrations need no robot actions and can be collected without hardware. The tokenizer still requires descriptions for the clips used to train it: in the real experiments, 27,406 human trajectories covering 983 hours were annotated out of 2,678 equivalent hours of pre-training video.

### Two scaling axes in the data recipe

The first axis is general human-video pre-training. More video expands the policy's exposure to interactions without adding robot teleoperation. The second is task-specific post-training. Human demonstrations of the target task provide extra supervision to the same action expert while the underlying teleoperated set stays fixed.

This distinction keeps the experiments interpretable. Pre-training asks whether general video improves robot action prediction. Post-training asks whether additional cheap human demonstrations improve the same robot's success on a target task.

### Simulation: action-aligned latents remain robust

RoboTwin 2.0 supplies the controlled comparison. Aloha-AgileX is the target robot. ARX-X5 clips serve as the non-target videos: 27,000 trajectories and 68 equivalent hours, compared with only 2,500 target trajectories and 9.2 hours. SALA and the LAM/WAM baselines learn from the same non-target videos.

| Method | Clean | Randomized | Average |
|---|---:|---:|---:|
| SALA | 80.2% | **48.6%** | **64.4%** |
| `pi0.5` | 70.7% | 46.6% | 58.7% |
| LingBot-VA | 75.8% | 38.4% | 57.1% |
| OpenWAM | **86.8%** | 3.9% | 45.4% |

The clean-column result leaves room for video world models: OpenWAM exceeds SALA there by 6.6 points. The randomized column exposes a different property. OpenWAM falls from 86.8% to 3.9% when scene appearance changes, while SALA falls from 80.2% to 48.6%. SALA's language-aligned latents organize behavior around atomic actions, which helps when visual context shifts.

The ablation confirms that the alignment term carries much of this robustness. Removing `L_align` produces 75.5% clean and 36.8% randomized success. Making alignment bidirectional, by removing the stop-gradient, produces 73.5% and 46.8%. The full model reaches 80.2% and 48.6%. The clean-success cost of bidirectional alignment is particularly clear.

Across the analyzed latent pairs, alignment raises the median share of variance explained by the atomic action from 0.41 to 0.67 and lowers the share explained by scene from 0.14 to 0.04. On RoboTwin, top-1 cross-embodiment retrieval by matching atomic action rises from 41.3% with reconstruction alone to 78.2% with SALA.

### Real robot: more human video improves both error and success

The real system is a Sharpa North wheeled humanoid with two 7-DoF arms and two 22-DoF Sharpa Wave hands. The action space covers 63 joints across arms, hands, torso and neck. The policy uses head stereo RGB and two wrist fisheye cameras. The hands contain tactile sensors, while the reported policy uses vision and proprioception only.

Training uses 2,678 equivalent hours of action-free human video and 888 hours of robot teleoperation. The comparison below uses 20 trials per task. SALA also uses task-specific human demonstrations; GR00T N1.7 and the vanilla VLA use the same teleoperated demonstrations without those extra human videos.

| Task | SALA | GR00T N1.7 | Vanilla VLA |
|---|---:|---:|---:|
| Gear assembly | **75%** | 45% | 40% |
| Bimanual pouring | **80%** | 50% | 25% |
| Flower insertion | **55%** | 30% | 20% |
| Spoon scooping | **80%** | 40% | 25% |
| Average | **72.5%** | 41.25% | 27.5% |

The data scaling curves connect the model to its training budget. Increasing human-video pre-training from zero to 2,678 equivalent hours steadily lowers validation action error. At the largest budget, L1 error is 4.10% below the vanilla VLA and 2.21% below SALA's own zero-hour latent-action variant. Robot teleoperation data stays fixed in this comparison.

The post-training curve isolates task video. With teleoperated demonstrations fixed, using 10%, 50% and 100% of each task's human demonstrations raises average real-robot success from 53.75% to 60.0% and then 72.5%. The gain comes from adding demonstrations that contain no robot actions.

Cross-embodiment retrieval on real videos provides a direct diagnostic. Reconstruction-only matching identifies the same task for 3.8% of human queries. SALA raises this to 34.2%. The same both-hand verbs are retrieved for 17.0% of queries, compared with 6.2% without alignment. Even for tasks absent from robot training data, SALA's language similarity to retrieved robot clips reaches 0.31, close to 0.32 on shared tasks.

### What the evidence supports

SALA offers a practical way to make action-free human video share a supervision interface with robot control. Atomic-action language supplies relational labels for unpaired clips, the robot action decoder supplies control grounding, and the stop-gradient preserves robot latents as anchors. The frozen latent teacher then lets human frames train the same action expert that produces robot actions.

The results support two specific claims. Language alignment improves cross-embodiment latent correspondence and domain-randomized simulation success. Additional human video improves offline robot action prediction and real task success under the tested budgets. The randomized gap and retrieval metrics also explain why the method matters beyond a small aggregate improvement.

The boundary conditions are important. The tokenizer still needs atomic-action annotations, although the policy stage does not. Pre-training scaling is measured with one run per budget and an offline validation L1 metric, so the trend beyond 2,678 hours and its direct causal effect on real-robot success remain open. Real evaluation covers four tasks and 20 trials per task. Post-training fixes the teleoperated set, which cleanly isolates the human-video axis while leaving the combined scaling behavior for future work.

The broader lesson is that video reconstruction and action semantics answer different questions. Reconstruction says that a transition happened. Language alignment says which transitions should be treated as related across bodies. SALA uses the second signal to shape the representation before the first signal becomes a policy.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

只有当同一段视觉变化在不同本体之间获得相同的控制含义，无动作人类视频才能真正服务机器人策略。SALA 用语言建立这种共同含义：它通过短片段动作描述关联未配对的人类和机器人视频，再按这些关系对齐潜在动作，让两类视频共同训练同一个视觉语言动作模型。

作者：Jiachun Jin、Zetong Zhou、Haonan Wang、Xiao Yang、Jun Zhu、Zhijie Deng。Sharpa Robotics、上海交通大学–Sharpa 具身智能联合实验室、清华大学。[arXiv:2611.17110v1](https://arxiv.org/abs/2611.17110)，2026 年 11 月 12 日 · [项目主页](https://sala-vla.github.io/)

### 重建目标没有说明动作是什么

潜在动作模型把两帧之间的变化压缩成编码，再用前一帧和该编码重建后一帧。这样不需要动作标签也能训练。编码同时可以存储相机位置、物体外观、背景和场景身份。两段视频即使动作不同，只要处于相似场景，也可能重建得很好，却被映射成相近的潜在动作。

跨本体学习会放大这个问题。人类和机器人视频的视角、手部结构和操作空间都不同，重建损失没有理由让“人拿起瓶子”和机器人的对应动作共享一个潜在动作。SALA 补充了缺失的关系：用语言描述一个短片段在做什么，并让这段描述独立于执行动作的本体。

### 语言把未配对片段组织成软邻域

每个片段包含两个端点观测和一条原子动作描述，例如 “grasp the cup” 或 “press the stapler”。人类与机器人数据独立收集，因此不需要配对示范。在每个 batch 中，冻结的文本编码器计算一条人类片段与所有机器人片段的语言相似度，softmax 后得到人类片段在机器人片段上的目标邻域。

潜在表示也会通过余弦相似度形成邻域。SALA 用交叉熵让这两个分布一致：

```text
P_i = softmax_j(language_similarity(i, j))
Q_i = softmax_j(latent_similarity(i, j))
L_align = CE(P_i, Q_i)
```

机器人一侧经过 stop-gradient，机器人潜在动作保持固定，人类潜在动作向它们靠近。这个方向很重要：机器人潜在动作还要重建可执行动作和状态，如果被无动作标签的人类特征反向拉动，控制含义会被稀释。

Tokenizer 同时使用三路监督：

```text
L_token = 0.5 * (L_Hvis + L_Rvis) + lambda_act * L_act + lambda_align * L_align
```

视觉重建保留片段变化，仅在机器人数据上训练的动作解码器把潜在表示锚定到控制，语义对齐负责建立跨本体关系。SALA 使用 SoftVQ，把每个 token 表示为 256 个码字上的类别分布。语义关系是渐变的，SoftVQ 可以让量化前的潜在表示连续调整；硬 VQ 需要等到编码跨过边界才会改变 token。每个片段最终得到 8 个潜在 token。

### 策略学习潜在动作，不需要在线预测未来帧

Tokenizer 训练完成后会被冻结，并作为教师给人类和机器人片段分配潜在动作分布。策略沿用 `pi0` 式结构：Qwen3-VL-4B 视觉语言模型，加上独立的 0.6B 参数动作专家，并在动作专家中加入 8 个可学习潜在查询。带噪动作 chunk 会关注这些查询，因此潜在动作预测直接参与动作生成。

人类数据只提供教师分布与预测分布之间的 KL 损失，机器人数据同时提供潜在动作损失和 flow-matching 动作监督：

```text
L_policy = L_RFM + lambda_LA * (L_RLA + L_HLA)
```

未来观测只用于教师生成训练目标。部署时，策略接收当前观测和语言指令，在线运行不需要未来帧，也不需要 tokenizer。

训练流程按照各阶段能用到的数据分开：

| 阶段 | 数据 | 策略监督 |
|---|---|---|
| 预训练 | 大规模无动作人类视频 | 只预测潜在动作 |
| 中训练 | 机器人遥操作 | 潜在动作与 flow-matching 机器人动作 |
| 后训练 | 任务遥操作与任务人类视频 | 完整机器人目标加人类潜在动作 |

通用人类视频预训练不需要原子动作描述，因为冻结教师可以直接从帧生成 latent target。目标任务的普通人类示范不需要机器人动作，也不占用机器人硬件。Tokenizer 本身仍需对训练片段标注：真机实验从 2,678 等效小时预训练视频中选出 27,406 条、983 小时的人类片段做描述标注。

### 数据配方中的两条 scaling 轴

第一条轴是大规模通用人类视频预训练。视频增加时，策略接触到更多交互，机器人遥操作数据不增加。第二条轴是目标任务的后训练。目标任务的普通人类示范为同一个动作专家提供额外监督，而遥操作集合保持不变。

这样安排让实验容易解释。预训练回答通用视频能否改善机器人动作预测，后训练回答增加廉价人类示范能否提升同一机器人的任务成功率。

### 仿真：按动作组织的潜在表示更抗场景变化

RoboTwin 2.0 提供受控对比。目标机器人是 Aloha-AgileX，非目标视频来自 ARX-X5，共 27,000 条轨迹、68 等效小时；目标机器人只有 2,500 条轨迹、9.2 小时。SALA 与 LAM、WAM 基线使用相同的非目标视频。

| 方法 | 干净场景 | 随机化场景 | 平均 |
|---|---:|---:|---:|
| SALA | 80.2% | **48.6%** | **64.4%** |
| `pi0.5` | 70.7% | 46.6% | 58.7% |
| LingBot-VA | 75.8% | 38.4% | 57.1% |
| OpenWAM | **86.8%** | 3.9% | 45.4% |

干净场景的结果给视频世界模型留下了空间：OpenWAM 在这里比 SALA 高 6.6 个百分点。随机化场景展示了另一种性质。场景外观改变后，OpenWAM 从 86.8% 跌到 3.9%，SALA 从 80.2% 降到 48.6%。语言对齐后的潜在动作更多按原子动作组织，因此在视觉上下文变化时更稳定。

消融显示对齐项贡献明显。去掉 `L_align` 后，干净与随机化成功率分别为 75.5% 和 36.8%。去掉 stop-gradient、改成双向对齐后，两者为 73.5% 和 46.8%。完整模型为 80.2% 和 48.6%，其中双向对齐对干净场景性能的损害尤其明显。

在分析的潜在动作样本中，原子动作能够解释的潜在方差中位数从 0.41 升到 0.67，场景能够解释的比例从 0.14 降到 0.04。RoboTwin 上的 top-1 跨本体检索中，只靠重建时同原子动作命中率为 41.3%，加入 SALA 对齐后升到 78.2%。

### 真机：更多人类视频同时降低误差、提高成功率

真机平台是 Sharpa North 轮式人形机器人，双臂各 7 自由度，末端是两只 22 自由度的 Sharpa Wave 灵巧手。动作空间覆盖手臂、手、躯干和颈部共 63 个关节。策略输入头部立体 RGB 和两路腕部鱼眼相机；灵巧手带有触觉传感器，但论文中的策略只使用视觉和本体状态。

训练使用 2,678 等效小时无动作人类视频和 888 小时机器人遥操作。下表每个任务评估 20 次。SALA 额外使用目标任务的人类示范；GR00T N1.7 与 vanilla VLA 使用相同的遥操作示范，没有这些额外人类视频。

| 任务 | SALA | GR00T N1.7 | Vanilla VLA |
|---|---:|---:|---:|
| 齿轮装配 | **75%** | 45% | 40% |
| 双手倒药 | **80%** | 50% | 25% |
| 花朵插入 | **55%** | 30% | 20% |
| 用勺舀取 | **80%** | 40% | 25% |
| 平均 | **72.5%** | 41.25% | 27.5% |

scaling 曲线把性能与数据预算直接联系起来。人类视频预训练从 0 增至 2,678 等效小时，验证动作误差持续下降。最大预算下，L1 误差比 vanilla VLA 低 4.10%，比 SALA 自己的零小时 latent-action 版本低 2.21%。这一组对比中的机器人遥操作数据保持不变。

后训练曲线单独观察任务人类视频。机器人遥操作示范固定，使用各任务 10%、50% 和 100% 的人类示范，把真机平均成功率从 53.75% 提到 60.0%，再提到 72.5%。新增数据不包含机器人动作。

真机跨本体检索给出了较直接的诊断。只靠重建时，人类查询找到同一任务的比例为 3.8%，SALA 提升到 34.2%。双手动作动词同时命中的比例从 6.2% 提升到 17.0%。即使任务没有出现在机器人训练数据中，SALA 检索结果的语义相似度仍为 0.31，接近共享任务的 0.32。

### 证据支持到哪里

SALA 提供了一条实用路径，让无动作人类视频与机器人控制共享监督接口。原子动作语言给未配对片段提供关系标签，机器人动作解码器提供控制锚点，stop-gradient 保持机器人潜在动作作为稳定目标。冻结的潜在动作教师随后让人物视频训练同一个动作专家。

结果支持两项具体判断。语言对齐改善跨本体的潜在动作对应关系，也提高随机化仿真中的成功率。增加人类视频能在测试预算内改善离线动作预测和真实任务成功率。随机化场景的差距与检索指标说明，这些收益超出了平均成功率的小幅波动。

边界条件同样需要保留。Tokenizer 训练仍依赖原子动作标注，尽管策略阶段不需要这些标注。预训练 scaling 每个预算只运行一次，评价指标是离线验证 L1 误差，因此 2,678 小时之后的趋势及其对真机成功率的直接影响仍然开放。真机部分覆盖四个任务，每个任务 20 次试验。后训练固定遥操作集合，清晰隔离了人类视频这根轴；遥操作与人类视频共同 scaling 的行为还没有直接测量。

更一般的启示是，视频重建与动作语义回答不同问题。重建说明发生了一次变化，语言对齐说明哪些变化在不同本体之间应当被视为相关。SALA 用后者塑造潜在表示，再让前者变成能够控制机器人的策略目标。

</div>
