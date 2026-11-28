---
title: "[Reading Notes] Distilling Kimi-K3.1-Pro into Qwen3.8-27B: Jagged Intelligence, Off-Policy Distillation, and Protecting Adjacent Skills"
date: 2026-11-28
permalink: /posts/2026/11/distilling-kimi-into-qwen/
excerpt: "Notes on Together AI's distillation study: how off-policy SFT with 3,834 teacher translations taught Qwen3.8-27B Lao at 93% of Kimi-K3.1-Pro's score while preventing catastrophic forgetting in Thai."
tags:
  - Reading Notes
  - AI
  - Post-Training
  - Knowledge Distillation
  - LLM
  - Continual Learning
  - Multilingual NLP
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## Introduction: A Blind Spot Inside a Capable Small Model

Ask **Qwen3.8-27B** to translate an English sentence into Lao, and something revealing happens. The model captures the meaning of the sentence accurately, then writes the answer in **Thai**. Lao and Thai are closely related Southwestern Tai languages, yet they use distinct scripts. On the full 1,012-sentence **FLORES-200** Lao devtest set, base Qwen3.8-27B scores just **5.5 chrF++**, with only **11%** of its outputs written in Lao script. On the same test set, **Kimi-K3.1-Pro** scores **47.5 chrF++**.

This failure exemplifies **jagged intelligence** in small language models: a compact model performs strongly across broad benchmarks while collapsing on one narrow capability that a frontier model handles effortlessly. Together AI's engineering report, *Distilling Kimi-K3.1-Pro into Qwen3.8-27B: Teaching a model a new language*, documents how the team closed **92%** of this gap using **off-policy distillation** on Together Post-Training. Training a LoRA adapter on roughly 3,800 Kimi-K3.1-Pro Lao translations lifted the 27B student to **44.3 chrF++** (**93%** of the teacher's score) and **100%** Lao script compliance, while keeping Thai intact—at a total experimental cost of **$260**. [Together AI Blog](https://www.together.ai/blog/distilling-kimi-into-qwen) · [Post-Training Cookbook](https://github.com/togethercomputer/post-training-cookbook)

What makes this technical write-up worth studying closely is the sequence of surprises along the way. Fixing Lao took only 25 gradient steps in the first attempt; preserving Thai while doing so proved far harder. These notes trace the diagnostic logic, experimental design, training dynamics, and engineering economics of Together AI's study, followed by a separate section of lessons for post-training, continual learning, and embodied AI.

## 1. Diagnosing the Gap Before Training: Meaning vs. Language Identity

Before training anything, the authors screened 11 languages using just **50 sentences per language** from FLORES-200. Kimi-K3.1-Pro outperformed Qwen3.8-27B on all 11, and Lao stood out as the sharpest gap by a wide margin (**49.0** vs. **7.2 chrF++** on the 50-sentence screen).

Inspecting the raw outputs explained why the score was so low. On `chrF++` (a 0-to-100 measure of character and word n-gram overlap against human references), a Thai sentence shares almost nothing with a Lao reference. Across the 50 screened Lao prompts, base Qwen3.8-27B produced Thai script in **45 sentences** and Lao script in only **6**:

- **English**: *"We now have 4-month-old mice that are non-diabetic that used to be diabetic," he added.*
- **Qwen3.8-27B (base)**: *“ปัจจุบันเรามีหนูอายุ 4 เดือนที่ไม่เป็นโรคเบาหวาน ซึ่งเคยเป็นโรคเบาหวานมาก่อน” เขากล่าวเสริม* (accurate Thai, wrong language)
- **Kimi-K3.1-Pro**: *"ພວກເຮົາຕອນນີ້ມີໜູອາຍຸ 4 ເດືອນ ທີ່ບໍ່ເປັນໂຣກເບົາຫວານ ເຊິ່ງເຄີຍເປັນໂຣກເບົາຫວານມາກ່ອນ," ລາວກ່າວຕື່ມ.*

To verify whether the student lacked translation semantics or language routing, the authors measured **round-trip adequacy**: Kimi-K3.1-Pro translated each model's Lao output back into English, and that back-translation was scored against the original English. Base Qwen3.8-27B's Thai output scored **64.6**, slightly above human Lao references (**64.0**), while the best distilled student reached **65.7** with **100%** Lao script. The base model already grasped the meaning; its primary failure was **language identity**. That diagnosis immediately explains why every training run pushed Lao script rate to 100% by the very first evaluation (25 or 50 steps in).

Because scores vary slightly across sample sizes, the authors kept three clean FLORES-200 slices strictly separated from training (FLORES-200 devtest was never trained on):

| FLORES-200 Slice | Role in Study | Base Qwen3.8-27B (Lao) | Kimi-K3.1-Pro Teacher (Lao) |
|---|---|---:|---:|
| 50 sentences / language | 11-language initial screen | 7.2 | 49.0 |
| 300 devtest sentences | Mid-training evals & Thai retention | 6.7 | 47.3 |
| All 1,012 devtest sentences | Start/end & headline Lao results | 5.5 | 47.5 |

## 2. Cross-Tokenizer Reality: Why Off-Policy Distillation Fits Here

Knowledge distillation from a large teacher to a smaller student typically takes one of two routes:

1. **On-policy distillation (OPD)**: As described in Thinking Machines Lab's post on the topic, the student generates rollouts and the teacher grades every token with its log-probabilities. In practice, token-level scoring requires both models to share a tokenizer. [Thinking Machines: On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/)
2. **Off-policy distillation**: The teacher generates complete text outputs, and the student learns to imitate them through supervised fine-tuning (SFT).

Because **Kimi-K3.1-Pro** and **Qwen3.8-27B** belong to different model families with different tokenizers, standard OPD was off the table. Off-policy distillation sidestepped the tokenizer mismatch and kept teacher compute inexpensive: every teacher translation was a standard serverless chat completion, so the large Kimi model never occupied a dedicated training GPU cluster.

Two empirical choices in the teacher data pipeline proved decisive:

- **Turn thinking off for translation**: Reasoning traces hurt both quality and cost on this task. With `thinking` enabled, Kimi-K3.1-Pro scored **43.5 chrF++** on the 300-sentence Lao slice and consumed roughly **8×** as many tokens. With `chat_template_kwargs={"thinking": False}` and `temperature=0.0`, it scored **47.3 chrF++** while averaging about **175 output tokens** per Lao sentence. At serverless rates of **$2 / 1M input tokens** and **$10 / 1M output tokens**, generating all **4,000** Lao translations cost **$7.46**.
- **Filter teacher outputs before SFT**: Every translation had to pass a lightweight check requiring at least **70%** of its letters to belong to the target script and rejecting verbatim echoes of the English source. That filter removed **4%** of Kimi-K3.1-Pro's Lao outputs before training.

## 3. The Thai Surprise: Catastrophic Regression and Single-Metric Traps

To measure progress honestly during training, the team tracked four signals simultaneously: FLORES-200 Lao `chrF++`, Lao-script rate, **Thai retention** (`chrF++` on 300 English-to-Thai sentences), and round-trip adequacy.

Evaluating Thai turned an apparent victory into the central finding of the post. A control run trained Qwen3.8-27B directly on **945 human Lao translations** from FLORES dev with no teacher involved. Within **25 steps**, Lao jumped from **6.7** to **43.3** and eventually reached **44.7 chrF++** on the full 1,012-sentence test set—the highest Lao score of any student run. Simultaneously, Thai collapsed from **46.7** to **11.7** within those same 25 steps and finished at **5.3**, with **0%** of Thai answers written in Thai script. The model had overfitted to a degenerate rule: *"output Lao whenever asked to translate"*, flipping the original failure mode in the exact opposite direction.

Had the team evaluated Lao alone, they would have shipped the checkpoint that broke Thai.

Replacing the 945 human references with **965 Kimi-K3.1-Pro Lao translations** slowed the regression substantially: Thai held steady for two epochs before slipping to **44.3** in the third epoch, with **17 of 300** Thai answers bleeding into Lao script. Mixing roughly **1,000 Kimi-K3.1-Pro Thai translations** (989 post-filter rows from Wikipedia) into the SFT set eliminated the regression altogether. Across both mixed runs, Thai never dipped below **47.3** at any evaluation checkpoint and finished at **47.4** and **47.8**—improving over the **46.7** base model.

## 4. Supply, Consistency, and Why More Data Beats More Epochs

With Thai protected, one question remained: why did the ~965-example distilled runs score **41.8** and **41.9** on FLORES-200 devtest, lagging the 945-example human-reference run (**44.7**) by nearly three points?

The authors pinpoint two complementary factors:

1. **Reference-style alignment vs. teacher consistency**: FLORES dev and devtest were created through the same human translation workflow, so fine-tuning on dev adapts the student to devtest's human phrasing conventions. Scored against Kimi-K3.1-Pro's own translations instead, the distilled student rose from **8** to **58 chrF++**, whereas the human-SFT student reached **47**. Remarkably, the training loss curves in the appendix reveal that Kimi's Lao is also *easier* for the student to fit: on the exact same FLORES dev source sentences, cross-entropy loss started at **0.36 nats/token** (ending at **0.06**) on Kimi translations versus **0.54** (ending at **0.16**) on human translations. A single model exhibits higher stylistic consistency than a team of human translators, leaving less variance for the student to absorb.
2. **Data supply beats repeated epochs**: FLORES dev ends at 997 human pairs, whereas a teacher model can translate arbitrary English text. Translating **3,000 English Wikipedia sentences** expanded the filtered Lao set from **965** to **3,834** examples (plus **989** Thai examples) and raised Lao `chrF++` from **41.9** to **44.3**—within 0.4 points of human-reference SFT, with Thai untouched. Measured from baseline to teacher, this closes **92%** of the gap: `(44.3 - 5.5) / (47.5 - 5.5) = 0.92`, reaching **93%** of Kimi-K3.1-Pro's absolute score.

| Run | Training Data | Steps / Epochs | Trained Tokens | Loss (First 10 → Last 25) | Lao chrF++ (1,012) | Lao Script | Thai chrF++ (300) |
|---|---|---:|---:|---:|---:|---:|---:|
| Base student (Qwen3.8-27B) | None | — | — | — | 5.5 | 11% | 46.7 |
| SFT on human references | 945 human Lao (FLORES dev) | 177 / 3 | 0.37M | 0.54 → 0.16 | 44.7 | 100% | 5.3 |
| Distilled, Lao only | 965 Kimi Lao | 180 / 3 | 0.38M | 0.36 → 0.06 | 41.8 | 100% | 44.3 |
| Distilled, Lao + Thai | 965 Kimi Lao + 989 Kimi Thai | 366 / 3 | 0.49M | 0.43 → 0.06 | 41.9 | 100% | 47.4 |
| Distilled, Lao + Thai (4× Lao) | 3,834 Kimi Lao + 989 Kimi Thai | 602 / 2 | 1.11M | 0.43 → 0.13 | **44.3** | **100%** | **47.8** |
| Teacher (Kimi-K3.1-Pro) | — | — | — | — | 47.5 | 100% | 49.9 |

The appendix highlights a diagnostic warning that applies widely to SFT: **training loss drops steeply at every epoch boundary even when held-out quality stalls**. Across the four Lao runs, cross-entropy loss dropped by more than half after epoch 1 simply because the model was seeing repeated rows, while held-out `chrF++` on the 300-sentence slice shifted by only **−1 to +3 points**. Scaling fresh teacher examples beat extra passes decisively: a single epoch of the 4× dataset scored **43.2** on the 300-sentence test slice, outperforming three full epochs on the smaller Lao + Thai dataset (**41.3**).

## 5. Generalizing to Five Languages—and Where Distillation Struggles

To confirm the recipe did not rely on a quirk of Lao and Thai, the team trained **one shared LoRA adapter** across five languages: Lao, Northern Sotho, and Zulu (the three largest teacher-student gaps in the 11-language screen), Yoruba (the lowest-scoring Latin-script language for both models), and Thai for retention. The dataset contained **8,871 Kimi-K3.1-Pro translations** (~2,000 per target language and ~1,000 for Thai), trained for **831 steps** (**1.5 epochs**, **1.04M** trained assistant tokens, loss **0.82 → 0.30**).

| Language | Eval Slice | Base Qwen3.8-27B | Distilled (5-Lang Adapter) | Kimi-K3.1-Pro Teacher | Gap Closed |
|---|---:|---:|---:|---:|---:|
| Lao | 1,012 | 5.5 | 41.8 | 47.5 | 87% |
| Northern Sotho | 300 | 32.7 | 48.0 | 50.7 | 85% |
| Yoruba | 300 | 20.7 | 25.7 | 27.7 | 71% |
| Zulu | 300 | 37.7 | 39.2 | 50.3 | 12% |
| Thai (retention) | 300 | 46.7 | 48.0 | 49.9 | Improved |

Every language improved and Thai climbed to **48.0**, yet the uneven gain on **Zulu (12% gap closed)** is equally instructive. During training, **1% to 2%** of Zulu generations slipped into repetition loops—a concrete decoding/data failure mode that cannot be spotted from aggregate loss alone. The authors note that adding more Zulu data or applying a repetition penalty is the natural next step.

## 6. Engineering Anatomy and Economics

Together Post-Training separates client-side orchestration from GPU execution through a **model resource** hosted on **B200-SXM** GPUs. One resource holds the base `Qwen/Qwen3.8-27B` weights together with a **trainer** (`forward_backward`, `optim_step`) and one **generator replica** (`weights_sync`, `sample_batch`). Syncing LoRA weights directly into the co-located generator every 25 steps allowed the loop to evaluate live generations on 300 test sentences in roughly **20 seconds**, avoiding the operational overhead of deploying separate inference endpoints.

The exact training recipe is deliberately compact:

- **Adapter & masking**: LoRA **rank 64** (the maximum supported for Qwen3.8-27B) and **alpha 128**; `get_codec("Qwen/Qwen3.8-27B", enable_thinking=False)` with `TRAIN_ON_LAST` loss masking (`max_length=2048`), placing loss weight `0` on user prompts and `1` only on assistant translation tokens plus the end-of-turn token.
- **Optimization**: Batch size **16**, peak learning rate **1e-4**, **5% linear warmup** (30 steps in the best Lao run), and cosine decay to **1e-5** (one-tenth of peak).
- **Wall-clock time and budget**: Provisioning took **4 to 5 minutes**; the first step took **2.5 to 3 minutes**, and subsequent steps ran at a median of **2.6 to 3.2 seconds**. The headline 4× Lao + Thai run occupied its resource for **46 minutes** total (**33.7 minutes** of training steps, **7.1 minutes** across 30 evaluation passes, and the rest in session startup, checkpoint registration, and shutdown). All experiments in the entire report together totaled **$260** on B200s, with teacher data generation accounting for just **$7.46**.

## 7. Reflections Beyond Translation: Continual Learning, Post-Training, and Embodied AI

The observations in this section are my own interpretations and extensions of Together AI's study; the original authors did not make these claims directly.

### Separate missing knowledge from misrouted execution before training

When a model scores near zero on a benchmark, the instinctive reaction is to assume it lacks deep domain knowledge and needs massive pretraining or complex RL. Together AI's round-trip adequacy check showed the opposite: base Qwen3.8-27B already represented the English-to-Tai semantics (64.6 adequacy), and mainly failed to route output into Lao script. In robotics and embodied AI, the same diagnostic split matters constantly. A vision-language-action model or manipulation policy may fail a task at 10% success because it lacks geometric understanding, or simply because its action head collapses into an adjacent high-frequency prior (such as pushing an object when it should pinch it). Inspecting intermediate behavior before scaling compute tells you whether you need a few thousand targeted examples or a deeper architectural change.

### Continual learning fails at the nearest neighboring basin first

Catastrophic forgetting rarely strikes uniformly across distant tasks. It hits the closest semantic neighbor sharing overlapping features and prompts—Thai when teaching Lao. Any post-training pipeline that evaluates only the target skill is flying blind: it will routinely select the checkpoint that destroys an adjacent capability. Whether you are fine-tuning an LLM on a new coding language, adding a new tool schema to an agent, or fine-tuning a robot policy on a new grasp primitive, the evaluation suite must explicitly include *retention canaries* for the nearest competing skills, and the training mixture should include replay data for those neighbors.

### Offline teacher synthesis and filtering form a general compression flywheel

Off-policy distillation works here because a large model acts as an inexpensive offline data factory while a small LoRA adapter compiles that capability into fast, cheap local weights. Notice two practical subtleties from the appendix: *filtering* teacher outputs (the 70% script rule) prevents garbage amplification, and *fresh diversity* beats overfitting on repeated epochs once training loss starts dropping at epoch boundaries. The same pattern transfers naturally to embodied AI via simulation: a slower general-purpose foundation model can generate and filter successful trajectories offline in a simulator, and a compact student policy can distill those verified behaviors into real-time physical control—provided we watch for repetition/mode-collapse failure modes (the Zulu lesson) and measure adjacent-skill retention (the Thai lesson).

| Principle | Evidence in Together AI's Study | Question to Ask Before Your Next Post-Training Run |
|---|---|---|
| Screen and diagnose first | 50 sentences found Lao (7.2 vs. 49.0); round-trip adequacy (64.6) revealed a script/routing bug | Does the student lack underlying competence, or is it routing to the wrong output mode? |
| Protect adjacent skills | Human Lao SFT broke Thai (46.7 → 5.3); mixing 989 Thai rows raised Thai to 47.8 | Which neighboring skill shares the closest prompt or feature space, and is it in my eval loop? |
| Match teacher mode to task | Turning thinking off raised Kimi Lao from 43.5 to 47.3 at 1/8 the output tokens ($7.46 total) | Does extra test-time reasoning actually help teacher data quality, or just inflate noise and cost? |
| Prefer fresh data over epochs | 1 epoch of 4× data (43.2) beat 3 epochs of 1× data (41.3) despite higher training loss | Is my dropping loss reflecting real generalization, or memorization across epoch boundaries? |
| Inspect tail failure modes | Zulu closed only 12% of the gap because 1–2% of outputs entered repetition loops | What specific qualitative failure appears in the worst 2% of generations? |

The headline result of this report is impressive on its own: for less than eight dollars of teacher inference and under an hour of LoRA training, a 27B open model learned a language it could barely write and reached 93% of a frontier teacher's score. Yet the deeper lesson is methodological. As post-training becomes cheap enough to patch jagged gaps on demand, the real bottleneck shifts from *making a model learn one new trick* to *designing evaluations and data mixtures that keep the rest of its mind intact*. How systematically do our current post-training pipelines map—and guard—the invisible neighbors of every skill we teach?

## Further Reading

- Together AI, *Distilling Kimi-K3.1-Pro into Qwen3.8-27B: Teaching a model a new language*, [Together AI Blog](https://www.together.ai/blog/distilling-kimi-into-qwen).
- Together AI, *Post-Training Cookbook* (`recipes/distillation/screen_languages.py`, `lao_from_kimi_k31_pro.py`, `multilingual_from_kimi_k31_pro.py`), [GitHub repository](https://github.com/togethercomputer/post-training-cookbook).
- Together AI, [Together Post-Training Documentation](https://docs.together.ai/docs/post-training/overview).
- Thinking Machines Lab, [On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/), for the on-policy token-level distillation baseline contrasted with off-policy SFT.
- NLLB Team et al., *No Language Left Behind: Scaling Human-Centered Machine Translation* (FLORES-200 benchmark), [arXiv:2207.04672](https://arxiv.org/abs/2207.04672).

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，可通过顶部导航栏的语言按钮切换。

## 引言：能力很强的小模型，也会有清晰的盲区

让 **Qwen3.8-27B** 把一句英文翻译成老挝语（Lao），会出现一个很有意思的现象：模型基本读懂了原句的意思，却用**泰语（Thai）**写出了译文。老挝语和泰语同属西南台语支，彼此亲缘很近，但书写文字完全不同。在包含 1,012 个句子的完整 **FLORES-200** 老挝语 devtest 测试集上，基础版 Qwen3.8-27B 的 `chrF++` 仅有 **5.5 分**，输出中真正使用老挝文的句子只占 **11%**；同一套测试集上，**Kimi-K3.1-Pro** 能拿到 **47.5 分**。

这是一个典型的**锯齿状智能（jagged intelligence）**案例：一款广受欢迎的中小规模开源模型在多数任务上表现扎实，却在某个具体的细分能力上彻底失灵，而更大的前沿模型应对起来游刃有余。Together AI 的工程实践文章《*Distilling Kimi-K3.1-Pro into Qwen3.8-27B: Teaching a model a new language*》完整记录了团队如何借助 Together Post-Training 的**离线策略蒸馏（off-policy distillation）**填补这一鸿沟。团队用 Kimi-K3.1-Pro 生成了约 3,800 条老挝语译文训练 LoRA 适配器，将 27B 学生模型的老挝语成绩提升至 **44.3 chrF++**（达到教师模型分数的 **93%**，缩小了 **92%** 的基线差距，老挝文输出率达到 **100%**），同时完好保住了泰语能力；全部实验加起来的总成本为 **260 美元**。[Together AI 原文](https://www.together.ai/blog/distilling-kimi-into-qwen) · [Post-Training Cookbook 代码库](https://github.com/togethercomputer/post-training-cookbook)

这篇文章最值得精读的地方，在于实验推进过程中接连暴露出来的反直觉现象：教会模型写老挝语，第一次尝试只用了 25 步梯度更新就做到了；真正的难点在于教会老挝语的同时别把泰语练废。下文先按问题诊断、方法取舍、实验结果与工程细节梳清原文脉络，再在独立章节中补充我对后训练、持续学习与具身智能的延伸思考。

## 1. 训练前先做诊断：究竟是“不懂语义”，还是“走错了语言通道”？

团队在动用训练算力之前，先在 11 种语言上做了快速筛查，每种语言只取 **50 条** FLORES-200 句子。Kimi-K3.1-Pro 在全部 11 种语言上都领先 Qwen3.8-27B，其中老挝语的落差遥遥领先（50 句筛查集上为 **49.0** 对 **7.2 chrF++**）。

直接检查原始输出，就能看清低分背后的原因。`chrF++`（0 到 100 分）衡量生成译文与人工参考译文在字符和词 n-gram 上的重合度，泰语译文和老挝文参考译文在字符层面几乎没有重叠。在 50 条老挝语筛查题中，基座 Qwen3.8-27B 有 **45 条**包含泰文，仅有 **6 条**包含老挝文：

- **英文原句**：*"We now have 4-month-old mice that are non-diabetic that used to be diabetic," he added.*
- **Qwen3.8-27B（基座）**：*“ปัจจุบันเรามีหนูอายุ 4 เดือนที่ไม่เป็นโรคเบาหวาน ซึ่งเคยเป็นโรคเบาหวานมาก่อน” เขากล่าวเสริม*（泰语意思通顺，但语种错了）
- **Kimi-K3.1-Pro（教师）**：*"ພວກເຮົາຕອນນີ້ມີໜູອາຍຸ 4 ເດືອນ ທີ່ບໍ່ເປັນໂຣກເບົາຫວານ ເຊິ່ງເຄີຍເປັນໂຣກເບົາຫວານມາກ່ອນ," ລາວກ່າວຕື່ມ.*

为了区分模型究竟是“没理解语义”还是“输出语种路由出错”，作者引入了**回译充分度（round-trip adequacy）**指标：请 Kimi-K3.1-Pro 把各系统的输出重新翻回英文，再与原始英文比对得分。结果令人意外：基座 Qwen3.8-27B 的泰语输出拿到了 **64.6 分**，甚至略高于人工老挝语参考译文的 **64.0 分**；最优蒸馏学生模型则达到 **65.7 分**，且 100% 使用老挝文。这说明基座模型原本就掌握了语义映射，真正缺失的是**语言身份（language identity）**的切换。这一诊断也直接解释了后续的一个现象：无论哪一组训练实验，都在首次评测（第 25 步或第 50 步）就把老挝文输出率拉到了 100%。

文中在不同位置报告的基线分数略有差异，这是因为团队按用途划分了三个 FLORES-200 测试切片（整个 devtest 集严格隔离，从未参与训练）：

| FLORES-200 切片 | 用途 | 基座 Qwen3.8-27B（老挝语） | 教师 Kimi-K3.1-Pro（老挝语） |
|---|---|---:|---:|
| 每语言 50 句 | 11 语种初步筛查 | 7.2 | 49.0 |
| 300 句 devtest | 训练中途评测与泰语保留评测 | 6.7 | 47.3 |
| 全部 1,012 句 devtest | 训练起止评测与核心结论指标 | 5.5 | 47.5 |

## 2. 跨分词器的现实约束：为什么选择离线策略蒸馏

把大模型的能力迁移给小模型，常见的蒸馏路线有两条：

1. **在线策略蒸馏（On-Policy Distillation, OPD）**：如 Thinking Machines Lab 相关文章所述，先由学生模型自主生成文本，再由教师模型对学生输出的每个 token 计算对数概率并逐 token 打分。在工程实践中，这类逐 token 对齐通常要求师生模型共享同一个分词器（tokenizer）。[Thinking Machines: On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/)
2. **离线策略蒸馏（Off-Policy Distillation）**：由教师模型生成完整译文，再以监督微调（SFT）让小模型模仿教师输出。

**Kimi-K3.1-Pro** 与 **Qwen3.8-27B** 来自不同模型家族，分词器并不共享，因此团队选用了离线策略蒸馏。这种做法在算力组织上非常轻巧：教师端每次生成只需调用普通的无服务器（serverless）聊天接口，庞大的 Kimi 模型无需单独占用训练卡。

在构建教师数据的流程里，有两个工程细节起到了关键作用：

- **翻译任务关闭思考模式（thinking）**：长链条推理在翻译场景下既耗费 token 又拖累质量。在 300 句老挝语测试集上，开启 thinking 时 Kimi-K3.1-Pro 得分降为 **43.5 chrF++**，token 消耗暴增至大约 **8 倍**；通过 `chat_template_kwargs={"thinking": False}` 和 `temperature=0.0` 关闭思考后，得分回升到 **47.3 chrF++**，平均每条老挝语译文仅输出约 **175 个 token**。按无服务器定价（输入 **2 美元/百万 token**、输出 **10 美元/百万 token**）核算，生成全部 **4,000 条**老挝语教师译文仅花费 **7.46 美元**。
- **训练前做简单而严格的脚本过滤**：系统只保留至少 **70%** 字母属于目标书写系统、且非英文原文直接复读的样本。这条规则筛掉了 Kimi-K3.1-Pro 老挝语输出中约 **4%** 的异常样本。

## 3. 泰语崩塌的意外：灾难性遗忘与单一指标陷阱

为了让训练过程可见、可控，团队在每个评估节点同时监控四项指标：FLORES-200 老挝语 `chrF++`、老挝文比例、**泰语保留度**（300 句英译泰 `chrF++`）以及回译充分度。

正是泰语监控，让一次看似大获全胜的对照实验暴露出致命隐患。团队首先跑了一组无教师参与的对照组，直接用 FLORES dev 的 **945 条人工老挝语译文**微调 Qwen3.8-27B。仅仅过了 **25 步**，老挝语就在 300 句测试集上从 **6.7** 飙升至 **43.3**，最终在完整 1,012 句测试集上拿下 **44.7 chrF++**——所有学生模型中的最高分。然而同期检查泰语时，成绩在前 25 步就从 **46.7** 断崖式跌至 **11.7**，训练结束时跌到 **5.3**，泰语回答里的泰文比例归零（**0%**）。模型学到的是一条走捷径的粗暴规则：“只要让我翻译，一律输出老挝语”，把原先“要老挝语给泰语”的故障彻底反了过来。

如果评估体系只盯着老挝语分数，团队就会把这版毁掉泰语的模型当成最优权重发布出去。

将 945 条人工译文换成同一批源句的 **965 条 Kimi-K3.1-Pro 老挝语译文**后，退化速度明显放缓：泰语在前两个 epoch 保持稳定，但在第三个 epoch 依然滑落至 **44.3**，300 条泰语测试里有 **17 条**混成了老挝文。真正的解法是在训练集中混入约 **1,000 条 Kimi-K3.1-Pro 泰语译文**（过滤后为 989 条，来自英文维基百科）。在两组混合训练实验中，泰语在任意检查点都未曾低于 **47.3**，最终定格在 **47.4** 和 **47.8**，反而超过了基座模型原本的 **46.7**。

## 4. 数据供给、风格一致性，以及为什么“加数据”胜过“多跑轮次”

泰语稳住之后，新的问题浮现出来：同样在约 950 条老挝语样本的规模下，人工参考译文微调拿到了 **44.7 分**，而两组蒸馏学生模型分别只有 **41.8** 和 **41.9 分**，差了将近 3 分。

原文给出了两层解释，都很有启发性：

1. **参考风格对齐与教师一致性**：FLORES dev 和 devtest 由同一套人工翻译流程产出，在 dev 上微调天然会向 devtest 的人工措辞习惯靠拢。反过来，如果把 Kimi-K3.1-Pro 自己的译文当作参考标准，蒸馏学生模型会从 **8 分**跃升至 **58 chrF++**，人工微调学生模型只有 **47 分**。更有意思的是附录中的训练损失对比：面对完全相同的 FLORES dev 源句，学生模型拟合 Kimi 译文时的初始交叉熵损失只有 **0.36 nats/token**（末期 **0.06**），而拟合人工译文时高达 **0.54**（末期 **0.16**）。单一模型生成的译文在风格上比多位人工译者更一致，学生模型需要消化的噪声方差更小。
2. **数据供给的上限决定天花板**：FLORES dev 只有 997 条人工对照句，用完即止；教师模型却可以翻译任何现成的英文语料。团队让 Kimi-K3.1-Pro 额外翻译了 **3,000 条英文维基百科句子**，把老挝语训练样本从 **965 条**扩充到 **3,834 条**（搭配 989 条泰语样本），老挝语得分随即从 **41.9** 攀升至 **44.3 chrF++**——与人工微调只差 0.4 分，且泰语完好无损。按基座到教师的差距计算，该方案弥合了 **92%** 的鸿沟：`(44.3 - 5.5) / (47.5 - 5.5) = 0.92`，达到教师绝对分数的 **93%**。

| 实验组 | 训练数据 | 步数 / 轮次 | 训练 Token 数 | 损失（前 10 步 → 末 25 步） | 老挝语 chrF++ (1,012) | 老挝文比例 | 泰语 chrF++ (300) |
|---|---|---:|---:|---:|---:|---:|---:|
| 基座学生（Qwen3.8-27B） | 无 | — | — | — | 5.5 | 11% | 46.7 |
| 人工参考译文 SFT | 945 条人工老挝语（FLORES dev） | 177 / 3 | 0.37M | 0.54 → 0.16 | 44.7 | 100% | 5.3 |
| 蒸馏：仅老挝语 | 965 条 Kimi 老挝语 | 180 / 3 | 0.38M | 0.36 → 0.06 | 41.8 | 100% | 44.3 |
| 蒸馏：老挝语 + 泰语 | 965 条老挝语 + 989 条泰语（Kimi） | 366 / 3 | 0.49M | 0.43 → 0.06 | 41.9 | 100% | 47.4 |
| 蒸馏：老挝语 + 泰语（4× 老挝语） | 3,834 条老挝语 + 989 条泰语（Kimi） | 602 / 2 | 1.11M | 0.43 → 0.13 | **44.3** | **100%** | **47.8** |
| 教师模型（Kimi-K3.1-Pro） | — | — | — | — | 47.5 | 100% | 49.9 |

附录还揭示了一个在各类 SFT 工程中极易误判的现象：**每跨过一个 epoch 边界，训练损失都会断崖式下降，但验证集质量几乎原地踏步**。四组老挝语实验在第一轮结束后，训练损失均下降超过一半，原因只是模型开始反复见到背过的样本；同期 300 句测试集上的 `chrF++` 波动幅度仅在 **−1 到 +3 分**之间。增加新数据的收益远大于增加训练轮次：4× 数据集只跑 **1 个 epoch** 就在 300 句测试集上达到 **43.2 分**，直接超过了小数据集跑满 **3 个 epoch** 的 **41.3 分**。

## 5. 推广到五种语言：一个多语适配器与祖鲁语的警示

为了验证这套流程并非只在“老挝语—泰语”这对特例上奏效，团队训练了**单个共享 LoRA 适配器**，覆盖五种语言：11 语种筛查中差距最大的老挝语、北索托语（Northern Sotho）与祖鲁语（Zulu），两种模型在拉丁字母语系中得分最低的约鲁巴语（Yoruba），以及用于能力保留的泰语。训练集共包含 **8,871 条 Kimi-K3.1-Pro 译文**（四种目标语各约 2,000 条，泰语约 1,000 条），共训练 **831 步**（**1.5 个 epoch**，**1.04M** 有效训练 token，交叉熵损失从 **0.82** 降至 **0.30**）。

| 语言 | 评测切片 | 基座 Qwen3.8-27B | 五语蒸馏适配器 | 教师 Kimi-K3.1-Pro | 差距弥合比例 |
|---|---:|---:|---:|---:|---:|
| 老挝语（Lao） | 1,012 | 5.5 | 41.8 | 47.5 | 87% |
| 北索托语（Northern Sotho） | 300 | 32.7 | 48.0 | 50.7 | 85% |
| 约鲁巴语（Yoruba） | 300 | 20.7 | 25.7 | 27.7 | 71% |
| 祖鲁语（Zulu） | 300 | 37.7 | 39.2 | 50.3 | 12% |
| 泰语（能力保留） | 300 | 46.7 | 48.0 | 49.9 | 高于基座 |

五种语言全部录得提升，泰语也稳步上升到 **48.0**，但**祖鲁语仅弥合了 12% 差距**这一结果同样极具参考价值。团队排查发现，训练过程中有 **1% 到 2%** 的祖鲁语输出陷入了重复循环（repetition loops）。这类局部解码异常藏在均值损失背后，单看 loss 曲线很难察觉；作者指出，优先排查方向是扩充祖鲁语样本或引入重复惩罚（repetition penalty）。

## 6. 工程架构与成本拆解

Together Post-Training 把客户端调度代码与云端 GPU 资源解耦。一个挂在 **B200-SXM** 集群上的模型资源（model resource）会同时加载基础模型权重、`trainer`（负责 `forward_backward` 与 `optim_step`）以及一个共置的 `generator` 副本（负责 `weights_sync` 与 `sample_batch`）。每训练 25 步同步一次 LoRA 权重并在同一资源上直接抽样评测，300 条测试句只需约 **20 秒**，省去了额外拉起独立推理端点的复杂度。

整套超参数配置相当克制：

- **适配器与损失掩码**：LoRA **rank 64**（Qwen3.8-27B 上限）、**alpha 128**；通过 `get_codec("Qwen/Qwen3.8-27B", enable_thinking=False)` 按模型原生模板渲染对话，配合 `TRAIN_ON_LAST` 掩码（`max_length=2048`），提示词损失权重置 `0`，仅对助手译文及结束符计算交叉熵损失，让模型准确学会何时停止。
- **优化调度**：批大小 **16**，峰值学习率 **1e-4**，前 **5%** 步数线性预热（最优老挝语实验为 30 步），随后余弦衰减至峰值的十分之一（**1e-5**）。
- **耗时与账单**：集群就绪耗时 **4 到 5 分钟**；每个实验的首步耗时 **2.5 到 3 分钟**，此后单步中位耗时 **2.6 到 3.2 秒**。最优的 4× 老挝语 + 泰语实验全程占用资源 **46 分钟**（其中训练步 33.7 分钟，30 轮评测共 7.1 分钟，其余为启动、保存检查点与释放）。文章中所有实验的 B200 训练与推理总开销合计 **260 美元**，其中教师数据生成仅占 **7.46 美元**。

## 7. 延伸思考：对持续学习、后训练与具身智能的启示

以下讨论是我阅读 Together AI 案例后的延伸理解与迁移思考，并非原文作者直接提出的论点。

### 动用训练算力前，先区分“缺少知识”与“输出路由出错”

模型在某个基准上拿到个位数分数时，人的第一反应往往是能力缺失严重，需要海量预训练或复杂强化学习。Together AI 的回译充分度指标却指出了另一种可能：基座 Qwen3.8-27B 的底层语义表示本来就在（回译得分 64.6），真正坏掉的是输出语言通道的选择。在机器人与具身智能研究中，这个区分同样常见。一个视觉语言动作模型（VLA）或操作策略在某项任务上成功率只有 10%，可能是几何理解确实不够，也可能只是动作头在相似场景下塌缩到了某个高频先验（例如该捏取时习惯性去推）。训练前多看几十条原始失败轨迹，往往能直接判断该补几千条定向数据，还是该动架构。

### 持续学习的遗忘，总是先击中最近的邻域

灾难性遗忘很少均匀地破坏所有旧知识，它最先吞噬的往往是提示词高度相似、特征空间紧挨着的“近邻能力”——教老挝语时首当其冲的就是泰语。任何只盯着目标指标打分的后训练流水线都在蒙眼狂奔：它会精准挑出那个把近邻能力破坏得最彻底的检查点。无论是给大语言模型补一种小众编程语言、给智能体新增一类工具调用规范，还是给灵巧手策略追加一种新的抓取动作，评测集里都必须放进**近邻能力的金丝雀探针（retention canaries）**，并在训练配比中主动混入近邻回放数据。

### 离线强教师合成与轻量过滤构成通用的能力压缩飞轮

离线策略蒸馏在这里跑得如此顺畅，核心在于把昂贵的大模型变成了低成本的离线数据工厂，再由轻量 LoRA 适配器把能力固化进小模型权重里。附录里的两条经验值得放进通用工程清单：其一，哪怕教师很强，**轻量规则过滤**（如 70% 脚本占比与反复读检查）依然不可或缺；其二，一旦训练损失在 epoch 边界阶梯式下挫，就该警惕记忆化，**扩充新鲜数据远比硬加轮次划算**。把这套逻辑放到具身智能里看，也和“通用大模型在仿真器里离线慢思考、生成并筛选高质量轨迹，再蒸馏给紧凑端侧执行策略”的路线异曲同工——同时提醒我们，必须像盯紧泰语那样盯紧已有技能的保留，并像排查祖鲁语那样去抓尾部 1%–2% 的循环崩溃样本。

| 工程原则 | Together AI 实验中的证据 | 下一次后训练前值得自问的问题 |
|---|---|---|
| 先筛查，再诊断根因 | 每语 50 句定位老挝语短板（7.2 vs. 49.0）；回译得分（64.6）暴露语种路由故障 | 学生模型究竟是缺乏底层能力，还是输出模式路由错了？ |
| 显式保护近邻能力 | 纯人工老挝语 SFT 将泰语打崩（46.7 → 5.3）；混入 989 条泰语后升至 47.8 | 哪项已有能力与当前目标最接近，它是否在我的评测闭环里？ |
| 按任务匹配教师推理模式 | 关闭思考模式后 Kimi 老挝语得分从 43.5 升至 47.3，token 仅 1/8（总计 $7.46） | 更长的推理链真的提升了数据质量，还是只增加了噪声与成本？ |
| 优先扩充新数据而非叠轮次 | 4× 数据 1 个 epoch（43.2）超过 1× 数据 3 个 epoch（41.3），尽管后者损失更低 | 损失继续下降是在学新规律，还是在背诵重复样本？ |
| 抽检尾部定性故障 | 祖鲁语仅弥合 12% 差距，根因是 1%–2% 的输出陷入重复循环 | 表现最差的 2% 样本里，具体出现了哪类结构性故障？ |

这篇技术报告的账面结果已经足够漂亮：不到 8 美元的教师生成费、不到一小时的 LoRA 训练，就让 27B 开源模型补齐了一门原本几乎不会写的语言，追上前沿教师 93% 的水准。但它留下的真正启发在于方法论。当后训练便宜到可以随时为小模型“打补丁”时，真正的门槛转向了另一件事：如何在添砖加瓦的同时设计评测与数据配比，护住模型原本完整的能力版图。在我们自己的后训练流水线里，对每一项准备注入的新技能，我们是否真的先画清了它周围那些看不见的“近邻”？

## 延伸阅读

- Together AI，*Distilling Kimi-K3.1-Pro into Qwen3.8-27B: Teaching a model a new language*，[Together AI 官方博客](https://www.together.ai/blog/distilling-kimi-into-qwen)。
- Together AI，*Post-Training Cookbook*（包含 `recipes/distillation/screen_languages.py`、`lao_from_kimi_k31_pro.py`、`multilingual_from_kimi_k31_pro.py`），[GitHub 仓库](https://github.com/togethercomputer/post-training-cookbook)。
- Together AI，[Together Post-Training 官方文档](https://docs.together.ai/docs/post-training/overview)。
- Thinking Machines Lab，[On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/)，了解文中与离线策略蒸馏相对照的在线策略蒸馏方案。
- NLLB Team et al.，*No Language Left Behind: Scaling Human-Centered Machine Translation*（FLORES-200 多语评测基准），[arXiv:2207.04672](https://arxiv.org/abs/2207.04672)。

</div>
