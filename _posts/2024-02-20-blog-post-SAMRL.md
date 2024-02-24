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
This stage focuses on learning sensing-aware action within a simulated environment. According to this paper, the process includes

 - Sensing-aware Q-function: A Q-function is adapted to include the camera pose's impact, optimizing camera adjustments to enhance task-related information capture. This optimization is achieved by calculating gradients that suggest optimal camera positioning for action improvement.
 - Learning Actor in Simulation: An actor is trained through imitation learning within a simulated environment. The actor learns to perform tasks by mimicking successful actions, optimized through loss minimization that balances action efficiency and goal achievement.
 - Learning Sensing-aware Q Function: The sensing-aware Q function is developed using simulated trajectories, focusing on predicting the Q value from image-action pairs. This is approached as a supervised learning problem, emphasizing the role of sensing in action effectiveness.
 - Selecting Perception and Action: The system dynamically adjusts the camera pose to maximize the Q value, ensuring that both perception and action are optimized for task performance. This iterative process seeks the most informative viewpoint for executing the task.

Sim2Real
===
This part starts with the policy learned in simulation, denoted as $\pi_{sim}$, which takes rendered images ($I_{sim}$) as inputs and outputs actions ($a_{sim}$). To bridge the sim-to-real gap, a residual policy $\pi_{res}$ is trained. This policy takes in real-world images ($I_{real}$) and simulated actions ($a_{sim}$), outputting a residual action ($\delta a_{real}$). The actual action applied in the real world ($a_{real}$) is the sum of the simulated action and the residual action.

The residual policy is initially set such that it outputs zero adjustments, ensuring it does not worsen the initial policy. Training involves updating this policy based on real-world executions and feedback. The aim is to adjust actions to account for differences between the simulated and real-world environments. This action is then executed in the real world, with outcomes used to further refine the policy.
 
Experiments
===
- Set up: Franka Panda performing the manipulation task, and Flexiv Rizon with the RGB-D RealSense camera for active sensing. PyBullet for real-world simulation, NimblePhysics and Redner as differentiable simulation and renderer.
- Tasks: Peg-Insertion, Spatula-Flipping, and Needle-Threading.
- Network details: CNN feature extractor and MLP heads to output the action/Q value. Residual policy network to reduce the sim-to-real gap.
- Evaluation: sensing-aware Q function and its qualitative visualization, salient map of actor-network, comparison with TD3, SAC, and Dreamer, ablation, etc.

My takeaways
===
The paper gives a comprehensive approach highlighting an active sensing approach with differentiable physics simulation that closes that gap between simulation and the real world. 

The research outlines a potential pathway for future general-purpose robots, where active sensing enhances real-world perception, enabling robots to make more informed decisions.

------

