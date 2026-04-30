# WebGL 引擎架构设计

本文定义 WebGL 渲染引擎的长期边界。目标是让渲染引擎成为可复用基础设施，而不是只服务当前 CAD 业务界面的实现细节。

## 目标

WebGL 引擎负责把通用渲染场景绘制到 canvas，并提供渲染相关的基础交互能力。

核心能力包括：

- 场景绘制
- 相机和 viewport
- geometry / material / transform
- render pass
- GPU picking
- depth sampling
- label / overlay rendering
- WebGL resource lifecycle

WebGL 引擎不应该理解 CAD 业务语义。

## 非目标

WebGL 引擎不负责：

- CAD document
- feature / sketch / constraint
- command
- selection store
- model tree
- edit draft
- React UI
- 业务状态变更

这些能力应该在 `core`、`cad-rendering`、`editor` 或应用层处理。

## 输入协议

WebGL 引擎对外不应直接消费 CAD 业务显示模型。业务渲染层可以理解 body、sketch、reference plane 等 CAD 语义，但 WebGL 引擎只能消费通用 `RenderScene`。

引擎应消费通用 `RenderScene`：

```ts
interface RenderScene {
    readonly nodes: readonly RenderNode[];
}

interface RenderNode {
    readonly id: string;
    readonly visible?: boolean;
    readonly transform?: Matrix4;
    readonly geometry: RenderGeometry;
    readonly material: RenderMaterial;
    readonly bounds?: BoundingBox3;
    readonly renderOrder?: number;
    readonly passes?: RenderPassMask;
    readonly tags?: readonly string[];
    readonly attachments?: RenderNodeAttachments;
}
```

基础字段只表达图形事实。交互能力通过 `tags` 或 `attachments` 扩展，不把 CAD 业务类型写入基础协议。

## Tags 和 Attachments

`tags` 用于上层给节点打通用标签，引擎只做过滤，不解释业务含义。

示例：

```text
navigation-primary
navigation-secondary
pickable
overlay
```

`attachments` 用于描述可选渲染能力：

```ts
interface RenderNodeAttachments {
    readonly pick?: {
        readonly id: number;
    };

    readonly depthSample?: {
        readonly group: string;
    };

    readonly highlight?: {
        readonly key: string;
    };
}
```

引擎可以根据这些数据执行 picking、depth sampling 或 highlight，但不理解这些数据背后的 CAD 业务对象。

## CAD 适配层

CAD 业务渲染层应通过适配器把 `CadDocument / EditDraft` 转换为 `RenderScene`。

```text
CadDocument / EditDraft
    -> cad-rendering adapter
    -> WebGL engine
```

示例映射：

```text
body / sketch line / origin marker
    -> tags: ["navigation-primary", "pickable"]

reference plane
    -> tags: ["navigation-secondary", "pickable"]

label / annotation
    -> tags: ["overlay"]
```

WebGL 引擎只看到 tags，不知道 body、sketch、reference plane 或 annotation。

## 包边界

长期目标：

- WebGL 引擎包是可复用渲染引擎。
- 引擎包不依赖 `core`、`editor`、`apps/web`。
- 引擎包不依赖 `cad-rendering`、`core`、`sketch`、`editor` 或 `apps/web`。
- CAD 到 RenderScene 的转换位于 `cad-rendering`。

当前包边界：

```text
webgl-engine -> math / shared
cad-rendering -> webgl-engine / core / sketch / math / shared
editor / apps-web -> cad-rendering / webgl-engine
```

`renderer` 独立包不再保留，原相机、bounds、picking 和 WebGL2 实现统一下沉到 `webgl-engine`。

## 设计原则

- 引擎只认识图形概念，不认识业务概念。
- 基础协议保持小而稳定。
- 可选能力通过 tags / attachments 扩展。
- 上层负责业务语义到渲染语义的映射。
- picking 和 depth sampling 返回通用 id / depth / world point，上层解释业务含义。
