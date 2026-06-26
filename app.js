/* Śrīmad Bhāgavatam — pārāyaṇa web app (sql.js + normalize.js).
   Content: bhagavatam.db (read-only).  User data: localStorage.
   Audio: R2 AAC (.m4a) per śloka; tānpūrā drone = bundled web/tanpura.wav looped under the voice. */

// ── config ───────────────────────────────────────────────────────────────
// Set the Cloudflare R2 base when audio is ready (no trailing slash), e.g.
//   localStorage.setItem('bhag_audio','https://pub-xxxx.r2.dev')
const AUDIO_BASE = (localStorage.getItem('bhag_audio') ||
  'https://pub-303f7559721c4b40bf6712eb557e350c.r2.dev/Bhagavata_Audio').replace(/\/+$/, '');
const z2 = n => String(n).padStart(2, '0'), z3 = n => String(n).padStart(3, '0');
// R2 mirrors the source layout: skandha_NN/adhyaya_NNN/BhP_NN.NNN.RRR.m4a where RRR = the
// verse's 1-based rank among the chapter's Bhagavatam verses (= source file number), NOT audio_id.
const audioUrl = (sk, a, nnn) => `${AUDIO_BASE}/skandha_${z2(sk)}/adhyaya_${z3(a)}/BhP_${z2(sk)}.${z3(a)}.${z3(nnn)}.m4a`;
// karaoke timings are baked into bhagavatam.db (table `timings`) — no R2 /ts/ fetch.

const LANGS = [['deva','संस्कृतम् · Devanāgarī'],['iast','IAST'],['en','English'],['hi','हिन्दी'],
  ['kn','ಕನ್ನಡ'],['te','తెలుగు'],['ta','தமிழ்'],['ml','മലയാളം'],['bn','বাংলা'],['gu','ગુજરાતી']];
const scriptGlyph = s => ({deva:'अ',iast:'A',en:'En',hi:'हि',kn:'ಅ',te:'అ',ta:'அ',ml:'അ',bn:'অ',gu:'અ'})[s] || 'अ';
// explicit language names for the selector (not single letters)
const LANGNAME = {deva:'Sanskrit',iast:'IAST',en:'English',hi:'Hindi',kn:'Kannada',
  te:'Telugu',ta:'Tamil',ml:'Malayalam',bn:'Bengali',gu:'Gujarati'};

// clean line/glyph icons (inherit currentColor) — no emoji
const SW = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
const ICON = {
  home: `<svg viewBox="0 0 24 24" ${SW}><path d="M12 6c-1.6-1-3.9-1.5-6.2-1.3-.5 0-.8.4-.8.9v11.1c0 .5.4.9.9.8 2.2-.2 4.5.3 6.1 1.3"/><path d="M12 6c1.6-1 3.9-1.5 6.2-1.3.5 0 .8.4.8.9v11.1c0 .5-.4.9-.9.8-2.2-.2-4.5.3-6.1 1.3"/><path d="M12 6v12.6"/></svg>`,
  search: `<svg viewBox="0 0 24 24" ${SW}><circle cx="11" cy="11" r="6.4"/><path d="M15.7 15.7L20 20"/></svg>`,
  stotras: `<svg viewBox="0 0 24 24" ${SW}><path d="M4.5 14.2c2.3 1.3 4.8 1.9 7.5 1.9s5.2-.6 7.5-1.9c-.6 2.4-4 4.1-7.5 4.1s-6.9-1.7-7.5-4.1z"/><path d="M12 12.4c1.3 0 2.2-1 2.2-2.2C14.2 8.5 12 6.4 12 6.4s-2.2 2.1-2.2 3.8c0 1.2.9 2.2 2.2 2.2z"/></svg>`,
  library: `<svg viewBox="0 0 24 24" ${SW}><path d="M7 4.5h10a.9.9 0 0 1 .9.9v14.1l-5.9-3.9-5.9 3.9V5.4a.9.9 0 0 1 .9-.9z"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" ${SW}><path d="M7 4.5h10a.9.9 0 0 1 .9.9v14.1l-5.9-3.9-5.9 3.9V5.4a.9.9 0 0 1 .9-.9z"/></svg>`,
  prev: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5.5" width="2.1" height="13" rx="1"/><path d="M19 5.5v13l-9-6.5z"/></svg>`,
  next: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 5.5v13l9-6.5z"/><rect x="15.9" y="5.5" width="2.1" height="13" rx="1"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10-6.5z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5.5" width="3.4" height="13" rx="1"/><rect x="14.1" y="5.5" width="3.4" height="13" rx="1"/></svg>`,
  tanpura: `<svg viewBox="0 0 24 24" ${SW}><circle cx="12" cy="17.5" r="3.6"/><path d="M12 13.9V3.5"/><path d="M9.7 3.5h4.6"/><path d="M10.4 6.2h3.2M10.6 8.6h2.8M10.8 11h2.4"/></svg>`,
  close: `<svg viewBox="0 0 24 24" ${SW} stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" ${SW}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" ${SW}><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>`,
  lists: `<svg viewBox="0 0 24 24" ${SW}><path d="M8 6h12M8 12h12M8 18h9"/><path d="M3.6 6h.01M3.6 12h.01M3.6 18h.01"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" ${SW}><path d="M12 5.5v13M5.5 12h13"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${SW}><path d="M5 12.5l4.4 4.4L19 6.7"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" ${SW}><path d="M4.5 7h15M9 7V4.8h6V7M6.5 7l.9 12.2a.9.9 0 0 0 .9.8h7.4a.9.9 0 0 0 .9-.8L17.5 7"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" ${SW}><path d="M14.5 6.2l3.3 3.3M4 20l.9-3.6L15.6 5.7a1.3 1.3 0 0 1 1.8 0l.9.9a1.3 1.3 0 0 1 0 1.8L7.6 19.1z"/></svg>`,
  download: `<svg viewBox="0 0 24 24" ${SW}><path d="M12 4v10M8 10.5l4 4 4-4M5 19h14"/></svg>`,
  anukrama: `<svg viewBox="0 0 24 24" ${SW}><path d="M12 3.5l8.5 4.2-8.5 4.2-8.5-4.2L12 3.5z"/><path d="M3.5 12L12 16.2 20.5 12M3.5 15.8L12 20l8.5-4.2"/></svg>`,
  share: `<svg viewBox="0 0 24 24" ${SW}><circle cx="6" cy="12" r="2.3"/><circle cx="17.5" cy="6" r="2.3"/><circle cx="17.5" cy="18" r="2.3"/><path d="M8 11l7.5-3.7M8 13l7.5 3.7"/></svg>`,
  resume: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10-6.5z"/></svg>`,
};

// ── state ────────────────────────────────────────────────────────────────
let db = null;
let script = localStorage.getItem('bhag_script') || null;
let bookmarks = load('bhag_bookmarks', []);
let lists = load('bhag_lists', []);          // [{id,name,items:[ref],ts}] — user pārāyaṇa lists (native only)
const app = document.getElementById('app');
// running inside the Android/iOS shell? (Capacitor injects window.Capacitor)
const isNative = !!(window.Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());

// apply saved theme + reading size early (before any render)
(function(){ const t = localStorage.getItem('bhag_theme'); if (t) document.documentElement.setAttribute('data-theme', t);
  document.documentElement.style.setProperty('--read', (localStorage.getItem('bhag_read') || '20') + 'px'); })();
const READ_SIZES = [[16,'Small'],[18,'Medium'],[20,'Large'],[23,'Larger'],[26,'Largest']];
const curRead = () => +(localStorage.getItem('bhag_read') || 20);
const applyRead = px => document.documentElement.style.setProperty('--read', px + 'px');
function openFontMenu(){
  const ov = document.createElement('div'); ov.className = 'menu-ov'; const cur = curRead();
  ov.innerHTML = `<div class="langmenu"><div class="menu-h">Reading size</div>` +
    READ_SIZES.map(([px, name]) => `<button class="lang-item ${px === cur ? 'on' : ''}" data-px="${px}">
       <span class="ln" style="font-size:${Math.min(px, 22)}px">${name}</span><span class="gl">${px}px</span></button>`).join('')
    + `</div>`;
  document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.querySelector('.langmenu').onclick = e => { const b = e.target.closest('[data-px]'); if (!b) return;
    applyRead(+b.dataset.px); localStorage.setItem('bhag_read', b.dataset.px);
    ov.querySelectorAll('.lang-item').forEach(x => x.classList.toggle('on', x === b)); };
}
const curTheme = () => document.documentElement.getAttribute('data-theme') || 'light';   // default light; dark only via toggle
function toggleTheme(){
  const next = curTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bhag_theme', next);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = next === 'dark' ? '#14110d' : '#fbf7ef';
  const b = document.getElementById('themeBtn'); if (b) b.innerHTML = curTheme() === 'dark' ? ICON.sun : ICON.moon;
}

function load(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
// verses & untranslated metadata: transliterate. English → IAST; Hindi → Devanāgarī (verses stay Sanskrit)
const dispScript = () => (script === 'en' ? 'iast' : script === 'hi' ? 'deva' : (script || 'deva'));
const tr = d => (window.BhagDisplay ? BhagDisplay(d || '', dispScript()) : (d || ''));
// topic tags: show the meaning-translation for the chosen language if we have it, else transliterate
// Gujarati translations are incomplete (partial topics, no stotra names), so its
// titles/descriptions come from Hindi (then the stored English title). Verses still
// render in Gujarati script via dispScript(). Other languages are complete.
function langChain(){ return script === 'gu' ? ['hi'] : [script]; }
function trTopic(id, dev){
  if (id){ for (const lang of langChain()){
    const r = q('SELECT text FROM topic_tr WHERE topic_id=? AND lang=?', [id, lang])[0];
    if (r) return esc(r.text);
  } }
  return tr(dev);
}
// stotra titles: localized name for deva/hi/kn/te/ta/ml/bn (gu→hi); Sanskrit (deva) uses its own
// proper forms (stutiḥ, gītā), falling back to Hindi Devanāgarī; else (en/iast) the English title.
function trStotra(ord, title){
  const chain = script === 'deva' ? ['deva', 'hi'] : langChain();
  for (const lang of chain){
    const r = q('SELECT text FROM stotra_tr WHERE stotra_ordinal=? AND lang=?', [ord, lang])[0];
    if (r) return esc(r.text);
  }
  return esc(title);
}
const esc = s => { const e = document.createElement('div'); e.textContent = s ?? ''; return e.innerHTML; };

function q(sql, p = []){ const s = db.prepare(sql); s.bind(p); const o = []; while (s.step()) o.push(s.getAsObject()); s.free(); return o; }

// ── boot ─────────────────────────────────────────────────────────────────
let dbReady = false, launched = false;
// show the welcome instantly (it needs no DB); load the 21 MB DB in the background
if (!script) renderWelcome();
initSqlJs({ locateFile: f => f })   // local bundled sql-wasm.wasm (fully offline)
  .then(SQL => fetch('bhagavatam.db', { cache: 'no-store' }).then(r => r.arrayBuffer())
    .then(buf => { db = new SQL.Database(new Uint8Array(buf)); dbReady = true; maybeLaunch(); }))
  .catch(e => { app.innerHTML = `<div class="spin">couldn’t load — serve over http (not file://).<br>${esc(''+e)}</div>`; });

// launch the app once a language is chosen AND the DB has finished loading
function maybeLaunch(){
  if (!dbReady || !script || launched) return;
  launched = true;
  buildShell();
  window.addEventListener('hashchange', route);
  route();
}
function start(){ maybeLaunch(); }   // language pick on the welcome page calls this

// ── onboarding (pick reading script) ───────────────────────────────────────
function renderWelcome(){
  const cards = LANGS.map(([c, n]) => { const native = n.split(' · ')[0]; const eng = LANGNAME[c] || native;
    return `<button class="scriptcard" data-sc="${c}"><span class="sc-native">${native}</span><span class="sc-eng">${eng}</span></button>`; }).join('');
  app.innerHTML = `<div class="welcome">
    <img class="w-pic" src="app_pic.jpg" alt="Śrī Gopālakṛṣṇa">
    <h1 class="w-title">भागवतवाणी</h1>
    <div class="w-name">Bhāgavata-VāNi</div>
    <div class="w-script">श्रीमद्भागवतम्</div>
    <div class="w-invoke">॥ श्रीमध्वपतिः प्रीयताम् ॥</div>
    <div class="w-credit">Developed &amp; maintained by Prof. Prathosh<br><a href="mailto:prathoshdata@gmail.com">prathoshdata@gmail.com</a></div>
    <div class="w-prompt">भाषां चिनुत — choose your language</div>
    <div class="scriptlist">${cards}</div>
    <button class="w-ack" id="ackBtn">Acknowledgements</button>
  </div>`;
  app.querySelector('.scriptlist').onclick = e => { const b = e.target.closest('[data-sc]'); if (!b) return;
    script = b.dataset.sc; localStorage.setItem('bhag_script', script);
    if (!dbReady){ const w = document.querySelector('.welcome');
      if (w && !w.querySelector('.w-loading')) w.insertAdjacentHTML('beforeend', '<div class="w-loading">loading the text…</div>'); }
    start(); };
  document.getElementById('ackBtn').onclick = renderAbout;
}
function aboutHTML(){
  return `<img class="w-pic small" src="app_pic.jpg" alt="Śrī Gopālakṛṣṇa">
    <h1 class="w-title" style="font-size:28px">भागवतवाणी</h1>
    <div class="w-name">Bhāgavata-VāNi</div>
    <div class="w-script">श्रीमद्भागवतम्</div>
    <div class="ack-section"><div class="ack-h">Acknowledgement</div>
      <p>We are deeply thankful to <b>Poornaprajna Saṃśodhana Mandiram, Bengaluru</b> for generously lending the text of Śrīmad Bhāgavatam.</p></div>
    <div class="ack-section"><div class="ack-h">Developed &amp; maintained by</div>
      <p>Prof. Prathosh<br><a href="mailto:prathoshdata@gmail.com">prathoshdata@gmail.com</a></p></div>
    <div class="w-invoke">॥ श्रीमध्वपतिः प्रीयताम् ॥</div>`;
}
function renderAbout(){   // from the welcome page (pre-shell)
  app.innerHTML = `<div class="welcome about"><button class="back-link" id="ackBack">‹</button>${aboutHTML()}</div>`;
  document.getElementById('ackBack').onclick = renderWelcome;
}
function renderAboutView(){   // in-app route #/about
  setTitle('About'); back(true);
  V(`<div class="welcome about" style="margin:0 auto;padding-top:8px">${aboutHTML()}</div>`);
}

// ── app shell (persistent: topbar, view, player, tabbar, audio) ────────────
function buildShell(){
  app.innerHTML = `
    <header class="topbar" id="topbar">
      <button class="back" id="back" style="display:none">‹</button>
      <div class="title" id="title">श्रीमद्भागवतम्</div>
      <button class="iconbtn fontbtn" id="fontBtn" title="text size">A<span>a</span></button>
      <button class="iconbtn" id="themeBtn" title="light / dark"></button>
      <button class="langbtn" id="scriptBtn" title="reading language"></button>
    </header>
    <main class="view" id="view"></main>
    <div class="player" id="player">
      <button class="ctl" id="prev">${ICON.prev}</button>
      <button class="pp" id="pp">${ICON.play}</button>
      <button class="ctl" id="next">${ICON.next}</button>
      <span class="ref" id="pref"></span>
      <button class="ctl tan" id="tanBtn" title="tānpūrā drone">${ICON.tanpura}</button>
      <button class="ctl tanvol" id="tanVolBtn" title="tānpūrā volume" style="display:none"></button>
      <button class="spd" id="spd">1×</button>
      <button class="ctl" id="pclose">${ICON.close}</button>
    </div>
    ${isNative ? `<div class="selbar" id="selbar">
      <span class="selcount" id="selcount">0 selected</span>
      <button class="selact" id="seladd">${ICON.plus}<span>Add to list</span></button>
      <button class="ctl" id="selcancel">${ICON.close}</button>
    </div>` : ''}
    <nav class="tabbar" id="tabbar">${tabbarHTML()}</nav>
    <audio id="au"></audio>`;
  document.getElementById('back').onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/'; };
  document.getElementById('scriptBtn').onclick = openLangMenu;
  document.getElementById('fontBtn').onclick = openFontMenu;
  const tb = document.getElementById('themeBtn'); tb.innerHTML = curTheme() === 'dark' ? ICON.sun : ICON.moon; tb.onclick = toggleTheme;
  setLangBtn();
  document.getElementById('tabbar').onclick = e => {
    const t = e.target.closest('[data-tab]'); if (t) location.hash = '#/' + (t.dataset.tab === 'home' ? '' : t.dataset.tab);
  };
  setupPlayer();
  if (isNative){
    document.getElementById('selcancel').onclick = () => exitSelect();
    document.getElementById('seladd').onclick = () => {
      if (!selected.size) return toast('tap ślokas to select them');
      openListSheet([...selected]);
    };
  }
  // hide topbar on scroll-down for distraction-free reading + track reading position
  let lastY = 0, posT = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY, bar = document.getElementById('topbar');
    bar.classList.toggle('hide', y > 80 && y > lastY); lastY = y;
    const now = Date.now();
    if (now - posT > 600){ posT = now; trackReadingPos(); }   // throttled
  }, { passive: true });
}
// remember where the reader is, for "Continue reading" on Home
function trackReadingPos(){
  if (!/^#\/?s\/[^/]+\/[^/]+/.test(location.hash)) return;     // only inside a chapter
  let topEl = null;
  for (const el of document.querySelectorAll('.v[data-v]')){
    if (!el.dataset.v) continue;
    if (el.getBoundingClientRect().bottom > 64){ topEl = el; break; }
  }
  if (topEl && topEl.dataset.ref) save('bhag_last', { ref: topEl.dataset.ref, ts: Date.now() });
}
const tab = (id, n) => `<button class="tab" data-tab="${id}"><span class="i">${ICON[id] || ''}</span><span class="tl">${n}</span></button>`;
// tab labels translated per language (Anukramaṇikā/Stotra are Sanskrit terms → script/plural form)
const TABS = {
  home:    { en:'Read',    hi:'पढ़ें',       kn:'ಓದು',         te:'చదువు',      ta:'படி',          ml:'വായിക്കുക',   bn:'পড়ুন',     gu:'વાંચો',       deva:'पठनम्',       iast:'Pāṭha' },
  search:  { en:'Search',  hi:'खोजें',       kn:'ಹುಡುಕು',      te:'వెతుకు',     ta:'தேடு',          ml:'തിരയുക',     bn:'খুঁজুন',     gu:'શોધો',        deva:'अन्वेषणम्',   iast:'Anveṣaṇa' },
  anukrama:{ en:'Index',   hi:'अनुक्रमणिका', kn:'ಅನುಕ್ರಮಣಿಕಾ', te:'అనుక్రమణిక', ta:'அநுக்ரமணிகா',   ml:'അനുക്രമണിക',  bn:'অনুক্রমণিকা', gu:'અનુક્રમણિકા', deva:'अनुक्रमणिका', iast:'Anukramaṇikā' },
  stotras: { en:'Stotras', hi:'स्तोत्र',     kn:'ಸ್ತೋತ್ರಗಳು',  te:'స్తోత్రాలు', ta:'ஸ்தோத்திரங்கள்', ml:'സ്തോത്രങ്ങൾ', bn:'স্তোত্র',    gu:'સ્તોત્રો',    deva:'स्तोत्राणि',  iast:'Stotrāṇi' },
  lists:   { en:'My List', hi:'मेरा संग्रह', kn:'ನನ್ನ ಸಂಗ್ರಹ', te:'నా సంగ్రహం', ta:'என் தொகுப்பு',   ml:'എന്റെ ശേഖരം', bn:'আমার সংগ্রহ', gu:'મારો સંગ્રહ', deva:'मम सङ्ग्रहः', iast:'Mama Saṅgraha' },
};
const tabLabel = id => (TABS[id] && (TABS[id][script] || TABS[id].en)) || id;
// My List is native-only (web stays a lean reader) → drop the tab on web
const tabbarHTML = () => ['home', 'search', 'anukrama', 'stotras', ...(isNative ? ['lists'] : [])].map(id => tab(id, tabLabel(id))).join('');

function setLangBtn(){
  const b = document.getElementById('scriptBtn');
  if (b) b.textContent = LANGNAME[script] || 'Language';
}
// language picker: full names (Hindi, Tamil, Kannada…), not single letters
function openLangMenu(){
  const ov = document.createElement('div'); ov.className = 'menu-ov';
  const items = LANGS.map(([c, n]) => {
    const native = n.split(' · ')[0];                 // native-script sample
    const sub = native === LANGNAME[c] ? '' : `<span class="gl">${native}</span>`;
    return `<button class="lang-item ${c === script ? 'on' : ''}" data-sc="${c}">
        <span class="ln">${LANGNAME[c]}</span>${sub}</button>`;
  }).join('');
  ov.innerHTML = `<div class="langmenu"><div class="menu-h">Reading language</div>${items}</div>`;
  document.body.appendChild(ov);
  ov.onclick = e => { if (e.target === ov) ov.remove(); };
  ov.querySelector('.langmenu').onclick = e => {
    const b = e.target.closest('[data-sc]'); if (!b) return;
    script = b.dataset.sc; localStorage.setItem('bhag_script', script);
    setLangBtn(); const tb = document.getElementById('tabbar'); if (tb) tb.innerHTML = tabbarHTML();
    ov.remove(); route();
  };
}

// ── router ─────────────────────────────────────────────────────────────────
function route(){
  const h = location.hash.replace(/^#\/?/, '');
  const p = h.split('/').filter(Boolean);
  const view = document.getElementById('view');
  setTab(p[0] || 'home');
  back((p[0] === 's' && p.length > 1) || (p[0] === 'anukrama' && p.length > 1) || (p[0] === 'lists' && p[1] !== undefined) || p[0] === 'about');
  window.scrollTo(0, 0);
  exitSelect();                                             // leaving a view → drop any selection
  if (!(p[0] === 's' && p[2] !== undefined)) stopAudio();   // leaving a chapter → hide player
  if (p[0] === 's' && p[2] !== undefined) return renderReader(+p[1], +p[2], p[3]);
  if (p[0] === 's')                       return renderAdhyayas(+p[1]);
  if (p[0] === 'search')                  return renderSearch();
  if (p[0] === 'stotras')                 return renderStotras();
  if (p[0] === 'anukrama'){
    if (p[1] === 'aksara')                return renderAksaraIndex();
    if (p[1] === 'speakers')              return renderSpeakerIndex();
    if (p[1] === 'speaker' && p[2] !== undefined) return renderSpeakerDetail(+p[2]);
    if (p[1] === 'topics')                return renderTopicIndex();
    if (p[1] === 'pada')                  return renderPadaIndex();
    return renderAnukramaHome();
  }
  if (isNative && p[0] === 'lists' && p[1] !== undefined) return renderListDetail(p[1]);
  if (isNative && p[0] === 'lists')       return renderMyList();
  if (p[0] === 'about')                   return renderAboutView();
  return renderHome();
}
const back = on => { const b = document.getElementById('back'); if (b) b.style.display = on ? 'block' : 'none'; };
const setTab = name => document.querySelectorAll('.tab').forEach(t =>
  t.classList.toggle('on', t.dataset.tab === name || (name === 's' && t.dataset.tab === 'home')));
const setTitle = t => document.getElementById('title').innerHTML = t;
const V = html => document.getElementById('view').innerHTML = html;

// ── Read: skandha list ─────────────────────────────────────────────────────
function renderHome(){
  setTitle('श्रीमद्भागवतम्');
  const rows = q('SELECT skandha,heading_dev,adhyaya_count,verse_count FROM skandhas ORDER BY skandha');
  const last = load('bhag_last', null);
  let cont = '';
  if (last && last.ref){
    const [sk, a, v] = last.ref.split('.');
    const ad = q('SELECT heading_dev h FROM adhyayas WHERE skandha=? AND adhyaya=?', [+sk, +a])[0] || {};
    const row = v ? q('SELECT text_dev t FROM entries WHERE skandha=? AND adhyaya=? AND verse=? LIMIT 1', [+sk, +a, +v])[0] : null;
    cont = `<a class="card cont" href="#/s/${sk}/${a}${v ? '/' + v : ''}"><div class="ci">${ICON.resume}</div>
      <div><div class="lead" style="font-size:17px">Continue · ${adhName(+a, ad.h)}</div>
      <div class="sub">${last.ref}${row ? ' · ' + tr(row.t.split('\n')[0]) : ''}</div></div><div class="meta">›</div></a>`;
  }
  V(`<div class="sectionhdr">${tr('श्रीमद्भागवतम्')}</div>
     <div class="sectionsub">Śrīmad Bhāgavatam · 12 skandhas</div>` + cont +
    rows.map(r => `<a class="card" href="#/s/${r.skandha}">
      <div><div class="lead">${skName(r.skandha, r.heading_dev)}</div>
      <div class="sub">Skandha ${r.skandha}</div></div>
      <div class="meta">${r.adhyaya_count} adhyāyas · ${r.verse_count} ślokas ›</div></a>`).join(''));
}

// ── Read: adhyāya list ─────────────────────────────────────────────────────
function renderAdhyayas(sk){
  const skd = q('SELECT heading_dev FROM skandhas WHERE skandha=?', [sk])[0] || {};
  setTitle(skName(sk, skd.heading_dev));
  const rows = q('SELECT adhyaya,heading_dev,verse_count,topic_count FROM adhyayas WHERE skandha=? ORDER BY adhyaya', [sk]);
  V(rows.map(r => `<a class="card" href="#/s/${sk}/${r.adhyaya}">
      <div><div class="lead">${adhName(r.adhyaya, r.heading_dev)}</div>
      <div class="sub">${sk}.${r.adhyaya}</div></div>
      <div class="meta">${r.verse_count} ślokas ›</div></a>`).join(''));
}

// ── Read: reader (continuous scroll) ───────────────────────────────────────
let chapterAudio = [];   // playable verses in current chapter
let autoPlayNext = false;   // set when rolling from one adhyāya into the next, so renderReader resumes playback
function renderReader(sk, a, focusV){
  const ad = q('SELECT heading_dev FROM adhyayas WHERE skandha=? AND adhyaya=?', [sk, a])[0] || {};
  setTitle(`${adhName(a, ad.heading_dev)} · ${sk}.${a}`);
  const topics = {}; q('SELECT id,verse_start,verse_end,text_dev FROM topics WHERE skandha=? AND adhyaya=? ORDER BY ordinal', [sk, a]).forEach(t => topics[t.id] = t);
  const ents = q(`SELECT seq_in_adhyaya seq,content_type ct,is_padya ip,verse,verse_end ve,topic_id tid,text_dev txt,audio_id aid
                  FROM entries WHERE skandha=? AND adhyaya=? ORDER BY seq_in_adhyaya`, [sk, a]);
  chapterAudio = [];
  // synopsis = the chapter's topic map, translated (falls back to transliterated Sanskrit)
  const tlist = Object.values(topics);
  let syn = tlist.length
    ? tlist.map(t => { const rng = t.verse_start == null ? '' :
        (t.verse_start === t.verse_end ? t.verse_start : `${t.verse_start}–${t.verse_end}`);
        const href = t.verse_start == null ? `#/s/${sk}/${a}` : `#/s/${sk}/${a}/${t.verse_start}`;
        return `<a class="syn-line" href="${href}">${rng ? `<span class="rng">${rng}</span>` : ''}<span>${trTopic(t.id, t.text_dev)}</span></a>`; }).join('')
    : ents.filter(e => e.ct === 'Subject').map(e => tr(e.txt)).join(' ');
  let html = `<div class="reader">`;
  if (isNative) html += `<div class="r-tools">
      <button class="rtool" id="selBtn">${ICON.check}<span>Select ślokas</span></button>
      <button class="rtool" id="addChap">${ICON.plus}<span>Add adhyāya to a list</span></button>
      ${AUDIO_BASE ? `<button class="rtool" id="dlBtn"></button>` : ''}
    </div>`;
  if (ad.heading_dev) html += `<div class="r-heading">${adhName(a, ad.heading_dev)}</div>`;
  if (syn) html += `<div class="r-syn"><span class="lbl">${L('synopsis')}</span>${syn}</div>`;
  let curTopic = -1;
  for (const e of ents){
    if (e.ct === 'Subject' || e.ct === 'Adhyaya_Heading') continue;
    if (e.ct === 'Colophon_Bhagavatam'){ html += `<div class="r-colophon">${lines(e.txt)}</div>`; continue; }
    if (e.tid && e.tid !== curTopic && topics[e.tid]){
      const t = topics[e.tid]; curTopic = e.tid;
      const rng = t.verse_start === t.verse_end ? t.verse_start : `${t.verse_start}–${t.verse_end}`;
      html += `<div class="r-topic"><span class="rng">${rng}</span><span>${trTopic(t.id, t.text_dev)}</span></div>`;
    }
    const ref = `${sk}.${a}.${e.verse}`;
    const num = e.verse == null ? '' : (e.ve ? `${e.verse}-${e.ve}` : e.verse);
    const bm = bookmarks.some(b => b.ref === ref) ? 'on' : '';
    const idx = chapterAudio.length;     // only Bhagavatam verses reach here → idx+1 = source rank (nnn)
    chapterAudio.push({ aid: e.aid, nnn: idx + 1, sk, a, ref, verse: e.verse });
    html += `<div class="v ${e.ip === 0 ? 'prose' : 'verse'}" data-i="${idx}" data-ref="${ref}" data-v="${e.verse ?? ''}" id="v${e.aid}">
      <span class="num">${num}</span>${e.verse != null ? `<span class="vshare" data-ref="${ref}">${ICON.share}</span><span class="star ${bm}" data-ref="${ref}">${ICON.bookmark}</span>` : ''}
      <div class="body">${lines(e.txt)}</div>${e.verse != null ? `<span class="playind">${ICON.play}</span>` : ''}</div>`;
  }
  html += `</div>`;
  V(html);
  const view = document.getElementById('view');
  view.querySelectorAll('.star').forEach(s => s.onclick = ev => { ev.stopPropagation(); toggleBookmark(s.dataset.ref, s); });
  view.querySelectorAll('.vshare').forEach(s => s.onclick = ev => { ev.stopPropagation(); shareVerse(s.dataset.ref); });
  view.querySelectorAll('.v').forEach(v => v.onclick = () => {
    if (isNative && selectMode){ if (v.dataset.v) toggleSel(v.dataset.ref, v); }
    else playFrom(+v.dataset.i);
  });
  if (isNative){
    const chapRefs = ents.filter(e => e.verse != null).map(e => `${sk}.${a}.${e.verse}`);
    document.getElementById('selBtn').onclick = () => selectMode ? exitSelect() : enterSelect();
    document.getElementById('addChap').onclick = () => {
      if (!chapRefs.length) return toast('nothing to add');
      openListSheet(chapRefs, `whole adhyāya ${sk}.${a} · ${chapRefs.length} ślokas`);
    };
    if (AUDIO_BASE){
      setDlBtn(sk, a);
      document.getElementById('dlBtn').onclick = async () => {
        const b = document.getElementById('dlBtn');
        if (isChapterDownloaded(sk, a)){
          if (confirm('Remove the offline audio for this adhyāya?')){ await removeDownload(sk, a); setDlBtn(sk, a); toast('offline audio removed'); }
          return;
        }
        b.disabled = true; const sp = b.querySelector('span');
        const okk = await downloadChapter(sk, a, (d, n) => { if (sp) sp.textContent = `Downloading ${d}/${n}…`; });
        b.disabled = false; setDlBtn(sk, a); if (okk) toast('saved for offline');
      };
    }
  }
  showChapterPlayer();
  const firstRef = (chapterAudio.find(c => c.verse != null) || {}).ref || `${sk}.${a}`;
  save('bhag_last', { ref: focusV ? `${sk}.${a}.${focusV}` : firstRef, ts: Date.now() });   // resume point
  if (focusV){ const t = view.querySelector(`.v[data-ref="${sk}.${a}.${focusV}"]`);
    if (t){ t.scrollIntoView({ block: 'center' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1600); } }
  if (autoPlayNext){ autoPlayNext = false; playFrom(0); }   // continue recitation into this adhyāya
}
// persistent player bar while a chapter is open (visible even before audio is wired)
function showChapterPlayer(){
  const p = document.getElementById('player'); if (!p) return;
  if (!chapterAudio.length){ p.classList.remove('on'); return; }
  curIdx = -1; segs = null;
  p.classList.add('on');
  document.getElementById('pp').innerHTML = ICON.play;
  document.getElementById('pref').textContent = AUDIO_BASE ? 'Tap Play or a verse to recite' : 'Recitation — audio coming soon';
}
const lines = txt => (txt || '').split('\n').map((l, i) => `<span class="ln" data-i="${i}">${tr(l)}</span>`).join('<br>');

// ── tānpūrā drone (Web Audio, layered under the recitation) ──────────────────
// A continuous loop mixed beneath the voice. Its lifecycle follows the playback
// SESSION (play / pause / stop), never the individual śloka — so varying verse
// lengths never touch it, and a verse-to-verse advance (ended→play, no pause)
// keeps it droning without a flicker. WAV, not AAC: a sample-accurate loop with
// no encoder priming gap. Runs on the AudioContext clock — fully independent of
// karaoke, which rides the <audio> element clock.
let ac = null, tanpuraBuf = null, droneSrc = null, droneGain = null, droneOn = false, droneGen = 0;
let tanpuraEnabled = load('bhag_tanpura', true);           // ON by default
const TAN_LEVELS = [0.05, 0.10, 0.20, 0.34];               // faint · soft · medium · full
let tanLevel = Math.max(0, Math.min(TAN_LEVELS.length - 1, load('bhag_tanpura_vol', 0)));   // default 0.05 (least)
const tanVol = () => TAN_LEVELS[tanLevel];
const tanpuraRate = () => +localStorage.getItem('bhag_tanpura_rate') || 1;   // fixed-pitch transpose; calibrate by ear
function ensureAudioCtx(){
  if (!ac){ const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { ac = new C(); } catch (e){ return null; } }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
async function startDrone(){
  if (!tanpuraEnabled || droneOn) return;
  const gen = ++droneGen; droneOn = true;                  // claim synchronously → blocks re-entrancy/races
  if (!ensureAudioCtx()){ droneOn = false; return; }
  if (!tanpuraBuf){
    try { tanpuraBuf = await ac.decodeAudioData(await (await fetch('tanpura.wav')).arrayBuffer()); }
    catch (e){ tanpuraBuf = null; }
  }
  if (gen !== droneGen || !tanpuraEnabled || !tanpuraBuf){ droneOn = false; return; }  // stopped/disabled mid-fetch
  droneGain = ac.createGain(); droneGain.gain.value = 0;
  droneSrc = ac.createBufferSource(); droneSrc.buffer = tanpuraBuf;
  droneSrc.loop = true; droneSrc.playbackRate.value = tanpuraRate();
  droneSrc.connect(droneGain).connect(ac.destination);
  droneSrc.start();
  const t = ac.currentTime;
  droneGain.gain.setValueAtTime(0, t);
  droneGain.gain.linearRampToValueAtTime(tanVol(), t + 1.6);   // fade in to current level
}
function stopDrone(){
  droneGen++;                                              // invalidate any in-flight start
  if (!droneOn) return; droneOn = false;
  const g = droneGain, node = droneSrc; droneGain = null; droneSrc = null;
  if (!g || !node || !ac) return;
  const t = ac.currentTime;
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t);
  g.gain.linearRampToValueAtTime(0, t + 1.2);              // fade out
  try { node.stop(t + 1.3); } catch (e){}
}
// volume button: one ascending bar per level, bars above the current level dimmed
const tanVolIcon = lv => {
  const n = TAN_LEVELS.length, w = 3.2, gap = (20 - n * w) / (n - 1);   // spread across a 24 box, 2px margins
  let bars = '';
  for (let i = 0; i < n; i++){
    const x = 2 + i * (w + gap), h = 5 + (i / (n - 1)) * 13;
    bars += `<rect x="${x.toFixed(1)}" y="${(20 - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}" rx="1" opacity="${lv >= i ? 1 : .3}"/>`;
  }
  return `<svg viewBox="0 0 24 24" fill="currentColor">${bars}</svg>`;
};
function updateTanBtn(){
  const b = document.getElementById('tanBtn'); if (b) b.classList.toggle('on', tanpuraEnabled);
  const v = document.getElementById('tanVolBtn');
  if (v){ v.innerHTML = tanVolIcon(tanLevel); v.style.display = tanpuraEnabled ? '' : 'none'; }  // only visible when on
}
function toggleTanpura(){
  tanpuraEnabled = !tanpuraEnabled; save('bhag_tanpura', tanpuraEnabled); updateTanBtn();
  if (tanpuraEnabled){ if (au && !au.paused) startDrone(); } else stopDrone();
}
function cycleTanVol(){
  tanLevel = (tanLevel + 1) % TAN_LEVELS.length; save('bhag_tanpura_vol', tanLevel); updateTanBtn();
  if (droneGain && ac){ const t = ac.currentTime;                        // live: ramp to new level if droning
    droneGain.gain.cancelScheduledValues(t); droneGain.gain.setValueAtTime(droneGain.gain.value, t);
    droneGain.gain.linearRampToValueAtTime(droneOn ? tanVol() : 0, t + 0.18); }
  else toast(['faint', 'soft', 'medium', 'full'][tanLevel] + ' tānpūrā');
}

// ── audio player ───────────────────────────────────────────────────────────
let au, curIdx = -1, segs = null, speeds = [1, 1.25, 1.5, 0.75], si = 0;
function setupPlayer(){
  au = document.getElementById('au');
  document.getElementById('pp').onclick = () => {
    if (curIdx < 0) return playFrom(0);          // idle → start the chapter
    au.paused ? au.play() : au.pause();
  };
  document.getElementById('prev').onclick = () => playFrom(curIdx - 1);
  document.getElementById('next').onclick = () => playFrom(curIdx + 1);
  document.getElementById('pclose').onclick = stopAudio;
  document.getElementById('spd').onclick = () => { si = (si + 1) % speeds.length;
    au.playbackRate = speeds[si]; document.getElementById('spd').textContent = speeds[si] + '×'; };
  au.onplay = () => { document.getElementById('pp').innerHTML = ICON.pause; startDrone(); };   // also covers verse-advance & resume
  au.onpause = () => { document.getElementById('pp').innerHTML = ICON.play; stopDrone(); };     // user pause / stopAudio
  au.onended = () => playFrom(curIdx + 1);
  au.ontimeupdate = karaoke;
  au.onerror = () => { if (AUDIO_BASE) toast('audio not available yet for this śloka'); };
  document.getElementById('tanBtn').onclick = toggleTanpura;
  document.getElementById('tanVolBtn').onclick = cycleTanVol; updateTanBtn();
}
// last śloka of the chapter finished → roll on to the next adhyāya (then next skandha), else stop
function nextAdhyaya(sk, a){
  const m = (q('SELECT adhyaya_count c FROM skandhas WHERE skandha=?', [sk])[0] || {}).c || a;
  if (a < m) return { sk, a: a + 1 };
  if (sk < 12) return { sk: sk + 1, a: 1 };
  return null;
}
function endOfChapter(){
  const cur = chapterAudio[0];                         // any entry carries this chapter's sk/a
  const nx = cur && nextAdhyaya(cur.sk, cur.a);
  if (nx){ autoPlayNext = true; location.hash = `#/s/${nx.sk}/${nx.a}`; }   // renderReader auto-plays it
  else stopAudio();                                    // reached 12.last — end of the text
}
function playFrom(i){
  if (i < 0) return;                                   // before the first verse → stay put
  if (!chapterAudio.length){ stopAudio(); return; }
  if (i >= chapterAudio.length) return endOfChapter(); // finished the last śloka
  const v = chapterAudio[i];
  const offline = isChapterDownloaded(v.sk, v.a);
  if (!AUDIO_BASE && !offline){ toast('Set the R2 audio base to enable recitation'); return; }
  if (tanpuraEnabled) ensureAudioCtx();          // unlock WebAudio inside the tap gesture (iOS)
  curIdx = i;
  document.getElementById('player').classList.add('on');
  document.getElementById('pref').textContent = v.ref + (offline ? ' · offline' : '');
  highlightActive(v.aid);
  segs = loadSegs(v);                              // synchronous DB lookup (offline-safe)
  resolveAudioSrc(v).then(src => { if (curIdx !== i) return;   // user skipped before resolve
    au.src = src; au.playbackRate = speeds[si]; au.play().catch(() => {}); });
}

// ── offline audio (native): save WAVs to the device, play locally ───────────
const FS = () => (isNative && window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Filesystem) || null;
let downloads = load('bhag_downloads', {});            // { "sk.a": {n, ts} }
const dlKey = (sk, a) => `${sk}.${a}`;
const isChapterDownloaded = (sk, a) => !!downloads[dlKey(sk, a)];
const blobToB64 = blob => new Promise((res, rej) => { const r = new FileReader();
  r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });

async function resolveAudioSrc(v){
  const fs = FS();
  if (fs && isChapterDownloaded(v.sk, v.a)){
    try { const u = await fs.getUri({ path: `audio/${v.sk}/${v.a}/${v.aid}.m4a`, directory: 'DATA' });
      return Capacitor.convertFileSrc(u.uri); } catch (e){}
  }
  return audioUrl(v.sk, v.a, v.nnn);
}
function loadSegs(v){                               // hemistich timings from the bundled DB
  try { const r = q('SELECT segs FROM timings WHERE skandha=? AND adhyaya=? AND audio_id=?', [v.sk, v.a, v.aid]);
    return r.length ? JSON.parse(r[0].segs) : null; } catch (e){ return null; }
}
async function downloadChapter(sk, a, onProgress){
  const fs = FS(); if (!fs){ toast('offline download needs the app'); return false; }
  if (!AUDIO_BASE){ toast('audio not available yet'); return false; }
  const verses = q("SELECT audio_id aid FROM entries WHERE skandha=? AND adhyaya=? AND content_type='Bhagavatam' ORDER BY seq_in_adhyaya", [sk, a]);
  if (!verses.length){ toast('no audio in this chapter'); return false; }
  let done = 0, ok = 0;
  for (let k = 0; k < verses.length; k++){
    const aid = verses[k].aid, nnn = k + 1;          // rank among Bhagavatam verses = source file number
    try {
      const w = await fetch(audioUrl(sk, a, nnn));   // NOTE: needs CORS on R2 (streaming playback does not)
      if (w.ok){ await fs.writeFile({ path: `audio/${sk}/${a}/${aid}.m4a`, data: await blobToB64(await w.blob()), directory: 'DATA', recursive: true }); ok++; }
    } catch (e){}                                    // timings are in the DB — only audio is downloaded
    done++; if (onProgress) onProgress(done, verses.length);
  }
  if (ok){ downloads[dlKey(sk, a)] = { n: ok, ts: Date.now() }; save('bhag_downloads', downloads); return true; }
  toast('download failed — check the audio source'); return false;
}
async function removeDownload(sk, a){
  const fs = FS();
  if (fs){ try { await fs.rmdir({ path: `audio/${sk}/${a}`, directory: 'DATA', recursive: true }); } catch (e){} }
  delete downloads[dlKey(sk, a)]; save('bhag_downloads', downloads);
}
function setDlBtn(sk, a){
  const b = document.getElementById('dlBtn'); if (!b) return;
  const dl = isChapterDownloaded(sk, a);
  b.innerHTML = `${dl ? ICON.check : ICON.download}<span>${dl ? 'Saved offline' : 'Download audio'}</span>`;
  b.classList.toggle('on', dl);
}
function stopAudio(){ au.pause(); au.removeAttribute('src'); curIdx = -1; segs = null;
  document.getElementById('player').classList.remove('on');
  document.querySelectorAll('.v.active').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.ln.now').forEach(l => l.classList.remove('now')); }
function highlightActive(aid){
  document.querySelectorAll('.v.active').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.ln.now').forEach(l => l.classList.remove('now'));   // drop the prev verse's karaoke line
  const el = document.getElementById('v' + aid);
  if (el){ el.classList.add('active'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}
function karaoke(){
  if (!segs) return;
  const t = au.currentTime, el = document.querySelector('.v.active'); if (!el) return;
  let seg = null;
  for (const s of segs){ if (t >= s.s) seg = s; else break; }   // last segment started ≤ t → stays lit through the inter-hemistich gap (no blink)
  el.querySelectorAll('.ln').forEach(l => l.classList.toggle('now', seg && +l.dataset.i === seg.i));
}

// ── Search (two-tier, all-script) ──────────────────────────────────────────
let skFilter = null, lastHits = null, lastQ = '', goRef = null;
function renderSearch(){
  setTitle('Search'); back(true);
  V(`<div class="searchbox"><input id="q" placeholder="कृष्ण · krishna · dhīmahi · or 1.8.21 to jump" autocomplete="off"></div>
     <div class="qnorm" id="qn"></div><div class="chips" id="chips"></div><div id="hits"></div>`);
  const inp = document.getElementById('q'); inp.value = lastQ; inp.focus();
  inp.oninput = () => { lastQ = inp.value; doSearch(inp.value); };
  document.getElementById('chips').onclick = e => { const c = e.target.closest('[data-sk]');
    if (c){ skFilter = +c.dataset.sk === skFilter ? null : +c.dataset.sk; paintHits(); } };
  if (lastQ) doSearch(lastQ);
}
function doSearch(v){
  v = v.trim(); skFilter = null; goRef = null;
  if (!v){ lastHits = null; document.getElementById('hits').innerHTML = ''; document.getElementById('qn').textContent = ''; document.getElementById('chips').innerHTML=''; return; }
  // reference jump: "1.8.21" (verse) or "1.8" (chapter)
  const m = v.match(/^(\d{1,2})[.\s](\d{1,3})(?:[.\s](\d{1,4}))?$/);
  if (m){ goRef = { sk: +m[1], a: +m[2], v: m[3] ? +m[3] : null }; }
  const [a, k] = BhagNorm.normalizeQuery(v);
  document.getElementById('qn').textContent = `“${a}” / “${k}”`;
  // token-AND LIKE over regular columns — no FTS5 (sql.js builds lack the fts5 module).
  // Each token must BEGIN a word (start of string or after a space) — mirrors FTS `tok*`,
  // so a short skeleton like "rm" (rāma) matches word-initial "rm…" not mid-word "param"→prm.
  const run = (col, key) => {
    const toks = (key || '').split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    const where = toks.map(() => `(${col} LIKE ? OR ${col} LIKE ?)`).join(' AND ');
    const params = []; toks.forEach(t => params.push(t + '%', '% ' + t + '%'));
    return q(`SELECT skandha sk,adhyaya a,verse v,audio_id aid,text_dev txt
              FROM entries WHERE verse IS NOT NULL AND content_type='Bhagavatam' AND ${where} LIMIT 2000`, params);
  };
  const t1 = run('text_ascii', a);
  const seen = new Set(t1.map(r => r.sk + '.' + r.a + '.' + r.v));
  const t2 = run('text_skel', k).filter(r => !seen.has(r.sk + '.' + r.a + '.' + r.v));
  lastHits = { t1, t2 }; paintHits();
}
function paintHits(){
  if (!lastHits) return;
  const all = lastHits.t1.concat(lastHits.t2), n1 = lastHits.t1.length;
  const dist = {}; all.forEach(r => dist[r.sk] = (dist[r.sk] || 0) + 1);
  document.getElementById('chips').innerHTML = Object.keys(dist).sort((x, y) => x - y)
    .map(s => `<span class="chip ${+s === skFilter ? 'on' : ''}" data-sk="${s}">S${s}·${dist[s]}</span>`).join('');
  const shown = (skFilter ? all.filter(r => r.sk === skFilter) : all).slice(0, 300);
  document.getElementById('qn').dataset.n = all.length;
  const jump = goRef ? `<a class="hit gohit" href="#/s/${goRef.sk}/${goRef.a}${goRef.v ? '/' + goRef.v : ''}">
      <span class="r">→ ${goRef.sk}.${goRef.a}${goRef.v ? '.' + goRef.v : ''}</span><div>Go to this ${goRef.v ? 'śloka' : 'adhyāya'}</div></a>` : '';
  document.getElementById('hits').innerHTML = jump + `<div class="qnorm">${all.length} hits</div>` + shown.map((r, i) => {
    const elastic = all.indexOf(r) >= n1 ? '<span class="t2">elastic</span>' : '';
    return `<div class="hit"><a href="#/s/${r.sk}/${r.a}/${r.v}">` +
      `<span class="r">${r.sk}.${r.a}.${r.v}</span>${elastic}<div>${tr(r.txt.split('\n')[0])}</div></a></div>`;
  }).join('') || '<div class="empty">no matches</div>';
}

// ── Stotras ────────────────────────────────────────────────────────────────
function renderStotras(){
  setTitle('Prasiddha Stotras'); back(true);
  const rows = q("SELECT ordinal ord,title,skandha sk,adhyaya a,verse_start vs,verse_end ve,verse_count vc,standard_ref std,status FROM stotras WHERE status!='pending' ORDER BY ordinal");
  let html = '', curSk = null;
  for (const s of rows){
    if (s.sk !== curSk){ curSk = s.sk; html += `<div class="sectionsub" style="text-align:left;color:var(--accent);margin:16px 0 4px">Canto ${s.sk}</div>`; }
    html += `<a class="card" href="#/s/${s.sk}/${s.a}/${s.vs}"><div><div class="lead" style="font-size:18px">${trStotra(s.ord, s.title)}</div>
      <div class="sub">${s.sk}.${s.a}.${s.vs}–${s.ve} · ${s.vc} ślokas</div></div><div class="meta">›</div></a>`;
  }
  V(html);
}

// ── Anukramaṇikā (śloka index: ādi opening / anta closing) ──────────────────
let anuAll = null, anuBuckets = null, anuMode = 'adi', anuLetter = null;
// closing line with its trailing ॥ number-markers stripped (mirrors build_preview.anta_line)
const antaLine = t => ((t || '').split('\n').pop() || '')
  .replace(/॥\s*[०-९0-9/–—\-\s]*॥?\s*$/u, '').replace(/[ ।॥‌‍]+$/u, '').trim();
const anuClean = s => (s || '').replace(/^[^ऀ-ॿ]+/, '').trim();   // drop leading non-Devanāgarī
function anuRows(){
  if (!anuAll) anuAll = q("SELECT skandha sk,adhyaya a,verse v,text_dev t FROM entries WHERE verse IS NOT NULL AND content_type='Bhagavatam' ORDER BY skandha,adhyaya,verse");
  return anuAll;
}
function buildAnuBuckets(){
  anuBuckets = {};
  for (const r of anuRows()){
    const line = anuMode === 'adi' ? (r.t || '').split('\n')[0] : antaLine(r.t);
    const key = anuClean(line); if (!key) continue;
    (anuBuckets[key[0]] = anuBuckets[key[0]] || []).push({ key, ref: `${r.sk}.${r.a}.${r.v}`, line });
  }
  for (const b in anuBuckets) anuBuckets[b].sort((x, y) => x.key < y.key ? -1 : x.key > y.key ? 1 : 0);
}
// landing: three indexes
// Index terms: in-script Sanskrit (the shared scripture vocabulary) for Indian languages,
// plain English for the English rendition. L(key) picks the right form for the current script.
const SA = { idx:'अनुक्रमणिका', aksara:'अक्षर', vakta:'वक्ता', visaya:'विषय', adi:'आदि', anta:'अन्त',
  slokas:'श्लोकाः', vaktrs:'वक्तारः', visayas:'विषयाः', adhyayas:'अध्यायाः', skandha:'स्कन्धः', mylist:'मम सूची',
  synopsis:'विषयसूची', skn:'स्कन्ध', adh:'अध्याय', padas:'पदानि',
  aksaraIdx:'अक्षरानुक्रमणिका', vaktraIdx:'वक्त्रनुक्रमणिका', visayaIdx:'विषयानुक्रमणिका', padaIdx:'पदानुक्रमणिका' };  // proper tatpuruṣa compounds
const SA_EN = { idx:'Index', aksara:'Akṣara', vakta:'Speaker', visaya:'Topic', adi:'Ādi', anta:'Anta',
  slokas:'ślokas', vaktrs:'speakers', visayas:'topics', adhyayas:'adhyāyas', skandha:'Skandha', mylist:'My List',
  synopsis:'Synopsis', skn:'Skandha', adh:'Adhyāya', padas:'words',
  aksaraIdx:'Akṣara index', vaktraIdx:'Speaker index', visayaIdx:'Topic index', padaIdx:'Word index' };
const L = key => script === 'en' ? SA_EN[key] : tr(SA[key]);
// skandha/adhyāya display name: traditional Sanskrit heading only for Devanāgarī; else "Skandha N"
const skName = (sk, dev) => script === 'deva' ? tr(dev || ('स्कन्ध ' + sk)) : `${L('skn')} ${sk}`;
const adhName = (a, dev) => script === 'deva' ? tr(dev || ('अध्याय ' + a)) : `${L('adh')} ${a}`;
function renderAnukramaHome(){
  setTitle(L('idx')); back(true);
  const nT = q('SELECT COUNT(*) c FROM topics')[0].c;
  const nS = q('SELECT COUNT(*) c FROM speakers WHERE verse_count>0')[0].c;
  const nV = anuRows().length;
  const card = (href, lead, sub) => `<a class="card" href="${href}"><div>
      <div class="lead" style="font-size:19px">${lead}</div><div class="sub">${sub}</div></div><div class="meta">›</div></a>`;
  V(`<div class="sectionhdr">${L('idx')}</div>
     <div class="sectionsub">${L('aksara')} · ${L('vakta')} · ${L('visaya')}</div>`
    + card('#/anukrama/aksara',  L('aksaraIdx'), `${nV.toLocaleString()} ${L('slokas')}`)
    + card('#/anukrama/speakers',L('vaktraIdx'), `${nS} ${L('vaktrs')}`)
    + card('#/anukrama/topics',  L('visayaIdx'), `${nT.toLocaleString()} ${L('visayas')}`)
    + card('#/anukrama/pada',    L('padaIdx'),   `${L('padas')} · word concordance`));
}

function renderAksaraIndex(){
  setTitle(L('aksaraIdx')); back(true);
  anuMode = 'adi';                                   // opening (ādi) index only
  buildAnuBuckets();
  const letters = Object.keys(anuBuckets).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  if (anuLetter && !anuBuckets[anuLetter]) anuLetter = null;
  V(`<div class="anu-h"><span class="anu-n">${anuRows().length.toLocaleString()} ${L('slokas')}</span></div>
     <div class="anu-letters" id="anuL">${letters.map(k => `<span class="ltr ${k === anuLetter ? 'on' : ''}" data-l="${k}">${tr(k)}</span>`).join('')}</div>
     <div id="anuList"></div>`);
  document.getElementById('anuL').onclick = e => { const l = e.target.closest('[data-l]'); if (!l) return;
    anuLetter = l.dataset.l;
    document.querySelectorAll('#anuL .ltr').forEach(x => x.classList.toggle('on', x.dataset.l === anuLetter));
    paintAnuList(); };
  paintAnuList();
}
function paintAnuList(){
  const el = document.getElementById('anuList'); if (!el) return;
  if (!anuLetter || !anuBuckets[anuLetter]){ el.innerHTML = `<div class="empty">↑ ${L('aksara')}</div>`; return; }
  const rows = anuBuckets[anuLetter], CAP = 600;
  el.innerHTML = rows.slice(0, CAP).map(r =>
      `<a class="hit" href="#/s/${r.ref.replace(/\./g, '/')}"><span class="r">${r.ref}</span><div>${tr(r.line)}</div></a>`).join('')
    + (rows.length > CAP ? `<div class="empty">+${rows.length - CAP} more in this akṣara</div>` : '');
}

// speaker-wise (vaktā) — who speaks, and where
function renderSpeakerIndex(){
  setTitle(L('vaktraIdx')); back(true);
  const rows = q('SELECT id,name_dev n,verse_count c FROM speakers WHERE verse_count>0 ORDER BY verse_count DESC');
  V(`<div class="sectionsub" style="text-align:left;color:var(--accent)">${L('vaktrs')} · ${rows.length}</div>`
    + rows.map(s => `<a class="card" href="#/anukrama/speaker/${s.id}">
        <div><div class="lead" style="font-size:19px">${tr(s.n)}</div>
        <div class="sub">${s.c.toLocaleString()} ${L('slokas')}</div></div><div class="meta">›</div></a>`).join(''));
}
function renderSpeakerDetail(id){
  const sp = q('SELECT name_dev n,verse_count c FROM speakers WHERE id=?', [id])[0];
  if (!sp){ location.hash = '#/anukrama/speakers'; return; }
  setTitle(tr(sp.n)); back(true);
  // chapters where this speaker speaks, with their śloka count + first verse there
  const ch = q(`SELECT skandha sk,adhyaya a,COUNT(*) c,MIN(verse) v0 FROM entries
                WHERE speaker_id=? AND verse IS NOT NULL GROUP BY skandha,adhyaya ORDER BY skandha,adhyaya`, [id]);
  V(`<div class="sectionsub" style="text-align:left;color:var(--accent)">${tr(sp.n)} · ${sp.c.toLocaleString()} ${L('slokas')} · ${ch.length} ${L('adhyayas')}</div>`
    + ch.map(r => { const ad = q('SELECT heading_dev h FROM adhyayas WHERE skandha=? AND adhyaya=?', [r.sk, r.a])[0] || {};
        return `<a class="card" href="#/s/${r.sk}/${r.a}/${r.v0}"><div>
          <div class="lead" style="font-size:17px">${adhName(r.a, ad.h)}</div>
          <div class="sub">${r.sk}.${r.a} · ${r.c} ${L('slokas')}</div></div><div class="meta">›</div></a>`; }).join(''));
}

// topic-wise (viṣaya) — all 1,041 topics, grouped by skandha
// raw (unescaped) translated topic text — for both display (re-escaped) and the search key
function rawTopic(id, dev){
  for (const lang of langChain()){
    const r = q('SELECT text FROM topic_tr WHERE topic_id=? AND lang=?', [id, lang])[0];
    if (r) return r.text;
  }
  return tr(dev);
}
let topicIdxCache = null, topicIdxLang = null;
function ensureTopicIdx(){
  if (topicIdxCache && topicIdxLang === script) return topicIdxCache;   // rebuild only when language changes
  const rows = q('SELECT id,skandha sk,adhyaya a,verse_start vs,verse_end ve,text_dev t FROM topics ORDER BY skandha,adhyaya,ordinal');
  const norm = window.BhagNorm;
  topicIdxCache = rows.map(t => {
    const disp = rawTopic(t.id, t.t);
    const rng = t.vs == null ? '' : (t.vs === t.ve ? t.vs : `${t.vs}–${t.ve}`);
    const href = t.vs == null ? `#/s/${t.sk}/${t.a}` : `#/s/${t.sk}/${t.a}/${t.vs}`;
    const ref = `${t.sk}.${t.a}${rng !== '' ? '.' + rng : ''}`;
    let key = disp;                                       // match the displayed (translated) text…
    if (norm){ const asc = norm.devToAscii(t.t || ''); key += ' ' + asc + ' ' + norm.asciiToSkel(asc); }  // …and the Sanskrit (roman + skeleton) for cross-script
    return { sk: t.sk, disp, ref, href, key: key.toLowerCase() };
  });
  topicIdxLang = script;
  return topicIdxCache;
}
function renderTopicIndex(){
  setTitle(L('visayaIdx')); back(true);
  const items = ensureTopicIdx();
  const paint = (filter) => {
    const ql = filter.trim().toLowerCase();
    let qa = '', qk = '';
    if (ql && window.BhagNorm){ const nq = BhagNorm.normalizeQuery(filter); qa = (nq[0] || '').toLowerCase(); qk = (nq[1] || '').toLowerCase(); }
    let html = '', curSk = null, n = 0;
    for (const it of items){
      if (ql && !(it.key.includes(ql) || (qa && it.key.includes(qa)) || (qk && it.key.includes(qk)))) continue;
      if (it.sk !== curSk){ curSk = it.sk; html += `<div class="sectionsub" style="text-align:left;color:var(--accent);margin:18px 0 4px">${L('skandha')} ${it.sk}</div>`; }
      html += `<a class="tindex-row" href="${it.href}"><span class="rng">${it.ref}</span><span>${esc(it.disp)}</span></a>`;
      n++;
    }
    return n ? html : `<div class="empty">—</div>`;
  };
  V(`<div class="searchbox"><input id="tq" type="search" placeholder="${esc(L('visayaIdx'))} · search" autocomplete="off"></div><div id="tlist">${paint('')}</div>`);
  const inp = document.getElementById('tq');
  inp.oninput = () => { document.getElementById('tlist').innerHTML = paint(inp.value); };
}

// ── Pada-wise (word concordance) — built lazily in memory, avyayas stripped ──
let padaCache = null, AVY = null, padaLetter = null;
async function ensurePadaIndex(){
  if (padaCache) return;
  if (!AVY){ try { AVY = new Set(await (await fetch('avyayas.json', { cache: 'force-cache' })).json()); } catch (e){ AVY = new Set(); } }
  const rows = q("SELECT skandha sk,adhyaya a,verse v,text_dev t FROM entries WHERE verse IS NOT NULL AND content_type='Bhagavatam' ORDER BY skandha,adhyaya,verse");
  const strip = /[०-९0-9।॥/]/g, map = {};
  for (const r of rows){
    const ref = `${r.sk}.${r.a}.${r.v}`, seen = new Set();
    for (const line of (r.t || '').split('\n')){
      for (let w of line.split(/\s+/)){
        w = w.replace(strip, '').trim(); if (!w) continue;
        const c0 = w.codePointAt(0); if (c0 < 0x0900 || c0 > 0x097F) continue;
        if (AVY.has(w) || seen.has(w)) continue; seen.add(w);
        (map[w] = map[w] || []).push(ref);
      }
    }
  }
  const buckets = {};
  for (const w in map){ const k = w[0]; (buckets[k] = buckets[k] || []).push(w); }
  for (const k in buckets) buckets[k].sort((x, y) => x < y ? -1 : x > y ? 1 : 0);
  const allWords = Object.keys(map).sort((x, y) => x < y ? -1 : x > y ? 1 : 0);
  // precompute each word's consonant skeleton so the filter accepts ANY script (incl. roman)
  const skel = window.BhagNorm ? (w => BhagNorm.asciiToSkel(BhagNorm.devToAscii(w))) : (w => w);
  const allMeta = allWords.map(w => ({ w, k: skel(w) }));
  padaCache = { map, buckets, allMeta, n: allWords.length };
}
async function renderPadaIndex(){
  setTitle(L('padaIdx')); back(true);
  if (!padaCache) V('<div class="empty">building word index…</div>');
  await ensurePadaIndex();
  if (!/^#\/?anukrama\/pada/.test(location.hash)) return;       // navigated away mid-build
  const letters = Object.keys(padaCache.buckets).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
  if (padaLetter && !padaCache.buckets[padaLetter]) padaLetter = null;
  V(`<div class="searchbox"><input id="padaFilter" placeholder="type a word to filter — कृष्ण · ${tr('कृष्ण')}" autocomplete="off"></div>
     <div class="anu-h"><span class="anu-n">${padaCache.n.toLocaleString()} ${L('padas')}</span></div>
     <div class="anu-letters" id="padaL">${letters.map(k => `<span class="ltr ${k === padaLetter ? 'on' : ''}" data-l="${k}">${tr(k)}</span>`).join('')}</div>
     <div id="padaList"></div>`);
  document.getElementById('padaFilter').oninput = () => paintPadaList();
  document.getElementById('padaL').onclick = e => { const l = e.target.closest('[data-l]'); if (!l) return;
    padaLetter = l.dataset.l; const f = document.getElementById('padaFilter'); if (f) f.value = '';
    document.querySelectorAll('#padaL .ltr').forEach(x => x.classList.toggle('on', x.dataset.l === padaLetter));
    paintPadaList(); };
  paintPadaList();
}
function paintPadaList(){
  const el = document.getElementById('padaList'); if (!el) return;
  const f = document.getElementById('padaFilter'), fval = f ? f.value.trim() : '';
  let words;
  if (fval){                                          // type-ahead: exact-script prefix first…
    const raw = window.BhagNorm ? BhagNorm.scriptToDev(fval) : fval;
    words = padaCache.allMeta.filter(o => o.w.startsWith(raw)).map(o => o.w);
    if (!words.length && window.BhagNorm){            // …else fall back to skeleton (roman/typo)
      const kq = BhagNorm.normalizeQuery(fval)[1] || '';
      if (kq) words = padaCache.allMeta.filter(o => o.k.startsWith(kq)).map(o => o.w);
    }
  } else if (padaLetter && padaCache.buckets[padaLetter]){
    words = padaCache.buckets[padaLetter];
  } else {
    el.innerHTML = `<div class="empty">↑ pick an akṣara, or type a word above</div>`; return;
  }
  if (!words.length){ el.innerHTML = '<div class="empty">no matching words</div>'; return; }
  el.innerHTML = words.map(w =>            // full list (scrollable) — no cap
      `<div class="pada"><button class="pada-w" data-w="${w}"><span class="pw">${tr(w)}</span><span class="ct">${padaCache.map[w].length}</span></button><div class="pada-occ"></div></div>`).join('');
  el.onclick = e => { const b = e.target.closest('.pada-w'); if (!b) return;
    const occ = b.nextElementSibling;
    if (occ.innerHTML){ occ.innerHTML = ''; b.classList.remove('open'); return; }
    b.classList.add('open');
    const refs = padaCache.map[b.dataset.w] || [], OCAP = 100;
    occ.innerHTML = refs.slice(0, OCAP).map(ref => { const [sk, a, v] = ref.split('.');
        const row = q('SELECT text_dev t FROM entries WHERE skandha=? AND adhyaya=? AND verse=? LIMIT 1', [+sk, +a, +v])[0];
        return `<a class="pada-hit" href="#/s/${sk}/${a}/${v}"><span class="r">${ref}</span><span>${tr(row ? row.t.split('\n')[0] : ref)}</span></a>`; }).join('')
      + (refs.length > OCAP ? `<div class="empty">+${refs.length - OCAP} more occurrences</div>` : '');
  };
}

// ── Library (bookmarks + speakers + indexes entry) ─────────────────────────
// "My List" hub — named lists (native) + bookmarks (all) + offline audio (native)
function renderMyList(){
  setTitle(tabLabel('lists')); back(true);
  let html = '';
  if (isNative){
    html += `<div class="newlist nl-top">
        <input id="nlName" placeholder="Name a new list — e.g. Morning pārāyaṇa" autocomplete="off">
        <button id="nlGo" class="selact">${ICON.plus}<span>Create</span></button>
      </div>`;
    html += lists.length ? lists.map(l => `<a class="card" href="#/lists/${l.id}">
          <div><div class="lead" style="font-size:19px">${esc(l.name)}</div>
          <div class="sub">${l.items.length} ${l.items.length === 1 ? 'śloka' : 'ślokas'}</div></div>
          <button class="iconbtn rm" data-id="${l.id}" title="delete">${ICON.trash}</button></a>`).join('')
      : '<div class="empty">No lists yet. Create one above, or open any adhyāya and tap “Select ślokas”.</div>';
  }
  html += `<div class="sectionsub" style="text-align:left;color:var(--accent);margin-top:${isNative ? '18px' : '2px'}">Bookmarks · ${bookmarks.length}</div>
     <div>${bookmarks.length ? bookmarks.map(b => `<a class="card" href="#/s/${b.ref.split('.')[0]}/${b.ref.split('.')[1]}">
        <div><div class="lead" style="font-size:17px">${tr(b.line || b.ref)}</div><div class="sub">${b.ref}</div></div>
        <button class="iconbtn bmrm" data-ref="${b.ref}">${ICON.close}</button></a>`).join('') : '<div class="empty">tap the bookmark on a verse to save it</div>'}</div>`;
  const dlEntries = Object.entries(downloads);
  if (isNative && dlEntries.length){
    html += `<div class="sectionsub" style="text-align:left;color:var(--accent);margin-top:18px">Offline audio · ${dlEntries.length}</div>
       <div>` + dlEntries.map(([k, d]) => { const [sk, a] = k.split('.');
        const ad = q('SELECT heading_dev h FROM adhyayas WHERE skandha=? AND adhyaya=?', [+sk, +a])[0] || {};
        return `<div class="card"><div><div class="lead" style="font-size:17px">${adhName(a, ad.h)}</div>
          <div class="sub">${sk}.${a} · ${d.n} ślokas saved</div></div>
          <button class="iconbtn dlrm" data-k="${k}" title="remove">${ICON.trash}</button></div>`; }).join('') + '</div>';
  }
  html += `<a class="card" href="#/about" style="margin-top:22px"><div><div class="lead" style="font-size:16px">About · Acknowledgement</div>
      <div class="sub">Bhāgavata-VāNi · credits</div></div><div class="meta">›</div></a>`;
  V(html);
  if (isNative){
    const inp = document.getElementById('nlName');
    const go = () => { const nm = inp.value.trim(); if (!nm) return inp.focus(); const id = createList(nm, []); location.hash = '#/lists/' + id; };
    document.getElementById('nlGo').onclick = go;
    inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  document.getElementById('view').onclick = async e => {
    const dl = e.target.closest('.dlrm');
    if (dl){ const [sk, a] = dl.dataset.k.split('.'); await removeDownload(+sk, +a); toast('offline audio removed'); renderMyList(); return; }
    const bm = e.target.closest('.bmrm');
    if (bm){ e.preventDefault(); bookmarks = bookmarks.filter(b => b.ref !== bm.dataset.ref); save('bhag_bookmarks', bookmarks); renderMyList(); return; }
    const li = e.target.closest('.rm');
    if (li){ e.preventDefault(); e.stopPropagation(); if (confirm('Delete this list?')){ deleteList(li.dataset.id); renderMyList(); } }
  };
}

// ── bookmarks ──────────────────────────────────────────────────────────────
function toggleBookmark(ref, el){
  const i = bookmarks.findIndex(b => b.ref === ref);
  if (i >= 0) bookmarks.splice(i, 1);
  else { const [sk, a, v] = ref.split('.'); const row = q('SELECT text_dev t FROM entries WHERE skandha=? AND adhyaya=? AND verse=? LIMIT 1', [+sk, +a, +v])[0];
    bookmarks.unshift({ ref, line: row ? row.t.split('\n')[0] : ref }); }
  save('bhag_bookmarks', bookmarks);
  if (el) el.classList.toggle('on', i < 0);
}

// ── My Lists (native only: user-named śloka collections) ────────────────────
const saveLists = () => save('bhag_lists', lists);
let selectMode = false;
const selected = new Set();

function enterSelect(){
  selectMode = true; selected.clear();
  document.body.classList.add('selecting');
  document.getElementById('player').classList.remove('on');   // selbar takes its place
  updateSelbar();
}
function exitSelect(){
  const was = selectMode;
  selectMode = false; selected.clear();
  if (!was) return;                                  // nothing to tear down
  document.body.classList.remove('selecting');
  const sb = document.getElementById('selbar'); if (sb) sb.classList.remove('on');
  document.querySelectorAll('.v.sel').forEach(v => v.classList.remove('sel'));
  const b = document.getElementById('selBtn');
  if (b){ b.classList.remove('on'); const sp = b.querySelector('span'); if (sp) sp.textContent = 'Select ślokas'; }
  if (chapterAudio.length && /^#\/?s\/[^/]+\/[^/]+/.test(location.hash)) showChapterPlayer();
}
function toggleSel(ref, el){
  if (selected.has(ref)){ selected.delete(ref); el.classList.remove('sel'); }
  else { selected.add(ref); el.classList.add('sel'); }
  updateSelbar();
}
function updateSelbar(){
  const sb = document.getElementById('selbar'); if (!sb) return;
  sb.classList.toggle('on', selectMode);
  document.getElementById('selcount').textContent = `${selected.size} selected`;
  const b = document.getElementById('selBtn'); if (b){ const sp = b.querySelector('span');
    if (sp) sp.textContent = selectMode ? 'Done selecting' : 'Select ślokas'; b.classList.toggle('on', selectMode); }
}

function createList(name, refs){
  const id = 'l' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  lists.unshift({ id, name, items: [...new Set(refs)], ts: Date.now() });
  saveLists(); toast(`created “${name}”`); exitSelect();
  return id;
}
function addToList(id, refs){
  const l = lists.find(x => x.id === id); if (!l) return;
  const set = new Set(l.items); let added = 0;
  refs.forEach(r => { if (!set.has(r)){ set.add(r); l.items.push(r); added++; } });
  saveLists(); toast(added ? `added ${added} to “${l.name}”` : 'already in that list'); exitSelect();
}
function removeFromList(id, ref){ const l = lists.find(x => x.id === id); if (!l) return;
  l.items = l.items.filter(r => r !== ref); saveLists(); }
function renameList(id, name){ const l = lists.find(x => x.id === id); if (l){ l.name = name; saveLists(); } }
function deleteList(id){ lists = lists.filter(x => x.id !== id); saveLists(); }

// bottom sheet: pick an existing list or name a new one
function openListSheet(refs, label){
  refs = [...new Set(refs.filter(r => r && !r.endsWith('.null') && !r.endsWith('.')))];
  if (!refs.length) return toast('nothing to add');
  const rows = lists.map(l => `<button class="sheet-row" data-id="${l.id}">
      <span class="nm">${esc(l.name)}</span><span class="ct">${l.items.length}</span></button>`).join('')
    || '<div class="sheet-empty">no lists yet — name one below</div>';
  const ov = document.createElement('div'); ov.className = 'sheet-ov';
  ov.innerHTML = `<div class="sheet">
      <div class="sheet-h">Add ${esc(label || refs.length + (refs.length > 1 ? ' ślokas' : ' śloka'))} to…</div>
      <div class="sheet-rows">${rows}</div>
      <div class="newlist">
        <input id="sheetName" placeholder="or name a new list" autocomplete="off">
        <button id="sheetCreate" class="selact">${ICON.plus}<span>Create</span></button>
      </div></div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.onclick = e => { if (e.target === ov) close(); };
  ov.querySelector('.sheet-rows').onclick = e => { const r = e.target.closest('[data-id]');
    if (r){ addToList(r.dataset.id, refs); close(); } };
  const inp = ov.querySelector('#sheetName');
  const create = () => { const nm = inp.value.trim(); if (!nm) return inp.focus(); createList(nm, refs); close(); };
  ov.querySelector('#sheetCreate').onclick = create;
  inp.onkeydown = e => { if (e.key === 'Enter') create(); };
  setTimeout(() => inp.focus(), 40);
}


function renderListDetail(id){
  const l = lists.find(x => x.id === id);
  if (!l){ location.hash = '#/lists'; return; }
  setTitle(esc(l.name)); back(true);
  let html = `<div class="r-tools">
      <button class="rtool" id="lrename">${ICON.edit}<span>Rename</span></button>
      <button class="rtool" id="ldelete">${ICON.trash}<span>Delete list</span></button>
    </div>
    <div class="newlist" id="lrenameBox" style="display:none">
      <input id="lrenameIn" autocomplete="off"><button id="lrenameGo" class="selact"><span>Save</span></button>
    </div>`;
  html += l.items.length
    ? l.items.map(ref => { const [sk, a, v] = ref.split('.');
        const row = q('SELECT text_dev t FROM entries WHERE skandha=? AND adhyaya=? AND verse=? LIMIT 1', [+sk, +a, +v])[0];
        const line = row ? row.t.split('\n')[0] : ref;
        return `<a class="card" href="#/s/${sk}/${a}/${v}">
          <div><div class="lead" style="font-size:18px">${tr(line)}</div><div class="sub">${esc(ref)}</div></div>
          <button class="iconbtn rm" data-ref="${esc(ref)}" title="remove">${ICON.close}</button></a>`; }).join('')
    : '<div class="empty">This list is empty. Open an adhyāya, tap “Select ślokas”, and add some.</div>';
  V(html);
  const box = document.getElementById('lrenameBox'), rin = document.getElementById('lrenameIn');
  document.getElementById('lrename').onclick = () => {
    const open = box.style.display === 'none'; box.style.display = open ? 'flex' : 'none';
    if (open){ rin.value = l.name; rin.focus(); } };
  const doRename = () => { const nm = rin.value.trim(); if (!nm) return rin.focus(); renameList(id, nm); renderListDetail(id); };
  document.getElementById('lrenameGo').onclick = doRename;
  rin.onkeydown = e => { if (e.key === 'Enter') doRename(); };
  document.getElementById('ldelete').onclick = () => { if (confirm(`Delete “${l.name}”?`)){ deleteList(id); location.hash = '#/lists'; } };
  document.getElementById('view').onclick = e => { const x = e.target.closest('.rm');
    if (x){ e.preventDefault(); e.stopPropagation(); removeFromList(id, x.dataset.ref); renderListDetail(id); } };
}

// ── share a verse (as an image, with text fallback) ─────────────────────────
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
function wrapText(ctx, text, maxW){
  const words = text.split(/(\s+)/); const out = []; let line = '';
  for (const w of words){
    if (line && ctx.measureText(line + w).width > maxW){ out.push(line.trim()); line = w.trimStart(); }
    else line += w;
  }
  if (line.trim()) out.push(line.trim());
  return out.length ? out : [text];
}
async function verseImage(srcLines, refLabel){
  const S = 1080, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fbf7ef'; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#d8b89a'; ctx.lineWidth = 6; ctx.strokeRect(28, 28, S - 56, S - 56);
  try { const img = await loadImg('icon-512.png'); const d = 168; ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, 160, d / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, S / 2 - d / 2, 160 - d / 2, d, d); ctx.restore(); } catch (e){}
  const FONT = '"Noto Serif Devanagari","Noto Serif Kannada","Noto Serif Telugu","Noto Serif Tamil","Noto Serif Malayalam","Noto Serif Bengali","Noto Serif Gujarati",Georgia,serif';
  try { await document.fonts.ready; } catch (e){}
  ctx.fillStyle = '#33271b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let fs = 48, wrapped = [];
  const rewrap = () => { ctx.font = `${fs}px ${FONT}`; wrapped = []; for (const ln of srcLines) wrapped.push(...wrapText(ctx, ln, S - 180)); };
  rewrap();
  while (wrapped.length * fs * 1.5 > 600 && fs > 26){ fs -= 2; rewrap(); }
  const lh = fs * 1.5, startY = S / 2 - (wrapped.length - 1) * lh / 2;
  ctx.font = `${fs}px ${FONT}`;
  wrapped.forEach((w, i) => ctx.fillText(w, S / 2, startY + i * lh));
  ctx.fillStyle = '#a4502b'; ctx.font = `30px ${FONT}`;
  ctx.fillText(`॥ Śrīmad Bhāgavatam ${refLabel} ॥`, S / 2, S - 158);
  ctx.fillStyle = '#8a7d6b'; ctx.font = '26px Georgia, serif';
  ctx.fillText('Bhāgavata-VāNi', S / 2, S - 112);
  return await new Promise(res => cv.toBlob(res, 'image/png'));
}
async function shareVerse(ref){
  const [sk, a, v] = ref.split('.');
  const row = q('SELECT text_dev t FROM entries WHERE skandha=? AND adhyaya=? AND verse=? LIMIT 1', [+sk, +a, +v])[0];
  if (!row) return;
  const srcLines = row.t.split('\n').map(l => tr(l));
  const text = `${srcLines.join('\n')}\n— Śrīmad Bhāgavatam ${ref}\nBhāgavata-VāNi`;
  let blob = null; try { blob = await verseImage(srcLines, ref); } catch (e){}
  try {
    if (blob && navigator.canShare){ const file = new File([blob], `bhagavatam-${ref}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })){ await navigator.share({ files: [file], text }); return; } }
    if (navigator.share){ await navigator.share({ title: 'Śrīmad Bhāgavatam', text }); return; }
  } catch (e){ if (e && e.name === 'AbortError') return; }
  if (blob){ const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = `bhagavatam-${ref}.png`; link.click(); URL.revokeObjectURL(url); toast('verse image saved'); }
  else { try { await navigator.clipboard.writeText(text); toast('verse copied'); } catch (e){ toast('sharing not supported here'); } }
}

// ── toast ──────────────────────────────────────────────────────────────────
let toastT;
function toast(msg){
  let el = document.getElementById('toast');
  if (!el){ el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el);
    el.style.cssText = 'position:fixed;bottom:130px;left:50%;transform:translateX(-50%);background:#2b2018;color:#fff;padding:9px 16px;border-radius:20px;font-size:13px;z-index:40;opacity:0;transition:opacity .2s'; }
  el.textContent = msg; el.style.opacity = '1'; clearTimeout(toastT);
  toastT = setTimeout(() => el.style.opacity = '0', 2200);
}
