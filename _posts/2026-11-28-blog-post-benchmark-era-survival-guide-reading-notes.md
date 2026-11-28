---
title: "[Reading Notes] Survival Guide to the Era of Benchmarks: Turning Agent Trajectories into Terminal-Bench-Grade Tasks"
date: 2026-11-28
permalink: /posts/2026/11/benchmark-era-survival-guide-reading-notes/
excerpt: "Notes on James Zhu's benchmark guide: a five-step workflow (Find, Slice, Containerize, Run, Verify & Audit) for turning real Claude Code / Codex failure logs into Terminal-Bench-grade tasks, plus why frontier internal evals need OOD scenarios and human judgment."
tags:
  - Reading Notes
  - AI
  - Benchmarks
  - Evaluation
  - AI Agents
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## Introduction: One Great Task Beats an Empty Benchmark

People entering AI evaluation often ask how to design a full benchmark from scratch—where to find a topic, how to scope it, and how to take the first step. In his November 27, 2026 X article, *Survival Guide to the Era of Benchmarks* (*《大bench时代生存指南》*), **James Zhu** (`@JamesZhu1102`, founder of Benchmarks-Last-Exam, Tsinghua University, previously at Kimi / Moonshot AI) offers a blunt starting rule: **building one genuinely strong task creates more value than rushing to announce a whole benchmark**. [Original X Article](https://x.com/JamesZhu1102/status/2126350662892138733)

Even more practical is where he says the raw material lives. Whether you work in traditional STEM or AI research, your best candidate problems are already sitting on your machine inside your own **Claude Code** or **Codex** agent logs. Every painful session where an agent wrecks a workspace, drifts off course, and takes a hundred rounds of human steering to produce an acceptable deliverable is a potential seed for a **Terminal-Bench**-grade evaluation task—provided you separate true model limitations from missing user context.

These notes distill James Zhu's five-step recipe from raw trajectory to audited task, his argument for why domain experts will supply the next wave of evaluation data, and his closing warning for internal eval teams inside model labs, followed by a separate section of my own takeaways for evaluation engineering and embodied AI.

## 1. Where Good Tasks Come From: Capability Gaps Inside Everyday Agent Logs

A benchmark earns its keep by defining problems that carry real value and still expose a gap between current model outputs and human-expert expectations. The wider that gap—and the higher the economic value of solving the problem—the stronger the case for turning it into a benchmark.

In day-to-day agent usage, these gaps show up constantly. You ask a coding or research agent to help with a real project; it produces a mess in your workspace; after dozens or a hundred turns of correction, it finally lands on a workable result. Before turning such a session into a task, Zhu highlights one decisive triage question: **did the agent fail because you withheld necessary context, or because the model genuinely lacked the capability to make the right call?** Only the second case belongs in a benchmark.

## 2. The Five-Step Workflow: Find, Slice, Containerize, Run, Verify

Because coding agents persist their execution histories locally, you can enlist an agent to mine, isolate, package, and stress-test your own past failures. Zhu breaks the conversion into five concrete stages:

| Stage | Core Goal | Key Execution Check |
| --- | --- | --- |
| **1. Find（找）** | Mine local agent logs for real capability failures | Filter by rework, long horizon, avoidable pre-error mistake, and clear grading criteria |
| **2. Slice（切）** | Isolate the minimal segment where the gap occurs | Start right before the wrong turn; end at the unsatisfactory deliverable |
| **3. Containerize（造环境）** | Reconstruct the real pre-failure workspace | Distill prior context into `instruction` + starter data; package tools (e.g., Blender, Lean) in Docker |
| **4. Run & Scope（跑）** | Verify failure reproducibility in a clean session | Rule out missing context, newer model gains, flakiness, or over-hinting; tune task granularity |
| **5. Verify & Audit（评分与查轨迹）** | Build a formal verifier, oracle, and trajectory audit loop | Prevent false negatives/positives, prove solvability, and read solver traces repeatedly |

### Step 1 — Find: Mine local logs, then apply expert taste

Have an agent scan your saved trajectories for sessions that satisfy four filters:

- The user explicitly pointed out an unsatisfactory deliverable, and subsequent rework visibly improved the outcome.
- User and agent went through multi-turn back-and-forth with a long-horizon agent trajectory centered on one problem.
- The failure traces back to a concrete, plausible wrong decision that a solver could have caught or avoided using **only information available before the mistake**, without guessing requirements revealed afterward.
- The task has clear inputs, concrete deliverables, and inspectable quality criteria.

Automated filtering only surfaces candidates; a human domain expert still has to decide whether a candidate represents a genuinely high-value, high-difficulty problem in their field.

### Step 2 — Slice: Cut out the real failure segment

Real work sessions are messy. A single research thread might mix literature review, experimental design, multiple compute runs, and manuscript drafting. Slicing isolates the specific segment that caused the capability gap:

- **Start point**: the moment right before the model made its consequential wrong turn.
- **End point**: the moment the model produced the unsatisfactory artifact.

Because frontier models seldom make cartoonishly obvious blunders, finding clean cut boundaries requires pairing your own judgment with an agent's log analysis so the extracted slice stands on its own with well-defined inputs and outputs.

### Step 3 — Containerize: Reconstruct context and dependencies

"Building an environment" means faithfully restoring the state of the world right before the failure occurred. It has two halves:

- **Pre-failure state**: everything the model knew up to the slice start, compressed into a concise task `instruction` plus an initial workspace or starter database.
- **Execution dependencies**: domain software and toolchains—such as **Blender** or **Lean**—packaged into a reproducible **Docker** container following official [Terminal-Bench](https://www.tbench.ai/) conventions.

Your agent can handle most of the Dockerfile and scaffolding mechanics once you point it at Terminal-Bench's reference task format.

### Step 4 — Run & Scope: Reproduce the failure and avoid "build a nuclear bomb" tasks

Hand the packaged instruction and container to a fresh agent with a clean context and watch what happens. If the expected failure fails to appear, Zhu lists four diagnostic checks:

1. **Incomplete environment diff**: the reconstructed workspace omitted key conditions from the original session—ask an agent to diff the container against the source trace.
2. **Model generation shift**: an older model struggled when the session happened, while a newer model already clears the hurdle.
3. **One-off flakiness**: run multiple trials; if the model passes reliably on retries, the task lacks real difficulty.
4. **Over-hinting**: the written instruction accidentally gave away domain judgments the solver was supposed to make itself.

Running trials also calibrates **task horizon**. Longer tasks can be valuable when they mirror natural workflows, yet chaining unrelated unsolved difficulties together hurts evaluation and training alike. Zhu compares stitching several failure-prone hurdles into one monolithic prompt to asking a model to "build a nuclear bomb from scratch": end-to-end pass rates collapse to near zero, leaving a sparse, unstable signal. His decomposition heuristic is clean: suppose task $A$ depends on stages $B$, $C$, and $D$. If models fail $B$, $C$, and $D$ individually, turning $B$, $C$, and $D$ into separate tasks delivers more value first; once models solve $B$, $C$, and $D$ individually while still failing end-to-end $A$, then $A$ earns its place as a composite task.

### Step 5 — Verify & Audit: Formal rubrics, oracles, and reading trajectories

Domain intuition tells you roughly how good a model's deliverable is; benchmark engineering turns that intuition into a **verifier**—either binary (`0/1` pass/fail) or continuous (`0–100`)—strictly vetted against **false negatives** (penalizing valid solutions) and **false positives** (rewarding flawed ones). Every task also needs an **oracle** (a full-score reference solution) to prove solvability under the packaged environment.

Above all, Zhu emphasizes a single operational maxim: **evaluation engineering is fundamentally trajectory reading**. On repeated test runs, inspect solver traces (assisted by an agent) along five questions:

- When the model fails, did it stumble on a genuinely meaningful obstacle?
- When the model succeeds, what made the path too easy—did the prompt leak hints?
- Did the verifier reject a correct solution due to overly narrow checks, or pass a broken one?
- Did an environment bug block the solver before it ever reached the real problem?
- How many steps and how much wall-clock time did the model spend, and where did its reasoning concentrate?

Iterating through trajectory audits and Terminal-Bench's open-source quality checks is how a rough draft becomes a rock-solid benchmark task.

## 3. Domain Know-How, Real Distribution, and the Token Trade

Zhu argues that the mechanical side of building benchmarks is accessible; the genuinely scarce assets are **domain know-how** and an accurate mental model of where AI intelligence actually stands. Purely synthetic tasks generated by model labs and data vendors tend to lack real-world distribution and diversity—useful for moving leaderboard numbers, risky for aligning models with real work.

His framing is explicitly commercial: a model company's real "last exam" is **ARR**—creating measurable economic value in industry. From that vantage point, **"every business company can become a data company, and every domain expert can become a bencher."** Practitioners working at the frontier of applying AI naturally surface evals whenever model outputs fall short of expert standards (*"AI for everything, and then everything for AI"*). Once you complete one task cleanly, you can codify the workflow into a reusable **skill** to scale across more domain scenarios.

He closes with a sharp side note aimed at academic researchers: several model labs now offer free API tokens to scientists. Their real interest lies less in reading your next paper and more in mining your agent trajectories for benchmark-worthy tasks—work you are better positioned to do yourself because you hold the full context of your own workspace.

## 4. The Frontier Eval Dilemma Inside Model Labs

For readers working on evaluation *inside* frontier model labs, Zhu raises a harder strategic problem: managing the triangle between **internal evaluations**, **public leaderboards**, and **post-training data**.

His logic is stark. Popular public benchmarks are almost certainly already saturated—or explicitly trained against—during post-training. Unpopular public benchmarks are usually ignored for a reason: low quality. Meanwhile, trying to out-engineer [Terminal-Bench](https://github.com/laude-institute/terminal-bench) on purely verifiable command-line tasks faces steep diminishing returns.

That leads to his most provocative claim: **the most important frontier internal evaluations inside model labs may no longer be fully verifiable ones.** Internal evals have to stay ahead of public leaderboards, and that differentiation increasingly comes from **out-of-distribution (OOD) scenarios**, fresh task concepts, and richer **human judgment**.

## 5. Blogger's Reflections: Takeaways for Evaluation Engineering and Embodied AI

*The observations in this section are my own interpretation connecting James Zhu's essay to AI engineering and robotics research, separate from claims made in the original post.*

What makes this guide stand out is how cleanly it demystifies benchmark creation into an **empirical debugging loop**. Three lessons transfer directly beyond coding agents into robotics and embodied AI evaluation:

- **Trajectory mining applies to real-world robot failures too.** In manipulation and humanoid control, we already accumulate huge libraries of teleoperation takeovers, policy rollouts, and simulation debug runs. Treating every human intervention as a candidate benchmark seed—and first checking whether the failure was caused by missing state/sensor observability versus genuine control inability—mirrors Zhu's context-versus-capability triage.
- **The $A$ vs. $B/C/D$ granularity rule prevents dead-signal benchmarks.** Embodied AI benchmarks frequently jump straight to long-horizon household chores where current policies score near 0%. Zhu's decomposition test offers a crisp operational gate: benchmark sub-skills $B, C, D$ individually until policies clear them reliably, then compose $A$ to measure long-horizon integration and error recovery.
- **Verifiers fail quietly in physics just as they do in code.** Just as a narrow unit test creates false negatives or a loose regex creates false positives in Terminal-Bench, naive task-completion flags in robotics (like "object reached goal pose") miss slips, unnatural contacts, or violated finger constraints. Inspecting actual rollout trajectories—watching *how* a policy passed or failed—remains irreplaceable, and as public simulation suites saturate, frontier robotics evaluation will likewise need OOD physical scenarios paired with calibrated human expert judgment.

## Further Reading

- James Zhu (`@JamesZhu1102`), *Survival Guide to the Era of Benchmarks* (*《大bench时代生存指南》*), November 27, 2026, [Original X Article](https://x.com/JamesZhu1102/status/2126350662892138733).
- [Terminal-Bench](https://www.tbench.ai/) — official project page and benchmark overview.
- [laude-institute/terminal-bench](https://github.com/laude-institute/terminal-bench) — open-source task structure, Docker harness, and quality standards referenced in the article.
- [Benchmarks-Last-Exam](https://benchmarks-last-exam.com/) — evaluation project founded by James Zhu.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，可通过顶部导航栏的语言按钮切换。

## 引言：造好一道高质量的题，胜过空谈一整套 Benchmark

想从 0 到 1 入坑 AI 评测的同学，最常卡在“找方向、定选题、迈出第一步”。在 2026 年 11 月 27 日发表的 X 长文《大bench时代生存指南》中，**James Zhu**（`@JamesZhu1102`，Benchmarks-Last-Exam 创始人，清华大学硕士，曾任职 Kimi / 月之暗面、毕业于北京大学）给出了一个非常直接的判断：**上来就造一整套 benchmark，远不如先踏实造好一道高质量的题更有价值。**[原帖链接](https://x.com/JamesZhu1102/status/2126350662892138733)

更反直觉也更实用的是题目原材料的来源。无论你来自传统理工科还是 AI 其他细分方向，最好的出题素材其实就躺在自己电脑里——藏在日常使用 **Claude Code**、**Codex** 等编程智能体留下的运行轨迹中。那些“AI 在工作区里拉了一坨大的、你反复纠偏上百轮才勉强端出像样成品”的崩溃瞬间，只要剥离掉“上下文没给足”的情况，剩下的真实能力缺口，正是打造 **Terminal-Bench** 级别题目的上好原料。

这篇阅读笔记梳理了原文从轨迹挖掘到评测工程落地的五步法、领域专家与真实数据分布的长期判断，以及面向模型厂内部评测团队的前沿思考，并在最后单独补充我结合评测工程与具身智能方向的几点延伸理解。

## 一、好题从哪来：藏在日常 Agent 轨迹里的能力缺口

做 benchmark 的根本目的，是定义那些**有价值、且模型当前还做不好**的问题。模型表现与人类专家预期之间的 gap 越大、问题本身的经济价值越高，这个方向就越值得做评测。

这种 gap 在日常用 AI 做科研或工程时随处可见：你交给智能体一项复杂任务，它第一遍做得很糟，你在同一个 session 里来回纠偏几十上百轮，最后终于磨出一份不错的产物。对日常工作而言，这个 session 到此结束；对评测构建而言，这里恰恰藏着金矿。不过动手前必须先过一道关键筛选：**模型没能一次做好，究竟是因为你当初没给够上下文，还是模型在这个问题上的能力确实不够？**只有后者才适合做成 benchmark 题目。

## 二、五步造题法：找、切、造环境、跑、评分与查轨迹

由于本地编程智能体会完整保留运行轨迹，完全可以让智能体协助完成筛查、切分、打包和验证。原文将整套流程拆为五个环环相扣的步骤：

| 阶段 | 核心目标 | 关键验收动作 |
| --- | --- | --- |
| **1. 找（Find）** | 从本地 agent 轨迹里筛出真实能力失败案例 | 按“返工显效、长程多轮、犯错前信息充分、标准可检验”四条筛选 |
| **2. 切（Slice）** | 从杂乱长会话中截出导致 gap 的核心片段 | 起点定在模型犯错前一刻，终点定在产出不满意成品之时 |
| **3. 造环境（Containerize）** | 高保真还原犯错前的真实工作场景 | 浓缩前置上下文为指令与初始数据；将 Blender/Lean 等工具打进 Docker |
| **4. 跑（Run & Scope）** | 用干净上下文的新 agent 验证难点能否复现 | 排查环境差异、新模型进步、偶发波动与过度提示；校准任务粒度 |
| **5. 评分与查轨迹（Verify & Audit）** | 落地严谨 verifier、参考解与轨迹复盘闭环 | 防假阴性/假阳性，补充满分 oracle，反复阅读解题轨迹打磨题目 |

### 第一步“找”：让 Agent 筛本地轨迹，再由专家把关

直接让智能体检索电脑上保存的运行日志，重点筛选满足以下四个特征的片段：

- 用户明确指出产出结果不理想，且经过返工后结果发生明显变化。
- 用户与 agent 围绕同一问题展开多轮交互，且 agent 在该问题上有长程运行轨迹。
- 难点来自某个具体且看似合理的错误决定；**仅凭犯错前已有的信息**，解题者就有机会发现或规避，无需猜测用户事后才补充的新要求。
- 任务具备清晰的输入、明确的交付物，以及可检验的好坏标准。

智能体只负责初筛，最终仍要由领域专家亲自复核：这到底是不是本领域里兼顾高价值与高难度的真问题。

### 第二步“切”：截取真正产生 Gap 的核心片段

真实工作会话往往极其冗长，一个科研 session 里可能混杂了查文献、设计实验、跑计算、写论文等各种支线。因此必须把真正引发能力断层的那一段单独切出来：

- **起点**：轨迹中模型即将做出那个“错误决定”的前一刻。
- **终点**：模型交出“不满意产物”的时刻。

如今的前沿模型很少犯低级错误，很多时候并没有黑白分明的“绝对错步”。这时需要结合你对业务的判断，让智能体辅助定位边界，只要切出的片段构成一个输入清晰、输出明确的任务雏形即可。

### 第三步“造环境”：对齐上下文与专业工具链

“造环境”的本质是还原真实案发现场，包含两部分工作：

- **上下文还原**：把轨迹起点之前模型掌握的全部信息，浓缩为一段任务指令（`instruction`）和一份初始工作区/起始数据库。
- **依赖还原**：将完成任务所需的专业软件和工具库（如 **Blender**、**Lean** 等）封装进 **Docker** 容器，结构上直接对标 [Terminal-Bench](https://www.tbench.ai/) 的官方题目规范。

这些容器化与脚手架工程，基本都可以交给智能体对照 Terminal-Bench 官方样例来完成。

### 第四步“跑”：干净上下文复现，并用“跑”的结果校准粒度

把做好的题面和容器交给一个**全新干净上下文**的智能体去跑，看它是否真的会在预期难点上翻车。如果结果与预期不符，通常有四种原因：

1. **环境未充分还原**：容器或题面漏掉了原会话中的关键状态，让智能体对比原轨迹找 diff。
2. **模型代际升级**：过去是旧模型做不好，新版本模型已经攻克了这一关。
3. **偶发失误**：多跑几次试试，如果复测大多能稳定通过，说明题目本身缺乏难度。
4. **题面过度提示**：指令里无意中替模型做了本该由它自行完成的业务判断。

“跑”出来的反馈还直接决定“切”的任务粒度。长程任务固然有价值，但切忌为了长而长——把几个模型各自都做不对的难点机械拼接在一起，好比让模型“从零手搓一颗核弹”，端到端几乎不可能过关，从训练视角看信号也过于稀疏和不稳定。作者给了一个很清晰的拆分准则：若大任务 $A$ 依赖阶段 $B、C、D$，且模型连单独完成 $B、C、D$ 都会失败，先把 $B、C、D$ 拆成独立题目更有价值；若模型已经能各自做好 $B、C、D$，却唯独在串联完成 $A$ 时翻车，那么 $A$ 就是一道很扎实的端到端长程题。

### 第五步“造 Verifier 与查轨迹”：评测工程的本质就是看轨迹

模型跑出结果后，需要把专家心里的打分直觉写成正式评分程序（**verifier**），可以是 `0/1` 通过/不通过，也可以是 `0–100` 的连续分。编写 verifier 必须严防两类偏差：**假阴性**（误杀合理的好答案）与**假阳性**（放过投机取巧或有缺陷的坏答案）。同时要配套一份 **oracle**（满分参考解），证明题目在当前环境下确实可解，并可用 Terminal-Bench 的开源质检标准继续打磨。

整篇文章最核心的一句工程心得是：**评测工程的本质就是去看轨迹。**在反复试跑的过程中，应借助智能体重点核查五个问题：

- 模型失败时，卡壳的位置到底是不是有意义的真难点？
- 模型成功时，是不是某处过于简单，或题面泄露了过多提示？
- Verifier 有没有误杀或漏判（例如轨迹其实做对了，只因校验条件写得太窄而被判错）？
- 环境配置本身有没有暗坑，是否足以支撑模型正常解题？
- 模型解题花了多长时间、走了多少步、思考时间主要消耗在哪一环？

往往要经过多轮“跑—看轨迹—改题面/改环境/改 verifier”的迭代，才能把一道题打磨到无懈可击。

## 三、领域 Know-How、真实数据分布与“免费 Token”背后的逻辑

作者认为，造 benchmark 的工程门槛其实并没有想象中那么高，真正稀缺且值钱的是**你的领域 know-how** 与**对模型真实智能水平的准确认知**。模型厂研究员和数据标注公司批量生产的纯合成数据，在真实分布与多样性上天然有短板——拿去刷公开榜单尚可，长期却容易把模型刷偏。

文章把这一点拉回到商业本质：**模型公司的终极考卷（last exam）是 ARR**，最终要在真实产业里替人类创造更大价值。由此推演下去，**未来每家业务公司都可能成为一家数据公司，每位行业专家都可以成为 bencher**——只要处于产业落地一线，只要模型输出和专家预期之间仍有落差，就会源源不断长出新的评测与数据，即所谓 *“AI for everything, and then everything for AI”*。一旦跑通第一道高质量题目，还可以把这套经验沉淀成可复用的 **skill**，横向扩展到更多真实场景。

文末还有一句面向科研工作者的善意提醒：最近不少模型公司向科研人员赠送免费 token，它们在意的往往并非你的论文本身，而是希望从你的日常工作轨迹里淘出可造题的素材。既然你掌握自己工作区的全部上下文，这件事由你自己来做，效果一定比外部更精准。

## 四、模型厂内部评测的破局点：走在公开榜单前面

针对在模型公司内部做评测的从业者，作者提出了一个更尖锐的问题：如何处理**内部评测、公开榜单与训练数据**三者之间的张力。

按现实逻辑推演，热度最高的公开榜单大概率已经在各家后训练里反复刷过；无人问津的冷门榜单又多半质量堪忧（否则早就火了）。如果继续一头扎进纯可验证任务（verifiable benchmark）的红海，很难做得比 [Terminal-Bench](https://github.com/laude-institute/terminal-bench) 更好。因此，**模型公司内部最关键、最前沿的评测，或许恰恰不该局限于完全可自动验证的题目**——内部评测必须走在公开榜单前面，而真正的差异化，来自分布外（OOD）的新场景、新构想，以及更高密度的**人类专家判断（human judgement）**。

## 五、延伸思考：从编程 Agent 评测到具身智能与机器人基准

*以下内容为笔者结合评测工程与机器人/具身智能研究背景的个人解读，并非原文作者的直接论述。*

这篇文章最打动我的地方，在于它把“造 benchmark”从宏大叙事拉回到了**可操作的经验调试闭环**。其中至少有三点可以直接迁移到机器人与具身智能评测：

- **真实失败轨迹同样是机器人评测的富矿。**在灵巧操作和人形控制中，遥操作接管记录、真机策略失误和仿真调试日志每天都在产生。把人工介入点当作候选题目起点，并先区分“传感器/观测信息缺失”与“策略自身控制能力不足”，和原文区分“用户上下文不全”与“模型能力短板”完全同构。
- **$A$ 与 $B/C/D$ 的粒度法则能避免“零分死榜”。**具身智能里常出现一步到位的超长程家务基准，所有模型得分贴近零，既区分不出算法好坏，也给不出有效迭代信号。按原文思路，先把模型还做不稳的子阶段拆出来独立评测，等各子技能收敛后再拼回端到端长程任务，评测区分度会高得多。
- **物理世界的 Verifier 同样充满隐蔽误判。**就像代码评测里过窄的断言会误杀好解、过松的正则会放过坏解，机器人基准里单一的“物体到达目标位姿”也常常放过打滑、穿模或违背指定手指接触的投机行为。坚持看 rollout 轨迹（看策略到底*怎么*做成或做坏的），以及在常规仿真指标趋于饱和后引入更贴近真实物理与专家审美的 OOD 评判，与原文对模型厂内部评测的判断不谋而合。

## 延伸阅读

- James Zhu（`@JamesZhu1102`），《大bench时代生存指南》，2026 年 11 月 27 日，[X 原文链接](https://x.com/JamesZhu1102/status/2126350662892138733)。
- [Terminal-Bench 官网](https://www.tbench.ai/) — 终端智能体评测基准主页。
- [laude-institute/terminal-bench](https://github.com/laude-institute/terminal-bench) — 文中提及的开源题目格式、Docker 评测框架与质检标准仓库。
- [Benchmarks-Last-Exam](https://benchmarks-last-exam.com/) — 作者创立的前沿评测项目主页。

</div>
