# GitHub Pages 部署指南

本文用于把 `occt-draw-web` 发布成一个可以通过浏览器访问的公网地址。

目标地址：

```text
https://genewanggang-sudo.github.io/occt-draw-web/
```

## 1. 背景说明

当前项目不是一个可以直接由 GitHub 仓库源码访问的网页，而是一个 `React + Vite + pnpm workspace` 前端工程。

浏览器最终访问的不是源码目录，而是 Vite 构建出来的静态文件目录：

```text
apps/web/dist
```

所以发布流程是：

```text
提交代码到 main
↓
GitHub Actions 自动安装依赖
↓
GitHub Actions 自动构建 @occt-draw/web
↓
生成 apps/web/dist
↓
GitHub Pages 发布 dist 目录
↓
通过 https://genewanggang-sudo.github.io/occt-draw-web/ 访问
```

## 2. 不要选择 docs 目录作为 Pages 发布源

虽然本文档放在 `docs` 目录下，但 GitHub Pages 不应该选择 `docs` 作为发布源。

原因：

- `docs` 目录是工程文档，不是打包后的前端页面。
- Web 应用真正需要发布的是 `apps/web/dist`。
- `apps/web/dist` 需要先通过 Vite 构建生成。

因此本项目应使用：

```text
GitHub Pages Source = GitHub Actions
```

而不是：

```text
Deploy from a branch → docs
```

## 3. 实施前检查

在开始前确认以下条件：

1. 仓库是公开仓库，或者当前 GitHub 账号支持私有仓库 Pages。
2. 当前账号对仓库有 `admin` 或 `maintain` 权限。
3. 默认分支是 `main`。
4. 根目录存在 `pnpm-lock.yaml`。
5. `apps/web/package.json` 里存在构建命令：

```json
{
    "scripts": {
        "build": "tsc -p tsconfig.build.json --pretty false && vite build"
    }
}
```

## 4. 第一步：修改 Vite base

打开文件：

```text
apps/web/vite.config.ts
```

在现有配置中增加 `base`，当前配置基础上的结果如下：

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/occt-draw-web/',
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
    },
});
```

### 为什么必须配置 base

GitHub Pages 的项目站点不是部署在域名根路径：

```text
https://genewanggang-sudo.github.io/
```

而是部署在仓库子路径：

```text
https://genewanggang-sudo.github.io/occt-draw-web/
```

所以 Vite 需要知道所有 JS、CSS、图片、Wasm 等资源都应该从 `/occt-draw-web/` 下面加载。

如果不配置该 `base`：

```ts
base: '/occt-draw-web/',
```

常见结果是：

```text
页面能打开，但控制台出现 JS/CSS 404，页面白屏。
```

## 5. 第二步：新增 GitHub Actions 工作流

在仓库根目录新增文件：

```text
.github/workflows/pages.yml
```

完整内容如下：

```yaml
name: Deploy GitHub Pages

on:
    push:
        branches:
            - main
    workflow_dispatch:

permissions:
    contents: read
    pages: write
    id-token: write

concurrency:
    group: pages
    cancel-in-progress: true

jobs:
    build:
        runs-on: ubuntu-latest

        steps:
            - name: Checkout
              uses: actions/checkout@v6

            - name: Setup Node
              uses: actions/setup-node@v6
              with:
                  node-version: 24.15.0

            - name: Setup pnpm
              run: npm install --global pnpm@11.0.9

            - name: Install dependencies
              run: pnpm install --frozen-lockfile

            - name: Build web app
              run: pnpm --filter @occt-draw/web build

            - name: Setup Pages
              uses: actions/configure-pages@v6
              with:
                  enablement: true

            - name: Upload Pages artifact
              uses: actions/upload-pages-artifact@v5
              with:
                  path: apps/web/dist

    deploy:
        environment:
            name: github-pages
            url: ${{ steps.deployment.outputs.page_url }}

        runs-on: ubuntu-latest
        needs: build

        steps:
            - name: Deploy to GitHub Pages
              id: deployment
              uses: actions/deploy-pages@v5
```

### 这个 workflow 做了什么

| 步骤                     | 作用                         |
| ------------------------ | ---------------------------- |
| `Checkout`               | 拉取仓库代码                 |
| `Setup pnpm`             | 安装项目指定的 pnpm 版本     |
| `Setup Node`             | 使用项目指定的 Node.js 版本  |
| `Install dependencies`   | 安装依赖，严格使用 lockfile  |
| `Build web app`          | 构建 `@occt-draw/web` 应用   |
| `Setup Pages`            | 初始化 GitHub Pages 部署环境 |
| `Upload Pages artifact`  | 上传 `apps/web/dist`         |
| `Deploy to GitHub Pages` | 发布到 GitHub Pages          |

## 6. 第三步：提交代码

如果使用命令行，执行：

```bash
git add apps/web/vite.config.ts .github/workflows/pages.yml docs/2026-06-13\ GitHub\ Pages部署指南.md docs/2026-04-26\ 索引.md
git commit -m "docs: add GitHub Pages deployment guide"
git push origin main
```

如果使用 GitHub 网页编辑器，保存文件时直接提交到 `main` 分支即可。

## 7. 第四步：启用 GitHub Pages 的 Actions 发布源

进入 GitHub 仓库页面：

```text
https://github.com/genewanggang-sudo/occt-draw-web
```

依次点击：

```text
Settings → Pages
```

找到：

```text
Build and deployment
```

将 `Source` 设置为：

```text
GitHub Actions
```

不要选择：

```text
Deploy from a branch
```

设置完成后，GitHub Pages 会等待 workflow 部署结果。

## 8. 第五步：检查 Actions 执行结果

进入仓库页面后点击：

```text
Actions
```

找到 workflow：

```text
Deploy GitHub Pages
```

点进去后应看到两个 job：

```text
build
```

和：

```text
deploy
```

成功时显示绿色对勾。

如果失败，先看失败的是哪一步：

| 失败步骤                 | 常见原因                                  | 处理方式                                                 |
| ------------------------ | ----------------------------------------- | -------------------------------------------------------- |
| `Install dependencies`   | `pnpm-lock.yaml` 和 `package.json` 不一致 | 本地运行 `pnpm install` 后提交新的 lockfile              |
| `Build web app`          | TypeScript 或 Vite 构建错误               | 先本地执行 `pnpm --filter @occt-draw/web build` 修复错误 |
| `Upload Pages artifact`  | `apps/web/dist` 没生成                    | 确认构建命令是否成功，确认输出目录是否仍是 `dist`        |
| `Deploy to GitHub Pages` | Pages 没启用或权限不足                    | 检查 Settings → Pages → Source 是否为 GitHub Actions     |

## 9. 第六步：访问线上地址

部署成功后访问：

```text
https://genewanggang-sudo.github.io/occt-draw-web/
```

如果 GitHub Actions 页面显示部署成功，但访问仍然 404，可以等待几十秒后刷新。GitHub Pages 首次部署有时不会立刻生效。

## 10. 本地验证方式

发布前可以先在本地验证构建是否通过。

在仓库根目录执行：

```bash
pnpm install
pnpm --filter @occt-draw/web build
```

构建成功后应出现：

```text
apps/web/dist
```

如果要本地预览构建产物，可以执行：

```bash
pnpm --filter @occt-draw/web exec vite preview --host 0.0.0.0
```

然后访问终端输出的本地地址。

注意：本地 preview 主要验证构建产物是否能打开，不能完全等价于 GitHub Pages 子路径部署。线上是否正常仍要以：

```text
https://genewanggang-sudo.github.io/occt-draw-web/
```

为准。

## 11. 常见问题

### 11.1 打开页面是 404

优先检查：

1. `Settings → Pages → Source` 是否为 `GitHub Actions`。
2. `Actions → Deploy GitHub Pages` 是否成功。
3. 访问地址是否带了仓库名：

```text
https://genewanggang-sudo.github.io/occt-draw-web/
```

不要访问：

```text
https://genewanggang-sudo.github.io/
```

### 11.2 页面白屏

打开浏览器控制台，检查是否有类似错误：

```text
Failed to load module script
404
```

如果 JS 或 CSS 地址从根路径加载，例如：

```text
/assets/index-xxx.js
```

说明 `base` 没生效。

正确地址应该类似：

```text
/occt-draw-web/assets/index-xxx.js
```

处理方式：确认 `apps/web/vite.config.ts` 中存在：

```ts
base: '/occt-draw-web/',
```

### 11.3 静态资源或 Wasm 加载失败

如果代码中存在这种写法：

```ts
fetch('/xxx.wasm');
```

部署到 GitHub Pages 后可能会请求到：

```text
https://genewanggang-sudo.github.io/xxx.wasm
```

这是错误的，因为资源实际应在：

```text
https://genewanggang-sudo.github.io/occt-draw-web/xxx.wasm
```

建议改成以下方式之一：

```ts
const wasmUrl = `${import.meta.env.BASE_URL}xxx.wasm`;
```

或使用 Vite 资源 URL：

```ts
const wasmUrl = new URL('./xxx.wasm', import.meta.url).toString();
```

### 11.4 构建通过，但业务接口请求失败

GitHub Pages 只能托管静态前端文件，不能运行后端服务。

可以放到 GitHub Pages 的内容包括：

- HTML
- CSS
- JavaScript
- 图片
- 字体
- Wasm 静态文件

不能直接运行：

- Node.js 后端
- 数据库
- WebSocket 服务端
- 私有 API 服务

如果应用需要后端 API，API 必须部署到其它服务器，前端通过完整 URL 调用。

### 11.5 Actions 里提示 Node 版本不可用

本项目当前固定 Node.js 为：

```text
24.15.0
```

如果 GitHub runner 暂时找不到这个精确版本，可以临时把 workflow 中的：

```yaml
node-version: 24.15.0
```

改成：

```yaml
node-version: 24
```

但如果项目依赖严格要求 `>=24.15.0 <25`，推荐优先保持 `24.15.0`。

## 12. 完成标准

当以下条件全部满足时，说明 GitHub Pages 发布功能完成：

1. `apps/web/vite.config.ts` 已配置：

```ts
base: '/occt-draw-web/',
```

2. 仓库存在：

```text
.github/workflows/pages.yml
```

3. GitHub 仓库设置中：

```text
Settings → Pages → Source = GitHub Actions
```

4. `Actions → Deploy GitHub Pages` 最近一次运行成功。
5. 浏览器能正常打开：

```text
https://genewanggang-sudo.github.io/occt-draw-web/
```

6. 浏览器控制台没有 JS、CSS、Wasm 资源 404。

## 13. 后续维护规则

1. 仓库名如果从 `occt-draw-web` 改成其它名字，需要同步修改 `base` 和访问地址。
2. 如果 Web 应用输出目录从 `apps/web/dist` 改成其它路径，需要同步修改 workflow 的 `Upload Pages artifact` 路径。
3. 如果 Node 或 pnpm 版本升级，需要同步修改 workflow 中的 `node-version` 和 pnpm `version`。
4. 不要把构建产物 `apps/web/dist` 提交到 main 分支；由 GitHub Actions 自动生成并发布。
5. GitHub Pages 发布只负责前端静态文件，不替代后端部署。

## 14. 参考文档

- GitHub Pages 发布源配置：`https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site`
- Vite 静态部署与 GitHub Pages：`https://vite.dev/guide/static-deploy.html`
