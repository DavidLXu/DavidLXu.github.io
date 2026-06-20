---
title: "[Paper Notes] EgoInfinity: A Web-Scale 4D Hand-Object Interaction Data Engine"
date: 2026-06-21
permalink: /posts/2026/06/egoinfinity-paper-notes/
tags:
  - Robot Learning
  - Human Videos
  - Egocentric Data
  - Retargeting
  - Manipulation
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**EgoInfinity** is best read as a **data engine**: a system for turning arbitrary in-the-wild RGB manipulation videos into robot-usable 4D hand-object interaction data. The output includes metric hand trajectories, object point clouds and meshes, 6-DoF object poses, contact-relevant interaction states, and robot-specific retargeted trajectories.

The central idea is to make internet video actionable. EgoInfinity starts from web-scale Action100M-style clips, filters for manipulation, reconstructs hands and objects in a shared metric 3D frame, repairs hand-object drift with interaction-aware rules, then compiles the recovered hand motion into executable robot trajectories through a learned root-frame estimator plus IK. The most useful takeaway is the representation boundary:

\\[
H_t=\{M_t^h,K_t^h,{}^c p_t^h,P_t^o,M^o,{}^c p_t^o\}
\\]

This state is agent-agnostic: it describes the human hand, object geometry, and object pose in metric 4D space before choosing a target robot embodiment. That is the reason the same recovered interaction can be retargeted to Unitree G1, Robonaut2, dual Franka arms, and a LEAP hand policy setting.

## Paper and Resources

The paper is **"EgoInfinity: A Web-Scale 4D Hand-Object Interaction Data Engine for Any-View Robot Retargeting and Video-to-Action Robot Learning"** by **Gaotian Wang, Kejia Ren, Andrew Morgan, Yiting Chen, Howard H. Qian, Podshara Chanrungmaneekul, and Kaiyu Hang**. It is available as [arXiv:2606.17385](https://arxiv.org/abs/2606.17385). The project page is the [EgoInfinity Hugging Face Space](https://huggingface.co/spaces/Rice-RobotPI-Lab/EgoInfinity), and the public dataset entry is [Rice-RobotPI-Lab/egoinfinity](https://huggingface.co/datasets/Rice-RobotPI-Lab/egoinfinity).

The arXiv paper reports the data engine as corpus-agnostic, with the current scale bounded by Action100M: **14.6 years of footage**, **147M action segments**, and a table-level comparison listing **127K hours**. The released browser/dataset is a curated, inspectable subset: the paper reports **106 processed manipulation videos**, **277 objects**, **12,107 frames**, and **median 5.8 s** clip duration; the Hugging Face dataset page currently exposes **1,150 rows** and about **5.49 GB**.

## The Problem: Video Is Huge, Robot Data Is Actionable

Egocentric and internet videos contain enormous manipulation diversity, but most of that signal is trapped in pixels. A robot needs metric geometry, object state, contact timing, feasible motion, and embodiment-specific commands. Existing robot datasets provide actions but are expensive and hardware-bound; existing human-video datasets scale better but usually stop at observation, narration, pose, or weak action labels.

EgoInfinity tries to close that gap by turning RGB videos into an intermediate form that is closer to robot action but still independent of any one robot. This is the right design pressure. If the engine produced only 2D tracks, downstream policies would still need to infer geometry. If it produced only robot actions, the output would be tied to one embodiment. The paper instead builds a metric 4D HOI representation and adds retargeting as a compilation step.

## Data Engine Pipeline

The pipeline has two passes. The first pass is cheap: scan videos, identify hand-present segments, filter by hand-motion statistics and camera-motion cues, and retain clips likely to contain useful manipulation. The second pass runs the full reconstruction stack only on the active segments. The current paper focuses on approximately static-view videos, which is a practical assumption for many tutorial and how-to clips.

The full stack has four conceptual blocks:

1. **Metric geometry and hand tracking.** MoGe-2 estimates focal length and global metric scale; Flow3R predicts dense depth; GeoCalib estimates gravity. WiLoR reconstructs MANO hand parameters and hand meshes, with infilling and smoothing to handle missing frames.
2. **Object discovery and reconstruction.** Text annotations from Action100M are used to extract object prompts. SAM-3 detects target regions, SAM-2 tracks masks through time, SAM-3D reconstructs object meshes, and FoundationPose++ estimates 6-DoF object pose trajectories.
3. **Interaction-aware refinement.** MEMFOF optical flow, hand keypoints, object masks, and point clouds are used to classify object state. The main text compresses this to \\(s_t\in\\{\mathrm{static},\mathrm{grasped},\mathrm{moving}\\}\\), while the appendix uses finer labels such as left-hand grasp, right-hand grasp, and bimanual grasp.
4. **Coordinate cleanup and exo-to-ego reframing.** The system can erode masks, filter depth boundaries, remove outliers, and synthesize an egocentric view by rigidly re-rendering the recovered 3D scene from a hand-centered virtual camera.

The important implementation point is cross-module metric calibration. EgoInfinity turns a collection of foundation-model outputs into one shared metric camera-world frame: hand predictions, object predictions, dense depth, camera calibration, gravity, masks, and object priors are all aligned before contact reasoning. Without that, hand-object contact reasoning would collapse into scale mismatch and pose drift.

## Interaction-Aware Refinement

The refinement stage is the paper's strongest systems idea. Pure visual object tracking is brittle under occlusion, especially when the hand covers the manipulated object. EgoInfinity uses interaction state to decide which geometric signal should drive object pose.

For each frame, it first forms an object proposal:

\\[
\tilde p_t^o=(R_{\mathrm{cano}},\operatorname{center}(S_t^o\odot D_t))
\\]

Here \\(R_{\mathrm{cano}}\\) comes from the canonical SAM-3D orientation, \\(S_t^o\\) is the object mask, and \\(D_t\\) is depth. Then the state determines the trusted pose source:

- If the object is static, lock it to a robust point-cloud centroid.
- If it is grasped, bind it rigidly to the hand frame with a canonical palm-aligned transform.
- If it is moving but not confidently grasped, keep the visual proposal and smooth it.

In the appendix, the state classifier is more concrete. A global-static gate catches fixtures whose mask centroid barely moves; a Schmitt trigger stabilizes per-frame motion detection; grasp signals combine 2D mask overlap, fingertip-to-cloud distance, and wrist-to-cloud distance; temporal smoothing fills short gaps and removes short false runs. This is a nice example of using simple geometry and temporal logic to make foundation-model outputs more physically usable.

## Functional Retargeting

The retargeting section is another key piece. Internet videos often show only hands, partial arms, or arbitrary viewpoints, so exact human body-pose imitation is a fragile target. EgoInfinity uses **functional retargeting**: preserve task-relevant hand motion and choose a feasible robot root frame, without requiring full human kinematic recovery.

Given recovered hand trajectories and optional gravity, the retargeter estimates a robot-specific kinematic root frame:

\\[
{}^c p_r=({}^c R_r,{}^c t_r)\in SE(3)
\\]

The estimator is an SE(3)-equivariant Vector Neuron network trained entirely in MuJoCo simulation. It predicts plausible root frames from hand trajectories, using flow matching to represent ambiguity: many torso/root poses can explain the same observed hand path. At inference time, the system samples multiple root-frame hypotheses, clusters them, interpolates smooth root trajectories across windows, then scores candidates by IK convergence, residual tracking error, manipulability, joint-limit margin, and smoothness.

This design makes the representation boundary clean:

```text
RGB video
    -> metric 4D hand-object state
    -> robot-specific root-frame estimate
    -> IK and smoothing
    -> executable joint trajectory
```

Finger motion is handled separately for dexterous hands through robot-specific mapping from MANO keypoints. Arm joints follow wrist-level IK targets; finger joints use hand geometry.

## Experiments

The curated Action100M subset contains **106 clips**, **277 objects**, and **12,107 frames**. The paper reports that **88% of clips** and **47% of objects** involve manipulation, with a mix of static, moving, left-hand, right-hand, and bimanual grasp states. Object categories include containers, tools, food, hardware, appliances, textiles, electronics, decor, paper, and hygiene objects; top verbs include place, add, show, season, arrange, hold, pick, pour, present, remove, insert, and slice.

For cross-embodiment motion retargeting, the paper evaluates Unitree G1, Robonaut2, and dual Franka FR3:

| Robot | IK rate | Position error | Orientation error |
|---|---:|---:|---:|
| Unitree G1 | 0.821 | 2.86 cm | 6.73 deg |
| Robonaut2 | 0.774 | 6.67 cm | 8.25 deg |
| Dual-Franka | 0.706 | 10.27 cm | 12.17 deg |

The trend makes sense. Unitree G1 has stronger whole-body reachability for many human-like hand motions; dual Franka is constrained by a tabletop-style bimanual setup and larger morphology mismatch. The paper also shows real-robot executions for cutting, pouring, and wiping, plus a LEAP dexterous-hand grasping policy trained with EgoInfinity-extracted hand motions as priors.

## Why This Is Useful

For robot learning, EgoInfinity is useful because it shifts the bottleneck from collecting robot demonstrations to compiling human videos into a structured action prior. The output is still imperfect, but it is far richer than action labels or 2D tracks. It contains metric hand motion, object geometry, 6-DoF object motion, language labels inherited from video annotations, and interaction-state information.

For VLA or imitation-learning pipelines, I would read EgoInfinity as a source of pretraining or prior data, not as a final expert demonstration dataset. It can tell the model how hands approach objects, when grasp transitions happen, how objects move relative to hands, and how task-relevant motion unfolds. A robot still needs embodiment-specific control, tactile/force feedback, and real-world correction.

The paper also makes a broader methodological point: scaling robot data may require **engines** alongside datasets. A static release gets stale when perception models improve. A modular engine can swap in better hand pose, segmentation, depth, object reconstruction, SLAM, or retargeting modules while preserving the output contract.

## Limitations

EgoInfinity currently assumes approximately static-camera videos. This helps avoid full online SLAM, but excludes a large fraction of body-mounted, handheld, and strongly moving-camera clips. The interaction-aware refinement improves physical plausibility, yet it does not guarantee contact-level accuracy: exact fingertip placement, no-slip behavior, force consistency, and tactile state remain outside the representation. The retargeter is robot-specific and may require retraining or calibration for new embodiments.

The engine is also limited by its perception components. If SAM-3 chooses the wrong object, SAM-3D returns a poor mesh, depth is unstable, or the hand tracker fails under occlusion, the downstream 4D state can still become unreliable. The good news is that the modular design makes these failures inspectable and, in principle, replaceable.

## Takeaways

EgoInfinity is a useful blueprint for turning internet manipulation videos into robot-learning substrate. The core recipe is: recover metric hand-object state, use interaction state to repair visual tracking, keep the representation agent-agnostic, and compile it into robot actions only after choosing an embodiment. That separation is what makes the system interesting. It turns "watching humans manipulate objects" into a reusable intermediate representation for retargeting, policy priors, and future VLA-scale robot learning.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

这篇文章支持通过顶部导航栏进行 **English / 中文** 切换。

## TL;DR

**EgoInfinity** 更适合被理解为一个 **data engine**：一个把任意 in-the-wild RGB manipulation videos 转成 robot-usable 4D hand-object interaction data 的系统。它输出 metric hand trajectories、object point clouds / meshes、6-DoF object poses、contact-relevant interaction states，以及针对具体机器人 embodiment 的 retargeted trajectories。

核心问题是让 internet video 变得 actionable。EgoInfinity 从 Action100M 风格的 web-scale clips 出发，先过滤出 manipulation 片段，再把 hand 和 object 重建到同一个 metric 3D frame，随后用 interaction-aware rules 修复 hand-object drift，最后通过 learned root-frame estimator 和 IK，把恢复出的手部运动编译成可执行 robot trajectories。最值得记住的是这个 representation boundary：

\\[
H_t=\{M_t^h,K_t^h,{}^c p_t^h,P_t^o,M^o,{}^c p_t^o\}
\\]

这个状态是 agent-agnostic 的：它先描述人手、物体几何和物体位姿在 metric 4D space 中的关系，再选择目标机器人。因此同一段恢复出的 interaction 可以被 retarget 到 Unitree G1、Robonaut2、dual Franka，也可以作为 LEAP hand policy 的 prior。

## 论文与资源

论文是 **Gaotian Wang, Kejia Ren, Andrew Morgan, Yiting Chen, Howard H. Qian, Podshara Chanrungmaneekul, Kaiyu Hang** 的 **"EgoInfinity: A Web-Scale 4D Hand-Object Interaction Data Engine for Any-View Robot Retargeting and Video-to-Action Robot Learning"**。论文地址是 [arXiv:2606.17385](https://arxiv.org/abs/2606.17385)，项目页是 [EgoInfinity Hugging Face Space](https://huggingface.co/spaces/Rice-RobotPI-Lab/EgoInfinity)，公开 dataset entry 是 [Rice-RobotPI-Lab/egoinfinity](https://huggingface.co/datasets/Rice-RobotPI-Lab/egoinfinity)。

arXiv 论文把数据引擎描述为 corpus-agnostic，目前规模由 Action100M 限定：**14.6 年视频**、**147M action segments**，表格里对应 **127K hours**。已发布的 browser / dataset 是可检查的 curated subset：论文报告 **106 个 processed manipulation videos**、**277 个 objects**、**12,107 frames**、clip median duration **5.8 s**；Hugging Face dataset 页面当前显示 **1,150 rows**、约 **5.49 GB**。

## 问题：Video 很大，Robot Data 要能执行

egocentric 和 internet videos 里有大量 manipulation diversity，但大部分信号都困在 pixels 里。机器人需要的是 metric geometry、object state、contact timing、feasible motion 和 embodiment-specific commands。已有 robot datasets 有 actions，但采集贵、硬件绑定强；已有 human-video datasets 更容易规模化，但通常停在 observation、narration、pose 或弱 action labels。

EgoInfinity 的设计是把 RGB videos 转成一个更接近 robot action、同时又不绑定任何单一机器人的 intermediate form。如果输出只有 2D tracks，后续 policy 仍然要自己推断 geometry；如果直接输出某个机器人的 actions，数据就会锁死在一个 embodiment 上。论文选择先构造 metric 4D HOI representation，再把 retargeting 当成 compilation step。

## Data Engine Pipeline

pipeline 分两遍。第一遍很轻量：扫描视频，找出 hand-present segments，用 hand-motion statistics 和 camera-motion cues 过滤，保留可能包含有效 manipulation 的片段。第二遍只在 active segments 上运行完整 reconstruction stack。当前论文主要处理 approximately static-view videos，这对很多 tutorial / how-to clips 是一个现实可用的假设。

完整 stack 可以拆成四块：

1. **Metric geometry and hand tracking.** MoGe-2 估计 focal length 和 global metric scale；Flow3R 预测 dense depth；GeoCalib 估计 gravity。WiLoR 重建 MANO hand parameters 和 hand meshes，并通过 infilling / smoothing 处理缺帧。
2. **Object discovery and reconstruction.** Action100M 的文本标注用于抽取 object prompts。SAM-3 检测目标区域，SAM-2 做 temporal mask tracking，SAM-3D 重建 object mesh，FoundationPose++ 估计 6-DoF object pose trajectories。
3. **Interaction-aware refinement.** MEMFOF optical flow、hand keypoints、object masks 和 point clouds 被用来分类 object state。正文把状态压缩成 \\(s_t\in\\{\mathrm{static},\mathrm{grasped},\mathrm{moving}\\}\\)，appendix 里还有 left-hand grasp、right-hand grasp 和 bimanual grasp 等更细标签。
4. **Coordinate cleanup and exo-to-ego reframing.** 系统可以做 mask erosion、depth boundary filtering、outlier removal，并通过 hand-centered virtual camera 对恢复出的 3D scene 做 rigid re-rendering，合成 egocentric view。

关键实现点是 cross-module metric calibration。EgoInfinity 把一组 foundation-model outputs 整合到同一个 metric camera-world frame：hand prediction、object prediction、dense depth、camera calibration、gravity、masks 和 object priors 都先完成对齐，再进入 contact reasoning。没有这个步骤，hand-object contact reasoning 很容易被 scale mismatch 和 pose drift 击穿。

## Interaction-Aware Refinement

refinement stage 是这篇论文最强的系统设计之一。纯视觉 object tracking 在遮挡下很脆，尤其是手盖住被操作物体时。EgoInfinity 用 interaction state 决定 object pose 应该相信哪一种 geometric signal。

每一帧先形成一个 object proposal：

\\[
\tilde p_t^o=(R_{\mathrm{cano}},\operatorname{center}(S_t^o\odot D_t))
\\]

其中 \\(R_{\mathrm{cano}}\\) 来自 SAM-3D 的 canonical orientation，\\(S_t^o\\) 是 object mask，\\(D_t\\) 是 depth。随后状态决定 pose source：

- 如果 object 是 static，就把它锁到 robust point-cloud centroid。
- 如果 object 被 grasped，就用 canonical palm-aligned transform 把它刚性绑定到 hand frame。
- 如果 object 在 moving 但 grasp 不够确定，就保留 visual proposal 并做 smoothing。

appendix 里这个 state classifier 更具体。global-static gate 捕捉 mask centroid 几乎不动的 fixtures；Schmitt trigger 稳定 per-frame motion detection；grasp signal 组合 2D mask overlap、fingertip-to-cloud distance 和 wrist-to-cloud distance；temporal smoothing 填补短暂空洞并删除短 false runs。这是一种很实用的做法：用简单几何和时序逻辑，把 foundation-model outputs 推向更物理可用的状态。

## Functional Retargeting

retargeting 是另一块核心。internet videos 经常只露出手、部分手臂或任意视角，因此精确恢复 human body pose 再 imitation 很脆。EgoInfinity 使用 **functional retargeting**：保留 task-relevant hand motion，同时为目标机器人选择可行 root frame，不强求复刻人的完整运动学。

给定恢复出的 hand trajectories 和可选 gravity，retargeter 估计一个 robot-specific kinematic root frame：

\\[
{}^c p_r=({}^c R_r,{}^c t_r)\in SE(3)
\\]

这个 estimator 是一个 SE(3)-equivariant Vector Neuron network，完全在 MuJoCo simulation 中训练。它根据 hand trajectories 预测 plausible root frames，并用 flow matching 表示 ambiguity：同一条手部轨迹可能对应多个合理 torso/root poses。推理时，系统采样多个 root-frame hypotheses，聚类，跨窗口插值得到平滑 root trajectories，再通过 IK convergence、residual tracking error、manipulability、joint-limit margin 和 smoothness 给候选打分。

因此整体边界很清楚：

```text
RGB video
    -> metric 4D hand-object state
    -> robot-specific root-frame estimate
    -> IK and smoothing
    -> executable joint trajectory
```

对于 dexterous hands，finger motion 通过 robot-specific mapping 从 MANO keypoints 单独 retarget。arm joints 跟随 wrist-level IK targets，finger joints 则来自 hand geometry。

## 实验

curated Action100M subset 包含 **106 clips**、**277 objects** 和 **12,107 frames**。论文报告 **88% clips** 和 **47% objects** 涉及 manipulation，并覆盖 static、moving、left-hand、right-hand 和 bimanual grasp states。object categories 包括 containers、tools、food、hardware、appliances、textiles、electronics、decor、paper、hygiene；高频 verbs 包括 place、add、show、season、arrange、hold、pick、pour、present、remove、insert、slice。

cross-embodiment motion retargeting 评估了 Unitree G1、Robonaut2 和 dual Franka FR3：

| Robot | IK rate | Position error | Orientation error |
|---|---:|---:|---:|
| Unitree G1 | 0.821 | 2.86 cm | 6.73 deg |
| Robonaut2 | 0.774 | 6.67 cm | 8.25 deg |
| Dual-Franka | 0.706 | 10.27 cm | 12.17 deg |

这个趋势也合理。Unitree G1 对很多 human-like hand motions 有更强的 whole-body reachability；dual Franka 是更受约束的 tabletop bimanual setup，并且 morphology mismatch 更大。论文还展示了 cutting、pouring、wiping 的真实机器人执行，以及用 EgoInfinity-extracted hand motions 作为 prior 训练 LEAP dexterous-hand grasping policy。

## 为什么有用

对 robot learning 来说，EgoInfinity 的价值是把瓶颈从“采机器人 demonstration”转向“把 human videos 编译成 structured action prior”。这个输出仍然不完美，但比 action labels 或 2D tracks 信息密度高得多。它包含 metric hand motion、object geometry、6-DoF object motion、来自视频标注的 language labels，以及 interaction-state information。

对于 VLA 或 imitation-learning pipelines，我会把 EgoInfinity 看成 pretraining / prior data source，而非最终 expert demonstration dataset。它能告诉模型手如何接近物体、grasp transitions 何时发生、物体如何相对手运动、task-relevant motion 如何展开。真正落到机器人上，仍然需要 embodiment-specific control、tactile / force feedback 和 real-world correction。

论文还体现了一个更大的方法论：scaling robot data 需要 **engines** 和 datasets 一起演进。静态发布会随着 perception models 进步而变旧；模块化 engine 可以替换更强的 hand pose、segmentation、depth、object reconstruction、SLAM 或 retargeting modules，同时保持输出 contract 不变。

## 局限

EgoInfinity 目前假设 approximately static-camera videos。这个假设降低了处理难度，也避免 full online SLAM，但会排除大量 body-mounted、handheld 和强 moving-camera clips。interaction-aware refinement 提升了物理合理性，却不能保证 contact-level accuracy：精确 fingertip placement、no-slip behavior、force consistency 和 tactile state 都还不在表示里。retargeter 也是 robot-specific 的，新 embodiment 可能需要重新训练或校准。

engine 也受限于感知模块。如果 SAM-3 选错 object、SAM-3D 给出错误 mesh、depth 不稳定，或者 hand tracker 在遮挡下失败，下游 4D state 仍然会不可靠。好处是模块化设计让这些失败更容易被检查，也更容易在未来替换。

## Takeaways

EgoInfinity 是一个把 internet manipulation videos 转成 robot-learning substrate 的有用蓝图。核心 recipe 是：恢复 metric hand-object state，用 interaction state 修复 visual tracking，让 representation 保持 agent-agnostic，并在选定 embodiment 后再编译成 robot actions。这个分离很关键，它把“看人类操作物体”变成了 retargeting、policy priors 和未来 VLA-scale robot learning 都能复用的 intermediate representation。

</div>
