import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { inlineGrammars } from './vite-grammars.js'

const BLOG_DATA = new URL('./content/blog.json', import.meta.url)
const BLOG_DATA_TAG = /(<script type="application\/json" id="blog-data">)([\s\S]*?)(<\/script>)/

/**
 * 把 content/blog.json 注入模板里的 #blog-data 占位标签。
 * transformIndexHtml 在 dev 和 build 都会执行，所以开发时也能读到真实数据。
 */
function injectBlogData() {
  return {
    name: 'jot:blog-data',
    transformIndexHtml(html) {
      const blog = JSON.parse(readFileSync(BLOG_DATA, 'utf8'))
      const json = JSON.stringify(blog, null, 2).replace(/<\//g, '<\\/')
      if (!BLOG_DATA_TAG.test(html)) {
        throw new Error('index.html 缺少 #blog-data 占位标签')
      }
      return html.replace(BLOG_DATA_TAG, (_, open, _old, close) => `${open}${json}${close}`)
    },
  }
}

export default defineConfig({
  plugins: [
    inlineGrammars(),
    injectBlogData(),
    viteSingleFile({ removeViteModuleLoader: true }),
  ],
  build: {
    target: 'es2022',
    // 产物直接是 GitHub Pages 服务的那一份。
    outDir: 'docs',
    emptyOutDir: true,
  },
})