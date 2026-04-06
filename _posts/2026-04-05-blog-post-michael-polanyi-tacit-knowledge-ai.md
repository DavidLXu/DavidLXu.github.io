---
title: "Michael Polanyi: Tacit Knowledge, Personal Knowing, and What AI Still Cannot Tell"
date: 2026-04-05
permalink: /posts/2026/04/michael-polanyi-tacit-knowledge-ai/
excerpt: "Polanyi's framework of tacit knowledge and personal knowing offers a lens for understanding what AI still cannot do — and why embodied, context-dependent skill remains hard to formalize."
tags:
  - Philosophy
  - AI
  - Robotics
  - Epistemology
  - Tacit Knowledge
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## Introduction

In 1966, the Hungarian-British polymath **Michael Polanyi** (1891--1976) opened his book *The Tacit Dimension* with a deceptively simple sentence:

> "We can know more than we can tell."

Six decades later, this observation has become one of the most cited ideas in AI research, organizational theory, and cognitive science --- and arguably the deepest unsolved challenge for building truly intelligent machines. Polanyi spent his career as a physical chemist before turning to philosophy, and his work offers a remarkably prescient framework for understanding why modern AI systems, despite their extraordinary capabilities, still struggle with the kind of knowing that humans take for granted.

This post introduces Polanyi's four major ideas --- **tacit knowledge**, **personal knowledge**, **the fiduciary framework**, and his **critique of scientism** --- and explores how each one illuminates fundamental challenges in AI learning systems and robotics today.

---

## 1. Tacit Knowledge: "We Can Know More Than We Can Tell"

### The Idea

Polanyi's most famous contribution is the concept of **tacit knowledge** --- knowledge that we possess and use but cannot fully articulate or formalize. You can recognize a friend's face in a crowd of thousands, but you cannot explain *how* you do it. A skilled cyclist maintains balance through subtle adjustments, but if asked to describe the physics involved, they would be at a loss.

Polanyi identified a precise **from-to structure** in tacit knowing:

- **Proximal term** (subsidiary awareness): the clues, tools, or particulars we rely on but do not focus on directly.
- **Distal term** (focal awareness): the comprehensive entity or meaning we attend to.

We attend **from** subsidiary particulars **to** the focal whole. Crucially, if we shift our attention to the subsidiaries themselves, we destroy the meaning --- like how focusing on the individual finger movements while typing makes you unable to type fluently.

> "While tacit knowledge can be possessed by itself, explicit knowledge must rely on being tacitly understood and applied. Hence all knowledge is either tacit or rooted in tacit knowledge. A wholly explicit knowledge is unthinkable."

### Implications for AI

This idea was formally named **Polanyi's Paradox** by MIT economist David Autor in 2014: because we know more than we can tell, we cannot straightforwardly program computers to do everything we can do. For decades, this paradox explained why tasks requiring tacit knowledge --- driving, medical diagnosis, natural conversation, grasping objects --- resisted automation far longer than explicit, rule-based tasks.

Deep learning has made dramatic progress on some of these tasks, but in a deeply ironic way. As AI researcher Subbarao Kambhampati argued in his 2021 article *"Polanyi's Revenge"*, neural networks have swung from the old paradigm of encoding explicit knowledge (classical expert systems) to learning tacit knowledge from data --- and now **the AI itself "knows more than it can tell."** These models develop capabilities they cannot explain, creating the modern crisis of **interpretability**, **bias**, and **robustness**.

In robotics, the challenge is even starker. A human craftsman's hands "know" how much pressure to apply when shaping clay --- this is embodied tacit knowledge built through years of practice. Modern robot learning through reinforcement learning and imitation learning attempts to develop analogous sensorimotor knowledge through trial-and-error interaction with the physical world. But the resulting policies remain brittle: they work in trained scenarios but fail when the context shifts even slightly, suggesting that something essential about tacit knowing --- its contextual, integrated, flexible nature --- has not been captured.

---

## 2. Personal Knowledge: The Knower Cannot Be Eliminated

### The Idea

In his magnum opus *Personal Knowledge: Towards a Post-Critical Philosophy* (1958), Polanyi argued that **all knowledge is personal knowledge**. There is no purely objective, detached, impersonal knowing. Every act of knowing involves the passionate participation of the knower:

> "Into every act of knowing there enters a passionate contribution of the person knowing what is being known, and this coefficient is no mere imperfection but a vital component of his knowledge."

The scientist does not stand apart from the universe but participates within it. Discovery requires **intellectual passions** --- a sense of beauty, elegance, and significance that guides the scientist toward fruitful questions. Copernicus arrived at the heliocentric model not by following a mechanical method, but via what Polanyi described as "the greater intellectual satisfaction he derived from the celestial panorama as seen from the Sun instead of the Earth."

Polanyi called this **"indwelling"**: the knower immerses themselves in the subject matter, understanding it from within rather than merely observing from a detached standpoint.

### Implications for AI

Modern AI systems have no "personal" stake in their knowledge. A language model processes tokens; a vision model processes pixels. They have no intellectual passions, no sense of beauty or significance guiding their exploration. This is not merely a poetic observation --- it has practical consequences.

Consider **active learning** and **curiosity-driven exploration** in reinforcement learning. Researchers have tried to give agents intrinsic motivation to explore --- but these are engineered reward signals, not genuine intellectual passions emerging from a committed knower embedded in a world. The agent does not *care* about what it discovers.

Polanyi's concept of indwelling also challenges the dominant paradigm in robot learning. Current approaches treat the robot as an external observer that builds a model of the world. But Polanyi would argue that genuine understanding requires the knower to be *in* the world, not merely modeling it. This resonates with the **embodied cognition** movement in cognitive science and robotics, which argues that intelligence is not just computation but is constituted by the agent's bodily interaction with its environment.

The philosopher Hubert Dreyfus, deeply influenced by Polanyi, built his landmark critique of AI (*What Computers Can't Do*, 1972) on exactly this insight: intelligence cannot be reduced to rule-following on symbols; it requires embodiment, context, and a kind of engaged know-how that resists formalization.

---

## 3. The Fiduciary Framework: Knowledge Rests on Trust

### The Idea

"Fiduciary" comes from the Latin *fiducia* (trust). Polanyi's fiduciary framework holds that **all knowing rests on an act of faith** --- a personal commitment to beliefs that could conceivably be false.

We must trust our senses, our intellectual faculties, our inherited frameworks, and the community of knowers before any knowledge is possible. This is not a weakness to be overcome but the very foundation of knowing:

> "We believe more than we can know, and know more than we can say."

When a knower asserts something, they make a **personal commitment with universal intent** --- they believe it to be true for everyone, not just for themselves. This is what distinguishes personal knowledge from mere subjective opinion. Knowledge grows in the "fertile soil of traditioned community and apprenticeship to masters" --- what Polanyi called **conviviality**.

### Implications for AI

The fiduciary framework maps surprisingly well onto problems in modern AI:

**Trust in training data.** Every machine learning system makes a fundamental fiduciary commitment: it trusts that its training data is representative of the reality it will encounter. When this trust is misplaced --- when the data is biased, corrupted, or non-representative --- the system fails. But unlike a human knower who can reflect on and question their commitments, most AI systems have no mechanism for interrogating the foundations of their own knowledge.

**Community and tradition in learning.** Polanyi emphasized that knowledge is transmitted through apprenticeship, imitation, and participation in a community of practice. This resonates with recent work in AI on **learning from demonstration**, **human-in-the-loop training**, and **RLHF (Reinforcement Learning from Human Feedback)**. These methods implicitly acknowledge that knowledge cannot be fully formalized --- it must be transmitted through example and correction, much as a master craftsman teaches an apprentice.

**The alignment problem.** Polanyi's insistence that knowledge involves commitment with universal intent has echoes in the AI alignment problem. We want AI systems to make commitments (decisions, recommendations) that are aligned with human values --- but how do you instill genuine commitment in a system that has no personal stake in truth?

---

## 4. Critique of Scientism: Against Reductionism

### The Idea

Polanyi was, as one scholar put it, "a scientist against scientism." He opposed several dominant assumptions:

- **Objectivism**: that genuine knowledge requires the complete elimination of the personal element.
- **Positivism/Scientism**: that science is the only real source of truth and provides a purely objective method.
- **Reductionism**: that all phenomena can be fully explained by reducing them to physics and chemistry.

His most original contribution here was the concept of **dual control** and **boundary conditions**, developed in his 1968 paper "Life's Irreducible Structure" published in *Science*:

Every machine (and every living organism) is subject to two kinds of control. The lower level obeys the laws of physics and chemistry. But the upper level --- the design, purpose, or organizational principle --- harnesses those laws by imposing **boundary conditions** that physics leaves open. You cannot derive the meaning of a sentence from the physics of sound waves. You cannot derive the function of a machine from the chemistry of its materials. Reality forms a hierarchy:

> physics < chemistry < biology < consciousness < culture

Each level relies on the principles below it but is **irreducible** to them. Higher-level principles exercise genuine "downward causation."

### Implications for AI

Polanyi's anti-reductionism speaks directly to the architecture of modern AI systems and the challenge of building robots that genuinely understand the world:

**The symbol grounding problem.** Classical AI tried to build intelligence from symbols and rules (top-down). Deep learning tries to build it from raw sensory data (bottom-up). Polanyi would argue that neither approach alone can succeed, because meaning emerges at the *boundary* between levels --- it is neither reducible to low-level patterns nor fully capturable in high-level rules. Modern **neuro-symbolic AI** and **foundation models for robotics** that combine learned representations with structured reasoning are, perhaps unknowingly, moving toward Polanyi's vision.

**Emergence in complex systems.** When we train a large language model, emergent capabilities appear at scale that were not explicitly programmed. Polanyi's framework of hierarchical levels with irreducible emergent properties provides a philosophical lens for understanding why these capabilities appear and why they resist reductionist explanation. The model's "understanding" (if we can call it that) exists at a level that cannot be fully explained by examining individual weights or neurons.

**Robot manipulation.** A robot grasping an egg must integrate physics (forces, friction), perception (shape, texture), and purpose (don't break it; place it gently). These operate at different levels of Polanyi's hierarchy, and successful manipulation requires what he would call the higher level imposing boundary conditions on the lower. Current end-to-end learning approaches try to collapse this hierarchy into a single function approximator --- which may explain why they succeed in narrow tasks but fail to generalize.

---

## Conclusion: What Polanyi Teaches Us About the Future of AI

Michael Polanyi died in 1976, long before the deep learning revolution. Yet his ideas remain startlingly relevant:

| Polanyi's Insight | Modern AI Challenge |
|---|---|
| Tacit knowledge cannot be fully articulated | Polanyi's Paradox; the interpretability crisis |
| All knowledge is personal and committed | The alignment problem; lack of genuine understanding |
| Knowledge rests on trust and community | Data quality; learning from human feedback |
| Reality is hierarchically organized and irreducible | Symbol grounding; emergent capabilities; generalization |

Perhaps the deepest lesson from Polanyi is a kind of **epistemic humility**. The dream of fully explicit, fully formalized, fully objective knowledge --- whether in science or in AI --- is not merely difficult to achieve; it is, in principle, unachievable. All knowledge is rooted in tacit knowing, sustained by personal commitment, and embedded in a community of trust.

This does not mean we should stop building AI systems. It means we should build them with an awareness of what they *cannot* be --- and design them to work *with* human knowers rather than to replace them. The most promising directions in AI today --- human-in-the-loop learning, embodied robotics, neuro-symbolic reasoning, interpretable AI --- all implicitly acknowledge Polanyi's insights, even when they don't cite his name.

As Polanyi might have said: the machine can learn more than it can tell us. The question is whether we can learn to trust what it knows --- and whether it can learn to know what we trust.

---

## Further Reading

- Polanyi, M. (1958). *Personal Knowledge: Towards a Post-Critical Philosophy*. University of Chicago Press.
- Polanyi, M. (1966). *The Tacit Dimension*. Doubleday.
- Polanyi, M. (1968). Life's Irreducible Structure. *Science*, 160(3834), 1308--1312.
- Autor, D. (2014). Polanyi's Paradox and the Shape of Employment Growth. *NBER Working Paper 20485*.
- Kambhampati, S. (2021). Polanyi's Revenge. *Communications of the ACM*.
- Dreyfus, H. (1972). *What Computers Can't Do: The Limits of Artificial Intelligence*. MIT Press.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 引言

1966年，匈牙利裔英国博学家**迈克尔·波兰尼**（Michael Polanyi，1891--1976）在他的著作《隐性维度》(*The Tacit Dimension*) 开篇写下了一句看似简单却意味深远的话：

> "我们所知道的，远比我们能说出来的多。"（We can know more than we can tell.）

六十年后的今天，这一论断已成为人工智能研究、组织理论和认知科学中被引用最多的思想之一——也可以说是构建真正智能机器所面临的最深层、尚未解决的挑战。波兰尼前半生是一位杰出的物理化学家，后半生转向哲学，他的工作为理解现代AI系统——尽管能力非凡——为何仍在人类习以为常的认知方式上举步维艰，提供了一个极具前瞻性的框架。

本文介绍波兰尼的四个核心思想——**隐性知识**、**个人知识**、**信托框架**和**对科学主义的批判**——并探讨它们如何揭示当今AI学习系统和机器人技术面临的根本性挑战。

---

## 1. 隐性知识："我们知道的比能说出的多"

### 核心思想

波兰尼最著名的贡献是**隐性知识**（tacit knowledge）的概念——我们拥有并使用、但无法完全表述或形式化的知识。你能在成千上万人中认出朋友的脸，但无法解释*如何*做到的。一个熟练的骑车人通过微妙的调整保持平衡，但如果被问到其中涉及的物理原理，他会茫然不知。

波兰尼识别出隐性知识中精确的**从-到结构**（from-to structure）：

- **近端项**（proximal term，辅助意识）：我们依赖但不直接关注的线索、工具或细节。
- **远端项**（distal term，焦点意识）：我们所关注的整体实体或意义。

我们**从**辅助性细节**到**焦点整体进行认知。关键在于，如果我们将注意力转向辅助细节本身，意义就会被破坏——就像打字时关注手指的每个动作，反而打不出字来。

> "隐性知识可以独立存在，但显性知识必须依赖于被隐性地理解和应用。因此，一切知识要么是隐性的，要么根植于隐性知识。完全显性的知识是不可想象的。"

### 对AI的启示

这一思想在2014年被MIT经济学家大卫·奥特（David Autor）正式命名为**波兰尼悖论**（Polanyi's Paradox）：因为我们知道的比能说的多，所以我们无法直接编程让计算机做到我们所能做的一切。几十年来，这个悖论解释了为何需要隐性知识的任务——驾驶、医学诊断、自然对话、抓取物体——比显性的、基于规则的任务抵抗自动化的时间要长得多。

深度学习在这些任务上取得了巨大进展，但方式极具讽刺意味。AI研究者Subbarao Kambhampati在2021年的文章《波兰尼的复仇》中指出，神经网络已经从编码显性知识的旧范式（经典专家系统）转向从数据中学习隐性知识——现在**AI本身也"知道的比它能说出来的多"了**。这些模型发展出它们无法解释的能力，造成了现代**可解释性**、**偏见**和**鲁棒性**的危机。

在机器人领域，挑战更为严峻。人类工匠的双手"知道"塑形黏土时该施加多少力——这是通过多年实践积累的身体化隐性知识。现代机器人通过强化学习和模仿学习来发展类似的感觉运动知识。但由此产生的策略仍然脆弱：它们在训练场景中有效，但在上下文稍有变化时就会失败，表明隐性知识中某些本质性的东西——它的情境性、整合性和灵活性——尚未被捕获。

---

## 2. 个人知识：认知者不可被消除

### 核心思想

在其代表作《个人知识：迈向后批判哲学》（*Personal Knowledge*，1958）中，波兰尼提出**一切知识都是个人知识**。不存在纯粹客观的、超脱的、非个人的认知。每一个认知行为都涉及认知者的热忱参与：

> "在每一个认知行为中，都有认知者对所认知之物的热忱贡献，而这一系数并非缺陷，而是其知识的重要组成部分。"

科学家不是站在宇宙之外，而是在其中参与。发现需要**求知激情**（intellectual passions）——一种引导科学家找到有价值问题的美感、优雅感和重要性直觉。哥白尼得出日心说并非通过机械的方法，而是通过波兰尼所描述的"从太阳而非地球观看天体全景时获得的更大的智识满足感"。

波兰尼称之为**"寓居"**（indwelling）：认知者沉浸于主题之中，从内部理解它，而非仅仅从超脱的视角观察。

### 对AI的启示

现代AI系统对自己的知识没有任何"个人"利害关系。语言模型处理token；视觉模型处理像素。它们没有求知激情，没有引导探索的美感或重要性直觉。这不仅是一个诗意的观察——它有实际后果。

以强化学习中的**主动学习**和**好奇心驱动的探索**为例。研究者们试图赋予智能体探索的内在动机——但这些是工程化的奖励信号，而非嵌入世界中的承诺性认知者所涌现出的真正求知激情。智能体并不*关心*它发现了什么。

波兰尼的"寓居"概念也挑战了机器人学习的主流范式。当前的方法将机器人视为一个外部观察者，构建世界的模型。但波兰尼会论证，真正的理解要求认知者*在*世界中，而不仅仅是建模世界。这与认知科学和机器人学中的**身体化认知**（embodied cognition）运动产生了共鸣——该运动认为智能不仅仅是计算，而是由智能体与环境的身体交互所构成。

受波兰尼深刻影响的哲学家休伯特·德雷福斯（Hubert Dreyfus）正是基于这一洞见，构建了他对AI的里程碑式批判（《计算机不能做什么》，1972）：智能不能被还原为对符号的规则操作；它需要身体、情境和一种抵抗形式化的投入性知行合一。

---

## 3. 信托框架：知识建立在信任之上

### 核心思想

"信托"（fiduciary）源于拉丁语 *fiducia*（信任/信念）。波兰尼的信托框架认为，**一切认知都建立在信念的行为之上**——一种对可能为假的信念的个人承诺。

在任何知识成为可能之前，我们必须信任我们的感官、我们的智识能力、我们继承的框架以及认知者共同体。这不是需要克服的弱点，而是认知的根基：

> "我们相信的比我们能知道的多，我们知道的比我们能说的多。"

当认知者断言某事时，他们做出的是一种**具有普遍意向的个人承诺**——他们相信这对所有人都是真的，而不仅仅对自己。这正是个人知识区别于纯粹主观意见的关键。知识在"传统共同体和师徒学习的沃土"中生长——波兰尼称之为**共在性**（conviviality）。

### 对AI的启示

信托框架出人意料地映射到现代AI的诸多问题上：

**对训练数据的信任。** 每个机器学习系统都做出了一个根本性的信托承诺：它信任训练数据能代表它将遇到的现实。当这种信任被错置——数据存在偏见、被污染或不具代表性——系统就会失败。但与能够反思和质疑自身承诺的人类认知者不同，大多数AI系统没有审视自身知识基础的机制。

**学习中的共同体与传统。** 波兰尼强调知识通过师徒制、模仿和参与实践共同体来传递。这与AI中**从示范中学习**、**人在环中的训练**和**RLHF（基于人类反馈的强化学习）**的最新工作产生了共鸣。这些方法隐含地承认知识无法被完全形式化——它必须通过示例和纠正来传递，就像一位匠人师傅教导学徒一样。

**对齐问题。** 波兰尼坚持认为知识涉及具有普遍意向的承诺，这在AI对齐问题中有所回响。我们希望AI系统做出与人类价值观一致的承诺（决策、推荐）——但如何在一个对真理没有个人利害关系的系统中灌输真正的承诺？

---

## 4. 对科学主义的批判：反对还原论

### 核心思想

波兰尼，正如一位学者所称，是"一位反对科学主义的科学家"。他反对以下主流假设：

- **客观主义**：真正的知识要求完全消除个人因素。
- **实证主义/科学主义**：科学是唯一真正的真理来源，提供了纯粹客观的方法。
- **还原论**：一切现象都可以通过还原为物理学和化学来完全解释。

他在这方面最具原创性的贡献是**双重控制**（dual control）和**边界条件**（boundary conditions）的概念，发表于1968年*Science*期刊上的论文"生命的不可还原结构"：

每台机器（和每个生物体）都受两种控制的支配。低层级服从物理和化学定律。但高层级——设计、目的或组织原则——通过施加物理学留下空白的**边界条件**来驾驭这些定律。你无法从声波的物理学推导出一句话的意义。你无法从材料的化学性质推导出一台机器的功能。现实形成一个层级体系：

> 物理 < 化学 < 生物 < 意识 < 文化

每个层级依赖于其下的原则，但**不可还原**为它们。更高层级的原则行使着真正的"向下因果作用"。

### 对AI的启示

波兰尼的反还原论直接关涉现代AI系统的架构和构建真正理解世界的机器人所面临的挑战：

**符号接地问题。** 经典AI试图从符号和规则构建智能（自上而下）。深度学习试图从原始感官数据构建（自下而上）。波兰尼会论证，两种方法单独都不能成功，因为意义在层级之间的*边界*处涌现——它既不可还原为低层级模式，也不能被高层级规则完全捕获。现代**神经-符号AI**和结合学习表征与结构化推理的**机器人基础模型**，也许在不自觉地走向波兰尼的愿景。

**复杂系统中的涌现。** 当我们训练一个大型语言模型时，规模化后会出现未被显式编程的涌现能力。波兰尼的层级框架——具有不可还原涌现属性的多层结构——为理解这些能力为何出现以及为何抵抗还原论解释提供了哲学视角。模型的"理解"（如果可以这样称呼的话）存在于一个无法通过检查单个权重或神经元来完全解释的层级上。

**机器人操作。** 一个抓取鸡蛋的机器人必须整合物理（力、摩擦）、感知（形状、纹理）和目的（不要打碎；轻轻放下）。这些运作在波兰尼层级体系的不同层面，成功的操作需要高层级对低层级施加边界条件。当前的端到端学习方法试图将这个层级体系压缩为单一的函数近似器——这或许解释了它们为何在狭窄任务中成功，却难以泛化。

---

## 结语：波兰尼对AI未来的启示

迈克尔·波兰尼于1976年辞世，远在深度学习革命之前。然而他的思想仍然惊人地切中当下：

| 波兰尼的洞见 | 现代AI挑战 |
|---|---|
| 隐性知识无法完全表述 | 波兰尼悖论；可解释性危机 |
| 一切知识都是个人的、承诺性的 | 对齐问题；缺乏真正的理解 |
| 知识建立在信任与共同体之上 | 数据质量；从人类反馈中学习 |
| 现实是层级化的且不可还原 | 符号接地；涌现能力；泛化 |

波兰尼给我们最深刻的教训也许是一种**认识论上的谦逊**。完全显性、完全形式化、完全客观的知识之梦——无论在科学还是AI中——不仅难以实现，而且在原则上就是不可实现的。一切知识都根植于隐性认知，由个人承诺所维系，并嵌入信任的共同体之中。

这并不意味着我们应该停止构建AI系统。它意味着我们应该怀着对其*不能*成为什么的认知来构建它们——并将它们设计为与人类认知者*协作*而非取代他们。当今AI中最有前景的方向——人在环中的学习、身体化机器人、神经-符号推理、可解释AI——都在隐含地承认波兰尼的洞见，即使它们并未引用他的名字。

正如波兰尼可能会说的：机器能学到的比它能告诉我们的多。问题是，我们能否学会信任它所知道的——以及它能否学会知道我们所信任的。

---

## 延伸阅读

- Polanyi, M. (1958). *Personal Knowledge: Towards a Post-Critical Philosophy*. University of Chicago Press.
- Polanyi, M. (1966). *The Tacit Dimension*. Doubleday.
- Polanyi, M. (1968). Life's Irreducible Structure. *Science*, 160(3834), 1308--1312.
- Autor, D. (2014). Polanyi's Paradox and the Shape of Employment Growth. *NBER Working Paper 20485*.
- Kambhampati, S. (2021). Polanyi's Revenge. *Communications of the ACM*.
- Dreyfus, H. (1972). *What Computers Can't Do: The Limits of Artificial Intelligence*. MIT Press.

</div>
