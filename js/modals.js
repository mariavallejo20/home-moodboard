/**
 * modals.js — detalle de idea (lightbox), formulario de añadir
 *             (con exportación de JSON e imagen) y brief para IA.
 */

import {
  state, ideaById, roomById, addDraft, removeDraft,
  newId, slugify, buildExport, esc, ideasInRoom,
} from './data.js';
import { renderAll, sourceLabel } from './render.js';

const $ = sel => document.querySelector(sel);

const GRADS_FALLBACK = 'linear-gradient(145deg,#ece9e3,#ddd6c9)';
function gradOf() {
  const el = document.querySelector('.card[data-id] .card-media');
  return el?.style.getPropertyValue('--grad') || GRADS_FALLBACK;
}

/* Estado interno del formulario (imagen pendiente de guardar). */
let pending = { file: null, dataUrl: null, filename: null };
let briefText = '';

/* ── Utilidad de descarga ────────────────────────────────── */
function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Overlays: abrir/cerrar ──────────────────────────────── */
export function closeOverlay(el) { el.classList.remove('open'); }
export function closeAllOverlays() {
  document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
}

/* ── Detalle de idea ─────────────────────────────────────── */
export function openDetail(id) {
  const i = ideaById(id);
  if (!i) return;
  const room = roomById(i.room) || {};
  const img = i._img || (i.media && i.media[0]);

  const rows = [];
  if (i.source)   rows.push(['Fuente', esc(sourceLabel[i.source] || i.source)]);
  if (i.priceEst) rows.push(['Precio', esc(i.priceEst)]);
  if (i.shop)     rows.push(['Tienda', esc(i.shop)]);
  if (i.added)    rows.push(['Añadida', esc(i.added)]);

  $('#detail-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-media" style="--grad:${gradOf()}">
        ${img
          ? `<img src="${esc(img)}" alt="${esc(i.title || '')}" onerror="this.remove()">`
          : `<i data-lucide="${esc(room.icon || 'home')}" class="detail-ico"></i>`}
      </div>
      <div class="detail-info">
        <div class="detail-code">${esc(room.name || '')}</div>
        <h2 class="detail-title">${esc(i.title || 'Sin título')}</h2>
        ${i.notes ? `<p class="detail-notes">${esc(i.notes)}</p>` : ''}
        <div class="detail-rows">
          ${rows.map(([k, v]) => `<div class="detail-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}
        </div>
        <div class="detail-actions">
          ${i.url ? `<a class="btn btn-primary" href="${esc(i.url)}" target="_blank" rel="noopener"><i data-lucide="arrow-up-right"></i> Ver original</a>` : ''}
          ${i.video ? `<a class="btn" href="${esc(i.video)}" target="_blank" rel="noopener"><i data-lucide="play"></i> Ver vídeo</a>` : ''}
          ${i.productUrl ? `<a class="btn" href="${esc(i.productUrl)}" target="_blank" rel="noopener"><i data-lucide="shopping-bag"></i> Ver producto</a>` : ''}
          <button class="btn" data-action="${i.discarded ? 'restore' : 'discard'}" data-id="${esc(i.id)}"><i data-lucide="${i.discarded ? 'archive-restore' : 'archive'}"></i> ${i.discarded ? 'Restaurar' : 'Descartar'}</button>
          ${i._draft ? `<button class="btn" data-action="remove-draft" data-id="${esc(i.id)}"><i data-lucide="trash-2"></i> Eliminar borrador</button>` : ''}
        </div>
        ${i._draft ? `<div class="detail-draft-note">Este es un <b>borrador</b> guardado solo en este dispositivo. Para que aparezca en todos y puedas compartirlo, expórtalo y súbelo al repo (botón <b>Exportar</b>).</div>` : ''}
      </div>
    </div>`;
  $('#detail-overlay').classList.add('open');
  window.lucide?.createIcons();
}

/* ── Formulario de añadir ────────────────────────────────── */
export function openAdd() {
  $('#f-room').innerHTML = state.rooms.map(r =>
    `<option value="${esc(r.id)}" ${r.id === state.current ? 'selected' : ''}>${esc(r.name)}</option>`
  ).join('');
  resetAddForm();
  $('#add-overlay').classList.add('open');
  $('#f-title').focus();
}

function resetAddForm() {
  $('#add-form').classList.remove('hide');
  $('#add-success').classList.remove('show');
  $('#add-form').reset?.();
  ['f-title', 'f-notes', 'f-url', 'f-video', 'f-price', 'f-shop', 'f-producturl'].forEach(id => { const el = $('#' + id); if (el) el.value = ''; });
  $('#f-preview').style.display = 'none';
  $('#f-preview').innerHTML = '';
  $('#f-drop-label').textContent = 'Toca para elegir una captura o foto';
  pending = { file: null, dataUrl: null, filename: null };
}

export function handleImagePick(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  pending.file = file;
  const reader = new FileReader();
  reader.onload = e => {
    pending.dataUrl = e.target.result;
    $('#f-preview').innerHTML = `<img src="${pending.dataUrl}" alt="Vista previa">`;
    $('#f-preview').style.display = 'block';
    $('#f-drop-label').textContent = file.name;
  };
  reader.readAsDataURL(file);
}

export function submitAdd() {
  const title = $('#f-title').value.trim();
  if (!title) { $('#f-title').focus(); return; }

  const room = $('#f-room').value;
  const id = newId();

  let media = [];
  if (pending.file) {
    const ext = (pending.file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const short = id.replace(/[^a-z0-9]/gi, '').slice(0, 4);
    pending.filename = `${slugify(title) || 'idea'}-${short}.${ext}`;
    media = [`media/${room}/${pending.filename}`];
  }

  const idea = {
    id, room, title,
    notes:    $('#f-notes').value.trim(),
    kind:     pending.file ? 'image' : 'ref',
    source:     $('#f-source').value,
    url:        $('#f-url').value.trim(),
    video:      $('#f-video').value.trim(),
    media,
    priceEst:   $('#f-price').value.trim(),
    shop:       $('#f-shop').value.trim(),
    productUrl: $('#f-producturl').value.trim(),
    added:      new Date().toISOString().slice(0, 10),
    _draft:     true,
  };
  if (pending.dataUrl) idea._img = pending.dataUrl;

  addDraft(idea);
  renderAll();
  showSuccess(idea);
}

function showSuccess(idea) {
  const hasImg = !!pending.file;
  const steps = [];
  if (hasImg) steps.push(`Descarga la imagen y guárdala en <code>media/${esc(idea.room)}/${esc(pending.filename)}</code>`);
  steps.push('Descarga <code>ideas.json</code> y reemplaza <code>data/ideas.json</code>');
  steps.push('Sube los cambios: <code>git add . && git commit -m "Nueva idea" && git push</code>');

  $('#save-steps').innerHTML = `
    <b>Guardado como borrador.</b> Ya lo ves en la galería. Para que quede en el repo y puedas compartirlo:
    <ol>${steps.map(s => `<li>${s}</li>`).join('')}</ol>`;

  $('#dl-image').style.display = hasImg ? 'inline-flex' : 'none';
  $('#add-form').classList.add('hide');
  $('#add-success').classList.add('show');
}

export function downloadPendingImage() {
  if (pending.file && pending.filename) download(pending.filename, pending.file);
}

export function downloadJson() {
  const text = JSON.stringify(buildExport(), null, 2);
  download('ideas.json', new Blob([text], { type: 'application/json' }));
}

/* ── Brief para IA / decoradora ──────────────────────────── */
export function openBrief(scope) {
  if (!scope) scope = (state.current === 'all' || state.current === 'discarded') ? 'all' : 'room';
  briefText = buildBrief(scope);
  $('#brief-body').innerHTML = `
    <pre class="brief-pre">${esc(briefText)}</pre>
    <div class="form-actions">
      <button class="btn" data-action="print-brief"><i data-lucide="printer"></i> Imprimir / PDF</button>
      <button class="btn btn-primary" data-action="copy-brief"><i data-lucide="copy"></i> Copiar texto</button>
    </div>`;
  $('#brief-overlay').classList.add('open');
  window.lucide?.createIcons();
}

function buildBrief(scope) {
  const meta = state.meta;
  const rooms = scope === 'all' ? state.rooms : [roomById(state.current)].filter(Boolean);
  const lines = [];
  lines.push(`PROYECTO: ${meta.title || 'Piso nuevo'} — ${meta.subtitle || ''}`.trim());
  if (meta.unit) lines.push(`Vivienda: ${meta.unit}`);
  if (meta.delivery) lines.push(meta.delivery);
  lines.push('');
  lines.push('Recopilatorio de ideas de decoración por estancia. Cada idea incluye una nota y la imagen de referencia (ver ruta).');
  lines.push('');

  rooms.forEach(room => {
    const ideas = ideasInRoom(room.id);
    if (!ideas.length) return;
    lines.push('────────────────────────────────────────');
    lines.push(`ESTANCIA: ${room.name} — ${ideas.length} ${ideas.length === 1 ? 'idea' : 'ideas'}`);
    lines.push('');
    ideas.forEach((i, n) => {
      lines.push(`${n + 1}. ${i.title || 'Idea'}`);
      if (i.notes) lines.push(`   Notas: ${i.notes}`);
      const meta2 = [i.priceEst, i.shop].filter(Boolean).join(' · ');
      if (meta2) lines.push(`   ${meta2}`);
      if (i.media && i.media[0]) lines.push(`   Imagen: ${i.media[0]}`);
      else if (i._img)          lines.push(`   Imagen: (borrador local, aún sin guardar en el repo)`);
      if (i.url)        lines.push(`   Original: ${i.url}`);
      if (i.video)      lines.push(`   Vídeo: ${i.video}`);
      if (i.productUrl) lines.push(`   Producto: ${i.productUrl}`);
      lines.push('');
    });
  });

  lines.push('────────────────────────────────────────');
  lines.push('PETICIÓN: A partir de estas referencias, propón una decoración coherente');
  lines.push('para ' + (scope === 'all' ? 'todo el piso' : (rooms[0]?.name || 'la estancia')) + ',');
  lines.push('sugiriendo paleta, materiales, mobiliario y distribución, e indicando');
  lines.push('qué referencias combinan mejor entre sí.');
  return lines.join('\n');
}

export function copyBrief() {
  navigator.clipboard?.writeText(briefText).then(() => {
    const btn = document.querySelector('[data-action="copy-brief"]');
    if (btn) { const t = btn.textContent; btn.textContent = '¡Copiado!'; setTimeout(() => (btn.textContent = t), 1400); }
  });
}

export function printBrief() { window.print(); }
