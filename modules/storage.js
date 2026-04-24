import { SAVE_DEBOUNCE_MS } from './config.js';

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
    const noteData = {
      id: note.id,
      content: note.querySelector('.note-content').innerHTML,
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
              minimized: noteData.minimized
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
