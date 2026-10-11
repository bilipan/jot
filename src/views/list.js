import { $, esc, fmtDate } from '../lib/dom.js'
import { md } from '../lib/markdown.js'
import { state } from '../state.js'

function byDateDesc(a, b) {
  return new Date(b.date) - new Date(a.date)
}

function postCard(p) {
  let content
  if (p.type === 'link') {
    content = `<div class="link-card"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a></div>${md(p.content)}`
  } else if (p.type === 'quote') {
    content = `<div class="quote-text">${md(p.content)}</div>` +
      (p.source ? `<div class="quote-source">— ${esc(p.source)}</div>` : '')
  } else {
    content = md(p.content)
  }
  const title = p.title ? `<h2 class="post-title"><a href="#/post/${p.id}">${esc(p.title)}</a></h2>` : ''
  const tags = p.tags?.length
    ? `<div class="post-tags">${p.tags.map((t) => `<a href="#/tag/${encodeURIComponent(t)}" class="tag">${esc(t)}</a>`).join('')}</div>`
    : ''
  return `<article class="post"><div class="post-date">${fmtDate(p.date)}</div>${title}` +
    `<div class="post-content">${content}</div>${tags}</article>`
}

export function renderHome() {
  const posts = state.blog.posts.slice().sort(byDateDesc)
  if (!posts.length) {
    $('#app').innerHTML =
      '<div style="text-align:center;padding:60px 0;color:var(--muted)">' +
      '<p>还没有文章</p><p style="margin-top:12px"><a href="#/new">写第一篇 →</a></p></div>'
    return
  }
  $('#app').innerHTML = posts.map(postCard).join('')
}

export function renderPost(id) {
  const p = state.blog.posts.find((x) => x.id === id)
  if (!p) {
    $('#app').innerHTML = '<p>文章不存在</p><p><a href="#/">← 返回</a></p>'
    return
  }
  $('#app').innerHTML = postCard(p) +
    '<div style="margin-top:20px"><a href="#/edit/' + p.id + '" style="color:var(--muted);font-size:13px">编辑</a></div>'
}

export function renderArchive() {
  const grouped = new Map()
  for (const p of state.blog.posts.slice().sort(byDateDesc)) {
    const y = new Date(p.date).getFullYear()
    if (!grouped.has(y)) grouped.set(y, [])
    grouped.get(y).push(p)
  }
  let h = '<h1 style="margin-bottom:24px;font-size:22px">归档</h1>'
  for (const y of [...grouped.keys()].sort((a, b) => b - a)) {
    h += `<div style="margin:20px 0 8px;font-weight:600;font-size:15px">${y}</div><ul style="list-style:none">`
    for (const p of grouped.get(y)) {
      const t = p.title || (p.type === 'link' ? p.url : p.content.slice(0, 30) + '…')
      h += '<li style="margin-bottom:6px"><span style="color:var(--muted);font-size:12px;margin-right:8px">' +
        new Date(p.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) +
        `</span><a href="#/post/${p.id}">${esc(t)}</a></li>`
    }
    h += '</ul>'
  }
  $('#app').innerHTML = h
}

export function renderTag(tag) {
  const posts = state.blog.posts
    .filter((p) => p.tags?.includes(tag))
    .sort(byDateDesc)
  $('#app').innerHTML = `<h1 style="margin-bottom:24px;font-size:22px">#${esc(tag)}</h1>` +
    (posts.length ? posts.map(postCard).join('') : '<p>没有相关文章</p>')
}