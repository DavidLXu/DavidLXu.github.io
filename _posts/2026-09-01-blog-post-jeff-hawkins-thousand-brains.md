---
title: "Jeff Hawkins: A Thousand Brains and Intelligence as Many Models in Motion"
date: 2026-09-01
permalink: /posts/2026/09/jeff-hawkins-thousand-brains/
excerpt: "A Thousand Brains reframes intelligence as sensorimotor world-modeling carried out by many cortical modules, with consequences for neuroscience, robotics, AI, and the risks created by human belief."
tags:
  - Book Notes
  - Neuroscience
  - Cognitive Science
  - AI
  - Robotics
  - Philosophy
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## Introduction: What If There Is No Single Model at the Center of Intelligence?

When we recognize a coffee cup, it feels as though the brain consults one stable representation: this shape, this handle, this familiar use. Jeff Hawkins's *A Thousand Brains: A New Theory of Intelligence* proposes a stranger architecture. Vision, touch, and other sensory streams each engage many small regions of the neocortex. These regions learn partially independent models through movement, then communicate until their interpretations agree. What enters consciousness as one object may be the settlement reached by many models.

The title is therefore an architectural claim, not a count of minds or personalities. Hawkins argues that the neocortex resembles a large community of model-building units. Each learns features at locations inside a **reference frame**; each can make predictions; and long-range connections let many units vote on what is present. Intelligence arises from the coordination of this distributed knowledge.

Published by Basic Books in 2021, the book moves through three scales. The first part presents a theory of the neocortex. The second asks what that theory would imply for machine intelligence and consciousness. The third turns toward false belief, existential risk, and the long-term survival of knowledge. The transitions are ambitious: a proposed neural mechanism becomes a design program for AI and then a philosophy of humanity's future. Reading the book well requires keeping those levels connected without treating them as equally established.

This post reconstructs that argument and then asks what it offers to robotics and AI today.

---

## 1. Old Brain, New Brain: Goals and Models

Hawkins begins with an evolutionary division between older brain structures and the mammalian neocortex. The older systems regulate survival, movement, emotion, appetite, reproduction, and other action-driving functions. The neocortex learns a rich model of the world and uses that model to predict what will happen. In his account, our intelligent behavior results from a continual negotiation: older systems supply goals and values, while the neocortex supplies knowledge about how the world is structured and how a goal might be reached.

This distinction matters because intelligence does not automatically provide motivation. A world model can represent a forest fire, a scientific theory, or another person's plan; none of those representations alone says what the organism should want. Goals enter through a larger embodied system shaped by evolution, development, culture, and present physiological needs.

The separation also explains a familiar human conflict. A person can understand that an action is harmful and still desire it. Knowledge in the neocortex does not simply overwrite older drives. Conversely, a drive cannot execute a complex plan without recruiting learned models of causes, objects, institutions, and other people.

The phrase “old brain” should be read as Hawkins's functional simplification, not as a clean anatomical border or a claim that evolution replaced one complete brain with another. Real neural systems are deeply interconnected. The useful conceptual point is narrower: **the machinery that learns a model need not be the machinery that chooses the ends for which the model is used.** That point later becomes central to his discussion of AI safety.

---

## 2. Mountcastle's Proposal: A Common Cortical Operation

The scientific starting point is a proposal associated with neuroscientist Vernon Mountcastle. Across the neocortex, different regions share a broadly similar layered anatomy. A visual region and a language-related region perform very different tasks, yet their local circuits have striking structural similarities. Mountcastle suggested that the neocortex might be built from repeated units performing a common operation, with functional differences arising largely from what each region is connected to.

Hawkins calls a small patch spanning the cortical layers a **cortical column**. In his usage, the column is a convenient functional unit; it need not be a sharply bounded cylinder visible in tissue. The hard question is what common operation could be general enough to support seeing, touching, planning, mathematics, and language.

The conventional hierarchical picture offers one answer for perception. Early stages detect simple features; later stages combine them into increasingly complex representations; an object appears only near the top. Hawkins retains cortical hierarchy but argues that hierarchy alone misses too much. It does not explain why the neocortex devotes so much circuitry to movement-related signals, how touch recognizes an object through a sequence of contacts, or why long-range connections link many regions laterally as well as vertically.

His alternative begins with a different unit of knowledge: **a feature at a location**. A patch of cortex does more than report what its associated sensor currently detects. It also represents where that sensation lies relative to the thing being sensed. Once feature and location are joined, the patch can learn the structure of a complete object over time.

---

## 3. Reference Frames: The Coordinate System Inside Knowledge

A location has meaning only inside a reference frame. “Five centimeters to the left” is incomplete until we know: left of the observer, the cup, the table, or the room? Hawkins argues that the brain organizes knowledge through many such frames. Some describe where the body is in an environment. Others describe where a finger is on a cup, where the eye is directed within a scene, or where one component sits inside a larger object.

The inspiration comes from place cells and grid cells in the hippocampal--entorhinal system. These cells participate in representations of an animal's location and movement through an environment. Hawkins and his collaborators propose that grid-cell-like mechanisms also operate throughout the neocortex. There, they would encode sensor location relative to objects rather than body location relative to a room.

Consider touching a mug with one finger while your eyes are closed. A smooth patch alone could belong to thousands of objects. As the finger moves, the sequence might include a curved wall, an edge, empty space, and a handle. Each sensation becomes informative because it is registered at a location, and movement updates the expected location before the next input arrives. Recognition is therefore an active process:

```text
current feature + object-relative location
                    ↓
             update the object model
                    ↓
movement command → predicted new location → predicted feature
```

The claim is more powerful than saying that spatial information helps perception. Hawkins proposes that reference frames are a general format for knowledge. An object can be located in a room; a handle can be located on a cup; a joint can be located in a robot; a word can occupy a role in a sentence; an idea can be situated within a conceptual structure. Composition becomes possible because one reference frame can be placed inside another.

This generalization is also one of the theory's largest empirical bets. Grid cells in the entorhinal system are well established. Grid-cell-like mechanisms in every cortical region and column, performing the proposed object-centered function, remain a hypothesis.

---

## 4. Movement Is Part of Perception

In this framework, sensing is inseparable from movement. The eyes saccade, the fingers explore, the head turns, and the body changes viewpoint. Even when an external object is still, our sensors move across it. The brain uses a copy of the movement command to update where it expects the sensor to be relative to the object.

This makes prediction local and concrete. If a finger moves from the rim toward the side of a familiar mug, the active model predicts both a new location and the tactile feature likely to occur there. A match strengthens the model. A mismatch creates evidence that the object, action, or current interpretation is wrong.

Hawkins's earlier work emphasized prediction over time. *A Thousand Brains* adds the coordinate system that makes prediction structured. The brain is not merely guessing the next input in a sequence; it is predicting what should be sensed **here, after this movement, within this model**.

Three consequences follow:

1. **Learning is active.** An intelligent system can choose movements that resolve uncertainty instead of waiting for a complete observation.
2. **Knowledge is action-ready.** A model contains relations among possible sensations and possible movements, so perception and behavior share a representation.
3. **Surprise is spatially diagnostic.** An error can reveal that the feature is wrong, the estimated location is wrong, or the reference frame itself is wrong.

For robotics, this is an immediate challenge to pipelines that treat perception as a static image-classification stage followed by a separate controller. A robot learns the meaning of “graspable” through viewpoint change, contact, force, slip, deformation, and recovery. Its useful model belongs to the sensor--body--world loop.

---

## 5. Why a Thousand Brains? Complete Models and Voting

If each cortical column only contributed one feature to a single representation elsewhere, the brain would need a central place where the pieces finally become an object. Hawkins proposes a more distributed arrangement: many columns can each learn a complete model of the same object from the inputs available to them.

A fingertip's column learns a mug through touch across successive movements. Visual columns learn it through patches sampled by changing gaze. Different columns begin with ambiguous evidence, but long-range connections allow them to share candidate interpretations. Their activity converges through a process Hawkins describes as **voting**.

Imagine several fingers touching a cup at once. One detects a smooth curved surface, another an edge, and another the handle. No local observation is decisive. Yet the interpretations compatible with all three observations reinforce one another, while incompatible candidates lose support. Consensus can emerge quickly because many models operate in parallel.

| Single-model intuition | Thousand-brains proposal |
|---|---|
| Features are assembled into one object representation | Many local modules learn object models |
| Recognition culminates at a privileged high level | Recognition can emerge through agreement across levels and regions |
| Ambiguity is resolved mainly by further feedforward processing | Ambiguity is reduced by movement and lateral voting |
| Damage threatens a central representation | Distributed models offer redundancy and graceful degradation |
| A sensor reports a feature | A sensor-associated module represents a feature at an object-relative location |

The proposal does not remove hierarchy. Objects contain parts, scenes contain objects, and concepts contain other concepts. Hierarchy organizes these nested relations. Voting adds a **heterarchical** dimension: peer modules at different locations and modalities can constrain one another without sending every decision to a single apex.

The unified percept is thus less like a picture stored in one place and more like a stable agreement maintained by a network.

---

## 6. Concepts, Language, and the Expansion Beyond Physical Space

The theory begins with physical objects, where movement and location are easiest to visualize. Human intelligence, however, also handles democracy, evolution, legal systems, melodies, software, and mathematics. Hawkins argues that the neocortex reuses the same machinery for these abstract structures.

An abstract reference frame need not correspond to literal three-dimensional space. It can organize positions within a sequence, roles within a system, or relations within a conceptual domain. We mentally move through a family tree, a proof, a program, or an argument. Each step changes which features and relations should come next.

Language illustrates the compositional advantage. A word does not carry one fixed meaning independent of its surroundings. Its role depends on where it appears in a sentence, which larger construction contains it, and which conceptual model the listener currently activates. Nested reference frames could provide a common format for relating phonemes to words, words to clauses, clauses to narratives, and narratives to knowledge about the world.

This is an explanatory sketch rather than a worked-out theory of language. The book does not derive grammar, semantics, or reasoning from identified circuits. Its contribution is a proposed representational primitive: location within a structured model. The same primitive could support physical recognition, composition, analogy, and mental traversal if the relevant neural mechanisms exist.

The philosophical result is significant. Intelligence becomes less a collection of specialized tricks and more a general capacity to build models whose parts have stable relations, to move through those relations, and to combine many partial models into a coherent judgment.

---

## 7. Machine Intelligence: World Models Without Human Drives

Hawkins treats neuroscience as an engineering resource. If the neocortex implements a general learning algorithm, then artificial systems could reproduce its principles without reproducing every biological detail. The resulting machines would learn continuously through sensorimotor interaction, represent knowledge in reference frames, use sparse distributed activity, and combine the judgments of many parallel modules.

This differs from much of the deep-learning paradigm described in the book. A conventional model is often trained on a large, fixed dataset and then deployed with mostly fixed parameters. A brain-inspired agent would acquire models incrementally while acting, use movement to gather informative data, and update knowledge without a clean separation between training and operation.

Hawkins also separates intelligence from agency. The neocortex supplies models; older systems supply survival-related drives. An artificial world-modeling system therefore need not inherit hunger, reproductive competition, dominance, or fear of death. It can be highly intelligent without spontaneously developing human-like goals.

That distinction weakens one route to machine risk, but it does not settle AI safety. Goals can be designed, learned, delegated, or created by institutions surrounding a system. A machine without biological drives can still pursue a harmful objective with great competence. Hawkins's argument is best read as an architectural correction: **capability, consciousness, agency, and motivation are separate design questions.** Treating them as one quantity obscures where risk enters.

His view of machine consciousness follows the same functional logic. If consciousness depends on the brain's model of its own attention and state, a machine with comparable models might report subjective-like awareness. The book regards this as scientifically approachable, yet it does not resolve the philosophical problem of why any information processing should be accompanied by felt experience.

---

## 8. False Beliefs and the More Immediate Existential Risk

The third part of the book shifts from machine intelligence to the dangers created by human intelligence. A model-building brain does not guarantee a true model. People can hold beliefs that are internally coherent, socially reinforced, and resistant to contradictory evidence. The same capacities that enable science also enable ideology, conspiracy, and elaborate rationalization.

Hawkins distinguishes knowledge stored in brains and culture from goals shaped by older evolutionary systems. Knowledge can accumulate rapidly across generations; genetic change is slow. Human beings therefore command technologies of planetary scale while retaining drives formed under conditions of small-group competition, short horizons, and local scarcity.

This mismatch reframes existential risk. Nuclear weapons, ecological disruption, engineered pathogens, and destructive institutions do not require a malicious superintelligence. They require powerful knowledge coupled to badly coordinated goals or false beliefs. Intelligence expands the space of possible action faster than wisdom automatically expands the space of restraint.

The book's response is an “estate plan” for humanity: protect and extend knowledge beyond the lifespan of individuals, institutions, and perhaps Earth itself. Hawkins imagines durable records and settlements beyond one planet as ways to reduce the chance that a single catastrophe erases what humanity has learned.

The proposal is intentionally long-term, but its near-term lesson is institutional. Reliable knowledge depends on systems that can detect error: open criticism, reproducibility, distributed archives, education, and the ability to revise public models. A society needs its own version of multiple-model voting, with a crucial addition—the votes must remain answerable to evidence rather than mere repetition.

---

## 9. A Contemporary Interpretation for Robotics and AI

Hawkins makes direct claims about future machine intelligence, but the following applications extend the book into today's research landscape. They are interpretations, not results established by the book itself.

### Embodied Robotics: Learn by Moving to Know

Many robotics failures arise because a visual label is mistaken for an actionable model. A robot may recognize “mug” while failing to anticipate how its viewpoint will change, where contact will occur, or how the object will move under force. Reference-frame learning suggests that perception should encode features together with their positions relative to objects, bodies, and tasks.

Active perception then becomes part of policy. The robot can move a camera, reposition a hand, or probe an uncertain surface to distinguish competing models. An action serves two purposes at once: changing the world and discovering which world the robot is in.

### Modular Intelligence: Many Learners, Negotiated Belief

The cortical-column metaphor suggests systems composed of repeated learning modules with a shared communication protocol. Modules may specialize through their inputs while retaining a common ability to learn structured models. Their outputs become hypotheses that can be combined, challenged, and updated.

This architecture offers potential benefits—parallelism, local learning, multimodal integration, and robustness—but also creates a coordination problem. Voting is not magic. A practical system must specify what a hypothesis contains, how confidence is calibrated, how contradictory frames are aligned, and how a minority module with decisive evidence can overturn a confident majority.

### Continual Learning: Training and Deployment as One Life

A sensorimotor agent encounters new objects, changing tools, and unfamiliar environments after deployment. The thousand-brains perspective treats this as the normal condition of intelligence. Learning should be rapid and associative, protect useful prior models, and let new modules or frames absorb novelty without globally retraining the system.

Recent Thousand Brains Project work turns these principles into an open research program built around modular sensorimotor learning, reference frames, and communication among learning modules. This is valuable evidence that the book's ideas can generate implementable hypotheses. It is not yet evidence that the resulting systems reproduce general neocortical intelligence.

### Foundation Models: Complement Rather Than Simple Replacement

Large pretrained models learn broad statistical structure and can support planning, language, and multimodal inference. Hawkins's framework highlights what pretraining alone leaves unresolved: grounded reference frames, learning through self-directed movement, stable continual adaptation, and models tied to physical consequences.

A productive synthesis may use foundation models for prior knowledge and communication while sensorimotor modules maintain local, revisable models of bodies, objects, and tasks. The important comparison is empirical: which architecture learns faster, transfers better, recovers from surprise, and remains corrigible in an open world?

---

## 10. What the Theory Does Not Yet Establish

The book is strongest when it gives many observations a common direction. Its elegance can also tempt readers to treat a research program as a completed explanation.

First, the status of the cortical column is contested. Neuroscientists use “column” for several anatomical and functional patterns, and no universally accepted canonical unit has been shown to perform one operation everywhere in the neocortex. Hawkins explicitly uses the term as a functional convenience, but the theory still depends on some repeatable local organization doing the proposed work.

Second, evidence for grid cells in the entorhinal cortex does not by itself demonstrate grid-cell-like location codes throughout the neocortex. The broader claim produces testable predictions; it remains a hypothesis whose scope, cell types, and circuit mechanisms need direct evidence.

Third, moving from objects to abstract thought requires more than metaphor. Reference frames provide an attractive language for composition and mental movement, yet a full account must explain how particular neural populations encode relations, variables, logical operations, and linguistic structure.

Fourth, consensus does not guarantee truth. Many models can share the same bias or be driven by correlated evidence. Both brains and multi-agent machines need mechanisms for uncertainty, anomaly detection, exploration, and correction—not only agreement.

Finally, a theory of neocortical intelligence is not automatically a theory of the whole mind. Emotion, memory systems, development, social cognition, bodily regulation, and consciousness involve circuits beyond the simplified old-brain/new-brain division. The thousand-brains theory may explain an important organizing principle without being the only principle that matters.

These limits do not make the framework unproductive. They tell us what kind of framework it is: a compact generator of experiments and architectures, valuable in proportion to the precise predictions it exposes to failure.

---

## Conclusion: Intelligence as Coordinated Model-Building

*A Thousand Brains* changes the unit from which we imagine intelligence. The basic picture is no longer a passive sensor feeding a central classifier. It is an embodied learner that moves through the world, locates features inside reference frames, builds multiple models, predicts the consequences of movement, and reaches a working consensus without a single model owning the whole truth.

| Hawkins's idea | Design question it creates |
|---|---|
| Feature at a location | Does the representation preserve structure relative to objects and bodies? |
| Sensorimotor learning | Can action reduce uncertainty as well as achieve a goal? |
| Many complete models | Can knowledge remain distributed without becoming incoherent? |
| Voting across modules | How are confidence, conflict, and decisive minority evidence handled? |
| Nested reference frames | Can the same machinery compose parts, objects, scenes, and abstractions? |
| Intelligence separated from drives | Where do goals enter, and who can revise them? |
| Knowledge vulnerable to false belief | Which institutions keep collective models corrigible? |

For neuroscience, the theory asks whether a common location-based computation can truly span the neocortex. For AI, it asks whether intelligence should be built as a population of continually learning world models. For robotics, it makes movement part of knowing rather than a command issued after perception is complete.

The generative question is not whether the brain literally contains a thousand little minds. It is: **What becomes possible when no single learner has to model the whole world, yet many learners can move, compare, and correct one another?**

---

## Further Reading

- Hawkins, J. (2021). *A Thousand Brains: A New Theory of Intelligence*. New York: Basic Books.
- [Hachette / Basic Books: *A Thousand Brains*](https://www.hachettebookgroup.com/titles/jeff-hawkins/a-thousand-brains/9781541675803/)
- Hawkins, J., Lewis, M., Klukas, M., Purdy, S., & Ahmad, S. (2019). [A Framework for Intelligence and Cortical Function Based on Grid Cells in the Neocortex](https://doi.org/10.3389/fncir.2018.00121). *Frontiers in Neural Circuits*, 12, 121.
- [Numenta: The Thousand Brains Theory of Intelligence](https://www.numenta.com/blog/2019/01/16/the-thousand-brains-theory-of-intelligence/)
- Clay, V., Leadholm, N., Hawkins, J., et al. (2024). [The Thousand Brains Project: A New Paradigm for Sensorimotor Intelligence](https://arxiv.org/abs/2412.18354).
- Horton, J. C., & Adams, D. L. (2005). [The Cortical Column: A Structure Without a Function](https://pmc.ncbi.nlm.nih.gov/articles/PMC1569491/). *Philosophical Transactions of the Royal Society B*, 360, 837--862.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 引言：如果智能的中心并不存在唯一模型，会怎样？

当我们认出一只咖啡杯时，主观体验仿佛来自大脑中的某个稳定表征：这个形状、这个杯柄、这种熟悉的用途。杰夫·霍金斯在《千脑智能》（*A Thousand Brains: A New Theory of Intelligence*）中提出了更奇特的架构。视觉、触觉和其他感觉流分别驱动新皮层中的许多小区域；这些区域通过运动学习相对独立的模型，再彼此通信，直至各自的解释趋于一致。意识中那个统一的物体，可能是众多模型共同达成的结论。

因此，书名表达的是一种架构主张，不是说头脑中存在一千个人格。霍金斯把新皮层描绘成一个由大量建模单元组成的共同体。每个单元都在某个**参考系（reference frame）**中学习“特征位于何处”，能够做出预测；单元之间的长程连接让许多模型对当前所见进行投票。智能来自这些分布式知识的协调。

本书于2021年由Basic Books出版，论述跨越三个尺度。第一部分提出新皮层理论；第二部分讨论这一理论对机器智能和意识可能意味着什么；第三部分转向错误信念、生存风险与知识的长期延续。从神经机制假说到AI设计路线，再到人类未来哲学，这些跨越极具野心。严谨的阅读需要保持三个层次之间的联系，同时承认它们的证据强度并不相同。

下文将重建这条论证脉络，并讨论它对今天的机器人学与AI研究有何启发。

---

## 1. 旧脑与新脑：目标和模型

霍金斯首先在较古老的脑结构与哺乳动物的新皮层之间作出一项演化层面的区分。较古老的系统负责生存、运动、情绪、食欲、繁殖以及其他驱动行动的功能；新皮层学习丰富的世界模型，并借助模型预测将要发生的事情。在他的叙述中，智能行为源于两者持续协商：旧系统提供目标与价值，新皮层提供关于世界结构以及如何实现目标的知识。

这一区分的重要之处在于，智能本身并不自动产生动机。世界模型能够表征森林火灾、科学理论或他人的计划，但这些表征本身并不告诉生命体“应该想要什么”。目标来自更大的具身系统，它同时受演化、发育、文化与当下生理需求塑造。

这也解释了一种常见的人类冲突：人可以清楚知道某种行为有害，依然渴望去做。新皮层中的知识不会直接覆盖旧有驱力；反过来，驱力若不调用关于因果、物体、制度与他人的习得模型，也无法完成复杂计划。

这里的“旧脑”应视为霍金斯对功能关系的简化，不能理解为清晰的解剖边界，更不意味着演化用一颗完整的新脑替换了旧脑。真实神经系统高度互联。这个概念真正有用的部分更窄：**学习世界模型的机制，不必等同于决定模型服务于何种目的的机制。**这一点后来成为他讨论AI安全的核心。

---

## 2. 蒙卡斯尔的设想：共同的皮层操作

本书的科学起点来自神经科学家弗农·蒙卡斯尔（Vernon Mountcastle）的一项设想。新皮层不同区域具有大体相似的分层结构。视觉区与语言相关区域执行的任务非常不同，但它们的局部回路却呈现显著的结构相似性。蒙卡斯尔据此提出，新皮层或许由反复复制的单元构成，这些单元执行一种共同操作；区域之间的功能差异，很大程度上来自它们连接的输入和输出不同。

霍金斯把一个贯穿皮层各层的小块称为**皮层柱（cortical column）**。在他的用法中，皮层柱是一种方便讨论的功能单元，并不要求它是组织中边界清晰、肉眼可辨的圆柱体。真正困难的问题是：什么样的共同操作，能够同时支撑视觉、触觉、规划、数学与语言？

传统的层级图景为知觉提供了一个答案：早期阶段检测简单特征，后续阶段把它们组合成越来越复杂的表征，物体最终出现在层级顶部。霍金斯没有否认皮层层级，却认为仅靠层级仍遗漏了许多现象。它难以说明为什么新皮层投入大量回路处理运动相关信号，触觉为何能通过连续接触识别物体，以及为什么长程连接不仅纵向跨层，还横向连接众多区域。

他的替代方案从另一种知识单元开始：**位于某处的特征**。一小块皮层不只报告对应传感器眼下检测到什么，也表征该感觉相对于被感知物体处于何处。特征与位置一旦结合，这个局部单元就能随时间学习完整物体的结构。

---

## 3. 参考系：知识内部的坐标系统

位置只有在参考系中才有意义。“向左五厘米”并不完整，除非我们知道它是观察者的左边、杯子的左边、桌子的左边，还是房间的左边。霍金斯认为，大脑通过许多这样的参考系组织知识。有些参考系描述身体在环境中的位置；另一些描述手指在杯子上的位置、眼睛在场景中的注视位置，或某个部件在更大物体中的位置。

这项灵感来自海马—内嗅系统中的位置细胞和网格细胞。它们参与表征动物在环境中的位置与运动。霍金斯及其合作者进一步提出，类似网格细胞的机制也遍布新皮层；在那里，它们编码的是传感器相对物体的位置，而不是身体相对房间的位置。

想象闭着眼睛用一根手指触摸马克杯。单独的一小块光滑表面可能属于成千上万种物体。手指继续移动，感觉序列也许依次出现弧形杯壁、边缘、空缺与杯柄。每种感觉之所以逐渐有信息量，是因为它被登记在某个位置上；运动发生后，大脑会先更新预期位置，再接收下一个输入。识别因而是一种主动过程：

```text
当前特征 + 物体相对位置
              ↓
          更新物体模型
              ↓
运动指令 → 预测新位置 → 预测新特征
```

这一主张远比“空间信息有助于知觉”更强。霍金斯提出，参考系是知识的一种通用格式：物体位于房间中，杯柄位于杯子上，关节位于机器人中，词语位于句法结构中，观念也位于概念结构中。当一个参考系能够嵌套进另一个参考系，组合结构便成为可能。

这项推广也是理论最大胆的经验赌注之一。内嗅系统中的网格细胞已有充分证据；但类似机制是否存在于新皮层每个区域和皮层柱，并承担作者所说的物体中心功能，仍是一项有待检验的假说。

---

## 4. 运动是知觉的一部分

在这套框架中，感觉与运动不可分离。眼球扫视、手指探索、头部转动，身体不断改变观察点。即使外部物体静止不动，我们的传感器仍会在它的表面移动。大脑利用运动指令的副本，更新传感器相对于物体的预期位置。

预测因而变得局部而具体。如果手指从熟悉杯子的杯沿向侧壁移动，当前模型会同时预测一个新位置，以及该位置可能出现的触觉特征。匹配会增强模型；不匹配则说明物体、动作或当前解释可能有误。

霍金斯早期的研究强调时间中的预测。《千脑智能》进一步加入了让预测获得结构的坐标系统。大脑并非只是在序列中猜测下一个输入，而是在预测：**在这个模型中，执行这次运动之后，这里应该感受到什么。**

由此产生三个后果：

1. **学习是主动的。**智能系统可以选择能够消除不确定性的运动，而不必等待完整观察自行出现。
2. **知识天然面向行动。**模型包含可能感觉与可能运动之间的关系，因此知觉与行为共享同一种表征。
3. **意外具有空间诊断价值。**误差可能意味着特征错了、估计位置错了，或整个参考系选错了。

对机器人学而言，这直接挑战了“静态图像分类之后再接独立控制器”的流水线。机器人要理解“可抓取”，必须经历视角变化、接触、力、滑动、形变与恢复。真正有用的模型属于传感器—身体—世界的闭环。

---

## 5. 为什么是“一千颗大脑”？完整模型与投票

如果每个皮层柱只为别处的单一表征贡献一个特征，大脑就需要某个中心位置，把所有碎片最终组合成物体。霍金斯提出了更分布式的安排：许多皮层柱都能依据各自可获得的输入，学习同一物体的完整模型。

与指尖相连的皮层柱通过连续触摸学习杯子；视觉皮层柱通过视线移动采样到的图像块学习它。不同皮层柱最初得到的证据都带有歧义，但长程连接允许它们共享候选解释。神经活动通过霍金斯所谓的**投票（voting）**逐渐收敛。

想象几根手指同时接触杯子：一根感到光滑的曲面，一根摸到边缘，另一根碰到杯柄。任何局部观察都不足以定论，但能够同时解释三种感觉的候选模型会互相增强，不兼容的候选则失去支持。许多模型并行运行，使共识可以迅速形成。

| 单一模型直觉 | 千脑理论主张 |
|---|---|
| 各种特征最终组装成一个物体表征 | 许多局部模块各自学习物体模型 |
| 识别在一个特权高层完成 | 识别可由不同层级和区域之间的共识产生 |
| 歧义主要由更深的前馈处理消除 | 歧义通过运动和横向投票减少 |
| 局部损伤可能威胁中心表征 | 分布式模型带来冗余与渐进退化 |
| 传感器只报告特征 | 传感器对应模块表征物体相对位置上的特征 |

这一方案并未取消层级。物体包含部件，场景包含物体，概念也包含其他概念；层级负责组织这些嵌套关系。投票则增加了**异层级（heterarchical）**维度：不同位置、不同模态的同级模块可以彼此约束，无须把每项决定都送往唯一顶点。

统一知觉由此更像整个网络维持的稳定协议，而不是存放在某处的一幅完整图像。

---

## 6. 概念、语言与对物理空间的超越

理论从物理物体开始，因为在那里，运动与位置最容易直观理解。然而，人类智能还能够处理民主、演化、法律制度、旋律、软件与数学。霍金斯认为，新皮层会把同一套机制复用于这些抽象结构。

抽象参考系不必对应字面上的三维空间。它可以组织序列中的位置、系统中的角色，或概念领域中的关系。我们会在族谱、证明、程序和论证中进行“心智移动”，每一步都会改变接下来应该出现的特征与关系。

语言展示了组合性的优势。词语的意义并非脱离上下文后依然固定；它取决于在句子中的位置、所在的更大结构，以及听者当前激活的概念模型。嵌套参考系或许能够用统一格式关联音素与词、词与从句、从句与叙事，再把叙事连接到世界知识。

这仍是一幅解释草图，而非完整的语言理论。本书没有从已识别的神经回路中推导出语法、语义或推理。它提供的核心贡献是一种候选表征原语：结构化模型中的位置。如果相应神经机制确实存在，同一原语可能支撑物体识别、组合、类比与心智遍历。

由此得到的哲学结果很重要：智能不再像一套专用技巧的合集，更像一种通用能力——建立内部部件关系稳定的模型，在这些关系中移动，再把众多局部模型组合成连贯判断。

---

## 7. 机器智能：拥有人类世界模型，不等于拥有人类驱力

霍金斯把神经科学视为工程资源。如果新皮层实现了通用学习算法，人工系统就可能复现其原则，而无须逐一复制所有生物细节。这样的机器会通过感觉运动交互持续学习，以参考系组织知识，使用稀疏分布式活动，并整合许多并行模块的判断。

这与书中描述的主流深度学习范式有明显差别。传统模型往往在大规模固定数据集上训练，再以大体固定的参数部署。受大脑启发的智能体则在行动中增量建立模型，利用运动主动获取有信息量的数据，并持续更新知识，不再把“训练”和“运行”截然分开。

霍金斯还把智能与能动性分离。新皮层提供模型，旧系统提供与生存有关的驱力。因此，人工世界建模系统不必继承饥饿、繁殖竞争、支配欲或死亡恐惧；它可以非常聪明，却不会自发产生人类式目标。

这一区分削弱了一条机器风险路径，却没有解决AI安全。目标可以由设计者写入、由学习形成、由人类委托，也可能来自包围系统的制度。没有生物驱力的机器仍然可能极其有效地追求有害目标。霍金斯的论证更适合作为一种架构校正：**能力、意识、能动性与动机是彼此分离的设计问题。**把它们压缩成一个量，会掩盖风险究竟从哪里进入系统。

他对机器意识的看法沿用同样的功能主义逻辑：如果意识依赖大脑对自身注意和状态建立模型，那么具备类似模型的机器或许也会报告近似主观体验的状态。本书认为这个问题能够被科学研究，但并未解决更深的哲学难题——为什么信息处理会伴随任何“感受”。

---

## 8. 错误信念与更迫近的生存风险

本书第三部分从机器智能转向人类智能自身制造的风险。能够建立模型的大脑并不保证模型为真。人的信念可能在内部高度自洽，受到群体反复强化，同时对反证具有抵抗力。使科学成为可能的认知能力，也能服务于意识形态、阴谋论与复杂的自我合理化。

霍金斯进一步区分储存在大脑和文化中的知识，以及受古老演化系统塑造的目标。知识可以跨世代迅速累积，基因改变则极其缓慢。人类因此掌握了行星尺度的技术，却仍携带着在小群体竞争、短期视野和局部稀缺条件下形成的驱力。

这一错位重新定义了生存风险。核武器、生态破坏、人造病原体和破坏性制度都不需要恶意超级智能；强大知识一旦与协调失败的目标或错误信念结合，就足以产生灾难。智能扩展可行动空间的速度，远快于智慧自动扩展自我约束空间的速度。

本书给出的回应是为人类制定“遗产规划”：让知识能够超越个人、制度，甚至地球本身的寿命而保存和扩展。霍金斯设想耐久档案以及地外定居点，以降低单次灾难抹去人类全部知识的概率。

这是一项刻意拉长时间尺度的提议，但它也有近在眼前的制度含义。可靠知识依赖能够发现错误的系统：开放批评、可复现性、分布式档案、教育，以及修正公共模型的能力。社会也需要自己的多模型投票机制，同时必须增加一项约束——投票应对证据负责，不能只计算重复次数。

---

## 9. 对机器人学与AI的当代延伸

霍金斯本人直接讨论了未来机器智能，但以下内容把本书进一步延伸到今天的研究语境。这些是当代解释，并非本书已经证明的结果。

### 具身机器人：通过运动学习如何认识

许多机器人失败，源于把视觉标签误当成可行动模型。机器人可能识别出“杯子”，却无法预料视角如何变化、接触将在哪里发生，或物体受力后怎样运动。参考系学习提示我们：知觉表征应把特征与其相对物体、身体和任务的位置共同编码。

主动知觉随后成为策略的一部分。机器人可以移动相机、调整手的位置，或探测不确定表面，从而区分竞争模型。一次动作同时服务于两个目的：改变世界，并发现自己究竟处于怎样的世界。

### 模块化智能：许多学习者，协商出的信念

皮层柱隐喻提示我们构建由重复学习模块组成的系统，并为它们制定共享通信协议。模块可以因输入不同而逐渐专门化，同时保留学习结构化模型的共同能力。它们输出的不是最终事实，而是可以组合、质疑和更新的假说。

这种架构可能带来并行性、局部学习、多模态整合与鲁棒性，也会制造新的协调难题。投票并不是魔法。真正的系统必须规定假说包含什么、置信度如何校准、冲突参考系怎样对齐，以及掌握关键证据的少数模块如何推翻自信的多数。

### 持续学习：训练与部署属于同一段生命

感觉运动智能体在部署后仍会遇到新物体、变化的工具与陌生环境。千脑视角把这视为智能的正常条件。学习应当快速而具有联想性，保护已有的有用模型，并让新模块或新参考系吸收新奇性，而不必每次全局重训。

近年的Thousand Brains Project把这些原则变成了一项开放研究计划，围绕模块化感觉运动学习、参考系以及学习模块之间的通信展开。这说明书中的概念能够生成可实现的假说；它尚不能证明这些系统已经复现了新皮层的一般智能。

### 基础模型：互补比简单取代更有意义

大型预训练模型可以学习广泛的统计结构，支持规划、语言与多模态推理。霍金斯的框架让我们看到，仅靠预训练仍未解决的部分：扎根现实的参考系、通过自主运动学习、稳定的持续适应，以及与物理后果相连的模型。

一种有希望的综合方式，是让基础模型提供先验知识与交流能力，同时由感觉运动模块维护有关身体、物体和任务的局部可修正模型。真正重要的比较需要由实验完成：哪种架构学得更快、迁移更好、更能从意外中恢复，并在开放世界中保持可纠正性？

---

## 10. 这套理论尚未证明什么

这本书最强的地方，在于它为许多观察提供了共同方向。它的优雅也容易诱使读者把研究计划误当成已经完成的解释。

首先，皮层柱的地位仍有争议。神经科学家用“柱”指称多种解剖和功能模式，目前没有一个获得普遍认可的标准单元，被证明在新皮层各处都执行同一种操作。霍金斯明确把这个词作为功能上的便利用语，但他的理论仍依赖某种可重复的局部组织去完成所提出的工作。

第二，内嗅皮层中网格细胞的证据，不能直接证明类似位置编码遍布新皮层。更广泛的主张确实产生了可检验预测，但它的适用范围、细胞类型与回路机制仍需要直接证据。

第三，从物体跨越到抽象思维，需要的不只是隐喻。参考系为组合与心智移动提供了有吸引力的语言，但完整理论必须说明具体神经群体如何编码关系、变量、逻辑操作与语言结构。

第四，共识不保证真理。许多模型可能共享同一种偏差，或受高度相关的证据驱动。无论大脑还是多智能体机器，除了形成一致意见，还需要处理不确定性、异常检测、主动探索与纠错。

最后，一套新皮层智能理论不会自动成为完整的心智理论。情绪、多种记忆系统、发育、社会认知、身体调节与意识，都涉及被“旧脑—新脑”简化所遮蔽的回路。千脑理论或许抓住了一条重要组织原则，但不必是唯一重要的原则。

这些限制不会让框架失去价值。它们说明了这究竟是什么类型的框架：一个紧凑的实验与架构生成器，其价值取决于它能否提出精确、并且可能被证伪的预测。

---

## 结语：智能是协调起来的模型建构

《千脑智能》改变了我们想象智能时所采用的基本单位。新的图景不再是被动传感器把数据送进中心分类器，而是一个具身学习者：它在世界中移动，把特征放进参考系，建立多个模型，预测运动后果，并在没有任何单一模型独占全部真相的情况下达成可用共识。

| 霍金斯的观念 | 它提出的设计问题 |
|---|---|
| 位于某处的特征 | 表征是否保留了相对物体与身体的结构？ |
| 感觉运动学习 | 行动能否在完成目标的同时减少不确定性？ |
| 多个完整模型 | 知识能否保持分布式，同时不陷入混乱？ |
| 模块之间投票 | 如何处理置信度、冲突与少数模块的关键证据？ |
| 嵌套参考系 | 同一机制能否组合部件、物体、场景与抽象概念？ |
| 智能与驱力分离 | 目标从哪里进入系统，又由谁来修正？ |
| 知识会受错误信念侵蚀 | 什么样的制度能让集体模型保持可纠正？ |

对神经科学而言，这套理论追问：基于位置的共同计算是否真的贯穿新皮层？对AI而言，它追问：智能是否应被构造成一群持续学习的世界模型？对机器人学而言，它让运动成为认识的一部分，而不是知觉完成后才发出的命令。

最后那个具有生成力的问题，并非大脑里是否真的住着一千颗小型心智，而是：**如果没有任何单一学习者必须独自建模整个世界，而许多学习者能够移动、比较并互相纠正，会有哪些新的智能形式成为可能？**

---

## 延伸阅读

- Hawkins, J. (2021). *A Thousand Brains: A New Theory of Intelligence*. New York: Basic Books. 中文版：《千脑智能》，浙江教育出版社。
- [Hachette / Basic Books：《A Thousand Brains》官方页面](https://www.hachettebookgroup.com/titles/jeff-hawkins/a-thousand-brains/9781541675803/)
- Hawkins, J., Lewis, M., Klukas, M., Purdy, S., & Ahmad, S. (2019). [A Framework for Intelligence and Cortical Function Based on Grid Cells in the Neocortex](https://doi.org/10.3389/fncir.2018.00121). *Frontiers in Neural Circuits*, 12, 121.
- [Numenta：The Thousand Brains Theory of Intelligence](https://www.numenta.com/blog/2019/01/16/the-thousand-brains-theory-of-intelligence/)
- Clay, V., Leadholm, N., Hawkins, J., et al. (2024). [The Thousand Brains Project: A New Paradigm for Sensorimotor Intelligence](https://arxiv.org/abs/2412.18354).
- Horton, J. C., & Adams, D. L. (2005). [The Cortical Column: A Structure Without a Function](https://pmc.ncbi.nlm.nih.gov/articles/PMC1569491/). *Philosophical Transactions of the Royal Society B*, 360, 837--862.

</div>
