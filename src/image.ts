import { L, rnd, page } from './util'

function toCanvas(img: HTMLImageElement, max: number) {
  const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s)
  const g = cv.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height)
  return cv
}
function gray(cv: HTMLCanvasElement) {
  const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data
  const g = new Float32Array(cv.width * cv.height)
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
  return g
}
function boxBlur(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length)
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) { tmp[y * w + x] = s / (2 * r + 1); s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)] } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) { out[y * w + x] = s / (2 * r + 1); s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x] } }
  return out
}

/** Photo → colouring sheet (Sobel edges, thresholded, black lines on white). detail 1..10 */
export function coloringDataUrl(img: HTMLImageElement, detail: number, thick: boolean) {
  const cv = toCanvas(img, 1400), w = cv.width, h = cv.height
  let g = gray(cv)
  const blurR = Math.max(1, Math.round(Math.max(w, h) / 500 * (11 - detail) / 3))
  g = boxBlur(boxBlur(g, w, h, blurR), w, h, blurR)
  const mag = new Float32Array(w * h)
  let max = 0
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const gx = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1]
    const gy = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1]
    mag[i] = Math.hypot(gx, gy); if (mag[i] > max) max = mag[i]
  }
  // threshold at a percentile so results are consistent across photos
  const sorted = Array.from(mag.filter((_, i) => i % 7 === 0)).sort((a, b) => a - b)
  const pct = 0.93 - detail * 0.012
  const t = sorted[Math.floor(sorted.length * pct)] || max * 0.2
  let edge = new Uint8Array(w * h)
  for (let i = 0; i < mag.length; i++) edge[i] = mag[i] > t ? 1 : 0
  if (thick) { const e2 = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; e2[i] = edge[i] | edge[i - 1] | edge[i + 1] | edge[i - w] | edge[i + w] } edge = e2 }
  // remove tiny specks (isolated pixels)
  const ctx = cv.getContext('2d')!, out = ctx.createImageData(w, h)
  for (let i = 0; i < edge.length; i++) {
    let on = edge[i]
    if (on) { const y = Math.floor(i / w), x = i % w; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (edge[(y + dy) * w + x + dx]) n++; if (n < 3) on = 0 }
    const v = on ? 0 : 255; out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v; out.data[i * 4 + 3] = 255
  }
  ctx.putImageData(out, 0, 0)
  return cv.toDataURL('image/png')
}
export function coloring(title: string, img: HTMLImageElement, detail: number, thick: boolean) {
  const url = coloringDataUrl(img, detail, thick)
  return { pages: [page(title, `<img class="fit" src="${url}" alt="">`, { sub: L('すきな色でぬりましょう。', 'Colour it in!') })], warn: '' }
}

/* ---------- Jigsaw ---------- */
const KNOB: [number, number][][] = [[[.38, 0]], [[.44, 0], [.40, .08], [.38, .14]], [[.34, .24], [.42, .30], [.50, .30]], [[.58, .30], [.66, .24], [.62, .14]], [[.60, .08], [.56, 0], [.62, 0]], [[1, 0]]]
function edge(ax: number, ay: number, bx: number, by: number, s: number) {
  if (!s) return `L${bx} ${by}`
  const ux = bx - ax, uy = by - ay, len = Math.hypot(ux, uy), nx = (uy / len) * s, ny = (-ux / len) * s
  const P = ([t, h]: [number, number]) => `${(ax + ux * t + nx * h * len).toFixed(2)} ${(ay + uy * t + ny * h * len).toFixed(2)}`
  return KNOB.map(seg => (seg.length === 1 ? 'L' : 'C') + seg.map(P).join(' ')).join('')
}
export type Jig = { rows: number; cols: number; w: number; h: number; H: number[][]; V: number[][] }
export function makeJig(rows: number, cols: number, w: number, h: number): Jig {
  const sgn = () => (rnd(2) ? 1 : -1)
  return { rows, cols, w, h, H: Array.from({ length: rows - 1 }, () => Array.from({ length: cols }, sgn)), V: Array.from({ length: rows }, () => Array.from({ length: cols - 1 }, sgn)) }
}
export function piecePath(j: Jig, r: number, c: number, ox = 0, oy = 0) {
  const pw = j.w / j.cols, ph = j.h / j.rows, x = c * pw + ox, y = r * ph + oy
  const top = r === 0 ? 0 : -j.H[r - 1][c], bottom = r === j.rows - 1 ? 0 : j.H[r][c]
  const left = c === 0 ? 0 : -j.V[r][c - 1], right = c === j.cols - 1 ? 0 : j.V[r][c]
  return `M${x} ${y}` + edge(x, y, x + pw, y, top) + edge(x + pw, y, x + pw, y + ph, right) + edge(x + pw, y + ph, x, y + ph, bottom) + edge(x, y + ph, x, y, left) + 'Z'
}
export function jigsawPrint(title: string, img: HTMLImageElement, rows: number, cols: number) {
  const cv = toCanvas(img, 1800), url = cv.toDataURL('image/jpeg', 0.9)
  const ar = cv.width / cv.height
  let W = 186, Hh = W / ar; if (Hh > 240) { Hh = 240; W = Hh * ar }
  const j = makeJig(rows, cols, W, Hh)
  let paths = ''
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) paths += piecePath(j, r, c)
  const svg = `<svg class="jig" viewBox="0 0 ${W} ${Hh}" width="${W}mm" height="${Hh}mm"><image href="${url}" width="${W}" height="${Hh}" preserveAspectRatio="none"/><path d="${paths}" fill="none" stroke="#000" stroke-width=".35"/></svg>`
  const ref = `<img class="ref" src="${url}" alt="">`
  return { pages: [page(title, svg, { nameLine: false, sub: L('線にそってハサミで切りましょう。厚紙に貼ると丈夫になります。', 'Cut along the lines. Glue onto card first to make it sturdy.') }), page(title, ref, { answer: true, nameLine: false })], warn: '' }
}

/** On-screen jigsaw game in a full-screen overlay */
export function jigsawPlay(img: HTMLImageElement, rows: number, cols: number) {
  const ov = document.createElement('div'); ov.className = 'play'
  ov.innerHTML = `<div class="playbar"><span id="pmsg">${L('ピースをドラッグして、正しい場所へ。', 'Drag the pieces into place.')}</span><button id="pclose">✕ ${L('とじる', 'Close')}</button></div><canvas id="pcv"></canvas>`
  document.body.appendChild(ov)
  const cv = ov.querySelector('#pcv') as HTMLCanvasElement, g = cv.getContext('2d')!
  const vw = window.innerWidth, vh = window.innerHeight - 56
  cv.width = vw * devicePixelRatio; cv.height = vh * devicePixelRatio; cv.style.width = vw + 'px'; cv.style.height = vh + 'px'
  g.scale(devicePixelRatio, devicePixelRatio)
  const ar = img.naturalWidth / img.naturalHeight
  let BW = Math.min(vw * 0.62, vw - 20), BH = BW / ar; if (BH > vh * 0.62) { BH = vh * 0.62; BW = BH * ar }
  const bx = (vw - BW) / 2, by = 12
  const j = makeJig(rows, cols, BW, BH)
  const pw = BW / cols, ph = BH / rows
  type P = { r: number; c: number; x: number; y: number; done: boolean; path: Path2D }
  const pieces: P[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const path = new Path2D(piecePath(j, r, c, -c * pw, -r * ph))
    pieces.push({ r, c, x: 10 + Math.random() * (vw - pw - 20), y: Math.min(vh - ph - 10, by + BH + 20 + Math.random() * Math.max(10, vh - BH - ph - 40)), done: false, path })
  }
  const draw = () => {
    g.clearRect(0, 0, vw, vh)
    g.fillStyle = '#efe6d6'; g.fillRect(bx, by, BW, BH); g.globalAlpha = 0.18; g.drawImage(img, bx, by, BW, BH); g.globalAlpha = 1
    for (const p of [...pieces.filter(p => p.done), ...pieces.filter(p => !p.done)]) {
      g.save(); g.translate(p.x - p.c * pw, p.y - p.r * ph)
      const path = new Path2D(piecePath(j, p.r, p.c))
      g.clip(path); g.drawImage(img, 0, 0, BW, BH); g.restore()
      g.save(); g.translate(p.x - p.c * pw, p.y - p.r * ph); g.strokeStyle = p.done ? 'rgba(0,0,0,.15)' : '#333'; g.lineWidth = 1; g.stroke(new Path2D(piecePath(j, p.r, p.c))); g.restore()
    }
  }
  let drag: P | null = null, dx = 0, dy = 0
  cv.onpointerdown = e => {
    const x = e.offsetX, y = e.offsetY
    for (let i = pieces.length - 1; i >= 0; i--) { const p = pieces[i]; if (p.done) continue
      if (g.isPointInPath(p.path, (x - p.x) * devicePixelRatio, (y - p.y) * devicePixelRatio) || (x > p.x && y > p.y && x < p.x + pw && y < p.y + ph)) {
        drag = p; dx = x - p.x; dy = y - p.y; pieces.splice(i, 1); pieces.push(p); cv.setPointerCapture(e.pointerId); break } }
  }
  cv.onpointermove = e => { if (!drag) return; drag.x = e.offsetX - dx; drag.y = e.offsetY - dy; draw() }
  cv.onpointerup = () => {
    if (!drag) return
    const tx = bx + drag.c * pw, ty = by + drag.r * ph
    if (Math.hypot(drag.x - tx, drag.y - ty) < Math.max(14, pw * 0.25)) { drag.x = tx; drag.y = ty; drag.done = true }
    drag = null; draw()
    if (pieces.every(p => p.done)) (ov.querySelector('#pmsg') as HTMLElement).textContent = L('🎉 できあがり！', '🎉 Finished!')
  }
  ;(ov.querySelector('#pclose') as HTMLElement).onclick = () => ov.remove()
  draw()
}

/* ---------- Dot to dot ---------- */
function shapePoints(shape: string, n: number): [number, number][] {
  const pts: [number, number][] = []
  const poly = (vs: [number, number][]) => { // resample polygon evenly
    const segs = vs.map((v, i) => [v, vs[(i + 1) % vs.length]] as const)
    const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])), total = lens.reduce((a, b) => a + b, 0)
    for (let k = 0; k < n; k++) { let d = (k / n) * total, i = 0; while (d > lens[i]) d -= lens[i++]; const [a, b] = segs[i]; const t = d / lens[i]; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]) }
  }
  const curve = (f: (t: number) => [number, number], m = 600) => poly(Array.from({ length: m }, (_, i) => f((i / m) * Math.PI * 2)))
  if (shape === 'star') poly(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.4 : 1; return [Math.cos(a) * r, Math.sin(a) * r] }))
  else if (shape === 'heart') curve(t => [16 * Math.sin(t) ** 3 / 16, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16])
  else if (shape === 'house') poly([[-0.8, 1], [-0.8, -0.1], [-1, -0.1], [0, -1], [1, -0.1], [0.8, -0.1], [0.8, 1], [0.2, 1], [0.2, 0.4], [-0.2, 0.4], [-0.2, 1]])
  else if (shape === 'fish') curve(t => { const x = Math.cos(t), y = Math.sin(t) * 0.55; return x > 0.55 && Math.abs(y) < 0.5 ? [x + (x - 0.55) * 0.9, y * (1 + (x - 0.55) * 3)] : [x, y] })
  else if (shape === 'flower') curve(t => { const r = 0.55 + 0.45 * Math.abs(Math.cos(2.5 * t)); return [Math.cos(t - Math.PI / 2) * r, Math.sin(t - Math.PI / 2) * r] })
  else curve(t => [Math.cos(t - Math.PI / 2), Math.sin(t - Math.PI / 2)])
  return pts
}
function photoPoints(img: HTMLImageElement, n: number): [number, number][] {
  const cv = toCanvas(img, 400), w = cv.width, h = cv.height
  const g = boxBlur(gray(cv), w, h, 2)
  // Otsu threshold, then pick the side that does not touch the border as "object"
  const hist = new Array(256).fill(0); g.forEach(v => hist[Math.min(255, v | 0)]++)
  let sum = 0; hist.forEach((c, i) => (sum += c * i))
  let sB = 0, wB = 0, best = 0, th = 128
  for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = g.length - wB; if (!wF) break; sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = i } }
  let border = 0, bn = 0
  for (let x = 0; x < w; x++) { border += g[x] < th ? 1 : 0; border += g[(h - 1) * w + x] < th ? 1 : 0; bn += 2 }
  const darkObj = border / bn < 0.5
  const m = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && ((g[y * w + x] < th) === darkObj)
  let cx = 0, cy = 0, cnt = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m(x, y)) { cx += x; cy += y; cnt++ }
  if (!cnt) return shapePoints('circle', n)
  cx /= cnt; cy /= cnt
  const pts: [number, number][] = []
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k / n) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a)
    let far = 0
    for (let r = 0; r < Math.hypot(w, h); r += 1) if (m(Math.round(cx + dx * r), Math.round(cy + dy * r))) far = r
    pts.push([dx * far, dy * far])
  }
  return pts
}
export function dots(title: string, shape: string, n: number, img: HTMLImageElement | null) {
  let pts = img && shape === 'photo' ? photoPoints(img, n) : shapePoints(shape, n)
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const S = Math.min(165 / (maxX - minX || 1), 210 / (maxY - minY || 1))
  pts = pts.map(([x, y]) => [(x - minX) * S + 10, (y - minY) * S + 10])
  const W = (maxX - minX) * S + 20, H = (maxY - minY) * S + 20
  const fs = n > 50 ? 3.2 : 4
  const svg = (key: boolean) => `<svg class="dots" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">
   ${key ? `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#c0392b" stroke-width=".6"/>` : ''}
   ${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 0 ? 1.4 : 0.9}"/><text x="${x + 1.6}" y="${y - 1.4}" font-size="${fs}">${i + 1}</text>`).join('')}</svg>`
  return { pages: [page(title, svg(false), { sub: L('1から順番に点をつなぎましょう。最後は1にもどります。', 'Join the dots in order from 1. Finish back at 1.') }), page(title, svg(true), { answer: true })], warn: '' }
}
