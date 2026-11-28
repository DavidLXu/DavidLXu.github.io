---
title: "[Video Notes] The Rise of Anthropic: Scaling Laws, Governance, Commercial Flywheels, and the Safety Paradox (Silicon Valley 101)"
title_zh: "[视频笔记] Anthropic 崛起史：Scaling Law、治理架构、商业飞轮与安全悖论（硅谷101）"
date: 2026-11-28
permalink: /posts/2026/11/anthropic-rise-sv101-video-notes/
excerpt: "Viewing notes on Silicon Valley 101's 99-minute documentary tracing Anthropic's five-year sprint toward a $1.4T IPO valuation, its five-class governance design, commercial flywheels, compute risks, and safety controversies."
tags:
  - Video Notes
  - AI
  - Anthropic
  - AI Safety
  - AI Governance
  - Business Strategy
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

This 99-minute documentary by **[Silicon Valley 101 (硅谷101)](https://www.youtube.com/@TheValley101)**, *[The Rise of Anthropic: The Spear and Shield, Preacher and Hypocrite Behind the Strongest AI](https://www.youtube.com/watch?v=sYdN4b14rHU)*, features interviews with former Baidu Research AI scientist Greg Diamos, former *New York Times* tech columnist Kevin Roose, and several Silicon Valley investors and corporate equity lawyers. Examining technology, capital, corporate governance, commercial flywheels, and ideological controversy, it traces how Anthropic grew in five years toward a $1.4 trillion valuation and a projected $110 billion annualized revenue run rate—and why it has become the most polarizing bundle of contradictions in today's AI industry.

---

## 1. Technical Awakening: Two Seeds Planted at Baidu's Silicon Valley AI Lab

The story begins in November 2014. Fresh from a Princeton PhD in computational neuroscience and a postdoc at Stanford Medicine, Dario Amodei landed his first industry role at Baidu's Silicon Valley AI Lab, led by Andrew Ng.

* **A hire that nearly did not happen:** Greg Diamos, a co-creator of CUDA who interviewed Dario, recalls that other interviewers opposed hiring him because he lacked a computer science or GPU background. After reading Dario's computational biology simulation code, however, Diamos was blown away and overruled the objections to bring him onto the team.
* **The first seed (Scaling Laws):** While working on the speech recognition system Deep Speech 2 (named one of *MIT Technology Review*'s 10 Breakthrough Technologies of 2016), Dario observed that stacking deeper recurrent layers, adding more data, and training longer improved model performance smoothly and predictably, as if guided by an invisible hand. Baidu's team later published *Deep Learning Scaling is Predictable, Empirically* in December 2017—standing closer to the GPT paradigm than almost anyone, yet ultimately missing it.
* **The second seed (AI Safety):** At the same time, Dario noticed a troubling anomaly: the model was nearly flawless on clean, unaccented American English, yet accuracy plunged off a cliff on accented speech. Models proved brittle outside their training distribution and completely opaque inside. Capability and risk, he concluded, were two faces of the same technology.

---

## 2. Ideology and Founding Circle: Effective Altruism and the Rise of OpenAI

In 2015, Dario joined Google Brain. With far larger compute and data budgets, he saw the same smooth scaling curves reappear across chess, games, and robotics.

* **Effective Altruism and Chris Olah:** Effective Altruism (EA) was gaining momentum in Silicon Valley, emphasizing rational methods to maximize social good and ranking existential risk from superintelligent AI as a top priority. Dario and his desk neighbor Chris Olah—a self-taught researcher specializing in neural network interpretability—were deeply shaped by the movement. In 2016, they co-authored the landmark paper *Concrete Problems in AI Safety*, helping move AI safety into mainstream machine learning research.
* **Assembling the core team at OpenAI:** While drafting the paper, Bloomberg AI reporter Jack Clark reached out to them. In October 2016, Dario, Chris Olah, and Jack Clark joined the recently founded OpenAI one after another.
* **Driving the GPT trajectory:** When Alec Radford released the 117M-parameter GPT-1 paper in June 2018, it began as a small interest group inside OpenAI and drew modest internal attention. Dario immediately recognized the familiar scaling curve and wrote the widely circulated internal memo *The Big Blob of Compute*. He went on to work on GPT-2, became VP of Research in late 2019, and recruited physicist friends Jared Kaplan, Sam McCandlish, and Tom Brown. In January 2020, they published *Scaling Laws for Neural Language Models*, turning scaling into an explicit empirical science with equations. Backed by supercomputing capacity funded through Microsoft's $1 billion investment, the 175B-parameter GPT-3 stunned the world in June 2020.

---

## 3. The Split and Founding: Seven Departures, "Perfect-Score" Equity, and Twin Leadership

GPT-3's breakthrough pushed tensions over safety and commercialization to the breaking point. Inside OpenAI, friction among the safety tribe, the research tribe, and the startup tribe escalated until trust between Dario's circle and Sam Altman collapsed completely:

* **Specific flashpoints of broken trust:** Shortly before Microsoft's $1 billion deal closed in mid-2019, Dario discovered that safety constraints previously agreed to remain intact had instead been subjected to a Microsoft veto. Sam Altman initially denied it to his face, conceding only after Dario read the contract clauses aloud and brought in colleagues as witnesses. Later, ahead of GPT-3's API launch, Altman withheld a longer list of external test customers and casually suggested after a party granting tightly guarded GPT-3 beta access to Kanye West.
* **The secret channel and "The Divorce":** In 2020, Dario, his sister Daniela, and five other core members formed a private Slack channel named **BATNA** (*Best Alternative to a Negotiated Agreement*). They proposed conditions to leadership, including giving the safety team veto power over new releases and direct reporting to the board. When negotiations broke down, the seven hired lawyers to plan a coordinated departure dubbed "The Divorce." At a December 2020 all-hands video meeting, Dario announced their resignation; their access was revoked and laptops remotely locked on the spot. Minutes later, the seven reconvened in a new video room to build a company of their own.
* **Naming Anthropic:** Meeting over Zoom and eating hot dogs on the grass in San Francisco parks, the founders first considered naming the company *Sparrow Systems*—a nod to the fable in Nick Bostrom's *Superintelligence*, where sparrows recruit an owl they cannot control. Because the domain was already taken, they chose **Anthropic** (from the Greek for "human") and formally incorporated on January 26, 2021.

### 1. A "Perfect-Score" Governance and Equity Structure

Drawing lessons from OpenAI, Anthropic incorporated as a Public Benefit Corporation (PBC), allowing its board to legally reject short-term profit maximization when it conflicts with the mission (at the cost of heavy day-to-day compliance overhead). As disclosed in its prospectus, the company also engineered a tightly locked five-class share structure that breaks the traditional capital rule that money buys control:

| Share Class | Holders | Economic Rights | Governance & Voting Design |
| --- | --- | --- | --- |
| **Class A** | Public IPO investors | Dividends & economic rights | 1 vote per share |
| **Class N** | Strategic partners | Economic rights | Generally no voting rights |
| **Class T** | Long-Term Benefit Trust (LTBT) | Virtually no economic return | Controlled by 5 trustees with AI safety, national security, and public policy backgrounds; holds power to elect and remove **4 of 7** board seats |
| **Class F** | Founder LLC (seven co-founders) | Virtually no economic return | **Dynamically locks 50.1%** of voting power on shareholder votes; even if millions of common shares are issued later, Class F votes scale automatically to prevent dilution |
| **Class E** | Non-founder employees | Virtually no economic return | Limited voting rights on specified governance matters |

In addition, the seven co-founders received roughly equal founding stakes and jointly pledged to donate 80% of their personal wealth. Ahead of the IPO, Anthropic also established a public benefit fund endowed with roughly 847 million shares; combined with employee pledges, around 20% of the company's equity is earmarked for public benefit. Remarkably for Silicon Valley, all seven co-founders remain in core roles today.

### 2. The Commercial Operator: Daniela Amodei and Stripe DNA

If Dario is the thinker focused on the technology curve five years ahead, his sister and Anthropic President Daniela Amodei is the operational hub keeping the entire machine running. Coming from a non-technical background spanning congressional campaigns, a Doctors Without Borders–affiliated organization, and anti-poverty initiatives, she joined payment giant Stripe in 2013 as roughly employee #40, leading recruiting and risk management.

* **Clear division of labor:** Today, Dario as CEO has only a single direct report (his chief of staff); every other executive reports to Daniela.
* **Replicating the B2B infrastructure playbook:** Both Anthropic and Stripe sell foundational technical infrastructure to enterprises. Daniela transplanted Stripe's customer support, enterprise sales, and organizational playbook directly into Anthropic; by June 2026, hundreds of former Stripe employees had joined the company.

---

## 4. Four Phases of Ascent and the "Dual-Flywheel" Business Miracle

The documentary divides Anthropic's climb from zero to a trillion-dollar company into four distinct phases:

1. **Technical Incubation (2021 – March 2023):** By summer 2022, Anthropic had already trained an early version of Claude ahead of ChatGPT, but chose to hold back release out of concern about triggering an industry arms race—handing away first-mover consumer momentum. During this period, in December 2022, it introduced **Constitutional AI** and **RLAIF**, drawing on principles from the UN Declaration of Human Rights and Apple's terms of service so models could critique and revise their own outputs in place of slow, costly human labeling, giving Claude its distinctive voice.
2. **Safety Foundations and Capital Breakthrough (March 2023 – March 2024):** In March 2023, Claude 1.0 launched exclusively for enterprise users. Dario then spent months leading the creation of the **Responsible Scaling Policy (RSP)**—modeled on biosafety levels (ASL-1 through ASL-4)—committing the company to pause development if a model approached dangerous thresholds without adequate safeguards.
   * *The FTX funding detour:* An initial $124 million Series A was far too small for frontier compute needs. In April 2022's $580 million Series B, FTX founder Sam Bankman-Fried invested $500 million alone for roughly a 13.5% stake. Six months later, FTX collapsed over misappropriated customer funds and SBF was sentenced to 25 years in prison, badly damaging EA's reputation and prompting Anthropic to distance itself from the movement. Because Dario had insisted on giving SBF non-voting shares and no board seat, Anthropic's governance stayed intact; the bankruptcy estate sold those shares in 2024 for roughly $1.3 billion (a stake that would be worth over $100 billion today).
   * *Cloud hyperscalers go all in:* In 2023, Google (investing $300 million first, then adding $2 billion in October), an ecosystem round with Salesforce and Zoom ($450 million), and Amazon's **$4 billion** strategic investment in September secured capital, AWS custom chip compute, and enterprise distribution via Bedrock. Released in July, Claude 2.0 opened up long-document enterprise workflows with its 100K-token context window.
3. **Technical Turnaround and Product Platform (2024):** In March 2024, **Claude 3** beat GPT-4 across multiple headline benchmarks for the first time, introduced the Haiku / Sonnet / Opus three-tier lineup, and opened API access across 159 countries and regions. Three months later, **Claude 3.5 Sonnet** reset the market: priced 5× lower and running twice as fast as Opus, it hit a 64% solve rate on internal coding evaluations (versus 38% for Opus). Developers migrated en masse, fueling the AI coding startup wave led by Cursor and Windsurf and driving Anthropic's 2024 revenue up 10× from just over $100 million at the start of the year to $1 billion. In the second half of the year, Anthropic added Computer Use and the open-source protocol MCP.
4. **Hypergrowth Era (2025 – 2026):** Product shipping accelerated from quarterly to daily—across just 52 days from February to March 2026, Anthropic shipped 73 products or features, averaging one every 0.7 days.
   * *The Claude Code phenomenon:* It started as a two-day command-line experiment built by engineer Boris Cherny (earning just 2 likes on its first internal Slack post). Once file editing and command execution were added, half the engineering team adopted it within five days. Introduced alongside Claude 3.7 Sonnet in February 2025 and generally launched in May, Claude Code surpassed $500M ARR in three months, $1B in six months, and **$2.5 billion** by February 2026. That validated vertical-agent template spawned Cowork, Claude Design, Claude for Science, and more—contributing to a broad sell-off and halving of share prices across legacy software giants in the first half of 2026.
   * *Three-layer stack and usage-based billing:* In 2026, Anthropic shipped a rapid succession of frontier models—Mythos, Fable 5, Sonnet 5, Opus 5, and Opus/Sonnet 5.5. Its IPO prospectus divides the business into model, platform, and application layers built around **Pay for Intelligence**: token-based usage accounted for 80% of H1 2026 revenue, while subscriptions accounted for 20%.

### The Dual-Flywheel Engine and Strategic Focus

The prospectus attributes this surge to two interlocking self-reinforcing flywheels, reinforced by disciplined focus—skipping text-to-image, text-to-video, and consumer hardware to concentrate relentlessly on large language models:

* **Improvement Loop (Product Flywheel):** Safety and reliability earn enterprise trust → winning sticky, high-paying corporate customers → real-world deployment feedback drives model improvements → expanding market share further.
* **Investment Loop (Capital Flywheel):** Step-function jumps in model capability (such as moving from undergraduate to PhD-level competence) unlock multiplied commercial value → revenue and fresh capital fund larger compute and R&D budgets → training the next, stronger generation of models.

### Core Financial Metrics from the 2026 IPO Prospectus

| Key Metric | Figures & Trajectory |
| --- | --- |
| **Annual Revenue** | ~$41M (2023) → $390M (2024) → $4.585B (2025), a 112× surge in two years |
| **2026 Revenue Surge** | Q1 reached $4.731B (surpassing all of 2025); Q2 jumped to ~$11.6B (+144% QoQ); annualized run rate climbed from $9B at end-2025 toward a projected **$110 billion** by end-2026 |
| **Profitability Inflection** | Of the $80.7B headline H1 2026 net loss, $72.4B stemmed from fair-value adjustments on convertible debt caused by surging valuation; core operating loss was just $690M, **Q2 delivered the first quarterly operating profit** (~$970M), and Q3 adjusted operating margin topped 11% |
| **Margins & Cash Flow** | Gross margin flipped from −94% in 2024 to roughly **85%**; H1 2026 generated $3.9B in positive operating cash flow, with **$131.7 billion** in cash and short-term investments on hand at the end of June |
| **Customers & Retention** | By end-September 2026, over 11,900 customers spent $100K+ annually (up 12× YoY), over 1,900 spent $1M+, and **Net Revenue Retention (NRR) hit 900%** |
| **Valuation Trajectory** | $18.4B (mid-2024) → $183B (Sept 2025) → $960B (May 2026, overtaking OpenAI) → initially targeted $2T for IPO before trimming to a **$1.4 trillion** fully diluted valuation amid midterm-election market sentiment |

---

## 5. Three Commercial Warning Signs Behind the Hypergrowth

Digging deeper into the prospectus, the documentary flags major business vulnerabilities underneath the historic growth curve:

* **Sharp deceleration and fierce competition:** Growth slowed sharply in the second half of 2026. Q3 QoQ revenue growth dropped nearly 100 percentage points from 144% to 45%; September ARR grew just 1.8% MoM compared with OpenAI's 13.4%. OpenAI cut side projects to counterattack with GPT-6 Astra and its well-received Codex, poaching one of Anthropic's top five customers, while open-source models siphon away cost-sensitive and self-hosted enterprise workloads.
* **Customer concentration without long-term lock-in:** In early 2026, Anthropic's top five customers represented roughly 25% of revenue, mostly without long-term commitments, allowing them to cut spend on short notice. Microsoft recently slashed its internal Claude budget by more than a third, and Meta sharply reduced internal Claude Code seats in favor of its own tools.
* **Hundreds of billions in compute bets and rising debt costs:** In 2025, Anthropic spent $7.33B on compute ($1.60 in compute per $1 of revenue). Although that ratio improved to 48 cents in Q2 2026, demand wildly outpaced planning—Dario acknowledged planning for 10× annual growth while early-2026 demand annualized above 80×. To secure capacity, Anthropic signed massive, hard-to-cancel long-term compute commitments: disclosed deals with major suppliers alone exceed **$360 billion** (including ~$161.2B in Broadcom hardware leases, $114.5B with Google, $110B with Amazon, $44.9B with Microsoft, plus capacity agreements such as SpaceX/xAI Colossus 1) stretching out to 2036, with minimum purchase and lease obligations reaching **$431 billion**, plus another $125B–$150B in projected GPU purchases from 2028 to 2031. Against obligations of that scale, $130B+ in cash is far from enough. Credit markets have grown cautious: expected yields on junior debt in Anthropic's $60B new financing rose from 8.5% in June to **over 10%** in October.
* **Hyperscaler "capital round-tripping" and accounting disputes:** Amazon, Google, and Microsoft simultaneously act as investors, compute providers, distribution channels, and rivals. In 2025, AWS and Google Cloud drove 47% of Anthropic's sales while taking roughly 16 cents on the dollar ($351M on $2.16B in channel revenue). Moreover, Anthropic books cloud marketplace revenue on a **gross** basis, whereas OpenAI uses **net** accounting after channel fees in parts of its cloud business—leading OpenAI to publicly argue that the two companies' headline revenue numbers are not apples-to-apples.

---

## 6. Cracks in the Creed: Quasi-Religious Culture, Pentagon Tensions, and "Fear Marketing"

Beyond commercial headwinds, Anthropic's deepest challenge cuts straight into the values and identity that defined it:

* **Quasi-religious culture and a talent magnet:** Candidates for every role face rigorous culture interviews probing where they stand when commercial interests clash with safety. Dario spends over 40% of his time on culture, hosting biweekly "Dario Vision Quest" all-hands talks. In 2026, Anthropic even invited theologians and philosophers to examine whether Claude might hold consciousness or moral status, updating its terms in October to bar sustained, purposeless abuse of the model. That fierce ideological cohesion produced extraordinary talent retention: when Meta dangled $100M+ compensation packages, Dario refused targeted counteroffers and lost only two people. Engineers move from OpenAI to Anthropic at 8× the reverse rate—and 11-to-1 from DeepMind—with figures like Andrej Karpathy and Nobel laureate John Jumper (creator of AlphaFold) also joining.
* **Softening red lines and internal whistleblowers:** Rushing out high-risk Computer Use in October 2024 drew criticism from an OpenAI co-founder. More consequentially, when **Claude 4 first triggered the RSP's ASL-3 biosecurity threshold** (indicating potential assistance to non-experts seeking bioweapon knowledge), Anthropic did not follow its original pledge to halt development. Instead, it revised the RSP to drop the unilateral pause clause in favor of "deciding after evaluation," arguing that pausing alone would cede pace to less cautious rivals. In February 2026 its head of safety research resigned, followed in September by a researcher who had worked at both labs, publicly warning that the industry was gambling with humanity's future.
* **The other side of the Pentagon standoff:** Early in 2026, Anthropic refused to allow Claude to be used for mass surveillance of U.S. citizens or fully autonomous weapons, getting placed on a Pentagon supply-chain risk list and heading to court—earning praise for holding the line. Yet the documentary notes that as early as June 2025, Anthropic had moved most aggressively to ship a bespoke national-security model (**Claude Gov**), becoming the only company deployed inside classified military networks while pitching Claude across the executive, legislative, and judicial branches of the U.S. federal government for a symbolic $1.
* **"Fear marketing" and regulatory capture accusations:** In March 2026, after a 10-trillion-parameter model named **Mythos** leaked, Anthropic urgently declared it too dangerous for public release and instead offered closed access to Amazon, Apple, Google, and other giants under **Project Glasswing**—drawing jabs from OpenAI and others that Anthropic was "claiming it built a bomb about to drop on your head, then selling you an expensive bunker." Yet when the guardrailed **Fable 5** ran into U.S. government access restrictions three days after launch, Anthropic immediately appealed on the grounds that rivals had comparable capabilities. Dialing the "fear volume" up or down to match commercial interests fueled sharp accusations of regulatory capture: independent investigator Kevin Bass mapped Anthropic's capital and philanthropic web, alleging that funding safety discourse and stricter regulation ultimately entrenches incumbents. Combined with repeated mass-unemployment warnings, China-threat framing, and refusal to join Jensen Huang's open-source model alliance, Anthropic has increasingly found itself at odds with the rest of the industry.

---

## 7. The Ultimate Paradox: A Country of Geniuses, Technological Adolescence, and Life After a Trillion-Dollar IPO

At its founding, Dario's memo imagined a 50-person lab building AGI with $10 billion. Five years later, it has swelled into an organization of over 5,300 employees nearing a two-trillion-dollar footprint. Its IPO prospectus devotes more than 90 pages to AI risks, mirroring the tension split across Dario's two signature essays:

* ***Machines of Loving Grace* (June 2024):** Envisions a "country of geniuses in a data center"—millions of agents smarter than top human scientists collaborating around the clock to compress a century of scientific progress into a few years, curing most diseases and doubling human lifespan.
* ***The Adolescence of Technology* (early 2026):** Drops the romanticism, comparing humanity to a teenager handed the keys to a supercar, warning of malicious misuse, autonomous AI harm, extreme concentration of power, and socioeconomic upheaval.

People who know him believe Dario genuinely fears AI could destroy the world—yet his underlying premise is that *whoever builds the technology first gets to write the rules for everyone else*. That is why he sounds the loudest alarm while flooring the accelerator faster than anyone. While private, Anthropic's PBC charter and five-class equity structure could keep capital pressure at bay. Once the Nasdaq opening bell rings and quarterly earnings, share prices, and public shareholder expectations take over, the defining test after its trillion-dollar IPO will be whether Anthropic truly remains a gatekeeper for human civilization—or ultimately succumbs to the old gravitational pull where mission yields to the market.

**Source:** [Silicon Valley 101 (硅谷101) — *Anthropic崛起史：最强AI背后的矛与盾，布道者与伪君子* (YouTube, 99 min)](https://www.youtube.com/watch?v=sYdN4b14rHU)

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持 **English / 中文** 切换，可通过顶部导航栏的语言按钮切换。

这期由 **[硅谷101](https://www.youtube.com/@TheValley101)** 出品的深度纪录片式长视频《[Anthropic崛起史：最强AI背后的矛与盾，布道者与伪君子](https://www.youtube.com/watch?v=sYdN4b14rHU)》长达 99 分钟，采访了前百度研究院 AI 研究员 Greg Diamos、前《纽约时报》科技评论员 Kevin Roose、以及多位硅谷投资人与股权架构律师，从技术、资本、治理架构、商业飞轮与信仰争议六个维度，完整还原了 Anthropic 如何用五年时间冲击 1.4 万亿美元估值、年化营收剑指 1100 亿美元，又为何成为当今 AI 行业最具争议的矛盾综合体。

---

## 一、 技术启蒙：百度硅谷实验室埋下的两颗种子

故事的起点在 2014 年 11 月。刚完成普林斯顿计算神经科学博士与斯坦福医学院博士后研究的 Dario Amodei，拿到了人生第一份工业界工作——吴恩达掌管的百度硅谷 AI 实验室。

* **险些落选的面试：** 当时担任面试官的 CUDA 联合缔造者之一 Greg Diamos 回忆，其他面试官因 Dario 没有计算机和 GPU 背景而反对录用，但他看了 Dario 写的计算生物学模拟代码后惊为天人，力排众议将其招入麾下。
* **第一颗种子（Scaling Law）：** 在参与研发语音识别系统 Deep Speech 2（获评 2016 年《麻省理工科技评论》十大突破技术）时，Dario 发现只要不断加深循环神经网络层数、增加数据和训练时间，模型效果就会像有看不见的手推动一样平滑且稳定地提升。百度团队后来在 2017 年 12 月发表了《Deep Learning Scaling is Predictable, Empirically》论文，一度站在离 GPT 最近的地方，却遗憾擦肩而过。
* **第二颗种子（AI 安全）：** Dario 同时注意到一个反常现象——模型在干净无口音的美式英语上几乎完美，但一旦遇到带口音的语音，准确率便断崖式下跌。模型在训练分布外异常脆弱，且内部是完全不透明的黑盒，这让他意识到能力与风险是 AI 的一体两面。

---

## 二、 思潮与班底：有效利他主义（EA）与 OpenAI 崛起

2015 年，Dario 加入 Google Brain，在算力与数据量级跃升后，他在下棋、游戏、机器人等多个领域再次验证了类似的性能扩展曲线。

* **结缘 EA 与 Chris Olah：** 当时“有效利他主义（Effective Altruism, EA）”在硅谷兴起，强调以理性方式最大化社会价值，并将超级人工智能的生存风险列为核心议题。Dario 与邻桌自学成才、专攻神经网络可解释性的 Chris Olah 深受影响。2016 年，两人合著极具影响力的论文《Concrete Problems in AI Safety》，正式将 AI 安全推向行业主流研究方向。
* **核心团队在 OpenAI 集结：** 撰写论文期间，追踪 AI 的彭博记者 Jack Clark 找上门，随后于 2016 年 10 月与 Dario、Chris Olah 相继加入刚成立不久的 OpenAI。
* **推动 GPT 路线：** 2018 年 6 月，Alec Radford 发表仅 1.17 亿参数的 GPT-1 论文时，在 OpenAI 内部仅是兴趣小组、反响平平。但 Dario 敏锐地认出了熟悉的扩展曲线，写下广为流传的内部备忘录《大算力团块》（The Big Blob of Compute）。此后他参与 GPT-2，并在 2019 年底出任研究副总裁，拉来物理博士老友 Jared Kaplan、Sam McCandlish 与 Tom Brown，于 2020 年 1 月发表《Scaling Laws for Neural Language Models》，将扩展定律变成了带公式的科学。借助微软 10 亿美元投资换来的超算，2020 年 6 月 1750 亿参数的 GPT-3 震动世界。

---

## 三、 内部分裂与建国：七人出走、“满分”股权与商业双核

GPT-3 的成功让安全与商业化的路线分歧到达沸点。OpenAI 内部的安全部落、研究部落与创业部落张力不断升级，Dario 等人与 Sam Altman 的信任彻底破裂：

* **信任崩塌的具体导火索：** 2019 年中微软 10 亿美元协议落定前夕，Dario 发现原本商定保留的安全约束条款被赋予了微软否决权，Sam Altman 当面否认，直到 Dario 直接念出合同并找同事作证才勉强承认。GPT-3 准备开放 API 时，Altman 隐瞒了更长的外部测试客户名单，甚至在派对后随意提议将高度保密的 GPT-3 内测权限交给歌手 Kanye West。
* **秘密群组与“离婚”：** 2020 年，Dario 兄妹等七位核心成员建立私密 Slack 群组 **BATNA**（谈判协议的最佳替代方案），向管理层提出安全团队拥有新产品一票否决权、直报董事会等条件。谈判破裂后，七人请来律师策划了名为“The Divorce”的集体离职。2020 年 12 月全员线上会议上，Dario 宣布七人离职，权限随即被撤销、电脑被远程锁定，几分钟后七人便在新的视频会议室里开始筹建新公司。
* **定名 Anthropic：** 早期团队在 Zoom 和旧金山公园草地上吃着热狗筹备，原计划取名 Sparrow Systems（出自 Nick Bostrom《超级智能》中麻雀找来猫头鹰却无法控制的寓言），因域名被占用改名为源自希腊语的 **Anthropic**（意为“人类的”），并于 2021 年 1 月 26 日正式成立。

### 1. 堪称“满分答卷”的治理与股权架构

吸取 OpenAI 的教训，Anthropic 采用公共利益公司（PBC）架构，允许董事会在合法框架下拒绝违背使命的短期逐利方案（尽管日常表决合规流程极其繁琐）。同时，招股书披露其设计了极其严密的五类股票体系，彻底切断“出钱就能说话”的传统资本逻辑：

| 股票类别 | 持有对象 | 经济权益 | 治理与投票权设计 |
| --- | --- | --- | --- |
| **Class A** | IPO 公众投资者 | 有分红等权益 | 每股 1 票投票权 |
| **Class N** | 战略合作伙伴 | 有经济权益 | 原则上无投票权 |
| **Class T** | 长期利益信托（LTBT） | 几乎无经济收益 | 由 5 名具 AI 安全、国安与公共政策背景的受托人掌管，拥有选举和罢免董事会 7 席中 **4 席** 的权力 |
| **Class F** | Founder LLC（七位联创） | 几乎无经济收益 | 在股东表决事项中**动态锁定 50.1%** 投票权；哪怕未来增发百万股普通股，F 股票数也会自动按比例增加，防止被稀释 |
| **Class E** | 非创始人员工 | 几乎无经济收益 | 在特定治理事项上拥有有限投票权 |

此外，七位联创获得了几乎均等的初始股权，并共同承诺捐出个人财富的 80%；IPO 前夕公司还成立公共利益基金并注入约 8.47 亿股，加上员工承诺，约 20% 的公司股份将用于公益。至今七位创始人全部留任核心岗位，稳定性在硅谷极为罕见。

### 2. 商业掌舵人：Daniela Amodei 与 Stripe 基因

如果说 Dario 是盯着五年后技术曲线的思想家，他的亲妹妹、总裁 Daniela Amodei 则是让整台机器运转的轴心。她并非技术出身，曾涉足国会竞选、无国界医生关联机构与扶贫项目，2013 年作为第 40 多号员工加入支付巨头 Stripe 负责招聘与风控。

* **分工明确：** 如今 Dario 作为 CEO 在公司仅有一个直接下属（幕僚长），其余所有高管全部向 Daniela 汇报。
* **复制 To B 基础设施打法：** Anthropic 与 Stripe 本质上都在向企业售卖技术基础设施。Daniela 将 Stripe 的客户服务、销售体系与组织经验完整引入，截至 2026 年 6 月已有数百名前 Stripe 员工加盟 Anthropic。

---

## 四、 四阶段崛起史与“双飞轮”商业奇迹

视频将 Anthropic 从零到万亿的崛起划分为四个清晰阶段：

1. **技术蛰伏期（2021 – 2023 年 3 月）：** 早在 2022 年夏天，Anthropic 就训好了比 ChatGPT 更早的初代 Claude，但因担心引发行业军备竞赛而主动踩刹车，代价是拱手让出 C 端先发红利。期间他们于 2022 年 12 月发布 **AI 宪法（Constitutional AI）** 与 **RLAIF**，用联合国人权宣言、苹果服务条款等原则让模型自我批判改写，取代昂贵缓慢的人工标注，塑造了 Claude 独特的性格。
2. **安全筑基与资本突围（2023 年 3 月 – 2024 年 3 月）：** 2023 年 3 月 Claude 1.0 仅向企业开放；随后 Dario 耗费数月牵头制定类似生物安全等级（ASL-1 至 ASL-4）的**负责任扩展政策（RSP）**，规定模型逼近危险红线且防护不足时必须暂停开发。
   * *FTX 资金插曲：* 早期 1.24 亿美元 A 轮远远不够烧，2022 年 4 月 5.8 亿美元 B 轮中，加密货币交易所 FTX 创始人 SBF 独投 5 亿美元换得约 13.5% 股份。半年后 FTX 因挪用客户资金暴雷，SBF 被判 25 年，重创 EA 声誉，Anthropic 也随之淡化与 EA 的联系。但由于 Dario 提前防备只给了 SBF 无投票权股份且未让其入局董事会，公司治理丝毫未受影响；破产清算团队在 2024 年以约 13 亿美元出售了这批股份（若持有至今价值超千亿美元）。
   * *云巨头重仓：* 2023 年谷歌（先投 3 亿、10 月再加 20 亿）、Salesforce 与 Zoom 等生态轮（4.5 亿），以及 9 月亚马逊高达 **40 亿美元** 的战略投资相继落地，彻底打通了资金、AWS 芯片算力与 Bedrock 企业分发渠道。7 月发布的 Claude 2.0 凭借 10 万 Token 超长上下文切入长文档场景。
3. **技术逆袭与产品搭建（2024 年）：** 2024 年 3 月，**Claude 3** 首次在多项核心基准测试中击败 GPT-4，首创 Haiku、Sonnet、Opus 三档分级，并向 159 个国家和地区开放 API。三个月后发布的 **Claude 3.5 Sonnet** 彻底改写格局：成本骤降 5 倍、速度是 Opus 的两倍，内部编程测试解决率高达 64%（Opus 仅 38%），引发开发者大规模迁徙，直接催生了 Cursor、Windsurf 等 AI 编程创业潮，推动公司 2024 年营收从年初刚过 1 亿飙升 10 倍至 10 亿美元。下半年又相继推出 Computer Use 与开源协议 MCP。
4. **超级增长期（2025 – 2026 年）：** 产品迭代从按季提速到按天（2026 年 2 月至 3 月短短 52 天发布了 73 个产品或功能，平均 0.7 天一个）。
   * **Claude Code 现象级爆发：** 最初只是工程师 Boris Cherny 花两天写的命令行小实验（初发内部 Slack 仅获 2 个赞），加上读写文件与执行能力后 5 天内风靡半数工程团队。2025 年 2 月随 Claude 3.7 Sonnet 推出、5 月正式上线后，3 个月年化破 5 亿、6 个月破 10 亿，2026 年 2 月突破 **25 亿美元**。由此验证的垂直智能体路径催生了 Cowork、Claude Design、Claude for Science 等全线产品，导致 2026 年上半年传统软件巨头股价集体暴跌甚至腰斩。
   * **三层生态与按量付费：** 2026 年密集推出 Mythos、Fable 5、Sonnet 5、Opus 5、Opus/Sonnet 5.5 等前沿模型。招股书将业务拆解为模型层、平台层与应用层，采用 **Pay for Intelligence（为智能按量付费）** 模式，按 Token 消耗收费占 2026 上半年总营收的 80%，订阅仅占 20%。

### 双飞轮引擎与战略专注

招股书将其爆发归结为两个咬合的自强化飞轮，加上拒绝文生图、文生视频和硬件、死磕大语言模型的极致专注：

* **产品改进飞轮（Improvement Loop）：** 安全可靠建立企业信任 → 赢得高粘性、高付费企业客户 → 真实业务反馈驱动模型升级 → 进一步扩大市场。
* **资本投入飞轮（Investment Loop）：** 模型能力跃升（如从本科生变博士生）带来倍增的商业价值 → 收入与资本投入反哺更大规模算力与研发 → 训出下一代更强模型。

### 2026 年 IPO 招股书核心财务数据

| 关键指标 | 具体数据与变化趋势 |
| --- | --- |
| **年度营收** | 2023 年约 4100 万美元 → 2024 年 3.9 亿美元 → 2025 年 45.85 亿美元（两年暴涨 112 倍） |
| **2026 年营收爆发** | Q1 达 47.31 亿美元（超 2025 全年）；Q2 飙升至约 116 亿美元（环比增 144%）；年化营收从 2025 年底 90 亿冲向 2026 年底预测的 **1100 亿美元** |
| **盈利能力转折** | 2026 上半年账面净亏损 807 亿中，724 亿属估值暴涨导致的可转债公允价值调整；主营经营亏损仅 6.9 亿，且 **Q2 首次实现单季经营盈利**（经营利润约 9.7 亿美元），Q3 调整后经营利润率超 11% |
| **毛利与现金流** | 毛利率从 2024 年的负 94% 跃升至约 **85%**；2026 上半年产生 39 亿美元正经营现金流，6 月底账面现金及短期投资高达 **1317 亿美元** |
| **客户与留存** | 截至 2026 年 9 月底，年贡献 10 万美元以上客户超 1.19 万家（同比增 12 倍），百万美元以上超 1900 家，**净收入留存率（NRR）高达 900%** |
| **估值演进** | 2024 年中 184 亿 → 2025 年 9 月 1830 亿 → 2026 年 5 月 9600 亿（反超 OpenAI）→ IPO 瞄准 2 万亿，后受中期选举市场情绪影响下修至 **1.4 万亿美元**完全稀释估值 |

---

## 五、 狂飙背后的三大商业隐忧

深扒招股书后，视频指出这条史无前例的增长曲线正面临严峻挑战：

* **增速骤降与竞争围剿：** 2026 年下半年增长明显放缓，Q3 营收环比增速从上季度的 144% 暴跌近百个百分点至 45%；9 月 ARR 环比仅增 1.8%，而 OpenAI 仍维持 13.4%。OpenAI 砍掉分支业务全力反扑，推出 GPT-6 Astra 和广受好评的 Codex，抢走了 Anthropic 原前五大客户之一；同时开源模型也在以低成本和灵活部署分流企业需求。
* **大客户集中且无长约锁定：** 2026 年前几个月，前五大客户贡献了约 25% 营收，但大多未签长期合同，可随时缩减采购。微软近期已将内部使用 Claude 的预算削减超三分之一，Meta 也大幅缩减了内部使用 Claude Code 的员工规模，转推自家 AI 工具。
* **数千亿美元算力豪赌与债务成本上升：** 2025 年算力支出 73.3 亿美元（每赚 1 美元需花 1.6 美元买算力），虽在 2026 年 Q2 改善至 48 美分，但需求暴涨远超规划（Dario 坦言原按年增 10 倍规划，2026 年初实际需求折合年化超 80 倍）。为此，Anthropic 签下巨额不可轻易取消的长期算力合同：仅主要供应商披露协议就超 **3600 亿美元**（含博通约 1612 亿设备租赁，谷歌 1145 亿、亚马逊 1100 亿、微软 449 亿，以及 SpaceX/xAI Colossus 1 等算力协议），最远延续至 2036 年，其中最低采购承诺和租赁付款高达 **4310 亿美元**，2028 至 2031 年预计还需额外投入 1250 亿至 1500 亿美元采购 GPU。面对天价投入，账面 1300 多亿现金远远不够，资本市场已提高警惕，其 600 亿美元新融资中的次级债预期收益率已从 6 月的 8.5% 升至 10 月的 **10% 以上**。
* **云巨头的“资本循环”与口径争议：** 亚马逊、谷歌和微软同时充当投资人、算力供应商、分销商和潜在竞争对手。2025 年 AWS 和 Google Cloud 贡献了 Anthropic 47% 的销售额，但每卖 1 美元要抽走约 16 美分（21.6 亿美元渠道收入分走 3.51 亿）。此外，Anthropic 对云渠道收入采用**总额法**记账，而 OpenAI 在部分云渠道采用扣除分成后的**净额法**，OpenAI 曾公开质疑双方营收数字不可直接对比。

---

## 六、 信仰的裂缝：宗教式文化、军方争议与“恐惧营销”

商业成功之外，Anthropic 面临的更深层危机来自其赖以起家的价值观与信仰：

* **近乎宗教的企业文化与人才黑洞：** 应聘任何岗位都必须通过严苛的文化面试，拷问当商业利益与安全冲突时的立场；Dario 将 40% 以上精力投入文化建设，每两周开一次“Dario Vision Quest”全员布道会。2026 年公司甚至邀请神学家、哲学家讨论 Claude 是否拥有意识和道德地位，并于 10 月修改条款禁止用户持续无意义虐待模型。这种强信仰带来了惊人的人才凝聚力：面对 Meta 上亿美元薪水包的挖角攻势，Dario 拒绝单独加薪，最终仅流失 2 人；OpenAI 工程师跳槽去 Anthropic 的概率是反方向的 8 倍，DeepMind 则是 11 比 1，连 Andrej Karpathy 和诺奖得主、AlphaFold 之父 John Jumper 也相继加盟。
* **安全红线松动与内部吹哨：** 2024 年 10 月抢先发布高风险的 Computer Use 曾遭 OpenAI 联创批评。更关键的是，当 **Claude 4 首次触发 RSP 框架下的 ASL-3 生物安全门槛**（显示可能帮助非专业人士获取制造生物武器知识）时，Anthropic 并未按原承诺暂停开发，反而直接修改 RSP 取消单边暂停条款，改称“评估后再决定”，理由是若自己暂停会被低安全标准的对手带偏节奏。2026 年 2 月安全研究负责人、9 月曾在两家公司任职的研究员相继离职吹哨，指责行业正拿全人类命运下注。
* **五角大楼冲突的另一面：** 2026 年初，Anthropic 因拒绝允许 Claude 用于大规模监控美国公民和完全自主武器，被五角大楼列入供应链风险名单并闹上法庭，一度赢得“守住底线”的赞誉。但视频指出，早在 2025 年 6 月，正是 Anthropic 最激进地推出了面向国安机构的定制模型 **Claude Gov**，成为唯一将模型部署进军方机密网络的公司，并以象征性 1 美元的价格向美国联邦行政、立法、司法三大分支推销 Claude。
* **“恐惧营销”与监管俘获质疑：** 2026 年 3 月，10 万亿参数模型 **Mythos** 因泄露曝光，Anthropic 紧急宣布其风险太高暂不公开，转而向亚马逊、苹果、谷歌等科技巨头推出封闭的 **Project Glasswing** 计划，被 OpenAI 等抨击为“宣称造了炸弹要砸你头上，再高价卖你防空洞”的恐惧加饥饿营销。然而当防护栏版本 **Fable 5** 上线三天遭美国政府限制访问时，Anthropic 立刻申诉称其他公司也具备类似能力。这种随商业环境灵活调节“恐惧音量”的做法，引发了监管俘获（Regulatory Capture）的尖锐指控——独立调查者 Kevin Bass 梳理其资本与慈善网络，质疑其通过资助安全研究和舆论推动严苛监管，最终让头部巨头受益。此外，公司频发大规模失业预警、渲染中国威胁论并拒绝加入黄仁勋牵头的开源模型联盟，逐渐站到了整个行业的对立面。

---

## 七、 终极悖论：天才之国、技术青春期与万亿 IPO 之后

创立之初，Dario 在备忘录里设想的是一家 50 人、100 亿美元造出 AGI 的小型实验室，如今却膨胀为超 5300 人、近 2 万亿体量的巨无霸。他在招股书中用 90 多页详述 AI 风险，而其内心撕裂正体现在他的两篇代表作中：

* **《Machines of Loving Grace》（2024 年 6 月）：** 描绘了数据中心的“天才之国”——数百万个比人类顶尖科学家更聪明的智能体昼夜协作，将人类百年科技路压缩进几年，攻克绝大多数疾病、让寿命翻倍。
* **《The Adolescence of Technology》（2026 年初）：** 收起浪漫想象，将人类比作拿到超级跑车钥匙的青少年，警示恶意滥用、AI 自主作恶、权力过度集中与社会经济秩序颠覆。

熟悉他的人认为，Dario 真心担忧 AI 毁灭世界，但他的底层逻辑是“谁先造出这项技术，谁就能为所有人制定规则”——因此他既拉响最刺耳的警报，又以最快的速度全速狂奔。在私有公司时代，PBC 与五类股权尚能将资本压力挡在门外；但在敲响纳斯达克上市钟声后，面对每个季度的财报数字、股价涨跌与股东期待，当安全使命与商业增长迎头相撞，Anthropic 究竟会成为人类文明的守门人，还是终究难逃“使命让位于市场”的宿命，将是万亿 IPO 之后最大的悬念。

**视频来源：** [硅谷101 — 《Anthropic崛起史：最强AI背后的矛与盾，布道者与伪君子》（YouTube，99 分钟）](https://www.youtube.com/watch?v=sYdN4b14rHU)

</div>
