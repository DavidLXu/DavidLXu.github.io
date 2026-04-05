---
title: "Distilling Persons into Agents: A Survey of Recent 'Person-as-Skill' Projects"
date: 2026-04-05
permalink: /posts/2026/04/distilling-persons-into-agents/
tags:
  - AI Agents
  - Claude Skills
  - Digital Twins
  - Persona
  - AI Ethics
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## Introduction

In the past few weeks, an unusual genre of Claude Code *Skills* has quietly appeared on GitHub. They do not automate a workflow or wrap an API. Instead, they try to do something much stranger: **compress a human being into a markdown file.**

A departed colleague, an ex-partner, your own past self, Steve Jobs, Elon Musk — each becomes a `SKILL.md` you can `/invoke` from a terminal. This post surveys six recent projects in this emerging family and asks what they share, where they diverge, and what their existence tells us about how people are beginning to think about AI, memory, and identity.

The projects:

| Target | Project | Author |
|---|---|---|
| Departed colleague | [colleague-skill](https://github.com/titanwings/colleague-skill) | titanwings |
| Ex-partner | [ex-skill (前任.skill)](https://github.com/therealXiaomanChu/ex-skill) | therealXiaomanChu |
| Yourself | [yourself-skill](https://github.com/notdog1998/yourself-skill) | notdog1998 |
| Any public figure (meta-tool) | [nuwa-skill (女娲)](https://github.com/alchaincyf/nuwa-skill) | alchaincyf |
| Steve Jobs | [steve-jobs-skill](https://github.com/alchaincyf/steve-jobs-skill) | alchaincyf |
| Elon Musk | [elon-musk-skill](https://github.com/alchaincyf/elon-musk-skill) | alchaincyf |

---

## 1. Two Families of Design

Reading the six READMEs side by side, a clean split emerges: **intimate distillation** (people you know) versus **cognitive distillation** (people you don't).

### Family A — Intimate Distillation: "Memory + Persona"

`colleague-skill`, `ex-skill`, and `yourself-skill` share a strikingly uniform architecture. All three organize the target person as **two markdown files**:

- **Part A — Memory** (work context / relationship history / life trajectory): the *what* and *when* — institutional knowledge, shared experiences, significant events, domain specifics.
- **Part B — Persona**, a *five-layer* structure:
  1. Hard rules / core principles
  2. Identity
  3. Speech patterns
  4. Emotional / decision responses
  5. Interpersonal behaviors

Execution flow is identical across all three: *incoming message → persona decides attitude → memory supplies context → response rendered in their voice.* The skills ingest WeChat/Feishu/Dingtalk/Slack exports, screenshots, photo EXIF, emails — the raw exhaust of digital relationships — and compile them into two files that Claude can load as a skill.

All three support **incremental updates**, **conversational correction**, and **version control with rollback**. The resemblance is so tight that these three projects almost feel like variants of a single template applied to three different emotional surfaces: workplace continuity, romantic grief, self-understanding.

### Family B — Cognitive Distillation: "Six-Layer Framework Extraction"

`nuwa-skill` and its outputs (`steve-jobs-skill`, `elon-musk-skill`) take a deliberately opposite stance. The tagline is direct: *"不是在复读名人语录，是在用名人的认知框架帮你分析"* — **not repeating quotes, but applying the person's cognitive framework to new analysis.**

Nuwa's six extraction layers:

1. **Expression DNA** — vocabulary, rhythm, rhetorical tics
2. **Mental Models** — 3-7 validated cognitive frameworks
3. **Decision Heuristics** — reasoning shortcuts
4. **Anti-Patterns** — what the person actively refuses
5. **Honest Boundaries** — what the distilled perspective cannot do
6. **Integrity Markers** — intuition, undisclosed beliefs, sudden insights that *cannot* be extracted

A proposed mental model is only admitted if it satisfies **three validation criteria**: it appears across multiple domains, it predicts behavior on novel problems, and it is *not* universal among intelligent people (i.e., it must actually be distinctive).

Nuwa is fundamentally a **multi-agent research pipeline**. Six parallel sub-agents simultaneously scrape books, podcasts, interviews, critic perspectives, decision records, and biographical timelines. Findings are cross-validated. The output is tested against the subject's documented positions, then against novel scenarios where *appropriate uncertainty* should emerge.

The Jobs skill distills, for example: *"focus is saying no to 100 good ideas," "end-to-end control," "mortality as decision filter,"* paired with an Expression DNA of binary vocabulary ("insanely great" vs "shit"), short sentences, extreme certainty. The Musk skill distills: *asymptotic limit analysis*, *five-step algorithm (question → delete → simplify → accelerate → automate)*, *physics as the only hard constraint*.

### The Fork

The two families diverge on a single deep question: **what is a person, for the purposes of simulation?**

- Family A says: **a person is a relational surface.** What matters is how they respond to *you* — tone, habits, inside jokes, the specific texture of interaction. Memory is concrete and particular.
- Family B says: **a person is a thinking engine.** What matters is how they *decide*. Memory is abstracted into models; quotes are seen as symptoms, not substance.

One family is building **echoes**. The other is building **lenses**.

---

## 2. What's Interesting About the Designs

### The five-layer persona is converging into a de facto standard

Three independent Family-A projects all arrived at essentially the same five-layer persona structure (rules → identity → speech → emotion → relational behavior). This is suspicious in a useful way: either they borrowed from each other, or the structure is genuinely the minimum viable description of a "person as agent." I suspect the latter. It mirrors how character designers in games, writers in fiction, and psychologists in trait theory all end up near similar decompositions.

### Nuwa's "integrity markers" are the most honest design choice

Most persona projects overclaim. Nuwa explicitly allocates a layer to *what cannot be extracted*: intuition, undisclosed beliefs, sudden insight. This is rare. Most digital-twin projects try to hide their seams; Nuwa foregrounds them. The validation criterion — *"not universal among intelligent people"* — is also unusually rigorous: it prevents the skill from collapsing into generic "smart founder energy."

### Two opposite answers to Polanyi's Paradox

Family A tries to capture tacit knowledge by **recording behavior densely** and hoping the model will interpolate. Family B tries to capture it by **forcing explicit articulation** of the frameworks behind the behavior. Neither fully succeeds — tacit knowledge, as Polanyi argued, is fundamentally not fully tellable — but they fail in illuminating ways. Family A produces convincing surface mimicry without depth; Family B produces defensible frameworks without lived texture.

### The hardest part is probably the data

All six projects are ultimately bottlenecked on **source material quality**. Family A depends on chat exports that most people have never exported. Family B depends on biographies and long-form interviews that exist only for a few hundred people on Earth. The "distill a person" operation works best for public figures with biographers and for private people whose lives are unusually well-logged. Most humans fall in neither bucket.

---

## 3. Potential Impact

### Useful

- **Institutional continuity.** The colleague-skill use case is genuinely valuable. When a senior engineer leaves, months of onboarding friction follow. A persistent skill that can answer *"why did we choose Kafka over NATS in 2023?"* in their voice and with their context is a real asset.
- **Self-reflection infrastructure.** `yourself-skill` is interesting less as a digital twin than as a *mirror*. Being able to ask "what would past-me have said about this?" is a new form of journaling with retrieval.
- **Cognitive borrowing, not quote-worship.** Nuwa's framing — *use the framework, don't repeat the quote* — is healthier than most "talk to Jobs" products. A Musk-lens that asks "what's the idiocy index here?" is a legitimate analytical tool regardless of one's view of Musk.
- **Low-cost apprenticeship.** Historically, to think like a master you had to read everything they wrote, work next to them, or wait for a biography. Cognitive distillation compresses this — imperfectly, but accessibly.

### Uncomfortable

- **Consent asymmetry.** A departed colleague did not agree to become a skill. An ex-partner definitely did not. "Cyber immortality" is an appealing frame until you are the one being immortalized without asking.
- **Grief laundering.** The `ex-skill` README frames itself as emotional processing. It might also be a device for *not* processing — freezing a relationship at its highest-fidelity snapshot and never letting it end.
- **Flattening of public figures.** Distilling Jobs into 6 mental models is a bet that the distillation *is* the person. For analytic use, that's fine. For people who will inevitably end up *asking Jobs for life advice*, it will produce confidently wrong answers in a recognizable voice.
- **The confident-voice problem.** All six projects output in a specific person's voice. Voice creates trust. Trust applied to an interpolation engine produces fluent hallucinations with someone else's face on them.
- **Authenticity drift.** Every incremental update is a chance for the skill to drift from the original person. After enough updates, whose skill is it?

### Structural

These projects are early signals of a broader pattern: **people are starting to treat humans as compilable artifacts.** Not in a dystopian sense — in an ordinary-tooling sense. The same developers who write `CLAUDE.md` files for their repos are now writing them for their colleagues, their exes, and themselves. Once the interface stabilizes, the social implications will follow: expect "leaving-documents" in workplaces, "memorial skills" for the deceased, and "founder skills" licensed by public figures who want to monetize their cognition.

---

## 4. What I'd Want to See Next

- **Hybrid designs** that combine Family A's concrete memory with Family B's explicit frameworks. A colleague-skill that also surfaces their *decision heuristics*, not just their tone, would be far more useful.
- **Faithfulness metrics.** Nuwa gestures at validation; the intimate-distillation projects do not. How do you know the skill is still the person, and not the persona the author *wished* the person were?
- **Consent scaffolding.** A standard "subject release" format, even an informal one, for skills built about real identifiable people.
- **Decay.** Skills that explicitly degrade when not updated, forcing a human to choose to re-engage rather than silently drifting into a caricature.

---

## Closing

The six skills surveyed here are small. Most are a few hundred lines of markdown. But they rhyme with an old question that keeps returning in new clothing: **what exactly is transferable about a person?** The memory-plus-persona camp answers *the surface*. The cognitive-framework camp answers *the engine*. Neither answer is complete, and the gap between them is where the interesting work is.

For anyone building in this space: the engineering is easy, the epistemology is hard, and the ethics will arrive whether you design for them or not.

---

**Links**

- colleague-skill: [github.com/titanwings/colleague-skill](https://github.com/titanwings/colleague-skill)
- ex-skill: [github.com/therealXiaomanChu/ex-skill](https://github.com/therealXiaomanChu/ex-skill)
- yourself-skill: [github.com/notdog1998/yourself-skill](https://github.com/notdog1998/yourself-skill)
- nuwa-skill: [github.com/alchaincyf/nuwa-skill](https://github.com/alchaincyf/nuwa-skill)
- steve-jobs-skill: [github.com/alchaincyf/steve-jobs-skill](https://github.com/alchaincyf/steve-jobs-skill)
- elon-musk-skill: [github.com/alchaincyf/elon-musk-skill](https://github.com/alchaincyf/elon-musk-skill)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换在 **英文 / 中文** 之间切换。

## 引言

最近几周，GitHub 上悄然出现了一类不寻常的 Claude Code *Skill*：它们既不是工作流自动化，也不是 API 封装。它们试图做一件更奇怪的事 —— **把一个人压缩成一个 markdown 文件。**

一位离职的同事、一个前任、你自己的过去、史蒂夫·乔布斯、埃隆·马斯克 —— 每一个都被变成一个可以在终端里 `/invoke` 的 `SKILL.md`。本文调研六个属于这一新兴家族的近期项目，询问它们共享什么、在哪里分歧、以及它们的存在揭示了人们开始如何思考 AI、记忆与身份。

项目一览：

| 对象 | 项目 | 作者 |
|---|---|---|
| 离职同事 | [colleague-skill](https://github.com/titanwings/colleague-skill) | titanwings |
| 前任 | [ex-skill（前任.skill）](https://github.com/therealXiaomanChu/ex-skill) | therealXiaomanChu |
| 你自己 | [yourself-skill](https://github.com/notdog1998/yourself-skill) | notdog1998 |
| 任意公众人物（元工具） | [nuwa-skill（女娲）](https://github.com/alchaincyf/nuwa-skill) | alchaincyf |
| 史蒂夫·乔布斯 | [steve-jobs-skill](https://github.com/alchaincyf/steve-jobs-skill) | alchaincyf |
| 埃隆·马斯克 | [elon-musk-skill](https://github.com/alchaincyf/elon-musk-skill) | alchaincyf |

---

## 1. 两种设计范式

把六份 README 并排阅读，会浮现一条清晰的分界线：**亲密蒸馏**（你认识的人）与**认知蒸馏**（你不认识的人）。

### A 家族 —— 亲密蒸馏："记忆 + 人格"

`colleague-skill`、`ex-skill`、`yourself-skill` 的架构出奇一致。三者都把目标人物组织成**两个 markdown 文件**：

- **A 部分 —— 记忆**（工作上下文 / 关系史 / 人生轨迹）：*是什么 & 何时* —— 机构知识、共同经历、关键事件、领域细节。
- **B 部分 —— 人格**，一个*五层*结构：
  1. 硬性规则 / 核心原则
  2. 身份
  3. 语言风格
  4. 情绪 / 决策反应
  5. 人际行为

三者执行流程相同：*收到消息 → 人格决定态度 → 记忆提供上下文 → 以其声音产出回复。* Skill 吸收微信 / 飞书 / 钉钉 / Slack 导出、截图、照片 EXIF、邮件 —— 数字关系留下的原始尾气 —— 编译成可被 Claude 作为 Skill 加载的两个文件。

三者都支持**增量更新**、**对话式纠错**、**带回滚的版本控制**。相似度之高，让人感觉它们几乎是同一份模板在三个不同情感表面上的变体：职场连续性、恋情哀悼、自我理解。

### B 家族 —— 认知蒸馏："六层框架抽取"

`nuwa-skill` 及其产出（`steve-jobs-skill`、`elon-musk-skill`）采取了截然相反的立场。标语很直接：**"不是在复读名人语录，是在用名人的认知框架帮你分析"**。

女娲的六层抽取：

1. **表达 DNA** —— 用词、节奏、修辞习惯
2. **心智模型** —— 3-7 个经验证的认知框架
3. **决策启发式** —— 推理捷径
4. **反模式** —— 主动拒绝的做法
5. **诚实边界** —— 所蒸馏的视角无法做到的事
6. **完整性标记** —— 直觉、未公开的信念、突发洞见等*无法*被抽取的部分

一个心智模型要被收录，必须满足**三个验证标准**：出现在多个领域、能预测新问题上的行为、*不是*所有聪明人都有的（即必须真正有辨识度）。

女娲本质上是一个**多智能体研究流水线**。六个并行子智能体同时抓取书籍、播客、访谈、批评者视角、决策记录和生平年表。发现会交叉验证。产出先在对象的公开立场上测试，再在需要*恰当不确定性*的新场景上测试。

例如，Jobs skill 蒸馏出："*专注就是对一百个好点子说不*"、"*端到端掌控*"、"*以死亡作为决策过滤器*"，配合二元词汇（"insanely great" / "shit"）、短句、极端确定性的 Expression DNA。Musk skill 蒸馏出：*渐近极限分析*、*五步算法（质疑 → 删除 → 简化 → 加速 → 自动化）*、*物理是唯一的硬约束*。

### 分叉

两个家族在一个深层问题上分歧：**为了模拟，人是什么？**

- A 家族回答：**人是一个关系表面。** 重要的是他们如何回应*你* —— 语气、习惯、只有你们懂的梗、互动的特定质地。记忆是具体而特殊的。
- B 家族回答：**人是一台思维引擎。** 重要的是他们如何*决策*。记忆被抽象为模型；语录是症状而非实质。

一个家族在造**回声**。另一个家族在造**透镜**。

---

## 2. 这些设计里有趣的地方

### 五层人格正在成为事实标准

三个独立的 A 家族项目不约而同地收敛到几乎相同的五层人格结构（规则 → 身份 → 语言 → 情绪 → 人际）。这种可疑性是有价值的：要么它们互相借鉴，要么这个结构真的是"人作为 agent"的最小可行描述。我怀疑是后者。它和游戏角色设计师、小说家、心理学家的特质理论所到达的分解方式非常接近。

### 女娲的"完整性标记"是最诚实的设计选择

大多数人格项目都过度承诺。女娲显式地分配一层给*无法抽取的内容*：直觉、未公开信念、突发洞见。这很少见。大多数数字孪生项目努力掩盖接缝；女娲把它们前置。验证标准 —— "*不是所有聪明人都有的*" —— 也异常严格：它防止 skill 坍缩为泛泛的"聪明创始人气质"。

### 对 Polanyi 悖论的两种相反回答

A 家族试图通过**密集记录行为**来捕捉默会知识，并寄希望于模型能插值。B 家族试图通过**强制显式表述**行为背后的框架来捕捉它。两者都未完全成功 —— 正如波兰尼所论证，默会知识本质上不可完全言说 —— 但它们以启发性的方式失败。A 家族产出有说服力的表面模仿但缺乏深度；B 家族产出站得住的框架但缺乏活生生的质地。

### 最难的部分大概是数据

六个项目最终都卡在**源材料质量**上。A 家族依赖大多数人从未导出过的聊天记录。B 家族依赖只为地球上几百个人存在的传记和长访谈。"蒸馏一个人"这件事对有传记作者的公众人物和生活被异常完整记录的私人最有效。绝大多数人类两头都不沾。

---

## 3. 潜在影响

### 有用之处

- **机构连续性。** colleague-skill 的用例确有价值。资深工程师离开后，会留下数月的入职摩擦。一个能用其声音、带其上下文回答"*我们为什么 2023 年选 Kafka 而不是 NATS？*"的持久 skill，是实实在在的资产。
- **自我反思基础设施。** `yourself-skill` 有趣之处不在于数字孪生，而在于*镜子*。能问"过去的我会怎么说这件事？"是一种带检索的新型日记。
- **认知借用，而非语录崇拜。** 女娲的定位 —— *使用框架，不复读语录* —— 比大多数"与乔布斯对话"类产品更健康。一个问"这里的愚蠢指数是多少？"的 Musk 透镜，无论你对 Musk 本人的看法如何，都是合法的分析工具。
- **低成本学徒制。** 历史上，要像大师那样思考，你必须读完他们写的一切、在他们旁边工作、或等待一本传记。认知蒸馏压缩了这件事 —— 不完美，但可达。

### 令人不安之处

- **同意不对称。** 离职同事没有同意变成一个 skill。前任更没有。"赛博永生"听起来很美，直到被永生的那个人没被问过。
- **哀悼洗白。** `ex-skill` 的 README 把自己定位为情绪处理。它也可能是*不*处理的装置 —— 把一段关系冻结在最高保真的快照上，不让它结束。
- **公众人物的扁平化。** 把乔布斯蒸馏成 6 个心智模型，是在下注*蒸馏物就是那个人*。对分析用途，这没问题。对必然会去*向乔布斯寻求人生建议*的那批人，它会以可辨识的声音给出自信的错误答案。
- **自信声音问题。** 六个项目都以某个人的声音输出。声音制造信任。信任作用于插值引擎，产出的是带着别人脸的流畅幻觉。
- **真实性漂移。** 每次增量更新都是 skill 偏离原人的机会。更新足够多次后，这究竟是谁的 skill？

### 结构性影响

这些项目是更大模式的早期信号：**人们开始把人类当作可编译的产物。** 不是反乌托邦意义上的，而是日常工具意义上的。那些给仓库写 `CLAUDE.md` 的同一批开发者，现在也为他们的同事、前任和自己写了。一旦接口稳定下来，社会影响会接踵而至：预期职场会出现"离职文档"、逝者会有"纪念 skill"、公众人物会授权"创始人 skill"以变现自己的认知。

---

## 4. 我希望看到的下一步

- **混合设计**，结合 A 家族的具体记忆与 B 家族的显式框架。一个不仅呈现语气，也呈现*决策启发式*的 colleague-skill 会有用得多。
- **保真度指标。** 女娲对验证有所涉及；亲密蒸馏项目则没有。你怎么知道 skill 还是那个人，而不是作者*希望*那个人是的样子？
- **同意脚手架。** 关于真实可识别人物的 skill，应有一个标准（哪怕非正式）的"对象授权"格式。
- **衰减。** 长期不更新就显式退化的 skill，强迫人类主动选择重新参与，而不是默默漂移成一幅讽刺画。

---

## 结语

本文调研的六个 skill 都很小。大多数不过几百行 markdown。但它们押韵于一个反复以新衣归来的老问题：**关于一个人，究竟什么是可迁移的？** 记忆+人格阵营回答*表面*。认知框架阵营回答*引擎*。两个答案都不完整，而它们之间的缝隙正是有意思的工作所在的地方。

对于在此空间里构建的人：工程是容易的，认识论是困难的，伦理无论你是否为它设计，都会到来。

---

**链接**

- colleague-skill: [github.com/titanwings/colleague-skill](https://github.com/titanwings/colleague-skill)
- ex-skill: [github.com/therealXiaomanChu/ex-skill](https://github.com/therealXiaomanChu/ex-skill)
- yourself-skill: [github.com/notdog1998/yourself-skill](https://github.com/notdog1998/yourself-skill)
- nuwa-skill: [github.com/alchaincyf/nuwa-skill](https://github.com/alchaincyf/nuwa-skill)
- steve-jobs-skill: [github.com/alchaincyf/steve-jobs-skill](https://github.com/alchaincyf/steve-jobs-skill)
- elon-musk-skill: [github.com/alchaincyf/elon-musk-skill](https://github.com/alchaincyf/elon-musk-skill)

</div>
