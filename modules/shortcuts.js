/**
 * Keyboard shortcuts reference panel
 * Shows a styled overlay with all keyboard shortcuts
 */

export function showShortcutsPanel() {
  // Remove existing panel
  const existing = document.getElementById('sticky-notes-shortcuts-panel');
  if (existing) {
    existing.remove();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'sticky-notes-shortcuts-panel';
  overlay.className = 'sticky-notes-shortcuts-overlay';

  const shortcuts = [
    { keys: 'Ctrl+Shift+N', desc: 'Create new note' },
    { keys: 'Ctrl+Shift+D', desc: 'Toggle dashboard' },
    { keys: 'Ctrl+Shift+P', desc: 'Pin/unpin focused note' },
    { keys: 'Ctrl+Shift+E', desc: 'Export notes' },
    { keys: 'Ctrl+Shift+I', desc: 'Import notes' },
    { keys: 'Ctrl+S', desc: 'Force save' },
    { keys: 'Escape', desc: 'Close panel/dashboard/picker' },
    { keys: '/', desc: 'Focus dashboard search' },
    { keys: '↑↓', desc: 'Navigate dashboard rows' },
    { keys: 'Delete', desc: 'Delete selected dashboard row' },
  ];

  const panel = document.createElement('div');
  panel.className = 'sticky-notes-shortcuts-panel';

  const title = document.createElement('h3');
  title.className = 'shortcuts-title';
  title.textContent = '⌨️ Keyboard Shortcuts';
  panel.appendChild(title);

  const table = document.createElement('div');
  table.className = 'shortcuts-list';

  shortcuts.forEach(s => {
    const row = document.createElement('div');
    row.className = 'shortcut-row';

    const kbd = document.createElement('kbd');
    kbd.className = 'shortcut-key';
    kbd.textContent = s.keys;

    const desc = document.createElement('span');
    desc.className = 'shortcut-desc';
    desc.textContent = s.desc;

    row.appendChild(kbd);
    row.appendChild(desc);
    table.appendChild(row);
  });

  panel.appendChild(table);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'shortcuts-close-btn';
  closeBtn.textContent = 'Got it';
  closeBtn.addEventListener('click', () => overlay.remove());
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}
