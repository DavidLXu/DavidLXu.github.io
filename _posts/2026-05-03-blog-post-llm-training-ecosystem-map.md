---
title: "A Practical Map of LLM Training Ecosystems"
date: 2026-05-03
permalink: /posts/2026/05/llm-training-ecosystem-map/
excerpt: "A compact field note on how Megatron, Hugging Face, PyTorch, vLLM, SGLang, and verl fit together in a practical LLM training pipeline."
tags:
  - LLM Training
  - Megatron
  - Hugging Face
  - PyTorch
  - vLLM
  - SGLang
  - Reinforcement Learning
  - Engineering Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## The Short Version

After working through a small LLM training pipeline, I find it useful to think of the ecosystem in layers:

```text
PyTorch / CUDA / NCCL
    -> Megatron / FSDP / DeepSpeed / Accelerate
    -> Hugging Face Transformers / safetensors / Hub
    -> vLLM / SGLang / TensorRT-LLM
    -> TRL / OpenRLHF / verl / NeMo-Aligner
```

These tools are not competing in one flat category. They sit at different levels of the stack. The mistake is to ask, "Should I use Megatron or Hugging Face?" as if they solve the same problem. In practice, the better question is: **which part of the lifecycle am I in?**

For my current setup, the clean mental model is:

```text
Megatron for pretraining
Hugging Face safetensors for exchange and deployment
vLLM or SGLang for serving and evaluation
verl for serious RL post-training
PyTorch underneath almost everything
```

## Megatron Is the Heavy Training Machine

Megatron, especially Megatron-Core and NeMo-Megatron, is built for large-scale training. Its natural language is tensor parallelism, pipeline parallelism, data parallelism, sequence parallelism, distributed optimizer state, and distributed checkpoints.

That matters once the job is no longer a notebook experiment. On two 8-GPU A100 servers, Megatron gives a more direct path to training a 3B or larger dense model than a plain Hugging Face loop. It knows how to split weights across GPUs, how to resume from sharded checkpoints, and how to make NVIDIA hardware do the boring expensive work with fewer surprises.

For from-scratch pretraining or serious continued pretraining, I would keep Megatron as the main training path.

## Hugging Face Is the Exchange Layer

Hugging Face is not just a training library. It is the common language of the open-source model world.

The important pieces are:

- `transformers` for model definitions and loading
- `datasets` and `tokenizers` for data and preprocessing
- `safetensors` for portable model weights
- `PEFT` and `TRL` for lightweight fine-tuning and alignment experiments
- the Hub as the distribution layer

Hugging Face safetensors can be used for training, especially SFT, LoRA, DPO, and smaller continued pretraining. But for large distributed pretraining, it is usually not the checkpoint format I want to rely on. A Megatron checkpoint contains the training state in the shape Megatron needs: TP/PP/DP partitioning, optimizer state, scheduler state, RNG state, and iteration metadata.

So the pattern is not:

```text
choose Megatron or Hugging Face
```

It is more like:

```text
train in Megatron
export to Hugging Face safetensors
use the HF version for evaluation, serving, sharing, and lighter post-training
```

The conversion can also go the other way. A Hugging Face model can be converted into Megatron format for continued pretraining. But that is usually a **weight initialization conversion**, not a perfect recovery of optimizer and dataloader state.

## PyTorch Is the Ground Floor

PyTorch sits below all of this. Megatron uses PyTorch. Hugging Face uses PyTorch. verl and OpenRLHF usually use PyTorch. Even when the user-facing framework has a different name, the low-level reality is often still tensors, autograd, CUDA, NCCL, and distributed process groups.

This matters because debugging eventually falls through the abstraction. A training run may look like "Megatron failed", but the real issue can be NCCL topology, CUDA memory fragmentation, a PyTorch distributed checkpoint mismatch, or a dataset worker hanging.

For LLM engineering, knowing PyTorch distributed is not optional forever. You can postpone it, but it comes back.

## vLLM and SGLang Are Serving Engines

vLLM and SGLang enter after the model is usable enough to poke.

vLLM is the default choice when I want a stable OpenAI-compatible server, good throughput, and a short path from Hugging Face weights to an API. It is direct and practical.

SGLang overlaps with vLLM, but it is more opinionated about structured generation and inference programs. If the task involves JSON constraints, tool-like multi-step flows, prefix reuse, or agent-style rollout logic, SGLang becomes more interesting.

Neither wants a raw Megatron distributed training checkpoint as the happy path. They want a deployable model format, usually Hugging Face safetensors.

## verl Is the RL Post-Training Layer

Reinforcement learning post-training is its own system problem. It is not just "call `loss.backward()` with a different loss."

A real RL pipeline has several moving parts:

- actor model
- reference model
- reward model or rule-based reward
- rollout engine
- advantage estimation
- PPO or GRPO update
- distributed scheduling
- checkpointing and evaluation

This is why verl is attractive. It is designed around the RL post-training workflow, not merely around a single trainer class. It can connect training workers with rollout engines such as vLLM or SGLang, and it is a better fit once the job becomes multi-GPU or multi-node.

For a quick proof of concept, TRL is still a good place to start. For a serious 16-GPU RL run, I would look at verl first.

## My Current Pipeline

The pipeline I would use now is:

```text
1. Pretrain or continue-pretrain with Megatron
2. Save Megatron distributed checkpoints for resume
3. Convert selected checkpoints to Hugging Face safetensors
4. Evaluate and serve with vLLM or SGLang
5. Run SFT or DPO with HF/TRL if the experiment is small
6. Run GRPO/PPO with verl if the RL stage becomes serious
7. Export the final actor back to HF format for deployment
```

This keeps each tool in its strongest role. Megatron handles the expensive pretraining phase. Hugging Face makes the model portable. vLLM and SGLang make it easy to test and serve. verl handles the messy RL loop.

The main lesson is simple: **do not force one ecosystem to do every job.** The practical stack is a chain of handoffs.

## Takeaway

With two machines and 16 A100s, I would use Megatron as the main path for from-scratch pretraining. At the same time, I would regularly export selected checkpoints to Hugging Face safetensors, because evaluation, serving, sharing, and post-training are easier once the model is in that format.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## 简短版本

最近把一条小型 LLM 训练链路跑下来以后，我觉得最清楚的理解方式，是把这些工具看成不同层级：

```text
PyTorch / CUDA / NCCL
    -> Megatron / FSDP / DeepSpeed / Accelerate
    -> Hugging Face Transformers / safetensors / Hub
    -> vLLM / SGLang / TensorRT-LLM
    -> TRL / OpenRLHF / verl / NeMo-Aligner
```

它们不是在同一个平面上竞争。很多时候，问“我应该用 Megatron 还是 Hugging Face”并不准确。更好的问题是：**我现在处在模型生命周期的哪一段？**

对我现在这条 pipeline 来说，比较自然的分工是：

```text
Megatron 做预训练
Hugging Face safetensors 做交换和部署格式
vLLM 或 SGLang 做推理服务和评估
verl 做比较正式的 RL 后训练
PyTorch 是底层地基
```

## Megatron 是重型训练机器

Megatron，特别是 Megatron-Core 和 NeMo-Megatron，本来就是为大规模训练设计的。它关心的是 tensor parallel、pipeline parallel、data parallel、sequence parallel、distributed optimizer，以及分布式 checkpoint。

这件事在训练不再是 notebook 实验以后很重要。两台 8 卡 A100 服务器上，如果目标是从头训 3B 或更大的模型，Megatron 通常比一个普通 Hugging Face 训练脚本更顺。它知道怎么把权重切到多张卡上，怎么从 sharded checkpoint 恢复，也更贴近 NVIDIA 多卡训练的真实路径。

所以如果是 from-scratch pretraining，或者比较认真的 continued pretraining，我会把 Megatron 放在主线。

## Hugging Face 是交换层

Hugging Face 不只是一个训练库。它更像开源模型世界的通用语言。

里面几个关键组件是：

- `transformers` 负责模型定义和加载
- `datasets` 和 `tokenizers` 负责数据和 tokenizer
- `safetensors` 负责可移植的权重文件
- `PEFT` 和 `TRL` 适合轻量微调和对齐实验
- Hub 负责分发和复用

Hugging Face safetensors 当然可以参与训练，尤其是 SFT、LoRA、DPO、小规模 continued pretraining。但如果是大规模分布式预训练，我一般不会把它当作主 checkpoint 格式。Megatron checkpoint 保存的是 Megatron 恢复训练真正需要的状态：TP/PP/DP 切分、optimizer、scheduler、RNG、iteration metadata 等。

所以不是：

```text
Megatron 和 Hugging Face 二选一
```

而更像：

```text
用 Megatron 训练
导出成 Hugging Face safetensors
再用 HF 格式做评估、推理、分享和后续轻量训练
```

反过来也可以。Hugging Face 权重可以转成 Megatron 格式，用来继续预训练。但这种转换通常是**权重初始化转换**，不是把 optimizer、dataloader、随机数状态都完整恢复出来。

## PyTorch 是地基

PyTorch 在更底层。Megatron 用 PyTorch，Hugging Face 用 PyTorch，verl 和 OpenRLHF 大多也跑在 PyTorch 上。即使上层框架名字不同，底层仍然是 tensor、autograd、CUDA、NCCL 和 distributed process group。

这点很现实：很多问题最后都会掉到底层。表面看是“Megatron 报错”，实际可能是 NCCL 拓扑、CUDA 显存碎片、PyTorch distributed checkpoint 不匹配，或者 dataset worker 卡住。

做 LLM 工程，PyTorch distributed 可以晚点学，但很难永远绕开。

## vLLM 和 SGLang 是推理引擎

vLLM 和 SGLang 通常出现在模型已经能拿来测试以后。

vLLM 更像一个稳妥的默认选择：从 Hugging Face 权重启动 OpenAI-compatible API，吞吐好，资料多，调试路径短。

SGLang 和 vLLM 有重叠，但它更强调结构化生成和 inference program。如果任务里有 JSON 约束、多步推理、prefix 复用、agent rollout 之类的东西，SGLang 会更有吸引力。

它们都不太想直接吃 Megatron 原生分布式训练 checkpoint。更舒服的路径是先转成 Hugging Face safetensors。

## verl 是 RL 后训练层

RL post-training 本身是一个系统问题，不只是换一个 loss 然后 `backward()`。

一条真实 RL 链路里通常会有：

- actor model
- reference model
- reward model 或 rule reward
- rollout engine
- advantage estimation
- PPO 或 GRPO 更新
- 分布式调度
- checkpoint 和评估

这就是 verl 有价值的地方。它不是只提供一个 trainer class，而是围绕 RL 后训练的系统结构来设计。它可以把训练 worker 和 vLLM/SGLang 这样的 rollout engine 接起来。实验一旦进入多卡、多机阶段，它会比手写拼装更自然。

如果只是 proof of concept，TRL 仍然很好用。如果要在 16 卡上认真做 RL，我会先看 verl。

## 我现在会怎么搭

我现在会把 pipeline 设计成这样：

```text
1. 用 Megatron 做预训练或 continued pretraining
2. 保留 Megatron distributed checkpoint 用于恢复训练
3. 定期把关键 checkpoint 转成 Hugging Face safetensors
4. 用 vLLM 或 SGLang 做评估和服务
5. 小实验用 HF/TRL 做 SFT 或 DPO
6. 正式 RL 阶段用 verl 做 GRPO/PPO
7. 最后的 actor 再导出成 HF 格式用于部署
```

这样每个工具都待在自己最擅长的位置上。Megatron 负责最贵的预训练，Hugging Face 负责可移植性，vLLM 和 SGLang 负责测试和服务，verl 负责复杂的 RL loop。

核心经验其实很简单：**不要强迫一个生态做所有事情。** 真正实用的 stack，是一串清楚的交接。

## Takeaway

如果有双机 16 张 A100，我会把 Megatron 作为 from-scratch pretraining 的主线。同时，我会定期把关键 checkpoint 导出成 Hugging Face safetensors，因为模型进入这个格式以后，评估、推理、分享和后训练都会更方便。

</div>
