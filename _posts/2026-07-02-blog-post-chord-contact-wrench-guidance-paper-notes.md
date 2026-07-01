---
title: "[Paper Notes] CHORD: Contact Wrench Guidance From Human Demonstration"
date: 2026-07-02
permalink: /posts/2026/07/chord-contact-wrench-guidance-paper-notes/
tags:
  - Robot Learning
  - Dexterous Manipulation
  - Human Demonstration
  - Reinforcement Learning
  - Sim-to-Real
---

<div data-lang="en" markdown="1">

**CHORD** studies a central problem in dexterous robot learning: human demonstrations contain rich manipulation knowledge, yet robot hands cannot directly replay human hand motion. Different morphology, kinematics, fingertip geometry, and contact timing can turn the same-looking motion into a different object effect.

My read: the paper's useful abstraction is **object-centric contact wrench guidance**. CHORD asks the robot to reproduce the object-level mechanical effect of a human contact, measured by the force-torque directions that contacts can induce on the object. This gives reinforcement learning a contact-rich reward that is less tied to a specific hand shape than raw contact positions.

## Paper Info

The paper is **"Learning Dexterous Manipulation Using Contact Wrench Guidance From Human Demonstration"** by **Xinghao Zhu, Zixi Liu, Shalin Jain, Chenran Li, Milad Noori, Huihua Zhao, John Welsh, Michael Andres Lin, Wei Liu, Tingwu Wang, Xingye Da, Zhengyi Luo, Vishal Kulkarni, Naema Bhatti, Yuke Zhu, Linxi Fan, Bowen Wen, Danfei Xu, Soha Pouya, and Yan Chang** from NVIDIA. The project page is [nvidia-isaac.github.io/video_to_data/chord](https://nvidia-isaac.github.io/video_to_data/chord/), and the technical report PDF is linked there.

CHORD stands for **Contact Wrench Guidance from Human Demonstration in Robotic Dexterous Manipulation**. The reported benchmark contains **4,739** bimanual dexterous manipulation tasks, and the main evaluation covers **1,831** tasks. The paper reports **82.12%** average success on this large-scale simulation evaluation, **90.77%** success on whole-body manipulation tasks, and successful transfer to a real Dexmate robot with two Sharpa dexterous hands.

## Why Human Motion Is Not Enough

A human demonstration gives at least three signals: hand motion, object motion, and hand-object contact. Purely tracking object motion is often too sparse for reinforcement learning because the robot receives useful feedback only after making the right contact. Purely tracking hand motion is brittle because the robot hand may need a different pose to generate the same effect. Tracking contact locations helps, yet it can still be mechanically wrong: touching the same object patch with a different surface normal or force direction may push, lever, or slide the object in the wrong way.

CHORD's answer is to move the comparison into **wrench space**. A contact is judged by the force and torque directions it can apply to an object part. This makes the target more functional: the robot can choose embodiment-specific contacts as long as those contacts support object motion aligned with the human reference.

## The Core Formulation

Each reference trajectory is written as

\[
\tau^{\mathrm{ref}}=\{x_t^{\mathrm{human}}, x_t^{\mathrm{object}}\}_{t=1}^{H},
\]

where the human term contains 3D hand keypoints and the object term contains the poses of \(K\) rigid bodies or articulated parts. The human hand motion is first retargeted by inverse kinematics to a robot reference \(x_t^{\mathrm{robot}}\). The policy then receives robot observations, object observations, and reference motion, and learns actions that make the rollout object poses track the reference.

The reward has three parts:

\[
r = r_{\mathrm{task}} + r_{\mathrm{imit}} + r_{\mathrm{contact}}.
\]

The task term tracks object-part poses. For multi-object interactions such as insertion, pouring, scooping, and tool use, CHORD also adds a relative object-pose reward that activates during demonstrated object-object interaction phases. The imitation term keeps the robot near the retargeted motion. The contact term is the main contribution.

For object part \(k\), CHORD extracts human contact positions \(p_{h,k}^{i}\) and normals \(n_{h,k}^{i}\) in the object frame. It approximates each Coulomb friction cone with \(d\) edge forces. Each edge force creates a primitive wrench:

\[
w_{h,k}^{i,j}
= \begin{bmatrix}
f_{h,k}^{i,j} \\
p_{h,k}^{i} \times f_{h,k}^{i,j}
\end{bmatrix}
\in \mathbb{R}^{6}.
\]

Collecting all primitive wrenches gives the human wrench matrix:

\[
\mathcal{W}_{h,k}\in \mathbb{R}^{6\times(c_{h,k}d)}.
\]

Directly comparing human and robot wrench matrices is awkward because the two hands may have different contact counts and different ordering of contact primitives. CHORD therefore compares the geometry of the induced wrench set through a support function. With pre-sampled unit basis directions \(\mathcal{B}\in\mathbb{R}^{6\times b}\),

\[
\sigma_{h,k} = \max_{\mathrm{col}}(\mathcal{B}^{\top}\mathcal{W}_{h,k})\in\mathbb{R}^{b},
\]

and \(\sigma_{r,k}\) is computed the same way for the robot. The contact wrench-space reward then keeps the robot support close to the human support under a relative tolerance \(\beta\):

\[
r_{\mathrm{cws}}^{k}
= \exp\left(
-\frac{\lVert\max(0,(1-\beta)\sigma_{h,k}-\sigma_{r,k})\rVert_2^2}{v_{\mathrm{cws}}}
-\frac{\lVert\max(0,\sigma_{r,k}-(1+\beta)\sigma_{h,k})\rVert_2^2}{v_{\mathrm{cws}}}
\right).
\]

The lower-bound term encourages the robot to supply enough support in the same wrench directions as the human contact. The upper-bound term prevents excessive or mechanically unrelated support. The paper also adds penalties for unintended contacts and missed contacts because the exponential kernel alone would still give a positive value for mismatched contact states.

## Training Recipe

CHORD still uses practical scaffolding around the reward. It uses a virtual object controller (VOC) during training, resets the simulator to arbitrary frames along the reference trajectory, keeps VOC active for a short stabilization window, and anneals assistance through a curriculum. The policy uses residual actions around the retargeted robot motion, so RL learns corrections instead of rediscovering the whole movement from scratch.

The paper adds two robustness choices. First, object parts are perturbed by wrenches sampled from the human contact wrench matrix, which creates disturbances aligned with the demonstrated contact mechanics. Second, when contact estimates are noisy, CHORD can switch from exact wrench matching to a reduced force-closure-style objective:

\[
r_{\mathrm{fc}}^{k}=\frac{1}{B}\sum_{b=1}^{B}\mathbf{1}[\sigma_{r,k,b}>\epsilon].
\]

That fallback is less behavior-specific, but it avoids trusting corrupted contact normals and positions from noisy video reconstruction.

## Benchmark and Results

The benchmark is a large part of the contribution. CHORD processes human hand-object interaction data from **ARCTIC, TACO, HOT3D, OakInk2, DexYCB, GRAB, and H2O**, then imports the retargeted tasks into Isaac Lab. The resulting library includes rigid objects, articulated objects, multi-object interactions, long horizons, and dense contact events.

On **1,831** sampled tasks, CHORD reports an average success rate of **82.12%** with one shared training recipe across tasks. Compared with prior methods under their own evaluation protocols, CHORD matches or exceeds DexMachina, ManipTrans, and SPIDER across the tested suites. The contact reward ablations are especially clear:

| Setting | Main finding |
|---|---|
| CHORD contact wrench support | Best performance on box grabbing, mixer use, and whole-body ablations |
| Contact position reward | Weaker when the same object patch does not imply the same force/torque effect |
| No contact reward | Weakest on contact-rich manipulation because kinematic tracking alone gives poor exploration guidance |

The paper also reports that normalized contact wrench reward correlates strongly with task success across 1,831 runs, with Pearson correlation around **0.80**. That is an important empirical check: the proposed reward is not just elegant mechanics; it tracks downstream manipulation performance.

For whole-body manipulation, CHORD handles both hand-only references and third-person whole-body references. Hand-only references can be expanded with a motion inpainting module that predicts whole-body motion from end-effector trajectories. For noisy third-person reconstructions, the reduced force-closure objective is used. The whole-body evaluation reports **90.77%** success, and a cross-embodiment ablation shows a large gap between wrench guidance and contact position guidance when transferring five-finger human contacts to the three-fingered Dex3 hand on a Unitree G1.

## Real-World Deployment

The real-world experiments use a **Dexmate** robot with two **Sharpa** dexterous hands. The paper tests both open-loop action-chunk execution and closed-loop inference. Object and robot poses are tracked with a six-camera Vicon setup, and the deployed policy runs as an ONNX model at **20 Hz** while lower-level bridges hold commands at higher frequency.

This is a state-based real-world transfer result, not a vision policy. That matters for interpreting the result: the paper shows that the learned contact behavior can leave simulation, while visual perception remains future work.

## Strengths and Limitations

The strongest part of CHORD is the abstraction boundary. It does not ask morphology-specific robot hands to copy human contact positions. It asks them to create contacts with similar object-level wrench support. That is a better match for dexterous manipulation because functional contact matters more than visual similarity of the hand pose.

The second strength is scale. The paper moves beyond a small set of hand-picked manipulation tasks and evaluates RL-based dexterous manipulation over thousands of long-horizon bimanual tasks. This makes the reward design feel less like a single-task trick and more like a reusable training signal.

The limitations are also concrete. Real-world deployment currently uses state-based observations from motion capture. Accurate contact guidance still depends on reasonably clean demonstrations; when contact positions or normals become very noisy, the method falls back to a less specific force-closure objective. The evaluation metric is object-pose tracking, which may miss task functionality in both directions: a small pose error can break an insertion task, while a larger pose error may be acceptable for a loose placement task.

## Takeaway

CHORD's reusable idea is: **transfer human dexterous demonstrations through the mechanics of contact, not through the appearance of contact**. Represent each human and robot contact set by the wrench directions it can induce on the object, compare those supports with tolerance, and use the result as a dense RL reward. For dexterous grasping and manipulation, this is a powerful shift because it respects embodiment differences while preserving the part of the demonstration that actually moves the object.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**CHORD** 研究的是灵巧手学习里的一个核心问题：人类示范里有大量操作知识，但机器人手不能直接复放人手动作。手型、运动学、指尖几何、接触时机一变，看起来相似的动作就可能给物体带来完全不同的效果。

我的理解是：这篇论文最值得抓住的抽象是 **object-centric contact wrench guidance**。CHORD 让机器人复现人类接触对物体产生的力学效果，用接触能在物体上诱导出的 force/torque directions 来衡量。这样 RL 得到的是一个接触丰富、又不过度绑定具体手型的奖励。

## 论文信息

论文标题是 **"Learning Dexterous Manipulation Using Contact Wrench Guidance From Human Demonstration"**，作者包括 NVIDIA 的 **Xinghao Zhu, Zixi Liu, Shalin Jain, Chenran Li, Milad Noori, Huihua Zhao, John Welsh, Michael Andres Lin, Wei Liu, Tingwu Wang, Xingye Da, Zhengyi Luo, Vishal Kulkarni, Naema Bhatti, Yuke Zhu, Linxi Fan, Bowen Wen, Danfei Xu, Soha Pouya, and Yan Chang**。项目页是 [nvidia-isaac.github.io/video_to_data/chord](https://nvidia-isaac.github.io/video_to_data/chord/)，技术报告 PDF 也在项目页中。

CHORD 的全称是 **Contact Wrench Guidance from Human Demonstration in Robotic Dexterous Manipulation**。论文报告的 benchmark 包含 **4,739** 个双手灵巧操作任务，主实验评估了 **1,831** 个任务。结果中，大规模仿真平均成功率是 **82.12%**，whole-body manipulation 成功率是 **90.77%**，并且策略可以迁移到配备两只 Sharpa 灵巧手的 Dexmate 真实机器人上。

## 为什么只模仿人手动作不够

人类示范至少给出三类信号：手的运动、物体的运动、手和物体的接触。只跟踪物体运动对 RL 来说经常太稀疏，因为机器人只有先碰对了，后续物体轨迹奖励才有意义。只跟踪手的运动也很脆，因为机器人手可能需要用不同姿态才能产生同样的物体效果。跟踪接触位置会更好一些，但仍然可能在力学上错掉：接触同一个物体区域，如果表面法向或施力方向不同，物体可能被推、撬、滑向完全不同的方向。

CHORD 的做法是把比较对象搬到 **wrench space**。接触根据它能对物体部件施加什么 force 和 torque 来评估。这个目标更偏功能性：机器人可以选择适合自身 embodiment 的接触，只要这些接触支持的物体运动和人类参考一致。

## 核心方法

每条参考轨迹写成：

\[
\tau^{\mathrm{ref}}=\{x_t^{\mathrm{human}}, x_t^{\mathrm{object}}\}_{t=1}^{H},
\]

其中 human term 是 3D hand keypoints，object term 是 \(K\) 个 rigid bodies 或 articulated parts 的 pose。论文先用 IK 把人手动作 retarget 到机器人参考 \(x_t^{\mathrm{robot}}\)。策略随后接收 robot observations、object observations 和 reference motion，学习让 rollout 中的 object poses 跟随参考轨迹。

总奖励有三部分：

\[
r = r_{\mathrm{task}} + r_{\mathrm{imit}} + r_{\mathrm{contact}}.
\]

task term 跟踪 object-part poses。对于 insertion、pouring、scooping、tool use 这类 multi-object interaction，CHORD 还会在示范中发生物体-物体交互的阶段加入 relative object-pose reward。imitation term 让机器人不要偏离 retargeted motion。真正的贡献在 contact term。

对 object part \(k\)，CHORD 在物体坐标系下提取人类接触位置 \(p_{h,k}^{i}\) 和法向 \(n_{h,k}^{i}\)。每个 Coulomb friction cone 被近似成 \(d\) 条 edge forces。每条 edge force 会产生一个 primitive wrench：

\[
w_{h,k}^{i,j}
= \begin{bmatrix}
f_{h,k}^{i,j} \\
p_{h,k}^{i} \times f_{h,k}^{i,j}
\end{bmatrix}
\in \mathbb{R}^{6}.
\]

把所有 primitive wrenches 收集起来，就得到 human wrench matrix：

\[
\mathcal{W}_{h,k}\in \mathbb{R}^{6\times(c_{h,k}d)}.
\]

直接比较 human 和 robot 的 wrench matrices 很麻烦，因为两只手的接触数量可能不同，primitive wrench 的顺序也没有可比性。CHORD 用 support function 比较诱导出的 wrench geometry。给定预采样单位方向 \(\mathcal{B}\in\mathbb{R}^{6\times b}\)，有：

\[
\sigma_{h,k} = \max_{\mathrm{col}}(\mathcal{B}^{\top}\mathcal{W}_{h,k})\in\mathbb{R}^{b},
\]

机器人侧的 \(\sigma_{r,k}\) 用同样方式计算。contact wrench-space reward 用相对容差 \(\beta\) 约束机器人 support 接近人类 support：

\[
r_{\mathrm{cws}}^{k}
= \exp\left(
-\frac{\lVert\max(0,(1-\beta)\sigma_{h,k}-\sigma_{r,k})\rVert_2^2}{v_{\mathrm{cws}}}
-\frac{\lVert\max(0,\sigma_{r,k}-(1+\beta)\sigma_{h,k})\rVert_2^2}{v_{\mathrm{cws}}}
\right).
\]

lower-bound term 鼓励机器人在和人类接触相同的 wrench directions 上提供足够支撑。upper-bound term 防止机器人产生过强或不相关的 wrench support。论文还额外惩罚 unintended contacts 和 missed contacts，因为指数核即使在接触状态不匹配时也会给正奖励。

## 训练配方

CHORD 的 reward 之外还有一些很实用的训练支架。训练中使用 virtual object controller (VOC)，从参考轨迹中的任意帧 reset simulator，并在短暂稳定窗口内保持 VOC fully active，随后通过 curriculum 逐步 anneal assistance。策略使用 residual action space，以 retargeted robot motion 作为 prior，让 RL 学 correction，避免从零重新发现整段动作。

论文还有两个鲁棒性设计。第一，用 human contact wrench matrix 中采样的 wrenches 去扰动物体部件，这些扰动和示范中的接触力学一致。第二，当接触估计很噪时，CHORD 可以从精确的 wrench matching 切换到 reduced force-closure-style objective：

\[
r_{\mathrm{fc}}^{k}=\frac{1}{B}\sum_{b=1}^{B}\mathbf{1}[\sigma_{r,k,b}>\epsilon].
\]

这个 fallback 的行为约束更弱，但可以避免过度相信由 noisy video reconstruction 得到的错误接触法向和位置。

## Benchmark 和结果

benchmark 本身是这篇论文的重要贡献。CHORD 处理了来自 **ARCTIC, TACO, HOT3D, OakInk2, DexYCB, GRAB, H2O** 的人手-物体交互数据，再把 retargeted tasks 导入 Isaac Lab。最终任务库包含 rigid objects、articulated objects、multi-object interactions、长时间 horizon 和密集 contact events。

在 **1,831** 个采样任务上，CHORD 用一套共享训练配方达到 **82.12%** 平均成功率。和 prior methods 比较时，论文在各自原始 evaluation protocols 下复现并比较 DexMachina、ManipTrans 和 SPIDER，CHORD 在测试套件上整体持平或超过这些方法。contact reward 的 ablation 特别清楚：

| Setting | Main finding |
|---|---|
| CHORD contact wrench support | 在 box grabbing、mixer use 和 whole-body ablation 上表现最好 |
| Contact position reward | 同一个 object patch 不一定对应同样的 force/torque effect，因此性能明显变弱 |
| No contact reward | 对接触丰富任务最弱，因为单纯 kinematic tracking 给不了足够好的 exploration guidance |

论文还显示，在 1,831 次 runs 中，normalized contact wrench reward 和 task success 的 Pearson correlation 约为 **0.80**。这点很关键：这个 reward 的价值同时体现在力学表达和最终操作成功的相关性上。

在 whole-body manipulation 上，CHORD 同时处理 hand-only references 和第三人称 whole-body references。hand-only references 可以通过 motion inpainting module 从 end-effector trajectories 补出 whole-body motion。对于 noisy third-person reconstructions，则使用 reduced force-closure objective。whole-body 实验报告 **90.77%** 成功率；cross-embodiment ablation 也显示，把五指人手接触迁移到 Unitree G1 的三指 Dex3 手时，wrench guidance 明显优于 contact position guidance。

## 真实机器人部署

真实实验使用 **Dexmate** robot 和两只 **Sharpa** 灵巧手。论文测试了 open-loop action-chunk execution 和 closed-loop inference。物体和机器人 pose 由六相机 Vicon 系统跟踪，部署策略以 ONNX model 运行，policy loop 频率是 **20 Hz**，底层 bridge 以更高频率 hold commands。

这是一组 state-based real-world transfer 结果，vision policy 还没有覆盖。解读时需要注意：论文证明了学到的接触行为可以离开仿真，但视觉感知部署仍然是未来工作。

## 优点和局限

CHORD 最强的地方是抽象边界选得好。它避免让不同形态的机器人手复制人手接触位置，改为要求机器人产生相似的 object-level wrench support。对灵巧操作来说，这比手势外观相似更贴近真正的功能目标。

第二个优点是规模。论文把 RL-based dexterous manipulation 的评估推进到数千个 long-horizon bimanual tasks，规模不再停留在少量精心挑选的任务。这让 reward 设计看起来更像一个可复用训练信号，而非单任务技巧。

局限也很具体。真实部署目前依赖 motion capture 提供 state-based observations。准确的 contact guidance 仍然需要相对干净的人类示范；当接触位置或法向噪声很大时，方法会退回到更粗的 force-closure objective。评估指标主要是 object-pose tracking，而 object pose error 并非完美的任务成功代理：插入任务里很小的 pose error 可能导致功能失败，宽松放置任务里较大的 pose error 也可能仍然可接受。

## Takeaway

CHORD 最值得复用的思想是：**用接触力学迁移人类灵巧示范，让接触外观退到次要位置**。把人类和机器人接触集合都表示成它们能在物体上诱导出的 wrench directions，用带容差的 support function 比较，再把这个比较结果作为 dense RL reward。对于灵巧抓取和操作，这个转变很有力量，因为它允许 embodiment 差异，同时保留了示范中真正推动物体运动的那部分信息。

</div>
