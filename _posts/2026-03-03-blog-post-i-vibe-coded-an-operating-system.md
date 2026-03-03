---
title: "I Vibe Coded an Operating System"
date: 2026-03-03
permalink: /posts/2026/03/i-vibe-coded-an-operating-system/
tags:
  - Operating Systems
  - Programming Languages
  - Codex
  - Runtime Systems
  - Project Notes
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

Over one weekend day, I more or less **vibe coded an operating system**. More precisely, I built a scripting-first OS prototype in which a Python bootloader loads a Pebble runtime, injects a Pebble shell, and then hands more and more user-visible behavior to Pebble code. There are no native binaries here in the usual sense; programs are source files, or source compiled to bytecode, and the whole system is organized around that fact.

The project lives here: [https://github.com/DavidLXu/PebbleOS](https://github.com/DavidLXu/PebbleOS). Even the name *PebbleOS* was suggested by Codex, which feels fitting in retrospect, because the project itself grew through a loop of design, refactoring, and implementation with Codex rather than through one big up-front plan. What started as a toy interpreter wrapped in a shell gradually turned into something much more interesting: a small system where the language is no longer just running inside the environment, but increasingly defining the environment itself.

## 1. The Real Pivot Was Architectural

PebbleOS did not start as a serious operating-system project. The original idea was much smaller: create some files, edit them, and run a tiny language from them. In that phase, the system was essentially a toy interpreter with a shell-like wrapper. The filesystem was still simple, the language was still small, and the whole project was exploratory rather than structural. What changed was not just feature count, but where policy started to live.

Once Pebble became expressive enough to describe parts of its own environment, the center of gravity moved. Pebble stopped being just the guest language and started becoming the system language. That is the key architectural move in this project. From that point on, the interesting question was no longer “what syntax should I add next?” but “what parts of the operating system can be pushed upward into Pebble, leaving Python as the substrate rather than the place where OS policy accumulates?”

## 2. What Actually Happens at Boot

The current boot path is already much closer to an OS bootstrapping story than a simple REPL launcher. When I run `python3 main.py`, Python acts as the hidden bootloader layer. It selects a filesystem mode, mounts the host runtime tree under `system/...`, loads `system/runtime.peb`, injects the source of `system/shell.peb` as data, calls `boot()`, and only then enters the interactive shell. That detail matters because it means the visible shell is no longer primarily defined by Python control flow. Prompt text, help behavior, launcher policy, and built-in command behavior now live in Pebble-managed files.

This is also why I think PebbleOS has a real bootstrap flavor now, even if it is not self-hosting in the compiler-toolchain sense. `system/runtime.peb` defines the shared runtime surface. `system/shell.peb` defines the interactive shell. Even the default editor experience now routes through Pebble-side code such as `system/nano.peb`. In other words, later Pebble programs run inside a world that earlier Pebble system code has already helped define.

## 3. Pebble Is a System Language, Not Just a Script Syntax

Technically, Pebble is still a small language, but it is now clearly a system-facing one. It uses Python-style indentation and currently supports loops, functions, lists, dicts, modules, `try/except`, `raise`, and first-class user-defined functions. There are built-in modules such as `math`, `text`, `os`, `random`, `memory`, and `heap`, and there are also file-based user modules imported directly from the active Pebble filesystem. That combination is important: Pebble is not just a shell macro language. It already has enough structure to express runtime helpers, command behavior, and parts of system control flow.

The execution model is also explicitly split. `run FILE [ARGS...]` executes Pebble source in interpreter mode, while `exec FILE [ARGS...]` compiles source to bytecode and runs it on the bytecode VM. Both are still present, but they are increasingly treated as compatibility launchers rather than the preferred user interface. The preferred model is now closer to `COMMAND [ARGS...]`, with the shell choosing how to launch programs. This is one place where the scripting-first nature of PebbleOS really shows: there is still no native binary format, only source and bytecode. The system is built around interpretable artifacts, not compiled executables.

## 4. The Filesystem Is the First Real OS Boundary

The filesystem is where PebbleOS first stopped feeling like a demo. Instead of a flat file list, it now exposes a rooted filesystem with current working directory tracking, absolute and relative paths, `.` and `..` normalization, mounted runtime files under `system/...`, and a visible `/dev` bootstrap view. The public API for all of this lives on the Pebble side in `system/runtime.peb`, even though Python still supplies the raw host bridge underneath. That split is important: Python provides primitive filesystem operations, but Pebble now decides how they compose into the filesystem the user actually sees.

The multi-mode storage design is also much more deliberate than it looks at first glance. `hostfs` gives a direct host-backed rooted filesystem for speed and easy debugging. `mfs` and `mfs-import` move user files into Pebble-managed in-memory storage, with explicit `sync` rather than hidden persistence. `vfs-import` and `vfs-persistent` push further by making a Pebble virtual filesystem the session or persistent source of truth. In Pebble-managed modes, there is even a shadow-file bridge for legacy paths like `run` and `nano`: a VFS-backed file may be copied into a temporary host file, operated on, then copied back. That is a very practical transitional design, and it captures the spirit of the project well: keep the substrate small, but let the visible semantics migrate upward.

## 5. Shell, Launcher, and Login Semantics Are Now Part of the Design

One reason this project feels more technical than a typical toy shell is that launch rules and session semantics are now explicitly documented and encoded. The command lookup order is defined: first shell builtins, then `PATH` lookup in `/system/bin` and `/system/sbin`, then `/bin/...` compatibility mapping, then direct Pebble program launch from the current directory with `.peb` implied. The preferred launch surface is `COMMAND [ARGS...]` or `COMMAND &`, while `run`, `exec`, `runbg`, and `execbg` remain bootstrap compatibility entrypoints that still expose interpreter-versus-bytecode distinctions.

Login behavior is similarly specified instead of left as an implementation accident. A shell session ensures bootstrap files such as `/etc/profile`, `/etc/passwd`, `/etc/group`, and `/etc/fstab`, then loads `/etc/profile` into the current session. The shell maintains a mutable environment map, supports `set`, `export`, `env`, and `source`, and even allows single-command assignment prefixes such as `FOO=bar env`. There is also a deliberately temporary bootstrap compromise in which `source FILE` and `sh FILE` currently execute in the same session state rather than as truly separate shell processes. That may sound like a small detail, but it is exactly the sort of technical distinction that matters when a shell grows into a real process model.

## 6. ABI First: Moving Policy Out of Python

The most technically important document in the repository may actually be the ABI plan, because it states the core rule of the whole architecture: new system features should first define a Pebble-visible ABI and only then map missing primitives to the host. That is the opposite of the usual “just add one more Python helper” trap. The host function inventory is already being classified into syscall families such as `fs`, `proc`, `term`, `clock`, and `error`, while the target Pebble-side ABI expands that into `fs`, `proc`, `thread`, `term`, `clock`, `memory`, `service`, and `net`.

This is why the Pebble kernel layer now exists. Modules like `system/kernel/syscall.peb`, `proc.peb`, `thread.peb`, and `term.peb` are not just abstractions for neatness; they are the mechanism that keeps shell and runtime code from depending directly on raw host function names. The current mapping is still transitional, and the kernel modules still delegate back into Python-hosted primitives, but the boundary is now named, documented, and increasingly enforced. That matters a lot. Once the boundary exists, the project can evolve toward a Pebble-defined OS without constantly leaking shell policy back into Python.

## 7. Processes, Threads, and TTY Are Where the System Gets Real

PebbleOS does not yet have a full Linux-like process table. Right now it still operates through two host-backed execution forms: VM-backed bytecode tasks and host-managed background worker jobs. But it already has a Pebble-visible transition layer for process semantics. The process context shape includes fields such as `pid`, `ppid`, `pgid`, `sid`, `cwd`, `argv`, `env`, `uid`, `gid`, `umask`, and `path`, and the current process states include `ready`, `running`, `foreground`, `done`, `halted`, and `error`. That is not a finished process model yet, but it is already more than ad hoc background jobs.

Threading is similarly in a bootstrap-but-real phase. The current thread ABI exposes `thread_spawn_source`, `thread_spawn(func, args)`, `thread_join`, `thread_status`, `thread_self`, `thread_yield`, and `thread_list`, plus mutex operations such as `mutex_create`, `mutex_lock`, `mutex_try_lock`, and `mutex_unlock`. Internally this is still built on the existing VM task scheduler rather than a final POSIX-style thread model, but it already has explicit thread states like `blocked-input`, `blocked-tty`, and `blocked-mutex`. This is one of the places where Pebble’s first-class function values stopped being a language nicety and became a systems feature.

TTY and input handling are where the runtime complexity really becomes visible. PebbleOS now distinguishes line input from key input, uses cooked mode for `input()`-style prompts and raw mode for `read_key()` / `read_key_timeout()`-style interaction, and surfaces those waits as scheduler-visible blocking states rather than hiding them inside host-only special cases. The system also maintains a per-task key queue so full-screen interactive apps such as `nano` do not lose fast input during redraw. Add to that the `/dev` bootstrap layer exposing `/dev/tty`, `/dev/stdin`, `/dev/stdout`, `/dev/stderr`, and `/dev/null`, and you get something that is still incomplete but unmistakably operating-system-shaped.

## 8. Pebble Now Owns More of Its Runtime Model

The memory model is another place where the project got more technical in a quiet but important way. Pebble now exposes a Pebble-managed `memory` module representing flat logical RAM cells, and a Pebble-managed `heap` module representing a simple arena allocator layered on top of that memory. This is not hardware memory and it is not a page system, but it creates a language-visible runtime memory model that Pebble code can manipulate directly. That is a real architectural step, because it separates the semantics of runtime memory from Python’s host process memory.

The bytecode VM has also been pushed in a more explicit direction. In `exec` mode, the VM now carries an explicit `value_stack`, a `frame_stack`, and frame records rather than leaning entirely on incidental Python temporaries. Python still owns the concrete implementation, but Pebble is slowly gaining semantic independence over the runtime structures that matter. That is the deeper pattern of the whole project: not physical independence yet, but semantic independence first.

## 9. What Codex Was Actually Useful For

Most of this was built in a loop with Codex, but the useful interaction was not “write feature X” in isolation. The more valuable pattern was: inspect the current repository, read the architecture docs, understand which layer a change belongs to, then push one subsystem forward without losing the internal story of the project. Sometimes that meant adding or refactoring commands. More often it meant tightening the boundary between Python and Pebble, restating the launcher model, clarifying process or TTY semantics, or turning an implicit rule into an explicit one.

That is also why I increasingly think of AI agents as **force multipliers for individual builders**. If you already have a technical direction in your head, and you can tell when an implementation is right or wrong, an agent like Codex dramatically compresses the distance between idea and working system. The real superpower is not that it replaces judgment; it is that it lets intent propagate into code, refactors, documentation, and iteration loops much faster than one person could usually sustain alone. In that sense, it can feel a little like saying what you want and watching the system begin to exist.

So “vibe coding” is funny, but slightly misleading. The project moved fast, yes, and a lot of it was built in one concentrated weekend day. But what happened here was not random prompting followed by a pile of disconnected features. What happened was that a project that might once have taken months of stop-and-go solo time could be compressed into a single intense day, because the bottleneck shifted. The hard part was no longer typing every line myself; the hard part was having a coherent idea, choosing the right abstractions, and steering the system as it took shape. The result is not just “more code, faster,” but a repository that ended up with a recognizable architecture: a Python bootloader substrate, a Pebble-defined runtime and shell, a filesystem model with multiple semantics, a growing ABI, and the beginnings of a process/thread/TTY story that can actually be extended rather than rewritten from scratch.

## 10. Current State

PebbleOS is still a transition-stage system. It does not yet have full process isolation, a complete Linux-style process table, mature permission and user models, networking, packaging, or a real service layer. But it is also no longer a toy shell around a guest language. It has a rooted filesystem, a Pebble-defined shell, a bytecode VM, a Pebble-visible ABI, a bootstrap thread model, a TTY/input model, device-style paths under `/dev`, and a memory/heap layer that increasingly belongs to the language rather than the host.

That is why I think the most accurate description is not “I made a toy OS,” but something more specific: **PebbleOS is a scripting-first operating-system experiment in which the language is gradually taking ownership of the system above a shrinking Python substrate.** That is a much more technical claim than the title suggests, but it is the one I actually care about.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航中的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

可以说，我用一个周末的一天时间， **vibe code 出了一个“操作系统”**。当然，这里说的不是跑在真实硬件上的内核，而是一个以脚本为中心的系统原型：Python 负责 bootloader 和宿主桥接，Pebble 负责越来越多用户可见的系统行为。这里没有传统意义上的原生二进制程序；程序要么是 Pebble 源码，要么是由源码编译出来的 bytecode，整个系统的组织方式也是围绕这一点展开的。

项目在这里：[https://github.com/DavidLXu/PebbleOS](https://github.com/DavidLXu/PebbleOS)。还有个挺有意思的细节，连 *PebbleOS* 这个名字都是 Codex 帮我起的。现在回头看，这件事反而很贴切，因为这个项目本身也是在和 Codex 的反复协作里慢慢长出来的。它的作用并不只是“补几段代码”，而是不断帮我重读仓库、重构子系统、理顺边界，让这个长得很快的系统不至于在过程中散掉。

## 1. 真正的转折点其实是架构

PebbleOS 一开始并不是一个认认真真奔着“做操作系统”去的项目。最初的想法很简单：存一些文件，改一改，然后从这些文件里运行一门小语言。那个阶段里，它本质上还是一个套着 shell 外壳的小解释器。文件系统很简单，语言也很小，整个项目更像是在做探索，而不是在做架构。那时我在意的主要是“怎么让它更能用一点”，而不是“系统边界应该画在哪里”。

真正让它开始转向的，并不是某个单独的功能，而是 Pebble 慢慢有了描述“系统自身行为”的能力。到了那一步，Pebble 不再只是跑在系统里的语言，而开始变成定义系统的语言。这个变化的意义很大，因为从那时起，项目真正有了一个新的核心问题：接下来要做的，不再只是继续给语言加几个特性，而是去判断哪些系统行为应该上移到 Pebble 这一层，让 Python 退回到底层 substrate，而不是继续把越来越多的系统策略都堆在宿主层里。

## 2. 它现在是怎么启动起来的

现在这套系统的启动过程，其实已经比一个普通的 REPL 启动器更接近“操作系统 bootstrapping”。当我执行 `python3 main.py` 时，Python 实际上扮演的是隐藏 bootloader 的角色：先决定当前使用哪种文件系统模式，把宿主上的 runtime 目录挂载到 `system/...`，加载 `system/runtime.peb`，再把 `system/shell.peb` 的源码作为数据注入进去，调用 `boot()`，最后才真正进入交互式 shell。这件事的意义在于，用户看到的 shell 行为，已经不再主要由 Python 里的控制流来定义了。

现在 prompt、help、launcher 规则以及 built-in command 的行为，已经更多地落在 Pebble 一侧。`system/runtime.peb` 提供共享 runtime，`system/shell.peb` 定义交互 shell，甚至默认编辑器体验也已经通过 `system/nano.peb` 这样的 Pebble 程序来实现。所以我现在会觉得，这个项目已经有了很明显的 bootstrap 意味。它当然还远没有到 self-hosting compiler toolchain 的程度，但后续的 Pebble 程序，确实已经运行在前面的 Pebble 系统代码帮它搭出来的环境里了。

## 3. Pebble 已经不只是脚本语法，而是系统语言

从语言本身看，Pebble 当然还算一门小语言，但它已经很明显是在往系统语言的方向长。它现在支持类 Python 的缩进、循环、函数、列表、字典、模块、`try/except`、`raise`，以及一等函数值；内建模块有 `math`、`text`、`os`、`random`、`memory`、`heap`，同时还支持直接从当前文件系统里导入 Pebble 文件模块。这一点很关键，因为它说明 Pebble 早就不只是“写几个 demo 脚本”的语言了，而是已经具备了表达 runtime helper、command behavior 和系统控制流的基本能力。

它的执行模型也是明确分层的。`run FILE [ARGS...]` 走解释执行，`exec FILE [ARGS...]` 先把源码编译成 bytecode，再交给 bytecode VM 运行。两者现在都还保留着，但越来越像 bootstrap 阶段留下来的兼容入口，而不是最终的用户模型。当前更偏好的交互方式其实是 `COMMAND [ARGS...]` 这种直接启动，由 shell 决定如何解析和执行程序。这里最能看出 PebbleOS 的 **scripting-first** 特征：它没有传统意义上的原生二进制程序格式，只有源码和 bytecode；整个系统是围绕“可解释的程序对象”搭起来的，而不是围绕编译好的可执行文件搭起来的。

## 4. 文件系统是第一个真正像 OS 的边界

PebbleOS 真正第一次摆脱 demo 感，我觉得就是在文件系统这一层。它现在已经不是一个扁平文件列表了，而是一个带根目录的文件系统：有当前工作目录，有绝对路径和相对路径，有 `.` 和 `..` 规范化，有挂载在 `system/...` 下的 runtime 子树，还有一个可见的 `/dev` bootstrap 视图。这些用户可见的行为，其公共 API 现在主要落在 Pebble 侧的 `system/runtime.peb` 里，而 Python 留在下面提供原始的宿主文件系统桥接。这个分层很重要，因为它意味着 Python 负责提供 primitive，Pebble 负责把这些 primitive 组织成用户真正看到的文件系统语义。

文件系统模式的设计本身也比表面看起来更完整。`hostfs` 提供直接的宿主映射，调试方便，而且速度最快；`mfs` 和 `mfs-import` 把用户文件放进 Pebble 管理的内存文件系统里，用显式 `sync` 代替隐式持久化；`vfs-import` 和 `vfs-persistent` 则更进一步，让 Pebble VFS 成为一次会话或长期持久化的事实来源。在 Pebble 管理的模式下，甚至还有一层 shadow-file bridge：像 `run`、`nano` 这种还依赖已有 host path 的路径，会先把 VFS 文件复制成临时宿主文件，执行完以后再拷回去。这是一个非常典型、也非常务实的过渡设计，正好说明了这个项目的整体思路：让 substrate 尽量保持小而稳定，把可见语义持续往 Pebble 里迁。

## 5. Shell、launcher 和 login 已经不是“顺手写的”

这个项目之所以开始像一个技术系统，而不只是一个“能跑命令的 toy shell”，很大一个原因是 launcher 规则和 session 语义已经被明确建模了。命令查找顺序是写清楚的：先 shell builtins，再查 `/system/bin` 和 `/system/sbin` 下的 `PATH`，然后做 `/bin/...` 的兼容映射，最后才是当前目录下的 Pebble 程序，而且可以省略 `.peb` 后缀。当前更偏好的用户模型是 `COMMAND [ARGS...]` 或 `COMMAND &`，而 `run`、`exec`、`runbg`、`execbg` 更像是 bootstrap 阶段保留下来的兼容入口，用来显式暴露 interpreter 和 bytecode VM 的差别。

login 和环境状态这一层其实也已经有了明确语义，而不是“实现碰巧如此”。shell 启动时会确保 `/etc/profile`、`/etc/passwd`、`/etc/group`、`/etc/fstab` 这些 bootstrap 文件存在，然后把 `/etc/profile` 加载进当前 session。环境变量是可变的，有 `set`、`export`、`env`、`source`，也支持类似 `FOO=bar env` 这样的单命令前缀赋值。`source FILE` 和 `sh FILE` 目前还共享同一个 session，而不是真正的 subshell，这本身就是一种非常典型的 bootstrap compromise。但恰恰是这种地方，最能说明它已经进入了“系统语义需要被说清楚”的阶段，而不再只是“能跑起来就行”。

## 6. ABI-first：把系统策略从 Python 往外推

我觉得这个仓库里技术上最关键的一层，可能其实是 ABI 文档，因为它明确写下了整套架构最重要的一条规则：新系统能力应该先定义 Pebble-visible ABI，再决定底下需要哪些 host primitive 来托底，而不是继续给 Python 加新的 shell helper。这几乎就是整个项目的方向盘。现在宿主函数已经开始按 syscall family 归类，例如 `fs`、`proc`、`term`、`clock`、`error`；而目标 Pebble 侧 ABI 则进一步扩展成 `fs`、`proc`、`thread`、`term`、`clock`、`memory`、`service`、`net`。

这也是为什么 Pebble kernel layer 已经开始出现。像 `system/kernel/syscall.peb`、`proc.peb`、`thread.peb`、`term.peb` 这些文件，并不只是“为了结构更好看”的抽象层，而是真正用来阻止 shell 和 runtime 继续直接依赖宿主原语名字的机制。当前映射当然还带有很强的过渡性质，这些 kernel modules 仍然会回落到 Python 的 host primitive 上，但关键在于：边界已经被命名出来、写进文档，而且越来越像一个必须遵守的设计前提。只要这条边界守住，PebbleOS 就有机会继续往 Pebble-defined OS 的方向长，而不是永远停留在“Python shell + 一些 Pebble 脚本”的状态。

## 7. 进程、线程和 TTY 才是系统真正变复杂的地方

PebbleOS 现在当然还没有完整的 Linux 风格 process table。当前它实际上还是依赖两类宿主侧执行形式：VM-backed bytecode task，以及 host-managed background worker job。但它已经有了 Pebble 可见的 process transition layer。进程上下文已经有 `pid`、`ppid`、`pgid`、`sid`、`cwd`、`argv`、`env`、`uid`、`gid`、`umask`、`path` 这些字段，进程状态也已经有 `ready`、`running`、`foreground`、`done`、`halted`、`error`。这当然还不是完整的进程模型，但已经远远超出“随手拼几个后台任务”的阶段了。

线程这一层也处在一种“还在 bootstrap，但已经是真东西”的状态。当前 thread ABI 已经暴露出 `thread_spawn_source`、`thread_spawn(func, args)`、`thread_join`、`thread_status`、`thread_self`、`thread_yield`、`thread_list`，还有 `mutex_create`、`mutex_lock`、`mutex_try_lock`、`mutex_unlock` 这一套 mutex 操作。内部实现上，它还是搭在现有 VM task scheduler 之上，而不是最终的 POSIX-style thread model，但 thread state 已经明确到了 `blocked-input`、`blocked-tty`、`blocked-mutex` 这种粒度。也正是在这一层，Pebble 里的一等函数值第一次不再只是语法意义上的“语言特性”，而开始变成真正的系统能力。

TTY 和输入模型则是整套运行时最容易暴露复杂度的地方。PebbleOS 现在明确区分 line input 和 key input，前者走 cooked mode，后者走 raw mode，而且这些等待状态都会作为 scheduler-visible blocking state 暴露出来，而不是悄悄藏在 host-only special case 里。系统还维护了 per-task key queue，避免 `nano` 这种全屏交互程序在高频输入和重绘之间丢键。再加上 `/dev` bootstrap 层已经暴露出 `/dev/tty`、`/dev/stdin`、`/dev/stdout`、`/dev/stderr`、`/dev/null` 这些 device-style path，虽然离完整的 devfs 和 TTY permission model 还差得很远，但它已经非常明显是一套“长成操作系统形状”的 runtime 了。

## 8. Pebble 开始拥有自己的运行时模型

内存模型这一层，其实也是这个项目技术上很关键、但不太显眼的一步。Pebble 现在已经有 Pebble-managed 的 `memory` 模块，用来表示扁平的逻辑 RAM cells；还有 Pebble-managed 的 `heap` 模块，用简单的 arena allocator 叠在 `memory` 之上。它当然不是硬件 RAM，也不是 page system，但它确实给 Pebble 代码提供了一套语言可见的 runtime memory model，而不是把一切都默默藏在 Python 进程内存里。这一步的意义很大，因为它把“运行时内存的语义”从宿主实现细节里抽了出来，开始变成 Pebble 自己可以理解和操控的对象。

bytecode VM 的方向也是类似的。现在 `exec` 模式已经不再完全依赖零散的 Python 临时变量，而是有更明确的 `value_stack`、`frame_stack` 和 frame record。Python 当然还在拥有这些机制的具体实现，但 Pebble 正在逐步获得对关键 runtime structure 的语义控制权。说到底，这也是整个项目里最深的一条线：暂时还不是物理层面的 independence，但已经在先拿语义层面的 independence。

## 9. Codex 真正有用的地方

这个项目大部分都是在和 Codex 的反复协作中完成的，但真正有价值的互动并不是“写一个功能”。更有价值的模式其实是：先读当前仓库，再读相关设计文档，搞清楚这次改动应该落在哪一层，然后推进一个子系统，同时不把整个项目的内部叙事搞乱。
我现在越来越倾向于把 AI Agent 理解成一种 **个人能力的放大器**。只要脑子里已经有方向，知道什么是对的、什么是错的，像 Codex 这样的工具就能极大压缩“从想法到实现”的距离。它真正厉害的地方，不是神奇地替你做判断，而是让你的意图可以更快地传递到代码、重构、文档和迭代里。某种意义上，会有一种很强的“言出法随”感：想到一个系统结构，就可以很快把它落成一个能跑、能改、能继续长的东西。

所以说 “vibe coding” 虽然好玩，但多少也会有点误导。这里发生的并不是随便 prompt 几句，然后凭空长出一堆互不相干的 feature；真正发生的是，原本一个人可能要断断续续做几个月的 side project，现在可以在一个高度集中的周末里被压缩到一天，因为瓶颈变了。难点不再只是“把每一行代码亲手敲出来”，而是你有没有一个成形的想法、能不能选对抽象、能不能在系统成形的过程中稳稳地把方向抓住。

## 10. 当前状态

PebbleOS 现在仍然处在一个过渡阶段。它还没有完整的 process isolation，没有真正完整的 Linux-style process table，没有成熟的权限和用户模型，没有网络、包管理，也没有完整的 service layer。但它也已经绝对不再是“套了一层 shell 的玩具语言”了。它现在有 rooted filesystem，有 Pebble-defined shell，有 bytecode VM，有 Pebble-visible ABI，有 bootstrap thread model，有 TTY / input model，有 `/dev` 设备路径，还有一层越来越归 Pebble 所有的 memory / heap 运行时。

所以我现在更愿意给它的定义，不是“我做了一个 toy OS”，而是更具体一点：**PebbleOS 是一个以脚本为中心的操作系统实验，核心方向是让语言逐步接管一个不断收缩的 Python substrate 之上的系统层。** 这个说法比标题听起来技术得多，但它才是我真正关心的东西。

</div>
