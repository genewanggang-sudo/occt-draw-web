# 文档索引

本文档用于作为 `docs/` 目录的入口，帮助后续快速定位不同主题的设计说明和
工程约定。

## 当前文档

### [foundation-architecture.md](./foundation-architecture.md)

当前项目基础框架设计总览，适合作为第一阅读入口。

内容包括：

- 项目定位
- workspace 结构
- 包职责
- Wasm 调用链路
- 当前阶段结论
- 推荐后续顺序

### [architecture.md](./architecture.md)

偏架构草案说明，聚焦包边界和分层设计。

适合在讨论模块职责、依赖方向、后续拆分方式时查阅。

### [engineering-guidelines.md](./engineering-guidelines.md)

工程规范和约束文档。

内容包括：

- TypeScript 基线
- import 约束
- 包边界
- 依赖方向
- 代码规范
- 核心脚本约定

### [runtime-conventions.md](./runtime-conventions.md)

运行时和资源层面的约定文档。

内容包括：

- 环境变量规范
- Wasm 静态资源约定
- 前端与 `occt-draw-core` 的调用边界

## 推荐阅读顺序

新进入项目时，建议按下面顺序阅读：

1. [foundation-architecture.md](./foundation-architecture.md)
2. [engineering-guidelines.md](./engineering-guidelines.md)
3. [runtime-conventions.md](./runtime-conventions.md)
4. [architecture.md](./architecture.md)

## 后续维护原则

- 新增设计文档时，同步更新本索引
- 文档标题尽量表达清楚主题，不使用模糊命名
- 能并入已有文档的内容优先并入，避免过度碎片化
