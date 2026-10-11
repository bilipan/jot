# jot

单文件博客 — 像 TiddlyWiki，但为博客而生。

源码用 pnpm + Vite 管理，构建产物是**一个自包含的 HTML 文件**：没有数据库、Docker、服务器，
打开就能用，断网也能用。

## 特点

- **单文件**：构建产物就是 GitHub Pages 直接服务的那一个 HTML
- **在线编辑**：浏览器中直接写作，Markdown + 代码高亮
- **一键发布**：通过 GitHub API 把单文件 HTML 推回仓库
- **三种格式**：笔记 / 链接 / 引用
- **自动暗色**：跟随系统，代码高亮同步切换
- **归档与标签**：按时间和标签整理
- **本地草稿**：编辑自动存 localStorage，不怕断网

## 快速开始

```bash
pnpm install
pnpm dev      # 本地开发 → http://localhost:5173
pnpm build    # 产出单文件 → docs/index.html
pnpm preview  # 预览构建产物（发布功能在这里可用）
```

## 部署

### 1. 启用 GitHub Pages

仓库 Settings → Pages → Source: **`main` 分支` /docs` 目录** → Save

> 产物在 `docs/`，不是仓库根目录。

### 2. 创建 GitHub Token

GitHub Settings → Developer settings → Fine-grained tokens → Generate new token

- Repository access：选择你的博客仓库
- Permissions：Contents → Read and write

### 3. 配置博客

访问站点 → 「设置」→ 填入用户名、仓库名、**文件路径 `docs/index.html`**、Token → 保存

### 4. 开始写作

「写作」→ 写内容 → 「发布」。发布就是把整份单文件 HTML 提交回仓库，Pages 随即更新。

## 内容怎么流动

```
content/blog.json          ← 唯一内容源，提交进仓库
      │ pnpm build（Vite 注入）
      ▼
docs/index.html           ← 构建产物，提交进仓库，Pages 服务它
      │ 浏览器里写作 → 「发布」（GitHub API 提交整份 HTML）
      ▼
docs/index.html           ← 被浏览器改写后的产物
      │ pnpm pull
      ▼
content/blog.json          ← 收回本地
```

**发布和构建写的是同一个文件**，所以改了代码要重新构建时，先 `pnpm pull` 把线上数据收回来：

```bash
pnpm pull                                # 从 docs/index.html 收回
pnpm pull --url https://xx.github.io/jot/ # 直接从线上站点收回
pnpm build
```

## 开发

```
index.html              Vite 入口模板（不是产物）
vite.config.js          构建配置 + 数据注入插件
vite-grammars.js        把 microlighter 的语法文件改成静态引入（见下）
content/blog.json       博客数据
docs/index.html         构建产物 —— 要提交，Pages 服务它
scripts/pull.mjs        从已部署的 HTML 回收数据
src/
  main.js               启动、路由、快捷键
  state.js              共享状态 + localStorage 持久化
  lib/dom.js            $ / esc / 日期 / toast
  lib/markdown.js       marked + microlighter
  views/                layout / list / editor / settings / publish
  styles/main.css       样式
```

### 几个值得知道的地方

**数据必须是 DOM 节点，不能是 JS 模块。**
浏览器端的「发布」靠改写 `<script type="application/json" id="blog-data">` 再把整个 DOM 提交回去。
如果把数据 `import` 进 JS，就会被打进 bundle，浏览器端改不动它。所以模板里留占位标签，
构建时由 `vite.config.js` 的 `injectBlogData()` 注入 `content/blog.json`。

**发布前会过滤 DOM。**
浏览器扩展会往页面里注入节点，原样序列化就会把它们写进仓库。`src/views/publish.js` 的
`serializeSite()` 用白名单处理：`head` 只留标题、字符集、视口和 Vite 注入的第一个 `<style>` 与
第一个 module `<script>`；`body` 只留 `#header` `#app` `#footer` `#blog-data` 和运行时脚本。

> 克隆出来的 `<html>` 是游离节点，`clone.head` / `clone.body` 在这里是 `undefined`，必须用
> `clone.querySelector('head')`。

**dev 下发布和导出是禁用的。**
`import.meta.env.PROD` 是构建期常量，dev 下 DOM 里是 `<script src="/src/main.js">`，直接上传等于
推一个坏文件上线。要试发布请用 `pnpm preview`。

**microlighter 的语法文件是静态打进去的。**
它用 `import(\`./grammars/${language}.js\`)` 按需加载 37 个语法，但 Rolldown 无法静态分析这个模板
字面量，既不生成 chunk 也不内联 —— 构建产物里会残留一句运行时 `import()`，打开直接报错。
`vite-grammars.js` 在构建时把它改写成静态 map，语言列表直接读 `node_modules`，升级 microlighter
不用改这里；如果哪天定位不到那段动态 import，插件会**直接让构建失败**，不会产出一个高亮静默失效的
单文件。

**Markdown 用 marked，代码高亮用 microlighter。**
两者都不注入 `<span>`，高亮走 CSS Custom Highlight API。不支持的浏览器（Safari 17.2 以下、
Firefox 140 以下）自动降级为无高亮的纯文本，内容照常可读。主题是 `github`，内部用 `light-dark()`
自动跟随系统明暗，不需要引两套。

> 和手写解析器的一个行为差异：marked 默认放行 Markdown 里的裸 HTML（可嵌 iframe 等），
> 手写解析器是转义的。作者单人博客下这算特性，若要禁用在 `lib/markdown.js` 里处理。

## 键盘快捷键

| 键 | 功能 |
|---|---|
| `n` | 新建文章 |
| `s` | 设置 |
| `Cmd/Ctrl+S` | 保存（编辑器中） |

## 自定义

改 `src/styles/main.css` 里的 CSS 变量即可换色：

```css
:root {
  --bg: #faf9f7;      /* 背景 */
  --accent: #2563eb;   /* 主题色 */
  --max: 680px;        /* 内容宽度 */
}
```

代码块的配色来自 microlighter 主题，在 `src/lib/markdown.js` 引入，换个主题文件即可
（`microlighter/themes/` 下有 10 个）。