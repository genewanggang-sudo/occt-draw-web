# occt-draw-web

`occt-draw-web` 是二维出图产品的前端项目。

这个仓库负责浏览器端的编辑器界面、画布渲染、交互逻辑以及对 Wasm 几何内核的调用，是整个产品的用户入口。

## 项目定位

- 基于前端技术构建二维出图界面
- 加载并调用 `occt-draw-core` 产出的 Wasm 能力
- 承担图纸展示、交互编辑、工具栏和属性面板等功能
- 不直接实现底层 OCCT 几何算法

## 计划职责

- 编辑器 UI
- 画布渲染
- 鼠标与键盘交互
- 图元与图纸数据管理
- Worker 通信
- Wasm 加载与结果展示

## 预期技术方向

当前计划优先采用：

- React
- TypeScript
- Vite
- Canvas 2D
- Web Worker

## 预期目录

后续预计会逐步整理为这样的结构：

```txt
src/
public/
workers/
components/
editor/
```

## 当前阶段

当前仓库处于初始化阶段，下一步会优先完成：

- 前端工程脚手架
- 最小页面布局
- 画布基础能力
- Wasm 加载链路验证

## 关联项目

几何与 Wasm 内核仓库：

- `occt-draw-core`

它负责 OCCT 集成、自定义投影算法和 Wasm 编译输出。
