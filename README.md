# occt-draw-web

`occt-draw-web` 是三维云端 CAD 的前端工作台仓库。

当前目标是构建一个浏览器侧 CAD 应用基础框架：页面使用 React，构建使用 Vite，三维渲染使用 WebGL，草图、约束、参数、命令和交互逻辑使用 TypeScript，几何内核由 `occt-draw-core` Wasm 提供。

## 技术方向

- 页面框架：React
- 语言：TypeScript
- 构建工具：Vite
- 包管理：pnpm workspace
- 项目级运行时管理：mise
- 渲染引擎：WebGL
- 几何内核：`occt-draw-core` Wasm
- 重计算调度：Web Worker

## 当前定位

本仓库负责：

- 三维云 CAD 工作台 UI
- 三维场景和视图状态
- 草图、约束和参数的 TypeScript 逻辑
- WebGL 渲染层
- Worker 调度
- Wasm 几何内核桥接
- 云端项目、文件、版本和协同接口的前端边界

本仓库不负责：

- OCCT 底层集成
- B-Rep 内核实现
- 布尔、倒角、圆角等底层几何算法实现

这些能力由 `occt-draw-core` 提供，并通过 Wasm 接入。

## 本地开发

当前项目使用 `mise` 固定项目内工具版本：

- Node.js：`24.15.0`
- pnpm：`10.33.2`

进入本仓库后，终端会自动使用项目版本，不影响其它项目的全局 Node 和 pnpm。

常用命令：

```powershell
pnpm install
pnpm dev
pnpm check
```

## 文档

工程文档统一放在 [docs](./docs/索引.md)。

建议先读：

1. [三维云端 CAD 架构设计](./docs/架构设计.md)
2. [基础框架设计](./docs/基础框架.md)
3. [工程规范](./docs/工程规范.md)
4. [运行时与资源约定](./docs/运行时约定.md)
