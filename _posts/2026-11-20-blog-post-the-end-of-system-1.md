---
title: "The Death of System 1: Why VLA and WAM Imitation Learning Is Fading"
date: 2026-11-20
permalink: /posts/2026/11/the-end-of-system-1/
excerpt: "The robot stack is splitting into two RL problems: a foundation-model brain trained like an LLM, and a dexterous body trained like a controller. The imitation-learned middle is getting squeezed out."
tags:
  - Robot Learning
  - Agentic Robotics
  - Reinforcement Learning
  - Dexterous Hands
  - Personal Thoughts
---

<link rel="stylesheet" href="{{ '/assets/css/system1-essay.css' | relative_url }}">

<div class="system1-essay" markdown="0">
<p class="kicker ui"><span data-lang="en">Paradigm Shift · Embodied AI</span><span data-lang="zh" style="display: none;">范式转移 · 具身智能</span></p>
<h1>
  <span data-lang="en">The Death of System 1: Why VLA and WAM Imitation Learning Is Fading</span>
  <span data-lang="zh" style="display: none;">System 1 之死：为什么 VLA 与 WAM 模仿学习正在消亡</span>
</h1>
<p class="dek">
  <span data-lang="en">The robot stack is splitting into two RL problems: a foundation-model brain trained like an LLM, and a dexterous body trained like a controller. The imitation-learned middle is getting squeezed out.</span>
  <span data-lang="zh" style="display: none;">机器人系统正在被拆成两个强化学习问题：一个像大模型一样后训练的“大脑”，一个像控制器一样训练的灵巧“身体”。夹在中间、靠模仿学习训练出来的那一层，正在被挤出去。</span>
</p>
<p class="meta ui"><span data-lang="en">November 2026 · ~10 min read</span><span data-lang="zh" style="display: none;">2026 年 11 月 · 约 10 分钟阅读</span></p>

<div class="tldr">
  <div data-lang="en">
    <p><strong>TL;DR</strong></p>
    <ul>
      <li><strong>System 2</strong> (reasoning, planning, verifying) is now trained with the same RL post-training recipe as frontier LLMs. MIT HAN Lab's PEAR trains a reasoning model in simulation to drive real robot arms directly, with no demonstrations.</li>
      <li><strong>System 0</strong> (fast, contact-rich body control) is trained with large-scale sim RL for dexterous hands.</li>
      <li><strong>System 1</strong>, the imitation-learned VLA / world-action-model policy in between, is losing its reason to exist.</li>
      <li>My bet: even <strong>touch</strong> may not need its own learned perception layer. A foundation model plus a reflexive RL controller could cover most of it.</li>
    </ul>
  </div>
  <div data-lang="zh" style="display: none;">
    <p><strong>一句话总结</strong></p>
    <ul>
      <li><strong>System 2</strong>（推理、规划、验证）现在直接用前沿大模型的 RL 后训练方法来训。MIT HAN Lab 的 PEAR 在仿真里训练推理模型，让它直接操控真实机械臂，全程不用一条示教数据。</li>
      <li><strong>System 0</strong>（高频、接触密集的身体控制）用大规模仿真 RL 训练灵巧手。</li>
      <li>夹在中间、靠模仿学习训练的 <strong>System 1</strong>（VLA / 世界动作模型 WAM）正在失去存在的理由。</li>
      <li>我的判断：甚至连<strong>触觉</strong>也未必需要单独学一层感知，基座模型加上反射式的 RL 控制器，可能就能覆盖大部分需求。</li>
    </ul>
  </div>
</div>

<!-- 1 -->
<h2><span class="n ui">01</span>
  <span data-lang="en">The three-layer picture</span>
  <span data-lang="zh" style="display: none;">三层结构</span>
</h2>
<div data-lang="en">
  <p>For the past three years, the default robot-learning stack looked like a sandwich. A large vision-language model on top (<strong>System 2</strong>) read the instruction and decided what to do. A low-level controller at the bottom (<strong>System 0</strong>) tracked joint targets at hundreds of hertz. In the middle sat <strong>System 1</strong>: a vision-language-action model (VLA) or, more recently, a world action model (WAM) that predicts future frames and actions together. System 1 turned "pick up the red cup" into a stream of end-effector poses.</p>
  <p>System 1 was where most of the money went. It was trained by <strong>imitation learning</strong>: collect teleoperated demonstrations, behavior-clone them, scale the dataset, repeat. The bet was that enough demonstrations would yield a generalist policy, the way enough text yielded GPT.</p>
  <p>Two things have broken that bet. The top layer learned to act on its own, and the bottom layer learned to handle contact on its own.</p>
</div>
<div data-lang="zh" style="display: none;">
  <p>过去三年，机器人学习的默认架构像一个三明治。最上层是大型视觉语言模型（<strong>System 2</strong>），负责读懂指令、决定做什么；最下层是底层控制器（<strong>System 0</strong>），以几百赫兹跟踪关节目标；中间是 <strong>System 1</strong>：视觉-语言-动作模型（VLA），或者最近流行的、同时预测未来画面和动作的世界动作模型（WAM）。System 1 负责把“拿起红杯子”翻译成一连串末端执行器位姿。</p>
  <p>绝大部分投入都砸在了 System 1 上。它的训练方式是<strong>模仿学习</strong>：采集遥操作示教，做行为克隆，扩大数据集，循环往复。背后的赌注是：示教数据足够多，就能长出一个通用策略，就像文本足够多就长出了 GPT。</p>
  <p>这个赌注现在被两件事打破了：上层自己学会了动手，下层自己学会了处理接触。</p>
</div>

<figure>
  <div class="stacks ui">
    <div class="stack">
      <h4><span data-lang="en">2023–2025: policy-centric</span><span data-lang="zh" style="display: none;">2023–2025：以策略为中心</span></h4>
      <div class="layer L2"><b>System 2 · VLM</b><small><span data-lang="en">Reads intent, plans in language</span><span data-lang="zh" style="display: none;">理解意图，用语言规划</span></small></div>
      <div class="arrow">↓ <span data-lang="en">subgoal text</span><span data-lang="zh" style="display: none;">子目标文本</span></div>
      <div class="layer L1"><b>System 1 · VLA / WAM</b><small><span data-lang="en">Imitation learning on teleop demos</span><span data-lang="zh" style="display: none;">基于遥操作示教的模仿学习</span></small></div>
      <div class="arrow">↓ <span data-lang="en">action chunks</span><span data-lang="zh" style="display: none;">动作块</span></div>
      <div class="layer L0"><b>System 0 · Controller</b><small><span data-lang="en">PD / IK / impedance</span><span data-lang="zh" style="display: none;">PD / 逆运动学 / 阻抗控制</span></small></div>
    </div>
    <div class="stack">
      <h4><span data-lang="en">2026→: agentic</span><span data-lang="zh" style="display: none;">2026 起：智能体化</span></h4>
      <div class="layer L2 big"><b>System 2 · Reasoning model</b><small><span data-lang="en">RL post-trained in simulation, like LLM computer-use; outputs poses or calls skills directly</span><span data-lang="zh" style="display: none;">像大模型学会用电脑一样，在仿真里 RL 后训练；直接输出位姿或调用技能</span></small></div>
      <div class="layer L1 fade"><b>System 1 · VLA / WAM</b><small><span data-lang="en">Shrinks to optional callable tools</span><span data-lang="zh" style="display: none;">退化为可选的调用工具</span></small></div>
      <div class="arrow">↓ <span data-lang="en">poses · skill calls · code</span><span data-lang="zh" style="display: none;">位姿 · 技能调用 · 代码</span></div>
      <div class="layer L0"><b>System 0 · Dexterous RL policy</b><small><span data-lang="en">Sim-to-real RL for hands; local reflexes handle contact</span><span data-lang="zh" style="display: none;">灵巧手仿真到真实 RL；局部反射处理接触</span></small></div>
    </div>
  </div>
  <figcaption>
    <span data-lang="en">Figure 1. The middle layer gets hollowed out from both sides. Layer names follow the S0/S1/S2 split in Grid Robotics' "Envisioning Agentic Robotics."</span>
    <span data-lang="zh" style="display: none;">图 1：中间层被上下两端同时掏空。层级命名沿用 Grid Robotics《Envisioning Agentic Robotics》中的 S0/S1/S2 划分。</span>
  </figcaption>
</figure>

<!-- 2 -->
<h2><span class="n ui">02</span>
  <span data-lang="en">System 2 learns to act: RL post-training, not demonstrations</span>
  <span data-lang="zh" style="display: none;">System 2 学会动手：靠 RL 后训练，而不是示教</span>
</h2>
<div data-lang="en">
  <p>The clearest signal comes from MIT HAN Lab's <a href="https://mit-han-lab.github.io/pear-blog/" target="_blank" rel="noopener">PEAR</a>, titled "Training Reasoning Models in Simulation to Natively Use Real Robots." The framing is simple: the model uses a robot the way a computer-use agent uses a computer. Each round it observes, reasons in a chain of thought, and writes the next end-effector pose for each arm. Inverse kinematics and the arm controller do the rest. There is no harness and no learned action head in between.</p>
  <p>The training recipe is what matters. They call it <strong>Robot-Use RL</strong>: reinforcement learning on robot tasks in simulation, the same way frontier models learned computer use. It uses <strong>no demonstrations</strong>. The reasoning model is the policy, and the optimizer is the LLM post-training stack the community has spent two years refining.</p>
</div>
<div data-lang="zh" style="display: none;">
  <p>最清晰的信号来自 MIT HAN Lab 的 <a href="https://mit-han-lab.github.io/pear-blog/" target="_blank" rel="noopener">PEAR</a>，题为《在仿真中训练推理模型，原生地使用真实机器人》。思路很直接：模型像“电脑使用智能体”操作电脑一样操作机器人。每一轮它观察环境、用思维链推理，然后为每条机械臂写下下一个末端位姿，剩下的交给逆运动学和机械臂控制器。中间没有外挂框架，也没有额外学习的动作头。</p>
  <p>关键在训练方法。他们称之为 <strong>Robot-Use RL</strong>：在仿真机器人任务上做强化学习，和前沿大模型学会用电脑的方式如出一辙。整个过程<strong>不用任何示教数据</strong>。推理模型本身就是策略，优化器就是社区打磨了两年的大模型后训练那一套。</p>
</div>

<div class="stats ui">
  <div class="stat"><div class="v">1.6% → 74.4%</div><div class="k"><span data-lang="en">LIBERO success, base model → after Robot-Use RL</span><span data-lang="zh" style="display: none;">LIBERO 成功率：基座模型 → Robot-Use RL 后</span></div></div>
  <div class="stat"><div class="v">57.4% vs 0.75%</div><div class="k"><span data-lang="en">New instruction in a familiar scene, PEAR vs π0.5</span><span data-lang="zh" style="display: none;">熟悉场景中的新指令：PEAR 对比 π0.5</span></div></div>
  <div class="stat"><div class="v">0% → 60%</div><div class="k"><span data-lang="en">Real dual-arm robot, trained only in sim</span><span data-lang="zh" style="display: none;">真实双臂机器人，仅在仿真中训练</span></div></div>
  <div class="stat"><div class="v">≈ 0</div><div class="k"><span data-lang="en">Measurable loss on 9 reasoning, coding and vision benchmarks</span><span data-lang="zh" style="display: none;">在 9 项推理、代码、视觉基准上的可测性能损失</span></div></div>
</div>

<div data-lang="en">
  <p>The instruction-following number is the one that should worry VLA builders. π0.5 is a strong imitation-learned VLA, and it scores higher on the in-distribution LIBERO suite (96.9 vs 74.4). Change the instruction inside the same scene and it collapses to under 1%. The RL-trained reasoning model keeps more than half. Imitation learning memorizes the demonstrated mapping. RL on a model that already understands language learns to <em>solve the task</em>.</p>
  <p>The last number matters too. Robot-Use RL did not cost the model its general reasoning. You do not need a separate, smaller, robot-only brain. The same model that writes code and solves math can also move the arm.</p>
</div>
<div data-lang="zh" style="display: none;">
  <p>真正该让 VLA 团队警惕的是指令泛化这组数字。π0.5 是很强的模仿学习 VLA，在分布内的 LIBERO 上得分更高（96.9 对 74.4）。可一旦在同一场景里换一条指令，它就跌到 1% 以下；而 RL 训练出来的推理模型还能保住一半以上。模仿学习记住的是示教里的映射，而在一个本来就懂语言的模型上做 RL，学到的是<em>怎么把任务做成</em>。</p>
  <p>最后一组数字同样关键：Robot-Use RL 没有让模型丢掉通用推理能力。你不再需要一个单独的、更小的、只会干机器人活的大脑。写代码、做数学题的同一个模型，也能直接动手。</p>
</div>

<blockquote>
  <span data-lang="en">Once the System 2 model can emit poses itself, System 1 stops being a necessity and becomes a latency optimization.</span>
  <span data-lang="zh" style="display: none;">一旦 System 2 能自己输出位姿，System 1 就从“必需品”降级成了“延迟优化”。</span>
</blockquote>

<!-- 3 -->
<h2><span class="n ui">03</span>
  <span data-lang="en">System 0 learns contact: dexterous-hand RL</span>
  <span data-lang="zh" style="display: none;">System 0 学会接触：灵巧手 RL</span>
</h2>
<div data-lang="en">
  <p>At the other end, the bottom layer has been absorbing the hard physical part. Contact-rich manipulation, such as in-hand reorientation, regrasping, insertion, and catching slip, was the last strong argument for a learned System 1. A VLM could not possibly reason at 200 Hz about finger forces.</p>
  <p>It doesn't have to. That job is moving into System 0, trained with massively parallel <strong>sim-to-real RL for dexterous hands</strong>. The reward is physical: object pose reached, no drop, bounded force. Domain randomization covers friction, mass and sensor noise. The result is a reflexive controller that accepts a goal like "rotate this 90° about z" or "hold this pose firmly" and handles the contact dynamics locally, faster than any reasoning loop.</p>
  <p>Notice what this does to the interface. System 0 no longer needs a dense stream of action chunks from above. It needs <strong>sparse, semantic goals</strong>: a target pose, a grasp type, a force budget. That is exactly what a reasoning model is good at emitting.</p>
</div>
<div data-lang="zh" style="display: none;">
  <p>另一端，底层正在吞掉最难的物理部分。接触密集的操作，比如手内翻转、重新抓取、插装、防滑，是支持“必须有一个学习型 System 1”的最后一个硬理由：VLM 不可能以 200 Hz 的频率去推理手指受力。</p>
  <p>它也不需要这么做。这部分工作正在下沉到 System 0，用大规模并行的<strong>灵巧手仿真到真实 RL</strong> 来训练。奖励是物理意义上的：物体到达目标位姿、不掉、受力有界。域随机化覆盖摩擦、质量和传感器噪声。最终得到的是一个反射式控制器：它接收“绕 z 轴转 90°”“稳稳保持这个位姿”这样的目标，在本地处理接触动力学，速度比任何推理循环都快。</p>
  <p>注意这对接口意味着什么：System 0 不再需要上层源源不断地给它动作块，它要的是<strong>稀疏的、语义化的目标</strong>：目标位姿、抓取类型、力的预算。而这恰恰是推理模型最擅长输出的东西。</p>
</div>

<!-- 4 -->
<h2><span class="n ui">04</span>
  <span data-lang="en">Why System 1 is dying</span>
  <span data-lang="zh" style="display: none;">为什么 System 1 正在消亡</span>
</h2>
<div data-lang="en">
  <p>Squeeze from above and below, and the imitation-learned middle has very little left to do. The reasons add up:</p>
</div>
<div data-lang="zh" style="display: none;">
  <p>上下两端一挤，靠模仿学习的中间层就没剩下多少活了。原因可以归结为以下几点：</p>
</div>

<div class="tablewrap">
<table>
  <thead><tr>
    <th></th>
    <th><span data-lang="en">Imitation-learned S1 (VLA / WAM)</span><span data-lang="zh" style="display: none;">模仿学习 S1（VLA / WAM）</span></th>
    <th><span data-lang="en">RL-trained S2 + RL-trained S0</span><span data-lang="zh" style="display: none;">RL 训练的 S2 + RL 训练的 S0</span></th>
  </tr></thead>
  <tbody>
    <tr><td><strong><span data-lang="en">Data</span><span data-lang="zh" style="display: none;">数据</span></strong></td>
      <td><span data-lang="en">Teleop demos, linear in human hours</span><span data-lang="zh" style="display: none;">遥操作示教，随人工小时线性增长</span></td>
      <td><span data-lang="en">Simulation rollouts, scale with compute</span><span data-lang="zh" style="display: none;">仿真 rollout，随算力扩展</span></td></tr>
    <tr><td><strong><span data-lang="en">Ceiling</span><span data-lang="zh" style="display: none;">上限</span></strong></td>
      <td><span data-lang="en">Bounded by demonstrator quality</span><span data-lang="zh" style="display: none;">受限于示教者水平</span></td>
      <td><span data-lang="en">Bounded by reward and simulator fidelity</span><span data-lang="zh" style="display: none;">受限于奖励设计和仿真保真度</span></td></tr>
    <tr><td><strong><span data-lang="en">New instructions</span><span data-lang="zh" style="display: none;">新指令</span></strong></td>
      <td><span data-lang="en">Brittle (π0.5: 0.75%)</span><span data-lang="zh" style="display: none;">脆弱（π0.5：0.75%）</span></td>
      <td><span data-lang="en">Inherits LLM language understanding (57.4%)</span><span data-lang="zh" style="display: none;">继承大模型的语言理解（57.4%）</span></td></tr>
    <tr><td><strong><span data-lang="en">Recovery</span><span data-lang="zh" style="display: none;">纠错</span></strong></td>
      <td><span data-lang="en">Only what was demonstrated</span><span data-lang="zh" style="display: none;">只会示教里出现过的</span></td>
      <td><span data-lang="en">Observe → reason → act → verify loop</span><span data-lang="zh" style="display: none;">观察 → 推理 → 执行 → 验证 闭环</span></td></tr>
    <tr><td><strong><span data-lang="en">Tooling</span><span data-lang="zh" style="display: none;">工程生态</span></strong></td>
      <td><span data-lang="en">Robot-specific training stacks</span><span data-lang="zh" style="display: none;">机器人专用训练栈</span></td>
      <td><span data-lang="en">Reuses the LLM RL post-training ecosystem</span><span data-lang="zh" style="display: none;">直接复用大模型 RL 后训练生态</span></td></tr>
  </tbody>
</table>
</div>

<div data-lang="en">
  <p>The deepest reason is the first row. Imitation learning scales with <em>people</em>; RL scales with <em>GPUs</em>. Every lesson from LLMs says the second curve wins. Pre-training on human data got language models to "competent." RL post-training got them to reasoning and agentic computer use. Robotics is replaying that story at the action level: demonstrations bootstrapped the field, and RL is now taking over.</p>
  <p>World action models deserve a specific note. Predicting future video alongside actions is a smart way to squeeze more supervision out of each demonstration. But it is still an answer to "how do we imitate better?" If the frontier question becomes "how do we optimize against outcomes?", a better imitator is solving yesterday's problem. The world-model part may survive as a simulator or a verifier. The action-imitation part is what fades.</p>
</div>
<div data-lang="zh" style="display: none;">
  <p>最根本的原因在第一行：模仿学习随<em>人</em>扩展，RL 随 <em>GPU</em> 扩展。大模型的所有经验都告诉我们，后一条曲线会赢。人类数据上的预训练让语言模型达到“能用”，RL 后训练让它们学会推理和智能体式的电脑操作。机器人领域正在动作层面重演这个故事：示教数据完成了冷启动，接下来是 RL 接管。</p>
  <p>世界动作模型（WAM）值得单独说一句。同时预测未来视频和动作，确实能从每条示教里榨出更多监督信号。但它回答的仍然是“怎么模仿得更好”。如果前沿问题变成了“怎么直接针对结果优化”，那么更好的模仿者就是在解决昨天的问题。世界模型的部分可能会以仿真器或验证器的身份保留下来，真正淡出的是“模仿动作”这一部分。</p>
</div>

<div data-lang="en">
  <h3>What survives of S1</h3>
  <p>"Dying" does not mean "deleted." Grid Robotics' <a href="https://grid-robotics-official.github.io/agentic-robotics-roadmap/" target="_blank" rel="noopener">Envisioning Agentic Robotics</a> roadmap keeps an S1 layer, but redefines it: S1 supplies <strong>skills and callable modules</strong> (action, perception, motion planning) that an S2 agent chooses, coordinates and verifies. It describes three execution paths that can coexist in one task: <em>Layered Orchestration</em>, <em>Direct Control</em> and <em>Code as Policy</em>. PEAR is a pure Direct Control example.</p>
  <p>That is the real shift. S1 stops being <em>the</em> policy, the place where generalization is supposed to come from. It becomes a library of tools, some learned and some classical, that a reasoning agent may or may not call. The generalist imitation policy as the center of the stack is what is dying.</p>
</div>
<div data-lang="zh" style="display: none;">
  <h3>S1 还剩下什么</h3>
  <p>“消亡”不等于“删除”。Grid Robotics 的路线图 <a href="https://grid-robotics-official.github.io/agentic-robotics-roadmap/" target="_blank" rel="noopener">Envisioning Agentic Robotics</a> 仍然保留了 S1 这一层，但重新定义了它：S1 提供<strong>技能和可调用模块</strong>（动作、感知、运动规划），由 S2 智能体来选择、编排和验证。它描述了三条可以在同一任务中共存的执行路径：<em>分层编排</em>（Layered Orchestration）、<em>直接控制</em>（Direct Control）和<em>代码即策略</em>（Code as Policy）。PEAR 就是一个纯粹的直接控制例子。</p>
  <p>这才是真正的转变：S1 不再是<em>那个</em>策略，不再是泛化能力的来源，而是变成一个工具库，有学出来的，也有经典方法，推理智能体可以调用，也可以不调用。正在消亡的，是“通用模仿策略居于系统中心”这件事。</p>
</div>

<!-- 5 -->
<h2><span class="n ui">05</span>
  <span data-lang="en">Even touch might be absorbed</span>
  <span data-lang="zh" style="display: none;">连触觉都可能被基座模型吸收</span>
</h2>
<div data-lang="en">
  <p>The usual objection is touch. Vision and language are internet-scale, but tactile data is not. Surely contact needs its own learned perception stack, built from tactile skins, GelSight-style sensors and dedicated tactile encoders?</p>
  <p>I am less sure than I used to be. Split the tactile problem by timescale and most of it lands on one of the two surviving layers:</p>
  <ul>
    <li><strong>Fast reflexes</strong> (slip, force spikes, contact onset) belong in System 0. An RL policy can consume raw joint torques, motor currents or simple pressure readings as part of its observation and learn the reflex end to end in simulation. It does not need a semantic "tactile understanding."</li>
    <li><strong>Slow judgments</strong> (is the lid seated? is this fruit ripe? did the connector click?) can be inferred by a multimodal foundation model from vision, sound, and a short text summary of force readings. That is reasoning about physical evidence, which is what foundation models are increasingly good at.</li>
  </ul>
  <p>TacTalent gives a concrete example. With a few demonstrations in context, GPT-6 Astra takes RGB images from tactile sensors through its existing visual interface and uses them for closed-loop manipulation in simulation. Adding those images raises mean success on UniVTAC from 76.3% to 93.8%. The model can interpret contact without a dedicated tactile encoder. The gain on UniVTAC also shows how much information the sensor still adds. <a href="https://tactalent.github.io/" target="_blank" rel="noopener">TacTalent results</a></p>
  <p>What is left in the middle, a learned tactile representation trained from human demonstrations, looks just like System 1 did: expensive data and a narrow interface, squeezed from both sides. That is a conjecture, not a result. But it is the direction I would bet on.</p>
</div>
<div data-lang="zh" style="display: none;">
  <p>最常见的反对意见是触觉：视觉和语言有互联网规模的数据，触觉没有。接触总该需要一套专门学习的感知系统吧？触觉皮肤、GelSight 类传感器、专用的触觉编码器……</p>
  <p>我现在没那么确定了。把触觉问题按时间尺度拆开，大部分内容都会落到剩下的两层之一：</p>
  <ul>
    <li><strong>快反射</strong>（打滑、力突变、接触起始）属于 System 0。RL 策略可以把原始关节力矩、电机电流或简单的压力读数直接作为观测，在仿真里端到端学会反射，不需要什么语义层面的“触觉理解”。</li>
    <li><strong>慢判断</strong>（盖子盖严了吗？水果熟了吗？插头卡到位了吗？）可以由多模态基座模型从视觉、声音和一段力读数的文本摘要中推断出来。这本质上是对物理证据的推理，而这正是基座模型越来越擅长的事。</li>
  </ul>
  <p>TacTalent 给了一个具体例子。给 GPT-6 Astra 几条示范后，模型通过已有的视觉接口读取触觉传感器输出的 RGB 图像，在仿真中做闭环操作。加上触觉图像后，UniVTAC 上的平均成功率从 76.3% 提高到 93.8%。这说明理解接触信息可以省掉专用的触觉编码器，也说明传感器本身仍然提供了有用的观测。 <a href="https://tactalent.github.io/" target="_blank" rel="noopener">TacTalent 实验结果</a></p>
  <p>剩下夹在中间的部分，也就是从人类示教中学来的触觉表征，看起来和当年的 System 1 一模一样：数据昂贵、接口狭窄、被两头挤压。这是一个猜想，不是结论，但如果要下注，我会押这个方向。</p>
</div>

<!-- 6 -->
<h2><span class="n ui">06</span>
  <span data-lang="en">What to work on now</span>
  <span data-lang="zh" style="display: none;">现在该做什么</span>
</h2>
<div data-lang="en">
  <ul>
    <li><strong>Simulators and rewards are the new datasets.</strong> If System 2 and System 0 are both trained by RL, the bottleneck moves from collecting demonstrations to building diverse, fast, contact-accurate simulation and verifiable task rewards.</li>
    <li><strong>The S2↔S0 interface.</strong> What is the right "API" between a reasoning model and a dexterous reflex policy? Poses, grasp primitives, force budgets, or code? This is now the central systems question.</li>
    <li><strong>Real-time agents.</strong> Grid Robotics points out that many benchmarks pause simulated time while the model thinks. A real robot does not get that pause. Latency-aware reasoning, event monitors, and knowing when not to think are open problems.</li>
    <li><strong>Verification.</strong> A completed call does not prove the task succeeded. An agent that checks its own physical outcomes is worth more than one that acts slightly faster.</li>
  </ul>
  <p>The VLA era taught us how to get robots moving. The next era is about getting them to <em>figure things out</em>. That calls for optimizing outcomes, not imitating motions.</p>
</div>
<div data-lang="zh" style="display: none;">
  <ul>
    <li><strong>仿真器和奖励就是新的数据集。</strong>如果 System 2 和 System 0 都用 RL 训练，瓶颈就从“采集示教”转移到“构建多样、快速、接触精确的仿真环境，以及可验证的任务奖励”。</li>
    <li><strong>S2↔S0 的接口。</strong>推理模型和灵巧反射策略之间应该用什么“API”？位姿、抓取原语、力预算，还是代码？这已经成为最核心的系统问题。</li>
    <li><strong>实时智能体。</strong>Grid Robotics 指出，很多基准测试在模型思考时会暂停仿真时间，而真实机器人没有暂停键。延迟感知的推理、事件监控、知道什么时候“不该想”，都还是开放问题。</li>
    <li><strong>验证。</strong>调用完成不代表任务成功。一个能自己检查物理结果的智能体，比一个动作稍快的智能体更有价值。</li>
  </ul>
  <p>VLA 时代教会了我们怎么让机器人动起来；下一个时代，是让它们自己<em>想明白</em>。要做到这一点，靠的是针对结果优化，而不是模仿动作。</p>
</div>

<div class="note">
  <div data-lang="en">
    <p><strong>References</strong></p>
    <ul>
      <li>Tang, Zhang, Guo et al., MIT HAN Lab. <a href="https://mit-han-lab.github.io/pear-blog/" target="_blank" rel="noopener">Training Reasoning Models in Simulation to Natively Use Real Robots (PEAR)</a>. arXiv 2611.18562.</li>
      <li>Grid Robotics. <a href="https://grid-robotics-official.github.io/agentic-robotics-roadmap/" target="_blank" rel="noopener">Envisioning Agentic Robotics: A New Era of Robotic Systems</a>. arXiv 2611.18359.</li>
      <li>Yang et al. <a href="https://tactalent.github.io/" target="_blank" rel="noopener">GPT-6 Astra Is a Native Visuo-Tactile Policy for Contact-Rich Manipulation (TacTalent)</a>. arXiv 2610.26846.</li>
    </ul>
    <p>The figures in Section 02 are from PEAR. The proposals for dexterous-hand RL and the division of tactile processing in Sections 03 and 05 are the author's own.</p>
  </div>
  <div data-lang="zh" style="display: none;">
    <p><strong>参考资料</strong></p>
    <ul>
      <li>Tang, Zhang, Guo 等，MIT HAN Lab。<a href="https://mit-han-lab.github.io/pear-blog/" target="_blank" rel="noopener">Training Reasoning Models in Simulation to Natively Use Real Robots（PEAR）</a>。arXiv 2611.18562。</li>
      <li>Grid Robotics。<a href="https://grid-robotics-official.github.io/agentic-robotics-roadmap/" target="_blank" rel="noopener">Envisioning Agentic Robotics: A New Era of Robotic Systems</a>。arXiv 2611.18359。</li>
      <li>Yang 等。<a href="https://tactalent.github.io/" target="_blank" rel="noopener">GPT-6 Astra Is a Native Visuo-Tactile Policy for Contact-Rich Manipulation（TacTalent）</a>。arXiv 2610.26846。</li>
    </ul>
    <p>第 02 节的数据引自 PEAR。第 03 节和第 05 节对灵巧手 RL 和触觉处理分工的设想是作者本人的判断。</p>
  </div>
</div>
</div>
