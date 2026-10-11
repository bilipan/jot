import { marked } from 'marked'
import { highlightAll } from 'microlighter'
import 'microlighter/themes/github.css'
import { VIDEO_START, VIDEO_SYNTAX, videoToken } from './video.js'

// breaks:true 保留 jot 原有的「单换行即换行」行为。
marked.use({
  gfm: true,
  breaks: true,
  extensions: [{
    name: 'video',
    level: 'block',
    // 给 marked 一个起跳位置，省掉逐块试探。
    start: (src) => src.search(VIDEO_START),
    tokenizer(src) {
      const m = VIDEO_SYNTAX.exec(src)
      if (!m) return undefined
      return { type: 'video', raw: m[0], kind: m[1], payload: m[2] }
    },
    renderer: (token) => videoToken(token.raw, token.kind, token.payload).html,
  }],
})

export function md(text) {
  return marked.parse(text || '', { async: false })
}

/**
 * 对已插入 DOM 的代码块着色。microlighter 每次调用都会先清空自己的
 * 高亮注册表（见 dist/microlighter.js 的 highlightAll），所以反复调用不会泄漏。
 */
export function highlight(root) {
  // 不支持 CSS Custom Highlight API 的浏览器降级为无高亮的纯文本。
  if (!globalThis.CSS?.highlights) return
  highlightAll({ root }).catch(() => {})
}