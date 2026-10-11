/**
 * 长引用折叠。
 *
 * 超过 --quote-lines 行（值在 main.css 的 blockquote 规则里）就截断，
 * 底部渐隐并显示「展开更多」。每次渲染后调用。
 */

/** 与 main.css 里 blockquote 的 --quote-lines 保持一致。 */
const LINES = 5

export function collapseQuotes(root) {
  if (!root) return
  for (const bq of root.querySelectorAll('blockquote')) {
    // 已处理过的跳过：重渲染会产生新节点，但同一节点可能被子调用再次扫到。
    if (bq.dataset.collapse) continue
    bq.dataset.collapse = '1'

    // 把原有内容收进 .quote-body，这样渐隐只作用在正文上，展开按钮不受影响。
    const body = document.createElement('div')
    body.className = 'quote-body'
    while (bq.firstChild) body.appendChild(bq.firstChild)
    bq.appendChild(body)

    const line = parseFloat(getComputedStyle(bq).lineHeight) || 32
    // 半行余量：避免刚好卡在边界上的抖动
    if (body.scrollHeight <= line * (LINES + 0.5)) continue

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'quote-toggle'
    btn.textContent = '展开更多'
    btn.setAttribute('aria-expanded', 'false')
    btn.onclick = () => {
      const open = bq.classList.toggle('is-open')
      btn.classList.toggle('is-open', open)
      btn.textContent = open ? '收起' : '展开更多'
      btn.setAttribute('aria-expanded', String(open))
    }

    bq.classList.add('is-clamped')
    bq.appendChild(btn)
  }
}