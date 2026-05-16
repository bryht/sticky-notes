/**
 * Custom context menu for Sticky Notes
 * Right-click on a note shows options: Minimize, Change Color, Delete
 */

import { NOTE_COLORS, DARK_NOTE_COLORS } from './config.js';
import { updateNoteColor, deleteNoteElement } from './ui.js';
import { minimizeNote, restoreNote } from './features.js';
import { getDarkMode } from './darkmode.js';

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

  const isMinimized = note.dataset.minimized === 'true';

  contextMenu = document.createElement('div');
  contextMenu.className = 'sticky-notes-context-menu';
  if (getDarkMode()) contextMenu.classList.add('dark');

  const items = [
    { label: isMinimized ? '□ Restore' : '─ Minimize', action: () => toggleMinimize(note) },
    { label: '🎨 Change Color ▸', action: null, submenu: true },
    { label: '✕ Delete', action: () => deleteNoteElement(note), danger: true },
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
  // Don't reopen the submenu if it's already showing
  if (parentItem.querySelector('.ctx-submenu')) return;

  const colorMap = getDarkMode() ? DARK_NOTE_COLORS : NOTE_COLORS;

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
      updateNoteColor(note, key);
    });
    submenu.appendChild(swatch);
  });

  parentItem.appendChild(submenu);
}

function toggleMinimize(note) {
  const minBtn = note.querySelector('.minimize-btn');
  if (note.dataset.minimized === 'true') {
    restoreNote(note, minBtn);
  } else {
    minimizeNote(note, minBtn);
  }
}

function removeContextMenu() {
  if (contextMenu) {
    contextMenu.remove();
    contextMenu = null;
  }
}
