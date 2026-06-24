---
title: "How RGB Tactile Sensors Turn Color Into Depth"
date: 2026-06-25
permalink: /posts/2026/06/rgb-tactile-depth/
tags:
  - Tactile Sensing
  - Photometric Stereo
  - Robotics
  - Computer Vision
  - Depth Reconstruction
---

<div data-lang="en" markdown="1">

This post supports **English / 中文** switching via the site language toggle in the top navigation.

## TL;DR

An RGB visual-tactile sensor does not read depth directly from color. The usual pipeline is:

```text
RGB image -> surface normal -> depth gradient -> depth map
```

Red, green, and blue illumination are arranged so that each color channel carries information from a different lighting direction. Under a photometric-stereo model, the three channel intensities at a pixel constrain the local surface normal. Differential geometry then converts this normal into local slopes. Finally, Poisson reconstruction or a least-squares integration method turns the slope field into a globally consistent depth map.

In real sensors, the ideal equations are only the clean skeleton. Calibration carries much of the practical burden: it learns how RGB values map to normals or gradients after accounting for LED placement, elastomer scattering, camera response, color crosstalk, and non-uniform illumination.

## From Color to Shape

A typical vision-based tactile sensor has a deformable elastomer surface, internal colored illumination, and a camera looking at the surface from inside the sensor. When an object presses on the elastomer, the surface bends. The camera observes the resulting color and shading pattern. The core idea is that local surface orientation changes how strongly each colored light contributes to the observed pixel.

In a simplified RGB photometric-stereo setup, red, green, and blue lights come from known directions:

```text
l_R = (l_Rx, l_Ry, l_Rz)
l_G = (l_Gx, l_Gy, l_Gz)
l_B = (l_Bx, l_By, l_Bz)
```

Each \\(l\\) is a 3D direction vector, so the three lighting directions together contain nine scalar values. For one pixel, the camera measures:

```text
I_R, I_G, I_B
```

Under the simplest reflectance model, these intensities satisfy:

\\[
\begin{bmatrix}
I_R \\\\
I_G \\\\
I_B
\end{bmatrix}
=
\begin{bmatrix}
l_{Rx} & l_{Ry} & l_{Rz} \\\\
l_{Gx} & l_{Gy} & l_{Gz} \\\\
l_{Bx} & l_{By} & l_{Bz}
\end{bmatrix}
\rho
\begin{bmatrix}
n_x \\\\
n_y \\\\
n_z
\end{bmatrix}.
\\]

Here \\(n=(n_x,n_y,n_z)\\) is the unit surface normal, and \\(\rho\\) is an effective reflectance or gain. Solving this small linear system gives \\(g=\rho n\\). Normalizing \\(g\\) gives the normal direction:

\\[
n = \frac{g}{\|g\|}, \qquad \rho = \|g\|.
\\]

This is the photometric-stereo part: different lights produce different brightnesses, and the brightness triplet lets us infer which way the local surface is facing.

## Are the Lighting Directions Constant?

In the ideal textbook model, \\(l_R\\), \\(l_G\\), and \\(l_B\\) are constant over the whole image. Red might illuminate from the left, green from the upper right, and blue from below. That approximation is useful because it turns each pixel into the same three-equation linear problem.

Physical tactile sensors are messier. The LEDs are close to the elastomer, so the light direction can vary with image position. The elastomer and coating scatter light. Camera vignetting changes brightness across the image. Color channels leak into each other. The surface may show specular highlights or saturation near contact edges. Because of these effects, the practical "lighting direction" is often better treated as an effective calibrated response, not as a perfectly known global vector.

This leads to two common implementations. A simple system estimates fixed lighting directions and uses the linear model directly. A stronger system builds a calibrated mapping:

```text
(R, G, B, x, y) -> normal or gradient
```

or, if position dependence is weak:

```text
(R, G, B) -> normal or gradient
```

The second form absorbs the messy optics into an empirical lookup table, interpolation model, polynomial fit, or neural network.

## Lambertian Reflection

The clean equation above comes from Lambertian reflection. A Lambertian surface is an ideal matte surface whose brightness depends on the angle between the surface normal and the light direction. If both vectors are unit length:

\\[
I = \rho (n \cdot l) = \rho \cos \theta .
\\]

When the light points directly at the surface, \\(\theta\\) is small and the pixel is bright. When the light arrives at a shallow angle, the pixel is darker. The dot product turns geometry into intensity.

For visual-tactile sensing, Lambertian reflection is a useful approximation, not a full physical description. Elastomers involve scattering, coatings, camera nonlinearities, and local contact artifacts. That is why calibration is not a minor cleanup step; it is part of the measurement model.

## From Normal to Depth Gradient

Once the normal is known, the next question is how it relates to depth. Let the deformed tactile surface be a height field:

\\[
z = z(x,y).
\\]

The corresponding 3D surface can be parameterized as:

\\[
S(x,y) = (x, y, z(x,y)).
\\]

Its tangent vector in the \\(x\\) direction is:

\\[
S_x = \left(1, 0, \frac{\partial z}{\partial x}\right),
\\]

and its tangent vector in the \\(y\\) direction is:

\\[
S_y = \left(0, 1, \frac{\partial z}{\partial y}\right).
\\]

The normal is perpendicular to both tangents, so it is given by their cross product:

\\[
S_x \times S_y =
\left(
-\frac{\partial z}{\partial x},
-\frac{\partial z}{\partial y},
1
\right).
\\]

After normalization:

\\[
n =
\frac{
\left(
-\frac{\partial z}{\partial x},
-\frac{\partial z}{\partial y},
1
\right)
}{
\sqrt{
\left(\frac{\partial z}{\partial x}\right)^2
+
\left(\frac{\partial z}{\partial y}\right)^2
+
1
}
}.
\\]

This is the differential-geometry step. It says that the local surface orientation and the depth gradient determine each other. If \\(n=(n_x,n_y,n_z)\\), then:

\\[
\frac{\partial z}{\partial x} = -\frac{n_x}{n_z},
\qquad
\frac{\partial z}{\partial y} = -\frac{n_y}{n_z}.
\\]

So the RGB image gives normals, and normals give local slopes.

## From Gradient to Depth

At this point we have a gradient field:

\\[
p(x,y) = \frac{\partial z}{\partial x},
\qquad
q(x,y) = \frac{\partial z}{\partial y}.
\\]

The sensor still needs the depth field \\(z(x,y)\\). In one dimension, recovering height from slope is just integration. In two dimensions, direct path integration is fragile: going right then down should give the same result as going down then right, but noisy gradients rarely agree perfectly.

If \\(p\\) and \\(q\\) truly come from a smooth depth function, they satisfy the integrability condition:

\\[
\frac{\partial p}{\partial y}
=
\frac{\partial q}{\partial x}.
\\]

Real measurements violate this condition because normals are noisy and the optical model is imperfect. The usual solution is to find the depth map whose gradients best match the estimated field:

\\[
\min_z
\iint
\left[
\left(\frac{\partial z}{\partial x} - p\right)^2
+
\left(\frac{\partial z}{\partial y} - q\right)^2
\right]
dxdy.
\\]

The Euler-Lagrange equation of this least-squares problem is the Poisson equation:

\\[
\nabla^2 z
=
\frac{\partial p}{\partial x}
+
\frac{\partial q}{\partial y}
=
\operatorname{div}(p,q).
\\]

In a pixel grid, this becomes a large sparse linear system. A common discrete form is:

\\[
z_{i+1,j}+z_{i-1,j}+z_{i,j+1}+z_{i,j-1}-4z_{i,j}
=
p_{i,j}-p_{i-1,j}+q_{i,j}-q_{i,j-1}.
\\]

Solving this system produces a depth map that is globally consistent with the local slopes. Since gradients are unchanged by adding a constant, the reconstructed depth has an arbitrary offset. A sensor usually fixes this using a reference plane, an untouched boundary, a zero-mean constraint, or a known non-contact region.

## Why Least Squares Matters

Least squares is not just mathematical convenience. It is the mechanism that lets the system survive imperfect RGB measurements. Some pixels may be dark, saturated, shadowed, specular, or close to a contact discontinuity. Their estimated normals are less trustworthy. A global least-squares reconstruction lets the entire image negotiate these local errors.

Many implementations further use weighted least squares:

\\[
\min_z
\sum_{i,j}
w^x_{i,j}
\left(z_{i+1,j}-z_{i,j}-p_{i,j}\right)^2
+
w^y_{i,j}
\left(z_{i,j+1}-z_{i,j}-q_{i,j}\right)^2.
\\]

Reliable pixels receive larger weights; saturated or ambiguous pixels receive smaller weights. This turns depth recovery from a brittle integration problem into a global estimation problem.

## What Calibration Actually Calibrates

The main calibration target is the mapping from observed color to local surface shape:

```text
RGB -> normal
```

or directly:

```text
RGB -> gradient
```

A common calibration procedure presses the sensor with an object of known geometry, such as a sphere. The sphere provides ground-truth normals because its surface geometry is known. For many pixels, calibration records pairs like:

```text
observed RGB <-> known normal
```

From these samples, the system learns a lookup table or regression model. Calibration also usually includes a background image for the undeformed surface:

```text
I_0(x,y)
```

The runtime image is normalized by subtracting or dividing by this background, reducing static non-uniformity from illumination, coating thickness, and camera vignetting.

A complete calibration may also estimate pixel-to-millimeter scale, lens distortion, color-channel crosstalk, depth scale, and the zero-depth reference. But the central bridge remains:

```text
color response -> normal or gradient -> depth
```

## Takeaway

The compact way to remember RGB tactile depth reconstruction is:

```text
Photometric stereo estimates normals.
Differential geometry converts normals to gradients.
Poisson or least-squares integration reconstructs depth.
Calibration makes the ideal model usable on real hardware.
```

The RGB channels are therefore not three direct depth readings. They are three lighting-conditioned observations of the same deformed surface. The depth map emerges only after geometry, optimization, and calibration are put together.

</div>

<div data-lang="zh" markdown="1" style="display: none;">

本文支持通过顶部导航栏的语言切换按钮在 **English / 中文** 之间切换。

## TL;DR

RGB 视触觉传感器通常不会直接从颜色读取深度。更准确的流程是：

```text
RGB 图像 -> 表面法向量 -> 深度梯度 -> 深度图
```

红、绿、蓝三种光从不同方向照射弹性体表面。每个像素的三个颜色通道强度约束了这个位置的局部表面朝向，也就是法向量。随后用微分几何关系把法向量转成局部斜率，再用泊松重建或最小二乘积分把整张斜率场恢复成深度图。

真实传感器里，理想公式只是骨架。标定承担了很多工程工作：它把 LED 位置、弹性体散射、相机响应、颜色串扰、光照不均匀、材料非理想反射等因素压进一个可用的映射里。

## 从颜色到形状

典型的视觉触觉传感器由可变形弹性体、内部彩色光源和内部相机组成。物体按压弹性体后，表面发生形变；相机看到随形变变化的颜色和明暗图案。核心思想是：局部表面朝向会改变不同颜色光源在该像素上的贡献强度。

在简化的 RGB 光度立体模型中，红、绿、蓝光分别来自已知方向：

```text
l_R = (l_Rx, l_Ry, l_Rz)
l_G = (l_Gx, l_Gy, l_Gz)
l_B = (l_Bx, l_By, l_Bz)
```

每个 \\(l\\) 都是三维方向向量，所以三个光照方向合起来是九个标量。对某个像素，相机观测到：

```text
I_R, I_G, I_B
```

在最简反射模型下，强度满足：

\\[
\begin{bmatrix}
I_R \\\\
I_G \\\\
I_B
\end{bmatrix}
=
\begin{bmatrix}
l_{Rx} & l_{Ry} & l_{Rz} \\\\
l_{Gx} & l_{Gy} & l_{Gz} \\\\
l_{Bx} & l_{By} & l_{Bz}
\end{bmatrix}
\rho
\begin{bmatrix}
n_x \\\\
n_y \\\\
n_z
\end{bmatrix}.
\\]

这里 \\(n=(n_x,n_y,n_z)\\) 是单位表面法向量，\\(\rho\\) 是等效反射率或增益。求解这个小线性系统可以得到 \\(g=\rho n\\)，再归一化得到法向量：

\\[
n = \frac{g}{\|g\|}, \qquad \rho = \|g\|.
\\]

这就是光度立体的部分：不同方向的光带来不同亮度，三个亮度值共同反推出局部表面朝向。

## 光源方向是恒定的吗

在理想模型里，\\(l_R\\)、\\(l_G\\)、\\(l_B\\) 被看成整张图上恒定的方向。比如红光从左侧照射，绿光从右上照射，蓝光从下方照射。这个近似很有用，因为每个像素都可以使用同一组三元线性方程。

实际视触觉传感器复杂得多。LED 离弹性体很近，不同像素处的入射方向会变化；弹性体和涂层会散射光；相机暗角会让图像中心和边缘响应不同；颜色通道之间会串扰；接触边缘附近还可能出现高光或饱和。因此，工程上常把“光源方向”理解成一个等效的、经过标定的响应，而不是严格已知的全局向量。

这对应两类做法。简单系统估计固定光照方向，然后直接用线性模型。更稳健的系统会标定一个映射：

```text
(R, G, B, x, y) -> 法向量或梯度
```

如果位置依赖不强，也可以写成：

```text
(R, G, B) -> 法向量或梯度
```

这种形式把复杂光学响应吸收到查找表、插值模型、多项式拟合或神经网络里。

## 朗伯反射

上面的简洁方程来自朗伯反射模型。朗伯表面是一种理想哑光表面，它的亮度主要取决于表面法向量和光照方向之间的夹角。如果两个向量都是单位向量：

\\[
I = \rho (n \cdot l) = \rho \cos \theta .
\\]

当光线接近正对表面时，\\(\theta\\) 较小，像素更亮；当光线斜着照射时，像素更暗。点积把几何角度转换成图像亮度。

对视触觉传感器而言，朗伯反射是有用的近似。弹性体会散射光，涂层和相机有非线性响应，接触区域还会出现局部伪影。所以标定不是简单的后处理，它本身就是测量模型的一部分。

## 从法向量到深度梯度

得到法向量之后，下一步要问的是它和深度有什么关系。把变形后的触觉表面写成高度场：

\\[
z = z(x,y).
\\]

对应的三维曲面可以参数化为：

\\[
S(x,y) = (x, y, z(x,y)).
\\]

它在 \\(x\\) 方向上的切向量是：

\\[
S_x = \left(1, 0, \frac{\partial z}{\partial x}\right),
\\]

在 \\(y\\) 方向上的切向量是：

\\[
S_y = \left(0, 1, \frac{\partial z}{\partial y}\right).
\\]

法向量同时垂直于这两个切向量，所以可以由叉乘得到：

\\[
S_x \times S_y =
\left(
-\frac{\partial z}{\partial x},
-\frac{\partial z}{\partial y},
1
\right).
\\]

归一化之后：

\\[
n =
\frac{
\left(
-\frac{\partial z}{\partial x},
-\frac{\partial z}{\partial y},
1
\right)
}{
\sqrt{
\left(\frac{\partial z}{\partial x}\right)^2
+
\left(\frac{\partial z}{\partial y}\right)^2
+
1
}
}.
\\]

这一步就是微分几何中的曲面法向量关系。它说明局部表面朝向和深度梯度可以互相确定。如果 \\(n=(n_x,n_y,n_z)\\)，那么：

\\[
\frac{\partial z}{\partial x} = -\frac{n_x}{n_z},
\qquad
\frac{\partial z}{\partial y} = -\frac{n_y}{n_z}.
\\]

于是 RGB 图像给出法向量，法向量再给出局部坡度。

## 从梯度到深度

此时我们有一张梯度场：

\\[
p(x,y) = \frac{\partial z}{\partial x},
\qquad
q(x,y) = \frac{\partial z}{\partial y}.
\\]

传感器最终需要的是深度场 \\(z(x,y)\\)。一维情况下，从斜率恢复高度就是积分。二维情况下，直接沿路径积分很容易出问题：先向右再向下，和先向下再向右，理论上应该得到同一个高度；带噪声的梯度场通常做不到这一点。

如果 \\(p\\) 和 \\(q\\) 确实来自一个光滑深度函数，它们应该满足可积性条件：

\\[
\frac{\partial p}{\partial y}
=
\frac{\partial q}{\partial x}.
\\]

真实测量会破坏这个条件，因为法向量估计有噪声，光学模型也不完美。常见做法是寻找一张深度图，使它的梯度整体上最接近估计出来的梯度场：

\\[
\min_z
\iint
\left[
\left(\frac{\partial z}{\partial x} - p\right)^2
+
\left(\frac{\partial z}{\partial y} - q\right)^2
\right]
dxdy.
\\]

这个最小二乘问题对应的欧拉-拉格朗日方程就是泊松方程：

\\[
\nabla^2 z
=
\frac{\partial p}{\partial x}
+
\frac{\partial q}{\partial y}
=
\operatorname{div}(p,q).
\\]

在像素网格上，它会变成一个大型稀疏线性方程组。常见离散形式是：

\\[
z_{i+1,j}+z_{i-1,j}+z_{i,j+1}+z_{i,j-1}-4z_{i,j}
=
p_{i,j}-p_{i-1,j}+q_{i,j}-q_{i,j-1}.
\\]

求解这个系统，就能得到一张和局部坡度尽量一致的全局深度图。由于给 \\(z\\) 加一个常数不会改变梯度，重建深度天然有整体高度偏移。传感器通常用参考平面、未接触边界、零均值约束或已知无接触区域来固定零点。

## 为什么需要最小二乘

最小二乘不是单纯的数学包装，它让系统能够处理不完美的 RGB 测量。有些像素可能过暗、过曝、有阴影、有高光，或者位于接触边缘附近；这些位置估计出来的法向量可信度更低。全局最小二乘重建让整张图一起协调这些局部误差。

很多实现还会使用加权最小二乘：

\\[
\min_z
\sum_{i,j}
w^x_{i,j}
\left(z_{i+1,j}-z_{i,j}-p_{i,j}\right)^2
+
w^y_{i,j}
\left(z_{i,j+1}-z_{i,j}-q_{i,j}\right)^2.
\\]

可靠像素权重大，饱和或歧义像素权重小。这样，深度恢复从脆弱的路径积分变成了全局估计问题。

## 标定主要标定什么

标定最核心的目标是从观测颜色到局部表面形状的映射：

```text
RGB -> 法向量
```

或者直接：

```text
RGB -> 梯度
```

常见做法是用已知几何体按压传感器，例如球。球的几何形状已知，因此接触区域的真实法向量可以计算出来。标定时可以收集大量样本：

```text
观测 RGB <-> 已知法向量
```

然后学习查找表或回归模型。标定通常还会拍摄无接触背景图：

```text
I_0(x,y)
```

运行时对当前图像做减背景或除背景归一化，以削弱静态光照不均、涂层厚度差异和相机暗角。

完整标定还可能包括像素到毫米的尺度、镜头畸变、颜色通道串扰、深度尺度和零深度参考。但最关键的桥梁始终是：

```text
颜色响应 -> 法向量或梯度 -> 深度
```

## Takeaway

可以用一句流程记住 RGB 视触觉深度恢复：

```text
光度立体估计法向量。
微分几何把法向量转换成梯度。
泊松方程或最小二乘积分恢复深度。
标定让理想模型能在真实硬件上工作。
```

RGB 三个通道并不是三次直接深度测量。它们是同一个变形表面在三种光照条件下的观测。真正的深度图是在几何、优化和标定共同作用之后得到的。

</div>
