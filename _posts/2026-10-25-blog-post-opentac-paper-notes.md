---
title: "[Paper Notes] OpenTac: An Open Ecosystem for Customizable, Scalable, and Transferable 3D Tactile Sensing"
date: 2026-10-25
permalink: /posts/2026/10/opentac-paper-notes/
excerpt: "OpenTac turns pressure differences into shear sensing and connects sensor CAD, simulation, calibrated transfer, and adaptive acquisition through a shared manifest."
tags:
  - Tactile Sensing
  - Robot Hardware
  - Contact-Rich Manipulation
  - Paper Notes
---

<div id="opentac-en" data-lang="en" markdown="1">

## TL;DR

OpenTac combines customizable tactile hardware with tools for design, simulation, cross-sensor mapping, and adaptive readout. Its sensing mechanism places soft bumps over groups of piezoresistive taxels: normal force changes their common response, while shear tilts the bump and creates a spatial difference.

The robot experiments show why shear can be useful for insertion. On SO-101 plug insertion, the three-axis sensor's tactile policy reaches **70% success**, compared with **54%** for its own proprioception-only baseline. The broader contribution is a shared sensor description that connects fabrication geometry to the software consuming its measurements.

## Paper and reading version

**OpenTac: An Open Ecosystem for Customizable, Scalable, and Transferable 3D Tactile Sensing** — Ariel Slepyan, Geeta Chandra Raju Bethala, Jiafeng Gu, Anagha Rajendra Dangle, Yinzhe Zhou, Hongyuan Fu, Jade Sim, Tuhin Basu, Xinyi Yin, Md Faizal Karim, Gregory Hager, Homanga Bharadhwaj, Anand Bhattad, Krishna Murthy Jatavallabhula, Nitish V. Thakor. These notes follow [arXiv:2610.31661v1](https://arxiv.org/abs/2610.31661v1), an arXiv preprint, checked on October 25, 2026. [PDF](https://arxiv.org/pdf/2610.31661v1) · [Project](https://opentac.github.io/)

These notes follow Sections 3–5. The [official repository](https://github.com/opentac/opentac) contains the hardware and software ecosystem.

## A mechanical layer makes shear visible to a resistive array

The sensor stack contains a flexible PCB with interdigitated electrodes, a piezoresistive film, and a deformable bump cover. Applied pressure changes the local resistance. Each bump can cover a $2\times2$ group of taxels.

Let $z_{uv}$ be the baseline-subtracted readings, with $u,v\in\{-1,+1\}$ identifying positions relative to the bump center. The raw three-axis signals are

$$
h_z=\sum_{u,v}z_{uv},\qquad
h_x=\sum_{u,v}u z_{uv},\qquad
h_y=\sum_{u,v}v z_{uv}.
$$

A normal load produces a roughly common response. Tangential loading tilts the bump, redistributing pressure across the group. The sums and differences expose that change; an optional affine calibration maps the signals into force units.

This design also changes contact mechanics. Adding a bump cover affects friction and grasp geometry, so a better policy with bumps cannot automatically be attributed entirely to extra information. The paper addresses this partly by training a separate proprioception-only baseline for each hardware configuration.

## One manifest connects fabrication and interpretation

OpenTac-CAD accepts drawn outlines, DXF geometry, or selected surfaces of an STL mesh. A language-model route can propose a 2-D outline from text. The compiler then determines taxel placement and routes row/column connections under geometric clearance rules, producing fabrication files and a sensor manifest.

The manifest records physical taxel centers, scan indices, footprints, boundaries, connector mappings, and bump groups. This matters because electrical scan order need not match spatial order on an irregular skin. A downstream model should receive measurements associated with physical locations, not assume that adjacent array entries are adjacent on the robot.

The paper reports **31 fabricated sensor designs**. The geometry pipeline supports developable surfaces that flatten into patches. Doubly curved selections that cannot be flattened are detected; the flexible PCB itself is not stretchable.

OpenTac-Sim reads the same description. Bumped skins use a linear-elastic FEM model; smooth normal-pressure skins use a reduced foam-contact model. The current release supports stable contact with rigid objects. Its signals remain modeled deformation responses, with calibration needed to relate them to the real sensor.

## Transfer preserves contact geometry under explicit assumptions

OpenTac-Transfer maps calibrated normal-contact fields between sensor designs. Given source cells $A_i$, target cells $B_j$, alignment $T$, and source calibration $C_s$,

$$
M_{ji}=\frac{|T(A_i)\cap B_j|}{|A_i|},
\qquad
\hat F_j=\sum_i M_{ji}C_s(s_i).
$$

The inverse target calibration converts predicted target force into readout values, with its noise floor and saturation. Total force is conserved when the target covers the source contact.

This requires known contact alignment and sensor calibration. The transfer experiments use four smooth skins and evaluate normal-contact shape. They do not establish automatic three-axis transfer, absolute-force accuracy, or successful transfer of a learned control policy across embodiments.

## Shear helps distinguish contact states that normal load merges

The SO-101 experiments train ACT policies on 100 demonstrations per condition and evaluate 50 trials. Inputs are joint angles with or without tactile signals; vision is absent.

| SO-101 task and hardware | Proprioception only | With tactile input |
|---|---:|---:|
| Peg-in-hole, FlexiTac | 50% | 58% |
| Peg-in-hole, OpenTac-1D | 52% | 60% |
| Peg-in-hole, OpenTac-3D | 66% | 82% |
| Plug insertion, OpenTac-3D | 54% | 70% |

On plug insertion, neither normal-only tactile policy improves on its corresponding proprioception baseline. Normal pressure can indicate contact while leaving uncertainty about whether the plug is aligned with the socket or pressing against its surroundings. Shear provides additional directional evidence.

The YAM key-in-lock experiment shows the same qualitative preference for three-axis sensing. Its text reports 25 trials alongside percentages that do not all correspond to integer counts at that sample size. I would verify the underlying counts before using those values in a statistical comparison.

## Faster readout trades away a complete spatial snapshot

On a 1,024-taxel skin, full raster scanning reaches 67 frames per second. Adaptive sampling with **16 taxels per update** reaches **1,286 updates per second**, a 19.2× increase. It allocates a quarter of the sampling budget to searching the sensor and the rest to previously active regions.

Those updates are partial readouts, not complete 1,024-taxel images at 1.286 kHz. Sparse, localized contact is the favorable case; broad contact needs a larger budget. The impact experiment shows the benefit for short events, but it does not remove the spatial sampling tradeoff.

The authors report hysteresis, drift, and temperature dependence, with readings settling after roughly two hours in a ten-hour endurance experiment. My priority for using OpenTac would be to keep geometry and calibration in the dataset metadata, then test shear's benefit against the same hardware without tactile input. That comparison distinguishes sensing value from the mechanical changes introduced by the sensor cover.

</div>

<div id="opentac-zh" data-lang="zh" markdown="1" style="display: none;">

## TL;DR

OpenTac 将可定制触觉硬件与设计、仿真、跨传感器映射、自适应读取工具放在同一套系统中。其传感机制是在压阻式 taxel 上方增加柔软凸点：法向力改变共同响应，切向力使凸点倾斜，形成空间差分。

机器人实验说明了剪切感知对插入任务的价值。SO-101 插头插入中，三轴传感器的触觉策略达到 **70% 成功率**，同一硬件对应的仅本体感知基线为 **54%**。更广泛的贡献是共享传感器描述，使加工几何与读取、解释传感数据的软件保持一致。

## 论文与阅读版本

**OpenTac: An Open Ecosystem for Customizable, Scalable, and Transferable 3D Tactile Sensing**，作者：Ariel Slepyan, Geeta Chandra Raju Bethala, Jiafeng Gu, Anagha Rajendra Dangle, Yinzhe Zhou, Hongyuan Fu, Jade Sim, Tuhin Basu, Xinyi Yin, Md Faizal Karim, Gregory Hager, Homanga Bharadhwaj, Anand Bhattad, Krishna Murthy Jatavallabhula, Nitish V. Thakor。本文依据 [arXiv:2610.31661v1](https://arxiv.org/abs/2610.31661v1) 预印本，原文核验日期为 2026 年 10 月 25 日。[PDF 全文](https://arxiv.org/pdf/2610.31661v1) · [项目主页](https://opentac.github.io/)

本文依据第 3–5 节，[官方仓库](https://github.com/opentac/opentac)提供硬件与软件。

## 通过机械结构，让电阻阵列感知剪切

传感器由带交指电极的柔性 PCB、压阻薄膜和可形变凸点盖层构成。压力改变局部电阻，一个凸点可覆盖 $2\times2$ 个 taxel。

设去除基线后的读数为 $z_{uv}$，$u,v\in\{-1,+1\}$ 表示相对凸点中心的位置，则原始三轴信号为：

$$
h_z=\sum_{u,v}z_{uv},\qquad
h_x=\sum_{u,v}u z_{uv},\qquad
h_y=\sum_{u,v}v z_{uv}.
$$

法向载荷使四个区域产生近似共同响应；切向载荷使凸点倾斜，压力在区域之间重新分配。求和与差分提取这些变化，再通过可选的仿射标定转换成力单位。

盖层也会改变接触力学。凸点影响摩擦和抓持几何，因此采用凸点后的性能提升不能全部归因于额外感知信息。论文为每种硬件配置分别训练仅本体感知基线，部分控制这一混杂因素。

## 用同一个 manifest 连接加工与数据解释

OpenTac-CAD 接受手绘轮廓、DXF 几何，或 STL 网格上选定的表面；也可以通过语言模型根据文本生成二维轮廓。编译器随后在几何间距约束下确定 taxel 排布与行列布线，输出加工文件和传感器 manifest。

Manifest 记录 taxel 的物理中心、扫描索引、轮廓、边界、连接器映射及凸点分组。不规则皮肤的电气扫描顺序未必对应空间顺序，下游处理应根据物理位置理解数据，而不能假设数组相邻元素就在机器人表面相邻。

论文报告了 **31 种已加工的传感器设计**。几何流程支持能够展开成平面片的可展曲面；不可无畸变展开的双曲率选区会被检测出来。柔性 PCB 可以弯曲，但不能拉伸。

OpenTac-Sim 读取同一份描述：凸点皮肤采用线弹性 FEM，平滑法向压力皮肤采用简化泡沫接触模型。当前版本稳定支持与刚性物体接触；仿真信号仍是模型化的形变响应，需要标定才能对应真实传感器。

## 跨传感器映射依赖明确的几何假设

OpenTac-Transfer 在不同设计间映射经过标定的法向接触场。给定源单元 $A_i$、目标单元 $B_j$、对齐变换 $T$ 和源标定 $C_s$：

$$
M_{ji}=\frac{|T(A_i)\cap B_j|}{|A_i|},
\qquad
\hat F_j=\sum_i M_{ji}C_s(s_i).
$$

再用目标传感器的逆标定转换成读数，并考虑噪声底和饱和。当目标覆盖源接触区域时，总力可以保持守恒。

该映射需要已知接触对齐和传感器标定。实验使用四种平滑皮肤，评估法向接触形状，尚未建立自动三轴迁移、绝对力精度或跨具身策略迁移的结论。

## 剪切信息区分了法向压力难以区分的接触状态

SO-101 实验中，每个条件用 100 条示范训练 ACT，评测 50 次。输入为关节角，或关节角加触觉，不使用视觉。

| SO-101 任务与硬件 | 仅本体感知 | 加入触觉 |
|---|---:|---:|
| 插销入孔，FlexiTac | 50% | 58% |
| 插销入孔，OpenTac-1D | 52% | 60% |
| 插销入孔，OpenTac-3D | 66% | 82% |
| 插头插入，OpenTac-3D | 54% | 70% |

插头任务中，两种仅法向触觉策略都没有优于各自的本体感知基线。法向压力说明已经接触，却未必能区分插头已对准插孔，还是压在周围表面；剪切信息补充了方向证据。

YAM 钥匙入锁实验也表现出三轴感知更好的趋势。不过，正文写出的 25 次试验与部分百分比无法对应到整数成功次数。若要据此开展统计比较，我会先核对底层计数。

## 更快读取需要牺牲完整空间快照

在 1,024 个 taxel 的皮肤上，完整光栅扫描达到每秒 67 帧。自适应方法**每次只读取 16 个 taxel**时，达到每秒 **1,286 次更新**，提高 19.2 倍。预算的四分之一用于搜索，其余用于跟踪上一帧的活跃区域。

这些是局部读取，不是以 1.286 kHz 获得完整的 1,024 点图像。稀疏、局部接触最适合这种方法；大面积接触需要提高读取预算。冲击实验展示了短事件捕获的收益，但没有消除空间采样取舍。

作者报告了迟滞、漂移和温度依赖，十小时耐久实验中，读数约在两小时后趋于稳定。实际使用时，我会把几何与标定参数保留在数据元信息中，再通过同一硬件有无触觉输入的比较验证剪切收益，以区分感知价值与盖层引入的机械变化。

</div>
