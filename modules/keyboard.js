// Keyboard shortcuts for Sticky Notes
// Ctrl+Shift+N → create note, Ctrl+Shift+D → toggle dashboard,
// Ctrl+Shift+P → pin/unpin focused note, Escape → close dashboard/color picker,
// Ctrl+S → force save, Ctrl+Shift+E → export, Ctrl+Shift+I → import

let initialized = false;

export function initKeyboardShortcuts() {
  if (initialized) return;
  initialized = true;

  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+N → Create new note
    if (e.ctrlKey && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      import('./ui.js').then(({ createNote }) => createNote());
      return;
    }

    // Ctrl+Shift+D → Toggle dashboard
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      const dash = document.getElementById('notes-dashboard');
      if (dash) {
        dash.remove();
      } else {
        import('./dashboard.js').then(({ showAllNotesDashboard }) => showAllNotesDashboard());
      }
      return;
    }

    // Ctrl+Shift+P → Pin/unpin the currently focused note
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      const focused = document.querySelector('.sticky-note:focus, .sticky-note:focus-within');
      if (focused) {
        const isPinned = focused.dataset.pinned === 'true';
        focused.dataset.pinned = isPinned ? 'false' : 'true';
        const pinBtn = focused.querySelector('.pin-btn');
        if (pinBtn) {
          pinBtn.innerHTML = isPinned ? '📌' : '📍';
          pinBtn.title = isPinned ? 'Pin' : 'Unpin';
        }
        // Update z-index
        if (!isPinned) {
          focused.style.zIndex = 999999;
        } else {
          focused.style.zIndex = '';
        }
        import('./storage.js').then(({ saveNotes }) => saveNotes());
      }
      return;
    }

    // Escape → Close dashboard or color picker
    if (e.key === 'Escape') {
      // Close modal first
      const modal = document.getElementById('sticky-notes-modal-overlay');
      if (modal) {
        modal.remove();
        return;
      }
      // Close dashboard
      const dash = document.getElementById('notes-dashboard');
      if (dash) {
        dash.remove();
        return;
      }
      // Close color picker
      const picker = document.querySelector('.color-picker-popup');
      if (picker) {
        picker.remove();
        return;
      }
      // Close rich text toolbar (if visible)
      const toolbar = document.querySelector('.richtext-toolbar');
      if (toolbar) {
        toolbar.remove();
        return;
      }
      return;
    }

    // Ctrl+S → Force save all notes
    if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      import('./storage.js').then(({ saveNotes }) => saveNotes());
      return;
    }

    // Ctrl+Shift+E → Export notes
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      import('./features.js').then(({ exportNotes }) => exportNotes());
      return;
    }

    // Ctrl+Shift+I → Import notes
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      import('./features.js').then(({ importNotes }) => importNotes());
      return;
    }

    // Ctrl+Shift+? → Show keyboard shortcuts reference
    if (e.ctrlKey && e.shiftKey && (e.key === '?' || e.key === '/')) {
      e.preventDefault();
      import('./shortcuts.js').then(({ showShortcutsPanel }) => showShortcutsPanel());
      return;
    }
  });
}
