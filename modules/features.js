import { NOTE_COLORS, DARK_NOTE_COLORS } from './config.js';
import { updateNoteColor, createNote } from './ui.js';
import { getAllNotes, saveNotes, debouncedSave } from './storage.js';
import { showAllNotesDashboard } from './dashboard.js';
import { showToast } from './error.js';

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

/**
 * Validate imported data schema: check structure, note count, field sizes.
 * Returns { valid: boolean, error?: string }
 */
function validateImportData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data is not an object' };
  }
  if (!Array.isArray(data.notes)) {
    return { valid: false, error: 'notes field is missing or not an array' };
  }
  if (data.notes.length > 10000) {
    return { valid: false, error: 'Too many notes (max 10,000)' };
  }
  for (let i = 0; i < data.notes.length; i++) {
    const note = data.notes[i];
    if (!note.id || typeof note.id !== 'string') {
      return { valid: false, error: `Note ${i}: missing or invalid id` };
    }
    if (note.content && typeof note.content === 'string' && note.content.length > 50000) {
      return { valid: false, error: `Note ${i}: content exceeds 50KB limit` };
    }
    if (note.url && typeof note.url === 'string') {
      try { new URL(note.url); } catch(e) {
        return { valid: false, error: `Note ${i}: invalid URL` };
      }
    }
  }
  return { valid: true };
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
      
      // Offer merge vs replace (use a clearer UI with two buttons)
      // Since confirm() only has OK/Cancel, we use the less-destructive option (merge) as Cancel
      // so the user can't accidentally wipe data with Enter key
      const confirmed = confirm(
        `Import ${data.notes.length} notes?\n\nClick OK to REPLACE all existing notes.\nClick Cancel to MERGE with existing notes.`
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