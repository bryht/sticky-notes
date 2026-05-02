/**
 * Custom context menu for Sticky Notes
 * Right-click on a note shows options: Pin, Minimize, Change Color, Delete
 */

let contextMenu = null;

export function initContextMenu() {
  document.addEventListener('contextmenu', (e) => {
    const note = e.target.closest('.sticky-note');
    if (!note) {
      removeContextMenu();
      return;
    }

    e.preventDefault();
    showContextMenu(note, e.clientX, e.clientY);
  });

  // Close context menu on click outside
  document.addEventListener('click', (e) => {
    if (contextMenu && !contextMenu.contains(e.target)) {
      removeContextMenu();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') removeContextMenu();
  });
}

function showContextMenu(note, x, y) {
  removeContextMenu();

  const isPinned = note.dataset.pinned === 'true';
  const isMinimized = note.dataset.minimized === 'true';
  const isMarkdown = note.dataset.markdown === 'true';
  const isDark = document.getElementById('sticky-notes-container')?.classList.contains('dark-mode') || false;

  contextMenu = document.createElement('div');
  contextMenu.className = 'sticky-notes-context-menu';
  if (isDark) contextMenu.classList.add('dark');

  const items = [
    { label: isPinned ? '📌 Unpin Note' : '📍 Pin Note', action: () => togglePin(note) },
    { label: isMinimized ? '□ Restore' : '─ Minimize', action: () => toggleMinimize(note) },
    { label: isMarkdown ? '📝 Disable Markdown' : '📝 Enable Markdown', action: () => toggleMarkdown(note) },
    { label: '🎨 Change Color ▸', action: null, submenu: true },
    { label: '✕ Delete', action: () => deleteNote(note), danger: true },
  ];

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'ctx-item' + (item.danger ? ' ctx-danger' : '');
    if (item.submenu) {
      row.classList.add('ctx-has-submenu');
      row.innerHTML = `<span>${item.label}</span><span class="ctx-arrow">▸</span>`;
      // Show color submenu on hover
      row.addEventListener('mouseenter', () => showColorSubmenu(note, row));
    } else {
      row.textContent = item.label;
      row.addEventListener('click', () => {
        removeContextMenu();
        item.action();
      });
    }
    contextMenu.appendChild(row);
  });

  // Position the menu
  document.body.appendChild(contextMenu);
  const rect = contextMenu.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuWidth = rect.width;
  const menuHeight = rect.height;

  contextMenu.style.left = `${Math.min(x, vw - menuWidth - 10)}px`;
  contextMenu.style.top = `${Math.min(y, vh - menuHeight - 10)}px`;
}

function showColorSubmenu(note, parentItem) {
  // Remove existing submenu
  const existing = parentItem.querySelector('.ctx-submenu');
  if (existing) return;

  import('./config.js').then(({ NOTE_COLORS, DARK_NOTE_COLORS }) => {
    const isDark = document.getElementById('sticky-notes-container')?.classList.contains('dark-mode') || false;
    const colorMap = isDark ? DARK_NOTE_COLORS : NOTE_COLORS;

    const submenu = document.createElement('div');
    submenu.className = 'ctx-submenu';

    Object.entries(colorMap).forEach(([key, colors]) => {
      const swatch = document.createElement('div');
      swatch.className = 'ctx-color-swatch';
      swatch.style.backgroundColor = colors.bg;
      swatch.title = key;
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        removeContextMenu();
        import('./ui.js').then(({ updateNoteColor }) => updateNoteColor(note, key));
      });
      submenu.appendChild(swatch);
    });

    parentItem.appendChild(submenu);
  });
}

function togglePin(note) {
  const isPinned = note.dataset.pinned === 'true';
  note.dataset.pinned = isPinned ? 'false' : 'true';
  const pinBtn = note.querySelector('.pin-btn');
  if (pinBtn) {
    pinBtn.innerHTML = isPinned ? '📍' : '📌';
    pinBtn.title = isPinned ? 'Pin' : 'Unpin';
  }
  note.style.zIndex = isPinned ? '' : '999999';
  import('./storage.js').then(({ saveNotes }) => saveNotes());
}

function toggleMinimize(note) {
  const isMinimized = note.dataset.minimized === 'true';
  const minBtn = note.querySelector('.minimize-btn');
  if (isMinimized) {
    import('./features.js').then(({ restoreNote }) => restoreNote(note, minBtn));
  } else {
    import('./features.js').then(({ minimizeNote }) => minimizeNote(note, minBtn));
  }
}

function toggleMarkdown(note) {
  import('./markdown.js').then(({ toggleMarkdown }) => toggleMarkdown(note));
}

function deleteNote(note) {
  import('./ui.js').then(({ deleteNoteElement }) => deleteNoteElement(note));
}

function removeContextMenu() {
  if (contextMenu) {
    contextMenu.remove();
    contextMenu = null;
  }
}
