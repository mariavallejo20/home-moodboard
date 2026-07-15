/**
 * render.js — pinta la interfaz a partir del estado.
 */

import {
  state, roomById, ideasInRoom, visibleIdeas, discardedCount, esc,
} from './data.js';

/* Gradiente de placeholder por estancia (cuando no hay imagen). */
const GRADS = {
  cocina:       'linear-gradient(145deg,#e9efe6,#d5e1d0)',
  salon:        'linear-gradient(145deg,#efe7dd,#e1d2c1)',
  'bano-comun': 'linear-gradient(145deg,#e5eeee,#d1e0e1)',
  'dorm-2':     'linear-gradient(145deg,#ece7ef,#dbd1e2)',
  despacho:     'linear-gradient(145deg,#eae7e1,#d7d1c6)',
  'dorm-1':     'linear-gradient(145deg,#efe9e3,#ddd3c7)',
  vestidor:     'linear-gradient(145deg,#efe6ea,#e0cdd6)',
  'bano-suite': 'linear-gradient(145deg,#e2eded,#cddedc)',
  terraza:      'linear-gradient(145deg,#e7efe3,#cee0c6)',
  general:      'linear-gradient(145deg,#ece9e3,#dcd5c8)',
};
const gradOf = id => GRADS[id] || 'linear-gradient(145deg,#ece9e3,#ddd6c9)';

const SOURCE_SHORT = {
  instagram: 'IG', tiktok: 'TT', pinterest: 'PIN', web: 'WEB', propia: 'FOTO',
};
export const sourceLabel = {
  instagram: 'Instagram', tiktok: 'TikTok', pinterest: 'Pinterest', web: 'Web', propia: 'Foto propia',
};

const $ = sel => document.querySelector(sel);

/* ── Orquestador ─────────────────────────────────────────── */
export function renderAll() {
  renderSidebar();
  renderHead();
  renderGallery();
  window.lucide?.createIcons();
}

/* ── Barra lateral: directorio de estancias ──────────────── */
function renderSidebar() {
  $('#brand-title').textContent = state.meta.title || 'Nuestro piso';
  $('#brand-sub').textContent   = state.meta.subtitle || 'Ideas de decoración';

  const total = ideasInRoom('all').length;
  let html = `
    <button class="room-link ${state.current === 'all' ? 'active' : ''}" data-action="open-room" data-room="all">
      <span class="room-name"><i data-lucide="layout-grid" class="room-ico"></i>Todas las ideas</span>
      <span class="room-count">${total}</span>
    </button>
    <div class="room-nav-divider"></div>`;

  html += state.rooms.map(r => {
    const n = ideasInRoom(r.id).length;
    return `
      <button class="room-link ${state.current === r.id ? 'active' : ''}" data-action="open-room" data-room="${esc(r.id)}">
        <span class="room-name"><i data-lucide="${esc(r.icon || 'home')}" class="room-ico"></i>${esc(r.name)}</span>
        <span class="room-count">${n}</span>
      </button>`;
  }).join('');

  html += `
    <div class="room-nav-divider"></div>
    <button class="room-link ${state.current === 'discarded' ? 'active' : ''}" data-action="open-room" data-room="discarded">
      <span class="room-name"><i data-lucide="archive" class="room-ico"></i>Ideas descartadas</span>
      <span class="room-count">${discardedCount()}</span>
    </button>`;

  $('#room-nav').innerHTML = html;
}

/* ── Cabecera del tablero ────────────────────────────────── */
function renderHead() {
  const room = roomById(state.current);
  const isDiscarded = state.current === 'discarded';
  const name = isDiscarded ? 'Ideas descartadas'
    : state.current === 'all' ? 'Todas las ideas'
    : (room?.name || '');
  const code = isDiscarded ? 'Archivo'
    : state.current === 'all' ? 'Todo el piso'
    : 'Estancia';
  const count = visibleIdeas().length;

  $('#board-code').textContent  = code;
  $('#board-title').textContent = name;
  $('#board-count').textContent = `${count} ${count === 1 ? 'idea' : 'ideas'}`;
  $('#topbar-title').textContent = name;
}

/* ── Galería (muestrario) ────────────────────────────────── */
function renderGallery() {
  const items = visibleIdeas();
  const gallery = $('#gallery');
  const empty = !items.length;
  gallery.classList.toggle('is-empty', empty);
  gallery.innerHTML = empty ? emptyState() : items.map(cardHTML).join('');
}

function cardHTML(i) {
  const room = roomById(i.room) || {};
  const img = i._img || (i.media && i.media[0]);
  const specText = [
    state.current === 'all' ? (room.name || '') : '',
    i.source ? (SOURCE_SHORT[i.source] || '') : '',
  ].filter(Boolean).join(' · ');
  return `
    <article class="card" data-action="open-detail" data-id="${esc(i.id)}" tabindex="0" role="button"
             aria-label="${esc(i.title || 'Idea')}">
      <div class="card-media" style="--grad:${gradOf(i.room)}">
        ${img
          ? `<img src="${esc(img)}" alt="${esc(i.title || '')}" loading="lazy" onerror="this.remove()">`
          : `<div class="ph"><i data-lucide="${esc(room.icon || 'home')}" class="ph-ico"></i></div>`}
        ${specText ? `<span class="spec">${esc(specText)}</span>` : ''}
        <button class="card-act" data-action="${i.discarded ? 'restore' : 'discard'}" data-id="${esc(i.id)}"
                aria-label="${i.discarded ? 'Restaurar idea' : 'Descartar idea'}" title="${i.discarded ? 'Restaurar' : 'Descartar'}">
          <i data-lucide="${i.discarded ? 'archive-restore' : 'archive'}"></i>
        </button>
        ${i._draft ? `<span class="draft-badge">Borrador</span>` : ''}
      </div>
      <div class="card-body">
        <h3 class="card-title">${esc(i.title || 'Sin título')}</h3>
        ${i.notes ? `<p class="card-notes">${esc(i.notes)}</p>` : ''}
        ${i.priceEst ? `<div class="card-foot"><span class="price">${esc(i.priceEst)}</span></div>` : ''}
      </div>
    </article>`;
}

function emptyState() {
  if (state.filters.q) {
    return `<div class="empty">
      <i data-lucide="search-x" class="empty-ico"></i>
      <h3>Nada coincide con la búsqueda</h3>
      <p>Prueba con otras palabras.</p>
      <button class="btn" data-action="clear-filters">Limpiar búsqueda</button>
    </div>`;
  }
  if (state.current === 'discarded') {
    return `<div class="empty">
      <i data-lucide="archive" class="empty-ico"></i>
      <h3>No hay ideas descartadas</h3>
      <p>Cuando descartes una idea aparecerá aquí, por si quieres recuperarla más adelante.</p>
    </div>`;
  }
  return `<div class="empty">
    <i data-lucide="image-plus" class="empty-ico"></i>
    <h3>Aún no hay ideas aquí</h3>
    <p>Añade la primera: una captura de ese reel o foto que te ha gustado, con una nota rápida.</p>
    <button class="btn btn-primary only-desktop" data-action="open-add"><i data-lucide="plus"></i> Añadir idea</button>
  </div>`;
}
