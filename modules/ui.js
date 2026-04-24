import { NOTE_COLORS, DEFAULT_NOTE, Z_INDEX_BASE } from './config.js';
import { makeDraggable } from './drag.js';
import { saveNotes, debouncedSave } from './storage.js';
import { showAllNotesDashboard } from './dashboard.js';
import { minimizeNote, restoreNote, addResizeHandle, showColorPicker, exportNotes, importNotes } from './features.js';

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
  const colors = NOTE_COLORS[colorKey] || NOTE_COLORS.yellow;
  
  const note = document.createElement('div');
  note.className = 'sticky-note';
  note.id = noteId;
  note.dataset.color = colorKey;
  note.dataset.minimized = 'false';
  note.style.cssText = `
    top: ${position.top};
    left: ${position.left};
    width: ${options.width || DEFAULT_NOTE.width};
    min-height: ${options.minHeight || DEFAULT_NOTE.minHeight};
    background-color: ${colors.bg};
    z-index: ${++highestZIndex};
  `;
  
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
  
  // Color picker btn
  const colorBtn = document.createElement('span');
  colorBtn.innerHTML = '🎨';
  colorBtn.title = 'Change color';
  colorBtn.className = 'note-btn';
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showColorPicker(note);
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
  
  buttons.append(colorBtn, minBtn, dashBtn, delBtn);
  header.appendChild(buttons);
  
  // Content
  const contentArea = document.createElement('div');
  contentArea.className = 'note-content';
  contentArea.contentEditable = true;
  contentArea.innerHTML = content;
  contentArea.addEventListener('input', debouncedSave);
  
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

export function deleteNoteElement(note) {
  // Clean up listeners
  const clone = note.cloneNode(true);
  note.remove();
  saveNotes();
}

export function updateNoteColor(note, colorKey) {
  const colors = NOTE_COLORS[colorKey];
  if (!colors) return;
  note.dataset.color = colorKey;
  note.style.backgroundColor = colors.bg;
  note.querySelector('.note-header').style.backgroundColor = colors.header;
  saveNotes();
}
