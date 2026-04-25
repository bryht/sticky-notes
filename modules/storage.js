import { SAVE_DEBOUNCE_MS, STORAGE_VERSION } from './config.js';

// Debounce utility
let saveTimeout = null;
export function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveNotes, SAVE_DEBOUNCE_MS);
}

// Send message with promise wrapper and error handling
function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function saveNotes() {
  const notes = document.querySelectorAll('.sticky-note');
  const currentUrl = window.location.href.split('#')[0];
  
  const currentPageNotes = [];
  notes.forEach(note => {
    const contentEl = note.querySelector('.note-content');
    const noteData = {
      id: note.id,
      content: contentEl ? contentEl.innerHTML : '',
      position: {
        top: note.style.top,
        left: note.style.left
      },
      size: {
        width: note.style.width,
        height: note.style.height
      },
      color: note.dataset.color || 'yellow',
      minimized: note.dataset.minimized === 'true',
      pinned: note.dataset.pinned === 'true',
      markdown: note.dataset.markdown === 'true',
      url: currentUrl,
      timestamp: Date.now()
    };
    currentPageNotes.push(noteData);
  });
  
  return sendMessage({
    action: 'saveNotes',
    url: currentUrl,
    notes: currentPageNotes
  }).catch(err => console.warn('Save failed:', err));
}

export function loadNotes() {
  const currentUrl = window.location.href.split('#')[0];
  
  sendMessage({
    action: 'getNotes',
    url: currentUrl
  }).then(response => {
    if (response && response.notes && response.notes.length > 0) {
      response.notes.forEach(noteData => {
        import('./ui.js').then(({ createNote }) => {
          createNote(
            noteData.content,
            noteData.position,
            noteData.id,
            {
              width: noteData.size?.width,
              minHeight: noteData.size?.height,
              color: noteData.color,
              minimized: noteData.minimized,
              pinned: noteData.pinned,
              markdown: noteData.markdown
            }
          );
        });
      });
    }
  }).catch(err => console.warn('Load failed:', err));
}

export function getAllNotes() {
  return sendMessage({ action: 'getAllNotes' })
    .then(r => r.notes || [])
    .catch(err => {
      console.warn('GetAllNotes failed:', err);
      return [];
    });
}

export function deleteNoteById(noteId, url) {
  return sendMessage({
    action: 'deleteNote',
    noteId: noteId,
    url: url
  }).catch(err => console.warn('Delete failed:', err));
}

// ===================
// Storage Migration
// ===================

export function migrateStorage() {
  chrome.storage.local.get(['storageVersion', 'allNotes', 'urlIndex'], (result) => {
    const currentVersion = result.storageVersion || 1;

    if (currentVersion < 2) {
      // Migration v1 → v2: Add timestamp and pinned fields to existing notes
      const allNotes = result.allNotes || {};
      const urlIndex = result.urlIndex || {};

      Object.keys(allNotes).forEach(noteId => {
        const note = allNotes[noteId];
        // Add missing fields with defaults
        if (!note.timestamp) note.timestamp = Date.now();
        if (note.pinned === undefined) note.pinned = false;
        if (note.markdown === undefined) note.markdown = false;
        if (!note.size) {
          note.size = { width: '200px', height: '150px' };
        }
      });

      chrome.storage.local.set({
        allNotes,
        urlIndex,
        storageVersion: STORAGE_VERSION
      }, () => {
        console.log(`Sticky Notes: Storage migrated from v${currentVersion} to v${STORAGE_VERSION}`);
      });
    }
  });
}