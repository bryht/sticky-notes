import { NOTE_COLORS, DARK_NOTE_COLORS } from './config.js';
import { updateNoteColor, createNote } from './ui.js';
import { getAllNotes, saveNotes } from './storage.js';
import { showAllNotesDashboard } from './dashboard.js';
import { showToast, showConfirmModal } from './error.js';
import { validateImportData } from './validation.js';
import { getDarkMode } from './darkmode.js';

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;

export function minimizeNote(note, btn) {
  note.dataset.minimized = 'true';
  note.dataset.lastHeight = note.style.height || note.offsetHeight + 'px';
  note.style.height = '32px';
  note.style.overflow = 'hidden';
  note.style.resize = 'none';
  note.querySelector('.note-content').style.display = 'none';
  btn.innerHTML = '□';
  btn.title = 'Restore';
  btn.setAttribute('aria-label', 'Restore');
}

export function restoreNote(note, btn) {
  note.dataset.minimized = 'false';
  note.style.height = note.dataset.lastHeight || '150px';
  note.style.overflow = 'auto';
  note.querySelector('.note-content').style.display = '';
  btn.innerHTML = '─';
  btn.title = 'Minimize';
  btn.setAttribute('aria-label', 'Minimize');
}

export function addResizeHandle(note, footer) {
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-label', 'Resize note');
  handle.setAttribute('tabindex', '0');
  footer.appendChild(handle);

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (note.dataset.minimized === 'true') return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = note.offsetWidth;
    const startH = note.offsetHeight;

    function onMove(ev) {
      ev.preventDefault();
      const newW = Math.max(150, startW + (ev.clientX - startX));
      const newH = Math.max(100, startH + (ev.clientY - startY));
      note.style.width = newW + 'px';
      note.style.height = newH + 'px';
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveNotes();
      note.dispatchEvent(new CustomEvent('resized'));
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

export function showColorPicker(note) {
  const existing = note.querySelector('.color-picker-popup');
  if (existing) { existing.remove(); return; }

  const picker = document.createElement('div');
  picker.className = 'color-picker-popup';
  picker.setAttribute('role', 'listbox');
  picker.setAttribute('aria-label', 'Choose note color');

  const colorMap = getDarkMode() ? DARK_NOTE_COLORS : NOTE_COLORS;
  const currentColor = note.dataset.color || 'yellow';

  let onOutsideClick = null;
  let noteDestroyHandler = null;
  const cleanup = () => {
    picker.remove();
    if (onOutsideClick) document.removeEventListener('click', onOutsideClick);
    if (noteDestroyHandler) note.removeEventListener('note-destroying', noteDestroyHandler);
  };

  noteDestroyHandler = () => cleanup();
  note.addEventListener('note-destroying', noteDestroyHandler);

  Object.entries(colorMap).forEach(([key, colors]) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = colors.bg;
    swatch.title = key;
    swatch.setAttribute('role', 'option');
    swatch.setAttribute('aria-label', key);
    swatch.setAttribute('tabindex', '0');
    swatch.setAttribute('aria-selected', key === currentColor ? 'true' : 'false');
    swatch.addEventListener('click', () => {
      updateNoteColor(note, key);
      cleanup();
    });
    swatch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        updateNoteColor(note, key);
        cleanup();
      }
    });
    swatch.addEventListener('mouseenter', () => {
      swatch.style.transform = 'scale(1.15)';
      swatch.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.3)';
    });
    swatch.addEventListener('mouseleave', () => {
      swatch.style.transform = '';
      swatch.style.boxShadow = '';
    });
    picker.appendChild(swatch);
  });

  const activeSwatch = picker.querySelector(`.color-swatch[aria-selected="true"]`);
  if (activeSwatch) {
    activeSwatch.style.boxShadow = '0 0 0 2px var(--sn-primary, #1976d2)';
  }

  const customSwatch = document.createElement('div');
  customSwatch.className = 'color-custom-swatch';
  customSwatch.title = 'Custom color';
  customSwatch.textContent = '+';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#ffeb3b';
  colorInput.addEventListener('input', (e) => {
    const hex = e.target.value;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const darkerHex = '#' + [r, g, b].map(c => Math.max(0, Math.round(c * 0.85)).toString(16).padStart(2, '0')).join('');
    updateNoteColor(note, hex, darkerHex);
    cleanup();
  });
  customSwatch.appendChild(colorInput);
  picker.appendChild(customSwatch);

  onOutsideClick = (e) => {
    const header = note.querySelector('.note-header');
    if (!picker.contains(e.target) && !(header && header.contains(e.target))) {
      cleanup();
    }
  };

  document.addEventListener('click', onOutsideClick);
  note.appendChild(picker);
}

export async function exportNotes() {
  try {
    const notes = await getAllNotes();
    const data = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      notes: notes
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sticky-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    chrome.runtime.sendMessage({ action: 'updateBadge' });
  } catch (err) {
    console.error('Export failed:', err);
    showToast('Export failed. See console for details.', 'error');
  }
}

export function importNotes() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      showToast(`File too large (max ${Math.round(MAX_IMPORT_FILE_SIZE / 1024 / 1024)}MB)`, 'error');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.notes || !Array.isArray(data.notes)) {
        showToast('Invalid backup file format', 'error');
        return;
      }

      const validation = validateImportData(data);
      if (!validation.valid) {
        showToast('Invalid import: ' + validation.error, 'error');
        return;
      }

      const confirmed = await showConfirmModal(
        `Import ${data.notes.length} notes? This will REPLACE all existing notes.`,
        {
          title: 'Import Notes',
          confirmText: 'Replace All',
          cancelText: 'Merge Instead',
          confirmClass: 'modal-btn-danger'
        }
      );
      const mode = confirmed ? 'replace' : 'merge';

      document.querySelectorAll('.sticky-note').forEach(el => el.remove());

      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'importNotes',
          data: data,
          mode: mode
        }, (response) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(response);
        });
      });

      data.notes
        .filter(n => {
          try {
            const url = new URL(n.url);
            return url.hostname === window.location.hostname || n.url.startsWith('file://');
          } catch(e) { return false; }
        })
        .forEach(n => {
          createNote(n.content, n.position, n.id, {
            color: n.color,
            width: n.size?.width,
            minHeight: n.size?.height
          });
        });

      const dash = document.getElementById('notes-dashboard');
      if (dash) {
        dash.remove();
        showAllNotesDashboard();
      }

      showToast(`Successfully imported ${data.notes.length} notes!`, 'success');
    } catch (err) {
      console.error('Import failed:', err);
      showToast('Import failed: ' + err.message, 'error');
    }
  });

  input.click();
}