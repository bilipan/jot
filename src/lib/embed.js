import { esc } from './dom.js'

/**
 * 媒体嵌入：把 `@[youtube](…)`、`@[bilibili](…)`、`@[video](…)`、`@[netease](…)`
 * 变成播放器。
 *
 * 参数既接受裸 ID，也接受从分享菜单复制的完整 URL。
 * 解析不出来时返回错误提示而不是静默丢弃，这样拼错 ID 能立刻发现。
 */

const YT_ID = /^[\w-]{11}$/
const BVID = /BV[0-9A-Za-z]+/
const AID = /(?:^|\/)av(\d+)(?:\/|$|\?)/i
const VIDEO_EXT = /\.(mp4|webm|m4v|mov|ogv)(?:$|[?#])/i
const MIME = { mp4: 'video/mp4', webm: 'video/webm', m4v: 'video/mp4', mov: 'video/quicktime', ogv: 'video/ogg' }

const YT_HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'])
const YT_PATH = /^\/(?:embed|shorts|v|live)\/([\w-]+)/

// 网易云的 id 都是纯数字。歌单/专辑/电台共用同一套外链播放器。
const NCM_ID = /\b(\d{4,})\b/
const NCM_HOSTS = new Set(['music.163.com', 'y.music.163.com', 'm.music.163.com'])

function safeURL(payload) {
  try {
    const u = new URL(payload)
    // 只放行 http(s)，挡掉 javascript: 之类的协议。
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null
  } catch {
    return null
  }
}

function youtubeId(payload) {
  if (YT_ID.test(payload)) return payload
  const u = safeURL(payload)
  if (!u) return null
  const host = u.hostname.toLowerCase().replace(/^www\./, '')
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    return YT_ID.test(id) ? id : null
  }
  if (!YT_HOSTS.has(host) && !YT_HOSTS.has('www.' + host)) return null
  if (u.pathname === '/watch') {
    const v = u.searchParams.get('v')
    return v && YT_ID.test(v) ? v : null
  }
  const m = u.pathname.match(YT_PATH)
  return m && YT_ID.test(m[1]) ? m[1] : null
}

function bilibiliRef(payload) {
  // 作者已经明写了 @[bilibili]，所以在参数里找 BV 号 / av 号即可，
  // 不用管它是裸 ID、分享链接还是播放器地址。
  const bvid = payload.match(BVID)
  if (bvid) return withQuery({ bvid: bvid[0] }, payload)
  const aid = payload.match(AID)
  if (aid) return withQuery({ aid: aid[1] }, payload)
  return null
}

/** 保留分P（p / page）和起播时间（t），裸 ID 和完整 URL 都支持。 */
function withQuery(ref, payload) {
  const p = /[?&](?:p|page)=(\d+)/.exec(payload)
  if (p) ref.p = p[1]
  const t = /[?&]t=(\d+)/.exec(payload)
  if (t) ref.t = t[1]
  return ref
}

function fileSrc(payload) {
  const u = safeURL(payload)
  if (!u) return null
  const ext = u.pathname.match(VIDEO_EXT)?.[1]?.toLowerCase()
  return ext ? { url: u.href, mime: MIME[ext] } : null
}

function neteaseId(payload) {
  if (NCM_ID.test(payload) && !payload.includes('/')) return NCM_ID.exec(payload)[1]
  const u = safeURL(payload)
  if (!u) return null
  if (!NCM_HOSTS.has(u.hostname.toLowerCase())) return null
  // 分享链接有两种写法：/#/song?id=… 是 hash 路由，id 在 # 之后，
  // URL.searchParams 看不到，得从 hash 里再取一次。
  const hashQuery = u.hash.includes('?') ? u.hash.slice(u.hash.indexOf('?') + 1) : ''
  const id = u.searchParams.get('id') ?? new URLSearchParams(hashQuery).get('id')
  return id?.match(NCM_ID)?.[1] ?? null
}

function figure(modifier, inner) {
  return `<figure class="embed embed--${modifier}"><div class="embed-frame">${inner}</div></figure>`
}

function iframe(src, title, allow = '') {
  return `<iframe src="${esc(src)}" title="${esc(title)}" loading="lazy" scrolling="no" ` +
    `frameborder="0" allowfullscreen="true" referrerpolicy="strict-origin-when-cross-origin"` +
    `${allow ? ` allow="${esc(allow)}"` : ''}></iframe>`
}

function failure(raw) {
  return `<p class="embed-error">${esc(raw)} —— 无法识别，换成完整链接或 ID 试试</p>`
}

/** 每种类型：解析参数 → 生成 HTML；解析不出来返回 null。 */
const KINDS = {
  youtube: (payload) => {
    const id = youtubeId(payload)
    if (!id) return null
    return figure('video', iframe(
      `https://www.youtube-nocookie.com/embed/${id}`,
      'YouTube 视频',
      'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    ))
  },

  bilibili: (payload) => {
    const ref = bilibiliRef(payload)
    if (!ref) return null
    const q = new URLSearchParams({ ...(ref.bvid ? { bvid: ref.bvid } : { aid: ref.aid }), p: ref.p ?? '1', autoplay: '0', danmaku: '0' })
    if (ref.t) q.set('t', ref.t)
    return figure('video', iframe(`https://player.bilibili.com/player.html?${q}`, '哔哩哔哩视频'))
  },

  video: (payload) => {
    const f = fileSrc(payload)
    if (!f) return null
    return figure('video', '<video controls preload="metadata" playsinline>' +
      `<source src="${esc(f.url)}" type="${esc(f.mime)}">` +
      `你的浏览器不支持 video 标签。<a href="${esc(f.url)}">下载视频</a></video>`)
  },

  // 网易云外链播放器。type=2 带封面和上下曲按钮，比 type=1 高一些。
  netease: (payload) => {
    const id = neteaseId(payload)
    if (!id) return null
    const q = new URLSearchParams({ type: '2', id, auto: '0', height: '140' })
    return figure('music', iframe(`https://music.163.com/outchain/player?${q}`, '网易云音乐播放器'))
  },
}

export const KIND_NAMES = Object.keys(KINDS)

export function embedToken(raw, kind, payload) {
  const build = KINDS[kind]
  return (build && build(payload)) || failure(raw)
}

const NAMES = KIND_NAMES.join('|')

// payload 用惰性匹配顶到行尾最后一个右括号，这样 `javascript:alert(1)` 这类
// 含括号的输入也会被接住并走 safeURL 协议校验，而不是漏给 marked
// 当普通链接渲染成一个可点击的 javascript: 链接。
export const EMBED_SYNTAX = new RegExp(`^@\\[(${NAMES})\\]\\(\\s*(.+?)\\s*\\)[ \\t]*(?:\\n|$)`)
export const EMBED_START = new RegExp(`^@\\[(?:${NAMES})\\]`, 'm')