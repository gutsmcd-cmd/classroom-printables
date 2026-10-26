import { L, esc, rnd, shuffle, gridWord, filler, page } from './util'

type Cell = string | null
const DIRS_EASY = [[0, 1], [1, 0]]
const DIRS_MED = [[0, 1], [1, 0], [1, 1], [-1, 1]]
const DIRS_HARD = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]]

export function wordSearch(title: string, words: string[], size: number, level: string) {
  const dirs = level === 'easy' ? DIRS_EASY : level === 'hard' ? DIRS_HARD : DIRS_MED
  const items = words.map(w => ({ label: w, ch: gridWord(w) })).filter(w => w.ch.length > 1 && w.ch.length <= size)
    .sort((a, b) => b.ch.length - a.ch.length)
  let best: { grid: Cell[][]; placed: { label: string; cells: [number, number][] }[] } | null = null
  for (let attempt = 0; attempt < 30; attempt++) {
    const grid: Cell[][] = Array.from({ length: size }, () => Array(size).fill(null))
    const placed: { label: string; cells: [number, number][] }[] = []
    for (const w of items) {
      let ok = false
      for (let t = 0; t < 300 && !ok; t++) {
        const [dr, dc] = dirs[rnd(dirs.length)], r0 = rnd(size), c0 = rnd(size)
        const cells: [number, number][] = []
        for (let i = 0; i < w.ch.length; i++) {
          const r = r0 + dr * i, c = c0 + dc * i
          if (r < 0 || c < 0 || r >= size || c >= size || (grid[r][c] !== null && grid[r][c] !== w.ch[i])) { cells.length = 0; break }
          cells.push([r, c])
        }
        if (cells.length === w.ch.length) { cells.forEach(([r, c], i) => (grid[r][c] = w.ch[i])); placed.push({ label: w.label, cells }); ok = true }
      }
    }
    if (!best || placed.length > best.placed.length) best = { grid, placed }
    if (placed.length === items.length) break
  }
  const { grid, placed } = best!
  const fill = filler(items.flatMap(i => i.ch))
  const full = grid.map(row => row.map(c => c ?? fill()))
  const ans = new Set(placed.flatMap(p => p.cells.map(([r, c]) => r + ',' + c)))
  const cellMm = Math.min(170 / size, 12)
  const table = (key: boolean) => `<table class="ws" style="--cell:${cellMm}mm">${full.map((row, r) => `<tr>${row.map((ch, c) =>
    `<td class="${key && ans.has(r + ',' + c) ? 'hit' : ''}">${esc(ch)}</td>`).join('')}</tr>`).join('')}</table>`
  const list = `<ul class="wlist">${placed.map(p => `<li>${esc(p.label)}</li>`).join('')}</ul>`
  const missing = items.filter(i => !placed.some(p => p.label === i.label)).map(i => i.label)
  return {
    pages: [page(title, table(false) + `<h3>${L('さがすことば', 'Find these words')}</h3>` + list, { sub: L('ことばを見つけて、○でかこみましょう。', 'Find each word and circle it.') }),
      page(title, table(true) + list, { answer: true })],
    warn: missing.length ? L('入りきらなかったことば: ', 'Did not fit: ') + missing.join(', ') : '',
  }
}

/* ---------- Crossword ---------- */
type Placed = { word: string[]; clue: string; label: string; r: number; c: number; down: boolean; num?: number }
export function crossword(title: string, entries: [string, string][]) {
  const items = entries.map(([w, clue]) => ({ word: gridWord(w), clue, label: w })).filter(i => i.word.length > 1)
  let best: Placed[] = []
  for (let attempt = 0; attempt < 80; attempt++) {
    const order = attempt >= 40 ? shuffle(items.slice()) : attempt === 0 ? items.slice().sort((a, b) => b.word.length - a.word.length) : [items.slice().sort((a, b) => b.word.length - a.word.length)[0], ...shuffle(items.slice().sort((a, b) => b.word.length - a.word.length).slice(1))]
    const cells = new Map<string, string>()
    const placed: Placed[] = []
    const get = (r: number, c: number) => cells.get(r + ',' + c)
    const canPlace = (w: string[], r: number, c: number, down: boolean) => {
      let crosses = 0
      const dr = down ? 1 : 0, dc = down ? 0 : 1
      if (get(r - dr, c - dc) || get(r + dr * w.length, c + dc * w.length)) return -1
      for (let i = 0; i < w.length; i++) {
        const rr = r + dr * i, cc = c + dc * i, ex = get(rr, cc)
        if (ex) { if (ex !== w[i]) return -1; crosses++ }
        else if (get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1
      }
      return crosses
    }
    const put = (it: typeof items[0], r: number, c: number, down: boolean) => {
      it.word.forEach((ch, i) => cells.set((r + (down ? i : 0)) + ',' + (c + (down ? 0 : i)), ch))
      placed.push({ ...it, r, c, down })
    }
    put(order[0], 0, 0, false)
    let remaining = order.slice(1)
    for (let pass = 0; pass < 3; pass++) {
      const left: typeof items = []
      for (const it of remaining) {
        let cand: [number, number, boolean, number][] = []
        for (const p of placed) p.word.forEach((pch, pi) => it.word.forEach((ch, wi) => {
          if (ch !== pch) return
          const down = !p.down
          const r = p.down ? p.r + pi : p.r - wi, c = p.down ? p.c - wi : p.c + pi
          const x = canPlace(it.word, r, c, down)
          if (x > 0) cand.push([r, c, down, x])
        }))
        if (cand.length) { cand = shuffle(cand).sort((a, b) => b[3] - a[3]); put(it, cand[0][0], cand[0][1], cand[0][2]) } else left.push(it)
      }
      remaining = left
    }
    const score = (ps: Placed[]) => { const rs = ps.flatMap(p => [p.r, p.down ? p.r + p.word.length : p.r]); const cs = ps.flatMap(p => [p.c, p.down ? p.c : p.c + p.word.length]); return ps.length * 1000 - (Math.max(...rs) - Math.min(...rs)) * (Math.max(...cs) - Math.min(...cs)) }
    if (!best.length || score(placed) > score(best)) best = placed
  }
  const minR = Math.min(...best.map(p => p.r)), minC = Math.min(...best.map(p => p.c))
  best.forEach(p => { p.r -= minR; p.c -= minC })
  const H = Math.max(...best.map(p => p.r + (p.down ? p.word.length : 1))), W = Math.max(...best.map(p => p.c + (p.down ? 1 : p.word.length)))
  const grid: (string | null)[][] = Array.from({ length: H }, () => Array(W).fill(null))
  best.forEach(p => p.word.forEach((ch, i) => (grid[p.r + (p.down ? i : 0)][p.c + (p.down ? 0 : i)] = ch)))
  const nums = new Map<string, number>(); let n = 0
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (best.some(p => p.r === r && p.c === c)) nums.set(r + ',' + c, ++n)
  best.forEach(p => (p.num = nums.get(p.r + ',' + p.c)))
  const cell = Math.min(180 / W, 150 / H, 11)
  const tbl = (key: boolean) => `<table class="cw" style="--cell:${cell}mm">${grid.map((row, r) => `<tr>${row.map((ch, c) => ch === null ? '<td class="blk"></td>' :
    `<td>${nums.has(r + ',' + c) ? `<sup>${nums.get(r + ',' + c)}</sup>` : ''}${key ? esc(ch) : ''}</td>`).join('')}</tr>`).join('')}</table>`
  const clues = (down: boolean) => best.filter(p => p.down === down).sort((a, b) => a.num! - b.num!).map(p => `<li value="${p.num}">${esc(p.clue || '…')} <small>(${p.word.length})</small></li>`).join('')
  const clueHtml = `<div class="clues"><div><h3>${L('よこのカギ', 'Across')}</h3><ol>${clues(false)}</ol></div><div><h3>${L('たてのカギ', 'Down')}</h3><ol>${clues(true)}</ol></div></div>`
  const missing = items.filter(i => !best.some(p => p.label === i.label)).map(i => i.label)
  return {
    pages: [page(title, tbl(false) + clueHtml), page(title, tbl(true) + clueHtml, { answer: true })],
    warn: missing.length ? L('交差できず入らなかったことば: ', 'Could not cross with the others, left out: ') + missing.join(', ') : '',
  }
}

/* ---------- Word scramble ---------- */
export function scramble(title: string, words: string[]) {
  const rows = words.map(w => {
    const ch = Array.from(w.replace(/\s+/g, ''))
    let s = ch
    for (let i = 0; i < 20 && s.join('') === ch.join('') && new Set(ch).size > 1; i++) s = shuffle(ch)
    return { w, s: s.join(' ') }
  })
  const body = (key: boolean) => `<ol class="scr">${rows.map(r => `<li><span class="sc">${esc(r.s)}</span><span class="blank">${key ? esc(r.w) : ''}</span></li>`).join('')}</ol>`
  return { pages: [page(title, body(false), { sub: L('文字をならべかえて、正しいことばにしましょう。', 'Unscramble the letters to make a word.') }), page(title, body(true), { answer: true })], warn: '' }
}

/* ---------- Matching ---------- */
export function matching(title: string, pairs: [string, string][]) {
  const right = shuffle(pairs.map((p, i) => ({ t: p[1], i })))
  const n = pairs.length
  const rowH = Math.min(22, 230 / n)
  const W = 180, H = rowH * n
  const y = (k: number) => rowH * k + rowH / 2
  const svg = (key: boolean) => `<svg class="match" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-size="${Math.min(6, rowH * 0.4)}">
  ${pairs.map((p, k) => `<text x="62" y="${y(k)}" text-anchor="end" dominant-baseline="middle">${esc(p[0])}</text><circle cx="68" cy="${y(k)}" r="1.6"/>`).join('')}
  ${right.map((p, k) => `<circle cx="112" cy="${y(k)}" r="1.6"/><text x="118" y="${y(k)}" dominant-baseline="middle">${esc(p.t)}</text>`).join('')}
  ${key ? right.map((p, k) => `<line x1="68" y1="${y(p.i)}" x2="112" y2="${y(k)}" stroke="#c0392b" stroke-width=".7"/>`).join('') : ''}</svg>`
  return { pages: [page(title, svg(false), { sub: L('合うものを線でむすびましょう。', 'Draw a line to join each pair.') }), page(title, svg(true), { answer: true })], warn: pairs.some(p => !p[1]) ? L('「左 - 右」の形で書いてください。', 'Write each line as "left - right".') : '' }
}
