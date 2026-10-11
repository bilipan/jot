import { $, esc, genId, toast } from '../lib/dom.js'
import { highlight, md } from '../lib/markdown.js'
import { saveLocal, state, updateBlogData } from '../state.js'
import { renderHeader } from './layout.js'
import { CAN_PUBLISH, doPublish } from './publish.js'

export function renderEditor(id) {
  const p = id ? state.blog.posts.find((x) => x.id === id) : null
  state.editType = p ? p.type : 'note'

  $('#app').innerHTML = '<div class="editor"><div class="type-selector">' +
    ['note', 'link', 'quote'].map((t) =>
      `<button class="type-btn ${state.editType === t ? 'active' : ''}" data-type="${t}">${
        { note: '笔记', link: '链接', quote: '引用' }[t]
      }</button>`).join('') +
    `</div><div id="editor-form">${editorForm(p, state.editType)}</div></div>`

  for (const btn of document.querySelectorAll('.type-btn')) {
    btn.onclick = () => switchType(btn.dataset.type, p, id)
  }
  bindEditor(id)
}

const parseTags = (str) => (str ? str.split(',').map((t) => t.trim()).filter(Boolean) : [])

/** 切换格式时保留已输入的内容，不丢字。 */
function switchType(type, p, id) {
  const saved = {
    content: $('#e-content')?.value ?? '',
    title: $('#e-title')?.value ?? p?.title ?? '',
    url: $('#e-url')?.value ?? p?.url ?? '',
    source: $('#e-source')?.value ?? p?.source ?? '',
    tags: parseTags($('#e-tags')?.value ?? ''),
  }
  state.editType = type
  $('#editor-form').innerHTML = editorForm({ ...(p ?? {}), ...saved }, type)
  bindEditor(id)
}

function editorForm(p, type) {
  const val = (k) => (p && p[k]) || ''
  let f = ''
  if (type !== 'quote') {
    f += `<div class="field"><label>标题（可选）</label><input id="e-title" value="${esc(val('title'))}" placeholder="给这篇起个名字…"></div>`
  }
  if (type === 'link') {
    f += `<div class="field"><label>链接 URL</label><input id="e-url" value="${esc(val('url'))}" placeholder="https://…"></div>`
  }
  if (type === 'quote') {
    f += `<div class="field"><label>来源</label><input id="e-source" value="${esc(val('source'))}" placeholder="出处…"></div>`
  }
  f += '<div class="field"><div class="tabs">' +
    '<button class="tab active" id="t-write">写作</button>' +
    '<button class="tab" id="t-preview">预览</button></div>' +
    `<textarea id="e-content" placeholder="支持 Markdown…">${esc(val('content'))}</textarea>` +
    '<div id="preview" style="display:none" class="post-content"></div>' +
    '<div class="field-hint">插入视频 / 音乐（独占一行）：<code>@[youtube](https://youtu.be/…)</code> · ' +
    '<code>@[bilibili](BV1xx…)</code> · <code>@[video](https://…/clip.mp4)</code> · ' +
    '<code>@[netease](https://music.163.com/#/song?id=…)</code></div></div>'
  f += `<div class="field"><label>标签（逗号分隔）</label><input id="e-tags" value="${esc(Array.isArray(p?.tags) ? p.tags.join(', ') : (p?.tags ?? ''))}" placeholder="标签1, 标签2"></div>`
  f += '<div class="actions">' +
    '<button class="btn btn-primary" id="btn-save">保存</button>' +
    (CAN_PUBLISH ? '<button class="btn btn-secondary" id="btn-publish">发布</button>' : '') +
    (p ? '<button class="btn btn-danger" id="btn-del">删除</button>' : '') +
    '<button class="btn btn-secondary" id="btn-cancel">取消</button></div>'
  return f
}

function bindEditor(id) {
  const p = id ? state.blog.posts.find((x) => x.id === id) : null

  $('#t-write').onclick = () => {
    $('#e-content').style.display = ''
    $('#preview').style.display = 'none'
    $('#t-write').classList.add('active')
    $('#t-preview').classList.remove('active')
  }

  $('#t-preview').onclick = () => {
    $('#e-content').style.display = 'none'
    $('#preview').style.display = ''
    $('#preview').innerHTML = md($('#e-content').value)
    highlight($('#preview'))
    $('#t-write').classList.remove('active')
    $('#t-preview').classList.add('active')
  }

  // 把表单内容合并进 posts 列表，并持久化到 localStorage
  const commit = () => {
    const post = collectPost(p)
    if (!post) return false
    const idx = state.blog.posts.findIndex((x) => x.id === post.id)
    if (idx >= 0) state.blog.posts[idx] = post
    else state.blog.posts.push(post)
    updateBlogData()
    saveLocal()
    renderHeader()
    return true
  }

  $('#btn-save').onclick = () => {
    if (!commit()) return
    toast('已保存到本地')
    location.hash = '/'
  }

  if ($('#btn-publish')) {
    $('#btn-publish').onclick = () => {
      if (!commit()) return
      if (!localStorage.getItem('gh_token')) {
        toast('已保存到本地。请在设置中配置 GitHub Token 后发布。', 3000)
        location.hash = '/'
        return
      }
      doPublish()
    }
  }

  if ($('#btn-del')) {
    $('#btn-del').onclick = () => {
      if (!confirm('确定删除？')) return
      state.blog.posts = state.blog.posts.filter((x) => x.id !== p.id)
      updateBlogData()
      saveLocal()
      renderHeader()
      toast('已删除')
      location.hash = '/'
    }
  }

  $('#btn-cancel').onclick = () => { location.hash = '/' }
}

function collectPost(p) {
  const content = $('#e-content').value.trim()
  const url = $('#e-url')?.value.trim() ?? ''
  if (!content && !url) {
    toast('内容不能为空')
    return null
  }
  const tagsStr = $('#e-tags')?.value.trim() ?? ''
  return {
    id: p ? p.id : genId(),
    type: state.editType,
    title: $('#e-title')?.value.trim() ?? '',
    content,
    url,
    source: $('#e-source')?.value.trim() ?? '',
    tags: parseTags(tagsStr),
    date: p ? p.date : new Date().toISOString(),
  }
}