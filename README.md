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

`pnpm pull` 在构建前跑，能把线上文章收回本地，避免被下一次构建覆盖。

### 推送前先校验

浏览器发布和 `pnpm build` 写的是同一个文件，所以要确认两边没有漂移：

```bash
pnpm verify
# ✓ 产物与内容一致 —— 4 篇文章
# 或
# ✗ docs/index.html 与 content/blog.json 不同步
#   content/blog.json  4 篇  2026-10-11T05:44:58.523Z
#   docs/index.html   5 篇  2026-10-11T12:20:05.216Z
#   产物更新 —— 浏览器发布过。执行：pnpm pull && pnpm build
```

它按 `_updated` 判断是哪边更新，并给出该跑哪条命令。同步时退出码 0，可以放进 pre-push 钩子。

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
  lib/video.js          视频 URL 解析 + embed HTML
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

**视频语法是 marked 的块级扩展。**
`src/lib/video.js` 导出解析逻辑和两个正则，`markdown.js` 注册成 `level: 'block'` 的扩展。
payload 用惰性匹配顶到行尾最后一个右括号，这样 `javascript:alert(1)` 这类含括号的输入
也会被视频规则接住并走协议校验，而不是漏给marked 当普通链接渲染成可点击的 `javascript:` 链接。

> 和手写解析器的一个行为差异：marked 默认放行 Markdown 里的裸 HTML（可嵌 iframe 等），
> 手写解析器是转义的。作者单人博客下这算特性，若要禁用在 `lib/markdown.js` 里处理。

## 视频嵌入

文章里用下面三种语法插入视频，**必须独占一行**：

```markdown
@[youtube](dQw4w9WgXcQ)
@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
@[bilibili](BV1Ex4y1z7FU)
@[bilibili](https://www.bilibili.com/video/BV1Ex4y1z7FU?p=2)
@[video](https://example.com/clip.mp4)
```

参数既接受裸 ID，也接受从分享菜单复制的完整 URL。

| 语法 | 支持的写法 |
|---|---|
| `@[youtube]` | 裸 11 位 ID、`youtube.com/watch?v=`、`youtu.be`、`/shorts/`、`/embed/` |
| `@[bilibili]` | `BV…`、`av…`，URL 上的 `?p=`（分P）和 `?t=`（起播秒数）会保留 |
| `@[video]` | `.mp4` `.webm` `.m4v` `.mov` `.ogv`，必须是 `http(s)://` 链接 |

几个说明：

- YouTube 走 `youtube-nocookie.com`，播放前不写 cookie
- 播放器固定 16:9，竖屏投稿（Shorts、B站竖屏）会被裁掉
- **b23.tv 短链不支持** —— 它是跳转链接，浏览器端拿不到真实 BV 号，请改用完整 URL
- 写错或无法识别时会显示一条红色提示，而不是静默消失
- 代码块里的 `@[...]` 不会被当成语法

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