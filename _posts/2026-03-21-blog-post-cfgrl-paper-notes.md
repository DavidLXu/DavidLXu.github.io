---
title: "[Paper Notes] CFGRL: Diffusion Guidance Is a Controllable Policy Improvement Operator"
date: 2026-03-21
permalink: /posts/2026/03/cfgrl-paper-notes/
tags:
  - Reinforcement Learning
  - Offline RL
  - Diffusion Models
  - Policy Improvement
  - Goal-Conditioned RL
  - Paper Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

**CFGRL** derives a direct, principled connection between **classifier-free guidance (CFG) in diffusion models** and **policy improvement in RL**. The key insight: a policy can be factored as `prior x optimality`, and the guidance weight `w` in CFG directly controls the degree of policy improvement — provably. This means:

- Train with the simplicity of **supervised learning** (conditional diffusion/flow matching)
- Get policy improvement **for free** at test time by tuning the guidance weight `w` — no retraining needed
- Works as a drop-in replacement for advantage-weighted regression (AWR) in offline RL
- Especially powerful for **goal-conditioned BC (GCBC)**: standard GCBC is just CFGRL with `w=1`; setting `w>1` provably improves the policy, often doubling success rates — **without learning any value function**

## Paper Info

- **Title**: Diffusion Guidance Is a Controllable Policy Improvement Operator
- **Authors**: Kevin Frans*, Seohong Park*, Pieter Abbeel, Sergey Levine
- **Affiliation**: UC Berkeley
- **Date**: 2025-05-29
- **Venue**: arXiv preprint, under review
- **arXiv**: [2505.23458](https://arxiv.org/abs/2505.23458)
- **Code**: [github.com/kvfrans/cfgrl](https://github.com/kvfrans/cfgrl)

## 1. Motivation

Two ends of the spectrum for learning from offline data:

| Approach | Training | Optimality | Scalability |
|---|---|---|---|
| **Behavioral cloning** | Simple (supervised) | Only as good as data | Excellent |
| **Offline RL** | Complex (value functions, policy gradients) | Can improve beyond data | Notoriously tricky |

Can we get policy improvement while keeping the simplicity of supervised learning?

## 2. Core Idea: Product Policies

Define an improved policy as a **product** of two factors:

\\(\pi(a|s) \propto \hat{\pi}(a|s) \cdot f(A^{\hat{\pi}}(s,a))\\)

where \\(\hat{\pi}\\) is the reference (behavior) policy and \\(f\\) is a non-negative, monotonically increasing function of the advantage \\(A^{\hat{\pi}}(s,a)\\).

**Theorem 1 (Policy Improvement)**: If \\(f\\) is non-negative and non-decreasing in advantage, then the product policy \\(\pi\\) is guaranteed to improve over \\(\hat{\pi}\\):

\\(J(\pi) \geq J(\hat{\pi})\\)

**Theorem 2 (Controllable Improvement)**: For \\(0 \leq w_1 < w_2\\), the attenuated product \\(\pi_{w_2}(a|s) \propto \hat{\pi}(a|s) f(A(s,a))^{w_2}\\) is a further improvement over \\(\pi_{w_1}\\):

\\(J(\pi_{w_1}) \leq J(\pi_{w_2})\\)

Higher `w` = more improvement (but also more divergence from reference → eventual distribution shift).

## 3. Connection to Diffusion Guidance

The product policy's score function decomposes additively:

\\(\nabla_a \log \pi(a|s) = \nabla_a \log \hat{\pi}(a|s) + \nabla_a \log p(o|s,a)\\)

Using classifier-free guidance (Bayes' rule trick), this becomes:

\\(\nabla_a \log \hat{\pi}(a|s) + w \cdot (\nabla_a \log \hat{\pi}(a|s, o) - \nabla_a \log \hat{\pi}(a|s))\\)

This is exactly the standard CFG formula! The guidance weight `w` directly controls the degree of policy improvement. Both the unconditional and conditional scores come from **the same network** trained with a simple flow matching objective:

\\(\mathcal{L}(\theta) = \mathbb{E}_{s,a \sim \mathcal{D}} \|v_\theta(a_t, t, s, o) - (a - a_0)\|^2\\)

where \\(o \in \{\emptyset, 0, 1\}\\) is the optimality label (with 10% dropout for unconditional training).

### Why this matters vs. AWR

| Property | AWR | CFGRL |
|---|---|---|
| Temperature/weight | \\(1/\beta\\) (fixed at train time) | \\(w\\) (tunable at test time) |
| Gradient distribution | Dominated by outlier high-advantage samples | Even weighting across batch |
| Retraining needed to tune? | Yes | **No** |
| Empirical scaling | Saturates around \\(1/\beta = 10\\) | Continues improving beyond |

## 4. Special Case: Goal-Conditioned BC (GCBC)

This is where CFGRL truly shines. Standard GCBC trains a goal-conditioned policy \\(\pi(a|s,g)\\). The paper makes the connection more explicit than most prior GCBC writeups:

\\(\pi(a|s, g) = \frac{\hat{\pi}(a|s)\, p_\gamma(g|s,a)}{p_\gamma(g|s)} \propto \hat{\pi}(a|s) \cdot Q^{\hat{\pi}}(s, a, g)\\)

The second factor satisfies the conditions of Theorem 1. Therefore:

- **Standard GCBC = CFGRL with w=1** (implicit, no improvement)
- **CFGRL with w>1 = provably improved GCBC** — for free!

The sampling formula is simply:

\\(\nabla_a \log \hat{\pi}(a|s) + w \cdot (\nabla_a \log \pi(a|s, g) - \nabla_a \log \hat{\pi}(a|s))\\)

**No value function needed.** Just train a goal-conditioned flow policy and an unconditional flow policy (same network with dropout), then tune `w` at test time.

## 5. Key Results

### Offline RL (ExORL benchmark, with learned value function)

CFGRL consistently outperforms AWR on most tasks:

| Task | AWR | CFGRL |
|---|---|---|
| walker-stand | 603 | **782** |
| walker-walk | 444 | **608** |
| walker-run | 247 | **282** |
| quadruped-run | 485 | **571** |
| cheetah-run | 168 | **216** |
| cheetah-run-backward | 146 | **262** |
| jaco-reach-top-right | 33 | **72** |

### Goal-Conditioned BC (OGBench, no value function)

CFGRL as drop-in GCBC improvement (selected results, flat policies):

| Task | Flow GCBC | CFGRL | Improvement |
|---|---|---|---|
| pointmaze-large-navigate | 74 | **77** | +4% |
| pointmaze-giant-navigate | 4 | **30** | **7.5x** |
| antmaze-medium-navigate | 42 | **53** | +26% |
| humanoidmaze-medium-navigate | 8 | **19** | **2.4x** |
| visual-cube-single-play | 13 | **37** | **2.8x** |
| visual-scene-play | 25 | **40** | +60% |

One detail I found especially convincing in the PDF is that these gains are not coming from heavy per-task retuning. For the main GCBC table, the authors use a single fixed guidance strength of `w = 3` and still get broad improvements across state-based and pixel-based tasks.

With hierarchical policies (HCFGRL), gains are even larger:

| Task | Flow HGCBC | HCFGRL |
|---|---|---|
| antmaze-medium-navigate | 67 | **90** |
| antmaze-large-navigate | 61 | **78** |
| antmaze-giant-navigate | 14 | **38** |
| humanoidmaze-large-navigate | 11 | **38** |
| cube-double-play | 21 | **42** |

### Scaling behavior

The guidance weight `w` provides a reliable knob:

- Performance steadily increases with `w` up to a divergence point
- The divergence point is further out than AWR's temperature saturation
- `w` can be swept **without retraining** — just re-run inference

## 6. Strengths

- **Elegant theory**: clean, provable connection between CFG and policy improvement with formal guarantees (Theorems 1 & 2)
- **Extreme simplicity**: train conditional diffusion/flow model with supervised loss → tune `w` at test time → done
- **No value function needed** for GCBC setting — improvement literally comes for free
- **Test-time tunable**: unlike AWR where \\(\beta\\) is baked into training, `w` can be swept without retraining
- **Fixes AWR's gradient issue**: even gradient magnitudes across batch vs. outlier-dominated in AWR
- **Broad applicability**: state-based, visual, hierarchical, offline RL, goal-conditioned settings

## 7. Limitations

- **One-step improvement only**: CFGRL provides one step of policy improvement over the reference, not iterative optimization — not a full RL algorithm
- **Distribution shift at high `w`**: theoretical guarantees hold but practical performance degrades when `w` is too large (divergence from reference)
- **Assumes a separate value-learning story in offline RL**: in the AWR-style setting, CFGRL replaces policy extraction, not the upstream Q / V training pipeline
- **Requires offline data quality**: still fundamentally limited by the support of the dataset — can improve suboptimal data but can't discover entirely new behaviors
- **Not SOTA offline RL**: the authors explicitly note CFGRL is a tool (replacing AWR), not a complete offline RL system — advanced methods like policy gradients could extrapolate further

## 8. Takeaways

1. **CFG = policy improvement**: diffusion guidance weight directly and provably controls the degree of policy improvement — one of the cleanest theory-to-practice connections in recent RL
2. **GCBC users: use guidance!** Standard GCBC is CFGRL with `w=1`. Setting `w>1` is a free lunch — no value function, no retraining, often 2-3x success rate
3. **Test-time controllability is underrated**: being able to sweep the optimality-regularization tradeoff without retraining is enormously practical
4. **Supervised learning + guidance can go beyond imitation**: this bridges the gap between behavioral cloning and RL in an elegant way
5. **Implications for robotics**: diffusion/flow policies are already dominant in robot learning (pi0, etc.) — CFGRL suggests that guidance could be a simple way to improve them beyond the demonstration data

## References

- [Paper] [arXiv:2505.23458](https://arxiv.org/abs/2505.23458)
- [Code] [github.com/kvfrans/cfgrl](https://github.com/kvfrans/cfgrl)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

**CFGRL** 推导出了**扩散模型中的无分类器引导（CFG）**与 **RL 中的策略改进**之间的直接、严格的联系。核心洞察：策略可以分解为 `先验 x 最优性`，CFG 中的引导权重 `w` 直接且可证明地控制策略改进的程度。这意味着：

- 以**监督学习**的简洁性训练（条件扩散/flow matching）
- 在测试时通过调节引导权重 `w` **免费获得**策略改进——无需重新训练
- 可作为离线 RL 中优势加权回归（AWR）的即插即用替代
- 对**目标条件行为克隆（GCBC）**尤其强大：标准 GCBC 就是 `w=1` 的 CFGRL；设置 `w>1` 可证明地改进策略，成功率常常翻倍——**无需学习任何价值函数**

## 论文信息

- **标题**: Diffusion Guidance Is a Controllable Policy Improvement Operator
- **作者**: Kevin Frans*, Seohong Park*, Pieter Abbeel, Sergey Levine
- **机构**: UC Berkeley
- **日期**: 2025-05-29
- **形式**: arXiv 预印本，under review
- **arXiv**: [2505.23458](https://arxiv.org/abs/2505.23458)
- **代码**: [github.com/kvfrans/cfgrl](https://github.com/kvfrans/cfgrl)

## 1. 动机

从离线数据学习的两个极端：

| 方法 | 训练 | 最优性 | 可扩展性 |
|---|---|---|---|
| **行为克隆** | 简单（监督学习） | 仅与数据一样好 | 优秀 |
| **离线 RL** | 复杂（价值函数、策略梯度） | 可超越数据 | 出了名的难 |

能否在保持监督学习简洁性的同时获得策略改进？

## 2. 核心思想：乘积策略

定义改进策略为两个因子的**乘积**：

\\(\pi(a|s) \propto \hat{\pi}(a|s) \cdot f(A^{\hat{\pi}}(s,a))\\)

其中 \\(\hat{\pi}\\) 是参考（行为）策略，\\(f\\) 是关于优势 \\(A^{\hat{\pi}}(s,a)\\) 的非负单调递增函数。

**定理 1（策略改进）**：如果 \\(f\\) 关于优势非负且非递减，则乘积策略 \\(\pi\\) 保证改进 \\(\hat{\pi}\\)：

\\(J(\pi) \geq J(\hat{\pi})\\)

**定理 2（可控改进）**：对于 \\(0 \leq w_1 < w_2\\)，衰减乘积 \\(\pi_{w_2}(a|s) \propto \hat{\pi}(a|s) f(A(s,a))^{w_2}\\) 相比 \\(\pi_{w_1}\\) 是进一步的改进：

\\(J(\pi_{w_1}) \leq J(\pi_{w_2})\\)

更高的 `w` = 更多改进（但也更偏离参考策略 → 最终产生分布偏移）。

## 3. 与扩散引导的联系

乘积策略的 score function 可加性分解：

\\(\nabla_a \log \pi(a|s) = \nabla_a \log \hat{\pi}(a|s) + \nabla_a \log p(o|s,a)\\)

利用无分类器引导（贝叶斯规则技巧），变为：

\\(\nabla_a \log \hat{\pi}(a|s) + w \cdot (\nabla_a \log \hat{\pi}(a|s, o) - \nabla_a \log \hat{\pi}(a|s))\\)

这正是标准的 CFG 公式！引导权重 `w` 直接控制策略改进的程度。无条件和条件 score 来自**同一个网络**，用简单的 flow matching 目标训练：

\\(\mathcal{L}(\theta) = \mathbb{E}_{s,a \sim \mathcal{D}} \|v_\theta(a_t, t, s, o) - (a - a_0)\|^2\\)

其中 \\(o \in \{\emptyset, 0, 1\}\\) 是最优性标签（10% 概率 dropout 用于无条件训练）。

### 相比 AWR 的优势

| 属性 | AWR | CFGRL |
|---|---|---|
| 温度/权重 | \\(1/\beta\\)（训练时固定） | \\(w\\)（测试时可调） |
| 梯度分布 | 被少数高优势样本主导 | 批次内均匀加权 |
| 调参需要重新训练？ | 是 | **否** |
| 经验扩展性 | 在 \\(1/\beta = 10\\) 左右饱和 | 持续改进 |

## 4. 特殊情况：目标条件行为克隆（GCBC）

这是 CFGRL 真正闪光的地方。标准 GCBC 训练目标条件策略 \\(\pi(a|s,g)\\)，而论文把这个关系写得比很多以往 GCBC 文章都更直接：

\\(\pi(a|s, g) = \frac{\hat{\pi}(a|s)\, p_\gamma(g|s,a)}{p_\gamma(g|s)} \propto \hat{\pi}(a|s) \cdot Q^{\hat{\pi}}(s, a, g)\\)

第二个因子满足定理 1 的条件。因此：

- **标准 GCBC = w=1 的 CFGRL**（隐式，无改进）
- **w>1 的 CFGRL = 可证明改进的 GCBC**——免费获得！

采样公式很简单：

\\(\nabla_a \log \hat{\pi}(a|s) + w \cdot (\nabla_a \log \pi(a|s, g) - \nabla_a \log \hat{\pi}(a|s))\\)

**不需要价值函数。**只需训练一个目标条件 flow 策略和一个无条件 flow 策略（同一网络加 dropout），然后在测试时调节 `w`。

## 5. 核心结果

### 离线 RL（ExORL 基准，使用学到的价值函数）

CFGRL 在大多数任务上持续优于 AWR：

| 任务 | AWR | CFGRL |
|---|---|---|
| walker-stand | 603 | **782** |
| walker-walk | 444 | **608** |
| quadruped-run | 485 | **571** |
| cheetah-run-backward | 146 | **262** |
| jaco-reach-top-right | 33 | **72** |

### 目标条件 BC（OGBench，无价值函数）

CFGRL 作为 GCBC 的即插即用改进（部分结果）：

| 任务 | Flow GCBC | CFGRL | 提升 |
|---|---|---|---|
| pointmaze-giant-navigate | 4 | **30** | **7.5x** |
| antmaze-medium-navigate | 42 | **53** | +26% |
| humanoidmaze-medium-navigate | 8 | **19** | **2.4x** |
| visual-cube-single-play | 13 | **37** | **2.8x** |
| visual-scene-play | 25 | **40** | +60% |

我觉得 PDF 里一个很有说服力的细节是，这些提升并不是靠大量逐任务调参硬凑出来的。作者在 GCBC 主结果表中使用的是一个固定的引导强度 `w = 3`，即便如此，CFGRL 依然在大量 state-based 和 pixel-based 任务上稳定优于基线。

使用分层策略（HCFGRL），增益更大：

| 任务 | Flow HGCBC | HCFGRL |
|---|---|---|
| antmaze-medium-navigate | 67 | **90** |
| antmaze-giant-navigate | 14 | **38** |
| humanoidmaze-large-navigate | 11 | **38** |
| cube-double-play | 21 | **42** |

### 扩展行为

引导权重 `w` 提供了可靠的调节旋钮：

- 性能随 `w` 稳步增加直到发散点
- 发散点比 AWR 的温度饱和点更远
- `w` 可以**无需重新训练**地扫描——只需重新运行推理

## 6. 优势

- **优雅的理论**：CFG 与策略改进之间干净、可证明的联系，有形式化保证（定理 1 & 2）
- **极度简洁**：用监督损失训练条件扩散/flow 模型 → 测试时调 `w` → 完成
- **GCBC 场景无需价值函数**——改进真的是免费的
- **测试时可调**：不同于 AWR 将 \\(\beta\\) 固定在训练中，`w` 可以无需重新训练地扫描
- **修复 AWR 的梯度问题**：批次内均匀梯度 vs. AWR 中被异常值主导
- **广泛适用**：基于状态、视觉、分层、离线 RL、目标条件等多种场景

## 7. 局限性

- **仅一步改进**：CFGRL 提供相对于参考策略的一步策略改进，非迭代优化——不是完整的 RL 算法
- **高 `w` 时的分布偏移**：理论保证成立但实际性能在 `w` 过大时下降
- **在离线 RL 场景里默认上游价值学习已经存在**：CFGRL 替代的是 AWR 这类策略提取步骤，而不是把 Q / V 学习也一起替代掉
- **依赖离线数据质量**：仍根本性地受限于数据集的支撑——可改进次优数据但无法发现全新行为
- **非 SOTA 离线 RL**：作者明确指出 CFGRL 是工具（替代 AWR），不是完整的离线 RL 系统

## 8. 核心要点

1. **CFG = 策略改进**：扩散引导权重直接且可证明地控制策略改进程度——近期 RL 中最干净的理论到实践的联系之一
2. **GCBC 用户：请使用引导！**标准 GCBC 是 `w=1` 的 CFGRL。设置 `w>1` 是免费午餐——无需价值函数、无需重新训练，成功率常常翻 2-3 倍
3. **测试时可控性被低估**：无需重新训练即可扫描最优性-正则化权衡，实用性极强
4. **监督学习 + 引导可超越模仿**：这以优雅的方式弥合了行为克隆与 RL 之间的鸿沟
5. **对机器人学的启示**：扩散/flow 策略在机器人学习中已占主导地位（pi0 等）——CFGRL 表明引导可能是超越演示数据的简单方法

## 参考链接

- [论文] [arXiv:2505.23458](https://arxiv.org/abs/2505.23458)
- [代码] [github.com/kvfrans/cfgrl](https://github.com/kvfrans/cfgrl)

</div>
