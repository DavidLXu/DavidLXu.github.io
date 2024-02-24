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


Real2Sim with Differentiable Simulation and Rendering
===
The integration of differentiable simulation and rendering forms the core of the model used for model-based reinforcement learning. It allows for the calculation of gradients for the simulation images ($I_{sim}$) with respect to the camera pose ($P_c$) and object attributes. This enables the updating of the model by directly comparing simulated images with real-world images and adjusting the model parameters to reduce discrepancies, thereby improving the accuracy of the simulation model for better policy generation.

The whole process involves building an initial model that does not have to be precise at the first stage and updating the model with differentiable simulation and rendering. During the second half, differentiable simulation and rendering techniques are used to adjust the model parameters, including object mesh vertices, colors, and poses, to minimize the discrepancies between simulated and real images. This process involves:

- Updating camera and robot poses in the simulation to match their real-world counterparts.
- Generating and comparing rendered RGB-D images from the simulation with real RGB-D images, including segmentation.
- Defining loss functions based on the differences in RGB images and 3D point clouds (using Earth Mover Distance for the latter) between the simulation and the real world.
- Using the gradients of these loss functions to iteratively update the model's parameters, thus reducing the discrepancy between the simulation and real-world observations.

Refer to:
[1] X. Zhu, et al, "Diff-LfD: Contact-aware Model-based Learning from Visual Demonstration for Robotic Manipulation via Differentiable Physics-based Simulation and Rendering", CoRL 2023.

[2] Y. Xiang, et al, "Diff-Transfer: Model-based Robotic Manipulation Skill Transfer via Differentiable Physics Simulation" 

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

