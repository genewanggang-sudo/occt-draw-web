# 运行时与资源约定

## 环境变量

当前前端运行时约定使用 `apps/web/.env.*` 管理环境变量，并遵循以下规则：

- 只有以 `VITE_` 开头的变量允许暴露给浏览器运行时
- 不允许把私密信息放进 `VITE_` 变量
- 示例变量统一维护在 `apps/web/.env.example`

当前预留变量：

- `VITE_APP_TITLE`: 前端应用标题
- `VITE_OCCT_WASM_ENTRY`: `occt-draw-core` Wasm 入口 URL

## Wasm 资源

当前约定 `occt-draw-core` 相关浏览器静态资源由 `apps/web/public/wasm/`
承载，`Vite` 只负责分发和引用，不在前端应用内嵌 Wasm 产物。

这样做的目标是：

- 明确 Wasm 资源边界
- 便于替换不同构建产物
- 避免页面层直接耦合 Wasm 加载细节

## 当前调用边界

浏览器层调用链保持不变：

`apps/web -> worker-client -> worker-runtime -> wasm-bridge -> occt-draw-core`

页面层不得直接引入 `occt-draw-core` Wasm 文件或其底层初始化逻辑。
