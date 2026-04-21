# 基础框架设计

## 文档目的

本文档用于沉淀 `occt-draw-web` 当前已经确定的基础框架设计，作为后续
实现、评审、重构和协作时的统一参考。

当前阶段的目标不是快速拼出一个页面，而是先把工程骨架、模块边界、依赖
方向和 Wasm 接入路径设计稳定，避免后续代码规模变大后出现结构失控。

## 项目定位

`occt-draw-web` 是二维出图产品的前端项目，负责浏览器端的编辑器界面、
画布渲染、交互逻辑、Worker 通信，以及对 `occt-draw-core` 提供的 Wasm
能力进行加载和调用。

职责边界如下：

- 本仓库负责前端编辑器和运行时组织
- `occt-draw-core` 负责底层 OCCT 集成、投影算法和 Wasm 编译输出
- 本仓库不直接实现底层几何算法

## 当前总体架构

当前仓库采用轻量级 `pnpm workspace` monorepo 结构，核心设计原则是把
不同关注点从一开始就隔离开：

- 应用装配
- 领域模型
- 渲染能力
- Worker 通信
- Wasm 适配
- 公共类型和工程配置

当前目录结构如下：

```txt
apps/
  web/
packages/
  config/
  core/
  protocol/
  renderer/
  shared/
  wasm-bridge/
  worker-client/
  worker-runtime/
docs/
```

## 分层说明

### `apps/web`

浏览器应用入口层，未来负责：

- 页面装配
- 编辑器布局
- UI 状态组织
- 调用 `worker-client`
- 组合 `core`、`renderer` 等运行时包

当前还没有接入 `Vite` 和真实页面运行时，因此这里只保留了最小骨架。

### `packages/shared`

公共基础层，是当前设计中的最底层包。

职责：

- 基础类型
- 常量
- 通用工具
- 小型、稳定、无框架依赖的公共能力

约束：

- 不允许依赖任何其他 workspace 包

### `packages/protocol`

协议层，负责主线程与 Worker 之间的消息模型定义。

职责：

- request / response 模型
- 事件模型
- 错误模型
- 可序列化的消息边界

约束：

- 只允许依赖 `shared`

### `packages/core`

编辑器核心领域层。

未来职责：

- 图纸文档模型
- 图元模型
- 选择集
- 命令系统
- 撤销重做边界

约束：

- 只允许依赖 `shared`
- 不允许依赖 UI、Renderer、Worker、Wasm 细节

### `packages/renderer`

渲染层，负责 Canvas 相关能力。

未来职责：

- 视口状态
- 绘制流程
- 坐标变换
- 命中测试

约束：

- 只允许依赖 `shared` 和 `core`

### `packages/wasm-bridge`

Wasm 适配层，是 `occt-draw-core` 的唯一接入层。

职责：

- `occt-draw-core` Wasm 加载
- Wasm 调用封装
- Wasm 结果适配
- Wasm 相关错误收敛

约束：

- 只允许依赖 `shared` 和 `protocol`
- 页面层和其他业务层不得直接感知 Wasm 细节

### `packages/worker-client`

主线程侧 Worker 客户端层。

职责：

- 对上暴露更稳定的调用接口
- 对下封装 Worker 消息发送细节

约束：

- 只允许依赖 `shared` 和 `protocol`

### `packages/worker-runtime`

Worker 运行时层。

职责：

- Worker 入口组织
- 协议消息分发
- 调用 `wasm-bridge`
- 回传结果

约束：

- 只允许依赖 `shared`、`protocol`、`wasm-bridge`
- 不允许依赖 UI 和页面层

### `packages/config`

工程配置层。

职责：

- 未来沉淀共享工程配置
- 减少多包项目中的重复配置

约束：

- 不依赖运行时包

## Wasm 调用链路

围绕 `occt-draw-core` 的 Wasm 调用链路，当前明确约束如下：

```txt
apps/web
  -> worker-client
    -> worker-runtime
      -> wasm-bridge
        -> occt-draw-core (Wasm)
```

这条链路的意义是：

- 页面层不直接接触 Wasm
- Worker 通信细节不泄漏到 UI
- Wasm 适配逻辑集中在单独一层
- 未来便于测试、替换和调试

## 依赖方向约束

当前已确定并通过 ESLint 强制执行的依赖方向如下：

- `shared` -> 不依赖任何 workspace 包
- `config` -> 不依赖运行时 workspace 包
- `protocol` -> `shared`
- `core` -> `shared`
- `renderer` -> `shared`、`core`
- `wasm-bridge` -> `shared`、`protocol`
- `worker-client` -> `shared`、`protocol`
- `worker-runtime` -> `shared`、`protocol`、`wasm-bridge`
- `apps/web` -> 作为汇聚层，可组合运行时包

## Import 约束

当前已通过 ESLint 强制执行以下规则：

- 禁止通过相对路径跨包导入
- 禁止 deep import，例如 `@occt-draw/core/internal/foo`
- 只能通过 workspace 包公开入口导入，例如 `@occt-draw/core`

这类约束的目的是避免：

- 绕过包边界
- 偷用内部实现
- 未来重构时产生大面积破坏

## 当前工程配置基线

当前已经落地的工程配置包括：

- 包管理：`pnpm workspace`
- 语言：`TypeScript`
- 规范：`ESLint + Prettier + EditorConfig`
- 校验命令：`pnpm check`

`pnpm check` 当前会执行：

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm format:check`
4. `pnpm build`

当前配置目标是：

- 先建立工业级护栏
- 再逐步补运行时实现

## 当前阶段结论

当前仓库已经具备以下条件：

- 可以开始实现 `protocol`
- 可以开始实现 `core` 基础模型
- 可以开始实现 `renderer` 基础接口
- 可以在不破坏架构边界的前提下逐步接入 `Vite`

当前尚未开始的部分：

- React 页面壳
- 真实 Worker 运行时
- 真实 `occt-draw-core` Wasm 接入

当前已经补上的运行时基础设施：

- `apps/web` 已接入 `Vite` 基础壳
- 前端环境变量约定已建立
- Wasm 静态资源目录已预留

## 推荐的后续顺序

建议后续按以下顺序推进：

1. 完成 `protocol` 第一版消息模型
2. 完成 `core` 第一版文档和图元模型
3. 完成 `renderer` 第一版视口和绘制接口
4. 完成 `worker-client / worker-runtime` 第一版调用链路
5. 接入 `wasm-bridge` 和 `occt-draw-core`
6. 最后接入 `Vite` 和浏览器页面壳

## 相关文档

- [架构草案](./architecture.md)
- [工程规范](./engineering-guidelines.md)
