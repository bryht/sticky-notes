// Keyboard shortcuts for Sticky Notes
// Ctrl+Shift+N → create note, Ctrl+Shift+D → toggle dashboard,
// Ctrl+Shift+P → pin/unpin focused note, Escape → close dashboard/color picker,
// Ctrl+S → force save, Ctrl+Shift+E → export, Ctrl+Shift+I → import

import { createNote } from './ui.js';
import { showAllNotesDashboard } from './dashboard.js';
import { togglePin, exportNotes, importNotes } from './features.js';
import { saveNotes } from './storage.js';
import { showShortcutsPanel } from './shortcuts.js';

let initialized = false;

export function initKeyboardShortcuts() {
  if (initialized) return;
  initialized = true;

  document.addEventListener('keydown', handleShortcut);
}

function handleShortcut(e) {
  // Ctrl+Shift+N → Create new note
  if (e.ctrlKey && e.shiftKey && e.key === 'N') {
    e.preventDefault();
    createNote();
    return;
  }

  // Ctrl+Shift+D → Toggle dashboard
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    const dash = document.getElementById('notes-dashboard');
    if (dash) dash.remove();
    else showAllNotesDashboard();
    return;
  }

  // Ctrl+Shift+P → Pin/unpin the currently focused note
  if (e.ctrlKey && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    const focused = document.querySelector('.sticky-note:focus, .sticky-note:focus-within');
    if (focused) togglePin(focused);
    return;
  }

  // Escape → Close the topmost dismissable overlay
  if (e.key === 'Escape') {
    const dismissable = [
      'sticky-notes-modal-overlay',  // confirm modal (by id)
      'notes-dashboard',             // dashboard (by id)
    ];
    for (const id of dismissable) {
      const el = document.getElementById(id);
      if (el) { el.remove(); return; }
    }
    const popups = ['.color-picker-popup', '.richtext-toolbar'];
    for (const sel of popups) {
      const el = document.querySelector(sel);
      if (el) { el.remove(); return; }
    }
    return;
  }

  // Ctrl+S → Force save all notes
  if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveNotes();
    return;
  }

  // Ctrl+Shift+E → Export notes
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    exportNotes();
    return;
  }

  // Ctrl+Shift+I → Import notes
  if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    e.preventDefault();
    importNotes();
    return;
  }

  // Ctrl+Shift+? → Show keyboard shortcuts reference
  if (e.ctrlKey && e.shiftKey && (e.key === '?' || e.key === '/')) {
    e.preventDefault();
    showShortcutsPanel();
  }
}
