import { $, esc } from '../lib/dom.js'
import { state } from '../state.js'

// 备案号是站点身份的一部分，跟 jot 本身无关。Fork 这个仓库的话记得改掉或删掉。
const ICP = '粤ICP备2026104236号'
const ICP_URL = 'https://beian.miit.gov.cn/'

export function renderHeader() {
  document.title = state.blog.title || 'Blog'
  $('#header').innerHTML =
    (state.hasUnpublished
      ? '<div class="banner" id="unpublished-banner">有未发布的更改 — 点击发布</div>'
      : '') +
    `<h1 class="blog-title">${esc(state.blog.title)}</h1>` +
    (state.blog.description ? `<p class="blog-desc">${esc(state.blog.description)}</p>` : '') +
    '<nav class="nav">' +
      '<a href="#/">首页</a>' +
      '<a href="#/archive">归档</a>' +
      '<a href="#/new">写作</a>' +
      '<a href="#/settings">设置</a>' +
    '</nav>'

  $('#unpublished-banner')?.addEventListener('click', () => { location.hash = '/publish' })
}

export function renderFooter() {
  $('#footer').innerHTML =
    `<p>© ${new Date().getFullYear()} ${esc(state.blog.title || 'jot')} · 单文件博客</p>` +
    `<p class="icp"><a href="${ICP_URL}" target="_blank" rel="noopener noreferrer">${ICP}</a></p>`
}