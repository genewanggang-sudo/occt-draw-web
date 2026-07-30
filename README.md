# occt-draw-web

`occt-draw-web` 是三维云端 CAD 的前端工作台仓库。

当前目标是构建一个浏览器侧 CAD 应用基础框架：页面使用 React，构建使用 Vite，三维渲染使用 WebGL，草图、约束、参数、命令和交互逻辑使用 TypeScript，几何内核由 `occt-draw-core` Wasm 提供。

## 技术方向

- 页面框架：React
- 语言：TypeScript
- 构建工具：Vite
- 包管理：pnpm workspace
- 项目级 Node / npm / pnpm 管理：Volta
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

## 包分层与依赖

### `@occt-draw/math`

职责：最底层数学基础库，提供向量、矩阵、坐标、2D/3D 几何、测量、相交、投影等纯计算能力。
依赖：无 workspace 依赖。

### `@occt-draw/core`

职责：CAD 数据模型基础设施层，提供通用 ID、payload store、selection、EditDraft、DocumentOperation、Transaction 等稳定编辑基建；不放具体 CAD/草图/特征业务对象。
依赖：math。

### `@occt-draw/sketch`

职责：草图领域内核，管理草图几何、拓扑、request、transaction、change tracking、display model；不管理 CAD Feature tree。
依赖：core, math。

### `@occt-draw/snapping`

职责：通用吸附服务，提供吸附候选、评分和最佳吸附选择；不依赖草图、CAD 模型、editor、canvas 或 webgl-engine 业务对象。
依赖：core, math。

### `@occt-draw/webgl-engine`

职责：底层通用 WebGL2 渲染引擎，负责 RenderGraph、RenderLayer、RenderObject、primitive、相机、拾取、高亮、pass、GPU 资源、ViewCube 等底层渲染能力；不理解 CAD 业务。
依赖：math。

### `@occt-draw/canvas`

职责：通用 CAD 类画布显示基础设施，定义 CanvasScene、CanvasLayer、CanvasObject，并把通用画布对象投影为 webgl-engine 的 RenderGraph；负责相机/视图导航、拾取、高亮等画布能力；不理解 Sketch、Feature、PartStudio、ReferencePlane。
依赖：math, webgl-engine。

### `@occt-draw/platform`

职责：平台公共交互基础设施，提供输入事件适配、选择状态/管理、通用命令基类、命令管理器和交互编排，并通过 canvas 使用画布能力；不理解 CAD 业务数据。
依赖：core, math, snapping, canvas。

### `@occt-draw/cad-model`

职责：CAD 文档业务模型，管理 CadDocument、PartStudio、Feature、payload、基准对象、默认文档、文档查询和文档操作。
依赖：core, math, sketch。

### `@occt-draw/cad-canvas`

职责：CAD 到 canvas 的业务显示翻译层，读取 cad-model / sketch / EditDraft，把基准面、原点、草图、临时编辑对象翻译成通用 CanvasScene/CanvasObject。
依赖：cad-model, canvas, core, math, sketch。

### `@occt-draw/editor`

职责：CAD 编辑器运行时，管理具体命令、草图会话、渲染编排和 workbench view model；把 CAD 业务模型、adapter、canvas、platform 和 UI 状态接起来。
依赖：core, cad-model, cad-canvas, canvas, math, platform, sketch, snapping。

### `@occt-draw/ui`

职责：React UI 组件和样式。
依赖：无 workspace 依赖。

### `@occt-draw/web`

职责：React + Vite 应用壳，负责页面布局、工具栏、面板和挂载 editor runtime；不直接依赖 CAD 数据模型或渲染底层包。
依赖：editor, ui。

## 本地开发

当前项目使用 `Volta` 固定项目内工具版本：

- Node.js：`24.15.0`
- npm：`11.12.1`
- pnpm：`11.0.9`

进入本仓库后，终端会自动使用项目版本，不影响其它项目的全局 Node 和 pnpm。

常用命令：

```powershell
pnpm install
pnpm dev
pnpm check
```

## 文档

当前有效工程规划见 [产品架构重构与实施总纲](./docs/2026-07-30_产品架构重构与实施总纲.md)。
