#!/usr/bin/env node
/**
 * 校验构建产物和内容源是否同步。
 *
 * 浏览器里的「发布」会直接改写 docs/index.html，而 pnpm build 是从
 * content/blog.json 重新生成它的 —— 两者写同一个文件，天然会漂移。
 * 推送前跑一次，能立刻发现线上还停留在旧构建。
 *
 *   pnpm verify
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SOURCE = new URL('../content/blog.json', import.meta.url)
const ARTIFACT = new URL('../docs/index.html', import.meta.url)
const TAG = /<script type="application\/json" id="blog-data">([\s\S]*?)<\/script>/

const readJSON = (url) => JSON.parse(readFileSync(url, 'utf8'))

/** 深比较，忽略对象键的顺序。 */
function same(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b || a === null || b === null) return false
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i]))
  }
  if (typeof a !== 'object') return false
  const ka = Object.keys(a).sort()
  const kb = Object.keys(b).sort()
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && same(a[k], b[k]))
}

const count = (data) => (Array.isArray(data?.posts) ? data.posts.length : 0)

try {
  if (!existsSync(fileURLToPath(ARTIFACT))) {
    console.error('✗ 还没有构建产物，先跑 pnpm build')
    process.exit(1)
  }

  const source = readJSON(SOURCE)
  const html = readFileSync(ARTIFACT, 'utf8')
  const tag = html.match(TAG)
  if (!tag) {
    console.error('✗ docs/index.html 里找不到 #blog-data，产物可能坏了')
    process.exit(1)
  }
  const artifact = JSON.parse(tag[1])

  if (same(source, artifact)) {
    console.log(`✓ 产物与内容一致 —— ${count(source)} 篇文章`)
    process.exit(0)
  }

  const sourceAt = source._updated ?? ''
  const artifactAt = artifact._updated ?? ''
  console.error('✗ docs/index.html 与 content/blog.json 不同步')
  console.error(`  content/blog.json  ${count(source)} 篇  ${sourceAt}`)
  console.error(`  docs/index.html   ${count(artifact)} 篇  ${artifactAt}`)
  if (artifactAt > sourceAt) {
    console.error('\n  产物更新 —— 浏览器发布过。执行：pnpm pull && pnpm build')
  } else {
    console.error('\n  内容更新 —— 还没构建。执行：pnpm build')
  }
  process.exit(1)
} catch (e) {
  console.error(`✗ ${e.message}`)
  process.exit(1)
}