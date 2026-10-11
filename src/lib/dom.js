export const $ = (sel) => document.querySelector(sel)

export function esc(s) {
  const d = document.createElement('div')
  d.textContent = s == null ? '' : String(s)
  return d.innerHTML
}

export function fmtDate(s) {
  return new Date(s).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function toast(msg, dur) {
  dur = dur || 2000
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = msg
  document.body.appendChild(el)
  setTimeout(() => el.remove(), dur)
}