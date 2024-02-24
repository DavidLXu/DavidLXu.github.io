---
title: '[Paper Notes] SAM-RL: Sensing-Aware Model-Based Reinforcement Learning via Differentiable Physics-Based Simulation and Rendering - RSS 2023'
date: 2024-02-20
permalink: /posts/2024/02/blog-post-2/
tags:
  - Robotics
  - Reinforcement Learning
  - RSS
---

Key information
===
- Model-based reinforcement learning (MBRL) is potentially more sample-efficient than model-free RL.
- Integration of differentiable physics-based simulation and rendering facilitates the learning process.
- Pipeline: Real2Sim -> Learn@Sim -> Sim2Real to produce efficient policies.

Differentiable Simulation and Rendering
===


Real2Sim
===

Learn@Sim
===

Sim2Real
===

Experiments
===
- Set up: Franka Panda performing the manipulation task, and Flexiv Rizon with the RGB-D RealSense camera for active sensing. PyBullet for real-world simulation, NimblePhysics and Redner as differentiable simulation and renderer.
- Tasks: Peg-Insertion, Spatula-Flipping, and Needle-Threading.
- Network details: CNN feature extractor and MLP heads to output the action/Q value. Residual policy network to reduce the sim-to-real gap.

My takeaways
===
The paper gives a method in which 

------

