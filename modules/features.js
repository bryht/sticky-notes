import { NOTE_COLORS } from './config.js';
import { updateNoteColor, createNote } from './ui.js';
import { getAllNotes, saveNotes } from './storage.js';
import { showAllNotesDashboard } from './dashboard.js';

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
  
  Object.entries(NOTE_COLORS).forEach(([key, colors]) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = colors.bg;
    swatch.title = key;
    swatch.addEventListener('click', () => {
      updateNoteColor(note, key);
      picker.remove();
    });
    picker.appendChild(swatch);
  });
  
  // Close when clicking outside
  const closePicker = (e) => {
    if (!picker.contains(e.target) && !note.querySelector('.note-header').contains(e.target)) {
      picker.remove();
      document.removeEventListener('click', closePicker);
    }
  };
  document.addEventListener('click', closePicker);
  
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
    alert('Export failed. See console for details.');
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
        alert('Invalid backup file format');
        return;
      }
      
      if (!confirm(`Import ${data.notes.length} notes? This will replace existing notes.`)) return;
      
      // Clear current notes from DOM
      document.querySelectorAll('.sticky-note').forEach(el => el.remove());
      
      // Send to background to replace storage
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'importNotes',
          data: data
        }, (response) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(response);
        });
      });
      
      // Reload current page notes
      data.notes
        .filter(n => new URL(n.url).hostname === window.location.hostname)
        .forEach(n => {
          createNote(n.content, n.position, n.id, {
            color: n.color,
            width: n.size?.width,
            minHeight: n.size?.height
          });
        });
      
      // Refresh dashboard if open
      const dash = document.getElementById('notes-dashboard');
      if (dash) {
        dash.remove();
        showAllNotesDashboard();
      }
      
      alert(`Successfully imported ${data.notes.length} notes!`);
    } catch (err) {
      console.error('Import failed:', err);
      alert('Import failed: ' + err.message);
    }
  });
  
  input.click();
}
