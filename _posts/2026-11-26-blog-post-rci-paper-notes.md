---
title: "[Paper Notes] Recursive Collective Intelligence: Emergence on an Equal-Budget Ladder in Multi-Agent LLM Systems"
date: 2026-11-26
permalink: /posts/2026/11/rci-paper-notes/
excerpt: "On HiddenBench, four agents that forward private facts beat an equal-token oracle over independent answers. On SplitBench, training on verified messages improves that margin across two generations."
tags:
  - Paper Notes
  - Large Language Models
  - Multi-Agent Systems
  - Collective Intelligence
  - Self-Training
---

<div data-lang="en" markdown="1">

Lixuan He, Shengqu Cai, Fang Wu and colleagues · November 24, 2026 · [arXiv preprint](https://arxiv.org/abs/2611.32606v1) · [Project and interactive examples](https://lixuan27.github.io/RCI/)

Suppose four agents each see a different clue. Asking each for its verdict can produce four votes for the same plausible decoy. Asking each to pass on its clue lets the team assemble evidence that nobody started with. Recursive Collective Intelligence (RCI) asks how much that exchange is worth once the messages count toward the team’s budget, and whether the team can teach its successors to use that budget better.

### What could independent samples buy?

The team submits one answer. If it spends *k* completion tokens and one independent run costs *c₁* tokens on average, its comparison budget is <i>n</i><sub>B</sub> = <i>k</i> / <i>c</i><sub>1</sub> independent runs. Each independent agent receives the evidence available to its seat. The authors compare team accuracy against three thresholds in order. **Level 1** beats one agent. **Level 2** beats a majority vote at the matched budget. **Level 3** beats pass@<i>n</i><sub>B</sub>, the probability that the independent pool contains even one correct answer. An oracle allowed to select the best answer in that pool would score exactly pass@<i>n</i><sub>B</sub>. Clearing it is evidence that exchanging information helps generate answers the independent pool misses. A level requires a statistically confirmed improvement at each preceding threshold as well. The budget measures generated tokens, so it captures only part of the cost of serving the models. [Paper §4.1](https://arxiv.org/pdf/2611.32606v1#page=5)

### What the agents send changes the result

On 65 HiddenBench decisions, four Qwen3.8-27B agents see common facts that favor a decoy and private facts that can overturn it. With two rounds of debate they reach **68.8% accuracy**, spending the equivalent of 8.8 independent runs and falling 1.5 percentage points below matched pass@<i>n</i><sub>B</sub>. Forwarding private facts gives **95.9% accuracy** at a cost of 6.2 independent runs, **31.0 points above** its own matched pass@<i>n</i><sub>B</sub>. The simpler message buys both better evidence and a smaller bill. When agents see the same information, the comparison changes. Across six shared-information benchmarks, none of the three tested coordination methods with Qwen3.5-9B beat the matched vote. [Paper §5, Tables 1–2](https://arxiv.org/pdf/2611.32606v1#page=8)

Even with useful private facts, organizing the exchange costs tokens. In a HiddenBench variant with limited message reading, allowing identical 27B agents to transfer their one-message reading allowance raised accuracy from 49.6% to 67.7%. A hub formed in 34.5% of runs. The group still finished below matched pass@<i>n</i><sub>B</sub>. This is a case where the organization visibly helped and the independent-sampling baseline still mattered. [Table 3](https://arxiv.org/pdf/2611.32606v1#page=11)

### What does one generation teach the next?

On SplitBench, the parent team generates messages on 501 training tasks. A protocol check can verify whether an opening message conveys the sender’s private facts before it sees anyone else’s message. The next generation trains on accepted turns. For the second generation, the procedure samples four candidate turns per seat and keeps the shortest passing one. This gives the model a concrete training signal for concise communication without requiring a target answer for the whole problem. [Paper §§4.3 and 7.2](https://arxiv.org/pdf/2611.32606v1)

On 196 held-out tasks, the 9B team using three-step debate moved from **−25.3** to **−2.8** to **+15.9 percentage points** relative to budget-matched pass@<i>n</i><sub>B</sub> of the base model. The crucial control repeats the second-generation training procedure using the original model’s turns. Its margin was **−3.3 points**. The 19.2-point gap on the first training seed narrowed to an average of 11.5 points over four additional seeds and stayed positive in all four. At 27B the second step had a different explanation. Accuracy held steady while the budget fell from 9.6 to 6.4 independent runs. Reporting both accuracy and cost makes those two routes to improvement visible. [Paper §7.2, Table 4 and Appendix F](https://arxiv.org/pdf/2611.32606v1)

For longer runs, the authors check proposed successors against their parents on fresh tasks. They report four successive releases on PlanBench, five in one HiddenBench run and six on Hanabi. The last Hanabi team scores about 4.5 out of 25. What counts as a valid example depends on the domain. A simulator can execute a Blocksworld plan, while HiddenBench uses agreement among base-model agents that see all the facts. That distinction limits the claim about learning without external labels. The method still needs a check worth learning from, and the HiddenBench check can preserve errors shared by the full-information agents. [Paper §§4.4 and 7.4–7.5](https://arxiv.org/pdf/2611.32606v1)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

Lixuan He、Shengqu Cai、Fang Wu 等 · 2026 年 11 月 24 日 · [arXiv 预印本](https://arxiv.org/abs/2611.32606v1) · [项目主页与交互示例](https://lixuan27.github.io/RCI/)

假设四个智能体各自拿到一条不同的线索。让它们直接表态，四票可能都投给同一个看似合理的干扰项。让它们先交换线索，团队才有机会看到任何一个成员最初都看不到的完整证据。《递归集体智能》（RCI）追问的是，把通信花掉的 token 也算进去，这次交换值多少？团队能否用自己的发言记录，教会下一代更有效地使用同样的预算？

### 同样的预算，能买到多少次独立作答？

团队最终只交一个答案。如果团队共生成 *k* 个 token，独立作答一次平均消耗 *c₁* 个，那么同样的预算可以买到 <i>n</i><sub>B</sub> = <i>k</i> / <i>c</i><sub>1</sub> 次独立作答。做对照时，每个独立智能体看到的证据与团队中对应席位一致。作者依次设置三道门槛。**第一级**超过单个智能体。**第二级**超过等预算独立作答的多数票。**第三级**超过 pass@<i>n</i><sub>B</sub>，即这些独立答案中至少有一个正确答案的概率。哪怕有个裁判总能从候选里挑出正确答案，它的准确率也只能达到 pass@<i>n</i><sub>B</sub>。越过这道门槛，才有证据表明交流能产生独立采样容易漏掉的答案。每一级都要求本级及之前各级的提升通过统计检验。这里的预算按生成的 token 计算，只覆盖部署成本的一部分。[论文 §4.1](https://arxiv.org/pdf/2611.32606v1#page=5)

### 发给队友的是结论，还是线索？

在 HiddenBench 的 65 道决策题中，四个 Qwen3.8-27B 智能体都能看到支持干扰项的公共信息，足以推翻干扰项的事实则分散在各自手中。辩论两轮得到 **68.8% 的准确率**，消耗相当于 8.8 次独立作答，比对应的 pass@<i>n</i><sub>B</sub> 低 1.5 个百分点。直接转发各自掌握的事实，准确率达到 **95.9%**，消耗降至 6.2 次独立作答，**超过对应的 pass@<i>n</i><sub>B</sub> 31.0 个百分点**。当每个人都看到相同材料时，结论随之改变。在六个共享信息基准上，用 Qwen3.5-9B 测试的三种协作方法均未超过等预算多数票。[论文 §5、表 1–2](https://arxiv.org/pdf/2611.32606v1#page=8)

即使私有线索值得交换，商量怎样交换也有成本。在限制成员读取消息的 HiddenBench 实验里，每个 27B 智能体原本只能读一条消息。允许它们把读取额度转给队友后，准确率从 49.6% 升至 67.7%。34.5% 的运行中出现了负责汇集消息的中心节点。这种自组织带来了可测量的收益，但团队得分仍低于等预算的 pass@<i>n</i><sub>B</sub>。[表 3](https://arxiv.org/pdf/2611.32606v1#page=11)

### 上一代究竟教会了下一代什么？

在 SplitBench 上，父代团队先完成 501 道训练题，留下交互记录。比如，成员尚未读到队友消息时，协议就可以检查它的首次发言是否已经传达自己掌握的私有事实。下一代用通过检查的发言训练。训练第二代时，每个席位采样四条候选发言，保留通过检查且最短的一条。这样，即使没有整道题的标准答案，模型也能得到具体的训练信号，学习怎样用更少的文字把线索说清楚。[论文 §4.3、§7.2](https://arxiv.org/pdf/2611.32606v1)

在 196 道留出题上，使用三步辩论的 9B 团队，相对基础模型等预算 pass@<i>n</i><sub>B</sub> 的差值从 **−25.3** 个百分点升至 **−2.8**，再升至 **+15.9**。关键对照是沿用第二代的训练流程，但把训练材料换回基础模型的发言，得到的差值为 **−3.3** 个百分点。第二代在首个训练种子上领先对照组 19.2 个百分点，另四个种子上平均领先 11.5 个百分点，四次均为正。27B 模型的第二次提升则来自成本端，准确率持平，开销从相当于 9.6 次独立作答降至 6.4 次。同时报告准确率与预算，才能读出两种提升的差别。[论文 §7.2、表 4 与附录 F](https://arxiv.org/pdf/2611.32606v1)

在更长的递归实验里，作者用每轮新抽的题目比较候选模型与父代。PlanBench 连续发布了四代，HiddenBench 的一组实验发布了五代，合作纸牌游戏 Hanabi 发布了六代，末代在满分 25 分的游戏中约得 4.5 分。什么样的输出值得学，取决于任务提供的检验手段。在积木规划任务里，模拟器可以直接执行方案。在 HiddenBench 上，检验依据是多个看得到全部事实的基础模型智能体能否达成共识。因此，“无需外部标签”仍有一个前提，即任务能提供可信的筛选信号。如果看全材料的智能体犯了相同的错，共识也会把这个错保留下来。[论文 §4.4、§7.4–7.5](https://arxiv.org/pdf/2611.32606v1)

</div>
