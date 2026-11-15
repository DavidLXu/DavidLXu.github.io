---
title: "[Paper Notes] 3DSceneBench: Can Coding Agents Build Functional and Versatile 3D Worlds?"
date: 2026-11-16
permalink: /posts/2026/11/3dscenebench-paper-notes/
excerpt: "3DSceneBench evaluates code-built rooms through geometry and physical tests, checking whether one submitted world supports multiple object uses and multistage tasks."
tags:
  - Paper Notes
  - Scene Reconstruction
  - Simulation
  - Coding Agents
  - Embodied AI
  - Benchmark
---

<div data-lang="en" markdown="1">

## TL;DR

A cabinet can contain convincing-looking cups that are fused into its mesh. A drawer can open to exactly the distance specified in its code while still having the wrong travel range. **3DSceneBench** tests such failures by applying physical actions to a submitted room and comparing the outcomes with a reference simulation. Every test uses the same constructed world, so its objects must support multiple uses without being rebuilt for each task.

Across 49 rooms, the highest appearance score is **79.3**, the highest geometry score **62.1**, and the highest functionality score **42.1**, achieved by different configurations. Complete tasks are harder: the best full-task completion rate is **28.6%**. The most useful finding is where functionality disappears: missing objects account for roughly half the lost points of two leading agents, and objects that support one use often fail another. [Paper, Sections 4–5](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## Paper and release status

**3DSceneBench: Can Coding Agents Build Functional and Versatile 3D Worlds?** Authors: Yani Zhang, Xinyu Wang, Hanwei Wu, Jindu Wang, Siyuan Luo, Jason Pho, Zonglin Di, Yiyou Sun, and Yi Zhu; affiliations are Prana Labs and UC Berkeley. These notes use the 11-page PDF linked from the project, checked November 16, 2026. The linked materials do not identify a conference or journal venue. [Project](https://pranalabs.github.io/3DSceneBench/) · [PDF](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf) · [Code](https://github.com/PranaLabs/3DSceneBench)

The full study contains **14,219 objects, 471 public tasks, and 36,871 tests** across seven scene categories. The public release announced on November 13 is **3DSceneBench-mini**, with seven complete rooms, one per category, including their reference worlds for local scoring. The remaining 42 rooms are listed as coming soon. Public availability and the scope of the reported experiments therefore differ. [Repository release status](https://github.com/PranaLabs/3DSceneBench#news)

## What is fixed when the agent builds a room?

In the primary **L0** setting, the agent receives eight main images and up to sixteen detail views rendered from the reference world, with camera poses and intrinsics. It also receives public task descriptions and descriptions of object-test families. The reference world, hidden tasks, evaluation cameras, mass, and friction remain unavailable. **L1** adds an inventory, object dimensions, joint travel, depth maps, and room-specific test descriptions for diagnostic experiments.

The agent writes and revises a MuJoCo scene with assets, using rendering, simulation, and measurement tools. The shared budget ends at **180 minutes or ten million output tokens including reasoning**, whichever comes first. Construction runs in an isolated container without a GPU or network access beyond the model API. Supported fluids, soft bodies, and cloth are evaluated in Genesis; the repository specifies a supplementary `nonrigid.json` for such scenes. This is a benchmark of constructing executable environments, with no new learned scene generator or training objective proposed. [Section 3.2](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf) · [Submission format](https://github.com/PranaLabs/3DSceneBench#the-world)

At grading time, objects are matched one-to-one by category, position, and size. An unmatched target fails its test. Fixed forces, motions, or scripted controllers act in both worlds; task controllers can use privileged object poses, including through a simulated mobile manipulator. Each object probe resets to the initial state. Within a multistage task, state carries forward, so a bad intermediate outcome can prevent later stages from succeeding.

The reference worlds require substantial authoring. A planner–builder–critic loop operates under human guidance, followed by independent review from three experts. Candidate tests must tolerate modest position and plausible mass/friction changes in the reference. Custom task checks must also reject deliberately broken reference variants, and submitting the reference itself must score 100 within numerical tolerance. These checks make the target reproducible, although the authored simulator remains the source of truth. [Section 3.1](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## How the score captures several uses of one object

Appearance **A** averages SigLIP-2 and DINOv3 similarities after rescaling against an empty room shell and an identical render. LPIPS is also measured. Geometry **G** averages five components: inventory, shape, pose and size, spatial relations, and placement. Missing reference objects remain in the denominators.

Functionality **F** gives equal weight to four levels:

| Level | What the world must support |
|---|---|
| Balance | Settling, limited drift, valid physical configuration, and edge support |
| Response | Appropriate reactions to pushing, tilting, pressing, and other applied actions |
| Affordance | Joint motion, containment, grasping, and carrying contents |
| Interaction | Sequential task stages under fixed executors |

Using normalized component scores, the aggregation can be written as

$$
F=\frac{100}{4}(B+R+H+I),\qquad
I=\frac{\sum_t k_t}{\sum_t n_t},
$$

where $H$ denotes affordance, $n_t$ is the number of stages in task $t$, and $k_t$ counts successful stages before its first failure. A four-stage task failing at stage three contributes two completed stages. The separately reported **Full** metric is the fraction of tasks that finish every stage; it is excluded from the aggregate score. Most object tests are binary, with partial credit for some tests such as deformable-object checks.

This distinction prevents a common misreading: **F = 42.1 is an average of four component scores, not a 42.1% complete-task success rate**. Fixing movable objects to the room cannot secure a high score, because the balance checks include whether they are free bodies, and subsequent actions must actually move them. Paper Table 2 ranks by F; Figure 1 uses the mean of G and F for its score-versus-token plot. [Section 3.3 and Figure 1](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## Results under the reported construction budget

The study evaluates ten models in twelve configurations, each building every room three times: **1,764 builds**. Scores average the three builds within a scene and then the 49 scenes. Claude uses Claude Code, GPT uses Codex, and the other models use OpenCode, so the comparison includes the coding harness as well as the underlying model.

| Configuration | A | G | F | Full (%) | Minutes/build | USD/build |
|---|---:|---:|---:|---:|---:|---:|
| Claude Opus 5.5, high | 69.5 | 58.1 | 42.1 | 26.6 | 86 | 14 |
| Claude Opus 5.5, max | 70.5 | 57.7 | 42.1 | 28.6 | 123 | 24 |
| Gemini 4.0 Argon, high | 66.7 | 62.1 | 42.0 | 24.6 | 116 | 9.9 |
| GPT-6 Astra, max | 79.3 | 58.0 | 41.1 | 23.5 | 126 | 50 |
| GPT-6 Astra, high | 75.6 | 55.7 | 39.6 | 24.2 | 96 | 36 |
| Kimi K3.1 Pro, high | 55.3 | 35.0 | 20.9 | 12.3 | 91 | 5.5 |

These are selected rows from **Table 2**, with historical costs under the paper's setup. More reasoning adds little functionality: Opus remains at 42.1 while mean build time grows by 37 minutes; Astra gains 1.5 points with 30 additional minutes. The top functionality scores are close enough that the failure analysis is more informative than their ordering. [Table 2 and Section 4.3](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## Why successful local checks leave an unusable room

For Opus and Astra at high effort, **52% and 49% of lost F points** come from tests whose targets are missing or unmatched. About two thirds of that loss concerns objects omitted or merged into other meshes. The public task list also biases coverage: tests on task-mentioned objects have no match in 7–10% of cases, compared with 36–38% for other objects in the same rooms.

The drawer example exposes a second problem. An agent can set a joint limit, simulate opening, and verify that the drawer reaches that limit. The check succeeds even if the assigned limit disagrees with the image evidence. In the joint checks inspected by the authors, neither Opus nor Astra derives the expected value from the input images or task descriptions. A construction can therefore pass its own checks while preserving an incorrect assumption. [Section 5.1](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

Among matched objects tested for at least two uses, only **22% for Opus and 17% for Astra** pass every tested use. Holding contents is comparatively easy; moving, grasping, and articulating the same object impose additional constraints. In six diagnostic worlds, replacing only mass and friction with reference values raises mean F from **45.3 to 51.7**. Push pass rates rise from 67% to 86%, and grasp rates from 44% to 84%, while joint pass rates remain near 10%. Those six worlds support a specific diagnosis: better physical parameters help, but joint axes, travel, clearance, and damping still need attention. [Section 5.2](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

L1 specifications also help: on the rooms used for that comparison, Opus rises from **50.5 to 64.3**, and Astra from **46.2 to 59.3**. These baselines belong to the diagnostic comparison and should not replace the full-benchmark numbers. Extra observations alone are less convincing: a walkthrough-video experiment on five rooms changes Opus from 43.9 to 44.5. [Section 5.3](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## What I would use this benchmark for

I would use 3DSceneBench to evaluate whether an automated environment-building pipeline preserves independently manipulable objects and their supported uses. Its strongest design choice is testing several interactions against a single submitted artifact. For improving a builder, the results suggest keeping an inventory tied to the observations and deriving expected behavior from external evidence before trusting self-written checks. That is a practical inference from the diagnostics, not an intervention the paper has validated.

The score measures correspondence to a simulated reference under fixed executors. Transfer to real rooms and learned robot policies remains unvalidated. Likewise, the comparison with four specialized scene methods covers one workshop and one run per method, with different native input modalities; it offers useful failure examples but limited evidence for a broad ranking. Mini is a reasonable development set: its F differs from the full benchmark by at most 1.5 points across six tested configurations, though that agreement still needs checking for new approaches. [Sections 5.3–6](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

## 核心概括

橱柜里的杯子可以看起来很逼真，却与柜体合并在同一张网格中；抽屉可以准确滑到代码设定的位置，却仍然具有错误的行程。**3DSceneBench** 通过向生成的房间施加物理动作，并与参考仿真的结果比较，检验这些问题。所有测试使用同一个已提交的世界，因此物体必须在无需按任务重建的条件下支持多种用途。

在 49 个房间上，不同配置分别取得最高 **79.3 的外观分数、62.1 的几何分数和 42.1 的功能分数**；完整任务完成率最高只有 **28.6%**。更值得关注的是功能丢失的位置：两个领先智能体约一半的失分来自缺失物体，而已经支持某种用途的物体，也经常无法支持另一种用途。[论文第 4–5 节](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## 论文与发布状态

论文题为 **3DSceneBench: Can Coding Agents Build Functional and Versatile 3D Worlds?**，作者为 Yani Zhang、Xinyu Wang、Hanwei Wu、Jindu Wang、Siyuan Luo、Jason Pho、Zonglin Di、Yiyou Sun 和 Yi Zhu，机构为 Prana Labs 与 UC Berkeley。本文依据项目链接的 11 页 PDF，核对日期为 2026 年 11 月 16 日；所链接材料未注明会议或期刊。[项目主页](https://pranalabs.github.io/3DSceneBench/) · [PDF](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf) · [代码](https://github.com/PranaLabs/3DSceneBench)

完整研究包含七类场景，共 **14,219 个物体、471 项公开任务和 36,871 项测试**。11 月 13 日公布的 **3DSceneBench-mini** 提供七个完整房间，每类一个，并附参考世界，支持本地评分。其余 42 个房间仍标为即将发布。因此，论文实验规模与当前公开资源范围需要分别理解。[仓库发布说明](https://github.com/PranaLabs/3DSceneBench#news)

## 智能体建造房间时，哪些条件已经固定？

主设置 **L0** 提供参考世界渲染的八张主要视图，以及最多十六张细节视图，附相机位姿和内参。智能体还会获得公开任务描述与物体测试类别说明，但看不到参考世界、隐藏任务、评测相机、质量和摩擦参数。用于诊断的 **L1** 额外提供物体清单、尺寸、关节行程、深度图和房间专属测试说明。

智能体通过渲染、仿真和测量工具反复修改 MuJoCo 场景及其资产。统一预算为 **180 分钟或一千万个输出 token（包含推理）**，先耗尽者结束运行。构建容器没有 GPU，除模型 API 外无法联网。支持的流体、软体和布料行为由 Genesis 评测；仓库要求此类场景额外提交 `nonrigid.json`。论文提出的是可执行环境构建基准，没有提出新的场景生成网络或训练目标。[第 3.2 节](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf) · [提交格式](https://github.com/PranaLabs/3DSceneBench#the-world)

评分时，系统根据类别、位置和尺寸，将生成物体与参考物体一对一匹配。目标未匹配，测试就失败。固定的力、运动或脚本控制器在两个世界中执行相同测试；任务控制器可使用物体真实位姿，并可通过仿真移动操作机器人执行动作。单个物体探测从初始状态重置，多阶段任务则继承前一阶段的状态，因此中途错误会影响后续阶段。

参考世界本身需要大量制作工作。规划、构建和审查智能体在人类指导下迭代，再由三名专家独立检查。候选测试必须容忍参考世界中的轻微位置扰动及合理范围内的质量、摩擦变化；定制任务检查还必须拒绝故意破坏的参考版本。参考世界作为提交输入时，需要在数值容差内取得 100 分。这些步骤保证目标可重复检验，但评测真值仍然来自人工构建的仿真。[第 3.1 节](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## 分数如何反映同一物体的多种用途

外观 **A** 将 SigLIP-2 和 DINOv3 相似度按空房间外壳与完全相同渲染的基准重新缩放，再取平均；LPIPS 也会测量。几何 **G** 平均五项分数：物体清单、形状、位姿与尺寸、空间关系、放置情况。缺失的参考物体仍保留在分母中。

功能 **F** 对四个层级等权平均：

| 层级 | 世界需要支持的行为 |
|---|---|
| Balance（平衡） | 稳定落定、有限漂移、有效物理配置及边缘支撑 |
| Response（响应） | 对推动、倾斜、按压等外部动作作出合理响应 |
| Affordance（可供性） | 关节运动、容纳、抓取以及携带容器内物品 |
| Interaction（交互） | 在固定执行器下连续完成任务阶段 |

将各项归一化到 0–1 后，可以把评分写成：

$$
F=\frac{100}{4}(B+R+H+I),\qquad
I=\frac{\sum_t k_t}{\sum_t n_t},
$$

其中 $H$ 表示可供性，$n_t$ 是任务 $t$ 的阶段数，$k_t$ 是首次失败前完成的阶段数。四阶段任务若在第三阶段失败，就计入两个已完成阶段。单独报告的 **Full** 表示全部阶段均完成的任务占比，不参与总分计算。大部分物体测试采用通过或失败的二值计分，部分可变形物体测试允许部分得分。

因此，**F = 42.1 表示四类功能分数的平均值，不能解释成完整任务成功率为 42.1%**。将可移动物体固定在房间里也无法获得高分：平衡检查包含物体是否为自由刚体，后续测试还要求它们真正移动。论文表 2 按 F 排序；图 1 的分数与 token 开销图则使用 G 和 F 的均值。[第 3.3 节与图 1](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## 指定构建预算下的结果

实验覆盖十个模型、十二种配置，每种配置对每个房间构建三次，共 **1,764 次构建**。先平均同一房间的三次结果，再平均 49 个房间。Claude 使用 Claude Code，GPT 使用 Codex，其余模型使用 OpenCode，因此比较包含模型和代码智能体运行框架两方面的影响。

| 配置 | A | G | F | Full（%） | 分钟/次 | 美元/次 |
|---|---:|---:|---:|---:|---:|---:|
| Claude Opus 5.5，high | 69.5 | 58.1 | 42.1 | 26.6 | 86 | 14 |
| Claude Opus 5.5，max | 70.5 | 57.7 | 42.1 | 28.6 | 123 | 24 |
| Gemini 4.0 Argon，high | 66.7 | 62.1 | 42.0 | 24.6 | 116 | 9.9 |
| GPT-6 Astra，max | 79.3 | 58.0 | 41.1 | 23.5 | 126 | 50 |
| GPT-6 Astra，high | 75.6 | 55.7 | 39.6 | 24.2 | 96 | 36 |
| Kimi K3.1 Pro，high | 55.3 | 35.0 | 20.9 | 12.3 | 91 | 5.5 |

以上摘自**表 2**，费用为论文设置下的历史开销。增加推理强度带来的功能收益有限：Opus 平均多花 37 分钟，F 仍为 42.1；Astra 多花 30 分钟，提升 1.5 分。领先配置的功能分数十分接近，相比名次，失败分析提供了更多可用信息。[表 2 与第 4.3 节](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## 为什么局部检查通过，房间仍然不好用

在 high 设置下，Opus 和 Astra 分别有 **52% 和 49% 的功能失分**来自目标缺失或未匹配的测试。其中约三分之二对应完全漏建或被并入其他网格的物体。公开任务清单还影响了覆盖范围：任务提及物体的测试中，7–10% 找不到匹配目标；同一房间里其他物体的这一比例为 36–38%。

抽屉案例暴露了另一类问题。智能体先设定关节行程，再仿真打开抽屉，验证它能否抵达这个位置。即便设定与图像证据不符，检查也会成功。在作者检查过的关节自测中，Opus 和 Astra 都没有从输入图像或任务描述推导期望值。于是，生成世界可以通过自己的检查，同时保留原来的错误假设。[第 5.1 节](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

对于已经匹配、且接受至少两种用途测试的物体，Opus 只有 **22%**、Astra 只有 **17%** 能通过全部用途。容纳物品相对容易；移动、抓取以及关节运动还需要满足其他条件。在六个诊断世界中，仅将质量和摩擦替换为参考值，就使平均 F 从 **45.3 提高到 51.7**，推动通过率从 67% 升至 86%，抓取从 44% 升至 84%，关节通过率却仍约为 10%。这六个世界支持一个具体判断：物理参数校准有效，但关节轴、行程、运动间隙和阻尼仍需单独处理。[第 5.2 节](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

L1 提供的规格信息也有帮助：在该对照所用房间上，Opus 从 **50.5 提升到 64.3**，Astra 从 **46.2 提升到 59.3**。这些是诊断实验自己的基线，不能替换完整基准的分数。单纯增加观察信息的证据则较弱：五个房间的漫游视频实验，只让 Opus 从 43.9 变为 44.5。[第 5.3 节](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

## 我会怎样使用这个基准

我会用 3DSceneBench 检验自动环境构建流程是否保留了可独立操作的物体，以及它们应当支持的用途。它最有价值的设计，是对同一份提交产物执行多种交互。改进构建智能体时，这些结果提示我们维护一份与观察证据对应的物体清单，并先从外部证据建立预期行为，再信任自己编写的检查。这是从诊断结果得到的实践推断，论文尚未验证这一改进方案。

该分数衡量固定执行器下生成世界与参考仿真的一致程度，向真实房间和学习式机器人策略的迁移仍待验证。与四种专用场景方法的比较，也仅覆盖一个维修车间、每种方法一次运行，输入模态各不相同；它提供了有用的失败案例，对普遍排名的支持有限。Mini 适合开发迭代：在六种已测配置上，其 F 与完整基准最多相差 1.5 分，但新方法是否仍保持这种一致性，需要重新检查。[第 5.3–6 节](https://github.com/PranaLabs/3DSceneBench/blob/main/paper/3DSceneBench.pdf)

</div>
