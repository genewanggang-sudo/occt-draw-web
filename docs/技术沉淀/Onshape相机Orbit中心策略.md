# Onshape 相机 Orbit 中心策略

本文记录 Onshape WebGL bundle 中可观察到的 orbit center 解析思路，用作后续相机控制设计参考。

## 核心原则

旋转开始时解析一次 `rotateOrPanCenter`，本次拖拽过程中固定使用该中心，避免旋转中心在 `pointerMove` 中跳变。

## 解析顺序

1. 鼠标附近命中优先

    做什么：先判断鼠标按下位置附近有没有可见几何。

    技术实现：在鼠标周围小矩形读取 GPU depth，过滤背景，取离鼠标最近的 depth 点，再通过 `canvasToWorld` 转成世界点。

2. 空白处使用窗口模型深度

    做什么：鼠标没有点中几何时，使用当前视口里可见模型的中心作为旋转中心。

    技术实现：对 viewport 做 depth sampling，先 `includePlanes: false`，只采模型深度；样本足够时平均 `[x, y, depth]`，再通过 `canvasToWorld` 转成世界点。

3. 模型样本不足时允许基准面参与

    做什么：如果视口里模型样本太少，再允许基准面帮助稳定旋转中心。

    技术实现：重新 depth sampling，使用 `includePlanes: true`；样本足够时平均 `[x, y, depth]`，再通过 `canvasToWorld` 转成世界点。

4. 深度采样失败时使用 bounds center

    做什么：如果 GPU 深度样本不够，但模型整体范围有效，就围绕模型整体中心旋转。

    技术实现：取当前显示模型的 `bounds.center()`，并检查 bounds 是否适合当前 viewport。

5. 最后使用鼠标射线和 bounds 深度兜底

    做什么：如果前面都失败，仍然构造一个和鼠标位置相关的稳定旋转中心。

    技术实现：从鼠标点发相机射线，把 pivot 放在 `bounds.center` 对应的大致深度上。

    ```text
    pivot = ray.origin + ray.direction * depthToBoundsCenter
    ```

## 设计结论

- 鼠标命中优先。
- 模型深度优先于基准面深度。
- bounds 是兜底，不是首选。
- 不默认使用旧 `orbitPivot`。
- 不默认使用 `camera.target`。
- 不固定围绕 world origin 或 scene center。
