---
title: "[Engineering Notes] From Byte-Level LLM Smoke Tests to Tokenized FSDP Pretraining"
date: 2026-04-29
permalink: /posts/2026/04/llm-pretraining-from-byte-level-to-fsdp-knowhow/
tags:
  - LLM Training
  - PyTorch
  - FSDP
  - Distributed Training
  - Tokenizer
  - A100
  - Engineering Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

This is a field note from building a small LLM pretraining stack on two 8-GPU A100 servers. The path was not a clean straight line: I started with a byte-level toy LLM, verified communication and FSDP, trained a small debug model, tried a 7B model from scratch, then moved to a real SentencePiece tokenizer, Hugging Face CCI3-HQ data, checkpointing, cached token shards, and finally a more reasonable 0.5B pretraining target.

The biggest lesson is simple:

> For early pretraining experiments, a smaller model trained on enough tokens is more informative than a large model trained on too few tokens.

In my case, a 7B model could run, checkpoint, and generate, but the generation quality was poor because it only saw about **204.8M tokens** in the CCI3-HQ run. A 0.5B model trained for **5.24B tokens** already produced much more fluent Chinese continuations, even though it was still far from instruction-following or factually reliable.

## Hardware and Setup

The experiments used two remote A100 servers:

| Server | GPUs | Notes |
|---|---:|---|
| node0 | 8 x A100 80GB | accessed through SSH port 1024 |
| node1 | 8 x A100 80GB | accessed through SSH port 6007 |
| shared storage | NAS | `/mnt/data_nas/lixin` visible from both machines |

The first version used a very manual but transparent stack:

```text
SSH + tmux + torchrun + NCCL + PyTorch FSDP
```

This is not a replacement for Slurm or Kubernetes, but it was perfect for understanding what actually happens:

- how many ranks are launched
- which GPU IDs are used
- how `MASTER_ADDR`, `MASTER_PORT`, `node_rank`, and `world_size` fit together
- whether NCCL communication works
- whether FSDP can save and restore checkpoints

For two fixed servers, manual `tmux` orchestration was enough. For a larger shared cluster, I would move to Slurm, Kubernetes, Ray, or at least a more complete job manager.

## Stage 1: Communication Probe Before Training

Before training anything real, I ran a communication probe using NCCL collectives. The probe creates GPU tensors and runs operations like:

```python
dist.all_reduce(tensor, group=group)
```

This tested three levels of communication:

| Group | Meaning |
|---|---|
| `world` | all GPUs across both machines |
| per-node group | GPUs inside one server |
| inter-node leaders | one leader rank per server, roughly testing cross-node bandwidth |

Observed result:

| Tensor | World Latency | World Alg BW | World Bus BW | Inter-Node BW |
|---|---:|---:|---:|---:|
| 16MB | 3.38 ms | 4.97 GB/s | 9.31 GB/s | 6.26 GB/s |
| 128MB | 23.07 ms | 5.82 GB/s | 10.91 GB/s | 6.47 GB/s |

This was good enough for multi-node FSDP experiments, but it was not a high-end InfiniBand-style training fabric. That matters later: FSDP full-shard depends on repeated parameter all-gather and gradient reduce-scatter.

## Stage 2: Byte-Level Debug Model

The first model was a small LLaMA-like Transformer:

```text
debug_120m
actual parameters: about 98M
tokenizer: byte-level
vocab size: 8192
```

The goal was not language quality. The goal was to answer:

- Can 16 ranks form a NCCL process group?
- Can FSDP initialize?
- Can forward, backward, optimizer step, and checkpointing all run?
- Can a saved checkpoint be loaded for generation?

A synthetic 5-step FSDP smoke test worked:

| Step | Max Step Time |
|---:|---:|
| 1 | 1.267 s, warmup |
| 2 | 0.203 s |
| 3 | 0.202 s |
| 4 | 0.249 s |
| 5 | 0.246 s |

Then I trained on an authorized local science-fiction corpus:

```text
files: 196 TXT files
size: 37,762,964 UTF-8 bytes
model: debug_120m
nodes x GPUs: 2 x 4
GPU IDs: 4,5,6,7 on each node
seq_len: 512
micro_batch_size: 1
```

The 10k-step run reached:

```text
final avg loss: 1.1704
step 10000 time: 0.148 s
throughput: 27,726 tok/s
```

Generation became more Chinese-looking and science-fiction-like, but the semantics were still weak. This was expected: byte-level training is useful for debugging, but it is inefficient for real Chinese LLM pretraining because each Chinese character expands into multiple bytes.

## Stage 3: 7B Can Run, But It Does Not Mean It Has Learned Enough

Next I launched a LLaMA-shaped 7B model:

```text
model: llama_7b
parameters: 6.738B
layers: 32
hidden size: 4096
attention heads: 32
FFN hidden size: 11008
parallelism: FSDP full shard
nodes x GPUs: 2 x 5
GPU IDs: 3,4,5,6,7 on each node
world_size: 10
seq_len: 2048
micro_batch_size: 1
grad_accum_steps: 1
```

The key formula:

```text
global tokens per optimizer step =
  world_size * micro_batch_size * seq_len * grad_accum_steps
```

For this 7B run:

```text
10 * 1 * 2048 * 1 = 20,480 tokens / step
```

At 10,000 steps:

```text
trained tokens ~= 204.8M
```

The system worked:

```text
final avg loss: 1.3864 on the local byte-level science-fiction corpus
step time: about 0.985 s
throughput: about 20,795 tok/s
checkpoint size: about 26GB
```

But the output quality was weak. This was an important lesson: **running 7B is not the same as training 7B well**. A 7B model trained from scratch usually needs on the order of hundreds of billions to trillions of tokens. A Chinchilla-style rough target for 7B is:

```text
7B params * 20 ~= 140B tokens
```

So the 7B experiment was primarily a systems validation:

- multi-node FSDP works
- checkpointing works
- single-GPU generation from checkpoint works
- GPU memory is manageable
- the training loop is real

It was not a sufficient 7B pretraining run.

## Stage 4: Moving From Byte-Level to SentencePiece

The next scaffold moved from the local corpus to `BAAI/CCI3-HQ` and from byte-level tokenization to SentencePiece:

```text
dataset: BAAI/CCI3-HQ
tokenizer: SentencePiece Unigram
vocab size: 32,000
byte_fallback: enabled
character_coverage: 0.9995
```

The tokenizer was trained from a streaming sample:

```text
sample: 200,000 documents
characters: about 376M
vocab size: 32k pieces
```

This was a major upgrade. Byte-level tokenization is fine for smoke tests; a real tokenizer is necessary for efficient training. For Chinese, this also means traditional word segmentation like jieba is usually not needed: modern LLM tokenizers learn subword pieces directly from raw text, and byte fallback handles rare characters.

## Stage 5: HF Streaming Worked, But It Became a Bottleneck

Hugging Face streaming was convenient because it allowed training without first downloading the full dataset:

```python
load_dataset(..., streaming=True)
```

In distributed training, each rank receives a different stream slice. Conceptually, each GPU is not loading the entire dataset into memory; it pulls examples on demand, tokenizes them, and forms batches.

This worked, but it had two practical issues:

1. Network stalls caused occasional long step times.
2. Online tokenization made the input path less predictable.

A 0.5B streaming run showed normal steps around **5.6-5.9s**, but with occasional stalls and checkpoint overhead. Profiling and observation made the next direction clear:

```text
HF streaming text
  -> SentencePiece token ids
  -> uint16 token shards
  -> cached token training
```

The current partial/full cache work produced a token cache of about:

```text
documents: 17.0M
tokens: 26.3B
size: about 97GB
format: uint16 token shards + manifests
```

After switching to cached token shards, training no longer depended on live HF streaming. This made step time much more stable.

## Stage 6: 0.5B Was the Better First Serious Target

The 0.5B model preset:

```text
parameters: about 557.8M
dim: 1280
layers: 24
heads: 20
FFN hidden_dim: 3456
max_seq_len: 4096
vocab: 32k SentencePiece
```

The first successful 0.5B run:

```text
server: 6007
GPUs: 8
world_size: 8
seq_len: 2048
micro_batch_size: 8
grad_accum_steps: 8
global tokens/update: 1,048,576
trained steps: 5000
trained tokens: 5.24B
wall time: about 9h 53m
```

Evaluation:

```text
quick eval loss: 3.0461
ppl: 21.03
eval tokens: 32,768
```

The `full_rank0` checkpoint was also evaluated on one A100 for quick inference:

```text
checkpoint: checkpoints/cci3_llama500m_single_node_8gpus_mb8_ga8_5000steps_5p24Btok_9h53m/full_rank0/step_00005000/model.pt
preset: llama_500m
parameters: about 0.558B
generation: temperature=0.8, top_k=50, max_new_tokens=96
results: results/cci3_llama500m_step5000_full_rank0_generation.jsonl
```

Sampled generation results:

| Prompt | Output excerpt |
|---|---|
| 宇宙飞船正在飞向 | 宇宙飞船正在飞向火星。 这一计划是由美国宇航局航天飞机项目的负责人杰夫·霍顿(Jeff Hondor)提出的。霍顿和他的同事们一直试图通过提高载人船的运力,避免它们被敌人的超大船拖入轨道... |
| 人工智能的发展意味着 | 人工智能的发展意味着 AI 的逐步落地,AI 将成为驱动 AI 发展的核心驱动力。 AI 时代,人工智能将重塑各行各业,加速各行业的数字化转型和创新... |
| 在遥远的未来，人类文明 | 在遥远的未来,人类文明将要迎来一个崭新的时代。人类社会从人类历史开始,就进入了人类历史的时代。历史是由时间来记录的,而时间是历史的真实写照... |
| 地球上的最后一个城市 | 地球上的最后一个城市。 "这个城市位于南极洲。" "如果我去南极,我会去那里,到北极或南极去。" 1992年11月,25岁的格里菲斯在斯德哥尔摩乘坐游轮登上北极... |

This was surprisingly encouraging. With only **8 A100 GPUs**, **5,000 optimizer steps**, and about **5.24B training tokens**, the model had already learned a recognizable sense of Chinese sentence structure, web-text style, exposition rhythm, and topic association. The knowledge itself was not reliably correct, but the language texture was already visible. That distinction felt important: pretraining first teaches distributional form and style before it becomes trustworthy knowledge or instruction-following behavior.

This model was still a base pretraining checkpoint, not an instruction model. It failed many structured QA prompts. For example, it associated Li Bai with wine and `将进酒`, but did not reliably answer the question; it listed wrong countries for socialist states; and it failed to write a requested poem.

Still, compared with the 7B 10k-step run, it was clearly more fluent. The reason was not magic:

| Item | 7B CCI3-HQ Run | 0.5B Run |
|---|---:|---:|
| Parameters | ~6.7B | ~0.558B |
| GPUs | 10 | 8 |
| Seq len | 2048 | 2048 |
| Global tokens/update | 20,480 | 1,048,576 |
| Evaluated step | 10,000 | 5,000 |
| Trained tokens | 204.8M | 5.24B |
| Final/near-final loss | ~5.13 | ~3.05 eval loss |

The 0.5B model had seen about **25.6x more tokens**. It also had fewer parameters to fit. That combination mattered more than the headline parameter count.

## Stage 7: Parallelism: What We Actually Used

The current training setup is:

```text
TP = 1
PP = 1
FSDP-DP = number of GPUs used
```

That means:

- **No Tensor Parallelism**: individual matrix multiplications are not split across GPUs.
- **No Pipeline Parallelism**: different layers are not assigned to different GPUs.
- **FSDP full shard**: parameters, gradients, and optimizer states are sharded across ranks.

Every rank has the full Python module structure, but it only stores shards of the model states. During training, FSDP gathers the current layer's parameters, computes forward/backward, then reduce-scatters gradients.

Important collectives:

| Collective | Meaning |
|---|---|
| all-gather | each rank has a shard; after all-gather, each rank has the full tensor |
| all-reduce | each rank has a full tensor; after reduction, each rank has the same reduced full tensor |
| reduce-scatter | reduce full tensors, then scatter reduced shards |

For the experiments:

```text
8 GPU single-node run: FSDP-DP = 8
5 GPU single-node run: FSDP-DP = 5
10 GPU two-node run: FSDP-DP = 10
```

For 7B, `TP=1, PP=1, FSDP-DP=N` is a reasonable learning setup. For 32B, 70B, or longer context, I would start considering TP, PP, sequence/context parallelism, or a Megatron/DeepSpeed-style stack.

## Stage 8: Micro Batch vs Gradient Accumulation

The formula that explains most experiments:

```text
global_batch_tokens =
  world_size * micro_batch_size * grad_accum_steps * seq_len
```

Definitions:

| Term | Meaning |
|---|---|
| `micro_batch_size` | samples per GPU per forward/backward |
| `grad_accum_steps` | how many micro-steps before one optimizer update |
| `world_size` | total distributed ranks, usually total GPUs |
| `seq_len` | tokens per sample |

Intuition:

- Increasing `micro_batch_size` uses more activation memory and may improve GPU utilization, but can hit memory limits quickly.
- Increasing `grad_accum_steps` increases global batch without much extra peak activation memory, but each optimizer step contains more forward/backward passes.
- If `grad_accum_steps > 1`, using `no_sync()` on non-final micro-steps avoids unnecessary gradient synchronization.

Two current cached-data experiments made this concrete:

| Run | GPUs | Micro Batch | Grad Accum | Tokens/Step | Step Time | Throughput | Peak Alloc |
|---|---:|---:|---:|---:|---:|---:|---:|
| 6007 cached 0.5B | 8 | 32 | 2 | 1.05M | ~5.23 s | ~200k tok/s | ~29.8GB |
| 1024 cached 0.5B | 5 | 64 | 2 | 1.31M | ~10.3 s | ~126k tok/s | ~58.1GB |

This shows a useful rule: **a larger per-step token count does not guarantee better throughput**. The 5-GPU `mb64-ga2` run processes more tokens per optimizer step, but it is slower overall because it uses fewer GPUs and much more memory per GPU. The 8-GPU `mb32-ga2` run is healthier.

## Stage 9: Checkpointing Lessons

The training scaffold now supports:

```text
full_rank0
dcp
both
none
```

`full_rank0` is convenient for generation and inspection:

```text
full_rank0/step_00005000/model.pt
```

`dcp` means PyTorch Distributed Checkpoint. It is better for distributed resume because it can save sharded model and optimizer states:

```text
dcp/step_00005000/
```

Because both servers share a NAS path, DCP is practical here. But exact sample-level resume is harder with HF streaming. The current implementation restores model state, optimizer state, RNG state, and step number, but streaming dataset position is not exactly replayed. For large shuffled pretraining streams, this is usually acceptable; for strict reproducibility, the data pipeline needs deterministic token shards and stored offsets.

## What I Would Keep As Know-How

Here is the distilled checklist I would keep for future pretraining runs:

1. **Validate communication before training.** Run NCCL probes before debugging model code.
2. **Start with a tiny model.** A 100M model tells you if the distributed system works.
3. **Do not over-interpret early generation.** A model can generate text-looking output long before it knows facts or follows instructions.
4. **Track tokens, not just steps.** Steps mean little without `world_size * micro_batch * grad_accum * seq_len`.
5. **Byte-level tokenization is for smoke tests.** Real Chinese pretraining needs a serious tokenizer.
6. **Small model plus enough data beats large model plus starvation.** The 0.5B run was more informative than the early 7B run.
7. **FSDP-only is enough to learn distributed training.** But TP/PP become important as model size and context length grow.
8. **Streaming is convenient, cached tokens are stable.** Online streaming is great for exploration; pre-tokenized shards are better for long runs.
9. **Micro batch and grad accumulation trade memory for throughput.** They are not interchangeable even if global batch is the same.
10. **Checkpoint format matters.** Save full-rank checkpoints for quick generation, DCP for serious resume.

## Personal Takeaway

This exercise changed how I think about "training a model." At the start, the milestone was simply: can a 7B model run on the GPUs? Later, the better question became: how many clean tokens did the model actually see, how stable is the input pipeline, how are states sharded, and what exactly does one optimizer step mean?

That shift is the real progress. The experiments moved from "make it run" to "make it measurable."

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 概要

这是一篇关于两台 8 卡 A100 服务器上搭建 LLM 预训练栈的实践笔记。这个过程不是一条直线：一开始是 byte-level 的小 LLM，用来验证通信和 FSDP；然后训练 debug 小模型；再尝试从零训练 7B；之后切换到真正的 SentencePiece tokenizer、Hugging Face CCI3-HQ 数据、checkpoint、缓存 token shards；最后把主要目标改成更合理的 0.5B 预训练。

最大的经验其实很朴素：

> 早期预训练实验里，一个小模型看过足够多 token，比一个大模型只看过很少 token 更有参考价值。

在我的实验里，7B 模型可以跑、可以保存 checkpoint、也可以生成文本，但因为 CCI3-HQ 那次只训练了约 **204.8M tokens**，生成质量很差。反过来，0.5B 模型训练了 **5.24B tokens** 后，中文续写已经明显更流畅，虽然它仍然不是 instruction model，事实性和问答能力也还不稳定。

## 硬件和基础环境

实验使用两台远端 A100 服务器：

| 服务器 | GPU | 说明 |
|---|---:|---|
| node0 | 8 x A100 80GB | SSH port 1024 |
| node1 | 8 x A100 80GB | SSH port 6007 |
| shared storage | NAS | 两台机器都能访问 `/mnt/data_nas/lixin` |

第一版使用的是非常手动但透明的训练栈：

```text
SSH + tmux + torchrun + NCCL + PyTorch FSDP
```

它不是 Slurm 或 Kubernetes 的替代品，但非常适合学习底层发生了什么：

- 启动了多少个 rank
- 使用哪些 GPU ID
- `MASTER_ADDR`、`MASTER_PORT`、`node_rank`、`world_size` 之间是什么关系
- NCCL 通信是否正常
- FSDP 是否能保存和恢复 checkpoint

对于两台固定服务器，手动 `tmux` 调度足够用；如果是更大的共享集群，我会迁移到 Slurm、Kubernetes、Ray，或者至少写一个更完整的 job manager。

## 阶段一：训练前先做通信探针

在训练真实模型之前，我先跑了 NCCL 通信探针。通信探针会创建 GPU tensor，然后执行 collective，比如：

```python
dist.all_reduce(tensor, group=group)
```

它测试了三类通信：

| Group | 含义 |
|---|---|
| `world` | 两台机器上的所有 GPU |
| 单机 group | 同一台服务器内部 GPU |
| inter-node leaders | 每台机器取一个 leader rank，粗略测试跨节点链路 |

观察结果：

| Tensor | World Latency | World Alg BW | World Bus BW | Inter-Node BW |
|---|---:|---:|---:|---:|
| 16MB | 3.38 ms | 4.97 GB/s | 9.31 GB/s | 6.26 GB/s |
| 128MB | 23.07 ms | 5.82 GB/s | 10.91 GB/s | 6.47 GB/s |

这个结果足够支撑多机 FSDP 实验，但不是很强的 InfiniBand 训练网络。后面这会影响训练效率，因为 FSDP full-shard 会不断做参数 all-gather 和梯度 reduce-scatter。

## 阶段二：Byte-Level Debug 小模型

第一个模型是一个很小的 LLaMA-like Transformer：

```text
debug_120m
实际参数量: 约 98M
tokenizer: byte-level
vocab size: 8192
```

目标不是语言质量，而是回答这些系统问题：

- 16 个 rank 能不能建立 NCCL process group？
- FSDP 能不能初始化？
- forward、backward、optimizer step、checkpoint 是否都能跑通？
- checkpoint 能不能加载并生成？

Synthetic 5-step FSDP smoke test 正常：

| Step | Max Step Time |
|---:|---:|
| 1 | 1.267 s，warmup |
| 2 | 0.203 s |
| 3 | 0.202 s |
| 4 | 0.249 s |
| 5 | 0.246 s |

之后用本地授权科幻语料训练：

```text
files: 196 TXT files
size: 37,762,964 UTF-8 bytes
model: debug_120m
nodes x GPUs: 2 x 4
GPU IDs: 每台机器 4,5,6,7
seq_len: 512
micro_batch_size: 1
```

10k-step run 达到：

```text
final avg loss: 1.1704
step 10000 time: 0.148 s
throughput: 27,726 tok/s
```

生成结果开始像中文科幻文本，但语义仍然很弱。这很正常：byte-level 适合 smoke test，但不适合真正中文 LLM 预训练，因为中文字符会被拆成多个 byte token，效率很低。

## 阶段三：7B 能跑，不等于 7B 训好了

下一步启动 LLaMA-shaped 7B：

```text
model: llama_7b
parameters: 6.738B
layers: 32
hidden size: 4096
attention heads: 32
FFN hidden size: 11008
parallelism: FSDP full shard
nodes x GPUs: 2 x 5
GPU IDs: 每台机器 3,4,5,6,7
world_size: 10
seq_len: 2048
micro_batch_size: 1
grad_accum_steps: 1
```

关键公式是：

```text
每个 optimizer step 的 global tokens =
  world_size * micro_batch_size * seq_len * grad_accum_steps
```

这个 7B run 是：

```text
10 * 1 * 2048 * 1 = 20,480 tokens / step
```

训练 10,000 steps：

```text
trained tokens ~= 204.8M
```

系统层面是成功的：

```text
final avg loss: 1.3864，本地 byte-level 科幻语料
step time: 约 0.985 s
throughput: 约 20,795 tok/s
checkpoint size: 约 26GB
```

但输出质量很弱。这是一个重要经验：**能跑 7B，不代表 7B 已经被充分训练**。一个从零训练的 7B 模型通常需要数千亿到万亿级 token。按照 Chinchilla 风格的粗略估计：

```text
7B params * 20 ~= 140B tokens
```

所以这个 7B 实验主要是系统验证：

- 多机 FSDP 可行
- checkpoint 可保存
- checkpoint 可单卡加载生成
- 显存能撑住
- 训练 loop 是真实可用的

它不是一个 token 充足的 7B 预训练实验。

## 阶段四：从 Byte-Level 切换到 SentencePiece

第二阶段框架从本地小语料转到 `BAAI/CCI3-HQ`，并从 byte-level tokenizer 换成 SentencePiece：

```text
dataset: BAAI/CCI3-HQ
tokenizer: SentencePiece Unigram
vocab size: 32,000
byte_fallback: enabled
character_coverage: 0.9995
```

tokenizer 由 streaming sample 训练：

```text
sample: 200,000 documents
characters: 约 376M
vocab size: 32k pieces
```

这是很关键的一步。Byte-level tokenizer 适合验证训练链路；真正预训练需要正式 tokenizer。对中文来说，这也意味着传统 jieba 分词通常不是必要步骤：现代 LLM tokenizer 会直接从原始文本里学习 subword pieces，并且通过 byte fallback 处理罕见字符。

## 阶段五：HF Streaming 能用，但会成为瓶颈

Hugging Face streaming 很方便，因为不用先把整个数据集下载完：

```python
load_dataset(..., streaming=True)
```

分布式训练时，每个 rank 会拿到不同的 stream slice。概念上，每张 GPU 并不会把整个数据集加载进内存，而是按需拉取样本、现场 tokenize、组成 batch。

这条路能跑，但有两个实践问题：

1. 网络抖动会导致偶发长 step。
2. 在线 tokenization 让输入 pipeline 不够稳定。

0.5B streaming run 的正常 step 大约是 **5.6-5.9s**，但会有偶发 stall 和 checkpoint 开销。profiling 和观察之后，比较推荐的方向变成：

```text
HF streaming text
  -> SentencePiece token ids
  -> uint16 token shards
  -> cached token training
```

当前已经做出的缓存大约是：

```text
documents: 17.0M
tokens: 26.3B
size: 约 97GB
format: uint16 token shards + manifests
```

切换到 cached token shards 后，训练不再依赖实时 HF streaming，step time 稳定很多。

## 阶段六：0.5B 是更好的第一个严肃目标

0.5B 模型配置：

```text
parameters: 约 557.8M
dim: 1280
layers: 24
heads: 20
FFN hidden_dim: 3456
max_seq_len: 4096
vocab: 32k SentencePiece
```

第一次成功的 0.5B run：

```text
server: 6007
GPUs: 8
world_size: 8
seq_len: 2048
micro_batch_size: 8
grad_accum_steps: 8
global tokens/update: 1,048,576
trained steps: 5000
trained tokens: 5.24B
wall time: 约 9h 53m
```

快速评估：

```text
quick eval loss: 3.0461
ppl: 21.03
eval tokens: 32,768
```

也用一张 A100 对 `full_rank0` checkpoint 做了快速生成测试：

```text
checkpoint: checkpoints/cci3_llama500m_single_node_8gpus_mb8_ga8_5000steps_5p24Btok_9h53m/full_rank0/step_00005000/model.pt
preset: llama_500m
parameters: 约 0.558B
generation: temperature=0.8, top_k=50, max_new_tokens=96
results: results/cci3_llama500m_step5000_full_rank0_generation.jsonl
```

采样生成结果：

| Prompt | 输出片段 |
|---|---|
| 宇宙飞船正在飞向 | 宇宙飞船正在飞向火星。 这一计划是由美国宇航局航天飞机项目的负责人杰夫·霍顿(Jeff Hondor)提出的。霍顿和他的同事们一直试图通过提高载人船的运力,避免它们被敌人的超大船拖入轨道... |
| 人工智能的发展意味着 | 人工智能的发展意味着 AI 的逐步落地,AI 将成为驱动 AI 发展的核心驱动力。 AI 时代,人工智能将重塑各行各业,加速各行业的数字化转型和创新... |
| 在遥远的未来，人类文明 | 在遥远的未来,人类文明将要迎来一个崭新的时代。人类社会从人类历史开始,就进入了人类历史的时代。历史是由时间来记录的,而时间是历史的真实写照... |
| 地球上的最后一个城市 | 地球上的最后一个城市。 "这个城市位于南极洲。" "如果我去南极,我会去那里,到北极或南极去。" 1992年11月,25岁的格里菲斯在斯德哥尔摩乘坐游轮登上北极... |

这一点其实让我很惊讶。仅仅 **8 张 A100**、**5,000 个 optimizer steps**、大约 **5.24B training tokens**，模型就已经对中文句子结构、网页文本风格、说明文节奏和主题联想有了很明显的感知。它的知识性内容当然还不一定正确，但“语言的质感”已经出来了。这个区别很重要：预训练早期首先学到的是分布形式和风格，然后才逐渐变成可靠知识和指令跟随能力。

这个模型仍然只是 base pretraining checkpoint，不是 instruction model。它会答错很多结构化 QA：比如知道李白和酒、`将进酒` 有关联，但不能稳定回答“李白是哪个国家的、代表作有哪些”；问现存社会主义国家时会乱列国家；让它写诗，它会漂移成网页/百科式文本。

但和 7B 10k-step run 相比，它明显更流畅。原因并不神秘：

| 项目 | 7B CCI3-HQ Run | 0.5B Run |
|---|---:|---:|
| 参数量 | ~6.7B | ~0.558B |
| GPU | 10 | 8 |
| Seq len | 2048 | 2048 |
| Global tokens/update | 20,480 | 1,048,576 |
| 评估 step | 10,000 | 5,000 |
| 已训练 tokens | 204.8M | 5.24B |
| Final/near-final loss | ~5.13 | ~3.05 eval loss |

0.5B 模型看过的 token 数约是 7B run 的 **25.6 倍**，而且参数量更小，更容易在早期看到效果。这比“参数量更大”重要得多。

## 阶段七：我们实际使用的并行方式

当前训练配置可以写成：

```text
TP = 1
PP = 1
FSDP-DP = 使用的 GPU 数
```

也就是说：

- **没有 Tensor Parallelism**：单层矩阵乘法没有切到多张 GPU 上。
- **没有 Pipeline Parallelism**：不同层没有分配给不同 GPU。
- **使用 FSDP full shard**：参数、梯度、optimizer states 被 shard 到不同 rank。

每个 rank 都有完整的 Python module 结构，但只保存模型状态的一部分。训练时，FSDP 会 all-gather 当前层需要的参数，完成 forward/backward，然后 reduce-scatter 梯度。

几个 collective 的区别：

| Collective | 含义 |
|---|---|
| all-gather | 每个 rank 有一个 shard，之后每个 rank 都拿到完整 tensor |
| all-reduce | 每个 rank 有完整 tensor，reduce 后每个 rank 都得到同样的完整结果 |
| reduce-scatter | 先 reduce，再把结果 shard 分发给各个 rank |

实验中的并行规模：

```text
8 GPU 单机 run: FSDP-DP = 8
5 GPU 单机 run: FSDP-DP = 5
10 GPU 双机 run: FSDP-DP = 10
```

对 7B 来说，`TP=1, PP=1, FSDP-DP=N` 是很合理的学习配置。到了 32B、70B 或更长上下文时，就应该考虑 TP、PP、sequence/context parallelism，或者 Megatron/DeepSpeed 风格的训练栈。

## 阶段八：Micro Batch 和 Gradient Accumulation

最重要的公式还是：

```text
global_batch_tokens =
  world_size * micro_batch_size * grad_accum_steps * seq_len
```

几个定义：

| 参数 | 含义 |
|---|---|
| `micro_batch_size` | 每张 GPU 每次 forward/backward 处理多少样本 |
| `grad_accum_steps` | 累积多少个 micro-step 后做一次 optimizer update |
| `world_size` | 总 rank 数，通常等于总 GPU 数 |
| `seq_len` | 每个样本的 token 数 |

调参直觉：

- 增大 `micro_batch_size` 会增加 activation memory，可能提高 GPU 利用率，但容易撞显存。
- 增大 `grad_accum_steps` 可以在不明显增加 peak activation memory 的情况下增大 global batch，但一个 optimizer step 会包含更多 forward/backward，所以每 step 更慢。
- 当 `grad_accum_steps > 1` 时，在非最后一个 micro-step 使用 `no_sync()` 可以减少不必要的梯度同步。

两个当前 cached-data 实验很好地说明了这一点：

| Run | GPUs | Micro Batch | Grad Accum | Tokens/Step | Step Time | Throughput | Peak Alloc |
|---|---:|---:|---:|---:|---:|---:|---:|
| 6007 cached 0.5B | 8 | 32 | 2 | 1.05M | ~5.23 s | ~200k tok/s | ~29.8GB |
| 1024 cached 0.5B | 5 | 64 | 2 | 1.31M | ~10.3 s | ~126k tok/s | ~58.1GB |

这说明一个实用规律：**每 step 的 token 更多，不代表总吞吐更高**。5 卡 `mb64-ga2` 虽然每个 optimizer step 的 token 更多，但整体更慢，因为 GPU 数更少，而且每张卡显存压力更大。8 卡 `mb32-ga2` 反而更健康。

## 阶段九：Checkpoint 的经验

训练框架目前支持：

```text
full_rank0
dcp
both
none
```

`full_rank0` 方便做生成和检查：

```text
full_rank0/step_00005000/model.pt
```

`dcp` 是 PyTorch Distributed Checkpoint，更适合分布式 resume，因为它可以保存 sharded model 和 optimizer states：

```text
dcp/step_00005000/
```

由于两台服务器共享 NAS，DCP 在这里非常实用。但 HF streaming 的精确样本级 resume 更难。当前实现会恢复 model state、optimizer state、RNG state 和 step number，但 streaming dataset 的位置不会精确 replay。对于大规模 shuffled pretraining stream，这通常可以接受；如果要严格复现，就需要 deterministic token shards 和存储 offset。

## 我会保留下来的 Know-How

如果以后继续做预训练，我会保留这份 checklist：

1. **训练前先验证通信。** 先跑 NCCL probe，再 debug 模型代码。
2. **先用 tiny model。** 100M 模型足够验证分布式系统。
3. **不要过度解读早期 generation。** 模型很早就能生成“像文本”的东西，但离事实正确和指令跟随还很远。
4. **看 tokens，不只看 steps。** 没有 `world_size * micro_batch * grad_accum * seq_len`，step 数没有太大意义。
5. **Byte-level tokenizer 只适合 smoke test。** 中文真实预训练需要正式 tokenizer。
6. **小模型 + 足够数据，胜过大模型 + 数据饥饿。** 0.5B run 比早期 7B run 更有信息量。
7. **FSDP-only 足够学习分布式训练。** 但模型更大、上下文更长后，TP/PP 会变得重要。
8. **Streaming 方便探索，cached tokens 适合长跑。** 在线 streaming 很灵活，预 tokenize 后的 shards 更稳定。
9. **Micro batch 和 grad accumulation 是显存/吞吐折中。** 即使 global batch 一样，它们也不是完全等价。
10. **Checkpoint 格式要按用途选择。** full-rank checkpoint 方便生成，DCP 适合严肃 resume。

## 个人体会

这次实践改变了我对“训练一个模型”的理解。刚开始，里程碑只是：7B 能不能在这些 GPU 上跑起来？后来更重要的问题变成：模型到底看过多少干净 token，输入 pipeline 是否稳定，训练状态如何 shard，一个 optimizer step 到底代表什么。

这个转变才是真正的进展：实验从“让它跑起来”，变成了“让它可度量”。

</div>
