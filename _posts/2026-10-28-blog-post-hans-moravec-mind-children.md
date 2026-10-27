---
title: "[Book Notes] Hans Moravec: Embodied Intelligence, Mind Children, and Life Beyond Biology"
date: 2026-10-28
permalink: /posts/2026/10/hans-moravec-mind-children/
excerpt: "An introduction to Hans Moravec's ideas: why perception and movement are hard for machines, how minds might outlive biological bodies, and why he imagined robots as humanity's descendants."
tags:
  - Book Notes
  - Robotics
  - AI
  - Embodied Intelligence
  - Philosophy
  - Consciousness
  - Transhumanism
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## Introduction: The Hand and the Mind

Choosing a chess move and moving the piece are different engineering problems. Hans Moravec's 1993 essay *The Age of Robots* contrasts powerful chess programs with unreliable robots handling the pieces. [The Age of Robots](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1993/Robot93.html)

The same researcher imagined that human minds might eventually leave their biological bodies. That combination makes Moravec worth reading. How can someone who takes physical intelligence so seriously also believe in a future beyond biology?

This essay approaches that question through his robotics work, *Mind Children: The Future of Robot and Human Intelligence* (Harvard University Press, 1988), and *Robot: Mere Machine to Transcendent Mind* (Oxford University Press, conventionally cited as 1999; Moravec's own pages date its release to late 1998). It is an introduction to his arguments, drawing on his publicly available essays and book previews. [Mind Children bibliography](https://frc.ri.cmu.edu/~hpm/book88/MC.details.html) · [CMU's Robot listing](https://www.cs.cmu.edu/~books/books/moravec.html) · [Author's bibliography](https://frc.ri.cmu.edu/~hpm/hpm.pubs.html)

## 1. A Roboticist Before a Futurist

Moravec's speculative writing grew out of work on mobile robots, perception, and spatial representation. He received his doctorate at Stanford in 1980 and subsequently worked at Carnegie Mellon. In 2003, he co-founded Seegrid to commercialize robot perception and mobility. These details matter because his starting problem was practical: how can a machine operate in a place that has not been arranged for it? [Author's CV](https://frc.ri.cmu.edu/~hpm/hpm.cv.html)

His 1996 report on stereo vision and three-dimensional evidence grids offers a concrete example. Multiple camera views contribute evidence about which regions of space are occupied, empty, or still unknown. The report demonstrates reconstructed office and laboratory scenes and describes the system as a proof of concept. [Robot Spatial Perception by Stereoscopic Vision and 3D Evidence Grids](https://frc.ri.cmu.edu/~hpm/project.archive/robot.papers/1996/9609.stereo.paper/SGabstract.html)

The distinction between empty and unknown remains instructive. A robot cannot safely treat everything it has failed to observe as free space. Intelligence in this setting includes maintaining uncertainty and choosing actions that remain sensible despite incomplete information. A fluent description of a room does not supply that capability by itself.

## 2. Moravec's Paradox: Effort Is a Poor Measure of Computation

**Moravec's paradox** is the observation that explicit reasoning can be easier to automate than ordinary perception and movement. His evolutionary explanation is that seeing and acting draw on ancient, extensively adapted biological machinery, while formal reasoning is a comparatively recent and awkward human skill. [The Age of Robots](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1993/Robot93.html)

In *Re-Evolving Mind*, he adds a hardware perspective: early computers were exceptionally effective at arithmetic but painfully constrained when processing images and controlling robot limbs. Numerical speed could therefore give a misleading impression of their general capability. [Re-Evolving Mind](https://frc.ri.cmu.edu/~hpm/project.archive/robot.papers/2000/Cerebrum.html)

For a robotics researcher, the useful lesson is methodological. Consider picking up a cup: locating its handle, estimating its weight, detecting slip, and adjusting grip all belong to the task. Describing the intended motion leaves those problems open. This is my application of Moravec's argument, rather than a claim about a particular contemporary model.

The paradox is a warning against using human introspection as a computational cost estimate. It gives no permanent ranking of every AI task. Data, algorithms, hardware, and the conditions under which success is measured can change what is difficult.

## 3. Why He Expected Machines to Catch Up

Moravec treated insufficient computing power as a major obstacle to robotics. In the preview of *Robot*'s third chapter, he estimates the computation needed to reproduce retinal processing and extrapolates toward the brain. He then connects these estimates to historical improvements in computing. This is an engineering extrapolation with substantial assumptions, especially about how biological function maps onto computer instructions. [Robot, Chapter 3 preview](https://frc.ri.cmu.edu/~hpm/book97/ch3/index.html)

He also made dated predictions. In his 1999 *Scientific American* article, he forecast useful mobile robots with roughly reptile-like capabilities by 2010 and a freely moving machine with human intellectual capabilities by 2040. These are historical forecasts, not established milestones or dates endorsed here. [Rise of the Robots](https://frc.ri.cmu.edu/~hpm/project.archive/robot.papers/1999/SciAm.scan.html)

An estimate of available computation cannot alone specify a working learning system. It leaves questions about representation, experience, memory, control, and evaluation. I find Moravec's insistence on taking hardware limits seriously more persuasive than treating a hardware curve as a sufficient timetable for intelligence. That judgment would need revisiting if a reproducible scaling relationship connected resources to broadly reliable physical competence.

His proposed destination was a **universal robot**: a machine with broad usefulness in the physical world, analogous to the versatility of a programmable computer in the information world. [Robot, Chapter 4 preview](https://frc.ri.cmu.edu/~hpm/book97/ch4/index.html)

## 4. Mind Children: Who Inherits Human Civilization?

Moravec saw intelligent machines as possible descendants of humanity. They could inherit knowledge and skills through culture and engineering, without inheriting our genes. His book preview accepts the possibility that such descendants would eventually displace people from central roles; he regarded their development as a continuation of what humans had begun. [Robot: author's synopsis](https://frc.ri.cmu.edu/~hpm/book97/)

This is the ethical force of the phrase **mind children**. It asks readers to care about what our intelligence produces, even when the result no longer resembles us.

The family analogy also hides a difficult question. Cultural descent does not guarantee concern for one's creators. A system can preserve human knowledge while pursuing ends that humans reject. Whether we should welcome a successor depends on its treatment of existing people and other beings, not simply on its capabilities. That is a criticism of Moravec's framing: a prediction about succession needs a separate moral argument before succession becomes something to celebrate.

## 5. Pattern Identity and the Uploading Thought Experiment

The route from robotics to mind uploading depends on a claim about personal identity. In *Dualism through Reductionism*, Moravec favors **pattern identity**: what matters is the organization of a mind, rather than the continued presence of its original material. His thought experiment replaces small portions of a functioning brain with computational equivalents until the mental process runs on a different substrate. He takes a faithful copy seriously as a continuation of the person. [Dualism through Reductionism](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1986/dualism.html)

Several questions have to be kept separate here. Can a system reproduce a person's behavior? Would it have experiences? Would those experiences belong to the same person? Success on the first question does not settle the other two.

Suppose two copies begin with the same memories and then live different lives. They soon acquire incompatible experiences. Calling both continuations of an earlier pattern is coherent, but it revises the familiar idea of a person as one uniquely continuing subject. The copying procedure cannot decide whether that revision captures what someone means by surviving.

Gradual replacement makes the proposal more intuitive because it avoids an obvious interruption. Even so, continuity of observable function is doing much of the argumentative work. The thought experiment assumes that the relevant properties of experience can survive the substitution; it does not experimentally establish that assumption.

## 6. How Can Embodiment Matter If Minds Can Change Bodies?

The apparent contradiction becomes clearer if we distinguish acquiring intelligence from preserving an already developed mind. A body can be essential to learning the world without its original biological material being essential to every later implementation of that knowledge. This distinction is my reconstruction of the relationship between Moravec's robotics and his philosophy.

He did not simply imagine human minds becoming files with no surroundings. In *Pigs in Cyberspace*, his speculative accounting includes a simulated body and environment for an uploaded human, while allowing that a differently designed AI might not need the same support. [Pigs in Cyberspace](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1992/CyberPigs.html)

That leaves a harder question than whether silicon can replace neurons: **which relationships must be preserved?** A person's thinking may depend on bodily feedback, habits of action, and ongoing interaction with other people. An adequate transfer would have to identify which of these are constitutive of the mind and reproduce or replace them. Calling the mind a pattern does not tell us how large the pattern is.

## 7. From Simulated Minds to a Postbiological Universe

Moravec's ambitions extended beyond individual survival. *Pigs in Cyberspace* imagines machine descendants expanding into space and progressively using matter for computation. In *Simulation, Consciousness, Existence*, he goes further, exploring the possibility that minds and worlds have reality through their abstract relations. This reaches toward mathematical Platonism, far beyond a proposal for better robot hardware. [Pigs in Cyberspace](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1992/CyberPigs.html) · [Simulation, Consciousness, Existence](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1998/SimConEx.98.html)

These arguments have different evidential demands. A spatial mapping algorithm can be tested against measurements. An economic forecast requires assumptions about institutions and incentives. A claim that an abstract structure contains conscious experience requires a theory of consciousness and of what counts as implementing that structure. Agreement with the first does not commit a reader to the last.

This separation is particularly useful when reading Moravec: his confidence and imaginative continuity can make a sequence of conjectures feel like a single technical result.

## 8. What I Would Take Back to Robotics

The following are research questions prompted by Moravec, rather than predictions he made about present-day AI architectures.

For embodied systems, evaluate the whole interaction. A robot that can describe a grasp still needs to establish contact, respond to movement, and recover when an assumption fails. Report the conditions under which it succeeds, including how much human intervention it requires.

For world models, ask what an agent can do with uncertainty. An internal representation becomes useful when it helps distinguish an unseen region from an empty one, select an informative action, or anticipate a failure. The evidence-grid example gives this question a concrete starting point.

For machine successors, separate capability from the ends it serves. A more capable agent creates a larger decision space; deciding whose interests govern those decisions remains a problem of design and institutions.

| Idea | Useful question | What the idea alone does not establish |
|---|---|---|
| Moravec's paradox | Which apparently simple abilities conceal difficult computation? | A permanent ordering of task difficulty |
| Compute-based forecasts | Which capabilities are currently resource-limited? | A sufficient algorithm or a reliable arrival date |
| Mind children | What could machines inherit from human culture? | That successors will protect human interests |
| Pattern identity | What organization must be preserved for a mind to continue? | That copying guarantees personal survival |
| Postbiological intelligence | How might intelligence function in other substrates? | That simulated or abstract minds necessarily have experience |

My strongest takeaway is his insistence that familiar physical abilities deserve serious intellectual respect. The question I would keep open is more demanding: if a machine preserves our knowledge, habits, and memories, what else would it have to preserve for us to call its future our own?

## Further Reading

- Hans Moravec, *Mind Children: The Future of Robot and Human Intelligence*. Harvard University Press, 1988. [Author's book page](https://frc.ri.cmu.edu/~hpm/book88/MC.details.html).
- Hans Moravec, *Robot: Mere Machine to Transcendent Mind*. Oxford University Press, 1999; the author's bibliography records a November 1998 release. [Author's preview and chapter guide](https://frc.ri.cmu.edu/~hpm/book97/).
- [The Age of Robots](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1993/Robot93.html), 1993, for the connection between sensorimotor difficulty and his forecast of machine intelligence.
- [Dualism through Reductionism](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1986/dualism.html), 1986, for pattern identity and mind transfer.
- [Simulation, Consciousness, Existence](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1998/SimConEx.98.html), 1998 web version, for the more speculative philosophical argument.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，可通过顶部导航栏的语言按钮切换。

## 引言：下棋的头脑与移动棋子的手

决定下一步棋怎么走，与真正移动棋子，是两类不同的工程问题。Hans Moravec（汉斯·莫拉维克）在 1993 年的《机器人时代》中对比过两者：下棋程序能力很强，负责移动实体棋子的机器人却仍然不可靠。[The Age of Robots](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1993/Robot93.html)

也正是这位研究者，设想过人类心智最终离开生物身体的未来。这个组合很值得琢磨：一个如此重视身体与物理交互的人，为什么又相信智能可以走向“后生物”时代？

本文结合他的机器人研究、公开文章和著作预览，介绍其思想脉络。两本主要著作是 *Mind Children: The Future of Robot and Human Intelligence*（哈佛大学出版社，1988）与 *Robot: Mere Machine to Transcendent Mind*（牛津大学出版社，通常按 1999 年引用；Moravec 自己的网页将发行时间记为 1998 年末）。前者可理解为“心智的孩子”，后者讨论机器如何走向超越人类的心智。[Mind Children 书目信息](https://frc.ri.cmu.edu/~hpm/book88/MC.details.html) · [CMU 的 Robot 书目](https://www.cs.cmu.edu/~books/books/moravec.html) · [作者出版目录](https://frc.ri.cmu.edu/~hpm/hpm.pubs.html)

## 1. 先是一位机器人研究者

Moravec 对未来的想象，起点是移动机器人、感知和空间表示。他于 1980 年在斯坦福大学获得博士学位，之后在卡内基梅隆大学开展研究，并于 2003 年共同创办 Seegrid，推动机器人感知与移动技术的商业化。这段经历有助于理解他的问题意识：机器怎样才能在一个没有为它预先布置好的地方工作？[作者简历](https://frc.ri.cmu.edu/~hpm/hpm.cv.html)

他在 1996 年关于双目视觉与三维证据栅格的报告，提供了一个具体例子。系统将多个视角的观测积累为空间证据，区分哪些区域可能被占据、哪些是空闲的、哪些仍然未知。报告展示了办公室和实验室场景的重建，并将系统定位为概念验证。[Robot Spatial Perception by Stereoscopic Vision and 3D Evidence Grids](https://frc.ri.cmu.edu/~hpm/project.archive/robot.papers/1996/9609.stereo.paper/SGabstract.html)

“空闲”与“未知”的区别尤其值得保留。机器人不能因为没看见障碍物，就把那片空间当成安全通道。在这里，智能包括维护不确定性，以及在信息不完整时选择仍然合理的行动。能够流畅地描述一个房间，本身并不提供这种能力。

## 2. 莫拉维克悖论：费不费力，不能衡量计算有多难

**莫拉维克悖论（Moravec's paradox）**指这样一种观察：显式推理可能比日常感知和运动更容易自动化。Moravec 从进化角度解释这一点：看见世界、在世界中行动，依赖经过漫长演化的生物机制；形式推理则是人类较晚获得、使用起来也不那么自然的能力。[The Age of Robots](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1993/Robot93.html)

在《重新演化心智》中，他又补充了硬件视角：早期计算机特别擅长算术，但处理图像、控制机械肢体时受到严重限制。数字计算上的速度优势，很容易让人高估机器的一般能力。[Re-Evolving Mind](https://frc.ri.cmu.edu/~hpm/project.archive/robot.papers/2000/Cerebrum.html)

对机器人研究来说，这首先是一条方法论提醒。以拿起杯子为例，找到杯柄、估计重量、察觉滑动并调整握力，都是任务的一部分。描述预期动作，并没有解决这些问题。这里是我对 Moravec 观点的应用，并非对某个当代模型的具体评价。

这个悖论提醒我们，不要用人的主观费力程度估算计算难度。它并没有给所有 AI 任务排出一个永远不变的顺序。数据、算法、硬件和成功标准都可能改变任务的难易。

## 3. 他为什么相信机器最终能赶上来？

Moravec 将计算能力不足视为机器人发展的重要障碍。在 *Robot* 第三章的预览中，他从复现视网膜处理功能需要多少计算出发，向整个大脑外推，再把估算与计算机性能增长联系起来。这是一种带有较强假设的工程推算，尤其依赖如何把生物功能换算成计算机指令。[Robot 第三章预览](https://frc.ri.cmu.edu/~hpm/book97/ch3/index.html)

他也提出过明确的时间预测。1999 年发表于《科学美国人》的文章，预期到 2010 年会出现具有某些爬行动物式能力的实用移动机器人，到 2040 年会出现能够自由移动、具有人类智力水平的机器。这些是历史预测，不是已经确立的技术里程碑，也不是本文认可的到来日期。[Rise of the Robots](https://frc.ri.cmu.edu/~hpm/project.archive/robot.papers/1999/SciAm.scan.html)

仅仅估算可用算力，并不能给出一个可运行的学习系统。表示、经验、记忆、控制和评估仍然需要具体答案。我更认同他要求认真对待硬件限制的态度；至于能否从一条硬件增长曲线推导出智能的时间表，我保留判断。如果未来能建立可复现的规律，将资源规模与广泛、可靠的物理能力联系起来，这个判断就需要重新检查。

他设想的目标是**通用机器人（universal robot）**：在物理世界中具备广泛用途的机器，其角色类似于可编程计算机在信息世界中的角色。[Robot 第四章预览](https://frc.ri.cmu.edu/~hpm/book97/ch4/index.html)

## 4. “心智的孩子”：谁来继承人类文明？

Moravec 将智能机器视为人类可能的后代。它们可以通过文化与工程继承知识和技能，而不必继承我们的基因。他在著作简介中接受这样一种可能：机器后代最终会取代人类的中心地位；在他看来，它们的发展也可以延续人类已经开始的事业。[Robot：作者内容简介](https://frc.ri.cmu.edu/~hpm/book97/)

**Mind children** 这个比喻的伦理意味就在这里：即使我们创造出的智能不再像我们，它所展开的未来仍可能值得关心。

但家庭比喻也遮住了一个难题。文化上的继承关系，并不保证后代会关心创造者。一个系统可以保存人类知识，同时追求我们无法接受的目标。我们是否应该欢迎这样的继承者，取决于它如何对待现存的人和其他生命，不能只看它有多强。这是我对 Moravec 思想的一点批评：从“可能发生继承”走到“值得庆祝这种继承”，还需要单独的伦理论证。

## 5. 模式同一性与心智上传

从机器人走到心智上传，需要经过一个关于个人身份的主张。在《通过还原论走向二元论》中，Moravec 倾向于**模式同一性（pattern identity）**：一个人的延续取决于心智的组织模式，而不必依赖原来那份物质一直存在。他设想逐步用计算上的等效系统替换正常运作的大脑局部，直到整个心智过程运行于另一种载体，并认真主张忠实副本可以延续这个人。[Dualism through Reductionism](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1986/dualism.html)

这里有几个不能混在一起的问题。系统能否复现一个人的行为？它是否拥有体验？这些体验是否属于同一个人？第一个问题得到肯定答案，并不自动回答后两个问题。

假设两个副本从相同的记忆出发，之后各自生活。它们很快就会获得彼此不同的经历。把两者都称为早先模式的延续，可以形成自洽的说法，但这也修改了我们熟悉的个人身份概念：一个人通常被理解为唯一、持续的主体。复制程序本身无法裁定，这种修改是否保留了人们所说的“我活下来了”。

逐步替换让设想更容易被接受，因为过程中没有明显的中断。但论证仍然高度依赖可观察功能的连续性。思想实验预先假定了与体验有关的重要性质能够经受替换；它没有通过实验确立这个假定。

## 6. 身体如此重要，心智又怎么能换一个身体？

区分“智能怎样形成”与“已经形成的心智怎样保存”，有助于理解这个表面矛盾。身体可以对学习世界至关重要，但这不等于后续每一种实现都必须保留原来的生物材料。这是我对 Moravec 机器人研究与心智哲学之间关系的重构。

他也没有简单地把上传后的人想成一个没有环境的文件。在《赛博空间里的猪》中，他对未来计算资源的推算包含了供上传人类使用的模拟身体与环境，同时允许另一种设计的 AI 不需要完全相同的支持。[Pigs in Cyberspace](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1992/CyberPigs.html)

这样，问题就比“硅能不能替代神经元”更具体了：**究竟要保留哪些关系？** 一个人的思考可能依赖身体反馈、行动习惯，以及与他人持续发生的互动。充分的迁移需要辨认其中哪些关系构成了心智，并复制它们或提供替代。把心智称为一种模式，并没有告诉我们这个模式的边界究竟有多大。

## 7. 从模拟心智走向后生物宇宙

Moravec 的设想超出了个人生存。《赛博空间里的猪》描绘机器后代扩展到太空、逐渐将物质用于计算的未来。在《模拟、意识与存在》中，他进一步探讨心智和世界是否可以凭借抽象关系而具有实在性。这已经走向数学柏拉图主义，远远超出了改进机器人硬件的工程方案。[Pigs in Cyberspace](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1992/CyberPigs.html) · [Simulation, Consciousness, Existence](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1998/SimConEx.98.html)

这些论证需要的证据不同。空间建图算法可以拿测量结果检验；经济预测需要关于制度和激励的假设；抽象结构能否包含意识体验，则需要意识理论，以及“怎样才算实现了这个结构”的判准。认同前面的研究，并不要求读者接受最后的哲学立场。

读 Moravec 时，这种区分尤其有用。他的自信和连贯的想象，很容易让一连串猜想读起来像同一个技术结论。

## 8. 哪些问题值得带回机器人研究？

以下是阅读 Moravec 后引出的研究问题，并非他对当代 AI 架构做出的预测。

对于具身系统，应当评估完整交互。一个能够描述抓取的机器人，还需要建立接触、响应物体运动，并在假设失效时恢复。报告成功率时，应交代成功所需的条件，包括有多少人工干预。

对于世界模型，应当追问智能体怎样利用不确定性。当内部表示能够帮助区分“尚未看见”与“确实空闲”、选择有信息价值的动作，或者预见一次失败时，它才对行动产生具体价值。证据栅格给这个问题提供了一个很实在的起点。

对于机器继承者，需要把能力与能力服务的目的分开。更强的智能体能做更多选择；由谁的利益来约束这些选择，仍然是设计与制度问题。

| 思想 | 值得保留的问题 | 单靠这一思想无法确立的结论 |
|---|---|---|
| 莫拉维克悖论 | 哪些看似简单的能力隐藏着困难的计算？ | 任务难度存在永恒排序 |
| 基于算力的预测 | 哪些能力目前受资源限制？ | 已有充分的算法或可靠的到来日期 |
| 心智的孩子 | 机器能够继承哪些人类文化？ | 继承者一定保护人类利益 |
| 模式同一性 | 心智延续需要保存怎样的组织？ | 复制保证了个人生存 |
| 后生物智能 | 智能可以怎样在其他载体上运行？ | 模拟或抽象心智必然拥有体验 |

我最愿意保留的，是他对日常身体能力的认真：熟悉，不代表简单。至于更远的未来，我想留下一个更难的问题——如果机器保存了我们的知识、习惯和记忆，它还需要保存什么，我们才会把它的未来称为自己的未来？

## 延伸阅读

- Hans Moravec，*Mind Children: The Future of Robot and Human Intelligence*，哈佛大学出版社，1988。[作者书籍页面](https://frc.ri.cmu.edu/~hpm/book88/MC.details.html)。
- Hans Moravec，*Robot: Mere Machine to Transcendent Mind*，牛津大学出版社，1999；作者出版目录记录的发行时间为 1998 年 11 月。[作者预览与章节导读](https://frc.ri.cmu.edu/~hpm/book97/)。
- [The Age of Robots](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1993/Robot93.html)，1993，连接感知运动难题与机器智能预测。
- [Dualism through Reductionism](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1986/dualism.html)，1986，介绍模式同一性与心智迁移。
- [Simulation, Consciousness, Existence](https://frc.ri.cmu.edu/~hpm/project.archive/general.articles/1998/SimConEx.98.html)，1998 年网页版本，展开更具推测性的哲学论证。

</div>
