---
title: "[Paper Notes] Unified Visual-Tactile-Action Modeling from Human Demonstrations for Dexterous Manipulation"
date: 2026-10-25
permalink: /posts/2026/10/uvta-paper-notes/
excerpt: "UVTA aligns human and robot touch for joint action and future-tactile learning; these notes unpack its representations, training recipe, and stage-wise evaluation."
tags:
  - Dexterous Manipulation
  - Tactile Sensing
  - Human-Robot Transfer
  - Paper Notes
---

<div id="uvta-en" data-lang="en" markdown="1">

## TL;DR

UVTA learns from synchronized human touch, hand motion, and wrist images, together with robot demonstrations. It aligns the two embodiments into a 20-dimensional tactile representation and a 31-dimensional action layout. A shared visual encoder supports both diffusion action prediction and future-touch regression.

The five-task result is **70% average stage-wise credit**, against 29% for T-Rex. The metric awards intermediate progress, so 70% does not mean that seven of ten trials finish every task. The most useful ablation removes future tactile prediction and drops the average to 42%.

## Paper and reading version

**Unified Visual-Tactile-Action Modeling from Human Demonstrations for Dexterous Manipulation** — Wenqiao Li, Qianyou Zhao, Jiawen Hao, Xuezhou Zhu, Tengyu Liu, Kaifeng Zhang, Chuan Wen, Siyuan Huang. These notes follow [arXiv:2609.34182v2](https://arxiv.org/abs/2609.34182v2), an arXiv preprint, checked on October 25, 2026. [PDF](https://arxiv.org/pdf/2609.34182v2) · [Project](https://uni-vta.github.io/)

Method and training details are in Section IV; the dataset and scoring definition are in Sections III and V.

## First align what the two hands can measure

The human collection system combines a passive 22-DoF exoskeleton, VIVE wrist tracking, a wrist fisheye camera, and four force-sensing regions per fingertip. Signals are synchronized at 30 Hz. The camera-to-wrist geometry is calibrated against the robot setup, while constrained inverse kinematics maps human fingertip poses into the Sharpa Wave hand configuration.

Robot fingertips use visual-tactile deformation maps. VTPM divides each map into four glove-aligned regions, aggregates deformation intensity within each region, and concatenates all five fingers:

$$
Z_t\in\mathbb R^{20}.
$$

This is an aligned pressure-like representation. It should not be interpreted as a universal, calibrated force vector independent of sensor construction.

Each action contains relative wrist translation, a continuous 6-D wrist rotation representation, and 22 absolute finger targets:

$$
a_t\in\mathbb R^{31},\qquad
A_t=a_{t:t+15},\qquad
Y_t=Z_{t+1:t+16}.
$$

Human motions provide training targets; robot-normalized predictions become executable commands. The system uses separate min–max statistics for the two embodiments and saves the robot statistics for deployment.

Section III states **1,000 human and 150 robot demonstrations per task**, across five tasks. The human data varies object instances, backgrounds, and glove appearance; robot demonstrations use more restricted collection conditions. The dataset total implied by this per-task definition is 5,000 human and 750 robot demonstrations.

## A small predictive branch changes the learned visual features

A ViT-S/8, trained from scratch, encodes the current wrist image into 384 dimensions. Concatenating it with the tactile token gives

$$
Z=[f_\theta(I_t);Z_t]\in\mathbb R^{404}.
$$

A FiLM-conditioned diffusion U-Net predicts the 16-step action chunk. A separate two-layer MLP predicts all $16\times20$ future tactile values directly from the noise-free condition. The tactile head stays outside the action denoising trajectory, so its prediction errors do not enter each reverse diffusion step. Its gradients still update the shared visual encoder.

The loss is

$$
\mathcal L=
\tfrac12\operatorname{MSE}(\epsilon_{\rm wrist},\hat\epsilon_{\rm wrist})
+\tfrac12\operatorname{MSE}(\epsilon_{\rm hand},\hat\epsilon_{\rm hand})
+0.2\operatorname{MSE}(\hat Y_t,N_e(Y_t)).
$$

Each action error is averaged within its own group before the two groups receive equal weight. This prevents the 22 finger channels from dominating the nine wrist channels merely through dimensionality. $N_e$ denotes the relevant embodiment's normalization.

The model is trained separately for each task in one co-training run. Human and robot data receive equal sampling probability despite different dataset sizes. Training uses 300 epochs, batch size 250, and 50 diffusion noise levels. Deployment uses 16 DDIM steps, executes the first eight actions of a 16-action chunk, and then observes again. Predicted tactile trajectories are auxiliary outputs; current tactile measurements remain policy inputs.

## What the experiments actually score

Each method receives ten real-robot trials per task with randomized object placement and height. The score can include partial completion: for page turning, separating pages earns 0.3, turning multiple pages earns 0.7, and turning exactly one earns 1.0.

| Configuration | Mean stage-wise score |
|---|---:|
| ViTacFormer | 1% |
| Reactive Diffusion Policy | 14% |
| T-Rex | 29% |
| UVTA without tactile prediction | 42% |
| Vision-only ablation | 26% |
| With proprioceptive conditioning | 18% |
| Full UVTA | 70% |

Full-model scores are 83% for Flip Page, 80% for Screw Light Bulb, 88% for Toggle Switch, 56% for Ball Classification, and 44% for Liquid Transfer. These are the authors' rounded table values.

The scaling experiment fixes 150 robot demonstrations and varies human demonstrations on three tasks. Their mean rises through 0%, 8%, 29%, 51%, and 84% at 0, 250, 500, 750, and 1,000 human trajectories per task. This is evidence for continued improvement over the tested range, not an extrapolated scaling law. Human-only training also scores zero in the reported ablation.

Adding proprioception performs particularly poorly. The authors observe near-fixed trajectory replay and argue that the policy overuses state information. This is a finding for this co-training setup; it does not imply that proprioception should generally be removed from robot policies.

## What I would reuse

The practical idea is to let future tactile supervision shape the visual features while keeping the executed action interface simple. Its effectiveness depends on substantial alignment work: camera placement, tactile regions, wrist coordinates, hand kinematics, synchronization, and embodiment-specific normalization.

I would reproduce the future-touch ablation before expanding the model. I would also report binary completion beside stage-wise credit and repeat evaluation beyond ten trials per task. Those checks would distinguish learning useful contact dynamics from gaining more intermediate progress under a small evaluation budget.

</div>

<div id="uvta-zh" data-lang="zh" markdown="1" style="display: none;">

## TL;DR

UVTA 将同步采集的人类触觉、手部运动和腕部图像，与机器人示范一起训练。两种具身被对齐到 20 维触觉表示与 31 维动作格式，共享视觉编码器同时支持扩散动作预测和未来触觉回归。

五项任务的平均结果为 **70% 分阶段得分**，T-Rex 为 29%。这个指标会奖励中间进展，因此不能理解为每项任务十次试验中有七次完整成功。最有价值的消融是移除未来触觉预测头：平均得分由 70% 降至 42%。

## 论文与阅读版本

**Unified Visual-Tactile-Action Modeling from Human Demonstrations for Dexterous Manipulation**，作者：Wenqiao Li, Qianyou Zhao, Jiawen Hao, Xuezhou Zhu, Tengyu Liu, Kaifeng Zhang, Chuan Wen, Siyuan Huang。本文依据 [arXiv:2609.34182v2](https://arxiv.org/abs/2609.34182v2) 预印本，原文核验日期为 2026 年 10 月 25 日。[PDF 全文](https://arxiv.org/pdf/2609.34182v2) · [项目主页](https://uni-vta.github.io/)

方法与训练细节对应第 IV 节；数据集和评分定义见第 III、V 节。

## 先对齐两只手能够测到的信号

人类采集装置包括被动式 22 自由度外骨骼、VIVE 腕部跟踪器、腕部鱼眼相机，以及每个指尖四个压阻式感知区域。信号同步到 30 Hz。相机相对于手腕的几何关系参照机器人设置标定，带约束的逆运动学则把人类指尖位姿映射到 Sharpa Wave 手部配置。

机器人指尖输出视触觉形变图。VTPM 将每个指尖的形变图划分为四个与手套对应的区域，汇总各区域的形变强度，再拼接五根手指：

$$
Z_t\in\mathbb R^{20}.
$$

这里得到的是对齐后的类压力表示，不能直接视为与传感器结构无关、经过统一物理标定的力向量。

每步动作包含相对腕部平移、连续 6 维旋转表示，以及 22 个绝对手指关节目标：

$$
a_t\in\mathbb R^{31},\qquad
A_t=a_{t:t+15},\qquad
Y_t=Z_{t+1:t+16}.
$$

人类运动提供训练目标，部署时则将预测结果按机器人的统计量反归一化，转换成可执行指令。两种具身分别使用自己的 min–max 归一化参数。

第 III 节明确说明，五项任务**每项有 1,000 条人类示范与 150 条机器人示范**。人类数据改变物体实例、背景和手套外观，机器人示范的采集条件更固定。按每项任务的定义计算，总计为 5,000 条人类示范和 750 条机器人示范。

## 一个小预测分支怎样改变视觉表示

从头训练的 ViT-S/8 将当前腕部图像编码为 384 维向量，与触觉 token 拼接：

$$
Z=[f_\theta(I_t);Z_t]\in\mathbb R^{404}.
$$

FiLM 条件化扩散 U-Net 预测 16 步动作块；独立的两层 MLP 从无噪声条件直接回归全部 $16\times20$ 个未来触觉值。触觉头不进入动作去噪轨迹，因此它的误差不会逐步注入反向扩散，但其梯度仍会更新共享视觉编码器。

训练损失为：

$$
\mathcal L=
\tfrac12\operatorname{MSE}(\epsilon_{\rm wrist},\hat\epsilon_{\rm wrist})
+\tfrac12\operatorname{MSE}(\epsilon_{\rm hand},\hat\epsilon_{\rm hand})
+0.2\operatorname{MSE}(\hat Y_t,N_e(Y_t)).
$$

腕部和手指误差先分别在组内平均，再赋予相同权重，避免 22 个手指通道仅因维度更多就压过九个腕部通道。$N_e$ 表示对应具身的归一化。

每项任务单独训练一个模型，在一次训练中混合人类与机器人数据。两种数据源的采样概率各为一半，不随数据量比例变化。训练使用 300 个 epoch、250 的 batch size 和 50 个扩散噪声等级。部署采用 16 步 DDIM，生成 16 步动作后执行前八步，再重新观测。预测触觉只作为辅助输出，当前触觉测量仍是策略输入。

## 实验究竟给什么打分

每种方法在每项任务上进行十次真机试验，随机改变物体位置与高度。评分允许部分完成：翻页任务中，分离书页得到 0.3，翻动多页得到 0.7，准确翻动一页才得到 1.0。

| 配置 | 平均分阶段得分 |
|---|---:|
| ViTacFormer | 1% |
| Reactive Diffusion Policy | 14% |
| T-Rex | 29% |
| UVTA 移除未来触觉预测 | 42% |
| 仅视觉消融 | 26% |
| 加入本体感知条件 | 18% |
| 完整 UVTA | 70% |

完整模型在翻页、拧灯泡、拨开关、球体分类和滴管转移液体上的得分依次为 83%、80%、88%、56%、44%。这些数字采用原表的取整结果。

数据扩展实验固定每项任务 150 条机器人示范，在三项任务上改变人类示范量。当每项人类轨迹为 0、250、500、750、1,000 条时，平均得分依次为 0%、8%、29%、51%、84%。这支持“在已测试范围内持续受益”，还不足以推出范围之外的 scaling law。仅使用人类数据的消融也得到零分。

加入本体感知后的退步尤其明显。作者观察到策略倾向于重放近乎固定的轨迹，并认为模型过度依赖当前状态。这是该联合训练配置中的结果，不能推广为机器人策略普遍不应使用本体感知。

## 哪部分值得复用

值得尝试的设计是：通过未来触觉监督塑造视觉表示，同时保持执行端的动作接口简单。它依赖的对齐工作并不少，包括相机位置、触觉分区、腕部坐标系、手部运动学、时间同步和分具身归一化。

我会先复现未来触觉预测消融，再考虑扩大模型；评测时同时报告完整成功率和分阶段得分，并增加每项任务的试验次数。这样才能区分策略是否学到了有效的接触动态，还是主要在较小评测预算内获得了更多中间进展。

</div>
