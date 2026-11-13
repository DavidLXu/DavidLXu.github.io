---
title: "[Paper Notes] In-Context Robot Learning with VLM Agents"
date: 2026-09-20
permalink: /posts/2026/09/gpt-policy-in-context-robot-learning-paper-notes/
excerpt: "GPT-Policy turns demonstrations and live feedback into context for a fixed VLM, lets it request robot-tool actions, and checks execution in a constrained controller. Real-robot ablations show context can help, while contact-sensitive failures remain."
tags:
  - Paper Notes
  - Robot Learning
  - In-Context Learning
  - Vision-Language Models
  - VLM Agents
  - Robot Control
---

<div data-lang="en" markdown="1">

**GPT-Policy** asks how much a general-purpose vision-language model can learn at deployment time from a video, a goal image and its own execution history. The model weights stay fixed. A context compiler keeps the transitions that define a task, the VLM requests robot-tool actions, and a constrained controller converts accepted requests into motion and returns an execution result.

Dongzhou Cheng, Taoran Yi, Ye Fang, Xingwu Zhang, Fan Feng, Yixuan Li, Gengxiong Zhuang, Rongze Wang, Shuai Yang, Wei Song, Weizhi Xue, Minyan Wu, Jie Gui, Jiaqi Wang and Tong Wu. [arXiv:2609.19138v1](https://arxiv.org/abs/2609.19138v1), September 16, 2026 · [Code](https://github.com/cheng-haha/GPT-Policy) · [Project page](https://cheng-haha.github.io/GPT-Policy/)

### Adaptation as a context problem

At decision step $t$, the policy receives an instruction $T$, the current image and robot state $o_t=(I_t,s_t)$, available context $c_t$, and the previous tool result $f_{t-1}$. It samples an action $a_t=(u_t,v_t)$, where $u_t$ names a tool and $v_t$ supplies its arguments:

$$
a_t\sim\pi_\theta(\cdot\mid T,c_t,o_t,f_{t-1}),
\qquad
(o_{t+1},f_t)=\mathcal E(a_t,o_t).
$$

The parameters $\theta$ remain fixed. The execution interface $\mathcal E$ can accept, reject or interrupt a request, so the next decision can use information the model did not have when it proposed the action. This loop separates semantic decisions from geometry and timing. The VLM selects an object or a motion target; the adapter handles coordinate transforms, inverse kinematics, bounds and measured execution status.

### Keeping the task in a finite context

The context compiler selects keyframes around approach, contact, grasp, release and changes in bimanual support. Appendix C describes candidate selection inside overlapping video windows followed by a global pass that removes redundant holds. A reference is capped at 24 keyframes and 48 images, each within 1,280 pixels per side without upscaling. Images are interleaved with timestamps, camera labels and available stage annotations.

That compression keeps procedure visible without replaying the whole video on every request. It also introduces a design choice: the compiler must know which transitions matter. A smooth segment may consume no images, while a brief contact event may deserve several. The paper evaluates this trade-off through context ablations, but the compiler itself remains part of the system and cannot be treated as a neutral token-saving layer.

### From a tool request to a timed trajectory

The VLM can ask for end-effector motion, gripper changes or a planned Cartesian path. The controller then solves inverse kinematics, checks the requested target, schedules execution and reports the realized result. Motion duration can depend on distance. Bimanual movement is planned independently and synchronized to the longer side, with streaming joint references at 100 Hz on the I2RT/YAM setup.

The checks control the sampled reference; they do not guarantee the final physical outcome. The Cartesian planner does not perform collision checking. The paper reports repeated dual-arm collisions and calls for a separate safety layer. Reaching a commanded pose also does not prove that a plug seated correctly or that an object remains held. These distinctions matter when interpreting a successful tool call as a successful task transition.

### What controlled comparisons show

The clearest evidence comes from small real-robot comparisons, each condition repeated three times.

| Task | Context | Successes |
|---|---|---:|
| Pick up a red towel | No demonstration | 0/3 |
| Pick up a red towel | Human video | 2/3 |
| Pick up a notebook | No demonstration | 0/3 |
| Pick up a notebook | Human video | 2/3 |
| Fasten a bottle cap | Robot video | 2/3 |
| Fasten a bottle cap | Robot video + action records | 3/3 |
| Remove and reinsert a plug | Robot video | 0/3 |
| Remove and reinsert a plug | Robot video + action records | 2/3 |

Human video has no robot action labels, so the towel and notebook results support transfer from visual procedure to physical behavior. The plug task exposes a harder boundary: watching the motion alone produced no successes in these trials, while aligned numerical references improved completion to two of three. That evidence supports the authors' argument that contact-sensitive tasks benefit from state and action records, but three trials per condition leave uncertainty around each rate.

The remaining six tasks reached 3/3 in their selected context conditions, including goal images, self-history, human interaction and pointing at fruit. The paper does not report matched no-context controls for all of them, so those successes show capability without isolating which part of the context caused it. Table 2's single-run progress comparisons cover a different statistic from the multi-trial success rates and are not enough to rank models.

### Deployment details and limits

The public repository exposes input preparation, protocols, planning, recording and adapters under `src/gpt_policy/`. Published hardware integrations cover ARX X5 and I2RT/YAM; the paper also describes Morphi Kino. The release omits on-site calibration, full demonstration recordings, run logs and the complete evaluation environment.

Contact, completion verification, collision handling and long-horizon reliability remain the main open problems. The VLM can interpret the scene and request an action, while precise physical execution still depends on the controller and a safety layer that the paper says is missing. For follow-up work, I would hold the keyframes and annotations fixed, add measured state and command records one at a time, and test whether the gains survive new layouts. A second experiment should compare direct VLM pose requests with a local contact controller that returns explicit grasp or insertion evidence.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

**GPT-Policy** 研究通用视觉语言模型能在部署时从视频、目标图像和自己的执行历史中学到多少。模型权重保持不变。上下文编译器保留定义任务所需的关键转变，VLM 请求机器人工具动作，受约束控制器把合法请求转换为运动，并把执行结果返回模型。

作者为 Dongzhou Cheng、Taoran Yi、Ye Fang、Xingwu Zhang、Fan Feng、Yixuan Li、Gengxiong Zhuang、Rongze Wang、Shuai Yang、Wei Song、Weizhi Xue、Minyan Wu、Jie Gui、Jiaqi Wang 和 Tong Wu。[arXiv:2609.19138v1](https://arxiv.org/abs/2609.19138v1)，2026 年 9 月 16 日 · [代码](https://github.com/cheng-haha/GPT-Policy) · [项目页](https://cheng-haha.github.io/GPT-Policy/)

### 把适应写成上下文问题

在第 $t$ 个决策步，策略接收任务 $T$、当前图像与机器人状态 $o_t=(I_t,s_t)$、可用上下文 $c_t$ 和上一轮工具结果 $f_{t-1}$。模型生成动作 $a_t=(u_t,v_t)$，其中 $u_t$ 是工具名，$v_t$ 是参数：

$$
a_t\sim\pi_\theta(\cdot\mid T,c_t,o_t,f_{t-1}),
\qquad
(o_{t+1},f_t)=\mathcal E(a_t,o_t).
$$

参数 $\theta$ 固定不变。执行接口 $\mathcal E$ 可以接受、拒绝或中断请求，因此下一轮决策能够使用模型提出动作时尚不知道的信息。这个循环把语义判断与几何、时序控制分开。VLM 选择物体或运动目标，适配器负责坐标转换、逆运动学、边界检查和实际执行状态。

### 用有限上下文保留任务过程

上下文编译器围绕接近、接触、抓取、释放和双臂支撑变化选择关键帧。附录 C 先在相互重叠的视频窗口中筛选候选，再做全局检查，删除冗余的静止片段。每次参考最多包含 24 个关键帧和 48 张图，图像单边限制在 1,280 像素以内，也不进行上采样。图像与时间戳、相机标签和已有阶段注释交错排列。

这种压缩让模型每次请求都看得到任务过程，无需反复传完整视频。它也引入一个设计选择：编译器必须判断哪些转变重要。平滑运动可能一张图都不需要，短暂接触事件可能值得多张。论文用上下文消融评估收益，不过编译器本身也是系统的一部分，不能简单当成中性的省 token 模块。

### 工具请求怎样变成有时序的轨迹

VLM 可以请求末端运动、夹爪变化或规划好的笛卡尔路径。控制器随后求解逆运动学，检查目标，安排执行，并报告实际结果。运动时长可以随距离变化。双臂分别规划后，较短的片段拉伸到与较长片段同步；I2RT/YAM 以 100 Hz 流式下发关节参考。

这些检查约束的是采样参考轨迹，不能保证最终物理结果。笛卡尔规划器不进行碰撞检查。论文报告了反复出现的双臂碰撞，并提出需要独立安全层。到达命令位姿也不能证明插头已经插好或物体仍被可靠抓住。把一次成功工具调用理解为一次成功任务转变，会高估系统能力。

### 对照实验说明了什么

最清楚的证据来自小规模真机对照，每个条件重复三次。

| 任务 | 上下文 | 成功次数 |
|---|---|---:|
| 拿红毛巾 | 无示范 | 0/3 |
| 拿红毛巾 | 人类视频 | 2/3 |
| 拿笔记本 | 无示范 | 0/3 |
| 拿笔记本 | 人类视频 | 2/3 |
| 拧瓶盖 | 机器人视频 | 2/3 |
| 拧瓶盖 | 机器人视频 + 动作记录 | 3/3 |
| 拔出并重新插入插头 | 机器人视频 | 0/3 |
| 拔出并重新插入插头 | 机器人视频 + 动作记录 | 2/3 |

人类视频没有机器人动作标签，毛巾和笔记本结果支持从视觉流程迁移到实际行为。插头任务展示了更难边界：这些试验里仅观察运动没有成功，加入对齐的数值参考后达到三次中的两次。结果支持作者关于接触敏感任务需要状态与动作记录的解释，每个条件三次试验仍让成功率有较大不确定性。

其余六个任务在各自上下文条件下均为 3/3，条件包括目标图像、自身历史、人机交互和指向水果拾取。论文没有为全部任务提供匹配的无上下文对照，因此这些结果证明能力存在，尚未分离上下文各部分的因果贡献。表 2 的单次运行进度比较与多次试验成功率是不同统计量，也不足以给模型排名。

### 代码覆盖范围与限制

公开仓库在 `src/gpt_policy/` 下提供输入准备、协议、规划、记录和适配器。发布内容中的硬件集成覆盖 ARX X5 与 I2RT/YAM；论文还描述了 Morphi Kino。代码没有包含现场标定、完整示范记录、运行日志和完整评测环境。

接触控制、完成状态验证、碰撞处理和长时可靠性仍是主要问题。VLM 能解释场景并提出动作，精确物理执行仍依赖控制器，以及论文明确指出缺失的独立安全层。后续实验可以先固定关键帧和注释，逐项加入实测状态与命令记录，再测试收益能否迁移到新布局。另一项实验应比较直接请求位姿与使用局部接触控制器返回明确抓取、插入证据两种方案。

</div>
