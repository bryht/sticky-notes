import { NOTE_COLORS, DARK_NOTE_COLORS, DEFAULT_NOTE, Z_INDEX_BASE, getSiteDefaults, setSiteDefaults } from './config.js';
import { makeDraggable } from './drag.js';
import { saveNotes, debouncedSave } from './storage.js';
import { setSaveStatusTarget } from './save-status.js';
import { showToast } from './error.js';
import { showAllNotesDashboard } from './dashboard.js';
import { minimizeNote, restoreNote, addResizeHandle, showColorPicker } from './features.js';
import { sanitizeHTML } from './sanitizer.js';
import { getDarkMode } from './darkmode.js';

let activeContainer = null;
let highestZIndex = Z_INDEX_BASE;

export function setActiveContainer(container) {
  activeContainer = container;
}

export function createNotesContainer() {
  const existing = document.getElementById('sticky-notes-container');
  if (existing) return existing;
  
  const container = document.createElement('div');
  container.id = 'sticky-notes-container';
  document.body.appendChild(container);
  return container;
}

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'note-' + crypto.randomUUID();
  }
  return 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function bringToFront(note) {
  highestZIndex = Math.min(highestZIndex + 1, 2147483646);
  note.style.zIndex = highestZIndex;
}

let batchSaveTimer = null;
function batchSave() {
  clearTimeout(batchSaveTimer);
  batchSaveTimer = setTimeout(() => saveNotes(), 50);
}

export function createNote(content = '', position = null, id = null, options = {}) {
  if (!activeContainer) return null;
  
  const noteId = id || generateId();
  
  if (!position) {
    const existingNotes = document.querySelectorAll('.sticky-note');
    const offsetAmount = 20 + (existingNotes.length * 10);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxLeft = Math.max(10, vw - 270);
    const maxTop = Math.max(10, vh - 220);
    const left = Math.min(80 + offsetAmount, maxLeft);
    const top = Math.min(80 + offsetAmount, maxTop);
    position = {
      top: `${top}px`,
      left: `${left}px`
    };
  } else {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const topVal = parseInt(position.top, 10) || 0;
    const leftVal = parseInt(position.left, 10) || 0;
    position.top = `${Math.min(topVal, Math.max(10, vh - 220))}px`;
    position.left = `${Math.min(leftVal, Math.max(10, vw - 270))}px`;
  }
  
  const colorKey = options.color || DEFAULT_NOTE.color;
  const palette = getDarkMode() ? DARK_NOTE_COLORS : NOTE_COLORS;
  const colors = palette[colorKey] || palette.yellow;
  
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.id = noteId;
  note.setAttribute('role', 'article');
  note.setAttribute('aria-label', 'Sticky note');
  const isMinimized = options.minimized === true;
  note.dataset.color = colorKey;
  note.dataset.minimized = String(isMinimized);
  note.style.cssText = `
    top: ${position.top};
    left: ${position.left};
    width: ${options.width || DEFAULT_NOTE.width};
    ${isMinimized ? 'height: 32px;' : `min-height: ${options.minHeight || DEFAULT_NOTE.minHeight};`}
    background-color: ${colors.bg};
    z-index: ${++highestZIndex};
    ${isMinimized ? 'overflow: hidden; resize: none;' : ''}
  `;

  note.addEventListener('mousedown', () => bringToFront(note));
  
  const header = document.createElement('div');
  header.className = 'note-header';
  header.style.backgroundColor = colors.header;
  
  const title = document.createElement('span');
  title.className = 'note-title';
  title.textContent = options.title || '';
  header.appendChild(title);
  
  const buttons = document.createElement('div');
  buttons.className = 'note-buttons';
  buttons.setAttribute('role', 'toolbar');
  buttons.setAttribute('aria-label', 'Note actions');

  const colorBtn = document.createElement('button');
  colorBtn.type = 'button';
  colorBtn.innerHTML = '🎨';
  colorBtn.title = 'Change color';
  colorBtn.className = 'note-btn';
  colorBtn.setAttribute('aria-label', 'Change color');
  colorBtn.setAttribute('tabindex', '0');
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showColorPicker(note);
  });
  
  const minBtn = document.createElement('button');
  minBtn.type = 'button';
  minBtn.innerHTML = isMinimized ? '□' : '─';
  minBtn.title = isMinimized ? 'Restore' : 'Minimize';
  minBtn.className = 'note-btn minimize-btn';
  minBtn.setAttribute('aria-label', isMinimized ? 'Restore' : 'Minimize');
  minBtn.setAttribute('tabindex', '0');
  minBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (note.dataset.minimized === 'true') {
      restoreNote(note, minBtn);
    } else {
      minimizeNote(note, minBtn);
    }
  });
  
  const dashBtn = document.createElement('button');
  dashBtn.type = 'button';
  dashBtn.innerHTML = '☰';
  dashBtn.title = 'All notes';
  dashBtn.className = 'note-btn';
  dashBtn.setAttribute('aria-label', 'View all notes');
  dashBtn.setAttribute('tabindex', '0');
  dashBtn.addEventListener('click', () => showAllNotesDashboard());
  
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.innerHTML = '✕';
  delBtn.title = 'Delete';
  delBtn.className = 'note-btn delete-btn';
  delBtn.setAttribute('aria-label', 'Delete note');
  delBtn.setAttribute('tabindex', '0');
  delBtn.addEventListener('click', () => deleteNoteElement(note));
  
  buttons.append(colorBtn, minBtn, dashBtn, delBtn);
  header.appendChild(buttons);
  
  const contentArea = document.createElement('div');
  contentArea.className = 'note-content';
  contentArea.contentEditable = true;
  contentArea.setAttribute('role', 'textbox');
  contentArea.setAttribute('aria-label', 'Note content');
  contentArea.setAttribute('aria-multiline', 'true');
  contentArea.innerHTML = sanitizeHTML(content);
  if (isMinimized) contentArea.style.display = 'none';
  contentArea.addEventListener('focus', () => setSaveStatusTarget(saveStatus));
  contentArea.addEventListener('input', () => {
    setSaveStatusTarget(saveStatus);
    debouncedSave();
  });

  note.addEventListener('resized', () => {
    saveSiteDefault(note);
  });
  
  const footer = document.createElement('div');
  footer.className = 'note-footer';

  const saveStatus = document.createElement('span');
  saveStatus.className = 'note-save-status';
  saveStatus.setAttribute('role', 'status');
  saveStatus.setAttribute('aria-live', 'polite');
  footer.appendChild(saveStatus);

  const charCount = document.createElement('span');
  charCount.className = 'note-char-count';
  charCount.setAttribute('aria-hidden', 'true');
  const updateCharCount = () => {
    const text = contentArea.textContent || '';
    const len = text.length;
    charCount.textContent = len > 0 ? `${len}` : '';
    charCount.title = `${len} character${len === 1 ? '' : 's'}`;
  };
  updateCharCount();

  footer.appendChild(charCount);
  contentArea.addEventListener('input', updateCharCount);

  note.appendChild(header);
  note.appendChild(contentArea);
  note.appendChild(footer);
  
  activeContainer.appendChild(note);
  
  makeDraggable(note, header);
  addResizeHandle(note, footer);
  
  batchSave();
  return note;
}

async function saveSiteDefault(note, colorKey) {
  try {
    const hostname = window.location.hostname;
    await getSiteDefaults(hostname);
    const updates = {};
    if (colorKey) updates.color = colorKey;
    if (note.style.width) updates.width = note.style.width;
    if (note.style.height) updates.minHeight = note.style.height;
    if (Object.keys(updates).length > 0) {
      await setSiteDefaults(hostname, updates);
    }
  } catch(e) { /* Per-site defaults are best-effort */ }
}

const pendingDeletes = new Map();

export function deleteNoteElement(note) {
  const noteId = note.id;

  if (pendingDeletes.has(noteId)) return;

  const parent = note.parentElement;
  const nextSibling = note.nextElementSibling;

  note.dispatchEvent(new CustomEvent('note-destroying', { bubbles: true }));

  note.style.display = 'none';
  note.dataset.pendingDelete = 'true';

  showToast('Note deleted', 'Undo', () => {
    if (pendingDeletes.has(noteId)) {
      note.style.display = '';
      delete note.dataset.pendingDelete;
      if (nextSibling && nextSibling.parentElement === parent) {
        parent.insertBefore(note, nextSibling);
      } else {
        parent.appendChild(note);
      }
      clearTimeout(pendingDeletes.get(noteId).timer);
      pendingDeletes.delete(noteId);
    }
  });

  const timer = setTimeout(() => {
    if (pendingDeletes.has(noteId)) {
      note.remove();
      pendingDeletes.delete(noteId);
      saveNotes();
    }
  }, 5000);

  pendingDeletes.set(noteId, { timer, data: { note, parent, nextSibling } });
}

export function cleanupPendingDelete(noteId) {
  if (pendingDeletes.has(noteId)) {
    clearTimeout(pendingDeletes.get(noteId).timer);
    pendingDeletes.delete(noteId);
  }
}

export function updateNoteColor(note, colorKey) {
  if (!NOTE_COLORS[colorKey]) return;

  const palette = getDarkMode() ? DARK_NOTE_COLORS : NOTE_COLORS;
  const colors = palette[colorKey] || NOTE_COLORS[colorKey];

  note.dataset.color = colorKey;
  note.style.backgroundColor = colors.bg;
  const header = note.querySelector('.note-header');
  if (header) header.style.backgroundColor = colors.header;

  saveSiteDefault(note, colorKey);
  saveNotes();
}
