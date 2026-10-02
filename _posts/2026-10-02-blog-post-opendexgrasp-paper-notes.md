---
title: "[Paper Notes] OpenDexGrasp: Open-vocabulary Task-Oriented Dexterous Grasping"
date: 2026-10-02
permalink: /posts/2026/10/opendexgrasp-paper-notes/
tags:
  - Dexterous Grasping
  - Task-Oriented Manipulation
  - Open-Vocabulary Robotics
  - Affordance Learning
  - Robot Learning
  - Paper Notes
---

<div id="opendexgrasp-en" data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

A stable grasp is not necessarily a useful grasp. **OpenDexGrasp** generates a dexterous hand pose from a free-form instruction, multi-view images, and an object point cloud, with the contact region and hand configuration aligned to the intended use. Its central design is to learn affordance grounding and grasp generation in one shared perception-action latent space, so affordance prediction helps training and interpretation without becoming a test-time cascade.

The data follow a **Coverage-to-Alignment (C2A) Recipe**. **OpenDex-Scale** contributes broad semantic and geometric coverage through automatic grasp synthesis and vision-language annotation; **OpenDex-Align** contributes smaller but higher-quality functional demonstrations from teleoperation and category-level transfer. The two subsets contain **1.24M** and **27.42K** grasps respectively, with functional ratios of **44.93%** and **68.02%**.

On the paper's simulation benchmark, OpenDexGrasp reaches **71.65%** success, compared with **49.15%** for an adapted DexGraspNet 2.0 baseline. In the real-robot evaluation it reaches **72.0%** versus **59.0%**. These are task-oriented grasping results under the paper's object and instruction splits; they should not be read as long-horizon manipulation success.

## Paper and source version

**Jiyao Zhang, Junhan Wang, Tianyu Wang, Zeyuan Chen, Anthony Bolten, Yitong Peng, and Hao Dong**, from Peking University, PrimeBot, and BIGAI. These notes follow [arXiv:2609.18117v2](https://arxiv.org/abs/2609.18117), dated September 17, 2026. See the [paper PDF](https://arxiv.org/pdf/2609.18117) and [official project page](https://opendexgrasp.github.io/). The manuscript identifies itself as a CoRL 2026 paper. All numbers below are author-reported.

## 1. The target is functional contact

Task-agnostic grasping asks whether a hand can hold an object. Functional grasping asks whether the hold preserves the action implied by the instruction: grasp a kettle by its handle for pouring, keep a spray-bottle trigger accessible, or avoid a knife blade when handing it over. The relevant signal is therefore distributed across language, object parts, viewpoint, geometry, and a continuous high-DoF hand pose.

OpenDexGrasp represents one example as $(u, I, P, a, m)$: a free-form instruction $u$, multi-view RGB observations $I$, an RGB point cloud $P$, a dexterous grasp pose $a$, and an optional point-level affordance label $m$. The pose is parameterized by global translation, a continuous 6D wrist rotation, and hand joint configuration:

$$
a=[p,r_{6D},q].
$$

The model learns the conditional action distribution $p_\theta(a\mid u,I,P)$. Affordance is auxiliary supervision over the same latent state. Conceptually,

$$
p_\theta(m,a\mid u,I,P)=\int p_\theta(m\mid z,u,P)\,p_\theta(a\mid z,u,P)\,p_\theta(z\mid u,I,P)\,dz.
$$

This factorization describes shared supervision, not an inference pipeline that first predicts a map and then optimizes a hand pose.

## 2. OpenDexVerse: coverage first, alignment second

The dataset is designed around a practical tension. Automatic synthesis scales across shapes and grasp modes but can produce noisy functional labels and unnatural contact choices. Human teleoperation provides reliable task contact and natural articulation but is expensive. C2A assigns these sources different jobs.

**OpenDex-Scale** starts from category-aligned real scanned objects. Following the BODex synthesis pipeline, it samples and optimizes physically plausible dexterous candidates. Each candidate is rendered from three object-centered views and annotated by a vision-language model with object, part, and task descriptions. The result covers **105 categories, 1,110 instances, and 1.24M grasps**, of which **557.18K** are labeled functional.

**OpenDex-Align** collects high-quality task-oriented grasps with human teleoperation for three size-aware templates per category. Dense correspondences in category coordinates transfer those demonstrations to nearby compatible instances. It contains **95 categories, 2,770 instances, and 27.42K grasps**, including **18.65K** functional poses. The smaller set supplies embodied alignment after the broad synthetic prior has been learned.

This ordering matters. The model first sees a wide support of language, geometry, and hand configurations, then its distribution is pulled toward reliable functional behavior. The paper's recipe is therefore a data curriculum as much as a dataset composition.

## 3. One latent space for language, geometry, affordance, and action

The architecture uses a pretrained vision-language encoder for the multi-view images and instruction. Selected hidden states retain relationships among task words, object appearance, and view-dependent part evidence. A hierarchical point-cloud encoder supplies a global geometry token while retaining point features for affordance decoding.

A transformer action expert then combines geometry, learned queries, and noisy action tokens. It conditions on the vision-language hidden states through cross-attention and generates the grasp with flow matching. Given target action $a$, Gaussian noise $\epsilon$, and time $t$,

$$
x_t=(1-t)\epsilon+ta,\qquad v^\star=a-\epsilon.
$$

The action loss is

$$
\mathcal L_{act}=\mathbb E_{a,\epsilon,t}\left\|F_\theta(x_t,t,z_P,\{H_\ell\})-(a-\epsilon)\right\|_2^2.
$$

An affordance head predicts a score for every object point. Its loss combines focal and Dice terms:

$$
\mathcal L_{aff}=\mathcal L_{focal}(\hat m,m)+\lambda_{dice}\mathcal L_{dice}(\hat m,m).
$$

The full objective is

$$
\mathcal L=\mathcal L_{act}+\lambda_{aff}\mathcal L_{aff},\qquad \lambda_{aff}=0.3.
$$

At inference time, the model directly samples a hand pose from language, images, and geometry. There is no separate affordance-to-pose optimization stage.

## 4. Simulation results

The evaluation separates **functional** grasps, where the pose must support a downstream use, from **non-functional** grasps, where any stable hold is acceptable. Each is tested on seen and unseen object categories. The adapted baseline, marked DexGraspNet 2.0*, adds CLIP features and uses the same data and splits.

For the main functional setting, OpenDexGrasp improves on the baseline as follows:

| Split | SIV (cm³) | PD (cm) | SD (cm) | Success | Style diversity | GPT-5 / human score |
|---|---:|---:|---:|---:|---:|---:|
| Seen, baseline | 5.12 | 1.04 | 1.51 | 50.88% | 0.95 | 6.48 / 6.10 |
| Seen, OpenDexGrasp | **1.28** | **0.39** | **1.37** | **68.07%** | **1.39** | **7.43 / 7.85** |
| Unseen, baseline | 6.10 | 1.62 | 4.29 | 43.22% | 0.81 | 5.87 / 5.37 |
| Unseen, OpenDexGrasp | **1.39** | **0.48** | **1.80** | **62.96%** | **1.41** | **6.98 / 6.62** |

SIV measures solid intersection volume, PD local penetration depth, and SD object displacement after simulation. Lower is better for the first three. Style diversity measures variation across stochastic predictions, so the higher value means the model keeps multiple grasp styles instead of collapsing to one pose.

Ablations expose the role of each ingredient. The full model averages **71.65%** success across the simulation splits. Removing affordance grounding lowers this to **67.49%**; removing OpenDex-Align lowers it to **69.38%**; reducing OpenDex-Scale lowers it to **60.52%**. Replacing the pretrained vision-language model with CLIP produces the largest drop, to **57.26%**, alongside much worse physical metrics. Broad coverage, embodied alignment, point-level grounding, and a strong VLM each contribute a different part of the result.

The paper also compares direct generation with an affordance-then-optimization variant that uses the same predicted affordance. Direct OpenDexGrasp obtains **71.65%** success with **0.93 s** average inference time, while optimization obtains **49.15%** with **2.84 s**. This isolates a useful engineering point: a shared latent action generator can make the affordance signal useful without paying for hundreds of test-time optimization steps.

## 5. Real-robot transfer

The real setup uses a **Sharpa Wave Hand** mounted on a **Franka Emika Panda**, with an Intel RealSense D435 for object pose estimation. For each object and instruction, the authors sample ten valid poses, discard those that would collide with or be occluded by the table, apply a fixed $0.05$-rad closing refinement, and execute each pose once.

Across five seen and five unseen test objects, OpenDexGrasp reaches **72.0%** success, while DexGraspNet 2.0* reaches **59.0%**. GPT-5 perceptual scores are **7.5** versus **6.7**, and human scores are **7.7** versus **6.5**. The per-category table shows gains on items such as rice paddle, dustpan, bouquet, pitcher, bottle, hammer, and brush, although performance remains imperfect on several objects.

The evaluation is still a grasp-and-lift style test. It demonstrates that functional contact choices transfer to a physical hand, but it does not establish closed-loop completion of actions such as pouring, brushing, or cutting.

## 6. What the paper leaves open

The model depends on the visual-language representation and the coverage of its views; errors in part grounding can still affect the hand pose. It predicts an open-loop action and uses lightweight execution-time selection, without tactile feedback or closed-loop correction. OpenDex-Align is also modest compared with the diversity of household tools and long-horizon tasks.

My main takeaway is that task-oriented dexterous grasping benefits from separating **semantic-geometric coverage** from **embodied functional alignment**, then joining them in the same action representation. The most convincing evidence is the combination of unseen-category simulation results, the direct-generation ablation, and the real-hand transfer. The next test I would want is closed-loop execution with tactile feedback, where a grasp is judged by completing the instructed use rather than by holding the object successfully.

</div>

<div id="opendexgrasp-zh" data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏进行 **English / 中文** 切换。

## TL;DR

稳定地拿住物体，不等于以正确的方式使用物体。**OpenDexGrasp** 根据自由形式的任务指令、多视角图像和物体点云，直接生成灵巧手姿态，使接触区域与手部构型符合物体的预期用途。它的核心做法是把 affordance grounding 和 grasp generation 放进同一个 perception-action latent space；affordance 监督用于训练和解释，但不会在测试时变成“先预测区域、再优化手姿”的级联瓶颈。

数据采用 **Coverage-to-Alignment（C2A）Recipe**。**OpenDex-Scale** 通过自动抓取合成和视觉语言标注提供广泛的语义与几何覆盖；**OpenDex-Align** 通过人类遥操作和类别级迁移提供规模更小、质量更高的功能性示范。两个子集分别包含 **124 万**和 **2.742 万**个 grasp，功能性姿态比例为 **44.93%** 和 **68.02%**。

在论文的仿真 benchmark 中，OpenDexGrasp 达到 **71.65%** success，适配后的 DexGraspNet 2.0 baseline 为 **49.15%**。真实机器人评估中，两者分别为 **72.0%** 和 **59.0%**。这些数字对应论文定义的 task-oriented grasping 物体与指令划分，不代表长时序操作任务的完成率。

## 论文与阅读版本

作者为 **Jiyao Zhang、Junhan Wang、Tianyu Wang、Zeyuan Chen、Anthony Bolten、Yitong Peng 和 Hao Dong**，来自北京大学、PrimeBot 与 BIGAI。本文依据 [arXiv:2609.18117v2](https://arxiv.org/abs/2609.18117)，版本日期为 2026 年 9 月 17 日。另见[论文 PDF](https://arxiv.org/pdf/2609.18117)和[官方项目页](https://opendexgrasp.github.io/)。论文标注为 CoRL 2026 论文。以下数字均来自作者报告。

## 1. 目标是功能性接触

任务无关抓取关注手能否拿住物体；功能性抓取关注这个拿法是否保留指令中的动作。例如，倒水时要抓住水壶把手，使用喷壶时要让扳机可被按下，递刀时要避开刀刃。相关信息分布在语言、物体部件、视角、几何和连续的高自由度手姿态中。

OpenDexGrasp 将一个样本表示为 $(u,I,P,a,m)$：自由形式指令 $u$、多视角 RGB 观测 $I$、带颜色的点云 $P$、灵巧手 grasp pose $a$，以及可选的点级 affordance 标签 $m$。姿态由全局平移、连续 6D 腕部旋转和手部关节构成：

$$
a=[p,r_{6D},q].
$$

模型学习条件动作分布 $p_\theta(a\mid u,I,P)$。Affordance 是对同一潜变量的辅助监督。概念上可以写成：

$$
p_\theta(m,a\mid u,I,P)=\int p_\theta(m\mid z,u,P)\,p_\theta(a\mid z,u,P)\,p_\theta(z\mid u,I,P)\,dz.
$$

这个分解描述的是共享监督，不是测试时先预测 affordance map、再围绕它优化手姿的推理流程。

## 2. OpenDexVerse：先覆盖，再对齐

数据构建面对一个实际矛盾：自动合成可以覆盖很多形状和抓取方式，但功能标签可能有噪声，接触选择也不一定自然；人类遥操作能够提供可靠的功能性接触和自然手部动作，却难以扩展。C2A 给两个来源分配了不同任务。

**OpenDex-Scale** 从类别坐标对齐的真实扫描物体开始，沿用 BODex synthesis pipeline 对候选 grasp 进行采样和优化。每个候选从三个物体中心视角渲染，再由视觉语言模型判断它是否支持某种功能，并生成物体、部件和任务描述。该子集覆盖 **105 个类别、1,110 个实例和 124 万个 grasp**，其中 **55.718 万**个被标记为 functional。

**OpenDex-Align** 为每个类别选择三个考虑尺寸的模板，通过人类遥操作收集高质量 task-oriented grasp。随后在类别坐标系中建立稠密对应关系，把示范迁移到尺寸兼容的邻近实例。该子集包含 **95 个类别、2,770 个实例和 2.742 万个 grasp**，其中 **1.865 万**个是 functional pose。它规模更小，作用是在人类具身示范的基础上校正合成数据形成的宽泛分布。

这个顺序很关键：模型先获得语言、几何和手部构型的广泛先验，再把分布拉向可靠的功能性行为。因此，C2A 既是数据配方，也是训练课程。

## 3. 在一个潜空间里联合语言、几何、affordance 和动作

模型用预训练 vision-language encoder 处理多视角图像与任务指令。选取中间 hidden states，可以保留任务词、物体外观和随视角变化的部件证据之间的关系。分层点云 encoder 提供全局 geometry token，同时保留点级特征用于 affordance 解码。

Transformer action expert 将几何 token、可学习 query 和带噪动作 token 结合起来，通过 cross-attention 条件化于 vision-language hidden states，并用 flow matching 生成 grasp。给定目标动作 $a$、高斯噪声 $\epsilon$ 和时间 $t$：

$$
x_t=(1-t)\epsilon+ta,\qquad v^\star=a-\epsilon.
$$

动作损失为

$$
\mathcal L_{act}=\mathbb E_{a,\epsilon,t}\left\|F_\theta(x_t,t,z_P,\{H_\ell\})-(a-\epsilon)\right\|_2^2.
$$

Affordance head 为每个物体点预测功能分数，损失由 focal loss 和 Dice loss 组成：

$$
\mathcal L_{aff}=\mathcal L_{focal}(\hat m,m)+\lambda_{dice}\mathcal L_{dice}(\hat m,m).
$$

完整目标为

$$
\mathcal L=\mathcal L_{act}+\lambda_{aff}\mathcal L_{aff},\qquad \lambda_{aff}=0.3.
$$

推理时，模型直接从语言、图像和几何生成手姿，不需要单独的 affordance-to-pose 优化。

## 4. 仿真结果

评估将 grasp 分为 **functional** 和 **non-functional** 两类：前者要求姿态支持下游用途，后者只要求稳定拿住。两类任务都分别在 seen 和 unseen object categories 上测试。baseline DexGraspNet 2.0* 加入了 CLIP 特征，并使用与 OpenDexGrasp 相同的数据和划分。

在主要的 functional 设置下，结果为：

| 划分 | SIV (cm³) | PD (cm) | SD (cm) | Success | Style diversity | GPT-5 / 人类评分 |
|---|---:|---:|---:|---:|---:|---:|
| Seen，baseline | 5.12 | 1.04 | 1.51 | 50.88% | 0.95 | 6.48 / 6.10 |
| Seen，OpenDexGrasp | **1.28** | **0.39** | **1.37** | **68.07%** | **1.39** | **7.43 / 7.85** |
| Unseen，baseline | 6.10 | 1.62 | 4.29 | 43.22% | 0.81 | 5.87 / 5.37 |
| Unseen，OpenDexGrasp | **1.39** | **0.48** | **1.80** | **62.96%** | **1.41** | **6.98 / 6.62** |

SIV 是手物体实体相交体积，PD 是局部穿透深度，SD 是仿真后物体位移；前三项越低越好。Style diversity 统计随机生成姿态的变化程度，因此数值更高说明模型保留了多种抓取风格，没有坍缩到单一姿态。

消融实验揭示了各组件的作用。完整模型在仿真划分上的平均 success 为 **71.65%**。去掉 affordance grounding 后降至 **67.49%**；去掉 OpenDex-Align 后为 **69.38%**；缩小 OpenDex-Scale 后降至 **60.52%**。将预训练 vision-language model 替换成 CLIP 后，success 降至 **57.26%**，物理指标也明显恶化。广泛覆盖、具身对齐、点级 grounding 和强 VLM 分别贡献了不同部分。

论文还比较了直接生成与“affordance 后优化”的方法，后者使用相同的 affordance 预测。直接生成达到 **71.65%** success，平均推理时间 **0.93 秒**；优化版本为 **49.15%** 和 **2.84 秒**。这说明共享潜空间中的动作生成器可以利用 affordance 监督，同时避免测试时数百步的优化开销。

## 5. 真实机器人迁移

真实实验使用安装在 **Franka Emika Panda** 上的 **Sharpa Wave Hand**，并用 Intel RealSense D435 估计物体位姿。每个物体和指令采样十个有效姿态，删除会撞桌或被桌面遮挡的姿态，再统一增加 $0.05$ rad 的闭合修正，每个姿态执行一次。

在五个 seen 和五个 unseen 测试物体上，OpenDexGrasp success 为 **72.0%**，DexGraspNet 2.0* 为 **59.0%**。GPT-5 感知评分为 **7.5** 对 **6.7**，人类评分为 **7.7** 对 **6.5**。按类别的结果在 rice paddle、dustpan、bouquet、pitcher、bottle、hammer 和 brush 等物体上显示出优势，但多个物体仍存在失败。

这仍然是以抓取和抬起为主的测试。它说明功能性接触选择可以迁移到真实灵巧手，但尚未证明模型能闭环完成倒水、刷洗或切割等完整动作。

## 6. 论文留下的问题

模型依赖视觉语言表示和视角覆盖，部件 grounding 出错仍会影响最终手姿。当前策略生成的是 open-loop action，并只使用轻量的执行时筛选，没有触觉反馈和闭环修正。OpenDex-Align 相对于家庭工具和长时序任务的多样性，规模也仍然有限。

我的主要收获是：task-oriented dexterous grasping 可以把 **语义-几何覆盖** 与 **具身功能对齐** 分开构建，再在同一个动作表示中结合。最有说服力的证据来自 unseen-category 仿真、直接生成消融和真实灵巧手迁移。下一步更值得测试的是带触觉反馈的闭环执行，把评价标准从“能否拿住”推进到“能否完成指令中的用途”。

</div>
