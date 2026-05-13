---
title: "[Paper Notes] From Kepler to Newton: Explainable AI for Science"
date: 2026-05-13
permalink: /posts/2026/05/from-kepler-to-newton-paper-notes/
tags:
  - Explainable AI
  - AI for Science
  - Symbolic Regression
  - Scientific Discovery
  - Physics
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**"From Kepler to Newton: Explainable AI for Science"** uses a historically elegant test case to argue for Explainable AI in scientific discovery. The authors ask: if modern AI had access only to Tycho Brahe and Kepler's Mars observations, could it rediscover pieces of Kepler's planetary laws and Newton's inverse-square gravitation? Their answer is yes, but with an important caveat. Black-box neural networks can fit and augment sparse observations, symbolic regression can expose compact equations, but humans still need to interpret variables, invent concepts such as acceleration and force, and prevent the equations from being over-generalized.

## Paper Info

The paper is **"From Kepler to Newton: Explainable AI for Science"** by **Zelong Li, Jianchao Ji, and Yongfeng Zhang** from **Rutgers University**. It appeared at the **2nd AI4Science Workshop at ICML 2022** and is available as [arXiv:2111.12210](https://arxiv.org/abs/2111.12210). I reviewed the arXiv PDF and kept a local copy at [assets/papers/2111.12210.pdf](/assets/papers/2111.12210.pdf).

## 1. Motivation

The paper starts from the classic scientific loop:

**observation -> question -> hypothesis -> prediction -> experiment and test**

This is the hypothetico-deductive paradigm. It has served science well, but modern science increasingly has too much data for researchers to manually inspect every possible pattern. The authors frame AI as a way to help with this bottleneck, especially in the step where a scientist proposes useful hypotheses from observations.

Their proposed alternative is an **Explainable AI-based, hypothesis-free discovery loop**:

**observation -> question -> model learning -> model interpretation -> prediction -> experiment and test**

The key substitution is not simply "use AI." It is more specific: use black-box models for accurate prediction and data augmentation, then use white-box explanation methods to translate the learned model into human-readable equations or rules. In the authors' framing, AI can generate candidate hypotheses, but human scientists still decide what those hypotheses mean.

## 2. Why Kepler and Newton?

The historical analogy is clean:

- **Tycho Brahe** represents observation: careful astronomical measurements.
- **Johannes Kepler** represents model learning: discovering regularities in planetary motion.
- **Isaac Newton** represents explanation: explaining those regularities through force, acceleration, and gravitation.

The paper asks what this pipeline would look like if part of Kepler and Newton's work were assisted by modern AI. To keep the setting historically constrained, the experiments use Mars observation data from Kepler's *Astronomia Nova*, not modern high-precision planetary data. That choice matters because the paper wants to test whether AI can rediscover insight from the kind of limited but high-quality data available around the scientific revolution.

## 3. Model Learning: Black-Box Prediction and Data Augmentation

The first model is deliberately simple: a three-layer MLP with hidden size 100. The authors use the same neural-network structure across experiments instead of hand-designing a physics-aware architecture.

For Kepler's first law, the network learns a function:

$$
r = NN(\theta)
$$

where \(r\) is the Sun-Mars distance and \(\theta\) is Mars' angular position in heliocentric ecliptic coordinates. The original dataset has only 28 observations, so the neural network is used both for smooth fitting and for generating 1,000 augmented samples.

This is the "black-box AI" part of the paper. It can make useful predictions, and it can turn sparse historical data into a denser function-like object. But by itself, the MLP does not tell us why Mars moves as it does. A nested set of learned weights is not the same as a scientific explanation.

## 4. Model Interpretation: Symbolic Regression and Kepler's First Law

The explanation step uses **symbolic regression**, implemented with TuringBot. The goal is to translate the black-box function \(r = NN(\theta)\) into an explicit expression \(r = f(\theta)\).

Using cosine, addition, multiplication, and division as base operations, symbolic regression finds a compact expression:

$$
r = \frac{1.51033}{1 + 0.0927177 \cos(\theta + 0.544536)}
$$

This matches the polar form of an ellipse:

$$
r = \frac{l}{1 + \epsilon \cos(\theta)}
$$

So the AI pipeline recovers Kepler's first law in an interpretable form: Mars follows an elliptical orbit with the Sun at a focus. Even better, the coefficient \(0.0927177\) can be read as Mars' eccentricity. The paper reports that this is within 0.1% of Kepler's own value and about 0.7% from the modern value, reasonable given that the experiment intentionally uses 400-year-old data.

The phase shift \(\theta + 0.544536\) also has a physical interpretation. It suggests that Mars reaches perihelion around August, consistent with historical records of close Mars oppositions.

## 5. From Kepler Toward Newton

The second experiment adds time. The authors train another MLP:

$$
\theta = NN(t)
$$

where \(t\) is time normalized into one Mars orbital period. This is useful because the exact inverse relationship from time to angle is hard to express directly; the paper notes that the known orbital mechanics equation gives \(t\) as a function of \(\theta\), but \(\theta\) as a function of \(t\) is not easy to write in closed form.

Because the neural model is smooth, it can still support analysis. The authors estimate angular velocity \(\omega\) by finite differences and combine it with \(r\), then ask symbolic regression to search for relations among \(r\), \(r^2\), \(r^3\), \(\omega\), \(\omega^2\), and \(\omega^3\).

The compact discovered rule is:

$$
r^3 \omega^2 = 0.000298491 \ \mathrm{AU^3 day^{-2}}
$$

Modern physics recognizes the same structure as:

$$
r^3 \omega^2 = GM
$$

The reported relative error is about 0.8% compared with the modern value in AU and days. This is the paper's strongest example of the model-learning plus model-interpretation workflow: neural networks make the time-angle relationship usable, symbolic regression identifies a simple invariant, and that invariant points toward a real physical law.

## 6. The Human Role: Meaning Is Not Automatic

The most interesting part of the paper is not just that symbolic regression finds equations. It is the authors' insistence that equations are not automatically science.

For example, symbolic regression can output:

$$
r^3 \omega^2 = c
$$

But to reach Newtonian gravitation, a human still has to recognize that \(a = r\omega^2\) is centripetal acceleration, then reorganize the expression as:

$$
a \propto \frac{1}{r^2}
$$

and finally connect force to acceleration through \(F = ma\), yielding:

$$
F \propto \frac{1}{r^2}
$$

This is the conceptual leap. AI can narrow the hypothesis search space and expose useful symbolic structure, but the meaning of "acceleration," "force," and "gravity" is assigned through human scientific understanding.

The paper also warns against over-reading the result. The Mars-only relationship \(r^3\omega^2=c\) is not itself Kepler's third law, because Kepler's third law is a cross-planet statement about orbital period and mean distance. Still, it points in the right direction: if one considers \(\bar{\omega}=2\pi/T\), the expression suggests a relation between \(\bar{r}^3\) and \(T^2\), which could guide the search once data from more planets is included.

## 7. Strengths

- The historical case study is unusually readable. It gives the paper a clear scientific-discovery pipeline instead of only a machine-learning benchmark.
- The division between **prediction** and **explanation** is sharp. The authors do not pretend that a high-accuracy MLP is a scientific theory.
- Symbolic regression is used in a natural role: translating a fitted model into candidate laws.
- The paper is careful about the human scientist's role. It treats AI-generated equations as hypotheses and search-space reducers, not as self-sufficient knowledge.

## 8. Limitations

- The experiment is more a demonstration than a full discovery engine. The search space is still strongly shaped by the authors' chosen variables and base functions.
- The physical domain is clean and low-dimensional. Real AI-for-science settings may involve noisy, high-dimensional, partially observed systems where symbolic regression is much harder.
- The paper depends on human interpretation at key points, which is philosophically honest but also means the AI pipeline is not autonomous.
- The singularity discussion is provocative but less technically grounded than the Kepler/Newton experiments. The most durable contribution is the concrete XAI-for-science workflow.

## Takeaways

This paper is valuable because it makes a precise distinction: **prediction is not explanation, and explanation is not yet meaning**. Black-box models can be powerful scientific instruments, especially for fitting sparse data and creating differentiable approximations. Symbolic regression can turn those instruments into candidate equations. But science still needs humans to judge scope, invent concepts, connect equations to mechanisms, and decide when an apparent rule is real knowledge rather than an overfit pattern.

For AI-for-science, that is a useful stance. The right goal is not to replace the scientist with an inscrutable oracle. It is to build systems that accelerate the observation-to-hypothesis step while keeping the resulting knowledge legible enough for humans to inspect, challenge, and extend.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**《From Kepler to Newton: Explainable AI for Science》** 用一个很漂亮的科学史案例来讨论可解释 AI 在科学发现中的作用。作者的问题是：如果现代 AI 只能使用第谷和开普勒时代的火星观测数据，它能否重新发现开普勒行星运动定律的一部分，以及牛顿万有引力反平方关系？论文的回答是：可以，但必须加上一个重要限定。黑箱神经网络可以拟合和扩增稀疏观测，符号回归可以暴露紧凑的数学方程，但人类仍然需要解释变量、创造“加速度”和“力”这样的概念，并避免把 AI 找到的方程过度泛化。

## 论文信息

论文标题为 **"From Kepler to Newton: Explainable AI for Science"**，作者是来自 **Rutgers University** 的 **Zelong Li、Jianchao Ji 和 Yongfeng Zhang**。论文发表于 **ICML 2022 第 2 届 AI4Science Workshop**，arXiv 地址为 [arXiv:2111.12210](https://arxiv.org/abs/2111.12210)。我阅读的是 arXiv PDF，并在本地保留了一份副本：[assets/papers/2111.12210.pdf](/assets/papers/2111.12210.pdf)。

## 1. 动机

论文从经典科学研究循环讲起：

**观察 -> 问题 -> 假设 -> 预测 -> 实验与检验**

这就是 hypothetico-deductive paradigm，也就是假设演绎式科学发现范式。它非常有效，但现代科学的数据规模越来越大，研究者很难手动检查每一种潜在模式，也很难完全靠人工从大量观测中提出高质量假设。

作者提出的替代方案是一个 **基于可解释 AI 的、近似无人工假设的发现循环**：

**观察 -> 问题 -> 模型学习 -> 模型解释 -> 预测 -> 实验与检验**

这里的关键不是简单地“用 AI”，而是更具体地拆成两步：先用黑箱模型做精确预测和数据扩增，再用白箱解释模型把学到的关系翻译成人类可读的方程或规则。按照作者的观点，AI 可以产生候选假设，但这些假设的物理意义仍然需要人类科学家来判断。

## 2. 为什么是开普勒和牛顿？

这个历史类比非常清晰：

- **第谷·布拉赫** 代表观察：高质量、系统性的天文观测。
- **约翰内斯·开普勒** 代表模型学习：从行星运动数据中发现规律。
- **艾萨克·牛顿** 代表解释：用力、加速度和引力解释这些规律。

论文要问的是：如果用现代 AI 辅助开普勒和牛顿式的发现过程，会发生什么？为了保持历史约束，实验只使用开普勒在 *Astronomia Nova* 中整理的火星观测数据，而不是现代高精度行星数据。这一点很重要，因为论文真正想测试的是：AI 能否从 400 年前那种有限但高质量的数据中重新发现科学洞见。

## 3. 模型学习：黑箱预测与数据扩增

第一类模型故意设计得很简单：一个三层 MLP，隐藏层大小为 100。作者没有为不同实验手工设计物理先验网络，而是始终使用同一种简单神经网络结构。

对于开普勒第一定律，神经网络学习的是：

$$
r = NN(\theta)
$$

其中 \(r\) 是太阳到火星的距离，\(\theta\) 是火星在日心黄道坐标系中的角位置。原始数据只有 28 条观测，因此神经网络同时承担两个作用：平滑拟合这些观测，并生成 1000 个扩增样本。

这就是论文中的“黑箱 AI”部分。它可以做预测，也可以把稀疏历史数据变成更稠密的函数近似。但 MLP 本身并不会告诉我们火星为什么这样运动。即使预测很准，一堆嵌套矩阵和非线性权重也不是科学解释。

## 4. 模型解释：符号回归与开普勒第一定律

解释步骤使用 **符号回归**，具体工具是 TuringBot。目标是把黑箱函数 \(r = NN(\theta)\) 翻译成显式表达式 \(r = f(\theta)\)。

在只给出余弦、加法、乘法和除法等基础运算的情况下，符号回归找到一个紧凑表达式：

$$
r = \frac{1.51033}{1 + 0.0927177 \cos(\theta + 0.544536)}
$$

这正好对应椭圆在极坐标中的形式：

$$
r = \frac{l}{1 + \epsilon \cos(\theta)}
$$

因此，这条 AI 流水线以可解释形式恢复了开普勒第一定律：火星轨道是一个椭圆，太阳位于一个焦点上。进一步看，系数 \(0.0927177\) 可以解释为火星轨道偏心率。论文报告称，这个结果与开普勒自己的计算相差不到 0.1%，与现代值相差约 0.7%。考虑到实验故意使用 400 年前的数据，这个误差是可以接受的。

表达式中的相位偏移 \(\theta + 0.544536\) 也有物理解释。它暗示火星近日点大约在 8 月，这与历史上火星大冲接近地球的记录一致。

## 5. 从开普勒走向牛顿

第二个实验加入时间变量。作者训练另一个 MLP：

$$
\theta = NN(t)
$$

其中 \(t\) 是归一化到一个火星轨道周期内的时间。这个模型有用，是因为从轨道力学角度看，已知方程更容易把 \(t\) 写成 \(\theta\) 的函数，而把 \(\theta\) 直接写成 \(t\) 的闭式函数并不容易。

由于神经网络模型是平滑的，作者可以继续做分析。他们用有限差分估计角速度 \(\omega\)，并把它与 \(r\) 结合起来，然后让符号回归在 \(r\)、\(r^2\)、\(r^3\)、\(\omega\)、\(\omega^2\)、\(\omega^3\) 之间搜索关系。

最后发现的紧凑规则是：

$$
r^3 \omega^2 = 0.000298491 \ \mathrm{AU^3 day^{-2}}
$$

从现代物理来看，这个结构对应：

$$
r^3 \omega^2 = GM
$$

论文报告称，使用 AU 和 day 作为单位时，这个常数与现代值的相对误差大约为 0.8%。这是整篇论文最有力的例子：神经网络让时间和角度之间的关系变得可用，符号回归识别出简单不变量，而这个不变量指向真实物理定律。

## 6. 人类角色：方程不自动等于意义

我觉得论文最有意思的地方，不只是符号回归能找方程，而是作者反复强调：方程本身还不是科学。

比如符号回归可以输出：

$$
r^3 \omega^2 = c
$$

但要走到牛顿万有引力，人类首先需要意识到 \(a = r\omega^2\) 是向心加速度，然后把上式整理为：

$$
a \propto \frac{1}{r^2}
$$

最后再通过 \(F = ma\) 把力和加速度联系起来，得到：

$$
F \propto \frac{1}{r^2}
$$

这才是概念跃迁。AI 可以缩小假设搜索空间，也可以暴露有用的符号结构，但“加速度”“力”“引力”这些概念的意义，需要人类科学理解来赋予。

论文还提醒我们不要过度解读结果。只用火星数据得到的 \(r^3\omega^2=c\) 并不等于开普勒第三定律，因为开普勒第三定律是跨行星的规律，讨论的是轨道周期和平均距离之间的关系。不过它确实指向正确方向：如果考虑 \(\bar{\omega}=2\pi/T\)，就会得到 \(\bar{r}^3\) 与 \(T^2\) 的关系线索。当加入更多行星数据时，这个线索可能加速第三定律的发现。

## 7. 优点

- 历史案例非常易读，让论文不只是一个机器学习 benchmark，而是一个完整的科学发现流程示范。
- 论文清楚地区分了 **预测** 和 **解释**。作者没有把高精度 MLP 伪装成科学理论。
- 符号回归的位置很自然：把拟合模型翻译成候选科学定律。
- 论文对人类科学家的作用保持清醒。AI 生成的方程是候选假设和搜索空间压缩工具，不是自足的知识。

## 8. 局限

- 这更像是一个示范，而不是完整自动科学发现系统。变量和基础函数的选择仍然由作者强烈限定。
- 这个物理场景非常干净、低维。真实 AI for Science 问题可能更高维、更嘈杂，也更难观测，符号回归会困难很多。
- 关键解释步骤仍然依赖人类，这在哲学上很诚实，但也说明流水线并不是自治发现系统。
- 关于技术奇点的讨论比较有启发性，但技术含量不如开普勒和牛顿实验本身扎实。最值得保留的贡献还是具体的 XAI for Science 工作流。

## 我的理解

这篇论文最有价值的一句话可以概括为：**预测不是解释，解释也还不等于意义**。黑箱模型可以成为强大的科学工具，尤其适合拟合稀疏数据、构造可微近似和生成扩增样本。符号回归可以把这些工具产出的模型变成候选方程。但科学仍然需要人类判断作用范围、创造概念、把方程连接到机制，并识别一个表面规律到底是真知识，还是只是过拟合出来的模式。

对于 AI for Science，这是一种很健康的立场。目标不应该是用一个不可理解的神谕替代科学家，而是构建能够加速“从观察到假设”过程的系统，同时让新知识保持足够可读，使人类可以检查、质疑和继续推进。

</div>
