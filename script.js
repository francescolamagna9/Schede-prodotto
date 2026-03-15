/* =============================================
   SchedeProdotto.ai — script.js
   Gemini 2.0 Flash API | GitHub Pages ready
   ============================================= */

const SEC_COLORS = ['#ff6b35','#a78bfa','#e8ff47','#38bdf8','#f472b6','#fb923c','#4ade80','#fbbf24','#c084fc'];

let currentTone = 'Professionale e autorevole';
let researchMode = false;
let researchData = null;
let csvRows = [];
let csvHeaders = [];
let multiResults = [];

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  // Restore API key from localStorage
  const saved = localStorage.getItem('groq_api_key');
  if (saved) document.getElementById('apikey').value = saved;
});

/* ===== API KEY ===== */
function saveKey() {
  const k = document.getElementById('apikey').value.trim();
  if (k) localStorage.setItem('groq_api_key', k);
}

function getKey() {
  const k = document.getElementById('apikey').value.trim();
  if (!k) {
    alert('Inserisci la tua API Key Gemini nella barra gialla in cima!\n\nOttienila gratis su: console.groq.com/keys');
    return null;
  }
  return k;
}

/* ===== TABS ===== */
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
}

/* ===== TONE ===== */
function pickTone(el) {
  document.querySelectorAll('.tone-grid .tone').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  currentTone = el.getAttribute('data-t');
}

/* ===== RESEARCH TOGGLE ===== */
function toggleRes() {
  researchMode = !researchMode;
  document.getElementById('rpill').classList.toggle('active', researchMode);
  document.getElementById('rbadge').style.display = researchMode ? 'block' : 'none';
  document.getElementById('rinfo').style.display = researchMode ? 'block' : 'none';
  document.getElementById('rtog').classList.toggle('active', researchMode);
  document.getElementById('feat-hint').textContent = researchMode ? "l'AI completerà in autonomia" : 'opzionale';
  document.getElementById('btn-single-lbl').textContent = researchMode ? '🔍 Ricerca & Genera' : '✦ Genera Scheda';
  researchData = null;
}

/* ===== GET ACTIVE SECTIONS ===== */
function getActiveSections(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} .tag.active`))
    .map(b => b.textContent.trim());
}

/* ===== CALL GROQ API ===== */
async function callGemini(prompt) {
  const key = getKey();
  if (!key) throw new Error('API key mancante');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

/* ===== BUILD RESEARCH PROMPT ===== */
function buildResearchPrompt(name, cat, extra) {
  return `Sei un esperto ricercatore di prodotti e-commerce italiani.
Analizza il prodotto indicato e restituisci ESCLUSIVAMENTE un oggetto JSON valido.
Nessun testo prima o dopo. Nessun markdown. Nessun backtick.

PRODOTTO: ${name}
CATEGORIA: ${cat || 'da determinare'}
INFO AGGIUNTIVE: ${extra || 'nessuna'}

JSON da restituire (compila tutti i campi con dati reali e precisi):
{
  "categoria_confermata": "categoria esatta del prodotto",
  "tipologia": "descrizione in una riga di cosa è il prodotto",
  "caratteristiche_principali": ["caratteristica 1","caratteristica 2","caratteristica 3","caratteristica 4","caratteristica 5"],
  "materiali_composizione": "materiali o ingredienti principali",
  "fascia_prezzo": "fascia prezzo tipica nel mercato italiano (es: 20-50€)",
  "benefici_chiave": ["beneficio 1","beneficio 2","beneficio 3"],
  "keywords_seo": ["keyword 1","keyword 2","keyword 3","keyword 4"],
  "competitor_tipici": "brand o prodotti simili nel mercato italiano",
  "note_copywriting": "angolo persuasivo e tone of voice consigliato per questo prodotto"
}`;
}

/* ===== BUILD COPY PROMPT ===== */
function buildCopyPrompt(name, feats, cat, notes, tone, sections, research) {
  let p = `Sei un copywriter e-commerce esperto, specializzato in SEO per WooCommerce e WordPress.
Scrivi SEMPRE in italiano. Tono: ${tone}.\n\n`;

  if (research) {
    p += `DATI RICERCA PRODOTTO (usa questi come base principale):\n`;
    p += `Nome: ${name}\n`;
    p += `Categoria: ${research.categoria_confermata || cat || 'Generale'}\n`;
    p += `Tipologia: ${research.tipologia || ''}\n`;
    p += `Caratteristiche: ${(research.caratteristiche_principali || []).join(', ')}\n`;
    if (research.materiali_composizione) p += `Materiali: ${research.materiali_composizione}\n`;
    p += `Benefici: ${(research.benefici_chiave || []).join(', ')}\n`;
    p += `Keywords SEO principali: ${(research.keywords_seo || []).join(', ')}\n`;
    p += `Fascia prezzo: ${research.fascia_prezzo || 'n/d'}\n`;
    p += `Angolo copy consigliato: ${research.note_copywriting || ''}\n`;
    if (feats) p += `Dettagli aggiuntivi dal cliente: ${feats}\n`;
  } else {
    p += `PRODOTTO: ${name}\n`;
    p += `CATEGORIA: ${cat || 'Generale'}\n`;
    p += `CARATTERISTICHE: ${feats || 'Deduci dal nome del prodotto usando la tua conoscenza'}\n`;
  }

  if (notes) p += `NOTE BRAND: ${notes}\n`;

  p += `\nGenera SOLO le sezioni richieste. Usa questo formato esatto:\n### NOME SEZIONE\n[contenuto]\n\nSEZIONI RICHIESTE:\n`;
  sections.forEach(s => { p += `- ${s}\n`; });

  p += `\nREGOLE PER OGNI SEZIONE:
- Titolo SEO: max 65 caratteri. Include keyword principale. Accattivante e descrittivo.
- Descrizione breve: 2-3 frasi emozionali. Max 160 caratteri. Beneficio principale in primo piano.
- Descrizione completa: MINIMO 4 paragrafi ricchi e dettagliati.
  Paragrafo 1 — Presentazione: presenta il prodotto, il contesto di utilizzo e il problema che risolve.
  Paragrafo 2 — Caratteristiche: descrivi le caratteristiche tecniche principali con dettagli concreti.
  Paragrafo 3 — Benefici: spiega i benefici reali per chi lo usa nella vita quotidiana.
  Paragrafo 4 — CTA: chiudi con una call to action persuasiva e coinvolgente.
- Bullet point vantaggi: esattamente 6 punti. Ogni punto inizia con emoji pertinente. Max 15 parole a punto. Focus su benefici differenzianti.
- Specifiche tecniche: formato "Etichetta: valore" (es: Peso: 280g). Minimo 6-8 specifiche rilevanti.
- Meta description SEO: max 155 caratteri. Include keyword principale e CTA.
- FAQ (3 domande): 3 domande reali che i clienti fanno. Risposte sintetiche ma esaustive.
- Testo per categoria: paragrafo introduttivo 80-120 parole per la pagina categoria WooCommerce.
- Alt text immagine: descrittivo, keyword inclusa, max 120 caratteri.`;

  return p;
}

/* ===== PARSE SECTIONS ===== */
function parseSections(text) {
  const out = {};
  const re = /###\s*([^\n]+)\n([\s\S]*?)(?=###|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out[m[1].trim()] = m[2].trim();
  }
  if (!Object.keys(out).length) out['Contenuto generato'] = text.trim();
  return out;
}

/* ===== STEPS HTML ===== */
function stepsHTML(active) {
  const s1 = active > 1 ? 'done' : 'current';
  const s2 = active === 2 ? 'current' : '';
  return `<div class="steps">
    <div class="step-dot ${s1}">${active > 1 ? '✓' : '1'}</div>
    <span style="font-size:12px;color:${active===1?'var(--txt)':'var(--mu)'}">Ricerca</span>
    <div class="step-line"></div>
    <div class="step-dot ${s2}">2</div>
    <span style="font-size:12px;color:${active===2?'var(--txt)':'var(--mu)'}">Genera copy</span>
  </div>`;
}

/* ===== START SINGLE ===== */
function startSingle() {
  const name = document.getElementById('s-name').value.trim();
  if (!name) { alert('Inserisci il nome del prodotto.'); return; }
  const sections = getActiveSections('s-tags');
  if (!sections.length) { alert('Seleziona almeno una sezione.'); return; }
  if (!getKey()) return;

  if (researchMode) {
    doResearch(name, sections);
  } else {
    doGenerate(name, null, sections);
  }
}

/* ===== RESEARCH PHASE ===== */
async function doResearch(name, sections) {
  const btn = document.getElementById('btn-single');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-sm"></div><span>Ricerca in corso…</span>';

  const rp = document.getElementById('rp');
  rp.innerHTML = `<div class="loading">
    ${stepsHTML(1)}
    <div class="spinner" style="margin-top:10px"></div>
    <p>Cerco informazioni su <strong>${escHtml(name)}</strong><span class="dotdot"></span></p>
    <small>Specifiche tecniche, materiali, keyword SEO, posizionamento di mercato…</small>
  </div>`;

  const cat = document.getElementById('s-cat').value.trim();
  const extra = document.getElementById('s-feat').value.trim();

  try {
    const raw = await callGemini(buildResearchPrompt(name, cat, extra));
    const jm = raw.match(/\{[\s\S]*\}/);
    let r = null;
    if (jm) {
      try { r = JSON.parse(jm[0]); } catch (e) {}
    }
    if (!r) {
      r = { categoria_confermata: cat || 'Generale', tipologia: name, caratteristiche_principali: extra ? extra.split(',') : [], benefici_chiave: [], keywords_seo: [name], fascia_prezzo: '', note_copywriting: '' };
    }
    researchData = r;
    showResearchPreview(name, r, sections);
  } catch (e) {
    rp.innerHTML = `<div class="loading" style="color:var(--err)">
      <div>⚠ Errore ricerca</div>
      <p>${escHtml(e.message)}</p>
      <button class="btn-secondary" onclick="resetOutput()">↺ Riprova</button>
    </div>`;
  }

  btn.disabled = false;
  btn.innerHTML = '<span id="btn-single-lbl">🔍 Ricerca & Genera</span>';
}

/* ===== SHOW RESEARCH PREVIEW ===== */
function showResearchPreview(name, r, sections) {
  const rp = document.getElementById('rp');
  const items = [
    { k: 'Categoria', v: r.categoria_confermata },
    { k: 'Tipologia', v: r.tipologia },
    { k: 'Caratteristiche', v: (r.caratteristiche_principali || []).join(' · ') },
    { k: 'Materiali / Composizione', v: r.materiali_composizione },
    { k: 'Fascia prezzo', v: r.fascia_prezzo },
    { k: 'Benefici chiave', v: (r.benefici_chiave || []).join(' · ') },
    { k: 'Keywords SEO', v: (r.keywords_seo || []).join(', ') },
    { k: 'Competitor tipici', v: r.competitor_tipici },
    { k: 'Angolo copy', v: r.note_copywriting },
  ].filter(i => i.v && String(i.v).trim());

  const rows = items.map(i => `
    <div class="res-item">
      <div class="res-key">${escHtml(i.k)}</div>
      <div>${escHtml(i.v)}</div>
    </div>`).join('');

  rp.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div style="font-family:var(--font-display);font-size:15px;font-weight:700">🔍 Trovato: ${escHtml(name)}</div>
      ${stepsHTML(2)}
    </div>
    <div class="res-box">
      <div class="res-box-hd">
        <div class="res-box-title">Dati trovati — verifica prima di procedere</div>
        <span style="font-size:11px;color:var(--mu)">Puoi aggiungere dettagli a sinistra</span>
      </div>
      ${rows}
    </div>
    <div style="font-size:12px;color:var(--mu)">✏️ Se qualcosa non è corretto, aggiungi note nelle caratteristiche a sinistra.</div>
    <button class="btn-primary" onclick="confirmGenerate()">✦ Genera Scheda con questi dati</button>`;
}

function confirmGenerate() {
  const name = document.getElementById('s-name').value.trim();
  const sections = getActiveSections('s-tags');
  doGenerate(name, researchData, sections);
}

/* ===== GENERATE COPY ===== */
async function doGenerate(name, research, sections) {
  const btn = document.getElementById('btn-single');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-sm"></div><span>Scrittura copy…</span>';

  const rp = document.getElementById('rp');
  rp.innerHTML = `<div class="loading">
    ${research ? stepsHTML(2) + '<div style="height:6px"></div>' : ''}
    <div class="spinner"></div>
    <p>Scrivo la scheda per <strong>${escHtml(name)}</strong><span class="dotdot"></span></p>
  </div>`;

  const feats = document.getElementById('s-feat').value.trim();
  const cat = document.getElementById('s-cat').value.trim();
  const notes = document.getElementById('s-notes').value.trim();

  try {
    const raw = await callGemini(buildCopyPrompt(name, feats, cat, notes, currentTone, sections, research));
    const parsed = parseSections(raw);
    renderSingleResult(rp, name, parsed, research);
  } catch (e) {
    rp.innerHTML = `<div class="loading" style="color:var(--err)">
      <div>⚠ Errore generazione</div>
      <p>${escHtml(e.message)}</p>
      <button class="btn-secondary" onclick="resetOutput()" style="margin-top:8px">↺ Riprova</button>
    </div>`;
  }

  btn.disabled = false;
  btn.innerHTML = `<span id="btn-single-lbl">${researchMode ? '🔍 Ricerca & Genera' : '✦ Genera Scheda'}</span>`;
}

/* ===== RENDER SINGLE RESULT ===== */
function renderSingleResult(container, name, sections, research) {
  let strip = '';
  if (research) {
    const kw = (research.keywords_seo || []).slice(0, 3).join(', ');
    strip = `<div class="result-strip">
      ${research.categoria_confermata ? `<span>📂 <strong>${escHtml(research.categoria_confermata)}</strong></span>` : ''}
      ${research.fascia_prezzo ? `<span>💶 <strong>${escHtml(research.fascia_prezzo)}</strong></span>` : ''}
      ${kw ? `<span>🔑 <strong>${escHtml(kw)}</strong></span>` : ''}
      <span class="web-badge">🔍 basato su ricerca web</span>
    </div>`;
  }

  const allText = Object.entries(sections).map(([k, v]) => `== ${k} ==\n${v}`).join('\n\n');

  const cards = Object.entries(sections).map(([key, val], i) => {
    const isBig = key.toLowerCase().includes('titolo');
    return `<div class="result-section">
      <div class="result-sec-label" style="color:${SEC_COLORS[i % SEC_COLORS.length]}">${escHtml(key)}</div>
      <div class="result-sec-value${isBig ? ' big' : ''}">${escHtml(val)}</div>
      <div class="result-sec-actions">
        <button class="btn-secondary" onclick="copyText(${JSON.stringify(val)})">⎘ Copia</button>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="result-wrap">
      <div class="result-header">
        <div class="result-name">✦ ${escHtml(name)}</div>
        <button class="btn-secondary" onclick="copyText(${JSON.stringify(allText)})">⎘ Copia tutto</button>
      </div>
      ${strip}
      <div class="result-card">${cards}</div>
    </div>`;
}

function resetOutput() {
  document.getElementById('rp').innerHTML = `
    <div class="empty" id="empty-state">
      <div class="empty-icon">✦</div>
      <h2>Pronto a generare</h2>
      <p>Inserisci il nome del prodotto e premi <strong>Genera Scheda</strong>.</p>
    </div>`;
}

/* ===== CSV UPLOAD ===== */
function handleCSV(e) {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => parseCSVText(ev.target.result);
  reader.readAsText(f, 'UTF-8');
}

function parseManual() {
  const text = document.getElementById('m-csv-paste').value.trim();
  if (!text) return;
  parseCSVText(text);
}

function parseCSVText(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) { alert('CSV non valido — serve almeno header + 1 riga dati.'); return; }

  const hdrs = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows = lines.slice(1).map(l => {
    const vals = l.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const o = {};
    hdrs.forEach((h, i) => { o[h] = vals[i] || ''; });
    return o;
  }).filter(r => r.nome || r[hdrs[0]]);

  csvRows = rows;
  csvHeaders = hdrs;
  multiResults = [];

  document.getElementById('stat-rows').textContent = rows.length;
  document.getElementById('stat-cols').textContent = hdrs.length;
  document.getElementById('csv-preview').style.display = 'block';
  document.getElementById('gen-controls').style.display = 'flex';
  document.getElementById('multi-results').innerHTML = '';
  document.getElementById('btn-export-csv').disabled = true;
  document.getElementById('btn-export-txt').disabled = true;

  const th = hdrs.map(h => `<th>${escHtml(h)}</th>`).join('');
  const trs = rows.slice(0, 8).map(r =>
    `<tr>${hdrs.map(h => `<td>${escHtml(r[h] || '')}</td>`).join('')}</tr>`
  ).join('') + (rows.length > 8 ? `<tr><td colspan="${hdrs.length}" style="color:var(--mu);text-align:center;padding:10px">+ altri ${rows.length - 8} prodotti</td></tr>` : '');

  document.getElementById('preview-table').innerHTML = `<thead><tr>${th}</tr></thead><tbody>${trs}</tbody>`;
}

/* ===== MULTI GENERATE ===== */
async function generateMulti() {
  if (!csvRows.length) { alert('Carica prima un CSV.'); return; }
  if (!getKey()) return;

  const sections = getActiveSections('m-tags');
  if (!sections.length) { alert('Seleziona almeno una sezione.'); return; }

  const tone = document.getElementById('m-tone').value;
  const notes = document.getElementById('m-notes').value.trim();
  const useResearch = document.getElementById('m-research').checked;
  const total = csvRows.length;

  const btn = document.getElementById('btn-multi');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner-sm"></div><span>Generazione…</span>';
  document.getElementById('pb-wrap').style.display = 'block';
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('btn-export-csv').disabled = true;
  document.getElementById('btn-export-txt').disabled = true;
  document.getElementById('multi-results').innerHTML = '';
  multiResults = [];

  for (let i = 0; i < total; i++) {
    const row = csvRows[i];
    const rName = row.nome || row[Object.keys(row)[0]] || `Prodotto ${i + 1}`;
    const rFeats = row.caratteristiche || row.features || row.descrizione || '';
    const rCat = row.categoria || row.category || '';
    const rNotes = (row.note || row.notes || '') + (notes ? ' ' + notes : '');

    document.getElementById('progress-label').textContent = `${i + 1} / ${total} — ${rName}`;
    document.getElementById('progress-bar').style.width = `${(i / total) * 100}%`;

    // Create placeholder card
    const card = document.createElement('div');
    card.className = 'mc';
    card.id = `mc-${i}`;
    card.innerHTML = `<div class="mc-header">
      <div class="mc-title">⏳ ${escHtml(rName)}</div>
      <div style="font-size:11px;color:var(--mu)">${useResearch ? '🔍 Ricerca + genera…' : 'Generazione…'}</div>
    </div>`;
    document.getElementById('multi-results').appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    try {
      let research = null;
      if (useResearch) {
        const rawRes = await callGemini(buildResearchPrompt(rName, rCat, rFeats));
        const jm = rawRes.match(/\{[\s\S]*\}/);
        if (jm) { try { research = JSON.parse(jm[0]); } catch (e) {} }
      }

      const rawCopy = await callGemini(buildCopyPrompt(rName, rFeats, rCat, rNotes, tone, sections, research));
      const parsed = parseSections(rawCopy);
      multiResults.push({ name: rName, parsed, raw: rawCopy, ok: true });
      renderMultiCard(card, rName, parsed, i);

    } catch (e) {
      multiResults.push({ name: rName, parsed: {}, raw: '', ok: false, err: e.message });
      card.classList.add('error');
      card.innerHTML = `<div class="mc-header">
        <div class="mc-title" style="color:var(--err)">✗ ${escHtml(rName)}</div>
        <div style="font-size:11px;color:var(--err)">${escHtml(e.message)}</div>
      </div>`;
    }

    await new Promise(r => setTimeout(r, 400));
  }

  document.getElementById('progress-bar').style.width = '100%';
  document.getElementById('progress-label').textContent = `✓ ${total} schede generate`;
  document.getElementById('btn-export-csv').disabled = false;
  document.getElementById('btn-export-txt').disabled = false;
  btn.disabled = false;
  btn.innerHTML = '<span>⊞ Rigenera Tutto</span>';
}

function renderMultiCard(card, name, sections, idx) {
  const allText = Object.entries(sections).map(([k, v]) => `== ${k} ==\n${v}`).join('\n\n');

  const body = Object.entries(sections).map(([k, v]) => `
    <div>
      <div class="mc-sec-label">${escHtml(k)}</div>
      <div class="mc-sec-value">${escHtml(v)}</div>
    </div>`).join('');

  card.classList.add('open');
  card.innerHTML = `
    <div class="mc-header" onclick="toggleCard(${idx})">
      <div class="mc-title">✦ ${escHtml(name)}</div>
      <div class="mc-actions">
        <button class="btn-secondary" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();copyText(${JSON.stringify(allText)})">⎘ Copia</button>
        <span class="mc-arrow" id="mc-arrow-${idx}">▴</span>
      </div>
    </div>
    <div class="mc-body" id="mc-body-${idx}">${body}</div>`;
}

function toggleCard(idx) {
  const card = document.getElementById(`mc-${idx}`);
  const body = document.getElementById(`mc-body-${idx}`);
  const arrow = document.getElementById(`mc-arrow-${idx}`);
  const isOpen = card.classList.contains('open');
  card.classList.toggle('open', !isOpen);
  if (isOpen) { body.style.display = 'none'; arrow.textContent = '▾'; }
  else { body.style.display = 'flex'; arrow.textContent = '▴'; }
}

/* ===== EXPORT CSV ===== */
function exportCSV() {
  const okResults = multiResults.filter(r => r.ok);
  if (!okResults.length) return;

  const allKeys = [...new Set(okResults.flatMap(r => Object.keys(r.parsed)))];
  const header = ['nome', ...allKeys].join(',');
  const rows = okResults.map(r => {
    const cols = [
      `"${r.name.replace(/"/g, '""')}"`,
      ...allKeys.map(k => `"${(r.parsed[k] || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`)
    ];
    return cols.join(',');
  });

  downloadFile('schede-prodotto.csv', [header, ...rows].join('\n'), 'text/csv;charset=utf-8;');
}

/* ===== EXPORT TXT ===== */
function exportTXT() {
  const okResults = multiResults.filter(r => r.ok);
  if (!okResults.length) return;

  const text = okResults.map(r =>
    `${'='.repeat(60)}\n${r.name}\n${'='.repeat(60)}\n${r.raw}\n`
  ).join('\n');

  downloadFile('schede-prodotto.txt', text, 'text/plain;charset=utf-8;');
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob(['\ufeff' + content], { type: mimeType });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ===== UTILS ===== */
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    const t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  });
}

function escHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
