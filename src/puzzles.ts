import { L, esc, rnd, shuffle, page } from './util'

/* ---------- Maze (recursive backtracker) ---------- */
export function maze(title: string, cols: number, rows: number, shape: string) {
  // walls: for each cell, [top,right,bottom,left]
  const inside = (r: number, c: number) => {
    if (shape !== 'circle') return true
    const cx = (cols - 1) / 2, cy = (rows - 1) / 2
    return ((c - cx) / (cols / 2)) ** 2 + ((r - cy) / (rows / 2)) ** 2 <= 1.02
  }
  const walls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [true, true, true, true]))
  const seen = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => !inside(r, c)))
  const D = [[-1, 0, 0, 2], [0, 1, 1, 3], [1, 0, 2, 0], [0, -1, 3, 1]]
  let start: [number, number] = [0, 0]
  for (let c = 0; c < cols; c++) if (!seen[0][c]) { start = [0, c]; break }
  if (shape === 'circle') { start = [0, Math.floor(cols / 2)] ; for (let r = 0; r < rows; r++) if (!seen[r][start[1]]) { start = [r, start[1]]; break } }
  let end: [number, number] = [rows - 1, cols - 1]
  if (shape === 'circle') { for (let r = rows - 1; r >= 0; r--) if (!seen[r][Math.floor(cols / 2)]) { end = [r, Math.floor(cols / 2)]; break } }
  const stack: [number, number][] = [start]; seen[start[0]][start[1]] = true
  const parent = new Map<string, string>()
  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const opts = D.filter(([dr, dc]) => { const nr = r + dr, nc = c + dc; return nr >= 0 && nc >= 0 && nr < rows && nc < cols && !seen[nr][nc] })
    if (!opts.length) { stack.pop(); continue }
    const [dr, dc, w, ow] = opts[rnd(opts.length)]
    const nr = r + dr, nc = c + dc
    walls[r][c][w] = false; walls[nr][nc][ow] = false; seen[nr][nc] = true
    parent.set(nr + ',' + nc, r + ',' + c); stack.push([nr, nc])
  }
  // path from end back to start
  const path: [number, number][] = []
  let k: string | undefined = end.join(',')
  while (k) { const [a, b] = k.split(',').map(Number); path.push([a, b]); k = parent.get(k) }
  const S = Math.min(180 / cols, 230 / rows)
  const W = cols * S, H = rows * S
  // open entrance/exit
  walls[start[0]][start[1]][0] = false; walls[end[0]][end[1]][2] = false
  let d = ''
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!inside(r, c)) continue
    const x = c * S, y = r * S, w = walls[r][c]
    if (w[0]) d += `M${x} ${y}h${S}`
    if (w[3]) d += `M${x} ${y}v${S}`
    if (w[1] && (c === cols - 1 || !inside(r, c + 1))) d += `M${x + S} ${y}v${S}`
    if (w[2] && (r === rows - 1 || !inside(r + 1, c))) d += `M${x} ${y + S}h${S}`
  }
  const sol = 'M' + path.map(([r, c]) => `${c * S + S / 2} ${r * S + S / 2}`).join('L')
  const svg = (key: boolean) => `<svg class="maze" viewBox="-6 -8 ${W + 12} ${H + 16}" width="${W + 12}mm" height="${H + 16}mm">
   <path d="${d}" stroke="#000" stroke-width="${Math.max(0.5, S / 8)}" stroke-linecap="square" fill="none"/>
   <text x="${start[1] * S + S / 2}" y="-2.5" font-size="5" text-anchor="middle">▼ ${L('スタート', 'Start')}</text>
   <text x="${end[1] * S + S / 2}" y="${H + 6}" font-size="5" text-anchor="middle">${L('ゴール', 'Finish')} ▼</text>
   ${key ? `<path d="${sol}" stroke="#c0392b" stroke-width="${Math.max(0.6, S / 5)}" fill="none" stroke-linejoin="round"/>` : ''}</svg>`
  return { pages: [page(title, svg(false), { sub: L('スタートからゴールまで、線でたどりましょう。', 'Draw a path from Start to Finish.') }), page(title, svg(true), { answer: true })], warn: '' }
}

/* ---------- Sudoku ---------- */
function boxDims(n: number): [number, number] { return n === 4 ? [2, 2] : n === 6 ? [2, 3] : [3, 3] }
function solveCount(g: number[], n: number, limit: number): number {
  const [br, bc] = boxDims(n)
  const i = g.indexOf(0)
  if (i < 0) return 1
  const r = Math.floor(i / n), c = i % n
  let count = 0
  for (let v = 1; v <= n; v++) {
    let ok = true
    for (let k = 0; k < n && ok; k++) if (g[r * n + k] === v || g[k * n + c] === v) ok = false
    const r0 = r - (r % br), c0 = c - (c % bc)
    for (let a = 0; a < br && ok; a++) for (let b = 0; b < bc && ok; b++) if (g[(r0 + a) * n + c0 + b] === v) ok = false
    if (!ok) continue
    g[i] = v; count += solveCount(g, n, limit - count); g[i] = 0
    if (count >= limit) break
  }
  return count
}
function fullGrid(n: number): number[] {
  const [br, bc] = boxDims(n)
  const g = Array(n * n).fill(0)
  const fill = (i: number): boolean => {
    if (i === n * n) return true
    const r = Math.floor(i / n), c = i % n
    for (const v of shuffle(Array.from({ length: n }, (_, k) => k + 1))) {
      let ok = true
      for (let k = 0; k < n && ok; k++) if (g[r * n + k] === v || g[k * n + c] === v) ok = false
      const r0 = r - (r % br), c0 = c - (c % bc)
      for (let a = 0; a < br && ok; a++) for (let b = 0; b < bc && ok; b++) if (g[(r0 + a) * n + c0 + b] === v) ok = false
      if (!ok) continue
      g[i] = v; if (fill(i + 1)) return true; g[i] = 0
    }
    return false
  }
  fill(0); return g
}
function makePuzzle(n: number, level: string) {
  const sol = fullGrid(n)
  const g = sol.slice()
  const target = n === 4 ? (level === 'easy' ? 6 : 9) : n === 6 ? (level === 'easy' ? 14 : 20) : (level === 'easy' ? 36 : 46)
  let removed = 0
  for (const i of shuffle(Array.from({ length: n * n }, (_, k) => k))) {
    if (removed >= target) break
    const v = g[i]; g[i] = 0
    if (solveCount(g.slice(), n, 2) !== 1) g[i] = v; else removed++
  }
  return { g, sol }
}
export function sudoku(title: string, n: number, count: number, level: string) {
  const ps = Array.from({ length: count }, () => makePuzzle(n, level))
  const [br, bc] = boxDims(n)
  const perPage = n === 9 ? 2 : n === 6 ? 4 : 6
  const cell = n === 9 ? 10 : n === 6 ? 11 : 13
  const grid = (g: number[], sol: number[] | null) => `<table class="sd" style="--cell:${cell}mm">${Array.from({ length: n }, (_, r) => `<tr>${Array.from({ length: n }, (_, c) => {
    const v = g[r * n + c], cls = [(c + 1) % bc === 0 && c < n - 1 ? 'br' : '', (r + 1) % br === 0 && r < n - 1 ? 'bb' : ''].join(' ')
    return `<td class="${cls}">${v ? `<b>${v}</b>` : sol ? `<i>${sol[r * n + c]}</i>` : ''}</td>`
  }).join('')}</tr>`).join('')}</table>`
  const pages: string[] = [], keys: string[] = []
  for (let p = 0; p < ps.length; p += perPage) {
    const chunk = ps.slice(p, p + perPage)
    pages.push(page(title, `<div class="sdwrap n${n}">${chunk.map((x, k) => `<div><p class="pnum">${p + k + 1}</p>${grid(x.g, null)}</div>`).join('')}</div>`,
      { sub: L(`たて・よこ・太わくの中に、1〜${n}の数字が1回ずつ入ります。`, `Each row, column and bold box has the numbers 1 to ${n} once.`) }))
    keys.push(page(title, `<div class="sdwrap n${n}">${chunk.map((x, k) => `<div><p class="pnum">${p + k + 1}</p>${grid(x.g, x.sol)}</div>`).join('')}</div>`, { answer: true }))
  }
  return { pages: [...pages, ...keys], warn: '' }
}

/* ---------- Bingo ---------- */
export function bingo(title: string, items: string[], count: number, free: boolean) {
  const need = free ? 24 : 25
  const useNums = items.length === 0
  const pool = useNums ? Array.from({ length: 75 }, (_, i) => String(i + 1)) : items
  const cards: string[][] = []
  for (let k = 0; k < count; k++) {
    let cells: string[]
    if (useNums) { // classic B-I-N-G-O columns
      const cols = [0, 1, 2, 3, 4].map(c => shuffle(Array.from({ length: 15 }, (_, i) => String(c * 15 + i + 1))).slice(0, 5))
      cells = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) cells.push(cols[c][r])
    } else {
      const picks = shuffle(pool).slice(0, need)
      while (picks.length < need) picks.push(pool[rnd(pool.length)])
      cells = picks; if (free) cells.splice(12, 0, '')
    }
    if (free) cells[12] = 'FREE'
    cards.push(cells)
  }
  const card = (cells: string[], i: number) => `<div class="bcard"><div class="bhead">${'BINGO'.split('').map(x => `<span>${x}</span>`).join('')}</div><table class="bingo">${[0, 1, 2, 3, 4].map(r => `<tr>${[0, 1, 2, 3, 4].map(c => {
    const v = cells[r * 5 + c]; return `<td class="${v === 'FREE' ? 'free' : ''}">${v === 'FREE' ? '★<br>FREE' : esc(v)}</td>`
  }).join('')}</tr>`).join('')}</table><p class="cardno">#${i + 1}</p></div>`
  const pages: string[] = []
  for (let i = 0; i < cards.length; i += 2) pages.push(page(title, `<div class="bwrap">${cards.slice(i, i + 2).map((c, k) => card(c, i + k)).join('')}</div>`, { nameLine: false }))
  const caller = page(title, `<p>${L('読み上げ用リスト（切って箱に入れても使えます）', 'Caller list (cut out and put in a box)')}</p><div class="caller">${pool.map(x => `<span>${esc(x)}</span>`).join('')}</div>`, { answer: true, nameLine: false })
  return { pages: [...pages, caller], warn: !useNums && pool.length < need ? L(`ことばが${need}こ未満なので、同じことばがくり返し出ます。`, `Fewer than ${need} words, so some repeat on a card.`) : '' }
}

/* ---------- Handwriting tracing ---------- */
export function tracing(title: string, text: string[], repeats: number, size: number, font: string) {
  const rowH = size * 1.6
  const rows: string[] = []
  for (const t of text) {
    for (let k = 0; k < repeats; k++) rows.push(`<svg class="trace" viewBox="0 0 180 ${rowH}" width="180mm" height="${rowH}mm">
      <line x1="0" y1="${rowH * 0.15}" x2="180" y2="${rowH * 0.15}" class="g1"/><line x1="0" y1="${rowH * 0.45}" x2="180" y2="${rowH * 0.45}" class="g2"/><line x1="0" y1="${rowH * 0.75}" x2="180" y2="${rowH * 0.75}" class="g1"/>
      <text x="2" y="${rowH * 0.75}" font-size="${size}" style="font-family:${font}" class="${k === 0 ? 'solid' : 'dash'}">${esc(t)}</text></svg>`)
    rows.push(`<svg class="trace" viewBox="0 0 180 ${rowH}" width="180mm" height="${rowH}mm"><line x1="0" y1="${rowH * 0.15}" x2="180" y2="${rowH * 0.15}" class="g1"/><line x1="0" y1="${rowH * 0.45}" x2="180" y2="${rowH * 0.45}" class="g2"/><line x1="0" y1="${rowH * 0.75}" x2="180" y2="${rowH * 0.75}" class="g1"/></svg>`)
  }
  const perPage = Math.max(1, Math.floor(240 / (rowH + 2)))
  const pages: string[] = []
  for (let i = 0; i < rows.length; i += perPage) pages.push(page(title, rows.slice(i, i + perPage).join(''), { sub: i ? '' : L('うすい字をなぞってから、下の線に書いてみましょう。', 'Trace the light letters, then try on your own.') }))
  return { pages, warn: '' }
}
