import { $, esc, toast } from '../lib/dom.js'
import { state, updateBlogData } from '../state.js'
import { renderHeader } from './layout.js'

export const DEFAULT_PATH = 'docs/index.html'

// dev 下 DOM 里是 <script src="/src/main.js">，直接序列化上传会推一个坏掉的
// HTML 到线上。构建期常量，生产分支会被完全摇掉。
export const CAN_PUBLISH = import.meta.env.PROD

const DEV_ONLY_MSG = '开发模式下无法发布。请打开已部署的站点，或先 pnpm build 再 pnpm preview。'

/**
 * 序列化当前站点为可提交的完整 HTML。
 *
 * 浏览器扩展会在运行时往页面里注入节点，如果原样序列化就会把它们写进仓库。
 * 这里改用白名单：只保留应用自己的骨架和 Vite 内联产物。
 */
function serializeSite() {
  const clone = document.documentElement.cloneNode(true)
  // 克隆是游离节点，htmlElement.head/.body 在这里是 undefined，只能用 querySelector。
  const head = clone.querySelector('head')
  const body = clone.querySelector('body')

  // <head>：只保留标题、字符集、视口，以及 Vite 注入的第一个 <style> 与第一个 module <script>
  let styleSeen = false
  let scriptSeen = false
  for (const el of [...head.children]) {
    if (el.tagName === 'TITLE') continue
    if (el.tagName === 'META' && (el.getAttribute('charset') || el.getAttribute('name') === 'viewport')) continue
    if (el.tagName === 'STYLE' && !styleSeen) { styleSeen = true; continue }
    if (el.tagName === 'SCRIPT' && el.type === 'module' && !scriptSeen) { scriptSeen = true; continue }
    el.remove()
  }

  // <body>：只保留骨架节点，以及内联后的应用运行时脚本
  const KEEP_IDS = new Set(['header', 'app', 'footer', 'blog-data'])
  let runtimeSeen = false
  for (const el of [...body.children]) {
    if (KEEP_IDS.has(el.id)) continue
    if (!runtimeSeen && el.tagName === 'SCRIPT' && el.type === 'module') { runtimeSeen = true; continue }
    el.remove()
  }

  // 写入最新数据（只改克隆，不动当前 DOM）
  const clean = {
    title: state.blog.title,
    description: state.blog.description,
    posts: state.blog.posts,
    _updated: state.blog._updated || new Date().toISOString(),
  }
  clone.querySelector('#blog-data').textContent =
    JSON.stringify(clean, null, 2).replace(/<\//g, '<\\/')

  clone.querySelector('title').textContent = state.blog.title || 'jot'

  // 重置为「冷启动」状态：清空渲染结果，去掉「未发布」横幅
  clone.querySelector('#app').innerHTML = ''
  clone.querySelector('#header').innerHTML =
    `<h1 class="blog-title">${esc(state.blog.title)}</h1>` +
    (state.blog.description ? `<p class="blog-desc">${esc(state.blog.description)}</p>` : '') +
    '<nav class="nav"><a href="#/">首页</a><a href="#/archive">归档</a>' +
    '<a href="#/new">写作</a><a href="#/settings">设置</a></nav>'

  return '<!DOCTYPE html>\n' + clone.outerHTML
}

export function exportHtml() {
  if (!CAN_PUBLISH) return toast(DEV_ONLY_MSG, 3000)
  updateBlogData()
  const blob = new Blob([serializeSite()], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'index.html'
  a.click()
  URL.revokeObjectURL(a.href)
  toast('已导出')
}

export async function doPublish() {
  if (!CAN_PUBLISH) return toast(DEV_ONLY_MSG, 3000)

  const token = localStorage.getItem('gh_token')
  const owner = localStorage.getItem('gh_owner')
  const repo = localStorage.getItem('gh_repo')
  const path = localStorage.getItem('gh_path') || DEFAULT_PATH
  if (!token || !owner || !repo) return toast('GitHub 设置不完整', 3000)

  toast('发布中…', 10000)
  const html = serializeSite()
  const base = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`

  try {
    const current = await fetch(base, {
      headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' },
    })
    const data = current.ok ? await current.json() : null

    const body = {
      message: 'Update blog: ' + new Date().toLocaleString('zh-CN'),
      content: btoa(unescape(encodeURIComponent(html))),
    }
    if (data?.sha) body.sha = data.sha

    const res = await fetch(base, {
      method: 'PUT',
      headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        res.status === 403 ? '没有写入权限，请检查 Token'
        : res.status === 404 ? '仓库或文件不存在，请检查设置'
        : err.message || 'GitHub API 错误'
      )
    }

    state.hasUnpublished = false
    renderHeader()
    toast('发布成功！')
    location.hash = '/'
  } catch (e) {
    toast('发布失败：' + e.message, 5000)
  }
}

export function renderPublish() {
  if (!CAN_PUBLISH) {
    $('#app').innerHTML =
      '<h1 style="margin-bottom:16px;font-size:22px">发布</h1>' +
      `<p style="color:var(--muted)">${esc(DEV_ONLY_MSG)}</p>`
    return
  }
  const token = localStorage.getItem('gh_token')
  const owner = localStorage.getItem('gh_owner')
  const repo = localStorage.getItem('gh_repo')
  if (!token || !owner || !repo) {
    $('#app').innerHTML =
      '<h1 style="margin-bottom:16px;font-size:22px">发布</h1>' +
      '<p style="color:var(--muted)">请先在设置中配置 GitHub。</p>' +
      '<div class="actions" style="margin-top:20px"><a href="#/settings" class="btn btn-primary">去设置</a></div>'
    return
  }
  $('#app').innerHTML =
    '<h1 style="margin-bottom:16px;font-size:22px">发布到 GitHub</h1>' +
    '<p style="margin-bottom:20px;color:var(--muted)">将所有更改推送到 GitHub Pages。</p>' +
    '<div class="actions">' +
    '<button class="btn btn-primary" id="p-go">立即发布</button> ' +
    '<button class="btn btn-secondary" id="p-cancel">取消</button></div>'
  $('#p-go').onclick = () => doPublish()
  $('#p-cancel').onclick = () => { location.hash = '/' }
}