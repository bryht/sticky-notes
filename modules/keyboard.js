// Keyboard shortcuts for Sticky Notes
// Ctrl+Shift+N → create note, Ctrl+Shift+D → toggle dashboard,
// Escape → close dashboard/color picker, Ctrl+S → force save,
// Ctrl+Shift+E → export, Ctrl+Shift+I → import

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

    // Escape → Close dashboard or color picker
    if (e.key === 'Escape') {
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
    if (e.ctrlKey && !e.shiftKey && e.key === 's') {
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
  });
}