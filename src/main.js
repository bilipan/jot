import './styles/main.css'
import { $ } from './lib/dom.js'
import { highlight } from './lib/markdown.js'
import { loadData } from './state.js'
import { renderEditor } from './views/editor.js'
import { renderFooter, renderHeader } from './views/layout.js'
import { renderArchive, renderHome, renderPost, renderTag } from './views/list.js'
import { renderPublish } from './views/publish.js'
import { renderSettings } from './views/settings.js'

function route() {
  const hash = location.hash.slice(1) || '/'
  if (hash === '/' || hash === '') renderHome()
  else if (hash === '/archive') renderArchive()
  else if (hash === '/new') renderEditor(null)
  else if (hash.startsWith('/edit/')) renderEditor(hash.slice(6))
  else if (hash.startsWith('/post/')) renderPost(hash.slice(6))
  else if (hash.startsWith('/tag/')) renderTag(decodeURIComponent(hash.slice(5)))
  else if (hash === '/settings') renderSettings()
  else if (hash === '/publish') renderPublish()
  else renderHome()

  highlight($('#app'))
  window.scrollTo(0, 0)
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    if (location.hash.startsWith('#/new') || location.hash.startsWith('#/edit')) {
      e.preventDefault()
      $('#btn-save')?.click()
    }
    return
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  if (e.key === 'n') location.hash = '/new'
  else if (e.key === 's') location.hash = '/settings'
})

loadData()
renderHeader()
renderFooter()
route()
window.addEventListener('hashchange', route)