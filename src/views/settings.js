import { $, esc, toast } from '../lib/dom.js'
import { saveLocal, state, updateBlogData } from '../state.js'
import { renderHeader } from './layout.js'
import { DEFAULT_PATH, exportHtml } from './publish.js'

const key = (k, fallback = '') => localStorage.getItem(k) ?? fallback

export function renderSettings() {
  const ghOwner = key('gh_owner')
  const ghRepo = key('gh_repo')
  const siteUrl = ghOwner && ghRepo ? `https://${ghOwner}.github.io/${ghRepo}/` : ''

  $('#app').innerHTML =
    '<h1 style="margin-bottom:24px;font-size:22px">设置</h1>' +
    `<div class="field"><label>博客标题</label><input id="s-title" value="${esc(state.blog.title)}"></div>` +
    `<div class="field"><label>博客描述</label><input id="s-desc" value="${esc(state.blog.description)}"></div>` +
    '<hr style="margin:24px 0;border:none;border-top:1px solid var(--border)">' +
    '<h2 style="margin-bottom:16px;font-size:17px">GitHub 发布</h2>' +
    `<div class="field"><label>GitHub 用户名</label><input id="s-owner" value="${esc(ghOwner)}" placeholder="bilipan"></div>` +
    `<div class="field"><label>仓库名</label><input id="s-repo" value="${esc(ghRepo)}" placeholder="blog"></div>` +
    `<div class="field"><label>文件路径</label><input id="s-path" value="${esc(key('gh_path', DEFAULT_PATH))}" placeholder="${DEFAULT_PATH}"></div>` +
    `<div class="field"><label>GitHub Token</label><input id="s-token" type="password" value="${esc(key('gh_token'))}" placeholder="github_pat_…">` +
    '<div style="font-size:12px;color:var(--muted);margin-top:4px">Fine-grained token，需要仓库 Contents 读写权限。仅存储在浏览器 localStorage，不会提交到仓库。</div></div>' +
    (siteUrl ? `<div class="field"><label>站点地址</label><a href="${siteUrl}" target="_blank">${siteUrl}</a></div>` : '') +
    '<div class="actions">' +
    '<button class="btn btn-primary" id="s-save">保存</button>' +
    '<button class="btn btn-secondary" id="s-export">导出 HTML</button>' +
    '<button class="btn btn-secondary" id="s-cancel">取消</button>' +
    '</div>'

  $('#s-save').onclick = () => {
    state.blog.title = $('#s-title').value
    state.blog.description = $('#s-desc').value
    updateBlogData()
    saveLocal()
    renderHeader()
    for (const [k, sel] of [['gh_owner', '#s-owner'], ['gh_repo', '#s-repo'], ['gh_path', '#s-path'], ['gh_token', '#s-token']]) {
      localStorage.setItem(k, $(sel).value)
    }
    toast('设置已保存')
    location.hash = '/'
  }

  $('#s-export').onclick = () => exportHtml()
  $('#s-cancel').onclick = () => { location.hash = '/' }
}