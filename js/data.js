/**
 * data.js — carga de datos, estado y utilidades.
 *
 * Fuente de la verdad: data/ideas.json (comprometido en el repo).
 * Las ideas añadidas desde el formulario se guardan como "borradores"
 * en localStorage y se fusionan al vuelo, hasta que se exporta el JSON
 * y se compromete al repo.
 */

const DRAFT_KEY = 'hmb.drafts.v1';
const DISCARD_KEY = 'hmb.discarded.v1';

/** Estado global de la aplicación. */
export const state = {
  meta:    {},
  rooms:   [],
  ideas:   [],   // fusión de comprometidas + borradores
  current: 'all',
  filters: { q: '' },
};

/** Carga ideas.json y fusiona los borradores locales. */
export async function loadData() {
  const res = await fetch('data/ideas.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`No se pudo cargar ideas.json (${res.status})`);
  const data = await res.json();

  state.meta  = data.meta  || {};
  state.rooms = data.rooms || [];

  const committed = (data.ideas || []).map(i => ({ ...i, _draft: false }));
  const drafts    = loadDrafts();
  state._committed = committed;
  state.ideas = [...committed, ...drafts];

  // Aplicar el estado de "descartada" guardado localmente (aún sin exportar).
  const discarded = loadDiscarded();
  state.ideas.forEach(i => {
    i.discarded = discarded[i.id] !== undefined ? discarded[i.id] : !!i.discarded;
  });
}

/* ── Borradores (localStorage) ───────────────────────────── */

export function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || []; }
  catch { return []; }
}

function saveDrafts(drafts) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

export function addDraft(idea) {
  const drafts = loadDrafts();
  drafts.push(idea);
  saveDrafts(drafts);
  state.ideas.push(idea);
}

export function removeDraft(id) {
  saveDrafts(loadDrafts().filter(x => x.id !== id));
  state.ideas = state.ideas.filter(x => x.id !== id);
}

/* ── Descartadas (localStorage) ──────────────────────────── */

function loadDiscarded() {
  try { return JSON.parse(localStorage.getItem(DISCARD_KEY)) || {}; }
  catch { return {}; }
}

/** Marca/desmarca una idea como descartada y lo persiste. */
export function setDiscarded(id, value) {
  const map = loadDiscarded();
  map[id] = value;
  localStorage.setItem(DISCARD_KEY, JSON.stringify(map));
  const idea = ideaById(id);
  if (idea) idea.discarded = value;
}

/* ── Consultas ───────────────────────────────────────────── */

export function roomById(id) {
  return state.rooms.find(r => r.id === id);
}

export function ideaById(id) {
  return state.ideas.find(i => i.id === id);
}

/** Ideas de una estancia (sin aplicar filtros de la barra). */
export function ideasInRoom(roomId) {
  const base = state.ideas.filter(i => !i.discarded);
  return roomId === 'all' ? base : base.filter(i => i.room === roomId);
}

/** Nº de ideas descartadas (de todo el piso). */
export function discardedCount() {
  return state.ideas.filter(i => i.discarded).length;
}

/** Ideas visibles: estancia actual + búsqueda. */
export function visibleIdeas() {
  const { current, filters } = state;
  return state.ideas.filter(i => {
    if (current === 'discarded') {
      if (!i.discarded) return false;
    } else {
      if (i.discarded) return false;
      if (current !== 'all' && i.room !== current) return false;
    }
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = [(i.title || ''), (i.notes || ''), (i.shop || '')].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ── Exportación e identificadores ───────────────────────── */

/** Objeto limpio listo para escribir en data/ideas.json. */
export function buildExport() {
  const ideas = state.ideas.map(({ _draft, _img, discarded, ...rest }) => (
    discarded ? { ...rest, discarded: true } : rest
  ));
  return { meta: state.meta, rooms: state.rooms, ideas };
}

export function newId() {
  return (crypto?.randomUUID?.() || `idea-${Date.now().toString(36)}`);
}

/** Convierte un texto en un slug apto para nombre de archivo. */
export function slugify(s) {
  return (s || '').toString()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Escape para insertar texto de usuario en HTML/atributos. */
export function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
