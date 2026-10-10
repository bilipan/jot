# jot

单文件博客 — 像 TiddlyWiki，但为博客而生。

## 特点

- **单文件**：整个博客就是一个 HTML 文件，没有数据库、Docker、服务器
- **在线编辑**：浏览器中直接写作，支持 Markdown
- **一键发布**：通过 GitHub API 推送到 GitHub Pages
- **三种格式**：笔记 / 链接 / 引用
- **暗色模式**：自动跟随系统
- **归档与标签**：按时间和标签整理
- **本地草稿**：编辑自动保存到 localStorage，不怕断网

## 快速开始

### 1. 创建 GitHub 仓库

```bash
git init
git add index.html
git commit -m "init blog"
git remote add origin git@github.com:你的用户名/jot.git
git push -u origin main
```

### 2. 启用 GitHub Pages

仓库 Settings → Pages → Source: `main` 分支 → Save

### 3. 创建 GitHub Token

GitHub Settings → Developer settings → Fine-grained tokens → Generate new token

- Repository access: 选择你的博客仓库
- Permissions: Contents → Read and write

### 4. 配置博客

访问 `https://你的用户名.github.io/jot/` → 点击「设置」→ 填入用户名、仓库名、Token → 保存

### 5. 开始写作

点击「写作」→ 写内容 → 点击「发布」

## 工作原理

```
浏览器打开 HTML
    ↓
读取 <script type="application/json"> 中的博客数据
    ↓
渲染首页 / 文章 / 归档
    ↓
编辑 → 数据保存到 localStorage（防丢失）
    ↓
发布 → 整个 HTML 文件通过 GitHub API 提交到仓库
    ↓
GitHub Pages 自动更新
```

## 键盘快捷键

| 键 | 功能 |
|---|---|
| `n` | 新建文章 |
| `s` | 设置 |
| `Cmd/Ctrl+S` | 保存（编辑器中） |

## 自定义

直接编辑 HTML 文件中的 CSS 变量即可换色：

```css
:root {
  --bg: #faf9f7;      /* 背景 */
  --accent: #2563eb;   /* 主题色 */
  --max: 680px;        /* 内容宽度 */
}
```
