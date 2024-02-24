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
The integration of differentiable simulation and rendering forms the core of the model used for model-based reinforcement learning. It allows for the calculation of gradients for the simulation images ($I_{sim}$) with respect to the camera pose (P_c) and object attributes. This enables the updating of the model by directly comparing simulated images with real-world images and adjusting the model parameters to reduce discrepancies, thereby improving the accuracy of the simulation model for better policy generation. The process involves using differentiable rendering to update the model's parameters through backpropagation of the loss between the simulated images and the real-world images, allowing for iterative refinement of the model to closely match the real world. 

Refer to:
[1] X. Zhu, et al, "Diff-LfD: Contact-aware Model-based Learning from Visual Demonstration for Robotic Manipulation via Differentiable Physics-based Simulation and Rendering", CoRL 2023.
[2] Y. Xiang, et al, "Diff-Transfer: Model-based Robotic Manipulation Skill Transfer via Differentiable Physics Simulation" 

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

