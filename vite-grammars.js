import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const GRAMMARS_DIR = fileURLToPath(new URL('./node_modules/microlighter/dist/grammars/', import.meta.url))
const TARGET = 'microlighter/dist/grammar-dependencies.js'

// microlighter 按需加载语法文件用的动态 import。
const ANCHOR = /const getGrammar = language => import\(`\.\/grammars\/\$\{language\}\.js`\)\s*\.then\(module => module\.default\)\s*\.catch\(\(\) => null\);/

/**
 * 把 microlighter 的语法文件改成静态引入。
 *
 * 它用 `import(\`./grammars/${language}.js\`)` 按需加载 37 个语法，但 Rolldown 无法静态
 * 分析这个模板字面量，既不会生成 chunk 也不会内联 —— 构建产物里会残留一句运行时
 * import()，打开页面直接报错。所以构建时改写成静态 map。
 *
 * 语言列表直接读 dist/grammars/，升级 microlighter 后无需改动这里。
 */
export function inlineGrammars() {
  return {
    name: 'jot:inline-microlighter-grammars',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').endsWith(TARGET)) return null

      if (!ANCHOR.test(code)) {
        // 宁可构建失败，也不要产出一个高亮静默失效的单文件。
        throw new Error(
          'microlighter 升级后无法定位 getGrammar 的动态 import，' +
          'jot:inline-microlighter-grammars 插件需要跟着调整（见 vite.config.js）。'
        )
      }

      const languages = readdirSync(GRAMMARS_DIR)
        .filter((f) => f.endsWith('.js') && !f.endsWith('.d.ts'))
        .map((f) => f.slice(0, -3))
        .sort()

      const imports = languages.map((l, i) => `import __g${i} from './grammars/${l}.js';`).join('\n')
      const entries = languages.map((l, i) => `  ${JSON.stringify(l)}: __g${i},`).join('\n')
      const replacement =
        `${imports}\n` +
        `const __GRAMMARS = {\n${entries}\n};\n` +
        'const getGrammar = language => Promise.resolve(__GRAMMARS[language] ?? null);'

      return { code: code.replace(ANCHOR, replacement), map: null }
    },
  }
}