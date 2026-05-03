import { NOTE_COLORS, DARK_NOTE_COLORS, PINNED_Z_INDEX } from './config.js';
import { updateNoteColor, createNote } from './ui.js';
import { getAllNotes, saveNotes, debouncedSave } from './storage.js';
import { showAllNotesDashboard } from './dashboard.js';
import { showToast, showConfirmModal } from './error.js';
import { validateImportData } from './validation.js';

// ===================
// Pin / Unpin
// ===================

export function togglePin(note) {
  const isPinned = note.dataset.pinned === 'true';
  note.dataset.pinned = isPinned ? 'false' : 'true';
  const pinBtn = note.querySelector('.pin-btn');

  if (note.dataset.pinned === 'true') {
    note.classList.add('note-pinned');
    note.style.zIndex = PINNED_Z_INDEX;
    if (pinBtn) {
      pinBtn.innerHTML = '📌';
      pinBtn.title = 'Unpin';
      pinBtn.classList.add('pinned');
    }
  } else {
    note.classList.remove('note-pinned');
    note.style.zIndex = '';
    if (pinBtn) {
      pinBtn.innerHTML = '📍';
      pinBtn.title = 'Pin on top';
      pinBtn.classList.remove('pinned');
    }
  }
  debouncedSave();
}

// ===================
// Minimize / Restore
// ===================

export function minimizeNote(note, btn) {
  note.dataset.minimized = 'true';
  note.dataset.lastHeight = note.style.height || note.offsetHeight + 'px';
  note.style.height = '32px';
  note.style.overflow = 'hidden';
  note.style.resize = 'none';
  note.querySelector('.note-content').style.display = 'none';
  btn.innerHTML = '□'; // maximize icon
  btn.title = 'Restore';
}

export function restoreNote(note, btn) {
  note.dataset.minimized = 'false';
  note.style.height = note.dataset.lastHeight || '150px';
  note.style.overflow = 'auto';
  note.querySelector('.note-content').style.display = '';
  btn.innerHTML = '─';
  btn.title = 'Minimize';
}

// ===================
// Resize Handle
// ===================

export function addResizeHandle(note, footer) {
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
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
      // Dispatch resized event for per-site defaults
      note.dispatchEvent(new CustomEvent('resized'));
    }
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ===================
// Color Picker
// ===================

export function showColorPicker(note) {
  // Remove existing picker
  const existing = note.querySelector('.color-picker-popup');
  if (existing) { existing.remove(); return; }
  
  const picker = document.createElement('div');
  picker.className = 'color-picker-popup';

  // Check dark mode via container class (avoids circular import)
  const isDark = document.getElementById('sticky-notes-container')?.classList.contains('dark-mode') || false;
  const colorMap = isDark ? DARK_NOTE_COLORS : NOTE_COLORS;
  
  // Self-cleaning: remove picker and document listener together
  let onOutsideClick = null;
  const cleanup = () => {
    picker.remove();
    if (onOutsideClick) document.removeEventListener('click', onOutsideClick);
  };

  Object.entries(colorMap).forEach(([key, colors]) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = colors.bg;
    swatch.title = key;
    swatch.addEventListener('click', () => {
      updateNoteColor(note, key);
      cleanup();
    });
    // Hover preview: temporarily show this color on the note
    const origBg = getComputedStyle(note).backgroundColor;
    const origHeaderBg = note.querySelector('.note-header') ? getComputedStyle(note.querySelector('.note-header')).backgroundColor : '';
    swatch.addEventListener('mouseenter', () => {
      note.style.backgroundColor = colors.bg;
      const header = note.querySelector('.note-header');
      if (header) header.style.backgroundColor = colors.header;
    });
    swatch.addEventListener('mouseleave', () => {
      note.style.backgroundColor = origBg;
      const header = note.querySelector('.note-header');
      if (header) header.style.backgroundColor = origHeaderBg;
    });
    picker.appendChild(swatch);
  });
  
  // Close when clicking outside
  onOutsideClick = (e) => {
    if (!picker.contains(e.target) && !note.querySelector('.note-header').contains(e.target)) {
      cleanup();
    }
  };
  
  document.addEventListener('click', onOutsideClick);
  note.appendChild(picker);
}

// ===================
// Export / Import
// ===================

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
    
    // Notify background to update badge
    chrome.runtime.sendMessage({ action: 'updateBadge', count: notes.length });
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
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.notes || !Array.isArray(data.notes)) {
        showToast('Invalid backup file format', 'error');
        return;
      }
      
      // Validate import schema
      const validation = validateImportData(data);
      if (!validation.valid) {
        showToast('Invalid import: ' + validation.error, 'error');
        return;
      }
      
      // Use styled modal instead of window.confirm()
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
      
      // Clear current notes from DOM
      document.querySelectorAll('.sticky-note').forEach(el => el.remove());
      
      // Send to background with merge mode
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
      
      // Reload current page notes
      data.notes
        .filter(n => {
          try { return new URL(n.url).hostname === window.location.hostname; } catch(e) { return false; }
        })
        .forEach(n => {
          createNote(n.content, n.position, n.id, {
            color: n.color,
            width: n.size?.width,
            minHeight: n.size?.height,
            pinned: n.pinned,
            markdown: n.markdown
          });
        });
      
      // Refresh dashboard if open
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