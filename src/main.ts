import './style.css'
import { L, lang, setLang, lines, pair, loadImage, esc } from './util'
import { wordSearch, crossword, scramble, matching } from './words'
import { maze, sudoku, bingo, tracing } from './puzzles'
import { coloring, jigsawPrint, jigsawPlay, dots } from './image'

type Out = { pages: string[]; warn: string }
type Tab = { id: string; ja: string; en: string; icon: string; form: () => string; make: () => Promise<Out> | Out }
const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T
const v = (id: string) => ($(id) as HTMLInputElement).value
const num = (id: string) => Number(v(id))
const store = (id: string, d: string) => localStorage.getItem('cp-' + id) ?? d

const SAMPLE_WORDS = () => L('りんご\nみかん\nぶどう\nいちご\nもも\nばなな\nめろん\nすいか', 'apple\norange\ngrape\nlemon\npeach\nbanana\nmelon\ncherry')
const SAMPLE_CW = () => L('ごりら - 力もちの大きなさる\nらいおん - どうぶつの王さま\nきりん - 首が長い動物\nからす - カーカーなく黒い鳥\nかめ - こうらがある動物\nめだか - 小川にいる小さな魚\nいるか - 海にすむかしこい動物',
  'cat - Says meow\ndog - Says woof\nrabbit - Has long ears\nhorse - You can ride it\ncow - Gives us milk\nsheep - Gives us wool\nmouse - Small, loves cheese')
const SAMPLE_PAIRS = () => L('犬 - dog\n猫 - cat\n鳥 - bird\n魚 - fish\n馬 - horse', 'dog - puppy\ncat - kitten\ncow - calf\nsheep - lamb\nhorse - foal')

const ta = (id: string, val: string, rows = 8) => `<textarea id="${id}" rows="${rows}">${esc(store(id, val))}</textarea>`
const titleIn = (d: string) => `<label class="full">${L('タイトル', 'Title')} <input id="title" value="${esc(d)}"></label>`
const sel = (id: string, opts: [string, string][], d: string) => `<select id="${id}">${opts.map(([val, t]) => `<option value="${val}"${val === d ? ' selected' : ''}>${t}</option>`).join('')}</select>`
const photoIn = () => `<label class="full">${L('写真をえらぶ', 'Choose a photo')} <input type="file" id="photo" accept="image/*"></label>`
let photo: HTMLImageElement | null = null
async function needPhoto() {
  const f = ($('photo') as HTMLInputElement).files?.[0]
  if (f) photo = await loadImage(f)
  if (!photo) throw new Error(L('先に写真をえらんでください。', 'Choose a photo first.'))
  return photo
}

const TABS: Tab[] = [
  { id: 'ws', icon: '🔎', ja: 'ことばさがし', en: 'Word search',
    form: () => titleIn(L('ことばさがし', 'Word search')) + `<label class="full">${L('ことば（1行に1つ）', 'Words (one per line)')} ${ta('ws-words', SAMPLE_WORDS())}</label>
      <label>${L('大きさ', 'Size')} ${sel('ws-size', [['8', '8×8'], ['10', '10×10'], ['12', '12×12'], ['15', '15×15'], ['18', '18×18']], '12')}</label>
      <label>${L('むずかしさ', 'Difficulty')} ${sel('ws-level', [['easy', L('かんたん（→↓）', 'Easy (→ ↓)')], ['med', L('ふつう（ななめも）', 'Medium (+ diagonal)')], ['hard', L('むずかしい（逆向きも）', 'Hard (+ backwards)')]], 'med')}</label>`,
    make: () => wordSearch(v('title'), lines(v('ws-words')), num('ws-size'), v('ws-level')) },
  { id: 'cw', icon: '✏️', ja: 'クロスワード', en: 'Crossword',
    form: () => titleIn(L('クロスワード', 'Crossword')) + `<label class="full">${L('「ことば - ヒント」を1行に1つ', 'One "word - clue" per line')} ${ta('cw-words', SAMPLE_CW())}</label>`,
    make: () => crossword(v('title'), lines(v('cw-words')).map(pair)) },
  { id: 'color', icon: '🖍️', ja: 'ぬりえ', en: 'Colouring sheet',
    form: () => titleIn(L('ぬりえ', 'Colouring sheet')) + photoIn() + `<label>${L('線の多さ', 'Line detail')} <input type="range" id="c-detail" min="1" max="10" value="5"></label><label><input type="checkbox" id="c-thick" checked> ${L('太い線', 'Thick lines')}</label>`,
    make: async () => coloring(v('title'), await needPhoto(), num('c-detail'), ($('c-thick') as HTMLInputElement).checked) },
  { id: 'jig', icon: '🧩', ja: 'ジグソーパズル', en: 'Photo jigsaw',
    form: () => titleIn(L('ジグソーパズル', 'Jigsaw puzzle')) + photoIn() + `<label>${L('ピースの数', 'Pieces')} ${sel('j-size', [['2x3', '6'], ['3x4', '12'], ['4x5', '20'], ['5x6', '30'], ['6x8', '48']], '3x4')}</label>
      <button type="button" id="j-play">▶ ${L('画面であそぶ', 'Play on screen')}</button>`,
    make: async () => { const [r, c] = v('j-size').split('x').map(Number); return jigsawPrint(v('title'), await needPhoto(), r, c) } },
  { id: 'maze', icon: '🌀', ja: 'めいろ', en: 'Maze',
    form: () => titleIn(L('めいろ', 'Maze')) + `<label>${L('むずかしさ', 'Difficulty')} ${sel('m-size', [['8', L('とてもかんたん', 'Very easy')], ['12', L('かんたん', 'Easy')], ['18', L('ふつう', 'Medium')], ['25', L('むずかしい', 'Hard')], ['35', L('とてもむずかしい', 'Very hard')]], '12')}</label>
      <label>${L('形', 'Shape')} ${sel('m-shape', [['rect', L('四角', 'Square')], ['circle', L('まる', 'Round')]], 'rect')}</label>`,
    make: () => { const n = num('m-size'); return maze(v('title'), n, Math.round(n * 1.25), v('m-shape')) } },
  { id: 'bingo', icon: '🎱', ja: 'ビンゴカード', en: 'Bingo cards',
    form: () => titleIn(L('ビンゴ', 'Bingo')) + `<label class="full">${L('ことば（1行に1つ・24こ以上がおすすめ）。空にすると数字1〜75', 'Words (one per line, 24+ is best). Leave empty for numbers 1 to 75')} ${ta('b-words', '', 6)}</label>
      <label>${L('枚数', 'How many cards')} <input type="number" id="b-count" min="1" max="60" value="${store('b-count', '30')}"></label><label><input type="checkbox" id="b-free" checked> ${L('まん中はFREE', 'Free centre square')}</label>`,
    make: () => bingo(v('title'), lines(v('b-words')), Math.max(1, Math.min(60, num('b-count') || 1)), ($('b-free') as HTMLInputElement).checked) },
  { id: 'scr', icon: '🔀', ja: 'ならべかえ', en: 'Word scramble',
    form: () => titleIn(L('ならべかえ', 'Word scramble')) + `<label class="full">${L('ことば（1行に1つ）', 'Words (one per line)')} ${ta('s-words', SAMPLE_WORDS())}</label>`,
    make: () => scramble(v('title'), lines(v('s-words'))) },
  { id: 'dots', icon: '⭐', ja: '点つなぎ', en: 'Dot to dot',
    form: () => titleIn(L('点つなぎ', 'Dot to dot')) + `<label>${L('形', 'Shape')} ${sel('d-shape', [['star', L('星', 'Star')], ['heart', L('ハート', 'Heart')], ['house', L('家', 'House')], ['fish', L('魚', 'Fish')], ['flower', L('花', 'Flower')], ['circle', L('まる', 'Circle')], ['photo', L('写真から（シンプルな形）', 'From a photo (simple shape)')]], 'star')}</label>
      <label>${L('点の数', 'Number of dots')} <input type="number" id="d-n" min="6" max="100" value="30"></label>` + photoIn(),
    make: async () => dots(v('title'), v('d-shape'), Math.max(6, Math.min(100, num('d-n'))), v('d-shape') === 'photo' ? await needPhoto() : null) },
  { id: 'trace', icon: '✍️', ja: 'なぞり書き', en: 'Handwriting',
    form: () => titleIn(L('なぞり書き', 'Handwriting practice')) + `<label class="full">${L('書く文字（1行ずつ）', 'Text to practise (one line each)')} ${ta('t-text', L('あいうえお\nかきくけこ\nありがとう', 'Aa Bb Cc Dd\nThe cat sat.\nThank you'), 5)}</label>
      <label>${L('文字の大きさ', 'Letter size')} ${sel('t-size', [['10', L('小', 'Small')], ['14', L('中', 'Medium')], ['20', L('大', 'Large')]], '14')}</label>
      <label>${L('なぞる回数', 'Tracing rows')} ${sel('t-rep', [['1', '1'], ['2', '2'], ['3', '3']], '2')}</label>
      <label>${L('書体', 'Style')} ${sel('t-font', [['"Andika","Comic Sans MS","Klee One","Hiragino Maru Gothic ProN","Noto Sans JP",sans-serif', L('まるい', 'Rounded')], ['"Klee One","UD Digi Kyokasho N-R","YuKyokasho","Hiragino Mincho ProN",serif', L('教科書体', 'School')], ['sans-serif', L('ゴシック', 'Plain')]], '"Andika","Comic Sans MS","Klee One","Hiragino Maru Gothic ProN","Noto Sans JP",sans-serif')}</label>`,
    make: () => tracing(v('title'), lines(v('t-text')), num('t-rep'), num('t-size'), v('t-font')) },
  { id: 'match', icon: '🔗', ja: '線むすび', en: 'Matching',
    form: () => titleIn(L('線むすび', 'Matching')) + `<label class="full">${L('「左 - 右」を1行に1つ', 'One "left - right" per line')} ${ta('mt-pairs', SAMPLE_PAIRS())}</label>`,
    make: () => matching(v('title'), lines(v('mt-pairs')).map(pair)) },
  { id: 'sudoku', icon: '🔢', ja: 'かんたん数独', en: 'Easy sudoku',
    form: () => titleIn(L('数独', 'Sudoku')) + `<label>${L('大きさ', 'Size')} ${sel('sd-n', [['4', '4×4'], ['6', '6×6'], ['9', '9×9']], '4')}</label>
      <label>${L('むずかしさ', 'Difficulty')} ${sel('sd-level', [['easy', L('かんたん', 'Easy')], ['med', L('ふつう', 'Medium')]], 'easy')}</label>
      <label>${L('問題の数', 'How many')} <input type="number" id="sd-count" min="1" max="24" value="6"></label>`,
    make: () => sudoku(v('title'), num('sd-n'), Math.max(1, Math.min(24, num('sd-count'))), v('sd-level')) },
]

let tab = localStorage.getItem('cp-tab') || 'ws'
let big = localStorage.getItem('cp-big') === '1'
let keys = true
const app = document.getElementById('app')!

function render() {
  const t = TABS.find(x => x.id === tab) || TABS[0]
  document.documentElement.lang = lang; document.documentElement.classList.toggle('big', big)
  document.title = L('教室プリント工房 / Classroom Printables', 'Classroom Printables / 教室プリント工房')
  app.innerHTML = `<div class="ui"><header><h1>🖨️ ${L('教室プリント工房', 'Classroom Printables')}</h1>
    <div class="top"><button id="lang">${lang === 'ja' ? 'English' : '日本語'}</button><button id="big" aria-pressed="${big}">${L('大きい文字', 'Large text')}</button></div></header>
    <p class="lede">${L('ことばさがし・クロスワード・めいろ・ビンゴなど、授業や家で使えるプリントをA4で作れます。ネット不要・無料。', 'Make word searches, crosswords, mazes, bingo cards and more, ready to print on A4. Free, and works offline.')}</p>
    <nav class="tabs" role="tablist">${TABS.map(x => `<button role="tab" data-tab="${x.id}" aria-selected="${x.id === t.id}">${x.icon} ${L(x.ja, x.en)}</button>`).join('')}</nav>
    <form id="form" class="form">${t.form()}
      <label class="full"><input type="checkbox" id="keys" ${keys ? 'checked' : ''}> ${L('答えのページも印刷する', 'Print the answer key too')}</label>
      <div class="actions"><button class="primary" type="submit">✨ ${L('作る', 'Make it')}</button><button type="button" id="print" class="primary alt">🖨️ ${L('印刷 / PDF', 'Print / PDF')}</button></div>
      <p id="warn" class="warn" role="status"></p></form>
    <p class="hint">${L('印刷画面で「PDFに保存」を選ぶと、PDFにもできます。用紙はA4・余白は「デフォルト」がおすすめ。', 'In the print screen, choose "Save as PDF" to get a PDF. Use A4 paper and default margins.')}</p></div>
    <div id="pages" class="${keys ? '' : 'nokeys'}"></div>`
  $('lang').onclick = () => { setLang(lang === 'ja' ? 'en' : 'ja'); render() }
  $('big').onclick = () => { big = !big; localStorage.setItem('cp-big', big ? '1' : '0'); render() }
  app.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b => (b.onclick = () => { tab = b.dataset.tab!; localStorage.setItem('cp-tab', tab); render() }))
  $('keys').onchange = () => { keys = ($('keys') as HTMLInputElement).checked; $('pages').classList.toggle('nokeys', !keys) }
  $('form').onsubmit = async e => { e.preventDefault(); await make(t) }
  $('print').onclick = async () => { if (!$('pages').children.length) await make(t); window.print() }
  app.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(el => (el.oninput = () => localStorage.setItem('cp-' + el.id, el.value)))
  const photoEl = document.getElementById('photo') as HTMLInputElement | null
  if (photoEl) photoEl.onchange = async () => { const f = photoEl.files?.[0]; if (f) { photo = await loadImage(f); if (t.id === 'dots') ($('d-shape') as HTMLSelectElement).value = 'photo'; await make(t) } }
  const play = document.getElementById('j-play')
  if (play) play.onclick = async () => { try { const [r, c] = v('j-size').split('x').map(Number); jigsawPlay(await needPhoto(), r, c) } catch (err) { $('warn').textContent = (err as Error).message } }
  if (!['color', 'jig'].includes(t.id) && !(t.id === 'dots' && v('d-shape') === 'photo')) make(t)
}

async function make(t: Tab) {
  const w = $('warn'); w.textContent = ''
  try {
    const out = await t.make()
    $('pages').innerHTML = out.pages.join('')
    w.textContent = out.warn
    fitPreview()
  } catch (e) { w.textContent = (e as Error).message }
}
function fitPreview() {
  const pages = $('pages'), avail = Math.min(pages.clientWidth || window.innerWidth, 900) - 8
  pages.style.setProperty('--z', String(Math.min(1, avail / 794)))
}
window.addEventListener('resize', fitPreview)
render()
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js')
