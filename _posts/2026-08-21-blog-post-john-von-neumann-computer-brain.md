---
title: "John von Neumann: The Statistical Language of the Brain"
date: 2026-08-21
permalink: /posts/2026/08/john-von-neumann-computer-brain/
excerpt: "The Computer and the Brain asks how slow, noisy, low-precision neurons produce fast and reliable intelligence—and why the brain's language may differ fundamentally from mathematical notation."
tags:
  - Book Notes
  - Computing
  - Neuroscience
  - Cognitive Science
  - AI
  - Robotics
  - Philosophy
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## Introduction: How Can Slow and Noisy Parts Produce a Fast and Reliable Mind?

John von Neumann's *The Computer and the Brain* begins with a comparison that appears natural and becomes increasingly strange. A digital computer and a nervous system both receive signals, store information, perform operations, and control behavior. Neurons can even look like binary elements: an impulse occurs or it does not. Yet the closer von Neumann brings the two systems together, the more their organizing principles diverge.

The electronic components of his time were much faster than neurons. Computers demanded exact numerical representation and carefully ordered operations. The brain used enormous numbers of slow components, tolerated noisy signals, consumed little energy, and still recognized objects, controlled the body, remembered a lifetime, and adapted to situations that had never occurred before.

The puzzle is therefore larger than whether the brain "is a computer." The useful question is: **What kind of computation can succeed with slow, variable, low-precision components?** Von Neumann's answer leads from spikes and thresholds to parallelism, memory, mixed digital--analog processes, statistical coding, and finally the provocative claim that the brain's internal language is not the language of conscious mathematics.

The book was prepared in 1955--1956 for the Silliman Lectures and published posthumously in 1958. It remained unfinished, and von Neumann repeatedly presents its claims as mathematically guided speculation rather than settled neuroscience. That incompleteness is part of its value. The book does not close the problem of mind; it identifies the architectural questions that a science of natural and artificial intelligence must learn to ask.

---

## 1. A Comparison That Changes Both Sides

The first half of the book describes analog and digital computation, logical control, stored programs, precision, speed, and memory hierarchies. The second half reuses this vocabulary to study the nervous system. This is not a decorative analogy in which the brain receives labels borrowed from engineering. The comparison works in both directions.

Computer theory gives von Neumann a precise set of questions. What is the elementary active component? How is a signal represented? Which operations occur in series, and which occur in parallel? Where does memory reside? How much precision is required? What makes a complex system reliable when its components can fail?

The brain then destabilizes the assumptions built into those questions. A neuron may be more than one elementary logical component. Memory may not occupy a separate addressable organ. Signals may move repeatedly between discrete events and continuous physical quantities. Reliability may emerge from statistical organization instead of exact symbols. Once those possibilities appear, the computer is no longer the neutral definition of computation; it becomes one historically specific architecture among others.

Von Neumann's method can be summarized as a sequence:

```text
Describe artificial computation precisely
                ↓
Use its concepts to interrogate the nervous system
                ↓
Locate the points where the analogy breaks
                ↓
Treat those breaks as clues to another form of computation
```

The deepest insights occur at the breaks.

---

## 2. The Neuron Is Digital—But Only at First Sight

A mature nerve impulse has a relatively reproducible form. Once stimulation succeeds, an action potential propagates along the axon; if stimulation fails, no standard impulse follows. This permits a first abstraction:

| Nervous event | Digital abstraction |
|---|---|
| No impulse on a specified axon in a specified time relation | 0 |
| An impulse occurs | 1 |

Other impulses arriving at a neuron help determine whether it emits one of its own. Under a simplified rule, a neuron that fires only when two inputs arrive resembles an **AND** gate; one that fires when either input arrives resembles an **OR** gate. With inhibition, threshold logic can construct richer operations.

Von Neumann immediately weakens this tidy picture. A neuron commonly receives many synaptic inputs. Their effectiveness may depend on number, location, geometry, timing, fatigue, recovery, and the neuron's previous state. "Simultaneous" inputs are integrated over a finite summation window, and older inputs may fade gradually rather than disappear at a sharp boundary. Receptors may respond to changes in light or pressure rather than to a fixed absolute level.

The significant elementary unit may therefore be the synapse, a dendritic region, or a temporally extended state—not the whole neuron treated as a stateless switch. The spike is discrete, while the conditions that produce it are richer and partly continuous.

This distinction remains essential whenever a biological metaphor enters AI. A threshold unit in a neural network captures one useful abstraction, but the abstraction should not be mistaken for a complete neuron. The scientific question is always which omitted details matter for the function being explained.

---

## 3. Slow Components, Massive Parallelism, and Logical Depth

Von Neumann's quantitative estimates belong to the vacuum-tube and early-transistor era, so their numerical values should not be carried directly into the present. The structural contrast is more durable.

Artificial switching elements were fast but expensive in volume and energy. Neurons were slow but available in immense numbers, densely packed and energetically economical. The natural response to those constraints is a different organization:

| Artificial machine of the 1950s | Nervous system |
|---|---|
| Fewer, faster active elements | Many more, slower active elements |
| Strong tendency toward serial execution | Strong tendency toward parallel activity |
| Intermediate results placed in explicit memory | State may persist in the active network itself |
| Long exact operation sequences are feasible | Long noisy sequences risk delay and error accumulation |

Parallelism does not mean that every operation can happen at once. If operation B needs the result of A, the dependency remains. The important quantity is **logical depth**: the length of the longest chain of operations that must occur successively.

Imagine recognizing a face. A purely serial design might inspect locations one after another, calculate local features in order, store every intermediate result, and finally assemble a decision. A parallel design lets many local detectors operate at once and combine their partial evidence through a smaller number of dependent stages. Its total activity can be enormous while its critical path remains short.

This resolves an apparent paradox. The brain can contain slow components and still respond quickly if useful computation is spread across many components and organized with relatively shallow dependency chains. Serializing the same procedure would create additional memory requirements because early results must wait somewhere while later operations proceed.

Von Neumann is not claiming that the brain has no recurrence or extended thought. Perception, deliberation, and working memory clearly involve feedback over time. His architectural point is narrower: a system built from slow, low-precision components cannot make every intelligent act depend on an extremely long fragile chain of exact steps.

---

## 4. Memory Is a Change in the Machine

Memory is the most openly speculative part of the manuscript. Von Neumann knows that the nervous system must possess enormous memory, perhaps several kinds of memory, but he cannot locate a single physical storage organ equivalent to a computer's addressable memory.

He considers several possible embodiments:

- prior activity may change a neuron's stimulation threshold;
- frequently used connections may become easier to activate, while disused paths weaken;
- recurrent groups of neurons may preserve an active state through mutual stimulation;
- persistent chemical states may carry information;
- genetic material stores inherited information that shapes the system's organization.

The alternatives should not all be collapsed into one phenomenon. Genetic information, an active recurrent state, and an acquired episodic memory operate on different timescales and serve different functions. Their presence nevertheless supports a common architectural insight: **the material that stores information need not be a separate copy of the material that performs an operation.**

In a conventional stored-program machine, program, data, processor, and memory can be distinguished even when they interact closely. In a nervous system, experience may alter the very thresholds and connections that determine future processing. Learning changes the machine that learns.

This makes biological memory less like placing a file at a numerical address and more like reshaping a landscape. A cue does not necessarily retrieve a complete record from one location. It perturbs a distributed network whose modified structure makes some patterns easier to reconstruct than others.

Von Neumann also proposes a spectacular estimate of total memory capacity by treating sensory impressions as bits accumulated across a lifetime and assuming essentially no true forgetting. The calculation is historically interesting and scientifically fragile. Its assumptions ignore compression, selection, reconstruction, interference, and genuine forgetting. The enduring contribution is the question of physical embodiment, not the resulting number.

---

## 5. The Nervous System Is a Mixed Machine

If the presence or absence of a spike were the whole story, the nervous system might be described as a digital machine. Von Neumann instead follows processes across the boundaries of the system.

A discrete nerve impulse can trigger the release of a chemical. Chemical concentration varies continuously. It can alter muscle tension or glandular secretion, producing continuous physical changes. Internal receptors measure those changes and convert them into new trains of impulses. One functional loop may therefore alternate repeatedly between discrete and continuous forms:

```text
spike → chemical release → bodily change → sensory measurement → spike
```

The relevant computation is distributed across nervous tissue, chemistry, mechanics, and the body. Digital and analog are not rival labels for the entire organism; they describe different phases of one control process.

This mixed character matters for robotics. A controller does not act in a world made of its own symbols. Motor commands become torque, friction, deformation, and contact; sensors then recode those continuous consequences. Intelligence belongs to the closed perception--action loop, including the transformations between representations and physical dynamics.

That robotics interpretation is contemporary; von Neumann did not present a modern theory of embodied AI. His analysis nevertheless supplies the conceptual opening: computation can cross substrates and representations without ceasing to be one organized process.

---

## 6. Complete Codes, Short Codes, and Layers of Control

Von Neumann uses **code** for a system of logical instructions that makes an automaton perform an organized task. A **complete code** specifies the elementary orders in enough detail to determine the machine's behavior. A **short code** lets one machine interpret the instruction system of another, so a compact higher-level order can stand for a much larger sequence of primitive operations.

The modern analogy is the relation among machine instructions, an interpreter, and a higher-level language. A command such as `sort(records)` says little about the comparisons, memory accesses, branches, and data movements that realize it. Its brevity depends on an already organized system capable of expanding the command.

At the end of the book, von Neumann suggests that the nervous system's internal language may have the character of such a short code. Our conscious instruction "pick up the cup" does not enumerate muscles, motor units, feedback gains, predicted contact, grip adjustment, and postural compensation. A compact intention recruits layered control routines whose implementation remains unavailable to introspection.

This does not imply a literal hidden program written in words inside the brain. "Short code" is an architectural analogy: meaningful control can occur at several descriptive levels, and a high-level symbol can have causal power because the lower-level system already knows how to interpret it.

The distinction also places limits on introspection. Conscious thought may report the high-level order while remaining unable to reveal the neural code that realizes it. Knowing what one intends is different from knowing how one's nervous system implements the intention.

---

## 7. Statistical Notation: Trading Precision for Reliability

The climax of von Neumann's argument begins with a contradiction. The nervous system controls difficult quantitative problems: balance, temperature, pressure, movement, perception, and timing. In an ordinary computer, long arithmetic procedures require high precision because small early errors can accumulate and become amplified. Yet neural signals appear far too imprecise to carry ten or twelve exact decimal digits through a long calculation.

Von Neumann's resolution is that the nervous system does not usually represent quantities as exact digital numerals. Stimulus intensity may be carried by the frequency of a pulse train or by statistical relations among many pulse trains. Meaning belongs to a distributional property of a population or interval, not to the flawless presence of each individual marker.

Suppose a message is represented by roughly seven hundred events out of one thousand. Losing several events changes the estimate slightly. In an exact positional numeral, flipping one high-order bit can change the value radically. Statistical notation therefore creates a characteristic exchange:

| Exact digital notation | Statistical neural notation |
|---|---|
| Every designated marker may matter decisively | Aggregate frequency or correlation carries meaning |
| High arithmetic precision | Limited local numerical precision |
| A critical bit error can corrupt the result | Individual missing or extra events cause gradual distortion |
| Reliability comes from accurate components and correction | Reliability emerges from redundancy and population behavior |

Von Neumann describes this as sacrificing arithmetic precision to gain logical reliability. A noisy component does not require a noisy system if information is represented redundantly and decisions depend on stable statistical structure.

The price is a constraint on architecture. Low-precision values cannot safely pass through indefinitely long serial computations. The brain must control error through short dependency paths, parallel evidence, feedback, rescaling, and representations whose meaning degrades gracefully.

This is more profound than saying that the brain is probabilistic. It says that the **notation itself**—what counts as a symbol and how error changes meaning—helps determine which algorithms and architectures are viable.

---

## 8. Why the Brain's Language Is Not the Language of Mathematics

The final chapter turns an engineering comparison into a philosophical claim. Human beings consciously use numbers, formulas, and formal logic. It is tempting to assume that the brain performs the same operations internally and that conscious mathematics simply displays the system's native code.

Von Neumann rejects that assumption. The nervous system's apparent statistical notation, limited precision, extensive parallelism, and shallow logical depth imply a representational structure unlike written mathematics. Conscious mathematics may be a **secondary language** constructed on top of the brain's primary operating language.

The distinction resembles the difference between an interface and its implementation. A spreadsheet displays cells, formulas, and decimal values; the underlying machine moves bits through layers of hardware and software that look nothing like the visible sheet. Likewise, a person may consciously manipulate the expression `2 + 3 = 5` while the physical process supporting that thought consists of distributed, temporally evolving neural activity.

Von Neumann goes further: logic and mathematics, like natural languages, may be historically developed forms of expression rather than the only possible forms in which thought can be organized. A different kind of cognitive system may implement valid inference through structures that do not resemble our explicit notation.

This does not make mathematics arbitrary or deny mathematical truth. It separates three questions that are often confused:

1. What relationships are mathematically valid?
2. Which notation do humans use to express those relationships consciously?
3. What physical and representational processes let a brain understand and manipulate that notation?

The third answer need not resemble the second.

---

## 9. A Contemporary Interpretation for AI and Robotics

Von Neumann wrote before deep learning, GPUs, neuromorphic processors, and modern embodied robotics. The following connections extend his framework; they are not claims he made directly about current systems.

### Neural Networks: Distributed Competence Without Exact Symbols

Modern neural networks also obtain reliable behavior from many approximate numerical operations and distributed representations. Quantization shows that some inference can survive reductions in numerical precision, while redundancy across parameters can make behavior robust to small local perturbations. This echoes von Neumann's exchange between local precision and system-level reliability.

The resemblance has limits. Most current neural networks run on highly synchronized digital hardware, use dense matrix operations, separate training from deployment, and lack the event-driven dynamics of biological spikes. Calling them "brain-like" can conceal as much as it reveals.

### Neuromorphic Systems: Architecture Follows the Notation

Spiking neuromorphic research explores asynchronous events, sparse activity, local state, and closer integration of memory with computation. Intel's Loihi line, for example, treats networks as dynamical systems whose stateful units communicate through spikes. The point is not to reproduce a brain cell by cell. It is to investigate whether a different signal language supports a different efficiency regime.

This directly reflects von Neumann's architectural lesson. If information is represented through event timing, frequency, and population dynamics, a machine designed around clocked dense arithmetic may be an awkward host. The notation and the hardware should be studied together.

### In-Memory and Analog Computing: Learning Where the Weights Live

Analog in-memory computing performs multiply--accumulate operations where weight data are stored, reducing repeated movement between processor and memory. Such systems face noise, device variation, and limited precision, so useful computation depends on algorithms that tolerate and compensate for imperfect components.

This does not reproduce biological memory, but it revives von Neumann's question: what changes when memory is part of the operation rather than a passive warehouse beside it?

### Robotics: Intelligence Across the Body--World Loop

For a robot, symbols acquire operational meaning through perception, action, and correction. "Graspable" is not exhausted by a visual label; it is tested through geometry, compliance, force, slip, failure, and recovery. A robust controller must combine fast discrete decisions with continuous dynamics and use feedback to keep low-precision local estimates from becoming catastrophic errors.

Von Neumann's mixed-machine perspective suggests that the unit of analysis should include the loop connecting model, processor, sensor, actuator, body, and environment. Intelligence is not located in one component simply because that component executes the largest model.

---

## 10. What the Book Does Not Establish

The book's influence makes disciplined reading especially important.

First, it does not prove that the brain is a computer in the ordinary stored-program sense. "Automaton" is a comparative framework, and the important results concern differences in organization.

Second, its numerical estimates are historical. Counts of neurons, component speeds, energy use, pulse frequencies, and total memory capacity reflect the evidence and engineering of the 1950s. They should not be cited as current neuroscience.

Third, the manuscript does not provide a mature theory of learning. It points toward connection changes, thresholds, recurrent activity, and chemical memory, but it does not explain how experience constructs concepts or how multiple memory systems interact.

Fourth, computation does not by itself settle consciousness. Describing signal processing, control, memory, and coding can explain important cognitive capacities without explaining why experience feels like anything from the first-person point of view.

Finally, later neuroscience reveals neural coding to be more diverse than a simple rate code. Precise timing, synchrony, population geometry, oscillation, neuromodulation, dendritic computation, and plasticity all complicate the picture. This does not erase von Neumann's argument. It reinforces his warning that the neuron's digital appearance is only a first approximation.

---

## Conclusion: Intelligence Is an Architecture for Living with Error

The most lasting idea in *The Computer and the Brain* is not the metaphor of the brain as machine. It is the discovery that computation has more than one architectural style.

A conventional digital computer seeks reliable results through fast switching, exact symbols, explicit addresses, and precisely ordered operations. The nervous system appears to build reliability from another combination: huge numbers of slow elements, parallel activity, distributed and adaptive memory, repeated digital--analog transformations, statistical messages, and representations that degrade gradually under noise.

These differences reorganize the original comparison:

| Question | Artificial-computer answer | Brain-oriented possibility |
|---|---|---|
| What is a symbol? | A precisely located marker | A statistical property of activity |
| Where is memory? | An addressable storage structure | Changes in connections, thresholds, chemistry, and dynamics |
| How is speed achieved? | Fast elementary operations | Massive parallelism and short critical paths |
| How is reliability achieved? | Accurate components and exact correction | Redundancy, populations, feedback, and graceful degradation |
| What is the operating language? | Explicit mathematical and logical code | A primary neural language beneath conscious notation |

For AI, the closing question is therefore not simply how to make machines calculate faster. It is: **What representations, physical substrates, and error-tolerant organizations would let an artificial system remain reliable while learning and acting in a world that cannot be specified exactly?**

---

## Further Reading

- von Neumann, J. (1958). *The Computer and the Brain*. New Haven: Yale University Press.
- [Yale University Press: *The Computer and the Brain*](https://yalebooks.co.uk/book/9780300181111/the-computer-and-the-brain/)
- [The Commercial Press: 《计算机与人脑》](https://www.cp.com.cn/book/fc1fc795-0.html)
- [Readable scan of the original text](https://vpb.smallyu.net/%5BAuthor%5D%20John.Von.Neumann/The%20Computer%20and%20The%20Brain.pdf)
- Davies, M. et al. (2018). [Loihi: A Neuromorphic Manycore Processor with On-Chip Learning](https://doi.org/10.1109/MM.2018.112130359). *IEEE Micro*.
- Ambrogio, S. et al. (2018). [Equivalent-accuracy accelerated neural-network training using analogue memory](https://www.nature.com/articles/s41586-018-0180-5). *Nature*.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 引言：缓慢而嘈杂的零件，怎样形成快速可靠的心智？

约翰·冯·诺依曼的《计算机与人脑》从一个看似自然、越比较却越奇异的类比开始。数字计算机和神经系统都会接收信号、保存信息、执行运算并控制行为。神经元甚至很像二值元件：一个脉冲要么出现，要么不出现。然而，当冯·诺依曼把两个系统拉得越来越近，它们的组织原则反而显出越来越深的分歧。

当时的电子元件远快于神经元。计算机需要精确的数值表示和严格排序的操作；人脑则使用数量巨大的缓慢元件，容忍带噪声的信号，以很低的能耗辨认物体、控制身体、保存一生的经验，并适应从未出现过的情境。

因此，真正的问题比“大脑是不是计算机”更大。更有用的提问是：**什么样的计算，能够由缓慢、多变、低精度的元件可靠完成？** 冯·诺依曼的回答从脉冲与阈值出发，经过并行、记忆、数字—模拟混合过程和统计编码，最终抵达一个富有挑战性的判断：大脑内部的语言不是我们有意识地使用的数学语言。

这本书原本是冯·诺依曼为1955—1956年度西利曼讲座准备的讲稿，1958年在他去世后出版。手稿并未完成，他也多次说明，其中的论述是由数学引导的推测，而非已经确立的神经科学。正是这种未完成性构成了它的价值。它没有封闭心智问题，而是标出了自然智能与人工智能科学必须学会提出的架构问题。

---

## 1. 一次同时改变比较双方的类比

全书前半部分讨论模拟与数字计算、逻辑控制、存储程序、精度、速度和存储层级。后半部分沿用这些词汇研究神经系统。这并不是从工程学借几个标签贴到大脑上；比较会同时改变两边。

计算机理论为冯·诺依曼提供了一套精确问题：什么是基本活动元件？信号怎样表示？哪些操作串行发生，哪些能够并行？记忆位于哪里？系统需要多高精度？当零件可能出错时，复杂系统怎样维持可靠？

随后，大脑动摇了这些问题背后的预设。一个神经元可能包含多个基本逻辑元件；记忆可能不在一个独立、可寻址的器官中；信号可能在离散事件与连续物理量之间反复转换；可靠性可能来自统计组织，而非精确符号。计算机由此不再是“计算”的中性定义，而成为许多可能架构中的一种历史形态。

冯·诺依曼的方法可以压缩成一条路径：

```text
精确描述人工计算
        ↓
用它的概念追问神经系统
        ↓
找到类比失效的地方
        ↓
把断裂处视为另一种计算的线索
```

全书最深刻的洞见，往往出现在类比断裂之处。

---

## 2. 神经元是数字的——但这只是第一眼

成熟的神经脉冲具有相对稳定、可重复的形态。刺激成功后，动作电位沿轴突传播；刺激失败，则不会产生标准脉冲。因此可以做第一次抽象：

| 神经事件 | 数字抽象 |
|---|---|
| 特定轴突在特定时间关系中没有脉冲 | 0 |
| 出现一个脉冲 | 1 |

其他神经元传来的脉冲共同决定这个神经元是否继续放电。在最简规则下，只有两个输入同时抵达才放电的神经元，近似一个**与门**；任一输入到达便放电的神经元，近似一个**或门**。加入抑制之后，阈值逻辑可以构造更复杂的运算。

冯·诺依曼马上削弱了这个整洁模型。一个神经元通常接收许多突触输入，效果可能取决于输入数量、位置、空间结构、时间、疲劳、恢复以及神经元的既往状态。“同时”也不是数学上的同一瞬间：输入会在有限的时间窗口里累积，较早输入的影响可能逐渐衰减，而不是越过一条界线便突然消失。某些感受器响应的是光照或压力的变化，而非固定的绝对水平。

因此，真正有意义的基本单元可能是突触、树突区域或一个跨越时间的动态状态，而非被当作无状态开关的整颗神经元。脉冲是离散的，产生脉冲的条件却更加丰富，并且部分具有连续性。

每当 AI 使用生物类比时，这个区分都十分重要。神经网络中的阈值单元抓住了一种有用抽象，却不等于一个完整神经元。科学问题始终是：为了当前解释而省略的细节中，哪些会真正影响功能？

---

## 3. 缓慢元件、大规模并行与逻辑深度

冯·诺依曼的定量估计属于真空管和早期晶体管时代，具体数值不能直接沿用到今天，结构性对比却更为持久。

人工开关元件速度快，却在体积与能耗上代价昂贵；神经元缓慢，却数量巨大、排列密集而且能耗经济。不同约束自然导向不同组织方式：

| 20世纪50年代的人工机器 | 神经系统 |
|---|---|
| 活动元件较少、速度较快 | 活动元件多得多、速度较慢 |
| 强烈偏向串行执行 | 强烈偏向并行活动 |
| 中间结果写入显式存储器 | 状态可能持续存在于活动网络中 |
| 可以执行很长的精确操作序列 | 很长的带噪序列会积累延迟与误差 |

并行并不表示所有运算都能同时发生。如果操作B必须使用A的结果，这个依赖无法取消。真正关键的是**逻辑深度（logical depth）**：一项计算中最长的连续依赖链。

以人脸识别为例。纯串行设计可以依次检查图像位置、逐项计算局部特征、保存所有中间结果，最后组合出判断；并行设计则让许多局部检测器同时工作，再用较少的依赖层级汇合局部证据。后一种方法的总活动量可能极大，关键路径却可以很短。

这解释了一个表面矛盾：只要把计算分散到大量元件中，并用较浅的依赖链组织起来，缓慢神经元仍然能够支持迅速反应。若把同一过程强行串行化，还会制造额外的存储需求，因为早期结果必须等待在某处，直到后续运算完成。

冯·诺依曼并不是说大脑没有循环反馈或持续思考。感知、推理和工作记忆显然会随时间反复迭代。他的架构观点更为有限：由缓慢、低精度元件构成的系统，不能让每一次智能行为都依赖一条极长而脆弱的精确步骤链。

---

## 4. 记忆是机器自身发生了改变

记忆是手稿中推测色彩最明显的部分。冯·诺依曼知道神经系统必定拥有巨大记忆，甚至可能存在多种记忆，却找不到一个等价于计算机可寻址存储器的单一物理器官。

他考虑了若干可能载体：

- 过去的活动改变神经元的刺激阈值；
- 经常使用的连接变得更易激活，长期不用的通路逐渐减弱；
- 相互刺激的循环神经元群保存一个持续活动状态；
- 稳定的化学状态携带信息；
- 遗传物质保存塑造整个系统组织方式的继承信息。

这些可能性不能被混成同一种现象。遗传信息、活动中的循环状态和后天形成的情节记忆工作于不同时间尺度，也服务于不同功能。它们却共同支持一个架构洞见：**保存信息的物质，不一定是执行运算的物质之外的另一份独立材料。**

在传统存储程序机器中，程序、数据、处理器和存储器即使紧密互动，仍可以概念性地区分。在神经系统中，经验可能改变阈值与连接，而阈值与连接又决定未来如何处理信息。学习会改变那台正在学习的机器。

生物记忆因此不像把文件放入一个数字地址，更像重新塑造一片地形。线索未必从某个位置读出完整记录，而是扰动一个分布式网络；被过去改变的网络结构，使某些活动模式比另一些模式更容易重建。

冯·诺依曼还把一生的感官印象当作不断积累的比特，并假设不存在真正遗忘，由此得到一个惊人的总容量估计。这个计算具有历史趣味，科学上却很脆弱：它忽略了压缩、选择、重构、干扰和真实遗忘。持久的贡献是“记忆怎样获得物理实现”这个问题，而不是最后的数字。

---

## 5. 神经系统是一台混合机器

如果脉冲的有无就是全部故事，神经系统或许可以直接称为数字机器。冯·诺依曼却继续追踪过程怎样越过神经系统的边界。

一个离散神经脉冲可以引起化学物质释放；化学浓度连续变化；它又改变肌肉张力或腺体分泌，产生连续的物理变化；体内感受器测量这些变化，再把它们编码为新的脉冲序列。一个功能回路可能在离散与连续形式之间反复切换：

```text
脉冲 → 化学释放 → 身体变化 → 感受器测量 → 脉冲
```

相关计算分布在神经组织、化学过程、机械过程和身体之中。数字与模拟不是给整个生物体二选一的标签，而是同一个控制过程的不同阶段。

这种混合性质对机器人尤其重要。控制器并不在一个由自身符号组成的世界里行动。电机指令会变成扭矩、摩擦、形变和接触，传感器再把连续后果重新编码。智能存在于闭合的感知—行动回路中，其中包括不同表征与物理动力学之间的转换。

机器人这一延伸属于当代解释；冯·诺依曼没有提出现代具身智能理论。他的分析仍然打开了概念入口：只要不同载体与表征被组织进同一个功能过程，计算就可以跨越它们持续展开。

---

## 6. 完整代码、短代码与控制层级

冯·诺依曼用**代码（code）**指一套能够让自动机有组织地完成任务的逻辑指令。**完整代码（complete code）**用足够细节规定基本命令，从而确定机器的行为；**短代码（short code）**让一台机器能够解释另一套指令系统，使一条紧凑的高层命令代表一大段底层操作。

今天可以把它类比为机器指令、解释器与高级语言之间的关系。`sort(records)` 这条命令没有列举比较、访存、分支和数据移动；它之所以简短，是因为一个已经组织好的系统知道怎样把它展开。

在全书结尾，冯·诺依曼提出，大脑内部语言可能具有这种短代码性质。有意识的指令“拿起杯子”并没有逐项指定肌肉、运动单元、反馈增益、接触预测、握力调整和姿态补偿。一个紧凑意图会调动多层控制程序，而其实现细节无法被内省直接看见。

这不表示大脑里真的藏着一段用文字写成的程序。“短代码”是一种架构类比：有意义的控制可以存在于多个描述层级，高层符号之所以具有因果作用，是因为底层系统已经具备解释它的组织结构。

这个区分也划出了内省的边界。意识能够报告高层命令，却无法因此揭示实现命令的神经编码。知道自己想做什么，与知道神经系统怎样实现这个意图，是两种不同的知识。

---

## 7. 统计记号：用精度交换可靠性

冯·诺依曼的论证在一个矛盾处达到高潮。神经系统控制着困难的定量问题：平衡、温度、压力、运动、感知和时间。在普通计算机里，较长的算术过程需要高精度，因为早期的小误差会不断累积并被后续步骤放大；神经信号却远不足以在很长的计算中携带十位或十二位精确小数。

他的解决方案是：神经系统通常并不把数量表示成精确的数字。刺激强度可能由一串脉冲的频率，或许多脉冲序列之间的统计关系携带。意义属于某个群体或时间区间的分布性质，而非每一个标记都准确无误地出现。

假设一条信息由一千次事件中大约七百次出现来表示。丢失几个事件，只会略微改变估计；在精确的位置计数系统中，一个高位比特翻转却可能让数值剧烈变化。统计记号因此形成了一组典型交换：

| 精确数字记号 | 统计式神经记号 |
|---|---|
| 每个指定标记都可能决定意义 | 总体频率或相关关系携带意义 |
| 算术精度高 | 局部数值精度有限 |
| 关键比特出错可能破坏结果 | 个别事件缺失或增加只会渐进扭曲 |
| 可靠性来自精确元件和纠错 | 可靠性涌现于冗余和群体行为 |

冯·诺依曼把它描述为牺牲算术精度，以换取逻辑可靠性。只要信息以冗余方式表达，判断依赖稳定的统计结构，带噪声的零件就不必产生同样带噪声的系统。

代价是对架构的约束。低精度数值无法安全穿过无限延长的串行计算。大脑必须借助较短依赖路径、并行证据、反馈、重新缩放以及意义能够平缓退化的表征控制误差。

这比“大脑具有概率性”更为深刻。它意味着**记号系统本身**——什么算一个符号、误差怎样改变意义——会决定哪些算法与架构可以成立。

---

## 8. 为什么大脑的语言不是数学语言

最后一章把工程比较推进为哲学主张。人类会有意识地使用数字、公式和形式逻辑，因此很容易假定，大脑内部也在执行同样的操作，而有意识的数学只是把系统的原生代码显示出来。

冯·诺依曼拒绝这个假设。神经系统表现出的统计记号、有限精度、大规模并行与较浅逻辑深度，意味着它的表征结构不同于书写出来的数学。有意识的数学可能是一种建立在大脑首要运行语言之上的**第二语言**。

这个区分类似界面与实现之间的差别。电子表格显示单元格、公式和十进制数，底层机器却让比特通过多层软硬件流动，其形态与可见表格完全不同。同样，一个人可以有意识地操作表达式 `2 + 3 = 5`，而支持这段思想的物理过程可能是分布式、随时间变化的神经活动。

冯·诺依曼进一步认为，逻辑和数学与自然语言一样，可能是历史发展出来的表达形式，而非思想唯一可能的组织形式。另一类认知系统完全可能通过不类似我们显式记号的结构，实现有效推理。

这并没有让数学变得任意，也没有否定数学真理。它把三个经常混淆的问题分开：

1. 哪些关系在数学上成立？
2. 人类有意识地用什么记号表达这些关系？
3. 大脑通过什么物理和表征过程理解、操作这些记号？

第三个答案不必长得像第二个。

---

## 9. 对 AI 与机器人的当代延伸

冯·诺依曼写作时，深度学习、GPU、神经形态处理器和现代具身机器人都尚未出现。以下联系是对其框架的当代延伸，并非他直接针对今天系统作出的论断。

### 神经网络：不依靠精确符号的分布式能力

现代神经网络也从大量近似数值运算和分布式表征中获得可靠行为。量化研究表明，一些推理能力可以承受数值精度下降；参数之间的冗余也能让系统抵抗小规模局部扰动。这与冯·诺依曼提出的“局部精度与整体可靠性之间的交换”相互呼应。

相似性存在边界。当前多数神经网络运行在高度同步的数字硬件上，依赖密集矩阵运算，把训练与部署分开，也不具备生物脉冲那样的事件驱动动力学。轻易称它们“像大脑”，可能遮蔽的问题与揭示的问题一样多。

### 神经形态系统：记号系统会塑造架构

脉冲式神经形态研究探索异步事件、稀疏活动、局部状态以及存储与计算的紧密结合。以 Intel Loihi 系列为例，网络被处理为动态系统，其中带状态的单元通过脉冲通信。研究目的并不是逐个细胞复制人脑，而是追问不同信号语言能否支持不同的效率机制。

这直接回应了冯·诺依曼的架构洞见。如果信息由事件时间、频率和群体动力学表达，以同步时钟和密集算术为中心的机器可能并不是最自然的载体。记号系统与硬件需要一起研究。

### 存内与模拟计算：在权重所在之处学习

模拟存内计算在保存权重数据的位置执行乘加，减少处理器与存储器之间的反复搬运。这类系统必须面对噪声、器件差异和有限精度，因此有用计算依赖能够容忍并补偿不完美元件的算法。

它并没有复制生物记忆，却重新提出了冯·诺依曼的问题：当记忆成为运算的一部分，而非处理器旁边的被动仓库时，计算会发生什么变化？

### 机器人：跨越身体—世界回路的智能

对机器人而言，符号通过感知、行动和纠错获得操作意义。“可抓取”并不等于一个视觉标签，它还会受到几何、顺应性、力、滑动、失败和恢复的检验。稳健控制器需要把快速离散决策与连续动力学结合起来，并用反馈阻止局部低精度估计演化为灾难性误差。

冯·诺依曼的混合机器视角提示我们，分析单元应当包含连接模型、处理器、传感器、执行器、身体和环境的完整回路。某个元件执行了最大的模型，并不表示智能只存在于那个元件里。

---

## 10. 这本书没有证明什么

这部作品影响很大，因此尤其需要克制地阅读。

第一，它没有证明人脑就是普通意义上的存储程序计算机。“自动机”是比较框架，真正重要的结果来自组织方式的差异。

第二，书中的具体数字属于历史。神经元数量、元件速度、能耗、脉冲频率和总记忆容量都反映20世纪50年代的证据与工程条件，不应被当作当代神经科学数据引用。

第三，手稿没有给出成熟的学习理论。它指向连接变化、阈值、循环活动和化学记忆，却没有解释经验怎样形成概念，也没有说明多种记忆系统如何互动。

第四，计算描述不会自动解决意识问题。信号处理、控制、记忆与编码能够解释重要认知能力，却未必解释第一人称经验为什么“有所感受”。

最后，后来的神经科学表明，神经编码比简单频率编码更加多样：精确时序、同步、群体几何、振荡、神经调质、树突计算和可塑性都让图景变得更复杂。这并未抹去冯·诺依曼的论证，反而强化了他的提醒：神经元的数字外观只是一阶近似。

---

## 结语：智能是一种与误差共处的架构

《计算机与人脑》最持久的观念并不是“人脑像机器”，而是计算拥有多种架构风格。

传统数字计算机通过高速开关、精确符号、明确地址和严格排序的操作追求可靠结果；神经系统则似乎通过另一套组合建立可靠性：数量巨大的缓慢元件、并行活动、分布而可适应的记忆、反复发生的数字—模拟转换、统计式信息，以及在噪声下能够渐进退化的表征。

这些差异重新组织了最初的比较：

| 问题 | 人工计算机的答案 | 面向大脑的可能答案 |
|---|---|---|
| 什么是符号？ | 位置精确的标记 | 活动的统计性质 |
| 记忆在哪里？ | 可寻址存储结构 | 连接、阈值、化学状态和动力学的改变 |
| 如何获得速度？ | 加快基本操作 | 大规模并行与较短关键路径 |
| 如何获得可靠性？ | 精确元件与严格纠错 | 冗余、群体、反馈与平缓退化 |
| 系统使用什么语言？ | 显式数学与逻辑代码 | 位于有意识记号之下的首要神经语言 |

所以，对 AI 而言，最后的问题并不只是怎样让机器算得更快，而是：**什么样的表征、物理载体和容错组织，能够让人工系统在一个无法被精确写完的世界里持续学习并可靠行动？**

---

## 延伸阅读

- von Neumann, J. (1958). *The Computer and the Brain*. New Haven: Yale University Press.
- [耶鲁大学出版社：*The Computer and the Brain*](https://yalebooks.co.uk/book/9780300181111/the-computer-and-the-brain/)
- [商务印书馆：《计算机与人脑》](https://www.cp.com.cn/book/fc1fc795-0.html)
- [英文原书可读扫描版](https://vpb.smallyu.net/%5BAuthor%5D%20John.Von.Neumann/The%20Computer%20and%20The%20Brain.pdf)
- Davies, M. et al. (2018). [Loihi: A Neuromorphic Manycore Processor with On-Chip Learning](https://doi.org/10.1109/MM.2018.112130359). *IEEE Micro*.
- Ambrogio, S. et al. (2018). [Equivalent-accuracy accelerated neural-network training using analogue memory](https://www.nature.com/articles/s41586-018-0180-5). *Nature*.

</div>
