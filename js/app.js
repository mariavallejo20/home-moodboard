/**
 * app.js — punto de entrada. Carga los datos, enruta por estancia
 *          (hash), y gestiona toda la interacción con event delegation
 *          mediante atributos data-action.
 */

import { state, loadData, roomById, removeDraft, setDiscarded } from './data.js';
import { renderAll } from './render.js';
import {
  openDetail, openAdd, openBrief, submitAdd, handleImagePick,
  downloadPendingImage, downloadJson, closeOverlay, closeAllOverlays,
  copyBrief, printBrief,
} from './modals.js';

init();

async function init() {
  try {
    await loadData();
  } catch (err) {
    document.getElementById('gallery').innerHTML =
      `<div class="empty"><i data-lucide="triangle-alert" class="empty-ico"></i><h3>No se pudieron cargar los datos</h3>
       <p>Abre la web con un servidor local (Live Server de VSCode, o <code>python3 -m http.server</code>), no con doble clic al archivo.</p></div>`;
    window.lucide?.createIcons();
    console.error(err);
    return;
  }
  applyHash();
  renderAll();
  bindEvents();
}

/* ── Enrutado por estancia (#salon, #cocina, #all…) ──────── */
function applyHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, '')) || 'all';
  state.current = (id === 'all' || id === 'discarded' || roomById(id)) ? id : 'all';
}

function onHashChange() {
  applyHash();
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Vinculación de eventos ──────────────────────────────── */
function bindEvents() {
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('hashchange', onHashChange);

  document.getElementById('search').addEventListener('input', e => {
    state.filters.q = e.target.value;
    renderAll();
  });
  document.getElementById('add-form').addEventListener('submit', e => {
    e.preventDefault();
    submitAdd();
  });
  document.getElementById('f-image').addEventListener('change', e => handleImagePick(e.target));
}

function onKeydown(e) {
  if (e.key === 'Escape') { closeAllOverlays(); return; }
  // Abrir detalle desde una tarjeta con teclado
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.card[data-id]')) {
    e.preventDefault();
    openDetail(e.target.dataset.id);
  }
}

function onClick(e) {
  // Cierre de overlay al pulsar el fondo (el propio overlay lleva la acción)
  if (e.target.dataset?.action === 'close-overlay') { closeOverlay(e.target); return; }

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action } = el.dataset;

  switch (action) {
    case 'open-room':
      location.hash = el.dataset.room;
      document.getElementById('app').classList.remove('drawer-open');
      break;

    case 'open-detail':   openDetail(el.dataset.id); break;
    case 'open-add':      openAdd(); break;
    case 'open-brief':    openBrief(el.dataset.scope); break;

    case 'toggle-drawer': document.getElementById('app').classList.toggle('drawer-open'); break;
    case 'close-drawer':  document.getElementById('app').classList.remove('drawer-open'); break;

    case 'close-modal':   el.closest('.overlay')?.classList.remove('open'); break;

    case 'clear-filters':
      state.filters = { q: '' };
      document.getElementById('search').value = '';
      renderAll();
      break;

    case 'export-json':
    case 'dl-json':       downloadJson(); break;
    case 'dl-image':      downloadPendingImage(); break;

    case 'add-another':   openAdd(); break;
    case 'add-cancel':    document.getElementById('add-overlay').classList.remove('open'); break;

    case 'copy-brief':    copyBrief(); break;
    case 'print-brief':   printBrief(); break;

    case 'discard':
      setDiscarded(el.dataset.id, true);
      document.getElementById('detail-overlay').classList.remove('open');
      renderAll();
      break;

    case 'restore':
      setDiscarded(el.dataset.id, false);
      document.getElementById('detail-overlay').classList.remove('open');
      renderAll();
      break;

    case 'remove-draft':
      removeDraft(el.dataset.id);
      document.getElementById('detail-overlay').classList.remove('open');
      renderAll();
      break;

    default: break;
  }
}
