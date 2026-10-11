export const state = {
  blog: { title: '', description: '', posts: [] },
  hasUnpublished: false,
  editType: 'note',
}

const DATA_ID = 'blog-data'

export function loadData() {
  let embedded
  try {
    embedded = JSON.parse(document.getElementById(DATA_ID).textContent)
  } catch {
    embedded = { title: 'Blog', description: '', posts: [] }
  }
  if (!embedded.posts) embedded.posts = []

  // localStorage 里若有更新的副本就以它为准，并标记为「未发布」。
  const ls = localStorage.getItem('blog_data')
  if (ls) {
    try {
      const local = JSON.parse(ls)
      if (local._updated && (!embedded._updated || new Date(local._updated) > new Date(embedded._updated))) {
        state.blog = local
        state.hasUnpublished = true
        return
      }
    } catch { /* localStorage 内容损坏时忽略，继续用嵌入数据 */ }
  }
  state.blog = embedded
  state.hasUnpublished = false
}

export function saveLocal() {
  state.blog._updated = new Date().toISOString()
  localStorage.setItem('blog_data', JSON.stringify(state.blog))
}

export function updateBlogData() {
  const json = JSON.stringify(state.blog, null, 2).replace(/<\//g, '<\\/')
  document.getElementById(DATA_ID).textContent = json
}