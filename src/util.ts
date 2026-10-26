export type Lang = 'ja' | 'en'
export let lang: Lang = (localStorage.getItem('cp-lang') as Lang) || (navigator.language.startsWith('ja') ? 'ja' : 'en')
export function setLang(l: Lang) { lang = l; localStorage.setItem('cp-lang', l) }
export const L = (ja: string, en: string) => (lang === 'ja' ? ja : en)
export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export const rnd = (n: number) => Math.floor(Math.random() * n)
export function shuffle<T>(a: T[]): T[] { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]] } return a }
export const lines = (s: string) => s.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
/** Split "left - right" / "left : right" / "left = right" / tab */
export function pair(s: string): [string, string] {
  const m = s.match(/^(.+?)\s*(?:\t|\s[-–—]\s|[=:：,、])\s*(.+)$/)
  return m ? [m[1].trim(), m[2].trim()] : [s.trim(), '']
}
/** Normalize a word for grids: uppercase latin, drop spaces/punctuation, katakana→hiragana kept as-is */
export function gridWord(w: string): string[] {
  return Array.from(w.normalize('NFKC').toUpperCase().replace(/[\s\-'’.,!?・ー]/g, m => (m === 'ー' ? 'ー' : '')))
}
export const isJa = (s: string) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(s)
const HIRA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'
const KATA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
export function filler(sample: string[]): () => string {
  const s = sample.join('')
  if (/[\u30a0-\u30ff]/.test(s)) return () => KATA[rnd(KATA.length)]
  if (/[\u3040-\u309f]/.test(s)) return () => HIRA[rnd(HIRA.length)]
  return () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[rnd(26)]
}
/** One A4 page. `body` is HTML. */
export function page(title: string, body: string, opts: { answer?: boolean; nameLine?: boolean; sub?: string } = {}) {
  const head = opts.nameLine === false ? '' : `<div class="nameline"><span>${L('名前', 'Name')}: ________________________</span><span>${L('日付', 'Date')}: ____________</span></div>`
  return `<section class="page${opts.answer ? ' answer' : ''}">${opts.answer ? '' : head}
  <h2 class="ptitle">${esc(title)}${opts.answer ? ` <span class="akey">${L('（答え）', '(Answer key)')}</span>` : ''}</h2>
  ${opts.sub ? `<p class="psub">${esc(opts.sub)}</p>` : ''}<div class="pbody">${body}</div></section>`
}
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file) })
}
