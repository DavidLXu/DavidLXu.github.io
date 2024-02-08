---
title: '[CoRL 2022]DayDreamer: World Models for Physical Robot Learning'
date: 2024-02-06
permalink: /posts/2012/08/blog-post-1/
tags:
  - Robotics
  - Reinforcement Learning
  - CoRL
---


**Key information**

- This paper learns two models: a world model trained on o**ff-policy sequences through** supervised learning, and an actor-critic model to learn behaviors from trajectories predicted by the learned model.
- The data collection and learning updates are decoupled, enabling fast training without waiting for the environment. A learner thread continuously trains the world model and actor-critic behavior, while an actor thread in parallel computes actions for environment interaction.

**World model learning**

- The world model can be thought of as a fast simulator of the environment that the robot learns autonomously, despite that the physical robot runs in real environment.
- The world model is based on the Recurrent State-Space Model (RSSM) which consists of encoder, decoder, dynamics and reward networks.
- The encoder network fuses all sensory inputs x_t together into the stochastic representations z_t. The dynamics model learns to predict the sequence of stochastic representations by using its recurrent state h_t. The reward network predicts task rewards by letting the robot interact with the real world. (It appears that the decoder network is not in use in this paper.)
- All components of the world model are jointly optimized by stochastic backpropagation

**Actor-critic learning**

**Experiments**

Experiments are carried out on four different robots with different tasks.

- Unitree A1 Quadruped Walking
- UR5 Multi-Object Visual Pick and Place
- XArm Visual Pick and Place
    - [Rainbow algorithm in comparison](https://arxiv.org/pdf/1710.02298.pdf)
- Sphero Navigation

**My takeaways**

The paper gives a method in which RL can be trained in real environments aside from a simulator. A world model is trained and used for quick updates, and the data collection and learning updates are decoupled. These techniques provide insightful ideas for future reinforcement learning architectural design.

**Reproduction of this paper**

- [Physical robots](https://github.com/danijar/daydreamer) (May require MuJoCo or Isaac to reproduce due to lack of hardware)
- [Games](https://github.com/danijar/dreamerv2) (Easier to reproduce)
This is a sample blog post. Lorem ipsum I can't remember the rest of lorem ipsum and don't have an internet connection right now. Testing testing testing this blog post. Blog posts are cool.

Headings are cool
======

You can have many headings
======

Aren't headings cool?
------

123
