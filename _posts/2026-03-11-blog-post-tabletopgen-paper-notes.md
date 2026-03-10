---
title: "[Paper Notes] TabletopGen: Instance-Level Interactive 3D Tabletop Scene Generation from Text or Single Image"
date: 2026-03-11
permalink: /posts/2026/03/tabletopgen-paper-notes/
tags:
  - 3D Scene Generation
  - Embodied AI
  - Tabletop Scenes
  - Single-Image Reconstruction
  - Vision-Language Models
  - Simulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**TabletopGen** is a training-free pipeline for generating **instance-level, simulation-ready 3D tabletop scenes** from either text or a single image.

Its core idea is to avoid generating a whole tabletop scene monolithically. Instead, it:

- turns text into a reference image when needed
- segments and completes each object instance separately
- reconstructs each instance into a 3D asset
- solves layout recovery with a two-stage alignment module:
  - **DRO** for object rotation
  - **TSA** for translation and metric scale

This decomposition is what makes the method strong: it preserves object count and style better than retrieval-heavy or whole-scene reconstruction baselines, and it sharply reduces object collisions in dense tabletop layouts.

## Paper Info

- **Title**: TabletopGen: Instance-Level Interactive 3D Tabletop Scene Generation from Text or Single Image
- **Authors**: Ziqian Wang, Yonghao He, Licheng Yang, Wei Zou, Hongxuan Ma, Liu Liu, Wei Sui, Yuxin Guo, Hu Su
- **Affiliations**: University of Chinese Academy of Sciences, D-Robotics, Institute of Automation CAS, Horizon Robotics
- **arXiv**: [2512.01204](https://arxiv.org/abs/2512.01204)
- **Project page**: [d-robotics-ai-lab.github.io/TabletopGen.project](https://d-robotics-ai-lab.github.io/TabletopGen.project/)
- **Paper type**: 3D scene generation / embodied AI / simulation pipeline

## 1. Problem Setting and Motivation

The paper focuses on a very practical gap in embodied AI: **most existing 3D scene generation systems are not well suited for dense tabletop manipulation scenes**.

The authors argue that a useful tabletop scene for robotic simulation should satisfy three conditions:

- each object should be an **independent, geometrically complete 3D instance**
- the arrangement should be **functionally meaningful**, not random
- the final scene should be **physically plausible**, especially collision-free

This is harder than generic room-scale scene generation because tabletops contain:

- many small objects packed into a limited area
- frequent occlusion in a single image
- fine-grained spatial relations that matter for manipulation

The paper’s critique of prior work is straightforward:

- **retrieval-based methods** are limited by fixed asset libraries
- **text-to-3D scene planning methods** are better at coarse layouts than dense small-object tabletop reasoning
- **single-image 3D scene reconstruction methods** struggle with occlusion, incomplete instances, pose errors, and interpenetration

## 2. Core Idea

TabletopGen uses a unified pipeline for both **text input** and **single-image input**.

- If the input is text, an LLM first expands it into a detailed prompt, then a text-to-image model generates a realistic reference image.
- If the input is already an image, that image is used directly.

From there, the framework runs four stages:

1. **Instance Extraction**
2. **Canonical 3D Model Generation**
3. **Pose and Scale Alignment**
4. **3D Scene Assembly**

The most important design choice is the **instance-first decomposition**: rather than reconstructing the whole scene jointly, the method reconstructs each object separately and only then solves the layout.

## 3. Method Breakdown

### 3.1 Instance extraction from the reference image

The pipeline first uses an MLLM to infer open-vocabulary object categories in the scene. It then applies GroundedSAM-v2 to get per-instance masks.

Because tabletop scenes are heavily occluded and object boundaries are often incomplete, the paper does **not** rely on ordinary inpainting. Instead, it uses a multimodal generative completion model that redraws each segmented object into a clearer, high-resolution instance image.

That step matters because downstream 3D generation quality depends heavily on whether each instance is visually complete.

### 3.2 Per-instance canonical 3D reconstruction

Each completed object image is passed to an image-to-3D diffusion model to produce a 3D mesh.

These per-instance meshes initially live in arbitrary local coordinates, so the method performs **canonical coordinate alignment**. An MLLM reasons about upright orientation using both visual evidence and semantic priors, then rotates each model so it is properly aligned with the tabletop world frame.

This is an important practical benefit over retrieval pipelines:

- the system is not constrained to a fixed asset database
- appearance and geometry can better match the reference
- object-level editing becomes easier later

### 3.3 DRO: Differentiable Rotation Optimizer

The first half of the layout solver is **DRO**, which estimates each object’s rotation.

The paper renders each candidate object with a differentiable renderer and minimizes a tri-modal matching loss:

`L_rot = λ_s L_sil + λ_e L_edge + λ_a L_app`

where:

- `L_sil` is a soft-IoU silhouette loss
- `L_edge` is a contour-matching loss based on distance transforms
- `L_app` is a DINOv2 perceptual feature loss

This is a strong part of the paper. Instead of asking a VLM to guess object orientation in one shot, the method uses a render-and-optimize loop that directly compares projected 3D geometry against the target instance.

### 3.4 TSA: Top-view Spatial Alignment

After recovering rotation, TabletopGen estimates **translation and scale** with **TSA**.

This addresses the classic single-view ambiguity problem: from one image, absolute placement and metric size are hard to infer reliably.

The pipeline:

- synthesizes a **top-view image** from the front-view reference
- detects top-view 2D boxes for each instance
- queries an MLLM for commonsense physical size priors
- selects a reliable anchor object using the proposed **RMA-Score**

The score is:

`RMA(i) = A_px(i) / (1 + (ε_ratio / τ)^2)`

where larger visible objects with better aspect-ratio consistency are preferred as anchors.

Conceptually, TSA is doing a useful compromise:

- use generative and language models for semantic spatial reasoning
- constrain the final estimate with explicit geometric heuristics

### 3.5 Scene assembly

Once rotation, translation, and scale are estimated, the pipeline imports all instances into **Isaac Sim**, applies transforms, and assigns collision properties through convex decomposition. This converts visually reconstructed objects into a **simulation-ready interactive tabletop scene**.

## 4. Experimental Results

The evaluation covers **78 test samples** with different table shapes and tabletop categories, including office, dining, workbench, and more stylized scenes.

The baselines are:

- **ACDC** (retrieval-based)
- **Gen3DSR**
- **MIDI**

### 4.1 Quantitative gains

TabletopGen reports the best numbers across perceptual, semantic, and physical metrics.

Some headline results from Table 1:

- **LPIPS**: `0.4483` vs `0.4559` for MIDI
- **DINOv2**: `0.8383` vs `0.7070` for MIDI
- **CLIP**: `0.9077` vs `0.8867` for MIDI
- **object collision rate**: `0.42%` vs `17.39%` for MIDI
- **scene collision rate**: `7.69%` vs `98.72%` for MIDI

The collision numbers are the most convincing part of the paper. Many prior methods can produce something visually plausible from the reference view, but collision-free assembly is what actually determines whether a scene is usable for embodied simulation.

### 4.2 GPT and human evaluation

On GPT-4o-based scoring, the method gets the best average score (`6.19`) across visual fidelity, image alignment, and physical plausibility.

The user study with **128 participants** is also strong:

- average human score: **5.56**
- second-best baseline: **3.57**
- overall preference for TabletopGen: **83.13%**

That large margin suggests the gains are not limited to one metric choice.

### 4.3 Ablations

The ablation study is clean and useful because it isolates the two key geometric modules:

- removing **DRO** increases object collision rate from `0.42%` to `1.27%`
- removing **TSA** raises it much more sharply to `5.50%`
- removing both yields severe placement failures and `62.82%` scene-level collision rate

My reading is that **TSA contributes most of the physical plausibility gain**, while **DRO stabilizes orientation quality and improves visual consistency**.

## 5. What I Find Most Interesting

The paper’s strongest contribution is not just another better benchmark score. It is the claim that **tabletop generation should be treated as a compositional geometry-and-reasoning problem**, not only as a big generative modeling problem.

Three aspects stand out:

- **instance-first reconstruction** is a better fit for manipulation scenes than whole-scene synthesis
- **explicit geometric optimization** is still necessary, even in an era of strong multimodal models
- **physical plausibility** is treated as a first-class target instead of an afterthought

This makes the work particularly relevant for simulation data generation, robot benchmarking, and sim-to-real pipelines.

## 6. Strengths

- Clear focus on **tabletop scenes**, which are genuinely important for embodied manipulation.
- Good systems design: each stage solves a specific bottleneck rather than forcing one model to do everything.
- Strong physical-plausibility results, especially collision reduction.
- Useful ablation story showing why the alignment modules matter.
- Supports both **text-to-scene** and **image-to-scene** inputs in one framework.
- Enables modular scene editing because assets are reconstructed per instance.

## 7. Limitations and Open Questions

- The pipeline is **training-free**, but it depends on several powerful external components: text-to-image, multimodal completion, MLLM reasoning, and image-to-3D generation. In practice, this is still a fairly heavyweight system stack.
- The top-view synthesis and commonsense-size reasoning are helpful, but they introduce additional model assumptions that may break on unusual objects or highly nonstandard camera perspectives.
- The evaluation is strong for tabletop scenes, but it is less clear how far the method would extend to cluttered shelves, cabinets, or multi-surface manipulation settings.
- The paper emphasizes collision-free layouts, but long-term usefulness for robotics also depends on object articulation, contact fidelity, and material realism, which are only partially addressed here.
- Because the method uses many proprietary or rapidly evolving foundation models, reproducibility may depend heavily on implementation choices that are not fully visible in the paper.

## 8. Takeaways

My main takeaway is simple: **if you want simulation-ready tabletop scenes, recovering layout explicitly matters at least as much as generating pretty images**.

TabletopGen works because it separates the problem into:

- object completion
- per-instance 3D generation
- explicit pose recovery
- explicit scale and translation recovery
- simulator-based scene assembly

For embodied AI, that decomposition feels more practical than end-to-end scene generation alone. I would view this paper as a strong systems recipe for turning modern multimodal generative models into usable 3D tabletop environments rather than just attractive renderings.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

**TabletopGen** 是一个无需训练的流程，可从文本或单张图片生成**实例级、可直接用于仿真的 3D 桌面场景**。

它的核心思想不是一次性把整张桌面场景整体生成出来，而是把问题拆开：

- 如有需要，先把文本转成参考图像
- 对每个物体实例单独分割与补全
- 将每个实例分别重建为 3D 资产
- 再用两阶段对齐模块恢复布局：
  - **DRO** 负责旋转
  - **TSA** 负责平移和尺度

这种分解式设计是论文最关键的价值所在：相比依赖检索或整场景重建的方法，它更能保留物体数量和风格一致性，也能显著减少密集桌面布局中的碰撞。

## 论文信息

- **标题**: TabletopGen: Instance-Level Interactive 3D Tabletop Scene Generation from Text or Single Image
- **作者**: Ziqian Wang, Yonghao He, Licheng Yang, Wei Zou, Hongxuan Ma, Liu Liu, Wei Sui, Yuxin Guo, Hu Su
- **机构**: 中国科学院大学、D-Robotics、中国科学院自动化研究所、Horizon Robotics
- **arXiv**: [2512.01204](https://arxiv.org/abs/2512.01204)
- **项目主页**: [d-robotics-ai-lab.github.io/TabletopGen.project](https://d-robotics-ai-lab.github.io/TabletopGen.project/)
- **论文类型**: 3D 场景生成 / 具身智能 / 仿真系统

## 1. 问题背景与动机

这篇论文关注具身智能里的一个很实际的空缺：**现有很多 3D 场景生成系统并不适合密集的桌面操作场景**。

作者认为，一个真正适合机器人仿真的桌面场景至少要满足三点：

- 每个物体都应该是**独立且几何完整的 3D 实例**
- 物体布局应该**符合功能语义与常识**
- 最终场景应该**物理合理**，尤其要尽量避免碰撞

这比一般室内大场景更难，因为桌面场景通常具有：

- 很多小物体集中在有限区域
- 单视角下遮挡严重
- 对精细空间关系要求很高，而这些关系会直接影响操作任务

论文对已有方法的批评也很明确：

- **基于检索的方法**受限于固定资产库
- **文本驱动的 3D 场景规划方法**更擅长粗粒度布局，不擅长高密度小物体桌面推理
- **单图像 3D 场景重建方法**常见问题是遮挡下实例不完整、姿态估计错误，以及严重穿插

## 2. 核心思路

TabletopGen 为**文本输入**和**单图输入**提供统一流程。

- 若输入是文本，先由 LLM 扩写成更详细的描述，再由文生图模型生成逼真的参考图像。
- 若输入本身就是图像，则直接作为参考图像使用。

随后整个系统分为四个阶段：

1. **实例提取**
2. **Canonical 3D 模型生成**
3. **姿态与尺度对齐**
4. **3D 场景装配**

其中最重要的设计选择是**先实例、后布局**。也就是说，它不是联合重建整个场景，而是先把每个物体分别重建出来，再解决整体空间关系。

## 3. 方法拆解

### 3.1 从参考图像中提取实例

流程首先使用 MLLM 推断场景中的开放词表物体类别，再用 GroundedSAM-v2 获取每个实例的分割掩码。

由于桌面场景遮挡严重、边界容易残缺，论文没有采用普通 inpainting，而是使用多模态生成补全模型，把每个分割出来的物体重新绘制成更清晰、更高分辨率的实例图像。

这一步很重要，因为后续 3D 生成效果高度依赖实例图像是否足够完整。

### 3.2 面向实例的 canonical 3D 重建

每个补全后的实例图像都会被送入 image-to-3D 扩散模型，生成对应的 3D 网格。

这些网格最初都处于各自任意的局部坐标系中，因此作者又做了一步 **canonical coordinate alignment**。系统利用 MLLM 结合视觉证据与语义常识判断物体的正立方向，再将模型旋转到与桌面世界坐标系一致的姿态。

这一设计相较检索式方法有几个明显优点：

- 不受固定 3D 资产库约束
- 更容易匹配参考图像中的外观与几何细节
- 后续做实例级编辑也更方便

### 3.3 DRO：可微旋转优化器

布局求解的第一部分是 **DRO**，负责估计每个物体的旋转。

论文使用可微渲染器渲染候选旋转下的 3D 物体，并最小化一个三模态匹配损失：

`L_rot = λ_s L_sil + λ_e L_edge + λ_a L_app`

其中：

- `L_sil` 是基于 soft-IoU 的轮廓损失
- `L_edge` 是基于距离变换的边缘匹配损失
- `L_app` 是基于 DINOv2 特征的外观感知损失

我认为这是论文非常扎实的一部分。它没有只让视觉语言模型直接“一步猜姿态”，而是用渲染-优化闭环，把 3D 几何投影结果和目标实例显式对齐。

### 3.4 TSA：俯视图空间对齐

在恢复旋转后，TabletopGen 使用 **TSA** 来估计**平移与尺度**。

这一步主要解决单视角下经典的尺度歧义问题：仅从一张图中，绝对尺寸和准确位置都很难稳健恢复。

TSA 的流程是：

- 先从前视参考图生成一张**俯视图**
- 检测每个实例在俯视图中的 2D 框
- 让 MLLM 提供符合常识的物体物理尺寸先验
- 再用论文提出的 **RMA-Score** 选出可靠的 anchor 物体

评分公式为：

`RMA(i) = A_px(i) / (1 + (ε_ratio / τ)^2)`

直观上，它会优先选择投影面积更大、长宽比与物理尺寸更一致的实例作为尺度锚点。

从方法论上看，TSA 很有代表性：

- 一方面借助生成模型和语言模型做语义层面的空间推理
- 另一方面又用显式几何启发式约束最终布局

### 3.5 场景装配

当旋转、平移和尺度都得到估计后，系统把所有实例导入 **Isaac Sim**，施加对应变换，并通过凸分解为物体赋予碰撞属性。这样生成出的结果就不只是“看起来像”的 3D 桌面，而是**可直接用于交互仿真的桌面场景**。

## 4. 实验结果

实验共使用 **78 个测试样本**，覆盖不同桌子形状与不同功能类别，包括办公桌、餐桌、工作台以及更风格化的桌面场景。

比较基线包括：

- **ACDC**（检索式）
- **Gen3DSR**
- **MIDI**

### 4.1 定量结果

TabletopGen 在感知质量、语义对齐和物理合理性指标上都取得了最佳结果。

Table 1 中几个最值得关注的数字：

- **LPIPS**: `0.4483`，优于 MIDI 的 `0.4559`
- **DINOv2**: `0.8383`，优于 MIDI 的 `0.7070`
- **CLIP**: `0.9077`，优于 MIDI 的 `0.8867`
- **物体级碰撞率**: `0.42%`，而 MIDI 为 `17.39%`
- **场景级碰撞率**: `7.69%`，而 MIDI 为 `98.72%`

我认为最有说服力的是碰撞指标。很多方法从参考视角看起来已经“像那么回事”，但如果无法保证装配后几何关系正确、没有穿插，就很难真正服务于具身仿真。

### 4.2 GPT 评价与用户研究

在基于 GPT-4o 的综合打分中，该方法在视觉保真度、图像对齐和物理合理性上的平均分达到 `6.19`，也是所有方法中最高。

用户研究同样很强，共有 **128 名参与者**：

- 平均人工评分：**5.56**
- 第二名方法仅为：**3.57**
- 整体偏好选择 TabletopGen 的比例：**83.13%**

这说明提升并不只是某个单一指标上的偶然优势。

### 4.3 消融实验

论文的消融设计很有价值，因为它直接验证了两个关键几何模块：

- 去掉 **DRO** 后，物体碰撞率从 `0.42%` 上升到 `1.27%`
- 去掉 **TSA** 后，物体碰撞率显著上升到 `5.50%`
- 两者都去掉时，场景级碰撞率达到 `62.82%`

我的理解是：**TSA 对物理合理性的贡献更大**，而 **DRO 更偏向于稳定朝向恢复与视觉一致性**。

## 5. 我觉得最有意思的点

这篇论文最有价值的地方，并不只是又刷新了一组指标，而是它提出了一个很清晰的观点：**桌面场景生成本质上应该被视为“组合式几何恢复 + 语义推理”的问题，而不仅仅是大模型生成问题。**

我认为最值得注意的三点是：

- **先实例、后布局**比整场景一次性生成更适合操作型桌面场景
- 即便多模态模型很强，**显式几何优化**仍然不可替代
- 论文把**物理合理性**当作一等目标，而不是最后补救的附属项

这使它对仿真数据生成、机器人 benchmark，以及 sim-to-real 工作流都很有参考价值。

## 6. 优点

- 选题很聚焦：**桌面场景**确实是具身操作里的关键场景。
- 系统设计清晰，每个模块都对应一个明确瓶颈。
- 物理合理性结果非常强，尤其是碰撞率显著下降。
- 消融实验很完整，能说明对齐模块为什么必要。
- 同时支持 **text-to-scene** 和 **image-to-scene**。
- 因为是实例级重建，所以天然支持模块化场景编辑。

## 7. 局限与开放问题

- 虽然论文强调 **training-free**，但整个系统依赖多个强大的外部组件：文生图、多模态补全、MLLM 推理、image-to-3D 等，整体仍然是一个相当重的系统栈。
- 俯视图生成和常识尺寸推理虽然有效，但也引入了额外的模型假设；面对非常规物体或特殊视角时，鲁棒性仍有疑问。
- 论文在桌面场景上表现很强，但是否能自然扩展到货架、柜体、多层工作台等更复杂操作空间，还不够明确。
- 对机器人仿真而言，除碰撞之外，物体可动性、接触 fidelity、材质属性等也同样重要，而论文在这些方面着墨较少。
- 由于方法依赖多个可能带有闭源属性、且演进很快的基础模型，复现效果可能会高度依赖具体实现细节。

## 8. 总结

我的核心结论很简单：**如果目标是真正可用于仿真的桌面场景，那么显式恢复布局的重要性，至少不亚于生成高质量图像本身。**

TabletopGen 之所以有效，是因为它把问题拆成了：

- 物体补全
- 实例级 3D 生成
- 显式姿态恢复
- 显式尺度和平移恢复
- 基于仿真器的场景装配

对于具身智能来说，这种分解式系统路线比纯端到端整场景生成更务实。我会把这篇论文看作一种很强的系统配方：它展示了如何把现代多模态生成模型真正转化为可用的 3D 桌面环境，而不只是视觉上好看的渲染结果。

</div>
