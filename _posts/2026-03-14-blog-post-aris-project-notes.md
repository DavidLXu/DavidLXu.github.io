---
title: "[Code Notes] Auto-claude-code-research-in-sleep (ARIS)"
date: 2026-03-14
permalink: /posts/2026/03/aris-project-notes/
tags:
  - AI Agents
  - Research Automation
  - Claude Code
  - Prompt Engineering
  - LLM Workflows
  - Code Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**Auto-claude-code-research-in-sleep**, which the repo also brands as **ARIS**, is a skill library for turning Claude Code into a semi-autonomous ML research operator. Its central idea is not “one super-agent does everything,” but a more opinionated division of labor: Claude Code executes quickly, while an external model, usually accessed through Codex MCP, acts as a slower and harsher reviewer. The repo packages that pattern into reusable workflows for idea discovery, iterative paper improvement, experiment execution, and even narrative-to-LaTeX paper writing.

What makes the project interesting is that it treats research automation as a workflow design problem rather than a model capability demo. The real artifact is a collection of tightly scoped `SKILL.md` programs that encode review loops, checkpoints, budget limits, persistence rules, and paper-writing conventions. In other words, this repository is less like an app and more like a handcrafted operating manual for running cross-model research loops.

## What This Repo Is Actually Building

At first glance the README sells a big vision: “let Claude Code do research while you sleep.” That sounds like marketing, but the implementation underneath is more concrete and more disciplined than the slogan suggests. The repo is organized around a set of Claude Code skills under `skills/`, each with a narrow responsibility, and then several orchestration skills that compose them into larger pipelines.

The project’s three headline workflows are easy to summarize. Workflow 1 is idea discovery, where literature review, brainstorming, novelty checking, and external critique are chained together. Workflow 2 is the auto-review loop, where a research project gets reviewed, patched, re-evaluated, and reviewed again for up to four rounds. Workflow 3 is paper writing, where a narrative report is turned into a section plan, figures, LaTeX source, compiled PDF, and then polished through another improvement loop. The top-level `research-pipeline` skill then stitches these stages together into a longer path from vague research direction to something much closer to a submission package.

That structure matters because it reveals the repo’s real philosophy: instead of one giant autonomous prompt, ARIS prefers a graph of smaller, opinionated skills with explicit handoffs.

## The Core Design Idea: Cross-Model Collaboration Instead of Self-Review

The most important conceptual move in the repository is its rejection of single-model self-play as the default strategy. The README is unusually direct here: it argues that when the same model both executes and reviews, the process tends to get trapped in local minima and blind spots. The repo’s answer is to split roles across models.

In the default setup, Claude Code is the executor. It writes code, edits files, launches experiments, compiles papers, and manages state. A second model, typically GPT-5.4 through Codex MCP, is used as the critic. This reviewer scores work, identifies weaknesses, proposes minimum fixes, and re-enters the loop after changes have been made. The repository treats this arrangement almost like adversarial training for research workflows: the reviewer is not a helper but a pressure source.

This is a strong idea because it is not merely about using a better model. It is about introducing asymmetry. The implementation keeps leaning on that asymmetry, and many of the skills are really small control systems for exploiting it.

## Why The Repo Feels Different From Generic “Agentic Research” Projects

Many agent repositories promise autonomous research, but a lot of them are really collections of prompts or wrappers around web search. ARIS feels different because its skills encode operational constraints, not just aspirations.

The `auto-review-loop` skill is a good example. It defines a maximum number of rounds, a positive threshold, a persistent `REVIEW_STATE.json`, and explicit recovery logic in case context compaction interrupts a long run. It also forces the system to document reviewer responses verbatim and forbids the workflow from pretending a fix was applied before it actually was. This is not glamorous, but it is exactly the kind of logic that makes long-running loops less fragile.

The `idea-discovery` skill shows the same pattern in a different context. It includes pilot experiment budgets, timeouts, total GPU-hour caps, and rules for when to kill ideas early. The repo is constantly trying to turn vague “AI can help with research” optimism into operational rules.

That, to me, is the real value of the project. It has moved one step past prompting and into workflow engineering.

## The Repository Structure

The repository itself is lightweight. There is no large Python package, no heavy backend, and no application server. The main body of logic lives in the skill definitions themselves. Representative files include `skills/idea-discovery/SKILL.md`, `skills/auto-review-loop/SKILL.md`, `skills/research-pipeline/SKILL.md`, and `skills/paper-writing/SKILL.md`. There are also more focused support skills such as `research-lit`, `run-experiment`, `monitor-experiment`, `paper-plan`, `paper-figure`, and `paper-compile`.

This file layout is revealing. ARIS is not trying to hide that the system is prompt-driven. On the contrary, it leans into prompt programs as the main medium. The repository is basically a distribution format for carefully engineered procedural knowledge.

There are also a few practical assets and templates, especially around paper generation. For example, the `paper-write` skill ships venue templates like `iclr2026.tex`, `neurips2025.tex`, and `icml2025.tex`. That detail helps make Workflow 3 feel less like a toy and more like a concrete production path for ML writing.

## The Three Main Workflows

The easiest way to understand the project is to follow the lifecycle it wants a researcher to adopt.

The first phase is exploration. The `research-lit` skill does more than web search: it is designed to combine web search with Zotero, Obsidian, and local PDF sources when those are available. That already signals one of the repo’s better instincts, namely that useful research automation should connect to a researcher’s actual knowledge stack rather than pretending the internet is the only memory source. On top of that, `idea-creator`, `novelty-check`, and `research-review` push potential ideas through increasingly adversarial filters.

The second phase is iterative improvement. Here the repo becomes more assertive. `auto-review-loop` assumes that initial ideas and narratives are often wrong, under-evidenced, or overclaimed, and it operationalizes criticism as a repeated procedure. This is probably the most distinctive part of the repository, because the loop is not simply “ask for feedback again.” It explicitly requires changes, experiment launches, result collection, and new review rounds.

The third phase is paper production. `paper-writing` orchestrates outline generation, figure generation, section writing, compilation, and a final improvement loop. The repository even includes details that sound minor until one has actually fought with paper formatting, such as cleaning stale files, filtering bibliography entries, checking page counts precisely, and catching layout issues after compilation.

Taken together, these workflows form a coherent theory of how research work gets stuck: first in idea ambiguity, then in evidence weakness, then in communication and formatting. ARIS addresses each of those failure modes with a different chain of skills.

## What I Find Most Practical

The strongest practical feature of ARIS is that it never fully trusts autonomy, even when it advertises overnight automation. The repo keeps exposing points where humans can intervene. The newer `AUTO_PROCEED` configuration makes that explicit: users can choose between full autopilot and approval-gated steps. That is more realistic than many “fully autonomous” claims, because actual researchers usually do want control over expensive decisions, narrative pivots, and final framing.

Another practical strength is graceful degradation. The literature skill can use Zotero and Obsidian, but it is designed to skip those integrations silently when they are not configured. Feishu notifications are optional and default-off. Alternative model combinations are mentioned so the system is not hard-locked to the Claude-plus-OpenAI pairing. These choices make the repository feel like it was written by someone who has actually tried to keep long workflows alive across messy real environments.

I also like that the repo documents failure and score progression as first-class outcomes. The README repeatedly highlights cases where claims get weakened, killed, reframed, or moved to appendix. That is healthier than a lot of agent demos, which present autonomy only as acceleration and not as criticism.

## Where The Repo Is Opinionated

ARIS is not a neutral toolkit. It has a clear worldview.

First, it assumes ML research is decomposable into literature survey, idea generation, execution, critique, and packaging. That is often true, but not always. Some research is bottlenecked by taste, mathematical insight, or hidden tacit knowledge that no workflow scaffold can easily externalize.

Second, it assumes that external LLM critique is meaningfully better than self-review. In many cases that is probably right, and the repo’s reasoning about blind spots is persuasive. But this still depends on the quality of the reviewer model, the prompts, and the evidence fed into the review stage.

Third, the repository assumes that prompt-based skill composition is stable enough to serve as infrastructure. That makes the project elegant and lightweight, but it also means much of the system’s behavior lives in procedural text rather than strongly typed code. The upside is flexibility. The downside is that reliability still depends on model compliance and prompt discipline.

## Limitations and Risks

The biggest limitation is that this repository automates the outer loop of research better than the inner loop of scientific judgment. It can orchestrate literature scans, launch experiments, rewrite narratives, and pressure-test claims, but it still cannot guarantee that the underlying idea is good, the benchmarks are meaningful, or the framing is intellectually honest. The README itself acknowledges this, and that honesty helps.

Another limitation is that the repo is strongest when the work can already be represented as textual artifacts, scripts, logs, and report files. That makes it a strong fit for many ML projects, especially empirical ones, but a weaker fit for research that depends on tacit lab practice, nontrivial infrastructure, or deeper theoretical invention.

There is also a meta-risk that the paper-writing workflow could make mediocre work look unusually polished. ARIS partly protects against this through adversarial review and claim-killing, but the risk is still real. Any system that lowers the cost of producing a submission-ready PDF also lowers the cost of packaging weak ideas attractively.

## Final Takeaway

My main takeaway is that **Auto-claude-code-research-in-sleep is best understood as workflow engineering for AI-assisted research, not as a magic research agent**. Its real contribution is the way it translates messy research habits into explicit, inspectable, reusable skill logic.

I would not read this repository as proof that autonomous research is solved. I would read it as proof that the surrounding scaffolding matters a lot more than many agent demos admit. ARIS is valuable because it encodes structure: when to stop, when to ask for critique, when to launch experiments, when to gate on humans, when to recover from interruptions, and when to turn raw results into a paper-shaped artifact.

That makes the project more interesting than its slogan. “Do research while you sleep” is the hook. The actual substance is a carefully designed library for forcing research workflows to become explicit enough that another agent can inhabit them.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**Auto-claude-code-research-in-sleep**，也就是仓库里简称的 **ARIS**，本质上是一个把 Claude Code 改造成“半自动科研执行器”的技能库。它最核心的想法并不是“一个超级 agent 包打天下”，而是把研究流程拆成不同角色：Claude Code 负责快速执行，外部模型通过 Codex MCP 充当更慢、更苛刻的 reviewer。整个仓库围绕这个思路，组织出了找 idea、跑实验、自动 review、再到写论文的完整工作流。

我觉得这个项目真正有意思的地方，在于它把“科研自动化”当成了**工作流设计问题**，而不是单纯的大模型能力展示。仓库里最重要的内容不是某个 Python 系统，而是一组 `SKILL.md`，里面写的是审稿循环、检查点、预算上限、状态恢复、论文写作规范等流程逻辑。换句话说，这个仓库更像一套精心设计的“科研操作手册”，而不是一个普通应用。

## 这个仓库到底在做什么

README 的宣传语很强，“睡觉时让 Claude Code 帮你做科研”。如果只看这句话，会觉得它像一个很典型的 agent 营销项目。但真正看完仓库实现后，我反而觉得它的落点比口号更扎实。

整个仓库围绕一批 Claude Code skills 展开，主要内容都在 `skills/` 目录中。这里没有一个庞大的后端系统，也没有复杂的业务代码。真正的“程序”其实就是这些技能文本本身。每个 skill 负责一段特定流程，再由少数几个编排型 skill 把它们串起来。

仓库当前强调三条主线。第一条是 **idea discovery**，把文献综述、idea brainstorming、novelty check 和 external review 串成一个完整探索流程。第二条是 **auto review loop**，让项目在 reviewer 批评、修复、重评之间迭代最多四轮。第三条是 **paper writing**，从 narrative report 出发，自动生成论文结构、图表、LaTeX、PDF，并再走一轮内容和格式上的打磨。最顶层的 `research-pipeline` 则把这些流程进一步串成一个从模糊研究方向到接近投稿稿件的完整链路。

这件事很重要，因为它说明 ARIS 的真正目标并不是“做一个万能研究 agent”，而是把科研生命周期拆成可复用、可组合、可检查的流程模块。

## 最核心的设计：跨模型协作，而不是单模型自我博弈

我认为这个仓库最重要的思想，是它明确拒绝把“单模型自我评审”当成默认方案。README 在这一点上说得非常直接：如果执行和评审都由同一个模型承担，那么流程很容易陷入局部最优和共同盲区。

仓库给出的答案是角色分离。

默认设定下，Claude Code 是执行者，负责写代码、改文件、起实验、编译论文、维护状态。另一个模型，通常是通过 Codex MCP 接入的 GPT-5.4，则作为 critic 出现，负责打分、指出问题、提出最低修复要求，并在修复之后重新进入循环。这个结构本质上是在科研流程里人为引入一种“对抗性”。

这个想法强的地方在于，它不是简单地换了个更强模型，而是引入了**不对称性**。执行和审查不再是同一种思考方式，而是两种风格互相制衡。仓库里的很多 skill，其实都是在为这种不对称协作提供流程壳。

## 为什么它和很多泛泛的“科研 agent 项目”不一样

现在“科研自动化”类仓库很多，但其中不少本质上只是 prompt 集合，或者是套壳的搜索+总结工具。ARIS 和它们不太一样的地方，在于它写下了很多**操作约束**，而不仅仅是“理想目标”。

例如 `auto-review-loop` 不是简单地“再问一次 reviewer”。它明确规定了最大轮数、通过阈值、`REVIEW_STATE.json` 的保存方式、上下文压缩后的恢复逻辑，以及 reviewer 原始回复必须完整保留等规则。很多看起来很小的约束，其实恰恰决定了长流程能不能真的跑下去。

`idea-discovery` 也是类似。它里面不是只有“生成 8-12 个想法”，还包括 pilot budget、timeout、总 GPU 小时数上限、何时杀掉坏 idea、何时强制进入人工确认。这说明作者把科研流程当成一种资源约束下的决策系统，而不是抽象的 prompt chaining。

这也是我觉得这个仓库最有价值的地方。它已经不只是 prompting，而是在做 workflow engineering。

## 仓库结构本身说明了它的定位

这个仓库非常轻。它没有传统意义上的大规模代码系统，也没有复杂的包结构。最核心的逻辑几乎都写在 skill 文件里。像 `skills/idea-discovery/SKILL.md`、`skills/auto-review-loop/SKILL.md`、`skills/research-pipeline/SKILL.md`、`skills/paper-writing/SKILL.md` 这些文件，实际上就是整个项目的大脑。

除此之外，还有一组更细粒度的支持技能，比如 `research-lit`、`run-experiment`、`monitor-experiment`、`paper-plan`、`paper-figure`、`paper-compile` 等。Workflow 层负责编排，support skill 层负责执行具体动作。

这个结构很坦诚。它并不试图掩饰自己是 prompt-driven system，反而干脆把“prompt 程序”本身作为主要交付物来组织。这让整个项目更像一套可分发的程序化知识，而不是传统软件。

另外，仓库在论文写作部分也配了一些实际模板，比如 `paper-write/templates/` 下就有 ICLR、NeurIPS、ICML 的 LaTeX 模板。这些细节会让人意识到：作者并不只是想讲一个概念，而是真的希望这条工作流能落到投稿材料层面。

## 三条主工作流怎么理解

如果顺着作者设计的科研生命周期去看，这个仓库的意图会更清晰。

第一步是探索。`research-lit` 不只是联网搜论文，它还能在条件允许时整合 Zotero、Obsidian 和本地 PDF。这一点其实很有价值，因为真正可用的科研自动化，不应该假设“互联网就是唯一知识库”，而应该尽量接入研究者原有的知识系统。在这个基础上，`idea-creator`、`novelty-check` 和 `research-review` 继续把 idea 推向越来越严格的筛选。

第二步是改进。这里的主角就是 `auto-review-loop`。它默认假设：初始想法、实验叙事和主张，大概率是不成熟的，需要经过 reviewer 持续施压、代码修改、实验补充和 narrative pivot。这个环节是仓库最有辨识度的部分，因为它不是“再问问 LLM 怎么看”，而是一个真正要求改代码、补实验、收结果、再送审的闭环。

第三步是写作。`paper-writing` 负责从 narrative report 到 section plan、figure、LaTeX、compile，再到最终改稿。这一块里面甚至包含了很多只有真正写过论文的人才会在意的细节，例如清理 stale 文件、过滤未引用 bib、精确检查页数、编译后修布局问题等。

把这三步放在一起看，ARIS 其实是在表达一种很完整的科研失败观：项目会先卡在 idea 模糊，再卡在证据不足，最后卡在表达与格式。而仓库正是分别为这几种卡点设计了不同的流程。

## 我觉得最实用的地方

这个项目最实用的地方，是它虽然宣传“睡觉时自动科研”，但实际上并不盲信全自动。它始终在保留人工介入点。后来的 `AUTO_PROCEED` 配置就是这种态度的集中体现：你可以全自动，也可以在关键步骤人工确认。

这种设计是很现实的。因为真正的研究者通常并不希望在高成本决定、叙事转向、主张删改这些地方完全交给 agent 自己拍板。ARIS 在这一点上比很多号称“全自动”的系统诚实得多。

另一个很实用的点是它的 graceful degradation。文献技能可以接 Zotero 和 Obsidian，但没配置时会自动跳过。Feishu 通知是完全可选的，而且默认关闭。模型组合也不是死绑 Claude + OpenAI。这样的设计说明作者真的在意“长流程在现实环境里能不能活下来”，而不是只做一组理想状态下的演示。

我还挺喜欢 README 里反复强调“杀掉 claim”这件事。仓库并不只把 agent 当作加速器，也把它当作批判器。它会记录 claim 被削弱、被删除、被重写、被移去 appendix 的过程。这一点比很多 agent 项目更健康。

## 这个仓库的强烈立场

ARIS 并不是中性的工具箱，它有非常明确的世界观。

第一，它假设机器学习研究可以分解成文献调研、idea 生成、执行、批判和包装几个阶段。这个假设在很多经验型 ML 项目里是成立的，但不一定覆盖所有科研工作，尤其是那些高度依赖数学直觉、审美判断或隐性经验的研究。

第二，它假设外部 LLM critique 会显著优于同模型自评。这在很多情况下大概率是对的，仓库关于 blind spot 的论证也很有说服力，但最终仍然取决于 reviewer 模型质量、prompt 设计和喂给 reviewer 的证据是否真实完整。

第三，它假设 prompt-based skill composition 足够稳定，能够承担某种“基础设施”的角色。这让整个系统非常灵活、也很轻量，但代价是相当多的行为逻辑仍然存在于文本流程里，而不是严格类型化的代码里。优点是快，缺点是稳定性仍然依赖模型服从性和 prompt discipline。

## 局限和风险

我觉得这个仓库最大的局限在于：它更擅长自动化科研的**外循环**，而不是科学判断的内核。它可以帮你查文献、串流程、跑实验、改叙事、生成论文，但不能保证 idea 本身足够好，benchmark 足够有意义，或者 framing 足够诚实。README 自己其实也承认这一点，这种诚实反而是优点。

第二个局限是，ARIS 最强的使用场景是那些可以被写成文本、脚本、日志和报告文件的项目。这让它很适合大量经验型 ML 工作流，但对于依赖 tacit lab practice、特殊基础设施、或真正深层理论创造的研究，它的帮助会更有限。

还有一个元层面的风险是：论文写作工作流会让普通工作也更容易被包装得很像样。ARIS 通过 adversarial review 和 claim-killing 机制在一定程度上抑制了这个风险，但这个风险并没有消失。任何能显著降低“做出投稿级 PDF”成本的系统，也必然会降低“把一般工作包装得更像成熟工作”的成本。

## 最后的判断

我对这个仓库的总体判断是：

**Auto-claude-code-research-in-sleep 最适合被理解为“AI 辅助科研的工作流工程”，而不是“科研已被自动化解决”的证明。**

它真正有价值的地方，在于把很多原本隐性的科研习惯和经验，变成了可检查、可组合、可复用的显式流程逻辑。

我不会把它看成 autonomous research 已经完成的证据。我会把它看成一个很好的提醒：agent demo 里最容易被忽视的，往往不是模型本身，而是外围脚手架。ARIS 值得看，不是因为它承诺了“睡觉时科研”，而是因为它把很多关键细节写清楚了：什么时候该停，什么时候该请外部 reviewer，什么时候该起实验，什么时候该让人介入，什么时候该从结果转成论文形状的产物。

“睡觉时做科研”是它的钩子，但真正的实质是一套让科研流程足够显式、足够结构化，以至于另一个 agent 真的可以接手的技能库。

</div>
