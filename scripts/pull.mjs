#!/usr/bin/env node
/**
 * 回收博客数据：把已部署的单文件 HTML 里的 #blog-data 抽出来，写回 content/blog.json。
 *
 *   pnpm pull                                    从 docs/index.html 读
 *   pnpm pull --url https://xx.github.io/jot/    从线上站点读
 *   pnpm pull some-other.html                     从指定本地文件读
 *
 * 发布流程会覆盖 docs/index.html，所以改代码前先 pull 一次，浏览器里写的内容才不会丢。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const TARGET = new URL('../content/blog.json', import.meta.url)
const DEFAULT_SOURCE = new URL('../docs/index.html', import.meta.url)
const TAG = /<script type="application\/json" id="blog-data">([\s\S]*?)<\/script>/

function parseArgs(argv) {
  let url = null
  let file = null
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--url') url = argv[++i]
    else if (a.startsWith('--url=')) url = a.slice(6)
    else if (!a.startsWith('-')) file = a
  }
  return { url, file }
}

async function readSource({ url, file }) {
  if (url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`拉取失败 ${res.status} ${res.statusText} — ${url}`)
    return res.text()
  }
  return readFileSync(file ?? fileURLToPath(DEFAULT_SOURCE), 'utf8')
}

const { url, file } = parseArgs(process.argv.slice(2))

try {
  const html = await readSource({ url, file })
  const match = html.match(TAG)
  if (!match) throw new Error('没找到 #blog-data 标签，确认来源是 jot 生成的 HTML')

  const blog = JSON.parse(match[1])
  writeFileSync(TARGET, JSON.stringify(blog, null, 2) + '\n')

  const posts = Array.isArray(blog.posts) ? blog.posts.length : 0
  console.log(`✓ 已写入 content/blog.json —— ${blog.title}，${posts} 篇文章${url ? `（来源 ${url}）` : ''}`)
} catch (e) {
  console.error(`✗ ${e.message}`)
  process.exit(1)
}