import { NOTE_COLORS, DARK_NOTE_COLORS, DEFAULT_NOTE, Z_INDEX_BASE, PINNED_Z_INDEX, getSiteDefaults, setSiteDefaults } from './config.js';
import { makeDraggable } from './drag.js';
import { saveNotes, debouncedSave } from './storage.js';
import { showAllNotesDashboard } from './dashboard.js';
import { minimizeNote, restoreNote, addResizeHandle, showColorPicker, exportNotes, importNotes } from './features.js';
import { isMarkdownEnabled, setMarkdownState } from './markdown.js';

let activeContainer = null;
let noteCounter = 0;
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
  return 'note-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function bringToFront(note) {
  // If note is pinned, keep it at pinned z-index
  if (note.dataset.pinned === 'true') return;
  highestZIndex++;
  note.style.zIndex = highestZIndex;
}

export function createNote(content = '', position = null, id = null, options = {}) {
  if (!activeContainer) return null;
  
  const noteId = id || generateId();
  
  if (!position) {
    const existingNotes = document.querySelectorAll('.sticky-note');
    const offsetAmount = 20 + (existingNotes.length * 10);
    position = {
      top: `${80 + offsetAmount}px`,
      left: `${80 + offsetAmount}px`
    };
  }
  
  const colorKey = options.color || DEFAULT_NOTE.color;
  const isDark = document.getElementById('sticky-notes-container')?.classList.contains('dark-mode') || false;
  const colors = isDark ? DARK_NOTE_COLORS[colorKey] || DARK_NOTE_COLORS.yellow : NOTE_COLORS[colorKey] || NOTE_COLORS.yellow;
  
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.id = noteId;
  note.dataset.color = colorKey;
  note.dataset.minimized = 'false';
  note.dataset.pinned = options.pinned ? 'true' : 'false';
  if (options.markdown) {
    note.dataset.markdown = 'true';
    setMarkdownState(noteId, true);
  }
  note.style.cssText = `
    top: ${position.top};
    left: ${position.left};
    width: ${options.width || DEFAULT_NOTE.width};
    min-height: ${options.minHeight || DEFAULT_NOTE.minHeight};
    background-color: ${colors.bg};
    z-index: ${options.pinned ? PINNED_Z_INDEX : ++highestZIndex};
  `;

  if (options.pinned) {
    note.classList.add('note-pinned');
  }
  
  // Click to bring to front
  note.addEventListener('mousedown', () => bringToFront(note));
  
  // Header
  const header = document.createElement('div');
  header.className = 'note-header';
  header.style.backgroundColor = colors.header;
  
  // Title / drag handle
  const title = document.createElement('span');
  title.className = 'note-title';
  title.textContent = options.title || 'Note';
  header.appendChild(title);
  
  // Buttons container
  const buttons = document.createElement('div');
  buttons.className = 'note-buttons';
  
  // Pin btn
  const pinBtn = document.createElement('span');
  pinBtn.innerHTML = options.pinned ? '📌' : '📍';
  pinBtn.title = options.pinned ? 'Unpin' : 'Pin on top';
  pinBtn.className = 'note-btn pin-btn' + (options.pinned ? ' pinned' : '');
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePin(note, pinBtn);
  });

  // Color picker btn
  const colorBtn = document.createElement('span');
  colorBtn.innerHTML = '🎨';
  colorBtn.title = 'Change color';
  colorBtn.className = 'note-btn';
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showColorPicker(note);
  });
  
  // Markdown btn
  const mdBtn = document.createElement('span');
  mdBtn.innerHTML = '📝';
  mdBtn.title = options.markdown ? 'Disable Markdown' : 'Enable Markdown';
  mdBtn.className = 'note-btn markdown-btn';
  mdBtn.style.opacity = options.markdown ? '1' : '0.5';
  mdBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    import('./markdown.js').then(({ toggleMarkdown }) => toggleMarkdown(note));
  });

  // Minimize btn
  const minBtn = document.createElement('span');
  minBtn.innerHTML = '─';
  minBtn.title = 'Minimize';
  minBtn.className = 'note-btn minimize-btn';
  minBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (note.dataset.minimized === 'true') {
      restoreNote(note, minBtn);
    } else {
      minimizeNote(note, minBtn);
    }
  });
  
  // Dashboard btn
  const dashBtn = document.createElement('span');
  dashBtn.innerHTML = '☰';
  dashBtn.title = 'All notes';
  dashBtn.className = 'note-btn';
  dashBtn.addEventListener('click', () => showAllNotesDashboard());
  
  // Delete btn
  const delBtn = document.createElement('span');
  delBtn.innerHTML = '✕';
  delBtn.title = 'Delete';
  delBtn.className = 'note-btn delete-btn';
  delBtn.addEventListener('click', () => deleteNoteElement(note));
  
  buttons.append(pinBtn, colorBtn, mdBtn, minBtn, dashBtn, delBtn);
  header.appendChild(buttons);
  
  // Content
  const contentArea = document.createElement('div');
  contentArea.className = 'note-content';
  contentArea.contentEditable = true;
  // Sanitize content to prevent XSS from imported/tampered storage
  import('./sanitizer.js').then(({ sanitizeHTML }) => {
    contentArea.innerHTML = sanitizeHTML(content);
  });
  contentArea.addEventListener('input', debouncedSave);

  // On resize, save per-site defaults  
  note.addEventListener('resized', () => {
    saveSiteDefault(note);
  });
  
  // Footer with resize handle
  const footer = document.createElement('div');
  footer.className = 'note-footer';
  note.appendChild(header);
  note.appendChild(contentArea);
  note.appendChild(footer);
  
  activeContainer.appendChild(note);
  
  // Make draggable by header
  makeDraggable(note, header);
  
  // Add resize handle
  addResizeHandle(note, footer);
  
  saveNotes();
  return note;
}

function togglePin(note, pinBtn) {
  const isPinned = note.dataset.pinned === 'true';
  note.dataset.pinned = isPinned ? 'false' : 'true';

  if (note.dataset.pinned === 'true') {
    note.classList.add('note-pinned');
    note.style.zIndex = PINNED_Z_INDEX;
    pinBtn.innerHTML = '📌';
    pinBtn.title = 'Unpin';
  } else {
    note.classList.remove('note-pinned');
    highestZIndex++;
    note.style.zIndex = highestZIndex;
    pinBtn.innerHTML = '📍';
    pinBtn.title = 'Pin on top';
  }
  debouncedSave();
}

async function saveSiteDefault(note, colorKey) {
  try {
    const hostname = window.location.hostname;
    const current = await getSiteDefaults(hostname);
    const updates = {};
    if (colorKey) updates.color = colorKey;
    if (note.style.width) updates.width = note.style.width;
    if (note.style.height) updates.minHeight = note.style.height;
    if (Object.keys(updates).length > 0) {
      await setSiteDefaults(hostname, updates);
    }
  } catch(e) { /* Per-site defaults are best-effort */ }
}

export function deleteNoteElement(note) {
  // Properly clean up: remove the element, its listeners are GC'd with it
  // (cloneNode was a no-op for listener cleanup — cloned nodes don't carry listeners)
  // Dispatch a custom event so other modules can clean up
  note.dispatchEvent(new CustomEvent('note-destroying', { bubbles: true }));
  note.remove();
  saveNotes();
}

export function updateNoteColor(note, colorKey) {
  const isDark = document.getElementById('sticky-notes-container')?.classList.contains('dark-mode') || false;
  const lightColors = NOTE_COLORS[colorKey];
  const darkColors = DARK_NOTE_COLORS[colorKey];
  if (!lightColors) return;

  note.dataset.color = colorKey;

  if (isDark && darkColors) {
    note.style.backgroundColor = darkColors.bg;
    note.querySelector('.note-header').style.backgroundColor = darkColors.header;
  } else {
    note.style.backgroundColor = lightColors.bg;
    note.querySelector('.note-header').style.backgroundColor = lightColors.header;
  }

  saveSiteDefault(note, colorKey);
  saveNotes();
}